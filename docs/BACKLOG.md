# Acopio — Backlog

Running list of agreed-upon work, roughly in priority order. Items move out of
here once they ship (the commit message is the record of what changed and why).

## Next up

1. **Clean master template Sheet** — tooling shipped in v9.30 (Advanced →
   Erase everything / Check if clean). Remaining work is Jose's and cannot be
   done from code: rename the Apps Script project, share as Viewer, hand out the
   /copy link, and copy it once himself to see what a customer sees. See
   docs/MASTER-TEMPLATE.md.
2. **Polish the wizard's Copy button animation** — the checkmark transition works
   now, but the in/out timing still feels abrupt.
3. **Polish the company logo placement** in the topbar — it renders, but the
   sizing/position isn't what Jose wants yet.
4. **User-menu rework** — move the 🐞 report-a-problem button out of the
   floating bottom-right corner and into the topbar cluster with the account
   email and settings. Do it as part of that menu's redesign, not on its own.
   Frees the corner for the suggestion deck, which currently has to sit above
   the 🐞 to avoid it.

5. **Apply the silent-update pattern to the rest of Settings.** v9.37 fixed it
   for catalog add/rename/delete: patch what is on screen instead of re-fetching
   and repainting, and drop the "Saving… / Saved ✓ / Loading…" sequence. The
   same churn is still in the other Settings screens — Materials, Directory,
   users, the archive-cutoff setting, rack photos. One pass over all of them.

6. **Narrow the cards on a phone.** On a small phone screen the notification
   cards and the bell's suggestion cards are as wide as the screen and squat,
   and they cover the app. Below the phone breakpoint only (they are right at
   tablet width and up): halve their width and let them grow taller — the
   bottom-left system message about double its current height at half the
   width, the bell's cards the same height as now at half the width. Not
   smaller — narrower. Nothing above the phone breakpoint changes.

7. **Stop the tab bar from jumping between rows.** At tablet width the tabs sit
   on their own line under the company name; past a certain width they jump up
   beside the logo, and the whole page shifts as they go. Keep them on the line
   below the logo at every width, and centre them horizontally as the window
   grows instead of moving them up.

8. **"Set up now" that goes nowhere should not count as a dismissal.** The
   bottom-right setup nudge ("You haven't set up your suppliers, projects yet")
   snoozes for seven days the moment either button is clicked — including
   "Set up now". So opening Settings, not touching anything and closing it has
   exactly the effect of "Not now", which is not what the person said.

   Instead: if Settings closes with nothing added, bring the nudge back after
   about 20 minutes, and make the return gentle rather than a pop — it slides in
   from off the left edge, fully transparent, and fades up to its normal colour
   as it travels to where it was sitting. Only "Not now" gets the long snooze.

   Worth deciding while building it: whether it should keep coming back every 20
   minutes or back off after the second or third time. A nudge that returns
   forever on the same terms stops being a nudge.

## Polish pass (do at the end, after the functional work)

- **Scrollbars look bad.** Jose dislikes the default side scrollbar. Do NOT
  hide it outright: the bar is the only cue that a long Movements table or
  Settings list continues below, and removing it hides that from warehouse
  staff. Style it instead — thin (~6px), themed, low contrast, on the scrolling
  containers rather than the whole page.
- **Card removal animation.** When a card leaves either corner deck, the ones
  below should tilt slightly — less than the full pile angle — and slide up into
  the freed space, unhurried. Today it just disappears. Same treatment for the
  merge-suggestion boxes.
- **Audit every animation in the app.** Some look bad as they are, and several
  places that should have motion have none. Example raised: a merge-suggestion
  box currently just vanishes — it should collapse quickly and let the boxes
  below slide up into the freed space. Same question for toasts, modal
  open/close, row insertion in Movements, the deck fan, and tab switches. One
  pass, one consistent set of durations/easings, rather than tuning them one at
  a time.

## Idea to define — proactive data-quality suggestions

Jose's idea: the app notices gaps and inconsistencies and offers to fix them,
each as a card with two choices — "no supplier on the entry for X — add it?",
"no PM on the entry for X", "X and Y look like the same material — merge?".
Behind a Settings toggle, off by default.

The mechanics already exist (the suggestion deck, the similarity matcher, the
merge endpoints), so this is mostly rules plus judgement. What has to be
decided BEFORE building, because getting it wrong makes the app naggy and it
gets switched off for good:

- **Which gaps are worth raising at all?** A missing supplier on an internal
  transfer is not a problem; a missing supplier on a purchase probably is. The
  rules have to know the difference or every second movement raises a card.
- **When does it appear** — right after saving, batched daily, or only when
  someone opens the app? Immediately after saving is the most useful and the
  most annoying.
- **Who sees it?** Admin only, or the person who recorded the movement?
- **How does "Later" behave?** Never again for that row, or come back in a
  week? Never-again risks burying real gaps; recurring risks nagging.
- **A ceiling.** An installation importing a year of history would generate
  thousands at once. Needs a cap and a "review all" screen rather than a deck.

## Open decision — external sign-in for customers

Staff on the customer's own Google domain are identified automatically and need
no OAuth client. Only people OUTSIDE that domain (personal Gmail, contractors)
need the "Sign in with Google" button, which needs an OAuth client.

Google has **no public API** to add authorized redirect URIs to an OAuth client
— it is Cloud Console only, and there is an open feature request for it
(googleapis/google-cloud-go#10768). Every Apps Script copy has its own /exec
URL, so a shared client means registering each customer's URL by hand.

Three ways out, in preference order:

1. **Per-customer setup, as a paid step** (current behaviour). Ship with no
   OAuth client; enable it only for customers who ask, by adding their /exec URL
   to Jose's client. No work for the customers that don't need it.
2. **Broker redirect** — point the OAuth client at ONE fixed URL Jose owns,
   which forwards the code back to the customer's app via the `state`
   parameter. One redirect URI registered, ever, no per-customer work. Costs a
   permanent dependency on that broker staying up, and it must validate `state`
   strictly or it becomes an open redirect.
3. **Customer creates their own client** — full independence, but it is an hour
   of Cloud Console work no warehouse owner will do. Realistically dead.

Revisit when the first customer actually needs external access.

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

- **Error log housekeeping.** Add "Clear resolved" / "Clear all" in Settings →
  Error Log, plus automatic pruning of entries older than N days, so the log
  reflects what is wrong NOW instead of everything that was ever wrong.
- QR / barcode scanning + label printing
- Installable PWA + offline queue
- Granular per-role permissions (prerequisite for any costs/pricing module)
- Live sync between open windows
- "Save with cancel-X" delayed-confirm animation on movement submit
- App icon redesign
- Responsive / device audit

## Operational

