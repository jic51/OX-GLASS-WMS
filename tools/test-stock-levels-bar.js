// CINCO NÚMEROS EN UN REPARTO, Y EL REPARTO TIENE QUE CERRAR.
//
// Idea de Jose, 2026-09-09:
//
//   "una barra de 2 colores que muestra la cantidad que hay con la cantidad que
//    ya se fue, y si hay reservas también metemos esa cantidad ahí… así unimos
//    IN WAREHOUSE, USED, AVAILABLE, WASTE y RESERVED… al hacer hover podemos
//    mostrar datos o detalles, como el detalle de por qué se reservó."
//
// LO PRIMERO QUE SE HIZO FUE COMPROBAR QUE LAS PARTES SUMAN, y no sumaban como
// él las describió. Las dos cosas que salieron son la diferencia entre una
// barra verdadera y una que lo parece:
//
//   1. RESERVED ESTÁ DENTRO DE IN WAREHOUSE. El motor hace
//      availableQty = warehouseQty − reservedQty. Dibujar
//      [In Warehouse][Used][Reserved] contaría lo reservado DOS VECES y la
//      barra saldría más larga que la realidad. El reparto que no se pisa es
//      [Available | Reserved | Used | Wasted].
//
//   2. EL TOTAL NO PUEDE LLAMARSE "lo que el almacén recibió". ADJUST sube o
//      baja warehouseQty SIN CONTRAPARTIDA — a propósito, porque un recuento
//      corregido no es material recibido ni desperdiciado. Así que
//      Warehouse + Used + Wasted sólo es igual a lo recibido si nunca hubo un
//      ajuste, y en un almacén de verdad siempre lo hay.
//
// Jose eligió el total que SÍ cierra siempre —lo que hoy tenemos contado— y que
// Waste vaya dentro.
//
// LO QUE ESTE ARCHIVO PROTEGE:
//
//   1. Que los trozos SUMEN el total. Una barra cuyos trozos no llegan al borde
//      es peor que cinco números sueltos: parece exacta y no lo es.
//   2. Que lo reservado NO se cuente dos veces. Es el fallo que se evitó, y el
//      único que un ojo no detectaría mirando la pantalla.
//   3. Que el ancho de cada trozo sea su proporción DE VERDAD, medida en
//      píxeles en un navegador.
//   4. Que el número siga estando. En un almacén la pregunta es "¿me alcanza
//      para 40?", y eso no se contesta mirando una proporción.
//   5. Que el hover diga los números Y por qué está reservado.
//   6. Que el orden de columnas de cada persona se traduzca solo.
//   7. Que la barra sólo herede el "escondido" si estaban escondidas LAS CINCO.
//
// Uso:  node tools/test-stock-levels-bar.js

const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

// warehouseQty INCLUYE reservedQty, igual que en el servidor. Si esta prueba
// los pusiera separados estaría midiendo un modelo inventado.
function mat(name, wh, site, waste, resv){
  return { matId: 'window|||' + name.toLowerCase(), name: name, category: 'WINDOW',
           project: '', unit: 'UNIT',
           warehouseQty: wh, siteQty: site, wastedQty: waste, reservedQty: resv,
           availableQty: Math.max(0, wh - resv), totalQty: wh + site,
           warehouseLocs: { A1A: wh }, status: 'OK' };
}

const DATA = {
  userRole: 'ADMIN', userEmail: 'jose@ox.com', userName: 'Jose', serverVersion: 'test',
  company: { name: 'OX Glass LLC.' }, movements: [],
  stock: {
    // 100 en almacén (30 de ellos reservados), 50 fuera, 10 de baja.
    // Reparto: 70 disponible + 30 reservado + 50 fuera + 10 baja = 160.
    'window|||mh 145': mat('MH 145', 100, 50, 10, 30),
    // Sin reservas ni bajas: dos trozos.
    'window|||mh 200': mat('MH 200', 80, 20, 0, 0),
    // Nada en ninguna parte.
    'window|||mh vacio': mat('MH VACIO', 0, 0, 0, 0)
  },
  reservations: [
    { id:'R1', category:'WINDOW', name:'MH 145', project:'SUNBRIDGE PHASE 1', qty:20,
      by:'jose@ox.com', date:'09/01/2026', status:'Active', release:'' },
    { id:'R2', category:'WINDOW', name:'MH 145', project:'KOTTER RESIDENCE', qty:10,
      by:'kim@ox.com', date:'09/02/2026', status:'Active', release:'' },
    // Una liberada: no cuenta y no debe salir en la ayuda.
    { id:'R3', category:'WINDOW', name:'MH 145', project:'VIEJA', qty:99,
      by:'x@ox.com', date:'08/01/2026', status:'Released', release:'08/20/2026' }
  ],
  monitoredMaterials: null,
  config: { categories:['WINDOW'], projects:[], suppliers:[],
            locations:[{ name:'A1A', type:'RACK' }], units:['UNIT'] },
  incoming: [], rackPhotos: {}, systemActivity: [],
  rolePerms: { canSeeCosts:false, canEditMovements:true, canManageCatalog:true, canExportData:true },
  warehouseRoleLabel: 'Warehouse', archiveCutoffMonths: 12, oauthClientId:'', oauthRedirectUri:''
};

function paginaCon(pre){
  const stub = `<script>
window.google=window.google||{}; window.google.charts={load:function(){},setOnLoadCallback:function(){}};
Object.assign(window.google,{script:{run:new Proxy({},{get(t,k){
  return function(){
    if(k==='withSuccessHandler'){ t._ok=arguments[0]; return window.google.script.run; }
    if(k==='withFailureHandler'){ return window.google.script.run; }
    var ok=t._ok;
    if(k==='getInitialData'){ setTimeout(function(){ ok && ok(window.__DATA); },20); return; }
    setTimeout(function(){ ok && ok({}); },20);
  };
}})}});
window.__DATA=${JSON.stringify(DATA)};
${pre || ''}
<\/script>`;
  const out = html.replace('</head>', stub + '</head>');
  const f = path.join(os.tmpdir(), 'ac-levels-' + Math.random().toString(36).slice(2) + '.html');
  fs.writeFileSync(f, out);
  return f;
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  const errores = [];

  async function abrir(pre){
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on('pageerror', e => errores.push(e.message));
    await page.goto('file://' + paginaCon(pre));
    await page.waitForTimeout(600);
    return page;
  }

  const page = await abrir();

  console.log('\n═══ el reparto cierra ═══\n');

  const fila = await page.evaluate(() => {
    const tds = document.querySelectorAll('#stockBody td.sc-levels');
    const td  = tds[0];
    const bar = td.querySelector('.lv-bar');
    const trozos = Array.prototype.map.call(bar.querySelectorAll('i'), i => ({
      clase: i.className,
      ancho: i.getBoundingClientRect().width
    }));
    return {
      cuantas: tds.length,
      trozos: trozos,
      anchoBarra: bar.getBoundingClientRect().width,
      numero: td.querySelector('.lv-num').textContent,
      total: td.querySelector('.lv-of').textContent,
      ayuda: td.querySelector('.lv-wrap').getAttribute('data-tip')
    };
  });

  check('hay una celda de barra por material', fila.cuantas === 3, fila.cuantas);

  // 70 disponible + 30 reservado + 50 fuera + 10 baja = 160.
  const suma = fila.trozos.reduce((a, t) => a + t.ancho, 0);
  check('los cuatro trozos están dibujados', fila.trozos.length === 4, fila.trozos.map(t => t.clase));
  check('LOS TROZOS SUMAN EL ANCHO DE LA BARRA — una barra cuyos trozos no ' +
        'llegan al borde parece exacta y no lo es',
        Math.abs(suma - fila.anchoBarra) < 1.5, { suma, barra: fila.anchoBarra });

  // Y las proporciones, en píxeles: 70/160, 30/160, 50/160, 10/160.
  const esperado = { 'lv-avail': 70/160, 'lv-resv': 30/160, 'lv-used': 50/160, 'lv-waste': 10/160 };
  let bien = 0;
  fila.trozos.forEach(t => {
    const clave = t.clase.trim();
    const prop = t.ancho / fila.anchoBarra;
    if (Math.abs(prop - esperado[clave]) < 0.01) bien++;
    else console.log('       ', clave, 'esperado', esperado[clave].toFixed(3), 'medido', prop.toFixed(3));
  });
  check('y cada uno mide su proporción de verdad', bien === 4, bien);

  console.log('\n═══ lo reservado NO se cuenta dos veces ═══\n');
  {
    // El almacén tiene 100 (30 reservados). Si la barra dibujara
    // [In Warehouse=100][Used=50][Reserved=30][Waste=10] el total sería 190.
    const anchoResv = fila.trozos.find(t => /lv-resv/.test(t.clase)).ancho;
    const anchoAvail = fila.trozos.find(t => /lv-avail/.test(t.clase)).ancho;
    check('disponible + reservado ES lo que hay en el almacén (100 de 160)',
          Math.abs((anchoAvail + anchoResv) / fila.anchoBarra - 100/160) < 0.01,
          { avail: anchoAvail, resv: anchoResv, barra: fila.anchoBarra });
    check('el total dice 160, no 190 — que es lo que saldría contando lo ' +
          'reservado dos veces', /of 160/.test(fila.total), fila.total);
  }

  console.log('\n═══ el número sigue estando ═══\n');
  check('delante va el DISPONIBLE, que es sobre lo que se puede actuar',
        fila.numero.trim() === '70', fila.numero);
  check('y al lado, de cuánto sale', /of 160/.test(fila.total), fila.total);

  console.log('\n═══ el hover dice los números y el porqué ═══\n');
  check('la ayuda nombra los cuatro repartos',
        /Available: 70/.test(fila.ayuda) && /Reserved: 30/.test(fila.ayuda) &&
        /Out on a job: 50/.test(fila.ayuda) && /Written off: 10/.test(fila.ayuda), fila.ayuda);
  check('y el total con su unidad',        /Accounted for: 160 UNIT/.test(fila.ayuda));
  check('POR QUÉ ESTÁ RESERVADO, con la obra y quién',
        /SUNBRIDGE PHASE 1/.test(fila.ayuda) && /KOTTER RESIDENCE/.test(fila.ayuda) &&
        /jose@ox.com/.test(fila.ayuda), fila.ayuda);
  check('una reserva LIBERADA no aparece — ya no retiene nada',
        !/VIEJA/.test(fila.ayuda), fila.ayuda);

  console.log('\n═══ los casos de los extremos ═══\n');
  const otras = await page.evaluate(() => {
    const tds = document.querySelectorAll('#stockBody td.sc-levels');
    return Array.prototype.map.call(tds, td => ({
      trozos: td.querySelectorAll('.lv-bar i').length,
      vacia:  td.querySelector('.lv-bar').classList.contains('lv-empty'),
      num:    td.querySelector('.lv-num').textContent.trim(),
      cero:   td.querySelector('.lv-num').classList.contains('lv-zero'),
      ayuda:  td.querySelector('.lv-wrap').getAttribute('data-tip')
    }));
  });
  const sinReservas = otras.find(o => o.num === '80');
  check('sin reservas ni bajas se dibujan sólo dos trozos', sinReservas.trozos === 2, sinReservas);
  check('...y su ayuda SIGUE diciendo los ceros — un cero es una respuesta, y ' +
        'la ausencia de una línea no lo es',
        /Reserved: 0/.test(sinReservas.ayuda) && /Written off: 0/.test(sinReservas.ayuda),
        sinReservas.ayuda);

  const vacio = otras.find(o => o.num === '0');
  check('un material sin nada no dibuja ningún trozo', vacio.trozos === 0, vacio);
  check('...y se ve la pista vacía en vez de una barra llena de un solo color',
        vacio.vacia === true);
  check('...el cero se marca en rojo',           vacio.cero === true);
  check('...y lo dice con palabras',             /Nothing recorded/.test(vacio.ayuda), vacio.ayuda);

  await page.close();

  console.log('\n═══ el orden guardado se traduce solo ═══\n');
  {
    // Alguien que tenía Available primero y In Warehouse al final.
    const p2 = await abrir(`try{ localStorage.setItem('acopio_stock_col_order',
      JSON.stringify(['name','available','atSite','category','wasted','reserved','inWarehouse','location'])); }catch(e){}`);
    const cabeceras = await p2.evaluate(() =>
      Array.prototype.map.call(document.querySelectorAll('#stockHeadRow th'), t => t.className.trim()));
    check('las cinco viejas se convierten en UNA sola barra',
          cabeceras.filter(c => /sc-levels/.test(c)).length === 1, cabeceras);
    check('y ninguna de las cinco sobrevive',
          !cabeceras.some(c => /sc-(inWarehouse|atSite|available|wasted|reserved)/.test(c)), cabeceras);
    await p2.close();
  }

  console.log('\n═══ y el "escondido" sólo se hereda si eran las cinco ═══\n');
  {
    const todas = await abrir(`try{ localStorage.setItem('acopio_stock_col_hidden',
      JSON.stringify(['inWarehouse','atSite','available','wasted','reserved'])); }catch(e){}`);
    const hay1 = await todas.evaluate(() => !!document.querySelector('#stockHeadRow th.sc-levels'));
    check('escondidas las CINCO, la barra tampoco se ve — quien no quería ver ' +
          'cantidades sigue sin verlas', hay1 === false);
    await todas.close();

    const cuatro = await abrir(`try{ localStorage.setItem('acopio_stock_col_hidden',
      JSON.stringify(['inWarehouse','atSite','wasted','reserved'])); }catch(e){}`);
    const hay2 = await cuatro.evaluate(() => !!document.querySelector('#stockHeadRow th.sc-levels'));
    check('pero quien dejó "Available" visible SÍ ve la barra — heredar el ' +
          'escondido de las otras cuatro le quitaría la cantidad que le importaba',
          hay2 === true);
    await cuatro.close();
  }

  check('sin errores de página', errores.length === 0, errores);

  await browser.close();
  console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobacion(es) ok\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
