// DE "MARK ARRIVED" A ENTRY, SIN VOLVER A ESCRIBIR NADA.
//
// Jose (v11.29): al marcar una entrega como llegada, la app ya sabe qué es,
// cuánto, de qué proveedor y con qué PO. Volver a teclear todo eso en la
// pantalla de Entry es escribir dos veces lo mismo — y es donde se cuelan las
// diferencias entre lo que se esperaba y lo que quedó registrado.
//
// Dos decisiones de diseño que esta prueba fija, porque las dos se pueden
// deshacer sin querer:
//
//   LA PREGUNTA VA DENTRO DE LA VENTANA, no en un popup después de guardar. Un
//   popup encima de otro popup es el apilamiento que costó la v11.29. Y
//   preguntar antes es mejor que interrumpir después: se decide mirando la
//   entrega, no cuando ya se dio por terminada.
//
//   EL ESTANTE NO SE RELLENA. La app sabe cuánto llegó; no sabe dónde lo
//   pusieron. Un estante de relleno produce inventario que dice estar en un
//   sitio donde nadie miró. Es la única aserción de este archivo que protege
//   un número y no una comodidad.
//
// Uso:  node tools/test-arrived-to-entry.js

const fs = require('fs'), path = require('path'), os = require('os');
const HTML   = path.join(__dirname, '..', 'Index_v3_fixed.html');
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SRC    = fs.readFileSync(HTML, 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

// La regla tal cual está en el archivo. Reescribirla aquí probaría la copia.
function cssRule(selector){
  const i = SRC.indexOf(selector + '{');
  if (i === -1) throw new Error('no encontrada la regla: ' + selector);
  return SRC.slice(i, SRC.indexOf('}', i) + 1);
}

function fnSrc(name){
  const start = SRC.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('no encontrada: ' + name);
  let depth = 0, i = SRC.indexOf('{', start);
  for (let j = i; j < SRC.length; j++) {
    if (SRC[j] === '{') depth++;
    else if (SRC[j] === '}') { depth--; if (depth === 0) return SRC.slice(start, j + 1); }
  }
  throw new Error('sin cerrar: ' + name);
}

// El formulario de ENTRY, reducido a los campos que el prellenado toca. Los
// ids son los reales, tomados del archivo — si alguno se renombra allí, esto
// deja de encontrarlo y la prueba cae, que es lo que debe pasar.
const page = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<select id="incStatus" onchange="_syncEntryOffer()">
  <option value="Pending">Pending</option>
  <option value="Arrived">Arrived</option>
  <option value="Cancelled">Cancelled</option>
</select>
<label id="entryOfferRow" style="display:none">
  <input type="checkbox" id="incMakeEntry" checked>
</label>

<select id="mat-cat-1"><option value=""></option><option value="MIRROR">MIRROR</option></select>
<input id="mat-name-1"><input id="mat-unit-1">
<div id="mat-locs-1"><input class="loc-rack"><input class="loc-qty" type="number"></div>
<input id="mSup"><input id="mPO"><input id="mPM"><input id="mResp">
<div class="deck" id="cornerDeck"></div>
<script>
  window.__opened = [];
  var userName = 'Jose', _CFG_SOLID_MS = 3500;
  var _pendingCfgAdds = [], _sysCards = [];
  var _cfgDeckHtml = '', _sysDeckHtml = '', _cfgDeckTotal = 0, _sysDeckTotal = 0;
  var _todoDeckHtml = '', _todoDeckTotal = 0;

  function _he(s){ return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function nt(s){ return String(s || '').toUpperCase().trim(); }
  function _qtyText(n){ return String(Math.round((Number(n)||0)*1000)/1000); }
  function _fmtWhen(){ return 'just now'; }
  function showTab(t){ window.__opened.push('tab:' + t); }
  // Este doble copia UNA línea del openMoveModal real —el borrado de
  // _entryTodoId— porque sin ella el ciclo de vida no se puede ejercitar. Que
  // el real la tenga se comprueba aparte, leyendo el archivo: ver la aserción
  // "cada apertura del formulario empieza sin tarjeta colgando".
  function openMoveModal(t){ window.__opened.push('move:' + t); _entryTodoId = null; }
  function showToast(m, k){ window.__toast = m; }
  function updateMatLineNameList(){} function syncMatLineQty(){}
  function updateMultiMatTotal(){} function _updateMoveSubmitState(){}
  function _syncCfgBell(){ window.__bell = _pendingCfgAdds.length + _sysCards.length + _todoDeckTotal; }
  function _cfgWake(){} function _cfgScheduleDim(){}
  function _paintDeck(){
    var d = document.getElementById('cornerDeck');
    d.innerHTML = _sysDeckHtml + _cfgDeckHtml + _todoDeckHtml;
  }
${fnSrc('_syncEntryOffer')}
${fnSrc('_entryFromIncoming')}
${fnSrc('_todoLoad')}
${fnSrc('_todoSave')}
${fnSrc('_todoAdd')}
${fnSrc('_todoDrop')}
${fnSrc('_todoDo')}
${fnSrc('_entryTodoResolve')}
${fnSrc('_renderTodoDeck')}
  var _TODO_KEY = 'acopio_pending_entries';
  var _todoItems = [];
  var _entryTodoId = null;
</script></body></html>`;

const ENTREGA = {
  name: 'M-JUNIPERHEIGHTS-B6', category: 'MIRROR', qty: 24, unit: 'UNIT',
  supplier: 'GLASSCO', po: 'PO-8841', pm: 'Dana R', status: 'Arrived'
};

(async () => {
  let chromium;
  try { chromium = require('playwright').chromium; }
  catch (e) { console.error('playwright is not installed — run: npm install playwright'); process.exit(2); }

  const file = path.join(os.tmpdir(), 'acopio-arrived-entry.html');
  fs.writeFileSync(file, page);
  const browser = await chromium.launch({ executablePath: CHROME });
  const p = await browser.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + file);

  // ── 1. La oferta sólo cuando ha llegado ─────────────────────────────────
  console.log('\n═══ la pregunta aparece sólo cuando la entrega llegó ═══\n');
  const vis = () => p.evaluate(() =>
    getComputedStyle(document.getElementById('entryOfferRow')).display);

  check('con estado Pending no se ofrece nada', (await vis()) === 'none');
  await p.selectOption('#incStatus', 'Arrived');
  check('al marcarla Arrived aparece la casilla', (await vis()) === 'flex');
  check('...y viene marcada, porque registrar la entrada es lo que se hace ' +
        'casi siempre',
    await p.evaluate(() => document.getElementById('incMakeEntry').checked));
  await p.selectOption('#incStatus', 'Cancelled');
  check('una entrega cancelada no ofrece registrar su entrada — sería ' +
        'ofrecer inventario que no existe', (await vis()) === 'none');

  // ── 2. Lo que la app ya sabía, puesto ───────────────────────────────────
  console.log('\n═══ el formulario llega relleno ═══\n');
  let r = await p.evaluate((it) => {
    _entryFromIncoming(it);
    const v = id => document.getElementById(id).value;
    return {
      abierto: window.__opened.slice(),
      cat: v('mat-cat-1'), name: v('mat-name-1'), unit: v('mat-unit-1'),
      qty: document.querySelector('#mat-locs-1 .loc-qty').value,
      rack: document.querySelector('#mat-locs-1 .loc-rack').value,
      sup: v('mSup'), po: v('mPO'), pm: v('mPM'), resp: v('mResp'),
      toast: window.__toast
    };
  }, ENTREGA);

  check('se abre la pestaña de movimientos y el formulario en ENTRY (' +
        r.abierto.join(', ') + ')',
    r.abierto.indexOf('tab:movements') !== -1 && r.abierto.indexOf('move:ENTRY') !== -1);
  check('categoría', r.cat === 'MIRROR');
  check('nombre del material', r.name === ENTREGA.name);
  check('unidad', r.unit === 'UNIT');
  check('cantidad', r.qty === '24');
  check('proveedor', r.sup === 'GLASSCO');
  check('número de PO', r.po === 'PO-8841');
  check('jefe de proyecto', r.pm === 'Dana R');
  check('quién lo recibe, con el nombre de quien está usando la app',
    r.resp === 'Jose');

  console.log('\n═══ y el estante NO ═══\n');
  check('el estante queda VACÍO: la app sabe cuánto llegó, no dónde lo ' +
        'pusieron, y un estante de relleno es inventario que dice estar donde ' +
        'nadie miró', r.rack === '');
  check('...y el aviso dice justamente eso, en vez de "listo"',
    /rack/i.test(r.toast || ''));

  // ── 3. El "más tarde" ───────────────────────────────────────────────────
  console.log('\n═══ si dice que más tarde, queda una tarjeta ═══\n');
  r = await p.evaluate((it) => {
    localStorage.removeItem('acopio_pending_entries');
    _todoItems = [];
    _todoAdd(it);
    const card = document.querySelector('.todo-card');
    return {
      hay: !!card,
      texto: card ? card.textContent : '',
      guardado: JSON.parse(localStorage.getItem('acopio_pending_entries') || '[]').length,
      campana: window.__bell
    };
  }, ENTREGA);
  check('aparece una tarjeta en el mazo', r.hay);
  check('...que nombra el material', r.texto.indexOf(ENTREGA.name) !== -1);
  check('...dice cuánto y de quién', /24 UNIT/.test(r.texto) && /GLASSCO/.test(r.texto));
  check('...y ofrece hacerla o dejarla', /Make the entry/.test(r.texto) && /Later/.test(r.texto));
  check('la campana la cuenta — una campana que dice 0 con una tarjeta ' +
        'delante enseña a no creerle', r.campana === 1);

  console.log('\n═══ y sobrevive a una recarga ═══\n');
  check('queda escrita, no sólo dibujada', r.guardado === 1);
  await p.reload();
  r = await p.evaluate(() => {
    _renderTodoDeck();
    return { hay: !!document.querySelector('.todo-card'),
             texto: (document.querySelector('.todo-card') || {}).textContent || '' };
  });
  check('tras recargar la página sigue ahí — un recordatorio que se borra al ' +
        'refrescar no es un recordatorio', r.hay);
  check('...con el mismo material', r.texto.indexOf(ENTREGA.name) !== -1);

  // ── 4. Hacerla desde la tarjeta ─────────────────────────────────────────
  //
  // AQUÍ ESTÁ LA REGLA QUE CAMBIÓ EN LA v11.44, y es al revés de como estaba.
  //
  // Hasta la v11.43 la tarjeta se borraba al ABRIR el formulario. El comentario
  // que defendía esa decisión decía que, si la entrada no se hacía, siempre se
  // podía volver a marcar la entrega — y era verdad, y era caro: obligaba a
  // volver al Incoming, editar la entrega y marcarla otra vez para recuperar un
  // recordatorio que nunca debió perderse.
  //
  // Ahora ABRIR NO CUENTA. La tarjeta es el registro de "llegó y falta su
  // entrada", y sólo la salda la entrada guardada. Es la misma distinción que
  // Jose señaló al ver que marcar una entrega como Arrived con la casilla
  // puesta no dejaba nada: empezar una cosa no es haberla hecho.
  console.log('\n═══ abrir la entrada NO es haberla hecho ═══\n');
  r = await p.evaluate(() => {
    window.__opened = [];
    const id = JSON.parse(localStorage.getItem('acopio_pending_entries'))[0].id;
    _todoDo(id);
    return {
      abierto: window.__opened.slice(),
      name: document.getElementById('mat-name-1').value,
      quedan: JSON.parse(localStorage.getItem('acopio_pending_entries') || '[]').length,
      cardsEnPantalla: document.querySelectorAll('.todo-card').length,
      colgando: _entryTodoId === id
    };
  });
  check('abre el formulario en ENTRY', r.abierto.indexOf('move:ENTRY') !== -1);
  check('...relleno con el material de la tarjeta', r.name === ENTREGA.name);
  check('LA TARJETA SIGUE AHÍ mientras el formulario está abierto — quien lo ' +
        'cierre sin guardar no se queda sin tarjeta y sin entrada, que es lo ' +
        'que pasaba hasta la v11.43', r.quedan === 1 && r.cardsEnPantalla === 1);
  check('...y el formulario sabe de qué tarjeta viene, para poder saldarla',
    r.colgando);

  console.log('\n═══ cerrar sin guardar la deja intacta ═══\n');
  r = await p.evaluate(() => {
    // Cerrar sin guardar no llama a nada: simplemente el éxito nunca ocurre.
    return { quedan: JSON.parse(localStorage.getItem('acopio_pending_entries') || '[]').length,
             enPantalla: document.querySelectorAll('.todo-card').length };
  });
  check('el recordatorio sobrevive al formulario abandonado',
    r.quedan === 1 && r.enPantalla === 1);

  console.log('\n═══ y la entrada guardada sí la salda ═══\n');
  r = await p.evaluate(() => {
    _entryTodoResolve('ENTRY');
    return { quedan: JSON.parse(localStorage.getItem('acopio_pending_entries') || '[]').length,
             enPantalla: document.querySelectorAll('.todo-card').length,
             colgando: _entryTodoId };
  });
  check('con la entrada guardada la tarjeta desaparece de la lista',
    r.quedan === 0);
  check('...y del mazo', r.enPantalla === 0);
  check('...y no queda ningún id colgando para la siguiente vez',
    r.colgando === null);

  console.log('\n═══ una salida no salda una entrada pendiente ═══\n');
  r = await p.evaluate((it) => {
    localStorage.removeItem('acopio_pending_entries');
    _todoItems = [];
    const id = _todoAdd(it, true);
    _entryTodoId = id;
    // Se abrió el formulario desde la tarjeta y quien lo usó cambió el tipo a
    // EXIT antes de guardar. Sacar material no es haber registrado su entrada.
    _entryTodoResolve('EXIT');
    return { quedan: JSON.parse(localStorage.getItem('acopio_pending_entries') || '[]').length,
             colgando: _entryTodoId };
  }, ENTREGA);
  check('guardar un movimiento que NO es ENTRY deja la tarjeta donde estaba',
    r.quedan === 1);
  check('...pero suelta el id igual, para que no salde una entrada de más tarde',
    r.colgando === null);

  console.log('\n═══ el aviso no estorba cuando el formulario viene detrás ═══\n');
  r = await p.evaluate((it) => {
    window.__toast = '';
    _todoAdd(it, true);
    const callado = window.__toast;
    window.__toast = '';
    _todoAdd(it, false);
    return { callado: callado, hablado: window.__toast };
  }, ENTREGA);
  check('con el formulario abriéndose acto seguido no se avisa de nada — el ' +
        'aviso diría "está en la esquina hasta que hagas la entrada" y la ' +
        'entrada está justo delante', r.callado === '');
  check('...y cuando la tarjeta se queda sola, sí se avisa',
    /corner/i.test(r.hablado || ''));

  // Lo que el doble de openMoveModal copia, comprobado sobre el real.
  console.log('\n═══ y sobre el archivo, no sobre el doble ═══\n');
  {
    const real = fnSrc('openMoveModal');
    check('cada apertura del formulario empieza sin tarjeta colgando de la ' +
          'anterior — si no, abrir desde una tarjeta, cerrar, y registrar ' +
          'otra entrada cualquiera borraría la tarjeta equivocada',
      /_entryTodoId\s*=\s*null/.test(real));

    const guardar = fnSrc('saveIncomingItem');
    check('LA TARJETA SE CREA SIEMPRE QUE LA ENTREGA PASA A ARRIVED, marque o ' +
          'no la casilla — el `else if (arrived)` de la v11.42 era el hueco ' +
          'que Jose encontró',
      !/else\s+if\s*\(\s*arrived\s*\)/.test(guardar) &&
      /if\s*\(\s*arrived\s*\)\s*\{/.test(guardar) &&
      /_todoAdd\(\s*payload/.test(guardar));
    check('...y el formulario de entrada se abre además de la tarjeta, no en ' +
          'vez de ella', /_entryFromIncoming\(\s*payload\s*,\s*todoId/.test(guardar));

    const enviar = fnSrc('submitMovement');
    check('y la tarjeta se salda en el handler de ÉXITO del movimiento, que ' +
          'es el único sitio donde consta que la entrada existe',
      /_entryTodoResolve\(/.test(enviar));
  }

  console.log('\n═══ la tarjeta se puede LEER ═══\n');
  {
    // Jose lo fotografió: la tarjeta salía translúcida siempre, con la tabla de
    // debajo leyéndose a través del texto. Le faltaba el fondo — sólo declaraba
    // el borde izquierdo, así que heredaba del montón el de reposo y no lo
    // recuperaba nunca.
    //
    // Esto se mide con la regla REAL sacada del archivo, no con una copia: una
    // copia probaría la copia.
    const reglas = cssRule('    .todo-card') + '\n' +
                   cssRule('    .deck.dim:not(.open) .todo-card');
    const q = await p.evaluate((css) => {
      const st = document.createElement('style');
      st.textContent = ':root{--card:#FFFFFF;--card-ghost:rgba(255,255,255,.52);' +
                       '--text:#1a1a2e;--border:#E5E7EB;--yellow:#D97706;' +
                       '--orange:#EA580C;--orange-bg:#FED7AA}\n' + css;
      document.head.appendChild(st);
      const deck = document.getElementById('cornerDeck');
      const card = document.querySelector('.todo-card') ||
                   (function(){ const d = document.createElement('div');
                     d.className = 'deck-card todo-card'; deck.appendChild(d); return d; })();
      const leer = () => getComputedStyle(card).backgroundColor;
      deck.className = "deck";                       // despierta
      const abierta = leer();
      deck.className = 'deck dim';                   // en reposo, cerrada
      const reposo = leer();
      deck.className = 'deck dim open';              // en reposo pero abierta
      const abiertaDim = leer();
      const cs = getComputedStyle(card);
      return { abierta: abierta, reposo: reposo, abiertaDim: abiertaDim,
               alto: cs.getPropertyValue('--card-h').trim(),
               bordeIzq: cs.borderLeftColor, anchoBordeIzq: cs.borderLeftWidth };
    }, reglas);

    check('en reposo, dentro de la pila, es translúcida — para no competir con ' +
          'la app (' + q.reposo + ')', /rgba\(255, 255, 255, 0\.52\)/.test(q.reposo));
    check('pero al ABRIR la pila es papel blanco, que es lo que se puede leer (' +
          q.abiertaDim + ')', q.abiertaDim === 'rgb(255, 255, 255)');
    check('...y también con la pila despierta', q.abierta === 'rgb(255, 255, 255)');
    check('es el mismo trato que las tarjetas del sistema, no un caso aparte',
      /\.deck\.dim:not\(\.open\) \.sys-card/.test(SRC));

    // Jose (v11.44): "LA TARJETA DEBE SER UN POCO MÁS ALTA, Y TAL VEZ PUEDES
    // HACERLA DE COLOR NARANJA (PERO NO TAN ENCENDIDO)."
    check('es más alta que las 136px que Jose vio quedarse cortas (' + q.alto +
          ')', parseInt(q.alto, 10) >= 150);
    check('la banda de la izquierda es naranja (' + q.bordeIzq + ') — es lo ' +
          'único del montón que espera un movimiento de quien la lee; las del ' +
          'sistema sólo informan',
      q.bordeIzq === 'rgb(234, 88, 12)');
    check('...una banda, no un fondo entero: --orange-bg sobre toda la ' +
          'tarjeta sería más grito del que se pidió, y el texto se lee peor',
      q.anchoBordeIzq === '4px' && q.abiertaDim === 'rgb(255, 255, 255)');
    check('y el naranja sale de --orange, que existe en :root — no de una ' +
          'variable inventada, que el navegador ignoraría en silencio',
      /--orange:#EA580C/.test(SRC) && /border-left:4px solid var\(--orange\)/.test(SRC));
  }

  console.log('\n═══ y si el navegador no deja guardar nada ═══\n');
  r = await p.evaluate(() => {
    // Modo privado, almacenamiento bloqueado: localStorage LANZA. Sin
    // recordatorios es peor que con ellos; sin app es inservible.
    const real = localStorage.getItem;
    localStorage.getItem = function(){ throw new Error('blocked'); };
    let murio = false;
    try { _todoLoad(); _renderTodoDeck(); } catch (e) { murio = true; }
    localStorage.getItem = real;
    return { murio: murio };
  });
  check('un almacenamiento bloqueado no tumba la app, sólo se queda sin ' +
        'recordatorios', r.murio === false);

  check('sin errores de página' + (errs.length ? ' — ' + errs.join('; ') : ''),
    errs.length === 0);

  await browser.close();
  console.log('\n' + '─'.repeat(72));
  console.log('La lista de pendientes vive en localStorage, o sea POR NAVEGADOR:');
  console.log('quien marque la llegada en el teléfono no verá la tarjeta en el');
  console.log('escritorio. Es a sabiendas — deducirla de los datos pide emparejar');
  console.log('entrega con movimiento, y adivinar mal ahí es decirle a alguien');
  console.log('que le falta una entrada que ya hizo. Anotado en el backlog.');
  console.log('─'.repeat(72));
  console.log('\narrived to entry: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
  process.exit(fail === 0 ? 0 : 1);
})();
