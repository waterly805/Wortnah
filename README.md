# Wortnah

**Sagen, was wichtig ist.**

Wortnah is a German-first accessible communication web app with optional supported speech practice. It is designed for modern browsers on Android, iPhone/iPad, Windows, macOS, and Linux and can be installed as a Progressive Web App.

## Current vertical slice

- Two interfaces: `Mein Bereich` and `Begleitung`
- Secure first-device enrollment through Supabase Auth
- Four-digit daily PIN stored only as a salted server-side hash
- Purpose-first guided message creation
- First-tap listen, second-tap confirm interaction
- German and English interface switching
- Browser speech synthesis with synchronized highlighting
- Normal, Important, and Very Important priorities
- Shared message board and read acknowledgement
- Basic supported listen-and-repeat practice
- User display, audio, and choice-count preferences
- Companion dashboard and one-time user invitation code
- Installable PWA shell with connection-loss recovery

## Durable project assets

- Recovered editable source and new version history: `https://github.com/waterly805/Wortnah`
- Live accounts, permissions, messages, settings, and KPI events: Supabase Frankfurt
- Product specification, schema copies, source snapshots, and handoff notes: OneDrive `ChatGPT Work Personal/Wortnah`

This repository currently starts from the latest complete editable recovery archive, version 0.3.0. The deployed application is newer, so compiled releases and the live app are comparison evidence rather than editable source. See `docs/SOURCE-RECOVERY-2026-09-06.md` before changing production.

The OneDrive archive is a recovery and documentation layer. It is not queried by the live app and does not replace Supabase for transactional data.

## Privacy boundary

Analytics must never include PINs, emails, personal names, message text, transcripts, photographs, recording URLs, or audio. Analysis agents receive pseudonymous interaction events only. No agent may change the live interface without approval from Begleitung.
