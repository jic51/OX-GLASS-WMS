// EL INTERRUPTOR DICE UNA COSA Y EL CÓDIGO HACÍA OTRA.
//
// Jose, 2026-09-08, con el rol SUPERVISOR y "Edit movements" ENCENDIDO: pulsa
// la papelera de un movimiento y le sale **"Admin only."**. Su pregunta fue la
// correcta — "¿algo se dañó o nunca se pudo?". Nunca se pudo.
//
// El texto del propio interruptor prometía las dos mitades desde el día que se
// hizo:
//
//     "Warehouse staff can fix OR DELETE a movement someone already saved,
//      the same way an admin can today."
//
// `modifyMovement` (arreglar) sí se conectó al permiso. `deleteRow` (borrar) se
// quedó dentro de `manageMaterial`, que pedía ADMIN para todo, y nadie lo notó
// PORQUE EL NAVEGADOR SÍ HONRABA EL PERMISO: renderMovements enseña Edit y
// Delete a un WAREHOUSE cuyo admin encendió el interruptor. Así que el
// interruptor se veía encendido, los botones aparecían, y sólo al pulsarlos el
// servidor decía que no.
//
// ÉSA ES LA FORMA DEL FALLO QUE ESTE ARCHIVO VIGILA: no "¿está cerrada la
// puerta?" —de eso ya se ocupa test-endpoint-auth.js— sino **"¿la puerta hace
// lo que su cartel promete?"**. Un permiso que se enciende y no hace nada es
// peor que no tenerlo: el admin cree que ya lo concedió.
//
// Y vigila la otra mitad, que importa igual: que encender "Edit movements" NO
// abra de paso las operaciones que reescriben la historia entera de un
// material. rename, changeCategory y merge cambian miles de filas de un clic y
// no tienen deshacer. Ésas siguen siendo de admin.
//
// Se EJECUTA la función de verdad, con cada combinación de rol y permiso.
//
// Uso:  node tools/test-role-permissions.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const GS   = fs.readFileSync(path.join(ROOT, 'Code_v3_fixed.gs'), 'utf8');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

function fnSrc(src, name){
  const start = src.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('no encontrada: ' + name);
  let depth = 0;
  for (let j = src.indexOf('{', start); j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error('sin cerrar: ' + name);
}
function varSrc(src, name){
  const i = src.indexOf('var ' + name + ' =');
  if (i === -1) throw new Error('no encontrada: ' + name);
  return src.slice(i, src.indexOf(';', i) + 1);
}

// ── La puerta, con cada llave ───────────────────────────────────────────────
// Se monta manageMaterial de verdad sobre un requireAuth_/requirePerm_ de
// verdad. Lo único falso es a quién pertenece la sesión y qué interruptores
// están puestos — que es exactamente lo que se quiere variar.
function puerta(role, perms){
  const llamadas = [];
  const c = vm.createContext({
    String, Object, Error, console,
    _verifiedAuth: { role: role, email: 'quien@ox-glass.com', name: 'Quien' },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: () => JSON.stringify(perms || {})
    })},
    // El candado y el cuerpo no son lo que se prueba aquí: se quiere saber
    // quién LLEGA a ellos.
    withStockLock_: (fn) => fn(),
    manageMaterialLocked_: (data, auth) => { llamadas.push({ op: data.op, auth: auth }); return { status: 'success' }; }
  });
  vm.runInContext([
    varSrc(GS, 'DEFAULT_ROLE_PERMS'), varSrc(GS, 'MOVEMENT_OPS'),
    fnSrc(GS, 'rolePerms_'), fnSrc(GS, 'requireAuth_'), fnSrc(GS, 'requirePerm_'),
    fnSrc(GS, 'manageMaterial')
  ].join('\n'), c);

  return function(op){
    try {
      vm.runInContext('manageMaterial(' + JSON.stringify({ op: op }) + ', null)', c);
      return { pasa: true, quien: llamadas[llamadas.length - 1] };
    } catch (e) { return { pasa: false, error: e.message }; }
  };
}

const CON  = { canEditMovements: true };
const SIN  = { canEditMovements: false };

console.log('\n═══ borrar un movimiento con el interruptor ENCENDIDO ═══\n');
{
  const sup = puerta('WAREHOUSE', CON);
  const r = sup('deleteRow');
  check('EL SUPERVISOR PUEDE BORRAR — es literalmente lo que promete el texto ' +
        'del interruptor, y hasta la v11.56 respondía "Admin only."' +
        (r.pasa ? '' : ' → ' + r.error),
    r.pasa === true);
  check('...y llega identificado, para que la papelera y la auditoría sepan ' +
        'quién fue', r.pasa && r.quien.auth.email === 'quien@ox-glass.com');
  check('también puede devolverlo de la papelera — poder borrar sin poder ' +
        'deshacer es la mitad peligrosa de las dos', sup('restoreMovement').pasa === true);
  check('y puede ver la papelera: se enseña el cubo a quien puede usarlo',
    sup('listTrash').pasa === true);
}

console.log('\n═══ con el interruptor APAGADO ═══\n');
{
  const sup = puerta('WAREHOUSE', SIN);
  const r = sup('deleteRow');
  check('el supervisor NO puede borrar', r.pasa === false);
  check('y el mensaje manda al sitio donde se arregla, en vez de un "no" seco ' +
        '(' + r.error + ')', /Settings → Permissions/.test(r.error));
}

console.log('\n═══ lo que el interruptor NO abre ═══\n');
{
  const sup = puerta('WAREHOUSE', CON);
  ['rename', 'changeCategory', 'merge'].forEach(function(op){
    check('"Edit movements" NO abre ' + op + ' — reescribe la historia entera ' +
          'de un material, miles de filas de un clic y sin deshacer',
      sup(op).pasa === false);
  });
}

console.log('\n═══ el admin, y el que sólo mira ═══\n');
{
  const adm = puerta('ADMIN', SIN);
  check('el admin borra aunque el interruptor esté apagado — el interruptor ' +
        'sólo ENSANCHA al supervisor, nunca estrecha a un admin',
    adm('deleteRow').pasa === true);
  check('y sigue pudiendo renombrar y fusionar',
    adm('rename').pasa === true && adm('merge').pasa === true);

  const ver = puerta('VIEWER', CON);
  check('EL VIEWER NO BORRA NI CON EL INTERRUPTOR ENCENDIDO — sólo lectura es ' +
        'sólo lectura, y no hay interruptor que lo ensanche',
    ver('deleteRow').pasa === false);
  check('...y lo para requireAuth_ antes de mirar siquiera el permiso',
    /Read-only access/.test(ver('deleteRow').error));
}

// ── El cartel y la puerta, comparados ───────────────────────────────────────
console.log('\n═══ que el texto y el código digan lo mismo ═══\n');
{
  const desc = (HTML.match(/desc:'([^']*fix or delete[^']*)'/) || [])[1] || '';
  check('el interruptor sigue prometiendo las dos mitades, arreglar Y borrar',
    /fix or delete/.test(desc));

  // La prueba de arriba ya demuestra que el código cumple las dos. Ésta ata la
  // promesa al mecanismo: si alguien saca deleteRow de MOVEMENT_OPS, el texto
  // se quedaría mintiendo otra vez y esto lo diría.
  const ops = varSrc(GS, 'MOVEMENT_OPS');
  check('...y borrar está en la lista de operaciones que el permiso cubre',
    /deleteRow:\s*true/.test(ops));
  check('...igual que deshacer y ver la papelera',
    /restoreMovement:\s*true/.test(ops) && /listTrash:\s*true/.test(ops));
  check('y las que reescriben la historia NO están en esa lista',
    !/rename/.test(ops) && !/merge/.test(ops) && !/changeCategory/.test(ops));
}

console.log('\n═══ y que el navegador no prometa más que el servidor ═══\n');
{
  // La causa raíz de que esto pasara desapercibido: el navegador enseñaba los
  // botones y el servidor los rechazaba. Las dos reglas tienen que decir lo
  // mismo, o el fallo vuelve por el otro lado — botones escondidos a alguien
  // que sí puede.
  const cli = (HTML.match(/var isAdmin\s+= userRole === 'ADMIN' \|\| \(userRole === 'WAREHOUSE' && !!rolePerms\.canEditMovements\);/) || [])[0];
  check('el navegador enseña Edit y Delete a ADMIN, o a WAREHOUSE con el ' +
        'permiso — exactamente la misma regla que ahora aplica el servidor',
    !!cli);
}

console.log('\n' + '─'.repeat(72));
console.log('Un permiso que se enciende y no hace nada es peor que no tenerlo:');
console.log('el admin cree que ya lo concedió, y quien lo necesita se queda');
console.log('mirando un botón que le dice que no.');
console.log('─'.repeat(72));

console.log('\nrole permissions: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
