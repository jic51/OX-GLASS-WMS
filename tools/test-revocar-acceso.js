// QUITARLE EL ACCESO A ALGUIEN TIENE QUE QUITARLE EL ACCESO.
//
// Jose, 2026-10-05, sobre la lista de seguridad: *"dale en tu orden sugerido"* —
// y el primero era poder revocar una sesión.
//
// ── LO QUE ENCONTRÉ AL IR A ARREGLARLO ──────────────────────────────────────
//
// Que ya funcionaba… salvo en el caso que de verdad importa. `getUserRole` leía
// USERS_V3 así:
//
//     if (uEmail === userEmail && isActive) return { ...rol... };
//
// Si el correo estaba PERO DESACTIVADO, el bucle seguía, terminaba, y la función
// caía en el apartado siguiente: **la lista vieja de CONFIG**. Y en CONFIG está
// todo el mundo — es la lista de la que se migró.
//
// O sea que en cualquier instalación migrada —la de OX Glass entre ellas—
// **desmarcar a alguien en Manage Users no le quitaba el acceso**. La pantalla
// decía "desactivado", el servidor le dejaba entrar igual, y nadie se enteraba
// porque nada lo comprobaba.
//
// Eso no es una puerta sin guardia. Es una guardia que decía que sí.
//
// ── Y POR QUÉ NO SE VIO ANTES ───────────────────────────────────────────────
//
// Porque `test-endpoint-auth` cuenta que cada puerta TENGA guardia, y lo dice él
// mismo en su cierre: *"prueba que no falta ninguna guarda — no que ninguna sea
// correcta. Una comprobación presente pero equivocada pasa igual."* Ésta estaba
// presente y era equivocada. Este archivo es la otra mitad: EJECUTA la guardia.
//
// Uso:  node tools/test-revocar-acceso.js

const vm = require('vm');
const A  = require('./andamio.js');
const GS = A.fuente('gs');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

/* USERS_V3: A=id, B=correo, C=nombre, D=rol, …, G=activo.
 * CONFIG: la columna F (índice 5) lleva el correo y la G (6) el rol — la lista
 * vieja de la que se migró, que en una instalación de verdad tiene a todos. */
function hoja(filas) {
  return { getLastRow: () => filas.length,
           getDataRange: () => ({ getValues: () => filas.map(r => r.slice()) }) };
}

function montar(usuarios, configUsuarios, correoActivo) {
  const U = [['id','email','name','role','x','y','active']].concat(usuarios);
  const C = [['Projects','Categories','Suppliers','Racks','Type','email','role']]
    .concat((configUsuarios || []).map(u => ['', '', '', '', '', u[0], u[1]]));
  const ctx = {
    console, String, Number, Object, Array,
    SHEETS: { CONFIG: 'CONFIG' },
    SpreadsheetApp: { getActiveSpreadsheet: () => ctx.ss },
    Session: { getActiveUser: () => ({ getEmail: () => correoActivo || '' }) },
    verifySessionToken_: (t) => (t ? String(t) : ''),
    ss: { getSheetByName: (n) => (n === 'USERS_V3' ? hoja(U) : n === 'CONFIG' ? hoja(C) : null) }
  };
  vm.createContext(ctx);
  vm.runInContext(A.levantar(GS, ['getUserRole'], { dobles: ['verifySessionToken_'] }), ctx);
  return ctx;
}

const JOSE  = 'jose@ox-glass.com';
const PEDRO = 'pedro@ox-glass.com';

/* ═══════════════════════════════════════════════════════════════════════════
   1. LO NORMAL
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 1. Un usuario activo entra con su rol ═══\n');
{
  const ctx = montar([['1', JOSE, 'Jose', 'ADMIN', '', '', true]], [], JOSE);
  const r = ctx.getUserRole(null);
  check('entra', r.role === 'ADMIN', r);
  check('y con su nombre', r.name === 'Jose', r);
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. DESACTIVARLO LO DEJA FUERA — AUNQUE ESTÉ EN LA LISTA VIEJA
   ═══════════════════════════════════════════════════════════════════════════

   Éste es el fallo. En una instalación migrada CONFIG tiene a todo el mundo, así
   que este caso no es raro: es EL caso. */
console.log('\n═══ 2. Desactivado es desactivado ═══\n');
{
  const ctx = montar([['2', PEDRO, 'Pedro', 'WAREHOUSE', '', '', false]], [], PEDRO);
  check('desactivado y sin lista vieja: fuera', ctx.getUserRole(null).role === 'DENIED');
}
{
  const ctx = montar(
    [['2', PEDRO, 'Pedro', 'WAREHOUSE', '', '', false]],   // apagado en USERS_V3
    [[PEDRO, 'WAREHOUSE']],                                // pero en la lista vieja
    PEDRO);
  const r = ctx.getUserRole(null);
  check('DESACTIVADO EN USERS_V3 PERO PRESENTE EN LA LISTA VIEJA: FUERA — era el ' +
        'fallo, y en una instalación migrada la lista vieja tiene a todos, así ' +
        'que desmarcar a alguien no hacía absolutamente nada',
        r.role === 'DENIED', r);
}
{
  /* Y con FALSE escrito como texto, que es como lo deja una casilla de Sheets
   * convertida a texto o un backup restaurado a mano. */
  const ctx = montar([['2', PEDRO, 'Pedro', 'WAREHOUSE', '', '', 'FALSE']], [[PEDRO, 'ADMIN']], PEDRO);
  check('...y con el FALSE escrito como texto, igual',
        ctx.getUserRole(null).role === 'DENIED');
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. BORRARLO DE LA LISTA TAMBIÉN
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 3. Quitado de la lista ═══\n');
{
  const ctx = montar([['1', JOSE, 'Jose', 'ADMIN', '', '', true]], [], PEDRO);
  check('quien no está en ninguna lista no entra', ctx.getUserRole(null).role === 'DENIED');
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. EL VALE NO ES LA LLAVE
   ═══════════════════════════════════════════════════════════════════════════

   Lo que de verdad contesta la pregunta "¿y si echo a un empleado?": el token
   firmado dice QUIÉN eres, no SI puedes pasar. Quien decide es la hoja, y se lee
   en cada llamada. */
console.log('\n═══ 4. Un vale válido de alguien ya expulsado no vale ═══\n');
{
  const ctx = montar([['2', PEDRO, 'Pedro', 'WAREHOUSE', '', '', false]], [[PEDRO, 'ADMIN']], '');
  const r = ctx.getUserRole(PEDRO);   // token perfectamente firmado
  check('EL TOKEN DICE QUIÉN ERES, NO SI PUEDES PASAR — con la firma intacta y ' +
        'sin caducar, la hoja manda y le deja fuera', r.role === 'DENIED', r);
  check('y la app sabe de quién era, para poder decírselo', r.email === PEDRO, r);
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. LA LISTA VIEJA SIGUE SIRVIENDO PARA LO QUE DEBE
   ═══════════════════════════════════════════════════════════════════════════

   El arreglo no puede dejar fuera a quien nunca llegó a USERS_V3: en una
   instalación a medio migrar, ésos son usuarios legítimos. */
console.log('\n═══ 5. Quien nunca llegó a la lista nueva sigue entrando ═══\n');
{
  const ctx = montar([['1', JOSE, 'Jose', 'ADMIN', '', '', true]], [[PEDRO, 'WAREHOUSE']], PEDRO);
  const r = ctx.getUserRole(null);
  check('un correo que sólo está en la lista vieja entra, como antes',
        r.role === 'WAREHOUSE', r);
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. LA CASILLA VACÍA SIGNIFICA ACTIVO
   ═══════════════════════════════════════════════════════════════════════════

   Está así a propósito desde antes: las filas creadas antes de que existiera la
   columna la tienen vacía, y tratarlas como apagadas habría echado a todo el
   mundo de golpe. El arreglo de hoy NO puede cambiar eso. */
console.log('\n═══ 6. Sin casilla puesta, sigue entrando ═══\n');
{
  const ctx = montar([['1', JOSE, 'Jose', 'ADMIN', '', '', '']], [], JOSE);
  check('la casilla vacía sigue valiendo como activo — cambiarlo echaría de ' +
        'golpe a todas las filas viejas', ctx.getUserRole(null).role === 'ADMIN');
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones\n');
process.exit(fail ? 1 : 0);
