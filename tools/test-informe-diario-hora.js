// EL CORREO DIARIO TIENE QUE SALIR A SU HORA Y HABLAR DEL DÍA CORRECTO.
//
// Jose, 2026-10-06, con tres capturas: los ajustes decían **4:00 PM**, el correo
// llegaba a las **2:53 AM**, y decía *"movements for 06/10/2026 (no movements)"*
// a las dos de la mañana de ese mismo día — cuando el trabajo no había
// empezado. El del día anterior, a la misma hora, también decía que no había
// movimientos; pero ese día sí los hubo, entre las 7 am y las 4 pm.
//
// ── LO QUE SIGNIFICAN LAS TRES JUNTAS, Y NO LO DICE NINGUNA POR SEPARADO ───
//
// **Los movimientos de un día de trabajo no los informaba nunca ningún correo.**
// El del día 5 salía antes de que ocurrieran; el del día 6 sólo miraba el 6. El
// correo llegaba, se veía bien, y siempre decía que no había pasado nada.
//
// Un informe que miente en silencio es peor que uno que falta: el que falta se
// nota.
//
// ── Y NO ERA LA ZONA HORARIA ───────────────────────────────────────────────
//
// Fue lo primero que supuse y estaba equivocado: el proyecto de Jose está en
// GMT-06:00 Denver, que es la correcta. Eran dos fallos distintos, y esta
// prueba defiende el arreglo de los dos.
//
// Uso:  node tools/test-informe-diario-hora.js

const vm = require('vm');
const A  = require('./andamio.js');
const GS = A.fuente('gs');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

/* Una caja con un reloj que se puede mover a mano. Las fechas se tratan en UTC
 * a propósito: lo que se está probando es la REGLA —de qué día se informa— y no
 * la aritmética de husos de Apps Script, que no es nuestra. */
function caja() {
  const ctx = {
    console, String, Number, Object, Array, Math, Date, parseInt, isFinite,
    Utilities: {
      formatDate: (d, tz, f) => {
        const p = n => String(n).padStart(2, '0');
        if (f === 'yyyy-MM-dd') return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate());
        if (f === 'H') return String(d.getUTCHours());
        return d.toISOString();
      }
    }
  };
  vm.createContext(ctx);
  vm.runInContext(A.levantar(GS, ['diaDelInforme_', 'fechaUS_'], {}), ctx);
  return ctx;
}

const TZ = 'America/Denver';
const EN = (y, m, d, h) => new Date(Date.UTC(y, m - 1, d, h, 0, 0));

/* ═══════════════════════════════════════════════════════════════════════════
   1. DE QUÉ DÍA INFORMA — la regla, en una frase
   ═══════════════════════════════════════════════════════════════════════════
   Un correo de la mañana informa del día que acabó; uno de la tarde, del día
   que está acabando. El corte es el mediodía. */
console.log('\n═══ 1. El día del que habla el correo ═══\n');
{
  const c = caja();

  /* EL CASO DE JOSE, EL QUE DESTAPÓ TODO. Con los ajustes a las 4 de la tarde,
   * el correo del 6 de octubre tiene que hablar del 6 de octubre — con los
   * movimientos de 7 am a 4 pm ya dentro. */
  check('a las 4 PM se informa del día en curso, que es cuando ya está el ' +
        'trabajo del día dentro',
        c.diaDelInforme_(16, EN(2026, 10, 6, 16), TZ) === '2026-10-06');

  /* Y EL FALLO, AL REVÉS. Si el correo sale de madrugada —que es lo que estaba
   * pasando— tiene que hablar del día que ACABÓ, no del que empieza vacío.
   * Ésta es la comprobación que convierte "no movements" en información en vez
   * de en una mentira. */
  check('A LAS 2 AM SE INFORMA DEL DÍA ANTERIOR — informar del día en curso a ' +
        'esa hora es informar de un día que no ha pasado',
        c.diaDelInforme_(2, EN(2026, 10, 6, 2), TZ) === '2026-10-05');

  check('a las 8 PM (el valor por omisión), el día en curso',
        c.diaDelInforme_(20, EN(2026, 10, 6, 20), TZ) === '2026-10-06');
  check('a las 6 AM, el día anterior',
        c.diaDelInforme_(6, EN(2026, 10, 6, 6), TZ) === '2026-10-05');
  check('a medianoche, el día anterior — es el caso extremo de la regla y el ' +
        'que más se equivoca a ojo',
        c.diaDelInforme_(0, EN(2026, 10, 6, 0), TZ) === '2026-10-05');
  check('a las 12 en punto ya cuenta como tarde, y se informa del día en curso',
        c.diaDelInforme_(12, EN(2026, 10, 6, 12), TZ) === '2026-10-06');

  /* El cambio de mes es donde una resta de días hecha a mano se rompe. */
  check('el día 1 a las 2 AM se informa del último día del mes anterior',
        c.diaDelInforme_(2, EN(2026, 11, 1, 2), TZ) === '2026-10-31');
  check('...y el 1 de enero, del 31 de diciembre del año anterior',
        c.diaDelInforme_(2, EN(2027, 1, 1, 2), TZ) === '2026-12-31');
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. LA FECHA, COMO LA ESCRIBE ESTADOS UNIDOS
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 2. La fecha ═══\n');
{
  const c = caja();
  /* Jose: *"la fecha debe estar siempre en formato de EE. UU., la del título y
   * la del mensaje."* El 6 de octubre salía `06/10/2026`, que un lector
   * estadounidense lee como 10 de junio — cuatro meses de diferencia, en el
   * asunto de un correo. */
  check('el 6 de octubre se escribe 10/06/2026, no 06/10/2026',
        c.fechaUS_('2026-10-06') === '10/06/2026', c.fechaUS_('2026-10-06'));
  check('el 31 de diciembre, 12/31/2026', c.fechaUS_('2026-12-31') === '12/31/2026');
  check('el 1 de febrero conserva los ceros: 02/01/2026',
        c.fechaUS_('2026-02-01') === '02/01/2026');
  check('algo que no es una fecha no revienta ni inventa una',
        c.fechaUS_('') === '' && c.fechaUS_('ayer') === 'ayer');
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. EL DISPARADOR: CADA HORA, Y LA HORA LA DECIDE EL CÓDIGO
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 3. El disparador ═══\n');
{
  const ins = A.fnSrc(GS, 'ensureDailyReportTrigger_') || '';
  check('la prueba está mirando la función de verdad', ins.length > 500, ins.length);

  /* EL FALLO DE FONDO, Y POR QUÉ ESTE CAMBIO.
   *
   * La versión vieja guardaba en una propiedad la hora a la que había creado el
   * disparador y la próxima vez comparaba LA PROPIEDAD con los ajustes. Pero la
   * propiedad no es el disparador: es una nota SOBRE él, escrita aparte, y
   * **el objeto Trigger de Apps Script no sabe decir a qué hora corre**, así
   * que la nota no se puede verificar ni queriendo. En cuanto se separaron, la
   * nota decía 16, el disparador salía a las 2, y esta función miraba la nota y
   * decía "ya está bien".
   *
   * Dos cosas que tienen que coincidir sin que nada lo obligue. Otra vez. */
  check('ya NO se guarda la hora del disparador en una propiedad — era una nota ' +
        'sobre algo que no se puede comprobar, y se separó de la realidad',
        !/setProperty\('DAILY_REPORT_TRIGGER_HOUR'/.test(ins), ins.match(/DAILY_REPORT_TRIGGER_HOUR/g));
  check('...y la vieja se borra, para que nadie la lea dentro de un año creyendo ' +
        'que dice algo', /deleteProperty\('DAILY_REPORT_TRIGGER_HOUR'\)/.test(ins));
  check('el disparador corre CADA HORA', /everyHours\(1\)/.test(ins));
  check('...y ya no se le pide una hora concreta, que es lo que no se podía ' +
        'comprobar', !/atHour\(/.test(ins));
  check('apagarlo sigue borrando el disparador — un informe apagado que sigue ' +
        'despertando cada hora es un gasto que nadie pidió',
        /if \(!cfg\.enabled\)[\s\S]{0,200}deleteTrigger\(found\)/.test(ins));
}

{
  const run = A.fnSrc(GS, 'runDailyReport_') || '';
  check('la prueba está mirando runDailyReport_ de verdad', run.length > 500, run.length);

  check('el que corre cada hora comprueba si le toca', /horaAhora !== cfg\.hour/.test(run));
  check('...leyendo la hora en la zona horaria de la instalación, no en UTC',
        /formatDate\(now, tz, 'H'\)/.test(run));
  /* Un disparador de Apps Script puede ejecutarse dos veces: se reintenta si el
   * primer intento falla a medias. Dos correos idénticos del mismo día hacen
   * dudar de los dos. */
  check('y se manda UNA SOLA VEZ al día, aunque el disparador se repita',
        /DAILY_REPORT_LAST/.test(run) && /already-sent/.test(run));
  check('el día del que informa sale de la regla, no de "hoy"',
        /diaDelInforme_\(cfg\.hour, now, tz\)/.test(run));
  check('y la fecha que se imprime pasa por el formato de EE. UU.',
        /fechaUS_\(dia\)/.test(run));

  /* El botón "Send one now" NO pasa por nada de esto: quien lo pulsa ya ha
   * decidido que lo quiere ahora. Si se le aplicara la comprobación de hora, el
   * botón no haría nada 23 horas al día y parecería roto. */
  const ahora = A.fnSrc(GS, 'sendDailyReportNow') || '';
  check('el botón de "mandar uno ahora" NO comprueba la hora — si no, no haría ' +
        'nada 23 horas al día y parecería roto',
        /runDailyReport_\(\)/.test(ahora) && !/runDailyReport_\(true\)/.test(ahora));

  const trg = A.fnSrc(GS, 'dailyReportTrigger') || '';
  check('...y el del reloj sí', /runDailyReport_\(true\)/.test(trg));
}

{
  /* El filtro recibe el día de fuera. Mientras lo calculara él mismo, no había
   * forma de pedirle el día de ayer ni de probarlo. */
  const mov = A.fnSrc(GS, 'dailyReportMovements_') || '';
  check('el filtro de movimientos recibe el día en vez de adivinarlo',
        /function dailyReportMovements_\(ss, dia\)/.test(mov));
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. LAS CABECERAS QUE NADIE LLAMABA
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 4. Las columnas sin nombre ═══\n');
{
  /* Jose, con dos capturas: RESERVATIONS y AUDIT_LOG sin nombres de columna.
   *
   * Lo que lo arregla estaba escrito desde hacía meses — y no lo llamaba nadie
   * salvo el asistente de instalación, así que una instalación que ya existía
   * no lo recibía nunca. Cuarto caso del mismo patrón: una protección escrita y
   * nunca ejecutada. */
  const chk = A.fnSrc(GS, 'menuCheckInstallation') || '';
  check('"Check installation" repara las hojas y sus cabeceras',
        /ensureCoreSheets_\(/.test(chk));
  check('...y DICE lo que reparó — un arreglo que ocurre y nadie ve es un ' +
        'arreglo que nadie sabe que necesitaba', /Column names filled in/.test(chk));
  check('...sin poder tumbar el chequeo entero si falla',
        /catch \(eHojas\)/.test(chk));

  const ens = A.fnSrc(GS, 'ensureCoreSheets_') || '';
  check('ensureCoreSheets_ devuelve lo creado Y lo reparado — una instalación de ' +
        'meses no crea ninguna hoja y sí recupera nombres de columna',
        /return \{ created: created, repaired: repaired \}/.test(ens));
  check('y sigue sin tocar una cabecera que ya tenga texto',
        /if \(String\(fila\[i\] \|\| ''\)\.trim\(\) !== ''\) continue;/
          .test(A.fnSrc(GS, 'fillMissingHeaders_') || ''));
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones\n');
process.exit(fail ? 1 : 0);
