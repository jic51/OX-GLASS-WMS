// SCALE MEASUREMENT — how big can one installation get before it hurts?
//
// This is a tape measure, not a pass/fail test (same spirit as
// audit-responsive.js). Nobody had ever measured it, and the public advice
// about spreadsheets as inventory systems says they fall over somewhere
// between 500 and 5,000 SKUs — so "how far does Acopio actually go" was an
// open question with a real customer on the other side of it.
//
// It measures the ONE thing that grows without bound and is on the critical
// path of every single app load: calculateStock() replaying the whole
// movement archive. Lifted verbatim from Code_v3_fixed.gs, so it cannot
// drift from what ships.
//
// What it does NOT measure, and must not be read as covering:
//   - Google's own Sheets read/write time (the real network cost)
//   - Apps Script's 6-minute execution ceiling
//   - concurrent editing by several people at once
//   - the derived-sheet fast path (buildStockFromDerivedSheets_), which is
//     what a healthy install actually uses — this is the FALLBACK path, i.e.
//     the worst case
// Those need a real installation with real data. This bounds the part that
// can be bounded from here.
//
// Usage:  node tools/test-scale.js [movementCount ...]

const fs = require('fs'), path = require('path'), vm = require('vm');
const GS = fs.readFileSync(path.join(__dirname, '..', 'Code_v3_fixed.gs'), 'utf8');

function extractFn(name) {
  const a = GS.indexOf('function ' + name + '(');
  if (a === -1) throw new Error('function not found: ' + name);
  let depth = 0, i = GS.indexOf('{', a);
  for (; i < GS.length; i++) {
    if (GS[i] === '{') depth++;
    else if (GS[i] === '}') { depth--; if (depth === 0) return GS.slice(a, i + 1); }
  }
  throw new Error('unbalanced braces in ' + name);
}

const ctx = vm.createContext({ console: console, Logger: { log: function () {} } });
vm.runInContext(
  extractFn('normalizeString') + '\n' +
  extractFn('getMaterialId') + '\n' +
  extractFn('findFirstWarehouseLoc') + '\n' +
  extractFn('applyReservationsAndFinalize_') + '\n' +
  extractFn('calculateStock'),
  ctx
);

// A warehouse shaped like a real one: a few categories, many materials,
// many racks, and a movement mix weighted the way a working week looks —
// mostly exits and entries, some transfers, a little waste and returns.
function makeMovements(n, skus, racks) {
  const cats = ['WINDOW', 'GLASS', 'SCREEN', 'MIRROR', 'HARDWARE'];
  const out = [];
  // Seed every SKU into the warehouse first, or exits would all be against
  // empty stock and the clamping branches would dominate unrealistically.
  for (let s = 0; s < skus; s++) {
    out.push({
      moveType: 'ENTRY', category: cats[s % cats.length], name: 'MAT-' + s,
      qty: 500, unit: 'pcs', destLoc: 'R' + (s % racks), sourceLoc: '',
      project: 'GENERIC', rowIdx: out.length + 2
    });
  }
  const mix = ['EXIT', 'EXIT', 'EXIT', 'ENTRY', 'ENTRY', 'TRANSFER', 'WASTE', 'RETURN'];
  let i = 0;
  while (out.length < n) {
    const s = i % skus, type = mix[i % mix.length], rack = 'R' + (s % racks);
    const m = {
      moveType: type, category: cats[s % cats.length], name: 'MAT-' + s,
      qty: 1 + (i % 5), unit: 'pcs', project: 'JOB-' + (i % 40),
      sourceLoc: '', destLoc: '', rowIdx: out.length + 2
    };
    if (type === 'ENTRY')         { m.destLoc = rack; }
    else if (type === 'EXIT')     { m.sourceLoc = rack; m.destLoc = 'SITE'; }
    else if (type === 'TRANSFER') { m.sourceLoc = rack; m.destLoc = 'R' + ((s + 1) % racks); }
    else if (type === 'WASTE')    { m.sourceLoc = rack; }
    else if (type === 'RETURN')   { m.sourceLoc = 'SITE'; m.destLoc = rack; }
    out.push(m);
    i++;
  }
  return out;
}

const sizes = process.argv.slice(2).length
  ? process.argv.slice(2).map(Number)
  : [1000, 5000, 10000, 25000, 50000, 100000];

console.log('\ncalculateStock() — the full-replay path, worst case\n');
console.log('  movements     SKUs    racks        ms     ms/1k    peak MB');
console.log('  ' + '-'.repeat(58));

const rows = [];
for (const n of sizes) {
  // SKU count grows with the archive but far more slowly, which is how real
  // warehouses behave: you add movements every day, materials rarely.
  const skus = Math.max(50, Math.min(2000, Math.round(n / 25)));
  const racks = Math.max(10, Math.min(400, Math.round(skus / 5)));
  const movs = makeMovements(n, skus, racks);

  if (global.gc) global.gc();
  const before = process.memoryUsage().heapUsed;
  const t0 = process.hrtime.bigint();
  const stock = vm.runInContext('calculateStock', ctx)(movs, []);
  const t1 = process.hrtime.bigint();
  const peak = (process.memoryUsage().heapUsed - before) / 1048576;

  const ms = Number(t1 - t0) / 1e6;
  rows.push({ n, skus, racks, ms, peak });
  console.log(
    '  ' + String(n).padStart(9) +
    String(skus).padStart(9) +
    String(racks).padStart(9) +
    ms.toFixed(0).padStart(10) +
    (ms / (n / 1000)).toFixed(2).padStart(10) +
    peak.toFixed(1).padStart(11) +
    '   (' + Object.keys(stock).length + ' materials)'
  );
}

console.log('\nHow to read this');
console.log('  This is PURE COMPUTE on a fast machine, with none of the real');
console.log('  costs included: reading the rows out of Sheets, the network, or');
console.log('  Apps Script\'s slower runtime. Treat these as a FLOOR — the real');
console.log('  thing is several times worse, and the 6-minute execution ceiling');
console.log('  is the wall that matters.');
console.log('  Growth should look close to linear (steady ms/1k). If ms/1k');
console.log('  climbs with size, something in the replay is super-linear and');
console.log('  that is the thing to fix before it meets a real customer.\n');

const first = rows[0], last = rows[rows.length - 1];
const drift = (last.ms / (last.n / 1000)) / (first.ms / (first.n / 1000));
console.log('  ms/1k drift from ' + first.n + ' to ' + last.n + ' movements: ' +
  drift.toFixed(2) + '× ' + (drift < 2 ? '(roughly linear — good)' : '(SUPER-LINEAR — investigate)'));
console.log('');
