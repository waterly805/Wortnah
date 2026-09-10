# Wortnah

**Sagen, was wichtig ist.**

Wortnah is a German-first accessible communication web app with optional supported speech practice. It is designed for modern browsers on Android, iPhone/iPad, Windows, macOS, and Linux and can be installed as a Progressive Web App.

## Start here

For current development or release work, read these first:

1. `docs/PROJECT_STATE.md` — live operational source of truth.
2. `docs/WORKFLOW.md` — required implementation and release workflow.
3. `AGENTS.md` — repository-level Wortnah guidance.
4. `docs/WORKSPACE-STRUCTURE.md` — location and synchronization rules for the local working copy, GitHub and OneDrive.

Do not reconstruct current requirements from old chat summaries or dated implementation logs when these current-state files are available.

## Current application

- Three fixed pilot profiles: Werner, Admin 1, and Admin 2
- Separate profile access and daily four-digit PIN checks
- Four-digit daily PIN stored only as a salted server-side hash
- Patient modes for Kommunikation, Internet suchen, and Üben
- Purpose-first guided communication using shared, companion-managed content
- First-tap listen, second-tap confirm interaction
- Patient choice layouts from 2 through 12, bounded by the companion maximum
- German-only interface for release 0.5.1
- Approved private MP3 audio first, cached server-side ElevenLabs second, and German device voice fallback
- Normal, Important, and Very Important priorities
- Reusable patient message history and read acknowledgement
- Companion-managed listen-and-repeat therapy content
- User display, audio, and choice-count preferences
- Companion content management, activity timeline, messages, settings, and usage overview
- Installable PWA shell with connection-loss recovery

## Durable project assets

- Canonical source, current technical state, tests, migrations and release history: GitHub `waterly805/Wortnah`
- Local editable working copy: `/Users/DL/Documents/ChatGPT/Wortnah`
- Live accounts, permissions, messages, settings, and KPI events: Supabase Frankfurt
- Human-readable documentation and recovery archives: OneDrive `ChatGPT Work Personal/Wortnah`

The current recorded application release is **0.5.1**. See `docs/PROJECT_STATE.md`, `docs/RELEASE-NOTES-0.5.1.md`, and `docs/LIVE-ACCEPTANCE-CHECKLIST-0.5.1.md` for current state and verification requirements.

GitHub is the canonical technical source of truth. The local repository is its working copy. The OneDrive archive must not become a separate editable codebase. Supabase remains the source for transactional application data.

## Privacy boundary

Analytics must never include PINs, emails, personal names, message text, transcripts, photographs, recording URLs, or audio. Analysis agents receive pseudonymous interaction events only. No agent may change the live interface without approval from Begleitung.
