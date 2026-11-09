// P-06 · ELEGIR QUÉ ENTRA, Y ARREGLAR LO QUE NO.
//
// Jose, 8/11: *"si el fichero carga y muestra todas las filas incluidas las que
// tienen errores, pero no carga esas, debemos trabajar en la parte de la
// corrección de los errores y los filtros en los registros antes de hacer el
// import."*
//
// ── LO QUE DE VERDAD HAY QUE SUJETAR AQUÍ ──────────────────────────────────
//
// Esta pantalla toca lo único de la app que puede duplicar un almacén entero,
// así que lo que importa no es que los filtros se vean bonitos. Son tres cosas:
//
//   1 · que la regla de «esta fila vale» sea LA MISMA en el navegador y en el
//       servidor. Están escritas dos veces porque un navegador no puede llamar
//       a Apps Script, y dos copias de una regla es exactamente el fallo que
//       este proyecto repite. Así que se ejecutan LAS DOS sobre la misma tabla
//       de casos y se exige que contesten igual, letra por letra.
//
//   2 · que una fila corregida pase por la MISMA validación que una que vino
//       bien. Si hubiera un camino «ya la arreglé a mano, déjala pasar», ese
//       camino acabaría dejando pasar cualquier cosa.
//
//   3 · que lo corregido y lo destildado VIAJEN al servidor. Arreglar una fila
//       en pantalla y que se guarde la rota sería peor que no poder arreglarla:
//       habrías visto con tus ojos algo que no pasó.
//
// Uso:  node tools/test-importar-elegir-y-corregir.js

const fs   = require('fs');
const path = require('path');
const A    = require('./andamio.js');

const RAIZ = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(RAIZ, 'Index_v3_fixed.html'), 'utf8');
const GS   = fs.readFileSync(path.join(RAIZ, 'Code_v3_fixed.gs'), 'utf8');

let ok = 0;
const fallos = [];
function check(etiqueta, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + etiqueta); return; }
  fallos.push(etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
  console.log('  ✗    ' + etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
}

console.log('\n═══ 1 · LAS DOS REGLAS DICEN LO MISMO ═══\n');

/* La del servidor es la que manda: decide qué se guarda. La del navegador sólo
 * adelanta la respuesta mientras se teclea. Si se separan, la pantalla enciende
 * en verde una fila que el servidor va a rechazar — y eso es peor que no tener
 * la comprobación rápida, porque promete algo que no se cumple. */
const SRV = A.montar({}, GS, ['erroresDeFilaImport_']).erroresDeFilaImport_;
const NAV = A.montar({ String: String }, HTML, ['_impErroresDeFila'])._impErroresDeFila;

const CASOS = [
  { que: 'una fila buena',                 f: { category:'FLASHING', name:'TAPE 6', qty:10, qtyTexto:'10' } },
  { que: 'sin categoría',                  f: { category:'',         name:'TAPE 6', qty:10, qtyTexto:'10' } },
  { que: 'sin nombre',                     f: { category:'FLASHING', name:'',       qty:10, qtyTexto:'10' } },
  { que: 'cantidad vacía',                 f: { category:'FLASHING', name:'TAPE 6', qty:null, qtyTexto:'' } },
  { que: 'cantidad que dice «doce»',       f: { category:'FLASHING', name:'TAPE 6', qty:null, qtyTexto:'doce' } },
  { que: 'cantidad cero',                  f: { category:'FLASHING', name:'TAPE 6', qty:0,  qtyTexto:'0' } },
  { que: 'cantidad negativa',              f: { category:'FLASHING', name:'TAPE 6', qty:-5, qtyTexto:'-5' } },
  { que: 'cantidad con decimales',         f: { category:'FLASHING', name:'TAPE 6', qty:2.5, qtyTexto:'2.5' } },
  { que: 'todo mal a la vez',              f: { category:'',         name:'',       qty:null, qtyTexto:'x' } },
  { que: 'nada de nada',                   f: { category:'',         name:'',       qty:null, qtyTexto:'' } }
];

let iguales = 0;
CASOS.forEach(c => {
  const a = SRV(c.f).join(' | ');
  const b = NAV(c.f).join(' | ');
  check('la misma respuesta en los dos lados — ' + c.que, a === b, { servidor: a, navegador: b });
  if (a === b) iguales++;
});
check('y no es casualidad: los diez casos coinciden', iguales === CASOS.length, iguales);

/* Y que la regla diga lo que tiene que decir, no sólo lo mismo en los dos
 * sitios. Dos copias de una regla equivocada también coinciden. */
check('una fila completa pasa',           SRV(CASOS[0].f).length === 0);
check('sin categoría no pasa',            /Missing Category/.test(SRV(CASOS[1].f).join()));
check('sin nombre no pasa',               /Missing Name/.test(SRV(CASOS[2].f).join()));
check('cero no pasa — importar cero unidades no es importar',
  SRV(CASOS[5].f).length === 1);
check('un número con decimales sí pasa: media caja es una cantidad',
  SRV(CASOS[7].f).length === 0);
/* El aviso dice QUÉ había escrito. «Qty must be a number» sobre una columna de
 * seiscientas filas no se puede buscar; «Qty "doce" is not a number» se
 * encuentra en el Excel con Ctrl+F. */
check('y el aviso cita lo que estaba escrito en la celda',
  /"doce"/.test(SRV(CASOS[4].f).join()), SRV(CASOS[4].f));
check('...y cuando no había nada escrito, lo dice así',
  /Qty is empty/.test(SRV(CASOS[3].f).join()));

console.log('\n═══ 2 · CORREGIR UNA FILA, EJECUTADO ═══\n');

const F = A.montar(
  { Object: Object, String: String, isFinite: isFinite,
    _qty: t => { const n = parseFloat(String(t).replace(/,/g, '')); return isFinite(n) ? n : NaN; } },
  HTML, ['_impFilaCon', '_impErroresDeFila'], { dobles: ['_qty'] });

const mala = { rowNum: 9, category: 'FLASHING', name: 'TAPE 6',
               qty: null, qtyTexto: 'doce', valid: false,
               errors: ['Qty "doce" is not a number greater than 0'] };

{
  // Sin corrección, la fila es la que vino — el mismo objeto, no una copia.
  F._impFixes = {};
  check('sin corrección, la fila no se toca', F._impFilaCon(mala) === mala);
}

{
  F._impFixes = { 9: { qty: '12' } };
  const d = F._impFilaCon(mala);
  check('corregir la cantidad la vuelve válida', d.valid === true, d);
  check('...y el número es el que se escribió', d.qty === 12, d.qty);
  check('...y queda marcada como corregida aquí', d.corregida === true);
  /* LA ORIGINAL NO SE TOCA. Es lo que permite deshacer: borrar la corrección
   * tiene que devolver la fila a lo que traía el fichero, y si se hubiera
   * escrito encima ya no habría a dónde volver. */
  check('y la fila original sigue como vino del fichero',
    mala.qty === null && mala.valid === false && mala.qtyTexto === 'doce', mala);
}

{
  F._impFixes = { 9: { qty: '' } };
  const d = F._impFilaCon(mala);
  check('borrar la cantidad en la corrección la deja inválida otra vez', !d.valid);
  check('...y el aviso vuelve a ser el de la celda vacía',
    /Qty is empty/.test(d.errors.join()), d.errors);
}

{
  F._impFixes = { 9: { qty: 'trece' } };
  const d = F._impFilaCon(mala);
  check('escribir otra palabra tampoco cuela', !d.valid);
  check('...y el aviso cita lo NUEVO que se escribió, no lo viejo',
    /"trece"/.test(d.errors.join()) && !/"doce"/.test(d.errors.join()), d.errors);
}

{
  /* ROMPER UNA BUENA. Corregir no es sólo arreglar: se puede borrar el nombre
   * de una fila que estaba bien. Tiene que caerse igual que cualquier otra —
   * no existe un «ya estaba validada». */
  const buena = { rowNum: 4, category: 'FLASHING', name: 'TAPE 9', qty: 5,
                  qtyTexto: '5', valid: true, errors: [] };
  F._impFixes = { 4: { name: '' } };
  const d = F._impFilaCon(buena);
  check('vaciar el nombre de una fila buena la invalida', !d.valid, d);
  check('...por la misma regla que todas las demás',
    /Missing Name/.test(d.errors.join()));
}

{
  /* Y que el texto se recorta, porque un nombre que es sólo espacios no es un
   * nombre — y así es como llega una celda «vacía» de un Excel. */
  F._impFixes = { 9: { category: '   ', name: 'TAPE 6', qty: '3' } };
  const d = F._impFilaCon(mala);
  check('una categoría de puros espacios no cuenta como categoría', !d.valid, d);
  check('...y lo dice como lo que es', /Missing Category/.test(d.errors.join()));
}

console.log('\n═══ 3 · LA CUENTA DE LO QUE VA A ENTRAR ═══\n');

/* El total sale del SERVIDOR (`validRows`), nunca de contar lo que se ve en
 * pantalla. Contar la muestra fue el fallo de la v12.90: el botón prometía
 * «Import 1052 Valid Rows» y entraban 500, porque la pantalla contaba las 500
 * que había recibido como muestra. */
const E = A.montar(
  { Object: Object, String: String, isFinite: isFinite, Math: Math,
    _qty: t => { const n = parseFloat(String(t).replace(/,/g, '')); return isFinite(n) ? n : NaN; } },
  HTML, ['_impEstado', '_impFilaCon', '_impErroresDeFila'], { dobles: ['_qty'] });

function estado(validRows, todas, fixes, saltar){
  E._impUltimo = { validRows: validRows };
  E._impTodas  = todas;
  E._impFixes  = fixes || {};
  E._impSaltar = saltar || {};
  return E._impEstado();
}

const malaA = { rowNum: 9, category: 'F', name: 'N', qty: null, qtyTexto: 'doce', valid: false, errors: ['x'] };
const malaB = { rowNum: 5, category: '',  name: 'N', qty: 3,    qtyTexto: '3',    valid: false, errors: ['x'] };
const buenaA = { rowNum: 2, category: 'F', name: 'N', qty: 1, qtyTexto: '1', valid: true, errors: [] };

{
  const e = estado(597, [buenaA, malaA, malaB], {}, {});
  check('sin tocar nada, entran las que el servidor dijo', e.entraran === 597, e);
  check('...aunque en pantalla sólo se vean tres filas', e.arregladas === 0 && e.saltadas === 0);
}
{
  const e = estado(597, [buenaA, malaA, malaB], { 9: { qty: '12' } }, {});
  check('arreglar una suma una', e.entraran === 598, e);
  check('...y se dice cuántas se arreglaron aquí', e.arregladas === 1);
}
{
  const e = estado(597, [buenaA, malaA, malaB], { 9: { qty: '12' }, 5: { category: 'F' } }, {});
  check('arreglar las dos suma dos', e.entraran === 599, e);
}
{
  const e = estado(597, [buenaA, malaA, malaB], {}, { 2: true });
  check('destildar una resta una', e.entraran === 596, e);
  check('...y se dice cuántas se saltan', e.saltadas === 1);
}
{
  const e = estado(597, [buenaA, malaA, malaB], { 9: { qty: '12' } }, { 2: true });
  check('arreglar una y destildar otra se compensan', e.entraran === 597, e);
}
{
  /* ROMPER UNA BUENA TAMBIÉN CUENTA, y al revés. Si sólo se sumaran las
   * arregladas, vaciar el nombre de una fila buena dejaría el botón prometiendo
   * una fila que el servidor va a rechazar. */
  const e = estado(597, [buenaA], { 2: { name: '' } }, {});
  check('romper una buena resta una', e.entraran === 596, e);
}
{
  const e = estado(0, [malaA], {}, {});
  check('sin ninguna válida, no entra nada', e.entraran === 0, e);
  check('y nunca sale un número negativo', estado(1, [buenaA], {}, { 2: true, 9: true }).entraran === 0);
}

console.log('\n═══ 4 · LO CORREGIDO Y LO DESTILDADO LLEGAN AL SERVIDOR ═══\n');

const commit = A.fnSrc(HTML, '_commitImport');
check('se manda lo destildado', /skipRowNums: Object\.keys\(_impSaltar\)/.test(commit), commit.slice(-400));
check('...y lo corregido',      /fixes:\s+_impFixes/.test(commit));
check('...junto al fichero, que sigue siendo lo que se vuelve a leer',
  /fileData:\s+_importFileB64/.test(commit));
/* La huella es la del FICHERO, no la de lo corregido: si fuera de lo corregido,
 * subir el mismo fichero dos veces con un arreglo distinto parecerían dos
 * ficheros, y el aviso de «esto ya lo subiste» dejaría de avisar. */
check('y la huella sigue siendo la del fichero, para que el aviso de repetido ' +
      'siga funcionando',
  /fingerprint:\s+_importFingerprint/.test(commit));

const srvLee = A.sinComentarios(A.fnSrc(GS, 'leerFilasDelFichero_'));
check('el servidor acepta las correcciones', /data\.fixes/.test(srvLee));
/* ── Y LAS APLICA ANTES DE VALIDAR ──────────────────────────────────────────
 * Es el centro del asunto: una fila corregida pasa por LA MISMA comprobación
 * que una que vino bien. Si se aplicaran después, habría un camino «ya la
 * arreglé a mano» que con el tiempo deja pasar cualquier cosa. */
check('...y las aplica ANTES de validar, no después',
  srvLee.indexOf('correcciones[item.rowNum]') < srvLee.indexOf('erroresDeFilaImport_(item)'),
  { fix: srvLee.indexOf('correcciones[item.rowNum]'), val: srvLee.indexOf('erroresDeFilaImport_(item)') });
check('sólo se pueden corregir los tres campos que invalidan una fila',
  /var IMPORT_CORREGIBLES = \['category', 'name', 'qty'\];/.test(GS));
check('y la pantalla ofrece exactamente esos tres',
  /var IMP_CORREGIBLES = \{ category: 1, name: 1, qty: 1 \};/.test(HTML));

/* LEER EL FICHERO ESTÁ EN UN SOLO SITIO, y eso es lo que hace que la vista
 * previa y lo que se guarda no puedan separarse: no son dos lecturas, es la
 * misma función llamada dos veces con los mismos arreglos. */
check('la vista previa y el guardado leen el fichero por la misma puerta',
  /function parseImportFile[\s\S]{0,200}leerFilasDelFichero_\(data\)/.test(GS) &&
  /function commitImport[\s\S]{0,900}leerFilasDelFichero_\(data\)/.test(GS));

console.log('\n═══ 5 · LA PANTALLA: FILTRAR, MARCAR, Y NO MENTIR ═══\n');

const pinta = A.fnSrc(HTML, '_impPintarTabla');
check('hay tres filtros: todas, listas y las que fallan',
  /todas\|All/.test(pinta) && /listas\|Ready/.test(pinta) && /malas\|Needs fixing/.test(pinta));
check('...y cada uno dice cuántas hay, para no tener que buscarlo',
  /<span>' \+ n \+ '<\/span>/.test(pinta));
/* La casilla SÓLO en las que pueden entrar. Una casilla en una fila inválida
 * prometería algo que no se puede cumplir: esa fila no necesita que la marquen,
 * necesita que la arreglen. */
check('la casilla sale sólo en las filas que pueden entrar',
  /r\.valid\s*\n?\s*\? '<input type="checkbox" class="imp-pick"/.test(pinta), pinta.slice(0, 200));
check('y el recuadro de corregir, sólo en las que fallan',
  /!orig\.valid && IMP_CORREGIBLES\[c\.k\]/.test(pinta));
/* Se repinta al SALIR de la celda y no en cada tecla: repintar mientras se
 * escribe reconstruye la tabla debajo del cursor y se pierde el foco a la
 * segunda letra. */
check('se repinta al salir de la celda, no en cada tecla',
  /addEventListener\('change'/.test(pinta) && !/\.imp-fix[\s\S]{0,200}addEventListener\('input'/.test(pinta));
check('el botón promete el número que de verdad va a entrar',
  /Import ' \+ e\.entraran \+ ' Row\(s\)/.test(pinta));
check('...y está apagado cuando no entra ninguna',
  /\(e\.entraran \? '' : ' disabled'\)/.test(pinta));

const render = A.fnSrc(HTML, '_renderImportPreview');
/* Una fila mala en la línea 480 de un fichero de 600 no estaba en la muestra de
 * las 200 primeras: la pantalla decía «3 need fixing» y no podía enseñar ni
 * una. Ahora las malas viajan aparte y completas. */
check('las filas que fallan se enseñan vengan de donde vengan del fichero',
  /res\.invalidSample/.test(render), render.slice(0, 400));
check('...sin repetir las que ya venían en la muestra',
  /vistas\[r\.rowNum\]/.test(render));
check('...y en el orden del fichero, para poder seguirlas en el Excel',
  /a\.rowNum - b\.rowNum/.test(render));
check('el servidor manda esas filas', /invalidSample:/.test(GS));
/* Y cuando hay más de las que caben, se dice. Corregir doscientas celdas a
 * mano no es el camino, y fingir que sí lo es deja a alguien media hora
 * tecleando. */
check('y cuando son demasiadas para arreglarlas aquí, lo dice',
  /more than can sensibly be corrected on this screen/.test(pinta));

/* Un fichero nuevo empieza de cero. Si las correcciones del anterior se
 * quedaran puestas, se aplicarían por NÚMERO DE FILA a un fichero distinto —
 * la fila 9 de otro Excel es otra cosa. */
check('un fichero nuevo no hereda las correcciones del anterior',
  /_impFixes\s+= \{\};\s*\n\s*_impSaltar = \{\};/.test(render), render.slice(0, 600));
const limpia = A.fnSrc(HTML, '_limpiarFicheroImport');
check('...ni quitar el fichero las deja puestas', /_impFixes = \{\}/.test(limpia));

if (fallos.length) {
  console.error('\nFALLÓ:\n  ' + fallos.join('\n  ') + '\n');
  console.error('  Una pantalla que sabe qué está mal y no deja arreglarlo te\n' +
                '  manda al Excel por tres celdas. Y una que te deja arreglarlo\n' +
                '  y luego guarda la fila rota es peor: habrías visto con tus\n' +
                '  ojos algo que no pasó.\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
