// LOCAL DATES — the bug that filed every evening's work on the wrong day.
//
// Finding 1 of the v11.26 audit. `_isoDate` was:
//
//     function _isoDate(dt) { return dt.toISOString().substring(0, 10); }
//
// toISOString converts to UTC first. Utah runs at UTC−6 in summer and UTC−7 in
// winter, so from about 18:00 local the UTC clock is already on tomorrow's
// date — and every calendar day this function produced was one day ahead for
// the whole evening shift. Nothing threw. Nothing looked wrong. The receipt
// just went into the sheet under the next day.
//
// The worst of the fourteen call sites was not even this function: it was
// `document.getElementById('mDateRec').value = new Date().toISOString()...`,
// computed inline, which is the date EVERY movement gets unless the person
// notices and changes it.
//
// This file runs the real _isoDate out of Index_v3_fixed.html against a clock
// pinned to 7pm Mountain, in both halves of the year — the two cases where the
// old code and the new code disagree, which is exactly where a test earns its
// keep.
//
// Usage:  node tools/test-local-dates.js

// PIN THE CLOCK BEFORE ANYTHING ELSE. Node reads TZ lazily and re-reads it when
// process.env.TZ changes, so setting it here — above the first Date in the file
// — puts this whole run in Jose's timezone no matter where the machine is. That
// is the point: a test that only passed in the timezone it was written in is
// how a UTC bug goes unnoticed for months. Denver is Utah's zone, and it
// carries both offsets, −6 in summer and −7 in winter.
process.env.TZ = 'America/Denver';

const fs = require('fs'), path = require('path'), vm = require('vm');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}
function extractFn(src, name) {
  const start = src.indexOf('\nfunction ' + name + '(');
  if (start === -1) throw new Error('function not found: ' + name);
  let i = src.indexOf('{', start), depth = 0, j = i;
  for (; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (!depth) { j++; break; } }
  }
  return src.slice(start + 1, j);
}

// ── The real functions, lifted out of the shipping file ─────────────────────
const ctx = vm.createContext({ console: console });
['_isoDate', '_todayIso', '_mdyToIso'].forEach(n => vm.runInContext(extractFn(HTML, n), ctx));

// REAL Date objects, at a known instant. With TZ pinned above, their local
// getters answer as a browser in Utah would — which is what _isoDate reads —
// while toISOString still answers in UTC. A hand-built fake object would not
// have caught the fix's own edge case (`dt instanceof Date`), so this uses the
// real thing.
function utahClock(utcY, utcMo, utcD, utcHour) {
  return new Date(Date.UTC(utcY, utcMo - 1, utcD, utcHour));
}

console.log('\n═══ 7pm in Utah, the hour the bug bit ═══\n');

// July: Mountain Daylight Time, UTC−6. 19:00 local is 01:00 UTC tomorrow.
{
  const d = utahClock(2026, 7, 15, 1);
  check('the fixture really is 7pm local on the 14th (got ' + d.getHours() + ':00 on the ' + d.getDate() + ')',
    d.getHours() === 19 && d.getDate() === 14);
  check('the UTC clock really has rolled over — otherwise this test proves nothing ' +
        '(UTC says ' + d.toISOString().substring(0, 10) + ')',
    d.toISOString().substring(0, 10) === '2026-07-15');
  const got = vm.runInContext('_isoDate', ctx)(d);
  check('_isoDate says 2026-07-14, the day the person is standing in (got ' + got + ')',
    got === '2026-07-14');
  check('...which is NOT what the old code produced — this is the whole finding',
    got !== d.toISOString().substring(0, 10));
}

// January: Mountain Standard Time, UTC−7. 19:00 local is 02:00 UTC tomorrow.
{
  const d = utahClock(2026, 2, 1, 2);
  check('the fixture really is 7pm local on 31 January (got ' + d.getHours() + ':00 on the ' + d.getDate() + ')',
    d.getHours() === 19 && d.getDate() === 31);
  const got = vm.runInContext('_isoDate', ctx)(d);
  check('winter too — an hour further from UTC, same answer (got ' + got + ')',
    got === '2026-01-31');
  check('...and it is a month boundary, so the old code moved the receipt into ' +
        'February and out of January\'s totals',
    d.toISOString().substring(0, 10) === '2026-02-01');
}

console.log('\n═══ the hours the bug did NOT bite — no regression ═══\n');
{
  const morning = utahClock(2026, 7, 14, 15);   // 09:00 MDT
  check('9am is unaffected, as it always was',
    vm.runInContext('_isoDate', ctx)(morning) === '2026-07-14');
  const real = new Date(2026, 2, 3);   // a real local Date, whatever this box runs at
  check('an ordinary local Date still round-trips',
    vm.runInContext('_isoDate', ctx)(real) === '2026-03-03');
}

console.log('\n═══ shape and edges ═══\n');
{
  const iso = vm.runInContext('_isoDate', ctx);
  check('single-digit month and day are zero-padded — the sheet matches on the ' +
        'yyyy-mm-dd shape, and "2026-3-3" is a different string',
    iso(new Date(2026, 2, 3)) === '2026-03-03');
  check('leap day survives', iso(new Date(2028, 1, 29)) === '2028-02-29');
  check('New Year\'s Eve stays in the old year', iso(new Date(2026, 11, 31)) === '2026-12-31');
  check('an unparseable date returns empty rather than "NaN-NaN-NaN"', iso('not a date') === '');
  check('a date STRING is accepted, not just a Date object', iso('2026-05-09T14:00:00') === '2026-05-09');
}

console.log('\n═══ MM/dd/yyyy → yyyy-MM-dd ═══\n');
// Found while fixing the above: the documents list fell back to the first ten
// characters of `timestamp`, which the backend formats as MM/dd/yyyy — so one
// column held two shapes and sorted them as text.
{
  const mdy = vm.runInContext('_mdyToIso', ctx);
  check('08/28/2026 14:31 becomes 2026-08-28', mdy('08/28/2026 14:31') === '2026-08-28');
  check('a value already in ISO shape is refused rather than mangled, so the ' +
        'caller\'s || fallback still reaches the right branch',
    mdy('2026-08-28') === '');
  check('empty in, empty out', mdy('') === '' && mdy(null) === '');
}

// ── The source itself ───────────────────────────────────────────────────────
console.log('\n═══ no calendar day is derived from UTC anywhere ═══\n');
{
  const code = HTML.split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n');
  const offenders = [];
  const re = /toISOString\(\)\s*\.\s*(?:substring|slice|split)\(/g;
  let m;
  while ((m = re.exec(code))) {
    offenders.push('line ' + (code.slice(0, m.index).split('\n').length));
  }
  check('nothing slices a calendar day out of toISOString() any more' +
        (offenders.length ? ' — found at ' + offenders.join(', ') : ''),
    offenders.length === 0);

  check('the movement form\'s default date goes through the helper — this was ' +
        'the one that mattered',
    /getElementById\('mDateRec'\)\.value\s*=\s*_todayIso\(\)/.test(code));
  check('both CSV exports name their file with the local day',
    (code.match(/a\.download\s*=[^;]*_todayIso\(\)/g) || []).length === 2);
}

console.log('\n' + '─'.repeat(72));
console.log('TZ is pinned to America/Denver at the top of this file, not read');
console.log('from the machine. Deliberate: a test that only passes in the timezone');
console.log('it was written in is how this bug went unnoticed for months.');
console.log('─'.repeat(72));

console.log('\nlocal dates: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
