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

  console.log('\n═══ 4. La ✕ va DENTRO de la caja, no al final de la fila ═══\n');

  /* Jose, 21/10, con una captura de Movements: la ✕ salía **al final de la
   * fila**, a setecientos píxeles de la caja de búsqueda, y la caja se quedaba
   * sola en su línea. Las dos cosas eran el mismo fallo.
   *
   * MEDIDO: el envoltorio valía 1004px y el campo 230px. La ✕ se coloca a la
   * derecha DEL ENVOLTORIO, así que acababa lejísimos de donde se escribe; y un
   * envoltorio de 1004px dentro de una barra flexible se lleva la fila entera.
   *
   * LA CAUSA era una comparación que contestaba «sí» cuando no se podía medir
   * nada: `el.offsetWidth >= padre.clientWidth - 4` es `0 >= -4` con la pestaña
   * escondida — que es justo cuando corre, al arrancar.
   *
   * LA INVARIANTE QUE LO CAZA TODO, y es una sola: **el campo tiene que llenar
   * su envoltorio**. Si no lo llena, la ✕ está lejos del sitio donde se
   * escribe, da igual por qué. Vale para la caja de búsqueda, para los campos
   * de una ventana y para los que se añadan mañana. */
  await p.evaluate(() => { showTab('movements', 'btn-movements'); openMoveModal('ENTRY'); });
  await p.waitForTimeout(300);

  const sueltos = await p.evaluate(() =>
    [...document.querySelectorAll('.tiene-x')]
      .filter(c => c.offsetWidth > 0)                       // sólo lo que se ve
      .map(c => ({ caja: c.offsetWidth,
                   campo: (c.querySelector('input, textarea') || {}).offsetWidth || 0,
                   id: (c.querySelector('input, textarea') || {}).id || '(sin id)' }))
      .filter(m => m.campo < m.caja - 4)
      .map(m => m.id + ' (envoltorio ' + Math.round(m.caja) + ', campo ' + Math.round(m.campo) + ')'));

  check('TODO campo visible llena su envoltorio — si no, la ✕ se dibuja a la ' +
        'derecha de un envoltorio más ancho que la caja y acaba lejos de donde ' +
        'se escribe' + (sueltos.length ? ': ' + sueltos.join(', ') : ''),
    sueltos, []);

  const busca = await p.evaluate(() => {
    const c = document.getElementById('movSearch').parentElement;
    return { ancho: c.classList.contains('ancho'), caja: c.offsetWidth };
  });
  check('y la caja de búsqueda de Movements no se lleva la fila entera — por ' +
        'eso se quedaba sola arriba (mide ' + Math.round(busca.caja) + 'px)',
    busca.caja > 0 && busca.caja < 400, true);

  console.log('\n═══ 5. Lo que envolver estuvo a punto de romper ═══\n');

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
