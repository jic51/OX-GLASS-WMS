// BORRAR 490 NO PUEDEN SER 490 PETICIONES, Y TIENE QUE PODERSE PARAR.
//
// Jose, 22/10, con dos vídeos — el principio y el final, porque grabar la media
// hora entera no cabía:
//
//   · marcó 490 movimientos y pulsó Delete
//   · a los 3 min 37 s la línea decía «Deleting movements... 4 of 490»
//   · **tardó casi treinta minutos en total**
//   · acabó en «450 moved to the trash · 40 could not be deleted»
//   · con DOS avisos idénticos apilados: «Too many requests — please wait a
//     moment and try again»
//
// Y lo que de verdad le molestó: *"no hay forma de pararlos ni borrar lo que la
// app ya está haciendo"*. No la había. Nada en toda la app vaciaba `_delQueue`.
//
// ── LAS CUATRO FALTAS, Y POR QUÉ SON UNA SOLA ───────────────────────────────
//
// Las cuatro salen de lo mismo: una petición por fila.
//
//   1. media hora          ← 490 viajes, cada uno reconstruyendo el almacén
//   2. «Too many requests» ← el servidor permite 240 llamadas/minuto, y la
//                            ráfaga de la app lo atravesó. Quien inundó al
//                            servidor fue la app, y el mensaje le pedía a Jose
//                            que esperara
//   3. 40 avisos apilados  ← un fallo por fila es un aviso por fila
//   4. nada que parar      ← 490 peticiones sueltas no tienen un punto donde
//                            cortar que se pueda contar
//
// Arreglar la primera arregla las cuatro. Por eso esta prueba mira sobre todo
// que el camino de la tanda SIGA SIENDO uno solo: el día que alguien vuelva a
// meter un bucle de peticiones aquí, las cuatro vuelven con él.
//
// ── LA IRONÍA, QUE CONVIENE NO PERDER ───────────────────────────────────────
//
// La cola de una en una se escribió **a propósito** en la v11.58, porque veinte
// borrados de golpe daban «System busy». Era la respuesta correcta para veinte.
// Nadie volvió a mirarla cuando apareció «marcar todas», y entonces la
// respuesta correcta para veinte se convirtió en la equivocada para 490. Por
// eso el camino de UNA fila se conserva: ahí sigue siendo mejor.
//
// Uso:  NODE_PATH="$(npm root -g)" node tools/test-borrar-en-tanda.js

const path = require('path');
const vm   = require('vm');
const A    = require(path.join(__dirname, 'andamio.js'));

const GS   = A.fuente('gs');
const HTML = A.fuente('html');
const gs   = A.sinComentarios(GS);
const html = A.sinComentarios(HTML);

let ok = 0; const fails = [];
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + label); }
  else { fails.push(label + (extra === undefined ? '' : ' → ' + JSON.stringify(extra)));
         console.log('  FALLA ' + label + (extra === undefined ? '' : '  → ' + JSON.stringify(extra))); }
}

/* ────────────────────────────────────────────────────────────────────────────
 * 1. EL MOTOR SE EJECUTA, y se lleva lo que debe sin tocar lo demás.
 * ──────────────────────────────────────────────────────────────────────────── */
console.log('\n═══ 1. El motor de la tanda, ejecutado ═══\n');

const K = (function () {
  const ctx = vm.createContext({});
  vm.runInContext(A.constantes(GS, ['AC', 'AC_WIDTH', 'TR', 'TRASH_WIDTH',
                                    'SHEETS', 'MAX_BORRADO_POR_TANDA']), ctx);
  return ctx;
})();

check('el tope por tanda existe y es un número razonable — 490 filas en dos ' +
      'llamadas, no en 490',
  K.MAX_BORRADO_POR_TANDA >= 100 && K.MAX_BORRADO_POR_TANDA <= 1000,
  K.MAX_BORRADO_POR_TANDA);

/* Una hoja de mentira que se comporta como la de verdad en lo que importa:
 * dice cuántas filas tiene, devuelve rangos y acepta escrituras. */
function hojaFalsa(filas) {
  const estado = { filas: filas.map(f => f.slice()), escrituras: 0, max: filas.length + 50 };
  return {
    _estado: estado,
    getLastRow: () => estado.filas.length + 1,
    getMaxRows: () => estado.max,
    /* Desde el 28/10 `borrarFilasEnTanda_` ensancha la hoja antes de leerla
     * —ver test-hoja-estrecha-no-revienta.js—, asi que la hoja de mentira
     * tiene que saber decir su ancho. Se le da el del modelo: lo que aqui se
     * mide es el reparto en trozos, no el ensanche. */
    getMaxColumns: () => K.AC_WIDTH,
    insertColumnsAfter: () => {},
    insertRowsAfter: (a, n) => { estado.max += n; },
    getParent: () => ({}),
    getRange: function (fila, col, nFilas, nCols) {
      return {
        getValues: function () {
          const out = [];
          for (let i = 0; i < nFilas; i++) {
            const f = estado.filas[fila - 2 + i] || [];
            out.push(Array.from({ length: nCols }, (_, c) => f[col - 1 + c] === undefined ? '' : f[col - 1 + c]));
          }
          return out;
        },
        setValues: function (vals) {
          estado.escrituras++;
          vals.forEach((v, i) => { estado.filas[fila - 2 + i] = v.slice(); });
          return this;
        },
        clearContent: function () {
          for (let i = 0; i < nFilas; i++) {
            const idx = fila - 2 + i;
            if (idx < estado.filas.length) estado.filas[idx] = new Array(nCols).fill('');
          }
          return this;
        }
      };
    }
  };
}

function fila(id, cat, nombre, comentario) {
  const r = new Array(K.AC_WIDTH).fill('');
  r[K.AC.CATEGORY] = cat;
  r[K.AC.NAME]     = nombre;
  r[K.AC.MOV_ID]   = id;
  r[K.AC.COMMENTS] = comentario || '';
  return r;
}

function montarMotor(archivo, papelera) {
  const ctx = {
    console: console,
    SHEETS: K.SHEETS, AC: K.AC, AC_WIDTH: K.AC_WIDTH,
    TR: K.TR, TRASH_WIDTH: K.TRASH_WIDTH,
    ensureTrashSheet_: () => papelera,
    ensureArchiveHistorySheet_: () => null,
    textSafeRow_: r => r,
    escribirHojaCompleta_: function (sheet, filas, colCount) {
      sheet._estado.filas = filas.map(f => f.slice());
      sheet._estado.escrituras++;
    }
  };
  return A.montar(ctx, GS, ['borrarFilasEnTanda_'],
    { dobles: ['ensureTrashSheet_', 'ensureArchiveHistorySheet_',
               'textSafeRow_', 'escribirHojaCompleta_'] });
}

const N = 490;
const todas = [];
for (let i = 1; i <= N; i++) todas.push(fila('M' + i, 'WINDOW', 'MAT ' + i));
// Tres que NO se piden: tienen que quedarse donde están.
todas.push(fila('X1', 'WINDOW', 'NO TOCAR 1'));
todas.push(fila('X2', 'WINDOW', 'NO TOCAR 2'));
todas.push(fila('X3', 'WINDOW', 'NO TOCAR 3'));

let motor = null, archivo = null, papelera = null, r1 = null;
try {
  archivo  = hojaFalsa(todas);
  papelera = hojaFalsa([]);
  motor = montarMotor(archivo, papelera);
  motor.SHEETS = Object.assign({}, K.SHEETS);
  // La hoja de archivo la devuelve el `ss` falso.
  const ss = { getSheetByName: () => archivo };
  const quiero = {}; for (let i = 1; i <= N; i++) quiero['M' + i] = 1;
  r1 = motor.borrarFilasEnTanda_(ss, { email: 'jose@ox-glass.com' },
    f => !!quiero[String(f[K.AC.MOV_ID] || '')], K.MAX_BORRADO_POR_TANDA);
} catch (e) {
  check('se pudo montar y correr el motor', false, e.message);
}

if (r1) {
  check('se pudo montar y correr el motor', true);

  check('un trozo se lleva COMO MUCHO el tope, no las 490 de golpe — el techo ' +
        'de seis minutos de Apps Script es real',
    r1.movidas === K.MAX_BORRADO_POR_TANDA, { movidas: r1.movidas, tope: K.MAX_BORRADO_POR_TANDA });

  check('...y DICE que quedan más, en vez de dejar el trabajo a medias en ' +
        'silencio — sin esto, 490 se borrarían «hasta 300» y la pantalla diría ' +
        'que ya está',
    r1.quedanPor > 0, r1);

  /* LA COMPROBACIÓN QUE EVITA EL FALLO QUE YO MISMO ESCRIBÍ Y CORREGÍ.
   * La primera versión devolvía sólo el número, y el navegador quitaba de su
   * lista «los primeros N que pedí» — dando por hecho que el servidor recorre
   * la hoja en el mismo orden en que el navegador puso los ids. No tiene por
   * qué. */
  check('devuelve LOS IDS que se llevó, no sólo cuántos — el navegador no puede ' +
        'adivinar cuáles fueron sin acertar por casualidad',
    Array.isArray(r1.ids) && r1.ids.length === r1.movidas, { ids: (r1.ids || []).length });

  check('...y esos ids están de verdad en la papelera',
    r1.ids.every(id => papelera._estado.filas.some(f => f[K.AC.MOV_ID] === id)));

  check('la papelera guarda quién y cuándo, para poder devolverlas',
    papelera._estado.filas.every(f => f[K.TR.DELETED_BY] === 'jose@ox-glass.com' && !!f[K.TR.DELETED_AT]));

  const quedan = archivo._estado.filas.filter(f => f[K.AC.CATEGORY] || f[K.AC.NAME]);
  check('lo que NO se pidió sigue en la hoja — las tres de «no tocar»',
    ['X1', 'X2', 'X3'].every(id => quedan.some(f => f[K.AC.MOV_ID] === id)));

  check('y la cuenta cuadra: lo que queda + lo que se fue = lo que había',
    quedan.length + r1.movidas === N + 3,
    { quedan: quedan.length, movidas: r1.movidas, habia: N + 3 });

  /* EL VIAJE, QUE ES EL PUNTO DE TODO ESTO. Si esto sube, hemos vuelto al
   * camino de media hora. */
  check('toda la tanda costó UNA lectura y DOS escrituras de hoja, no una por ' +
        'fila — es la diferencia entre media hora y unos segundos',
    archivo._estado.escrituras === 1 && papelera._estado.escrituras === 1,
    { archivo: archivo._estado.escrituras, papelera: papelera._estado.escrituras });

  /* Y EL SEGUNDO TROZO termina el trabajo. */
  const ss2 = { getSheetByName: () => archivo };
  const quiero2 = {}; for (let i = 1; i <= N; i++) quiero2['M' + i] = 1;
  const r2 = motor.borrarFilasEnTanda_(ss2, { email: 'jose@ox-glass.com' },
    f => !!quiero2[String(f[K.AC.MOV_ID] || '')], K.MAX_BORRADO_POR_TANDA);
  check('el segundo trozo termina las 490 y ya no quedan más',
    r1.movidas + r2.movidas === N && r2.quedanPor === 0,
    { primero: r1.movidas, segundo: r2.movidas, quedan: r2.quedanPor });
  check('...o sea: 490 filas en DOS llamadas',
    r1.movidas + r2.movidas === N);
}

/* ────────────────────────────────────────────────────────────────────────────
 * 2. EL NAVEGADOR NO VUELVE AL BUCLE DE PETICIONES.
 * ──────────────────────────────────────────────────────────────────────────── */
console.log('\n═══ 2. Una tanda, no un bucle de peticiones ═══\n');

const borrarSel = A.sinComentarios(A.fnSrc(HTML, 'deleteSelectedMovements') || '');
check('`deleteSelectedMovements` existe', !!borrarSel);
check('con varias marcadas llama a la TANDA, no al borrado fila a fila',
  /_borrarEnTanda\(/.test(borrarSel), borrarSel.slice(-300));
check('...y con UNA sola sigue el camino de siempre, que es mejor para una: ' +
      'quita la fila al pulsar, la devuelve a su sitio si el servidor dice que ' +
      'no, y trae las cifras del almacén',
  /ids\.length <= 1[\s\S]{0,300}_doDeleteMovementRow/.test(borrarSel));

const tanda = A.sinComentarios(A.fnSrc(HTML, '_tandaPaso') || '');
check('`_tandaPaso` existe', !!tanda);
check('manda `deleteMovements` con una LISTA de ids, no uno por llamada',
  /processMovement\('deleteMovements',\s*_h\(\{\s*movIds:/.test(tanda));
check('y quita de la pantalla los ids que DIJO el servidor, no los que esta ' +
      'pantalla supone',
  /res\.removedIds/.test(tanda) && /_quitarMovimientosPorId\(idsFuera\)/.test(tanda));

/* UN BUCLE QUE PIDA LO MISMO PARA SIEMPRE ES PEOR QUE NO TERMINAR. */
check('si el servidor se lleva CERO y quedaban, se termina en vez de insistir ' +
      '— insistir sería un bucle infinito pidiendo lo mismo',
  /hechas === 0 && t\.ids\.length/.test(tanda));

/* ────────────────────────────────────────────────────────────────────────────
 * 3. SE PUEDE PARAR, Y EL FINAL DICE LA VERDAD.
 * ──────────────────────────────────────────────────────────────────────────── */
console.log('\n═══ 3. El botón de parar ═══\n');

check('hay un botón de parar en la línea de progreso', /id="progStop"/.test(HTML));
check('...y nace escondido: sólo se ofrece en los trabajos que de verdad se ' +
      'pueden parar. Un botón que no para nada enseña a no pulsar el que sí',
  /id="progStop"[^>]*style="display:none"/.test(HTML));

const ofrecer = A.sinComentarios(A.fnSrc(HTML, '_progPararOfrecer') || '');
check('`_progPararOfrecer` existe y lo enseña', !!ofrecer && /display\s*=\s*''/.test(ofrecer));
check('...y para el clic ahí, sin dejarlo subir al contenedor — si subiera, ' +
      'esconder el aviso y parar el trabajo parecerían la misma cosa',
  /stopPropagation/.test(ofrecer));

const borrarTanda = A.sinComentarios(A.fnSrc(HTML, '_borrarEnTanda') || '');
check('la tanda ofrece parar al empezar', /_progPararOfrecer\(/.test(borrarTanda));
check('al parar se dice CUÁNTAS se borraron y cuántas quedaron intactas — ' +
      '«se paró» a secas dejaría a alguien sin saber qué tiene',
  /Stopped[\s\S]{0,120}of[\s\S]{0,120}untouched/.test(tanda), tanda.slice(0, 400));

const quitar = A.sinComentarios(A.fnSrc(HTML, '_progPararQuitar') || '');
check('`_progPararQuitar` existe', !!quitar);
check('...y lo llama la línea al esconderse y al terminar, para que no quede ' +
      'enganchado a una tanda que ya no existe',
  /_progPararQuitar\(\)/.test(A.sinComentarios(A.fnSrc(HTML, '_progHide') || '')) &&
  /_progPararQuitar\(\)/.test(A.sinComentarios(A.fnSrc(HTML, '_progFinish') || '')));

/* ────────────────────────────────────────────────────────────────────────────
 * 4. «TOO MANY REQUESTS» ES UN TURNO, NO UN FALLO.
 * ──────────────────────────────────────────────────────────────────────────── */
console.log('\n═══ 4. La cuota deja de perder filas ═══\n');

const ctxBusy = A.montar({ console: console }, HTML, ['_isBusyError'], {});
check('«Too many requests» cuenta como ocupado y se reintenta — así se ' +
      'perdieron las 40 de Jose',
  ctxBusy._isBusyError({ message: 'Too many requests — please wait a moment and try again.' }));
check('...y el de siempre sigue contando',
  ctxBusy._isBusyError({ message: 'SYSTEM_BUSY|something' }));
check('...y un error de verdad NO se reintenta para siempre',
  !ctxBusy._isBusyError({ message: 'Archive sheet not found.' }));

check('el servidor sigue teniendo su freno — no se quita, se deja de ' +
      'disparar: con dos peticiones en vez de 490 no se roza',
  /requireQuota_\('pm'/.test(gs));

/* ────────────────────────────────────────────────────────────────────────────
 * 5. EL MISMO AVISO VEINTE VECES ES UN AVISO.
 * ──────────────────────────────────────────────────────────────────────────── */
console.log('\n═══ 5. Los avisos idénticos no se apilan ═══\n');

const toast = A.sinComentarios(A.fnSrc(HTML, 'showToast') || '');
check('`showToast` reconoce uno igual ya en pantalla', /_toastIgual\(/.test(toast));
check('...y en vez de nacer otro, le pone un contador',
  /toast-veces/.test(toast) && /'\\u00d7 ' \+ n|× ' \+ n/.test(toast) || /toast-veces/.test(toast));
check('...y reinicia su reloj: la cuenta atrás tiene que correr desde la ' +
      'última vez que pasó, no desde la primera',
  /clearTimeout\(ya\._reloj\)/.test(toast));
check('los que llevan BOTÓN quedan fuera: cada uno tiene su acción y su `siNo`, ' +
      'y agruparlos perdería una de las dos',
  /if \(!\(accion && accion\.texto\)\)/.test(toast));

const igual = A.sinComentarios(A.fnSrc(HTML, '_toastIgual') || '');
check('se compara el TEXTO y el TIPO — el mismo texto como aviso y como error ' +
      'son dos cosas distintas',
  /data-tipo/.test(igual) && /data-msg/.test(igual));
check('...y no se agrupa con uno que ya se está yendo',
  /fade-out/.test(igual));

/* ────────────────────────────────────────────────────────────────────────────
 * 6. DESHACER UNA IMPORTACIÓN GRANDE TERMINA DE VERDAD.
 * ──────────────────────────────────────────────────────────────────────────── */
console.log('\n═══ 6. Deshacer una importación grande ═══\n');

const undoGs = A.sinComentarios(A.fnSrc(GS, 'undoImport') || '');
check('deshacer usa el MISMO motor que borrar en tanda, no una copia parecida',
  /borrarFilasEnTanda_/.test(undoGs));
check('...con el mismo tope, así que no puede comerse los seis minutos',
  /MAX_BORRADO_POR_TANDA/.test(undoGs));
check('...y contesta si quedan más',
  /more:\s*res\.quedanPor > 0/.test(undoGs));

const undoHtml = A.sinComentarios(A.fnSrc(HTML, '_undoImport') || '');
check('y el navegador sigue pidiendo hasta que no queden — sin esto, deshacer ' +
      '1.200 filas se quedaba a medias DICIENDO QUE YA ESTABA',
  /res\.more[\s\S]{0,40}vuelta\(\)/.test(undoHtml), undoHtml.slice(0, 300));
/* `\s*` y no un espacio: esta comprobación se puso roja el 29/10 porque las
 * tres sumas se alinearon en columna y «total     +=» dejó de coincidir con
 * «total +=». El código estaba bien. Una prueba que se cae por un espacio
 * enseña a maquillar el código para contentarla, que es justo lo contrario de
 * lo que tiene que hacer. */
check('...y suma el total de todos los trozos, no sólo el último',
  /total\s*\+=/.test(undoHtml));

const delGs = A.sinComentarios(A.fnSrc(GS, 'deleteMovements') || '');
check('borrar en tanda pide el permiso de editar movimientos, como el borrado ' +
      'de una fila',
  /requirePerm_\(auth,\s*'canEditMovements'\)/.test(delGs));
check('...y borra por `movId`, no por número de fila: los números se mueven en ' +
      'cuanto se borra algo por encima',
  /AC\.MOV_ID/.test(delGs) && !/rowIdx/.test(delGs));
check('...bajo el candado del almacén, como todo lo que mueve existencias',
  /withStockLock_/.test(delGs));
check('y avisa a las demás pestañas: saca cientos de filas del almacén de golpe',
  /deleteMovements:\s*true/.test(gs));

if (fails.length) {
  console.error('\nFALLÓ:\n  ' + fails.join('\n  ') + '\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
