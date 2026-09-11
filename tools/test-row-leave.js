// CÓMO SE VA UNA FILA — UNA SOLA FORMA, Y LA FILA SE VA AL PULSAR.
//
// Jose, 2026-09-09: "quiero esta animación en cada lugar donde se borre algo, ya
// sea que se corrija, restaure, elimine, haga merge, etc. Debe ser estándar en
// la app."
//
// Y 2026-09-10: "cuando elimino lo que sea que elimine, debe moverse y
// desaparecer con la animación en el mismo segundo que el toast."
//
// Ese "mismo segundo" resultó ser CUATRO, medidos en su hoja el 2026-09-11: cada
// borrado hace que el servidor reconstruya los totales del almacén desde el
// archivo entero. Eso no se arregla animando — se arregla no haciendo esperar
// mirando. De ahí las dos mitades de este archivo:
//
//   1. _rowLeave, la forma de irse. Una función, y su `done` es lo que permite
//      que los ocho sitios donde algo desaparece compartan una sola forma en
//      vez de ocho parecidas.
//
//   2. QUITAR AL PULSAR, con vuelta atrás. La fila se va dando por hecho que el
//      servidor dirá que sí; si dice que no, vuelve A SU SITIO.
//
// LA TRAMPA QUE ESTE ARCHIVO EXISTE PARA CAZAR, y es la lección de la v11.66:
// si quien llama REPINTA LA LISTA ENTERA, la animación no se ve — la fila no se
// encoge, la lista parpadea. Por eso se mide la ALTURA de verdad a mitad de
// animación, no la presencia de una clase. Una clase puede estar puesta y el
// repintado habérsela llevado por delante en el mismo fotograma.
//
// Uso:  node tools/test-row-leave.js

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
window.addEventListener('DOMContentLoaded', function(){
  // Una tabla de verdad con la hoja de estilos de verdad. Las filas se ponen a
  // mano porque sin sesión la app no pinta movimientos — pero LA ANIMACIÓN que
  // se mide es la del producto, no una copia escrita aquí.
  var caja = document.createElement('div');
  caja.id = 'probe';
  caja.innerHTML = '<table><tbody id="cuerpo">' +
    '<tr data-mov="m1"><td>UNO</td><td>10</td></tr>' +
    '<tr data-mov="m2"><td>DOS</td><td>20</td></tr>' +
    '<tr data-mov="m3"><td>TRES</td><td>30</td></tr>' +
    '</tbody></table>' +
    '<div id="mazo">' +
      '<div class="deck-card" data-trash="t1" style="padding:.6rem;border:1px solid #ccc;margin-bottom:.4rem">TARJETA UNA</div>' +
      '<div class="deck-card" data-trash="t2" style="padding:.6rem;border:1px solid #ccc;margin-bottom:.4rem">TARJETA DOS</div>' +
    '</div>';
  document.body.appendChild(caja);
});
</script>`;

(async () => {
  const f = path.join(os.tmpdir(), 'acopio-row-leave.html');
  fs.writeFileSync(f, HTML.replace('</head>', stub + '</head>'));

  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + f);
  await page.waitForTimeout(300);

  console.log('\n═══ una fila de tabla se ENCOGE, no sólo se desvanece ═══\n');
  {
    const r = await page.evaluate(async () => {
      const tr = document.querySelector('#cuerpo tr[data-mov="m2"]');
      const antes = tr.getBoundingClientRect().height;
      const altoTabla = document.querySelector('#probe table').getBoundingClientRect().height;
      let llamado = false;
      _rowLeave(tr, () => { llamado = true; });
      await new Promise(r => setTimeout(r, 120));       // a mitad de camino
      const medio = tr.getBoundingClientRect().height;
      const opacidad = getComputedStyle(tr.querySelector('td')).opacity;
      await new Promise(r => setTimeout(r, 260));
      return { antes, medio, altoTabla,
               finalTabla: document.querySelector('#probe table').getBoundingClientRect().height,
               opacidad: Number(opacidad), llamado,
               clase: tr.className };
    });
    check('la fila tenía alto de verdad antes (' + Math.round(r.antes) + 'px) — ' +
          'sin eso, cualquier medida de "se encogió" pasaría sola', r.antes > 8, r);
    check('A MITAD DE ANIMACIÓN LA FILA MIDE MENOS (' + Math.round(r.antes) + 'px → ' +
          Math.round(r.medio) + 'px). Es la aserción que importa: una fila que ' +
          'sólo se desvanece deja su hueco, y las de abajo saltan de golpe ' +
          'cuando el hueco se cierra',
      r.medio < r.antes * 0.8, r);
    check('...y se está desvaneciendo a la vez (opacidad ' + r.opacidad + ')',
      r.opacidad < 0.6, r);
    check('...y la TABLA ENTERA se encogió con ella, o sea que las de abajo ' +
          'subieron de verdad (' + Math.round(r.altoTabla) + 'px → ' +
          Math.round(r.finalTabla) + 'px)',
      r.finalTabla < r.altoTabla - 5, r);
    check('lleva la clase del producto, no un estilo inventado aquí',
      /row-leaving/.test(r.clase), r.clase);
    check('y el callback se llamó al terminar — quien llama pone ahí lo que ' +
          'pasa después, y una animación que se traga el trabajo que venía ' +
          'detrás es peor que no animar', r.llamado);
  }

  console.log('\n═══ lo que no es una fila de tabla también se va ═══\n');
  {
    const r = await page.evaluate(async () => {
      const c = document.querySelector('#mazo [data-trash="t1"]');
      const antes = c.getBoundingClientRect();
      _rowLeave(c, () => {});
      await new Promise(r => setTimeout(r, 120));
      const medio = c.getBoundingClientRect();
      const cs = getComputedStyle(c);
      await new Promise(r => setTimeout(r, 260));
      return { alto: [antes.height, medio.height], x: [antes.left, medio.left],
               clase: c.className, op: Number(cs.opacity) };
    });
    check('una tarjeta también se encoge (' + Math.round(r.alto[0]) + 'px → ' +
          Math.round(r.alto[1]) + 'px)', r.alto[1] < r.alto[0] * 0.8, r);
    check('...y además se DESPLAZA, que en una tabla no se puede porque un <td> ' +
          'no acepta transform (' + Math.round(r.x[0]) + ' → ' + Math.round(r.x[1]) + ')',
      r.x[1] < r.x[0] - 3, r);
    check('...con la clase de las tarjetas, no la de las filas',
      /card-leaving/.test(r.clase) && !/row-leaving/.test(r.clase), r.clase);
  }

  console.log('\n═══ el callback se llama SIEMPRE, y una sola vez ═══\n');
  {
    const r = await page.evaluate(async () => {
      let a = 0, b = 0, c = 0;
      _rowLeave(null, () => a++);                                   // sin elemento
      _rowLeave(document.createElement('tr'), () => b++);           // fuera del DOM
      _rowLeave(document.querySelector('#cuerpo tr[data-mov="m3"]'), () => c++);
      await new Promise(r => setTimeout(r, 500));
      return { a, b, c };
    });
    check('sin elemento se llama igual, al instante — una fila que no estaba ' +
          'pintada no puede impedir que se borre', r.a === 1, r);
    check('con un elemento que no está en la página, también', r.b === 1, r);
    check('y con una fila de verdad, UNA sola vez (no una por el timeout y otra ' +
          'por la transición)', r.c === 1, r);
  }

  console.log('\n═══ quien pidió menos movimiento no lo recibe ═══\n');
  {
    const p2 = await browser.newPage({ viewport: { width: 900, height: 600 },
                                       reducedMotion: 'reduce' });
    await p2.goto('file://' + f);
    await p2.waitForTimeout(300);
    const r = await p2.evaluate(async () => {
      const tr = document.querySelector('#cuerpo tr[data-mov="m1"]');
      let cuando = -1;
      const t0 = performance.now();
      _rowLeave(tr, () => { cuando = performance.now() - t0; });
      await new Promise(r => setTimeout(r, 60));
      return { cuando, clase: tr.className };
    });
    check('con prefers-reduced-motion el callback llega EN EL ACTO (' +
          Math.round(r.cuando) + ' ms), no tras los 240 de la animación',
      r.cuando >= 0 && r.cuando < 40, r);
    check('...y no se le pone ninguna clase de animación',
      !/leaving/.test(r.clase), r.clase);
    await p2.close();
  }

  check('sin errores de página' + (errs.length ? ' — ' + errs.join('; ') : ''), errs.length === 0);
  await browser.close();

  // ── La otra mitad: quitar al pulsar, leída sobre el archivo ────────────────
  //
  // Esto no se puede ejercitar en el navegador sin una sesión y un servidor, así
  // que se lee el archivo. Pero NO se busca "que la función mencione _rowLeave"
  // —eso pasaría con la llamada en cualquier sitio—: se comprueba el ORDEN, que
  // es lo único que decide si se ve algo.
  console.log('\n═══ la fila se va al pulsar, no al contestar el servidor ═══\n');
  {
    const borrar = fnSrc('_doDeleteMovementRow');
    const iLeave   = borrar.indexOf('_rowLeave(');
    const iEncolar = borrar.indexOf('_delEnqueue(');
    const iExito   = borrar.indexOf('withSuccessHandler');

    check('se llama a _rowLeave, o sea que usa la forma estándar y no una suya',
      iLeave !== -1);
    check('...ANTES de encolar la petición: la fila se va al pulsar, no cuando ' +
          'el servidor conteste — que medido en la hoja de Jose son cuatro ' +
          'segundos después', iLeave !== -1 && iEncolar !== -1 && iLeave < iEncolar,
      { iLeave, iEncolar });
    check('...y antes del manejador de éxito, obviamente',
      iLeave < iExito);

    // El repintado tiene que ir DENTRO del callback. Fuera, se lleva por delante
    // la fila que se está animando y no se ve nada: la lección de la v11.66.
    const bloque = borrar.slice(iLeave, borrar.indexOf('_delEnqueue('));
    check('el repintado va DENTRO del callback de _rowLeave — fuera, el ' +
          'repintado borra la fila que se está animando y no se ve nada',
      /_rowLeave\([^]*?function\s*\(\)\s*\{[^]*?renderAll\(\)/.test(bloque), bloque.slice(0, 200));

    // Y la vuelta atrás, que es lo que hace honesto quitar antes de preguntar.
    const fallo = borrar.slice(borrar.indexOf('withFailureHandler'));
    check('si el servidor dice que no, la fila VUELVE',
      /movements\.splice\(/.test(fallo) && /indexOf\(mov\) === -1/.test(fallo), fallo.slice(0, 240));
    check('...y vuelve A SU SITIO, no al final: ponerla al final sería decirle ' +
          'a alguien que su movimiento es el más reciente cuando es de hace un mes',
      /splice\(\s*Math\.max\(0,\s*Math\.min\(donde/.test(fallo));
    check('...y se le dice a la persona, en vez de que la fila reaparezca sola',
      /back where it was/.test(fallo));
  }

  console.log('\n═══ y la papelera usa la MISMA forma ═══\n');
  {
    const tirar = fnSrc('_trashDrop');
    check('_trashDrop anima con _rowLeave en vez de repintar de golpe',
      /_rowLeave\(/.test(tirar), tirar);
    check('...y el repintado va dentro del callback, igual que en la tabla',
      /_rowLeave\([^]*?function\s*\(\)\s*\{[^]*?_paintTrash\(/.test(tirar), tirar);
    check('...y encuentra su fila por el atributo que _paintTrash escribe',
      /data-trash="/.test(tirar) && /data-trash="/.test(fnSrc('_paintTrash')));
  }

  console.log('\n────────────────────────────────────────────────────────────────────────');
  console.log('QUEDAN SEIS SITIOS por pasar a esta forma: vaciar la papelera,');
  console.log('los merges (material, proyecto, proveedor, locación), borrar una');
  console.log('locación vacía, quitar un valor del catálogo, un contacto del');
  console.log('directorio o una entrega esperada, y los arreglos de Check my');
  console.log('data. Varios de ellos REPINTAN LA LISTA ENTERA al terminar, así');
  console.log('que la animación no se vería: el trabajo de verdad es enseñarles');
  console.log('a quitar UNA fila, no la animación.');
  console.log('────────────────────────────────────────────────────────────────────────\n');

  console.log(fail ? `row leave: ${fail} FALLO(S), ${ok} ok` : `row leave: ok (${ok})`);
  process.exit(fail ? 1 : 0);
})();
