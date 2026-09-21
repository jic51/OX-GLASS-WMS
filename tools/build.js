// Inlines tools/plan3d-engine.js into every file that ships a copy of it, so the
// engine has exactly one source. Run after touching the engine:
//     node tools/build.js
// Targets:
//   tools/capture-app.html  → dist/OX_PLANO_CAPTURA.html   (offline field app)
//   Index_v3_fixed.html     → in place, between the PLAN3D ENGINE markers
var fs = require('fs'), path = require('path');
var ROOT = path.join(__dirname, '..');
var engine = fs.readFileSync(path.join(ROOT, 'tools/plan3d-engine.js'), 'utf8');

var BEGIN = '/* ══ PLAN3D ENGINE — generado desde tools/plan3d-engine.js · NO EDITAR A MANO ══ */';
var END   = '/* ══ FIN PLAN3D ENGINE ══ */';
var block = BEGIN + '\n' + engine.trim() + '\n' + END;

// 1 — standalone capture app
var app = fs.readFileSync(path.join(ROOT, 'tools/capture-app.html'), 'utf8');
if (app.indexOf('/*__PLAN3D_ENGINE__*/') === -1) throw new Error('capture-app.html perdió el marcador /*__PLAN3D_ENGINE__*/');
var out = app.replace('/*__PLAN3D_ENGINE__*/', function () { return block; });
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dist/OX_PLANO_CAPTURA.html'), out);
console.log('✓ dist/OX_PLANO_CAPTURA.html  (' + Math.round(out.length / 1024) + ' KB, sin dependencias externas)');

// 2 — WMS frontend
var idxPath = path.join(ROOT, 'Index_v3_fixed.html');
var idx = fs.readFileSync(idxPath, 'utf8');
var i0 = idx.indexOf(BEGIN), i1 = idx.indexOf(END);
if (i0 === -1 || i1 === -1) {
  console.log('… Index_v3_fixed.html todavía no tiene los marcadores PLAN3D ENGINE — se omite.');
} else {
  var next = idx.slice(0, i0) + block + idx.slice(i1 + END.length);
  if (next !== idx) { fs.writeFileSync(idxPath, next); console.log('✓ Index_v3_fixed.html actualizado'); }
  else console.log('= Index_v3_fixed.html ya estaba al día');
}

// 3 — guard: the offline app must not reach the network
['dist/OX_PLANO_CAPTURA.html'].forEach(function (f) {
  var t = fs.readFileSync(path.join(ROOT, f), 'utf8');
  var bad = t.match(/<(script|link)[^>]+(src|href)=["']https?:/gi);
  if (bad) throw new Error(f + ' carga recursos externos: ' + bad.join(', '));
});
console.log('✓ sin recursos externos — funciona sin señal');
