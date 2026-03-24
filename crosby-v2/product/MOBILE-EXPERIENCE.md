# Mobile Experience — Product Discovery Notes

*Last updated: 2026-03-24*

---

## What It Is

Crosby is a full native iOS app — not a PWA, not a wrapped web view. The mobile app is the same complete Crosby experience as the web app, with a mobile-first layout that adapts to the phone screen. Both platforms talk to the same backend.

---

## Technology

### React Native with Expo

- **Why not SwiftUI:** Crosby already has a React + TypeScript web app. React Native lets both platforms share component logic and the same language/framework. One UI change can propagate to both web and mobile. SwiftUI would mean maintaining two completely separate frontends with no code sharing.
- **Why not PWA:** Keyboard behavior is broken, push notifications are unreliable on iOS, and the overall feel is cheap and not solid. React Native renders actual native iOS views — users can't tell the difference from a SwiftUI app.
- **Why Expo:** Handles the native iOS build pipeline, App Store submission, push notification setup, and most native APIs. Removes the need to touch Xcode for 90% of development.

### Monorepo structure

- Next.js web app and React Native mobile app live in the same project.
- Shared backend — both talk to the same Next.js API routes and Supabase.
- Shared component logic where possible — business logic, data fetching, types. Platform-specific UI components where layout differs.
- When making a UI change, Claude Code updates both platforms from a single instruction.

---

## Mobile Layout

### Navigation

- **Bottom navigation bar** with four tabs: Chat, Documents, Experts, Settings.
- Same core pages as web, adapted for mobile.

### Chat screen

- Full chat timeline, same as web.
- **Dashboard:** Collapsible area above the chat, same behavior as web. Widgets stack vertically.
- **Sidebar panel:** Slides in from the right, takes up the **top half** of the screen. User can view the panel (artifacts, contacts, notepad) and still chat in the bottom half simultaneously.
- **Sidebar trigger:** Same small icon in the top right corner as web.
- **Sidebar tabs:** Artifacts, Contacts, Notepad — same as web, same tab memory.

### Other screens

- **Documents:** Same full documents experience — upload, browse, search.
- **Experts:** Browse, create, manage Experts.
- **Settings:** Memory browser, "What Crosby has learned" section, preferences, account.

### Input area

- Native keyboard behavior — no weird PWA resizing issues.
- Structured question chips and confirmation chips above the input area, same as web.
- Paperclip attachment button for document uploads.

---

## Push Notifications

### Design principle

Notifications feel like **messages from a person**, not alerts from a system. Rich, contextual, conversational. Crosby's personality comes through in every notification.

### Tone & content

- **Not:** "Task due tomorrow: Review lease terms"
- **Instead:** "Reminder that the lease review is due tomorrow and we haven't started. I pulled up the lease doc to help us get started."

- **Not:** "New email from Roger"
- **Instead:** "Roger just replied about the staffing issue — looks like he's proposing a different schedule. Want to take a look?"

Notifications include relevant surrounding context to make them feel richer, more alive, and bespoke. Crosby doesn't just state the alert — it adds what it knows and what it's done to help.

### Technical

- **APNs (Apple Push Notification Service)** via Expo's push notification infrastructure. Proper native iOS notifications — reliable, badge counts, notification grouping.
- Notification types map to the existing proactive message taxonomy: briefings, nudges, heads-ups, catch-ups.
- User can configure notification preferences per category in Settings.

### Tap behavior

- **Tapping a notification → deep links to the specific message/context in the chat.** The app opens directly to that point in the timeline.
- If the app is already open, it scrolls to the relevant message.
- **Robust deep linking:** If Crosby sent a notification and the user opens the app through it, they land at that exact context — not just the chat screen, but the specific message.

### Ignored notifications

- If the user ignores a notification and opens the app later on their own, they don't get forced back to the old notification context.
- Instead, Crosby handles it through the existing systems — the living greeting/catch-up includes a mention of the notification topic, plus whatever else is pending.
- The notification's content is woven into the natural flow, not replayed as a stale alert.

---

## What's the Same as Web

Everything functional is identical. The mobile app is not a simplified or "lite" version.

- Full chat with all content types (messages, cards, briefings, nudges, structured questions, research reports)
- Dashboard with all widgets
- Sidebar with artifacts, contacts, notepad
- Document upload and browsing
- Expert management
- All settings and preferences
- Deep research (background job, notification on completion)
- Web search (inline)
- Training & learning (quiz sessions, behavioral observation)
- All tools available

---

## What Adapts for Mobile

| Element | Web | Mobile |
|---|---|---|
| Navigation | Top/side nav | Bottom tab bar (Chat, Documents, Experts, Settings) |
| Sidebar | Right panel alongside chat | Slides from right, top half of screen — chat visible below |
| Dashboard | Collapsible above chat | Same, widgets stack vertically |
| Input area | Standard text input | Native keyboard with proper behavior |
| Structured questions | Timeline cards + input chips | Same, sized for touch targets |
| Notifications | Browser notifications (if supported) | Native APNs push notifications |
| Document upload | Drag-and-drop + file picker | Camera, photo library, file picker |

---

## Relationship to Other Systems

| System | Relationship |
|---|---|
| Push notifications spec | Mobile is the primary notification channel. APNs for delivery. Notification content follows the "messages from a person" principle. |
| Briefings & nudges | Same content, delivered via push + in-app. Mobile is where most proactive messages land. |
| Dashboard | Same widget system, same collapsible behavior, vertical stacking on mobile. |
| Sidebar (artifacts, contacts, notepad) | Split-view on mobile — panel on top half, chat on bottom half. |
| Structured questions | Same card system, touch-optimized chip sizes. |
| Documents | Mobile adds camera and photo library as upload sources. |
| Deep research | Background job notifications are push notifications on mobile. |

---

## Ripple Effects

- **Project structure** — Monorepo with Next.js web app + React Native/Expo mobile app. Shared types, API layer, and business logic.
- **Component architecture** — Need a strategy for shared vs. platform-specific components. Some components can share logic with platform-specific rendering.
- **Push notification infrastructure** — APNs setup, Expo push notification service, notification content generation (rich, contextual, conversational).
- **Deep linking** — Notification tap → specific message in chat timeline. Requires message-level routing.
- **All UI specs** — Every feature spec that defines a visual element (cards, widgets, sidebar content) needs to work on both web and mobile layouts.

---

## Open Questions

- [ ] Should there be an iPad layout? Or is it just phone + web browser?
- [ ] Offline support — should the app work without internet (cached messages, queued actions) or is always-online acceptable?
- [ ] App Store review — Crosby uses AI heavily. Are there App Store guideline concerns around AI-generated content or chat apps?
- [ ] Should the mobile app support biometric auth (Face ID / Touch ID) for security?
- [ ] Widget support — iOS home screen widgets showing dashboard data (like a sales number or next meeting)? That would require SwiftUI for the widget extension, even in a React Native app.
- [ ] How does document upload from camera work — does Crosby OCR photos automatically?
