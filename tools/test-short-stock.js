// CUANDO OTRO SE LLEVÓ EL MATERIAL MIENTRAS TU VENTANA ESTABA ABIERTA.
//
// Jose, prueba con tres cuentas: dos personas sacan todo lo que hay en un
// estante a la vez. "aun le aparece un error a la segunda persona, no se
// actualiza la cantidad ni la ventana de exit se cierra, ni explica que paso y
// porque no se puede."
//
// LO CURIOSO ES QUE EL NÚMERO BUENO YA VIAJABA. El servidor lanzaba, literal,
// "INSUFFICIENT at C3B for 44 NORTH. Available there: 42" — con el 42 dentro.
// El navegador lo pintaba de rojo como texto y lo tiraba, así que el formulario
// seguía diciendo 92 mientras el error decía 42. No faltaba información:
// faltaba hacerle caso.
//
// LO QUE ESTE ARCHIVO PROTEGE, por orden de lo que se rompe más callado:
//
//   1. QUE SE CORRIJA stockData Y NO EL RÓTULO. Reescribir el "✓ 92 avail" de
//      la fila deja la foto perfecta y el total de abajo, el aviso al teclear y
//      todo lo demás siguen leyendo el 92 viejo. Arreglar el origen es la
//      diferencia entre parecer correcto y serlo — y una prueba que mirara el
//      rótulo aprobaría las dos.
//   2. Que la etiqueta vaya al FINAL del mensaje. Los dos archivos se despliegan
//      a mano y por separado; con la etiqueta delante, un Index viejo contra un
//      Code.gs nuevo enseñaría un churro de JSON en vez de una frase.
//   3. Que la ventana NO se cierre. Jose lo pidió al revés, y creo que
//      cerrarla sería peor: se perdería el destino, quién se lo lleva y los
//      comentarios, para volver a teclearlos y sacar las 42 que sí quedan.
//
// Se EJECUTA contra un DOM de mentira con el formulario de salida real. Leer el
// código no distingue "corrige el número" de "enseña otro texto".
//
// Uso:  node tools/test-short-stock.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const SRC  = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');
const GS   = fs.readFileSync(path.join(ROOT, 'Code_v3_fixed.gs'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

function fnSrc(src, name){
  const start = src.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('no encontrada: ' + name);
  let depth = 0;
  for (let j = src.indexOf('{', start); j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error('sin cerrar: ' + name);
}

// ── 1. Los dos lados usan la misma etiqueta, y va donde debe ────────────────
console.log('\n═══ el contrato entre servidor y navegador ═══\n');
{
  const g = /var SHORT_PREFIX = '([^']+)'/.exec(GS);
  const c = /var SHORT_PREFIX = '([^']+)'/.exec(SRC);
  check('los dos declaran la etiqueta en una constante', !!g && !!c);
  check('y es la misma en los dos (' + (g && g[1]) + ')', !!g && !!c && g[1] === c[1]);

  // LO IMPORTANTE: al final del mensaje, no al principio.
  const tag = fnSrc(GS, 'shortStockTag_');
  check('la etiqueta se construye con un espacio delante, para ir PEGADA AL ' +
        'FINAL de la frase humana y no delante — un Index de la versión ' +
        'anterior tiene que seguir enseñando una frase legible',
    /return ' ' \+ SHORT_PREFIX/.test(tag));
  check('...y las dos frases de "no hay suficiente" la llevan',
    (GS.match(/shortStockTag_\(/g) || []).length === 3);   // 1 definición + 2 usos
  check('la frase humana se conserva entera delante de la etiqueta',
    /INSUFFICIENT at ' \+ src \+ ' for ' \+ name[\s\S]{0,200}shortStockTag_/.test(GS));
  check('si JSON.stringify fallara, se devuelve cadena vacía y la frase humana ' +
        'sigue sirviendo — la etiqueta nunca puede empeorar el mensaje',
    /catch \(e\) \{ return ''; \}/.test(tag));

  // Y que siga clasificándose como aviso y no como avería: el mensaje empieza
  // por INSUFFICIENT, que está en la lista de rechazos esperados.
  check('el mensaje sigue empezando por INSUFFICIENT, así que se registra como ' +
        'WARN y no ensucia el registro de errores de verdad',
    /throw new Error\('INSUFFICIENT/.test(GS) &&
    /'INSUFFICIENT', 'LOCKED'/.test(GS));
}

// ── 2. El arreglo, ejecutado ────────────────────────────────────────────────
console.log('\n═══ el número se corrige donde todo lo demás lo lee ═══\n');

function escenario(op){
  // Una fila de salida de mentira, con los mismos nombres de clase que la real.
  // UN <input> DE VERDAD CONVIERTE A TEXTO AL ASIGNARLE UN NÚMERO: escribirle
  // 42 deja "42", no 42. La primera versión de este doble guardaba lo que le
  // dieran tal cual, así que la comprobación de la cantidad ajustada falló
  // contra un código correcto. Un doble que no se comporta como la cosa real
  // mide el doble, no el producto — la misma lección que la cascada de CSS
  // inyectada a medias.
  function campo(v){
    let _v = String(v);
    return { get value(){ return _v; }, set value(x){ _v = String(x); } };
  }
  function fila(rack, qty){
    const inputs = {
      '.el-rack': campo(rack),
      '.el-qty':  campo(qty),
      '.el-avail': { className: 'el-avail neutral', textContent: '—', dataset: {} }
    };
    return { querySelector: (sel) => inputs[sel] || null, _inputs: inputs };
  }
  const filas = op.filas.map(f => fila(f.rack, f.qty));
  const ctx = vm.createContext({
    console, JSON, String, Number,
    stockData: op.stockData,
    _avisos: [],
    _repintados: [],
    showToast: (m, k, d) => { ctx._avisos.push({ m, k }); },
    _normKey: (s) => String(s || '').toUpperCase().trim(),
    _qty: (v) => Number(v) || 0,
    syncExitRackAvail: (n) => { ctx._repintados.push('avail:' + n); },
    syncExitMatTotal:  (n) => { ctx._repintados.push('total:' + n); },
    renderAll: () => { ctx._repintados.push('renderAll'); },
    document: {
      querySelectorAll: (sel) => {
        if (sel === '.exit-loc-row') return filas;
        if (sel === '[id^="exit-locs-"]') return [{ id: 'exit-locs-1' }];
        return [];
      }
    }
  });
  vm.runInContext("var SHORT_PREFIX = 'SHORT_STOCK|';", ctx);
  vm.runInContext(fnSrc(SRC, '_shortStockInfo'), ctx);
  vm.runInContext(fnSrc(SRC, '_stripTags'), ctx);
  vm.runInContext(fnSrc(SRC, '_shortStockFix'), ctx);
  const manejado = vm.runInContext('_shortStockFix', ctx)(new Error(op.mensaje));
  return { manejado, ctx, filas, stockData: op.stockData };
}

const MSG = 'INSUFFICIENT at C3B for 44 NORTH. Available there: 42. Total ' +
  'available: 42 SHORT_STOCK|' + JSON.stringify({
    cat: 'SCREEN', name: '44 NORTH', rack: 'C3B', there: 42, total: 42, asked: 92 });

{
  const stock = { 'SCREEN|||44 NORTH': { warehouseLocs: { C3B: 92 }, availableQty: 92 } };
  const r = escenario({ mensaje: MSG, stockData: stock,
                        filas: [{ rack: 'C3B', qty: 92 }] });

  check('se reconoce el rechazo y se ocupa de él', r.manejado === true);
  check('EL STOCK CONOCIDO SE CORRIGE (92 → ' +
        stock['SCREEN|||44 NORTH'].warehouseLocs.C3B + ') — es el origen del ' +
        'que leen el rótulo, el total y el aviso al teclear; corregir sólo el ' +
        'rótulo dejaría los otros dos mintiendo',
    stock['SCREEN|||44 NORTH'].warehouseLocs.C3B === 42);
  check('...y el total del material también',
    stock['SCREEN|||44 NORTH'].availableQty === 42);
  check('la cantidad pedida baja a lo que de verdad hay (92 → ' +
        r.filas[0]._inputs['.el-qty'].value + ') — la ventana no puede quedarse ' +
        'con un número que ya no existe, que es lo que Jose fotografió',
    r.filas[0]._inputs['.el-qty'].value === '42');
  check('y se repinta el formulario desde el stock corregido, no a mano',
    r.ctx._repintados.indexOf('avail:1') !== -1 &&
    r.ctx._repintados.indexOf('total:1') !== -1);
  check('...incluido el tablero de detrás', r.ctx._repintados.indexOf('renderAll') !== -1);

  const aviso = (r.ctx._avisos[0] || {});
  check('SE EXPLICA QUÉ PASÓ, que era lo que faltaba del todo: "' +
        String(aviso.m).slice(0, 60) + '…"',
    /someone else took some/i.test(aviso.m || ''));
  check('...dice cuánto queda de verdad', /\b42\b/.test(aviso.m || ''));
  check('...y que la cantidad se ajustó sola, para que nadie la busque',
    /lowered to match/i.test(aviso.m || ''));
  check('...en amarillo y no en rojo: nadie hizo nada mal', aviso.k === 'warn');
}

console.log('\n═══ y si ya no queda nada ═══\n');
{
  const vacio = 'INSUFFICIENT at C3B for 44 NORTH. Available there: 0 SHORT_STOCK|' +
    JSON.stringify({ cat: 'SCREEN', name: '44 NORTH', rack: 'C3B',
                     there: 0, total: 0, asked: 50 });
  const stock = { 'SCREEN|||44 NORTH': { warehouseLocs: { C3B: 50 }, availableQty: 50 } };
  const r = escenario({ mensaje: vacio, stockData: stock,
                        filas: [{ rack: 'C3B', qty: 50 }] });
  check('el estante queda en 0', stock['SCREEN|||44 NORTH'].warehouseLocs.C3B === 0);
  check('la cantidad se vacía en vez de quedarse en 0 — un 0 escrito parece un ' +
        'dato, y un campo vacío parece lo que es',
    r.filas[0]._inputs['.el-qty'].value === '');
  check('y se dice que no queda nada y que no se guardó nada',
    /nothing left/i.test((r.ctx._avisos[0] || {}).m || '') &&
    /nothing was saved/i.test((r.ctx._avisos[0] || {}).m || ''));
}

console.log('\n═══ sólo se toca la fila del estante que falló ═══\n');
{
  const stock = { 'SCREEN|||44 NORTH': { warehouseLocs: { C3B: 92, A1A: 30 }, availableQty: 122 } };
  const r = escenario({ mensaje: MSG, stockData: stock,
                        filas: [{ rack: 'A1A', qty: 30 }, { rack: 'C3B', qty: 92 }] });
  check('la fila del otro estante se queda como estaba (A1A sigue en ' +
        r.filas[0]._inputs['.el-qty'].value + ') — el rechazo era de C3B, y ' +
        'tocar lo demás sería inventar',
    r.filas[0]._inputs['.el-qty'].value === '30');
  check('y la que falló sí se ajusta', r.filas[1]._inputs['.el-qty'].value === '42');
}

console.log('\n═══ un error que NO es éste pasa de largo ═══\n');
{
  const r = escenario({ mensaje: 'Error: something else broke',
                        stockData: {}, filas: [] });
  check('devuelve false, para que quien llama enseñe su propio error',
    r.manejado === false);
  check('...sin avisar por su cuenta', r.ctx._avisos.length === 0);
}

console.log('\n═══ y el texto que ve una persona no lleva etiquetas ═══\n');
{
  const ctx = vm.createContext({ String });
  vm.runInContext("var SHORT_PREFIX = 'SHORT_STOCK|';", ctx);
  vm.runInContext(fnSrc(SRC, '_stripTags'), ctx);
  const limpio = vm.runInContext('_stripTags', ctx)(new Error(MSG));
  check('se corta la etiqueta ("' + limpio.slice(-30) + '")',
    limpio.indexOf('SHORT_STOCK') === -1);
  check('...y se conserva la frase entera, que es la que se lee',
    /INSUFFICIENT at C3B for 44 NORTH/.test(limpio));
  const busy = vm.runInContext('_stripTags', ctx)(
    new Error('Error: SYSTEM_BUSY|System busy — another save is in progress.'));
  check('también limpia la del sistema ocupado, y el "Error:" de Apps Script ("' +
        busy.slice(0, 30) + '…")',
    busy.indexOf('SYSTEM_BUSY') === -1 && busy.indexOf('Error:') === -1);
}

// ── 3. Los caminos que pueden recibirlo ─────────────────────────────────────
console.log('\n═══ los caminos que pueden quedarse cortos ═══\n');
{
  [['salidas (el de la prueba de Jose)', 'submitMultiExit'],
   ['movimiento suelto: exit, transfer y waste', 'submitMovement']
  ].forEach(([que, fn]) => {
    check(que + ': corrige el número en vez de enseñar el error crudo',
      /_shortStockFix\(err\)/.test(fnSrc(SRC, fn)));
  });
  // Y el de ENTRADAS no, porque una entrada AÑADE material: no puede quedarse
  // corta. Meterlo ahí sería código que no se ejecuta nunca.
  check('el de entradas NO lo lleva — una entrada añade material y no puede ' +
        'quedarse corta; ponerlo ahí sería código muerto',
    !/_shortStockFix\(err\)/.test(fnSrc(SRC, 'submitMultiEntry')));
}

console.log('\n' + '─'.repeat(72));
console.log('El número correcto llevaba meses viajando dentro del mensaje de');
console.log('error. La app lo pintaba de rojo y lo tiraba. Casi todo esto es');
console.log('hacerle caso a algo que el servidor ya decía.');
console.log('─'.repeat(72));

console.log('\nshort stock: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
