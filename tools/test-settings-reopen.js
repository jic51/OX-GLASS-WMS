// ABRIR AJUSTES NO DEBE PARECER UNA RECARGA.
//
// Jose (v11.32): "cada vez que abro 'app settings' se vuelve a cargar la
// página." Describía exactamente lo que pasaba: cada apertura borraba el panel,
// escribía "Loading…", y esperaba un viaje a Apps Script —medio segundo con
// suerte, varios en un día normal— para volver a dibujar una lista que no había
// cambiado desde que la cerró treinta segundos antes.
//
// LO QUE **NO** SE HIZO, y es la parte que importa: un caché con caducidad. El
// trabajo real de cachear esto no es guardarlo, es invalidarlo, y cada escritura
// de este archivo tendría que acordarse. La que se olvide muestra una lista de
// categorías vieja, y no hay síntoma que lleve de vuelta a la causa.
//
// Lo que se hizo: la consulta sigue saliendo, cada vez, igual que antes. Lo
// único que cambió es que ya no borra el panel primero. Nada se queda viejo,
// porque nada se está creyendo por más de un viaje de ida y vuelta.
//
// Esto es comportamiento en el tiempo —qué ve una persona en el instante en que
// abre— así que se prueba en un navegador de verdad, con el servidor fingido y
// LENTO. Con un servidor instantáneo las dos versiones se ven idénticas, que es
// precisamente por qué esto no se notó antes.
//
// Uso:  node tools/test-settings-reopen.js

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

// Una página mínima con las tres funciones reales y todo lo demás fingido. El
// servidor tarda 400ms a propósito: es donde vive la diferencia.
const page = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<div id="settingsOverlay"></div>
<div id="settingsMsgBar"></div>
<div id="settingsTabContent"></div>
<script>
  window.__log = [];
  var _settingsData = {}, _matListAll = null, _errorLogData = null, _pmDirectoryData = null;
  var _settingsTab = 'categories', userRole = 'ADMIN';
  var __server = { categories: ['A','B'], projects: [], suppliers: [] };
  var __calls = 0;

  function _clearRowModes(){}
  function _filterSettingsSidebar(){}
  function _settingMsg(m){ window.__log.push('msg:' + m); }
  function _filterMatList(){}
  function _drawErrorLog(){}
  function _drawPmDirectory(){}
  function _refreshPmDatalist(){}
  function _h(o){ return o; }
  function _renderSettingsTab(tab){
    window.__log.push('render');
    document.getElementById('settingsTabContent').innerHTML =
      '<input id="catbox"><ul>' + (_settingsData.categories||[]).map(function(c){
        return '<li>' + c + '</li>'; }).join('') + '</ul>';
  }

  // El doble de google.script.run: encadenable, y LENTO.
  var google = { script: { run: (function(){
    var okH = null, errH = null;
    var api = {
      withSuccessHandler: function(f){ okH = f; return api; },
      withFailureHandler: function(f){ errH = f; return api; },
      processMovement: function(what){
        var cb = okH, fh = errH; okH = errH = null;
        __calls++;
        setTimeout(function(){
          if (window.__failNext) { window.__failNext = false; if (fh) fh(new Error('boom')); return; }
          if (what === 'getSettings') cb(JSON.parse(JSON.stringify(__server)));
          else cb([]);
        }, 400);
      }
    };
    return api;
  })() } };
${fnSrc('openSettingsModal')}
${fnSrc('_settingsFocusInPanel')}
${fnSrc('_redrawSettingsWhenFree')}
${fnSrc('_loadSettings')}
  var _settingsRedrawPending = false;
</script></body></html>`;

const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let chromium;
  try { chromium = require('playwright').chromium; }
  catch (e) { console.error('playwright is not installed — run: npm install playwright'); process.exit(2); }

  const file = path.join(os.tmpdir(), 'acopio-settings-reopen.html');
  fs.writeFileSync(file, page);
  const browser = await chromium.launch({ executablePath: CHROME });
  const p = await browser.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + file);

  // ── La primera apertura no tiene nada que pintar ───────────────────────
  console.log('\n═══ la primera vez sí dice Loading — no hay nada que mostrar ═══\n');
  await p.evaluate(() => { window.__log = []; openSettingsModal(); });
  check('la primera apertura muestra Loading…',
    /Loading/.test(await p.evaluate(() => document.getElementById('settingsTabContent').textContent)));
  await wait(700);
  check('...y dibuja cuando llega la respuesta',
    /A/.test(await p.evaluate(() => document.getElementById('settingsTabContent').textContent)));

  // ── La segunda es la que Jose notaba ───────────────────────────────────
  console.log('\n═══ la segunda apertura ya no parpadea ═══\n');
  await p.evaluate(() => { window.__log = []; openSettingsModal(); });
  const inmediato = await p.evaluate(() => document.getElementById('settingsTabContent').textContent);
  check('al abrir otra vez NO aparece Loading…', !/Loading/.test(inmediato));
  check('...y las categorías ya están en pantalla, en el mismo instante',
    /A/.test(inmediato) && /B/.test(inmediato));

  // Y la consulta sale igual — esto no es un caché, es no parpadear.
  const antes = await p.evaluate(() => __calls);
  await wait(700);
  check('la consulta al servidor se hace igual (nada se queda viejo)',
    await p.evaluate(() => __calls) > antes - 1);

  // ── Sin cambios, sin redibujar ─────────────────────────────────────────
  console.log('\n═══ si nada cambió, no redibuja ═══\n');
  await p.evaluate(() => { window.__log = []; openSettingsModal(); });
  await wait(700);
  const renders = await p.evaluate(() => window.__log.filter(l => l === 'render').length);
  check('una reapertura sin cambios dibuja UNA vez, no dos (' + renders + ')', renders === 1);

  // ── Con cambios, sí ────────────────────────────────────────────────────
  console.log('\n═══ si algo cambió, sí redibuja ═══\n');
  await p.evaluate(() => { __server.categories = ['A','B','NUEVA']; window.__log = []; openSettingsModal(); });
  await wait(700);
  check('lo que cambió en el servidor aparece sin que nadie recargue',
    /NUEVA/.test(await p.evaluate(() => document.getElementById('settingsTabContent').textContent)));

  // ── Y no le quita el teclado a nadie ───────────────────────────────────
  console.log('\n═══ un refresco no borra lo que alguien está escribiendo ═══\n');
  await p.evaluate(() => {
    __server.categories = ['A','B','NUEVA','OTRA'];
    openSettingsModal();
    var box = document.getElementById('catbox');
    box.focus(); box.value = 'a medio escribir';
  });
  await wait(700);
  let r = await p.evaluate(() => {
    const b = document.getElementById('catbox');
    return { valor: b ? b.value : null, enfocado: document.activeElement === b };
  });
  check('lo escrito sigue ahí después de que llegue la respuesta', r.valor === 'a medio escribir');
  check('...y el cursor no se fue del campo', r.enfocado === true);

  // Al soltar el campo, el dibujo aplazado entra.
  await p.evaluate(() => document.getElementById('catbox').blur());
  await wait(120);
  check('al salir del campo, el cambio aplazado se pinta',
    /OTRA/.test(await p.evaluate(() => document.getElementById('settingsTabContent').textContent)));

  // ── Un fallo silencioso es silencioso ──────────────────────────────────
  console.log('\n═══ un refresco que falla no grita sobre una pantalla que sirve ═══\n');
  await p.evaluate(() => { window.__failNext = true; window.__log = []; openSettingsModal(); });
  await wait(700);
  r = await p.evaluate(() => ({
    msgs: window.__log.filter(l => l.indexOf('msg:') === 0).length,
    texto: document.getElementById('settingsTabContent').textContent
  }));
  check('no se muestra una barra roja: el panel está enseñando datos buenos de ' +
        'hace un momento, y un rojo sobre algo que funciona enseña a ignorar los rojos',
    r.msgs === 0);
  check('...y lo que había sigue en pantalla', /A/.test(r.texto));

  check('sin errores de página en todo el recorrido' +
        (errs.length ? ' — ' + errs.join('; ') : ''), errs.length === 0);

  await browser.close();
  console.log('\n' + '─'.repeat(72));
  console.log('El servidor de esta prueba tarda 400ms a propósito. Con uno');
  console.log('instantáneo las dos versiones se ven iguales — que es exactamente');
  console.log('por qué esto llegó hasta la v11.36 sin que nadie lo probara.');
  console.log('─'.repeat(72));
  console.log('\nsettings reopen: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
  process.exit(fail === 0 ? 0 : 1);
})();
