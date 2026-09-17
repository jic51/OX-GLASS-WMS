#!/usr/bin/env node
/* ─────────────────────────────────────────────────────────────────────────────
   LO MARCADO ES LO QUE SE VE.

   Jose, 2026-09-16: "a parte sucedió algo irregular al seleccionar los
   elementos que quería borrar, en algún momento, al estar seleccionando más
   movimientos se borraron todos los checks, eso es raro".

   No era raro. Era reproducible, y tenía dos mitades.

   LA QUE SE VE. _TAB_RENDERS.movements hacía `_movPage = 1` antes de pintar, y
   a ese mapa lo llama renderAll — o sea, CADA RECARGA SILENCIOSA. Trabajando
   con dos cuentas eso es cada veinte segundos. La tabla se plegaba a la primera
   página, las filas marcadas de la página 2 en adelante dejaban de pintarse, y
   las casillas desaparecían delante de él.

   LA QUE NO SE VE, Y ES LA PELIGROSA. La selección NO se perdía.
   _selectedMovements recorre la lista ENTERA, no lo pintado, así que el botón
   Delete seguía armado sobre filas que ya no estaban en pantalla. Marcar ocho,
   ver cero casillas, y que borrar se lleve ocho es peor que perder la
   selección: la selección perdida se nota, ésta no.

   Las dos se arreglan con reglas distintas y por eso las dos se prueban:
     1. una recarga de datos no cambia de página — volver a la 1 significa algo
        cuando cambias de pantalla o de filtro, no cuando llegan datos;
     2. y pase lo que pase, lo que no está pintado no está seleccionado.

   Aquí se EJECUTA renderMovements de verdad contra una tabla de mentira, y se
   mira qué queda en _movSelection. Comprobar que la línea `_movPage = 1` ya no
   está sería comprobar el arreglo, no el fallo.
   ───────────────────────────────────────────────────────────────────────── */

const vm = require('vm');
const A  = require('./andamio.js');

const HTML = A.fuente('html');
const m    = A.marcador('selección viva');

/* Una tabla de mentira que se porta como la de verdad en lo único que importa
   aquí: cuando se le escribe innerHTML, las casillas que quedan pintadas son
   las de las filas que ese HTML contiene. */
function tabla(){
  const nodo = { html: '', casillas: [] };
  nodo.querySelectorAll = (sel) => {
    if (sel !== '.mov-select-cb' && sel !== '[data-row]') return [];
    if (sel === '[data-row]') return [];
    return nodo.casillas;
  };
  Object.defineProperty(nodo, 'innerHTML', {
    get(){ return nodo.html; },
    set(v){
      nodo.html = v;
      // Cada data-movid del HTML es una casilla pintada.
      const ids = (v.match(/data-movid="([^"]*)"/g) || [])
        .map(x => x.replace(/.*data-movid="([^"]*)".*/, '$1'))
        .filter(Boolean);
      nodo.casillas = ids.map(id => ({
        checked: false, disabled: false,
        getAttribute: (k) => (k === 'data-movid' ? id : null)
      }));
    }
  });
  return nodo;
}

function mundo(nMovs){
  const movs = [];
  for (let i = 1; i <= nMovs; i++){
    movs.push({
      movId: 'M' + i, rowIdx: i, archived: false,
      moveType: 'ENTRY', qty: 1, unit: 'UNIT', name: 'MAT ' + i,
      category: 'WINDOW', date: '2026-09-16', po: '', project: '',
      sourceLoc: '', destLoc: 'A1', user: 'jose@ox.com', receivedBy: '',
      comments: '', supplier: '', gc: ''
    });
  }

  const tc = tabla();
  const barra = {};
  const ctx = {
    Math, Date, String, Number, JSON, Array, Object, RegExp, console,
    movements: movs,
    oldMovements: [],
    userRole: 'ADMIN',
    rolePerms: { canEditMovements: true },
    _movPage: 1,
    _MOV_PAGE_SZ: 10,
    _movRenderedRows: [],
    _movSelection: {},
    _colEdit: { mov: false },
    // Cuántas columnas hay visibles no dice nada aquí: sólo entra en el
    // colspan del pie. Un doble, y así el trozo extraído corre tal cual.
    _visibleColCount: () => 10,
    barra
  };
  ctx.document = {
    getElementById: (id) => {
      if (id === 'tableContainer') return tc;
      if (id === 'movSelAll')  return { checked:false, indeterminate:false, disabled:false };
      if (id === 'movActBar')  return { style: {} };
      if (id === 'btnMovDel')  return barra.del  || (barra.del  = { disabled:true, title:'' });
      if (id === 'btnMovEdit') return barra.edit || (barra.edit = { disabled:true, title:'' });
      if (id === 'movSelCount')return barra.cnt  || (barra.cnt  = { textContent:'' });
      return null;
    },
    querySelectorAll: () => tc.casillas
  };

  /* Sólo la parte de renderMovements que este archivo mide: la paginación y lo
     que pasa con la selección después de pintar. El cuerpo entero arrastra el
     formateo de veinte columnas, que aquí no dice nada. Se SACA del archivo,
     no se copia — si mañana cambia, esto cambia con él. */
  const cuerpo = A.fnSrc(HTML, 'renderMovements');
  if (!cuerpo) throw new Error('no está renderMovements');
  const iPag = cuerpo.indexOf('// ── Pagination');
  const iFin = cuerpo.indexOf("tc.querySelectorAll('[data-row]')");
  if (iPag === -1 || iFin === -1) throw new Error('renderMovements cambió de forma');

  /* Se le da `filtered` hecho y se le quitan tres cosas que aquí no dicen
     nada: el formateo de las veinte columnas, el pie y el botón de "Load
     more". Se cortan POR MARCAS, no con expresiones: una expresión sobre
     código ajeno acierta hoy y falla el día que alguien mueve una llave, y
     falla en silencio — deja medio bloque dentro y la caja revienta por algo
     que no tiene que ver con lo que se está midiendo. Cortar entre dos marcas
     conocidas se cae en el sitio, diciendo cuál falta. */
  function cortar(txt, desde, hasta, porQue){
    const a = txt.indexOf(desde);
    if (a === -1) throw new Error('renderMovements cambió: no está "' + desde + '"');
    const b = txt.indexOf(hasta, a + desde.length);
    if (b === -1) throw new Error('renderMovements cambió: no está "' + hasta + '"');
    return txt.slice(0, a) + porQue + txt.slice(b + hasta.length);
  }

  let trozo = cuerpo.slice(iPag, iFin);
  trozo = cortar(trozo, 'var rows = paged.map(function(m){', "\n  }).join('');",
    "var rows = paged.map(function(m){ return '<tr><td>" +
    "<input class=\"mov-select-cb\" data-movid=\"' + m.movId + '\"></td></tr>'; }).join('');");
  trozo = cortar(trozo, 'var foot = total',       '\n  var loadMoreBtn', "var foot = '';\n  var loadMoreBtn");
  trozo = cortar(trozo, 'var loadMoreBtn',        '\n\n  var tc',        "var loadMoreBtn = '';\n\n  var tc");
  trozo = trozo
    .replace("if (_colEdit.mov) _wireColEdit('mov');", '')
    .replace(/_colHeadRowHtml\('mov'\)/g, "''");

  const caja = A.montar(ctx, HTML, ['_syncMovSelectAll', '_updateMovActionBar',
                                    '_selectedMovements', '_movCanAct',
                                    'toggleMovSelect', 'toggleMovSelectAll'], {});
  // isAdmin se calcula unas líneas por encima del trozo extraído, así que se
  // recalcula igual que lo hace el archivo — no se pasa a mano: si mañana la
  // regla de quién puede actuar cambia, esta caja cambia con ella.
  vm.runInContext('function _pintar(filtered){\n  var isAdmin = _movCanAct();\n' +
                  trozo + '\n}', caja);

  return {
    ctx: caja, tc, movs,
    pintar(){ caja._pintar(caja.movements); },
    /** Marca por id, como haría un clic. */
    marcar(ids){
      ids.forEach(id => {
        const cb = tc.casillas.filter(c => c.getAttribute('data-movid') === id)[0];
        if (!cb) return;
        cb.checked = true;
        caja.toggleMovSelect(cb);
      });
    },
    marcados(){ return Object.keys(caja._movSelection).sort(); },
    pintadas(){ return tc.casillas.map(c => c.getAttribute('data-movid')); }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('el fallo del video, ejecutado');

{
  /* Veinticinco movimientos, página de diez. Jose carga hasta la tercera
     página, marca cinco repartidos y en ese momento llega la recarga
     silenciosa que el latido pidió. */
  const w = mundo(25);
  w.pintar();
  m.check('la primera página pinta diez', w.pintadas().length === 10);

  w.ctx._movPage = 3;
  w.pintar();
  m.check('tras "Load more" dos veces se ven los veinticinco', w.pintadas().length === 25);

  w.marcar(['M3', 'M12', 'M15', 'M22', 'M24']);
  m.check('cinco marcados, de tres páginas distintas', w.marcados().length === 5);
  m.check('...y el botón Delete está armado sobre los cinco',
    w.ctx.barra.del.disabled === false && /Delete 5 movements/.test(w.ctx.barra.del.title),
    w.ctx.barra.del.title);

  // LA RECARGA. Antes esto hacía _movPage = 1 y se llevaba las casillas por
  // delante; ahora repinta lo mismo que había.
  w.pintar();
  m.check('una recarga de datos NO te devuelve a la primera página',
    w.ctx._movPage === 3, w.ctx._movPage);
  m.check('...las veinticinco filas siguen pintadas', w.pintadas().length === 25);
  m.check('...y los cinco checks siguen ahí — es lo que Jose vio desaparecer',
    w.marcados().join(',') === 'M12,M15,M22,M24,M3', w.marcados());
  m.check('...y Delete sigue armado sobre los mismos cinco',
    /Delete 5 movements/.test(w.ctx.barra.del.title));
}

{
  /* LA MITAD PELIGROSA, forzada a mano: se pliega la tabla con cosas marcadas
     fuera. Da igual por qué se pliegue — lo que no está pintado no puede
     quedar armado. */
  const w = mundo(25);
  w.ctx._movPage = 3;
  w.pintar();
  w.marcar(['M3', 'M12', 'M22']);
  m.check('tres marcados', w.marcados().length === 3);

  w.ctx._movPage = 1;      // como fuera: un filtro, entrar a la pestaña
  w.pintar();

  m.check('al plegarse la tabla, los que ya no se ven dejan de estar marcados',
    w.marcados().join(',') === 'M3', w.marcados());
  m.check('...y el botón cuenta UNO, no tres — antes decía tres sobre dos ' +
          'filas que nadie estaba mirando',
    /Delete 1 movement\b/.test(w.ctx.barra.del.title), w.ctx.barra.del.title);
}

{
  // Y el caso de dos cuentas: la otra persona borró una fila que tú tenías
  // marcada. Desaparece de la lista, y tiene que desaparecer de la selección.
  const w = mundo(12);
  w.ctx._movPage = 2;
  w.pintar();
  w.marcar(['M4', 'M9']);
  m.check('dos marcados', w.marcados().length === 2);

  w.ctx.movements = w.ctx.movements.filter(x => x.movId !== 'M9');
  w.pintar();
  m.check('lo que otra persona borró deja de estar marcado, sin que nadie ' +
          'tenga que acordarse de limpiarlo',
    w.marcados().join(',') === 'M4', w.marcados());
  m.check('...y el botón baja a uno', /Delete 1 movement\b/.test(w.ctx.barra.del.title));
}

{
  // Nada marcado: Delete apagado, y lo dice.
  const w = mundo(5);
  w.pintar();
  m.check('sin nada marcado, Delete está apagado', w.ctx.barra.del.disabled === true);
  m.check('...y explica por qué', /Tick a row first/.test(w.ctx.barra.del.title));
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('dónde SÍ se vuelve a la página 1');

{
  /* La vuelta a la primera página no se borró: se movió a donde significa
     algo. Si se pierde del todo, "Load more" cinco veces te deja con quinientas
     filas pintadas para siempre. */
  const showTab = A.fnSrc(HTML, 'showTab');
  m.check('entrar a una pestaña empieza por arriba',
    /_movPage = 1;/.test(showTab));
  m.check('...y también limpia la selección, que es la regla de Jose sobre ' +
          'cambiar de pantalla', /_clearMovSelection\(\);/.test(showTab));

  const tres = (HTML.match(/_clearMovSelection\(\); _movPage=1; renderMovements\(\);/g) || []).length;
  m.check('los tres filtros siguen haciendo las dos cosas', tres === 3, tres);

  /* Y EL QUE CAUSÓ EL FALLO YA NO LO HACE. Es una comprobación de texto a
     propósito: lo que se guarda es que esa línea no VUELVA, y volvería como una
     línea, no como un comportamiento que esta caja pueda provocar. */
  m.check('repintar por datos nuevos ya NO vuelve a la página 1',
    /movements: function\(\)\{ renderMovements\(\); \}/.test(HTML));
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('la tarjeta del hover, siempre del mismo tamaño');

{
  /* Jose, con video: "quiero que el pop-up al hacer hover sobre el nombre y
     correo sea del mismo tamaño no importa el nombre y el correo... se mueve o
     aparece en un lugar diferente y de un largo diferente dependiendo del
     correo".

     Una sola causa para las dos quejas: width:max-content medía lo que midiera
     el correo, y una tarjeta más ancha tiene que apartarse más para no salirse
     de la ventana. */
  /* SIN COMENTARIOS. La primera versión de esta comprobación buscaba
     "width:max-content" en el bloque entero y fallaba — porque el comentario
     que explica el arreglo NOMBRA lo que se quitó. Una prueba que lee prosa
     mide prosa. */
  // Con el limpiador compartido, no con el regex a mano: éste era el octavo
  // sitio con la misma copia, y la copia tomaba el `/*` de accept="image/*" por
  // una apertura de comentario. En este trozo de CSS concreto no hacía daño —no
  // hay ningún tipo MIME dentro—, pero dejar la copia mala aquí es dejarla para
  // el siguiente que copie de aquí. Ver andamio.sinComentarios.
  const css = A.sinComentarios(
    HTML.slice(HTML.indexOf('#acPerson{'), HTML.indexOf('#acPerson{') + 1600));
  m.check('la tarjeta ya no mide lo que mida el correo',
    !/width:max-content/.test(css), css.slice(0, 120));
  m.check('...tiene un ancho fijo', /width:min\(300px,90vw\)/.test(css));

  const linea = HTML.slice(HTML.indexOf('.ap-name,.ap-mail{'), HTML.indexOf('.ap-name,.ap-mail{') + 200);
  m.check('el nombre y el correo van en UNA línea: partirse en dos cambiaría ' +
          'el alto y volvería a no ser del mismo tamaño',
    /white-space:nowrap/.test(linea) && /text-overflow:ellipsis/.test(linea));

  const card = A.fnSrc(HTML, '_personShow');
  m.check('lo que no cabe se puede leer igual: el nombre lleva su title',
    /class="ap-name" title="' \+ _escAttr\(nombre\)/.test(card));
  m.check('...y el correo también', /class="ap-mail" title="' \+ _escAttr\(mail\)/.test(card));
  m.check('...y siguen escapados, que salen de una hoja que edita una persona',
    /_he\(nombre\)/.test(card) && /_he\(mail\)/.test(card));
}

m.fin();
