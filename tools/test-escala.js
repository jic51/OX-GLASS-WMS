// LA ESCALA NO SE DESHACE SOLA.
//
// Jose eligió la opción A del mockup (mockups/estandarizacion.html) el
// 2026-10-10. Pero ordenar los tamaños una vez no sirve de nada si en tres
// versiones volvemos a cuarenta — que es EXACTAMENTE como llegamos aquí:
// nadie decidió tener cuarenta tamaños de letra, se fueron acumulando uno a
// uno, cada uno razonable por su cuenta.
//
// Lo que este archivo impide es eso. No comprueba que la app sea bonita
// —eso no se mide— sino que el número de valores distintos NO SUBA.
//
// ── LO QUE SE DESCUBRIÓ AL MEDIR, Y VALE LA PENA DEJARLO ESCRITO ───────────
//
// La app YA TENÍA los tokens en su `:root`: `--radius:10px` y `--shadow`
// estaban ahí desde hacía versiones. Y se usaban así:
//
//     --border   (color)  135 usos
//     --muted    (color)  108 usos
//     --accent   (color)   91 usos
//     --shadow   (forma)    6 de 61 sombras ....... 10%
//     --radius   (forma)    5 de 224 esquinas ......  2%
//
// Los tokens de COLOR se usaban de verdad. Los de FORMA, casi nunca. No
// faltaba un sistema: faltaba usarlo. Es la séptima vez que este repositorio
// se encuentra el mismo patrón —algo escrito y nunca ejecutado— y la primera
// en el diseño en vez de en el código.
//
// ── POR QUÉ LOS TOPES SON LOS QUE SON ─────────────────────────────────────
//
// Cada tope es el número REAL de hoy, no una cifra redonda. Un tope holgado
// no protege nada: deja sitio para que vuelva a crecer sin que nadie lo note,
// que es el fallo que este archivo existe para impedir.
//
// Cuando haga falta un valor nuevo de verdad, se sube el tope A PROPÓSITO y
// queda en el historial quién lo subió y por qué. Esa es toda la diferencia
// entre crecer y desbordarse.
//
// Uso:  NODE_PATH="$(npm root -g)" CHROME_PATH=/opt/pw-browsers/chromium-*/chrome-linux/chrome \
//       node tools/test-escala.js

const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');
const CSS  = (HTML.match(/<style[^>]*>([\s\S]*?)<\/style>/g) || []).join('\n');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

// Las reglas, con su selector. Hace falta el selector para poder separar los
// botones del resto y la hoja de impresión de la de pantalla.
const REGLAS = [];
{
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(CSS))) REGLAS.push({ sel: m[1].trim(), decl: m[2] });
}
const ROOT_DECL = (REGLAS.find(r => /:root/.test(r.sel)) || { decl: '' }).decl;

function valores(prop, filtro) {
  const out = new Map();
  REGLAS.forEach(r => {
    if (/:root/.test(r.sel)) return;              // la definición, no el uso
    if (filtro && !filtro(r)) return;
    const re = new RegExp('(?<![\\w-])' + prop + ':\\s*([^;}\\n]+)', 'g');
    let m;
    while ((m = re.exec(r.decl))) {
      const v = m[1].trim();
      out.set(v, (out.get(v) || 0) + 1);
    }
  });
  return out;
}

/* ════════════════════════════════════════════════════════════════════════════
   1 · LA ESCALA EXISTE Y TIENE LOS TRECE ESCALONES DE LA OPCIÓN A
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 1 · la escala está definida ═══\n');
const TOKENS_FS = ['--fs-2xs','--fs-xs','--fs-sm','--fs-md','--fs-base','--fs-lg',
                   '--fs-xl','--fs-2xl','--fs-3xl','--fs-4xl','--fs-5xl','--fs-6xl','--fs-7xl'];
TOKENS_FS.forEach(t => {
  check('`' + t + '` está en :root', new RegExp(t + ':').test(ROOT_DECL));
});
check('son trece escalones — los de la opción A que Jose eligió',
  TOKENS_FS.length === 13);

// Los valores, y que estén ORDENADOS. Una escala desordenada es peor que
// ninguna: `--fs-lg` más pequeño que `--fs-md` haría que elegir el token
// correcto diera el tamaño equivocado, y nadie lo notaría leyendo el nombre.
const nums = TOKENS_FS.map(t => {
  const m = ROOT_DECL.match(new RegExp(t + ':\\s*([\\d.]+)rem'));
  return m ? parseFloat(m[1]) : null;
});
check('todos tienen un valor en rem', nums.every(n => n !== null), nums);
check('y van de menor a mayor, o el nombre mentiría sobre el tamaño',
  nums.every((n, i) => i === 0 || n > nums[i - 1]), nums);

// Los tres más usados de la app NO se movieron. Es la promesa concreta que le
// hice a Jose en el mockup para que eligiera la A.
[['--fs-sm', 0.72], ['--fs-md', 0.78], ['--fs-lg', 0.85]].forEach(([t, v]) => {
  check('`' + t + '` sigue valiendo ' + v + 'rem — es uno de los tres más usados ' +
        'de la app y la opción A prometía que no se movería',
    nums[TOKENS_FS.indexOf(t)] === v, nums[TOKENS_FS.indexOf(t)]);
});

/* ════════════════════════════════════════════════════════════════════════════
   2 · LOS BOTONES, QUE SON LA TANDA DE ESTA VERSIÓN
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 2 · los botones ═══\n');
const esBoton = r => /btn|button/i.test(r.sel);

const fsBtn = valores('font-size', esBoton);
const fsBtnCrudos = [...fsBtn.keys()].filter(v => !v.startsWith('var('));
// `/rem/` a secas marcaba el `clamp(.68rem,1.2vw,.8rem)` porque lleva «rem»
// dentro. Medir la letra en vez de la intención, otra vez: lo que se busca es
// un tamaño SUELTO en rem, no cualquier aparición de esas tres letras.
check('ningún botón trae un tamaño de letra en rem SUELTO — van todos por token',
  !fsBtnCrudos.some(v => /^(\.\d+|\d+\.?\d*)rem$/.test(v)), fsBtnCrudos);
// Las dos excepciones, nombradas para que se vea que son deliberadas y no restos.
check('salvo el `clamp()` del nav, que YA hacía lo correcto: se adapta al ancho ' +
      'de la pantalla, y sustituirlo por un número fijo sería un paso atrás',
  fsBtnCrudos.some(v => v.startsWith('clamp(')), fsBtnCrudos);
check('...y el `0` del punto de conexión, que no es un tamaño: es cómo se ' +
      'esconde su texto',
  fsBtnCrudos.includes('0'), fsBtnCrudos);

const radBtn = valores('border-radius', esBoton);
const radCrudos = [...radBtn.keys()].filter(v => !v.startsWith('var('));
check('los radios de botón van por token',
  [...radBtn.keys()].some(v => v.includes('--r-btn')), [...radBtn.keys()]);
check('los que quedan sueltos son SÓLO los que significan algo: `50%` hace un ' +
      'círculo y las esquinas asimétricas hacen pestañas. Un token los borraría',
  radCrudos.every(v => v === '50%' || /^\d+px \d+px \d+px \d+px$|^0 0 |^\d+px \d+px 0 0$/.test(v)),
  radCrudos);

const mhBtn = valores('min-height', esBoton);
const mhCrudos = [...mhBtn.keys()].filter(v => !v.startsWith('var('));
check('NINGUNA altura de botón queda a pelo — es la parte que no es de gusto',
  mhCrudos.length === 0, mhCrudos);

// Lo que destruye algo llega a los 44px aunque esté dentro de una tabla.
// Fallar un tap en «Edit» cuesta un toque; fallarlo en «Delete» borra algo.
const sinCom = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
check('la excepción de las tablas sigue existiendo, con nombre propio: ' +
      'subir TODOS los botones de fila a 44px duplicaría la altura de cada fila',
  /--h-btn-tabla:\s*34px/.test(ROOT_DECL));

/* ── LO QUE BORRA ALGO SE MIDE, NO SE BUSCA EN EL CSS ──────────────────────
 *
 * La primera versión de esta comprobación buscaba la regla con una expresión
 * regular sobre el CSS. Pasaba en verde — y el botón `Delete` de configuración
 * seguía midiendo 34 px en la pantalla, porque mi selector sólo lo cubría
 * DENTRO de una tabla. Lo descubrió una captura, no la prueba.
 *
 * Es la quinta vez en este repositorio: MEDIR LA LETRA EN VEZ DE LA INTENCIÓN.
 * Que la regla exista no es lo que importa; lo que importa es que el botón
 * mida 44 px cuando un dedo va hacia él. Así que se abre un navegador, se
 * simula una pantalla táctil y se mide el alto de verdad.
 *
 * Y se mide en táctil a propósito: con ratón las alturas grandes no aplican
 * —ni deben— porque un puntero acierta un objetivo de 22 px sin problema. */
async function mideBotonesDestructivos() {
  const { chromium } = require('playwright');
  const navegador = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  // hasTouch + isMobile es lo que hace que `@media (pointer: coarse)` aplique.
  // Sin eso se mediría la app de escritorio y la comprobación no diría nada.
  const pagina = await navegador.newPage({ viewport: { width: 430, height: 820 },
                                           hasTouch: true, isMobile: true });
  await pagina.goto('file://' + path.join(ROOT, 'Index_v3_fixed.html'),
                    { waitUntil: 'domcontentloaded' });
  const medidas = await pagina.evaluate(() => {
    /* Cada uno con el PADRE que tiene en la app de verdad. `.btn-remove-loc`
       sólo recibe su forma dentro de `.loc-row`: medirlo suelto daba radio 0 y
       me hizo creer por un momento que faltaba un token. No faltaba — faltaba
       medirlo donde vive.

       `rm-btn rm-del` NO está en esta lista, y merece decirse: parece de
       borrar por el nombre, pero es el INTERRUPTOR que pone la tabla en modo
       borrado. No destruye nada al pulsarlo, así que la regla de los 44 px no
       le toca. La primera versión lo incluyó y falló con razón — la prueba
       pedía más de lo que la regla promete. */
    const clases = [['btn btn-danger', null], ['btn btn-danger btn-sm', null],
                    ['cfg-btn cfg-btn-danger', null], ['btn-remove-loc', 'loc-row']];
    const host = document.createElement('div');
    document.body.appendChild(host);
    const out = clases.map(([c, padre]) => {
      const b = document.createElement('button');
      b.className = c; b.textContent = 'Delete';
      let caja = host;
      if (padre) { caja = document.createElement('div'); caja.className = padre; host.appendChild(caja); }
      caja.appendChild(b);
      const alto = Math.round(b.getBoundingClientRect().height);
      const radio = getComputedStyle(b).borderRadius;
      b.remove();
      return { clase: c, alto, radio };
    });
    host.remove();
    return out;
  });
  await navegador.close();
  return medidas;
}

(async () => {
  console.log('\n═══ 4 · lo que borra algo, MEDIDO en una pantalla táctil ═══\n');
  let medidas = [];
  try { medidas = await mideBotonesDestructivos(); }
  catch (e) { check('se pudo abrir el navegador para medir', false, String(e.message).slice(0, 120)); }

  medidas.forEach(m => {
    check(`\`${m.clase}\` mide ${m.alto}px de alto con el dedo — el mínimo para ` +
          `acertar son 44, y la gente de Jose usa esto con guantes dentro de la bodega`,
      m.alto >= 44, m);
  });
  const radios = [...new Set(medidas.map(m => m.radio))];
  check('y todos los de borrar comparten el mismo radio: ' + radios.join(' / '),
    radios.length === 1, radios);

  console.log('\n' + (fail ? '✗ ' + fail + ' FALLOS' : '✓ todo bien') + ' · ' + ok + ' comprobaciones\n');
  process.exit(fail ? 1 : 0);
})();

/* ════════════════════════════════════════════════════════════════════════════
   3 · LOS TOPES — que esto no vuelva a crecer sin que nadie lo decida
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 2b · las tablas ═══\n');
const esTabla = r => /\b(table|thead|tbody|tfoot|tr|th|td)\b|tabla|-tbl|\.mov-|\.inc-|\.usr-/.test(r.sel)
                     && !/\.lbl/.test(r.sel);

const fsTab = valores('font-size', esTabla);
const fsTabCrudos = [...fsTab.keys()].filter(v => /^(\.\d+|\d+\.?\d*)rem$/.test(v));
check('ninguna regla de tabla trae un tamaño de letra en rem suelto',
  fsTabCrudos.length === 0, fsTabCrudos);

/* EL ESPACIADO DE CELDA es lo único de esta tanda que mueve algo que se ve:
 * cambia la altura de la fila, y con ella cuántas filas caben en la pantalla.
 * Por eso los dos valores se eligieron para que nada se mueva más de 0,8 px
 * por lado, no para que salieran redondos. */
const padCelda = valores('padding', r => /(?<![\w-])\b(th|td)\b/.test(r.sel));
const padCrudos = [...padCelda.keys()].filter(v => !v.startsWith('var(') && v !== '0');
check('ninguna CELDA trae su espaciado a pelo — eran ocho reglas con ocho ' +
      'valores distintos, y resultaron ser dos densidades que nadie había nombrado',
  padCrudos.length === 0, padCrudos);
check('las dos densidades están en :root con nombre',
  /--pad-celda:/.test(ROOT_DECL) && /--pad-celda-sm:/.test(ROOT_DECL));

const lhTab = valores('line-height', esTabla);
const lhCrudos = [...lhTab.keys()].filter(v => !v.startsWith('var(') && !v.startsWith('0'));
check('ninguna altura de línea de tabla queda a pelo',
  lhCrudos.length === 0, lhCrudos);
check('...salvo el `line-height:0` de la animación de borrado de fila, que no ' +
      'es una altura: es cómo la fila se cierra sobre sí misma al irse',
  [...lhTab.keys()].some(v => v.startsWith('0')), [...lhTab.keys()]);

console.log('\n═══ 3 · los topes ═══\n');

// Las etiquetas impresas van en MILÍMETROS y son otro medio: sus escalones
// están medidos sobre papel —cuántos caracteres entran en una etiqueta de
// verdad— y el código lo explica donde están. No entran en ninguna cuenta.
const esImpresion = r => /\.lbl/.test(r.sel);
const fsTodos = valores('font-size', r => !esImpresion(r));
const fsRem = [...fsTodos.keys()].filter(v => /^(\.\d+|\d+\.?\d*)rem$/.test(v));

/* ── UN RESULTADO QUE HAY QUE DECIR, NO ESCONDER ───────────────────────────
 *
 * Puse el tope en 27 esperando que la tanda de botones bajara la cuenta. NO
 * LA BAJÓ: sigue en 40, los mismos que antes de empezar.
 *
 * Y tiene una explicación que conviene entender antes de la siguiente tanda:
 * los botones NO tenían tamaños propios. Compartían los mismos valores que
 * las tablas, los formularios y las ventanas. Pasar los botones a tokens los
 * hace coherentes ENTRE ELLOS, pero no elimina ni un valor del archivo,
 * porque cada uno de esos valores sigue usándose en otro sitio.
 *
 * O sea: la cuenta de 40 no baja hasta que estén hechas TODAS las tandas.
 * Eso no invalida la de hoy —los botones sí quedaron coherentes, y las
 * alturas táctiles sí son un arreglo real— pero sí significa que esta cifra
 * no mide progreso todavía. Mide el final.
 *
 * El tope se queda en 40 para que no SUBA, que es lo único que puede
 * proteger hoy, y baja con cada tanda. */
const TOPE_FS_REM = 40;
check(`quedan ${fsRem.length} tamaños de letra en rem sueltos fuera de los botones ` +
      `(tope ${TOPE_FS_REM}). No bajó con esta tanda, y el comentario de arriba ` +
      `explica por qué: los botones compartían sus tamaños con todo lo demás`,
  fsRem.length <= TOPE_FS_REM, { ahora: fsRem.length, tope: TOPE_FS_REM });

const TOPE_RADIOS = 23;
const radTodos = valores('border-radius', r => !esImpresion(r));
const radPx = [...radTodos.keys()].filter(v => !v.startsWith('var('));
check(`quedan ${radPx.length} radios a pelo (el tope es ${TOPE_RADIOS})`,
  radPx.length <= TOPE_RADIOS, { ahora: radPx.length, tope: TOPE_RADIOS });

const TOPE_SOMBRAS = 45;
const shTodos = valores('box-shadow', r => !esImpresion(r));
const shCrudas = [...shTodos.keys()].filter(v => !v.startsWith('var('));
check(`quedan ${shCrudas.length} sombras a pelo (el tope es ${TOPE_SOMBRAS}). ` +
      `Siguen siendo casi una por uso: es la próxima tanda, no ésta`,
  shCrudas.length <= TOPE_SOMBRAS, { ahora: shCrudas.length, tope: TOPE_SOMBRAS });

/* ── LA CIFRA QUE SÍ MIDE EL AVANCE ───────────────────────────────────────
 *
 * Contar valores distintos no sirve para medir progreso, y costó dos tandas
 * descubrirlo: los botones y las tablas no tenían tamaños PROPIOS —usaban los
 * mismos que todo lo demás— así que pasarlos a token no eliminó ni un valor
 * del archivo. La cuenta de 40 no se mueve hasta el final.
 *
 * Lo que sí avanza tanda a tanda es la ADOPCIÓN: cuántas de las declaraciones
 * de tamaño de letra van por token en vez de a pelo. Esa sube con cada tanda
 * y es la que hay que mirar.
 *
 * El suelo sube cada vez. Nunca baja: una tanda que deshaga trabajo hecho
 * falla aquí. */
const PISO_ADOPCION = 20;   // %, medido tras la tanda de tablas (v12.56)
{
  let porToken = 0, aPelo = 0;
  REGLAS.forEach(r => {
    if (/:root/.test(r.sel) || /\.lbl/.test(r.sel)) return;
    const re = /(?<![\w-])font-size:\s*([^;}\n]+)/g;
    let m;
    while ((m = re.exec(r.decl))) {
      const v = m[1].trim();
      if (v.startsWith('var(')) porToken++;
      else if (/^(\.\d+|\d+\.?\d*)rem$/.test(v)) aPelo++;
    }
  });
  const pct = Math.round(100 * porToken / (porToken + aPelo));
  check(`el ${pct}% de los tamaños de letra ya van por token (${porToken} de ` +
        `${porToken + aPelo}). El suelo es ${PISO_ADOPCION}% y sube con cada tanda; ` +
        `si esto baja, una tanda deshizo trabajo hecho`,
    pct >= PISO_ADOPCION, { ahora: pct, piso: PISO_ADOPCION, porToken, aPelo });
}

console.log(`
  Los topes bajan tanda a tanda. Hoy sólo se hicieron los BOTONES, así que
  los de radios y sombras siguen altos a propósito — ponerlos ya en su valor
  final haría fallar la suite por trabajo que todavía no se ha hecho, y una
  prueba que falla por algo que nadie prometió arreglar se acaba ignorando.`);

