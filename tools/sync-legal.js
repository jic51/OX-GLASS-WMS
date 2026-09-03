// Copies the legal texts from legal/*.md into Code_v3_fixed.gs, so the two
// sheets the customer reads BEFORE accepting are the same documents as the
// ones in the app and in the repo.
//
// Why a generator rather than a third hand-maintained copy:
//
// There were two copies already — legal/*.md (the source of truth) and
// LEGAL_DOCS inside the app — and tools/test-legal-sync.js exists because they
// once drifted: v9.77 started emailing us the company name and admin address
// while both privacy policies still said we receive nothing at all. A promise
// broken in writing is worse than a missing feature, and nothing in the
// toolchain could see it, because a stale sentence is valid Markdown and valid
// HTML.
//
// Adding a THIRD copy by hand would have made that failure more likely, not
// less. This copy is mechanical: one command regenerates it, and
// test-legal-sync.js fails the build if anyone edits it in place.
//
// The customer reads this copy at the one moment that matters legally — the
// consent checkbox on the START HERE sheet, before the web app exists and with
// nowhere to link out to.
//
// Usage:
//   node tools/sync-legal.js            regenerate the block in Code_v3_fixed.gs
//   node tools/sync-legal.js --check    fail if the block is out of date

const fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..');
const GS   = path.join(ROOT, 'Code_v3_fixed.gs');
// La TERCERA copia. Este generador sólo escribía Code.gs, y --check sólo
// miraba Code.gs: el contrato que el cliente lee DENTRO de la app se mantenía
// a mano, y lo único que notaba la deriva era tools/test-legal-sync.js.
//
// Se descubrió al cambiar la sección de reactivación (01/09): --check decía
// "matches" con la copia del HTML todavía prometiendo "no reconnection fee".
// Un generador que deja una de tres copias a mano es un generador que garantiza
// que esa copia se quede atrás; ahora escribe las dos.
const HTMLF = path.join(ROOT, 'Index_v3_fixed.html');
const HBEGIN = '/* ─── BEGIN GENERATED LEGAL HTML — node tools/sync-legal.js ─── */';
const HEND   = '/* ─── END GENERATED LEGAL HTML ─── */';
const BEGIN = '// ─── BEGIN GENERATED LEGAL TEXT — node tools/sync-legal.js ───';
const END   = '// ─── END GENERATED LEGAL TEXT ───';

// Markdown → the plain lines a spreadsheet cell can actually show.
//
// A sheet has no italics-inside-a-sentence and no nested lists, so anything
// that cannot survive the trip is flattened rather than left as stray
// punctuation the customer has to read past. Headings are kept as a marker so
// the sheet can style them; everything else becomes text.
function toLines(md) {
  const out = [];
  // HTML comments in the .md are notes to ourselves — the "SOURCE OF TRUTH"
  // banner at the top of each file, telling US where the mirror copies live.
  // The customer must never see them; they leaked into the first run of this.
  md = md.replace(/<!--[\s\S]*?-->/g, '');
  md.split('\n').forEach(raw => {
    let s = raw.replace(/\r$/, '');

    // Horizontal rules carry no meaning once the styling is gone.
    if (/^---+$/.test(s.trim())) return;

    // The repo-only banner at the top of each file ("this file is the source
    // of truth…") is addressed to us, not to the customer.
    if (/^>\s/.test(s)) return;

    // Deepest first. Matching `#` before `###` would leave a bare "## " on the
    // front of every sub-heading, which is exactly what the customer's copy of
    // the Terms said the first time section 5 grew sub-headings: the literal
    // hash marks, printed in a legal document.
    let kind = 'p';
    if (/^###\s/.test(s))      { kind = 'sub';    s = s.replace(/^###\s+/, ''); }
    else if (/^##\s/.test(s))  { kind = 'head';   s = s.replace(/^##\s+/, ''); }
    else if (/^#\s/.test(s))   { kind = 'title';  s = s.replace(/^#\s+/, ''); }
    else if (/^\s*[-*]\s/.test(s)) { kind = 'li'; s = s.replace(/^\s*[-*]\s+/, ''); }

    s = s.replace(/\*\*(.+?)\*\*/g, '$1')      // bold
         .replace(/(^|[\s(])\*(.+?)\*/g, '$1$2') // italics
         .replace(/`(.+?)`/g, '$1')             // code
         .replace(/\[(.+?)\]\((.+?)\)/g, '$1 ($2)'); // links keep their target

    if (kind === 'li') s = '•   ' + s;
    out.push({ k: kind, t: s });
  });

  // Rejoin hard-wrapped paragraphs. The .md files wrap at ~80 characters for
  // reviewing diffs, which is a property of the file and not of the sentence —
  // left alone, one paragraph becomes four spreadsheet rows and reads like
  // poetry. The cell wraps text itself, so it wants whole paragraphs.
  const joined = [];
  out.forEach(l => {
    const prev = joined[joined.length - 1];
    const continuation = prev && prev.k === l.k && (l.k === 'p' || l.k === 'li') &&
                         prev.t.trim() !== '' && l.t.trim() !== '' &&
                         !/^•/.test(l.t);          // a new bullet is a new item
    if (continuation) prev.t += ' ' + l.t.trim();
    else joined.push({ k: l.k, t: l.t });
  });

  // Collapse runs of blank lines to one — a sheet row is expensive vertical
  // space in a way a Markdown line is not.
  const tidy = [];
  joined.forEach(l => {
    if (l.t.trim() === '' && tidy.length && tidy[tidy.length - 1].t.trim() === '') return;
    tidy.push(l);
  });
  while (tidy.length && tidy[0].t.trim() === '') tidy.shift();
  while (tidy.length && tidy[tidy.length - 1].t.trim() === '') tidy.pop();
  return tidy;
}

function block() {
  const terms   = toLines(fs.readFileSync(path.join(ROOT, 'legal', 'TERMS-OF-SERVICE.md'), 'utf8'));
  const privacy = toLines(fs.readFileSync(path.join(ROOT, 'legal', 'PRIVACY-POLICY.md'), 'utf8'));
  const enc = lines => lines.map(l => JSON.stringify([l.k, l.t])).join(',\n    ');
  return [
    BEGIN,
    '// Source of truth: legal/TERMS-OF-SERVICE.md and legal/PRIVACY-POLICY.md.',
    '// DO NOT EDIT THIS BLOCK BY HAND — edit the .md and re-run the generator.',
    '// Each line is [kind, text]; kind is "title", "head", "sub", "li" or "p".',
    'var LEGAL_SHEET_TEXT = {',
    '  terms: [',
    '    ' + enc(terms),
    '  ],',
    '  privacy: [',
    '    ' + enc(privacy),
    '  ]',
    '};',
    END
  ].join('\n');
}

// Markdown → el HTML que la ventana de la app muestra. Distinto destino que
// toLines(): aquí sí hay negritas, enlaces y listas de verdad, así que el texto
// no se aplana — se convierte.
function esc(t){
  return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function inline(t){
  return esc(t)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
}
function toHtml(md){
  // Igual que en toLines: los comentarios del .md son notas para nosotros y
  // filtraron una vez. Se quitan antes de convertir, no después — después ya
  // están escapados y dejan de parecer comentarios.
  md = md.replace(/<!--[\s\S]*?-->/g, '');
  const out = [];
  let inList = false, buf = [], liBuf = null;

  // LAS LÍNEAS ENVUELTAS SE UNEN. Un párrafo del .md ocupa varias líneas de 80
  // columnas, y tratarlas como párrafos separados parte frases por la mitad: la
  // primera versión de esto dejó "We never see, hold or store your card" en un
  // <p> y "number." en el siguiente, así que la frase que un cliente busca
  // literalmente dejó de existir en su copia. Lo mismo con los puntos de lista
  // envueltos, que salían cortados a media oración.
  const flushP = () => {
    if (!buf.length) return;
    out.push('<p>' + inline(buf.join(' ')) + '</p>');
    buf = [];
  };
  const flushLi = () => {
    if (liBuf === null) return;
    out.push('<li>' + inline(liBuf.join(' ')) + '</li>');
    liBuf = null;
  };
  const closeList = () => { flushLi(); if (inList) { out.push('</ul>'); inList = false; } };

  md.split('\n').forEach(raw => {
    const s2 = raw.replace(/\r$/, '');
    const t = s2.trim();

    if (!t) { flushP(); closeList(); return; }
    // El banner de "source of truth" va dirigido a nosotros.
    if (/^>\s/.test(t)) return;
    if (/^---+$/.test(t)) { flushP(); closeList(); out.push('<hr>'); return; }

    const li = /^[-*]\s+(.*)$/.exec(t);
    if (li) {
      flushP(); flushLi();
      if (!inList) { out.push('<ul>'); inList = true; }
      liBuf = [li[1]];
      return;
    }

    // Lo más profundo primero, por la misma razón que en toLines: buscar `#`
    // antes de `###` deja marcas de almohadilla dentro de un documento legal.
    const h = /^(#{1,6})\s+(.*)$/.exec(t);
    if (h) {
      flushP(); closeList();
      // El título del documento (#) no se repite: la ventana ya lo pone.
      if (h[1].length === 1) return;
      const tag = h[1].length === 2 ? 'h3' : 'h4';
      out.push('<' + tag + '>' + inline(h[2]) + '</' + tag + '>');
      return;
    }

    // Continuación: de un punto de lista si hay uno abierto, del párrafo si no.
    if (liBuf !== null && /^\s/.test(s2)) { liBuf.push(t); return; }
    if (liBuf !== null) { flushLi(); }
    buf.push(t);
  });
  flushP();
  closeList();
  return out.join('\n');
}

function htmlBlock(){
  const terms   = toHtml(fs.readFileSync(path.join(ROOT, 'legal', 'TERMS-OF-SERVICE.md'), 'utf8'));
  const privacy = toHtml(fs.readFileSync(path.join(ROOT, 'legal', 'PRIVACY-POLICY.md'), 'utf8'));
  return [
    HBEGIN,
    '// Source of truth: legal/TERMS-OF-SERVICE.md and legal/PRIVACY-POLICY.md.',
    '// DO NOT EDIT THIS BLOCK BY HAND — edit the .md and re-run the generator.',
    'var LEGAL_DOCS = {',
    "  privacy: { title: 'Privacy Policy',   html: `" + privacy + '` },',
    "  terms:   { title: 'Terms of Service', html: `" + terms + '` }',
    '};',
    HEND
  ].join('\n');
}

const src = fs.readFileSync(GS, 'utf8');
const i = src.indexOf(BEGIN), j = src.indexOf(END);
if (i === -1 || j === -1) {
  console.error('Markers not found in Code_v3_fixed.gs. Expected:\n  ' + BEGIN + '\n  ' + END);
  process.exit(2);
}
const current = src.slice(i, j + END.length);
const fresh = block();

const hsrc = fs.readFileSync(HTMLF, 'utf8');
const hi = hsrc.indexOf(HBEGIN), hj = hsrc.indexOf(HEND);
if (hi === -1 || hj === -1) {
  console.error('Markers not found in Index_v3_fixed.html. Expected:\n  ' + HBEGIN + '\n  ' + HEND);
  process.exit(2);
}
const hcurrent = hsrc.slice(hi, hj + HEND.length);
const hfresh = htmlBlock();

if (process.argv.includes('--check')) {
  const gsOk = current === fresh, htmlOk = hcurrent === hfresh;
  if (gsOk && htmlOk) {
    const n = (fresh.match(/\n/g) || []).length + (hfresh.match(/\n/g) || []).length;
    console.log('legal text matches legal/*.md in BOTH copies — the sheet tab ' +
                'and the in-app window  (' + n + ' lines)');
    process.exit(0);
  }
  // Se nombra la copia que quedó atrás. "Out of date" sin decir cuál obliga a
  // buscarla, y la que quedaba atrás era justamente la que nadie miraba.
  if (!gsOk)   console.error('OUT OF DATE: the sheet-tab copy in Code_v3_fixed.gs.');
  if (!htmlOk) console.error('OUT OF DATE: the in-app copy in Index_v3_fixed.html.');
  console.error('Run: node tools/sync-legal.js');
  process.exit(1);
}

fs.writeFileSync(GS, src.slice(0, i) + fresh + src.slice(j + END.length));
fs.writeFileSync(HTMLF, hsrc.slice(0, hi) + hfresh + hsrc.slice(hj + HEND.length));
console.log('legal text regenerated from legal/*.md — sheet tab and in-app window');
