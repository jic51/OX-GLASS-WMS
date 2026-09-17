// EL ANDAMIO COMPARTIDO DE LAS PRUEBAS.
//
// EL PROBLEMA QUE RESUELVE, medido: seis veces en una semana la suite amaneció
// roja por lo MISMO. Una prueba levanta del archivo la función X y la corre en
// una caja aislada. Alguien le añade a X una llamada a Y. La caja no tiene Y.
// La prueba revienta con "Y is not defined" — y no está midiendo el producto,
// está midiendo el andamio.
//
//   textCell_     no estaba en test-category-rename, test-movement-id
//   textSafeRow_  no estaba en test-config-snapshot, test-packs
//   _stripTags    no estaba en test-entry-todo-corre, test-incoming,
//                 test-incoming-delete
//   withStockLock_ no estaba en test-text-stays-text
//   _busyRetry    no estaba en test-incoming-delete
//
// Cada vez el arreglo fue el mismo: añadir el nombre que faltaba, a mano, a esa
// caja. Es decir, mantener a mano una lista de dependencias que el código ya
// sabe. Eso no se mantiene solo y ya se demostró que no se mantiene.
//
// LA IDEA: que la caja se las busque ella. levantar() lee la función pedida,
// mira qué OTRAS funciones del mismo archivo nombra, y las levanta también —
// y las de ésas, y así hasta el fondo. Cuando mañana alguien le añada a
// updateIncoming una llamada a una función nueva, la prueba la tendrá sin que
// nadie toque la prueba.
//
// LO QUE NO HACE, a propósito:
//   · No resuelve lo que NO es una función del archivo (SpreadsheetApp, Logger,
//     el DOM). Eso lo pone cada prueba, porque es justo lo que cada prueba
//     decide fingir.
//   · No adivina constantes. Se piden por su nombre con constantes().
//   · No sustituye a los dobles: si una prueba QUIERE espiar a _openLabels, la
//     pone en `dobles` y levantar() no la levanta.
//
// Uso:
//   const A = require('./andamio.js');
//   const GS = A.fuente('gs');
//   vm.runInContext(A.levantar(GS, ['addIncoming'], { dobles: ['uploadIncomingDoc_'] }), ctx);

const fs = require('fs');
const path = require('path');
const RAIZ = path.join(__dirname, '..');

const _cache = {};

/** El texto de uno de los dos archivos del producto. 'gs' o 'html'. */
function fuente(cual) {
  if (_cache[cual]) return _cache[cual];
  const f = cual === 'gs' ? 'Code_v3_fixed.gs' : 'Index_v3_fixed.html';
  return (_cache[cual] = fs.readFileSync(path.join(RAIZ, f), 'utf8'));
}

/** Una función entera, contando llaves.
 *
 *  NUNCA una ventana de N caracteres desde el principio: eso ya hizo fallar una
 *  prueba sobre código sano, sólo porque la función había crecido. */
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

/** Los nombres de todas las funciones declaradas en un archivo. */
function nombresDe(src) {
  const set = new Set();
  const re = /^function ([A-Za-z0-9_$]+)\s*\(/gm;
  let m;
  while ((m = re.exec(src))) set.add(m[1]);
  return set;
}

// Palabras que PARECEN llamadas y no lo son. Sin esta lista, el buscador
// intentaría levantar "if" o "String".
const NO_SON_FUNCIONES = new Set([
  'if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'typeof',
  'new', 'delete', 'void', 'in', 'of', 'do', 'else', 'try', 'throw',
  'String', 'Number', 'Boolean', 'Array', 'Object', 'Date', 'Math', 'JSON',
  'RegExp', 'Error', 'parseInt', 'parseFloat', 'isNaN', 'isFinite'
]);

/** Qué funciones DEL ARCHIVO nombra este trozo de código.
 *
 *  SE BUSCAN IDENTIFICADORES SUELTOS, no sólo "nombre(". El primer intento
 *  exigía el paréntesis y por eso se dejó textCell_ fuera: textSafeRow_ no lo
 *  LLAMA, se lo pasa a map como referencia —"(row || []).map(textCell_)"—.
 *
 *  Es la misma forma que ya se me escapó dos veces buscando la doble cita a
 *  ojo. Buscar el paréntesis parece más preciso y no lo es: lo que importa es
 *  que el nombre aparezca, no cómo.
 *
 *  Levantar alguna función de más no cuesta nada; dejarse una es lo que rompe
 *  la prueba con "no está definida". */
function _llamadasEn(cuerpo, declaradas) {
  const out = new Set();
  const re = /\b([A-Za-z_$][A-Za-z0-9_$]*)\b/g;
  let m;
  while ((m = re.exec(cuerpo))) {
    const n = m[1];
    if (NO_SON_FUNCIONES.has(n)) continue;
    if (declaradas.has(n)) out.add(n);
  }
  return out;
}

/**
 * El código de las funciones pedidas Y DE TODO LO QUE NECESITAN, listo para
 * meter en una caja.
 *
 * opciones.dobles — nombres que NO se levantan porque la prueba los va a
 *                   fingir. También corta la búsqueda ahí: lo que sólo
 *                   necesitaba el doble no hace falta.
 * opciones.saltar — nombres que no se levantan y de los que tampoco se avisa
 *                   (por ejemplo, funciones enormes que la prueba no ejercita).
 */
function levantar(src, nombres, opciones) {
  opciones = opciones || {};
  const dobles     = new Set(opciones.dobles || []);
  const saltar     = new Set(opciones.saltar || []);
  const declaradas = nombresDe(src);

  const orden = [];
  const puestas = new Set();
  const faltan = new Set();

  function meter(n) {
    if (puestas.has(n) || dobles.has(n) || saltar.has(n)) return;
    const cuerpo = fnSrc(src, n);
    if (!cuerpo) { faltan.add(n); return; }
    puestas.add(n);                       // ANTES de recorrer: si A llama a B y
                                          // B llama a A, sin esto no termina.
    _llamadasEn(cuerpo, declaradas).forEach(meter);
    orden.push(cuerpo);                   // las dependencias primero
  }

  (nombres || []).forEach(n => {
    if (!fnSrc(src, n)) {
      throw new Error('andamio: no existe la función "' + n + '" en el archivo. ' +
        '¿Se renombró? Una prueba que pide una función que ya no está es una ' +
        'prueba que dejó de medir el producto.');
    }
    meter(n);
  });

  if (faltan.size) {
    throw new Error('andamio: no se pudo levantar ' + [...faltan].join(', ') +
      '. Si es de Apps Script o del navegador, ponla en el contexto; si la ' +
      'prueba la finge, ponla en `dobles`.');
  }
  return orden.join('\n');
}

/**
 * Monta el contexto Y levanta el código dentro, de una vez.
 *
 * ES LA FORMA RECOMENDADA, y existe por una trampa que este mismo andamio
 * estuvo a punto de crear: una declaración `function X(){}` dentro de la caja
 * PISA la X que la prueba había puesto en el contexto. Así que si la prueba
 * finge getUserRole y el andamio levanta el getUserRole de verdad por ser
 * dependencia de otra cosa, GANA EL DE VERDAD — y la prueba cree que está
 * midiendo su doble mientras mide el producto, o revienta con SpreadsheetApp.
 *
 * Aquí eso no puede pasar callando: si un nombre levantado coincide con una
 * clave del contexto, esto se queja y dice exactamente qué poner en `dobles`.
 *
 * (Y de paso resuelve lo otro que se vio midiendo: sin dobles, getUserRole
 * arrastra un cuarto del archivo. Los dobles no son sólo para fingir — son
 * también dónde se corta la búsqueda.)
 */
function montar(contexto, src, nombres, opciones) {
  opciones = opciones || {};
  const codigo = levantar(src, nombres, opciones);
  const puestas = (codigo.match(/^function ([A-Za-z0-9_$]+)/gm) || [])
    .map(x => x.replace('function ', ''));
  const choque = puestas.filter(n => Object.prototype.hasOwnProperty.call(contexto, n));
  if (choque.length) {
    throw new Error('andamio: ' + choque.join(', ') + ' está(n) en el contexto Y ' +
      'se levantó(aron) del archivo. La declaración del archivo PISA al doble, ' +
      'así que la prueba mediría el producto donde cree medir su doble. ' +
      'Ponlas en `dobles`.');
  }
  const ctx = require('vm').createContext(contexto);
  require('vm').runInContext(codigo, ctx);
  return ctx;
}

/** Constantes del archivo, por su nombre. Se leen DEL ARCHIVO, nunca se copian
 *  a mano: una copia se queda vieja sin avisar y la prueba mide otra cosa. */
function constantes(src, nombres) {
  return (nombres || []).map(n => {
    const re = new RegExp('^var ' + n + '\\s*=[\\s\\S]*?;\\s*$', 'm');
    const m = re.exec(src);
    if (!m) throw new Error('andamio: no existe la constante "' + n + '"');
    return m[0];
  }).join('\n');
}

/**
 * EL MISMO CÓDIGO, SIN SUS COMENTARIOS. Una sola implementación, porque la
 * versión ingenua está mal y estaba copiada en ocho pruebas.
 *
 * PARA QUÉ SIRVE: buscar algo EN EL CÓDIGO, no en la prosa que lo explica. Los
 * comentarios de este proyecto nombran lo que arreglan —"ya no se usa
 * loadDataFromGoogle(false)", "el conteo cíclico no existe"— así que una
 * búsqueda en crudo encuentra la explicación y cree que encontró el código. Ya
 * pasó dos veces: una con una regla de CSS y otra contando recargas.
 *
 * POR QUÉ LA VERSIÓN INGENUA ESTÁ MAL, medido:
 *
 *     .replace(/\/\*[\s\S]*?\*\//g, ' ')
 *
 * Index_v3_fixed.html tiene esto en un atributo de un <input>:
 *
 *     accept="image/*,.pdf,video/*"
 *
 * Ese `/*` no abre ningún comentario — pero para el regex sí, y el "comentario"
 * corre hasta el siguiente `*​/` de verdad, 38.780 caracteres más allá. Se
 * llevaba por delante aiExtractFromModal, medio módulo de documentos y el mazo
 * entero. Nada fallaba: las pruebas simplemente dejaban de ver ese trozo del
 * archivo y daban por bueno lo que no habían mirado.
 *
 * Y no es sólo el HTML. Code_v3_fixed.gs tiene "legal/" seguido de asterisco y
 * ".md" DENTRO de un comentario de línea, y ahí el regex ingenuo se comía
 * 19.762 caracteres — con las funciones de ese tramo invisibles para
 * test-endpoint-auth, que es el guardia de la autenticación de los endpoints.
 * El peor archivo del repositorio para tener un punto ciego.
 *
 * LA REGLA: una apertura de bloque sólo cuenta si lo que tiene delante NO es
 * parte de una ruta ni de un tipo MIME. Los falsos positivos de estos dos
 * archivos son todos de la forma "palabra/" + asterisco (los accept de un
 * <input>, una ruta con comodín), así que basta con exigir que el carácter
 * anterior no sea alfanumérico, ni punto, ni guión, ni barra. Con eso el bloque
 * más largo del HTML pasa de 38.780 caracteres a 2.137, y el del .gs de 19.762
 * a 2.267 — que ya son comentarios de verdad.
 *
 * (Este comentario no puede escribir esas secuencias literales: cerrarían el
 *  bloque en el que está. El tercer sitio donde el mismo carácter significa dos
 *  cosas distintas, en la misma tarde.)
 */
function sinComentarios(src) {
  return String(src)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    // El carácter de delante se conserva ($1): es del código, no del comentario.
    .replace(/(^|[^A-Za-z0-9_.\-\/])\/\*[\s\S]*?\*\//g, '$1 ')
    // Sólo líneas que EMPIEZAN por //, para no partir 'https://…' por la mitad.
    .replace(/^\s*\/\/.*$/gm, ' ');
}

// ── UNA HOJA QUE SE PORTA COMO SHEETS ───────────────────────────────────────
//
// Las dos cosas que tiene que imitar, porque son las dos que han roto datos de
// verdad en este almacén:
//
//   1. PARSEA lo que se le da. setValues("07-6329") no guarda esos ocho
//      caracteres: guarda una fecha. (Jose, 2026-09-09)
//   2. La comilla de delante es un FORMATO, no parte del valor: se la come al
//      escribir y getValues() nunca la devuelve. Una hoja falsa que la guardara
//      dentro del dato no podría enseñar la doble cita. (Jose, 2026-09-15)
//
// Y deleteRow DESPLAZA de verdad, que es lo que permite ver las carreras.
function comoSheets(v) {
  if (typeof v !== 'string') return v;
  if (v.charAt(0) === "'") return v.slice(1);
  let m = /^(\d{1,2})-(\d{3,4})$/.exec(v);
  if (m) return new Date(Date.UTC(Number(m[2]), Number(m[1]) - 1, 1));
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v);
  if (m) return new Date(Date.UTC(Number(m[3]), Number(m[1]) - 1, Number(m[2])));
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

function Hoja(nombre, filas, maxCols) {
  this.nombre  = nombre;
  this.rows    = (filas || []).map(r => r.slice());
  this._maxCols = maxCols || 40;
  this.pedidos = [];      // 'getValues' | 'setValues' | … — para contar viajes
}
Hoja.prototype.getName        = function(){ return this.nombre; };
Hoja.prototype.getLastRow     = function(){ this.pedidos.push('getLastRow'); return this.rows.length; };
Hoja.prototype.getMaxRows     = function(){ return Math.max(this.rows.length, 200); };
Hoja.prototype.getMaxColumns  = function(){ return this._maxCols; };
Hoja.prototype.getLastColumn  = function(){
  return this.rows.reduce((m, r) => Math.max(m, r.length), 0);
};
Hoja.prototype.insertColumnsAfter = function(a, n){ this._maxCols += n; };
Hoja.prototype.insertRowsAfter    = function(){};
Hoja.prototype.setFrozenRows      = function(){};
Hoja.prototype.deleteRow  = function(r){ this.pedidos.push('deleteRow'); this.rows.splice(r - 1, 1); };
Hoja.prototype.deleteRows = function(r, n){ this.rows.splice(r - 1, n); };
Hoja.prototype.clearContents = function(){ this.pedidos.push('clearContents'); this.rows = []; };
Hoja.prototype.appendRow  = function(r){
  this.pedidos.push('appendRow');
  this.rows.push(r.map(comoSheets));
};
Hoja.prototype.getDataRange = function(){
  const self = this;
  self.pedidos.push('getDataRange');
  return { getValues: () => self.rows.map(r => r.slice()) };
};
Hoja.prototype.getRange = function(r, c, nr, nc){
  const self = this; nr = nr || 1; nc = nc || 1;
  return {
    getValue: () => (self.rows[r - 1] || [])[c - 1],
    setValue(v){
      while (self.rows.length < r) self.rows.push([]);
      self.rows[r - 1][c - 1] = comoSheets(v);
      self.pedidos.push('setValue');
      return this;
    },
    getValues(){
      self.pedidos.push('getValues');
      const out = [];
      for (let i = 0; i < nr; i++) {
        const fila = self.rows[r - 1 + i] || [];
        const s = [];
        for (let j = 0; j < nc; j++) s.push(fila[c - 1 + j] !== undefined ? fila[c - 1 + j] : '');
        out.push(s);
      }
      return out;
    },
    setValues(vals){
      self.pedidos.push('setValues');
      for (let i = 0; i < vals.length; i++) {
        while (self.rows.length <= r - 1 + i) self.rows.push([]);
        for (let j = 0; j < vals[i].length; j++) {
          self.rows[r - 1 + i][c - 1 + j] = comoSheets(vals[i][j]);
        }
      }
      return this;
    },
    clearContent(){
      for (let i = 0; i < nr; i++) {
        const fila = self.rows[r - 1 + i];
        if (!fila) continue;
        for (let j = 0; j < nc; j++) fila[c - 1 + j] = '';
      }
      return this;
    },
    setNumberFormat(){ return this; },
    setFontWeight(){ return this; },
    setBackground(){ return this; },
    setWrap(){ return this; },
    setVerticalAlignment(){ return this; }
  };
};

/** El marcador de cada prueba: cuenta, imprime y decide el código de salida. */
function marcador(titulo) {
  let ok = 0, fail = 0;
  return {
    check(etiqueta, cond, extra) {
      if (cond) { ok++; console.log('  ok  ', etiqueta); }
      else { fail++; console.log('  FAIL ', etiqueta,
        extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
    },
    seccion(t){ console.log('\n═══ ' + t + ' ═══\n'); },
    fin(){
      console.log('\n' + titulo + ': ' + (fail ? fail + ' FALLO(S)' : 'ok (' + ok + ')') + '\n');
      process.exit(fail ? 1 : 0);
    },
    get ok(){ return ok; },
    get fail(){ return fail; }
  };
}

module.exports = { fuente, fnSrc, nombresDe, levantar, montar, constantes,
                   sinComentarios, Hoja, comoSheets, marcador };
