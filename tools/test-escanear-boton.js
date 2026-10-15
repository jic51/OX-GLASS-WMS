// EL BOTÓN DE ESCANEAR, DONDE SE TRABAJA — Y APAGADO DONDE NO SIRVE.
//
// Jose, 15/10: *"sería mucho más útil, práctico y fácil para el usuario que
// utiliza celular si ponemos un botón 'SCAN LABEL' al lado del ENTRY y EXIT,
// así sólo el usuario entra y empieza a trabajar"*.
//
// ── POR QUÉ ESE SITIO Y NO OTRO ────────────────────────────────────────────
//
// Escanear SIEMPRE termina en un Entry o en un Exit. Vivía sólo en el menú de
// la cuenta: dos toques, un objetivo pequeño para un dedo con guante, y los
// dos botones a los que lleva estaban en otra pantalla. Puesto en la misma
// fila que Entry y Exit, el rodeo desaparece.
//
// ── Y LAS DOS MANERAS DE ESTROPEARLO ───────────────────────────────────────
//
// Un botón permanentemente a la vista tiene que poder hacer algo:
//
//   1. SIN CÁMARA. En un escritorio no hay `BarcodeDetector` ni `getUserMedia`,
//      y un botón que sólo sabe decir «aquí no se puede» enseña el producto
//      como roto cada vez que alguien abre la pestaña. El del MENÚ sí se
//      queda siempre —está escondido, no estorba, y explicar por qué no se
//      puede es mejor que no encontrarlo nunca—. Éste no.
//   2. CON ROL DE SOLO LECTURA. A quien tiene prohibido guardar no se le
//      ofrece el atajo a un formulario que no podrá enviar: es un camino que
//      acaba en una puerta cerrada. Es la misma regla que ya esconde Entry y
//      Exit a su lado, y la forma fácil de romperla es meter el botón en esa
//      lista de roles y olvidarse de la cámara — entonces vuelve a aparecer
//      en escritorios donde no sirve.
//
// Las dos condiciones viven juntas en `_escPintarBoton` precisamente para que
// no se puedan contradecir. Esta prueba existe para que sigan juntas.
//
// Uso:  node tools/test-escanear-boton.js [path/to/Index_v3_fixed.html]

const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');

const SRC = process.argv[2] || path.join(__dirname, '..', 'Index_v3_fixed.html');
const html = fs.readFileSync(SRC, 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FALLA ' + label + (extra === undefined ? '' : '  → ' + JSON.stringify(extra))); }
}

const VER = (html.match(/var APP_VERSION = '([\d.]+)'/) || [])[1];
const BUILD = (html.match(/var APP_BUILD = '([^']*)'/) || [])[1] || '';

function stub(rol) {
  return `<script>
window.google=window.google||{}; window.google.charts={load:function(){},setOnLoadCallback:function(f){f&&f()}};
Object.assign(window.google,{script:{run:new Proxy({},{get(t,k){
  return function(){
    if(k==='withSuccessHandler'){ t._ok=arguments[0]; return window.google.script.run; }
    if(k==='withFailureHandler'){ return window.google.script.run; }
    var ok=t._ok;
    if(k==='getInitialData'){ setTimeout(function(){ ok && ok(window.__DATA); },40); return; }
    setTimeout(function(){ ok && ok({}); },20);
  };
}})}});
window.__DATA={ userRole:'${rol}', userEmail:'jose@ox-glass.com', userName:'Jose Castro',
 serverVersion:'${VER}', serverBuild:'${BUILD}', company:{name:'OX Glass LLC.',domain:'ox-glass.com',logo:''},
 movements:[], stock:{}, monitoredMaterials:null,
 config:{ categories:['WINDOW'], projects:[], suppliers:[], locations:[{name:'A1A',group:'RACKS'}], units:['Unit'] },
 incoming:[], rackPhotos:{}, systemActivity:[],
 rolePerms:{canSeeCosts:false,canEditMovements:true,canManageCatalog:true,canExportData:true},
 warehouseRoleLabel:'Warehouse', archiveCutoffMonths:12, oauthClientId:'', oauthRedirectUri:'' };
</script>`;
}

/* La cámara, fingida. El navegador de la suite NO tiene `BarcodeDetector` ni
 * `getUserMedia` ni contexto seguro —está comprobado—, así que el caso «sin
 * cámara» sale solo y es el que corre por defecto. Para el caso «con cámara»
 * hay que ponerlos, y se ponen ANTES de que corra nada de la app. */
const CAMARA = `<script>
window.BarcodeDetector = function(){};
navigator.mediaDevices = navigator.mediaDevices || {};
navigator.mediaDevices.getUserMedia = function(){ return Promise.resolve({}); };
try { Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true }); } catch(e){}
</script>`;

async function mirar(browser, { camara, rol }) {
  const f = path.join(os.tmpdir(), 'acopio-escbtn-' + (camara ? 'cam' : 'nocam') + '-' + rol + '.html');
  fs.writeFileSync(f, html.replace('</head>', (camara ? CAMARA : '') + stub(rol) + '</head>'));
  const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + f);
  await page.waitForTimeout(900);
  const r = await page.evaluate(() => {
    const b = document.getElementById('btnEscanearMov');
    const entry = document.getElementById('btnEntry');
    const menu = document.getElementById('btnEscanear');
    const vis = el => !!(el && getComputedStyle(el).display !== 'none');
    return {
      existe: !!b,
      visible: vis(b),
      entryVisible: vis(entry),
      /* Que esté en la MISMA fila que Entry: el sitio es el punto entero de
       * esta tanda, y «existe en alguna parte» no es lo que se pidió. */
      mismaFila: !!(b && entry && b.parentNode === entry.parentNode),
      /* Y antes que Entry, que es como lo dibujó Jose. */
      antesDeEntry: !!(b && entry &&
        (b.compareDocumentPosition(entry) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0),
      texto: b ? b.textContent.replace(/\s+/g, ' ').trim() : null,
      menuExiste: !!menu,
      puede: typeof _escSePuede === 'function' ? _escSePuede() : null,
      rol: window.userRole
    };
  });
  await page.close();
  return { r, errs };
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });

  console.log('\n═══ 1. CON CÁMARA Y PERMISO DE GUARDAR: ESTÁ, Y DONDE SE TRABAJA ═══\n');
  {
    const { r, errs } = await mirar(browser, { camara: true, rol: 'ADMIN' });
    check('el montaje finge la cámara bien (`_escSePuede` dice que sí)',
      r.puede === 'si', r.puede);
    check('el botón existe', r.existe, r);
    check('...y SE VE', r.visible, r);
    check('...EN LA MISMA FILA que Entry — que es todo el punto: ' +
          'escanear acaba siempre en un Entry o un Exit',
      r.mismaFila, r);
    check('...y antes de Entry, como lo dibujó Jose', r.antesDeEntry, r);
    check('...y dice qué hace, no sólo un icono', /scan/i.test(r.texto || ''), r.texto);
    check('y el del menú de la cuenta SIGUE existiendo: no se movió, se sumó',
      r.menuExiste, r);
    check('ningún error suelto', errs.length === 0, errs.slice(0, 3));
  }

  console.log('\n═══ 2. SIN CÁMARA: NO ESTÁ — un botón muerto enseña el producto roto ═══\n');
  {
    const { r } = await mirar(browser, { camara: false, rol: 'ADMIN' });
    check('el montaje reproduce la falta (`_escSePuede` no dice que sí)',
      r.puede !== 'si', r.puede);
    check('Entry SÍ se ve: el rol no tiene nada que ver aquí', r.entryVisible, r);
    check('EL DE ESCANEAR NO SE VE', !r.visible, r);
    /* Y el del menú se queda. La diferencia no es capricho: uno está a la
     * vista todo el día y el otro hay que ir a buscarlo. */
    check('...pero el del MENÚ sigue ahí, para que se pueda explicar por qué ' +
          'no se puede en vez de no encontrarlo nunca', r.menuExiste, r);
  }

  console.log('\n═══ 3. SOLO LECTURA: TAMPOCO, AUNQUE HAYA CÁMARA ═══\n');
  {
    const { r } = await mirar(browser, { camara: true, rol: 'VIEWER' });
    check('el montaje tiene cámara', r.puede === 'si', r.puede);
    check('...y el rol es de solo lectura', r.rol === 'VIEWER', r.rol);
    check('Entry está escondido, como siempre para este rol', !r.entryVisible, r);
    check('Y EL DE ESCANEAR TAMBIÉN — un atajo a un formulario que no se ' +
          'puede enviar es un camino que acaba en una puerta cerrada',
      !r.visible, r);
  }

  console.log('\n═══ 4. LAS DOS CONDICIONES, EN UN SOLO SITIO ═══\n');
  //
  // La forma fácil de romper esto es meter el botón en la lista de roles de
  // `applyRoleUI` —junto a btnEntry y btnExit— y olvidarse de la cámara: a ese
  // botón le pondrían `display:''` y volvería a aparecer en escritorios donde
  // no sirve. Por eso la lista de roles NO puede nombrarlo.
  {
    const lista = (html.match(/\['btnEntry','btnExit'\][^;]*;/s) || [])[0] || '';
    check('la lista de roles existe y sigue siendo la de Entry y Exit',
      lista.indexOf('btnEntry') >= 0, lista.slice(0, 60));
    check('...y NO nombra al de escanear: si lo hiciera, le daría display ' +
          'por rol y se saltaría la comprobación de la cámara',
      lista.indexOf('btnEscanearMov') < 0, lista.slice(0, 120));
    const fn = (html.match(/function _escPintarBoton\(\)[\s\S]*?\n\}/) || [])[0] || '';
    check('`_escPintarBoton` existe y mira la cámara', /_escSePuede\(\)/.test(fn));
    check('...y el rol, las dos en la misma decisión', /VIEWER/.test(fn), fn.slice(0, 200));
    check('...y `applyRoleUI` la llama, para que un cambio de rol la repinte',
      /applyRoleUI[\s\S]{0,900}_escPintarBoton\(\)/.test(html));
  }

  await browser.close();
  console.log('\n' + (fail ? '✗ ' + fail + ' fallos · ' : '✓ todo bien · ') + (ok + fail) + ' comprobaciones\n');
  process.exit(fail ? 1 : 0);
})();
