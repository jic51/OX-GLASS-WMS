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

> ## 👉 Si acabas de instalar la v16.3, empieza por `docs/CHECKLIST-v16.3.md`
>
> Jose, 25/11: *"al final dame lo que checkar."* De la v15.8 a la v16.3 son seis
> versiones **y un solo archivo**, así que leer seis bloques es repetir trabajo.
> Ese documento es **una sola pasada**, sin repetir nada, en el orden que yo
> seguiría: primero lo que más duele si está roto.
>
> Lo de abajo se queda versión por versión, que es lo que sirve cuando algo
> falla y hace falta saber de dónde viene.

---

## v16.3 — volver de la obra y reasignar, en una acción

### 1 · El atajo que pediste  🔴

1. Coge un material que **tenga unidades fuera, en una obra** (que su barra
   muestre algo en *Out on a job*).
2. Ábrelo desde su estante y pulsa **⇅ Reassign**.
3. **Tiene que pasar:** arriba hay un desplegable nuevo, **Where they are now**,
   con dos opciones. Elige **Coming back from a job**.
4. **Tiene que pasar:** el campo del estante **se puede escribir** —ahora es *a
   dónde vuelven*— el tope de la cantidad pasa a ser **lo que hay fuera**, y sale
   una nota que dice que va a escribir **tres filas**.
5. Rellena y guarda.
6. **Comprueba los tres números:** lo que había **fuera** baja esa cantidad; el
   material **nuevo** sube esa cantidad en ese estante; y el material viejo
   queda igual que estaba en la bodega (entró y salió en el mismo acto).
7. En **Movements** tienen que estar **tres filas**: un **RETURN** al estante y
   las **dos de REASSIGN**. La del return dice de qué obra volvieron.

### 2 · Que el atajo no se cuele donde no toca

1. Coge un material **sin nada fuera** y pulsa Reassign.
2. **Tiene que pasar:** el desplegable **no aparece**. Ofrecerlo con cero fuera
   sería ofrecerte una respuesta que la app va a rechazar un segundo después.
3. Y reasignando normal (material en su estante) siguen siendo **dos filas**,
   sin ninguna devolución inventada.

### 3 · Y una columna que estaba vacía  🟠 *fallo mío de la v16.1*

1. Mira una reasignación **de las que hiciste con la v16.1 o la v16.2**, en la
   hoja, columna **Left Over From**.
2. Estaba **vacía**: la app pasaba el dato y el escritor de filas lo tiraba. El
   rastro legible nunca se perdió —el motivo de cada fila nombra a la otra y la
   obra— pero la columna por la que agrupan los informes sí.
3. **De la v16.3 en adelante se escribe.** Las de antes se quedan vacías: no voy
   a reescribir tu histórico por una columna. Si alguna te hace falta agrupada,
   dímelo y vemos.

---

## v16.2 — corregir una entrega ofrece corregir su entrada

### 1 · La oferta que pediste  🔴

1. Coge una entrega **que ya tenga su entrada** (lleva su ✓ entry al lado) y
   **cámbiale un dato** — el PO, el proveedor, la cantidad. Guarda.
2. **Tiene que pasar:** sale un cuadro que dice **el material** y **qué
   cambió, de qué a qué**, y pregunta si quieres corregir también la entrada.
   Dos botones de verdad: **Yes, change the entry** y **No, leave the entry**.
3. Pulsa **No**: la entrega queda corregida y el movimiento **no se toca**.
4. Hazlo otra vez y pulsa **Sí**: el movimiento queda corregido, el aviso
   ofrece **enseñártelo**, y en la auditoría el motivo dice
   *«Delivery INC-… was corrected (PO #)»* — no «se cambió porque sí».

### 2 · Las dos cosas que la app se niega a ofrecer, y hay que verlas

Esto es lo que impide que «propagar» se coma el único número correcto:

1. **Un dato que el movimiento ya tenía distinto.** Prueba tu propio ejemplo:
   coge una entrega de 24, edita **su entrada a mano** y ponle 22 (llegaron dos
   rotas). Ahora vuelve a la entrega y ponla en 25.
   **Tiene que pasar:** la cantidad **no se ofrece**. El aviso dice que la
   entrada se dejó como está, y al pulsar *Why* explica que alguien la corrigió
   a mano. **Sería el fallo** que te ofreciera poner 25: el almacén tiene 22.
2. **La cantidad de una entrega repartida en varios estantes.** Si la entrega
   se convirtió en tres movimientos, «pon 25» no tiene una respuesta única.
   Tampoco se ofrece, y lo dice.

### 3 · Y lo que no cambia

Cambiar la cantidad **mueve el inventario**, y el cuadro lo dice con esas
palabras y se pone en rojo. No es una corrección de texto.

---

## v16.1 — el material que se usa en otra obra  🔴 *lo que viste el 13/11*

### 1 · Reasignar, el caso de tu captura

1. **Stock Dashboard →** toca un estante para abrir su cajón, y toca un
   material para abrir sus opciones.
2. **Tiene que haber un quinto botón: ⇅ Reassign.**
3. Pulsa, pon **cuántas**, en qué material se convierten, **para qué obra** y
   por qué. Guarda.
4. **Tiene que pasar, y esto es lo que hay que comprobar número a número:**
   - el material viejo baja esa cantidad;
   - el nuevo la sube;
   - **los dos en el MISMO estante** — no se ha movido nada de sitio;
   - el total de la bodega **no cambia**;
   - y en Movements salen **dos filas** con la insignia ámbar **⇅ REASSIGN**,
     cada una nombrando a la otra: *«Reassigned to …»* y *«Reassigned from …»*.
5. **Sería el fallo:** que algo apareciera como salido a una obra o como
   desperdiciado. No salió nada: sigue en el almacén.

### 2 · El coste, que es donde se inventa dinero

1. Hazlo con un material que **tenga precio** y mira la fila que sube.
2. **Tiene que pasar:** lleva el **coste del material de origen**, no el del
   destino. Si el material viejo valía 12,50 y el nuevo 40, las unidades que
   pasan valen 12,50 — si llevaran 40, la app habría inventado dinero.
3. Y si el material viejo **nunca tuvo precio**, la fila va **sin coste**, no
   con un cero.

### 3 · La reserva, que es el caso que tú tenías

1. **Reserva** un material en un estante (🔒 Reserve) y luego intenta
   reasignarlo.
2. **Tiene que pasar:** antes de pulsar, el aviso amarillo dice que está
   reservado y que **reasignarlo suelta la reserva**.
3. Al guardar, la reserva queda soltada y en **Ajustes → Sistema → Auditoría**
   aparece que la soltó una reasignación — no una mano anónima.
4. **Y con un usuario que no sea admin:** se niega, y el mensaje dice que es
   una decisión de admin. Eso es a propósito: soltar una reserva lo decide
   quien lleva la obra, no quien mueve el pallet.

### 4 · La etiqueta del pallet

1. Al terminar, el aviso trae **🏷 Print new label**.
2. **Tiene que pasar:** la etiqueta sale con el **nombre y la obra nuevos** y
   el estante donde están. La pegada en el pallet sigue diciendo el nombre
   viejo, y eso manda a alguien a buscar lo que no está.

### 5 · Las cuatro ventanas de tu captura — **preparado, paso a paso**

Dijiste «hazlo». **Yo no puedo pulsar el botón en tu hoja** —no tengo acceso a
tu Sheet; escribo el código, lo ejecutas tú— así que lo dejé todo preparado con
los números de la captura, qué escribir en cada campo, el motivo redactado, y
**qué tiene que salir después para que lo compruebes**:
**`docs/LAS-CUATRO-VENTANAS.md`**.

Lo único que la app no puede saber de la imagen es el nombre de las dos obras, y
no hace falta que me lo digas: el de origen lo rellena ella sola leyéndolo del
stock, y el de destino es el único que tecleas.

---

## v16.0 — la entrega y su entrada, atadas

### 1 · El enlace, en las dos direcciones  🔴 *lo que preguntaste el 18/11*

1. Coge una entrega **Pending**, pásala a **Arrived** y haz su entrada.
2. Vuelve a **Incoming**. **Tiene que pasar:** esa entrega lleva al lado un
   **✓ entry** verde.
3. **Púlsalo.** La app te lleva a Movements y **enciende la fila** unos
   segundos. Si la entrega se repartió en varios estantes, el ✓ dice **×3** y
   enciende las tres.
4. **Sería el fallo:** que no aparezca nada, o que te lleve a la fila
   equivocada.

### 2 · Corregir una entrega que ya tiene su entrada

1. Edita esa misma entrega — cambia la nota, por ejemplo — y guarda.
2. **Tiene que pasar:** sale un aviso que dice que **ya tiene su entrada** y que
   corregir la entrega **no cambia el movimiento**, con un botón para
   enseñártelo.
3. **Y tiene que pasar lo que NO pasa:** el movimiento **no se toca**. Compruébalo:
   mira la cantidad del movimiento antes y después. Es a propósito — si la
   entrega decía 24 y la entrada guardó 22 porque llegaron dos rotas, poner 25
   en la entrega no puede poner 25 en el almacén.

### 3 · Lo que la revisión de datos dice ahora  🟠

1. **Ajustes → Sistema → Check data.**
2. **Tiene que pasar, y es lo primero que quiero que mires:** mientras no
   hayas hecho **ninguna** entrada desde una entrega con esta versión, la
   revisión **no debe decir una palabra de entregas**. Ni una.
3. **Sería el fallo** —y el gordo— que te liste cien entregas viejas como «sin
   entrada». Esas entregas no tienen a nadie apuntándolas porque la columna
   acaba de nacer, no porque les falte la entrada. Si eso sale, dímelo y lo
   apago.
4. Después de hacer **una** entrada desde una entrega, vuelve a pasar la
   revisión. Ahí sí debe empezar a hablar: si tienes alguna entrega marcada como
   llegada sin entrada, sale con su material, su cantidad y su PO.
5. Y si aparece una **reserva** que aparta un material sin movimientos, también
   sale. Eso llevaba restando de un disponible que no existía.

### 4 · La columna nueva en la hoja *(sólo si quieres mirarla)*

1. La hoja de movimientos tiene una columna más al final: **From Delivery**.
2. **Tiene que pasar:** los movimientos de siempre la llevan **vacía**, y eso
   está bien — no vienen de ninguna entrega. Y la papelera y el archivo de
   movimientos viejos siguen abriéndose con normalidad.

---

## v15.9 — quitar un documento lo quita de verdad

### 1 · La ✕ de un documento  🔴 *lo que encontraste el 26/10*

1. En un movimiento con **dos documentos**, abre *Manage Documents* y quita
   **uno**. Guarda.
2. **Tiene que pasar:** antes de hacer nada te pregunta, y dice que el fichero
   va a la papelera de tu Drive y que lo puedes recuperar 30 días. Al guardar,
   el aviso dice **cuántos** fueron.
3. **Abre tu Google Drive → Papelera.** El fichero que quitaste **tiene que
   estar ahí**. El que dejaste, **no**.
4. **Sería el fallo:** que la papelera de Drive esté vacía. Eso es lo que pasaba
   hasta hoy, y es el motivo de todo esto.

### 2 · La foto de un estante, que no se podía quitar

1. En **Stock**, abre un material y pasa el ratón por la tarjeta de un estante
   **que tenga foto** (en el teléfono se ve sin pasar nada).
2. **Tiene que pasar:** hay **dos** botones, el de reemplazar (🔄) a la derecha
   y el de quitar (✕, rojo) **a la izquierda**. Están separados a propósito:
   dos botones de 20 px en la misma esquina es un acierto a medias con el dedo,
   y uno de los dos borra.
3. Pulsa la ✕, confirma. La foto desaparece de la pantalla y el fichero aparece
   en la papelera de tu Drive.
4. **Y el otro lado:** **reemplaza** una foto y mira la papelera de Drive. La
   vieja tiene que estar ahí. Antes se quedaba suelta para siempre.

### 3 · Lo que NO tiene que pasar, y vale la pena comprobarlo una vez

1. **Borra un movimiento** que tenga un documento (va a la papelera de la app).
2. **Tiene que pasar:** el fichero **sigue en tu Drive**, no en la papelera.
   Porque restaurar ese movimiento tiene que devolverle sus documentos.
3. Restáuralo y comprueba que el documento sigue abriéndose.

---

## v15.8 — que se vea lo que está pasando

### 1 · Guardar una entrada  🔴 *lo que más molestaba*

1. Haz una **entrada** y pulsa **Save to System**.
2. **Tiene que pasar, al instante:** la ventana se cierra, **aparece una fila
   gris latiendo** arriba de la lista con el material y la cantidad, y un aviso
   abajo a la izquierda dice *Saving*.
3. Cuando el servidor contesta, **la fila gris la sustituye la de verdad** y el
   aviso cambia al de imprimir etiquetas.
4. **Sería el fallo:** seis segundos sin nada, como antes.

> **Si lo lanzas desde Incoming**, la lista de movimientos no se ve — ahí el
> aviso de la esquina es lo único que queda, y es a propósito.

### 2 · Abrir la entrada desde una entrega

1. En **Incoming**, marca una entrega como llegada con *Make the entry*.
2. **Tiene que pasar:** la ventana se abre **sin sacarte de Incoming**, y al
   cerrarla sigues en Incoming.

### 3 · El estante que no existe, las dos salidas

1. Entrada con un estante parecido a uno real pero mal (`c 4 a`).
2. **Tiene que pasar:** te ofrece **las dos** — *Use C4A* y *Create c 4 a*.
3. *Create* sólo debe salir si tu usuario puede crear ubicaciones.

### 4 · Acopio Básico

1. Abre la copia **Básica** → Stock Dashboard.
2. **Tiene que pasar:** la franja de stock bajo y su panel se ven **en gris**,
   con el candado de Pro, y al pulsarlos sale la oferta — **no la lista de
   materiales**.
3. **Y la oferta que sale es la de los mínimos** (*Low-stock alerts*), la misma
   que contesta el botón **⚙ Monitor**. Si contestara otra cosa sería un fallo:
   son la misma función, y desde esta versión cuelgan de la misma oferta a
   propósito — antes le había escrito una segunda, idéntica, y eso es lo que
   dos pruebas me tiraron abajo.

### 5 · La ventana de novedades  🔴 *llevaba nueve versiones mal*

1. Abre la app después de poner la v15.8 (la ventana sale sola al cambiar de
   versión; si ya la cerraste, está en el **menú de la cuenta → What's new**).
2. **Tiene que pasar:** dice **Version 15.8** y cuenta lo de la fila gris. El
   enlace de abajo lleva al changelog **de la 15.8**, no al principio.
3. **Sería el fallo:** que diga 14.9. Eso es lo que decía hasta hoy — y es lo
   que la app le cuenta al cliente de sí misma al abrirla.
4. Y hacia atrás: la ventana lleva las cuatro últimas (15.8, 15.7, 15.6, 15.5).

### 6 · Lo de la campana — esto no es un cambio, es tu pregunta

Me preguntaste qué pasó con el icono y el botón de las notificaciones. **No lo
quitó ninguna versión:** esa campana no se ha tocado desde la v9.22, y tiene dos
reglas, las dos a propósito.

1. **Sólo existe en pantallas de 900 px o menos** — teléfono y tableta. En el
   ordenador lo mismo se enseña como el **montón de tarjetas de la esquina de
   abajo a la derecha**, que se abre al pasar el ratón. La campana nació
   precisamente porque el montón necesita ratón y el dedo no lo tiene.
2. **Y aun en el teléfono se esconde sola cuando no hay nada que contar.** La
   cuenta son tres cosas sumadas: proveedores u obras que no están en tus
   listas, avisos del sistema, y entradas pendientes de una entrega que llegó.

**La comprobación de un paso:** en el teléfono, marca una entrega como llegada y
**no** hagas su entrada. La campana tiene que aparecer con un **1**. Si con eso
tampoco aparece, es un fallo de verdad y lo persigo.

Y si lo que echabas en falta era el cuadro de *«Send notification email»* de
dentro de la ventana de entrada, dímelo: ése es otro asunto — sólo sale en las
entradas, y en Básico se ve apagado a propósito porque la gratis no puede
mandar correo.

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
