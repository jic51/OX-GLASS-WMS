// THE BRAND CORNER — the logo, the company name and the "Acopio" badge.
//
// Jose photographed the bug: the Acopio badge crossed the bottom edge of the
// navy strip into the white below it, and the company logo sat flush against
// the browser chrome with no air above it.
//
// The cause was a hardcoded reserve. The merged topbar takes the brand block
// OUT OF FLOW (position:absolute) so the tabs centre on the page rather than on
// the leftover space beside it — which is right, and was measured — but an
// out-of-flow block cannot tell its container how tall it is. min-height:74px
// was a guess that held only while the logo was a fixed 26px, and a block
// centred inside a box smaller than itself overflows at BOTH ends.
//
// This is the test that a screenshot cannot be: it MEASURES the badge's bottom
// edge against the navy strip's bottom edge, at several logo shapes, and fails
// on overlap rather than on looking wrong to somebody.
//
// Usage:  node tools/test-brand-corner.js

const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');

const SRC = path.join(__dirname, '..', 'Index_v3_fixed.html');
let html = fs.readFileSync(SRC, 'utf8');
const VER = (/var APP_VERSION = '([^']*)';/.exec(html) || [])[1];

// Same version on both sides or the mismatch banner covers the header.
// Proven stub shape, copied from test-header-merge: a Proxy that only ever
// returns FUNCTIONS, so the chained call never lands on undefined. Same version
// on both sides or the mismatch banner covers the header being measured.
const stub = `<script>
window.google=window.google||{}; window.google.charts=window.google.charts||{load:function(){},setOnLoadCallback:function(){}};
Object.assign(window.google,{script:{run:new Proxy({},{get(t,k){
  return function(){
    if(k==='withSuccessHandler'){ t._ok=arguments[0]; return window.google.script.run; }
    if(k==='withFailureHandler'){ return window.google.script.run; }
    var ok=t._ok;
    if(k==='getInitialData'){ setTimeout(function(){ ok && ok(window.__DATA); },20); return; }
    setTimeout(function(){ ok && ok({}); },20);
  };
}})}});
window.__DATA={ userRole:'ADMIN', userEmail:'jose@ox-glass.com', userName:'Jose Castro',
 serverVersion:'${VER}', serverBuild:'', company:{name:'PRODUCTION OX GLASS',domain:'ox-glass.com',logo:''},
 movements:[], stock:{}, stockData:{}, monitoredMaterials:null,
 config:{ categories:[], projects:[], suppliers:[], locations:[], trucks:[], minStock:{} },
 incoming:[], rackPhotos:{}, systemActivity:[],
 rolePerms:{canSeeCosts:false,canEditMovements:false,canManageCatalog:false,canExportData:true} };
<\/script>`;
html = html.replace('</head>', stub + '</head>');
const f = path.join(os.tmpdir(), 'acopio-brand.html');
fs.writeFileSync(f, html);

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

// A real PNG of the requested proportions, as a data URI — the shape has to
// come from an actual decoded image, because that is what _fitAppLogo measures.
function pngDataUri(w, h) {
  // Minimal uncompressed-ish PNG via a canvas is not available in Node, so use
  // an SVG data URI instead: it decodes with naturalWidth/naturalHeight set
  // from its own width/height attributes, which is exactly what is needed.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
              `<rect width="${w}" height="${h}" fill="#B3261E"/></svg>`;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

const SHAPES = [
  ['wide  (400×80)',   400,  80, 'no class (base rule)'],
  ['square (200×200)', 200, 200, 'logo-square'],
  ['tall  (80×300)',    80, 300, 'logo-tall']
];

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  await page.goto('file://' + f);
  await page.waitForTimeout(400);

  console.log('\n═══ the badge must stay inside the navy strip ═══');
  console.log('    (Jose\'s screenshot: it crossed the edge into the white)\n');

  for (const [label, w, h, expectClass] of SHAPES) {
    await page.evaluate(([src, name]) => {
      const logo = document.getElementById('appLogo');
      logo.src = src; logo.style.display = '';
      document.getElementById('appTitle').textContent = name;
      _fitAppLogo(logo);
    }, [pngDataUri(w, h), 'PRODUCTION OX GLASS']);
    await page.waitForTimeout(250);
    await page.evaluate(() => _syncBrandWidth());
    await page.waitForTimeout(150);

    const m = await page.evaluate(() => {
      const bar   = document.querySelector('.topbar');
      const badge = document.querySelector('.author-badge');
      const logo  = document.getElementById('appLogo');
      const b = bar.getBoundingClientRect(), g = badge.getBoundingClientRect(), l = logo.getBoundingClientRect();
      return {
        merged: bar.classList.contains('merged'),
        barTop: b.top, barBottom: b.bottom,
        badgeBottom: g.bottom, badgeTop: g.top,
        logoTop: l.top, logoH: l.height, logoW: l.width,
        cls: logo.className
      };
    });

    const inside   = m.badgeBottom <= m.barBottom - 2 && m.badgeTop >= m.barTop + 2;
    const airAbove = m.logoTop - m.barTop;

    check(label + ' — the Acopio badge sits INSIDE the navy strip' +
          (inside ? '' : ` — badge bottom ${m.badgeBottom.toFixed(0)}px vs strip bottom ${m.barBottom.toFixed(0)}px`),
      inside);
    check(label + ' — the logo has room above it, not flush against the browser chrome (' + airAbove.toFixed(0) + 'px)',
      airAbove >= 8);
    check(label + ' — the shape got the ' + expectClass + ' treatment, so it is not squashed into one box' +
          ' (rendered ' + m.logoW.toFixed(0) + '×' + m.logoH.toFixed(0) + ')',
      expectClass === 'no class (base rule)'
        ? !/logo-(square|tall)/.test(m.cls)
        : m.cls.indexOf(expectClass) !== -1);
    // The reason all three shapes are here: a fixed height renders a tall logo
    // as an unreadable sliver. Nothing may come out under 18px in either axis.
    check(label + ' — still legible: neither side collapses below 18px',
      m.logoH >= 18 && m.logoW >= 18);
  }

  console.log('\n═══ the reserve follows the real block, not a guess ═══\n');
  {
    const v = await page.evaluate(() => {
      const brand = document.querySelector('.topbar-brand').getBoundingClientRect();
      const declared = getComputedStyle(document.documentElement).getPropertyValue('--brand-h');
      const bar = document.querySelector('.topbar').getBoundingClientRect();
      return { brandH: brand.height, declared: parseFloat(declared), barH: bar.height };
    });
    check('--brand-h is measured from the block itself, not hardcoded (' + v.declared.toFixed(0) + 'px)',
      Math.abs(v.declared - v.brandH) < 2);
    check('...and the bar is taller than the block it has to hold (' +
          v.barH.toFixed(0) + 'px bar vs ' + v.brandH.toFixed(0) + 'px block)',
      v.barH > v.brandH);
  }

  console.log('\n═══ the company name is set apart from the interface ═══\n');
  {
    const fonts = await page.evaluate(() => ({
      title: getComputedStyle(document.getElementById('appTitle')).fontFamily,
      body:  getComputedStyle(document.body).fontFamily
    }));
    check('the company name uses a different face from the rest of the app — it is the customer\'s name, not another label',
      fonts.title !== fonts.body);
    check('...and it is a system stack, so the header never waits on a font server to render',
      !/googleapis|http/i.test(fonts.title));
  }

  check('no page errors the whole run', pageErrors.length === 0);
  if (pageErrors.length) pageErrors.forEach(e => console.log('  PAGE ERROR:', e));

  await browser.close();
  console.log('\nbrand-corner: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
  process.exit(fail === 0 ? 0 : 1);
})();
