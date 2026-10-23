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
  /* LA OBRA YA NO SE RELLENA APARTE — v12.95, y es lo correcto.
   *
   * Había dos recuadros preguntando lo mismo: «From (site or address)» y
   * «Came back from (project)». Jose: *"esas son la misma pregunta que espera
   * dos datos diferentes"*, y en su captura los dos llevaban el mismo texto.
   *
   * Ahora se contesta UNA vez, en el sitio de arriba, y la obra se deduce al
   * guardar. Rellenar dos campos desde una sola fila era crear dos verdades que
   * podían separarse en cuanto alguien tocara una. */
  check('la obra YA NO se rellena en un segundo campo: era la misma pregunta ' +
        'dos veces, y ahora se deduce de la de arriba',
    form.proj, '');
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

  console.log('\n═══ 10. Devolver MÁS de lo que salió ═══\n');

  /* Jose, 21/10, eligiendo entre cuatro salidas: *"avisar y dejar pasar, y
   * anotarlo"*. Las dos mitades de su regla se miden aquí, y la que calla
   * importa tanto como la que avisa: un almacén que empieza a usar Acopio tiene
   * material fuera que salió ANTES, y avisar de cada una de esas devoluciones es
   * avisar de lo normal — que es cómo se aprende a cerrar un aviso sin leerlo.
   *
   * Se mide la función de la decisión y no el diálogo: lo que puede estar mal
   * aquí es la cuenta y los casos en que se calla, no el dibujo del cuadro. */
  const sobra = await p.evaluate(async () => {
    setModalType('RETURN');
    const s = document.getElementById('mType');
    s.value = 'WINDOW';
    s.dispatchEvent(new Event('change'));
    _fueraOlvidar();
    /* SE LLAMA A LA PUERTA DE CARGA DIRECTAMENTE y no se simula el foco: en esta
     * altura del recorrido la ventana puede estar cerrada, y `.focus()` sobre un
     * campo escondido no dispara nada — tres comprobaciones se quedaron en null
     * por eso. Que el foco abra la lista ya lo mide la sección 1; el sujeto de
     * aquí es la CUENTA, no el cableado. */
    _checkStockSuggest(document.getElementById('mName'));
    await new Promise(r => setTimeout(r, 250));      // que cargue el saldo
    const f = (nombre, sitio, qty) => _fueraSobrante('WINDOW', nombre, sitio, qty);
    return {
      /* EL SALDO, PARA PODER CREER A LOS `null` DE ABAJO. Media sección
       * comprueba que la función se CALLA, y un `null` por «no cargó» es
       * indistinguible de un `null` por «no hay nada que decir»: sin esto, la
       * primera vez que el andamio de la prueba se rompiera, tres
       * comprobaciones seguirían en verde midiendo nada. Ya pasó en este mismo
       * archivo. */
      cargado: (_fueraCache.filas || []).length,
      // 7 están fuera en LEHI HOUSE 12
      justo:   f('VINYL WINDOW 36X48', 'LEHI HOUSE 12', 7),
      pasa:    f('VINYL WINDOW 36X48', 'LEHI HOUSE 12', 10),
      menos:   f('VINYL WINDOW 36X48', 'LEHI HOUSE 12', 3),
      // mismo material, OTRO sitio: allí sólo hay 3
      otroSit: f('VINYL WINDOW 36X48', 'OREM DUPLEX', 5),
      // un material que nunca salió de aquí
      nuevo:   f('MATERIAL QUE NUNCA SALIO', 'LEHI HOUSE 12', 99),
      // sin sitio escrito no hay con qué comparar
      sinSit:  f('VINYL WINDOW 36X48', '', 99),
      // y el caché de OTRA categoría no sirve para afirmar nada
      otraCat: _fueraSobrante('DOOR', 'VINYL WINDOW 36X48', 'LEHI HOUSE 12', 99)
    };
  });

  check('el saldo se cargó, así que los `null` de abajo significan «no hay nada ' +
        'que decir» y no «no se pudo mirar»', sobra.cargado, 3);
  check('devolver exactamente lo que salió no avisa', sobra.justo, null);
  check('devolver menos tampoco', sobra.menos, null);
  check('pasarse SÍ avisa, y dice cuánto sobra',
    sobra.pasa && sobra.pasa.extra, 3);
  check('...con el saldo de ESE sitio, no el del material',
    sobra.pasa && sobra.pasa.fuera, 7);
  check('el mismo material en otro sitio se mide contra el saldo de ese otro ' +
        'sitio — es la regla de Jose: importa cuánto hay en ESE LUGAR',
    sobra.otroSit && sobra.otroSit.extra, 2);

  /* LA MITAD QUE CALLA, y es la que convierte esto en algo que se puede usar. */
  check('un material SIN NINGUNA salida registrada no avisa, por mucho que se ' +
        'devuelva — la historia de una bodega empieza a mitad y eso es una ' +
        'devolución legítima de la que ningún registro puede saber',
    sobra.nuevo, null);
  check('sin sitio escrito no hay nada con lo que comparar, así que se calla',
    sobra.sinSit, null);
  check('y con el saldo de OTRA categoría se calla también — inventar un aviso ' +
        'con un dato que no es de este material sería peor que no avisar',
    sobra.otraCat, null);

  console.log('\n═══ 11. UNA lista, no dos ═══\n');

  /* Jose, 22/10, con una captura: *"¿por qué se muestran 2 listas? Eso lo veo
   * SIEMPRE en la app"*. Las dos eran reales y una no es nuestra: `#mName`
   * lleva `list="matList"`, y eso hace que el NAVEGADOR dibuje su propio
   * desplegable encima, con los mismos nombres y sin nada de lo que la nuestra
   * añade — cuánto hay fuera y en qué sitio. */
  const listas = await p.evaluate(async () => {
    setModalType('RETURN');
    const s = document.getElementById('mType');
    s.value = 'WINDOW'; s.dispatchEvent(new Event('change'));
    _fueraOlvidar();
    const inp = document.getElementById('mName');
    inp.value = '';
    _checkStockSuggest(inp);
    await new Promise(r => setTimeout(r, 250));
    return {
      nuestra: getComputedStyle(document.getElementById('stockSuggestBox')).display !== 'none',
      delNavegador: inp.getAttribute('list'),
      guardada: inp.dataset.listaOrig || null
    };
  });
  check('nuestra lista está puesta', listas.nuestra, true);
  check('y la del navegador está apagada — manda la nuestra, que es la que dice ' +
        'cuánto hay fuera y dónde', listas.delNavegador, null);
  check('...pero su nombre queda guardado, no tirado: en las pantallas donde no ' +
        'ofrecemos nada esa lista es la única ayuda que hay',
    !!listas.guardada, true);

  const devuelta = await p.evaluate(() => {
    const inp = document.getElementById('mName');
    setModalType('WASTE');                      // una pantalla sin lista nuestra
    return inp.getAttribute('list');
  });
  check('al irse de RETURN se le devuelve al campo su lista del navegador',
    devuelta, 'matList');

  console.log('\n═══ 12. Filtrar mientras se escribe, no al parar ═══\n');

  /* Jose, 22/10, con un vídeo: *"al escribir en la caja de búsqueda no se
   * actualiza enseguida el texto de abajo"*. Eran cuatro cajas con
   * `_debounce(…, 220)`, y un debounce **sólo dispara cuando dejas de
   * escribir**: tecleando seguido no pasaba nada en todo ese rato. */
  const filtrando = await p.evaluate(async () => {
    let veces = 0;
    const f = _filtrarAlEscribir(function(){ veces++; }, 90);
    f();                                  // la primera tecla
    const alaPrimera = veces;
    for (let i = 0; i < 25; i++) { f(); await new Promise(r => setTimeout(r, 12)); }
    const tecleando = veces;
    await new Promise(r => setTimeout(r, 200));
    return { alaPrimera: alaPrimera, tecleando: tecleando, final: veces };
  });
  check('dispara A LA PRIMERA tecla — un debounce no lo hacía, y por eso se veía ' +
        'el desfase', filtrando.alaPrimera, 1);
  check('y sigue disparando MIENTRAS se escribe, sin esperar a que pares ' +
        '(' + filtrando.tecleando + ' veces en 300ms de tecleo seguido)',
    filtrando.tecleando > 1, true);
  check('...pero acotado: no una por tecla', filtrando.tecleando < 25, true);
  check('y la última siempre se hace, para no quedarse mostrando la penúltima letra',
    filtrando.final >= filtrando.tecleando, true);

  console.log('\n═══ 13. Las gráficas no se bajan hasta que hacen falta ═══\n');

  /* Jose, 22/10, con la consola abierta en 3G: 2,0 MB de recursos y 27 s. La
   * mayor parte eran los módulos de gráficas de gstatic.com — y los pagaba todo
   * el mundo en cada carga, para dos tartas que sólo existen en una de las
   * cinco pantallas. */
  /* SE MIRA EL ARCHIVO, no el DOM: en esta página el panel ya dibujó, así que
   * la librería SÍ está puesta — y eso es lo correcto. Lo que no puede estar es
   * en el HTML que se sirve, porque eso la bajaría antes de saber si hace falta.
   * Que no se pida al arrancar se mide en `test-avisos-que-se-apilan`, cuya
   * página abre sin existencias y por tanto sin nada que dibujar. */
  const cabecera = html.slice(0, html.indexOf('</head>'));
  check('la librería de gráficas NO viene en la cabecera del archivo — ahí la ' +
        'bajaría todo el mundo en cada carga, para dos tartas que sólo existen ' +
        'en una de las cinco pantallas',
    /<script[^>]+gstatic\.com\/charts/.test(cabecera), false);

  const charts = await p.evaluate(() => {
    const cuantos = () => [...document.querySelectorAll('script[src]')]
      .filter(x => /gstatic\.com\/charts/.test(x.src)).length;
    const antes = cuantos();
    _cargarCharts(); _cargarCharts(); _cargarCharts();
    return { hayCargador: typeof _cargarCharts === 'function',
             antes: antes, despues: cuantos() };
  });
  check('hay quien sepa pedirla cuando haga falta', charts.hayCargador, true);
  check('y pedirla tres veces no la baja tres veces — el panel se repinta en ' +
        'cada recarga de datos, así que esto pasa de verdad',
    charts.despues, charts.antes);

  console.log('\n═══ 14. No preguntar lo que el registro ya contesta ═══\n');

  /* Jose, 22/10: *"si el material salió y está regresando, ¿por qué me pregunta
   * 2 veces de dónde vino?... no debe preguntar a menos que el material esté en
   * 2 o más lugares diferentes; entonces debe darte la lista de esos 2 lugares
   * para que elijas. Si sólo un material salió a un solo lugar, ¿por qué
   * pregunta si ya tiene ese dato?"*.
   *
   * Son TRES casos y hasta ahora se trataban todos igual, como dos cajas
   * vacías. El de arriba —SCREEN FRAME, fuera sólo en LEHI HOUSE 12— es el
   * primero. */
  const unoSolo = await p.evaluate(async () => {
    openMoveModal('RETURN');
    const s = document.getElementById('mType');
    s.value = 'WINDOW'; s.dispatchEvent(new Event('change'));
    _fueraOlvidar();
    const inp = document.getElementById('mName');
    _checkStockSuggest(inp);
    await new Promise(r => setTimeout(r, 250));
    inp.value = 'SCREEN FRAME';
    inp.dispatchEvent(new Event('change'));
    const v = id => (document.getElementById(id) || {}).value;
    return { src: v('mSrc'), proj: v('mOrigProj'), qty: v('mQty'),
             caja: getComputedStyle(document.getElementById('stockSuggestBox')).display };
  });
  check('fuera en UN solo sitio: el sitio se rellena solo — preguntarlo es ' +
        'pedir que teclees un dato que la app tiene delante', unoSolo.src, 'LEHI HOUSE 12');
  check('...y la cantidad se sugiere', unoSolo.qty, '2.5');
  check('...y no se abre ninguna lista, porque no hay nada que elegir',
    unoSolo.caja, 'none');

  const dosSitios = await p.evaluate(async () => {
    openMoveModal('RETURN');
    const s = document.getElementById('mType');
    s.value = 'WINDOW'; s.dispatchEvent(new Event('change'));
    _fueraOlvidar();
    const inp = document.getElementById('mName');
    _checkStockSuggest(inp);
    await new Promise(r => setTimeout(r, 250));
    inp.value = 'VINYL WINDOW 36X48';          // está en LEHI y en OREM
    inp.dispatchEvent(new Event('change'));
    return {
      src: (document.getElementById('mSrc') || {}).value,
      caja: getComputedStyle(document.getElementById('stockSuggestBox')).display,
      filas: document.querySelectorAll('#stockSuggestBox [data-action="fuera-pick"]').length
    };
  });
  check('fuera en DOS sitios: NO se elige por ti — ahí sí hay una pregunta de ' +
        'verdad, y es cuál de los dos', dosSitios.src, '');
  check('...y se abre la lista con esos sitios', dosSitios.caja !== 'none', true);
  check('...con las dos filas y sólo ésas', dosSitios.filas, 2);

  const sinRegistro = await p.evaluate(async () => {
    openMoveModal('RETURN');
    const s = document.getElementById('mType');
    s.value = 'WINDOW'; s.dispatchEvent(new Event('change'));
    _fueraOlvidar();
    const inp = document.getElementById('mName');
    _checkStockSuggest(inp);
    await new Promise(r => setTimeout(r, 250));
    inp.value = 'MATERIAL QUE NUNCA SALIO';
    inp.dispatchEvent(new Event('change'));
    return { src: (document.getElementById('mSrc') || {}).value,
             proj: (document.getElementById('mOrigProj') || {}).value };
  });
  check('sin ningún registro de haber salido, las cajas se quedan VACÍAS para ' +
        'contestarlas — es lo único que no se puede deducir',
    sinRegistro.src === '' && sinRegistro.proj === '', true);

  /* Y LO QUE NUNCA SE PISA: si alguien ya escribió algo, manda él. */
  const escrito = await p.evaluate(async () => {
    openMoveModal('RETURN');
    const s = document.getElementById('mType');
    s.value = 'WINDOW'; s.dispatchEvent(new Event('change'));
    _fueraOlvidar();
    const inp = document.getElementById('mName');
    _checkStockSuggest(inp);
    await new Promise(r => setTimeout(r, 250));
    document.getElementById('mSrc').value = 'DONDE YO DIGO';
    inp.value = 'SCREEN FRAME';
    inp.dispatchEvent(new Event('change'));
    return (document.getElementById('mSrc') || {}).value;
  });
  check('y lo que una persona ya escribió NO se pisa con el historial',
    escrito, 'DONDE YO DIGO');

  console.log('\n═══ 15. El aviso de Pro dura lo que Jose midió ═══\n');

  /* Jose, 22/10, con un cronómetro: *"el toast demora 14 segundos... si dura 7
   * es suficiente, y si se hace hover sí se puede quedar, y al quitar el hover
   * dejémoslo unos 2 o 3 segundos más"*.
   *
   * Los 14 segundos eran un fallo mío de la v12.85: al reusar el aviso, cada
   * llamada dejaba SU PROPIO reloj y SUS PROPIOS oyentes sobre el mismo
   * elemento. Escribí que daba igual «porque los dos hacen lo mismo sobre el
   * reloj de esta llamada». Era falso: cada cierre tiene el suyo. */
  const reloj = await p.evaluate(() => ({
    dura: typeof PRO_TOAST_MS !== 'undefined' ? PRO_TOAST_MS : null,
    trasHover: typeof PRO_TOAST_IRSE !== 'undefined' ? PRO_TOAST_IRSE : null
  }));
  check('dura 7 segundos, no 9 ni 14', reloj.dura, 7000);
  check('y al quitarle el ratón de encima le quedan 2,5', reloj.trasHover, 2500);

  const oyentes = await p.evaluate(async () => {
    _proToastIrse();
    const cont = document.getElementById('toastContainer');
    _proToast('fotos'); _proToast('etiquetas'); _proToast('escanear');
    const el = cont.querySelector('.toast');
    /* El ratón encima y fuera UNA vez. Con los oyentes acumulados había tres
     * cuentas atrás corriendo a destiempo sobre un solo aviso. */
    el.dispatchEvent(new MouseEvent('mouseenter'));
    el.dispatchEvent(new MouseEvent('mouseleave'));
    await new Promise(r => setTimeout(r, 1200));
    return { sigue: !!cont.querySelector('.toast'), cuantos: cont.querySelectorAll('.toast').length };
  });
  check('tres clics seguidos siguen siendo UN aviso', oyentes.cuantos, 1);
  check('...y a los 1,2 s de quitarle el ratón sigue ahí — con los relojes ' +
        'acumulados, el de una llamada vieja se lo llevaba a destiempo',
    oyentes.sigue, true);

  check('ningún error de JavaScript en toda la página', errores, []);

  await browser.close();
  if (fails.length){ console.error('\nFALLÓ:\n  ' + fails.join('\n  ')); process.exit(1); }
  console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
})();
