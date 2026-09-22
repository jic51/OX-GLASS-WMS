// QUIÉN VA ENCIMA DE QUIÉN.
//
// Jose, 2026-09-21, con dos capturas de una pantalla ancha y baja:
//
//   "Al abrir el menú del usuario éste se abre DETRÁS de las tarjetas. Creo yo
//    que este menú debe tener prioridad y posicionarse sobre todo lo demás, ya
//    que sólo se abre si damos clic en el avatar y eso significa que queremos
//    hacer algo ahí. Entonces al abrir el menú del usuario y hacer hover y
//    tenerlo abierto, las tarjetas de atrás no deben abrirse y tampoco la app
//    atrás debe moverse o hacer scroll (actualmente lo hace)."
//
// ── POR QUÉ NO SE PODÍA VER LEYENDO EL CÓDIGO ────────────────────────────────
//
// `.acct-menu` declara `z-index:600`. El mazo declara `399`. Leyendo eso,
// cualquiera diría que el menú va delante — y el menú iba detrás.
//
// UN z-index SÓLO COMPITE DENTRO DE SU PROPIO CONTEXTO DE APILADO. El menú vive
// dentro de `.topbar`, que es `position:sticky` con `z-index:100`, y eso abre un
// contexto: hacia fuera el menú no vale 600, vale lo que valga la barra. 100 es
// menos que 399, así que ganaba el mazo. El 600 era un número que no podía hacer
// nada, y subirlo —que es lo primero que uno intenta— no habría cambiado nada.
//
// Por eso esta prueba MIDE en el navegador con `elementFromPoint` en vez de
// comparar números: es la única forma de preguntarle al navegador quién está
// delante de verdad. Un test que comparase z-index habría dado verde sobre la
// pantalla rota.
//
// ── Y POR QUÉ HAY UNA TABLA, NO UN NÚMERO ARREGLADO ──────────────────────────
//
// Había veinticuatro `z-index` sueltos por el archivo. Cada uno se eligió el día
// que algo salió tapado, subiéndolo hasta que se veía. Así se llega a un 600
// inútil y a que nadie sepa el orden real. La segunda mitad de este fichero
// cuenta que las capas flotantes salgan de la tabla del `:root` y no de un
// número escrito a mano.
//
// Uso:  CHROME_PATH=/opt/pw-browsers/chromium-*/chrome-linux/chrome \
//       node tools/test-capas.js

const fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

function acto(n){
  return { at: '2026-09-' + (14 + n) + 'T02:19:00Z', action: 'BACKUP_CREATED',
           label: 'Backup created', detail: 'MY WAREHOUSE — Backup 2026-09-' + (14 + n),
           extra: '', dismissed: false };
}

const DATA = {
  userRole:'ADMIN', userEmail:'jose@ox.com', userName:'Jose Castro', serverVersion:'test',
  company:{ name:'OX Glass LLC.' }, movements:[], stock:{}, materialLocks:[],
  monitoredMaterials:null,
  config:{ categories:['WINDOW'], projects:[], suppliers:[],
           locations:[{ name:'A1A', type:'RACK' }], units:['UNIT'] },
  incoming:[], rackPhotos:{},
  systemActivity:[acto(1), acto(2), acto(3), acto(4)],
  rolePerms:{ canSeeCosts:true, canEditMovements:true, canManageCatalog:true, canExportData:true },
  warehouseRoleLabel:'Warehouse', archiveCutoffMonths:12, oauthClientId:'', oauthRedirectUri:''
};

function pagina(){
  const stub = `<script>
window.google=window.google||{};window.google.charts={load:function(){},setOnLoadCallback:function(){}};
Object.assign(window.google,{script:{run:new Proxy({},{get(t,k){return function(){
 if(k==='withSuccessHandler'){t._ok=arguments[0];return window.google.script.run;}
 if(k==='withFailureHandler'){return window.google.script.run;}
 var ok=t._ok;
 if(k==='getInitialData'){setTimeout(function(){ok&&ok(window.__DATA);},20);return;}
 setTimeout(function(){ok&&ok({});},10);};}})}});
window.__DATA=${JSON.stringify(DATA)};
<\/script>`;
  const f = path.join(os.tmpdir(), 'ac-capas-' + Math.random().toString(36).slice(2) + '.html');
  fs.writeFileSync(f, html.replace('</head>', stub + '</head>'));
  return f;
}

// Quién está DELANTE en el punto donde dos cosas se pisan. Es la pregunta de
// Jose, hecha al navegador.
//
// Se INYECTA en la página y se llama por su nombre, en vez de pasarla a
// page.evaluate como cadena: una cadena se evalúa como expresión y los
// argumentos se pierden por el camino, así que los dos selectores llegaban
// `undefined` y la prueba se caía midiendo nada.
const QUIEN_MANDA = `window.__quienManda = function (a, b) {
  const A = document.querySelector(a), B = document.querySelector(b);
  if (!A || !B) return { falta: !A ? a : b };
  const ra = A.getBoundingClientRect(), rb = B.getBoundingClientRect();
  const x1 = Math.max(ra.left, rb.left),  x2 = Math.min(ra.right, rb.right);
  const y1 = Math.max(ra.top,  rb.top),   y2 = Math.min(ra.bottom, rb.bottom);
  if (!(x2 > x1 && y2 > y1)) return { pisan: false };
  const e = document.elementFromPoint((x1 + x2) / 2, (y1 + y2) / 2);
  return { pisan: true,
           encima: !e ? null : (e.closest(a) ? a : (e.closest(b) ? b : 'otra: ' + (e.id || e.className))) };
};`;

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  const errores = [];
  // Ancha y baja a propósito: es la forma de pantalla de las capturas de Jose
  // (un iPad apaisado), y es la que hace que el menú y el mazo se pisen. En una
  // pantalla alta no se tocan y el fallo no aparece.
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  page.on('pageerror', e => errores.push(e.message));
  await page.goto('file://' + pagina());
  await page.waitForTimeout(800);
  await page.evaluate(QUIEN_MANDA);

  console.log('\n═══ 1. El menú del avatar, sobre las tarjetas ═══\n');

  const cerrado = await page.evaluate(() => ({
    clase:  document.documentElement.classList.contains('acct-open'),
    scroll: getComputedStyle(document.documentElement).overflow,
    raton:  getComputedStyle(document.getElementById('cornerDeck')).pointerEvents
  }));
  check('con el menú cerrado no hay ninguna marca puesta', cerrado.clase === false);
  check('...la página se puede mover', cerrado.scroll !== 'hidden', cerrado.scroll);
  check('...y las tarjetas responden al ratón', cerrado.raton !== 'none', cerrado.raton);

  /* EL CANDADO DEL SCROLL SE MIDE CON EL MAZO CERRADO, y no es un detalle.
   *
   * `html.deck-open` también pone `overflow:hidden`, así que con el mazo
   * abierto la página está bloqueada de todas formas. La primera versión de
   * esta prueba abría los dos a la vez y daba verde sobre un candado que no era
   * el suyo: habría pasado igual con la regla del menú borrada. Primero el menú
   * solo, y sólo después se abre el mazo para lo que hace falta el mazo. */
  await page.evaluate(() => toggleAccountMenu(new MouseEvent('click')));
  await page.waitForTimeout(300);
  const soloMenu = await page.evaluate(() => ({
    clase:  document.documentElement.classList.contains('acct-open'),
    mazo:   document.documentElement.classList.contains('deck-open'),
    scroll: getComputedStyle(document.documentElement).overflow,
    raton:  getComputedStyle(document.getElementById('cornerDeck')).pointerEvents,
    barra:  getComputedStyle(document.querySelector('.topbar')).zIndex
  }));
  check('el mazo está cerrado — el candado que se mida es del menú y de nadie más',
        soloMenu.mazo === false, soloMenu);
  check('abrir el menú deja la marca puesta', soloMenu.clase === true);
  check('el fondo no se puede mover mientras el menú está abierto',
        soloMenu.scroll === 'hidden', soloMenu.scroll);
  check('las tarjetas de atrás no reaccionan al ratón — no se abren solas',
        soloMenu.raton === 'none', soloMenu.raton);
  // Y la razón de que funcione, para que nadie "simplifique" el arreglo
  // devolviéndole el número al menú: lo que sube es LA BARRA.
  check('lo que sube es la barra, no el menú (450 sobre el mazo, 399)',
        Number(soloMenu.barra) === 450, soloMenu.barra);

  // Ahora sí, el mazo abierto: es lo único con lo que el menú puede pisarse.
  await page.evaluate(() => { _deckPinned = true; _deckApply(); });
  await page.waitForTimeout(450);

  const abierto = await page.evaluate(() => ({
    menuAbierto: document.getElementById('acctMenu').classList.contains('open'),
    tarjetas: document.getElementById('cornerDeck').children.length
  }));
  check('el menú sigue abierto con el mazo desplegado', abierto.menuAbierto);
  check('...y hay tarjetas con las que pisarse', abierto.tarjetas > 0, abierto.tarjetas);

  /* QUIÉN VA DELANTE SE MIDE CON LAS TARJETAS RECUPERANDO EL RATÓN UN INSTANTE,
   * y hay que explicar por qué, porque parece hacer trampa y es lo contrario.
   *
   * `elementFromPoint` hace una prueba de impacto, y un elemento con
   * `pointer-events:none` NO PARTICIPA: el navegador lo atraviesa. Como el
   * arreglo apaga el ratón del mazo, la pregunta "¿quién está delante?"
   * contestaba "el menú" aunque el menú siguiera detrás — el mazo no se dejaba
   * tocar y el punto caía en lo de abajo. Se comprobó con una mutación: quitando
   * la subida de la barra —o sea, devolviendo el fallo de Jose entero— esta
   * comprobación SEGUÍA EN VERDE.
   *
   * Son dos propiedades distintas y cada una se mide una vez:
   *   · que las tarjetas ignoren el ratón → ya comprobado arriba, sobre el
   *     estado real de la app.
   *   · QUIÉN SE PINTA ENCIMA → es lo que Jose vio, y no depende del ratón. Para
   *     preguntarlo hay que dejar que las dos participen en la prueba de
   *     impacto. Se devuelve el ratón, se mide, y se quita. */
  const quien = await page.evaluate(() => {
    const deck = document.getElementById('cornerDeck');
    const antes = deck.style.pointerEvents;
    deck.style.pointerEvents = 'auto';
    const r = window.__quienManda('#acctMenu', '#cornerDeck');
    deck.style.pointerEvents = antes;
    return r;
  });
  check('SE PISAN — si no, esta prueba no estaría midiendo nada', quien.pisan === true, quien);
  check('Y EL MENÚ SE PINTA DELANTE. Ésta es la queja de Jose, medida',
        quien.encima === '#acctMenu', quien);
  // Y el ratón se quedó como estaba: la medición no puede dejar el arreglo
  // apagado para las comprobaciones que vienen detrás.
  const ratonTrasMedir = await page.evaluate(() =>
    getComputedStyle(document.getElementById('cornerDeck')).pointerEvents);
  check('...y medirlo no dejó el ratón encendido', ratonTrasMedir === 'none', ratonTrasMedir);

  console.log('\n═══ 2. Y se deshace al cerrar ═══\n');

  // Se suelta el mazo también: su candado es suyo, y dejarlo puesto volvería a
  // tapar el del menú, que es justo lo que aquí hay que ver desaparecer.
  await page.evaluate(() => { closeAccountMenu(); _deckPinned = false; _deckApply(); });
  await page.waitForTimeout(350);
  const vuelto = await page.evaluate(() => ({
    clase:  document.documentElement.classList.contains('acct-open'),
    scroll: getComputedStyle(document.documentElement).overflow,
    raton:  getComputedStyle(document.getElementById('cornerDeck')).pointerEvents,
    barra:  getComputedStyle(document.querySelector('.topbar')).zIndex
  }));
  check('la marca se quita', vuelto.clase === false);
  check('...la página se vuelve a mover', vuelto.scroll !== 'hidden', vuelto.scroll);
  check('...las tarjetas vuelven a responder', vuelto.raton !== 'none', vuelto.raton);
  check('...y la barra vuelve a su sitio', Number(vuelto.barra) === 100, vuelto.barra);

  // El peor fallo posible de los tres sería quedarse la clase puesta sin menú
  // abierto: la página sin poder moverse y sin nada que lo explique. Cerrar
  // sobre un menú YA cerrado tiene que ser inofensivo.
  await page.evaluate(() => closeAccountMenu());
  await page.waitForTimeout(150);
  const doble = await page.evaluate(() => ({
    clase: document.documentElement.classList.contains('acct-open'),
    scroll: getComputedStyle(document.documentElement).overflow
  }));
  check('cerrar dos veces no deja la página bloqueada',
        doble.clase === false && doble.scroll !== 'hidden', doble);

  console.log('\n═══ 3. La prioridad es hacia abajo, no hacia arriba ═══\n');
  //
  // El menú gana al mazo porque alguien lo abrió. No puede ganarle a una
  // VENTANA, que alguien abrió también y además después. Subir la barra sin
  // techo es el error simétrico del que se arregló, y sería peor: una ventana
  // a medio llenar tapada por un menú.

  await page.evaluate(() => { toggleAccountMenu(new MouseEvent('click')); });
  await page.waitForTimeout(200);
  await page.evaluate(() => document.getElementById('legalOverlay').classList.add('show'));
  await page.waitForTimeout(300);
  const contraVentana = await page.evaluate(() => window.__quienManda('#legalOverlay', '.topbar'));
  check('una ventana abierta sigue tapando la barra y su menú',
        contraVentana.pisan === true && contraVentana.encima === '#legalOverlay',
        contraVentana);
  await page.evaluate(() => { document.getElementById('legalOverlay').classList.remove('show');
                              closeAccountMenu(); });

  console.log('\n═══ 4. La tabla de capas es la única fuente ═══\n');

  /* La mitad que no se puede medir en el navegador: que los números salgan de
   * la tabla y no de la mano de cada uno.
   *
   * La regla es estrecha a propósito — `position:fixed` con un z-index
   * literal. Ésas son las capas que flotan sobre TODA la app y por lo tanto
   * compiten entre sí. Un `position:absolute` dentro de una tarjeta o un
   * `sticky` en la cabecera de una tabla compiten sólo con sus hermanos, y
   * meterlos aquí habría hecho la regla tan amplia que alguien la borra. */
  const css = (html.match(/<style>([\s\S]*?)<\/style>/g) || []).join('\n');

  const tabla = /:root\{([\s\S]*?)\}/.exec(css);
  const variables = ((tabla && tabla[1]) || '').match(/--z-[a-z-]+:\s*\d+/g) || [];
  check('la tabla existe y tiene una capa por nombre', variables.length >= 14, variables.length);

  // Y ESTÁ ORDENADA. Una tabla cuyos números no suben con el orden en que se
  // leen es una lista, no una tabla: el orden habría que deducirlo otra vez.
  const orden = ['--z-topbar','--z-nudge','--z-deck','--z-bell','--z-drawer-back',
                 '--z-drawer','--z-morning','--z-overlay','--z-confirm','--z-lightbox',
                 '--z-suggest','--z-fullscreen','--z-progress','--z-toast','--z-tip'];
  const valor = {};
  variables.forEach(v => { const m = /(--z-[a-z-]+):\s*(\d+)/.exec(v); valor[m[1]] = Number(m[2]); });
  const desordenadas = [];
  for (let i = 1; i < orden.length; i++) {
    if (!(valor[orden[i]] > valor[orden[i-1]]))
      desordenadas.push(orden[i-1] + '(' + valor[orden[i-1]] + ') ≥ ' + orden[i] + '(' + valor[orden[i]] + ')');
  }
  check('y sube en el mismo orden en que se lee', desordenadas.length === 0, desordenadas);

  // El levantamiento de la barra tiene que caer ENTRE el mazo y el cajón: por
  // encima de lo que se pinta solo, por debajo de lo que alguien abre.
  check('la subida de la barra queda entre el mazo y el cajón del estante',
        valor['--z-deck'] < Number(/--z-topbar-acct:\s*(\d+)/.exec(css)[1]) &&
        Number(/--z-topbar-acct:\s*(\d+)/.exec(css)[1]) < valor['--z-drawer-back'],
        { deck: valor['--z-deck'], acct: /--z-topbar-acct:\s*(\d+)/.exec(css)[1],
          drawer: valor['--z-drawer-back'] });

  /* Las que se quedan fuera de la tabla, con su razón. Como en
   * test-endpoint-auth: no hay tercer estado — o usa la tabla, o está aquí
   * argumentada. Y una excusa que deja de aplicar tiene que borrarse, cosa que
   * se comprueba abajo. */
  const FUERA = {
    '.topbar':
      'Usa la tabla (--z-topbar). Aparece en esta lista sólo porque además se ' +
      'levanta a --z-topbar-acct mientras el menú del avatar está abierto, y ' +
      'ese caso se mide arriba, en el navegador.'
  };

  const sueltas = [];
  const reRegla = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = reRegla.exec(css))) {
    const cuerpo = m[2];
    if (!/position:\s*fixed/.test(cuerpo)) continue;
    if (!/z-index:\s*\d/.test(cuerpo)) continue;      // var(--…) no casa: es lo correcto
    const nombre = m[1].split('\n').pop().trim().slice(0, 60);
    if (FUERA[nombre]) continue;
    sueltas.push(nombre + ' → ' + /z-index:\s*(\d+)/.exec(cuerpo)[1]);
  }
  check('ninguna capa flotante se salta la tabla' +
        (sueltas.length ? ' — SE LA SALTAN: ' + sueltas.join('; ') : ''),
        sueltas.length === 0);

  const rancias = Object.keys(FUERA).filter(n => css.indexOf(n + '{') === -1);
  check('y ninguna excusa se ha quedado vieja', rancias.length === 0, rancias);

  /* LA QUE VIVE EN JAVASCRIPT, y se nombra para que no se pierda de vista: el
   * aviso de "estos dos archivos son de versiones distintas" se pinta con
   * style.cssText y z-index 99999, por encima incluso de los avisos de arriba.
   * Es correcto que gane a todo —dice que lo que estás viendo no se puede
   * creer— pero no sale de la tabla, así que se fija aquí su número. */
  const banner = /versionMismatchBanner[\s\S]{0,400}?z-index:(\d+)/.exec(html);
  check('el aviso de versiones desparejas sigue por encima de todo',
        !!banner && Number(banner[1]) > valor['--z-toast'],
        banner && banner[1]);

  check('y la página no tiró ningún error', errores.length === 0, errores);

  await browser.close();
  console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones');
  process.exit(fail ? 1 : 0);
})();
