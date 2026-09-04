// EL HEADER SE QUEDA ARRIBA — EN TODOS LOS ANCHOS.
//
// Jose lo fotografió (v11.44): en su computadora el header se iba con el
// scroll. En el teléfono no. El CSS decía, y sigue diciendo, lo correcto:
//
//     .topbar{ … position:sticky;top:0;z-index:100; … }
//
// Pero cien líneas más arriba, dentro del @media de 769px, había esto:
//
//     .topbar.merged{position:relative; …}
//
// `.topbar.merged` es más específico que `.topbar`, así que ganaba, y el
// header dejaba de estar anclado exactamente en los anchos donde la clase
// `merged` se aplica — de 769px para arriba. De ahí que el teléfono estuviera
// bien y la computadora no.
//
// POR QUÉ NINGUNA LECTURA LO IBA A ENCONTRAR: las dos reglas, leídas por
// separado, están bien escritas. `position:sticky` es correcto. `position:
// relative` también es correcto, y estaba puesto por un motivo real (ser ancla
// del `position:absolute` de .topbar-row1). El fallo no está en ninguna de las
// dos, sino en cuál gana — y eso no se lee en el archivo, se mide en el
// navegador. Es la misma clase de fallo que la comparación contra 'received':
// código que se lee perfectamente bien y que no hace lo que dice.
//
// Por eso esta prueba HACE SCROLL de verdad, en vez de comprobar que la
// palabra "sticky" aparece en el archivo. Esa comprobación habría pasado
// durante todo el tiempo que el header estuvo roto.
//
// Uso:  node tools/test-topbar-sticky.js [path/to/Index_v3_fixed.html]

const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');

const SRC = process.argv[2] || path.join(__dirname, '..', 'Index_v3_fixed.html');
let html = fs.readFileSync(SRC, 'utf8');

const stub = `<script>
window.google=window.google||{}; window.google.charts=window.google.charts||{load:function(){},setOnLoadCallback:function(){}};
Object.assign(window.google,{script:{run:new Proxy({},{get(t,k){
  return function(){
    if(k==='withSuccessHandler'){ t._ok=arguments[0]; return window.google.script.run; }
    if(k==='withFailureHandler'){ return window.google.script.run; }
    var ok=t._ok;
    if(k==='getInitialData'){ setTimeout(function(){ ok && ok(window.__DATA); },20); return; }
    setTimeout(function(){ ok && ok({}); },20);
  };
}})}});
window.__DATA={ userRole:'ADMIN', userEmail:'jose@ox-glass.com', userName:'Jose Castro',
 serverVersion:'11.44', company:{name:'PRODUCTION OX GLASS',domain:'ox-glass.com',logo:''},
 movements:[], stock:{}, monitoredMaterials:null,
 config:{ categories:[], projects:[], suppliers:[], locations:[], units:[] },
 incoming:[], rackPhotos:{}, systemActivity:[], rolePerms:{canSeeCosts:false,canEditMovements:false,canManageCatalog:false,canExportData:true},
 warehouseRoleLabel:'Warehouse', archiveCutoffMonths:12, oauthClientId:'', oauthRedirectUri:'' };
</script>`;
html = html.replace('</head>', stub + '</head>');
const f = path.join(os.tmpdir(), 'acopio-topbar-sticky.html');
fs.writeFileSync(f, html);

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const pageErrors = [];

  // 1440 y 1024 son los dos anchos donde `merged` se aplica — donde estaba el
  // fallo. 768 y 375 son los que ya funcionaban, y se comprueban para que el
  // arreglo no los rompa al pasar.
  for (const w of [1440, 1024, 768, 375]) {
    console.log('\nAncho: ' + w + 'px');
    const page = await browser.newPage({ viewport: { width: w, height: 500 } });
    page.on('pageerror', e => pageErrors.push(w + ': ' + e.message));
    await page.goto('file://' + f);
    await page.waitForTimeout(400);

    // La página de prueba no trae movimientos, así que no es lo bastante alta
    // para hacer scroll. Se le añade alto de verdad — no se falsea el scroll
    // con scrollTo sobre un documento corto, que no probaría nada.
    await page.evaluate(() => {
      const c = document.querySelector('.container');
      const filler = document.createElement('div');
      filler.style.height = '3000px';
      c.appendChild(filler);
    });
    await page.waitForTimeout(50);

    const antes = await page.evaluate(() => {
      const r = document.querySelector('.topbar').getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, merged: document.querySelector('.topbar').classList.contains('merged'),
               pos: getComputedStyle(document.querySelector('.topbar')).position,
               scrollable: document.documentElement.scrollHeight > window.innerHeight };
    });
    console.log('  (position calculado: ' + antes.pos + ', clase merged: ' + antes.merged + ')');

    check('la página tiene alto para hacer scroll — si no, esta prueba no ' +
          'estaría midiendo nada', antes.scrollable);
    check('en reposo el header está pegado arriba', Math.abs(antes.top) < 1);

    // El scroll de verdad.
    await page.evaluate(() => window.scrollTo(0, 900));
    await page.waitForTimeout(120);

    const despues = await page.evaluate(() => {
      const r = document.querySelector('.topbar').getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, y: window.scrollY,
               pos: getComputedStyle(document.querySelector('.topbar')).position };
    });

    check('el scroll ocurrió de verdad (scrollY = ' + despues.y + ')', despues.y > 500);
    check('DESPUÉS DE 900px DE SCROLL EL HEADER SIGUE EN LO ALTO DE LA ' +
          'PANTALLA (top = ' + despues.top.toFixed(1) + 'px) — con el ' +
          '`position:relative` de .topbar.merged estaría en ' +
          (-despues.y) + 'px, o sea fuera de la vista',
      Math.abs(despues.top) < 1);
    check('y sigue calculando `sticky`, no `relative` (' + despues.pos + ')',
      despues.pos === 'sticky');

    // Lo que el `relative` estaba sosteniendo: row1 fuera de flujo. Si el
    // cambio hubiera roto su anclaje, el bloque de la marca se habría ido a
    // colgar del documento entero en vez del header.
    if (antes.merged) {
      const marca = await page.evaluate(() => {
        const r1 = document.querySelector('.topbar-row1').getBoundingClientRect();
        const tb = document.querySelector('.topbar').getBoundingClientRect();
        return { dentro: r1.top >= tb.top - 1 && r1.bottom <= tb.bottom + 1,
                 pos: getComputedStyle(document.querySelector('.topbar-row1')).position };
      });
      check('la marca sigue fuera de flujo (' + marca.pos + ') — `sticky` ' +
            'también sirve de ancla para elementos absolutos, que era lo ' +
            'único que el `relative` hacía falta que hiciera',
        marca.pos === 'absolute');
      check('...y sigue colgando del header, no del documento: se quedó ' +
            'dentro de la barra después del scroll', marca.dentro);
    }

    // Y que no se le haya quedado detrás de nada.
    const zi = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.topbar')).zIndex);
    check('conserva el z-index heredado de .topbar (' + zi + ') — un header ' +
          'anclado que se dibuja por debajo del contenido es peor que uno ' +
          'que se va', zi === '100');

    await page.close();
  }

  console.log('');
  check('sin errores de página en ningún ancho', pageErrors.length === 0);
  if (pageErrors.length) pageErrors.forEach(e => console.log('  PAGE ERROR:', e));

  await browser.close();

  console.log('\n' + '─'.repeat(72));
  console.log('El header estaba declarado sticky y no lo era, porque una regla');
  console.log('más específica dentro de un @media le ponía position:relative.');
  console.log('Las dos reglas se leen bien por separado. Sólo haciendo scroll');
  console.log('se ve cuál gana.');
  console.log('─'.repeat(72));

  console.log('\ntopbar sticky: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
  process.exit(fail === 0 ? 0 : 1);
})();
