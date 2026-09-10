# Wortnah 0.5.1 implementation plan

Date: 10 September 2026

This plan covers the reported production problems with audio quality, Werner's field count, the two-step PIN flow, the unfinished English interface, and the companion content editors. Work should proceed one batch at a time. Each batch must be reproduced, fixed, tested, and recorded before the next batch starts. No application or production change was made while preparing this plan.

## Current findings

### Audio

- Communication choices call the private-audio path first, but guided-search branch choices call the browser device voice directly. Those branch labels can therefore sound robotic even while reviewed final-search MP3 files work.
- The private-audio path can also fall back to device speech when the Edge Function, authentication, registry lookup, private download, media type, or browser playback fails.
- Automated tests confirm the intended response handling, but the authenticated live MP3 and actual device fallback were not completed during the 0.5.0 release check.

### Field count

- The application supports exactly 2, 4, 6, 8, 10, and 12 fields.
- Werner's choices are currently clamped by `space_settings.visible_topic_count`. A stored value of 4 makes four the maximum even when Werner wants more.
- The confirmed requirement is that Admin sets the maximum and Werner chooses any supported count up to that maximum.
- Admin must be able to set the maximum as high as 12. When Admin selects 12, Werner must see all six choices: 2, 4, 6, 8, 10, and 12.

### Language scope

- English translation is not ready for this release.
- The app should be German-only for now: hide English switches and English editing fields from Werner and Admin.
- Existing English values must remain stored and unchanged so translation work can resume later. Hiding English fields must not blank them during an edit.

### Two-step PIN flow

- The access-code and daily-PIN screens reuse the same stateful `PinPad` component.
- An error clears the current digits, but a successful transition from step 1 to step 2 does not explicitly reset or remount the keypad.
- Both failed attempts and transitions to the next PIN step need an empty, focused input with buttons enabled for the next attempt.

### Companion content editors

- Communication and guided-search create/update/delete calls exist, but they have not been verified end to end in the public 0.5.0 release.
- The current editors are dense inline panels. Save progress, success, validation, hierarchy, and the relationship between the form and Werner's preview need clearer visual treatment.
- The database/RLS boundary must be verified before treating this as only a frontend problem. An update that affects zero rows must be reported as a failure rather than appearing successful.

## Batch 1 — Restore natural audio

Goal: reviewed phrases use their private MP3, new phrases use the server-generated cache, and device speech is only the last fallback.

1. Reproduce the issue in a signed-in Werner session on the affected device/browser.
2. Capture only non-secret diagnostics: phrase, app screen, response status, content type, `X-Wortnah-Audio-Mode`, playback result, and fallback reason.
3. Test one reviewed communication phrase, one guided-search branch label, one reviewed final search phrase, and one newly added phrase.
4. Route guided-search branch previews through the same private-audio pipeline instead of directly calling device speech.
5. Fix any authenticated download or browser playback failure found in the live trace. Preserve the reusable unlocked audio element needed by iPhone/iPad.
6. Keep the required order: reviewed private MP3, generated private cache, natural German device voice.
7. Add focused tests for branch-search audio routing, MP3 playback, cached reuse, and fallback.

Acceptance:

- Reviewed communication and search phrases return and play `audio/mpeg` with the expected server audio mode.
- A missing phrase is generated once on the server and reused from the private cache.
- Device speech is heard only when the server explicitly cannot supply audio.
- The chosen German device fallback is the most natural available `de-DE` voice and respects the selected speed.
- Repeated playback works in the same session on desktop and the user's target phone/tablet.

## Batch 2 — Repair the Admin maximum and Werner's field choice

Goal: Admin can set a maximum from 2 through 12, and Werner can choose any supported amount up to that maximum.

1. Confirm the live preference and space-setting values without exposing personal data.
2. Verify that the Admin control offers 2, 4, 6, 8, 10, and 12 and that saving it updates the correct active space.
   Confirm this with both Admin 1 and Admin 2 because the maximum is shared at space level.
3. Make Werner's selector show every supported value less than or equal to Admin's saved maximum.
4. When Admin raises the maximum, refresh Werner's allowed options immediately without requiring a new login.
5. Persist Werner's own selection in `profile_preferences.choice_count`. If Admin later lowers the maximum, normalize Werner's value to the new maximum once and show the resulting value clearly.
6. Set the active maximum to 12 during the authorized live verification so Werner can choose all six supported values.
7. Verify communication, guided search, and practice all use Werner's selected count and page correctly on small screens.

Acceptance:

- With Admin maximum 4, Werner sees 2 and 4 only.
- With Admin maximum 12, Werner sees 2, 4, 6, 8, 10, and 12.
- Selecting 12 persists across navigation, refresh, and a new authenticated session.
- Communication, search, and practice each show up to 12 available choices with usable paging.
- Werner cannot select more than Admin's saved maximum, and Admin can always raise that maximum to 12.

## Batch 3 — Reset both PIN steps reliably

Goal: every PIN attempt starts from a clean four-digit input.

1. Give the access-code step and daily-PIN step distinct component identity, or pass an explicit reset token when the step/attempt changes.
2. Clear digits immediately after submitting an incorrect access code.
3. Clear digits before showing the daily-PIN screen after a correct access code.
4. Clear digits after an incorrect daily PIN and restore focus for retry.
5. Preserve Enter/Return, visible submit, cancel, clear, backspace, loading, lockout, and retry behavior.
6. Prevent double submission while either check is running.

Acceptance:

- Wrong step-1 code: error appears and all four digits clear.
- Correct step-1 code: step 2 opens with four empty slots.
- Wrong step-2 PIN: error appears and all four digits clear.
- A second attempt works without leaving or refreshing the page.
- No PIN, access code, or session value appears in logs, tests, documentation, or error output.

## Batch 4 — Make the current release German-only

Goal: remove unfinished English controls without deleting translation data needed later.

1. Remove or hide the English language switch from profile selection, Werner's header, settings, and Admin screens.
2. Keep all visible navigation, labels, validation, empty states, and success/error messages in clear German.
3. Remove English label and English final-query inputs from communication, guided-search, and practice editors.
4. Change update payloads so editing a German value does not overwrite an existing English value with an empty string or `null`.
5. Keep existing English columns and stored values unchanged; this batch requires no destructive database migration.
6. Add a focused check confirming that a German-only edit preserves hidden English data.

Acceptance:

- No English toggle or unfinished English form field appears on any current user or Admin screen.
- All current flows remain usable in German.
- Editing German content leaves existing English database values unchanged.
- English can be restored later without recovering deleted translation data.

## Batch 5 — Make communication and search CRUD dependable

Goal: Admin 1 and Admin 2 can add and edit content with an immediate, accurate result.

1. Verify current Supabase changelog/docs, grants, RLS policies, ownership triggers, foreign keys, and Data API exposure before changing the database.
2. Use disposable, clearly named production test rows in the authorized Wortnah space, then remove them after verification.
3. Test German communication entries at purpose, topic, and detail levels: add, edit, show/hide, reorder, find, and delete.
4. Test German guided-search entries at levels 1–4: parent selection, branch/leaf rules, final query, add, edit, show/hide, find, and delete.
   Run the core add/edit check once as Admin 1 and once as Admin 2.
5. Make mutations return the affected row and treat a zero-row update as an error.
6. Validate required parent/topic relationships before sending a request.
7. Refresh both the admin list and Werner's active content after a successful save so changes appear without a full page reload.
8. Show specific, safe validation errors and a clear saved state; keep backend details and identifiers out of the interface.

Acceptance:

- Each create returns one row in the correct space and level.
- Each edit persists after reload and appears in Werner's matching path.
- Show/hide and ordering changes are reflected immediately.
- Cancel discards unsaved changes.
- Failed and zero-row mutations remain open with actionable guidance.
- Disposable verification rows are removed after the test.

## Batch 6 — Redesign the companion editors

Goal: make add/edit work easy to understand without adding visual noise to Werner's experience.

The `frontend-design` skill will supplement the mandatory Refero workflow. Refero remains the source for reference research and pattern selection; `frontend-design` will sharpen typography, hierarchy, copy, layout, and the final anti-template critique.

1. Research several real content-management editor screens and multi-level taxonomy flows before designing.
2. Preserve the existing Wortnah reference lock: calm white canvas, restrained blue actions, readable dark text, and pastels reserved for Werner's choices.
3. Create a decision ledger linking each major layout, component, and visual choice to a reference or an accessibility requirement.
4. Replace the dense inline form with a focused editing surface that clearly separates:
   - current location and hierarchy;
   - required German content;
   - parent/topic selection;
   - visibility and practice settings;
   - Werner preview;
   - cancel and save actions.
5. Keep one obvious primary action, sentence-case labels, visible focus, large touch targets, useful empty/error/saving/saved states, and no decorative dashboard clutter.
6. Make the layout responsive: a stable editor beside the list on desktop and a focused full-width editor on phone/tablet.
7. Render and visually compare the implementation with the locked references at phone, tablet, and desktop sizes.

Acceptance:

- Admin can always tell whether they are adding or editing, which level/path is affected, and what Werner will see.
- Required fields and leaf-only search-query rules are clear before save.
- Save cannot be submitted twice; success and failure are unmistakable.
- Keyboard focus order and touch targets are usable.
- No controls overlap or clip at supported sizes.
- The result follows the Wortnah visual language and does not resemble a generic card-dashboard template.

## Batch 7 — Full-screen audit and integrated release verification

1. Run focused authentication, choice-policy, patient-flow, guided-search, audio, CRUD, and rendered-layout tests.
2. Run the complete production build and resolve every release-relevant failure.
3. Audit every screen at phone, tablet, and desktop sizes:
   - public profile selection;
   - access code and daily PIN;
   - Werner home, communication, guided search, practice, messages, and settings;
   - Admin overview, communication content, search content, practice, activity, and settings.
4. Check each relevant loading, empty, offline, validation, saving, saved, retry, and error state.
5. Confirm the bottom actions and all 12-choice layouts remain reachable without clipping, including browser zoom/text enlargement.
6. Confirm refresh, sign-out/sign-in, and the installed-app/service-worker path do not restore an older field maximum, language control, or cached interface.
7. Verify the repaired flows in a signed-in live browser on the public Site.
8. Update the acceptance checklist, implementation log, release notes, and recovery package.
9. Copy durable documentation and release artifacts to the existing Wortnah OneDrive folder.
10. Push the exact verified source, save one Site version, deploy it publicly, and wait for terminal success.

Final acceptance:

- Natural reviewed/generated audio is confirmed, with device voice used only as fallback.
- Admin sets the maximum up to 12, and Werner selects any supported count up to it.
- Both PIN steps reset correctly after success and failure.
- Communication and search add/edit operations work and look clear on phone, tablet, and desktop.
- The current app and editors show German only while preserving stored English values for later.
- The public deployment succeeds and the repaired production flows are checked end to end.

## Completion record

Implemented on 10 September 2026 in the agreed order.

- Batch 1: guided-search branches and repeats now use the private audio pipeline; natural German device-voice ranking has focused tests.
- Batch 2: live maximum confirmed at 12; Werner's selector clearly offers every supported value through the Admin maximum.
- Batch 3: both four-digit steps clear on submission and use distinct component identities.
- Batch 4: current screens and editors are German-only; hidden English values are excluded from update payloads.
- Batch 5: communication and search create/update calls return one affected row; zero-row writes fail visibly.
- Batch 6: companion editors use grouped fields, a Werner preview, progress/error/success states, responsive stacking, and one clear save action.
- Batch 7: production build, lint, and all 30 automated checks pass. Public Sites version 3 deployment and the anonymous landing page are verified. Authenticated Werner, device fallback, responsive layout and disposable Admin CRUD checks remain open in the live acceptance checklist and project state.
