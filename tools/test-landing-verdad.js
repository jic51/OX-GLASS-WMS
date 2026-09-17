// LA LANDING PROMETE LO QUE LA APP HACE. NI MENOS, NI MÁS.
//
// Jose, 2026-09-17: "actualiza la parte donde dice que no tenemos labels,
// también añade este y los demás features que ya tenemos en la landing."
//
// Las etiquetas salieron en la v11.79. La landing siguió diciendo seis semanas
// que no existían, y lo mismo el detalle, que además las tenía listadas en el
// plan como pendientes. No se rompió nada: simplemente la página dejó de ser
// verdad y no había nada que se pusiera rojo por eso.
//
// ESO ES EL PROBLEMA QUE ESTE ARCHIVO EXISTE PARA RESOLVER, y no es cosmético.
// Una landing que niega una función que el cliente ya tiene pagada vende de
// menos. Una que promete una que no existe se descubre en la demo, que es el
// peor sitio posible. Los dos fallos son el mismo fallo: prosa que asegura algo
// sobre el código, sin nada que los ate.
//
// CÓMO LOS ATA. Cada afirmación de las páginas se empareja con una MARCA del
// producto — un identificador que sólo existe si la función existe. Si alguien
// implementa el escáner de códigos de barras, la marca aparece, la afirmación
// "todavía no lo hace" se queda vieja, y esto se pone rojo el mismo día en vez
// de dentro de seis semanas.
//
// LO QUE NO PRETENDE: no comprueba que la función esté BIEN — para eso está el
// resto de la suite. Comprueba que existe o que no existe, que es exactamente
// lo que la página afirma.
//
// Y se busca sobre el código SIN COMENTARIOS. "cycle count" aparece dos veces
// en Index_v3_fixed.html, las dos dentro de un comentario que explica por qué
// media hoja es una cantidad real. Buscando en crudo, la landing "mentiría" al
// decir que el conteo cíclico no está.
//
// Uso:  node tools/test-landing-verdad.js

const fs = require('fs'), path = require('path');
const A  = require('./andamio.js');
const RAIZ = path.join(__dirname, '..');
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');

const HTML = leer('Index_v3_fixed.html');
const GS   = leer('Code_v3_fixed.gs');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

// Sin comentarios: ni los de bloque, ni los de línea, ni los de HTML. Una marca
// nombrada dentro de una explicación no es una función.
//
// Del andamio, no una copia a mano. La copia ingenua toma el `/*` de
// accept="image/*" por una apertura de bloque y borra 38.780 caracteres del
// archivo — entre ellos aiExtractFromModal, que es justo una de las marcas de
// la tabla de abajo. Esta prueba lo descubrió en su primera ejecución, dando
// por ausente algo que está. Ver andamio.sinComentarios.
const sinComentarios = A.sinComentarios;
const HTML_LIMPIO = sinComentarios(HTML);
const GS_LIMPIO   = sinComentarios(GS);
const fuente = d => (d === 'gs' ? GS_LIMPIO : HTML_LIMPIO);

// ── LA TABLA ────────────────────────────────────────────────────────────────
//
//   pagina  — el archivo de la página que hace la afirmación
//   dice    — un trozo LITERAL de esa página. Si alguien reescribe la frase sin
//             mirar el producto, esto se pone rojo por el otro lado.
//   marca   — el identificador del producto que prueba (o desmiente) la frase
//   en      — 'html' (la app) o 'gs' (el servidor)
//   existe  — true: la página dice que SÍ lo hace, y la marca tiene que estar
//             false: la página dice que NO lo hace, y la marca NO puede estar
const AFIRMACIONES = [
  // ── Lo que la landing dice que SÍ hace ──────────────────────────────────
  { pagina:'landing/acopio.html', existe:true,
    dice:'Labels printed as you receive',        marca:'#labelSheet',        en:'html',
    porque:'la hoja de etiquetas de 4"×6" (v11.79)' },
  { pagina:'landing/acopio.html', existe:true,
    dice:'A warehouse map you can tap',          marca:'openRackDrawer',     en:'html',
    porque:'el cajón del estante en el mapa' },
  { pagina:'landing/acopio.html', existe:true,
    dice:'a material can be locked to one',      marca:'submitLockMaterial', en:'html',
    porque:'el bloqueo de material a un estante' },
  { pagina:'landing/acopio.html', existe:true,
    dice:"Paste a supplier's email",             marca:'_emailDrafts',       en:'html',
    porque:'la importación desde el correo del proveedor (v9.61)' },
  { pagina:'landing/acopio.html', existe:true,
    dice:'or a photo of an invoice',             marca:'aiExtractFromModal', en:'html',
    porque:'la lectura de la factura con la clave de IA del cliente (v10.8)' },
  { pagina:'landing/acopio.html', existe:true,
    dice:'Check my data',                        marca:'_runDataCheck',      en:'html',
    porque:'el barrido de calidad de datos (v11.23)' },
  { pagina:'landing/acopio.html', existe:true,
    dice:'Deleting can be undone',               marca:'restoreMovement',    en:'gs',
    porque:'la papelera de 30 días (v11.55)' },
  { pagina:'landing/acopio.html', existe:true,
    dice:'An evening report',                    marca:'dailyReportSettings_', en:'gs',
    porque:'el reporte diario por correo' },
  { pagina:'landing/acopio.html', existe:true,
    dice:'Every edit keeps its reason',          marca:'em_reason',          en:'html',
    porque:'el motivo obligatorio al editar un movimiento' },
  { pagina:'landing/acopio.html', existe:true,
    dice:'Low-stock alerts',                     marca:'monitoredMaterials', en:'html',
    porque:'los materiales vigilados' },
  { pagina:'landing/acopio.html', existe:true,
    dice:'Roles and permissions',                marca:'canEditMovements',   en:'html',
    porque:'los permisos por rol' },
  { pagina:'landing/acopio.html', existe:true,
    dice:'Nightly backups',                      marca:'runBackup',          en:'gs',
    porque:'el respaldo nocturno' },

  // ── Lo que la landing dice que TODAVÍA NO hace ──────────────────────────
  //
  // Éstas son las que se quedan viejas calladas, y son las que hicieron falta
  // esta vez. Cada marca es lo primero que aparecería el día que se implemente.
  { pagina:'landing/acopio.html', existe:false,
    dice:'Barcode scanning',                     marca:'BarcodeDetector',    en:'html',
    porque:'la API del navegador para leer códigos' },
  { pagina:'landing/acopio.html', existe:false,
    dice:'Barcode scanning',                     marca:'getUserMedia',       en:'html',
    porque:'el acceso a la cámara, que cualquier escáner necesita' },
  { pagina:'landing/acopio.html', existe:false,
    dice:'Cycle counting',                       marca:'cycleCount',         en:'html',
    porque:'el conteo cíclico' },
  { pagina:'landing/acopio.html', existe:false,
    dice:'Accounting or e-commerce integrations', marca:'quickbooks',        en:'gs',
    porque:'una integración de contabilidad' },
  { pagina:'landing/acopio.html', existe:false,
    dice:'Accounting or e-commerce integrations', marca:'shopify',           en:'gs',
    porque:'una integración de e-commerce' },

  // ── La página de detalle, que habla en español y con más precisión ──────
  { pagina:'landing/acopio-overview.html', existe:true,
    dice:'Etiquetas al guardar la entrada',      marca:'101.6mm',            en:'html',
    porque:'el papel de 4"×6" medido en milímetros' },
  { pagina:'landing/acopio-overview.html', existe:true,
    dice:'Las ventanas abiertas se ponen al día solas', marca:'dataStamp_',  en:'gs',
    porque:'el sello de versión del dato (v11.89–v11.97)' },
  { pagina:'landing/acopio-overview.html', existe:false,
    dice:'Leer códigos de barras',               marca:'BarcodeDetector',    en:'html',
    porque:'la API del navegador para leer códigos' }
];

console.log('\n── Cada afirmación de las páginas, contra el producto ──\n');

const paginas = {};
AFIRMACIONES.forEach(a => { paginas[a.pagina] = paginas[a.pagina] || leer(a.pagina); });

AFIRMACIONES.forEach(a => {
  const pag = paginas[a.pagina];
  const corto = path.basename(a.pagina);
  // Primero: la frase sigue en la página. Si alguien la reescribe, esta prueba
  // deja de saber qué está midiendo, y es mejor que lo diga.
  check(corto + ' todavía dice "' + a.dice + '"', pag.indexOf(a.dice) !== -1);

  const hay = fuente(a.en).indexOf(a.marca) !== -1;
  if (a.existe){
    check('   ...y el producto lo tiene (' + a.marca + ' — ' + a.porque + ')', hay);
  } else {
    check('   ...y el producto SIGUE sin tenerlo (' + a.marca + ' — ' + a.porque + ')', !hay,
          hay ? 'la marca YA está en el código: la página quedó vieja, actualízala' : undefined);
  }
});

console.log('\n── El plan no puede listar como pendiente algo que ya salió ──\n');
//
// El otro lado del mismo fallo. El detalle tenía "impresión de etiquetas" en el
// tramo de "Meses / Producto" mientras las etiquetas ya se imprimían, y
// "Sincronización entre ventanas abiertas" cuando ya se sincronizaban. Un plan
// que promete lo que ya está entregado hace dudar del resto del plan.
const detalle = paginas['landing/acopio-overview.html'];
const planIni = detalle.indexOf('Lo planeado');
const plan    = planIni === -1 ? '' : sinComentarios(detalle.slice(planIni));
check('la página de detalle tiene un tramo "Lo planeado"', planIni !== -1);

// Cada entrada: un texto que NO puede aparecer en el plan, y la marca del
// producto que prueba que ya está hecho.
const YA_HECHO = [
  { nombre:'impresión de etiquetas',
    noEnPlan:/impresión de etiquetas(?!\s+ya)/i, marca:'#labelSheet', en:'html' },
  { nombre:'sincronización entre ventanas',
    noEnPlan:/Sincronización entre ventanas/i,   marca:'dataStamp_',  en:'gs'   }
];
YA_HECHO.forEach(y => {
  const hecho = fuente(y.en).indexOf(y.marca) !== -1;
  check(y.nombre + ' está hecho en el producto (' + y.marca + ')', hecho);
  if (hecho){
    const enPlan = y.noEnPlan.test(plan);
    check('   ...así que el plan ya no lo promete', !enPlan,
          enPlan ? 'sigue listado como pendiente en "Lo planeado"' : undefined);
  }
});

console.log('\n── Las dos mitades de las etiquetas, dichas por separado ──\n');
//
// Es el matiz que se había perdido: "Códigos de barras e impresión de
// etiquetas" iba en UNA línea, como si fueran una función. Imprimir salió;
// leer, no. Una sola línea no puede decir eso, y mientras lo dijera no había
// forma de actualizar media promesa.
const enTodas = t => Object.keys(paginas).some(p => paginas[p].indexOf(t) !== -1);
check('ninguna página junta ya "barcode" con "label printing" en una sola frase',
      !/barcode[^.<]{0,40}label printing|label printing[^.<]{0,40}barcode/i
        .test(Object.values(paginas).join('\n')));
check('ninguna página junta ya "códigos de barras" con "etiquetas" en una sola frase',
      !/códigos de barras[^.<]{0,20}(e|y) (la )?impresión de etiquetas/i
        .test(Object.values(paginas).join('\n')));
check('y alguna página dice que imprimir etiquetas YA está', enTodas('v11.79'));

console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones');
process.exit(fail ? 1 : 0);
