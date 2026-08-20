# tools/

Checks that run before anything is sent to Jose. All four, every time.

```
python3 tools/check-refs.py Index_v3_fixed.html Code_v3_fixed.gs
node --check <js extracted from the HTML <script> blocks>
node --check <Code_v3_fixed.gs copied to .js>
node tools/test-modal-shield.js
node tools/test-button-states.js
node tools/test-topbar-deck.js
node tools/test-checkin.js
node tools/test-pricing.js
node tools/test-project-cost.js
node tools/test-role-label.js
node tools/test-waste-cost.js
node tools/test-rack-drawer.js
node tools/test-backup-status.js
node tools/test-backup-backfill.js
node tools/test-tooltip-edge.js
node tools/test-splash-notes.js
node tools/test-account-tooltip.js
node tools/test-favicon.js
node tools/test-responsive-polish.js
node tools/test-price-alert.js
```

`tools/audit-responsive.js` is a tape measure, not a test — run it when layout
changes, read the numbers, fix what they show, run it again.

The browser tests need `npm install playwright` once; Chromium is already on
the machine (`/opt/pw-browsers/chromium-*/chrome-linux/chrome`, override with
`CHROME_PATH`).

## Why there are browser tests at all

`node --check` parses. It does not run. `check-refs.py` finds calls to
functions nobody defined. Between them they catch typos and missing code, and
they caught nothing at all when v9.63 shipped code that was valid and simply
never stopped — an observer loop that starved the page and left the app on a
blank loading screen.

Anything that behaves over TIME — an observer, a timer, a state a button has to
come back from — is invisible to both. Those get a browser test.

- `test-modal-shield.js` — the window shield: one sync at startup and no loop,
  background frozen, front window live, stacking in both directions, everything
  released on close.
- `test-button-states.js` — the busy/done helpers: a button always gets its
  label back, on success and on failure, and the callback never runs before the
  tick or gets lost when the button is missing.
- `test-topbar-deck.js` — the notification pile's open/close (driven from JS
  because CSS `:hover` fed back into itself and made the front card resize three
  times), the scroll lock while it is open, the exit animation, and a
  MEASUREMENT that the tab bar is centred. That last one is the argument for
  browser tests in one line: the old auto-margin layout put the tabs 146px off
  centre and looked almost right.
- `audit-responsive.js` — opens the real app at six device sizes, on every tab,
  and reports sideways page scroll, controls too small for a thumb, anything
  past the right edge, and page errors. Screenshots land in ./audit/.
- `test-checkin.js` — runCheckin_'s milestone bookkeeping (Code_v3_fixed.gs),
  run in a Node vm with Apps Script's globals stubbed and time itself faked:
  fires once per milestone, never twice, catches up a backlog of overdue
  milestones as ONE email not several, stays silent when the customer is
  actually using the app, stays silent with no SUPPORT_EMAIL configured, and
  backfills SETUP_COMPLETED_AT on a pre-existing install without a false alarm.
- `test-pricing.js` — the weighted-average cost engine (addMovementsBatch_'s
  pricing branch, saveAvgCostUpdates_, and their real dependencies), lifted
  verbatim into a Node vm against fake in-memory sheets: bootstraps on a
  material's first cost, blends by quantity on the next one, a blank cost
  changes nothing, EXIT/WASTE always price from the average and ignore
  whatever a client sends, an unpriced material gets a blank cost (never a
  misleading 0), a purchase split across racks still blends correctly, cents
  round properly, and the CONFIG write-back updates one row per material
  rather than appending a duplicate on every entry.

- `test-project-cost.js` — renderProjectView's "Project Cost" tile, lifted
  verbatim into a Node vm against synthetic movements: sums EXIT.totalCost only
  (a RETURN or WASTE in the mix must not count), an uncosted EXIT contributes
  nothing rather than NaN, no priced EXIT at all hides the tile instead of
  showing $0, a legacy DISPATCHED row still normalizes to EXIT and counts, and
  the tile never renders for a role without canSeeCosts.
- `test-role-label.js` — the customizable WAREHOUSE-role display name
  (`_displayRole`, `_roleBadge`), lifted verbatim into a Node vm: ADMIN and
  VIEWER are never affected by a WAREHOUSE-only label, the badge still carries
  the `role-badge-warehouse` CSS class regardless of label text, the literal
  internal value never leaks once relabeled, and a label containing
  HTML-sensitive characters renders escaped rather than as live markup.

- `test-waste-cost.js` — renderStats's "Waste Cost" dashboard tile, lifted
  verbatim into a Node vm against synthetic movements: sums the cost STAMPED
  on each WASTE row (never today's average — waste from last year must not
  reprice itself), ENTRY/EXIT don't count, an uncosted WASTE row contributes
  nothing rather than NaN, no priced WASTE hides the tile instead of showing
  $0, a legacy DISPATCHED row normalizes to EXIT and stays excluded, and the
  tile never renders for a role without canSeeCosts.

- `test-rack-drawer.js` — the redesigned Rack Drawer (Warehouse Map → click a
  location), a full Playwright run against the real app: the photo section is
  gone, the Exit/Transfer/Waste menu stays collapsed until a material name is
  tapped, tapping Exit/Transfer/Waste opens the real movement modal with
  category/name/source rack pre-filled and qty left blank, and tapping the
  green "N avail" figure fills qty with that number — in the EXIT rows, the
  TRANSFER row, and the single-field WASTE stock check. This is the one that
  actually clicks the menu open and reads the resulting form fields, not just
  the HTML string that would build it. Also covers three data-integrity bugs
  Jose caught by using the app: an already-open drawer re-rendering (or
  auto-closing, if the rack is now empty) the moment fresh stock data lands
  instead of keeping showing a material that already left, the EXIT
  destination / single-material category fields actually resetting between
  two movements in a row instead of silently carrying over what was typed
  into the PREVIOUS one, and the TRANSFER row's "avail" figure showing the
  moment a rack is picked instead of staying blank until qty is typed —
  which made the whole tap-to-fill-qty shortcut impossible on a row the Rack
  Drawer had just pre-filled with a blank qty on purpose. Also covers
  switching type INSIDE an already-open modal (the Exit/Transfer/Return/
  Waste bar at the top): Entry and Return stay hidden for the life of a Rack
  Drawer material session (neither has a "from this exact rack" reading), and
  switching between Exit/Transfer/Waste keeps the same material instead of
  landing on an empty form — the two types keep completely separate fields
  (exit-cat-1/exit-name-1 vs the shared mType/mName), so nothing carried over
  on its own before this.
- `test-backup-status.js` — the "Last backup" line in Settings → System
  (`_drawBackupBox`), lifted verbatim into a Node vm: hidden on a fresh
  install with nothing recorded yet, shown with the right relative time and a
  working Drive link once there is one, an HTML-sensitive file name renders
  escaped, and the line survives even with the nightly schedule turned off
  (schedule and history are separate facts). Writing LAST_BACKUP_AT/NAME/
  FILE_ID Script Properties on every backup (runBackupNow_) exists because
  AUDIT_LOG's ~1500-row readable tail can scroll a backup entry past in under
  a day on a busy install, even though the file is safe in Drive the whole
  time.
- `test-backup-backfill.js` — the one-time Drive backfill for installs that
  were already backing up before LAST_BACKUP_AT existed (getBackupStatus /
  _findMostRecentBackup_), lifted verbatim into a Node vm with DriveApp and
  PropertiesService stubbed: picks the actual NEWEST of several existing
  backup files (not first-in-list, not oldest), remembers what it found so
  the next load never re-scans Drive, does nothing false on a genuinely fresh
  install with no backups at all, and the trivial one-file case works too.
- `test-tooltip-edge.js` — the shared .tip tooltip's edge-avoidance
  (`_positionTip`), a Playwright run measuring real layout: an icon near the
  left or right edge of the window gets the bubble anchored to that same
  side instead of centred off past the viewport, one in the middle stays
  centred, and hovering back and forth leaves no stale edge class behind.
- `test-splash-notes.js` — the loading screen's rotating phrases and manual
  reload fallback (SPLASH_NOTES / `_showSplashReload`), a Playwright run
  using clock mocking to fast-forward through the real 3.5s rotation instead
  of actually waiting ~18 seconds per run: starts on the first phrase,
  rotates through all of them in order, the last one says the wait is longer
  than expected and stays there instead of looping back to "Connecting…", a
  working Reload control appears only once the phrases run out (not before),
  and hiding the splash for a real successful load stops the rotation for
  good.
- `test-account-tooltip.js` — the account button's tooltip
  (`_setAccountIdentity`'s data-tip build), lifted verbatim into a Node vm:
  shows the real name over the role (not the old static "Your account"),
  honors a custom WAREHOUSE role label instead of the raw internal value,
  falls back to email when there's no name on record, and confirms a name
  with HTML-sensitive characters is safe by construction (CSS `attr()` is
  never parsed as markup).
- `test-favicon.js` — the browser-tab icon, real Playwright against the real
  app: a real Acopio-branded icon from first paint instead of the generic
  Apps Script one Jose was seeing, swaps to the company's own uploaded logo
  the moment one exists (no second upload), and reverts to the default mark
  if the logo is removed.
- `test-responsive-polish.js` — three of Jose's screen-size reports, real
  viewport geometry at real sizes (nothing here is knowable from source
  alone): the topbar brand (logo/name/Acopio badge) stacks vertically and
  left-aligned on a real screen with the version number gone from there
  entirely, the SAME topbar stays the original row layout on a phone (only
  large screens were asked for), the version tag is hidden everywhere either
  way, the "not on your lists yet" bell panel measures out to two-thirds of
  a phone's width instead of half, and the Rack Drawer measures out to
  two-thirds instead of nearly the whole screen.
- `test-price-alert.js` — the ENTRY price-change alert (`_checkPriceChange`),
  lifted verbatim into a Node vm: no alert inside the ±15% threshold (noise,
  not a real change), warns on a real increase and informs on a real
  decrease with the right percentage and dollar figures in each direction,
  no alert for a material with no cost history yet to compare against, no
  crash on a blank cost/name/zero, and an alert that actually clears once
  the number is corrected back toward the average rather than staying stuck.

All of these lift the real code out of `Index_v3_fixed.html` (or
`Code_v3_fixed.gs`) rather than keeping a copy, so they cannot quietly drift
away from what ships.
