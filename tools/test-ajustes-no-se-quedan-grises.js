// AJUSTES NO SE PUEDE QUEDAR MUERTO, Y UNA PESTAÑA TIENE UN SOLO DUEÑO.
//
// Jose, 25/10, con un vídeo de su copia Básica:
//
//   *"Cuando en Settings la pantalla se queda en gris y no deja tocar nada,
//   todas las ventanas aparecen con un Acopio Pro en la esquina."*
//
// Y en el mismo mensaje, la consecuencia: *"no se puede probar importar/
// borrar, fusionar, papelera"*. Cuatro cosas de su lista de verificación
// bloqueadas por esto. No era un detalle visual: era el motivo de que no
// pudiera avanzar.
//
// ── DOS FALLOS DISTINTOS, LOS DOS VISIBLES EN EL MISMO VÍDEO ───────────────
//
// 1 · EL GRIS QUE NO SE VA. `settingsTabContent` es UN SOLO elemento que se
//     repinta en cada pestaña. Abrir «System» —que sí es de Pro en la gratis—
//     le ponía `pro-off` y un oyente en captura. Al cambiar a otra pestaña,
//     `_basicApagarAjuste` salía por su `return` **sin quitarlo**: el contenido
//     cambiaba y el gris se quedaba. Desde ahí, todo Ajustes muerto hasta
//     recargar.
//
//     La causa de fondo no es el `return`. Es que había una función para
//     APAGAR una zona y ninguna para ENCENDERLA. Una pareja a medias se acaba
//     usando a medias. Y el oyente llevaba la clave dentro de un `function`
//     anónimo, así que no había forma de quitarlo ni queriendo.
//
// 2 · LA PESTAÑA QUE REAPARECE. En el mismo vídeo, en una copia **Básica**,
//     se ven Permissions, Directory e Import a la vista y funcionando, cuando
//     `BASIC_FUERA.ajustes` dice que esas tres no van. La lista no estaba mal:
//     la pisaban después. `_basicPintar` las escondía al arrancar y, al abrir
//     Ajustes, `_filterSettingsSidebar` recorría TODOS los botones poniendo
//     `display = ''` a los que el ROL permite — y para un administrador eso es
//     todos.
//
//     Dos reglas escribiendo sobre el mismo `style.display`, con el agravante
//     de que aquí no tenían que coincidir: tenían que COMBINARSE, y nadie las
//     combinaba. Ahora las dos viven en `_settingsTabVisible` y el que pinta
//     sólo pregunta. Es lo que Jose pidió que le explicara cuando escribí «un
//     solo dueño de la visibilidad de pestañas».
//
// Se prueba en un navegador porque las dos son estado que se acumula al USAR
// la pantalla: leer el código no distingue «lo pone» de «lo quita cuando toca».
//
// Uso:  node tools/test-ajustes-no-se-quedan-grises.js

const fs = require('fs'), path = require('path'), os = require('os');
const A      = require(path.join(__dirname, 'andamio.js'));
const HTML   = path.join(__dirname, '..', 'Index_v3_fixed.html');
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SRC    = fs.readFileSync(HTML, 'utf8');

let ok = 0; const fails = [];
function check(label, got, want) {
  const bien = want === undefined ? !!got : JSON.stringify(got) === JSON.stringify(want);
  if (bien) { ok++; console.log('  ok   ' + label); }
  else {
    fails.push(label + (want === undefined ? '' :
      ' → esperaba ' + JSON.stringify(want) + ', salió ' + JSON.stringify(got)));
    console.log('  FALLA ' + label + (want === undefined ? '' :
      '\n         esperaba ' + JSON.stringify(want) + '\n         salió    ' + JSON.stringify(got)));
  }
}

/* La barra lateral se copia del archivo de verdad, no se escribe a mano: si
 * mañana alguien añade una pestaña, esta prueba la ve sin que nadie la toque.
 * Escrita a mano sería otra lista que mantener, que es la falta que esta
 * misma prueba vigila. */
const nav = (SRC.match(/<nav class="settings-sidebar"[\s\S]*?<\/nav>/) || [''])[0];
if (!nav) { console.error('no se encontró la barra lateral de ajustes'); process.exit(2); }

const page = `<!doctype html><html><head><meta charset="utf-8">
<style>
  .pro-off{opacity:.4;filter:grayscale(1);cursor:pointer;position:relative}
  .pro-off *{pointer-events:none}
</style></head><body>
${nav.replace(/onclick="[^"]*"/g, '')}
<div id="settingsTabContent"></div>
<script>
  var APP_BASIC = true;
  var userRole  = 'ADMIN';
  var _settingsTab = 'categories';
  window.__ofertas = [];
  window.__dentroPulsado = 0;

  function _proPitch(clave){ window.__ofertas.push(clave); }

  /* Cada pestaña pinta algo distinto dentro del MISMO contenedor, que es la
     pieza que hace posible el fallo. */
  function _renderSettingsTab(tab){
    _settingsTab = tab;
    document.getElementById('settingsTabContent').innerHTML =
      '<button id="dentro" onclick="window.__dentroPulsado++">' + tab + '</button>';
    _basicApagarAjuste(tab);
  }
${A.constantes(SRC, ['BASIC_PRO_AJUSTES', 'BASIC_FUERA', 'SETTINGS_CATALOG_TABS'])}
${A.levantar(SRC,
  ['_basicApagarZona', '_basicEncenderZona', '_basicApagarAjuste',
   '_settingsTabVisible', '_filterSettingsSidebar'],
  { dobles: ['_proPitch', '_renderSettingsTab'] })}
</script></body></html>`;

(async () => {
  let chromium;
  try { chromium = require('playwright').chromium; }
  catch (e) { console.error('playwright is not installed — run: npm install playwright'); process.exit(2); }

  const file = path.join(os.tmpdir(), 'acopio-ajustes-grises.html');
  fs.writeFileSync(file, page);

  const browser = await chromium.launch({ executablePath: CHROME });
  const p = await browser.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + file);

  const estado = () => p.evaluate(() => {
    const el = document.getElementById('settingsTabContent');
    return { gris: el.classList.contains('pro-off'), pro: el.getAttribute('data-pro') };
  });

  console.log('\n═══ 1· una pestaña de Pro sí se apaga ═══\n');

  await p.evaluate(() => _renderSettingsTab('system'));
  check('System queda en gris en la versión gratis', await estado(), { gris: true, pro: 'respaldo' });

  await p.evaluate(() => document.getElementById('settingsTabContent').click());
  check('...y al tocarla ofrece lo que falta', await p.evaluate(() => window.__ofertas), ['respaldo']);

  console.log('\n═══ 2· y al salir de ella se ENCIENDE — el fallo del vídeo ═══\n');

  await p.evaluate(() => { window.__ofertas = []; _renderSettingsTab('import'); });
  check('Import NO se queda en gris al venir desde System',
    await estado(), { gris: false, pro: null });
  await p.evaluate(() => document.getElementById('dentro').click());
  check('...y se puede tocar lo de dentro: el clic llega al botón',
    await p.evaluate(() => window.__dentroPulsado), 1);
  check('...sin que salte la oferta de Pro encima',
    await p.evaluate(() => window.__ofertas), []);

  /* Las cuatro que Jose no pudo probar por esto. Una por una, porque «Ajustes
   * funciona» en general es justo lo que parecía verdad mientras no lo era. */
  for (const tab of ['errorlog', 'locations', 'materials', 'projects']) {
    await p.evaluate((t) => { window.__dentroPulsado = 0; _renderSettingsTab(t); }, tab);
    await p.evaluate(() => document.getElementById('dentro').click());
    check('...y ' + tab + ' también',
      await p.evaluate(() => window.__dentroPulsado), 1);
  }

  console.log('\n═══ 3· volver a System la apaga otra vez ═══\n');

  /* Encender no puede ser un camino de ida: si apagar sólo funcionara la
   * primera vez, el respaldo quedaría abierto en la gratis a partir del
   * segundo paseo — el fallo contrario y más caro. */
  await p.evaluate(() => { window.__ofertas = []; _renderSettingsTab('system'); });
  check('System vuelve a estar en gris', await estado(), { gris: true, pro: 'respaldo' });
  await p.evaluate(() => document.getElementById('settingsTabContent').click());
  check('...y vuelve a ofrecer, una sola vez por clic — el oyente no se duplicó',
    await p.evaluate(() => window.__ofertas), ['respaldo']);

  console.log('\n═══ 4· un solo dueño de qué pestañas se ven ═══\n');

  const visibles = () => p.evaluate(() => {
    const r = {};
    document.querySelectorAll('.settings-tab').forEach(b => {
      r[b.getAttribute('data-tab')] = b.style.display !== 'none';
    });
    return r;
  });

  /* ADMIN EN LA EDICIÓN GRATIS: es el caso de Jose y es el que fallaba. El rol
   * dice «todo» y la edición dice «esas tres no». Antes ganaba el que corriera
   * el último, y corría el del rol. */
  await p.evaluate(() => { APP_BASIC = true; userRole = 'ADMIN'; _filterSettingsSidebar(); });
  let v = await visibles();
  check('en la gratis no se ve Permissions, aunque seas administrador', v.permissions, false);
  check('...ni Directory', v.pmdirectory, false);
  check('...ni Import', v.import, false);
  check('...pero Categories sí', v.categories, true);
  check('...y System también: lleva candado, no está escondida', v.system, true);
  check('...y el Error Log también, que es cómo se pide ayuda', v.errorlog, true);

  /* Y QUE LA REGLA DEL ROL NO SE HAYA PERDIDO POR EL CAMINO. Al juntar dos
   * reglas en una función es fácil quedarse con la nueva. */
  await p.evaluate(() => { APP_BASIC = false; userRole = 'WAREHOUSE'; _filterSettingsSidebar(); });
  v = await visibles();
  check('en Pro, quien no es administrador sigue viendo sólo el catálogo',
    [v.categories, v.projects, v.suppliers, v.locations], [true, true, true, true]);
  check('...y no Permissions', v.permissions, false);
  check('...ni System', v.system, false);

  await p.evaluate(() => { APP_BASIC = false; userRole = 'ADMIN'; _filterSettingsSidebar(); });
  v = await visibles();
  check('y en Pro un administrador las ve todas, incluidas las tres de antes',
    [v.permissions, v.pmdirectory, v.import], [true, true, true]);

  console.log('\n═══ 5· y no se abre en una pestaña que ya no está ═══\n');

  /* Cerrar Ajustes en «Import» en una copia de Pro y abrir la gratis en el
   * mismo navegador dejaba un panel en blanco sin botón al que volver: la
   * pestaña guardada vive en `sessionStorage`. El respaldo miraba sólo el rol. */
  await p.evaluate(() => { APP_BASIC = true; userRole = 'ADMIN'; _settingsTab = 'import';
                           _filterSettingsSidebar(); });
  check('una pestaña guardada que la edición no lleva cae en el catálogo',
    await p.evaluate(() => _settingsTab), 'categories');

  console.log('\n═══ 6· y nada revienta ═══\n');
  check('ningún error de JavaScript', errs, []);

  await browser.close();

  if (fails.length) {
    console.error('\nFALLÓ:\n  ' + fails.join('\n  ') + '\n');
    process.exit(1);
  }
  console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
})();
