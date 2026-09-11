# Wortnah 0.5.5 checkpoint 2 production audit

Date: 11 September 2026

Scope: read-only audit of the live Supabase message/email model, storage use, retention, RLS, deployed email function and the signed-in Gmail sender account. No migration, function deployment, recipient change or email send was performed.

## Executive result

The existing architecture is reusable, but it is not safe to connect to the current application unchanged. Gmail sender credentials are already stored as server-side Supabase secrets, so normal operation does not require an interactive Gmail login. The deployed function has nevertheless logged repeated delivery failures, is not called by the current application, permits normal-priority forwarding, and accepts only an obsolete Site origin. Checkpoint 3 must reconcile the database source before checkpoint 6 replaces and tests the function.

The signed-in Gmail account contains an earlier Wortnah test conversation in Sent mail. That proves the mailbox was used for testing, but it does not establish that the deployed Supabase function delivered it. A controlled test email remains part of checkpoint 10 and requires an enabled, consented recipient plus action-time approval.

## Live project and storage

- Supabase project: `dffmqcqidqkbqeorjtlb`, healthy Free/NANO project.
- Active canonical Werner space: `317579c9-9b2e-42fb-8713-832edbc25556`.
- Database size: approximately 20 MB at audit time.
- Dashboard snapshot: disk 17%, RAM 54%, database connections 18 of 60.
- No new analytics table is justified before the checkpoint-3 retention and aggregate design is reviewed. The current volume is small; identifier-only daily aggregates remain proportionate.

Relevant relation sizes and estimated rows:

| Relation | Estimated rows | Total size |
| --- | ---: | ---: |
| `interaction_events` | 1,343 | 808 kB |
| `messages` | 26 | 160 kB |
| `message_receipts` | 3 | 72 kB |
| `email_notification_recipients` | 1 | 64 kB |
| `ai_budget_settings` | 3 | 40 kB |
| `ai_usage_ledger` | 0 | 32 kB |
| `email_notification_deliveries` | 0 | 32 kB |

Active canonical space:

- 1 message, sent 10 September 2026; normal priority; visible; not older than 30 days.
- 1 message receipt.
- 0 email recipients and 0 delivery rows.
- 163 interaction events, all within 90 days.

Legacy space retained for audit safety:

- 25 messages dated 4–10 September 2026.
- 1 enabled recipient configured for important and very-important alerts, but not normal alerts.
- Historical messages and the legacy recipient are outside the active space. They will not be imported or deleted in 0.5.5.

## Schema and authorization

The live backend already contains the intended base tables:

- `messages` stores the sender, selected nodes, German/English body, optional voice path, priority, notification request, archive/trash fields and `delete_after`.
- `message_receipts` stores per-Admin read state.
- `email_notification_recipients` stores companion-managed consent, enabled state and per-priority preferences.
- `email_notification_deliveries` stores queued/sent/failed outcomes and provider references.
- `interaction_events` stores identifiers, event types, numeric outcomes and metadata.

Verified protections:

- Message reads are space-member scoped; inserts require the active Werner profile to be the authenticated sender.
- Receipt reads are space-member scoped; companion inserts/updates are restricted to the authenticated companion profile.
- Recipient reads and writes are companion-only and space-scoped; insertion requires consent.
- Werner has no recipient or delivery-table access.
- Delivery writes are server-side; companion access is read-only.
- Interaction-event insertion is restricted to the authenticated profile in its active space; companions may read their space.
- Recipient email is normalized by a trigger and at most three enabled recipients are allowed.
- Successful delivery is duplicate-safe through a unique `(message_id, recipient_id)` index.
- Message deletion cascades to receipts and delivery rows; recipient deletion preserves the historical delivery address while nulling the recipient reference.
- Protected RPCs already exist for archive, trash and restore.

Checkpoint-3 migration must preserve these protections, reconstruct their canonical repository source and add the immutable German path snapshot required by the email and inbox.

## Retention discrepancy

The active cron job runs `private.apply_retention()` daily at 02:30.

Current settings in both active and legacy spaces are:

- message archive: 90 days;
- trash purge: 30 days after manual deletion;
- voice retention: 30 days;
- detailed analytics retention: 90 days.

Current retention does **not** implement the approved 0.5.5 rule. It archives ordinary messages after 90 days and purges only messages that were first moved to trash. Checkpoint 3 must define an idempotent, current-space-safe 30-day purge of message bodies and their receipts/deliveries while leaving legacy-space data untouched during this release.

## Deployed email function

`send-message-email-alerts` version 14 is deployed with legacy JWT verification enabled. Its downloaded source was inspected without executing it or exposing credentials.

Reusable behavior:

- validates an authenticated request and message ownership;
- finds enabled recipients in the message space;
- sends through Gmail SMTP over TLS using server-side secrets;
- writes per-recipient queued/sent/failed delivery state;
- skips a recipient after a successful delivery, preventing accidental duplicates.

Blocking discrepancies:

- only the obsolete `wortnah.danny-ly-1890.chatgpt.site` origin is allowed;
- the current `https://www.wort-nah.com` and active Sites origin are rejected;
- normal-priority forwarding is possible when a recipient preference enables it;
- the function is not invoked anywhere in the current application source;
- the current active space has no configured recipient;
- the email lacks the immutable German path and approved conversation guidance;
- the email links to the obsolete Site;
- there is no privacy-safe Admin test mode;
- no canonical function source exists in this repository;
- the 4–11 September log window contains 39 records, including repeated `email forwarding failed` errors on 5 and 6 September; no successful delivery row exists.

The presence of `GMAIL_SENDER_EMAIL` and `GMAIL_APP_PASSWORD` secret names confirms persistent server-side configuration, not working delivery. Secret values were not read. Repeated Gmail browser login is neither required nor the correct repair.

## Approved Option B email contract

Option B fits 0.5.5 and is retained with these exact content rules:

- Subject contains only Wortnah and the safe priority label; it never contains Werner's message text.
- Important opening: `Werner hat eine wichtige Mitteilung in Wortnah gesendet.`
- Very-important opening: `Bitte sehen Sie sich diese sehr wichtige Mitteilung von Werner zeitnah an.`
- Body includes labels for `Mitteilung`, `Weg in Wortnah`, `Priorität` and `Gesendet am`.
- Conversation guidance: `Bitte lesen Sie die Mitteilung zuerst genau vor und fragen Sie Werner anschließend, ob Sie ihn richtig verstanden haben.`
- Final action uses the current public link `https://www.wort-nah.com`.
- Normal-priority messages never call the email function, even if an old recipient preference says otherwise.
- Message storage completes before delivery is attempted; email failure never removes or hides the saved message.

The final German path must be copied into the message at send time. It must not be reconstructed later from labels that an Admin may rename.

## Checkpoint decision

Checkpoint 2 is complete. No production state was changed. Proceed to checkpoint 3 with one idempotent migration that:

1. reconstructs recipient/delivery schema, constraints, indexes, triggers and RLS in repository source;
2. adds the immutable German navigation-path snapshot;
3. implements 30-day message/receipt/delivery cleanup without touching old-space data in this release;
4. keeps 90-day privacy-safe event retention;
5. prepares small anonymous daily aggregates capped at 12 months, with no message text, search text, addresses, credentials or recordings.

