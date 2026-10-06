// QUIEN LLAMA A LA PUERTA Y NO PUEDE ENTRAR, QUEDA ESCRITO.
//
// Jose, 2026-10-05: *"continúa con registro de los intentos fallidos."*
//
// ── LO QUE HABÍA: NADA ──────────────────────────────────────────────────────
//
// La puerta funcionaba —`requireAuth_` lanzaba y nadie pasaba— pero el rechazo
// no dejaba rastro EN NINGUNA PARTE. Así que, desde dentro, **un intento de
// entrar a la fuerza y un día tranquilo se veían exactamente igual**. Eso no es
// una cerradura: es una cerradura sin mirilla.
//
// ── LAS TRES DECISIONES QUE ESTA PRUEBA DEFIENDE ────────────────────────────
//
//  1. UNA LÍNEA POR PERSONA Y MINUTO. Una pestaña vieja reintenta sola cada
//     veinte segundos. Sin tope, un solo navegador olvidado llena el registro de
//     miles de líneas idénticas y tapa lo que hay que ver. Importa que alguien
//     lo intentó, no cuántas veces rebotó su latido.
//  2. A LOS DIEZ EN DIEZ MINUTOS, CORREO AL DUEÑO. Un registro que nadie abre no
//     avisa de nada — es la lección del ERROR_LOG, que estuvo catorce horas con
//     un desastre dentro sin que nadie lo mirara.
//  3. NUNCA LANZA. Corre dentro del camino que ya está rechazando a alguien: si
//     fallara, convertiría un "no puedes pasar" limpio en un error raro, y el
//     rechazo es lo único que de verdad tiene que ocurrir.
//
// Uso:  node tools/test-acceso-denegado.js

const vm = require('vm');
const A  = require('./andamio.js');
const GS = A.fuente('gs');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

/** Caja con un limitador de verdad (el del producto) y una caché de mentira. */
function montar(opciones) {
  opciones = opciones || {};
  const almacen = {};
  const ctx = {
    console, String, Number, Math, Object, Array, Date,
    PRODUCT_NAME: 'Acopio',
    auditado: [], correos: [],
    _verifiedAuth: null,
    CacheService: { getScriptCache: () => ({
      get: k => (almacen[k] === undefined ? null : almacen[k]),
      put: (k, v) => { almacen[k] = v; }
    })},
    SpreadsheetApp: { getActiveSpreadsheet: () => ({}) },
    Session: { getEffectiveUser: () => ({ getEmail: () => (opciones.sinDueno ? '' : 'jose@ox-glass.com') }) },
    MailApp: { sendEmail(to, asunto, cuerpo){ ctx.correos.push({ to, asunto, cuerpo }); } },
    auditLog_: (ss, accion, quien, detalle) => {
      if (opciones.auditFalla) throw new Error('la hoja no responde');
      ctx.auditado.push({ accion, quien, detalle });
    },
    /* El limitador de verdad usa Utilities para construir su clave. Sin esto,
     * throttle_ lanza, registrarAccesoDenegado_ se lo traga —porque nunca puede
     * lanzar— y la prueba ve un registro vacío creyendo que el producto no
     * apunta nada. Me pasó: el primer intento daba "[]" y el fallo no estaba en
     * el producto sino en mi caja. */
    Utilities: { base64EncodeWebSafe: (t) => Buffer.from(String(t)).toString('base64') },
    Logger: { log(){} }
  };
  vm.createContext(ctx);
  // ROLES_QUE_ESCRIBEN entra aquí desde la v12.45: `levantar` resuelve funciones,
  // no constantes — ésas se piden por su nombre, que es justo lo que documenta
  // el andamio. Sin ella, requireAuth_ revienta con "is not defined" y la prueba
  // acusa al producto de algo que es de la caja.
  vm.runInContext(A.constantes(GS, ['ACCESO_RECHAZOS_AVISO', 'ROLES_QUE_ESCRIBEN']), ctx);
  vm.runInContext(A.levantar(GS, ['throttle_', 'registrarAccesoDenegado_', 'requireAuth_'], {
    dobles: ['auditLog_']
  }), ctx);
  return ctx;
}

const FUERA = { email: 'pedro@ox-glass.com', role: 'DENIED' };

/* ═══════════════════════════════════════════════════════════════════════════
   1. UN RECHAZO SE APUNTA
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 1. Queda escrito ═══\n');
{
  const ctx = montar();
  ctx._verifiedAuth = FUERA;
  let lanzo = null;
  try { ctx.requireAuth_(); } catch (e) { lanzo = e.message; }

  check('el rechazo SIGUE OCURRIENDO — es lo único que de verdad tiene que pasar',
        /Access denied/.test(lanzo || ''), lanzo);
  check('y queda una línea en el registro', ctx.auditado.length === 1, ctx.auditado);
  /* Con `(ctx.auditado[0] || {})` y no `ctx.auditado[0].x`: la primera versión
   * indexaba directo y, cuando no había línea, la prueba REVENTABA en vez de
   * informar — así que una mutación que rompía el registro entero salía como un
   * solo fallo y las demás secciones ni se ejecutaban. Una prueba que se cae no
   * es una prueba que falla. */
  var l1 = ctx.auditado[0] || {};
  check('...bajo ACCESS_DENIED, que es por lo que se puede buscar',
        l1.accion === 'ACCESS_DENIED', l1);
  check('...con el correo de quien lo intentó, que es el dato entero',
        l1.quien === 'pedro@ox-glass.com', l1);
  check('...y con el motivo', /not registered/i.test(l1.detalle || ''), l1);
}

{
  const ctx = montar();
  ctx._verifiedAuth = null;                 // ni siquiera hay sesión
  try { ctx.requireAuth_(); } catch (e) {}
  check('sin sesión ninguna también se apunta, y se dice que no la había',
        ctx.auditado.length === 1 && /no session/i.test((ctx.auditado[0] || {}).quien || ''),
        ctx.auditado);
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. UNA PESTAÑA OLVIDADA NO PUEDE LLENAR EL REGISTRO
   ═══════════════════════════════════════════════════════════════════════════

   Es la parte que decide si esto sirve. El latido reintenta solo cada veinte
   segundos: sin tope, un navegador abierto en una mesa vacía escribe miles de
   líneas iguales y entierra la única que importaba. */
console.log('\n═══ 2. Una por persona y minuto ═══\n');
{
  const ctx = montar();
  ctx._verifiedAuth = FUERA;
  for (let i = 0; i < 40; i++) { try { ctx.requireAuth_(); } catch (e) {} }
  check('CUARENTA INTENTOS, UNA SOLA LÍNEA — lo que importa es que alguien lo ' +
        'intentó, no cuántas veces rebotó su latido',
        ctx.auditado.length === 1, ctx.auditado.length);
}
{
  /* Y dos personas distintas son dos cosas distintas: el tope es por persona,
   * no global. Si fuera global, el primero en rebotar taparía a todos. */
  const ctx = montar();
  ctx._verifiedAuth = FUERA;
  try { ctx.requireAuth_(); } catch (e) {}
  ctx._verifiedAuth = { email: 'ana@otra.com', role: 'DENIED' };
  try { ctx.requireAuth_(); } catch (e) {}
  check('pero dos personas distintas se apuntan por separado',
        ctx.auditado.length === 2, ctx.auditado.map(a => a.quien));
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. A LOS DIEZ, AL DUEÑO
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 3. El aviso al dueño ═══\n');
{
  const ctx = montar();
  ctx._verifiedAuth = FUERA;
  // Cada intento cuenta para el aviso aunque sólo se escriba uno por minuto.
  for (let i = 0; i < ctx.ACCESO_RECHAZOS_AVISO + 3; i++) {
    try { ctx.requireAuth_(); } catch (e) {}
  }
  check('se manda UN correo al pasar de ' + ctx.ACCESO_RECHAZOS_AVISO,
        ctx.correos.length === 1, ctx.correos.length);
  check('...al dueño', ctx.correos.length && ctx.correos[0].to === 'jose@ox-glass.com');
  check('...diciendo QUIÉN lo intentó, que es lo que decide qué hacer',
        ctx.correos.length && /pedro@ox-glass\.com/.test(ctx.correos[0].cuerpo));
  check('...y qué hacer si es alguien de la casa',
        ctx.correos.length && /Manage Users/.test(ctx.correos[0].cuerpo));
  check('...y dónde está el registro entero',
        ctx.correos.length && /AUDIT_LOG/.test(ctx.correos[0].cuerpo));

  /* Y NO SE REPITE. Un aviso por cada rechazo a partir del décimo convierte el
   * buzón del dueño en el ruido del que huíamos. */
  for (let i = 0; i < 50; i++) { try { ctx.requireAuth_(); } catch (e) {} }
  check('CINCUENTA MÁS Y SIGUE SIENDO UN SOLO CORREO', ctx.correos.length === 1,
        ctx.correos.length);
}
{
  const ctx = montar();
  ctx._verifiedAuth = FUERA;
  for (let i = 0; i < ctx.ACCESO_RECHAZOS_AVISO - 2; i++) { try { ctx.requireAuth_(); } catch (e) {} }
  check('por debajo del umbral NO se molesta a nadie — nueve rechazos son un ' +
        'dedo torpe, no un asalto', ctx.correos.length === 0, ctx.correos.length);
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. QUIEN SÍ PUEDE PASAR NO ENSUCIA NADA
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 4. Un usuario normal no deja rastro ═══\n');
{
  const ctx = montar();
  ctx._verifiedAuth = { email: 'jose@ox-glass.com', role: 'ADMIN' };
  const r = ctx.requireAuth_();
  check('entra', r.role === 'ADMIN');
  check('y no se apunta nada — esto es un registro de rechazos, no de visitas',
        ctx.auditado.length === 0 && ctx.correos.length === 0);
}
{
  /* Un VIEWER al que se le niega ESCRIBIR no es un intruso: está dentro y le
   * falta permiso para una cosa. Mezclarlo con los rechazos de la puerta
   * llenaría el registro de gente legítima y escondería a los de fuera. */
  const ctx = montar();
  ctx._verifiedAuth = { email: 'ana@ox-glass.com', role: 'VIEWER' };
  let lanzo = null;
  try { ctx.requireAuth_('WRITE'); } catch (e) { lanzo = e.message; }
  check('a un VIEWER se le sigue negando escribir', /Read-only/.test(lanzo || ''), lanzo);
  check('PERO ESO NO ES UN INTENTO DE ENTRAR — está dentro, le falta un permiso, ' +
        'y mezclarlos escondería a los de fuera entre gente legítima',
        ctx.auditado.length === 0, ctx.auditado);
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. SI EL REGISTRO FALLA, EL RECHAZO SIGUE SIENDO UN RECHAZO
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 5. Apuntar nunca puede estropear la puerta ═══\n');
{
  const ctx = montar({ auditFalla: true });
  ctx._verifiedAuth = FUERA;
  let lanzo = null;
  try { ctx.requireAuth_(); } catch (e) { lanzo = e.message; }
  check('con la hoja rota, el rechazo sale limpio y con su mensaje de siempre',
        /Access denied/.test(lanzo || ''), lanzo);
}
{
  const ctx = montar({ sinDueno: true });
  ctx._verifiedAuth = FUERA;
  for (let i = 0; i < 20; i++) { try { ctx.requireAuth_(); } catch (e) {} }
  check('y sin dueño a quien escribir, tampoco revienta', ctx.correos.length === 0);
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. QUIÉN PUEDE ESCRIBIR — una lista de quién SÍ, no de quién no
   ═══════════════════════════════════════════════════════════════════════════

   Hasta la v12.45, `requireAuth_` decidía si podías escribir así:

       if (minRole === 'WRITE' && a.role === 'VIEWER') throw ...

   Eso no pregunta *"¿puede éste escribir?"*. Pregunta *"¿es VIEWER?"*. Con tres
   roles da el mismo resultado, así que nunca se notó — y por eso no era un fallo
   el día que se encontró, sino el día siguiente a que existiera un rol más:
   **cualquier rol nuevo habría pasado la guardia de escritura sin que nadie lo
   decidiera**, sólo por no llamarse VIEWER. En una app de almacén eso es
   permiso para mover material.

   Tercera vez este mes del mismo patrón: **una guardia que dice que sí.**

   La comprobación que lo cierra es la del rol inventado. Las otras dos pueden
   pasar con el código viejo; ésa no. */
console.log('\n═══ 6. Quién puede escribir ═══\n');
{
  const ctx = montar();
  ctx._verifiedAuth = { email: 'jose@ox-glass.com', role: 'ADMIN' };
  check('un ADMIN escribe', ctx.requireAuth_('WRITE').role === 'ADMIN');

  ctx._verifiedAuth = { email: 'sam@ox-glass.com', role: 'WAREHOUSE' };
  check('un WAREHOUSE escribe', ctx.requireAuth_('WRITE').role === 'WAREHOUSE');

  ctx._verifiedAuth = { email: 'ana@ox-glass.com', role: 'VIEWER' };
  let l1 = null;
  try { ctx.requireAuth_('WRITE'); } catch (e) { l1 = e.message; }
  check('un VIEWER no', /Read-only/.test(l1 || ''), l1);
}

{
  /* LA QUE DE VERDAD CIERRA ESTO. Un rol que no existe hoy: con el código viejo
   * pasaba —no se llama VIEWER— y con el nuevo no pasa, porque no está en la
   * lista de los que escriben. Es la prueba que no se podía escribir mientras
   * la regla fuera "quién no". */
  const ctx = montar();
  ctx._verifiedAuth = { email: 'nuevo@ox-glass.com', role: 'PURCHASING' };
  let lanzo = null;
  try { ctx.requireAuth_('WRITE'); } catch (e) { lanzo = e.message; }
  check('UN ROL QUE NO EXISTE NO ESCRIBE — un rol nuevo no mueve material hasta ' +
        'que alguien lo ponga en la lista a propósito',
        /Read-only/.test(lanzo || ''), lanzo);

  /* Y sigue entrando a leer: no se le expulsa, no se le apunta como intruso.
   * Está registrado; lo que no tiene es permiso para una cosa. Mezclar las dos
   * cosas llenaría el registro de rechazos de gente legítima. */
  check('...pero sí entra a leer, y no se le apunta como intruso — está dentro, ' +
        'le falta un permiso', ctx.requireAuth_().role === 'PURCHASING' &&
        ctx.auditado.length === 0, ctx.auditado);
}

{
  /* La lista de roles válidos estaba escrita a mano en DOS sitios y ahora
   * harían falta tres. Tres copias de la misma lista es el fallo que llevamos
   * todo el mes arreglando en otros sitios, y aquí la coincidencia decide quién
   * entra. */
  const src = A.fuente('gs');
  check('los roles válidos viven en UNA constante, no copiados por el archivo',
        /var ROLES = \['ADMIN', 'WAREHOUSE', 'VIEWER'\]/.test(src) &&
        !/\['ADMIN','WAREHOUSE','VIEWER'\]/.test(src), 'quedan copias a mano');
  check('...y los que escriben, en otra — VIEWER no está, y ésa es la frase entera',
        /var ROLES_QUE_ESCRIBEN = \['ADMIN', 'WAREHOUSE'\]/.test(src));
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones\n');
process.exit(fail ? 1 : 0);
