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
// ── Y EN LA v14.4 EL MECANISMO ENTERO DESAPARECIÓ ─────────────────────────
//
// P-02 quitó los recuadros de edición por fila de las cinco listas: ahora sólo
// hay UN sitio donde se escribe un nombre nuevo, la barra de lo marcado. Así
// que la situación que este fallo describía —dos recuadros abiertos a la vez—
// ya no se puede construir.
//
// Eso NO es motivo para borrar esta prueba, y su versión anterior ya lo dejó
// escrito: *"habrá que volver a mirar esto en vez de borrarlo"*. La regla que
// defendía no era «un recuadro a la vez»; eso era el arreglo. La regla es
// **la app no puede ofrecer un trabajo que va a tirar**, y eso sigue siendo
// comprobable: lo que se mide ahora es que no exista ningún segundo sitio
// donde teclear un renombre, y que el único que hay no guarde nada que no haya
// cambiado.
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
  /* EL SUJETO ES «PROJECTS» DESDE EL 5/11, y el cambio no es cosmético.
   *
   * Esto medía la regla sobre Categorías, que era la pantalla de lista de
   * siempre. En la v14.0 Categorías pasó a chips que se marcan y ya no tiene
   * recuadros de edición por fila — así que la prueba no se cayó porque la
   * regla se rompiera, se cayó porque su sujeto dejó de existir.
   *
   * La regla —**un recuadro abierto a la vez, y sin tirar lo tecleado**— sigue
   * viva en Projects, Suppliers y Directory, que todavía son listas. Se mide
   * ahí hasta que les toque convertirse, y entonces habrá que volver a mirar
   * esto en vez de borrarlo. */
  config:{ categories:['WINDOW','IGU','SCREEN','SHOWER'],
           projects:['HARBOR LANE','GOLDEN ACRE','QUARRY LANE','SCENIC MOUNTAIN'], suppliers:[],
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
  categories: DATA.config.categories, projects: DATA.config.projects, suppliers: [],
  locations: DATA.config.locations.map(l => l.name), materials: [],
  pmDirectory: [], archiveCutoffMonths: 12
})};
window.__DATA=${JSON.stringify(DATA)};
<\/script>`;
  const f = path.join(os.tmpdir(), 'ac-renom-' + Math.random().toString(36).slice(2) + '.html');
  fs.writeFileSync(f, html.replace('</head>', stub + '</head>'));
  return f;
}

/** Dónde se puede teclear un nombre nuevo ahora mismo, y qué pone. Mira TODA
 *  la pestaña, no sólo la barra: si alguien volviera a meter un recuadro por
 *  fila, aparecería aquí y esta prueba se pondría roja, que es justo para lo
 *  que sirve. */
const ESTADO = `window.__estado = function(){
  var scope = document.getElementById('settingsTabContent');
  var out = [];
  scope.querySelectorAll('[id^="cfgEdit-"], .cfg-item-input, [id$="RenameInp"]').forEach(function(c){
    if (c.offsetParent === null && c.style.display === 'none') return;
    out.push({ id: c.id, valor: c.value !== undefined ? c.value : null });
  });
  return out;
};
window.__marcar = function(i, on){
  var cbs = document.querySelectorAll('#settingsTabContent .cfg-pick');
  cbs[i].checked = on;
  cbs[i].dispatchEvent(new Event('change', { bubbles: true }));
};
window.__barra = function(){
  var b = document.getElementById('cfgPickBar');
  return { html: b ? b.innerHTML : '', sale: !!b && b.classList.contains('show') };
};`;

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  const errores = [];
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', e => errores.push(e.message));
  await page.goto('file://' + pagina());
  await page.waitForTimeout(900);
  await page.evaluate(ESTADO);

  // Ajustes → Projects. La que se abre por omisión es Categories, que desde la
  // v14.0 son chips y no filas; se cambia de pestaña a mano.
  await page.evaluate(() => { openSettingsModal(); });
  await page.waitForTimeout(400);
  await page.evaluate(() => { switchSettingsTab('projects'); });
  await page.waitForTimeout(400);

  console.log('\n═══ 1. El decorado está puesto ═══\n');
  const filas = await page.evaluate(() =>
    document.querySelectorAll('#settingsTabContent li.cfg-item').length);
  check('hay cuatro proyectos en la lista — con una sola no se puede reproducir ' +
        'nada de esto', filas === 4, filas);
  check('y al abrir no hay ningún sitio donde teclear un nombre — la lista se ' +
        'lee, y sólo se escribe cuando has elegido sobre qué',
        (await page.evaluate(() => window.__estado())).length === 0);
  check('ni queda ningún lápiz ni papelera por fila, que era lo que el «modo» ' +
        'de arriba encendía',
        (await page.evaluate(() =>
          document.querySelectorAll('#settingsTabContent li.cfg-item button').length)) === 0);

  console.log('\n═══ 2. UN SOLO SITIO DONDE TECLEAR UN NOMBRE ═══\n');
  /* El nombre se lee de la pantalla, no se escribe a mano: la lista se ordena
   * alfabéticamente y dar por hecho cuál cae primero es una suposición que se
   * rompe sola. */
  const PRIMERO = await page.evaluate(() =>
    document.querySelectorAll('#settingsTabContent li.cfg-item')[0].getAttribute('data-val'));
  {
    await page.evaluate(() => window.__marcar(0, true));
    await page.waitForTimeout(120);
    const e = await page.evaluate(() => window.__estado());
    check('marcar uno abre EXACTAMENTE un sitio donde escribir', e.length === 1, e);
    check('...y es el de la barra, no un recuadro dentro de la fila',
      e.length === 1 && /RenameInp$/.test(e[0].id), e);
    check('...que viene con el nombre actual puesto',
      e.length === 1 && e[0].valor === PRIMERO, { e: e, esperado: PRIMERO });
  }

  console.log('\n═══ 3. MARCAR OTRO NO DEJA DOS A MEDIAS ═══\n');
  {
    /* EL CASO DEL VÍDEO, en su forma nueva. Antes se podían abrir cinco
     * recuadros, escribir en los cinco y guardar uno, tirando cuatro **sin
     * avisar al guardar**. Ahora no hay forma de llegar ahí: marcar un segundo
     * proyecto quita el sitio de escribir en el acto —a la vista, mientras lo
     * marcas— y ofrece Fusionar, que es lo que de verdad significa dar el mismo
     * nombre a dos cosas. */
    await page.evaluate((nombre) => {
      var i = document.getElementById('cfgPickRenameInp');
      i.value = nombre + ' PHASE 2';
      i.dispatchEvent(new Event('input', { bubbles: true }));
    }, PRIMERO);
    await page.evaluate(() => window.__marcar(1, true));
    await page.waitForTimeout(120);
    const e = await page.evaluate(() => window.__estado());
    const b = await page.evaluate(() => window.__barra());
    check('con DOS marcados no queda NINGÚN sitio donde teclear un renombre',
      e.length === 0, e);
    check('...y lo que se ofrece en su lugar es fusionar, que es lo que ' +
          'significa dar un mismo nombre a dos cosas',
      /cfgPickMergeBtn/.test(b.html), b.html);
    check('...y hay que decir cuál de los dos nombres se queda',
      /cfgPickKeep/.test(b.html));
  }

  console.log('\n═══ 4. SOLTAR UNO DEVUELVE EL RENOMBRE ═══\n');
  {
    await page.evaluate(() => window.__marcar(1, false));
    await page.waitForTimeout(120);
    const e = await page.evaluate(() => window.__estado());
    check('vuelve a haber un sitio donde escribir', e.length === 1, e);
    /* Y vuelve con el nombre REAL, no con lo que se estaba tecleando antes.
     * Recuperar un borrador a medias sería peor: parecería que ese cambio
     * sigue vivo cuando nadie lo guardó. */
    check('...con el nombre que de verdad tiene el proyecto, no un borrador ' +
          'de antes que nadie guardó',
      e.length === 1 && e[0].valor === PRIMERO, { e: e, esperado: PRIMERO });
  }

  console.log('\n═══ 5. Y NO GUARDA LO QUE NO HA CAMBIADO ═══\n');
  {
    /* El otro medio fallo de la misma familia: un botón encendido sobre nada
     * que hacer. Renombrar nace apagado y sólo se enciende con un nombre
     * distinto y no vacío. */
    const estados = await page.evaluate((nombre) => {
      const btn = document.getElementById('cfgPickRenameBtn');
      const inp = document.getElementById('cfgPickRenameInp');
      const leer = () => btn.disabled;
      const out = { alAbrir: leer() };
      inp.value = ''; inp.dispatchEvent(new Event('input', { bubbles: true }));
      out.vacio = leer();
      inp.value = nombre; inp.dispatchEvent(new Event('input', { bubbles: true }));
      out.igual = leer();
      inp.value = nombre + ' PHASE 2'; inp.dispatchEvent(new Event('input', { bubbles: true }));
      out.distinto = leer();
      return out;
    }, PRIMERO);
    check('Renombrar nace apagado: aún no hay nada que renombrar', estados.alAbrir, estados);
    check('...sigue apagado con el nombre vacío', estados.vacio, estados);
    check('...sigue apagado con el mismo nombre', estados.igual, estados);
    check('...y sólo se enciende con un nombre distinto', !estados.distinto, estados);
  }

  check('y la página no lanzó ningún error por el camino', errores.length === 0, errores);

  await browser.close();
  console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones\n');
  process.exit(fail ? 1 : 0);
})();
