// Tests for plan3d-engine.js — run with: node tools/test-engine.js
// No framework on purpose: this has to run anywhere, including a laptop in the shop.
var E = require('./plan3d-engine.js');

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}
function eq(name, a, b, tol) {
  var good = tol == null ? a === b : Math.abs(a - b) <= tol;
  ok(name, good, 'esperado ' + b + ', obtuve ' + a);
}
function group(t) { console.log('\n' + t); }
function codes(v) { return v.items.map(function (i) { return i.code; }); }

group('Unidades');
eq('parseLen("12") = 12 ft', E.parseLen('12'), 144);
eq('parseLen("12\'6\\"")', E.parseLen('12\'6"'), 150);
eq('parseLen("150in")', E.parseLen('150in'), 150);
eq('parseLen("3.5m")', E.parseLen('3.5m'), 137.795, 0.01);
eq('parseLen("") = 0', E.parseLen(''), 0);
ok('fmtFt(138) = 11\' 6"', E.fmtFt(138) === '11\' 6"', E.fmtFt(138));
ok('fmtFt(144) = 12\'', E.fmtFt(144) === "12'", E.fmtFt(144));
ok('fmtFt redondea a 1/8"', E.fmtFt(144.13) === '12\' 0 1/8"', E.fmtFt(144.13));

group('Geometría');
var sq = E.rectCorners({ x: 0, y: 0, w: 100, d: 50, rot: 0 });
eq('rectCorners esquina 2 x', sq[2][0], 100, 1e-9);
var rot = E.rectCorners({ x: 0, y: 0, w: 100, d: 50, rot: 90 });
var bb = E.polyBBox(rot);
eq('rot 90 ancho→profundidad', bb.x1 - bb.x0, 50, 1e-9);
eq('rot 90 profundidad→ancho', bb.y1 - bb.y0, 100, 1e-9);
eq('polyArea 100x50', E.polyArea(sq), 5000, 1e-9);
ok('pointInPoly dentro', E.pointInPoly(50, 25, sq));
ok('pointInPoly fuera', !E.pointInPoly(150, 25, sq));
ok('pointInPolyTol tolera borde', E.pointInPolyTol(100.5, 25, sq, 1));
ok('overlap se detecta', E.polysOverlap(sq, E.rectCorners({ x: 50, y: 0, w: 100, d: 50, rot: 0 })));
ok('sin overlap cuando hay hueco', !E.polysOverlap(sq, E.rectCorners({ x: 120, y: 0, w: 100, d: 50, rot: 0 })));
ok('tocarse no es traslape', !E.polysOverlap(sq, E.rectCorners({ x: 100, y: 0, w: 50, d: 50, rot: 0 }), 0.5));

group('Capacidad por tipo de rack');
var aFrame = { id: 'W1', type: 'ARACK', w: E.inch(12), d: 48, h: 84, levels: 1 };
eq('A-frame 12ft doble cara = 288" de apilado', E.rackCapacity(aFrame).value, 288);
eq('A-frame ~82 ventanas de 3.5"', E.rackCapacity(aFrame).pieces, 82);
eq('cantilever 20ft x 4 niveles = 80 ft lin', E.rackCapacity({ type: 'CANT', w: E.inch(20), levels: 4 }).value, 80);
eq('pallet rack 12ft x 3 = 9 posiciones', E.rackCapacity({ type: 'PALLET', w: E.inch(12), levels: 3 }).value, 9);
eq('estantería 8x2ft x5 = 80 ft²', E.rackCapacity({ type: 'SHELF', w: E.inch(8), d: E.inch(2), levels: 5 }).value, 80, 1e-9);
eq('vertical 10ft slots de 2.5"', E.rackCapacity({ type: 'VRACK', w: E.inch(10), levels: 1 }).value, 48);

group('Validación — casos que deben fallar');
function base() {
  var L = E.emptyLayout(80, 50, 16);
  L.building.openings = [{ id: 'BAY-1', type: 'ROLLUP', wall: 'S', x: E.inch(30), y: E.inch(50), w: E.inch(12), h: E.inch(12) }];
  L.survey.diagA = Math.hypot(E.inch(80), E.inch(50));
  L.survey.diagB = L.survey.diagA;
  return L;
}
var L1 = base();
L1.racks = [{ id: 'X1', type: 'ARACK', x: E.inch(78), y: E.inch(10), w: E.inch(12), d: 48, h: 84 }];
ok('rack fuera del edificio → RACK_OUT', codes(E.validate(L1)).indexOf('RACK_OUT') !== -1);

var L2 = base();
L2.racks = [{ id: 'A', type: 'ARACK', x: 0, y: 0, w: E.inch(20), d: 48, h: 84 },
            { id: 'B', type: 'ARACK', x: E.inch(10), y: 0, w: E.inch(20), d: 48, h: 84 }];
ok('racks traslapados → RACK_OVERLAP', codes(E.validate(L2)).indexOf('RACK_OVERLAP') !== -1);

var L3 = base();
L3.racks = [{ id: 'T', type: 'ARACK', x: E.inch(5), y: E.inch(5), w: E.inch(10), d: 48, h: E.inch(20) }];
ok('rack más alto que el techo → RACK_TALL', codes(E.validate(L3)).indexOf('RACK_TALL') !== -1);

var L4 = base();
L4.racks = [{ id: 'D', type: 'ARACK', x: E.inch(30), y: E.inch(45), w: E.inch(12), d: 48, h: 84 }];
ok('rack frente a la puerta → DOOR_BLOCKED', codes(E.validate(L4)).indexOf('DOOR_BLOCKED') !== -1);

var L5 = base();
L5.survey.diagB = L5.survey.diagA + E.inch(4);   // 4 ft off
ok('diagonales que no cierran → SQUARE_BAD', codes(E.validate(L5)).indexOf('SQUARE_BAD') !== -1);
var L5b = base();
L5b.survey.diagB = L5b.survey.diagA + 4;         // 4 in off
ok('4" de diferencia → SQUARE_OFF', codes(E.validate(L5b)).indexOf('SQUARE_OFF') !== -1);
var L5c = base();
delete L5c.survey.diagA;
ok('sin diagonales → SQUARE_MISSING', codes(E.validate(L5c)).indexOf('SQUARE_MISSING') !== -1);

group('Validación — pasillos y acceso');
var L6 = base();
// Un rack encerrado por tres racks pegados y la pared: no cabe un pasillo de 4 ft.
L6.racks = [
  { id: 'IN',  type: 'ARACK', x: E.inch(20), y: E.inch(20), w: E.inch(6), d: 24, h: 84 },
  { id: 'W1',  type: 'ARACK', x: E.inch(18), y: E.inch(17), w: E.inch(10), d: 24, h: 84 },
  { id: 'W2',  type: 'ARACK', x: E.inch(18), y: E.inch(24), w: E.inch(10), d: 24, h: 84 },
  { id: 'W3',  type: 'ARACK', x: E.inch(17), y: E.inch(17), w: 24, d: E.inch(9), h: 84 },
  { id: 'W4',  type: 'ARACK', x: E.inch(27), y: E.inch(17), w: 24, d: E.inch(9), h: 84 }
];
var v6 = E.validate(L6, { minAisle: 48 });
ok('rack encerrado → NO_ACCESS', codes(v6).indexOf('NO_ACCESS') !== -1, codes(v6).join(','));

var L7 = base();
L7.racks = [{ id: 'OK1', type: 'ARACK', x: E.inch(2), y: E.inch(2), w: E.inch(20), d: 48, h: 84 }];
var v7 = E.validate(L7, { minAisle: 48 });
ok('rack contra la pared con pasillo libre → sin errores', v7.ok, codes(v7).join(','));

group('Propuesta automática');
[[100, 60], [60, 40], [140, 80], [45, 30], [200, 120]].forEach(function (dim) {
  var L = E.suggestLayout({ widthFt: dim[0], depthFt: dim[1] });
  L.survey.diagA = L.survey.diagB = Math.hypot(E.inch(dim[0]), E.inch(dim[1]));
  var v = E.validate(L);
  ok('propuesta ' + dim[0] + 'x' + dim[1] + ' ft valida limpia', v.ok, codes(v).join(','));
  ok('propuesta ' + dim[0] + 'x' + dim[1] + ' cubre las 5 familias',
     ['WINDOW', 'SCREEN', 'MIRROR', 'SHOWER', 'STOREFRONT'].every(function (f) {
       return L.racks.some(function (r) { return E.rackFamily(L, r) === f; });
     }));
});

group('La propuesta esquiva lo que ya está ahí');
var Lo2 = E.suggestLayout({
  widthFt: 97.5, depthFt: 58, clearFt: 18,
  obstacles: [{ id: 'OF', name: 'Oficina', type: 'OFFICE', x: 0, y: 0, w: 240, d: 168, h: 108, rot: 0 }],
  columns: [{ id: 'C1', x: 600, y: 300, w: 10, d: 10 }],
  openings: [{ id: 'BAY-1', type: 'ROLLUP', wall: 'S', x: 480, y: 696, w: 168, h: 168 }]
});
Lo2.survey.diagA = Lo2.survey.diagB = Math.hypot(E.inch(97.5), E.inch(58));
var vo2 = E.validate(Lo2);
ok('propuesta con oficina + columna valida limpia', vo2.ok, codes(vo2).join(','));
ok('usa el portón medido', Lo2.building.openings.some(function (o) { return o.id === 'BAY-1'; }));
ok('ningún rack pisa la oficina', !Lo2.racks.some(function (r) {
  return E.polysOverlap(E.rectCorners(r), E.rectCorners({ x: 0, y: 0, w: 240, d: 168, rot: 0 }), 0.5);
}));
var clipped = E.clipRackRuns(E.normalize({
  building: { outline: E.rectOutline(1200, 720), obstacles: [{ id: 'X', x: 480, y: 0, w: 120, d: 48, h: 96, rot: 0 }] },
  racks: [{ id: 'R1', type: 'ARACK', x: 0, y: 0, w: 1200, d: 48, h: 84 }]
}), 36);
eq('un obstáculo a media corrida parte el rack en dos', clipped.racks.length, 2);
ok('los tramos conservan el ID base', clipped.racks[0].id === 'R1' && clipped.racks[1].id === 'R1-2');
ok('el corte deja holgura al obstáculo', clipped.racks[0].x + clipped.racks[0].w <= 478);
var tiny = E.clipRackRuns(E.normalize({
  building: { outline: E.rectOutline(600, 720), obstacles: [{ id: 'X', x: 24, y: 0, w: 552, d: 48, h: 96, rot: 0 }] },
  racks: [{ id: 'R1', type: 'ARACK', x: 0, y: 0, w: 600, d: 48, h: 84 }]
}), 36);
eq('los pedazos inservibles se descartan', tiny.racks.length, 0);

group('Métricas');
var Lm = E.suggestLayout({ widthFt: 100, depthFt: 60 });
var m = E.metrics(Lm);
eq('área bruta 100x60 = 6000 ft²', Math.round(m.grossSf), 6000);
ok('ocupación entre 10% y 70%', m.utilization > 0.1 && m.utilization < 0.7, (m.utilization * 100).toFixed(1) + '%');
ok('volumen = área x altura libre', Math.abs(m.cubicFt - 6000 * 16) < 1);
ok('agrupa por familia', m.byFamily.length >= 5);

group('Ida y vuelta CSV / filas');
var Lc = E.suggestLayout({ widthFt: 97.5, depthFt: 58.25 });
Lc.building.columns = [{ id: 'C1', x: 300, y: 200, w: 8, d: 8 }];
Lc.building.obstacles = [{ id: 'OF', name: 'Oficina', type: 'OFFICE', x: 0, y: 0, w: 240, d: 180, h: 108, rot: 0 }];
Lc.survey.diagA = 1350.5; Lc.survey.diagB = 1349.25;
var back = E.fromRows(E.toRows(Lc));
eq('racks sobreviven', back.racks.length, Lc.racks.length);
eq('zonas sobreviven', back.zones.length, Lc.zones.length);
eq('columnas sobreviven', back.building.columns.length, 1);
eq('obstáculos sobreviven', back.building.obstacles.length, 1);
eq('contorno sobrevive', back.building.outline[2][0], Lc.building.outline[2][0], 1e-6);
eq('diagonal A sobrevive', back.survey.diagA, 1350.5, 1e-6);
eq('altura libre sobrevive', back.building.clearH, Lc.building.clearH, 1e-6);
eq('rotación sobrevive', back.racks[0].rot, Lc.racks[0].rot, 1e-6);
var back2 = E.fromRows(E.parseCSV(E.toCSV(Lc)));
eq('CSV → mismas filas de rack', back2.racks.length, Lc.racks.length);
eq('CSV conserva el nombre con coma', E.fromRows(E.parseCSV(E.toCSV(
  (function () { var L = E.emptyLayout(10, 10); L.meta.name = 'Bodega, unidad "B"'; return L; })()
))).meta.name, 'Bodega, unidad "B"');

group('Plano SVG');
var svg = E.planSVG(Lm, { width: 1200, height: 800 });
ok('devuelve un <svg>', svg.indexOf('<svg') === 0);
ok('cierra el <svg>', /<\/svg>$/.test(svg));
ok('dibuja cada rack', (svg.match(/<polygon/g) || []).length >= Lm.racks.length);
ok('incluye escala gráfica', svg.indexOf('10 ft') !== -1);
ok('incluye la cota general', svg.indexOf(E.fmtFt(E.inch(100))) !== -1);
ok('escapa el nombre', E.planSVG((function () { var L = E.emptyLayout(10, 10); L.meta.name = '<script>x</script>'; return L; })()).indexOf('<script>') === -1);

group('Ocupación desde el stock del WMS');
var Lo = E.emptyLayout(50, 30);
Lo.racks = [{ id: 'A1A', type: 'ARACK', x: 0, y: 0, w: 120, d: 48, h: 84 },
            { id: 'A1B', type: 'ARACK', x: 200, y: 0, w: 120, d: 48, h: 84 },
            { id: 'BIG', type: 'ARACK', x: 400, y: 0, w: 120, d: 48, h: 84, bays: ['B1A', 'B1B'] }];
var occ = E.occupancyFromRackMap(Lo, { 'A1A': [{ qty: 5 }], 'B1A': [{ qty: 10 }], 'B1B': [{ qty: 10 }] });
eq('rack lleno = 1', occ.occupancy.BIG, 1);
eq('rack a un cuarto', occ.occupancy.A1A, 0.25);
eq('rack vacío = 0', occ.occupancy.A1B, 0);
eq('totales por bahías agregadas', occ.totals.BIG, 20);

group('Conciliación plano ↔ stock');
var Lr = E.emptyLayout(60, 40);
Lr.racks = [{ id: 'A1A', type: 'ARACK', x: 0, y: 0, w: 120, d: 48, h: 84 },
            { id: 'A1B', type: 'ARACK', x: 200, y: 0, w: 120, d: 48, h: 84 }];
var rec = E.reconcileWithStock(Lr, { 'A1A': [{ qty: 4 }], 'Z9Z': [{ qty: 7 }], 'A1B': [{ qty: 0 }] });
ok('detecta ubicación con stock que no está en el plano', rec.missingFromPlan.join() === 'Z9Z', rec.missingFromPlan.join());
ok('detecta rack dibujado y vacío', rec.emptyOnPlan.join() === 'A1B', rec.emptyOnPlan.join());

group('Filtro por familia en el plano');
var Lf = E.suggestLayout({ widthFt: 80, depthFt: 50 });
var svgAll = E.planSVG(Lf), svgFoc = E.planSVG(Lf, { focusFamily: 'WINDOW' });
ok('los racks quedan enlazables por id', svgAll.indexOf('data-rack=') !== -1);
ok('el foco apaga las otras familias', (svgFoc.match(/fill-opacity="0.08"/g) || []).length > 0);
ok('el foco deja las ventanas encendidas', svgFoc.indexOf('fill-opacity="0.55"') !== -1);

group('Robustez');
ok('normalize aguanta {}', !!E.normalize({}).building.outline);
ok('normalize aguanta null', !!E.normalize(null).racks);
ok('validate no explota sin racks', E.validate(E.emptyLayout(20, 20)).items.length >= 0);
ok('planSVG no explota sin nada', E.planSVG(E.emptyLayout(20, 20)).indexOf('<svg') === 0);

console.log('\n' + (fail ? '✗ ' : '✓ ') + pass + ' pasaron, ' + fail + ' fallaron');
process.exit(fail ? 1 : 0);
