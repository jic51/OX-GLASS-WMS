// EL MES DE ARRIBA TIENE QUE SER EL MES DE AHORA.
//
// Jose, 24/10, con una captura de la página que está publicada en internet — la
// misma a la que lleva el aviso de novedades dentro de la app:
//
//   *"¿por qué dice septiembre arriba? ¿Y por qué todo ese párrafo habla de las
//   cosas que se hicieron en el pasado? Ésa es la página que está en internet, a
//   la que me lleva el link del popup al abrir la app. ¿Por qué no está
//   actualizado?"*
//
// Tenía razón. Las veintiocho versiones de octubre estaban todas debajo de un
// encabezado que decía **September 2026**, con un párrafo que resumía el trabajo
// de septiembre. Alguien que abriera la app, pulsara «novedades» y llegara ahí
// leía primero un resumen de hace dos meses.
//
// ── LA CAUSA, Y ES LA DE SIEMPRE ───────────────────────────────────────────
//
// El mes es un `<h2>` escrito a mano. Cada versión nueva se inserta arriba del
// todo — o sea, dentro de la sección que esté primera — y nadie vuelve a mirar
// qué dice su encabezado. Dos cosas que tienen que coincidir sin que nada lo
// obligue: **la fecha en que se publica y el mes bajo el que cae la entrada**.
//
// ── POR QUÉ SE COMPARA CONTRA `.publicado` Y NO CONTRA EL RELOJ ────────────
//
// Contra el reloj de hoy fallaría el día 1 de cada mes aunque todo estuviera
// bien: el primero de noviembre, el changelog diría «Octubre» —correctamente,
// porque nada se ha publicado aún en noviembre— y la prueba se pondría roja sin
// que hubiera nada que arreglar. Un guardia que se pone rojo por el calendario
// es un guardia que se aprende a ignorar.
//
// `landing/.publicado` lo escribe `publish-site.js` con la fecha de la última
// publicación de verdad. Si esa fecha es de octubre, la entrada de más arriba
// tiene que estar bajo «Octubre». Eso no depende de qué día se corra la prueba.
//
// Uso:  node tools/test-mes-del-changelog.js

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

let ok = 0; const fails = [];
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + label); }
  else { fails.push(label + (extra === undefined ? '' : ' → ' + JSON.stringify(extra)));
         console.log('  FALLA ' + label + (extra === undefined ? '' : '  → ' + JSON.stringify(extra))); }
}

/* La fecha de la última publicación de verdad. Se lee del sello, no del reloj:
 * ver la cabecera. */
const sello = {};
fs.readFileSync(path.join(ROOT, 'landing', '.publicado'), 'utf8')
  .split('\n').forEach(function (l) {
    if (l.trim().charAt(0) === '#') return;
    const i = l.indexOf('=');
    if (i > 0) sello[l.slice(0, i).trim()] = l.slice(i + 1).trim();
  });

check('el sello de publicación trae una fecha', /^\d{4}-\d{2}-\d{2}$/.test(sello.fecha || ''),
  sello.fecha);

const MESES = {
  '01': ['January', 'Enero'],   '02': ['February', 'Febrero'],
  '03': ['March', 'Marzo'],     '04': ['April', 'Abril'],
  '05': ['May', 'Mayo'],        '06': ['June', 'Junio'],
  '07': ['July', 'Julio'],      '08': ['August', 'Agosto'],
  '09': ['September', 'Septiembre'], '10': ['October', 'Octubre'],
  '11': ['November', 'Noviembre'],  '12': ['December', 'Diciembre']
};

const anio = (sello.fecha || '').slice(0, 4);
const mm   = (sello.fecha || '').slice(5, 7);

const PAGINAS = [
  { f: 'landing/changelog.html', idioma: 0, nombre: 'la inglesa' },
  { f: 'landing/novedades.html', idioma: 1, nombre: 'la española' }
];

PAGINAS.forEach(function (p) {
  console.log('\n═══ ' + p.f + ' ═══\n');
  const t = fs.readFileSync(path.join(ROOT, p.f), 'utf8');

  const h2 = t.match(/<h2>([^<]+)<\/h2>/g) || [];
  check('tiene encabezados de mes', h2.length > 0, h2.length);

  const primero = (h2[0] || '').replace(/<\/?h2>/g, '').trim();
  const esperado = MESES[mm][p.idioma] + ' ' + anio;
  check('el PRIMER encabezado es el mes de la última publicación (' + esperado + ') — ' +
        'es lo que lee quien llega desde el aviso de la app, y era «September 2026» ' +
        'con veintiocho versiones de octubre debajo',
    primero === esperado, { dice: primero, esperado: esperado });

  /* Y QUE LA ENTRADA MÁS NUEVA ESTÉ DEBAJO DE ÉL, no en otra sección. Sin esto,
   * el encabezado podría estar bien y las entradas haberse colado en la de
   * abajo — el mismo fallo con los papeles cambiados. */
  const iH2 = t.indexOf('<h2>' + primero + '</h2>');
  const iEntrada = t.indexOf('<div class="entry"');
  check('...y la entrada más nueva está debajo de ese encabezado, no en la ' +
        'sección de otro mes',
    iEntrada > iH2 && iEntrada > 0, { encabezado: iH2, entrada: iEntrada });

  /* El párrafo de resumen también es de ese mes. Es el que Jose leyó primero y
   * hablaba de etiquetas térmicas y del reporte de la tarde — trabajo de
   * septiembre. No se puede comprobar que DIGA la verdad, pero sí que no sea
   * literalmente el de la sección de abajo. */
  const subs = t.match(/<p class="sub">[\s\S]*?<\/p>/g) || [];
  check('cada sección de mes tiene su propio resumen, y no hay dos iguales — ' +
        'uno repetido es la señal de que la sección se partió y el texto no',
    subs.length < 2 || new Set(subs.map(function (x) { return x.slice(0, 120); })).size === subs.length,
    subs.length);

  /* Que el número de secciones no se haya desbocado: una por mes, y la app
   * lleva meses, no años. Si esto sube mucho es que algo está creando
   * secciones de más. */
  check('el número de secciones de mes es razonable (' + h2.length + ')',
    h2.length <= 12, h2.length);
});

console.log('\n═══ el aviso de la app lleva aquí ═══\n');

/* LO QUE HACE QUE ESTO IMPORTE. La ventana de novedades de la app enlaza a esta
 * página; por eso una cabecera vieja no es un detalle de una página que nadie
 * mira, es lo primero que ve alguien a quien la app acaba de decir «hay algo
 * nuevo». */
const html = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');
check('la app enlaza a la página de novedades — por eso su cabecera es lo ' +
      'primero que lee alguien a quien la app acaba de avisar',
  /acopio\.net\/(changelog|novedades)\.html/.test(html) ||
  /novedades\.html/.test(html) || /changelog\.html/.test(html));

if (fails.length) {
  console.error('\nFALLÓ:\n  ' + fails.join('\n  ') + '\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
