// LA SEMANA DE ENTREGAS — cuatro arriba, tres abajo, y del mismo tamaño.
//
// Jose lo dibujó a mano encima de una captura: cuatro recuadros arriba y tres
// abajo, y "que los cuadros sean estables, como en Google Calendar, son siempre
// del mismo tamaño, pero al hacer scroll se pueden ver los que están más
// abajo".
//
// Lo que había era repeat(auto-fill, minmax(200px, 1fr)): el número de columnas
// lo decidía el ancho de la ventana, y cada tarjeta crecía con su contenido. En
// su captura eso daba seis días arriba, el miércoles solo en una segunda fila,
// y el día con dos entregas al doble de alto que los vacíos. Una semana que
// cambia de forma según lo que haya dentro no se lee de un vistazo, que es lo
// único para lo que sirve esta vista.
//
// TODO ESTO ES GEOMETRÍA, así que se mide en un navegador. Leer el CSS diría
// que hay cuatro columnas; sólo un render dice si las siete tarjetas caen donde
// deben, si tienen la misma altura con contenidos distintos, y si el desbordar
// produce scroll de verdad — que es donde vive el error clásico de poner
// overflow en un hijo flex sin min-height:0 y que no pase nada.
//
// Uso:  node tools/test-incoming-week.js

const fs = require('fs'), path = require('path'), os = require('os');
const HTML   = path.join(__dirname, '..', 'Index_v3_fixed.html');
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SRC    = fs.readFileSync(HTML, 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

// Las reglas se sacan del archivo real. Reescribirlas aquí probaría la copia.
function cssRule(selector){
  const i = SRC.indexOf(selector + '{');
  if (i === -1) throw new Error('no encontrada la regla: ' + selector);
  const end = SRC.indexOf('}', i);
  return SRC.slice(i, end + 1);
}
function mediaBlock(query){
  const i = SRC.indexOf('@media (' + query + '){');
  if (i === -1) throw new Error('no encontrado el media: ' + query);
  // Bloque anidado: se cuentan llaves.
  let depth = 0, j = SRC.indexOf('{', i);
  for (let k = j; k < SRC.length; k++) {
    if (SRC[k] === '{') depth++;
    else if (SRC[k] === '}') { depth--; if (depth === 0) return SRC.slice(i, k + 1); }
  }
  throw new Error('sin cerrar: ' + query);
}

// Siete días con contenidos deliberadamente desiguales: uno vacío, uno con una
// entrega, uno con seis. Si la altura dependiera del contenido, este reparto lo
// enseña de inmediato.
const dias = [
  { l: 'TODAY',    n: 2 },
  { l: 'TOMORROW', n: 0 },
  { l: 'SAT',      n: 0 },
  { l: 'SUN',      n: 6 },
  { l: 'MON',      n: 0 },
  { l: 'TUE',      n: 1 },
  { l: 'WED',      n: 0 }
];

const page = `<!doctype html><html><head><meta charset="utf-8"><style>
  :root{ --bg:#F0F2F5; --card:#FFFFFF; --text:#1a1a2e; --muted:#6B7280;
         --accent:#3B7DD8; --accent2:#2563EB; --border:#E5E7EB; --radius:10px;
         --shadow:0 1px 2px rgba(0,0,0,.04); }
  body{margin:0;background:var(--card);font:14px system-ui,sans-serif}
  .inc-item{padding:.5rem 0;border-bottom:1px solid var(--border)}
  .day-empty{color:var(--muted);font-size:.78rem;font-style:italic}
${cssRule('    .incoming-week-grid')}
${cssRule('    .day-card')}
${cssRule('    .day-card.today')}
${cssRule('    .day-card .day-label')}
${cssRule('    .day-body')}
${mediaBlock('max-width:1000px')}
${mediaBlock('max-width:600px')}
</style></head><body>
<div class="incoming-week-grid" id="incomingWeekGrid">
${dias.map((d, i) => `  <div class="day-card${i === 0 ? ' today' : ''}">
    <div class="day-label">${d.l} <small>09-0${i + 3}</small></div>
    <div class="day-body">${
      d.n ? Array.from({length: d.n}, (_, k) =>
        `<div class="inc-item">MIRROR M-STUDIO-${k} · 5 UNIT · Pending · Mark arrived</div>`).join('')
          : '<div class="day-empty">Nothing scheduled</div>'
    }</div>
  </div>`).join('\n')}
</div>
</body></html>`;

(async () => {
  let chromium;
  try { chromium = require('playwright').chromium; }
  catch (e) { console.error('playwright is not installed — run: npm install playwright'); process.exit(2); }

  const file = path.join(os.tmpdir(), 'acopio-incoming-week.html');
  fs.writeFileSync(file, page);
  const browser = await chromium.launch({ executablePath: CHROME });
  const p = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + file);

  const geom = () => p.evaluate(() => {
    const cards = [...document.querySelectorAll('.day-card')];
    const r = cards.map(c => c.getBoundingClientRect());
    // Una fila = las tarjetas que empiezan a la misma altura. Redondeado al
    // píxel: el navegador reparte fracciones al dividir el ancho.
    const filas = {};
    r.forEach(b => { const k = Math.round(b.top); (filas[k] = filas[k] || []).push(b); });
    return {
      n: cards.length,
      filas: Object.keys(filas).sort((a, b) => a - b).map(k => filas[k].length),
      alturas: [...new Set(r.map(b => Math.round(b.height)))],
      anchos:  [...new Set(r.map(b => Math.round(b.width)))]
    };
  });

  console.log('\n═══ cuatro arriba y tres abajo, como lo dibujó ═══\n');
  let g = await geom();
  check('las siete tarjetas de la semana están ahí', g.n === 7);
  check('se reparten 4 y 3, no como caiga (' + g.filas.join(' + ') + ')',
    g.filas.length === 2 && g.filas[0] === 4 && g.filas[1] === 3);

  console.log('\n═══ y son del mismo tamaño, aunque no tengan lo mismo dentro ═══\n');
  // El reparto de arriba es a propósito: un día vacío, uno con una entrega y
  // uno con seis. Si la altura siguiera al contenido, aquí saldrían tres.
  check('una sola altura para las siete, con 0, 1, 2 y 6 entregas dentro (' +
        g.alturas.join(', ') + 'px)', g.alturas.length === 1);
  check('...y un solo ancho', g.anchos.length === 1);

  console.log('\n═══ lo que no cabe se alcanza con scroll ═══\n');
  let r = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('.day-card')];
    // El de seis entregas: SUN, el cuarto.
    const lleno = cards[3].querySelector('.day-body');
    const vacio = cards[1].querySelector('.day-body');
    lleno.scrollTop = 9999;
    return {
      desborda: lleno.scrollHeight > lleno.clientHeight + 2,
      llega:    lleno.scrollTop > 0,
      alFinal:  Math.abs(lleno.scrollHeight - lleno.clientHeight - lleno.scrollTop) < 2,
      vacioNoDesborda: vacio.scrollHeight <= vacio.clientHeight + 2,
      // La tarjeta NO crece por dentro: el desbordar se queda dentro del cuerpo.
      tarjetaFija: Math.round(cards[3].getBoundingClientRect().height) ===
                   Math.round(cards[1].getBoundingClientRect().height)
    };
  });
  check('el día con seis entregas desborda su cuerpo', r.desborda);
  check('...y ese cuerpo se puede desplazar de verdad', r.llega);
  check('...hasta el final, así que la última entrega es alcanzable', r.alFinal);
  check('un día vacío no inventa scroll', r.vacioNoDesborda);
  check('y la tarjeta llena mide lo mismo que la vacía — el desbordar se queda ' +
        'dentro y no empuja la fila', r.tarjetaFija);

  console.log('\n═══ el día no se va con el scroll ═══\n');
  r = await p.evaluate(() => {
    const card = [...document.querySelectorAll('.day-card')][3];
    const lbl = card.querySelector('.day-label').getBoundingClientRect();
    const box = card.getBoundingClientRect();
    return { visible: lbl.top >= box.top - 1 && lbl.bottom <= box.bottom + 1,
             texto: card.querySelector('.day-label').textContent.trim() };
  });
  check('con el cuerpo desplazado al final, la etiqueta del día sigue a la vista ' +
        '(' + r.texto + ') — perder de vista qué día miras es lo que no puede pasar',
    r.visible === true);

  console.log('\n═══ en pantallas estrechas ═══\n');
  await p.setViewportSize({ width: 900, height: 900 });
  g = await geom();
  check('a 900px se reparte en dos columnas (' + g.filas.join(' + ') + ')',
    g.filas.every(n => n <= 2) && g.filas[0] === 2);
  await p.setViewportSize({ width: 500, height: 900 });
  g = await geom();
  check('a 500px queda una por fila', g.filas.every(n => n === 1));
  r = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('.day-card')];
    return Math.round(cards[3].getBoundingClientRect().height) !==
           Math.round(cards[1].getBoundingClientRect().height);
  });
  check('...y ahí la altura fija se suelta: en el móvil se lee un día tras otro, ' +
        'no la semana de un vistazo', r === true);

  check('sin errores de página' + (errs.length ? ' — ' + errs.join('; ') : ''),
    errs.length === 0);

  await browser.close();
  console.log('\n' + '─'.repeat(72));
  console.log('El reparto de contenidos de esta prueba es desigual a propósito:');
  console.log('un día vacío, uno con una entrega y uno con seis. Con siete días');
  console.log('iguales, una rejilla que sigue al contenido y una que no se ven');
  console.log('exactamente igual — y la que sigue al contenido es la rota.');
  console.log('─'.repeat(72));
  console.log('\nincoming week: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
  process.exit(fail === 0 ? 0 : 1);
})();
