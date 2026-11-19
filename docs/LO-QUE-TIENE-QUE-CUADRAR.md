# Lo que tiene que cuadrar siempre — 18 de noviembre de 2026

Jose, 18/11: *"al corregir o editar un incoming, no se edita el entry que
utilizó los mismos datos, ¿por qué? ¿Y cómo podemos hacer para manejar la
edición entre cosas que están interconectadas? Busca qué otras cosas así hay en
la app que deben cuadrar siempre sin utilizar el 'rebuild stock'."*

---

## 1 · Por qué no se edita el entry

**Porque no están unidos. Nunca lo estuvieron.**

Cuando marcas una entrega como llegada y haces su entrada, lo que pasa es que la
app **copia** los datos de la entrega al formulario: categoría, nombre,
cantidad, unidad, proveedor, PO. Y ahí se acaba la relación. A partir de ese
momento son **dos filas en dos hojas distintas** que casualmente dicen lo mismo.

Corregir una no toca la otra porque **ninguna sabe que la otra existe.**

> Y conviene decir lo que sí quedó atado, porque es la mitad del problema: el
> movimiento guarda la entrega de la que vino en `_entryFromIncId`… **pero sólo
> mientras la ventana está abierta.** Al guardar, ese dato se usa para saldar
> la tarjeta de pendientes y **se tira**. No queda escrito en ninguna fila.

### Las dos formas de arreglarlo, y no son lo mismo

| | **Atarlas** | **Editar las dos** |
|---|---|---|
| Qué es | El movimiento guarda **de qué entrega vino**, en una columna | Al corregir la entrega, se corrige también el movimiento |
| Cuesta | Una columna nueva al final (`FROM_INCOMING`) y escribirla al guardar | Eso **más** la lógica de qué campos se propagan y qué pasa si el movimiento ya se editó a mano |
| Gana | Trazabilidad: desde cualquier movimiento se puede llegar a su entrega, y al revés | Que no haya que corregir dos veces |
| Riesgo | Ninguno. Una columna al final sobre datos que ya existen es la operación más segura de esta app | **Alto.** Ver abajo |

**Lo primero habría que hacerlo igual**, y es barato. Lo segundo hay que
pensarlo despacio, porque *editar en cascada* es la clase de cosa que parece
obvia y luego sorprende:

- Si alguien corrigió el movimiento a mano (y la app **obliga a escribir el
  motivo**), ¿una edición de la entrega debe pisar esa corrección? **No.** Pero
  entonces ya no cuadran, que es justo lo que se quería evitar.
- Si la entrega decía 24 y el movimiento guardó 22 porque llegaron dos rotas,
  **cambiar la entrega a 25 no debe poner 25 en el movimiento**: el almacén
  tiene 22.
- Y la cantidad del movimiento **ya cambió el inventario**. Editarla en cascada
  mueve stock sin que nadie lo haya pedido.

> **Mi recomendación:** atarlas (columna + enlace visible en las dos
> direcciones), y **no** propagar automáticamente. Cuando se edite una entrega
> que ya tiene movimiento, que la app lo diga y ofrezca abrir el movimiento:
> *«Esta entrega ya tiene su entrada del 21/10 — ¿la abro para corregirla
> también?»*. Decide la persona, que es quien sabe si llegaron 22 o 25.

---

## 2 · Qué más tiene que cuadrar, y nada lo obliga

Esto es lo que encontré mirando la app entera. **Ordenado por lo que más duele
si se desalinea.**

### 🔴 A · Entrega llegada ↔ su entrada

El de arriba. **Y tiene una consecuencia peor que la edición:** hoy no hay forma
de saber qué entregas marcadas como `Arrived` se quedaron sin su movimiento. La
tarjeta naranja de «falta su entrada» **vive en `localStorage`** — o sea, **en
ese navegador**. Quien marque la llegada en el teléfono no verá la tarjeta en el
escritorio. Y si borra los datos del navegador, desaparece el recordatorio y
nadie se entera.

Ésa es exactamente la situación de `LGI-DE-TOWNHOME2`.

### 🔴 B · El coste medio ↔ los costes estampados en cada fila

El coste medio de un material se calcula **mezclando** cada entrada con lo que
ya había, y el resultado se **estampa en la fila** del movimiento. Es lo que
hace que cambiar el método de costeo en el futuro sea seguro.

**Pero significa que una fila corregida a mano no recalcula el promedio.** Si
alguien edita la cantidad de una entrada vieja, todas las que vinieron después
siguen con el promedio que se calculó con el número viejo. **Nada lo detecta.**

### 🟠 C · Las reservas ↔ el material que existe

Una reserva dice «30 de este material son de la obra X». Si ese material se
borra, o sus movimientos se van a la papelera, **la reserva sigue ahí**
apuntando a algo que ya no existe — y resta de un disponible que no hay.

### 🟠 D · El material ↔ la ubicación *(el que Jose acaba de encontrar)*

Al borrar un material que estaba solo en una ubicación, la ventana de Materiales
**no se entera**, y por eso no deja borrar la ubicación a continuación. Es el
mismo patrón: dos pantallas que leen lo mismo y sólo una se repinta.

### 🟠 E · El nombre de un proveedor o una obra ↔ lo ya impreso

Renombrar un proveedor cambia lo que se ve en pantalla, **pero no los PDF ni los
correos ya enviados**. Un cliente comparando un PDF viejo con la pantalla
encuentra dos nombres para la misma cosa. *(Esto ya está anotado en el código y
es deliberado — pero es una pareja que no cuadra.)*

### 🟡 F · La etiqueta pegada ↔ el movimiento

Una etiqueta sale de la impresora y se pega. Si después alguien edita el
movimiento —cambia el estante, la cantidad— **la pegatina sigue diciendo lo
viejo**, y es un objeto físico que manda a alguien a un sitio.

### 🟡 G · Lo archivado ↔ lo activo

Los movimientos viejos se mudan solos a otra pestaña. A partir de ahí **tienen
otra numeración de filas** y no se pueden editar ni adjuntarles nada. Una
referencia guardada antes del archivado apunta a una fila que ahora significa
otra cosa.

---

## 3 · La regla que yo seguiría, y por qué `Rebuild stock` no es la respuesta

**`Rebuild stock` recalcula.** Eso lo hace la red de seguridad, no la solución:
sirve cuando ya está roto, y sólo arregla el inventario — no arregla una reserva
huérfana, ni una etiqueta pegada, ni un promedio mal mezclado.

Lo que de verdad evita que esto pase tiene tres niveles, y **ya usamos los tres
en sitios sueltos**:

| | Cómo | Dónde ya lo hacemos |
|---|---|---|
| **1 · Que no se pueda desalinear** | Que el dato viva en un solo sitio y todo lo demás lo derive | **El stock es la suma de los movimientos.** No hay un número guardado que pueda mentir |
| **2 · Que la relación quede escrita** | Una columna que diga de dónde vino | `IMPORT_ID` — una fila importada sabe de qué tanda vino, y el comentario no puede romperlo |
| **3 · Que la app lo note y lo diga** | Una revisión que busca parejas que no cuadran | `runDataQualityScan`, que ya busca negativos imposibles |

**Mi propuesta, en ese orden:**

1. **La columna `FROM_INCOMING`** (nivel 2). Barata, segura, y arregla A de
   raíz: desde una entrega se llega a su entrada y al revés, y las que no la
   tienen **se pueden listar**.
2. **Ampliar `runDataQualityScan`** (nivel 3) para que busque las parejas de
   arriba: entregas llegadas sin movimiento, reservas sin material, promedios
   que no cuadran con sus filas. **Una pantalla que dice «estas seis cosas no
   cuadran» vale más que diez arreglos automáticos**, porque las enseña en vez
   de taparlas.
3. **Y sólo entonces**, decidir qué se propaga solo. Con la relación escrita y
   la revisión funcionando, propagar deja de ser adivinar.

> **Lo que NO haría: editar en cascada ahora.** Sin la columna que las ata hay
> que adivinar qué movimiento corresponde a qué entrega — por nombre, por fecha,
> por cantidad — y adivinar mal ahí significa **editar el movimiento
> equivocado**. Eso es peor que no editar ninguno.
