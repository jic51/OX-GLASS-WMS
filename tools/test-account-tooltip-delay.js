// Verifies the account button's tooltip has a 4s hover delay — Jose: unlike
// the instant info icons, this one is for someone who lingers, not a quick
// glance.
//
// CAMBIÓ DE PREGUNTA EN LA v11.65, y el cambio es a mejor. Antes leía la
// propiedad `transition-delay` del ::after del botón, que es un sustituto de lo
// que importa. Ahora la burbuja no es un ::after: es un solo div colgado del
// <body> —ver _tipShow— porque un ::after queda a merced del `transform` de
// cualquier ancestro, que es el fallo que Jose fotografió en Ajustes.
//
// Así que se mide LA CONDUCTA: se pasa el ratón por encima, se mira al segundo
// (no tiene que estar) y a los cuatro y medio (tiene que estar). Una propiedad
// puede estar puesta y la burbuja no salir; esto es lo que la persona ve.
//
// Usage:  node tools/test-account-tooltip-delay.js [path/to/Index_v3_fixed.html]

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
 serverVersion:'test', company:{name:'OX Glass LLC.',domain:'ox-glass.com',logo:''},
 movements:[],
 stock:{ 'WINDOW|||GLASS': { name:'GLASS', category:'WINDOW', unit:'pcs', warehouseQty:10, siteQty:0,
   availableQty:10, wastedQty:0, reservedQty:0, matId:'WINDOW|||GLASS', warehouseLocs:{ 'A1A': 10 }, status:'OK' } },
 monitoredMaterials:null,
 config:{ categories:['WINDOW'], projects:['SOME NEW PROJECT'], suppliers:[],
   locations:[{name:'A1A',group:'RACKS'}], units:['pcs'] },
 incoming:[], rackPhotos:{}, systemActivity:[], rolePerms:{canSeeCosts:false,canEditMovements:false,canManageCatalog:false,canExportData:true},
 warehouseRoleLabel:'Warehouse', archiveCutoffMonths:12, oauthClientId:'', oauthRedirectUri:'' };
</script>`;
html = html.replace('</head>', stub + '</head>');
const f = path.join(os.tmpdir(), 'acopio-acct-delay.html');
fs.writeFileSync(f, html);

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  await page.goto('file://' + f);
  await page.waitForTimeout(300);

  // La burbuja es una sola para toda la app y se crea la primera vez que hace
  // falta, así que "no se ve" es tanto no existir como existir transparente.
  const visible = () => page.evaluate(() => {
    var t = document.getElementById('acTip');
    return !!t && Number(getComputedStyle(t).opacity) > 0.5;
  });

  console.log('\nScenario: not hovering — the tooltip is simply not shown');
  check('nothing is showing at rest', (await visible()) === false);

  console.log('\nScenario: hovering the account button — still nothing one second in');
  await page.hover('#acctBtn');
  await page.waitForTimeout(1000);
  check('one second of hovering shows nothing — this one is for someone who lingers',
    (await visible()) === false);

  console.log('\nScenario: still hovering past four seconds — now it appears');
  await page.waitForTimeout(3800);
  check('it appears after about four seconds', (await visible()) === true);

  console.log('\nScenario: moving away hides it again, with no delay of its own');
  await page.mouse.move(5, 5);
  await page.waitForTimeout(350);
  check('leaving dismisses it promptly', (await visible()) === false);

  console.log('\nScenario: an info icon is unaffected — the 4s wait is the account button only');
  // VISIBLE, no el primero que haya. Media app está en pestañas ocultas, y
  // pasar el ratón por encima de algo de ancho cero no dispara nada — la
  // comprobación decía "no sale al instante" sobre código correcto.
  const otro = await page.evaluate(() => {
    var els = document.querySelectorAll('.tip:not(#acctBtn)');
    for (var i = 0; i < els.length; i++) {
      var r = els[i].getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= window.innerHeight &&
          els[i].getAttribute('data-tip')) {
        if (!els[i].id) els[i].id = 'otroTipProbe';
        return els[i].id;
      }
    }
    return null;
  });
  check('found another .tip element to compare against', !!otro);
  if (otro) {
    await page.hover('#' + otro).catch(() => {});
    await page.waitForTimeout(300);
    check('other tooltips still show instantly, not stuck waiting 4s too',
      (await visible()) === true);
  }

  check('no page errors', pageErrors.length === 0);
  if (pageErrors.length) pageErrors.forEach(e => console.log('  PAGE ERROR:', e));

  await browser.close();
  console.log('\naccount tooltip delay: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
  process.exit(fail === 0 ? 0 : 1);
})();
