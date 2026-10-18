/**
 * PRUEBA DE UN CLIC — SEGUNDA FORMA: LA APP WEB — 18/10/2026
 *
 * La primera prueba puso la app en una VENTANA DENTRO DE LA HOJA. Funcionó, pero
 * costó dos cosas:
 *
 *   · `script.container.ui` —el permiso de poner menús y ventanas dentro de la
 *     hoja— resultó ser SENSIBLE en la consola de Cloud, y un permiso sensible
 *     sin verificar es lo que enciende la pantalla de «Google no ha verificado
 *     esta aplicación».
 *   · Y la ventana dentro de la hoja NO se abre desde un teléfono. Confirmado
 *     por Jose el 16/10: la app de Sheets del móvil no pinta menús de Apps
 *     Script.
 *
 * Esta versión quita ese permiso entero. No hay menú y no hay ventana: la app se
 * sirve como APP WEB, por `doGet`, que es exactamente como funciona hoy la
 * versión de pago.
 *
 * ── LO QUE MIDE ──────────────────────────────────────────────────────────────
 *
 *   1. ¿Desaparece la pantalla fea? Queda UN solo permiso,
 *      `spreadsheets.currentonly`, y la consola ya lo clasificó como NO
 *      SENSIBLE. Si la teoría es correcta, la pantalla de permisos sale suave.
 *   2. ¿Funciona en el teléfono? Una app web es una dirección normal. Debería.
 *   3. ¿Cuánto cuesta de verdad el despliegue? Es el precio de este camino y
 *      conviene cronometrarlo, no suponerlo.
 *
 * ── POR QUÉ ESTO PUEDE FUNCIONAR, Y NO ES UNA CORAZONADA ─────────────────────
 *
 * La app de pago llama a `getActiveSpreadsheet()` ochenta y una veces y la sirve
 * por `doGet`. O sea que un script ATADO a una hoja llega a su propia hoja desde
 * una app web sin ningún permiso de Drive. Eso ya está en producción desde hace
 * meses; aquí sólo se comprueba que también alcanza estando SOLO ese permiso.
 *
 * ── LO QUE NO PUEDE TOCAR ESTE ARCHIVO ───────────────────────────────────────
 *
 * Nada de `SpreadsheetApp.getUi()`. Ni un menú, ni una alerta, ni un cuadro de
 * diálogo. Esa llamada es justo el permiso que esta prueba viene a quitar: si se
 * cuela una, vuelve el permiso sensible y la prueba mide lo contrario de lo que
 * dice medir.
 *
 * Tampoco `Session.getActiveUser()`, `DriveApp`, `UrlFetchApp`, `MailApp` ni
 * `ScriptApp`, por la misma razón que en la primera prueba.
 *
 * @OnlyCurrentDoc
 */

var VERSION_PRUEBA = 'prueba-1clic-web-1';

/**
 * LA PUERTA DE ENTRADA.
 *
 * `doGet` no es un disparador simple: corre autorizado, con todos los permisos
 * concedidos. Por eso aquí no existe la limitación que obligaba a poner un menú
 * en la primera prueba — no hay nada que el usuario tenga que pulsar antes.
 *
 * El `viewport` va porque la mitad de la prueba es abrir esto en un teléfono. Sin
 * esa etiqueta el móvil dibuja la página a tamaño de escritorio y la encoge, y
 * pareceria que no sirve cuando el problema sería sólo esa línea.
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Panel')
    .setTitle('Prueba de un clic')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Lo mismo que en la primera prueba, sin un cambio.
 *
 * Que sea idéntica es el punto: si escribe aquí igual que escribía allá, queda
 * demostrado que `spreadsheets.currentonly` alcanza para registrar movimientos
 * por los dos caminos, y la elección entre ventana y app web deja de depender de
 * los permisos.
 *
 * `getActiveSpreadsheet()` entra dentro de `spreadsheets.currentonly`.
 * `openById()` NO — ése necesita el permiso grande, y por eso no aparece aquí.
 */
function escribirFilaDePrueba(texto) {
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  hoja.appendRow([new Date(), VERSION_PRUEBA, String(texto || '')]);
  return 'Escrita la fila ' + hoja.getLastRow() + ' en «' + hoja.getName() + '»';
}
