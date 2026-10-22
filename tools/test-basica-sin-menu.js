// LA GRATIS NO TIENE MENÚ, Y NADA PUEDE MANDAR A BUSCARLO.
//
// Jose, 21/10, con una captura de la hoja de la versión gratis:
//
//   *"Mira que en acopio basico sale que debo ir al menú Acopio pero el menú
//   Acopio no aparece, revisa eso."*
//
// Y no es que no aparezca: **no puede aparecer**. Un menú en la hoja necesita
// `script.container.ui`, que es un permiso SENSIBLE y que la edición gratis no
// pide a propósito — pedirlo es exactamente lo que trae la pantalla de aviso de
// Google que esta edición existe para evitar.
//
// `onOpen` ya se callaba por eso desde que la gratis existe. Lo que se quedó sin
// cambiar fue el TEXTO que la hoja escribe al aceptar los términos, que seguía
// diciendo «abre el menú Acopio y elige Set Up». Dos sitios que tenían que decir
// lo mismo sin que nada lo obligara — la falta de siempre, esta vez entre un
// permiso y una frase.
//
// ── Y HAY UNA SEGUNDA MITAD, QUE ES LA QUE DE VERDAD CONFUNDÍA ──────────────
//
// En la gratis **no hay «Set Up» ninguno**. El asistente crea carpetas en Drive
// y registra usuarios: las dos cosas que esa edición no tiene. `getSetupState`
// contesta `needsSetup:false` para que la app abra directa en el inventario.
//
// Así que la frase no sólo señalaba un menú que no existe: señalaba un PASO que
// no existe. El nombre de la empresa se pone dentro de la app, en
// Settings → Name & Logo, y eso es lo que el texto tiene que decir.
//
// Uso:  node tools/test-basica-sin-menu.js

const path = require('path');
const A  = require(path.join(__dirname, 'andamio.js'));
const GS = A.fuente('gs');
const codigo = A.sinComentarios(GS);

let ok = 0; const fails = [];
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + label); }
  else { fails.push(label + (extra === undefined ? '' : ' → ' + JSON.stringify(extra)));
         console.log('  FALLA ' + label + (extra === undefined ? '' : '  → ' + JSON.stringify(extra))); }
}

/* SE MIRA EL CÓDIGO SIN COMENTARIOS, y no es un detalle: la explicación de
 * arriba nombra el menú y el permiso para contar por qué no están. Buscar en
 * crudo encontraría esa prosa y la tomaría por el delito. Ya pasó tres veces en
 * este proyecto. */

console.log('\n═══ 1. El permiso que haría falta NO se pide ═══\n');

const manifiesto = require('fs').readFileSync(
  path.join(__dirname, '..', 'appsscript.basic.json'), 'utf8');

check('el manifiesto de la gratis NO pide `script.container.ui` — es el ' +
      'permiso sensible que trae la pantalla de aviso de Google, y evitarlo es ' +
      'la razón de ser de esta edición',
  manifiesto.indexOf('container.ui') === -1);
check('...y sigue pidiendo sólo el de esta hoja',
  /spreadsheets\.currentonly/.test(manifiesto));

console.log('\n═══ 2. El menú se calla, que es la consecuencia ═══\n');

const onOpen = A.sinComentarios(A.fnSrc(GS, 'onOpen') || '');
check('`onOpen` existe', !!onOpen);
check('y lo PRIMERO que hace es callarse en la gratis — sin esto, abrir la hoja ' +
      'le enseñaría un error al cliente en su primer minuto',
  /if\s*\(\s*basicApagado_\(\)\s*\)\s*return/.test(onOpen));

console.log('\n═══ 3. NADA manda a buscar el menú en la gratis ═══\n');

/* LA COMPROBACIÓN QUE PEDÍA JOSE, y es la que no existía. Se buscan las frases
 * que mandan al menú y se comprueba que cada una esté detrás de la guardia de
 * edición — o sea, que ninguna pueda llegarle a alguien que no tiene menú. */
const onEdit = A.sinComentarios(A.fnSrc(GS, 'onEdit') || '');
check('`onEdit` existe — es quien escribe el paso siguiente al aceptar los ' +
      'términos', !!onEdit);

const mandaAlMenu = /menu at the top|use the "🏭|Set Up/;
check('`onEdit` sí tiene una rama para la gratis', /basicApagado_\(\)/.test(onEdit));

/* Se parte la función por la guardia: lo que viene ANTES del `return` de la
 * rama básica es lo que ve todo el mundo, y ahí no puede haber ninguna frase
 * sobre el menú. */
const corte = onEdit.indexOf('basicApagado_()');
const antes = onEdit.slice(0, corte);
check('y antes de esa rama NO se nombra el menú — lo que está antes lo lee ' +
      'todo el mundo, incluida la gratis',
  !mandaAlMenu.test(antes), antes.slice(-160));

/* Y la rama de la gratis tiene que decir las dos cosas que de verdad hacen
 * falta: que aquí NO hay menú, y dónde se hace lo que el menú haría. */
const ramaBasica = onEdit.slice(corte, onEdit.indexOf('return;', corte) + 7);
check('la rama de la gratis dice en voz alta que NO hay menú — es la frase que ' +
      'le faltaba a Jose delante',
  /no menu|NO menu/i.test(ramaBasica), ramaBasica.slice(0, 200));
check('...y manda a desplegar la app, que es el paso siguiente de verdad',
  /Deploy|deploy/.test(ramaBasica));
check('...y dice dónde se pone el nombre de la empresa, porque en esta edición ' +
      'no hay asistente que lo pregunte',
  /Name & Logo/.test(ramaBasica));

console.log('\n═══ 4. Tampoco se empuja a un «Set Up» que no existe ═══\n');

/* `getSetupState` contesta `needsSetup:false` en la gratis, así que
 * `setupComplete` NUNCA llega a ser cierto ahí. Un recordatorio colgado de esa
 * condición saldría para siempre, pidiendo algo que no se puede hacer — y un
 * aviso que no se puede satisfacer enseña a ignorar los avisos. */
const nudge = A.sinComentarios(A.fnSrc(GS, 'onChange') || A.fnSrc(GS, 'nudgeSetup_') || '');
const conNudge = nudge || codigo;
check('el recordatorio de «setup has not been done yet» se calla en la gratis',
  /basicApagado_\(\)\s*\)\s*return;[\s\S]{0,400}Setup has not been done yet/.test(conNudge));

const setupState = A.sinComentarios(A.fnSrc(GS, 'getSetupState') || '');
check('y `getSetupState` sigue contestando que no hace falta instalar nada — ' +
      'es lo que hace que la app abra directa en el inventario',
  /basicApagado_\(\)[\s\S]{0,120}needsSetup:\s*false/.test(setupState));

console.log('\n═══ 5. Y la hoja no describe un asistente que no existe ═══\n');

/* Jose, 22/10, mirando la hoja ya corregida: *"ahora el texto no habla del menú
 * Acopio porque no lo hay, PERO en el texto escrito dentro del sheet sí habla
 * sobre los materiales y las locaciones dentro del instalador"*.
 *
 * Es la misma falta una línea más abajo. «Lo que pasa después» describía los
 * tres pasos del ASISTENTE —nombre y logo, qué guardas y dónde, quién trabaja
 * aquí— y en la gratis no hay asistente. Y el pie prometía que esta hoja
 * «desaparece sola cuando termine la instalación», que es algo que hace el
 * asistente: sin él se queda ahí para siempre.
 *
 * Son detalles pequeños, y por eso importan: una promesa que no se cumple en el
 * primer minuto hace dudar de todo lo demás. */
const plantilla = A.sinComentarios(A.fnSrc(GS, 'buildStartHereSheet_') ||
                                   A.fnSrc(GS, 'writeStartHere_') || codigo);

check('los tres pasos de «lo que pasa después» tienen rama para la gratis',
  /basicApagado_\(\)[\s\S]{0,300}deploy the app/i.test(plantilla));
check('...y en esa rama NO se habla de lo que guardas ni de dónde, que es lo ' +
      'que pregunta el asistente',
  !/basicApagado_\(\)[\s\S]{0,300}what you store/i.test(plantilla));
check('...ni de registrar a la gente que trabaja aquí, que es la otra mitad ' +
      'del asistente',
  !/basicApagado_\(\)[\s\S]{0,300}people who work/i.test(plantilla));
check('y dice dónde se pone el nombre, que es lo único de los tres pasos que ' +
      'sí se puede hacer en la gratis',
  /basicApagado_\(\)[\s\S]{0,400}Name & Logo/.test(plantilla));

check('la hoja ya no promete desaparecer sola en la gratis — eso lo hace el ' +
      'asistente, y ahí no hay',
  /basicApagado_\(\)[\s\S]{0,160}hide this tab/i.test(plantilla));
check('...pero en la de pago lo sigue diciendo, porque ahí sí pasa',
  /disappears by itself/.test(plantilla));

console.log('\n═══ 6. La prueba muerde ═══\n');

/* Si el buscador de frases no reconociera la que había, el verde de arriba no
 * miraría nada. Éste es el texto exacto que Jose tenía delante. */
check('reconoce la frase que estaba en la hoja de Jose',
  mandaAlMenu.test('→ Now open the  🏭 Acopio  menu at the top of this window ' +
                   'and choose  "🚀 Set Up Acopio".'));
check('...y deja en paz una frase que no habla del menú',
  !mandaAlMenu.test('Go to the "👉 START HERE" tab at the bottom of this window.'));

if (fails.length){ console.error('\nFALLÓ:\n  ' + fails.join('\n  ')); process.exit(1); }
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
