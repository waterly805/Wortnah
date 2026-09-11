# Wortnah system and release map

Verified production baseline: 11 September 2026.

## Current services

- Repository: `waterly805/Wortnah`
- Site project: `appgprj_6a9dd4677be8819197f3c3d8488f0aec`
- Live Site: `https://wortnah-kommunikation.danny-ly-1897.chatgpt.site`
- Preferred custom hostname: `https://www.wort-nah.com` (active with HTTPS as of 10 September 2026)
- Supabase project: `dffmqcqidqkbqeorjtlb`
- Active Werner space: `317579c9-9b2e-42fb-8713-832edbc25556`
- Private audio bucket: `wortnah-voice-audio`
- Current canonical functions: `pilot-login`, `wortnah-audio`, and `wortnah-audio-import`
- Live preflight also identified `send-message-email-alerts` version 14; its canonical repository source and current production behavior must be reconciled in Wortnah 0.5.5 checkpoint 2 before modification.

The Site audience is public as of 11 September 2026. Check it again before future releases. The app-level Werner/Admin login does not replace the Site access gate.

## Verified baseline

- Site version 6 is deployed successfully from GitHub/Sites source commit `3bc744f1eeb07c476daa6398404396bd60eee1a5` and the audience is public.
- `pilot-login` version 18 is active, performs custom authentication and returns the canonical Werner space before issuing the login token.
- Choice limits accept exactly 2/4/6/8/10/12.
- Admin 1 and Admin 2 labels are aligned across access profiles, profiles, and memberships.
- 180 tier-zero reviewed audio registry rows exist in the active Werner space.
- Those 180 rows have 180 matching private storage objects and zero missing paths.
- The production build, lint and all 47 automated checks pass for the deployed 0.5.4 runtime source.

An earlier failed import stored an unused copy under an older space. Do not use total bucket object count as the active-pack count. Remove old-space files only after confirming no active profile or registry references that space.

## Source and documentation

- Working source: `/Users/DL/Documents/ChatGPT/Wortnah`
- Durable project documentation: `/Users/DL/Library/CloudStorage/OneDrive-Personal/ChatGPT Work Personal/Wortnah`
- Current implementation log: `docs/IMPLEMENTATION-LOG-2026-09-07.md`
- Current deployed-release checklist: `docs/LIVE-ACCEPTANCE-CHECKLIST-0.5.4.md`
- Active planned-release checklist: `docs/LIVE-ACCEPTANCE-CHECKLIST-0.5.5.md`
- Audio manifest: `audio-import/wortnah-audio-intake-manifest.json`

## Release checks

Run the bounded production build through `scripts/build-verified.sh` or the configured Sites environment. Run the focused tests for audio contract/playback, choice policy, patient workflow, and rendered HTML. Validate the audio manifest before import.

For Supabase changes, compare live migrations and function versions after deployment. For audio, verify active-space registry rows, matching private objects, and missing-path count rather than relying on an upload completion message.

For Sites, use the project ID from `.openai/hosting.json`, push the exact source revision with a short-lived per-command credential, package the corresponding successful build, save one version, deploy it, and poll to a terminal success or failure state. Open the returned production URL only after success.
