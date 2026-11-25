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
«locación de origen → locación de destino». Lo que tu mudanza necesita es el
revés: **una locación entera → otra locación**, con todo lo que haya dentro, y
con **cualquier par de bays** — `A1A → B1A`, `P1C → C3B` — no sólo estante a
estante.

**Y hay una segunda pregunta tuya que cambia el orden del trabajo:** *«¿cómo
creo otras locaciones si llevan los mismos nombres en otro lugar?»*. No se
puede: **en la app no pueden existir dos locaciones con el mismo nombre a la
vez.** La ruta que sí funciona está en el paso 2 de más abajo, y se puede hacer
hoy sin ninguna función nueva.

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

### «Vaciar una locación en otra» — de CUALQUIERA a CUALQUIERA

Lo había escrito como *«vaciar el estante P en el D»*, de estante a estante, y
Jose lo corrigió: **la unidad es el bay, y el par puede ser cualquiera.**
`A1A → B1A`, `P1C → C3B`, `D2B → A7C`. Sin reglas sobre qué letra puede ir a
qué letra: el origen y el destino salen del **mismo desplegable de locaciones**.

Eliges **locación de origen** y **locación de destino**. La app lista **todo lo
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
motor de stock**, no un doble, con **pares de bays de verdad** (`A1A → B1A` y
`P1C → C3B`, no sólo «origen → destino»): después de vaciar, el origen queda a
cero y el destino tiene exactamente lo que tenía el origen. Ni una unidad de
diferencia. Y tiene que comprobar que **las reservas del origen se sueltan** y
que el coste viaja con las unidades, igual que en el REASSIGN de uno.

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

### 1 · Lo que yo te dije antes estaba mal, y tú lo viste

Te dije *«crea los bays nuevos antes de bajar un solo pallet»*. **No se puede**,
y tu pregunta es exactamente por qué: *«¿cómo creo otras locaciones si llevan
los mismos nombres en otro lugar?»*. Tus estantes nuevos se llaman **A, B, C, D
y O** — las mismas letras de ahora. Y en la app **no pueden existir dos
locaciones con el mismo nombre a la vez**: el nombre ES la clave, y al guardar
la lista la segunda se descarta sin avisar.

Lo que sí es verdad, y es la parte que te ahorra trabajo: **la app no sabe dónde
está un estante. Sólo sabe su nombre.** Así que **un bay que se queda con su
nombre —A1A antes, A1A después— no necesita ningún movimiento**, aunque el acero
haya cruzado la ciudad. El choque de nombres sólo existe donde el nombre viejo y
el nuevo tienen que vivir **a la vez**, y eso pasa únicamente mientras el
material está en el bay viejo y el nuevo ya hace falta.

### 2 · El orden que sí funciona: UN nombre de paso, y UN solo estante al suelo

1. En **Ajustes → Locations**, crea **una** locación de paso con un nombre que no
   choque con nada: `FLOOR`, `STAGING` o `TRUCK`. Sale en el desplegable como
   cualquier otra.
2. **Baja al suelo SÓLO el estante A** —el que cambia de 5 bays a 10— moviendo
   su material a `FLOOR`.
3. Con los bays de A vacíos, ya **puedes borrar los que sobran y crear los
   nuevos** (A1A…A10C) en el mismo guardado. Sin choque: los viejos salen de la
   lista en el momento en que entran los nuevos.
4. Reinstala los estantes de verdad.
5. **Todo lo demás se mueve bay a bay, UNA sola vez:** `B1A → A3C`, `P1C → C3B`,
   lo que toque. El destino ya existe con su nombre final.
6. Vacía `FLOOR` hacia los bays nuevos y bórrala. Está vacía, así que la app te
   deja.

**Por qué un solo estante al suelo:** así **sólo ese** material se toca dos
veces. Si bajas los seis al suelo, pagas dos traslados por pallet en toda la
bodega.

Y vacía **un bay entero de una vez**, comprobándolo antes de pasar al siguiente.
Si algo no cuadra, el error está en un bay, no repartido entre seis.

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
