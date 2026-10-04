// LA DIRECCIÓN DE LA APP: UNA SOLA, Y LA GUARDADA MANDA.
//
// Jose, 2026-10-04, montando la copia DEMO desde cero. Publicó con Push Update
// Live y el aviso le dio esta dirección:
//
//     https://script.google.com/macros/s/AKfycbzxKF659yaTtULpAYx4HngN_...
//
// Pulsó "Open WMS App" y le dio otra:
//
//     https://script.google.com/macros/s/AKfycbZLh733wUSStZ2LKyIZ-ZTPQ_...
//
// La segunda abre la página de Google Drive que dice "Sorry, unable to open the
// file at this time".
//
// ── POR QUÉ, Y POR QUÉ DUELE ────────────────────────────────────────────────
//
// La DEMO es una COPIA de la hoja de OX Glass, que ya estaba publicada. En una
// copia así, `ScriptApp.getService().getUrl()` devuelve una dirección que lleva
// el identificador del script ORIGINAL: un enlace muerto, en una copia cuyo
// propio proyecto tiene su propia publicación en otra dirección.
//
// ESO YA LO SABÍAMOS. Está escrito, con todas sus letras y con la palabra
// "observed", encima de `checkDeploymentReady` — y de ahí salió la propiedad
// WEB_APP_URL, que gana sobre getUrl() precisamente por esto.
//
// El fallo no fue descubrir nada nuevo: fue que `menuOpenApp` era el único sitio
// del archivo que no usaba esa defensa, y que `selfActivateWebApp_` —la única
// función que conoce la dirección buena de primera mano, porque acaba de
// crearla— no la apuntaba en ninguna parte.
//
// Es, otra vez, el patrón que este archivo lleva meses nombrando: UNA PROTECCIÓN
// ESCRITA Y UN CAMINO SIN CONECTAR. Y una variante peor de lo normal: saber la
// respuesta correcta y no escribirla en el sitio donde todo el mundo la busca.
//
// Uso:  node tools/test-url-de-la-app.js

const vm = require('vm');
const A  = require('./andamio.js');
const GS = A.fuente('gs');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

const VIVA   = 'https://script.google.com/macros/s/AKfycbzxKF659_LA_BUENA/exec';
const MUERTA = 'https://script.google.com/macros/s/AKfycbZLh733w_LA_DEL_ORIGINAL/exec';

/** Caja con las propiedades del script y la UI de mentira. */
function montar(fns, propsIniciales) {
  const props = Object.assign({}, propsIniciales || {});
  const ctx = {
    console, String, Number, Object, Array, JSON,
    PRODUCT_NAME: 'Acopio',
    avisos: [],
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: k => (props[k] === undefined ? null : props[k]),
        setProperty: (k, v) => { props[k] = v; },
        deleteProperty: k => { delete props[k]; }
      })
    },
    // La trampa de verdad: esto devuelve la dirección del script ORIGINAL,
    // igual que en la copia de Jose.
    ScriptApp: { getService: () => ({ getUrl: () => MUERTA }) },
    SpreadsheetApp: {
      getUi: () => ({
        alert: (a, b) => { ctx.avisos.push(b === undefined ? String(a) : String(a) + '\n' + String(b)); },
        ButtonSet: { OK: 'OK' }
      })
    },
    Logger: { log(){} },
    requireOwnerContext_: () => 'jose@ox-glass.com',
    _props: props
  };
  vm.createContext(ctx);
  vm.runInContext(A.levantar(GS, fns, { dobles: ['requireOwnerContext_'] }), ctx);
  return ctx;
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. CON DIRECCIÓN GUARDADA, ES LA QUE SE ENSEÑA
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 1. La guardada gana ═══\n');
{
  const ctx = montar(['menuOpenApp'], { WEB_APP_URL: VIVA });
  ctx.menuOpenApp();
  const texto = ctx.avisos.join('\n');

  check('enseña la dirección guardada', texto.indexOf(VIVA) !== -1, texto);
  check('Y NO LA QUE DEVUELVE GOOGLE — que en una copia es la del original y ' +
        'abre "Sorry, unable to open the file at this time"',
        texto.indexOf(MUERTA) === -1, texto);
  check('y no asusta con avisos cuando no hay nada que avisar',
        texto.indexOf('GUESS') === -1);
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. SIN DIRECCIÓN GUARDADA, SE ADIVINA — PERO SE DICE QUE SE ADIVINA
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 2. Cuando hay que adivinar, lo dice ═══\n');
{
  const ctx = montar(['menuOpenApp'], {});
  ctx.menuOpenApp();
  const texto = ctx.avisos.join('\n');

  check('sigue dando algo que probar en vez de no decir nada',
        texto.indexOf(MUERTA) !== -1);
  /* Esto es la mitad del arreglo. Una dirección muerta presentada sin reservas
   * hace buscar el fallo dentro de la app durante una tarde; la misma dirección
   * con "esto es una suposición, y así se confirma" cuesta dos minutos. */
  check('AVISA DE QUE ES UNA SUPOSICIÓN', /GUESS/.test(texto), texto);
  check('...dice por qué pasa justo en una copia', /copied from another/.test(texto));
  check('...y dice cómo arreglarlo, no sólo que está mal',
        /Push Update Live/.test(texto) && /Manage deployments/.test(texto));
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. PUBLICAR APUNTA LA DIRECCIÓN
   ═══════════════════════════════════════════════════════════════════════════

   El momento en que se conoce la dirección buena con certeza es el momento en
   que se acaba de crear. Si no se apunta ahí, no se apunta en ningún sitio:
   ninguna otra función del archivo la puede averiguar. */
console.log('\n═══ 3. Push Update Live la deja apuntada ═══\n');
{
  const ctx = montar(['selfActivateWebApp_', 'saveWebAppUrl'], {});
  ctx.ScriptApp.getScriptId = () => 'script-de-la-demo';
  ctx._WEBAPP_DEPLOYMENT_MARKER = 'acopio';
  ctx._scriptApiRequest_ = (id, ruta, metodo) => {
    if (ruta === 'versions') return { versionNumber: 7 };
    return { entryPoints: [{ webApp: { url: VIVA } }] };
  };
  ctx._findWebAppDeploymentId_ = () => 'dep-1';
  ctx.MailApp = { sendEmail(){} };
  ctx.Session = { getActiveUser: () => ({ getEmail: () => 'jose@ox-glass.com' }) };

  const devuelta = ctx.selfActivateWebApp_();

  check('devuelve la dirección recién publicada', devuelta === VIVA, devuelta);
  check('Y LA DEJA APUNTADA — saber la respuesta correcta y no escribirla donde ' +
        'todos la buscan es el fallo que esto arregla',
        ctx._props.WEB_APP_URL === VIVA, ctx._props.WEB_APP_URL);

  /* Y de paso deja lista la de la vuelta de Google, que vivía en otra propiedad
   * que alguien tenía que escribir a mano — que es como acaba faltando. */
  check('...y con ella la dirección de vuelta del inicio de sesión',
        ctx._props.OAUTH_REDIRECT_URI === VIVA, ctx._props.OAUTH_REDIRECT_URI);

  /* Lo siguiente es lo que cierra el círculo: después de publicar, el menú ya
   * no puede enseñar la muerta. Es la comprobación que de verdad describe lo
   * que Jose vivió. */
  const ctx2 = montar(['menuOpenApp'], { WEB_APP_URL: ctx._props.WEB_APP_URL });
  ctx2.menuOpenApp();
  check('DESPUÉS DE PUBLICAR, "Open WMS App" ya enseña la buena — el círculo ' +
        'entero, que es lo que falló en la DEMO',
        ctx2.avisos.join('\n').indexOf(VIVA) !== -1);
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. QUE NO VUELVA A HABER UN CAMINO SIN CONECTAR
   ═══════════════════════════════════════════════════════════════════════════

   Esto no mira una función: cuenta las puertas. Es la misma idea que
   check-suite (guardias sin lista) y test-endpoint-auth (puertas sin guardia),
   aplicada a una propiedad: si alguien añade mañana otro sitio que enseñe la
   dirección de la app, tiene que preferir la guardada igual que los demás. */
console.log('\n═══ 4. Ningún sitio pregunta sólo a Google ═══\n');
{
  const PERMITIDOS = {
    // La única que puede preguntar a Google SIN mirar antes la propiedad: su
    // trabajo es justamente decir si hay una guardada o no.
    'checkDeploymentReady': 'devuelve {url, saved} — el "saved: false" ES la respuesta'
  };

  const usos = [];
  const re = /function\s+([A-Za-z0-9_]+)\s*\(/g;
  let m, limites = [];
  while ((m = re.exec(GS)) !== null) limites.push({ nombre: m[1], ini: m.index });
  limites.forEach((f, i) => {
    const trozo = A.sinComentarios(GS.slice(f.ini, i + 1 < limites.length ? limites[i + 1].ini : GS.length));
    if (/ScriptApp\.getService\(\)\.getUrl\(\)/.test(trozo)) {
      /* DOS FORMAS DE MIRAR LA GUARDADA, Y LAS DOS VALEN: leer la propiedad, o
       * llamar al ayudante que la lee. Exigir el nombre literal de la propiedad
       * suspendería a `redirectUri_` por usar `savedWebAppUrl_()`, que es la
       * forma BUENA de hacerlo. Es el error que ya cometí en cinco pruebas de
       * este repositorio: medir la letra en vez de la intención. */
      usos.push({ fn: f.nombre, mira: /WEB_APP_URL|savedWebAppUrl_\(/.test(trozo) });
    }
  });

  check('alguien usa getUrl() — si no, esta prueba no está midiendo nada',
        usos.length > 0, usos);

  const sueltos = usos.filter(u => !u.mira && !PERMITIDOS[u.fn]);
  check('TODO SITIO QUE PREGUNTA A GOOGLE MIRA ANTES LA DIRECCIÓN GUARDADA — ' +
        'el fallo no fue no saberlo, fue tener un camino sin conectar',
        sueltos.length === 0, sueltos.map(u => u.fn));

  check('y la excepción sigue existiendo y sigue argumentada',
        usos.some(u => PERMITIDOS[u.fn]), Object.keys(PERMITIDOS));
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones\n');
process.exit(fail ? 1 : 0);
