# Real-Time & Notifications — Architecture Spec

*Last updated: 2026-03-25*

---

## Overview

Three notification channels: chat timeline (always), iOS push (via Expo), and web push (via Push API). Proactive messages land in the timeline and optionally trigger a push notification. Real-time updates use Supabase Realtime for live data sync between server and clients.

---

## Push Notification Architecture

### iOS Push (Primary)

```
Crosby server
  → Expo Push API (https://exp.host/--/api/v2/push/send)
    → Apple APNs
      → User's iPhone
```

**Setup:**
- Expo manages APNs certificates and tokens
- User registers push token on app launch via `expo-notifications`
- Token stored in `push_subscriptions` table

### Web Push (Secondary)

```
Crosby server
  → Web Push Protocol (VAPID)
    → Browser push service
      → User's browser
```

**Setup:**
- Service worker registered on web app load
- VAPID key pair generated once, stored in env vars
- User subscribes via `PushManager.subscribe()`
- Subscription object stored in `push_subscriptions` table

---

## Push Notification Delivery

### Delivery Pipeline

```typescript
// src/lib/proactive/delivery.ts

export async function sendPushNotification(
  userId: string,
  content: PushContent,
  options: {
    tier: 'immediate' | 'batched' | 'held'
    messageId?: string  // Link to timeline message for deep linking
  }
) {
  const profile = await getUserProfile(userId)

  // Check quiet hours
  if (isQuietHours(profile) && options.tier !== 'immediate') {
    await logOutboxEntry(userId, content.type, 'held', 'Quiet hours')
    return
  }

  // Check breakthrough rules for quiet hours bypass
  if (isQuietHours(profile) && options.tier === 'immediate') {
    const breakthroughMatch = await checkBreakthroughRules(userId, content)
    if (!breakthroughMatch) {
      await logOutboxEntry(userId, content.type, 'held', 'Quiet hours, no breakthrough match')
      return
    }
  }

  // Batching: if tier is 'batched', check if there's a pending batch
  if (options.tier === 'batched') {
    await addToBatchWindow(userId, content, options.messageId)
    return
  }

  // Send immediately
  await deliverPush(userId, content, options.messageId)
}
```

### 3-Minute Batch Window

```typescript
// src/lib/proactive/batching.ts

// Batch window is implemented via a delayed job
export async function addToBatchWindow(
  userId: string,
  content: PushContent,
  messageId?: string,
) {
  // Check if there's an active batch window
  const activeBatch = await adminClient
    .from('push_batch_window')
    .select('*')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (activeBatch.data) {
    // Add to existing batch
    await adminClient
      .from('push_batch_window')
      .update({
        items: [...activeBatch.data.items, { content, messageId }],
      })
      .eq('id', activeBatch.data.id)
  } else {
    // Create new batch window (3 minutes)
    await adminClient
      .from('push_batch_window')
      .insert({
        user_id: userId,
        items: [{ content, messageId }],
        expires_at: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
      })

    // Queue a job to flush the batch in 3 minutes
    await queueJob(userId, {
      job_type: 'flush_push_batch',
      category: 'lightweight',
      trigger_source: 'system',
    })
  }
}

export async function flushPushBatch(userId: string) {
  const batch = await adminClient
    .from('push_batch_window')
    .select('*')
    .eq('user_id', userId)
    .lte('expires_at', new Date().toISOString())
    .single()

  if (!batch.data) return

  const items = batch.data.items
  if (items.length === 1) {
    // Single item — send as individual notification
    await deliverPush(userId, items[0].content, items[0].messageId)
  } else {
    // Multiple items — bundle into one rich notification
    const bundled = bundleNotifications(items)
    await deliverPush(userId, bundled, items[0].messageId)
  }

  // Clear the batch
  await adminClient.from('push_batch_window').delete().eq('id', batch.data.id)
}
```

### Expo Push Send

```typescript
// src/lib/proactive/push-send.ts

import { Expo } from 'expo-server-sdk'

const expo = new Expo()

async function deliverPush(userId: string, content: PushContent, messageId?: string) {
  const subscriptions = await adminClient
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)

  const messages = (subscriptions.data ?? []).map(sub => {
    if (sub.platform === 'ios') {
      return {
        to: sub.token,
        title: content.title,
        body: content.body,
        data: {
          messageId,
          type: content.type,
        },
        sound: 'default',
        categoryId: content.type,  // For iOS notification categories
      }
    }

    if (sub.platform === 'web') {
      return {
        subscription: JSON.parse(sub.token),
        payload: JSON.stringify({
          title: content.title,
          body: content.body,
          data: { messageId, type: content.type },
          icon: '/icon-192.png',
        }),
      }
    }
  }).filter(Boolean)

  // Send iOS pushes via Expo
  const iosPushes = messages.filter(m => 'to' in m)
  if (iosPushes.length > 0) {
    const tickets = await expo.sendPushNotificationsAsync(iosPushes)
    // Handle tickets (check for errors, store receipts)
  }

  // Send web pushes via Web Push
  const webPushes = messages.filter(m => 'subscription' in m)
  for (const wp of webPushes) {
    await webpush.sendNotification(wp.subscription, wp.payload)
  }
}
```

### Push Content Format

```typescript
interface PushContent {
  type: 'briefing' | 'nudge' | 'heads_up' | 'greeting' | 'research_complete' | 'overnight_build'
  title: string       // Brief title for the notification
  body: string        // Rich, conversational content (Crosby's voice)
  priority: 'high' | 'normal'
}

// Examples (following SOUL-DOC voice):
// Briefing:
//   title: "Morning"
//   body: "Three meetings today, two things due. The landlord replied last night on the lease."

// Watch alert:
//   title: "Roger replied"
//   body: "Roger got back on the contract. He countered at $4,200. Probably your first move today."

// Nudge:
//   title: "The proposal for Sarah"
//   body: "Been sitting for 5 days. Want to do it, delegate it, or drop it?"
```

---

## Supabase Realtime

Used for live data sync between server and clients. The main use case: when a proactive message lands in the timeline while the user has the app open, it appears immediately without a refresh.

### Channels

```typescript
// Client-side subscription (web)
const supabase = createClient()

// Listen for new messages (proactive messages, assistant responses on other devices)
const channel = supabase
  .channel('messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `user_id=eq.${userId}`,
  }, (payload) => {
    // New message arrived — append to chat timeline
    addMessageToTimeline(payload.new)
  })
  .subscribe()

// Listen for Expert activation changes
const expertChannel = supabase
  .channel('experts')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'experts',
    filter: `user_id=eq.${userId}`,
  }, (payload) => {
    // Expert confidence or active state changed
    updateExpertUI(payload.new)
  })
  .subscribe()

// Listen for integration health changes
const healthChannel = supabase
  .channel('health')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'integration_health',
    filter: `user_id=eq.${userId}`,
  }, (payload) => {
    // Health status changed — show/hide status banner
    updateHealthBanner(payload.new)
  })
  .subscribe()
```

### What Uses Realtime

| Data | Why realtime |
|---|---|
| New messages | Proactive messages appear without refresh. Multi-device sync. |
| Expert state | Expert Drift color tinting updates in real time. |
| Integration health | Status banners appear/disappear as connections change. |
| Background jobs | Job status updates (for "researching..." indicators). |

### What Does NOT Use Realtime

| Data | Why not |
|---|---|
| Dashboard widgets | Polling on refresh intervals (see DASHBOARD-OVERNIGHT-BUILDER.md). |
| Email/calendar | Fetched via cron, not realtime. |
| Memories | Not user-facing in real time. |
| Activity log | Read on demand, not streaming. |

---

## Deep Linking (Mobile)

When a push notification is tapped, the app opens to the relevant context.

```typescript
// apps/mobile/src/utils/deep-linking.ts

export const linking = {
  prefixes: ['crosby://', 'https://app.crosby.ai'],
  config: {
    screens: {
      Chat: {
        path: 'chat',
        parse: {
          messageId: (id: string) => id,
        },
      },
      Documents: 'documents',
      Settings: 'settings',
    },
  },
}

// When notification is tapped:
Notifications.addNotificationResponseReceivedListener((response) => {
  const { messageId, type } = response.notification.request.content.data

  if (messageId) {
    // Navigate to chat and scroll to message
    navigation.navigate('Chat', { scrollToMessageId: messageId })
  }
})
```

---

## Breakthrough Rules Checking

```typescript
// src/lib/proactive/breakthrough.ts

export async function checkBreakthroughRules(
  userId: string,
  content: PushContent,
): Promise<boolean> {
  const rules = await adminClient
    .from('breakthrough_rules')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)

  for (const rule of rules.data ?? []) {
    switch (rule.rule_type) {
      case 'contact':
        if (content.body.includes(rule.match_config.contactName)) return true
        break
      case 'keyword':
        if (content.body.toLowerCase().includes(rule.match_config.keyword.toLowerCase())) return true
        break
      case 'integration':
        if (content.type === rule.match_config.integration) return true
        break
    }
  }

  return false
}
```

---

## Additional DB Table (for batching)

```sql
CREATE TABLE push_batch_window (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_batch_user ON push_batch_window(user_id, expires_at);
```

*This table is also defined in DATABASE-SCHEMA.md.*
