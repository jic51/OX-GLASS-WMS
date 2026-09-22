// CADA VENTANA, DEL TAMAÑO DE LO QUE LLEVA DENTRO.
//
// La regla es de Jose, 2026-09-22, y la dio él como regla:
//
//   "Toda ventana debe aparecer completa si la pantalla se lo permite, pero
//    completa significa que se vea todo el contenido. Si una ventana tiene poco
//    contenido (como Add User), entonces la ventana sólo debe tener el tamaño
//    necesario para mostrar el contenido, no ocupar toda la pantalla porque
//    sí."
//
// ── LA LÍNEA QUE LO CAUSABA, Y POR QUÉ COSTÓ TANTO VERLA ─────────────────────
//
// `.modal` declaraba `height:min(82vh,700px)` — altura FIJA, y puesta a
// propósito: el comentario que había defendía que todas las ventanas midieran
// igual. El efecto era que las VEINTE ventanas de la app miden el 82% de la
// pantalla, lleven cuatro campos o veinte.
//
// Jose dio con ella desde los dos extremos, con cinco días de diferencia y sin
// saber que era la misma línea:
//
//   2026-09-17  "la ventana del Add User es muy grande, no debe ser tan grande
//                si lo que tiene dentro no es tanto"
//   2026-09-22  "la ventana de Edit es muy pequeña incluso cuando la pantalla es
//                grande, lo que hace que siempre haya una scroll bar vertical"
//
// Una ventana con demasiado vacío y otra con demasiado poco sitio: la misma
// causa. Por eso esta prueba no mira una ventana — las abre TODAS y mide cada
// una contra su propio contenido. Un fallo así sólo se ve contando.
//
// ── LO QUE SE MIDE ──────────────────────────────────────────────────────────
//
//   1. Que ninguna ventana sea más alta de lo que necesita. Se compara su
//      altura con la de su contenido: si sobran más de unos pocos píxeles, está
//      ocupando pantalla "porque sí".
//   2. Que ninguna se pase del tope. Una ventana más alta que la pantalla no se
//      puede cerrar.
//   3. Que la que SÍ es larga siga pudiendo desplazarse, que es lo que el tope
//      existe para permitir.
//
// Uso:  CHROME_PATH=/opt/pw-browsers/chromium-*/chrome-linux/chrome \
//       node tools/test-ventanas.js

const fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

const DATA = {
  userRole:'ADMIN', userEmail:'jose@ox.com', userName:'Jose Castro', serverVersion:'test',
  company:{ name:'OX Glass LLC.' }, movements:[], stock:{}, materialLocks:[],
  monitoredMaterials:null,
  config:{ categories:['WINDOW','SCREEN'], projects:['SUNBRIDGE'], suppliers:['MILGARD'],
           locations:[{ name:'A1A', type:'RACK' }], units:['UNIT'] },
  incoming:[], rackPhotos:{}, systemActivity:[],
  rolePerms:{ canSeeCosts:true, canEditMovements:true, canManageCatalog:true, canExportData:true },
  warehouseRoleLabel:'Warehouse', archiveCutoffMonths:12, oauthClientId:'', oauthRedirectUri:''
};

function pagina(){
  const stub = `<script>
window.google=window.google||{};window.google.charts={load:function(){},setOnLoadCallback:function(){}};
Object.assign(window.google,{script:{run:new Proxy({},{get(t,k){return function(){
 if(k==='withSuccessHandler'){t._ok=arguments[0];return window.google.script.run;}
 if(k==='withFailureHandler'){return window.google.script.run;}
 var ok=t._ok;
 if(k==='getInitialData'){setTimeout(function(){ok&&ok(window.__DATA);},20);return;}
 setTimeout(function(){ok&&ok({});},10);};}})}});
window.__DATA=${JSON.stringify(DATA)};
<\/script>`;
  const f = path.join(os.tmpdir(), 'ac-vent-' + Math.random().toString(36).slice(2) + '.html');
  fs.writeFileSync(f, html.replace('</head>', stub + '</head>'));
  return f;
}

/* Las que NO entran, y por qué. Ninguna es una ventana normal: son pantallas
 * completas o cajas que se dibujan solas, y medirlas contra "su contenido" no
 * significaría nada. Como en las demás listas de excepciones del repositorio,
 * cada una lleva su razón y se comprueba abajo que sigan existiendo. */
const FUERA = {
  wizOverlay:         'el asistente de instalación: ocupa la pantalla entera a propósito, no es una ventana',
  mediaPreviewOverlay:'ver un documento a tamaño completo — su contenido ES la pantalla',
  rackDrawerOverlay:  'sólo el fondo oscuro del cajón; el cajón no es un .modal',
  morningOverlay:     'el popup de la mañana tiene su propia caja, no usa .modal',
  confirmOverlay:     'usa .cconfirm-dialog, que ya se ajusta a su texto',
  promptOverlay:      'lo mismo: su propia caja, de una sola línea'
};

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  const errores = [];
  /* PANTALLA GRANDE A PROPÓSITO. La regla dice "si la pantalla se lo permite",
   * así que hay que darle una pantalla que se lo permita: en una baja, toda
   * ventana llega al tope y no se podría distinguir la que sobra de la que no.
   * 1600×1200 deja 82vh = 984px de margen, más que cualquier formulario. */
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  page.on('pageerror', e => errores.push(e.message));
  await page.goto('file://' + pagina());
  await page.waitForTimeout(800);

  // Las ventanas se sacan DEL ARCHIVO, no de una lista escrita a mano: una
  // ventana nueva tiene que entrar aquí sola, o esta prueba envejece sin avisar.
  const ids = [...new Set((html.match(/id="([a-zA-Z]+Overlay)"/g) || [])
    .map(s => /id="([^"]+)"/.exec(s)[1]))].sort();

  console.log('\n═══ ' + ids.length + ' ventanas encontradas en el archivo ═══\n');

  const medidas = await page.evaluate((lista) => {
    const out = {};
    lista.forEach(id => {
      const ov = document.getElementById(id);
      if (!ov) { out[id] = { falta: true }; return; }
      const modal = ov.querySelector(':scope > .modal');
      if (!modal) { out[id] = { sinModal: true }; return; }
      ov.classList.add('show');
      const r = modal.getBoundingClientRect();
      const cs = getComputedStyle(modal);
      /* EL ALTO DEL CONTENIDO NO ES `scrollHeight`, y eso se descubrió con una
       * mutación que pasó en verde. `scrollHeight` NUNCA devuelve menos que
       * `clientHeight`: en una ventana de 700px con 277px dentro contesta 700,
       * así que "alto − contenido" daba 0 y la comprobación principal no podía
       * ver el fallo que existe para ver. Con la altura fija puesta otra vez,
       * sólo se enteraba la comprobación de la fuente.
       *
       * El alto real del contenido es dónde ACABA el último hijo, medido desde
       * el borde de arriba de la caja y sumándole el relleno de abajo. Eso sí
       * puede ser menor que la caja, que es justo lo que hay que detectar. */
      /* Y NO VALE "EL ÚLTIMO HIJO": tiene que ser el que llega más abajo DE LOS
       * QUE SE VEN. emailImportOverlay acaba en un bloque oculto, cuyo
       * rectángulo es 0×0 en la esquina de la página, y restarle el borde de la
       * caja daba −389px de contenido. Un hijo escondido no ocupa alto, así que
       * no cuenta para cuánto alto hace falta. */
      const relleno = parseFloat(cs.paddingBottom) || 0;
      let fondo = null;
      Array.prototype.forEach.call(modal.children, function (h) {
        const hr = h.getBoundingClientRect();
        if (hr.height <= 0 && hr.width <= 0) return;      // escondido: no ocupa
        if (fondo === null || hr.bottom > fondo) fondo = hr.bottom;
      });
      const contenido = fondo === null
        ? modal.scrollHeight
        : Math.round(fondo - r.top + modal.scrollTop + relleno);
      out[id] = {
        alto:      Math.round(r.height),
        contenido: contenido,
        desplaza:  modal.scrollHeight > modal.clientHeight + 1,
        tope:      Math.round(parseFloat(cs.maxHeight)),
        ancho:     Math.round(r.width)
      };
      ov.classList.remove('show');
    });
    return out;
  }, ids);

  const normales = ids.filter(id => !FUERA[id] && medidas[id] && !medidas[id].sinModal);
  check('hay ventanas normales que medir', normales.length >= 10, normales.length);

  /* 1. NINGUNA MÁS ALTA DE LO QUE NECESITA.
   *
   * El margen son 4px por los redondeos de subpíxel del navegador; con `height`
   * fijo la diferencia era de CIENTOS, así que no hay riesgo de que un margen
   * generoso deje pasar el fallo. Se comprueba justo debajo. */
  const sobradas = normales.filter(id => {
    const m = medidas[id];
    return !m.desplaza && m.alto - m.contenido > 4;
  }).map(id => id + ' (' + medidas[id].alto + 'px para ' + medidas[id].contenido + 'px de contenido)');
  check('ninguna ventana ocupa más alto del que necesita' +
        (sobradas.length ? ' — SOBRAN: ' + sobradas.join('; ') : ''),
        sobradas.length === 0);

  /* Y QUE LA CAUSA CONCRETA NO VUELVA, comprobada EN LA FUENTE y no en el
   * estilo calculado. La primera versión de esta comprobación miraba si la
   * altura calculada coincidía con el tope, y señalaba a dos ventanas que
   * estaban perfectamente: `getComputedStyle().height` devuelve la altura USADA,
   * que es igual al tope siempre que el contenido llegue a él. No se puede
   * distinguir ahí "altura clavada" de "contenido que da justo". En el texto de
   * la regla no hay ambigüedad: o dice `height:` o no lo dice. */
  const reglaModal = /\.modal\{([^}]*)\}/.exec(html);
  check('la regla de .modal existe y se puede leer', !!reglaModal);
  check('NO declara una altura fija — era la línea que hacía que las veinte ' +
        'ventanas midieran el 82% de la pantalla',
        !!reglaModal && !/(^|;)\s*height:/.test(reglaModal[1]),
        reglaModal && reglaModal[1].slice(0, 160));
  check('...sino un tope, y el tope es la pantalla',
        !!reglaModal && /max-height:\s*82vh/.test(reglaModal[1]),
        reglaModal && /max-height:[^;]*/.exec(reglaModal[1])[0]);

  /* 2. NINGUNA SE PASA DEL TOPE. Una ventana más alta que la pantalla no se
   * puede cerrar: el botón de cerrar queda fuera. */
  const altas = normales.filter(id => medidas[id].alto > medidas[id].tope + 1)
    .map(id => id + ' (' + medidas[id].alto + ' > ' + medidas[id].tope + ')');
  check('ninguna se pasa del tope de la pantalla' +
        (altas.length ? ' — SE PASAN: ' + altas.join('; ') : ''), altas.length === 0);

  /* 3. LA QUE SÍ ES LARGA SIGUE DESPLAZÁNDOSE. El tope existe para eso, y una
   * regla que dejara una ventana larga sin poder desplazarse escondería
   * campos — que es peor que el problema que se arregló. */
  const largas = normales.filter(id => medidas[id].contenido > medidas[id].tope);
  check('las que no caben se pueden desplazar',
        largas.every(id => medidas[id].desplaza), largas);

  console.log('\n═══ Las dos que Jose nombró ═══\n');

  // Add User: la que él dijo que era "muy grande" para lo poco que lleva.
  const addUser = medidas.userFormOverlay;
  check('Add User existe y se midió', !!addUser && !addUser.falta, addUser);
  check('...y ya NO ocupa la pantalla entera: mide lo que su contenido',
        addUser && addUser.alto - addUser.contenido <= 4, addUser);
  check('...que es bastante menos que el tope',
        addUser && addUser.alto < addUser.tope * 0.9,
        addUser && { alto: addUser.alto, tope: addUser.tope });

  // Edit Movement: la que él dijo que era "muy pequeña" y por eso desplazaba.
  const edit = medidas.editMovOverlay, mueve = medidas.moveOverlay;
  check('Edit existe y se midió', !!edit && !edit.falta, edit);
  check('...y ahora es TAN ANCHA como la ventana donde se creó el movimiento',
        edit && mueve && edit.ancho === mueve.ancho,
        { edit: edit && edit.ancho, entryExit: mueve && mueve.ancho });

  console.log('\n═══ Las excepciones ═══\n');

  const rancias = Object.keys(FUERA).filter(id => ids.indexOf(id) === -1);
  check('ninguna excepción nombra una ventana que ya no existe' +
        (rancias.length ? ' — SOBRAN: ' + rancias.join(', ') : ''), rancias.length === 0);

  // Una excepción que dejó de hacer falta también sobra: si la ventana pasó a
  // usar .modal, hay que medirla como las demás en vez de dejarla aparcada.
  const yaMiden = Object.keys(FUERA).filter(id => medidas[id] && !medidas[id].sinModal &&
                                                   !medidas[id].falta);
  check('ninguna excepción usa ya .modal' +
        (yaMiden.length ? ' — YA LA USAN: ' + yaMiden.join(', ') : ''), yaMiden.length === 0);

  check('y la página no tiró ningún error', errores.length === 0, errores);

  console.log('\n  ── el detalle, para leerlo cuando algo falle ──');
  normales.forEach(id => {
    const m = medidas[id];
    console.log('     ' + id.padEnd(22) + String(m.alto).padStart(5) + 'px  ' +
      'contenido ' + String(m.contenido).padStart(5) + 'px  ' +
      (m.desplaza ? 'se desplaza' : 'entero'));
  });

  await browser.close();
  console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones');
  process.exit(fail ? 1 : 0);
})();
