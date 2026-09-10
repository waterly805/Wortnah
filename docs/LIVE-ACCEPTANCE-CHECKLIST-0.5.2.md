# Wortnah 0.5.2 live acceptance checklist

Date: 10 September 2026

## Automated release gate

- [x] Lint succeeds.
- [x] Production build succeeds.
- [x] All 37 automated checks pass.
- [x] Automatic reading contains only the main heading and visible card labels.
- [x] Automatic reading uses the natural German device-voice selector.
- [x] The one-tap field control cycles through the allowed values within the Admin maximum.
- [x] Access code and daily PIN clear immediately after submission.
- [x] Admin communication and guided-search saves require one returned row.
- [x] All three browser Edge Functions contain the custom origin and an OPTIONS path.
- [x] All three deployed functions return HTTP 200 and `Access-Control-Allow-Origin: https://www.wort-nah.com` for preflight.
- [x] The circular logo assets are present and referenced by the app and install metadata.

## Public and signed-in browser checks

- [ ] Sites production deployment succeeds from the exact verified source.
- [ ] Site audience remains public and `https://www.wort-nah.com` returns HTTP 200.
- [ ] Anonymous visitor sees the new round logo and all three profiles.
- [ ] Wrong first code clears all four slots and accepts a second attempt.
- [ ] Correct first code opens the daily-PIN step with four empty slots.
- [ ] Wrong daily PIN clears all four slots and accepts a second attempt.
- [ ] Werner's field button advances through every value allowed by the Admin maximum and loops to 2.
- [ ] A reviewed communication phrase downloads and plays as MP3.
- [ ] A guided-search page reads only its heading and currently visible choices.
- [ ] A final guided-search phrase opens the expected search.
- [ ] With private audio intentionally unavailable, the best installed German device voice plays.
- [ ] Admin 1 can add, edit, hide/show, find, and delete a disposable communication entry.
- [ ] Admin 2 can add, edit, hide/show, find, and delete a disposable guided-search entry.
- [ ] Phone, tablet, and desktop layouts have no clipped controls or inaccessible actions.

Never record access codes, PINs, tokens, or temporary credentials in this checklist.

Public Site: https://www.wort-nah.com
