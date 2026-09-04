// TODAS LAS PESTAÑAS DE AJUSTES, DENTRO DE SU RECUADRO.
//
// Jose (v11.32): encerrar cada área de Ajustes en un recuadro con su nombre,
// "separación que se pueda señalar". Se hizo en System y en Permissions
// (v11.38) y ahí se quedó — Company, Import y Locations siguieron siendo una
// columna suelta de controles durante siete versiones, porque su marcado tiene
// otra forma y no las alcanzaba la regla.
//
// LO QUE HACE QUE ESTO SE ROMPA EN SILENCIO es la propia regla:
//
//     #settingsTabContent > .field { … }
//
// El `>` está puesto a propósito —`.field` sale cien veces en el archivo y sin
// él se dibujaría un recuadro alrededor de cada campo de la app— pero significa
// que un `.field` metido un nivel más abajo NO recibe nada. No falla, no avisa:
// simplemente no hay recuadro. Es lo que pasaba con Company, cuyos campos
// vivían dentro de un `<div class="co-form">`.
//
// Por eso esto se ejecuta en un navegador y CUENTA los recuadros que el
// navegador dibuja de verdad, en vez de buscar la cadena `class="field"` en el
// código: esa cadena estaba presente y el recuadro no.
//
// Uso:  node tools/test-settings-boxes.js [path/to/Index_v3_fixed.html]

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
 serverVersion:'11.46', company:{name:'OX GLASS LLC',domain:'ox-glass.com',logo:''},
 movements:[], stock:{}, monitoredMaterials:null,
 config:{ categories:['WINDOW'], projects:[], suppliers:[], locations:['A1A','B6A'], units:['UNIT'] },
 incoming:[], rackPhotos:{}, systemActivity:[], rolePerms:{canSeeCosts:false,canEditMovements:false,canManageCatalog:false,canExportData:true},
 warehouseRoleLabel:'Warehouse', archiveCutoffMonths:12, oauthClientId:'', oauthRedirectUri:'' };
</script>`;
html = html.replace('</head>', stub + '</head>');
const f = path.join(os.tmpdir(), 'acopio-settings-boxes.html');
fs.writeFileSync(f, html);

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

// Las cinco que llevan recuadro. Las de catálogo (Categories, Projects,
// Suppliers) NO están, y no es un olvido: son una lista de nombres y un botón
// de añadir, o sea una sola cosa. Un recuadro alrededor de una sola cosa no
// separa nada de nada.
const PESTANAS = ['company', 'import', 'locations', 'system', 'permissions'];

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  await page.goto('file://' + f);
  await page.waitForTimeout(500);

  console.log('\n═══ cada pestaña dibuja sus áreas ═══\n');
  for (const tab of PESTANAS) {
    const r = await page.evaluate((t) => {
      _settingsData = _settingsData || {};
      _renderSettingsTab(t);
      const cajas = document.querySelectorAll('#settingsTabContent > .field');
      const cs = cajas.length ? getComputedStyle(cajas[0]) : null;
      return {
        n: cajas.length,
        // El nombre va SOBRE la línea del borde, como la leyenda de un
        // fieldset: es lo que convierte una caja en un área con nombre, que es
        // lo que Jose pidió.
        titulos: Array.prototype.map.call(cajas, c => {
          const l = c.querySelector(':scope > label');
          return l ? l.textContent.trim() : '(sin nombre)';
        }),
        borde: cs ? cs.borderTopWidth + ' ' + cs.borderTopStyle : '',
        color: cs ? cs.borderTopColor : ''
      };
    }, tab);

    check(tab + ': dibuja ' + r.n + ' área(s) con recuadro — ' +
          r.titulos.join(' · '), r.n >= 2);
    check(tab + ': todas llevan nombre, no una caja muda',
      r.titulos.length > 0 && r.titulos.every(t => t !== '(sin nombre)'));
    if (r.n) {
      check(tab + ': el borde está pintado de verdad (' + r.borde + ', ' +
            r.color + ') — no basta con que la clase esté puesta, que es ' +
            'exactamente lo que pasaba en Company', /^[1-9]/.test(r.borde) &&
            r.borde.indexOf('solid') !== -1);
    }
  }

  // Company es el caso que enseñó el fallo, y tiene una trampa propia.
  console.log('\n═══ Company: los nombres de campo no se vuelven rótulos ═══\n');
  {
    const r = await page.evaluate(() => {
      _renderSettingsTab('company');
      const l = document.querySelector('#settingsTabContent .co-label');
      const cs = l ? getComputedStyle(l) : null;
      const caja = document.querySelector('#settingsTabContent > .field');
      const titulo = caja ? getComputedStyle(caja.querySelector(':scope > label')) : null;
      return {
        transform: cs ? cs.textTransform : '',
        color: cs ? cs.color : '',
        peso: cs ? cs.fontWeight : '',
        tituloTransform: titulo ? titulo.textTransform : ''
      };
    });
    // `.field label` (0,1,1) le gana a `.co-label` (0,1,0), así que meter estos
    // campos dentro de un .field convertía "Company name" y "Email domain" en
    // MAYÚSCULAS grises de rótulo. Es el precio de reutilizar el recuadro, y
    // hay que pagarlo explícitamente.
    check('"Company name" sigue en minúsculas y en color de texto (' +
          r.transform + ', ' + r.color + ')',
      r.transform === 'none' && r.color !== 'rgb(107, 114, 128)');
    check('...y en negrita, como antes de tener recuadro', +r.peso >= 700);
    check('mientras que el NOMBRE DEL ÁREA sí va en mayúsculas (' +
          r.tituloTransform + ') — es lo que los distingue a simple vista',
      r.tituloTransform === 'uppercase');
  }

  console.log('');
  check('sin errores de página', pageErrors.length === 0);
  if (pageErrors.length) pageErrors.forEach(e => console.log('  PAGE ERROR:', e));

  await browser.close();

  console.log('\n' + '─'.repeat(72));
  console.log('La regla del recuadro sólo alcanza a los .field que son HIJOS');
  console.log('DIRECTOS de #settingsTabContent. Un .field un nivel más abajo no');
  console.log('falla ni avisa: no se dibuja nada. Por eso esto cuenta recuadros');
  console.log('pintados y no clases escritas.');
  console.log('─'.repeat(72));

  console.log('\nsettings boxes: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
  process.exit(fail === 0 ? 0 : 1);
})();
