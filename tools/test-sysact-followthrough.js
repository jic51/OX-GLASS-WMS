// FOLLOW-THROUGH — the two dead ends behind the cards Jose could finally see.
//
// v11.30 fixed the one-underscore bug and the system-activity cards appeared
// for the first time. Jose pressed the two things on them, and both went
// nowhere. Neither was a coincidence: a feature nobody could reach for months
// is a feature whose links nobody ever followed.
//
//   1. "Show the movements (220, 232, 239, …)" answered with a toast:
//      "Those rows are in the archived history — use Load Older History to
//      see them." True, and useless. The rows were from April and the archive
//      cutoff is six months, so EVERY row the card named was on the other
//      sheet — the message was guaranteed, not exceptional. The app knew
//      exactly which rows were missing and knew how to fetch them, and asked
//      the person to go press a different button and start over instead.
//
//   2. "Details →" opened Settings on the System tab and marked nothing.
//      There IS a spotlight — a six-second highlight — but it ran on a
//      `setTimeout(..., 350)`. openSettingsModal() calls _loadSettings(),
//      which is a google.script.run round trip; the tab cannot exist until
//      that returns, and Apps Script does not answer in 350ms. So the lookup
//      ran against a tab that was not there, found nothing, and hit
//      `if (!el) return;` — giving up in silence.
//
// Both are the same mistake in different clothes: the app knowing something is
// wrong and saying nothing useful about it. A bigger timeout would not have
// fixed the second one — it would only have made the race longer, still
// unwinnable, and still silent when lost. The fix is to stop racing: remember
// what to highlight, and let the render apply it whenever the render happens.
//
// Usage:  node tools/test-sysact-followthrough.js

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
function codeOnly(src) {
  return src.split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n');
}

// ── 1. Details → the spotlight that lost a race ─────────────────────────────
console.log('\n═══ "Details →" marks the entry it came from ═══\n');
{
  const open   = codeOnly(extractFn(HTML, '_openSystemActivity'));
  const apply  = codeOnly(extractFn(HTML, '_applySysActSpot'));
  const render = codeOnly(extractFn(HTML, '_renderSystemTab'));

  check('opening no longer guesses how long the server will take — there is no ' +
        'setTimeout left in _openSystemActivity at all',
    !/setTimeout/.test(open));
  check('it records WHICH entry to mark instead',
    /_sysActSpotWanted\s*=\s*id/.test(open));
  check('...and still opens Settings on the System tab',
    /_settingsTab\s*=\s*'system'/.test(open) && /openSettingsModal\(\)/.test(open));

  check('the render applies it, so the timing is the render\'s and not a guess',
    /_applySysActSpot\(\)/.test(render));
  check('...and it runs AFTER the list is written into the DOM, not before',
    render.indexOf('content.innerHTML') < render.indexOf('_applySysActSpot()'));

  check('the spotlight clears the request when it consumes it, so returning to ' +
        'Settings later does not re-highlight a stale entry',
    /_sysActSpotWanted\s*=\s*null/.test(apply));
  check('...and it still adds the six-second highlight and scrolls to it',
    /sysact-spot/.test(apply) && /scrollIntoView/.test(apply));

  // Run it. A stub DOM is enough: the whole question is whether the element is
  // found when the function is called at the right moment rather than a
  // guessed one.
  const marked = [];
  const ctx = vm.createContext({
    console: console,
    setTimeout: function (fn) { return 0; },   // the 6s un-highlight, not under test
    document: {
      getElementById: function (id) {
        if (id !== 'sysact-2026-08-25T16:29:00.000Z|AUTO_REPAIR_MATID') return null;
        return {
          scrollIntoView: function () { marked.push('scrolled'); },
          classList: { add: function (c) { marked.push(c); }, remove: function () {} }
        };
      }
    }
  });
  vm.runInContext('var _sysActSpotWanted = null;', ctx);
  vm.runInContext(extractFn(HTML, '_applySysActSpot'), ctx);

  ctx._sysActSpotWanted = '2026-08-25T16:29:00.000Z|AUTO_REPAIR_MATID';
  vm.runInContext('_applySysActSpot()', ctx);
  check('given a real card id, it scrolls to the entry and highlights it',
    marked.indexOf('scrolled') !== -1 && marked.indexOf('sysact-spot') !== -1);
  check('...and the request is consumed, not left standing',
    ctx._sysActSpotWanted === null);

  marked.length = 0;
  vm.runInContext('_applySysActSpot()', ctx);
  check('a second render with nothing pending marks nothing', marked.length === 0);

  ctx._sysActSpotWanted = 'an|id-that-is-not-on-screen';
  vm.runInContext('_applySysActSpot()', ctx);
  check('an id with no matching entry is simply not marked, and does not throw',
    marked.length === 0);
}

// ── 2. Show the movements → fetch what is missing ───────────────────────────
console.log('\n═══ "Show the movements" fetches the archive instead of ═══');
console.log('═══ telling you to go and do it yourself             ═══\n');
{
  const show = codeOnly(extractFn(HTML, '_showMovementRows'));
  const spot = codeOnly(extractFn(HTML, '_spotMovementRows'));

  check('the dead-end message is gone from the source',
    !/use "Load Older History" to see them/.test(codeOnly(HTML)));
  check('a miss now loads the archived history itself',
    /processMovement\('loadOlderHistory'/.test(spot));
  check('...and retries the highlight once the rows are in',
    /_spotMovementRows\(want,\s*false\)/.test(spot));
  check('...only once — the retry pass cannot fetch again, so a genuinely ' +
        'missing row cannot loop',
    /if \(mayFetch && !_oldHistoryLoaded\)/.test(spot));
  check('the first pass is the one allowed to fetch',
    /_spotMovementRows\(want,\s*true\)/.test(show));
  check('it does not re-fetch an archive that is already loaded',
    /!_oldHistoryLoaded/.test(spot));

  check('the person is told a fetch is happening rather than watching nothing',
    /fetching them/.test(spot));
  check('a failed fetch says so instead of failing quietly',
    /Could not load the archived history/.test(spot));
  check('and if the rows are still missing after the archive is loaded, it says ' +
        'THAT — a different fact, not the same advice again',
    /no longer in the history/.test(spot));

  check('the Load Older History button is left usable again on failure, not ' +
        'stuck saying "Loading…"',
    /btn\.textContent = '📜 Load Older History'/.test(spot));
  check('...and shows the loaded count on success, matching what the button ' +
        'does when pressed by hand',
    /Older History \(' \+ oldMovements\.length/.test(spot));
}

console.log('\n' + '─'.repeat(72));
console.log('The spotlight half is executed against a stub DOM; the fetch half is');
console.log('read from source, because it needs a live Apps Script round trip.');
console.log('Confirm that one on the deployed copy: press "Show the movements"');
console.log('on a re-link card older than the archive cutoff.');
console.log('─'.repeat(72));

console.log('\nsysact follow-through: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
