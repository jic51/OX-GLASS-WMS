// LAS SEIS PUERTAS QUE COMPROBABAN QUIÉN ERES Y NO CUÁNTO LLAMAS.
//
// Apuntado en `SEGURIDAD-ESTADO.md` 2.3 el 2026-10-05, arreglado el 2026-10-13.
//
// ── QUÉ ESTABA MAL, Y POR QUÉ NO ERA UN AGUJERO DE LOS NORMALES ─────────────
//
// `getIncoming`, `addIncoming`, `updateIncoming`, `deleteIncoming`,
// `getMonitoredMaterials` y `getSetupState` comprobaban IDENTIDAD —ninguna
// dejaba pasar a un desconocido— pero no tenían tope de llamadas, mientras
// `processMovement` y `getInitialData` sí lo tenían.
//
// Lo que permitían no era hacer nada indebido. Era **agotar la cuota diaria de
// Apps Script de la instalación**, y eso deja la app muerta para TODOS hasta el
// día siguiente. Una denegación de servicio barata, y que puede causar sin
// querer una pestaña olvidada reintentando en bucle.
//
// ── POR QUÉ ESTA PRUEBA LLAMA A LAS FUNCIONES EN VEZ DE BUSCAR EL `requireQuota_`
//
// Buscar la línea en el archivo diría que el tope ESTÁ ESCRITO. No diría que
// SALTA. Un tope puesto después del trabajo caro no protege de nada —el trabajo
// ya se hizo— y un cubo distinto por función hace que alternarlas lo esquive.
// Las dos cosas pasan desapercibidas a un grep y las dos se ven llamando.
//
// Es la misma lección que la prueba de los botones: leer la regla de 44 px la
// aprobaba mientras el botón se dibujaba a 34.
//
// Uso:  node tools/test-topes.js

const vm = require('vm');
const A  = require('./andamio.js');
const GS = A.fuente('gs');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FALLA ' + label + (extra === undefined ? '' : '  → ' + JSON.stringify(extra))); }
}

/* Una caja con el limitador DE VERDAD (el del producto) y una caché de mentira
 * que se comporta como la de Apps Script: guarda texto y lo devuelve. Todo lo
 * que hay DESPUÉS del tope en cada función es un doble, porque lo que se mide
 * aquí es el tope y no la hoja. */
function montar(opciones) {
  opciones = opciones || {};
  const almacen = {};
  const ctx = {
    console, String, Number, Math, Object, Array, Date, JSON, Error,
    PRODUCT_NAME: 'Acopio',
    _rol: opciones.rol || { role: 'ADMIN', email: 'jose@ox-glass.com' },
    CacheService: { getScriptCache: () => ({
      get: k => (almacen[k] === undefined ? null : almacen[k]),
      put: (k, v) => { almacen[k] = v; },
      remove: k => { delete almacen[k]; }
    })},
    Utilities: { base64EncodeWebSafe: t => Buffer.from(String(t)).toString('base64') },
    Session: { getActiveUser: () => ({ getEmail: () => (opciones.activo || '') }) },
    /* Dobles de todo lo que viene después del tope. */
    getUserRole: function(){ return ctx._rol; },
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => null }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
    withStockLock_: function(f){ return f(); },
    ensureIncomingSheet_: function(){ throw new Error('LLEGÓ AL TRABAJO CARO'); },
    companySettings_: function(){ return { setupComplete: true }; },
    Logger: { log(){} }
  };
  vm.createContext(ctx);
  vm.runInContext(A.levantar(GS,
    ['throttle_', 'requireQuota_', 'getIncoming', 'getMonitoredMaterials',
     'addIncoming', 'updateIncoming', 'deleteIncoming', 'getSetupState'],
    { dobles: ['getUserRole', 'withStockLock_', 'ensureIncomingSheet_',
               'companySettings_'] }), ctx);
  return ctx;
}

/** Llama `n` veces y devuelve en cuál saltó el tope (o null si nunca saltó). */
function hastaQueSalte(fn, n) {
  for (let i = 1; i <= n; i++) {
    try { fn(); }
    catch (e) {
      if (/Too many requests/i.test(e.message)) return i;
      /* Cualquier otro error es del trabajo de después, no del tope: significa
       * que la llamada PASÓ el tope. Se sigue contando. */
    }
  }
  return null;
}

console.log('\n═══ 1. LAS DOS LECTURAS: 180 en 300 s ═══\n');
{
  const ctx = montar();
  const n = hastaQueSalte(() => ctx.getIncoming('tok'), 400);
  check('`getIncoming` deja de contestar en la llamada 181', n === 181, { salto: n });
}
{
  const ctx = montar();
  const n = hastaQueSalte(() => ctx.getMonitoredMaterials('tok'), 400);
  check('`getMonitoredMaterials` deja de contestar en la 181', n === 181, { salto: n });
}

/* Que cada lectura tenga SU cubo también es una decisión: abrir la pestaña de
 * entrantes no debe gastar el cupo de los materiales vigilados. */
{
  const ctx = montar();
  hastaQueSalte(() => ctx.getIncoming('tok'), 200);          // esta ya está agotada
  let paso = false;
  try { ctx.getMonitoredMaterials('tok'); paso = true; }
  catch (e) { paso = !/Too many requests/i.test(e.message); }
  check('agotar una lectura NO agota la otra: cubos separados', paso);
}

console.log('\n═══ 2. LAS TRES ESCRITURAS COMPARTEN CUBO ═══\n');
//
// Ésta es la comprobación que un grep no puede hacer. Si cada una tuviera su
// cubo, alternar alta → cambio → borrado triplicaría el tope sin que ninguna
// línea del código pareciera mal escrita.
{
  const ctx = montar();
  const n = hastaQueSalte(() => ctx.addIncoming({ _sessionToken: 't' }), 400);
  check('`addIncoming` solo deja de contestar en la 121', n === 121, { salto: n });
}
{
  const ctx = montar();
  /* 60 altas y 60 cambios: 120 escrituras repartidas. Si el cubo es compartido,
   * la 121 —un borrado— tiene que rebotar. */
  for (let i = 0; i < 60; i++) { try { ctx.addIncoming({ _sessionToken: 't' }); } catch (e) {} }
  for (let i = 0; i < 60; i++) { try { ctx.updateIncoming({ _sessionToken: 't' }); } catch (e) {} }
  let reboto = false;
  try { ctx.deleteIncoming('INC-1', 't'); }
  catch (e) { reboto = /Too many requests/i.test(e.message); }
  check('60 altas + 60 cambios agotan el cupo, y el borrado 121 rebota: ' +
        'alternarlas no esquiva el tope', reboto);
}

console.log('\n═══ 3. EL TOPE VA ANTES DEL TRABAJO CARO ═══\n');
//
// `ensureIncomingSheet_` es un doble que LANZA a propósito. Si la llamada
// rebotada llegara hasta él, veríamos su error en vez del del tope — y eso
// significaría que el tope está puesto después de abrir la hoja, que es
// exactamente el tope que no sirve para nada.
{
  const ctx = montar();
  for (let i = 0; i < 120; i++) { try { ctx.addIncoming({ _sessionToken: 't' }); } catch (e) {} }
  let msg = '';
  try { ctx.addIncoming({ _sessionToken: 't' }); } catch (e) { msg = e.message; }
  check('la llamada 121 rebota en el tope y NO llega a abrir la hoja',
        /Too many requests/i.test(msg) && !/TRABAJO CARO/.test(msg), { msg });
}

console.log('\n═══ 4. LA IDENTIDAD SIGUE MANDANDO SOBRE EL TOPE ═══\n');
//
// El tope va DESPUÉS de la guardia a propósito: a un desconocido se le dice que
// no está autenticado, no que llamó demasiado. Si fuera al revés, un extraño
// gastaría sitio en la caché de contadores y, peor, el mensaje le diría que la
// puerta existe y que vuelva más tarde.
{
  const ctx = montar({ rol: { role: 'NO_SESSION', email: '' } });
  let msg = '';
  try { ctx.getIncoming(''); } catch (e) { msg = e.message; }
  check('sin sesión se dice «Not authenticated», no «Too many requests»',
        /Not authenticated/i.test(msg), { msg });
}
{
  const ctx = montar({ rol: { role: 'WAREHOUSE', email: 'ana@ox-glass.com' } });
  let msg = '';
  try { ctx.addIncoming({ _sessionToken: 't' }); } catch (e) { msg = e.message; }
  check('a quien no es admin se le dice «Admin only», no «Too many requests»',
        /Admin only/i.test(msg), { msg });
}

/* Y el contador es POR PERSONA: que Ana agote el suyo no deja fuera a Jose. Es
 * lo que hace que una pestaña olvidada de una sola persona no tumbe la pestaña
 * de entrantes de toda la bodega. */
{
  const ctx = montar();
  ctx._rol = { role: 'ADMIN', email: 'ana@ox-glass.com' };
  hastaQueSalte(() => ctx.getIncoming('t'), 200);
  ctx._rol = { role: 'ADMIN', email: 'jose@ox-glass.com' };
  let paso = false;
  try { ctx.getIncoming('t'); paso = true; } catch (e) { paso = !/Too many requests/i.test(e.message); }
  check('el contador es por persona: Ana agotada no deja fuera a Jose', paso);
}

console.log('\n═══ 5. `getSetupState`, LA QUE NO TIENE A QUIÉN CONTAR ═══\n');
//
// Es la única que corre sin identidad, y tiene que ser así: hay que poder
// preguntar «¿esto está configurado?» antes de que exista nadie. Por eso su
// contador se lleva por usuario activo cuando Apps Script lo ve, y por un cubo
// compartido `anon` cuando no.
{
  const ctx = montar({ activo: '' });
  const n = hastaQueSalte(() => ctx.getSetupState(), 300);
  check('sin identidad ninguna, el cubo compartido corta en la 121', n === 121, { salto: n });
}
{
  const ctx = montar({ activo: 'ana@ox-glass.com' });
  const n = hastaQueSalte(() => ctx.getSetupState(), 300);
  check('con usuario del dominio, el contador es suyo y también corta en la 121',
        n === 121, { salto: n });
}
{
  /* Lo que de verdad importa de separar los cubos: un desconocido llenando el
   * cubo `anon` NO puede dejar fuera a la gente del dominio del cliente. */
  const anon = montar({ activo: '' });
  hastaQueSalte(() => anon.getSetupState(), 200);
  const dominio = montar({ activo: 'ana@ox-glass.com' });
  let paso = false;
  try { dominio.getSetupState(); paso = true; }
  catch (e) { paso = !/Too many requests/i.test(e.message); }
  check('el cubo anónimo no arrastra al de la gente del dominio', paso);
}

console.log('\n═══ 6. LO QUE DEVUELVE `getSetupState`, QUE SE REVISÓ DE PASO ═══\n');
//
// `SEGURIDAD-ESTADO.md` 2.4 pedía mirar qué devuelve esta puerta sin identidad.
// Revisado el 2026-10-13: con la instalación YA configurada devuelve dos cosas
// y nada más. El correo del dueño sólo aparece cuando NO está configurada, y
// ahí no es un descuido: es el mensaje «pídele a Fulano que termine la
// instalación», sin el cual quien llega ve un «acceso denegado» verdadero e
// inútil. No se cambia; lo que lo protege es el tope de arriba.
{
  const ctx = montar();
  const out = ctx.getSetupState();
  check('configurada: no sale el correo del dueño', !out.ownerEmail, out);
  check('configurada: devuelve dos datos y nada más',
        Object.keys(out).length === 2, Object.keys(out));
}
{
  const ctx = montar({ activo: 'ana@ox-glass.com' });
  ctx.companySettings_ = function(){ return { setupComplete: false }; };
  const out = ctx.getSetupState();
  check('sin configurar: SÍ sale, porque es el mensaje de a quién pedírselo',
        out.needsSetup === true && 'ownerEmail' in out, out);
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallos · ' : '✓ todo bien · ') + (ok + fail) + ' comprobaciones\n');
process.exit(fail ? 1 : 0);
