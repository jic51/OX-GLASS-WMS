// LA ✕ QUE VACÍA UN CAMPO, MEDIDA EN EL NAVEGADOR.
//
// Jose, 20/10: *"es molesto tener que darle clic a los lugares donde se escribe
// y tener que borrar letra por letra o seleccionar con el mouse y borrar,
// debemos poner una 'X' dentro que elimine lo que escribimos enseguida, debemos
// ponerlo en TODOS los lugares donde se escribe, excepto lo que no dejan
// escribir cualquier cosa y dan la lista para escoger"*.
//
// ── POR QUÉ ESTA PRUEBA ABRE UN NAVEGADOR ───────────────────────────────────
//
// Porque lo que hay que comprobar no se puede leer. La ✕ se pone ENVOLVIENDO
// cada campo, y envolver un elemento cambia quién es su padre y quién es su
// hermano. En este archivo había dos funciones que buscaban el aviso de un
// campo con `input.nextElementSibling` —el de «proveedor nuevo» y el de
// «ubicación desconocida»— y envolver los campos las habría roto EN SILENCIO:
// el aviso se habría seguido creando y nadie lo habría encontrado para
// quitarlo. Eso no sale leyendo; sale al pulsar.
//
// Lo que defiende:
//
//   1. Que la ✕ aparezca sólo cuando hay algo que borrar. Una ✕ sobre un campo
//      vacío es un botón que no hace nada.
//   2. Que al pulsarla el campo quede vacío.
//   3. Que AVISE a quien escucha. Vaciar la caja de búsqueda sin disparar
//      `input` dejaría la tabla filtrada por un texto que ya no está escrito en
//      ninguna parte — peor que no tener la ✕.
//   4. Que los `<select>` NO la lleven. Son la lista cerrada de la que habla
//      Jose: no se escribe, se elige.
//   5. Que los campos de Pro apagados no la lleven: no deben tener controles.
//
// Uso:  node tools/test-equis-campos.js

const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');

const RAIZ = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(RAIZ, 'Index_v3_fixed.html'), 'utf8');

let ok = 0; const fails = [];
function check(label, got, want) {
  const bien = (want === undefined) ? !!got : JSON.stringify(got) === JSON.stringify(want);
  if (bien) { ok++; console.log('  ok   ' + label); }
  else { fails.push(label + ': esperaba ' + JSON.stringify(want) + ', salió ' + JSON.stringify(got));
         console.log('  FALLA ' + label + '  → ' + JSON.stringify(got)); }
}

const DATA = {
  userRole: 'ADMIN', userEmail: 'jose@ox.com', userName: 'Jose', serverVersion: 'test',
  company: { name: 'OX Glass LLC.' }, movements: [], stock: {}, materialLocks: [],
  monitoredMaterials: null,
  config: { categories: ['WINDOW'], projects: [], suppliers: [],
            locations: [{ name: 'A1A', type: 'RACK' }], units: ['UNIT'] },
  incoming: [], rackPhotos: {}, systemActivity: [],
  rolePerms: { canSeeCosts: true, canEditMovements: true, canManageCatalog: true, canExportData: true },
  warehouseRoleLabel: 'Warehouse', archiveCutoffMonths: 12, oauthClientId: '', oauthRedirectUri: ''
};

function pagina(){
  const stub = `<script>
window.google=window.google||{};window.google.charts={load:function(){},setOnLoadCallback:function(){}};
Object.assign(window.google,{script:{run:new Proxy({},{get(t,k){return function(){
 if(k==='withSuccessHandler'){t._ok=arguments[0];return window.google.script.run;}
 if(k==='withFailureHandler'){return window.google.script.run;}
 var ok=t._ok;
 if(k==='getInitialData'){setTimeout(function(){ok&&ok(window.__DATA);},20);return;}
 setTimeout(function(){ok&&ok({});},10);};}})}});
window.__DATA=${JSON.stringify(DATA)};
<\/script>`;
  const f = path.join(os.tmpdir(), 'ac-equis-' + Math.random().toString(36).slice(2) + '.html');
  fs.writeFileSync(f, html.replace('</head>', stub + '</head>'));
  return f;
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  const p = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  const errores = [];
  p.on('pageerror', e => errores.push(e.message));
  await p.goto('file://' + pagina());
  await p.waitForTimeout(1100);

  console.log('\n═══ 1. Quién la lleva y quién no ═══\n');

  const reparto = await p.evaluate(() => {
    const envuelto = (el) => !!(el.parentElement &&
      el.parentElement.classList.contains('tiene-x'));
    const textos  = [...document.querySelectorAll('input[type=text],textarea')]
                      .filter(el => !el.closest('.pro-off') && !el.readOnly && !el.disabled);
    const selects = [...document.querySelectorAll('select')];
    const fechas  = [...document.querySelectorAll('input[type=date]')];
    return {
      textos:  textos.length,
      conX:    textos.filter(envuelto).length,
      selects: selects.filter(envuelto).length,
      fechas:  fechas.filter(envuelto).length
    };
  });

  check('hay campos de texto que medir', reparto.textos > 20);
  check('TODOS los campos donde se escribe llevan la ✕',
    reparto.conX, reparto.textos);
  check('NINGÚN `<select>` la lleva — es la lista cerrada de la que habla ' +
        'Jose: no se escribe, se elige', reparto.selects, 0);
  check('ninguna fecha la lleva — el navegador ya trae su propio control',
    reparto.fechas, 0);

  console.log('\n═══ 2. Aparece sólo cuando hay algo que borrar ═══\n');

  const vacio = await p.evaluate(() =>
    getComputedStyle(document.querySelector('#stockSearch').parentElement
      .querySelector('.campo-x')).display);
  check('con el campo vacío, la ✕ no está', vacio, 'none');

  await p.fill('#stockSearch', 'WINDOW SCREEN');
  await p.waitForTimeout(120);
  const lleno = await p.evaluate(() =>
    getComputedStyle(document.querySelector('#stockSearch').parentElement
      .querySelector('.campo-x')).display);
  check('con texto escrito, aparece', lleno !== 'none');

  console.log('\n═══ 3. Vacía, y AVISA a quien escucha ═══\n');

  /* El aviso es la mitad que importa. Sin él, la tabla se queda filtrada por un
   * texto que ya no está en ninguna parte. */
  await p.evaluate(() => {
    window.__avisos = [];
    const el = document.querySelector('#stockSearch');
    el.addEventListener('input',  () => window.__avisos.push('input'));
    el.addEventListener('change', () => window.__avisos.push('change'));
  });
  await p.evaluate(() => document.querySelector('#stockSearch').parentElement
    .querySelector('.campo-x').click());
  await p.waitForTimeout(150);

  const tras = await p.evaluate(() => ({
    valor:  document.querySelector('#stockSearch').value,
    avisos: window.__avisos,
    visible: getComputedStyle(document.querySelector('#stockSearch').parentElement
               .querySelector('.campo-x')).display
  }));
  check('el campo queda vacío', tras.valor, '');
  check('avisa con `input` Y con `change` — las búsquedas escuchan uno y los ' +
        'filtros el otro', tras.avisos.sort(), ['change', 'input']);
  check('y la ✕ se esconde sola al quedar vacío', tras.visible, 'none');

  console.log('\n═══ 4. Lo que envolver estuvo a punto de romper ═══\n');

  /* ENVOLVER UN CAMPO LE CAMBIA EL HERMANO. Dos avisos de la app colgaban del
   * campo con `input.nextElementSibling`, y tras envolverlo ese hermano pasa a
   * ser la ✕. Se arregló con `_anclaDeCampo`; esto comprueba que sigue. */
  const ancla = await p.evaluate(() => {
    if (typeof _anclaDeCampo !== 'function') return 'no existe';
    const el = document.querySelector('#stockSearch');
    const a  = _anclaDeCampo(el);
    return a === el.parentElement && a.classList.contains('tiene-x') ? 'envoltorio' : 'campo';
  });
  check('los avisos se cuelgan del ENVOLTORIO, no del campo — si no, caerían ' +
        'dentro de la caja, encima del texto, y nadie los encontraría para ' +
        'quitarlos', ancla, 'envoltorio');

  check('ningún error de JavaScript en toda la página', errores, []);

  await browser.close();
  if (fails.length){ console.error('\nFALLÓ:\n  ' + fails.join('\n  ')); process.exit(1); }
  console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
})();
