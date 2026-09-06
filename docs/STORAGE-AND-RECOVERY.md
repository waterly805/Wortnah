# Wortnah storage and recovery plan

## OneDrive: durable project memory

Folder: `ChatGPT Work Personal/Wortnah`

Store here:

- approved product specifications;
- database migration and schema copies;
- release notes and implementation status;
- periodic source-code snapshots;
- privacy, consent, operational, and testing documents;
- manually requested, privacy-reviewed data exports.

Do not use OneDrive as the live application database. The browser cannot safely coordinate authentication, concurrent updates, row-level permissions, message read state, or reliable KPI events through ordinary documents.

## Supabase Frankfurt: live application data

Keep only operational data required for Wortnah to function:

- authenticated accounts and sessions;
- communication-space memberships and roles;
- salted PIN hashes, lockouts, and device enrollment;
- active topics, practice items, and user preferences;
- deliberately sent messages and read receipts;
- private voice files and their deletion metadata;
- minimal pseudonymous KPI events;
- configuration history, consent records, and supervised recommendations.

Retention starts at 30 days for voice, 90 days for detailed analytics, and 90 days before written messages leave the active board. Longer aggregated summaries must contain no message content.

## Browser/device storage

Use only for the installed PWA shell, a temporary interrupted-connection queue, safe display preferences, and the active unfinished choice flow. After synchronization, sensitive queued data is removed. The device is never the authoritative store.

## Recovery order

1. Redeploy the latest verified source from the Sites-managed repository.
2. Recreate schema changes from versioned migrations if necessary.
3. Restore operational data from Supabase backups under the applicable plan.
4. Use OneDrive specifications and source snapshots to confirm intended behavior and rebuild context.
5. Re-enroll devices rather than copying browser credentials.

## Current status — 3 September 2026

- Frankfurt Supabase project: active and healthy.
- Core schema: applied with Row Level Security on every exposed application table.
- PIN and one-time user-enrollment migration: applied.
- Security advisor: no findings before the latest onboarding migration; rerun after each schema change.
- Web application: first professional vertical slice built and pending private publication.
