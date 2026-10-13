// EL «+ ADD IT» QUE SE IBA PARA SIEMPRE SI PINCHABAS DOS VECES.
//
// Jose, 2026-10-13, en vídeo: *"cuando escribo un nuevo proyecto, la app me da
// la opción de añadirlo, pero si doy clic en el mismo casillero para escribir
// más o cambiar el nombre del proyecto la opción de añadirlo se va, y no
// regresa nunca. La tarjeta de proyecto se crea y se queda a un lado pero en el
// ingreso no se vuelve a mostrar."*
//
// ── LA CAUSA, QUE ES UNA PAREJA QUE FALTABA ─────────────────────────────────
//
//   1. escribes un proyecto nuevo y sales  → `change` dispara → sale el cartel
//   2. vuelves a pinchar en el casillero   → `focusin` lo borra
//   3. sales SIN tocar el texto            → `change` NO DISPARA: el valor no
//                                            cambió, y `change` sólo mira eso
//
// A partir de ahí no queda ningún evento capaz de traerlo de vuelta. No es que
// tardara: es que se iba para siempre.
//
// Y la mitad que lo hacía confuso: la TARJETA del mazo seguía ahí, porque vive
// en `_typedCfgAdds` y nadie la tocó. El mazo ofrecía el proyecto y el
// formulario no, así que parecía que se había creado a medias.
//
// ── POR QUÉ ESTA PRUEBA ABRE UN NAVEGADOR ───────────────────────────────────
//
// Porque el fallo NO ESTÁ EN NINGUNA FUNCIÓN. Las tres —`_maybeOfferCfgAdd`,
// `_clearCfgHint`, `_cfgKnownValues`— eran correctas por separado. El fallo
// estaba en qué EVENTOS las llaman, y eso sólo existe cuando hay un navegador
// repartiendo focusin, change y focusout de verdad. Leer el código no lo
// encuentra: hay que pinchar dos veces.
//
// Usage:  node tools/test-proyecto-nuevo.js [path/to/Index_v3_fixed.html]

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
    if(k==='getInitialData'){ setTimeout(function(){ ok && ok(window.__DATA); },40); return; }
    setTimeout(function(){ ok && ok({}); },20);
  };
}})}});
window.__DATA={ userRole:'ADMIN', userEmail:'jose@ox-glass.com', userName:'Jose Castro',
 serverVersion:'test', company:{name:'OX Glass LLC.',domain:'ox-glass.com',logo:''},
 movements:[],
 stock:{},
 monitoredMaterials:null,
 config:{ categories:['WINDOW'], projects:['TOWER ONE'], suppliers:['AMSCO'],
   locations:[{name:'A1A',group:'RACKS'}], units:['pcs'] },
 incoming:[], rackPhotos:{}, systemActivity:[],
 rolePerms:{canSeeCosts:false,canEditMovements:true,canManageCatalog:true,canExportData:true},
 warehouseRoleLabel:'Warehouse', archiveCutoffMonths:12, oauthClientId:'', oauthRedirectUri:'' };
</script>`;
html = html.replace('</head>', stub + '</head>');
const f = path.join(os.tmpdir(), 'acopio-proyecto-nuevo.html');
fs.writeFileSync(f, html);

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FALLA ' + label + (extra === undefined ? '' : '  → ' + JSON.stringify(extra))); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  await page.goto('file://' + f);
  await page.waitForTimeout(700);

  /* El campo se monta a mano en el documento en vez de abrir el formulario de
   * movimiento: lo que se mide es el CABLEADO DE EVENTOS, que es global
   * (`document.addEventListener`), no la pantalla concreta. Así la prueba no se
   * rompe el día que el formulario cambie de sitio, y sigue midiendo lo que
   * Jose grabó. */
  const montar = () => page.evaluate(() => {
    var viejo = document.getElementById('probe-proj');
    if (viejo && viejo.parentNode) viejo.parentNode.remove();
    var caja = document.createElement('div');
    caja.style.cssText = 'position:fixed;top:10px;left:10px;z-index:99999';
    caja.innerHTML = '<input type="text" id="probe-proj" data-cfg-new="projects">' +
                     '<input type="text" id="probe-otro">';
    document.body.appendChild(caja);
  });

  const hayCartel = () => page.evaluate(() => {
    var el = document.getElementById('probe-proj');
    var sig = el && el.nextElementSibling;
    return !!(sig && sig.classList && sig.classList.contains('cfg-new-hint'));
  });

  const tarjetasDelMazo = () => page.evaluate(() =>
    (typeof _typedCfgAdds === 'undefined' ? [] : _typedCfgAdds).map(t => t.type + '|' + t.value));

  console.log('\n═══ 1. LA SECUENCIA EXACTA DEL VÍDEO ═══\n');

  await montar();
  await page.fill('#probe-proj', 'SUNBRIDGE PHASE 2');
  await page.click('#probe-otro');                     // salir: dispara change
  await page.waitForTimeout(120);
  check('escribo un proyecto nuevo y salgo → sale el «+ Add it»', await hayCartel());

  await page.click('#probe-proj');                     // volver a entrar
  await page.waitForTimeout(120);
  check('vuelvo a pinchar en el casillero → el cartel se quita, que es correcto: ' +
        'mientras editas, hablaría de un valor que ya no es el que hay',
    !(await hayCartel()));

  /* AQUÍ ESTABA EL FALLO. Salir SIN tocar el texto. */
  await page.click('#probe-otro');
  await page.waitForTimeout(120);
  check('salgo SIN cambiar el texto → el cartel VUELVE ' +
        '(antes no volvía nunca: `change` sólo dispara si el valor cambia)',
    await hayCartel());

  console.log('\n═══ 2. Y AGUANTA REPETIRLO ═══\n');
  //
  // El vídeo enseña dos clics. Si la pareja de eventos estuviera a medias, el
  // tercero o el cuarto la destaparían igual.
  let siempre = true;
  for (let i = 0; i < 4; i++) {
    await page.click('#probe-proj');
    await page.waitForTimeout(60);
    await page.click('#probe-otro');
    await page.waitForTimeout(60);
    if (!(await hayCartel())) siempre = false;
  }
  check('entrar y salir cuatro veces más: el cartel sigue ahí las cuatro', siempre);

  console.log('\n═══ 3. LA TARJETA DEL MAZO Y EL CARTEL DICEN LO MISMO ═══\n');
  //
  // La mitad que hacía el fallo confuso: la tarjeta seguía ofreciendo el
  // proyecto mientras el formulario ya no. Dos sitios que cuentan la misma
  // cosa y nada obligaba a que coincidieran.
  check('el mazo tiene la tarjeta del proyecto tecleado',
    (await tarjetasDelMazo()).some(k => /^projects\|SUNBRIDGE PHASE 2$/.test(k)),
    await tarjetasDelMazo());
  check('...y el cartel del formulario también está: los dos dicen lo mismo',
    await hayCartel());

  console.log('\n═══ 4. LO QUE NO DEBE OFRECER ═══\n');

  await montar();
  await page.fill('#probe-proj', 'TOWER ONE');          // ya está en la lista
  await page.click('#probe-otro');
  await page.waitForTimeout(120);
  check('un proyecto que YA está en la lista no ofrece añadirlo', !(await hayCartel()));
  check('...y tampoco deja tarjeta en el mazo',
    !(await tarjetasDelMazo()).some(k => /TOWER ONE/.test(k)), await tarjetasDelMazo());

  await montar();
  await page.fill('#probe-proj', '   ');
  await page.click('#probe-otro');
  await page.waitForTimeout(120);
  check('el campo vacío no ofrece nada', !(await hayCartel()));

  /* Y el que de verdad importa: entrar y salir de un campo VACÍO no puede
   * inventarse un cartel. Es el riesgo de llamar a la oferta en `focusout`. */
  await page.click('#probe-proj');
  await page.waitForTimeout(60);
  await page.click('#probe-otro');
  await page.waitForTimeout(120);
  check('entrar y salir de un campo vacío tampoco: el `focusout` nuevo no ' +
        'inventa carteles donde no hay valor', !(await hayCartel()));

  console.log('\n═══ 5. SIN PERMISO PARA EL CATÁLOGO, NO SE OFRECE ═══\n');

  await page.evaluate(() => { window.userRole = 'WAREHOUSE'; });
  await montar();
  await page.fill('#probe-proj', 'OTRO PROYECTO NUEVO');
  await page.click('#probe-otro');
  await page.waitForTimeout(120);
  check('a quien no es admin no se le ofrece añadir al catálogo', !(await hayCartel()));
  await page.evaluate(() => { window.userRole = 'ADMIN'; });

  check('ningún error suelto en la consola', errores.length === 0, errores.slice(0, 3));

  await browser.close();
  console.log('\n' + (fail ? '✗ ' + fail + ' fallos · ' : '✓ todo bien · ') + (ok + fail) + ' comprobaciones\n');
  process.exit(fail ? 1 : 0);
})();
