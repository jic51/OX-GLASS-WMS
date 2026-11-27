// MU-02 · AJUSTES SE PONE AL DÍA SIN SALIR Y VOLVER A ENTRAR.
//
// Jose, 25/11: *"si elimino un material en Settings, y luego voy a Locations
// esa locación aún no actualiza. Debemos actualizar todo, pero —una
// corrección— debemos actualizar todo, PRIMERO LO QUE EL USUARIO ESTÁ VIENDO,
// LUEGO LO DEMÁS, así todo se actualiza sin tener que salir y volver a
// entrar."*
//
// ── POR QUÉ ESTA PRUEBA ABRE UN NAVEGADOR ──────────────────────────────────
//
// Porque lo que falla es ESTADO ACUMULADO AL USAR LA PANTALLA, y hay cuatro
// cosas aquí que un doble contestaría a gusto del que pregunta:
//
//   • `document.activeElement` — el campo en el que estás escribiendo.
//   • `scrollTop` — por dónde vas en una lista de cuarenta estantes.
//   • `classList.contains('show')` — si la ventana está abierta.
//   • y sobre todo: **si el número que hay en pantalla cambió.**
//
// Lo último es el motivo de verdad. Esta misma sesión descubrió que
// `test-cerrar-y-seguir` pasó TRES versiones sobre una fila gris que no
// existía, porque su página de mentira contestaba «sí, aquí está» a cualquier
// `getElementById`. Así que aquí no se pregunta si se llamó a una función: se
// mueve el stock, se corre `renderAll()`, y **se lee el texto que quedó en el
// HTML del panel**. Si el número no cambió, la prueba falla, se haya llamado a
// quien se haya llamado.
//
// ── LO QUE SE LEVANTA DE VERDAD Y LO QUE SE FINGE ──────────────────────────
//
// De verdad: toda la cadena del panel de Locations —`_renderLocationsTab`,
// `_redrawLocGroups`, `_renderLocGroup`, `_locUsage`, `_locWhyKept`— más las
// cuatro piezas nuevas y `renderAll`. O sea: el dato se cambia en `stockData`,
// que es donde lo pone el servidor, y la cuenta la hace el producto.
//
// Fingido: sólo lo que sale de la pantalla (las llamadas a Apps Script) y lo
// que ata ratones y arrastres.
//
// Uso:  NODE_PATH="$(npm root -g)" CHROME_PATH=$(ls -d /opt/pw-browsers/chromium-*/chrome-linux*/chrome|head -1) \
//       node tools/test-ajustes-al-dia.js

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

/* ── 0 · LO QUE SE COMPRUEBA LEYENDO EL ARCHIVO ────────────────────────────
 *
 * Dos cosas que el navegador no puede ver porque son de dónde VIVE la llamada,
 * no de qué hace. Si `renderAll` dejara de llamar a esto, todo lo de abajo
 * seguiría pasando —las funciones funcionan— y el fallo de Jose volvería
 * entero. */
console.log('\n═══ 0 · LA LLAMADA ESTÁ EN «renderAll», QUE ES «LOS DATOS CAMBIARON» ═══\n');

const srcRenderAll = A.fnSrc(SRC, 'renderAll') || '';
check('`renderAll` llama a `_refrescarAjustesAbiertos`',
      /_refrescarAjustesAbiertos\s*\(/.test(srcRenderAll));
check('...y en su propio `try`: un tropiezo repintando Ajustes no puede ' +
      'llevarse por delante un borrado, que llama a `renderAll` a pelo',
      /try\s*\{[^}]*_refrescarAjustesAbiertos/.test(A.sinComentarios(srcRenderAll)));

/* La firma se apunta en `_renderSettingsTab`, que es la ÚNICA puerta por la que
 * pasan los trece paneles. Apuntarla en otro sitio sería la cuarta lista de
 * paneles escrita a mano en este archivo. */
const srcRST = A.sinComentarios(A.fnSrc(SRC, '_renderSettingsTab') || '');
check('la firma se apunta dentro de `_renderSettingsTab`, la única puerta de los 13 paneles',
      /_firmaAjustes\s*=\s*_firmaDeAjustes\s*\(/.test(srcRST));

/* Y la firma NO puede ser una lista de paneles: eso es justo lo que se evitó. */
const srcFirma = A.sinComentarios(A.fnSrc(SRC, '_firmaDeAjustes') || '');
check('la firma usa el sello del servidor (`_dataStamp`), no una lista de globales por panel',
      /_dataStamp/.test(srcFirma));
check('...y el catálogo, que puede cambiar sin que el sello se mueva',
      /_settingsData/.test(srcFirma));

/* ── La página ───────────────────────────────────────────────────────────── */
const nav = (SRC.match(/<nav class="settings-sidebar"[\s\S]*?<\/nav>/) || [''])[0];
if (!nav) { console.error('no se encontró la barra lateral de ajustes'); process.exit(2); }

const page = `<!doctype html><html><head><meta charset="utf-8">
<style>
  .overlay{display:none}
  .overlay.show{display:block}
  /* Un alto fijo para que el panel pueda tener scroll de verdad. */
  #settingsTabContent{height:120px;overflow:auto}
</style></head><body>

<div class="overlay" id="settingsOverlay">
  ${nav.replace(/onclick="[^"]*"/g, '')}
  <div id="settingsTabContent"></div>
</div>
<div id="statsRow"></div>

<script>
/* ── El estado que pone el servidor ──────────────────────────────────────── */
var _dataStamp   = 'sello-1';
var _settingsTab = 'locations';
var userRole     = 'ADMIN';
var APP_BASIC    = false;
var movements    = [];
var materialLocks = [];
var rackPhotos   = {};
var config       = {};
var _matListAll  = [];
var _locLayout   = [];
var _locExtraGroups = [];
var _dirtyTabs   = {};
var _TAB_RENDERS = {};   /* vacío: aquí no se mide el repintado de las secciones */

/* LOS DOS var DE MÓDULO QUE EL ANDAMIO NO LEVANTA, y que costaron un rato.
 *
 * A.levantar arrastra FUNCIONES, no los var sueltos del archivo. Sin estas dos
 * líneas, _redrawSettingsWhenFree leía _settingsRedrawPending sin que existiera
 * y lanzaba un ReferenceError —que el try de renderAll se tragaba en un
 * console.error—, así que la comprobación de «el repintado se aplazó» pasaba
 * porque NO PASABA NADA. Es la misma trampa de siempre con otro traje: algo que
 * contesta lo que la prueba quiere oír. De ahí que ahora la prueba falle
 * también con un console.error, abajo. */
var _settingsRedrawPending = false;
var _firmaAjustes = '';

var _settingsData = {
  locations:     ['A1A', 'A1B', 'B1A'],
  locationTypes: { A1A: 'RACK', A1B: 'RACK', B1A: 'RACK' },
  categories: [], projects: [], suppliers: []
};

/* El almacén: 40 unidades de WINDOW SCREEN en A1A. La forma es la de verdad —
   es lo que lee \`_locUsage\`. */
var stockData = {
  'WINDOWS|||WINDOW SCREEN': { warehouseLocs: { A1A: 40 } }
};

/* ── Lo que se finge, y nada más ─────────────────────────────────────────── */
window.__getSettings = 0;
window.__matList     = 0;

function _loadSettings(o){ window.__getSettings++; }          // la llamada a Apps Script
function _loadMatList(o){ window.__matList++; }               // idem
function _syncSettingsTabButtons(t){}
function _basicApagarAjuste(t){}
function _equisTrasPintar(){}
function _limpiarAvisoAjustes(){}
function _clearRowModes(){}
function _refreshMorningPopup(){}
function _activeTab(){ return 'dashboard'; }
function _wireLocDnD(){}
function _wireLocMerge(){}
function _locShowNew(k){}
function _locCreate(){}
function _reservasDeEstante(r){ return []; }
function _renderMaterialsTab(){ document.getElementById('settingsTabContent').innerHTML = 'MATERIALS'; }
function _renderPricesTab(){}
function _renderErrorLogTab(){}
function _renderSystemTab(){}
function _renderPmDirectoryTab(){}
function _renderImportTab(){}
function _renderCompanyTab(){}
function _renderPermissionsTab(){}
function _renderCategoriesTab(i){}
function _renderSimilarGroups(){ return ''; }
function _wireSimilarGroups(){}
function _cfgPickWire(){}
function _cfgAdd(t){}
function _he(s){ return String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function _escAttr(s){ return _he(s).replace(/\\n/g,'&#10;'); }

${A.constantes(SRC, ['LOC_DEFAULT_GROUP', 'LOC_ARCHIVED_GROUP'])}

${A.levantar(SRC,
  ['renderAll', '_refrescarAjustesAbiertos', '_ajustesAbiertos', '_firmaDeAjustes',
   '_repintarAjustesSinSaltar', '_redrawSettingsWhenFree', '_settingsFocusInPanel',
   '_renderSettingsTab', '_renderLocationsTab', '_redrawLocGroups', '_renderLocGroup',
   '_locUsage', '_locWhyKept', '_locTypesInOrder', 'switchSettingsTab'],
  { dobles: ['_loadSettings', '_loadMatList', '_syncSettingsTabButtons',
             '_basicApagarAjuste', '_equisTrasPintar', '_limpiarAvisoAjustes',
             '_clearRowModes', '_refreshMorningPopup', '_activeTab',
             '_wireLocDnD', '_wireLocMerge', '_reservasDeEstante',
             '_renderMaterialsTab', '_renderPricesTab', '_renderErrorLogTab',
             '_renderSystemTab', '_renderPmDirectoryTab', '_renderImportTab',
             '_renderCompanyTab', '_renderPermissionsTab', '_renderCategoriesTab',
             '_renderSimilarGroups', '_wireSimilarGroups', '_cfgPickWire',
             '_he', '_escAttr'] })}
</script></body></html>`;

(async () => {
  let chromium;
  try { chromium = require('playwright').chromium; }
  catch (e) { console.error('playwright is not installed — run: npm install playwright'); process.exit(2); }

  const file = path.join(os.tmpdir(), 'acopio-ajustes-al-dia.html');
  fs.writeFileSync(file, page);

  const browser = await chromium.launch({ executablePath: CHROME });
  const p = await browser.newPage({ viewport: { width: 1100, height: 700 } });
  /* LOS ERRORES COMIDOS TAMBIÉN CUENTAN. `renderAll` envuelve la llamada a
     Ajustes en un `try` a propósito —un tropiezo repintando no puede llevarse
     por delante un borrado— pero eso convierte un fallo en una línea de
     consola. Si la prueba sólo mirara `pageerror`, un crash ahí dentro se
     vería exactamente igual que «todo bien». */
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file://' + file);

  /* ── 1 · CON LA VENTANA CERRADA ESTO NO CUESTA NADA ───────────────────── */
  console.log('\n═══ 1 · CON AJUSTES CERRADO NO SE PIDE NI SE REPINTA NADA ═══\n');

  const cerrada = await p.evaluate(() => {
    window.__getSettings = 0;
    renderAll();
    return { pedidas: window.__getSettings,
             panel: document.getElementById('settingsTabContent').innerHTML };
  });
  check('con la ventana cerrada no se llama a `getSettings`', cerrada.pedidas, 0);
  check('...y el panel sigue vacío', cerrada.panel, '');

  /* ── 2 · EL FALLO DE JOSE, MEDIDO EN LA PANTALLA ──────────────────────── */
  console.log('\n═══ 2 · EL NÚMERO DE LA PANTALLA CAMBIA SIN CERRAR LA VENTANA ═══\n');

  /* SE LEE EL MOTIVO DE **ESE** ESTANTE, no «el panel contiene el texto».
     El primer intento de esta prueba preguntaba por todo el HTML, y pasaba
     igual cuando las 40 unidades se habían mudado a otra fila: el texto seguía
     ahí, en otro sitio. Es la misma trampa que la fila fantasma de la v16.4 —
     medir que algo existe en vez de medir que está donde toca. */
  const motivo = (nombre) => p.evaluate((n) => {
    const el = document.querySelector('.loc-item[data-name="' + n + '"] .loc-why');
    if (!el) return null;
    /* Sólo la primera mitad: el motivo lleva pegado un «— archive it instead
       of deleting» que es consejo, no dato. Comparar la frase entera ataría
       esta prueba a la redacción, y entonces mejorar una frase rompería una
       prueba que habla de números. */
    return String(el.getAttribute('title') || '').split(' — ')[0];
  }, nombre);

  await p.evaluate(() => {
    document.getElementById('settingsOverlay').classList.add('show');
    switchSettingsTab('locations');           // como al abrir la ventana
  });
  check('al pintar Locations, A1A dice sus 40 unidades', await motivo('A1A'), 'Has 40 in stock');
  check('...y B1A no dice nada, que es lo que hay en B1A', await motivo('B1A'), null);

  /* AHORA SE MUEVE EL ALMACÉN, como lo movería el servidor: el material sale de
     A1A y el sello cambia. Nada más. Y se corre `renderAll`, que es lo que
     corre de verdad cuando llega una carga. */
  const pedidas = await p.evaluate(() => {
    stockData['WINDOWS|||WINDOW SCREEN'].warehouseLocs = { A1A: 0, B1A: 40 };
    _dataStamp = 'sello-2';
    window.__getSettings = 0;
    renderAll();
    return window.__getSettings;
  });
  check('después de `renderAll`, A1A ya no dice nada  ← el fallo de Jose',
        await motivo('A1A'), null);
  check('...y B1A dice las 40: el panel leyó el almacén nuevo, no una foto',
        await motivo('B1A'), 'Has 40 in stock');
  check('«luego lo demás»: el catálogo se va a buscar en silencio', pedidas, 1);

  /* ── 3 · SIN CAMBIOS NO SE REPINTA ────────────────────────────────────── */
  console.log('\n═══ 3 · UNA CARGA QUE NO TRAE NADA NUEVO NO TOCA EL PANEL ═══\n');

  const quieto = await p.evaluate(() => {
    const pane = document.getElementById('settingsTabContent');
    pane.setAttribute('data-marca', 'sin-tocar');   // se perdería en un repintado
    renderAll();
    return pane.getAttribute('data-marca');
  });
  check('mismo sello y mismo catálogo: el panel no se rehace', quieto, 'sin-tocar');

  /* ── 4 · UN REFRESCO NO TE QUITA LA CASILLA DE DEBAJO ─────────────────── */
  console.log('\n═══ 4 · ESCRIBIENDO, EL REFRESCO ESPERA ═══\n');

  const escribiendo = await p.evaluate(() => {
    switchSettingsTab('locations');
    /* La caja de «crear locación» vive dentro de una fila oculta, así que hay
       que abrir la FILA: enfocar algo dentro de un `display:none` no hace
       nada, y la prueba se quedaría midiendo un foco que nunca se puso. */
    const fila = document.getElementById('locNewRow');
    const caja = document.getElementById('locNewVal');
    if (!fila || !caja) return { sinCaja: true };
    fila.style.display = '';
    caja.focus();
    caja.value = 'A6';                       // medio nombre escrito
    stockData['WINDOWS|||WINDOW SCREEN'].warehouseLocs = { A1A: 7 };
    _dataStamp = 'sello-3';
    renderAll();
    const viva = document.getElementById('locNewVal');
    return { foco: document.activeElement === viva, texto: viva ? viva.value : null };
  });
  check('la casilla no desapareció', escribiendo.sinCaja ? false : true);
  check('...sigue teniendo el foco', escribiendo.foco, true);
  check('...y las letras a medio escribir están ahí', escribiendo.texto, 'A6');
  check('...y el repintado SE APLAZÓ, no se perdió: el número viejo sigue',
        await motivo('A1A'), null);

  await p.evaluate(() => { document.getElementById('locNewVal').blur(); });
  check('al soltar la casilla, el repintado aplazado llega',
        await motivo('A1A'), 'Has 7 in stock');

  /* ── 5 · EL SCROLL SE QUEDA DONDE ESTABA ──────────────────────────────── */
  console.log('\n═══ 5 · UN REFRESCO TE DEJA DONDE ESTABAS; UN CAMBIO DE SOLAPA, ARRIBA ═══\n');

  const scroll = await p.evaluate(() => {
    /* Cuarenta estantes para que haya de dónde bajar. */
    _settingsData.locations = [];
    _settingsData.locationTypes = {};
    for (let i = 1; i <= 40; i++) {
      const n = 'A' + i + 'A';
      _settingsData.locations.push(n);
      _settingsData.locationTypes[n] = 'RACK';
    }
    _dataStamp = 'sello-4';
    switchSettingsTab('locations');
    const pane = document.getElementById('settingsTabContent');
    pane.scrollTop = 60;
    const puesto = pane.scrollTop;
    stockData['WINDOWS|||WINDOW SCREEN'].warehouseLocs = { A1A: 9 };
    _dataStamp = 'sello-5';
    renderAll();
    return { puesto: puesto,
             tras: document.getElementById('settingsTabContent').scrollTop };
  });
  check('había scroll que perder', scroll.puesto > 0);
  check('el refresco repintó', await motivo('A1A'), 'Has 9 in stock');
  check('...y dejó el scroll donde estaba', scroll.tras, scroll.puesto);

  const cambioSolapa = await p.evaluate(() => {
    const pane = document.getElementById('settingsTabContent');
    pane.scrollTop = 60;
    const puesto = pane.scrollTop;
    switchSettingsTab('locations');          // cambio de solapa a mano
    return { puesto: puesto,
             tras: document.getElementById('settingsTabContent').scrollTop };
  });
  check('y el cambio de solapa también tenía scroll que perder', cambioSolapa.puesto > 0);
  check('...pero SÍ empieza por arriba: acabas de llegar', cambioSolapa.tras, 0);

  /* ── 6 · LA TERCERA OLLA: LA LISTA DE MATERIALS ───────────────────────── */
  console.log('\n═══ 6 · MATERIALS TIENE SU PROPIA LLAMADA, Y TAMBIÉN SE REFRESCA ═══\n');

  const mats = await p.evaluate(() => {
    /* `switchSettingsTab` y no `_renderSettingsTab`: el que mueve `_settingsTab`
       es el primero, y es ese global el que decide de qué panel se refresca la
       olla. Llamando al segundo a secas la prueba pintaría Materials con
       `_settingsTab` diciendo todavía «locations». */
    switchSettingsTab('materials');
    window.__matList = 0;
    _dataStamp = 'sello-6';
    renderAll();
    const enMaterials = window.__matList;
    switchSettingsTab('locations');
    window.__matList = 0;
    _dataStamp = 'sello-7';
    renderAll();
    return { enMaterials: enMaterials, enLocations: window.__matList };
  });
  check('en la solapa de Materials se refresca su lista', mats.enMaterials, 1);
  check('...y en cualquier otra NO: una llamada por panel que no se mira es cuota tirada',
        mats.enLocations, 0);

  /* ── 7 · NINGÚN ERROR EN LA CONSOLA ──────────────────────────────────── */
  console.log('\n═══ 7 · SIN ERRORES DE JAVASCRIPT ═══\n');
  check('la página no lanzó ningún error', errs, []);

  await browser.close();

  console.log(fails.length
    ? '\n✗ ' + fails.length + ' fallos · ' + ok + ' comprobaciones\n'
    : '\n✓ todo bien · ' + ok + ' comprobaciones\n');
  process.exit(fails.length ? 1 : 0);
})();
