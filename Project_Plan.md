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

**Overall progress: ~92%** (Phases 1, 2, 3, 5, 7 device-verified with real data — incl. live missed-call auto-reply, 514-call backup, and on-device GPS distance tracking; UI restyled to Stitch & verified on device; Phase 4 needs API keys; Phase 6 iOS needs macOS)

| Phase | Status | % |
|---|---|---|
| Phase 0 — Scaffold | ✅ Complete | 100% |
| Phase 1 — SMS analytics | ✅ Device-verified | 100% |
| Phase 2 — Call backup | ✅ Device-verified | 100% |
| Phase 3 — Missed-call auto-reply | ✅ Device-verified (SMS sent on real miss) | 100% |
| Phase 4 — Post-call recap | 🟡 Wiring done; needs API keys | 80% |
| Phase 5 — Analytics & stats | ✅ Device-verified (real data) | 100% |
| Phase 6 — iOS client | 🟠 Backend done; iOS UI needs macOS | 50% |
| Phase 7 — Upcoming features | ✅ Subs + peak + KM device-verified | 95% |
| UI — Google Stitch restyle | ✅ Built + device-verified | 100% |

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

### Phase 1 — SMS analytics (Feature 2) ✅ 100%
- [x] Backend SMS module: sync (idempotent dedupe), list (paginated +
      filters), summary (totals + category breakdown + due count). Committed.
- [x] On-device SMS parsing pipeline (`services/smsParsers/`) +
      djb2 dedupe key shared with the backend.
- [x] Mobile UI: Spending screen (summary cards, type filters, infinite
      scroll, pull-to-refresh), bottom-tab nav.
- [x] Native Android SMS-read module (Kotlin: `READ_SMS` + inbox query) with
      JS bridge, runtime-permission flow, and a "Sync SMS" action.
- [x] Backend SMS module verified end-to-end (sync/dedupe/list/summary).
- [x] **Device verified** (Samsung Android 10): granted READ_SMS, scanned inbox,
      real transactions landed in the Spending screen.
- Proves the full pipeline: device → backend → DB → dashboard.

### Phase 2 — Call backup (Feature 1) ✅ 100%
- [x] Backend StorageService (MinIO/S3): bucket auto-create, object put,
      short-lived presigned GET URLs.
- [x] Backend CallModule: log sync (dedupe by phone+time), multipart
      recording upload (upsert + attach object), paginated list with
      presigned recordingUrl. **Verified end-to-end via curl/node.**
- [x] Native Android modules (Kotlin): CallLogReader (uses CACHED_NAME so no
      contacts permission) + RecordingsReader (MediaStore audio in Call/
      Recordings folders, returns content:// uri for direct upload).
- [x] JS: nativeCalls bridge + permission flow, calls API, useCalls hooks,
      useCallBackup pipeline (read log → sync → match recordings by time →
      upload), CallCard + CallsScreen, "Calls" tab.
- [x] **Device verified** (Samsung Android 10): granted READ_CALL_LOG + audio,
      backed up **514 calls** + Samsung Call-folder recordings; recordings stored
      in MinIO and playable via the presigned URL. Fixed a version-aware audio
      permission (READ_MEDIA_AUDIO is API 33+; older Android needs
      READ_EXTERNAL_STORAGE) — call-log sync mandatory, recordings best-effort.

### Phase 3 — Missed-call auto-reply (Android) ✅ 100%
- [x] Backend AutoReplyConfig (enabled, message, signature, cooldown) +
      GET/PUT /settings/auto-reply. **Verified via node.**
- [x] Native AutoReplyReceiver (PHONE_STATE): ring→idle = missed, looks up the
      missed number from the call log, sends the auto-SMS via SmsManager with a
      per-number cooldown; config in SharedPreferences.
- [x] AutoReplyModule bridge (JS pushes server config to native) +
      SEND_SMS / READ_PHONE_STATE permission flow.
- [x] settings API + useAutoReply hook (mirrors server config to native) +
      SettingsScreen (toggle, message, signature, cooldown) + Settings tab.
- [x] **Device verified** (Samsung Android 10): enabled + armed, missed a real
      call from a second phone, caller received the auto-SMS. Fixed two Android-10
      bugs found on-device — receiver no longer relies on fragile static state
      across the RINGING→IDLE broadcasts (reads the newest MISSED call-log row on
      IDLE instead), and SmsManager uses `getDefault()` on API < 31 where
      `getSystemService(SmsManager)` returns null.

### Phase 4 — Post-call recap (Android) 🟡 80%
- [x] Backend RecapModule: pull recording from storage → Whisper transcription
      (ASR) → Claude summary (`claude-opus-4-8`) → persist transcript + summary
      on the Call. Idempotent (`?force=true` to redo). Both providers degrade
      gracefully when unconfigured.
- [x] GET /calls/recap/status, POST /calls/:id/recap. **Verified wiring**
      (status off, clean 400 without keys, 404, 401).
- [x] Mobile: recap API + hooks, Calls stack (list → CallDetail), detail screen
      shows summary/transcript + Generate/Regenerate recap (gated on provider
      status). Cards show 🎙/📝 badges.
- [ ] **Live verify**: set `ANTHROPIC_API_KEY` + `WHISPER_API_KEY`, run a real
      recording through transcription + summary end-to-end.
- [ ] Self-recap / recap-to-contact delivery via WhatsApp/email (deferred).

### Phase 5 — Analytics & stats 🟡 90%
- [x] Backend StatsModule: GET /stats/overview (call stats — counts by
      direction, total talk time, top contacts — + spending stats over a
      range) and GET /stats/digest (one-day rollup). **Verified via node.**
- [x] Mobile: stats API + useDashboard hooks; HomeScreen rebuilt as the real
      dashboard (today's digest + 30-day call & money stats + top contacts,
      pull-to-refresh).
- [ ] **Device verify**: confirm the dashboard renders live aggregates on the
      phone. (Daily digest day-boundary is UTC — revisit for IST if needed.)

### Phase 6 — iOS client 🟠 30% (blocked on macOS)
- [x] App is cross-platform RN; every Android-only native module
      (SMS reader, call-log/recordings, auto-reply) is guarded by
      `Platform.OS === 'android'`, so on iOS the app runs as a view/dashboard
      client over the shared backend — login, dashboard, spending list, calls
      list, settings all work; capture/sync actions degrade to "needs the
      Android app". This is exactly Phase 6's stated intent.
- [x] Backend for iOS-capable capture is built ahead of the UI:
      **MediaModule** (photo/video upload + list, dedupe, presigned URLs) and
      **LocationModule** (GPS point sync + haversine distance/KM). Verified.
- [ ] **Blocked**: building/running the iOS target needs macOS + Xcode (not
      available on this Windows box). The iOS-native capture modules
      (camera-roll/photo backup, CoreLocation GPS) + on-device UI need a Mac
      to build/verify.

### Phase 7 — Upcoming features 🟡 95%
- [x] Subscription detector: infers recurring subscriptions from debit SMS
      (merchant + median amount + cadence). Backend + dashboard. **Verified.**
- [x] Peak usage: call volume by hour of day; busiest hour on the dashboard.
      **Verified.**
- [x] KM traveled: backend haversine distance + "Distance (30d)" stat on the
      dashboard. **On-device GPS now wired** (@react-native-community/geolocation,
      foreground watchPosition, Settings toggle) and **device-verified** — real
      fix synced. Distance calc skips >5-min gaps so separate trips don't sum as
      a teleport (bug found on device).
- [ ] File search and other "nice to have" detectors — not yet built.

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
