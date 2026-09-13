// UN CANDADO QUE NO SE VE NO ES UN CANDADO.
//
// Jose, 2026-09-12, con tres capturas: trabó MH 145 en B2A desde una cuenta, y
// desde la otra —misma app, misma versión— no había ni rastro. Recargó. Nada.
//
// Eran DOS agujeros distintos, y hay que decirlos por separado porque se
// arreglan en archivos distintos:
//
//   1. El sello no se movía. lockMaterial y unlockMaterial estaban FUERA de
//      DATA_STAMP_ACTIONS, con esta razón escrita al lado: "cambian permisos
//      sobre el material, no cuánto hay". Esa frase es la regla VIEJA —la de
//      AVAILABLE— aplicada a otra cosa. Con la regla nueva (¿alguien que tiene
//      la app abierta VERÍA algo distinto?) no se sostiene.
//
//   2. Y aunque el sello se hubiera movido, en la pantalla donde Jose estaba
//      mirando NO HABÍA DÓNDE VERLO: renderStock —la tabla Live Inventory
//      Stock— no menciona los candados en ninguna línea. El candado vivía sólo
//      en el cajón del estante y en el formulario de salida, o sea, sólo donde
//      ya era tarde: cuando ya intentaste sacar el material.
//
// Por eso este archivo comprueba LAS DOS MITADES JUNTAS. Arreglar una sola deja
// el error exactamente igual de invisible para quien lo sufrió, y tenerlas en
// dos pruebas distintas permite que una se caiga sin que nadie lo note.
//
// CÓMO SE COMPRUEBA LA MITAD DE LA PANTALLA. No leyendo el código y buscando la
// palabra "lock" — esa trampa ya nos costó dos errores en verde esta semana.
// Se levantan las funciones DE VERDAD del HTML y se les saca la celda de
// Location tal cual la arma renderStock, y se mira la cadena que sale. Si
// alguien cambia el template, esta prueba se cae.
//
// Uso:  node tools/test-lock-visible.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const RAIZ = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(RAIZ, 'Index_v3_fixed.html'), 'utf8');
const GS   = fs.readFileSync(path.join(RAIZ, 'Code_v3_fixed.gs'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

// Una función entera, con sus llaves contadas. Nunca una ventana de N
// caracteres desde el principio: eso ya hizo fallar una prueba sobre código
// sano, sólo porque la función creció.
function fnSrc(name){
  const start = HTML.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('no encontrada: ' + name);
  let depth = 0;
  for (let j = HTML.indexOf('{', start); j < HTML.length; j++) {
    if (HTML[j] === '{') depth++;
    else if (HTML[j] === '}') { depth--; if (depth === 0) return HTML.slice(start, j + 1); }
  }
  throw new Error('sin cerrar: ' + name);
}

// ── El código de verdad, en una caja ────────────────────────────────────────
const caja = { console };
vm.createContext(caja);
['_normKey', '_he', '_escAttr', 'locSummary', '_rebuildLocksIndex', '_findLock',
 '_stockLocks', '_lockLines'].forEach(n => vm.runInContext(fnSrc(n), caja));
vm.runInContext('var materialLocks = []; var _locksByKey = {};', caja);

// Y la celda de Location EXTRAÍDA DE renderStock, no reescrita aquí. Copiarla
// habría hecho que esta prueba siguiera en verde con el template roto, que es
// justo el fallo que vengo persiguiendo.
const REN = fnSrc('renderStock');
const preparacion = REN.match(/var locTxt\s*=[\s\S]*?var locTip\s*=[\s\S]*?;\n/);
const celda = REN.match(/location:\s*('<td class="sc-location"[\s\S]*?<\/td>')/);
check('la celda de Location se pudo sacar de renderStock', !!celda);
check('...y también las cuatro líneas que la preparan', !!preparacion);

function pintar(s){
  vm.runInContext('var s = ' + JSON.stringify(s) + ';', caja);
  vm.runInContext(preparacion[0], caja);
  return vm.runInContext(celda[1], caja);
}
function trabar(locks){
  vm.runInContext('materialLocks = ' + JSON.stringify(locks) + '; _rebuildLocksIndex();', caja);
}

const MH = { matId: 'WINDOW|||MH 145', category: 'WINDOW', name: 'MH 145',
             warehouseLocs: { 'B2A': 51 } };

console.log('\n═══ mitad 1: el candado se VE en la tabla del dashboard ═══\n');
{
  trabar([]);
  const limpio = pintar(MH);
  check('sin candado, la celda es la de siempre — B2A (51) y nada más',
    limpio.indexOf('sc-lock') === -1 && limpio.indexOf('B2A (51)') !== -1, limpio);

  trabar([{ id: 'L1', matId: MH.matId, rack: 'B2A', allowedDest: [],
            reason: 'Awaiting QC', lockedBy: 'jose@ox-glass.com' }]);
  const trabado = pintar(MH);
  check('con candado, la celda lo enseña', trabado.indexOf('sc-lock') !== -1, trabado);
  check('...y el candado es un candado, no una palabra', trabado.indexOf('🔒') !== -1);

  // La razón de que vaya delante, y no es estética: la celda lleva
  // text-overflow:ellipsis, así que lo que va al final es lo primero que
  // desaparece — precisamente en las filas con más estantes.
  //
  // Se mide en el CUERPO de la celda, no en la cadena entera: el title también
  // dice "B2A (51)" y va antes que todo, así que compararlos en el <td> entero
  // daba un fallo que no existía. Primer intento de esta prueba, corregido.
  const cuerpo = trabado.slice(trabado.indexOf('>') + 1);
  check('el candado va DELANTE del texto, donde el recorte no se lo come',
    cuerpo.indexOf('sc-lock') < cuerpo.indexOf('B2A (51)'), cuerpo);
  check('...y la celda sigue recortando con puntos suspensivos',
    /text-overflow:ellipsis/.test(trabado));
}

console.log('\n═══ un candado sobre un estante vacío no bloquea nada ═══\n');
{
  // No es un detalle: marcar candados que ya no impiden nada es enseñar a no
  // creerle al candado, que es el mismo daño que hacía la campana que decía 3.
  trabar([{ id: 'L1', matId: MH.matId, rack: 'C9C', allowedDest: [],
            reason: 'viejo', lockedBy: 'x@y.com' }]);
  check('candado en un estante donde este material ya no tiene nada → sin marca',
    pintar(MH).indexOf('sc-lock') === -1);

  trabar([{ id: 'L1', matId: 'WINDOW|||OTRA COSA', rack: 'B2A', allowedDest: [],
            reason: 'de otro', lockedBy: 'x@y.com' }]);
  check('candado de OTRO material en el mismo estante → sin marca',
    pintar(MH).indexOf('sc-lock') === -1);

  // El candado traba (material, estante), no el estante entero — está escrito
  // así en Code_v3_fixed.gs, sobre MATERIAL_LOCKS.
  check('...y eso es lo que dice el backend: traba el par, no el estante',
    /NOT the whole rack, NOT the whole\s*\n?\/\/ material/.test(GS) ||
    /Locks a specific \(material, rack\) pair/.test(GS));
}

console.log('\n═══ el motivo está al pasar el mouse ═══\n');
{
  trabar([{ id: 'L1', matId: MH.matId, rack: 'B2A', allowedDest: [],
            reason: 'Awaiting QC', lockedBy: 'jose@ox-glass.com' }]);
  const t = pintar(MH);
  const title = /title="([^"]*)"/.exec(t)[1];

  check('el motivo sale en el title', title.indexOf('Awaiting QC') !== -1, title);
  check('...y quién lo trabó', title.indexOf('jose@ox-glass.com') !== -1);
  check('...y en qué estante', title.indexOf('B2A') !== -1);

  // Lo que de verdad impide, en las palabras de lo que impide. Está en
  // Code_v3_fixed.gs: EXIT y WASTE siempre bloqueados desde ese estante.
  check('dice que no se puede sacar ni desperdiciar',
    /No exits, no waste/.test(title), title);
  check('con lista vacía dice que SÍ se puede mover dentro de la bodega — una ' +
        'lista vacía no es "nada", es "muévelo donde quieras pero no lo saques"',
    /Can be moved to any rack, but not taken out/.test(title), title);

  // Y que el hover no PERDIÓ lo que ya daba. Añadir información no puede
  // costar la que había.
  check('el title sigue trayendo el resumen de estantes que ya traía',
    title.indexOf('B2A (51)') !== -1, title);
}

console.log('\n═══ con destinos permitidos, dice a cuáles ═══\n');
{
  trabar([{ id: 'L1', matId: MH.matId, rack: 'B2A', allowedDest: ['A3A', 'C1B'],
            reason: 'Job 2210', lockedBy: 'jose@ox-glass.com' }]);
  const title = /title="([^"]*)"/.exec(pintar(MH))[1];
  check('nombra los destinos, que es la parte con la que se puede actuar',
    /Can only be moved to: A3A, C1B/.test(title), title);
  check('...y ya no dice "a cualquier estante", que sería falso',
    !/any rack/.test(title));
}

console.log('\n═══ dos estantes trabados, dos líneas ═══\n');
{
  const dos = { matId: MH.matId, category: 'WINDOW', name: 'MH 145',
                warehouseLocs: { 'B2A': 20, 'A3A': 31 } };
  trabar([
    { id: 'L1', matId: MH.matId, rack: 'B2A', allowedDest: [], reason: 'QC',      lockedBy: 'a@b.com' },
    { id: 'L2', matId: MH.matId, rack: 'A3A', allowedDest: [], reason: 'Damaged', lockedBy: 'c@d.com' }
  ]);
  const title = /title="([^"]*)"/.exec(pintar(dos))[1];
  check('los dos motivos salen, no sólo el primero',
    title.indexOf('QC') !== -1 && title.indexOf('Damaged') !== -1, title);
  check('...uno por línea', (title.match(/Locked at/g) || []).length === 2);
  check('un solo candado en la celda aunque sean dos — el dibujo dice "algo ' +
        'está trabado" y el hover dice qué',
    (pintar(dos).match(/sc-lock/g) || []).length === 1);
}

console.log('\n═══ el estante se escribe como se escriba ═══\n');
{
  // _normKey, no nt: es la que copia lo que hace el backend. Con nt, un
  // candado guardado como "b-2a" no encontraría nunca su estante y el candado
  // sería invisible sin que nada fallara.
  trabar([{ id: 'L1', matId: MH.matId, rack: ' b2a ', allowedDest: [],
            reason: 'QC', lockedBy: 'a@b.com' }]);
  check('un candado guardado en minúsculas y con espacios encuentra su estante',
    pintar(MH).indexOf('sc-lock') !== -1);
  check('...y el índice usa _normKey, que es la que imita al backend',
    /_locksByKey\[l\.matId \+ '\|\|\|' \+ _normKey\(l\.rack\)\]/.test(HTML));
}

console.log('\n═══ el motivo lo escribe una persona ═══\n');
{
  trabar([{ id: 'L1', matId: MH.matId, rack: 'B2A', allowedDest: [],
            reason: 'Job "2210" <urgent>', lockedBy: 'a@b.com' }]);
  const t = pintar(MH);
  // Una comilla sin escapar cierra el atributo y el resto del title se
  // convierte en atributos sueltos del <td>.
  check('una comilla en el motivo no rompe el atributo',
    t.indexOf('Job &quot;2210&quot;') !== -1, t);
  check('...y un < tampoco abre una etiqueta',
    t.indexOf('&lt;urgent&gt;') !== -1 || t.indexOf('&lt;urgent>') !== -1, t);
  check('la celda sigue siendo UNA celda bien cerrada',
    (t.match(/<td/g) || []).length === 1 && t.trim().endsWith('</td>'));
}

console.log('\n═══ y existe el estilo del candado ═══\n');
{
  check('.sc-lock está definido en la hoja de estilos', /\.sc-lock\{/.test(HTML));
  check('...con cursor:help, porque lo que explica está en el hover',
    /\.sc-lock\{[^}]*cursor:help/.test(HTML));
}

console.log('\n═══ mitad 2: el candado LLEGA a la otra sesión ═══\n');
{
  const m = /var DATA_STAMP_ACTIONS = \{([\s\S]*?)\};/.exec(GS);
  const dentro = m ? (m[1].match(/^\s*([A-Za-z]+):/gm) || []).map(s => s.trim().replace(':', '')) : [];
  check('lockMaterial mueve el sello', dentro.indexOf('lockMaterial') !== -1, dentro);
  check('unlockMaterial también — si no, el candado se queda puesto en la ' +
        'pantalla del otro para siempre',
    dentro.indexOf('unlockMaterial') !== -1, dentro);

  // La razón vieja no puede quedarse escrita al lado de la decisión contraria:
  // un comentario que contradice al código es la forma en que esto vuelve.
  check('ya no queda escrita la razón vieja ("no cuánto hay") junto a los candados',
    !/lockMaterial, unlockMaterial\s+—\s+cambian permisos/.test(GS));

  // Y la otra mitad del viaje: que cuando la otra sesión pida los datos, le
  // lleguen los candados nuevos y no los de la caché de cinco minutos.
  check('lockMaterial limpia la caché de candados',
    /function lockMaterial[\s\S]*?remove\('materialLocksV1'\)[\s\S]*?\n\}/.test(GS));
  check('unlockMaterial también', /function unlockMaterial[\s\S]*?remove\('materialLocksV1'\)/.test(GS));
  check('...y la caché es la del script, compartida, no la de cada usuario',
    /function cacheGet_[\s\S]{0,200}CacheService\.getScriptCache\(\)/.test(GS));

  // Que los datos frescos se apliquen no basta: el índice que usa la tabla se
  // arma aparte, y sin rearmarlo la tabla seguiría mirando los candados viejos.
  const aplicar = fnSrc('_applyData');
  check('al llegar datos frescos se reconstruye el índice de candados',
    /materialLocks\s*=\s*data\.materialLocks/.test(aplicar) &&
    /_rebuildLocksIndex\(\)/.test(aplicar), aplicar.length);
}

console.log('\n────────────────────────────────────────────────────────────────────────');
console.log('Las dos mitades van juntas a propósito. Con el sello arreglado pero');
console.log('sin candado en la tabla, Jose habría vuelto a mirar la misma');
console.log('pantalla y a no ver nada; con el candado dibujado pero sin sello,');
console.log('lo vería sólo después de recargar a mano. Ninguna de las dos, sola,');
console.log('arregla lo que él reportó.');
console.log('────────────────────────────────────────────────────────────────────────\n');

console.log((fail ? 'lock visible: ' + fail + ' FAILED' : 'lock visible: ok (' + ok + ')') + '\n');
process.exit(fail ? 1 : 0);
