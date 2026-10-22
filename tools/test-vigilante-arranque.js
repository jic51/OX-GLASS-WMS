// EL VIGILANTE DEL ARRANQUE — QUE ALGUIEN QUEDE VIVO PARA CONTARLO.
//
// 14/10/2026. Las dos instalaciones de Jose se quedaron congeladas en
// «Connecting to your spreadsheet…», en la PRIMERA frase, y así se quedaron.
// Los registros de Apps Script mostraban `doGet` anotado y ningún
// `getInitialData` después: el servidor contestó la página y el navegador no
// llegó a pedir los datos nunca.
//
// ── LO QUE ESO SIGNIFICA, Y POR QUÉ NADIE AVISÓ ────────────────────────────
//
// La app tenía TRES protecciones para exactamente este caso:
//
//   1. `#jsVersionTag`, el cartel rojo que dice «JS NOT LOADED». Su propio
//      comentario dice «si el script no corre, esto es lo único en la página
//      que lo dice» — y la pantalla de carga, que se construyó después, lo tapa
//      entero.
//   2. `window.addEventListener('error')` del final del archivo, que baja la
//      pantalla de carga y enseña el fallo.
//   3. La rotación de frases, que a los ~20 segundos ofrece «↻ Reload».
//
// Las dos últimas viven DENTRO del mismo `<script>` de veintidós mil líneas al
// que protegen. Y un `<script>` que no compila no ejecuta ni una línea: ni la
// primera, ni la última, ninguna. Así que el día que ese bloque no compiló
// —un pegado a medias es la forma más común— se cayeron las tres juntas y la
// pantalla de carga se quedó puesta, mintiendo: decía «conectando» cuando
// quería decir «me morí antes de empezar».
//
// ── QUÉ DEFIENDE ESTA PRUEBA ────────────────────────────────────────────────
//
// Que el vigilante siga estando en SU PROPIO bloque y siga sin depender de
// nada del grande. Las dos cosas son fáciles de romper sin notarlo: basta que
// alguien mueva el bloque pequeño dentro del grande «para tenerlo todo junto»,
// o que use `_hideSplash()` ahí dentro porque es la función que ya existe. En
// los dos casos el vigilante sigue leyéndose igual de bien y deja de servir
// para absolutamente nada — y nadie se enteraría hasta el siguiente pegado a
// medias, que es justo cuando no se puede averiguar nada.
//
// La comprobación que lo dice de verdad es la 3: se parte el bloque grande a
// propósito y se mira si el aviso sale. Es la única que mide el producto y no
// el texto.
//
// Uso:  node tools/test-vigilante-arranque.js [path/to/Index_v3_fixed.html]

const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');

const SRC = process.argv[2] || path.join(__dirname, '..', 'Index_v3_fixed.html');
const html = fs.readFileSync(SRC, 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FALLA ' + label + (extra === undefined ? '' : '  → ' + JSON.stringify(extra))); }
}

/* ────────────────────────────────────────────────────────────────────────────
 * 1. DÓNDE VIVE. Sin browser: es una propiedad del archivo, no del render.
 * ──────────────────────────────────────────────────────────────────────────── */
console.log('\n═══ 1. EL VIGILANTE VIVE EN SU PROPIO <script> ═══\n');

/* Se parte el archivo en bloques de script de verdad, no se busca texto suelto:
 * lo que importa es en QUÉ bloque cae cada cosa. */
const bloques = [];
{
  /* El `src=` se busca en LA ETIQUETA DE APERTURA, no en el bloque entero. La
   * primera versión hacía `/src=/.test(m[0])` con `m[0]` incluyendo el cuerpo,
   * así que cualquier bloque que contuviera `img.src = logo` —el del arranque,
   * precisamente— se descartaba por «externo». Encontró un bloque de ocho y
   * dio dos rojos midiendo mi propio regex en vez del archivo. */
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    if (/\bsrc\s*=/i.test(m[1])) continue;         // los externos no cuentan
    bloques.push({ cuerpo: m[2], inicio: m.index, largo: m[2].length });
  }
}
check('el archivo tiene varios bloques de script (' + bloques.length + ')',
  bloques.length >= 3, bloques.length);

const conVigilante = bloques.filter(b => /__acopioArranco\s*=\s*false/.test(b.cuerpo));
const conBandera   = bloques.filter(b => /__acopioArranco\s*=\s*true/.test(b.cuerpo));
check('el vigilante (la espera) está escrito exactamente una vez',
  conVigilante.length === 1, conVigilante.length);
check('la bandera (el "sí arranqué") está escrita exactamente una vez',
  conBandera.length === 1, conBandera.length);

/* SIN COMENTARIOS, y esto no es un detalle: las dos comprobaciones de abajo
 * —cuánto mide y a quién llama— son sobre CÓDIGO, y en este repositorio los
 * comentarios son más largos que el código a propósito.
 *
 * La primera versión no los quitaba y dio dos rojos sobre un producto correcto:
 * el vigilante «medía 4378 caracteres» (casi todo la nota que explica por qué
 * existe) y «llamaba a _hideSplash y showToast» — porque su comentario dice,
 * con esas dos palabras, que NO puede llamarlas. Prohibir algo y que la prueba
 * lea la prohibición como el delito es medir la letra en vez de la intención, y
 * ya van varias. */
function soloCodigo(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
}

if (conVigilante.length === 1 && conBandera.length === 1) {
  const vig = conVigilante[0], ban = conBandera[0];
  const vigCodigo = soloCodigo(vig.cuerpo);
  /* ÉSTA ES LA COMPROBACIÓN QUE EXISTE POR EL FALLO: si los dos cayeran en el
   * mismo bloque, el vigilante moriría con lo que vigila. */
  check('EL VIGILANTE Y LA BANDERA ESTÁN EN BLOQUES DISTINTOS — ' +
        'si estuvieran en el mismo, el vigilante moriría con lo que vigila',
    vig.inicio !== ban.inicio, { vigilante: vig.inicio, bandera: ban.inicio });

  check('...y el vigilante va ANTES, que es cuando se puede llegar a tiempo',
    vig.inicio < ban.inicio, { vigilante: vig.inicio, bandera: ban.inicio });

  /* Corto a propósito: cuanto menos código, menos sitio donde fallar justo
   * cuando es el único que queda en pie. El número es generoso — no se trata de
   * pelearse por líneas, se trata de que no acabe siendo otra app. */
  /* EL TOPE, Y DE DÓNDE SALE. 2500 fue un número que me inventé y el código
   * mide 3314 sin comentarios, así que el rojo era del tope, no del producto.
   * Lo que de verdad ocupa es lo que NO se puede quitar: los dos mensajes
   * completos —tienen que explicarse solos, es lo último que se lee— y los
   * `cssText` a mano del botón y del párrafo, porque este bloque no puede usar
   * las clases de la app: si diera por hecho que la hoja de estilos cargó,
   * estaría dando por hecho justo lo que vigila.
   *
   * 4200 deja sitio para otro mensaje y no para otra función, que es la línea
   * que importa. Lo que impide que esto crezca en serio no es el número: es la
   * comprobación de abajo, la de que no llame a nada. */
  check('...y su CÓDIGO sigue siendo pequeño (' + vigCodigo.trim().length +
        ' caracteres sin comentarios, tope 4200)',
    vigCodigo.trim().length < 4200, vigCodigo.trim().length);

  /* No puede llamar a nada del grande. Si lo hiciera, reventaría dentro del
   * `setTimeout` exactamente el día que hace falta. Con el paréntesis
   * OBLIGATORIO: lo que está prohibido es llamarlas, no nombrarlas. */
  const prohibidas = ['_hideSplash', 'showToast', 'setConnStatus', 'loadDataFromGoogle',
                      '_showSplashReload', '_splashTimer', 'APP_VERSION'];
  const usadas = prohibidas.filter(n => new RegExp('\\b' + n + '\\s*\\(').test(vigCodigo));
  check('...y NO llama a nada del bloque grande', usadas.length === 0, usadas);
  /* `APP_VERSION` no se llama, se lee. Va aparte porque la forma de usarla mal
   * no lleva paréntesis. */
  check('...ni lee una variable suya', !/\bAPP_VERSION\b/.test(vigCodigo));

  /* La bandera, al final del todo: «compilé y corrí de principio a fin». En
   * cualquier otro sitio diría sólo «llegué hasta aquí». */
  const tras = ban.cuerpo.slice(ban.cuerpo.search(/__acopioArranco\s*=\s*true/));
  const lineasUtiles = tras.split('\n').slice(1)
    .map(l => l.replace(/\/\/.*$/, '').trim())
    .filter(l => l && !l.startsWith('/*') && !l.startsWith('*'));
  check('...y la bandera se pone al final del bloque grande, no a mitad ' +
        '(quedan ' + lineasUtiles.length + ' líneas tras ella)',
    lineasUtiles.length <= 3, lineasUtiles);
}

/* ────────────────────────────────────────────────────────────────────────────
 * 2 y 3. EN EL NAVEGADOR.
 * ──────────────────────────────────────────────────────────────────────────── */
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
 serverVersion:(document.documentElement.innerHTML.match(/var APP_VERSION = '([\\d.]+)'/)||[])[1],
 company:{name:'OX Glass LLC.',domain:'ox-glass.com',logo:''},
 movements:[], stock:{}, monitoredMaterials:null,
 config:{ categories:['WINDOW'], projects:[], suppliers:[], locations:[{name:'A1A',group:'RACKS'}], units:['Unit'] },
 incoming:[], rackPhotos:{}, systemActivity:[],
 rolePerms:{canSeeCosts:false,canEditMovements:true,canManageCatalog:true,canExportData:true},
 warehouseRoleLabel:'Warehouse', archiveCutoffMonths:12, oauthClientId:'', oauthRedirectUri:'' };
</script>`;

/* El bloque grande, roto a propósito. Se le mete un paréntesis suelto DENTRO
 * de una función que nadie llama: no cambia ninguna lógica, pero el navegador
 * no puede compilar el bloque, y por tanto no corre NADA de él. Es la forma
 * limpia de reproducir un pegado a medias sin tener que cortar el archivo. */
/* EL ANCLA ES CÓDIGO, NO UN COMENTARIO — arreglo del 22/10.
 *
 * Se anclaba en `// Start\nloadDataFromGoogle();`, que es un COMENTARIO. Desde
 * que la app se pega recortada (`pegar/`, sin prosa) ese ancla no existe ahí:
 * el sabotaje no se podía montar y la prueba daba tres rojos sobre su propio
 * andamio mientras el producto estaba perfectamente.
 *
 * La misma falta de siempre en su versión más tonta: una prueba que se agarra
 * a algo que sólo está en una de las dos copias del archivo. */
function romperElBloqueGrande(fuente) {
  const i = fuente.lastIndexOf('loadDataFromGoogle();');
  if (i < 0) return null;
  return fuente.slice(0, i) + 'function __rota(){ ) }\n' + fuente.slice(i);
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });

  /* ── 2. CON LA APP SANA, EL VIGILANTE SE CALLA ───────────────────────────── */
  console.log('\n═══ 2. CON LA APP SANA NO DICE NADA ═══\n');
  {
    const f = path.join(os.tmpdir(), 'acopio-vig-sana.html');
    fs.writeFileSync(f, html.replace('</head>', stub + '</head>'));
    const page = await browser.newPage({ viewport: { width: 375, height: 760 } });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto('file://' + f);
    await page.waitForTimeout(600);

    const r1 = await page.evaluate(() => ({ bandera: window.__acopioArranco }));
    check('la bandera se pone al arrancar: el bloque grande compiló y corrió',
      r1.bandera === true, r1);

    /* Y SE ESPERA A PASAR LOS OCHO SEGUNDOS. Sin esto la prueba no mide nada:
     * el vigilante ni había tenido ocasión de equivocarse. */
    await page.waitForTimeout(9000);
    const r2 = await page.evaluate(() => {
      const n = document.getElementById('splashNote');
      return {
        splashFuera: !document.getElementById('appSplash') ||
                     document.getElementById('appSplash').classList.contains('gone'),
        nota: n ? n.textContent.trim() : null
      };
    });
    check('a los 9 segundos la app está cargada y NO hay falso aviso de avería',
      r2.splashFuera || !/did not start|Could not reach/i.test(r2.nota || ''), r2);
    check('ningún error suelto en la consola', errs.length === 0, errs.slice(0, 3));
    await page.close();
  }

  /* ── 3. LA DE VERDAD: EL BLOQUE GRANDE NO COMPILA ───────────────────────── */
  console.log('\n═══ 3. EL BLOQUE GRANDE NO COMPILA — LO QUE LE PASÓ A JOSE ═══\n');
  {
    const roto = romperElBloqueGrande(html.replace('</head>', stub + '</head>'));
    check('se pudo preparar el archivo roto', !!roto);
    if (roto) {
      const f = path.join(os.tmpdir(), 'acopio-vig-rota.html');
      fs.writeFileSync(f, roto);
      const page = await browser.newPage({ viewport: { width: 375, height: 760 } });
      const errs = [];
      page.on('pageerror', e => errs.push(e.message));
      await page.goto('file://' + f);
      await page.waitForTimeout(600);

      /* Primero se confirma que el montaje reproduce el fallo DE VERDAD. Si el
       * bloque hubiera compilado, todo lo de abajo estaría midiendo otra cosa
       * — y daría verde por el motivo equivocado. */
      const antes = await page.evaluate(() => ({
        bandera: window.__acopioArranco,
        haySplash: !!document.getElementById('appSplash'),
        nota: (document.getElementById('splashNote') || {}).textContent
      }));
      check('EL MONTAJE REPRODUCE EL FALLO: la bandera NO está puesta',
        antes.bandera === false, antes);
      check('...y la pantalla de carga sigue puesta con la primera frase, ' +
            'igual que en la pantalla de Jose',
        antes.haySplash && /Connecting to your spreadsheet/.test(antes.nota || ''), antes);
      check('...y el navegador registró el error de compilación',
        errs.length > 0, errs.slice(0, 2));

      /* Y AHORA LO QUE IMPORTA: a los ocho segundos, ¿hay alguien vivo? */
      await page.waitForTimeout(8500);
      const d = await page.evaluate(() => {
        const n = document.getElementById('splashNote');
        const sp = document.getElementById('appSplash');
        const btn = sp ? sp.querySelector('button') : null;
        return {
          nota: n ? n.textContent.trim() : null,
          hayBoton: !!btn,
          textoBoton: btn ? btn.textContent.trim() : null,
          /* Todo el texto visible de la pantalla de carga: el aviso largo va
           * en un div hermano, no dentro de la nota. */
          todo: sp ? sp.textContent.replace(/\s+/g, ' ').trim() : null
        };
      });
      check('EL VIGILANTE HABLÓ: la pantalla ya no dice «conectando»',
        !!d.nota && !/Connecting to your spreadsheet/i.test(d.nota), d);
      check('...y dice que la app se paró cargando, no que el servidor vaya lento',
        /stopped while loading/i.test(d.nota || ''), d.nota);

      /* ── LO QUE COSTÓ DOS DÍAS, Y AHORA SALE SOLO ───────────────────────
       *
       * Un error de compilación en un bloque posterior dispara `window.onerror`
       * en uno anterior. Durante el fallo del 14/10 nadie leía ese aviso, así
       * que la pantalla decía «no arrancó» y se callaba lo único accionable:
       * EN QUÉ LÍNEA. Jose tuvo que abrir DevTools y mandar una foto para que
       * yo lo supiera, y hasta entonces estuve persiguiendo hipótesis que no
       * eran — el tamaño del archivo, un carácter invisible, un pegado a
       * medias. El número de línea las habría descartado todas el primer día.
       *
       * Por eso esto no es un adorno: es la diferencia entre un diagnóstico y
       * una adivinanza. */
      check('...Y DICE EN QUÉ LÍNEA SE PARTIÓ — el dato que convierte esto en ' +
            'un diagnóstico en vez de una adivinanza (o dice que el navegador ' +
            'no lo contó, ver abajo)',
        /line [1-9]\d*/i.test(d.todo || '') || /did not say where/i.test(d.todo || ''),
        d.todo && d.todo.slice(0, 260));
      /* ── CUANDO EL NAVEGADOR NO CUENTA NADA ────────────────────────────
       * Esta comprobación iba y venía, y la causa no estaba en el producto:
       * un navegador puede entregar el suceso de error SIN detalles —línea 0,
       * columna 0, mensaje «error»—, que es lo que hace con un script que
       * considera de otro origen. Unas veces los da y otras no.
       *
       * Un rojo que va y viene es el peor de todos, porque se aprende a
       * reejecutarlo hasta que sale verde. Así que lo que se exige ya no es
       * «siempre hay línea», que no depende de nosotros, sino lo que SÍ
       * depende: que la pantalla **no prometa un diagnóstico que no tiene**.
       * O da la línea de verdad, o dice que el navegador no la contó — pero
       * nunca «línea 0, columna 0» rematado con «mándalo a soporte, el número
       * de línea es lo que identifica el problema». */
      const conDetalle = /column \d+/i.test(d.todo || '') &&
                         /unexpected|invalid|token|syntax/i.test(d.todo || '');
      const sinDetalle = /did not say where/i.test(d.todo || '');
      check('...o da la columna y el mensaje del navegador, O dice que el ' +
            'navegador no lo contó — lo que NO puede es enseñar «línea 0, ' +
            'columna 0» y pedir que se mande a soporte',
        conDetalle || sinDetalle, d.todo && d.todo.slice(0, 260));
      check('...y nunca enseña una línea 0 como si fuera un dato',
        !/line 0, column 0/.test(d.todo || ''), d.todo && d.todo.slice(0, 200));
      /* Y NO manda a repetir un pegado que puede no ser la causa. El primer
       * texto lo decía SIEMPRE, con error cazado o sin él. */
      check('...y con un error cazado NO manda a repegar a ciegas: eso sólo ' +
            'sirve cuando no se sabe nada, y aquí se sabe la línea',
        !/paste Index\.html again/i.test(d.todo || ''), d.todo && d.todo.slice(0, 260));
      check('...y deja un botón para salir de ahí', d.hayBoton && /Reload/i.test(d.textoBoton || ''), d);
      await page.close();
    }
  }

  /* ── 4. SIN LA LIBRERÍA DE GOOGLE, EL OTRO DIAGNÓSTICO ──────────────────── */
  console.log('\n═══ 4. SI LO QUE FALTA ES LA LIBRERÍA DE GOOGLE, LO DICE ASÍ ═══\n');
  //
  // Son dos averías que se parecen en la pantalla y no se parecen en nada en la
  // solución: una se arregla volviendo a pegar el archivo y la otra no se
  // arregla pegando nada. Decir la equivocada manda a alguien a perder una
  // tarde, así que el vigilante distingue.
  //
  // ── POR QUÉ AQUÍ EL BLOQUE SE BORRA Y NO SE ROMPE ─────────────────────────
  //
  // La primera versión lo ROMPÍA, como la sección 3, y se puso roja — con
  // razón, y midiendo mal. Un bloque roto dispara `window.onerror`, así que el
  // vigilante tenía un error cazado y enseñaba su línea, que es exactamente lo
  // que debe hacer: un número de línea vale más que cualquier suposición sobre
  // Google. Lo que no reproducía era el caso que esta sección quiere medir.
  //
  // El caso de verdad es «no llegó NADA»: ni código que falle, ni librería. Eso
  // se consigue borrando el bloque, no partiéndolo. Sin error que cazar y sin
  // `google.script`, el vigilante no tiene más remedio que razonar, y ahí es
  // donde tiene que acertar.
  {
    /* También anclado en estructura, no en prosa (ver romperElBloqueGrande):
     * el bloque grande es el ÚLTIMO <script> antes de </body>, y eso es verdad
     * tanto en el archivo del repositorio como en el recortado que Jose pega. */
    const roto = (function () {
      const fin = html.lastIndexOf('</script>');
      if (fin < 0) return html;
      const ini = html.lastIndexOf('<script>', fin);
      if (ini < 0) return html;
      return html.slice(0, ini + '<script>'.length) + '\n' + html.slice(fin);
    })();
    check('se pudo preparar el archivo sin bloque grande', roto !== html);
    const f = path.join(os.tmpdir(), 'acopio-vig-singoogle.html');
    fs.writeFileSync(f, roto);
    const page = await browser.newPage({ viewport: { width: 375, height: 760 } });
    page.on('pageerror', () => {});
    await page.goto('file://' + f);
    await page.waitForTimeout(9000);
    const d = await page.evaluate(() => {
      const sp = document.getElementById('appSplash');
      return {
        nota: (document.getElementById('splashNote') || {}).textContent,
        todo: sp ? sp.textContent.replace(/\s+/g, ' ').trim() : null
      };
    });
    check('sin `google.script` el aviso culpa a Google, no al archivo',
      /Could not reach Google/i.test(d.nota || ''), d.nota);
    check('...y NO manda a pegar el archivo otra vez, que no arreglaría nada',
      !/paste/i.test(d.todo || ''), d.todo && d.todo.slice(0, 220));
    await page.close();
  }

  /* ── 5. Y CON LA APP SANA PERO SIN LIBRERÍA: LA PUERTA DE loadDataFromGoogle ── */
  console.log('\n═══ 5. LA APP SANA Y SIN LIBRERÍA: NI SE CUELGA NI REVIENTA ═══\n');
  //
  // Aquí el bloque grande SÍ corre, así que el vigilante se calla con razón.
  // Lo que tiene que hablar es la puerta de `loadDataFromGoogle`, que antes
  // reventaba con «Cannot read properties of undefined (reading 'run')» y
  // dejaba la pantalla de carga puesta.
  //
  // ── POR QUÉ ESTE MONTAJE LLEVA `google.charts` Y NO `google.script` ───────
  //
  // Mi primera versión no ponía NINGUNO de los dos y se puso roja, pero no por
  // lo que yo creía: el bloque grande no llegaba al final, así que no estaba
  // midiendo la puerta de `loadDataFromGoogle`, estaba midiendo otra avería
  // —`google.charts.load` reventando a mitad de bloque— que ahora va envuelta.
  //
  // Los dos vienen de sitios DISTINTOS y fallan por separado: `google.charts`
  // lo baja un `<script src>` de gstatic.com y `google.script` lo inyecta Apps
  // Script en la página. Así que «cargó una y no la otra» no es un montaje
  // artificial: es la forma exacta que tiene esta avería en la vida real.
  {
    const soloCharts = `<script>
window.google={charts:{load:function(){},setOnLoadCallback:function(){}}};
</script>`;
    const f = path.join(os.tmpdir(), 'acopio-vig-sinlib.html');
    fs.writeFileSync(f, html.replace('</head>', soloCharts + '</head>'));
    const page = await browser.newPage({ viewport: { width: 375, height: 760 } });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto('file://' + f);
    await page.waitForTimeout(1200);
    const d = await page.evaluate(() => {
      const sp = document.getElementById('appSplash');
      return {
        bandera: window.__acopioArranco,
        splashFuera: !sp || sp.classList.contains('gone'),
        toast: (document.getElementById('toastContainer') || {}).textContent || '',
        conn: (document.getElementById('connBanner') || {}).textContent || ''
      };
    });
    check('el bloque grande compiló: la bandera está puesta', d.bandera === true, d);
    check('LA PANTALLA DE CARGA SE BAJA — no se queda puesta para siempre',
      d.splashFuera, d);
    check('...y explica que no se pudo cargar la librería de Google',
      /script library/i.test(d.toast), d.toast.slice(0, 200));
    check('...sin reventar con «undefined (reading \'run\')»',
      !errs.some(e => /reading '?run'?/.test(e)), errs.slice(0, 3));
    await page.close();
  }

  /* ── 6. SIN LAS GRÁFICAS, LA APP SIGUE SIENDO UNA APP ──────────────────── */
  console.log('\n═══ 6. SIN GOOGLE CHARTS LA APP SIGUE FUNCIONANDO ═══\n');
  //
  // `google.charts` lo baja un `<script src>` de gstatic.com — un tercero, en
  // la red de una bodega. Hasta la v12.70 `google.charts.load(...)` estaba
  // suelto A MITAD del bloque grande, así que si no llegaba reventaba ahí y se
  // llevaba por delante TODO lo que venía después: la caché, el reloj de la
  // pantalla de carga, el oyente de errores del final y `loadDataFromGoogle()`.
  // La app entera muerta por dos tartas de colores.
  //
  // Aquí se monta justo eso: `google.script` sí (el servidor contesta) y
  // `google.charts` no. Lo que tiene que pasar es que falten las gráficas y
  // nada más.
  {
    const sinCharts = stub
      .replace("window.google.charts=window.google.charts||{load:function(){},setOnLoadCallback:function(){}};", "")
      .replace("window.google=window.google||{};", "window.google={};");
    const f = path.join(os.tmpdir(), 'acopio-vig-sincharts.html');
    fs.writeFileSync(f, html.replace('</head>', sinCharts + '</head>'));
    const page = await browser.newPage({ viewport: { width: 375, height: 760 } });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto('file://' + f);
    await page.waitForTimeout(1500);
    const d = await page.evaluate(() => {
      const sp = document.getElementById('appSplash');
      const sr = document.getElementById('statsRow');
      return {
        /* El montaje tiene que reproducir la falta de verdad, o todo lo de
         * abajo da verde por el motivo equivocado. */
        sinCharts: !(window.google && window.google.charts),
        bandera: window.__acopioArranco,
        splashFuera: !sp || sp.classList.contains('gone'),
        hayCifras: !!(sr && sr.textContent.replace(/\s+/g, '') !== ''),
        chartsReady: window.chartsReady
      };
    });
    check('EL MONTAJE REPRODUCE LA FALTA: `google.charts` no existe', d.sinCharts, d);
    check('EL BLOQUE GRANDE LLEGA AL FINAL IGUAL — la bandera está puesta',
      d.bandera === true, d);
    check('...la pantalla de carga se baja, la app arrancó', d.splashFuera, d);
    check('...y las cifras están pintadas: se trabaja sin gráficas',
      d.hayCifras, d);
    check('...y `chartsReady` se queda en false, que es lo que mira ' +
          '`drawInventoryCharts` para no dibujar', !d.chartsReady, d);
    check('...sin reventar por `charts` en la consola',
      !errs.some(e => /charts/i.test(e)), errs.slice(0, 3));
    await page.close();
  }

  await browser.close();
  console.log('\n' + (fail ? '✗ ' + fail + ' fallos · ' : '✓ todo bien · ') + (ok + fail) + ' comprobaciones\n');
  process.exit(fail ? 1 : 0);
})();
