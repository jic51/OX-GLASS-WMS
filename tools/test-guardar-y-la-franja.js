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
/* ── DE `min-height` A `height` (v14.8) ───────────────────────────────────
 *
 * `min-height` reservaba el sitio e impedía que la franja se ENCOGIERA, que
 * era el salto de la v13.9. Pero no impedía que CRECIERA, y eso resultó ser un
 * fallo real: dentro de Ajustes hay una regla `.modal input{width:100%}`, así
 * que el recuadro de renombrar se comía la franja entera y los botones bajaban
 * a una segunda línea, encima de la lista. Medido: de 44 px a 95 px.
 *
 * Con `height` y `flex-wrap:nowrap` la franja no puede hacer ninguna de las
 * dos cosas. Quién lo comprueba de verdad es `test-nada-se-mueve.js`, que lo
 * MIDE en un navegador con 0..12 marcados; esto sujeta la regla que lo hace
 * posible. */
check('...con una altura fija, que es lo que impide el salto en los dos sentidos',
  /height:var\(--h-btn-lg\)/.test(css) && !/min-height/.test(css), css);
check('...y sin salto de línea, que es por donde crecía',
  /flex-wrap:nowrap/.test(css));

const cssShow = (HTML.match(/\.cfg-pickbar\.show\{[^}]*\}/) || [''])[0];
check('lo que cambia al marcar es el aspecto, no el sitio',
  /background/.test(cssShow) && !/display/.test(cssShow), cssShow);

/* Y las dos funciones que la pintan: vacía ya NO se vacía, lleva la frase de
 * qué hacer. Un hueco en blanco reservado sería sitio tirado; la instrucción
 * justo encima de las casillas es sitio bien empleado. */
/* ── YA NO HAY QUE CONTARLAS: HAY UNA ──────────────────────────────────────
 *
 * Esta comprobación pedía «tres o más franjas, y todas tratadas igual», y su
 * propio comentario explicaba por qué el número no se escribía a mano: cada
 * pantalla nueva estrenaba la suya.
 *
 * Con P-02 (v14.4) eso dejó de ser verdad en el mejor sentido posible. Las
 * cinco pantallas —Categorías, Projects/Suppliers, Locations, Directory y
 * Materials— pasan por `_barraMarcados`, así que **la franja se dibuja en un
 * solo sitio**. Ya no hay varias que puedan separarse; hay una que o está bien
 * o está mal para todas.
 *
 * Así que lo que se sujeta cambia de forma: que siga habiendo UNA, y que todas
 * las pantallas la usen. */
const dibujos = HTML.match(/bar\.classList\.remove\('show'\);[\s\S]{0,300}?return;/g) || [];
check('la franja se dibuja en UN solo sitio', dibujos.length === 1, dibujos.length);
check('...y vacía conserva su sitio con la instrucción dentro',
  /op\.instruccion/.test(dibujos[0] || '') && !/bar\.innerHTML = '';/.test(dibujos[0] || ''),
  (dibujos[0] || '').slice(0, 200));

/* Y que las cinco pantallas pasen por ella, cada una con su instrucción. Si
 * una se escribiera su propia barra, volvería a haber dos que mantener
 * iguales — que es exactamente lo que P-02 vino a quitar. */
const barras = (HTML.match(/_barraMarcados\(\{/g) || []).length;
check('las cinco listas que se marcan usan esa misma franja', barras >= 5, barras);
const instrucciones = HTML.match(/instruccion: '[^']*/g) || [];
check('...y cada una dice qué hacer, empezando por marcar',
  instrucciones.length >= 5 && instrucciones.every(t => /Tick /.test(t)), instrucciones);

/* Y la instrucción está en UN sitio. Antes la decía también el párrafo de
 * arriba; dos frases sobre lo mismo son dos que alguien tiene que mantener
 * iguales. */
check('la instrucción de fusionar ya no se repite en el párrafo de arriba',
  HTML.indexOf('Tick two or more to merge them by hand.') === -1);

console.log('\n═══ UNA VENTANA QUE SE ABRE ESTÁ RECIÉN ABIERTA ═══\n');

/* Jose, 5/11, con captura de «Add Expected Material»: *"se quedó el botón
 * cargando y no responde; puedo cerrar la ventana y volver y aparece igual."*
 *
 * Esa última frase es el hallazgo. Que un guardado falle y deje el botón
 * girando es un fallo; que **cerrar y volver a abrir no lo arregle** es otro, y
 * peor: quita la salida que cualquiera prueba primero. */
const vig = fnSrc(HTML, '_vigilarVentanasQueSeAbren');
check('hay una regla para eso, y está escrita una sola vez', vig.length > 100);
check('mira cuándo a una ventana se le enciende la clase que la muestra',
  /attributeFilter: \['class'\]/.test(vig) && /contains\('show'\)/.test(vig));
check('...y devuelve a su sitio los botones que quedaron ocupados',
  /is-busy/.test(vig) && /_btnReset/.test(vig));
check('...en TODAS las ventanas, no en una', /querySelectorAll\('\.overlay'\)/.test(vig));
check('y está enchufada al arranque', /_vigilarVentanasQueSeAbren\(\);/.test(HTML));

/* POR QUÉ UN OBSERVADOR Y NO UNA LÍNEA EN CADA SITIO: hay más de treinta
 * lugares que abren una ventana. El reinicio repetido en cada uno sería
 * treinta copias de la misma idea, y la ventana treinta y uno no tendría
 * ninguna. Esto fija que no se haya hecho así. */
const aperturas = (HTML.match(/classList\.add\('show'\)/g) || []).length;
check('hay muchas formas de abrir una ventana (' + aperturas + ')', aperturas > 20);
check('...y NINGUNA reinicia el botón por su cuenta',
  !/classList\.add\('show'\);[\s\S]{0,120}_btnReset/.test(HTML));

/* Y que no se rompa en un navegador sin MutationObserver: se queda sin hacer
 * nada en vez de reventar el arranque entero. */
check('si el navegador no lo soporta, no revienta nada',
  /typeof MutationObserver !== 'function'/.test(vig));

console.log('\n═══ ...Y «ABRIRSE» ES ABRIRSE, NO «ESTAR ABIERTA» ═══\n');

/* ── LO QUE ROMPÍ YO, Y POR QUÉ ESTO SE EJECUTA ──────────────────────────────
 *
 * El observador de arriba lo añadí el 7/11 y al día siguiente Jose mandó un
 * vídeo: *"ahora los botones de 'save changes' no se desactivan ni cambian,
 * sólo se quedan ahí."*
 *
 * La cadena:
 *   1 · se pulsa Guardar → `_btnBusy` pone la rueda y apaga el botón
 *   2 · `_setModalBusy` hace `ov.classList.toggle('busy', true)`
 *   3 · eso es un cambio de clase en la ventana → saltaba el observador
 *   4 · la ventana seguía teniendo `show`, así que daba por hecho que acababa
 *       de abrirse y devolvía a su sitio el botón que acababa de empezar
 *
 * Es el fallo de siempre con otra cara: **una señal que vale para dos cosas
 * distintas**. «Tiene `show`» no distingue «se acaba de abrir» de «sigue
 * abierta y ha cambiado otra clase».
 *
 * Y las comprobaciones de arriba, todas de texto, pasaban con el fallo dentro.
 * Así que ésta EJECUTA el observador: se le da el registro que manda el
 * navegador en cada uno de los dos casos, y se mira a quién toca. */

{
  let capturada = null;
  let devoluciones = [];
  const observado = [];

  function btnFalso(id) {
    const clases = new Set(['btn', 'is-busy']);
    return { id: id, classList: { contains: c => clases.has(c) } };
  }

  function ventanaFalsa(id, clases) {
    const set = new Set(clases);
    const botones = [];
    return {
      id: id, botones: botones,
      classList: { contains: c => set.has(c) },
      querySelectorAll: () => botones
    };
  }

  function MutationObserverFalso(cb) { capturada = cb; }
  MutationObserverFalso.prototype.observe = function (el, opts) {
    observado.push({ el: el, opts: opts });
  };

  const ov = ventanaFalsa('moveOverlay', ['overlay', 'show']);
  ov.botones.push(btnFalso('btnMoveSave'));

  const ctx = {
    MutationObserver: MutationObserverFalso,
    document: { querySelectorAll: () => [ov] },
    _btnReset: function (b) { devoluciones.push(b.id); }
  };
  const F = A.montar(ctx, HTML, ['_vigilarVentanasQueSeAbren'], { dobles: ['_btnReset'] });

  F._vigilarVentanasQueSeAbren();

  check('se pone a mirar la ventana', observado.length === 1, observado.length);
  check('...y pide además el valor ANTERIOR de la clase, que es lo único que ' +
        'distingue abrirse de estar abierta',
    !!observado[0] && observado[0].opts.attributeOldValue === true,
    observado[0] && observado[0].opts);
  check('y se pudo capturar el observador para ejecutarlo de verdad',
    typeof capturada === 'function');

  /* CASO 1 · LA VENTANA SE ABRE DE VERDAD: antes no tenía `show`, ahora sí.
   * Aquí el botón colgado del intento anterior tiene que volver a su sitio —
   * es lo que Jose pidió el 5/11, y no se puede perder al arreglar lo otro. */
  devoluciones = [];
  capturada([{ target: ov, oldValue: 'overlay' }]);
  check('al abrirse de verdad, el botón colgado vuelve a su sitio',
    devoluciones.join(',') === 'btnMoveSave', devoluciones);

  /* CASO 2 · EL FALLO. La ventana ya estaba abierta y lo que cambió fue
   * `busy`, que es exactamente lo que hace `_setModalBusy` al pulsar Guardar.
   * No se toca nada. */
  devoluciones = [];
  capturada([{ target: ov, oldValue: 'overlay show' }]);
  check('pulsar Guardar en una ventana YA abierta no toca el botón',
    devoluciones.length === 0, devoluciones);

  /* Y con `busy` ya puesto, que es el registro que llega al soltarlo. */
  devoluciones = [];
  capturada([{ target: ov, oldValue: 'overlay show busy' }]);
  check('...ni al terminar de guardar', devoluciones.length === 0, devoluciones);

  /* Que no sea una coincidencia de `indexOf`: una clase que CONTIENE «show»
   * sin serla no cuenta como que la ventana ya estaba abierta. */
  devoluciones = [];
  capturada([{ target: ov, oldValue: 'overlay showcase' }]);
  check('y «showcase» no se confunde con «show»',
    devoluciones.join(',') === 'btnMoveSave', devoluciones);

  /* Una ventana cerrada no es asunto de esto, cambie lo que cambie. */
  const cerrada = ventanaFalsa('attachOverlay', ['overlay']);
  cerrada.botones.push(btnFalso('btnAttachSave'));
  devoluciones = [];
  capturada([{ target: cerrada, oldValue: 'overlay busy' }]);
  check('una ventana cerrada no se toca', devoluciones.length === 0, devoluciones);
}

/* ── Y LAS VENTANAS A LAS QUE ESTO LES PASABA ───────────────────────────────
 * `_setModalBusy` es quien enciende y apaga `busy`. Mientras exista, el
 * observador tiene que seguir distinguiendo, así que esta prueba deja escrito
 * que la una y el otro conviven a propósito — y cuántos sitios estaban rotos. */
check('`_setModalBusy` sigue cambiando una clase de la ventana',
  /classList\.toggle\('busy'/.test(HTML));
const usosBusy = (HTML.match(/_setModalBusy\(/g) || []).length;
check('...y se usa en muchos sitios (' + usosBusy + '), que son los que ' +
      'estaban rotos', usosBusy > 10);

if (fallos.length) {
  console.error('\nFALLÓ:\n  ' + fallos.join('\n  ') + '\n');
  console.error('  Un botón encendido es una promesa; encendido siempre, no dice\n' +
                '  nada. Y una franja que aparece empuja justo la lista que\n' +
                '  estabas marcando.\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
