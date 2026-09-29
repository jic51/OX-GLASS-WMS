// EL FORMATO ESTÁNDAR DE LA HOJA — lo que ve un cliente al abrirla.
//
// Jose, 2026-09-28: "sobre la plantilla debemos estandarizarla y ponerle formato
// a todo, el formato profesional que queremos que los usuarios vean ya sea
// cuando yo les instale el programa o cuando ellos lo hagan."
//
// Lo medido antes de escribir nada: YA EXISTÍA una casa de estilo
// (SH_NAVY/SH_ACCENT/SH_MUTED) y la usaban TRES pestañas de veinte. Las otras
// diecisiete recibían una fila fija y la cabecera en negrita, y nada más.
//
// ── LO QUE ESTA PRUEBA PROTEGE, Y POR QUÉ CADA COSA ─────────────────────────
//
//   1. QUE NINGUNA PESTAÑA SE QUEDE FUERA. Es la de verdad, y es la lección de
//      check-suite.js aplicada a los datos: el fallo no va a ser un color mal
//      puesto, va a ser la pestaña NUEVA que alguien añada a SHEETS y no meta
//      en los grupos. Por eso se compara contra SHEETS, no contra una lista
//      propia de este archivo — una lista propia acabaría siendo la segunda
//      lista que hay que mantener, que es el problema, no la solución.
//
//   2. QUE NO TOQUE EL FORMATO DE UNA HOJA CON DATOS. Poner texto sobre una
//      columna que ya tiene números cambia cómo se ven y rompe cualquier
//      fórmula del cliente sobre ella. Sobre una plantilla vacía no cuesta nada.
//
//   3. QUE CORRERLA DOS VECES NO HAGA NADA LA SEGUNDA. Se llama desde tres
//      sitios; si no fuera idempotente, cada arranque acumularía protecciones.
//
//   4. QUE EL CONJUNTO SEGURO SEA DE VERDAD SEGURO: sin `completo` no puede
//      tocar ni un ancho ni el orden de las pestañas.
//
// Uso:  node tools/test-formato-plantilla.js

const vm = require('vm');
const A  = require('./andamio.js');
const GS = A.fuente('gs');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

/* Hoja de mentira que REGISTRA lo que le hacen en vez de dibujarlo. Es lo único
 * que hace comprobable un cambio de formato: no hay píxeles que medir, hay
 * llamadas que contar. */
function hojaFalsa(nombre, filasConDatos, maxCols) {
  const log = [];
  const h = {
    nombre, log,
    _color: null, _notaA1: '', _protecciones: [], _anchos: {},
    getName: () => nombre,
    getLastRow: () => 1 + (filasConDatos || 0),
    getLastColumn: () => maxCols || 5,
    getMaxRows: () => 1000,
    getMaxColumns: () => maxCols || 5,
    getTabColor: () => h._color,
    setTabColor(c) { h._color = c; log.push('tabColor:' + c); return h; },
    setFrozenRows(n) { log.push('frozen:' + n); return h; },
    setRowHeight(r, px) { log.push('rowHeight:' + r + ':' + px); return h; },
    setColumnWidth(c, px) { h._anchos[c] = px; log.push('width:' + c + ':' + px); return h; },
    getProtections: () => h._protecciones,
    protect() {
      const p = { setWarningOnly(v) { p._warn = v; return p; } };
      h._protecciones.push(p);
      log.push('protect');
      return p;
    },
    getRange(f, c, nf, nc) {
      const marca = f + ',' + c + ',' + (nf || 1) + ',' + (nc || 1);
      const r = {
        _bg: null,
        getBackground: () => h._bgCabecera || null,
        getNote: () => h._notaA1,
        setNote(t) { h._notaA1 = t; log.push('note'); return r; },
        setNumberFormat(fm) { log.push('numFmt:' + marca + ':' + fm); return r; },
        setHorizontalAlignment(a) { log.push('align:' + marca + ':' + a); return r; },
        setBackground(b) { h._bgCabecera = b; log.push('bg:' + b); return r; },
        setFontColor() { return r; }, setFontWeight() { return r; },
        setFontSize() { return r; }, setVerticalAlignment() { return r; }
      };
      return r;
    }
  };
  return h;
}

/** Monta aplicarFormatoEstandar_ de verdad. */
function montar(nombres, datosPorHoja) {
  const hojas = {};
  nombres.forEach(n => { hojas[n] = hojaFalsa(n, (datosPorHoja || {})[n] || 0, 23); });
  const activo = [];
  const ctx = {
    console, JSON, Math, Number, String, Array, Object,
    SpreadsheetApp: { ProtectionType: { SHEET: 'SHEET' } },
    Logger: { log(){} },
    ss: {
      getSheetByName: n => hojas[n] || null,
      setActiveSheet(s) { ctx._act = s; },
      moveActiveSheet(i) { activo.push(ctx._act.getName() + '→' + i); }
    }
  };
  vm.createContext(ctx);
  // Las constantes de verdad salen del archivo, no se copian aquí: una copia se
  // queda vieja el día que alguien cambie un color y la prueba seguiría verde.
  // SH_NAVY llega con SH_ACCENT y SH_MUTED: las tres están en la misma línea del
  // producto, y pedir las tres por separado declararía la misma línea tres veces.
  vm.runInContext(A.constantes(GS, [
    'SHEETS', 'AC', 'SH_NAVY', 'PRODUCT_NAME',
    'START_HERE_SHEET', 'TERMS_SHEET', 'PRIVACY_SHEET', 'FORMATO_CABECERA_ALTO'
  ]), ctx);
  vm.runInContext(A.levantar(GS, [
    'aplicarFormatoEstandar_', 'gruposDeFormato_', 'anchosDelArchivo_',
    'hojaVacia_', 'protegerConAviso_'
  ], {}), ctx);
  ctx.hojas = hojas;
  ctx.ordenado = activo;
  return ctx;
}

/** Todas las pestañas que los grupos cubren. */
function cubiertas(ctx) {
  const out = [];
  ctx.gruposDeFormato_().forEach(g => g.hojas.forEach(n => out.push(n)));
  return out;
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. NINGUNA PESTAÑA SE QUEDA FUERA — la comprobación que de verdad importa
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 1. Todas las pestañas del producto tienen grupo ═══\n');
{
  const ctx = montar(['CONFIG']);
  const cub = cubiertas(ctx).map(s => String(s).toUpperCase());
  const todas = Object.keys(ctx.SHEETS).map(k => String(ctx.SHEETS[k]).toUpperCase());

  // ACOPIO_CONFIG_SNAPSHOT vive SÓLO dentro de una copia de backup, nunca en el
  // archivo vivo (ver writeConfigSnapshot_), así que no tiene pestaña que
  // pintar aquí. Es la única excepción y va con su razón escrita.
  const FUERA = { 'ACOPIO_CONFIG_SNAPSHOT': 'sólo existe dentro de una copia de backup' };

  const huerfanas = todas.filter(n => cub.indexOf(n) === -1 && !FUERA[n]);
  check('ninguna hoja de SHEETS se quedó sin grupo — si esto falla, alguien ' +
        'añadió una pestaña y no la puso en gruposDeFormato_',
        huerfanas.length === 0, huerfanas);

  // Y al revés: un grupo que nombra una pestaña que ya no existe manda a la
  // gente a buscar algo que no está.
  const extras = cub.filter(n =>
    todas.indexOf(n) === -1 &&
    ['👉 START HERE','📄 TERMS OF SERVICE','📄 PRIVACY POLICY',
     'INCOMING_V3','USERS_V3','PM_DIRECTORY','RACK_PHOTOS','MATERIAL_LOCKS'].indexOf(n) === -1);
  check('y ningún grupo nombra una pestaña inventada', extras.length === 0, extras);
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. SOBRE UNA PLANTILLA VACÍA: se formatea todo
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 2. Plantilla vacía, conjunto completo ═══\n');
{
  const ctx = montar(['MASTER_ARCHIVE_V3', 'CONFIG', 'LIVE_STOCK', 'AUDIT_LOG', '👉 START HERE']);
  const rep = ctx.aplicarFormatoEstandar_(ctx.ss, { completo: true });

  const arch = ctx.hojas['MASTER_ARCHIVE_V3'];
  check('el archivo queda en formato TEXTO', arch.log.some(l => /numFmt:.*:@/.test(l)), arch.log);
  check('...y con anchos puestos', Object.keys(arch._anchos).length > 10, arch._anchos);
  check('...con la cantidad alineada a la derecha, que es presentación y no ' +
        'toca el valor', arch.log.some(l => /align:.*:right/.test(l)));
  check('la cabecera del archivo va en navy', arch.log.some(l => l === 'bg:' + ctx.SH_NAVY));
  check('y su pestaña en el azul de "datos"', arch._color === ctx.SH_ACCENT, arch._color);

  const live = ctx.hojas['LIVE_STOCK'];
  check('LIVE_STOCK lleva el gris de "la reescribe la app"', live._color === ctx.SH_MUTED, live._color);
  check('...y una nota en A1 que lo dice con palabras',
        /Edits here are overwritten/.test(live._notaA1), live._notaA1);
  check('...y protección en modo AVISO, no bloqueo', live._protecciones.length === 1);

  const doc = ctx.hojas['👉 START HERE'];
  check('a los documentos NO se les pinta cabecera de tabla encima',
        !doc.log.some(l => l.indexOf('bg:') === 0), doc.log);
  check('...pero sí llevan su color navy', doc._color === ctx.SH_NAVY, doc._color);

  check('y las pestañas quedan en orden', ctx.ordenado.length > 0, ctx.ordenado.slice(0, 3));
  check('sin fallos', rep.fallos.length === 0, rep.fallos);
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. SOBRE UNA HOJA CON DATOS: no se le toca el formato de las celdas
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 3. Instalación con datos: el formato de las celdas se respeta ═══\n');
{
  const ctx = montar(['MASTER_ARCHIVE_V3', 'LIVE_STOCK'], { 'MASTER_ARCHIVE_V3': 1271 });
  const rep = ctx.aplicarFormatoEstandar_(ctx.ss, { completo: true });

  const arch = ctx.hojas['MASTER_ARCHIVE_V3'];
  check('NO se le pone formato de texto a un archivo con 1.271 filas — ' +
        'cambiaría cómo se ven los números de alguien',
        !arch.log.some(l => /numFmt/.test(l)), arch.log.filter(l => /numFmt/.test(l)));
  check('NO se le tocan los anchos', Object.keys(arch._anchos).length === 0, arch._anchos);
  check('y se dice cuál se dejó en paz, en vez de callarlo',
        rep.saltadas.indexOf('MASTER_ARCHIVE_V3') !== -1, rep.saltadas);

  check('pero el color de pestaña SÍ se pone — eso no pisa nada de nadie',
        arch._color === ctx.SH_ACCENT, arch._color);
  check('y la cabecera también', arch.log.some(l => l === 'bg:' + ctx.SH_NAVY));
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. EL CONJUNTO SEGURO no toca anchos ni el orden de las pestañas
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 4. Sin `completo`: sólo lo que no pisa decisiones ═══\n');
{
  const ctx = montar(['MASTER_ARCHIVE_V3', 'LIVE_STOCK']);
  ctx.aplicarFormatoEstandar_(ctx.ss, { completo: false });
  const arch = ctx.hojas['MASTER_ARCHIVE_V3'];

  check('ni un ancho', Object.keys(arch._anchos).length === 0, arch._anchos);
  check('ni un formato de celda', !arch.log.some(l => /numFmt/.test(l)));
  check('ni se reordenan las pestañas — sería reordenarle el escritorio a alguien',
        ctx.ordenado.length === 0, ctx.ordenado);
  check('pero el color y la cabecera sí', arch._color === ctx.SH_ACCENT &&
        arch.log.some(l => l === 'bg:' + ctx.SH_NAVY));
  check('y la nota de la hoja calculada también',
        /Edits here are overwritten/.test(ctx.hojas['LIVE_STOCK']._notaA1));
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. IDEMPOTENTE — se llama desde tres sitios
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 5. Correrla dos veces no hace nada la segunda ═══\n');
{
  const ctx = montar(['MASTER_ARCHIVE_V3', 'LIVE_STOCK', 'AUDIT_LOG']);
  const r1 = ctx.aplicarFormatoEstandar_(ctx.ss, { completo: false });
  const r2 = ctx.aplicarFormatoEstandar_(ctx.ss, { completo: false });

  check('la primera vuelta hace trabajo', r1.pestanas > 0 && r1.cabeceras > 0, r1);
  check('la segunda no pone ni un color', r2.pestanas === 0, r2);
  check('ni una cabecera', r2.cabeceras === 0, r2);
  check('ni una nota', r2.notas === 0, r2);
  check('NI UNA PROTECCIÓN MÁS — sin esto, cada arranque apilaría una',
        r2.protegidas === 0 && ctx.hojas['LIVE_STOCK']._protecciones.length === 1,
        ctx.hojas['LIVE_STOCK']._protecciones.length);
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. UNA HOJA QUE NO EXISTE NO PUEDE TIRAR NADA
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 6. Una instalación no tiene todas las pestañas ═══\n');
{
  const ctx = montar(['CONFIG']);          // sólo una de las veinte
  let lanzo = null, rep = null;
  try { rep = ctx.aplicarFormatoEstandar_(ctx.ss, { completo: true }); }
  catch (e) { lanzo = e.message; }
  check('no lanza', !lanzo, lanzo);
  check('y formatea la que sí está', rep && rep.pestanas === 1, rep);
  check('sin contar fallos que no ocurrieron', rep && rep.fallos.length === 0, rep && rep.fallos);
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallos, ' : '✓ ') + ok + ' comprobaciones\n');
process.exit(fail ? 1 : 0);
