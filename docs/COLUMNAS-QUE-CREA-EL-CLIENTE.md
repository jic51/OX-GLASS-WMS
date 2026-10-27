# ¿Puede el cliente crear sus propios campos? — qué cuesta de verdad una columna

Pregunta de Jose, 27/10, parando la construcción de `IMPORT_ID`:

> *"¿Cuál es el problema real en toda la app de aumentar columnas? ... si una
> empresa tiene fecha de caducidad en sus materiales seguro querrá ponerle ese
> dato a cada uno pero nosotros no tenemos ese campo, o si algún cliente quiere
> que ciertos materiales tengan relación entre ellos... ¿hay alguna manera de que
> `AC_WIDTH` se calcule según las columnas creadas? ¿O alguna forma de permitir
> que el cliente cree columnas y la app las utilice sin que debamos cambiar el
> código? Si la hay quiero saberlo, y también cuánto nos costaría."*

**Es la pregunta correcta y llega en el momento correcto**, porque la respuesta
cambia lo que hacemos esta semana.

---

## 1 · PRIMERO, LA RESPUESTA HONESTA A «¿CUÁL ES EL PROBLEMA REAL?»

No es uno. Son **tres cosas distintas** que se confunden en la misma frase, y
sólo una da miedo.

### 1.1 · Lo que NO cuesta nada

La mayoría de las 29 menciones de `AC_WIDTH` son de la forma
`getRange(2, 1, n, AC_WIDTH)`. **Esas se adaptan solas**: cambias la constante y
leen una columna más. Añadir al final ya se hizo **cinco veces** —`UNIT_COST`,
`TOTAL_COST`, `MOV_ID`, `ORIGIN_PROJECT`, `FROM_MOV`— y el propio código explica
por qué al final y no en medio:

> *"Appended at the end, not inserted among the columns above, on purpose: every
> other index in AC is a POSITION some existing sheet already has data in, and
> inserting would shift every column after it. Appending is the only change here
> that is safe on data that already exists."*

### 1.2 · Lo que SÍ se rompe hoy, y es **una sola línea**

```js
var TR = { DELETED_AT: AC_WIDTH, DELETED_BY: AC_WIDTH + 1, FROM_SHEET: AC_WIDTH + 2 };
```

**La papelera aparca sus tres columnas justo detrás de las del movimiento.** Por
eso el ancho del movimiento ES el plano de la papelera: muevo uno, muevo el otro,
y las filas que ya están en la papelera de un cliente se leen desplazadas.

**Ése es el problema entero.** No es «la app no aguanta columnas»: es que **una
decisión, en una línea, ató dos cosas que no tenían por qué estar atadas.**

### 1.3 · Y lo que de verdad asusta, que ya pasó

**La noche del 26 de septiembre de 2026 se perdió el archivo de movimientos
entero por esto.** Está escrito en el código, en `archiveOldMovements`:

> *A las 3:19:10 el borrado salió bien y la escritura falló: «Los datos tienen
> 23 columnas y el rango 20». La hoja de Jose tenía 20; el modelo, 23. Para
> entonces el histórico ya estaba borrado. Sólo se salvó por la copia de las
> 2:36.*

**Por eso «añadir una columna» da respeto en este proyecto, y debe darlo.** Pero
conviene saber que **los tres fallos de aquella noche están arreglados**: ahora
se llama a `ensureArchiveWidth_`, ahora se **escribe antes de borrar**, y ahora
el error se ve. La bomba está desactivada; lo que queda es la línea de la
papelera.

---

## 2 · «¿SE PUEDE CALCULAR `AC_WIDTH` SEGÚN LAS COLUMNAS?»

**Sí, y es una hora de trabajo** — pero conviene decir que **no resuelve lo que
Jose quiere**, y por qué.

Hacer `AC_WIDTH = Object.keys(AC).length` es higiene buena: hoy son dos cosas
que tienen que coincidir sin que nada lo obligue (añades a `AC` y te olvidas del
`25`). Lo haría.

**Pero el ancho del modelo nunca fue el problema.** El problema es que **la hoja
de cada cliente tiene su propio ancho**, puesto el día que se creó. Calcular la
constante no ensancha la hoja de nadie — eso lo hace `ensureArchiveWidth_`, y ya
existe. Y sobre todo: **un campo que inventa el cliente no puede estar en `AC`**,
porque `AC` lo escribimos nosotros y es el mismo para todos.

---

## 3 · «¿PUEDE EL CLIENTE CREAR COLUMNAS SIN QUE TOQUEMOS CÓDIGO?»

**Sí. Pero no como columnas del archivo.** Y los dos ejemplos de Jose necesitan
**dos estructuras distintas**, que es lo importante de esta respuesta.

### 3.1 · La fecha de caducidad → un dato del MATERIAL, no del movimiento

La caducidad no cambia con cada entrada y salida: **es del material**. Meterla
como columna del archivo la repetiría en cada una de sus mil filas, y el día que
se corrija habría que corregirla mil veces.

**El sitio correcto ya existe en la app y ya funciona:** `MATERIAL_PACKS`, la
hoja que dice cuántas unidades trae una caja de cada material. **Es exactamente
la forma que hace falta** — una tabla al lado, con una fila por material.

Lo que convierte eso en «campos que crea el cliente» son dos hojas:

| Hoja | Qué guarda |
|---|---|
| `CUSTOM_FIELDS` | **La definición:** nombre del campo, tipo (fecha, número, lista, texto), a qué se aplica, obligatorio o no |
| `CUSTOM_VALUES` | **El valor:** material (o movimiento) + campo + valor |

**Y aquí está la clave de toda la respuesta:** con esa forma, **añadir un campo
nuevo no toca `AC`, no toca `AC_WIDTH`, no toca la papelera y no toca el motor
de existencias.** Es una fila más en una hoja. El código se escribe **una vez**
y ya no se vuelve a tocar.

### 3.2 · «No se puede despachar A sin B» → eso no es una columna, es una tabla

Esto es otra cosa completamente distinta, y no hay columna que lo pueda
expresar: un material puede exigir **varios** otros, con **cantidades**
distintas, y esos a su vez pueden exigir más. Es una relación **de muchos a
muchos**.

Lo que hace falta es una tabla de tres columnas —`material` · `acompañante` ·
`cantidad`— y una regla: avisar, sugerir, o impedir. En la industria esto se
llama lista de materiales, y es un **módulo**, no un campo.

**Y la parte cara no es guardarlo: es dónde interviene.** Al despachar, al
reservar, al importar, al comprobar existencias. Ésa es una conversación aparte
y necesita su propio análisis.

---

## 4 · LO QUE COSTARÍA, CON HONESTIDAD

Rangos, no promesas. Y lo ordeno por lo que desbloquea.

| | Qué | Coste | Qué desbloquea |
|---|---|---|---|
| **1** | `AC_WIDTH` calculado del propio `AC` | **1 hora** | Higiene. Quita una pareja que puede separarse |
| **2** | **Desatar la papelera del ancho del archivo** | **medio día** + migración + prueba | **Que añadir una columna deje de dar miedo, para siempre** |
| **3** | Campos que define el cliente (guardar, definir, enseñar, editar) | **varios días** | Caducidad, código de proveedor, color, lote… sin tocar código nunca más |
| **4** | Que esos campos entren y salgan en importar/exportar | **1-2 días más** | Que el campo sirva de verdad |
| **5** | Relaciones entre materiales | **módulo aparte** | Necesita su propio análisis antes de dar un número |

**Y la parte que nadie cuenta, que hay que decir antes de empezar la 3:** el
coste de verdad no es guardar el campo. Es que **cada pantalla tiene que
aprender a enseñar algo cuyo nombre no conoce**. Movimientos, el tablero, los
filtros, el buscador, la exportación, el reporte diario, la importación. Un
campo que se puede definir pero que no sale en ningún sitio no sirve de nada, y
ahí es donde se va el tiempo.

**Y un coste estructural que conviene ver ahora:** hoy la suite de pruebas puede
comprobar que dos listas de columnas coinciden porque **las dos las escribimos
nosotros**. Con campos que inventa el cliente, eso deja de ser posible para
esos campos. No es una razón para no hacerlo — es una razón para que la parte
genérica esté muy bien probada, porque es la única que podremos probar.

---

## 5 · LO QUE YO HARÍA, Y EN QUÉ ORDEN

**La 2 primero, y ahora.** Medio día que convierte «añadir una columna es un
riesgo enorme» en «añadir una columna es añadir una columna». Todo lo demás de
esta lista —y `IMPORT_ID`, y los campos del cliente— depende de eso, y mientras
no esté hecho **cada columna nueva vuelve a abrir la discusión de hoy**.

Después, la 1, que es una hora.

Y **la 3 cuando haya un cliente que la pida pagando**, no antes: es la clase de
función que se diseña distinta según para qué la quiere el primero que la use.
Lo que sí haría ya es **no cerrar la puerta**: ninguna decisión de esta semana
debería hacer más difícil tener `CUSTOM_FIELDS` dentro de seis meses.

---

## 6 · Y QUÉ PASA CON `IMPORT_ID` MIENTRAS TANTO

La decisión de hoy no cambia:

- **Si hacemos la 2 ahora**, `IMPORT_ID` se añade como columna detrás, sin
  riesgo, y es lo que Jose quería desde el principio.
- **Si no**, va la opción C —que el servidor conserve la marca en el
  comentario—, que cierra H-22 igual y no toca nada.

**Son compatibles:** la C se puede hacer hoy y la columna el día que la papelera
esté desatada. Lo único que no se puede es añadir la columna **sin** desatar la
papelera, que es donde estábamos esta mañana.


---

## 7 · ✅ HECHO EL 27/10 — LA 2 ESTÁ CONSTRUIDA Y MEDIDA

Jose: *"dale con la 2."*

### Qué se hizo

**`alinearPapelera_(sheet)`**, llamada desde los tres sitios que tocan columnas
de la papelera (`ensureTrashSheet_`, `findTrashedById_`, `listTrash`). Busca
«Deleted At» **en la cabecera —no lo calcula: lo LEE—** y, si está a la
izquierda de donde ahora le toca, mete columnas vacías delante hasta cuadrarlo.

**Lo importante de cómo lo hace:** las mete con `insertColumnsBefore`, **que es
Sheets quien mueve los datos**. No se lee ni se reescribe una sola fila, así que
no existe un estado a medias. Es la lección del 26 de septiembre aplicada antes
de que haga falta: *la forma más segura de mover datos es no tocarlos.*

**Lo que no hace, a propósito:** no crea la hoja (se llama desde caminos de sólo
lectura), no quita columnas nunca, y si la cabecera no dice «Deleted At» deja la
hoja intacta en vez de adivinar.

### Y una prueba que de verdad lo demuestra

`tools/test-papelera-se-alinea-sola.js`, 15 comprobaciones. **No mira si el
código llama a `insertColumnsBefore`** —eso sería comprobar que el código hace
lo que el código dice—: construye una hoja falsa cuyo `insertColumnsBefore`
mueve los datos como Sheets, ejecuta la función real sacada del archivo, y
**lee la fila con `TR.DELETED_AT`** para ver si sale el dato correcto.

Y empieza comprobando que **el fallo existía**: antes de alinear, el dato sale
corrido. Sin ese paso, la prueba aprobaría también a quien no hiciera nada.

### LA MEDIDA — qué cuesta ahora una columna

No es una opinión. Se probó: se subió `AC_WIDTH` a 26, se añadió `IMPORT_ID:25`
al mapa, y se corrieron las pruebas de papelera y de columnas.

| Antes de hoy | Después |
|---|---|
| La papelera de cada cliente se leía desplazada | **Se coloca sola, al leerla** |
| `test-boneyard` exigía `AC_WIDTH = 25` clavado | Exige que el ancho **cubra la última columna**, que es lo que de verdad importa |
| *"Es un riesgo enorme para una etiqueta"* | **7 de 7 pruebas en verde con la columna 26 puesta** |

**Añadir una columna pasó a ser añadir una columna.**

Lo de `test-boneyard` merece una línea aparte: decía `/var AC_WIDTH = 25;/`, o
sea, **era una tercera lista que tenía que coincidir con las otras dos**. Ahora
comprueba que `AC_WIDTH` cubra la última columna del mapa — el mismo guardia,
sin tener que apaciguarlo cada vez.
