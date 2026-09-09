# Wortnah 0.4.0

This release turns the recovered prototype into a complete patient and companion application.

## Patient experience

- Kommunikation, Internet suchen, and Üben now share the same calm, accessible visual language.
- Choices support 2, 4, 6, 8, 10, or 12 visible cards within the companion-set maximum.
- The first tap previews a choice; the second tap confirms it.
- Optional page reading speaks the heading and visible cards one after another and can be switched off in patient settings.
- Üben now follows the same 2-to-12 patient choice count as the other patient modes.
- Recent messages can be heard again or loaded back into the builder for editing.
- Profile access and the daily PIN are both enforced for the three agreed accounts.
- Access and PIN checks show progress and prevent duplicate submissions on slow connections.
- Shared vocabulary and practice content appear automatically when the patient is online, with safe built-in content available if the connection is interrupted.

## Companion experience

- Manage communication and search choices, sections, and visibility.
- Manage therapy practice phrases and difficulty.
- Review activity and messages without exposing audio credentials.
- Set the maximum number of patient choices.
- Use responsive navigation on phones, tablets, and desktop screens.

## Audio

- Approved MP3 files have first priority and can be reused without ElevenLabs credits.
- Missing phrases use server-side ElevenLabs generation and private caching.
- The natural German device voice remains the final fallback.
- Recently played private MP3s are reused in memory during the active session for faster repeat playback.
- A controlled companion-authenticated import is ready for all 180 reviewed MP3 files; every file is checksum-verified before upload.
- The new server path uses only `ELEVENLABS_API_KEY` and keeps it outside the browser.

## Verification and rollout

- The production build and 17 focused behavior checks pass.
- Site version 1 is live at `https://wortnah-kommunikation.danny-ly-1897.chatgpt.site`.
- The two pending database migrations and the updated login and audio functions are active in production.
- All 180 approved MP3 files are registered in Werner's active space, and every registry path has a matching private stored file.
- The Site currently retains owner-only access. Independent devices require the Site Share setting to be changed to public.
