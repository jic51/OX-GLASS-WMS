# Acopio — Backlog

Running list of agreed-upon work, roughly in priority order. Items move out of
here once they ship (the commit message is the record of what changed and why).

## Next up

1. **Clean master template Sheet** for customer distribution. Blocking for real
   sales: sheet DATA copies (unlike Script Properties), so a template carrying
   OX's own movements/users would leak that data and admin access into every
   customer copy. Needs: code pasted in, wizard never run, zero rows. Also the
   only way to verify what the publish step reports on a genuinely fresh copy.
2. **Fix how the suggestion deck fades.** Opacity is applied to each CARD, so
   piled cards composite one translucent layer over another: the opacities add
   up, text from the cards underneath shows through the one on top, and the
   pile reads as a smudge with letters and edges bleeding through it.
   Fix: move the opacity onto the `.cfg-deck` CONTAINER instead. The browser
   composites the stack first and fades the finished result as a single layer,
   so the front card stays legible, the ones behind contribute only their
   edges, and nothing shows through. Small change, needs a visual check in both
   themes.

3. **Polish the wizard's Copy button animation** — the checkmark transition works
   now, but the in/out timing still feels abrupt.
4. **Polish the company logo placement** in the topbar — it renders, but the
   sizing/position isn't what Jose wants yet.
5. **User-menu rework** — move the 🐞 report-a-problem button out of the
   floating bottom-right corner and into the topbar cluster with the account
   email and settings. Do it as part of that menu's redesign, not on its own.
   Frees the corner for the suggestion deck, which currently has to sit above
   the 🐞 to avoid it.

## Polish pass (do at the end, after the functional work)

- **Audit every animation in the app.** Some look bad as they are, and several
  places that should have motion have none. Example raised: a merge-suggestion
  box currently just vanishes — it should collapse quickly and let the boxes
  below slide up into the freed space. Same question for toasts, modal
  open/close, row insertion in Movements, the deck fan, and tab switches. One
  pass, one consistent set of durations/easings, rather than tuning them one at
  a time.

## Known limits (investigated, not fixable from code)

- **Self-deploy automation** — blocked by Google's hidden default Cloud project
  behind every Apps Script project. Can't enable APIs on it; switching to a
  standard project is irreversible and unavailable to personal accounts.
- **"Google hasn't verified this app" / missing Privacy Policy warnings** —
  permanently unavoidable per-customer under the copy-per-customer model, same
  root cause as above.
- **Inline PDF rendering** — Chrome's PDF viewer is a plugin, and plugins don't
  instantiate inside Apps Script's sandboxed googleusercontent.com frame. Worked
  around in v9.11 by showing Drive's server-side render of page 1; a true
  scrollable viewer would need PDF.js bundled in (~100 lines + testing).
- ~~Google's own Drive Picker~~ — NOT actually blocked. The first read of this
  was wrong: the Picker does need an API key from a standard Cloud project, but
  that project is Jose's and is configured once for all customers, not one per
  customer copy. Moved to Features as real work.

## Features

- **Real Google Drive Picker** (replaces the paste-a-link box). Needs a Cloud
  project Jose owns: Picker API enabled, an API key, and an OAuth Client ID —
  configured ONCE by him, reused by every customer copy, the same way
  OAUTH_CLIENT_ID already works for sign-in. Doing the picker browser-side with
  the end user's own token also removes the privacy problem the link box has:
  each person browses THEIR Drive instead of the owner's. Blocked only on Jose
  creating that Cloud project.

- QR / barcode scanning + label printing
- Installable PWA + offline queue
- Granular per-role permissions (prerequisite for any costs/pricing module)
- Live sync between open windows
- Editable column labels (cosmetic)
- "Save with cancel-X" delayed-confirm animation on movement submit
- App icon redesign
- Responsive / device audit

## Operational

