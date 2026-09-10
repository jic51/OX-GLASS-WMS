/**
 * MEDIR CUÁNTO TARDA DE VERDAD RECONSTRUIR LOS TOTALES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Jose, 2026-09-10: "siempre veo que al guardar, borrar, o hacer otras cosas la
 * app primero piensa y luego manda el toast verde." Ese "primero piensa" es
 * refreshDerivedSheets_, que reconstruye LIVE_STOCK, SITE_STOCK y WASTED_STOCK
 * DESDE EL ARCHIVO ENTERO en cada guardado y en cada borrado.
 *
 * La pregunta que hay que contestar antes de tocar nada es cuánto tarda ESO en
 * TU hoja. Si son 300 ms, la lentitud que ves es otra cosa y perseguirla por
 * aquí es perder el tiempo. Si son 4 segundos, entonces sí vale la pena el
 * cambio grande: que borrar AJUSTE los totales en vez de recalcularlos.
 *
 * ─── CÓMO SE USA ───────────────────────────────────────────────────────────
 *
 *  1. Abre tu hoja → Extensiones → Apps Script.
 *  2. Botón + junto a "Archivos" → Script. Llámalo "medir".
 *  3. Borra lo que traiga y pega TODO este archivo.
 *  4. Guarda (💾).
 *  5. Arriba, en el desplegable de funciones, elige  medirRefresco  → Ejecutar.
 *  6. Cuando termine, abajo sale el registro. Mándame ESE TEXTO entero.
 *  7. Cuando ya no lo necesites, borra el archivo "medir". No deja nada puesto.
 *
 * ─── QUÉ HACE Y QUÉ NO ─────────────────────────────────────────────────────
 *
 * NO cambia ningún dato tuyo. Lo único que escribe es lo mismo que la app
 * escribe sola cada vez que guardas un movimiento: las tres hojas derivadas,
 * que son una copia calculada del archivo. Si algo saliera mal, se rehacen
 * enteras en el siguiente guardado.
 *
 * Tarda lo que tarde un guardado, tres veces. Si Apps Script se queja de que
 * pasó de 6 minutos, ESO YA ES LA RESPUESTA y me lo dices tal cual.
 */

function medirRefresco() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var L  = [];
  function di(t){ L.push(t); Logger.log(t); }

  di('═══ ACOPIO — cuánto tarda reconstruir los totales ═══');
  di('Hoja: ' + ss.getName());
  di('');

  // ── 1. El tamaño, que es lo que manda ────────────────────────────────────
  var nombres = ['ARCHIVE', 'ARCHIVE_HISTORY', 'LIVE_STOCK', 'SITE_STOCK', 'WASTED_STOCK'];
  var filas = {};
  di('── Tamaño ──');
  for (var i = 0; i < nombres.length; i++) {
    var h = ss.getSheetByName(nombres[i]);
    filas[nombres[i]] = h ? Math.max(0, h.getLastRow() - 1) : -1;
    di('  ' + nombres[i] + ': ' + (h ? filas[nombres[i]] + ' filas' : 'NO EXISTE'));
  }
  var total = Math.max(0, filas['ARCHIVE']) + Math.max(0, filas['ARCHIVE_HISTORY']);
  di('  → movimientos que se recorren en cada refresco: ' + total);
  di('');

  // ── 2. Sólo LEER el archivo entero ───────────────────────────────────────
  // Es el suelo: por rápido que se vuelva el resto, esto se paga igual mientras
  // el cálculo salga del archivo completo.
  di('── Sólo leer el archivo (el suelo de todo) ──');
  var t0 = new Date().getTime();
  var arch = ss.getSheetByName('ARCHIVE');
  var hist = ss.getSheetByName('ARCHIVE_HISTORY');
  var datosA = arch ? arch.getDataRange().getValues() : [];
  var datosH = hist ? hist.getDataRange().getValues() : [];
  var tLeer = new Date().getTime() - t0;
  di('  leer ARCHIVE + ARCHIVE_HISTORY: ' + tLeer + ' ms  (' +
     (datosA.length + datosH.length) + ' filas, ' +
     ((datosA[0] || []).length) + ' columnas)');
  di('');

  // ── 3. El refresco entero, tres veces ────────────────────────────────────
  //
  // TRES VECES A PROPÓSITO, y la diferencia entre la primera y las otras dos es
  // media respuesta:
  //
  //   La primera incluye las reparaciones de MatID, que hoy se escriben UNA
  //   POR FILA (una llamada a Sheets por cada fila mal). Se cura sola, así que
  //   la segunda ya no las tiene.
  //
  //   Si la 1ª es MUCHO más lenta que la 2ª y la 3ª, tu lentitud "sin razón"
  //   era eso, y se arregla escribiéndolas de golpe.
  //   Si las tres tardan parecido, el precio es el recálculo completo y el
  //   arreglo es el otro: que borrar ajuste en vez de recalcular.
  di('── El refresco completo (lo que la app hace en cada guardado) ──');
  var tiempos = [];
  for (var v = 1; v <= 3; v++) {
    var t1 = new Date().getTime();
    var err = '';
    try {
      refreshDerivedSheets_(ss);
      SpreadsheetApp.flush();          // que el tiempo incluya la escritura de verdad
    } catch (e) {
      err = ' ← FALLÓ: ' + e.message;
    }
    var ms = new Date().getTime() - t1;
    tiempos.push(ms);
    di('  vuelta ' + v + ': ' + ms + ' ms' + err);
  }
  di('');

  // ── 4. La lectura ────────────────────────────────────────────────────────
  di('── Resumen ──');
  var primera = tiempos[0];
  var resto   = Math.round((tiempos[1] + tiempos[2]) / 2);
  di('  primera vuelta: ' + primera + ' ms');
  di('  vueltas 2 y 3 (media): ' + resto + ' ms  ← ESTE es el precio de cada borrado');
  di('  de eso, sólo leer: ' + tLeer + ' ms');
  if (resto > 0) {
    di('  por movimiento: ' + (Math.round(resto / Math.max(1, total) * 100) / 100) + ' ms');
  }
  if (primera > resto * 1.6 && primera - resto > 400) {
    di('');
    di('  ⚠ La primera vuelta tardó ' + (primera - resto) + ' ms MÁS que las otras.');
    di('    Eso son las reparaciones de MatID, escritas una por fila.');
  }
  di('');
  di('── Mándame este texto entero ──');

  return L.join('\n');
}
