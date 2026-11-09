// LO QUE SALE DEL SERVIDOR TIENE QUE SOBREVIVIR EL VIAJE.
//
// Jose, 5/11: *"intenté subir el documento de 600 filas otra vez y sigue sin
// cargar… incluso le subí el de 1000 líneas y lo leyó enseguida justo
// después. ¿Estará dañado el documento?"*
//
// No lo estaba. Lo medido, contra los cuatro ficheros de prueba:
//
//     600 «sucio»     1 qty vacía + 1 que dice «doce»   → NO carga
//     1000 / 800 / 20     ninguna de las dos            → cargan
//
// `numeroDeFichero_` devuelve NaN para una celda vacía y para un texto que no
// es número. Ese NaN se quedaba en la fila, y `parseImportFile` devuelve las
// primeras 200 filas al navegador TAL CUAL. **NaN no es JSON válido**, así que
// al serializar la respuesta no se disparaba ni el éxito ni el fallo: el reloj
// girando para siempre, sin un error, sin un aviso.
//
// ── Y NO ES COSA DEL FICHERO DE PRUEBA ─────────────────────────────────────
//
// Un inventario real con una celda de cantidad en blanco —lo más normal del
// mundo— hace exactamente lo mismo. Por eso la prueba no se queda en «qty no
// es NaN»: comprueba la INVARIANTE, que es que **todo lo que el servidor
// devuelve sobrevive a ir y volver de JSON**. Eso pilla el siguiente campo que
// alguien añada con un NaN, un Infinity o una fecha dentro.
//
// Uso:  node tools/test-el-fichero-sucio.js

const fs   = require('fs');
const path = require('path');
const A    = require('./andamio.js');

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

/* Un `Utilities.parseCsv` de verdad: respeta comillas, comillas escapadas y
 * comas dentro de un campo. El fichero sucio tiene las tres cosas a propósito,
 * así que un partidor por comas no mediría nada. */
function parseCsv(texto, delim) {
  delim = delim || ',';
  const filas = []; let fila = [], campo = '', enComillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (enComillas) {
      if (c === '"') { if (texto[i + 1] === '"') { campo += '"'; i++; } else enComillas = false; }
      else campo += c;
    } else if (c === '"') enComillas = true;
    else if (c === delim) { fila.push(campo); campo = ''; }
    else if (c === '\n') { fila.push(campo); filas.push(fila); fila = []; campo = ''; }
    else if (c !== '\r') campo += c;
  }
  if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila); }
  return filas.filter(f => f.length > 1 || (f[0] || '').trim() !== '');
}

const ctx = {
  Utilities: {
    parseCsv: parseCsv,
    base64Decode: (x) => x,
    newBlob: (b) => ({ getDataAsString: () => String(b) })
  },
  Logger: { log(){} },
  IMPORT_ALL_HEADERS:      ['category','name','qty','unit','location','project','supplier','po','comments'],
  IMPORT_REQUIRED_HEADERS: ['category','name','qty'],
  // P-06: los campos que una corrección puede tocar. Es una constante del
  // módulo, y el andamio levanta funciones, no constantes.
  IMPORT_CORREGIBLES:      ['category','name','qty']
};
const M = A.montar(ctx, GS, ['leerFilasDelFichero_'], { dobles: ['basicApagado_', 'excelToSheets_', 'chooseImportSheet_'] });

function leer(nombre) {
  const texto = fs.readFileSync(path.join(RAIZ, 'pruebas', nombre), 'utf8');
  ctx.Utilities.base64Decode = () => texto;
  return M.leerFilasDelFichero_({ fileName: nombre, fileData: texto });
}

console.log('\n═══ 1 · EL FICHERO DE JOSE, LEÍDO DE VERDAD ═══\n');

const sucio = leer('inventario-600-sucio.csv');
check('se leen las 600 filas', sucio.parsed.length === 600, sucio.parsed.length);

/* Las tres trampas que lleva dentro, y que la app SÍ maneja — el fichero nunca
 * estuvo dañado. Se comprueban para que nadie las «arregle» quitándolas. */
const milDoscientos = sucio.parsed.find(p => p.qty === 1250);
check('una cantidad con separador de millares («1,250») se entiende',
  !!milDoscientos, milDoscientos);
check('un nombre con comillas escapadas y un guion largo sobrevive',
  sucio.parsed.some(p => p.name.indexOf('48"') !== -1 && p.name.indexOf('×') !== -1),
  sucio.parsed.filter(p => p.name.indexOf('48') !== -1).map(p => p.name));
check('un comentario con comillas, coma y punto y coma dentro sobrevive entero',
  sucio.parsed.some(p => /está roto/.test(p.comments) && /3 de 5/.test(p.comments)));

console.log('\n═══ 2 · LA INVARIANTE: LO QUE SALE, VIAJA ═══\n');

/* ESTO es lo que estaba roto. Un NaN en cualquier campo rompe la respuesta
 * ENTERA al serializarla, no sólo esa fila: por eso no se veía ni un error. */
function noViaja(o, ruta) {
  ruta = ruta || '';
  if (typeof o === 'number' && !isFinite(o)) return ruta + ' = ' + String(o);
  if (o && typeof o === 'object') {
    for (const k in o) {
      if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
      const r = noViaja(o[k], ruta + '.' + k);
      if (r) return r;
    }
  }
  return null;
}

const malo = sucio.parsed.map((p, i) => noViaja(p, 'fila[' + i + ']')).find(Boolean);
check('ninguna fila lleva un número que JSON no sepa escribir', !malo, malo);

/* Y el guardia del guardia: que la prueba esté mirando el fichero que tiene
 * las trampas. Si un día alguien «limpia» el fichero sucio, esto se cae en vez
 * de ponerse verde sin medir nada. */
const vacias = sucio.parsed.filter(p => !p.qtyTexto).length;
const noNum  = sucio.parsed.filter(p => p.qtyTexto && p.qty == null).length;
check('el fichero sigue trayendo una cantidad VACÍA', vacias === 1, vacias);
check('...y una que no es un número', noNum === 1, noNum);

const sinNumero = sucio.parsed.filter(p => p.qty == null);
check('las dos se marcan como inválidas', sinNumero.every(p => !p.valid));
check('...y el aviso dice QUÉ había escrito, para poder buscarlo en el Excel',
  sinNumero.some(p => /Qty "doce" is not a number/.test(p.errors.join(' '))) &&
  sinNumero.some(p => /Qty is empty/.test(p.errors.join(' '))),
  sinNumero.map(p => p.errors.join(' ')));

console.log('\n═══ 3 · Y LOS QUE SÍ CARGABAN SIGUEN CARGANDO ═══\n');

['inventario-1000.csv', 'inventario-800-con-id.csv', 'prueba-20-filas.csv'].forEach(function (f) {
  const r = leer(f);
  check(f + ': se lee', r.parsed.length > 0, r.parsed.length);
  check(f + ': y también viaja entero', !r.parsed.map((p, i) => noViaja(p, 'f' + i)).find(Boolean));
});

console.log('\n═══ 4 · Y LA PANTALLA ENSEÑA LO QUE SE ESCRIBIÓ ═══\n');

/* Un «—» sólo dice que algo pasa. «doce» en su sitio dice qué celda abrir. */
check('la vista previa pinta el texto original cuando no es un número',
  /c\.k === 'qty'\) v = \(r\.qty == null\) \? \(r\.qtyTexto \|\| ''\)/.test(HTML));
check('...y el servidor se lo manda', /qtyTexto:\s*String\(r\[col\.qty\]/.test(GS));
check('ya no se decide pintando con isNaN, que daba `null` por bueno',
  !/c\.k === 'qty'\) v = isNaN/.test(HTML));

console.log('\n═══ 5 · Y AHORA SE PUEDEN ARREGLAR SIN SALIR DE LA APP ═══\n');

/* P-06. Las dos celdas malas de este fichero son exactamente el caso de Jose:
 * una vacía y una que dice «doce», entre seiscientas buenas. Hasta la v14.5 eso
 * mandaba a abrir el Excel, buscar dos celdas, corregir, exportar y volver a
 * subir. Esto comprueba el camino entero, con el fichero de verdad. */
{
  const antes = leer('inventario-600-sucio.csv').parsed;
  const malas = antes.filter(p => !p.valid);
  /* SEIS, y son las seis formas de estropear una fila: vacía, una palabra,
     negativa, cero, sin nombre y sin categoría. El fichero «sucio» hace honor
     a su nombre — por eso es el que encontró el fallo del NaN. */
  check('el fichero trae seis filas con error', malas.length === 6,
    malas.map(m => ({ fila: m.rowNum, por: m.errors })));

  /* Se corrigen POR NÚMERO DE FILA, que es lo que la pantalla manda, y cada
     una por el campo que la estropea: no hay una corrección genérica. */
  const fixes = {};
  malas.forEach(m => {
    const por = m.errors.join();
    if (/Missing Name/.test(por))          fixes[m.rowNum] = { name: 'RESCUED ROW ' + m.rowNum };
    else if (/Missing Category/.test(por)) fixes[m.rowNum] = { category: 'FLASHING' };
    else                                   fixes[m.rowNum] = { qty: '7' };
  });

  const texto = fs.readFileSync(path.join(RAIZ, 'pruebas', 'inventario-600-sucio.csv'), 'utf8');
  ctx.Utilities.base64Decode = () => texto;
  const despues = M.leerFilasDelFichero_({
    fileName: 'inventario-600-sucio.csv', fileData: texto, fixes: fixes
  }).parsed;

  check('corregidas, no queda ninguna mala',
    despues.filter(p => !p.valid).length === 0,
    despues.filter(p => !p.valid).map(m => ({ fila: m.rowNum, por: m.errors })));
  check('...y entran las 600', despues.filter(p => p.valid).length === 600);
  malas.forEach(m => {
    const d = despues.find(p => p.rowNum === m.rowNum);
    const esperado = fixes[m.rowNum];
    if (esperado.qty)      check('la fila ' + m.rowNum + ' lleva la cantidad corregida', d.qty === 7, d && d.qty);
    if (esperado.name)     check('la fila ' + m.rowNum + ' lleva el nombre corregido', d.name === esperado.name, d && d.name);
    if (esperado.category) check('la fila ' + m.rowNum + ' lleva la categoría corregida', d.category === 'FLASHING', d && d.category);
    check('...y la ' + m.rowNum + ' queda marcada como corregida, no disfrazada de buena',
      d.corregida === true);
  });

  /* LAS DEMÁS NO SE TOCAN. Una corrección es de una fila; si rozara a las
   * vecinas sería mucho peor que el problema que resuelve. */
  const intactas = despues.filter(p => !fixes[p.rowNum]);
  check('las otras 594 llegan igual que sin corregir nada',
    intactas.every(d => {
      const a = antes.find(p => p.rowNum === d.rowNum);
      return a && a.qty === d.qty && a.name === d.name && a.category === d.category;
    }));
  check('...y ninguna de ellas queda marcada como corregida',
    intactas.every(d => !d.corregida));
}

{
  /* Y una corrección que NO arregla nada deja la fila mala, con el aviso
   * nuevo. No hay un camino «me lo has mandado corregido, me fío». */
  const texto = fs.readFileSync(path.join(RAIZ, 'pruebas', 'inventario-600-sucio.csv'), 'utf8');
  ctx.Utilities.base64Decode = () => texto;
  const malas = leer('inventario-600-sucio.csv').parsed
    .filter(p => !p.valid && /Qty/.test(p.errors.join()));
  ctx.Utilities.base64Decode = () => texto;
  const fixes = {}; fixes[malas[0].rowNum] = { qty: 'siete' };
  const r = M.leerFilasDelFichero_({
    fileName: 'inventario-600-sucio.csv', fileData: texto, fixes: fixes
  }).parsed.find(p => p.rowNum === malas[0].rowNum);
  check('una corrección que no arregla nada deja la fila fuera', !r.valid, r.errors);
  check('...y el aviso cita lo que se acaba de escribir',
    /"siete"/.test(r.errors.join()), r.errors);
}

{
  /* Un número de fila que no existe se ignora sin romper nada. Llega solo:
   * la pantalla guarda las correcciones por número de fila, y cambiar de hoja
   * en un Excel renumera. */
  const texto = fs.readFileSync(path.join(RAIZ, 'pruebas', 'inventario-600-sucio.csv'), 'utf8');
  ctx.Utilities.base64Decode = () => texto;
  const r = M.leerFilasDelFichero_({
    fileName: 'inventario-600-sucio.csv', fileData: texto, fixes: { 99999: { qty: '1' } }
  }).parsed;
  check('una corrección para una fila que no existe no rompe nada',
    r.length === 600 && r.filter(p => !p.valid).length === 6);
}

if (fallos.length) {
  console.error('\nFALLÓ:\n  ' + fallos.join('\n  ') + '\n');
  console.error('  Un NaN en un solo campo rompe la respuesta ENTERA al\n' +
                '  serializarla: ni éxito, ni fallo, ni aviso. Sólo el reloj.\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
