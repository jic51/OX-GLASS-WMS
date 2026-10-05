// LA DIRECCIÓN DE LA APP SE PULSA, NO SE COPIA.
//
// Jose, 2026-10-05, con una captura del aviso de "Update published!": *"¿hay
// alguna forma de que el usuario sólo pueda dar clic en el link para ir a la app
// en lugar de tener que copiar el link, ir al navegador y pegarlo?"* Y detrás, la
// regla que de verdad manda: *"la app debe ser la única puerta desde el usuario
// hasta los datos; debemos reducir al máximo (100%) la necesidad del usuario de
// ir al sheet."*
//
// ── LO QUE SE DEFIENDE AQUÍ, Y POR QUÉ CADA COSA ───────────────────────────
//
//  1. EL ENLACE ABRE ALGO. Dentro de un diálogo de Sheets el HTML corre en un
//     iframe cerrado: un <a> SIN target="_blank" no hace absolutamente nada al
//     pulsarlo. Un enlace que no abre es peor que el texto plano de antes,
//     porque el texto plano al menos se podía copiar.
//  2. SI LA VENTANA NO SE PUEDE ABRIR, LA DIRECCIÓN NO SE PIERDE. showModalDialog
//     necesita `script.container.ui`, y hay copias que no lo tienen —el editor
//     esconde appsscript.json, así que quien actualiza pegando sólo Code e Index
//     se queda con el manifiesto viejo. Ya nos mordió una vez. Un adorno que
//     puede dejarte sin el dato no es una mejora.
//  3. NO SE MIENTE SOBRE EL CORREO DE INVITACIÓN. Si no hay dirección guardada o
//     el correo falla, el alta sigue valiendo y se dice que no se avisó. Decir
//     "invitación enviada" cuando no salió nada deja a alguien esperando un
//     correo que no existe.
//  4. NO SE INVENTA UNA DIRECCIÓN. En una hoja COPIADA de otra ya publicada,
//     ScriptApp.getService().getUrl() devuelve la del script ORIGINAL — una
//     dirección muerta. Mandar eso en el primer correo de alguien es la peor
//     versión de este error, porque llega por escrito y con pinta de oficial.
//
// Uso:  node tools/test-enlace-pulsable.js

const vm = require('vm');
const A  = require('./andamio.js');
const GS = A.fuente('gs');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. LA VENTANA: UN ENLACE DE VERDAD
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 1. La ventana lleva un enlace que abre ═══\n');

function cajaVentana(opciones) {
  opciones = opciones || {};
  const ctx = {
    console, String, Number, Object, Array, Date,
    PRODUCT_NAME: 'Acopio',
    pintado: null, alertado: null, registrado: [],
    Logger: { log(m){ ctx.registrado.push(String(m)); } },
    HtmlService: {
      createHtmlOutput(html) {
        return { _html: html, setWidth(){ return this; }, setHeight(){ return this; } };
      }
    },
    SpreadsheetApp: { getUi: () => ({
      ButtonSet: { OK: 'OK' },
      showModalDialog(out, titulo) {
        if (opciones.sinPermisoDeVentana) {
          throw new Error('Specified permissions are not sufficient to call Ui.showModalDialog');
        }
        ctx.pintado = { html: out._html, titulo: titulo };
      },
      alert(a, b, c) { ctx.alertado = { a: a, b: b, c: c }; }
    })}
  };
  vm.createContext(ctx);
  vm.runInContext(A.levantar(GS, ['mostrarEnlaceDeLaApp_'], {}), ctx);
  return ctx;
}

const URL_BUENA = 'https://script.google.com/macros/s/AKfycbzxKF659yaTtULpAYx4HngN_DoEF0VrdH4C/exec';

{
  const ctx = cajaVentana();
  ctx.mostrarEnlaceDeLaApp_('✅ Update published!', URL_BUENA, 'This address never changes.', '');
  const h = (ctx.pintado || {}).html || '';

  check('se abre una ventana, no una caja de texto', !!ctx.pintado && !ctx.alertado);
  check('con la dirección dentro de un href', h.indexOf('href="' + URL_BUENA + '"') !== -1);
  /* EL DETALLE QUE DECIDE SI ESTO SIRVE. Sin target="_blank" el enlace está ahí,
   * se ve azul, se puede pulsar — y no pasa nada, porque el iframe del diálogo
   * no deja navegar. Es el fallo que haría que Jose dijera "no funciona" y yo
   * mirara el href, que estaría perfecto. */
  check('Y CON target="_blank" — sin eso el iframe de Sheets no deja abrir nada ' +
        'y el enlace es un adorno que no hace nada',
        /<a[^>]+class="go"[^>]+target="_blank"/.test(h) || /<base target="_blank">/.test(h), h.substring(0, 200));
  check('la dirección también está en un campo para copiarla a mano',
        h.indexOf('readonly value="' + URL_BUENA + '"') !== -1);
  check('y se dice que se puede guardar en marcadores, que es lo que acaba con ' +
        'la hoja de cálculo para siempre', /[Bb]ookmark/.test(h));
}

{
  /* El botón de copiar no puede decir que copió sin que algo haya contestado que
   * sí. navigator.clipboard está bloqueado en bastantes iframes cerrados y
   * falla EN SILENCIO: el botón diría "Copied" y el portapapeles estaría vacío,
   * y la persona pegaría la nada en la barra del navegador. */
  const ctx = cajaVentana();
  ctx.mostrarEnlaceDeLaApp_('t', URL_BUENA, '', '');
  const h = (ctx.pintado || {}).html || '';
  check('hay un camino de copiado alternativo (execCommand) y no sólo el moderno',
        h.indexOf('execCommand("copy")') !== -1);
  check('y cuando NO se puede copiar se dice, en vez de mentir con un "Copied"',
        /Ctrl\+C/.test(h) && /function fallo/.test(h));
}

{
  const ctx = cajaVentana();
  ctx.mostrarEnlaceDeLaApp_('t', URL_BUENA, '', 'THIS ADDRESS IS A GUESS, not a recorded one.');
  const h = (ctx.pintado || {}).html || '';
  check('el aviso de "esta dirección es una suposición" sale aparte y visible, ' +
        'no pegado detrás de cien caracteres de dirección donde nadie lo lee',
        /class="warn"/.test(h) && /IS A GUESS/.test(h));
}

{
  /* Una dirección con un & dentro —o cualquiera que alguien pueda haber metido
   * a mano en la propiedad— no puede romper el HTML ni, peor, meter etiquetas. */
  const ctx = cajaVentana();
  ctx.mostrarEnlaceDeLaApp_('t', 'https://x.test/a?b=1&c="><script>alert(1)</scr' + 'ipt>', '', '');
  const h = (ctx.pintado || {}).html || '';
  check('una dirección rara sale escapada y no abre una etiqueta nueva',
        h.indexOf('<script>alert(1)') === -1 && h.indexOf('&amp;c=') !== -1);
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. SI LA VENTANA NO SE PUEDE ABRIR, LA DIRECCIÓN NO SE PIERDE
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 2. La red de abajo ═══\n');
{
  const ctx = cajaVentana({ sinPermisoDeVentana: true });
  /* CON try, y no llamando a pelo. Sin él, quitar la red de abajo no hace que
   * esta prueba FALLE: hace que REVIENTE, y entonces las comprobaciones que
   * vienen detrás ni se ejecutan y el informe acusa a lo que no es. Es
   * exactamente lo que me pasó en test-acceso-denegado y lo compruebo mutando:
   * sin la red, aquí salen cuatro fallos legibles, no un volcado de Node. */
  let lanzo = null;
  try {
    ctx.mostrarEnlaceDeLaApp_('✅ Update published!', URL_BUENA, 'This address never changes.', 'ojo');
  } catch (e) { lanzo = e.message; }

  check('sin el permiso de abrir ventanas, NO revienta', lanzo === null, lanzo);
  check('...y la dirección sale igual, en la caja de texto de siempre',
        !!ctx.alertado && String(ctx.alertado.b || '').indexOf(URL_BUENA) !== -1, ctx.alertado);
  check('...con el aviso también', String((ctx.alertado || {}).b || '').indexOf('ojo') !== -1);
  check('y queda apuntado por qué se cayó a la red, para no buscarlo a ciegas',
        ctx.registrado.some(function (l) { return /pintarEnlaceEnVentana_/.test(l); }), ctx.registrado);
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. LA INVITACIÓN: SE MANDA, Y SI NO SE MANDA SE DICE
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 3. El correo de alta ═══\n');

function cajaInvitacion(opciones) {
  opciones = opciones || {};
  const ctx = {
    console, String, Number, Object, Array, Date,
    PRODUCT_NAME: 'Acopio',
    correos: [], auditado: [], errores: [],
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (k) => (k === 'WEB_APP_URL' ? (opciones.url === undefined ? URL_BUENA : opciones.url) : '')
    })},
    MailApp: { sendEmail(o) {
      if (opciones.correoFalla) throw new Error('Service invoked too many times');
      ctx.correos.push(o);
    }},
    auditLog_: (ss, accion, quien, detalle, extra) => ctx.auditado.push({ accion, quien, detalle, extra }),
    logError_: (ss, sev, src, fn, quien, msg) => ctx.errores.push({ sev, fn, msg }),
    companySettings_: () => ({ name: 'OX GLASS' })
  };
  vm.createContext(ctx);
  vm.runInContext(A.levantar(GS, ['invitarUsuario_'], {
    dobles: ['auditLog_', 'logError_', 'companySettings_']
  }), ctx);
  return ctx;
}

const QUIEN = { email: 'jose@ox-glass.com', name: 'Jose Castro' };

{
  const ctx = cajaInvitacion();
  const r = ctx.invitarUsuario_({}, 'sam@demo.example', 'SAM', 'WAREHOUSE', QUIEN);
  const c = ctx.correos[0] || {};

  check('se manda el correo', r.enviado === true && ctx.correos.length === 1, r);
  check('...a la persona que se acaba de dar de alta', c.to === 'sam@demo.example');
  check('...CON LA DIRECCIÓN DENTRO, que es el motivo entero de que exista',
        String(c.body || '').indexOf(URL_BUENA) !== -1);
  check('...y pulsable en la versión con formato', /href="[^"]*\/exec"/.test(String(c.htmlBody || '')));
  check('...diciéndole con qué cuenta entrar, que es el otro motivo por el que ' +
        'la gente no puede entrar el primer día',
        String(c.body || '').indexOf('sam@demo.example') !== -1);
  check('...y que la hoja de cálculo NO le hace falta',
        /do not need the spreadsheet/i.test(String(c.body || '')));
  check('queda apuntado quién invitó a quién',
        ctx.auditado.some(function (a) { return a.accion === 'USER_INVITED'; }), ctx.auditado);
}

{
  /* SIN DIRECCIÓN GUARDADA NO SE INVENTA NINGUNA. En una hoja copiada de otra ya
   * publicada, getUrl() devuelve la del script ORIGINAL — ya costó una tarde en
   * la copia DEMO de Jose. Mandarla en el primer correo de alguien es peor: no
   * se puede retirar, y la persona cree que la app está rota. */
  const ctx = cajaInvitacion({ url: '' });
  const r = ctx.invitarUsuario_({}, 'sam@demo.example', 'SAM', 'WAREHOUSE', QUIEN);
  check('sin dirección guardada NO SE MANDA NADA — más vale no avisar que avisar ' +
        'con una dirección muerta', r.enviado === false && ctx.correos.length === 0);
  check('...y se dice por qué, y dónde se arregla',
        /Push Update Live/.test(r.motivo || ''), r.motivo);
}

{
  const ctx = cajaInvitacion({ correoFalla: true });
  const r = ctx.invitarUsuario_({}, 'sam@demo.example', 'SAM', 'WAREHOUSE', QUIEN);
  check('si el correo falla, se dice que falló en vez de callarlo',
        r.enviado === false && /could not be sent/i.test(r.motivo || ''), r);
  check('...con el motivo real de Google dentro, no un "algo salió mal"',
        /too many times/.test(r.motivo || ''), r.motivo);
  check('...y queda en el registro de errores',
        ctx.errores.some(function (e) { return /invitarUsuario_/.test(e.fn || ''); }), ctx.errores);
}

{
  /* El rol decide lo que la persona puede hacer, así que el correo se lo dice.
   * Un VIEWER que entra esperando poder guardar y no puede abre un ticket. */
  const roles = { VIEWER: /cannot change/i, WAREHOUSE: /record movements/i, ADMIN: /full access/i };
  Object.keys(roles).forEach(function (rol) {
    const ctx = cajaInvitacion();
    ctx.invitarUsuario_({}, 'x@demo.example', '', rol, QUIEN);
    check('el correo de un ' + rol + ' le dice qué va a poder hacer',
          roles[rol].test(String((ctx.correos[0] || {}).body || '')), (ctx.correos[0] || {}).body);
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. EL ALTA MANDA SOBRE EL AVISO
   ═══════════════════════════════════════════════════════════════════════════

   `addUser` escribe la fila ANTES de invitar. Si se invirtiera —invitar y luego
   escribir— un fallo de correo dejaría a alguien sin acceso por no haber podido
   avisarle de que lo tenía. */
console.log('\n═══ 4. Avisar nunca puede deshacer el alta ═══\n');
{
  const src = (GS.match(/function addUser\(data, auth\)[\s\S]*?\n}/) || [''])[0];
  const posFila = src.indexOf('appendRow');
  const posInv  = src.indexOf('invitarUsuario_');
  check('la fila se escribe ANTES de invitar',
        posFila !== -1 && posInv !== -1 && posFila < posInv, { posFila, posInv });
  check('la respuesta lleva si se invitó o no, para que la pantalla no lo adivine',
        /invited:\s*inv\.enviado/.test(src) && /inviteNote:\s*inv\.motivo/.test(src));
  check('y se puede dar de alta SIN avisar — preparar las cuentas antes de que ' +
        'la gente deba entrar es un caso real',
        /data\.invite === false/.test(src));
}

{
  /* La pantalla tiene que contar lo que dijo el servidor. Si pintara el éxito
   * por su cuenta, un correo que no salió se vería como uno que sí. */
  const H = A.fuente('html');
  const sv = (H.match(/function saveUser\(\)[\s\S]*?\n}/) || [''])[0];
  check('el navegador lee la respuesta del servidor, no su propia intención',
        /res\.invited/.test(sv) && /res\.inviteNote/.test(sv), sv.substring(0, 80));
  check('y cuando no salió, la ventana SE QUEDA ABIERTA con el motivo — un aviso ' +
        'que se cierra solo con la ventana no lo lee nadie',
        /_userFormMsg\(res\.inviteNote/.test(sv) && sv.indexOf('return;') < sv.indexOf('closeModal'));
  check('a quien se EDITA no se le manda un "te han dado acceso" otra vez',
        /!_editingUser && !!\(document\.getElementById\('uInvite'\)/.test(sv));
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones\n');
process.exit(fail ? 1 : 0);
