// LOS SEIS MINUTOS: NO AVISAR DE QUE HAY UN RIESGO, SINO DE CUÁNTO FALTA.
//
// Jose, 20/10, cuando le propuse escribir una prueba para esto:
//
//   *"HAZLO, PERO ESCRIBIR LA PRUEBA NO RESUELVE EL PROBLEMA. HAY QUE PENSAR
//   CÓMO HACEMOS QUE ESA PRUEBA NOS DÉ EL DATO QUE NECESITAMOS PARA MANEJAR LA
//   SITUACIÓN."*
//
// Tiene razón y es la mejor objeción de la semana. Una prueba que dice «hay una
// escritura dentro de un bucle» avisa de algo sin decir lo único que importa:
// **¿revienta, y con cuántas filas?** Un rojo así se mira una vez, se decide que
// «va bien por ahora», y se aprende a ignorarlo. Eso es peor que no tenerlo.
//
// ── QUÉ MIDE, ENTONCES ──────────────────────────────────────────────────────
//
// Apps Script corta a los seis minutos. Lo que consume ese tiempo en una app de
// hojas de cálculo no es la cuenta: son las LLAMADAS a la hoja. Leer 20.000
// filas con un `getDataRange().getValues()` es UNA llamada y un par de
// segundos. Escribirlas de una en una son 20.000 llamadas y se acabó el tiempo.
//
// Así que lo que esta prueba saca no es un sí/no, es una FORMA:
//
//     llamadas = constante  +  (por_fila × nº de filas)
//
// `por_fila` es el número que decide. Con `por_fila = 0`, la operación aguanta
// cualquier archivo y no hay nada que vigilar. Con `por_fila ≥ 1`, hay un techo,
// y el techo se puede calcular.
//
// ── Y DE AHÍ SALE EL DATO ACCIONABLE ────────────────────────────────────────
//
// El techo en filas es:  (360 s × llamadas por segundo) / por_fila
//
// `llamadas por segundo` NO SE PUEDE MEDIR DESDE AQUÍ, y no me lo voy a
// inventar. Se mide UNA VEZ en la instalación de verdad, y está explicado abajo
// en `CÓMO CALIBRARLO`. Hasta entonces esta prueba enseña el techo en LLAMADAS,
// que es un número real, y lo marca como sin calibrar.
//
// Lo que convierte esto en algo que se puede manejar es la otra mitad, que no
// vive aquí: **la app ya sabe cuántas filas tiene** (ver `spaceEstimate_` y el
// panel de espacio). Comparar ese número con el techo es lo que da meses de
// aviso en vez de una llamada de teléfono un martes. Ver docs/BACKLOG.md.
//
// Uso:  node tools/test-limite-6min.js [path/to/Code_v3_fixed.gs]

const fs = require('fs'), path = require('path');

const RAIZ = path.join(__dirname, '..');
const GS   = process.argv[2] || path.join(RAIZ, 'Code_v3_fixed.gs');
const src  = fs.readFileSync(GS, 'utf8');

/* ── LA CALIBRACIÓN, Y POR QUÉ NO ME LA INVENTO ─────────────────────────────
 *
 * Para pasar de «llamadas» a «minutos» hace falta saber cuántas llamadas a la
 * hoja caben en un segundo. Eso DEPENDE de la cuenta, del tamaño de la fila y
 * del día, y NO SE PUEDE MEDIR DESDE AQUÍ: esta prueba corre en un portátil
 * contra un archivo de texto, no contra los servidores de Google.
 *
 * Así que el número de abajo es un SUPUESTO, está marcado como tal, y la prueba
 * lo dice en voz alta cada vez que corre. Un número inventado que se presenta
 * como medido es peor que no tenerlo: da una falsa tranquilidad que nadie
 * vuelve a cuestionar. Ya pasó dos veces este mes con topes que me saqué de la
 * manga.
 *
 * ── CÓMO CALIBRARLO, UNA SOLA VEZ ──────────────────────────────────────────
 *
 *   1. En la instalación de verdad, corre la operación más pesada que tenga
 *      techo (hoy `refreshDerivedSheets_`, desde Settings → System).
 *   2. Abre el registro de Apps Script: **Ejecuciones**. Apunta cuánto duró.
 *   3. Mira cuántas filas tenía el archivo (el panel de espacio lo dice).
 *   4. llamadas_por_segundo = (filas × llamadas_por_fila) / segundos
 *   5. Escribe ese número aquí abajo y pon `CALIBRADO = true`.
 *
 * A partir de ahí los techos de esta prueba están en FILAS DE VERDAD, y se
 * pueden comparar con lo que tiene cada cliente.
 */
var CALIBRADO = false;
var LLAMADAS_POR_SEGUNDO = 20;        // SUPUESTO, sin medir. Ver arriba.
var SEGUNDOS_UTILES = 360;            // los seis minutos de Apps Script
var TOPE_LLAMADAS = SEGUNDOS_UTILES * LLAMADAS_POR_SEGUNDO;

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FALLA ' + label + (extra === undefined ? '' : '  → ' + JSON.stringify(extra))); }
}

function soloCodigo(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
}

/* LAS LLAMADAS QUE CUESTAN. Cada una es un viaje a los servidores de Google;
 * es lo que se paga, no la aritmética de alrededor. */
const CARA = /\.(setValue|setValues|appendRow|setFormula|insertRow|deleteRow|createFile|createFolder|sendEmail|fetch)\s*\(/;

/* LAS QUE RECORREN EL ARCHIVO. Es la única hoja que crece sin techo: las de
 * usuarios, configuración o ubicaciones tienen decenas de filas y nunca van a
 * ser el problema. Medirlas todas sería ruido. */
const LEE_ARCHIVO = /getDataRange\(\)\.getValues\(\)/;
const ES_ARCHIVO  = /MASTER_ARCHIVE|archiveSheet|\barchive\b/;

const cuerpos = {};
const re = /^function ([A-Za-z_][A-Za-z0-9_]*)\s*\([\s\S]*?\n\}/gm;
let m; while ((m = re.exec(src))) cuerpos[m[1]] = soloCodigo(m[0]);

/** Cuántas llamadas caras hay DENTRO de un bucle.
 *
 *  OJO CON LO QUE ESTE NÚMERO *NO* DICE, y casi me engaña a mí: cuenta llamadas
 *  por VUELTA DE BUCLE, no por fila del archivo. No es lo mismo.
 *  `refreshDerivedSheets_` lee el archivo entero pero su bucle de escritura
 *  recorre sólo las filas ROTAS — en una instalación sana, ninguna.
 *
 *  Llamar «filas» a las vueltas daría un techo que asusta y que no es verdad.
 *  Por eso la lista de excepciones de abajo obliga a decir SOBRE QUÉ itera cada
 *  una: sin ese dato, el techo no se puede leer.
 *
 *  Fuera del bucle no cuenta: ésas son la constante, y una constante no tiene
 *  techo. */
function porFila(cuerpo) {
  const li = cuerpo.split('\n');
  let prof = 0, n = 0;
  li.forEach(function (l) {
    if (/\b(for|while)\s*\(|\.forEach\s*\(\s*function|\.map\s*\(\s*function/.test(l)) prof++;
    if (prof > 0 && CARA.test(l)) n++;
    if (/^\s*\}\s*\)?;?\s*$/.test(l) && prof > 0) prof--;
  });
  return n;
}

const barren = Object.keys(cuerpos).filter(function (f) {
  return ES_ARCHIVO.test(cuerpos[f]) && LEE_ARCHIVO.test(cuerpos[f]);
});

/* ── LAS QUE TIENEN UN TECHO, Y POR QUÉ SE LES PERDONA ─────────────────────
 *
 * Una lista con motivo escrito, no una lista a secas. Añadir un nombre aquí
 * obliga a escribir por qué, que es la diferencia entre una excepción y un
 * descuido. */
const CON_MOTIVO = {
  refreshDerivedSheets_: {
    itera: 'filas ROTAS (identificadores de material que quedaron mal), no filas del archivo',
    normal: 'cero en una instalación sana',
    porque:
      'Es la pasada de reparación. Escribe sólo lo que está mal, así que su ' +
      'bucle no crece con la historia sino con los destrozos, y los destrozos ' +
      'se arreglan una vez y no vuelven. Ya lleva freno propio. Si algún día ' +
      'hubiera que reescribir TODAS las filas, eso sí tendría que nacer partido ' +
      'en tandas desde el principio.'
  }
};

console.log('\n═══ 1. LA FORMA DE CADA OPERACIÓN QUE TOCA EL ARCHIVO ═══\n');

const tabla = barren.map(function (f) {
  return { f: f, pf: porFila(cuerpos[f]) };
}).sort(function (a, b) { return b.pf - a.pf; });

check('se encontraron operaciones que recorren el archivo — si esto diera cero, ' +
      'el medidor estaría roto, no el código',
  tabla.length >= 5, tabla.length);

console.log('');
tabla.forEach(function (t) {
  if (t.pf === 0) {
    console.log('    ' + t.f.padEnd(30) + 'por vuelta: 0   sin techo');
    return;
  }
  const vueltas = Math.floor(TOPE_LLAMADAS / t.pf);
  const info    = CON_MOTIVO[t.f];
  console.log('    ' + t.f.padEnd(30) + 'por vuelta: ' + t.pf + '   techo: ~' +
              vueltas.toLocaleString('es') + ' vueltas' + (CALIBRADO ? '' : ' (sin calibrar)'));
  if (info) {
    console.log('        itera sobre : ' + info.itera);
    console.log('        en la vida real: ' + info.normal);
  }
});

const conTecho = tabla.filter(function (t) { return t.pf > 0; });

console.log('\n═══ 2. LAS QUE TIENEN TECHO ESTÁN TODAS ARGUMENTADAS ═══\n');

const sinMotivo = conTecho.filter(function (t) {
  const i = CON_MOTIVO[t.f];
  /* No basta con estar en la lista: hay que decir SOBRE QUÉ itera. Sin eso el
   * techo no se puede interpretar, y un techo que no se puede interpretar es
   * un número que se ignora. */
  return !i || !i.itera || !i.normal || !i.porque;
});
check('toda operación con techo tiene su motivo escrito — una lista de nombres ' +
      'sin razones es un descuido con permiso' +
      (sinMotivo.length ? ' — SIN MOTIVO: ' + sinMotivo.map(function (t) { return t.f; }).join(', ') : ''),
  sinMotivo.length === 0);

/* EL NÚMERO QUE NO PUEDE CRECER. No es «cero operaciones con techo» —
 * `refreshDerivedSheets_` tiene una razón buena— sino que no aparezca una
 * segunda sin que alguien lo decida. */
const TOPE_CON_TECHO = 1;
check('no hay MÁS operaciones con techo que las argumentadas (tope ' +
      TOPE_CON_TECHO + ') — el día que alguien escriba fila por fila sobre el ' +
      'archivo, esto sale en rojo antes de llegar a un cliente',
  conTecho.length <= TOPE_CON_TECHO, conTecho.map(function (t) { return t.f + ' (' + t.pf + ')'; }));

console.log('\n═══ 3. EL DATO, Y LO QUE LE FALTA PARA SER MINUTOS ═══\n');

check('la calibración está declarada en UN sitio y dice si es medida o supuesta',
  /CALIBRADO\s*=/.test(fs.readFileSync(__filename, 'utf8')));

if (!CALIBRADO) {
  console.log('    ⚠  SIN CALIBRAR. Los techos de arriba están en LLAMADAS, no en');
  console.log('       minutos. El número que falta se mide una vez, en la');
  console.log('       instalación de verdad, y está explicado en la cabecera de');
  console.log('       este archivo. Mientras tanto son reales pero no comparables');
  console.log('       con "cuántas filas tiene mi hoja".');
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallos · ' : '✓ todo bien · ') + (ok + fail) + ' comprobaciones\n');
process.exit(fail ? 1 : 0);
