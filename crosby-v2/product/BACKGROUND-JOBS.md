# Background Jobs — Product Discovery Notes

*Last updated: 2026-03-25*

---

## What It Is

Background jobs are everything Crosby does that isn't a direct chat response — research, email scanning, memory extraction, overnight builds, embedding generation, briefing generation. This spec defines concurrency limits, timeouts, queue behavior, and priority rules.

---

## Job Categories

### Heavy Jobs (Count Toward Concurrency Limit)
Long-running, expensive AI or processing tasks:

- Deep research (Perplexity background job)
- Overnight dashboard builds
- Expert overnight research
- Large document embedding (bulk upload, 10+ documents)
- Silo data sync (initial or large backfill)

**Concurrency limit: 3 simultaneous heavy jobs.** Extras are queued.

### Lightweight Jobs (No Concurrency Limit)
Fast, frequent, essential system tasks:

- Memory extraction per message
- Single email scan (cron tick)
- Calendar sync
- Notification delivery
- Rolling summary refresh
- Single document embedding
- Nudge/briefing generation

These run on every message or every cron tick. They can't be queued without stalling the system. They run freely alongside heavy jobs.

---

## Timeouts

| Category | Timeout | On timeout |
|---|---|---|
| Heavy jobs | 5 minutes | Kill, mark failed, notify user ("That research is taking longer than expected — I'll try again later or you can ask me to retry") |
| Lightweight jobs | 30 seconds | Kill silently. User never knew it was running. System retries on next cycle. |

Timeouts are logged in the activity log (see ACTIVITY-LOG.md) regardless of category.

---

## Queue Behavior

### When the limit is hit
If 3 heavy jobs are running and a new one is requested:

1. Job enters the queue
2. Crosby tells the user (if user-initiated): "I've got a few things running — I'll start that as soon as one finishes."
3. If system-initiated (overnight build, Expert research): queued silently, no user notification
4. Jobs run in queue order, with priority rules (see below)

### Queue visibility
- No dedicated queue UI. The activity log shows all queued, running, and completed jobs.
- Crosby can answer "what are you working on?" by checking the job list.
- If the user asks and jobs are queued: "I'm running a deep research and two document imports. Your dashboard build is next in line."

### Cancellation
- User can cancel any job: "Cancel that research" or "never mind"
- Cancels both running and queued jobs
- Cancelled jobs are logged as `cancelled` in the activity log
- Crosby confirms: "Cancelled."

---

## Priority Rules

| Priority | Job source | Behavior |
|---|---|---|
| 1 (highest) | User-requested (deep research, on-demand dashboard build, explicit document processing) | Jumps ahead of system jobs in the queue. If the queue is full of system jobs and no slots are available, the lowest-priority system job is **paused** to make room. |
| 2 | User-adjacent (jobs triggered by user action — embedding an uploaded doc, backfill after reconnection) | Normal queue order. |
| 3 (lowest) | System-initiated (overnight builds, Expert overnight research, scheduled backfills) | Runs when slots are available. Can be paused to make room for user-requested jobs. |

### Pausing a system job
When a user-requested job preempts a system job:
- The system job pauses at its current state (not killed — it resumes later)
- When a slot opens, the paused job resumes from where it left off
- If the paused job can't resume cleanly (stateless operation), it restarts from the beginning
- No user notification about the pause — this is invisible system resource management

---

## Failure Handling

Covered in ERROR-HANDLING-GRACEFUL-DEGRADATION.md. Summary:
- 2 retries per failed operation (3 total attempts)
- After all retries fail → logged with error message
- 3 consecutive failures of the same job type → user notification via timeline message
- User can manually retry: "Try that research again"

---

## Relationship to Other Systems

| System | Relationship |
|---|---|
| Activity Log (ACTIVITY-LOG.md) | Every job start, completion, failure, queue, and cancellation is logged |
| Error Handling (ERROR-HANDLING-GRACEFUL-DEGRADATION.md) | Retry policy and failure escalation defined there |
| Deep Research (WEB-SEARCH-DEEP-RESEARCH.md) | Deep research runs as a heavy background job |
| Overnight Builder (DASHBOARD-OVERNIGHT-BUILDER.md) | Overnight builds are heavy jobs. Max 2 per night (product constraint) + Expert research shares the overnight window |
| Expert Context Loading (EXPERT-CONTEXT-LOADING.md) | Expert overnight research runs as a heavy job |
| Notifications (NOTIFICATIONS.md) | Notification delivery runs as a lightweight job |
| Conversation Continuity (CONVERSATION-CONTINUITY.md) | Rolling summary refresh is a lightweight job |

---

## Open Questions

- [ ] Should the concurrency limit be configurable per user? (Power users might want 5 concurrent jobs.)
- [ ] Should paused system jobs have a maximum pause duration? (e.g., if paused for 30+ minutes, just cancel and reschedule for next overnight window.)
- [ ] Should the overnight window have its own job limit separate from the daytime limit? (Overnight has less contention — could allow more concurrent jobs.)
