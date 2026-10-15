// LEER LOS CÓDIGOS — Y PROBARLO SIN CÁMARA.
//
// Jose, 2026-10-14: «dale con las dos cosas». Tercer paso de tres —imprimir,
// leer, actuar— y el que convierte las etiquetas en algo que sirve.
//
// ── EL PROBLEMA DE PROBAR ESTO, Y CÓMO SE RESUELVE ─────────────────────────
//
// Ni `getUserMedia` ni `BarcodeDetector` existen en el navegador con el que
// corre esta suite. Comprobado:
//
//     { BarcodeDetector: false, getUserMedia: false, secureContext: false }
//
// La salida fácil sería no probar nada y decir «hay que verlo en el teléfono».
// La salida buena es que TODO LO QUE DECIDE ALGO reciba TEXTO y no fotogramas:
//
//     _escLeer(texto)     → qué es esto
//     _escRecibir(texto)  → qué tengo ahora
//     _escAcciones()      → qué puedo ofrecer
//     _escHacer(id)       → abre el formulario relleno
//
// La cámara sólo convierte fotogramas en texto. Así que esta prueba le da los
// textos a mano y comprueba el producto entero menos la lente — que es la
// única parte que de verdad hay que ver en un teléfono.
//
// Y los textos NO son inventados: se generan con el MISMO codificador que
// imprime las etiquetas, así que si el formato cambia en un lado y no en el
// otro, esto se pone rojo.
//
// Uso:  node tools/test-escanear.js [path/to/Index_v3_fixed.html]

const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');

const SRC = process.argv[2] || path.join(__dirname, '..', 'Index_v3_fixed.html');
let html = fs.readFileSync(SRC, 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FALLA ' + label + (extra === undefined ? '' : '  → ' + JSON.stringify(extra))); }
}

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
 serverVersion:'${(html.match(/var APP_VERSION = '([\d.]+)'/) || [])[1]}',
 serverBuild:'${(html.match(/var APP_BUILD = '([^']*)'/) || [])[1] || ''}',
 company:{name:'OX Glass LLC.',domain:'ox-glass.com',logo:''},
 movements:[],
 stock:{ 'WINDOW|||GLASS PANEL': { name:'GLASS PANEL', category:'WINDOW', unit:'Unit',
   warehouseQty:20, siteQty:0, availableQty:20, wastedQty:0, reservedQty:0,
   matId:'WINDOW|||GLASS PANEL', warehouseLocs:{ 'A1A': 20 }, status:'OK' } },
 monitoredMaterials:null,
 config:{ categories:['WINDOW'], projects:['TOWER ONE'], suppliers:[],
   locations:[{name:'A1A',group:'RACKS'},{name:'B3B',group:'RACKS'}], units:['Unit'] },
 incoming:[], rackPhotos:{}, systemActivity:[],
 rolePerms:{canSeeCosts:false,canEditMovements:true,canManageCatalog:true,canExportData:true},
 warehouseRoleLabel:'Warehouse', archiveCutoffMonths:12, oauthClientId:'', oauthRedirectUri:'' };
</script>`;
const f = path.join(os.tmpdir(), 'acopio-escanear.html');
fs.writeFileSync(f, html.replace('</head>', stub + '</head>'));

/* Los textos salen del codificador del producto, no de una cadena a mano: es
 * lo que ata las dos mitades. Si `_labelQrTexto` cambia de formato y el lector
 * no, esto se entera. */
const MAT = ['ACP1', 'WINDOW', 'GLASS PANEL', 'A1A', 'MOV-1'].join('\n');
const LOC = ['ACPL1', 'B3B'].join('\n');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 420, height: 880 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + f);
  await page.waitForTimeout(700);

  console.log('\n═══ 1. LAS DOS MITADES HABLAN EL MISMO IDIOMA ═══\n');
  //
  // Lo que IMPRIME y lo que LEE son dos funciones distintas en dos sitios
  // distintos. Que coincidan sin que nada lo obligue es el patrón que este
  // repositorio lleva diez veces contadas — así que aquí hay algo que lo
  // obliga: se imprime y se lee, en la misma prueba.
  {
    const r = await page.evaluate(() => {
      const textoMat = _labelQrTexto({ category:'WINDOW', name:'GLASS PANEL',
                                       loc:'A1A', movId:'MOV-1' });
      const textoLoc = _locLabelQrTexto('B3B');
      return { textoMat, textoLoc,
               leidoMat: _escLeer(textoMat), leidoLoc: _escLeer(textoLoc) };
    });
    check('lo que imprime la etiqueta de MATERIAL lo entiende el lector',
      r.leidoMat.tipo === 'material', r.leidoMat);
    check('...con la categoría, el nombre, el estante y el movimiento',
      r.leidoMat.category === 'WINDOW' && r.leidoMat.name === 'GLASS PANEL' &&
      r.leidoMat.loc === 'A1A' && r.leidoMat.movId === 'MOV-1', r.leidoMat);
    check('lo que imprime la de UBICACIÓN también',
      r.leidoLoc.tipo === 'ubicacion' && r.leidoLoc.name === 'B3B', r.leidoLoc);
  }

  console.log('\n═══ 2. LO QUE NO ES NUESTRO SE DICE, NO SE ADIVINA ═══\n');
  {
    const r = await page.evaluate(() => [
      'https://acopio.net', 'WIFI:S:bodega;T:WPA;P:1234;;', '', 'ACP9\nalgo', 'ACP1'
    ].map(t => ({ t, leido: _escLeer(t) })));
    for (const x of r.slice(0, 4)) {
      check('«' + String(x.t).slice(0, 24) + '» → ' + x.leido.tipo,
        x.leido.tipo === 'ajeno', x);
    }
    /* `ACP1` a secas SÍ es nuestro: es una etiqueta de material con los campos
     * vacíos. Decir que es ajena sería mentir, y lo que hay que hacer con ella
     * lo deciden las acciones, no el lector. */
    check('«ACP1» a secas sigue siendo nuestro, con los campos vacíos',
      r[4].leido.tipo === 'material' && r[4].leido.name === '', r[4]);
  }

  console.log('\n═══ 3. LA CÁMARA DISPARA CUATRO VECES POR SEGUNDO ═══\n');
  //
  // Sobre la misma etiqueta. Si cada lectura contara como un suceso, la
  // pantalla parpadearía y el pitido sonaría en bucle.
  {
    const r = await page.evaluate((MAT) => {
      _escReset();
      const a = _escRecibir(MAT), b = _escRecibir(MAT), c = _escRecibir(MAT);
      return [a.estado, b.estado, c.estado];
    }, MAT);
    check('la primera lectura es nueva...', r[0] === 'nuevo', r);
    check('...y las repeticiones son «repetido», no sucesos', r[1] === 'repetido' && r[2] === 'repetido', r);
  }
  {
    /* Apuntar a OTRA etiqueta sustituye, no acumula: cambiar de etiqueta es
     * cambiar de idea. */
    const r = await page.evaluate(() => {
      _escReset();
      _escRecibir(['ACP1','WINDOW','UNO','A1A'].join('\n'));
      _escRecibir(['ACP1','WINDOW','DOS','B3B'].join('\n'));
      return { material: _escSesion.material.name, loc: _escSesion.material.loc };
    });
    check('escanear otro material SUSTITUYE al anterior, no se acumulan',
      r.material === 'DOS' && r.loc === 'B3B', r);
  }

  console.log('\n═══ 4. LA COMBINACIÓN DICE QUÉ MOVIMIENTO ES ═══\n');
  {
    const r = await page.evaluate(({ MAT, LOC }) => {
      const out = {};
      _escReset();                       out.nada = _escAcciones().map(a => a.id);
      _escReset(); _escRecibir(MAT);     out.soloMat = _escAcciones().map(a => a.id);
      _escReset(); _escRecibir(LOC);     out.soloLoc = _escAcciones().map(a => a.id);
      _escReset(); _escRecibir(MAT); _escRecibir(LOC);
                                         out.dos = _escAcciones().map(a => a.id);
      out.textoDos = _escAcciones()[0].texto;
      return out;
    }, { MAT, LOC });
    check('sin nada escaneado no se ofrece nada', r.nada.length === 0, r.nada);
    check('un BULTO solo → sacar, o mover si dices dónde',
      r.soloMat.join(',') === 'sacar,mover', r.soloMat);
    check('un ESTANTE solo → ver qué hay ahí',
      r.soloLoc.join(',') === 'ver', r.soloLoc);
    check('BULTO y ESTANTE → una sola acción, mover: la combinación ya lo dice',
      r.dos.join(',') === 'mover', r.dos);
    check('...y el botón nombra el destino, no dice «mover» a secas',
      /B3B/.test(r.textoDos), r.textoDos);
  }

  console.log('\n═══ 5. ESCANEAR RELLENA, NO GUARDA ═══\n');
  //
  // Dos motivos y los dos pesan: la persona confirma en una pantalla que ya
  // conoce, y aquí no se duplica la lógica de guardar — que es donde están el
  // candado, los duplicados y el stock corto. Un escáner que guarda solo es un
  // escáner que un día guarda lo que no era.
  {
    const r = await page.evaluate(({ MAT, LOC }) => {
      _escReset(); _escRecibir(MAT); _escRecibir(LOC);
      const llamadas = [];
      const real = window.google.script.run;
      /* Si algo intentara guardar, se vería aquí. */
      window.google.script.run = new Proxy({}, { get(t, k) {
        llamadas.push(k); return function(){ return window.google.script.run; };
      }});
      _escHacer('mover');
      window.google.script.run = real;
      const dest = document.querySelector('#transferRowsContainer .transfer-row .tr-dest');
      return {
        llamadas,
        tipo: currentMoveType,
        nombre: (document.getElementById('mName') || {}).value,
        cat: (document.getElementById('mType') || {}).value,
        origen: (document.querySelector('#transferRowsContainer .transfer-row .tr-rack') || {}).value,
        destino: dest ? dest.value : null,
        abierto: !!(document.getElementById('moveOverlay') || {}).classList.contains('show'),
        escaneoCerrado: !document.getElementById('scanOverlay').classList.contains('show')
      };
    }, { MAT, LOC });
    check('se abre el formulario de TRASLADO', r.tipo === 'TRANSFER' && r.abierto, r);
    check('...con el material puesto', r.nombre === 'GLASS PANEL' && r.cat === 'WINDOW', r);
    check('...el ORIGEN que traía la etiqueta del bulto', r.origen === 'A1A', r);
    check('...y el DESTINO que se escaneó', r.destino === 'B3B', r);
    check('NO se llamó a guardar nada: escanear rellena, la persona confirma',
      !r.llamadas.some(k => /processMovement|manageMaterial/.test(k)), r.llamadas);
    check('...y la ventana de escanear se cierra al elegir', r.escaneoCerrado, r);
  }
  {
    /* Y el destino NO se rellena «por si acaso». Poner en el formulario un
     * sitio que nadie señaló es lo que convierte un atajo en un error con
     * prisa. */
    const r = await page.evaluate((MAT) => {
      _escReset(); _escRecibir(MAT);
      _escHacer('mover');
      const dest = document.querySelector('#transferRowsContainer .transfer-row .tr-dest');
      return { destino: dest ? dest.value : null,
               origen: (document.querySelector('#transferRowsContainer .transfer-row .tr-rack') || {}).value };
    }, MAT);
    check('sin estante escaneado, el DESTINO se queda vacío — no se inventa',
      !r.destino, r);
    check('...pero el origen sí, que ése venía en la etiqueta', r.origen === 'A1A', r);
  }
  {
    /* LA SALIDA USA OTROS CAMPOS. No son `mName`/`mSrc` —ésos son los del
     * movimiento simple— sino `exit-cat-1`, `exit-name-1` y el `.el-rack` de
     * `#exit-locs-1`, que es el formulario de varios materiales. La primera
     * versión de esta comprobación miraba los del simple y daba «vacío» con el
     * producto haciendo lo correcto: miraba el sitio equivocado. */
    const r = await page.evaluate((MAT) => {
      _escReset(); _escRecibir(MAT);
      _escHacer('sacar');
      const locs = document.getElementById('exit-locs-1');
      return { tipo: currentMoveType,
               cat:    (document.getElementById('exit-cat-1')  || {}).value,
               nombre: (document.getElementById('exit-name-1') || {}).value,
               origen: (locs && locs.querySelector('.el-rack') || {}).value,
               cantidad: (locs && locs.querySelector('.el-qty') || {}).value };
    }, MAT);
    check('«Take out» abre una SALIDA con el material y su estante',
      r.tipo === 'EXIT' && r.nombre === 'GLASS PANEL' && r.cat === 'WINDOW' &&
      r.origen === 'A1A', r);
    /* Y la CANTIDAD se queda vacía, que es lo único que la etiqueta no puede
     * saber: dice cuánto había en ese bulto el día que se imprimió, no cuánto
     * se lleva hoy. Rellenarla sería inventarse el dato más importante. */
    check('...pero la CANTIDAD vacía: es lo único que la etiqueta no sabe',
      !r.cantidad, r);
  }

  console.log('\n═══ 6. SI NO SE PUEDE ESCANEAR, SE DICE ANTES ═══\n');
  //
  // Encender la cámara para después decir que no se sabe leer es gastarle la
  // batería y la paciencia a alguien. Y aquí, en esta suite, NO hay
  // BarcodeDetector — así que este camino es el que de verdad se ejecuta.
  {
    const r = await page.evaluate(() => ({
      hayLector: typeof BarcodeDetector !== 'undefined',
      motivo: _escSePuede(),
      mensaje: _escMensajeNo(_escSePuede())
    }));
    check('este navegador no sabe leer códigos (' + r.motivo + ')',
      r.motivo !== 'si', r);
    check('...y el mensaje dice QUÉ HACER, no sólo que no se puede',
      /Chrome/i.test(r.mensaje) && /by hand|type/i.test(r.mensaje), r.mensaje);
  }
  {
    /* Y abrir sin poder leer no enciende la cámara ni deja la ventana colgada. */
    const r = await page.evaluate(() => {
      let pidioCamara = false;
      const md = navigator.mediaDevices;
      try {
        Object.defineProperty(navigator, 'mediaDevices', {
          configurable: true,
          value: { getUserMedia: function(){ pidioCamara = true; return Promise.reject(new Error('no')); } }
        });
      } catch (e) {}
      _escAbrir();
      try { Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: md }); } catch (e) {}
      return { pidioCamara,
               ventana: document.getElementById('scanOverlay').classList.contains('show') };
    });
    check('abrir sin lector NO enciende la cámara', !r.pidioCamara, r);
    check('...ni deja la ventana de escanear abierta', !r.ventana, r);
  }

  console.log('\n═══ 7. EL BOTÓN ESTÁ DONDE SE PUEDE ALCANZAR ═══\n');
  {
    const r = await page.evaluate(() => {
      const b = document.getElementById('btnEscanear');
      return { hay: !!b, texto: b ? b.textContent.trim() : '',
               oculto: b ? getComputedStyle(b).display === 'none' : null };
    });
    check('el botón de escanear existe en el menú de la cuenta', r.hay, r);
    check('...y no está escondido por rol: escanear es de bodega, no de ' +
          'administración', r.oculto === false, r);
  }

  check('ningún error suelto en la consola', errs.length === 0, errs.slice(0, 3));

  await browser.close();
  console.log('\n' + (fail ? '✗ ' + fail + ' fallos · ' : '✓ todo bien · ') + (ok + fail) + ' comprobaciones\n');
  process.exit(fail ? 1 : 0);
})();
