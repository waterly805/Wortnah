# Wortnah

**Sagen, was wichtig ist.**

Wortnah is a German-first accessible communication web app with optional supported speech practice. It is designed for modern browsers on Android, iPhone/iPad, Windows, macOS, and Linux and can be installed as a Progressive Web App.

## Current application

- Three fixed pilot profiles: Werner, Admin 1, and Admin 2
- Separate profile access and daily four-digit PIN checks
- Four-digit daily PIN stored only as a salted server-side hash
- Patient modes for Kommunikation, Internet suchen, and Üben
- Purpose-first guided communication using shared, companion-managed content
- First-tap listen, second-tap confirm interaction
- Patient choice layouts from 2 through 12, bounded by the companion maximum
- German and English interface switching
- Approved private MP3 audio first, cached server-side ElevenLabs second, and German device voice fallback
- Normal, Important, and Very Important priorities
- Reusable patient message history and read acknowledgement
- Companion-managed listen-and-repeat therapy content
- User display, audio, and choice-count preferences
- Companion content management, activity timeline, messages, settings, and usage overview
- Installable PWA shell with connection-loss recovery

## Durable project assets

- Recovered editable source and new version history: `https://github.com/waterly805/Wortnah`
- Live accounts, permissions, messages, settings, and KPI events: Supabase Frankfurt
- Product specification, schema copies, source snapshots, and handoff notes: OneDrive `ChatGPT Work Personal/Wortnah`

The current editable application is version 0.4.0. See `docs/IMPLEMENTATION-LOG-2026-09-07.md` and `docs/RELEASE-NOTES-0.4.0.md` for verification and rollout status.

The OneDrive archive is a recovery and documentation layer. It is not queried by the live app and does not replace Supabase for transactional data.

## Privacy boundary

Analytics must never include PINs, emails, personal names, message text, transcripts, photographs, recording URLs, or audio. Analysis agents receive pseudonymous interaction events only. No agent may change the live interface without approval from Begleitung.
