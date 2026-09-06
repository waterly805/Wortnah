# Wortnah implementation log

## Batch 1: source recovery and choice policy

Date: 6 September 2026

- Recovered the latest complete editable archive, version 0.3.0.
- Established the new GitHub recovery baseline and recorded source provenance.
- Added one shared policy for patient choice counts: 2, 4, 6, 8, and 10.
- Added normalization so saved or unexpected values cannot exceed the companion maximum.
- Updated the recovered settings screen to use the shared policy. The current default maximum is 10; a later reviewed data batch will connect the companion-set value without changing production prematurely.
- Added focused policy tests. Result: 3 passed, 0 failed with the bundled Node 24 runtime.

No Supabase data, schema, Edge Function, live app, or deployment was changed.
