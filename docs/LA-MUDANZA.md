# La mudanza de la bodega — qué puede hacer la app hoy y qué falta

Jose, 25/11: *"estoy a cargo de mover todos los racks de una bodega a otra y
obviamente debo bajar y sacar todo de los racks A, B, C, P, O, X, y reinstalar
los racks en diferente orden. Actualmente los racks quedarán con las mismas
letras A, B, C, D y O, pero la A tendrá 10 bays y las demás sólo 5 cada una.
¿La app actualmente puede manejar el movimiento masivo de materiales entre
locaciones? ¿O hace falta algo más para hacerlo?"*

---

## La respuesta corta

**No. Hoy hay que hacerlo material por material, y falta una cosa concreta.**

Lo que la app tiene es un traslado **de un material** con varios pares
«estante de origen → estante de destino». Lo que tu mudanza necesita es el
revés: **un estante entero → otro estante**, con todo lo que haya dentro.

**Pero hay una buena noticia y conviene decirla primero: la app no te va a
dejar romper nada.** Borrar o renombrar un estante que todavía tiene material
**está bloqueado en el servidor**, no sólo en el botón: dice *«"P" no se puede
borrar — todavía tiene N unidades»*. Así que el peor caso de una mudanza —el
stock de un estante quedando huérfano bajo un nombre que ya no existe en ninguna
lista— no puede pasar.

---

## Lo que te costaría hoy, en número de pulsaciones

Para cada material que haya en cada estante que vacíes:

1. Abrir el cajón del estante.
2. Tocar el material → **⇄ Transfer**.
3. Escribir el estante de destino y la cantidad.
4. Guardar.

**Eso es una operación por material y por estante.** Si los seis estantes
(A, B, C, P, O, X) tienen, digamos, ocho materiales cada uno, son **48
traslados**, cada uno con su formulario. Y los vas a hacer de pie, con el
teléfono, mientras bajas pallets.

> Y hay un detalle que lo empeora: el traslado pide la cantidad **a mano**. Si
> en P hay 37 de algo, tienes que escribir 37. Un dedo que escriba 3 deja 34
> unidades en un estante que ya no existe.

---

## Lo que falta, y es una sola cosa

### «Vaciar un estante en otro»

Eliges **estante de origen** y **estante de destino**. La app lista **todo lo
que hay en el origen** con su cantidad **ya puesta**, y tú:

- **Destildas** lo que no se mueve (o lo que va a otro sitio).
- **Cambias la cantidad** sólo si el pallet se parte en dos.
- Pulsas una vez.

Y escribe **un traslado por material, en una sola escritura** — o se guardan
todos o no se guarda ninguno. Media mudanza registrada es peor que ninguna.

**Lo que ya existe y hace que esto sea pequeño:**

| Pieza | Dónde está ya |
|---|---|
| Escribir muchos movimientos en una escritura | `addMovementsBatch_`, que es lo que usan las entradas y salidas de varios materiales |
| Saber qué hay en un estante y cuánto | `warehouseLocs`, que es lo que ya pinta el cajón del estante |
| La pantalla de «varias filas con cantidad» | La de la salida de varios materiales, casi igual |
| El bloqueo de las reservas | `enforceMaterialLock_`, que ya se aplica a cada fila |

**Tamaño: mediano.** Un día con su prueba — y la prueba tiene que **ejecutar el
motor de stock** y comprobar que después de vaciar P en D, P queda a cero y D
tiene exactamente lo que tenía P. Ni una unidad de diferencia.

### Y dos cosas que hay que decidir dentro, porque son de almacén

1. **¿Qué pasa con el material reservado?** Un candado aparta material **en un
   estante**. Si ese estante desaparece, la reserva apunta a un sitio que no
   existe — es la **C** de `docs/LO-QUE-TIENE-QUE-CUADRAR.md`.
   **Mi propuesta:** que la reserva **se mueva con el material** al estante
   nuevo, y que se diga cuántas se movieron. Es lo que una persona espera: la
   reserva es del material para una obra, no del estante.
2. **¿Y las fotos de los estantes?** La foto de P es la de un estante que ya no
   va a existir. **Mi propuesta:** no tocarlas. Que las borre él cuando el
   estante de verdad desaparezca, que es cuando la foto deja de ser verdad —
   y borrar la locación ya se lleva su foto (v15.9).

---

## El orden que yo seguiría para la mudanza de verdad

Esto es sobre el almacén, no sobre el código, y es lo que haría yo en tu sitio:

### 1 · Antes de bajar un solo pallet: crea los estantes nuevos

En **Ajustes → Locations**, añade los bays nuevos: `A1`…`A10` y los cinco de
cada uno de los demás, con los nombres que vayan a tener de verdad. **No borres
nada todavía.** Durante la mudanza van a existir los viejos y los nuevos a la
vez, y eso está bien: es lo que de verdad está pasando.

### 2 · Mueve estante por estante, y en el mismo orden en que bajes los pallets

Vaciar **un estante entero de una vez** y comprobarlo antes de pasar al
siguiente. Si algo no cuadra, el error está en un estante, no repartido entre
seis.

### 3 · Y lo que NO hay que hacer, que es lo importante

- **No renombres los estantes viejos para «convertirlos» en los nuevos.** La app
  te lo va a bloquear mientras tengan material, y hace bien — pero el motivo
  hay que entenderlo: **renombrar un estante NO mueve el material**. Los
  movimientos siguen diciendo el nombre viejo. Lo que mueve material es un
  traslado.
- **No borres `P` ni `X` hasta que estén a cero.** La app también lo bloquea.
- **No «arregles» una cuenta con una entrada nueva.** Para corregir una cuenta
  se usa **ADJUST**. Es la regla de las 55 unidades.

### 4 · Cuando todo esté a cero, borra los que sobran

`P` y `X` fuera de la lista. Al borrarlos se van también sus fotos, que ya no
son verdad.

---

## Y una pregunta que sale de esto, para después

Tu mudanza deja una cosa a la vista: **el estante es texto libre en cada
movimiento.** No hay un «estante» como cosa con identidad propia, con sus bays
dentro. Por eso renombrar no mueve nada y por eso el mapa del almacén se dibuja
contando nombres.

Para lo que haces hoy no hace falta cambiarlo. Pero el día que una bodega tenga
dos racks que se llamen igual en zonas distintas, o que quieras mover un rack
entero sin tocar lo que tiene dentro, **esa es la pieza que falta**. Lo anoto y
no lo toco.
