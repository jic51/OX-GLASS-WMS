// C-01, C-02 y D-01 · QUE EL DINERO NO SE DESVÍE, Y QUE LO IMPOSIBLE SE DIGA.
//
// Salen de la revisión del 10/11 (`docs/REVISION-10-11.md`). Las tres son de la
// misma familia: **la app sabía algo y no lo decía, o lo decía mal.**
//
//   C-01  la media de coste se redondeaba a céntimos en cada paso, y ese valor
//         redondeado entraba en el cálculo siguiente. Medido: −$202,72 sobre
//         7.000 unidades tras 1.000 entradas. Nadie lo nota hasta que alguien
//         cuadra el inventario con la contabilidad.
//   C-02  un inventario imposible —más salidas que entradas— se tapaba con un
//         cero, y la prueba se mandaba a `Logger.log`, que nadie abre.
//   D-01  la media se pisaba en cada entrada sin dejar rastro: si salía rara,
//         sólo se podía recalcular desde cero.
//
// Uso:  node tools/test-el-dinero-no-se-desvia.js

const fs   = require('fs');
const path = require('path');
const A    = require('./andamio.js');

const RAIZ = path.join(__dirname, '..');
const GS   = fs.readFileSync(path.join(RAIZ, 'Code_v3_fixed.gs'), 'utf8');

let ok = 0;
const fallos = [];
function check(etiqueta, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + etiqueta); return; }
  fallos.push(etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
  console.log('  ✗    ' + etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
}

console.log('\n═══ 1 · C-01 · LA MEDIA DE COSTE NO SE DESVÍA ═══\n');

const R = A.montar({ Math, Number }, GS, ['round2_', 'round6_']);

check('`round2_` sigue existiendo: el dinero que se estampa va en céntimos',
  R.round2_(3.968960) === 3.97, R.round2_(3.968960));
check('y `round6_` guarda seis decimales, que es lo que se vuelve a usar',
  R.round6_(3.9689601234) === 3.96896, R.round6_(3.9689601234));

/* ── LA SIMULACIÓN, QUE ES LO QUE ENCONTRÓ EL FALLO ────────────────────────
 *
 * Mil entradas de 7 unidades a precios que no caen en céntimos exactos. Con
 * `round2_` en cada paso el error se acumula SIEMPRE EN LA MISMA DIRECCIÓN,
 * que es lo que lo hace peligroso: no se compensa solo. */
function simular(redondea) {
  let avg = 0, wh = 0, num = 0, den = 0;
  for (let i = 0; i < 1000; i++) {
    const qty = 7, cost = R.round2_(3 + (i % 97) / 97 * 2);
    avg = wh <= 0 ? cost : redondea((wh * avg + qty * cost) / (wh + qty));
    wh += qty; num += qty * cost; den += qty;
  }
  return { avg, exacta: num / den, unidades: wh };
}

const conCentimos = simular(R.round2_);
const conSeis     = simular(R.round6_);

const desvioViejo = Math.abs((conCentimos.avg - conCentimos.exacta) * conCentimos.unidades);
const desvioNuevo = Math.abs((conSeis.avg     - conSeis.exacta)     * conSeis.unidades);

check('redondear a céntimos en cada paso desvía de verdad — ' +
      '$' + desvioViejo.toFixed(2) + ' sobre ' + conCentimos.unidades + ' unidades',
  desvioViejo > 100, desvioViejo);
check('...y con seis decimales el desvío desaparece — $' + desvioNuevo.toFixed(2),
  desvioNuevo < 1, desvioNuevo);
check('...o sea unas ' + Math.round(desvioViejo / Math.max(desvioNuevo, 0.001)) +
      ' veces menos error', desvioNuevo * 100 < desvioViejo);

/* Y QUE EL PRODUCTO LO USE ASÍ. Lo de arriba demuestra que seis decimales
 * arreglan el problema; esto comprueba que es lo que el código hace. */
const lote = A.sinComentarios(A.fnSrc(GS, 'addMovementsBatch_'));
check('la media se guarda con `round6_`, no con `round2_`',
  /var newAvg = [\s\S]{0,120}round6_\(/.test(lote),
  (lote.match(/var newAvg[\s\S]{0,160}/) || [''])[0]);
check('...y NO queda ningún `round2_` dentro del cálculo de la media',
  !/newAvg = [\s\S]{0,120}round2_\(/.test(lote));

/* EL TOTAL SALE DE LA MEDIA PRECISA, no del unitario ya redondeado. Si se
 * redondeara antes de multiplicar, mil unidades a 3,9689 se estamparían como
 * 3,97 × 1000 = 3.970 en vez de 3.968,96 — nueve dólares de más en una sola
 * fila, y siempre hacia arriba. */
check('el total de una salida se calcula con la media precisa',
  /totalCost = round2_\(avgCostMap\[matId\]\.avg \* qty\)/.test(lote),
  (lote.match(/totalCost = round2_\([^;]*/) || [''])[0]);
check('...y el unitario se enseña en céntimos, que es lo que lee una persona',
  /unitCost  = round2_\(avgCostMap\[matId\]\.avg\)/.test(lote));
{
  // La diferencia, en números: 1.000 unidades a una media de 3,968960
  const avg = 3.968960, qty = 1000;
  const bien = R.round2_(avg * qty);
  const mal  = R.round2_(R.round2_(avg) * qty);
  check('redondear antes de multiplicar costaría $' + (mal - bien).toFixed(2) +
        ' en una sola fila de 1.000 unidades', mal > bien, { bien, mal });
}

/* Y la media se escribe en la hoja TAL CUAL, sin volver a redondear por el
 * camino — si `saveAvgCostUpdates_` la redondeara, lo de arriba no serviría
 * de nada. */
const guarda = A.sinComentarios(A.fnSrc(GS, 'saveAvgCostUpdates_'));
check('y se guarda sin volver a redondearla al escribirla',
  !/round2_/.test(guarda), guarda.match(/round\d_[^;]*/g));

console.log('\n═══ 2 · C-02 · UN INVENTARIO IMPOSIBLE SE DICE ═══\n');

/* Más salidas que entradas no pasa por casualidad: pasa cuando un movimiento
 * se metió mal, un borrado se quedó a medias o una importación entró dos
 * veces. O sea que es justo la señal de que algo se rompió. */
const F = A.montar(
  { Object, Math, Number, String, Logger: { log(){} } },
  GS, ['applyReservationsAndFinalize_'],
  { dobles: ['reservedQtyFromRacks_'] });
F.reservedQtyFromRacks_ = () => 0;

function materia(nombre, wh, site, wasted) {
  return { name: nombre, warehouseQty: wh, siteQty: site, wastedQty: wasted || 0,
           warehouseLocs: {}, _errors: [] };
}

{
  const stock = {
    'A': materia('HARINA', 10, 0),
    'B': materia('ACEITE', -14, 0),       // imposible: salió más de lo que entró
    'C': materia('AZUCAR', 5, -3),        // imposible en la obra
    'D': materia('LEVADURA', 2, 0, -1)    // imposible en lo desperdiciado
  };
  const imposibles = F.applyReservationsAndFinalize_(stock, {});

  check('la función devuelve lo que no puede ser cierto',
    Array.isArray(imposibles) && imposibles.length === 3,
    imposibles && imposibles.map(x => x.nombre));
  check('...y nombra cada material',
    imposibles.map(x => x.nombre).sort().join(',') === 'ACEITE,AZUCAR,LEVADURA',
    imposibles.map(x => x.nombre));
  check('...y dice qué número era imposible, para poder buscarlo',
    /NEG_TOTAL_WAREHOUSE=-14/.test(JSON.stringify(imposibles)), imposibles);

  /* EL CERO SE QUEDA. Enseñar «-14 en el estante» no ayuda a nadie: lo que
   * hace falta es que el número raro no se enseñe Y que alguien se entere. */
  check('el cero se sigue enseñando, que es lo correcto en pantalla',
    stock.B.warehouseQty === 0 && stock.C.siteQty === 0 && stock.D.wastedQty === 0,
    { b: stock.B.warehouseQty, c: stock.C.siteQty, d: stock.D.wastedQty });
  check('y el material sano no sale en la lista',
    !imposibles.some(x => x.nombre === 'HARINA'));
}

{
  /* Lo normal es que no haya nada, y entonces no hay que decir nada. */
  const stock = { 'A': materia('HARINA', 10, 3) };
  const imposibles = F.applyReservationsAndFinalize_(stock, {});
  check('un almacén sano no produce ningún aviso', imposibles.length === 0, imposibles);
}

/* ── Y QUE SE DIGA DONDE ALGUIEN MIRA ─────────────────────────────────────
 * `Logger.log` es el registro de ejecuciones de Apps Script: nadie lo abre, y
 * menos un cliente, que según la regla de este proyecto no debe ir al Sheet
 * jamás. Tiene que ir al ERROR_LOG, que se ve en Ajustes. */
const avisa = A.sinComentarios(A.fnSrc(GS, 'avisarDeStockImposible_'));
check('existe quien lo lleva al registro que se ve en Ajustes', !!avisa);
check('...y escribe en ERROR_LOG, no sólo en el log de ejecuciones',
  /logError_\(/.test(avisa));
check('...diciendo que la pantalla enseña 0 y el número real se desconoce',
  /shows 0 for these/.test(avisa));
check('...y nombrando los materiales, no sólo cuántos',
  /x\.nombre/.test(avisa));

/* UNA VEZ AL DÍA. Esto corre en CADA inicio de sesión: cinco personas
 * abriendo cuatro veces al día serían veinte filas idénticas. Un registro que
 * se repite es un registro que se deja de leer — y hay precedente: el desastre
 * del 26 de septiembre estuvo catorce horas escrito en ERROR_LOG sin que nadie
 * lo viera. */
check('no se repite el mismo aviso el mismo día',
  /STOCK_IMPOSIBLE_VISTO/.test(avisa) && /if \(props\.getProperty\([\s\S]{0,60}=== marca\) return;/.test(avisa),
  avisa.slice(0, 400));
check('...pero la marca incluye QUÉ materiales, así que si cambia se vuelve a decir',
  /huella/.test(avisa));
check('y es WARN, no ERROR: no manda un correo de madrugada por esto',
  /'WARN'/.test(avisa) && !/'ERROR'/.test(avisa));

const inicio = A.sinComentarios(A.fnSrc(GS, 'getInitialData'));
check('y el inicio de sesión lo llama', /avisarDeStockImposible_\(/.test(inicio));
check('...dentro de un try, porque un aviso no puede tumbar el arranque',
  /try \{ avisarDeStockImposible_/.test(inicio));

/* Los dos caminos del inventario —hojas derivadas y barrido completo— tienen
 * que dar la misma respuesta. Si sólo uno avisara, el aviso dependería de si
 * las derivadas estaban al día, que es casualidad. */
const calc = A.sinComentarios(A.fnSrc(GS, 'calculateStock'));
check('el barrido completo también devuelve lo imposible',
  /__imposibles/.test(calc) && /applyReservationsAndFinalize_/.test(calc));
check('...y lo cuelga sin que aparezca al recorrer los materiales',
  /enumerable: false/.test(calc));

console.log('\n═══ 3 · D-01 · LA MEDIA DEJA RASTRO ═══\n');

check('se apunta de cuánto a cuánto cambió la media',
  /AVG_COST_BLEND/.test(lote), (lote.match(/AVG_COST_BLEND[^;]{0,120}/) || [''])[0]);
check('...con el valor ANTERIOR, que es la mitad que faltaba',
  /costAntes\[matId\] = \{ antes:/.test(lote));
check('...y se dice «(none)» cuando es el primer precio que tiene ese material',
  /'\(none\)'/.test(lote));
/* DESPUÉS de verificar la escritura, nunca antes: apuntar una mezcla de
 * costes de un movimiento que no llegó a guardarse sería peor que no apuntar
 * nada. */
check('se escribe DESPUÉS de guardar los costes, no antes',
  lote.indexOf('saveAvgCostUpdates_(ss, costTouched') < lote.indexOf('AVG_COST_BLEND'));
check('...y en su propio try: un fallo de auditoría no tumba un guardado hecho',
  /try \{[\s\S]{0,400}AVG_COST_BLEND[\s\S]{0,400}catch \(ca\)/.test(lote));

if (fallos.length) {
  console.error('\nFALLÓ:\n  ' + fallos.join('\n  ') + '\n');
  console.error('  Un desvío de céntimos que se acumula no se nota hasta que\n' +
                '  alguien cuadra el inventario con la contabilidad. Y un\n' +
                '  inventario imposible que se tapa con un cero es la app\n' +
                '  diciendo que todo va bien cuando sabe que no.\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
