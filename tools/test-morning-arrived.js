// Verifies the "Mark arrived →" shortcut on the morning popup's cards
// (v9.94). Jose wanted a way to go straight from "this is arriving today" to
// the exact place where you record that it turned up, visible to admins only.
//
// showMorningPopup builds its HTML as a string, so this lifts it verbatim
// into a Node vm with the handful of helpers it calls stubbed, and reads the
// markup it produces. What is actually being checked is the RULES — who sees
// the button, on which rows — not the styling.
//
// Usage:  node tools/test-morning-arrived.js [path/to/Index_v3_fixed.html]

const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = process.argv[2] || path.join(__dirname, '..', 'Index_v3_fixed.html');
const src = fs.readFileSync(SRC, 'utf8');

function extractFn(name) {
  const a = src.indexOf('function ' + name + '(');
  if (a === -1) throw new Error('function not found: ' + name);
  let depth = 0, i = src.indexOf('{', a);
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(a, i + 1); }
  }
  throw new Error('unbalanced braces in ' + name);
}

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

const TODAY = '2026-08-20';
const items = [
  { id: 'inc_1', category: 'WINDOW', name: 'DAL - Kotter Res', qty: 61, unit: 'UNIT',
    status: 'Pending', estDate: TODAY, dateMode: 'exact', notes: 'Invoice: 08-795' },
  { id: 'inc_2', category: 'GLASS', name: 'Already here', qty: 4, unit: 'UNIT',
    status: 'Arrived', estDate: TODAY, dateMode: 'exact', notes: '' },
  { id: 'inc_3', category: 'GLASS', name: 'Later this week', qty: 9, unit: 'UNIT',
    status: 'Pending', estDate: '2026-08-22', dateMode: 'exact', notes: '' },
  // Booked from an attached load sheet: real, arriving today, and nobody has
  // said how many yet. Since v11.24 the Quantity box opens blank, so this is
  // now an ordinary state rather than an odd one.
  { id: 'inc_4', category: 'GLASS', name: 'Truck from Amsco', qty: 0, unit: 'UNIT',
    status: 'Pending', estDate: TODAY, dateMode: 'exact', notes: '' }
];

function run(role) {
  const box = { innerHTML: '' };
  const sandbox = {
    console: console,
    userRole: role,
    incoming: items,
    catBadge: function (c) { return '<span class="cat">' + c + '</span>'; },
    _incOnDay: function (item, day) { return item.estDate === day; },
    _incDateLabel: function (item) { return item.estDate; },
    document: {
      getElementById: function (id) {
        if (id === 'morningPopupBody') return box;
        if (id === 'noShowTodayLabel') return { style: {} };
        if (id === 'morningOverlay') return { classList: { add: function () {} } };
        return null;
      }
    }
  };
  vm.createContext(sandbox);
  // _incQtyText is lifted in rather than stubbed: whether a delivery with no
  // count says "qty not stated" instead of "0 UNIT" is one of the things this
  // card has to get right, and a stub would only prove the stub works.
  vm.runInContext(extractFn('_he') + '\n' + extractFn('_escAttr') + '\n' +
                  extractFn('_incQtyText') + '\n' + extractFn('_incFirstDocUrl') + '\n' +
                  extractFn('_incItemHtml') + '\n' + extractFn('showMorningPopup'), sandbox);
  vm.runInContext('showMorningPopup(' + JSON.stringify(items) + ', ' + JSON.stringify(TODAY) + ')', sandbox);
  return box.innerHTML;
}

console.log('\nScenario: an ADMIN opens the morning popup');
const admin = run('ADMIN');
check('the shortcut appears on the pending delivery arriving today',
  admin.indexOf('data-action="morning-arrived"') !== -1 && admin.indexOf('data-id="inc_1"') !== -1);
check('it carries the wording Jose asked for', admin.indexOf('Mark arrived') !== -1);
check('NOT offered on a delivery already marked Arrived — nothing left to do',
  admin.indexOf('data-id="inc_2"') === -1);
check('offered on the rest of the week too, not only today (a delivery can turn up early)',
  admin.indexOf('data-id="inc_3"') !== -1);
check('the card still shows the status badge alongside it',
  admin.indexOf('inc-status-pending') !== -1);
check('a delivery with a real count still shows it', admin.indexOf('61 UNIT') !== -1);
// "0 UNIT" is a figure somebody plans around, and nobody claimed it.
check('a delivery nobody has counted says so instead of claiming zero',
  admin.indexOf('qty not stated') !== -1 && admin.indexOf('0 UNIT') === -1);

console.log('\nScenario: a WAREHOUSE user opens the same popup');
const wh = run('WAREHOUSE');
check('no shortcut anywhere — same gate as the Incoming table\'s edit pencil',
  wh.indexOf('morning-arrived') === -1);
check('but they still see the deliveries themselves', wh.indexOf('DAL - Kotter Res') !== -1);

console.log('\nScenario: a VIEWER opens it');
const viewer = run('VIEWER');
check('no shortcut', viewer.indexOf('morning-arrived') === -1);

console.log('\nScenario: an id containing quotes cannot break out of the attribute');
const nasty = [{ id: 'x" onclick="alert(1)', category: 'C', name: 'N', qty: 1, unit: 'U',
  status: 'Pending', estDate: TODAY, dateMode: 'exact', notes: '' }];
const box = { innerHTML: '' };
const sb = {
  console: console, userRole: 'ADMIN', incoming: nasty,
  catBadge: function (c) { return c; },
  _incOnDay: function (i, d) { return i.estDate === d; },
  _incDateLabel: function (i) { return i.estDate; },
  document: { getElementById: function (id) {
    if (id === 'morningPopupBody') return box;
    if (id === 'noShowTodayLabel') return { style: {} };
    if (id === 'morningOverlay') return { classList: { add: function () {} } };
    return null;
  } }
};
vm.createContext(sb);
vm.runInContext(extractFn('_he') + '\n' + extractFn('_escAttr') + '\n' +
                extractFn('_incQtyText') + '\n' + extractFn('_incFirstDocUrl') + '\n' +
                extractFn('_incItemHtml') + '\n' + extractFn('showMorningPopup'), sb);
vm.runInContext('showMorningPopup(' + JSON.stringify(nasty) + ', ' + JSON.stringify(TODAY) + ')', sb);
check('the quote is escaped, no injected onclick survives',
  box.innerHTML.indexOf('onclick="alert(1)') === -1 && box.innerHTML.indexOf('&quot;') !== -1);

// The handler itself: it must not save anything on its own, and must refuse a
// non-admin even if the button were somehow reached.
console.log('\nScenario: the handler is a shortcut, not a save');
const handler = extractFn('_markArrivedFromPopup');
check('re-checks the role rather than trusting the button was hidden',
  /userRole\s*!==\s*'ADMIN'/.test(handler));
check('never calls the server itself — the person still presses Save',
  handler.indexOf('google.script.run') === -1);
check('opens the Incoming item\'s own edit window', /openIncomingModal\(/.test(handler));
check('switches to the Incoming tab first, so the modal is not floating over the dashboard',
  /showTab\('incoming'/.test(handler));
check('pre-selects Arrived so it is one click plus Save', /=\s*'Arrived'/.test(handler));
check('handles the item having been deleted since the popup was drawn',
  /if \(!item\)/.test(handler));

check('the popup is NOT closed — it is a list you work down, and closing it after\n       the first delivery left no way back but reloading the app',
  handler.indexOf('closeMorningPopup') === -1);

console.log('\nScenario: the layout Jose drew');
// Category on its own line, then how many and what, then the note, then the
// state and the one action. The old row put all of it on one wrapping line,
// which is what made two deliveries read as one.
check('the category gets a line of its own, above everything',
  admin.indexOf('inc-item-cat') !== -1);
check('...then the quantity, in front of the name', admin.indexOf('inc-item-qty') !== -1);
check('...then whatever was noted about it', admin.indexOf('inc-item-meta') !== -1);
check('...and the status sits at the bottom, beside the button',
  admin.indexOf('inc-item-foot') !== -1);
{
  const cat  = admin.indexOf('inc-item-cat');
  const qty  = admin.indexOf('inc-item-qty');
  const foot = admin.indexOf('inc-item-foot');
  check('and they come in that order, not merely all present', cat < qty && qty < foot);
}
// One delivery, one shape, wherever it is drawn.
check('the week cards use the same renderer rather than a second copy of it',
  /_incItemHtml\(item, \{ showDate: false \}\)/.test(src));

console.log('\nScenario: the way back into the popup');
const reopen = extractFn('openWeekSchedule');
check('there is a function to reopen it at all', !!reopen);
check('...which asks the same "what is left of this week" as the automatic one',
  /_thisWeeksDeliveries\(/.test(reopen) &&
  /_thisWeeksDeliveries\(/.test(extractFn('checkMorningPopup')));
check('...and says so plainly when there is nothing left this week',
  /Nothing expected for the rest of this week/.test(reopen));
check('a button on the Incoming screen calls it', /onclick="openWeekSchedule\(\)"/.test(src));
const refresh = extractFn('_refreshMorningPopup');
check('an open popup redraws itself when the data behind it changes',
  /classList\.contains\('show'\)/.test(refresh) && /showMorningPopup\(/.test(refresh));
check('...and nothing happens when it is closed', /return;/.test(refresh));
check('the redraw is wired to the Incoming render, which runs after a save',
  /_refreshMorningPopup\(\);/.test(extractFn('renderIncoming')));

console.log('\nmorning "mark arrived": ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
