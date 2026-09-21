// LAS TRES COSAS DEL INCOMING, EN EL ORDEN EN QUE DEPENDEN UNA DE OTRA.
//
// Jose pidió tres, y el orden no es de gusto: las dos últimas no pueden
// funcionar sin la primera.
//
//   1. NORMALIZAR LOS NOMBRES. *"En el incoming no se regularizan los nombres
//      como en un entry; en el entry, al escribir un nombre, éste se hace todo
//      mayúscula."* Un movimiento guardaba `cleanDisplay_(d.name)` y una
//      entrega esperada `String(data.name||'').trim()`.
//   2. UN BUSCADOR. Era la única lista grande de la app sin uno.
//   3. EL AVISO DE DUPLICADO, con la regla que dio él mismo: el PO es la
//      identidad, y sin PO valen nombre + proveedor + fecha cercana.
//
// POR QUÉ LA 1 VA PRIMERA, y es lo que este fichero deja clavado: el aviso
// compara por nombre. Mientras una entrega pudiera guardarse "Yogu Yogu" y otra
// "YOGU YOGU", el aviso NO SALTARÍA NUNCA en el caso que lo justifica. Un
// guardia que sólo funciona cuando el dato ya está limpio no es un guardia.
//
// POR QUÉ EN NAVEGADOR Y NO EN vm. Las tres viven en el DOM: el buscador filtra
// una tabla, el aviso abre una ventana encima de otra, y "es la misma" tiene
// que CERRAR un formulario y ABRIR otro con la entrega que ya existía. Leer el
// código no dice si eso ocurre; pulsar los botones sí.
//
// Uso:  CHROME_PATH=/opt/pw-browsers/chromium-*/chrome-linux/chrome \
//       node tools/test-incoming-duplicado.js

const fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');
const GS   = fs.readFileSync(path.join(ROOT, 'Code_v3_fixed.gs'), 'utf8');
const A    = require('./andamio.js');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

/* LAS FECHAS SE CUENTAN DESDE HOY, NO SE ESCRIBEN.
 *
 * Una entrega con fecha fija es "Expected" hoy y "Overdue" el mes que viene, y
 * una prueba que las escribiera a mano se pondría roja sola el día que pasara
 * esa fecha — sin que nadie tocara la app. Ése es el fallo que test-no-caduca
 * persigue en toda la suite, y esta prueba lo señaló el día que se escribió.
 *
 * Contar desde hoy no le quita precisión a nada: lo que se mide aquí son
 * DISTANCIAS entre dos entregas (¿una semana? ¿tres meses?), y una distancia es
 * la misma se cuente desde donde se cuente. */
const HOY = new Date();
function dia(n){
  const d = new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate() + n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
         '-' + String(d.getDate()).padStart(2, '0');
}

function inc(o){
  return Object.assign({
    id:'INC-0', estDate:dia(14), dateMode:'exact', estDateEnd:'', dateNote:'',
    category:'WINDOW', name:'DOOR SCREEN', qty:5, unit:'UNIT',
    supplier:'MILGARD', po:'', notes:'', status:'Pending',
    addedBy:'jose@ox.com', addedAt:'', pm:'', docLink:''
  }, o);
}

// La lista de partida. Cada una está aquí por una rama concreta de la regla.
const INCOMING = [
  // Con PO: la identidad. Dos ramas cuelgan de ella (mismo PO / PO distinto).
  inc({ id:'A1', name:'DOOR SCREEN', supplier:'MILGARD', po:'PO-1001',
        estDate:dia(14), qty:5, notes:'first truck' }),
  // Sin PO, mismo proveedor: la rama de nombre + proveedor + fecha.
  inc({ id:'B1', name:'SLIDING PANEL', supplier:'ANDERSEN', po:'',
        estDate:dia(19), qty:3 }),
  // Mismo nombre que B1, OTRO proveedor: Jose dijo que eso NO es duplicado.
  inc({ id:'B2', name:'SLIDING PANEL', supplier:'PELLA', po:'',
        estDate:dia(19), qty:3 }),
  // Cancelada: volver a anotarla es lo correcto, no un duplicado.
  inc({ id:'C1', name:'SHOWER GLASS', supplier:'CARDINAL', po:'PO-2002',
        estDate:dia(11), status:'Cancelled' }),
  // Para el buscador: datos repartidos por campos distintos.
  inc({ id:'S1', name:'MIRROR 24X36', supplier:'GUARDIAN', po:'PO-7788',
        estDate:dia(21), pm:'TERRY', notes:'call the office first' })
];

const DATA = {
  userRole: 'ADMIN', userEmail: 'jose@ox.com', userName: 'Jose', serverVersion: 'test',
  company: { name: 'OX Glass LLC.' }, movements: [], stock: {},
  materialLocks: [], monitoredMaterials: null,
  config: { categories:['WINDOW','GLASS'], projects:[],
            suppliers:['MILGARD','ANDERSEN','PELLA','CARDINAL','GUARDIAN'],
            locations:[{ name:'A1A', type:'RACK' }], units:['UNIT'] },
  incoming: INCOMING, rackPhotos: {}, systemActivity: [],
  rolePerms: { canSeeCosts:false, canEditMovements:true, canManageCatalog:true, canExportData:true },
  warehouseRoleLabel: 'Warehouse', archiveCutoffMonths: 12, oauthClientId:'', oauthRedirectUri:''
};

function pagina(){
  // El doble del servidor APUNTA LO QUE SE LE PIDE. Sin eso no se puede
  // distinguir "no se creó nada" de "se creó y no se vio": las dos dejan la
  // pantalla igual, y son lo contrario la una de la otra.
  const stub = `<script>
window.__CALLS=[];
window.google=window.google||{}; window.google.charts={load:function(){},setOnLoadCallback:function(){}};
Object.assign(window.google,{script:{run:new Proxy({},{get(t,k){
  return function(){
    if(k==='withSuccessHandler'){ t._ok=arguments[0]; return window.google.script.run; }
    if(k==='withFailureHandler'){ return window.google.script.run; }
    var ok=t._ok, args=Array.prototype.slice.call(arguments);
    if(k==='getInitialData'){ setTimeout(function(){ ok && ok(window.__DATA); },20); return; }
    if(k==='processMovement'){ window.__CALLS.push({accion:args[0], datos:args[1]}); }
    else { window.__CALLS.push({accion:k, datos:args[0]}); }
    setTimeout(function(){ ok && ok({status:'success', id:'INC-NEW'}); },10);
  };
}})}});
window.__DATA=${JSON.stringify(DATA)};
<\/script>`;
  const out = html.replace('</head>', stub + '</head>');
  const f = path.join(os.tmpdir(), 'ac-inc-' + Math.random().toString(36).slice(2) + '.html');
  fs.writeFileSync(f, out);
  return f;
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  const errores = [];
  const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
  page.on('pageerror', e => errores.push(e.message));
  await page.goto('file://' + pagina());
  await page.waitForTimeout(700);
  await page.evaluate(() => showTab('incoming', 'btn-incoming'));
  await page.waitForTimeout(300);

  console.log('\n═══ 1. Los nombres se regularizan, como en un entry ═══\n');

  // EL SERVIDOR. Es donde se guarda, así que es donde tiene que pasar: un
  // `text-transform` en el CSS sólo pinta, y lo guardado seguiría sucio.
  const add = A.sinComentarios(A.fnSrc(GS, 'addIncoming'));
  const upd = A.sinComentarios(A.fnSrc(GS, 'updateIncoming'));
  check('addIncoming guarda el nombre con cleanDisplay_, como un movimiento',
        /cleanDisplay_\(data\.name\)/.test(add), add.slice(0, 60));
  check('...y la categoría igual', /cleanDisplay_\(data\.category\)/.test(add));
  check('updateIncoming también — si no, editar la devolvería a como se tecleó',
        /cleanDisplay_\(data\.name\)/.test(upd) && /cleanDisplay_\(data\.category\)/.test(upd));
  check('y ya no queda el trim pelado que había',
        !/String\(data\.name\s*\|\|\s*''\)\.trim\(\)/.test(add) &&
        !/String\(data\.name\s*\|\|\s*''\)\.trim\(\)/.test(upd));

  // EL NAVEGADOR TIENE QUE HACER LO MISMO, LETRA POR LETRA. La fila se pinta
  // antes de que el servidor conteste; si las dos no coincidieran, lo recién
  // guardado se vería de una forma y cambiaría solo al recargar.
  const MUESTRAS = ['Yogu Yogu', '  door   screen ', 'A-680, 80 SERIES',
                    'mh 159', "PM'S OFFICE", '', '36" GLASS'];
  const delNavegador = await page.evaluate(m => m.map(s => _limpiarNombre(s)), MUESTRAS);
  // El gemelo del servidor, ejecutado aquí mismo: comparar contra una lista
  // escrita a mano mediría lo que yo creo que hace cleanDisplay_, no lo que hace.
  const cleanDisplay = new Function('str',
    A.sinComentarios(A.fnSrc(GS, 'cleanDisplay_')).replace(/^function cleanDisplay_\(str\)\s*\{/, '')
      .replace(/\}\s*$/, ''));
  const delServidor = MUESTRAS.map(s => cleanDisplay(s));
  check('_limpiarNombre del navegador da EXACTAMENTE lo mismo que cleanDisplay_',
        JSON.stringify(delNavegador) === JSON.stringify(delServidor),
        { navegador: delNavegador, servidor: delServidor });
  check('...y sí normaliza de verdad (no es la identidad)',
        delNavegador[0] === 'YOGU YOGU' && delNavegador[1] === 'DOOR SCREEN',
        delNavegador);
  check('...respetando la puntuación, que es lo que la separa de normalizeString',
        delNavegador[2] === 'A-680, 80 SERIES', delNavegador[2]);

  const pintado = await page.evaluate(cuando => {
    _incAplicarLocal({ id:'Z9', name:'  yogu   yogu ', category:'window',
                       qty:1, unit:'UNIT', status:'Pending', estDate:cuando,
                       dateMode:'exact' }, {});
    const f = incoming.filter(i => i.id === 'Z9')[0];
    incoming = incoming.filter(i => i.id !== 'Z9');
    return f;
  }, dia(30));
  check('la fila que el navegador pinta al instante ya viene normalizada',
        pintado && pintado.name === 'YOGU YOGU' && pintado.category === 'WINDOW',
        pintado);

  console.log('\n═══ 2. El buscador ═══\n');

  const buscar = async (q) => {
    await page.fill('#incSearch', q);
    await page.waitForTimeout(400);           // el debounce son 220ms
    return page.evaluate(() => {
      const c = document.getElementById('incomingTableContainer');
      const filas = Array.prototype.slice.call(c.querySelectorAll('tbody tr'))
        .filter(tr => !tr.classList.contains('inc-group-row'));
      return { n: filas.length, texto: c.textContent.replace(/\s+/g, ' ').trim() };
    });
  };

  const todo = await buscar('');
  check('sin buscar nada están todas', todo.n === INCOMING.length, todo.n);

  const porNombre = await buscar('mirror');
  check('busca por nombre, sin importar mayúsculas', porNombre.n === 1 &&
        /MIRROR 24X36/.test(porNombre.texto), porNombre);

  const porPO = await buscar('7788');
  check('busca por PO — que es como se llama una entrega en una factura',
        porPO.n === 1 && /MIRROR 24X36/.test(porPO.texto), porPO);

  const porProv = await buscar('pella');
  check('busca por proveedor', porProv.n === 1 && /SLIDING PANEL/.test(porProv.texto), porProv);

  const porPM = await buscar('terry');
  check('busca por PM', porPM.n === 1, porPM);

  const porNotas = await buscar('call the office');
  check('busca en las notas', porNotas.n === 1, porNotas);

  const nada = await buscar('zzzzz');
  check('y cuando no hay nada, dice por qué está vacío',
        nada.n === 0 && /matching "zzzzz"/.test(nada.texto), nada.texto);
  check('...y cuántas hay en total, para que no parezca que se borró todo',
        /5 in the full list/.test(nada.texto), nada.texto);

  // LO QUE SE BUSCA Y LO QUE SE ANUNCIA TIENEN QUE SER LO MISMO. Un buscador
  // que mira en sitios que no nombra parece roto cuando encuentra algo raro.
  const anuncio = await page.evaluate(() =>
    document.getElementById('incSearch').getAttribute('placeholder').toLowerCase());
  ['name', 'po', 'supplier', 'pm', 'notes'].forEach(c => {
    check('el marcador de posición nombra "' + c + '"', anuncio.indexOf(c) !== -1, anuncio);
  });

  // Y NO TOCA LA SEMANA DE ARRIBA: es un calendario, no una lista. Vaciar días
  // enteros por escribir tres letras escondería lo que se viene a ver aquí.
  const semana = await page.evaluate(() =>
    document.querySelectorAll('#incomingWeekGrid .day-card').length);
  check('la vista de semana sigue entera mientras se busca', semana === 7, semana);
  await page.fill('#incSearch', '');
  await page.waitForTimeout(400);

  console.log('\n═══ 3. El aviso de duplicado — la regla de Jose ═══\n');

  // La regla, ejecutada rama por rama. Cada llamada es una frase de lo que él
  // dijo, y ninguna de las seis se puede quitar sin quitar parte de la regla.
  const regla = await page.evaluate(D => {
    const p = o => Object.assign({ name:'', supplier:'', po:'', estDate:D.d14,
                                   dateMode:'exact' }, o);
    const r = o => { const d = _incDuplicados(p(o));
                     return { f: d.fuertes.map(x => x.id), s: d.suaves.map(x => x.id) }; };
    return {
      mismoPO:      r({ name:'DOOR SCREEN', supplier:'MILGARD', po:'PO-1001' }),
      poDistinto:   r({ name:'DOOR SCREEN', supplier:'MILGARD', po:'PO-9999' }),
      poOtroFormato:r({ name:'door screen', supplier:'milgard', po:'po-1001' }),
      sinPOIgual:   r({ name:'SLIDING PANEL', supplier:'ANDERSEN', po:'', estDate:D.d20 }),
      sinPOLejos:   r({ name:'SLIDING PANEL', supplier:'ANDERSEN', po:'', estDate:D.d95 }),
      otroProv:     r({ name:'SLIDING PANEL', supplier:'JELD-WEN', po:'', estDate:D.d19 }),
      cancelada:    r({ name:'SHOWER GLASS', supplier:'CARDINAL', po:'PO-2002' }),
      unoConPO:     r({ name:'SLIDING PANEL', supplier:'ANDERSEN', po:'PO-555', estDate:D.d19 }),
      siMisma:      r({ id:'A1', name:'DOOR SCREEN', supplier:'MILGARD', po:'PO-1001' }),
      sinNombre:    r({ name:'', supplier:'MILGARD', po:'PO-1001' })
    };
  }, { d14: dia(14), d19: dia(19), d20: dia(20), d95: dia(95) });

  check('MISMO PO + mismo material → aviso fuerte. El PO es la identidad',
        regla.mismoPO.f.join() === 'A1' && !regla.mismoPO.s.length, regla.mismoPO);
  check('DOS PO DISTINTOS → no es duplicado. Cada pedido nuevo trae PO nuevo',
        !regla.poDistinto.f.length && !regla.poDistinto.s.length, regla.poDistinto);
  check('...y el PO se compara normalizado: "po-1001" es "PO-1001"',
        regla.poOtroFormato.f.join() === 'A1', regla.poOtroFormato);
  check('SIN PO: nombre + proveedor + fecha cercana → aviso suave',
        !regla.sinPOIgual.f.length && regla.sinPOIgual.s.join() === 'B1', regla.sinPOIgual);
  check('...pero con la fecha lejos, no. Dos pedidos del mismo material en meses ' +
        'distintos son dos pedidos',
        !regla.sinPOLejos.s.length, regla.sinPOLejos);
  check('MISMO NOMBRE, OTRO PROVEEDOR → no se avisa. Lo dijo Jose expresamente',
        !regla.otroProv.f.length && !regla.otroProv.s.length, regla.otroProv);
  check('una CANCELADA no cuenta — volver a anotarla es lo correcto',
        !regla.cancelada.f.length && !regla.cancelada.s.length, regla.cancelada);
  check('si sólo una tiene PO no se puede usar el PO: se cae al nombre + proveedor',
        regla.unoConPO.s.join() === 'B1', regla.unoConPO);
  check('una entrega no es duplicado de SÍ MISMA al editarla',
        !regla.siMisma.f.length && !regla.siMisma.s.length, regla.siMisma);
  check('sin nombre no se compara nada — no hay con qué',
        !regla.sinNombre.f.length && !regla.sinNombre.s.length, regla.sinNombre);

  // La ventana de días es una decisión, no un hallazgo: se deja escrita y medida.
  const dias = await page.evaluate(F => ({
    tope: _INC_DIAS_CERCA,
    justo:  _incFechasCerca({ estDate:F.a }, { estDate:F.masSiete }),
    pasado: _incFechasCerca({ estDate:F.a }, { estDate:F.masOcho }),
    sinFecha: _incFechasCerca({ estDate:'' }, { estDate:F.masOcho })
  }), { a: dia(0), masSiete: dia(7), masOcho: dia(8) });
  check('la ventana son 7 días', dias.tope === 7, dias.tope);
  check('...justo en el borde, cuenta', dias.justo === true);
  check('...un día más, no', dias.pasado === false);
  check('sin fecha NO se descarta — "no lo sé" no es "no", y la entrega sin ' +
        'fecha es la que más se apunta dos veces', dias.sinFecha === true);

  console.log('\n═══ 4. El cuadro: los dos al lado, y tres salidas ═══\n');

  const rellenar = async (o) => page.evaluate(v => {
    openIncomingModal();
    document.getElementById('incDateMode').value = 'exact';
    document.getElementById('incDate').value     = v.estDate;
    document.getElementById('incStatus').value   = 'Pending';
    document.getElementById('incCategory').value = 'WINDOW';
    document.getElementById('incName').value     = v.name;
    document.getElementById('incQty').value      = v.qty;
    document.getElementById('incUnit').value     = 'UNIT';
    document.getElementById('incSupplier').value = v.supplier;
    document.getElementById('incPO').value       = v.po || '';
    document.getElementById('incPM').value       = '';
    document.getElementById('incNotes').value    = v.notes || '';
    window.__CALLS = [];
    saveIncomingItem();
  }, o);

  // El mismo PO que A1, con la cantidad cambiada para que haya una diferencia
  // que la tabla tenga que marcar.
  await rellenar({ estDate:dia(14), name:'door screen', qty:7,
                   supplier:'MILGARD', po:'PO-1001', notes:'second truck' });
  await page.waitForTimeout(250);

  const cuadro = await page.evaluate(() => {
    const ov = document.getElementById('incDupOverlay');
    const filas = Array.prototype.slice.call(ov.querySelectorAll('.dup-tabla tbody tr'))
      .map(tr => ({ campo: tr.children[0].textContent.trim(),
                    viejo: tr.children[1].textContent.trim(),
                    nuevo: tr.children[2].textContent.trim(),
                    dif:   tr.classList.contains('dup-dif') }));
    return { abierto: ov.classList.contains('show'),
             titulo: document.getElementById('incDupTitle').textContent,
             lead:   document.getElementById('incDupLead').textContent,
             cabeceras: Array.prototype.map.call(ov.querySelectorAll('.dup-tabla th'),
                                                 th => th.textContent.trim()),
             filas: filas,
             llamadas: window.__CALLS.length,
             botones: Array.prototype.map.call(ov.querySelectorAll('.dup-acciones button'),
                                               b => b.textContent.trim()) };
  });

  check('guardar un duplicado abre el cuadro en vez de guardarlo', cuadro.abierto);
  check('NO SE GUARDÓ NADA todavía — el aviso pregunta, no registra',
        cuadro.llamadas === 0, cuadro.llamadas);
  check('con el PO igual, el aviso es el fuerte',
        /same delivery/i.test(cuadro.titulo), cuadro.titulo);
  check('...y explica por qué: el proveedor emite un PO nuevo por pedido nuevo',
        /new PO for a new order/i.test(cuadro.lead), cuadro.lead);
  check('las dos columnas se nombran por lo que son',
        /Already on the list/.test(cuadro.cabeceras.join('|')) &&
        /You are adding/.test(cuadro.cabeceras.join('|')), cuadro.cabeceras);

  // Las claves son las etiquetas TAL CUAL van en el HTML. En pantalla se leen
  // en mayúsculas, pero eso lo hace el CSS (`text-transform`), y buscarlas
  // aquí en mayúsculas no encontraría ninguna — un fallo que se lee como "la
  // tabla está vacía" cuando la tabla está perfecta.
  const porCampo = {}; cuadro.filas.forEach(f => porCampo[f.campo] = f);
  check('se comparan los nueve campos de una entrega', cuadro.filas.length === 9,
        cuadro.filas.map(f => f.campo));
  check('el nombre que se está creando ya se ve NORMALIZADO en la comparación',
        porCampo['Name'] && porCampo['Name'].nuevo === 'DOOR SCREEN',
        porCampo['Name']);
  check('...y por eso la fila del nombre NO se marca como diferencia',
        porCampo['Name'] && porCampo['Name'].dif === false, porCampo['Name']);
  check('lo que SÍ cambia se marca: la cantidad',
        porCampo['Qty'] && porCampo['Qty'].dif === true &&
        /5/.test(porCampo['Qty'].viejo) && /7/.test(porCampo['Qty'].nuevo),
        porCampo['Qty']);
  check('...y las notas', porCampo['Notes'] && porCampo['Notes'].dif === true,
        porCampo['Notes']);
  check('lo que coincide NO se marca — si se marcara todo, no destacaría nada',
        porCampo['Supplier'] && porCampo['Supplier'].dif === false &&
        porCampo['PO #'] && porCampo['PO #'].dif === false,
        [porCampo['Supplier'], porCampo['PO #']]);
  check('un campo vacío se dice con una raya, no con un hueco',
        porCampo['PM'] && porCampo['PM'].viejo === '—' && porCampo['PM'].nuevo === '—',
        porCampo['PM']);
  check('las tres salidas son las tres decisiones de verdad', cuadro.botones.length === 3 &&
        /same one/i.test(cuadro.botones.join('|')) &&
        /different/i.test(cuadro.botones.join('|')) &&
        /cancel/i.test(cuadro.botones.join('|')), cuadro.botones);

  // "SON DISTINTAS" → sigue, sin regañar.
  await page.click('#incDupOverlay .btn-primary');
  await page.waitForTimeout(300);
  const seguido = await page.evaluate(() => ({
    cerrado: !document.getElementById('incDupOverlay').classList.contains('show'),
    llamadas: window.__CALLS.map(c => c.accion)
  }));
  check('"son distintas" cierra el aviso', seguido.cerrado);
  check('...y guarda de verdad, que es lo que se pidió',
        seguido.llamadas.indexOf('addIncoming') !== -1, seguido.llamadas);

  // "ES LA MISMA" → abre AQUÉLLA y no crea una segunda. Es el punto entero.
  await page.evaluate(() => { closeModal('incomingOverlay');
                              incoming = incoming.filter(i => i.id !== 'INC-NEW'); });
  await page.waitForTimeout(150);
  await rellenar({ estDate:dia(14), name:'DOOR SCREEN', qty:9,
                   supplier:'MILGARD', po:'PO-1001' });
  await page.waitForTimeout(250);
  await page.click('#incDupEditBtn');
  await page.waitForTimeout(350);
  /* "No se creó nada" se mide por lo que SE MANDÓ AL SERVIDOR y por si existe
   * una entrega con los datos que se estaban tecleando — no contando filas.
   * Contar filas medía otra cosa: la recarga de fondo vuelve a traer la lista
   * del servidor doble, así que el número sube y baja por motivos que no tienen
   * que ver con este botón. El dato tecleado era una cantidad de 9, que no
   * existe en ninguna entrega de partida. */
  const editando = await page.evaluate(() => ({
    avisoCerrado: !document.getElementById('incDupOverlay').classList.contains('show'),
    formAbierto:  document.getElementById('incomingOverlay').classList.contains('show'),
    idEnElForm:   document.getElementById('incId').value,
    nombre:       document.getElementById('incName').value,
    qty:          document.getElementById('incQty').value,
    conLoTecleado: incoming.filter(i => Number(i.qty) === 9).length,
    llamadas:     window.__CALLS.map(c => c.accion)
  }));
  check('"es la misma" cierra el aviso', editando.avisoCerrado);
  check('...y deja abierta LA QUE YA EXISTÍA, lista para editar',
        editando.formAbierto && editando.idEnElForm === 'A1', editando);
  check('...con SUS datos, no con los que se estaban tecleando',
        editando.nombre === 'DOOR SCREEN' && String(editando.qty) === '5', editando);
  check('...y NO se creó una segunda entrega — el punto entero del aviso',
        editando.conLoTecleado === 0 && editando.llamadas.length === 0, editando);

  // El aviso suave, para ver que las dos redacciones existen de verdad.
  await page.evaluate(() => closeModal('incomingOverlay'));
  await page.waitForTimeout(150);
  await rellenar({ estDate:dia(20), name:'SLIDING PANEL', qty:3,
                   supplier:'ANDERSEN', po:'' });
  await page.waitForTimeout(250);
  const suave = await page.evaluate(() => ({
    abierto: document.getElementById('incDupOverlay').classList.contains('show'),
    titulo:  document.getElementById('incDupTitle').textContent,
    lead:    document.getElementById('incDupLead').textContent
  }));
  check('sin PO, el aviso es el suave', suave.abierto && /Possible duplicate/i.test(suave.titulo),
        suave.titulo);
  check('...y dice que puede ser una entrega de verdad, no acusa',
        /may well be a second, real delivery/i.test(suave.lead), suave.lead);
  await page.evaluate(() => { closeModal('incDupOverlay'); closeModal('incomingOverlay'); });

  // Y GUARDAR ALGO QUE NO ES DUPLICADO NO PREGUNTA NADA. Un aviso que sale
  // siempre se aprende a cerrar sin leerlo, y entonces deja de avisar.
  await page.waitForTimeout(150);
  await rellenar({ estDate:dia(43), name:'TEMPERED PANEL', qty:2,
                   supplier:'GUARDIAN', po:'PO-3131' });
  await page.waitForTimeout(350);
  const limpio = await page.evaluate(() => ({
    aviso: document.getElementById('incDupOverlay').classList.contains('show'),
    llamadas: window.__CALLS.map(c => c.accion)
  }));
  check('una entrega que no se parece a ninguna se guarda sin preguntar',
        !limpio.aviso && limpio.llamadas.indexOf('addIncoming') !== -1, limpio);

  check('y la página no tiró ningún error', errores.length === 0, errores);

  await browser.close();
  console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones');
  process.exit(fail ? 1 : 0);
})();
