// IMPORTAR NO PUEDE PERDER FILAS, NI DUPLICAR UN ALMACÉN EN SILENCIO.
//
// Jose, 22/10, con una captura de su propia pantalla de importar. En ella se
// leían, a la vez, CUATRO números y ninguno era el mismo:
//
//     The file itself has 1053 non-empty line(s)
//     [1052 row(s) found]  [1052 ready to import]
//     Showing the first 100 of 500 rows.
//     ✓ Import 1052 Valid Row(s)
//
// El que mandaba era el que no se veía. `parseImportFile` devolvía
// `parsed.slice(0, 500)` con el comentario «a preview, not a data dump»; el
// navegador lo guardaba en `_importParsedRows` y se lo devolvía al servidor al
// confirmar. Así que el botón que prometía 1.052 guardaba 500, y **552 filas
// del almacén de Jose se quedaban fuera sin que nada lo dijera**. El aviso
// final decía «Imported 500 rows» un segundo después, con el fichero ya
// borrado de la pantalla.
//
// El servidor creyó que mandaba una muestra. El navegador creyó que recibía los
// datos. Vigésimo caso en este proyecto de dos cosas que tenían que coincidir
// sin que nada lo obligara — y el más caro, porque destruye información.
//
// ── LA SEGUNDA MITAD, QUE PREGUNTÓ JOSE ANTES DE DEJARME EMPEZAR ───────────
//
//   *"¿Cómo maneja la app que alguien suba el mismo archivo de inventario 2
//   veces? No podemos dejar que eso pase, porque si bien eso es culpa del
//   usuario, lo más fácil para él será culpar a la app y hablar mal de ella."*
//
// Hoy no pasaba nada: se importaba otra vez, entero. `commitImport` manda
// `forceSubmit: true` en cada fila —con motivo, porque un fichero de verdad
// lleva filas que se parecen y son distintas— y eso apagaba la guardia de
// duplicados para todo, así que tampoco quedaba nada mirando ENTRE
// importaciones.
//
// Se arregla por los dos lados, y hacen falta los dos: una HUELLA que reconoce
// el fichero antes, y un DESHACER que arregla el estropicio después, porque un
// aviso sólo protege a quien lo lee.
//
// ── POR QUÉ ESTA PRUEBA EJECUTA Y NO LEE ───────────────────────────────────
//
// Porque lo que hay que comprobar son NÚMEROS. Leer el código diría que parsea
// el fichero; sólo ejecutarlo dice si un CSV de 1.200 filas da 1.200 o 500.
// Ésa es exactamente la diferencia que nadie vio durante cuarenta días.
//
// Uso:  NODE_PATH="$(npm root -g)" node tools/test-importar-sin-perder.js

const path = require('path');
const vm   = require('vm');
const A    = require(path.join(__dirname, 'andamio.js'));

const GS   = A.fuente('gs');
const HTML = A.fuente('html');

let ok = 0; const fails = [];
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + label); }
  else { fails.push(label + (extra === undefined ? '' : ' → ' + JSON.stringify(extra)));
         console.log('  FALLA ' + label + (extra === undefined ? '' : '  → ' + JSON.stringify(extra))); }
}

/* ────────────────────────────────────────────────────────────────────────────
 * 1. EL FICHERO SE LEE ENTERO — ejecutado, con 1.200 filas de verdad.
 * ──────────────────────────────────────────────────────────────────────────── */
console.log('\n═══ 1. Un fichero grande se lee ENTERO ═══\n');

const FILAS = 1200;
function csvDePrueba(n) {
  const out = ['Category,Name,Qty,Unit,Location,Project,Supplier,PO,Comments'];
  for (let i = 1; i <= n; i++) {
    out.push('WINDOW,MATERIAL ' + i + ',' + (i % 7 + 1) + ',UNIT,A1A,OBRA ' +
             (i % 3) + ',PROV ' + (i % 4) + ',PO' + i + ',nota ' + i);
  }
  return out.join('\n');
}

/* El andamio levanta `leerFilasDelFichero_` con lo que necesite. Se le dan
 * dobles de las dos cosas que tocan a Google: `Utilities.parseCsv` (que es
 * trivial para un CSV sin comillas raras) y `excelToSheets_`, que aquí no se
 * usa porque el fichero es .csv — está en `dobles` para que el andamio no
 * arrastre medio archivo detrás de UrlFetchApp. */
function montarLector() {
  const ctx = {
    Utilities: {
      parseCsv: function (texto, sep) {
        return String(texto).split(/\r\n|\r|\n/)
          .filter(l => l !== '')
          .map(l => l.split(sep || ','));
      },
      base64Decode: function (b64) { return Buffer.from(String(b64), 'base64'); },
      newBlob: function (bytes) {
        return { getDataAsString: function () { return Buffer.from(bytes).toString('utf8'); } };
      },
      getUuid: function () { return 'abcdefgh-0000-0000-0000-000000000000'; }
    },
    console: console
  };
  const montado = A.montar(ctx, GS, ['leerFilasDelFichero_'],
    { dobles: ['excelToSheets_', 'chooseImportSheet_', 'requireAuth_'] });
  /* Las LISTAS DE CABECERAS se leen del archivo, no se copian aquí: una copia
   * se queda vieja sin avisar el día que se añada una columna, y la prueba
   * seguiría verde midiendo un formato que ya no existe. */
  vm.runInContext(A.constantes(GS, ['IMPORT_ALL_HEADERS', 'IMPORT_REQUIRED_HEADERS']), montado);
  return montado;
}

let lector = null, leido = null;
try {
  lector = montarLector();
  leido = lector.leerFilasDelFichero_({
    fileName: 'inventario.csv',
    fileData: Buffer.from(csvDePrueba(FILAS), 'utf8').toString('base64')
  });
} catch (e) {
  check('se pudo montar y correr el lector del fichero', false, e.message);
}

if (leido) {
  check('se pudo montar y correr el lector del fichero', true);

  /* LA COMPROBACIÓN QUE FALTABA, Y ES LA QUE VALE POR TODA LA PRUEBA.
   * Con el fallo puesto, esto daba 500. */
  check('un fichero de ' + FILAS + ' filas se lee ENTERO, no recortado a 500 — ' +
        'es el fallo que perdía 552 filas de Jose',
    leido.parsed.length === FILAS, { leidas: leido.parsed.length, esperadas: FILAS });

  check('...y todas son válidas, así que no hay ninguna excusa para dejarlas fuera',
    leido.parsed.filter(r => r.valid).length === FILAS,
    leido.parsed.filter(r => !r.valid).slice(0, 3));

  check('las nueve columnas del fichero se reconocen, no cinco — unidad, obra, ' +
        'proveedor, PO y comentarios se importaban SIN QUE NADIE LOS VIERA',
    ['category','name','qty','unit','location','project','supplier','po','comments']
      .every(h => leido.col[h] !== -1), leido.col);

  const r1 = leido.parsed[0];
  check('...y de verdad llevan los valores del fichero, no sólo la cabecera',
    r1.unit === 'UNIT' && r1.supplier === 'PROV 1' && r1.po === 'PO1' &&
    r1.project === 'OBRA 1' && r1.comments === 'nota 1', r1);
}

/* ────────────────────────────────────────────────────────────────────────────
 * 2. LA MUESTRA ES UNA MUESTRA, Y NADIE LA PUEDE CONFUNDIR CON LOS DATOS.
 * ──────────────────────────────────────────────────────────────────────────── */
console.log('\n═══ 2. La muestra no es la carga ═══\n');

const srcCommit = A.sinComentarios(A.fnSrc(GS, 'commitImport') || '');
check('`commitImport` existe', !!srcCommit);

/* EL CORAZÓN DEL ARREGLO. Si alguien vuelve a hacer que el guardado use las
 * filas que le mandó el navegador, esto se pone rojo. */
check('`commitImport` YA NO recibe filas del navegador — recibe el fichero y lo ' +
      'vuelve a leer, que es lo único que hace imposible el descuadre',
  !/data\.rows/.test(srcCommit) && /data\.fileData/.test(srcCommit),
  srcCommit.slice(0, 200));
check('...y lo lee con `leerFilasDelFichero_`, la MISMA función que hizo la ' +
      'muestra — dos lectores distintos volverían a poder discrepar',
  /leerFilasDelFichero_\(\s*data\s*\)/.test(srcCommit));

const srcParse = A.sinComentarios(A.fnSrc(GS, 'parseImportFile') || '');
check('la muestra sigue recortada, que está bien: es para mirarla',
  /IMPORT_PREVIEW_ROWS/.test(srcParse));
check('...y viaja el total DE VERDAD junto a ella, para que la pantalla no ' +
      'tenga que deducirlo de lo que recibió — que es como salía «the first ' +
      '100 of 500»',
  /totalRows:\s*parsed\.length/.test(srcParse) && /previewRows:/.test(srcParse));

const srcBrowser = A.sinComentarios(HTML);
check('el navegador manda el FICHERO al confirmar, no las filas',
  /processMovement\('commitImport',\s*_h\(\{[\s\S]{0,200}fileData:/.test(srcBrowser));
check('...y NO manda `rows`, que es lo que perdía las 552',
  !/processMovement\('commitImport',\s*_h\(\{\s*rows:/.test(srcBrowser));
check('la nota bajo la tabla cuenta sobre el total del fichero, no sobre lo ' +
      'recibido',
  /Showing the first[\s\S]{0,80}res\.totalRows/.test(srcBrowser));

/* ────────────────────────────────────────────────────────────────────────────
 * 3. LA HUELLA RECONOCE EL MISMO FICHERO — y distingue uno parecido.
 * ──────────────────────────────────────────────────────────────────────────── */
console.log('\n═══ 3. El mismo fichero dos veces se reconoce ═══\n');

function montarHuella() {
  const ctx = { console: console };
  return A.montar(ctx, GS, ['resumenDeImportacion_'], { dobles: ['normalizeString'] });
}
let huellaCtx = null;
try {
  huellaCtx = montarHuella();
  // `normalizeString` es un doble: aquí sólo hace falta que sea estable.
  huellaCtx.normalizeString = s => String(s || '').trim().toUpperCase();
} catch (e) {
  check('se pudo montar el resumen', false, e.message);
}

if (huellaCtx) {
  check('se pudo montar el resumen', true);
  const filasA = [
    { valid: true, qty: 5,  category: 'WINDOW', name: 'A', location: 'A1' },
    { valid: true, qty: 10, category: 'WINDOW', name: 'B', location: 'A2' }
  ];
  const mismasOtroOrden = [filasA[1], filasA[0]];
  const conUnaMas = filasA.concat(
    [{ valid: true, qty: 1, category: 'WINDOW', name: 'C', location: 'A3' }]);
  /* El caso que una suma sola NO distingue: mismas filas, mismo total, dos
   * cantidades intercambiadas. Es un fichero DISTINTO. */
  const intercambiadas = [
    { valid: true, qty: 10, category: 'WINDOW', name: 'A', location: 'A1' },
    { valid: true, qty: 5,  category: 'WINDOW', name: 'B', location: 'A2' }
  ];

  const hA = huellaCtx.resumenDeImportacion_(filasA);
  check('la huella del mismo fichero es la misma',
    hA.huella === huellaCtx.resumenDeImportacion_(filasA.slice()).huella);
  check('...y no cambia si el fichero sale en otro orden — el mismo inventario ' +
        'exportado dos veces puede venir ordenado distinto',
    hA.huella === huellaCtx.resumenDeImportacion_(mismasOtroOrden).huella);
  check('una fila más ya es otro fichero',
    hA.huella !== huellaCtx.resumenDeImportacion_(conUnaMas).huella);
  check('dos cantidades intercambiadas también, aunque la SUMA sea idéntica — ' +
        'es el caso que una suma sola no distingue',
    hA.huella !== huellaCtx.resumenDeImportacion_(intercambiadas).huella &&
    hA.unidades === huellaCtx.resumenDeImportacion_(intercambiadas).unidades);
  check('y cuenta bien las unidades, que es la otra mitad de la prueba del ácido',
    hA.unidades === 15, hA.unidades);
}

check('`parseImportFile` contesta si ese fichero ya entró antes',
  /alreadyImported:\s*importacionConHuella_/.test(srcParse));
check('y el navegador lo enseña ARRIBA DEL TODO, antes de cualquier botón',
  /box\.innerHTML\s*=\s*avisoRepe\s*\+\s*summary/.test(srcBrowser));
check('...avisando de que SUMA, que es lo que la gente no espera',
  /adds all of it a second time/.test(srcBrowser));

/* AVISA Y DEJA PASAR, que es la regla que eligió Jose para el sobrante de una
 * devolución. Bloquearlo sería impedir el caso legítimo: importé, borré todo,
 * lo quiero rehacer. */
check('pero NO bloquea: el botón de importar sigue ahí',
  /btnCommitImport/.test(srcBrowser));

/* ────────────────────────────────────────────────────────────────────────────
 * 4. SE PUEDE DESHACER — y es lo que protege a quien no leyó el aviso.
 * ──────────────────────────────────────────────────────────────────────────── */
console.log('\n═══ 4. Una importación se puede deshacer ═══\n');

const srcUndo = A.sinComentarios(A.fnSrc(GS, 'undoImport') || '');
check('`undoImport` existe', !!srcUndo);
check('cada fila importada lleva el número de su tanda, que es lo que permite ' +
      'reconocerla después',
  /Imported from file '\s*\+\s*importId/.test(srcCommit));
check('...y el número se genera por importación, no por fila',
  /var importId = 'IMP-'/.test(srcCommit));

check('deshacer manda las filas a la PAPELERA, no las borra — deshacer una ' +
      'importación no puede ser más definitivo que borrar un movimiento',
  /TR\.DELETED_AT/.test(srcUndo) && /TR\.FROM_SHEET/.test(srcUndo));
check('...y escribe en la papelera ANTES de quitarlas de la hoja: al revés, un ' +
      'fallo a mitad las perdería',
  srcUndo.indexOf('trash.getRange') < srcUndo.indexOf('escribirHojaCompleta_'));
check('...reescribiendo la hoja de una vez, no fila a fila — mil `deleteRow` se ' +
      'comerían los seis minutos de Apps Script antes de la fila ciento y pico',
  /escribirHojaCompleta_/.test(srcUndo) && !/deleteRow\(/.test(srcUndo));
check('...y mira también el archivo histórico, porque una importación vieja ' +
      'puede haberse archivado ya',
  /ensureArchiveHistorySheet_/.test(srcUndo));
check('...bajo el candado del almacén, como todo lo que mueve existencias',
  /withStockLock_/.test(srcUndo));
check('...y si no queda nada de esa tanda lo DICE, en vez de contestar que ' +
      'borró cero',
  /may have been undone already/i.test(srcUndo));

check('deshacer avisa a las demás pestañas: saca mil filas del almacén de golpe',
  /undoImport:\s*true/.test(A.sinComentarios(GS)));

/* ────────────────────────────────────────────────────────────────────────────
 * 5. LA PRUEBA DEL ÁCIDO — de la nota de Jose sobre migraciones.
 * ──────────────────────────────────────────────────────────────────────────── */
console.log('\n═══ 5. La suma de antes contra la de después ═══\n');

check('`commitImport` cuenta las unidades ANTES de escribir nada',
  /unidadesEsperadas/.test(srcCommit));
check('...y las que escribió de verdad, y las compara',
  /unidadesEscritas/.test(srcCommit) && /balanced:\s*cuadra/.test(srcCommit));
check('...comparando LAS DOS cosas, filas y unidades: sólo las filas dejaría ' +
      'pasar mil filas con una cantidad mal',
  /res\.rowCount === rows\.length/.test(srcCommit) &&
  /Math\.abs\(unidadesEscritas - unidadesEsperadas\)/.test(srcCommit));
check('un descuadre se registra como ERROR, que es lo que lo hace llegar a ' +
      'alguien en vez de quedarse en la pantalla',
  /logError_\([\s\S]{0,40}'ERROR'[\s\S]{0,200}did not balance/.test(srcCommit));
check('y el resultado se enseña CUADRE O NO — un número que sólo sale cuando ' +
      'algo va mal no se mira nunca, y entonces no sirve para confiar',
  /matches the file/.test(srcBrowser) && /DOES NOT match the file/.test(srcBrowser));

/* ────────────────────────────────────────────────────────────────────────────
 * 6. LO QUE SE VA A CREAR, ANTES DE CREARLO.
 * ──────────────────────────────────────────────────────────────────────────── */
console.log('\n═══ 6. Qué más va a crear esta importación ═══\n');

check('`parseImportFile` dice qué va a crear además de los movimientos',
  /willCreate:\s*loQueCrearia_/.test(srcParse));
const srcCrea = A.sinComentarios(A.fnSrc(GS, 'loQueCrearia_') || '');
check('y cuenta las cuatro: ubicaciones, categorías, obras y proveedores',
  /locations:/.test(srcCrea) && /categories:/.test(srcCrea) &&
  /projects:/.test(srcCrea) && /suppliers:/.test(srcCrea));
check('...con un tope en la muestra: una lista de doscientos nombres deja de ' +
      'informar y pasa a ser una pared',
  /slice\(0,\s*40\)/.test(srcCrea));
check('...pero diciendo el TOTAL además de la muestra, o el tope mentiría',
  /locationsTotal:/.test(srcCrea));
check('y el navegador lo enseña antes del botón, no en el mensaje final',
  /import-will/.test(srcBrowser) &&
  srcBrowser.indexOf('This import will also create') !== -1);

if (fails.length) {
  console.error('\nFALLÓ:\n  ' + fails.join('\n  ') + '\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
