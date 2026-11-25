# Lo que hay que revisar — una sola pasada, v16.3

Jose: *"al final dame lo que checkar."*

**Esto sustituye a leer cinco bloques de versión.** De la v15.8 a la v16.3 son
seis versiones, pero **instalas un solo archivo**, así que lo que sigue es una
sola pasada, sin repetir nada, **en el orden que yo seguiría**: primero lo que
más duele si está roto.

> `docs/QUE-REVISAR.md` sigue teniendo el detalle versión por versión, por si
> algo falla y hace falta saber de dónde viene.

---

## Antes de tocar nada — dos minutos que hacen comprobable el resto

1. **Pega los dos archivos** (`Index_v3_fixed.html` y `Code_v3_fixed.gs`) y
   abre la app. Abajo tiene que decir **v16.3**. Si dice otra cosa, lo demás no
   mide nada.
2. **Apunta en un papel** el stock de **dos materiales** que vayas a tocar: lo
   disponible, lo que hay fuera, y en qué estantes. **El después no se puede
   comprobar sin el antes.**
3. Abre tu **Google Drive → Papelera** en otra pestaña. La vas a necesitar en
   el punto 2.

---

## 1 · 🔴 Guardar una entrada — que se vea que está pasando

*Era lo que más te molestaba: seis o siete segundos de nada.*

1. Haz una **entrada** y pulsa **Save to System**.
2. **Al instante:** la ventana se cierra, **aparece una fila gris latiendo**
   arriba de la lista con el material y la cantidad, y abajo a la izquierda un
   aviso dice *Saving*.
3. Cuando el servidor contesta, **la fila gris la sustituye la de verdad**.
4. **Sería el fallo:** los seis segundos de silencio otra vez.

> Si la lanzas desde **Incoming**, la lista de movimientos no se ve: ahí el
> aviso de la esquina es lo único, y es a propósito.

---

## 2 · 🔴 Quitar un documento — que se borre de verdad

*Lo que encontraste el 26/10: «podemos cambiarlos pero nunca eliminarlos».*

1. En un movimiento con **dos documentos**, abre *Manage Documents*, quita
   **uno** y guarda.
2. **Antes de hacerlo te pregunta**, diciendo que va a la papelera de tu Drive
   y que lo puedes recuperar **30 días**. Al guardar, el aviso dice **cuántos**
   fueron.
3. **Mira tu Drive → Papelera.** El que quitaste **tiene que estar ahí**. El que
   dejaste, **no**.
4. **Sería el fallo:** la papelera de Drive vacía. Eso es lo que pasaba.

**Y las fotos de estante, que no se podían quitar:**

5. En **Stock**, abre un material y mira la tarjeta de un estante **con foto**.
   Hay **dos** botones: reemplazar (🔄) a la derecha y **quitar (✕, rojo) a la
   izquierda**, separados a propósito.
6. Quita una: desaparece y aparece en la papelera de Drive.
7. **Reemplaza** otra y mira la papelera: **la vieja tiene que estar ahí**.
   Antes se quedaba suelta para siempre.

**Y lo que NO tiene que pasar, una vez:**

8. **Borra un movimiento** que tenga un documento (va a la papelera de la app).
9. **El fichero sigue en tu Drive**, no en la papelera — porque restaurar ese
   movimiento tiene que devolverle sus documentos. Restáuralo y comprueba que
   el documento sigue abriendo.

---

## 3 · 🔴 La entrega y su entrada — atadas, y la oferta de corregir las dos

*Tu pregunta del 18/11, y lo que pediste el 23/11.*

1. Coge una entrega **Pending**, pásala a **Arrived** y haz su entrada.
2. Vuelve a **Incoming**: esa entrega lleva un **✓ entry** verde al lado.
3. **Púlsalo:** te lleva a Movements y **enciende la fila** unos segundos. Si se
   repartió en varios estantes dice **×3** y enciende las tres.
4. **Edita esa misma entrega** —cambia el PO, por ejemplo— y guarda.
5. **Tiene que salir un cuadro** que dice el material y **qué cambió, de qué a
   qué**, y pregunta si corregir también la entrada. **Dos botones de verdad.**
6. Pulsa **No**: la entrega queda corregida y el movimiento **no se toca**.
7. Hazlo otra vez y pulsa **Sí**: el movimiento queda corregido y el aviso
   ofrece enseñártelo. En la auditoría el motivo dice *«Delivery INC-… was
   corrected (PO #)»* — no «se cambió porque sí».

### Y las dos cosas que la app se tiene que NEGAR a ofrecer

**Esto es lo que más quiero que pruebes de todo el documento**, porque es lo que
impide que «propagar» se coma el único número correcto:

8. **Tu propio caso de las dos rotas.** Coge una entrega de **24**, edita **su
   entrada a mano** y ponla en **22**. Ahora vuelve a la entrega y ponla en
   **25**.
9. **La cantidad NO se tiene que ofrecer.** El aviso dice que la entrada se dejó
   como está, y al pulsar *Why* explica que alguien la corrigió a mano.
   **Sería el fallo** que te ofreciera poner 25: **el almacén tiene 22.**
10. **Y si la entrega se repartió en varios movimientos**, la cantidad tampoco
    se ofrece — «pon 25» no tiene una respuesta única — y lo dice.

> Cambiar una cantidad **mueve el inventario**: el cuadro lo dice con esas
> palabras y se pone en rojo. No es una corrección de texto.

---

## 4 · 🔴 La revisión de datos — y el silencio va primero

**Ajustes → Sistema → Check data.**

1. **Mientras no hayas hecho ninguna entrada desde una entrega con esta
   versión**, la revisión **no debe decir una palabra de entregas**. Ni una.
2. **Sería el fallo, y el gordo:** que te liste cien entregas viejas como «sin
   entrada». Esas no tienen a nadie apuntándolas porque la columna acaba de
   nacer, no porque les falte la entrada. **Si eso sale, dímelo y lo apago.**
3. Después del punto 3 de arriba (ya hay una entrada atada), **vuelve a
   pasarla**. Ahí sí debe empezar a hablar: si tienes alguna entrega marcada
   como llegada sin entrada, sale con su material, su cantidad y su PO.
4. Y si aparece una **reserva** que aparta un material sin movimientos, también
   sale. Eso llevaba restando de un disponible que no existía.

---

## 5 · 🔴 Reasignar — las dos formas

*M-05, y el atajo que pediste el 25/11.*

### a) En el estante, que es el caso de tu captura

1. **Stock → toca un estante → toca un material → ⇅ Reassign.**
2. Pon cuántas, en qué material se convierten, **para qué obra** y por qué.
3. **Comprueba número a número:** el viejo baja, el nuevo sube, **los dos en el
   MISMO estante**, el **total de la bodega no cambia**, y en Movements salen
   **dos filas ámbar ⇅ REASSIGN** nombrándose la una a la otra.
4. **Sería el fallo:** que algo apareciera **salido a una obra** o
   **desperdiciado**. No salió nada.
5. **El coste:** hazlo con un material **con precio** y mira la fila que sube —
   lleva **el coste del material viejo**, no el del nuevo. Si llevara el del
   nuevo, la app habría **inventado dinero**.
6. **Con un material reservado:** antes de pulsar, el aviso amarillo dice que
   reasignarlo **suelta la reserva**. Al guardar queda soltada y la auditoría
   dice que la soltó una reasignación. **Con un usuario que no sea admin se
   niega**, y dice que es decisión de admin.

### b) Volviendo de una obra, en una sola acción

7. Coge un material **con unidades fuera** (su barra muestra algo en *Out on a
   job*) y pulsa **⇅ Reassign**.
8. **Tiene que haber un desplegable nuevo, *Where they are now*.** Elige
   **Coming back from a job**.
9. **El campo del estante se puede escribir** —ahora es *a dónde vuelven*—, el
   tope de la cantidad pasa a ser **lo que hay fuera**, y una nota avisa de que
   va a escribir **tres filas**.
10. Guarda y comprueba: **lo de fuera baja**, el material **nuevo sube** en ese
    estante, y el viejo **queda igual en la bodega** (entró y salió en el mismo
    acto). En Movements hay **tres filas**: un **RETURN** y las dos de
    **REASSIGN**.
11. **Y que el atajo no se cuele:** con un material **sin nada fuera**, el
    desplegable **no aparece**. Reasignando normal siguen siendo **dos filas**,
    sin ninguna devolución inventada.

### c) La etiqueta

12. Al terminar, el aviso trae **🏷 Print new label**, y la etiqueta sale con el
    **nombre y la obra nuevos**. La pegada en el pallet dice el nombre viejo, y
    eso manda a alguien a buscar lo que no está.

---

## 6 · 🟠 El teléfono — Stock en tarjetas

1. Abre el **Stock Dashboard en el teléfono**.
2. **Una tarjeta por material, sin arrastrar de lado.** Con la tarjeta cerrada
   se ven: categoría, **la insignia de estado**, el nombre, **la barra de
   existencias** y dónde está.
3. **Toca una tarjeta:** se abre con la fecha de entrada, la última nota, los
   documentos **y las fotos de sus estantes** — un gesto, todo.
4. **En el ordenador** sigue siendo la misma tabla, con las mismas columnas. Si
   ahí cambió algo, es un fallo.
5. Y **Movements en el teléfono** tiene que seguir igual que en la v15.4.

---

## 7 · 🟠 Acopio Básico

1. Abre la copia **Básica** → Stock Dashboard.
2. La franja de stock bajo y su panel se ven **en gris**, con el candado de Pro,
   y al pulsarlos sale **la oferta de los mínimos** — la misma que contesta el
   botón ⚙ Monitor, porque es la misma función. **No la lista de materiales.**

---

## 8 · ⚪ Y lo de antes, que no se tiene que haber roto

Un repaso rápido. Si algo de aquí falla, es una regresión y quiero saberlo:

1. **El estante mal escrito** (`c 4 a` en vez de `C4A`): pregunta **al
   instante**, la ventana **no se cierra**, y te ofrece **las dos** salidas —
   *Use C4A* y *Create c 4 a*. Elegir **guarda**, sin pedir otro clic.
2. **Una entrega que ya llegó:** al editarla **no** vuelve a ofrecer *Make the
   entry*.
3. **Al hacer la entrada desde Incoming**, la app te deja **en Incoming**.
4. **La ventana de novedades** dice **Version 16.3** y cuenta lo del material
   que vuelve de una obra.
5. **El PDF de las fotos:** derechas y llenando la hoja.

---

## 9 · Lo que queda en tus manos

| | Qué |
|---|---|
| 🔴 | **Las cuatro ventanas de la captura.** Los pasos, con los números y el motivo redactado, en `docs/LAS-CUATRO-VENTANAS.md`. Yo no puedo pulsar el botón en tu hoja |
| 🔴 | **La restauración de un backup, de principio a fin.** Sigue siendo lo pendiente de más consecuencia, y lo único que ninguna prueba mía puede sustituir. `docs/RESTAURAR-UN-BACKUP.md` |
| 🟠 | **H-11, el secreto de OAuth:** rotarlo ahora o no. Las tres opciones en `docs/EL-LOGIN-Y-EL-SECRETO.md`. Mi recomendación: rotarlo ya, porque hoy cuesta una instalación |
| 🟠 | **Los dos topes de deriva** (`test-escala`, `test-espaciado`): hacer la tanda pequeña o subir el tope a propósito. Mi recomendación: la tanda |
| 🟡 | **N-12:** por qué camino borraste el material que no refrescaba la ventana de Materiales |
| 🟡 | **La plantilla maestra** y **los nueve vídeos** |

---

## Si algo no cuadra

**No lo arregles con una entrada nueva.** Para corregir una cuenta se usa
**ADJUST**, nunca una entrada — es la regla de las 55 unidades. Y dímelo antes
de tocar nada: casi todo lo de esta lista lo vigila una prueba, y si algo pasó
de todos modos quiero saber **cuál**, porque entonces la prueba también está
mal.
