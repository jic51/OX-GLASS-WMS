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
  /* USERS_V3 LLEVA **SÓLO EL NOMBRE**, NUNCA EL CORREO.
   *
   * Aquí decía ['Email', 'Name'] y Jose se quedó fuera de su propia copia: el
   * correo de esa pestaña es LA LLAVE DE ENTRADA —getUserRole() busca ahí el
   * correo de quien abre la app— así que cambiarlo le negó el acceso a él
   * mismo. Tuvo que arreglarlo a mano.
   *
   * Y no se pierde nada al dejarlo: la columna User que se ve en las CAPTURAS
   * es la del archivo de movimientos, y ésa sí se cambia. El correo de
   * USERS_V3 sólo se ve en Manage Users, que no es una pantalla que vaya a la
   * landing. Entre "sale un correo real en una pantalla que nadie publica" y
   * "el dueño no puede entrar", no hay duda. */
  'USERS_V3':          ['Name'],
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
/* LOS GC NO SON PROVEEDORES, Y SE NOTA EN UNA CAPTURA.
 *
 * Al principio los GC salían de la lista de proveedores, y en la copia de Jose
 * quedó "CASCADE GLASSWORKS" como contratista general — un nombre de
 * cristalería haciendo de constructora. A un jefe de bodega, que es justo el
 * público de estas capturas, eso le chirría en dos segundos. Lista propia. */
var CONTRATISTAS = [
  'ALDERWOOD BUILDERS', 'CRESTONE CONSTRUCTION', 'HIGH DESERT CONTRACTING',
  'LONE PEAK BUILDERS', 'SAGEBRUSH CONSTRUCTION', 'WASATCH RIDGE BUILDERS',
  'CANYON GATE CONTRACTING', 'FALCON CREST BUILDERS'
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

// ── CERROJO 3, Y ES OTRA COSA: LOS NOMBRES DE MATERIAL ──────────────────────
//
// EL AGUJERO QUE DEJÓ LA PRIMERA VERSIÓN, y lo enseñó la captura de Jose.
//
// Yo escribí que los nombres de material "ya son códigos y no dicen quién es el
// cliente". **Es falso para una buena parte de ellos.** En su copia, después de
// correr todo lo de arriba, la columna Name seguía diciendo:
//
//     KOTTER RESIDENCE · SUNBRIDGE PHASE 1 · PROVO REMODEL · BULLOCK 11 (ELOISE)
//     BRYLEE 7 (341-347) · DE 043 MILLARD · MH 159 (SGD ADD)
//
// Es decir: **la columna más visible de la app seguía llevando nombres de
// clientes reales**, que es exactamente lo que todo esto existe para evitar.
// Jose nombra muchos materiales por la obra a la que van, y eso es razonable
// para trabajar y es un problema para publicar.
//
// POR QUÉ NO SE HACE AUTOMÁTICO. No hay forma honesta de que este archivo
// adivine cuáles son nombres de cliente: "MH 159 (SGD ADD)" y "SR MM213 TT
// 091026" se parecen mucho vistos desde aquí y sólo uno lo es. Adivinar
// significaría renombrar códigos perfectamente inocentes y dejar pasar alguno
// de verdad. **Así que lo eliges tú**, que eres quien sabe.
//
// ── CÓMO ─────────────────────────────────────────────────────────────────────
//
//   1. Corre  verNombresDeMaterial . Escribe en el registro la lista de todos
//      los nombres distintos que hay, ordenada.
//   2. Copia de ahí los que sean nombres de cliente o de obra y pégalos abajo,
//      entre comillas y separados por comas.
//   3. Pon CERROJO_3 en true y corre  ponerNombresFicticiosDeMaterial .
//   4. **Después, en la app: Settings → System → Rebuild Stock Totals.**
//      NO ES OPCIONAL. La identidad de un material es categoría + nombre, así
//      que al renombrarlo cambia su identidad; la reconstrucción vuelve a
//      calcularla y a rehacer las hojas de existencias desde el archivo. Sin
//      ese paso, el stock queda hablando de materiales que ya no se llaman así.
//
// ES SEGURO EN ESTE ORDEN, y sólo en éste: el Mat ID no se conserva, se
// RECALCULA de categoría + nombre (ver getMaterialId en el código de la app),
// y las hojas LIVE_STOCK / SITE_STOCK / WASTED_STOCK se rehacen enteras desde
// el archivo. Por eso renombrar y reconstruir deja todo cuadrado.
var CERROJO_3 = false;
var MATERIALES_A_RENOMBRAR = [
  // 'KOTTER RESIDENCE',
  // 'SUNBRIDGE PHASE 1',
];

// ════════════════════════════════════════════════════════════════════════════
// A PARTIR DE AQUÍ NO HACE FALTA TOCAR NADA
// ════════════════════════════════════════════════════════════════════════════

/** Escribe en el registro todos los nombres de material distintos. No toca nada. */
function verNombresDeMaterial() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!_hojaEsDemo_(ss)) return;
  var vistos = {};
  HOJAS_CON_MATERIAL.forEach(function (nombre) {
    var h = ss.getSheetByName(nombre);
    if (!h || h.getLastRow() < 2) return;
    var i = _indiceDe_(h, 'Name');
    if (i === -1) return;
    h.getRange(2, i + 1, h.getLastRow() - 1, 1).getValues().forEach(function (r) {
      var v = String(r[0] || '').trim();
      if (v) vistos[v.toUpperCase()] = (vistos[v.toUpperCase()] || 0) + 1;
    });
  });
  var lista = Object.keys(vistos).sort();
  Logger.log('Nombres de material distintos: ' + lista.length);
  Logger.log('');
  Logger.log('Copia abajo los que sean nombres de CLIENTE o de OBRA:');
  Logger.log('');
  lista.forEach(function (n) { Logger.log("  '" + n + "',   // " + vistos[n] + ' fila(s)'); });
}

/** Renombra SÓLO los materiales de MATERIALES_A_RENOMBRAR. Necesita CERROJO_3. */
function ponerNombresFicticiosDeMaterial() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!_hojaEsDemo_(ss)) return;
  if (!CERROJO_3) {
    Logger.log('CERROJO 3 CERRADO. Corre primero verNombresDeMaterial, pega abajo ' +
               'los que sean nombres de cliente, y pon CERROJO_3 = true.');
    return;
  }
  if (!MATERIALES_A_RENOMBRAR.length) {
    Logger.log('La lista MATERIALES_A_RENOMBRAR está vacía: no hay nada que hacer.');
    return;
  }

  // Un nombre nuevo por cada uno, de la lista de obras, y el MISMO en las tres
  // hojas — si no, una salida y su entrada dejarían de ser del mismo material.
  var dic = {}, n = 0;
  MATERIALES_A_RENOMBRAR.forEach(function (m) {
    var k = String(m || '').trim().toUpperCase();
    if (!k || dic[k]) return;
    dic[k] = OBRAS[n % OBRAS.length];
    n++;
  });

  var celdas = 0;
  HOJAS_CON_MATERIAL.forEach(function (nombre) {
    var h = ss.getSheetByName(nombre);
    if (!h || h.getLastRow() < 2) return;
    var i = _indiceDe_(h, 'Name');
    if (i === -1) return;
    var filas = h.getLastRow() - 1;
    var col = h.getRange(2, i + 1, filas, 1).getValues().map(function (r) {
      var v = String(r[0] === null || r[0] === undefined ? '' : r[0]);
      var rep = dic[v.trim().toUpperCase()];
      return [rep ? rep : v];
    });
    h.getRange(2, i + 1, filas, 1).setValues(col);
    celdas += filas;
  });

  Logger.log('Materiales renombrados: ' + Object.keys(dic).length);
  Object.keys(dic).sort().forEach(function (k) { Logger.log('   ' + k + '   →   ' + dic[k]); });
  Logger.log('');
  Logger.log('⚠ AHORA, EN LA APP: Settings → System → Rebuild Stock Totals.');
  Logger.log('  Sin eso el stock sigue hablando de materiales que ya no se llaman así.');
}

// Las hojas que llevan el nombre del material. Las de existencias NO están
// aquí a propósito: se rehacen solas al reconstruir, y escribirlas a mano sería
// pelearse con esa reconstrucción.
var HOJAS_CON_MATERIAL = ['MASTER_ARCHIVE_V3', 'ARCHIVE_HISTORY', 'MOVEMENT_TRASH'];

function _hojaEsDemo_(ss) {
  if (ss.getName().toUpperCase().indexOf(MARCA_OBLIGATORIA) !== -1) return true;
  Logger.log('CERROJO 1: esta hoja se llama "' + ss.getName() + '" y no contiene "' +
             MARCA_OBLIGATORIA + '". Me niego a tocarla.');
  return false;
}

function _indiceDe_(hoja, titulo) {
  var t = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0]
              .map(function (x) { return String(x || '').trim().toUpperCase(); });
  return t.indexOf(String(titulo).toUpperCase());
}

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
  var usados = { obra: 0, prov: 0, gc: 0, pers: 0 };
  var vistos = { obra: {}, prov: {}, gc: {}, pers: {}, correo: {} };

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
  if (t === 'SUPPLIER' || t === 'SUPPLIERS' || t === 'COMPANY') return 'prov';
  if (t === 'GC' || t === 'GCS') return 'gc';
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

  /* `|| 0` EN EL CONTADOR, y no es adorno. Si a este ayudante le llega un
   * contador que no existe —porque alguien añadió una clase nueva arriba y se
   * olvidó de inicializarla—, `lista[undefined % n]` es `lista[NaN]`, que es
   * `undefined`, y entonces esto ESCRIBE LA PALABRA "undefined" en las celdas
   * de una copia de mil filas sin quejarse una sola vez. Lo encontró la prueba
   * al añadir la clase `gc`. Un fallo que produce datos plausibles y falsos es
   * peor que uno que revienta. */
  var pool = clase === 'obra' ? OBRAS
           : clase === 'prov' ? PROVEEDORES
           : clase === 'gc'   ? CONTRATISTAS
           : clase === 'pers' ? PERSONAS
           : null;
  if (!pool) return;
  var i = (usados[clase] || 0);
  dic[key] = pool[i % pool.length];
  usados[clase] = i + 1;
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
