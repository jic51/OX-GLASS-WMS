// La escala de espaciado, la píldora y la sublínea — v12.62.
//
// POR QUÉ ESTA PRUEBA MIDE EN UN NAVEGADOR Y NO LEE EL CSS.
//
// La promesa de esta tanda no es «las reglas dicen var(--algo)», es «la misma
// pieza se ve igual en todas las pantallas». Eso sólo se comprueba RESOLVIENDO
// el valor: un `var()` mal escrito deja la propiedad en su valor inicial y el
// grep pasa igual de contento. Ya pasó una vez en este repositorio —la prueba
// de los botones leía la regla de 44 px y la aprobaba mientras el botón se
// dibujaba a 34— y lo que lo encontró fue una captura, no la prueba.
//
// Así que cada regla del CSS se aplica a un div de prueba DENTRO del documento
// —donde el :root alcanza— y se leen los diez lados calculados en píxeles.
//
// Y un detalle que costó encontrar: en Chrome, `regla.cssRules` de una regla
// normal es una lista VACÍA, no `undefined`. Un `if (regla.cssRules)` la toma
// por un contenedor, se mete dentro, no encuentra nada y sale: el recorrido
// devolvía cero reglas con el CSS entero delante. Hay que mirar `.length`.
//
// Usage:  node tools/test-espaciado.js [path/to/Index_v3_fixed.html]

const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');

const SRC = process.argv[2] || path.join(__dirname, '..', 'Index_v3_fixed.html');
const html = fs.readFileSync(SRC, 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FALLA ' + label + (extra ? '  → ' + JSON.stringify(extra) : '')); }
}

/* ── 1 · los tokens existen ─────────────────────────────────────────────── */

const raiz = (html.match(/:root\{[\s\S]*?\n\s*\}/) || [''])[0];
function token(nombre) {
  const m = raiz.match(new RegExp('--' + nombre + '\\s*:\\s*([^;]+);'));
  return m ? m[1].trim() : null;
}

console.log('\n── los peldaños de la escala ──\n');

const PELDANOS = ['sp-1','sp-2','sp-3','sp-4','sp-5','sp-6','sp-7','sp-8','sp-9','sp-10'];
const valores = [];
for (const p of PELDANOS) {
  const v = token(p);
  check('`--' + p + '` existe' + (v ? ' (' + v + ')' : ''), !!v);
  if (v) valores.push({ nombre: p, px: parseFloat(v) * (v.endsWith('rem') ? 16 : 1) });
}

/* El salto mínimo. ÉSTA es la regla de verdad de la tanda: la enfermedad no
 * era tener muchos valores, era tenerlos a 0,8 px unos de otros. Un peldaño
 * que nadie puede distinguir del siguiente no es un peldaño. */
const SALTO_MINIMO = 1.6;   // px
/* El epsilon no es por prudencia, es aritmética: `.5 * 16 - .4 * 16` da
 * 1.5999999999999996 en coma flotante binaria, y la primera versión de esta
 * comprobación se puso roja con el salto EXACTAMENTE en su valor. Eso es medir
 * el ruido del float, no el diseño. */
const EPS = 1e-9;
let peor = { salto: Infinity, entre: '' };
for (let i = 1; i < valores.length; i++) {
  const salto = valores[i].px - valores[i - 1].px;
  if (salto < peor.salto) peor = { salto, entre: valores[i - 1].nombre + '→' + valores[i].nombre };
}
check('ningún peldaño está a menos de ' + SALTO_MINIMO + ' px del siguiente ' +
      '(el más estrecho es ' + peor.entre + ', ' + peor.salto.toFixed(2) + ' px)',
  peor.salto >= SALTO_MINIMO - EPS, peor);

/* ...y que vayan en orden, que es lo que hace que `--sp-7` signifique algo. */
let ordenados = true;
for (let i = 1; i < valores.length; i++) if (valores[i].px <= valores[i - 1].px) ordenados = false;
check('los peldaños van de menor a mayor', ordenados,
  valores.map(v => v.nombre + '=' + v.px));

console.log('\n── los dos trabajos con nombre ──\n');
for (const t of ['pad-pildora', 'r-pildora', 'gap-sublinea']) {
  const v = token(t);
  check('`--' + t + '` existe' + (v ? ' (' + v + ')' : ''), !!v);
}

/* ── 2 · la adopción, que es la cifra que mide el avance ────────────────── */

console.log('\n── cuánto espaciado va por token ──\n');

const estilos = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '');

function declaraciones(txt) {
  const out = []; let buf = '', q = null, d = 0;
  for (const ch of txt) {
    if (q) { if (ch === q) q = null; buf += ch; continue; }
    if (ch === '"' || ch === "'") { q = ch; buf += ch; continue; }
    if (ch === '(') d++;
    if (ch === ')') d--;
    if (ch === ';' && d === 0) { out.push(buf); buf = ''; continue; }
    if (ch === '{' || ch === '}') { if (buf.trim()) out.push(buf); buf = ''; continue; }
    buf += ch;
  }
  if (buf.trim()) out.push(buf);
  return out;
}

const ESPACIO = /^(padding|margin|gap|row-gap|column-gap|padding-(top|right|bottom|left)|margin-(top|right|bottom|left))$/;
const usos = [];
for (const d of declaraciones(estilos)) {
  const i = d.indexOf(':');
  if (i === -1) continue;
  const prop = d.slice(0, i).trim().toLowerCase();
  if (prop.startsWith('--') || !ESPACIO.test(prop)) continue;
  usos.push(d.slice(i + 1).trim());
}
const porToken = usos.filter(v => /var\(--/.test(v)).length;
const neutro   = usos.filter(v => !/var\(--/.test(v) &&
  (/\bmm\b/.test(v) || /^(0|0px|0 0|0 auto|auto|auto 0|0 auto 0|inherit|initial|unset|revert)$/i.test(v))).length;
const aPelo = usos.length - porToken - neutro;
const pct = Math.round(100 * porToken / (porToken + aPelo));

/* Medido tras la tanda de espaciado (v12.62). Era el 2%. */
const PISO = 62;
check('el ' + pct + '% del espaciado va por token (' + porToken + ' de ' + (porToken + aPelo) + '). ' +
      'Era el 2% antes de esta tanda; el suelo es ' + PISO + '%',
  pct >= PISO, { ahora: pct, piso: PISO });

/* Y las longitudes distintas que quedan a pelo. Bajó de 58 a 45, y lo que
 * queda son las 230 que están a 0,8 px de un peldaño: ésas SÍ se mueven al
 * convertirlas, así que van en la tanda siguiente con su medida de geometría
 * delante. No son sobras, son trabajo contado. */
const TOPE = 44;
const crudas = new Set();
for (const v of usos) {
  if (/var\(--/.test(v) || /\bmm\b/.test(v)) continue;
  for (const l of v.match(/-?(?:\d+\.?\d*|\.\d+)(rem|px|em|%)/g) || []) crudas.add(l);
}
check('quedan ' + crudas.size + ' longitudes a pelo (el tope es ' + TOPE + '). Eran 57',
  crudas.size <= TOPE, { ahora: crudas.size, tope: TOPE });

/* ── 3 · en el navegador: la misma pieza se ve igual ────────────────────── */

/* Las veinte reglas que dibujan una píldora. La lista está A MANO a propósito:
 * si mañana alguien añade una etiqueta nueva y no la pone en esta lista, la
 * prueba no la ve — pero si la añade y le escribe un relleno propio, la lista
 * de aquí es lo que hace que se note al leerla. Una lista escrita es peor que
 * un detector automático y mejor que nada; el detector automático tendría que
 * adivinar qué es una píldora y qué no, y ahí ya me he equivocado antes. */
const PILDORAS = [
  '.badge', '.cat-badge', '.role-badge-admin', '.role-badge-warehouse',
  '.role-badge-viewer', '.acct-tag', '.dq-kind', '.presence-role',
  '.author-badge', '.inc-status-pending', '.inc-status-arrived',
  '.inc-status-cancelled', '.inc-suggest-item .inc-tag', '.packs-count',
  '.inc-group-count', '.transfer-loc-chip .tlc-qty', '.ver-bad', '.loc-resv'
];
/* `.chip` no entra: sus 11 px de la izquierda contra 8 de la derecha son a
 * propósito, porque el ✕ vive a la derecha. Está escrito en el CSS. */

const SUBLINEAS = [
  '.stat .sub', '.acct-email', '.mc-sub', '.mc-main', '.todo-card-sub',
  '.todo-card-when', '.sys-card-when', '.inc-item-meta', '.also-sub',
  '.ap-mail', '.wiz-preset span', '.snap-ok'
];

/* Las tres que llevan radio cuadrado a propósito: son CONTADORES, no
 * etiquetas, y se distinguen de un vistazo justo por eso. */
const CUADRADAS = ['.ver-bad', '.transfer-loc-chip .tlc-qty', '.loc-resv'];

(async () => {
  const f = path.join(os.tmpdir(), 'acopio-espaciado.html');
  fs.writeFileSync(f, html);
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('file://' + f);
  await page.waitForTimeout(400);

  const medido = await page.evaluate(sels => {
    const probe = document.createElement('div');
    probe.style.display = 'inline-flex';
    document.body.appendChild(probe);
    const fuera = {};
    function recorrer(reglas) {
      for (let i = 0; i < reglas.length; i++) {
        const r = reglas[i];
        /* OJO: lista vacía, no undefined. Ver la cabecera de este archivo. */
        if (r.cssRules && r.cssRules.length) { recorrer(r.cssRules); continue; }
        if (!r.style || !r.selectorText) continue;
        const sel = r.selectorText.trim();
        if (sels.indexOf(sel) === -1) continue;
        probe.style.cssText = 'display:inline-flex;' + r.style.cssText;
        const cs = getComputedStyle(probe);
        /* la última regla que toca el selector gana, igual que en la cascada */
        fuera[sel] = {
          pad: ['top','right','bottom','left'].map(l => cs.getPropertyValue('padding-' + l)).join(' '),
          mt: cs.getPropertyValue('margin-top'),
          radio: cs.getPropertyValue('border-top-left-radius'),
          alto: cs.getPropertyValue('font-size')
        };
      }
    }
    for (const ss of document.styleSheets) { try { recorrer(ss.cssRules); } catch (e) {} }
    probe.remove();
    return fuera;
  }, PILDORAS.concat(SUBLINEAS));

  console.log('\n── la píldora: una sola cápsula en toda la app ──\n');

  const faltan = PILDORAS.filter(s => !medido[s]);
  check('las ' + PILDORAS.length + ' reglas de píldora siguen existiendo', faltan.length === 0, faltan);

  const rellenos = new Set();
  for (const s of PILDORAS) if (medido[s]) rellenos.add(medido[s].pad);
  check('las ' + PILDORAS.length + ' píldoras resuelven al MISMO relleno (' +
        (medido[PILDORAS[0]] ? medido[PILDORAS[0]].pad : '?') + ')',
    rellenos.size === 1, [...rellenos]);

  /* 2 px arriba y abajo, 8 px a los lados: los dos valores que ya eran los más
   * usados de las catorce variantes que había. Si alguien cambia el token, esta
   * comprobación no se queja —y no debe—: lo que fija es que sea UNO. Pero sí
   * se queja si el relleno se queda en su valor inicial, que es lo que pasa
   * cuando el `var()` está mal escrito. */
  const pad0 = medido[PILDORAS[0]] && medido[PILDORAS[0]].pad;
  check('y ese relleno no es cero — un `var()` mal escrito deja la propiedad ' +
        'en su valor inicial y la regla parece estar puesta',
    !!pad0 && pad0 !== '0px 0px 0px 0px', { pad: pad0 });

  const redondas = PILDORAS.filter(s => CUADRADAS.indexOf(s) === -1);
  const radios = new Set();
  for (const s of redondas) if (medido[s]) radios.add(medido[s].radio);
  check('las ' + redondas.length + ' píldoras redondas resuelven al MISMO radio (' +
        (medido[redondas[0]] ? medido[redondas[0]].radio : '?') + ')',
    radios.size === 1, [...radios]);

  for (const s of CUADRADAS) {
    const r = medido[s] && parseFloat(medido[s].radio);
    check('`' + s + '` sigue cuadrada a propósito (' + (medido[s] ? medido[s].radio : '?') +
          '): es un contador, no una etiqueta', r > 0 && r < 10, { radio: medido[s] && medido[s].radio });
  }

  console.log('\n── la sublínea: un trabajo, un valor ──\n');

  const faltanSub = SUBLINEAS.filter(s => !medido[s]);
  check('las ' + SUBLINEAS.length + ' reglas de sublínea siguen existiendo', faltanSub.length === 0, faltanSub);

  const margenes = new Set();
  for (const s of SUBLINEAS) if (medido[s]) margenes.add(medido[s].mt);
  check('las ' + SUBLINEAS.length + ' sublíneas resuelven al MISMO margen de arriba (' +
        (medido[SUBLINEAS[0]] ? medido[SUBLINEAS[0]].mt : '?') + ')',
    margenes.size === 1, [...margenes]);

  const mt0 = medido[SUBLINEAS[0]] && medido[SUBLINEAS[0]].mt;
  check('y ese margen no es cero', !!mt0 && mt0 !== '0px', { mt: mt0 });

  /* ── 4 · la etiqueta del popup de la mañana ───────────────────────────── */
  //
  // El caso que dio pie a la tanda: `.inc-status-arrived` llevaba
  // `.1rem .5rem` en la tabla de entrantes y `.18rem .7rem` dentro del popup
  // de la mañana. La misma etiqueta, dos cápsulas, y nada obligaba a que
  // coincidieran. Ahora el popup sólo sube la LETRA —se lee de más lejos— y
  // la cápsula la pone el token.
  console.log('\n── la etiqueta que empezó todo esto ──\n');
  const sobra = /#morningPopupBody\s+\.inc-status-arrived\{[^}]*padding\s*:/.test(estilos);
  check('el override del popup de la mañana ya no lleva relleno propio: ' +
        'la misma etiqueta, la misma cápsula en las dos pantallas', !sobra);
  check('...y sí sigue subiendo la letra, que era la parte con intención',
    /#morningPopupBody\s+\.inc-status-arrived\{[^}]*font-size\s*:/.test(estilos));

  await browser.close();

  console.log('\n' + (fail ? '✗ ' + fail + ' fallos · ' : '✓ todo bien · ') + (ok + fail) + ' comprobaciones\n');
  process.exit(fail ? 1 : 0);
})();
