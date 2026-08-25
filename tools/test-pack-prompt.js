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

function _expectedPackRows(){
  return Object.keys(PACKS).reduce((n, k) => n + PACKS[k].packs.length, 0) + 1; // +1: the one saved during the test
}

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
  check('a known box states it quietly instead of asking again — "12 units per box [edit]"',
    st.shown && /known/.test(st.cls) && /12 units per box/.test(st.text) && /edit/.test(st.text));

  // Jose's flow: [edit] turns the same line back into the question, in place,
  // with the current number already in the box and the button reading Save.
  const edited = await page.evaluate(() => {
    document.querySelector('#mat-pack-note-1 .pack-change').click();
    const h = document.getElementById('mat-pack-note-1');
    return { cls: h.className,
             text: (h.textContent || '').replace(/\s+/g, ' ').trim(),
             prefilled: h.querySelector('.pack-qty').value,
             btn: h.querySelector('.pack-save').textContent.trim() };
  });
  check('[edit] reopens the question in the SAME line, prefilled, with a Save button',
    /ask/.test(edited.cls) && /how many units/i.test(edited.text) &&
    edited.prefilled === '12' && /^save$/i.test(edited.btn));

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
    const ic = el.querySelector('.info-ic');
    return { shown: getComputedStyle(el).display !== 'none',
             text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
             tip: ic ? ic.getAttribute('data-tip') : null };
  });
  console.log('    → ' + math.text);
  // 121 / 11 = 11 exactly, using the factor the previous block just changed.
  // Jose: the full sentence was too long for a line under a field. The result
  // is what shows; the working lives behind the "i".
  // The "i" badge renders as the letter i inside the element, so the visible
  // text is "i$11 per unit". What matters is that the WORKING is not on it.
  check('the LINE shows only the result — "$11 per unit", no division on it',
    math.shown && /\$11 per unit/.test(math.text) && !/÷/.test(math.text));
  check('...and the working is in the tooltip, not on the line',
    math.tip && /121\.00 per box/.test(math.tip) && /÷ 11 units/.test(math.tip));

  await setLine(page, 'WINDOW', 'JJF 109', 'UNIT', 250);
  check('...and no line at all when there is nothing to convert',
    await page.evaluate(() => getComputedStyle(document.getElementById('mat-pack-math-1')).display === 'none'));

  console.log('\n═══ "we don\'t know the cost" is BLANK, not zero ═══\n');

  const zeroHint = async (v) => {
    await page.evaluate(x => {
      const c = document.getElementById('mat-cost-1');
      c.value = x; c.dispatchEvent(new Event('input', { bubbles: true }));
    }, v);
    await page.waitForTimeout(80);
    return page.evaluate(() => {
      const el = document.getElementById('mat-cost-zero-1');
      return { shown: getComputedStyle(el).display !== 'none',
               text: (el.textContent || '').replace(/\s+/g, ' ').trim() };
    });
  };

  await setLine(page, 'WINDOW', 'JJF 109', 'UNIT', null);
  let z = await zeroHint('');
  check('a blank cost says nothing — that is the normal way to record "cost unknown"', z.shown === false);

  z = await zeroHint('0');
  console.log('    → ' + z.text);
  check('a typed 0 warns that it records FREE and pulls the average down',
    z.shown && /free/i.test(z.text) && /average/i.test(z.text));
  check('...and points at the blank box as the way to say "not known"',
    /empty|clear/i.test(z.text));

  z = await zeroHint('250');
  check('a real cost says nothing', z.shown === false);

  console.log('\n═══ every factor in one place (Settings → Materials) ═══\n');

  const panel = await page.evaluate(() => {
    // Render the panel straight into a detached host, the same call the tab makes.
    const host = document.createElement('div');
    host.id = 'packsPanel';
    document.body.appendChild(host);
    _renderPacksPanel();
    const rows = [...host.querySelectorAll('.packs-row')].map(r =>
      (r.textContent || '').replace(/\s+/g, ' ').trim());
    return { count: (host.querySelector('.packs-count') || {}).textContent,
             rows, title: (host.querySelector('.packs-title') || {}).textContent };
  });
  console.log('    ' + panel.rows.join('\n    '));
  check('the panel lists every remembered factor, one row each',
    panel.rows.length === _expectedPackRows() && panel.count === String(_expectedPackRows()));
  check('...each row naming the material and the factor',
    panel.rows.some(r => /MM210/.test(r) && /per box/.test(r)) &&
    panel.rows.some(r => /MM210/.test(r) && /per pallet/.test(r)));
  check('...under a heading that says what these numbers are',
    /units per box/i.test(panel.title || ''));

  const empty = await page.evaluate(() => {
    const saved = window.materialPacks;
    window.materialPacks = {};
    _renderPacksPanel();
    const host = document.getElementById('packsPanel');
    const txt = (host.querySelector('.packs-empty') || {}).textContent || '';
    window.materialPacks = saved;
    return txt.replace(/\s+/g, ' ').trim();
  });
  console.log('    (empty) ' + empty);
  check('with no packs at all it says so plainly, instead of looking like unfinished setup',
    /never will be/i.test(empty) && /one at a time/i.test(empty));

  console.log('\n═══ answering and walking away still counts as answering ═══\n');

  // Jose: "¿qué pasa si el cliente no da clic en Add?" Before this, the answer
  // was: nothing is remembered and they have to type it again next time — safe,
  // but a way to answer and be ignored.
  await setLine(page, 'HARDWARE', 'WALKED AWAY THING', 'BOX', null);
  const walked = await page.evaluate(async () => {
    const h = document.getElementById('mat-pack-note-1');
    const inp = h.querySelector('.pack-qty');
    inp.focus(); inp.value = 8;
    inp.blur();                                  // never presses the button
    await new Promise(r => setTimeout(r, 300));
    return { factor: _packFactor('HARDWARE', 'WALKED AWAY THING', 'BOX'),
             line: (document.getElementById('mat-pack-note-1').textContent || '')
                     .replace(/\s+/g, ' ').trim(),
             sends: window.__saved.slice(-1)[0] };
  });
  console.log('    → ' + walked.line);
  check('typing 8 and leaving the field saves it — the number typed IS the answer',
    walked.factor === 8 && walked.sends && Number(walked.sends.perPack) === 8);
  check('...and the line switches to the remembered state so it is visible that it landed',
    /8 units per box/.test(walked.line));

  // A CHANGE is excluded on purpose: it alters costs already being computed.
  await setLine(page, 'HARDWARE', 'MM210', 'BOX', null);
  const changeWalk = await page.evaluate(async () => {
    document.querySelector('#mat-pack-note-1 .pack-change').click();
    const h = document.getElementById('mat-pack-note-1');
    const inp = h.querySelector('.pack-qty');
    const before = window.__saved.length;
    inp.focus(); inp.value = 99; inp.blur();
    await new Promise(r => setTimeout(r, 300));
    return { saved: window.__saved.length > before,
             factor: _packFactor('HARDWARE', 'MM210', 'BOX') };
  });
  check('CHANGING an existing factor is never committed by walking away — it keeps the two-press warning',
    changeWalk.saved === false && changeWalk.factor !== 99);

  // Jose's other point, measured rather than assumed: the shown value has to
  // follow the factor without a page refresh.
  await setLine(page, 'HARDWARE', 'MM210', 'BOX', 120);
  const live = await page.evaluate(async () => {
    const read = () => (document.getElementById('mat-pack-math-1').textContent || '')
                         .replace(/\s+/g, ' ').trim();
    const before = read();
    const wasFactor = _packFactor('HARDWARE', 'MM210', 'BOX');
    document.querySelector('#mat-pack-note-1 .pack-change').click();
    const h = document.getElementById('mat-pack-note-1');
    h.querySelector('.pack-qty').value = 10;
    h.querySelector('.pack-save').click();      // warns
    h.querySelector('.pack-save').click();      // commits
    await new Promise(r => setTimeout(r, 250));
    return { before, after: read(), wasFactor };
  });
  console.log('    ' + live.before + '  →  ' + live.after);
  // Expectations computed from the factor as it actually is at this point,
  // not from the fixture: earlier blocks in this file deliberately change
  // MM210's box factor, and my first version of this check assumed 12 and
  // failed on a live update that was working perfectly.
  check('changing units-per-box updates the per-unit value live, with no page refresh',
    live.before !== live.after &&
    live.before.indexOf('$' + (Math.round((120 / live.wasFactor) * 10000) / 10000) + ' per unit') !== -1 &&
    live.after.indexOf('$12 per unit') !== -1);

  check('no page errors', pageErrors.length === 0);
  if (pageErrors.length) pageErrors.forEach(e => console.log('  PAGE ERROR:', e));

  await browser.close();
  console.log('\npack prompt: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
  process.exit(fail === 0 ? 0 : 1);
})();
