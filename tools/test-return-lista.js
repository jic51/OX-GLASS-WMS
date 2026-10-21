// LA LISTA DE LO QUE ESTÁ FUERA, MEDIDA EN EL NAVEGADOR.
//
// Jose, 20/10, con cuatro capturas de la pantalla de RETURN:
//
//   *"Al seleccionar RETURN es lógico que voy a devolver algo que ya estaba
//   fuera de la bodega, pero la app solo sugiere 1 material (debería dar la
//   lista de todos los materiales parecidos y SOLO COMO LISTA FLOTANTE, no como
//   tarjetas abajo del nombre)... debería tomar los datos de ese material y
//   autorellenar los campos... incluso debe sugerir la cantidad como se lo hace
//   en un EXIT."*
//
// Y la decisión que da forma a todo:
//
//   *"Para RETURN debe ser POR MATERIAL, porque no importa si se hicieron 4
//   EXITs de un material a un mismo lugar, importa cuánto material hay en ESE
//   LUGAR para devolver la cantidad que necesitamos de ese lugar a la bodega."*
//
// ── POR QUÉ ESTA PRUEBA ABRE UN NAVEGADOR ───────────────────────────────────
//
// `test-return-fuera.js` ya mide la otra mitad —que el servidor agrupe por
// material Y sitio, y que un saldo devuelto entero desaparezca— leyendo y
// ejecutando `getOutstandingBySite` en una caja. Eso no se puede leer aquí,
// y lo de aquí no se puede leer allí:
//
//   · Que la lista aparezca AL ENTRAR en el campo. La de bodega pide dos
//     letras, y está bien: al sacar material se sabe cuál es. Al devolverlo no
//     se sabe —por eso Jose pidió la lista— y una lista que exige teclear algo
//     antes de aparecer no se encuentra nunca. Es la diferencia entre el rasgo
//     que pidió y un rasgo escondido.
//   · Que elegir una fila deje el formulario con los campos puestos y la caja
//     cerrada. Cerrarla es lo delicado: rellenar el nombre dispara `input`, que
//     vuelve a entrar en la misma función que abre la caja.
//   · Que haya UN cuadro y no dos. Las dos listas que pueden colgar de `#mName`
//     son contrarias —en bodega / fuera de bodega—, y con dos cuadros el día
//     que uno se abra sin que el otro se cierre se ven las dos a la vez. Esto
//     comprueba que la caja de fuera es LA MISMA, con otra clase.
//
// Uso:  node tools/test-return-lista.js

const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');

const RAIZ = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(RAIZ, 'Index_v3_fixed.html'), 'utf8');

let ok = 0; const fails = [];
function check(label, got, want) {
  const bien = (want === undefined) ? !!got : JSON.stringify(got) === JSON.stringify(want);
  if (bien) { ok++; console.log('  ok   ' + label); }
  else { fails.push(label + ': esperaba ' + JSON.stringify(want) + ', salió ' + JSON.stringify(got));
         console.log('  FALLA ' + label + '  → ' + JSON.stringify(got)); }
}

/* LO QUE DEVOLVERÍA EL SERVIDOR, ya agrupado — esta prueba empieza donde acaba
 * `test-return-fuera.js`. Las dos primeras filas son el mismo material en DOS
 * sitios distintos, y están aquí a propósito: una lista por material a secas
 * las habría sumado en un 10 que no se puede devolver a ninguna parte. Es la
 * regla de Jose, puesta donde se ve.
 *
 * La tercera lleva 2,5 y una unidad que NO está en el desplegable del
 * formulario. Las dos cosas son trampas: redondear la cantidad inventa media
 * plancha, y escribir una unidad inexistente en un `<select>` lo deja en
 * blanco, que es perder el dato en silencio. */
const FUERA = [
  { category:'WINDOW', name:'VINYL WINDOW 36X48', site:'LEHI HOUSE 12', qty:7,
    unit:'UNIT', project:'LEHI 12', pm:'MARIA', responsible:'CARLOS', supplier:'', gc:'' },
  { category:'WINDOW', name:'VINYL WINDOW 36X48', site:'OREM DUPLEX', qty:3,
    unit:'UNIT', project:'OREM D', pm:'LUIS', responsible:'ANA', supplier:'', gc:'' },
  { category:'WINDOW', name:'SCREEN FRAME', site:'LEHI HOUSE 12', qty:2.5,
    unit:'PALLET', project:'', pm:'', responsible:'', supplier:'', gc:'' },
  { category:'DOOR',   name:'STEEL DOOR 32', site:'PROVO SHOP', qty:1,
    unit:'UNIT', project:'PROVO', pm:'ELENA', responsible:'', supplier:'', gc:'' }
];

/* Un material EN bodega, que hace falta para la sección 8: la tarjeta de
 * «material parecido» compara contra el catálogo de stock, así que sin nada en
 * bodega no habría nada parecido y la prueba de ENTRY pasaría por vacía — que es
 * exactamente el tipo de verde que no dice nada. */
const STOCK = {
  'WINDOW|||VINYL WINDOW 36X48': {
    category: 'WINDOW', name: 'VINYL WINDOW 36X48', unit: 'UNIT',
    warehouseQty: 5, siteQty: 10, reservedQty: 0, availableQty: 5,
    warehouseLocs: { A1A: 5 }, project: '', supplier: ''
  }
};

const DATA = {
  userRole: 'ADMIN', userEmail: 'jose@ox.com', userName: 'Jose', serverVersion: 'test',
  company: { name: 'OX Glass LLC.' }, movements: [], stock: STOCK, materialLocks: [],
  monitoredMaterials: null,
  config: { categories: ['WINDOW', 'DOOR'], projects: [], suppliers: [],
            locations: [{ name: 'A1A', type: 'RACK' }], units: ['UNIT'] },
  incoming: [], rackPhotos: {}, systemActivity: [],
  rolePerms: { canSeeCosts: true, canEditMovements: true, canManageCatalog: true, canExportData: true },
  warehouseRoleLabel: 'Warehouse', archiveCutoffMonths: 12, oauthClientId: '', oauthRedirectUri: ''
};

/* El doble del servidor filtra por categoría igual que `getOutstandingBySite`,
 * y apunta cada llamada. Las dos cosas hacen falta: sin el filtro no se puede
 * comprobar que cambiar de categoría trae otra lista, y sin la cuenta no se
 * puede comprobar que no se pide una lectura del archivo por cada tecla. */
function pagina(){
  const stub = `<script>
window.google=window.google||{};window.google.charts={load:function(){},setOnLoadCallback:function(){}};
window.__FUERA=${JSON.stringify(FUERA)};
window.__fueraLlamadas=[];
window.__DATA=${JSON.stringify(DATA)};
(function(){
  var ok=null, fail=null;
  var api={
    withSuccessHandler:function(f){ ok=f; return proxy; },
    withFailureHandler:function(f){ fail=f; return proxy; },
    getInitialData:function(){ var h=ok; setTimeout(function(){h&&h(window.__DATA);},20); },
    getOutstandingBySite:function(tok,cat){
      var h=ok; window.__fueraLlamadas.push(cat);
      setTimeout(function(){
        h && h(window.__FUERA.filter(function(f){ return !cat || f.category===cat; }));
      },30);
    },
    /* El directorio de PMs tiene que contestar una LISTA. El doble genérico de
     * abajo contesta {}, y el producto hace \`list || []\` —que a un {} lo deja
     * pasar— y luego \`.map\`. Es el doble el que miente aquí, no el producto:
     * el servidor de verdad devuelve un array. */
    processMovement:function(accion){
      var h=ok, vacio = (accion==='getPmDirectory') ? [] : {};
      setTimeout(function(){ h && h(vacio); },10);
    }
  };
  var proxy=new Proxy(api,{get:function(t,k){
    if(k in t) return t[k];
    return function(){ var h=ok; setTimeout(function(){h&&h({});},10); };
  }});
  window.google.script={run:proxy};
})();
<\/script>`;
  const f = path.join(os.tmpdir(), 'ac-return-' + Math.random().toString(36).slice(2) + '.html');
  fs.writeFileSync(f, html.replace('</head>', stub + '</head>'));
  return f;
}

const leerCaja = () => ({
  visible: getComputedStyle(document.getElementById('stockSuggestBox')).display !== 'none',
  fuera:   document.getElementById('stockSuggestBox').classList.contains('caja-fuera'),
  filas:   [...document.querySelectorAll('#stockSuggestBox [data-action="fuera-pick"]')]
             .map(el => el.innerText.replace(/\s+/g, ' ').trim())
});

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  const p = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  const errores = [];
  p.on('pageerror', e => errores.push(e.message));
  await p.goto('file://' + pagina());
  await p.waitForTimeout(1100);

  console.log('\n═══ 1. La lista aparece AL ENTRAR, sin teclear nada ═══\n');

  /* La categoría se elige a mano y NO se da por buena la primera del
   * desplegable: la app las ordena alfabéticamente, así que «la primera» es
   * DOOR y no WINDOW. Una prueba que supone el orden de una lista mide el
   * orden de la lista, no lo que venía a medir. */
  await p.evaluate(() => {
    openMoveModal('RETURN');
    const s = document.getElementById('mType');
    s.value = 'WINDOW';
    s.dispatchEvent(new Event('change'));
    _fueraOlvidar();
    window.__fueraLlamadas = [];
  });
  await p.waitForTimeout(80);
  await p.focus('#mName');
  await p.waitForTimeout(250);          // la petición del doble tarda 30ms

  let caja = await p.evaluate(leerCaja);
  check('con el campo vacío y en RETURN, la caja está abierta — es el rasgo que ' +
        'pidió Jose: al devolver no se sabe el nombre, así que la lista tiene ' +
        'que salir sin que haya que adivinarlo primero', caja.visible, true);
  check('y es la caja ANCHA, la de "fuera" — misma caja, otra clase', caja.fuera, true);

  check('sólo UNA lectura del archivo, no una por tecla',
    await p.evaluate(() => window.__fueraLlamadas.length), 1);
  check('y pidió la categoría que el formulario tenía elegida',
    await p.evaluate(() => window.__fueraLlamadas[0]), 'WINDOW');

  console.log('\n═══ 2. UNA FILA POR MATERIAL **Y SITIO** ═══\n');

  /* La regla de Jose, donde se ve. Dos filas del mismo material no son un
   * duplicado: son dos sitios, y cada uno tiene su cantidad. */
  check('tres filas de la categoría elegida — la de DOOR no se ofrece',
    caja.filas.length, 3);
  check('el mismo material sale DOS veces, una por sitio',
    caja.filas.filter(t => t.indexOf('VINYL WINDOW 36X48') !== -1).length, 2);
  check('y cada una con SU sitio y SU cantidad, que es lo que se devuelve',
    caja.filas.filter(t => /LEHI HOUSE 12/.test(t) && /\b7\b/.test(t)).length === 1 &&
    caja.filas.filter(t => /OREM DUPLEX/.test(t)   && /\b3\b/.test(t)).length === 1, true);
  check('la cantidad fraccionada se muestra entera, no redondeada — media ' +
        'plancha es media plancha',
    caja.filas.some(t => t.indexOf('2.5') !== -1), true);

  console.log('\n═══ 3. Filtrar al teclear, y callarse cuando no hay nada ═══\n');

  await p.fill('#mName', 'vinyl');
  await p.waitForTimeout(150);
  caja = await p.evaluate(leerCaja);
  check('teclear filtra la lista', caja.filas.length, 2);
  check('sin pedir otra lectura del archivo',
    await p.evaluate(() => window.__fueraLlamadas.length), 1);

  await p.fill('#mName', 'ZZZ NUEVO');
  await p.waitForTimeout(150);
  caja = await p.evaluate(leerCaja);
  /* Devolver algo que nunca se registró saliendo es legítimo: la historia de
   * cualquier bodega empieza a mitad. Un cartel de «no encontré nada» encima de
   * cada letra sería un estorbo permanente justo cuando hay que escribir. */
  check('con algo escrito y sin coincidencias, la caja se quita de en medio en ' +
        'vez de estorbar — se puede escribir un material que nunca salió',
    caja.visible, false);

  console.log('\n═══ 4. Elegir una fila deja el formulario hecho ═══\n');

  await p.fill('#mName', '');
  await p.focus('#mName');
  await p.waitForTimeout(200);
  /* El `mousedown`, no el `click`: es lo que gana la carrera contra el blur del
   * campo, y es como lo pulsa una persona. */
  await p.evaluate(() =>
    document.querySelector('#stockSuggestBox [data-action="fuera-pick"]')
      .dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true })));
  await p.waitForTimeout(200);

  const form = await p.evaluate(() => {
    const v = id => (document.getElementById(id) || {}).value;
    return {
      cat: v('mType'), name: v('mName'), src: v('mSrc'), qty: v('mQty'),
      unit: v('mUnit'), proj: v('mOrigProj'), pm: v('mPM'), resp: v('mResp'),
      dest: v('mDest'),
      foco: (document.activeElement || {}).id,
      caja: getComputedStyle(document.getElementById('stockSuggestBox')).display
    };
  });

  check('el nombre',                       form.name, 'VINYL WINDOW 36X48');
  check('el sitio del que vuelve',         form.src,  'LEHI HOUSE 12');
  check('la cantidad SUGERIDA, como en una salida', form.qty, '7');
  check('la unidad',                       form.unit, 'UNIT');
  check('la obra de la que vuelve',        form.proj, 'LEHI 12');
  check('el jefe de obra',                 form.pm,   'MARIA');
  check('la categoría, por si la lista venía de otra', form.cat, 'WINDOW');

  /* LOS DOS QUE NO SE RELLENAN, y es la parte pensada. «Returned By» cambia de
   * significado con la dirección del movimiento: en la salida es quien lo
   * entregó, en la devolución quien lo trae. Suele ser el mismo, pero «suele»
   * escrito en una casilla que nadie revisa es un nombre inventado en el
   * registro de otra persona. */
  check('«Returned By» se queda VACÍO — el registro sabe quién lo sacó, no ' +
        'quién lo trae de vuelta', form.resp, '');
  check('y el estante de destino también: es lo que Jose dijo que rellena él',
    form.dest, '');
  check('con el foco ya puesto ahí, que es el único campo que falta',
    form.foco, 'mDest');

  /* Rellenar el nombre dispara `input`, y `input` vuelve a entrar en la función
   * que abre la caja. Si se cerrara ANTES del `input`, se reabriría sola. */
  check('y la caja queda cerrada — el `input` del nombre vuelve a entrar en la ' +
        'misma función que la abre', form.caja, 'none');

  console.log('\n═══ 5. La unidad que no existe en el desplegable ═══\n');

  await p.evaluate(() => { document.getElementById('mUnit').value = 'SHEET'; });
  await p.fill('#mName', 'screen');
  await p.waitForTimeout(200);
  await p.evaluate(() =>
    document.querySelector('#stockSuggestBox [data-action="fuera-pick"]')
      .dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true })));
  await p.waitForTimeout(200);
  const unidad = await p.evaluate(() => ({
    u: document.getElementById('mUnit').value,
    q: document.getElementById('mQty').value
  }));
  check('una unidad que no está entre las opciones NO se escribe — asignarla ' +
        'dejaría el desplegable en blanco, y un blanco aquí es el dato perdido ' +
        'sin que nadie se entere', unidad.u, 'SHEET');
  check('y la cantidad fraccionada entra tal cual', unidad.q, '2.5');

  console.log('\n═══ 6. Cambiar de categoría trae otra lista ═══\n');

  await p.evaluate(() => {
    const s = document.getElementById('mType');
    s.value = 'DOOR';
    s.dispatchEvent(new Event('change'));
  });
  await p.fill('#mName', '');
  await p.focus('#mName');
  await p.waitForTimeout(250);
  caja = await p.evaluate(leerCaja);
  check('la lista es la de la categoría nueva', caja.filas.length, 1);
  check('y salió de una lectura nueva, no del saldo de antes',
    await p.evaluate(() => window.__fueraLlamadas), ['WINDOW', 'DOOR']);

  console.log('\n═══ 7. UN cuadro, no dos ═══\n');

  /* Las dos listas que pueden colgar de `#mName` son contrarias: lo que está EN
   * bodega y lo que está FUERA. Con dos cuadros, cada uno con su mostrar y su
   * esconder, hay que acordarse de cerrar el otro — y eso es la falta que
   * llevamos dieciséis veces pagando en este archivo. */
  const cuadros = await p.evaluate(() =>
    [...document.querySelectorAll('#mNameField .inc-suggest-box')].map(b => b.id));
  check('sólo existe UN cuadro de sugerencias bajo el nombre',
    cuadros, ['stockSuggestBox']);

  /* TRANSFER y no EXIT: la salida esconde este campo porque lleva su propia
   * sección de varios materiales, y un campo escondido no se puede enfocar.
   * TRANSFER usa el mismo trío de siempre (categoría / nombre / cantidad), que
   * es donde vive la otra lista. */
  await p.evaluate(() => setModalType('TRANSFER'));
  await p.waitForTimeout(120);
  caja = await p.evaluate(leerCaja);
  check('cambiar de pestaña cierra la caja EN EL ACTO, sin esperar a que ' +
        'alguien escriba — si no, se queda flotando encima del formulario nuevo',
    caja.visible, false);
  check('y se le quita la clase de "fuera" — si se quedara puesta, la lista de ' +
        'bodega saldría con el ancho de la otra', caja.fuera, false);

  console.log('\n═══ 8. Lo que la lista flotante reemplaza ═══\n');

  /* *"...y SOLO COMO LISTA FLOTANTE, NO COMO TARJETAS ABAJO DEL NOMBRE"*. La
   * tarjeta de «material parecido» hace en RETURN el mismo trabajo peor —uno
   * solo, sin decir cuánto hay ni dónde—, así que en esa pantalla se calla.
   *
   * Y SE COMPRUEBA QUE SIGUE EN LAS OTRAS, que es la mitad que convierte esto
   * en una prueba: callar la tarjeta en todas las pantallas también habría
   * pasado el primer control. Va con WASTE y no con ENTRY porque la tarjeta
   * cuelga de `#mName`, y ENTRY y EXIT esconden ese campo —traen su propia
   * sección de varios materiales—; las pantallas donde la tarjeta existe de
   * verdad son TRANSFER, RETURN, WASTE y ADJUST. */
  const tarjeta = await p.evaluate(async () => {
    const mostrada = () => document.getElementById('similarHint').classList.contains('show');
    const esperar  = ms => new Promise(r => setTimeout(r, ms));
    const teclear  = async (tipo) => {
      setModalType(tipo);
      document.getElementById('mType').value = 'WINDOW';
      /* Una palabra MÁS, no una letra cambiada: la tarjeta compara por palabras
       * compartidas y pide el 70%. «36X49» en vez de «36X48» comparte 2 de 3
       * —un 67%— y no habría salido en ninguna pantalla, con lo que la prueba
       * habría pasado por el motivo equivocado. */
      document.getElementById('mName').value = 'VINYL WINDOW 36X48 WHITE';
      triggerSimilarCheck();
      await esperar(900);
      return mostrada();
    };
    return { enReturn: await teclear('RETURN'), enWaste: await teclear('WASTE') };
  });
  check('en RETURN la tarjeta de debajo del nombre no sale', tarjeta.enReturn, false);
  check('y en WASTE sigue saliendo — allí no hay lista de "lo que está fuera" ' +
        'que ofrecer, sólo un error de dedo del que avisar', tarjeta.enWaste, true);

  console.log('\n═══ 9. El jefe de obra, que se guardaba sin verse ═══\n');

  /* `_doSubmit` lee `mPM` SIEMPRE, sin mirar el tipo de movimiento. Estaba
   * escondido en RETURN, así que quien escribía un PM en una entrada y cambiaba
   * a RETURN sin cerrar la ventana guardaba ese nombre sin verlo nunca: el
   * reset sólo corre al ABRIR, no al cambiar de pestaña. */
  const pm = await p.evaluate(() => {
    setModalType('ENTRY');
    document.getElementById('mPM').value = 'ALGUIEN DE OTRA PANTALLA';
    setModalType('RETURN');
    return {
      visible: getComputedStyle(document.getElementById('mPMField')).display !== 'none',
      valor:   document.getElementById('mPM').value
    };
  });
  check('en RETURN el campo de PM se ve — un dato que la app rellena sola ' +
        'tiene que poder verse y corregirse', pm.visible, true);
  check('y lo que venía de otra pantalla ya no viaja escondido: está a la vista',
    pm.valor, 'ALGUIEN DE OTRA PANTALLA');

  check('ningún error de JavaScript en toda la página', errores, []);

  await browser.close();
  if (fails.length){ console.error('\nFALLÓ:\n  ' + fails.join('\n  ')); process.exit(1); }
  console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
})();
