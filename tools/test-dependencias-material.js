// CUANDO UN MATERIAL CAMBIA DE NOMBRE, ¿QUÉ SE QUEDA ATRÁS?
//
// Jose, 2026-09-29, con tres capturas: renombró SEALANT #450 (FLASHING/CAULK)
// a RAIN BUSTER 450 y lo movió a SEALANT/CAULK. Los 1.271 movimientos se
// actualizaron. El panel de envases seguía diciendo:
//
//     FLASHING/CAULK · SEALANT #450 · 12 per box
//
// Su pregunta, que es la buena: "¿dónde más en la app hay cosas así que
// dependen de otras que se pueden editar?"
//
// LA RESPUESTA: cinco sitios guardan algo bajo la identidad de un material
// (categoría + nombre), y las tres operaciones que cambian esa identidad
// —renombrar, cambiar de categoría, fusionar— reescribían el archivo y nada
// más. Los cinco eran cabos sueltos.
//
//   · MATERIAL_PACKS       cuántas unidades trae una caja   → DINERO
//   · CONFIG avgCost       el coste promedio                → DINERO
//   · MATERIAL_LOCKS       lo apartado                      → material sin
//                                                             protección
//   · CONFIG minStock      el mínimo                        → alerta apagada
//   · WMS_MONITORED_...    qué se vigila                    → alerta apagada
//
// Y el daño doble que hace ver por qué importa: no sólo queda una línea
// huérfana. EL MATERIAL RENOMBRADO PIERDE SU FACTOR, así que la siguiente
// entrada por caja no divide y el coste por unidad sale multiplicado por 12 —
// y se mezcla en el promedio de ese material para siempre. Sin avisar.
//
// ── POR QUÉ ESTA PRUEBA EJECUTA Y NO LEE ────────────────────────────────────
//
// Porque lo que hay que comprobar es qué QUEDA en cinco hojas distintas después
// de una operación, y eso no se lee en el código: se provoca. Una comprobación
// que mirase si moverDependencias_ "está llamada" pasaría en verde sobre una
// versión que se equivoca de columna — que es el error más probable aquí, con
// cinco almacenes y sus índices.
//
// Uso:  node tools/test-dependencias-material.js

const vm = require('vm');
const A  = require('./andamio.js');
const GS = A.fuente('gs');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

const PACK_COLS = { CATEGORY:0, NAME:1, PACK:2, PER_PACK:3, LAST_PRICE:4, UPDATED_AT:5, UPDATED_BY:6 };

/* Hoja de mentira. La comilla inicial que pone textCell_ NO es contenido en
 * Sheets —es la marca de "esto es texto"— así que se la traga al escribir. */
function hojaFalsa(nombre, filas, anchoMin) {
  const h = {
    nombre,
    _filas: filas.map(r => r.slice()),
    getName: () => nombre,
    getMaxColumns: () => Math.max(anchoMin || 1, ...h._filas.map(r => r.length)),
    getLastRow() {
      for (let i = h._filas.length - 1; i >= 0; i--) {
        if (h._filas[i] && h._filas[i].some(c => c !== '' && c !== null && c !== undefined)) return i + 1;
      }
      return 0;
    },
    deleteRow(n) { h._filas.splice(n - 1, 1); },
    getDataRange: () => ({ getValues: () => h._filas.map(r => r.slice()) }),
    getRange(f, c, nf, nc) {
      return {
        getValues() {
          const out = [];
          for (let i = 0; i < nf; i++) {
            const src = h._filas[f - 1 + i] || [];
            const fila = [];
            for (let j = 0; j < nc; j++) fila.push(src[c - 1 + j] === undefined ? '' : src[c - 1 + j]);
            out.push(fila);
          }
          return out;
        },
        setValues(datos) {
          for (let i = 0; i < datos.length; i++) {
            const destino = f - 1 + i;
            while (h._filas.length <= destino) h._filas.push([]);
            for (let j = 0; j < datos[i].length; j++) {
              let v = datos[i][j];
              if (typeof v === 'string' && v.charAt(0) === "'") v = v.slice(1);
              h._filas[destino][c - 1 + j] = v;
            }
          }
          return this;
        }
      };
    },
    /** Las filas de datos, sin cabecera. */
    datos() { return h._filas.slice(1).filter(r => r && r.some(c => c !== '' && c !== undefined)); }
  };
  return h;
}

/** Monta moverDependencias_ de verdad sobre unas hojas de mentira. */
function montar(hojas, propiedades) {
  const ctx = {
    console, JSON, Math, Number, String, Array, Object,
    PACK_COLS,
    SHEETS: { PACKS: 'MATERIAL_PACKS', CONFIG: 'CONFIG' },
    normalizeString: s => String(s || '').trim().toUpperCase().replace(/\s+/g, ' ').replace(/[,.'`]/g, ''),
    getMaterialId: (c, n) => String(c) + '|||' + String(n),
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: k => (k in propiedades ? propiedades[k] : null),
        setProperty: (k, v) => { propiedades[k] = v; }
      })
    },
    ss: { getSheetByName: n => hojas[n] || null }
  };
  vm.createContext(ctx);
  vm.runInContext(A.levantar(GS, ['moverDependencias_', 'textSafeRow_', 'textCell_'], {}), ctx);
  return ctx;
}

const CAB_PACKS  = ['Category','Name','Pack','Per Pack','Last Price','Updated At','Updated By'];
const CAB_LOCKS  = ['ID','MatId','Category','Name'];
const CAB_CONFIG = new Array(17).fill('').map((_, i) => 'C' + i);

/** Una fila de CONFIG con sólo lo que este arreglo toca. */
function filaConfig({ minName, minQty, costCat, costName, costVal }) {
  const r = new Array(17).fill('');
  if (minName)  { r[11] = minName; r[12] = minQty; }
  if (costCat)  { r[14] = costCat; r[15] = costName; r[16] = costVal; }
  return r;
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. EL CASO DE JOSE — renombrar Y cambiar de categoría
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 1. SEALANT #450 (FLASHING/CAULK) → RAIN BUSTER 450 (SEALANT/CAULK) ═══\n');
{
  const packs = hojaFalsa('MATERIAL_PACKS', [CAB_PACKS,
    ['FLASHING/CAULK', 'SEALANT #450', 'BOX', 12, 0, '', ''],
    ['SEALANT/CAULK', 'GUNTHER ULTRABOND', 'BOX', 24, 0, '', '']], 7);
  const locks = hojaFalsa('MATERIAL_LOCKS', [CAB_LOCKS,
    ['L1', 'FLASHING/CAULK|||SEALANT #450', 'FLASHING/CAULK', 'SEALANT #450']], 4);
  const config = hojaFalsa('CONFIG', [CAB_CONFIG,
    filaConfig({ minName: 'SEALANT #450', minQty: 20,
                 costCat: 'FLASHING/CAULK', costName: 'SEALANT #450', costVal: 3.5 })], 17);
  const props = { WMS_MONITORED_MATERIALS: JSON.stringify(['SEALANT #450', 'OTRA COSA']) };

  const ctx = montar({ MATERIAL_PACKS: packs, MATERIAL_LOCKS: locks, CONFIG: config }, props);
  // Los dos cambios de Jose a la vez: nombre nuevo Y categoría nueva.
  const r = ctx.moverDependencias_(ctx.ss, 'FLASHING/CAULK', 'SEALANT #450',
                                            'SEALANT/CAULK',  'RAIN BUSTER 450');

  const p = packs.datos().find(f => String(f[PACK_COLS.NAME]) === 'RAIN BUSTER 450');
  check('el envase se fue con el material', !!p, packs.datos());
  check('...y con la categoría nueva', !!p && p[PACK_COLS.CATEGORY] === 'SEALANT/CAULK', p && p[0]);
  check('...conservando las 12 por caja', !!p && p[PACK_COLS.PER_PACK] === 12, p && p[3]);
  check('NO queda ninguna línea con el nombre viejo',
        !packs.datos().some(f => String(f[PACK_COLS.NAME]) === 'SEALANT #450'), packs.datos());
  check('el otro material no se tocó',
        packs.datos().some(f => String(f[PACK_COLS.NAME]) === 'GUNTHER ULTRABOND'));

  const l = locks.datos()[0];
  check('la reserva apunta al material nuevo', l[2] === 'SEALANT/CAULK' && l[3] === 'RAIN BUSTER 450', l);
  check('...y su MatId se recalculó', String(l[1]).indexOf('RAIN BUSTER 450') !== -1, l[1]);

  const cf = config.datos()[0];
  check('el coste promedio se fue con él', cf[14] === 'SEALANT/CAULK' && cf[15] === 'RAIN BUSTER 450',
        [cf[14], cf[15]]);
  check('...sin perder el número', cf[16] === 3.5, cf[16]);
  check('el mínimo se fue con él', cf[11] === 'RAIN BUSTER 450', cf[11]);
  check('...sin perder su cantidad', cf[12] === 20, cf[12]);

  const mon = JSON.parse(props.WMS_MONITORED_MATERIALS);
  check('la lista de vigilados usa el nombre nuevo', mon.indexOf('RAIN BUSTER 450') !== -1, mon);
  check('...y no perdió el otro nombre', mon.indexOf('OTRA COSA') !== -1, mon);

  check('nada falló', r.fallos === 0, r);
  console.log('     → resumen para el audit log:', JSON.stringify(r.resumen));
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. UNA FUSIÓN — el que sobrevive gana
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 2. Fusionar A en B cuando los DOS tienen factor ═══\n');
{
  const packs = hojaFalsa('MATERIAL_PACKS', [CAB_PACKS,
    ['SEALANT/CAULK', 'BS 10', 'BOX', 6,  0, '', ''],
    ['SEALANT/CAULK', 'BS10',  'BOX', 12, 0, '', '']], 7);
  const config = hojaFalsa('CONFIG', [CAB_CONFIG,
    filaConfig({ costCat: 'SEALANT/CAULK', costName: 'BS 10', costVal: 9 }),
    filaConfig({ costCat: 'SEALANT/CAULK', costName: 'BS10',  costVal: 4 })], 17);

  const ctx = montar({ MATERIAL_PACKS: packs, CONFIG: config }, {});
  // BS 10 se fusiona EN BS10. El destino, BS10, ya tiene sus 12 por caja.
  const r = ctx.moverDependencias_(ctx.ss, 'SEALANT/CAULK', 'BS 10',
                                            'SEALANT/CAULK', 'BS10', true);

  const quedan = packs.datos().filter(f => String(f[PACK_COLS.NAME]) === 'BS10');
  check('queda UN solo envase, no dos', quedan.length === 1, packs.datos());
  check('y es el del DESTINO (12), no el del que desaparece (6)',
        quedan.length === 1 && quedan[0][PACK_COLS.PER_PACK] === 12, quedan[0]);
  // DOS, no uno: se descarta el envase del origen Y su coste promedio, porque
  // el destino tiene los suyos. Lo escribí esperando 1 pensando sólo en el
  // envase; contar de menos habría dejado una pérdida fuera del audit log.
  check('el resumen cuenta las DOS cosas descartadas — el envase y el coste',
        r.descartados === 2, r);
  check('...y lo cuenta con palabras, para el audit log',
        /dropped \(target kept its own\)/.test(r.resumen), r.resumen);

  const costes = config.datos().filter(f => f[15] === 'BS10');
  check('queda UN solo coste promedio', costes.length === 1, config.datos());
  check('y es el del destino (4), no el del origen (9)',
        costes.length === 1 && costes[0][16] === 4, costes[0]);
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. UNA FUSIÓN donde el destino NO tiene factor — ahí sí se hereda
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 3. Fusionar cuando el destino no tiene nada ═══\n');
{
  const packs = hojaFalsa('MATERIAL_PACKS', [CAB_PACKS,
    ['SEALANT/CAULK', 'BS 10', 'BOX', 6, 0, '', '']], 7);
  const ctx = montar({ MATERIAL_PACKS: packs }, {});
  ctx.moverDependencias_(ctx.ss, 'SEALANT/CAULK', 'BS 10', 'SEALANT/CAULK', 'BS10', true);

  const q = packs.datos();
  check('el factor se hereda en vez de perderse',
        q.length === 1 && q[0][PACK_COLS.NAME] === 'BS10' && q[0][PACK_COLS.PER_PACK] === 6, q);
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. SÓLO CAMBIO DE CATEGORÍA — lo que va por nombre NO debe tocarse
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 4. Sólo cambia la categoría: el mínimo y los vigilados no se mueven ═══\n');
{
  const config = hojaFalsa('CONFIG', [CAB_CONFIG,
    filaConfig({ minName: 'BS10', minQty: 5,
                 costCat: 'WINDOW', costName: 'BS10', costVal: 2 })], 17);
  const props = { WMS_MONITORED_MATERIALS: JSON.stringify(['BS10']) };
  const antes = props.WMS_MONITORED_MATERIALS;

  const ctx = montar({ CONFIG: config }, props);
  const r = ctx.moverDependencias_(ctx.ss, 'WINDOW', 'BS10', 'SCREEN', 'BS10');

  const cf = config.datos()[0];
  check('el coste SÍ se mueve — va por categoría + nombre', cf[14] === 'SCREEN', cf[14]);
  check('el mínimo NO se toca — va sólo por nombre, y el nombre no cambió',
        cf[11] === 'BS10' && r.minStock === 0, [cf[11], r.minStock]);
  check('la lista de vigilados tampoco se reescribe',
        props.WMS_MONITORED_MATERIALS === antes && r.monitored === 0, r);
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. NO CAMBIÓ NADA — no debe escribir nada
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 5. Renombrar a lo mismo no toca ninguna hoja ═══\n');
{
  const packs = hojaFalsa('MATERIAL_PACKS', [CAB_PACKS,
    ['SEALANT/CAULK', 'BS10', 'BOX', 12, 0, '', '']], 7);
  const antes = JSON.stringify(packs.datos());
  const ctx = montar({ MATERIAL_PACKS: packs }, {});
  const r = ctx.moverDependencias_(ctx.ss, 'SEALANT/CAULK', 'BS10', 'SEALANT/CAULK', 'BS10');
  check('la hoja quedó byte a byte igual', JSON.stringify(packs.datos()) === antes);
  check('y el resumen está vacío, sin inventarse trabajo', r.resumen === '', r.resumen);
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. UNA HOJA QUE NO EXISTE NO PUEDE TIRAR UN RENOMBRADO
   Una instalación nueva no tiene MATERIAL_PACKS hasta el primer envase, ni
   MATERIAL_LOCKS hasta la primera reserva. Si esto lanzara, el renombrado ya
   habría reescrito el archivo y las dos mitades quedarían en desacuerdo — que
   es exactamente el estado del que sale este arreglo.
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 6. Sin esas hojas todavía ═══\n');
{
  const ctx = montar({}, {});
  let lanzo = null;
  let r = null;
  try { r = ctx.moverDependencias_(ctx.ss, 'A', 'VIEJO', 'A', 'NUEVO'); }
  catch (e) { lanzo = e.message; }
  check('no lanza', !lanzo, lanzo);
  check('y no cuenta fallos que no ocurrieron', r && r.fallos === 0, r);
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. LAS TRES OPERACIONES LO LLAMAN — ninguna se queda fuera
   Es la lección de check-suite.js: el fallo no va a ser el helper, va a ser la
   cuarta operación que alguien añada y no lo llame.
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 7. Las tres operaciones que cambian la identidad ═══\n');
{
  const sinComentarios = A.sinComentariosMismasLineas(GS);
  ['rename', 'changeCategory', 'merge'].forEach(op => {
    // El bloque de esa operación, desde su `op === '<op>'` hasta el siguiente.
    const i = sinComentarios.indexOf("op === '" + op + "'");
    const j = sinComentarios.indexOf('} else if (op ===', i + 1);
    const bloque = sinComentarios.slice(i, j === -1 ? i + 2000 : j);
    check(op + ' llama a moverDependencias_', /moverDependencias_\(/.test(bloque));
  });
  check('la fusión avisa de que el destino manda (pasa `true`)',
        /moverDependencias_\([^)]*,\s*true\s*\)/.test(sinComentarios));
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallos, ' : '✓ ') + ok + ' comprobaciones\n');
process.exit(fail ? 1 : 0);
