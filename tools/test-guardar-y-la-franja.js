// P-01 · GUARDAR SE ENCIENDE CUANDO HAY ALGO QUE GUARDAR
// P-03 · LA FRANJA RESERVA SU SITIO EN VEZ DE ROBARLO
//
// Jose repasó Ajustes pantalla por pantalla el 4/11 y encontró lo mismo en
// seis sitios: botones de guardar encendidos siempre. Y en dos sitios más, la
// franja de acciones empujando la lista hacia abajo al aparecer.
//
// ── POR QUÉ SON PRUEBAS Y NO UNA REVISIÓN A OJO ────────────────────────────
//
// Las dos son **reglas que se olvidan al escribir la pantalla siguiente**. No
// se rompen por un cambio malo: se rompen porque alguien añade un formulario
// nuevo y no se acuerda. Un barrido estático es lo único que pilla eso.
//
// Uso:  node tools/test-guardar-y-la-franja.js

const fs   = require('fs');
const path = require('path');
const A    = require('./andamio.js');

const RAIZ = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(RAIZ, 'Index_v3_fixed.html'), 'utf8');

let ok = 0;
const fallos = [];
function check(etiqueta, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + etiqueta); return; }
  fallos.push(etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
  console.log('  ✗    ' + etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
}

function fnSrc(src, nombre) {
  const ini = src.indexOf('function ' + nombre + '(');
  if (ini === -1) throw new Error('no encontrada: ' + nombre);
  let prof = 0;
  for (let j = src.indexOf('{', ini); j < src.length; j++) {
    if (src[j] === '{') prof++;
    else if (src[j] === '}') { prof--; if (prof === 0) return src.slice(ini, j + 1); }
  }
  throw new Error('sin cerrar: ' + nombre);
}

console.log('\n═══ P-01 · EL GUARDIA, EJECUTADO ═══\n');

/* Un `<input>` de mentira con lo justo: valor, tipo y los oyentes. */
function campo(valor, tipo) {
  const el = {
    value: valor, type: tipo || 'text', checked: valor === true,
    _oyentes: [],
    addEventListener(ev, fn) { this._oyentes.push(fn); },
    escribir(v) { this.value = v; this._oyentes.forEach(f => f()); },
    marcar(v)   { this.checked = v; this._oyentes.forEach(f => f()); }
  };
  return el;
}

const V = A.montar({}, HTML, ['_vigilarGuardar']);
const vigilar = V._vigilarGuardar;

{
  const boton = { disabled: false, title: '' };
  const nombre = campo('OX GLASS');
  const dominio = campo('');
  const v = vigilar({ boton: boton, campos: [nombre, dominio], obligatorios: [nombre] });

  check('nada más abrir, Guardar está apagado', boton.disabled === true);
  check('...y dice por qué, en vez de parecer roto',
    /Nothing has changed/.test(boton.title), boton.title);

  dominio.escribir('oxglass.com');
  check('al escribir algo distinto, se enciende', boton.disabled === false);
  check('...y se queda sin excusa en el title', boton.title === '');

  dominio.escribir('');
  check('al deshacer el cambio a mano, vuelve a apagarse', boton.disabled === true);

  dominio.escribir('oxglass.com');
  v.guardado();
  check('después de guardar, se apaga solo — lo que Jose vio quedarse encendido',
    boton.disabled === true);
  check('...y lo guardado pasa a ser el punto de partida: deshacerlo lo enciende otra vez',
    (dominio.escribir(''), boton.disabled === false));
}

console.log('\n  — lo obligatorio manda sobre todo lo demás —\n');

/* ESTA ES LA PARTE QUE NO ES ESTÉTICA. Jose: *"siempre se puede eliminar el
 * nombre del rol y también guardar… eso es peligroso."* Un rol sin nombre no
 * se le puede dar ni quitar a nadie desde ninguna lista, y el permiso sigue
 * concediendo lo que concedía. */
{
  const boton = { disabled: false, title: '' };
  const rol = campo('SUPERVISOR');
  vigilar({ boton: boton, campos: [rol], obligatorios: [rol] });

  rol.escribir('');
  check('con el campo obligatorio vacío, Guardar NO se enciende aunque haya cambiado',
    boton.disabled === true);
  check('...y el motivo que da es el correcto, no «no ha cambiado nada»',
    /Fill in what is required/.test(boton.title), boton.title);

  rol.escribir('   ');
  check('ni con espacios, que es vacío con otro nombre', boton.disabled === true);

  rol.escribir('JEFE DE BODEGA');
  check('con un nombre de verdad, sí', boton.disabled === false);
}

console.log('\n  — lo que no vive en un campo —\n');

/* El logo no tiene `value`. Si su punto de partida se dedujera de la pantalla,
 * elegir una imagen (que repinta la pestaña entera) dejaría el botón apagado
 * justo sobre el cambio recién hecho. */
{
  const boton = { disabled: false, title: '' };
  const nombre = campo('OX GLASS');
  let logo = 'nueva';     // como si se acabara de elegir una imagen
  vigilar({ boton: boton, campos: [nombre], obligatorios: [nombre],
            extra: function(){ return logo; }, baseExtra: 'igual' });
  check('una imagen recién elegida cuenta como cambio aunque ningún campo cambie',
    boton.disabled === false);

  const boton2 = { disabled: false, title: '' };
  logo = 'igual';
  vigilar({ boton: boton2, campos: [campo('OX GLASS')], extra: function(){ return logo; },
            baseExtra: 'igual' });
  check('...y sin tocar nada, sigue apagado', boton2.disabled === true);
}

console.log('\n  — y está puesto donde Jose lo pidió —\n');

[['Name & Logo', 'coSave'],
 ['Permissions', 'btnSaveRoleLabel'],
 ['Daily movement report', 'btnDrSave']].forEach(function (par) {
  const i = HTML.indexOf("boton:        document.getElementById('" + par[1] + "')");
  const j = HTML.indexOf("boton:  document.getElementById('" + par[1] + "')");
  check(par[0] + ': su Guardar pasa por el guardia', i !== -1 || j !== -1);
});

/* «Send one now» se QUEDA encendido, y es correcto. Jose: *"creo que el único
 * debería ser el de send one now"*. Hacen cosas de clase distinta: uno recuerda
 * una decisión —sólo tiene sentido si cambió— y el otro hace algo ahora, que se
 * puede querer repetir. */
check('«Send one now» NO pasa por el guardia, a propósito',
  HTML.indexOf("boton:  document.getElementById('btnDrTest')") === -1 &&
  HTML.indexOf("boton:        document.getElementById('btnDrTest')") === -1);

console.log('\n  — el no, dos veces: la pantalla y la función —\n');

/* Un guardia que sólo vive en el botón es un guardia que se salta quien no
 * pase por el botón. `_saveWarehouseRoleLabel` es pública y la llama un
 * `onclick`. */
const guardaRol = fnSrc(HTML, '_saveWarehouseRoleLabel');
check('guardar el rol se niega también desde dentro si el nombre está vacío',
  /if \(!label\)/.test(guardaRol), guardaRol.slice(0, 400));
check('...y lo dice con palabras, no con un error del servidor',
  /The role needs a name/.test(guardaRol));

console.log('\n  — precios: una fila cada vez —\n');

const cambio = fnSrc(HTML, '_precioCambio');
check('el Guardar de una fila se enciende por SU propia casilla',
  /data-base/.test(cambio) && /btn\.disabled/.test(cambio));
check('...y no se enciende si el precio es el que ya había',
  /String\(v\) === String\(parseFloat\(base\)\)/.test(cambio));
check('...ni con un 0, que el motor trata como «sin precio»',
  /v > 0/.test(cambio));
check('la fila nace con el botón apagado', /'<button class="cfg-btn" onclick="_guardarPrecio\(this\)" disabled /.test(HTML));

console.log('\n═══ P-03 · LA FRANJA NO EMPUJA LA LISTA ═══\n');

const css = (HTML.match(/\.cfg-pickbar\{[^}]*\}/) || [''])[0];
check('la franja está SIEMPRE en el reparto', /display:flex/.test(css), css);
check('...y ya no aparece de la nada', !/display:none/.test(css));
check('...con una altura reservada, que es lo que impide el salto',
  /min-height:var\(--h-btn-lg\)/.test(css));

const cssShow = (HTML.match(/\.cfg-pickbar\.show\{[^}]*\}/) || [''])[0];
check('lo que cambia al marcar es el aspecto, no el sitio',
  /background/.test(cssShow) && !/display/.test(cssShow), cssShow);

/* Y las dos funciones que la pintan: vacía ya NO se vacía, lleva la frase de
 * qué hacer. Un hueco en blanco reservado sería sitio tirado; la instrucción
 * justo encima de las casillas es sitio bien empleado. */
const dibujos = HTML.match(/bar\.classList\.remove\('show'\);[\s\S]{0,260}?return;/g) || [];
check('hay dos franjas y las dos se tratan igual', dibujos.length === 2, dibujos.length);
dibujos.forEach(function (d, i) {
  check('franja ' + (i + 1) + ': vacía conserva su sitio y dice qué hacer',
    /Tick /.test(d) && !/bar\.innerHTML = '';/.test(d), d.slice(0, 160));
});

/* Y la instrucción está en UN sitio. Antes la decía también el párrafo de
 * arriba; dos frases sobre lo mismo son dos que alguien tiene que mantener
 * iguales. */
check('la instrucción de fusionar ya no se repite en el párrafo de arriba',
  HTML.indexOf('Tick two or more to merge them by hand.') === -1);

if (fallos.length) {
  console.error('\nFALLÓ:\n  ' + fallos.join('\n  ') + '\n');
  console.error('  Un botón encendido es una promesa; encendido siempre, no dice\n' +
                '  nada. Y una franja que aparece empuja justo la lista que\n' +
                '  estabas marcando.\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
