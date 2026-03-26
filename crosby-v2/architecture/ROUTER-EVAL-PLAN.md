# Router Evaluation Plan

*Last updated: 2026-03-25*

---

## Overview

The router is a fast LLM call (Gemini Flash Lite) that classifies every user message to determine which specialists to activate, what data to load, and what tools to enable. It's the highest-risk component in the system — if it misclassifies, every downstream system degrades.

This document defines the test suite for evaluating router accuracy during and after the build.

---

## Specialist Domains

| Domain | Description |
|--------|-------------|
| **Core** | General chat, meta-questions about Crosby. Always active. |
| **Email** | Inbox, drafting, sending, searching, reply tracking |
| **Calendar** | Events, availability, scheduling, meeting prep |
| **Tasks** | Task creation/management, commitments, reminders |
| **Experts** | Creating/managing/working within an Expert workspace |
| **Web Search** | Quick factual lookups (weather, prices, current events) |
| **Deep Research** | Background research jobs, comparative analysis |
| **Watches** | Setting up monitors, watch resolution |
| **Documents** | Upload, search, retrieval of user documents |
| **Artifacts** | Creating/editing Crosby-generated documents |
| **Contacts** | Querying/managing contact information |
| **Notepad** | Notes, decision logs, working memory |
| **Activity Log** | Querying past activity, debugging |

---

## Test Cases

### Core Only (No Specialist)

| Message | Expected |
|---------|----------|
| "How are you doing today?" | core: 0.9 |
| "What time is it right now?" | core: 0.9 |
| "Tell me a joke." | core: 0.9 |
| "I'm thinking about repainting the kitchen." | core: 0.9 |
| "How do I use you?" | core: 0.9 |
| "What features do I have?" | core: 0.9 |
| "Can you help me with something?" | core: 0.9 |

### Email

| Message | Expected |
|---------|----------|
| "Check my inbox for anything from Sarah." | email: 0.9 |
| "I need to draft a response to Roger about the Anderson deal." | email: 0.95 |
| "What emails are waiting for my response?" | email: 0.9 |
| "Send a quick thank you to Jennifer for the intro." | email: 0.9 |
| "Look for any emails with 'contract' in the subject." | email: 0.85 |
| "Has anyone replied to the proposal I sent yesterday?" | email: 0.9, watches: 0.4 |

### Calendar

| Message | Expected |
|---------|----------|
| "What's on my calendar tomorrow?" | calendar: 0.95 |
| "Am I free Thursday afternoon?" | calendar: 0.9 |
| "Schedule a call with Mark for next week." | calendar: 0.85 |
| "Block off 2 hours tomorrow for deep work." | calendar: 0.9 |
| "Who's supposed to be at the Friday lunch?" | calendar: 0.8, contacts: 0.4 |

### Tasks

| Message | Expected |
|---------|----------|
| "Add 'call the accountant' to my list." | tasks: 0.95 |
| "What tasks do I have this week?" | tasks: 0.9 |
| "Mark the Upland property report as done." | tasks: 0.85 |
| "I committed to getting the proposal to Sarah by Friday." | tasks: 0.95 |
| "What am I supposed to be doing right now?" | tasks: 0.8 |

### Experts

| Message | Expected |
|---------|----------|
| "Create a project for the Upland property deal." | experts: 0.95 |
| "Let's work on the marketing campaign." | experts: 0.85 |
| "Within the house hunter expert, what properties are still under consideration?" | experts: 0.9 |
| "Start a new workspace for the quarterly planning." | experts: 0.9 |
| "Close out the summer product launch project." | experts: 0.85 |

### Web Search

| Message | Expected |
|---------|----------|
| "What's the weather tomorrow?" | web_search: 0.95 |
| "Who won the game last night?" | web_search: 0.95 |
| "What time does Costco close?" | web_search: 0.9 |
| "What's the stock price of Apple right now?" | web_search: 0.95 |
| "What's the latest news on AI regulations?" | web_search: 0.9 |

### Deep Research

| Message | Expected |
|---------|----------|
| "I need a deep dive on POS systems for restaurants." | deep_research: 0.95 |
| "Research the top 5 neighborhoods to buy in San Diego." | deep_research: 0.9 |
| "Can you do a full comparison of Shopify vs. WooCommerce?" | deep_research: 0.95 |

### Watches

| Message | Expected |
|---------|----------|
| "Let me know when John replies." | watches: 0.95 |
| "Watch for any emails from the IRS." | watches: 0.95 |
| "Alert me if anyone emails about the Upland property." | watches: 0.95 |
| "I'm waiting to hear back about the lease." | watches: 0.75 |
| "Stop watching for emails from HR." | watches: 0.9 |

---

## Multi-Intent Cases

| Message | Expected |
|---------|----------|
| "Check my calendar for tomorrow and draft a reply to Roger about scheduling." | calendar: 0.9, email: 0.85 |
| "Create a task from the email Sarah sent me about the project." | tasks: 0.9, email: 0.7 |
| "Search my documents for the lease, then draft an email to the landlord." | documents: 0.9, email: 0.85 |
| "Do a deep dive on the market, then add the findings to the Marketing expert." | deep_research: 0.95, experts: 0.7 |
| "What meetings do I have with Sarah this week and what are the action items?" | calendar: 0.8, tasks: 0.7, contacts: 0.5 |

---

## Edge Cases (Router Traps)

| Message | Wrong Classification | Correct Classification | Why It's Tricky |
|---------|---------------------|----------------------|-----------------|
| "Send the numbers." | tasks: 0.9 | email: 0.85 | "Send" looks like a task verb but it's email |
| "I need to call the accountant" | calendar: 0.8 | tasks: 0.9, contacts: 0.4 | "Call" isn't a calendar event, it's a task |
| "What time is the meeting?" | web_search: 0.7 | calendar: 0.95 | "What time" looks like a web search but "the meeting" = calendar |
| "Roger wants to know the status of the Anderson deal." | email: 0.9 | experts: 0.8, contacts: 0.5 | Mentions a person but isn't an email request |
| "Do I have any free time this week?" | core: 0.9 | calendar: 0.95 | Conversational phrasing masks calendar intent |
| "Can you search for that venue we talked about?" | web_search: 0.9 | documents: 0.7, email: 0.5 | "Search" could be web but context = internal data |
| "Keep an eye on this." | core: 0.8 | watches: 0.85 | Vague phrasing masks clear watch intent |
| "I'm thinking about starting a new project for the coastal expansion." | experts: 0.8 | experts: 0.5, core: 0.8 | "Project" doesn't mean Expert creation yet — still musing |

---

## Expert-Dependent Cases

These depend on whether an Expert exists:

| Message | If Expert exists | If no Expert |
|---------|-----------------|--------------|
| "What's the status of the house hunt?" | experts: 0.95 | core: 0.7, tasks: 0.5 |
| "Add this to the project." | experts: 0.9 | artifacts: 0.7 |
| "Should we move forward with the lease?" | experts: 0.9 | notepad: 0.7 |

---

## Scoring Targets

| Metric | Target |
|--------|--------|
| Top-1 primary specialist accuracy | 90%+ |
| Multi-intent secondary coverage (confidence > 0.3) | 85%+ |
| Self-correction rate (request_additional_context calls) | < 10% |
| Regex fallback rate (router timeout/malform) | < 5% |
| Latency p50 | < 200ms |
| Latency p95 | < 400ms |

---

## How to Use This

1. **During Phase 2 build:** Run these test cases through the router implementation and log results
2. **Iterate the router prompt:** Use misclassifications to add/refine few-shot examples in the router prompt
3. **Post-build:** Run against real user messages and update the test suite with new edge cases
4. **Track via Langfuse:** Log every router decision for ongoing accuracy monitoring
