// THE CONSENT CHECKBOX on the "👉 START HERE" sheet.
//
// This is the one surface in the whole product whose only job is to record
// that a person agreed to something. Jose found it recording the opposite:
// untick the box and "Accepted 8/24/2026, 2:30:03 PM" stayed on the sheet,
// along with the "Now open the Acopio menu" line — a page claiming consent
// that had just been visibly withdrawn, sitting there until the customer came
// back.
//
// The cause was onEdit returning early on anything that was not TRUE, so the
// un-tick was simply never handled. Easy to write and easy to miss, because
// the happy path looks perfect.
//
// onEdit is a SIMPLE trigger: no authorization, no Session, no dialogs. That
// constraint is why it can only write to cells in the first place, and it is
// why this test can run the real function in a Node vm against a fake sheet —
// there is nothing else for it to touch.
//
// Usage:  node tools/test-terms-checkbox.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const A  = require(require('path').join(__dirname, 'andamio.js'));
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

function pick(re) { const m = re.exec(GS); return m ? m[0] : ''; }

// A sheet that remembers what each cell holds and what was done to it, so the
// test can assert the stamp is GONE rather than merely overwritten.
function build(basica) {
  const cells = {};
  function cell(a1) {
    if (!cells[a1]) cells[a1] = { value: '', weight: null, color: null, cleared: 0 };
    const c = cells[a1];
    return {
      setValue(v) { c.value = v; return this; },
      getValue()  { return c.value; },
      clearContent() { c.value = ''; c.cleared++; return this; },
      setFontWeight(w) { c.weight = w; return this; },
      setFontColor(x)  { c.color = x; return this; }
    };
  }
  const sandbox = {
    console,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ toast: () => {} }) },
    PRODUCT_NAME: 'Acopio',
    _cells: cells,
    _sheet: {
      getName: () => '👉 START HERE',
      getRange: a1 => cell(a1)
    }
  };
  vm.createContext(sandbox);
  vm.runInContext([
    pick(/var START_HERE_SHEET = '[^']*';/),
    pick(/var TERMS_CHECKBOX_CELL = '[^']*';/),
    pick(/var TERMS_LABEL_CELL\s*= '[^']*';/),
    pick(/var TERMS_STAMP_CELL\s*= '[^']*';/),
    pick(/var TERMS_NEXT_CELL\s*= '[^']*';/),
    pick(/var TERMS_PROMPT = '[^']*';/),
    pick(/var SH_NAVY = [^\n]*;/),
    /* MIGRADO AL ANDAMIO EN LA v12.88, y fue la DECIMA mordida del mismo
     * patron. `onEdit` gano una rama para la edicion gratis —la hoja mandaba a
     * un menu que esa edicion no puede tener— y con ella una llamada a
     * `basicApagado_`. Esta caja no la tenia, asi que el `try/catch` que impide
     * que un disparador simple le ensene un error al cliente se trago la
     * excepcion: la prueba no dio «no esta definida», dio una celda vacia.
     *
     * Y se colaba por una CUARTA forma que el guardia no veia: ni lista con
     * forEach, ni `${...}` en plantilla, ni variable corrida despues, sino un
     * `extractFn` suelto DENTRO del propio `runInContext`. Ya esta vigilada en
     * test-andamio. */
    A.levantar(GS, ['onEdit']),
    /* Y LA EDICION, DESPUES del codigo levantado: el andamio declara
     * `ACOPIO_BASIC = false` delante, y una asignacion posterior la pisa. Es
     * como se mide la gratis sin tocar el producto. */
    basica ? 'ACOPIO_BASIC = true;' : ''
  ].join('\n'), sandbox);
  return sandbox;
}

function edit(sandbox, a1, value) {
  sandbox.onEdit({
    range: {
      getSheet: () => sandbox._sheet,
      getA1Notation: () => a1,
      getValue: () => value
    }
  });
}

const S = build();
const STAMP = S.TERMS_STAMP_CELL, NEXT = S.TERMS_NEXT_CELL, BOX = S.TERMS_CHECKBOX_CELL;

console.log('\n═══ ticking records the acceptance ═══\n');

edit(S, BOX, true);
check('ticking stamps a date and time',
  /^Accepted /.test(S._cells[STAMP].value));
check('...and writes the next step, in bold so it reads as an instruction',
  /Set Up Acopio/.test(S._cells[NEXT].value) && S._cells[NEXT].weight === 'bold');

console.log('\n═══ UN-ticking has to undo it — the bug Jose found ═══\n');

edit(S, BOX, false);
check('the acceptance stamp is CLEARED, not left behind claiming a consent that was withdrawn',
  S._cells[STAMP].value === '' && S._cells[STAMP].cleared >= 1);
check('...the "now open the menu" instruction goes with it, since nothing was accepted',
  !/Set Up Acopio/.test(S._cells[NEXT].value));
check('...and the grey prompt comes back rather than an empty panel — the person who just unticked is the one who needs that sentence',
  S._cells[NEXT].value === S.TERMS_PROMPT);
check('...styled back to grey, not left bold and amber from the accepted state',
  S._cells[NEXT].weight === 'normal' && S._cells[NEXT].color !== '#B45309');

console.log('\n═══ and it stays correct when toggled ═══\n');

edit(S, BOX, true);
check('re-ticking stamps a fresh acceptance', /^Accepted /.test(S._cells[STAMP].value));
edit(S, BOX, false);
check('...and un-ticking clears it again', S._cells[STAMP].value === '');

console.log('\n═══ it must ignore everything else on the sheet ═══\n');

{
  const T = build();
  edit(T, T.TERMS_CHECKBOX_CELL, true);
  const before = T._cells[T.TERMS_STAMP_CELL].value;
  edit(T, 'C7', 'somebody typed in the welcome text');
  check('an edit to any other cell leaves the acceptance alone',
    T._cells[T.TERMS_STAMP_CELL].value === before);
}

{
  const T = build();
  T._sheet.getName = () => 'MASTER_ARCHIVE_V3';
  edit(T, T.TERMS_CHECKBOX_CELL, true);
  check('an edit at the same address on ANOTHER sheet does nothing — B14 exists on every tab',
    !T._cells[T.TERMS_STAMP_CELL] || T._cells[T.TERMS_STAMP_CELL].value === '');
}

{
  // A simple trigger that throws puts a red error marker on the user's sheet.
  const T = build();
  let threw = null;
  try { T.onEdit(null); T.onEdit({}); T.onEdit({ range: null }); } catch (e) { threw = e.message; }
  check('a malformed event never throws — a simple trigger must not surface an error onto the sheet',
    threw === null);
}

console.log('\n\u2550\u2550\u2550 la gratis no puede mandar a un menu que no tiene \u2550\u2550\u2550\n');

/* Jose, 21/10, con una captura de la hoja de la version gratis: *"sale que debo
 * ir al menu Acopio pero el menu Acopio no aparece"*.
 *
 * Y no es que no aparezca: NO PUEDE aparecer. Un menu en la hoja necesita
 * `script.container.ui`, un permiso SENSIBLE que esa edicion no pide a
 * proposito, porque pedirlo trae justo la pantalla de aviso de Google que la
 * gratis existe para evitar. `onOpen` ya se callaba por eso; esta frase no. */
{
  const B = build(true);
  edit(B, B.TERMS_CHECKBOX_CELL, true);
  const texto = String(B._cells[B.TERMS_NEXT_CELL].value || '');

  check('en la gratis tambien se sella la aceptacion \u2014 los terminos se aceptan ' +
        'igual en las dos ediciones',
    /^Accepted /.test(String(B._cells[B.TERMS_STAMP_CELL].value || '')));
  check('pero el paso siguiente NO manda al menu', !/menu at the top/.test(texto));
  check('...ni a un "Set Up" que en esa edicion no existe \u2014 el asistente crea ' +
        'carpetas en Drive y registra usuarios, las dos cosas que no tiene',
    !/Set Up/.test(texto));
  check('dice EN VOZ ALTA que aqui no hay menu, que es la frase que le faltaba ' +
        'a Jose delante', /no menu/i.test(texto));
  check('...manda a desplegar la app, que es el paso siguiente de verdad',
    /[Dd]eploy/.test(texto));
  check('...y dice donde se pone el nombre de la empresa, porque ahi no hay ' +
        'asistente que lo pregunte', texto.indexOf('Name & Logo') !== -1);

  /* Y LA DE PAGO NO SE TOCA. Media seccion comprueba que la gratis NO dice algo;
   * sin esto, borrar la frase de las dos ediciones pasaria igual de verde. */
  const P = build(false);
  edit(P, P.TERMS_CHECKBOX_CELL, true);
  check('y la de pago sigue mandando a su menu, que ahi SI existe',
    /menu at the top/.test(String(P._cells[P.TERMS_NEXT_CELL].value || '')));
}

console.log('\nterms-checkbox: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
