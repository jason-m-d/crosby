# Expert Drift — Ambient Expert Activation via Color

## The Idea

When the conversation drifts toward an expert's domain — but the user hasn't explicitly requested it — the timeline starts showing it visually. From the message where relevance was first detected, the background subtly tints toward that expert's assigned color. Each subsequent message deepens the tint as confidence rises. If the user keeps going, the expert fully activates. If they pivot, the color fades back.

The user never gets asked "Would you like to activate the Marketing expert?" They just *see* it happening.

---

## Why This Works

This solves three open problems at once:

1. **"How does the user know which Expert is active?"** (open question from EXPERTS.md) — the color tells them.
2. **Ambient activation feels jarring without a transition.** Today, expert context either loads or it doesn't — a binary switch. Drift makes it a smooth ramp.
3. **Aligns with the soul doc.** Crosby doesn't narrate its process. It doesn't say "I notice you're discussing marketing." The color shift *is* the communication — ambient, not verbal.

The style guide says "no gradients, no decorative elements." This isn't decorative. The color is functional — it communicates the AI's internal classification state. The same way a subtle border-glow on focus tells you an input is active, the background tint tells you an expert is waking up.

---

## How It Works

### Expert Colors

Every expert has an assigned color — a hue value that works on a dark background at very low opacity.

**Assignment:**
- System provides a default palette of 10-12 distinct hues (see Color Palette below)
- Colors auto-assigned at expert creation in round-robin order, skipping adjacent hues
- User can change an expert's color in expert settings
- No two active experts share a color (system picks next available if conflict)

**Color Palette (starting point — needs design validation):**

| Hue | Name | Usage at 6% opacity on dark bg |
|-----|------|-------------------------------|
| 210 | Blue | Cool, neutral — good default for misc |
| 160 | Teal | Technical, data-oriented |
| 35  | Amber | Operations, logistics |
| 280 | Purple | Creative, marketing |
| 350 | Rose | People, HR, relationships |
| 120 | Green | Finance, growth |
| 25  | Orange | Sales, deals |
| 190 | Cyan | Communications, email-heavy |
| 45  | Gold | Legal, contracts |
| 320 | Magenta | Events, entertainment |

These are starting suggestions. The actual palette needs to be tested against the warm brown-gray background (`bg-background`) to ensure they read as subtle tints, not colored boxes.

### Confidence Scoring

The router already classifies expert relevance per message. Drift adds a **confidence score** (0.0–1.0) to the router's output:

```typescript
interface ExpertSignal {
  expertId: string
  name: string
  color: { h: number; s: number; l: number } // HSL
  confidence: number // 0.0 – 1.0
}

// Router returns this alongside its normal classification
interface RouterResult {
  // ... existing fields
  expertSignals: ExpertSignal[] // ordered by confidence, highest first
}
```

**Confidence thresholds:**

| Range | Visual State | What's Happening |
|-------|-------------|-----------------|
| 0.0 – 0.3 | Nothing | Below noise floor. No visual change. |
| 0.3 – 0.5 | Whisper | Very faint tint appears. User might not consciously notice, but the timeline "feels" different. |
| 0.5 – 0.7 | Drift | Noticeable tint. User can see the conversation is pulling toward something. |
| 0.7 – 0.85 | Approach | Clear tint. Expert name badge fades in at the top of the drift zone. |
| 0.85+ | Activation | Expert context loads. Tint solidifies. Badge becomes persistent. |

### The Visual Effect

**Per-message tinting:**

Each message in the timeline carries an `expertSignal` in its local state (not persisted to DB — this is a frontend-only visual). The message's container gets a background tint:

```css
/* CSS custom property set per message */
.message-container {
  --drift-hue: 280;        /* expert's hue */
  --drift-saturation: 60%;  /* expert's saturation */
  --drift-opacity: 0;       /* 0 = no tint, maps from confidence */

  background-color: hsla(
    var(--drift-hue),
    var(--drift-saturation),
    50%,
    var(--drift-opacity)
  );
  transition: background-color 0.6s ease;
}
```

**Opacity mapping (confidence → visual intensity):**

```typescript
function confidenceToOpacity(confidence: number): number {
  if (confidence < 0.3) return 0
  if (confidence < 0.5) return 0.02 + (confidence - 0.3) * 0.05  // 0.02 – 0.03
  if (confidence < 0.7) return 0.03 + (confidence - 0.5) * 0.075 // 0.03 – 0.045
  if (confidence < 0.85) return 0.045 + (confidence - 0.7) * 0.1 // 0.045 – 0.06
  return 0.06 // activated — consistent tint
}
```

These values are intentionally very low. On a dark background, 2-6% opacity of a saturated hue is perceptible but not aggressive. Needs testing — these will be tuned by eye.

**The gradient effect across messages:**

This is what makes it feel like a "drift" rather than a "switch." The tint doesn't apply uniformly — it builds message by message:

```
Message 12: "Can you pull up the lease terms?"
  → confidence: 0.35, opacity: 0.02 (barely there)

Message 13: "I think we should counter at $4,000"
  → confidence: 0.55, opacity: 0.035

Message 14: "What's the market rate for that area?"
  → confidence: 0.72, opacity: 0.05 (expert name badge fades in)

Message 15: "Draft a response to the landlord"
  → confidence: 0.88 → ACTIVATION (context loads, tint solidifies)
```

Scrolling up, you'd literally see the conversation "entering" the expert's color field — messages get progressively more tinted toward the bottom of the drift zone.

### Expert Name Badge

When confidence crosses 0.7 (Approach threshold), a small badge fades in. Placement options:

**Option A: Inline marker (recommended)**
A small pill appears between messages at the point where drift began, like a chapter marker:

```
─── 1008 Sale ───────────────────────
```

Same visual language as a date separator in chat apps. Understated, doesn't take space, clearly marks the boundary.

**Option B: Floating badge**
A pill floats at the top of the visible chat area (sticky positioned) showing the approaching/active expert name. Fades in at 0.7, solidifies at activation.

**Option C: Sidebar indicator**
The expert's entry in the left sidebar nav gets a subtle glow or activity dot, matching the tint color. Works in combination with A or B.

**Recommendation:** Option A (inline marker) + Option C (sidebar indicator). The inline marker is the most natural — it's already a pattern users understand from date dividers. The sidebar indicator connects the color to the expert's name for users who might not recognize which expert the color belongs to.

### Fade-Out When Conversation Pivots

If the user changes topic and confidence drops:

- New messages get lower (or zero) opacity
- The drift zone messages **keep their tint** (they were about that topic — that's accurate)
- The inline marker stays (it marks a real segment of conversation)
- The sidebar indicator fades
- If the user scrolls back, the drift zone is still visible as a historical marker — "that section was about the 1008 Sale"

This means the timeline becomes a **color-coded history** over time. You can scroll and see bands of color where different experts were relevant. This is emergent — not designed as a feature, but a natural consequence of per-message tinting.

---

## Edge Cases

### Two experts competing

If two experts have confidence > 0.3 simultaneously:

- **Show the higher-confidence one.** Only one tint at a time.
- If both cross 0.7 (unusual but possible — e.g., "draft an email to the landlord about the lease" hits both Email and 1008 Sale), the one with higher confidence wins visually. Both can be activated for context loading — the visual just picks one.
- The inline marker can show both: `─── 1008 Sale · Email ───`

### Expert already active

If the user explicitly opened an expert (Direct mode from EXPERTS.md), the full tint is already applied from the start. No drift needed — they're already there.

### Short spikes

User mentions something briefly, confidence hits 0.4, then drops next message:

- A faint blip of color appears on that one message, then nothing
- This is fine. It's accurate — there was a brief touch on that topic
- The tint is so subtle at 0.4 that most users won't notice a single-message blip

### Rapid expert switching

User bounces between topics quickly:

- Each message gets its own tint based on the router's classification
- The timeline becomes a quick succession of different colors
- This might look busy — but it's also accurate. If it's visually noisy, the noise floor threshold (0.3) can be raised to 0.4-0.5 so only sustained drifts show color

### New user with no experts

No experts = no colors = no drift. The feature is invisible until experts exist. When the first expert is created, the system assigns a color and drift begins working.

### Mobile

Same treatment, no changes needed. The background tint works identically on smaller screens. The inline marker might use a shorter format:

```
─── 1008 Sale ──────
```

---

## Data Flow

### Where confidence comes from

**Option 1: Router-generated (recommended for v2 launch)**

The router already runs on every message. Add `expertSignals` to its output schema:

```typescript
// In the router's response schema
expertSignals: [{
  expertId: string,
  confidence: number  // 0.0 – 1.0
}]
```

The router sees the full message + recent history and judges which expert(s) are relevant. This adds negligible latency since the router call already happens.

**Option 2: Prefetch-generated (future enhancement)**

The prefetch endpoint (called while user types) could return expert signals before the message is sent. This would let the **input area itself** start showing the expert's color as the user types — the drift begins before they even hit send. Extremely cool but adds complexity. Save for v2.1.

### What gets persisted

- **Expert signals are NOT persisted to the messages table.** They're ephemeral frontend state.
- The tint is recomputed on page load by re-running the router on recent messages? No — too expensive.
- **Better approach:** Store the `expertSignals` array on each message row (lightweight JSON field). This way, scrolling through history shows the color bands accurately.
- **Even better:** Store only the winning expert ID + confidence per message. Single FK + float, minimal storage.

```sql
ALTER TABLE messages ADD COLUMN expert_signal_id UUID REFERENCES experts(id);
ALTER TABLE messages ADD COLUMN expert_signal_confidence FLOAT;
```

On page load, the frontend reads these fields and applies tinting. No re-computation needed.

### Frontend state

```typescript
interface MessageWithDrift extends Message {
  // From DB or computed
  expertSignal?: {
    expertId: string
    name: string
    color: { h: number; s: number; l: number }
    confidence: number
  }
}
```

The message component reads `expertSignal` and applies the CSS custom properties. That's it.

---

## What Changes at Full Activation (≥ 0.85)

When confidence crosses the activation threshold:

1. **Context loads** — Expert's Tier 1 instructions + summary injected into the next system prompt
2. **RAG scope narrows** — Expert's documents get priority boosting in retrieval
3. **Tools may change** — If the expert has custom tools, they become available
4. **Visual solidifies:**
   - Background tint locks at consistent opacity (no longer varying per-message)
   - Inline marker becomes a solid chapter boundary
   - Sidebar expert entry gets an active indicator (dot or highlight)
5. **Expert name appears in the inline marker** if it hasn't already (it appeared at 0.7, so by 0.85 it's already visible)

The transition from "drifting" to "active" should feel like the last step of something that was already happening — not a sudden mode change.

### Deactivation

When the user stops talking about the expert's domain:

- Confidence on new messages drops below 0.3
- After 3+ consecutive messages below 0.3, the expert deactivates
- Sidebar indicator fades
- New messages return to default background
- Historical messages in the drift zone keep their tinting
- Expert context is removed from the next system prompt

The 3-message buffer prevents flicker if the user briefly digresses and comes back.

---

## Interaction with Other Visual Features

### Timeline cards (briefings, nudges, watch alerts)

Cards that appear in the timeline during a drift zone get the same background tint. A watch alert card about "1008 Sale: landlord responded" appearing in a zone that's already drifting toward 1008 Sale would have the expert's tint — reinforcing the connection.

### Structured questions

Clarification cards and input-area chips are unaffected by drift colors. They use their own visual treatment. The input area itself stays neutral — drift is a timeline-only effect (until/unless we add input-area preview in the future).

### Dark theme

The entire system assumes a dark background. The tinting is additive light — a hue added at low opacity on dark surfaces. This wouldn't work on a light theme without inversion (which isn't relevant since Crosby is dark-only, per the style guide).

---

## Implementation Phases

### Phase 1: Foundation
- Add `color` field to the expert data model (HSL object or hue integer)
- Auto-assign colors from palette on expert creation
- Add `expert_signal_id` and `expert_signal_confidence` columns to messages
- Router schema updated to return `expertSignals`

### Phase 2: Visual
- Message component reads expert signal and applies CSS custom properties
- Opacity mapping function (confidence → opacity)
- CSS transitions for smooth tint changes
- Inline chapter marker component (appears at confidence ≥ 0.7)

### Phase 3: Activation Integration
- Wire confidence threshold (0.85) to expert context loading
- Sidebar active indicator tied to drift state
- Deactivation logic (3-message buffer)

### Phase 4: Polish
- Tune opacity values against real dark background
- Test with 3-5 experts active in one conversation
- Test rapid switching behavior
- Mobile viewport testing
- Performance profiling (CSS custom property changes per message)

### Future: Input-Area Preview
- Prefetch returns expert signals while user types
- Input area border or background tints toward the predicted expert
- Most speculative — save for after v2 launch and user feedback

---

## Open Questions

1. **Exact opacity values.** The mapping function above is a starting guess. Needs visual testing against the actual `bg-background` color (warm brown-gray). Too subtle = invisible. Too strong = distracting.

2. **Saturation.** Should the expert colors be fully saturated (vivid tint on dark) or desaturated (muted, earthy tints that blend with the warm background)? The style guide's "quiet hierarchy" suggests desaturated.

3. **User control.** Should users be able to turn off drift coloring? Probably yes (Settings > Preferences), but it should be on by default. Nobody will discover an opt-in color feature.

4. **History recomputation.** If a user changes an expert's color, do historical drift zones update? Probably yes — the stored field is the expert ID, and the color is looked up at render time.

5. **Accessibility.** Users with color vision deficiency may not distinguish some hues. The inline marker text label handles this — the color is supplementary to the text label, not the only signal. But we should test with common CVD simulations and ensure the palette has enough luminance variation, not just hue variation.

6. **"Why is my chat changing color?"** First-time users might be confused. Options: (a) do nothing, let them figure it out (Crosby's style — doesn't over-explain); (b) a one-time tooltip on first drift occurrence; (c) explain it in the app manual so Crosby can answer if asked. Recommendation: (c) — explain in the manual, let the user ask if curious. Matches the soul doc.
