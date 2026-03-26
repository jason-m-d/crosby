# Claude Code Subagent Context Inheritance — Research (2026-03-25)

## How Context Actually Works

All subagent types (general-purpose, Explore, Plan) start with a **fresh context window**. They have zero visibility into the parent's conversation.

### Inherits Automatically
- **CLAUDE.md files** — both user-level (~/.claude/CLAUDE.md) and project-level (./CLAUDE.md)
- **Auto-memory files** — personal and project memory from .claude/ directory
- **MCP server access** — same MCP configuration as parent
- **Permissions** — inherits parent's permission mode
- **Tools** — all tools by default (can restrict via allowlist/denylist in frontmatter)

### Does NOT Inherit
- **Conversation history** — the big one. Zero parent context.
- **Tool results** — if parent read 50 files, subagent starts from scratch
- **Skills loaded during session** — must be explicitly declared in frontmatter
- **Compact/summary context** — parent's compacted summaries don't transfer
- **Session state** — reasoning, decisions, classifications from parent

### Subagent Type Differences

| | Explore | Plan | General-purpose |
|---|---|---|---|
| Default model | Haiku (fast/cheap) | Inherits parent | Inherits parent |
| Tool access | Read-only (no Edit/Write) | Read-only (no Edit/Write) | Full (read + write) |
| Purpose | Fast codebase search | Research for planning | Complex multi-step tasks |
| Context | Fresh | Fresh | Fresh |

### Known Bugs
- Model config not always inherited — use `CLAUDE_CODE_SUBAGENT_MODEL` env var (GitHub #5456)
- Project-scoped MCP servers (.mcp.json) may not work in custom subagents — global MCP servers (~/.claude/mcp.json) are more reliable (GitHub #13898, #13605)
- No way to opt out of CLAUDE.md/memory inheritance — causes token waste for simple subagents (GitHub #6825)

### Implications for Our Build
1. Every subagent prompt must be **self-contained** — include file paths, decisions, constraints, interface contracts
2. CLAUDE.md is the only shared context that loads automatically — make it count
3. For delegated implementation tasks, include clear success criteria in the prompt
4. Subagent context isolation is a feature — prevents context contamination where reviewer subagents agree with decisions instead of critically reviewing

### Sources
- Official docs: code.claude.com/docs/en/sub-agents
- GitHub issues: #6825, #4908, #5456, #13898, #13605, #20304
- Piebald-AI/claude-code-system-prompts (extracted system prompts)
