# Yes Boss — Personal Assistant App · Project Plan

> A personal assistant Android app that backs up call recordings to a private
> database with real caller names, auto-replies to missed calls, and turns SMS
> messages into spending/financial analytics.

- **Platform:** Cross-platform (iOS + Android). **Android first**, iOS later.
- **Distribution:** Sideloaded APK on Android (avoids Play Store restrictions on call-recording / SMS apps). iOS via personal provisioning / TestFlight.
- **Repo model:** Monorepo (mobile + backend + shared types).

### ⚠️ Platform capability split (critical)

iOS is far more locked down than Android. The capture-heavy features are
**Android-only**; iOS acts mainly as a **view/dashboard client** over the shared
backend.

| Capability | Android | iOS |
|---|---|---|
| Call recording (folder-sync) | ✅ | ❌ no API / no folder access |
| Read call log | ✅ | ❌ no API |
| Read SMS (Feature 2 analytics) | ✅ | ❌ no API |
| Send SMS programmatically (auto-reply / recap) | ✅ | ❌ composer needs user tap |
| Post-call recap engine | ✅ | ❌ (depends on above) |
| View dashboards / synced data | ✅ | ✅ |
| Photo/video backup | ✅ | ✅ |
| Location / KM traveled | ✅ | ✅ |

**Implication:** core capture runs on the Android device; the backend stores
everything; iOS reads/views it. Plan all capture features Android-first, iOS as a
read client.

---

## 1. Goals

1. Auto-backup call recordings to a private (off-device) database, tagged with the **actual caller name** and **date**.
2. Auto-reply to unanswered calls with a custom SMS ("My boss is busy right now, I will inform him to call back when he is free").
3. Read device SMS and produce financial analytics: total spent, total credited, due-payment alerts, spam categorization.
4. Track personal stats over time (usage, travel, spending patterns) — later phases.

---

## 2. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Mobile | **React Native (bare workflow)** — iOS + Android | Need native modules for CallLog, FileObserver, SMS. Managed Expo can't do this. Bare RN ships both platforms from one codebase. |
| Language | TypeScript | Shared types with backend. |
| Backend | **NestJS** (or Express) | Structured REST API. |
| Database | **PostgreSQL + Prisma** | Relational data (calls, transactions, contacts). |
| File storage | **MinIO** (self-host) or **Backblaze B2** | Cheap audio blob storage; DB holds metadata + URL. |
| Speech-to-text | **Whisper** (self-host or API) | Transcribe call recordings for recap + searchable transcripts. |
| Summarization | **LLM** (Claude) | Generate "matter of the call" recap from transcript. |
| Shared | TypeScript types package | One source of truth for API contracts. |
| Monorepo tool | **Yarn workspaces** | Least friction with React Native Metro bundler. |

---

## 3. Monorepo Structure

```
yes-boss/
├─ apps/
│  ├─ mobile/          # React Native (Android)
│  └─ backend/         # NestJS API
├─ packages/
│  └─ shared/          # shared TS types: Call, SmsTxn, ApiContract
├─ package.json        # workspace root
├─ tsconfig.base.json
├─ Project_Plan.md
└─ project_rules.md
```

- Metro `watchFolders` must include `packages/shared`.
- yarn workspaces chosen over pnpm/Nx — best RN compatibility, lowest overhead for a solo project.

---

## 4. Core Features

### Feature 1 — Call recording backup + missed-call auto-reply

**Key constraint:** Android 10+ blocks third-party apps from recording call audio directly. App does **NOT** record calls. Instead it syncs the recordings made by Samsung's built-in recorder.

**Recording sync flow:**
1. `FileObserver` (native module) watches Samsung recordings folder
   (`/storage/emulated/0/Recordings/Call/` — path varies by model/One UI version).
2. On new file → read its create-time.
3. Query `CallLog.Calls` → find the call ending near that timestamp.
4. Pull `CACHED_NAME` / match `NUMBER` → resolve contact name.
5. Upload audio file + metadata (name, number, date, duration, direction) to backend.

**Dashboard:** total calls made, total calls received (from `CallLog.Calls`).

**Missed-call auto-reply flow (Android only):**
1. Detect call state via `TelephonyCallback` / `PhoneStateListener` (`READ_PHONE_STATE`).
2. On missed/unanswered incoming call → send SMS via `SEND_SMS`.
3. Custom configurable message. Respect 100 free SMS/day limit.

Default auto-reply message:

> My boss is busy right now, I will inform him to call back when he is free
> — AI Assistant

**Post-call recap (Android only):**

After a completed call **with a saved contact**, generate a recap:
1. Recording uploaded → backend **speech-to-text** (Whisper) → transcript.
2. Transcript → **LLM summary** ("the matter of the call").
3. Compose recap: contact name + call duration + summary.
4. Deliver recap.

**Recap recipient — configurable, two modes:**
- **(A) Self-recap (default):** recap goes to the boss only — a private,
  searchable call log / "minutes". No third-party consent issue. **Recommended default.**
- **(B) Recap to contact (opt-in, off by default):** sends the other party a
  summary of the call. Privacy-sensitive; only enable deliberately.

**Delivery channel for recap:** prefer **WhatsApp or email** over SMS — no
160-char limit, no SMS-credit cost, richer formatting. SMS only as fallback.

**Permissions:** `READ_CALL_LOG`, `READ_CONTACTS`, `READ_PHONE_STATE`, `SEND_SMS`, `READ_EXTERNAL_STORAGE` / `MANAGE_EXTERNAL_STORAGE`.

**Legal note:** Confirm local call-recording + storage consent laws before relying on this in production.

### Feature 2 — SMS financial analytics

**Build this FIRST** — fully doable, fast win, proves the upload pipeline.

1. `READ_SMS` permission → read inbox.
2. Per-bank template parsers (regex) → extract amount, debit/credit, merchant, date.
3. Categorize: spending, credit, payment-due, spam.
4. Analytics: total spent, total credited, spend-by-category, due reminders.

**Reality:** SMS formats differ per bank. Start with top 5 banks/UPI templates, expand. Rule-based first, ML later.

---

## 5. Upcoming Features

| Feature | Difficulty | Notes |
|---|---|---|
| Photo/video backup after capture | Easy | `FileObserver` on DCIM → upload. |
| Global file search | Medium | Index filenames + metadata in DB. |
| KM traveled today | Medium | Fused Location + Activity Recognition. Battery cost. |
| Peak mobile usage time | Easy | `UsageStatsManager`. |
| Peak payment spending time | Free | Derived from Feature 2 SMS data. |

### Suggested add-ons

- **Daily digest** — nightly notification/email: calls in/out, money in/out, top spend category, KM traveled. Ties everything together.
- **Bill due reminders** — from SMS parsing, remind before due date.
- **Searchable call transcripts** — run uploaded audio through speech-to-text (Whisper), search calls by content. Big differentiator.
- **Subscription detector** — find recurring debits in SMS → list active subscriptions.
- **Smart contact insight** — "you haven't called X in N days."

---

## 6. Phased Roadmap

**Overall progress: ~26%** (1 of 7 phases complete, Phase 1 ~85%)

| Phase | Status | % |
|---|---|---|
| Phase 0 — Scaffold | ✅ Complete | 100% |
| Phase 1 — SMS analytics | 🟡 In progress | 85% |
| Phase 2 — Call backup | ⬜ Not started | 0% |
| Phase 3 — Missed-call auto-reply | ⬜ Not started | 0% |
| Phase 4 — Post-call recap | ⬜ Not started | 0% |
| Phase 5 — Analytics & stats | ⬜ Not started | 0% |
| Phase 6 — iOS client | ⬜ Not started | 0% |
| Phase 7 — Upcoming features | ⬜ Not started | 0% |

### Phase 0 — Scaffold ✅ 100%
- [x] Monorepo (yarn workspaces), folder structure, shared types package.
- [x] Backend skeleton (NestJS + Prisma + Postgres), auth lock on API
      (JWT + refresh-token rotation). Backend runs on **:4000**.
- [x] File storage (MinIO/B2) wired (MinIO container running; upload wiring
      lands in Phase 2).
- [x] Bare RN app shell + navigation (React Query, Keychain tokens, auth gate,
      login + dashboard screens).
- [x] **Verified on real device** (Samsung SM-G885F): login → JWT → dashboard
      shows API ✓ DB ✓.

> Device build notes (learned the hard way): RN 0.86 forces New Architecture;
> use a **release build** (`installRelease`, embedded JS bundle) for the device —
> the dev/Metro path was unreliable here. Release needs the cleartext
> network-security config for the localhost backend. Build needs JDK 17 +
> Android SDK (installed).

### Phase 1 — SMS analytics (Feature 2) 🟡 85%
- [x] Backend SMS module: sync (idempotent dedupe), list (paginated +
      filters), summary (totals + category breakdown + due count). Committed.
- [x] On-device SMS parsing pipeline (`services/smsParsers/`) +
      djb2 dedupe key shared with the backend.
- [x] Mobile UI: Spending screen (summary cards, type filters, infinite
      scroll, pull-to-refresh), bottom-tab nav.
- [x] Native Android SMS-read module (Kotlin: `READ_SMS` + inbox query) with
      JS bridge, runtime-permission flow, and a "Sync SMS" action.
- [ ] **Device verify**: build/install release, grant READ_SMS, scan inbox,
      confirm real transactions land in the Spending screen.
- Proves the full pipeline: device → backend → DB → dashboard.

### Phase 2 — Call backup (Feature 1) ⬜ 0%
- FileObserver folder-sync, call-log matching, contact name resolution, upload.
- Calls made/received dashboard.

### Phase 3 — Missed-call auto-reply (Android) ⬜ 0%
- Call-state detection + configurable auto-SMS (default message with `— AI Assistant` signature).

### Phase 4 — Post-call recap (Android) ⬜ 0%
- Whisper transcription + LLM summary pipeline on backend.
- Self-recap delivery (default); opt-in recap-to-contact.
- WhatsApp/email delivery channel.

### Phase 5 — Analytics & stats ⬜ 0%
- Usage time, spending patterns, daily digest.

### Phase 6 — iOS client ⬜ 0%
- Build iOS as a view/dashboard client over the shared backend.
- iOS-capable capture only: photo/video backup, location/KM.

### Phase 7 — Upcoming features ⬜ 0%
- File search, KM traveled, peak usage, subscription detector, etc.

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| Live call recording blocked on Android 10+ | Use Samsung's recordings via folder-sync (not live record). |
| Samsung recordings folder path varies | Make path configurable + auto-detect candidates. |
| Per-bank SMS format drift | Template-based parsers, easy to add new ones. |
| Auto-SMS flagged as spam by carrier | Keep volume low, within free limit. |
| Private recordings exposed | Lock API with auth even though single-user. |
| Legal / consent on recording storage | Confirm local law before production use. |
| iOS can't do capture features | iOS is view-only client; capture stays on Android. Set expectation early. |
| Recap-to-contact privacy/consent | Off by default; self-recap is the default mode. |
| Transcription cost/accuracy | Self-host Whisper to cut cost; accept lower accuracy on noisy audio. |
