// LA ETIQUETA DE UBICACIÓN — LA QUE SE PEGA AL ESTANTE.
//
// Jose, 2026-10-14. Es la otra mitad de poder escanear: la del material va en
// el bulto, ésta va en el rack. Con las dos se puede decir «este bulto va a ese
// sitio» sin teclear nada.
//
// ── LO QUE ESTA PRUEBA DEFIENDE, Y POR QUÉ CADA COSA ────────────────────────
//
//  1. QUE EL CÓDIGO SE LEA. Igual que la del material: se codifica con el
//     nuestro y se decodifica con `jsQR`, que es un lector independiente. Un QR
//     mal hecho se dibuja igual de bonito que uno bueno.
//
//  2. QUE SE LEA AL TAMAÑO AL QUE SALE IMPRESO. Tres por hoja de 4×6 dejan un
//     QR de ~34 mm. La distancia de lectura de un QR son unas diez veces su
//     ancho, y el suelo para que un teléfono no falle son 0,40 mm por módulo.
//     Las dos cosas se comprueban con números, no de vista.
//
//  3. QUE LA HOJA ESCALE. Ésta es la que no se ve y la que de verdad importa.
//     La impresora de Jose ofrece UN SOLO tamaño de papel —ISO A4— y después
//     encoge esa página para meterla en la pegatina de 4×6. Si la hoja se
//     dibujara en milímetros fijos habría DOS encogidos: la etiqueta quedaría
//     de sello en medio de la A4, y el sello se encogería otra vez. Dibujada en
//     fracciones de página sólo hay uno, y el contenido viaja con él.
//     Se mide renderizando a los dos tamaños y comprobando que el código acaba
//     en la pegatina con el mismo tamaño físico por los dos caminos.
//
//  4. QUE NO LLEVE NADA QUE CADUQUE. Ni cantidad, ni fecha, ni PO, ni qué
//     material hay ahí. Una etiqueta de rack se pega una vez y vive años; si
//     llevara el contenido estaría mintiendo al día siguiente.
//
//  5. QUE NO SE PUEDA CONFUNDIR con la de material. Ésta es apaisada, la otra
//     vertical. Dos papeles blancos con un QR acaban pegados al revés algún día.
//
// Uso:  node tools/test-etiqueta-ubicacion.js [path/to/Index_v3_fixed.html]

const fs = require('fs'), os = require('os'), path = require('path');
const jsQR = require('jsqr');
const { chromium } = require('playwright');
const { qrGenerar } = require('./qr-fuente.js');

const RAIZ = path.join(__dirname, '..');
const SRC  = process.argv[2] || path.join(RAIZ, 'Index_v3_fixed.html');
let html = fs.readFileSync(SRC, 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FALLA ' + label + (extra === undefined ? '' : '  → ' + JSON.stringify(extra))); }
}

/* ══ 1 · EL CÓDIGO SE LEE ══════════════════════════════════════════════════ */

console.log('\n═══ 1. EL CÓDIGO, LEÍDO POR UN LECTOR INDEPENDIENTE ═══\n');

function daLaVuelta(txt, escala) {
  const q = qrGenerar(txt);
  const borde = 4, n = q.n, total = (n + borde * 2) * escala;
  const data = new Uint8ClampedArray(total * total * 4).fill(255);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (!q.m[y][x]) continue;
    for (let dy = 0; dy < escala; dy++) for (let dx = 0; dx < escala; dx++) {
      const px = ((y + borde) * escala + dy) * total + ((x + borde) * escala + dx);
      data[px * 4] = 0; data[px * 4 + 1] = 0; data[px * 4 + 2] = 0;
    }
  }
  const r = jsQR(data, total, total);
  return { leido: r ? r.data : null, n: q.n + 8 };
}

/* Nombres reales de la bodega de Jose, no inventados. */
const UBICS = ['A1A', 'B3B', 'C2C', 'WINDOW WAREHOUSE', 'LGI OQM 184', 'PAT BMW 3'];
for (const u of UBICS) {
  const txt = 'ACPL1\n' + u;
  const r = daLaVuelta(txt, 4);
  check('`' + u + '` se lee entero', r.leido === txt, { leido: r.leido });
}

/* ══ 2 · AL TAMAÑO AL QUE SALE IMPRESO ════════════════════════════════════ */

console.log('\n═══ 2. A 34 mm, QUE ES LO QUE DEJAN TRES POR HOJA ═══\n');

const SUELO_MM_MODULO = 0.40;   // por debajo, un teléfono empieza a fallar
const QR_MM = 34;               // medido en el navegador, tres por hoja de 4×6
{
  /* El más grande de los nombres manda: si cabe el peor, caben todos. */
  const peor = UBICS.reduce((a, b) => (('ACPL1\n' + b).length > ('ACPL1\n' + a).length ? b : a));
  const q = qrGenerar('ACPL1\n' + peor);
  const modulos = q.n + 8;
  const mmPorModulo = QR_MM / modulos;
  check('el nombre más largo (`' + peor + '`) da ' + modulos + ' módulos, ' +
        mmPorModulo.toFixed(2) + ' mm cada uno — el suelo es ' + SUELO_MM_MODULO,
    mmPorModulo >= SUELO_MM_MODULO, { mmPorModulo });

  /* A 203 ppp (lo que da una térmica barata) hacen falta 3 puntos por módulo. */
  const puntos = Math.floor(QR_MM * 8 / modulos);
  check('...y a 203 ppp salen ' + puntos + ' puntos por módulo (hacen falta 3)',
    puntos >= 3, { puntos });

  /* La distancia a la que se lee: unas diez veces el ancho. No es un requisito,
   * es un número que hay que tener delante — Jose pidió «que se lean de lejos»
   * y la respuesta honesta son 34 cm, no dos metros. Si alguien sube el número
   * de etiquetas por hoja, esto se encoge y conviene que lo diga. */
  /* Diez veces el ancho, y el ancho está en MILÍMETROS: 34 mm × 10 = 340 mm,
   * que son 34 cm. La primera versión de esta línea decía «340 cm» por no
   * dividir, y 3,4 metros habría dado por buena justo la promesa que no se
   * puede cumplir. */
  const CM_LECTURA = QR_MM * 10 / 10;
  check('la distancia de lectura es ~' + Math.round(CM_LECTURA) + ' cm: un brazo, ' +
        'no el pasillo. Los racks ya están rotulados a lo grande',
    CM_LECTURA >= 25, { cm: CM_LECTURA });

  const r = daLaVuelta('ACPL1\n' + peor, Math.max(3, Math.round(QR_MM * 8 / modulos)));
  check('...y a esa resolución se sigue leyendo', r.leido === 'ACPL1\n' + peor);
}

/* ══ 3 · EN UN NAVEGADOR ══════════════════════════════════════════════════ */

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
 movements:[], stock:{}, monitoredMaterials:null,
 config:{ categories:['WINDOW'], projects:[], suppliers:[],
   locations:[{name:'A1A',group:'RACKS'},{name:'B3B',group:'RACKS'},
              {name:'C2C',group:'RACKS'},{name:'WINDOW WAREHOUSE',group:'WAREHOUSE'}],
   units:['Unit'] },
 incoming:[], rackPhotos:{}, systemActivity:[],
 rolePerms:{canSeeCosts:false,canEditMovements:true,canManageCatalog:true,canExportData:true},
 warehouseRoleLabel:'Warehouse', archiveCutoffMonths:12, oauthClientId:'', oauthRedirectUri:'' };
</script>`;
const f = path.join(os.tmpdir(), 'acopio-loc-label.html');
fs.writeFileSync(f, html.replace('</head>', stub + '</head>'));

/* 101,6 mm y 152,4 mm a 96 ppp, que es como el navegador mide una página. */
const P46 = { width: 384, height: 576, mm: 101.6 };
const PA4 = { width: 794, height: 1123, mm: 210 };

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });

  async function medir(pagina, nombres) {
    const page = await browser.newPage({ viewport: { width: pagina.width, height: pagina.height } });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto('file://' + f);
    await page.waitForTimeout(500);
    await page.emulateMedia({ media: 'print' });
    const r = await page.evaluate((ns) => {
      const hoja = document.getElementById('labelSheet');
      hoja.innerHTML = _locSheetHtml(ns);
      const h0 = hoja.querySelector('.lloc-hoja');
      const q0 = hoja.querySelector('.lloc-qr');
      const c0 = hoja.querySelector('.lloc');
      const rh = h0.getBoundingClientRect(), rq = q0.getBoundingClientRect(),
            rc = c0.getBoundingClientRect();
      return {
        hojas:    hoja.querySelectorAll('.lloc-hoja').length,
        celdas:   hoja.querySelectorAll('.lloc').length,
        vacias:   hoja.querySelectorAll('.lloc-vacia').length,
        hojaW: rh.width, hojaH: rh.height,
        qrW: rq.width, qrH: rq.height,
        celdaW: rc.width, celdaH: rc.height,
        texto: hoja.textContent.replace(/\s+/g, ' ').trim(),
        haySvg: !!hoja.querySelector('.lloc-qr svg')
      };
    }, nombres);
    await page.close();
    return Object.assign(r, { errs });
  }

  console.log('\n═══ 3. LA HOJA: TRES POR PÁGINA ═══\n');
  {
    const r = await medir(P46, ['A1A', 'B3B', 'C2C']);
    check('tres ubicaciones caben en UNA hoja', r.hojas === 1 && r.celdas === 3, r);
    check('...y la hoja llena la página entera (' + Math.round(r.hojaW) + '×' +
          Math.round(r.hojaH) + ' de ' + P46.width + '×' + P46.height + ')',
      Math.abs(r.hojaW - P46.width) <= 1 && Math.abs(r.hojaH - P46.height) <= 1, r);
    check('...cada código es un SVG de verdad', r.haySvg);
    check('ningún error suelto', r.errs.length === 0, r.errs.slice(0, 2));
  }
  {
    const r = await medir(P46, ['A1A', 'B3B', 'C2C', 'WINDOW WAREHOUSE']);
    check('cuatro ubicaciones son DOS hojas', r.hojas === 2, r);
    /* Los huecos vacíos no son adorno: sin ellos, las dos etiquetas de la
     * última hoja se estirarían a media página cada una, que es un tamaño que
     * el adhesivo no tiene. */
    check('...y la segunda se rellena con huecos invisibles, para que la ' +
          'etiqueta suelta no se estire a media página',
      r.celdas === 6 && r.vacias === 2, r);
  }

  console.log('\n═══ 4. LA PARTE QUE NO SE VE: QUE ESCALE ═══\n');
  //
  // La impresora de Jose sólo ofrece A4 y luego encoge esa página para meterla
  // en la pegatina de 4×6. Lo que se comprueba aquí es que el código acaba del
  // mismo tamaño FÍSICO por los dos caminos — que es lo que quiere decir
  // «dibujado en proporción de página».
  {
    const a = await medir(P46, ['A1A', 'B3B', 'C2C']);
    const b = await medir(PA4, ['A1A', 'B3B', 'C2C']);

    const mmA = a.qrW / a.hojaW * P46.mm;                 // directo en 4×6
    const mmB = b.qrW / b.hojaW * PA4.mm * (P46.mm / PA4.mm);  // A4 encogida al adhesivo

    check('en 4×6 el código sale a ' + mmA.toFixed(1) + ' mm',
      mmA >= 28 && mmA <= 42, { mmA });
    check('en A4 encogida al adhesivo sale a ' + mmB.toFixed(1) + ' mm — ' +
          'el MISMO tamaño físico por los dos caminos, que es todo el objetivo',
      Math.abs(mmA - mmB) <= 4, { mmA, mmB });
    check('los dos están por encima del suelo de ' + SUELO_MM_MODULO + ' mm/módulo',
      Math.min(mmA, mmB) / 33 >= SUELO_MM_MODULO, { mmA, mmB });

    /* Y la prueba de que no hay milímetros fijos escondidos: al cambiar de
     * página, el código TIENE que cambiar de tamaño en píxeles. Si saliera
     * igual, estaría clavado y el A4 lo dejaría de sello. */
    check('al cambiar de página el código cambia de tamaño: no hay milímetros ' +
          'fijos escondidos (' + Math.round(a.qrW) + 'px → ' + Math.round(b.qrW) + 'px)',
      b.qrW > a.qrW * 1.5, { a: a.qrW, b: b.qrW });
  }

  console.log('\n═══ 5. QUÉ LLEVA Y QUÉ NO ═══\n');
  {
    const r = await medir(P46, ['A1A', 'B3B', 'C2C']);
    check('lleva el nombre de cada ubicación', /A1A/.test(r.texto) && /B3B/.test(r.texto), r.texto);
    /* La regla que más importa: nada que caduque. Una etiqueta de rack vive
     * años; si llevara el contenido, mentiría al día siguiente. */
    for (const [que, re] of [['cantidades', /\bQTY\b|\bUNIT\b/i], ['fechas', /20\d\d/],
                             ['PO', /\bPO\b/i], ['proveedor', /supplier/i]]) {
      check('NO lleva ' + que + ': una etiqueta de rack vive años y no puede ' +
            'decir nada que caduque', !re.test(r.texto), r.texto.slice(0, 60));
    }
    check('cada etiqueta es APAISADA (' + Math.round(r.celdaW) + '×' + Math.round(r.celdaH) +
          '): la de material es vertical, y dos papeles blancos con un QR ' +
          'acaban pegados al revés algún día',
      r.celdaW > r.celdaH, { w: r.celdaW, h: r.celdaH });
  }

  console.log('\n═══ 6. LA BARRA DE SELECCIÓN ═══\n');
  //
  // Nació para fusionar, que necesita dos, así que no salía con una marcada.
  // Jose: «¿y si el cliente quiere imprimir todas de una vez? ¿debe hacerlo una
  // por una?». No hay ninguna razón para limitarlo.
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto('file://' + f);
    await page.waitForTimeout(600);
    const r = await page.evaluate(() => {
      const caja = document.createElement('div');
      caja.innerHTML = '<div id="locMergeBar" class="cfg-pickbar"></div>' +
        ['A1A','B3B','C2C'].map(n =>
          '<input type="checkbox" class="loc-pick" data-name="' + n + '">').join('');
      document.body.appendChild(caja);
      _wireLocMerge();
      const bar = document.getElementById('locMergeBar');
      const cbs = caja.querySelectorAll('.loc-pick');
      const leer = () => ({
        sale:   bar.classList.contains('show'),
        print:  !!document.getElementById('locPrintBtn'),
        todas:  !!document.getElementById('locPickAll'),
        merge:  !!document.getElementById('locMergeBtn')
      });
      const out = { cero: leer() };
      cbs[0].checked = true; cbs[0].dispatchEvent(new Event('change', { bubbles: true }));
      out.una = leer();
      cbs[1].checked = true; cbs[1].dispatchEvent(new Event('change', { bubbles: true }));
      out.dos = leer();
      cbs[2].checked = true; cbs[2].dispatchEvent(new Event('change', { bubbles: true }));
      out.todasMarcadas = leer();
      return out;
    });
    check('sin nada marcado la barra no sale', !r.cero.sale, r.cero);
    check('con UNA marcada la barra ya sale...', r.una.sale, r.una);
    check('...con «Print labels»', r.una.print, r.una);
    check('...y con «Select all», porque marcar 59 racks a mano es un castigo',
      r.una.todas, r.una);
    check('...pero SIN «Merge», que sí necesita dos', !r.una.merge, r.una);
    check('con DOS aparece «Merge»', r.dos.merge && r.dos.print, r.dos);
    check('con TODAS marcadas desaparece «Select all», que ya no haría nada',
      !r.todasMarcadas.todas && r.todasMarcadas.print, r.todasMarcadas);
    await page.close();
  }

  await browser.close();
  console.log('\n' + (fail ? '✗ ' + fail + ' fallos · ' : '✓ todo bien · ') + (ok + fail) + ' comprobaciones\n');
  process.exit(fail ? 1 : 0);
})();
