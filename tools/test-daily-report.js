// EL REPORTE DIARIO — la hora que un admin puede cambiar, y el día que parte.
//
// Jose pidió un reporte nocturno de lo que entró y salió, con la hora
// modificable por un admin. Esa última parte es la que tiene filo, y no se ve
// leyendo el código: **un disparador de Apps Script no se puede editar.** Para
// cambiarle la hora hay que borrarlo y crear otro.
//
// Los otros tres disparadores de la app hacen esto:
//
//     for (…) if (t.getHandlerFunction() === 'x') return;   // ya existe, listo
//
// que es correcto para ellos, porque su hora está escrita a mano y no cambia
// nunca. Copiar ese patrón aquí habría producido el peor fallo posible de esta
// función: el admin cambia la hora en Ajustes, la pantalla dice 18:00, el
// disparador sigue a las 20:00, y **nadie sospecha de los ajustes** — porque
// los ajustes muestran exactamente lo que se guardó.
//
// Así que esto no lee el código: lo EJECUTA, con dobles de ScriptApp y de
// PropertiesService, y comprueba qué disparadores quedan vivos.
//
// El segundo filo es la fecha. "Los movimientos de hoy" se decide comparando la
// fecha LOCAL formateada, no la UTC. En Utah (UTC−6/−7) comparar en UTC parte el
// día a media tarde: todo lo registrado después de las 5 o 6 cae ya en el día
// siguiente — y el reporte se manda justo a esa hora, así que habría llegado
// sistemáticamente incompleto, todos los días, sin error visible en ninguna
// parte. Aquí se prueba con una hora que cae del otro lado de esa raya.
//
// Uso:  node tools/test-daily-report.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'Code_v3_fixed.gs'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

// Saca una función entera por nombre, contando llaves — los cuerpos aquí traen
// llaves dentro de cadenas y de expresiones regulares, así que una regex no
// sirve.
function fn(name) {
  const start = SRC.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('no encontrada: ' + name);
  let depth = 0, i = SRC.indexOf('{', start);
  for (let j = i; j < SRC.length; j++) {
    if (SRC[j] === '{') depth++;
    else if (SRC[j] === '}') { depth--; if (depth === 0) return SRC.slice(start, j + 1); }
  }
  throw new Error('sin cerrar: ' + name);
}

function constant(name) {
  const m = new RegExp('^var ' + name + ' = [^;]+;', 'm').exec(SRC);
  if (!m) throw new Error('no encontrada la constante: ' + name);
  return m[0];
}

// ── Los dobles ──────────────────────────────────────────────────────────────
function makeSandbox(props, triggers) {
  const P = Object.assign({}, props);
  const T = triggers.slice();
  const sandbox = {
    console,
    _props: P,
    _triggers: T,
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: k => (k in P ? P[k] : null),
        setProperty: (k, v) => { P[k] = String(v); },
        deleteProperty: k => { delete P[k]; }
      })
    },
    ScriptApp: {
      getProjectTriggers: () => T.map(t => ({ getHandlerFunction: () => t.fn, _t: t })),
      deleteTrigger: h => { const i = T.indexOf(h._t); if (i >= 0) T.splice(i, 1); },
      newTrigger: name => {
        const spec = { fn: name, hour: null };
        const api = {
          timeBased: () => api,
          everyDays: () => api,
          atHour: h => {
            // Apps Script rechaza una hora fuera de 0–23. Se imita, porque el
            // punto de la validación en dailyReportSettings_ es no llegar aquí
            // con basura y quedarse sin disparador.
            if (!Number.isInteger(h) || h < 0 || h > 23) throw new Error('bad hour: ' + h);
            spec.hour = h; return api;
          },
          create: () => { T.push(spec); return spec; }
        };
        return api;
      }
    },
    // Sólo lo que usan las funciones bajo prueba.
    Session:   { getScriptTimeZone: () => 'America/Denver' },
    Utilities: {
      formatDate: (d, tz, fmt) => {
        // Suficiente para 'yyyy-MM-dd', que es lo único que se compara.
        const s = new Intl.DateTimeFormat('en-CA', {
          timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(d);
        if (fmt === 'yyyy-MM-dd') return s;
        const [y, m, dd] = s.split('-');
        return fmt === 'dd/MM/yyyy' ? `${dd}/${m}/${y}` : s;
      }
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(
    constant('DAILY_REPORT_DEFAULT_HOUR') + '\n' +
    fn('dailyReportSettings_') + '\n' +
    fn('dailyReportRecipients_') + '\n' +
    fn('ensureDailyReportTrigger_'), sandbox);
  return sandbox;
}

// ── 1. La hora que cambia ───────────────────────────────────────────────────
console.log('\n═══ cambiar la hora cambia el disparador de verdad ═══\n');
{
  // Encendido a las 20, sin nada instalado.
  let s = makeSandbox({ DAILY_REPORT_ENABLED: 'true', DAILY_REPORT_HOUR: '20' }, []);
  let r = vm.runInContext('ensureDailyReportTrigger_()', s);
  check('se instala cuando está encendido y no había ninguno', r === 'installed');
  check('...a la hora guardada',
    s._triggers.length === 1 && s._triggers[0].hour === 20);

  // Correr otra vez sin cambiar nada no debe duplicarlo.
  r = vm.runInContext('ensureDailyReportTrigger_()', s);
  check('correrlo otra vez no lo duplica', r === 'unchanged' && s._triggers.length === 1);

  // EL CASO QUE IMPORTA: el admin cambia la hora.
  s._props.DAILY_REPORT_HOUR = '6';
  r = vm.runInContext('ensureDailyReportTrigger_()', s);
  check('cambiar la hora REHACE el disparador — no basta con que exista uno',
    r === 'rescheduled');
  check('...y el vivo queda a la hora nueva, uno solo',
    s._triggers.length === 1 && s._triggers[0].hour === 6);

  // Apagarlo lo quita. Un disparador vivo con la función apagada mandaría
  // correo igual, porque runDailyReport_ es lo único que mira el interruptor.
  s._props.DAILY_REPORT_ENABLED = 'false';
  r = vm.runInContext('ensureDailyReportTrigger_()', s);
  check('apagarlo borra el disparador, no sólo el interruptor',
    r === 'off' && s._triggers.length === 0);
  check('...y olvida la hora instalada, para que volver a encenderlo lo cree',
    !('DAILY_REPORT_TRIGGER_HOUR' in s._props));

  s._props.DAILY_REPORT_ENABLED = 'true';
  r = vm.runInContext('ensureDailyReportTrigger_()', s);
  check('volver a encenderlo lo instala otra vez', r === 'installed' && s._triggers.length === 1);
}

// ── 2. Una hora imposible no deja la instalación sin reporte ────────────────
console.log('\n═══ una hora inválida no rompe nada ═══\n');
{
  ['25', '-1', '', 'ocho', 'null'].forEach(bad => {
    const s = makeSandbox({ DAILY_REPORT_ENABLED: 'true', DAILY_REPORT_HOUR: bad }, []);
    let threw = false, hour = null;
    try { vm.runInContext('ensureDailyReportTrigger_()', s); hour = s._triggers[0].hour; }
    catch (e) { threw = true; }
    check('DAILY_REPORT_HOUR = ' + JSON.stringify(bad) +
          ' cae a la hora por omisión en vez de lanzar', !threw && hour === 20);
  });
}

// ── 3. Quién lo recibe ──────────────────────────────────────────────────────
console.log('\n═══ los destinatarios ═══\n');
{
  const R = props => vm.runInContext('dailyReportRecipients_()', makeSandbox(props, []));

  check('el admin que lo configuró va primero',
    R({ DAILY_REPORT_OWNER: 'jefe@ox.com', DAILY_REPORT_TO: 'a@ox.com' })[0] === 'jefe@ox.com');

  check('la lista añadida se suma',
    R({ DAILY_REPORT_OWNER: 'jefe@ox.com', DAILY_REPORT_TO: 'a@ox.com, b@ox.com' }).length === 3);

  // Un admin que se escribe a sí mismo en la lista no debe recibirlo dos veces.
  check('nadie lo recibe dos veces',
    R({ DAILY_REPORT_OWNER: 'jefe@ox.com', DAILY_REPORT_TO: 'JEFE@ox.com, a@ox.com' }).length === 2);

  check('comas, punto y coma y espacios separan igual',
    R({ DAILY_REPORT_TO: 'a@ox.com; b@ox.com  c@ox.com' }).length === 3);

  check('lo que no es una dirección se descarta',
    R({ DAILY_REPORT_TO: 'a@ox.com, ,  , basura, b@ox.com' }).length === 2);

  check('sin nadie configurado la lista sale vacía — y runDailyReport_ lo mira ' +
        'antes de intentar mandar', R({}).length === 0);
}

// ── 4. Dónde parte el día ───────────────────────────────────────────────────
console.log('\n═══ "hoy" es hoy en la bodega, no en UTC ═══\n');
{
  // 31/08/2026 a las 19:00 en Denver son las 01:00 UTC del 1/09. En UTC ese
  // movimiento pertenece a mañana; para quien lo registró, a hoy.
  const local = (d, tz) => new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  const tarde = new Date('2026-09-01T01:00:00Z');

  check('el caso existe: 19:00 en Denver ya es otro día en UTC',
    local(tarde, 'America/Denver') === '2026-08-31' &&
    local(tarde, 'UTC') === '2026-09-01');

  // Y que el código sea el que compara en local. Esto sí es lectura de código:
  // la comparación vive dentro de un recorrido de hoja que no vale la pena
  // simular entero, pero SÍ vale la pena afirmar que la zona entra en juego.
  const body = fn('dailyReportMovements_');
  // El primer intento de esta aserción usaba /formatDate\([^)]*tz/ y falló
  // sobre código correcto: [^)]* se corta en el paréntesis de `new Date()`,
  // así que nunca llegaba a ver el `tz` que venía después. La prueba estaba
  // mal, no el código — y una aserción que falla sobre lo bueno se "arregla"
  // borrándola, que es cómo se pierde una revisión que sí valía.
  check('dailyReportMovements_ formatea con la zona de la instalación en ambos ' +
        'lados de la comparación',
    /getScriptTimeZone\(\)/.test(body) &&
    (body.match(/formatDate\([\s\S]*?,\s*tz\s*,/g) || []).length >= 2);
  check('...y no compara con toISOString(), que es UTC y habría partido el día ' +
        'a media tarde', !/toISOString/.test(body));
}

// ── 5. El día tranquilo ─────────────────────────────────────────────────────
console.log('\n═══ un día sin movimientos ═══\n');
{
  const run  = fn('runDailyReport_');
  const html = fn('dailyReportHtml_');

  // Jose: "mandar 'hoy no hubo movimientos' es información; esto es más
  // profesional." Y hay una segunda razón: el silencio de un día tranquilo y
  // el de un disparador caído se ven idénticos.
  check('runDailyReport_ no se salta el envío cuando no hubo movimientos — ' +
        'sólo se detiene si está apagado o no hay a quién mandarlo',
    !/movs\.length\s*(===?\s*0|<\s*1)\s*\)\s*return/.test(run) &&
    /if \(!cfg\.enabled\) return/.test(run) &&
    /if \(!to\.length\) return/.test(run));
  check('el correo de un día vacío lo dice con palabras',
    /no se registró ningún movimiento/i.test(html));
  check('...y explica por qué llega igual, para que el primero no parezca un ' +
        'error y el segundo no se archive sin leer',
    /a propósito/i.test(html));
  check('el asunto avisa desde la bandeja de entrada, sin abrirlo',
    /\(sin movimientos\)/.test(run));
}

// ── 6. La puerta ────────────────────────────────────────────────────────────
console.log('\n═══ el manejador es un global público, y por eso una puerta ═══\n');
{
  const t = fn('dailyReportTrigger');
  check('dailyReportTrigger exige contexto de dueño — un disparador programado ' +
        'pasa, la llamada de otra cuenta con la URL no',
    /requireOwnerContext_\(\)/.test(t));
  check('...y se traga el fallo en vez de mandar un aviso de error cada noche',
    /catch \(e\)/.test(t) && /Logger\.log/.test(t));

  ['getDailyReportSettings', 'saveDailyReportSettings', 'sendDailyReportNow'].forEach(n => {
    check(n + ' exige ADMIN', /requireAuth_\('ADMIN'\)/.test(fn(n)));
  });
}

// ── 7. La pantalla ──────────────────────────────────────────────────────────
console.log('\n═══ y se puede encender desde Ajustes ═══\n');
{
  // Un ajuste sin pantalla es un ajuste que no existe, por bien escrito que
  // esté el servidor. Esto comprueba que las tres funciones del servidor tienen
  // quién las llame y que el panel se dibuja al abrir la pestaña.
  const HTML = fs.readFileSync(path.join(__dirname, '..', 'Index_v3_fixed.html'), 'utf8');
  const GS   = SRC;

  check('la pestaña System dibuja el panel al abrirse',
    /_loadDailyReport\(\);/.test(HTML) &&
    /id="dailyReportBox"/.test(HTML));

  // ESTA COMPROBACIÓN ESTABA MAL ESCRITA Y CONGELÓ UN FALLO REAL.
  //
  // Pedía /\.nombre\(/, o sea la llamada DIRECTA google.script.run.nombre(),
  // y pasaba en verde — porque así estaba escrito. Pero processMovement es
  // donde el token de sesión se convierte en _verifiedAuth, así que las tres
  // llegaban al servidor sin autenticar y requireAuth_ contestaba en rojo
  // "Not authenticated. Please sign in and use the app from its own page."
  // dentro de un panel al que sólo se llega estando autenticado. Jose lo
  // fotografió; la prueba llevaba dos versiones diciendo que estaba bien.
  //
  // Es exactamente el mismo error que la aserción copiada de _auth. Una
  // comprobación escrita mirando el código que ya existe no comprueba nada:
  // repite lo que el código dice de sí mismo.
  //
  // Ahora exige lo contrario, y en dos mitades: que la acción viaje por
  // processMovement, y que NO quede ninguna llamada directa. La segunda es la
  // que habría atrapado esto.
  const RPC = ['getDailyReportSettings', 'saveDailyReportSettings', 'sendDailyReportNow'];
  RPC.forEach(n => {
    check('la pantalla pide ' + n + ' por processMovement, que es donde va el token',
      new RegExp("processMovement\\('" + n + "'").test(HTML));
    check('...y no queda ninguna llamada directa google.script.run.' + n + '()',
      !new RegExp("\\.\\s*" + n + "\\s*\\(").test(HTML));
    check('...y el servidor la despacha', new RegExp("action === '" + n + "'").test(GS));
  });

  check('el panel ofrece las 24 horas, no una lista corta que obligue a ' +
        'conformarse', /for \(var h = 0; h < 24; h\+\+\)/.test(HTML));

  // El detalle que importa: guardar redibuja con lo que contestó el SERVIDOR.
  // Si reprogramar el disparador fallara, dibujar desde el formulario dejaría
  // el panel mostrando la hora tecleada mientras el correo sigue llegando a la
  // vieja — y el panel es el único sitio donde alguien miraría.
  const save = /function _saveDailyReport\(\)\{?[\s\S]*?\n\}/.exec(HTML)[0];
  check('guardar redibuja con la respuesta del servidor, no con el formulario',
    /res\.settings/.test(save) && /_drawDailyReport\(res\.settings\)/.test(save));
  check('...y si el servidor no devolviera ajustes, los vuelve a pedir en vez ' +
        'de dejar el panel mintiendo', /_loadDailyReport\(\)/.test(save));

  // "Send one now" existe para no tener que esperar a la noche para saber si
  // quedó bien configurado.
  check('hay un botón para mandar uno ahora y comprobarlo',
    /id="btnDrTest"/.test(HTML) && /_sendDailyReportNow\(\)/.test(HTML));

  // La lista de destinatarios se imprime de verdad.
  check('el panel imprime a quién le llega, en vez de dejarlo a la imaginación',
    /Goes to: /.test(HTML));
}

console.log('\n' + '─'.repeat(72));
console.log('Los otros tres disparadores salen temprano al encontrar uno instalado.');
console.log('Éste compara además la HORA, porque la suya la elige un admin — y un');
console.log('disparador con la hora vieja hace que Ajustes diga una cosa y la');
console.log('bandeja de entrada haga otra, sin nada que delate cuál miente.');
console.log('─'.repeat(72));

console.log('\ndaily report: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
