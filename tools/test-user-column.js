// LA COLUMNA "USER": UNA PERSONA, NO UN CORREO.
//
// Jose, 2026-09-09, con captura: "quiero que en lugar del email que aparece en
// User, aparezca el nombre de la persona, y el correo en gris abajo pero más
// pequeño, y al hacer hover aparezcan las opciones de enviar email o llamar por
// Google Meet."
//
// LA PIEZA QUE FALTABA ERA DEL BACKEND. El nombre vive en USERS_V3 y no viaja
// con los movimientos: el archivo guarda el correo de quien guardó cada fila y
// nada más. Y getUsers() —la lista entera— sólo se le manda a los ADMIN, así
// que para un almacenero la columna habría seguido siendo un correo por mucho
// que le cambiáramos la forma.
//
// De las dos maneras de arreglarlo se eligió la que NO escribe el nombre dentro
// del movimiento, y esa decisión es la mitad de lo que este archivo protege:
//
//   escribirlo en cada fila deja las viejas con el correo para siempre, y clava
//   el nombre del día en que se guardó — un apellido que cambia, o un typo que
//   se corrige, quedan mal escritos en miles de filas;
//
//   mandar el directorio y resolverlo AL DIBUJAR corrige el pasado entero de
//   golpe, porque no hay pasado que corregir: el nombre es un dato de la
//   persona, no del movimiento.
//
// LA OTRA MITAD ES QUE NO SE INVENTE NINGÚN NOMBRE. La tentación evidente es
// partir el correo por el punto y capitalizar. "info@", "compras@" y "jc@"
// darían nombres que no son de nadie, y un nombre inventado en la columna de
// quién hizo un movimiento es peor que un correo, porque el correo al menos es
// verdad.
//
// Y lo que sale de la hoja: SÓLO correo y nombre. El rol, quién añadió a quién
// y si está activo se quedan donde estaban, detrás de getUsers() y de ADMIN.
//
// La ficha flotante se mide en un navegador de verdad, al final: que aguante el
// viaje del ratón desde el nombre hasta sus botones es geometría y tiempo, y no
// hay forma de comprobarlo leyendo el archivo.
//
// Uso:  node tools/test-user-column.js

const fs = require('fs'), path = require('path'), os = require('os'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');
const GS   = fs.readFileSync(path.join(ROOT, 'Code_v3_fixed.gs'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

function fnSrc(src, name){
  const start = src.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('no encontrada: ' + name);
  let depth = 0;
  for (let j = src.indexOf('{', start); j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error('sin cerrar: ' + name);
}

// ── 1. El directorio, sobre una hoja de mentira ──────────────────────────────
//
// La hoja recuerda con qué rango se le preguntó. Es la aserción que impide que
// esto se convierta con el tiempo en "manda la fila entera y ya filtrará el
// navegador" — que es como el rol de cada persona acabaría viajando a todos.
console.log('\n═══ el directorio: correo → nombre, y nada más ═══\n');

function hoja(filas){
  const pedidos = [];
  return {
    pedidos,
    getLastRow: () => filas.length + 1,          // +1 por la cabecera
    getRange: (fila, col, alto, ancho) => {
      pedidos.push({ fila, col, alto, ancho });
      return { getValues: () => filas.map(f => f.slice(col - 1, col - 1 + ancho)) };
    }
  };
}

function directorio(filas){
  const h = filas === null ? null : hoja(filas);
  const registro = [];
  const ctx = vm.createContext({
    String, Object, console,
    Logger: { log: (m) => registro.push(String(m)) },
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => h }) }
  });
  vm.runInContext(fnSrc(GS, 'userDirectory_'), ctx);
  ctx.__ss = { getSheetByName: () => h };
  const out = vm.runInContext('userDirectory_(__ss)', ctx);
  return { out, hoja: h, registro };
}

// A=ID  B=Email  C=Name  D=Role  E=AddedBy  F=AddedAt  G=Active
const FILAS = [
  ['u1', 'Jose@OxGlass.com',  'Jose Castro',  'ADMIN',     'sys', '2026-01-01', true],
  ['u2', 'ana@oxglass.com',   'Ana Delgado',  'WAREHOUSE', 'u1',  '2026-02-01', true],
  ['u3', 'viejo@oxglass.com', 'Luis Retirado','WAREHOUSE', 'u1',  '2025-05-01', false],
  ['u4', 'sinnombre@ox.com',  '',             'VIEWER',    'u1',  '2026-03-01', true]
];

{
  const r = directorio(FILAS);
  check('empareja cada correo con su nombre',
    r.out['ana@oxglass.com'] === 'Ana Delgado');
  check('...y la clave va en minúsculas, porque el correo del archivo puede ' +
        'venir escrito de cualquier forma',
    r.out['jose@oxglass.com'] === 'Jose Castro' && !('Jose@OxGlass.com' in r.out));
  check('UN USUARIO DESACTIVADO SIGUE TENIENDO NOMBRE: el movimiento que ' +
        'guardó sigue siendo suyo, y volver a enseñar su correo pelado el día ' +
        'que se le da de baja sería perder información por un cambio que no ' +
        'tiene nada que ver',
    r.out['viejo@oxglass.com'] === 'Luis Retirado');
  check('una fila sin nombre no entra — no hay nada que decir de ella',
    !('sinnombre@ox.com' in r.out));

  const p = r.hoja.pedidos[0];
  check('SÓLO SE LEEN DOS COLUMNAS DE LA HOJA, la B y la C (' +
        JSON.stringify(p) + '): el rol, quién añadió a quién y si está activo ' +
        'se quedan detrás de getUsers() y de ADMIN',
    p && p.col === 2 && p.ancho === 2 && p.fila === 2);
  check('...y nada de lo que sale lleva rol ni quién lo añadió',
    Object.keys(r.out).every(k => typeof r.out[k] === 'string') &&
    JSON.stringify(r.out).indexOf('ADMIN') === -1);
}

{
  const r = directorio(null);
  check('sin hoja USERS_V3 devuelve un directorio vacío, no una excepción — ' +
        'la columna se queda con el correo y la app arranca igual',
    r.out && Object.keys(r.out).length === 0);
}

{
  // Una hoja que lanza al leerla. Que no se pueda leer no puede tumbar la carga.
  const ctx = vm.createContext({
    String, Object, console,
    Logger: { log: () => {} },
    SpreadsheetApp: { getActiveSpreadsheet: () => { throw new Error('boom'); } }
  });
  vm.runInContext(fnSrc(GS, 'userDirectory_'), ctx);
  let tumbó = false, out = null;
  try { out = vm.runInContext('userDirectory_(null)', ctx); } catch (e) { tumbó = true; }
  check('y una hoja que revienta al leerse tampoco tumba nada',
    !tumbó && out && Object.keys(out).length === 0);
}

console.log('\n═══ y va a TODOS los roles, no sólo a los ADMIN ═══\n');
{
  // El corte exacto: `users` está dentro del if de ADMIN y `userNames` fuera.
  // Si alguien mete el directorio dentro del if, la columna vuelve a ser un
  // correo para todo el mundo menos para Jose — y nadie lo notaría, porque Jose
  // la vería bien.
  const i   = GS.indexOf("if (auth.role === 'ADMIN') {");
  const fin = GS.indexOf('}', GS.indexOf('getUsers(auth)', i));
  const dentro = GS.slice(i, fin);
  const cerca  = GS.slice(fin, fin + 400);
  check('userNames se calcula FUERA del if de ADMIN',
    dentro.indexOf('userNames') === -1 && /userNames\s*=\s*userDirectory_/.test(cerca), cerca.slice(0, 120));
  check('...y se manda en getInitialData', /userNames:\s*userNames/.test(GS));
}

// ── 2. La celda ──────────────────────────────────────────────────────────────
console.log('\n═══ la celda: nombre arriba, correo en gris debajo ═══\n');

function celda(dir){
  const ctx = vm.createContext({ String, Object, console, userNames: dir || {} });
  ['_he', '_escAttr', '_personName', '_personLabel', '_userCellHtml']
    .forEach(n => vm.runInContext(fnSrc(HTML, n), ctx));
  return {
    html: (mail) => { ctx.__m = mail; return vm.runInContext('_userCellHtml(__m)', ctx); },
    label: (mail) => { ctx.__m = mail; return vm.runInContext('_personLabel(__m)', ctx); }
  };
}

{
  const c = celda({ 'jose@oxglass.com': 'Jose Castro' });
  const con = c.html('jose@oxglass.com');
  check('con nombre salen las dos líneas',
    /mc-who-name">Jose Castro</.test(con) && con.indexOf('jose@oxglass.com') !== -1);
  check('...y la de abajo reutiliza .mc-sub, el mismo gris que "Type / Date" y ' +
        '"Category / Name" — no un gris nuevo que luego se desincroniza',
    /class="mc-sub mc-who-mail"/.test(con));
  check('...y el ancla lleva el correo, que es lo que la ficha necesita',
    /data-person="jose@oxglass\.com"/.test(con));

  const sin = c.html('otro@oxglass.com');
  check('SIN NOMBRE SE ENSEÑA EL CORREO, TAL CUAL',
    sin.indexOf('otro@oxglass.com') !== -1 && !/mc-who-name/.test(sin));
  check('...y no empeora para nadie: sigue siendo pequeño y gris, como antes ' +
        'de la v11.73', /class="mc-who-mail"/.test(sin));

  check('un correo con forma de nombre NO se convierte en un nombre — ' +
        'j.castro@ no es "J Castro", info@ no es "Info", y un nombre inventado ' +
        'en la columna de quién hizo un movimiento es peor que un correo',
    c.html('j.castro@oxglass.com').indexOf('Castro<') === -1 &&
    !/mc-who-name/.test(c.html('j.castro@oxglass.com')) &&
    !/mc-who-name/.test(c.html('info@oxglass.com')));

  check('sin correo no se dibuja ancla ninguna, sólo la raya',
    c.html('').indexOf('data-person') === -1 && c.html('').indexOf('—') !== -1);
}

{
  // El nombre sale de una hoja que edita una persona.
  const c = celda({ 'x@y.com': 'Ana "La Jefa" <b>Delgado</b>' });
  const h = c.html('x@y.com');
  check('un nombre con comillas y etiquetas sale escapado, no ejecutado',
    h.indexOf('<b>') === -1 && h.indexOf('&lt;b&gt;') !== -1 && h.indexOf('&quot;') !== -1);
}

{
  const c = celda({ 'jose@oxglass.com': 'Jose Castro' });
  check('_personLabel da el nombre cuando lo hay',
    c.label('JOSE@OxGlass.com') === 'Jose Castro');
  check('...y el correo cuando no', c.label('nadie@ox.com') === 'nadie@ox.com');
}

// ── 3. La ficha, en un navegador ─────────────────────────────────────────────
//
// Aquí no se puede leer el archivo y creerse el resultado: lo que hay que
// comprobar es que la ficha SIGA ABIERTA mientras el ratón viaja del nombre a
// sus botones. Ese hueco de unos píxeles es donde un tooltip normal se cierra,
// y es la razón por la que esto no es un tooltip.
const { chromium } = require('playwright');

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
  // La app real no llega a pintar movimientos sin sesión, así que la celda se
  // pone a mano — PERO CON _userCellHtml, la función del producto, y con el
  // directorio en la variable del producto. Lo único de mentira es el sitio
  // donde cuelga.
  userNames = { 'jose@oxglass.com': 'Jose Castro' };
  var caja = document.createElement('div');
  caja.id = 'probe';
  caja.style.cssText = 'position:fixed;top:200px;left:300px;z-index:99999';
  caja.innerHTML = _userCellHtml('jose@oxglass.com');
  document.body.appendChild(caja);
});
</script>`;

(async () => {
  const f = path.join(os.tmpdir(), 'acopio-user-column.html');
  fs.writeFileSync(f, HTML.replace('</head>', stub + '</head>'));

  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + f);
  await page.waitForTimeout(300);

  console.log('\n═══ la ficha, en un navegador de verdad ═══\n');

  await page.hover('#probe .mc-who');
  // Más que la transición de .13s: a 120ms la opacidad va por 0.9 y la
  // comprobación de "visible" pediría un 1 exacto que todavía no ha llegado.
  await page.waitForTimeout(320);

  let r = await page.evaluate(() => {
    const p = document.getElementById('acPerson');
    if (!p) return null;
    const c = getComputedStyle(p), b = p.getBoundingClientRect();
    return {
      visible: c.opacity === '1' && c.visibility === 'visible',
      padre: p.parentElement.tagName,
      posicion: c.position,
      punteros: c.pointerEvents,
      texto: p.textContent,
      enlaces: Array.from(p.querySelectorAll('a')).map(a => a.getAttribute('href')),
      dentro: b.left >= 0 && b.top >= 0 && b.right <= window.innerWidth && b.bottom <= window.innerHeight
    };
  });

  check('la ficha aparece al pasar el ratón', !!r && r.visible, r);
  check('...colgada del <body>, como #acTip — un transform en cualquier ' +
        'antepasado se lleva a un fixed con él, y es lo que dejaba todas las ' +
        'ayudas 225px más abajo hasta la v11.65',
    r.padre === 'BODY' && r.posicion === 'fixed');
  check('...y SE DEJA PULSAR: un tooltip lleva pointer-events:none y aquí hay ' +
        'botones', r.punteros !== 'none');
  check('trae el nombre y el correo',
    /Jose Castro/.test(r.texto) && /jose@oxglass\.com/.test(r.texto));
  check('...entera dentro de la ventana', r.dentro);

  check('el botón de correo es un mailto de verdad al correo de esa persona',
    r.enlaces.some(h => h.indexOf('mailto:jose@oxglass.com') === 0), r.enlaces);
  check('el de Meet abre una reunión nueva de Google (meet.new) — Google NO ' +
        'publica ninguna dirección que llame a una persona por su correo, así ' +
        'que el botón hace lo que dice y nada más',
    r.enlaces.some(h => /^https:\/\/meet\.new/.test(h)), r.enlaces);
  check('y el de Calendar lleva a esa persona ya invitada, que es lo más ' +
        'parecido a "llamarla" que existe de verdad',
    r.enlaces.some(h => /calendar\.google\.com/.test(h) && /add=jose%40oxglass\.com/.test(h)),
    r.enlaces);
  check('los dos que salen de la app abren en otra pestaña y sin pasarle el ' +
        'documento', await page.evaluate(() => Array.from(
      document.querySelectorAll('#acPerson a[target="_blank"]'))
      .every(a => (a.getAttribute('rel') || '').indexOf('noopener') !== -1)));

  // ── Lo que de verdad hay que medir ──
  const caja = await page.evaluate(() => {
    const b = document.getElementById('acPerson').getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  });
  await page.mouse.move(caja.x, caja.y);
  await page.waitForTimeout(400);       // más que PERSON_GRACE_MS a propósito
  r = await page.evaluate(() => {
    const c = getComputedStyle(document.getElementById('acPerson'));
    return c.opacity === '1' && c.visibility === 'visible';
  });
  check('CON EL RATÓN ENCIMA DE LA FICHA SIGUE ABIERTA. Es la razón entera de ' +
        'que esto no sea un tooltip: si se cerrara al salir del nombre, sus ' +
        'botones no se podrían pulsar nunca', r);

  await page.mouse.move(10, 560);
  await page.waitForTimeout(400);
  r = await page.evaluate(() => {
    const c = getComputedStyle(document.getElementById('acPerson'));
    return c.opacity === '1';
  });
  check('...y se va cuando el ratón se aleja de las dos', r === false);

  // Con el teclado, que es como la usa quien no puede con el ratón.
  await page.evaluate(() => document.querySelector('#probe .mc-who').focus());
  await page.waitForTimeout(150);
  r = await page.evaluate(() => getComputedStyle(document.getElementById('acPerson')).opacity === '1');
  check('el foco del teclado la abre igual', r);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  r = await page.evaluate(() => getComputedStyle(document.getElementById('acPerson')).opacity === '1');
  check('...y Escape la cierra', r === false);

  check('sin errores de página' + (errs.length ? ' — ' + errs.join('; ') : ''), errs.length === 0);

  await browser.close();

  console.log('\n────────────────────────────────────────────────────────────────────────');
  console.log('El nombre NO se guarda dentro del movimiento, a propósito: se');
  console.log('resuelve al dibujar contra userNames. Por eso corregir un nombre');
  console.log('en Manage Users arregla el pasado entero de golpe. Si alguien');
  console.log('añade un día una columna "Nombre" al archivo, esa propiedad se');
  console.log('pierde y las filas viejas se quedan con lo que se escribió el día');
  console.log('que se guardaron.');
  console.log('────────────────────────────────────────────────────────────────────────\n');

  console.log(fail ? `user column: ${fail} FALLO(S), ${ok} ok` : `user column: ok (${ok})`);
  process.exit(fail ? 1 : 0);
})();
