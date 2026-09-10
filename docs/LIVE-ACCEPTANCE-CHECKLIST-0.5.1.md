# Wortnah 0.5.1 live acceptance checklist

Date: 10 September 2026

## Automated release gate

- [x] Production build succeeds.
- [x] Lint succeeds.
- [x] All 30 automated checks pass.
- [x] Active Admin maximum is 12.
- [x] 180 reviewed private MP3 objects are present for Werner's active space.
- [x] Guided-search branch previews and repeats use the private audio pipeline.
- [x] Device fallback ranks natural German voices ahead of compact robotic voices.
- [x] Access code and daily PIN clear on every submission.
- [x] German edits preserve hidden English values.
- [x] Admin communication and search saves require one returned row.

## Public and signed-in browser checks

- [x] Sites version 3 deployed successfully from verified source commit `6d5929d80b28497ed6afdd8beca2f35bc7e67b21`.
- [x] Site audience is public and the production URL returns HTTP 200.
- [x] Anonymous visitor can open the public URL and see Werner, Admin 1, and Admin 2.
- [ ] Wrong first code clears all four slots and accepts a second attempt.
- [ ] Correct first code opens the daily-PIN step with four empty slots.
- [ ] Wrong daily PIN clears all four slots and accepts a second attempt.
- [ ] Werner can choose 2, 4, 6, 8, 10, and 12 fields.
- [ ] A reviewed communication phrase downloads and plays as MP3.
- [ ] A guided-search branch label uses private audio and a final phrase opens the expected search.
- [ ] With private audio intentionally unavailable, the best installed German device voice plays.
- [ ] Admin 1 can add, edit, hide/show, find, and delete a disposable communication entry.
- [ ] Admin 2 can add, edit, hide/show, find, and delete a disposable guided-search entry.
- [ ] Phone, tablet, and desktop layouts have no clipped controls or inaccessible actions.

Never record access codes, PINs, tokens, or temporary credentials in this checklist.

Public Site: https://wortnah-kommunikation.danny-ly-1897.chatgpt.site
