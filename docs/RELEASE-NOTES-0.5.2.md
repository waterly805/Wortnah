# Wortnah 0.5.2

Date: 10 September 2026

This release makes the GoDaddy custom domain compatible with Wortnah login and private audio, shortens automatic reading to the current decision, replaces the field-count dropdown with a one-tap sequence, and introduces the supplied mountain-and-hiker logo as a round app mark.

## Custom-domain login and audio

- `pilot-login`, `wortnah-audio`, and `wortnah-audio-import` now accept `https://www.wort-nah.com` as an explicit browser origin.
- The deployed functions return the custom origin on successful browser preflight requests.
- No PIN, access-code, database schema, or secret value changed.

## Reading and audio

- Automatic reading speaks the main heading followed by the labels on the currently visible card page.
- Helper instructions, page counters, navigation, status text, and control names are excluded from automatic reading.
- Automatic reading now uses the same natural German device-voice ranking as other fallback speech.
- Choice taps retain the audio order: reviewed private MP3, generated private cache, then device voice.

## Werner's field count

- The header control is one large button instead of a dropdown.
- Each tap advances through 2, 4, 6, 8, 10, and 12, then returns to 2.
- The sequence stops at the Admin-set maximum before returning to 2.
- The selected value remains Werner's saved preference and still applies to communication, guided search, and practice.

## Round Wortnah logo

- The user-supplied orange sun, mountain, hiker, and WORTNAH identity were recomposed as a circular app mark.
- The visible wordmark, browser icon, Apple icon, and install manifest use the new mark.
- The existing separate tagline remains visible; the tiny tagline was omitted inside the icon for small-size readability.

## Reliability and verification

- Fixed long German role-card text so it can shrink and wrap on narrow screens.
- Updated the build wrapper to accept the Homebrew `gtimeout` command used on macOS.
- Lint and the production build pass.
- All 37 automated checks pass.
- Supabase production functions are deployed as `pilot-login` version 17, `wortnah-audio` version 3, and `wortnah-audio-import` version 3.

Public Site: https://www.wort-nah.com
