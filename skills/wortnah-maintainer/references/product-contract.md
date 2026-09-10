# Wortnah product contract

## People and roles

- Werner is the patient profile.
- Admin 1 and Admin 2 are companion profiles.
- Profile access and the daily PIN are separate four-digit checks. Never store or repeat their actual values in project guidance or documentation.

## Patient experience

- Primary modes: `Kommunikation`, `Internet suchen`, and `Üben`.
- Choice counts are exactly 2, 4, 6, 8, 10, or 12. A companion sets the maximum, and Werner independently chooses any supported count up to that maximum.
- First tap selects and previews audio. Second tap confirms the action.
- Page auto-read and continuous reading are configurable. Automatic page reading uses the device voice to avoid paid generation.
- Confirmed messages appear in patient history and support `Nochmal sprechen` and reuse/edit.
- Recent Internet searches remain on the device; full search text does not enter the shared activity timeline.
- Keep fallback content available when the network is interrupted.

## Companion experience

- Provide overview, communication/search content management, practice management, activity, messages, and settings.
- Companions can add, edit, show, hide, search, and delete appropriate content.
- Activity records support care and troubleshooting without exposing message text, search text, PINs, credentials, or audio data.
- Companions control the maximum visible patient choice count.

## Interface rules

- The current release is German-only. Hide English language controls and English editing fields until translation is ready, while preserving any existing English database values for a later release.
- Use plain German and large touch targets.
- Preserve the calm pastel palette across all 12 choices.
- Keep the patient path visually simple; place management density only in companion views.
- Maintain phone, tablet, and desktop layouts without clipped controls or overlapping navigation.

## Audio contract

1. Reuse a reviewed private MP3 when the normalized phrase, active space, voice, model, and language match.
2. Generate a missing phrase through server-side ElevenLabs and cache it privately for reuse.
3. Use the most natural available German device voice when server audio is unavailable.

Use only the Supabase secret named `ELEVENLABS_API_KEY`. No ElevenLabs secret may reach browser code, requests, error text, repositories, or documentation.
