// EL AVISO DE DESHACER UNA IMPORTACIÓN TIENE QUE DECIR LO QUE DE VERDAD PASA.
//
// El 27/10 deshacer una importación dejó de mandar las filas a la papelera:
// **el fichero ES la copia**, y guardar mil filas que siguen enteras en el
// disco del cliente no protege nada (decisión de Jose del 26/10, ver H-01).
//
// La pantalla, en cambio, decía esto:
//
//   «They go to the trash, exactly like deleting a movement — nothing here is
//    final, and anything you take out can be put back.»
//
// ── POR QUÉ ESTO ES UNA PRUEBA Y NO UNA REVISIÓN A OJO ──────────────────────
//
// Un aviso que describe el comportamiento de AYER es peor que no avisar: quien
// lo lee pulsa tranquilo por un motivo que ya no existe. Y es, otra vez, DOS
// COSAS QUE TIENEN QUE COINCIDIR SIN QUE NADA LO OBLIGUE — lo que el servidor
// hace y lo que la pantalla promete, cada uno en su archivo.
//
// Esta vez lo que obliga es esto.
//
// Uso:  node tools/test-el-aviso-dice-la-verdad.js

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const RAIZ = path.join(__dirname, '..');
const GS   = fs.readFileSync(path.join(RAIZ, 'Code_v3_fixed.gs'), 'utf8');
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
  if (ini === -1) throw new Error('no encontrada: ' + nombre);
  let prof = 0;
  for (let j = src.indexOf('{', ini); j < src.length; j++) {
    if (src[j] === '{') prof++;
    else if (src[j] === '}') { prof--; if (prof === 0) return src.slice(ini, j + 1); }
  }
  throw new Error('sin cerrar: ' + nombre);
}

const undoUI = fnSrc(HTML, '_undoImport');

console.log('\n═══ 1. la frase vieja ya no está en ningún sitio ═══\n');

/* La frase exacta que había. Se busca en TODO el archivo, no sólo en esta
 * función: si alguien la copia a otra pantalla, vuelve a mentir desde ahí. */
check('no queda «They go to the trash, exactly like deleting a movement»',
  HTML.indexOf('They go to the trash, exactly like deleting a movement') === -1);
check('ni «nothing here is final» sobre esta operación',
  undoUI.indexOf('nothing here is') === -1);

/* Y LA OTRA FRASE, la que se lee ANTES de pulsar nada. El 29/10 se arregló el
 * aviso del botón y ésta se quedó diciendo lo de la papelera — el mismo
 * descuido dos veces: cambiar el comportamiento y buscar sólo UNO de los
 * sitios que lo describen. Se busca en TODO el archivo justamente por eso. */
check('ni la descripción de «Imports you have already done» lo dice',
  HTML.indexOf('Undoing sends those movements to the trash') === -1);
check('y esa descripción explica que el fichero es la copia',
  /the file is the\s+backup/.test(HTML) || /the file is the backup/.test(HTML));

console.log('\n═══ 2. y dice las tres cosas que hay que decir ═══\n');

check('1 · que NO van a la papelera',
  /do NOT go to the trash/i.test(undoUI), undoUI.length);
check('2 · cómo se recuperan: subiendo el mismo fichero',
  /import the same file again/i.test(undoUI));
check('3 · la excepción: lo editado sí se guarda, y por qué',
  /edited since you imported/i.test(undoUI) && /old value/i.test(undoUI));

/* El orden importa y es parte de la decisión: qué pasa, cómo se recupera, y lo
 * que NO se recupera así. La excepción al final no es letra pequeña — es lo
 * que alguien necesita saber antes de pulsar. */
const pNo   = undoUI.search(/do NOT go to the trash/i);
const pOtra = undoUI.search(/import the same file again/i);
const pEdit = undoUI.search(/edited since you imported/i);
check('y en ese orden', pNo < pOtra && pOtra < pEdit, { pNo: pNo, pOtra: pOtra, pEdit: pEdit });

console.log('\n═══ 3. lo que se dice al terminar, ejecutado ═══\n');

const ctx = vm.createContext({});
vm.runInContext(fnSrc(HTML, '_textoDeshecho'), ctx);
const texto = vm.runInContext('_textoDeshecho', ctx);

/* EL CASO NORMAL no menciona la papelera. Nombrar una papelera que no recibió
 * nada sólo siembra la duda de si hay algo ahí. */
const normal = texto(1052, 1052, 0);
check('nada editado: dice cuántas y cómo volverlas a traer',
  /1052 movements removed/.test(normal) && /import the same file again/i.test(normal), normal);
check('...y NO menciona la papelera', !/trash/i.test(normal), normal);

const mixto = texto(1052, 1049, 3);
check('con filas editadas: dice las dos cifras',
  /1049 discarded/.test(mixto) && /3 kept in the trash/.test(mixto), mixto);
check('...y por qué ésas se guardaron', /edited since importing/.test(mixto), mixto);

const todasEditadas = texto(2, 0, 2);
check('si todas estaban editadas, no dice «0 discarded»',
  !/0 discarded/.test(todasEditadas) && /kept in the trash/.test(todasEditadas), todasEditadas);

check('una sola fila se dice en singular',
  /1 movement removed/.test(texto(1, 1, 0)) && !/1 movements/.test(texto(1, 1, 0)),
  texto(1, 1, 0));
check('cero no inventa un número', texto(0, 0, 0) === 'Nothing was removed.', texto(0, 0, 0));

console.log('\n═══ 4. y el servidor hace lo que la pantalla promete ═══\n');

/* La otra mitad de la pareja. Si el servidor volviera a mandarlo todo a la
 * papelera, el aviso de arriba pasaría a ser el que miente — y al revés. */
const undoGs = fnSrc(GS, 'undoImport');
check('undoImport decide por fila qué va a la papelera',
  /movimientosEditados_/.test(undoGs) && /AC\.MOV_ID/.test(undoGs));
check('y su línea de auditoría ya no dice «moved to the trash» a secas',
  !/row\(s\) from import ' \+ importId \+ ' moved to the trash/.test(undoGs));
check('sino que distingue lo descartado de lo guardado',
  /discarded/.test(undoGs) && /kept in the trash/.test(undoGs));

if (fallos.length) {
  console.error('\nFALLÓ:\n  ' + fallos.join('\n  ') + '\n');
  console.error('  Un aviso que describe el comportamiento de ayer es peor que\n' +
                '  no avisar: quien lo lee pulsa tranquilo por un motivo que ya\n' +
                '  no existe.\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
