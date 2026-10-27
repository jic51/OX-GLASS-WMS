// 1.200 FUNCIONES EN DOS ÁMBITOS GLOBALES. QUE NINGUNA PISE A OTRA.
//
// Hallazgo E-03 del análisis estructural (27/10).
//
// Los dos archivos del producto son UN ARCHIVO CADA UNO, a propósito: sin
// librerías, sin `<script src>`, para que instalar sea pegar dos cosas. El
// efecto secundario es que todas las funciones de primer nivel comparten un
// único espacio de nombres — 837 en el Index, 339 en el .gs.
//
// ── LO QUE PASA SI DOS SE LLAMAN IGUAL ──────────────────────────────────────
//
// En JavaScript la segunda declaración GANA, y gana EN SILENCIO. No hay error,
// no hay aviso, no hay nada en consola. Dos `function _guardarAjustes()` a
// nueve mil líneas de distancia no se parecen a un fallo: se parecen a que la
// app hace algo raro de vez en cuando.
//
// Y este proyecto ya conoce esa forma con otro nombre. En la landing, dos
// elementos con la misma clave `data-i18n` hicieron que el primero borrara el
// texto del segundo, y la colisión NO SE VEÍA EN EL DOM — hubo que mirar el
// HTML fuente para encontrarla. Es el mismo animal.
//
// ── EL ESTADO DE HOY, MEDIDO ────────────────────────────────────────────────
//
// Cuando se escribió esta prueba NO HABÍA NINGUNA COLISIÓN. Ni dentro de cada
// archivo, ni entre los dos. Los únicos nombres repetidos del Index (`draw`,
// `attempt`) están anidados dentro de otras funciones, cada uno en su ámbito, y
// por eso esta prueba sólo mira las de primer nivel.
//
// Entonces, ¿por qué existe? Porque esa limpieza NO LA SOSTENÍA NADA. Estaba
// bien por costumbre, y una costumbre protege exactamente hasta el día que
// alguien no la tiene.
//
// Uso:  node tools/test-nombres-que-no-se-pisan.js

const fs   = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');

let ok = 0;
const fallos = [];
function check(etiqueta, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + etiqueta); return; }
  fallos.push(etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
  console.log('  ✗    ' + etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
}

/* Sólo las de PRIMER NIVEL: `function` pegado al margen izquierdo. Una función
 * anidada vive en el ámbito de su madre y repetir su nombre es legal y normal
 * —`draw` dentro de dos dibujantes distintos no es un fallo—, así que meterlas
 * aquí llenaría esto de ruido y lo haría inútil justo por ser demasiado
 * estricto. Lo que pisa es lo que está suelto. */
function funcionesDePrimerNivel(src) {
  const out = [];
  src.split('\n').forEach(function (linea, i) {
    const m = /^function\s+([A-Za-z_$][\w$]*)\s*\(/.exec(linea);
    if (m) out.push({ nombre: m[1], linea: i + 1 });
  });
  return out;
}

const ARCHIVOS = [
  { nombre: 'Code_v3_fixed.gs',    minimo: 200 },
  { nombre: 'Index_v3_fixed.html', minimo: 500 }
];

console.log('\n═══ ninguna función de primer nivel pisa a otra ═══\n');

const porArchivo = ARCHIVOS.map(function (a) {
  const src = fs.readFileSync(path.join(RAIZ, a.nombre), 'utf8');
  return { nombre: a.nombre, minimo: a.minimo, funcs: funcionesDePrimerNivel(src) };
});

porArchivo.forEach(function (a) {
  /* EL GUARDIA DEL GUARDIA, y aquí hace mucha falta: si el regex dejara de
   * encontrar funciones —otro estilo de escritura, otro formato— la lista
   * saldría vacía, no habría duplicados, y esto se pondría verde sin haber
   * mirado nada. Un número mínimo convierte ese falso verde en un fallo. */
  check(a.nombre + ': hay funciones que mirar (' + a.funcs.length + ')',
    a.funcs.length >= a.minimo, a.funcs.length);

  const vistas = new Map();
  const choques = [];
  a.funcs.forEach(function (f) {
    if (vistas.has(f.nombre)) {
      choques.push(f.nombre + ' (líneas ' + vistas.get(f.nombre) + ' y ' + f.linea + ')');
    } else {
      vistas.set(f.nombre, f.linea);
    }
  });

  check(a.nombre + ': ningún nombre declarado dos veces',
    choques.length === 0, choques.length ? choques : undefined);
});

console.log('\n═══ y los dos archivos no se confunden entre sí ═══\n');

/* Un nombre repetido ENTRE los dos archivos no se pisa —son dos entornos que
 * no se ven— así que esto no es un fallo de ejecución. Se comprueba igual por
 * una razón de lectura: cuando alguien busca `uploadFiles_` y aparece en los
 * dos sitios haciendo cosas distintas, el siguiente que lo lea va a suponer que
 * es la misma. Hoy no pasa en ningún caso, y mantenerlo así es gratis. */
const nombresGs   = new Set(porArchivo[0].funcs.map(function (f) { return f.nombre; }));
const compartidos = porArchivo[1].funcs
  .map(function (f) { return f.nombre; })
  .filter(function (n) { return nombresGs.has(n); });

check('ningún nombre de función existe en los dos archivos a la vez',
  compartidos.length === 0, compartidos.length ? [...new Set(compartidos)] : undefined);

if (fallos.length) {
  console.error('\nFALLÓ:\n  ' + fallos.join('\n  ') + '\n');
  console.error('  Dos funciones con el mismo nombre no dan error: la segunda gana\n' +
                '  y la primera deja de existir. Renombra una.\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones · ' +
  (porArchivo[0].funcs.length + porArchivo[1].funcs.length) + ' funciones miradas\n');
