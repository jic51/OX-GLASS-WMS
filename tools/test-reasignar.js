// M-05 — REASIGNAR: ESTAS UNIDADES PASAN A SER AQUELLAS.
//
// Jose, 13/11, con una captura de tres movimientos:
//
//   *"Fueron transferidas desde un material reservado a una locación donde
//   estaba otro material. Eso lo hice yo porque el material reservado se debía
//   usar en otro proyecto y está bien, pero el problema es que en el sistema
//   esas ventanas transferidas aún aparecen con el otro nombre y no son parte
//   completa del otro proyecto nuevo. Al momento de transferir un material y
//   usar un material en otro proyecto deben pasar a ser parte de ese proyecto,
//   pero debemos poder tener trazabilidad para saber de dónde vinieron."*
//
// ── LA DISTINCIÓN QUE LO EXPLICA ─────────────────────────────────────────────
//
// `TRANSFER` contesta «¿dónde está?». Esto contesta «¿de quién es?». Eran dos
// preguntas con un solo botón, así que la segunda se respondía con la
// herramienta de la primera, y el resultado salía correcto en el estante y
// falso en la obra.
//
// ── POR QUÉ ESTA PRUEBA CORRE EL MOTOR DE STOCK DE VERDAD ────────────────────
//
// Porque lo único que importa de un tipo de movimiento nuevo es qué le hace a
// las cuentas, y eso no se lee: se ejecuta. Hay CUATRO lectores de stock en el
// archivo y uno de ellos lo dice por escrito — *"los cuatro tienen que
// coincidir o LIVE_STOCK se separa de lo que dice el barrido completo, y la
// diferencia sólo aparece como un cajón de estante que lee mal y en silencio"*.
// Así que aquí se mide el resultado: cuánto queda de cada material y en qué
// estante.
//
// ── LAS CUATRO COSAS QUE SERÍAN PEORES QUE NO TENER LA FUNCIÓN ───────────────
//
//  1. Que el material desapareciera de los dos lados. Las dos filas van en UNA
//     escritura: o están las dos o no está ninguna.
//  2. Que el coste no viajara. Mover material barato a un material caro
//     INVENTA DINERO, y al revés lo destruye.
//  3. Que la reserva de origen se quedara puesta. Seguir reservando para la
//     obra vieja algo que ya se montó en otra casa hace que alguien no pueda
//     sacar material que sí tiene.
//  4. Que las unidades pareciesen instaladas en una obra, o tiradas. Nada se ha
//     movido: siguen en el mismo estante.
//
// Uso:  node tools/test-reasignar.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const A = require(path.join(__dirname, 'andamio.js'));
const ROOT = path.join(__dirname, '..');
const GS   = fs.readFileSync(path.join(ROOT, 'Code_v3_fixed.gs'), 'utf8');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

const m = A.marcador('reasignar');
const check = m.check;

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('la aritmética vive en UN sitio, no en cuatro');
{
  const sin = A.sinComentarios(GS);
  check('existe `cuentaComoAjuste_`', /function cuentaComoAjuste_\(/.test(sin));
  /* LA COMPROBACIÓN QUE DE VERDAD IMPORTA DE ESTA SECCIÓN. Si alguien añade el
     quinto lector de stock copiando un `mt === 'ADJUST' || mt === 'REASSIGN'`,
     esto se pone rojo y dice por qué. Cuatro copias de la misma condición es el
     fallo que este repositorio se encuentra una y otra vez. */
  /* SE DESCUENTAN DOS CUERPOS, y cada uno por una razón distinta:
     · el del propio `cuentaComoAjuste_`, que ES la condición;
     · el de `enforceMaterialLock_`, cuya lista no es la aritmética del stock
       sino «qué tipos no pueden tocar material reservado» — ahí REASSIGN está
       junto a EXIT y WASTE, que no comparten aritmética con el ajuste. Dos
       listas que se parecen y significan cosas distintas: juntarlas sería el
       fallo del 21/10 otra vez. */
  const fuera = sin
    .replace(A.sinComentarios(A.fnSrc(GS, 'cuentaComoAjuste_') || ''), '')
    .replace(A.sinComentarios(A.fnSrc(GS, 'enforceMaterialLock_') || ''), '');
  const copias = (fuera.match(/===\s*'ADJUST'\s*\|\|\s*\w*\s*===\s*'REASSIGN'/g) || []).length;
  check('y NADIE repite la condición a mano por ahí — se usa el predicado',
    copias === 0, copias);
  const usos = (sin.match(/cuentaComoAjuste_\(/g) || []).length;
  check('los lectores de stock pasan por él (hay ' + usos + ' usos, y son 4 lectores ' +
        'más la dirección y el guardia de la edición)', usos >= 6, usos);
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('EL MOTOR: lo que le hace a las cuentas');

/* Se levanta `calculateStock` de verdad, con sus ayudantes, y se le da una
   historia completa. Nada de reimplementar la aritmética aquí: una copia
   escrita por mí sólo demostraría que sé escribir una que se parece a la mía. */
function motor() {
  const ctx = {
    console, Math, Number, String, Object, Array, isFinite, JSON, Date,
    normalizeString: s => String(s || '').trim().toUpperCase().replace(/\s+/g, ' '),
    getMaterialId: (c, n) => String(c).trim().toUpperCase() + '|||' + String(n).trim().toUpperCase(),
    cleanDisplay_: v => String(v || '').trim(),
    basicApagado_: () => false,
    /* Las reservas no son lo que mide esta prueba: lo que `calculateStock`
       devuelve pasa por aquí al final y se le deja pasar tal cual. Lo que sí
       mide la prueba son las cifras de antes de ese paso. */
    applyReservationsAndFinalize_: (stock) => stock
  };
  vm.createContext(ctx);
  vm.runInContext([
    A.constantes(GS, ['AC']),
    A.levantar(GS, ['calculateStock'], {
      dobles: ['normalizeString', 'getMaterialId', 'cleanDisplay_', 'basicApagado_',
               'applyReservationsAndFinalize_']
    })
  ].join('\n'), ctx);
  return ctx;
}

function mov(o) {
  return {
    category: o.cat || 'WINDOW', name: o.name, project: o.project || '',
    qty: o.qty, unit: 'UNIT', moveType: o.mt,
    sourceLoc: o.src || '', destLoc: o.dest || '',
    status: '', dateRec: '2026-11-01', comments: o.comments || ''
  };
}

{
  const ctx = motor();
  /* LA HISTORIA DEL CASO DE JOSE, con los números de su captura:
     entran 10 PAT.SEI902 para TOWNHOME 2 en B2A, y 4 de ésas se montan en
     LAKESHORE, donde son MH 145. */
  const historia = [
    mov({ name: 'PAT.SEI902', project: 'TOWNHOME 2', qty: 10, mt: 'ENTRY', dest: 'B2A' }),
    mov({ name: 'MH 145',     project: 'LAKESHORE',  qty: 6,  mt: 'ENTRY', dest: 'B2A' }),
    // las dos filas de la reasignación, con el MISMO estante
    mov({ name: 'PAT.SEI902', project: 'TOWNHOME 2', qty: 4, mt: 'REASSIGN', src: 'B2A' }),
    mov({ name: 'MH 145',     project: 'LAKESHORE',  qty: 4, mt: 'REASSIGN', dest: 'B2A' })
  ];
  const stock = ctx.calculateStock(historia, {});
  const pat = stock['WINDOW|||PAT.SEI902'];
  const mh  = stock['WINDOW|||MH 145'];

  check('el material de origen se queda con 6 de las 10',
    pat && pat.warehouseQty === 6, pat && pat.warehouseQty);
  check('el de destino pasa de 6 a 10',
    mh && mh.warehouseQty === 10, mh && mh.warehouseQty);
  check('y el estante cuadra en los dos: 6 y 10 en B2A',
    pat && pat.warehouseLocs.B2A === 6 && mh && mh.warehouseLocs.B2A === 10,
    { pat: pat && pat.warehouseLocs, mh: mh && mh.warehouseLocs });

  /* LAS DOS QUE IMPIDEN LAS MENTIRAS DE LA ARITMÉTICA EQUIVOCADA.
     Con la de EXIT, las 4 unidades aparecerían instaladas en una obra; con la
     de WASTE, tiradas. Las dos serían falsas: siguen en el almacén. */
  check('NADA aparece como instalado en una obra — no salió de la bodega',
    pat.siteQty === 0 && mh.siteQty === 0, { pat: pat.siteQty, mh: mh.siteQty });
  check('NADA aparece como desperdiciado',
    pat.wastedQty === 0 && mh.wastedQty === 0, { pat: pat.wastedQty, mh: mh.wastedQty });
  check('el total de la bodega no cambia: 16 antes y 16 después',
    pat.warehouseQty + mh.warehouseQty === 16, pat.warehouseQty + mh.warehouseQty);
  /* Y la última, que es la que contesta la queja de Jose palabra por palabra:
     *"aún aparecen con el otro nombre y no son parte completa del otro proyecto
     nuevo"*. Ahora las 4 son del proyecto nuevo porque son del MATERIAL nuevo. */
  check('las 4 unidades son ya del proyecto de destino, porque son del ' +
        'material de destino', mh.project === 'LAKESHORE', mh.project);
}

{
  /* LOS CUATRO LECTORES TIENEN QUE COINCIDIR, y ésta es la comprobación que lo
     mide en vez de confiar. `applyMovementToSnapshot_` es el que usan el
     guardado y las cifras «de después»; `calculateStock` es el barrido
     completo. Si se separan, lo que ve la pantalla al guardar no es lo que verá
     al recargar — y eso es justo lo que el comentario del cuarto lector avisa
     que pasa en silencio. */
  const ctx = motor();
  vm.runInContext(A.levantar(GS, ['applyMovementToSnapshot_'],
    { dobles: ['findFirstWarehouseLoc'] }), ctx);
  ctx.findFirstWarehouseLoc = (locs) => Object.keys(locs)[0] || '';

  const s = { wh: 10, site: 0, wasted: 0, locs: { B2A: 10 } };
  ctx.applyMovementToSnapshot_(s, 'REASSIGN', 4, 'B2A', '');
  check('el lector del guardado baja igual: 6 en la bodega y 6 en el estante',
    s.wh === 6 && s.locs.B2A === 6, s);
  check('...y no toca la obra', s.site === 0, s.site);

  const d = { wh: 6, site: 0, wasted: 0, locs: { B2A: 6 } };
  ctx.applyMovementToSnapshot_(d, 'REASSIGN', 4, '', 'B2A');
  check('y sube igual: 10 y 10', d.wh === 10 && d.locs.B2A === 10, d);
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('EL COSTE VIAJA CON LAS UNIDADES, o se inventa dinero');
{
  /* No se reimplementa la mezcla de medias: se mira que la fila que SUBE
     comparta la rama de la entrada, que es la que hace la mezcla, y que la que
     BAJA caiga en la genérica, que estampa la media y NO la mueve. Lo segundo
     es correcto por aritmética: quitar unidades a su propia media la deja
     igual. */
  const sin = A.sinComentarios(GS);
  check('la fila que sube se reconoce por su forma',
    /var esSubidaDeReasignacion = \(mt === 'REASSIGN' && destKey && !srcKey\)/.test(sin));
  check('...y comparte la rama de ENTRY, que es la que mezcla la media — no una ' +
        'copia de veinte líneas que habría que arreglar dos veces',
    /if \(mt === 'ENTRY' \|\| esSubidaDeReasignacion\)/.test(sin));
  check('la rama del AJUSTE sigue siendo sólo del ajuste: un ajuste no lleva ' +
        'coste y una reasignación sí',
    /\} else if \(mt === 'ADJUST'\) \{/.test(sin));
  check('el servidor lee la media del material de ORIGEN para pasarla',
    /cfg\.avgCost\[srcId\]/.test(sin));
  check('...y si nunca tuvo precio no viaja ninguno, en vez de un cero que se ' +
        'leería como «esto no costó nada»',
    /if \(!isFinite\(media\) \|\| media <= 0\) media = null;/.test(sin));
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('las dos filas, y lo que cada una dice de la otra');

function mundo(opciones) {
  opciones = opciones || {};
  const escritas = [];
  const soltadas = [];
  const auditadas = [];
  const ctx = {
    console, Math, Number, String, Object, Array, JSON, Date, isFinite,
    normalizeString: s => String(s || '').trim().toUpperCase().replace(/\s+/g, ' '),
    getMaterialId: (c, n) => String(c).trim().toUpperCase() + '|||' + String(n).trim().toUpperCase(),
    cleanDisplay_: v => String(v || '').trim(),
    requireAuth_: () => ({ email: 'jose@ox.test', role: opciones.rol || 'ADMIN' }),
    getActiveLocksMap_: () => (opciones.candados || {}),
    loadConfig: () => ({ avgCost: opciones.costes || {} }),
    addMovementsBatch_: (ss, archive, filas) => {
      escritas.push.apply(escritas, filas);
      return {
        status: 'success', rowCount: filas.length,
        movimientos: filas.map((f, i) => ({ movId: 'MOV-' + i, rowIdx: 100 + i,
                                            name: f.name, destLoc: f.destLoc,
                                            sourceLoc: f.sourceLoc }))
      };
    },
    auditLog_: function(){ auditadas.push(Array.prototype.slice.call(arguments, 1)); },
    logError_: function(){},
    newRequestId_: () => 'req-1',
    CacheService: { getScriptCache: () => ({ remove(){} }) },
    SpreadsheetApp: { getActiveSpreadsheet: () => ctx.ss }
  };
  const hojaCandados = new A.Hoja('MATERIAL_LOCKS',
    [['ID','MatId','Category','Name','Rack','AllowedDestinations','Reason',
      'LockedBy','LockedAt','Status','UnlockedBy','UnlockedAt']]
      .concat(opciones.filasCandado || []));
  ctx.ss = { getSheetByName: n => (n === 'MATERIAL_LOCKS' ? hojaCandados : null) };
  const archive = {
    getName: () => 'MASTER_ARCHIVE_V3',
    getRange: () => ({ setValue(v){ escritas.link = v; return this; } })
  };
  vm.createContext(ctx);
  vm.runInContext([
    A.constantes(GS, ['AC']),
    A.levantar(GS, ['reassignMaterial'], {
      dobles: ['requireAuth_', 'normalizeString', 'getMaterialId', 'cleanDisplay_',
               'getActiveLocksMap_', 'loadConfig', 'addMovementsBatch_',
               'auditLog_', 'logError_', 'newRequestId_']
    })
  ].join('\n'), ctx);
  return { ctx, escritas, soltadas, auditadas, archive, hojaCandados };
}

const PETICION = {
  category: 'WINDOW', name: 'PAT.SEI902', rack: 'b2a', qty: 4, unit: 'UNIT',
  fromProject: 'TOWNHOME 2',
  toCategory: 'WINDOW', toName: 'MH 145', toProject: 'LAKESHORE',
  reason: 'ordered for TOWNHOME 2 but fitted on LAKESHORE',
  responsible: 'Jose', dateRec: '2026-11-23'
};

{
  const w = mundo({ costes: { 'WINDOW|||PAT.SEI902': { avg: 12.5 } } });
  const res = w.ctx.reassignMaterial(w.ctx.ss, w.archive, PETICION, null);

  check('se escriben DOS filas, en UNA sola escritura — media reasignación ' +
        'haría desaparecer material de los dos lados', w.escritas.length === 2,
    w.escritas.length);

  const baja = w.escritas[0], sube = w.escritas[1];
  check('la primera BAJA en el material de origen',
    baja.name === 'PAT.SEI902' && baja.sourceLoc === 'B2A' && baja.destLoc === '',
    { n: baja.name, s: baja.sourceLoc, d: baja.destLoc });
  check('la segunda SUBE en el material de destino',
    sube.name === 'MH 145' && sube.destLoc === 'B2A' && sube.sourceLoc === '',
    { n: sube.name, s: sube.sourceLoc, d: sube.destLoc });
  check('LAS DOS LLEVAN EL MISMO ESTANTE: no se movió nada de sitio, cambió de ' +
        'dueño', baja.sourceLoc === sube.destLoc, [baja.sourceLoc, sube.destLoc]);
  check('las dos son del tipo nuevo',
    baja.moveType === 'REASSIGN' && sube.moveType === 'REASSIGN');

  /* LA TRAZABILIDAD QUE NO DEPENDE DE NINGÚN PUNTERO. Cada fila nombra a la
     otra en su motivo, así que las dos se leen solas — y siguen legibles si una
     se archiva. El puntero es para la máquina; esto es para la persona. */
  check('la fila que baja dice a dónde fueron',
    /Reassigned to MH 145 · LAKESHORE/.test(baja.comments), baja.comments);
  check('la que sube dice de dónde vinieron',
    /Reassigned from PAT\.SEI902 · TOWNHOME 2/.test(sube.comments), sube.comments);
  check('y las dos llevan el motivo que escribió la persona',
    /fitted on LAKESHORE/.test(baja.comments) && /fitted on LAKESHORE/.test(sube.comments));

  check('la fila que sube es ya del proyecto nuevo, que es toda la queja',
    sube.project === 'LAKESHORE', sube.project);
  check('...y guarda de qué obra venía, en la columna que ya significa eso',
    sube.originProject === 'TOWNHOME 2', sube.originProject);

  check('el coste de origen viaja en la fila que sube',
    sube.unitCost === 12.5, sube.unitCost);
  check('el puntero entre las dos se escribe después de la escritura',
    w.escritas.link === 'MOV-0', w.escritas.link);
  check('queda en la auditoría', w.auditadas.some(a => a[0] === 'REASSIGN'),
    w.auditadas.map(a => a[0]));
  check('y el estante se normaliza: se tecleó «b2a»', baja.sourceLoc === 'B2A');
}

{
  const w = mundo({ costes: {} });
  const res = w.ctx.reassignMaterial(w.ctx.ss, w.archive, PETICION, null);
  check('sin precio en el material de origen, no viaja ninguno — y eso es la ' +
        'verdad, no un cero', w.escritas[1].unitCost === null,
    w.escritas[1].unitCost);
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('lo que se niega a hacer');
{
  const casos = [
    ['sin material de destino', { toName: '' }, /become/i],
    ['sin obra de destino',     { toProject: '' }, /job/i],
    ['sin motivo',              { reason: '' }, /trace|why/i],
    ['sin estante',             { rack: '' }, /rack/i],
    ['con cantidad cero',       { qty: 0 }, /greater than 0/i],
    ['al MISMO material',       { toName: 'PAT.SEI902' }, /same material/i]
  ];
  casos.forEach(function(caso){
    const w = mundo({ costes: {} });
    const peticion = Object.assign({}, PETICION, caso[1]);
    let err = null;
    try { w.ctx.reassignMaterial(w.ctx.ss, w.archive, peticion, null); }
    catch (e) { err = e.message; }
    check(caso[0] + ': se niega, y dice qué falta', !!err && caso[2].test(err), err);
    check(caso[0] + ': ...y NO escribe nada', w.escritas.length === 0, w.escritas.length);
  });
  /* LA SEGUNDA MITAD DE CADA CASO ES LA QUE IMPORTA. Un error que ya ha escrito
     una de las dos filas deja material desaparecido de los dos lados, que es
     peor que no tener la función. */
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('la reserva de origen: se suelta, y queda dicho quién');
{
  const candado = { 'WINDOW|||PAT.SEI902|||B2A':
    { id: 'LK-1', rack: 'B2A', reason: 'held for TOWNHOME 2',
      lockedBy: 'jose@ox.test', allowedDest: [] } };
  const fila = ['LK-1', 'WINDOW|||PAT.SEI902', 'WINDOW', 'PAT.SEI902', 'B2A', '',
                'held for TOWNHOME 2', 'jose@ox.test', '2026-11-01', 'ACTIVE', '', ''];

  const w = mundo({ candados: candado, filasCandado: [fila], rol: 'ADMIN',
                    costes: { 'WINDOW|||PAT.SEI902': { avg: 12.5 } } });
  const res = w.ctx.reassignMaterial(w.ctx.ss, w.archive, PETICION, null);

  check('se escribe la reasignación', w.escritas.length === 2, w.escritas.length);
  check('la reserva queda soltada en la hoja',
    String(w.hojaCandados.rows[1][9]) === 'Removed', w.hojaCandados.rows[1][9]);
  check('...con el nombre de quien la soltó',
    String(w.hojaCandados.rows[1][10]) === 'jose@ox.test', w.hojaCandados.rows[1][10]);
  check('la auditoría dice que la soltó una reasignación, no una mano anónima',
    w.auditadas.some(a => a[0] === 'UNLOCK_MATERIAL' &&
                          /released by REASSIGN/.test(String(a[3] || ''))),
    w.auditadas);
  check('y se le dice al navegador, para que lo pueda contar',
    res.releasedLock && res.releasedLock.id === 'LK-1', res.releasedLock);
}

{
  /* Y QUIEN NO ES ADMIN NO PUEDE. Soltar una reserva lo decide quien lleva la
     obra, no quien mueve el pallet — y una reasignación sobre material
     reservado es soltar una reserva, lo quiera o no. */
  const candado = { 'WINDOW|||PAT.SEI902|||B2A':
    { id: 'LK-1', rack: 'B2A', reason: 'held for TOWNHOME 2',
      lockedBy: 'otro@ox.test', allowedDest: [] } };
  const w = mundo({ candados: candado, rol: 'WAREHOUSE', costes: {} });
  let err = null;
  try { w.ctx.reassignMaterial(w.ctx.ss, w.archive, PETICION, null); }
  catch (e) { err = e.message; }
  check('se niega', !!err && /RESERVED/.test(err), err);
  check('...y el mensaje dice que es decisión de un admin, no «error»',
    !!err && /admin decision/.test(err), err);
  check('y no escribe ni suelta nada', w.escritas.length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('y el guardia del candado sigue en pie para todo lo demás');
{
  const sin = A.sinComentarios(GS);
  /* `reassignMaterial` suelta la reserva ANTES de escribir, así que cuando el
     guardia la mira ya no está. Pero el guardia tiene que seguir negando un
     REASSIGN que llegue por cualquier otro camino — por el enrutador a pelo,
     por una importación — o habría una puerta que apaga una reserva sin que
     quede dicho quién la apagó. */
  check('`enforceMaterialLock_` niega también REASSIGN',
    /mt === 'EXIT' \|\| mt === 'WASTE' \|\| mt === 'ADJUST' \|\| mt === 'REASSIGN'/.test(sin));
  check('el tipo nuevo está en la lista blanca de tipos aceptados',
    /'ENTRY','EXIT','TRANSFER','RETURN','WASTE','ADJUST','REASSIGN'/.test(sin));
  check('y el estado de la fila sigue diciendo «In Stock»: las unidades están ' +
        'en el almacén, en su estante',
    /return 'In Stock';\s*\/\/ ENTRY, RETURN, TRANSFER, REASSIGN/.test(GS));
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('en la pantalla');
{
  const sin = A.sinComentarios(HTML);
  check('tiene su propia insignia, no la del ajuste',
    /'REASSIGN': '<span class="badge badge-amber">/.test(sin));
  check('...y su color está definido', /\.badge-amber\{/.test(sin));
  check('el filtro de tipos lo ofrece',
    /<option value="REASSIGN">/.test(sin));
  check('el signo se decide por la FORMA de la fila, igual que en el ajuste',
    /function signoPorLaForma\(/.test(sin) &&
    /signoPorLaForma\(norm\) && adjustIsDown\(m\)/.test(sin));
  check('se llega desde el cajón del estante, que es donde estaba Jose',
    /data-action="rdw-reassign"/.test(sin) &&
    /'rdw-reassign'[\s\S]{0,120}_rdwReassignFromDrawer/.test(sin));
  check('tiene su propia ventana: es la única que pregunta por DOS materiales',
    /id="reassignOverlay"/.test(sin) && /id="raToName"/.test(sin));
  check('la obra de origen NO se teclea: sale del stock, o la fila diría la que ' +
        'escribió quien movió el pallet',
    /raFromProject'\)\.value = \(s && s\.project\)/.test(sin));
  check('la reserva se avisa ANTES de pulsar, no después',
    /raLockWarn[\s\S]{0,600}releases that hold/.test(sin));
  check('y la etiqueta se ofrece al terminar, porque la pegada dice el nombre ' +
        'viejo y es un objeto físico',
    /Print new label/.test(sin));
  check('...armada con lo que el SERVIDOR escribió, no con los datos del ' +
        'formulario — la lección de la etiqueta de la v14.9',
    /_labelsFromMovements\(suben\.length \? suben : res\.movimientos/.test(sin));
  check('la etiqueta de una reasignación lleva el estante donde QUEDA',
    /m\.moveType === 'REASSIGN' && m\.destLoc && !m\.sourceLoc/.test(sin));
}

m.fin();
