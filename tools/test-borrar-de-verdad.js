// H-09 — LA ✕ DE UN DOCUMENTO BORRA EL FICHERO, NO SÓLO EL ENLACE.
//
// Jose, 26/10: *"podemos cambiar esos documentos y fotos pero nunca eliminarlos
// por completo, no hay opción."*
//
// Tenía razón. La ✕ marcaba la fila, el servidor escribía en `DOC_LINKS` la
// lista que sobrevive, y ahí se acababa: **ni una sola llamada a Drive en todo
// el camino**. El fichero se quedaba en la carpeta del administrador, entero,
// para siempre — y sin ningún enlace que llevara a él, así que nadie lo iba a
// encontrar nunca.
//
// Y lo grave no es el espacio. Es que la persona pulsó ✕, el documento
// desapareció de la pantalla, y concluyó que lo había borrado. Si ese PDF
// llevaba el precio de un proveedor, o la foto de algo que no debía
// fotografiarse, seguía ahí — y la app le había dicho que no.
//
// ── POR QUÉ ESTA PRUEBA EJECUTA Y NO LEE ──────────────────────────────────────
//
// Comprobar que el archivo «contiene setTrashed» no mide nada: lo contendría
// igual si la llamada estuviera detrás de un `if` que nunca se cumple, o
// apuntando al fichero equivocado. Así que aquí corre `updateDocument_` de
// verdad, sobre un Drive de mentira que APUNTA QUIÉN FUE A LA PAPELERA. Lo que
// se comprueba es la lista de ids tirados, no el texto del código.
//
// ── LAS TRES COSAS QUE PODRÍAN SALIR MAL Y SON PEORES QUE NO BORRAR ──────────
//
//  1. Tirar un fichero que NO es nuestro. Un `DOC_LINKS` es una celda, y una
//     celda la puede escribir una persona. Sin la frontera de carpeta, «quitar
//     un documento» sería una forma de mandar a la papelera cualquier fichero
//     del Drive del dueño.
//  2. Tirar un fichero al que todavía apunta otra fila — y la que importa es
//     la de la PAPELERA de movimientos: restaurar un movimiento borrado tiene
//     que devolver sus documentos.
//  3. Que un fallo de Drive tumbe el guardado. La hoja es la fuente de verdad;
//     si Drive falla, lo peor que debe pasar es que ese fichero se quede donde
//     estaba y quede escrito en el registro.
//
// Uso:  node tools/test-borrar-de-verdad.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const A = require(path.join(__dirname, 'andamio.js'));
const ROOT = path.join(__dirname, '..');
const GS   = fs.readFileSync(path.join(ROOT, 'Code_v3_fixed.gs'), 'utf8');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

/* IDS DE DRIVE DE VERDAD, Y NO ES UN DETALLE.
 *
 * Un id de Drive tiene de 25 a 44 caracteres, y `docLinkFileId_` exige 20 o más
 * precisamente para no confundir un id con cualquier palabra que haya quedado
 * en la celda. La primera versión de esta prueba usaba 'ID-UNO' — seis
 * caracteres — así que el extractor devolvía vacío, no se tiraba nada, y la
 * prueba decía en rojo lo que parecía un fallo del producto y era suyo. Un
 * dato de mentira demasiado corto mide otra cosa. */
const IDS = {
  uno:   '1aBcDeFgHiJkLmNoPqRsTuVwX01',
  dos:   '1zYxWvUtSrQpOnMlKjIhGfEdC02',
  ajeno: '1QQQQWWWWEEEERRRRTTTTYYY03',
  nueva: '1AAAASSSSDDDDFFFFGGGGHHH04',
  vieja: '1ZZZZXXXXCCCCVVVVBBBBNNN05',
  otra:  '1MMMMLLLLKKKKJJJJHHHHGGG06'
};

const m = A.marcador('borrar de verdad');
const check = m.check;

// ─── El Drive de mentira ─────────────────────────────────────────────────────
// Guarda en qué carpeta vive cada fichero, porque la frontera es la mitad de
// lo que hay que comprobar: un Drive falso donde todo está "dentro" haría pasar
// en verde a un código sin frontera ninguna.
function hacerDrive(ficheros) {
  const tirados = [], fallos = {};
  const api = {
    getFileById(id) {
      if (!ficheros[id]) throw new Error('File not found: ' + id);
      const f = ficheros[id];
      return {
        getId: () => id,
        getName: () => f.name || id,
        getParents() {
          let dado = false;
          return { hasNext: () => !dado && !!f.carpeta,
                   next() { dado = true; return carpeta(f.carpeta); } };
        },
        setTrashed(v) {
          if (fallos[id]) throw new Error('Drive said no');
          if (v) tirados.push(id);
          return this;
        }
      };
    }
  };
  function carpeta(nombre) {
    return {
      getId: () => 'folder-' + nombre,
      getName: () => nombre,
      getParents: () => ({ hasNext: () => false, next() { throw new Error('no more'); } })
    };
  }
  return { api, tirados, fallos };
}

function nuevoMundo(opciones) {
  opciones = opciones || {};
  const drive = hacerDrive(opciones.ficheros || {});
  const errores = [];

  // MASTER_ARCHIVE_V3: una fila de cabecera y una de datos, con DOC_LINKS en su
  // columna de verdad (la 16, AC.DOC_LINKS = 15).
  const fila = new Array(19).fill('');
  fila[1] = 'WINDOWS';          // AC.CATEGORY
  fila[2] = 'MH 145';           // AC.NAME
  fila[15] = opciones.docLinks !== undefined
    ? opciones.docLinks
    : 'Invoice||' + IDS.uno + '\nPhoto||' + IDS.dos + '';
  const archive = new A.Hoja('MASTER_ARCHIVE_V3',
    [new Array(19).fill('h'), fila]);

  const papelera = new A.Hoja('MOVEMENT_TRASH',
    [new Array(19).fill('h')].concat(opciones.filasPapelera || []));
  const historia = new A.Hoja('ARCHIVE_HISTORY', [new Array(19).fill('h')]);
  const fotos    = new A.Hoja('RACK_PHOTOS',
    [['Location', 'PhotoURL', 'UploadedBy', 'UploadedAt']]
      .concat(opciones.filasFotos || []));

  const hojas = { MASTER_ARCHIVE_V3: archive, MOVEMENT_TRASH: papelera,
                  ARCHIVE_HISTORY: historia, RACK_PHOTOS: fotos };
  const ss = {
    getSheetByName: n => hojas[n] || null,
    insertSheet(n) { hojas[n] = new A.Hoja(n, []); return hojas[n]; },
    getId: () => 'ss-1'
  };

  const ctx = {
    console,
    DriveApp: drive.api,
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss,
      newRichTextValue() {
        let texto = '';
        const b = {
          setText(t) { texto = t; return b; },
          setLinkUrl() { return b; },
          build: () => ({ getText: () => texto })
        };
        return b;
      }
    },
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: () => '' })
    },
    CacheService: { getScriptCache: () => ({ remove() {} }) },
    Session: { getScriptTimeZone: () => 'UTC' },
    Utilities: {
      formatDate: () => '01/01/2026 00:00',
      base64Decode: s => s,
      newBlob: (b, t, n) => ({ b, t, n })
    },
    // Dobles: lo que esta prueba no mide.
    logError_(ss2, sev, lado, fn, quien, msg) { errores.push({ sev, fn, msg }); },
    newRequestId_: () => 'req-1',
    auditLog_() {},
    textCell_: v => v,
    basicNiega_() {},
    requireAuth_: () => ({ email: 'jose@ox.test', role: 'ADMIN' }),
    getOrCreateFolder_: () => ({ createFile: () => ({ getId: () => IDS.nueva }) }),
    docsFolderName_: () => 'OX_WMS_v3_Docs',
    uploadDocGroups_: () => (opciones.subidas || ''),
    uploadFiles_: () => '',
    // La frontera de verdad: la del archivo. Si esto fuera un doble que
    // siempre dice sí, la comprobación 2 de abajo pasaría en verde con el
    // agujero abierto.
    acceptedDocFolderNames_: () => ['OX_WMS_v3_Docs'],
    acceptedDocFolderIds_: () => [],
    ACOPIO_BASIC: false
  };

  // Las constantes del módulo van a mano: `levantar` arrastra funciones, no
  // constantes. `AC` es el mapa de columnas y `SHEETS` los nombres de hoja —
  // sin ellas esto mediría una columna inventada por la prueba, que es la
  // forma más fácil de pasar en verde sin medir el producto.
  vm.createContext(ctx);
  vm.runInContext(A.constantes(GS, ['AC', 'SHEETS']), ctx);

  const caja = A.montar(ctx, GS,
    ['updateDocument_', 'docLinkFileId_', 'docIdSigueEnUso_',
     'trashDroppedDocs_', 'tirarALaPapeleraDeDrive_', 'isFileWithinAppFolder_',
     'uploadRackPhoto', 'deleteRackPhoto', 'richTextForDocLinks_'],
    { dobles: ['logError_', 'newRequestId_', 'auditLog_', 'textCell_',
               'basicNiega_', 'requireAuth_', 'getOrCreateFolder_',
               'docsFolderName_', 'uploadDocGroups_', 'uploadFiles_',
               'acceptedDocFolderNames_', 'acceptedDocFolderIds_'] });

  return { caja, drive, errores, archive, papelera, fotos, ss };
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('el id de Drive, venga como venga');
{
  const w = nuevoMundo({ ficheros: {} });
  const id = w.caja.docLinkFileId_;
  const largo = '1aBcDeFgHiJkLmNoPqRsT';
  check('el id pelado, que es lo que guarda hoy uploadDocGroups_',
    id('Invoice||' + largo) === largo, id('Invoice||' + largo));
  check('la URL de un fichero de Drive',
    id('Invoice||https://drive.google.com/file/d/' + largo + '/view') === largo);
  check('la de lh3, que es la que usan las miniaturas',
    id('Photo||https://lh3.googleusercontent.com/d/' + largo) === largo);
  check('la vieja con ?id=',
    id('Photo||https://drive.google.com/uc?export=view&id=' + largo) === largo);
  check('una línea sin nada devuelve vacío, y vacío significa NO TOCAR NADA',
    id('Invoice||') === '' && id('') === '');
  /* ESTA ES LA QUE IMPIDE EL FALLO SILENCIOSO. Si el extractor no reconoce una
     forma, devuelve '' y el fichero no se tira: volveríamos al fallo original
     sin que nada avisara. Por eso las cuatro formas están medidas una a una. */
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('quitar un documento lo manda a la papelera de Drive');
{
  const w = nuevoMundo({
    ficheros: { [IDS.uno]: { carpeta: 'OX_WMS_v3_Docs' },
                [IDS.dos]: { carpeta: 'OX_WMS_v3_Docs' } }
  });
  const res = w.caja.updateDocument_(w.ss, w.archive,
    { rowIdx: 2, keepLinks: ['Photo||' + IDS.dos + ''] },
    { email: 'jose@ox.test' });

  check('el fichero que se quitó está en la papelera de Drive',
    w.drive.tirados.indexOf(IDS.uno) !== -1, w.drive.tirados);
  check('...y el que se quedó NO — que es la mitad que importa',
    w.drive.tirados.indexOf(IDS.dos) === -1, w.drive.tirados);
  check('la celda queda con lo que sobrevive',
    w.archive.rows[1][15] === 'Photo||' + IDS.dos + '', w.archive.rows[1][15]);
  check('y se dice cuántos fueron, para que el aviso no prometa a ciegas',
    res.trashed === 1 && res.trashFailed === 0, res);
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('quitarlos TODOS vacía la celda y no deja ninguno dentro');
{
  const w = nuevoMundo({
    ficheros: { [IDS.uno]: { carpeta: 'OX_WMS_v3_Docs' },
                [IDS.dos]: { carpeta: 'OX_WMS_v3_Docs' } }
  });
  const res = w.caja.updateDocument_(w.ss, w.archive,
    { rowIdx: 2, keepLinks: [] }, { email: 'jose@ox.test' });

  check('los dos a la papelera', w.drive.tirados.length === 2, w.drive.tirados);
  check('la celda queda vacía', w.archive.rows[1][15] === '', w.archive.rows[1][15]);
  check('y docLinks vuelve como cadena vacía, no como null — son cosas distintas',
    res.docLinks === '', JSON.stringify(res.docLinks));
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('un fichero FUERA de nuestras carpetas no se toca');
{
  /* El caso: alguien escribe a mano en la celda `DOC_LINKS` el id de un
     fichero cualquiera del Drive del dueño y luego lo "quita". Sin la frontera,
     la app se lo lleva a la papelera. */
  const w = nuevoMundo({
    docLinks: 'Mio||' + IDS.ajeno + '\nPhoto||' + IDS.dos + '',
    ficheros: { [IDS.ajeno]: { carpeta: 'Mis cosas personales' },
                [IDS.dos]:   { carpeta: 'OX_WMS_v3_Docs' } }
  });
  const res = w.caja.updateDocument_(w.ss, w.archive,
    { rowIdx: 2, keepLinks: ['Photo||' + IDS.dos + ''] }, { email: 'jose@ox.test' });

  check('NO va a la papelera', w.drive.tirados.length === 0, w.drive.tirados);
  check('queda escrito en el registro de errores, no en silencio',
    w.errores.some(e => /outside the app folder/.test(e.msg)), w.errores);
  check('y se cuenta como lo que no se pudo quitar',
    res.trashed === 0 && res.trashFailed === 1, res);
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('un fichero al que apunta la PAPELERA de movimientos se queda');
{
  /* LA PAREJA QUE HAY QUE RESPETAR. Un movimiento borrado se puede restaurar.
     Restaurarlo sin sus documentos sería devolver media cosa — y es
     exactamente la clase de pareja a medias que este repositorio se encuentra
     una y otra vez. */
  const enPapelera = new Array(19).fill('');
  enPapelera[15] = 'Invoice||' + IDS.uno + '';
  const w = nuevoMundo({
    filasPapelera: [enPapelera],
    ficheros: { [IDS.uno]: { carpeta: 'OX_WMS_v3_Docs' },
                [IDS.dos]: { carpeta: 'OX_WMS_v3_Docs' } }
  });
  w.caja.updateDocument_(w.ss, w.archive,
    { rowIdx: 2, keepLinks: ['Photo||' + IDS.dos + ''] }, { email: 'jose@ox.test' });

  check('el fichero sigue en Drive porque la papelera de movimientos lo usa',
    w.drive.tirados.indexOf(IDS.uno) === -1, w.drive.tirados);
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('si Drive falla, el guardado NO se cae');
{
  const w = nuevoMundo({
    ficheros: { [IDS.uno]: { carpeta: 'OX_WMS_v3_Docs' },
                [IDS.dos]: { carpeta: 'OX_WMS_v3_Docs' } }
  });
  w.drive.fallos[IDS.uno] = true;
  let res = null, estalló = false;
  try {
    res = w.caja.updateDocument_(w.ss, w.archive,
      { rowIdx: 2, keepLinks: ['Photo||' + IDS.dos + ''] }, { email: 'jose@ox.test' });
  } catch (e) { estalló = true; }

  check('no lanza', !estalló);
  check('la celda SÍ se escribió — la hoja es la fuente de verdad y va primero',
    w.archive.rows[1][15] === 'Photo||' + IDS.dos + '', w.archive.rows[1][15]);
  check('y se dice que uno no se pudo quitar, en vez de dar por hecho que sí',
    res && res.trashed === 0 && res.trashFailed === 1, res);
  check('con su línea en el registro',
    w.errores.some(e => /Could not trash/.test(e.msg)), w.errores);
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('subir sin quitar nada no tira nada');
{
  const w = nuevoMundo({
    subidas: 'Nueva||' + IDS.nueva + '',
    ficheros: { [IDS.uno]: { carpeta: 'OX_WMS_v3_Docs' },
                [IDS.dos]: { carpeta: 'OX_WMS_v3_Docs' } }
  });
  const res = w.caja.updateDocument_(w.ss, w.archive,
    { rowIdx: 2, keepLinks: ['Invoice||' + IDS.uno + '', 'Photo||' + IDS.dos + ''],
      docGroups: [{ name: 'Nueva', photos: [{ fileData: 'x' }] }] },
    { email: 'jose@ox.test' });

  check('nada a la papelera', w.drive.tirados.length === 0, w.drive.tirados);
  check('y la nueva se añade al final',
    res.docLinks === 'Invoice||' + IDS.uno + '\nPhoto||' + IDS.dos + '\nNueva||' + IDS.nueva + '', res.docLinks);
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('la foto de un estante: reemplazar ya no deja la vieja tirada');
{
  const w = nuevoMundo({
    filasFotos: [['A1A', IDS.vieja, 'jose@ox.test', new Date()]],
    ficheros: { [IDS.vieja]: { carpeta: 'OX_WMS_v3_Docs' },
                [IDS.nueva]: { carpeta: 'OX_WMS_v3_Docs' } }
  });
  w.caja.uploadRackPhoto({ location: 'a1a', fileData: 'x' },
    { email: 'jose@ox.test' });

  check('la foto vieja fue a la papelera',
    w.drive.tirados.indexOf(IDS.vieja) !== -1, w.drive.tirados);
  check('y la fila apunta a la nueva',
    String(w.fotos.rows[1][1]) === IDS.nueva, w.fotos.rows[1][1]);
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('la foto de un estante: QUITARLA, que no existía');
{
  const w = nuevoMundo({
    filasFotos: [['A1A', IDS.vieja, 'jose@ox.test', new Date()],
                 ['B2B', IDS.otra,  'jose@ox.test', new Date()]],
    ficheros: { [IDS.vieja]: { carpeta: 'OX_WMS_v3_Docs' },
                [IDS.otra]:  { carpeta: 'OX_WMS_v3_Docs' } }
  });
  const res = w.caja.deleteRackPhoto({ location: 'A1A' }, { email: 'jose@ox.test' });

  check('el fichero fue a la papelera de Drive',
    w.drive.tirados.indexOf(IDS.vieja) !== -1, w.drive.tirados);
  check('la fila desapareció', w.fotos.rows.length === 2, w.fotos.rows.length);
  check('...y la del otro estante sigue ahí, que es la mitad que importa',
    String(w.fotos.rows[1][0]) === 'B2B', w.fotos.rows[1][0]);
  check('lo dice', res.removed === true && res.trashed === true, res);
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('quitar una foto que no está no es un error');
{
  const w = nuevoMundo({ filasFotos: [], ficheros: {} });
  let estalló = false, res = null;
  try { res = w.caja.deleteRackPhoto({ location: 'Z9Z' }, { email: 'j@ox.test' }); }
  catch (e) { estalló = true; }
  /* La pantalla puede ir un paso por detrás de la hoja —otra persona la quitó
     hace un segundo— y eso no es culpa de quien pulsa. */
  check('no lanza y dice que no había nada', !estalló && res && res.removed === false, res);
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('y en el navegador se AVISA antes, porque ahora sí pasa algo');
{
  const sin = A.sinComentarios(HTML);
  check('quitar documentos pasa por el aviso de confirmación',
    /quitados\s*>\s*0[\s\S]{0,400}_showConfirm\(/.test(sin));
  check('...que dice que va a la papelera de Drive',
    /Drive trash/.test(sin));
  check('...y que se puede recuperar 30 días, que es lo que lo hace pulsable',
    /back for 30 days/.test(sin));
  check('el guardado de verdad está en su propia función, detrás del aviso',
    /function _submitAttachmentYa\(/.test(sin));
  check('el botón de quitar la foto de un estante existe y está cableado',
    /data-action="rack-photo-remove"/.test(sin) &&
    /'rack-photo-remove'[\s\S]{0,120}_quitarFotoDeEstante\(/.test(sin));
  check('y la foto de un estante también pregunta antes',
    /function _quitarFotoDeEstante\([\s\S]{0,600}_showConfirm\(/.test(sin));
  /* Y LO QUE NO PUEDE PASAR: que el aviso diga «borrado» a secas. La app
     promete la papelera de Drive, no la destrucción, y prometer de más es el
     fallo que H-09 era al revés. */
  /* Y SE MIRA SÓLO LO NUESTRO, no el archivo entero: hay otro aviso, el de
     borrar una entrega esperada, que sí dice «permanently deleted» y hace bien
     — ahí no hay papelera de Drive de por medio. Una prueba que busque esa
     frase en todo el archivo mide el aviso de otro. */
  const dosAvisos =
    (/function submitAttachment\(\)[\s\S]{0,1800}?\n\}/.exec(sin) || [''])[0] +
    (/function _quitarFotoDeEstante\([\s\S]{0,2200}?\n\}/.exec(sin) || [''])[0];
  check('los dos avisos existen de verdad para poder mirarlos',
    dosAvisos.length > 600, dosAvisos.length);
  check('no se promete un borrado definitivo en ninguno de los dos avisos',
    !/permanently delete/i.test(dosAvisos) && !/forever/i.test(dosAvisos));
}

m.fin();
