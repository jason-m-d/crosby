# Background Jobs & Cron System — Architecture Spec

*Last updated: 2026-03-25*

---

## Overview

Background jobs use a DB-queue pattern: jobs are inserted into the `background_jobs` table, and a cron (every minute) dispatches them. Heavy jobs have concurrency limits. Lightweight jobs run freely. All crons are Vercel Cron → GET route → authenticated by shared secret.

---

## Job Dispatch Flow

```
1. Something queues a job:
   - Tool call (spawn_background_job)
   - Cron route (overnight builder, Expert research)
   - System trigger (document embedding after upload)

2. Job inserted into background_jobs table:
   - status: 'queued'
   - priority: 1 (user) / 2 (user-adjacent) / 3 (system)
   - category: 'heavy' / 'lightweight'
   - timeout_at: NOW() + timeout duration

3. Jobs dispatcher cron (every minute):
   - Counts running heavy jobs for the user
   - If < 3 running → pick next queued heavy job (by priority, then created_at)
   - Execute the job
   - If user-requested job is queued but slots full of system jobs → pause lowest-priority system job

4. Job execution:
   - Set status = 'running', started_at = NOW()
   - Execute the job function
   - On success: status = 'success', result = output, completed_at = NOW()
   - On failure: status = 'failed', error = message
   - On timeout: status = 'failed', error = 'timeout'
```

### Dispatcher Implementation

```typescript
// src/lib/background/dispatcher.ts

export async function dispatchJobs(userId: string) {
  // Count running heavy jobs
  const { count: runningHeavy } = await adminClient
    .from('background_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('category', 'heavy')
    .eq('status', 'running')

  // Check for hung jobs (past timeout)
  await killHungJobs(userId)

  // Dispatch lightweight jobs (no limit)
  const { data: lightweightJobs } = await adminClient
    .from('background_jobs')
    .select('*')
    .eq('user_id', userId)
    .eq('category', 'lightweight')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(10)

  for (const job of lightweightJobs ?? []) {
    void executeJob(job)  // Fire-and-forget
  }

  // Dispatch heavy jobs (respect limit)
  const availableSlots = MAX_CONCURRENT_HEAVY_JOBS - (runningHeavy ?? 0)

  if (availableSlots > 0) {
    const { data: heavyJobs } = await adminClient
      .from('background_jobs')
      .select('*')
      .eq('user_id', userId)
      .eq('category', 'heavy')
      .eq('status', 'queued')
      .order('priority', { ascending: true })  // 1=highest priority
      .order('created_at', { ascending: true })
      .limit(availableSlots)

    for (const job of heavyJobs ?? []) {
      void executeJob(job)
    }
  } else {
    // Check if a user-requested job is waiting behind system jobs
    await preemptSystemJobIfNeeded(userId)
  }

  // Log dispatch to activity log
  await logActivity(userId, 'background_job', 'dispatched', {
    running: runningHeavy,
    dispatched: (lightweightJobs?.length ?? 0) + Math.min(availableSlots, 0),
  })
}

async function killHungJobs(userId: string) {
  const { data: hung } = await adminClient
    .from('background_jobs')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'running')
    .lt('timeout_at', new Date().toISOString())

  for (const job of hung ?? []) {
    await adminClient
      .from('background_jobs')
      .update({ status: 'failed', error: 'timeout', completed_at: new Date().toISOString() })
      .eq('id', job.id)

    await logActivity(userId, 'background_job', 'timeout', { jobType: job.job_type, jobId: job.id })
  }
}

async function preemptSystemJobIfNeeded(userId: string) {
  // Check: is there a priority-1 job waiting?
  const { data: userJobs } = await adminClient
    .from('background_jobs')
    .select('*')
    .eq('user_id', userId)
    .eq('category', 'heavy')
    .eq('status', 'queued')
    .eq('priority', 1)
    .limit(1)

  if (!userJobs?.length) return

  // Find lowest-priority running system job to pause
  const { data: systemJobs } = await adminClient
    .from('background_jobs')
    .select('*')
    .eq('user_id', userId)
    .eq('category', 'heavy')
    .eq('status', 'running')
    .eq('priority', 3)
    .order('created_at', { ascending: true })
    .limit(1)

  if (systemJobs?.length) {
    await adminClient
      .from('background_jobs')
      .update({ status: 'paused' })
      .eq('id', systemJobs[0].id)

    // Now dispatch the user job
    void executeJob(userJobs[0])
  }
}
```

### Job Executor

```typescript
// src/lib/background/executor.ts

// NOTE: All v2.0 job executors are system-authored and run in-process.
// When custom silos ship (post-v2.0), user-generated executors will need
// sandboxed execution (V8 isolates or similar) — see SILOS.md security note.
const JOB_EXECUTORS: Record<string, (job: BackgroundJob) => Promise<string>> = {
  deep_research: executeDeepResearch,
  overnight_build: executeOvernightBuild,
  expert_research: executeExpertResearch,
  document_embedding: executeDocumentEmbedding,
  email_backfill: executeEmailBackfill,
  memory_extraction: executeDebouncedMemoryExtraction,
  context_summary_refresh: executeContextSummaryRefresh,
  message_embedding: executeMessageEmbedding,
  flush_push_batch: executeFlushPushBatch,
}

async function executeJob(job: BackgroundJob) {
  // Mark as running
  await adminClient
    .from('background_jobs')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
      timeout_at: new Date(
        Date.now() + (job.category === 'heavy' ? HEAVY_JOB_TIMEOUT_MS : LIGHTWEIGHT_JOB_TIMEOUT_MS)
      ).toISOString(),
    })
    .eq('id', job.id)

  const executor = JOB_EXECUTORS[job.job_type]
  if (!executor) {
    await markFailed(job.id, `Unknown job type: ${job.job_type}`)
    return
  }

  try {
    const result = await executor(job)
    await adminClient
      .from('background_jobs')
      .update({
        status: 'success',
        result,
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id)

    await logActivity(job.user_id, 'background_job', 'success', {
      jobType: job.job_type,
      duration: Date.now() - new Date(job.started_at!).getTime(),
    })
  } catch (error) {
    await markFailed(job.id, error.message)
    await logActivity(job.user_id, 'background_job', 'failed', {
      jobType: job.job_type,
      error: error.message,
    })
  }
}
```

---

## Cron Routes

### Email Scan

```typescript
// src/app/api/cron/email-scan/route.ts

export async function GET(request: Request) {
  verifyCronSecret(request)

  const users = await getActiveUsers()

  for (const user of users) {
    try {
      // Email scan
      const gmailTokens = await getGmailTokens(user.id)
      if (gmailTokens) {
        await scanEmails(user.id, gmailTokens)
        await checkWatchesAgainstEmails(user.id)
      }

      // iMessage scan (if configured)
      const textConfig = await getTextConfig(user.id)
      if (textConfig?.enabled) {
        await scanTexts(user.id)
      }

      // Update integration health
      await updateHealth(user.id, 'gmail', 'healthy')
    } catch (error) {
      await updateHealth(user.id, 'gmail', 'degraded')
      await logActivity(user.id, 'cron', 'failed', {
        cron: 'email-scan',
        error: error.message,
      })
    }
  }

  return new Response('OK')
}
```

### Briefing

```typescript
// src/app/api/cron/briefing/route.ts

export async function GET(request: Request) {
  verifyCronSecret(request)

  const users = await getActiveUsers()

  for (const user of users) {
    const profile = await getUserProfile(user.id)
    const currentHour = getCurrentHourInTimezone(profile.timezone)

    // Determine if this is a scheduled briefing time
    const shouldBrief = shouldGenerateBriefing(profile.briefing_cadence, currentHour)
    if (!shouldBrief) continue

    // Check dedup — did we already brief today at this slot?
    const alreadySent = await wasTopicSurfacedRecently(user.id, 'briefing', 4 * 60 * 60 * 1000)
    if (alreadySent) continue

    try {
      // Check quiet hours
      if (isQuietHours(profile)) {
        await logOutboxEntry(user.id, 'briefing', 'held', 'Quiet hours active')
        continue
      }

      // Generate briefing content
      const briefing = await generateBriefing(user.id, currentHour)

      // Insert as proactive message
      await insertProactiveMessage(user.id, 'briefing', briefing.content)

      // Log to outbox
      await logOutboxEntry(user.id, 'briefing', 'sent', briefing.summary)

      // Send push notification if user not in app
      await sendPushIfInactive(user.id, briefing.pushContent)

      await logActivity(user.id, 'proactive_decision', 'sent', {
        type: 'briefing', slot: currentHour,
      })
    } catch (error) {
      await logActivity(user.id, 'cron', 'failed', {
        cron: 'briefing', error: error.message,
      })
    }
  }

  return new Response('OK')
}
```

### Overnight (Dashboard Builder + Expert Research)

```typescript
// src/app/api/cron/overnight/route.ts

export async function GET(request: Request) {
  verifyCronSecret(request)

  const users = await getActiveUsers()

  for (const user of users) {
    const profile = await getUserProfile(user.id)

    // Dashboard overnight builds (if enabled)
    if (profile.overnight_builder_enabled) {
      const buildCandidates = await identifyOvernightBuildCandidates(user.id)
      const builds = buildCandidates.slice(0, 2) // Max 2 per night

      for (const build of builds) {
        await queueJob(user.id, {
          job_type: 'overnight_build',
          category: 'heavy',
          priority: 3,
          prompt: JSON.stringify(build),
        })
      }
    }

    // Expert overnight research (if enabled)
    if (profile.overnight_research_enabled) {
      const expertsToResearch = await getRecentlyActiveExperts(user.id, 7) // Active in last 7 days

      for (const expert of expertsToResearch) {
        const gaps = await identifyKnowledgeGaps(user.id, expert.id)
        if (gaps.length > 0) {
          await queueJob(user.id, {
            job_type: 'expert_research',
            category: 'heavy',
            priority: 3,
            prompt: JSON.stringify({ expertId: expert.id, gaps }),
          })
        }
      }
    }

    await logActivity(user.id, 'cron', 'success', { cron: 'overnight' })
  }

  return new Response('OK')
}
```

---

## Job Cleanup

Old completed jobs are archived to prevent unbounded table growth:

```typescript
// Runs as part of the overnight cron or as a separate weekly job

export async function cleanupOldJobs() {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  await adminClient
    .from('background_jobs')
    .delete()
    .in('status', ['success', 'failed', 'cancelled'])
    .lt('completed_at', ninetyDaysAgo)

  // Also clean activity log (90 day retention)
  await adminClient
    .from('activity_log')
    .delete()
    .lt('created_at', ninetyDaysAgo)
}
```

---

## Push Batch Flush Executor

Flushes the 3-minute push notification batch window. Queued by the notification system when the batch timer expires.

```typescript
// src/lib/background/executors/flush-push-batch.ts

async function executeFlushPushBatch(job: BackgroundJob): Promise<string> {
  const { data: batch } = await adminClient
    .from('push_batch_window')
    .select('*')
    .eq('user_id', job.user_id)
    .lt('expires_at', new Date().toISOString())
    .limit(1)
    .single()

  if (!batch) return 'No pending batch to flush'

  const items = batch.items as PushContent[]

  // Consolidate items into a single push notification
  const consolidated = consolidatePushItems(items)

  // Send via Expo Push Service (iOS) and Web Push API
  await sendPushNotification(job.user_id, consolidated)

  // Clean up the batch row
  await adminClient
    .from('push_batch_window')
    .delete()
    .eq('id', batch.id)

  return `Flushed ${items.length} batched notifications`
}
```

---

## Queuing Helper

```typescript
// src/lib/background/queue.ts

export async function queueJob(userId: string, options: {
  job_type: string
  category?: 'heavy' | 'lightweight'
  priority?: 1 | 2 | 3
  trigger_source?: string
  prompt?: string
}): Promise<string> {
  const timeout = options.category === 'heavy' ? HEAVY_JOB_TIMEOUT_MS : LIGHTWEIGHT_JOB_TIMEOUT_MS

  const { data } = await adminClient
    .from('background_jobs')
    .insert({
      user_id: userId,
      job_type: options.job_type,
      category: options.category || 'lightweight',
      priority: options.priority || 2,
      trigger_source: options.trigger_source || 'system',
      prompt: options.prompt,
      status: 'queued',
      timeout_at: new Date(Date.now() + timeout).toISOString(),
    })
    .select('id')
    .single()

  return data!.id
}
```

---

## Importance Scoring Algorithm

Runs as part of the overnight cron. Recalculates `importance` scores on Expert documents and memories to keep context loading relevant.

### Formula

```
importance = (recency_score * 0.3) + (access_score * 0.3) + (pin_score * 0.2) + (engagement_score * 0.2)
```

Where:
- **recency_score:** `1.0 - (days_since_created / 365)` — clamped to [0, 1]. Newer = higher.
- **access_score:** `min(access_count / 20, 1.0)` — caps at 20 accesses. Frequently retrieved = higher.
- **pin_score:** `1.0` if `is_pinned = true`, else `0.0`. Explicit user pins always score high.
- **engagement_score:** `min(times_referenced_in_messages / 10, 1.0)` — how often the content appeared in actual responses.

### Cron Implementation

```typescript
// Part of /api/cron/overnight
async function recalculateImportance(userId: string) {
  // Expert documents — join through experts table (expert_documents has no user_id column)
  const { data: docs } = await adminClient
    .from('expert_documents')
    .select('id, created_at, access_count, is_pinned, last_accessed_at, experts!inner(user_id)')
    .eq('experts.user_id', userId)

  for (const doc of docs ?? []) {
    const daysSinceCreated = (Date.now() - new Date(doc.created_at).getTime()) / 86400000
    const recency = Math.max(0, 1 - daysSinceCreated / 365)
    const access = Math.min(doc.access_count / 20, 1)
    const pin = doc.is_pinned ? 1 : 0
    // Engagement: count messages that referenced this doc (via citations or tool results)
    const { count } = await adminClient
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .contains('metadata', { referenced_doc_ids: [doc.id] })
    const engagement = Math.min((count ?? 0) / 10, 1)

    const importance = (recency * 0.3) + (access * 0.3) + (pin * 0.2) + (engagement * 0.2)

    await adminClient
      .from('expert_documents')
      .update({ importance })
      .eq('id', doc.id)
  }
}
```

### Rules
- Pinned documents never drop below `importance: 0.2` (the pin floor)
- Documents with `importance < 0.1` are candidates for "archive" suggestion to the user
- Importance scores are used by Expert Tier 1 context loading to rank which documents to include within the 4,000-token budget
- Runs nightly as part of the overnight cron — not real-time
