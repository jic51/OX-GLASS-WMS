// EL AVISO SE VE ENTERO EN UN TELÉFONO, Y LOS BOTONES NO SE PISAN.
//
// Dos cosas de la misma foto (Jose, 2026-09-06), y las dos son de la misma
// familia: una regla que gana sin quitar lo que reemplaza.
//
// 1. EL AVISO SALÍA CORTADO EN EL MÓVIL, y es la SEGUNDA vez que lo reporta.
//
//        #toastContainer{position:fixed;top:1.25rem;left:50%;transform:translateX(-50%);…}
//        @media (max-width:768px){ #toastContainer{bottom:.75rem;right:.75rem;left:.75rem} }
//
//    La regla del móvil pone bottom/left/right y NO anulaba `top` ni
//    `transform`. El `top` sigue mandando —con top y bottom puestos, gana top—
//    así que el aviso se quedaba arriba; y el `translateX(-50%)` seguía
//    corriendo el bloque media pantalla a la izquierda, ahora que ocupa el
//    ancho entero. Cortado por arriba y por la izquierda.
//
//    LA PRIMERA VEZ LO ARREGLÉ A MEDIAS: puse `max-width:100%`, que es el
//    ancho, no la posición. El síntoma cambió de forma y siguió ahí. Por eso
//    esta prueba mide DÓNDE ESTÁ EL RECTÁNGULO en una pantalla de teléfono, no
//    qué reglas hay escritas.
//
// 2. LOS BOTONES SE PISABAN al cambiar la etiqueta a la de espera. _btnBusy
//    fija el `min-width` del botón al ancho que tenía ANTES —puesto para que no
//    diera un salto— y con una etiqueta más larga no puede encogerse; en un
//    contenedor flex sin `wrap`, el texto se desborda por encima del vecino.
//
// Uso:  node tools/test-toast-and-buttons.js [path/to/Index_v3_fixed.html]

const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');

const SRC = process.argv[2] || path.join(__dirname, '..', 'Index_v3_fixed.html');
const src = fs.readFileSync(SRC, 'utf8');
const styles = src.slice(src.indexOf('<style>') + 7, src.indexOf('</style>'));

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

const page = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><style>${styles}</style></head>
<body>
<div id="toastContainer">
  <div class="toast ok"><span class="toast-icon">✅</span>
    <div class="toast-msg">1 movement record(s) saved.</div>
    <button class="toast-close">✕</button></div>
</div>
<div class="modal" style="width:420px">
  <div class="modal-actions" id="acts">
    <button class="btn btn-ghost" id="cancel">Cancel</button>
    <button class="btn btn-primary" id="save">Save to System</button>
  </div>
</div>
</body></html>`;

const f = path.join(os.tmpdir(), 'acopio-toast-buttons.html');
fs.writeFileSync(f, page);

function seSolapan(a, b){
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const errs = [];

  // ── 1. El aviso, en anchos de teléfono de verdad ─────────────────────────
  console.log('\n═══ el aviso cabe entero en la pantalla ═══\n');
  for (const w of [320, 375, 414, 768]) {
    const p = await browser.newPage({ viewport: { width: w, height: 640 } });
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + f);
    await p.waitForTimeout(120);

    const g = await p.evaluate(() => {
      const c = document.getElementById('toastContainer');
      const t = document.querySelector('.toast');
      const cs = getComputedStyle(c);
      return { caja: c.getBoundingClientRect(), aviso: t.getBoundingClientRect(),
               transform: cs.transform, top: cs.top, bottom: cs.bottom,
               ancho: window.innerWidth, alto: window.innerHeight };
    });

    check(w + 'px: no se sale por la izquierda (left = ' +
          g.aviso.left.toFixed(1) + ') — con el translateX(-50%) heredado ' +
          'salía a media pantalla negativa',
      g.aviso.left >= -0.5);
    check(w + 'px: ni por la derecha (right = ' + g.aviso.right.toFixed(1) +
          ' de ' + g.ancho + ')', g.aviso.right <= g.ancho + 0.5);
    check(w + 'px: ni por arriba (top = ' + g.aviso.top.toFixed(1) + ')',
      g.aviso.top >= -0.5);
    check(w + 'px: ni por abajo', g.aviso.bottom <= g.alto + 0.5);

    if (w <= 768) {
      check(w + 'px: el transform heredado está anulado (' + g.transform + ')',
        g.transform === 'none');
      check(w + 'px: y ABAJO, no arriba (top calculado: ' + g.top + ') — con ' +
            'top y bottom puestos a la vez, gana top, y por eso se quedaba ' +
            'arriba pese a la regla de bottom',
        g.aviso.top > g.alto / 2);
    } else {
      check(w + 'px: en pantalla ancha sigue arriba y centrado, como siempre',
        g.aviso.top < g.alto / 2);
    }
    await p.close();
  }

  // ── 2. Los botones, con la etiqueta de espera puesta de verdad ───────────
  console.log('\n═══ los botones no se pisan al cambiar de etiqueta ═══\n');
  {
    // La etiqueta REAL, leída del archivo. Escribirla aquí probaría la copia —
    // y este arreglo consistió justamente en acortarla.
    const m = /var BUSY_LABEL = '([^']+)'/.exec(src);
    check('la etiqueta de espera es una constante y no un texto suelto', !!m);
    const etiqueta = m ? m[1] : 'Waiting…';
    console.log('    etiqueta: "' + etiqueta + '"\n');

    for (const w of [320, 420, 768]) {
      const p = await browser.newPage({ viewport: { width: w, height: 640 } });
      p.on('pageerror', e => errs.push(e.message));
      await p.goto('file://' + f);
      await p.waitForTimeout(80);

      const g = await p.evaluate((lbl) => {
        const btn = document.getElementById('save');
        const otro = document.getElementById('cancel');
        // Exactamente lo que hace _btnBusy: fijar el ancho ANTES de cambiar el
        // texto, y luego meter el spinner y la etiqueta nueva.
        btn.style.minWidth = btn.getBoundingClientRect().width + 'px';
        btn.innerHTML = '<span class="btn-spin"></span><span>' + lbl + '</span>';
        return { save: btn.getBoundingClientRect(),
                 cancel: otro.getBoundingClientRect(),
                 desborda: btn.scrollWidth > btn.clientWidth + 1,
                 wrap: getComputedStyle(document.getElementById('acts')).flexWrap };
      }, etiqueta);

      check(w + 'px: los dos botones NO se solapan — es lo que Jose ' +
            'fotografió', !seSolapan(g.save, g.cancel));
      check(w + 'px: y el texto no se desborda del propio botón',
        g.desborda === false);
      check(w + 'px: la fila de botones puede bajar de línea (' + g.wrap +
            ') — el min-width impide encoger, así que sin `wrap` la única ' +
            'salida que le queda al navegador es pisar al vecino',
        g.wrap === 'wrap');
      await p.close();
    }
  }

  console.log('');
  check('sin errores de página', errs.length === 0);
  if (errs.length) errs.forEach(e => console.log('  PAGE ERROR:', e));

  await browser.close();

  console.log('\n' + '─'.repeat(72));
  console.log('Las dos cosas son la misma familia: una regla que gana sin');
  console.log('quitar lo que reemplaza. Y las dos se miden por dónde acaba el');
  console.log('rectángulo, no por qué reglas hay escritas — la primera vez');
  console.log('este aviso se "arregló" tocando el ancho en vez de la posición.');
  console.log('─'.repeat(72));

  console.log('\ntoast + buttons: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
  process.exit(fail === 0 ? 0 : 1);
})();
