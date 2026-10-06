# El competidor de Excel — qué tienen, qué tenemos, qué copiamos

Jose, 2026-10-06, sobre los dos vídeos de *Conociendo Excel*: *"¿qué tal te
parece el programa que ellos han creado? ¿Cómo lo comparas con lo que tenemos?
¿Qué nos diferencia? ¿Y a ellos? ¿Qué podemos mejorar y aprender de ellos?"*

Escrito a partir de **lo que se ve en sus dos vídeos**, fotograma a fotograma.
No he comprado su producto ni lo he probado, así que **todo lo que digo de lo que
NO se ve en pantalla es deducción, y lo marco como tal**.

---

## 1. Qué es, exactamente

**"Control de Inventarios y Almacenes PRO"**, de *Conociendo Excel*. Un libro de
**Excel con macros**. Lo que se ve:

- **Pantalla de acceso** (`INICIO DE SESIÓN`: usuario, contraseña, *mostrar*).
- **Un menú principal con diez botones**: Producto · Movimiento · Almacén ·
  Inventario · Cancelar · Reporte · Usuarios · Configuración · Mostrar datos ·
  Pre.O.C.
- **Registro de movimientos** con categoría, almacén, **almacén destino**,
  producto, responsable del traspaso y comentario; y una rejilla de líneas con
  producto, unidad, **costo, cantidad, subtotal**, existencia y almacén.
- **Un aviso al guardar una salida**: *"esta salida deja el producto por debajo
  del mínimo asignado en el almacén seleccionado"*.
- **Inventario actual / existencias por almacén**: existencias, costo, total,
  **máximo, mínimo, P.R. orden** (punto de reorden) y **total costo**.
- **Un recibo de entrega imprimible**: nº de operación, fecha, movimiento,
  entregado a, almacén origen, comentario y las líneas.
- **Pestañas de informes**: *Reporte movi*, *Reporte inv*, *Reporte reorden*.

**Mi opinión honesta del producto: está bien hecho para lo que es.** No es una
chapuza. Quien lo hizo entiende de almacenes —el aviso de mínimo al guardar no se
le ocurre a alguien que no ha trabajado en uno— y ha cubierto el ciclo entero:
alta, movimiento, traspaso, inventario, informe, recibo. Para un negocio de una o
dos personas con un ordenador, **resuelve el problema**.

---

## 2. En qué nos ganan HOY

Lo pongo primero porque es lo útil. **Cinco cosas, y las cinco son de verdad:**

1. **Informes.** Ellos tienen tres y nosotros **ninguno** — lo único que tenemos
   es *descargar los datos*, que no es un informe. Y encima los tienen como algo
   de primer nivel, con su botón en el menú.
2. **El dinero está a la vista.** Costo por línea, subtotal, **total costo del
   inventario**. Nosotros tenemos las columnas de coste (`UNIT_COST`,
   `TOTAL_COST`) y el interruptor de quién las ve, pero **nadie puede preguntar
   "¿cuánto vale lo que tengo?"**.
3. **Mínimo, máximo y punto de reorden — y el aviso AL GUARDAR.** Nosotros
   tenemos el mínimo y lo enseñamos en el Dashboard. Ellos avisan **en el momento
   en que alguien está sacando el material**, que es cuando sirve. Enterarse
   después de que se lo han llevado llega tarde.
4. **El recibo de entrega.** Quien se lleva material firma un papel. Nosotros no
   damos nada.
5. **Varios almacenes de verdad**, con stock, mínimo y máximo por almacén, y
   traspasos entre ellos. Nosotros tenemos ubicaciones dentro de un almacén.

**Y una sexta que no es del producto pero decide ventas: el precio.** Estas
plantillas se venden por una cantidad pequeña y de una sola vez. No sé la suya y
no me la invento, pero el orden de magnitud de ese mercado es ése. **Compiten por
precio, no por capacidad.**

---

## 3. En qué les ganamos — y no es de estilo

1. **Varias personas a la vez.** Esto es lo gordo. Un libro de Excel en una
   carpeta compartida **lo abre uno y los demás entran en sólo lectura**, o peor,
   se abren dos copias y la segunda pisa a la primera al guardar. Nosotros
   tenemos bloqueo de stock, sesiones por persona y una tabla de quién está
   dentro. **Su producto es para una persona. El nuestro es para un turno.**

2. **Su "Usuarios" no es seguridad, es un rótulo.** Un formulario de VBA pidiendo
   contraseña protege **sólo contra alguien que abra el libro con las macros
   activadas y se porte bien**. Con las macros desactivadas se ve la hoja de
   usuarios. **Deducción, no comprobado** — pero es cómo funcionan estos libros,
   y la carga de la prueba está del otro lado.

   Nosotros firmamos la sesión con HMAC, **la regla vive en el servidor**, y un
   rechazo queda escrito con la hora y el correo. Y sobre todo: **el dato no está
   en el fichero que la persona tiene abierto.**

3. **Se entra desde cualquier sitio, y desde el teléfono.** El suyo es un fichero
   en un ordenador. El de bodega con una tableta y guantes no puede usarlo.

4. **Lo que pasa cuando algo sale mal.** Un libro de Excel tiene Ctrl+Z y la
   última copia que alguien se acordó de hacer. Nosotros tenemos papelera con
   restaurar, copias automáticas, archivado con suelo de 30 días, registro de
   errores, registro de auditoría, y el patrón de *escribir antes de borrar* que
   nos costó tres sustos aprender. **Ellos tienen un fichero; nosotros tenemos
   una historia.**

5. **Ubicación de verdad.** Ellos llegan a "Almacén A". Nosotros llegamos a
   **B2A, O1A, P4C — el estante**, con un mapa y fotos. En un almacén de vidrio,
   *"está en el almacén general"* no sirve para ir a buscarlo. **Esto es lo más
   nuestro de todo**, y encima es lo que Jose construyó por necesidad propia.

6. **El producto mejora.** Nosotros publicamos versiones con su changelog. Ellos
   venden un fichero: el que lo compró hace dos años tiene el de hace dos años.
   (Lo cual, dicho sea de paso, **es justo el agujero que encontré ayer**: lo
   publicamos y no se lo enseñamos a nadie.)

7. **Documentos pegados al movimiento, lectura de albaranes con IA, correos a los
   jefes de proyecto.** Nada de eso cabe en un libro de Excel.

---

## 4. La conclusión que de verdad importa

**No competimos con ellos. Competimos con el cuaderno y con la hoja de cálculo
que el cliente ya tiene.**

Su comprador y el nuestro no son el mismo:

| | Ellos | Nosotros |
|---|---|---|
| **Quién compra** | Un dueño que lleva el almacén él solo | Un almacén con varias personas por turno |
| **Qué compra** | Un fichero, una vez | Un servicio que se mantiene |
| **Dónde funciona** | Un ordenador con Excel | Cualquier navegador, también el teléfono |
| **Qué pasa si se pierde el fichero** | Se perdió | Hay copias, papelera y auditoría |
| **Cuánto cuesta** | Poco, una vez | Más, y recurrente |

**Pero sus vídeos valen igual, y mucho.** Por un motivo que no tiene nada que ver
con la competencia:

> **Son una lista gratis de lo que un encargado de almacén ESPERA que exista.**

Nadie los hizo pensando en nosotros, y por eso no mienten. Si ellos pusieron el
punto de reorden y el recibo de entrega, es porque **se lo pidieron**.

**Y de ahí sale el riesgo comercial real**, que es más urgente que cualquiera de
las funciones: un cliente que haya visto ese vídeo va a preguntar *"¿lleva
costos? ¿me avisa cuándo pedir? ¿me imprime un comprobante de entrega?"* — y hoy
la respuesta es **no** a las tres. Delante de un producto que cuesta una fracción
de lo nuestro, tres noes seguidos pesan mucho más que todo lo del apartado 3,
porque **lo del apartado 3 no se ve en una demostración de cinco minutos y esas
tres preguntas sí**.

---

## 5. Qué copiamos, y en qué orden

Nada de esto es nuevo: **ya está en `LO-QUE-FALTA-EN-LA-APP.md` con su orden y su
tamaño.** Lo que hacen estos vídeos es **confirmar la prioridad desde fuera**, que
es más valioso que inventarla nosotros.

1. **Avisar al guardar cuando algo baja del mínimo.** El mínimo ya existe; sólo
   hay que mirarlo en el momento correcto. **Pequeño, y es el que más se nota.**
2. **Valor del inventario ahora**, por categoría y total. Los datos ya están.
3. **El recibo de entrega** imprimible.
4. **El informe de reposición**: qué está bajo mínimo, cuánto falta, qué proveedor
   lo trae. Eso es media orden de compra ya escrita.
5. **Punto de reorden y máximo**, además del mínimo. Después de los anteriores:
   tres números por material es más de lo que un cliente quiere rellenar el
   primer día.
6. **Varios almacenes**, el día que un cliente tenga dos. **Hoy no lo pide nadie
   y es una obra grande** — ubicación y almacén son dos niveles distintos y
   tocarían el motor de stock entero. **No lo haría por copiarles.**

### Y una cosa de ellos que NO copio

**El menú de diez botones.** Su pantalla tiene diez porque Excel no les da otra
forma de navegar. Nosotros tenemos pestañas y un menú de cuenta. Copiar su menú
sería heredar su limitación.

### Y una que sí, aunque sea pequeña

**Sus botones nombran el negocio, no la pantalla:** *Producto, Movimiento,
Almacén, Inventario, Reporte*. Los nuestros nombran pantallas: *Stock Dashboard,
Project View*. La suya se entiende sin que nadie te explique nada. **Cuando se
toque la navegación en el rediseño, merece la pena revisarlo con ese criterio.**

---

## 6. Lo que NO sé, y conviene no fingir

- **Su precio exacto.** No sale en los vídeos.
- **Si su login protege algo de verdad.** Es deducción por cómo funciona Excel.
- **Cuántos lo usan ni qué tal les va.** No hay datos, y los números de redes no
  son datos.
- **Si tienen más funciones que no enseñan.** Dos vídeos no son el producto.

Si alguna de estas cuatro llega a importar para una decisión, se compra su
plantilla y se mira. **Hasta entonces, lo de arriba es lo que se puede defender.**
