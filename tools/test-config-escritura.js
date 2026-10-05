// LA PESTAÑA CONFIG NO SE PUEDE QUEDAR VACÍA PORQUE UNA ESCRITURA FALLE.
//
// Anotado como URGENTE el 2026-09-26, el día después de que el trabajo nocturno
// vaciara el archivo. `writeConfigColumn_` tenía el mismo patrón, línea por
// línea:
//
//     cfg.getRange(...).clearContent();     // BORRAR
//     if (!values.length) return;
//     cfg.getRange(...).setValues(...);     // ESCRIBIR
//
// Nueve días y tres pérdidas de datos después seguía igual. Esta prueba existe
// para que no vuelva.
//
// ── QUÉ SE PIERDE SI CAE AHÍ ────────────────────────────────────────────────
//
// No los movimientos: cada fila del archivo guarda su propia categoría, su
// proveedor y su ubicación. Se pierde LA LISTA — y sin la lista no se puede
// registrar nada nuevo, el mapa del almacén se queda sin estantes, y
// MATERIAL_LOCKS apunta a ubicaciones que ya no existen. Una reserva que no
// protege nada es peor que no tener reserva, porque alguien cuenta con ella.
//
// Y aquí no había Guarda 2, ni correo, ni reparación. Te enterabas el día que
// abrías un desplegable y no había nada dentro.
//
// ── POR QUÉ ESTA PRUEBA EJECUTA Y ROMPE A MITAD ─────────────────────────────
//
// Porque lo que hay que comprobar es QUÉ QUEDA EN LA HOJA cuando algo revienta
// entre las dos operaciones, y eso no se lee en el código: se provoca. Una
// prueba que comprobara "ya no aparece clearContent antes de setValues" se
// pondría verde con cualquier reordenación que volviera a dejar un hueco.
//
// Uso:  node tools/test-config-escritura.js

const vm = require('vm');
const A  = require('./andamio.js');
const GS = A.fuente('gs');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

/* Hoja de mentira de CONFIG: varias listas una al lado de otra, como la de
 * verdad. `romperEn` deja reventar la n-ésima escritura, que es como se
 * comporta una cuota agotada: no avisa, lanza. */
function hojaConfig(filas, maxFilas) {
  const h = {
    _f: filas.map(r => r.slice()),
    _max: maxFilas || filas.length,
    _escrituras: 0,
    romperEn: 0,
    getLastRow: () => {
      let u = 0;
      h._f.forEach((r, i) => { if (r.some(v => String(v || '').trim())) u = i + 1; });
      return u;
    },
    getMaxRows: () => h._max,
    insertRowsAfter(desde, cuantas) {
      h._max = desde + cuantas;
      while (h._f.length < h._max) h._f.push(new Array(6).fill(''));
    },
    getParent: () => ({ getSheetByName: () => null }),
    getRange(f, c, nf, nc) {
      return {
        getValues() {
          const out = [];
          for (let i = 0; i < nf; i++) {
            const src = h._f[f - 1 + i] || [];
            const fila = [];
            for (let j = 0; j < nc; j++) fila.push(src[c - 1 + j] === undefined ? '' : src[c - 1 + j]);
            out.push(fila);
          }
          return out;
        },
        setValues(datos) {
          h._escrituras++;
          if (h.romperEn && h._escrituras === h.romperEn) {
            throw new Error('Service Spreadsheets failed while accessing document');
          }
          for (let i = 0; i < datos.length; i++) {
            const d = f - 1 + i;
            while (h._f.length <= d) h._f.push(new Array(6).fill(''));
            for (let j = 0; j < datos[i].length; j++) h._f[d][c - 1 + j] = datos[i][j];
          }
        },
        clearContent() {
          for (let i = 0; i < nf; i++) {
            const d = f - 1 + i;
            if (!h._f[d]) continue;
            for (let j = 0; j < nc; j++) h._f[d][c - 1 + j] = '';
          }
        }
      };
    },
    /** Lo que hay en una columna, sin el apóstrofo que escribe textCell_. */
    columna(idx) {
      return h._f.slice(1)
        .map(r => String(r[idx] || '').replace(/^'/, '').trim())
        .filter(v => v);
    },
    /** Los pares (nombre, tipo) tal como quedaron, para ver si se descolocaron. */
    pares(a, b) {
      return h._f.slice(1)
        .filter(r => String(r[a] || '').trim())
        .map(r => [String(r[a]).replace(/^'/, ''), String(r[b] || '').replace(/^'/, '')]);
    }
  };
  return h;
}

const CAB = ['Projects', 'Categories', 'Suppliers', 'Racks', 'Location Type', 'email'];

/** CONFIG con cuatro categorías y cinco ubicaciones con su tipo. */
function configDeEjemplo() {
  const filas = [CAB];
  const cats  = ['WINDOW', 'SCREEN', 'MIRROR', 'SHOWER'];
  const locs  = [['A1A','RACK'], ['A1B','RACK'], ['A1C','RACK'], ['B2A','RACK'], ['O1A','ARCHIVED']];
  for (let i = 0; i < Math.max(cats.length, locs.length); i++) {
    const r = new Array(6).fill('');
    if (cats[i]) r[1] = cats[i];
    if (locs[i]) { r[3] = locs[i][0]; r[4] = locs[i][1]; }
    filas.push(r);
  }
  return hojaConfig(filas, 20);
}

function montar() {
  const ctx = {
    console, String, Number, Math, Array, Object,
    textCell_: v => (v === '' || v === null || v === undefined) ? '' : "'" + String(v),
    logError_: (ss, sev, src, fn, u, msg, c) => { ctx.avisos.push({ sev, msg, ctx: c }); },
    newRequestId_: () => 'req-1',
    Logger: { log(){} },
    avisos: []
  };
  vm.createContext(ctx);
  vm.runInContext(A.levantar(GS, ['writeConfigColumn_', 'writeConfigColumns_'], {
    dobles: ['textCell_', 'logError_', 'newRequestId_']
  }), ctx);
  return ctx;
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. LO NORMAL SIGUE FUNCIONANDO
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 1. Escribir una lista ═══\n');
{
  const cfg = configDeEjemplo();
  const ctx = montar();
  ctx.writeConfigColumn_(cfg, 1, ['WINDOW', 'SCREEN', 'IGU']);

  check('quedan las tres que se mandaron', cfg.columna(1).join('|') === 'WINDOW|SCREEN|IGU',
        cfg.columna(1));
  check('LA COLA SE LIMPIA — escribir tres sobre cuatro no puede dejar la cuarta ' +
        'ahí, que es lo que pasa si sólo se escribe encima',
        cfg.columna(1).length === 3, cfg.columna(1));
  check('y no toca las columnas de al lado', cfg.columna(3).length === 5, cfg.columna(3));
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. SI LA ESCRITURA REVIENTA, LA LISTA SIGUE AHÍ
   ═══════════════════════════════════════════════════════════════════════════

   El corazón de todo esto. Antes: borraba, reventaba, y la columna quedaba
   vacía para siempre. Ahora: revienta antes de tocar nada y lo viejo aguanta.
   Una lista desactualizada es un problema pequeño y visible; una lista vacía es
   uno grande e invisible. */
console.log('\n═══ 2. Una escritura que falla no deja la columna vacía ═══\n');
{
  const cfg = configDeEjemplo();
  const antes = cfg.columna(1).slice();
  const ctx = montar();
  cfg.romperEn = 1;

  let lanzo = null;
  try { ctx.writeConfigColumn_(cfg, 1, ['WINDOW', 'SCREEN']); }
  catch (e) { lanzo = e.message; }

  check('la escritura falló, que es lo que se estaba provocando', !!lanzo, lanzo);
  check('LAS CATEGORÍAS SIGUEN AHÍ, las cuatro — es el fallo que vació el ' +
        'archivo tres veces, aquí dentro',
        cfg.columna(1).join('|') === antes.join('|'),
        { antes, ahora: cfg.columna(1) });
  check('y las ubicaciones tampoco se tocaron', cfg.columna(3).length === 5);
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. NOMBRE Y TIPO NO SE PUEDEN DESCOLOCAR
   ═══════════════════════════════════════════════════════════════════════════

   El segundo fallo, que salió al mirar quién llamaba a la función: dos columnas
   que sólo significan algo emparejadas, escritas en dos llamadas. Si la primera
   salía y la segunda no, A1A se quedaba con el tipo de A1B. Nada fallaba y nada
   avisaba. */
console.log('\n═══ 3. Las ubicaciones y sus tipos van juntas ═══\n');
{
  const cfg = configDeEjemplo();
  const ctx = montar();
  ctx.writeConfigColumns_(cfg, 3,
    [['A1A', 'A1B', 'NUEVO'], ['RACK', 'ARCHIVED', 'RACK']]);

  check('cada ubicación conserva SU tipo',
        JSON.stringify(cfg.pares(3, 4)) ===
        JSON.stringify([['A1A','RACK'], ['A1B','ARCHIVED'], ['NUEVO','RACK']]),
        cfg.pares(3, 4));
  check('SE ESCRIBEN EN UNA SOLA OPERACIÓN — con dos no existe el estado en que ' +
        'una salió y la otra no', cfg._escrituras === 1, cfg._escrituras);
}

{
  /* Y si esa única escritura revienta, no queda media cosa: queda lo de antes,
   * emparejado como estaba. */
  const cfg = configDeEjemplo();
  const antes = JSON.stringify(cfg.pares(3, 4));
  const ctx = montar();
  cfg.romperEn = 1;
  try { ctx.writeConfigColumns_(cfg, 3, [['A1A'], ['ARCHIVED']]); } catch (e) {}

  check('al fallar, los pares de antes siguen emparejados igual',
        JSON.stringify(cfg.pares(3, 4)) === antes, { antes, ahora: cfg.pares(3, 4) });
}

{
  /* Una fila sin nombre se cae ENTERA. Filtrar cada columna por su cuenta —que
   * es lo que hacía la función vieja— es exactamente cómo se descolocan: si
   * falta el nombre de la segunda, el tipo de la tercera sube un puesto. */
  const cfg = configDeEjemplo();
  const ctx = montar();
  ctx.writeConfigColumns_(cfg, 3,
    [['A1A', '', 'C3C'], ['RACK', 'ARCHIVED', 'RACK']]);

  check('UNA FILA SIN NOMBRE SE CAE CON SU TIPO, no deja al de abajo subir un ' +
        'puesto',
        JSON.stringify(cfg.pares(3, 4)) ===
        JSON.stringify([['A1A','RACK'], ['C3C','RACK']]), cfg.pares(3, 4));
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. VACIAR UNA LISTA SE PUEDE, PERO SE DICE
   ═══════════════════════════════════════════════════════════════════════════

   Borrar la última ubicación es legítimo. Pero una lista que se vacía sola
   también es lo que se vería si quien llama calculó mal, y tres veces nos hemos
   quedado mirando una pestaña vacía sin saber si fue una persona o un fallo. */
console.log('\n═══ 4. Vaciar una lista deja rastro ═══\n');
{
  const cfg = configDeEjemplo();
  const ctx = montar();
  ctx.writeConfigColumn_(cfg, 1, []);

  check('se vacía, porque borrar la última es una acción legítima',
        cfg.columna(1).length === 0, cfg.columna(1));
  check('PERO QUEDA ESCRITO que una lista con cosas se quedó sin ninguna',
        ctx.avisos.length === 1 && /emptied/i.test(ctx.avisos[0].msg), ctx.avisos);
  check('...y dice cuántas había, que es lo que hace falta para reponerlas',
        /had 4 value/.test(ctx.avisos[0].msg), ctx.avisos[0].msg);
  check('y no se queja cuando la lista ya estaba vacía',
        (function () {
          const c2 = hojaConfig([CAB], 10), x = montar();
          x.writeConfigColumn_(c2, 1, []);
          return x.avisos.length === 0;
        })());
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. QUE NO QUEDE NINGÚN SITIO ESCRIBIENDO LAS PAREJAS POR SEPARADO
   ═══════════════════════════════════════════════════════════════════════════

   Contar las puertas, como en test-url-de-la-app: arreglar la función y dejar a
   un llamador escribiendo las dos columnas por su cuenta sería volver a tener
   el fallo con la prueba en verde. */
console.log('\n═══ 5. Nadie escribe nombre y tipo por separado ═══\n');
{
  const limpio = A.sinComentarios(GS);
  const nombres = (limpio.match(/writeConfigColumn_\(\s*cfg\s*,\s*3\s*,/g) || []).length;
  const tipos   = (limpio.match(/writeConfigColumn_\(\s*cfg\s*,\s*4\s*,/g) || []).length;

  check('NINGÚN SITIO ESCRIBE LA COLUMNA DE NOMBRES POR SU CUENTA',
        nombres === 0, nombres);
  check('ni la de tipos', tipos === 0, tipos);
  check('y sí hay quien las escribe emparejadas — si no, esta prueba no mide nada',
        /writeConfigColumns_\(\s*cfg\s*,\s*3\s*,/.test(limpio));
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones\n');
process.exit(fail ? 1 : 0);
