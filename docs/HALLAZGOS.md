# Hallazgos — registro único, con gravedad y motivo

Pedido por Jose el 26/10: *"pon todo lo que encuentres en la lista, ponle nivel
de importancia, anota exactamente por qué debe ser cambiado/arreglado y
continúa con lo siguiente."*

**Cómo leer esto.** Una fila por hallazgo. La gravedad no es una opinión sobre
lo feo que es: es **qué pasa si no se arregla**, que es lo único que sirve para
decidir el orden. Nada de lo que hay aquí está arreglado todavía — esto es la
lista, no el parte de trabajo.

| | Significa |
|---|---|
| 🔴 **ALTA** | Alguien pierde datos, o no puede recuperarlos, o la app dice algo falso sobre su dinero o sus datos |
| 🟠 **MEDIA** | Se puede explotar o confundir en condiciones concretas; o la app promete algo que no cumple |
| 🟡 **BAJA** | Hoy no hace daño, pero depende de que nadie toque la línea de al lado |
| ⚪ **HIGIENE** | No hay daño posible; se arregla porque es gratis y quita la pregunta |

---

## 📍 DÓNDE VA CADA UNO — al 2/11

Esta tabla existe porque el registro empezaba a mentir por omisión: arreglé
nueve cosas y la lista seguía describiéndolas todas como pendientes. **Una lista
de pendientes que incluye lo ya hecho deja de usarse en una semana.**

### ✅ Arreglado y entregado (v13.0 → v13.4)

| | Qué | Dónde |
|---|---|---|
| H-04 | El escape a mano en el nombre de un documento | v13.0 |
| H-05 | El texto sin escapar en la pantalla de inicio de sesión | v13.0 |
| H-23 | El lector de documentos, apagado por un modelo retirado | v13.1 |
| H-22 | Editar el comentario sacaba una fila de su importación | v13.2 |
| E-01 | Las dos `APP_VERSION` podían separarse | v13.3 |
| E-03 | Dos funciones podían llamarse igual sin que nadie lo notara | v13.3 |
| — | **La papelera, desatada del ancho del archivo** | v13.3 |
| — | **Borrar, roto por la columna nueva** (el fallo del 26/9 otra vez) | v13.3 |
| — | Deshacer una importación ya no llena la papelera | v13.2 |
| — | La barra de progreso que no se cerraba | v13.4 |
| — | Un movimiento restaurado vuelve a su sitio, y vuelve ya | v13.4 |
| — | Las dos frases que decían que lo deshecho va a la papelera | v13.2/13.4 |
| — | **Básico: «Check my data» de vuelta y los recuadros escondidos** — *verificado por Jose el 3/11* | v13.5 |
| — | **La papelera no salta al restaurar** — *verificado por Jose el 3/11* | v13.5 |
| — | **El tope de 200 al borrar, dicho antes de borrar** — *verificado el 3/11* | v13.5 |
| — | Las cabeceras de Dashboard, Movements e Incoming explican qué son | v13.5 |
| N-01 | **El recuadro con candado enseña lo que ofrece, en vez de girar para siempre** | v13.8 |
| N-02 | **La casilla aguanta el repintado doble** — se mide el plegado, no el tamaño | v13.8 |
| N-04 | **«Undo this import» desaparece cuando ya se usó** — y el fichero se puede volver a subir | v13.6 |
| — | **Ponerle precio a lo que ya está en la estantería** (Ajustes → Prices) — desbloquea el encargo de OX | v13.6 |

### 🔵 Decidido por Jose, **sin construir todavía**

| | Qué |
|---|---|
| H-13 | Que 🩺 Check this installation cuente los ficheros públicos y traiga el botón |
| H-17 | 2 años de auditoría · 90 días de errores, y escribirlo en los Términos |
| — | Limpieza de la papelera a los 30 días, con avisos |
| — | Tope de 200 al borrar · agrupar la papelera · paginar (H-01) |
| — | Restaurar en orden: la entrada antes que la salida |
| — | Devolver `btnDataCheck` a Básico, y esconder el recuadro con su botón |
| — | Que una sección con candado no llame al servidor |

### ⏸ Aparcado con los pasos escritos

| | Qué |
|---|---|
| — | El lector de correos que tarda 4 minutos (3 pasos anotados el 27/10) |
| — | El robot de pruebas y las invariantes |
| — | Trabajar sin conexión · conteos rotatorios · tocar el estante |

### 🔴 Abierto y me toca a mí

H-02, H-09, H-10, H-12, H-14, H-15, H-16, H-18, H-19, E-02, E-04.

**Y lo del 3/11, que es lo primero de la cola** (sección `LO DEL 3/11`):

| | Qué | Estado |
|---|---|---|
| ~~🔴 N-04~~ | ~~«Undo this import» no se va nunca~~ | ✅ **v13.6** |
| 🔴 **N-08** | **El guardia de cuota bloquea la app y la pantalla no lo dice** | Encontrado y medido el 3/11. **Jose: no tocar todavía** |
| ~~🔴 N-01~~ | ~~La sección con candado se queda con el reloj girando~~ | ✅ **v13.8** |
| ~~🔴 N-02~~ | ~~La casilla se desmarca sola~~ | ✅ **v13.8** |
| 🟠 N-09 | Restaurar pliega la lista a la primera página, y por eso no se ve volver el movimiento | Anotado el 3/11 |
| 🟠 N-03 | Project View no tiene cabeceras explicadas — no hay mecanismo, no falta texto | Pequeño y cerrado |
| 🟠 N-14 | Transfer: la estantería sugerida añade fila en vez de llenar la vacía | Anotado el 3/11. Dos líneas |
| 🟠 N-15 | El teléfono: las casillas miden **13 px** donde el dedo pide 44 | Medido el 3/11 |
| 🟠 N-10 | Un movimiento archivado no se puede marcar y nada dice por qué | Anotado el 3/11 |
| 🟠 N-11 | El Dashboard ve materiales que Movements no, y hay que acordarse | Anotado el 3/11 |
| 🟡 N-13 | «64 of 65»: la explicación está en un *hover*, y en el móvil no hay | Anotado el 3/11 |
| 🟡 N-12 | La columna de fecha mezcla dos datos con dos formatos | Anotado el 3/11 |
| — | La versión y el código de compilación en Ajustes | Aprobado, sin construir |
| — | **Las ramas no son las del plan** — ver `DOS-RAMAS.md` §3/11 | 🙋 Necesita tus manos |
| — | La ventana de Ajustes que se cierra sola al deshacer una importación | Del 29/10, sigue abierta |

### 🙋 Abierto y **necesita tus manos**

| | Qué tienes que hacer |
|---|---|
| H-06 | Medir `ALLOWALL` en una copia de pruebas |
| H-11 | Decidir si cada instalación lleva su propio cliente OAuth |
| H-20 | Mirar en el registro de ejecuciones cuánto gastan los cuatro disparadores |
| H-03 | Decidir cuándo quitar el permiso `userinfo.profile` (obliga a reautorizar) |

---

## 📋 LO DEL 3/11 — lo que Jose verificó de la v13.5, y lo nuevo

Jose probó los siete arreglos de la v13.5 uno por uno. **Cuatro pasaron, tres
no.** Y los tres que no pasaron tienen algo en común que conviene decir en voz
alta: **los tres los dejé a medias**, no equivocados. Hice la mitad del arreglo
y la di por hecha sin verla funcionando.

| Lo que probó | Resultado |
|---|---|
| 1 · Básico: «Check my data» de vuelta y los recuadros escondidos | ✅ *"todo listo, y todo funcionando"* |
| 2 · Las secciones con candado no llaman al servidor | 🔴 *"las partes de Acopio Pro sigue cargando y no paran"* |
| 3 · El tope de 200 al borrar | ✅ + una pregunta (abajo) |
| 4 · La papelera no salta al restaurar | ✅ *"sí, funciona"* |
| 5 · La casilla no se desmarca sola | 🔴 *"se desmarca cada vez que aparecen más de 4-5 movimientos"* |
| 6 · Las cabeceras explican qué son | 🟠 todas menos **Project View**, donde **ninguna** |

---

### 🔴 N-01 · La sección con candado se queda dando vueltas para siempre

**Qué hice y qué falta.** `_sysCargarSiAbierta` hace exactamente lo que dice:
si la sección está con candado, **no llama al servidor**. Eso está bien y es la
mitad que importa — tres ejecuciones menos de la cuota compartida cada vez que
alguien abre Ajustes (H-18).

Lo que no miré: **quién borra el `⏳ Checking…`**. Lo escribe el HTML del
recuadro al pintarse (líneas 15799, 15807 y 15819 del Index), y lo borraba
siempre la respuesta del servidor. Al no preguntar nada, nadie lo sustituye.
Así que el recuadro se queda con el reloj girando, en gris, para siempre.

**Por qué es peor que lo que había.** Antes el recuadro contestaba algo. Ahora
parece que la app está colgada, que es la peor cosa que puede parecer. Y pasa en
la copia **que ven los clientes nuevos**.

**El arreglo.** Una sección con candado no tiene que *cargar* ni *esperar*:
tiene que **pintar lo que ofrece**. Donde hoy hay `⏳ Checking…` va la frase de
la oferta, sin reloj y sin pregunta. Es una línea por recuadro y una prueba que
diga que **ningún recuadro con candado contiene la palabra `Checking`**.

---

### 🔴 N-02 · La casilla se sigue desmarcando, y mi arreglo tiene un agujero medible

El arreglo de la v13.5 ensancha la ventana pintada para que nada marcado se
caiga, **pero sólo cuando la lista ha crecido** (`total > _movTotalAnterior`).
Ese discriminante es correcto en la idea y **se consume solo en la práctica**:

```
guardas movimientos → _pintarGuardado() → renderMovements()   ← la lista crece, la ventana se ensancha, se guarda `total`
                    → loadDataFromGoogle(true, true)
                    → renderAll()       → renderMovements()   ← `total` YA es igual al guardado: no ensancha, y la poda se lo lleva
```

**La lista crece una vez y se repinta dos.** El primer repintado gasta el
«ha crecido» y el segundo llega con las manos vacías. Por eso Jose ve que pasa
«cuando llegan varios de golpe» y no cuando llega uno con calma: con uno solo
es más probable que la fila marcada siga cabiendo en las 75 de la página.

**Y la otra mitad, que explica el número 4-5:** la página son 75 filas, así que
esto sólo se nota cuando hay más de 75 movimientos en la lista — que es
exactamente lo que pasa desde que importó 600.

**El arreglo que propongo.** Dejar de preguntar «¿ha crecido la lista?», que es
una medida indirecta, y preguntar lo que de verdad distingue los dos casos:
**¿se ha plegado la tabla a mano?** Eso es `_movPage`, y cambia sólo cuando una
persona cambia de filtro, de pestaña o de página. Mientras `_movPage` no se
toque, lo marcado sujeta la ventana, se repinte una vez o diez. Plegar sigue
desmarcando, que es la regla de septiembre y no se toca.

**La prueba que faltaba:** llamar a `renderMovements` **dos veces seguidas** con
los mismos datos y comprobar que la selección sobrevive a la segunda. La prueba
del 2/11 lo llamaba una sola vez, y por eso salió verde con esto dentro.

---

### 🟠 N-03 · Project View no tiene cabeceras que expliquen nada — y no es que falte el texto

Medido: `COL_TABLES` contiene **`stock` y `mov`, nada más**. Las cabeceras de
Project View son seis `<th>` escritos a mano en el HTML (línea 4689):

```html
<th>Category</th><th>Name / Description</th>
<th>In Warehouse</th><th>Sent to Site</th><th>Net</th><th>Status</th>
```

Sin `class="tip"` y sin `data-tip`. **No es que les falte el texto: es que no
hay mecanismo.** Por eso ahí no funciona *ninguna* y en las otras funcionan
todas.

**El arreglo es pequeño** —añadir `class="tip" data-tip="…"` a las seis— y hay
dos que lo merecen más que las otras cuatro, porque son las que nadie adivina:
**Net** (lo que queda a nombre de la obra: entregado menos devuelto) y **Status**.

---

### 🔴 N-04 · «Undo this import» no se va nunca, y el fichero sigue contando como ya importado

Jose, 3/11: *"aún sigue el botón de undo this import, incluso después de que ya
lo hice antes, y al intentar subir el mismo archivo me dice que el archivo ya
existe, pero en realidad ya está borrado. Y no se puede eliminar ese botón."*

**Encontrado, y es un solo fallo con dos caras.** El registro de importaciones
**es el registro de auditoría**: `importacionesRecientes_` lee las filas hacia
atrás y se queda con las de acción `BULK_IMPORT`. Y deshacer una importación
**no quita** esa fila —el registro de auditoría es de sólo añadir, a propósito—
sino que escribe una fila nueva, `IMPORT_UNDONE`, con el mismo `importId` en la
columna 5.

Nadie lee esa fila. Así que:

- `listImports` sigue devolviendo la importación → **el botón de deshacer se
  queda ahí**, y al pulsarlo dice *«Nothing left from that import»*.
- `importacionConHuella_` sigue encontrando la huella → **«este fichero ya se
  importó»** sobre un fichero cuyas filas ya no están.

**El dato que falta ya está escrito en la hoja.** El arreglo son unas ocho
líneas: recoger en `importacionesRecientes_` los `importId` que aparezcan en
filas `IMPORT_UNDONE` y saltarse los `BULK_IMPORT` que estén en esa lista. No
hay que borrar nada ni añadir ninguna columna.

**Y la cara que no se arregla con eso:** una importación deshecha **a medias**
(`more: true`, porque pasó de `MAX_BORRADO_POR_TANDA`) sí tiene filas vivas y
sí debe seguir en la lista. Así que la marca de «deshecha» tiene que ponerla el
último trozo, no el primero.

---

### 🔴 N-08 · **ENCONTRADO: no es lentitud, es nuestro propio guardia de cuota**

Jose mandó el registro de ejecuciones del momento exacto en que el fichero de
600 no cargaba, y ahí estaba, sin teoría de por medio:

```
12:31:40  processMovement  4.585 s  Completed
12:31:45  processMovement  1.112 s  Failed   ← y ocho más iguales
    Error: Too many requests — please wait a moment and try again.
        at requireQuota_(Code:2314:11)
        at processMovement(Code:3904:3)
```

**El mensaje es nuestro.** Lo lanza `requireQuota_('pm', auth.email, 240, 60)`:
240 llamadas por minuto y por usuario, para **todo** `processMovement`.

Y Jose aclaró lo que mata mi primera teoría: **todos sus ficheros son CSV**, y
el de 800 carga rápido mientras el de 600 no. Así que no es la conversión de
Excel ni el tamaño. Es que **llegó al tope**, y el tope no se mide como parece:

```js
if (n >= limit) return false;
cache.put(key, String(n + 1), windowSec);   // ← la cuenta vuelve a durar 60 s ENTERA
```

**Cada llamada que pasa renueva el plazo completo.** No es una ventana que se
desliza: es *«60 segundos de silencio y se borra»*. Mientras alguien siga
usando la app, **la cuenta nunca se reinicia** — se acumula. A cien llamadas
por minuto sostenidas, a los dos minutos y medio estás bloqueado sin haber
pasado de 240 en ningún minuto.

Y encima la pantalla **no dice nada**: se queda girando. Por eso Jose esperó
sin ver un error.

**Lo que NO hice, y es a propósito:** Jose dijo *"la 5 no hagas nada aún, hay
que verificar bien todo"*. Queda escrito y medido, sin tocar.

**Lo que yo propondría cuando toque, en este orden:**

1. **Que la ventana se deslice de verdad** (no renovar el plazo en cada
   llamada). Es el arreglo real y son dos líneas.
2. **Que la pantalla diga que está esperando por la cuota**, en vez de girar.
   Un tope que no se explica es indistinguible de una app colgada.
3. **Revisar si 240/minuto es el número correcto** ahora que hay operaciones
   masivas: importar, deshacer y restaurar hacen muchas llamadas seguidas por
   diseño, y el tope se escribió pensando en alguien tecleando movimientos.

---

### 🟠 N-09 · Al borrar y restaurar, la lista vuelve a la primera página

Jose: *"estoy restaurando movimientos para ver si regresan al orden justo de
donde se los borró pero no logro verlo, porque al borrar un movimiento la lista
se actualiza y se regresa a la pantalla más arriba, no completamente arriba
pero al final de la lista inicial."*

**Medido sobre su vídeo, fotograma a fotograma:** antes de la operación la
tabla decía **«300 of 1347 records»**; después, **«150 of 1347»**. O sea que
perdió las veces que había pulsado «Load 75 more».

La única línea que puede hacer eso es `_movPage = 1` dentro de
`_showMovementRows`, que es lo que corre **al restaurar desde la papelera**:
lleva a Movements, pliega la lista a la primera página y busca ahí la fila
devuelta. Es el mismo fallo que ya se arregló el 4/10 para el botón de histórico
—*"un botón que trae cosas no puede esconder las que ya estaban"*— y que a esta
función no se le aplicó.

**Y tiene una consecuencia peor que el salto**, que es justo lo que impide la
prueba que Jose quería hacer: si el movimiento restaurado cae **más allá de las
75 primeras**, `_spotMovementRows` no lo encuentra y la app dice *«those rows
are no longer in the history»* sobre una fila que sí está. **Por eso no logra
verlo.**

**El arreglo:** en vez de plegar a la página 1, **ensanchar hasta que la fila
buscada esté pintada**. Y envolverlo en `_repintarSinSaltar`, que ya existe y
es exactamente para esto.

---

## 📋 LO DEL 11/11 — CUATRO PARA LA SIGUIENTE VERSIÓN · M-01…M-04

Jose, con un PDF adjunto que **es la prueba del tercero**: el Bill of Lading de
Windsor del 3/11 guardado por la app, con las páginas a media hoja y la primera
de lado. No hace falta reproducir nada — el fallo viene adjunto.

> **Nada de esto está construido.** Son cuatro decisiones con su medida al lado,
> para que Jose elija. M-03 (b) es un fallo; los otros tres son cambios de
> comportamiento, y uno de ellos tiene un riesgo que hay que decidir antes.

---

### 🟠 M-01 · En el teléfono, cada movimiento tiene que ser una tarjeta

Jose: *"en el teléfono, la app debe comportarse como una app; cada fila o
movimiento debe mostrar sus propias opciones, y debe ser del tamaño de una
tarjeta que entre en la pantalla con toda la información — nombre, cantidad,
ubicación, usuario que lo ingresó y demás, si es posible, sin mover nada."*

**Lo que hay hoy, medido.** Movements es una `<table>` con un ancho mínimo
declarado que calcula `_anchoDeclarado` sumando los `width:NNpx` de las columnas
más `MOV_SEL_COL_W`. El bloque de teléfono (`@media(max-width:768px)`, línea
~3921) **sólo achica el relleno de las celdas** (`th,td{padding:var(--pad-celda-sm)}`).
No hay nada que convierta una fila en tarjeta. En un teléfono de 360 px eso
significa arrastrar de lado para leer **una sola fila** — justo lo que él dice.

**Y no es sólo Movements.** Dijo *"cada fila o movimiento"*: la misma tabla con
el mismo problema está en Stock, en Incoming y en la papelera.

**La trampa, y es la de siempre.** Lo fácil es escribir un segundo pintador para
el teléfono. Eso son **dos sitios que tienen que decir lo mismo sin que nada lo
obligue** — el fallo que lleva todo el proyecto repitiéndose. La forma que no se
parte: **un solo pintador** que recibe la fila y devuelve `<tr>` o tarjeta según
el ancho, y las pruebas que ya miden columnas (`test-columnas.js`,
`test-nada-se-mueve.js`) con su gemela de tarjeta.

**Lo que hay que decidir, porque no es gratis:** una tarjeta con nombre,
cantidad, ubicación, usuario, fecha y sus botones ocupa unos 4 renglones. En una
pantalla de teléfono entran **tres o cuatro movimientos**, contra las diez filas
de hoy. Se gana «se lee sin mover nada» y se pierde «veo diez de un vistazo».

---

### 🟡 M-02 · La cámara: varias fotos seguidas, y reordenarlas arrastrando

Jose: *"la primera vez que el usuario toma la foto se le da la opción de tomar
más, así que solo toma la foto y se suma un número con la cantidad de fotos, sin
necesidad de revisar las fotos… también sería buena la opción de poder mover y
cambiar el orden de las fotos solo arrastrándolas entre ellas."*

**Lo que hay hoy.** `triggerCameraCapture(uid)` pulsa un
`<input type="file" capture="environment">`. Cada disparo dispara `change`, la
foto entra en la tira, **y la cámara se cierra**. Para la segunda hay que volver
a tocar 📸. El aviso `— 📸 tap again to add a page` sólo sale cuando hay
exactamente una foto.

**Lo que NO se puede hacer, y hay que decirlo antes de prometer nada.** La
pantalla de *«¿Usar foto? / Repetir»* **es de la cámara del teléfono, no
nuestra**. Un `input` con `capture=` le entrega el trabajo a la cámara nativa, y
una página web no puede saltarse esa confirmación. No hay forma. Lo que sí se
puede es **reabrir la cámara sola después de cada foto**, de modo que la
secuencia sea *disparar → Usar foto → cámara otra vez*, con el número subiendo,
y un botón **Done** para parar.

> **Y esto hay que medirlo en su teléfono antes de construirlo.** Volver a
> pulsar el `input` desde el manejador de `change` puede que algunos navegadores
> lo bloqueen por no venir de un gesto de la persona. Si se bloquea, el plan B
> es dejar el botón 📸 enorme y pegado a la tira, que son dos toques en vez de
> uno, y eso sí funciona siempre.

**Arrastrar para reordenar: esto es más barato de lo que parece.** El orden de
las fotos en la tira `#strip-<uid>` **ya es el orden de las páginas del PDF** —
`_collectDocGroups` las recorre con `querySelectorAll`, que devuelve el orden del
documento. Reordenar es mover un `<div>`, no tocar ningún dato. Un cuidado: los
eventos `dragstart/drop` de HTML5 **no existen al tocar con el dedo**; en el
teléfono hay que hacerlo con eventos de puntero, que es donde está el trabajo.

---

### 🔴 M-03 · El PDF de las fotos: a media hoja y de lado

Jose: *"al guardar el PDF con las fotos, se ven peor que nunca; las fotos solo
ocupan una parte de toda la hoja y también se guardan giradas."*

**Son dos causas distintas, y conviene no confundirlas otra vez** — el 12/10 se
arreglaron juntas, y por eso una se quedó a medias.

#### (a) La hoja es siempre vertical. Y esto es aritmética, no un fallo

`photosToDocPdf_` (`Code_v3_fixed.gs` ~9552) fija `PAGE_W = 612` y
`PAGE_H = 792` — Carta **vertical** — y escala con
`Math.min(PAGE_W/origW, PAGE_H/origH)`.

Una foto apaisada de 4:3 entra a lo ancho de la caja (612) y queda en **612 ×
459 puntos**: **el 58 % de la hoja**, y el resto en blanco. No hay manera de
llenar una hoja vertical con una foto apaisada sin deformarla. **Las páginas del
PDF que mandó son exactamente esto.**

Tres salidas, y la tercera es la que yo tomaría:

| | Qué | Qué cuesta |
|---|---|---|
| **i** | Poner la hoja en apaisado cuando las fotos lo son. En Google Docs el tamaño de página es **de todo el documento**, así que es una orientación por grupo de documento — lo cual está bien, porque las páginas de un mismo albarán se fotografían igual | barato; no resuelve un grupo mezclado |
| **ii** | Girar 90° las fotos apaisadas en el teléfono para que llenen la hoja vertical | llena la hoja, pero quien lo lea tiene que torcer la cabeza |
| **iii** | **Dejar de pasar por Google Docs.** Armar el PDF desde HTML (`Utilities.newBlob(html,'text/html').getAs('application/pdf')`): orientación por página, márgenes de verdad, la foto encajada como se quiera | el control entero **y de paso quita el Doc temporal y el permiso de Documentos — que es H-08**, un permiso que la versión gratis ni usa |

> **(iii) hay que probarlo antes de prometerlo:** convertir HTML a PDF con
> `getAs` funciona en Apps Script, pero Google no lo documenta como garantía.
> Una prueba de media hora lo resuelve, y si falla, (i) sigue estando ahí.

#### (b) Las fotos giradas: hay DOS puertas y sólo una endereza

Esto sí es un fallo nuestro, y tiene la forma de siempre.

```
getBase64()      línea 7620 → llamada desde UN solo sitio (línea 8554)
_compressImage() línea 22123 → llamada desde los grupos de documentos (22027)
```

`getBase64` lleva encima el bloque entero de comentarios del 12/10 explicando la
marca EXIF: compara el tamaño que da el navegador respetando la marca con el
crudo y **sólo reescribe si de verdad giró**. Es un arreglo cuidado.

**Y las fotos del PDF no pasan por ahí.** Pasan por `_compressImage`, que dibuja
en un canvas desde un `<img>` y **no comprueba la orientación en ningún
momento**. El arreglo del 12/10 arregló la puerta de un solo archivo y dejó
intacta **la puerta multifoto, que es justo la que construye el PDF**.

**Dos funciones que tienen que estar de acuerdo sobre la orientación y nada las
obliga.** El arreglo no es copiar el bloque EXIF a la segunda: es que haya **una
sola puerta**, y que `_compressImage` la use.

---

### 🟡 M-04 · Cerrar la ventana al guardar y dejar sólo el aviso abajo a la izquierda

Jose: *"implementemos el cerrar las ventanas o lo que el usuario guarda luego de
dar clic en guardar, para que el usuario pueda seguir haciendo lo que necesita
hacer, y solo dejamos el toast abajo a la izquierda."*

**Lo que hay hoy, y por qué está así.** La ventana se queda abierta **todo el
viaje al servidor**, y sólo cuando contesta llama a `_btnDone(btn, true, …)`,
que enseña el ✓ **700 ms** y después cierra. El comentario de esa función dice
por qué: *«un guardado que cierra su ventana al instante no se distingue de un
guardado que no hizo nada»*. La espera que molesta **no son esos 700 ms** — es
el viaje al servidor con la ventana congelada delante.

**El aviso.** La regla base lo pone **arriba y al centro** en el ordenador
(`#toastContainer`, línea 3629); en el teléfono ya baja y ocupa todo el ancho
(línea 3979). «Abajo a la izquierda» es un renglón en el ordenador y poco más en
el teléfono.

**El riesgo que hay que decidir, y es la razón de no construirlo sin preguntar:**
si la ventana se cierra antes de que el servidor conteste **y el guardado
falla**, lo que escribió se perdió. Y una entrada es el formulario más largo de
la app.

| | Qué | Qué pasa si falla |
|---|---|---|
| **1 · recomendada** | Cerrar al instante, guardando el payload. Si falla, **se vuelve a abrir la ventana con todo dentro** y el aviso dice por qué | no se pierde nada; es un susto, no una pérdida |
| 2 | Cerrar sólo cuando el servidor dice que sí, pero sin los 700 ms | ahorra menos de un segundo — no resuelve lo que pide |
| 3 | Cerrar al instante y poner un botón **Reopen** en el aviso del fallo | igual de seguro, un toque más |

**Mi recomendación: la 1, más el aviso abajo a la izquierda.** Y una condición
—que vale la pena escribirla porque se va a olvidar—: **el ✓ de 700 ms no
desaparece, se muda**. Pasa a ser lo que confirma el aviso de abajo, porque el
argumento del comentario del 12/09 sigue siendo cierto: algo tiene que decir que
ocurrió.

---

## 📋 LO DEL 11/11

### ~~🔴 La casilla del teléfono~~ ✅ **v14.9**

Jose, con capturas de dos teléfonos: *"no sé por qué el checkbox es tan
grande."* Medido: **34 × 34 px dentro de una celda de 30**. Se salía cuatro
píxeles y tapaba la fecha.

**Y el error de fondo era mío, del arreglo de N-15.** Aquello pedía un **área de
toque** de 44 px; yo agrandé **la casilla**. No es lo mismo: una casilla nativa
estirada a 34 px no se lee como una casilla grande, se lee como un cuadro vacío.
Ahora 20 px a la vista dentro de un área de 44 donde se puede tocar en cualquier
punto — y 44 **sólo en el teléfono**, porque en el ordenador le robaba 14 px a
la columna del material.

### ~~🔴 W-05 · La etiqueta con un estante que no existe~~ ✅ **v14.9**
### ~~🟠 W-06 · Qty se comía el sitio de Available~~ ✅ **v14.9**

### 📈 CRECER — el plan, en `docs/CRECER.md`

Del vídeo que mandó Jose (*«What's Actually Becoming Valuable In The AI Era?»*):
560.000 apps nuevas en seis meses de 2026 contra 600.000 en todo 2025.
**Construir dejó de ser el cuello de botella.** Dos camiones de tacos, los
mismos tacos, uno con cola: *la cola es la parte valiosa*.

**Dónde está Acopio en ese argumento, medido:** por delante en lo que el vídeo
supone —un producto que funciona en producción, con quince versiones y 211
pruebas— y **en cero en lo que llama valioso**: sin lista, sin audiencia, sin un
sitio donde quien tiene el problema se tropiece con él. El hueco del vídeo de la
landing lleva meses diciendo *«Needs your recording»*.

**Y la reunión de la panadería es esa lección por las malas:** fue a enseñar la
app a quien no había dicho que tuviera el problema.

**La verdad incómoda, y queda escrita:** de la v13.5 a la v14.9 en dos semanas,
el producto mucho mejor y **el negocio igual que al empezar**. Ningún arreglo de
esta lista trae un segundo usuario.

---

## 📋 LO DEL 10/11 — REVISIÓN COMPLETA

> **Tres correcciones a mi propia revisión, hechas al ir a construirla:**
> **H-15 no existe** (el testigo es HMAC-SHA256 con dos UUID, no `Math.random()`
> — retirado de la cola antes de gastar tiempo); **C-03 ya estaba construido**
> (`runDataQualityScan` sí revisa aritmética, con la familia `negative`); y
> **O-03 eran 14 clases muertas, no 25** (once las construye el código al
> vuelo). Está explicado en `REVISION-10-11.md`.
>
> **Entregado en la v14.7:** ~~C-01~~, ~~C-02~~, ~~D-01~~ y las 14 reglas de CSS
> muertas. **Sigue abierto:** D-03, O-01, O-02 y la lista de seguridad.

Está entera en **`docs/REVISION-10-11.md`**, con los números medidos. Aquí sólo
lo que entra en la cola:

| | Qué | Medido |
|---|---|---|
| 🔴 **C-01** | La media de coste se redondea en cada paso y el error se acumula | **−$202,72** sobre 7.000 unidades tras 1.000 entradas |
| 🟠 **C-02** | Un stock imposible se tapa con un cero. La app **sí lo detecta** y manda la prueba a `Logger.log`, que nadie abre | 2 `Math.max(0,…)` sin registro + 4 `_errors` que sólo van al log |
| 🟡 **C-03** | `runDataQualityScan` revisa nombres, no aritmética | — |
| 🟠 **D-01** | La media de coste se pisa en cada entrada y no deja historia | — |
| 🟡 **D-03** | Una fila corregida al importar no queda marcada en el archivo | — |
| 🔴 **O-01** | Cada inicio de sesión lee el archivo **entero** | 1,3 M de celdas con 50.000 movimientos |
| 🟠 **O-02** | 750 KB de JS a cada navegador en cada carga | 238 KB comprimidos |
| 🟡 **O-03** | 25 clases de CSS que no usa nadie | de 794 |

**Y lo que NO está roto, que también se midió:** la inyección de fórmulas está
cubierta (`textCell_`, 71 usos), no hay XSS encontrado, las 65 acciones pasan
por una sola puerta que verifica sesión, y el borrado en tanda no repite
barridos.

---

## 📋 LO DEL 9/11 — TRES DE LA DEMO DE LA PANADERÍA

### 🔴 W-05 · La etiqueta sale con una ubicación QUE NO EXISTE

Jose, 9/11, con tres capturas: *"al hacer un entry y poner la locación en
minúscula sí me permite guardar y no se cambia a mayúscula hasta que se guarda,
lo cual no está mal, PERO AL GUARDAR Y DAR CLIC EN IMPRIMIR LA ETIQUETA, ÉSTA
SALE CON LA LOCACIÓN EN MINÚSCULA, LA CUAL NO EXISTE. Pero al salir y volver a
entrar sí se cambia a mayúscula, lo cual significa que el cambio se hace después
de crear el label."*

**Es el peor de los tres y no es cosmético.** Una etiqueta es un objeto físico:
sale de la impresora, se pega en un pallet y se queda ahí. Una que dice `d3b`
cuando el estante se llama `D3B` manda a alguien a buscar un sitio que no
existe, y el lector de códigos tampoco lo encontrará.

**La causa, medida.** Hay DOS constructores de etiquetas:

| | De dónde saca los datos |
|---|---|
| `_labelsFromMovements(movs)` | de los movimientos **ya guardados** — normalizados |
| `_labelsFromEntry(materiales, compartido)` | **del formulario**, `l.loc` tal como se tecleó |

El aviso de «Saved ✓ · 🏷 Print labels» usa el **segundo**. O sea que la
etiqueta se construye con lo que había en la pantalla, no con lo que se guardó
en la hoja — y el servidor normaliza al escribir. De ahí que al recargar sí
aparezca en mayúsculas: la recarga trae la fila de verdad.

**El arreglo que propongo, y no es poner un `toUpperCase()` ahí.** El servidor
ya devuelve las filas recién guardadas en `res.movimientos`, ya normalizadas —
se añadió para pintarlas sin recargar. La etiqueta debe salir **de ahí**, con
`_labelsFromMovements`, que ya existe. Eso además **borra el segundo
constructor**, que es el verdadero defecto: dos formas de fabricar la misma
etiqueta, una de ellas con datos sin pasar por el servidor.

(Si un servidor viejo no devolviera `res.movimientos`, se cae al camino de hoy.
Pero entonces conviene que la ubicación vaya en mayúsculas igualmente.)

### 🟠 W-06 · «Qty» y «Available» ocupan mal el sitio en la salida

Jose, con captura: *"¿por qué la parte de QTY y AVAILABLE están así de feas? No
estaban así en la versión anterior. QTY no debe ser tan grande, jamás tendremos
un número de más de 2 cifras, máximo 3. Entonces la cantidad no debe ocupar
mucho espacio y se debe ver bien el número verde, que es el número total en ese
lugar."*

Tiene razón en el reparto: la caja de la cantidad se lleva el ancho de un campo
de texto para tres dígitos, mientras que **lo que hay disponible** —el dato que
de verdad se consulta antes de teclear— queda apretado contra el borde, en dos
líneas (`14` / `avail`).

**Lo que haría:** la caja de cantidad al ancho de tres cifras más las flechas, y
el disponible en una sola línea con sitio para leerse. Es una redistribución de
anchos, no una pantalla nueva.

### 🟡 W-07 · El nombre de la empresa y el de la persona, en minúsculas

Jose: *"en el setup, nombre de la empresa y nombre del usuario deben hacerse las
primeras con mayúscula aunque el usuario las escriba con minúscula, o
simplemente todo con mayúsculas, pero no se vería bien. ¿Qué piensas?"*

**Mi opinión: la primera de cada palabra, no todo en mayúsculas.** Y el motivo
no es el gusto:

- `cupcake empire` es una **marca**, y una marca en la cabecera de la app, en la
  pestaña del navegador y en la firma de los correos se lee como la escribe su
  dueño. `CUPCAKE EMPIRE` grita, y en un correo a un cliente suyo parece un
  error nuestro.
- **El resto de la app está en mayúsculas por un motivo distinto**: categorías,
  ubicaciones y materiales son **claves** — se comparan entre sí, y `Flashing`
  y `FLASHING` tienen que ser la misma cosa. Un nombre propio no se compara con
  nada.

Así que `cupcake empire` → **Cupcake Empire**, `jhon` → **Jhon**. Y con una
excepción que hay que escribir: **no tocar lo que ya tenga mayúsculas dentro**
(`McDonald`, `OX Glass`, `3M`), porque «arreglarlos» los estropea.

---

## 📋 LO DEL 9/11 — EL ASISTENTE DE INSTALACIÓN

**Es la primera pantalla que ve un cliente nuevo**, y es la que va a ver la
panadería. Eso la pone por delante de casi todo lo demás de esta lista: un
fallo aquí pasa delante de alguien que todavía no ha decidido si la app le
sirve.

### 🟠 W-01 · La ventana obliga a hacer scroll para llegar a «Continue»

Jose, 9/11: *"la ventana de setup, al empezar el Acopio, debe siempre ser
suficientemente grande para que no se tenga que hacer scroll; si no se puede,
entonces hay que mover el botón de Continue más arriba."*

En la captura se ve la barra de desplazamiento a la derecha y «Continue» abajo
del todo. **El primer paso de la instalación no puede esconder el botón que la
continúa.** Y la salida que propone Jose es la correcta: si la ventana no puede
crecer —la altura la manda Google Sheets, no nosotros—, entonces el pie se
queda fijo abajo y sólo desplaza el contenido.

### 🟠 W-02 · Dos sitios para lo mismo: uno que enseña y otro donde se escribe

Jose: *"quiero aplicar las mismas reglas que tenemos en la app a este lugar:
un botón «+ Add» arriba a la derecha que añada una categoría, ubicación,
proveedor o proyecto **vacío**, y que el cursor aparezca dentro para poder
escribir. Si se añade algo y no se escribe nada, al pasar de página o salir
simplemente se borra… Así sólo tenemos un lugar donde se muestran todas las
cosas, en lugar de tener 2 lugares, uno que muestra y otro que escribe."*

Y tiene razón en el fondo, no sólo en la forma: hoy hay **una caja de texto
abajo y una lista de fichas arriba**, y lo que escribes salta de un sitio a
otro al pulsar Enter. Con el botón «+ Add» la ficha nace donde va a vivir y se
escribe ahí.

**Y es exactamente la dirección de P-02**, que acabamos de terminar en la app:
un solo sitio donde está la cosa, y se actúa sobre ella ahí. El asistente se
quedó fuera de aquella pasada porque vive en otro archivo
(`SetupWizard.html`), que es justo cómo se separan dos pantallas que deberían
parecerse.

### 🔴 W-03 · Un nombre repetido se borra en silencio

Jose: *"si escribo una ubicación que ya existe, la app debe hacérmelo saber, no
sólo no hacer nada. Actualmente doy Enter a una ubicación que ya existe y sólo
se borra y no pasa nada."*

**Medido, y es literal.** En `SetupWizard.html`, tanto `addChip` como `addLoc`
hacen lo mismo:

```js
if (!W.locations.some(function(x){return x.name===v;})) W.locations.push(...);
inp.value = '';          // ← esto se ejecuta SIEMPRE
```

La comprobación del duplicado protege el dato, y después se limpia la caja
pase lo que pase. Desde fuera eso no se distingue de «se tragó lo que escribí»,
que es la peor forma de acertar: el dato está bien y la persona cree que la app
está rota.

**Lo que pidió Jose, que es lo correcto:** no borrar lo escrito, un texto en
rojo —*«ya existe esta ubicación, intenta con otra»*— y **poner en rojo un
segundo o dos la ficha que ya existe**, para que además se vea *dónde* está la
que choca. Eso último es lo que convierte un error en una respuesta.

### ✅ W-04 · Las mayúsculas: verificado, y está bien

Jose: *"no sé cómo maneja el setup las mayúsculas y minúsculas; estoy
verificando eso."* **No hace falta: está medido.**

`addChip` y `addLoc` hacen los dos `.trim().toUpperCase()` antes de guardar, y
`expand()` —el generador de la rejilla de estantes— también. O sea que
categorías, ubicaciones, proveedores y proyectos entran **en mayúsculas y sin
espacios sobrantes**, igual que `_cfgAdd` en la app. Escribir `flashing` o
`Flashing` da `FLASHING` en los dos sitios.

Lo que **no** se toca, y es correcto: el nombre de la empresa y el de la
persona. `cupcake empire` se queda como se escribió, porque es un nombre
propio y va en la cabecera de la app y en los correos.

**La única pega real es que no se ve:** escribes `p` y aparece `P`, sin que
nada lo haya avisado. No es un fallo —es la regla de toda la app— pero merece
una línea de ayuda debajo de la caja. Anotado con W-02, que toca ese mismo
sitio.

---

## 📋 LO DEL 9/11

### ~~🔴 P-02 · La selección por fila, en una sola forma~~ ✅ **v14.4**

Jose, 9/11: *"empieza con P-02 y luego P-06 y P-05 y N-08 como dijiste."*

Entregado entero. Las cinco listas —Projects, Suppliers, Locations, Directory
y Materials— usan ya casilla + barra, con la regla de uno contra varios dentro.
El detalle está en `UNA-SOLA-FORMA.md`, que queda marcado como hecho en §2.1.

**Lo que hace que esto no vuelva** no es haber convertido cinco pantallas: es
que **la barra se escribe una sola vez** (`_barraMarcados`). Copiarla cinco
veces habría sido cometer otra vez el fallo que P-02 venía a quitar — cinco
barras que tienen que comportarse igual sin que nada lo obligue. La sexta
pantalla no podrá elegir mal porque no escribe la barra: la pide.

**Tres cosas aparecieron por el camino y conviene anotarlas:**

| | Qué | Estado |
|---|---|---|
| 🟠 | *"al cambiar un nombre en materiales toda la lista se queda desactivada"* (4/11). Era `_matSetBusy` apagando **todos** los botones de la pestaña, buscador incluido. El guardia de verdad siempre fue `if (_matBusy) return;` | ✅ **v14.4** — ahora sólo espera la barra |
| 🟡 | `UNA-SOLA-FORMA.md` §2.2 decía que Materials renombra con un `prompt()` del navegador. **No es verdad**: usa `_showPrompt`, el diálogo propio, desde antes. Corregido en el documento | ✅ corregido |
| 🟠 | Al pasar las ubicaciones a la barra me llevé por delante el «Select all» y escribí que un estante que se llena entre medias se archivara solo. Las dos las pilló la suite | ✅ repuesto y corregido |

### ~~🟠 P-06 · Importar: elegir qué entra, y arreglar lo que no~~ ✅ **v14.5**

Jose, 8/11: *"si el fichero carga y muestra todas las filas incluidas las que
tienen errores, pero no carga esas, debemos trabajar en la parte de la
corrección de los errores y los filtros en los registros antes de hacer el
import."*

**El defecto de fondo: la pantalla sabía y no dejaba actuar.** Conocía la fila,
la columna y el motivo, y lo único que ofrecía era ir a arreglarlo a otro
programa. Tres celdas malas en un fichero de seiscientas filas eran abrir el
Excel, buscarlas, corregir, exportar y volver a subir.

**Tres cosas, entregadas:**

| | Qué | Por qué así |
|---|---|---|
| **Filtros** | All · Ready · Needs fixing, cada uno con su número | Tres filas malas entre seiscientas son un clic, no un rato buscando |
| **Corrección en la fila** | la celda que falla es un recuadro; sólo Category, Name y Qty | Son los tres campos que pueden invalidar una fila. Abrir los nueve sería meter un editor de hojas de cálculo dentro de una vista previa |
| **Casillas** | cada fila lista lleva la suya, marcada | Es lo que Jose pidió el 4/11; el servidor acepta `skipRowNums` desde la v12.94 y **nunca se había usado** |

**Lo que hace que esto sea seguro** es dónde se aplica la corrección: en
`leerFilasDelFichero_`, **antes de validar**. Por ahí pasan los dos caminos —la
vista previa y el guardado— así que lo que ves arreglado es lo que se guarda, y
una fila corregida pasa por **la misma** comprobación que una que vino bien. No
existe un camino «ya la arreglé a mano, déjala pasar».

Y el fichero no se toca: su huella sigue siendo la suya, así que el aviso de
«esto ya lo subiste» sigue funcionando.

**El riesgo que esto introduce, y cómo queda atado.** La regla de «esta fila
vale» tiene que estar en los dos lados —el navegador la necesita para encender
la fila mientras tecleas— y un navegador no puede llamar a Apps Script. O sea
**dos copias de una regla**, que es el fallo que este proyecto repite. Así que
`test-importar-elegir-y-corregir.js` ejecuta **las dos** sobre la misma tabla de
diez casos y exige que contesten igual, letra por letra. Comprobado: cambiar
una sola palabra en una de las dos pone la suite roja ese día.

**Y una medida que corrige lo que creía:** el fichero de 600 no tiene dos filas
malas, tiene **seis** — vacía, una palabra, negativa, cero, sin nombre y sin
categoría. La prueba las corrige las seis y comprueba que entran las 600.

### ~~🔴 R-04 · «A cero» no significaba que el almacén estuviera vacío~~ ✅ **v14.4**

Salió de la captura del 8/11: la franja decía *«1 at zero»* con **dos**
tarjetas marcando `0 wh`. Lo expliqué como correcto —la regla pedía que la obra
también estuviera vacía— y Jose lo zanjó al revés, que es lo que había que
hacer:

> *"la verdad no me importa ver un cero, pero debemos entender que el cero
> significa que no queda nada en el warehouse; lo que está en el jobsite no me
> importa porque ya está fuera."*

**Tiene razón y es de negocio, no de pantalla.** El aviso existe para decidir
**si hay que pedir**, y lo que ya se llevaron a una obra no se puede volver a
sacar de la estantería. Contarlo como existencias retrasaba el pedido justo del
material que se acababa de agotar.

Y deja la regla entera en una sola unidad de medida: `availableQty` es
`warehouseQty − reservedQty`, o sea **ya era sólo almacén**. Era el cero el que
miraba otra cosa. Como efecto secundario los dos avisos ya no pueden solaparse
— si el almacén está a cero, `availableQty` es 0 y ese material no puede caer
además en «bajo el mínimo».

---

## 📋 LO DEL 8/11

### ~~🔴 R-01 · **Lo rompí yo**: los botones de Guardar dejaron de responder~~ ✅ **v14.3**

Jose, con vídeo: *"ahora los botones de 'save changes' no se desactivan ni
cambian, solo se quedan ahí. Hay que analizar el problema, buscar dónde nomás
se afecta de esa forma a los botones, y arreglarlo."*

**Es mío, de la v14.1, y conviene que quede escrito.** El arreglo de aquella
versión fue: *una ventana que se reabre está recién abierta*, así que si un
guardado se interrumpió y dejó el botón girando, reabrir la ventana lo devuelve
a su sitio. Un `MutationObserver` mira las clases de las ventanas.

**La cadena del fallo:**

1. se pulsa Guardar → `_btnBusy` pone la rueda y apaga el botón
2. `_setModalBusy` hace `ov.classList.toggle('busy', true)`
3. eso es un cambio de clase en la ventana → salta el observador
4. la ventana sigue teniendo `show`, así que da por hecho que acaba de abrirse
   y devuelve a su sitio **el botón que acaba de empezar a guardar**

Resultado: la rueda desaparecía al instante y el botón se quedaba quieto,
mientras el guardado seguía su curso por detrás.

**Dónde pegaba, medido:** las tres ventanas que usan `_setModalBusy` —
`moveOverlay`, `editMovOverlay` y `attachOverlay` — en **19 sitios**. O sea
mover material, editar un movimiento y adjuntar un documento: tres de las
operaciones más usadas del día.

**La causa de fondo es la de siempre con otra cara:** *una señal que vale para
dos cosas distintas.* «Tiene `show`» no distingue «se acaba de abrir» de «sigue
abierta y ha cambiado otra clase». Abrirse es **pasar de no tener `show` a
tenerlo**, y eso el navegador sí lo sabe decir: `attributeOldValue`.

**Y por qué no lo vio la prueba.** `test-guardar-y-la-franja.js` ya cubría el
observador — con ocho comprobaciones, todas de texto: que exista, que mire la
clase, que llame a `_btnReset`, que no reviente sin `MutationObserver`. **Las
ocho pasaban con el fallo dentro.** Una prueba que lee el código no puede
distinguir «mira la clase» de «mira la clase mal». La que hay ahora **ejecuta**
el observador con el registro que manda el navegador en cada caso. Verificado:
las tres comprobaciones nuevas fallan contra el código de la v14.1.

### ~~🟠 R-02 · La franja de stock bajo contaba, y dejaba la búsqueda al usuario~~ ✅ **v14.3**

Jose: *"haz que los mismos colores (rojo para los que están en cero y naranja
para los que están bajo el mínimo) sean los mismos colores con los que se
muestran los materiales, ya que puedo leer lo que dice la franja pero debo
buscar el material viendo el número que hay en el warehouse, y eso es dejar
trabajo para que el usuario lo haga."*

Tenía razón y el defecto era de diseño, no de pintura: la franja de la v14.2
dice *«3 at zero · 7 below minimum»* y ahí se acaba. **La pantalla sabía la
respuesta y devolvía una cuenta por hacer** — convertir ese 3 en tres nombres
era recorrer doscientas tarjetas leyendo el número de almacén.

**El arreglo:** las tarjetas que esa franja cuenta se marcan con **sus mismos
dos colores**, puestos por **la misma cuenta** (`_alertasDeStock`), no por una
segunda regla paralela. Rojo a cero, naranja bajo el mínimo, por variable CSS y
no por un hex copiado — un hex copiado sería otra vez «dos cosas que tienen que
coincidir sin que nada lo obligue».

Y como la cuenta es la misma, se mueve con lo que se toca: subir un mínimo por
encima del stock apaga el naranja mientras se escribe.

### ~~🟡 R-03 · El fichero de 600: lo que falta ahora es la corrección, no la carga~~ ✅ **v14.5** (ver P-06 arriba)

Jose: *"si el fichero carga y muestra todas las filas incluidas las que tienen
errores, pero no carga esas, debemos trabajar en la parte de la corrección de
los errores y los filtros en los registros antes de hacer el import."*

La v14.1 arregló que el fichero **cargue**. Lo que queda es lo siguiente:
poder **ver sólo las filas con error**, **arreglarlas en la propia pantalla** y
**elegir cuáles entran**. Es la continuación natural de **P-06** (casillas en
importar), que ya tiene media pieza hecha en el servidor: `skipRowNums` se
acepta desde hace versiones.

**Anotado, sin construir.**

---

## 📋 LO DEL 5/11

### 🟠 P-09 · Un documento, un material: subir la misma foto diez veces

Jose: *"como cada material se sube en un ingreso diferente, debo subir el mismo
documento para cada material, lo cual en el teléfono significa tomar varias
fotos por cada material. ¿Hay alguna forma de subir un solo documento y que se
vea en todos los materiales con ese mismo nombre?"*

**Sí, y es más barato de lo que parece.** Lo medido:

- Los documentos se guardan en la columna `DOC_LINKS` de cada movimiento, y lo
  que hay dentro **son enlaces a Drive**, no el fichero.
- O sea que **el fichero ya puede ser uno solo**. Compartirlo entre varios
  movimientos es escribir el mismo enlace en varias filas: no se vuelve a
  subir nada, no ocupa más espacio en el Drive del cliente, y el albarán es
  literalmente el mismo documento para todos — que es lo correcto, porque **lo
  es**.
- Y `openAttachModal` ya recibe el **PO** como segundo argumento, así que la
  app ya sabe agrupar por albarán. La pieza está medio puesta.

**Lo que propongo, y es lo más pequeño que resuelve su problema:**

> Al terminar una entrada de **varios materiales**, el documento que se suba se
> adjunta **a todos los movimientos de esa entrada**, con una casilla marcada
> por defecto: *«Attach to all 6 materials in this entry»*.

Una foto, un toque, seis filas con el albarán. Es el caso de Jose exactamente:
llega un pallet, un papel firmado, varios materiales.

**Y el segundo paso, para lo que ya está guardado:** en la ventana de adjuntar,
*«Use a document already attached to this PO»* — elegir de una lista en vez de
volver a fotografiar.

**Lo que NO haría, y conviene decirlo:** compartir **por nombre de material**,
que es como Jose lo planteó. Dos entradas del mismo material en meses distintos
vienen con albaranes distintos, y pegarle a una el papel de la otra es meter
una prueba falsa en el sitio donde se guardan las pruebas. **Lo que comparte
documento es una ENTREGA, no un material.**

---

### 🟡 P-10 · La etiqueta corta las letras por la mitad

Jose, con dos etiquetas impresas: `SYM.BR.MODELHOM` / `E`. *"La etiqueta debe
adaptarse para que los nombres no queden con letras cortadas, o sea no cortar
letras sino palabras."*

**La causa, medida:** `.lbl-name` lleva `overflow-wrap:anywhere`, que es
«parte donde sea». Se puso para que un nombre larguísimo no se saliera, y hace
justo lo que dice.

**Pero cortar por palabras no basta aquí**, y conviene verlo antes de
arreglarlo mal: `SYM.BR.MODELHOME` **no tiene espacios**. Es un solo trozo. Por
mucho que se respeten las palabras, sigue sin caber.

**Entonces el arreglo son dos cosas, no una:**

1. **Que el texto se encoja hasta caber.** El tamaño es fijo (8,5 mm) para
   cualquier nombre; con uno largo debería bajar a 7, a 6, a 5. Una etiqueta se
   lee desde un metro: 6 mm entero se lee mejor que 8,5 mm partido.
2. **Y que, si aun así hay que partir, parta por el punto.** `SYM.BR.` / 
   `MODELHOME` se entiende; `MODELHOM` / `E` no.

Hoy la regla es «máximo tres líneas y lo que sobre se esconde», lo que puede
**ocultar parte del nombre sin avisar** — peor que partirlo.

---

## 📋 LO DEL 4/11 — veintitrés cosas de Ajustes, que son CUATRO

Jose repasó Ajustes pantalla por pantalla y mandó veintitrés observaciones. La
tentación es hacer una lista de veintitrés arreglos. **Sería el error.** Al
ordenarlas por lo que las causa son **cuatro patrones y dos cosas sueltas**, y
esa diferencia cambia el trabajo entero: cuatro arreglos de raíz valen más que
veintitrés parches, y además impiden que vuelvan a aparecer en la próxima
pantalla que se escriba.

---

### 🔴 P-01 · Botones que siempre están encendidos — **seis pantallas, y una es peligrosa**

| Dónde | Qué dijo Jose |
|---|---|
| Name & Logo | *"siempre está activo el botón save changes, ¿por qué?"* |
| **Permissions** | *"siempre se puede eliminar el nombre del rol y también guardar… eso es peligroso"* |
| Prices | *"el botón save siempre está activo, aun luego de guardar se vuelve a poner activo"* |
| Daily movement report | *"los botones de save y send one now siempre están activos"* |
| Locations | *"los botones de rename/remove siempre están seleccionados"* |
| Projects | lo mismo al seleccionar |

**Por qué es UN hallazgo y no seis.** Un botón encendido es una promesa: *«hay
algo que hacer aquí»*. Si está encendido siempre, deja de decir nada — y
entonces la persona tiene que acordarse ella de si cambió algo, que es
exactamente el trabajo que la pantalla tenía que ahorrarle.

**Y en Permissions no es estética, es daño.** El nombre del rol se puede
vaciar y guardar. Un rol sin nombre es un rol que nadie puede nombrar después
—ni para dárselo a alguien ni para quitárselo— y el permiso sigue existiendo
por debajo. **Es lo único de esta tanda que puede dejar una instalación en un
estado del que no se sale desde la pantalla.**

**El arreglo de raíz, una sola vez:** un ayudante que compare *lo que hay en
pantalla* con *lo que se cargó*, y encienda Guardar sólo si son distintos. Lo
mismo que ya hace falta para el aviso de «tienes cambios sin guardar». Y una
regla aparte y no negociable: **Guardar no se enciende si el campo obligatorio
está vacío.**

---

### 🔴 P-02 · La selección por fila existe, y cada pantalla la hace a su manera

Jose: *"debemos implementar la forma de selección del checkbox con el botón de
edición igual que en los otros lugares aquí también"*, y lo repite para
Categories, Materials, Locations, Projects y Directory.

**Lo medido:** el mecanismo YA existe y YA está en las cuatro
(`_rowModeBarHtml('cfg' | 'loc' | 'pm' | 'mat')`). Así que esto no es «falta
implementarlo»: es que **se comporta distinto en cada una**, que es peor,
porque enseña una cosa y luego no la cumple.

El caso que lo deja claro es **Materials** (imagen 1): al renombrar, *"toda la
lista se queda desactivada hasta que el material se cambia de nombre"*, y el
nombre se escribe en una ventanita del navegador en vez de en la propia fila —
de ahí también *"se mezclan letras mayúsculas y minúsculas"*, porque ese camino
no pasa por la normalización que sí tiene el resto.

**Lo que Jose pide, y es lo correcto:** una sola forma en todas — casilla para
elegir, y los botones de acción que se encienden **con lo que haya elegido**.

Y su regla para Categories es la mejor parte, porque sale de pensar en lo que
significa cada acción:

> *"si selecciona una se activan rename/delete, si selecciona más de una, se
> desactiva rename y sólo queda delete"*

**Renombrar es de uno; borrar es de muchos.** Eso no es una preferencia: es la
diferencia real entre las dos operaciones, y una pantalla que la respeta no
necesita explicar nada.

**Y la disposición**, también de Jose: las categorías **agrupadas en el centro
como en «Low-Stock Monitor Settings»**, no en una lista vertical. Esa pantalla
ya resolvió el problema; copiarla es gratis y de paso hace que las dos se
parezcan.

---

### 🟠 P-03 · La lista salta cuando aparece la franja de acciones

Jose, en Projects: *"al seleccionar 2 o más proyectos con el checkbox, toda la
lista salta hacia abajo al mostrar la franja de merge/clear"*. Y en Locations:
*"no debería saltar toda la lista al aparecer la franja"*.

**Es la misma familia que la papelera que saltaba** (arreglado en la v13.5) y
el «Load more» que se iba al final (arreglado el 4/10): algo aparece **arriba**
de lo que estás mirando y empuja todo hacia abajo, así que la fila que ibas a
pulsar ya no está donde tu dedo iba.

**Y la solución ya está escrita dos veces en este proyecto:** la franja
**reserva su sitio** desde el principio (invisible, no ausente) en vez de
robarlo al aparecer. Es lo mismo que se hizo con el punto de conexión —*"el
arreglo es dejar de robar sitio y RESERVARLO"*— y con `_repintarSinSaltar`.

**Que haga falta una tercera vez es el hallazgo**: la regla existe, funciona, y
no hay nada que obligue a usarla en la siguiente pantalla.

---

### 🟠 P-04 · El menú de contacto existe en Movimientos y no en el resto

Jose lo pide tres veces: en **Suppliers**, en **Directory** y en los correos.

> *"quiero que la app muestre el mismo menú con una lista de los emails, y el
> botón de enviar correo, cuando pase el mouse por cada uno de los
> supplier/brands"*

Ya existe: es la tarjeta que sale al pasar por encima de la columna *User* en
Movimientos (nombre, correo, y los botones de Email / Meet / Schedule), y está
delegada en todo el documento, así que **llevarla a otra pantalla es ponerle la
clase y el `data-` a un `<span>`**, no escribir nada nuevo.

---

### 🔴 P-05 · **Proveedor y marca no son lo mismo** — y esto es de negocio, no de pantalla

Lo más importante de la tanda, y no es un fallo de la app: es un fallo del
modelo que la app aceptó sin preguntar.

> *"hoy me di cuenta de algo, supplier y brand no es lo mismo. Yo he estado
> usando la brand como el supplier en todas las apps, pero hoy recibí unos
> pallets de flashing tape de la marca **DUPONT**, pero el supplier se llama
> **ORPAC**, incluso el papel que firmé y subí al sistema tiene ese nombre."*

**Por qué importa de verdad, y no es ordenar nombres:**

- **El albarán firmado dice ORPAC.** Si el movimiento dice DUPONT, el papel y
  el registro **no se pueden casar** — y ese papel es la prueba de lo que
  entró. Es lo único que vale en una discusión.
- **A quién se le reclama** es al proveedor, no a la marca. Un material que
  llegó mal no se le reclama a DuPont.
- **El precio es del proveedor**, no de la marca: el mismo DUPONT cuesta
  distinto comprado a ORPAC o a otro. Y ahora que empieza el seguimiento de
  valor para OX, **mezclarlos mete ruido justo en la cuenta que acaban de
  pedir**.
- Y al revés: *«¿cuánto DUPONT tenemos?»* es una pregunta buena que hoy no se
  puede contestar si DUPONT está escrito en el hueco del proveedor de unas
  filas y no de otras.

**Lo que hay que decidir antes de tocar código** (y es de Jose):

1. ¿**Dos campos** (proveedor y marca) o **la marca dentro del material**?
   *Mi recomendación: dos campos.* La marca es del material y el proveedor es
   de la compra; meterlos en el mismo sitio es lo que ya pasó.
2. **Qué se hace con lo que ya está escrito.** Hoy hay filas donde el
   «proveedor» es en realidad una marca. **No se puede adivinar cuál es cuál**,
   y una migración automática sería inventarse datos. Lo honesto: campo nuevo
   vacío, y una pantalla que ayude a repartir los nombres existentes a mano,
   una vez.
3. ¿Entra en la plantilla de importación? (Yo: sí, como columna opcional.)

**Esto no es un arreglo rápido.** Toca el archivo, la importación, los
informes y la pantalla de entrada. Pero cuanto más tarde, más filas hay que
repartir después.

---

### 🟠 P-06 · Importar: elegir qué filas entran

Jose (imagen 5): casillas para elegir **una, varias o todas**, filtrar **por
categoría o por los datos de las cabeceras**, y que el botón **cuente sólo las
elegidas**.

**Media pieza ya existe y está esperando.** `commitImport` recibe
`skipRowNums` —*"viene vacío hoy. Está porque la pantalla de la v12.94 deja
destildar filas, y el sitio correcto para decidir qué entra es el servidor"*—
así que el servidor ya sabe saltarse filas; lo que falta es la pantalla.

**Y el botón es la parte que no se puede dejar para después.** Hoy dice
«Import 800 valid rows». Si se pueden destildar filas y el botón sigue
diciendo 800, es **exactamente el fallo del 22/10** —el botón decía 1.052 e
importaba 500— con otra ropa. El número del botón y lo que entra tienen que
salir del mismo sitio.

*(Y lo pequeño: «Download CSV Template» pasa a ser **un enlace al final del
párrafo**, no un botón. Tiene razón: no es una acción principal y compite con
«Choose File», que sí lo es.)*

---

### 🟡 P-07 · Materials: dos cosas sueltas

- **«Units per box/pallet» no se entera de los renombrados.** Jose corrigió
  `FLASHING TAPE 6"` y el recuadro de arriba siguió con el nombre viejo hasta
  salir y volver. Son dos listas de la misma pantalla que se pintan por su
  cuenta: `_renderPacksPanel()` no se vuelve a llamar cuando cambia un
  material. **Dos cosas que tienen que coincidir, en la misma pantalla.**
- **«Showing first 80. Type to filter.»** sale con la lista corta. El código
  lo condiciona a `filtered.length > 80`, así que **tal como está escrito no
  debería salir** — hay que mirar en qué pantalla exactamente lo vio (el
  recorte no lo deja ver) antes de tocar nada.

---

### 🟡 P-08 · Error Log y System: caben en la mitad de sitio

Error Log, propuesta de Jose: juntar **hora + usuario**, **gravedad + dónde**,
y el **id delante del mensaje**. Altura de fila estándar. **Clic en cualquier
parte de la fila** para leer el texto entero, y **mantener pulsado** para que
salga un botón de copiar el mensaje completo.

Las tres son buenas y la última es la que más vale: un mensaje de error que no
se puede copiar entero es un mensaje que hay que transcribir a mano para
pedirle ayuda a alguien.

System: *"recoger todos esos mensajes y dejarlos dentro de un abanico que se
abre sólo al dar clic en «ver», así como «All backups in Drive (xx)»"*. De
acuerdo, y el motivo es el mismo que ya se aplicó a los respaldos: lo que casi
siempre está bien no debe ocupar sitio permanente.

---

### 📌 El orden que propongo, y por qué

| | Qué | Por qué ahí |
|---|---|---|
| **1** | **P-01 en Permissions** (sólo ahí) | Es lo único que puede dejar una instalación rota desde la pantalla. El resto de P-01 es incomodidad |
| **2** | ~~N-01 y N-02~~ | Los dos que Jose lleva viendo desde la v13.5 |
| **3** | P-01 completo + P-03 | Son los dos que se arreglan de raíz una vez y no vuelven |
| **4** | P-02 (empezando por Categories, que es el diseño que Jose ya definió) | Es el más grande de los de pantalla |
| **5** | P-06 (importar) | Tiene media pieza hecha en el servidor |
| **6** | **P-05, proveedor y marca** | El más valioso y el que más decisión necesita. **Cuanto más tarde, más filas hay que repartir a mano** |
| — | P-04, P-07, P-08 | Pequeños, cuando toque |

---

### 🔴 N-17 · La app le dice a cada cliente que tiene la mitad del espacio que tiene

Salió de una pregunta de Jose del 3/11 sobre si varios Sheets dan memoria
infinita. Buscando la respuesta apareció esto:

> **Google dobló el tope de celdas de un Sheet: de 10 a 20 millones.**
> Disponible para todos desde el **10/09/2026**, y aplica a los archivos
> nuevos, **a los que ya existen** y a los importados.
> *(workspaceupdates.googleblog.com, 10/09/2026)*

Y la app lleva esto escrito:

```js
var SHEET_CELL_LIMIT = 10000000;
```

**Consecuencia:** Ajustes → Sistema le dice a cada cliente que ha gastado el
doble de lo que ha gastado, y los «años que te quedan» que calcula
`spaceEstimate_` son **la mitad de los de verdad**.

No es un número de adorno: es la cuenta que decide cuándo hay que construir el
cierre de período (el disparador acordado el 27/10 es el **60 %**). Con el tope
a la mitad, ese disparador salta **años antes de tiempo** — o sea, trabajo
grande adelantado por un dato viejo.

**Es la falta de siempre, y esta vez contra algo que no controlamos:** una
constante escrita a mano que tiene que coincidir con un límite que pone Google
y que Google cambia sin avisarnos.

**Mi recomendación, y la decides tú:**

1. Subir la constante a `20000000`. Es una línea.
2. Y lo que de verdad importa: **que el número lleve fecha y fuente al lado**,
   porque ya cambió dos veces (5M → 10M en 2022, 10M → 20M en 2026). Una
   constante sin fecha no se vuelve a mirar nunca.
3. Rehacer la tabla de `CUANDO-SE-LLENE-EL-SHEET.md`, que además usa
   **22 columnas** cuando `AC_WIDTH` ya es **26**. Los dos errores van en
   direcciones contrarias y no se cancelan.

Con 20M celdas y 26 columnas, el techo real por archivo pasa de ~250.000–300.000
movimientos a **~500.000**. Ningún cliente está cerca.

---

### 🟠 N-10 · Movimientos que no se pueden marcar, y nada dice por qué

Jose, 3/11, con dos capturas del teléfono: *"¿por qué hay movimientos que no
puedo seleccionar? Son los más viejos que hay, creo."*

**Acertó.** Son los **archivados** (`ARCHIVE_HISTORY`), y la regla está escrita a
propósito en `renderMovements`:

```js
var selCell = isAdmin
  ? '<td class="mov-sel-cell">' + (m.archived ? '' : '<input …>') + '</td>'
```

Un movimiento archivado **no se puede editar ni borrar**, así que ofrecer la
casilla sería ofrecer un callejón sin salida. La decisión es correcta.

**Lo que está mal es el silencio.** Una fila con la casilla simplemente ausente,
sin una palabra, no se lee como «esto no se puede tocar»: se lee como que la app
se rompió. Y la prueba es que Jose lo mandó como fallo.

Y fíjate en el contraste, porque la app ya sabe hacerlo bien dos líneas más
abajo: un movimiento **sin id** sí lleva casilla, **desactivada y con su
explicación** (*"This movement has no ID yet"*). El archivado no lleva nada.

**El arreglo:** la misma casilla desactivada, con su motivo — *"Archived
movements are read-only — they can be viewed and exported, not edited."* Es una
línea, y convierte un fallo aparente en una respuesta.

---

### 🟠 N-11 · El Dashboard enseña materiales que Movements no, y hay que acordarse

Jose: *"tuve que cargar el historial viejo, todo, para poder ver los nombres que
veía en dashboard pero no en movements, y lo hice porque recordé algo sobre eso,
**no porque la app me lo dijo o sugirió**."*

Esa última frase es el hallazgo entero.

**Por qué pasa, y es correcto que pase:** el Dashboard suma TODO el histórico
—por eso el material aparece con su stock— mientras que Movements sólo trae lo
reciente, para que la app no tenga que descargar doce meses en cada entrada. Las
dos cosas están bien por separado.

**Lo que falta es la frase que las une.** Cuando el filtro o la búsqueda de
Movements da menos resultados de los que el Dashboard conoce para ese material,
la app lo sabe —tiene los dos números— y no lo dice. Debería: *"3 movements
here. This material also has older ones in the archive — load them."*, con el
botón al lado.

Hoy la app depende de que el usuario **recuerde** una característica. Eso no es
una característica: es una trampa con un truco.

---

### 🟡 N-12 · La columna de fecha enseña dos cosas distintas con dos formatos

Se ve en las mismas capturas, y Jose no lo mandó — lo vi midiendo lo anterior:

```
2026-07-20            ← unas filas
03/31/2026 08:11      ← otras
```

No es «archivadas contra activas». Es esto, de `renderMovements`:

```js
_he(m.dateRec || m.timestamp || '—')
```

**La fecha de recepción si la hay; si no, la de captura.** Dos datos con
significados distintos —cuándo llegó el material contra cuándo alguien lo
tecleó— en la misma columna, sin etiqueta que los distinga, y encima con dos
formatos distintos porque vienen de sitios distintos.

Una fecha en un almacén se usa para discutir con un proveedor. Que a veces sea
una cosa y a veces otra, sin decirlo, hace la columna inservible para eso.

**Lo mínimo:** un formato único para las dos. **Lo correcto:** que la ayuda al
pasar por encima diga cuál de las dos es.

---

### 🟡 N-13 · «64 of 65» — la explicación existe y en el teléfono no se puede leer

Jose: *"¿qué significa 64 of 65? ¿Qué debo intuir o entender por eso?"*

**Significa: 64 disponibles de 65 contabilizados.** El de abajo es la suma de
todo lo que la app sabe de ese material —en bodega, en obra, reservado,
desperdiciado— y el grande es lo que se puede sacar hoy. La diferencia de 1 está
en alguno de los otros estados.

**Y la app ya lo explica**: la barra de colores lleva una ayuda con el desglose
completo, línea por línea, incluidos los ceros.

**El problema es que esa ayuda sale al pasar el ratón por encima, y en un
teléfono no hay ratón.** Jose lo está mirando en el móvil, que es donde se usa
esto en una bodega. Así que la respuesta está escrita y es inalcanzable
justamente en el aparato donde más falta hace.

**El arreglo:** que en pantalla táctil el bloque se abra al tocarlo. Y como el
número de arriba es el que se lee, ponerle debajo la palabra que falta
—`available`— para que no haya que buscar nada en el caso normal.

---

### 🟠 N-14 · Transfer: la estantería sugerida añade una fila en vez de llenar la vacía

Jose, con dos capturas: *"al hacer transfer aparece la parte donde se pone
source rack, qty, destination, etc., pero al dar clic en la locación sugerida,
se agrega otro campo más a lo que ya hay, dejando los demás campos vacíos y que
deben ser borrados antes de guardar porque si no sale un error."*

**Encontrado, y son dos líneas de código que no se conocen entre sí.**

`_initMultiTransferSection` siembra **una fila vacía** al abrir, a propósito,
para que la pantalla no se vea como una cabecera suelta:

```js
addTransferRow('', '', '', true /* silent */);
```

Y pulsar la estantería sugerida hace esto:

```js
function addTransferRowFromChip(chip){
  …
  addTransferRow(rack, qty, '');   // ← AÑADE. Siempre.
}
```

Así que quedan dos: la sembrada, vacía, y la buena. Y la vacía no deja guardar.

**La forma del fallo es la de siempre**: cada una de las dos hace exactamente lo
que su nombre dice, y nadie decidió qué pasa cuando se juntan.

**El arreglo:** que al pulsar la estantería se **rellene la primera fila vacía**
si la hay, y sólo se añada una nueva cuando todas estén en uso. Es lo que
cualquiera espera y quita el paso de borrar a mano.

---

### 🟠 N-15 · El teléfono, MEDIDO — y el problema no es el que parece

Jose: *"creo que sí está en el backlog pero debemos trabajar en la vista de las
ventanas en teléfono, la mayoría no está optimizada."*

Había una cinta métrica escrita para esto (`tools/audit-responsive.js`) que
abre la app de verdad en seis tamaños y mide. **Llevaba sin poder arrancar**
—ver N-16— así que lo primero fue arreglarla. Esto es lo que dice:

| Tamaño | Pestaña | La página se va de lado | Demasiado pequeño para el dedo |
|---|---|---|---|
| phone-360 | movements | **4 px** | 3 |
| phone-360 | dashboard | 0 | 2 |
| phone-390/430 | todas | **0** | 2–3 |
| tablet | todas | 0 | 2–6 |

**Y la conclusión no es la esperada: el reparto está bien.** Las tablas que
«se salen» lo hacen **dentro de su propia caja**, que es correcto y a propósito
—una tabla de 23 columnas se desplaza, no se encoge—. La página sólo se va de
lado en un sitio y por 4 píxeles.

**Lo que sí está mal, y es grande, son los sitios donde hay que poner el dedo:**

```
mov-select-cb   13 × 13 px      ← la casilla de marcar un movimiento
movSelAll       13 × 13 px      ← la de marcar todos
stock-select-cb 13 × 13 px
```

**Trece píxeles.** Apple pide 44, Android 48. Y no es una casilla cualquiera:
**es la que va justo antes del botón de borrar**, en una bodega, a veces con
guantes. Que Jose esté marcando movimientos en el móvil con una diana de 13 px
explica más de un dedazo.

**Entonces el trabajo de teléfono no es rehacer pantallas: es agrandar lo que se
toca.** Mucho más barato y arregla lo que de verdad duele.

---

### ⚪ N-16 · La cinta métrica del teléfono llevaba rota sin que nada lo dijera

`tools/audit-responsive.js` tenía la ruta del navegador escrita a mano:

```js
executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
```

La máquina trae la **1243**. O sea que **la única herramienta que mide la app en
un teléfono llevaba quién sabe cuánto sin poder arrancar**, y nada lo dijo —no
está en la suite, así que nadie la ejecutaba.

Otra vez dos cosas que tienen que coincidir sin que nada lo obligue: la ruta
escrita y el navegador instalado.

**Arreglado el 3/11:** ahora manda `CHROME_PATH`, como el resto de la suite, y
sin él deja que Playwright busque el suyo.

---

### 🟠 N-05 · El fichero de 600 filas no termina de leerse

Jose: *"el archivo de 20 filas sí lo carga pero el de 600 no… sigo esperando y
no carga."*

**Lo que ya medí, para no perder el tiempo buscando donde no está:**

| Paso | Coste medido |
|---|---|
| Partir el CSV y validar 600 filas | **10 ms** |
| El fichero en sí | ~45 KB · ~60 KB en base64 |
| `loQueCrearia_` | una lectura de CONFIG, en memoria |
| `importacionConHuella_` | 400 filas de auditoría, una lectura |

**Nada de eso tarda minutos.** Así que el tiempo se va en otro sitio, y hay dos
candidatos reales que **no se pueden distinguir leyendo el código**:

1. **La conversión del .xlsx.** `excelToSheets_` sube el fichero a Drive, pide
   la exportación en zip, lo descomprime y borra la copia: **tres viajes de red**
   antes de leer una sola fila. Un .csv no pasa por aquí. *Pregunta que lo
   resuelve en un minuto: ¿el de 600 es .xlsx y el de 20 .csv?* Si es así, el
   culpable es la conversión y no el tamaño.
2. **La cuota compartida** (H-18): la app corre con la cuenta del administrador,
   así que las ejecuciones del almacén entero se suman. Una lectura que espera
   detrás de otra cosa parece una lectura lenta.

**Cómo salir de la duda, en este orden:**

1. **Mirar el registro de ejecuciones** del script (Apps Script → Executions).
   Dice si `parseImportFile` llegó, cuánto tardó y si murió a los 6 minutos. Es
   la diferencia entre «el servidor está trabajando» y «la respuesta se perdió»,
   y ninguna otra cosa la distingue.
2. **Probar el mismo fichero guardado como .csv.** Si va, el culpable es la
   conversión de Excel y hay sitio donde arreglarlo.
3. **Devolver los tiempos por paso** en la respuesta de `parseImportFile`
   (subida · conversión · lectura · huella). Es lo que convierte esto en un
   número en vez de una teoría — y lo que falta para poder decir «arreglado».

> **CERRADO el 3/11 por N-08.** Jose mandó el registro de ejecuciones y
> confirmó que **todos sus ficheros son CSV**. No era la conversión de Excel ni
> el tamaño: era nuestro propio guardia de cuota. Los dos candidatos de arriba
> quedan descartados por medición, no por opinión. Lo que queda está en N-08.

---

### 🔵 N-06 · La pregunta del tope de 200 — contestada

Jose: *"¿y qué pasa si ya hay movimientos en la papelera? ¿igual me deja marcar
y eliminar 200?"*

**Sí, y es a propósito.** El tope cuenta **lo que marcas en esta operación**, no
lo que ya hay guardado. 200 hoy y 200 mañana son 400 en la papelera.

**Y eso sigue siendo un problema de verdad**, el único que sobrevive de H-01: la
papelera **enseña** 200. Con 400 dentro, 200 no se ven. El tope por operación
evita el borrado de media hora que mediste el 22/10, pero no evita que la
papelera acabe guardando más de lo que puede mostrar. Lo que lo cierra es
**paginar o agrupar la papelera**, que es lo último de tu orden y sigue pendiente.

---

### 🔵 N-07 · Apuntado para hacer luego, sin construir todavía

| | Qué | Mi opinión |
|---|---|---|
| **a** | La pantalla de precios en el orden correcto: **categoría → buscar el material → unidad → precio** (imagen 2) | De acuerdo, y además es **lo que desbloquea el encargo de OX** — ver `VALOR-DEL-INVENTARIO.md` §3.1. Yo la pondría antes que nada de esta lista |
| **b** | ~~En Básico no debería dejar poner precios~~ | **Resuelto el 3/11: se queda.** Jose: *"tienes razón, sería un buen feature para algo básico"*. La pantalla de precios de la v13.6 está abierta en Básico |
| **c** | Un anillo de carga que se llena mientras la app ya va leyendo el fichero | **No al anillo**, y el motivo es el de siempre en este archivo: un anillo que se llena sin saber cuánto queda **finge un progreso que no existe**. Lo que sí: **empezar a leer el fichero en cuanto se elige**, no al pulsar. Eso es gratis porque el fichero ya está en el navegador. Pero primero N-05: si tarda cuatro minutos, adelantarlo no lo arregla |
| **d** | Poner la versión y el código de la compilación en Ajustes, además del menú de usuario | **Sí, y es gratis.** Va en Ajustes → System, al lado del espacio usado. El motivo no es el adorno: cuando algo no cuadra, lo primero que hay que saber es **qué versión tiene delante el cliente**, y hoy para eso hay que pedirle que abra el menú de su foto |

---

## 🟠 H-01 · La papelera sólo enseña 200, y Jose ya borró 490

> **Bajada de 🔴 a 🟠 el 27/10, y la corrección es de Jose.** Yo dije que esto
> «bloquea» su idea de agrupar. No la bloquea. Yo estaba usando **la cuenta
> actual, ya descuadrada, como punto de partida**, y su propuesta parte de un
> inventario cuadrado. Y con **deshacer una importación fuera de la papelera**,
> el caso que llenó la papelera de 490 filas **deja de existir**: esas 490 no
> fueron 490 borrados, fue una importación deshecha.
>
> **Orden que queda, y es el suyo:** deshacer una importación desde Import →
> tope de 200 al borrar → agrupar → paginar la papelera, al final.
>
> **Lo único que sobrevive del hallazgo**, y es un requisito *dentro* de
> agrupar, no antes: el tope de 200 es **por operación, no acumulado**. 200 hoy
> y 200 mañana son 400 en la papelera, y la lectura seguiría enseñando las 200
> últimas. Así que **el número que enseñe la vista agrupada no puede salir de
> una lectura truncada**: o lo cuenta el servidor sobre toda la hoja TRASH, o la
> pantalla dice «las 200 más recientes de 400». Un número inventado por el
> recorte es peor que no agrupar. Con la limpieza a los 30 días el techo pasa a
> ser «lo borrado en 30 días», que en un almacén normal no llega a 200.

**Dónde:** `Code_v3_fixed.gs` ~15264, en `listTrash`.

```js
var span = Math.min(200, tLast - 1);   // the tail: recent deletions
```

**Qué pasa.** La lista de la papelera lee **sólo las últimas 200 filas**. El
23/10 Jose borró **490 movimientos de una vez**. De ésos, **290 no aparecen en
la papelera y no se pueden devolver desde la app.**

**Por qué hay que arreglarlo, exactamente.** No es una pantalla incompleta: es
**la vía de recuperación**. Toda la promesa de «borrar se puede deshacer»
descansa en esta lista, y se rompe justo en el caso en que más falta hace — un
borrado masivo hecho por error. Y falla **en silencio**: no dice «hay 290 más»,
simplemente no están, así que alguien concluye que se perdieron.

Las filas **no están perdidas** —siguen en la hoja TRASH— pero sólo se llega a
ellas abriendo el Sheet a mano, y la regla de este producto es *el cliente no
debe ir al sheet nunca*.

**Lo que yo haría:** paginar o filtrar del lado del servidor (traer por
material, por fecha o por lote de borrado), no subir el 200 a 2000 — eso sólo
mueve el muro y además trae a la pantalla miles de filas que nadie va a leer.
Encaja con la idea de agrupar que propuso Jose el 26/10.

---

## 🟠 H-02 · Decimos que la papelera guarda 30 días. No guarda 30 días: guarda siempre

**Dónde:** la hoja TRASH está clasificada como *registro* (`~1008`), el grupo
cuyas filas «sólo se añaden». **No hay ninguna limpieza automática.** Lo único
que vacía la papelera es el botón «🗑 Empty the trash».

**Qué decimos, en cambio.** En la landing, `t47`: *«la papelera que guarda 30
días un movimiento borrado para que lo puedas devolver»*. Y la app repite la
idea.

**Por qué hay que arreglarlo.** Por dos motivos, y el segundo es el caro:

1. **El texto es falso**, y en un sentido que confunde al cliente justo cuando
   más nervioso está: alguien que borró algo hace cinco semanas lee «30 días» y
   concluye que ya no se puede recuperar, cuando sí se puede.
2. **La hoja crece sin tope.** Es la misma clase de problema que resolvió el
   archivado de movimientos viejos, sin resolver aquí. Un cliente con años de
   uso acumula una papelera que nadie vacía nunca.

**Decisión de Jose, y es de producto:** o se construye la limpieza a los 30
días —y entonces el texto es verdad— o se cambia el texto a lo que la app hace.
**Yo haría lo segundo primero** (es una frase, hoy) y lo primero después,
porque borrar automáticamente lo que alguien podría querer devolver no es un
cambio que se deba hacer con prisa.

---

## 🟠 H-03 · Pedimos un permiso sensible de Google que no usamos **nunca**

**Dónde:** `appsscript.json`, `https://www.googleapis.com/auth/userinfo.profile`.

**Medido.** Comparé los once permisos declarados contra las llamadas reales del
código:

| Permiso | Usos en el código |
|---|---|
| `userinfo.email` | 21 |
| **`userinfo.profile`** | **0** |
| `spreadsheets.currentonly` | 113 |
| `drive` | 30 |
| `documents` | 2 |
| `script.external_request` | 11 |
| `script.send_mail` | 16 |
| `script.scriptapp` | 18 |
| `script.deployments` | 9 |
| `script.projects` | 1 |
| `script.container.ui` | 18 |

Y comprobé que tampoco se usa indirectamente: no hay una sola llamada a
`getUsername()` ni a nada que lea el nombre o la foto del perfil.

**Por qué hay que quitarlo, exactamente.** `userinfo.profile` es un permiso
**sensible**. Cada permiso sensible es una línea más en la pantalla que el
cliente tiene que aceptar al instalar, y esa pantalla **es la objeción número
uno de este producto** — es la razón de que exista una edición Básica con un
solo permiso. Estamos pagando ese precio por algo que no usamos ni una vez.

**Tamaño:** una línea. **Riesgo de quitarlo:** hay que comprobar que ninguna
instalación viva dependa del consentimiento ya dado; quitar un permiso del
manifiesto obliga a volver a autorizar. Hay que mirarlo antes, no después.

---

## 🟡 H-04 · Un escape de comillas a mano, a una llamada de ser explotable

**Dónde:** `Index_v3_fixed.html` ~19973, en `addDocGroup`.

```js
value="' + name.replace(/"/g,'&quot;') + '"
```

Escapa `"` y **no escapa `&`**. Un nombre que contenga el texto `&quot;` lo
decodifica el navegador a una comilla de verdad, se sale del atributo, y lo que
venga detrás se ejecuta.

**Hoy NO es explotable, y lo comprobé:** los tres sitios que llaman a esa
función pasan `null` o la cadena literal `'Document'`.

**Por qué hay que arreglarlo igual.** Porque la seguridad de esa línea no está
en la línea: está en que **los tres que la llaman sigan pasando literales**. Es
*dos cosas que tienen que coincidir sin que nada lo obligue*, otra vez. Y el
contexto acaba de cambiar: con el importador de CSV abierto en la edición
gratis, el nombre de un material **lo escribe otra persona, en un fichero**.

**Tamaño:** una línea — usar `_he()`, que ya existe.

---

## 🟡 H-05 · La pantalla de «Signed in» imprime sin escapar un texto de terceros

**Dónde:** `Code_v3_fixed.gs` ~2192, en `handleOAuthCallback_`.

```js
'<p style="color:#555">' + msg + '</p>'
```

`msg` sale de la respuesta del servidor de tokens de Google o de `err.message`.

**Gravedad baja, y conviene decir por qué** en vez de pintarlo peor: quien
ataca **no controla ese texto**. Controla el `code` de la URL, y ese code va a
Google, que contesta con sus propios mensajes.

**Por qué arreglarlo igual:** estamos metiendo en nuestra página, sin escapar,
una cadena que decide un tercero. Es una línea y quita la pregunta para
siempre.

---

## 🟠 H-06 · La pantalla de inicio de sesión se puede incrustar en cualquier web

**Dónde:** `Code_v3_fixed.gs` ~2194.

```js
.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
```

Cualquier sitio puede meter esta página en un marco invisible dentro del suyo.
En una página cualquiera daría igual; en la de **iniciar sesión**, es el montaje
clásico para que alguien pulse donde no cree estar.

**Y aquí hay que parar: no sé si ese `ALLOWALL` hace falta.** La app corre
dentro de un marco de Google y es posible que el flujo de sesión no funcione sin
él. **Cambiarlo a ciegas podría dejar a un cliente sin poder entrar, que es
peor que el riesgo que quita.**

**Lo que haría:** medirlo en una copia de pruebas con el modo por defecto. Si
entra, cambiarlo. Si no, dejarlo y **escribir aquí por qué**, para que dentro de
un año nadie lo lea como un descuido. **Decisión de Jose.**

---

## 🟡 H-07 · El mensaje de la papelera propone una causa falsa

**Dónde:** `Code_v3_fixed.gs` ~15225.

Lo encontró Jose el 26/10. Al devolver una salida cuya entrada también está en
la papelera, el guardia la rechaza —**y hace bien**— pero el mensaje dice *«el
almacén cambió mientras estaba en la papelera»*, que en su caso **era falso**, y
la pista que da manda a mirar donde no está.

**Por qué hay que arreglarlo.** Porque convierte un problema de orden con
solución de un clic en lo que parece un fallo de la app. Un cliente que ve eso
**desconfía de la papelera entera**, que es justo la función que existe para
dar confianza.

El detalle de cómo, y la decisión que hace falta antes, está en
`docs/BACKLOG.md`.

---

## ⚪ H-08 · `documents` se pide por una función que la gratis ni tiene

**Dónde:** `appsscript.json`; `DocumentApp` se usa **2 veces**, las dos para
crear un Google Doc temporal al subir un documento (`~9155`).

No es un fallo: el permiso se usa. Lo anoto porque **es un permiso sensible
sostenido por una sola función**, y si algún día esa función cambia de forma
—por ejemplo, si el lector de facturas deja de pasar por un Doc temporal— el
permiso debería irse con ella. Hoy no hay nada que lo vigile.

---

## 🔴 H-09 · Quitar un documento sólo quita el ENLACE. El archivo se queda en Drive para siempre

**Dónde:** `Code_v3_fixed.gs` `updateDocument_` (~8729). Lo encontró Jose el
26/10: *"podemos cambiar esos documentos y fotos pero nunca eliminarlos por
completo, no hay opción."*

**Comprobado.** La ✕ de un documento adjunto marca la fila como quitada, y el
servidor escribe la lista que queda en la celda `DOC_LINKS` del movimiento.
**Y nada más.** No hay una sola llamada a Drive en ese camino: el fichero sigue
en la carpeta del administrador, entero, para siempre.

Lo mismo con **las fotos de rack**: no existe ninguna función para borrar una.
Se pueden reemplazar; quitarlas, no.

**Por qué es ALTA, y no es por el espacio.** Es por lo que el cliente cree que
hizo:

1. **Pulsa ✕, el documento desaparece de la pantalla, y concluye que lo
   borró.** No lo borró. Si ese PDF llevaba el precio de un proveedor, o una
   foto de algo que no debía fotografiarse, sigue ahí — y la app le dijo que
   no.
2. **Es nuestro problema además del suyo.** Un cliente que borra algo
   «definitivamente» y luego descubre que seguía guardado tiene una queja
   razonable, y en algunos sitios una obligación legal detrás.
3. El espacio es lo de menos, pero también: esos ficheros cuentan contra el
   Drive del administrador y **nadie los va a encontrar nunca**, porque ya no
   hay ningún enlace que lleve a ellos.

**Lo que yo haría, y hay una decisión dentro:** mandar el fichero **a la
papelera de Drive del cliente** (`setTrashed(true)`), no destruirlo. Así se
puede recuperar 30 días desde el propio Drive, que es el comportamiento que
cualquiera espera. Destruirlo del todo sería irreversible y no hace falta.

**Decisión de Jose:** si al pulsar ✕ se avisa («esto también lo quita de tu
Drive») o se hace callando. Yo avisaría, porque hoy la gente cree que ya lo
hace.

---

## Lo que falta por mirar

Parte 2 sigue abierta: el camino de los documentos adjuntos y quién puede
abrirlos (ya hay un hallazgo del 26/10 en `BACKLOG.md`), el alcance de `drive`
frente a `drive.file`, y el camino de los respaldos. Después, Parte 3 —el
perímetro: OAuth, el token de sesión, qué pasa al quitarle el acceso a alguien
con la pestaña abierta— y Parte 4, lo que Google puede cambiar debajo.

Y el análisis estructural, que es la otra mitad del encargo.

---

## 🟠 H-10 · El respaldo copia **todas** las Script Properties menos cuatro nombres

**Dónde:** `Code_v3_fixed.gs` ~6828 (`SNAPSHOT_EXCLUDE`) y ~6917.

Antes de cada copia, la app vuelca las Script Properties en una pestaña para que
la copia las herede. **Por defecto se copia todo**: sólo se salvan cuatro
nombres exactos (`OAUTH_CLIENT_SECRET`, `GEMINI_API_KEY`, `SESSION_SECRET`,
`WMS_SESSIONS`). Hoy está bien y el motivo de cada uno está escrito.

**Por qué hay que arreglarlo.** El día que se añada una propiedad con un secreto
—Stripe, un webhook, una contraseña de correo— **se copia sola**, a la hoja y a
cada respaldo, sin que nadie haga nada mal. Y el fallo es retroactivo: cuando se
descubra, el secreto ya está en treinta copias repartidas por el Drive del
cliente, y quitarlo de la lista **no limpia las que ya existen**.

**Lo que yo haría:** añadir un patrón sobre el nombre
(`/SECRET|KEY|TOKEN|PASSWORD|PRIVATE/i`) que excluya por defecto. Así el
descuido falla hacia el lado seguro.

---

## 🟠 H-11 · Nuestro secreto de OAuth es el mismo en todas las instalaciones y vive en el Drive de cada cliente

**Dónde:** `OAUTH_CLIENT_SECRET`, en las Script Properties de cada copia.

No es una fuga: **es el diseño**, y el código ya lo dice. El administrador de
cualquier cliente puede leerlo porque el proyecto es suyo.

**Por qué importa igual:** con el identificador y el secreto se puede montar una
pantalla de consentimiento que **diga «Acopio»** y pedirle permisos a quien sea
—no da acceso a datos de otro cliente, pero sí permite engañar en nuestro
nombre—; y **rotarlo los rompe a todos a la vez**, porque no hay forma de
cambiarlo para uno solo.

**Lo que yo haría, a partir de cierto número de clientes:** un cliente OAuth por
instalación, que además es lo coherente con *"tus datos en tu cuenta"*. El coste
es un paso más, feo, en la instalación. **Decisión de Jose.**

---

## 🟠 H-12 · La frontera de la carpeta de documentos acepta por NOMBRE

**Dónde:** `isFileWithinAppFolder_` (~1782), segunda línea del bucle.

El identificador se comprueba primero y está bien. Pero también se acepta la
carpeta **por nombre**, y la lista de nombres lleva uno **fijo en el código**
(`OX_WMS_v3_Docs`). Cualquier carpeta del Drive del administrador que se llame
así —incluida **una que le hayan compartido**— vuelve servible todo lo que tiene
debajo, hasta ocho niveles.

**Por qué importa ahora y no antes:** con una instalación no podía chocar con
nada. **El plan es tener muchos clientes**, y quien tendrá carpetas con ese
nombre es justo el que administra más de una copia.

**Por qué no se puede quitar sin más:** las instalaciones anteriores al
asistente no tienen identificador guardado y se quedarían sin abrir ni un
documento.

**Lo que yo haría:** aceptar el nombre **sólo cuando no hay identificador
guardado** para esa carpeta.

---

## 🟠 H-13 · La limpieza de los ficheros públicos existe, pero hay que ir al Sheet a pulsarla

**Dónde:** `menuRevokePublicSharing` (~12418).

Hasta la v8.10 cada foto y documento se subía marcado **«cualquiera con el
enlace puede ver»**. La línea se quitó, pero eso sólo afecta a lo que se sube
desde entonces. Para lo ya subido hay una función que lo arregla, y está bien
hecha.

**El problema es cómo se llega a ella:** vive en el menú del Sheet —y la regla
es *el cliente no debe ir al sheet nunca*—, y **nada le dice que existe**. No
hay aviso ni cuenta en ninguna pantalla.

**Por qué es MEDIA y no baja:** son facturas de proveedores con precios y
albaranes con nombres de clientes, públicas con enlace, en instalaciones que
nadie ha revisado.

**Lo que yo haría:** que **🩺 Check this installation** los cuente, lo diga, y
tenga el botón ahí dentro. La función ya está escrita.

> ### ✅ DECIDIDO EL 27/10 — SE HACE
>
> Jose: *"anótalo como decisión tomada, no hagas nada aún."*
>
> **Qué se construye:** 🩺 Check this installation cuenta los ficheros de la
> carpeta que siguen compartidos con enlace público, lo dice con el número
> (*"412 files are shared with a public link"*), y lleva el botón de arreglarlo
> **dentro de la app** — no en el menú del Sheet.
>
> **Lo que NO cambia:** `menuRevokePublicSharing` se queda donde está. Ya
> funciona, respeta el límite de seis minutos y se puede correr varias veces.
> Lo único que se añade es la forma de enterarse y de pulsarlo sin salir de
> la app.
>
> **Tamaño:** media tarde. **Pendiente de construir.**

---

## 🟡 H-14 · Un documento lo abre cualquiera con sesión, sea cual sea su rol

**Dónde:** `resolveOwnFile_` (~1694).

Comprueba sesión, cuota y que el fichero esté dentro de la carpeta de la app.
**No comprueba el rol ni de quién es el movimiento:** la frontera es la carpeta,
no la persona.

**Baja hoy, y por qué:** los identificadores de Drive no se adivinan y todos los
usuarios ven los mismos movimientos, así que quien puede pedirlo ya veía el
enlace.

**Por qué se anota igual:** esa frase es **una propiedad de hoy, no una
garantía**. El día que haya permisos por proyecto o por bodega —que está en la
lista— el documento se seguirá abriendo para todos y nadie se acordará de esta
función.

---

## 🟠 H-15 · El inicio de sesión entero descansa en una cadena hecha con `Math.random()`

**Dónde:** `Index_v3_fixed.html` ~27422 y `Code_v3_fixed.gs` ~2245 (`pollLogin`).

```js
var state = 'st_' + Math.random().toString(36).slice(2) + '_' + Date.now();
```

**El camino completo:** la ventanita de Google devuelve el correo verificado y
el servidor lo guarda en la caché bajo `login_<state>` durante 300 segundos.
`pollLogin(state)` **no tiene autenticación** —no puede tenerla, corre antes de
que exista ninguna identidad— así que **quien presente el `state` correcto en
esos cinco minutos se lleva un token de sesión válido para ese correo.**

**Por fuerza bruta no es explotable hoy** (del orden de 2⁵² posibilidades) y
conviene decirlo. Pero `Math.random()` no es un generador criptográfico, el
`Date.now()` que lleva pegado es **lo único que el atacante ya sabe**, y el
arreglo es una línea con `crypto.getRandomValues`.

**Y hay una segunda parte, que es peor:** el comentario del código dice que el
limitador *"blunts guessing at other people's login states"*. **No lo hace.**
El limitador está contado **por `state`**, así que quien prueba mil cadenas
distintas estrena un contador en cada una y nunca llega al límite. Un comentario
equivocado en un sitio de seguridad es peor que ningún comentario, porque
alguien —nosotros, dentro de un año— va a dar por protegido algo que no lo está.

**Tercera, menor:** `handleOAuthCallback_` no comprueba el `state` contra nada;
es una llave de encuentro, no una protección contra falsificación de petición.
Cerrarla es gratis cuando se toque esto.

---

## 🟡 H-16 · El token de sesión dura 30 días y no hay forma de anular uno solo

**Dónde:** `Code_v3_fixed.gs` ~2131, `makeSessionToken_`.

El token es `base64(correo|caducidad).HMAC` — **imposible de falsificar sin el
secreto**, y eso está bien. Pero es **sin estado**: no hay lista de tokens
vivos, así que no se puede matar uno.

**Baja, y por qué:** a quien se le quita el acceso, el token le sigue valiendo
**pero no le sirve**, porque el rol se busca en cada llamada y sale `DENIED`. El
agujero real es estrecho: **un token robado de alguien que sigue en la empresa**
vale hasta 30 días, y lo único que lo mata es cambiar `SESSION_SECRET`, que echa
a todo el mundo.

**Lo que yo haría:** 7 días con renovación silenciosa mientras se usa la app.
Quien entra a diario no nota nada; un portátil robado deja de servir el lunes en
vez de dentro de un mes.

---

## 🟠 H-17 · Los registros guardan el correo de cada persona **para siempre**

**Dónde:** `AUDIT_LOG` (`Timestamp | Action | User | Details ×3`, ~845) y
`ERROR_LOG`. **Busqué una limpieza de registros en todo el archivo y no existe
ninguna.**

**Qué significa:** un bodeguero que se fue hace tres años sigue nombrado, con su
correo, en miles de filas. Si pide que le borren, la única respuesta que la app
puede dar hoy es **«borra la hoja entera»** — que es literalmente lo que dice el
texto de privacidad.

**Por qué es MEDIA:** no es un agujero por el que entre nadie. Es que estamos
**guardando datos personales sin plazo**, y eso no duele nunca hasta el día que
duele mucho. Y es el mismo problema de H-02 con otra ropa: una hoja que sólo
crece porque nadie decidió hasta cuándo.

**Lo que yo haría, y NO es borrar la auditoría** —existe para poder mirar
atrás—: **decir el plazo y cumplirlo.** Dos años de auditoría en la hoja viva y
lo anterior exportado al Drive del cliente; el registro de errores, 90 días. Y
escribirlo en los Términos, que hoy no dicen nada.

> ### ✅ DECIDIDO EL 27/10 — EL PLAZO QUEDA FIJADO
>
> Jose: *"anota la decisión y sigue."*
>
> | Registro | Cuánto se guarda | Qué pasa después |
> |---|---|---|
> | **AUDIT_LOG** | **2 años** en la hoja viva | Se **exporta** a un fichero en el Drive del cliente y sale de la hoja. **No se borra** |
> | **ERROR_LOG** | **90 días** | Se borra. A nadie le sirve un error de hace un año |
>
> **Por qué la auditoría se exporta y no se borra:** un registro de auditoría
> existe justamente para poder mirar atrás. Sacarlo de la hoja resuelve el
> crecimiento sin renunciar a lo único para lo que sirve.
>
> **Y hay que escribirlo en los Términos**, que hoy no dicen nada de plazos.
> Mientras el texto no lo diga, el plazo no existe para el cliente.
>
> **Pendiente de construir.** Encaja con la limpieza de la papelera a los 30
> días: es el mismo trabajo —un disparador que mira fechas y limpia— y debería
> hacerse a la vez.

---

## 🟠 H-18 · Todas las cuotas de Google las paga UNA cuenta, y las gasta el almacén entero

**Dónde:** `appsscript.json`, `executeAs: USER_DEPLOYING`.

Cada clic de cada bodeguero se ejecuta **como el administrador**, y las cuotas
de Google son **por usuario**. Así que las **30 ejecuciones a la vez** no son 30
por persona: son 30 para toda la empresa. Y los **90 minutos de disparadores al
día** —en una cuenta normal— los comparten el respaldo, el archivado, el reporte
diario y el aviso de instalación parada.

**Por qué hay que arreglarlo.** El que se queda sin cuota **no es quien la
gastó**: es el almacén entero, hasta el día siguiente. El código ya lo sabe
(`throttle_` lo dice), así que la defensa existe. **Lo que falta es verlo
venir.**

**Lo que yo haría:** que 🩺 Check this installation enseñe lo que se gasta
—ejecuciones, minutos de disparadores, correos— igual que ya enseña el espacio.
Mismo razonamiento que funcionó con las 10M celdas.

---

## 🟠 H-19 · La app manda 14 clases de correo y **nunca pregunta cuántos le quedan**

**Medido:** 14 llamadas a `MailApp.sendEmail`, **cero** a
`getRemainingDailyQuota()`. El límite de correo es del orden de **100
destinatarios al día** en una cuenta normal frente a 1.500 en Workspace, y
varios sitios se tragan el fallo a propósito para que un aviso no tumbe la
operación.

**Por qué es MEDIA, y no es por el correo:** la limpieza de la papelera a los 30
días se decidió sobre el argumento de que *se avisa cinco veces y la
responsabilidad pasa al cliente*. **Ese argumento sólo vale si los correos
llegan.** Si el día 29 la cuenta se quedó sin cuota, el borrado ocurre igual y
el cliente no recibió el último aviso — y la frase deja de ser verdad justo
cuando hace falta que lo sea.

**Lo que yo haría:** preguntar antes de mandar y **juntar en un solo correo todo
lo que caduca** (que además había que hacerlo porque cinco correos al día nadie
los lee); y **no borrar lo que no se pudo avisar**.

---

## 🟠 H-20 · Gmail personal: 90 minutos de disparadores al día. Workspace: 6 horas

**Cuatro veces menos**, sobre un recurso que comparte la instalación entera, y
justo sobre lo que corre de noche sin que nadie lo mire. Un respaldo de una hoja
grande tarda minutos; el archivado también. **Lo que falla de noche falla en
silencio** — y el aviso de que falló es un correo, que es la cuota de H-19.

**Y tiene la misma causa que el problema de continuidad** de
`SI-SE-VA-EL-ADMINISTRADOR.md`: con Gmail personal no se puede transferir la
propiedad. **Una sola frase en la guía arregla los dos:** instálalo desde una
cuenta de empresa, no desde un Gmail personal. Hoy la guía no lo dice.

---

## 🟡 H-21 · Los seis minutos por ejecución son iguales en Workspace

Comprobado hoy contra la página de cuotas de Google, **porque se repite mucho lo
contrario** (que Workspace da 30 minutos) y es falso: **6 minutos en los dos
casos.**

**Por qué se anota:** es la diferencia entre «cuando el cliente crezca que pague
Workspace» y la verdad, que es que **todo lo que procese muchas filas tiene que
poder reanudarse**. No hay salida comercial a ese límite, y el cierre de período
de `CUANDO-SE-LLENE-EL-SHEET.md` va a chocar con él de frente.

---

# Hallazgos estructurales

Del `ANALISIS-ESTRUCTURAL.md` del 27/10. Misma escala de gravedad: no es lo feo
que es, es **qué pasa si no se arregla**.

## 🟠 E-01 · El número de versión está escrito dos veces y nada ata los dos

**Dónde:** `Code_v3_fixed.gs:131` y `Index_v3_fixed.html:5856`, los dos
`var APP_VERSION = '13.0'`.

**Comprobado que nadie los compara:** `check-publicado.js` lee sólo el del
`.gs`; `test-pegar.js` compara **cada archivo con su propia salida**, no un
archivo contra el otro; los demás sitios lo usan, no lo cotejan.

**Qué pasa si se separan.** El cliente ve el número del `Index`; el registro de
cambios y el sello de publicación usan el del `.gs`. Una instalación puede decir
**13.0** mientras nosotros creemos que tiene **13.1**.

**Por qué es MEDIA:** es *dos cosas que tienen que coincidir sin que nada lo
obligue*, en **el dato con el que se diagnostica todo lo demás**. Cada
conclusión de soporte partiría de un dato falso.

**Tamaño:** tres líneas en una prueba que ya existe.

---

## 🟠 E-02 · Seis funciones pasan de 300 líneas; la mayor tiene 655

`addMovementsBatch_` (655), `archiveOldMovements` (465), `onEdit` (424),
`processMovementInner_` (341), `refreshDerivedSheets_` (340), `getInitialData`
(339).

**Por qué importa aquí y no es manía:** casi todos los incidentes de este
proyecto —el archivado que perdió filas, el guardia de la papelera que culpaba
al almacén, el `Number('1,250')`, la fusión que vuelve sola— vivían dentro de
una de estas seis. **Una función de 655 líneas no se lee entera antes de
tocarla**, así que se cambia mirando las veinte de alrededor — y ahí el contexto
local miente.

**Lo que NO haría: partirlas.** Tocar el camino por el que entra cada movimiento
del sistema, para ganar elegancia, es riesgo real por beneficio estético.

**Lo que sí:** una regla — *nada nuevo entra dentro de esas seis*. Lo nuevo va a
una función con nombre, como se hizo con `numeroDeFichero_` y `adjustDirection_`.

---

## 🟡 E-03 · 873 funciones en un solo ámbito global. Hoy está limpio y nada lo obliga

**Comprobado, y sale bien:** ningún nombre de función se repite entre los dos
archivos, y los únicos repetidos dentro del `Index` (`draw`, `attempt`) están
anidados, cada uno en su ámbito.

**Por qué se anota igual:** esa limpieza **no la sostiene nada**. En JavaScript
la segunda declaración de un nombre **gana en silencio** — es el mismo patrón
que ya mordió en el `data-i18n` de la landing. Dos `_guardarAjustes()` a 9.000
líneas de distancia no dan error, no dan aviso, y la app hace lo que dice la
segunda.

**Tamaño:** una prueba de diez líneas, y vale para siempre.

---

## 🟡 E-04 · Las pruebas tienen forma de historia, no de sistema

180 archivos, cada uno nacido de algo que pasó de verdad — **y ninguno de esos
fallos puede volver**. Eso primero, porque es una virtud.

**La pega es la otra cara:** la cobertura sigue **lo que se rompió**, no lo que
importa. Consecuencia comprobable: **lo más nuevo es lo menos cubierto**, y lo
más nuevo es justo lo que acepta ficheros de fuera — el importador de CSV tiene
**dos** pruebas que lo mencionan, de 180.

**Lo que yo haría:** que lo **nuevo** que toque datos de fuera nazca con su
prueba el mismo día, aunque no se haya roto nunca. Para lo viejo y estable, la
cobertura por incidentes es la correcta y más barata.

---

## 🟠 H-22 · Editar el comentario de una fila importada la vuelve invisible para «deshacer la importación»

**Dónde:** `Code_v3_fixed.gs` `undoImport` (~10337).

```js
var marca = 'Imported from file ' + importId;
var res = borrarFilasEnTanda_(ss, auth, function (f) {
  return String(f[AC.COMMENTS] || '').indexOf(marca) === 0;   // ← por el comentario
}, MAX_BORRADO_POR_TANDA);
```

**Lo encontró Jose el 27/10**, razonando sobre otra cosa: *"la app le pone ese
comentario e igual el usuario puede editar el comentario, entonces no es un
arreglo fijo, es sólo provisional."*

**Y no es provisional: ya está roto hoy.** `comments` es uno de los campos que
`modifyMovement` deja editar (`~16374`). Así que basta con que alguien corrija
el comentario de una fila importada —algo completamente normal: *"llegó roto",
"revisar con el proveedor"*— para que esa fila **deje de pertenecer a su
importación** a ojos de la app.

**Qué pasa entonces, y es lo peor de los dos mundos:** «deshacer la importación»
se lleva las otras mil y **deja ésa**. El cliente ve la importación deshecha y
una fila huérfana que no sabe de dónde salió, con un material que ya no debería
existir. **Y nada avisa.**

**Por qué es MEDIA y no baja:** es *dos cosas que tienen que coincidir sin que
nada lo obligue* otra vez, pero con un agravante — **una de las dos la puede
cambiar el usuario, sin saber que está cambiando nada.** El guardia depende de
que nadie toque un campo de texto libre.

**Lo que yo haría, y la idea es de Jose:** que la pertenencia a una importación
viva en **un campo que el usuario no pueda tocar**, no en el comentario.

> ### ✅ ARREGLADO EL 27/10 — la columna `IMPORT_ID`
>
> `AC.IMPORT_ID` (col 25), añadida **al final**, que es lo único seguro sobre
> datos que ya existen. La escribe **sólo** el importador y **no está en el
> mapa de campos editables** de `modifyMovement` — esa es la propiedad
> entera: si se pudiera editar, no sería mejor que el comentario.
>
> `esDeLaImportacion_(fila, importId)` es ahora la única regla, con nombre y
> suelta para poder probarla: **columna primero, comentario como respaldo**.
> El respaldo no es decoración — las importaciones anteriores a la columna no
> tienen más rastro que ése, y poder deshacerlas a medias es mejor que decirle
> a alguien que su botón dejó de funcionar.
>
> **Lo que se pudo hacer primero, y sin lo cual esto no era posible:** desatar
> la papelera del ancho del archivo (`alinearPapelera_`). El 22/10 esta misma
> columna se descartó escrita en el código —*«es un riesgo enorme para una
> etiqueta»*— y tenía razón entonces.
>
> Prueba: `tools/test-importacion-con-nombre-propio.js`, 19 comprobaciones,
> incluido el caso exacto de este hallazgo — una fila importada con el
> comentario reescrito entero sigue siendo de su tanda.
>
> **Lo que NO cambia con esto, y sigue pendiente:** deshacer sigue mandando las
> filas a la papelera. Que no vayan —decisión del 26/10— es el paso siguiente.

---

## 🔴 H-23 · Un nombre de modelo de Google dentro del archivo apagó el lector en una instalación entera

**Dónde:** `Code_v3_fixed.gs` ~1881, `GEMINI_MODEL_DEFAULT`.

Lo encontró Jose el 27/10 intentando poner la clave de IA en la copia de OX
Glass: *"es raro porque en la cuenta de mi warehouse (DEMO) las claves sí
funcionan... intenté usar la misma, pero no me deja, e incluso creé otra. La
intenté cambiar como 5 veces."*

**No era la clave, y ninguna clave lo habría arreglado.** Google contestaba:

> *This model `models/gemini-2.5-flash` is no longer available to new users.*

**La distinción que lo explica todo: el modelo NO está retirado — está cerrado
a quien no lo usaba ya.** La DEMO entró antes y sigue funcionando; OX Glass es
cuenta nueva y no puede entrar. De cara a quien lo sufre, las dos cosas se ven
igual: *«mi clave no funciona»*.

**Por qué es ALTA:** no es que una función fallara. Es que **la app dijo algo
falso sobre la causa**, y mandó a Jose a hacer cinco veces lo único que no podía
servir. Un cliente en esa situación concluye que el producto está roto y pide la
devolución — y tendría razón con la información que la app le dio.

**Y había un segundo fallo detrás del primero,** que es el que convirtió un
mensaje raro en un callejón sin salida: `setAiKey` comprobaba la clave contra
**un solo modelo** (`unSoloModelo = true`), por una optimización del 07/10 cuyo
razonamiento —*"si la clave está mal, está mal para los cuatro"*— **era verdad
sólo de las claves malas**. La lista de respaldo existía y habría contestado al
segundo intento. El atajo la desactivó justo en el caso que la necesitaba.

**Arreglado el 27/10:**

1. `GEMINI_MODEL_DEFAULT` pasa a **`gemini-3.8-flash`** — comprobado en la
   página de retiradas de Google: salió el 2/9/2026, es el recomendado para
   proyectos nuevos y no tiene fecha de apagado.
2. La lista de respaldo queda `gemini-3.8-flash` → `gemini-flash-latest` →
   `gemini-2.5-flash` → `gemini-2.5-flash-lite`. **Los viejos se quedan, al
   final:** siguen sirviendo a las cuentas que ya los usaban, y quitarlos
   apagaría la DEMO a cambio de nada.
3. **El atajo se quita.** Validar una clave vuelve a recorrer la lista, y no
   cuesta tiempo: `geminiFetch_` sólo pasa al siguiente modelo con un **404**,
   así que una clave mala para en el primero igual de rápido. El parámetro
   `unSoloModelo` se borra entero — uno que ya no se usa no se deja «por si
   acaso».

**La lección, anotada para no repetirla:** un atajo que pasa por alto el 404 da
por sentado que lo único que puede fallar es la clave. Y es el ejemplo vivo de
la Parte 4 del análisis de seguridad — *lo que Google puede cambiar debajo*—
ocurriendo el mismo día en que se escribió.
