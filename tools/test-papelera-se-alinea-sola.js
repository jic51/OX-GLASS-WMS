// LA PAPELERA SE COLOCA SOLA CUANDO EL ARCHIVO GANA UNA COLUMNA.
//
// Jose, 27/10: *"¿cuál es el problema real en toda la app de aumentar
// columnas?"*. Era esto, y era una línea:
//
//     var TR = { DELETED_AT: AC_WIDTH, DELETED_BY: AC_WIDTH + 1, ... };
//
// Una fila de la papelera es la fila del movimiento ENTERA más tres columnas
// pegadas detrás. Así que el ancho del movimiento ERA el plano de la papelera:
// añadir una columna al archivo corría esas tres de sitio, y las filas que ya
// estaban en la papelera de un cliente pasaban a leerse desplazadas — la fecha
// de borrado leída como otra cosa, el «borrado por» leído como fecha.
//
// Eso convertía cada columna nueva en una migración, y por eso el importador
// del 22/10 renunció a la suya: *"es un riesgo enorme para una etiqueta"*.
//
// ── LO QUE SE COMPRUEBA, Y POR QUÉ ASÍ ──────────────────────────────────────
//
// No se mira si `alinearPapelera_` «llama a insertColumnsBefore»: eso sería
// comprobar que el código hace lo que el código dice. Se construye una hoja
// FALSA QUE SE COMPORTA COMO UNA DE VERDAD —su insertColumnsBefore mueve los
// datos de todas las filas, como hace Sheets— se ejecuta la función real sacada
// del archivo, y después se LEE la fila con `TR.DELETED_AT` para ver si el dato
// que sale es el que tiene que salir.
//
// Los cuatro casos que importan:
//   1. Una papelera vieja (escrita con AC_WIDTH = 23) se coloca sola.
//   2. Una ya colocada no se toca — correrlo dos veces no hace nada.
//   3. Una cabecera que no dice «Deleted At» se deja intacta: no se adivina.
//   4. Una con las columnas MÁS A LA DERECHA no se recorta nunca. Quitar
//      columnas sería borrar datos de alguien por una suposición nuestra.
//
// Uso:  node tools/test-papelera-se-alinea-sola.js

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const RAIZ = path.join(__dirname, '..');
const GS   = fs.readFileSync(path.join(RAIZ, 'Code_v3_fixed.gs'), 'utf8');

let ok = 0;
const fallos = [];
function check(etiqueta, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + etiqueta); return; }
  fallos.push(etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
  console.log('  ✗    ' + etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
}

function fnSrc(src, nombre) {
  const ini = src.indexOf('function ' + nombre + '(');
  if (ini === -1) throw new Error('no encontrada: ' + nombre);
  let prof = 0;
  for (let j = src.indexOf('{', ini); j < src.length; j++) {
    if (src[j] === '{') prof++;
    else if (src[j] === '}') { prof--; if (prof === 0) return src.slice(ini, j + 1); }
  }
  throw new Error('sin cerrar: ' + nombre);
}

const AC_WIDTH = Number((GS.match(/var AC_WIDTH = (\d+);/) || [])[1]);
const TR = { DELETED_AT: AC_WIDTH, DELETED_BY: AC_WIDTH + 1, FROM_SHEET: AC_WIDTH + 2 };

/* ── Una hoja falsa que se comporta como una de verdad ──────────────────────
 * Lo que más importa de ella: `insertColumnsBefore` MUEVE LOS DATOS de todas
 * las filas, que es lo que hace Sheets. Una hoja de mentira que sólo contara
 * columnas no podría enseñar ni el fallo ni el arreglo. */
function Hoja(filas, maxCols) {
  this.rows     = filas.map(function (r) { return r.slice(); });
  this._maxCols = maxCols;
  this.insertadas = 0;
}
Hoja.prototype.getMaxColumns = function () { return this._maxCols; };
Hoja.prototype.getLastRow    = function () { return this.rows.length; };
Hoja.prototype.getRange = function (fila, col, nFilas, nCols) {
  const self = this;
  return {
    getValues: function () {
      const out = [];
      for (let r = fila - 1; r < fila - 1 + nFilas; r++) {
        const row = self.rows[r] || [];
        const trozo = [];
        for (let c = col - 1; c < col - 1 + nCols; c++) trozo.push(row[c] === undefined ? '' : row[c]);
        out.push(trozo);
      }
      return out;
    }
  };
};
Hoja.prototype.insertColumnsBefore = function (pos, n) {
  this.insertadas += n;
  this._maxCols += n;
  const huecos = new Array(n).fill('');
  this.rows = this.rows.map(function (r) {
    const copia = r.slice();
    copia.splice(pos - 1, 0, ...huecos);
    return copia;
  });
};

const ctx = vm.createContext({
  TR: TR,
  Logger: { log: function () {} }
});
vm.runInContext(fnSrc(GS, 'alinearPapelera_'), ctx);
const alinear = vm.runInContext('alinearPapelera_', ctx);

/** Una papelera tal como quedó escrita cuando el archivo medía `anchoViejo`. */
function papeleraVieja(anchoViejo) {
  const cab = new Array(anchoViejo).fill('');
  cab[0] = 'System Date';
  cab[2] = 'Name';
  const fila = new Array(anchoViejo).fill('');
  fila[0] = '10/01/2026';
  fila[2] = 'Aluminio 2mm';
  return new Hoja(
    [cab.concat(['Deleted At', 'Deleted By', 'Came From']),
     fila.concat(['2026-10-23', 'jose@oxglass.com', 'MASTER_ARCHIVE_V3'])],
    anchoViejo + 3
  );
}

console.log('\n═══ 1. una papelera escrita antes de las columnas nuevas ═══\n');

/* El caso real: la papelera de un cliente que empezó con AC_WIDTH = 23 y hoy
 * el archivo mide 25. Sus tres columnas están DOS sitios a la izquierda. */
const vieja = papeleraVieja(AC_WIDTH - 2);

// Primero, que el fallo exista de verdad. Sin esto, lo de abajo no demuestra
// nada: una prueba que sólo mira el después aprueba también a quien no hizo
// nada, porque no sabe cómo era el antes.
check('ANTES de alinear, el dato sale corrido (el fallo es real)',
  vieja.rows[1][TR.DELETED_AT] !== '2026-10-23', vieja.rows[1][TR.DELETED_AT]);

alinear(vieja);

check('después de alinear, la fecha de borrado se lee bien',
  vieja.rows[1][TR.DELETED_AT] === '2026-10-23', vieja.rows[1][TR.DELETED_AT]);
check('y el «borrado por» también',
  vieja.rows[1][TR.DELETED_BY] === 'jose@oxglass.com', vieja.rows[1][TR.DELETED_BY]);
check('y de qué hoja venía',
  vieja.rows[1][TR.FROM_SHEET] === 'MASTER_ARCHIVE_V3', vieja.rows[1][TR.FROM_SHEET]);

/* Y que el MOVIMIENTO no se haya movido. Las columnas vacías entran DETRÁS de
 * sus datos, no delante: si entraran delante, el nombre del material se iría de
 * sitio y habríamos cambiado un desajuste por otro peor. */
check('el movimiento sigue donde estaba — las columnas entran detrás de él',
  vieja.rows[1][0] === '10/01/2026' && vieja.rows[1][2] === 'Aluminio 2mm',
  { col0: vieja.rows[1][0], col2: vieja.rows[1][2] });
check('se metieron exactamente las columnas que faltaban', vieja.insertadas === 2, vieja.insertadas);

console.log('\n═══ 2. correrlo dos veces no hace nada la segunda ═══\n');

const antes = vieja.insertadas;
alinear(vieja);
check('una papelera ya colocada no se toca', vieja.insertadas === antes, vieja.insertadas);
check('y sigue leyéndose bien', vieja.rows[1][TR.DELETED_AT] === '2026-10-23');

console.log('\n═══ 3. si la cabecera no dice «Deleted At», no se adivina ═══\n');

const rara = new Hoja([['a', 'b', 'c'], ['1', '2', '3']], 3);
alinear(rara);
check('una hoja que no se reconoce se deja intacta', rara.insertadas === 0, rara.insertadas);

console.log('\n═══ 4. nunca se quitan columnas ═══\n');

/* «Deleted At» más a la DERECHA de donde el modelo lo espera. Este código no
 * puede provocarlo, pero una mano en el Sheet sí. Entre equivocarse y no
 * tocar, no tocar: recortar sería borrar datos por una suposición nuestra. */
const ancha = papeleraVieja(AC_WIDTH + 3);
const anchoPrevio = ancha.getMaxColumns();
alinear(ancha);
check('una papelera más ancha de lo esperado no se recorta',
  ancha.insertadas === 0 && ancha.getMaxColumns() === anchoPrevio,
  { insertadas: ancha.insertadas, ancho: ancha.getMaxColumns() });

console.log('\n═══ 5. y el código sigue llamándolo donde hay que llamarlo ═══\n');

/* De nada sirve que la función sea correcta si un camino de lectura entra sin
 * pasar por ella: ése leería la papelera corrida. Son los tres sitios que
 * tocan columnas de la papelera. */
[['ensureTrashSheet_', 'al crear o preparar la hoja'],
 ['findTrashedById_',  'al buscar un movimiento borrado'],
 ['listTrash',         'al enseñar la lista']].forEach(function (p) {
  const nombre = p[0];
  const trozo = nombre === 'listTrash'
    ? (GS.match(/op === 'listTrash'[\s\S]{0,600}/) || [''])[0]
    : fnSrc(GS, nombre);
  check(nombre + ' alinea antes de leer (' + p[1] + ')',
    /alinearPapelera_\s*\(/.test(trozo));
});

/* Y que alinear NO cree la hoja: se llama desde caminos de sólo lectura, y
 * crear una pestaña por mirar es la sorpresa que este archivo evita. */
const cuerpo = fnSrc(GS, 'alinearPapelera_');
check('alinearPapelera_ no crea ninguna hoja',
  !/insertSheet/.test(cuerpo));
check('alinearPapelera_ no borra columnas nunca',
  !/deleteColumn/.test(cuerpo));

if (fallos.length) {
  console.error('\nFALLÓ:\n  ' + fallos.join('\n  ') + '\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
