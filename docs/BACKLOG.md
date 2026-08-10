# Acopio — Backlog

Running list of agreed-upon work, roughly in priority order. Items move out of
here once they ship (the commit message is the record of what changed and why).

## Next up

1. **Clean master template Sheet** for customer distribution. Blocking for real
   sales: sheet DATA copies (unlike Script Properties), so a template carrying
   OX's own movements/users would leak that data and admin access into every
   customer copy. Needs: code pasted in, wizard never run, zero rows. Also the
   only way to verify what the publish step reports on a genuinely fresh copy.
2. **Polish the wizard's Copy button animation** — the checkmark transition works
   now, but the in/out timing still feels abrupt.
3. **Polish the company logo placement** in the topbar — it renders, but the
   sizing/position isn't what Jose wants yet.

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

- Admin email alert on critical errors
