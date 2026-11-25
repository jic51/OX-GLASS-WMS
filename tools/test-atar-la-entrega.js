// ATAR LA ENTREGA CON SU ENTRADA, Y QUE LA APP LO NOTE.
//
// Jose, 18/11: *"al corregir o editar un incoming, no se edita el entry que
// utilizó los mismos datos, ¿por qué? ¿Y cómo podemos hacer para manejar la
// edición entre cosas que están interconectadas? Busca qué otras cosas así hay
// en la app que deben cuadrar siempre sin utilizar el 'rebuild stock'."*
//
// La respuesta a la primera mitad: porque no estaban unidos, y nunca lo
// estuvieron. Marcar una entrega como llegada COPIA sus datos al formulario y
// ahí se acaba la relación — dos filas en dos hojas que casualmente dicen lo
// mismo. El navegador sí sabía de qué entrega venía el formulario, pero lo
// guardaba en memoria y lo tiraba al cerrar la ventana.
//
// ── POR QUÉ LA CONSECUENCIA QUE DUELE NO ES LA EDICIÓN ───────────────────────
//
// Es que no había forma de saber qué entregas marcadas como `Arrived` se
// quedaron SIN su movimiento. El único recordatorio vivía en el `localStorage`
// de UN navegador. Ésa es la historia de `LGI-DE-TOWNHOME2`: figuraba como
// llegada y no existía ni en Movements ni en el stock.
//
// ── LO QUE ESTA PRUEBA DEFIENDE, Y ES SOBRE TODO LO QUE NO SE HACE ───────────
//
//  1. La columna se escribe en TODAS las filas de la tanda, no sólo en la
//     primera. Una entrega de 24 ventanas en tres estantes son tres
//     movimientos, y los tres vienen de ella: ponerlo sólo en el primero haría
//     que «¿tiene esta entrega su entrada?» dependiera de cuál se mire.
//  2. SÓLO en una entrada. Una salida o un traslado no vienen de una entrega.
//  3. **Si NADA está atado todavía, la revisión no dice NADA de entregas.** Es
//     la comprobación más importante del archivo: una entrega marcada como
//     llegada antes de que existiera la columna no tiene a nadie apuntándola, y
//     eso no significa que le falte la entrada — significa que no se puede
//     saber. Sin este silencio, el primer barrido de Jose le acusaría de cien
//     entradas que sí hizo, y una revisión que miente cien veces la primera vez
//     no se vuelve a abrir.
//  4. No se propaga nada. Corregir la entrega no toca el movimiento: si la
//     entrega decía 24 y el movimiento guardó 22 porque llegaron dos rotas,
//     poner 25 en la entrega no debe poner 25 en el movimiento — el almacén
//     tiene 22. Y esa cantidad ya movió el inventario.
//
// Uso:  node tools/test-atar-la-entrega.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const A = require(path.join(__dirname, 'andamio.js'));
const ROOT = path.join(__dirname, '..');
const GS   = fs.readFileSync(path.join(ROOT, 'Code_v3_fixed.gs'), 'utf8');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

const m = A.marcador('atar la entrega');
const check = m.check;

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('la columna existe, tiene nombre y va al final');
{
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(A.constantes(GS, ['AC']), ctx);
  const AC = ctx.AC;
  check('`FROM_INCOMING` está en el mapa de columnas', typeof AC.FROM_INCOMING === 'number');
  /* AL FINAL, Y NO ENTRE LAS DE ENMEDIO. Cada índice de `AC` es una POSICIÓN en
     la que alguna hoja ya tiene datos: insertar una columna en medio se los
     correría a todos los clientes que hayan guardado un movimiento. Es la misma
     razón escrita arriba de UNIT_COST, de MOV_ID y de IMPORT_ID. */
  const mayor = Math.max.apply(null, Object.keys(AC).map(k => AC[k]));
  check('...y es la ÚLTIMA: una columna nueva se añade al final o le corre los ' +
        'datos a todo el mundo', AC.FROM_INCOMING === mayor, { suya: AC.FROM_INCOMING, mayor });
  check('no se cuela encima de IMPORT_ID', AC.FROM_INCOMING !== AC.IMPORT_ID);
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('addMultiEntry la escribe, y en TODAS las filas');

function mundoEntrada() {
  const escritas = [];
  const ctx = {
    console, Math, Number, String, Object, Array, JSON, Date,
    requireAuth_: () => ({ email: 'jose@ox.test', role: 'ADMIN' }),
    addMovementsBatch_: (ss, archive, rows) => { escritas.push.apply(escritas, rows); return { status: 'success' }; },
    sendPmGroupedEmails_: () => null
  };
  vm.createContext(ctx);
  vm.runInContext(A.levantar(GS, ['addMultiEntry'], {
    dobles: ['requireAuth_', 'addMovementsBatch_', 'sendPmGroupedEmails_']
  }), ctx);
  return { ctx, escritas };
}

{
  const w = mundoEntrada();
  w.ctx.addMultiEntry({}, {}, {
    fromIncoming: 'INC-77',
    materials: [{ category: 'WINDOW', name: 'MH 145', unit: 'UNIT',
                  locations: [{ loc: 'A1A', qty: 10 },
                              { loc: 'B2B', qty: 8 },
                              { loc: 'C3C', qty: 6 }] }]
  }, null);

  check('la tanda escribió tres filas, una por estante', w.escritas.length === 3,
    w.escritas.length);
  check('LAS TRES dicen de qué entrega vienen — no sólo la primera',
    w.escritas.every(r => r.fromIncoming === 'INC-77'),
    w.escritas.map(r => r.fromIncoming));
  /* Y ÉSTA ES LA QUE EXPLICA POR QUÉ: los documentos y el aviso por correo van
     sólo en la primera fila a propósito, porque son cosas que pasan una vez. La
     procedencia no es un suceso, es un hecho de cada fila. */
  check('...mientras los documentos siguen yendo sólo en la primera, que es ' +
        'otra clase de dato',
    w.escritas.filter(r => (r.docGroups || []).length).length <= 1);
}

{
  const w = mundoEntrada();
  w.ctx.addMultiEntry({}, {}, {
    materials: [{ category: 'WINDOW', name: 'MH 145', unit: 'UNIT',
                  locations: [{ loc: 'A1A', qty: 4 }] }]
  }, null);
  check('una entrada escrita a mano la deja vacía, que es la verdad',
    w.escritas[0].fromIncoming === '', JSON.stringify(w.escritas[0].fromIncoming));
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('el escritor de filas sólo la pone en una ENTRADA');
{
  /* Se mira el código del escritor, y aquí sí es lo correcto: lo que se
     defiende es que la condición EXISTA y sea la del tipo de movimiento. El
     comportamiento con cada tipo lo miden las pruebas del motor, que montan
     movimientos de verdad; duplicar eso aquí sería medir dos veces lo mismo y
     que la segunda se quede vieja. */
  const sin = A.sinComentarios(GS);
  check('la escritura va condicionada a ENTRY',
    /row\[AC\.FROM_INCOMING\]\s*=\s*\(mt === 'ENTRY'\)/.test(sin));
  check('y en lo demás queda vacía, no sin escribir — una celda sin tocar en ' +
        'una fila nueva es `undefined`, y eso se lee distinto que vacío',
    /row\[AC\.FROM_INCOMING\][^;]*:\s*''/.test(sin));
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('llega al navegador');
{
  const sin = A.sinComentarios(GS);
  check('`parseArchiveRow` lo devuelve, que es lo que permite el enlace en las ' +
        'dos direcciones sin una pregunta más al servidor',
    /fromIncoming:\s*String\(row\[AC\.FROM_INCOMING\]/.test(sin));
  check('el navegador lo manda al guardar, desde donde ya lo tenía',
    /fromIncoming:\s*\(typeof _entryFromIncId/.test(A.sinComentarios(HTML)));
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('la revisión: EL SILENCIO cuando no se puede saber');

function mundoBarrido(filas, entregas, reservas) {
  const AUDIT = [];
  const hojas = {};
  if (entregas) hojas.INCOMING_V3 = new A.Hoja('INCOMING_V3',
    [['ID','Est. Date','Category','Name','Qty','Unit','Supplier','PO','Notes','Status',
      'Added By','Added At','PM','Doc Link','Date Mode','Est. Date End','Date Note']]
      .concat(entregas));
  /* LAS RESERVAS DE VERDAD VIVEN EN `MATERIAL_LOCKS`, no en la hoja
     `RESERVATIONS`, que está muerta desde la v10 y sólo se sigue creando por si
     algún cliente escribió filas a mano. La primera versión de esta prueba
     montaba la hoja equivocada y habría dado en verde sobre un barrido que no
     mira una sola reserva real. */
  if (reservas) hojas.MATERIAL_LOCKS = new A.Hoja('MATERIAL_LOCKS',
    [['ID','MatId','Category','Name','Rack','AllowedDestinations','Reason',
      'LockedBy','LockedAt','Status','UnlockedBy','UnlockedAt']]
      .concat(reservas));

  const ctx = {
    console, Math, Number, String, Object, Array, isFinite, JSON, Date,
    normalizeString: s => String(s || '').trim().toUpperCase().replace(/\s+/g, ' '),
    getMaterialId: (c, n) => String(c).trim().toUpperCase() + '|||' + String(n).trim().toUpperCase(),
    requireAuth_: () => ({ email: 'jose@ox.test', role: 'ADMIN' }),
    auditLog_: (ss, a, who, d) => AUDIT.push({ action: a, detail: d }),
    Utilities: { formatDate: () => '10/21/2026' },
    Session: { getScriptTimeZone: () => 'UTC' },
    SHEETS: { ARCHIVE: 'A', ARCHIVE_HISTORY: 'H', RESERVATIONS: 'RESERVATIONS' },
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: n => hojas[n] || null }) }
  };
  vm.createContext(ctx);
  vm.runInContext([
    A.constantes(GS, ['AC', 'DQ_MAX_FINDINGS', 'DQ_SIMILAR_CAP']),
    A.levantar(GS, ['runDataQualityScan'], {
      dobles: ['requireAuth_', 'requireQuota_', 'auditLog_', 'normalizeString',
               'getMaterialId', 'parseArchiveRow']
    })
  ].join('\n'), ctx);
  ctx.dqReadRows_ = () => filas;
  // AC_WIDTH no se usa aquí porque dqReadRows_ está doblado; las filas las
  // arma `fila()` con el ancho de verdad.
  return { ctx, AC: ctx.AC, AUDIT,
           correr: () => ctx.runDataQualityScan({}) };
}

function fila(AC, o) {
  const r = new Array(Math.max.apply(null, Object.keys(AC).map(k => AC[k])) + 1).fill('');
  r[AC.CATEGORY] = o.cat || 'WINDOW';
  r[AC.NAME]     = o.name || 'MH 145';
  r[AC.QTY]      = o.qty === undefined ? 10 : o.qty;
  r[AC.MOVETYPE] = o.mt === undefined ? 'ENTRY' : o.mt;
  r[AC.STATUS]   = o.status || '';
  if (o.de) r[AC.FROM_INCOMING] = o.de;
  return r;
}

const ENTREGA = (id, est, extra) => {
  const r = new Array(17).fill('');
  r[0] = id; r[1] = '2026-10-21'; r[2] = (extra && extra.cat) || 'WINDOW';
  r[3] = (extra && extra.name) || 'MH 145';
  r[4] = (extra && extra.qty  !== undefined) ? extra.qty : 24;
  r[5] = 'UNIT'; r[6] = 'ACME'; r[7] = 'PO-1'; r[9] = est;
  return r;
};

{
  /* EL CASO DE HOY MISMO: la hoja de Jose, con cien entregas llegadas y ningún
     movimiento atado todavía porque la columna acaba de nacer. */
  const w = mundoBarrido([], [ENTREGA('INC-1', 'Arrived'), ENTREGA('INC-2', 'Arrived')], null);
  const AC = w.AC;
  w.ctx.dqReadRows_ = () => [fila(AC, { qty: 24 }), fila(AC, { qty: 24 })];
  const res = w.correr();
  check('con NADA atado, la revisión no dice una sola palabra de entregas',
    res.findings.filter(f => f.kind === 'sinentrada').length === 0,
    res.findings.map(f => f.kind));
  /* Si esto fallara, el primer barrido de Jose le acusaría de cien entradas que
     sí hizo. Es la comprobación que hace que la pantalla se pueda abrir. */
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('la revisión: en cuanto hay algo atado, habla');
{
  const w = mundoBarrido([], [ENTREGA('INC-1', 'Arrived'),
                              ENTREGA('INC-2', 'Arrived'),
                              ENTREGA('INC-3', 'Pending'),
                              ENTREGA('INC-4', 'Cancelled')], null);
  const AC = w.AC;
  // INC-1 tiene su entrada. INC-2 no tiene a nadie, y tampoco encaja nada.
  w.ctx.dqReadRows_ = () => [
    fila(AC, { de: 'INC-1', qty: 24 }),
    fila(AC, { name: 'OTRA COSA', qty: 3 })
  ];
  const res = w.correr();
  const sin = res.findings.filter(f => f.kind === 'sinentrada');

  check('sale UNA: la que llegó y nadie reclama', sin.length === 1,
    sin.map(f => f.incId));
  check('...y es INC-2', sin[0] && sin[0].incId === 'INC-2');
  check('la que tiene su entrada no sale', !sin.some(f => f.incId === 'INC-1'));
  check('la que todavía no ha llegado NO sale — ahí «sin entrada» es lo normal, ' +
        'no un aviso', !sin.some(f => f.incId === 'INC-3'));
  check('la cancelada tampoco', !sin.some(f => f.incId === 'INC-4'));
  check('y trae la evidencia encima: material, cantidad, proveedor y PO',
    sin[0] && sin[0].name === 'MH 145' && sin[0].qty === 24 &&
    sin[0].supplier === 'ACME' && sin[0].po === 'PO-1', sin[0]);
  check('nada que encaje por material y cantidad: eso es el aviso de verdad',
    sin[0] && sin[0].encajan === 0, sin[0] && sin[0].encajan);
}

{
  /* LA MITAD AMABLE. Una entrega vieja sin atar pero con una entrada que encaja
     por material y cantidad: casi seguro que se hizo a mano antes de que esto
     existiera. Se dice como coincidencia, no como certeza — y sobre todo se
     dice, porque lo que no se puede hacer es empujar a nadie a meter una
     segunda entrada de lo mismo. */
  const w = mundoBarrido([], [ENTREGA('INC-9', 'Arrived'), ENTREGA('INC-8', 'Arrived')], null);
  const AC = w.AC;
  w.ctx.dqReadRows_ = () => [
    fila(AC, { de: 'INC-8', qty: 24 }),            // ésta ata la familia
    fila(AC, { qty: 24 })                          // y ésta encaja con INC-9
  ];
  const res = w.correr();
  const sin = res.findings.filter(f => f.kind === 'sinentrada');
  check('se sigue listando — no se da por resuelta sola', sin.length === 1, sin.length);
  check('pero dice que hay una que encaja, para que nadie meta una segunda',
    sin[0] && sin[0].encajan === 1, sin[0] && sin[0].encajan);
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('la revisión: una reserva que aparta algo que ya no existe');
{
  // Un candado NO lleva cantidad: aparta lo que haya. Ver el comentario de
  // MATERIAL_LOCKS en el servidor.
  const RES = (id, cat, name, est) =>
    [id, '', cat, name, 'A1A', '', 'TOWNHOME job', 'jose@ox.test', '2026-10-01', est, '', ''];
  const w = mundoBarrido([], null,
    [RES('R-1', 'WINDOW', 'YA NO EXISTE', 'ACTIVE'),
     RES('R-2', 'WINDOW', 'MH 145',       'ACTIVE'),
     RES('R-3', 'WINDOW', 'TAMPOCO',      'RELEASED')]);
  const AC = w.AC;
  w.ctx.dqReadRows_ = () => [fila(AC, { name: 'MH 145' })];
  const res = w.correr();
  const h = res.findings.filter(f => f.kind === 'reservahuerfana');

  check('sale la que aparta un material sin un solo movimiento', h.length === 1,
    h.map(f => f.resId));
  check('...y es R-1', h[0] && h[0].resId === 'R-1');
  check('la del material que sí existe no sale', !h.some(f => f.resId === 'R-2'));
  check('una ya soltada no sale: no está restando nada',
    !h.some(f => f.resId === 'R-3'));
  check('trae el estante, el motivo y quién la puso, que es lo que hay que ' +
        'decidir — y no una cantidad, porque un candado no lleva cantidad',
    h[0] && h[0].rack === 'A1A' && h[0].motivo === 'TOWNHOME job' &&
    h[0].quien === 'jose@ox.test' && h[0].qty === undefined, h[0]);
  /* Y LA QUE EXPLICA POR QUÉ ESTA SECCIÓN EXISTE DOS VECES: la primera versión
     leía la hoja `RESERVATIONS`, que está muerta desde la v10. Habría listado
     huérfanas de una hoja que nadie usa y no habría mirado una sola reserva
     real. Lo cazó `test-reservas`, que cuenta cuántos sitios nombran esa hoja
     justamente para que no vuelva a haber dos fuentes del mismo número. */
  check('se lee MATERIAL_LOCKS y NO la hoja RESERVATIONS, que está muerta',
    /getSheetByName\('MATERIAL_LOCKS'\)[\s\S]{0,900}reservahuerfana/
      .test(A.sinComentarios(GS)));
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('el orden: lo que no cuadra va antes de lo que es sólo feo');
{
  const w = mundoBarrido([], [ENTREGA('INC-2', 'Arrived')], null);
  const AC = w.AC;
  w.ctx.dqReadRows_ = () => [
    fila(AC, { de: 'INC-1' }),
    // dos formas de escribir lo mismo → una de ortografía
    fila(AC, { name: 'BS10' }), fila(AC, { name: 'BS 10' })
  ];
  const res = w.correr();
  const pos = k => res.findings.findIndex(f => f.kind === k);
  check('hay de las dos clases para poder comparar',
    pos('sinentrada') !== -1 && pos('spelling') !== -1,
    res.findings.map(f => f.kind));
  check('la entrega sin entrada va ANTES que el nombre mal escrito — una es ' +
        'stock sin contar, la otra un informe algo más feo',
    pos('sinentrada') < pos('spelling'),
    { sinentrada: pos('sinentrada'), spelling: pos('spelling') });
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('en el navegador: el enlace se ve, y no propaga nada');
{
  const sin = A.sinComentarios(HTML);
  check('`_entradasDeLaEntrega` devuelve una LISTA, no una fila: una entrega ' +
        'puede ser tres movimientos',
    /function _entradasDeLaEntrega\(id\)\{?[\s\S]{0,400}out\.push/.test(sin));
  check('la insignia sólo se pone en las que llegaron',
    /st0 === 'arrived' \|\| st0 === 'received'/.test(sin));
  check('y se calla cuando todavía no hay nada atado — el mismo silencio que ' +
        'en el servidor, y por el mismo motivo',
    /_hayEntregasAtadas\(\)/.test(sin) &&
    /function _hayEntregasAtadas\(/.test(sin));
  check('el clic reutiliza la maquinaria que ya llevaba a una fila y la ' +
        'encendía, en vez de escribir una segunda',
    /_verLaEntradaDeLaEntrega[\s\S]{0,500}_showMovementRows\(/.test(sin));
  /* ── ESTA COMPROBACIÓN SE QUEDÓ HUÉRFANA EN LA v16.2 ──────────────────────
   *
   * Buscaba el texto del AVISO de la v16.0 —«this delivery already has its
   * entry; correcting the delivery does not change the movement»— y la v16.2
   * sustituyó ese aviso por el cuadro que pregunta. O sea: desde entonces
   * buscaba una frase que la app ya no dice.
   *
   * Lo que se defiende sigue siendo lo mismo —que la app DIGA algo, en vez de
   * dejar las dos cosas desalineadas en silencio— sólo que ahora lo dice
   * preguntando. Así que se mide eso: que al guardar una entrega que ya tiene
   * entrada se llame a la oferta. Las dos respuestas, el texto y lo que no se
   * ofrece están medidos en el bloque de abajo. */
  check('al corregir una entrega que ya tiene entrada, la app DICE algo — ' +
        'preguntando, desde la v16.2',
    /if \(id\) _ofrecerCorregirLaEntrada\(id, antesDeEditar, payload\);/.test(sin));

  /* ── LO QUE CAMBIÓ EL 23/11, Y POR QUÉ ESTA COMPROBACIÓN SE REESCRIBE ──────
   *
   * Aquí decía: *"en todo el camino de guardar una entrega no puede aparecer
   * una llamada que modifique un movimiento"*. Y seguía pasando en verde
   * después de que la app empezara a propagar — porque la llamada se fue a
   * `_propagarALaEntrada`, que es otra función. **Una prueba que pasa por
   * dónde está escrito el código y no por lo que el código hace**, que es el
   * fallo que este repositorio lleva meses cazando, esta vez en mí.
   *
   * Jose, 23/11: *"quiero que cada vez que se corrija un incoming que ya tiene
   * entry, la app le dé al usuario la opción… y el usuario debe decir sí o
   * no."* Así que la regla ya no es «no se propaga»: es **no se propaga sin que
   * alguien diga que sí**. Eso es lo que hay que medir. */
  const guardar = A.fnSrc(HTML, 'saveIncomingItem') || '';
  check('se pudo leer el camino de guardar una entrega', guardar.length > 400,
    guardar.length);
  check('guardar una entrega NO escribe en un movimiento por su cuenta: todo ' +
        'pasa por la oferta', !/modifyMovement/.test(A.sinComentarios(guardar)) &&
    /_ofrecerCorregirLaEntrada\(/.test(A.sinComentarios(guardar)));

  const oferta = A.sinComentarios(A.fnSrc(HTML, '_ofrecerCorregirLaEntrada') || '');
  const propaga = A.sinComentarios(A.fnSrc(HTML, '_propagarALaEntrada') || '');
  check('la oferta existe y se pudo leer', oferta.length > 600, oferta.length);
  check('...y pregunta, con dos respuestas de verdad — sí y no',
    /_showConfirm\(/.test(oferta) && /confirmText/.test(oferta) && /cancelText/.test(oferta));
  check('...y nombra el dato que cambió, de qué a qué: «se cambió X dato» ' +
        'escrito como lo pidió Jose',
    /etiqueta \+ ': ' \+ _valorLegible\(antes/.test(oferta));
  /* LA ESCRITURA SÓLO CUELGA DEL SÍ. Se mira que la ÚNICA mención de
     `_propagarALaEntrada` en la oferta esté detrás de `onConfirm`: si apareciera
     en otro sitio —un atajo, un «si sólo cambió el PO hazlo solo»— habría un
     camino que propaga sin preguntar, que es exactamente lo que Jose pidió que
     no pasara. */
  const menciones = (oferta.match(/_propagarALaEntrada/g) || []).length;
  check('`_propagarALaEntrada` se nombra UNA vez en la oferta', menciones === 1,
    menciones);
  check('...y es detrás de `onConfirm`: no hay camino que propague sin un sí',
    /onConfirm[^}]*_propagarALaEntrada\(/.test(oferta.replace(/\s+/g, ' ')));

  /* Y LAS DOS COSAS QUE NO SE OFRECEN. Son las que impiden que «propagar» se
     coma el único número correcto de los tres. */
  check('un campo que el movimiento YA tenía distinto no se ofrece: lo corrigió ' +
        'una persona y tiene razón — es el caso de las dos que llegaron rotas',
    /enPaso/.test(oferta) && /corrected by hand/.test(oferta));
  check('la CANTIDAD no se ofrece si la entrega se repartió en varios ' +
        'movimientos: «pon 25» no tiene una respuesta única',
    /mueveStock && suyas\.length > 1/.test(oferta));
  check('...y cuando algo no se ofrece, se DICE por qué en vez de callarse',
    /bloqueados/.test(oferta) && /masLabel/.test(oferta));
  check('y se avisa sin adornos de que cambiar la cantidad mueve el inventario',
    /moves your stock/.test(oferta));

  check('la escritura pasa por `modifyMovement`, la misma puerta que el ' +
        'formulario de editar — ahí viven la comprobación de fila movida, el ' +
        'recálculo del MatID y la auditoría',
    /processMovement\('modifyMovement'/.test(propaga) &&
    /expectedCategory/.test(propaga) && /expectedName/.test(propaga));
  check('...con un motivo que NOMBRA la entrega, porque «se cambió porque sí» ' +
        'no se puede comprobar dentro de un año',
    /reason: 'Delivery ' \+ id \+ ' was corrected/.test(propaga));
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('y nadie puede reescribir de dónde vino');
{
  /* LA MISMA GARANTÍA QUE `IMPORT_ID`, y por el mismo motivo. H-22 fue esto:
     «deshacer una importación» reconocía sus filas por el TEXTO DEL COMENTARIO,
     y el comentario es editable, así que corregir un comentario sacaba la fila
     de su importación. La procedencia tiene que vivir en una columna que
     ningún formulario toque.
     `modifyMovement` escribe sólo lo que está en su mapa `FIELDS`. */
  const mod = A.fnSrc(GS, 'modifyMovementLocked_') || '';
  check('se pudo leer el editor de movimientos', mod.length > 800, mod.length);
  const campos = /var FIELDS = \{[\s\S]*?\n  \};/.exec(mod);
  check('...y su lista blanca de campos', !!campos);
  check('`FROM_INCOMING` NO está en ella: editar un movimiento no puede ' +
        'cambiar de qué entrega vino',
    !!campos && !/FROM_INCOMING/.test(campos[0]));
  check('...ni `IMPORT_ID`, que es el precedente de esta regla',
    !!campos && !/IMPORT_ID/.test(campos[0]));
}

m.fin();
