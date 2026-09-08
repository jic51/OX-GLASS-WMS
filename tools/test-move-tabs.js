// LA MITAD DE LOS DATOS ES PEOR QUE NINGUNO.
//
// Jose grabó esto el 2026-09-08 y me costó tres recordatorios mirarlo. Material
// SCREEN / "44 NORTH", 142 unidades, TODAS en el estante C3B.
//
// En EXIT queda relleno C3B / 142. Pasa a TRANSFER y la fila conserva **142** y
// pierde **C3B**, así que queda una fila que dice `? unknown rack` con una
// cantidad de verdad dentro. Una fila que PARECE rellena y no lo está. Luego él
// pulsa el chip de C3B, que añade la fila buena, y el marcador de arriba dice
// **284** — de un material del que hay 142 en todo el almacén.
//
// Y al abrir "Source rack" salían `2PER SAGE@COMPASS`, `565 REDWOOD`, `A`,
// `A1A`… todos los sitios que existen, proyectos y direcciones incluidos.
//
// LO QUE LO CIERRA: LA APP YA LO SABÍA. Tres líneas más arriba, en el mismo
// formulario, ponía "CLICK A RACK TO ADD IT AS A TRANSFER ROW: C3B 142". Y la
// pestaña ADJUST, en el mismo vídeo, abría con C3B ya puesto. El dato correcto
// estaba ahí y se usaba en una pestaña y no en la otra.
//
// LO QUE ESTE ARCHIVO PROTEGE:
//
//   1. Que el estante y la cantidad viajen JUNTOS o no viaje ninguno.
//   2. Que cuando el material está en VARIOS estantes no se elija uno por la
//      persona — no se sabe a cuál fue, y adivinar es peor que preguntar.
//   3. Que una fila sin estante NO sume al total.
//   4. Que la lista de estantes de origen sea la de ESE material.
//
// Se EJECUTAN las funciones de verdad contra un DOM falso mínimo.
//
// Uso:  node tools/test-move-tabs.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
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

// ── Un DOM falso con lo justo que estas funciones tocan ─────────────────────
// Sólo entiende las formas de selector que aparecen en el código de verdad. Un
// motor más listo sería más código sin más verdad.
function El(cls, id){
  this.cls = cls || ''; this.id = id || '';
  this.value = ''; this.innerHTML = ''; this.textContent = '';
  this.style = {}; this.attrs = {}; this.kids = [];
  this.dataset = {};
  this.classList = { _s: new Set((cls||'').split(' ').filter(Boolean)),
    add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); },
    contains(c){ return this._s.has(c); } };
}
El.prototype.setAttribute = function(k, v){ this.attrs[k] = v; };
El.prototype.getAttribute = function(k){ return this.attrs[k]; };
El.prototype.querySelector = function(sel){
  const c = sel.replace('.', '');
  for (const k of this.kids) if (k.cls.split(' ').indexOf(c) !== -1) return k;
  return null;
};
El.prototype.querySelectorAll = function(sel){
  const c = sel.replace('.', '');
  return this.kids.filter(k => k.cls.split(' ').indexOf(c) !== -1);
};

function mundo(stock, tipo){
  const ids = {};
  const mk = (id, cls) => (ids[id] = new El(cls, id));
  mk('mType'); mk('mName'); mk('mQty'); mk('mSrc'); mk('mDest');
  mk('moveMatTotal'); mk('transferChipsBox'); mk('transferSrcRacks');
  mk('transferRowsContainer');
  ids.transferChipsBox.style.display = 'none';

  const doc = {
    getElementById: (id) => ids[id] || null,
    querySelector(sel){ const r = this.querySelectorAll(sel); return r.length ? r[0] : null; },
    querySelectorAll(sel){
      const m = sel.match(/^#([\w-]+)\s+\.([\w-]+)$/);
      if (m) {
        const host = ids[m[1]];
        if (!host) return [];
        const out = [];
        // filas directas, y dentro de cada fila sus campos
        host.kids.forEach(k => {
          if (k.cls.split(' ').indexOf(m[2]) !== -1) out.push(k);
          k.kids.forEach(kk => { if (kk.cls.split(' ').indexOf(m[2]) !== -1) out.push(kk); });
        });
        return out;
      }
      return [];
    }
  };

  const c = vm.createContext({
    document: doc, console, String, Number, Math, Object, Array, JSON,
    stockData: stock,
    currentMoveType: tipo,
    _normKey: (v) => String(v || '').toUpperCase().replace(/\s+/g, ' ').trim(),
    nt: (v) => String(v || '').toUpperCase().trim(),
    _qty: (v) => Math.max(0, parseFloat(v) || 0),
    _he: (s) => String(s == null ? '' : s),
    _escAttr: (s) => String(s == null ? '' : s),
    _findLock: () => null,
    checkStock: () => {}, _updateMoveSubmitState: () => {},
    updateMatLineNameList: () => {}, syncMatLineQty: () => {},
    updateMultiMatTotal: () => {}, updateExitMatNameList: () => {},
    syncExitRackAvail: () => {}, syncExitMatTotal: () => {},
    updateMultiExitTotal: () => {}, _syncAdjustCount: () => {},
    _readAdjust: () => ({ delta: 0 })
  });
  vm.runInContext([
    fnSrc('_soleRackFor'), fnSrc('_syncTransferSrcRacks'),
    fnSrc('renderTransferLocPicker'), fnSrc('validateTransferRows'),
    fnSrc('_syncMoveMatTotal'), fnSrc('_applyMoveMaterial')
  ].join('\n'), c);

  return {
    ctx: c, ids,
    // Una fila de transferencia, como la construye addTransferRow.
    fila(rack, qty){
      const row = new El('transfer-row');
      const r = new El('tr-rack'); r.value = rack || ''; r.attrs.list = 'transferSrcRacks';
      const q = new El('tr-qty');  q.value = qty  || '';
      const a = new El('exit-avail neutral');
      const d = new El('tr-dest');
      row.kids = [r, q, a, d];
      ids.transferRowsContainer.kids.push(row);
      return row;
    },
    aplicar(m){ c.m = m; vm.runInContext('_applyMoveMaterial(m)', c); },
    total(){ vm.runInContext('_syncMoveMatTotal()', c); return ids.moveMatTotal.textContent; }
  };
}

// El almacén del vídeo: 142 de "44 NORTH", todas en C3B.
const UN_ESTANTE = { 'SCREEN|||44 NORTH': { warehouseLocs: { 'C3B': 142 } } };
// Y uno repartido, que es el caso en que adivinar sería peor.
const VARIOS = { 'SCREEN|||44 NORTH': { warehouseLocs: { 'C3B': 100, 'A1A': 42 } } };

console.log('\n═══ de Exit a Transfer, con el material en UN estante ═══\n');
{
  const m = mundo(UN_ESTANTE, 'TRANSFER');
  m.fila('', '');                       // la fila vacía con la que abre TRANSFER
  m.aplicar({ cat: 'SCREEN', name: '44 NORTH', qty: 142 });

  const row  = m.ids.transferRowsContainer.kids[0];
  const rack = row.querySelector('.tr-rack').value;
  const qty  = row.querySelector('.tr-qty').value;

  check('el estante viene puesto (' + rack + ') — la app ya lo sabía: lo enseña ' +
        'en los chips tres líneas más arriba y lo usa en la pestaña Adjust',
    rack === 'C3B');
  check('y la cantidad también (' + qty + ')', String(qty) === '142');
  check('YA NO QUEDA UNA FILA CON CANTIDAD Y SIN ESTANTE — que es exactamente ' +
        'lo que producía el "? unknown rack" con 142 dentro',
    !(qty && !rack));
}

console.log('\n═══ con el material repartido en VARIOS estantes ═══\n');
{
  const m = mundo(VARIOS, 'TRANSFER');
  m.fila('', '');
  m.aplicar({ cat: 'SCREEN', name: '44 NORTH', qty: 142 });

  const row  = m.ids.transferRowsContainer.kids[0];
  const rack = row.querySelector('.tr-rack').value;
  const qty  = row.querySelector('.tr-qty').value;

  check('no se elige estante por la persona — la app no sabe a cuál fue, y ' +
        'poner el más lleno sería decidir por ella a qué balda caminó',
    rack === '');
  check('Y TAMPOCO SE DEJA LA CANTIDAD SOLA. Ésta es la línea entera del ' +
        'arreglo: o viajan las dos cosas, o no viaja ninguna. Media ' +
        'información deja una fila que parece rellena y no lo está',
    qty === '');
}

console.log('\n═══ el total no cuenta una fila sin estante ═══\n');
{
  const m = mundo(UN_ESTANTE, 'TRANSFER');
  m.fila('', 142);       // la huérfana del vídeo
  m.fila('C3B', 142);    // la buena, añadida con el chip
  check('el marcador dice 142, no 284 — 284 era más de lo que hay en todo el ' +
        'almacén, y es un número sobre el que alguien decide',
    m.total() === '142');

  const m2 = mundo(UN_ESTANTE, 'TRANSFER');
  m2.fila('C3B', 100);
  m2.fila('A1A', 42);
  check('dos filas buenas sí suman las dos', m2.total() === '142');
}

console.log('\n═══ la lista de estantes de origen ═══\n');
{
  const m = mundo(UN_ESTANTE, 'TRANSFER');
  const row = m.fila('', '');
  m.ids.mType.value = 'SCREEN';
  m.ids.mName.value = '44 NORTH';
  vm.runInContext('renderTransferLocPicker()', m.ctx);

  const dl = m.ids.transferSrcRacks.innerHTML;
  check('ofrece C3B', /value="C3B"/.test(dl));
  check('Y NADA MÁS — antes salía todo el edificio, proyectos y direcciones ' +
        'incluidos, para un material que sólo estaba en C3B',
    (dl.match(/<option/g) || []).length === 1);
  check('con cuánto hay, para no tener que mirar dos veces',
    /142 in stock/.test(dl));
  check('y la casilla apunta a esa lista',
    row.querySelector('.tr-rack').getAttribute('list') === 'transferSrcRacks');
}

{
  const m = mundo(UN_ESTANTE, 'TRANSFER');
  const row = m.fila('', '');
  m.ids.mType.value = 'SCREEN';
  m.ids.mName.value = 'ALGO QUE NO EXISTE';
  vm.runInContext('renderTransferLocPicker()', m.ctx);
  check('si la app no reconoce el material, la casilla vuelve a ofrecer TODOS ' +
        'los estantes — un desplegable vacío se lee como una casilla rota',
    row.querySelector('.tr-rack').getAttribute('list') === 'rackList');
}

{
  const m = mundo(UN_ESTANTE, 'TRANSFER');
  const row = m.fila('', '');
  m.ids.mType.value = 'SCREEN';
  m.ids.mName.value = '';
  vm.runInContext('renderTransferLocPicker()', m.ctx);
  check('y sin material escrito tampoco se queda con las sugerencias del ' +
        'material anterior',
    row.querySelector('.tr-rack').getAttribute('list') === 'rackList');
}

// ── Lo que se lee del archivo ───────────────────────────────────────────────
console.log('\n═══ y que no vuelva por la puerta de atrás ═══\n');
{
  check('ninguna casilla de estante de origen se construye ya contra la lista ' +
        'completa del edificio',
    !/class="tr-rack" list="rackList"/.test(HTML));
  const waste = fnSrc('_applyMoveMaterial');
  check('WASTE sigue la misma regla: su origen también es un estante',
    /currentMoveType === 'WASTE'/.test(waste) && /_soleRackFor\(m\.cat, name\)/.test(waste));
  check('RETURN no: su origen es una obra, que la app no puede saber — y se ' +
        'dice, en vez de adivinarlo', /RETURN does NOT/.test(waste));
}

console.log('\n' + '─'.repeat(72));
console.log('El dato correcto ya estaba en la pantalla: los chips lo enseñaban');
console.log('tres líneas más arriba. El fallo no era falta de información, era');
console.log('una pestaña que no usaba la que la de al lado ya tenía.');
console.log('─'.repeat(72));

console.log('\nmove tabs: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
