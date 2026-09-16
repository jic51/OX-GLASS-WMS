#!/usr/bin/env node
/* ─────────────────────────────────────────────────────────────────────────────
   EL SELLO SE LEE ANTES QUE LOS DATOS. NUNCA DESPUÉS.

   Jose, 2026-09-16, con ocho minutos de grabación detrás:

     "el último movimiento que se elimina de una cuenta (del total de 13) NUNCA
      se actualiza en la otra cuenta, NUNCA — desde que terminó el video, lo
      comprimí, lo descargué y escribo esto, aún la cuenta que tiene el último
      movimiento que debería irse no se ha actualizado."

   No era lento. Era PERMANENTE, y la causa es el orden de dos lecturas.

   getInitialData leía el archivo entero y, al final, dentro del objeto que
   devuelve, leía el sello de datos. Si un borrado se confirmaba entre esas dos
   lecturas, el navegador se guardaba:

       la lista de movimientos de ANTES del borrado
       el sello de DESPUÉS

   Y el latido compara sellos. A partir de ese momento el suyo y el del
   servidor son IGUALES, así que concluye "no ha cambiado nada" y no vuelve a
   pedir datos nunca. La fila se queda en pantalla para siempre.

   POR QUÉ JUSTO EL ÚLTIMO DE LA TANDA. A los doce primeros los arregla la
   recarga que dispara el sello del siguiente borrado. El decimotercero no
   tiene ninguno detrás. Y desde la v11.96 es además el más lento —es el único
   que reconstruye las hojas derivadas, porque ya no viene nadie— así que su
   ventana es la más ancha de todas. La v11.96 no creó este fallo: lo dejó a la
   vista al quitar el ruido que lo tapaba.

   LA REGLA, Y POR QUÉ EL ORDEN NO ES SIMÉTRICO:

     sello DESPUÉS de los datos → sello nuevo con datos viejos → mentira que no
                                  se corrige sola. NUNCA.
     sello ANTES de los datos   → sello viejo con datos nuevos → una recarga de
                                  más. Se desperdicia un viaje, no la verdad.

   Aquí se ejecuta la carrera: un servidor de mentira que borra una fila JUSTO
   entre las dos lecturas, y se mira si el latido de la otra cuenta llega a
   enterarse alguna vez.
   ───────────────────────────────────────────────────────────────────────── */

const vm = require('vm');
const A  = require('./andamio.js');

const GS   = A.fuente('gs');
const HTML = A.fuente('html');
const m    = A.marcador('sello antes que datos');

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('la carrera, corrida en los dos órdenes');

/* Un servidor de juguete con lo único que importa: una lista de filas, un
   sello, y un momento en el que alguien borra. Las dos versiones de la lectura
   —la vieja y la nueva— se escriben aquí porque lo que se compara es el ORDEN,
   y el orden no se puede sacar del archivo sin traerse medio Code.gs. Lo que
   SÍ se saca del archivo es cuál de los dos usa el producto: eso se comprueba
   en la sección siguiente, y es lo que ata esta simulación a la realidad. */
function servidor(){
  return {
    filas: ['A', 'B', 'C'],
    sello: '100',
    borrar(f){
      this.filas = this.filas.filter(x => x !== f);
      this.sello = String(Number(this.sello) + 1);   // bumpDataStamp_
    }
  };
}

/** El orden VIEJO: primero los datos, el sello al final. */
function leerSelloDespues(srv, borrarEnMedio){
  const datos = srv.filas.slice();       // 1) se lee el archivo
  if (borrarEnMedio) srv.borrar('C');    //    …y alguien borra justo aquí
  return { movements: datos, dataStamp: srv.sello };   // 2) el sello, al final
}

/** El orden NUEVO: el sello primero, los datos después.
 *
 *  `cuando` dice en qué momento cae el borrado, porque una carrera no tiene un
 *  solo entrelazado y los dos hay que mirarlos:
 *    'medio' → entre las dos lecturas: los datos salen ya frescos
 *    'luego' → después de las dos: los datos salen viejos
 *  Lo que NO puede pasar en ninguno de los dos es quedarse con un sello más
 *  nuevo que los datos, y eso es lo único que hay que garantizar.
 */
function leerSelloAntes(srv, cuando){
  const sello = srv.sello;                      // 1) el sello
  if (cuando === 'medio') srv.borrar('C');
  const datos = srv.filas.slice();              // 2) el archivo
  if (cuando === 'luego') srv.borrar('C');
  return { movements: datos, dataStamp: sello };
}

/* El navegador de la OTRA cuenta: guarda lo que le llega y late. El latido es
   el de verdad, sacado del archivo — es quien decide si pedir datos otra vez, y
   es justo la decisión que el fallo envenenaba. */
function otraCuenta(){
  const visto = { recargas: 0 };
  const ctx = {
    Math, Date, String, Number,
    console: { log(){}, warn(){}, error(){} },
    _dataStamp: null,
    _loadBusy: false,
    _wq: [], _wqBusy: false, _delQueue: [], _delRunning: false,
    _lastPulseOk: null,
    renderActiveUsers: () => {},
    setConnStatus: () => {},
    document: { getElementById: () => null },
    loadDataFromGoogle: () => { visto.recargas++; },
    visto
  };
  const caja = A.montar(ctx, HTML, ['_pulseOk'],
    { dobles: ['renderActiveUsers', 'setConnStatus', 'loadDataFromGoogle'] });
  return {
    ctx: caja, visto,
    /** Aplica una respuesta de getInitialData, como hace loadDataFromGoogle. */
    aplicar(res){
      caja.pantalla = res.movements.slice();
      if (res.dataStamp) caja._dataStamp = res.dataStamp;
    },
    /** Un latido: el servidor le dice el sello de AHORA. */
    latir(srv){ caja._pulseOk({ users: null, stamp: srv.sello }); },
    pantalla(){ return caja.pantalla; }
  };
}

{
  /* EL FALLO, REPRODUCIDO. Con el sello al final, la otra cuenta se queda con
     la fila borrada en pantalla y el latido no la saca NUNCA. */
  const srv = servidor();
  const nav = otraCuenta();
  nav.aplicar(leerSelloDespues(srv, true));

  m.check('con el sello al final, la otra cuenta se queda con la fila borrada',
    nav.pantalla().indexOf('C') !== -1, nav.pantalla());
  m.check('...y su sello es el de DESPUÉS del borrado — datos viejos, sello nuevo',
    nav.ctx._dataStamp === srv.sello, { suyo: nav.ctx._dataStamp, servidor: srv.sello });

  for (let i = 0; i < 50; i++) nav.latir(srv);
  m.check('...así que cincuenta latidos después NO ha pedido datos ni una vez. ' +
          'Eso es el "NUNCA" de Jose, y no se arregla solo',
    nav.visto.recargas === 0, nav.visto.recargas);
}

{
  /* EL ARREGLO, EN EL ENTRELAZADO MALO: el borrado cae DESPUÉS de las dos lecturas, así que la
     foto sale vieja. Es el caso peor, y el que tiene que salvarse. */
  const srv = servidor();
  const nav = otraCuenta();
  nav.aplicar(leerSelloAntes(srv, 'luego'));

  m.check('con el sello al principio, la foto puede seguir siendo la vieja',
    nav.pantalla().indexOf('C') !== -1, nav.pantalla());
  m.check('...pero el sello guardado es el VIEJO, que es lo que salva la situación',
    nav.ctx._dataStamp !== srv.sello, { suyo: nav.ctx._dataStamp, servidor: srv.sello });

  nav.latir(srv);
  m.check('UN latido basta para que pida los datos otra vez',
    nav.visto.recargas === 1, nav.visto.recargas);

  // Y la recarga que llega trae la verdad.
  nav.aplicar(leerSelloAntes(srv, 'no'));
  m.check('...y esa recarga ya trae la fila fuera', nav.pantalla().indexOf('C') === -1,
    nav.pantalla());
  const antes = nav.visto.recargas;
  for (let i = 0; i < 50; i++) nav.latir(srv);
  m.check('...y a partir de ahí se queda quieta: no se recarga en bucle',
    nav.visto.recargas === antes, nav.visto.recargas - antes);
}

{
  // Sin nadie borrando, el orden nuevo no cambia nada: no se pide de más.
  const srv = servidor();
  const nav = otraCuenta();
  nav.aplicar(leerSelloAntes(srv, 'no'));
  for (let i = 0; i < 20; i++) nav.latir(srv);
  m.check('sin carrera, el orden nuevo no pide ni una recarga de más',
    nav.visto.recargas === 0, nav.visto.recargas);
}

{
  /* EL OTRO ENTRELAZADO: el borrado cae ENTRE las dos lecturas. Aquí los datos
     salen ya frescos —la fila viene fuera— y el sello viejo sólo cuesta una
     recarga de sobra. Escribí este archivo esperando que la foto saliera
     vieja en los dos casos; la prueba me corrigió, y este bloque existe para
     que quede dicho cuál es la garantía de verdad: EL SELLO GUARDADO NUNCA ES
     MÁS NUEVO QUE LOS DATOS GUARDADOS. Da igual dónde caiga el borrado. */
  const srv = servidor();
  const nav = otraCuenta();
  const res = leerSelloAntes(srv, 'medio');
  nav.aplicar(res);

  m.check('si el borrado cae entre las dos lecturas, la foto ya viene correcta',
    nav.pantalla().indexOf('C') === -1, nav.pantalla());
  m.check('...y el sello sigue siendo el viejo, así que nunca miente hacia el ' +
          'lado peligroso', nav.ctx._dataStamp !== srv.sello);
  nav.latir(srv);
  m.check('...cuesta una recarga de sobra, y nada más', nav.visto.recargas === 1);
}

{
  /* EL COSTE DEL ARREGLO, DICHO CON UN NÚMERO. Una recarga desperdiciada por
     carrera. Es lo que se paga, y hay que poder compararlo con lo que se
     evita: una pantalla que miente para siempre. */
  const srv = servidor();
  const nav = otraCuenta();
  nav.aplicar(leerSelloAntes(srv, 'luego'));
  nav.latir(srv);
  nav.aplicar(leerSelloAntes(srv, 'no'));
  m.check('el precio del arreglo es UNA recarga de más, y sólo cuando de ' +
          'verdad hubo una carrera', nav.visto.recargas === 1, nav.visto.recargas);
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('y el producto usa el orden bueno');

/* Lo de arriba prueba que el orden importa. Esto ata la prueba al archivo: que
   getInitialData de verdad lea el sello ANTES, y no vuelva a leerlo al final.
   Sin esta sección, la simulación podría seguir en verde con el producto
   roto. */
{
  const cuerpo = A.fnSrc(GS, 'getInitialData');
  m.check('getInitialData existe', !!cuerpo);

  const iSello  = cuerpo.indexOf('var selloAlEmpezar = dataStamp_();');
  const iArchivo = cuerpo.indexOf('archive.getDataRange().getValues()');
  m.check('lee el sello en una variable, al empezar', iSello !== -1);
  m.check('...ANTES de leer el archivo, que es toda la diferencia entre ' +
          '"una recarga de más" y "nunca"',
    iSello !== -1 && iArchivo !== -1 && iSello < iArchivo, { iSello, iArchivo });

  m.check('y lo que devuelve es esa variable, no una lectura nueva',
    /dataStamp:\s+selloAlEmpezar,/.test(cuerpo));

  /* LA COMPROBACIÓN QUE DE VERDAD PROTEGE. Una segunda llamada a dataStamp_()
     dentro de getInitialData volvería a meter el fallo sin tocar la línea de
     arriba — bastaría con que alguien "arreglara" el objeto devuelto. Que haya
     UNA sola, y sea la de arriba. */
  const lecturas = (cuerpo.match(/dataStamp_\(\)/g) || []).length;
  m.check('dentro de getInitialData el sello se lee UNA sola vez (' + lecturas + ')',
    lecturas === 1, lecturas);
}

{
  /* Y el latido sigue sin apuntarse el sello por su cuenta. Si lo hiciera, el
     arreglo de arriba no serviría de nada: daría el cambio por visto sin haber
     traído los datos. Es la lección de la v11.48, y aquí vuelve a hacer falta. */
  const pulso = A.fnSrc(HTML, '_pulseOk');
  m.check('el latido NO se apunta el sello — sólo lo compara',
    !/_dataStamp\s*=/.test(pulso));
  const carga = A.fnSrc(HTML, 'loadDataFromGoogle');
  m.check('quien lo apunta es la carga, cuando ya tiene los datos en la mano',
    /if \(data\.dataStamp\) _dataStamp = data\.dataStamp;/.test(carga));
}

m.fin();
