# TODO: alignment with latest DOCX report

Source report:
`/tmp/codex-remote-attachments/019e3c03-7ea9-7c22-9976-f822a7e2b728/34A733E3-2316-4AE1-9338-DD0D4844D7B1/1-Отчет_обновленный.docx`

Status: approved and partially implemented. Remaining backlog is limited to real providers/ops evidence.

Frontend QA addendum:

- [x] Browser-tested public catalog, mentor profile, booking, checkout, mock acquiring, mentor approval, sessions, subscriptions, trust complaints, admin trust, and mobile smoke.
- [x] Added `product/frontend-gap.md` with UI/report discrepancies and Playwright screenshot evidence.
- [x] Fixed admin trust REST prefix issue (`/api/admin/trust/*`) by applying global API prefix to Nest controllers while keeping AdminJS on `/admin`.
- [x] Fixed Docker readiness Redis check to prefer `REDIS_URL`.
- [x] Localized session detail status labels.
- [x] Added responsive grids for trust/admin trust pages.

## 0. Decisions to confirm first

- [x] Choose the documentation stance:
  - Selected: current implementation is the source of truth; product docs explain gaps from the report.
- [x] Decide architecture wording:
  - Report says "microservice architecture".
  - Current code is a NestJS modular monolith with SvelteKit web, PostgreSQL, Redis, AdminJS, Socket.IO.
- [x] Decide booking domain model:
  - Report uses an explicit "application/request" concept.
  - Current code uses `sessions.status = requested` as the request.
- [x] Decide file storage target:
  - Selected as-is target: local `FileStorageService` adapter.
  - Data URLs are written to `UPLOADS_DIR`/`./uploads`; DB stores `/uploads/*` URLs.
  - MinIO/S3 remains a future production storage swap.

## 1. High-confidence mismatches

- [x] Update `product/requirements-gap.md`: the previous version was based on an older report and is now stale.
  - It says subscriptions are absent, but the repo has `mentorship_plans`, `mentorship_subscriptions`, tasks, bookmarks, and credits.
  - It previously treated US13 payout as absent; payout is now delayed and gated by complaints.
  - It does not reflect the latest DOCX wording around applications, subscriptions, NFRs, and business requirements.

- [x] Update `product/usm.txt` from the latest report.
  - Keep US1-US16 as MVP baseline.
  - Add explicit notes for UC8 subscription request, UC10 cancel/reschedule, UC13 mentor request review, UC16 payout method setup, UC17 payment receipt.
  - Mark report-only/post-MVP details separately where the code does not implement them.

- [x] Reconcile ER diagrams with Prisma.
  - Report ER uses `Integer` IDs and simpler tables.
  - Current Prisma uses UUIDs, timestamptz, enums, `username`, email verification, lockout fields, `user_agreements`, chat attachments, complaint attachments, user blocks, platform withdrawals, subscriptions, tasks, bookmarks, and credits.
  - `product/er-user-panel.puml` and `product/er-admin-panel.puml` should explicitly state they are "as-is implementation ER", not a literal copy of the report tables.

- [x] Reconcile C4 and architecture docs.
  - Report wording: microservice architecture.
  - Current implementation: modular monolith.
  - `CLAUDE.md`, `PROJECT_AS_IS.md`, and C4 diagrams should consistently say whether diagrams are implementation as-is or target/course architecture.

- [x] Reconcile booking/payment flow.
  - Report flow: create request/application, payment, mentor confirms or rejects, rejection triggers refund/cancel.
  - Current flow: `POST /booking/hold` creates `Session requested`; payment success sets `paid`; mentor confirm/reject endpoints finalize to `booked` or `canceled/refunded`.

- [x] Reconcile subscription flow.
  - Report flow: mentee submits a subscription request with goal/motivation, mentor reviews it.
  - Current flow: `POST /subscriptions` creates `pending`; mentor/admin approves to `active` or rejects.

- [x] Reconcile payout flow.
  - Report: after completed session, if no support complaints, payout starts after 5 working days.
  - Current code: `completeSession` creates delayed pending payout with `availableAt`, complaint gate, and session idempotency.

- [x] Reconcile video flow.
  - Report: video is essentially a link in chat to an external VKS service.
  - Current code: `video_rooms` with provider `daily` placeholder and `GET /sessions/:id/video`.
  - Decide whether product docs should describe "platform-generated room" or "mentor-provided external link".

- [x] Reconcile notifications.
  - Report/NFR16: push to phone + email.
  - Current code: in-app notifications + direct SMTP email; push settings exist, delivery is not implemented; queue stats report `direct-smtp`.
  - Product docs mark push and production-grade queues as remaining gaps.

- [x] Reconcile admin/trust wording.
  - Report often says admin works through a "third-party DB/platform".
  - Current code has first-party `/admin/trust`, AdminJS, Prisma tables, audit logs, blocks, complaint messages, regalia review.
  - Decide whether to keep first-party admin as implementation or adjust docs to the report's "manual DB" framing.

- [x] Reconcile NFRs.
  - Report NFRs include 50k concurrent users, 99.9% availability, RTO/RPO, DWH `bdm.histrical_data`, retention 6 months, URL format, and 24h response SLA.
  - Current repo does not contain load tests, retention jobs, DWH export, or SLO/SLA operational controls.
  - These should be documented as non-implemented NFRs unless explicitly scoped for implementation.

## 2. Proposed documentation changes after approval

- [x] `CLAUDE.md`
  - Add a short "Report alignment" section.
  - State that `apps/api/prisma/schema.prisma` and code are implementation truth.
  - Link to `product/requirements-gap.md` as the report-vs-code matrix.
  - Clarify known design decisions: modular monolith, session-as-request, mock acquirer/payout, current upload strategy.

- [x] `product/README.md`
  - Add source hierarchy:
    1. Prisma/code for as-is.
    2. Latest DOCX report for target/course requirements.
    3. Gap matrix for differences.
  - Mark diagrams as "as-is implementation diagrams" unless we choose target diagrams.

- [x] `product/requirements-gap.md`
  - Rewrite against the latest DOCX report.
  - Separate categories: implemented, partially implemented, report-only, stale report mismatch.
  - Fix stale claims around subscriptions and auto-payout.

- [x] `product/usm.txt`
  - Refresh wording from the latest report.
  - Add explicit report scenarios UC1-UC20.
  - Preserve code-status notes so future implementation tasks are traceable.

- [x] `product/er-user-panel.puml` and `product/er-admin-panel.puml`
  - Keep UUID/timestamptz/current Prisma fields.
  - Add comments that report tables are simplified logical tables and not the physical implementation.

- [x] `product/с4_and_sequence/*`
  - Document local `FileStorageService` as as-is and MinIO/S3 as future production storage.
  - Update booking/payment sequence to show the agreed request/payment/mentor-confirm state machine.

- [x] `.codex/`
  - Keep this TODO as the coordination artifact.
  - Do not edit `.codex/environments/environment.toml` because it is autogenerated.

## 3. Proposed implementation backlog after docs are aligned

- [x] Booking requests
  - Session-as-request kept; no separate `applications` table.
  - Added `requestGoal`/`requestMotivation`.
  - Added mentor `PATCH /sessions/:id/confirm|reject`.
  - Payment success sets `paid` as "waiting for mentor"; mentor confirm sets `booked`; reject cancels/refunds in mock flow.

- [x] Subscription requests
  - Extended `MentorshipSubscriptionStatus` with `pending` and `rejected`.
  - New subscription requests start `pending` with goal/motivation.
  - Mentor/admin can approve/reject; workspace opens only for active/paused.
  - Remaining gap: subscription payment behavior.

- [x] Payout safety
  - Added 5-business-day `availableAt`.
  - Active complaints block payout creation/processing.
  - `Payout.sessionId` unique prevents duplicate auto payouts.
  - Remaining gap: real provider/scheduled worker.

- [x] Upload storage
  - Added local `FileStorageService`.
  - Wired trust complaints, mentor regalia, and chat attachments.
  - Express serves `/uploads/*`.

- [x] Notifications
  - Queue stats no longer pretend BullMQ; endpoint reports `direct-smtp` runtime counters.
  - Push remains post-MVP/target-only.

- [x] NFR evidence
  - Added `product/nfr-evidence.md`.
  - Load/stress, retention, DWH, RTO/RPO and support SLA remain target-only without evidence.

## 4. Frontend backlog from browser QA

- [ ] Add subscription payment checkout before/around mentor approval.
- [ ] Add cancel/reschedule UI for paid sessions.
- [ ] Add mentor reject reason/comment fields for session and subscription requests.
- [ ] Replace technical admin moderation form with object-specific queues for profiles/reviews/messages.
- [ ] Add notification center/settings UI; keep push visibly disabled until delivery exists.
- [ ] Add admin UI for payout ready-processing and payout failure review.
