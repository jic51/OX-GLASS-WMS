# Que nadie tenga que abrir la hoja

Jose, 2026-10-05: *"debemos recordar que queremos que la app sea la única forma o
la única puerta desde el usuario hasta los datos, entonces debemos reducir al
máximo (100%) la necesidad del usuario de ir al sheet. Pensando en esto, ¿qué
otros datos puede necesitar el usuario (alguien de bodega, alguien de
financiero, alguien de administración, etc.)?"*

**Repasado contra el código, pestaña por pestaña y pantalla por pantalla**, no de
memoria. Fecha: **2026-10-05, v12.42**.

---

## 1. LO QUE YA ESTÁ EN LA APP — y es casi todo

Lo digo primero porque la respuesta corta es buena: **la app ya cubre casi toda
la hoja.** Comprobado uno a uno:

| Pestaña de la hoja | ¿En la app? |
|---|---|
| MASTER_ARCHIVE_V3 (movimientos) | ✅ Movements & History |
| LIVE_STOCK / SITE_STOCK / WASTED_STOCK | ✅ Stock Dashboard |
| RESERVATIONS, MATERIAL_LOCKS, RACK_PHOTOS | ✅ Warehouse Map |
| MOVEMENT_TRASH | ✅ la papelera, con restaurar |
| ERROR_LOG | ✅ Settings → Error Log |
| MATERIAL_PACKS | ✅ Settings → Materials |
| PM_DIRECTORY | ✅ Settings → Directory |
| CONFIG (categorías, proyectos, proveedores, ubicaciones) | ✅ Settings |
| USERS_V3 | ✅ Manage Users |
| Trabajos automáticos y copias | ✅ Settings → System |

**Quien recibe, quien saca y quien busca material no necesita la hoja para
nada.** Eso ya está hecho.

---

## 2. LO QUE SÓLO ESTÁ EN LA HOJA — tres cosas, y una importa de verdad

### 2.1 🔴 AUDIT_LOG — quién cambió qué

**Es el único dato de peso que obliga a abrir la hoja.** La pantalla de
Settings → System enseña *lo que hizo la app sola* (archivado nocturno, copias,
informes) y **filtra a propósito todo lo que hicieron las personas**.

Así que hoy, dentro de la app, no hay respuesta a:

- ¿Quién **borró** este movimiento? ¿Cuándo? ¿Qué decía?
- ¿Quién **editó** esta cantidad, y qué ponía antes?
- ¿Quién **dio de alta** o **quitó** a este usuario?
- ¿Quién **cambió** un proveedor, una categoría, un permiso?
- ¿Qué **accesos se rechazaron** (lo que empezamos a registrar en la v12.40)?

Quién *grabó* un movimiento sí se ve —la tabla de Movements tiene su columna
User—. Lo que no se ve es **quién lo cambió o lo quitó después**, que es
justamente lo que se pregunta cuando algo no cuadra.

**Para quién es:** administración y el dueño. Es la pregunta de *"¿qué pasó
aquí?"*, y es la única para la que hoy hay que salir de la app.

### 2.2 🟡 El archivo, al buscar

Un PO de hace ocho meses no aparece buscando en la app: está en el archivo y la
búsqueda no llega. **Ya está en el backlog** y no lo repito aquí.

### 2.3 🟢 Lo demás son pestañas internas

CONFIG_SNAPSHOT y ARCHIVE_HISTORY no son datos de nadie: son fontanería de las
copias y del archivado. No tienen que estar en la app.

---

## 3. LO QUE NO ESTÁ EN NINGÚN SITIO — ni en la app ni en la hoja

Aquí está la parte interesante de tu pregunta. **No tenemos informes.** Lo único
que hay es *descargar los datos* — que no es un informe, es un CSV. Lo que falta,
por persona:

### 3.1 🔴 BODEGA — un recibo de entrega

**El más útil de todos, y lo enseña el vídeo que me mandaste** (el sistema de
Excel tiene su *RECIBO DE ENTREGA*: número de operación, fecha, entregado a,
almacén origen, líneas y comentario).

Hoy, cuando alguien se lleva material, **no queda nada en papel ni en PDF**. El
movimiento está en la app, pero el que se lo lleva no firma nada y el de bodega
no se queda con nada.

Lo que haría: desde un EXIT (o varios marcados), un botón **Delivery slip** que
saque una hoja imprimible con el número del movimiento, la fecha, quién se lo
lleva, el proyecto, las líneas, y una raya para firmar. Y el PDF guardado junto
al movimiento, como ya se guardan los documentos.

**Tamaño:** mediano. La parte de imprimir ya existe para las etiquetas.

### 3.2 🔴 FINANCIERO — el valor de lo que hay en la bodega

Las columnas de coste **ya existen** (`UNIT_COST`, `TOTAL_COST`, y el interruptor
`canSeeCosts` que decide quién las ve). El Dashboard ya enseña el coste de lo
desperdiciado.

**Lo que no existe es la pregunta que hace un financiero:** *¿cuánto vale lo que
tengo ahora mismo?* Ni por categoría, ni por proyecto, ni total. Y ninguna
comparación con el mes pasado.

Lo que haría, en este orden:

1. **Valor del inventario ahora** — total, por categoría y por ubicación.
2. **Consumo por proyecto en un periodo** — cuánto material se llevó cada
   proyecto este mes y cuánto costó. Es lo que se factura.
3. **Desperdicio por periodo y por proyecto** — hoy el total es de siempre
   ("all-time, never resets"), que no sirve para cerrar un mes.

**Tamaño:** el 1 es pequeño (los datos están). El 2 y el 3 son medianos.

### 3.3 🟠 ADMINISTRACIÓN / COMPRAS — qué hay que reponer

El **Low-Stock Monitor ya existe**: se marca un material, se le pone un mínimo y
el Dashboard dice cuántos están por debajo.

**Lo que falta es lo de alrededor**, y también lo enseña el vídeo del
competidor: ellos tienen **mínimo, máximo y punto de reorden por almacén**, y
avisan *en el momento de sacar* — *"esta salida deja el producto por debajo del
mínimo asignado"*.

Lo que haría:

1. **Avisar al guardar**, no sólo en el Dashboard. Enterarse cuando ya se lo han
   llevado llega tarde.
2. **Un informe de reposición**: lo que está bajo mínimo, cuánto falta, qué
   proveedor lo trae y cuándo se compró por última vez. Eso es una orden de
   compra a medio escribir.
3. **Mínimos por ubicación** y no sólo por material, el día que haga falta.

**Tamaño:** el 1 es pequeño. El 2 es mediano.

### 3.4 🟠 BODEGA — lo que no se mueve

Nadie puede preguntar *"¿qué lleva seis meses parado?"*. En una bodega de vidrio
eso es sitio ocupado y dinero quieto, y es la lista con la que se decide qué
devolver o tirar.

**Tamaño:** pequeño. La fecha del último movimiento ya está en los datos.

### 3.5 🟠 TODOS — el conteo físico

Cuando se cuenta la bodega a mano no hay dónde meter el resultado: no hay hoja de
conteo que imprimir, ni pantalla donde apuntar lo contado, ni nada que diga la
diferencia entre lo contado y lo que dice el sistema. Hoy eso se hace a mano y se
arregla con ADJUST uno por uno.

**Tamaño:** grande. Es una pantalla propia y es la que convierte Acopio en el
sistema de verdad de la bodega. **Yo la dejaría para después de las anteriores.**

---

## 4. EL ORDEN QUE PROPONGO

Primero lo que **cierra la puerta de la hoja**, después lo que **añade valor
nuevo**:

1. **La actividad de las personas dentro de la app** (2.1). Es lo único que hoy
   obliga a salir, y Jose ya me enseñó la pantalla que quiere para ella: el
   *activity feed* del vídeo, con la raya de tiempo y el filtro.
2. **Avisar al guardar cuando algo baja del mínimo** (3.3.1). Pequeño y se nota
   el mismo día.
3. **Valor del inventario ahora** (3.2.1). Pequeño, y es lo primero que pide
   quien lleva las cuentas.
4. **El recibo de entrega** (3.1).
5. **El informe de reposición** (3.3.2) y **lo que no se mueve** (3.4).
6. **Consumo y desperdicio por proyecto y periodo** (3.2.2 y 3.2.3).
7. **El conteo físico** (3.5), cuando lo demás esté.

**Y antes de cualquiera de ellos están las cosas rotas del backlog** —la
ubicación que no existe, la guardia de escritura—. La regla no cambia: lo roto
antes que lo nuevo.

---

## 5. LO QUE NO HARÍA

- **Una pestaña por informe.** Siete pestañas arriba convierten una app que se
  entiende en un menú que hay que estudiar. Yo pondría **una sola pestaña
  Reports** con una lista dentro, y cada informe con su rango de fechas.
- **Copiar el menú del competidor.** Su pantalla tiene diez botones porque es
  Excel y no tiene otra forma de navegar. Nosotros sí.
- **Dar por hecho que el financiero mira la app.** Puede que lo que quiera sea
  **el informe por correo el día 1 de cada mes** y no entrar nunca. Eso es más
  barato que una pantalla y probablemente más útil — **pero no lo sé, y hay que
  preguntárselo a quien lleve las cuentas en OX Glass** antes de construir
  ninguna de las dos cosas.
