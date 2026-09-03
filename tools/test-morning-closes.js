// EL AVISO DE LA MAÑANA SE CIERRA CUANDO YA NO QUEDA NADA.
//
// Jose lo fotografió: marca la entrega como llegada, registra su entrada, cierra
// el formulario — y el aviso de la mañana sigue enseñándole la misma entrega
// como si no hubiera pasado nada. Su regla: "si hay solo un material y ya fue
// aceptado, la ventana desaparece; si hay más de uno, la ventana no desaparece,
// sólo desaparece si ya todos los materiales fueron recibidos."
//
// LA CAUSA ERA MÁS VIEJA QUE LA QUEJA, y es la que este archivo fija. Tres
// sitios decidían si una entrega seguía esperando comparando su estado contra
// 'received' — un valor que la app NUNCA produce. El menú ofrece Pending,
// Arrived y Cancelled, y el servidor lo dice sin ambigüedad:
//
//     var INCOMING_STATUSES = ['Pending', 'Arrived', 'Cancelled'];
//
// O sea que esos tres filtros no descartaron nada de lo que la app escribe. Para
// el aviso de la mañana, ninguna entrega se completaba jamás — por eso no se
// cerraba.
//
// Alguien escribió 'received' pensando en el estado que la app iba a tener, el
// estado acabó llamándose 'Arrived', y la comparación se quedó ahí: verde,
// muerta, y sin nada que la delatara. Es la misma clase de fallo que el
// comentario que decía una cosa mientras el código hacía otra.
//
// PRECISIÓN QUE COSTÓ UNA ASERCIÓN MAL ESCRITA: 'received' no es un valor
// imposible, sólo uno que la app no escribe. El servidor normaliza al ESCRIBIR
// —cualquier cosa fuera de los tres cae a Pending— pero al LEER devuelve la
// celda cruda, así que una fila editada a mano en la hoja puede decir
// "Received" de verdad. Reconocerlo es correcto y hay que conservarlo. Lo que
// estaba mal era reconocer SÓLO eso.
//
// La primera versión de la comprobación final prohibía 'received' a secas, y
// habría obligado a borrar una defensa buena. Ahora exige lo que de verdad
// importa: que no aparezca SOLA.
//
// Se prueba EJECUTANDO el predicado y el refresco contra estados reales, no
// leyéndolos: una comparación con una constante equivocada se lee perfectamente
// bien.
//
// Uso:  node tools/test-morning-closes.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const SRC  = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');
const GS   = fs.readFileSync(path.join(ROOT, 'Code_v3_fixed.gs'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

function fnSrc(name){
  const start = SRC.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('no encontrada: ' + name);
  let depth = 0, i = SRC.indexOf('{', start);
  for (let j = i; j < SRC.length; j++) {
    if (SRC[j] === '{') depth++;
    else if (SRC[j] === '}') { depth--; if (depth === 0) return SRC.slice(start, j + 1); }
  }
  throw new Error('sin cerrar: ' + name);
}

// ── 1. Los estados que la app produce de verdad ─────────────────────────────
console.log('\n═══ qué estados existen, según el servidor ═══\n');
const m = /var INCOMING_STATUSES = \[([^\]]+)\]/.exec(GS);
check('el servidor declara la lista de estados', !!m);
const estados = m ? m[1].split(',').map(s => s.trim().replace(/^'|'$/g, '')) : [];
check('son exactamente Pending, Arrived y Cancelled (' + estados.join(', ') + ')',
  estados.join(',') === 'Pending,Arrived,Cancelled');
check('"Received" NO es uno de ellos — y era contra ese contra el que se ' +
      'comparaba', estados.indexOf('Received') === -1);

// El menú del formulario es el otro extremo del contrato.
{
  const at = SRC.indexOf('<select id="incStatus"');
  const sel = SRC.slice(at, SRC.indexOf('</select>', at));
  const opts = (sel.match(/value="([^"]+)"/g) || []).map(s => s.slice(7, -1));
  check('y el menú del formulario ofrece esos mismos tres, ni uno más (' +
        opts.join(', ') + ')', opts.join(',') === estados.join(','));
}

// ── 2. El predicado, ejecutado ──────────────────────────────────────────────
console.log('\n═══ "¿sigue esperando esto a alguien?" ═══\n');
const box = vm.createContext({ console });
vm.runInContext(fnSrc('_incStillPending'), box);
const sigue = st => vm.runInContext('_incStillPending(' + JSON.stringify({ status: st }) + ')', box);

check('Pending sigue esperando', sigue('Pending') === true);
check('Arrived ya no — es lo que la app escribe al marcarla llegada, y lo que ' +
      'el filtro viejo no reconocía', sigue('Arrived') === false);
check('Cancelled tampoco: recordar una entrega que uno mismo canceló es ruido, ' +
      'y del que hace que se deje de mirar el aviso', sigue('Cancelled') === false);
check('sin estado se trata como pendiente — una entrega recién escrita, no una ' +
      'resuelta', sigue(undefined) === true);
check('no le importan las mayúsculas', sigue('ARRIVED') === false && sigue('arrived') === false);
check('...ni los espacios de más', sigue('  Arrived ') === false);

// ── 3. El refresco: se cierra al vaciarse ───────────────────────────────────
console.log('\n═══ la ventana se cierra sola cuando no queda nada ═══\n');
{
  // Un doble mínimo del overlay y de lo que el refresco consulta.
  function escenario(items){
    const clases = new Set(['show']);
    const ctx = vm.createContext({
      console,
      _pintado: null,
      incoming: items,
      document: { getElementById: () => ({ classList: {
        contains: c => clases.has(c),
        remove:   c => clases.delete(c),
        add:      c => clases.add(c)
      }})},
      _isoDate: () => '2026-09-03',
      _incOnDay: (it) => it.estDate === '2026-09-03',
      showMorningPopup: function(list){ ctx._pintado = list.length; },
      _clases: clases
    });
    vm.runInContext(fnSrc('_incStillPending'), ctx);
    vm.runInContext(fnSrc('_thisWeeksDeliveries'), ctx);
    vm.runInContext(fnSrc('_refreshMorningPopup'), ctx);
    vm.runInContext('_refreshMorningPopup()', ctx);
    return { abierta: clases.has('show'), pintado: ctx._pintado };
  }

  const hoy = (name, status) => ({ name, status, estDate: '2026-09-03', dateMode: 'exact' });

  // UN material, ya aceptado → la ventana desaparece. Palabras de Jose.
  let r = escenario([hoy('WINDOWS WIN', 'Arrived')]);
  check('con un solo material y ya aceptado, la ventana desaparece',
    r.abierta === false);
  check('...y no se molesta en repintarla antes de cerrarla', r.pintado === null);

  // MÁS DE UNO, uno aceptado → sigue abierta con el que falta.
  r = escenario([hoy('WINDOWS WIN', 'Arrived'), hoy('MIRROR B6', 'Pending')]);
  check('con dos y uno aceptado, la ventana NO desaparece', r.abierta === true);
  check('...y enseña sólo el que falta, no los dos', r.pintado === 1);

  // TODOS aceptados → desaparece.
  r = escenario([hoy('WINDOWS WIN', 'Arrived'), hoy('MIRROR B6', 'Arrived')]);
  check('cuando todos fueron recibidos, desaparece', r.abierta === false);

  // Una cancelada no mantiene la ventana viva.
  r = escenario([hoy('WINDOWS WIN', 'Arrived'), hoy('MIRROR B6', 'Cancelled')]);
  check('una entrega cancelada no la mantiene abierta', r.abierta === false);

  // Y con el fallo viejo esto habría fallado: 'Arrived' no era 'received', así
  // que las cuatro habrían dejado la ventana abierta.
  r = escenario([hoy('WINDOWS WIN', 'Pending')]);
  check('lo pendiente de verdad sí la mantiene abierta — no se cierra sola ' +
        'sobre trabajo sin hacer', r.abierta === true && r.pintado === 1);
}

// ── 4. Que no vuelva a haber tres copias del predicado ──────────────────────
console.log('\n═══ una sola definición, no tres ═══\n');
{
  // Fuera de su propia definición y de los comentarios que cuentan la historia,
  // 'received' no debe volver a decidir nada.
  const codigo = SRC
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  // 'received' NO se prohíbe, y la primera versión de esta comprobación lo
  // prohibía — habría obligado a borrar una defensa buena.
  //
  // El servidor normaliza al escribir, pero al leer devuelve la celda cruda, así
  // que una fila editada a mano en la hoja puede decir "Received" de verdad.
  // Reconocerlo es correcto. Lo que estaba mal era reconocer SÓLO eso: los tres
  // filtros comparaban contra 'received' y contra nada más, así que 'Arrived'
  // —el único que la app escribe— pasaba de largo.
  //
  // Así que lo que se exige es que ninguna comparación contra 'received' esté
  // SOLA: donde aparezca, tiene que aparecer 'arrived' cerca.
  const sueltas = [];
  codigo.split('\n').forEach((ln, i) => {
    if (/[!=]==\s*'received'/.test(ln) && !/'arrived'/.test(ln)) sueltas.push(i + 1);
  });
  check('ninguna comparación trata "received" como la única forma de estar ' +
        'hecho — que es lo que dejaba pasar "Arrived"' +
        (sueltas.length ? ' — líneas: ' + sueltas.join(', ') : ''),
    sueltas.length === 0);
  check('...y el predicado reconoce las dos, para una fila editada a mano en ' +
        'la hoja', /!==\s*'received'/.test(SRC));
  const usos = (SRC.match(/_incStillPending\(/g) || []).length;
  check('y el predicado se usa desde varios sitios (' + usos + '), definido una ' +
        'sola vez — que es lo que impide que vuelvan a divergir', usos >= 4);
}

console.log('\n' + '─'.repeat(72));
console.log('El filtro comparaba contra "received", un estado que la app nunca');
console.log('ha producido. No descartó nada nunca, en tres sitios a la vez, y');
console.log('nada lo delataba: una comparación con la constante equivocada se');
console.log('lee perfectamente bien. Sólo ejecutarla lo enseña.');
console.log('─'.repeat(72));

console.log('\nmorning closes: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
