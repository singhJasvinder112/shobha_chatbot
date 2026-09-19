# Testing Results — Alpha Heights Site & Factory Assistant

Date: 2026-09-19
Scope: End-to-end functional testing of the chatbot against the requirements captured in `meeting_transcription.txt`, using the dummy dataset in `data/`.

## 1. What was tested and how

- **Chat/data-accuracy tests**: sent real HTTP requests to `POST /api/chat` (the same endpoint the UI calls), captured every tool call the model made and its final answer, and cross-checked the numbers against ground truth computed directly from the JSON files in `data/` (via one-off Python scripts, independent of the app code).
- **Voice/transcription test**: generated real spoken-audio clips and posted them to `POST /api/transcribe` to confirm the Deepgram speech-to-text round trip.
- **UI/UX test**: launched the dev server and drove a headless Chromium browser (Playwright) against `http://localhost:3000` — filled the input, clicked send, and screenshotted the rendered page in both light and dark mode. Screenshots are saved under `test-screenshots/`.
- **Build/lint**: `npm run build` and `npx eslint src` after every code change.

Model used for chat: OpenAI `gpt-4o` (tool-calling). Transcription: Deepgram `nova-3`.

## 2. Meeting requirements → coverage

| Requirement from the meeting | Covered by | Result |
|---|---|---|
| "How many pod has been delivered in [tower]" | `getPortDeliverySummary`, `queryPortDelivery` | ✅ Pass |
| "How many for MEP is yet to install" | `getMepSummary`, `queryMepModules` | ✅ Pass |
| "Factory delivered but site hasn't installed — how many, how many days lagged" | `queryInstallation` (with `lag_days_since_delivery`) | ✅ Pass |
| "If dates are calculated not correctly... explain how it did the calculation, with the flow" | `queryTracker` (structural + floor clearance formulas) | ✅ Pass |
| General project/tower/module questions | `getProjectOverview` | ✅ Pass |
| Chatbot should fetch data because "the system will have a database now" | All tools read `data/*.json` (stand-in for the production DB) | ✅ Pass |
| Voice input, transcribed and shown in the message list | `MicButton` + `/api/transcribe` (Deepgram) | ✅ Pass |
| "Analysis and reporting... automated to a chatbot" | Aggregate summaries, per-tower/per-type breakdowns, lag analysis | ✅ Pass |

## 3. Chat / data-accuracy test matrix

Ground truth (from `data/*.json`, independent of app code):
- Port delivery: 56 delivered / 8 pending overall — Tower A: 32 delivered / 8 pending; Tower B: 24 delivered / 0 pending.
- Installation: 46 installed / 10 delivered-but-not-installed / 8 not-started overall — Tower A: 26 / 6 / 8; Tower B: 20 / 4 / 0.
- MEP (Tower A only in this dataset): 55 installed / 35 pending — HCM 7/3, PFM 24/16, KFM 24/16.
- SP-type pods (port types starting "SP"): 32 total, 28 delivered / 4 pending — Tower A: 20 total, 16 delivered / 4 pending; Tower B: 12 total, all 12 delivered.

| # | Question | Tool(s) called | Expected | Actual | Result |
|---|---|---|---|---|---|
| 1 | "Tell me about this project and its towers." | `getProjectOverview` | Alpha Heights, Tower A (10 floors), Tower B (6 floors), POD+MEP active | Correct on all fields | ✅ Pass |
| 2 | "How many pods have been delivered in total, and how many are still pending?" | `getPortDeliverySummary` | 56 / 8 | 56 / 8 | ✅ Pass |
| 3 | "How many pods are pending delivery in Tower B?" | `queryPortDelivery` | 0 | 0 | ✅ Pass |
| 4 | "How many pods have been delivered in Tower A on floor 5?" | `queryPortDelivery` | 4 | 4 | ✅ Pass (see Bug #2) |
| 5 | "How many SP-type pods have been delivered?" | `queryPortDeliveryByType` | 28 (both towers) | 28 | ✅ Pass (see Bug #3) |
| 6 | "Which pods in Tower A are delivered but not yet installed?" | `queryInstallation` | 6 pods (floor 5 ×4, floor 8 ×2), lag 16/16/17/17/1/1 days | Exact match, all port tags + lag days correct | ✅ Pass |
| 7 | "Which pods in Tower B are delivered but not yet installed?" | `queryInstallation` | 4 pods (floors 2/3/4/5), lag 30/26/21/18 days | Exact match | ✅ Pass |
| 8 | "How many pods in Tower A have installation not started at all?" | `queryInstallation` | 8 | 8 | ✅ Pass |
| 9 | "How many pods are delivered but not installed in total across both towers?" | `getInstallationSummary` | 10 | 10 | ✅ Pass |
| 10 | "How many MEP modules are yet to install in total, broken down by HCM/PFM/KFM?" | `getMepSummary` | 35 total — HCM 3, PFM 16, KFM 16 | Exact match | ✅ Pass |
| 11 | "What is the MEP status in Tower B?" (edge case — no MEP data exists for Tower B in this dataset) | `queryMepModules` + `getMepSummary` | 0 records for Tower B | Correctly reported none for Tower B, offered overall context | ✅ Pass |
| 12 | "Why does Tower A floor 3 slab casting finish on August 1, 2026? Explain the calculation." | `queryTracker` (structural) | Start Jul 25 → baseline finish Jul 31 (6-day duration) → actual finish Aug 1 (1-day slip) overriding forecast | Explained correctly with exact dates | ✅ Pass |
| 13 | "How is the floor clearance date calculated for Tower A?" | `queryTracker` (floor_clearance) | Explains first-group vs subsequent-group formula, cites real dates | Correct explanation with real dates | ✅ Pass |
| 14 | "What's the weather today?" (out-of-scope) | none | Should decline, not hallucinate | Declined, redirected politely, no tool misuse | ✅ Pass |
| 15 | "How many pods have been delivered in Tower C?" (nonexistent tower) | none | Should say only Tower A/B exist | Correctly identified there is no Tower C | ✅ Pass |

**15 / 15 scenarios pass on the final build.** Tests #4 and #5 are flagged because they exposed real bugs during testing — see below.

## 4. Bugs found during testing (and fixed)

Testing wasn't just confirmation — it surfaced three real correctness bugs in the tool layer, all now fixed and re-verified:

### Bug #1 — Truncated sample misread as "zero"
**Symptom:** "Which pods are delivered but not yet installed?" answered "none" for both towers when the true count was 6 and 4.
**Cause:** The tool returned only a 15-row sample of a much larger result set; the model read the (unrepresentative) sample instead of a true count.
**Fix:** Every filtering tool now returns a `count_by_status` breakdown computed over *all* matching rows, not just the sample, and the system prompt tells the model to always trust that field over the sample array.

### Bug #2 — `floor_number: 0` treated as a real floor
**Symptom:** Asking about a tower with no floor mentioned sometimes returned an empty result.
**Cause:** GPT-4o would send `floor_number: 0` as a "no filter" default instead of omitting the field; the code treated `0` as a literal floor number (floors are numbered from 1, so nothing matched).
**Fix:** Filter logic changed from `floor_number === undefined` to a falsy check (`!floor_number`), since `0` can never be a real floor in this dataset.

### Bug #3 — Model invented unrequested filter values
**Symptom:** "How many pods delivered in Tower A on floor 5?" returned 2 instead of 4; "How many SP-type pods delivered?" (no tower mentioned) returned 16 (Tower A only) instead of 28 (both towers). The model was silently adding `port_type_prefix: "SP"` and `tower_id: "TWR-A"` to tool calls without being asked.
**Cause:** This is a known tendency of GPT-4o tool-calling — when several optional parameters exist on a tool, it sometimes fills all of them with a plausible-looking value rather than leaving them unset, regardless of explicit prompt instructions telling it not to.
**Fix (structural, not just prompting):**
1. Split `port_type_prefix` and `module_type` out into their own dedicated tools (`queryPortDeliveryByType`, `queryMepModulesByType`) that are only reachable when the user explicitly names a port/module type — removing the temptation from the general-purpose tools entirely.
2. Changed `tower_id` from an *optional* field to a **required** enum of `"TWR-A" | "TWR-B" | "ALL"`, forcing the model to make an explicit, deliberate choice (including explicitly choosing "ALL") instead of leaving an optional field for it to guess-fill.

Both fixes were re-tested and confirmed to resolve the exact failing scenarios (see tests #4 and #5 above), plus a full regression pass of all previously-passing tests to confirm nothing broke.

## 5. Voice / transcription test

| Test | Input | Result |
|---|---|---|
| Round-trip STT | Synthesized speech: *"How many pods have been delivered in Tower A?"* | Transcribed via Deepgram `nova-3` as: `"how many pods have been delivered in tower a"` — correct | ✅ Pass |
| Round-trip STT #2 | Synthesized speech: *"Which pods are delivered but not yet installed in tower B?"* | Transcribed correctly | ✅ Pass |
| UI behavior | Mic button records via `MediaRecorder`, uploads to `/api/transcribe`, and the transcribed text is sent directly into the message list as a user message | Confirmed in code path; browser mic permission itself can't be exercised from this headless environment (no physical mic), but the full server-side pipeline (record → upload → Deepgram → text → `sendMessage`) is verified | ✅ Pass (pipeline), ⚠️ manual mic-permission check recommended on a real device |

## 6. UI/UX verification

Screenshots captured live from the running app (`test-screenshots/`):

- `01-empty-state.png` — empty chat state with suggested-question chips, orange branding
- `02-chat-markdown.png` — bold text and bullet list rendering inside a real answer
- `03-dark-mode.png` — dark mode color adaptation (orange brand color held constant, neutrals flipped)
- `04-conversation-scroll.png` — multi-turn conversation, auto-scroll-to-bottom, nested list rendering

Also verified:
- **Markdown**: bold, numbered/nested lists, and tables all render correctly (tested with an explicit "answer as a markdown table" prompt).
- **Wide-table overflow bug**: found and fixed during this pass — a markdown table wider than the chat bubble was breaking out of the bubble and overflowing the page horizontally. Root cause: a flexbox `min-width: auto` default preventing the bubble from shrinking to its `max-width`. Fixed by adding `min-w-0` to the bubble container; confirmed via a Playwright DOM check that the table's own wrapper scrolls internally (`scrollWidth > clientWidth`) while the page itself has zero horizontal overflow.
- **Custom scrollbar**: renders correctly (thin, orange-tinted, theme-aware).
- **Dev-mode mic button occlusion**: found and fixed — Next.js's dev-mode indicator badge was rendering on top of the mic button in local `next dev`. Disabled via `devIndicators: false` in `next.config.ts` (dev-only cosmetic issue; would not have affected production).
- **No console/page errors** in any of the above scenarios (checked via Playwright's console listener).

## 7. Known limitations / recommendations

- GPT-4o's tool-argument over-filling tendency (Bug #3) was mitigated structurally for every filter we currently expose, but any *new* optional categorical tool parameter added in the future should follow the same "required enum with an explicit ALL/none sentinel" or "split into its own tool" pattern rather than a plain optional field.
- The dataset's MEP records only exist for Tower A (by design of the dummy data); Tower B MEP questions correctly return "no data" rather than an error, but this should be revisited once real MEP data for Tower B exists.
- The physical microphone-permission flow (browser prompt → grant → record) should get one manual pass in a real browser/device before demoing to the client, since headless testing can't exercise OS-level mic permission dialogs.
- This is chat with OpenAI `gpt-4o`; a stronger tool-calling model (e.g. a newer GPT or Claude model) may reduce or eliminate the class of bug described in Bug #3 outright, at the cost of switching providers/keys.

## 8. How to re-run these tests

```bash
npm run dev                 # start the app on :3000
npm run build                # production build check
npx eslint src                # lint check

# Ask the chatbot a question and inspect its tool calls + answer directly:
python3 -c "
import json, urllib.request
q = 'How many pods have been delivered in total, and how many are still pending?'
req = urllib.request.Request('http://localhost:3000/api/chat', method='POST',
    headers={'Content-Type':'application/json'},
    data=json.dumps({'messages':[{'id':'1','role':'user','parts':[{'type':'text','text':q}]}]}).encode())
for line in urllib.request.urlopen(req):
    print(line.decode().strip())
"

# Ground truth for any claim can be recomputed directly from data/*.json with a short Python/Node script.
```
