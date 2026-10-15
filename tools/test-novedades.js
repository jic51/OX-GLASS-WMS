// LA VENTANA DE NOVEDADES — QUE AVISE UNA VEZ Y NO SE VUELVA UN ANUNCIO.
//
// Jose la pidió el 13/10, y la pidió DESPUÉS de que yo le dijera que no a otra
// cosa: *"en algún momento te dije que podíamos poner un popup cada cierto
// tiempo como publicidad muy silenciosa... pero me dijiste que no. Ahora la
// pregunta es, ¿cómo es eso diferente a mostrar el changelog y cómo podemos
// hacerlo sin que el usuario sienta lo mismo que con el popup?"*
//
// La diferencia cabe en una pregunta: **¿sale porque algo les pasó a ELLOS, o
// porque pasó el tiempo para NOSOTROS?** Lo primero es información; lo segundo
// es publicidad. Esta prueba existe para que esa frontera no se cruce sola con
// el tiempo, y por eso casi todas sus comprobaciones son sobre CUÁNDO NO SALE.
//
// Usage:  node tools/test-novedades.js [path/to/Index_v3_fixed.html]

const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');

const RAIZ = path.join(__dirname, '..');
const SRC  = process.argv[2] || path.join(RAIZ, 'Index_v3_fixed.html');
let html = fs.readFileSync(SRC, 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FALLA ' + label + (extra === undefined ? '' : '  → ' + JSON.stringify(extra))); }
}

const VER = (html.match(/var APP_VERSION = '([\d.]+)'/) || [])[1];

/* ══ 1 · EL CONTENIDO VIAJA EN EL ARCHIVO, Y TIENE QUE ESTAR AL DÍA ═════════ */

console.log('\n═══ 1. LA LISTA DE DENTRO DEL ARCHIVO ═══\n');

const bloque = (html.match(/var NOVEDADES = \[[\s\S]*?\n\];/) || [''])[0];
check('`NOVEDADES` existe en el archivo', !!bloque);

const versiones = [...bloque.matchAll(/ver:\s*'([\d.]+)'/g)].map(m => m[1]);
check('la primera entrada es la versión de ESTE archivo (' + VER + '). ' +
      'Si no, la ventana contaría una versión que el cliente no tiene',
  versiones[0] === VER, { primera: versiones[0], app: VER });

/* El techo es lo que impide que esto se convierta en un archivo que crece para
 * siempre: cada cliente se descargaría años de notas para leer una. */
const TOPE = 4;
check('hay ' + versiones.length + ' entradas, y el tope es ' + TOPE +
      ' — esto es una ventana de las últimas, no el historial',
  versiones.length > 0 && versiones.length <= TOPE, { versiones });

check('no hay versiones repetidas', new Set(versiones).size === versiones.length, versiones);

/* Orden descendente: la ventana enseña la primera que coincide, y una lista
 * desordenada haría que «la más reciente que el archivo conoce» no lo fuera. */
const num = v => v.split('.').map(Number);
let ordenadas = true;
for (let i = 1; i < versiones.length; i++) {
  const a = num(versiones[i - 1]), b = num(versiones[i]);
  if (!(a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]))) ordenadas = false;
}
check('van de la más nueva a la más vieja', ordenadas, versiones);

/* Cada entrada completa. Una sin `antes`/`ahora` se dibuja sin el recuadro y
 * pierde justo lo que Jose pidió: ver algo de lo que cambió. */
/* Se trocea por `{ ver:` y no con una llave de cierre: las entradas terminan
 * en `' },` y el primer intento buscaba `\n  }`, así que leía CERO y lo
 * decía — una prueba que no encuentra nada y lo canta es mejor que una que
 * encuentra algo distinto y calla. */
const entradas = bloque.split(/\{\s*ver:/).slice(1);
check('se leen las ' + versiones.length + ' entradas enteras',
  entradas.length === versiones.length, { leidas: entradas.length });
for (let i = 0; i < entradas.length; i++) {
  const e = entradas[i];
  check('v' + versiones[i] + ': tiene título, puntos, antes y ahora',
    /titulo:/.test(e) && /puntos:\s*\[/.test(e) && /antes:/.test(e) && /ahora:/.test(e));
}

/* ══ 2 · EL ENLACE LLEVA A LA NOTA DE ESA VERSIÓN, Y EXISTE ════════════════ */

console.log('\n═══ 2. EL ENLACE NO LLEVA A UN SITIO QUE NO ESTÁ ═══\n');
//
// El ancla se construye con el número de versión y no se escribe a mano en cada
// entrada, porque una dirección escrita al lado de un número es otra pareja que
// tiene que coincidir sin que nada lo obligue. Lo que falta por comprobar es la
// otra mitad: que el changelog publicado TENGA esa ancla.

const changelog = fs.readFileSync(path.join(RAIZ, 'landing', 'changelog.html'), 'utf8');
const novedades = fs.readFileSync(path.join(RAIZ, 'landing', 'novedades.html'), 'utf8');
for (const v of versiones) {
  const ancla = 'id="v' + v.replace('.', '-') + '"';
  check('v' + v + ': el changelog en inglés tiene el ancla ' + ancla,
    changelog.indexOf(ancla) !== -1);
  check('v' + v + ': y el de español también, para que las dos lenguas enlacen igual',
    novedades.indexOf(ancla) !== -1);
}

/* ══ 3 · EN UN NAVEGADOR: CUÁNDO SALE Y, SOBRE TODO, CUÁNDO NO ════════════ */

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
 serverVersion:'${VER}', company:{name:'OX Glass LLC.',domain:'ox-glass.com',logo:''},
 movements:[], stock:{}, monitoredMaterials:null,
 config:{ categories:['WINDOW'], projects:['TOWER ONE'], suppliers:[],
   locations:[{name:'A1A',group:'RACKS'}], units:['pcs'] },
 incoming:[], rackPhotos:{}, systemActivity:[],
 rolePerms:{canSeeCosts:false,canEditMovements:true,canManageCatalog:true,canExportData:true},
 warehouseRoleLabel:'Warehouse', archiveCutoffMonths:12, oauthClientId:'', oauthRedirectUri:'' };
</script>`;
html = html.replace('</head>', stub + '</head>');
const f = path.join(os.tmpdir(), 'acopio-novedades.html');
fs.writeFileSync(f, html);

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });

  /* Cada escenario en su propio contexto: localStorage es lo que se está
   * midiendo, así que compartirlo entre escenarios mediría el anterior. */
  async function escenario(preparar) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const errores = [];
    page.on('pageerror', e => errores.push(e.message));
    await page.goto('file://' + f);
    if (preparar) await page.evaluate(preparar);
    await page.reload();
    await page.waitForTimeout(3400);          // el arranque la saca a los 2,5 s
    const abierta = await page.evaluate(() =>
      !!document.getElementById('novedadesOverlay') &&
      document.getElementById('novedadesOverlay').classList.contains('show'));
    return { ctx, page, abierta, errores };
  }

  console.log('\n═══ 3. LA PRIMERA VISITA NO VE NADA ═══\n');
  //
  // Enseñarle «lo que cambió» a alguien que entra por primera vez es contarle el
  // final de una película que no ha visto. Y es el caso de TODO cliente nuevo:
  // si esto fallara, la primera impresión de Acopio sería un anuncio.
  {
    const e = await escenario(() => { try { localStorage.clear(); } catch (x) {} });
    check('sin versión guardada NO se abre nada', !e.abierta);
    const guardada = await e.page.evaluate(() => localStorage.getItem('acopio_novedades_vista'));
    check('...pero se apunta la versión actual, para que el próximo cambio sí avise',
      guardada === VER, { guardada, VER });
    check('y el punto de sin-leer tampoco aparece',
      !(await e.page.evaluate(() => {
        var b = document.getElementById('acctBtn');
        return !!b && b.classList.contains('nv-hay');
      })));
    await e.ctx.close();
  }

  console.log('\n═══ 4. LA MISMA VERSIÓN, OTRA VEZ, TAMPOCO ═══\n');
  //
  // Ésta es la que separa «información» de «anuncio». Si sale dos veces por la
  // misma versión, ya es lo que Jose no quería.
  {
    const e = await escenario((v) => {
      try { localStorage.setItem('acopio_novedades_vista', document.documentElement.__v || ''); } catch (x) {}
    });
    await e.ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto('file://' + f);
    await page.evaluate((v) => { try { localStorage.setItem('acopio_novedades_vista', v); } catch (x) {} }, VER);
    await page.reload();
    await page.waitForTimeout(3400);
    const abierta = await page.evaluate(() =>
      document.getElementById('novedadesOverlay').classList.contains('show'));
    check('con la versión ya vista NO se abre', !abierta);
    check('...y no hay punto de sin-leer',
      !(await page.evaluate(() => document.getElementById('acctBtn').classList.contains('nv-hay'))));
    await ctx.close();
  }

  console.log('\n═══ 5. UNA VERSIÓN DISTINTA SÍ ═══\n');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const errores = [];
    page.on('pageerror', e => errores.push(e.message));
    await page.goto('file://' + f);
    await page.evaluate(() => { try { localStorage.setItem('acopio_novedades_vista', '1.0'); } catch (x) {} });
    await page.reload();
    await page.waitForTimeout(3400);
    const abierta = await page.evaluate(() =>
      document.getElementById('novedadesOverlay').classList.contains('show'));
    check('viniendo de una versión anterior, se abre', abierta);

    const dentro = await page.evaluate(() => {
      var c = document.getElementById('nvCuerpo');
      return {
        texto: c.textContent.replace(/\s+/g, ' ').trim(),
        antes: (c.querySelector('.nv-antes .nv-txt') || {}).textContent || '',
        ahora: (c.querySelector('.nv-ahora .nv-txt') || {}).textContent || '',
        puntos: c.querySelectorAll('.nv-lista li').length,
        enlace: (c.querySelector('a[href*="changelog"]') || {}).href || '',
        /* Se busca el redactor de Gmail y NO el esquema de correo del
         * sistema: ese esquema depende de qué app tenga marcada cada
         * computadora, y Jose se quedó con el botón ✉ abriendo Outlook para
         * siempre por haber marcado «Always» una vez. La app no tiene ni uno,
         * y `test-tanda-borrado.js` lo cuenta. */
        correo: (c.querySelector('a[href*="mail.google.com"]') || {}).href || ''
      };
    });
    check('...nombrando la versión que es',
    dentro.texto.indexOf('Version ' + VER) !== -1, dentro.texto.slice(0, 60));
    check('...con el ANTES y el AHORA, que es «lo que se ve» que pidió Jose',
      !!dentro.antes && !!dentro.ahora && dentro.antes !== dentro.ahora,
      { antes: dentro.antes, ahora: dentro.ahora });
    check('...con su lista de puntos', dentro.puntos >= 2, { puntos: dentro.puntos });
    check('...y el enlace apunta a ESTA versión, no al changelog entero',
      dentro.enlace.indexOf('#v' + VER.replace('.', '-')) !== -1, dentro.enlace);
    check('...y lleva el correo de soporte por Gmail, con el asunto ya puesto',
      /mail\.google\.com/.test(dentro.correo) &&
      dentro.correo.indexOf('%40gmail.com') !== -1 &&
      /su=Acopio/.test(dentro.correo), dentro.correo);

    /* Se marca vista al ABRIR, no al pulsar «Got it»: quien la lea y la cierre
     * con la ✕ no debe volver a verla mañana. Ésa es la forma más rápida de
     * convertir esto en lo que no queríamos. */
    const guardada = await page.evaluate(() => localStorage.getItem('acopio_novedades_vista'));
    check('se marca como vista al abrirla, no al pulsar el botón', guardada === VER, { guardada });

    await page.evaluate(() => cerrarNovedades());
    await page.waitForTimeout(100);
    check('se cierra', !(await page.evaluate(() =>
      document.getElementById('novedadesOverlay').classList.contains('show'))));

    /* Y el sitio permanente: se puede volver a abrir aunque ya no haya novedad.
     * Es la pieza que Jose pidió y la que hace que cerrarla no cueste nada. */
    await page.evaluate(() => abrirNovedades());
    await page.waitForTimeout(100);
    check('y se puede volver a abrir a mano cuando ya no hay novedad: ' +
          'es el sitio fijo, y por eso cerrarla no cuesta nada',
      await page.evaluate(() =>
        document.getElementById('novedadesOverlay').classList.contains('show')));
    check('ningún error suelto', errores.length === 0, errores.slice(0, 2));
    await ctx.close();
  }

  console.log('\n═══ 6. NO SE APILA SOBRE OTRA VENTANA ═══\n');
  //
  // Dos ventanas una encima de otra es el error que costó la v11.29. Lo que
  // llegó hoy a la bodega manda sobre lo que cambió en la app.
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto('file://' + f);
    await page.evaluate(() => { try { localStorage.setItem('acopio_novedades_vista', '1.0'); } catch (x) {} });
    await page.reload();
    await page.waitForTimeout(900);
    await page.evaluate(() => { document.getElementById('legalOverlay').classList.add('show'); });
    await page.waitForTimeout(2600);
    check('con otra ventana abierta NO se abre encima',
      !(await page.evaluate(() =>
        document.getElementById('novedadesOverlay').classList.contains('show'))));
    check('...pero el punto de sin-leer sí queda, para abrirla cuando se quiera',
      await page.evaluate(() => document.getElementById('acctBtn').classList.contains('nv-hay')));
    await ctx.close();
  }

  console.log('\n═══ 7. MARCA BLANCA: NI ENLACE NI CORREO ═══\n');
  //
  // Una app renombrada no debe contarle a su gente de dónde salió. Es la misma
  // regla que ya cumple `_syncProductLinks` con el nombre del header, y tienen
  // que cumplirla las dos o ninguna.
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto('file://' + f);
    await page.waitForTimeout(800);
    const r = await page.evaluate(() => {
      window.company = { productName: 'Bodega Pro' };
      abrirNovedades();
      var c = document.getElementById('nvCuerpo');
      return { enlace: !!c.querySelector('a[href*="changelog"]'),
               correo: !!c.querySelector('a[href*="mail.google.com"]'),
               titulo: !!c.querySelector('.nv-lista li') };
    });
    check('con el producto renombrado NO sale el enlace a acopio.net', !r.enlace);
    check('...ni el correo de soporte', !r.correo);
    check('...pero lo que cambió se sigue contando igual: desaparece de dónde ' +
          'viene, no la información', r.titulo);
    await ctx.close();
  }

  /* ── 8. EL ENLACE DE SOPORTE, ARMADO A TROZOS Y COMPLETO ────────────────
   *
   * 15/10/2026. Esta línea tuvo la app de Jose muerta dos días. El vigilante
   * dio la posición exacta —línea 13532, columna 14 del bloque grande, que es
   * la comilla de apertura de la URL— y su panel Sources enseñaba la línea
   * SERVIDA cortada justo en la doble barra:
   *
   *     a.href = 'https:
   *
   * Una cadena sin cerrar. Y un bloque que no compila no ejecuta ni una
   * línea: la app entera muerta por el enlace de correo del pie de esta
   * ventana.
   *
   * Ahora la URL se arma a trozos, con la doble barra y el «&» puestos por
   * código. Eso es fácil de deshacer sin querer: alguien la ve fea, la junta
   * en una sola cadena «para que se lea mejor», y vuelve el fallo. De ahí las
   * comprobaciones: que el resultado siga siendo la dirección correcta
   * —porque un truco que rompe la función no sirve de nada— y que la fuente
   * no la haya vuelto a juntar. */
  console.log('\n═══ 8. EL ENLACE DE SOPORTE: ENTERO, Y SIN LA LÍNEA QUE MATÓ LA APP ═══\n');
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('file://' + f);
    await page.waitForTimeout(800);
    const r = await page.evaluate(() => {
      abrirNovedades();
      var a = document.querySelector('#nvCuerpo .nv-pie a');
      return { href: a ? a.getAttribute('href') : null,
               texto: a ? a.textContent : null };
    });
    check('el enlace de soporte existe', !!r.href, r);
    /* `%40` y no `@`: el destinatario pasa por `encodeURIComponent`, que es
     * precisamente lo que debe hacer. Mi primera versión exigía un arroba
     * literal y se puso roja sobre una URL perfecta — otra vez midiendo la
     * letra en vez de lo que la línea tiene que conseguir. */
    check('...y la URL sale ENTERA: armarla a trozos no la rompió',
      /^https:\/\/mail\.google\.com\/mail\/\?view=cm&fs=1&to=.+(%40|@)/.test(r.href || ''),
      r.href);
    check('...con el asunto, que es lo que hace útil el correo',
      /[?&]su=/.test(r.href || ''), r.href);
    check('...y enseña la dirección, no «haz clic aquí»',
      /@/.test(r.texto || ''), r.texto);

    /* Y en la FUENTE: que nadie la vuelva a juntar. Se mira SÓLO esta línea y
     * no todo el archivo — hay siete URLs con doble barra en otras partes del
     * bloque que nunca dieron problema, y prohibirlas todas sería prohibir por
     * superstición en vez de por lo que se midió. */
    const linea = (html.match(/^[ \t]*a\.href = 'https:.*$/m) || [])[0] || '';
    check('en la fuente, el `a.href` del soporte NO lleva una doble barra literal',
      !!linea && linea.indexOf('//') < 0, linea.trim().slice(0, 80));
    check('...ni un «&» literal dentro de una cadena de esa línea',
      !!linea && !/['"][^'"]*&[^'"]*['"]/.test(linea), linea.trim().slice(0, 80));
    await ctx.close();
  }

  await browser.close();
  console.log('\n' + (fail ? '✗ ' + fail + ' fallos · ' : '✓ todo bien · ') + (ok + fail) + ' comprobaciones\n');
  process.exit(fail ? 1 : 0);
})();
