// UNA FILA NUEVA ENTRA ARRIBA, Y EL RESTO DE LA TABLA NO SE TOCA.
//
// Jose, 22/10, sobre el registro de errores:
//
//   *"Los errores deben actualizarse de inmediato sin repintar toda la
//   pantalla o ventana, sólo la fila que falta."*
//
// La v12.93 lo construyó. Lo que no existía hasta hoy era una prueba que lo
// EJECUTARA: `test-fusionar-y-ver-errores` comprueba que el código está
// escrito así —que `_errorLogMeterArriba` mete `row-enter`, que hay una sola
// función que dibuja una fila, que la animación respeta
// `prefers-reduced-motion`— leyendo el archivo. Eso no es lo mismo que
// comprobar que al llegar un error nuevo la tabla se comporte.
//
// ── LO QUE DE VERDAD PIDIÓ, Y POR QUÉ NO SE PUEDE LEER EN EL CÓDIGO ────────
//
// «Sin repintar» no es una propiedad del texto del programa: es una propiedad
// de lo que le pasa al DOM. Un `innerHTML = …` que volviera a escribir la
// misma tabla pasaría cualquier lectura del código —las filas quedarían
// idénticas— y rompería exactamente lo que él pidió: el scroll salta, lo que
// estabas leyendo desaparece y vuelve, y el texto del buscador se borra.
//
// La forma de medirlo es marcar los nodos ANTES y comprobar que siguen siendo
// LOS MISMOS objetos después. Eso sólo se puede hacer en un navegador, y por
// eso esta prueba abre uno.
//
// Uso:  node tools/test-errorlog-fila-nueva.js

const fs = require('fs'), path = require('path'), os = require('os');
const A      = require(path.join(__dirname, 'andamio.js'));
const HTML   = path.join(__dirname, '..', 'Index_v3_fixed.html');
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SRC    = fs.readFileSync(HTML, 'utf8');

let ok = 0; const fails = [];
function check(label, got, want) {
  const bien = want === undefined ? !!got : JSON.stringify(got) === JSON.stringify(want);
  if (bien) { ok++; console.log('  ok   ' + label); }
  else {
    fails.push(label + (want === undefined ? '' :
      ' → esperaba ' + JSON.stringify(want) + ', salió ' + JSON.stringify(got)));
    console.log('  FALLA ' + label + (want === undefined ? '' :
      '\n         esperaba ' + JSON.stringify(want) + '\n         salió    ' + JSON.stringify(got)));
  }
}

/* El servidor finge devolver lo que tenga `__server` en ese momento, para que
 * la prueba pueda «provocar un error» añadiéndole una fila entre dos
 * refrescos, que es justo el caso de Jose: provocarlo SIN cerrar Ajustes. */
const page = `<!doctype html><html><head><meta charset="utf-8">
<style>
  tr.row-enter{animation:errRowIn .45s ease-out}
  @keyframes errRowIn{from{opacity:0}to{opacity:1}}
  @media (prefers-reduced-motion:reduce){ tr.row-enter{animation:none} }
</style></head><body>
<div id="settingsTabContent"></div>
<script>
  var _settingsTab = 'errorlog';
  var _errorLogData = null;
  var _errLogNuevas = 0;
  window.__server = [];
  window.__llamadas = 0;

  function _he(s){ return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function _h(o){ return o; }

  /* «_drawErrorLog» de verdad es largo y arrastra media pantalla de ajustes.
     Lo que esta prueba necesita de él es lo único que importa aquí: que
     REESCRIBE el contenedor entero. Así, si el camino de la fila nueva cayera
     por error en él, los nodos marcados desaparecerían y la prueba lo vería —
     que es exactamente lo que se quiere detectar. */
  function _drawErrorLog(filtro){
    var q = String(filtro || '').toLowerCase();
    var rows = (_errorLogData || []).filter(function(r){
      if (!q) return true;
      return (r.message+' '+r.action+' '+r.user+' '+r.requestId).toLowerCase().indexOf(q) !== -1;
    });
    window.__pintadasEnteras = (window.__pintadasEnteras || 0) + 1;
    document.getElementById('settingsTabContent').innerHTML =
      '<p><span id="errLogNuevasMarca"></span></p>' +
      '<input id="errLogSearch" value="' + _he(filtro || '') + '">' +
      '<div style="height:60px;overflow:auto" id="caja"><table><tbody>' +
      (rows.length
        ? rows.map(function(r){ return '<tr>' + _errLogFilaHtml(r) + '</tr>'; }).join('')
        : '<tr><td colspan="5">No errors logged</td></tr>') +
      '</tbody></table></div>';
  }

  var google = { script: { run: (function(){
    var okH = null, errH = null;
    var api = {
      withSuccessHandler: function(f){ okH = f; return api; },
      withFailureHandler: function(f){ errH = f; return api; },
      processMovement: function(){
        var cb = okH; okH = errH = null;
        window.__llamadas++;
        setTimeout(function(){ cb(JSON.parse(JSON.stringify(window.__server))); }, 30);
      }
    };
    return api;
  })() } };
${A.levantar(SRC,
  ['_refrescarErrorLog', '_errorLogMeterArriba', '_errLogFilaHtml',
   '_errorLogFilasNuevas', '_errLogFiltroActual', '_errLogPintarContador'],
  { dobles: ['_drawErrorLog', '_he', '_h'] })}
</script></body></html>`;

const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let chromium;
  try { chromium = require('playwright').chromium; }
  catch (e) { console.error('playwright is not installed — run: npm install playwright'); process.exit(2); }

  const file = path.join(os.tmpdir(), 'acopio-errorlog-fila.html');
  fs.writeFileSync(file, page);

  const browser = await chromium.launch({ executablePath: CHROME });
  const p = await browser.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + file);

  const fila = (i) => ({
    requestId: 'R' + i, timestamp: '2026-10-25 09:0' + i,
    severity: i % 2 ? 'ERROR' : 'WARN', action: 'manageMaterial',
    user: 'jose@ox.com', message: 'cosa numero ' + i
  });

  console.log('\n═══ 1· la primera vez sí dibuja la tabla entera ═══\n');

  /* No es una excepción a «no repintar»: la primera vez no hay nada que
   * conservar. La regla es sobre las VECES SIGUIENTES. */
  await p.evaluate((f) => { window.__server = f; _refrescarErrorLog(); },
    [fila(1), fila(2), fila(3)]);
  await wait(120);

  check('la tabla se dibujó entera una vez',
    await p.evaluate(() => window.__pintadasEnteras), 1);
  check('...con las tres filas',
    await p.evaluate(() => document.querySelectorAll('tbody tr').length), 3);

  console.log('\n═══ 2· llega un error nuevo SIN cerrar Ajustes ═══\n');

  /* Se marca cada fila con un número propio. Si el camino de «una fila más»
   * cayera en un redibujado, estos nodos serían otros y la marca se habría
   * perdido: es la única forma de distinguir «no se tocó» de «se volvió a
   * escribir igual», que es lo que pidió Jose y lo que el código no puede
   * contar por sí solo. */
  await p.evaluate(() => {
    [...document.querySelectorAll('tbody tr')].forEach((tr, i) => { tr.__marca = 'vieja' + i; });
    document.getElementById('errLogSearch').value = '';
    document.getElementById('caja').scrollTop = 20;
    window.__pintadasEnteras = 0;
    /* DÓNDE SE VE la fila que estabas leyendo, no cuánto vale `scrollTop`.
     * Mi primera versión comprobaba que `scrollTop` no cambiara, y salió roja
     * con 30 en vez de 20 — y el producto estaba BIEN. Al meter una fila
     * encima, Chrome mueve `scrollTop` a propósito (anclaje de scroll) para
     * que lo que estás mirando no se desplace: el número cambia justamente
     * PARA que la pantalla no cambie. Medir el número era medir la mecánica
     * del navegador; lo que Jose pidió es lo otro. */
    const vieja = [...document.querySelectorAll('tbody tr')].find(tr => tr.__marca === 'vieja0');
    window.__antes = vieja.getBoundingClientRect().top;
  });

  await p.evaluate((f) => { window.__server = f; _refrescarErrorLog(); },
    [fila(4), fila(1), fila(2), fila(3)]);
  await wait(120);

  check('NO se redibujó la tabla — «sólo la fila que falta», que es lo que pidió',
    await p.evaluate(() => window.__pintadasEnteras), 0);
  check('...ahora hay cuatro filas',
    await p.evaluate(() => document.querySelectorAll('tbody tr').length), 4);
  check('...las tres de antes son LOS MISMOS nodos, no copias iguales',
    await p.evaluate(() => [...document.querySelectorAll('tbody tr')]
      .map(tr => tr.__marca || null).filter(Boolean)),
    ['vieja0', 'vieja1', 'vieja2']);
  check('...y la nueva entró ARRIBA del todo',
    await p.evaluate(() => document.querySelector('tbody tr').textContent.indexOf('numero 4') !== -1));
  check('...marcada para que se vea entrar',
    await p.evaluate(() => document.querySelector('tbody tr').className), 'row-enter');
  check('...y sólo ella: las viejas no se vuelven a animar cada vez que llega una',
    await p.evaluate(() => [...document.querySelectorAll('tbody tr')]
      .filter(tr => tr.className === 'row-enter').length), 1);

  console.log('\n═══ 3· lo que estabas haciendo sigue donde estaba ═══\n');

  /* ── LO QUE SE PUEDE AFIRMAR DEL SCROLL, Y LO QUE NO ──────────────────
   *
   * Escribí primero «la fila que estabas leyendo no se mueve ni un píxel» y
   * salió roja: la fila vieja pasó de y=31 a y=65 mientras `scrollTop` sólo
   * iba de 20 a 30. O sea que al meter una fila encima **la de abajo sí baja
   * un poco**. El anclaje de scroll de Chrome compensa en parte, no del todo,
   * y eso no lo decide la app.
   *
   * El comentario de `_errorLogMeterArriba` dice «el scroll no se mueve».
   * Dicho así es más de lo que se puede sostener, y está anotado en
   * `docs/BACKLOG.md` para corregirlo con la próxima versión en vez de
   * obligar a pegar la app por un comentario.
   *
   * Lo que SÍ distingue las dos formas de actualizar, y es lo que importa:
   * redibujar destruye el contenedor y te devuelve ARRIBA DEL TODO —
   * `scrollTop` a cero, y quien estuviera leyendo la fila cuarenta pierde el
   * sitio—. Insertar no. Eso es exactamente lo que pidió Jose y es
   * comprobable sin depender de cómo ancle cada navegador. */
  check('no te devolvió al principio de la tabla — que es lo que hace un ' +
        'redibujado, y es perder el sitio',
    await p.evaluate(() => document.getElementById('caja').scrollTop > 0), true);
  check('el contador dice cuántas entraron desde que miras',
    await p.evaluate(() => document.getElementById('errLogNuevasMarca').textContent),
    '• 1 new since you opened this');

  console.log('\n═══ 4· con el buscador escrito, la fila nueva lo respeta ═══\n');

  /* La parte que se rompe sola si alguien «simplifica» metiendo la fila sin
   * mirar el filtro: la tabla enseñaría una fila que no cumple lo que el
   * buscador dice, y nadie entendería por qué está ahí. */
  await p.evaluate(() => {
    document.getElementById('errLogSearch').value = 'numero 9';
    window.__pintadasEnteras = 0;
  });
  await p.evaluate((f) => { window.__server = f; _refrescarErrorLog(); },
    [fila(5), fila(4), fila(1), fila(2), fila(3)]);
  await wait(120);

  check('una fila que no casa con el buscador NO se cuela',
    await p.evaluate(() => document.querySelectorAll('tbody tr').length), 4);
  check('...y el texto del buscador sigue escrito',
    await p.evaluate(() => document.getElementById('errLogSearch').value), 'numero 9');
  check('...pero el contador SÍ la cuenta: entró un error, aunque no lo estés mirando',
    await p.evaluate(() => document.getElementById('errLogNuevasMarca').textContent),
    '• 2 new since you opened this');

  console.log('\n═══ 5· cuando la lista cambia por abajo, sí se redibuja ═══\n');

  /* «Una fila más» y «la lista es otra» son dos cosas. Si alguien limpia o
   * purga el registro, insertar arriba dejaría en pantalla filas que ya no
   * existen en el servidor — una tabla que miente. Ahí redibujar es lo
   * correcto, y el código lo distingue; esto lo fija. */
  await p.evaluate(() => {
    document.getElementById('errLogSearch').value = '';
    window.__pintadasEnteras = 0;
  });
  await p.evaluate(() => { window.__server = []; _refrescarErrorLog(); });
  await wait(120);

  check('vaciar el registro redibuja, en vez de dejar filas fantasma',
    await p.evaluate(() => window.__pintadasEnteras), 1);
  check('...y la tabla queda diciendo que no hay nada',
    await p.evaluate(() => /No errors logged/.test(document.body.textContent)));

  console.log('\n═══ 6· y nada de esto revienta por el camino ═══\n');

  check('ningún error de JavaScript', errs, []);

  await browser.close();

  if (fails.length) {
    console.error('\nFALLÓ:\n  ' + fails.join('\n  ') + '\n');
    process.exit(1);
  }
  console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
})();
