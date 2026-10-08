// UN NÚMERO QUE NADIE COMPARA NO VIGILA NADA.
//
// Jose, 2026-10-07: *"en la DEMO el backup se paró desde el día 1 de octubre."*
// Se enteró SEIS DÍAS DESPUÉS, y de casualidad, porque fue a mirar la lista por
// otra cosa.
//
// Y lo que más duele: la pantalla YA TENÍA LA RESPUESTA. `getBackupStatus`
// devolvía la fecha del último respaldo, la enseñaba, y debajo la lista entera.
// Lo que no hacía nadie era RESTARLE HOY.
//
// ── POR QUÉ ÉSTE ES EL PEOR MODO DE FALLO QUE HAY ─────────────────────────
//
// Todo se ve normal. El interruptor en verde, la lista llena de respaldos, el
// último con su fecha y su enlace que abre. Sólo que es de la semana pasada.
// Nadie se entera hasta el día que necesita restaurar — el único día en que ya
// no se puede arreglar.
//
// Un sistema de respaldo que falla en silencio es PEOR que no tener ninguno,
// porque el que no tiene ninguno lo sabe.
//
// ── LAS DOS FORMAS DE EQUIVOCARSE, Y LAS DOS IMPORTAN ─────────────────────
//
//   · callarse cuando está parado  → es el fallo de arriba, el caro.
//   · gritar cuando no pasa nada   → la alarma se aprende a ignorar, y
//     entonces no sirve el día que importa. Por eso NO salta a las 24 horas
//     (el trabajo corre de noche y un retraso normal de Google no es una
//     avería) y NO salta con el respaldo apagado a propósito.
//
// Uso:  node tools/test-respaldo-parado.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const GS   = fs.readFileSync(path.join(ROOT, 'Code_v3_fixed.gs'), 'utf8');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

function fnSrc(src, name) {
  const start = src.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('no está: ' + name);
  let depth = 0;
  for (let i = src.indexOf('{', start); i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  throw new Error('llaves sin cerrar en ' + name);
}

const HORA = 3600000;
function estado(horasAtras, encendido) {
  const props = {};
  if (horasAtras !== null) {
    props.LAST_BACKUP_AT   = new Date(Date.now() - horasAtras * HORA).toISOString();
    props.LAST_BACKUP_NAME = 'Copia';
    props.LAST_BACKUP_FILE_ID = 'ID123';
  }
  const sandbox = {
    console, Date,
    requireAuth_: () => ({ email: 'jefe@ox-glass.com', role: 'ADMIN' }),
    PropertiesService: { getScriptProperties: () => ({
      getProperty: k => (k in props ? props[k] : null),
      setProperty: (k, v) => { props[k] = v; }
    })},
    BACKUP_RETENTION_DAYS: 30,
    backupEnabled_: () => encendido,
    backupFolderName_: () => 'Acopio_Backups',
    _findMostRecentBackup_: () => null,
    listBackups_: () => [],
    Logger: { log: () => {} }
  };
  vm.createContext(sandbox);
  vm.runInContext(fnSrc(GS, 'getBackupStatus'), sandbox);
  return sandbox.getBackupStatus();
}

console.log('\n═══ 1. Parado se dice. Es lo único que faltaba ═══\n');
{
  // El caso exacto de Jose: seis días.
  const st = estado(24 * 6, true);
  check('seis días sin respaldo, estando encendido → SE AVISA. Es el caso medido en la DEMO ' +
        'el 07/10', st.backupStalled === true, st);
  check('...y se devuelven las horas, para poder decir cuántos días en pantalla',
    st.hoursSinceBackup >= 143 && st.hoursSinceBackup <= 145, st.hoursSinceBackup);
}
{
  const st = estado(24 * 40, true);
  check('cuarenta días tampoco pasan desapercibidos', st.backupStalled === true);
}

console.log('\n═══ 2. Y callado cuando no pasa nada, que cuesta igual de caro ═══\n');
{
  const st = estado(10, true);
  check('un respaldo de esta madrugada NO avisa', st.backupStalled === false, st.hoursSinceBackup);
}
{
  /* 36 horas y no 24, a propósito. El trabajo corre de noche: con una ventana
   * de un día justo, cualquier retraso normal de Google sería una alarma. Lo
   * que se persigue es "lleva días sin correr", no "hoy llegó tarde". */
  const st = estado(30, true);
  check('treinta horas todavía no — el trabajo es nocturno y un retraso de Google no es ' +
        'una avería; una alarma que salta sin motivo se aprende a ignorar',
    st.backupStalled === false, st.hoursSinceBackup);
}
{
  const st = estado(24 * 9, false);
  check('APAGADO a propósito no es un fallo — decirle "llevas 9 días sin respaldo" a quien ' +
        'lo apagó él mismo es exactamente el ruido que vacía de sentido a los avisos',
    st.backupStalled === false, st);
}

console.log('\n═══ 3. "Nunca ha corrido" es otra cosa y merece otra frase ═══\n');
{
  const st = estado(null, true);
  check('encendido y sin un solo respaldo → se dice, y NO como si se hubiera parado: aquí ' +
        'no hay nada que restaurar todavía',
    st.backupNeverRan === true && st.backupStalled === false, st);
  check('...y las horas son null, no cero — cero querría decir "hace un momento"',
    st.hoursSinceBackup === null, st.hoursSinceBackup);
}
{
  const st = estado(null, false);
  check('apagado y sin respaldos: ni una cosa ni la otra',
    st.backupNeverRan === false && st.backupStalled === false);
}

console.log('\n═══ 4. Y la pantalla lo enseña donde se lee ═══\n');
{
  const dibujo = fnSrc(HTML, '_drawBackupBox');
  check('la caja mira backupStalled', /st\.backupStalled/.test(dibujo));
  check('...y backupNeverRan', /st\.backupNeverRan/.test(dibujo));
  check('...y el aviso va ARRIBA DEL TODO, antes del interruptor — cuando pasa, es lo ' +
        'único que hay que leer',
    /box\.innerHTML\s*=\s*\n?\s*alarmaHtml/.test(dibujo) ||
    /innerHTML =[\s\S]{0,40}alarmaHtml \+/.test(dibujo), dibujo.slice(dibujo.indexOf('box.innerHTML'), dibujo.indexOf('box.innerHTML') + 120));
  check('...y dice QUÉ HACER, no sólo que algo va mal',
    /Back up now/.test(dibujo) && /authoris/i.test(dibujo));
  /* Que el texto del aviso NO viva aquí dentro como literal suelto sería mejor,
   * pero lo que no puede faltar es que nombre la causa más común. Jose perdió
   * seis días justamente por no saber por dónde empezar a mirar. */
  check('...y nombra la causa más frecuente, que es la autorización, en vez de dejar a ' +
        'alguien adivinando', /Apps Script/.test(dibujo));
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones\n');
process.exit(fail ? 1 : 0);
