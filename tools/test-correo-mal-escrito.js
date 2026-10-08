// UNA LETRA DE MÁS, Y LA ÚNICA SALIDA ERA ABRIR LA HOJA.
//
// Jose, 2026-10-07, después de un día entero sin poder entrar en la DEMO con su
// cuenta de empresa: *"el correo de jose@ox-glass.com está mal escrito, nadie se
// enteró de que estaba mal, y la única conclusión es que la app está mal…
// también la app no me permite editar el correo, sólo el nombre y el tipo de
// usuario."*
//
// Decía `jose@ox-glasss.com`. Tres eses.
//
// ── LO QUE PASÓ, Y POR QUÉ NADIE LO VIO ───────────────────────────────────
//
// Es un correo VÁLIDO. Ninguna comprobación de forma lo caza, ni debe: el
// dominio existe o no existe, y eso no se puede saber desde aquí. Así que la
// app lo guardó, lo pintó en la lista con su palomita verde de Activo, y
// cuando él intentó entrar le contestó —con toda la razón y sin ayudar en
// nada— que esa cuenta no estaba registrada.
//
// Dos pantallas que se contradicen y ninguna miente. Y la de los usuarios es la
// que cualquiera habría creído.
//
// ── Y LA PARTE GRAVE ES LA SALIDA, NO EL FALLO ────────────────────────────
//
// El correo NO SE PODÍA EDITAR: el campo estaba `disabled`. Para corregir una
// letra había que abrir el Sheet y escribirla a mano — justo lo que toda la
// dirección del producto lleva meses intentando que nadie tenga que hacer.
//
// El campo estaba bloqueado por una razón de verdad: el correo es la identidad,
// y cambiarlo cambia quién entra. Pero "esto es delicado" no se resuelve
// quitando el botón. Se resuelve poniendo las guardas, que es lo que mide esto.
//
// Uso:  node tools/test-correo-mal-escrito.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const GS   = fs.readFileSync(path.join(ROOT, 'Code_v3_fixed.gs'), 'utf8');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

function fnSrc(src, name) {
  const start = src.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('no está: ' + name);
  let depth = 0;
  for (let i = src.indexOf('{', start); i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  throw new Error('llaves sin cerrar en ' + name);
}

// ── El doble de la hoja USERS_V3 ────────────────────────────────────────────
// Columnas (1-based): 1 ID, 2 Email, 3 Name, 4 Role, 5 AddedBy, 6 AddedAt, 7 Active
function hojaFalsa(filas) {
  const datos = [['ID','Email','Name','Role','Added By','Added At','Active']].concat(
    filas.map(f => [f.id, f.email, f.name, f.role, 'jefe@ox-glass.com', '2026-01-01', true]));
  return {
    datos,
    getDataRange: () => ({ getValues: () => datos }),
    getRange: (fila, col) => ({ setValue: v => { datos[fila - 1][col - 1] = v; } })
  };
}

function caja(filas, quienLlama) {
  const auditoria = [];
  const hoja = hojaFalsa(filas);
  const sandbox = {
    console,
    requireAuth_: () => ({ email: quienLlama || 'jefe@ox-glass.com', role: 'ADMIN' }),
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: n => (n === 'USERS_V3' ? hoja : null) }) },
    textCell_: v => String(v),
    auditLog_: (...a) => { auditoria.push(a); }
  };
  vm.createContext(sandbox);
  vm.runInContext(fnSrc(GS, 'updateUser'), sandbox);
  return { sandbox, hoja, auditoria };
}

const BASE = [
  { id: 'U1', email: 'jefe@ox-glass.com',    name: 'Jefe',  role: 'ADMIN' },
  { id: 'U2', email: 'jose@ox-glasss.com',   name: 'Jose',  role: 'WAREHOUSE' },
  { id: 'U3', email: 'ana@ox-glass.com',     name: 'Ana',   role: 'VIEWER' }
];

console.log('\n═══ 1. El correo se puede corregir, que es lo que faltaba ═══\n');
{
  const { sandbox, hoja, auditoria } = caja(BASE);
  const res = sandbox.updateUser({ email: 'jose@ox-glasss.com', newEmail: 'jose@ox-glass.com',
                                   name: 'Jose', role: 'WAREHOUSE' });
  check('la fila queda con el correo corregido — antes esto sólo se podía hacer ' +
        'abriendo la hoja a mano', hoja.datos[2][1] === 'jose@ox-glass.com', hoja.datos[2]);
  check('...y el servidor devuelve el correo nuevo, para que la lista de la pantalla ' +
        'no se quede con el viejo', res.email === 'jose@ox-glass.com', res);
  check('...y queda escrito DE DÓNDE A DÓNDE, que es justo para lo que existen las dos ' +
        'últimas columnas de AUDIT_LOG',
    JSON.stringify(auditoria).indexOf('jose@ox-glasss.com') !== -1 &&
    JSON.stringify(auditoria).indexOf('CHANGE_USER_EMAIL') !== -1, auditoria);
  check('...y las otras filas no se tocan', hoja.datos[1][1] === 'jefe@ox-glass.com' &&
        hoja.datos[3][1] === 'ana@ox-glass.com');
}

console.log('\n═══ 2. Las tres guardas ═══\n');
{
  const { sandbox, hoja } = caja(BASE);
  let e = null;
  try { sandbox.updateUser({ email: 'jose@ox-glasss.com', newEmail: 'ana@ox-glass.com' }); }
  catch (err) { e = err.message; }
  check('NO al correo que ya tiene otra fila — dos filas con el mismo correo es donde una ' +
        'dice ADMIN y la otra VIEWER y nadie sabe cuál gana', /already registered/i.test(e || ''), e);
  check('...y NO SE ESCRIBIÓ NADA antes de darse cuenta: media actualización aplicada es ' +
        'peor que ninguna', hoja.datos[2][1] === 'jose@ox-glasss.com', hoja.datos[2]);
}
{
  // Quien llama ES la fila que intenta cambiar.
  const { sandbox, hoja } = caja(BASE, 'jose@ox-glasss.com');
  let e = null;
  try { sandbox.updateUser({ email: 'jose@ox-glasss.com', newEmail: 'jose@ox-glass.com' }); }
  catch (err) { e = err.message; }
  check('NO a cambiarse el correo de uno mismo — perdería el acceso en el acto, siendo el ' +
        'administrador, y nadie podría deshacerlo desde la app',
    /your own email/i.test(e || ''), e);
  check('...y el mensaje DICE QUÉ HACER en vez de sólo negarse',
    /another administrator|second user/i.test(e || ''), e);
  check('...y tampoco se escribió nada', hoja.datos[2][1] === 'jose@ox-glasss.com');
}
{
  const { sandbox } = caja(BASE);
  let e = null;
  try { sandbox.updateUser({ email: 'jose@ox-glasss.com', newEmail: 'esto no es un correo' }); }
  catch (err) { e = err.message; }
  check('NO a lo que no tiene forma de correo', /does not look like an email/i.test(e || ''), e);
}

console.log('\n═══ 3. Lo de siempre sigue funcionando ═══\n');
{
  const { sandbox, hoja } = caja(BASE);
  sandbox.updateUser({ email: 'jose@ox-glasss.com', name: 'Jose Castro', role: 'ADMIN' });
  check('cambiar sólo el nombre y el rol no toca el correo — el caso normal no puede ' +
        'haberse roto al añadir el nuevo',
    hoja.datos[2][1] === 'jose@ox-glasss.com' && hoja.datos[2][2] === 'Jose Castro' &&
    hoja.datos[2][3] === 'ADMIN', hoja.datos[2]);
}
{
  const { sandbox, hoja } = caja(BASE);
  sandbox.updateUser({ email: 'jose@ox-glasss.com', newEmail: 'jose@ox-glasss.com', role: 'VIEWER' });
  check('mandar el MISMO correo como nuevo no cuenta como cambio — ni falla, ni escribe ' +
        'una entrada de auditoría que no pasó',
    hoja.datos[2][1] === 'jose@ox-glasss.com' && hoja.datos[2][3] === 'VIEWER');
}

// ── El aviso de la errata, que vive en el navegador ────────────────────────
console.log('\n═══ 4. "Nadie más está en ese dominio. ¿Quisiste decir…?" ═══\n');
{
  /* EL DECORADO ES EL DE ANTES DE LA ERRATA, no el de después.
   *
   * Primero lo monté con la fila mala ya dentro, y la prueba falló con razón:
   * si `jose@ox-glasss.com` ya está en la lista, entonces ese dominio SÍ lo usa
   * alguien y callarse es lo correcto. Lo que hay que medir es el momento en
   * que la errata se teclea POR PRIMERA VEZ, que es cuando todavía se puede
   * evitar — y en ese momento la lista sólo tiene correos de `ox-glass.com`.
   *
   * Fallo mío de la caja, no del producto, y de los útiles: me obligó a
   * escribir el caso que de verdad importa en vez del que tenía a mano. */
  const ANTES = [{ email: 'jefe@ox-glass.com' }, { email: 'ana@ox-glass.com' }];
  const sandbox = { console, _usersData: ANTES };
  vm.createContext(sandbox);
  vm.runInContext(fnSrc(HTML, '_distanciaTexto') + '\n' + fnSrc(HTML, '_dominioParecido'), sandbox);

  check('EL CASO DE JOSE: se teclea `jose@ox-glasss.com` y todos los demás están en ' +
        '`ox-glass.com` → SE AVISA. Una errata es exactamente eso: casi igual',
    sandbox._dominioParecido('jose@ox-glasss.com') === 'ox-glass.com',
    sandbox._dominioParecido('jose@ox-glasss.com'));

  check('un dominio que ya usa alguien NO se avisa — es el caso normal y avisar ahí sería ' +
        'ruido', sandbox._dominioParecido('nuevo@ox-glass.com') === '');

  check('un dominio LEJANO no se avisa — el gmail de un contratista es legítimo y frecuente, ' +
        'y un aviso ahí se aprende a ignorar',
    sandbox._dominioParecido('contratista@gmail.com') === '',
    sandbox._dominioParecido('contratista@gmail.com'));

  check('dos letras también se avisan (ox-glas.co)',
    sandbox._dominioParecido('x@ox-glas.co') === 'ox-glass.com',
    sandbox._dominioParecido('x@ox-glas.co'));

  /* La fila que se está editando NO cuenta como "alguien que ya usa ese
   * dominio": si contara, corregir la errata de la única fila que la tiene
   * nunca avisaría, porque se estaría comparando consigo misma. */
  const soloUno = { console, _usersData: [{ email: 'jose@ox-glasss.com' }, { email: 'jefe@ox-glass.com' }] };
  vm.createContext(soloUno);
  vm.runInContext(fnSrc(HTML, '_distanciaTexto') + '\n' + fnSrc(HTML, '_dominioParecido'), soloUno);
  check('al editar, la propia fila no se cuenta — si no, se compararía consigo misma y ' +
        'nunca avisaría',
    soloUno._dominioParecido('jose@ox-glasss.com', 'jose@ox-glasss.com') === 'ox-glass.com');

  check('con un solo usuario no se inventa un aviso — la primera alta de una empresa nueva ' +
        'no tiene con qué comparar',
    (function(){
      const s = { console, _usersData: [{ email: 'jefe@nueva.com' }] };
      vm.createContext(s);
      vm.runInContext(fnSrc(HTML, '_distanciaTexto') + '\n' + fnSrc(HTML, '_dominioParecido'), s);
      return s._dominioParecido('jefe@nueva.com', 'jefe@nueva.com') === '';
    })());
}

console.log('\n═══ 5. Y el campo está abierto ═══\n');
{
  const editar = fnSrc(HTML, 'editUser');
  check('editUser YA NO bloquea el campo del correo',
    /uEmail'\)\.disabled\s*=\s*false/.test(editar), editar.slice(0, 400));
  check('...y el guardado manda el correo viejo Y el nuevo, porque el servidor necesita ' +
        'los dos para saber a qué fila apuntar',
    /newEmail:\s*email/.test(fnSrc(HTML, '_guardarUsuario_')));
  check('...y la lista de la pantalla se repara por el correo con el que se ABRIÓ la ficha, ' +
        'no por el tecleado — si no, quedarían dos filas de la misma persona',
    /var buscar = _editingUser \|\| email/.test(HTML));
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones\n');
process.exit(fail ? 1 : 0);
