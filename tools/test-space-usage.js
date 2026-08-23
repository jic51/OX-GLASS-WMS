// STORAGE INDICATOR — and the two ways its estimate could lie.
//
// Google caps a spreadsheet at 10 million cells across all tabs. Acopio spends
// 22 per movement, so the practical ceiling is roughly 250k–300k movements and
// things get slow around 100k rows. Most customers never come close; the one
// who does is the busiest and the best paying. Showing the number early turns
// an invisible ceiling into a visible one with years of warning.
//
// The BAR is not the risky part — it reports a fact. The ESTIMATE is, and a
// wrong estimate is worse than none: it either panics a customer with fifteen
// years of room or reassures one with nine months. Two specific ways it could
// lie, and this file exists to hold both shut:
//
//   1. THE FIRST MONTHS LIE. Loading the opening inventory puts hundreds of
//      movements into a few days. Measured over all of history, that pace says
//      a quiet workshop fills up in months.
//   2. EXTRAPOLATING GROWTH COMPOUNDS. A 12% rise in a quarter, projected five
//      years out, produces a number nobody should act on.
//
// Runs the REAL spaceEstimate_ lifted out of Code_v3_fixed.gs against fake
// sheets, so the thing under test is the shipping code.
//
// Usage:  node tools/test-space-usage.js

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

const sandbox = { console, Date };
vm.createContext(sandbox);
vm.runInContext([
  /var AC = \{[\s\S]*?\};/.exec(GS)[0],
  /var AC_WIDTH = \d+;/.exec(GS)[0],
  /var SHEET_CELL_LIMIT = \d+;/.exec(GS)[0],
  extractFn('spaceEstimate_')
].join('\n'), sandbox);
const { spaceEstimate_, AC, AC_WIDTH, SHEET_CELL_LIMIT } = sandbox;

const DAY = 86400000;

// A fake sheet holding nothing but a timestamp column — all spaceEstimate_
// reads. Rows are oldest-first, as the archive is.
function sheetOfDaysAgo(daysAgoList) {
  const rows = daysAgoList.map(d => new Date(Date.now() - d * DAY));
  return {
    getLastRow: () => rows.length + 1,
    getRange(startRow, startCol, numRows) {
      if (startCol !== AC.TIMESTAMP + 1) throw new Error('read the wrong column: ' + startCol);
      if (numRows === undefined) return { getValue: () => rows[startRow - 2] };
      return { getValues: () => rows.slice(startRow - 2, startRow - 2 + numRows).map(d => [d]) };
    }
  };
}
// n movements per day, evenly, over the last `days` days.
function steady(perDay, days, startDaysAgo) {
  const out = [];
  for (let d = (startDaysAgo === undefined ? days : startDaysAgo); d >= 0; d--)
    for (let k = 0; k < perDay; k++) out.push(d);
  return out;
}

console.log('\n═══ guard 1: the opening inventory must not set the pace ═══\n');

{
  // The shape that breaks a naive average: 400 movements in the first three
  // days (someone typing in the whole warehouse), then 2 a day for a year.
  const days = [];
  for (let k = 0; k < 400; k++) days.push(365 - (k % 3));
  steady(2, 364).forEach(d => days.push(d));
  days.sort((a, b) => b - a);

  const est = spaceEstimate_(sheetOfDaysAgo(days), null, 500000);
  check('the initial load is outside the 90-day window, so it does not set the pace: ' +
        est.perDay.toFixed(2) + '/day, not the ~3.3 a naive all-history average would give',
    est.perDay > 1.5 && est.perDay < 3);
  check('...and the years left come out in decades, not months, for a shop doing two movements a day: ' +
        Math.round(est.years) + ' years',
    est.years > 100);
}

{
  const est = spaceEstimate_(sheetOfDaysAgo(steady(5, 40)), null, 100000);
  check('under 60 days of use it refuses to estimate at all rather than guess from the load-in',
    est && est.tooEarly === true && est.daysOfUse === 40);
}

{
  // Exactly the boundary: 60 days in, and busy.
  const est = spaceEstimate_(sheetOfDaysAgo(steady(10, 61)), null, 100000);
  check('at 61 days it starts estimating, and divides by the days ACTUALLY available (61) not a flat 90 — otherwise a young install looks a third as busy as it is: ' +
        est.perDay.toFixed(1) + '/day for a 10/day pace',
    !est.tooEarly && est.perDay > 9 && est.perDay < 11);
}

console.log('\n═══ guard 2: growth brackets a second number, it does not compound ═══\n');

{
  // 10/day for the older 90 days, 20/day for the recent 90: the pace doubled.
  // 200 days of history, not 179 — the second scenario deliberately waits for
  // TWO complete 90-day windows before it will compare them, and an earlier
  // draft of this test quietly proved the opposite by writing
  // `est.yearsIfGrowing < est.years` against a null, which JS reads as 0.
  const days = steady(10, 200, 200).filter(d => d > 90).concat(steady(20, 90));
  const est = spaceEstimate_(sheetOfDaysAgo(days.sort((a, b) => b - a)), null, 1000000);

  check('the faster scenario appears once there are two full windows to compare',
    est.yearsIfGrowing !== null && est.growthPct > 50);
  check('...and it is FASTER than the base figure, which is the whole point of showing it',
    est.yearsIfGrowing !== null && est.yearsIfGrowing < est.years);
  check('...but stays within one doubling of it — a bracket, not a compounded curve running away to zero',
    est.yearsIfGrowing > est.years / 3);
}

{
  const est = spaceEstimate_(sheetOfDaysAgo(steady(10, 200)), null, 1000000);
  check('a steady pace offers NO second scenario — inventing one from noise would be the lie this guard exists to stop',
    est.yearsIfGrowing === null && est.growthPct === null);
}

{
  // 10/day then 11/day. A real warehouse wobbles this much between quarters.
  const days = steady(10, 200, 200).filter(d => d >= 90).concat(steady(11, 89));
  const est = spaceEstimate_(sheetOfDaysAgo(days.sort((a, b) => b - a)), null, 1000000);
  check('a pace up ~10% is treated as weather, not a trend: no second scenario, because "~7 years, or ~7 years if it keeps growing" says nothing while sounding like a warning',
    est.yearsIfGrowing === null);
}

{
  // Busy, then quiet. Growth is negative.
  const days = steady(30, 179, 179).filter(d => d > 90).concat(steady(5, 90));
  const est = spaceEstimate_(sheetOfDaysAgo(days.sort((a, b) => b - a)), null, 1000000);
  check('a SLOWING pace offers no second scenario either — the bracket is only ever the pessimistic side',
    est.yearsIfGrowing === null);
}

{
  const est = spaceEstimate_(sheetOfDaysAgo(steady(4, 120).map(d => d + 100)), null, 1000000);
  check('an installation that stopped being used says so instead of dividing by zero',
    est.idle === true);
}

console.log('\n═══ the arithmetic itself ═══\n');

{
  // 100 movements/day, half the file already spent. 5,000,000 cells left,
  // 22 cells a movement, 100 a day → 5e6 / (100*22*365) ≈ 6.2 years.
  const est = spaceEstimate_(sheetOfDaysAgo(steady(100, 120)), null, SHEET_CELL_LIMIT / 2);
  check('years left = cells remaining ÷ (pace × 22 columns × 365), not a guess: ' +
        est.years.toFixed(1) + ' years for 100/day with half the file spent',
    est.years > 5.5 && est.years < 7);
}

{
  const est = spaceEstimate_(sheetOfDaysAgo(steady(100, 120)), null, SHEET_CELL_LIMIT + 5000);
  check('a file already past the limit reports 0 years left rather than a negative number',
    est.years === 0);
}

{
  check('no movements at all returns null, and the screen says so rather than showing an empty estimate',
    spaceEstimate_(sheetOfDaysAgo([]), null, 1000) === null);
}

console.log('\n═══ what the caller reports ═══\n');

{
  const body = GS.slice(GS.indexOf('function getSpaceUsage('), GS.indexOf('\nfunction spaceEstimate_'));
  check('cells are counted as getMaxRows × getMaxColumns — Google caps GRID cells, so counting only filled ones would promise room the customer does not have',
    /getMaxRows\(\) \* sheets\[i\]\.getMaxColumns\(\)/.test(body));
  check('...across EVERY tab, because the 10M limit is per FILE and not per sheet',
    /ss\.getSheets\(\)/.test(body));
  check('...and the movement count includes ARCHIVE_HISTORY, which spends cells exactly like the live archive does',
    /ARCHIVE_HISTORY/.test(body) && /liveRows \+ histRows/.test(body));
  check('it is ADMIN-only, like everything else on the System tab',
    /requireAuth_\('ADMIN'\)/.test(body));
}

{
  const HTML = fs.readFileSync(path.join(__dirname, '..', 'Index_v3_fixed.html'), 'utf8');
  const draw = HTML.slice(HTML.indexOf('function _drawSpaceBox('), HTML.indexOf('\nfunction ', HTML.indexOf('function _drawSpaceBox(') + 10));
  check('the bar colours by PERCENTAGE — a projection should not be what turns it red',
    /pct >= 85 \? 'var\(--red\)'/.test(draw) && /pct >= 60 \? 'var\(--yellow\)'/.test(draw));
  check('years are rounded to whole years, so the screen never claims precision it does not have',
    /_fmtYears/.test(draw) && /Math\.round\(y\)/.test(HTML));
  check('the too-early case explains WHY there is no estimate instead of leaving a blank',
    /opening inventory/.test(draw));
}

console.log('\nspace-usage: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
