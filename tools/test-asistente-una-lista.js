// EL ASISTENTE: UNA SOLA LISTA, Y UN REPETIDO QUE SE DICE.
//
// W-01, W-02 y W-03. Jose, 9/11, con tres capturas de la instalación de la
// panadería — que es exactamente el momento en que un cliente nuevo decide si
// esto le sirve.
//
// ── POR QUÉ ESTA PRUEBA EXISTE, Y NO ES POR LOS TRES ARREGLOS ──────────────
//
// El asistente está escrito DOS VECES: en `SetupWizard.html`, que corre dentro
// del Sheet antes de que exista app desplegada, y en `Index_v3_fixed.html`,
// que corre cuando alguien despliega a mano y entra por la web. La cabecera de
// `SetupWizard.html` lo dice y argumenta por qué: compartir el código
// necesitaría plantillas de HtmlService, y eso complica el pegado manual.
//
// El trato es defendible. Lo que no es defendible es dejarlo suelto, porque es
// la definición del fallo que este proyecto repite: **dos cosas que tienen que
// coincidir sin que nada lo obligue**. Y la prueba de que no estaba sostenido
// es W-03: las DOS copias tenían el mismo fallo, palabra por palabra, y nadie
// lo vio en ninguna de las dos hasta que Jose lo encontró a mano.
//
// Así que esto no comprueba tres arreglos: comprueba que **las dos copias se
// comportan igual**, ejecutando la misma lista de casos contra cada una.
//
// Uso:  node tools/test-asistente-una-lista.js

const fs   = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const WIZ  = fs.readFileSync(path.join(RAIZ, 'SetupWizard.html'), 'utf8');
const APP  = fs.readFileSync(path.join(RAIZ, 'Index_v3_fixed.html'), 'utf8');

let ok = 0;
const fallos = [];
function check(etiqueta, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + etiqueta); return; }
  fallos.push(etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
  console.log('  ✗    ' + etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
}
function fnSrc(src, nombre) {
  const ini = src.indexOf('function ' + nombre + '(');
  if (ini === -1) return null;
  let d = 0;
  for (let j = src.indexOf('{', ini); j < src.length; j++) {
    if (src[j] === '{') d++;
    else if (src[j] === '}') { d--; if (d === 0) return src.slice(ini, j + 1); }
  }
  return null;
}

/* Las dos copias, con los nombres que usa cada una. Todo lo demás de esta
 * prueba recorre esta tabla, así que añadir una tercera copia —ojalá no—
 * sería añadir una fila. */
const COPIAS = [
  { quien: 'SetupWizard.html', src: WIZ, estado: 'W',
    commit: 'commitChip', dibuja: 'dibujar', add: 'addEmpty', purga: 'purgaVacias',
    norm: '_normaliza', choca: '_choca', parpadea: '_parpadea',
    lee: '_lee', pone: '_pone', caja: '_cajaDe', uno: 'UNO' },
  { quien: 'la copia de Index', src: APP, estado: '_wiz',
    commit: '_wizCommit', dibuja: '_wizDibuja', add: '_wizAddEmpty', purga: '_wizPurga',
    norm: '_wizNorm', choca: '_wizChoca', parpadea: '_wizParpadea',
    lee: '_wizLee', pone: '_wizPone', caja: '_wizCaja', uno: 'WIZ_UNO' }
];

console.log('\n═══ 1 · W-03 · UN REPETIDO NO SE BORRA EN SILENCIO ═══\n');

/* EL FALLO, TAL CUAL ESTABA EN LAS DOS:
 *
 *     if (!W.locations.some(x => x.name === v)) W.locations.push(...);
 *     inp.value = '';          // ← esto se ejecutaba SIEMPRE
 *
 * La comprobación protegía el dato bien. Lo que estaba mal es que después
 * limpiaba la caja pasara lo que pasara, así que desde fuera no se distinguía
 * de «se tragó lo que escribí» — la peor forma de acertar: el dato está bien y
 * la persona cree que la app está rota.
 *
 * Esto EJECUTA la función con una lista que ya tiene el nombre dentro. */
COPIAS.forEach(c => {
  const avisos = [];
  const encendidas = [];
  const inp = { value: '', size: 0, blur(){} };

  const ctx = {
    String, Math, setTimeout: () => {},
    document: { getElementById: () => null },
    showToast: (m) => avisos.push(m),
    _err: (m) => { if (m) avisos.push(m); },
    _escAttr: (t) => String(t),
    _he: (t) => String(t)
  };
  // El estado del asistente, con dos ubicaciones ya puestas.
  const estado = { categories: [], suppliers: [], projects: [],
                   locations: [{ name:'A1A', type:'RACK' }, { name:'B2B', type:'RACK' }] };

  const vm = require('vm');
  const caja = vm.createContext(ctx);
  const nombres = [c.lee, c.pone, c.caja, c.norm, c.choca, c.parpadea, c.commit, c.purga];
  check(c.quien + ': las ocho piezas del mecanismo existen',
    nombres.every(n => fnSrc(c.src, n)), nombres.filter(n => !fnSrc(c.src, n)));
  // La tabla de nombres en singular es una constante, no una función: se
  // levanta por separado o el aviso saldría sin nombrar qué es lo repetido.
  const tabla = (c.src.match(new RegExp('var ' + c.uno + ' = \\{[^}]*\\};')) || [''])[0];
  check(c.quien + ': ...y la tabla de nombres en singular, para el aviso', !!tabla);
  const codigo = tabla + '\n' + nombres.map(n => fnSrc(c.src, n)).filter(Boolean).join('\n');
  const varEstado = c.estado;
  vm.runInContext('var ' + varEstado + ' = ' + JSON.stringify(estado) + ';\n' + codigo, caja);
  const estadoVivo = caja[varEstado];

  // ── repetido, escrito tal cual ──────────────────────────────────────────
  inp.value = 'A1A';
  caja.inp = inp;
  vm.runInContext(c.commit + '("locations", 1, inp)', caja);
  check(c.quien + ': un nombre repetido NO borra lo escrito',
    inp.value === 'A1A', inp.value);
  check(c.quien + ': ...y lo dice, en vez de no hacer nada',
    avisos.some(a => /already on the list/i.test(a)), avisos);
  check(c.quien + ': ...y el aviso nombra lo que chocó',
    avisos.some(a => a.indexOf('A1A') !== -1), avisos);
  check(c.quien + ': ...y NO se guarda encima de la otra',
    estadoVivo.locations[1].name === 'B2B', estadoVivo.locations);

  // ── repetido en minúsculas: es el mismo ────────────────────────────────
  avisos.length = 0;
  inp.value = 'a1a';
  vm.runInContext(c.commit + '("locations", 1, inp)', caja);
  check(c.quien + ': «a1a» choca con «A1A» — una ubicación es una clave',
    avisos.some(a => /already on the list/i.test(a)), avisos);

  // ── uno nuevo entra, en mayúsculas ─────────────────────────────────────
  avisos.length = 0;
  inp.value = '  c3c  ';
  vm.runInContext(c.commit + '("locations", 1, inp)', caja);
  check(c.quien + ': uno nuevo sí entra', estadoVivo.locations[1].name === 'C3C',
    estadoVivo.locations[1]);
  check(c.quien + ': ...recortado y en mayúsculas, como en toda la app',
    inp.value === 'C3C', inp.value);
  check(c.quien + ': ...y sin aviso, porque no hubo nada que avisar',
    avisos.length === 0, avisos);

  // ── el propio valor no choca consigo mismo ─────────────────────────────
  avisos.length = 0;
  inp.value = 'C3C';
  vm.runInContext(c.commit + '("locations", 1, inp)', caja);
  check(c.quien + ': una ficha no choca CONSIGO MISMA al reescribirla igual',
    avisos.length === 0 && estadoVivo.locations[1].name === 'C3C', avisos);

  // ── vacío se deja estar; lo recoge la purga ────────────────────────────
  avisos.length = 0;
  inp.value = '   ';
  vm.runInContext(c.commit + '("locations", 1, inp)', caja);
  check(c.quien + ': una ficha vacía no se queja — se irá sola',
    avisos.length === 0 && estadoVivo.locations[1].name === '', avisos);
  vm.runInContext(c.purga + '()', caja);
  check(c.quien + ': ...y la purga se la lleva al cambiar de paso',
    estadoVivo.locations.length === 1 && estadoVivo.locations[0].name === 'A1A',
    estadoVivo.locations);
});

console.log('\n═══ 2 · LAS DOS COPIAS SE COMPORTAN IGUAL ═══\n');

/* Lo de arriba ya corrió los mismos casos contra las dos. Esto sujeta que las
 * dos tengan las mismas PIEZAS, para que la siguiente diferencia se note aquí
 * y no en la instalación de un cliente. */
const PIEZAS = ['norm','choca','parpadea','commit','dibuja','add','purga'];
PIEZAS.forEach(k => {
  check('las dos copias tienen «' + k + '»',
    !!fnSrc(COPIAS[0].src, COPIAS[0][k]) && !!fnSrc(COPIAS[1].src, COPIAS[1][k]),
    { wizard: COPIAS[0][k], app: COPIAS[1][k] });
});

/* Y que ninguna de las dos conserve el mecanismo viejo. Si una lo mantuviera,
 * volvería a haber dos formas de añadir a la misma lista en el mismo archivo. */
[['SetupWizard.html', WIZ, ['addChip(', 'addLoc(', 'drawChips(', 'drawLocs(']],
 ['la copia de Index', APP, ['_wizAddChip(', '_wizAddLoc(', '_wizDrawChips(', '_wizDrawLocs(']]
].forEach(([quien, src, viejos]) => {
  const vivos = viejos.filter(v => {
    // Se mira el CÓDIGO, no el archivo: los comentarios que explican el
    // arreglo nombran lo que se fue, y una prueba que lee prosa no distingue
    // «sigue ahí» de «está contado».
    const sinComentarios = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    return sinComentarios.indexOf(v) !== -1;
  });
  check(quien + ': no queda nada del mecanismo viejo', vivos.length === 0, vivos);
});

console.log('\n═══ 3 · W-02 · UN SOLO SITIO, Y SE ESCRIBE DENTRO ═══\n');

/* Jose: *"un botón «+ Add» arriba a la derecha… Así sólo tenemos un lugar
 * donde se muestran todas las cosas, en lugar de tener 2 lugares, uno que
 * muestra y otro que escribe."* */
[['SetupWizard.html', WIZ, 'addEmpty', 'dibujar'],
 ['la copia de Index', APP, '_wizAddEmpty', '_wizDibuja']
].forEach(([quien, src, add, dibuja]) => {
  check(quien + ': hay un botón «+ Add»', /class="btn-add"/.test(src));
  check(quien + ': ...y añade una ficha VACÍA', /push\(''\)/.test(fnSrc(src, add)));
  check(quien + ': ...con el cursor dentro, que es la mitad del pedido',
    /\.focus\(\)/.test(fnSrc(src, add)), fnSrc(src, add).slice(-200));
  const d = fnSrc(src, dibuja);
  check(quien + ': la ficha ES el recuadro donde se escribe',
    /class="chip-inp"/.test(d));
  check(quien + ': ...así que una de la plantilla también se puede corregir',
    /value="' \+ _escAttr\(v\)/.test(d), d.slice(0, 300));
  check(quien + ': ...y se guarda al salir del recuadro', /onblur="/.test(d));
  /* Y la caja de texto de abajo YA NO ESTÁ. Era el segundo sitio. */
  check(quien + ': ya no hay una caja de texto aparte para escribir',
    !/Type a (category|location|supplier|project) and press Enter/.test(src));
});

/* Los camiones y los estantes van a la MISMA lista. Antes los camiones tenían
 * su propia caja abajo pero aparecían arriba, con los estantes: escribías en
 * un sitio y salía en otro. */
check('el camión y el estante se añaden a la misma lista',
  /addEmpty\('locations','SITE'\)/.test(WIZ.replace(/\\'/g, "'")) &&
  /_wizAddEmpty\('locations','SITE'\)/.test(APP.replace(/\\'/g, "'")));
check('...y ya no hay una caja suelta para camiones',
  !/wSiteInput/.test(WIZ) && !/wizSiteInput/.test(APP));

console.log('\n═══ 4 · W-01 · EL BOTÓN QUE CONTINÚA NO SE ESCONDE ═══\n');

/* Jose: *"la ventana de setup debe siempre ser suficientemente grande para que
 * no se tenga que hacer scroll; si no se puede, entonces hay que mover el
 * botón de Continue más arriba."*
 *
 * La altura la pone `showModalDialog` y la recorta el navegador en una
 * pantalla baja, así que «hacerla más grande» no es una garantía que podamos
 * dar. El pie fijo sí lo es. */
check('la ventana es una columna que ocupa el alto disponible',
  /body\{[^}]*display:flex[^}]*flex-direction:column/.test(WIZ),
  (WIZ.match(/body\{[^}]*\}/) || [])[0]);
check('...sólo el contenido del medio se desplaza',
  /\.wiz-scroll\{[^}]*overflow-y:auto/.test(WIZ));
check('...y el pie no se desplaza nunca',
  /\.wiz-foot\{[^}]*flex-shrink:0/.test(WIZ));
check('el botón de continuar vive en ese pie',
  /<div class="wiz-foot">[\s\S]{0,400}id="wNext"/.test(WIZ));
/* `min-height:0` parece de adorno y no lo es: sin él, un hijo flexible con
 * contenido alto se niega a encogerse por debajo de su tamaño natural y
 * empuja el pie fuera de la pantalla — justo lo que esto viene a arreglar. */
check('...y el medio puede encogerse de verdad, no sólo en teoría',
  /\.wiz-scroll\{[^}]*min-height:0/.test(WIZ));

console.log('\n═══ 5 · LO QUE NO SE TOCA ═══\n');

/* Las mayúsculas de categorías, ubicaciones, proveedores y proyectos son
 * correctas y deben seguir estando: son CLAVES, y `Flashing` y `FLASHING`
 * tienen que ser la misma cosa. */
check('lo que es una clave sigue guardándose en mayúsculas',
  /return String\(v \|\| ''\)\.trim\(\)\.toUpperCase\(\);/.test(fnSrc(WIZ, '_normaliza')) &&
  /return String\(v \|\| ''\)\.trim\(\)\.toUpperCase\(\);/.test(fnSrc(APP, '_wizNorm')));
/* Y el nombre de la empresa y el de la persona NO se tocan aquí: son nombres
 * propios, no se comparan con nada, y `CUPCAKE EMPIRE` en la cabecera y en los
 * correos grita. Está anotado como W-07, con la forma correcta (la primera de
 * cada palabra), y no se cuela de rondón en este arreglo. */
check('el nombre de la empresa NO se mete en esa regla',
  !/wCompany[\s\S]{0,200}toUpperCase/.test(WIZ));

/* La rejilla de estantes SÍ se salta las repetidas sin quejarse, y aquí es lo
 * correcto: nadie teclea A1A..D4C a mano, se pide una rejilla entera y lo que
 * ya estaba ya está. Lo que sí se dice es cuántas se quedaron fuera, para que
 * un «Generate» que no cambia nada no parezca roto. */
check('generar una rejilla no se queja de las que ya estaban',
  /repes\+\+; return;/.test(fnSrc(WIZ, 'genLocs')));
check('...pero dice algo cuando no añadió ninguna',
  /nothing new to add/i.test(fnSrc(WIZ, 'genLocs')) &&
  /nothing new to add/i.test(fnSrc(APP, '_wizGenerate')));

if (fallos.length) {
  console.error('\nFALLÓ:\n  ' + fallos.join('\n  ') + '\n');
  console.error('  El asistente es la primera pantalla que ve un cliente nuevo.\n' +
                '  Y está escrito dos veces: si las dos copias se separan, el\n' +
                '  fallo vive en el camino que nadie probó.\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
