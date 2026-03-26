# Agent Orchestrator (@composio/ao) — Research (2026-03-25)

## What It Is
Open-source tool by Composio. Manages fleets of AI coding agents working in parallel. Each agent gets its own git worktree, branch, and PR. An orchestrator agent coordinates everything.

- **Repo:** github.com/ComposioHQ/agent-orchestrator
- **npm:** @composio/ao (thin wrapper around @composio/ao-cli)
- **Version:** v0.2.0 (released 2026-03-21)
- **Age:** 6 weeks (created 2026-02-13)
- **Stars:** 5,421 | Forks: 694 | Open issues: 149
- **License:** MIT

## How It Works
1. `ao start` launches orchestrator + web dashboard (localhost:3000)
2. Orchestrator reads tasks (GitHub issues, Linear, or manual)
3. For each task: creates git worktree + branch, spawns Claude Code instance
4. Each agent works in complete isolation
5. Agent opens PR when done
6. CI failure logs routed back to agent (up to 2 retries)
7. Reviewer comments routed to agent too

## Three Tiers of Parallelism Available

| | Subagents | Agent Teams | Agent Orchestrator |
|---|---|---|---|
| Built-in? | Yes | Yes (experimental) | No (third-party) |
| Isolation | Same repo/branch | Same repo/branch | Separate worktrees/branches |
| Communication | Child to parent only | Peer-to-peer messaging | Via git (branches, PRs, CI) |
| Best for | Quick parallel tasks | Coordinated work | Independent PRs at scale |
| Maturity | Stable | Experimental | v0.2.0 |

## Requirements
- Node 20+, Git 2.25+, **tmux**, gh CLI
- `npm install -g @composio/ao`

## Known Issues (Open)
- tmux server can die silently, causing orchestrator crash loops (#695)
- `ao start` can fail with "Dependencies not installed" due to npm hoisting (#640)
- `ao stop` fails to kill dashboard when port was auto-reassigned (#645)
- No automatic merge conflict resolution yet (planned feature)

## Assessment for Crosby v2

**Good for:** Parallelizing truly independent chunks after foundation is laid (individual page UIs, individual silo implementations, individual API routes)

**Bad for:** Building interconnected core (router, specialist system, chat pipeline, shared types). Conflicts surface at merge time, not during work.

**Risk:** v0.2.0 stability — we'd be debugging the orchestrator while building the app.

**Alternative:** Claude Code's built-in `isolation: "worktree"` parameter on the Agent tool does the same worktree isolation without the external orchestrator overhead. No dashboard, but also no tmux dependency or stability concerns.

## Recommendation
- Don't install until Phase 2+ when we have independent chunks to parallelize
- Consider using built-in worktree isolation first — it's simpler and stable
- If we need 5+ parallel agents, AO may be worth the overhead
- Install tmux now regardless (`brew install tmux`) — useful for other things too

## Alternatives
- **Claude Code Agent Teams** — experimental, no git isolation, best for coordinated work
- **multi-agent-shogun** — similar worktree approach, 1.1K stars
- **parallel-code** — desktop app for multiple agents in isolated worktrees
