# Claude Code Build Guide — Perplexity Deep Research (2026-03-25)

Source: Perplexity deep research run by Jason. Full report at `~/Downloads/Claude Code  Complete Build Guide for Large-Scale AI-Powered Apps.md`

## Summary

Comprehensive research on Claude Code best practices for a large monorepo one-shot build (Next.js web + React Native/Expo mobile, shared packages, 200+ files).

## Key Findings We're Adopting

### Context Management
- **Clear at 60% capacity** — don't wait for auto-compaction (lossy, fires at ~83.5%)
- **Document & Clear pattern** — dump state to build-state.md, `/clear`, resume with `/catchup` command
- **One task per conversation** — strongest rule from community consensus
- **Fresh session burns ~20K tokens** just loading system prompt + tool schemas + CLAUDE.md

### CLAUDE.md Architecture
- Layered: root CLAUDE.md + per-app + per-package
- Subdirectory CLAUDE.md only loads when working in that directory tree
- Keep root under ~150 usable instructions
- Bullet points > paragraphs for attention/recall
- "Never-touch" lists more effective than positive scope definitions
- `IMPORTANT:` / `CRITICAL:` sparingly — if everything is critical, nothing is

### Monorepo
- Different `moduleResolution` for web (bundler) vs mobile (node)
- `transpilePackages` in next.config.ts for all `@crosby/*` packages
- Build order: packages first, then apps (Turborepo `^build`)
- Metro + pnpm needs singleton pinning, symlink support, watchFolders config
- Never let two agents touch pnpm-lock.yaml simultaneously

### React Native Guardrails
- Explicit prohibition list for DOM elements in mobile CLAUDE.md
- Nativewind v4 differences table (no grid, column-default flex, limited arbitrary values)
- Expo Router vs Next.js App Router comparison table
- Mobile = "TypeScript-verified" during agent phase, visual QA via EAS builds post-agent

### Quality Gates
- Verification at both agent level (pre-commit) and orchestration level (phase gate)
- TypeScript catches majority of integration failures across API boundary
- Anti-rationalization review at phase gates (not per-edit — too expensive)

### Agent Orchestration
- Contract-first: define all API types in shared package BEFORE parallelizing
- One worktree per parallel track
- Shared packages owned by one agent at a time (serialized)
- Merge to integration branch sequentially, one worktree at a time

## Key Findings — Corrected After Our Own Research

### Subagent Context (Perplexity report was WRONG)
- Subagents do NOT inherit parent conversation history
- All subagent types (general-purpose, Explore, Plan) start with fresh context
- Only channel from parent to subagent = the prompt string
- They DO inherit: CLAUDE.md files, auto-memory, MCP servers, permissions
- They DON'T inherit: conversation history, tool results, skills, compact summaries
- Known bug: project-scoped MCP servers (.mcp.json) may not work in custom subagents

### Agent Orchestrator (Perplexity report dismissed it incorrectly)
- It exists, works, is actively maintained (v0.2.0, 5.4K stars, 6 weeks old)
- Each agent gets own git worktree, branch, and PR
- Best for independent chunks post-foundation, not interconnected core
- Requires tmux (not installed on this machine)
- v0.2.0 stability concerns — tmux crashes, install failures still open issues
- Alternative: Claude Code's built-in `isolation: "worktree"` on Agent tool does similar thing

## What We're NOT Adopting
- PostToolUse Haiku anti-rationalization hook on every edit (too slow/expensive — use at phase gates instead)
- Agent Teams experimental feature (too new, costs more tokens, not needed yet)
- `@composio/ao` for Phase 1 (foundation must be sequential)
