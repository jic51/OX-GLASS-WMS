// LA VERSIÓN GRATIS TIENE QUE ESCRIBIR IGUAL QUE LA DE PAGO.
//
// Jose, 18/10: *"aun si el usuario decide usar acopio basico, la app debe
// guardar en el sheet toda la informacion como la guarda actualmente, con todos
// los datos, porque si el cliente decide en algun momento pasarse a la version
// pro, la app debe mostrar todos los datos ya desde el momento que se actualice
// la app, sino, pasaremos mucho tiempo arreglando todo"*.
//
// Tiene razón, y la consecuencia es más dura de lo que suena:
//
//   · Si la gratis escribe LO MISMO, pasar a Pro es cambiar el código y ya.
//   · Si escribiera algo reducido, pasar a Pro sería escribir una MIGRACIÓN —
//     y habría que acordarse de ampliarla cada vez que Pro ganara una columna.
//
// Eso segundo es, literalmente, la forma de fallo que este proyecto lleva doce
// veces pagando: DOS COSAS QUE TIENEN QUE COINCIDIR SIN QUE NADA LO OBLIGUE.
//
// ── POR QUÉ ESTA PRUEBA Y NO UNA REGLA ESCRITA ──────────────────────────────
//
// Porque una regla escrita es exactamente lo que falla. «Acuérdate de que la
// constante no toque el camino de escritura» es una nota que alguien lee seis
// meses después, con prisa, o no lee. Esto no se acuerda: falla.
//
// Lo que defiende es que `ACOPIO_BASIC` **no aparezca** en las funciones que
// escriben, leen o calculan filas. Mientras no aparezca, «la gratis escribe
// igual» no es una promesa — es que NO EXISTE código que pudiera escribir
// distinto, porque sólo hay un camino y no sabe en qué edición está.
//
// ── Y SE MIRA EL CÓDIGO, NO LOS COMENTARIOS ─────────────────────────────────
//
// En este repositorio los comentarios son más largos que el código a propósito,
// y el de `ACOPIO_BASIC` nombra `AC`, `appendRow` y la propia constante varias
// veces para explicar justo lo que tiene prohibido. Buscar el texto crudo haría
// que la prohibición contara como el delito — medir la letra en vez de la
// intención, y de ésas ya van varias. Por eso `soloCodigo()`.
//
// Uso:  node tools/test-gratis-escribe-igual.js [path/to/Code_v3_fixed.gs]

const fs = require('fs'), path = require('path'), vm = require('vm');

const RAIZ  = path.join(__dirname, '..');
const GS    = process.argv[2] || path.join(RAIZ, 'Code_v3_fixed.gs');
const HTML  = path.join(RAIZ, 'Index_v3_fixed.html');
const MPRO  = path.join(RAIZ, 'appsscript.json');
const MFREE = path.join(RAIZ, 'appsscript.basic.json');

const src  = fs.readFileSync(GS, 'utf8');
const html = fs.readFileSync(HTML, 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FALLA ' + label + (extra === undefined ? '' : '  → ' + JSON.stringify(extra))); }
}

function soloCodigo(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
}

function cuerpo(nombre) {
  const re = new RegExp('^function ' + nombre + '\\s*\\([\\s\\S]*?\\n\\}', 'm');
  const m = src.match(re);
  if (!m) throw new Error('no se encontró ' + nombre + ' en ' + path.basename(GS));
  return m[0];
}

const codigo = soloCodigo(src);

console.log('\n═══ 1. EL INTERRUPTOR EXISTE, Y HAY UNO SOLO ═══\n');
{
  const decls = codigo.match(/\bvar\s+ACOPIO_BASIC\s*=/g) || [];
  check('`ACOPIO_BASIC` está declarado', decls.length >= 1);
  check('...y una sola vez — dos declaraciones es volver a tener dos cosas que ' +
        'coinciden sin que nada lo obligue',
    decls.length === 1, decls.length);

  check('el archivo que se publica es el de PAGO (la constante va en `false`); ' +
        'la versión gratis se hace cambiando esta línea, no al revés',
    /\bvar\s+ACOPIO_BASIC\s*=\s*false\s*;/.test(codigo));
}

console.log('\n═══ 2. VIAJA AL NAVEGADOR — UNA FUENTE, NO DOS ═══\n');
{
  check('`getInitialData` manda la edición al navegador',
    /basic:\s*ACOPIO_BASIC/.test(codigo));

  /* LOS TRES CAMINOS, Y NO UNO.
   *
   * `getInitialData` tiene tres salidas: NO_SESSION, DENIED y la buena. Si la
   * bandera viajara sólo por la buena, la pantalla de inicio de sesión no
   * sabría en qué edición está — y es justo la pantalla que la versión gratis
   * tiene que saltarse, porque no lleva usuarios. */
  const salidas = (codigo.match(/basic:\s*ACOPIO_BASIC/g) || []).length;
  check('...por los TRES caminos de salida, no sólo por el bueno ' +
        '(NO_SESSION y DENIED también, que es donde vive el inicio de sesión)',
    salidas >= 3, salidas);

  check('el navegador NO declara su propia copia de la constante — ' +
        'dos líneas que hay que cambiar a la vez es el fallo de siempre',
    !/\bvar\s+ACOPIO_BASIC\s*=/.test(soloCodigo(html)));
}

console.log('\n═══ 3. EL CAMINO DE ESCRITURA NO SABE QUÉ EDICIÓN ES ═══\n');
{
  /* Éstas son las funciones por las que pasa una fila: la que la escribe, la
   * que la lee de vuelta, las que la rellenan hasta el ancho bueno, la que
   * decide el movimiento y el motor que cuenta las existencias.
   *
   * Si la constante entra en cualquiera de ellas, la versión gratis puede
   * empezar a escribir distinto sin que nadie se entere hasta que un cliente
   * actualice a Pro y le falten datos. */
  const PROHIBIDAS = [
    ['addMovementsBatch_',   'escribe las filas en el archivo'],
    ['parseArchiveRow',      'las vuelve a leer'],
    ['padRow_',              'las rellena hasta el ancho'],
    ['ensureArchiveWidth_',  'ensancha la hoja'],
    ['processMovementInner_','decide qué movimiento es'],
    ['calculateStock',       'cuenta las existencias'],
  ];

  PROHIBIDAS.forEach(function (par) {
    const nombre = par[0], que = par[1];
    let cuerpoLimpio;
    try { cuerpoLimpio = soloCodigo(cuerpo(nombre)); }
    catch (e) { check('existe ' + nombre, false, e.message); return; }
    check('`' + nombre + '` (' + que + ') no menciona ACOPIO_BASIC',
      !/ACOPIO_BASIC/.test(cuerpoLimpio));
  });
}

console.log('\n═══ 4. EL MAPA DE COLUMNAS ES FIJO, NO CONDICIONAL ═══\n');
{
  check('`AC_WIDTH` es un número suelto, no una cuenta con condiciones',
    /var AC_WIDTH = \d+;/.test(codigo));

  const mAC = codigo.match(/var AC = \{[\s\S]*?\n\};/);
  check('`AC` se puede leer entero', !!mAC);
  if (mAC) {
    check('...y no mira la edición: el mapa de columnas es el mismo en gratis y ' +
          'en Pro, que es toda la razón de que actualizar no necesite migración',
      !/ACOPIO_BASIC/.test(mAC[0]));
    check('...ni tiene condiciones de ningún tipo dentro',
      !/[?:]\s*\d+\s*,/.test(mAC[0].replace(/:\s*\d+\s*,/g, ',')));
  }
}

console.log('\n═══ 5. LOS DOS MANIFIESTOS ═══\n');
{
  check('existe el manifiesto de la versión gratis', fs.existsSync(MFREE));
  if (fs.existsSync(MFREE)) {
    const free = JSON.parse(fs.readFileSync(MFREE, 'utf8'));
    const sc = free.oauthScopes || [];

    /* UN SOLO PERMISO, Y NO SENSIBLE. ÉSTE ES EL NÚMERO QUE DECIDE TODO.
     *
     * Medido el 17/10 con dos copias limpias: con `container.ui` dentro —que la
     * consola de Cloud clasifica como SENSIBLE— sale la pantalla de «Google no
     * ha verificado esta aplicación». Con sólo `spreadsheets.currentonly`, no
     * sale. Si alguien añade un permiso aquí, la pantalla fea vuelve y con ella
     * se cae el argumento entero de la versión gratis. */
    check('la versión gratis pide UN permiso y sólo uno', sc.length === 1, sc);
    check('...y es `spreadsheets.currentonly`, el no sensible',
      sc[0] === 'https://www.googleapis.com/auth/spreadsheets.currentonly', sc[0]);
    check('NO pide `script.container.ui` — es el sensible, el de la pantalla fea',
      sc.indexOf('https://www.googleapis.com/auth/script.container.ui') === -1);

    /* EL PORTERO DE LA VERSIÓN GRATIS ES ESTA LÍNEA.
     *
     * Sin detección de usuarios no hay sesión que comprobar dentro de la app,
     * así que el control de acceso lo pone Google: sólo el dueño de la copia
     * abre su dirección. Si esto dijera ANYONE, cualquiera con el enlace
     * escribiría en el inventario de otro. */
    check('se despliega con `access: MYSELF` — sin usuarios dentro, el portero ' +
          'es el despliegue, y es también el muro entre gratis y Pro',
      free.webapp && free.webapp.access === 'MYSELF',
      free.webapp && free.webapp.access);
  }

  const pro = JSON.parse(fs.readFileSync(MPRO, 'utf8'));
  check('el manifiesto de PAGO sigue intacto — son dos archivos distintos y ' +
        'uno no sustituye al otro',
    (pro.oauthScopes || []).length > 1, (pro.oauthScopes || []).length);
}

console.log('\n═══ 6. LAS TRES FORMAS DE APAGAR, Y EL CENSO DE HOJAS ═══\n');
{
  check('existe `basicApagado_()` — la forma CALLAR',
    /function basicApagado_\s*\(/.test(codigo));
  check('existe `basicNiega_()` — la forma NEGAR',
    /function basicNiega_\s*\(/.test(codigo));
  check('el mensaje de `basicNiega_` va en inglés, como el resto de la app',
    /is not part of Acopio Basic/.test(src));

  /* ── EL CENSO ────────────────────────────────────────────────────────────
   *
   * POR QUÉ ESTO SE CUENTA EN VEZ DE APUNTARSE.
   *
   * Lo primero que se intentó fue poner la puerta en las 102 funciones
   * globales que el navegador puede llamar. El recorrido de llamadas dijo que
   * 60 de esas 102 tocan —directa o indirectamente— un servicio que la versión
   * básica no tiene permiso para usar, y entre ellas estaban `processMovement`,
   * `addMultiEntry` y `getInitialData`.
   *
   * O sea que los permisos fuertes no viven aparte: están enhebrados por el
   * centro. Cerrar esas puertas no apagaría funciones de lujo, apagaría el
   * producto. El apagado tiene que ir en las HOJAS, donde se toca el servicio.
   *
   * Y las hojas son muchas y se añaden solas: cualquiera que escriba un
   * `MailApp.sendEmail` nuevo dentro de seis meses crea una. Una lista escrita
   * a mano de «las que faltan» volvería a ser dos cosas que tienen que
   * coincidir sin que nada lo obligue. Por eso se cuentan: el número puede
   * BAJAR cuando se apague una, y no puede SUBIR sin que esta prueba lo diga. */
  const SERVICIOS = {
    'DriveApp':                  'drive',
    'DocumentApp':               'documents',
    'MailApp':                   'send_mail',
    'GmailApp':                  'gmail',
    'UrlFetchApp':               'external_request',
    'ScriptApp':                 'scriptapp',
    'Session\\.get\\w*User':     'userinfo.email',
    '\\.getUi\\(\\)':            'container.ui',
  };

  /* CÓMO SE RECORTA CADA FUNCIÓN, Y DÓNDE SE QUEDA CORTO.
   *
   * De `function X(` hasta la primera `}` a principio de línea. Con una función
   * de UNA SOLA LÍNEA —`function f(a) { return a; }`— ese cierre no existe,
   * así que el recorte se come lo que viene detrás y le atribuye servicios que
   * no usa.
   *
   * Se deja así a sabiendas porque el error va en la dirección segura: infla la
   * cuenta de pendientes, nunca la baja. Un censo que sobra avisa de más; uno
   * que falta no avisa. Las que se apagan a mano se comprueban por su nombre
   * en la lista de arriba, y ésas sí son funciones de varias líneas. */
  const todas = {};
  const reFn = /^function ([A-Za-z_][A-Za-z0-9_]*)\s*\([\s\S]*?\n\}/gm;
  let mm; while ((mm = reFn.exec(src))) todas[mm[1]] = soloCodigo(mm[0]);

  const hojas = Object.keys(todas).filter(function (f) {
    return Object.keys(SERVICIOS).some(function (sv) { return new RegExp(sv).test(todas[f]); });
  });

  const apagada = function (f) { return /basicApagado_\s*\(|basicNiega_\s*\(/.test(todas[f]); };
  const sinApagar = hojas.filter(function (f) { return !apagada(f); });

  check('hay hojas que tocan servicios que la versión básica no puede usar — ' +
        'si esto diera cero, el censo estaría roto, no el código',
    hojas.length > 0, hojas.length);

  /* LAS QUE YA ESTÁN, UNA POR UNA. El censo de abajo vigila que no crezcan las
   * que faltan; esto vigila que no se deshagan las que ya se hicieron. */
  ['onOpen', 'getUserRole', 'requireOwnerContext_', 'getSetupState', 'scanGmailForDeliveries',
   'uploadRackPhoto', 'setAiKey', 'addUser', 'photosToDocPdf_',
   'notifyAdminOfError_', 'ensureBackupTrigger_'].forEach(function (f) {
    check('`' + f + '` sabe que puede estar en la versión básica',
      !!todas[f] && apagada(f));
  });

  /* `onOpen` TIENE NOMBRE PROPIO AQUÍ, y no es por gusto.
   *
   * Es un disparador simple: corre al ABRIR LA HOJA, antes que nada y sin que
   * nadie lo pida. Llama a `getUi()`, que la versión básica no tiene permiso
   * para usar. Sin apagarlo, el primer minuto del producto —el de alguien que
   * acaba de hacer la copia desde un vídeo— sería un cuadro de error de Google.
   *
   * La entrada a la app es la pestaña «START HERE», que es una hoja visible y
   * no necesita ningún permiso. Eso ya existía por el mismo motivo. */
  check('`onOpen` se calla, NO se niega — un error aquí lo ve el cliente al ' +
        'abrir la hoja, antes de haber pulsado nada',
    !!todas['onOpen'] && /basicApagado_/.test(todas['onOpen']) &&
    !/basicNiega_/.test(todas['onOpen']));

  /* EL TECHO. Baja cuando se apaga una hoja; esta prueba falla si sube.
   *
   * 40, y el número lo puso la medida. Yo había escrito 45 a ojo y el rojo
   * salió del techo, no del producto — que es exactamente el error que ya se
   * cometió con el tope del vigilante de arranque. Un número inventado no
   * vigila nada: sólo da un susto y enseña a ignorar la prueba.
   *
   * De estas 47, unas quince son funciones `menu*`. En la versión básica no se
   * pueden llamar de ninguna manera, porque el menú lo crea `onOpen` y `onOpen`
   * se calla — así que no llegan a existir. Se dejan en la cuenta igual: que
   * hoy sean inalcanzables es una consecuencia de otra decisión, y el día que
   * esa decisión cambie, estas volverían sin que nadie se acordara.
   *
   * Lo que falta y en qué orden, en docs/VERSION-BASICA.md. */
  const TECHO = 40;
  check('las hojas sin apagar no CRECEN (techo ' + TECHO + ') — ' +
        'cuando se apague una, baja este número',
    sinApagar.length <= TECHO, sinApagar.length);

  if (sinApagar.length) {
    console.log('\n  — pendientes de apagar (' + sinApagar.length + '):');
    console.log('    ' + sinApagar.join(', '));
  }
}

console.log('\n═══ 7. LA COLUMNA DEL AUTOR DICE LA VERDAD, NO UN HUECO ═══\n');
{
  check('existe `autorDeLaFila_`', /function autorDeLaFila_\s*\(/.test(codigo));
  check('...y el escritor de filas lo usa, en vez de poner el correo a pelo',
    /row\[AC\.USER_EMAIL\]\s*=\s*autorDeLaFila_\(/.test(codigo));
  check('...escribiendo `BASIC` cuando no hay autor, que es un dato y no un hueco',
    /\|\|\s*'BASIC'/.test(codigo));

  /* Y AQUÍ ESTÁ EL PUNTO: `autorDeLaFila_` NO sabe qué edición es.
   *
   * El primer intento fue `ACOPIO_BASIC ? 'BASIC' : auth.email` dentro del
   * escritor de filas, y la sección 3 de esta misma prueba lo rechazó. Al
   * buscar otra forma apareció que la condición de verdad nunca fue «¿es la
   * versión básica?» sino «¿hay autor?» — y eso se ve en el propio dato.
   *
   * La prueba empujó a un diseño mejor, no a un rodeo. Esta comprobación
   * existe para que nadie deshaga ese empujón metiendo la constante aquí. */
  const m = src.match(/^function autorDeLaFila_\s*\([\s\S]*?\n\}/m);
  check('`autorDeLaFila_` no mira la edición: la pregunta es si HAY autor, ' +
        'no en qué versión estamos',
    !!m && !/ACOPIO_BASIC/.test(soloCodigo(m[0])));

  /* Que `getUserRole` devuelva el correo vacío en la versión básica no es un
   * descuido pendiente de arreglar: es lo que hace que esto funcione. Si
   * devolviera un correo inventado, la fila mentiría. */
  /* `getUserRole` devuelve en la básica la identidad DECLARADA —la que la
   * persona escribió una vez— y no un correo inventado. Si la dejó en blanco,
   * sigue vacía, y la fila dirá `BASIC`. Las dos cosas son verdad; ninguna
   * finge una identidad que nadie comprobó. */
  const g = src.match(/^function getUserRole\s*\([\s\S]*?\n\}/m);
  check('`getUserRole` usa la identidad DECLARADA en la básica, no una inventada',
    !!g && /basicApagado_\(\)\)\s*\{[\s\S]{0,160}basicIdentidad_\(\)/.test(soloCodigo(g[0])));
  check('...y si no la declaró, se queda vacía — de ahí sale el `BASIC` de la fila',
    /BASIC_USER_EMAIL'\)\s*\|\|\s*''/.test(codigo));
}

console.log('\n═══ 8. LA PANTALLA: LO QUE SE ESCONDE Y LO QUE SE OFRECE ═══\n');
{
  const htmlCodigo = soloCodigo(html);

  check('el navegador RECIBE la edición en vez de declararla',
    /APP_BASIC\s*=\s*\(?\s*data\.basic/.test(htmlCodigo));
  check('...y también por el camino de la caché, que pinta antes de que ' +
        'lleguen los datos frescos',
    /cached\.basic/.test(htmlCodigo));

  /* LAS DOS MITADES, Y ÉSTA ES LA COMPROBACIÓN QUE DE VERDAD IMPORTA.
   *
   * Y manda MÁS desde que los botones se enseñan: ahora se pueden pulsar de
   * verdad, así que la puerta del servidor se va a tocar. Sin `basicNiega_`,
   * una oferta mal puesta dejaría pasar la llamada. */
  check('LAS DOS MITADES: la pantalla ofrece y el servidor niega — ' +
        'enseñar un botón no cierra la puerta que llamaba',
    /_basicPintar/.test(htmlCodigo) && /function basicNiega_/.test(codigo));

  check('`_basicPintar` se llama AL FINAL de `applyRoleUI` — puesto antes, ' +
        'cualquier línea de rol (como `_escPintarBoton`) lo deshacía',
    /_setAccountIdentity\(_lastUserName[\s\S]{0,700}_basicPintar\(\);/.test(htmlCodigo) &&
    /_basicPintar\(\);[\s\S]{0,260}_ponerEquis\(document\)[\s\S]{0,120}\n\}/.test(htmlCodigo));

  /* ── LO QUE SE ESCONDE ──────────────────────────────────────────────────── */
  check('sigue habiendo lista de lo que se ESCONDE — fontanería que no vende, ' +
        'y veinte candados harían que la app pareciera una demostración',
    /var BASIC_FUERA\s*=/.test(htmlCodigo) && /btnReportIssue/.test(htmlCodigo));

  /* ── LO QUE SE OFRECE ───────────────────────────────────────────────────── */
  check('existe el catálogo de ofertas', /var BASIC_PRO\s*=/.test(htmlCodigo));

  const catalogo = (htmlCodigo.match(/var BASIC_PRO\s*=\s*\{[\s\S]*?\n\};/) || [''])[0];
  const mapa     = (htmlCodigo.match(/var BASIC_PRO_BOTONES\s*=\s*\{[\s\S]*?\n\};/) || [''])[0];

  /* LAS ZONAS CUENTAN COMO LOS BOTONES, y hasta la v12.91 no contaban aquí.
   *
   * Una oferta se puede enseñar de tres maneras: desde un botón
   * (`BASIC_PRO_BOTONES`), desde una ZONA entera apagada (`BASIC_PRO_ZONAS`) o
   * desde una llamada suelta a `_proPitch`. Esta prueba miraba la primera y la
   * tercera, así que una oferta que sólo se alcanza por una zona —como
   * `avisarcorreo`— salía como «sin botón» y ponía la prueba roja sin estar
   * nada roto.
   *
   * Es el MISMO punto ciego que causó el fallo que Jose vio el 22/10: pulsar
   * «Send notification email» contestaba con la oferta de LEER un correo,
   * porque mi repaso de los candados recorrió los botones y no las zonas. El
   * agujero estaba en el mapa, en mi auditoría y en dos pruebas. Aquí también
   * se tapa. */
  const zonas   = (htmlCodigo.match(/var BASIC_PRO_ZONAS\s*=\s*\{[\s\S]*?\n\};/) || [''])[0];
  const claves  = [...catalogo.matchAll(/^\s{2}(\w+):\s*\{/gm)].map(m => m[1]);
  const usadas  = [...mapa.matchAll(/:\s*'(\w+)'/g)].map(m => m[1])
            .concat([...zonas.matchAll(/:\s*'(\w+)'/g)].map(m => m[1]));

  /* NUEVE DESDE LA v12.86, y el número se fija a mano a propósito: añadir una
   * oferta es una decisión de producto, no un refactor, y tiene que costar
   * tocar una prueba y escribir por qué.
   *
   * La novena, `lectura`, la forzó el repaso que pidió Jose el 21/10: el botón
   * «📷 toma una foto de la factura y te relleno los campos» contestaba con el
   * mensaje de ADJUNTAR documentos. Parecido no basta — quien pulsa «léemela»
   * y recibe «puedes guardarla» no entiende que le ofrecen otra cosa, entiende
   * que la app no le entendió. Ver `test-candados-hablan-de-lo-mismo.js`. */
  /* DIEZ DESDE LA v12.89. La décima, `minimos`, la pidió Jose el 22/10 al ver
   * que podía abrir los ajustes de stock mínimo en la gratis: *"no debería
   * poder abrirse y sólo debe mostrar el toast igual que los demás de Pro"*.
   * Yo lo había abierto en la v12.86 por mi cuenta; su producto, su decisión.
   * Lo que no vuelve es el mensaje equivocado que él mismo encontró. */
  /* ONCE DESDE LA v12.91, y la undécima no es una función nueva: es una que
   * estaba MAL CONTADA. `correo` era una sola oferta colgando de tres sitios —
   * dos de leer un correo de proveedor y uno de MANDAR un aviso al guardar—, y
   * su texto sólo valía para los dos primeros. Jose, 22/10, con dos capturas:
   * *"al tocar lo de enviar notificación sale un mensaje sobre leer desde el
   * email, lo cual no tiene nada que ver"*. Leer y mandar son direcciones
   * opuestas. Ahora son `leercorreo` y `avisarcorreo`, con un verbo cada una.
   *
   * Que el número suba sin que el producto gane una función es raro, y por eso
   * queda escrito: lo que ha cambiado no es cuánto ofrece la gratis, es que
   * ahora cada cosa que se pulsa contesta de lo suyo. */
  check('las ofertas son las ONCE decididas con Jose',
    claves.length === 11, claves);

  /* DOS LISTAS QUE TIENEN QUE COINCIDIR — Y AQUÍ SÍ HAY QUIEN LO OBLIGUE.
   *
   * El mapa de botones nombra ofertas del catálogo. Un botón apuntando a una
   * oferta que no existe no enseñaría nada al pulsarlo: `_proPitch` se va sin
   * hacer ruido, y el botón quedaría muerto en silencio. Es exactamente la
   * forma de fallo de este proyecto, y por eso se comprueba en vez de
   * confiarse. */
  const huerfanas = usadas.filter(k => claves.indexOf(k) === -1);
  check('todo botón con candado apunta a una oferta QUE EXISTE — si no, el ' +
        'botón quedaría muerto en silencio',
    huerfanas.length === 0, huerfanas);

  const sinBoton = claves.filter(k => usadas.indexOf(k) === -1);
  /* Dos ofertas no tienen botón fijo y es correcto: «reservas» se abre desde
   * una fila de la tabla y se caza en `openLockModal`. */
  check('toda oferta tiene por dónde salir — por un botón, o por su propio ' +
        'sitio en el código',
    sinBoton.every(k => new RegExp("_proPitch\\('" + k + "'\\)").test(htmlCodigo)),
    sinBoton);

  /* ── LAS PALABRAS SON EL PRODUCTO ───────────────────────────────────────── */
  check('las ofertas hablan de lo que se GANA, no de lo que falta — ' +
        '«Not available in Basic» es un muro; «Attach photos…» es una oferta',
    !/not available|unavailable|you cannot|is locked/i.test(catalogo), catalogo.slice(0, 80));

  /* ── LA FRECUENCIA ──────────────────────────────────────────────────────── */
  check('la oferta se recuerda: entera la primera vez, callada después',
    /localStorage\.getItem\('acopio_pro_/.test(htmlCodigo) &&
    /localStorage\.setItem\('acopio_pro_/.test(htmlCodigo) &&
    /_proToast\(clave\)/.test((htmlCodigo.match(/function _proPitch[\s\S]*?\n\}/) || [''])[0]));

  /* Y SI EL RECUERDO FALLA, SE CAE DEL LADO BUENO. En una ventana privada
   * `localStorage` puede reventar. Perder el recuerdo es una molestia; perder
   * la oferta es perder la venta, así que el `catch` deja `visto` en false. */
  const pitch = (html.match(/function _proPitch[\s\S]*?\n\}\n/) || [''])[0];
  check('si `localStorage` falla, se enseña la oferta igual (no se traga)',
    /var visto = false;[\s\S]{0,200}catch \(e\) \{\}/.test(soloCodigo(pitch)));

  /* ── EL DATO QUE NOS LLEVAMOS ───────────────────────────────────────────── */
  check('el enlace lleva el nombre de la función — es el único dato que la ' +
        'versión básica puede darnos, porque no tiene permiso para salir a ' +
        'internet y abrir una página no es una petición nuestra',
    /acopio\.net\/\?de='\s*\+\s*encodeURIComponent\(clave\)/.test(htmlCodigo));

  /* Y APUNTA A LA RAÍZ, que es la única ruta del sitio que no puede faltar.
   * La primera versión apuntaba a `/pro`, que no existe: un 404 justo en el
   * momento de más interés. Un enlace del app a una página del sitio son otras
   * dos cosas que tienen que coincidir sin que nada lo obligue, y aquí sólo hay
   * una forma de que no se rompa. */
  check('...y a una página que EXISTE — la raíz, no una ruta inventada',
    !/acopio\.net\/[a-z]/.test((htmlCodigo.match(/function _proPitch[\s\S]*?\n\}/) || [''])[0]));

  /* ── CÓMO SE PONE EL CANDADO ────────────────────────────────────────────── */
  check('el candado REEMPLAZA el `onclick`, no añade un oyente — estos botones ' +
        'llevan su acción en el HTML, y un oyente correría ADEMÁS de ella',
    /el\.onclick\s*=\s*function/.test(htmlCodigo) &&
    !/_basicCandado[\s\S]{0,600}addEventListener/.test(htmlCodigo));

  check('el botón con candado NO se desactiva: se pulsa y contesta',
    !/_basicCandado[\s\S]{0,600}\.disabled\s*=\s*true/.test(htmlCodigo));

  /* ── Y LA PUERTA TRASERA DE LA PROPIA PANTALLA ──────────────────────────── */
  check('la pestaña de llegadas enseña la oferta en vez de abrirse — la ' +
        'pestaña activa sobrevive en sessionStorage y se llegaría a una ' +
        'sección que no puede funcionar',
    /_basicPestanaFuera\(tab\)/.test(htmlCodigo) &&
    /tab === 'incoming'[\s\S]{0,80}_proPitch\('llegadas'\)/.test(htmlCodigo));

  check('apartar material se caza donde se abre la ventana, no en una lista ' +
        'de identificadores — se llega desde una fila de la tabla',
    /function openLockModal[\s\S]{0,400}_proPitch\('reservas'\)/.test(htmlCodigo));
}

console.log('\n═══ 9. LA PUERTA SE ABRE SIN CORREO — EJECUTADA, NO LEÍDA ═══\n');
{
  /* EL FALLO QUE JOSE ENCONTRÓ AL ARRANCARLA POR PRIMERA VEZ.
   *
   * La app abría y moría en la primera petición de datos:
   *
   *     getInitialData: Not authenticated. Please sign in and use the app
   *     from its own page.
   *
   * Eran dos decisiones mías chocando, correctas las dos por separado:
   * `getUserRole` devuelve el correo VACÍO en la versión básica —para que la
   * columna del autor no mienta— y `requireAuth_` leía «sin correo» como «no ha
   * iniciado sesión», que es lo que significa en la versión de pago.
   *
   * ── POR QUÉ ESTA COMPROBACIÓN CORRE EL CÓDIGO EN VEZ DE LEERLO ───────────
   *
   * Porque leerlo no habría servido. Las dos piezas estaban bien escritas y
   * cada una pasaba sus propias comprobaciones; lo que fallaba era lo que pasa
   * cuando se juntan, y eso sólo se ve ejecutándolas. Las 62 comprobaciones de
   * arriba estaban en verde mientras la versión básica no arrancaba.
   *
   * Así que esto llama a `requireAuth_` de verdad, con las dos ediciones y el
   * mismo usuario sin correo, y mira qué pasa. */
  const codigoFn = function (nombre) {
    const m = src.match(new RegExp('^function ' + nombre + '\\s*\\([\\s\\S]*?\\n\\}', 'm'));
    if (!m) throw new Error('no se encontró ' + nombre);
    return m[0];
  };

  function probar(edicion) {
    const ctx = vm.createContext({
      console,
      _verifiedAuth: { role: 'ADMIN', email: '', name: '' },
      registrarAccesoDenegado_: function () {},
      ROLES_QUE_ESCRIBEN: ['ADMIN', 'WAREHOUSE']
    });
    vm.runInContext('var ACOPIO_BASIC = ' + edicion + ';\n' +
                    codigoFn('basicApagado_') + '\n' +
                    codigoFn('requireAuth_'), ctx);
    try { ctx.__r = vm.runInContext("requireAuth_('WRITE')", ctx); return { ok: true }; }
    catch (e) { return { ok: false, msg: String(e.message || e) }; }
  }

  const pro   = probar(false);
  const basic = probar(true);

  check('en la versión de PAGO, un usuario sin correo sigue siendo «sin ' +
        'sesión» — esto no se ha aflojado para nadie',
    !pro.ok && /Not authenticated/.test(pro.msg || ''), pro);

  check('en la versión BÁSICA, un usuario sin correo ENTRA — el portero es el ' +
        'despliegue (`access: MYSELF`), no el correo',
    basic.ok === true, basic);

  /* Y lo que NO se aflojó: el resto de la puerta sigue cerrada igual. */
  function probarRol(edicion, auth, minRole) {
    const ctx = vm.createContext({
      console, _verifiedAuth: auth,
      registrarAccesoDenegado_: function () {},
      ROLES_QUE_ESCRIBEN: ['ADMIN', 'WAREHOUSE']
    });
    vm.runInContext('var ACOPIO_BASIC = ' + edicion + ';\n' +
                    codigoFn('basicApagado_') + '\n' +
                    codigoFn('requireAuth_'), ctx);
    try { vm.runInContext("requireAuth_('" + minRole + "')", ctx); return true; }
    catch (e) { return false; }
  }

  check('...y un VIEWER sin correo sigue sin poder escribir en la básica — ' +
        'se aflojó el correo, no los roles',
    probarRol(true, { role: 'VIEWER', email: '' }, 'WRITE') === false);

  check('...y un DENIED sigue fuera en la básica',
    probarRol(true, { role: 'DENIED', email: '' }, 'WRITE') === false);

  check('...y NO_SESSION sigue fuera en la básica — es lo único que de verdad ' +
        'significa «no hay nadie»',
    probarRol(true, { role: 'NO_SESSION', email: '' }, 'WRITE') === false);
}

console.log('\n═══ 10. NO SE PUEDE EMPEZAR LO QUE NO SE PUEDE TERMINAR ═══\n');
{
  const htmlCodigo = soloCodigo(html);
  const gs = codigo;

  /* LA REGLA QUE CORRIGE EL ERROR DE DISEÑO.
   *
   * Jose, 19/10, después de repasar la app entera: *"se le dice al cliente lo
   * que no se puede hacer ANTES de que lo termine de hacer, justo al momento de
   * empezar"*.
   *
   * La versión anterior dejaba elegir la imagen, escribir el destinatario, y
   * avisaba AL GUARDAR — y el movimiento se guardaba mientras el documento no.
   * Eso no es un aviso: es una trampa que deja los datos a medias. */
  check('las zonas enteras se apagan, no sólo los botones sueltos',
    /var BASIC_PRO_ZONAS\s*=/.test(htmlCodigo) &&
    /fileSection/.test(htmlCodigo) && /notifySection/.test(htmlCodigo));

  check('y lo de DENTRO no recibe el ratón — un `input type=file` apagado ya no ' +
        'abre el explorador de archivos, que es el «empezar» que había que cortar',
    /\.pro-off \*\{pointer-events:none!important\}/.test(html));

  check('el clic se caza en CAPTURA, antes que cualquier manejador de dentro',
    /addEventListener\('click'[\s\S]{0,200}\}, true\)/.test(htmlCodigo));

  check('las pestañas de ajustes se vuelven a apagar DESPUÉS de cada pintada — ' +
        'se repintan enteras y el apagado se perdería',
    /_renderSystemTab\(\);\s*_basicApagarAjuste\(tab\)/.test(htmlCodigo));

  /* EL EDIT QUE REVENTÓ EN LA CARA DE JOSE. El movimiento ya estaba guardado y
   * la bitácora puesta; el correo de aviso reventaba después. */
  const mod = (gs.match(/^function modifyMovementLocked_[\s\S]*?\n\}/m) || [''])[0];
  check('editar un movimiento NO intenta mandar correo en la básica — ' +
        'reventaba DESPUÉS de haber guardado, y dejaba un error sobre un ' +
        'cambio que ya había ocurrido',
    /basicApagado_\(\)/.test(mod) && /MailApp\.sendEmail/.test(mod));

  /* Reservas: ni apartar ni soltar, porque existir a medias es lo ilógico. */
  const locks = (gs.match(/^function getActiveLocksMap_[\s\S]*?\n\}/m) || [''])[0];
  check('en la básica no hay nada apartado — se podía SOLTAR pero no apartar, ' +
        'y prohibir soltar dejaría colgado para siempre lo que venga en la plantilla',
    /basicApagado_\(\)\)\s*return \{\};/.test(locks));

  /* Permissions y PM directory fuera; error log dentro. */
  check('fuera `permissions` y `pmdirectory`; `errorlog` se queda — ' +
        'un registro de errores no es una función de pago, es cómo se pide ayuda',
    /ajustes: \['permissions', 'pmdirectory', 'import'\]/.test(htmlCodigo));
}

console.log('\n═══ 11. LA OFERTA DICE QUE ES DE PRO, Y DEJA LLEGAR ═══\n');
{
  const htmlCodigo = soloCodigo(html);

  check('el título dice que es de Acopio Pro — explicar la función sin decir ' +
        'por qué no la tiene era el peor fallo de la ventana',
    /titulo \+ ' is part of Acopio Pro'/.test(htmlCodigo));

  check('fuera el párrafo de «todo lo que has guardado sigue donde está» — ' +
        'quien está explorando no estaba guardando nada',
    !/Everything you have recorded so far/.test(html));

  check('UN solo botón, y es el azul; lo otro es texto con enlace',
    /class="pro-notnow"/.test(html) &&
    /id="proEnlace"[^>]*class="btn btn-primary/.test(html) &&
    /Check Acopio Pro/.test(html));

  check('el gris es más gris que antes — a .72 no se distinguía de un botón ' +
        'disponible',
    /\.pro-lock\{[^}]*opacity:\.4/.test(html));

  check('el clic en la oferta no se escapa al documento — cerraba por detrás ' +
        'el menú del avatar desde el que se había llegado',
    /_safeOn\('proOverlay','click'[\s\S]{0,80}stopPropagation/.test(htmlCodigo));

  /* EL AVISO FLOTANTE, Y EL TELÉFONO.
   *
   * SE MIRA EL ARCHIVO ENTERO Y NO SÓLO LA FUNCIÓN, y es por el arreglo de la
   * v12.90: el reloj y los oyentes del ratón salieron de dentro de `_proToast`
   * a propósito. Cada llamada dejaba los suyos sobre el mismo elemento —y
   * escribí en un comentario que eso daba igual, que era falso: cada cierre
   * tenía su reloj, y dos clics seguidos dejaban dos cuentas atrás corriendo a
   * destiempo. Eso es lo que Jose midió como «14 segundos». */
  /* `_proToast\(` CON EL PARÉNTESIS, y hace falta desde la v12.90: ahora hay
   * `_proToastIrse` y `_proToastContar`, y sin el paréntesis esto cazaba la
   * primera de las tres —cuatro líneas sin nada que mirar— y daba por ausente
   * lo que estaba al lado. Un buscador que encuentra lo que no era es peor que
   * uno que no encuentra nada: el rojo señala al sitio equivocado. */
  const toast = (htmlCodigo.match(/function _proToast\([\s\S]*?\n\}\n/) || [''])[0];
  check('el aviso flotante lleva enlace a Acopio Pro',
    /toast-pro/.test(toast) && /_proUrl\(clave\)/.test(toast));
  check('...y no se va mientras el ratón esté encima',
    /mouseenter[\s\S]{0,120}clearTimeout/.test(htmlCodigo) &&
    /mouseleave[\s\S]{0,120}_proToastContar/.test(htmlCodigo));
  /* SIETE SEGUNDOS, Y LOS MIDIÓ JOSE: *"el toast demora 14 segundos, creo que
   * es mucho... si dura 7 segundos es suficiente"*. Él mismo había pedido lo
   * contrario días antes —que durara más— y al verlo decidió al revés. Lo que
   * no cambia es el motivo de que no sea un parpadeo: en un teléfono no hay
   * hover, y ahí está la mitad de la gente que llega desde un vídeo. */
  check('...y dura siete segundos sin ratón: ni un parpadeo ni una eternidad',
    /PRO_TOAST_MS\s*=\s*7000/.test(htmlCodigo));
  check('...con 2,5 más al quitarle el ratón de encima',
    /PRO_TOAST_IRSE\s*=\s*2500/.test(htmlCodigo));
  /* UN SOLO RELOJ, FUERA DE LA LLAMADA. Es lo que impide que vuelvan a
   * acumularse: si el `setTimeout` viviera dentro de `_proToast`, cada reuso
   * crearía otro. */
  check('y el reloj vive FUERA de la llamada, uno solo — dentro, cada reuso ' +
        'creaba otro y por eso se quedaba tanto rato',
    /var _proToastReloj/.test(htmlCodigo) && !/\bvar reloj\b/.test(toast));
}

console.log('\n═══ 12. QUIÉN ERES, PREGUNTADO UNA VEZ ═══\n');
{
  const htmlCodigo = soloCodigo(html);

  check('la identidad se guarda en la propia hoja', /BASIC_USER_EMAIL/.test(codigo));
  check('la puerta que la guarda tiene la MISMA guardia que el resto — ' +
        'escribe en las propiedades de la hoja y es una función global',
    /function saveBasicIdentity[\s\S]{0,900}requireAuth_\(/.test(codigo));
  check('...y no existe en la versión de pago, donde el nombre lo da Google y ' +
        'escribirlo a mano sería poder firmar como otro',
    /function saveBasicIdentity[\s\S]{0,200}!basicApagado_\(\)\) throw/.test(codigo));
  check('se puede SALTAR — obligar a dar el nombre en el primer minuto de algo ' +
        'que se regala es poner un formulario delante del producto',
    /_quienSaltar/.test(htmlCodigo) && /Skip for now/.test(html));
  check('el servidor es quien decide si hay que preguntar',
    /basicPreguntarQuien:\s*ACOPIO_BASIC && !basicIdentidad_\(\)\.email/.test(codigo));
  check('el error del formulario se queda a la vista, no se va solo — ' +
        'son dos campos y hay que poder leer qué no gustó',
    /err\.style\.display = ''/.test(htmlCodigo) &&
    /getElementById\('quienError'\)/.test(htmlCodigo));
}

console.log('\n═══ 13. LA PANTALLA DICE QUÉ EDICIÓN ES ═══\n');
{
  const htmlCodigo = soloCodigo(html);
  /* El archivo que se manda sale siempre con la constante en `false`, así que
   * cada versión nueva pegada en una copia básica hay que volver a ponerla en
   * `true`. Olvidarlo da una app que parece la básica y no lo es. El
   * interruptor no se puede quitar, pero el despiste sí se puede hacer
   * visible. */
  check('el pie de la app dice «Basic» cuando lo es — es lo único que ' +
        'distingue de un vistazo una copia básica de una a la que se le olvidó ' +
        'volver a poner el interruptor',
    /APP_BASIC \? ' Basic' : ''/.test(htmlCodigo));
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallos · ' : '✓ todo bien · ') + (ok + fail) + ' comprobaciones\n');
process.exit(fail ? 1 : 0);
