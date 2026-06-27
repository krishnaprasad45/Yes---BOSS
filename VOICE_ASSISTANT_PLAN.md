# Voice Assistant — Implementation Plan

Feature: tap the mic on the Home assistant bar → animated listening overlay →
the assistant greets ("Yes Boss! How can I help?"), listens, understands a
spoken command, executes it (or asks to confirm), and speaks the result back.

Example utterances:
- "Add expense 200 in Rapido, tag travel expense"
- "What are today's tasks?"
- "What's today's analytics?"
- "Call John"
- "Send a message to Sam saying I'm not coming today"

---

## 1. Current project status (what we can reuse)

The heavy infra already exists. This feature is mostly **glue + one new module**, not greenfield.

| Capability | Already in repo | Reuse for |
|---|---|---|
| Groq LLM (OpenAI-compatible) | `apps/backend/src/recap/summary.service.ts` — `RECAP_BASE_URL`, `llama-3.3-70b-versatile`, JSON mode | Intent parsing (tool-calling) |
| Groq Whisper STT | `apps/backend/src/recap/transcription.service.ts` (`whisper-large-v3`) | Server-side STT fallback |
| Add expense (write) | `POST /api/v1/finance/transactions` → `addManualTxn(ManualTxnInput)` | `add_expense` intent |
| Categories list | `GET /api/v1/finance/categories` | Resolve "travel" → Category |
| Today's analytics | `GET /api/v1/stats/overview` + `/digest` (`useDashboardStats`, `useDailyDigest`) | `todays_analytics` intent |
| Contact directory | Redux `state.calls.items` — `{contactName, phoneNumber}` pairs | Resolve "John"/"Sam" → number, **no READ_CONTACTS needed for known callers** |
| Native SMS send | `AutoReply` module (`SmsManager`, `sendRecap`) | Template for a `sendSms(number, body)` bridge |
| Settings sync pattern | `apps/mobile/src/services/*` + React Query hooks | Assistant API hooks |

**Gaps (new work):**
- No `tasks` backend module. "Today's tasks" must be **defined** — see §9 Open Questions. Interim: map to today's calls/agenda from existing data.
- No on-device STT / TTS / audio libs installed.
- No mic-listening animation/overlay UI.
- Missing Android permissions: `RECORD_AUDIO`, `CALL_PHONE`, (`READ_CONTACTS` optional).
- No native "place a call" bridge (will use `Linking('tel:')` first).

---

## 2. Architecture & data flow

```
[Mic tap on assistant bar]
      │
      ▼
[VoiceOverlay opens]  ── state machine: idle → listening → thinking → speaking
      │
      ▼
TTS greet: "Yes Boss! How can I help?"   (react-native-tts, on-device)
      │
      ▼
Capture speech  ──►  on-device STT (@react-native-voice/voice)  ──► transcript text
      │                         (fallback: record audio → POST → Groq Whisper)
      ▼
POST /api/v1/assistant/interpret  { text, context }
      │
      ▼  Backend: Groq Llama tool-calling → ONE structured command
   { intent, args, speech, needsConfirm }
      │
      ▼  App dispatches by intent class:
      ├── server-data intents → call existing API hook (analytics, add_expense)
      └── device intents      → run on device (call via tel:, SMS via native/sms:)
      │
      ▼
[confirm step if needsConfirm]  → TTS speak result / read-back
```

Design rule: **the backend never performs device actions.** For `call_contact` /
`send_message` it returns a *resolved command*; the app executes it and gates with
a confirm. Money + calls + messages always confirm before firing.

---

## 3. Intent schema (Groq tool-calling)

Backend sends Llama a system prompt + the tool list; model returns one tool call.
Response normalized to:

```ts
interface AssistantCommand {
  intent: 'add_expense' | 'todays_analytics' | 'todays_tasks'
        | 'call_contact' | 'send_message' | 'unknown';
  args: Record<string, unknown>;
  speech: string;       // what the assistant should say back
  needsConfirm: boolean; // true for money / call / SMS
}
```

Tool definitions (args the model must fill):

| intent | args | needsConfirm | executor |
|---|---|---|---|
| `add_expense` | `amountMinor:number, merchant:string, category:string` | yes | `addManualTxn` |
| `todays_analytics` | — | no | read stats/digest, summarize |
| `todays_tasks` | — | no | tasks source (TBD) |
| `call_contact` | `name:string` | yes | resolve→`tel:` |
| `send_message` | `name:string, body:string` | yes | resolve→native SMS |
| `unknown` | `reason:string` | no | "Sorry, I didn't catch that" |

Example: "Add expense 200 in Rapido, tag travel expense" →
`{ intent:'add_expense', args:{ amountMinor:20000, merchant:'Rapido', category:'travel' }, speech:'Add ₹200 at Rapido under Travel?', needsConfirm:true }`.
Category string is fuzzy-matched against `GET /finance/categories`; if no match, ask or create.

---

## 4. Tech choices & new dependencies

| Need | Library | Why |
|---|---|---|
| On-device STT | `@react-native-voice/voice` | Free, offline, live partial text, Android SpeechRecognizer |
| On-device TTS | `react-native-tts` | Free, offline greet + read-back |
| Audio record (Whisper fallback) | `react-native-audio-recorder-player` | Only if on-device STT proves weak |
| Animation | `react-native-reanimated` (pulsing rings) or `lottie-react-native` (match design PNG) | Listening overlay |

Prefer on-device STT/TTS → only the small **text** intent call hits the network.
Groq Whisper stays as an accuracy fallback (audio already flows to it for recaps).

---

## 5. Permissions (Android)

Add to `android/app/src/main/AndroidManifest.xml`:
- `RECORD_AUDIO` — mic capture (required)
- `CALL_PHONE` — direct dial (only if we skip the dialer hand-off)
- `READ_CONTACTS` — optional, only for resolving names beyond the call cache

Already present: `SEND_SMS`, `READ_PHONE_STATE`, `READ_CALL_LOG`. Request at runtime
via `PermissionsAndroid` following the existing `nativeSms.ts` / `nativeCalls.ts` pattern.

---

## 6. Phased delivery

### Phase 0 — Foundation & overlay shell (no AI)
**Goal:** prove capture + TTS + UI loop end-to-end with a hardcoded echo.
- Mobile: install `@react-native-voice/voice`, `react-native-tts`, animation lib.
- Add `RECORD_AUDIO` permission + runtime request.
- New `VoiceOverlay` component: full-screen modal, state machine
  (`idle→listening→thinking→speaking`), pulsing animation matching the design PNG.
- Wire the existing Home assistant-bar mic icon → open overlay.
- TTS greets; STT transcribes; show transcript on screen; TTS echoes it back.
- **Deliverable:** speak → see text → hear it repeated. No backend.
- **Accept:** mic tap opens animated overlay, greeting plays, words transcribe.

### Phase 1 — Backend intent service (read-only intents)
**Goal:** text in → structured command out, safe intents only.
- Backend: new `AssistantModule` — `POST /api/v1/assistant/interpret`.
- `assistant.service.ts`: Groq Llama tool-calling (reuse `summary.service` client
  pattern + JSON mode), tool defs from §3.
- Implement executors for `todays_analytics` (read `stats` + `digest`) and
  `todays_tasks` (interim source — see §9). Return `speech` text.
- Mobile: `assistant.api.ts` + `useAssistant` hook; overlay sends transcript,
  speaks back `speech`.
- **Deliverable:** "what's today's analytics" → spoken summary of calls/spend.
- **Accept:** both read intents answer correctly; `unknown` handled gracefully.

### Phase 2 — Add expense (first write, with confirm)
**Goal:** voice-driven write behind a confirm gate.
- Backend: `add_expense` executor — parse amount→minor, fuzzy-match category
  against `GET /finance/categories`, build `ManualTxnInput`.
- Mobile: confirm UI in overlay ("Add ₹200 at Rapido under Travel?") → Yes runs
  `addManualTxn`; reuse offline pending-txn path so it works offline.
- **Deliverable:** "add expense 200 rapido tag travel" → confirm → txn created,
  Spent Today updates.
- **Accept:** amount/merchant/category parsed; confirm required; offline-safe.

### Phase 3 — Device actions: call & message
**Goal:** `call_contact` + `send_message` with resolution + confirm.
- Mobile: contact resolver — fuzzy match name against `state.calls.items`
  (`contactName`); on ambiguity, ask to pick. (Optional `READ_CONTACTS` for wider book.)
- `call_contact`: `Linking('tel:<number>')` (dialer hand-off, built-in confirm).
  Optional later: native `CALL_PHONE` direct dial.
- `send_message`: add native `sendSms(number, body)` ReactMethod (mirror AutoReply's
  `SmsManager` usage) OR `Linking('sms:<number>?body=…')` composer hand-off.
  Always show body + recipient confirm first.
- **Deliverable:** "call John" dials; "message Sam saying I'm not coming today" sends.
- **Accept:** correct contact resolved or disambiguated; nothing fires without confirm.

### Phase 4 — Polish & robustness
- Silence detection / auto-stop listening; barge-in (tap to interrupt TTS).
- Streaming partial transcript in the overlay.
- Error/timeout states, no-network fallback (Whisper path), retry.
- Lottie animation parity with the design; haptics.
- Analytics/telemetry on intent success rate.

### Phase 5 — (optional) Tasks backend
If "today's tasks" becomes a real feature: new `TasksModule` (Prisma model, CRUD,
`GET /tasks?today`), then point `todays_tasks` + `add_task` intents at it.

---

## 7. New / changed files (checklist)

**Backend**
- `apps/backend/src/assistant/assistant.module.ts` (new)
- `apps/backend/src/assistant/assistant.controller.ts` (new) — `POST /interpret`
- `apps/backend/src/assistant/assistant.service.ts` (new) — Groq tool-calling
- `apps/backend/src/app.module.ts` — register module
- reuse `recap/summary.service.ts` client pattern, `recap/transcription.service.ts`

**Shared**
- `packages/shared/src/assistant.ts` (new) — `AssistantCommand`, intent/arg types
- `packages/shared/src/index.ts` — export

**Mobile**
- `apps/mobile/src/services/api/assistant.api.ts` (new)
- `apps/mobile/src/hooks/useAssistant.ts` (new)
- `apps/mobile/src/services/voice/nativeVoice.ts` (new) — STT/TTS wrappers + perms
- `apps/mobile/src/services/sms/nativeSms.ts` — add `sendSms` (Phase 3)
- `apps/mobile/src/components/feature/VoiceOverlay.tsx` (new)
- `apps/mobile/src/screens/HomeScreen.tsx` — wire mic → overlay
- `apps/mobile/android/app/src/main/AndroidManifest.xml` — `RECORD_AUDIO` (+`CALL_PHONE`)
- native SMS-send ReactMethod in `com/yesboss/...` (Phase 3, if direct send)

---

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Wrong contact ("which John?") | Resolve from call cache; disambiguate by asking; confirm before dial/send |
| Accidental spend / message | Mandatory confirm gate on all write/device intents |
| STT mis-hears amounts | Echo parsed values in the confirm prompt; user cancels |
| LLM returns bad JSON | Already-proven `parseRecap` fallback pattern; `unknown` intent |
| On-device STT accuracy (noise/accents) | Groq Whisper server fallback |
| Permissions denied | Graceful degrade; explain why, link to settings |
| Latency feels slow | On-device STT/TTS; Groq is fast; stream partials |

---

## 9. Open questions (need answers before/at Phase 1)
1. **"Today's tasks"** — is there a real to-do/task concept, or should it mean
   today's calls + bills due + agenda assembled from existing data? (Drives whether
   Phase 5 is needed.)
2. Calls: **dialer hand-off** (`tel:`, safer, one extra tap) vs **direct dial**
   (`CALL_PHONE`, smoother, riskier)? Recommend hand-off first.
3. SMS: **direct send** (native `SmsManager`, instant) vs **composer hand-off**
   (`sms:`, user taps send)? Recommend native send + in-app confirm.
4. Language: English only, or Hindi/Hinglish too? (Affects STT locale + prompts.)
5. Animation: build with Reanimated, or do you have a Lottie JSON for the design?

---

## 10. Recommendation
Start **Phase 0 + 1** — they carry all the risk-free proving work (capture, TTS,
overlay, intent parsing, two read-only answers) and need no native call/SMS code.
Ship that, validate accuracy + UX, then layer writes (P2) and device actions (P3).
Everything leans on Groq, which is already wired and paid for.
