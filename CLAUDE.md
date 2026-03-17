# JDRG Project Instructions

## Dev Server
- Claude is responsible for starting, stopping, and restarting the dev server as needed.
- The dev server runs on port 3010: `npm run dev` (which runs `next dev -p 3010`)
- If the server is unresponsive or crashed, kill it and restart it. Don't ask the user to do this.
- Never assume the server is already running. Check first, and start/restart as needed.

## Database
- Supabase is the database. The Supabase MCP server is configured in `.mcp.json` for direct database access.
- Use the Supabase MCP tools to run migrations, query data, and manage schema. Don't ask the user to go to the Supabase dashboard.
- Migration SQL files live in `scripts/`. When creating new tables or schema changes, write the SQL there and run it via the MCP server.

## Stack
- Next.js (App Router), TypeScript, Tailwind CSS
- Supabase (Postgres + auth + storage)
- Anthropic Claude API for the AI chat
- Voyage AI for embeddings (RAG)

## Verification Rule
- If you instruct the user to do something within the app (click a button, use a feature, navigate somewhere, etc.), you must first verify that the thing actually exists and is rendering in the UI. If it's not there, flag it immediately so we can build it out. Don't send the user on a hunt for something that doesn't exist yet.
