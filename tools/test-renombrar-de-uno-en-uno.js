// LA APP NO PUEDE OFRECER UN TRABAJO QUE VA A TIRAR.
//
// Jose, 2026-10-06, con un vídeo de Ajustes → Categories: *"al dar clic en
// editar se habilitan todas las categorías y se pueden editar todas al mismo
// tiempo, pero al guardar sólo se puede dar clic en 1 a la vez, y cuando esa una
// se guarda, las demás ya se desactivan del modo edición y SE BORRA EL CAMBIO
// QUE SE HIZO."*
//
// ── LO QUE PASABA, Y LA ÚLTIMA PARTE ES LA GRAVE ───────────────────────────
//
//   · `_cfgStartEdit` abría una fila y NO cerraba las demás, así que se podían
//     abrir todas y escribir en todas.
//   · Guardar una llama al servidor y, al volver, `_applyCfgChangeLocally`
//     REPINTA LA PESTAÑA ENTERA — y se lleva por delante los demás recuadros y
//     todo lo tecleado dentro.
//
// La app ofrecía escribir cinco renombres y guardaba uno, tirando los otros
// cuatro sin avisar. Misma familia que el resto de los fallos de esta semana
// —prometer una cosa y hacer otra en silencio— sólo que aquí lo que se pierde
// es lo que la persona acaba de teclear.
//
// ── POR QUÉ UNO A LA VEZ, Y NO "GUARDAR TODOS" ────────────────────────────
//
// Renombrar una categoría REESCRIBE CADA FILA DEL ARCHIVO que la usaba y
// después rehace la caché de existencias. Cinco de golpe son cinco de esas
// pasadas, y si la tercera falla queda media tanda aplicada y nadie sabe cuál.
// Guardar de uno en uno es lo correcto; lo que estaba mal era fingir que se
// podía empezar de cinco.
//
// Esto se mide EN EL NAVEGADOR y no leyendo el código, porque lo que falla es
// el estado de la pantalla —qué recuadros quedan abiertos y qué hay escrito
// dentro— y eso no se deduce de un fichero.
//
// Uso:  NODE_PATH="$(npm root -g)" CHROME_PATH=... node tools/test-renombrar-de-uno-en-uno.js

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

const DATA = {
  userRole:'ADMIN', userEmail:'jose@ox.com', userName:'Jose Castro', serverVersion:'test',
  company:{ name:'OX Glass LLC.' }, movements:[], stock:{}, materialLocks:[],
  monitoredMaterials:null,
  // Cuatro categorías: con una no se puede reproducir nada, y el fallo necesita
  // al menos dos recuadros abiertos a la vez.
  config:{ categories:['WINDOW','IGU','SCREEN','SHOWER'], projects:[], suppliers:[],
           locations:[{ name:'A1A', type:'RACK' }], units:['UNIT'] },
  incoming:[], rackPhotos:{}, systemActivity:[],
  rolePerms:{ canSeeCosts:true, canEditMovements:true, canManageCatalog:true, canExportData:true },
  warehouseRoleLabel:'Warehouse', archiveCutoffMonths:12, oauthClientId:'', oauthRedirectUri:''
};

function pagina(){
  const stub = `<script>
window.google=window.google||{};window.google.charts={load:function(){},setOnLoadCallback:function(){}};
Object.assign(window.google,{script:{run:new Proxy({},{get(t,k){return function(){
 if(k==='withSuccessHandler'){t._ok=arguments[0];return window.google.script.run;}
 if(k==='withFailureHandler'){return window.google.script.run;}
 var ok=t._ok;
 if(k==='getInitialData'){setTimeout(function(){ok&&ok(window.__DATA);},20);return;}
 /* La lista de Ajustes NO sale de getInitialData: viene de getSettings, que es
  * una llamada aparte. Sin esto el panel se dibuja vacío y la prueba "falla"
  * contando cero categorías — un fallo de la caja disfrazado de fallo del
  * producto, que es la trampa de siempre. */
 if(k==='processMovement'&&arguments[0]==='getSettings'){
   setTimeout(function(){ok&&ok(window.__SETTINGS);},10);return;}
 /* Varias llamadas de Ajustes esperan UNA LISTA y no un objeto. Devolverles
  * un objeto vacio hacia que la pagina lanzara "_pmDirectoryData.map is not a
  * function", y esa excepcion es real pero NO es del producto: es de un doble
  * que contesta con la forma equivocada. Con una lista vacia se quedan calladas
  * y la prueba vuelve a medir lo que dice que mide. */
 if(k==='processMovement'&&/Directory|list|Materials|ErrorLog/i.test(String(arguments[0]||''))){
   setTimeout(function(){ok&&ok([]);},10);return;}
 setTimeout(function(){ok&&ok({});},10);};}})}});
window.__SETTINGS=${JSON.stringify({
  categories: DATA.config.categories, projects: [], suppliers: [],
  locations: DATA.config.locations.map(l => l.name), materials: [],
  pmDirectory: [], archiveCutoffMonths: 12
})};
window.__DATA=${JSON.stringify(DATA)};
<\/script>`;
  const f = path.join(os.tmpdir(), 'ac-renom-' + Math.random().toString(36).slice(2) + '.html');
  fs.writeFileSync(f, html.replace('</head>', stub + '</head>'));
  return f;
}

/** Cuántos recuadros de edición hay abiertos, y qué hay escrito en ellos. */
const ESTADO = `window.__estado = function(){
  var scope = document.getElementById('settingsTabContent');
  var out = [];
  scope.querySelectorAll('[id^="cfgEdit-"]').forEach(function(c){
    if (c.style.display === 'none') return;
    var i = c.querySelector('.cfg-item-input');
    out.push({ id: c.id, valor: i ? i.value : null });
  });
  return out;
};`;

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  const errores = [];
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', e => errores.push(e.message));
  await page.goto('file://' + pagina());
  await page.waitForTimeout(900);
  await page.evaluate(ESTADO);

  // Ajustes → Categories. Es la pestaña que se abre por omisión.
  await page.evaluate(() => { openSettingsModal(); });
  await page.waitForTimeout(500);

  console.log('\n═══ 1. El decorado está puesto ═══\n');
  const filas = await page.evaluate(() =>
    document.querySelectorAll('#settingsTabContent li.cfg-item').length);
  check('hay cuatro categorías en la lista — con una sola no se puede reproducir ' +
        'nada de esto', filas === 4, filas);
  check('y ninguna está en modo edición al abrir',
        (await page.evaluate(() => window.__estado())).length === 0);

  console.log('\n═══ 2. Uno a la vez ═══\n');
  {
    await page.evaluate(() => _cfgStartEdit('categories', 0));
    await page.waitForTimeout(120);
    let e = await page.evaluate(() => window.__estado());
    check('se abre el primero', e.length === 1 && e[0].id === 'cfgEdit-categories-0', e);

    /* EL CASO DEL VÍDEO. Antes, pulsar el lápiz de la segunda dejaba DOS
     * abiertos; guardar una de ellas repintaba la pestaña y lo escrito en la
     * otra desaparecía. */
    await page.evaluate(() => _cfgStartEdit('categories', 1));
    await page.waitForTimeout(120);
    e = await page.evaluate(() => window.__estado());
    check('ABRIR OTRO NO DEJA DOS ABIERTOS — guardar uno repinta la pestaña y se ' +
          'lleva por delante lo escrito en el otro',
          e.length === 1, e);
    check('...y el que queda abierto es el que se acaba de pedir',
          e.length === 1 && e[0].id === 'cfgEdit-categories-1', e);
  }

  console.log('\n═══ 3. Pero NO se tira lo que alguien escribió ═══\n');
  {
    /* Cerrar el recuadro abierto para abrir otro sería el mismo pecado más
     * pequeño: tirar lo tecleado, sólo que de a uno. */
    await page.evaluate(() => {
      var i = document.getElementById('cfgInp-categories-1');
      i.value = 'IGU DOBLE';
      i.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.evaluate(() => _cfgStartEdit('categories', 2));
    await page.waitForTimeout(120);
    const e = await page.evaluate(() => window.__estado());

    check('con algo escrito sin guardar, el otro NO se abre — lo tecleado no se ' +
          'tira para hacer sitio', e.length === 1 && e[0].id === 'cfgEdit-categories-1', e);
    check('...y LO ESCRITO SIGUE AHÍ, que es la parte que de verdad importa',
          e.length === 1 && e[0].valor === 'IGU DOBLE', e);

    const aviso = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.toast-msg')).map(t => t.textContent).join(' | '));
    /* Y se dice por qué no se abrió. Un clic que no hace nada y no explica nada
     * se vuelve a dar, y entonces parece que la app está colgada. */
    check('...y se explica por qué no se abrió, en vez de no hacer nada',
          /Finish the one you are editing/i.test(aviso), aviso);
  }

  console.log('\n═══ 4. Cancelar libera el turno ═══\n');
  {
    await page.evaluate(() => _cfgCancelEdit('categories', 1));
    await page.evaluate(() => _cfgStartEdit('categories', 2));
    await page.waitForTimeout(120);
    const e = await page.evaluate(() => window.__estado());
    check('después de cancelar, otro se abre sin pelea',
          e.length === 1 && e[0].id === 'cfgEdit-categories-2', e);
  }

  console.log('\n═══ 5. Un recuadro sin tocar no bloquea nada ═══\n');
  {
    /* Abrir uno, no escribir, y abrir otro: eso tiene que fluir. Si también
     * pidiera cerrar el anterior a mano, la regla se volvería un estorbo en el
     * caso más común — pulsar el lápiz equivocado y corregirse. */
    await page.evaluate(() => _cfgStartEdit('categories', 3));
    await page.waitForTimeout(120);
    const e = await page.evaluate(() => window.__estado());
    check('abrir otro cuando el anterior está sin tocar simplemente funciona — ' +
          'pulsar el lápiz equivocado y corregirse es lo más común que hay',
          e.length === 1 && e[0].id === 'cfgEdit-categories-3', e);
  }

  check('y la página no lanzó ningún error por el camino', errores.length === 0, errores);

  await browser.close();
  console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones\n');
  process.exit(fail ? 1 : 0);
})();
