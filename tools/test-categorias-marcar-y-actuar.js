// CATEGORÍAS: MARCAR Y ACTUAR, COMO EN EL RESTO DE LA APP.
//
// Jose, 4/11: *"en la parte de categories vamos a ponerlo igual que en
// «Low-Stock Monitor Settings»: las categorías agrupadas en el centro, con el
// hover igual, y cuando se seleccione una se activan rename/delete; si
// selecciona más de una, se desactiva rename y sólo queda delete."*
//
// ── POR QUÉ ESTO ES EL MOLDE ───────────────────────────────────────────────
//
// La app tenía CINCO formas de elegir una fila, y Categorías llevaba DOS a la
// vez: un «modo» para renombrar y una casilla distinta para fusionar, en la
// misma lista. Esta pantalla es la primera que pasa al patrón único, y lo que
// esta prueba sujeta no es su aspecto: es **la regla de uno contra varios**,
// que es la parte que se puede volver a perder cuando se convierta la
// siguiente pantalla.
//
// Uso:  node tools/test-categorias-marcar-y-actuar.js

const fs   = require('fs');
const path = require('path');
const A    = require('./andamio.js');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'Index_v3_fixed.html'), 'utf8');

let ok = 0;
const fallos = [];
function check(etiqueta, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + etiqueta); return; }
  fallos.push(etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
  console.log('  ✗    ' + etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
}
function fnSrc(nombre) {
  const ini = HTML.indexOf('function ' + nombre + '(');
  if (ini === -1) throw new Error('no encontrada: ' + nombre);
  let prof = 0;
  for (let j = HTML.indexOf('{', ini); j < HTML.length; j++) {
    if (HTML[j] === '{') prof++;
    else if (HTML[j] === '}') { prof--; if (prof === 0) return HTML.slice(ini, j + 1); }
  }
  throw new Error('sin cerrar: ' + nombre);
}

console.log('\n═══ 1 · AGRUPADAS EN EL CENTRO, COMO EL LOW-STOCK MONITOR ═══\n');

const pinta = fnSrc('_renderCategoriesTab');

check('Ajustes manda las categorías a su propia pantalla',
  /tab === 'categories'\)\{ _renderCategoriesTab\(items\)/.test(HTML));
check('usa la MISMA caja que el Low-Stock Monitor, no una parecida',
  /class="mon-chips"/.test(pinta), pinta.slice(0, 400));
check('...y los mismos chips, con su color de categoría',
  /class="mon-chip /.test(pinta) && /CAT_BADGE/.test(pinta));
check('ya no es una lista de filas', !/cfg-list/.test(pinta));
check('...ni tiene modos: no hay barra de modo en esta pantalla',
  !/_rowModeBarHtml/.test(pinta));
check('se puede seguir añadiendo una categoría nueva',
  /_cfgAdd\(/.test(pinta) && /cfgNewVal/.test(pinta));

console.log('\n═══ 2 · LA REGLA DE UNO CONTRA VARIOS, EJECUTADA ═══\n');

const barra = fnSrc('_catBarra');

/* ── SE EJECUTA LA BARRA, NO SE LEE ────────────────────────────────────────
 *
 * La primera versión de esta sección leía el código de `_catBarra` y buscaba
 * `sel.length === 1` y un `} else {`. Servía mientras la barra estaba escrita
 * dentro de esa función, y dejó de servir en cuanto el mecanismo se sacó a
 * `_barraMarcados` para que lo usaran las otras cuatro pantallas — aunque el
 * comportamiento era exactamente el mismo.
 *
 * Esa es la señal de que la prueba estaba midiendo la FORMA del código y no lo
 * que hace. Y ya me costó un fallo entregado esta misma semana: ocho
 * comprobaciones de texto sobre el observador de ventanas, y las ocho pasaban
 * con el fallo dentro.
 *
 * Así que ahora se monta la barra con un DOM de mentira y **se mira el HTML
 * que produce**. Eso vale para Categorías y valdrá igual para Projects,
 * Suppliers, Locations, Directory y Materials, porque todas pasan por aquí. */

/* El DOM de mentira devuelve `null` para lo que NO está pintado, igual que el
 * de verdad. La primera versión devolvía un elemento para cualquier id que se
 * le pidiera, y eso le daba la razón al código aunque el botón no existiera —
 * un doble que contesta que sí a todo no mide nada. */
function domFalso(){
  const hechos = {};
  let pintado = '';
  function el(id){
    if (hechos[id]) return hechos[id];
    if (id !== 'bar' && pintado && pintado.indexOf('id="' + id + '"') === -1) return null;
    const clases = new Set();
    return (hechos[id] = {
      id: id, innerHTML: '', value: '', disabled: false, title: '',
      classList: {
        add: c => clases.add(c), remove: c => clases.delete(c),
        contains: c => clases.has(c),
        toggle: (c, on) => { if (on === undefined ? !clases.has(c) : on) clases.add(c); else clases.delete(c); }
      },
      clases: clases,
      addEventListener: function(){},
      querySelectorAll: () => []
    });
  }
  /* La barra apunta lo que se acaba de pintar, para que los `getElementById`
   * que vienen después contesten como contestaría el navegador. */
  const bar = el('bar');
  Object.defineProperty(bar, 'innerHTML', {
    get(){ return pintado; },
    set(v){ pintado = v; }
  });
  return { el: el, hechos: hechos,
           doc: { getElementById: el, querySelectorAll: () => [] } };
}

function pintarBarra(sel){
  const d = domFalso();
  const ctx = {
    document: d.doc, String: String, Array: Array,
    _he: t => String(t),
    _escAttr: t => String(t).replace(/"/g, '&quot;'),
    _vigilarGuardar: function(){ return { revisar(){}, guardado(){} }; }
  };
  const F = A.montar(ctx, HTML, ['_barraMarcados'], {
    dobles: ['_he', '_escAttr', '_vigilarGuardar']
  });
  F._barraMarcados({
    barId: 'bar', prefijo: 'cat',
    marcadas: () => sel,
    instruccion: 'Tick a category to rename or delete it. Tick two or more to merge them.',
    limpiar: function(){},
    renombrar: { hacer: function(){} },
    fusionar:  { hacer: function(){} },
    acciones: [{ id: 'DelBtn', clase: 'cfg-btn-danger', texto: '🗑 Delete',
                 conVarias: true, hacer: function(){} }]
  });
  return { html: d.el('bar').innerHTML, bar: d.el('bar') };
}

const vacia   = pintarBarra([]);
const unaSola = pintarBarra(['FLASHING']).html;
const varias  = pintarBarra(['FLASHING', 'SEALANT', 'TOOLS']).html;

/* La regla de Jose, y no es una preferencia: **renombrar es de UNA y borrar es
 * de MUCHAS**. Es la diferencia real entre las dos operaciones, y escrita en
 * qué botones se encienden no hay que explicarla. */
check('con UNA: se puede renombrar', /catRenameBtn/.test(unaSola), unaSola);
check('con UNA: y borrar', /catDelBtn/.test(unaSola));
check('con UNA: fusionar NO aparece — no hay con qué fusionar',
  !/catMergeBtn/.test(unaSola));
check('con VARIAS: se puede borrar', /catDelBtn/.test(varias), varias);
check('con VARIAS: y fusionar, que es lo que ya existía', /catMergeBtn/.test(varias));
check('con VARIAS: borrar dice CUÁNTAS se lleva', /🗑 Delete 3/.test(varias));
check('con VARIAS: hay que decir cuál nombre se queda',
  /catKeep/.test(varias) && /keep which name/.test(varias));

/* Y Renombrar NO está apagado: no está. Renombrar varias cosas a un mismo
 * nombre no es renombrar, es fusionar — y fusionar está ahí al lado. Un botón
 * apagado invitaría a preguntarse qué haría. */
check('con VARIAS: renombrar NO aparece, ni siquiera apagado',
  !/catRenameBtn/.test(varias) && !/catRenameInp/.test(varias), varias.slice(0, 300));
check('...y tampoco disfrazado de botón apagado', !/disabled/.test(varias));

check('siempre se puede soltar lo marcado',
  /catClearBtn/.test(unaSola) && /catClearBtn/.test(varias));
check('y la barra dice cuántas hay marcadas',
  /1 selected/.test(unaSola) && /3 selected/.test(varias));

console.log('\n═══ 3 · LO QUE LA PANTALLA NO DEBE VOLVER A HACER ═══\n');

check('no se renombra con una ventanita del navegador',
  !/[^_.\w]prompt\(/.test(pinta) && !/[^_.\w]prompt\(/.test(barra));
check('se escribe el nombre nuevo EN la barra', /catRenameInp/.test(unaSola));
check('...y Renombrar nace APAGADO: sin escribir otro nombre no hay nada que hacer',
  /id="catRenameBtn" disabled/.test(unaSola), unaSola);
check('...y pasa por el guardia de siempre: ni igual, ni vacío',
  /_vigilarGuardar\(\{ boton: rbt/.test(fnSrc('_barraMarcados')));
check('...y lo que se guarda va en mayúsculas, como todos los demás caminos',
  /toUpperCase\(\)/.test(fnSrc('_barraMarcados')));

console.log('\n═══ 4 · LA FRANJA NO EMPUJA LOS CHIPS ═══\n');

check('la barra usa la franja que ya reserva su sitio', /class="cfg-pickbar"/.test(pinta));
check('vacía conserva su sitio y dice qué hacer',
  /Tick a category to rename or delete it/.test(vacia.html) && vacia.html !== '', vacia.html);
check('...y vacía no se enciende', !vacia.bar.classList.contains('show'));

console.log('\n═══ 5 · BORRAR DICE QUÉ SE LLEVA ═══\n');

/* «3 categorías» no se puede comprobar; los tres nombres sí. */
check('el aviso nombra las categorías, no sólo cuántas',
  /sel\.join\('\\n'\)/.test(barra), barra.slice(barra.indexOf('catDelBtn')));
check('...y dice que los movimientos ya guardados no cambian',
  /keep the category they were saved with/.test(barra));
check('borrar varias va de una en una, porque el servidor reescribe la columna entera',
  /pend\.shift\(\)/.test(barra) && /siguiente/.test(barra));
/* La lista de pendientes es una COPIA, y eso es lo que importa: el bucle se
 * alarga varios segundos —una llamada por categoría— y durante ese rato la
 * selección se vacía y la barra se repinta. Si el bucle leyera la selección en
 * vez de su copia, se quedaría a medias sin que nada lo dijera. */
check('la lista de pendientes es una copia, no la selección viva',
  /var pend = sel\.slice\(\);/.test(barra), barra.slice(barra.indexOf('onConfirm'), barra.indexOf('onConfirm') + 300));
check('...y la selección se vacía al confirmar, para que la barra no siga ' +
      'ofreciendo acciones sobre lo que se está yendo',
  /onConfirm[\s\S]{0,300}_catSel = \{\};/.test(barra));

/* Lo que ya no está en pantalla no puede quedar marcado — la misma regla de
 * Movements, por el mismo motivo: un Borrar armado sobre lo que nadie ve. */
check('al repintar, lo que ya no existe deja de estar marcado',
  /items\.indexOf\(n\) === -1/.test(pinta));

if (fallos.length) {
  console.error('\nFALLÓ:\n  ' + fallos.join('\n  ') + '\n');
  console.error('  Renombrar es de una; borrar es de muchas. Y lo que no aplica\n' +
                '  no se enseña apagado: no se enseña.\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
