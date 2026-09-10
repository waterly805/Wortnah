# Wortnah system and release map

Verified production baseline: 8 September 2026.

## Current services

- Repository: `waterly805/Wortnah`
- Site project: `appgprj_6a9dd4677be8819197f3c3d8488f0aec`
- Live Site: `https://wortnah-kommunikation.danny-ly-1897.chatgpt.site`
- Supabase project: `dffmqcqidqkbqeorjtlb`
- Active Werner space: `317579c9-9b2e-42fb-8713-832edbc25556`
- Private audio bucket: `wortnah-voice-audio`
- Current functions: `pilot-login`, `wortnah-audio`, and `wortnah-audio-import`

The Site audience was owner-only at the baseline. Check it before claiming that independent devices can open the link. The app-level Werner/Admin login does not replace the Site access gate.

## Verified baseline

- Site version 1 is deployed successfully.
- `pilot-login` version 15 is active and performs custom authentication before issuing the login token.
- Choice limits accept exactly 2/4/6/8/10/12.
- Admin 1 and Admin 2 labels are aligned across access profiles, profiles, and memberships.
- 180 tier-zero reviewed audio registry rows exist in the active Werner space.
- Those 180 rows have 180 matching private storage objects and zero missing paths.
- The production build and 17 focused authentication, patient-flow, choice, audio, and rendered-page checks pass.

An earlier failed import stored an unused copy under an older space. Do not use total bucket object count as the active-pack count. Remove old-space files only after confirming no active profile or registry references that space.

## Source and documentation

- Canonical repository: `waterly805/Wortnah`
- Local working copy: `/Users/DL/Documents/ChatGPT/Wortnah`
- Durable project-document archive: `/Users/DL/Library/CloudStorage/OneDrive-Personal/ChatGPT Work Personal/Wortnah`
- Live project state: `docs/PROJECT_STATE.md`
- Working workflow: `docs/WORKFLOW.md`
- Current implementation log: `docs/IMPLEMENTATION-LOG-2026-09-07.md`
- Current acceptance checklist: `docs/LIVE-ACCEPTANCE-CHECKLIST-0.5.0.md`
- Current release notes: `docs/RELEASE-NOTES-0.5.0.md`
- Audio manifest: `audio-import/wortnah-audio-intake-manifest.json`

GitHub is the canonical technical source of truth. The local folder is a working clone. OneDrive/SharePoint holds durable human-facing copies and release artifacts, not a competing implementation-state tracker.

## Release checks

Start by reading `docs/PROJECT_STATE.md` and `docs/WORKFLOW.md`.

Run the bounded production build through `scripts/build-verified.sh` or the configured Sites environment. Run the focused tests for audio contract/playback, choice policy, patient workflow, and rendered HTML. Validate the audio manifest before import.

For Supabase changes, compare live migrations and function versions after deployment. For audio, verify active-space registry rows, matching private objects, and missing-path count rather than relying on an upload completion message.

For Sites, use the project ID from `.openai/hosting.json`, push the exact source revision with a short-lived per-command credential, package the corresponding successful build, save one version, deploy it, and poll to a terminal success or failure state. Open the returned production URL only after success.

After deployment, run the matching live acceptance checklist and record the deployed revision and verification result in `docs/PROJECT_STATE.md`. A release is not complete until the source, backend, deployment and documentation agree.
