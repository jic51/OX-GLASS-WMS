// UNA LOCACIÓN VACÍA SE PUEDE BORRAR — Y UNA QUE NO LO ESTÁ, NO.
//
// Hasta la v11.62 la pantalla de Locations sólo sabía ARCHIVAR. La razón está
// escrita en el código y es buena: cada movimiento que entró o salió de una
// locación la nombra, así que quitarla dejaría ese historial señalando a algo
// que ya no existe.
//
// Jose vio la otra mitad del problema, la que el argumento no cubre:
//
//   "SI LA LOCACION NO TIENE NADA DENTRO SE LA DEBE PODER BORRAR, ESO NO
//    CAMBIA EL HISTORIAL PERO YA NO APARECE EN LA LISTA."
//
// Tiene razón. Un estante que nadie usó nunca no es historia de nada, y
// mandarlo al archivo para siempre no es archivar, es acumular.
//
// PERO AL ABRIR ESA PUERTA APARECIÓ ALGO PEOR, Y ES LA MITAD SERIA DE ESTE
// ARCHIVO: saveLocationLayout recibe la lista ENTERA desde el navegador y la
// escribe tal cual. O sea que dejar un nombre fuera del arreglo SIEMPRE ha
// bastado para borrar una locación — incluida una con material adentro, que
// habría dejado ese stock existiendo, contado, y mostrado bajo un nombre que
// ya no está en ninguna lista. Nadie lo había hecho porque la pantalla no
// ofrecía el botón. El agujero estaba abierto igual.
//
// LO QUE ESTE ARCHIVO PROTEGE:
//
//   1. Que la regla viva EN EL SERVIDOR. El botón del navegador decide qué
//      OFRECER; el servidor decide qué se PUEDE. Si sólo estuviera en el
//      navegador, esto no sería una regla, sería una sugerencia.
//   2. Las tres cosas que retienen una locación: stock adentro, un candado
//      sobre ella, y un candado que la nombra como destino permitido.
//   3. Que un candado LIBERADO no retenga nada. Sólo los ACTIVE cuentan.
//   4. Que el historial NO retenga. Es la decisión de Jose y es la que hace
//      que esto sirva de algo — si la historia bloqueara, casi nada se podría
//      borrar nunca.
//   5. Que borrar la locación se lleve su FOTO. Si no, queda un archivo en
//      Drive que nadie abrirá jamás y una fila que nadie leerá.
//   6. Que crear acepte VARIAS de una vez, separadas por coma — y que NO parta
//      por espacios, porque "BACK ROOM" es un nombre legítimo y un separador
//      que vuelve imposible escribir un nombre es peor que uno que a veces
//      pide una coma.
//   7. Que el navegador y el servidor estén de acuerdo sobre qué es "vacía".
//      Dos definiciones distintas serían un botón que aparece y luego falla.
//
// Se EJECUTAN las funciones de verdad, sacadas de los dos archivos.
//
// Uso:  node tools/test-locations.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const GS   = fs.readFileSync(path.join(ROOT, 'Code_v3_fixed.gs'), 'utf8');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
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

// ── Una hoja falsa que se comporta como una de verdad ───────────────────────
function Hoja(nombre, filas, maxRows){
  this.nombre = nombre;
  this.rows = filas.map(r => r.slice());
  this._maxRows = maxRows || 200;
}
// La comilla NO forma parte del valor: Sheets la usa para decir "esto es texto,
// no lo interpretes" y la quita al guardar. Desde la v11.63 writeConfigColumn_
// protege así cada nombre del catálogo (una locación llamada "07-6329" se
// convertía en fecha), de modo que una hoja falsa que se quedara la comilla
// mediría el arreglo mal en las dos direcciones.
function comoSheets(v){
  return (typeof v === 'string' && v.charAt(0) === "'") ? v.slice(1) : v;
}

Hoja.prototype.getName       = function(){ return this.nombre; };
Hoja.prototype.getLastRow    = function(){ return this.rows.length; };
Hoja.prototype.getMaxRows    = function(){ return this._maxRows; };
Hoja.prototype.getMaxColumns = function(){ return 30; };
Hoja.prototype.insertRowsAfter = function(a, n){ this._maxRows += n; };
Hoja.prototype.deleteRow     = function(r){ this.rows.splice(r - 1, 1); };
Hoja.prototype.getDataRange  = function(){
  const self = this;
  return { getValues: () => self.rows.map(r => r.slice()) };
};
Hoja.prototype.getRange = function(r, c, nr, nc){
  const self = this; nr = nr || 1; nc = nc || 1;
  return {
    getValue: () => (self.rows[r - 1] || [])[c - 1],
    setValue(v){
      while (self.rows.length < r) self.rows.push([]);
      self.rows[r - 1][c - 1] = comoSheets(v);
      return { setFontWeight: () => {} };
    },
    getValues(){
      const out = [];
      for (let i = 0; i < nr; i++) {
        const row = self.rows[r - 1 + i] || [];
        const s = [];
        for (let j = 0; j < nc; j++) s.push(row[c - 1 + j] !== undefined ? row[c - 1 + j] : '');
        out.push(s);
      }
      return out;
    },
    setValues(vals){
      for (let i = 0; i < vals.length; i++) {
        while (self.rows.length <= r - 1 + i) self.rows.push([]);
        for (let j = 0; j < vals[i].length; j++) self.rows[r - 1 + i][c - 1 + j] = comoSheets(vals[i][j]);
      }
    },
    clearContent(){
      for (let i = 0; i < nr; i++) {
        const row = self.rows[r - 1 + i];
        if (!row) continue;
        for (let j = 0; j < nc; j++) row[c - 1 + j] = '';
      }
    },
    setNumberFormat(){ return this; },
    setFontWeight(){ return this; }
  };
};

// CONFIG: A=Projects B=Categories C=Suppliers D=Locations E=Location Type
function config(locs){
  const filas = [['Projects','Categories','Suppliers','Locations','Location Type']];
  locs.forEach(l => filas.push(['', '', '', l.name, l.type || 'RACK']));
  return new Hoja('CONFIG', filas);
}

// LIVE_STOCK: A=Category B=Name C=Project D=Location E=Qty
function live(rows){
  const filas = [['Category','Name','Project','Location','Qty','Unit','Location_Type','Last_Updated']];
  rows.forEach(r => filas.push([r.cat || 'GLASS', r.name || 'MH 145', '', r.loc, r.qty, 'UNIT', 'RACK', new Date()]));
  return new Hoja('LIVE_STOCK', filas);
}

// MATERIAL_LOCKS: A=ID B=MatId C=Category D=Name E=Rack F=AllowedDest G=Reason
//                 H=LockedBy I=LockedAt J=Status
function locks(rows){
  const filas = [['ID','MatId','Category','Name','Rack','AllowedDestinations','Reason','LockedBy','LockedAt','Status']];
  rows.forEach((r, i) => filas.push(['L' + i, 'MAT' + i, 'GLASS', 'MH 145', r.rack,
                                     r.dest || '', 'porque sí', 'jose@ox.com', new Date(),
                                     r.status || 'ACTIVE']));
  return new Hoja('MATERIAL_LOCKS', filas);
}

function photos(rows){
  const filas = [['Location','PhotoURL','UploadedBy','UploadedAt']];
  rows.forEach(r => filas.push([r.loc, r.id, 'jose@ox.com', new Date()]));
  return new Hoja('RACK_PHOTOS', filas);
}

function mundo(opts){
  opts = opts || {};
  const hojas = {
    CONFIG:          config(opts.locations || [{ name:'A1A' }, { name:'A1B' }, { name:'A1C' }]),
    LIVE_STOCK:      live(opts.stock  || []),
    MATERIAL_LOCKS:  locks(opts.locks || []),
    RACK_PHOTOS:     photos(opts.photos || [])
  };
  const auditadas = [], basura = [], cacheBorrado = [];

  const c = vm.createContext({
    Date, Math, String, Number, JSON, Array, Object, console,
    SHEETS: { CONFIG: 'CONFIG', LIVE: 'LIVE_STOCK' },
    sheetSafe_: (v) => v,
    auditLog_: function(){ auditadas.push(Array.prototype.slice.call(arguments, 1)); },
    requireAuth_: () => ({ email: 'jose@ox.com', role: 'ADMIN' }),
    trashFileQuietly_: (id) => { if (id) basura.push(id); },
    CacheService: { getScriptCache: () => ({ remove: (k) => cacheBorrado.push(k) }) },
    SpreadsheetApp: { getActiveSpreadsheet: () => c.ss },
    ss: { getSheetByName: (n) => hojas[n] || null }
  });

  ['textCell_', 'writeConfigColumn_', 'saveLocationLayout', 'removedLocations_',
   'locationUsage_', 'locationBlockReason_', 'forgetRackPhotos_'].forEach(n => {
    vm.runInContext(fnSrc(GS, n), c);
  });

  return { c, hojas, auditadas, basura, cacheBorrado,
           run: (expr) => vm.runInContext(expr, c) };
}

function guardar(m, lista){
  return m.run('saveLocationLayout(' + JSON.stringify({ locations: lista }) + ', null)');
}
function fallo(fn){
  try { fn(); return null; } catch (e) { return e.message || String(e); }
}
function columna(hoja, col){
  return hoja.rows.slice(1).map(r => r[col - 1]).filter(v => v !== '' && v !== undefined);
}

console.log('\n── EL SERVIDOR: qué retiene una locación ──────────────────────\n');

{
  const m = mundo({
    stock: [{ loc: 'A1A', qty: 142 }],
    locks: [{ rack: 'A1B', dest: 'A1C' }]
  });
  const use = m.run('locationUsage_(ss)');

  check('el stock se cuenta contra su locación',        use['A1A'] && use['A1A'].qty === 142);
  check('un candado se cuenta contra su estante',       use['A1B'] && use['A1B'].locked === 1);
  check('un destino permitido se cuenta también',       use['A1C'] && use['A1C'].allowed === 1);

  const razon = (n) => m.run('locationBlockReason_(' + JSON.stringify(use) + ', ' + JSON.stringify(n) + ')');
  check('con stock, la razón nombra las unidades',      /142 unit/.test(razon('A1A')));
  check('con candado, la razón lo dice',                /locked/.test(razon('A1B')));
  check('como destino permitido, la razón lo dice',     /allowed destination/.test(razon('A1C')));
  check('una locación libre no da ninguna razón',       razon('Z9Z') === '');
  check('la razón no distingue mayúsculas',             /142 unit/.test(razon('a1a')));
}

{
  // Un candado liberado no es un candado. Si contara, un estante quedaría
  // retenido para siempre por algo que ya nadie está aplicando.
  const m = mundo({ locks: [{ rack: 'A1B', dest: 'A1C', status: 'RELEASED' }] });
  const use = m.run('locationUsage_(ss)');
  check('un candado liberado no retiene el estante',    !use['A1B'] || !use['A1B'].locked);
  check('ni su destino permitido',                      !use['A1C'] || !use['A1C'].allowed);
}

{
  // Cantidad cero en LIVE_STOCK es una fila que sobró, no material. Si contara,
  // ninguna locación que alguna vez tuvo algo se podría borrar nunca.
  const m = mundo({ stock: [{ loc: 'A1A', qty: 0 }] });
  const use = m.run('locationUsage_(ss)');
  check('una fila con cantidad 0 no retiene nada',      !use['A1A'] || use['A1A'].qty === 0);
}

console.log('\n── EL SERVIDOR: qué se deja escribir ──────────────────────────\n');

{
  const m = mundo({ stock: [{ loc: 'A1A', qty: 142 }] });
  const err = fallo(() => guardar(m, [{ name:'A1B' }, { name:'A1C' }]));
  check('borrar una con stock se rechaza',              !!err);
  check('y el error dice CUÁL y POR QUÉ',               /A1A/.test(err) && /142/.test(err));
  check('y ofrece la salida que sí existe',             /[Aa]rchive/.test(err));
  check('nada se escribió: la lista quedó igual',
        columna(m.hojas.CONFIG, 4).join(',') === 'A1A,A1B,A1C');
}

{
  const m = mundo({ locks: [{ rack: 'A1A' }] });
  const err = fallo(() => guardar(m, [{ name:'A1B' }, { name:'A1C' }]));
  check('borrar una con candado se rechaza',            !!err && /A1A/.test(err));
}

{
  const m = mundo({ locks: [{ rack: 'A1B', dest: 'A1A' }] });
  const err = fallo(() => guardar(m, [{ name:'A1B' }, { name:'A1C' }]));
  check('borrar un destino permitido se rechaza',       !!err && /A1A/.test(err));
}

{
  // El caso de Jose: la locación que se creó por error y nunca se usó.
  const m = mundo({ stock: [{ loc: 'A1B', qty: 5 }] });
  const err = fallo(() => guardar(m, [{ name:'A1B' }, { name:'A1C' }]));
  check('borrar una VACÍA se permite',                  err === null);
  check('y desaparece de la lista',
        columna(m.hojas.CONFIG, 4).join(',') === 'A1B,A1C');
  // auditLog_(ss, action, user, details, oldValue, newValue) — el stub quita el
  // `ss`, así que a[0]=action, a[2]=details ('locations'), a[3]=op, a[4]=detalle.
  const linea = m.auditadas.find(a => a[2] === 'locations');
  check('la auditoría dice que hubo un borrado',        !!linea && /delete/.test(linea[3]));
  check('y nombra la que se fue',                       !!linea && /A1A/.test(linea[4]));
}

{
  // El historial NO retiene, y es a propósito. Esta es la decisión de Jose y
  // sin ella nada de esto serviría: casi toda locación tiene historia.
  const m = mundo({ stock: [] });   // sin stock en ninguna, aunque hubo movimientos
  const err = fallo(() => guardar(m, [{ name:'A1B' }, { name:'A1C' }]));
  check('haber tenido movimientos no retiene nada',     err === null);
}

{
  const m = mundo();
  const err = fallo(() => guardar(m, []));
  check('vaciar la lista entera se sigue rechazando',   !!err && /required/i.test(err));
}

{
  // Reordenar no es borrar. Si removedLocations_ se equivocara aquí, cada
  // arrastre pediría permiso para borrar lo que sólo se movió de sitio.
  const m = mundo({ stock: [{ loc: 'A1A', qty: 9 }] });
  const err = fallo(() => guardar(m, [{ name:'A1C' }, { name:'A1A' }, { name:'A1B' }]));
  check('reordenar con stock adentro no se rechaza',    err === null);
  check('y el orden nuevo se escribió',
        columna(m.hojas.CONFIG, 4).join(',') === 'A1C,A1A,A1B');
}

{
  const m = mundo({ stock: [{ loc: 'A1A', qty: 9 }] });
  // Escrita distinto, es la misma locación. Sin esto, cambiarle la caja a un
  // nombre contaría como borrar el viejo y crear otro.
  const err = fallo(() => guardar(m, [{ name:'a1a' }, { name:'A1B' }, { name:'A1C' }]));
  check('mayúsculas distintas no cuentan como borrado', err === null);
}

console.log('\n── LA FOTO SE VA CON LA LOCACIÓN ──────────────────────────────\n');

{
  const m = mundo({ photos: [{ loc:'A1A', id:'FILE-A1A' }, { loc:'A1B', id:'FILE-A1B' }] });
  const err = fallo(() => guardar(m, [{ name:'A1B' }, { name:'A1C' }]));
  check('borrar la locación vacía funcionó',            err === null);
  check('su foto se tiró a la papelera de Drive',       m.basura.indexOf('FILE-A1A') !== -1);
  check('la foto de otra locación NO se tocó',          m.basura.indexOf('FILE-A1B') === -1);
  check('la fila de la foto se quitó de la hoja',
        columna(m.hojas.RACK_PHOTOS, 1).join(',') === 'A1B');
  check('y la caché de fotos se invalidó',              m.cacheBorrado.indexOf('rackPhotosV1') !== -1);
}

{
  // Si el guardado se rechaza, la foto tiene que seguir ahí: una foto borrada
  // por un guardado que falló sería una pérdida por una operación que no pasó.
  const m = mundo({ stock: [{ loc:'A1A', qty: 3 }], photos: [{ loc:'A1A', id:'FILE-A1A' }] });
  fallo(() => guardar(m, [{ name:'A1B' }, { name:'A1C' }]));
  check('un guardado rechazado no borra ninguna foto',  m.basura.length === 0);
}

console.log('\n── EL NAVEGADOR: crear varias, y ofrecer el borrado ────────────\n');

// Un contexto mínimo con lo que estas funciones tocan de verdad.
function pantalla(opts){
  opts = opts || {};
  const avisos = [], confirmadas = [];
  const c = vm.createContext({
    Date, Math, String, Number, JSON, Array, Object, console,
    stockData:     opts.stockData || {},
    materialLocks: opts.locks     || [],
    LOC_DEFAULT_GROUP: 'ALL LOCATIONS',
    LOC_ARCHIVED_GROUP: 'ARCHIVED',
    _locLayout:   (opts.layout || []).map(l => ({ name: l, type: 'ALL LOCATIONS' })),
    _locExtraGroups: [],
    _locNewKind:  'location',
    _locTypesInOrder: () => ['ALL LOCATIONS'],
    _redrawLocGroups: () => {},
    _locMarkDirty:    () => { c.sucio = true; },
    sucio: false,
    showToast: (msg, kind) => avisos.push({ msg, kind }),
    _showConfirm: (o) => { confirmadas.push(o); },
    document: {
      getElementById: (id) => (id === 'locNewVal'
        ? { value: opts.typed || '', focus(){}, placeholder:'' }
        : { style: {}, focus(){} })
    }
  });
  ['_locUsage', '_locWhyKept', '_locCreate', '_locDelete'].forEach(n => {
    vm.runInContext(fnSrc(HTML, n), c);
  });
  return { c, avisos, confirmadas, run: (e) => vm.runInContext(e, c) };
}

{
  const p = pantalla({ typed: 'A1A, A1B, A1C' });
  p.run('_locCreate()');
  check('tres nombres separados por coma crean tres',   p.c._locLayout.length === 3);
  check('y en el orden en que se escribieron',
        p.c._locLayout.map(l => l.name).join(',') === 'A1A,A1B,A1C');
  check('el aviso dice cuántas',                        /3 locations added/.test(p.avisos[0].msg));
  check('y recuerda que hay que guardar',               /Save layout/.test(p.avisos[0].msg));
  check('la lista queda marcada como sin guardar',      p.c.sucio === true);
}

{
  // El punto entero de no partir por espacios. Si esto fallara, "BACK ROOM"
  // sería un nombre imposible de escribir en la app.
  const p = pantalla({ typed: 'BACK ROOM' });
  p.run('_locCreate()');
  check('un nombre con espacios queda entero',
        p.c._locLayout.length === 1 && p.c._locLayout[0].name === 'BACK ROOM');
}

{
  const p = pantalla({ typed: 'A1A,,  A1B ,', layout: [] });
  p.run('_locCreate()');
  check('comas de más y espacios sueltos no crean vacíos',
        p.c._locLayout.map(l => l.name).join(',') === 'A1A,A1B');
}

{
  const p = pantalla({ typed: 'A1A, A1B', layout: ['A1A'] });
  p.run('_locCreate()');
  check('una repetida se salta, la otra se crea',
        p.c._locLayout.map(l => l.name).join(',') === 'A1A,A1B');
  check('y el aviso nombra la que ya estaba',           /A1A/.test(p.avisos[0].msg));
}

{
  const p = pantalla({ typed: 'A1A, A1A', layout: [] });
  p.run('_locCreate()');
  check('repetida dentro del mismo texto se crea una vez',
        p.c._locLayout.length === 1);
}

{
  const p = pantalla({ typed: 'A1A', layout: ['A1A'] });
  p.run('_locCreate()');
  check('si no se creó ninguna, no se marca sin guardar', p.c.sucio === false);
  check('y lo dice',                                    /already exists/.test(p.avisos[0].msg));
}

{
  const p = pantalla({
    stockData: { 'glass|||mh 145': { warehouseLocs: { 'A1A': 142, 'A1D': 0 } } },
    locks: [{ rack: 'A1B', allowedDest: ['A1C'] }],
    layout: ['A1A','A1B','A1C','A1D']
  });
  const why = (n) => p.run('_locWhyKept(' + JSON.stringify(n) + ', _locUsage())');
  check('el navegador ve el stock',                     /142 in stock/.test(why('A1A')));
  check('el navegador ve el candado',                   /locked/.test(why('A1B')));
  check('el navegador ve el destino permitido',         /allows moving/.test(why('A1C')));
  check('y una vacía no da razón',                      why('A1D') === '');
}

{
  // Las dos definiciones de "vacía" tienen que coincidir. Si el navegador
  // ofreciera el botón y el servidor lo rechazara, sería un botón que miente.
  const casos = [
    { stock: [{ loc:'A1A', qty: 7 }], locks: [],                          front: { 'glass|||x': { warehouseLocs: { 'A1A': 7 } } }, fLocks: [] },
    { stock: [],                      locks: [{ rack:'A1A' }],            front: {}, fLocks: [{ rack:'A1A' }] },
    { stock: [],                      locks: [{ rack:'Z', dest:'A1A' }],  front: {}, fLocks: [{ rack:'Z', allowedDest:['A1A'] }] },
    { stock: [],                      locks: [],                          front: {}, fLocks: [] }
  ];
  let deAcuerdo = 0;
  casos.forEach(k => {
    const m = mundo({ stock: k.stock, locks: k.locks });
    const srv = m.run('locationBlockReason_(locationUsage_(ss), "A1A")') !== '';
    const p   = pantalla({ stockData: k.front, locks: k.fLocks });
    const nav = p.run('_locWhyKept("A1A", _locUsage())') !== '';
    if (srv === nav) deAcuerdo++;
  });
  check('navegador y servidor coinciden en los 4 casos', deAcuerdo === 4);
}

{
  const p = pantalla({
    stockData: { 'glass|||mh 145': { warehouseLocs: { 'A1A': 142 } } },
    layout: ['A1A']
  });
  p.run('_locDelete("A1A")');
  check('borrar una que se llenó mientras tanto no pregunta, avisa',
        p.confirmadas.length === 0 && p.avisos.length === 1);
  check('y la locación sigue ahí',                      p.c._locLayout.length === 1);
}

{
  const p = pantalla({ layout: ['A1A','A1B'] });
  p.run('_locDelete("A1A")');
  check('borrar una vacía pide confirmación',           p.confirmadas.length === 1);
  check('el aviso promete que ningún número cambia',
        /no number changes/.test(p.confirmadas[0].message));
  check('y explica qué pasa con el historial',
        /keep the name they were recorded with/.test(p.confirmadas[0].message));
  check('todavía no se borró nada',                     p.c._locLayout.length === 2);
  p.confirmadas[0].onConfirm();
  check('al confirmar, se va de la lista',
        p.c._locLayout.map(l => l.name).join(',') === 'A1B');
  check('y queda sin guardar hasta que se pulse Save',  p.c.sucio === true);
}

console.log('\n── LO QUE LA PANTALLA DIBUJA ──────────────────────────────────\n');

{
  const render = fnSrc(HTML, '_renderLocGroup');
  check('la papelera sólo se dibuja si no hay razón para retener',
        /\(why \? '' :/.test(render));
  check('y la razón se cuenta en el botón de archivar',
        /why \+ ' — archive it instead/.test(render));
  check('el uso se calcula una vez por redibujo, no por fila',
        /var use = _locUsage\(\);/.test(fnSrc(HTML, '_redrawLocGroups')));
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobacion(es) ok\n');
process.exit(fail ? 1 : 0);
