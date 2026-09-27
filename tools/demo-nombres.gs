/**
 * NOMBRES FICTICIOS PARA UNA COPIA DE DEMOSTRACIÓN.
 *
 * PARA QUÉ. Jose quiere capturas y un vídeo para acopio.net, y la copia de
 * pruebas ("MY WAREHOUSE") lleva los datos reales de OX Glass. En las capturas
 * que ya ha mandado esta semana se leen, sin esforzarse: obras y clientes
 * (KOTTER RESIDENCE, LIBERTY WELLS TOWNHOMES), proveedores (AMSCO, ALSIDE,
 * MILGARD, HARTUNG), empleados por su nombre, y su correo personal en cada fila
 * de la columna User.
 *
 * Una landing la lee la competencia. Publicar eso es regalar la lista de
 * clientes y de proveedores de OX Glass, y poner los nombres de sus empleados
 * en internet sin que ellos lo hayan decidido.
 *
 * LO QUE ESTE ARCHIVO **NO** HACE, y es la mitad importante: NO inventa un
 * almacén. Jose tenía razón en esto —"los datos reales son mejores que los
 * inventados"— y el almacén se queda exactamente como está: las mismas
 * cantidades, las mismas fechas, los mismos estantes, las mismas categorías,
 * el mismo desorden. Lo único que cambia son los NOMBRES PROPIOS, y cambian de
 * forma CONSISTENTE: "KOTTER RESIDENCE" es siempre "MAPLE STREET REMODEL", en
 * las mil filas y en las cuatro pestañas. Si no fuera consistente, el stock
 * dejaría de cuadrar y las capturas enseñarían un almacén roto.
 *
 * Por eso tampoco toca los nombres de MATERIAL: la identidad de un material es
 * categoría + nombre, y renombrarlos partiría el inventario en dos. Los nombres
 * de material de Jose ya son códigos (SR MM213 TT 091026, LGI DE 11 DELANO) y
 * no dicen quién es el cliente.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * ⛔ ESTO NO SE CORRE NUNCA EN LA HOJA DE TRABAJO
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Reescribe texto en sitio y NO se puede deshacer desde aquí. Va en una copia
 * hecha para esto y para nada más. Hay dos cerrojos abajo y los dos hay que
 * abrirlos a mano; están puestos porque un error aquí no se nota hasta que
 * alguien busca una obra y no existe.
 *
 * ── CÓMO SE USA — PRIMERO MIRAR, LUEGO TOCAR ────────────────────────────────
 *
 *   1. Haz una copia NUEVA de tu copia de pruebas (Archivo → Hacer una copia) y
 *      ponle un nombre que lleve la palabra DEMO. Trabaja sólo en ésa.
 *   2. En esa copia: Extensiones → Apps Script → Archivo → Nuevo → Secuencia de
 *      comandos. Llámalo "demo-nombres" y pega TODO este archivo.
 *   3. Elige la función  verQueCambiaria  y dale a Ejecutar. NO CAMBIA NADA:
 *      lee, cuenta, y escribe en el registro la lista de nombres que tocaría y
 *      por cuál cambiaría cada uno.
 *   4. Lee el registro (Ver → Registros de ejecución). Si algún nombre real se
 *      le escapó, añádelo abajo en CAMPOS o en el diccionario y vuelve al 3.
 *   5. Cuando la lista esté bien: pon  CERROJO_2  en true, elige
 *      ponerNombresFicticios  y ejecuta. ESE SÍ ESCRIBE.
 *   6. Borra esta secuencia de comandos de la copia cuando termines.
 *
 * SON DOS PASOS A PROPÓSITO. Ver antes de tocar es lo único que impide
 * descubrir un error DESPUÉS de haberlo escrito encima de mil filas.
 */

// ── CERROJO 1 ───────────────────────────────────────────────────────────────
// El nombre de la hoja tiene que CONTENER esta palabra. La hoja de trabajo de
// Jose se llama "OX Glass LLC. — Acopio" y no la contiene, así que este archivo
// se niega a tocarla aunque alguien lo pegue ahí por equivocación.
var MARCA_OBLIGATORIA = 'DEMO';

// ── CERROJO 2 ───────────────────────────────────────────────────────────────
// Hay que ponerlo a mano en true antes de que `ponerNombresFicticios` escriba.
// Un solo cerrojo se abre sin leer; dos obligan a volver aquí.
var CERROJO_2 = false;

// ── QUÉ COLUMNAS LLEVAN NOMBRES PROPIOS ─────────────────────────────────────
//
// Por nombre de pestaña y por TÍTULO de columna, no por letra: las columnas se
// reordenan y una letra escrita aquí apuntaría mañana a otra cosa. Si una
// pestaña o un título no existe en esta copia, se salta sin quejarse — no todas
// las instalaciones tienen las mismas.
var CAMPOS = {
  'MASTER_ARCHIVE_V3': ['GC', 'Supplier', 'Responsible', 'Project', 'User', 'PM', 'Comments'],
  'ARCHIVE_HISTORY':   ['GC', 'Supplier', 'Responsible', 'Project', 'User', 'PM', 'Comments'],
  'MOVEMENT_TRASH':    ['GC', 'Supplier', 'Responsible', 'Project', 'User', 'PM', 'Comments'],
  'LIVE_STOCK':        ['Supplier', 'Project'],
  'SITE_STOCK':        ['Supplier', 'Project'],
  'WASTED_STOCK':      ['Supplier', 'Project'],
  'INCOMING_V3':       ['Supplier', 'Project', 'PM', 'GC', 'Notes', 'Created By'],
  'PM_DIRECTORY':      ['Name', 'Email', 'Phone', 'Company'],
  'USERS_V3':          ['Email', 'Name'],
  'AUDIT_LOG':         ['User', 'Detail', 'Before', 'After'],
  'ERROR_LOG':         ['User', 'Message', 'Context']
};

// CONFIG lleva los catálogos en columnas, y ahí los títulos mandan igual.
var CAMPOS_CONFIG = ['Projects', 'Suppliers', 'PMs', 'GCs'];

// ── LOS NOMBRES DE MENTIRA ──────────────────────────────────────────────────
//
// Suenan a construcción en Utah porque tienen que sonar creíbles en una
// captura: una landing con obras llamadas "Proyecto 1" y proveedores "ACME" no
// convence a un jefe de bodega. No corresponden a ninguna empresa real conocida;
// si alguna coincidiera por casualidad, se cambia aquí y se vuelve a correr.
var OBRAS = [
  'MAPLE STREET REMODEL', 'CEDAR RIDGE TOWNHOMES', 'STONEGATE PHASE 2',
  'WILLOW CREEK RESIDENCE', 'NORTH FORK APARTMENTS', 'ASPEN HOLLOW LOT 14',
  'BIRCH POINT DUPLEX', 'SUMMIT VIEW REMODEL', 'RIVER BEND PHASE 1',
  'GRANITE PARK OFFICES', 'ELM COURT RESIDENCE', 'FOXGLOVE MEADOWS',
  'HARBOR LANE ADDITION', 'JUNIPER FLATS', 'KESTREL RIDGE LOT 7',
  'LAKESHORE TERRACE', 'MILLPOND COMMONS', 'NEWPORT HILL HOUSE',
  'ORCHARD GATE PHASE 3', 'PINECREST RESIDENCE'
];
var PROVEEDORES = [
  'NORTHGATE SUPPLY', 'CASCADE GLASSWORKS', 'FOUR PEAKS MILLWORK',
  'IRONWOOD WINDOWS', 'BLUE MESA DISTRIBUTION', 'REDROCK BUILDING PRODUCTS',
  'SILVERLINE COMPONENTS', 'TIMBERLINE SUPPLY CO'
];
var PERSONAS = [
  'SAM OKONKWO', 'RILEY TANAKA', 'JORDAN MBEKI', 'CASEY LINDQVIST',
  'AVERY NDIAYE', 'QUINN HALVORSEN', 'ROWAN DELACROIX', 'SKYLER BRENNAN',
  'PARKER ESPINOZA', 'MORGAN ADEYEMI', 'DREW KOWALCZYK', 'EMERSON VILLALOBOS'
];
var DOMINIO_DEMO = 'demo-glass.example';

// ════════════════════════════════════════════════════════════════════════════
// A PARTIR DE AQUÍ NO HACE FALTA TOCAR NADA
// ════════════════════════════════════════════════════════════════════════════

/** Mira y cuenta. No escribe una sola celda. */
function verQueCambiaria() {
  _correr_(false);
}

/** Escribe. Necesita CERROJO_2 = true. */
function ponerNombresFicticios() {
  if (!CERROJO_2) {
    Logger.log('CERROJO 2 CERRADO. Corre primero verQueCambiaria, lee el ' +
               'registro, y cuando la lista esté bien pon CERROJO_2 = true.');
    return;
  }
  _correr_(true);
}

function _correr_(escribir) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var nombreHoja = ss.getName();
  if (nombreHoja.toUpperCase().indexOf(MARCA_OBLIGATORIA) === -1) {
    Logger.log('CERROJO 1: esta hoja se llama "' + nombreHoja + '" y no contiene "' +
               MARCA_OBLIGATORIA + '". Me niego a tocarla. Haz una copia con esa ' +
               'palabra en el nombre y córrelo allí.');
    return;
  }

  /* EL DICCIONARIO SE CONSTRUYE ENTERO ANTES DE ESCRIBIR NADA.
   *
   * Es lo que hace que el cambio sea consistente: el mismo texto recibe el
   * mismo reemplazo en las once pestañas. Si cada pestaña se resolviera por su
   * cuenta, "KOTTER RESIDENCE" sería una obra en el archivo y otra distinta en
   * LIVE_STOCK, y el stock dejaría de cuadrar con su historial — que es
   * exactamente lo que una captura no puede enseñar. */
  var dic = {};                 // ORIGINAL en mayúsculas → reemplazo
  var usados = { obra: 0, prov: 0, pers: 0 };
  var vistos = { obra: {}, prov: {}, pers: {}, correo: {} };

  var hojas = _hojasQueExisten_(ss);
  hojas.forEach(function (h) {
    h.campos.forEach(function (c) {
      c.valores.forEach(function (v) {
        _registrar_(v, c.clase, dic, usados, vistos);
      });
    });
  });

  Logger.log('Hoja: ' + nombreHoja);
  Logger.log('Pestañas encontradas: ' + hojas.map(function (h) { return h.nombre; }).join(', '));
  Logger.log('Nombres distintos que se cambiarían: ' + Object.keys(dic).length);
  Logger.log('');
  Object.keys(dic).sort().forEach(function (k) {
    Logger.log('   ' + k + '   →   ' + dic[k]);
  });
  Logger.log('');

  if (!escribir) {
    Logger.log('NO SE ESCRIBIÓ NADA. Si la lista está bien, pon CERROJO_2 = true ' +
               'y corre ponerNombresFicticios.');
    return;
  }

  var celdas = 0;
  hojas.forEach(function (h) {
    h.campos.forEach(function (c) {
      var col = c.valores.map(function (v) { return [_sustituir_(v, dic)]; });
      if (!col.length) return;
      // Una escritura por columna, y sólo de esa columna: nada de esto puede
      // tocar una cantidad, una fecha ni un estante.
      h.hoja.getRange(2, c.indice + 1, col.length, 1).setValues(col);
      celdas += col.length;
    });
  });
  Logger.log('Listo. Celdas reescritas: ' + celdas);
  Logger.log('Las cantidades, fechas, estantes y categorías NO se tocaron.');
}

/** Las pestañas de CAMPOS que existen de verdad, con sus columnas resueltas. */
function _hojasQueExisten_(ss) {
  var out = [];
  Object.keys(CAMPOS).forEach(function (nombre) {
    var hoja = ss.getSheetByName(nombre);
    if (!hoja || hoja.getLastRow() < 2) return;
    var ancho  = hoja.getLastColumn();
    var titulos = hoja.getRange(1, 1, 1, ancho).getValues()[0]
                      .map(function (t) { return String(t || '').trim().toUpperCase(); });
    var filas = hoja.getLastRow() - 1;
    var campos = [];
    CAMPOS[nombre].forEach(function (titulo) {
      var i = titulos.indexOf(titulo.toUpperCase());
      if (i === -1) return;                       // esta copia no tiene esa columna
      campos.push({
        indice:  i,
        titulo:  titulo,
        clase:   _claseDe_(titulo),
        valores: hoja.getRange(2, i + 1, filas, 1).getValues()
                     .map(function (r) { return String(r[0] === null || r[0] === undefined ? '' : r[0]); })
      });
    });
    if (campos.length) out.push({ nombre: nombre, hoja: hoja, campos: campos });
  });

  // CONFIG, que guarda los catálogos en columnas con título.
  var cfg = ss.getSheetByName('CONFIG');
  if (cfg && cfg.getLastRow() > 1) {
    var anchoC  = cfg.getLastColumn();
    var titC    = cfg.getRange(1, 1, 1, anchoC).getValues()[0]
                     .map(function (t) { return String(t || '').trim().toUpperCase(); });
    var filasC  = cfg.getLastRow() - 1;
    var camposC = [];
    CAMPOS_CONFIG.forEach(function (titulo) {
      var i = titC.indexOf(titulo.toUpperCase());
      if (i === -1) return;
      camposC.push({
        indice:  i,
        titulo:  titulo,
        clase:   _claseDe_(titulo),
        valores: cfg.getRange(2, i + 1, filasC, 1).getValues()
                    .map(function (r) { return String(r[0] === null || r[0] === undefined ? '' : r[0]); })
      });
    });
    if (camposC.length) out.push({ nombre: 'CONFIG', hoja: cfg, campos: camposC });
  }
  return out;
}

/** Qué clase de nombre lleva una columna, por su título. */
function _claseDe_(titulo) {
  var t = String(titulo).toUpperCase();
  if (t === 'PROJECT' || t === 'PROJECTS') return 'obra';
  if (t === 'SUPPLIER' || t === 'SUPPLIERS' || t === 'GC' || t === 'GCS' ||
      t === 'COMPANY') return 'prov';
  if (t === 'USER' || t === 'EMAIL') return 'correo';
  if (t === 'RESPONSIBLE' || t === 'PM' || t === 'PMS' || t === 'NAME' ||
      t === 'CREATED BY') return 'pers';
  // Comentarios, notas y registros: texto libre. No se les asigna nombre nuevo;
  // se les aplica el diccionario que construyen las demás columnas, que es como
  // se limpia "ENTREGADO A KOTTER RESIDENCE" escrito a mano en un comentario.
  return 'libre';
}

/** Apunta un valor en el diccionario si le toca nombre nuevo. */
function _registrar_(valor, clase, dic, usados, vistos) {
  var v = String(valor || '').trim();
  if (!v || clase === 'libre') return;

  if (clase === 'correo') {
    // Un correo se reemplaza por otro correo, no por un nombre: la columna User
    // se lee como correo en la app y un nombre suelto ahí se vería raro en la
    // captura, que es justo lo que se está cuidando.
    var k = v.toUpperCase();
    if (dic[k]) return;
    if (!vistos.correo[k]) {
      vistos.correo[k] = 1;
      var persona = PERSONAS[usados.pers % PERSONAS.length];
      usados.pers++;
      dic[k] = persona.toLowerCase().split(' ')[0] + '@' + DOMINIO_DEMO;
    }
    return;
  }

  var key = v.toUpperCase();
  if (dic[key]) return;
  if (clase === 'obra') { dic[key] = OBRAS[usados.obra % OBRAS.length];        usados.obra++; }
  else if (clase === 'prov') { dic[key] = PROVEEDORES[usados.prov % PROVEEDORES.length]; usados.prov++; }
  else if (clase === 'pers') { dic[key] = PERSONAS[usados.pers % PERSONAS.length];  usados.pers++; }
}

/** Aplica el diccionario a un valor, entero o dentro de un texto libre. */
function _sustituir_(valor, dic) {
  var v = String(valor === null || valor === undefined ? '' : valor);
  if (!v) return v;

  // Coincidencia EXACTA primero: es el caso normal (una celda que es un nombre).
  var exacto = dic[v.trim().toUpperCase()];
  if (exacto) return exacto;

  /* Y DENTRO DE UN TEXTO LIBRE, de la clave más larga a la más corta.
   *
   * El orden importa: si "KOTTER" y "KOTTER RESIDENCE" estuvieran los dos en el
   * diccionario y se aplicara el corto primero, quedaría "MAPLE STREET
   * RESIDENCE" — medio nombre real, medio inventado, que es peor que no haber
   * tocado nada porque parece limpio y no lo está. */
  var claves = Object.keys(dic).sort(function (a, b) { return b.length - a.length; });
  var salida = v;
  for (var i = 0; i < claves.length; i++) {
    var k = claves[i];
    if (k.length < 4) continue;              // demasiado corto: daría falsos positivos
    var re = new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    salida = salida.replace(re, dic[k]);
  }
  return salida;
}
