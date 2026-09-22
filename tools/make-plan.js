// Genera el plano imprimible desde un layout capturado.
//   node tools/make-plan.js [layout.json] [--out dir] [--dark]
// Produce .svg siempre, y .png/.pdf si hay Chromium disponible (Playwright).
var fs = require('fs'), path = require('path');
var E  = require('./plan3d-engine.js');

var args = process.argv.slice(2);
var src  = args.filter(function (a) { return a.charAt(0) !== '-'; })[0] || 'layout/ejemplo-bodega.json';
var outI = args.indexOf('--out');
var outDir = outI !== -1 ? args[outI + 1] : 'dist';
var dark = args.indexOf('--dark') !== -1;

var raw = fs.readFileSync(src, 'utf8');
var layout = src.slice(-4) === '.csv' ? E.fromRows(E.parseCSV(raw)) : E.normalize(JSON.parse(raw));
var base = path.join(outDir, path.basename(src).replace(/\.(json|csv)$/, ''));
fs.mkdirSync(outDir, { recursive: true });

var v = E.validate(layout), m = E.metrics(layout);
var svg = E.planSVG(layout, { width: 1600, height: 1100, dark: dark });
fs.writeFileSync(base + '.svg', svg);

console.log(layout.meta.name);
console.log('  ' + Math.round(m.grossSf).toLocaleString() + ' ft² · altura libre ' + E.fmtFt(layout.building.clearH) +
            ' · ' + layout.racks.length + ' racks · piso en racks ' + Math.round(m.utilization * 100) + '%');
m.byFamily.forEach(function (f) {
  var cap = [];
  if (f.pieces)   cap.push(f.pieces + ' pzas');
  if (f.linearFt) cap.push(Math.round(f.linearFt) + ' ft lin');
  if (f.pallets)  cap.push(f.pallets + ' posiciones');
  if (f.areaSf && !f.pieces) cap.push(Math.round(f.areaSf) + ' ft²');
  console.log('  · ' + f.label + ': ' + f.racks + ' racks, ' + Math.round(f.footprintSf) + ' ft² — ' + (cap.join(' · ') || '—'));
});
console.log('  validación: ' + v.errors + ' errores, ' + v.warnings + ' avisos');
v.items.forEach(function (i) { console.log('    [' + i.level + '] ' + i.msg); });
console.log('✓ ' + base + '.svg');

// PNG + PDF son opcionales: solo si hay Chromium a mano.
function loadPlaywright() {
  var tries = ['playwright', '/opt/node22/lib/node_modules/playwright'];
  for (var i = 0; i < tries.length; i++) { try { return require(tries[i]); } catch (e) {} }
  return null;
}
var pw = loadPlaywright();
if (!pw) {
  console.log('… sin Chromium: abre el .svg en el navegador e imprime desde ahí (Ctrl+P → horizontal).');
  return;
}
(function () {
  var exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', undefined];
  (async function () {
    var browser = null, err = null;
    for (var i = 0; i < exe.length && !browser; i++) {
      try { browser = await pw.chromium.launch(exe[i] ? { executablePath: exe[i] } : {}); }
      catch (e) { err = e; }
    }
    if (!browser) { console.log('… no se pudo abrir Chromium (' + err.message.split('\n')[0] + '); queda el .svg'); return; }
    var page = await browser.newPage({ viewport: { width: 1640, height: 1140 } });
    await page.setContent('<!DOCTYPE html><style>@page{size:1640px 1140px;margin:0}' +
      'html,body{margin:0;background:' + (dark ? '#0F172A' : '#fff') + ';display:flex;align-items:center;justify-content:center}' +
      'svg{max-width:100%;height:auto}</style>' + svg);
    await page.screenshot({ path: base + '.png' });
    await page.pdf({ path: base + '.pdf', width: '1640px', height: '1140px', printBackground: true });
    await browser.close();
    console.log('✓ ' + base + '.png');
    console.log('✓ ' + base + '.pdf');
  })();
})();
