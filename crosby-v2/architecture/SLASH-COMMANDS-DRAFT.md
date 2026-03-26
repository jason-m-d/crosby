# Slash Commands for the v2 Build

These will live in `.claude/commands/` in the v2 monorepo. Drafts here for review before the repo is set up.

---

## /catchup

Rebuilds context after a `/clear`. Reads the git diff and build state to get the agent back up to speed without replaying the old conversation.

```markdown
<!-- .claude/commands/catchup.md -->
Rebuild your context after a /clear or new session. Follow these steps:

1. Read `.claude/build-state.md` for current phase, completed work, and open decisions
2. Run: `git diff --name-only main` to see all files changed on this branch
3. For each changed file, read it to understand what was implemented
4. Check for any TODO or FIXME markers in changed files
5. Read the CLAUDE.md files relevant to the current phase
6. Summarize:
   - What phase we're in
   - What's been built so far
   - What's next
   - Any open decisions or blockers
7. Ask if the user wants to continue with the next task or adjust the plan
```

---

## /log-phase

Checkpoints a phase completion. Updates build state and commits.

```markdown
<!-- .claude/commands/log-phase.md -->
A phase has just been completed. Do the following:

1. Run quality gates:
   - `pnpm typecheck` (all packages)
   - `pnpm lint`
   - `pnpm build`
2. Report results clearly: what passed, what failed
3. If all gates pass, update `.claude/build-state.md`:
   - Mark the current phase as completed with today's date
   - List all files created/modified in this phase
   - Record any decisions made and their rationale
   - Record any "don't do this" learnings
   - Set the next phase as current
   - Write the exact first task for the next phase
4. Commit the build-state update
5. Report context window usage (run /context)
6. If context is above 50%, recommend a `/clear` followed by `/catchup`
```

---

## /verify

Runs all quality gates and reports results in plain language.

```markdown
<!-- .claude/commands/verify.md -->
Run all quality gates for the monorepo and report results:

1. `pnpm --filter @crosby/shared build` — shared package must compile first
2. `pnpm --filter @crosby/web typecheck` — web app type check
3. `pnpm --filter @crosby/mobile typecheck` — mobile app type check
4. `pnpm lint` — ESLint across all packages
5. `pnpm build` — full Turborepo build

For each command, report:
- PASS or FAIL
- If FAIL: the specific error(s) in plain language, file path, and suggested fix

Do not proceed to the next task until all gates pass.
```

---

## /delegate

Template for spawning a subagent with the right context. Used by the lead session.

```markdown
<!-- .claude/commands/delegate.md -->
Spawn a subagent for the task described below. Before spawning, prepare:

1. Read the current interface contracts from `packages/shared/types/`
2. Read `.claude/build-state.md` for current phase context
3. Compose a self-contained prompt that includes:
   - Exact file paths to create/modify
   - Relevant TypeScript type signatures (paste them, don't reference)
   - "Never-touch" list of files the agent must not modify
   - Quality gate command to run before declaring done
   - Commit instruction
4. Spawn the agent with `isolation: "worktree"` if it creates/modifies files
5. When the agent returns, review its diff before merging

Task: $ARGUMENTS
```

---

## /status

Quick status check — where are we, what's done, what's next.

```markdown
<!-- .claude/commands/status.md -->
Read `.claude/build-state.md` and give a brief status report:
- Current phase and progress within it
- Tasks completed today
- Next task to work on
- Any blockers or open decisions
- Context window usage (run /context)
```
