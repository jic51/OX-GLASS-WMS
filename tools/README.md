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
node tools/test-account-tooltip-delay.js
node tools/test-bell-tooltip-collision.js
node tools/test-rowmode-stable.js
node tools/test-header-merge.js
node tools/test-sysactivity-dismiss.js
node tools/test-morning-arrived.js
node tools/test-legal-sync.js
node tools/test-config-snapshot.js
node tools/test-concurrency.js
node tools/test-category-rename.js
node tools/test-cfg-rename-reload.js
node tools/test-space-usage.js
node tools/test-ai-key.js
node tools/test-brand-corner.js
node tools/build-fingerprint.js --check
```

`tools/audit-responsive.js` and `tools/test-scale.js` are tape measures, not
tests — run them when the thing they measure changes, read the numbers, fix
what they show, run again. `audit-responsive.js` measures layout at six device
sizes; `test-scale.js` measures how calculateStock() behaves as one
installation's archive grows (it was linear to 100k movements when last run,
which answered "does the stock engine have a ceiling?" — no — and pointed the
remaining scale risk at Sheets I/O and concurrency instead).

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
- `test-backup-status.js` — the backup box in Settings → System
  (`_drawBackupBox`), lifted verbatim into a Node vm: hidden on a fresh
  install with nothing recorded yet, shown with the right relative time and a
  working Drive link once there is one, an HTML-sensitive file name renders
  escaped, and the line survives even with the nightly schedule turned off
  (schedule and history are separate facts). Also covers the v9.93 full list
  — Jose asked what a customer does when they want YESTERDAY's backup, and
  the answer was "go hunting in Drive", since only the newest was ever
  linked. Every backup is now reachable, collapsed behind a count so ~30
  near-identical rows do not take over the tab, escaped in the list too, not
  offered at all when there is only one, and absent without crashing on an
  install whose server has not been redeployed yet. The list is built from
  the Drive folder (`listBackups_`) rather than AUDIT_LOG on purpose: the
  folder says what still EXISTS, so a backup the customer deleted stops
  being listed instead of being listed with a link that lands on Drive's
  "unable to open the file at this time". Writing LAST_BACKUP_AT/NAME/
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
- `test-account-tooltip-delay.js` — the account button's 4-second hover
  delay (Jose: unlike the instant info icons, this one is for someone who
  lingers), a Playwright run reading the real computed `transition-delay`
  Chromium will animate with (CSS transitions run on the compositor's own
  clock, not page.clock's faked JS timers, so waiting 4 real seconds isn't
  needed): 4s while hovering the account button, every other `.tip` tooltip
  on the page stays instant (0s), and the tooltip is invisible at rest.
- `test-bell-tooltip-collision.js` — the account tooltip vs. the
  notification bell on a narrow phone: below 720px the bell sits directly
  under the avatar with the exact same 8px gap the tooltip drops down by,
  so Jose caught the bell rendering right through the tooltip's name/role
  text. v9.88 pushed the tooltip down to clear it; Jose (v9.90) wanted it
  back at its natural position instead, so now the bell fades out while the
  tooltip is up — timed to the same 4s hover delay, back instantly the
  moment the hover ends, and inert to taps while invisible
  (pointer-events:none). A wide screen, where the bell doesn't exist at all
  (the corner deck takes over), is unaffected by hovering the avatar.
- `test-rowmode-stable.js` — the Movements table's Edit/Delete row-mode
  toggle buttons, real Playwright clicks at three widths: clicking Edit (which
  makes a hint sentence appear) must not move the buttons, the hint has to
  render below them rather than beside them, and toggling Edit back off must
  return to the exact same spot. Root cause was the hint sharing a flex line
  with the "⚙ Columns" button above the table — long enough, it didn't fit and
  shoved the whole row down to a new toolbar line. The row-mode bar now lives
  on its own dedicated line from the start.
- `test-concurrency.js` — which write paths take the script lock, and what it
  costs when they do not. Two halves, deliberately labelled as different kinds
  of evidence: Part 1 is FACT read out of Code_v3_fixed.gs (who locks, whether
  the archive read happens inside the lock, whether it is released in a
  finally); Part 2 is a MODEL of read-modify-write showing a lost update with
  and without the lock — it does not execute addMovementsBatch_, which needs
  real Sheets. Neither proves a live installation survives four people at
  once; that still needs a deployed copy and several browsers. It earned its
  place immediately by finding a seventh unlocked stock-writer that reading
  the code by eye had cleared: renaming a category rewrites the Category cell
  of every matching archive row, which reads as a settings change. The
  known-gap list is spelled out by hand so that fixing one, or adding a new
  one, both force it to be updated rather than quietly passing.
- `test-category-rename.js` — the bulk Category-column rewrite
  (`renameCategoryColumn_`), lifted verbatim into a Node vm and run against a
  fake Sheet that records every round trip. Written because v10.1 replaced a
  setValue-per-row loop with one setValues, and that trade moves the risk: a
  mistake no longer corrupts rows slowly, it corrupts the whole column at
  once. So the assertion that matters is not "did the right cells change" but
  "did every OTHER cell come out byte-identical" — plus IGUANA surviving a
  rename of IGU, an empty cell staying empty, and a no-match rename writing
  nothing at all. It also reads the CALL SITE, because a correct helper
  pointed at one sheet is still a bug: renaming has to touch ARCHIVE_HISTORY
  as well as the archive (refreshDerivedSheets_ reads the two concatenated, so
  renaming only one splits a category into two materials the first time old
  rows are archived), rebuild the derived sheets afterwards, and write CONFIG
  from the same uppercased value the archive gets. That last one is the bug
  that started it: the catalog held "IGU (isolated glass unit)" while the
  movements held "IGU (ISOLATED GLASS UNIT)".
- `test-cfg-rename-reload.js` — the browser half of the same bug, and the one
  the server fix did not cover. v10.1 renamed the category correctly
  everywhere on the server; the tab still held movement rows saying the old
  name while the filter dropdown had already been patched to the new one, so
  filtering by a renamed category returned an empty table until the page was
  reloaded by hand. The fix is one line, which is exactly the kind of thing a
  later refactor drops silently, so both halves are asserted: a category
  rename MUST reload (skipCache + quiet), and add / delete / a project rename
  must NOT — `_applyCfgChangeLocally` exists so that entering ten categories
  is not ten round trips. Runs the real function in a vm with the browser
  stubbed.
- `test-space-usage.js` — the storage indicator's ESTIMATE, which is the only
  part of it that can lie. The bar reports a fact; the projection is where a
  wrong number either panics a customer with fifteen years of room or
  reassures one with nine months. Runs the real `spaceEstimate_` in a vm
  against fake timestamp columns, holding both failure modes shut: the opening
  inventory (hundreds of movements in three days) must not set the pace, and a
  rising pace must BRACKET a second figure rather than compound into a curve.
  It earned its place immediately by catching an off-by-one — `age <= 90`
  made the recent window 91 days wide, so every steady installation measured
  as growing 1% and would have been shown a "if your pace keeps growing"
  sentence that meant nothing. Fixed with strict bounds plus a 15% floor
  below which volume is treated as weather, not a trend.
- `test-ai-key.js` — the Gemini key, now settable from Settings → System
  instead of the Apps Script editor. The feature is small; the failure modes
  are not, so both are held shut here: the key must never come back to the
  BROWSER (getAiStatus returns configured + the last four characters and
  nothing else) and must never reach a SHEET (the audit log records that a key
  was set, never the key — that tab is openable by anyone with the file).
  Also asserts the reason the save is deliberately slow: it spends one real
  call verifying the key BEFORE storing it, a rejected key is not stored, and
  a rejected REPLACEMENT leaves the working one alone. And that a missing key
  is treated as an unconfigured setting rather than a failure — NO_AI_KEY is a
  marker the browser turns into an explanation with a button, not a red
  error.
- `test-brand-corner.js` — the logo / company name / "Acopio" badge lockup,
  and the test a screenshot cannot be: it MEASURES the badge's bottom edge
  against the navy strip's bottom edge and fails on overlap, rather than on
  looking wrong to somebody. Runs three real logo shapes (wide, square, tall)
  because the bug was shape-dependent — the merged topbar takes the brand
  block out of flow so the tabs centre on the page, which is right and was
  measured, but an out-of-flow block cannot tell its container how tall it is,
  and min-height:74px held only while the logo was a fixed 26px. Also asserts
  no shape collapses under 18px in either axis (a tall logo at a fixed height
  is an unreadable sliver), that --brand-h is measured rather than hardcoded,
  and that the company name uses a different face from the rest of the app
  without waiting on a font server to render.
- `test-config-snapshot.js` — the configuration snapshot written into every
  backup copy (`writeConfigSnapshot_`), lifted verbatim into a Node vm with
  SpreadsheetApp and PropertiesService stubbed. A backup copies the
  SPREADSHEET, but Script Properties belong to the Apps Script project, so a
  restored copy used to come back with every movement and no configuration —
  worst of all FOLDER_PREFIX, without which every attachment silently stops
  opening. Checks the properties that must be carried AND, just as hard, the
  four that must never be: OAUTH_CLIENT_SECRET above all, since it is ours
  rather than the customer's and identical across every installation. Also
  that all four are still NAMED so whoever restores knows what is missing,
  that a fresh install says so instead of writing an empty grid, and that the
  snapshot opens the copy by id and never touches the live spreadsheet.
- `test-legal-sync.js` — keeps `legal/*.md` and the copies embedded in the app
  (LEGAL_DOCS) from drifting apart. The drift already happened once and it
  mattered: v9.77 shipped the setup check-in, which emails us the company
  name and the admin's address, while both copies of the privacy policy still
  said we receive nothing at all. Nothing in the toolchain could see it — a
  stale sentence is valid HTML and valid Markdown. Checks matching
  "last updated" dates and numbered section headings in both, that specific
  disclosures a customer relies on appear in BOTH copies, and that the one
  claim that was actually false ("a subpoena produces nothing, because we
  hold nothing") cannot come back.
- `test-morning-arrived.js` — the "Mark arrived →" shortcut on the morning
  popup's cards (v9.94), showMorningPopup lifted verbatim into a Node vm and
  its markup read back. Checks the RULES rather than the styling: an ADMIN
  gets it, WAREHOUSE and VIEWER never do (same gate as the Incoming table's
  own edit pencil), it is not offered on a delivery already marked Arrived,
  it IS offered on later-this-week rows since deliveries turn up early, and
  an item id containing a quote cannot break out of the attribute. Also
  asserts what the handler must NOT do: it re-checks the role instead of
  trusting that the button was hidden, and it never calls the server — it
  opens the item's own edit window with Arrived pre-selected and the person
  still presses Save, because a delivery marked received by one stray tap is
  worse than one extra click.
- `test-sysactivity-dismiss.js` — that dismissing a system notice does NOT
  erase it from the maintenance record (`getSystemActivity` + both its
  consumers), backend lifted verbatim into a Node vm with the Sheets API
  stubbed. Settings → System said "Nothing automatic has run yet" directly
  above a "Last backup: today at 2:13 AM" line that was perfectly true —
  both read one list, but the corner deck is a NOTICE you press ✕ on and
  Settings → System is a RECORD that has to keep saying the backup ran, and
  dismissed rows were being dropped at the source. Checks that all six
  nightly backups come back with four of them dismissed, that they are
  flagged rather than missing, that each keeps its Drive link either way,
  that the deck's limit is still spent on live cards instead of being
  starved by old dismissals, and that the two consumers genuinely disagree
  — deck filters on `dismissed`, Settings does not.
- `test-header-merge.js` — the topbar header compaction (v9.89, from Jose's
  annotated screenshot): on a wide screen the brand block (logo/company name/
  Acopio badge) sits beside the tabs instead of in its own mostly-empty row
  above them; below 769px nothing changes, row1 still jumps above row2 same
  as before. v9.91: Jose then caught the tabs landing off-centre once
  merged, since row2 was centring its nav against "whatever space brand
  left over," not the middle of the page. Fixed by taking brand out of flow
  (position:absolute) so row2 goes back to spanning the full width — with
  column 1 given the same measured width as brand actually needs
  (`--brand-w` / `_syncBrandWidth`) so it can float over it without
  overlapping the first tab — and by deciding whether to merge at all in JS
  (force it on, check if a tab wrapped, revert if so) rather than a fixed
  breakpoint that only happens to work for one company name's length. Real
  Playwright geometry at seven widths: the last tab never overlaps the
  avatar or the bell, brand never overlaps the tabs, and — the actual v9.91
  bug — the tabs' centre matches the real page centre exactly when merged,
  not just centred in the leftover space next to brand.

All of these lift the real code out of `Index_v3_fixed.html` (or
`Code_v3_fixed.gs`) rather than keeping a copy, so they cannot quietly drift
away from what ships.
