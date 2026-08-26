// Two halves of the Incoming feature that disagreed with each other.
//
// Jose, on an expected delivery he had just tried to cancel and then delete:
//
//   "Error: Incoming item not found: INC-1781101614979
//    AL ELIMINAR O ANULAR INCOMINGS NO HAY RETROALIMENTACIÓN Y EL BOTÓN NO SE
//    DESACTIVA, POR ESO DI CLIC 2 VECES."
//
// Two separate defects behind one screenshot:
//
//   1. The Status dropdown was thrown away on ADD. addIncoming hard-coded
//      'Pending' in its appendRow and never looked at data.status — while
//      updateIncoming honoured it. So a delivery entered as already Arrived,
//      or cancelled on the spot, saved as Pending and had to be edited a
//      second time to make it stick. The form sent the value all along.
//
//   2. Deleting had NO feedback and NO guard. The window stays open until the
//      server answers, so the Delete button was still under the finger that
//      had just pressed it, with nothing on screen to say the first press had
//      registered. The second press reached a row the server had already
//      removed and reported "Incoming item not found" — a red error for a
//      delete that had worked perfectly.
//
// Usage:  node tools/test-incoming.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const GS   = fs.readFileSync(path.join(ROOT, 'Code_v3_fixed.gs'), 'utf8');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label); }
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
function extractVar(name) {
  const a = GS.indexOf('var ' + name + ' = ');
  if (a === -1) throw new Error('var not found: ' + name);
  const curly = GS.indexOf('{', a), square = GS.indexOf('[', a);
  const arr = square !== -1 && (curly === -1 || square < curly);
  const open = arr ? '[' : '{', close = arr ? ']' : '}';
  let depth = 0, i = arr ? square : curly;
  for (; i < GS.length; i++) {
    if (GS[i] === open) depth++;
    else if (GS[i] === close) { depth--; if (depth === 0) return GS.slice(a, i + 1) + ';'; }
  }
  throw new Error('unbalanced brackets in ' + name);
}

console.log('\n═══ the Status the form sends is the Status that gets saved ═══\n');

// The real normaliser, not a stand-in — the point is what the shipped file does.
const sandbox = { console, String };
vm.createContext(sandbox);
vm.runInContext([extractVar('INCOMING_STATUSES'), extractFn('incomingStatus_')].join('\n'), sandbox);
const st = sandbox.incomingStatus_;

check('Pending stays Pending',                      st('Pending')   === 'Pending');
check('Arrived survives — this is the one that was being thrown away',
                                                    st('Arrived')   === 'Arrived');
check('Cancelled survives — "anular" has to work on the first save',
                                                    st('Cancelled') === 'Cancelled');
check('an empty status means Pending, which is what a new delivery is',
                                                    st('')          === 'Pending');
check('undefined means Pending too — an older client that sends no status still works',
                                                    st(undefined)   === 'Pending');
check('case and stray spaces are forgiven, not written through',
                                                    st('  arrived ') === 'Arrived');
// A status no filter matches is worse than a wrong one: the row disappears
// from every view at once and nothing says why.
check('a status the app does not know falls back to Pending, never reaches the sheet',
                                                    st('Delivered') === 'Pending');
check('the three states are exactly the three the dropdown offers',
  JSON.stringify(sandbox.INCOMING_STATUSES) === JSON.stringify(['Pending', 'Arrived', 'Cancelled']));

{
  const add = extractFn('addIncoming');
  check('addIncoming reads the status instead of hard-coding one',
    /incomingStatus_\(data\.status\)/.test(add));
  check("...and the literal 'Pending' is gone from its appendRow",
    !/^\s*'Pending',\s*$/m.test(add));

  const upd = extractFn('updateIncoming');
  check('updateIncoming goes through the SAME function — that is what stops them drifting apart again',
    /incomingStatus_\(data\.status\)/.test(upd));
}

{
  // The dropdown in the HTML is the other end of the contract. If somebody
  // adds a fourth option there, the normaliser silently turns it into Pending
  // — so the two lists have to be checked against each other, not assumed.
  const sel = HTML.slice(HTML.indexOf('<select id="incStatus">'),
                         HTML.indexOf('</select>', HTML.indexOf('<select id="incStatus">')));
  const opts = (sel.match(/value="([^"]+)"/g) || []).map(s => s.slice(7, -1));
  check('every option the form offers is a status the server accepts',
    opts.length === 3 && opts.every(o => st(o) === o));
}

console.log('\n═══ deleting says something, and cannot be pressed twice ═══\n');

{
  const del = HTML.slice(HTML.indexOf('function _doDeleteIncomingItem('),
                         HTML.indexOf('// ── Read an email into expected deliveries'));

  check('the Delete button goes busy — Jose pressed twice because nothing changed on screen',
    /_btnBusy\(btn, 'Deleting…'\)/.test(del));
  check('a second press while the first is in flight is dropped before it reaches the server',
    /if \(btn && btn\.disabled\) return;/.test(del));
  check('the button it disables is the one that was pressed',
    /getElementById\('btnDeleteIncoming'\)/.test(del));
  check('"Incoming item not found" is treated as done, not as an error',
    /Incoming item not found/.test(del) && /_incomingDeleted\(btn\); return;/.test(del));
  check('a REAL error still restores the button and still shows the error',
    /_btnReset\(btn\);/.test(del) && /showToast\('Error: ' \+ msg, 'err'/.test(del));
  check('a successful delete confirms itself — there was no toast at all before',
    /showToast\('Expected delivery deleted\.', 'ok'\)/.test(del));
  check('the window closes and the data reloads exactly as before',
    /closeModal\('incomingOverlay'\)/.test(del) && /loadDataFromGoogle\(true\)/.test(del));
  // err can arrive as an Error, or as a bare string from some transports.
  // Reading .message off a string is undefined, and "Error: undefined" is
  // exactly the message that teaches a user to stop reading toasts.
  check('the failure handler survives an error that is not an Error object',
    /err && err\.message/.test(del) && /String\(err \|\| ''\)/.test(del));

  check('the button in the markup still points at the same function',
    /id="btnDeleteIncoming"[^>]*onclick="deleteIncomingItem\(\)"/.test(HTML));
}

console.log('\nincoming: ' + (fail === 0 ? 'ok (' + ok + ' checks)' : fail + ' FAILED'));
process.exit(fail === 0 ? 0 : 1);
