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

## Batch 2: manual ElevenLabs audio intake

Date: 6 September 2026

- Validated the 180 supplied MP3 files: five complete sections of 36 files, no duplicate filenames, and no missing numbered files.
- Confirmed that every file decodes as MP3 audio. The inspected format is mono, 44.1 kHz, approximately 128 kbps; clip durations range from 0.65 to 3.47 seconds.
- Reviewed current Supabase Storage guidance and the project’s current private storage policies. The existing `wortnah-voice-audio` bucket is private, accepts `audio/mpeg`, and has a 10 MB file limit.
- Confirmed that the live `wortnah-natural-voice` function currently reads only the generated `voice_audio_cache` records. It has no import path for the supplied manual clips, so uploading them before the controlled import layer exists would not make them playable in the live app.
- Kept all clips local in `audio-import/ElevenLabs-Audio`; no production Storage objects, tables, schema, Edge Functions, or deployment were changed.

Next batch: prepare and review a controlled server-side import path that stores clips privately and only serves them to members of the matching Wortnah space.

## Batch 3: voice failure diagnosis repair (prepared)

Date: 6 September 2026

- Reproduced the patient-side issue with the live **Stimme testen** control: sound was enabled, but no playable audio was returned.
- Confirmed the generated cache remains empty after the test, so the failure occurs before a successful ElevenLabs response can be stored.
- Recovered the live Edge Function into `supabase/functions/wortnah-natural-voice/index.ts` and prepared a minimal repair. It preserves private audio delivery, exposes a non-sensitive fallback category to the client, and records only that category in the existing server-only generation-state table.
- Verified the prepared TypeScript syntax with the bundled Node runtime.
- The production deployment was not performed because the deployment tool required approval that is unavailable in this session.
- The prepared repair now prefers the new `ELEVENLABS_API_KEY` secret name and temporarily accepts the previous secret name for a safe transition.

## Batch 4: audio architecture reset

Date: 6 September 2026

- Audited the three existing audio functions together.
- Found that the bulk generator and live voice endpoint use incompatible asset registries and fingerprints, while the runner is disabled.
- Chose one new private-audio contract for both supplied MP3 files and future ElevenLabs generation.
- Kept the existing functions and data unchanged while the replacement is planned and verified in small batches.

## Batch 5: shared private-audio contract

Date: 6 September 2026

- Added `lib/audio-contract.ts` as the single source of truth for normalized phrase identity, private storage paths, the German voice defaults, and accepted MP3 constraints.
- Designed the fingerprint so the same phrase in a different Wortnah space has a different private object path.
- Added focused tests for phrase normalization, per-space separation, and upload limits.
- Validation result: 6 focused tests passed, 0 failed.

No production Storage object, table, schema, Edge Function, or live app behavior was changed.

## Audio priority decision

Date: 6 September 2026

- Confirmed the patient audio priority: approved downloaded MP3 first, cached server-side ElevenLabs generation only when needed, then the most natural available German device voice.
- This makes the supplied audio pack the normal playback source and keeps ElevenLabs credit use limited to genuinely missing phrases.

## Batch 6: patient audio fallback adapter

Date: 6 September 2026

- Added the client-side audio adapter for the future private Wortnah audio endpoint.
- It accepts a private MP3 stream when available and returns a clear device-voice fallback state for a declared fallback, unavailable audio, or a network failure.
- Added focused tests for all three outcomes.
- Validation result: 9 focused tests passed, 0 failed.

No live app, production Storage object, table, schema, or Edge Function was changed.

## Batch 7: unified private-audio server (prepared)

Date: 6 September 2026

- Prepared a review-only private registry schema in `supabase/schema-plans/voice-audio-registry.sql`. It keeps audio asset records outside the exposed API schema, enables RLS, revokes browser-role access, and includes the lookup index used by the patient audio request.
- Prepared `supabase/functions/wortnah-audio/index.ts` as the single replacement endpoint. It verifies an authenticated space member, checks the private MP3 registry first, uses only `ELEVENLABS_API_KEY` for a cache miss, stores generated MP3s privately, and otherwise returns a device-voice fallback.
- Verified the function’s TypeScript syntax and confirmed that the new endpoint does not reference the retired `ELEVENLABS_API_KEY2` name.

The schema and function are local review artifacts only. No production schema, Edge Function, Storage object, or live app was changed.

## Batch 8: companion-only MP3 import (prepared)

Date: 6 September 2026

- Prepared `supabase/functions/wortnah-audio-import/index.ts` for the supplied MP3 pack.
- The route requires a signed-in companion in the matching Wortnah space, accepts only decodable MP3-shaped files up to 10 MB, writes to the private bucket, and records a checksum.
- A manual clip cannot silently overwrite another manual clip. It may replace a generated clip for the same phrase, giving the approved MP3 priority.
- Verified the function’s TypeScript syntax and confirmed the companion-role and MP3 constraints are present.

The import route is local only. No clip was uploaded and no production function, schema, Storage object, or live app was changed.

## Batch 9: patient playback integration (prepared)

Date: 6 September 2026

- Connected the existing patient speech control to the future `wortnah-audio` endpoint.
- Signed-in German patient playback will prefer private Wortnah audio. Demo, English, and requested male-voice playback continue through the device voice; any server failure also returns to the device voice.
- The existing first-tap preview and second-tap confirmation behavior remains unchanged because every existing speech call now uses the same adapter.
- Validation result: 9 focused tests passed, 0 failed. The full TypeScript check is pending dependency installation in the recovered source folder.

No production function, schema, Storage object, deployed app, or live behavior was changed.

## Batch 10: MP3 intake manifest

Date: 6 September 2026

- Added the local intake-manifest generator and created `audio-import/wortnah-audio-intake-manifest.json`.
- Recorded all 180 supplied MP3 files across sections `s01` through `s05`, including filename, section, byte size, and SHA-256 checksum.
- The phrase and review fields begin empty by design. The companion import route will require the exact approved phrase before any file is connected to a patient choice.
- Validation result: 180 assets, 5 sections, and 180 valid checksums.

No file was uploaded and no production function, schema, Storage object, deployed app, or live behavior was changed.

## Batch 13: Refero-informed Üben screen

Date: 6 September 2026

- Applied the documented Refero reference lock to the patient Üben screen: four large pastel practice choices, compact orientation cards, warm-sand canvas, high-contrast text, and one blue next action.
- Preserved the existing listen, repeat, next, and done controls. Selecting a phrase card previews it through the shared speech adapter.
- Focused behavior tests: 9 passed, 0 failed.
- The broad visual test cannot run in this environment because Vite is prevented from opening its local WebSocket port. The project-wide TypeScript command also includes unsupported Cloudflare and Deno runtime declarations, so it is not a valid check for the browser component alone.

No deployed app, production function, schema, Storage object, or live behavior was changed.

## Batch 12: complete manual audio phrase map

Date: 6 September 2026

- Attached exact German phrases to the remaining daily-needs, health-and-wellbeing, and independence-and-connection MP3 sections.
- Verified the completed manifest: 180 reviewed assets, 36 per section across `s01` to `s05`, no blank phrase mapping, and no duplicate normalized phrase.
- The manual audio pack is ready for the planned one-file private import test once the reviewed schema and Edge Functions are deployed.

No file was uploaded and no production function, schema, Storage object, deployed app, or live behavior was changed.

## Batch 11: Internet search phrase map

Date: 6 September 2026

- Attached the approved exact German phrases to all 36 `s05` Internet search MP3 files in the intake manifest.
- Verified the section contains 36 total assets, 36 reviewed phrases, and no blank phrase mapping.

No file was uploaded and no production function, schema, Storage object, deployed app, or live behavior was changed.

## Batch 15: Patient choice layout and search flow

- Extended the patient choice policy and visible selection controls through 12 choices.
- Applied the four-color pastel cycle to all cards through 12; desktop uses four columns and phones retain two readable columns.
- Added Internet suchen with the same first-tap preview and second-tap confirmation behavior. Recent searches stay on the device and can be listened to again.
- Added patient message actions to hear an existing message or load it again for reuse.
- Prepared `20260906150000_allow_twelve_patient_choices.sql`; it is not applied to production yet.
- Production build and the focused audio, policy, and rendered-page checks pass.
