// DENTRO DE LA BODEGA Y FUERA SON DOS COSAS DISTINTAS.
//
// Jose, 23/10, con una captura del formulario de devolución, y es el hallazgo
// de concepto más importante de la semana:
//
//   *"está mezclando dos categorías de locación distintas, y eso es un problema
//   que no habíamos tratado: locaciones DENTRO de la bodega y FUERA. Cuando los
//   materiales están en job-site están fuera de la bodega, no dentro. No debe
//   sugerir ingresar ese nombre como una locación dentro de la bodega."*
//
// En su pantalla, el campo de «de dónde vuelve» llevaba una OBRA
// —`GHH SCENIC MOUNTAIN 4PLEX PHASE2`— y debajo salía:
//
//     📍 GHH SCENIC MOUNTAIN 4PLEX PHASE2 is not a location in your warehouse yet.
//     [+ Create GHH SCENIC MOUNTAIN 4PLEX PHASE2]
//
// Pulsarlo le añade al mapa de su almacén un estante que no existe.
//
// ── LA CAUSA: UN ELEMENTO CON DOS SIGNIFICADOS ─────────────────────────────
//
// `#mSrc` es «Source Rack» en una entrada, una salida y un traslado —un sitio
// DE DENTRO— y pasa a ser «de qué obra vuelve» en una devolución —un sitio DE
// FUERA—. Lo único que cambiaba al cambiar de pestaña era la etiqueta; su
// `list` seguía siendo la de estantes, así que todo lo que pregunta «¿es esto
// un campo de ubicación?» contestaba que sí.
//
// ── Y LA SEGUNDA MITAD: LA MISMA PREGUNTA, DOS VECES ───────────────────────
//
// Jose, dos veces (22 y 23/10): *"¿por qué hay un FROM y un CAME BACK FROM?
// Esas son la misma pregunta que espera dos datos diferentes, ya que la una
// muestra una lista diferente a la otra… Sólo debe haber UNA lista de lugares
// fuera de la bodega donde se envió ese material."*
//
// Su captura lo prueba: los dos campos con EL MISMO TEXTO escrito, y cada uno
// ofreciendo una cosa distinta — uno «crea esto como estantería» y el otro
// «añade esta obra a tu lista».
//
// Uso:  NODE_PATH="$(npm root -g)" node tools/test-dentro-y-fuera.js

const path = require('path');
const A    = require(path.join(__dirname, 'andamio.js'));

const HTML = A.fuente('html');
const GS   = A.fuente('gs');
const html = A.sinComentarios(HTML);
const gs   = A.sinComentarios(GS);

let ok = 0; const fails = [];
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + label); }
  else { fails.push(label + (extra === undefined ? '' : ' → ' + JSON.stringify(extra)));
         console.log('  FALLA ' + label + (extra === undefined ? '' : '  → ' + JSON.stringify(extra))); }
}

/* ────────────────────────────────────────────────────────────────────────────
 * 1. UN CAMPO PUEDE DECIR QUE LO SUYO ES DE FUERA — ejecutado.
 * ──────────────────────────────────────────────────────────────────────────── */
console.log('\n═══ 1. El aviso de «no existe» no toca un sitio de fuera ═══\n');

const ctx = A.montar({ console: console }, HTML,
  ['_esSitioDeFuera', '_esCampoDeUbicacion'], {});

function campo(attrs) {
  const a = Object.assign({ tagName: 'INPUT', id: '', className: '' }, attrs || {});
  return {
    tagName: a.tagName,
    id: a.id,
    classList: { contains: function (c) { return (a.className || '').split(' ').indexOf(c) !== -1; } },
    getAttribute: function (n) { return a[n] === undefined ? null : a[n]; }
  };
}

check('se pudo montar', !!ctx._esCampoDeUbicacion);

const estante = campo({ id: 'mSrc', list: 'rackList' });
check('un estante SIGUE siendo un campo de ubicación — el aviso de «no existe ' +
      'en tu almacén» es correcto y útil ahí',
  ctx._esCampoDeUbicacion(estante) === true);

const obra = campo({ id: 'mSrc', list: 'fueraSitioList', 'data-fuera': '1' });
check('el MISMO elemento, marcado como sitio de fuera, ya NO lo es — es el ' +
      'fallo exacto: a Jose le ofrecían crear una obra como si fuera una ' +
      'estantería',
  ctx._esCampoDeUbicacion(obra) === false);
check('...y la marca se lee del propio elemento, no de una variable global: se ' +
      've inspeccionando la página y no hay que saber en qué pestaña estamos',
  ctx._esSitioDeFuera(obra) === true && ctx._esSitioDeFuera(estante) === false);

const destino = campo({ id: 'mDest', list: 'rackListDest' });
check('el estante de DESTINO de una devolución sigue avisando — ése sí es un ' +
      'sitio de dentro, y ahí el aviso hace falta',
  ctx._esCampoDeUbicacion(destino) === true);

/* ────────────────────────────────────────────────────────────────────────────
 * 2. LA MARCA Y LA LISTA VAN JUNTAS.
 * ──────────────────────────────────────────────────────────────────────────── */
console.log('\n═══ 2. Marcar y cambiar de lista es una sola cosa ═══\n');

const marcar = A.sinComentarios(A.fnSrc(HTML, '_marcarSitioDeFuera') || '');
check('`_marcarSitioDeFuera` existe', !!marcar);
check('poner la marca cambia TAMBIÉN la lista que se ofrece — un campo que ' +
      'dice «soy de fuera» y sigue ofreciendo estantes es la misma ' +
      'contradicción con otra cara',
  /data-fuera['"], '1'\)/.test(marcar) && /fueraSitioList/.test(marcar));
check('...y quitarla devuelve la lista de estantes',
  /removeAttribute\('data-fuera'\)/.test(marcar) && /'rackList'/.test(marcar));
check('...y borra un aviso que se hubiera quedado pegado al cambiar de pestaña',
  /_quitarAvisoUbic/.test(marcar));

const tipo = A.sinComentarios(A.fnSrc(HTML, 'setMoveType') || A.sinComentarios(HTML));
check('la DEVOLUCIÓN marca el campo como de fuera',
  /RETURN[\s\S]{0,900}_marcarSitioDeFuera\(document\.getElementById\('mSrc'\), true\)/.test(tipo));
check('...y el traslado lo devuelve a estante',
  /_marcarSitioDeFuera\(document\.getElementById\('mSrc'\), false\)/.test(tipo));

/* ────────────────────────────────────────────────────────────────────────────
 * 3. LA LISTA DE FUERA NO LLEVA ESTANTES — ejecutado.
 * ──────────────────────────────────────────────────────────────────────────── */
console.log('\n═══ 3. La lista de sitios de fuera ═══\n');

/* Se saca el trozo de `refreshDropdowns` que la construye y se corre contra
 * unos movimientos de mentira. Leerlo diría que filtra; sólo correrlo dice si
 * un estante que aparece como destino de una salida se cuela. */
let fueraCtx = null, opciones = null;
try {
  const opts = [];
  const doc = {
    getElementById: function (id) {
      if (id !== 'fueraSitioList') return null;
      return { innerHTML: '', appendChild: function (o) { opts.push(o.value); } };
    },
    createElement: function () { return { value: '' }; }
  };
  /* EL TROZO SE SACA DEL ARCHIVO, no se copia aquí. `levantarPara` trae las
   * FUNCIONES que un fragmento necesita, no el fragmento; esto es al revés —
   * lo que hace falta es el código mismo, porque es el que hay que correr. */
  const limpio = A.sinComentarios(HTML);
  const ini = limpio.indexOf("var fd = document.getElementById('fueraSitioList');");
  if (ini < 0) throw new Error('no se encontró el constructor de la lista');
  const fin = limpio.indexOf("var sd = document.getElementById('supplierList')", ini);
  const trozo = limpio.slice(ini, fin);
  const vm = require('vm');
  const c = vm.createContext({
    document: doc, console: console,
    config: {
      locations: [{ name: 'A1A' }, { name: 'YARD' }],
      projects: ['ASPEN HOLLOW', 'YARD']          // «YARD» también es estante: gana dentro
    },
    movements: [
      { moveType: 'EXIT',     destLoc: 'GHH SCENIC MOUNTAIN 4PLEX PHASE2', sourceLoc: 'A1A' },
      { moveType: 'EXIT',     destLoc: 'YARD',       sourceLoc: 'A1A' },   // estante: no cuenta
      { moveType: 'RETURN',   sourceLoc: 'BIRCH POINT DUPLEX', destLoc: 'A1A' },
      { moveType: 'TRANSFER', sourceLoc: 'A1A', destLoc: 'YARD' },         // los dos de dentro
      { moveType: 'ENTRY',    destLoc: 'A1A' }
    ]
  });
  vm.runInContext(trozo, c);
  opciones = opts.slice().sort();
} catch (e) {
  check('se pudo correr el constructor de la lista', false, e.message);
}

if (opciones) {
  check('se pudo correr el constructor de la lista', true);
  check('la obra a la que salió material está en la lista',
    opciones.indexOf('GHH SCENIC MOUNTAIN 4PLEX PHASE2') !== -1, opciones);
  check('...y el sitio del que se devolvió también',
    opciones.indexOf('BIRCH POINT DUPLEX') !== -1, opciones);
  check('...y las obras dadas de alta, aunque todavía no haya salido nada: se ' +
        'puede devolver de una obra recién creada',
    opciones.indexOf('ASPEN HOLLOW') !== -1, opciones);
  check('UN ESTANTE NO ENTRA, aunque aparezca como destino de una salida — si ' +
        'está en Settings → Locations es de dentro, pase lo que pase en los ' +
        'movimientos',
    opciones.indexOf('YARD') === -1, opciones);
  check('...ni los estantes normales',
    opciones.indexOf('A1A') === -1, opciones);
}

/* ────────────────────────────────────────────────────────────────────────────
 * 4. UNA SOLA PREGUNTA, Y LA OBRA SE DEDUCE.
 * ──────────────────────────────────────────────────────────────────────────── */
console.log('\n═══ 4. «From» y «Came back from» eran la misma pregunta ═══\n');

check('la devolución ya no enseña el segundo campo — era la misma pregunta con ' +
      'otra lista, y en la captura de Jose los dos llevaban el mismo texto',
  /RETURN[\s\S]{0,1200}_origProjMostrar\(false\)/.test(tipo));
check('...y el que queda lo dice en su etiqueta',
  /Came back from \(site or project\)/.test(html));

const ded = A.sinComentarios(A.fnSrc(HTML, '_origProjDeducido') || '');
check('`_origProjDeducido` existe — la columna de la obra no desaparece, se ' +
      'deduce: es la que sostiene el boneyard que Jose pidió el 15/10',
  !!ded);
check('si lo contestado es una obra conocida, se guarda también como obra',
  /config\.projects/.test(ded));
check('...con el nombre TAL COMO ESTÁ EN LA LISTA, no como se tecleó — escribir ' +
      'la versión tecleada sembraría los duplicados que la v12.93 limpió',
  /return obras\[i\]/.test(ded));
check('...y si es una dirección suelta, la columna queda vacía, que es la ' +
      'verdad: no vino de una obra registrada',
  /return '';/.test(ded));
check('en la SALIDA manda el campo, porque ahí son dos preguntas de verdad',
  /wrap\.style\.display !== 'none'\) return campo\.value/.test(ded));
check('y el guardado usa lo deducido, no el campo escondido',
  /originProject:\s*_origProjDeducido\(\)/.test(html));

const aplicar = A.sinComentarios(A.fnSrc(HTML, '_fueraAplicar') || '');
check('elegir de la lista flotante rellena UN campo, no dos que puedan ' +
      'contradecirse',
  /ponTexto\('mSrc', f\.site\)/.test(aplicar) && !/mOrigProj/.test(aplicar));

/* ────────────────────────────────────────────────────────────────────────────
 * 5. EL SERVIDOR YA TENÍA EL MODELO BIEN, Y SIGUE TENIÉNDOLO.
 * ──────────────────────────────────────────────────────────────────────────── */
console.log('\n═══ 5. El servidor nunca creó una obra como estante ═══\n');

const llegada = A.sinComentarios(A.fnSrc(GS, 'ubicacionDeLlegada_') || '');
check('una DEVOLUCIÓN sólo obliga a que exista el estante de DESTINO — su ' +
      'origen es de fuera y el servidor nunca lo trató como ubicación',
  /RETURN'\)\s*return dest/.test(llegada), llegada);
check('...y una SALIDA no obliga a nada: su destino es una obra',
  /EXIT'\)\s*return ''/.test(llegada) || /return '';/.test(llegada));

/* ────────────────────────────────────────────────────────────────────────────
 * 6. ESPERAR TURNO NO ES UNA AVERÍA.
 * ──────────────────────────────────────────────────────────────────────────── */
console.log('\n═══ 6. «System busy» deja de ser un error de sistema ═══\n');

/* En el registro de errores de Jose, 23/10, había SEIS de estos seguidos en un
 * minuto, todos en rojo:
 *
 *   ERROR  backend/mergeConfigValues
 *   SYSTEM_BUSY|System busy — someone else is saving right now.
 *
 * Eso no es la app rompiéndose: es la app esperando turno. Y desde que ERROR
 * avisa por correo, era un correo al admin cada vez que dos personas guardaban
 * a la vez. */
const ctxSev = A.montar({ console: console }, GS, ['classifyErrorSeverity_'], {});
/* Las dos listas de patrones son CONSTANTES, no funciones, así que el andamio
 * no las arrastra solo. Se leen del archivo y no se copian aquí: una copia se
 * quedaría vieja el día que alguien añada un patrón, y la prueba seguiría
 * verde midiendo una lista que ya no es la del producto. */
require('vm').runInContext(
  A.constantes(GS, ['_KNOWN_VALIDATION_PREFIXES', 'VALIDATION_MESSAGE_PATTERNS']), ctxSev);
check('se pudo montar el clasificador', !!ctxSev.classifyErrorSeverity_);
check('«esperando turno» se guarda como WARN, no como ERROR — llenaba de rojo ' +
      'el sitio donde se buscan los fallos de verdad, y mandaba un correo al ' +
      'admin cada vez que dos personas guardaban a la vez',
  ctxSev.classifyErrorSeverity_(
    'SYSTEM_BUSY|System busy — someone else is saving right now.') === 'WARN');
check('...pero sigue registrándose: saber cuántas veces se pisan dos personas ' +
      'es un dato útil',
  /'SYSTEM_BUSY'/.test(gs));
check('y un fallo de verdad sigue siendo ERROR',
  ctxSev.classifyErrorSeverity_('Cannot read properties of undefined') === 'ERROR');

if (fails.length) {
  console.error('\nFALLÓ:\n  ' + fails.join('\n  ') + '\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
