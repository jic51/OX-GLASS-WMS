// ¿CORRE LA SUITE TODO LO QUE HAY ESCRITO?
//
// El 2026-09-21, contando a mano, seis pruebas de tools/ no estaban en la lista
// del README: test-reservas, test-reservas-tira, test-incoming-week,
// test-mazo-contador, test-pintar-al-confirmar y test-landing-verdad. Entre uno
// y cuatro días escritas, todas en verde, y ninguna dentro de "la suite". Se
// ejecutaban porque yo me acordaba de ejecutarlas.
//
// Eso no es una suite, es una costumbre. Una prueba que sólo corre cuando
// alguien se acuerda protege exactamente hasta el día que se le olvida — y ese
// día la protección no avisa de que se fue, porque lo que falta no falla.
//
// Es el mismo agujero que test-endpoint-auth describe para las funciones
// públicas, dicho en una línea: NADA CONTABA LAS PUERTAS. Allí eran funciones
// sin guardia; aquí son guardias sin lista.
//
// LO QUE HACE
//
//   1. Lista los ficheros tools/test-*.js que hay en el disco.
//   2. Lista los que el README manda ejecutar.
//   3. Falla si alguno está en el disco y no en la lista — o al revés, porque
//      una lista que nombra una prueba borrada manda a la gente a ejecutar algo
//      que no existe.
//
// LO QUE NO HACE: decidir si una prueba es buena. Sólo cuenta que esté.
//
// Uso:  node tools/check-suite.js

const fs = require('fs'), path = require('path');
const DIR = __dirname;

// Las que a propósito NO van en la suite, cada una con su razón escrita. Son
// cintas métricas, no pruebas: se ejecutan cuando cambia lo que miden, se leen
// los números y se decide. Meterlas en la suite la haría lenta y ruidosa sin
// hacerla más segura.
// (test-andamio.js NO está aquí: sí corre en la suite, y debe. Es la única
//  prueba cuyo sujeto es el andamio, y si el andamio miente mienten las demás.)
const FUERA = {
  'test-scale.js': 'cinta métrica: mide cuánto tarda calculateStock según crece ' +
                   'el archivo de una instalación. Se lee, no se aprueba.'
};

const enDisco = fs.readdirSync(DIR)
  .filter(f => /^test-.*\.js$/.test(f))
  .sort();

const readme = fs.readFileSync(path.join(DIR, 'README.md'), 'utf8');
// Sólo el bloque de comandos del principio: más abajo el README EXPLICA pruebas
// en prosa, y nombrarlas ahí no es ejecutarlas. Contar las menciones en vez de
// los comandos es el falso verde obvio de este fichero.
const bloque = (/```\n([\s\S]*?)\n```/.exec(readme) || [])[1] || '';
const enLista = new Set(
  (bloque.match(/node tools\/(test-[a-z0-9-]+\.js)/g) || [])
    .map(s => s.replace('node tools/', ''))
);

let fail = 0;
console.log('\n  ' + enDisco.length + ' pruebas en tools/, ' + enLista.size + ' en la suite\n');

const huerfanas = enDisco.filter(f => !enLista.has(f) && !FUERA[f]);
if (huerfanas.length) {
  fail++;
  console.log('  ✗ ESCRITAS Y NO EJECUTADAS — están en tools/ y no en la lista del README:');
  huerfanas.forEach(f => console.log('      · ' + f));
  console.log('\n    Una prueba fuera de la suite sólo corre cuando alguien se acuerda.');
  console.log('    Añádela al bloque de comandos del README, o ponla en FUERA de');
  console.log('    este fichero con la razón escrita.');
} else {
  console.log('  ok   toda prueba escrita está en la suite');
}

const fantasmas = [...enLista].filter(f => !fs.existsSync(path.join(DIR, f)));
if (fantasmas.length) {
  fail++;
  console.log('\n  ✗ EN LA LISTA Y NO EN EL DISCO:');
  fantasmas.forEach(f => console.log('      · ' + f));
  console.log('\n    La suite manda ejecutar algo que no existe. Si se borró la');
  console.log('    prueba, hay que borrarla también de la lista.');
} else {
  console.log('  ok   toda prueba de la lista existe');
}

const fueraDeSitio = Object.keys(FUERA).filter(f => !fs.existsSync(path.join(DIR, f)));
if (fueraDeSitio.length) {
  fail++;
  console.log('\n  ✗ EXCUSAS CADUCADAS — en FUERA y ya no existen: ' + fueraDeSitio.join(', '));
  console.log('    La lista de excepciones no puede ser un sitio donde aparcar cosas.');
} else if (Object.keys(FUERA).length) {
  const n = Object.keys(FUERA).length;
  console.log('  ok   ' + (n === 1 ? 'la excepción sigue existiendo y sigue argumentada'
                                   : 'las ' + n + ' excepciones siguen existiendo y argumentadas'));
}

console.log('\n' + (fail ? '✗ suite incompleta' : 'suite: ok') + '\n');
process.exit(fail ? 1 : 0);
