// LA AYUDA SE TIENE QUE PODER LEER, EN EL SITIO DONDE ESTÁ EL ICONO.
//
// Jose, 2026-09-09, con captura: "TODOS, ABSOLUTAMENTE TODOS los iconos de i
// que muestran los cuadros de información salen mal, no salen al lado del
// icono, salen muy abajo y detrás de las líneas de los recuadros… debe
// aparecer sobre todo y donde se lo pueda leer completo."
//
// LA CAUSA, MEDIDA EN ESTE MISMO NAVEGADOR Y NO DEDUCIDA:
//
//   #settingsTabContent > .field > label:first-child lleva
//   transform: translateY(-50%) — es lo que sube el título encima de la línea
//   del recuadro. En CSS, un elemento con `transform` PASA A SER EL MARCO DE
//   REFERENCIA de todo position:fixed que tenga dentro, y además crea su propia
//   capa de apilado. La burbuja calculaba sus coordenadas contra la VENTANA y
//   las aplicaba contra ese <label>.
//
//   Las dos cosas que Jose ve —desplazada Y detrás— son una sola.
//
// POR QUÉ NO LO VIO NINGUNA PRUEBA, que es la parte que más importa:
//
//   tools/test-tooltip-edge.js SE FABRICA SUS PROPIOS ICONOS en un div suelto y
//   los mide ahí. Nunca abrió el panel de Ajustes. Es el error de siempre —
//   una prueba que se construye su propio entorno mide ESE ENTORNO, no el
//   producto. Este archivo existe para no volver a cometerlo: carga el
//   Index_v3_fixed.html DE VERDAD, abre el panel DE VERDAD, y mide los iconos
//   que Jose fotografió.
//
// LO QUE PROTEGE:
//
//   1. Que ningún ancestro de un .tip pueda atrapar la burbuja. Es la regla
//      general, no el caso: `transform`, `filter`, `will-change`, `contain` y
//      `perspective` hacen todos lo mismo, y el día que alguien anime otro
//      recuadro el fallo vuelve en otro sitio.
//   2. Que la burbuja cuelgue del <body>, que es lo que hace imposible el (1).
//   3. Que salga PEGADA a su icono, no a dos centímetros.
//   4. Que quepa entera en la ventana: ni cortada por arriba, ni por abajo, ni
//      por los lados.
//   5. Que se pinte por encima del panel, no detrás.
//   6. Que se vaya al hacer scroll — es fixed y su icono no, así que si no se
//      quedaba flotando donde ya no hay nada.
//
// Uso:  node tools/test-tip-in-settings.js

const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const SRC  = path.join(ROOT, 'Index_v3_fixed.html');
let html = fs.readFileSync(SRC, 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

// El mínimo para que la app arranque sin datos. No se dibuja nada del almacén:
// esta prueba sólo necesita el panel de Ajustes y su CSS, que son del archivo.
const stub = `<script>
window.google=window.google||{};window.google.charts={load:function(){},setOnLoadCallback:function(){}};
Object.assign(window.google,{script:{run:new Proxy({},{get(t,k){
  return function(){
    if(k==='withSuccessHandler'){ t._ok=arguments[0]; return window.google.script.run; }
    if(k==='withFailureHandler'){ return window.google.script.run; }
    var ok=t._ok;
    if(k==='getInitialData'){ setTimeout(function(){ ok && ok({accessStatus:'NO_SESSION',userEmail:'',userRole:'NO_SESSION',serverVersion:'test',company:{},oauthClientId:'',oauthRedirectUri:''}); },10); return; }
    setTimeout(function(){ ok && ok({}); },10);
  };
}})}});
<\/script>`;
html = html.replace('</head>', stub + '</head>');
const tmp = path.join(require('os').tmpdir(), 'ac-tip-settings.html');
fs.writeFileSync(tmp, html);

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('file://' + tmp);
  await page.waitForTimeout(400);

  // El panel de Ajustes DE VERDAD, con el mismo marcado que genera la app:
  // .field con su label:first-child, que es donde vive el transform culpable.
  await page.evaluate(() => {
    document.getElementById('settingsOverlay').classList.add('show');
    document.getElementById('settingsTabContent').innerHTML =
      ['Document reader (AI)', 'Check my data', 'Stock totals', 'Movement IDs', 'Deleted movements']
        .map(function (t, i) {
          return '<div class="field" style="margin-bottom:1.25rem">' +
            '<label style="display:flex;align-items:center;gap:.4rem">' + t + ' ' +
            '<span class="info-ic tip" id="ic' + i + '" tabindex="0" data-tip="' +
            'Reads a pasted supplier email and pulls out what is arriving, how much and when. ' +
            'It runs on your own Google AI key — Google bills the usage to you, not to us.">i</span>' +
            // Alto de sobra a propósito: el panel tiene que poder DESPLAZARSE,
            // o la comprobación del scroll mide una página quieta y pasa sin
            // haber probado nada.
            '</label><div style="min-height:180px">contenido</div></div>';
        }).join('');
  });

  console.log('\n═══ el fallo, en su propio sitio ═══\n');

  // (1) La regla general, no el caso. Se pregunta por TODOS los ancestros.
  const trampas = await page.evaluate(() => {
    var out = [];
    document.querySelectorAll('#settingsOverlay .tip').forEach(function (ic) {
      var n = ic.parentElement;
      while (n && n !== document.documentElement) {
        var cs = getComputedStyle(n);
        if (cs.transform !== 'none' || cs.filter !== 'none' || cs.backdropFilter !== 'none' ||
            cs.perspective !== 'none' || cs.willChange !== 'auto' || cs.contain !== 'none') {
          out.push({ icon: ic.id, tag: n.tagName, cls: String(n.className || ''),
                     transform: cs.transform, filter: cs.filter, willChange: cs.willChange,
                     contain: cs.contain, perspective: cs.perspective });
        }
        n = n.parentElement;
      }
    });
    return out;
  });

  // Esto NO se arregla quitando el transform del label — se arregla sacando la
  // burbuja de ahí. Así que la prueba deja constancia de que la trampa sigue
  // existiendo, y comprueba que ya no importa.
  check('el <label> del recuadro sigue llevando su transform (es lo que lo sube ' +
        'a la línea del borde, y no se toca)',
        trampas.some(t => t.tag === 'LABEL' && t.transform !== 'none'), trampas);

  const donde = await page.evaluate(() => {
    var t = document.getElementById('acTip');
    return t ? { existe: true, padre: t.parentElement.tagName } : { existe: false };
  });
  check('la burbuja todavía no existe: se crea la primera vez que hace falta',
        donde.existe === false);

  console.log('\n═══ dónde sale de verdad ═══\n');

  for (let i = 0; i < 5; i++) {
    await page.hover('#ic' + i);
    // La burbuja aparece con un fundido de .15s. Medirla a los 120ms daba
    // opacidad 0.97 y la comprobación fallaba contra código correcto — la
    // prueba llegaba antes que la animación, no el código tarde.
    await page.waitForTimeout(260);

    const m = await page.evaluate((id) => {
      var ic = document.getElementById(id);
      var t  = document.getElementById('acTip');
      if (!t) return null;
      var a = ic.getBoundingClientRect(), b = t.getBoundingClientRect();
      var cs = getComputedStyle(t);
      // ¿Qué se pinta en el centro de la burbuja? Si es la burbuja, está
      // delante; si es otra cosa, está detrás — que es la mitad de la queja.
      // La burbuja lleva pointer-events:none, así que elementFromPoint no la
      // devolvería NUNCA y la comprobación diría "está detrás" siempre — sobre
      // código correcto. Se le devuelven los eventos sólo para preguntar, y se
      // le quitan enseguida: el orden en que se PINTA no depende de eso.
      var pe = t.style.pointerEvents;
      t.style.pointerEvents = 'auto';
      var enMedio = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      t.style.pointerEvents = pe;
      return {
        padre: t.parentElement.tagName,
        opacidad: cs.opacity,
        a: { l: a.left, t: a.top, r: a.right, b: a.bottom, w: a.width, h: a.height },
        b: { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height },
        arriba: enMedio ? (enMedio.id === 'acTip' || enMedio.closest('#acTip') !== null) : false,
        ventana: { w: window.innerWidth, h: window.innerHeight }
      };
    }, 'ic' + i);

    const et = ' (icono ' + i + ')';
    check('la burbuja cuelga del <body>, no del icono' + et, m && m.padre === 'BODY', m && m.padre);
    check('se ve' + et, m && Number(m.opacidad) > 0.95, m && m.opacidad);

    // (3) PEGADA a su icono. Ésta es la que falla con el transform: la burbuja
    // se iba ~225px abajo. Se permite el hueco de 8px más el alto de la propia
    // burbuja cuando se voltea encima.
    const separacionV = m.b.t >= m.a.b ? (m.b.t - m.a.b) : (m.a.t - m.b.b);
    check('sale pegada al icono, no dos centímetros más abajo' + et,
          separacionV >= 0 && separacionV <= 24, { separacionV });

    // Centrada en el icono, salvo que la haya empujado el borde.
    const centroIc = m.a.l + m.a.w / 2, centroB = m.b.l + m.b.w / 2;
    const pegadaBorde = m.b.l <= 10 || m.b.r >= m.ventana.w - 10;
    check('centrada en el icono, o empujada por el borde de la ventana' + et,
          pegadaBorde || Math.abs(centroIc - centroB) <= 2, { centroIc, centroB });

    // (4) Entera dentro de la ventana, por los cuatro lados.
    check('cabe entera: no se corta por arriba ni por abajo' + et,
          m.b.t >= 0 && m.b.b <= m.ventana.h, { top: m.b.t, bottom: m.b.b, h: m.ventana.h });
    check('ni por los lados' + et,
          m.b.l >= 0 && m.b.r <= m.ventana.w, { left: m.b.l, right: m.b.r, w: m.ventana.w });

    // (5) Delante, no detrás de los recuadros.
    check('se pinta POR ENCIMA del panel, no detrás' + et, m.arriba === true);
  }

  console.log('\n═══ y se va cuando tiene que irse ═══\n');

  /* CON EL TECLADO, que es el caso que importa y el que enseñó el fallo.
   *
   * Con el ratón, desplazar mueve el icono de debajo del puntero y el navegador
   * dispara mouseleave: que la ayuda se cierre ahí es correcto y es lo que una
   * persona espera.
   *
   * Con el teclado no: al enfocar un icono que está más abajo, el navegador
   * DESPLAZA la página para enseñarlo — y esconder la burbuja en cualquier
   * scroll la quitaba en el mismo instante en que se acababa de pedir. Por eso
   * ahora SIGUE a su icono en vez de desaparecer. */
  await page.evaluate(() => { document.querySelector('.settings-content').scrollTop = 0; });
  await page.mouse.move(5, 5);
  await page.waitForTimeout(200);

  await page.focus('#ic4');           // el último: enfocarlo obliga a desplazar
  await page.waitForTimeout(260);
  const conFoco = await page.evaluate(() => {
    var t = document.getElementById('acTip');
    var r = document.getElementById('ic4').getBoundingClientRect();
    return { desplazado: document.querySelector('.settings-content').scrollTop,
             op: Number(getComputedStyle(t).opacity),
             hueco: t.getBoundingClientRect().top - r.bottom,
             dentro: r.top >= 0 && r.bottom <= window.innerHeight };
  });
  check('enfocar un icono de más abajo desplaza el panel (si no, esto no mide nada)',
        conFoco.desplazado > 20, conFoco);
  check('y la ayuda SIGUE VISIBLE — irse en ese scroll la quitaría justo cuando ' +
        'se acaba de pedir', conFoco.op > 0.5, conFoco);
  check('...pegada a su icono, no donde estaba antes de desplazarse',
        conFoco.hueco >= 0 && conFoco.hueco <= 24, conFoco);

  // Y si el icono se va de la ventana del todo, la ayuda sobra.
  await page.evaluate(() => { document.querySelector('.settings-content').scrollTop = 0; });
  await page.waitForTimeout(300);
  const fuera = await page.evaluate(() => {
    var t = document.getElementById('acTip');
    var r = document.getElementById('ic4').getBoundingClientRect();
    return { op: Number(getComputedStyle(t).opacity), visible: r.top >= 0 && r.bottom <= window.innerHeight };
  });
  check('con el icono fuera de la ventana, la burbuja se va',
        fuera.visible || fuera.op < 0.5, fuera);

  console.log('\n═══ una ventana baja: el caso que el código viejo no tenía ═══\n');

  await page.setViewportSize({ width: 1280, height: 300 });
  await page.waitForTimeout(120);
  await page.hover('#ic0');
  await page.waitForTimeout(150);
  const apretada = await page.evaluate(() => {
    var t = document.getElementById('acTip');
    if (!t) return null;
    var b = t.getBoundingClientRect();
    return { t: b.top, b: b.bottom, h: window.innerHeight, alto: b.height };
  });
  check('con la ventana baja sigue cabiendo entera — ni arriba ni abajo hay ' +
        'sitio, así que se pone donde más hay en vez de salirse',
        apretada && apretada.t >= 0 && apretada.b <= apretada.h, apretada);

  await browser.close();
  console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobacion(es) ok\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
