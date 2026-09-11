// "¿TAMBIÉN LLEGÓ ESTO?" — Y SOBRE TODO, CUÁNDO CALLA.
//
// Jose, 2026-09-11: marcó UNA entrega como llegada, y cuando se abrió el
// formulario de entrada metió también los demás materiales del camión, porque
// tenía los papeles en la mano. Los movimientos se guardaron —los vio en
// Movements— y las otras entregas se quedaron en Pending. Su captura lo enseña
// en una línea: la tabla de atrás tiene "ENTRY · IGU-KUNA-JA · +1" y el popup
// de delante dice "IGU-KUNA-JA · Pending".
//
// Y la app tenía razón, en el sentido incómodo: nadie le dijo que llegaron.
// Guardar una entrada escribe un movimiento y no toca INCOMING_V3.
//
// DE LOS DOS DISEÑOS, JOSE ELIGIÓ ÉSTE. El otro era que la entrada guardara de
// qué entrega vino: un enlace duro, más "correcto", y que sólo existe si
// entraste por la tarjeta de esa entrega — para los materiales añadidos a mano
// habría hecho falta un selector de entrega POR LÍNEA, justo el tecleo que él
// estaba evitando al tener los papeles delante.
//
// LO QUE ESTE ARCHIVO PROTEGE NO ES QUE ENCUENTRE, ES QUE NO INVENTE. El
// emparejamiento es adivinar: no hay ningún hilo entre una entrega esperada y
// su movimiento. Y los dos errores posibles no cuestan lo mismo —
//
//   no ofrecer una entrega que sí llegó: se marca a mano, como hasta ayer;
//   MARCAR SOLA una que sigue en la carretera: se deja de esperar algo que no
//   ha llegado, y nadie lo nota hasta que falta.
//
// Por eso la mitad de las comprobaciones de abajo exigen que NO aparezca nada,
// y por eso la única que decide es una casilla que pulsa una persona. Si un día
// alguien ensancha las reglas para que "encuentre más", o quita el paso de
// confirmar, esas son las que caen.
//
// Uso:  node tools/test-also-arrived.js

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

const HOY = '2026-09-11';

// ── El mundo: las funciones de verdad, y un DOM que se acuerda ───────────────
function mundo(entregas){
  const pantalla = { lead: '', html: '', abierto: false, avisos: [], escritos: [] };
  const nodos = {
    alsoArrivedLead: { set textContent(v){ pantalla.lead = String(v); },
                       get textContent(){ return pantalla.lead; } },
    alsoArrivedList: {
      set innerHTML(v){ pantalla.html = String(v); },
      get innerHTML(){ return pantalla.html; },
      querySelectorAll(){
        // Devuelve una casilla por cada data-also del HTML que se acaba de
        // poner. Marcadas o no según lo que diga `pantalla.desmarcar`.
        const out = [];
        const re = /data-also="([^"]*)"/g;
        let m;
        while ((m = re.exec(pantalla.html))) {
          const id = m[1];
          out.push({ checked: (pantalla.desmarcar || []).indexOf(id) === -1,
                     getAttribute: () => id });
        }
        out.forEach = Array.prototype.forEach.bind(out);
        return out;
      }
    },
    alsoArrivedOverlay: { classList: {
      add:    (c) => { if (c === 'show') pantalla.abierto = true; },
      remove: (c) => { if (c === 'show') pantalla.abierto = false; }
    }}
  };

  const ctx = vm.createContext({
    String, Number, Array, Object, Date, JSON, Math, console,
    incoming: entregas || [],
    showToast: (m) => pantalla.avisos.push(String(m)),
    renderAll: () => {},
    _reloadWhenIdle: () => { pantalla.recarga = true; },
    _h: (d) => d,
    // _acWrite es la cola de escritura de verdad y arrastra medio archivo. Aquí
    // sólo hace falta saber QUÉ se mandó: es lo único que este archivo mide del
    // guardado, y llamar a la de verdad mediría la cola, no esto.
    _acWrite: (o) => { pantalla.escritos.push(o); if (o.ok) o.ok(); },
    document: { getElementById: (id) => nodos[id] || null }
  });
  ['nt', '_he', '_escAttr', '_qtyText', '_incDateLabel', '_incOnDay',
   '_incStillPending', '_incMatchesMove', '_alsoArrivedCandidates',
   '_offerAlsoArrived', '_alsoArrivedClose', '_alsoArrivedSave']
    .forEach(n => vm.runInContext(fnSrc(n), ctx));

  return {
    pantalla,
    ofrecer: (mats, fecha, po, excepto) => {
      ctx.__m = mats; ctx.__f = fecha; ctx.__p = po || ''; ctx.__x = excepto || null;
      vm.runInContext('_offerAlsoArrived(__m, __f, __p, __x)', ctx);
      return pantalla;
    },
    guardar: (desmarcar) => {
      pantalla.desmarcar = desmarcar || [];
      vm.runInContext('_alsoArrivedSave()', ctx);
      return pantalla;
    },
    ctx
  };
}

function entrega(o){
  return Object.assign({
    id: 'inc-1', name: 'IGU-KUNA-JA', category: 'IGU', qty: 3, unit: 'UNIT',
    supplier: 'AMSCO', po: '', estDate: HOY, dateMode: 'exact',
    estDateEnd: '', dateNote: '', pm: '', notes: '', status: 'Pending'
  }, o || {});
}
const mat = (o) => Object.assign({ name: 'IGU-KUNA-JA', category: 'IGU' }, o || {});

console.log('\n═══ lo que Jose vio: la entrada hecha y la entrega en Pending ═══\n');
{
  const m = mundo([ entrega({ id: 'a', name: 'IGU-KUNA-JA' }),
                    entrega({ id: 'b', name: 'M-LIBERTYWELLS-CO- JL', category: 'MIRROR' }) ]);
  const p = m.ofrecer([ mat({ name: 'IGU-KUNA-JA' }),
                        mat({ name: 'M-LIBERTYWELLS-CO- JL', category: 'MIRROR' }) ], HOY);
  check('el cuadro aparece', p.abierto === true);
  check('...con las dos entregas que acaba de entrar',
    p.html.indexOf('IGU-KUNA-JA') !== -1 && p.html.indexOf('M-LIBERTYWELLS-CO- JL') !== -1);
  check('...y dice cuántas son, en vez de un texto que vale para una o para diez',
    /These 2 expected deliveries/.test(p.lead), p.lead);
  check('TODAS VIENEN MARCADAS: quien llega aquí acaba de teclear esos ' +
        'materiales con los papeles delante, así que desmarcar la que no es ' +
        'más rápido que marcar las que sí',
    (p.html.match(/type="checkbox" checked/g) || []).length === 2);
}

console.log('\n═══ y AL GUARDAR se marca lo marcado, y nada más ═══\n');
{
  const m = mundo([ entrega({ id: 'a' }), entrega({ id: 'b', name: 'OTRO' }) ]);
  m.ofrecer([ mat({ name: 'IGU-KUNA-JA' }), mat({ name: 'OTRO' }) ], HOY);
  const p = m.guardar(['b']);        // la segunda, desmarcada a mano
  check('sale UNA sola escritura, la de la casilla que quedó marcada',
    p.escritos.length === 1, p.escritos.map(e => e.args[1].id));
  check('...y es updateIncoming con el estado en Arrived',
    p.escritos[0].args[0] === 'updateIncoming' &&
    p.escritos[0].args[1].status === 'Arrived');
  check('LA FILA VA ENTERA. updateIncoming reescribe las diecisiete columnas, ' +
        'así que mandar sólo el estado borraría el proveedor, el PO y la fecha',
    ['id','estDate','dateMode','category','name','qty','unit','supplier','po','pm','notes']
      .every(k => k in p.escritos[0].args[1]), Object.keys(p.escritos[0].args[1]));
  check('...con los valores de la entrega, no con huecos',
    p.escritos[0].args[1].supplier === 'AMSCO' && p.escritos[0].args[1].qty === 3);
  check('la copia del navegador se pone al día en el acto, sin esperar la recarga',
    m.ctx.incoming.find(x => x.id === 'a').status === 'Arrived' &&
    m.ctx.incoming.find(x => x.id === 'b').status === 'Pending');
  check('y el cuadro se cierra', p.abierto === false);
}

{
  const m = mundo([ entrega({ id: 'a' }) ]);
  m.ofrecer([ mat() ], HOY);
  const p = m.guardar(['a']);        // desmarcadas todas
  check('si se desmarcan todas no se escribe nada — decir que no es una ' +
        'respuesta, no un error', p.escritos.length === 0);
  check('...y no se avisa de nada', p.avisos.length === 0);
}

console.log('\n═══ CUÁNDO CALLA, que es la mitad que importa ═══\n');
{
  const m = mundo([ entrega({ id: 'a', name: 'OTRA COSA' }) ]);
  const p = m.ofrecer([ mat({ name: 'IGU-KUNA-JA' }) ], HOY);
  check('un material que no se parece a ninguna entrega no abre nada — un ' +
        'cuadro vacío que hay que cerrar es peor que no preguntar',
    p.abierto === false);
}

{
  const m = mundo([ entrega({ id: 'a', status: 'Arrived' }) ]);
  check('una entrega YA marcada como llegada no se ofrece otra vez',
    m.ofrecer([ mat() ], HOY).abierto === false);
}
{
  const m = mundo([ entrega({ id: 'a', status: 'Cancelled' }) ]);
  check('...ni una cancelada, que es lo contrario de haber llegado',
    m.ofrecer([ mat() ], HOY).abierto === false);
}

{
  // EL CASO DE JOSE, EXACTO: marcó una entrega, se abrió el formulario, y añadió
  // los demás materiales. Esa primera ya está guardada como Arrived en la hoja
  // pero la lista del navegador todavía dice Pending, porque la recarga va en
  // camino. Ofrecerla otra vez haría pensar que no se guardó.
  const m = mundo([ entrega({ id: 'laQueMarque' }),
                    entrega({ id: 'otra', name: 'SEGUNDO MATERIAL' }) ]);
  const p = m.ofrecer([ mat({ name: 'IGU-KUNA-JA' }), mat({ name: 'SEGUNDO MATERIAL' }) ],
                      HOY, '', 'laQueMarque');
  check('la entrega por la que se entró NO se ofrece — ya se marcó al abrir el ' +
        'formulario, aunque la lista del navegador todavía no lo sepa',
    p.html.indexOf('laQueMarque') === -1, p.html.slice(0, 200));
  check('...y la otra sí', p.html.indexOf('otra') !== -1);
  check('...y el texto habla de una sola', /This expected delivery/.test(p.lead), p.lead);
}

{
  const m = mundo([ entrega({ id: 'a', estDate: '2026-09-04' }) ]);   // la semana pasada
  check('una entrega de otro día no se empareja sólo por llamarse igual: el ' +
        'material se repite todas las semanas, y la entrega de la semana ' +
        'pasada no llegó hoy',
    m.ofrecer([ mat() ], HOY).abierto === false);
}
{
  const m = mundo([ entrega({ id: 'a', estDate: '2026-09-04', po: 'PO-8841' }) ]);
  const p = m.ofrecer([ mat({ po: 'PO-8841' }) ], HOY, 'PO-8841');
  check('...PERO CON EL MISMO PO SÍ, aunque la fecha no cuadre: eso ya no es un ' +
        'parecido, es la misma compra, y las entregas llegan tarde',
    p.abierto === true, p.html.slice(0, 160));
}
{
  const m = mundo([ entrega({ id: 'a', estDate: '2026-12-01', po: 'PO-8841' }) ]);
  check('...y ni con el PO igual vale una entrega que se espera para DESPUÉS: ' +
        'un PO reaparece, y algo que llega en diciembre no se recibió hoy',
    m.ofrecer([ mat({ po: 'PO-8841' }) ], HOY, 'PO-8841').abierto === false);
}

{
  const m = mundo([ entrega({ id: 'a', category: 'MIRROR' }) ]);
  check('mismo nombre y distinta categoría no es el mismo material',
    m.ofrecer([ mat({ category: 'IGU' }) ], HOY).abierto === false);
}
{
  const m = mundo([ entrega({ id: 'a', category: '' }) ]);
  check('...pero una entrega SIN categoría no puede desmentir a una entrada que ' +
        'sí la trae', m.ofrecer([ mat({ category: 'IGU' }) ], HOY).abierto === true);
}

console.log('\n═══ una sola regla para las dos preguntas ═══\n');
{
  // _incEntryWhere ("¿dónde se puso?") y esto ("¿qué más llegó?") son la misma
  // pregunta mirada desde los dos lados. Con dos reglas parecidas, un día se
  // ajusta una y la app dice "está en A-3" de una entrega que al mismo tiempo
  // se ofrece a marcar como llegada.
  const donde = fnSrc('_incEntryWhere');
  const quien = fnSrc('_alsoArrivedCandidates');
  check('_incEntryWhere empareja con _incMatchesMove, no con su propia copia',
    /_incMatchesMove\(/.test(donde) && !/_incOnDay\(/.test(donde), donde.slice(0, 240));
  check('...y _alsoArrivedCandidates, con la misma',
    /_incMatchesMove\(/.test(quien));
  check('...y no queda ninguna tercera copia de la regla suelta por el archivo',
    (HTML.match(/moveType !== 'ENTRY'\) return false/g) || []).length === 1);
}

console.log('\n═══ y la decisión la toma una persona ═══\n');
{
  const ofrecer = fnSrc('_offerAlsoArrived');
  const guardar = fnSrc('_alsoArrivedSave');
  check('ofrecer NO escribe nada: sólo dibuja y abre el cuadro',
    !/_acWrite|processMovement/.test(ofrecer));
  check('...y el guardado sólo mira las casillas MARCADAS',
    /if \(cb\.checked\)/.test(guardar));
  check('el único sitio que marca una entrega como llegada sin preguntar sigue ' +
        'sin existir: no hay ningún camino de "guardar entrada" a "Arrived" que ' +
        'no pase por el cuadro',
    (HTML.match(/status: 'Arrived'/g) || []).length === 1);
}

console.log('\n────────────────────────────────────────────────────────────────────────');
console.log('Mientras no haya un hilo entre la entrega y el movimiento, esto');
console.log('empareja — y emparejar es adivinar. Está escrito para fallar hacia');
console.log('el lado de callar, y la casilla existe para que la equivocación la');
console.log('cace una persona antes de que se escriba. El día que la entrada');
console.log('guarde de qué entrega vino, la mitad de este archivo sobra.');
console.log('────────────────────────────────────────────────────────────────────────\n');

console.log(fail ? `also arrived: ${fail} FALLO(S), ${ok} ok` : `also arrived: ok (${ok})`);
process.exit(fail ? 1 : 0);
