# Wortnah 0.4.0 live acceptance checklist

Use this checklist only after GitHub, Supabase, the approved MP3 import, and the new Site version have completed. Test the public link in a private browser window and on Werner’s normal device.

Automated production verification completed on 8 September 2026: Site version 1 is live, both migrations are applied, the current login/audio functions are active, and all 180 approved audio rows have matching private files. The public-audience setting and the device checks below remain manual acceptance steps.

## Access

- The public link opens without a ChatGPT workspace error.
- Werner, Admin 1, and Admin 2 are the only profile choices.
- Each profile accepts its stored four-digit access code once.
- A separate daily PIN screen appears after profile access.
- A wrong value shows a clear error and allows a new attempt.
- A slow request shows `wird geprüft` and cannot be submitted twice.

## Werner

- Kommunikation, Internet suchen, Üben, Mitteilungen, and Einstellungen open correctly.
- Kommunikation shows the selected 2, 4, 6, 8, 10, or 12 cards without exceeding the companion maximum.
- The first tap speaks and highlights a card; the second tap confirms it.
- A confirmed message is sent, appears in Mitteilungen, can be heard again, and can be reused.
- Internet search follows the same two-tap behavior and opens the selected search.
- Recent searches stay available on the device.
- Üben shows the companion-managed phrases and plays the selected phrase.
- Automatic page reading can be turned on and off in Einstellungen.

## Admin 1 and Admin 2

- Overview shows recent messages and profile status.
- Content can add, edit, hide, show, search, and delete a test choice.
- Practice can add, edit, preview, and delete a test phrase.
- Activity shows recent actions without message text, search text, PINs, or audio data.
- Messages can be opened and marked as read.
- Settings can set the maximum to 12, and Werner can then select 12 choices.

## Audio priority

- An approved phrase plays the imported MP3.
- Repeating it during the same session starts quickly.
- A phrase outside the approved pack generates once through ElevenLabs and plays again from cache.
- If ElevenLabs is unavailable, a natural German device voice still speaks the phrase.
- No API key appears in browser source, requests, or error messages.

## Device and recovery

- Phone layouts remain readable in portrait orientation with large touch targets.
- Tablet and desktop layouts do not overlap or cut off controls.
- Turning the network off shows the offline state and keeps the current choice visible.
- Signing out returns to the three-profile screen.

Record any failed line with the profile, device, browser, exact screen, and time. Do not record access codes or PINs.
