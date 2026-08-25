// The two halves of a checkbox must be the SAME FORM.
//
// ENTRY and EXIT each have a checkbox that moves a group of fields between a
// shared block at the bottom and a per-material block inside each material's
// box. Jose found that ticking it did more than move the fields:
//
//   ENTRY  — the per-material block asked "PM" where the shared block asks
//            "PM (Project Manager)", and it put PM BEFORE Received By where
//            the shared block puts it after. Same six questions, relabelled
//            and reordered depending on a checkbox.
//   EXIT   — the per-material Destination sat ABOVE the rack list, so ticking
//            the box shoved every rack row up or down the screen. The shared
//            Destination it replaces lives directly BELOW the racks.
//
// Neither is a crash, which is exactly why they survived: each screen looks
// perfectly reasonable on its own, and only ever looks wrong to somebody who
// toggles the checkbox and watches the form rearrange itself.
//
// A real browser is the only place these are checkable — both are questions
// about rendered position and rendered text, not about the source.
//
// Also guards the "×" rule: the delete button is not shown on the last
// remaining material or the last remaining location, because
// removeMatLine / removeExitMatLine / removeLocRowMat / removeExitLocRowMat
// all refuse to delete it. It was a red button that did nothing.
//
// Usage:  node tools/test-form-symmetry.js [path/to/Index_v3_fixed.html]

const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');

const SRC = process.argv[2] || path.join(__dirname, '..', 'Index_v3_fixed.html');
let html = fs.readFileSync(SRC, 'utf8');

const stub = `<script>
window.google=window.google||{}; window.google.charts=window.google.charts||{load:function(){},setOnLoadCallback:function(){}};
Object.assign(window.google,{script:{run:new Proxy({},{get(t,k){
  return function(){
    if(k==='withSuccessHandler'){ t._ok=arguments[0]; return window.google.script.run; }
    if(k==='withFailureHandler'){ return window.google.script.run; }
    var ok=t._ok;
    if(k==='getInitialData'){ setTimeout(function(){ ok && ok(window.__DATA); },20); return; }
    // processMovement is a dispatcher: the shape of the reply depends on the
    // ACTION, not on the call. Answering every action with {} is a stub that
    // lies — getPmDirectory returns a LIST, and handing back {} crashed
    // _refreshPmDatalist on .map. Actions that return lists get [].
    var action = (k==='processMovement') ? String(arguments[0]||'') : '';
    var LISTY = /^get(PmDirectory|Directory|ErrorLog|Trucks|Racks)$/;
    var reply = LISTY.test(action) ? [] : {};
    setTimeout(function(){ ok && ok(reply); },20);
  };
}})}});
window.__DATA={ userRole:'ADMIN', userEmail:'jose@ox-glass.com', userName:'Jose Castro',
 serverVersion:'99.9', company:{name:'PRODUCTION OX GLASS',domain:'ox-glass.com',logo:''},
 movements:[], stock:{}, monitoredMaterials:null,
 config:{ categories:['WINDOW','SCREEN'], projects:[], suppliers:[], locations:[], units:[] },
 incoming:[], rackPhotos:{}, systemActivity:[], materialPacks:{},
 rolePerms:{canSeeCosts:true,canEditMovements:true,canManageCatalog:true,canExportData:true},
 warehouseRoleLabel:'Warehouse', archiveCutoffMonths:12, oauthClientId:'', oauthRedirectUri:'' };
</script>`;
html = html.replace('</head>', stub + '</head>');
const f = path.join(os.tmpdir(), 'acopio-form-symmetry.html');
fs.writeFileSync(f, html);

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

// The label text a person actually reads, normalised the way a person reads
// it: case and the "(optional)" style suffixes do not make two labels
// different questions, but different words do.
const NORM = s => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  await page.goto('file://' + f);
  await page.waitForTimeout(500);

  // ─────────────────────────── ENTRY ───────────────────────────
  console.log('\n═══ ENTRY — the shared block and the per-material block ask the same six questions ═══\n');

  await page.evaluate(() => openMoveModal('ENTRY'));
  await page.waitForTimeout(300);

  const entry = await page.evaluate(() => {
    const chk = document.getElementById('mSameEntryInfoChk');
    chk.checked = false; toggleEntrySameInfo();
    const per = document.getElementById('mat-perinfo-1');
    const perLabels = [...per.querySelectorAll('.mat-line-lbl-sm')].map(l => l.textContent);
    // The shared block, in the order the fields are actually laid out.
    const sharedIds = ['mSupField','mGCField','mPOField','mProjField','mRespFieldWrap','mPMField'];
    const sharedLabels = sharedIds.map(id => {
      const el = document.getElementById(id);
      const lb = el && el.querySelector('label');
      return lb ? lb.textContent : null;
    });
    return { perLabels, sharedLabels };
  });

  console.log('  shared : ' + entry.sharedLabels.join(' | '));
  console.log('  per-mat: ' + entry.perLabels.slice(0, 6).join(' | '));

  check('the six fields appear in the SAME ORDER in both blocks',
    JSON.stringify(entry.perLabels.slice(0, 6).map(NORM)) ===
    JSON.stringify(entry.sharedLabels.map(NORM)));

  check('...and "PM (Project Manager)" is spelled out in the per-material block too, not shortened to "PM"',
    NORM(entry.perLabels[5]) === 'pm (project manager)');

  check('Received By comes BEFORE PM in the per-material block, as it does in the shared one',
    entry.perLabels.findIndex(l => NORM(l) === 'received by') <
    entry.perLabels.findIndex(l => NORM(l) === 'pm (project manager)'));

  // ─────────────────────────── EXIT ───────────────────────────
  console.log('\n═══ EXIT — ticking the box moves ONE field, and moves nothing else ═══\n');

  await page.evaluate(() => { closeMoveModalGuarded(); });
  await page.waitForTimeout(150);
  await page.evaluate(() => openMoveModal('EXIT'));
  await page.waitForTimeout(300);

  const exitGeo = await page.evaluate(() => {
    const snap = () => {
      const box  = document.querySelector('#multiExitContainer .exit-mat-line');
      const hdr  = box.querySelector('.exit-loc-hdr');
      const cat  = box.querySelector('.exit-mat-grid');
      const dest = document.getElementById('exit-destfield-1');
      const r = el => { const b = el.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, h: b.height }; };
      return {
        // Measured against the top of the material box, so that scrolling the
        // modal between the two snapshots cannot fake a pass or a failure.
        boxTop:   box.getBoundingClientRect().top,
        grid:     r(cat),
        locHdr:   r(hdr),
        destShown: dest ? getComputedStyle(dest).display !== 'none' : false,
        destTop:  dest && getComputedStyle(dest).display !== 'none' ? r(dest).top : null
      };
    };
    const chk = document.getElementById('mExitSameDestChk');
    chk.checked = true;  toggleExitSameDestination();
    const on  = snap();
    chk.checked = false; toggleExitSameDestination();
    const off = snap();
    return { on, off };
  });

  const relLocHdrOn  = exitGeo.on.locHdr.top  - exitGeo.on.boxTop;
  const relLocHdrOff = exitGeo.off.locHdr.top - exitGeo.off.boxTop;
  console.log('  rack list starts ' + relLocHdrOn.toFixed(1) + 'px into the box when ticked, ' +
              relLocHdrOff.toFixed(1) + 'px when unticked');

  check('unticking the box does NOT push the rack list down — Destination is below it now, not above',
    Math.abs(relLocHdrOn - relLocHdrOff) < 1);

  check('the category/name row is in the same place either way',
    Math.abs((exitGeo.on.grid.top - exitGeo.on.boxTop) -
             (exitGeo.off.grid.top - exitGeo.off.boxTop)) < 1);

  check('the per-material Destination is hidden while the shared one is in use, and shown when it is not',
    exitGeo.on.destShown === false && exitGeo.off.destShown === true);

  check('...and when shown it sits BELOW the rack list, where the shared field it replaces sits',
    exitGeo.off.destTop > exitGeo.off.locHdr.bottom);

  // ─────────────────────── the "×" that did nothing ───────────────────────
  console.log('\n═══ the delete button is only offered when deleting is possible ═══\n');

  const vis = el => el && el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden';

  const exitX = await page.evaluate(() => {
    const shown = sel => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden';
    };
    const one = {
      mat: shown('#multiExitContainer .exit-mat-line .exit-mat-remove'),
      loc: shown('#exit-locs-1 .exit-loc-row .el-rm')
    };
    addExitMatLine();
    addExitLocRowMat(1);
    const two = {
      mat: shown('#multiExitContainer .exit-mat-line .exit-mat-remove'),
      loc: shown('#exit-locs-1 .exit-loc-row .el-rm')
    };
    // Widths of the rack row's inputs, to prove hiding the last × did not
    // silently re-flow the columns out of line with their own header.
    const rowInputs = () => [...document.querySelectorAll('#exit-locs-1 .exit-loc-row')]
      .map(r => [...r.children].map(c => Math.round(c.getBoundingClientRect().width)).join(','));
    return { one, two, rows: rowInputs() };
  });

  check('EXIT: a lone material shows no × (removeExitMatLine would refuse anyway)', exitX.one.mat === false);
  check('EXIT: a lone rack row shows no ×', exitX.one.loc === false);
  check('EXIT: add a second material and BOTH get their ×', exitX.two.mat === true);
  check('EXIT: add a second rack row and BOTH get their ×', exitX.two.loc === true);
  check('EXIT: hiding the last × kept the column widths — the rows still line up with the header above them',
    exitX.rows.length === 2 && exitX.rows[0] === exitX.rows[1]);

  await page.evaluate(() => { closeMoveModalGuarded(); });
  await page.waitForTimeout(150);
  await page.evaluate(() => openMoveModal('ENTRY'));
  await page.waitForTimeout(300);

  const entryX = await page.evaluate(() => {
    const shown = sel => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden';
    };
    const one = {
      mat: shown('#multiMatContainer .mat-line .mat-line-remove'),
      loc: shown('#mat-locs-1 .loc-row .btn-remove-loc')
    };
    addMatLine();
    addLocRowMat(1, true);
    const two = {
      mat: shown('#multiMatContainer .mat-line .mat-line-remove'),
      loc: shown('#mat-locs-1 .loc-row .btn-remove-loc')
    };
    const rows = [...document.querySelectorAll('#mat-locs-1 .loc-row')]
      .map(r => [...r.children].map(c => Math.round(c.getBoundingClientRect().width)).join(','));
    return { one, two, rows };
  });

  check('ENTRY: a lone material shows no ×', entryX.one.mat === false);
  check('ENTRY: a lone rack row shows no ×', entryX.one.loc === false);
  check('ENTRY: add a second material and BOTH get their ×', entryX.two.mat === true);
  check('ENTRY: add a second rack row and BOTH get their ×', entryX.two.loc === true);
  check('ENTRY: hiding the last × kept the column widths',
    entryX.rows.length === 2 && entryX.rows[0] === entryX.rows[1]);

  check('no page errors', pageErrors.length === 0);
  if (pageErrors.length) pageErrors.forEach(e => console.log('  PAGE ERROR:', e));

  await browser.close();
  console.log('\nform symmetry: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
  process.exit(fail === 0 ? 0 : 1);
})();
