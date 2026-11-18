# Qué revisar en cada versión

Jose, 16/11: *"de aquí en adelante dame lo que tengo que revisar cada vez que
hagas un cambio o arreglo."*

Esto es ese documento, y se actualiza **con cada versión**. Lo de arriba es lo
último.

> **Cómo leerlo.** Cada punto dice **qué hacer**, **qué tiene que pasar** y, si
> lo hay, **qué sería el fallo**. Si algo no coincide, con decirme el número
> basta.
>
> **Y una regla honesta:** lo que yo compruebo con pruebas automáticas no hace
> falta que lo repases. Aquí sólo va lo que **sólo se ve usándolo** — con tus
> datos, en tu teléfono, con tu impresora.

---

## v15.7 — el estante que no existe, bien hecho

### 1 · No se cierra, no espera, no viaja

1. Haz una **entrada** y escribe un estante que **sí exista pero mal**: en
   minúscula y con espacios, por ejemplo `c 4 a` en vez de `C4A`.
2. Guarda.
3. **Tiene que pasar:** la pregunta sale **al instante**, la ventana **no se
   cierra**, y no hay varios segundos de nada.
4. Pulsa **«Use C4A»**.
5. **Tiene que pasar:** lo pone en el campo **y guarda**. Sin pedirte otro clic
   y sin decirte que lo escribas tú.

### 2 · Un estante que de verdad no existe

1. Lo mismo, con un nombre inventado (`ZZZ9`).
2. **Tiene que pasar:** te ofrece **crearlo**. Si aceptas, lo crea y guarda.

### 3 · Y lo de antes sigue en pie

Si el servidor rechaza un estante que esta pantalla sí conocía —porque alguien
lo borró mientras tanto— la ventana vuelve con todo dentro. Eso es la v15.6 y
no cambia.

---

## v15.6 — lo que salió al probar la v15.5

### 1 · El estante que no existe  🔴 *era un fallo mío de la v15.2*

1. Haz una **entrada** poniendo un estante **que no exista** (invéntate uno).
2. Guarda.
3. **Tiene que pasar:** la ventana **vuelve sola**, con todo lo que escribiste
   dentro, y el aviso dice qué pasa. Corriges el estante y guardas otra vez.
4. **Sería el fallo:** que salga el mensaje y no vuelva la ventana. Eso es lo
   que te pasó, y es lo que hizo que `LGI-DE-TOWNHOME2` figure como llegada y
   no exista ni en Movements ni en el stock.

Y la otra mitad, que tiene que seguir como estaba:

5. Si lo que falla es la **conexión**, la ventana **no** vuelve: el aviso trae
   **Retry** y reenvía. Ahí no hay nada que corregir.

### 2 · El motivo de la edición

1. **Movements → Edit** en cualquier movimiento.
2. **Tiene que pasar:** el cuadro de *«Reason for modification»* ocupa **todo
   el ancho** de su recuadro amarillo. Antes medía 203 px de los 689 que hay.

### 3 · Y de paso, mira esto cuando puedas

> **CORREGIDO EL 18/11.** Aquí decía que había que hacer esa entrada a mano, y
> **era un consejo equivocado**: Jose avisó de que el inventario ya cuenta los
> 55. En Acopio el stock **es la suma de los movimientos**, así que si los
> cuenta, la entrada existe — lo que falló fue encontrarla. Hacer otra habría
> sumado 55 que no llegaron.
>
> **Los pasos correctos están en `docs/LAS-55-UNIDADES.md`.** Y la regla que no
> hay que olvidar: para corregir una cuenta se usa **ADJUST**, nunca una entrada
> nueva.

---

## v15.5 — las cuatro del 16/11

### 1 · La entrega que ya llegó  🔴 *la importante*

1. Abre **Incoming** y edita una entrega que **ya esté en Arrived** — cambia
   sólo la nota.
2. **Tiene que pasar:** no aparece la casilla *«Make the entry»*. Guardas, y
   **no** se abre el formulario de entrada ni aparece ninguna tarjeta nueva de
   *«llegó y falta su entrada»* en la esquina.
3. **Sería el fallo:** que vuelva a ofrecerla. Eso es lo que permitía crear una
   entrada duplicada.

Y la otra mitad, que tiene que seguir funcionando igual:

4. Coge una entrega **Pending** y pásala a **Arrived**.
5. **Tiene que pasar:** sí aparece la casilla, y al guardar se abre el
   formulario de entrada como siempre.

### 2 · Volver a Incoming

1. Desde **Incoming**, marca una entrega como llegada y haz su entrada.
2. **Tiene que pasar:** al guardar, la app te deja **en Incoming**, no en
   Movements.

### 3 · El comentario al editar

1. **Movements → Edit** en cualquier movimiento.
2. **Tiene que pasar:** el cuadro de *Comments* es de unas cinco líneas y se
   puede estirar arrastrando la esquina. Antes eran 47 píxeles.

### 4 · La cabecera

1. Abre la app, espera a que cargue, y **guarda un edit**.
2. **Tiene que pasar:** la cabecera **no cambia de alto ni aparece el logo de
   golpe**. El logo tiene que estar desde el principio.
3. **Un aviso honesto:** la **primera** vez que abras la app en un navegador
   nuevo (o después de borrar los datos del sitio) el logo todavía puede llegar
   tarde — ahí no hay nada recordado. A partir de la segunda vez, no.

---

## v15.4 — la barra de Movements en el teléfono

1. Abre **Movements en el teléfono**.
2. **Tiene que pasar:** `+ Entry` y `− Exit` arriba, uno al lado del otro; el
   buscador debajo con **⚙ Filters** al lado; y **ya se ve algún movimiento sin
   bajar**.
3. Pulsa **⚙ Filters** → se abren los dos filtros, CSV y el historial antiguo.
4. Pon un filtro, cierra el panel: **el botón se enciende y lleva el número**, y
   vuelve a abrirse solo.
5. **En el ordenador:** la barra tiene que estar **exactamente igual** que antes
   — mismo orden, un solo renglón. Si ahí cambió algo, es un fallo.

---

## v15.3 — los movimientos como tarjetas en el teléfono

1. **Movements en el teléfono.**
2. **Tiene que pasar:** una tarjeta por movimiento, del ancho de la pantalla,
   **sin arrastrar de lado**. Arriba una banda de color según el tipo.
3. **Toca una tarjeta:** se abre con el resto de los datos *y* sus botones de
   Editar y Borrar.
4. **Marca una casilla:** eso **no** debe abrir la tarjeta.
5. **En el ordenador:** sigue siendo la misma tabla con las mismas columnas.

---

## v15.2 — cerrar al guardar

1. Haz una entrada y pulsa **Save**.
2. **Tiene que pasar:** la ventana se cierra **al momento** y el aviso aparece
   **abajo a la izquierda**.
3. **Si falla el guardado:** el aviso trae **Retry** (si fue la red) o **Fix**
   (si fue un dato). Pulsando **Fix**, la ventana vuelve **con todo lo que
   habías escrito dentro**. Eso es lo que hay que comprobar: que no se pierde
   nada.

---

## v15.1 — fotos

1. En una entrada, **📸 Camera** y haz una foto.
2. **Tiene que pasar:** tras confirmarla, **la cámara se abre sola** para la
   siguiente. Sales de la cámara cuando hayas terminado.
3. **Si tu teléfono no la reabre**, no es un fallo nuevo: algunos navegadores lo
   bloquean. Dímelo y lo dejamos con el botón.
4. **Arrastra una foto** sobre otra en la tira: cambian de orden, y ése es el
   orden de las páginas del PDF.

---

## v15.0 — el PDF de las fotos  🔴

1. Adjunta **dos o tres fotos apaisadas** de un albarán y guarda.
2. Abre el PDF.
3. **Tiene que pasar:** las fotos salen **derechas** y **ocupan casi toda la
   hoja** (la hoja sale apaisada si las fotos lo son).
4. Repite con **fotos verticales**: la hoja sale vertical y también se llena.
5. **Sería el fallo:** media hoja en blanco, o una foto de lado.

---

## Lo que yo ya compruebo, y no necesitas repasar

- Que la tabla del ordenador no se mueva al cambiar de filtro o de columnas.
- Que nada se desborde de lado en tres modelos de teléfono.
- Que los costes no se desvíen al mezclar entradas.
- Que la etiqueta impresa diga el estante que se guardó.
- Que la app siga en inglés y el changelog al día.

**211 ficheros de prueba.** Si alguno de esos se rompe, no llega a tus manos.
