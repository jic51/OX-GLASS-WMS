// LA UBICACIÓN QUE NO EXISTE: AVISADA AL ESCRIBIR, Y NUNCA COMO UN FALLO.
//
// Jose, 13/10, dos vídeos. Dos problemas y uno es peor de lo que parece.
//
// ── 1. NO AVISA HASTA QUE SE GUARDA ─────────────────────────────────────────
//
// *"La app no avisa ni dice nada con una location que no existe, hasta que se
// trata de guardar. Eso no es útil."*
//
// Y en el vídeo se ve algo peor que lo que dijo: el formulario llega a componer
// el CORREO DE AVISO —«152 UNIT(s) of MIRRORS → p9a»— con una ubicación que no
// existe. Todo se comporta como si `p9a` fuera un sitio real hasta el segundo
// en que se pulsa guardar.
//
// ── 2. Y CUANDO AVISA, PARECE QUE LA APP SE ROMPIÓ ──────────────────────────
//
// Lo que salía en pantalla, literalmente:
//
//     ✕ Error: UNKNOWN_LOCATION|P|B [ID: 3ce2353a]
//
// en un toast rojo de seis segundos. La cadena del protocolo, cruda. El propio
// código decía que eso no podía pasar —«lo de después de la tubería no se
// enseña nunca tal cual»— y pasaba, porque la cadena de manejadores estaba
// escrita TRES VECES, una por camino de guardado, y sólo una la tenía entera.
//
// Lo que esta prueba vigila es que vuelva a haber UNA sola.
//
// Usage:  node tools/test-ubicacion-avisa.js [path/to/Index_v3_fixed.html]

const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');

const SRC = process.argv[2] || path.join(__dirname, '..', 'Index_v3_fixed.html');
let html = fs.readFileSync(SRC, 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FALLA ' + label + (extra === undefined ? '' : '  → ' + JSON.stringify(extra))); }
}

/* ══ PARTE 1 · LOS TRES CAMINOS LLAMAN A LA MISMA CADENA ════════════════════
 *
 * Esto se lee del archivo y no se mide en un navegador, y el motivo es que lo
 * que falló NO era el comportamiento de un camino: era que había TRES listas
 * que tenían que coincidir sin que nada lo obligara. Lo que hay que vigilar es
 * la forma, porque la forma ERA el fallo.
 *
 * Y se cuenta con ancla al principio de línea. Sin ella, la DEFINICIÓN de
 * `_errorConocido` cuenta como una llamada y la prueba ve cuatro donde hay
 * tres — es el cuarto intento de este mismo despiste en el repositorio
 * (`_pintarGuardado`, `_aplicarStockDelServidor`, `_aplicarCandados`). */
console.log('\n═══ 1. UNA SOLA CADENA, Y LOS TRES CAMINOS LA USAN ═══\n');

const sinComentarios = html
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const llamadas = (sinComentarios.match(/(?:^|[^\w.])_errorConocido\s*\(/gm) || []).length;
const definicion = (sinComentarios.match(/^function _errorConocido\s*\(/gm) || []).length;

check('`_errorConocido` está definida una sola vez', definicion === 1, { definicion });
check('y la llaman los tres caminos de guardado (' + (llamadas - definicion) + ' llamadas)',
  llamadas - definicion === 3, { llamadas, definicion });

/* Y ninguno de los tres puede volver a tener su propia copia de la lista. */
for (const accion of ['addMovement', 'addMultiEntry', 'addMultiExit']) {
  const i = sinComentarios.indexOf("processMovement('" + accion + "'");
  check('`' + accion + '` existe en el archivo', i !== -1);
  if (i === -1) continue;
  /* El manejador va ANTES de la llamada: se mira el trozo de arriba. */
  const trozo = sinComentarios.slice(Math.max(0, i - 4000), i);
  check('...y su manejador de fallo pasa por `_errorConocido`',
    /_errorConocido\s*\(/.test(trozo));
}

/* La prueba de que el toast crudo ya no es la única salida: que ninguno de los
 * tres enseñe el mensaje sin haber preguntado antes por los marcados. */
check('ningún camino llama a `_ubicacionDesconocida` por su cuenta: ' +
      'la copia de la lista es lo que falló y no debe volver',
  (sinComentarios.match(/(?:^|[^\w.])_ubicacionDesconocida\s*\(/gm) || []).length === 2,
  { veces: (sinComentarios.match(/(?:^|[^\w.])_ubicacionDesconocida\s*\(/gm) || []).length });

/* ══ PARTE 2 · EL AVISO AL ESCRIBIR, EN UN NAVEGADOR ════════════════════════ */

const stub = `<script>
window.google=window.google||{}; window.google.charts=window.google.charts||{load:function(){},setOnLoadCallback:function(){}};
Object.assign(window.google,{script:{run:new Proxy({},{get(t,k){
  return function(){
    if(k==='withSuccessHandler'){ t._ok=arguments[0]; return window.google.script.run; }
    if(k==='withFailureHandler'){ return window.google.script.run; }
    var ok=t._ok;
    if(k==='getInitialData'){ setTimeout(function(){ ok && ok(window.__DATA); },40); return; }
    setTimeout(function(){ ok && ok({}); },20);
  };
}})}});
window.__DATA={ userRole:'ADMIN', userEmail:'jose@ox-glass.com', userName:'Jose Castro',
 serverVersion:'test', company:{name:'OX Glass LLC.',domain:'ox-glass.com',logo:''},
 movements:[], stock:{}, monitoredMaterials:null,
 config:{ categories:['MIRRORS'], projects:['TOWER ONE'], suppliers:['AMSCO'],
   locations:[{name:'A1A',group:'RACKS'},{name:'A1B',group:'RACKS'},
              {name:'A1C',group:'RACKS'},{name:'B2B',group:'RACKS'}], units:['Unit'] },
 incoming:[], rackPhotos:{}, systemActivity:[],
 rolePerms:{canSeeCosts:false,canEditMovements:true,canManageCatalog:true,canExportData:true},
 warehouseRoleLabel:'Warehouse', archiveCutoffMonths:12, oauthClientId:'', oauthRedirectUri:'' };
</script>`;
html = html.replace('</head>', stub + '</head>');
const f = path.join(os.tmpdir(), 'acopio-ubic-avisa.html');
fs.writeFileSync(f, html);

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  await page.goto('file://' + f);
  await page.waitForTimeout(700);

  /* Igual que en test-proyecto-nuevo.js: el campo se monta a mano porque lo que
   * se mide es el CABLEADO GLOBAL de eventos, no una pantalla concreta. Así la
   * prueba sigue valiendo el día que el formulario se mueva, y cubre de una vez
   * las filas de varios materiales, que se crean solas. */
  const montar = (clase) => page.evaluate((cl) => {
    var viejo = document.getElementById('probe-caja');
    if (viejo) viejo.remove();
    var caja = document.createElement('div');
    caja.id = 'probe-caja';
    caja.style.cssText = 'position:fixed;top:10px;left:10px;z-index:99999';
    caja.innerHTML = '<input type="text" id="probe-loc" ' +
      (cl === 'lista' ? 'list="rackList"' : 'class="' + cl + '"') + '>' +
      '<input type="text" id="probe-otro">';
    document.body.appendChild(caja);
  }, clase);

  const aviso = () => page.evaluate(() => {
    var el = document.getElementById('probe-loc');
    var sig = el && el.nextElementSibling;
    if (!(sig && sig.classList && sig.classList.contains('ubic-hint'))) return null;
    return { texto: sig.textContent,
             botones: Array.from(sig.querySelectorAll('button')).map(b => b.textContent) };
  });

  console.log('\n═══ 2. AVISA AL ESCRIBIR, NO AL GUARDAR ═══\n');

  await montar('lista');
  await page.fill('#probe-loc', 'A1p');
  await page.click('#probe-otro');
  await page.waitForTimeout(150);
  const a = await aviso();
  check('escribo `A1p` y salgo → avisa ANTES de guardar', !!a, a);
  check('...y lo dice en castellano llano, sin cadena de protocolo: ' +
        'ni «UNKNOWN_LOCATION» ni tuberías',
    !!a && !/UNKNOWN_LOCATION|\|/.test(a.texto), a && a.texto);
  check('...y propone la parecida, que es el caso real del vídeo (`A1p` → `A1A`)',
    !!a && a.botones.some(b => /Use A1A/.test(b)), a && a.botones);
  check('...y ofrece crearla, porque quien mira es admin',
    !!a && a.botones.some(b => /Create A1p/i.test(b)), a && a.botones);

  console.log('\n═══ 3. EL BOTÓN DE LA PARECIDA ARREGLA EL CAMPO ═══\n');
  await page.click('#probe-loc + .ubic-hint button');
  await page.waitForTimeout(150);
  check('pulsar «Use A1A» deja A1A en el campo',
    (await page.inputValue('#probe-loc')) === 'A1A');
  check('...y el aviso desaparece, porque ya no hay nada que avisar',
    (await aviso()) === null);

  console.log('\n═══ 4. LO QUE NO DEBE AVISAR ═══\n');

  await montar('lista');
  await page.fill('#probe-loc', 'A1A');
  await page.click('#probe-otro');
  await page.waitForTimeout(150);
  check('una ubicación que SÍ existe no avisa de nada', (await aviso()) === null);

  await montar('lista');
  await page.fill('#probe-loc', 'a1a');
  await page.click('#probe-otro');
  await page.waitForTimeout(150);
  check('...y en minúsculas tampoco: se compara sin distinguir mayúsculas',
    (await aviso()) === null);

  await montar('lista');
  await page.fill('#probe-loc', '  ');
  await page.click('#probe-otro');
  await page.waitForTimeout(150);
  check('el campo vacío no avisa', (await aviso()) === null);

  /* El que de verdad importa: sin lista cargada, callarse. Decir «no existe»
   * porque la configuración aún no ha llegado sería mentir con cara de ayuda. */
  await page.evaluate(() => { window.__locs = config.locations; config.locations = []; });
  await montar('lista');
  await page.fill('#probe-loc', 'CUALQUIERA');
  await page.click('#probe-otro');
  await page.waitForTimeout(150);
  check('sin lista de ubicaciones cargada NO opina: decir «no existe» porque ' +
        'aún no llegó la configuración sería mentir con cara de ayuda',
    (await aviso()) === null);
  await page.evaluate(() => { config.locations = window.__locs; });

  console.log('\n═══ 5. LAS FILAS DE VARIOS MATERIALES TAMBIÉN ═══\n');
  //
  // El vídeo de Jose es justo el formulario de varios materiales, cuyas filas
  // se crean solas con `.loc-rack`. Si el aviso sólo mirara los campos con id
  // fijo, la pantalla del vídeo seguiría muda.
  for (const clase of ['loc-rack', 'el-rack']) {
    await montar(clase);
    await page.fill('#probe-loc', 'ZZ9');
    await page.click('#probe-otro');
    await page.waitForTimeout(150);
    check('una fila `.' + clase + '` (creada sobre la marcha) también avisa',
      (await aviso()) !== null);
  }

  console.log('\n═══ 6. SIN PERMISO, SE DICE A QUIÉN PEDIRLO ═══\n');
  await page.evaluate(() => { window.userRole = 'WAREHOUSE';
                              window.rolePerms = { canManageCatalog: false }; });
  await montar('lista');
  await page.fill('#probe-loc', 'ZZ9');
  await page.click('#probe-otro');
  await page.waitForTimeout(150);
  const b = await aviso();
  check('a quien no puede tocar el catálogo se le avisa igual', !!b, b);
  check('...pero no se le ofrece crearla',
    !!b && !b.botones.some(x => /Create/i.test(x)), b && b.botones);
  check('...se le dice a quién pedírselo, en vez de dejarle ante una puerta cerrada',
    !!b && /admin/i.test(b.texto), b && b.texto);
  await page.evaluate(() => { window.userRole = 'ADMIN';
                              window.rolePerms = { canManageCatalog: true }; });

  console.log('\n═══ 7. NO BLOQUEA NADA ═══\n');
  //
  // La lista de aquí es una COPIA que puede estar vieja: alguien acaba de crear
  // un estante en otra pestaña. Quien decide sigue siendo el servidor, así que
  // este aviso es cortesía temprana y nunca una barrera. Si la copia se
  // equivoca, el guardado tiene que salir igual.
  await montar('lista');
  await page.fill('#probe-loc', 'RECIEN CREADA EN OTRA PESTAÑA');
  await page.click('#probe-otro');
  await page.waitForTimeout(150);
  check('avisa...', (await aviso()) !== null);
  check('...y NO deja el campo inválido ni lo vacía: el servidor es quien decide',
    (await page.inputValue('#probe-loc')) === 'RECIEN CREADA EN OTRA PESTAÑA');

  check('ningún error suelto en la consola', errores.length === 0, errores.slice(0, 3));

  await browser.close();
  console.log('\n' + (fail ? '✗ ' + fail + ' fallos · ' : '✓ todo bien · ') + (ok + fail) + ' comprobaciones\n');
  process.exit(fail ? 1 : 0);
})();
