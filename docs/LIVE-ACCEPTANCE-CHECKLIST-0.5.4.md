# Wortnah 0.5.4 live acceptance checklist

Date: 11 September 2026

Use disposable content only and remove it before closing the check. Never record access codes or the daily PIN.

## Release

- [ ] Exact verified source commit is deployed successfully to the existing public Site.
- [ ] `https://www.wort-nah.com` returns HTTP 200 and the anonymous profile page shows Werner, Admin 1 and Admin 2.

## Admin hierarchy

- [ ] Level 2 clearly shows the selected Level-1 area and only its stored themes.
- [ ] Changing the Level-1 selector replaces the list, counts and Werner preview with the selected branch.
- [ ] Opening a theme moves to Level 3 and preserves the full breadcrumb path.
- [ ] Level 3 shows only the selected theme's stored words and sentences.
- [ ] Level-specific add labels, search labels, visible/hidden counts and empty states are correct.
- [ ] Desktop, tablet and phone layouts have no clipped or overlapping controls.

## Live persistence and synchronization

- [ ] Add one disposable visible theme under the selected area and confirm it appears for Werner without logout.
- [ ] Edit, reorder, hide and show the disposable item and confirm each server-confirmed change reaches Werner.
- [ ] Confirm the saved state survives closing/reopening and logout/login.
- [ ] Confirm a second signed-in Admin or Werner session refreshes through realtime or foreground revalidation.
- [ ] Confirm a parent with children cannot be silently deleted.
- [ ] Delete the disposable item and confirm it disappears from both Admin and Werner.
