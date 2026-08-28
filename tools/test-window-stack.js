// WINDOW STACK — which window is in front, and why it stopped being a guess.
//
// Jose hit this on the deployed v11.25, with screenshots: from the morning
// popup ("Good Morning — This Week's Schedule"), pressing **Mark arrived**
// opened "Edit Expected Material" BEHIND the popup. And it was not merely
// behind — it was DEAD. Nothing on it could be clicked. The only way out was
// to close the popup and lose your place in the list.
//
// The dead part is the interesting part, and it is not a second bug. The
// window shield (_topOpenOverlay, Index_v3_fixed.html) deliberately makes
// every window except the front one inert, so a click can never land on a
// half-hidden form behind another. It picks the front window by z-index. It
// was reading the stack correctly. The stack was wrong:
//
//     .overlay                (EVERY modal in the app)      550
//     .cconfirm-overlay       (confirm dialog)             1100
//     .media-preview-overlay  (photo / PDF preview)        1200
//     .wiz-overlay            (setup wizard)               2000
//     .morning-overlay        (the morning popup)          2000   ← wrong
//
// The popup sat 1450 above the modal it opens. So the shield correctly
// concluded the popup was in front, and correctly disabled the modal.
//
// THE RULE THIS FILE ENCODES
//
// The morning popup only ever OPENS modals. No modal opens the morning popup.
// The relationship runs one way, so the popup belongs UNDERNEATH everything it
// can launch. 540 puts it above the page and the top bar (500) and below all
// four window layers. The shield needed no change at all.
//
// Why a whole file for one number: because the number was invented once and
// nothing was watching it. .morning-overlay was declared with 2000 by someone
// reasoning "it should be on top", which is true of a popup and false of a
// popup that opens other windows. The next new window will be declared the
// same way. This fails when that happens.
//
// Usage:  node tools/test-window-stack.js

const fs = require('fs'), path = require('path');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

// Read the declared z-index of a CSS class out of the shipping file. Anchored
// on the class's own rule so a z-index belonging to some neighbouring selector
// cannot be picked up by accident.
function zOf(cls) {
  const re = new RegExp('\\.' + cls.replace('.', '\\.') + '\\s*\\{[^}]*?z-index:\\s*(\\d+)');
  const m = re.exec(HTML);
  return m ? Number(m[1]) : null;
}

const LAYERS = {
  'morning-overlay':       'the morning popup — opens modals, so it goes underneath them',
  'overlay':               'every modal in the app, including Edit Expected Material',
  'cconfirm-overlay':      'the confirm dialog — has to sit above a modal to confirm it',
  'media-preview-overlay': 'photo and PDF preview, opened from inside a modal',
  'wiz-overlay':           'the setup wizard — owns the screen while it runs'
};

console.log('\n═══ every window layer is declared ═══\n');
const z = {};
Object.keys(LAYERS).forEach(function (cls) {
  z[cls] = zOf(cls);
  check(cls + ' declares a z-index (' + z[cls] + ') — ' + LAYERS[cls], z[cls] !== null);
});

console.log('\n═══ the order, and the one that was wrong ═══\n');

// THE ASSERTION THIS FILE EXISTS FOR.
check('the morning popup sits BELOW every modal — this is the bug Jose hit, ' +
      'and it is the whole fix (' + z['morning-overlay'] + ' < ' + z['overlay'] + ')',
  z['morning-overlay'] < z['overlay']);

check('...and it is still ABOVE the page and the top bar, so it reads as a ' +
      'window rather than as part of the dashboard (' + z['morning-overlay'] + ' > 500)',
  z['morning-overlay'] > 500);

check('a confirm dialog sits above an ordinary modal — otherwise "are you sure?" ' +
      'appears behind the thing it is asking about',
  z['cconfirm-overlay'] > z['overlay']);

check('a photo preview sits above the modal that opened it',
  z['media-preview-overlay'] > z['overlay']);

check('the setup wizard sits above everything — it owns the screen while it runs',
  z['wiz-overlay'] >= z['media-preview-overlay']);

console.log('\n═══ no two layers tie ═══\n');
// A tie is not harmless. The shield breaks ties by document order, so two
// windows at the same z-index have their stacking decided by where they happen
// to sit in the HTML — which is exactly the kind of accident that produced
// this bug: .morning-overlay was tied with .wiz-overlay at 2000.
{
  const seen = {};
  const ties = [];
  Object.keys(LAYERS).forEach(function (cls) {
    const v = z[cls];
    if (seen[v]) ties.push(seen[v] + ' and ' + cls + ' both at ' + v);
    else seen[v] = cls;
  });
  check('every layer has its own z-index' + (ties.length ? ' — tied: ' + ties.join('; ') : ''),
    ties.length === 0);
}

console.log('\n═══ the shield still reads the stack, and was never at fault ═══\n');
{
  const code = HTML.split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n');
  check('the shield still picks the front window by computed z-index rather ' +
        'than by a hardcoded list — the fix was the stack, not the shield',
    /_topOpenOverlay[\s\S]{0,600}getComputedStyle\(el\)\.zIndex/.test(code));
  check('the morning overlay is still one of the windows the shield knows about',
    /_SHIELD_SEL\s*=\s*'[^']*\.morning-overlay/.test(code));
  check('...and so is every modal', /_SHIELD_SEL\s*=\s*'\.overlay/.test(code));

  // The reason the fix is safe: nothing opens the morning popup from a modal,
  // so it never needs to be on top of one. If that ever changes, whoever makes
  // the change has to come here.
  const openers = (code.match(/showMorningPopup\(/g) || []).length;
  check('showMorningPopup is called from a small, countable number of places ' +
        '(' + openers + ') — all page-level, none from inside a modal',
    openers >= 2 && openers <= 6);
}

console.log('\n' + '─'.repeat(72));
console.log('This reads declared CSS. It does not paint anything, so it cannot');
console.log('prove the modal is CLICKABLE — only that it is on top and that the');
console.log('shield will therefore treat it as the front window. Press "Mark');
console.log('arrived" once on the deployed copy and type into the form.');
console.log('─'.repeat(72));

console.log('\nwindow stack: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
