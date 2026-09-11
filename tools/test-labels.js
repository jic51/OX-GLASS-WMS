// LAS ETIQUETAS DE 4"×6", MEDIDAS EN PAPEL.
//
// Jose, 2026-09-11, cuando le pregunté qué le hacía más falta: "lo que me
// gustaría es pasarnos a la de crear e imprimir los labels al hacer los
// entries. Esa es la que me hace falta por ahora."
//
// Impresora Jadens JD-268BT, térmica, papel de 4"×6" — 101.6 × 152.4 mm. En la
// etiqueta: nombre del material, cantidad, locación, PO, y un hueco reservado
// para el QR o el código de barras.
//
// POR QUÉ ESTO SE MIDE EN UN NAVEGADOR Y NO SE LEE DEL ARCHIVO. Una etiqueta no
// es una pantalla: el papel mide lo que mide. Comprobar que el CSS "dice
// 101.6mm" no dice nada — lo que importa es el rectángulo que el navegador
// dibuja, y si el contenido cabe DENTRO de él. Un nombre de material largo que
// empuje la cantidad fuera del papel sale de la impresora como una etiqueta sin
// cantidad, y eso no se ve hasta que hay cincuenta pegadas en el almacén.
//
// Y la mitad de este archivo mide la REGLA DE IMPRESIÓN, que es la que no tiene
// segunda oportunidad: si al imprimir no desaparece la app, salen seis páginas
// de tablero antes de la primera etiqueta, en papel térmico que se compra en
// rollos.
//
// Uso:  node tools/test-labels.js

const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');

const SRC  = path.join(__dirname, '..', 'Index_v3_fixed.html');
const HTML = fs.readFileSync(SRC, 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}
function fnSrc(name){
  const start = HTML.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('no encontrada: ' + name);
  let depth = 0;
  for (let j = HTML.indexOf('{', start); j < HTML.length; j++) {
    if (HTML[j] === '{') depth++;
    else if (HTML[j] === '}') { depth--; if (depth === 0) return HTML.slice(start, j + 1); }
  }
  throw new Error('sin cerrar: ' + name);
}

// 4"×6" en píxeles CSS: 1in = 96px por definición.
const ANCHO = 4 * 96;        // 384
const ALTO  = 6 * 96;        // 576

const stub = `<script>
window.google=window.google||{}; window.google.charts=window.google.charts||{load:function(){},setOnLoadCallback:function(){}};
Object.assign(window.google,{script:{run:new Proxy({},{get(t,k){
  return function(){
    if(k==='withSuccessHandler'){ t._ok=arguments[0]; return window.google.script.run; }
    if(k==='withFailureHandler'){ return window.google.script.run; }
    var ok=t._ok;
    if(k==='getInitialData'){ setTimeout(function(){ ok && ok({accessStatus:'NO_SESSION', userEmail:'', userRole:'NO_SESSION', serverVersion:'test', company:{}, oauthClientId:'', oauthRedirectUri:''}); },20); return; }
    setTimeout(function(){ ok && ok({}); },20);
  };
}})}});
</script>`;

(async () => {
  const f = path.join(os.tmpdir(), 'acopio-labels.html');
  fs.writeFileSync(f, HTML.replace('</head>', stub + '</head>'));

  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + f);
  await page.waitForTimeout(300);

  // Una etiqueta de verdad, dibujada por la función del producto, en la hoja de
  // impresión de verdad. Nada de una copia del HTML escrita aquí: lo que se
  // mide tiene que ser lo que sale de la impresora.
  async function pintar(r){
    return page.evaluate((r) => {
      const hoja = document.getElementById('labelSheet');
      // En pantalla la hoja está oculta a propósito, así que para MEDIRLA hay
      // que enseñarla — y volver a dejarla como estaba al terminar, o la
      // comprobación de "está oculta" de más abajo mide lo que hizo esta.
      hoja.style.display = 'block';
      hoja.innerHTML = _labelHtml(r);
      const el = hoja.querySelector('.lbl');
      const caja = el.getBoundingClientRect();
      const hijos = Array.from(el.children).map(c => {
        const b = c.getBoundingClientRect();
        return { clase: c.className, top: b.top - caja.top, bottom: b.bottom - caja.top,
                 alto: b.height };
      });
      return {
        w: caja.width, h: caja.height,
        pide: el.scrollHeight, cabe: el.clientHeight,
        texto: el.textContent,
        hijos: hijos,
        _limpiar: (hoja.style.display = '', true)
      };
    }, r);
  }

  const BASE = { name: 'W-TOL-MH147-JA', category: 'WINDOW', qty: 44, unit: 'UNIT',
                 loc: 'C2A', po: '08-4885', supplier: 'AMSCO',
                 project: 'SUNBRIDGE PHASE 1', dateRec: '2026-09-11' };

  console.log('\n═══ el papel mide lo que mide ═══\n');
  {
    const m = await pintar(BASE);
    check('la etiqueta mide 4 pulgadas de ancho (' + Math.round(m.w) + 'px de ' +
          ANCHO + ') — una térmica no reencuadra: lo que no cabe se corta',
      Math.abs(m.w - ANCHO) <= 1, m.w);
    check('...y 6 de alto (' + Math.round(m.h) + 'px de ' + ALTO + ')',
      Math.abs(m.h - ALTO) <= 1, m.h);
  }

  console.log('\n═══ y lo que va dentro, CABE dentro ═══\n');
  {
    const m = await pintar(BASE);
    check('el contenido pide ' + m.pide + 'px y hay ' + m.cabe + 'px: nada se sale',
      m.pide <= m.cabe + 1, m);
    ['lbl-top','lbl-name','lbl-pair','lbl-meta','lbl-code'].forEach(cl => {
      const h = m.hijos.find(x => x.clase.indexOf(cl) !== -1);
      check('  · ' + cl + ' está entero dentro del papel',
        h && h.top >= -0.5 && h.bottom <= m.h + 0.5, h);
    });
  }

  {
    // EL CASO QUE ROMPE ESTO SI SE ROMPE: un nombre larguísimo. Los nombres de
    // Jose ya son cosas como "SGD-MISC-A.Sultz-MO"; un día habrá uno de tres
    // líneas, y si empuja la cantidad fuera del papel sale una etiqueta sin
    // cantidad — que es una etiqueta inútil, pegada en un bulto, sin que nadie
    // se entere hasta que hay cincuenta así.
    const m = await pintar(Object.assign({}, BASE, {
      name: 'SGD-MISC-A.Sultz-MO EXTRA LARGO CON DESCRIPCION QUE NO ACABA NUNCA ' +
            'Y SIGUE Y SIGUE HASTA PASARSE DE TRES LINEAS ENTERAS',
      project: 'UN PROYECTO CON UN NOMBRE TAMBIEN MUY LARGO PARA REMATAR' }));
    check('con un nombre larguísimo la etiqueta NO crece (' + Math.round(m.h) + 'px)',
      Math.abs(m.h - ALTO) <= 1, m.h);
    check('...el contenido sigue cabiendo (' + m.pide + ' ≤ ' + m.cabe + ')',
      m.pide <= m.cabe + 1, m);
    const par = m.hijos.find(x => x.clase.indexOf('lbl-pair') !== -1);
    check('...Y LA CANTIDAD SIGUE EN EL PAPEL, que es lo que de verdad hay que ' +
          'proteger: un nombre que empuja la cantidad fuera deja una etiqueta ' +
          'que no dice cuánto hay',
      par && par.bottom <= m.h, par);
    const cod = m.hijos.find(x => x.clase.indexOf('lbl-code') !== -1);
    check('...y el hueco del código tampoco se cae', cod && cod.bottom <= m.h + 0.5, cod);
  }

  console.log('\n═══ las cuatro cosas que Jose pidió, y el hueco ═══\n');
  {
    const m = await pintar(BASE);
    check('el nombre del material', m.texto.indexOf('W-TOL-MH147-JA') !== -1);
    check('la cantidad con su unidad', /44/.test(m.texto) && /UNIT/.test(m.texto));
    check('la locación', m.texto.indexOf('C2A') !== -1);
    check('el PO', m.texto.indexOf('08-4885') !== -1);
    const cod = m.hijos.find(x => x.clase.indexOf('lbl-code') !== -1);
    check('y el hueco del código EXISTE y tiene sitio de verdad (' +
          Math.round(cod.alto) + 'px ≈ ' + Math.round(cod.alto / 96 * 25.4) + 'mm) — ' +
          'Jose pidió "un lugar donde podamos poner el QR", y un lugar de 2mm no ' +
          'es un lugar', cod && cod.alto > 100, cod);
  }

  {
    const m = await pintar(Object.assign({}, BASE, { loc: '' }));
    check('un bulto sin estante lo DICE, en vez de dejar el recuadro vacío — un ' +
          'hueco en blanco en una etiqueta se lee como una etiqueta rota',
      /not assigned/i.test(m.texto), m.texto.slice(0, 120));
  }

  console.log('\n═══ una etiqueta POR ESTANTE, no por material ═══\n');
  {
    const r = await page.evaluate(() => {
      // 44 unidades repartidas entre dos estantes: dos bultos, dos sitios.
      const filas = _labelsFromEntry([{
        name: 'W-TOL', category: 'WINDOW', unit: 'UNIT',
        locations: [{ loc: 'C2A', qty: 30 }, { loc: 'B4A', qty: 14 }, { loc: 'X', qty: 0 }]
      }], { po: '08-4885', dateRec: '2026-09-11' });
      return filas.map(f => ({ loc: f.loc, qty: f.qty, po: f.po, copies: f.copies }));
    });
    check('salen DOS etiquetas, una por estante', r.length === 2, r);
    check('...cada una con SU cantidad, no con el total: una etiqueta que dijera ' +
          '"44 · C2A, B4A" estaría mintiendo en los dos estantes a la vez',
      r[0].qty === 30 && r[1].qty === 14, r);
    check('...y la fila de cantidad cero no genera etiqueta', !r.some(x => x.qty === 0));
    check('el PO compartido baja a cada una', r.every(x => x.po === '08-4885'));
    check('y cada una empieza con UNA copia — "1 debe ser el default"',
      r.every(x => x.copies === 1), r);
  }

  console.log('\n═══ elegir cuáles y cuántas ═══\n');

  // Cada bloque vuelve a abrir el cuadro desde cero. Sin esto, las copias que
  // pone un bloque siguen puestas en el siguiente y las cuentas salen de otra
  // cosa — que es exactamente lo que pasó al escribir esto.
  async function abrirTres(){
    return page.evaluate(() => {
      _openLabels(_labelsFromEntry([
        { name: 'UNO',  category: 'A', unit: 'UNIT', locations: [{ loc: 'C2A', qty: 1 }] },
        { name: 'DOS',  category: 'A', unit: 'UNIT', locations: [{ loc: 'B4A', qty: 2 }] },
        { name: 'TRES', category: 'A', unit: 'UNIT', locations: [{ loc: 'A1A', qty: 3 }] }
      ], {}), null);
    });
  }
  // Poner un valor a mano NO dispara onchange, así que el redibujado hay que
  // pedirlo igual que lo pediría la persona al teclear.
  async function poner(sel, val){
    return page.evaluate(([s, v]) => {
      const el = document.querySelector(s);
      if (el.type === 'checkbox') el.checked = v; else el.value = String(v);
      _labelsRedraw();
    }, [sel, val]);
  }

  {
    await abrirTres();
    const inicio = await page.evaluate(() => ({
      abierto: document.getElementById('labelsOverlay').classList.contains('show'),
      todas: _labelsChosen().length
    }));
    check('el cuadro se abre con las tres', inicio.abierto === true && inicio.todas === 3, inicio);

    // La segunda no la necesita; de la tercera hacen falta cuatro.
    await poner('#labelsList input[data-lbl="1"]', false);
    await poner('#labelsList input[data-copies="2"]', 4);
    const r = await page.evaluate(() => ({
      nombres: _labelsChosen().map(x => x.name),
      boton: document.getElementById('labelsPrintBtn').textContent
    }));
    check('desmarcar una la quita — "no todos la necesitan"',
      r.nombres.indexOf('DOS') === -1, r.nombres);
    check('...y cuatro copias son cuatro etiquetas, no una',
      r.nombres.filter(x => x === 'TRES').length === 4, r.nombres);
    check('el botón dice cuántas van a salir, antes de gastar papel',
      /Print 5 labels/.test(r.boton), r.boton);
  }

  {
    await abrirTres();
    const r = await page.evaluate(() => {
      _labelsAll(false);
      const vacio = { n: _labelsChosen().length,
                      bloqueado: document.getElementById('labelsPrintBtn').disabled };
      _labelsAll(true);
      return { vacio, lleno: _labelsChosen().length };
    });
    check('"Select none" deja cero y APAGA el botón: imprimir nada es una ' +
          'impresora que escupe una página en blanco',
      r.vacio.n === 0 && r.vacio.bloqueado === true, r.vacio);
    check('...y "Select all" las devuelve', r.lleno === 3, r.lleno);
  }

  {
    await abrirTres();
    const antes = await page.evaluate(() => document.querySelectorAll('#labelPreview .lbl').length);
    await poner('#labelsList input[data-copies="0"]', 4);
    const r = await page.evaluate(() => ({
      despues: document.querySelectorAll('#labelPreview .lbl').length,
      elegidas: _labelsChosen().length
    }));
    check('la vista previa enseña las etiquetas DISTINTAS, no las repetidas (' +
          r.despues + ' dibujos para ' + r.elegidas + ' impresiones)',
      antes === 3 && r.despues === 3 && r.elegidas === 6, { antes, ...r });
    await page.evaluate(() => _labelsClose());
  }

  console.log('\n═══ y al imprimir, SÓLO las etiquetas ═══\n');
  {
    await page.evaluate(() => {
      // DOS etiquetas, no una. La última NO lleva salto a propósito —si lo
      // llevara, cada tanda acabaría escupiendo una página en blanco— así que
      // medir el salto sobre una etiqueta única mide precisamente la excepción.
      const una = (n) => _labelHtml({ name: n, category: 'A', qty: 1, unit: 'UNIT',
        loc: 'C2A', po: 'P', supplier: '', project: '', dateRec: '2026-09-11' });
      document.getElementById('labelSheet').innerHTML = una('X') + una('Y');
    });
    await page.emulateMedia({ media: 'print' });
    const r = await page.evaluate(() => {
      const hoja = document.getElementById('labelSheet');
      const visibles = Array.from(document.body.children)
        .filter(el => el !== hoja && getComputedStyle(el).display !== 'none')
        .map(el => el.id || el.tagName);
      const lbl = hoja.querySelector('.lbl');
      const ultima = hoja.querySelectorAll('.lbl')[1];
      const cod = hoja.querySelector('.lbl-code');
      const cs  = getComputedStyle(cod);
      return {
        hojaVisible: getComputedStyle(hoja).display !== 'none',
        otros: visibles,
        ancho: lbl.getBoundingClientRect().width,
        alto:  lbl.getBoundingClientRect().height,
        salto: getComputedStyle(lbl).breakAfter || getComputedStyle(lbl).pageBreakAfter,
        saltoUltima: getComputedStyle(ultima).breakAfter || getComputedStyle(ultima).pageBreakAfter,
        codBorde: cs.borderTopWidth, codColor: cs.color
      };
    });
    check('LA APP ENTERA DESAPARECE: no queda ningún hermano de <body> visible ' +
          '(' + r.otros.join(', ') + '). Si esto falla salen seis páginas de ' +
          'tablero antes de la primera etiqueta, en papel que viene en rollos',
      r.otros.length === 0, r.otros);
    check('...y la hoja de etiquetas sí se ve', r.hojaVisible === true);
    check('la etiqueta mantiene sus 4×6 al imprimir (' + Math.round(r.ancho) + '×' +
          Math.round(r.alto) + ')',
      Math.abs(r.ancho - ANCHO) <= 1 && Math.abs(r.alto - ALTO) <= 1, r);
    check('cada etiqueta va en su propia página — si no, la segunda se imprime ' +
          'debajo de la primera y las dos salen cortadas',
      /page|always/.test(r.salto), r.salto);
    check('...menos la ÚLTIMA, que no lleva salto: si lo llevara, cada tanda ' +
          'acabaría escupiendo una página en blanco de papel térmico',
      /auto/.test(r.saltoUltima), r.saltoUltima);
    check('EN PAPEL EL HUECO DEL CÓDIGO NO LLEVA NI CONTORNO NI TEXTO: es ' +
          'espacio. Un recuadro vacío impreso se lee como una etiqueta a medio ' +
          'hacer',
      (r.codBorde === '0px' || r.codBorde === '') &&
      /rgba\(0, 0, 0, 0\)|transparent/.test(r.codColor), r);
    await page.emulateMedia({ media: 'screen' });
  }

  {
    const r = await page.evaluate(() => getComputedStyle(document.getElementById('labelSheet')).display);
    check('y fuera de la impresión la hoja está oculta: nadie tiene una etiqueta ' +
          'de 15 cm colgando al final del tablero', r === 'none', r);
  }

  console.log('\n═══ lo que viene detrás ═══\n');
  {
    const r = await page.evaluate(() => {
      let veces = 0;
      _openLabels([{ name: 'X', category: 'A', qty: 1, unit: 'U', loc: 'C2A',
                     po: '', supplier: '', project: '', dateRec: '', copies: 1 }],
                  function(){ veces++; });
      _labelsClose();
      _labelsClose();      // dos veces a mano, como si se cerrara dos veces
      return new Promise(r => setTimeout(() => r(veces), 400));
    });
    check('la pregunta de las entregas sale UNA vez al cerrar el cuadro, no una ' +
          'por cada cierre — dos ventanas apiladas es el fallo que costó la v11.29',
      r === 1, r);
  }
  {
    const r = await page.evaluate(() => {
      let veces = 0;
      _openLabels([], function(){ veces++; });   // una entrada sin nada que etiquetar
      return new Promise(r => setTimeout(() => r({
        veces, abierto: document.getElementById('labelsOverlay').classList.contains('show')
      }), 400));
    });
    check('sin nada que etiquetar no se abre ningún cuadro...', r.abierto === false);
    check('...pero lo que venía detrás SÍ ocurre: un cuadro que no aparece no ' +
          'puede tragarse la pregunta siguiente', r.veces === 1, r);
  }

  check('sin errores de página' + (errs.length ? ' — ' + errs.join('; ') : ''), errs.length === 0);
  await browser.close();

  console.log('\n────────────────────────────────────────────────────────────────────────');
  console.log('EL HUECO DEL CÓDIGO ESTÁ VACÍO A PROPÓSITO. Jose pidió "un lugar');
  console.log('donde podamos poner el QR o código de barras", y eso es lo que');
  console.log('hay. Qué se codifica dentro es una decisión más grande que el');
  console.log('hueco: lo que lleve decide PARA QUÉ sirve escanearlo — encontrar');
  console.log('el movimiento, ver el stock del material, o mover material');
  console.log('escaneando en vez de tecleando. Eso se habla antes de elegirlo.');
  console.log('────────────────────────────────────────────────────────────────────────\n');

  console.log(fail ? `labels: ${fail} FALLO(S), ${ok} ok` : `labels: ok (${ok})`);
  process.exit(fail ? 1 : 0);
})();
