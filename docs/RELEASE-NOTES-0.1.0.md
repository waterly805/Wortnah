# Wortnah 0.1.0 — first private pilot build

Date: 3 September 2026

## Included

- Responsive interface for Samsung Internet, Chrome, Safari, Firefox, and Edge
- Phone, tablet, laptop, and desktop layouts from one codebase
- Installable Progressive Web App manifest and offline shell
- German-first interface with whole-app English switching
- `Mein Bereich` and `Begleitung` experiences
- Strong first-device account enrollment plus four-digit daily PIN
- Five-attempt PIN lockout and salted server-side PIN hashes
- One-time, 30-minute user invitation codes
- Purpose → topic → sentence guided communication flow
- First-tap speech preview and second-tap confirmation
- Browser text-to-speech with visual selection states
- Supported listen-and-repeat practice without clinical scoring
- Normal, Important, and Very Important message priorities
- Message delivery and companion read acknowledgement
- Companion dashboard with initial communication KPIs
- Private demo path using PIN `2468`; demo content is not saved
- Frankfurt Supabase operational backend with Row Level Security
- OneDrive project archive under `ChatGPT Work Personal/Wortnah`

## Data split

Supabase stores only live operational data needed for security, synchronization, message delivery, settings, and privacy-safe KPI events. OneDrive stores the durable product specification, schema copies, migrations, recovery notes, release notes, and source snapshots.

## Still planned

- Explicit voice-message recording and upload flow
- Email delivery for selected messages
- Expanded content management and configuration rollback
- Deterministic KPI aggregation and on-demand analysis
- Supervised UI, KPI, Topic, Privacy, and German Quality recommendations after enough real usage exists
- Target-device accessibility and interruption testing with the actual user
- Public/custom-domain release after the private pilot is accepted

This build supports communication and home practice. It does not diagnose, grade pronunciation, or replace professional speech-language therapy.
