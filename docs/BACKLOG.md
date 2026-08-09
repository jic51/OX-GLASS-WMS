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
- **Google's own Drive Picker dialog** — needs an API key from a standard Cloud
  project, which customer copies (hidden default project) cannot create. Shipped
  a paste-a-Drive-link flow in v9.12 instead; it needs no Cloud config, so it
  works on every copy. Revisit only if the distribution model ever moves off
  copy-per-customer.

## Features

- QR / barcode scanning + label printing
- Installable PWA + offline queue
- Granular per-role permissions (prerequisite for any costs/pricing module)
- Live sync between open windows
- Dashboard photos panel redesign (drop the large per-location photo box, match
  the compact document chips)
- `.xlsx` direct import (today: CSV only)
- Editable column labels (cosmetic)
- "Save with cancel-X" delayed-confirm animation on movement submit
- App icon redesign
- Responsive / device audit

## Operational

- Rate limiting / abuse throttling
- Admin email alert on critical errors
