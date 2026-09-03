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
  // Se busca la etiqueta SIN el '>' de cierre: en v11.42 el select ganó un
  // onchange y la búsqueda literal de '<select id="incStatus">' dejó de
  // encontrar nada — indexOf devolvía -1, el slice salía de cualquier parte del
  // archivo, y la comprobación pasó a hablar de un texto que no era el menú.
  // Una prueba que no encuentra lo que mide no falla: mide otra cosa.
  const at = HTML.indexOf('<select id="incStatus"');
  if (at === -1) throw new Error('no se encontró el menú de estado de Incoming');
  const sel = HTML.slice(at, HTML.indexOf('</select>', at));
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

console.log('\n═══ the Quantity box opens empty, and an empty one means "not stated" ═══\n');

{
  // Jose's rule from v11.7 — "al abrir la ventana no debe haber ningún dato
  // escrito, ni siquiera '0' en qty" — reached the five movement windows and
  // missed this one. It matters more here: a delivery booked from an attached
  // load sheet often genuinely has no count until the truck arrives.
  const box = HTML.slice(HTML.indexOf('<input type="number" id="incQty"'),
                         HTML.indexOf('>', HTML.indexOf('<input type="number" id="incQty"')) + 1);
  check('the markup no longer ships a 1 in the box', !/value="1"/.test(box));
  check('...and zero is allowed, since a delivery with no count is a real state',
    /min="0"/.test(box));

  const open = HTML.slice(HTML.indexOf('// Defaults for new'),
                          HTML.indexOf('// Defaults for new') + 900);
  check('opening it fresh leaves the box blank', /getElementById\('incQty'\)\.value\s*=\s*'';/.test(open));

  // Reopening a saved record must show what the record says, not a helpful 1.
  // The `|| 1` that used to be here is how a delivery nobody counted comes
  // back as a delivery of one.
  const edit = HTML.slice(HTML.indexOf("document.getElementById('incDateMode').value = item.dateMode"),
                          HTML.indexOf("document.getElementById('incUnit').value     = item.unit"));
  check('editing one shows blank rather than inventing a 1',
    /\(Number\(item\.qty\) > 0\) \? item\.qty : ''/.test(edit));
}

{
  // Four places print an incoming's quantity. "0 UNIT" would be a figure
  // somebody plans around, and nobody claimed it.
  check('a quantity of zero is never printed as a number',
    /function _incQtyText/.test(HTML) && /qty not stated/.test(HTML));
  // Three, not the four there were: the week cards and the morning popup used to
  // draw a delivery twice and now share _incItemHtml. Collapsing them was the
  // point, so the number going DOWN here is the change working.
  const uses = (HTML.match(/_incQtyText\(/g) || []).length;
  check('every place that shows a quantity goes through it (' + uses + ' call sites)', uses >= 3);
  check('...and the one column that shows just the number shows a dash instead',
    /Number\(item\.qty\) > 0 \? item\.qty : '—'/.test(HTML));
}

console.log('\n═══ the category of a delivery cannot go missing ═══\n');

// Jose opened an IGU delivery from the morning popup and the Category box was
// EMPTY — on a record whose badge said IGU one line above.
//
// Root cause: he had renamed the category to "IGU (ISOLATED GLASS UNIT)". The
// rename rewrote the archive and left INCOMING_V3 alone, so the row still said
// "IGU", no <option> said "IGU" any more, and a <select> handed a value it does
// not have selects nothing — in silence. Save then writes that nothing back.
{
  // Anchored on a line only the CONFIG rename has: `data.op === 'rename'`
  // appears earlier in the file for a different kind of rename, and indexOf
  // finds that one.
  const rename = GS.slice(GS.indexOf('var nvStored = sheetSafe_(nv.toUpperCase());'),
                          GS.indexOf("} else if (data.op === 'delete')",
                                     GS.indexOf('var nvStored = sheetSafe_(nv.toUpperCase());')));
  check('renaming a category now reaches the expected deliveries too',
    /renameIncomingCategory_\(ss, val, nvStored\)/.test(rename));
  check('...alongside the archive and its history, in the same lock',
    /renameCategoryColumn_/.test(rename) && rename.indexOf('renameIncomingCategory_') > rename.indexOf('withStockLock_'));

  const mover = extractFn('renameIncomingCategory_');
  check('it matches without caring about case, like every other rename here',
    /toUpperCase\(\)/.test(mover));
  check('...writes the column in ONE round trip, not a call per row',
    /setValues\(/.test(mover) && !/setValue\(/.test(mover));
  check('...and does nothing at all when there are no deliveries',
    /if \(last < 2\) return 0;/.test(mover));
}

{
  // The guard for every OTHER way a category can go missing: deleted from
  // Settings, imported, edited by hand in the sheet.
  const set = HTML.slice(HTML.indexOf('function _incSetCategory('),
                         HTML.indexOf('function _incQtyText('));
  check('the edit window matches the stored category case-insensitively',
    /toUpperCase\(\) === want\.toUpperCase\(\)/.test(set));
  check('...and when it is genuinely not on the list, adds it rather than dropping it',
    /createElement\('option'\)/.test(set));
  check('...labelled, because a category nobody can pick is worth knowing about',
    /not on your list/.test(set));
  check('opening a delivery goes through it instead of assigning .value blind',
    /_incSetCategory\(item\.category\)/.test(HTML) &&
    !/getElementById\('incCategory'\)\.value = item\.category/.test(HTML));
}

console.log('\nincoming: ' + (fail === 0 ? 'ok (' + ok + ' checks)' : fail + ' FAILED'));
process.exit(fail === 0 ? 0 : 1);
