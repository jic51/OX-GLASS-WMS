// Que la burbuja de un tooltip quepa SIEMPRE, mirando dónde acaba de verdad.
//
// Jose lo reportó dos veces, y la segunda enseñó que la primera se había
// arreglado a medias:
//
//   v11.x — un icono cerca del borde de la ventana centraba su burbuja en sí
//   mismo y la mitad quedaba fuera de la pantalla. Se arregló con dos clases,
//   .tip-edge-l y .tip-edge-r, que anclaban la burbuja al borde del ICONO.
//
//   v11.38 — Jose fotografió los tooltips de Ajustes cortados a media frase y
//   dibujados a través del texto de debajo. Ninguna clase podía arreglarlo: la
//   burbuja era `position:absolute` y el panel de ajustes tiene overflow-y:auto,
//   así que la recortaba su contenedor. Recortar no es apilar, y ningún z-index
//   lo habría salvado.
//
// Ahora es `position:fixed` con coordenadas que escribe _positionTip, lo que la
// saca de todo overflow de la página y permite además voltearla arriba cuando
// no cabe debajo.
//
// POR ESO ESTA PRUEBA CAMBIÓ DE PREGUNTA. Antes comprobaba que se pusiera la
// clase correcta, que es un sustituto de lo que importa. Ahora mide la caja: el
// rectángulo real de la burbuja contra la ventana y contra el panel que la
// recortaba. Una clase puede estar bien puesta y la burbuja seguir cortada —
// que es exactamente lo que pasó.
//
// Usage:  node tools/test-tooltip-edge.js [path/to/Index_v3_fixed.html]

const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');

const SRC = process.argv[2] || path.join(__dirname, '..', 'Index_v3_fixed.html');
let html = fs.readFileSync(SRC, 'utf8');

// Minimal google.script.run stub so the app's normal boot path doesn't throw
// while loading — this test only needs the shared .tip CSS and the delegated
// mouseenter/focusin listener, both installed unconditionally at script-load
// time, not any real data.
const stub = `<script>
window.google=window.google||{}; window.google.charts=window.google.charts||{load:function(){},setOnLoadCallback:function(){}};
Object.assign(window.google,{script:{run:new Proxy({},{get(t,k){
  return function(){
    if(k==='withSuccessHandler'){ t._ok=arguments[0]; return window.google.script.run; }
    if(k==='withFailureHandler'){ return window.google.script.run; }
    var ok=t._ok;
    if(k==='getInitialData'){ setTimeout(function(){ ok && ok({accessStatus:'NO_SESSION', userEmail:'', userRole:'NO_SESSION', serverVersion:'test', company:{}, oauthClientId:'', oauthRedirectUri:''}); },20); return; }
    setTimeout(function(){ ok && ok({}); },20);
  };
}})}});
window.addEventListener('DOMContentLoaded', function(){
  var probe = document.createElement('div');
  probe.id = 'probe';
  probe.style.cssText = 'position:fixed;top:20px;left:0;width:1000px;z-index:99999';
  probe.innerHTML =
    '<span class="info-ic tip" id="iconLeft"  style="position:absolute;left:4px"   data-tip="Left edge icon tooltip text">i</span>' +
    '<span class="info-ic tip" id="iconMid"   style="position:absolute;left:500px" data-tip="Middle icon tooltip text">i</span>' +
    '<span class="info-ic tip" id="iconRight" style="position:absolute;left:990px" data-tip="Right edge icon tooltip text">i</span>';
  document.body.appendChild(probe);
});
</script>`;
html = html.replace('</head>', stub + '</head>');
const f = path.join(os.tmpdir(), 'acopio-tooltip-edge.html');
fs.writeFileSync(f, html);

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

async function classesOf(page, id) {
  return page.evaluate((id) => document.getElementById(id).className, id);
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1000, height: 400 } });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  await page.goto('file://' + f);
  await page.waitForTimeout(300);

  // El rectángulo que el navegador dibuja de verdad para el ::after. Es la
  // única forma de saber dónde acabó: un pseudo-elemento no está en el DOM.
  async function bubble(id){
    return page.evaluate((id) => {
      const el = document.getElementById(id);
      const cs = getComputedStyle(el, '::after');
      const w = parseFloat(cs.width), h = parseFloat(cs.height);
      const x = parseFloat(el.style.getPropertyValue('--tip-x'));
      const y = parseFloat(el.style.getPropertyValue('--tip-y'));
      const arriba = el.classList.contains('tip-above');
      return {
        left: x - w / 2, right: x + w / 2,
        top:  arriba ? (y - h) : y,
        bottom: arriba ? y : (y + h),
        arriba: arriba, fija: cs.position
      };
    }, id);
  }

  console.log('\nLa burbuja se dibuja fuera de todo overflow');
  await page.hover('#iconMid');
  await page.waitForTimeout(80);
  let b = await bubble('iconMid');
  check('el tooltip es position:fixed — lo que lo saca del panel que lo ' +
        'recortaba (' + b.fija + ')', b.fija === 'fixed');

  console.log('\nIcono pegado al borde IZQUIERDO');
  await page.hover('#iconLeft');
  await page.waitForTimeout(80);
  b = await bubble('iconLeft');
  check('la burbuja no se sale por la izquierda (borde en ' + Math.round(b.left) + 'px)',
    b.left >= 0);
  check('...y sigue enganchada cerca de su icono, no tirada al centro',
    b.left < 260);

  console.log('\nIcono en MEDIO');
  await page.hover('#iconMid');
  await page.waitForTimeout(80);
  b = await bubble('iconMid');
  check('la burbuja queda centrada sobre su icono, sin correrse',
    Math.abs((b.left + b.right) / 2 - 508) < 12);

  console.log('\nIcono pegado al borde DERECHO');
  await page.hover('#iconRight');
  await page.waitForTimeout(80);
  b = await bubble('iconRight');
  check('la burbuja no se sale por la derecha (borde en ' + Math.round(b.right) +
        'px de 1000)', b.right <= 1000);
  check('...y sigue cerca de su icono', b.right > 740);

  console.log('\nIcono con la ventana acabándose debajo');
  // La ventana mide 400 de alto; un icono a 380 no tiene sitio para la burbuja.
  await page.evaluate(() => {
    const el = document.getElementById('iconMid');
    el.style.top = '360px';
    el.style.left = '500px';
  });
  await page.hover('#iconMid');
  await page.waitForTimeout(80);
  b = await bubble('iconMid');
  check('sin sitio debajo, la burbuja se voltea encima del icono', b.arriba === true);
  check('...y queda entera dentro de la ventana (arriba en ' + Math.round(b.top) + 'px)',
    b.top >= 0 && b.bottom <= 400);

  check('no page errors', pageErrors.length === 0);
  if (pageErrors.length) pageErrors.forEach(e => console.log('  PAGE ERROR:', e));

  await browser.close();
  console.log('\ntooltip fits on screen: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
  process.exit(fail === 0 ? 0 : 1);
})();
