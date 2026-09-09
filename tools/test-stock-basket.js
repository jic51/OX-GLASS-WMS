// LA CESTA DEL DASHBOARD NO PUEDE GUARDAR UNA FOTO VIEJA.
//
// Jose preguntó el 2026-09-09 por qué las casillas de Movements se limpian al
// cambiar de pestaña y las del Dashboard no, y si había alguna razón.
//
// SÍ LA HAY, y no es la misma cosa:
//
//   Las de Movements arman Edit y Delete. Una marca que sobrevive es un botón
//   de borrar apuntando a filas en las que ya nadie está pensando.
//
//   Las del Dashboard son una CESTA que se va llenando para "Exit Selected".
//   Vaciarla al salir de la pantalla sería perder el trabajo de alguien que fue
//   a mirar el mapa antes de sacar el material. Y ya hubo un fallo por
//   limpiarla de más: al cambiar EXIT → TRANSFER se perdían los otros cuatro
//   materiales, de un formulario sin guardar.
//
// PERO AL MIRARLO APARECIÓ ALGO PEOR QUE LA PREGUNTA:
//
//   _stockSelection guardaba { matId: stockData[matId] } — una COPIA de la fila
//   del momento en que se marcó. Y stockData se reemplaza ENTERO en cada carga
//   (`stockData = data.stock || {}`), así que la cesta se quedaba con objetos
//   huérfanos de una foto vieja.
//
//   Alguien marca cinco materiales, otra persona guarda una salida, y "Exit
//   Selected" abre el formulario CON LAS CANTIDADES DE ANTES. La cesta se veía
//   igual de bien y ya no era verdad.
//
// LO QUE ESTE ARCHIVO PROTEGE:
//
//   1. Que la cesta guarde NOMBRES, no filas.
//   2. Que lo que sale de ella sean las filas de AHORA.
//   3. Que un material que dejó de existir —fusionado, renombrado, agotado— se
//      caiga de la cesta solo, en vez de viajar con datos de un pasado.
//   4. Que el contador diga lo que de verdad queda.
//   5. Que la cesta SÍ sobreviva a cambiar de pestaña — es lo que la distingue
//      de las casillas de Movements, y es a propósito.
//
// Uso:  node tools/test-stock-basket.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

function fnSrc(name){
  const start = HTML.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('no encontrada: ' + name);
  let depth = 0;
  for (let j = HTML.indexOf('{', start); j < HTML.length; j++) {
    if (HTML[j] === '{') depth++;
    else if (HTML[j] === '}') { depth--; if (depth === 0) return HTML.slice(start, j + 1); }
  }
  throw new Error('sin cerrar: ' + name);
}

function mundo(){
  const barra = { visible: false, texto: '' };
  const ctx = vm.createContext({
    Object, String, Number, Array, console,
    stockData: {},
    _stockSelection: {},
    document: {
      getElementById: (id) => id === 'stockSelectBar'
        ? { style: { set display(v){ barra.visible = (v !== 'none'); }, get display(){ return barra.visible ? 'flex' : 'none'; } } }
        : { set textContent(v){ barra.texto = v; }, get textContent(){ return barra.texto; } },
      querySelectorAll: () => []
    }
  });
  [ fnSrc('toggleStockSelect'), fnSrc('_selectedStockRows'),
    fnSrc('_updateStockSelectBar'), fnSrc('clearStockSelection'),
    fnSrc('_liveStockSelection')
  ].forEach(c => vm.runInContext(c, ctx));
  return {
    ctx, barra,
    run: (e) => vm.runInContext(e, ctx),
    marcar: (matId, checked) => {
      ctx.__cb = { getAttribute: () => matId, checked: checked !== false };
      vm.runInContext('toggleStockSelect(__cb)', ctx);
    }
  };
}

function fila(id, disponible){
  return { matId: id, name: id, category: 'WINDOW', availableQty: disponible,
           warehouseQty: disponible, siteQty: 0, unit: 'UNIT', warehouseLocs: { A1A: disponible } };
}

console.log('\n═══ la cesta guarda nombres, no fotos ═══\n');
{
  const m = mundo();
  m.ctx.stockData = { A: fila('A', 100), B: fila('B', 50) };
  m.marcar('A'); m.marcar('B');

  const guardado = JSON.parse(m.run('JSON.stringify(_stockSelection)'));
  check('lo guardado son nombres, no filas enteras',
        guardado.A === true && guardado.B === true, guardado);
  check('y salen dos filas', m.run('_selectedStockRows().length') === 2);
}

console.log('\n═══ otra persona guarda mientras la cesta está llena ═══\n');
{
  const m = mundo();
  m.ctx.stockData = { A: fila('A', 100) };
  m.marcar('A');
  check('de entrada, la cesta dice 100', m.run('_selectedStockRows()[0].availableQty') === 100);

  // Lo que hace loadDataFromGoogle: stockData ENTERO se reemplaza.
  m.ctx.stockData = { A: fila('A', 42) };

  check('TRAS LA RECARGA, LA CESTA DICE 42 — no las cantidades de cuando se ' +
        'marcó la casilla',
        m.run('_selectedStockRows()[0].availableQty') === 42,
        m.run('_selectedStockRows()[0].availableQty'));
  check('y es LA MISMA fila que el resto de la pantalla, no una copia',
        m.run('_selectedStockRows()[0] === stockData.A') === true);
}

console.log('\n═══ un material que dejó de existir ═══\n');
{
  const m = mundo();
  m.ctx.stockData = { A: fila('A', 10), B: fila('B', 20), C: fila('C', 30) };
  m.marcar('A'); m.marcar('B'); m.marcar('C');

  // B se fusionó con otro material y desapareció de stockData.
  m.ctx.stockData = { A: fila('A', 10), C: fila('C', 30) };

  const filas = m.run('_selectedStockRows().map(function(r){ return r.matId; }).join(",")');
  check('el que ya no existe no viaja', filas === 'A,C', filas);
  check('y se cae de la cesta solo, sin dejar rastro',
        m.run('JSON.stringify(Object.keys(_stockSelection))') === '["A","C"]',
        m.run('JSON.stringify(Object.keys(_stockSelection))'));
}

console.log('\n═══ el contador dice lo que queda ═══\n');
{
  const m = mundo();
  m.ctx.stockData = { A: fila('A', 10), B: fila('B', 20) };
  m.marcar('A'); m.marcar('B');
  m.run('_updateStockSelectBar()');
  check('con dos, dice dos', /2 materials selected/.test(m.barra.texto), m.barra.texto);

  m.ctx.stockData = { A: fila('A', 10) };
  m.run('_updateStockSelectBar()');
  check('desaparecido uno, dice uno — no dos', /1 material selected/.test(m.barra.texto), m.barra.texto);

  m.ctx.stockData = {};
  m.run('_updateStockSelectBar()');
  check('y sin ninguno, la barra se esconde', m.barra.visible === false);
}

console.log('\n═══ marcar y desmarcar ═══\n');
{
  const m = mundo();
  m.ctx.stockData = { A: fila('A', 10) };
  m.marcar('A');
  check('marcado', m.run('_selectedStockRows().length') === 1);
  m.marcar('A', false);
  check('desmarcado', m.run('_selectedStockRows().length') === 0);

  // Marcar algo que no está en stockData no debe meter basura en la cesta.
  m.marcar('FANTASMA');
  check('marcar un material que no existe no ensucia la cesta',
        m.run('Object.keys(_stockSelection).length') === 0);
}

console.log('\n═══ y la diferencia con Movements, que es a propósito ═══\n');
{
  // showTab limpia la selección de MOVEMENTS y NO la cesta del dashboard. No
  // es un olvido: una arma Delete, la otra es una cesta a medio llenar.
  const tab = fnSrc('showTab');
  check('cambiar de pestaña limpia las casillas de Movements',
        /_clearMovSelection\(\)/.test(tab));
  check('...y NO vacía la cesta del Dashboard — quien fue a mirar el mapa antes ' +
        'de sacar el material no puede perder lo que llevaba elegido',
        !/clearStockSelection\(\)/.test(tab));

  // Lo único que la vacía sigue siendo cerrar el formulario de movimiento y el
  // botón "Clear" que la persona pulsa a sabiendas.
  const veces = (HTML.match(/clearStockSelection\(\)/g) || []).length;
  check('la cesta se vacía en pocos sitios y todos deliberados (' + veces + ')',
        veces >= 2 && veces <= 4, veces);
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobacion(es) ok\n');
process.exit(fail ? 1 : 0);
