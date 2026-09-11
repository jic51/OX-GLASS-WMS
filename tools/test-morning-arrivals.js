// "NOTHING ARRIVING TODAY" CON TRES ENTREGAS RECIBIDAS ESA MISMA MAÑANA.
//
// Jose, 2026-09-10, con la captura del popup: "dice nada llegando hoy, pero la
// cosa es que yo ya recibí 3 materiales hoy que sí estaban en la lista,
// entonces nada llegando hoy no es correcto."
//
// La causa era de una línea. _thisWeeksDeliveries filtra con _incStillPending,
// así que una entrega marcada como llegada no se ordena más abajo: DESAPARECE
// de la lista con la que el popup se dibuja. La frase se calculaba sobre una
// lista de la que ya se habían quitado justo las tres cosas que sí llegaron.
//
// Y lo que pidió no es sólo que vuelvan a salir:
//
//   QUE DIGA DÓNDE SE PUSO. Si la entrada está hecha, el estante; si no, nada.
//   Ese "nada" es la parte que importa — es la señal de que llegó material y
//   todavía nadie lo registró, que es exactamente el hueco por donde se pierde
//   inventario.
//
// Y ahí está el peligro de todo este archivo: NO HAY UN HILO entre la entrega
// y el movimiento. Nada guarda el id de una en la otra, así que la locación se
// averigua EMPAREJANDO, y emparejar es adivinar. Los dos errores posibles no
// cuestan lo mismo:
//
//   enseñar un estante equivocado APAGA la alarma — da por registrado algo que
//   no lo está;
//   no enseñar ninguno cuando sí se registró sólo molesta.
//
// Por eso la mitad de las comprobaciones de aquí abajo no exigen que encuentre
// la entrada: exigen que CALLE cuando no está seguro. Si alguien ensancha la
// ventana de fechas para que "encuentre más", esas son las que caen.
//
// Se corre sin navegador: todo esto es texto y decisiones, y las funciones
// reales se levantan del archivo a un vm de Node. Lo único que se mira sobre
// el CSS —que el "Arrived" crezca SÓLO en el popup— se lee de las reglas
// mismas, no de una copia escrita aquí.
//
// Uso:  node tools/test-morning-arrivals.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

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

function cssRule(selector){
  const i = HTML.indexOf(selector + '{');
  if (i === -1) return '';
  return HTML.slice(i, HTML.indexOf('}', i) + 1);
}

const HOY = '2026-09-10';

// ── El mundo: las funciones DE VERDAD, y sólo el DOM de mentira ──────────────
//
// Lo que se sustituye es el navegador, no la app: cada función que decide algo
// se levanta del archivo tal cual está escrita. Un doble de _weekArrivals o
// de _incEntryWhere mediría el doble, que es como esta clase de prueba se
// vuelve decorativa.
function mundo(){
  const pantalla = { html: '', abierto: false, titulo: '', avisos: [] };
  const ctx = vm.createContext({
    Object, String, Number, Array, Date, JSON, Math, RegExp, console,
    incoming: [], movements: [], userRole: 'ADMIN',
    showToast: (m) => pantalla.avisos.push(String(m)),
    localStorage: { getItem: () => null, setItem: () => {} },
    document: {
      getElementById: (id) => {
        if (id === 'morningPopupBody') return { set innerHTML(v){ pantalla.html = v; }, get innerHTML(){ return pantalla.html; } };
        if (id === 'morningOverlay') return {
          classList: {
            add:      (c) => { if (c === 'show') pantalla.abierto = true; },
            remove:   (c) => { if (c === 'show') pantalla.abierto = false; },
            contains: (c) => c === 'show' && pantalla.abierto
          }
        };
        if (id === 'morningTitle') return { set textContent(v){ pantalla.titulo = v; }, get textContent(){ return pantalla.titulo; } };
        if (id === 'noShowTodayLabel') return { style: {} };
        return null;
      }
    }
  });
  [ 'nt', '_he', '_escAttr', '_isoDate', '_incOnDay', '_incQtyText',
    '_incDateLabel', '_incFirstDocUrl', '_incStillPending', '_incItemHtml',
    '_weekBounds', '_incInWeek', '_weekArrivals', '_overdueThisWeek',
    '_incMatchesMove', '_incEntryWhere', '_thisWeeksDeliveries',
    '_timeOfDayGreeting', '_applyMorningGreeting', 'showMorningPopup',
    'openWeekSchedule', '_refreshMorningPopup'
  ].forEach(n => vm.runInContext(fnSrc(n), ctx));
  // catBadge arrastra media hoja de estilos y colores por categoría; aquí sólo
  // hace falta que devuelva algo. Es lo ÚNICO que se dobla, y no decide nada.
  vm.runInContext('function catBadge(c){ return "<span>" + String(c||"") + "</span>"; }', ctx);
  return {
    pantalla,
    poner: (inc, mov) => { ctx.incoming = inc || []; ctx.movements = mov || []; },
    run: (e) => vm.runInContext(e, ctx),
    // El popup, dibujado como lo dibuja la app: con la lista de PENDIENTES,
    // que es lo único que showMorningPopup recibe. Las llegadas se las tiene
    // que buscar ella sola — que es justo lo que no hacía.
    pintar: () => {
      pantalla.html = '';
      vm.runInContext('showMorningPopup(_thisWeeksDeliveries("' + HOY + '"), "' + HOY + '")', ctx);
      return pantalla.html;
    }
  };
}

function entrega(o){
  return Object.assign({
    id: 'inc-1', name: 'IGU-SR-BF2-TT', category: 'IGU', qty: 12, unit: 'UNIT',
    estDate: HOY, dateMode: 'exact', status: 'Arrived', po: '', notes: ''
  }, o || {});
}
function entrada(o){
  return Object.assign({
    moveType: 'ENTRY', name: 'IGU-SR-BF2-TT', category: 'IGU',
    dateRec: HOY, destLoc: 'A-3', po: '', qty: 12
  }, o || {});
}

console.log('\n═══ lo que Jose fotografió ═══\n');
{
  const m = mundo();
  m.poner([ entrega({ id: 'a', name: 'IGU UNO' }),
            entrega({ id: 'b', name: 'IGU DOS' }),
            entrega({ id: 'c', name: 'IGU TRES' }) ], []);
  const html = m.pintar();
  check('con tres entregas RECIBIDAS hoy y ninguna pendiente, el popup ya no ' +
        'dice "Nothing arriving today" — es la frase falsa de su captura',
    html.indexOf('Nothing arriving today') === -1, html.slice(0, 160));
  check('...y las tres salen, en su propio bloque',
    /morning-done-label/.test(html) &&
    html.indexOf('IGU UNO') !== -1 && html.indexOf('IGU DOS') !== -1 &&
    html.indexOf('IGU TRES') !== -1);
  check('...con su etiqueta de estado, que es lo que se quería ver grande',
    /inc-status-arrived/.test(html));
}

{
  const m = mundo();
  m.poner([], []);
  const html = m.pintar();
  check('y cuando de verdad no hay nada hoy, la frase sigue estando — no se ' +
        'arregla una frase falsa borrándola siempre',
    html.indexOf('Nothing arriving today') !== -1);
}

{
  const m = mundo();
  m.poner([ entrega({ id: 'p', name: 'PENDIENTE', status: 'Pending' }),
            entrega({ id: 'a', name: 'YA LLEGO' }) ], []);
  const html = m.pintar();
  check('lo que espera y lo que llegó no se mezclan: dos bloques, cada uno con ' +
        'su rótulo', /Arriving Today/.test(html) && /morning-done-label/.test(html));
  check('...y la lista de PENDIENTES sigue sin incluir las llegadas — es la ' +
        'que decide si el popup se abre, y ahí "lo que queda por hacer" es la ' +
        'pregunta correcta',
    m.run('_thisWeeksDeliveries("' + HOY + '").map(function(i){return i.id;}).join(",")') === 'p');
}

console.log('\n═══ dónde se puso, cuando consta ═══\n');
{
  const m = mundo();
  m.poner([ entrega() ], [ entrada({ destLoc: 'A-3' }) ]);
  check('con la entrada hecha hoy, el popup dice el estante',
    /→ A-3/.test(m.pintar()));

  m.poner([ entrega() ], [ entrada({ destLoc: 'A-3' }), entrada({ destLoc: 'B-1' }) ]);
  check('...y si el ingreso se repartió, los dice TODOS — decir sólo uno deja ' +
        'la mitad de la carga sin sitio a la vista',
    /→ A-3, B-1/.test(m.pintar()));

  m.poner([ entrega() ], [ entrada({ destLoc: '' }) ]);
  const sinEstante = m.pintar();
  check('una entrada sin estante dice que la entrada está hecha, y no se ' +
        'inventa un estante',
    /Entry made/.test(sinEstante) && !/→/.test(sinEstante));
}

console.log('\n═══ y CALLA cuando no está segura ═══\n');
{
  const m = mundo();

  m.poner([ entrega() ], []);
  const nada = m.pintar();
  check('SIN ENTRADA NO SE DIBUJA NINGUNA LÍNEA DE LOCACIÓN. Es lo que Jose ' +
        'pidió literalmente —"si no se hizo el entry no se muestra nada"— y ' +
        'ese hueco es la señal de que llegó material sin registrar',
    !/inc-item-where/.test(nada) && /morning-done-label/.test(nada));

  m.poner([ entrega({ po: '' }) ], [ entrada({ dateRec: '2026-09-08' }) ]);
  check('una entrada del mismo material de OTRO día, y sin PO que la ate a ' +
        'esta entrega, NO cuenta: sería el ingreso de la semana pasada ' +
        'haciéndose pasar por éste',
    !/inc-item-where/.test(m.pintar()));

  m.poner([ entrega({ po: 'PO-8841' }) ],
          [ entrada({ po: 'PO-8841', dateRec: '2026-09-11', destLoc: 'C-2' }) ]);
  check('...pero con el MISMO PO sí cuenta aunque la entrada esté fechada otro ' +
        'día — eso ya no es un parecido, es la misma compra, y registrar al ' +
        'día siguiente es lo normal',
    /→ C-2/.test(m.pintar()));

  m.poner([ entrega({ po: 'PO-8841', estDate: HOY }) ],
          [ entrada({ po: 'PO-8841', dateRec: '2026-01-04', destLoc: 'C-2' }) ]);
  check('...y ni con el PO igual vale una entrada ANTERIOR a la entrega: un PO ' +
        'reaparece, y una entrada de enero no puede explicar algo que llegó hoy',
    !/inc-item-where/.test(m.pintar()));

  m.poner([ entrega({ category: 'IGU' }) ],
          [ entrada({ category: 'MIRROR', destLoc: 'D-9' }) ]);
  check('mismo nombre y distinta categoría no es el mismo material',
    !/inc-item-where/.test(m.pintar()));

  m.poner([ entrega({ category: '' }) ], [ entrada({ category: 'IGU', destLoc: 'D-9' }) ]);
  check('...pero una entrega SIN categoría no puede desmentir a una entrada ' +
        'que sí la trae — la categoría sólo descarta cuando las dos la tienen',
    /→ D-9/.test(m.pintar()));

  m.poner([ entrega() ], [ entrada({ moveType: 'EXIT', destLoc: 'E-1' }) ]);
  check('y una SALIDA no es una entrada, por mucho que coincida todo lo demás',
    !/inc-item-where/.test(m.pintar()));
}

console.log('\n═══ todo lo que la semana espera o recibió, en la ventana ═══\n');
{
  // Jose, cuando le pregunté si el hueco sin locación debía llevar una marca:
  // "cuando dije no se ve nada, hablaba de la LOCACIÓN; todo material que se
  // espera o se recibe debe verse en la ventana."
  //
  // Contra esa regla había DOS agujeros, y los dos por la misma causa: las dos
  // listas miraban de hoy en adelante. HOY ES JUEVES en estas pruebas
  // (2026-09-10 es jueves; el lunes de esa semana es el 2026-09-07).
  const LUNES = '2026-09-07';

  const m = mundo();
  m.poner([ entrega({ id: 'lun', name: 'LLEGO EL LUNES', estDate: LUNES }) ], []);
  const html = m.pintar();
  check('una entrega que LLEGÓ el lunes y sigue sin entrada se ve el jueves: ' +
        'no está entre lo pendiente porque ya llegó, ni era de hoy, y era ' +
        'justo la que más falta hace ver',
    html.indexOf('LLEGO EL LUNES') !== -1);
  check('...con su día encima, porque no es de hoy',
    /inc-item-meta/.test(html));
  check('...y la frase "Nothing arriving today" SÍ se dice, porque hoy de ' +
        'verdad no hay nada — el bloque lleno no la calla, sólo la calla algo ' +
        'de hoy', html.indexOf('Nothing arriving today') !== -1);

  m.poner([ entrega({ id: 'lun', name: 'LLEGO EL LUNES', estDate: LUNES }),
            entrega({ id: 'hoy', name: 'LLEGO HOY' }) ], []);
  const dos = m.pintar();
  check('con una de hoy y una del lunes, la de HOY va primero',
    dos.indexOf('LLEGO HOY') < dos.indexOf('LLEGO EL LUNES'));

  m.poner([ entrega({ id: 'lun', name: 'LLEGO EL LUNES', estDate: LUNES }) ],
          [ entrada({ name: 'LLEGO EL LUNES', dateRec: LUNES, destLoc: 'F-4' }) ]);
  check('y su locación se busca contra SU día, no contra hoy — si no, todo lo ' +
        'que llegó antes del jueves saldría sin estante por el mero hecho de ' +
        'no ser de hoy', /→ F-4/.test(m.pintar()));

  m.poner([ entrega({ id: 'lun', name: 'LLEGO EL LUNES', estDate: '2026-08-30' }) ], []);
  check('una llegada de la SEMANA PASADA no entra: la ventana se llama "esta ' +
        'semana" y la pestaña de Incoming es la que guarda el historial',
    m.pintar().indexOf('LLEGO EL LUNES') === -1);
}

{
  const LUNES = '2026-09-07';
  const m = mundo();
  m.poner([ entrega({ id: 'tarde', name: 'DEBIA LLEGAR EL LUNES',
                      estDate: LUNES, status: 'Pending' }) ], []);
  const html = m.pintar();
  check('lo que se esperaba el lunes y nadie marcó también vuelve a la ' +
        'ventana: _thisWeeksDeliveries pregunta por "lo que QUEDA de la ' +
        'semana", así que se caía el martes — y una entrega que debía haber ' +
        'llegado y no consta es de lo primero que hay que mirar por la mañana',
    html.indexOf('DEBIA LLEGAR EL LUNES') !== -1 && /morning-late-label/.test(html));
  check('...y va ARRIBA del todo', html.indexOf('morning-late') < html.indexOf('morning-today'));

  check('pero NO cuenta para cerrar la ventana: si contara, una fila vieja que ' +
        'nadie limpia la dejaría abierta para siempre, y la regla de cierre es ' +
        'de Jose',
    m.run('_thisWeeksDeliveries("' + HOY + '").length') === 0);
  m.run('openWeekSchedule()');
  check('...aunque sí basta para ABRIRLA desde el botón — verla es el punto',
    m.pantalla.abierto === true);
  m.run('_refreshMorningPopup()');
  check('...y al refrescarse se cierra igual, porque de lo que viene no queda ' +
        'nada', m.pantalla.abierto === false);
}

console.log('\n═══ las dos puertas del popup ═══\n');
{
  const m = mundo();
  m.poner([ entrega({ status: 'Arrived' }) ], []);
  m.run('openWeekSchedule()');
  check('el botón "This week\'s schedule" abre aunque no quede NADA pendiente, ' +
        'si algo llegó hoy — si no, el día que se recibe todo, la lista que ' +
        'dice cuál está sin registrar no hay forma de verla',
    m.pantalla.abierto === true, m.pantalla.avisos);

  const v = mundo();
  v.poner([], []);
  v.run('openWeekSchedule()');
  check('...y con la semana vacía sigue sin abrir nada, y lo dice',
    v.pantalla.abierto === false && /Nothing expected/.test(v.pantalla.avisos.join(' ')));
}

{
  // Y LA REGLA DE CIERRE SIGUE SIENDO LA SUYA, que estuvo a punto de no serlo.
  //
  // Al escribir el bloque de llegadas la tentación era dejar la ventana
  // abierta mientras alguna siguiera sin entrada: "eso también es trabajo
  // pendiente". Jose dijo la regla con estas palabras — "si hay solo un
  // material y ya fue aceptado, la ventana desaparece"— y ampliarla habría
  // sido cambiársela sin decírselo. test-morning-closes.js lo cazó en el
  // primer intento, que es exactamente para lo que está.
  //
  // Y no hacía falta: el recordatorio de "llegó y falta su entrada" ya existe
  // y es la tarjeta naranja, que persiste donde la ventana no.
  const m = mundo();
  m.poner([ entrega({ id: 'x' }) ], []);          // llegó, sin entrada
  m.run('openWeekSchedule()');
  check('la ventana se abre por el botón', m.pantalla.abierto === true);
  m.run('_refreshMorningPopup()');
  check('...y al refrescarse se cierra sola porque no queda nada PENDIENTE, ' +
        'aunque esa llegada siga sin entrada: la regla de cierre es de Jose y ' +
        'no se amplía por la puerta de atrás',
    m.pantalla.abierto === false);
}

console.log('\n═══ el "Arrived" grande, y sólo en el popup ═══\n');
{
  const base  = cssRule('.inc-status-arrived');
  const enPop = cssRule('#morningPopupBody .inc-status-arrived');
  const tam = (r) => { const m = r.match(/font-size:\s*([\d.]+)rem/); return m ? Number(m[1]) : null; };
  check('la regla del popup existe', !!enPop, enPop);
  check('...y agranda la etiqueta (' + tam(base) + 'rem → ' + tam(enPop) + 'rem)',
    tam(base) !== null && tam(enPop) !== null && tam(enPop) > tam(base));
  check('...sin tocar la de la pestaña de Incoming, que Jose dijo expresamente ' +
        'que está bien como está: "no quiero más grande el arrived aquí en ' +
        'incomings, sino más grande el arrived en el popup"',
    tam(base) === 0.68);
  check('y va colgada de #morningPopupBody, o sea que no puede alcanzar a la ' +
        'tabla de Incoming ni por accidente',
    enPop.indexOf('#morningPopupBody') === 0);
}

console.log('\n═══ el popup no es de ninguna pestaña ═══\n');
{
  /* Jose, 2026-09-11, con captura: marcó una entrega como llegada desde el
     popup, registró su entrada, y el popup siguió enseñándola como Pending con
     su botón "Mark arrived". "Tuve que cerrar la ventana y volverla a abrir
     para que cambie."
     LA CAUSA ERA DE UNA LÍNEA Y DE UN SITIO. renderAll repinta SÓLO LA PESTAÑA
     ACTIVA, y la llamada a _refreshMorningPopup vivía dentro de renderIncoming.
     Jose estaba en Movements & History, así que renderIncoming no corría nunca.
     Funcionaba sólo si la pestaña de Incoming resultaba ser la de delante — que
     es precisamente la que menos falta hace, porque ahí los datos ya se ven.
     Se lee del archivo porque lo que importa es DÓNDE está la llamada, y eso no
     se puede ejercitar sin la app entera. */
  const render = fnSrc('renderAll');
  const inc    = fnSrc('renderIncoming');
  check('renderAll refresca el popup — es el sitio que significa "los datos ' +
        'cambiaron", y el popup flota sobre cualquier pestaña',
    /_refreshMorningPopup\(\)/.test(render), render);
  check('...y ya NO cuelga de renderIncoming, que sólo corre si esa pestaña es ' +
        'la activa', !/_refreshMorningPopup\(\)/.test(inc), inc);
  check('renderAll sigue repintando sólo la pestaña activa — el arreglo NO es ' +
        'repintarlo todo, que costaría en cada latido', /_activeTab\(\)/.test(render));
  // Y que siga siendo gratis con el popup cerrado, que es casi siempre.
  const refresh = fnSrc('_refreshMorningPopup');
  check('y con el popup cerrado se va en la primera línea, sin calcular nada',
    /classList\.contains\('show'\)\) return/.test(refresh), refresh.slice(0, 200));
}

console.log('\n═══ el recuadro gris, y el color donde hace falta ═══\n');
{
  // Jose, con la captura: "no me gusta que todo esté en verde, y las letras
  // verdes sobre verde no quedan bien. Haz el color de la tarjeta gris y que
  // sólo el arrived today y el arrived de cada tarjeta sean de fondo verde y
  // color verde."
  //
  // Es fácil de deshacer sin querer —teñir un recuadro es una línea— así que
  // queda escrito: el fondo del bloque no puede volver a ser verde.
  const bloque   = cssRule('.morning-done');
  const rotulo   = cssRule('.morning-done-label');
  const etiqueta = cssRule('.inc-status-arrived');
  const donde    = cssRule('.inc-item-where');
  const tarde    = cssRule('.morning-late');

  check('el recuadro de lo que llegó es GRIS, no verde',
    /background:var\(--bg\)/.test(bloque) && !/green/.test(bloque), bloque);
  check('...y su borde tampoco es verde', !/--green/.test(bloque));
  check('el rótulo "Arrived" SÍ es verde — es donde el color significa algo',
    /color:var\(--green\)/.test(rotulo));
  check('y la etiqueta de cada tarjeta se queda como estaba: fondo verde y ' +
        'letra verde', /background:var\(--green-bg\)/.test(etiqueta) &&
        /color:var\(--green\)/.test(etiqueta));
  check('la línea del estante ya NO es verde: era la tercera cosa verde de la ' +
        'misma tarjeta y encima sobre fondo verde. El estante es un dato que ' +
        'se lee, no un estado', !/green/.test(donde), donde);
  check('y el recuadro de lo atrasado sigue la misma receta — gris, y el ámbar ' +
        'sólo en el rótulo', /background:var\(--bg\)/.test(tarde) &&
        !/#FEF3C7/.test(tarde));
}

console.log('\n────────────────────────────────────────────────────────────────────────');
console.log('La locación se averigua EMPAREJANDO entrega con movimiento, porque');
console.log('nada guarda el id de una en la otra. Mientras eso siga así, esto');
console.log('puede callar cuando debería hablar — y está escrito para fallar');
console.log('hacia ese lado. El día que la entrada guarde de qué entrega vino,');
console.log('esta función se vuelve una búsqueda por id y la mitad de este');
console.log('archivo sobra.');
console.log('────────────────────────────────────────────────────────────────────────\n');

console.log(fail ? `morning arrivals: ${fail} FALLO(S), ${ok} ok` : `morning arrivals: ok (${ok})`);
process.exit(fail ? 1 : 0);
