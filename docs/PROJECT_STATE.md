# Wortnah Project State

> **Purpose:** This is the single live operational source of truth for what is currently implemented, verified, in progress, and safe to release. Read this file before substantial Wortnah work and update it before considering that work complete.

Last repository review: 10 September 2026
Current app release: **0.5.1**
GitHub baseline before 0.5.1 synchronization: `c847939df324af498945e8ed8fe7bd52e5a0ea2a`
Production state recorded: **10 September 2026**
Exact live deployment: **Sites version 3 succeeded from verified Site source commit `6d5929d80b28497ed6afdd8beca2f35bc7e67b21` and is public**

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

## 3. Current implemented release: 0.5.1

According to the 0.5.1 release record:

### Werner

- Home, field count and audio state are available in the top bar; unfinished English controls are hidden.
- Communication, guided Internet search and practice honor 2/4/6/8/10/12 card counts within the companion maximum.
- Card paging includes arrows and page status; Back, Repeat and Audio remain reachable.
- Internet search supports up to four guided levels and opens one exact final query.
- Recent searches can be heard again or reopened from device-local history.
- Guided-search previews and repeats use the private audio pipeline before device speech.

### Admin

- Communication and Internet-search content have separate editors.
- Editors show current level/path and a Werner-visible preview.
- Internet-search content supports levels 1–4, parent sections, German labels, final queries, visibility, order, editing and deletion.
- Communication and search mutations require exactly one returned row and show clear saving, success and failure states.

### Login

- Access code and daily PIN are separate steps.
- Continue/Sign in actions and Return/Enter are supported.
- Cancel, clear, backspace, loading and retry states are present.
- Every submitted access code or daily PIN clears immediately so the next step or retry starts empty.

### Audio

- Reviewed MP3 playback uses an authenticated unlocked audio player suitable for mobile browsers.
- Guided-search phrases use the same private reviewed/generated MP3 path as communication phrases.
- Server-side ElevenLabs cache and device-voice fallback remain in place.
- Device fallback ranks natural German voices ahead of compact or robotic voices.

## 4. Verification state

Recorded for 0.5.1:

- Production build and lint pass.
- All 30 automated checks pass.
- Supabase remains released with an active maximum of 12 and 180 reviewed private MP3 objects; no backend change was required.
- Site version 3 deployed successfully and returns HTTP 200.
- Site audience is public, separately from Wortnah profile authentication.
- The anonymous live landing page shows Werner, Admin 1 and Admin 2.

Still required before saying **0.5.1 is fully live-accepted**:

- [ ] Complete authenticated Werner checks for both PIN steps, all allowed field counts, guided search and reviewed MP3 playback.
- [ ] Confirm intentional server-unavailable behavior selects the best installed German device voice on a real target device.
- [ ] Complete disposable Admin 1 communication and Admin 2 guided-search CRUD checks, then remove the test rows.
- [ ] Complete phone, tablet and desktop layout checks.
- [ ] Update the live checklist and implementation log with the final results.

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

### RELEASE-0.5.1 — Authenticated live acceptance

Status: In progress

Goal:
Verify the deployed 0.5.1 behavior end to end without recording credentials or leaving disposable data.

Acceptance criteria:
- [x] Exact verified source is deployed successfully and the Site is public.
- [x] Anonymous landing page loads and exposes the three intended profiles.
- [ ] Werner login, retry, field counts, guided search, reviewed MP3 and device fallback are checked live.
- [ ] Admin communication and guided-search add/edit/visibility/find/delete flows are checked live with disposable rows removed.
- [ ] Supported phone, tablet and desktop layouts are checked.

Affected areas:
- Frontend: Patient, login and companion flows.
- Backend/Supabase: Read-only parity checks and disposable CRUD acceptance rows only.
- Database/migrations: No change planned.
- Audio: Reviewed private MP3 and device fallback verification.
- Deployment: Sites version 3 is live and public.

Verification required:
- [x] Focused automated checks.
- [x] Production build and lint.
- [ ] Remaining authenticated live checks.

Notes / decisions:
- Access codes, daily PINs, tokens and temporary credentials must never be written to GitHub, OneDrive, logs or chat.

### Next approved work

Add the next agreed feature here using the task format from `docs/WORKFLOW.md` before implementation.

## 7. Known issues / uncertainties

- The deployed 0.5.1 source is verified, but authenticated live acceptance remains incomplete until a user enters the two login values privately in the browser.
- GitHub `main` is being reconciled with the already verified and deployed 0.5.1 source; the Git history is authoritative once this synchronization commit is pushed.
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
