// EL BONEYARD — QUÉ SOBRÓ DE QUÉ OBRA, Y DÓNDE SE USÓ.
//
// Jose, 15/10: *"en esta bodega tenemos boneyard, que son materiales que no se
// usaron en el proyecto que se suponía que deberían haberse usado, y
// generalmente se las asigna a algún otro proyecto... eso nos dice qué sobró de
// qué proyecto y dónde se lo usó"*.
//
// ── LO QUE YA EXISTÍA, Y POR QUÉ NO SERVÍA ─────────────────────────────────
//
// El movimiento RETURN existía desde hace tiempo y ya hacía lo correcto con el
// stock: restar del sitio y sumar a la bodega. Lo que faltaba era el DATO. El
// formulario pedía el origen como texto libre —«From (Site / Project /
// Address)»— en una columna de UBICACIÓN, y escondía el campo de proyecto a
// propósito. Así que el origen se escribía y no se podía agrupar: ningún
// informe podía contestar «qué sobró de dónde» porque la respuesta estaba en
// la columna de los estantes.
//
// ── LAS DOS DECISIONES DE DISEÑO QUE ESTA PRUEBA DEFIENDE ──────────────────
//
// 1. BONEYARD ES UN ESTADO, NO UNA CATEGORÍA.
//    Jose propuso hacer BONEYARD una categoría con subcategorías (BONEYARD >
//    WINDOW, BONEYARD > SCREEN...). Funcionaría, pero duplica el árbol: cada
//    categoría nueva necesitaría su gemela de boneyard y NADA obligaría a
//    crearla — que es la forma de fallo que este proyecto ha pagado once
//    veces. Como estado, el material sigue siendo WINDOW SCREEN y lo que
//    cambia es que algunas de sus unidades saben de dónde vinieron. El stock
//    no se parte en dos y no hay nada que mantener sincronizado.
//
// 2. EL ORIGEN VA EN SU PROPIA COLUMNA, NO EN `PROJECT`.
//    `PROJECT` significa «la obra PARA la que es este movimiento». Una
//    devolución no es PARA una obra, es DE una obra. Y el motor de stock hace
//    `s.project = m.project`, así que una devolución que escribiera PROJECT
//    dejaría el material etiquetado con la obra de la que volvió — cuando ya
//    está en bodega y sin asignar. En una SALIDA las dos conviven y ése es el
//    punto: PROJECT dice a dónde va, ORIGIN_PROJECT de dónde salió, y una
//    fila contesta las dos preguntas.
//
// Esta prueba corre el MOTOR DE STOCK DE VERDAD, sacado del archivo con `vm`,
// sobre movimientos inventados. No comprueba que el código esté escrito:
// comprueba qué número sale.
//
// Uso:  node tools/test-boneyard.js [path/to/Code_v3_fixed.gs]

const fs = require('fs'), path = require('path'), vm = require('vm');

const RAIZ = path.join(__dirname, '..');
const GS   = process.argv[2] || path.join(RAIZ, 'Code_v3_fixed.gs');
const HTML = path.join(RAIZ, 'Index_v3_fixed.html');
const src  = fs.readFileSync(GS, 'utf8');
const html = fs.readFileSync(HTML, 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FALLA ' + label + (extra === undefined ? '' : '  → ' + JSON.stringify(extra))); }
}

/* ── EL MOTOR, EXTRAÍDO Y EJECUTADO ────────────────────────────────────────
 * `calculateStock` y lo que necesita. Nada de reimplementar la lógica aquí:
 * una copia de la lógica en la prueba sólo demuestra que la copia coincide
 * consigo misma. */
function fn(nombre) {
  const re = new RegExp('^function ' + nombre + '\\s*\\([\\s\\S]*?\\n\\}', 'm');
  const m = src.match(re);
  if (!m) throw new Error('no se encontró ' + nombre + ' en ' + path.basename(GS));
  return m[0];
}

const ctx = vm.createContext({ Logger: { log(){} }, console });
vm.runInContext(
  fn('getMaterialId') + '\n' +
  fn('normalizeString') + '\n' +
  fn('findFirstWarehouseLoc') + '\n' +
  fn('reservedQtyFromRacks_') + '\n' +
  fn('applyReservationsAndFinalize_') + '\n' +
  fn('calculateStock'), ctx);

/* Un movimiento con lo mínimo. `parseArchiveRow` entrega objetos con todos los
 * campos, así que aquí se rellenan los que el motor lee. */
function mov(o) {
  return Object.assign({
    category: 'WINDOW', name: 'SCREEN A', qty: 0, moveType: 'ENTRY',
    project: '', sourceLoc: '', destLoc: '', unit: 'UNIT',
    originProject: '', fromMov: '', movId: ''
  }, o);
}
const stockDe = movs => vm.runInContext('calculateStock', ctx)(movs);
const mat = s => s['WINDOW|||SCREEN A'];

/* ════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 1. LA HISTORIA COMPLETA DE UNA SOBRA ═══\n');
//
// Es el caso de Jose, de principio a fin: se compran 60, se mandan 60 a BLACK
// HOUSE 2, vuelven 40 que no se usaron, y 12 de esas 40 se van a LAKESHORE.
{
  const s = mat(stockDe([
    mov({ moveType:'ENTRY',  qty:60, destLoc:'A1A', po:'56789' }),
    mov({ moveType:'EXIT',   qty:60, sourceLoc:'A1A', project:'BLACK HOUSE 2' }),
    mov({ moveType:'RETURN', qty:40, destLoc:'A1A', originProject:'BLACK HOUSE 2' }),
    mov({ moveType:'EXIT',   qty:12, sourceLoc:'A1A', project:'LAKESHORE',
          originProject:'BLACK HOUSE 2' })
  ]));

  check('en bodega quedan 28 (60 − 60 + 40 − 12)', s.warehouseQty === 28, s.warehouseQty);
  check('en obra quedan 32 (60 − 40 + 12)', s.siteQty === 32, s.siteQty);

  /* LA PREGUNTA DE JOSE, NÚMERO UNO: ¿qué sobró de qué obra? */
  check('QUEDAN 28 DE BONEYARD DE «BLACK HOUSE 2» — 40 que volvieron menos ' +
        '12 que se llevaron a otra obra',
    s.boneyard['BLACK HOUSE 2'] === 28, s.boneyard);
  check('...y de ninguna otra obra, porque de ninguna otra volvió nada',
    Object.keys(s.boneyard).length === 1, s.boneyard);

  /* Y NO SE PARTIÓ EN DOS. Es la diferencia entre estado y categoría: el
   * material sigue siendo uno solo. */
  check('EL MATERIAL SIGUE SIENDO UNO: la categoría no cambió a BONEYARD',
    s.category === 'WINDOW', s.category);
}

console.log('\n═══ 2. SOBRAS DE VARIAS OBRAS A LA VEZ ═══\n');
//
// Lo normal en una bodega con veinte obras abiertas: el mismo material sobra
// de dos sitios distintos. Si el boneyard fuera UN NÚMERO en vez de un mapa,
// aquí diría «30 son sobras» y se callaría lo único que hace falta para
// usarlas: de quién son.
{
  const s = mat(stockDe([
    mov({ moveType:'ENTRY',  qty:100, destLoc:'A1A' }),
    mov({ moveType:'EXIT',   qty:50, sourceLoc:'A1A', project:'BLACK HOUSE 2' }),
    mov({ moveType:'EXIT',   qty:50, sourceLoc:'A1A', project:'SUMMIT VIEW' }),
    mov({ moveType:'RETURN', qty:20, destLoc:'A1A', originProject:'BLACK HOUSE 2' }),
    mov({ moveType:'RETURN', qty:10, destLoc:'A1A', originProject:'SUMMIT VIEW' })
  ]));
  check('20 sobraron de BLACK HOUSE 2', s.boneyard['BLACK HOUSE 2'] === 20, s.boneyard);
  check('10 sobraron de SUMMIT VIEW',   s.boneyard['SUMMIT VIEW'] === 10, s.boneyard);
  check('y las dos se cuentan por separado, que es la pregunta entera',
    Object.keys(s.boneyard).length === 2, s.boneyard);

  /* Y gastar de una NO toca la otra. Parece obvio y es justo lo que un
   * contador único se habría llevado por delante. */
  const s2 = mat(stockDe([
    mov({ moveType:'ENTRY',  qty:100, destLoc:'A1A' }),
    mov({ moveType:'EXIT',   qty:50, sourceLoc:'A1A', project:'BLACK HOUSE 2' }),
    mov({ moveType:'EXIT',   qty:50, sourceLoc:'A1A', project:'SUMMIT VIEW' }),
    mov({ moveType:'RETURN', qty:20, destLoc:'A1A', originProject:'BLACK HOUSE 2' }),
    mov({ moveType:'RETURN', qty:10, destLoc:'A1A', originProject:'SUMMIT VIEW' }),
    mov({ moveType:'EXIT',   qty:20, sourceLoc:'A1A', project:'NEWPORT',
          originProject:'BLACK HOUSE 2' })
  ]));
  check('al gastar las 20 de BLACK HOUSE 2, esa obra desaparece del boneyard',
    s2.boneyard['BLACK HOUSE 2'] === undefined, s2.boneyard);
  check('...y SUMMIT VIEW sigue con sus 10 intactas',
    s2.boneyard['SUMMIT VIEW'] === 10, s2.boneyard);
}

console.log('\n═══ 3. LO QUE NO DEBE ENTRAR AL BONEYARD ═══\n');
{
  /* Una entrada de proveedor no es una sobra por mucho que alguien le ponga
   * un origen: es material nuevo que se compró. */
  const s = mat(stockDe([
    mov({ moveType:'ENTRY', qty:50, destLoc:'A1A', originProject:'BLACK HOUSE 2' })
  ]));
  check('una ENTRADA con origen NO crea boneyard: se compró, no sobró',
    Object.keys(s.boneyard).length === 0, s.boneyard);

  /* Y una devolución SIN origen tampoco. Es toda la historia anterior a esta
   * versión: material que volvió y nadie apuntó de dónde. Cuenta en bodega
   * —volvió de verdad— pero no se le inventa una obra. */
  const s2 = mat(stockDe([
    mov({ moveType:'ENTRY',  qty:50, destLoc:'A1A' }),
    mov({ moveType:'EXIT',   qty:50, sourceLoc:'A1A', project:'BLACK HOUSE 2' }),
    mov({ moveType:'RETURN', qty:30, destLoc:'A1A' })
  ]));
  check('una DEVOLUCIÓN VIEJA sin origen suma al stock...', s2.warehouseQty === 30, s2.warehouseQty);
  check('...pero NO entra al boneyard con la clave vacía — eso inventaría un ' +
        'proyecto llamado «» y lo enseñaría en la pantalla',
    Object.keys(s2.boneyard).length === 0, s2.boneyard);
}

console.log('\n═══ 4. EL BONEYARD NO SE PUEDE QUEDAR NEGATIVO ═══\n');
//
// Puede pasar por historia legítima: una devolución borrada, una salida
// registrada a mano antes de que esto existiera. No es un error de nadie y
// por eso no se apunta como tal — pero un número negativo en pantalla sí
// sería un error visible.
{
  const s = mat(stockDe([
    mov({ moveType:'ENTRY',  qty:100, destLoc:'A1A' }),
    mov({ moveType:'EXIT',   qty:100, sourceLoc:'A1A', project:'BLACK HOUSE 2' }),
    mov({ moveType:'RETURN', qty:10, destLoc:'A1A', originProject:'BLACK HOUSE 2' }),
    mov({ moveType:'EXIT',   qty:40, sourceLoc:'A1A', project:'LAKESHORE',
          originProject:'BLACK HOUSE 2' })
  ]));
  check('sacar 40 de un boneyard de 10 lo deja en cero, no en −30',
    s.boneyard['BLACK HOUSE 2'] === undefined, s.boneyard);
  check('...y el stock de bodega sigue siendo correcto', s.warehouseQty === 0, s.warehouseQty);
}

/* ════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 5. EL ESQUEMA: DOS COLUMNAS, AÑADIDAS AL FINAL ═══\n');
{
  const ac = (src.match(/var AC = \{[\s\S]*?\n\};/) || [''])[0];
  check('`ORIGIN_PROJECT` existe en el mapa de columnas', /ORIGIN_PROJECT:\s*23/.test(ac), ac.slice(-200));
  check('`FROM_MOV` existe', /FROM_MOV:\s*24/.test(ac), ac.slice(-200));
  check('`MOV_ID` sigue en 22: las columnas nuevas se AÑADIERON, no se ' +
        'insertaron — insertarlas correría cada columna posterior en todas ' +
        'las instalaciones que ya tienen datos',
    /MOV_ID:\s*22/.test(ac));
  /* ESTO DECÍA `/var AC_WIDTH = 25;/`, Y ERA LA FORMA EQUIVOCADA DE MEDIRLO.
   *
   * Clavar el número convertía esta prueba en una tercera lista que tiene que
   * coincidir con las otras dos: el día que el archivo gane una columna —por
   * `IMPORT_ID`, por un campo que pida un cliente— esto se pondría rojo sin
   * que nada estuviera mal, y alguien tendría que venir a subir el número a
   * mano. Un guardia que hay que apaciguar cada vez deja de leerse.
   *
   * Lo que de verdad importa no es que el ancho sea 25: es que el ancho CUBRA
   * la última columna del mapa. Si `FROM_MOV` cae fuera, las lecturas de fila
   * entera dejan de traerla y nadie se entera — que es exactamente el desastre
   * de la noche del 26 de septiembre, con otra columna.
   *
   * Medido así, el guardia protege lo mismo y no hay que tocarlo nunca más. */
  {
    const ancho = Number((src.match(/var AC_WIDTH = (\d+);/) || [])[1]);
    const ultima = Math.max.apply(null,
      (ac.match(/:\s*(\d+)/g) || []).map(function (m) { return Number(m.slice(1)); }));
    check('`AC_WIDTH` (' + ancho + ') cubre la última columna del mapa (' + ultima + ')',
      ancho === ultima + 1, { ancho: ancho, ultima: ultima });
  }

  /* `padRow_` es lo que hace que una hoja vieja y estrecha siga leyéndose. Sin
   * eso, el día del despliegue toda instalación existente empieza a reventar
   * al leer sus propias filas. */
  check('`padRow_` sigue existiendo: una hoja estrecha se rellena en vez de ' +
        'romperse', /function padRow_/.test(src));
  check('`ensureArchiveWidth_` sigue existiendo: la hoja crece sola al ' +
        'desplegar', /function ensureArchiveWidth_/.test(src));
}

console.log('\n═══ 6. SÓLO RETURN Y EXIT GUARDAN ORIGEN ═══\n');
{
  const bloque = (src.match(/if \(mt === 'RETURN' \|\| mt === 'EXIT'\) \{[\s\S]{0,400}?\n      \}/) || [''])[0];
  check('el escritor sólo pone origen en RETURN y EXIT', !!bloque, bloque.slice(0, 80));
  check('...y lo deja VACÍO en los demás, en vez de no tocarlo — una celda ' +
        'heredada de otro tipo sería un dato que nadie escribió',
    /else \{\s*row\[AC\.ORIGIN_PROJECT\] = '';/.test(src));
  check('...y normaliza el origen con `normalizeString`, la MISMA que el ' +
        'proyecto: dos normalizaciones distintas sobre la misma clase de dato ' +
        'no se podrían comparar entre ellas',
    /row\[AC\.ORIGIN_PROJECT\] = d\.originProject \? normalizeString\(/.test(src));
  check('`parseArchiveRow` devuelve los dos campos nuevos',
    /originProject: String\(row\[AC\.ORIGIN_PROJECT\]/.test(src) &&
    /fromMov:\s+String\(row\[AC\.FROM_MOV\]/.test(src));
}

console.log('\n═══ 7. EL FORMULARIO: EL ORIGEN TIENE SU PROPIO CAMPO ═══\n');
{
  check('existe el campo `mOrigProj`', /id="mOrigProj"/.test(html));
  check('...y NO reutiliza `mProj`: son dos preguntas distintas y la de la ' +
        'salida necesita las dos a la vez',
    /id="mOrigProjField"/.test(html) && /id="mProjField"/.test(html));
  /* LA DEVOLUCIÓN YA NO LO ENSEÑA, Y ES UN ARREGLO — v12.95.
   *
   * Jose, 22 y 23/10, dos veces: *"¿por qué hay un FROM y un CAME BACK FROM?
   * Esas son la misma pregunta que espera dos datos diferentes"*. Su captura lo
   * prueba: los dos recuadros con EL MISMO TEXTO escrito, y cada uno ofreciendo
   * una cosa distinta — uno «crea esto como estantería» y el otro «añade esta
   * obra a tu lista».
   *
   * Lo que esta prueba defiende NO ha cambiado: el dato del boneyard tiene que
   * seguir escribiéndose. Lo que cambia es de dónde sale — de la única
   * respuesta, en vez de una segunda pregunta que podía contradecir a la
   * primera. En la SALIDA el campo sigue ahí, porque ahí son dos preguntas de
   * verdad: a dónde va, y de dónde salió. */
  check('la DEVOLUCIÓN ya no enseña un segundo campo para lo mismo',
    /_origProjMostrar\(false\)/.test(html));
  check('...pero el dato se sigue exigiendo, en la casilla que SÍ se ve — un ' +
        'campo obligatorio invisible habría bloqueado todas las devoluciones',
    /currentMoveType === 'RETURN'[\s\S]{0,600}getElementById\('mSrc'\)[\s\S]{0,400}Where is this coming back from/.test(html));
  check('...y la obra se DEDUCE de esa respuesta, así que la columna del ' +
        'boneyard se sigue llenando',
    /function _origProjDeducido\(\)/.test(html));
  check('...con el nombre tal como está en la lista de obras, no como se ' +
        'teclee: lo segundo sembraría duplicados',
    /_origProjDeducido[\s\S]{0,900}config\.projects/.test(html));
  check('la SALIDA SÍ lo sigue enseñando: ahí son dos preguntas de verdad',
    /_origProjMostrar\(true/.test(html));
  check('el campo se apaga en CADA cambio de tipo, para que una pantalla no ' +
        'herede el de la anterior', /_origProjMostrar\(false\);/.test(html));
  check('...y al apagarse se VACÍA: un campo invisible con contenido escribe ' +
        'un dato que nadie eligió',
    /if \(!on\) \{ var inp = document\.getElementById\('mOrigProj'\)/.test(html));
  check('la SALIDA sólo lo enseña si ese material TIENE sobras',
    /function _boneyardSync\(\)[\s\S]{0,400}if \(!obras\.length\)\{ _origProjMostrar\(false\); return; \}/.test(html));
  check('...y la lista de la salida enseña CUÁNTAS hay de cada obra, para ' +
        'poder elegir antes de escribir y no después de guardar',
    /available<\/option>/.test(html));
  check('el envío lleva `originProject` y `fromMov`',
    /originProject:\s+_origProjDeducido\(\)/.test(html) &&
    /fromMov:\s+_boneyardOrigenMov/.test(html));
  check('y el puntero se limpia al abrir el modal: uno que sobrevive a su ' +
        'ventana acaba colgado del movimiento siguiente',
    /_boneyardOrigenMov = '';/.test(html));
}

console.log('\n═══ 8. Y SE VE EN PANTALLA, QUE ES DONDE SE CONTESTA ═══\n');
{
  check('la tabla de stock marca las sobras', /function _boneyardMarca/.test(html));
  check('...diciendo de QUÉ obra, no sólo que las hay',
    /left over from/.test(html));
  check('...y con el detalle por obra en el título, cuando son varias',
    /obras\.map\(function\(p\) \{ return p \+ ': ' \+ b\[p\]; \}\)/.test(html) ||
    /obras\.map\(function\(p\)\{ return p/.test(html) ||
    /detalle = obras\.map/.test(html));
  check('la fila del movimiento enseña a dónde VA y de dónde SALIÓ',
    /var origen  = m\.originProject/.test(html));
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallos · ' : '✓ todo bien · ') + (ok + fail) + ' comprobaciones\n');
process.exit(fail ? 1 : 0);
