// M-02 · VARIAS FOTOS SEGUIDAS, Y REORDENARLAS ARRASTRANDO.
//
// Jose, 11/11: *"si el usuario quiere subir más de una foto… sólo toma la foto
// y se suma un número con la cantidad de fotos, sin necesidad de revisar las
// fotos… también sería buena la opción de poder mover y cambiar el orden de
// las fotos sólo arrastrándolas entre ellas"*.
//
// ── POR QUÉ ESTA PRUEBA ABRE UN NAVEGADOR ───────────────────────────────────
//
// Porque arrastrar no está escrito en ninguna parte: sale de una secuencia de
// `pointerdown` → `pointermove` → `pointerup` y de dónde cae el dedo. Buscar
// con una expresión regular que `insertBefore` está en el archivo pasaría
// igual con el umbral mal puesto, con la ✕ secuestrada o con la foto cayendo
// siempre al mismo sitio. Lo único honesto es moverla y mirar el orden.
//
// ── Y LO QUE SE MIDE NO ES EL DOM, ES EL PDF ────────────────────────────────
//
// El orden de la tira ES el orden de las páginas del PDF, porque
// `_collectDocGroups` las recorre con `querySelectorAll`. Así que después de
// arrastrar se pregunta por lo que se mandaría al servidor, no por cómo quedó
// la pantalla. Es la diferencia entre comprobar que se movió y comprobar que
// sirvió de algo.
//
// Uso:  NODE_PATH="$(npm root -g)" CHROME_PATH=/opt/pw-browsers/chromium-*/chrome-linux*/chrome \
//       node tools/test-fotos-en-rafaga.js

const fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

let ok = 0; const fallos = [];
function check(etiqueta, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + etiqueta); return; }
  fallos.push(etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
  console.log('  ✗    ' + etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
}

const stub = `<script>
window.google=window.google||{};
window.google.charts={load:function(){},setOnLoadCallback:function(){}};
Object.assign(window.google,{script:{run:new Proxy({},{get:function(t,k){return function(){
 if(k==='withSuccessHandler'){t._ok=arguments[0];return window.google.script.run;}
 if(k==='withFailureHandler'){return window.google.script.run;}
 var ok=t._ok; setTimeout(function(){ok&&ok({});},5);};}})}});
<\/script>`;

(async () => {
  const f = path.join(os.tmpdir(), 'ac-raf-' + Date.now() + '.html');
  fs.writeFileSync(f, HTML.replace('</head>', stub + '</head>'));

  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  const p = await b.newPage({ viewport: { width: 900, height: 700 }, hasTouch: true });
  const errores = [];
  p.on('pageerror', e => errores.push(e.message));
  await p.goto('file://' + f, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(700);

  /* Un grupo de documento con cuatro fotos ya dentro. Se montan a mano con la
   * misma forma que deja `_handlePhotoFiles` —`data-b64` y `data-mime`—
   * porque lo que se prueba es el ORDEN, no la compresión, que tiene su propia
   * prueba en `test-la-foto-llena-la-hoja.js`. */
  await p.evaluate(() => {
    /* FIJO ARRIBA Y A LA VISTA, y esto no es cosmética de la prueba: pegado
     * al final del `body` el grupo caía en y=1312, fuera de una pantalla de
     * 700. El ratón no tocaba nada, `elementFromPoint` devolvía `null` y
     * **tres comprobaciones de abajo pasaban en vacío** — que es exactamente
     * el fallo que este proyecto lleva repitiendo: una prueba que dice «ok»
     * sin haber llegado a mirar. */
    document.body.insertAdjacentHTML('beforeend',
      '<div id="cajaPrueba" style="position:fixed;top:10px;left:10px;width:600px;' +
      'background:#fff;z-index:99999;padding:8px"></div>');
    addDocGroup('Bill of lading', 'cajaPrueba');
    const strip = document.querySelector('#cajaPrueba .doc-photos-strip');
    ['A', 'B', 'C', 'D'].forEach(function (letra) {
      const t = document.createElement('div');
      t.className = 'doc-photo-thumb';
      t.dataset.b64 = letra;
      t.dataset.mime = 'image/jpeg';
      t.style.width = '54px'; t.style.height = '54px';
      /* LA IMAGEN VA, Y NO ES DECORACIÓN. Sin ella el thumb sólo contenía la
       * ✕, que está posicionada encima, así que el pointerdown del centro caía
       * en un botón y el arrastre se descartaba — correctamente. La prueba
       * medía un thumb que no existe en la app. */
      t.innerHTML = '<img alt="" src="data:image/gif;base64,' +
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7">' +
        '<button class="remove-photo" ' +
        'onclick="this.closest(\'.doc-photo-thumb\').remove();_updateDocPhotoCount()">✕</button>';
      strip.appendChild(t);
    });
    _updateDocPhotoCount();
  });

  const orden = () => p.evaluate(() =>
    _collectDocGroups('cajaPrueba')[0].photos.map(x => x.fileData).join(''));

  console.log('\n═══ 1 · EL ORDEN DE LA TIRA ES EL ORDEN DEL PDF ═══\n');
  check('de partida, las páginas van A B C D', await orden() === 'ABCD', await orden());

  console.log('\n═══ 2 · ARRASTRAR CAMBIA EL ORDEN ═══\n');

  /* SE BUSCA POR CONTENIDO, NO POR POSICIÓN. Es la lección de este arreglo:
   * medir `thumb[0]` y `thumb[3]` una vez al empezar y luego arrastrar de un
   * sitio al otro de un salto no funciona, porque **al reordenar se mueven
   * todas**. A mitad del arrastre la foto cogida puede quedar justo debajo del
   * dedo y entonces el gesto deja de avanzar. Un arrastre de verdad pasa POR
   * ENCIMA de cada vecina, así que eso es lo que hace esta prueba: se mide
   * dónde está cada letra en ese momento y se va una por una. */
  const centroDe = async (letra) => p.evaluate((L) => {
    const t = Array.from(document.querySelectorAll('#cajaPrueba .doc-photo-thumb'))
      .find(x => x.dataset.b64 === L);
    if (!t) return null;
    const r = t.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width };
  }, letra);

  // La primera (A) se arrastra por encima de B, de C y de D, una por una.
  {
    const a = await centroDe('A');
    await p.mouse.move(a.x, a.y);
    await p.mouse.down();
    await p.mouse.move(a.x + 12, a.y, { steps: 3 });       // pasar el umbral
    for (const L of ['B', 'C', 'D']) {
      const c = await centroDe(L);
      // Un poco pasado el centro: es lo que decide que cae DETRÁS de ésa.
      await p.mouse.move(c.x + c.w * 0.35, c.y, { steps: 6 });
      await p.waitForTimeout(40);
    }
    await p.mouse.up();
    await p.waitForTimeout(120);
    check('arrastrar la primera por encima de las otras la lleva al final',
      await orden() === 'BCDA', await orden());
  }

  // Y de vuelta: A al principio, pasando por encima de D, C y B.
  {
    const a = await centroDe('A');
    await p.mouse.move(a.x, a.y);
    await p.mouse.down();
    await p.mouse.move(a.x - 12, a.y, { steps: 3 });
    for (const L of ['D', 'C', 'B']) {
      const c = await centroDe(L);
      await p.mouse.move(c.x - c.w * 0.35, c.y, { steps: 6 });
      await p.waitForTimeout(40);
    }
    await p.mouse.up();
    await p.waitForTimeout(120);
    check('...y arrastrarla de vuelta la devuelve al principio',
      await orden() === 'ABCD', await orden());
  }

  console.log('\n═══ 3 · LOS TRES CUIDADOS ═══\n');

  /* UN TOQUE NO ES UN ARRASTRE. Sin umbral, un dedo que tiembla tres píxeles
   * reordena el documento sin que nadie lo haya pedido — y en un PDF de ocho
   * páginas eso no se nota hasta que alguien lo abre semanas después. */
  {
    const a = await centroDe('A');
    await p.mouse.move(a.x, a.y);
    await p.mouse.down();
    await p.mouse.move(a.x + 3, a.y + 2, { steps: 2 });
    await p.mouse.up();
    await p.waitForTimeout(100);
    check('un toque con tres píxeles de temblor NO reordena',
      await orden() === 'ABCD', await orden());
  }

  /* LA ✕ SIGUE SIENDO UN BOTÓN. Empezar el arrastre encima de un botón es la
   * forma más fácil de dejarlo inservible, y entonces una foto mal hecha no se
   * puede quitar. */
  {
    await p.evaluate(() => {
      const t = document.querySelectorAll('#cajaPrueba .doc-photo-thumb')[1]; // B
      t.querySelector('.remove-photo').click();
    });
    await p.waitForTimeout(120);
    check('la ✕ sigue quitando la foto', await orden() === 'ACD', await orden());
  }

  /* LA TIRA SE PUEDE SEGUIR DESPLAZANDO. `touch-action:none` puesto siempre
   * deja la tira clavada: con seis fotos no se podría llegar a las de más
   * allá. Sólo se pone mientras se arrastra, y se quita al soltar. */
  {
    const quieta = await p.evaluate(() =>
      document.querySelector('#cajaPrueba .doc-photos-strip').style.touchAction || '');
    check('en reposo la tira se puede desplazar con el dedo', quieta === '', quieta);
  }

  console.log('\n═══ 4 · LA CÁMARA VUELVE SOLA ═══\n');

  /* No se puede abrir la cámara de un teléfono desde aquí, así que lo que se
   * mide es lo único nuestro que hay: que al VOLVER una foto se vuelva a
   * pulsar el selector de cámara, y que al no volver ninguna NO se pulse.
   * Esa es la regla entera; lo demás lo pone el sistema operativo. */
  const pulsaciones = await p.evaluate(async () => {
    const uid = document.querySelector('#cajaPrueba .doc-group').dataset.gid;
    const cam = document.getElementById('docCamInput-' + uid);
    let n = 0;
    cam.click = function () { n++; };                     // contar, no abrir nada
    Object.defineProperty(cam, 'files', { get: () => window.__files, configurable: true });

    window.__files = [new File(['x'], 'a.jpg', { type: 'image/jpeg' })];
    cam.dispatchEvent(new Event('change'));
    await new Promise(r => setTimeout(r, 600));
    const conFoto = n;

    n = 0;
    window.__files = [];                                   // se canceló la cámara
    cam.dispatchEvent(new Event('change'));
    await new Promise(r => setTimeout(r, 600));
    return { conFoto: conFoto, sinFoto: n };
  });

  check('al volver una foto, la cámara se vuelve a abrir', pulsaciones.conFoto === 1, pulsaciones);
  check('al cancelar la cámara, NO se vuelve a abrir', pulsaciones.sinFoto === 0, pulsaciones);

  const reales = errores.filter(m => !/ResizeObserver/.test(m));
  check('ni un error en la página', reales.length === 0, reales[0]);

  await b.close();

  if (fallos.length) {
    console.error('\nFALLÓ:\n  ' + fallos.join('\n  ') + '\n');
    console.error('  El orden de la tira es el orden de las páginas del PDF que\n' +
                  '  alguien abrirá meses después para saber qué llegó.\n');
    process.exit(1);
  }
  console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
})();
