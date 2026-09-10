# Wortnah 0.5.0

Date: 9 September 2026

This release completes the seven agreed usability and reliability changes.

## Werner

- Home, field count, audio state, and DE/EN are always available in the top bar.
- Communication, Internet search, and practice use the selected 2/4/6/8/10/12 cards within the companion maximum.
- Card sets page cleanly with arrows and page status; Back, Repeat, and Audio stay available at the bottom.
- Internet search now guides Werner through up to four calm levels and opens one exact final search sentence.
- Recent searches can be heard again or reopened from the device-only history.

## Admin 1 and Admin 2

- Content editing shows the current level, full path, and a preview of Werner's visible cards.
- Communication and Internet-search content have separate editors.
- Internet-search entries support levels 1–4, parent sections, German/English labels, final queries, visibility, order, editing, and deletion.

## Audio

- Reviewed MP3 playback uses one unlocked audio player so protected files can start after an authenticated request on mobile browsers.
- All 36 reviewed Internet-search phrases are mapped exactly to the guided search.
- The fallback remains the server-side ElevenLabs cache followed by the device's natural German voice.

## Login

- Access code and daily PIN are clear, separate steps.
- Both screens use an explicit Continue action and accept the Return/Enter key.
- Cancel, clear, backspace, loading, and retry states are visible and predictable.

## Verification

- 20 focused behavior checks pass.
- The app module parses successfully.
- Production contains 36 of 36 reviewed Internet-search audio assets.

## Public production publication

Published 9 September 2026. Sites reports a successful production deployment, and the Site audience is public (anyone with the link).

https://wortnah-kommunikation.danny-ly-1897.chatgpt.site

The full production build succeeds. Of 25 automated checks, 24 pass; the starter component catalog CSS check fails because the generated output does not include its expected `scrollbar-width: thin` utility. All focused Wortnah login, guided-search, choice-policy, private-audio, and fallback checks pass. No application source was changed during publication.

An anonymous HTTP request returns 200. The live browser shows the three profiles and the explicit first access-code step. Successful two-step login, guided-search interaction, downloaded MP3 playback, and device-voice playback still require a signed-in live browser session; they are not yet certified by this publication check.
