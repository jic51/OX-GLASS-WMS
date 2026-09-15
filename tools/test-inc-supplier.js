// NOMBRE - SUPPLIER, EN UNA SOLA LÍNEA.
//
// Jose, 2026-09-14: "quiero que en el pop-up de los deliveries aparezca también
// el supplier del material, al lado del nombre, NOMBRE - SUPPLIER, pero si el
// nombre es muy largo, se lo acorta con ... y se pone el supplier en la misma
// línea, NO EN LA SIGUIENTE". Y al preguntarle los dos casos que faltaban:
// sin supplier, sólo el nombre y sin guion; y el supplier también se acorta si
// es larguísimo.
//
// LAS TRES COSAS QUE PIDIÓ SON MEDIDAS, NO LEÍDAS. Que el CSS "diga nowrap" no
// prueba que quepa: lo que decide es la altura que el navegador le da a la
// línea y el ancho que ocupa cada trozo. Por eso esto abre la app de verdad en
// un navegador de verdad, con la hoja de estilos entera, y mide.
//
// Y una que NO pidió, pero que va con la anterior: recortar en pantalla no
// puede ser perder el dato. Los dos trozos llevan title, así que el nombre
// completo se lee pasando el mouse. Acortar sin eso sería esconder lo que el
// usuario escribió, que es justo lo contrario de lo que esta app promete.
//
// Uso:  NODE_PATH="$(npm root -g)" CHROME_PATH=... node tools/test-inc-supplier.js

const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const RAIZ = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(RAIZ, 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

function fnSrc(name){
  const ini = HTML.indexOf('function ' + name + '(');
  if (ini === -1) throw new Error('no encontrada: ' + name);
  let d = 0;
  for (let j = HTML.indexOf('{', ini); j < HTML.length; j++) {
    if (HTML[j] === '{') d++;
    else if (HTML[j] === '}') { d--; if (d === 0) return HTML.slice(ini, j + 1); }
  }
  throw new Error('sin cerrar: ' + name);
}

// LA HOJA DE ESTILOS ENTERA, no unas reglas escogidas a mano. Una versión
// anterior de otra prueba inyectaba dos reglas elegidas por mí y por eso no vio
// que el resto del archivo las contradecía.
const CSS = (HTML.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';

const NOMBRE_LARGO = 'SGD-MISC ALUMINUM THERMALLY BROKEN SLIDING GLASS DOOR PANEL XXL';
const PROV_LARGO   = 'WESTERN ARCHITECTURAL GLASS AND ALUMINUM SUPPLY COMPANY LLC';

(async () => {
  const navegador = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--no-sandbox']
  });
  const page = await navegador.newPage({ viewport: { width: 420, height: 900 } });

  await page.setContent(
    '<style>' + CSS + '</style>' +
    '<div id="caja" style="width:360px"></div>' +
    '<script>' +
      'var userRole = "ADMIN";' +
      'function catBadge(c){ return "<span>" + c + "</span>"; }' +
      fnSrc('_he') + fnSrc('_escAttr') + fnSrc('nt') +
      fnSrc('_incQtyText') + fnSrc('_incDateLabel') + fnSrc('_incFirstDocUrl') +
      fnSrc('_incItemHtml') +
    '</script>');

  async function pintar(item){
    return page.evaluate((it) => {
      const caja = document.getElementById('caja');
      caja.innerHTML = _incItemHtml(it, { showDate: false });
      const linea = caja.querySelector('.inc-item-name');
      const nom   = caja.querySelector('.inc-name-txt');
      const sup   = caja.querySelector('.inc-name-sup');
      const r  = el => el ? el.getBoundingClientRect() : null;
      const rl = r(linea), rn = r(nom), rs = r(sup);
      return {
        html: caja.innerHTML,
        alto: rl.height,
        // Una línea de texto mide una altura; dos miden el doble. Es la medida
        // que contesta "¿se fue a la siguiente línea?" sin creerle al CSS.
        altoNombre: rn.height,
        mismaLinea: rs ? Math.abs(rn.top - rs.top) < 3 : null,
        nombreRecortado: nom.scrollWidth > nom.clientWidth + 1,
        supRecortado: sup ? sup.scrollWidth > sup.clientWidth + 1 : null,
        supVisible: rs ? rs.width > 0 : false,
        derechaSup: rs ? rs.right : null,
        derechaLinea: rl.right,
        titleNombre: nom.getAttribute('title'),
        titleSup: sup ? sup.getAttribute('title') : null,
        textoSup: sup ? sup.textContent : null
      };
    }, item);
  }

  const base = { id: 'i1', category: 'WINDOW', qty: 4, unit: 'UNIT',
                 status: 'Pending', estDate: '2026-09-14', notes: '' };

  console.log('\n═══ el caso normal: nombre corto, proveedor corto ═══\n');
  {
    const r = await pintar(Object.assign({}, base, { name: 'MH 145', supplier: 'AMSCO' }));
    check('el supplier sale', r.supVisible, r.textoSup);
    // EL GUION SE FUE EL 2026-09-15. Jose lo vio puesto y pidió otra cosa:
    // "mejor quiero que lo hagas como las categorías, pero dale un solo color
    // para todas". Con forma de insignia el guion sobra — la caja ya dice que
    // es otra cosa.
    check('...sin guion delante: el texto es el proveedor y nada más',
      r.textoSup === 'AMSCO', r.textoSup);
    check('...y en la MISMA línea que el nombre', r.mismaLinea === true);
    check('con todo corto no se recorta nada',
      !r.nombreRecortado && !r.supRecortado);
    // Desde que el proveedor es una INSIGNIA, la fila mide un poco más que el
    // texto suelto: la píldora lleva su propio relleno. Eso no es una segunda
    // línea. Lo que contesta "¿se envolvió?" es que los dos trozos empiecen a
    // la misma altura —ya comprobado arriba— y que la fila no llegue a medir lo
    // que medirían dos. El primer intento comparaba contra la altura del NOMBRE
    // y se caía por los cuatro píxeles del relleno.
    const unaLinea = r.altoNombre;
    check('la fila sigue siendo UNA línea, no dos — la insignia la engorda un ' +
          'poco, envolverse la doblaría',
      unaLinea > 0 && r.alto < unaLinea * 1.8, { alto: r.alto, unaLinea });
  }

  console.log('\n═══ y es una insignia, de un solo color ═══\n');
{
  const r = await pintar(Object.assign({}, base, { name: 'MH 145', supplier: 'AMSCO' }));
  const est = await page.evaluate(() => {
    const el = document.querySelector('.inc-name-sup');
    const c  = getComputedStyle(el);
    const cat = document.querySelector('.inc-item-cat span');
    return { fondo: c.backgroundColor, letra: c.color, radio: c.borderRadius,
             tieneCaja: c.paddingLeft !== '0px' };
  });
  check('tiene fondo propio, no es texto suelto',
    est.fondo !== 'rgba(0, 0, 0, 0)' && est.fondo !== 'transparent', est.fondo);
  check('...oscuro', (() => {
    const m = est.fondo.match(/\d+/g).map(Number);
    return (m[0] + m[1] + m[2]) / 3 < 110;   // media de canales: oscuro
  })(), est.fondo);
  check('...con la letra blanca, que es lo que contrasta con él',
    est.letra === 'rgb(255, 255, 255)', est.letra);
  check('...y forma de píldora, como las categorías', parseFloat(est.radio) >= 8, est.radio);
  check('...con su caja alrededor, no pegado al nombre', est.tieneCaja);

  // UN SOLO COLOR PARA TODOS. La categoría se colorea porque el color dice qué
  // tipo de material es; el proveedor no tiene tipos, y darle colores distintos
  // inventaría un significado que no existe.
  const otro = await page.evaluate(() => {
    const el = document.querySelector('.inc-name-sup');
    return getComputedStyle(el).backgroundColor;
  });
  const r2 = await pintar(Object.assign({}, base, { name: 'X', supplier: 'HARTUNG' }));
  const otro2 = await page.evaluate(() => {
    const el = document.querySelector('.inc-name-sup');
    return getComputedStyle(el).backgroundColor;
  });
  check('dos proveedores distintos, el MISMO color — el color no significa nada ' +
        'aquí, y fingir que sí es inventarle un dato al usuario',
    otro === otro2, { AMSCO: otro, HARTUNG: otro2 });
}

console.log('\n═══ nombre larguísimo: se acorta ÉL, y el supplier no baja ═══\n');
  {
    const corto = await pintar(Object.assign({}, base, { name: 'MH 145', supplier: 'AMSCO' }));
    const r = await pintar(Object.assign({}, base, { name: NOMBRE_LARGO, supplier: 'AMSCO' }));

    // LA ASERCIÓN QUE ES LA PETICIÓN DE JOSE, palabra por palabra.
    check('el supplier sigue en la MISMA línea, no en la siguiente',
      r.mismaLinea === true);
    check('...y la tarjeta NO ha crecido a dos líneas',
      r.alto <= corto.alto + 2, { largo: r.alto, corto: corto.alto });
    check('el nombre se acorta', r.nombreRecortado === true);
    check('...y se acorta con puntos suspensivos, que es lo que hace ' +
          'text-overflow:ellipsis en un trozo con overflow oculto',
      /text-overflow:\s*ellipsis/.test(CSS) && r.nombreRecortado);
    check('el supplier NO se acorta cuando es el nombre el que sobra — quien ' +
          'más sobra es quien más cede', r.supRecortado === false);
    check('y nada se sale de la tarjeta por la derecha',
      r.derechaSup <= r.derechaLinea + 1, { sup: r.derechaSup, linea: r.derechaLinea });
  }

  console.log('\n═══ supplier larguísimo: ése también se acorta ═══\n');
  {
    // La segunda respuesta de Jose: "el supplier también se acorta si es
    // larguísimo". Sin esto, un proveedor con razón social entera empujaría el
    // nombre hasta dejarlo en dos letras.
    const r = await pintar(Object.assign({}, base, { name: 'MH 145', supplier: PROV_LARGO }));
    check('el supplier se acorta', r.supRecortado === true);
    check('...y sigue en la misma línea', r.mismaLinea === true);
    check('...y el nombre corto NO se ha recortado para hacerle sitio',
      r.nombreRecortado === false);
    check('nada se sale por la derecha', r.derechaSup <= r.derechaLinea + 1);
  }

  console.log('\n═══ los dos larguísimos: se reparten, y ninguno desaparece ═══\n');
  {
    const r = await pintar(Object.assign({}, base,
      { name: NOMBRE_LARGO, supplier: PROV_LARGO }));
    check('los dos se acortan', r.nombreRecortado === true && r.supRecortado === true);
    check('el supplier sigue ocupando un ancho de verdad, no cero — un dato ' +
          'que se encoge hasta desaparecer es un dato perdido',
      r.supVisible === true);
    check('y todo cabe en una línea', r.mismaLinea === true);
  }

  console.log('\n═══ sin supplier: sólo el nombre, y SIN guion ═══\n');
  {
    // Jose, literal: "sólo el nombre (sin el guion)". Un guion suelto al final
    // se lee como un dato que se perdió, y aquí no se perdió nada.
    const r = await pintar(Object.assign({}, base, { name: 'MH 145', supplier: '' }));
    check('no hay trozo de supplier', r.supVisible === false && r.textoSup === null);
    check('...y no queda un guion colgando detrás del nombre',
      !/MH 145\s*<\/span>\s*-/.test(r.html) && r.html.indexOf('inc-name-sup') === -1);

    const soloEspacios = await pintar(Object.assign({}, base,
      { name: 'MH 145', supplier: '   ' }));
    check('un supplier que son sólo espacios cuenta como que no hay',
      soloEspacios.html.indexOf('inc-name-sup') === -1);
  }

  console.log('\n═══ acortar no puede ser perder ═══\n');
  {
    const r = await pintar(Object.assign({}, base,
      { name: NOMBRE_LARGO, supplier: PROV_LARGO }));
    check('el nombre completo se lee pasando el mouse', r.titleNombre === NOMBRE_LARGO);
    check('...y el proveedor completo también', r.titleSup === PROV_LARGO);
  }

  console.log('\n═══ el nombre lo escribe una persona ═══\n');
  {
    const r = await pintar(Object.assign({}, base,
      { name: 'MH "145" <b>', supplier: 'A & B <i>' }));
    check('unas comillas en el nombre no rompen el atributo title',
      r.titleNombre === 'MH "145" <b>');
    check('...y un <b> no se convierte en negrita de verdad',
      r.html.indexOf('&lt;b&gt;') !== -1);
    check('el & del proveedor llega entero', r.titleSup === 'A & B <i>');
  }

  console.log('\n═══ y en un teléfono ═══\n');
  {
    await page.setViewportSize({ width: 380, height: 800 });
    await page.evaluate(() => { document.getElementById('caja').style.width = '320px'; });
    const r = await pintar(Object.assign({}, base,
      { name: NOMBRE_LARGO, supplier: PROV_LARGO }));
    check('sigue siendo UNA línea a 320px de ancho', r.mismaLinea === true);
    check('...y no desborda', r.derechaSup <= r.derechaLinea + 1);
    const sinBarra = await page.evaluate(() =>
      document.documentElement.scrollWidth <= window.innerWidth + 1);
    check('...y la página no scrollea de lado', sinBarra);
  }

  await navegador.close();

  console.log('\n────────────────────────────────────────────────────────────────────────');
  console.log('La misma tarjeta la dibujan el pop-up de la mañana Y las tarjetas');
  console.log('de día de la pestaña Incoming: _incItemHtml es una sola función y');
  console.log('la llaman los dos. El supplier sale en los dos sitios, y eso es a');
  console.log('propósito — la alternativa era una segunda copia de la tarjeta,');
  console.log('que es como se empieza a tener dos tarjetas distintas.');
  console.log('────────────────────────────────────────────────────────────────────────\n');

  console.log((fail ? 'inc supplier: ' + fail + ' FALLO(S)' : 'inc supplier: ok (' + ok + ')') + '\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
