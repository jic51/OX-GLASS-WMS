// LA APP TIENE QUE DECIR, A LA VISTA, CUÁNDO NO ESTÁ CONECTADA.
//
// Jose, 2026-10-05: *"poner un label (este sí que se vea como los demás arriba
// en la pantalla) que diga 'you are off-line' y 'back on-line' o algo así."*
//
// ── LO QUE HABÍA ────────────────────────────────────────────────────────────
//
// Un punto de color en la esquina y un `title`:
//
//     btn.title = '● Offline — click to retry';
//
// Nadie pasa el ratón por encima de un punto. Se sigue trabajando, se sigue
// escribiendo, y lo que se escriba no se guarda. **Un estado que te puede
// costar el trabajo no se cuenta en un texto escondido.**
//
// Y no es teórico: en el backlog hay un incidente de agosto —"una vez off-line,
// NUNCA vuelve solo"— que se diagnosticó precisamente porque nadie se enteraba
// de que la app había dejado de hablar con el servidor.
//
// ── POR QUÉ ESTA PRUEBA EJECUTA ─────────────────────────────────────────────
//
// Porque lo que importa son las TRANSICIONES, no el texto: que salga al caer,
// que NO salga al arrancar (arrancar pasa por `loading → online`, y saludar con
// "Back online" al abrir la app sería contar una caída que no hubo), que se vaya
// sola al recuperarse, y que no se tape con la barra de desajuste de versiones
// cuando las dos están a la vez — que es lo que pasaba antes, y la que tapaba
// era justo la de la conexión.
//
// Uso:  node tools/test-barra-conexion.js

const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');

const SRC = process.argv[2] || path.join(__dirname, '..', 'Index_v3_fixed.html');
let html = fs.readFileSync(SRC, 'utf8');
const APP_VERSION = (html.match(/var APP_VERSION\s*=\s*'([^']+)'/) || [])[1] || 'test';

const stub = `<script>
window.google=window.google||{}; window.google.charts=window.google.charts||{load:function(){},setOnLoadCallback:function(){}};
Object.assign(window.google,{script:{run:new Proxy({},{get(t,k){
  return function(){
    if(k==='withSuccessHandler'){ t._ok=arguments[0]; return window.google.script.run; }
    if(k==='withFailureHandler'){ return window.google.script.run; }
    var ok=t._ok;
    if(k==='getInitialData'){ setTimeout(function(){ ok && ok(window.__DATA); },20); return; }
    setTimeout(function(){ ok && ok([]); },20);
  };
}})}});
window.__DATA={ userRole:'ADMIN', userEmail:'jose@ox-glass.com', userName:'Jose Castro',
 serverVersion:'${APP_VERSION}', company:{name:'OX Glass LLC.',domain:'ox-glass.com',logo:''},
 movements:[], stock:{}, monitoredMaterials:null,
 config:{ categories:['WINDOW'], projects:[], suppliers:[], locations:[], units:['UNIT'] },
 incoming:[], rackPhotos:{}, systemActivity:[], pmDirectory:[],
 rolePerms:{canSeeCosts:false,canEditMovements:true,canManageCatalog:true,canExportData:true},
 warehouseRoleLabel:'Warehouse', archiveCutoffMonths:12, oauthClientId:'', oauthRedirectUri:'' };
</script>`;

html = html.replace('</head>', stub + '</head>');
const f = path.join(os.tmpdir(), 'acopio-barra-conexion.html');
fs.writeFileSync(f, html);

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const ANCHO_VENTANA = 1280;
  const page = await browser.newPage({ viewport: { width: ANCHO_VENTANA, height: 800 } });
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  await page.goto('file://' + f);
  await page.waitForTimeout(500);

  const barra = () => page.evaluate(() => {
    const b = document.getElementById('connBanner');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { txt: b.textContent.trim(), clase: b.className,
             top: Math.round(r.top), alto: Math.round(r.height), ancho: Math.round(r.width) };
  });

  /* ═══════════════════════════════════════════════════════════════════════
     1. AL ARRANCAR NO SALUDA
     ═══════════════════════════════════════════════════════════════════════ */
  console.log('\n═══ 1. Al abrir la app no hay barra ═══\n');
  {
    const b = await barra();
    check('NO sale "Back online" al abrir — arrancar pasa por loading → online, ' +
          'y saludar con una recuperación sería contar una caída que no hubo',
          b === null, b);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     2. AL CAERSE, SE VE
     ═══════════════════════════════════════════════════════════════════════ */
  console.log('\n═══ 2. Sin conexión, en grande ═══\n');
  {
    await page.evaluate(() => setConnStatus('offline'));
    await page.waitForTimeout(150);
    const b = await barra();
    check('sale la barra', !!b, b);
    check('EN ROJO, que es lo que significa', b && /\bbad\b/.test(b.clase), b && b.clase);
    check('dice que estás sin conexión', b && /offline/i.test(b.txt), b && b.txt);
    /* LA IDEA, NO LA FRASE. Esto buscaba literalmente «nothing you type can be
     * saved», y en la v12.71 el texto pasó a «Nothing you save will be
     * recorded» —dos líneas, título e instrucción, como pidió Jose—. La prueba
     * se puso roja sobre un aviso que dice exactamente lo mismo y mejor.
     *
     * Lo que no puede faltar es la IDEA: que lo que hagas ahora no queda
     * guardado. Se admite cualquier forma de decirlo y se seguiría cazando el
     * día que alguien deje sólo «You're offline», que es lo que de verdad
     * haría daño — un aviso que nombra el problema y se calla la consecuencia. */
    check('...y LO QUE IMPORTA: que lo que escribas no se va a guardar',
          b && /(not(hing)?|cannot|can't|won't)[^.]*\b(saved?|recorded)\b/i.test(b.txt),
          b && b.txt);
    check('...y que la app lo sigue intentando sola, para que nadie recargue a lo loco',
          b && /retry|retrying/i.test(b.txt), b && b.txt);
    /* ── CAMBIADA EN LA v12.69 ───────────────────────────────────────────
     * Decía «arriba del todo y ocupa el ancho entero», que era verdad cuando
     * la barra EMPUJABA la página. Jose pidió lo contrario: *"que aparezca
     * como los toast que aparecen frente a la pantalla en la parte de arriba
     * [...] menos invasivo y más profesional"*. Ahora es una píldora centrada
     * que flota.
     *
     * Lo que se mide ya no es el ancho sino las dos cosas que de verdad
     * importan: que siga ARRIBA —donde se mira— y que NO llegue de borde a
     * borde, porque una franja de borde a borde es exactamente lo que
     * molestaba. Que no empuje nada lo mide `test-franja-conexion.js`, que es
     * su sitio. */
    check('sigue ARRIBA, donde se mira (top=' + (b && b.top) + ')',
          b && b.top >= 0 && b.top <= 60, b);
    check('...pero ya NO de borde a borde: es una píldora, no una franja ' +
          '(' + (b && b.ancho) + ' px de ' + ANCHO_VENTANA + ')',
          b && b.ancho < ANCHO_VENTANA * 0.9, b);
    check('y tiene alto de verdad, no es una línea invisible', b && b.alto >= 20, b);

    /* Un latido cada veinte segundos vuelve a llamar con el mismo estado. Si
     * cada llamada reescribiera el contenido, el aro se reiniciaría y la barra
     * temblaría. */
    const antes = await page.evaluate(() => document.getElementById('connBanner').innerHTML);
    await page.evaluate(() => { setConnStatus('offline'); setConnStatus('offline'); });
    const despues = await page.evaluate(() => document.getElementById('connBanner').innerHTML);
    check('repetir el mismo estado no la redibuja — si lo hiciera, el aro ' +
          'temblaría en cada latido', antes === despues);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     3. NO SE TAPA CON LA DE LAS VERSIONES
     ═══════════════════════════════════════════════════════════════════════

     Antes cada barra se dibujaba con su propio `position:fixed; top:0`, así que
     con las dos a la vez una tapaba a la otra — y la que tapaba era justo ésta.  */
  console.log('\n═══ 3. Con las dos barras, ninguna tapa a la otra ═══\n');
  {
    await page.evaluate(() => _checkVersionMatch('0.00', 'xxxxxxxx'));
    await page.waitForTimeout(150);
    const dos = await page.evaluate(() => {
      const a = document.getElementById('versionMismatchBanner');
      const b = document.getElementById('connBanner');
      if (!a || !b) return null;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return { ver: { top: Math.round(ra.top), bot: Math.round(ra.bottom) },
               con: { top: Math.round(rb.top), bot: Math.round(rb.bottom) } };
    });
    check('las dos están puestas', !!dos, dos);
    check('UNA DEBAJO DE LA OTRA, sin solaparse',
          dos && (dos.ver.bot <= dos.con.top + 1 || dos.con.bot <= dos.ver.top + 1), dos);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     4. AL VOLVER, LO DICE Y SE VA SOLA
     ═══════════════════════════════════════════════════════════════════════ */
  console.log('\n═══ 4. De vuelta ═══\n');
  {
    await page.evaluate(() => setConnStatus('online'));
    await page.waitForTimeout(150);
    const b = await barra();
    check('sale el aviso de recuperación', !!b, b);
    check('en VERDE', b && /\bgood\b/.test(b.clase), b && b.clase);
    check('y dice que volvió', b && /back online/i.test(b.txt), b && b.txt);

    /* ── Y AQUÍ CAMBIÓ EL CONTRATO EN LA v12.71 ──────────────────────────
     *
     * Antes el verde se iba a los seis segundos y punto. Jose, 15/10: *"es
     * necesario que la app se haya actualizado y esté con los datos correctos
     * en el momento de que el toast verde haya desaparecido"*. Tenía razón y
     * lo que había era mentira: `_pulseOk` enseñaba el verde y DESPUÉS pedía
     * los datos; el verde duraba seis segundos y una carga de Apps Script
     * tarda entre diez y veinte.
     *
     * Ahora son dos tiempos, y el segundo lo enciende la carga, no un reloj:
     *   1. «You are back online · Updating…», SIN cuenta atrás.
     *   2. `_connDatosAlDia()` —que llama `loadDataFromGoogle` cuando una
     *      carga queda aplicada— cambia el texto y arranca los seis segundos.
     *
     * Por eso esta prueba ya no espera a que se vaya sola sin más: eso sería
     * volver a aceptar que el aviso se marche antes de que lleguen los datos,
     * que es exactamente el fallo. Lo que se defiende es LA PROMESA: mientras
     * no haya datos no dice que los haya. */
    await page.waitForTimeout(7000);
    {
      const b2 = await barra();
      check('a los 7 SIGUE ahí: sin datos todavía, el aviso no se va — ' +
            'irse ahora sería dejar en pantalla cifras viejas sin avisar',
            b2 !== null, b2 && b2.txt);
      check('...y NO dice que los datos estén al día, porque no lo están',
            b2 && !/has been updated/i.test(b2.txt), b2 && b2.txt);
      check('...dice que está actualizando, que es lo que de verdad pasa',
            b2 && /updating/i.test(b2.txt), b2 && b2.txt);
    }

    /* Y CUANDO LOS DATOS LLEGAN DE VERDAD. Se llama a mano lo mismo que llama
     * la carga al aplicarse, que es el único momento honesto para decirlo. */
    await page.evaluate(() => _connDatosAlDia());
    await page.waitForTimeout(150);
    {
      const b3 = await barra();
      check('con los datos aplicados, AHORA sí lo dice',
            b3 && /has been updated/i.test(b3.txt), b3 && b3.txt);
      check('...y sigue en verde', b3 && /\bgood\b/.test(b3.clase), b3 && b3.clase);
    }
    await page.waitForTimeout(3000);
    check('a los 3 segundos SIGUE ahí: varios segundos, no un parpadeo',
          (await barra()) !== null);
    await page.waitForTimeout(4000);
    check('y a los 7 YA SE FUE SOLA — al revés que la roja, que se queda ' +
          'mientras siga siendo verdad', (await barra()) === null);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     5. LOS ESTADOS QUE NO SON NOTICIA NO PONEN BARRA
     ═══════════════════════════════════════════════════════════════════════ */
  console.log('\n═══ 5. Comprobar no es una mala noticia ═══\n');
  {
    for (const estado of ['stale', 'loading']) {
      await page.evaluate(e => setConnStatus(e), estado);
      await page.waitForTimeout(100);
      check('"' + estado + '" no pone barra — una por cada comprobación sería ' +
            'ruido cada veinte segundos', (await barra()) === null);
    }
    /* Y el punto de la esquina sigue contando los cuatro estados, que para eso
     * está: la barra es para lo que no se puede ignorar, el punto para el resto. */
    const clase = await page.evaluate(() => document.getElementById('connBtn').className);
    check('pero el punto de la esquina sí lo refleja', /loading/.test(clase), clase);
  }

  check('ningún error de JavaScript', errores.length === 0, errores);

  await browser.close();
  console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones\n');
  process.exit(fail ? 1 : 0);
})();
