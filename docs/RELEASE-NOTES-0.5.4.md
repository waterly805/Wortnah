# Wortnah 0.5.4

Date: 11 September 2026

This release makes the companion communication editor follow the same live content tree Werner uses.

## Hierarchical Admin editor

- Level 2 now shows only the themes inside one selected Level-1 area.
- Level 3 shows only the words and sentences inside the selected Level-2 theme, while preserving the complete path.
- The breadcrumb, branch selectors, search copy, add action, item counts and Werner preview all follow the active branch.
- A folder action opens a theme directly at Level 3.
- The editor remembers its last useful location as a device-local interface preference; communication content remains live Supabase data.
- Add, edit, visibility, ordering and delete operations remain server-confirmed and scoped to the active Wortnah space.
- Parents with child content cannot be silently deleted, and populated themes cannot be moved in a way that would break their children.
- Realtime synchronization is reinforced with safe refresh when a signed-in window returns to the foreground.

## Verification

- Lint and the bounded production build pass.
- All 47 automated checks pass, including six focused hierarchy and synchronization checks.
- No Supabase migration or Edge Function change is required; the release reuses the shared live hierarchy established in 0.5.3.
- Public Sites deployment and authenticated Admin-to-Werner acceptance are pending.

Public Site after successful deployment: https://www.wort-nah.com
