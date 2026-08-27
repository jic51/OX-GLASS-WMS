// The very first screen a customer ever sees, actually RUN.
//
// createStartHereSheet_ builds the welcome panel and the consent checkbox, and
// (new in v11.12) the two tabs holding the Terms and the Privacy Policy plus
// the links to them. All of it executes exactly once, on the customer's first
// open, before anything else in the product exists.
//
// That is the worst possible place for an untested throw: if this function
// dies half-way the customer opens the file and finds a blank or half-drawn
// sheet, with no app, no setup wizard, and no way to tell what went wrong.
//
// It was ALSO the least-tested code in the file. tools/test-terms-checkbox.js
// covers onEdit — what happens when the box is ticked — and nothing covered
// the drawing. `node --check` parses it; it had never been run.
//
// So this runs the real functions in a Node vm against a fake spreadsheet that
// records what was written.
//
// Usage:  node tools/test-start-here.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const GS = fs.readFileSync(path.join(__dirname, '..', 'Code_v3_fixed.gs'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

function extractFn(name) {
  const start = GS.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('not found: ' + name);
  let depth = 0, i = GS.indexOf('{', start);
  for (; i < GS.length; i++) {
    if (GS[i] === '{') depth++;
    else if (GS[i] === '}') { depth--; if (depth === 0) return GS.slice(start, i + 1); }
  }
  throw new Error('unbalanced braces in ' + name);
}
function pick(re) { const m = re.exec(GS); return m ? m[0] : ''; }

// A sheet that remembers what mattered and shrugs at the rest. Every
// formatting call returns the same chainable object, which is what the real
// Range does, so the code under test can chain as freely as it likes.
function makeSheet(name, gid, log) {
  const cells = {};
  const range = (a1) => {
    // Every method returns the PROXY, not the bare object — chaining off a
    // recorded call (setValues(...).setWrap(...)) has to keep the catch-all,
    // which is exactly how the real Range behaves. Returning the raw object
    // instead broke the first run of this file on .setWrap.
    const api = {
      setValue(v){ cells[a1] = v; log.push({ sheet: name, a1, value: v }); return proxy; },
      setValues(v){ log.push({ sheet: name, a1, values: v }); return proxy; },
      setRichTextValue(rt){ cells[a1] = rt; log.push({ sheet: name, a1, rich: rt }); return proxy; },
      getValue(){ return cells[a1]; },
      clearContent(){ delete cells[a1]; return proxy; },
      insertCheckboxes(){ log.push({ sheet: name, a1, checkbox: true }); return proxy; }
    };
    // Everything else is styling: swallow it and stay chainable.
    const proxy = new Proxy(api, { get(t, k){
      if (k in t) return t[k];
      return function(){ return proxy; };
    }});
    return proxy;
  };
  const sheet = {
    getName: () => name,
    getSheetId: () => gid,
    getRange: (a, b, c, d) => range(typeof a === 'string' ? a : (a + ':' + b + ':' + c + ':' + d)),
    protect: () => ({ setWarningOnly: () => {} }),
    _cells: cells
  };
  return new Proxy(sheet, { get(t, k){
    if (k in t) return t[k];
    return function(){ return sheet; };
  }});
}

function build() {
  const log = [], sheets = {};
  let nextGid = 100;
  const ss = {
    getSheetByName: n => sheets[n] || null,
    insertSheet: (n) => { sheets[n] = makeSheet(n, nextGid++, log); return sheets[n]; },
    deleteSheet: (sh) => { delete sheets[sh.getName()]; },
    getSheets: () => Object.values(sheets),
    getId: () => 'SSID',
    getName: () => 'Acopio',
    setActiveSheet: () => {},
    moveActiveSheet: () => {},
    setActiveRange: () => {},
    setActiveSelection: () => {}
  };

  // RichTextValue, recorded rather than rendered: the links are the whole
  // point of this change, so they are what the fake keeps.
  function newRichTextValue() {
    const state = { text: '', links: [] };
    const b = {
      setText(t){ state.text = t; return b; },
      setTextStyle(){ return b; },
      setLinkUrl(a, z, url){ state.links.push({ from: a, to: z, url: url }); return b; },
      build(){ return state; }
    };
    return b;
  }

  const sandbox = {
    console, Date, Math, Number, String, Array, Object, JSON, isFinite,
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss,
      newRichTextValue,
      newTextStyle: () => {
        const t = { setFontSize:()=>t, setBold:()=>t, setForegroundColor:()=>t,
                    setItalic:()=>t, setUnderline:()=>t, build:()=>({}) };
        return t;
      }
    },
    Utilities: { formatDate: () => '2026-08-25' },
    Session: { getScriptTimeZone: () => 'UTC' },
    _log: log, _sheets: sheets, _ss: ss
  };
  vm.createContext(sandbox);
  vm.runInContext([
    pick(/var START_HERE_SHEET = .*?;/),
    pick(/var TERMS_SHEET\s*=.*?;/),
    pick(/var PRIVACY_SHEET\s*=.*?;/),
    pick(/var TERMS_CHECKBOX_CELL = .*?;/),
    pick(/var TERMS_LABEL_CELL\s*=.*?;/),
    pick(/var TERMS_STAMP_CELL\s*=.*?;/),
    pick(/var TERMS_NEXT_CELL\s*=.*?;/),
    pick(/var TERMS_PROMPT = .*?;/),
    // SH_NAVY's line declares SH_ACCENT, SH_MUTED and SH_PAPER alongside it.
    pick(/var SH_NAVY = .*?;/),
    pick(/var PRODUCT_NAME\s*=.*?;/),
    GS.slice(GS.indexOf('var LEGAL_SHEET_TEXT'), GS.indexOf('// ─── END GENERATED LEGAL TEXT')),
    extractFn('createLegalSheets_'),
    extractFn('sheetLink_'),
    extractFn('createStartHereSheet_')
  ].join('\n'), sandbox);
  return sandbox;
}

console.log('\n═══ the legal tabs are actually built ═══\n');

{
  const S = build();
  S.createLegalSheets_(S._ss);

  const names = Object.keys(S._sheets);
  console.log('  sheets created: ' + names.join(', '));
  check('both documents get their own tab',
    names.indexOf(S.TERMS_SHEET) !== -1 && names.indexOf(S.PRIVACY_SHEET) !== -1);

  const written = S._log.filter(e => e.values && e.sheet === S.TERMS_SHEET);
  const rows = written.length ? written[0].values.length : 0;
  console.log('  Terms written as ' + rows + ' rows');
  check('the Terms text is written, not left as an empty tab', rows > 30);

  const flat = written.length ? written[0].values.map(r => r[0]).join('\n') : '';
  check('...starting with the title', /Terms of Service — Acopio/.test(flat));
  // Read from the SOURCE, never typed here. The first version hard-coded
  // "6 August 2026" and the heading "Payment and cancellation", and both broke
  // the day the Terms were updated — a test failing because the document it
  // guards was edited teaches everyone to ignore it. What matters is that the
  // sheet copy matches legal/*.md, not that it equals a string I typed once.
  const MD = fs.readFileSync(path.join(__dirname, '..', 'legal', 'TERMS-OF-SERVICE.md'), 'utf8');
  const mdDate = (/\*\*Last updated:\*\*\s*(.+)/.exec(MD) || [])[1].trim();
  const mdHeads = (MD.match(/^##\s+(.+)$/gm) || []).map(h => h.replace(/^##\s+/, '').trim());

  check('...and carrying the "last updated" date from the source (' + mdDate + ')',
    flat.indexOf('Last updated: ' + mdDate) !== -1);
  check('...and EVERY section heading the .md has (' + mdHeads.length + ' of them)',
    mdHeads.length > 5 && mdHeads.every(h => flat.indexOf(h) !== -1));

  const pw = S._log.filter(e => e.values && e.sheet === S.PRIVACY_SHEET);
  const pflat = pw.length ? pw[0].values.map(r => r[0]).join('\n') : '';
  // Read from the source, exactly like the Terms date above. Hard-coded, this
  // assertion failed the day the policy was legitimately updated: it was
  // pinning a calendar date instead of the thing it cares about, which is that
  // the sheet copy carries the SAME date as the .md it was generated from.
  const PMD = fs.readFileSync(path.join(__dirname, '..', 'legal', 'PRIVACY-POLICY.md'), 'utf8');
  const pDate = ((/\*\*Last updated:\*\*\s*(.+)/.exec(PMD) || [])[1] || '').trim();
  check('the Privacy Policy tab is built too, with its own text and its own date (' + pDate + ')',
    /Privacy Policy — Acopio/.test(pflat) && !!pDate && pflat.indexOf('Last updated: ' + pDate) !== -1);

  check('each tab offers the way back',
    S._log.some(e => e.sheet === S.TERMS_SHEET && /Back to/.test(String(e.value || ''))));
}

console.log('\n═══ rebuilt from scratch, never patched ═══\n');

{
  // A half-updated policy is worse than an old one: it reads as current.
  const S = build();
  S.createLegalSheets_(S._ss);
  const firstGid = S._sheets[S.TERMS_SHEET].getSheetId();
  S.createLegalSheets_(S._ss);
  check('running it twice replaces the tab rather than stacking a second one',
    Object.keys(S._sheets).filter(n => n === S.TERMS_SHEET).length === 1);
  check('...and it is genuinely a new sheet, so stale rows cannot survive underneath',
    S._sheets[S.TERMS_SHEET].getSheetId() !== firstGid);
}

console.log('\n═══ the consent line links to them ═══\n');

{
  const S = build();
  S.createStartHereSheet_(S._ss);

  check('the START HERE sheet is built', !!S._sheets[S.START_HERE_SHEET]);
  check('...and so are the two legal tabs, because the label needs them to exist first',
    !!S._sheets[S.TERMS_SHEET] && !!S._sheets[S.PRIVACY_SHEET]);

  const rich = S._log.filter(e => e.rich && e.a1 === S.TERMS_LABEL_CELL).pop();
  check('the consent label is rich text, so the sentence stays one sentence', !!rich);

  if (rich) {
    const v = rich.rich;
    console.log('  label: ' + v.text);
    v.links.forEach(l => console.log('    link [' + v.text.slice(l.from, l.to) + '] → ' + l.url));

    check('it still reads as a consent sentence',
      /I accept the Terms of Service and Privacy Policy/.test(v.text));
    check('exactly two links — the two documents, nothing else', v.links.length === 2);

    const termsLink   = v.links.find(l => v.text.slice(l.from, l.to) === 'Terms of Service');
    const privacyLink = v.links.find(l => v.text.slice(l.from, l.to) === 'Privacy Policy');
    check('"Terms of Service" is the linked text — not the whole sentence, not a bare URL',
      !!termsLink);
    check('"Privacy Policy" likewise', !!privacyLink);

    // The gid is what makes the link land on the right tab. Pointing at the
    // wrong one is the silent failure here: it still looks like a working link.
    const tGid = S._sheets[S.TERMS_SHEET].getSheetId();
    const pGid = S._sheets[S.PRIVACY_SHEET].getSheetId();
    check('the Terms link points at the Terms tab (#gid=' + tGid + ')',
      termsLink && termsLink.url === '#gid=' + tGid);
    check('the Privacy link points at the Privacy tab (#gid=' + pGid + ')',
      privacyLink && privacyLink.url === '#gid=' + pGid);
    check('...and the two do not point at the same tab', tGid !== pGid);
  }

  check('the checkbox is still there, in the cell onEdit watches (' + S.TERMS_CHECKBOX_CELL + ')',
    S._log.some(e => e.checkbox && e.a1 === S.TERMS_CHECKBOX_CELL));
  check('the prompt under it still says what to do',
    S._log.some(e => e.a1 === S.TERMS_NEXT_CELL && e.value === S.TERMS_PROMPT));
}

console.log('\nstart here: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
