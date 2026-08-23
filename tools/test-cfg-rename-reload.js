// RENAMING A CATEGORY HAS TO RELOAD; NOTHING ELSE SHOULD.
//
// v10.1 fixed renaming a category on the server — the archive, ARCHIVE_HISTORY
// and the stock cache all came out right. The browser did not: `movements` and
// `oldMovements` were still holding rows that said "FLASHING" while the filter
// dropdown had already been patched to "FLASHING PAPER", so filtering by the
// renamed category returned nothing until the page was reloaded by hand.
//
// The fix is one line, and one line is exactly the kind of thing that gets
// dropped in a later refactor with nobody noticing until a customer filters an
// empty table. So it gets a test.
//
// Both halves matter equally:
//   - a category rename MUST reload, or the bug is back;
//   - add / delete / a project rename must NOT, because _applyCfgChangeLocally
//     exists precisely so that typing in a list of categories does not fire a
//     full round trip after every single one.
//
// Runs the REAL _applyCfgChangeLocally lifted out of Index_v3_fixed.html, with
// the browser stubbed around it, so what is under test is the shipping code.
//
// Usage:  node tools/test-cfg-rename-reload.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

function extractFn(name) {
  const start = HTML.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('not found in Index_v3_fixed.html: ' + name);
  let depth = 0, i = HTML.indexOf('{', start);
  for (; i < HTML.length; i++) {
    if (HTML[i] === '{') depth++;
    else if (HTML[i] === '}') { depth--; if (depth === 0) return HTML.slice(start, i + 1); }
  }
  throw new Error('unbalanced braces in ' + name);
}

// ── The browser, stubbed only as far as this function reaches ───────────────
function run(payload, opts) {
  opts = opts || {};
  const calls = { reload: [], renderTab: 0, catDropdowns: 0, dropdowns: 0 };
  const sandbox = {
    console,
    _settingsData: { categories: ['FLASHING', 'WINDOW'], projects: ['ALPHA', 'BETA'] },
    config:        { categories: ['FLASHING', 'WINDOW'], projects: ['ALPHA', 'BETA'] },
    _settingsTab: 'categories',
    _renderSettingsTab: () => { calls.renderTab++; },
    refreshCategoryDropdowns: () => { calls.catDropdowns++; },
    refreshDropdowns: () => { calls.dropdowns++; },
    document: { getElementById: () => null },
    loadDataFromGoogle: opts.noReloadFn ? undefined
      : (skipCache, quiet) => { calls.reload.push({ skipCache, quiet }); }
  };
  vm.createContext(sandbox);
  vm.runInContext(extractFn('_applyCfgChangeLocally'), sandbox);
  sandbox._applyCfgChangeLocally(payload);
  return { calls, sandbox };
}

console.log('\n═══ the reload, and its blast radius ═══\n');

{
  const { calls, sandbox } = run({ type: 'categories', op: 'rename', value: 'FLASHING', newValue: 'FLASHING PAPER' });
  check('renaming a category reloads from the server — without this the movement rows keep the old name and the filter comes back empty',
    calls.reload.length === 1);
  check('...quietly and skipping the cache: skipCache=true so the stale rows are not re-served, quiet=true so it does not throw a full-screen spinner over the app',
    calls.reload.length === 1 && calls.reload[0].skipCache === true && calls.reload[0].quiet === true);
  check('...and the catalog list is still patched locally as well, so the new name shows before the reload lands',
    sandbox._settingsData.categories.indexOf('FLASHING PAPER') !== -1 &&
    sandbox._settingsData.categories.indexOf('FLASHING') === -1);
}

{
  const { calls } = run({ type: 'categories', op: 'add', newValue: 'GLAZING' });
  check('ADDING a category does not reload — this whole function exists so that typing in ten categories is not ten full round trips',
    calls.reload.length === 0);
}

{
  const { calls } = run({ type: 'categories', op: 'delete', value: 'WINDOW' });
  check('DELETING a category does not reload — the server leaves existing movements alone, so there is nothing new to fetch',
    calls.reload.length === 0);
}

{
  const { calls } = run({ type: 'projects', op: 'rename', value: 'ALPHA', newValue: 'ALPHA II' });
  check('renaming a PROJECT does not reload — updateConfig rewrites archive rows for categories only, so the movements on screen are still accurate',
    calls.reload.length === 0);
}

{
  const { calls } = run({ type: 'archiveCutoffMonths', value: 12 });
  check('a setting with no list to patch returns early and reloads nothing',
    calls.reload.length === 0 && calls.renderTab === 0);
}

console.log('\n═══ it must not break where the function is not defined ═══\n');

{
  const { calls, sandbox } = run({ type: 'categories', op: 'rename', value: 'FLASHING', newValue: 'FLASHING PAPER' },
    { noReloadFn: true });
  check('a rename still patches the list and does not throw when loadDataFromGoogle is unavailable — the typeof guard is real, not decoration',
    sandbox._settingsData.categories.indexOf('FLASHING PAPER') !== -1 && calls.reload.length === 0);
}

console.log('\n═══ and the screen has to SAY which tabs carry the rename ═══\n');

// The same sentence used to serve all four catalog tabs: "Renaming a category
// updates all existing movements automatically." True on Categories, false on
// the other three — the app was promising something it does not do. The
// asymmetry is deliberate (a category is a classification; a supplier, project
// and location are historical facts, already printed on PDFs that went out),
// which is exactly why the screen has to be honest about it rather than leave
// a customer to find out after renaming.
{
  const start = HTML.indexOf('function _renderSettingsTab(');
  const body  = HTML.slice(start, HTML.indexOf('\nfunction ', start + 10));

  check('the copy branches on the tab instead of one sentence for all four',
    /tab === 'categories'/.test(body));
  check('Categories still promises the rename carries into the movements',
    /Renaming a category updates all existing movements automatically\./.test(body));
  check('the other three say the opposite, plainly, instead of the old claim',
    /Renaming updates the list only — existing movements keep the name they were recorded with\./.test(body));
}

{
  const start = HTML.indexOf('function _renderLocationsTab(');
  const body  = HTML.slice(start, HTML.indexOf('\nfunction ', start + 10));
  check('the Locations tab, which renders its own header and so misses the branch above, says it too',
    /Renaming a location updates the list only/.test(body));
}

console.log('\n═══ every path that rewrites movements must refresh, and must say it is working ═══\n');

// One bug, found three times on three screens. The server rewrites archive
// rows and rebuilds the stock cache; the browser keeps showing what it loaded
// earlier. It was caught on the Categories tab (v10.2), then on the Materials
// tab and the location merge (v10.6) — Jose merged A5C into A6C and the
// Warehouse Map went on showing both racks until he reloaded the page by hand.
//
// Asserted as a group so the next path of this kind is added to the list
// rather than discovered by a customer.
{
  // Anchored per path rather than by the server action name: manageMaterial is
  // called from two different screens, and searching for the action found the
  // Movements-tab delete first — which was already correct, so the test failed
  // on working code. Both call sites are listed instead.
  const paths = [
    ['function _matCall(',              'renaming, re-filing or merging a material (Settings → Materials)'],
    ['function _doDeleteMovementRow(',  'deleting a saved movement (Movements tab)'],
    ["'mergeConfigValues'",             'merging two spellings of a project or supplier'],
    ["'mergeLocations'",                'merging two locations']
  ];
  paths.forEach(([anchor, what]) => {
    const at = HTML.indexOf(anchor);
    // The handler sits before the .processMovement line for the action anchors
    // and after it for the function anchors, so look both ways.
    const seg = HTML.slice(Math.max(0, at - 2500), at + 2000);
    check(what + ' refreshes from the server afterwards — the local patch fixes the lists, not the stock',
      at !== -1 && /loadDataFromGoogle\(true/.test(seg));
  });
}

// The other half of the same complaint: a slow button that shows nothing
// invites a second press, and a second press is where the damage is. That is
// exactly how the Categories tab produced a red '"IGU" not found' error for a
// rename that had worked.
{
  const at = HTML.indexOf("function _matCall(");
  const seg = HTML.slice(at, at + 1800);
  check('the Materials tab refuses a second call while one is in flight',
    /if \(_matBusy\) return;/.test(seg));
  check('...and greys the buttons and says what it is doing, on success AND on failure',
    (seg.match(/_matSetBusy\(false\)/g) || []).length >= 2 && /_matSetBusy\(true\)/.test(seg));
  check('...with a message that matches the actual wait, not a generic "Saving…" borrowed from a one-cell edit',
    /rebuilding stock totals/.test(HTML));
}

console.log('\ncfg-rename-reload: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
