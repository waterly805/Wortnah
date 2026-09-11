# Wortnah Project State

> **Purpose:** This is the single live operational source of truth for what is currently implemented, verified, in progress, and safe to release. Read this file before substantial Wortnah work and update it before considering that work complete.

Last repository review: 10 September 2026
Current live app release: **0.5.3**
Canonical 0.5.3 implementation commit: `9637603b85fb14e40fdd7fb36d5ccccbe01b265f`
Canonical 0.5.1 implementation commit: `9a6c092b00f4eecb8de58fd198baa848f0c91d70`
GitHub baseline before synchronization: `c847939df324af498945e8ed8fe7bd52e5a0ea2a`
Production state recorded: **10 September 2026**
Exact live deployment: **Sites version 4 succeeded from verified Site source commit `9637603b85fb14e40fdd7fb36d5ccccbe01b265f` and is public**

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
- Custom public hostname: `https://www.wort-nah.com` (active with HTTPS)
- Private Wortnah audio storage
- ElevenLabs server-side generation/cache path

The repository is the canonical development record. A local clone is a working copy, not a separate source of truth.

## 6. Current work

### In progress

### HOTFIX-001 — Prevent post-PIN browser-translation crash

Status: Implemented and locally verified; production deployment pending

Goal:
Keep Wortnah stable when Chrome translation is enabled so completing the daily PIN never leaves a white screen.

Acceptance criteria:
- [x] The German document explicitly opts out of automatic browser translation at the root.
- [x] The rendered production HTML contains both the standard `translate="no"` attribute and Google's `notranslate` directive.
- [x] Production build, focused rendered-HTML check and full automated tests pass.
- [ ] The fix is deployed to the existing public Site and the login screen renders without the observed React `removeChild` crash.

Affected areas:
- Frontend: Root document metadata only.
- Backend/Supabase: No change.
- Database/migrations: No change.
- Audio: No change.
- Deployment: One minimal Sites hotfix release.

Verification required:
- [x] Reproduce and record the browser error.
- [x] Focused automated check and related regressions.
- [ ] Production deployment and live browser check.

Notes / decisions:
- 11 September reproduction: Chrome had translated Wortnah's German PIN screen into English. After PIN completion, React failed with `NotFoundError: removeChild` because the translation layer had changed React-owned DOM nodes.
- Keep the existing UI unchanged; prevent translation mutation rather than altering authentication or Supabase.

### FEATURE-003 — Priority email alerts with Admin recipients

Status: Planned — deferred to the next work session to conserve the remaining weekly allowance

Goal:
Send a private, traceable Gmail alert when Werner confirms an important or very important message, using up to three recipients managed by Admin 1 or Admin 2.

Acceptance criteria:
- [ ] Normal-priority messages are stored in Wortnah but never trigger an email, regardless of recipient preferences.
- [ ] Important and very important messages send the approved Option B email: privacy-safe subject, Werner's message, the saved German navigation path, a short conversation tip, timestamp, priority and the public Wortnah link.
- [ ] The very-important variant opens with a stronger request to review the message promptly.
- [ ] Admin 1 and Admin 2 can add, update, enable/disable and remove up to three consented recipient addresses without exposing the Gmail App Password.
- [ ] Admin can send a privacy-safe test email and can review recent sent/failed delivery status.
- [ ] Message storage succeeds independently of email delivery; Werner receives a clear saved/delivery result without exposing provider details.
- [ ] The authenticated Edge Function accepts the active custom and Sites origins, prevents cross-space access and avoids duplicate delivery for a message/recipient pair.
- [ ] No AI service is used for sending, formatting or analysing these alerts.

Affected areas:
- Frontend: Werner message send result and Admin settings/recipient/delivery controls.
- Backend/Supabase: Recipient/delivery RLS reconciliation and authenticated Gmail SMTP Edge Function.
- Database/migrations: Save an immutable German navigation-path snapshot with each message and reconcile the existing live email-alert tables into repository migrations.
- Audio: No change.
- Deployment: Supabase migration/function plus a new verified public Sites version.

Verification required:
- [ ] Focused automated checks cover priority gating, Option B content, immutable navigation path and Admin controls.
- [ ] Supabase migration, RLS and deployed function state are verified.
- [ ] Production build, lint and related regressions pass.
- [ ] Admin test email and one important-message delivery succeed after a consented recipient and Gmail secrets are available.
- [ ] The deployed Site remains public and the anonymous landing page still loads.

Notes / decisions:
- Gmail 2-Step Verification and its App Password belong to the sending Google account; Supabase account MFA is a separate administrator-security setting and is not part of Werner's patient flow.
- Gmail sender credentials remain only in Supabase Edge Function secrets. Recipient addresses are companion-only protected data.
- Reference lock: preserve the current white/navy Wortnah system; use description-left/control-right settings rows, compact channel/status chips and a simple delivery list based on the reviewed Sunsama, Mercury and Zapier patterns.
- 11 September preflight: the live backend already has `email_notification_recipients`, `email_notification_deliveries` and active `send-message-email-alerts` version 14, but their canonical migration/function source is missing from this repository. The live function still permits normal-priority forwarding and only accepts an obsolete Site origin, so it must be reconciled rather than extended blindly.
- Next implementation order: reconcile the live schema into an idempotent repository migration; add an immutable German navigation-path snapshot to messages; add the canonical Edge Function source with strict important/very-important gating and Option B copy; add Admin recipient/test/delivery UI; add focused tests; then migrate, deploy, build, publish and run one consented test email.

### RELEASE-0.5.1 — Authenticated live acceptance

Status: In progress — DNS, HTTPS, and backend origin compatibility are active; authenticated live acceptance remains.

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

### FEATURE-002 — One communication source with live Admin-to-Werner synchronization

Status: Deployed and backend-verified; authenticated two-session live check remains

Goal:
Make Admin and Werner read and update the same communication hierarchy so that field counts, pages, visibility, order, edits and deletions agree immediately.

Acceptance criteria:
- [x] Pilot login selects the canonical Werner space instead of an arbitrary older active membership.
- [x] The canonical space contains the six approved level-1 areas plus recovered companion-created entries such as the current `Test` row.
- [x] Admin levels 1, 2 and 3 use the same stored hierarchy that Werner uses; authenticated live display remains to be checked after deployment.
- [x] Werner uses stored communication rows when they load successfully; an intentionally empty stored level remains empty instead of silently restoring hard-coded choices.
- [x] Add, edit, show/hide, move and delete changes trigger refreshes on other signed-in Werner/Admin screens; the two-session live check remains.
- [x] Focused checks cover canonical-space selection, database-first choices and the live content subscription.

Affected areas:
- Frontend: Membership selection, communication loading and live refresh.
- Backend/Supabase: Repair the canonical level-1 catalog and recover companion-created rows from stale pilot spaces.
- Database/migrations: One idempotent data-repair migration; no new table.
- Audio: No audio-pipeline change in this batch.
- Deployment: Sites version 4 and `pilot-login` version 18 are live.

Verification required:
- [x] Focused automated checks; all 41 automated checks pass.
- [x] Production build, lint and related regressions pass.
- [ ] Live Admin-to-Werner add/edit/hide/move/delete check with disposable data removed.

Notes / decisions:
- Preserve the existing calm Wortnah interface. This batch fixes source-of-truth behavior rather than redesigning the screens.
- Realtime remains protected by the existing row-level membership policy; no public data access is added.
- The live canonical hierarchy now has 7 visible level-1 rows, 64 visible level-2 rows and 1,024 visible level-3 rows. `pilot-login` version 18 is active.

### FEATURE-001 — Natural concise reading and simple choice-count control

Status: Implemented and locally verified; production Site deployment and authenticated checks remain.

Goal:
Give Werner natural German speech that reads only the information needed to make the current choice, with a one-tap control for changing how many choices are shown.

Acceptance criteria:
- [x] Diagnose the live robotic-audio report: the custom hostname was absent from the private-audio CORS allowlist, so its MP3 request could not complete in the browser and the app entered device-voice fallback.
- [x] Communication, guided-search and practice playback uses a natural German voice under the existing reviewed-MP3, generated-cache, device-fallback order.
- [x] Automatic page reading speaks the main prompt followed by the labels of the choices currently visible, in visual order.
- [x] For the example screen, the spoken content is equivalent to: `Worum geht es? Mein Tag. Familie und Menschen. Wie ich mich fühle. Gesundheit und Termine.`
- [x] Automatic page reading does not speak helper instructions, navigation, page counters, status text, or control labels such as Back, Repeat, Audio, and selection instructions.
- [x] Werner changes the visible choice count with one simple control that advances through `2 → 4 → 6 → 8 → 10 → 12`, then returns to 2 after the companion-set maximum.
- [x] If the companion maximum is below 12, values above that maximum are unavailable.
- [x] The choice-count control remains large and understandable in source and focused interface checks; authenticated live phone, tablet and desktop checks remain.
- [x] Focused tests cover concise auto-read content, audio-source selection and the allowed count sequence; live behavior remains on the acceptance checklist.

Affected areas:
- Frontend: Werner auto-read content, audio feedback and choice-count control.
- Backend/Supabase: Inspect current audio response metadata and private asset matching; change only if diagnosis proves it is necessary.
- Database/migrations: No change expected.
- Audio: Reviewed private MP3, generated cache and German device fallback diagnosis.
- Deployment: A new verified Site version will be required after implementation.

Verification required:
- [x] Reproduce and identify the custom-origin boundary that forced device speech instead of private MP3 playback.
- [x] Focused automated checks.
- [x] Production build and related regression checks.
- [ ] Live Werner check with real playback and each permitted choice count.

Decision:
- One more tap at the companion maximum returns to 2 so every allowed value remains reachable with the same simple action.

### DESIGN-001 — Round Wortnah logo

Status: Implemented and locally verified; production Site deployment remains.

Goal:
Use the supplied Wortnah mountain-and-hiker identity as a round, recognizable app mark across the visible interface and install metadata.

Acceptance criteria:
- [x] The supplied orange, navy, mountain and hiker identity remains recognizable and the exact name `WORTNAH` appears once inside the badge.
- [x] The visible app wordmark uses a true circular image without stretching at header and welcome-page sizes.
- [x] The browser/app install metadata uses the new round mark.
- [x] The mark is clear in the verified desktop render and has an accessible text name beside it; live phone and tablet checks remain.

Reference direction:
- Preserve the supplied artwork as the visual reference lock.
- Keep the circle as the only strong new accent within the existing calm blue interface.
- Omit the small tagline inside the badge because it becomes unreadable at app-header size; retain the app's existing visible tagline separately.

### DOMAIN-001 — Connect the GoDaddy hostname

Status: In progress

Goal:
Serve the existing public Wortnah Site at `https://www.wort-nah.com` while keeping the platform URL available during DNS propagation.

Acceptance criteria:
- [x] `www.wort-nah.com` is registered with the existing Wortnah Site.
- [x] The required CNAME and TXT validation records are saved and public in GoDaddy DNS.
- [x] Sites reports the custom domain and SSL certificate as active.
- [x] `https://www.wort-nah.com` returns HTTP 200 and visibly loads the current public Wortnah landing page.
- [x] The custom origin is accepted by the login and private-audio Edge Functions.
- [ ] Werner's two-step login and private-audio path work from `https://www.wort-nah.com` without changing any login value.

Notes / decisions:
- DNS verification values are supplied directly from Sites to GoDaddy and are not stored in repository documentation.
- Existing MX, nameserver and unrelated DNS records must remain unchanged.
- 11 September browser recovery: the already-open bare-domain tab still showed an old GoDaddy Airo page. A normal reload followed the working apex redirect to `https://www.wort-nah.com/`; the Wortnah profile-selection/login start with Werner, Admin 1 and Admin 2 was then visibly confirmed. Both the custom and platform URLs returned HTTP 200, so no DNS or Site deployment change was made.

### Next approved work

Add the next agreed feature here using the task format from `docs/WORKFLOW.md` before implementation.

## 7. Known issues / uncertainties

- The deployed 0.5.1 source is verified, but authenticated live acceptance remains incomplete until a user enters the two login values privately in the browser.
- The custom hostname previously forced device-voice fallback because private-audio browser requests were blocked at CORS. The deployed function origin repair is verified; authenticated MP3 playback and real-device fallback quality remain on the 0.5.2 live checklist.
- Current automatic page reading is reported to include secondary instructions and controls instead of only the main prompt and visible choice labels.
- Login and private audio are blocked from the new custom hostname because the deployed Edge Function origin allowlists contain only the earlier Site hostnames.
- GitHub `main` contains the verified 0.5.1 implementation. The live Site uses the same runtime files under the separately recorded Site source commit.
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
