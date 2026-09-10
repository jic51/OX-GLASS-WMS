/**
 * MEDIR CUÁNTO TARDA DE VERDAD RECONSTRUIR LOS TOTALES — v2
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Jose, 2026-09-10: "siempre veo que al guardar, borrar, o hacer otras cosas la
 * app primero piensa y luego manda el toast verde." Ese "primero piensa" es
 * refreshDerivedSheets_, que reconstruye LIVE_STOCK, SITE_STOCK y WASTED_STOCK
 * DESDE EL ARCHIVO ENTERO en cada guardado y en cada borrado.
 *
 * LA v1 TENÍA UN FALLO MÍO y hay que decirlo, porque explica el registro raro:
 * buscaba el archivo por el nombre "ARCHIVE", escrito a mano. La hoja se llama
 * MASTER_ARCHIVE_V3. Así que la línea de "sólo leer" midió una hoja que no
 * existe —439 ms de nada— y el "por movimiento" salió dividido entre cero.
 *
 * El número grande de la v1 SÍ ERA BUENO: el refresco completo tardó entre 3,1
 * y 6,0 segundos en nueve vueltas. Y dijo algo que ya no hace falta volver a
 * medir: la primera vuelta NO es sistemáticamente más lenta que las otras, así
 * que las reparaciones de MatID —escritas una por fila— no son de donde sale el
 * tiempo.
 *
 * ESTA VERSIÓN CONTESTA LA PREGUNTA QUE QUEDA: de esos ~4,5 segundos, ¿cuánto
 * es LEER el archivo y cuánto es ESCRIBIR las tres hojas derivadas? De eso
 * depende cuál de los dos arreglos vale la pena:
 *
 *   si manda LEER  → el arreglo es que borrar AJUSTE los totales en vez de
 *                    recalcularlos desde cero. Cambio grande, con su riesgo.
 *   si manda ESCRIBIR → el arreglo es no reescribir las tres hojas enteras
 *                    cuando sólo cambió un material. Cambio mediano.
 *
 * ─── CÓMO SE USA ───────────────────────────────────────────────────────────
 *
 *  1. Abre tu hoja → Extensiones → Apps Script.
 *  2. Abre el archivo "medir" que ya creaste (o crea uno nuevo: + → Script).
 *  3. Borra lo que tenga y pega TODO este archivo.
 *  4. Guarda (💾).
 *  5. Elige  medirRefresco  arriba → Ejecutar.
 *  6. Mándame el registro entero.
 *  7. Cuando terminemos, borra el archivo "medir". No deja nada puesto.
 *
 * ─── QUÉ HACE Y QUÉ NO ─────────────────────────────────────────────────────
 *
 * NO cambia ningún dato tuyo.
 *
 * La parte de escritura merece una frase, porque es la única que escribe: LEE
 * las tres hojas derivadas, las vacía y VUELVE A ESCRIBIR EXACTAMENTE LO MISMO
 * que acaba de leer. Es la misma operación que la app hace en cada guardado
 * (clearContents + setValues), con el mismo número de filas, pero con los
 * valores de vuelta sin tocar. Y aunque saliera mal, esas tres hojas son una
 * copia calculada del archivo: se rehacen enteras en el siguiente guardado.
 */

// Los nombres SALEN DE LA APP, no de aquí. Escribirlos a mano fue el fallo de
// la v1, y volver a escribirlos a mano sería repetirlo con otro nombre.
function _nombresHoja_() {
  try {
    if (typeof SHEETS === 'object' && SHEETS && SHEETS.ARCHIVE) {
      return { archivo: SHEETS.ARCHIVE, historia: SHEETS.ARCHIVE_HISTORY,
               live: SHEETS.LIVE, site: SHEETS.SITE, waste: SHEETS.WASTE, deLaApp: true };
    }
  } catch (e) {}
  return { archivo: 'MASTER_ARCHIVE_V3', historia: 'ARCHIVE_HISTORY',
           live: 'LIVE_STOCK', site: 'SITE_STOCK', waste: 'WASTED_STOCK', deLaApp: false };
}

function medirRefresco() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var N  = _nombresHoja_();
  var L  = [];
  function di(t){ L.push(t); Logger.log(t); }
  function ahora(){ return new Date().getTime(); }

  di('═══ ACOPIO — dónde se van los segundos del refresco (v2) ═══');
  di('Hoja: ' + ss.getName());
  di('Nombres: ' + (N.deLaApp ? 'leídos de la app ✓' : '⚠ de respaldo — SHEETS no estaba a la vista'));
  di('');

  // ── 1. El tamaño ─────────────────────────────────────────────────────────
  di('── Tamaño ──');
  var hojas = {};
  [['archivo', N.archivo], ['historia', N.historia],
   ['live', N.live], ['site', N.site], ['waste', N.waste]].forEach(function(par){
    var h = ss.getSheetByName(par[1]);
    hojas[par[0]] = h;
    di('  ' + par[1] + ': ' + (h ? Math.max(0, h.getLastRow() - 1) + ' filas' : '❌ NO EXISTE'));
  });
  if (!hojas.archivo) {
    di('');
    di('⚠ Sin el archivo no hay nada que medir. Mándame igual este registro.');
    return L.join('\n');
  }
  var nMov = Math.max(0, hojas.archivo.getLastRow() - 1) +
             (hojas.historia ? Math.max(0, hojas.historia.getLastRow() - 1) : 0);
  di('  → movimientos que se recorren en CADA guardado y CADA borrado: ' + nMov);
  di('');

  // ── 2. LEER ──────────────────────────────────────────────────────────────
  di('── Parte 1: LEER el archivo entero ──');
  var t = ahora();
  var datosA = hojas.archivo.getDataRange().getValues();
  var tA = ahora() - t;
  t = ahora();
  var datosH = hojas.historia ? hojas.historia.getDataRange().getValues() : [[]];
  var tH = ahora() - t;
  di('  ' + N.archivo + ': ' + tA + ' ms  (' + datosA.length + ' filas × ' +
     ((datosA[0] || []).length) + ' columnas)');
  di('  ' + N.historia + ': ' + tH + ' ms  (' + datosH.length + ' filas)');
  var tLeer = tA + tH;
  di('  TOTAL LEER: ' + tLeer + ' ms');
  di('');

  // ── 3. ESCRIBIR ──────────────────────────────────────────────────────────
  //
  // Cada hoja derivada se lee, se vacía y se vuelve a escribir CON LO MISMO. Es
  // el mismo par clearContents + setValues que hace la app, con el mismo número
  // de filas, pero sin cambiar un solo valor.
  di('── Parte 2: ESCRIBIR las tres hojas derivadas ──');
  var tEscribir = 0;
  ['live', 'site', 'waste'].forEach(function(cual){
    var h = hojas[cual];
    if (!h) { di('  ' + cual + ': no existe'); return; }
    var vals = h.getDataRange().getValues();
    var t1 = ahora();
    h.clearContents();
    if (vals.length && (vals[0] || []).length) {
      h.getRange(1, 1, vals.length, vals[0].length).setValues(vals);
    }
    SpreadsheetApp.flush();
    var ms = ahora() - t1;
    tEscribir += ms;
    di('  ' + h.getName() + ': ' + ms + ' ms  (' + vals.length + ' filas)');
  });
  di('  TOTAL ESCRIBIR: ' + tEscribir + ' ms');
  di('');

  // ── 4. El refresco entero, dos veces ─────────────────────────────────────
  di('── Parte 3: el refresco completo, como lo hace la app ──');
  var vueltas = [];
  for (var v = 1; v <= 2; v++) {
    var t2 = ahora(), err = '';
    try { refreshDerivedSheets_(ss); SpreadsheetApp.flush(); }
    catch (e) { err = ' ← FALLÓ: ' + e.message; }
    var ms2 = ahora() - t2;
    vueltas.push(ms2);
    di('  vuelta ' + v + ': ' + ms2 + ' ms' + err);
  }
  var tTodo = Math.round((vueltas[0] + vueltas[1]) / 2);
  di('');

  // ── 5. La lectura ────────────────────────────────────────────────────────
  di('── Dónde se van los segundos ──');
  var resto = tTodo - tLeer - tEscribir;
  function pct(x){ return tTodo > 0 ? ' (' + Math.round(x / tTodo * 100) + '%)' : ''; }
  di('  refresco completo:  ' + tTodo + ' ms   ← el precio de cada guardado y cada borrado');
  di('    leer el archivo:  ' + tLeer + ' ms' + pct(tLeer));
  di('    escribir las 3:   ' + tEscribir + ' ms' + pct(tEscribir));
  di('    lo demás:         ' + resto + ' ms' + pct(resto) +
     '   (recorrer ' + nMov + ' movimientos en JS, y reparaciones)');
  if (nMov > 0) {
    di('  por movimiento del archivo: ' +
       (Math.round(tTodo / nMov * 1000) / 1000) + ' ms');
  }
  di('');
  if (tEscribir > tLeer * 1.5)      di('  → MANDA ESCRIBIR.');
  else if (tLeer > tEscribir * 1.5) di('  → MANDA LEER.');
  else                              di('  → LEER Y ESCRIBIR cuestan parecido.');
  di('');
  di('── Mándame este texto entero ──');

  return L.join('\n');
}
