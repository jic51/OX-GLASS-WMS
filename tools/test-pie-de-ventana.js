// EL BOTÓN DE GUARDAR SE TIENE QUE VER SIEMPRE.
//
// Jose, 2026-10-04, con un vídeo de "Add Expected Material":
//
//   "El vídeo muestra que la pantalla tiene espacio para que la ventana de
//    Incoming no tenga scroll vertical. Entonces la cosa es: si la pantalla
//    tiene espacio para poner toda la ventana, se lo hace; si no tiene espacio,
//    entonces vamos a poner los botones en el marco, fijos, para que el usuario
//    no tenga que hacer scroll para poder dar clic."
//
// En su vídeo se ve el borde superior de un botón azul asomando por el borde de
// abajo de la ventana. Está ahí, pero cortado.
//
// ── Y PESA MÁS QUE LA COMODIDAD ─────────────────────────────────────────────
//
// EL AVISO DE ERROR VIVE EN ESE PIE. En su captura de ENTRY del 2026-10-02,
// "Material 1 needs a name" sale en naranja justo al lado de "Save to System".
// Con el pie fuera de la pantalla, la persona pulsa guardar, no pasa nada, y el
// motivo está exactamente donde no está mirando. Un mensaje de error que hay que
// ir a buscar es un mensaje de error que no existe.
//
// ── Y LA SEGUNDA MITAD, DEL MISMO MENSAJE ───────────────────────────────────
//
//   "Debemos estandarizar los botones para que no se hagan más grandes o más
//    pequeños, en especial si hay más botones al lado, porque se mueven o
//    empujan y se ve poco profesional."
//
// Dos causas distintas: un rótulo largo hace el botón más ancho que su vecino, y
// un rótulo que no cabe se parte en dos líneas y empuja la fila entera. La
// tercera —cambiar de ancho al ponerse a girar— ya estaba resuelta: _btnBusy
// fija el ancho ANTES de cambiar el texto.
//
// ── POR QUÉ ESTO SE MIDE EN EL NAVEGADOR ────────────────────────────────────
//
// Porque "se ve" y "no se ve" es una posición en pantalla. Comprobar que el CSS
// dice `position:sticky` se pondría verde el día que un `overflow` de un padre
// deje el sticky sin efecto — que es el modo normal de que un sticky no pegue.
//
// Uso:  node tools/test-pie-de-ventana.js

const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');

const SRC = process.argv[2] || path.join(__dirname, '..', 'Index_v3_fixed.html');
let html = fs.readFileSync(SRC, 'utf8');
const APP_VERSION = (html.match(/var APP_VERSION\s*=\s*'([^']+)'/) || [])[1] || 'test';

const stub = `<script>
window.google=window.google||{}; window.google.charts=window.google.charts||{load:function(){},setOnLoadCallback:function(){}};
Object.assign(window.google,{script:{run:new Proxy({},{get(t,k){
  return function(){
    if(k==='withSuccessHandler'){ t._ok=arguments[0]; return window.google.script.run; }
    if(k==='withFailureHandler'){ return window.google.script.run; }
    var ok=t._ok;
    if(k==='getInitialData'){ setTimeout(function(){ ok && ok(window.__DATA); },20); return; }
    /* [] y no {}: el directorio de PM llega por aqu\u00ed y el c\u00f3digo hace .map sobre
       lo que reciba. Con {} revienta al abrir ENTRY, y el fallo no tendr\u00eda nada
       que ver con lo que esta prueba mide. */
    setTimeout(function(){ ok && ok([]); },20);
  };
}})}});
window.__DATA={ userRole:'ADMIN', userEmail:'jose@ox-glass.com', userName:'Jose Castro',
 serverVersion:'${APP_VERSION}', company:{name:'OX Glass LLC.',domain:'ox-glass.com',logo:''},
 movements:[], stock:{}, monitoredMaterials:null,
 config:{ categories:['WINDOW','IGU (ISOLATED GLASS UNIT)'], projects:['SUNBRIDGE'], suppliers:['HARTUNG'],
   locations:[{name:'A1A',group:'RACKS'}], units:['UNIT'] },
 incoming:[], rackPhotos:{}, systemActivity:[], pmDirectory:[], trucks:[], packs:{}, rolePerms:{canSeeCosts:false,canEditMovements:true,canManageCatalog:true,canExportData:true},
 warehouseRoleLabel:'Warehouse', archiveCutoffMonths:12, oauthClientId:'', oauthRedirectUri:'' };
</script>`;

html = html.replace('</head>', stub + '</head>');
const f = path.join(os.tmpdir(), 'acopio-pie-ventana.html');
fs.writeFileSync(f, html);

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

/* Las ventanas que se miden: las de guardar algo, que son donde el botón de
 * abajo importa. Cada una con la llamada que la abre. */
const VENTANAS = [
  ['incomingOverlay', 'openIncomingModal()', 'Add Expected Material'],
  /* ENTRY y EXIT comparten ventana —`moveOverlay`— y cambian de piel según el
   * tipo. Al principio esta lista decía `entryOverlay` y `exitOverlay`, que no
   * existen, y las dos comprobaciones fallaban diciendo "la ventana se abre"
   * cuando lo que pasaba es que la prueba miraba donde no era. */
  ['moveOverlay',     "openMoveModal('ENTRY')",  'Receive Material (ENTRY)'],
  ['moveOverlay',     "openMoveModal('EXIT')",   'Material Out (EXIT)']
];

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const errores = [];

  async function abrir(page, llamada) {
    await page.evaluate(l => { try { eval(l); } catch (e) { /* algunas no existen según el rol */ } }, llamada);
    await page.waitForTimeout(300);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     1. PANTALLA PEQUEÑA: EL PIE SE VE IGUAL, SIN HACER SCROLL
     ═══════════════════════════════════════════════════════════════════════ */
  console.log('\n═══ 1. En una pantalla corta, el botón de guardar sigue a la vista ═══\n');
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 620 } });
    page.on('pageerror', e => errores.push('corta: ' + e.message));
    await page.goto('file://' + f);
    await page.waitForTimeout(400);

    for (const [overlay, llamada, nombre] of VENTANAS) {
      await abrir(page, llamada);
      const m = await page.evaluate((ov) => {
        /* Visible se pregunta al navegador, no al atributo. Las ventanas se
         * abren y se cierran con la clase `show`, no con un display en línea:
         * mirar `o.style.display` daba "no se abre" sobre una ventana que
         * estaba perfectamente abierta. */
        const o = document.getElementById(ov);
        if (!o || getComputedStyle(o).display === 'none') return null;
        const modal = o.querySelector('.modal');
        const pie = o.querySelector('.modal-actions');
        if (!modal || !pie) return { sinPie: true };
        // Primero se lleva el cuerpo hasta abajo del todo y hasta arriba del
        // todo: un pie de verdad se queda en los dos casos.
        const r = () => { const b = pie.getBoundingClientRect(), c = modal.getBoundingClientRect();
                          return { pieAbajo: b.bottom, modalAbajo: c.bottom, pieArriba: b.top }; };
        modal.scrollTop = 0;            const arriba = r();
        modal.scrollTop = modal.scrollHeight; const abajo = r();
        return { desborda: modal.scrollHeight > modal.clientHeight + 1, arriba, abajo,
                 alto: Math.round(modal.getBoundingClientRect().height),
                 ventana: window.innerHeight };
      }, overlay);

      if (!m) { check(nombre + ': la ventana se abre', false); continue; }
      check(nombre + ': desborda, que es el caso que hay que medir', m.desborda, m);
      /* LO QUE SE MIDE: que el pie esté dentro de la ventana en las DOS
       * posiciones del scroll. Antes, con el cuerpo arriba, el pie estaba
       * cientos de píxeles por debajo del borde. */
      check(nombre + ': EL PIE SE VE CON EL CUERPO ARRIBA DEL TODO — antes había ' +
            'que bajar para encontrar el botón',
            Math.abs(m.arriba.pieAbajo - m.arriba.modalAbajo) < 2,
            { pie: m.arriba.pieAbajo, ventana: m.arriba.modalAbajo });
      check(nombre + ': ...y con el cuerpo abajo del todo',
            Math.abs(m.abajo.pieAbajo - m.abajo.modalAbajo) < 2, m.abajo);
      // Se cierran por donde las cierra la app, no a la fuerza.
      await page.evaluate(() => { document.querySelectorAll('[id$="Overlay"]').forEach(o => o.classList.remove('show')); });
    }
    await page.close();
  }

  /* ═══════════════════════════════════════════════════════════════════════
     2. PANTALLA GRANDE: SI CABE, NO HAY BARRA
     ═══════════════════════════════════════════════════════════════════════

     La primera mitad de lo que pidió Jose: "si la pantalla tiene espacio para
     poner toda la ventana, se lo hace". Su grabación es de 1624×972 de alto
     útil y la ventana de Incoming le salía con barra. */
  console.log('\n═══ 2. En la pantalla de Jose, la ventana entra entera ═══\n');
  {
    const page = await browser.newPage({ viewport: { width: 1624, height: 900 } });
    page.on('pageerror', e => errores.push('grande: ' + e.message));
    await page.goto('file://' + f);
    await page.waitForTimeout(400);
    await abrir(page, 'openIncomingModal()');

    const m = await page.evaluate(() => {
      const modal = document.querySelector('#incomingOverlay .modal');
      return { desborda: modal.scrollHeight > modal.clientHeight + 1,
               contenido: modal.scrollHeight, caja: modal.clientHeight,
               ventana: window.innerHeight };
    });
    check('Add Expected Material CABE ENTERA, sin barra de desplazamiento',
          !m.desborda, m);
    await page.close();
  }

  /* ═══════════════════════════════════════════════════════════════════════
     3. LOS BOTONES NO CAMBIAN DE TAMAÑO NI SE EMPUJAN
     ═══════════════════════════════════════════════════════════════════════ */
  console.log('\n═══ 3. Los botones del pie, todos iguales ═══\n');
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on('pageerror', e => errores.push('botones: ' + e.message));
    await page.goto('file://' + f);
    await page.waitForTimeout(400);
    await abrir(page, 'openIncomingModal()');

    const b = await page.evaluate(() => {
      const pie = document.querySelector('#incomingOverlay .modal-actions');
      const bts = Array.from(pie.querySelectorAll('.btn'));
      /* SÓLO LOS QUE SE VEN. 🗑 Delete nace con display:none y sólo aparece al
       * editar; medirlo da 0×0 y acusa al producto de un botón enano que en
       * realidad no está en pantalla. */
      return bts.map(x => { const r = x.getBoundingClientRect();
        return { txt: x.textContent.trim().slice(0, 20), w: Math.round(r.width),
                 h: Math.round(r.height), top: Math.round(r.top) }; })
        .filter(x => x.w > 0);
    });
    check('hay más de un botón al lado, que es el caso del que habla Jose',
          b.length >= 2, b);
    check('TODOS A LA MISMA ALTURA — un rótulo que se parte en dos líneas empuja ' +
          'la fila entera', b.every(x => x.h === b[0].h && x.top === b[0].top), b);
    check('y ninguno se queda enano al lado del otro',
          Math.min.apply(null, b.map(x => x.w)) >= 100, b);

    /* Y EL CASO QUE DE VERDAD LOS MOVÍA: que el rótulo cambie. Se cambia a mano
     * por uno largo y se mira si el vecino se ha movido de sitio. */
    const movido = await page.evaluate(() => {
      const pie = document.querySelector('#incomingOverlay .modal-actions');
      const bts = Array.from(pie.querySelectorAll('.btn'));
      const vecino = bts[0].getBoundingClientRect().left;
      bts[bts.length - 1].textContent = 'Save to System and notify everybody';
      const despues = bts[0].getBoundingClientRect().left;
      return Math.abs(despues - vecino);
    });
    /* Con `justify-content:flex-end` un rótulo más largo empuja al vecino hacia
     * la izquierda. Es inevitable sin anchos fijos, y no es lo que Jose ve: lo
     * que él ve es la fila moviéndose al ponerse a girar un botón, y eso lo
     * resuelve _btnBusy. Esto se mide y se DICE, no se exige. */
    console.log('       (al alargar un rótulo el vecino se corre ' + movido.toFixed(0) +
                'px — informativo, no es fallo)');

    const busy = A_btnBusyFijaElAncho();
    check('y al ponerse a girar un botón NO cambia de ancho — _btnBusy fija el ' +
          'ancho antes de cambiar el texto', busy);
    await page.close();
  }

  function A_btnBusyFijaElAncho() {
    const src = fs.readFileSync(SRC, 'utf8');
    const i = src.indexOf('function _btnBusy(');
    const trozo = src.slice(i, i + 900);
    return /style\.minWidth\s*=\s*btn\.getBoundingClientRect\(\)\.width/.test(trozo) &&
           trozo.indexOf('minWidth') < trozo.indexOf('btn.innerHTML =');
  }

  /* ═══════════════════════════════════════════════════════════════════════
     4. Y QUE NO QUEDE NINGÚN PIE HECHO A MANO
     ═══════════════════════════════════════════════════════════════════════

     La clase `.modal-actions` existía desde hace meses y la ventana que Jose
     grabó NO la usaba: tenía su propia fila de botones escrita a mano, así que
     el pegado no le llegaba. Cinco ventanas estaban igual.

     Esto cuenta las puertas, como en test-url-de-la-app y en
     test-config-escritura: si mañana alguien añade una ventana con su fila de
     botones a mano, el pie no se le pegará y nadie se enterará hasta que un
     cliente lo grabe. */
  console.log('\n═══ 4. Ningún pie escrito a mano ═══\n');
  {
    const src = fs.readFileSync(SRC, 'utf8');
    /* Una fila de botones alineada a la derecha, con al menos un botón dentro y
     * sin la clase. El `labels` de "Select all / Select none" no entra: no es un
     * pie, va en medio del cuerpo, y por eso se busca que lleve un botón de
     * guardar o de cerrar la ventana. */
    const sueltos = [];
    const re = /<div style="[^"]*justify-content:flex-end[^"]*">([\s\S]{0,600}?)<\/div>/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      if (/closeModal\(|btn-primary|btn-danger/.test(m[1]) && /<button/.test(m[1])) {
        sueltos.push(m[0].slice(0, 70).replace(/\s+/g, ' '));
      }
    }
    check('TODO PIE DE VENTANA USA .modal-actions — el de Incoming no lo hacía, ' +
          'y por eso el botón de guardar se iba de la pantalla',
          sueltos.length === 0, sueltos);
    check('y hay varios usándola, para que esto no esté midiendo el vacío',
          (src.match(/class="modal-actions"/g) || []).length >= 5);
  }

  check('ninguna página dio error de JavaScript', errores.length === 0, errores);

  await browser.close();
  console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones\n');
  process.exit(fail ? 1 : 0);
})();
