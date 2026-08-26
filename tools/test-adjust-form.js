// The Adjust screen's live arithmetic, running in a real browser.
//
// tools/test-adjust.js proves the rules are WRITTEN and that all four stock
// readers agree. This proves the part a person actually touches: type a count,
// and the screen has to say — correctly, on every keystroke — which way the
// correction goes, how big it is, and what it is NOT.
//
// That last one is the reason the delta line has words in it at all. Somebody
// who reaches for Adjust when they mean Waste has exactly one chance to notice
// before the row is written, and this is it.
//
// Usage:  node tools/test-adjust-form.js [path/to/Index_v3_fixed.html]

const fs = require('fs'), path = require('path'), os = require('os');
const SRC    = process.argv[2] || path.join(__dirname, '..', 'Index_v3_fixed.html');
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const html = fs.readFileSync(SRC, 'utf8');

function slice(from, to, label){
  const a = html.indexOf(from);
  if (a === -1) throw new Error('not found: ' + (label || from));
  const b = html.indexOf(to, a);
  if (b === -1) throw new Error('end not found for: ' + (label || from));
  return html.slice(a, b);
}

// The real functions and the real markup — a hand-copied panel would only
// prove I can write one that agrees with a hand-copied reader.
const code = [
  slice('function _normKey(', '\n}\n', '_normKey') + '\n}',
  slice('function _readAdjust(', '// ── Stock Check', '_readAdjust…_syncAdjustCount')
].join('\n');

const panel = slice('<div id="adjustSection"', '</div>\n\n    </div>\n    </div><!-- /moveMatBox -->', 'adjustSection');

// The CSS classes the delta line switches between. Only the names matter to
// the test; the colours are checked by eye, not here.
const styles = `
 .adj-delta{padding:.45rem .65rem}
 .adj-delta.down{background:#FEE2E2} .adj-delta.up{background:#D1FAE5}
 .adj-delta.same{background:#E2E8F0} .adj-delta.idle{background:#F1F5F9}
`;

// One material, in two racks, exactly as stockData holds it. B2B is present
// with a real number; C3C is absent entirely — not zero, absent — which is the
// distinction the "app has no X at that rack" warning turns on.
const harness = `
var currentMoveType = 'ADJUST';
var __badge = 0;
function _syncMoveMatTotal(){ __badge++; }
var stockData = {
  'WINDOW|||BS10': { name:'BS10', category:'WINDOW', availableQty: 52,
                     warehouseLocs: { 'A1A': 40, 'B2B': 12 } }
};
function fill(vals){
  Object.keys(vals).forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.value = vals[id];
  });
  _syncAdjustCount();
  var d = document.getElementById('adjDelta');
  return { says: document.getElementById('adjSays').textContent,
           cls: d.className, txt: d.textContent };
}
`;

const page = `<!doctype html><html><head><meta charset="utf-8"><style>${styles}</style></head><body>
<select id="mType"><option value="WINDOW">WINDOW</option><option value="SCREEN">SCREEN</option></select>
<input id="mName"><textarea id="mComm"></textarea>
${panel}</div>
<script>${harness}\n${code}</script></body></html>`;

(async () => {
  let chromium;
  try { chromium = require('playwright').chromium; }
  catch (e) { console.error('playwright is not installed — run: npm install playwright'); process.exit(2); }

  const file = path.join(os.tmpdir(), 'acopio-adjust-form.html');
  fs.writeFileSync(file, page);

  const browser = await chromium.launch({ executablePath: CHROME });
  const p = await browser.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto('file://' + file);

  const fails = [];
  const check = (name, got, want) => {
    if (JSON.stringify(got) !== JSON.stringify(want))
      fails.push(`${name}: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
    else console.log('  ok   ' + name);
  };
  const like = (name, got, re) => {
    if (!re.test(got)) fails.push(`${name}: ${JSON.stringify(got)} does not match ${re}`);
    else console.log('  ok   ' + name);
  };

  console.log('\n═══ nothing typed yet ═══\n');

  let r = await p.evaluate(() => fill({}));
  check('the recorded figure is a dash, not a zero — zero is a claim, a dash is not',
    r.says, '—');
  check('and the line waits rather than asserting anything', r.cls, 'adj-delta idle');

  console.log('\n═══ Jose\'s example: the app says 40, the rack holds 38 ═══\n');

  r = await p.evaluate(() => fill({ mType:'WINDOW', mName:'BS10', adjRack:'A1A', adjCounted:'38' }));
  check('the app\'s own figure for that rack is shown', r.says, '40');
  check('a short count reads as a removal', r.cls, 'adj-delta down');
  like('...naming the size of the correction, not the count', r.txt, /−\s*2\b/);
  like('...and showing the before and after', r.txt, /40 → 38/);
  // The one sentence that keeps the waste figure clean.
  like('...and saying, in words, that this is not waste', r.txt, /not that material was lost|use Waste/i);

  console.log('\n═══ counted MORE than the record said ═══\n');

  r = await p.evaluate(() => fill({ adjRack:'B2B', adjCounted:'15' }));
  check('the figure follows the rack, not the material', r.says, '12');
  check('a long count reads as an addition — the direction Waste can never go',
    r.cls, 'adj-delta up');
  like('...sized and signed correctly', r.txt, /\+\s*3\b/);
  like('...with no warning, because the app knows this rack', r.txt, /^(?!.*⚠)/s);

  console.log('\n═══ a rack the app has never seen this material in ═══\n');

  r = await p.evaluate(() => fill({ adjRack:'C3C', adjCounted:'5' }));
  check('an absent rack reads as zero — which is true', r.says, '0');
  check('...and everything counted there is a discovery', r.cls, 'adj-delta up');
  // Far more often a typo in the rack box than a genuine find, and the person
  // is the only one who can tell which.
  like('...but the screen says so out loud instead of quietly inventing stock',
    r.txt, /⚠.*no BS10 at that rack/i);

  console.log('\n═══ the count matches ═══\n');

  r = await p.evaluate(() => fill({ adjRack:'A1A', adjCounted:'40' }));
  check('a matching count is its own state, not an error', r.cls, 'adj-delta same');
  like('...and is reported as the good news it is', r.txt, /nothing to correct/i);

  console.log('\n═══ what the rest of the form gets ═══\n');

  r = await p.evaluate(() => {
    fill({ adjRack:'A1A', adjCounted:'38' });
    var a = _readAdjust();
    return { delta: a.delta, says: a.says, counted: a.counted, rack: a.rack,
             hasCount: a.hasCount, knownRack: a.knownRack };
  });
  check('the difference the row will be saved with', r.delta, -2);
  check('...alongside both numbers it came from', [r.says, r.counted], [40, 38]);
  check('...the rack it happened at', r.rack, 'A1A');
  check('...and whether that rack was known', [r.hasCount, r.knownRack], [true, true]);

  // A count of zero is a real answer — "the shelf is empty" — and has to be
  // told apart from an empty box, which is no answer at all.
  r = await p.evaluate(() => {
    fill({ adjRack:'A1A', adjCounted:'0' });
    var a = _readAdjust();
    return { has: a.hasCount, delta: a.delta };
  });
  check('counting ZERO is an answer, not a blank', [r.has, r.delta], [true, -40]);

  r = await p.evaluate(() => {
    fill({ adjRack:'A1A', adjCounted:'' });
    var a = _readAdjust();
    return { has: a.hasCount, delta: a.delta };
  });
  check('an empty box is not a count of zero', [r.has, r.delta], [false, 0]);

  // Changing the material has to move the recorded figure with it, or the
  // screen compares a count of one thing against the stock of another.
  r = await p.evaluate(() => fill({ mType:'SCREEN', mName:'BS10', adjRack:'A1A', adjCounted:'38' }));
  check('a different CATEGORY is a different material, and the figure follows',
    r.says, '0');

  console.log('\n═══ the badge on the material box ═══\n');

  r = await p.evaluate(() => {
    __badge = 0;
    fill({ mType:'WINDOW', mName:'BS10', adjRack:'A1A', adjCounted:'38' });
    return __badge;
  });
  check('every recalculation re-syncs the box total, so it cannot sit stale', r > 0, true);

  await browser.close();
  if (errors.length) fails.push('page errors: ' + errors.join(' | '));
  if (fails.length){ console.error('\nFAILED:\n  ' + fails.join('\n  ')); process.exit(1); }
  console.log('\nadjust form: ok');
})();
