// ════════════════════════════════════════════════════════════════════════════════
//  OX GLASS CO. — PLAN3D ENGINE  |  plan3d-engine.js
//  Single source of truth for the warehouse layout: model, validation, metrics,
//  2D scaled plan (SVG, printable) and 3D view (canvas, zero dependencies).
//
//  Used by BOTH:
//    · dist/OX_PLANO_CAPTURA.html  — offline field capture app (phone)
//    · Index_v3_fixed.html         — "Plano 3D" tab inside the WMS
//  Never edit the copies inside those files: edit THIS file and run
//  `node tools/build.js` to re-inline it.
//
//  UNITS: everything is stored in INCHES. Display converts to ft-in.
//  AXES:  x = left→right (width), y = front→back (depth), z = floor→ceiling.
//         y grows toward the BACK of the building. Rotation `rot` is degrees
//         clockwise around the box center seen from above (0 = width along x).
// ════════════════════════════════════════════════════════════════════════════════
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.OXPlan = factory();
}(typeof self !== 'undefined' ? self : this, function () {
'use strict';

// ─── UNITS ───────────────────────────────────────────────────────────────────
function ft(inches)  { return inches / 12; }
function inch(feet)  { return feet * 12; }

// 138 → 11' 6".  Rounds to the nearest 1/8" so field measurements survive intact.
function fmtFt(inches) {
  var neg = inches < 0; var v = Math.abs(inches);
  var f = Math.floor(v / 12);
  var i = v - f * 12;
  var whole = Math.floor(i);
  var frac  = Math.round((i - whole) * 8);
  if (frac === 8) { whole += 1; frac = 0; }
  if (whole === 12) { f += 1; whole = 0; }
  var s = f + "'";
  if (whole || frac) s += ' ' + whole + (frac ? ' ' + frac + '/8' : '') + '"';
  return (neg ? '-' : '') + s;
}

// Accepts 12, "12", "12ft", "12'", "12' 6", "12'6\"", "150in", "150\"", "3.5m"
function parseLen(txt) {
  if (typeof txt === 'number') return isFinite(txt) ? txt : 0;
  var s = String(txt || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!s) return 0;
  var m;
  if ((m = s.match(/^([\d.]+)\s*m$/)))                     return parseFloat(m[1]) * 39.3701;
  if ((m = s.match(/^([\d.]+)\s*cm$/)))                    return parseFloat(m[1]) * 0.393701;
  if ((m = s.match(/^([\d.]+)\s*(in|")$/)))                return parseFloat(m[1]);
  if ((m = s.match(/^([\d.]+)\s*(ft|')\s*([\d.]+)?\s*("|in)?$/)))
    return parseFloat(m[1]) * 12 + (m[3] ? parseFloat(m[3]) : 0);
  if ((m = s.match(/^([\d.]+)\s+([\d.]+)$/)))              return parseFloat(m[1]) * 12 + parseFloat(m[2]);
  var n = parseFloat(s);
  return isFinite(n) ? n * 12 : 0;   // bare number = FEET (what people say out loud)
}

// ─── GEOMETRY ────────────────────────────────────────────────────────────────
function rot2(px, py, cx, cy, deg) {
  var a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  var dx = px - cx, dy = py - cy;
  return [cx + dx * c - dy * s, cy + dx * s + dy * c];
}

// Corners of a box given its FRONT-LEFT origin (x,y), size and rotation.
function rectCorners(b) {
  var x = b.x, y = b.y, w = b.w, d = b.d, r = b.rot || 0;
  var cx = x + w / 2, cy = y + d / 2;
  return [[x, y], [x + w, y], [x + w, y + d], [x, y + d]]
    .map(function (p) { return rot2(p[0], p[1], cx, cy, r); });
}

function polyArea(pts) {                       // shoelace, absolute
  var a = 0;
  for (var i = 0, n = pts.length; i < n; i++) {
    var p = pts[i], q = pts[(i + 1) % n];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(a) / 2;
}

function polyBBox(pts) {
  var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
  return { x0: Math.min.apply(null, xs), y0: Math.min.apply(null, ys),
           x1: Math.max.apply(null, xs), y1: Math.max.apply(null, ys) };
}

function pointInPoly(x, y, pts) {
  var inside = false;
  for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    var xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

// Distance from a point to a polygon boundary (used so a rack sitting flush
// against a wall doesn't read as "outside the building" by a rounding hair).
function distToPolyEdge(x, y, pts) {
  var best = Infinity;
  for (var i = 0, n = pts.length; i < n; i++) {
    var a = pts[i], b = pts[(i + 1) % n];
    var vx = b[0] - a[0], vy = b[1] - a[1];
    var len2 = vx * vx + vy * vy || 1;
    var t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (y - a[1]) * vy) / len2));
    var d = Math.hypot(x - (a[0] + t * vx), y - (a[1] + t * vy));
    if (d < best) best = d;
  }
  return best;
}
function pointInPolyTol(x, y, pts, tol) {
  return pointInPoly(x, y, pts) || distToPolyEdge(x, y, pts) <= (tol || 0);
}

// Separating-axis test between two convex polygons (our rotated rectangles).
function polysOverlap(A, B, tol) {
  tol = tol || 0;
  var polys = [A, B];
  for (var p = 0; p < 2; p++) {
    var poly = polys[p];
    for (var i = 0; i < poly.length; i++) {
      var a = poly[i], b = poly[(i + 1) % poly.length];
      var nx = -(b[1] - a[1]), ny = b[0] - a[0];
      var len = Math.hypot(nx, ny) || 1; nx /= len; ny /= len;
      var minA = Infinity, maxA = -Infinity, minB = Infinity, maxB = -Infinity;
      A.forEach(function (q) { var d = q[0] * nx + q[1] * ny; if (d < minA) minA = d; if (d > maxA) maxA = d; });
      B.forEach(function (q) { var d = q[0] * nx + q[1] * ny; if (d < minB) minB = d; if (d > maxB) maxB = d; });
      if (maxA - tol <= minB || maxB - tol <= minA) return false;   // gap on this axis
    }
  }
  return true;
}

// ─── FAMILIES ────────────────────────────────────────────────────────────────
// Keys match the CATEGORY values already used by the WMS (CAT_DOT_COLORS).
var FAMILIES = {
  WINDOW:     { label: 'Ventanas',            color: '#3B7DD8', store: 'ARACK',  aisle: 60 },
  SCREEN:     { label: 'Screens (win+door)',  color: '#10B981', store: 'VRACK',  aisle: 42 },
  MIRROR:     { label: 'Espejos',             color: '#8B5CF6', store: 'ARACK',  aisle: 60 },
  SHOWER:     { label: 'Shower doors',        color: '#06B6D4', store: 'PALLET', aisle: 66 },
  STOREFRONT: { label: 'Storefront',          color: '#F59E0B', store: 'CANT',   aisle: 72 },
  IGU:        { label: 'IGU / vidrio',        color: '#EC4899', store: 'ARACK',  aisle: 60 },
  WINDOW_PARTS:{label: 'Partes de ventana',   color: '#6366F1', store: 'SHELF',  aisle: 42 },
  FLASHING:   { label: 'Flashing / caulk',    color: '#D97706', store: 'SHELF',  aisle: 42 },
  SCREWS:     { label: 'Tornillería',         color: '#9CA3AF', store: 'SHELF',  aisle: 36 },
  TOOLS:      { label: 'Herramienta',         color: '#EF4444', store: 'SHELF',  aisle: 36 },
  BONEYARD:   { label: 'Boneyard',            color: '#6B7280', store: 'FLOOR',  aisle: 48 },
  STAGING:    { label: 'Staging / despacho',  color: '#0EA5E9', store: 'FLOOR',  aisle: 96 },
  NONE:       { label: 'Sin asignar',         color: '#94A3B8', store: 'FLOOR',  aisle: 48 }
};
function famColor(f) { return (FAMILIES[f] || FAMILIES.NONE).color; }
function famLabel(f) { return (FAMILIES[f] || FAMILIES.NONE).label; }

// ─── RACK TYPES ──────────────────────────────────────────────────────────────
// `slot` = how thick one stored unit is, used to turn linear inches into pieces.
var RACK_TYPES = {
  ARACK:  { label: 'A-frame (vidrio parado)', d: 48, h: 84,  metric: 'stack',  sides: 2, slot: 3.5 },
  VRACK:  { label: 'Rack vertical c/divisor', d: 30, h: 96,  metric: 'slots',  sides: 1, slot: 2.5 },
  CANT:   { label: 'Cantilever (perfilería)', d: 36, h: 120, metric: 'linear', sides: 1, slot: 0 },
  PALLET: { label: 'Rack de pallets',         d: 48, h: 144, metric: 'pallets',sides: 1, slot: 48 },
  SHELF:  { label: 'Estantería',              d: 24, h: 84,  metric: 'area',   sides: 1, slot: 0 },
  FLOOR:  { label: 'Área de piso',            d: 96, h: 0,   metric: 'area',   sides: 1, slot: 0 },
  CART:   { label: 'Carro móvil',             d: 30, h: 72,  metric: 'stack',  sides: 2, slot: 3.5 },
  TABLE:  { label: 'Mesa de trabajo',         d: 48, h: 36,  metric: 'area',   sides: 1, slot: 0 }
};

// Capacity of one rack, in the unit that matters for that rack type.
function rackCapacity(rack) {
  var t = RACK_TYPES[rack.type] || RACK_TYPES.FLOOR;
  var levels = Math.max(1, rack.levels || 1);
  var w = rack.w || 0, d = rack.d || 0;
  switch (t.metric) {
    case 'stack':                                  // inches of stacked glass thickness
      var lin = w * t.sides;
      return { metric: 'stack', value: lin, label: fmtFt(lin) + ' de apilado',
               pieces: Math.floor(lin / (rack.slot || t.slot)) };
    case 'slots':
      var slots = Math.floor(w / (rack.slot || t.slot)) * levels;
      return { metric: 'slots', value: slots, label: slots + ' ranuras', pieces: slots };
    case 'linear':
      var lf = ft(w) * levels;
      return { metric: 'linear', value: lf, label: Math.round(lf) + ' ft lineales', pieces: 0 };
    case 'pallets':
      var pos = Math.max(0, Math.floor(w / t.slot)) * levels;
      return { metric: 'pallets', value: pos, label: pos + ' posiciones', pieces: pos };
    default:
      var sf = ft(w) * ft(d) * levels;
      return { metric: 'area', value: sf, label: Math.round(sf) + ' ft²', pieces: 0 };
  }
}

// ─── MODEL ───────────────────────────────────────────────────────────────────
function rectOutline(w, d) { return [[0, 0], [w, 0], [w, d], [0, d]]; }

function emptyLayout(wFt, dFt, clearFt) {
  var w = inch(wFt || 100), d = inch(dFt || 60);
  return {
    meta: { name: 'OX Glass — Bodega', units: 'in', rev: 1, updated: new Date().toISOString().slice(0, 10), notes: '' },
    building: {
      outline: rectOutline(w, d),
      clearH: inch(clearFt || 16),
      columns: [], openings: [], obstacles: []
    },
    survey: { diagA: 0, diagB: 0, method: '', notes: '' },
    zones: [], racks: []
  };
}

// Fill in everything the renderers assume exists, so a half-typed field capture
// still draws instead of throwing.
function normalize(layout) {
  var L = layout || {};
  L.meta = L.meta || {}; L.meta.units = 'in';
  L.building = L.building || {};
  var b = L.building;
  if (!b.outline || b.outline.length < 3) b.outline = rectOutline(inch(100), inch(60));
  b.outline  = b.outline.map(function (p) { return [Number(p[0]) || 0, Number(p[1]) || 0]; });
  b.clearH   = Number(b.clearH) || inch(16);
  b.columns  = (b.columns   || []).map(function (c, i) {
    return { id: c.id || ('COL' + (i + 1)), x: +c.x || 0, y: +c.y || 0, w: +c.w || 8, d: +c.d || 8 };
  });
  b.openings = (b.openings  || []).map(function (o, i) {
    return { id: o.id || ('OPEN' + (i + 1)), type: o.type || 'ROLLUP', wall: o.wall || 'S',
             x: +o.x || 0, y: +o.y || 0, w: +o.w || inch(10), h: +o.h || inch(12) };
  });
  b.obstacles = (b.obstacles || []).map(function (o, i) {
    return { id: o.id || ('OBS' + (i + 1)), name: o.name || o.id || 'Obstáculo', type: o.type || 'OTHER',
             x: +o.x || 0, y: +o.y || 0, w: +o.w || 48, d: +o.d || 48, h: +o.h || inch(8), rot: +o.rot || 0 };
  });
  L.survey = L.survey || { diagA: 0, diagB: 0, method: '', notes: '' };
  L.zones = (L.zones || []).map(function (z, i) {
    return { id: z.id || ('Z' + (i + 1)), name: z.name || ('Zona ' + (i + 1)), family: z.family || 'NONE',
             x: +z.x || 0, y: +z.y || 0, w: +z.w || 0, d: +z.d || 0 };
  });
  L.racks = (L.racks || []).map(function (r, i) {
    var t = RACK_TYPES[r.type] || RACK_TYPES.FLOOR;
    return { id: String(r.id || ('R' + (i + 1))).toUpperCase(), zone: r.zone || '', family: r.family || '',
             type: RACK_TYPES[r.type] ? r.type : 'FLOOR',
             x: +r.x || 0, y: +r.y || 0, w: +r.w || inch(12), d: +r.d || t.d, h: +r.h || t.h,
             rot: +r.rot || 0, levels: Math.max(1, +r.levels || 1), slot: +r.slot || 0,
             bays: r.bays || [], label: r.label || '' };
  });
  return L;
}

// A rack inherits its family from its zone when it doesn't declare one.
function rackFamily(L, rack) {
  if (rack.family) return rack.family;
  var z = (L.zones || []).filter(function (z) { return z.id === rack.zone; })[0];
  return (z && z.family) || 'NONE';
}

// ─── VALIDATION ──────────────────────────────────────────────────────────────
// Every check returns {level:'error'|'warn'|'info', code, msg, ref}. This is the
// part that turns "unas medidas" into "un plano confiable".
function validate(layout, opts) {
  layout = normalize(layout);
  opts = opts || {};
  var minAisle = opts.minAisle || 48;      // clear aisle for a 2-man glass carry
  var doorClear = opts.doorClear || 120;   // keep-clear apron in front of a bay door
  var out = [];
  var B = layout.building, poly = B.outline;
  function add(level, code, msg, ref) { out.push({ level: level, code: code, msg: msg, ref: ref || '' }); }

  // 1 — Building shell
  var area = polyArea(poly);
  if (area <= 0) add('error', 'SHELL_EMPTY', 'El contorno del edificio no tiene área. Captura el perímetro primero.');
  var bb = polyBBox(poly);
  if (ft(bb.x1 - bb.x0) > 1000 || ft(bb.y1 - bb.y0) > 1000)
    add('warn', 'SHELL_HUGE', 'El edificio mide más de 1000 ft de lado. ¿Metiste pulgadas donde iban pies?');

  // 2 — Squareness: compare the two measured diagonals against the drawn shape.
  var s = layout.survey || {};
  if (s.diagA && s.diagB && poly.length === 4) {
    var dA = Math.hypot(poly[2][0] - poly[0][0], poly[2][1] - poly[0][1]);
    var dB = Math.hypot(poly[3][0] - poly[1][0], poly[3][1] - poly[1][1]);
    var eA = Math.abs(dA - s.diagA), eB = Math.abs(dB - s.diagB);
    var worst = Math.max(eA, eB), pct = worst / Math.max(dA, dB) * 100;
    if (worst > 12 || pct > 1.0) add('error', 'SQUARE_BAD',
      'Las diagonales medidas no cuadran con el rectángulo dibujado (error ' + fmtFt(worst) + ', ' + pct.toFixed(1) + '%). Vuelve a medir: el edificio no es cuadrado o una pared está mal.');
    else if (worst > 2 || pct > 0.3) add('warn', 'SQUARE_OFF',
      'Diagonales con ' + fmtFt(worst) + ' de diferencia (' + pct.toFixed(1) + '%). El edificio está fuera de escuadra; el plano es usable pero no lo tomes como as-built.');
    else add('info', 'SQUARE_OK', 'Diagonales verificadas: error ' + fmtFt(worst) + ' (' + pct.toFixed(2) + '%). Medición confiable.');
  } else {
    add('warn', 'SQUARE_MISSING', 'Faltan las dos diagonales del perímetro. Sin ellas no hay forma de saber si las medidas cierran.');
  }

  // 3 — Racks inside the shell, and under the ceiling
  layout.racks.forEach(function (r) {
    rectCorners(r).forEach(function (c) {
      if (!pointInPolyTol(c[0], c[1], poly, 1))
        add('error', 'RACK_OUT', 'El rack ' + r.id + ' se sale del edificio.', r.id);
    });
    if (r.h > B.clearH)
      add('error', 'RACK_TALL', 'El rack ' + r.id + ' (' + fmtFt(r.h) + ') supera la altura libre ' + fmtFt(B.clearH) + '.', r.id);
    else if (B.clearH - r.h < 18 && r.h > 0)
      add('warn', 'RACK_SPRINKLER', 'El rack ' + r.id + ' deja menos de 18" bajo el techo. Verifica el despeje de rociadores con tu AHJ.', r.id);
  });

  // 4 — Racks against each other / columns / obstacles
  for (var i = 0; i < layout.racks.length; i++) {
    var ri = layout.racks[i], ci = rectCorners(ri);
    for (var j = i + 1; j < layout.racks.length; j++) {
      var rj = layout.racks[j];
      if (polysOverlap(ci, rectCorners(rj), 0.5))
        add('error', 'RACK_OVERLAP', 'Los racks ' + ri.id + ' y ' + rj.id + ' se traslapan.', ri.id);
    }
    B.columns.forEach(function (c) {
      if (polysOverlap(ci, rectCorners({ x: c.x, y: c.y, w: c.w, d: c.d, rot: 0 }), 0.5))
        add('error', 'RACK_COLUMN', 'El rack ' + ri.id + ' choca con la columna ' + c.id + '.', ri.id);
    });
    B.obstacles.forEach(function (o) {
      if (polysOverlap(ci, rectCorners(o), 0.5))
        add('error', 'RACK_OBSTACLE', 'El rack ' + ri.id + ' choca con ' + (o.name || o.id) + '.', ri.id);
    });
  }

  // 5 — Keep-clear apron in front of every opening
  B.openings.forEach(function (o) {
    var apron = openingApron(o, doorClear);
    layout.racks.forEach(function (r) {
      if (polysOverlap(rectCorners(apron), rectCorners(r), 0.5))
        add('error', 'DOOR_BLOCKED', 'El rack ' + r.id + ' invade el área libre de ' + o.id + ' (necesita ' + fmtFt(doorClear) + ' de frente).', r.id);
    });
  });

  // 6 — Reachability: can a cart of minAisle width reach every rack?
  var reach = reachability(layout, minAisle);
  reach.unreachable.forEach(function (id) {
    add('error', 'NO_ACCESS', 'No hay pasillo de ' + fmtFt(minAisle) + ' que llegue al rack ' + id + '.', id);
  });
  if (!reach.hasDoor) add('warn', 'NO_DOOR', 'No hay puertas capturadas, así que no se pudo verificar el acceso desde afuera.');

  // 7 — Zones
  layout.zones.forEach(function (z) {
    if (z.w <= 0 || z.d <= 0) add('warn', 'ZONE_EMPTY', 'La zona ' + z.name + ' no tiene dimensiones.', z.id);
  });
  layout.racks.forEach(function (r) {
    if (!r.zone) return;
    var z = layout.zones.filter(function (q) { return q.id === r.zone; })[0];
    if (!z) { add('warn', 'ZONE_MISSING', 'El rack ' + r.id + ' apunta a la zona ' + r.zone + ' que no existe.', r.id); return; }
    if (r.family && z.family && r.family !== z.family)
      add('warn', 'ZONE_FAMILY', 'El rack ' + r.id + ' guarda ' + famLabel(r.family) + ' dentro de la zona de ' + famLabel(z.family) + '.', r.id);
  });

  var errors = out.filter(function (o) { return o.level === 'error'; }).length;
  var warns  = out.filter(function (o) { return o.level === 'warn'; }).length;
  return { ok: errors === 0, errors: errors, warnings: warns, items: out };
}

// The rectangle that must stay clear in front of an opening, always pushed INTO
// the building. Wall convention: y = 0 is the back wall (N), y = depth is the
// front/street wall (S) where the bay doors normally are; x = 0 is W, x = W is E.
function openingApron(o, depth) {
  switch (o.wall) {
    case 'N': return { x: o.x,         y: o.y,         w: o.w,   d: depth, rot: 0 };
    case 'E': return { x: o.x - depth, y: o.y,         w: depth, d: o.w,   rot: 0 };
    case 'W': return { x: o.x,         y: o.y,         w: depth, d: o.w,   rot: 0 };
    default:  return { x: o.x,         y: o.y - depth, w: o.w,   d: depth, rot: 0 };   // S
  }
}

// ─── AISLE / REACHABILITY ────────────────────────────────────────────────────
// Rasterize the floor at 6" per cell, erode by half the aisle width, flood-fill
// from the doors, then ask whether every rack touches the reachable area.
function reachability(layout, minAisle) {
  layout = normalize(layout);
  var CELL = 6;
  var poly = layout.building.outline, bb = polyBBox(poly);
  var nx = Math.max(1, Math.ceil((bb.x1 - bb.x0) / CELL));
  var ny = Math.max(1, Math.ceil((bb.y1 - bb.y0) / CELL));
  if (nx * ny > 400000) return { unreachable: [], hasDoor: true, skipped: true };

  var blocked = new Uint8Array(nx * ny);
  function idx(i, j) { return j * nx + i; }
  function cellCenter(i, j) { return [bb.x0 + (i + 0.5) * CELL, bb.y0 + (j + 0.5) * CELL]; }

  // Outside the shell counts as blocked
  for (var j = 0; j < ny; j++) for (var i = 0; i < nx; i++) {
    var c = cellCenter(i, j);
    if (!pointInPoly(c[0], c[1], poly)) blocked[idx(i, j)] = 1;
  }
  function stamp(box) {
    var cs = rectCorners(box), b = polyBBox(cs);
    var i0 = Math.max(0, Math.floor((b.x0 - bb.x0) / CELL)), i1 = Math.min(nx - 1, Math.ceil((b.x1 - bb.x0) / CELL));
    var j0 = Math.max(0, Math.floor((b.y0 - bb.y0) / CELL)), j1 = Math.min(ny - 1, Math.ceil((b.y1 - bb.y0) / CELL));
    for (var jj = j0; jj <= j1; jj++) for (var ii = i0; ii <= i1; ii++) {
      var cc = cellCenter(ii, jj);
      if (pointInPoly(cc[0], cc[1], cs)) blocked[idx(ii, jj)] = 1;
    }
  }
  layout.racks.forEach(stamp);
  layout.building.columns.forEach(function (c) { stamp({ x: c.x, y: c.y, w: c.w, d: c.d, rot: 0 }); });
  layout.building.obstacles.forEach(stamp);

  // Erode: a cell is passable only if a circle of minAisle/2 fits in it.
  var rad = Math.max(1, Math.round((minAisle / 2) / CELL));
  var passable = new Uint8Array(nx * ny);
  for (var j2 = 0; j2 < ny; j2++) for (var i2 = 0; i2 < nx; i2++) {
    var ok = 1;
    for (var dj = -rad; dj <= rad && ok; dj++) for (var di = -rad; di <= rad && ok; di++) {
      if (di * di + dj * dj > rad * rad) continue;
      var ii2 = i2 + di, jj2 = j2 + dj;
      if (ii2 < 0 || jj2 < 0 || ii2 >= nx || jj2 >= ny || blocked[idx(ii2, jj2)]) ok = 0;
    }
    passable[idx(i2, j2)] = ok;
  }

  // Seed the flood from the inside face of every opening (or from the centroid
  // of the free space when no opening was captured yet).
  var queue = [], seen = new Uint8Array(nx * ny), hasDoor = layout.building.openings.length > 0;
  function seed(x, y) {
    var i = Math.floor((x - bb.x0) / CELL), j = Math.floor((y - bb.y0) / CELL);
    for (var dj = -4; dj <= 4; dj++) for (var di = -4; di <= 4; di++) {
      var ii = i + di, jj = j + dj;
      if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue;
      var k = idx(ii, jj);
      if (passable[k] && !seen[k]) { seen[k] = 1; queue.push(k); }
    }
  }
  if (hasDoor) {
    layout.building.openings.forEach(function (o) {
      var a = openingApron(o, 24), cs = rectCorners(a);
      var cx = (cs[0][0] + cs[2][0]) / 2, cy = (cs[0][1] + cs[2][1]) / 2;
      seed(cx, cy);
    });
  }
  if (!queue.length) {                       // fall back: any passable cell
    for (var k0 = 0; k0 < passable.length; k0++) if (passable[k0]) { seen[k0] = 1; queue.push(k0); break; }
  }
  while (queue.length) {
    var k = queue.pop(), i3 = k % nx, j3 = (k - i3) / nx;
    var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var n = 0; n < 4; n++) {
      var ii3 = i3 + nb[n][0], jj3 = j3 + nb[n][1];
      if (ii3 < 0 || jj3 < 0 || ii3 >= nx || jj3 >= ny) continue;
      var kk = idx(ii3, jj3);
      if (passable[kk] && !seen[kk]) { seen[kk] = 1; queue.push(kk); }
    }
  }

  // A rack is served if a reachable cell sits within 18" of its footprint.
  var unreachable = [];
  layout.racks.forEach(function (r) {
    var cs = rectCorners(r), b = polyBBox(cs), pad = 18;
    var i0 = Math.max(0, Math.floor((b.x0 - pad - bb.x0) / CELL)), i1 = Math.min(nx - 1, Math.ceil((b.x1 + pad - bb.x0) / CELL));
    var j0 = Math.max(0, Math.floor((b.y0 - pad - bb.y0) / CELL)), j1 = Math.min(ny - 1, Math.ceil((b.y1 + pad - bb.y0) / CELL));
    var served = false;
    for (var jj = j0; jj <= j1 && !served; jj++) for (var ii = i0; ii <= i1 && !served; ii++) {
      if (seen[idx(ii, jj)]) served = true;
    }
    if (!served) unreachable.push(r.id);
  });
  return { unreachable: unreachable, hasDoor: hasDoor, cells: { nx: nx, ny: ny, cell: CELL } };
}

// ─── METRICS ─────────────────────────────────────────────────────────────────
function metrics(layout) {
  layout = normalize(layout);
  var grossSf  = ft(1) * ft(1) * polyArea(layout.building.outline);
  var obsSf    = layout.building.obstacles.reduce(function (a, o) { return a + ft(o.w) * ft(o.d); }, 0);
  var rackSf   = layout.racks.reduce(function (a, r) { return a + ft(r.w) * ft(r.d); }, 0);
  var byFamily = {};
  layout.racks.forEach(function (r) {
    var f = rackFamily(layout, r), cap = rackCapacity(r);
    var e = byFamily[f] || (byFamily[f] = { family: f, label: famLabel(f), racks: 0, footprintSf: 0,
                                            stackIn: 0, slots: 0, linearFt: 0, pallets: 0, areaSf: 0, pieces: 0 });
    e.racks++; e.footprintSf += ft(r.w) * ft(r.d); e.pieces += cap.pieces || 0;
    if (cap.metric === 'stack')   e.stackIn  += cap.value;
    if (cap.metric === 'slots')   e.slots    += cap.value;
    if (cap.metric === 'linear')  e.linearFt += cap.value;
    if (cap.metric === 'pallets') e.pallets  += cap.value;
    if (cap.metric === 'area')    e.areaSf   += cap.value;
  });
  var usableSf = Math.max(0, grossSf - obsSf);
  return {
    grossSf: grossSf, obstacleSf: obsSf, usableSf: usableSf,
    rackSf: rackSf, freeSf: Math.max(0, usableSf - rackSf),
    utilization: usableSf ? rackSf / usableSf : 0,
    cubicFt: grossSf * ft(layout.building.clearH),
    byFamily: Object.keys(byFamily).map(function (k) { return byFamily[k]; })
                     .sort(function (a, b) { return b.footprintSf - a.footprintSf; })
  };
}

// ─── SVG PLAN ────────────────────────────────────────────────────────────────
// A real printable plan: scale bar, dimension lines, north arrow, title block,
// zone washes, rack tags. opts.occupancy = { RACKID: 0..1 } tints the racks.
function planSVG(layout, opts) {
  layout = normalize(layout);
  opts = opts || {};
  var pad = opts.pad || 90;                       // paper margin, px
  var poly = layout.building.outline, bb = polyBBox(poly);
  var W = bb.x1 - bb.x0, D = bb.y1 - bb.y0;
  var maxW = opts.width || 1400, maxH = opts.height || 900;
  var k = Math.min((maxW - pad * 2) / (W || 1), (maxH - pad * 2 - 90) / (D || 1));
  var sw = W * k + pad * 2, sh = D * k + pad * 2 + 90;
  var dark = !!opts.dark;
  var ink = dark ? '#E5E7EB' : '#111827', paper = dark ? '#0F172A' : '#FFFFFF';
  var grid = dark ? '#1E293B' : '#EEF2F7', wall = dark ? '#94A3B8' : '#0F172A';
  function X(x) { return pad + (x - bb.x0) * k; }
  function Y(y) { return pad + (y - bb.y0) * k; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var o = [];
  o.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + sw.toFixed(0) + ' ' + sh.toFixed(0) + '" width="' + sw.toFixed(0) + '" height="' + sh.toFixed(0) + '" font-family="Inter,DM Sans,Arial,sans-serif">');
  o.push('<rect width="100%" height="100%" fill="' + paper + '"/>');

  // 10 ft grid
  o.push('<g stroke="' + grid + '" stroke-width="1">');
  for (var gx = Math.ceil(bb.x0 / 120) * 120; gx <= bb.x1; gx += 120)
    o.push('<line x1="' + X(gx).toFixed(1) + '" y1="' + Y(bb.y0).toFixed(1) + '" x2="' + X(gx).toFixed(1) + '" y2="' + Y(bb.y1).toFixed(1) + '"/>');
  for (var gy = Math.ceil(bb.y0 / 120) * 120; gy <= bb.y1; gy += 120)
    o.push('<line x1="' + X(bb.x0).toFixed(1) + '" y1="' + Y(gy).toFixed(1) + '" x2="' + X(bb.x1).toFixed(1) + '" y2="' + Y(gy).toFixed(1) + '"/>');
  o.push('</g>');

  // Zones (wash now, labels in a top layer at the end so racks never cover them)
  var zoneLabels = [];
  (layout.zones || []).forEach(function (z) {
    if (z.w <= 0 || z.d <= 0) return;
    var c = famColor(z.family);
    var zw = z.w * k, zh = z.d * k;
    var lbl;
    if (zw < 150 && zh > zw) {
      // Narrow strip: the rack fills it, so the name goes in the margin just
      // outside the wall the strip sits on, running down the strip.
      var flushW = z.x <= bb.x0 + 2, lx;
      // Vertical text reads bottom-to-top, the usual convention on a plan, and
      // starts at the far end of the strip so it never runs into a corner.
      lx = flushW ? X(z.x) - 6 : X(z.x + z.w) + 13;
      var ly = Y(z.y + z.d) - 6;
      lbl = '<text x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" font-size="11" font-weight="700" fill="' + c +
            '" text-anchor="start" transform="rotate(-90 ' + lx.toFixed(1) + ' ' + ly.toFixed(1) + ')">' + esc(z.name) + '</text>';
    } else {
      lbl = '<text x="' + (X(z.x) + 8).toFixed(1) + '" y="' + (Y(z.y) + 20).toFixed(1) +
            '" font-size="13" font-weight="700" fill="' + c + '">' + esc(z.name) + '</text>';
    }
    o.push('<rect x="' + X(z.x).toFixed(1) + '" y="' + Y(z.y).toFixed(1) + '" width="' + zw.toFixed(1) + '" height="' + zh.toFixed(1) +
      '" fill="' + c + '" fill-opacity="' + (dark ? .18 : .10) + '" stroke="' + c + '" stroke-width="1.5" stroke-dasharray="8 5"/>');
    zoneLabels.push(lbl);
  });

  // Door aprons (keep-clear hatch)
  o.push('<defs><pattern id="hatch" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">' +
         '<line x1="0" y1="0" x2="0" y2="8" stroke="#F59E0B" stroke-width="2" stroke-opacity=".5"/></pattern></defs>');
  layout.building.openings.forEach(function (op) {
    var a = openingApron(op, opts.doorClear || 120);
    o.push('<rect x="' + X(a.x).toFixed(1) + '" y="' + Y(a.y).toFixed(1) + '" width="' + (a.w * k).toFixed(1) + '" height="' + (a.d * k).toFixed(1) + '" fill="url(#hatch)" stroke="none"/>');
  });

  // Shell
  o.push('<polygon points="' + poly.map(function (p) { return X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); }).join(' ') +
         '" fill="none" stroke="' + wall + '" stroke-width="4"/>');

  // Openings drawn as gaps in the wall
  layout.building.openings.forEach(function (op) {
    var col = op.type === 'ROLLUP' ? '#F59E0B' : '#10B981';
    var x1, y1, x2, y2;
    if (op.wall === 'N' || op.wall === 'S') { x1 = X(op.x); x2 = X(op.x + op.w); y1 = y2 = Y(op.y); }
    else { y1 = Y(op.y); y2 = Y(op.y + op.w); x1 = x2 = X(op.x); }
    o.push('<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + col + '" stroke-width="7" stroke-linecap="round"/>');
    o.push('<text x="' + ((x1 + x2) / 2).toFixed(1) + '" y="' + ((y1 + y2) / 2 - 8).toFixed(1) + '" font-size="11" font-weight="700" fill="' + col + '" text-anchor="middle">' + esc(op.id) + '</text>');
  });

  // Obstacles
  layout.building.obstacles.forEach(function (ob) {
    var pts = rectCorners(ob).map(function (p) { return X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); }).join(' ');
    o.push('<polygon points="' + pts + '" fill="' + (dark ? '#334155' : '#E2E8F0') + '" stroke="' + (dark ? '#64748B' : '#94A3B8') + '" stroke-width="1.5"/>');
    o.push('<text x="' + X(ob.x + ob.w / 2).toFixed(1) + '" y="' + Y(ob.y + ob.d / 2).toFixed(1) + '" font-size="11" fill="' + ink + '" text-anchor="middle">' + esc(ob.name) + '</text>');
  });

  // Racks
  layout.racks.forEach(function (r) {
    var fam = rackFamily(layout, r), c = famColor(fam);
    var occ = opts.occupancy && opts.occupancy[r.id];
    var fillOp = occ == null ? .55 : (0.18 + 0.72 * Math.min(1, occ));
    var faded = opts.focusFamily && fam !== opts.focusFamily;
    if (faded) fillOp = 0.08;
    var pts = rectCorners(r).map(function (p) { return X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); }).join(' ');
    o.push('<g data-rack="' + esc(r.id) + '" style="cursor:pointer"><polygon points="' + pts + '" fill="' + c +
           '" fill-opacity="' + fillOp.toFixed(2) + '" stroke="' + c + '" stroke-width="1.5" stroke-opacity="' + (faded ? .3 : 1) + '"/>');
    var fb = polyBBox(rectCorners(r)), fw = (fb.x1 - fb.x0) * k, fh = (fb.y1 - fb.y0) * k;
    var tx = X((fb.x0 + fb.x1) / 2), ty = Y((fb.y0 + fb.y1) / 2);
    if (Math.max(fw, fh) > 26 && Math.min(fw, fh) > 10) {
      var turn = '';
      if (fh > fw * 1.6) {                       // tall narrow run: tag it along the run
        turn = ' transform="rotate(90 ' + tx.toFixed(1) + ' ' + ty.toFixed(1) + ')"';
      }
      o.push('<text x="' + tx.toFixed(1) + '" y="' + (ty + 4).toFixed(1) + '" font-size="11" font-weight="700" fill="' +
             (dark ? '#F8FAFC' : '#0F172A') + '" text-anchor="middle"' + turn + '>' + esc(r.id) + '</text>');
    }
    o.push('</g>');
  });

  // Columns
  layout.building.columns.forEach(function (c) {
    o.push('<rect x="' + X(c.x).toFixed(1) + '" y="' + Y(c.y).toFixed(1) + '" width="' + Math.max(4, c.w * k).toFixed(1) + '" height="' + Math.max(4, c.d * k).toFixed(1) + '" fill="' + wall + '"/>');
  });

  o.push(zoneLabels.join(''));

  // Overall dimensions
  var dimY = Y(bb.y1) + 34, dimX = X(bb.x1) + 34;
  o.push('<g stroke="' + ink + '" stroke-width="1" fill="' + ink + '" font-size="12">');
  o.push('<line x1="' + X(bb.x0) + '" y1="' + dimY + '" x2="' + X(bb.x1) + '" y2="' + dimY + '"/>');
  o.push('<text x="' + ((X(bb.x0) + X(bb.x1)) / 2).toFixed(1) + '" y="' + (dimY - 6) + '" text-anchor="middle" stroke="none" font-weight="700">' + fmtFt(W) + '</text>');
  o.push('<line x1="' + dimX + '" y1="' + Y(bb.y0) + '" x2="' + dimX + '" y2="' + Y(bb.y1) + '"/>');
  o.push('<text x="' + (dimX + 14) + '" y="' + ((Y(bb.y0) + Y(bb.y1)) / 2).toFixed(1) + '" text-anchor="middle" stroke="none" font-weight="700" transform="rotate(90 ' + (dimX + 14) + ' ' + ((Y(bb.y0) + Y(bb.y1)) / 2).toFixed(1) + ')">' + fmtFt(D) + '</text>');
  o.push('</g>');

  // North arrow
  var nx0 = sw - 60, ny0 = 46;
  o.push('<g stroke="' + ink + '" fill="' + ink + '"><path d="M' + nx0 + ' ' + (ny0 + 18) + ' L' + nx0 + ' ' + (ny0 - 18) + ' M' + (nx0 - 7) + ' ' + (ny0 - 8) + ' L' + nx0 + ' ' + (ny0 - 18) + ' L' + (nx0 + 7) + ' ' + (ny0 - 8) + '" fill="none" stroke-width="2"/>' +
         '<text x="' + nx0 + '" y="' + (ny0 + 33) + '" font-size="12" font-weight="700" text-anchor="middle" stroke="none">N</text></g>');

  // Scale bar (10 ft)
  var sbx = pad, sby = sh - 40, sbw = 120 * k;
  o.push('<g stroke="' + ink + '" fill="' + ink + '" font-size="11">' +
         '<rect x="' + sbx + '" y="' + sby + '" width="' + (sbw / 2).toFixed(1) + '" height="7" fill="' + ink + '"/>' +
         '<rect x="' + (sbx + sbw / 2).toFixed(1) + '" y="' + sby + '" width="' + (sbw / 2).toFixed(1) + '" height="7" fill="none" stroke-width="1"/>' +
         '<text x="' + sbx + '" y="' + (sby - 5) + '" stroke="none">0</text>' +
         '<text x="' + (sbx + sbw).toFixed(1) + '" y="' + (sby - 5) + '" stroke="none" text-anchor="middle">10 ft</text></g>');

  // Title block
  var m = metrics(layout);
  o.push('<g font-size="12" fill="' + ink + '">' +
    '<text x="' + (sbx + sbw + 40) + '" y="' + (sby + 7) + '" font-weight="700" font-size="14">' + esc(layout.meta.name || 'Bodega') + '</text>' +
    '<text x="' + (sbx + sbw + 40) + '" y="' + (sby + 24) + '" fill="' + (dark ? '#94A3B8' : '#64748B') + '">' +
      Math.round(m.grossSf) + ' ft² · altura libre ' + fmtFt(layout.building.clearH) +
      ' · ocupación ' + Math.round(m.utilization * 100) + '% · rev ' + esc(layout.meta.rev || 1) + ' · ' + esc(layout.meta.updated || '') +
    '</text></g>');
  o.push('</svg>');
  return o.join('');
}

// ─── 3D VIEW (canvas, no libraries) ──────────────────────────────────────────
// Orbit camera + painter's algorithm over box faces. Touch-first: this has to
// work on the phone, standing in the warehouse, with no signal.
function View3D(canvas, layout, opts) {
  opts = opts || {};
  var self = {};
  var ctx = canvas.getContext('2d');
  var L = normalize(layout);
  var occupancy = opts.occupancy || {};
  var onPick = opts.onPick || function () {};
  var mode = 'solid';
  var cam = { yaw: -35, pitch: 32, dist: 0, tx: 0, ty: 0, tz: 0, fov: 800 };
  var faces = [], dpr = 1;

  function bounds() {
    var bb = polyBBox(L.building.outline);
    return { cx: (bb.x0 + bb.x1) / 2, cy: (bb.y0 + bb.y1) / 2,
             span: Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) || 1200 };
  }
  function resetView() {
    var b = bounds();
    cam.tx = b.cx; cam.ty = b.cy; cam.tz = L.building.clearH * 0.25;
    // Frame the whole shell: at distance `dist` an inch maps to fov/dist px, so
    // solve for the distance that fits `span` into ~78% of the shorter side.
    var vw = canvas.clientWidth || 800, vh = canvas.clientHeight || 500;
    var fitPx = Math.max(160, Math.min(vw, vh * 1.6)) * 0.78;
    cam.dist = Math.max(120, cam.fov * b.span / fitPx);
    cam.yaw = -35; cam.pitch = 32;
    draw();
  }

  function project(p) {
    // world → camera: yaw about z, then pitch, then translate by distance
    var x = p[0] - cam.tx, y = p[1] - cam.ty, z = p[2] - cam.tz;
    var ya = cam.yaw * Math.PI / 180, pa = cam.pitch * Math.PI / 180;
    var x1 =  x * Math.cos(ya) + y * Math.sin(ya);
    var y1 = -x * Math.sin(ya) + y * Math.cos(ya);
    var y2 =  y1 * Math.cos(pa) + z * Math.sin(pa);
    var z2 = -y1 * Math.sin(pa) + z * Math.cos(pa);
    var depth = y2 + cam.dist;
    if (depth < 1) depth = 1;
    var s = cam.fov / depth;
    return { x: canvas.width / (2 * dpr) + x1 * s, y: canvas.height / (2 * dpr) - z2 * s, d: depth };
  }

  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.min(255, Math.round(((n >> 16) & 255) * f));
    var g = Math.min(255, Math.round(((n >> 8) & 255) * f));
    var b = Math.min(255, Math.round((n & 255) * f));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  // Push the 6 faces of a box (already rotated in plan) into the face list.
  function pushBox(box, color, id, label, alpha) {
    var c = rectCorners(box), z0 = box.z || 0, z1 = z0 + (box.h || 1);
    var bot = c.map(function (p) { return [p[0], p[1], z0]; });
    var top = c.map(function (p) { return [p[0], p[1], z1]; });
    var quads = [
      { p: top, n: [0, 0, 1], k: 1.00 },
      { p: [bot[0], bot[1], top[1], top[0]], n: [0, -1, 0], k: 0.80 },
      { p: [bot[1], bot[2], top[2], top[1]], n: [1, 0, 0], k: 0.68 },
      { p: [bot[2], bot[3], top[3], top[2]], n: [0, 1, 0], k: 0.74 },
      { p: [bot[3], bot[0], top[0], top[3]], n: [-1, 0, 0], k: 0.62 }
    ];
    quads.forEach(function (q) {
      faces.push({ pts: q.p, color: shade(color, q.k), id: id, label: q.n[2] === 1 ? label : '', alpha: alpha == null ? 1 : alpha });
    });
  }

  function build() {
    faces = [];
    var bb = polyBBox(L.building.outline);
    // Floor slab
    faces.push({ pts: L.building.outline.map(function (p) { return [p[0], p[1], 0]; }),
                 color: opts.dark ? '#1E293B' : '#E2E8F0', id: '', label: '', alpha: 1, floor: true });
    // Zone washes, just above the slab so they read as paint on the floor
    (L.zones || []).forEach(function (z) {
      if (z.w <= 0 || z.d <= 0) return;
      faces.push({ pts: rectCorners(z).map(function (p) { return [p[0], p[1], 0.5]; }),
                   color: famColor(z.family), id: 'zone:' + z.id, label: z.name, alpha: 0.28 });
    });
    L.building.obstacles.forEach(function (o) {
      pushBox({ x: o.x, y: o.y, w: o.w, d: o.d, rot: o.rot, h: o.h || inch(8) }, opts.dark ? '#475569' : '#CBD5E1', 'obs:' + o.id, o.name, 1);
    });
    L.building.columns.forEach(function (c) {
      pushBox({ x: c.x, y: c.y, w: c.w, d: c.d, rot: 0, h: L.building.clearH }, '#64748B', 'col:' + c.id, '', 0.9);
    });
    L.racks.forEach(function (r) {
      var fam = rackFamily(L, r), col = famColor(fam);
      var occ = occupancy[r.id];
      var alpha = mode === 'xray' ? 0.35 : 1;
      if (opts.focusFamily && fam !== opts.focusFamily) alpha = 0.12;
      var c = occ == null ? col : shade(col, 0.55 + 0.45 * Math.min(1, occ));
      pushBox({ x: r.x, y: r.y, w: r.w, d: r.d, rot: r.rot, h: r.h || 1 }, c, r.id, r.id, alpha);
    });
  }

  function draw() {
    dpr = window.devicePixelRatio || 1;
    var cssW = canvas.clientWidth || 800, cssH = canvas.clientHeight || 500;
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.fillStyle = opts.dark ? '#0B1220' : '#F8FAFC';
    ctx.fillRect(0, 0, cssW, cssH);

    var drawn = faces.map(function (f) {
      var ps = f.pts.map(project);
      var depth = ps.reduce(function (a, p) { return a + p.d; }, 0) / ps.length;
      return { f: f, ps: ps, depth: depth };
    }).sort(function (a, b) { return b.depth - a.depth; });      // far → near

    drawn.forEach(function (o) {
      var ps = o.ps;
      ctx.beginPath();
      ctx.moveTo(ps[0].x, ps[0].y);
      for (var i = 1; i < ps.length; i++) ctx.lineTo(ps[i].x, ps[i].y);
      ctx.closePath();
      ctx.globalAlpha = o.f.alpha;
      ctx.fillStyle = o.f.color; ctx.fill();
      ctx.globalAlpha = Math.min(1, o.f.alpha + .2);
      ctx.strokeStyle = opts.dark ? 'rgba(255,255,255,.18)' : 'rgba(15,23,42,.28)';
      ctx.lineWidth = o.f.floor ? 2 : 1; ctx.stroke();
      ctx.globalAlpha = 1;
      if (o.f.label) {
        var cx = ps.reduce(function (a, p) { return a + p.x; }, 0) / ps.length;
        var cy = ps.reduce(function (a, p) { return a + p.y; }, 0) / ps.length;
        var span = Math.max.apply(null, ps.map(function (p) { return p.x; })) - Math.min.apply(null, ps.map(function (p) { return p.x; }));
        if (span > 34) {
          ctx.font = '700 11px Inter, Arial, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillText(o.f.label, cx + 1, cy + 1);
          ctx.fillStyle = '#fff'; ctx.fillText(o.f.label, cx, cy);
        }
      }
    });
    self._drawn = drawn;
  }

  function pickAt(mx, my) {
    var d = self._drawn || [];
    for (var i = d.length - 1; i >= 0; i--) {                    // near → far
      var o = d[i];
      if (!o.f.id) continue;
      var pts = o.ps, inside = false;
      for (var a = 0, b = pts.length - 1; a < pts.length; b = a++) {
        var xi = pts[a].x, yi = pts[a].y, xj = pts[b].x, yj = pts[b].y;
        if (((yi > my) !== (yj > my)) && (mx < (xj - xi) * (my - yi) / (yj - yi) + xi)) inside = !inside;
      }
      if (inside) return o.f.id;
    }
    return '';
  }

  // ── input: mouse + touch (1 finger = orbit, 2 = zoom/pan) ──
  var drag = null, pinch = null, moved = 0;
  function pos(e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  canvas.addEventListener('mousedown', function (e) { drag = pos(e); moved = 0; });
  window.addEventListener('mousemove', function (e) {
    if (!drag) return;
    var p = pos(e), dx = p.x - drag.x, dy = p.y - drag.y;
    moved += Math.abs(dx) + Math.abs(dy);
    if (e.shiftKey) { panBy(dx, dy); } else { cam.yaw += dx * 0.4; cam.pitch = Math.max(4, Math.min(88, cam.pitch + dy * 0.3)); }
    drag = p; draw();
  });
  window.addEventListener('mouseup', function (e) {
    if (drag && moved < 5) { var p = pos(e); var id = pickAt(p.x, p.y); if (id) onPick(id); }
    drag = null;
  });
  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    cam.dist = Math.max(60, cam.dist * (e.deltaY > 0 ? 1.12 : 0.89));
    draw();
  }, { passive: false });
  function panBy(dx, dy) {
    var ya = cam.yaw * Math.PI / 180, s = cam.dist / cam.fov;
    cam.tx -= (dx * Math.cos(ya) - dy * Math.sin(ya)) * s;
    cam.ty -= (dx * Math.sin(ya) + dy * Math.cos(ya)) * s;
  }
  canvas.addEventListener('touchstart', function (e) {
    if (e.touches.length === 1) { drag = pos(e.touches[0]); moved = 0; }
    else if (e.touches.length === 2) {
      pinch = { d: Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY),
                x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2 };
      drag = null;
    }
  }, { passive: true });
  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    if (e.touches.length === 1 && drag) {
      var p = pos(e.touches[0]), dx = p.x - drag.x, dy = p.y - drag.y;
      moved += Math.abs(dx) + Math.abs(dy);
      cam.yaw += dx * 0.4; cam.pitch = Math.max(4, Math.min(88, cam.pitch + dy * 0.3));
      drag = p; draw();
    } else if (e.touches.length === 2 && pinch) {
      var d2 = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      var x2 = (e.touches[0].clientX + e.touches[1].clientX) / 2, y2 = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      cam.dist = Math.max(60, cam.dist * (pinch.d / (d2 || 1)));
      panBy(x2 - pinch.x, y2 - pinch.y);
      pinch = { d: d2, x: x2, y: y2 }; draw();
    }
  }, { passive: false });
  canvas.addEventListener('touchend', function (e) {
    if (drag && moved < 6 && e.changedTouches.length) {
      var p = pos(e.changedTouches[0]); var id = pickAt(p.x, p.y); if (id) onPick(id);
    }
    drag = null; pinch = null;
  }, { passive: true });

  self.setLayout = function (nl) { L = normalize(nl); build(); draw(); };
  self.setOccupancy = function (o) { occupancy = o || {}; build(); draw(); };
  self.setMode = function (m) { mode = m; build(); draw(); };
  self.setFocusFamily = function (f) { opts.focusFamily = f || ''; build(); draw(); };
  self.setDark = function (d) { opts.dark = d; build(); draw(); };
  self.resetView = resetView;
  self.redraw = draw;
  self.camera = cam;
  build(); resetView();
  return self;
}

// ─── LAYOUT PROPOSAL ─────────────────────────────────────────────────────────
// Deterministic first cut for a glass shop. Everything is parametric off the two
// numbers you actually measure (width × depth), so it re-flows when you correct
// them. Rules baked in, in order of how much they cost you if you get them wrong:
//   1. A cross-aisle + staging strip in front of the bay door — never store there.
//   2. Storefront extrusions need one long straight run; give them a full wall.
//   3. Windows are the volume driver: double-sided A-frames in rows off the
//      main aisle, closest to the door because they move the most.
//   4. Mirrors, shower doors and screens live on the far wall: lower turnover,
//      and mirrors want the lowest-traffic spot in the building.

// Position a box so its rotated footprint lands exactly on (xMin,yMin,spanX,spanY).
// rot 90 swaps the box's own length/depth relative to the footprint it occupies.
function placeBox(xMin, yMin, length, depth, rot) {
  if ((rot || 0) % 180 === 0) return { x: xMin, y: yMin, w: length, d: depth, rot: rot || 0 };
  var cx = xMin + depth / 2, cy = yMin + length / 2;
  return { x: cx - length / 2, y: cy - depth / 2, w: length, d: depth, rot: rot };
}

// Shorten a generated rack where it runs into a column or an obstacle, keeping
// the longest clear stretch. Only axis-aligned runs (rot 0 / 90) are generated,
// which is what makes this a simple interval problem along the rack's length.
function clipRackRuns(L, minRun) {
  minRun = minRun || 36;
  var blockers = L.building.columns.map(function (c) { return { x: c.x, y: c.y, w: c.w, d: c.d, rot: 0 }; })
    .concat(L.building.obstacles);
  if (!blockers.length) return L;
  var kept = [];
  L.racks.forEach(function (r) {
    var horiz = (r.rot % 180) === 0;
    var f = polyBBox(rectCorners(r));                       // footprint as drawn
    var a0 = horiz ? f.x0 : f.y0, a1 = horiz ? f.x1 : f.y1; // interval along the run
    var cuts = [];
    blockers.forEach(function (b) {
      var bf = polyBBox(rectCorners(b));
      var crossOK = horiz ? (bf.y0 < f.y1 && bf.y1 > f.y0) : (bf.x0 < f.x1 && bf.x1 > f.x0);
      if (!crossOK) return;
      var c0 = horiz ? bf.x0 : bf.y0, c1 = horiz ? bf.x1 : bf.y1;
      if (c1 > a0 && c0 < a1) cuts.push([Math.max(a0, c0 - 3), Math.min(a1, c1 + 3)]);
    });
    if (!cuts.length) { kept.push(r); return; }
    cuts.sort(function (m, n) { return m[0] - n[0]; });
    var free = [], cur = a0;
    cuts.forEach(function (c) { if (c[0] > cur) free.push([cur, c[0]]); cur = Math.max(cur, c[1]); });
    if (cur < a1) free.push([cur, a1]);
    var n = 0;
    free.forEach(function (seg) {
      var len = seg[1] - seg[0];
      if (len < minRun) return;
      n++;
      var copy = JSON.parse(JSON.stringify(r));
      copy.id = n === 1 ? r.id : r.id + '-' + n;
      var thick = horiz ? (f.y1 - f.y0) : (f.x1 - f.x0);
      var box = horiz ? { x: seg[0], y: f.y0, w: len, d: thick, rot: 0 }
                      : placeBox(f.x0, seg[0], len, thick, 90);
      copy.x = box.x; copy.y = box.y; copy.w = box.w; copy.d = box.d; copy.rot = box.rot;
      kept.push(copy);
    });
  });
  L.racks = kept;
  return L;
}

function suggestLayout(p) {
  p = p || {};
  var wFt = p.widthFt || 100, dFt = p.depthFt || 60;
  var W = inch(wFt), D = inch(dFt);
  var L = emptyLayout(wFt, dFt, p.clearFt || 16);
  L.meta.name = p.name || 'OX Glass — Bodega (propuesta)';
  L.meta.notes = 'Generado por OXPlan.suggestLayout — punto de partida, ajústalo con las medidas reales.';

  var aisle    = inch(p.aisleFt    || 5);    // between rack rows (2-man glass carry)
  var mainAisle= inch(p.mainAisleFt|| 6);    // spine aisle
  var stagingD = inch(p.stagingDepthFt || Math.max(10, Math.min(20, dFt * 0.22)));
  var bayW     = inch(p.bayWidthFt || 12);
  var bayX     = p.bayX != null ? p.bayX : (W - bayW) / 2;

  L.building.openings = [
    { id: 'BAY-1', type: 'ROLLUP', wall: 'S', x: bayX,     y: D, w: bayW, h: inch(12) },
    { id: 'MAN-1', type: 'MAN',    wall: 'S', x: inch(3),  y: D, w: 36,   h: inch(7)  }
  ];

  var WALL_GAP = 2;                                   // racks never sit flush on a metal wall
  var usableD = Math.max(inch(10), D - stagingD);     // depth left for storage
  var zones = [], racks = [], seq = {};
  function rack(zoneId, family, type, foot, levels, h) {
    var t = RACK_TYPES[type];
    seq[family] = (seq[family] || 0) + 1;
    var pref = { WINDOW: 'W', SCREEN: 'S', MIRROR: 'M', SHOWER: 'SD', STOREFRONT: 'SF' }[family] || family.slice(0, 2);
    racks.push({ id: pref + seq[family], zone: zoneId, family: family, type: type,
                 x: foot.x, y: foot.y, w: foot.w, d: foot.d, h: h || t.h, rot: foot.rot, levels: levels || 1 });
  }

  // 1 — Staging / dispatch strip across the bay wall. Kept empty on purpose.
  zones.push({ id: 'Z-STG', name: 'STAGING / DESPACHO', family: 'STAGING',
               x: 0, y: D - stagingD, w: W, d: stagingD });

  // 2 — Storefront: cantilever along the whole left wall (longest straight run).
  var cantD = RACK_TYPES.CANT.d;
  zones.push({ id: 'Z-SF', name: 'STOREFRONT', family: 'STOREFRONT', x: 0, y: 0, w: cantD, d: usableD });
  rack('Z-SF', 'STOREFRONT', 'CANT', placeBox(WALL_GAP, inch(1), usableD - inch(2), cantD, 90), 4, inch(10));

  // 3 — Far wall strip: mirrors / shower doors / screens, stacked front-to-back.
  var wallD = RACK_TYPES.ARACK.d;                      // 48" deep strip on the right
  var rightX = W - wallD;
  var segs = [
    { id: 'Z-MIR', name: 'ESPEJOS',       family: 'MIRROR', type: 'ARACK',  share: 0.34, levels: 1 },
    { id: 'Z-SHW', name: 'SHOWER DOORS',  family: 'SHOWER', type: 'PALLET', share: 0.33, levels: 3 },
    { id: 'Z-SCR', name: 'SCREENS (WINDOW + DOOR)', family: 'SCREEN', type: 'VRACK', share: 0.33, levels: 1 }
  ];
  var gap = inch(3), yCur = 0;
  var segD = (usableD - gap * (segs.length - 1));
  segs.forEach(function (sg) {
    var h = Math.max(inch(6), segD * sg.share);
    zones.push({ id: sg.id, name: sg.name, family: sg.family, x: rightX, y: yCur, w: wallD, d: h });
    var t = RACK_TYPES[sg.type];
    rack(sg.id, sg.family, sg.type, placeBox(W - t.d - WALL_GAP, yCur + inch(0.5), h - inch(1), t.d, 90), sg.levels,
         sg.type === 'PALLET' ? inch(12) : t.h);
    yCur += h + gap;
  });

  // 4 — Windows: the middle block, rows of double-sided A-frames off the spine.
  var winX = cantD + mainAisle;
  var winW = Math.max(inch(8), rightX - mainAisle - winX);
  zones.push({ id: 'Z-WIN', name: 'VENTANAS', family: 'WINDOW', x: winX, y: 0, w: winW, d: usableD });
  var aF = RACK_TYPES.ARACK, pitch = aF.d + aisle;
  var rows = Math.max(1, Math.floor((usableD + aisle) / pitch));
  for (var i = 0; i < rows; i++) {
    rack('Z-WIN', 'WINDOW', 'ARACK', placeBox(winX, i * pitch, winW, aF.d, 0), 1, aF.h);
  }

  L.zones = zones; L.racks = racks;
  // Anything already measured in the field wins over the generated geometry.
  if (p.columns)   L.building.columns   = p.columns;
  if (p.obstacles) L.building.obstacles = p.obstacles;
  if (p.openings && p.openings.length) L.building.openings = p.openings;
  normalize(L);
  clipRackRuns(L, inch(3));
  return normalize(L);
}

// ─── CSV I/O (round-trips through the WAREHOUSE_LAYOUT sheet) ────────────────
var CSV_HEADER = ['kind', 'id', 'name', 'family', 'type', 'x', 'y', 'w', 'd', 'h', 'rot', 'levels', 'zone', 'extra'];

function toRows(layout) {
  var L = normalize(layout), rows = [CSV_HEADER.slice()];
  rows.push(['meta', L.meta.name || '', '', '', '', L.building.clearH, L.survey.diagA || 0, L.survey.diagB || 0,
             '', '', '', L.meta.rev || 1, '', JSON.stringify({ outline: L.building.outline, updated: L.meta.updated, notes: L.meta.notes || '' })]);
  L.building.columns.forEach(function (c) { rows.push(['column', c.id, '', '', '', c.x, c.y, c.w, c.d, '', '', '', '', '']); });
  L.building.openings.forEach(function (o) { rows.push(['opening', o.id, '', '', o.type, o.x, o.y, o.w, '', o.h, '', '', '', o.wall]); });
  L.building.obstacles.forEach(function (o) { rows.push(['obstacle', o.id, o.name, '', o.type, o.x, o.y, o.w, o.d, o.h, o.rot, '', '', '']); });
  L.zones.forEach(function (z) { rows.push(['zone', z.id, z.name, z.family, '', z.x, z.y, z.w, z.d, '', '', '', '', '']); });
  L.racks.forEach(function (r) { rows.push(['rack', r.id, r.label || '', r.family, r.type, r.x, r.y, r.w, r.d, r.h, r.rot, r.levels, r.zone, (r.bays || []).join('|')]); });
  return rows;
}

function fromRows(rows) {
  var L = emptyLayout(); L.zones = []; L.racks = [];
  L.building.columns = []; L.building.openings = []; L.building.obstacles = [];
  var start = 0;
  if (rows.length && String(rows[0][0]).toLowerCase() === 'kind') start = 1;
  for (var i = start; i < rows.length; i++) {
    var r = rows[i]; if (!r || !r[0]) continue;
    var kind = String(r[0]).toLowerCase();
    var n = function (k) { return Number(r[k]) || 0; };
    if (kind === 'meta') {
      L.meta.name = r[1] || L.meta.name;
      L.building.clearH = n(5) || L.building.clearH;
      L.survey.diagA = n(6); L.survey.diagB = n(7);
      L.meta.rev = n(11) || 1;
      try {
        var ex = JSON.parse(r[13] || '{}');
        if (ex.outline && ex.outline.length >= 3) L.building.outline = ex.outline;
        if (ex.updated) L.meta.updated = ex.updated;
        if (ex.notes) L.meta.notes = ex.notes;
      } catch (e) {}
    } else if (kind === 'column')   L.building.columns.push({ id: r[1], x: n(5), y: n(6), w: n(7), d: n(8) });
    else if (kind === 'opening')    L.building.openings.push({ id: r[1], type: r[4] || 'ROLLUP', x: n(5), y: n(6), w: n(7), h: n(9), wall: r[13] || 'S' });
    else if (kind === 'obstacle')   L.building.obstacles.push({ id: r[1], name: r[2], type: r[4] || 'OTHER', x: n(5), y: n(6), w: n(7), d: n(8), h: n(9), rot: n(10) });
    else if (kind === 'zone')       L.zones.push({ id: r[1], name: r[2], family: r[3] || 'NONE', x: n(5), y: n(6), w: n(7), d: n(8) });
    else if (kind === 'rack')       L.racks.push({ id: r[1], label: r[2], family: r[3], type: r[4] || 'FLOOR', x: n(5), y: n(6), w: n(7), d: n(8), h: n(9), rot: n(10), levels: n(11) || 1, zone: r[12], bays: String(r[13] || '').split('|').filter(Boolean) });
  }
  return normalize(L);
}

function toCSV(layout) {
  return toRows(layout).map(function (r) {
    return r.map(function (c) {
      var s = String(c == null ? '' : c);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',');
  }).join('\n');
}

function parseCSV(text) {
  var rows = [], row = [], cur = '', q = false;
  for (var i = 0; i < text.length; i++) {
    var ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (ch !== '\r') cur += ch;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

// ─── OCCUPANCY (WMS glue) ────────────────────────────────────────────────────
// rackMap comes from the WMS: { 'A1A': [{qty,...}] }. A layout rack can own
// several WMS bay codes (rack.bays) or match its own id.
function occupancyFromRackMap(layout, rackMap) {
  var L = normalize(layout), out = {}, max = 1;
  var totals = {};
  L.racks.forEach(function (r) {
    var codes = (r.bays && r.bays.length) ? r.bays : [r.id];
    var t = 0;
    codes.forEach(function (c) {
      (rackMap[String(c).toUpperCase()] || []).forEach(function (it) { t += Number(it.qty) || 0; });
    });
    totals[r.id] = t; if (t > max) max = t;
  });
  Object.keys(totals).forEach(function (k) { out[k] = totals[k] / max; });
  return { occupancy: out, totals: totals, max: max };
}

// Which WMS locations carry stock but aren't drawn on the plan (and vice versa).
// This is what keeps the drawing honest once people start moving things.
function reconcileWithStock(layout, rackMap) {
  var L = normalize(layout), drawn = {}, out = { missingFromPlan: [], emptyOnPlan: [] };
  L.racks.forEach(function (r) {
    var codes = (r.bays && r.bays.length) ? r.bays : [r.id];
    codes.forEach(function (c) { drawn[String(c).toUpperCase()] = r.id; });
  });
  Object.keys(rackMap || {}).forEach(function (loc) {
    var qty = (rackMap[loc] || []).reduce(function (a, i) { return a + (Number(i.qty) || 0); }, 0);
    if (qty > 0 && !drawn[String(loc).toUpperCase()]) out.missingFromPlan.push(loc);
  });
  Object.keys(drawn).forEach(function (code) {
    var items = (rackMap || {})[code] || [];
    var qty = items.reduce(function (a, i) { return a + (Number(i.qty) || 0); }, 0);
    if (!qty) out.emptyOnPlan.push(code);
  });
  out.missingFromPlan.sort(); out.emptyOnPlan.sort();
  return out;
}

return {
  VERSION: '1.0.0',
  FAMILIES: FAMILIES, RACK_TYPES: RACK_TYPES, CSV_HEADER: CSV_HEADER,
  ft: ft, inch: inch, fmtFt: fmtFt, parseLen: parseLen,
  rectCorners: rectCorners, polyArea: polyArea, polyBBox: polyBBox, pointInPoly: pointInPoly,
  polysOverlap: polysOverlap, rectOutline: rectOutline, pointInPolyTol: pointInPolyTol,
  emptyLayout: emptyLayout, normalize: normalize, rackFamily: rackFamily, rackCapacity: rackCapacity,
  famColor: famColor, famLabel: famLabel,
  validate: validate, reachability: reachability, metrics: metrics, clipRackRuns: clipRackRuns,
  planSVG: planSVG, View3D: View3D, suggestLayout: suggestLayout,
  toRows: toRows, fromRows: fromRows, toCSV: toCSV, parseCSV: parseCSV,
  occupancyFromRackMap: occupancyFromRackMap, reconcileWithStock: reconcileWithStock
};
}));
