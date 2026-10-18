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

const fs = require('fs'), path = require('path');

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
  ['onOpen', 'getUserRole', 'requireOwnerContext_', 'scanGmailForDeliveries',
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
   * 47, y el número lo puso la medida. Yo había escrito 45 a ojo y el rojo
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
  const TECHO = 47;
  check('las hojas sin apagar no CRECEN (techo ' + TECHO + ') — ' +
        'cuando se apague una, baja este número',
    sinApagar.length <= TECHO, sinApagar.length);

  if (sinApagar.length) {
    console.log('\n  — pendientes de apagar (' + sinApagar.length + '):');
    console.log('    ' + sinApagar.join(', '));
  }
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallos · ' : '✓ todo bien · ') + (ok + fail) + ' comprobaciones\n');
process.exit(fail ? 1 : 0);
