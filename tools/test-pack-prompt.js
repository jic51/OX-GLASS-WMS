// PACKS IN THE ENTRY FORM — the label may not promise arithmetic that does not
// happen, and the question may not be asked when there is nothing to ask.
//
// This file exists because of a bug I shipped in v11.5 and only found in v11.9
// while building on top of it. The label read "Cost per Box" the instant the
// dropdown said Box — but nothing divided. The backend takes that field as the
// cost of ONE STOCKING UNIT (totalCost = unitCost x qty) and feeds it to the
// weighted-average engine, so a box of 12 at $120 was recorded as $120 a tube
// and blended into every future cost for that material. A 12x error, silent,
// and only fixable afterwards by editing history.
//
// The rule that replaced it, and what this guards:
//
//   1. The label names a pack ONLY when the factor for that exact material and
//      pack is known. Otherwise it says "Unit Cost" and means it.
//   2. Whatever the label says, _entryUnitCost returns the cost of one
//      stocking unit — divided when there is a factor, untouched when not.
//   3. The question never appears for a material counted one at a time. Jose's
//      windows are one unit each; "how many windows per box?" has no answer and
//      must never be put on screen.
//
// Usage:  node tools/test-pack-prompt.js [path/to/Index_v3_fixed.html]

const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');

const SRC = process.argv[2] || path.join(__dirname, '..', 'Index_v3_fixed.html');
let html = fs.readFileSync(SRC, 'utf8');

// One material is known to come 12 to a box. The other is a window: it has no
// pack row at all, which is the ordinary state and the one that must cost the
// user nothing.
const PACKS = {
  'HARDWARE||MM210': { packs: [{ pack: 'BOX', perPack: 12 }, { pack: 'PALLET', perPack: 360 }] }
};

const stub = `<script>
window.google=window.google||{}; window.google.charts=window.google.charts||{load:function(){},setOnLoadCallback:function(){}};
window.__saved=[];
Object.assign(window.google,{script:{run:new Proxy({},{get(t,k){
  return function(){
    if(k==='withSuccessHandler'){ t._ok=arguments[0]; return window.google.script.run; }
    if(k==='withFailureHandler'){ t._fail=arguments[0]; return window.google.script.run; }
    var ok=t._ok;
    if(k==='getInitialData'){ setTimeout(function(){ ok && ok(window.__DATA); },20); return; }
    var action=(k==='processMovement')?String(arguments[0]||''):'';
    if(action==='saveMaterialPack'){ window.__saved.push(arguments[1]); }
    var LISTY=/^get(PmDirectory|Directory|ErrorLog|Trucks|Racks)$/;
    var reply=LISTY.test(action)?[]:{};
    setTimeout(function(){ ok && ok(reply); },20);
  };
}})}});
window.__DATA={ userRole:'ADMIN', userEmail:'jose@x.com', userName:'Jose Castro',
 serverVersion:'99.9', company:{name:'PRODUCTION',domain:'x.com',logo:''},
 movements:[], stock:{}, monitoredMaterials:null,
 config:{ categories:['HARDWARE','WINDOW'], projects:[], suppliers:[], locations:[], units:[] },
 incoming:[], rackPhotos:{}, systemActivity:[], materialPacks:${JSON.stringify(PACKS)},
 rolePerms:{canSeeCosts:true,canEditMovements:true,canManageCatalog:true,canExportData:true},
 warehouseRoleLabel:'Warehouse', archiveCutoffMonths:12, oauthClientId:'', oauthRedirectUri:'' };
</script>`;
html = html.replace('</head>', stub + '</head>');
const f = path.join(os.tmpdir(), 'acopio-pack-prompt.html');
fs.writeFileSync(f, html);

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

// Put a material and a unit on ENTRY line 1 and let the handlers run.
async function setLine(page, cat, name, unit, cost) {
  await page.evaluate(([c, nm, u, ct]) => {
    document.getElementById('mat-cat-1').value = nm ? c : c;
    document.getElementById('mat-name-1').value = nm;
    document.getElementById('mat-unit-1').value = u;
    const ce = document.getElementById('mat-cost-1');
    if (ce) ce.value = (ct === null ? '' : ct);
    _syncCostLabel(1);
  }, [cat, name, unit, cost]);
  await page.waitForTimeout(120);
}

const readLabel = page => page.evaluate(() =>
  (document.getElementById('mat-cost-lbl-1').textContent || '').replace(/\s+/g, ' ').trim());

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  await page.goto('file://' + f);
  await page.waitForTimeout(500);
  await page.evaluate(() => openMoveModal('ENTRY'));
  await page.waitForTimeout(350);

  console.log('\n═══ the label only names a pack when the app can do the division ═══\n');

  await setLine(page, 'HARDWARE', 'MM210', 'BOX', null);
  check('a KNOWN box (MM210 = 12) is named on the label: "Cost per Box"',
    /cost per box/i.test(await readLabel(page)));

  await setLine(page, 'HARDWARE', 'BRAND NEW THING', 'BOX', null);
  const unknownLabel = await readLabel(page);
  console.log('    unknown material, unit=Box → label reads "' + unknownLabel + '"');
  check('an UNKNOWN box says "Unit Cost" — this is the v11.5 bug, and the whole point of the file',
    /unit cost/i.test(unknownLabel) && !/per box/i.test(unknownLabel));

  await setLine(page, 'WINDOW', 'JJF 109', 'UNIT', null);
  check('a plain unit says "Unit Cost"', /unit cost/i.test(await readLabel(page)));

  console.log('\n═══ what actually reaches the server is always the cost of ONE unit ═══\n');

  await setLine(page, 'HARDWARE', 'MM210', 'BOX', 120);
  const known = await page.evaluate(() => _entryUnitCost(1));
  console.log('    $120 a box of 12 → sends ' + known);
  check('$120 for a box of 12 is sent as $10.00 a unit, not $120', Number(known) === 10);

  await setLine(page, 'HARDWARE', 'MM210', 'PALLET', 2160);
  check('...and the PALLET factor is used for a pallet, not the box factor',
    Number(await page.evaluate(() => _entryUnitCost(1))) === 6);

  await setLine(page, 'HARDWARE', 'BRAND NEW THING', 'BOX', 120);
  check('an unknown box sends $120 UNCHANGED — matching the "Unit Cost" label it is showing',
    Number(await page.evaluate(() => _entryUnitCost(1))) === 120);

  await setLine(page, 'WINDOW', 'JJF 109', 'UNIT', 250);
  check('a window at $250 sends $250 — no pack, no division, nothing changed for the case Jose actually runs',
    Number(await page.evaluate(() => _entryUnitCost(1))) === 250);

  // A deliberate zero still goes through, unchanged from before packs existed.
  // The backend's ENTRY branch accepts `enteredCost >= 0` on purpose — a free
  // sample is a real thing to record — so stripping the zero in the browser
  // would make the two halves disagree about what a 0 means. I first wrote
  // this expecting '' here, which would have been me quietly changing
  // behaviour nobody asked me to change; the question is Jose's, not the
  // test's. Noted in docs/BACKLOG.md instead.
  await setLine(page, 'HARDWARE', 'MM210', 'BOX', 0);
  check('a deliberate zero is still passed through, exactly as before packs existed',
    Number(await page.evaluate(() => _entryUnitCost(1))) === 0);

  console.log('\n═══ the question is only asked when there is something to ask ═══\n');

  const noteState = () => page.evaluate(() => {
    const h = document.getElementById('mat-pack-note-1');
    return { shown: h && getComputedStyle(h).display !== 'none',
             cls: h ? h.className : '', text: (h ? h.textContent : '').replace(/\s+/g, ' ').trim() };
  });

  await setLine(page, 'WINDOW', 'JJF 109', 'UNIT', null);
  let st = await noteState();
  check('a window counted one at a time is NEVER asked how many fit in a box', st.shown === false);

  await setLine(page, 'HARDWARE', '', 'BOX', null);
  st = await noteState();
  check('picking Box before naming the material asks nothing — there is no material to ask about',
    st.shown === false);

  await setLine(page, 'HARDWARE', 'BRAND NEW THING', 'BOX', null);
  st = await noteState();
  console.log('    → ' + st.text);
  check('an unknown box asks, inline, naming the material', st.shown && /ask/.test(st.cls) &&
    /how many units/i.test(st.text) && /BRAND NEW THING/.test(st.text));

  await setLine(page, 'HARDWARE', 'MM210', 'BOX', null);
  st = await noteState();
  console.log('    → ' + st.text);
  check('a known box states it quietly instead of asking again',
    st.shown && /known/.test(st.cls) && /= 12 units/.test(st.text));

  console.log('\n═══ saving, and the warning before a factor is changed ═══\n');

  await setLine(page, 'HARDWARE', 'BRAND NEW THING', 'BOX', null);
  const saved = await page.evaluate(() => {
    const h = document.getElementById('mat-pack-note-1');
    h.querySelector('.pack-qty').value = 24;
    h.querySelector('.pack-save').click();
    return { sent: window.__saved.slice(-1)[0],
             known: _packFactor('HARDWARE', 'BRAND NEW THING', 'BOX') };
  });
  check('answering sends it to the server with the material it belongs to',
    saved.sent && saved.sent.name === 'BRAND NEW THING' && Number(saved.sent.perPack) === 24);
  check('...and it is remembered immediately, so the label and the division agree at once',
    saved.known === 24);
  await page.waitForTimeout(150);
  check('...and the cost label now names the box, because the division is possible',
    /cost per box/i.test(await page.evaluate(() => {
      document.getElementById('mat-unit-1').value = 'BOX'; _syncCostLabel(1);
      return document.getElementById('mat-cost-lbl-1').textContent;
    })));

  // A pack of 1 is a way of writing a row that changes nothing while looking
  // like it changed something.
  await setLine(page, 'HARDWARE', 'ANOTHER THING', 'BOX', null);
  const one = await page.evaluate(() => {
    const before = window.__saved.length;
    const h = document.getElementById('mat-pack-note-1');
    h.querySelector('.pack-qty').value = 1;
    h.querySelector('.pack-save').click();
    return { grew: window.__saved.length > before,
             warn: (h.querySelector('.pack-warn').textContent || '') };
  });
  check('a "box" of 1 is refused and says to pick Unit instead',
    one.grew === false && /same as a unit/i.test(one.warn));

  // Jose's orange box: changing a remembered factor changes money.
  await setLine(page, 'HARDWARE', 'MM210', 'BOX', null);
  const chg = await page.evaluate(() => {
    document.querySelector('#mat-pack-note-1 .pack-change').click();
    const h = document.getElementById('mat-pack-note-1');
    h.querySelector('.pack-qty').value = 11;
    const before = window.__saved.length;
    h.querySelector('.pack-save').click();          // first press: warn only
    const warned = h.querySelector('.pack-warn');
    const firstText = (warned.textContent || '').replace(/\s+/g, ' ');
    const savedOnFirst = window.__saved.length > before;
    h.querySelector('.pack-save').click();          // second press: commit
    return { firstText, savedOnFirst,
             savedOnSecond: window.__saved.length > before,
             now: _packFactor('HARDWARE', 'MM210', 'BOX') };
  });
  console.log('    → ' + chg.firstText);
  check('changing 12 to 11 does NOT save on the first press', chg.savedOnFirst === false);
  check('...it says what it is changing FROM and TO, by name', /was 12/.test(chg.firstText) &&
    /now 11/.test(chg.firstText) && /MM210/.test(chg.firstText));
  check('...and a second press goes through', chg.savedOnSecond && chg.now === 11);

  console.log('\n═══ the division is shown, not done out of sight ═══\n');

  await setLine(page, 'HARDWARE', 'MM210', 'BOX', 121);
  const math = await page.evaluate(() => {
    const el = document.getElementById('mat-pack-math-1');
    return { shown: getComputedStyle(el).display !== 'none',
             text: (el.textContent || '').replace(/\s+/g, ' ').trim() };
  });
  console.log('    → ' + math.text);
  // 121 / 11 = 11 exactly, using the factor the previous block just changed.
  check('the arithmetic is on screen before it is recorded',
    math.shown && /121\.00 per box/.test(math.text) && /\$11 per unit/.test(math.text));

  await setLine(page, 'WINDOW', 'JJF 109', 'UNIT', 250);
  check('...and no line at all when there is nothing to convert',
    await page.evaluate(() => getComputedStyle(document.getElementById('mat-pack-math-1')).display === 'none'));

  check('no page errors', pageErrors.length === 0);
  if (pageErrors.length) pageErrors.forEach(e => console.log('  PAGE ERROR:', e));

  await browser.close();
  console.log('\npack prompt: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
  process.exit(fail === 0 ? 0 : 1);
})();
