// EL NOMBRE DEL PRODUCTO, ENLAZADO A LA LANDING — Y CUÁNDO NO.
//
// Jose (v11.44): que el "Acopio" de debajo del nombre de la empresa lleve al
// sitio, y que aparezca también arriba a la izquierda del menú de la cuenta,
// discreto y del mismo color.
//
// LO QUE ESTA PRUEBA CUIDA DE VERDAD no es que el enlace exista —eso se ve de
// un vistazo— sino que DEJE DE EXISTIR cuando toca. Ese texto no siempre dice
// "Acopio": _applyCompanyBranding lo reescribe con `company.productName`, que
// es la marca blanca. Un enlace fijo a acopio.net dentro de una instalación
// renombrada mandaría a la gente de ese cliente a un sitio que no se llama
// como lo que están usando, desde una palabra que ya no es nuestra.
//
// Es una regla que se rompe en silencio: la instalación de Jose nunca cambia
// el nombre, así que ningún uso normal enseñaría el fallo. Sólo una prueba que
// renombre el producto a propósito lo ve.
//
// Se ejecuta en un navegador porque _syncProductLinks manipula atributos del
// DOM; leer la función no dice qué atributos acaban puestos.
//
// Uso:  node tools/test-product-link.js [path/to/Index_v3_fixed.html]

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
 serverVersion:'11.44', company:{name:'OX GLASS LLC',domain:'ox-glass.com',logo:''},
 movements:[], stock:{}, monitoredMaterials:null,
 config:{ categories:[], projects:[], suppliers:[], locations:[], units:[] },
 incoming:[], rackPhotos:{}, systemActivity:[], rolePerms:{canSeeCosts:false,canEditMovements:false,canManageCatalog:false,canExportData:true},
 warehouseRoleLabel:'Warehouse', archiveCutoffMonths:12, oauthClientId:'', oauthRedirectUri:'' };
</script>`;
html = html.replace('</head>', stub + '</head>');
const f = path.join(os.tmpdir(), 'acopio-product-link.html');
fs.writeFileSync(f, html);

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

const SITE = 'https://www.acopio.net';

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1440, height: 800 } });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  await page.goto('file://' + f);
  await page.waitForTimeout(400);

  // ── 1. Están los dos, y en los dos sitios que Jose señaló ─────────────────
  console.log('\n═══ los dos sitios ═══\n');
  const sitios = await page.evaluate(() => {
    const enHeader = document.querySelector('.author-badge .product-link');
    const enMenu   = document.querySelector('.acct-head .product-link');
    return {
      total: document.querySelectorAll('.product-link').length,
      header: !!enHeader,
      menu:   !!enMenu,
      // El del header envuelve al span que escribe la marca; el del menú es
      // el texto en sí. Los dos caminos tienen que funcionar.
      headerEnvuelveElBadge: !!(enHeader && enHeader.querySelector('#poweredByBadge')),
      textoHeader: enHeader ? enHeader.textContent.trim() : '',
      textoMenu:   enMenu ? enMenu.textContent.trim() : ''
    };
  });
  check('hay exactamente dos (' + sitios.total + ')', sitios.total === 2);
  check('uno debajo del nombre de la empresa, en el badge del header', sitios.header);
  check('otro arriba a la izquierda del menú de la cuenta, donde Jose lo marcó ' +
        'en rojo', sitios.menu);
  check('el del header ENVUELVE a #poweredByBadge en vez de sustituirlo — así ' +
        'quien escribe el nombre no tiene que saber que ahora hay un enlace ' +
        'de por medio', sitios.headerEnvuelveElBadge);
  check('los dos dicen lo mismo ("' + sitios.textoHeader + '" / "' +
        sitios.textoMenu + '")', sitios.textoHeader === sitios.textoMenu &&
        sitios.textoHeader === 'Acopio');

  // ── 2. Con el nombre de fábrica: enlace de verdad ─────────────────────────
  console.log('\n═══ instalación sin renombrar: el enlace vive ═══\n');
  const vivo = await page.evaluate(() => {
    return Array.prototype.map.call(document.querySelectorAll('.product-link'), a => ({
      href: a.getAttribute('href'),
      target: a.getAttribute('target'),
      rel: a.getAttribute('rel'),
      noLink: a.classList.contains('no-link'),
      subrayadoEnReposo: getComputedStyle(a).textDecorationLine
    }));
  });
  check('los dos apuntan a ' + SITE, vivo.every(a => a.href === SITE));
  check('los dos abren en pestaña nueva — la app vive dentro de un iframe de ' +
        'Apps Script, y navegar ahí dentro sacaría a la persona de su sesión',
    vivo.every(a => a.target === '_blank'));
  check('con rel="noopener noreferrer"', vivo.every(a => /noopener/.test(a.rel || '')));
  check('EN REPOSO NO SE SUBRAYAN: se ven exactamente igual que antes de ser ' +
        'enlace. Es una firma en una esquina, no una llamada a hacer clic',
    vivo.every(a => a.subrayadoEnReposo === 'none'));

  const alPasar = await page.evaluate(() => {
    // El :hover no se puede forzar desde JS, así que se lee la regla.
    for (const hoja of document.styleSheets) {
      let reglas; try { reglas = hoja.cssRules; } catch (e) { continue; }
      for (const r of reglas) {
        if (r.selectorText && /\.product-link:hover/.test(r.selectorText)) {
          return r.style.textDecoration || r.style.textDecorationLine || '';
        }
      }
    }
    return null;
  });
  check('...y sí al pasar el mouse (' + alPasar + '), que es lo que dice que ' +
        'se puede tocar sin cambiar cómo se ve el resto del tiempo',
    !!alPasar && /underline/.test(alPasar));

  // ── 3. Marca blanca: el enlace se va ──────────────────────────────────────
  console.log('\n═══ instalación renombrada: el enlace NO vive ═══\n');
  const renombrado = await page.evaluate(() => {
    _syncProductLinks('Bodega Marín');
    return Array.prototype.map.call(document.querySelectorAll('.product-link'), a => ({
      href: a.getAttribute('href'),
      target: a.getAttribute('target'),
      rel: a.getAttribute('rel'),
      noLink: a.classList.contains('no-link'),
      texto: a.textContent.trim(),
      cursor: getComputedStyle(a).cursor
    }));
  });
  check('NINGUNO conserva el href — un cliente que renombró el producto no ' +
        'manda a su gente a acopio.net',
    renombrado.every(a => a.href === null));
  check('...ni target ni rel colgando de un enlace que ya no lo es',
    renombrado.every(a => a.target === null && a.rel === null));
  check('el cursor deja de decir que se puede pulsar (' +
        renombrado.map(a => a.cursor).join(', ') + ')',
    renombrado.every(a => a.cursor === 'default'));
  check('y el del menú pasa a decir el nombre del cliente ("' +
        renombrado.map(a => a.texto).join('" / "') + '")',
    renombrado.some(a => a.texto === 'Bodega Marín'));

  // ── 4. Y vuelve, si el cliente deshace el renombrado ──────────────────────
  console.log('\n═══ y vuelve al deshacerlo ═══\n');
  const vuelto = await page.evaluate(() => {
    _syncProductLinks('');
    return Array.prototype.map.call(document.querySelectorAll('.product-link'), a => ({
      href: a.getAttribute('href'), noLink: a.classList.contains('no-link'),
      texto: a.textContent.trim()
    }));
  });
  check('el enlace se restablece — quitar el nombre propio en Ajustes no deja ' +
        'la marca muerta hasta la siguiente recarga',
    vuelto.every(a => a.href === SITE && !a.noLink));
  check('y vuelve a decir Acopio', vuelto.every(a => a.texto === 'Acopio'));

  const igual = await page.evaluate(() => {
    // "Acopio" escrito a mano como productName es el nombre de fábrica, no un
    // renombrado: tratarlo como marca blanca rompería el enlace por escribir
    // lo mismo que ya había.
    _syncProductLinks('Acopio');
    return document.querySelector('.acct-head .product-link').getAttribute('href');
  });
  check('escribir "Acopio" a mano en Ajustes no cuenta como renombrar',
    igual === SITE);

  console.log('');
  check('sin errores de página', pageErrors.length === 0);
  if (pageErrors.length) pageErrors.forEach(e => console.log('  PAGE ERROR:', e));

  await browser.close();

  console.log('\n' + '─'.repeat(72));
  console.log('Lo que hay que vigilar aquí no es que el enlace funcione, sino');
  console.log('que desaparezca en las instalaciones renombradas. Ninguna de');
  console.log('ellas es la de Jose, así que el fallo no lo vería nadie de');
  console.log('este lado — sólo el cliente al que le mandáramos a su gente a');
  console.log('la página de otro producto.');
  console.log('─'.repeat(72));

  console.log('\nproduct link: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
  process.exit(fail === 0 ? 0 : 1);
})();
