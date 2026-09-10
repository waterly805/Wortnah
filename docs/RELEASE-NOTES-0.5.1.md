# Wortnah 0.5.1

Date: 10 September 2026

This release repairs natural audio routing, expands Werner's visible field choices, resets both PIN steps reliably, presents the current product in German only, and makes companion content edits clearer and dependable.

## Audio

- Every communication and guided-search preview now requests private Wortnah audio first.
- The required order remains reviewed MP3, generated and cached private MP3, then device voice.
- Device fallback ranks natural and enhanced German voices ahead of compact or robotic voices while respecting the chosen voice preference.
- The live private bucket contains all 180 reviewed MP3 objects.

## Werner

- Admin can set the shared maximum to 2, 4, 6, 8, 10, or 12 fields; the active space is set to 12.
- Werner can choose every supported count up to that maximum from the header or Meine Einstellungen.
- The selected count remains Werner's own saved preference across communication, guided search, and practice.
- The field-count control now names what the number changes.

## Login

- Submitting either four-digit step clears all digits immediately.
- A successful access-code check opens the daily-PIN step with empty slots.
- A failed access-code or daily-PIN check leaves an empty, focused keypad ready for the next attempt.
- Loading still prevents duplicate submissions; Enter/Return, clear, backspace, and cancel remain available.

## German-only release

- English switches and English editing fields are hidden from all current user and Admin screens.
- Existing English database values are preserved during German edits for a later translation release.
- Newly created content uses the existing empty English defaults without changing the schema.

## Admin content editing

- Communication and guided-search saves now return the affected database row; a blocked or zero-row update is shown as a failure.
- Updates are restricted to the active Wortnah space in the client request.
- Editors separate the current hierarchy, required German text, settings, Werner preview, and save action.
- Save buttons prevent duplicate writes and clear success messages confirm the result.
- Guided-search leaf guidance explains when a finished search sentence is needed.

## Verification

- Production build completed successfully.
- Lint completed successfully.
- All 30 automated checks passed, covering private audio, device fallback, choice limits, guided search, PIN behavior, German-only presentation, row-returning Admin edits, rendered HTML, and shared UI components.
- Supabase remained released; no schema or Edge Function change was required.
- Sites version 3 deployed successfully on 10 September 2026 from verified Site source commit `6d5929d80b28497ed6afdd8beca2f35bc7e67b21`.
- The Site audience is public and the anonymous production landing page was verified with Werner, Admin 1 and Admin 2.
- Authenticated Werner, device fallback, responsive layout and disposable Admin CRUD checks remain tracked in `docs/LIVE-ACCEPTANCE-CHECKLIST-0.5.1.md` and `docs/PROJECT_STATE.md`.

Public Site: https://wortnah-kommunikation.danny-ly-1897.chatgpt.site
