// Verifies the splash screen's rotating loading phrases and the manual
// reload fallback (SPLASH_NOTES / _showSplashReload) — Jose's ask: a single
// "almost there" line reads the same at 3 seconds or 20; there should be
// several phrases over time, the last one should say the wait is longer than
// expected, and there should be a way out that doesn't require the user to
// already know they should reload.
//
// Usa el reloj simulado de Playwright para adelantar el intervalo real en vez
// de esperar de verdad los ~24 segundos que tarda la lista entera.
//
// NI LAS FRASES NI EL INTERVALO SE ESCRIBEN AQUÍ. Estaban copiados a mano, y el
// intervalo además como un 3600 suelto que sólo funcionaba mientras la app
// rotara cada 3500ms. Jose lo subió a 4000 (v11.45, "0.5 segundos más cada
// una") y esta prueba se cayó entera — no porque la app estuviera mal, sino
// porque la prueba llevaba dentro una copia del número que vigilaba. Ahora los
// dos se leen del archivo.
//
// Usage:  node tools/test-splash-notes.js [path/to/Index_v3_fixed.html]

const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');

const SRC = process.argv[2] || path.join(__dirname, '..', 'Index_v3_fixed.html');
let html = fs.readFileSync(SRC, 'utf8');

// A stub that never resolves getInitialData — the point is to observe the
// splash screen itself for as long as it's waiting, not to reach a loaded app.
const stub = `<script>
window.google=window.google||{}; window.google.charts=window.google.charts||{load:function(){},setOnLoadCallback:function(){}};
Object.assign(window.google,{script:{run:new Proxy({},{get(t,k){
  return function(){ if(k==='withSuccessHandler'||k==='withFailureHandler'){ return window.google.script.run; } };
}})}});
</script>`;
html = html.replace('</head>', stub + '</head>');
const f = path.join(os.tmpdir(), 'acopio-splash.html');
fs.writeFileSync(f, html);

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));

  await page.clock.install();
  await page.goto('file://' + f);
  await page.waitForTimeout(50);

  // Leídas del archivo, no copiadas.
  const mNotes = /var SPLASH_NOTES = \[([\s\S]*?)\];/.exec(html);
  if (!mNotes) throw new Error('no se encontró SPLASH_NOTES en el archivo');
  const NOTES = mNotes[1].split('\n').map(l => l.trim())
    .filter(l => l.startsWith("'"))
    .map(l => l.replace(/^'/, '').replace(/',?$/, ''));
  check('las frases se leen del archivo (' + NOTES.length + ')', NOTES.length >= 4);

  const mMs = /var SPLASH_NOTE_MS = (\d+);/.exec(html);
  if (!mMs) throw new Error('no se encontró SPLASH_NOTE_MS en el archivo');
  const MS = parseInt(mMs[1], 10);
  // Y que el setInterval use la constante, no un número escrito otra vez: dos
  // copias del intervalo es cómo se llega a que el comentario diga 3.5s y el
  // código haga otra cosa.
  check('el intervalo es una constante y el temporizador la usa (' + MS + 'ms)',
    /\}, SPLASH_NOTE_MS\);/.test(html));
  check('y no baja de los 4s que pidió Jose para poder leerlas', MS >= 4000);
  const SALTO = MS + 100;

  console.log('\nScenario: the loading phrase rotates over time instead of staying on one line');
  check('starts on the first phrase', await page.evaluate(() =>
    document.getElementById('splashNote').textContent) === NOTES[0]);

  for (let i = 1; i < NOTES.length - 1; i++) {
    await page.clock.fastForward(SALTO);
    const text = await page.evaluate(() => document.getElementById('splashNote').textContent);
    check('after rotation ' + i + ', shows phrase ' + (i + 1) + ' of ' + NOTES.length, text === NOTES[i]);
  }

  console.log('\nScenario: the last phrase says the wait is longer than expected, and stays (no looping back to the first)');
  await page.clock.fastForward(SALTO);
  check('shows the final "taking longer than expected" phrase', await page.evaluate(() =>
    document.getElementById('splashNote').textContent) === NOTES[NOTES.length - 1]);
  await page.clock.fastForward(SALTO);
  check('stays on the final phrase — does not loop back to "Connecting…"', await page.evaluate(() =>
    document.getElementById('splashNote').textContent) === NOTES[NOTES.length - 1]);

  console.log('\nScenario: a manual reload option appears once the phrases run out — not before');
  check('a reload control exists once stuck', await page.evaluate(() => !!document.getElementById('splashReload')));
  check('it actually reloads the page on click', await page.evaluate(() =>
    document.getElementById('splashReload').onclick.toString().indexOf('location.reload') !== -1));

  console.log('\nScenario: hiding the splash (a real load finishing) stops the rotation for good');
  await page.evaluate(() => window._hideSplash());
  await page.waitForTimeout(50);
  const textAtHide = await page.evaluate(() => {
    var n = document.getElementById('splashNote');
    return n ? n.textContent : '(removed)';
  });
  await page.clock.fastForward(5000);
  const textAfter = await page.evaluate(() => {
    var n = document.getElementById('splashNote');
    return n ? n.textContent : '(removed)';
  });
  check('no further rotation happens after the splash is hidden', textAfter === textAtHide);

  check('no page errors the whole run', pageErrors.length === 0);
  if (pageErrors.length) pageErrors.forEach(e => console.log('  PAGE ERROR:', e));

  await browser.close();
  console.log('\nsplash notes: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
  process.exit(fail === 0 ? 0 : 1);
})();
