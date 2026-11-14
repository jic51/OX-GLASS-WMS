// M-04 · LA VENTANA SE CIERRA AL GUARDAR, Y NO SE PIERDE NADA.
//
// Jose, 11/11: *"implementemos el cerrar las ventanas o lo que el usuario
// guarda luego de dar clic en guardar, para que el usuario pueda seguir
// haciendo lo que necesita hacer, y sólo dejamos el toast abajo a la
// izquierda"*. Y el 12/11, eligiendo el final: *"que en el mismo lugar del
// toast de cargando aparezca la opción de corregir lo que está mal"*.
//
// ── LO QUE ESTO MIDE, Y POR QUÉ NO SE PUEDE MIRAR EL CÓDIGO ────────────────
//
// Lo que hay que comprobar es una SECUENCIA en el tiempo: se pulsa Guardar, la
// ventana se va ANTES de que el servidor conteste, y según cómo conteste pasa
// una cosa u otra. Un `grep` de `closeModal` encuentra la llamada y no dice
// nada sobre cuándo ocurre ni sobre qué queda dentro del formulario. Esto para
// el servidor a mitad de camino y mira.
//
// ── LA PROMESA QUE DE VERDAD IMPORTA ───────────────────────────────────────
//
// Cerrar antes de la respuesta sólo es aceptable si **nada de lo escrito se
// pierde cuando falla**. Por eso la comprobación central no es que se reabra:
// es que al reabrirse los campos sigan teniendo lo que la persona tecleó.
//
// Uso:  NODE_PATH="$(npm root -g)" CHROME_PATH=/opt/pw-browsers/chromium-*/chrome-linux*/chrome \
//       node tools/test-cerrar-y-seguir.js

const fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

let ok = 0; const fallos = [];
function check(etiqueta, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + etiqueta); return; }
  fallos.push(etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
  console.log('  ✗    ' + etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
}

/* El servidor de mentira NO contesta por su cuenta: guarda los dos manejadores
 * y espera. Así se puede mirar la pantalla **mientras la petición está en el
 * aire**, que es el único momento en el que este arreglo se nota. */
const stub = `<script>
window.google=window.google||{};
window.google.charts={load:function(){},setOnLoadCallback:function(){}};
window.__pend=null;
Object.assign(window.google,{script:{run:new Proxy({},{get:function(t,k){return function(){
 if(k==='withSuccessHandler'){t._ok=arguments[0];return window.google.script.run;}
 if(k==='withFailureHandler'){t._no=arguments[0];return window.google.script.run;}
 if(k==='getInitialData'){var o=t._ok;setTimeout(function(){o&&o(window.__DATA);},10);return;}
 if(k==='processMovement'){window.__pend={ok:t._ok,no:t._no,accion:arguments[0]};return;}
 var o=t._ok;setTimeout(function(){o&&o({});},5);};}})}});
window.__DATA={userRole:'ADMIN',userEmail:'a@b.c',userName:'A',serverVersion:'x',
 company:{name:'T'},movements:[],stock:{},materialLocks:[],monitoredMaterials:null,
 config:{categories:['WINDOW'],projects:['OBRA'],suppliers:['PROV'],
   locations:[{name:'A1A',type:'RACK'}],units:['UNIT']},
 incoming:[],rackPhotos:{},systemActivity:[],
 rolePerms:{canSeeCosts:true,canEditMovements:true,canManageCatalog:true,canExportData:true},
 warehouseRoleLabel:'W',archiveCutoffMonths:12,oauthClientId:'',oauthRedirectUri:''};
<\/script>`;

(async () => {
  const f = path.join(os.tmpdir(), 'ac-m04-' + Date.now() + '.html');
  fs.writeFileSync(f, HTML.replace('</head>', stub + '</head>'));

  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errores = [];
  p.on('pageerror', e => errores.push(e.message));
  await p.goto('file://' + f, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(900);

  console.log('\n═══ 1 · EL AVISO VIVE ABAJO A LA IZQUIERDA ═══\n');
  {
    const r = await p.evaluate(() => {
      showToast('x', 'ok', 20000);
      const c = document.getElementById('toastContainer');
      const b = c.getBoundingClientRect();
      const s = getComputedStyle(c);
      return { abajo: window.innerHeight - b.bottom, izq: b.left,
               dir: s.flexDirection, ancho: window.innerWidth };
    });
    /* Abajo y a la izquierda, medido contra la ventana — no leyendo el CSS,
     * que es donde una regla más específica puede estar ganando sin que se
     * note. */
    check('el aviso está pegado abajo', r.abajo < 40, r);
    check('...y a la izquierda, no centrado', r.izq < 40 && r.izq < r.ancho / 3, r);
    /* El más nuevo abajo: si los nuevos empujan hacia abajo, el que se está
     * leyendo se mueve bajo el dedo. */
    check('...y los avisos nuevos no empujan al que se está leyendo',
      r.dir === 'column-reverse', r.dir);
  }

  /* Se vacía la bandeja antes de seguir: el aviso de la parte 1 dura 20 s y
   * **con `column-reverse` el más nuevo es el ÚLTIMO del DOM**, no el primero.
   * Leer `querySelector('.toast')` devolvía el viejo, y las comprobaciones de
   * abajo miraban un aviso que no tenía nada que ver. */
  await p.evaluate(() => { document.getElementById('toastContainer').innerHTML = ''; });

  console.log('\n═══ 2 · SE CIERRA ANTES DE QUE EL SERVIDOR CONTESTE ═══\n');

  /* Se rellena una entrada de verdad por la interfaz y se pulsa Guardar. El
   * servidor de mentira se queda con la petición en la mano. */
  async function guardarUnaEntrada(nota) {
    await p.evaluate((n) => {
      openMoveModal('ENTRY');
      setTimeout(function(){
        const q = (s) => document.querySelector(s);
        /* LA CANTIDAD NO ES UN CAMPO DEL MATERIAL: vive en las filas de
         * ubicación (`.loc-rack` + `.loc-qty` dentro de `#mat-locs-N`), y la
         * del material se calcula sumándolas. Rellenar un `#mat-qty-1` que no
         * existe dejaba el formulario inválido y `submitMultiEntry` salía por
         * su primera puerta sin llegar a mandar nada — con lo que la prueba
         * medía una ventana que nunca se intentó guardar. */
        const cat = q('#mat-cat-1'), nom = q('#mat-name-1');
        if (cat) { cat.value = 'WINDOW'; cat.dispatchEvent(new Event('change')); }
        if (nom) { nom.value = n; nom.dispatchEvent(new Event('input')); }
        const fila = q('#mat-locs-1 .loc-row');
        if (fila) {
          const r = fila.querySelector('.loc-rack'), c = fila.querySelector('.loc-qty');
          r.value = 'A1A'; r.dispatchEvent(new Event('input'));
          c.value = '7';   c.dispatchEvent(new Event('input'));
        }
        if (typeof syncMatLineQty === 'function') syncMatLineQty(1);
      }, 60);
    }, nota);
    await p.waitForTimeout(400);
    await p.evaluate(() => { window.__pend = null; submitMultiEntry(); });
    await p.waitForTimeout(250);
  }

  await guardarUnaEntrada('VENTANA DE PRUEBA 48X60');

  {
    const r = await p.evaluate(() => ({
      abierta: document.getElementById('moveOverlay').classList.contains('show'),
      enVuelo: !!window.__pend,
      nombre: (document.getElementById('mat-name-1') || {}).value
    }));
    check('la ventana ya está cerrada con la petición aún en el aire',
      r.enVuelo && !r.abierta, r);
    /* LA PROMESA. El formulario sigue teniendo lo que se escribió: eso es lo
     * único que hace que cerrar antes de tiempo no sea una pérdida. */
    check('...y lo escrito sigue dentro del formulario',
      r.nombre === 'VENTANA DE PRUEBA 48X60', r);
  }

  console.log('\n═══ 3 · SEGÚN CÓMO FALLE, UNA SALIDA U OTRA ═══\n');

  {
    /* Falla el ENTORNO: no hay nada que corregir, así que se ofrece reenviar.
     *
     * Y NO con `SYSTEM_BUSY`, aunque sea el ejemplo obvio: ése lo atrapa
     * `_busyRetry` ANTES y lo reintenta solo, así que nunca llega hasta aquí.
     * Usarlo hacía que la prueba buscara un aviso que el producto, con razón,
     * no llega a enseñar. Se usa un corte de red, que sí sale a la superficie. */
    await p.evaluate(() => window.__pend.no({ message: 'Failed to fetch' }));
    await p.waitForTimeout(300);
    const r = await p.evaluate(() => {
      const t = [].slice.call(document.querySelectorAll('#toastContainer .toast')).pop();
      const btn = t && t.querySelector('button');
      return { hay: !!t, texto: t ? t.textContent : '',
               boton: btn ? btn.textContent.trim() : null,
               abierta: document.getElementById('moveOverlay').classList.contains('show') };
    });
    check('un fallo de entorno ofrece reenviar', /Retry/.test(r.boton || ''), r);
    check('...y NO reabre la ventana por su cuenta', !r.abierta, r);

    // Y pulsarlo reenvía lo mismo, sin abrir nada.
    await p.evaluate(() => {
      window.__pend = null;
      /* EL PRIMER BOTÓN DEL AVISO ES LA ACCIÓN; el último es la ✕ de
       * cerrarlo. Pulsando el último se descartaba el aviso y no se
       * reenviaba nada — y la prueba lo leía como «no reenvía». */
      [].slice.call(document.querySelectorAll('#toastContainer .toast')).pop()
        .querySelector('button').click();
    });
    await p.waitForTimeout(300);
    const r2 = await p.evaluate(() => ({
      enVuelo: !!window.__pend,
      accion: window.__pend && window.__pend.accion,
      abierta: document.getElementById('moveOverlay').classList.contains('show')
    }));
    check('...y al pulsarlo se reenvía sin abrir la ventana',
      r2.enVuelo && r2.accion === 'addMultiEntry' && !r2.abierta, r2);
  }

  {
    // Falla por los DATOS: aquí sí hay algo que corregir, y hay que verlo.
    await p.evaluate(() => window.__pend.no({ message: 'That quantity is more than you have' }));
    await p.waitForTimeout(300);
    const r = await p.evaluate(() => {
      const t = [].slice.call(document.querySelectorAll('#toastContainer .toast')).pop();
      const btn = t && t.querySelector('button');
      return { boton: btn ? btn.textContent.trim() : null,
               texto: t ? t.textContent : '',
               abierta: document.getElementById('moveOverlay').classList.contains('show') };
    });
    check('un fallo de datos ofrece corregir', /Fix/.test(r.boton || ''), r);
    check('...y el aviso dice que no se perdió nada', /nothing you typed was lost/.test(r.texto), r);

    await p.evaluate(() => [].slice.call(document.querySelectorAll('#toastContainer .toast')).pop().querySelector('button').click());
    await p.waitForTimeout(300);
    const r2 = await p.evaluate(() => {
      const ov = document.getElementById('moveOverlay');
      return { abierta: ov.classList.contains('show'),
               ocupada: ov.classList.contains('busy'),
               nombre: (document.getElementById('mat-name-1') || {}).value,
               /* Otra vez: la cantidad vive en la fila de ubicación. */
               cantidad: (document.querySelector('#mat-locs-1 .loc-qty') || {}).value,
               estante: (document.querySelector('#mat-locs-1 .loc-rack') || {}).value };
    });
    check('«Fix» reabre la ventana', r2.abierta, r2);
    /* LO QUE HACE QUE «Fix» SIRVA DE ALGO. Una ventana que vuelve vacía es
     * peor que no haberla cerrado. */
    check('...con lo escrito todavía dentro',
      r2.nombre === 'VENTANA DE PRUEBA 48X60' && r2.cantidad === '7' && r2.estante === 'A1A', r2);
    /* Y SE PUEDE ESCRIBIR EN ELLA. Al mandar se le puso `busy`, que apaga los
     * campos; volver con los campos apagados es volver sin poder corregir. */
    check('...y no vuelve apagada', !r2.ocupada, r2);
  }

  console.log('\n═══ 4 · Y SI SALE BIEN, NO SE REABRE NADA ═══\n');
  {
    await p.evaluate(() => { window.__pend = null; submitMultiEntry(); });
    await p.waitForTimeout(250);
    await p.evaluate(() => window.__pend.ok({ count: 1, rowCount: 1, movimientos: [] }));
    await p.waitForTimeout(700);
    const r = await p.evaluate(() => ({
      abierta: document.getElementById('moveOverlay').classList.contains('show'),
      enVuelo: window.__enVueloSpy
    }));
    check('un guardado correcto deja la ventana cerrada', !r.abierta, r);
  }

  const reales = errores.filter(m => !/ResizeObserver/.test(m));
  check('ni un error en la página', reales.length === 0, reales[0]);

  await b.close();

  if (fallos.length) {
    console.error('\nFALLÓ:\n  ' + fallos.join('\n  ') + '\n');
    console.error('  Cerrar antes de que el servidor conteste sólo vale si lo\n' +
                  '  escrito sobrevive al fallo. Si no, una entrada de ocho\n' +
                  '  materiales se pierde por un corte de red.\n');
    process.exit(1);
  }
  console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
})();
