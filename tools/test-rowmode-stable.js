// NADA SE MUEVE AL PULSAR UN BOTÓN.
//
// Jose cazó los botones de Edit y Delete saltando a otro sitio en el instante en
// que encendía el modo Edit. La causa de entonces: el texto de ayuda que
// aparecía al lado ("Click the pencil on a row...") compartía línea con "⚙
// Columns", y en cuanto no cabía, empujaba la barra entera —botones incluidos—
// a una fila nueva de la barra de herramientas.
//
// Se arregló dándoles una fila propia. Y en la v11.59 se arregló DE VERDAD, con
// la corrección de Jose, que era mejor que la mía:
//
//   "podemos modificar la app para que nada se mueva al dar clic en el botón...
//    hacer que el encabezado mida lo mismo antes y después... poner el texto
//    explicativo en el icono i"
//
// La mía escondía el problema debajo de un panel flotante; la suya lo quita. Así
// que ahora Edit y Delete están EN la fila de Columns, siempre puestos y sólo
// apagados, el texto largo vive en el icono ⓘ, y no hay ningún modo que haga
// crecer ni encoger nada.
//
// LO QUE ESTE ARCHIVO MIDE, y es una medida y no una lectura: que marcar una
// casilla no mueva ni un píxel de la fila de herramientas ni de la tabla. Un
// botón que aparece es un botón que mueve la página.
//
// Usage:  node tools/test-rowmode-stable.js [path/to/Index_v3_fixed.html]

const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');

const SRC = process.argv[2] || path.join(__dirname, '..', 'Index_v3_fixed.html');
let html = fs.readFileSync(SRC, 'utf8');

// Matching the real APP_VERSION, not a literal 'test' string, so the
// version-mismatch banner never appears — at some widths it's tall enough
// to sit over the topbar and block Playwright's clicks, a distraction from
// what this file is actually testing.
const versionMatch = html.match(/var APP_VERSION\s*=\s*'([^']+)'/);
const APP_VERSION = versionMatch ? versionMatch[1] : 'test';

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
 serverVersion:'${APP_VERSION}', company:{name:'OX Glass LLC.',domain:'ox-glass.com',logo:''},
 movements:[{rowIdx:2,movId:'M-A',moveType:'ENTRY',dateRec:'2026-08-01',category:'WINDOW',name:'GLASS',qty:10,unit:'pcs',destLoc:'A1A',timestamp:'2026-08-01 10:00',userEmail:'jose@ox-glass.com'},{rowIdx:3,movId:'M-B',moveType:'EXIT',dateRec:'2026-08-02',category:'WINDOW',name:'GLASS',qty:4,unit:'pcs',sourceLoc:'A1A',timestamp:'2026-08-02 10:00',userEmail:'jose@ox-glass.com'}],
 stock:{ 'WINDOW|||GLASS': { name:'GLASS', category:'WINDOW', unit:'pcs', warehouseQty:10, siteQty:0,
   availableQty:10, wastedQty:0, reservedQty:0, matId:'WINDOW|||GLASS', warehouseLocs:{ 'A1A': 10 }, status:'OK' } },
 monitoredMaterials:null,
 config:{ categories:['WINDOW'], projects:['SOME NEW PROJECT'], suppliers:[],
   locations:[{name:'A1A',group:'RACKS'}], units:['pcs'] },
 incoming:[], rackPhotos:{}, systemActivity:[], rolePerms:{canSeeCosts:false,canEditMovements:true,canManageCatalog:false,canExportData:true},
 warehouseRoleLabel:'Warehouse', archiveCutoffMonths:12, oauthClientId:'', oauthRedirectUri:'' };
</script>`;
html = html.replace('</head>', stub + '</head>');
const f = path.join(os.tmpdir(), 'acopio-rowmode-stable.html');
fs.writeFileSync(f, html);

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const pageErrors = [];

  const rect = (page, sel) => page.evaluate(s => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, height: r.height };
  }, sel);

  const same = (a, b) => a && b && Math.abs(a.top - b.top) < 1 && Math.abs(a.left - b.left) < 1;

  for (const w of [375, 500, 1280]) {
    console.log('\nScenario: ' + w + 'px — ticking a row must not move anything');
    const page = await browser.newPage({ viewport: { width: w, height: 800 } });
    page.on('pageerror', e => pageErrors.push(w + ': ' + e.message));
    await page.goto('file://' + f);
    await page.waitForTimeout(300);
    await page.click('#btn-movements');
    await page.waitForTimeout(250);

    // Con nada marcado, los botones YA ESTÁN. Ésa es la mitad del arreglo: no
    // hay nada que aparezca.
    const editBefore = await rect(page, '#btnMovEdit');
    const delBefore  = await rect(page, '#btnMovDel');
    const barBefore  = await rect(page, '#movColBar');
    const tblBefore  = await rect(page, '#tableContainer');
    check('Edit y Delete están puestos antes de marcar nada', !!editBefore && !!delBefore);
    check('...y apagados, que es lo que dice que hace falta elegir algo',
      await page.evaluate(() => document.getElementById('btnMovEdit').disabled &&
                                document.getElementById('btnMovDel').disabled));

    await page.click('#tableContainer .mov-select-cb');
    await page.waitForTimeout(150);

    const editAfter = await rect(page, '#btnMovEdit');
    const barAfter  = await rect(page, '#movColBar');
    const tblAfter  = await rect(page, '#tableContainer');
    check('el botón Edit no se mueve al marcar (' + editBefore.top.toFixed(1) +
          ' → ' + editAfter.top.toFixed(1) + ')', same(editBefore, editAfter));
    check('la fila de herramientas mantiene su alto (' + barBefore.height.toFixed(1) +
          ' → ' + barAfter.height.toFixed(1) + ')',
      Math.abs(barBefore.height - barAfter.height) < 1);
    check('Y LA TABLA NO SE MUEVE — que es lo que se ve desde la silla de Jose',
      same(tblBefore, tblAfter));

    check('con una marcada, Edit se enciende',
      await page.evaluate(() => !document.getElementById('btnMovEdit').disabled));
    check('...y Delete también',
      await page.evaluate(() => !document.getElementById('btnMovDel').disabled));

    // Dos marcadas: Delete sigue valiendo, Edit no. No hay un formulario que
    // pueda decir la verdad sobre dos movimientos a la vez.
    await page.evaluate(() => {
      const cbs = document.querySelectorAll('#tableContainer .mov-select-cb');
      cbs[1].click();
    });
    await page.waitForTimeout(150);
    check('con dos marcadas Edit se apaga, y lo dice al pasar el ratón',
      await page.evaluate(() => {
        const b = document.getElementById('btnMovEdit');
        return b.disabled && /one movement at a time/i.test(b.title || '');
      }));
    check('...pero Delete sigue encendido: borrar varias sí tiene sentido',
      await page.evaluate(() => !document.getElementById('btnMovDel').disabled));
    check('y la fila SIGUE sin moverse con dos marcadas',
      same(editBefore, await rect(page, '#btnMovEdit')));

    // La casilla general, y su estado intermedio.
    check('la casilla general se pone en "todas"',
      await page.evaluate(() => document.getElementById('movSelAll').checked === true));
    await page.evaluate(() => document.querySelectorAll('#tableContainer .mov-select-cb')[1].click());
    await page.waitForTimeout(120);
    check('al desmarcar una queda en el estado INTERMEDIO — "algunas" es una ' +
          'respuesta distinta de "ninguna" y de "todas"',
      await page.evaluate(() => {
        const a = document.getElementById('movSelAll');
        return a.indeterminate === true && a.checked === false;
      }));

    // Y el panel de Columns, que era el que empujaba todo.
    const colBefore = await rect(page, '#btnMovEdit');
    await page.click('#btnEditCols_mov');
    await page.waitForTimeout(200);
    check('abrir Columns tampoco mueve Edit — el texto largo vive en el ⓘ, que ' +
          'es la corrección de Jose y mejor que mi panel flotante',
      same(colBefore, await rect(page, '#btnMovEdit')));
    check('y el botón de guardar dice "Save", no "Done"',
      await page.evaluate(() => (document.getElementById('btnColDone_mov').textContent || '').trim() === 'Save'));

    await page.close();
  }

  check('no page errors', pageErrors.length === 0);
  if (pageErrors.length) pageErrors.forEach(e => console.log('  PAGE ERROR:', e));

  await browser.close();
  console.log('\nnothing moves when you click: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
  process.exit(fail === 0 ? 0 : 1);
})();
