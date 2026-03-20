# Crosby - Structured Questions & Quick Confirm Feature

## Claude Code Prompts

Run these in order. Each one is a self-contained prompt you can paste into Claude Code.

---

### Prompt 1: Backend - Tool Definitions + Execution + SSE Events

```
I need to add two new tools to the Crosby chat: `ask_structured_question` and `quick_confirm`. These let the AI present the user with numbered questions (with optional clickable answer options) and simple yes/no confirmations instead of just asking in plain text.

**Where to add them:** `/src/app/api/chat/route.ts` - follow the exact same pattern as the existing tools (manage_action_items, manage_artifact, etc.).

**Tool 1: ask_structured_question**

Schema:
- questions: array of objects, each with:
  - number: integer (question number)
  - text: string (the question)
  - options: optional array of strings (clickable answer choices)
  - multi_select: optional boolean, default false (can user pick multiple options?)

When this tool is called, it should NOT execute any logic or DB call. It just passes the structured data through to the frontend as an SSE event. The tool result returned to the AI should be a simple acknowledgment like "Questions presented to user. Waiting for response."

SSE event format (emit via controller.enqueue, same pattern as action_item events):
{ structured_question: { questions: [...] } }

The chat page stream parser in `/src/app/(app)/chat/[id]/page.tsx` needs to handle this new event type. Follow the same pattern as how `actionItemEvents`, `gmailSearchEvents`, etc. are accumulated on messages.

Add `structuredQuestionEvents` to the message event properties in the chat page and pass them through to ChatMessages.

**Tool 2: quick_confirm**

Schema:
- prompt: string (what you're confirming, e.g. "Create an action item for Roger to fix labor at 326?")
- confirm_label: optional string, default "Yes"
- deny_label: optional string, default "No"

Same deal - no backend logic, just passes through as an SSE event:
{ quick_confirm: { prompt, confirm_label, deny_label } }

Add `quickConfirmEvents` to the message event handling in the chat page, same pattern.

**Important:** Both tools should be added to the tools array alongside the existing tools. The tool result for both should tell the AI to stop and wait for the user's response before continuing - do NOT let the AI keep generating text after calling these tools. The AI's turn should end after the tool call so the user can respond.

After implementing, make sure the dev server still compiles. Don't start the server, just check for TypeScript errors.
```

---

### Prompt 2: Frontend - UI Components

```
I need two new UI components for the Crosby chat that render structured questions and quick confirmations from the AI. These are driven by SSE events that were added in the previous step.

**File: `/src/components/structured-question-card.tsx`**

This component renders when the AI calls the ask_structured_question tool. Requirements:

1. Display each question numbered (1, 2, 3...) with its text
2. Under each question, if options exist, render them as clickable chips/buttons
3. If multi_select is true, allow multiple chips to be selected (toggle on/off). If false, selecting one deselects any previous selection for that question.
4. The component manages an internal answer queue - as the user clicks options for each question, answers accumulate
5. Show a running summary of selected answers at the bottom (e.g. "1. 326 Coleman  2. This week  3. Yes")
6. "Other" option at the end of each question's options that, when clicked, opens a small text input for a custom answer
7. User can click any previous answer in the summary to go back and change it
8. Once all questions are answered, show a "Send" button that populates the chat input with the formatted answers (numbered list) and auto-sends
9. Also show an "Edit" button next to Send that populates the chat input with the answers but does NOT auto-send, so the user can modify before sending
10. After sending, the interactive elements (chips, buttons) should be replaced with a static display of what was selected - no longer clickable
11. Style with Tailwind, match the existing card style used by ActionItemCard and other event cards in chat-messages.tsx

The formatted message sent to chat should look like:
```
1. 326 Coleman
2. This week
3. Roger
```

**File: `/src/components/quick-confirm-card.tsx`**

Simpler component for yes/no confirmations:

1. Display the prompt text
2. Two buttons side by side with the confirm_label and deny_label text
3. Clicking either one auto-sends that answer to the chat (just the label text, e.g. "Yes" or "No")
4. After clicking, buttons become disabled/static showing which was selected
5. Style to match existing cards

**Integration in `/src/components/chat-messages.tsx`:**

Import both components and render them when their respective events are present on a message. Follow the same pattern as ActionItemCard, GmailSearchCard, etc. They should appear inline in the message flow, right after any text content the AI sent before calling the tool.

Both components need access to a callback function to send a message to the chat. Look at how the chat page passes the send function down or use the existing pattern for interactive elements. If there's no existing pattern for child components triggering new messages, the cleanest approach is to accept an `onSendMessage: (text: string) => void` prop that the chat page provides.

After implementing, check for TypeScript errors.
```

---

### Prompt 3: System Prompt Updates

```
Update the system prompt in `/src/lib/system-prompt.ts` to teach the AI when and how to use the two new tools: ask_structured_question and quick_confirm.

Add a new section to the base system prompt (around where the other tool usage instructions are) with these guidelines:

---

## Structured Questions & Quick Confirm

**ask_structured_question** - Use this tool when asking the user questions where:
- You have multiple questions at once (always number them)
- Questions have a finite set of likely answers (store names, time periods, people, yes/no choices, categories)
- The user would benefit from clickable options instead of having to type or remember exact names

Common scenarios where you SHOULD use it:
- "Which store?" - include all 10 store options with numbers and names
- "What time period?" - Today, Yesterday, This week, Last week, This month, Last month, Custom
- "Which entity?" - DRG, HHG, or Both
- "Who should I email/assign this to?" - list relevant contacts based on context
- "Which project?" - list active projects

Do NOT use it when:
- The question is open-ended with no predictable answers ("What should the SOP cover?")
- There's only one simple question with no useful predefined options - just ask in plain text
- You're mid-conversation and the flow would feel interrupted by a structured card

When using multi_select, tell the user they can pick multiple options.

**quick_confirm** - Use this for simple yes/no moments:
- "Want me to create an action item for this?"
- "Should I draft that email?"
- "Archive this project?"
- Any binary confirmation before taking an action

Do NOT use quick_confirm when there are more than 2 choices - use ask_structured_question instead.

IMPORTANT: After calling either tool, STOP and wait for the user's response. Do not continue generating text or take further action until the user answers.

---

Also update the App Manual in `scripts/seed-app-manual.ts` to document these new features. Add a section explaining that Crosby can present interactive questions with clickable options and quick yes/no confirmations to make conversations more efficient. Keep it concise - just enough for the RAG bot to know the feature exists and how it works.

After updating the app manual content, run: npx tsx scripts/seed-app-manual.ts
```

---

## Implementation Notes

- Run these prompts in order (1, 2, 3) since each builds on the previous
- After all three, test by asking the bot something like "show me sales for last week" - it should use the structured question tool to ask which store and time period
- If the AI isn't using the tools enough, tweak the system prompt language to be more aggressive about when to use them
- If it's using them too much (every single message), add more "do NOT use" examples to the prompt
