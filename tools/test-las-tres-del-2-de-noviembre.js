// LO QUE JOSE PIDIÓ EL 2/11, FIJADO.
//
// Tres encargos, siete arreglos. Esta prueba no los describe: los comprueba.
//
//   1 · Básico: devolver «Check my data», que lo escondido se lleve su
//       recuadro, y que una sección con candado no llame al servidor.
//   2 · El tope de 200 al borrar, DICHO ANTES de borrar.
//   3 · La papelera que no salta, la casilla que no se desmarca sola, y las
//       cabeceras que explican qué son.
//
// Uso:  node tools/test-las-tres-del-2-de-noviembre.js

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const RAIZ = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(RAIZ, 'Index_v3_fixed.html'), 'utf8');

let ok = 0;
const fallos = [];
function check(etiqueta, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + etiqueta); return; }
  fallos.push(etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
  console.log('  ✗    ' + etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
}

function fnSrc(src, nombre) {
  const ini = src.indexOf('function ' + nombre + '(');
  if (ini === -1) return '';
  let prof = 0;
  for (let j = src.indexOf('{', ini); j < src.length; j++) {
    if (src[j] === '{') prof++;
    else if (src[j] === '}') { prof--; if (prof === 0) return src.slice(ini, j + 1); }
  }
  return '';
}
function lista(nombre) {
  const m = HTML.match(new RegExp('var ' + nombre + '\\s*=\\s*\\[[\\s\\S]*?\\n\\];'));
  return m ? [...m[0].matchAll(/key\s*:\s*'([^']+)'/g)].map(x => x[1]) : null;
}
function mapa(nombre) {
  const m = HTML.match(new RegExp('var ' + nombre + '\\s*=\\s*\\{[\\s\\S]*?\\n\\};'));
  return m ? [...m[0].matchAll(/^\s*(\w+)\s*:/gm)].map(x => x[1]) : null;
}

console.log('\n═══ 1 · BÁSICO ═══\n');

const fuera = (HTML.match(/botones:\s*\[([^\]]*)\]/) || [])[1] || '';
check('«Check my data» vuelve a la edición gratis',
  fuera.indexOf('btnDataCheck') === -1, fuera.trim());
check('...y reconstruir totales también', fuera.indexOf('btnRebuildStock') === -1);
check('...y rellenar los ids también', fuera.indexOf('btnMovIdFill') === -1);

/* El que SÍ se queda, y por un motivo distinto del original: no puede
 * funcionar. Mandar un correo necesita un permiso que esta edición no pide. */
check('«Report a problem» se queda fuera — sin correo no puede funcionar',
  fuera.indexOf('btnReportIssue') !== -1, fuera.trim());

const pintar = fnSrc(HTML, '_basicPintar');
check('lo que se esconde se lleva su recuadro',
  /closest\s*\(\s*['"]\.field['"]\s*\)/.test(pintar), pintar.slice(0, 300));
check('...y un botón suelto se sigue escondiendo solo',
  /\|\|\s*el\s*;/.test(pintar) || /\)\s*\|\|\s*el/.test(pintar));

check('hay UNA regla de si una sección está con candado',
  /function _sysSeccionBloqueada/.test(HTML));
['sysRespaldo', 'sysReporte', 'sysLector'].forEach(function (id) {
  check('la sección con candado «' + id + '» no llama al servidor',
    new RegExp("_sysCargarSiAbierta\\('" + id + "'").test(HTML));
});
/* Y la otra mitad: las abiertas SIGUEN cargando. La regla es por sección, no
 * «apagar todo en Básico» — si esto fallara habríamos apagado la papelera y el
 * espacio usado, que son lo poco que la gratis tiene ahí. */
['_loadSpaceUsage', '_loadMovIdStatus', '_loadTrash'].forEach(function (f) {
  check(f + ' sigue cargando siempre',
    new RegExp('(?<!Abierta\\([^)]{0,40})\\n\\s*' + f + '\\(\\);').test(HTML));
});

console.log('\n═══ 2 · EL TOPE DE 200 ═══\n');

check('hay un tope y vale 200', /var TOPE_BORRADO_A_LA_VEZ\s*=\s*200\s*;/.test(HTML));

const borrar = fnSrc(HTML, 'deleteSelectedMovements');
check('se recorta la selección antes de preguntar',
  /sel\.slice\(0,\s*TOPE_BORRADO_A_LA_VEZ\)/.test(borrar));
check('el aviso dice cuántos marcaste y cuántos van',
  /You ticked/.test(borrar) && /is the most that can go at once/.test(borrar));
check('...y POR QUÉ ese número: es lo que la papelera puede enseñar',
  /the most the trash can show you/.test(borrar));
check('...y dice que los demás siguen marcados',
  /stay ticked/.test(borrar));
check('...y manda a deshacer la importación cuando venían de un fichero',
  /Undo this import/.test(borrar) && /no limit/.test(borrar));

/* Que el título cambie también: un aviso que dice «Delete 340 movements?» y
 * borra 200 es exactamente el muro invisible que esto viene a quitar. */
check('el título no promete más de los que va a borrar',
  /Delete the first ' \+ n \+ ' of ' \+ marcados/.test(borrar), borrar.slice(0, 400));

console.log('\n═══ 3 · LAS TRES PEQUEÑAS ═══\n');

const paint = fnSrc(HTML, '_paintTrash');
check('la papelera apunta por dónde iba antes de repintar',
  /scrollTop/.test(paint) && /trashScroll/.test(paint));
check('...y se lo devuelve después de escribir',
  /nueva\.scrollTop = altura/.test(paint));
check('la caja que se desplaza tiene id', /id="trashScroll"/.test(HTML));

const render = fnSrc(HTML, 'renderMovements');
/* ── EL PRIMER INTENTO ESTABA MAL, Y LA SUITE LO DIJO ───────────────────────
 *
 * Primero poda contra el filtro en vez de contra lo pintado. Y
 * `test-seleccion-viva` —que nació de un vídeo de septiembre— lo tumbó en el
 * acto, con razón: la regla **«lo que no está pintado no está seleccionado»**
 * protege de lo peor, que es Borrar armado sobre filas que nadie ve. *"Marcar
 * ocho, ver cero casillas, y que borrar se lleve ocho es peor que perder la
 * selección: la selección perdida se nota, ésta no."*
 *
 * El fallo de Jose era otro, más estrecho: **las filas nuevas empujan**. La
 * ventana mide un número fijo de filas, así que cada movimiento que llega por
 * arriba tira uno por abajo — y si estaba marcado, la poda lo borraba.
 *
 * Así que la poda se queda como estaba y lo que se ensancha es la ventana,
 * **sólo cuando la lista ha crecido**. Plegar no alarga nada, así que plegar
 * sigue desmarcando. */
check('la poda sigue siendo «lo que no está pintado no está seleccionado»',
  /mov-select-cb/.test(render) && /pintadas/.test(render));
check('nada marcado se cae de la ventana cuando llegan filas nuevas',
  /_movSelection\[mid\]/.test(render) && /pageEnd = ultimoMarcado \+ 1/.test(render));
check('...y sólo cuando la lista ha CRECIDO, que es lo que distingue ' +
      'llegar filas nuevas de plegar la tabla',
  /total > _movTotalAnterior/.test(render));
check('...y se recuerda el tamaño para la próxima vez',
  /_movTotalAnterior = total/.test(render));

console.log('\n  — las cabeceras —\n');

[['STOCK_COLS', 'STOCK_COL_TIPS'], ['MOV_COLS', 'MOV_COL_TIPS']].forEach(function (par) {
  const cols = lista(par[0]), tips = mapa(par[1]);
  check(par[0] + ': se encontró la lista y sus textos', !!cols && !!tips);
  if (!cols || !tips) return;
  const sin = cols.filter(function (k) { return tips.indexOf(k) === -1; });
  check(par[0] + ': las ' + cols.length + ' columnas explican qué son',
    sin.length === 0, sin);
  /* El guardia del guardia: si el regex dejara de encontrar columnas, no
   * habría ninguna sin texto y esto se pondría verde sin mirar nada. */
  check(par[0] + ': hay columnas que mirar (' + cols.length + ')', cols.length >= 5);
});

/* Y que no sobren: un texto para una columna que ya no existe no rompe nada,
 * pero es una lista que dejó de coincidir con la otra — que es exactamente lo
 * que este proyecto persigue. */
[['STOCK_COLS', 'STOCK_COL_TIPS'], ['MOV_COLS', 'MOV_COL_TIPS']].forEach(function (par) {
  const cols = lista(par[0]), tips = mapa(par[1]);
  if (!cols || !tips) return;
  const sobran = tips.filter(function (k) { return cols.indexOf(k) === -1; });
  check(par[1] + ': ningún texto sobra', sobran.length === 0, sobran);
});

if (fallos.length) {
  console.error('\nFALLÓ:\n  ' + fallos.join('\n  ') + '\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
