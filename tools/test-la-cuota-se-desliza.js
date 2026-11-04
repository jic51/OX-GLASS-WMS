// LA VENTANA DE LA CUOTA SE DESLIZA, NO SE RENUEVA ENTERA.
//
// Jose, 3/11, con el registro de ejecuciones: el fichero de 600 filas no
// cargaba nunca. El error era NUESTRO —`requireQuota_`— y el guardia estaba
// mal medido de una forma que no se ve leyéndolo por encima:
//
//     cache.put(key, String(n + 1), windowSec);   // ← el plazo, ENTERO, otra vez
//
// `CacheService.put` con un plazo REINICIA la cuenta atrás de esa clave. Así
// que cada llamada que pasaba le regalaba al contador la ventana entera. No
// era «240 por minuto»: era **«un minuto de silencio y se borra»**. Mientras
// alguien siguiera usando la app, el contador nunca se reiniciaba.
//
// Uso:  node tools/test-la-cuota-se-desliza.js

const fs   = require('fs');
const path = require('path');
const A    = require('./andamio.js');

const GS = fs.readFileSync(path.join(__dirname, '..', 'Code_v3_fixed.gs'), 'utf8');

let ok = 0;
const fallos = [];
function check(etiqueta, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + etiqueta); return; }
  fallos.push(etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
  console.log('  ✗    ' + etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
}

/* Un CacheService de mentira que SÍ respeta los plazos, porque el plazo es
 * justo lo que esta prueba mide. El reloj lo movemos nosotros. */
let reloj = 1762300000000;       // ms
function nuevoCache(){
  const datos = new Map();       // clave → { valor, muereEn }
  return {
    get(k){
      const e = datos.get(k);
      if (!e || e.muereEn <= reloj) { datos.delete(k); return null; }
      return e.valor;
    },
    put(k, v, seg){ datos.set(k, { valor: v, muereEn: reloj + seg * 1000 }); },
    _datos: datos
  };
}

function montar(){
  const cache = nuevoCache();
  const ctx = {
    Date: { now: () => reloj },
    Math: Math,
    parseInt: parseInt,
    CacheService: { getScriptCache: () => cache },
    Utilities: { base64EncodeWebSafe: (x) => Buffer.from(String(x)).toString('base64') }
  };
  return { f: A.montar(ctx, GS, ['throttle_']).throttle_, cache: cache };
}

function avanzar(seg){ reloj += seg * 1000; }
/* El reloj es global y los bloques anteriores lo han movido. Para medir el
 * BORDE hay que empezar en el principio de un trozo, no a media distancia —
 * si no, «avanzar 59» puede caer en cualquier sitio y la prueba mide otra
 * cosa cada vez que se le añade un bloque antes. */
function alinear(windowSec){
  const paso = windowSec * 1000;
  reloj = Math.ceil(reloj / paso) * paso;
}

console.log('\n═══ EL FALLO DE JOSE, REPRODUCIDO ═══\n');

{
  /* Cien llamadas por minuto durante tres minutos, con un tope de 240/60s.
   * **En ningún minuto se pasa de 240.** Con la versión vieja, a los dos
   * minutos y medio se llegaba a 240 acumuladas y la app se cerraba sola. */
  const { f } = montar();
  let pasadas = 0, negadas = 0;
  for (let min = 0; min < 3; min++){
    for (let i = 0; i < 100; i++){
      if (f('pm', 'jose@ox.com', 240, 60)) pasadas++; else negadas++;
      avanzar(0.6);          // 100 llamadas repartidas en 60 s
    }
  }
  check('300 llamadas en tres minutos, sin pasar de 240 en ninguno: pasan todas',
    negadas === 0, { pasadas: pasadas, negadas: negadas });
}

console.log('\n═══ Y EL TECHO SIGUE SIENDO UN TECHO ═══\n');

{
  // Una avalancha de verdad: 300 de golpe con tope 240.
  const { f } = montar();
  let pasadas = 0;
  for (let i = 0; i < 300; i++) if (f('pm', 'ana@ox.com', 240, 60)) pasadas++;
  check('300 de golpe: pasan 240 y se para', pasadas === 240, pasadas);
}

{
  /* Y SE SUELTA SOLO. Con la versión vieja había que estarse quieto un minuto
   * ENTERO; y cada reintento del navegador —que es lo que hace -- renovaba el
   * castigo. Aquí basta con que pase el tiempo. */
  const { f } = montar();
  for (let i = 0; i < 300; i++) f('pm', 'luis@ox.com', 240, 60);
  check('tras la avalancha, está cerrado', f('pm', 'luis@ox.com', 240, 60) === false);
  avanzar(61);
  check('pasado el trozo, vuelve a dejar pasar', f('pm', 'luis@ox.com', 240, 60) === true);
}

{
  /* EL BORDE, que es por lo que se cuentan DOS trozos y no uno. Con trozos
   * sueltos se pueden meter 240 al final de uno y 240 al principio del
   * siguiente: 480 en un segundo, con un tope que dice 240. */
  alinear(60);                                   // al principio de un trozo
  const { f } = montar();
  avanzar(59);                                   // casi al final de ese trozo
  let a = 0; for (let i = 0; i < 240; i++) if (f('pm', 'eva@ox.com', 240, 60)) a++;
  avanzar(2);                                    // trozo siguiente
  let b = 0; for (let i = 0; i < 240; i++) if (f('pm', 'eva@ox.com', 240, 60)) b++;
  check('no se pueden meter 480 a caballo entre dos trozos', a + b < 400, { a: a, b: b });
  check('...pero tampoco se queda en cero: la ventana se va soltando', b > 0, b);
}

console.log('\n═══ Y NO SE PISAN ENTRE SÍ ═══\n');

{
  const { f } = montar();
  for (let i = 0; i < 240; i++) f('pm', 'jose@ox.com', 240, 60);
  check('el tope de una persona no cierra a la otra',
    f('pm', 'otra@ox.com', 240, 60) === true);
  check('...ni el de un tipo de operación cierra el de otro',
    f('init', 'jose@ox.com', 180, 300) === true);
}

console.log('\n═══ Y LA FORMA, QUE ES LO QUE SE ROMPIÓ ═══\n');

const src = (GS.match(/function throttle_[\s\S]*?\n\}/) || [''])[0];
check('el plazo YA NO se renueva con el valor de la ventana a secas',
  !/cache\.put\([^)]*,\s*windowSec\s*\)/.test(src), src.slice(-300));
check('la clave lleva el trozo de tiempo al que pertenece',
  /trozo/.test(src) && /_' \+ trozo/.test(src));
check('se mira también el trozo anterior, por el borde',
  /trozo - 1/.test(src));
check('...y pesa lo que le queda por salir de la ventana',
  /\(1 - dentro\)/.test(src));

/* Y el mensaje. El guardia es NUESTRO: decir sólo «too many requests» es un
 * mensaje de sistema sobre una decisión nuestra. */
check('el aviso dice de quién es el tope', /the app caps how many operations/.test(GS));
check('...que no se perdió nada', /Nothing \\\n?\s*'?\s*'?was lost|Nothing ' \+\s*'was lost|Nothing was lost/.test(GS));
check('...y cuánto esperar', /Wait about a minute/.test(GS));
check('y conserva «Too many requests», que es lo que el navegador busca para ' +
      'distinguir un «ocupado» de un «no»',
  /Too many requests/.test(GS) && /too many requests/i.test(fs.readFileSync(path.join(__dirname, '..', 'Index_v3_fixed.html'), 'utf8')));

if (fallos.length) {
  console.error('\nFALLÓ:\n  ' + fallos.join('\n  ') + '\n');
  console.error('  Un tope que se renueva en cada llamada no es una ventana:\n' +
                '  es «un minuto de silencio y se borra».\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
