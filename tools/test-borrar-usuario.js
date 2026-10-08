// DOS SALIDAS TAPIADAS Y NINGUNA PUERTA.
//
// Jose, 2026-10-08, atrapado en una esquina que hizo la app:
//
//   *"hay 2 correos muy parecidos, de la misma persona, y no hay forma de
//    borrar ninguno; también traté de corregir el correo con la 's' de más pero
//    me dice que ya existe otro usuario con ese correo. Entonces no puedo
//    corregir el que está mal y tampoco puedo eliminarlo. No hay forma de
//    corregir nada aquí."*
//
// Tiene razón, y la esquina la cerré yo. La v12.48 dejó corregir un correo y
// —correctamente— se niega si el nuevo ya lo tiene otra fila. Pero sin forma de
// BORRAR una fila, esa negativa encierra el error para siempre.
//
// Cada mitad estaba bien por separado. Juntas son una trampa. Es la lección que
// deja esta prueba: una negativa correcta sin una salida al lado deja de ser
// correcta.
//
// ── Y LA PARTE QUE SE OLVIDA ──────────────────────────────────────────────
//
// Quien siga en la LISTA VIEJA de CONFIG vuelve a aparecer él solo la próxima
// vez que la app la revise (adoptarUsuarioDeConfig_). Borrar la fila sin
// limpiar ahí sería prometer un borrado que se deshace en unas horas — y es
// justamente lo que le pasó a Jose: *"la app migró todos los correos otra vez
// de config"*. Eso lo mide la sección 3, y es lo que hace que el borrado sea
// un borrado.
//
// Uso:  node tools/test-borrar-usuario.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const GS   = fs.readFileSync(path.join(ROOT, 'Code_v3_fixed.gs'), 'utf8');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');
const A    = require('./andamio.js');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

// ── Hojas de mentira ────────────────────────────────────────────────────────
function Hoja(filas) { this.filas = filas; }
Hoja.prototype.getDataRange = function () { var f = this.filas; return { getValues: function(){ return f; } }; };
Hoja.prototype.getLastRow   = function () { return this.filas.length; };
Hoja.prototype.deleteRow    = function (n) { this.filas.splice(n - 1, 1); };
Hoja.prototype.getRange     = function (fila, col, nf, nc) {
  var f = this.filas;
  return {
    setValues: function (v) { for (var j = 0; j < (nc || 1); j++) f[fila - 1][col - 1 + j] = v[0][j]; },
    setValue:  function (v) { f[fila - 1][col - 1] = v; },
    getValues: function () {
      var out = [];
      for (var r = 0; r < (nf || 1); r++) {
        var row = [];
        for (var c = 0; c < (nc || 1); c++) row.push(f[fila - 1 + r][col - 1 + c]);
        out.push(row);
      }
      return out;
    }
  };
};

const CABECERA = ['ID','Email','Name','Role','Added By','Added At','Active'];
function caja(opts) {
  opts = opts || {};
  const usuarios = new Hoja([CABECERA.slice()].concat(
    (opts.usuarios || [
      ['U1','jefe@ox-glass.com','Jefe','ADMIN','jefe@ox-glass.com','2026-01-01',true],
      ['U2','jose@ox-glasss.com','Jose','WAREHOUSE','jefe@ox-glass.com','2026-01-01',false],
      ['U3','jose@ox-glass.com','Jose','VIEWER','migrated from CONFIG','2026-10-06',true]
    ]).map(r => r.slice())));
  // CONFIG: la columna F (índice 5) es el correo, la G (6) el rol.
  const config = new Hoja((opts.config || [
    ['Projects','Categories','Suppliers','Locations','Loc Type','User Email','User Role'],
    ['','','','','','jose@ox-glasss.com','WAREHOUSE'],
    ['','','','','','jose@ox-glass.com','VIEWER']
  ]).map(r => r.slice()));

  const auditoria = [];
  const sandbox = {
    console, Date, JSON,
    requireAuth_: () => ({ email: opts.quien || 'jefe@ox-glass.com', role: 'ADMIN' }),
    SpreadsheetApp: { getActiveSpreadsheet: () => ({
      getSheetByName: n => (n === 'USERS_V3' ? usuarios : (n === 'CONFIG' ? config : null)) }) },
    SHEETS: { CONFIG: 'CONFIG' },
    auditLog_: (...a) => { auditoria.push(a); },
    Logger: { log: () => {} }
  };
  vm.createContext(sandbox);
  vm.runInContext(A.fnSrc(GS, 'limpiarUsuarioDeConfig_') + '\n' +
                  A.fnSrc(GS, 'deleteUserRow'), sandbox);
  return { sandbox, usuarios, config, auditoria };
}

const correos = h => h.filas.slice(1).map(r => r[1]);

console.log('\n═══ 1. La fila se va de verdad ═══\n');
{
  const { sandbox, usuarios } = caja();
  const res = sandbox.deleteUserRow({ email: 'jose@ox-glasss.com' });
  check('EL CASO DE JOSE: la fila con la errata desaparece — antes no había forma de quitarla',
    correos(usuarios).indexOf('jose@ox-glasss.com') === -1, correos(usuarios));
  check('...y el correo bueno se queda donde estaba',
    correos(usuarios).indexOf('jose@ox-glass.com') !== -1, correos(usuarios));
  check('...y nadie más se mueve', usuarios.filas.length === 3, usuarios.filas.length);
  check('...y el servidor dice a quién borró', res.email === 'jose@ox-glasss.com', res);
}

console.log('\n═══ 2. Antes de irse, queda escrita entera ═══\n');
{
  const { sandbox, auditoria } = caja();
  sandbox.deleteUserRow({ email: 'jose@ox-glasss.com' });
  const texto = JSON.stringify(auditoria);
  check('se registra el borrado', /DELETE_USER_ROW/.test(texto));
  /* Un resumen no basta justo aquí: si dentro de un año alguien pregunta qué
   * rol tenía esa cuenta y quién la dio de alta, ESTA es la única copia que
   * queda. */
  check('...con LA FILA ENTERA dentro, no un resumen — es la única copia que va a quedar',
    /WAREHOUSE/.test(texto) && /jose@ox-glasss\.com/.test(texto), texto.slice(0, 200));
}

console.log('\n═══ 3. Y no vuelve solo, que es lo que le pasó a Jose ═══\n');
{
  const { sandbox, config } = caja();
  const res = sandbox.deleteUserRow({ email: 'jose@ox-glasss.com' });
  /* LA PARTE QUE SE OLVIDA. Quien siga en la lista vieja de CONFIG reaparece
   * solo la próxima vez que la app la revise. Borrar la fila y dejar el correo
   * ahí sería prometer un borrado que se deshace en unas horas. */
  check('el correo TAMBIÉN se limpia de la lista vieja de CONFIG — si no, vuelve a aparecer ' +
        'solo la próxima vez que la app la revise',
    config.filas[1][5] === '' && config.filas[1][6] === '', config.filas[1]);
  check('...y se dice, para poder contarlo en pantalla', res.removedFromLegacyList === true, res);
  check('...sin tocar la fila de CONFIG del correo bueno',
    config.filas[2][5] === 'jose@ox-glass.com', config.filas[2]);
  check('...ni ninguna otra columna de esa fila — sólo la F y la G',
    config.filas[1][0] === '' && config.filas[1].length === 7, config.filas[1]);
}
{
  // Lo normal: la mayoría de usuarios NO están en la lista vieja.
  const { sandbox } = caja({ config: [['a','b','c','d','e','User Email','User Role']] });
  const res = sandbox.deleteUserRow({ email: 'jose@ox-glasss.com' });
  check('no estar en la lista vieja es el caso NORMAL y no es un error',
    res.status === 'success' && res.removedFromLegacyList === false, res);
}

console.log('\n═══ 4. Las dos cosas que no se pueden hacer ═══\n');
{
  const { sandbox, usuarios } = caja({ quien: 'jose@ox-glasss.com' });
  let e = null;
  try { sandbox.deleteUserRow({ email: 'jose@ox-glasss.com' }); } catch (err) { e = err.message; }
  check('NO se puede borrar uno su propia fila', /your own account/i.test(e || ''), e);
  check('...y no se escribió nada', correos(usuarios).indexOf('jose@ox-glasss.com') !== -1);
  /* Esta regla es además lo que hace innecesaria una guarda de "último
   * administrador": quien llama es ADMIN y sigue estando después, así que
   * siempre queda uno. Si alguien quita la de arriba creyéndola una comodidad,
   * abre esa puerta sin darse cuenta. */
  check('...y por eso no puede quedarse la instalación sin ningún administrador: quien ' +
        'borra es ADMIN y sigue ahí', true);
}
{
  const { sandbox } = caja();
  let e = null;
  try { sandbox.deleteUserRow({ email: 'nadie@ox-glass.com' }); } catch (err) { e = err.message; }
  check('un correo que no está se dice, no se traga en silencio', /not found/i.test(e || ''), e);
}

console.log('\n═══ 5. Y la negativa del duplicado ahora tiene salida ═══\n');
{
  const src = A.fnSrc(GS, 'updateUser');
  check('al chocar con un correo que ya existe, el mensaje DICE QUÉ HACER — una negativa sin ' +
        'salida es una trampa, y es exactamente donde Jose se quedó encerrado',
    /Delete permanently/.test(src), src.slice(src.indexOf('already registered'), src.indexOf('already registered') + 220));
}

console.log('\n═══ 6. La pantalla ═══\n');
{
  check('hay un botón de borrar de verdad', /id="btnDeleteUser"/.test(HTML));
  check('...en rojo, porque no es lo normal', /btnDeleteUser[\s\S]{0,120}btn-danger|btn-danger[\s\S]{0,80}btnDeleteUser/.test(HTML));
  check('...escondido por omisión: dando de alta no hay nada que borrar',
    /id="btnDeleteUser"[\s\S]{0,160}display:none/.test(HTML));
  check('...y separado de Guardar, para que no se pulse por descuido',
    /btnDeleteUser[\s\S]{0,160}margin-right:auto/.test(HTML));

  const fn = A.fnSrc(HTML, 'deleteUserPermanently');
  check('pregunta antes', /_showConfirm/.test(fn) && /danger: true/.test(fn));
  /* Las tres cosas que hay que saber ANTES de pulsar. La segunda es la que
   * tranquiliza, y sin ella el aviso sólo da miedo. */
  check('...y el aviso dice que lo que esa persona REGISTRÓ no se toca',
    /Everything they recorded stays/.test(fn));
  check('...que no se puede deshacer', /cannot be undone/.test(fn));
  check('...y que para alguien que sí trabajó aquí lo correcto es Deactivate',
    /use Deactivate/.test(fn));
  check('la lista se arregla en el acto, sin volver a preguntar al servidor',
    /_usersData = \(_usersData \|\| \[\]\)\.filter/.test(fn) && /_renderUsersTable\(\)/.test(fn));
  check('el botón no se enseña sobre tu propia fila — un botón que siempre va a decir que ' +
        'no es una forma de mentir',
    /btnDeleteUser[\s\S]{0,260}userEmail/.test(A.fnSrc(HTML, 'editUser')));
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones\n');
process.exit(fail ? 1 : 0);
