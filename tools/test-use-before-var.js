// USE BEFORE VAR — the one-underscore bug that hid for months.
//
// getInitialData built its payload with this line:
//
//     systemActivity: (function(){ try { return getSystemActivity_(30, _auth.email); }
//                                  catch (e) { return []; } })(),
//
// The variable in that scope is `auth`. There IS a `_auth` in the function —
// declared at the BOTTOM, inside the error handler:
//
//     } catch (err) {
//       var _auth = getUserRole(sessionToken);
//
// `var` hoists to the top of the function, so `_auth` existed at the payload
// line and held `undefined`. `_auth.email` threw a TypeError on every call,
// and the inline catch turned it into an empty array.
//
// systemActivity was [] on EVERY load, for EVERY user, from the day that line
// was written. Both consumers went dark together — the corner deck, which
// builds _sysCards from it, and Settings → System, which builds sysActs from
// the same list and therefore said nothing automatic had ever run. Jose
// reported them as one problem. He was right; it was one line.
//
// The backups were never broken: they ran nightly, wrote to AUDIT_LOG with
// actor 'system', and 27 of them sat in Drive. The rows never left the server.
//
// WHY NOTHING CAUGHT IT
//
// It is not a syntax error, so `node --check` is happy. The runtime error was
// swallowed by a catch that returned a plausible empty value. And
// tools/test-sysactivity-dismiss.js passes — it calls getSystemActivity_
// directly in a vm with its own arguments, so it tests the FUNCTION and never
// the line that uses it. Exactly the shape of the v11.29 role-label bug, where
// _displayRole was correct and one caller did not use it.
//
// WHAT THIS FILE DOES
//
// A `var` used before the line that declares it is legal JavaScript and almost
// always a mistake — it can only ever read `undefined`. This walks every
// function in Code_v3_fixed.gs, finds each `var` it declares, and fails if the
// name is READ anywhere above that declaration. That is a general rule, not a
// patch for one line, and it is the only kind of check that would have caught
// this without knowing to look for it.
//
// Usage:  node tools/test-use-before-var.js

const fs = require('fs'), path = require('path');
const GS = fs.readFileSync(path.join(__dirname, '..', 'Code_v3_fixed.gs'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}
// Line comments only — see tools/test-fractional-qty.js for why stripping
// /* */ across these files is a good way to lose ten thousand lines.
function codeOnly(src) {
  return src.split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n');
}

const CODE  = codeOnly(GS);
const LINES = CODE.split('\n');
const FUNCS = [];
LINES.forEach((l, i) => {
  const m = /^function ([A-Za-z0-9_]+)\s*\(/.exec(l);
  if (m) FUNCS.push({ start: i, name: m[1] });
});
FUNCS.forEach((f, i) => {
  f.end = (i + 1 < FUNCS.length ? FUNCS[i + 1].start : LINES.length) - 1;
});

// ── The specific line ───────────────────────────────────────────────────────
console.log('\n═══ the line itself ═══\n');
{
  const body = LINES.slice(
    FUNCS.find(f => f.name === 'getInitialData').start,
    FUNCS.find(f => f.name === 'getInitialData').end + 1).join('\n');

  check('the payload asks getSystemActivity_ for the signed-in user by the ' +
        'name that actually exists in that scope',
    /getSystemActivity_\(\s*30\s*,\s*auth\.email\s*\)/.test(body));
  check('...and no longer reads _auth there, which was hoisted and undefined',
    !/getSystemActivity_\([^)]*_auth\.email/.test(body));
  check('_auth still exists where it belongs — the error handler at the bottom, ' +
        'which is a different execution path and perfectly correct',
    /catch\s*\(\s*err\s*\)[\s\S]{0,300}var _auth = getUserRole\(sessionToken\)/.test(body));
  check('the catch that hid it now leaves a trace instead of returning [] in ' +
        'silence — the empty array stays, because a failed audit read must not ' +
        'take down the whole load',
    /systemActivity failed/.test(GS));
}

// ── The general rule ────────────────────────────────────────────────────────
console.log('\n═══ no function reads a var above the line that declares it ═══\n');
{
  // THE DETECTOR'S OWN BLIND SPOTS, FOUND BY RUNNING IT.
  //
  // The first version of this check reported five offenders. All five were
  // correct code and the detector was wrong, in three distinct ways — worth
  // writing down, because a guard that cries wolf gets deleted:
  //
  //   1. CALLBACK PARAMETERS. `photos.forEach(function (p) {...})` uses `p`
  //      long before a later, unrelated `var p = images[0]`. Different scopes.
  //   2. MODULE-LEVEL VARS. `var IMPORT_REQUIRED_HEADERS` sits at column 0
  //      BETWEEN two functions, and the line-based splitter attributed it to
  //      whichever function came before. It is a file-level constant, hoisted
  //      correctly, and used by functions above it on purpose.
  //   3. STRING LITERALS. A prompt ending "...no other text." matched a read
  //      of a variable called `text`.
  //   4. REGEX FLAGS. In `/\.xlsx?$/i.test(fileName)` the trailing `i` flag,
  //      followed by `.test`, read as a variable called `i` being used — and
  //      the function does declare a loop `var i` further down.
  //
  // Fixed here rather than by loosening the assertion, because the assertion
  // is the entire point: it has to still fail on the real one.
  const ALLOWED = {};

  // Blank out anything that is not code a variable could live in: string
  // contents, and regex literals with their flags. Both produced a false
  // offender on the first run.
  function neutralize(line) {
    return line
      .replace(/'(?:\\.|[^'\\])*'/g, "''")
      .replace(/"(?:\\.|[^"\\])*"/g, '""')
      // A regex literal only ever follows one of these, which is what keeps
      // this from eating ordinary division.
      .replace(/(^|[=(,:!&|?{};\s])\/(?:\\.|\[(?:\\.|[^\]\\])*\]|[^/\\\n])+\/[gimsuy]*/g, '$1RE');
  }

  const offenders = [];
  FUNCS.forEach(f => {
    const body = LINES.slice(f.start, f.end + 1).map(neutralize);

    // Every name bound as a parameter of ANY function in this range — the
    // outer one and every nested callback. These are separate bindings and can
    // legitimately appear anywhere.
    const params = {};
    body.forEach(line => {
      const re = /function\s*[A-Za-z0-9_$]*\s*\(([^)]*)\)/g;
      let m;
      while ((m = re.exec(line))) {
        m[1].split(',').forEach(pn => {
          const n = pn.trim();
          if (n) params[n] = 1;
        });
      }
    });

    // Only vars declared INSIDE the function count. A `var` at column 0 is
    // file-level: it belongs to no function and is hoisted across all of them.
    const declaredAt = {};
    body.forEach((line, idx) => {
      if (idx > 0 && /^var\s/.test(line)) return;      // module-level, not ours
      const re = /\bvar\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
      let m;
      while ((m = re.exec(line))) {
        if (!(m[1] in declaredAt)) declaredAt[m[1]] = idx;
      }
    });

    Object.keys(declaredAt).forEach(name => {
      if (params[name]) return;
      if (ALLOWED[f.name + '.' + name]) return;
      const declIdx = declaredAt[name];
      // A read is the name followed by a property access — enough to mean
      // "this value is being used", narrow enough that a longer identifier
      // containing it cannot match.
      const use = new RegExp('(?<![A-Za-z0-9_$.])' + name.replace(/\$/g, '\\$') + '\\s*\\.');
      for (let i = 0; i < declIdx; i++) {
        if (use.test(body[i])) {
          offenders.push(f.name + ' reads `' + name + '` at line ' +
                         (f.start + i + 1) + ' but declares it at line ' +
                         (f.start + declIdx + 1));
          break;
        }
      }
    });
  });

  check('checked every function in the file (' + FUNCS.length + ')', FUNCS.length > 200);
  check('no var is read above its own declaration' +
        (offenders.length ? '\n         ' + offenders.join('\n         ') : ''),
    offenders.length === 0);
}

// ── The neighbours ──────────────────────────────────────────────────────────
console.log('\n═══ the other inline catches in the same payload ═══\n');
// The payload builds four of its fields inside `(function(){ try {...} catch
// {...} })()`. That pattern is deliberate — one broken optional field should
// not fail the whole load — but it is also precisely what made this bug
// invisible for months, so each one is named here rather than trusted.
{
  const start = CODE.indexOf('serverVersion:      APP_VERSION');
  const payload = CODE.slice(start, CODE.indexOf('gmailScanEnabled', start));
  const iifes = payload.match(/\(function\(\)\{[\s\S]*?\}\)\(\)/g) || [];
  check('the payload still builds fields behind inline catches (' + iifes.length + ')',
    iifes.length >= 2);

  const silent = iifes.filter(s => !/Logger\.log/.test(s));
  check('the systemActivity one now logs rather than swallowing',
    /systemActivity[\s\S]{0,700}Logger\.log/.test(payload));

  // materialPacks and company are cheap, local, and cannot fail for a reason a
  // log would explain — they read a sheet that either exists or does not.
  // Recorded rather than silently tolerated, so a future one has to be argued.
  check('the remaining silent ones are the two known-harmless reads (' +
        silent.length + ' left: they read a sheet that either exists or does not)',
    silent.length <= 2);
}

console.log('\n' + '─'.repeat(72));
console.log('This reads source. It cannot prove the deck now shows a card —');
console.log('open the app after deploying and look at the corner, and at');
console.log('Settings → System. Both read the same list, so both change or');
console.log('neither does.');
console.log('─'.repeat(72));

console.log('\nuse before var: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
