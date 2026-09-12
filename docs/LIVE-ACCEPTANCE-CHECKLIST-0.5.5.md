# Wortnah 0.5.5 live acceptance checklist

Date: 11 September 2026

Never record access codes, the daily PIN, Gmail App Passwords, recipient addresses or message contents in release logs. Use consented and disposable test data.

## Release and access

- [ ] Exact verified source commit is deployed successfully to the existing public Site.
- [ ] Custom and platform URLs return HTTP 200 and the signed-out profile page remains healthy.
- [ ] Werner, Admin 1 and Admin 2 can complete their intended authenticated flows.

## Message inbox and retention

- [ ] Current-space messages display newest first with date, time, sender, priority, path and clear read/email status.
- [ ] Search, sort and filters return the expected messages.
- [ ] Individual and bulk deletion require confirmation and synchronize across all signed-in profiles.
- [ ] Associated receipts and delivery records follow a deleted message.
- [ ] A transaction-safe retention check proves that only records older than 30 days are eligible for purge.
- [ ] Historical old-space data is neither imported nor deleted.

## Priority email

- [ ] Normal priority saves successfully and creates no email delivery.
- [ ] Important and very-important messages save before attempting email.
- [ ] One consented test email succeeds without exposing secrets.
- [x] One important-message email succeeds with approved German copy and immutable path. Verified in Gmail Sent and reconciled to a final `sent` delivery row on 12 September 2026.
- [ ] A controlled failure leaves the message saved and shows a clear failure state.
- [ ] Manual retry does not duplicate a successful message/recipient delivery.
- [ ] Admin recipient controls enforce a maximum of three and Werner cannot access recipient data.

## Admin overview

- [ ] `KI-Kostenkontrolle` and the static access-profile panel are absent.
- [ ] Each summary card opens the correct filtered screen.
- [ ] Newest messages, latest activities and seven-day activity show consistent live data.
- [ ] Desktop, tablet and phone layouts have no clipped or overlapping controls.

## Improvement insights and privacy

- [ ] Communication, configured search, audio, practice and email outcome counts are recorded without prohibited text or secrets.
- [ ] `Etwas fehlt`, search failure, backtracking, coverage and successful-new-content signals produce only explainable recommendations after minimum evidence.
- [ ] Every recommendation shows its evidence and opens the relevant branch without changing content automatically.
- [ ] Detailed events are limited to 90 days and anonymous aggregates to 12 months.
- [ ] Current Supabase size and projected growth are recorded before analytics deployment.
