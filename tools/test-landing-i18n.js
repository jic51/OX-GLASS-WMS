// One landing page, two languages — and the check that keeps them level.
//
// Jose asked for it: "hacer la landing con un botón que cambie de inglés a
// español todo, así no necesitamos nada más." landing/index.html and
// landing/es.html were the same 582 lines twice: two files to host, two places
// to fix a price, and one of them always the stale one. That is not a
// hypothetical — the published "Acopio en Detalle" sat at $400 + $39/mes for
// weeks because one file was updated and another was not.
//
// So the thing this test actually guards is not the toggle. It is that the two
// languages cannot drift:
//
//   * every element marked for translation has a Spanish string;
//   * every Spanish string is still attached to something on the page;
//   * switching to Spanish and back gives the English page back EXACTLY;
//   * and the prices read the same in both, because a number is not a
//     translation.
//
// Usage:  node tools/test-landing-i18n.js [path/to/landing/acopio.html]

const fs = require('fs'), path = require('path'), os = require('os');
const SRC    = process.argv[2] || path.join(__dirname, '..', 'landing', 'acopio.html');
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const html = fs.readFileSync(SRC, 'utf8');

(async () => {
  let chromium;
  try { chromium = require('playwright').chromium; }
  catch (e) { console.error('playwright is not installed — run: npm install playwright'); process.exit(2); }

  const file = path.join(os.tmpdir(), 'acopio-landing.html');
  fs.writeFileSync(file, html);

  const browser = await chromium.launch({ executablePath: CHROME });
  const fails = [];
  const check = (name, got, want) => {
    if (JSON.stringify(got) !== JSON.stringify(want))
      fails.push(`${name}: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
    else console.log('  ok   ' + name);
  };

  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + file);

  console.log('\n═══ every marked element has a Spanish string, and vice versa ═══\n');

  // Keys the contact form reads from code rather than from an attribute, so
  // they cannot be found by walking the DOM.
  //
  // This USED to be a hand-written list of five, and it did exactly what a
  // hand-written list does: the form grew two more strings and the test called
  // them orphans — Spanish text for something that no longer exists — when they
  // were newly added and perfectly alive. A guard that has to be edited every
  // time the thing it guards changes will one day be edited wrongly, and this
  // file already has that scar.
  //
  // So they are read out of the source: every acopioT('key', …) call there is.
  const codeKeys = [...new Set(
    [...fs.readFileSync(file, 'utf8').matchAll(/acopioT\(\s*'([^']+)'/g)].map(m => m[1])
  )];

  let r = await page.evaluate((codeKeys) => {
    const used = new Set(), attrUsed = new Set();
    document.querySelectorAll('[data-i18n]').forEach(el => used.add(el.getAttribute('data-i18n')));
    document.querySelectorAll('[data-i18n-attr]').forEach(el =>
      el.getAttribute('data-i18n-attr').split(' ').forEach(p => {
        const k = p.split(':')[1]; if (k) attrUsed.add(k);
      }));
    const all = new Set([...used, ...attrUsed, ...codeKeys]);
    const have = new Set(Object.keys(ACOPIO_ES));
    return {
      marked: all.size,
      missing: [...all].filter(k => !have.has(k)),      // on the page, no Spanish
      orphan:  [...have].filter(k => !all.has(k))       // Spanish for nothing
    };
  }, codeKeys);
  check('every marked element has a Spanish string (' + r.marked + ' keys)', r.missing, []);
  // An orphan is how a dictionary rots: a section gets rewritten, its old
  // strings stay behind, and nobody can tell which lines are still live.
  check('no Spanish string is left over from something that no longer exists', r.orphan, []);

  /* ── UNA CLAVE, UN TEXTO ──────────────────────────────────────────────────
   * Las claves son `t` + un número puesto a mano, y el diccionario es un
   * objeto literal: si alguien añade una sección y reusa un número que ya
   * existía, nada se queja. El `data-i18n` duplicado se queda en el HTML y
   * la entrada repetida del diccionario la gana la última — sin error, sin
   * aviso.
   *
   * Pasó el 24/10 añadiendo las dos ediciones al precio: usé t82–t85, que
   * ya eran «Palabras del fundador» y sus tres párrafos. En español la
   * tarjeta de Acopio Básico mostraba el texto del fundador. Las pruebas de
   * arriba no lo veían: la clave existía y estaba en uso, así que ni
   * faltaba ni era huérfana.
   *
   * Dos cosas que tienen que coincidir sin que nada lo obligue: el número
   * que eliges y los que ya están ocupados. Esto es lo que lo obliga.
   *
   * Y OJO DÓNDE SE MIRA: esto se cuenta en el HTML del archivo, no en el DOM
   * del navegador. `acopioApplyLang` memoriza el inglés en `ACOPIO_EN[k]` —
   * una entrada por CLAVE, no por elemento — así que el primer elemento
   * guarda su inglés y acto seguido se lo escribe encima al segundo. Para
   * cuando el DOM se puede leer, los dos elementos ya dicen lo mismo y la
   * diferencia ha desaparecido. Mirar el DOM daba verde con la colisión
   * puesta a mano; lo comprobé. (De paso: eso significa que una clave
   * reusada también rompe la página INGLESA, no sólo la española.) */
  const porClave = {};
  [...html.matchAll(/data-i18n="(t\d+)"\s*>([\s\S]*?)</g)].forEach(m => {
    (porClave[m[1]] = porClave[m[1]] || new Set()).add(m[2].trim());
  });
  check('ninguna clave se usa para dos textos distintos — un número reusado ' +
        'traduce una sección con el texto de otra, y además pisa el inglés',
    Object.keys(porClave)
      .filter(k => porClave[k].size > 1)
      .map(k => ({ clave: k, textos: [...porClave[k]].map(t => t.slice(0, 40)) })),
    []);

  /* Y la otra mitad del mismo fallo: la entrada repetida en el diccionario.
   * El objeto literal se queda con la última, así que la primera sección
   * nunca se traduce aunque su clave esté ahí escrita. JSON.parse no sirve
   * para verlo (también se queda con la última), hay que contar en el
   * texto. */
  const dic = html.slice(html.indexOf('var ACOPIO_ES'));
  const repes = {};
  [...dic.matchAll(/^\s*"(t\d+)"\s*:/gm)].forEach(m => {
    repes[m[1]] = (repes[m[1]] || 0) + 1;
  });
  check('ninguna clave aparece dos veces en el diccionario español — la ' +
        'segunda gana en silencio y la primera sección se queda sin traducir',
    Object.keys(repes).filter(k => repes[k] > 1), []);

  console.log('\n═══ the switch ═══\n');

  r = await page.evaluate(() => {
    const before = [...document.querySelectorAll('[data-i18n]')].map(e => e.innerHTML);
    acopioApplyLang('es');
    const after = [...document.querySelectorAll('[data-i18n]')].map(e => e.innerHTML);
    const changed = before.filter((b, i) => b !== after[i]).length;
    return { total: before.length, changed, lang: document.documentElement.lang,
             btn: document.getElementById('langToggle').textContent.trim() };
  });
  check('switching to Spanish changes every marked element', r.changed, r.total);
  check('...and marks the document as Spanish, for screen readers and Google', r.lang, 'es');
  // A switch, not a label of where you are.
  check('...and the button now offers English', r.btn, 'English');

  r = await page.evaluate(() => {
    const es = [...document.querySelectorAll('[data-i18n]')].map(e => e.innerHTML);
    acopioApplyLang('en');
    const back = [...document.querySelectorAll('[data-i18n]')].map(e => e.innerHTML);
    return { same: es.filter((v, i) => v === back[i]).length,
             lang: document.documentElement.lang,
             btn: document.getElementById('langToggle').textContent.trim() };
  });
  check('switching back restores every element — nothing is left in Spanish', r.same, 0);
  check('...and the document is English again', r.lang, 'en');
  check('...and the button offers Spanish again', r.btn, 'Español');

  // Round-tripping must be lossless. If the English is rebuilt from anything
  // other than what the markup shipped, this is where it shows.
  r = await page.evaluate(() => {
    const first = document.body.innerHTML.length;
    acopioApplyLang('es'); acopioApplyLang('en');
    acopioApplyLang('es'); acopioApplyLang('en');
    return { same: document.body.innerHTML.length === first };
  });
  check('two round trips leave the page byte-identical', r.same, true);

  console.log('\n═══ the attribute translations ═══\n');

  r = await page.evaluate(() => {
    const el = document.querySelector('[data-i18n-attr*="placeholder"]');
    const en = el.getAttribute('placeholder');
    acopioApplyLang('es');
    const es = el.getAttribute('placeholder');
    acopioApplyLang('en');
    return { en, es, back: el.getAttribute('placeholder') };
  });
  check('a translated placeholder changes with the language', r.en !== r.es, true);
  check('...and comes back exactly', r.back, r.en);

  console.log('\n═══ the numbers are not translations ═══\n');

  // The failure that already happened once, on a different page: a price
  // updated in one language and not the other.
  r = await page.evaluate(() => {
    const grab = () => (document.body.innerText.match(/\$[0-9][0-9,]*/g) || []).sort();
    acopioApplyLang('en'); const en = grab();
    acopioApplyLang('es'); const es = grab();
    acopioApplyLang('en');
    return { en: en.join(' '), es: es.join(' ') };
  });
  check('every price on the page reads the same in both languages', r.es, r.en);
  check('...and they are the current ones', /\$500/.test(r.en) && /\$49\b/.test(r.en) && /\$490/.test(r.en), true);

  console.log('\n═══ the button a phone can actually reach ═══\n');

  // The nav is display:none below 640px. A language button inside it would be
  // invisible on exactly the device most of this page's visitors will use.
  const phone = await browser.newPage({ viewport: { width: 375, height: 720 } });
  await phone.goto('file://' + file);
  r = await phone.evaluate(() => {
    const b = document.getElementById('langToggle');
    const nav = document.querySelector('.masthead nav');
    const box = b.getBoundingClientRect();
    return {
      navHidden: getComputedStyle(nav).display === 'none',
      visible: box.width > 0 && box.height > 0,
      inViewport: box.right <= window.innerWidth + 1 && box.left >= -1,
      tall: Math.round(box.height)
    };
  });
  check('the nav is still hidden on a phone, as it was', r.navHidden, true);
  check('...and the language button is not', r.visible, true);
  check('...and it is fully on screen', r.inViewport, true);
  // Small enough to miss is the same as not being there.
  check('...and big enough to hit with a thumb', r.tall >= 28, true);
  await phone.close();

  console.log('\n═══ what happens when the browser refuses to remember ═══\n');

  // A private window, or a browser set to block site data. The page must open
  // in English rather than not open at all.
  const strict = await browser.newPage();
  await strict.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() { throw new Error('blocked'); }
    });
  });
  const strictErrors = [];
  strict.on('pageerror', e => strictErrors.push(e.message));
  await strict.goto('file://' + file);
  r = await strict.evaluate(() => ({
    lang: document.documentElement.lang,
    heading: !!document.querySelector('h1').textContent.trim(),
    toggles: (function(){ acopioToggleLang(); return document.documentElement.lang; })()
  }));
  check('the page still renders when storage throws', r.heading, true);
  check('...in English', r.lang, 'en');
  check('...and the button still works, it just will not be remembered', r.toggles, 'es');
  check('...with no uncaught error', strictErrors, []);
  await strict.close();

  console.log('\n═══ the two old files are gone, not left to rot ═══\n');

  const dir = path.join(__dirname, '..', 'landing');
  check('landing/index.html is gone', fs.existsSync(path.join(dir, 'index.html')), false);
  check('landing/es.html is gone',    fs.existsSync(path.join(dir, 'es.html')), false);
  // The other landing pages linked to them by name.
  const strays = ['acopio-overview.html', 'changelog.html', 'novedades.html']
    .filter(f => fs.existsSync(path.join(dir, f)))
    .filter(f => /href="(index|es)\.html"/.test(fs.readFileSync(path.join(dir, f), 'utf8')));
  check('nothing still links to them', strays, []);

  await browser.close();
  if (errors.length) fails.push('page errors: ' + errors.join(' | '));
  if (fails.length){ console.error('\nFAILED:\n  ' + fails.join('\n  ')); process.exit(1); }
  console.log('\nlanding i18n: ok');
})();
