#!/usr/bin/env node
/* ─────────────────────────────────────────────────────────────────────────────
   TODO LO QUE DESAPARECE, SE VE DESAPARECER.

   Jose pidió esto por primera vez sobre el borrado de un movimiento: "cuando
   elimino lo que sea que elimine, debe moverse y desaparecer con la animación
   en el mismo segundo que el toast". Se hizo ahí, y en restaurar. Y se quedó
   en esos dos.

   El CSS de la animación decía, palabra por palabra: "Los ocho sitios donde
   algo desaparece la usan por _rowLeave". Había DOS. Ese comentario se escribió
   con la intención de hacer los ocho y nunca se volvió — y es exactamente la
   clase de cosa que un comentario no puede guardar, porque no se cae cuando
   deja de ser verdad. Un número contado sí.

   LA TRAMPA QUE SE REPITE, y por eso cada sitio se comprueba EJECUTANDO:
   repintar la lista y luego animar no se ve, porque el repintado se lleva por
   delante el elemento que se estaba animando. Es la lección de la v11.66 y ya
   se cobró dos versiones. El orden correcto es animar, y repintar en el
   callback. Aquí se mide ese ORDEN, no que la llamada exista.

   Y la otra: los valores los escribe una persona en una hoja. "JOSE'S HOUSE"
   metido dentro de un querySelector no falla suave — LANZA, y se lleva por
   delante el borrado entero por querer animarlo. Por eso se compara en
   JavaScript en vez de construir un selector, y por eso hay una prueba con un
   apóstrofo dentro.
   ───────────────────────────────────────────────────────────────────────── */

const vm = require('vm');
const A  = require('./andamio.js');

const HTML = A.fuente('html');
const m    = A.marcador('salidas animadas');

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('el motor: animar primero, repintar después');

/* Un DOM de mentira con lo justo. Lo que importa es el ORDEN de las cosas, así
   que cada paso se apunta en una lista y al final se lee esa lista. */
function caja(){
  const pasos = [];
  function nodo(attrs){
    return {
      attrs: attrs || {},
      clases: [],
      style: {},
      scrollHeight: 24,
      offsetHeight: 0,
      tagName: attrs && attrs.tag ? attrs.tag : 'LI',
      parentNode: { real: true },
      getAttribute(k){ return this.attrs[k] !== undefined ? this.attrs[k] : null; },
      classList: {
        add: function(c){ pasos.push('anima:' + (attrs['data-val'] || attrs['data-name'] || '?')); }
      }
    };
  }

  const temporizadores = [];
  const ctx = {
    Math, Date, String, Number, JSON, Array, Object,
    console: { log(){}, warn(){}, error(){} },
    setTimeout: (fn) => { temporizadores.push(fn); return temporizadores.length; },
    window: {},                       // sin matchMedia: no hay "menos movimiento"
    pasos: pasos
  };
  ctx.document = { getElementById: (id) => ctx.__cajas[id] || null };
  ctx.__cajas = {};

  const c = A.montar(ctx, HTML, ['_rowLeave', '_rowLeaveAll', '_itemsBy'], {});
  vm.runInContext(A.constantes(HTML, ['ROW_LEAVE_MS']), c);
  return { ctx: c, pasos, nodo, correr(){ while (temporizadores.length) temporizadores.shift()(); } };
}

{
  const k = caja();
  const a = k.nodo({ 'data-val': 'A' }), b = k.nodo({ 'data-val': 'B' }), d = k.nodo({ 'data-val': 'C' });
  k.ctx._rowLeaveAll([a, b, d], function(){ k.pasos.push('repinta'); });

  m.check('las tres se animan a la vez', k.pasos.filter(x => /^anima/.test(x)).length === 3);
  m.check('y el repintado TODAVÍA no ha ocurrido — al revés se llevaría por ' +
          'delante las que se están animando',
    k.pasos.indexOf('repinta') === -1, k.pasos);

  k.correr();
  m.check('el repintado llega cuando terminan', k.pasos[k.pasos.length - 1] === 'repinta', k.pasos);
  m.check('...y UNA sola vez, no una por fila',
    k.pasos.filter(x => x === 'repinta').length === 1);
}

{
  // Nada que animar no puede significar "no hagas el trabajo". Una lista que no
  // está pintada —la pestaña cerrada, el móvil— tiene que borrar igual.
  const k = caja();
  k.ctx._rowLeaveAll([], function(){ k.pasos.push('repinta'); });
  m.check('sin filas pintadas el trabajo se hace IGUAL, y en el acto',
    k.pasos.length === 1 && k.pasos[0] === 'repinta', k.pasos);

  const k2 = caja();
  k2.ctx._rowLeaveAll([null, undefined], function(){ k2.pasos.push('repinta'); });
  m.check('...y un hueco en la lista no la rompe', k2.pasos[0] === 'repinta');
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('buscar la fila sin construir un selector');

{
  const k = caja();
  const lista = [
    k.nodo({ 'data-val': "JOSE'S HOUSE" }),
    k.nodo({ 'data-val': 'BAY "A"' }),
    k.nodo({ 'data-val': 'WIN WIN' }),
    k.nodo({ 'data-val': 'win win' })
  ];
  k.ctx.__cajas.settingsTabContent = { querySelectorAll: () => lista };

  /* EL QUE ROMPERÍA UN SELECTOR. document.querySelector('[data-val="JOSE\'S
     HOUSE"]') no devuelve null: LANZA. Y como la animación va delante del
     borrado, la excepción se llevaría por delante el borrado entero — el
     usuario pulsa, no pasa nada, y no hay error que explique por qué. */
  const apostrofo = k.ctx._itemsBy('settingsTabContent', 'li.cfg-item', 'data-val', ["JOSE'S HOUSE"]);
  m.check('un apóstrofo en el nombre encuentra su fila igual', apostrofo.length === 1);
  const comillas = k.ctx._itemsBy('settingsTabContent', 'li.cfg-item', 'data-val', ['BAY "A"']);
  m.check('...y unas comillas dobles también', comillas.length === 1);

  m.check('compara en mayúsculas, como el catálogo en todas partes',
    k.ctx._itemsBy('settingsTabContent', 'li.cfg-item', 'data-val', ['WIN WIN']).length === 2);
  m.check('varios valores de una vez, que es lo que pide una fusión',
    k.ctx._itemsBy('settingsTabContent', 'li.cfg-item', 'data-val', ["JOSE'S HOUSE", 'BAY "A"']).length === 2);
  m.check('un valor que no está no devuelve nada, y no se queja',
    k.ctx._itemsBy('settingsTabContent', 'li.cfg-item', 'data-val', ['NO EXISTE']).length === 0);
  m.check('una caja que no está en pantalla tampoco rompe',
    k.ctx._itemsBy('noExiste', 'li.cfg-item', 'data-val', ['WIN WIN']).length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('los ocho sitios, contados');

/* Contados y no mirados. El comentario del CSS decía ocho cuando había dos, y
   nadie lo notó durante versiones: un comentario no se cae cuando deja de ser
   verdad. Esta lista sí. */
{
  const SITIOS = [
    ['borrar un movimiento',            '_doDeleteMovementRow', /_rowLeave\(_movRowEl\(mov\), function\(\)\{/],
    ['restaurar un movimiento',         '_trashDrop',           /_rowLeave\(fila, function\(\)\{/],
    ['vaciar la papelera',              '_emptyTrash',          /_rowLeaveAll\([\s\S]{0,200}_loadTrash\(\)/],
    ['borrar un valor del catálogo',    '_cfgCall',             /_rowLeaveAll\([\s\S]{0,300}_applyCfgChangeLocally\(payload\)/],
    ['quitar un contacto del directorio', '_drawPmDirectory',   null],   // se comprueba aparte
    ['borrar una ubicación',            '_locDelete',           /_rowLeaveAll\(_itemsBy\('locGroups'[\s\S]{0,200}_redrawLocGroups\(\)/],
    ['fusionar materiales',             '_matCall',             /_rowLeaveAll\(payload\.op === 'merge'[\s\S]{0,140}_applyMatChangeLocally\(payload\)/]
  ];

  SITIOS.forEach(([que, fn, patron]) => {
    if (!patron) return;
    const cuerpo = A.fnSrc(HTML, fn);
    m.check(que + ': anima, y repinta DENTRO del callback',
      !!cuerpo && patron.test(cuerpo), fn);
  });

  // Los tres que viven dentro de un draw() anónimo y no tienen función propia.
  m.check('fusionar valores del catálogo: anima los que se van',
    /_rowLeaveAll\(\s*_itemsBy\('settingsTabContent', 'li\.cfg-item', 'data-val', from\),[\s\S]{0,120}_applyMergeLocally\(tab, from, into\)/.test(HTML));
  m.check('fusionar ubicaciones: los recoge ANTES de tocar la lista, que es lo ' +
          'único que funciona — después ya no están en _locLayout',
    /var seVan = _itemsBy\('locGroups', 'li\.loc-item', 'data-name', from\);[\s\S]{0,200}_locLayout = _locLayout\.filter/.test(HTML) &&
    /_rowLeaveAll\(seVan, function\(\)\{ _redrawLocGroups\(\); \}\)/.test(HTML));
  m.check('fusionar duplicados parecidos: ya no es un g.remove() de golpe',
    /_rowLeave\(g, function\(\)\{ if \(g\) g\.remove\(\); \}\)/.test(HTML));
  m.check('quitar un contacto del directorio: anima antes de repintar',
    /_rowLeaveAll\(\s*_itemsBy\('settingsTabContent', 'li\.cfg-item', 'data-val', \[name\]\),[\s\S]{0,200}_renderPmDirectoryTab\(\)/.test(HTML));

  /* Y LA FILA DEL DIRECTORIO TIENE QUE SER ENCONTRABLE. El data-val estaba sólo
     en su botón de papelera; sin ponerlo en el <li>, _itemsBy no encuentra
     nada y la animación no ocurre nunca — en silencio, que es lo peor. */
  m.check('la fila del directorio lleva su valor, no sólo su botón',
    /<li class="cfg-item" data-val="'\+_he\(p\.name\)\+'">/.test(HTML));

  // La cuenta. Si mañana alguien añade un sitio que borra, esto no lo obliga a
  // animarlo — pero si QUITA uno de los de arriba, se cae y dice cuál.
  const total = (HTML.match(/_rowLeave\(|_rowLeaveAll\(/g) || []).length;
  m.check('hay al menos diez llamadas a la animación repartidas por la app ' +
          '(el comentario decía ocho cuando había dos)',
    total >= 10, total);
}

{
  /* FUSIONAR MATERIALES MIRA NOMBRE **Y** CATEGORÍA. El MatID se compone de las
     dos, así que "SILICONE" en SEALANT y "SILICONE" en WINDOW son materiales
     distintos: animar por el nombre solo enseñaría irse a uno que sigue ahí. */
  const k = caja();
  const lista = [
    k.nodo({ 'data-name': 'SILICONE', 'data-cat': 'SEALANT' }),
    k.nodo({ 'data-name': 'SILICONE', 'data-cat': 'WINDOW' })
  ];
  k.ctx.__cajas.matListContainer = { querySelectorAll: () => lista };
  vm.runInContext(A.levantar(HTML, ['_matItemEls'], {}), k.ctx);

  m.check('el mismo nombre en dos categorías son dos materiales, y se anima uno',
    k.ctx._matItemEls('SILICONE', 'SEALANT').length === 1);
  m.check('...el que es', k.ctx._matItemEls('SILICONE', 'SEALANT')[0].getAttribute('data-cat') === 'SEALANT');
  m.check('una categoría que no existe no anima nada',
    k.ctx._matItemEls('SILICONE', 'NADA').length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('quien pidió menos movimiento no lo recibe');

{
  /* La animación es adorno; el borrado no. Con prefers-reduced-motion el
     callback corre EN EL ACTO — no más tarde, no nunca. */
  const k = caja();
  k.ctx.window.matchMedia = () => ({ matches: true });
  const a = k.nodo({ 'data-val': 'A' });
  k.ctx._rowLeaveAll([a], function(){ k.pasos.push('repinta'); });
  m.check('con "menos movimiento" el trabajo se hace al instante, sin esperar',
    k.pasos.indexOf('repinta') !== -1, k.pasos);
  m.check('...y no se anima nada', k.pasos.filter(x => /^anima/.test(x)).length === 0);
}

{
  // Un elemento que ya no está en el DOM no se anima, pero su trabajo sí se
  // hace. Pasa de verdad: dos pestañas, la otra repintó mientras tanto.
  const k = caja();
  const huerfano = k.nodo({ 'data-val': 'A' });
  huerfano.parentNode = null;
  k.ctx._rowLeaveAll([huerfano], function(){ k.pasos.push('repinta'); });
  m.check('una fila que ya no está en la pantalla no detiene el borrado',
    k.pasos.indexOf('repinta') !== -1, k.pasos);
}

{
  // Y el callback corre UNA vez aunque el temporizador llegue después. _rowLeave
  // lo protege con `done = null`; sin eso, una fila animada haría el trabajo dos
  // veces y el segundo repintado pisaría lo que hizo el primero.
  const k = caja();
  const a = k.nodo({ 'data-val': 'A' });
  k.ctx._rowLeave(a, function(){ k.pasos.push('repinta'); });
  k.correr(); k.correr();
  m.check('el trabajo no se hace dos veces aunque se dispare de nuevo',
    k.pasos.filter(x => x === 'repinta').length === 1, k.pasos);
}

m.fin();
