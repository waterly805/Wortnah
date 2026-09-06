# Wortnah audit and implementation plan

Date: 6 September 2026  
Status: recovery baseline prepared; no production data, schema, Edge Function, or deployment changes made.

## Confirmed baseline

- Reviewed the existing Wortnah documentation and release history in `ChatGPT Work Personal/Wortnah`.
- Inspected the live patient demo and confirmed that a first tap previews a choice and a second tap confirms it.
- Recovered version 0.3.0, the latest archive containing complete editable source, into the new local workspace.
- Connected the new GitHub repository `waterly805/Wortnah`; it was empty at the start of recovery.
- Confirmed the live application is newer than the editable recovery source. The live app includes search, reusable patient messages, configurable reading behavior, custom vocabulary authoring, and natural voice integration that are absent or incomplete in 0.3.0.
- Reviewed Supabase project `dffmqcqidqkbqeorjtlb`, current security guidance, and deployed `wortnah-natural-voice` version 13 without changing production.

## Product direction

The patient experience has three primary modes: Kommunikation, Internet suchen, and Üben. Message history and settings remain secondary. Communication choices are 2, 4, 6, 8, or 10 and cannot exceed the companion-set maximum. The first tap previews audio; the second tap confirms. Page auto-read and continue-reading are configurable. Confirmed messages can be spoken again or loaded back into the builder.

The companion experience covers communication and search vocabulary, an activity timeline, settings, and simple therapy content. Practice remains listen-and-repeat without clinical scoring.

## Audio findings

The private audio cache currently has no rows or stored objects. Edge Function version 13 keeps the ElevenLabs key server-side, verifies the signed-in user and active space membership, checks cache before generation, validates MP3 data, and falls back to device speech on failure. The database contract matches the function's upsert fields.

The fallback/cache cause is not proven yet. The next diagnostic must trace one harmless phrase through an authenticated request, then repeat the identical request and prove the second call is a cache hit. Diagnostics must identify request, authorization, provider, storage, database, and playback stages without logging patient text or secrets.

## Implementation batches

1. **Recovery baseline:** preserve source provenance, establish GitHub history, and run available static checks.
2. **Feature parity map:** translate later release notes and deployed behavior into source-level requirements and tests.
3. **Audio diagnosis:** reproduce one authenticated miss and hit, then implement only the evidenced fix.
4. **Approved UI direction:** complete Refero research and prepare concrete patient and companion screens in Figma for review before visual implementation.
5. **Shared interaction architecture:** centralize choice limits, two-tap confirmation, page reading, cancellation, and navigation behavior.
6. **History and administration:** add message replay/reuse, search history, vocabulary/search management, timeline, settings, and therapy content with tenant-safe queries.
7. **Release review:** verify responsive and accessible behavior, authorization, cache miss/hit/fallback, and rollback notes. Request explicit approval before deploying or publishing a major release.

## Current constraints

- The historical Sites project is unavailable to the connected account.
- The complete editable source newer than 0.3.0 has not been recovered.
- Local dependencies are not installed, so build and test verification follows after dependency access is available.
- No production mutation is permitted during the audit and recovery batch.
