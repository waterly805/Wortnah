# Wortnah 0.5.3

Date: 10 September 2026

This release makes Communication use one canonical Admin-managed hierarchy for Werner and both companion profiles.

## Shared communication content

- Pilot login now returns and selects the canonical Werner space instead of relying on an arbitrary older membership.
- The six approved first-level areas are stored in the same hierarchy as all topics and phrases.
- The companion-created `Test` entry was recovered from an older pilot space without deleting the older source row.
- A successfully loaded empty level remains empty, so Admin hide/delete actions are not undone by hard-coded fallback content.
- Signed-in Admin and Werner screens subscribe to communication changes and refresh their current level after add, edit, visibility, order or delete updates.

## Verification

- The canonical live database contains 7 visible areas, 64 visible topics and 1,024 visible phrases.
- `pilot-login` version 18 is active and returns the canonical space with the login handoff.
- Lint and the production build pass.
- All 41 automated checks pass.
- Sites version 4 deployed successfully from the exact verified implementation commit and remains public at the custom hostname.
- An authenticated two-session Admin-to-Werner check remains before full live acceptance.

Public Site: https://www.wort-nah.com
