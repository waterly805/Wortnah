# Wortnah Project State

> **Purpose:** This is the single live operational source of truth for what is currently implemented, verified, in progress, and safe to release. Read this file before substantial Wortnah work and update it before considering that work complete.

Last repository review: 10 September 2026
Current app release: **0.5.0**
Current main revision at review: `07d20caaac8ac2e6d65a9631b6f0c7fe7b2ad2a5`
Production baseline last independently recorded: **8 September 2026**
Exact live deployment of the current `main` revision: **must be verified before claiming a release is live**

## 1. Sources of truth

Use these in this order:

1. `docs/PROJECT_STATE.md` — current operational state, open work, verification and release readiness.
2. `skills/wortnah-maintainer/references/product-contract.md` — durable product and UX contract.
3. `skills/wortnah-maintainer/references/system-and-release.md` — services, environment, architecture and release procedure.
4. Current source code, tests and database migrations — implementation truth.
5. `docs/LIVE-ACCEPTANCE-CHECKLIST-<version>.md` — release-specific live verification.
6. `docs/RELEASE-NOTES-<version>.md` — completed release history.
7. Dated implementation logs — historical detail only; do not use them as the current-state source.

If these disagree, stop and reconcile the disagreement before adding new work.

## 2. Current product contract summary

### Patient profile

- Patient profile: Werner.
- Primary modes: `Kommunikation`, `Internet suchen`, and `Üben`.
- Allowed choice counts: 2, 4, 6, 8, 10, or 12, bounded by the companion-set maximum.
- First tap previews audio; second tap confirms.
- Page auto-read and continuous reading are configurable.
- Confirmed messages appear in patient history and support replay and reuse/edit.
- Recent Internet searches remain device-local and can be replayed/reopened.

### Companion profiles

- Admin 1 and Admin 2 are companion profiles.
- Companion tools cover communication/search content, practice, activity, messages and settings.
- Companion users can manage visibility, ordering and appropriate content.
- Companion settings control the maximum number of visible patient choices.

### Accessibility / interface

- German-first, plain language, large touch targets.
- Calm patient path with management density kept in companion views.
- Phone, tablet and desktop layouts must remain usable without clipped controls or overlapping navigation.

### Audio

Playback order:

1. Reuse a reviewed private MP3 when it matches the active phrase/space/voice/model/language.
2. Generate a missing phrase server-side through ElevenLabs and cache it privately.
3. Fall back to the most natural available German device voice.

Never place PINs, access codes, Supabase secrets, ElevenLabs keys, session tokens or temporary Site credentials in source, documentation, logs or chat output.

## 3. Current implemented release: 0.5.0

According to the 0.5.0 release record:

### Werner

- Home, field count, audio state and DE/EN controls are available in the top bar.
- Communication, guided Internet search and practice honor 2/4/6/8/10/12 card counts within the companion maximum.
- Card paging includes arrows and page status; Back, Repeat and Audio remain reachable.
- Internet search supports up to four guided levels and opens one exact final query.
- Recent searches can be heard again or reopened from device-local history.

### Admin

- Communication and Internet-search content have separate editors.
- Editors show current level/path and a Werner-visible preview.
- Internet-search content supports levels 1–4, parent sections, German/English labels, final queries, visibility, order, editing and deletion.

### Login

- Access code and daily PIN are separate steps.
- Continue/Sign in actions and Return/Enter are supported.
- Cancel, clear, backspace, loading and retry states are present.

### Audio

- Reviewed MP3 playback uses an authenticated unlocked audio player suitable for mobile browsers.
- 36 reviewed Internet-search phrases are mapped to guided search.
- Server-side ElevenLabs cache and device-voice fallback remain in place.

## 4. Verification state

Recorded for 0.5.0:

- 20 focused behavior checks pass.
- App module parses successfully.
- Production audio contains 36/36 reviewed Internet-search assets.

Still required before saying the **current main revision is live and fully accepted**:

- [ ] Confirm the deployed Site revision corresponds to the intended `main` commit.
- [ ] Run/confirm the current production build.
- [ ] Complete `docs/LIVE-ACCEPTANCE-CHECKLIST-0.5.0.md` against the live Site.
- [ ] Confirm current Site audience/access gate separately from app profile login.
- [ ] Compare live Supabase migrations/function versions if backend work changed.
- [ ] Record the final deployment result in this file and the matching release notes/log.

## 5. Current infrastructure

See `skills/wortnah-maintainer/references/system-and-release.md` for identifiers and release details.

Core services:

- GitHub repository: `waterly805/Wortnah`
- Supabase backend
- OpenAI Sites deployment
- Private Wortnah audio storage
- ElevenLabs server-side generation/cache path

The repository is the canonical development record. A local clone is a working copy, not a separate source of truth.

## 6. Current work

### In progress

No new feature should be considered in progress merely because it was discussed in chat. Add it here only when its requirements are frozen and implementation has started.

### Next approved work

Add the next agreed feature here using the task format from `docs/WORKFLOW.md` before implementation.

## 7. Known issues / uncertainties

- The last independently recorded production baseline predates the 0.5.0 repository commit. Live deployment parity must therefore be verified before making a current-production claim.
- `package.json` currently reports the starter package version `0.1.0`; app release tracking is handled by Wortnah release documentation. Do not infer the product release from `package.json` alone.

## 8. Definition of done

A change is **not done** until every applicable item is complete:

- [ ] Requirement and acceptance criteria are written before implementation.
- [ ] Current source, current project state and relevant product/system references were inspected.
- [ ] Code change is complete.
- [ ] Database migration is saved and applied if required.
- [ ] Relevant Supabase/RLS/function state is verified if required.
- [ ] Focused automated tests pass.
- [ ] Related regression checks pass.
- [ ] Production build passes when the change affects a release.
- [ ] Live behavior is checked when the change is deployed.
- [ ] `docs/PROJECT_STATE.md` is updated to match reality.
- [ ] Product/system reference is updated if the contract or architecture changed.
- [ ] Matching release notes / implementation log are updated where applicable.
- [ ] No unresolved discrepancy remains between documentation, code, database and deployed state.

Only then may the feature or release be marked complete.
