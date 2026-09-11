# Wortnah 0.5.5 implementation plan

Date: 11 September 2026

## Outcome

Wortnah 0.5.5 will give Admin 1 and Admin 2 a simple 30-day message inbox, reliable priority email alerts, a more useful overview and privacy-safe improvement signals. Work proceeds in ten checkpoints and no later checkpoint is considered complete from code alone.

The approved visual direction is the interactive Admin overview and inbox mockup reviewed on 11 September: preserve the current white/navy Wortnah system, make navigation explicit, keep status labels compact and remove dashboard information that does not help the companion take action.

## Fixed product stages

### Stage 1 — 30-day message inbox

- Show messages from the active canonical Werner space, newest first by default.
- Do not import historical messages from older spaces. Do not delete old-space data without a separate verified cleanup decision.
- Each row shows selection, date, exact time, sender, message, German communication path, priority, read status and email status when applicable.
- Distinguish `Gespeichert`, `Gelesen von Admin 1/2`, `E-Mail gesendet`, `E-Mail fehlgeschlagen` and `Keine E-Mail – normale Priorität`.
- Provide text search plus newest/oldest, priority, unread and email-result filters.
- Provide individual and checkbox-based bulk deletion with confirmation and a server-confirmed result.
- A shared deletion removes the message from Werner, Admin 1 and Admin 2 and removes associated receipts and Wortnah delivery records. It cannot remove email already delivered to an external mailbox.
- Automatically purge message bodies, receipts and delivery records after 30 days. Display the retention rule in the inbox.

### Stage 2 — priority email alerts

- Normal-priority messages are saved but never emailed.
- Important and very-important messages are saved first and then sent to enabled recipients.
- Email failure never rolls back or hides a saved message.
- Admin 1 and Admin 2 can manage up to three consented recipients, enable/disable them, remove them, send a privacy-safe test and review recent delivery results.
- Sender credentials remain only in Supabase Edge Function secrets.
- The email contains a privacy-safe subject, Werner's message, immutable German navigation path, priority, timestamp, brief conversation guidance and the public Wortnah link.
- Very-important email copy opens with a stronger request to review promptly.
- One message/recipient pair can create at most one successful delivery. Failed delivery may be retried deliberately without accidental duplicates.
- A message row shows a compact overall email result; message details show recipient-level results with masked addresses.

### Stage 3 — actionable Admin overview

- Remove `KI-Kostenkontrolle` from the overview and stop loading its dashboard data. Preserve historical migrations rather than destructively rewriting migration history.
- Remove the static `Zugangsprofile` overview panel; profile access remains available through the existing authentication/settings system.
- Make all four summary cards keyboard- and pointer-actionable:
  - `Mitteilungen diese Woche` opens the inbox.
  - `Aktive Tage` opens the activity history for the last seven days.
  - `Wichtige Mitteilungen` opens the important-message filter.
  - `Fehlender Inhalt gemeldet` opens the matching activity filter and, when possible, the affected content branch.
- Show the three newest messages with compact read/email status and `Alle Mitteilungen öffnen`.
- Show the three newest privacy-safe activities with `Verlauf öffnen`.
- Retain a simple `Aktivität der letzten 7 Tage` chart with one consistent date range.
- Show improvement suggestions only when Stage 4 has sufficient evidence; otherwise show a clear insufficient-data state.

### Stage 4 — privacy-safe improvement insights

The purpose is content and reliability improvement, not personal monitoring or medical inference.

Track structured identifiers and outcomes for:

- Communication area, theme and phrase confirmation.
- Back navigation, repeat playback, `Etwas fehlt` reports and visible branch coverage.
- Configured search-path selections, successful final opening, cancellation/back and opening failure.
- Reviewed MP3, generated cached MP3, device-voice fallback and playback failure.
- Practice start, completion and repeat count without clinical scoring.
- Important-email attempted, sent, failed and retried counts.

Never place message text, complete free-form search text, PINs, access codes, recipient addresses, credentials, recordings or medical conclusions in analytics events or aggregates.

Initial recommendations are deterministic and explain their evidence. No AI service creates, analyses or publishes content in this release.

Recommendation types:

- Add content when a frequently used branch also has repeated `Etwas fehlt` reports or fewer visible items than Werner's selected field count.
- Repair a configured search path when it has at least five attempts and a material opening-failure rate.
- Review navigation labels when the same branch has repeated backtracking after at least five entries.
- Recognize useful new content when a recently added item is confirmed repeatedly.

Every recommendation shows its counts and provides `Bereich öffnen`; Admin decides whether to change content.

## Data retention and storage guardrails

- Message bodies, receipts and email-delivery records: 30 days.
- Detailed privacy-safe interaction events: 90 days.
- Anonymous daily aggregate counts: 12 months.
- Manually deleted messages disappear immediately from all Wortnah profiles and are purged through the protected cleanup path.
- Before adding tables, aggregates or scheduled jobs, measure current Supabase table/storage use and estimate the expected record volume.
- Store identifiers, timestamps and small numeric outcomes only; do not store blobs or repeat labels in event rows.
- If projected growth is disproportionate, shorten detailed-event retention or aggregate earlier. Do not silently extend any retention period beyond the approved limits.

## Ten implementation checkpoints

### 1. Freeze the requirement

- Save this plan and the release acceptance criteria in GitHub.
- Mark 0.5.5 as in progress in `docs/PROJECT_STATE.md`.
- Record the approved retention periods and visual reference.

Exit condition: the canonical project state links to this plan and the planning commit is pushed.

### 2. Audit production data and storage

- Verify the active canonical Werner space.
- Inventory current-space message counts and dates without exposing message bodies in logs.
- Measure relevant Supabase table sizes and recent event volume.
- Inspect current message, receipt, recipient and delivery schemas plus RLS policies.
- Export/reconstruct the active `send-message-email-alerts` function behavior without exposing secrets.
- Confirm the current function version, allowed origins, normal-priority behavior and delivery uniqueness.

Exit condition: repository documentation records the actual live schema/function/storage state and any discrepancy.

Result: complete on 11 September 2026. The read-only findings and next migration decisions are recorded in `docs/AUDIT-0.5.5-CHECKPOINT-2-2026-09-11.md`. No migration, recipient change, function deployment or email send occurred.

### 3. Reconcile database source

- Add one idempotent repository migration for missing recipient/delivery source, immutable German path snapshot, retention support, indexes, foreign keys and companion-only RLS.
- Define safe cascade behavior for message receipts and delivery rows.
- Define current-space-safe deletion and scheduled cleanup functions.

Exit condition: migration tests pass locally and the migration is reviewed before production application.

### 4. Build the message inbox

- Add compact responsive rows, selection, individual/bulk deletion, search, filters and sorting.
- Show sender, date/time, navigation path, priority, Admin read information and separate save/email results.
- Provide accessible confirmation, loading, success, failure and empty states.

Exit condition: focused inbox tests and desktop/tablet/phone source checks pass.

### 5. Apply and verify 30-day cleanup

- Apply the reviewed migration.
- Schedule protected cleanup.
- Prove current messages remain and only eligible records are removed using disposable or transaction-safe test data.
- Confirm receipts/deliveries follow the parent message and cross-space data is untouched.

Exit condition: live database behavior matches the 30-day contract.

### 6. Rebuild and deploy the email function

- Save canonical Edge Function source in the repository.
- Enforce important/very-important gating, current origins, server-only Gmail credentials and idempotent delivery.
- Return safe per-recipient outcomes and support a privacy-safe test mode.

Exit condition: focused function tests pass and the deployed version matches repository source.

### 7. Add Admin email settings

- Add/update/enable/disable/remove up to three recipients.
- Send a privacy-safe test and show the result.
- Mask addresses outside the editing context and never expose sender credentials.

Exit condition: both Admin roles pass authorized CRUD tests and Werner cannot access recipient data.

### 8. Connect message and delivery results

- Save messages independently from email delivery.
- Show compact overall delivery status and recipient-level details.
- Permit deliberate retry for failed delivery without duplicates.

Exit condition: normal, important, very-important, partial-failure and full-failure paths pass.

### 9. Redesign overview and add improvement insights

- Implement the approved clickable overview, newest-message/activity panels and seven-day chart.
- Remove the AI-cost and static access-profile panels.
- Add privacy-safe event outcomes, aggregates and explainable recommendation rules.
- Link cards and recommendations to filtered lists or exact content branches.

Exit condition: dashboard navigation, metrics, privacy constraints and recommendation thresholds pass focused tests.

### 10. Verify, publish and close the release

- Run lint, bounded production build, all focused and related regression tests.
- Verify live Supabase migrations, RLS, cleanup schedule and Edge Function revision.
- Run one consented test email and one important-message delivery without recording secrets.
- Deploy the exact verified Site commit and wait for terminal success.
- Check the public landing page plus authenticated Werner/Admin flows on phone, tablet and desktop.
- Update project state, product/system references, implementation log, release notes and live checklist.

Exit condition: code, database, function, Site, tests and documentation agree.

## Release acceptance criteria

- [ ] Current-space messages remain available for 30 days and appear newest first.
- [ ] Search, sorting, filters, individual deletion and bulk deletion work and are accessible.
- [ ] Manual deletion is shared across Werner/Admin views and is server-confirmed.
- [ ] Automatic cleanup removes eligible messages, receipts and delivery records only.
- [ ] Normal messages never trigger email.
- [ ] Important/very-important messages send only to enabled consented recipients.
- [ ] Message saving succeeds even when all email delivery fails.
- [ ] Delivery results are unambiguous, recipient-level and duplicate-safe.
- [ ] Both Admin profiles can manage at most three recipients; Werner cannot access them.
- [ ] The Admin overview contains no AI-cost or static access-profile panel.
- [ ] All four overview metrics open the correct filtered destination.
- [ ] Detailed events contain no message/search text, addresses, secrets, recordings or medical inference.
- [ ] Detailed events expire after 90 days and anonymous aggregates after 12 months.
- [ ] Recommendations are explainable, require sufficient evidence and never change content automatically.
- [ ] Supabase storage impact is measured before analytics schema deployment.
- [ ] The deployed public and authenticated application passes the 0.5.5 live checklist.

## Explicitly outside this release

- Recovering or importing historical messages from old Wortnah spaces.
- Deleting old-space data without a separate audit.
- AI-written content or AI-based patient profiling.
- Removing email already delivered to an external mailbox.
- Clinical scoring or treatment recommendations.
