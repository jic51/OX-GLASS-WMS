// LA CAMPANA DICE 3 Y AL ABRIRLA HAY 2.
//
// Jose, 2026-09-11, con dos capturas: el número de la campana decía 3, el panel
// listaba 2, y al agrandar la ventana aparecía en el mazo de la esquina la
// tarjeta naranja que faltaba.
//
// Lo del ancho era coincidencia — una captura era del PANEL y la otra del MAZO.
// El fallo estaba en que son dos listas distintas y sólo una contaba las
// naranjas:
//
//     var total = _pendingCfgAdds.length + _sysCards.length + _todoDeckTotal;
//     ...
//     list.innerHTML = cfgRows + sysRows;      // ← sin todoRows
//
// Y el comentario justo encima decía "The panel lists ALL of them". El tercer
// comentario en dos días que promete lo que el código no hace.
//
// LO QUE ESTE ARCHIVO PROTEGE ES LA INVARIANTE, no la corrección de una vez: el
// número de la campana y las filas del panel tienen que ser LO MISMO. Un
// contador que no cuadra con su lista enseña a no creerle a la campana, y una
// campana en la que no se cree es peor que ninguna — que es lo que dice el
// comentario del propio contador, escrito cuando pasó esto mismo con otra de
// las tres clases.
//
// Se corre sin navegador: _syncCfgBell arma una cadena y la mete en innerHTML,
// así que basta con un DOM de mentira que se acuerde de lo que le metieron. Y
// el doble de querySelectorAll CUENTA DE VERDAD lo que hay dentro, porque uno
// que devolviera una lista vacía habría dejado pasar el segundo fallo de abajo.
//
// Uso:  node tools/test-bell-count.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

function fnSrc(name){
  const start = HTML.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('no encontrada: ' + name);
  let depth = 0;
  for (let j = HTML.indexOf('{', start); j < HTML.length; j++) {
    if (HTML[j] === '{') depth++;
    else if (HTML[j] === '}') { depth--; if (depth === 0) return HTML.slice(start, j + 1); }
  }
  throw new Error('sin cerrar: ' + name);
}

// ── Un DOM que se acuerda, y que sabe contar ────────────────────────────────
//
// querySelectorAll no devuelve []: busca de verdad en el innerHTML que se le
// acaba de poner. Sin eso, la aserción de los oyentes pasaría siempre.
function nodo(id, estado){
  return {
    id: id,
    style: {},
    classList: {
      add:    (c) => { estado.clases[id] = (estado.clases[id] || []).concat(c); },
      remove: (c) => { estado.clases[id] = (estado.clases[id] || []).filter(x => x !== c); },
      contains: (c) => (estado.clases[id] || []).indexOf(c) !== -1
    },
    set textContent(v){ estado.texto[id] = String(v); },
    get textContent(){ return estado.texto[id]; },
    set innerHTML(v){ estado.html[id] = String(v); },
    get innerHTML(){ return estado.html[id] || ''; },
    querySelectorAll(sel){
      const h = estado.html[id] || '';
      const m = /\[([a-z-]+)\]/.exec(sel);      // 'button[data-todo-x]' → data-todo-x
      if (!m) return [];
      const re = new RegExp(m[1] + '="([^"]*)"', 'g');
      const out = [];
      let hit;
      while ((hit = re.exec(h))) {
        out.push({
          getAttribute: () => hit[1],
          addEventListener: (ev) => { estado.oyentes.push(m[1] + ':' + ev); }
        });
      }
      out.forEach = Array.prototype.forEach.bind(out);
      return out;
    }
  };
}

function campana(opts){
  opts = opts || {};
  const estado = { texto: {}, html: {}, clases: {}, oyentes: [] };
  const nodos = {};
  ['cfgBellBtn', 'cfgBellCount', 'cfgBellPanel', 'cfgBellList']
    .forEach(id => { nodos[id] = nodo(id, estado); });

  const ctx = vm.createContext({
    String, Number, Array, Object, Date, JSON, Math, console,
    _pendingCfgAdds: opts.cfg  || [],
    _sysCards:       opts.sys  || [],
    _todoItems:      opts.todo || [],
    _todoDeckTotal:  (opts.todo || []).length,
    _TODO_KEY: 'acopio_pending_entries',
    localStorage: { getItem: () => JSON.stringify(opts.todo || []), setItem: () => {} },
    document: { getElementById: (id) => nodos[id] || null }
  });
  ['_he', '_qtyText', '_cfgKey', '_todoLoad', '_syncCfgBell']
    .forEach(n => vm.runInContext(fnSrc(n), ctx));
  // _fmtWhen formatea una hora y no decide nada de lo que se mide aquí.
  vm.runInContext('function _fmtWhen(){ return "just now"; }', ctx);
  vm.runInContext('_syncCfgBell()', ctx);

  return {
    estado,
    numero: Number(estado.texto.cfgBellCount),
    filas:  (estado.html.cfgBellList || '').split('cfg-bell-row').length - 1,
    html:   estado.html.cfgBellList || '',
    oyentes: estado.oyentes,
    oculta: nodos.cfgBellBtn.style.visibility === 'hidden'
  };
}

const TODO = (n) => ({ id: 'todo-' + n, name: 'IGU-KUNA-JA ' + n, qty: 3,
                       unit: 'UNIT', supplier: 'AMSCO', at: '2026-09-11T12:00:00Z' });
const SYS  = (n) => ({ id: 'sys-' + n, label: 'Backup created', detail: 'anoche', at: '2026-09-11T02:19:00Z' });
const CFG  = (n) => ({ type: 'projects', value: 'WINDOWS 5' + n });

console.log('\n═══ lo que Jose fotografió: 3 en el número, 2 en la lista ═══\n');
{
  const c = campana({ todo: [TODO(1)], sys: [SYS(1)], cfg: [CFG(1)] });
  check('el número dice 3', c.numero === 3, c.numero);
  check('Y EL PANEL LISTA 3. Es la invariante entera de este archivo: un ' +
        'contador que no cuadra con su lista enseña a no creerle a la campana',
    c.filas === 3, { numero: c.numero, filas: c.filas });
  check('...y la que faltaba, la naranja, está con su material',
    c.html.indexOf('IGU-KUNA-JA 1') !== -1 && /Arrived · entry not made/.test(c.html));
}

console.log('\n═══ y va PRIMERA ═══\n');
{
  const c = campana({ todo: [TODO(1)], sys: [SYS(1)], cfg: [CFG(1)] });
  const iTodo = c.html.indexOf('Arrived · entry not made');
  const iCfg  = c.html.indexOf('WINDOWS 51');
  const iSys  = c.html.indexOf('Backup created');
  check('una entrega que llegó y no tiene entrada va antes que una sugerencia ' +
        'y que un aviso: es material en el almacén del que las cantidades no ' +
        'saben nada, lo más urgente que puede haber ahí',
    iTodo !== -1 && iTodo < iCfg && iCfg < iSys, { iTodo, iCfg, iSys });
}

console.log('\n═══ los botones del panel tienen que HACER algo ═══\n');
{
  // EL SEGUNDO FALLO, Y CASI SE ESCAPA. Los botones del mazo se enganchan con
  // `deck.querySelectorAll(...)`, o sea dentro del mazo y sólo ahí. Poner el
  // mismo atributo en el panel y dar por hecho que el comportamiento viene con
  // él deja dos botones que no hacen nada — peor que no ponerlos.
  const c = campana({ todo: [TODO(1)], sys: [SYS(1)], cfg: [CFG(1)] });
  check('el botón "Make the entry" del panel tiene su oyente',
    c.oyentes.indexOf('data-todo-do:click') !== -1, c.oyentes);
  check('...y el de "Later" también',
    c.oyentes.indexOf('data-todo-x:click') !== -1, c.oyentes);
  check('...igual que los de las otras dos clases, que ya lo tenían',
    c.oyentes.indexOf('data-act:click') !== -1 &&
    c.oyentes.indexOf('data-sys-x:click') !== -1, c.oyentes);
}

console.log('\n═══ el panel lista TODAS; el mazo es el que raciona ═══\n');
{
  // El mazo se queda en 5 a propósito (ver _renderTodoDeck: slice(0,5)) porque
  // es una pila en una esquina. El panel tiene scroll, así que no hay motivo
  // para racionar — y el comentario del archivo ya lo prometía.
  const siete = [1,2,3,4,5,6,7].map(TODO);
  const c = campana({ todo: siete });
  check('con siete naranjas el número dice 7', c.numero === 7, c.numero);
  check('...y el panel enseña las siete, no cinco', c.filas === 7, c.filas);
  check('...incluida la séptima, que en el mazo no cabría',
    c.html.indexOf('IGU-KUNA-JA 7') !== -1);
}

console.log('\n═══ sin nada que decir, la campana no está ═══\n');
{
  const c = campana({});
  check('el número es 0', c.numero === 0);
  check('...y el botón se esconde, en vez de quedarse ahí con un cero',
    c.oculta === true);
}

console.log('\n═══ y el nombre sale escapado ═══\n');
{
  const c = campana({ todo: [Object.assign(TODO(1), { name: 'A <b>x</b> "y"' })] });
  check('un material con etiquetas y comillas no se ejecuta: lo que hay en la ' +
        'hoja lo pudo escribir una persona a mano',
    c.html.indexOf('<b>x</b>') === -1 && c.html.indexOf('&lt;b&gt;') !== -1);
}

console.log('\n────────────────────────────────────────────────────────────────────────');
console.log('La campana y el mazo son DOS listas de las mismas tres clases de');
console.log('tarjeta. Cada vez que se añade una clase hay que tocar las dos, y');
console.log('la que se olvida es siempre la campana, porque el mazo es el que');
console.log('se ve mientras se trabaja. La invariante de arriba —número igual a');
console.log('filas— es lo único que caza ese olvido solo.');
console.log('────────────────────────────────────────────────────────────────────────\n');

console.log(fail ? `bell count: ${fail} FALLO(S), ${ok} ok` : `bell count: ok (${ok})`);
process.exit(fail ? 1 : 0);
