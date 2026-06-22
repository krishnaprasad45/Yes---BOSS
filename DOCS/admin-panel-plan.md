# Admin Panel — Implementation Plan & Requirements

> **Status legend:** ⬜ Not started · 🟨 In progress · ✅ Done
> Update the **Status** and **Completion %** cells at the top of each phase as work lands.
> This is a **requirements + plan** doc. Implementation later. Sections marked **TBD (user to provide)** are intentionally blank until tech/structure decisions are given.

---

## 0. Conventions to be filled by user (TBD)

Fill these once; every phase below depends on them.

| Topic | Decision | Status |
|---|---|---|
| Admin frontend framework | TBD (user to provide) | ⬜ |
| UI component lib / styling | TBD (user to provide) | ⬜ |
| State / data fetching lib (admin) | TBD (user to provide) | ⬜ |
| API base path / versioning (e.g. `/api/v1`) | TBD (user to provide) | ⬜ |
| API response envelope (reuse existing `ok`/`paginated`?) | TBD (user to provide) | ⬜ |
| Admin app folder structure | TBD (user to provide) | ⬜ |
| Mobile folder conventions for new screens | TBD (user to provide) | ⬜ |
| Auth flow for admin (reuse `/auth/login`?) | TBD (user to provide) | ⬜ |
| Chart library | TBD (user to provide) | ⬜ |
| File upload lib (mobile) for screenshot/video | TBD (user to provide) | ⬜ |

---

## Overall progress

| Phase | Title | Status | % |
|---|---|---|---|
| 1 | Backend foundation: roles, blocking, plan/entitlement | ⬜ | 0% |
| 2 | Data models: BugReport, Coupon, PlatformSettings | ⬜ | 0% |
| 3 | Backend APIs: feedback, admin, coupon | ⬜ | 0% |
| 4 | Shared types | ⬜ | 0% |
| 5 | Mobile: Bugs & Suggestions + coupon redeem | ⬜ | 0% |
| 6 | Admin web app scaffold | ⬜ | 0% |
| 7 | Admin: User Management | ⬜ | 0% |
| 8 | Admin: Analytics dashboard | ⬜ | 0% |
| 9 | Admin: Bug & Suggestion triage | ⬜ | 0% |
| 10 | Admin: Platform / branding settings | ⬜ | 0% |
| 11 | Admin: Coupon management | ⬜ | 0% |
| 12 | Hardening: audit log, rate-limit, active-user tracking | ⬜ | 0% |

---

## Context

Yes Boss (NestJS + Prisma/Postgres backend, bare React Native app, `packages/shared` types) has **no admin surface**. Auth has **no roles**, no user blocking, no bug-report pipeline, no coupon/entitlement system, no platform settings. This plan adds an admin panel + a mobile bug-reporting tab.

**Reuse (already in codebase):**
- JWT auth + `JwtAuthGuard` — `apps/backend/src/auth/jwt-auth.guard.ts`
- `@CurrentUser()` — `apps/backend/src/common/current-user.decorator.ts`
- Response envelopes `ok` / `paginated` — `apps/backend/src/common/envelope.ts`
- S3 storage + `MediaAsset` upload flow — `apps/backend/src/storage/`, `apps/backend/src/media/`
- Prisma migrations framework — `apps/backend/prisma/migrations/`
- Shared types — `packages/shared/src/`

---

## Phase 1 — Backend foundation: roles, blocking, plan/entitlement

**Status:** ⬜ · **Completion:** 0%

### Requirements
- Role-based access (USER / ADMIN). No feature below is safe without it.
- Admin can block/unblock users; a block takes effect **immediately** (rejected at guard, not just hidden in UI).
- Per-user plan + entitlement so coupons can grant free/premium access with expiry.

### Tasks
- [ ] `schema.prisma`: add enum `Role { USER ADMIN }`, enum `Plan { FREE PREMIUM }`.
- [ ] Extend `User`: `role @default(USER)`, `isBlocked @default(false)`, `blockedAt?`, `blockReason?`, `plan @default(FREE)`, `accessUntil?`, `lastSeenAt?`.
- [ ] Migration `admin_panel_foundation`.
- [ ] `@Roles(...)` decorator + `RolesGuard` (Reflector-based) — `apps/backend/src/common/`.
- [ ] Add `role` + `isBlocked` to JWT payload (`auth.service.ts`) and attach in `JwtAuthGuard`.
- [ ] Guard rejects blocked users (401/403).
- [ ] Admin bootstrap: env-driven promotion (`ADMIN_EMAIL`) or seed script — no self-promote UI.

### Acceptance
- Admin token → admin route 200; user token → 403; blocked user → rejected.

---

## Phase 2 — Data models: BugReport, Coupon, PlatformSettings

**Status:** ⬜ · **Completion:** 0%

### Tasks
- [ ] `BugReport`: `id`, `userId`, `kind` (`BugKind { BUG SUGGESTION }`), `module String`, `description String`, `status` (`ReportStatus { OPEN IN_PROGRESS RESOLVED CLOSED }` default OPEN), `appVersion?`, `platform?`, `createdAt`, `updatedAt`. Index `status`, `module`, `createdAt`.
- [ ] `BugAttachment`: `id`, `reportId` (cascade), `type` (photo|video), `storageKey`, `sizeBytes`, `createdAt`.
- [ ] `CouponCode`: `id`, `code @unique`, `grantsPlan @default(PREMIUM)`, `durationDays?`, `maxRedemptions?`, `redeemedCount @default(0)`, `expiresAt?`, `isActive @default(true)`, `createdAt`.
- [ ] `CouponRedemption`: `id`, `couponId`, `userId`, `redeemedAt`. Unique `(couponId, userId)`.
- [ ] `PlatformSettings` (single row): `id`, `logoUrl?`, `footerText?`, `supportEmail?`, `minAppVersion?`, `updatedAt`. Seed one row.
- [ ] Migration.

### Acceptance
- `prisma migrate dev` clean; `prisma studio` shows all tables; settings row seeded.

---

## Phase 3 — Backend APIs: feedback, admin, coupon

**Status:** ⬜ · **Completion:** 0%
**API path/envelope conventions:** TBD (user to provide) — endpoints below are functional intent, exact paths/shapes finalized after section 0.

### feedback module (`apps/backend/src/feedback/`)
- [ ] `POST /feedback` (auth) — create bug/suggestion + multipart screenshot/video via `FileInterceptor` + `StorageService` (size cap like `call.controller.ts`).
- [ ] `GET /feedback` (admin) — paginated; filter `status`, `module`, `kind`.
- [ ] `PATCH /feedback/:id` (admin) — update `status`.
- [ ] `GET /feedback/modules` — returns feature/module list (from shared constant, Phase 4).

### admin module (`apps/backend/src/admin/`, admin-only)
- [ ] `GET /admin/users` — paginated, search email/name; plan/blocked/lastSeenAt.
- [ ] `GET /admin/users/:id` — detail + per-user analytics (call count, txn count, last seen).
- [ ] `PATCH /admin/users/:id/block` · `PATCH /admin/users/:id/unblock`.
- [ ] `GET /admin/analytics` — totals (users, active-7d, blocked), most-used features (row counts), bug counts by module/status, coupon redemptions.
- [ ] `GET /admin/settings` · `PATCH /admin/settings` (logo upload via storage, footer, support email, minAppVersion).
- [ ] `GET /admin/coupons` · `POST /admin/coupons` · `PATCH /admin/coupons/:id` · `GET /admin/coupons/:id/redemptions`.

### coupon redeem (user-facing)
- [ ] `POST /coupons/redeem { code }` (auth) — validate active + not expired + under maxRedemptions + not already redeemed → set user `plan`, `accessUntil`, increment count, create redemption.

- [ ] Register modules in `app.module.ts`; numbered Swagger tags.

### Acceptance
- Swagger lists endpoints; role checks enforced; upload lands in storage; redeem flips plan and blocks double-redeem.

---

## Phase 4 — Shared types (`packages/shared/src/`)

**Status:** ⬜ · **Completion:** 0%

### Tasks
- [ ] `feedback.ts` — `BugReport`, `BugKind`, `ReportStatus`, and `FEATURE_MODULES` constant (single source for dropdown): `Calls`, `Spending / Finance`, `SMS Transactions`, `Auto-Reply`, `Recap`, `Location`, `Media / Gallery`, `Settings`, `Login / Auth`, `Other`.
- [ ] `admin.ts` — `AdminUserRow`, `AnalyticsSummary`, `PlatformSettings`, `Coupon`, `Plan`, `Role`.
- [ ] Re-export from `index.ts`.

---

## Phase 5 — Mobile: Bugs & Suggestions + coupon redeem

**Status:** ⬜ · **Completion:** 0%
**Mobile folder/upload conventions:** TBD (user to provide).

### Requirements (per user spec)
- Section "Bugs & Suggestions" with inputs:
  - Add screenshot / video.
  - Bug section dropdown — all features/modules + "Other".
  - Description text input.

### Tasks
- [ ] `FeedbackScreen.tsx`, entry row from `SettingsScreen.tsx` (keep off bottom tab bar).
- [ ] Form: Kind toggle (Bug/Suggestion), Module dropdown from `FEATURE_MODULES`, Description multiline, optional attachment with preview. Auto-attach `appVersion` + `platform`.
- [ ] `feedback.api.ts` (multipart via existing `client.ts`) + `useFeedback` hook (React Query pattern like `useFinance.ts`).
- [ ] Settings: "Redeem coupon" input → `POST /coupons/redeem`.

---

## Phase 6 — Admin web app scaffold

**Status:** ⬜ · **Completion:** 0%
**Framework / folder structure / styling / state lib:** TBD (user to provide) — scaffold once provided.

### Tasks
- [ ] Create `apps/admin` workspace; wire into monorepo; consume `@yes-boss/shared`.
- [ ] Auth: login (reuse backend), JWT storage, client route guard (server enforces via `RolesGuard`); non-admin login → clear error.
- [ ] App shell / nav / theme tokens.
- [ ] Typed API layer (structure per section 0).

---

## Phase 7 — Admin: User Management

**Status:** ⬜ · **Completion:** 0%

- [ ] Users table: search, pagination, plan/blocked/lastSeen columns.
- [ ] Block / Unblock actions.
- [ ] User detail: info + per-user analytics.

---

## Phase 8 — Admin: Analytics dashboard

**Status:** ⬜ · **Completion:** 0%

- [ ] Totals: total users, active (7d), blocked.
- [ ] Most-used features.
- [ ] Bug reporting breakdown by feature/module + status.
- [ ] Coupon redemption stats.
- [ ] Charts (lib TBD).

---

## Phase 9 — Admin: Bug & Suggestion triage

**Status:** ⬜ · **Completion:** 0%

- [ ] Table filtered by status / module / kind.
- [ ] View attachments (signed URLs).
- [ ] Change status (OPEN→IN_PROGRESS→RESOLVED→CLOSED).

---

## Phase 10 — Admin: Platform / branding settings

**Status:** ⬜ · **Completion:** 0%

- [ ] Logo upload, footer text, support email, minAppVersion.
- [ ] Persist via `PATCH /admin/settings`.

---

## Phase 11 — Admin: Coupon management

**Status:** ⬜ · **Completion:** 0%

- [ ] List coupons; create (code, grantsPlan, durationDays, maxRedemptions, expiresAt).
- [ ] Activate / deactivate.
- [ ] View redemptions per coupon.

---

## Phase 12 — Hardening (recommended additions beyond original ask)

**Status:** ⬜ · **Completion:** 0%

- [ ] **AuditLog** model — `actorId`, `action`, `targetType`, `targetId`, `meta?`, `createdAt`; record block/unblock, coupon create, settings change.
- [ ] **Rate-limit** feedback + coupon-redeem endpoints (anti-spam).
- [ ] **Active-user tracking** — bump `User.lastSeenAt` via lightweight middleware on authenticated requests.
- [ ] **`minAppVersion` enforcement** hook (pairs with future OTA).

---

## Features you may have missed (review before sign-off)
- Roles/authorization (prerequisite — added as Phase 1).
- Immediate block enforcement (session-level, not UI-only).
- Bug status workflow so triage is real, not a dump.
- Audit log for admin accountability.
- Rate limiting on user-submittable endpoints.
- One-coupon-per-user + expiry + max redemptions guardrails.
- Real "active users" metric via `lastSeenAt`.

---

## Verification (per phase, fill as completed)
- Backend: `prisma migrate dev` clean; Swagger shows endpoints; role/block matrix (admin 200 / user 403 / blocked rejected); feedback upload round-trip; coupon redeem flips plan + blocks double-redeem.
- Mobile: Metro Fast Refresh → Settings → Bugs & Suggestions submit with screenshot → appears in admin.
- Admin: each page exercised against running backend.

---

## Out of scope (tracked elsewhere)
- **OTA / instant UI without rebuild** — direction chosen: `expo-updates` self-hosted on existing S3 (bare RN 0.86 via `npx install-expo-modules`). Dev color/UI edits already hot-reload via Metro Fast Refresh; rebuild only for native changes. Separate plan.
