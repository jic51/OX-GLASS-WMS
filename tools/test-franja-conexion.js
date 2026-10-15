// LA FRANJA DE CONEXIÓN — QUE AVISE SIN EMPUJAR, Y SIN TAPAR.
//
// Jose, 2026-10-14, con vídeo: *"funciona bien, pero me gustaría cambiarlo y
// hacerlo menos invasivo y más profesional"*.
//
// ── LO QUE MOLESTABA NO ERA EL COLOR ───────────────────────────────────────
//
// Era que la franja OCUPABA SITIO. Se insertaba como primer hijo de <body>, en
// flujo normal, así que al aparecer empujaba la app entera hacia abajo y al
// irse la subía. El aviso de «Back online» dura varios segundos: el contenido
// saltaba dos veces por un mensaje que no pide nada.
//
// ── Y POR QUÉ NO BASTABA CON PONERLA A FLOTAR ──────────────────────────────
//
// Porque eso ya se hizo una vez y salió mal. Una versión anterior flotaba, y en
// un teléfono el aviso se comía la barra de navegación entera: las pestañas y
// el círculo de la cuenta quedaban DEBAJO del aviso y no se podían pulsar. Lo
// cazó `test-responsive-polish` a 375 px, y por eso el comentario del CSS dice,
// desde entonces, que ocupa su sitio A PROPÓSITO.
//
// Lo que resuelve las dos cosas a la vez es distinguir QUÉ aviso:
//
//   · EL DE VERSIONES sigue ocupando sitio. Vive meses, es la única señal de
//     que los dos archivos no son del mismo juego, y no puede taparse.
//   · LOS DE CONEXIÓN flotan — y como no llevan nada que pulsar, con
//     `pointer-events:none` lo de debajo SIGUE SIENDO PULSABLE. Eso es lo que
//     mata el fallo viejo: el aviso deja de ser una pared y pasa a ser una
//     pegatina.
//
// Esta prueba existe para que nadie vuelva a flotar el de versiones, y para que
// nadie le quite el `pointer-events:none` al de conexión.
//
// Uso:  node tools/test-franja-conexion.js [path/to/Index_v3_fixed.html]

const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');

const SRC = process.argv[2] || path.join(__dirname, '..', 'Index_v3_fixed.html');
let html = fs.readFileSync(SRC, 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FALLA ' + label + (extra === undefined ? '' : '  → ' + JSON.stringify(extra))); }
}

/* La versión DE VERDAD del archivo, no una inventada. La primera versión de
 * esta prueba ponía `serverVersion:'test'`, que no coincide con `APP_VERSION`
 * — así que el aviso de VERSIONES salía solo, y el punto de partida ya tenía
 * una franja ocupando 91 px. Dos comprobaciones se pusieron rojas midiendo mi
 * propio montaje en vez del producto. */
const VER = (html.match(/var APP_VERSION = '([\d.]+)'/) || [])[1];
const BUILD = (html.match(/var APP_BUILD = '([^']*)'/) || [])[1] || '';

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
 serverVersion:'${VER}', serverBuild:'${BUILD}', company:{name:'OX Glass LLC.',domain:'ox-glass.com',logo:''},
 movements:[], stock:{}, monitoredMaterials:null,
 config:{ categories:['WINDOW'], projects:[], suppliers:[],
   locations:[{name:'A1A',group:'RACKS'}], units:['Unit'] },
 incoming:[], rackPhotos:{}, systemActivity:[],
 rolePerms:{canSeeCosts:false,canEditMovements:true,canManageCatalog:true,canExportData:true},
 warehouseRoleLabel:'Warehouse', archiveCutoffMonths:12, oauthClientId:'', oauthRedirectUri:'' };
</script>`;
const f = path.join(os.tmpdir(), 'acopio-franja.html');
fs.writeFileSync(f, html.replace('</head>', stub + '</head>'));

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });

  /* A 375 px, que es el ancho al que el fallo viejo apareció. Si se va a
   * romper, se rompe aquí y no en un escritorio de 1280. */
  const page = await browser.newPage({ viewport: { width: 375, height: 760 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + f);
  await page.waitForTimeout(700);

  const estado = () => page.evaluate(() => {
    const tb = document.querySelector('.topbar');
    const r  = tb ? tb.getBoundingClientRect() : null;
    const toasts = document.getElementById('topToasts');
    const banners = document.getElementById('topBanners');
    const conn = document.getElementById('connBanner');
    return {
      topbarY: r ? Math.round(r.top) : null,
      tbAlto: getComputedStyle(document.documentElement).getPropertyValue('--tb-alto').trim(),
      hayConn: !!conn,
      connEnFlotante: !!(conn && toasts && conn.parentNode === toasts),
      connEnFlujo: !!(conn && banners && conn.parentNode === banners),
      toastsPos: toasts ? getComputedStyle(toasts).position : null,
      toastsPointer: toasts ? getComputedStyle(toasts).pointerEvents : null,
      bannersPos: banners ? getComputedStyle(banners).position : null,
      connTono: conn ? conn.className : ''
    };
  });

  console.log('\n═══ 1. SIN AVISO, EL PUNTO DE PARTIDA ═══\n');
  const base = await estado();
  check('la barra de navegación está arriba del todo (y=' + base.topbarY + ')',
    base.topbarY !== null && base.topbarY <= 2, base);

  console.log('\n═══ 2. SIN CONEXIÓN: SALE, Y NO MUEVE NADA ═══\n');
  await page.evaluate(() => { _connUltimo = 'online'; setConnStatus('offline'); });
  await page.waitForTimeout(250);
  const off = await estado();
  check('sale el aviso', off.hayConn, off);
  check('...en rojo', /\bbad\b/.test(off.connTono), off.connTono);
  check('...en la pila FLOTANTE, no en la que ocupa sitio', off.connEnFlotante, off);
  check('...que está en `fixed`, fuera del flujo', off.toastsPos === 'fixed', off);
  /* LO QUE JOSE PIDIÓ, MEDIDO: la app no se mueve. */
  check('LA BARRA DE NAVEGACIÓN NO SE HA MOVIDO NI UN PÍXEL (' + base.topbarY +
        ' → ' + off.topbarY + ')', off.topbarY === base.topbarY, { base: base.topbarY, off: off.topbarY });
  check('...y `--tb-alto` sigue a cero: nada reservó espacio',
    off.tbAlto === '0px', off.tbAlto);

  console.log('\n═══ 3. Y LO DE DEBAJO SE SIGUE PUDIENDO PULSAR ═══\n');
  //
  // Ésta es LA comprobación de esta prueba. El fallo viejo fue exactamente
  // esto: el aviso flotaba y dejaba los botones debajo, inalcanzables. Lo que
  // lo arregla no es la posición, es `pointer-events:none`.
  check('la pila flotante no intercepta el ratón', off.toastsPointer === 'none', off);
  {
    const r = await page.evaluate(() => {
      const btn = document.getElementById('acctBtn');
      if (!btn) return { hay: false };
      const b = btn.getBoundingClientRect();
      const x = Math.round(b.left + b.width / 2), y = Math.round(b.top + b.height / 2);
      const encima = document.elementFromPoint(x, y);
      return {
        hay: true,
        /* Lo que de verdad importa: QUIÉN recibe el clic en el centro del
         * botón de la cuenta. Si fuera el aviso, el botón está muerto. */
        loRecibe: encima ? (encima.id || encima.className || encima.tagName) : null,
        esElBoton: !!(encima && (encima === btn || btn.contains(encima)))
      };
    });
    check('el botón de la cuenta existe a 375 px', r.hay, r);
    check('...y quien recibe el clic en su centro es ÉL, no el aviso — ' +
          'que es justo el fallo que costó la versión anterior',
      r.esElBoton, r);
  }
  {
    /* Y se pulsa de verdad, no sólo en teoría: `elementFromPoint` puede dar el
     * botón y aun así fallar el clic si algo lo cubre a medias. */
    await page.click('#acctBtn', { timeout: 3000 }).catch(() => {});
    const abierto = await page.evaluate(() => {
      const m = document.getElementById('acctMenu');
      return !!(m && m.classList.contains('open'));
    });
    check('...y pulsarlo de verdad abre el menú, con el aviso en pantalla', abierto);
    await page.evaluate(() => { try { closeAccountMenu(); } catch (e) {} });
  }

  console.log('\n═══ 4. LA VUELTA: VERDE, Y SE VA SOLA ═══\n');
  await page.evaluate(() => { setConnStatus('online'); });
  await page.waitForTimeout(250);
  const back = await estado();
  check('al volver sale el aviso verde', back.hayConn && /\bgood\b/.test(back.connTono), back);
  check('...también flotando', back.connEnFlotante, back);
  check('...y la barra sigue sin moverse', back.topbarY === base.topbarY, back);

  /* «Deben permanecer varios segundos, para que se noten» — Jose. Se comprueba
   * que a los 3 segundos SIGUE ahí, no que desaparezca a los 6: fijar el
   * número exacto haría que ajustarlo rompiera la prueba sin que nada esté
   * mal. Lo que hay que defender es que no sea un parpadeo. */
  await page.waitForTimeout(3000);
  const trasTres = await estado();
  check('a los 3 segundos sigue en pantalla: varios segundos, no un parpadeo',
    trasTres.hayConn, trasTres);

  /* ── v12.71: EL VERDE YA NO SE VA POR RELOJ ──────────────────────────────
   *
   * Esperaba a que desapareciera sola a los 7 segundos. Desde la v12.71 el
   * verde se queda en «Updating…» hasta que una carga se APLICA de verdad, y
   * sólo entonces cuenta sus seis segundos — porque el texto promete datos al
   * día y antes se iba diez segundos antes de que llegara ninguno.
   *
   * Aquí no hay carga que llegue: el montaje llama a `setConnStatus` a mano.
   * Así que lo correcto es que SIGA puesto, y volver a esperar que se vaya
   * sería pedirle a la app justo el fallo que se arregló. Se dispara a mano lo
   * mismo que dispara la carga, y a partir de ahí sí se va. */
  await page.evaluate(() => { _connDatosAlDia(); });
  /* Siete y no cuatro: `_connDatosAlDia` REARRANCA la cuenta de seis segundos,
   * que es justo el punto — los seis segundos empiezan cuando llegan los
   * datos, no cuando vuelve la conexión. Esperar cuatro era medir el reloj
   * viejo con el contrato nuevo. */
  await page.waitForTimeout(7000);
  const trasSiete = await estado();
  check('...y una vez aplicados los datos, a los pocos segundos se fue sola',
    !trasSiete.hayConn, trasSiete);
  check('...sin dejar la barra movida', (await estado()).topbarY === base.topbarY);

  console.log('\n═══ 5. EL AVISO DE VERSIONES NO FLOTA, Y NO DEBE ═══\n');
  //
  // Vive meses y es la única señal de que los dos archivos no son del mismo
  // juego. Si flotara, se podría leer por encima de él y seguir trabajando con
  // una app a medio actualizar.
  {
    const r = await page.evaluate(() => {
      _barraArriba('versionMismatchBanner', 'warn', 'Files do not match');
      const b = document.getElementById('versionMismatchBanner');
      const banners = document.getElementById('topBanners');
      const tb = document.querySelector('.topbar');
      return {
        enFlujo: !!(b && banners && b.parentNode === banners),
        tbAlto: getComputedStyle(document.documentElement).getPropertyValue('--tb-alto').trim(),
        topbarY: Math.round(tb.getBoundingClientRect().top)
      };
    });
    check('el aviso de versiones sigue en la pila que OCUPA SITIO', r.enFlujo, r);
    check('...y sí reserva alto (' + r.tbAlto + '), para no taparse con nada',
      r.tbAlto !== '0px' && r.tbAlto !== '', r);
    check('...y la barra de navegación baja a ponerse debajo (y=' + r.topbarY + ')',
      r.topbarY > base.topbarY, r);
    await page.evaluate(() => { _barraArriba('versionMismatchBanner', 'warn', ''); });
  }

  check('ningún error suelto en la consola', errs.length === 0, errs.slice(0, 3));

  await browser.close();
  console.log('\n' + (fail ? '✗ ' + fail + ' fallos · ' : '✓ todo bien · ') + (ok + fail) + ' comprobaciones\n');
  process.exit(fail ? 1 : 0);
})();
