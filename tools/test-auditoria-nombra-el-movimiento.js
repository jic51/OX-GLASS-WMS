// EL REGISTRO DE AUDITORÍA TIENE QUE DECIR QUÉ MOVIMIENTO, NO QUÉ FILA.
//
// Encontrado el 27/10 buscando cómo saber qué filas de una importación se
// habían editado después. La respuesta debería estar en el registro de
// auditoría, y estaba escrita así:
//
//     auditLog_(ss, 'MODIFY_MOVEMENT', auth.email,
//       'Row ' + rowIdx + ' | Reason: ' + reason, ...)
//
// ── POR QUÉ ESO ESTABA MAL ──────────────────────────────────────────────────
//
// Es el mismo fallo que la columna MOV_ID vino a arreglar en septiembre, vivo
// en el único sitio que nadie volvió a mirar. Un número de fila se mueve: el
// archivado nocturno reescribe las dos hojas enteras, y borrar una fila levanta
// todas las de abajo. Una línea que dice «se modificó la fila 814» apunta, al
// día siguiente, a OTRO movimiento.
//
// Y el registro de auditoría es justo donde eso no puede pasar: se lee meses
// después, para contestar «¿quién tocó esto?». Un registro que señala mal es
// peor que no tenerlo — no tenerlo obliga a investigar; tenerlo equivocado hace
// creer que ya se investigó.
//
// ── QUÉ COMPRUEBA, Y CÓMO ───────────────────────────────────────────────────
//
// Esta prueba NO abre un navegador ni toca una hoja: lee el código y comprueba
// la forma de la llamada. Es suficiente, porque lo que se puede romper aquí es
// que alguien vuelva a escribir el número de fila a secas.
//
// Uso:  node tools/test-auditoria-nombra-el-movimiento.js

const fs   = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const src  = fs.readFileSync(path.join(RAIZ, 'Code_v3_fixed.gs'), 'utf8');

let ok = 0;
const fallos = [];
function check(etiqueta, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + etiqueta); return; }
  fallos.push(etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
  console.log('  ✗    ' + etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
}

console.log('\n═══ la línea de MODIFY_MOVEMENT nombra el movimiento ═══\n');

// El bloque entero de la llamada, desde el nombre de la acción hasta su cierre.
const bloque = (/auditLog_\(\s*ss,\s*'MODIFY_MOVEMENT'[\s\S]{0,400}?\);/.exec(src) || [])[0] || '';

check('se encontró la llamada a auditLog_ con MODIFY_MOVEMENT', !!bloque);

if (!bloque) {
  console.error('\nFALLÓ: no está la llamada. Si se renombró la acción, actualiza\n' +
                '  esta prueba — lo que vigila sigue haciendo falta.\n');
  process.exit(1);
}

check('la línea incluye el id del movimiento (AC.MOV_ID)',
  /AC\.MOV_ID/.test(bloque) || /idEditado/.test(bloque), bloque.slice(0, 160));

/* Que el id venga de la fila que se está editando y no de otro sitio. Es la
 * diferencia entre «dice un id» y «dice EL id», y es la única forma de que esto
 * no se quede verde con un id cualquiera pegado delante. */
const dondeSale = (/var\s+idEditado\s*=\s*String\(([^)]*)\)/.exec(src) || [])[1] || '';
check('ese id sale de la fila que se está editando',
  /rowVals\s*\[\s*AC\.MOV_ID\s*\]/.test(dondeSale), dondeSale.trim());

console.log('\n═══ y el número de fila ya no va solo ═══\n');

/* El fallo que esto impide volver a cometer: el texto de antes, tal cual. Se
 * admite dentro de la rama del `||` —una fila sin id, de antes del relleno de
 * septiembre, no tiene otra cosa que decir— pero no como ÚNICA forma. */
const soloFila = /'Row\s*'\s*\+\s*rowIdx\s*\+\s*'\s*\|\s*Reason/.test(bloque);
const conId    = /idEditado\s*\?/.test(bloque);
check('el número de fila a secas ya no es la única forma',
  !soloFila || conId, { soloFila: soloFila, conId: conId });

check('la fila se conserva como contexto, entre paréntesis',
  /\(row\s*'\s*\+\s*rowIdx/.test(bloque) || /row '\s*\+\s*rowIdx/.test(bloque),
  bloque.slice(0, 200));

console.log('\n═══ y MOV_ID no es un campo que el usuario pueda editar ═══\n');

/* LO QUE SOSTIENE TODO LO DEMÁS. Si el id del movimiento se pudiera cambiar
 * desde el formulario, apuntar con él no sería mejor que apuntar con el número
 * de fila: las dos cosas se moverían. El mapa de campos editables de
 * modifyMovement es la lista corta de lo que se puede tocar, y MOV_ID no está
 * — ni debe estar nunca. */
const mapaEditables = (/var\s+CAMPOS[\s\S]{0,1200}?\n\s*\};/.exec(src) || [])[0] ||
                      (/dateRec:\s*\{\s*col:\s*AC\.DATE_REC[\s\S]{0,1200}?\n\s*\};/.exec(src) || [])[0] || '';
check('se encontró el mapa de campos editables', !!mapaEditables);
check('MOV_ID no está entre los campos editables',
  !!mapaEditables && !/col:\s*AC\.MOV_ID/.test(mapaEditables));

if (fallos.length) {
  console.error('\nFALLÓ:\n  ' + fallos.join('\n  ') + '\n');
  console.error('  Una línea de auditoría que señala un número de fila señala,\n' +
                '  al día siguiente, a otro movimiento.\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
