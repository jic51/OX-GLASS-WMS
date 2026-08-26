// Editing a movement should not be lazy.
//
// Jose: "al editar un material toda la información de ese material se muestre
// en la ventana de edición, toda, para que solo pueda modificar lo que quiero
// y no preocuparme por volver a llenar la demás información."
//
// The form already had every editable field. The problem is upstream: a
// TRANSFER or a WASTE is SAVED with supplier, GC, PO and PM empty, because
// those boxes are hidden on those screens. Open one to edit and you face five
// blanks for a material whose supplier the app has known all along — so you
// either retype them or leave the history uneven, which is precisely what Jose
// sees when he searches: some rows for a material carry the project and the
// supplier, others carry nothing.
//
// The rule this guards:
//
//   1. A blank box is filled from the SAME material's own history, most recent
//      value first.
//   2. A box the row already has a value in is NEVER touched. The record wins
//      over the guess, always.
//   3. Every filled box is MARKED. A suggestion that looked identical to a
//      stored value would make the form assert things about this row that are
//      not recorded anywhere — the same mistake as the GENERIC that started
//      this whole thread.
//   4. GENERIC is never suggested. It is the word for "unassigned", not a job.
//
// Usage:  node tools/test-edit-gaps.js [path/to/Index_v3_fixed.html]

const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');

const SRC = process.argv[2] || path.join(__dirname, '..', 'Index_v3_fixed.html');
let html = fs.readFileSync(SRC, 'utf8');

// Jose's own shape: two ENTRIES that carry everything, then a TRANSFER that
// carries almost nothing because the form never asked.
const MOVS = [
  { rowIdx: 2, moveType: 'ENTRY', category: 'WINDOW', name: 'BS10', qty: 12,
    unit: 'UNIT', dateRec: '2026-06-26', sourceLoc: '', destLoc: 'C2A',
    project: 'PAT BS 10', gc: 'DAL', po: '06-2345', supplier: 'AMSCO',
    pm: 'KIM', responsible: 'JOSE', comments: '' },
  { rowIdx: 3, moveType: 'ENTRY', category: 'WINDOW', name: 'BS10', qty: 15,
    unit: 'UNIT', dateRec: '2026-06-27', sourceLoc: '', destLoc: 'B2A',
    project: 'PAT BS 10', gc: 'DAL', po: '06-9999', supplier: 'AMSCO',
    pm: 'KIM', responsible: 'JOSE', comments: '' },
  { rowIdx: 4, moveType: 'TRANSFER', category: 'WINDOW', name: 'BS10', qty: 12,
    unit: 'UNIT', dateRec: '2026-07-14', sourceLoc: 'C2A', destLoc: 'A5A',
    project: '', gc: '', po: '', supplier: '', pm: '', responsible: '', comments: '' },
  // A different material, only ever received unassigned.
  { rowIdx: 5, moveType: 'ENTRY', category: 'SCREEN', name: 'LONE', qty: 4,
    unit: 'UNIT', dateRec: '2026-07-01', sourceLoc: '', destLoc: 'A1A',
    project: 'GENERIC', gc: '', po: '', supplier: '', pm: '', responsible: '', comments: '' },
  { rowIdx: 6, moveType: 'WASTE', category: 'SCREEN', name: 'LONE', qty: 1,
    unit: 'UNIT', dateRec: '2026-07-05', sourceLoc: 'A1A', destLoc: '',
    project: '', gc: '', po: '', supplier: '', pm: '', responsible: '', comments: '' },
  // A DIFFERENT material for the "record beats guess" case. Sharing BS10 made
  // this row both the exception under test and the newest history entry for
  // the material, so "most recent wins" correctly picked its supplier for
  // every other BS10 row — the code was right and the fixture was asking two
  // questions with one row.
  { rowIdx: 8, moveType: 'ENTRY', category: 'WINDOW', name: 'BS20', qty: 9,
    unit: 'UNIT', dateRec: '2026-06-30', sourceLoc: '', destLoc: 'D1A',
    project: 'PAT BS 10', gc: 'DAL', po: '06-1111', supplier: 'AMSCO',
    pm: 'KIM', responsible: 'JOSE', comments: '' },
  { rowIdx: 7, moveType: 'TRANSFER', category: 'WINDOW', name: 'BS20', qty: 3,
    unit: 'UNIT', dateRec: '2026-07-20', sourceLoc: 'D1A', destLoc: 'B1B',
    project: '', gc: '', po: '', supplier: 'HARTUNG', pm: '', responsible: '', comments: '' }
];

const stub = `<script>
window.google=window.google||{}; window.google.charts=window.google.charts||{load:function(){},setOnLoadCallback:function(){}};
Object.assign(window.google,{script:{run:new Proxy({},{get(t,k){
  return function(){
    if(k==='withSuccessHandler'){ t._ok=arguments[0]; return window.google.script.run; }
    if(k==='withFailureHandler'){ return window.google.script.run; }
    var ok=t._ok;
    if(k==='getInitialData'){ setTimeout(function(){ ok && ok(window.__DATA); },20); return; }
    var a=(k==='processMovement')?String(arguments[0]||''):'';
    var r=/^get(PmDirectory|Directory|ErrorLog|Trucks|Racks)$/.test(a)?[]:{};
    setTimeout(function(){ ok && ok(r); },20);
  };
}})}});
window.__DATA={ userRole:'ADMIN', userEmail:'jose@x.com', userName:'Jose Castro',
 serverVersion:'99.9', company:{name:'PRODUCTION',domain:'x.com',logo:''},
 movements:${JSON.stringify(MOVS)}, stock:{}, monitoredMaterials:null,
 config:{ categories:['WINDOW','SCREEN'], projects:[], suppliers:[], locations:[], units:[] },
 incoming:[], rackPhotos:{}, systemActivity:[], materialPacks:{},
 rolePerms:{canSeeCosts:true,canEditMovements:true,canManageCatalog:true,canExportData:true},
 warehouseRoleLabel:'Warehouse', archiveCutoffMonths:12, oauthClientId:'', oauthRedirectUri:'' };
</script>`;
html = html.replace('</head>', stub + '</head>');
const f = path.join(os.tmpdir(), 'acopio-edit-gaps.html');
fs.writeFileSync(f, html);

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

const FIELDS = ['em_supplier', 'em_gc', 'em_po', 'em_project', 'em_pm', 'em_responsible'];

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  await page.goto('file://' + f);
  await page.waitForTimeout(500);

  const openAndRead = async (rowIdx) => {
    await page.evaluate(r => openEditMovModal(r), rowIdx);
    await page.waitForTimeout(250);
    return page.evaluate(ids => {
      const out = { fields: {}, note: '' };
      ids.forEach(id => {
        const el = document.getElementById(id);
        out.fields[id] = { value: el.value, suggested: el.classList.contains('em-suggested') };
      });
      const n = document.getElementById('emGapNote');
      out.note = (n && getComputedStyle(n).display !== 'none') ? n.textContent.trim() : '';
      return out;
    }, FIELDS);
  };

  console.log('\n═══ a TRANSFER saved with five empty boxes ═══\n');

  let r = await openAndRead(4);
  Object.keys(r.fields).forEach(k => console.log('    ' + k.padEnd(16) +
    JSON.stringify(r.fields[k].value) + (r.fields[k].suggested ? '   ✦ suggested' : '')));

  check('the supplier the app has known all along is offered, instead of a blank',
    r.fields.em_supplier.value === 'AMSCO');
  check('...and so are GC, PO, project, PM and who received it',
    r.fields.em_gc.value === 'DAL' && r.fields.em_po.value === '06-9999' &&
    r.fields.em_project.value === 'PAT BS 10' && r.fields.em_pm.value === 'KIM' &&
    r.fields.em_responsible.value === 'JOSE');
  check('the MOST RECENT value wins — PO 06-9999 from the newer entry, not 06-2345',
    r.fields.em_po.value === '06-9999');
  check('every one of them is marked as a suggestion, not passed off as recorded',
    FIELDS.every(id => r.fields[id].suggested === true));
  console.log('    note: ' + r.note);
  check('a line says how many were filled and that nothing is saved until you save',
    /6 fields were empty/.test(r.note) && /until you save/i.test(r.note));

  console.log('\n═══ the record always beats the guess ═══\n');

  r = await openAndRead(7);
  check('a row that HAS its own supplier keeps it — HARTUNG, not the more common AMSCO',
    r.fields.em_supplier.value === 'HARTUNG');
  check('...and that box is NOT marked, because it is what the row actually holds',
    r.fields.em_supplier.suggested === false);
  check('the boxes that really were empty are still filled and marked',
    r.fields.em_project.value === 'PAT BS 10' && r.fields.em_project.suggested === true);

  console.log('\n═══ GENERIC is never suggested ═══\n');

  r = await openAndRead(6);
  console.log('    project on the WASTE row: ' + JSON.stringify(r.fields.em_project.value));
  check('a material only ever received as GENERIC has no project suggested — it is a placeholder, not a job',
    r.fields.em_project.value === '');
  check('...and nothing else is invented for it either',
    r.fields.em_supplier.value === '' && r.fields.em_pm.value === '');
  check('no note appears when there was nothing to offer', r.note === '');

  console.log('\n═══ a complete row is left completely alone ═══\n');

  r = await openAndRead(2);
  check('every value is the row\'s own', r.fields.em_supplier.value === 'AMSCO' &&
    r.fields.em_po.value === '06-2345');
  check('...none of them marked as a suggestion',
    FIELDS.every(id => r.fields[id].suggested === false));
  check('...and no note', r.note === '');

  console.log('\n═══ touching a suggestion makes it yours ═══\n');

  await openAndRead(4);
  const afterType = await page.evaluate(() => {
    const el = document.getElementById('em_supplier');
    el.value = 'SOMEONE ELSE';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return { suggested: el.classList.contains('em-suggested'),
             otherStill: document.getElementById('em_pm').classList.contains('em-suggested') };
  });
  check('editing a suggested box drops the mark', afterType.suggested === false);
  check('...and leaves the other suggestions alone', afterType.otherStill === true);

  // Re-opening must not stack a fresh listener on the same box each time.
  console.log('\n═══ re-opening does not leave marks behind ═══\n');
  await openAndRead(2);
  r = await openAndRead(4);
  check('opening a complete row and then an incomplete one still marks correctly',
    r.fields.em_supplier.suggested === true && r.fields.em_supplier.value === 'AMSCO');
  const clean = await page.evaluate(() => {
    openEditMovModal(2);
    return ['em_supplier','em_gc','em_po','em_project','em_pm','em_responsible']
      .some(id => document.getElementById(id).classList.contains('em-suggested'));
  });
  check('...and going back to the complete row clears every mark', clean === false);

  check('no page errors', pageErrors.length === 0);
  if (pageErrors.length) pageErrors.forEach(e => console.log('  PAGE ERROR:', e));

  await browser.close();
  console.log('\nedit gaps: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
  process.exit(fail === 0 ? 0 : 1);
})();
