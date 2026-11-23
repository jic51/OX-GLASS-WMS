# Las cuatro ventanas de PAT.SEI902 — 23 de noviembre de 2026

Jose, 23/11, sobre reasignar a mano las filas de su captura: **«hazlo»**.

---

## Lo primero, y es honesto decirlo

**Yo no puedo pulsar el botón en tu hoja.** No tengo acceso a tu Google Sheet
ni a tu copia de la app: lo que escribo es el código, y lo que lo ejecuta sobre
tus datos eres tú. Si te hubiera dicho «hecho», te habría mentido sobre lo único
que importa aquí, que es si tu inventario quedó cuadrado.

**Lo que sí puedo hacer es dejarlo todo preparado**, con los números de tu
captura, para que sea escribir y pulsar — y decirte exactamente qué tiene que
salir después, para que lo compruebes y no te lo creas porque yo lo diga.

---

## Lo que dice tu captura, y lo que falta

De la imagen del 13/11 saqué esto:

| | |
|---|---|
| Material | `PAT.SEI902` |
| Se convirtió en | `MH 145` |
| Cantidad | **4** |
| Estaba en | `B2A` |
| Se registró como | un `TRANSFER` de `B2A` a `A3A` |

**Lo que NO puedo saber de la imagen, y necesito que me digas (o que escribas
tú al hacerlo):**

1. **La obra de la que salían.** El proyecto que tenía `PAT.SEI902`.
2. **La obra a la que fueron.** El proyecto de `MH 145`.
3. **Dónde están AHORA**, que según la captura es `A3A`.

Si prefieres no escribirme los nombres de las obras, no hace falta: los pone la
propia app cuando abras la ventana. El de origen lo rellena **sola** —lo lee del
stock, no te lo pregunta— y el de destino es el único que tecleas.

---

## Los pasos, tal cual

> **Antes de empezar: apunta dos números.** En el Stock Dashboard, busca
> `PAT.SEI902` y `MH 145` y escribe en un papel lo que dice cada uno. Al
> terminar tienen que haber cambiado en 4, y en direcciones contrarias. Si no
> apuntas el antes, el después no se puede comprobar.

1. **Pon la app en la v16.1** (los dos ficheros de `pegar/`).
2. **Stock Dashboard → busca el estante `A3A`** y ábrelo. Es donde están ahora.
3. **Toca `PAT.SEI902`** en ese cajón. Se abren sus opciones.
4. **Pulsa `⇅ Reassign`.**
5. Rellena:
   - **How many:** `4`
   - **On rack:** sale solo (`A3A`), no se puede cambiar — es donde está.
   - **They become — category:** la de `MH 145`
   - **They become — material:** `MH 145`
   - **For which job:** la obra de `MH 145`
   - **Why:** te propongo esto, palabra por palabra, porque dentro de un año es
     lo que explica las tres filas de octubre:

     ```
     Correction: these 4 were fitted on <OBRA NUEVA> and were recorded as a
     transfer B2A -> A3A on 13/11, before the app could record a reassignment.
     ```

6. **Pulsa `⇅ Reassign`.**

---

## Lo que tiene que pasar, y es lo que hay que comprobar

1. **`PAT.SEI902` baja 4** y **`MH 145` sube 4**, los dos en `A3A`.
2. **El total de la bodega no cambia.** Súmalos: tienen que dar lo mismo que
   antes. Si el total cambió, algo salió mal y **dímelo antes de tocar nada
   más**.
3. **Nada aparece como salido a una obra ni como desperdiciado.** No salió
   nada: las ventanas están en `A3A`.
4. En **Movements** hay **dos filas nuevas** con la insignia ámbar
   **⇅ REASSIGN**, cada una nombrando a la otra.
5. **Las tres filas del 13/11 siguen donde están.** Eso es a propósito: el
   histórico cuenta lo que pasó, incluido que se registró con la herramienta
   que había. Esto **añade** la corrección; no reescribe octubre.
6. **Si `PAT.SEI902` estaba reservado**, el aviso te lo dice **antes** de
   pulsar, y al guardar la reserva queda soltada con tu nombre en la auditoría.

---

## Y si algo no cuadra

**No lo arregles con una entrada ni con un traslado nuevo.** Para corregir una
cuenta se usa **ADJUST**, nunca una entrada — es la misma regla que las 55
unidades (`docs/LAS-55-UNIDADES.md`). Y antes de eso, dímelo: dos de las tres
cosas que podrían salir mal las vigila una prueba, y si una pasó de todos modos
quiero saber cuál.
