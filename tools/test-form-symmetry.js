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

  // ──────────────── TRANSFER / RETURN / WASTE follow the same shape ────────────────
  console.log('\n═══ all five screens open the same way: date first, material in a box ═══\n');

  const TINT = { TRANSFER: 'mm-transfer', RETURN: 'mm-return', WASTE: 'mm-waste' };

  for (const type of ['TRANSFER', 'RETURN', 'WASTE']) {
    await page.evaluate(() => { closeMoveModalGuarded(); });
    await page.waitForTimeout(150);
    await page.evaluate(t => openMoveModal(t), type);
    await page.waitForTimeout(300);

    const g = await page.evaluate(() => {
      const box  = document.getElementById('moveMatBox');
      const date = document.getElementById('moveDateGrid');
      const vis  = el => el && getComputedStyle(el).display !== 'none';
      // Every field the modal is actually showing, top to bottom on screen —
      // the order a person reads, not the order of the source.
      const order = [...document.querySelectorAll("#moveOverlay .field")]
        .filter(f => vis(f) && f.offsetParent !== null)
        .map(f => {
          const lb = f.querySelector('label');
          return (lb ? lb.textContent : '').replace(/\s+/g, ' ').trim();
        })
        .filter(Boolean);
      return {
        dateShown: vis(date),
        boxShown:  vis(box),
        tint: box ? [...box.classList].filter(c => c.startsWith('mm-')) : [],
        firstLabel: order[0] || null,
        // Is the material box below the date row and above the "who did it"
        // fields, i.e. in the same slot ENTRY and EXIT put theirs?
        dateAboveBox: date.getBoundingClientRect().bottom <= box.getBoundingClientRect().top + 1,
        boxAboveResp: box.getBoundingClientRect().bottom <=
                      document.getElementById('mRespFieldWrap').getBoundingClientRect().top + 1,
        // The category/name fields must be INSIDE the box, not beside it.
        catInBox:  box.contains(document.getElementById('mCatField')),
        nameInBox: box.contains(document.getElementById('mNameField')),
        locInBox:  box.contains(document.getElementById('singleLocGrid')),
        trInBox:   box.contains(document.getElementById('multiTransferSection')),
        hdr: (document.querySelector('#moveMatBox .move-mat-lbl') || {}).textContent,
        badge: (document.getElementById('moveMatTotal') || {}).textContent
      };
    });

    console.log('  ' + type + ': first field "' + g.firstLabel + '", tint ' + JSON.stringify(g.tint) +
                ', header "' + g.hdr + '", badge ' + g.badge);

    check(type + ': the date is the first field on the screen, as in ENTRY and EXIT',
      g.dateShown && /^date/i.test(g.firstLabel || ''));
    check(type + ': the material sits in its own box', g.boxShown);
    check(type + ': the box is tinted to match its tab', JSON.stringify(g.tint) === JSON.stringify([TINT[type]]));
    check(type + ': the box carries a header and a quantity badge',
      (g.hdr || '').trim() === 'Material' && g.badge !== undefined);
    check(type + ': the box comes after the date and before "who did it"',
      g.dateAboveBox && g.boxAboveResp);
    check(type + ': category and name are INSIDE the box, not loose beside it',
      g.catInBox && g.nameInBox);
    check(type + ': the location fields are in the box too — half a form in a box is worse than none',
      type === 'TRANSFER' ? g.trInBox : g.locInBox);
  }

  // The badge has to track the number that will actually be saved, and that is
  // a different field on TRANSFER than on the other two.
  console.log('\n═══ the badge counts what will be recorded ═══\n');

  await page.evaluate(() => { closeMoveModalGuarded(); });
  await page.waitForTimeout(150);
  await page.evaluate(() => openMoveModal('WASTE'));
  await page.waitForTimeout(250);
  const wasteBadge = await page.evaluate(() => {
    const q = document.getElementById('mQty');
    q.value = 7; q.dispatchEvent(new Event('input'));
    return document.getElementById('moveMatTotal').textContent;
  });
  check('WASTE: typing 7 in Quantity puts 7 on the badge', wasteBadge === '7');

  await page.evaluate(() => { closeMoveModalGuarded(); });
  await page.waitForTimeout(150);
  await page.evaluate(() => openMoveModal('TRANSFER'));
  await page.waitForTimeout(250);
  const trBadge = await page.evaluate(() => {
    addTransferRow(); addTransferRow();
    const qs = [...document.querySelectorAll('#transferRowsContainer .tr-qty')];
    qs[0].value = 120; qs[0].dispatchEvent(new Event('input'));
    qs[1].value = 180; qs[1].dispatchEvent(new Event('input'));
    return { badge: document.getElementById('moveMatTotal').textContent,
             qtyFieldShown: getComputedStyle(document.getElementById('mQtyField')).display !== 'none' };
  });
  check('TRANSFER: the badge SUMS the rows (120 + 180 = 300), because that is what gets saved',
    trBadge.badge === '300');
  check('TRANSFER: ...and it is not reading the Quantity box, which this screen hides and ignores',
    trBadge.qtyFieldShown === false);

  // TRANSFER was the one list that DID delete its last row, leaving a transfer
  // with nothing to transfer — caught by looking at the screen, not by a test.
  const trRows = await page.evaluate(() => {
    const c = document.getElementById('transferRowsContainer');
    const shown = () => {
      const el = c.querySelector('.transfer-row .btn-remove-loc');
      return el ? getComputedStyle(el).visibility !== 'hidden' : null;
    };
    const many = { n: c.querySelectorAll('.transfer-row').length, x: shown() };
    // Delete down past the last row and see whether it holds the line.
    let guard = 0;
    while (c.querySelectorAll('.transfer-row').length && guard++ < 10) {
      const btn = c.querySelector('.transfer-row .btn-remove-loc');
      removeTransferRow(btn);
      if (c.querySelectorAll('.transfer-row').length === 1) break;
    }
    const btn = c.querySelector('.transfer-row .btn-remove-loc');
    removeTransferRow(btn);   // the one that used to empty the list
    return { many, left: c.querySelectorAll('.transfer-row').length, oneX: shown() };
  });
  check('TRANSFER: several rows all show their ×', trRows.many.n > 1 && trRows.many.x === true);
  check('TRANSFER: the last row cannot be deleted — a transfer with no rows is not a transfer',
    trRows.left === 1);
  check('TRANSFER: ...so the lone row shows no × either', trRows.oneX === false);

  // ─────── opening is blank, switching carries, the cursor is always in Name ───────
  //
  // Jose's rule, in his words: "al cambiar de un tipo de movimiento sí se debe
  // llevar la información que fue escrita, pero al abrir la ventana de
  // movimientos no debe haber ningún dato escrito, ni siquiera '0' en qty,
  // también cuando se pasa de un movimiento a otro el cursor siempre aparece
  // dentro de name."
  console.log('\n═══ a fresh open shows nothing typed ═══\n');

  const TYPES = ['ENTRY', 'EXIT', 'TRANSFER', 'RETURN', 'WASTE'];

  for (const type of TYPES) {
    // A real fresh open, from a clean page — reusing the same page would let a
    // previous screen's state pass for a clean one, which is the exact bug.
    await page.goto('file://' + f);
    await page.waitForTimeout(450);
    await page.evaluate(t => openMoveModal(t), type);
    await page.waitForTimeout(350);

    const st = await page.evaluate(() => {
      const vis = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      const dirty = [];
      document.querySelectorAll('#moveOverlay input, #moveOverlay textarea').forEach(el => {
        if (el.type === 'checkbox' || el.type === 'radio' || el.type === 'date') return;
        // The document group's name ("Invoice") is a LABEL for an attachment
        // slot, not a value that can be saved as stock. It is exempted here on
        // purpose and flagged to Jose rather than quietly cleared: emptying it
        // would make somebody name the group every single time they attach a
        // photo, which is a cost his rule was not aimed at. If he wants it
        // blank too, delete this line and the default in resetDocBuilder.
        if (el.classList.contains('doc-group-name')) return;
        if (!vis(el)) return;
        if (String(el.value || '').trim() !== '') dirty.push((el.id || el.className) + '=' + el.value);
      });
      return {
        dirty,
        focus: document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : null,
        commLabel: (document.getElementById('commLabel') || {}).textContent
      };
    });

    const wantFocus = type === 'ENTRY' ? 'mat-name-1' : (type === 'EXIT' ? 'exit-name-1' : 'mName');
    console.log('  ' + type.padEnd(9) + ' focus=' + st.focus +
                '  dirty=' + (st.dirty.length ? st.dirty.join(',') : 'none'));

    check(type + ': not one visible box has anything typed in it on a fresh open',
      st.dirty.length === 0);
    check(type + ': the cursor is already in Name — nothing to click before typing',
      st.focus === wantFocus);
  }

  console.log('\n═══ switching type carries the material, and keeps the cursor in Name ═══\n');

  // Every ordered pair, because the bug Jose found was pair-specific: RETURN→
  // WASTE worked, ENTRY→EXIT lost everything, and EXIT→TRANSFER lost only the
  // quantity. Checking one pair would have "passed" before any of this.
  const setMaterial = async (type, name, qty) => {
    await page.evaluate(([t, nm, q]) => {
      const fire = el => { el.dispatchEvent(new Event('input', { bubbles: true })); };
      if (t === 'ENTRY') {
        document.getElementById('mat-name-1').value = nm;
        const lq = document.querySelector('#mat-locs-1 .loc-qty'); lq.value = q; fire(lq);
        syncMatLineQty(1);
      } else if (t === 'EXIT') {
        document.getElementById('exit-name-1').value = nm;
        const eq = document.querySelector('#exit-locs-1 .el-qty'); eq.value = q; fire(eq);
      } else if (t === 'TRANSFER') {
        document.getElementById('mName').value = nm;
        const tq = document.querySelector('#transferRowsContainer .tr-qty'); tq.value = q; fire(tq);
      } else {
        document.getElementById('mName').value = nm;
        const mq = document.getElementById('mQty'); mq.value = q; fire(mq);
      }
    }, [type, name, qty]);
  };

  let pairFails = 0;
  for (const from of TYPES) {
    const got = [];
    for (const to of TYPES) {
      if (to === from) continue;
      await page.evaluate(t => openMoveModal(t), from);
      await page.waitForTimeout(260);
      await setMaterial(from, 'MM210', 12);
      await page.evaluate(t => _moveTypeBarClick(t), to);
      await page.waitForTimeout(350);

      const r = await page.evaluate(t => {
        const v = id => (document.getElementById(id) || {}).value || '';
        const sum = sel => { let n = 0; document.querySelectorAll(sel).forEach(i => n += parseFloat(i.value) || 0); return n; };
        let name = '', qty = 0;
        if (t === 'ENTRY') { name = v('mat-name-1'); qty = sum('#mat-locs-1 .loc-qty'); }
        else if (t === 'EXIT') { name = v('exit-name-1'); qty = sum('#exit-locs-1 .el-qty'); }
        else if (t === 'TRANSFER') { name = v('mName'); qty = sum('#transferRowsContainer .tr-qty'); }
        else { name = v('mName'); qty = parseFloat(v('mQty')) || 0; }
        return { name, qty,
          focus: document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : null };
      }, to);

      const wantFocus = to === 'ENTRY' ? 'mat-name-1' : (to === 'EXIT' ? 'exit-name-1' : 'mName');
      const ok = r.name === 'MM210' && r.qty === 12 && r.focus === wantFocus;
      if (!ok) { pairFails++; got.push(to + '(' + r.name + '/' + r.qty + '/' + r.focus + ')'); }
      else got.push(to + '✓');
    }
    console.log('  from ' + from.padEnd(9) + '→ ' + got.join('  '));
  }
  check('every one of the 20 type switches carries name AND quantity, and leaves the cursor in Name',
    pairFails === 0);

  console.log('\n═══ the colour is on the location box, not the whole material ═══\n');

  for (const type of ['EXIT', 'TRANSFER', 'RETURN', 'WASTE']) {
    await page.evaluate(t => openMoveModal(t), type);
    await page.waitForTimeout(300);

    const c = await page.evaluate(t => {
      const bg = el => el ? getComputedStyle(el).backgroundColor : null;
      const mat = t === 'EXIT' ? document.querySelector('#multiExitContainer .exit-mat-line')
                               : document.getElementById('moveMatBox');
      const loc = t === 'EXIT' ? document.querySelector('.exit-loc-box')
                               : document.getElementById('moveLocBox');
      return { mat: bg(mat), loc: bg(loc),
               entryMat: 'rgb(248, 250, 252)' };   // ENTRY's neutral .mat-line
    }, type);

    console.log('  ' + type.padEnd(9) + ' material=' + c.mat + '  location=' + c.loc);
    check(type + ': the material box is the same neutral grey ENTRY uses', c.mat === c.entryMat);
    check(type + ': ...and the movement colour is on the location box instead',
      c.loc && c.loc !== c.mat && c.loc !== 'rgba(0, 0, 0, 0)');
  }

  // WASTE renames the comments label; nothing used to rename it back.
  await page.evaluate(() => openMoveModal('WASTE'));
  await page.waitForTimeout(250);
  await page.evaluate(() => _moveTypeBarClick('RETURN'));
  await page.waitForTimeout(250);
  const lbl = await page.evaluate(() => document.getElementById('commLabel').textContent);
  check('a RETURN opened after a WASTE asks for Comments, not for a "Reason for Waste"',
    /^Comments$/i.test((lbl || '').trim()));

  check('no page errors', pageErrors.length === 0);
  if (pageErrors.length) pageErrors.forEach(e => console.log('  PAGE ERROR:', e));

  await browser.close();
  console.log('\nform symmetry: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
  process.exit(fail === 0 ? 0 : 1);
})();
