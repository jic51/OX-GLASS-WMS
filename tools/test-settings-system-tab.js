// LA PESTAÑA SYSTEM — que deje de recargarse, y que el recuadro azul no se
// escape al resto de la app.
//
// Jose, después de la v11.37: "la ventana de app settings ya no se recarga,
// pero la parte de system sí lo hace cada vez que cambio de pestaña, no
// debería, recuerda solo debe actualizar lo que cambió, si es que cambió."
//
// Tenía razón, y era el mismo fallo un piso más abajo: _renderSystemTab
// reescribe el panel, lo que devuelve "⏳ Checking…" a las cuatro cajas, y
// luego cuatro viajes al servidor las rellenan con lo que ya decían.
//
// La respuesta es la misma que en Ajustes y por la misma razón: NO es un caché
// con caducidad. Las cuatro consultas siguen saliendo cada vez. Lo que cambió
// es que se pinta la última respuesta en lugar de un reloj de arena, y la caja
// sólo se reescribe si la respuesta nueva es distinta.
//
// Y la segunda mitad: el recuadro azul que Jose pidió para separar las áreas.
// `.field` aparece cien veces en este archivo —en el formulario de movimientos,
// en el asistente, dentro de estas mismas cajas— así que la regla tiene que
// alcanzar las áreas de un panel y nada más. Eso se comprueba mirando, no
// leyendo el selector.
//
// Uso:  node tools/test-settings-system-tab.js

const fs = require('fs'), path = require('path'), os = require('os');
const HTML   = path.join(__dirname, '..', 'Index_v3_fixed.html');
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SRC    = fs.readFileSync(HTML, 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

function fnSrc(name){
  const start = SRC.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('no encontrada: ' + name);
  let depth = 0, i = SRC.indexOf('{', start);
  for (let j = i; j < SRC.length; j++) {
    if (SRC[j] === '{') depth++;
    else if (SRC[j] === '}') { depth--; if (depth === 0) return SRC.slice(start, j + 1); }
  }
  throw new Error('sin cerrar: ' + name);
}

// La regla del recuadro, sacada del archivo real y no reescrita aquí — copiarla
// probaría una copia.
function cssRule(selector){
  const i = SRC.indexOf(selector + '{');
  if (i === -1) throw new Error('no encontrada la regla: ' + selector);
  const end = SRC.indexOf('}', i);
  return SRC.slice(i, end + 1);
}

const page = `<!doctype html><html><head><meta charset="utf-8"><style>
  :root{ --bg:#F0F2F5; --card:#FFFFFF; --text:#1a1a2e; --muted:#6B7280;
         --accent:#3B7DD8; --border:#E5E7EB; --red:#B42318; }
  body{margin:0;background:var(--card)}
  .field{display:flex;flex-direction:column;gap:.3rem}
  .field label{font-size:.72rem;font-weight:600;color:var(--muted)}
  ${cssRule('#settingsTabContent > .field')}
  ${cssRule('#settingsTabContent > .field > label:first-child')}
</style></head><body>
<div id="settingsTabContent"></div>
<!-- Un .field FUERA del panel: el de un formulario de movimiento. No debe
     llevar recuadro. -->
<div id="elsewhere"><div class="field"><label>Quantity</label><input></div></div>
<script>
  window.__spin = [];
  var __server = {
    backup: { enabled: true, retentionDays: 30 },
    daily:  { enabled: false, hour: 20, recipients: [] },
    space:  { used: 1000 },
    ai:     { configured: false }
  };
  var __calls = 0;

  function _he(s){ return String(s == null ? '' : s); }
  function _h(o){ return o; }
  function _infoIc(){ return ''; }

  function _drawBackupBox(st){ document.getElementById('backupBox').textContent = 'backup:' + st.enabled; }
  function _drawDailyReport(c){ document.getElementById('dailyReportBox').textContent = 'daily:' + c.enabled; }
  function _drawSpaceBox(st){ document.getElementById('spaceBox').textContent = 'space:' + st.used; }
  function _drawAiBox(st){ document.getElementById('aiBox').textContent = 'ai:' + st.configured; }

  // El doble del servidor: lento a propósito, y con nombres de método reales.
  // google.script.run se pide una vez por carga, así que el doble se rehace
  // en cada acceso: devolver siempre el mismo objeto encadenable haría que dos
  // cargas simultáneas se pisaran los manejadores.
  var google = { script: {} };
  Object.defineProperty(google.script, 'run', { get: function(){
    var okH=null, errH=null;
    var api = {
      withSuccessHandler:function(f){ okH=f; return api; },
      withFailureHandler:function(f){ errH=f; return api; },
      processMovement:function(what){ fire(what); },
      getDailyReportSettings:function(){ fire('daily'); }
    };
    function fire(what){
      var cb=okH; okH=errH=null; __calls++;
      setTimeout(function(){
        if (what === 'getBackupStatus') cb(JSON.parse(JSON.stringify(__server.backup)));
        else if (what === 'getSpaceUsage') cb(JSON.parse(JSON.stringify(__server.space)));
        else if (what === 'getAiStatus') cb(JSON.parse(JSON.stringify(__server.ai)));
        else cb(JSON.parse(JSON.stringify(__server.daily)));
      }, 300);
    }
    return api;
  }});

${fnSrc('_sysRemember')}
${fnSrc('_sysLoad')}
${fnSrc('_loadBackupStatus')}
${fnSrc('_loadDailyReport')}
${fnSrc('_loadSpaceUsage')}
${fnSrc('_loadAiStatus')}
  var _sysBox = {};

  // El trozo de _renderSystemTab que importa: reescribe el panel con los cuatro
  // relojes de arena y luego pide las cuatro cargas.
  function renderSystem(){
    document.getElementById('settingsTabContent').innerHTML =
      '<div class="field"><label>What the system did</label><div>—</div></div>' +
      '<div class="field"><label>Backups</label><div id="backupBox">⏳ Checking…</div></div>' +
      '<div class="field"><label>Daily movement report</label><div id="dailyReportBox">⏳ Checking…</div></div>' +
      '<div class="field"><label>Storage</label><div id="spaceBox">⏳ Measuring…</div></div>' +
      '<div class="field"><label>Document reader</label><div id="aiBox">⏳ Checking…</div>' +
        '<div class="field"><label>nested</label><input></div></div>';
    _loadBackupStatus(); _loadDailyReport(); _loadSpaceUsage(); _loadAiStatus();
    window.__spin.push(document.getElementById('settingsTabContent').textContent.indexOf('⏳') !== -1);
  }
</script></body></html>`;

const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let chromium;
  try { chromium = require('playwright').chromium; }
  catch (e) { console.error('playwright is not installed — run: npm install playwright'); process.exit(2); }

  const file = path.join(os.tmpdir(), 'acopio-system-tab.html');
  fs.writeFileSync(file, page);
  const browser = await chromium.launch({ executablePath: CHROME });
  const p = await browser.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + file);

  // ── 1. La primera visita ────────────────────────────────────────────────
  console.log('\n═══ la primera visita sí espera — no hay nada que pintar ═══\n');
  await p.evaluate(() => renderSystem());
  check('la primera vez las cajas muestran ⏳',
    (await p.evaluate(() => window.__spin[0])) === true);
  await wait(600);
  check('...y se llenan cuando llegan las respuestas',
    /backup:true/.test(await p.evaluate(() =>
      document.getElementById('settingsTabContent').textContent)));

  // ── 2. La segunda, que es la que Jose notaba ────────────────────────────
  console.log('\n═══ volver a la pestaña ya no muestra los cuatro relojes ═══\n');
  const antes = await p.evaluate(() => __calls);
  await p.evaluate(() => renderSystem());
  const texto = await p.evaluate(() =>
    document.getElementById('settingsTabContent').textContent);
  check('al volver NO queda ningún ⏳ en pantalla', texto.indexOf('⏳') === -1);
  check('...y las cuatro cajas ya dicen lo suyo, en el mismo instante',
    /backup:true/.test(texto) && /daily:false/.test(texto) &&
    /space:1000/.test(texto) && /ai:false/.test(texto));

  await wait(600);
  check('las cuatro consultas salen igual — esto no es un caché, es no ' +
        'parpadear (' + (await p.evaluate(() => __calls) - antes) + ' llamadas)',
    (await p.evaluate(() => __calls)) - antes === 4);

  // ── 3. Lo que cambió, cambia ────────────────────────────────────────────
  console.log('\n═══ y lo que cambió sí se actualiza ═══\n');
  await p.evaluate(() => { __server.backup.enabled = false; renderSystem(); });
  check('lo viejo se pinta primero, sin esperar',
    /backup:true/.test(await p.evaluate(() => document.getElementById('backupBox').textContent)));
  await wait(600);
  check('...y se corrige solo cuando llega la respuesta nueva',
    /backup:false/.test(await p.evaluate(() => document.getElementById('backupBox').textContent)));

  // ── 4. El recuadro azul ─────────────────────────────────────────────────
  console.log('\n═══ el recuadro azul de Jose ═══\n');
  let r = await p.evaluate(() => {
    const areas = document.querySelectorAll('#settingsTabContent > .field');
    const a = getComputedStyle(areas[0]);
    const nested = document.querySelector('#settingsTabContent .field .field');
    const outside = document.querySelector('#elsewhere .field');
    const lbl = getComputedStyle(areas[1].querySelector('label'));
    const lblBox = areas[1].querySelector('label').getBoundingClientRect();
    const areaBox = areas[1].getBoundingClientRect();
    return {
      areas: areas.length,
      borde: a.borderTopWidth + ' ' + a.borderTopStyle + ' ' + a.borderTopColor,
      fondo: a.backgroundColor,
      anidado: getComputedStyle(nested).borderTopWidth,
      fuera: getComputedStyle(outside).borderTopWidth,
      etiquetaColor: lbl.color,
      // La etiqueta montada sobre la línea del borde: su centro cae encima
      // del borde superior del área.
      montada: Math.abs((lblBox.top + lblBox.height / 2) - areaBox.top) < 3
    };
  });
  check('cada área del panel lleva su recuadro (' + r.areas + ')', r.areas === 5);
  check('el borde es azul y de 1px (' + r.borde + ')',
    /^1px solid rgb\(59, 125, 216\)$/.test(r.borde));
  check('SOLO el borde — el recuadro no se rellena de nada (' + r.fondo + ')',
    r.fondo === 'rgba(0, 0, 0, 0)');
  check('un .field ANIDADO dentro de un área no lleva recuadro propio',
    r.anidado === '0px');
  check('y un .field de otra parte de la app —el formulario de movimientos— ' +
        'se queda como estaba', r.fuera === '0px');
  check('la etiqueta va montada sobre la línea, como el nombre de un área ' +
        'y no como un rótulo suelto', r.montada === true);
  check('...y en el mismo azul del borde', r.etiquetaColor === 'rgb(59, 125, 216)');

  check('sin errores de página en todo el recorrido' +
        (errs.length ? ' — ' + errs.join('; ') : ''), errs.length === 0);

  await browser.close();
  console.log('\n' + '─'.repeat(72));
  console.log('El servidor de esta prueba tarda 300ms a propósito, igual que en');
  console.log('test-settings-reopen: con uno instantáneo el parpadeo no existe,');
  console.log('y es en las conexiones lentas donde la queja de Jose vive.');
  console.log('─'.repeat(72));
  console.log('\nsystem tab: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
  process.exit(fail === 0 ? 0 : 1);
})();
