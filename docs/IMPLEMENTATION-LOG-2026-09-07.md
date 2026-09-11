# Wortnah implementation log

## Batch 16: shared patient and companion content

Date: 7 September 2026

- Connected the patient communication flow to the existing protected Supabase vocabulary tables while retaining safe built-in choices when shared content is unavailable.
- Applied the companion-set maximum to every patient choice level and added the full 2, 4, 6, 8, 10, and 12 choice policy.
- Connected Üben to shared therapy phrases.
- Added loading feedback between communication levels so a slow request cannot briefly show unrelated choices.

## Batch 17: complete companion workspace

Date: 7 September 2026

- Added clear companion areas for Overview, Content, Practice, Activity, Messages, and Settings.
- Added protected create, edit, show, hide, search, and delete controls for vocabulary and search content.
- Added protected practice-phrase management, audio preview, a recent activity timeline, and the patient choice-limit setting.
- Replaced the unfinished invitation panel with the three agreed profile statuses.
- Added compact mobile navigation and responsive management layouts.

## Batch 18: one private audio path

Date: 7 September 2026

- Consolidated manual MP3 and generated audio around the existing private `wortnah-voice-audio` bucket and `voice_audio_assets` table.
- The server checks an approved manual MP3 first, then a reusable cached ElevenLabs result, and finally asks the browser to use its natural German device voice.
- The playback and companion import functions now use the same phrase fingerprint and private storage path.
- Removed the retired `ELEVENLABS_API_KEY2` name. The server reads only `ELEVENLABS_API_KEY`; no secret is sent to the browser.
- Added the public Supabase project key to authenticated audio requests as required by the Edge Function gateway.

## Verification

- Production application build: passed.
- Focused audio, choice-policy, patient-workflow, and rendered-page checks: 17 passed, 0 failed.
- Focused application lint: passed with no errors.
- The broader UI suite has one environment-only failure because this sandbox refuses its local WebSocket listener; the other 13 checks pass.
- A local browser preview cannot bind a port in this sandbox. The production build is the release artifact used for verification.

## Batch 19: login, privacy, and playback responsiveness

Date: 7 September 2026

- Corrected the first-login path so a successful profile access code still leads to the daily PIN screen.
- Kept recent Internet searches on the device and removed the full query text from the shared activity event.
- Added a bounded 24-phrase memory cache for private MP3 responses. Replaying a recently heard phrase during the same session no longer needs another network request.
- Added focused regression checks for all three behaviors.

## Batch 20: configurable page reading

Date: 7 September 2026

- Restored the existing `auto_read_choices` preference without adding a new schema field.
- When enabled, the home, communication, and Internet-search screens read the heading and visible choice cards in order.
- Automatic page reading deliberately uses the German device voice, so it does not generate ElevenLabs requests for every visible card.
- Any manual choice tap stops the sequence and uses the normal approved MP3, cached ElevenLabs, and device fallback path.

## Batch 21: clear login progress

Date: 7 September 2026

- Added a visible checking state for both profile access and daily PIN verification.
- Disabled the keypad and navigation while a secure check is running.
- Removed the duplicate four-digit completion path so one PIN entry creates one network request.

## Batch 22: durable release backup

Date: 7 September 2026

- Created a compact source archive without dependencies, generated output, secrets, or private MP3 files.
- Created a separate audio-pack archive containing the 180 reviewed MP3 files and their intake manifest.
- Stored both archives in the existing OneDrive Wortnah folder with SHA-256 checksums in the release-artifact manifest.

## Batch 23: controlled MP3 import

Date: 7 September 2026

- Added a one-time import tool for the reviewed audio pack after the companion-only import function is deployed.
- The tool authenticates Admin 1, verifies the daily PIN and companion membership, validates each local file against its recorded size and SHA-256 checksum, and uploads four files at a time.
- It reads the public Supabase key from the application source and never stores or prints the Admin access code, session token, service-role key, or ElevenLabs secret.
- Local validation completed successfully for all 180 reviewed MP3 files.

## Batch 24: production profile alignment

Date: 7 September 2026

- Reviewed the live profile and membership records after confirming the relevant RLS policies.
- Aligned the two companion labels to `Admin 1` and `Admin 2` across access profiles, user profiles, and space memberships; Werner was already correct.
- Verified that all three profiles are active and have access-code, initial-PIN, and daily-PIN hashes without reading or exposing any credential value.

## Batch 25: validated Site package

Date: 7 September 2026

- Confirmed the new Site project is active but has zero saved versions and no live URL.
- Packaged the successful production build with the official Sites helper.
- Verified the package contains the Worker entrypoint, client assets, hosting manifest, and migration metadata.
- Stored the 669 KB deployment package and its SHA-256 checksum in the OneDrive Wortnah release records.

## Batch 26: consistent practice choice count

Date: 7 September 2026

- Corrected Üben so it follows the patient-selected choice count exactly, including the two-choice setting.
- Expanded the safe offline practice fallback to 12 pastel-card phrases.

## Release state

- Site version 1 is live at `https://wortnah-kommunikation.danny-ly-1897.chatgpt.site`.
- The choice-limit and profile-label migrations are applied in production.
- `pilot-login` version 15 and the new private `wortnah-audio` and `wortnah-audio-import` functions are active.
- The 180 reviewed MP3 files are registered in Werner's active communication space; verification found 180 matching private objects and zero missing files.
- The Site remains owner-only until its Share setting is changed to public for independent-device access.

## Batch 27: production release and audio recovery

Date: 8 September 2026

- Published the verified Site source and production package as version 1.
- Applied the exact 2/4/6/8/10/12 choice constraints and aligned the three fixed profile labels.
- Deployed the updated two-step profile login and the consolidated private audio functions.
- Diagnosed the import failure as an older companion membership being selected before Werner's active space.
- Reused the already uploaded MP3 files without generating new ElevenLabs audio and rebuilt the protected registry from the reviewed manifest.
- Verified 180 approved registry rows, 180 matching private files, and zero missing storage paths.

## Batch 28: calm patient controls and paging

Date: 9 September 2026

- Matched the approved mobile direction with round Home, field-count, audio-state, and DE/EN controls at the top of every patient screen.
- Added predictable card paging with previous/next arrows, page dots, and a persistent Back, Repeat, and Audio action row.
- Preserved the exact 2/4/6/8/10/12 choice policy and the companion-set maximum.

## Batch 29: clearer companion content hierarchy

Date: 9 September 2026

- Added a visible breadcrumb, level badge, Werner preview, and explicit level selector to the companion content manager.
- Added clear show/hide, order, edit, and delete controls with the current purpose/topic path beside every entry.
- Separated Communication and Internet Search management so companions always know which level they are editing.

## Batch 30: complete guided Internet search

Date: 9 September 2026

- Added a German-first 57-node hierarchy across levels 1–4 with 36 final search sentences.
- Matched all 36 final German sentences exactly to the reviewed Internet-search MP3 manifest.
- Kept recent search text on the device and restricted shared activity events to choice IDs and level numbers.
- Added an idempotent RLS-protected migration for companion-managed search labels, visibility, order, parent level, and final queries.

## Batch 31: audio playback and login repair

Date: 9 September 2026

- Reused a browser-unlocked audio element so iPhone and iPad can play a protected MP3 after the authenticated fetch finishes.
- Kept the audio order: reviewed MP3, reusable server cache, then natural device voice.
- Confirmed all 36 reviewed Internet-search phrases exist as approved assets in Werner's active space.
- Replaced automatic four-digit submission with explicit forms that support Return/Enter, Continue, Cancel, clear, and backspace.
- Made profile access visibly Step 1 of 2 and the daily PIN visibly Step 2 of 2.

## Batch 32: focused verification

Date: 9 September 2026

- Passed 20 focused choice, patient-flow, guided-search, authentication, and audio checks.
- Parsed the full application module successfully and completed the client half of the production build before the interrupted local dependency cache prevented the server half.
- Confirmed the full 180-file audio registry remains present, including all 36 Internet-search phrases.

## Batch 33: production backend release

Date: 9 September 2026

- Applied the `internet_search_hierarchy` migration to production and confirmed it in Supabase migration history.
- Seeded 171 guided-search rows across the current Wortnah spaces.
- Deployed the verified `pilot-login`, `wortnah-audio`, and `wortnah-audio-import` functions.
- Re-ran 13 focused patient-flow, choice-policy, guided-search, and audio checks successfully.
- Kept Site version 1 live while the updated Site source transfer and public-access change remain blocked by this session's restricted Sites connection and approval policy.

## Batch 34: public Wortnah 0.5.0 publication

Date: 9 September 2026

- Restored the exact locked local dependencies and completed the full production build.
- Pushed the current application source to the existing Site repository at `829aac99e7d96d8f8d2eb7d527731c44abbeaa44`.
- Packaged the successful build with the official Sites helper, saved Site version 2, and received terminal deployment status `succeeded`.
- Changed Site access to `public` under explicit user authorization and confirmed the returned public access policy.
- Verified an anonymous HTTP 200 and the live profile selection / first access-code screen.
- Passed 24 of 25 automated checks, including every focused Wortnah behavior check. The unrelated starter-catalog CSS check expects an absent scrollbar utility.
- Live authenticated login, guided-search, reviewed MP3 playback, and device-voice playback remain pending a user-provided browser sign-in. No credentials were requested in chat or persisted. Supabase was not changed.

## Batch 35: Wortnah 0.5.1 repair and verification

Date: 10 September 2026

- Confirmed the active space maximum is 12 and the public Site audience is already public.
- Routed every guided-search preview and repeat through the reviewed/generated private MP3 pipeline before device fallback.
- Added deterministic selection of the strongest available German device voice and tests that prefer natural voices over compact robotic voices.
- Cleared the four-digit keypad immediately on every submission and gave access code and daily PIN distinct component identities.
- Kept Werner's personal 2/4/6/8/10/12 selection within the Admin maximum and made the field-count control easier to understand.
- Removed current English switches and editor inputs while preserving existing English database values during German edits.
- Made communication, guided-search, and practice saves return an affected row, prevent duplicate submission, and show clear saved or failed states.
- Redesigned the companion editors with grouped German fields, hierarchy context, a Werner preview, responsive stacking, and one primary save action.
- Completed the production build and lint with no errors; all 30 automated checks passed.
- Rechecked the protected audio store and found 180 MP3 objects for Werner's active space. Supabase required no release change.

## Batch 36: public deployment and canonical GitHub reconciliation

Date: 10 September 2026

- Copied the 0.5.1 implementation plan, release notes, live checklist, implementation log, Refero direction, product contract and verified source archive to the existing Wortnah OneDrive folder.
- Pushed the exact verified Site source commit `6d5929d80b28497ed6afdd8beca2f35bc7e67b21`, saved Site version 3 and received terminal production deployment status `succeeded`.
- Confirmed the Site audience is public, the production URL returns HTTP 200, and the anonymous landing page displays Werner, Admin 1 and Admin 2.
- Connected the local working folder to canonical GitHub repository `waterly805/Wortnah`, fetched `origin/main`, and preserved the new `AGENTS.md`, `docs/PROJECT_STATE.md`, `docs/WORKFLOW.md`, and maintainer workflow guidance while reconciling the verified 0.5.1 source.
- Pushed canonical 0.5.1 implementation commit `9a6c092b00f4eecb8de58fd198baa848f0c91d70` to GitHub `main` after the production build, lint, all 30 automated checks, runtime-file comparison and credential-pattern scan passed.
- Authenticated Werner, device fallback, responsive layout and disposable Admin CRUD checks remain open in the live acceptance checklist. No credential value was read, recorded or requested in chat.

## Batch 37: workspace consolidation

Date: 10 September 2026

- Converted `/Users/DL/Documents/ChatGPT/Wortnah` into the clean local working copy of canonical GitHub `main` and verified that local `HEAD` matches `origin/main`.
- Added `docs/WORKSPACE-STRUCTURE.md` with the required start-of-work, end-of-work and storage rules.
- Defined GitHub as the complete technical record, the local folder as the only editable working copy, OneDrive as current documentation plus recovery archives, and Supabase as the live data source.
- Organized the existing OneDrive Wortnah material into current documentation, current and previous release archives, and historical reference folders without deleting historical material.
- Added a canonical GitHub archive for implementation commit `9a6c092b00f4eecb8de58fd198baa848f0c91d70`, retained the exact deployed Site source separately, and generated SHA-256 checksums for both current recovery archives.

## Batch 38: custom domain setup

Date: 10 September 2026

- Registered `www.wort-nah.com` with the existing public Wortnah Site.
- Confirmed the custom domain is pending GoDaddy DNS validation and SSL initialization; the existing platform URL remains active during setup.
- Prepared the required GoDaddy CNAME and TXT records without changing unrelated DNS or storing the returned verification values in repository documentation.
- Verified the saved GoDaddy records against public and authoritative DNS. The CNAME and ownership TXT resolve correctly; the certificate TXT is present on one GoDaddy authoritative nameserver while replication to the second remains pending.
- Refreshed Sites and confirmed the custom-domain provider is active with no reported error; SSL remains pending validation, so the custom HTTPS address is not yet ready.
- Confirmed both GoDaddy authoritative nameservers and a public resolver serve all required records.
- Confirmed Sites reports the custom domain and SSL certificate as active, both hosting endpoints return HTTP 200, and the visible custom-domain page shows the current Werner, Admin 1 and Admin 2 landing screen.

## Batch 39: Wortnah 0.5.2 custom-origin, reading and branding repair

Date: 10 September 2026

- Added the active custom hostname to the login and both private-audio Edge Function allowlists.
- Deployed `pilot-login` version 17, `wortnah-audio` version 3, and `wortnah-audio-import` version 3, then confirmed all three live preflight responses return the custom origin.
- Reduced automatic page reading to the main heading and currently visible card labels and reused the natural German device-voice selector for that sequence.
- Replaced the patient header dropdown with one button that cycles through the Admin-bounded 2/4/6/8/10/12 sequence.
- Added the supplied mountain-and-hiker identity as a round visible and installable app logo.
- Corrected narrow-screen role-card shrinking and macOS GNU timeout detection.
- Passed lint, the production build, and all 37 automated checks.

## Batch 40: canonical communication hierarchy and live synchronization

Date: 10 September 2026

- Traced the Admin/Werner mismatch to three active historical memberships combined with an unordered one-row membership lookup.
- Confirmed the main imported vocabulary was in the canonical pilot space while the companion-created `Test` area was in an older space.
- Updated `pilot-login` to return the canonical space and updated the client to select that exact membership, with newest-membership fallback only for restored sessions.
- Restored the six approved level-1 areas in the canonical database and recovered the `Test` row without deleting historical data.
- Changed Werner's communication hierarchy to use successful database results at all levels, including intentionally empty levels after Admin hide/delete changes.
- Added a protected Realtime subscription that refreshes current Admin and Werner communication data after inserts, updates and deletes.
- Deployed `pilot-login` version 18 and verified the canonical live hierarchy contains 7 visible areas, 64 visible topics and 1,024 visible phrases.
- Passed lint, the production build and all 41 automated checks.
- Pushed exact source commit `9637603b85fb14e40fdd7fb36d5ccccbe01b265f` to GitHub and the Sites source, saved Sites version 4, and received terminal deployment status `succeeded` while preserving the public audience and custom hostname.
- Authenticated two-session live acceptance remains; no access code or PIN was requested, read or stored.

## Batch 41: public HOTFIX-001 deployment

Date: 11 September 2026

- Fast-forwarded the clean local checkout to GitHub `main` at `4c765ae0d065b139895bb5cd85a59b308b3b1fb9` and re-ran the production build, lint and all 41 automated checks successfully.
- Restored the Site audience from an unintended custom gate to public while preserving the existing owner and editor.
- Pushed the exact verified source to the existing Sites repository, packaged the successful build, saved Sites version 5 and received terminal deployment status `succeeded`.
- Confirmed both production URLs return HTTP 200 and the anonymous custom-domain page shows Werner, Admin 1 and Admin 2.
- Confirmed the live document contains `translate="no"` and Google's `notranslate` directive.
- Authenticated verification through both PIN steps with Chrome translation enabled remains open; no access code or PIN was requested, read or stored.

## Batch 42: hierarchical Admin editor and Wortnah 0.5.4 deployment

Date: 11 September 2026

- Reworked the companion content manager so Level 2 edits one selected Level-1 area and Level 3 edits one selected theme, with a clickable path, branch selectors, contextual Werner preview, local search, counts and level-specific add actions.
- Preserved add, edit, visibility, ordering and delete controls while making mutations server-confirmed, active-space and branch scoped; blocked unsafe deletion of populated parents and unsafe movement of populated themes.
- Kept Supabase as the live content source of truth and reinforced Realtime with foreground revalidation, so saved content survives browser close and logout and reaches other signed-in sessions.
- Passed lint, the bounded production build and all 47 automated checks, including six focused hierarchy and synchronization checks.
- Pushed exact runtime source commit `3bc744f1eeb07c476daa6398404396bd60eee1a5` to GitHub and the Sites source, packaged Sites version 6 and received terminal deployment status `succeeded`.
- Confirmed the custom and platform production endpoints return HTTP 200 and serve the new 0.5.4 application bundle. Authenticated disposable Admin-to-Werner CRUD and two-session acceptance remains because the browser requires the private daily PIN.

## Batch 43: Wortnah 0.5.5 requirement freeze

Date: 11 September 2026

- Approved a four-stage 0.5.5 scope: 30-day message inbox, priority email alerts, actionable Admin overview and privacy-safe improvement insights.
- Fixed retention at 30 days for message/receipt/delivery content, 90 days for detailed privacy-safe events and 12 months for anonymous daily aggregates, with a mandatory Supabase size and projected-growth check before analytics deployment.
- Excluded historical old-space message recovery/deletion, AI-generated recommendations, patient profiling and clinical scoring.
- Saved the ten-checkpoint implementation order and a release-specific live acceptance checklist. No application, Supabase or production Site change was made in this checkpoint.
