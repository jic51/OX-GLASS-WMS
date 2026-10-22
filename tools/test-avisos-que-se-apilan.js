// DOS AVISOS QUE SE APILABAN, MEDIDOS EN EL NAVEGADOR.
//
// Los dos salen de vídeos que mandó Jose el 21/10, y los dos son la misma falta
// con dos caras: algo que se AÑADE cada vez en vez de haber UNO.
//
// ── EL PRIMERO: EL AVISO DE PRO ─────────────────────────────────────────────
//
// Quince segundos de vídeo: pulsa el candado de «Incoming» cuatro veces y se
// apilan cuatro avisos idénticos, uno sobre otro, tapando la barra de pestañas.
// Mío, de la v12.78: cada llamada hacía `appendChild` y nadie quitaba el
// anterior.
//
// Y no es un fallo de dibujo. Lo que una persona hace cuando pulsa algo y no
// pasa lo que esperaba es VOLVER A PULSAR, así que las cuatro copias no son el
// caso raro: son el normal. El aviso se multiplicaba justo con quien no lo
// entendió a la primera, y encima le tapaba la navegación con la que se habría
// ido a otro sitio.
//
// ── EL SEGUNDO: EL MAZO DE TARJETAS ─────────────────────────────────────────
//
// Treinta y tres segundos de vídeo: pulsa la ✕ del mazo doce veces y siguen
// entrando tarjetas desde el fondo de la cola — «archive start» del 8/10,
// «Backup created» del 9/10, «Old movements archived» del 10/10, del 14/10, del
// 15/10… Tres por noche, por los días que uno no entre.
//
// Lo que vacía el mazo no es más paciencia, es una línea: **una tarjeta es para
// «la app cambió algo que tú no pediste»; un registro es para «la app hizo su
// trabajo»**. El respaldo de cada noche es lo segundo.
//
// LA MITAD QUE HAY QUE DEFENDER, y por eso esta prueba existe: que las rutinas
// desaparezcan del MAZO y no del producto. Siguen enteras en Settings → System.
// Una prueba que sólo comprobara que ya no salen estaría igual de contenta si
// alguien las borrara del todo, que es una pérdida de datos con cara de arreglo.
//
// Uso:  node tools/test-avisos-que-se-apilan.js

const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');

const RAIZ = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(RAIZ, 'Index_v3_fixed.html'), 'utf8');

let ok = 0; const fails = [];
function check(label, got, want) {
  const bien = (want === undefined) ? !!got : JSON.stringify(got) === JSON.stringify(want);
  if (bien) { ok++; console.log('  ok   ' + label); }
  else { fails.push(label + ': esperaba ' + JSON.stringify(want) + ', salió ' + JSON.stringify(got));
         console.log('  FALLA ' + label + '  → ' + JSON.stringify(got)); }
}

/* La cola tal como la devuelve el servidor: tres rutinas y dos cosas que SÍ
 * cambiaron datos. La mezcla es el punto — con sólo rutinas, «el mazo está
 * vacío» pasaría por el motivo equivocado. */
const ACTIVIDAD = [
  { at: '2026-10-08T09:47:00Z', action: 'ARCHIVE_START',      label: 'archive start',
    detail: 'nightly archive starting · v12.47', extra: '' },
  { at: '2026-10-09T08:37:00Z', action: 'BACKUP_CREATED',     label: 'Backup created',
    detail: 'DEMO — Acopio — Backup 2026-10-09', extra: '' },
  { at: '2026-10-10T09:47:00Z', action: 'ARCHIVE_RECONCILE',  label: 'Old movements archived',
    detail: 'v12.54 · cutoff=6mo', extra: '' },
  { at: '2026-10-11T10:04:00Z', action: 'AUTO_REPAIR_MATID',  label: 'Movements re-linked to the right material',
    detail: '3 movements re-linked', extra: '' },
  { at: '2026-10-12T10:04:00Z', action: 'AUTO_REPAIR_TOTAL_COST', label: 'Totals recalculated (Qty × Unit Cost)',
    detail: '2 rows', extra: '' }
];

const DATA = {
  userRole: 'ADMIN', userEmail: 'jose@ox.com', userName: 'Jose', serverVersion: 'test',
  company: { name: 'OX Glass LLC.' }, movements: [], stock: {}, materialLocks: [],
  monitoredMaterials: null, basic: true,
  config: { categories: ['WINDOW'], projects: [], suppliers: [],
            locations: [{ name: 'A1A', type: 'RACK' }], units: ['UNIT'] },
  incoming: [], rackPhotos: {}, systemActivity: ACTIVIDAD,
  rolePerms: { canSeeCosts: true, canEditMovements: true, canManageCatalog: true, canExportData: true },
  warehouseRoleLabel: 'Warehouse', archiveCutoffMonths: 12, oauthClientId: '', oauthRedirectUri: ''
};

function pagina(){
  const stub = `<script>
window.google=window.google||{};window.google.charts={load:function(){},setOnLoadCallback:function(){}};
window.__DATA=${JSON.stringify(DATA)};
(function(){
  var ok=null;
  var api={
    withSuccessHandler:function(f){ ok=f; return proxy; },
    withFailureHandler:function(){ return proxy; },
    getInitialData:function(){ var h=ok; setTimeout(function(){h&&h(window.__DATA);},20); },
    processMovement:function(a){ var h=ok, v=(a==='getPmDirectory')?[]:{}; setTimeout(function(){h&&h(v);},10); }
  };
  var proxy=new Proxy(api,{get:function(t,k){
    if(k in t) return t[k];
    return function(){ var h=ok; setTimeout(function(){h&&h({});},10); };
  }});
  window.google.script={run:proxy};
})();
<\/script>`;
  const f = path.join(os.tmpdir(), 'ac-apila-' + Math.random().toString(36).slice(2) + '.html');
  fs.writeFileSync(f, html.replace('</head>', stub + '</head>'));
  return f;
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  const p = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  const errores = [];
  p.on('pageerror', e => errores.push(e.message));
  await p.goto('file://' + pagina());
  await p.waitForTimeout(1100);

  console.log('\n═══ 1. El aviso de Pro, pulsado cuatro veces ═══\n');

  const cuenta = () => document.querySelectorAll('#toastContainer .toast').length;

  const unaVez = await p.evaluate(() => { _proToast('fotos'); return { n: document.querySelectorAll('#toastContainer .toast').length }; });
  check('una pulsación, un aviso', unaVez.n, 1);

  const cuatro = await p.evaluate(() => {
    _proToast('fotos'); _proToast('fotos'); _proToast('fotos');
    return {
      n: document.querySelectorAll('#toastContainer .toast').length,
      texto: (document.querySelector('#toastContainer .toast-msg') || {}).textContent || ''
    };
  });
  check('CUATRO pulsaciones del mismo candado siguen siendo UN aviso — es el ' +
        'vídeo de Jose: insistir no puede castigar a quien no lo entendió a la ' +
        'primera, y menos tapándole las pestañas con las que se iría',
    cuatro.n, 1);
  check('...y sigue hablando de lo que se pulsó',
    /Rack photos|photos/i.test(cuatro.texto), true);

  const otro = await p.evaluate(() => {
    _proToast('etiquetas');
    return {
      n: document.querySelectorAll('#toastContainer .toast').length,
      texto: (document.querySelector('#toastContainer .toast-msg') || {}).textContent || ''
    };
  });
  check('pulsar OTRO candado tampoco apila: sigue habiendo uno', otro.n, 1);
  check('...y ahora habla de la función nueva, no de la anterior',
    otro.texto !== cuatro.texto, true);

  /* EL GOLPECITO. Sin él, volver a pulsar no produce NADA visible —no aparece
   * un aviso nuevo porque ya hay uno— y eso es lo que lleva a seguir pulsando.
   * Se comprueba que la clase esté puesta; que la animación se vea es cosa del
   * navegador, no nuestra. */
  const golpe = await p.evaluate(() =>
    document.querySelector('#toastContainer .toast').classList.contains('pro-reavisa'));
  check('al reusarlo lleva la marca del golpecito, para que se vea que contestó',
    golpe, true);

  /* Y que el enlace a Pro siga ahí: el aviso existe para eso. */
  const enlace = await p.evaluate(() => {
    const a = document.querySelector('#toastContainer .toast-pro');
    return a ? a.getAttribute('href') : null;
  });
  check('el enlace a Acopio Pro sobrevive al reuso — es para lo que existe el aviso',
    /acopio\.net/.test(enlace || ''), true);

  const cerrado = await p.evaluate(() => {
    document.querySelector('#toastContainer .toast-close').click();
    return document.querySelectorAll('#toastContainer .toast').length;
  });
  check('la ✕ lo quita', cerrado, 0);

  const otraVez = await p.evaluate(() => {
    _proToast('fotos');
    return document.querySelectorAll('#toastContainer .toast').length;
  });
  check('y tras cerrarlo vuelve a salir uno — no se quedó pensando que seguía ' +
        'puesto', otraVez, 1);

  console.log('\n═══ 2. El mazo deja de llenarse de mantenimiento ═══\n');

  const mazo = await p.evaluate(() => {
    _announceSystemActivity();
    return {
      enMazo: _sysCards.map(c => c.id.split('|')[1]),
      total:  _sysCards.length
    };
  });

  check('el respaldo de cada noche NO es una tarjeta',
    mazo.enMazo.indexOf('BACKUP_CREATED'), -1);
  check('«archive start» tampoco — es la MITAD de un evento que ya tiene su ' +
        'propio final', mazo.enMazo.indexOf('ARCHIVE_START'), -1);
  check('ni el archivado de lo viejo', mazo.enMazo.indexOf('ARCHIVE_RECONCILE'), -1);

  /* LA OTRA MITAD, y sin ella lo de arriba también lo cumpliría un mazo vacío. */
  check('pero los movimientos re-enlazados SÍ — eso es la app tocando datos ' +
        'por su cuenta, y eso hay que decirlo a la cara',
    mazo.enMazo.indexOf('AUTO_REPAIR_MATID') !== -1, true);
  check('y los totales recalculados también — es dinero corregido en silencio ' +
        'si no se dice', mazo.enMazo.indexOf('AUTO_REPAIR_TOTAL_COST') !== -1, true);
  check('de cinco avisos quedan los dos que piden una mirada', mazo.total, 2);

  console.log('\n═══ 3. Lo que se quitó del mazo NO se perdió ═══\n');

  /* ESTA ES LA COMPROBACIÓN QUE IMPORTA. Quitar las rutinas del mazo es un
   * arreglo; borrarlas del producto sería una pérdida de datos con cara de
   * arreglo, y las dos cosas se ven igual desde el mazo. */
  const guardado = await p.evaluate(() => ({
    enLaCola: (systemActivity || []).map(a => a.action),
    rutinas:  (systemActivity || []).filter(a => _sysRutina(a.action)).length
  }));
  check('las tres rutinas siguen enteras en la lista que llegó del servidor, ' +
        'que es la que lee Settings → System: cambia DÓNDE se leen, no si existen',
    guardado.rutinas, 3);
  check('y no se tocó ninguna de las cinco', guardado.enLaCola.length, 5);

  /* Y que la regla viva en UN sitio con nombre, no esparcida en condiciones
   * sueltas que hay que acordarse de mantener iguales. */
  const unaRegla = await p.evaluate(() => ({
    hay: typeof _sysRutina === 'function',
    tres: Object.keys(SYS_RUTINA).length
  }));
  check('la regla tiene nombre y vive en un solo sitio', unaRegla.hay, true);
  check('...con las tres rutinas dentro', unaRegla.tres, 3);

  console.log('\n═══ 4. Sin nada que dibujar, las gráficas ni se piden ═══\n');

  /* Jose, 22/10, con la consola abierta en 3G: 2,0 MB de recursos y 27 s para
   * abrir. La mayor parte eran los módulos de gráficas de gstatic.com, y los
   * pagaba TODO EL MUNDO EN CADA CARGA — incluido quien entra desde el teléfono
   * en la bodega a registrar una salida y no va a mirar una gráfica.
   *
   * Esta página abre SIN existencias, así que no hay nada que dibujar. Es el
   * caso que prueba que la librería se pide cuando hace falta y no antes. */
  const sinGraficas = await p.evaluate(() => ({
    pedido: _chartsPedido,
    enElDom: [...document.querySelectorAll('script[src]')]
               .filter(x => /gstatic\.com\/charts/.test(x.src)).length
  }));
  check('sin existencias que dibujar, la librería no se ha pedido',
    sinGraficas.pedido, false);
  check('...y no hay ni un <script> de gráficas en la página', sinGraficas.enElDom, 0);

  check('ningún error de JavaScript en toda la página', errores, []);

  await browser.close();
  if (fails.length){ console.error('\nFALLÓ:\n  ' + fails.join('\n  ')); process.exit(1); }
  console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
})();
