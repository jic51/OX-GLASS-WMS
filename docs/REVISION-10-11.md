# Revisión completa — 10 de noviembre de 2026

> ## ⚠️ CORRECCIONES A ESTA REVISIÓN — 10/11, al construirla
>
> Al ir a arreglar lo de la lista, **tres cosas que escribí aquí resultaron ser
> falsas**. Van arriba y no escondidas al final, porque una de ellas la puse yo
> en el puesto 3 de la cola:
>
> **1 · H-15 NO EXISTE.** Dije que *"el inicio de sesión descansa en una cadena
> hecha con `Math.random()`"*. No es verdad. El testigo es
> `base64(correo|caducidad).HMAC-SHA256(…, secreto)`, el secreto son **dos
> `Utilities.getUuid()`** y la verificación comprueba firma **y** caducidad. El
> único `Math.random()` está en el id de un movimiento, donde sirve para evitar
> colisiones, no es secreto, y hace falta una sesión válida para usar un id.
> **Lo retiré de la cola antes de gastar tiempo en él.** El hallazgo H-15 de
> `HALLAZGOS.md` estaba mal redactado desde el principio.
>
> **2 · C-03 YA ESTABA CONSTRUIDO.** Dije que `runDataQualityScan` *"no revisa
> aritmética"*. Sí la revisa: tiene una familia entera de hallazgos
> `kind: 'negative'` que calcula el neto de cada material desde el archivo, deja
> fuera TRANSFER y ADJUST con su motivo escrito, y **no ofrece arreglo
> automático a propósito** porque no hay respuesta segura. Y el navegador lo
> pinta. Estaba bien hecho y no lo vi.
>
> **3 · O-03 eran 14, no 25.** Mi detector de CSS sin usar contaba como muertas
> las clases que el código **construye al vuelo** (`'dq-kind dq-' + f.kind`,
> `role-badge-` + rol, `inc-status-` + estado). Once de las veinticinco estaban
> vivas. Las catorce reales sí lo eran — y tres de ellas (`cfg-item-input`,
> `loc-arch-btn`, `loc-del-btn`) **las dejé yo** en P-02 y en el asistente.
>
> Lo que sigue en pie de la revisión: C-01, C-02, D-01, D-03, O-01, O-02 y la
> lista de seguridad.



Pedido por Jose: *"haz una revisión de toda la app: vulnerabilidades, problemas
en los cálculos, manejo de datos, trazabilidad. También quiero que empecemos a
trabajar en optimización: en tiempo, en código, en recursos. Y haz una lista."*

**Todo lo que hay aquí está medido, no supuesto.** Donde digo un número, el
número salió de ejecutar algo sobre el archivo. Donde no pude medir, lo digo.

**El tamaño de lo revisado:** 51.377 líneas · 344 funciones de servidor ·
65 acciones alcanzables desde el navegador · 207 ficheros de prueba.

---

## 0 · Lo primero: lo que NO está roto

Una lista de defectos sin esto es una lista deshonesta. Estas cuatro cosas las
busqué esperando encontrarlas mal, y están bien:

| | Qué comprobé | Resultado |
|---|---|---|
| **Inyección de fórmulas** | que un material llamado `=HYPERLINK("http://malo","clic")` no se convierta en fórmula viva de la hoja | ✅ `textCell_` antepone `'` a **todo** texto que se escribe. 71 usos. Lo que llega del usuario entra como texto, siempre |
| **XSS en el navegador** | datos del servidor metidos en `innerHTML` sin escapar | ✅ **cero** encontrados. Y hay tres pruebas vigilándolo |
| **La puerta de entrada** | que no haya acción alcanzable sin sesión | ✅ `processMovement` verifica el testigo **antes** de repartir, y rechaza `NO_SESSION`, `DENIED` y `VIEWER` de una vez. Las 65 acciones pasan por ahí |
| **Borrado en tanda** | que borrar 200 movimientos no haga 200 barridos | ✅ lee las hojas **una vez**. Y devuelve **qué ids** se llevó, no cuántos |

---

## 1 · CÁLCULOS

### 🔴 C-01 · El coste medio se desvía, y se puede medir

**Medido.** Simulé 1.000 entradas de 7 unidades con precios entre 3,00 y 5,00:

```
media con redondeo por paso : 3.940000      ← lo que hace la app
media exacta                : 3.968960
desvío                      : -0.028960  =  -$202,72 sobre 7.000 unidades
```

**La causa.** Al entrar material, la media ponderada se recalcula y se redondea
a céntimos **en cada paso**:

```js
newAvg = round2_((whBeforeThisRow * priorCost.avg + qty * unitCost) / (whBeforeThisRow + qty));
```

Ese `round2_` entra en el valor que se usará para el siguiente cálculo, así que
el error no se queda quieto: **se acumula**. Con 1.000 entradas son 3 céntimos
por unidad, que en el inventario de OX Glass son doscientos dólares.

**No es un fallo grave, y por eso hay que arreglarlo ahora**: nadie lo va a
notar hasta que alguien cuadre el inventario con la contabilidad, y entonces
será un misterio de doscientos dólares en vez de una línea de código.

**El arreglo:** guardar la media **sin redondear** y redondear sólo al
enseñarla. El redondeo es de presentación, no de almacenamiento.

### 🟠 C-02 · El cero oculta un inventario imposible

```js
s.warehouseQty = Math.max(0, s.warehouseQty - qty);      // línea 3714
item.warehouseQty = Math.max(0, item.warehouseQty);      // línea 3866
```

Si las salidas superan a las entradas —por un movimiento mal metido, un borrado
a medias, una importación duplicada y luego deshecha— el almacén **debería**
dar negativo. Eso es imposible físicamente, y por eso es exactamente la señal de
que algo se rompió.

La app lo tapa con un cero y sigue.

**Y lo peor es que SÍ lo detecta.** Por estantería lo apunta:

```js
s._errors.push('NEG@' + exSrc + ' had=' + before + ' tried=' + qty);
```

…y después, línea 3879, hace esto con la evidencia:

```js
Logger.log('STOCK_ERR [' + k + ']: ' + item._errors.join(' | '));
```

**Al registro de ejecuciones de Apps Script**, que nadie abre nunca, y menos un
cliente — que según tu propia regla *no debe ir al Sheet jamás*. Y los dos
`Math.max(0, …)` del total ni siquiera apuntan nada: ahí el error se pierde sin
dejar rastro.

**El arreglo:** que un stock imposible salga en el **Error Log** y en 🩺 *Check
this installation*, que son los dos sitios donde alguien mira. El cero puede
quedarse para no enseñar números raros; lo que no puede quedarse es el silencio.

### 🟡 C-03 · `runDataQualityScan` no busca números imposibles

Revisa nombres: materiales parecidos, proyectos mal escritos, estanterías
huérfanas. **No revisa aritmética.** Un almacén con stock negativo, una media de
coste absurda o un total que no cuadra con sus movimientos pasan el examen.

Es el complemento natural de C-02: el sitio donde avisar ya existe.

---

## 2 · DATOS Y TRAZABILIDAD

### 🟠 D-01 · La media de coste no tiene historia

`avgCost` vive en las columnas 15/16/17 de CONFIG como **un solo número por
material**. Se pisa en cada entrada.

Los costes **sí** quedan estampados en cada fila de movimiento —y eso es lo que
hace posible cambiar de método de costeo sin reescribir el pasado, que ya está
anotado—. Pero la media en sí no deja rastro: si mañana sale mal, no hay forma
de saber qué valor tenía el mes pasado ni qué entrada la movió.

**Y empeora con C-01**: una media que se desvía poco a poco, sin historia, no se
puede auditar hacia atrás. Sólo se puede recalcular desde cero.

**El arreglo barato:** que `MATERIAL_PRICE_SET` y las entradas con coste dejen
el valor anterior y el nuevo en la auditoría, que ya existe y ya guarda
antes→después para otras cosas.

### 🟠 D-02 · Dos años de auditoría, pero el correo de cada persona va dentro

Ya está anotado como **H-17** y sigue abierto. Lo repito aquí porque esta
revisión es la que un cliente podría leer: los registros guardan el correo de
cada persona **para siempre**, y los Términos no dicen cuánto se guarda.

Tu decisión ya tomada —2 años de auditoría, 90 días de errores— sigue **sin
construir**.

### 🟡 D-03 · La importación no deja dicho quién corrigió qué

Desde la v14.5 se pueden corregir filas en pantalla antes de importar. La fila
corregida se marca internamente (`corregida: true`) pero **eso no viaja al
archivo**: el movimiento resultante no distingue entre «vino así del fichero» y
«alguien lo escribió a mano en la vista previa».

Para un inventario que se usa como prueba, esa diferencia importa.

**El arreglo:** una marca en el comentario de la fila, como ya se hace con la
huella de la importación.

### ✅ D-04 · Lo que sí tiene trazabilidad, y está bien hecho

- Cada movimiento lleva **`MOV_ID`** propio, y borrar/restaurar lo busca por ahí
  — no por posición de fila, que es lo que se rompió el 26 de septiembre.
- Cada importación lleva **`IMPORT_ID`** y su huella, así que «esto ya lo
  subiste» funciona y «deshacer esta importación» sabe exactamente qué filas son
  suyas.
- La papelera **copia, verifica y sólo entonces borra**. Es la lección de aquella
  noche, escrita en el código y protegida por pruebas.

---

## 3 · SEGURIDAD

Lo que sigue abierto ya está en `HALLAZGOS.md`; aquí va ordenado por **qué pasa
si no se arregla**, que es lo único que sirve para decidir.

| | Qué | Estado |
|---|---|---|
| 🔴 **H-09** | Quitar un documento sólo quita el enlace. **El archivo se queda en el Drive para siempre** | Abierto |
| 🟠 **H-11** | El secreto de OAuth es **el mismo en todas las instalaciones** y vive en el Drive de cada cliente | Necesita tu decisión |
| 🟠 **H-06** | La pantalla de inicio de sesión **se puede incrustar en cualquier web** | Necesita que lo midas en una copia de pruebas |
| 🟠 **H-15** | El inicio de sesión descansa en una cadena hecha con `Math.random()` | Abierto |
| 🟠 **H-16** | El testigo dura **30 días** y no hay forma de anular uno solo | Abierto |
| 🟠 **H-10** | El respaldo copia **todas** las Script Properties menos cuatro nombres | Abierto |
| 🟠 **H-12** | La frontera de la carpeta de documentos acepta **por nombre** | Abierto |
| 🟡 **H-14** | Un documento lo abre cualquiera con sesión, sea cual sea su rol | Abierto |
| 🟠 **H-03** | Se pide `userinfo.profile`, que **no se usa nunca** | Necesita tu decisión (obliga a reautorizar) |

**El que yo pondría primero de todos: H-15.** `Math.random()` no es
criptográficamente seguro — es predecible si se conoce el estado del generador.
Es el cimiento de toda la autenticación, y cambiarlo es pequeño y no obliga a
nadie a reautorizar. Los demás son más caros o necesitan que decidas tú.

---

## 4 · OPTIMIZACIÓN — medido

### 🔴 O-01 · Cada inicio de sesión lee el archivo ENTERO

```js
var data = archive.getDataRange().getValues();     // getInitialData, línea ~71
for (var j = 1; j < data.length; j++) { … parseArchiveRow(row, j + 1); }
```

**Cada vez que alguien abre la app**, el servidor lee todas las filas de
`ARCHIVE` × 26 columnas y construye un objeto por fila en memoria.

| Movimientos vivos | Celdas leídas por inicio de sesión |
|---|---|
| 5.000 | 130.000 |
| 20.000 | 520.000 |
| 50.000 | **1.300.000** |

Y eso **lo hace cada persona, cada vez**. Con cinco personas abriendo la app
cuatro veces al día son veinte barridos completos diarios.

Lo que lo salva hoy es `archiveOldMovements`, que saca lo viejo a
`ARCHIVE_HISTORY` según `archiveCutoffMonths`. O sea: **el rendimiento depende
de un ajuste que el cliente puede subir sin que nada le avise de lo que cuesta.**

**El arreglo, por orden de lo que rinde:**

1. **Paginar lo que viaja.** El navegador pinta 50 movimientos y tiene un «Load
   more»; no necesita los 50.000 en la primera carga. Esto solo quita la mayor
   parte del coste.
2. **Avisar en el ajuste.** Que `archiveCutoffMonths` diga cuántas filas implica
   y cuánto tarda, en vez de ser un número suelto.
3. **Caché del arranque** con el sello de datos que ya existe (`dataStamp_`): si
   nada cambió desde la última vez, no hay que releer nada.

### 🟠 O-02 · 750 KB de JavaScript a cada navegador, en cada carga

**Medido** sobre lo que de verdad se despliega (`pegar/`):

```
  Index (lo que se pega) : 962 KB
  comprimido (lo que viaja): 238 KB
     CSS   149 KB
     JS    750 KB
     HTML   61 KB
```

En una bodega con 4G flojo y un teléfono viejo, 238 KB comprimidos que hay que
**descomprimir y compilar enteros** antes de pintar nada es la razón de que la
app tarde en abrir en el móvil.

**Lo que NO es el problema, y conviene decirlo:** los comentarios. Son el 48 %
del archivo del repositorio, pero `tools/build-paste.js` ya los quita antes de
desplegar. El peso que viaja es **código de verdad**.

**El arreglo real es cargar tarde lo que no hace falta al principio.** Ajustes,
el asistente, las etiquetas, el mapa del almacén, el lector de documentos:
ninguno hace falta para ver el tablero. Hoy viajan todos.

Eso **choca con una regla tuya** —la app es UN SOLO ARCHIVO a propósito— así que
no lo propongo a la ligera. Hay una forma que no la rompe: partir el HTML en
trozos que Apps Script une al servir (`HtmlService` con plantillas), que sigue
siendo un despliegue de pegar-y-listo pero manda menos por la red. **Es una
decisión tuya, no mía.**

### 🟡 O-03 · 25 clases de CSS que no usa nadie

De 794 clases definidas, **25 no se nombran en ninguna parte** fuera de la hoja
de estilos: `ai-accept-btn`, `ai-field-row`, `ai-review-panel`, `cfg-item-input`,
`co-form`, `col-toggle-bar`, `dq-gap`, `dq-negative`, `dq-similar`, `dq-spelling`,
`inc-status-arrived`, `inc-status-cancelled`…

Es el 3 % — **poco peso, pero mala señal**: `cfg-item-input` es de los recuadros
de edición por fila que quitamos en P-02 y nadie se llevó su estilo. `dq-negative`
sugiere que alguien empezó a pintar números imposibles (C-02) y no terminó.

**No es optimización: es una lista de cabos sueltos que se pueden leer.**

### ✅ O-04 · Lo que ya está optimizado, y bien

- **Las hojas derivadas** (`LIVE_STOCK`, `SITE_STOCK`, `WASTED_STOCK`) evitan
  recalcular el inventario desde cero en cada inicio de sesión — y si están
  atrasadas, el código **se cae al barrido completo** en vez de fiarse. *Preferir
  lento a inventado* es la decisión correcta y está escrita.
- **`findMovementById_`** lee **una sola columna**, no la hoja entera.
- **`borrarFilasEnTanda_`** lee las hojas **una vez** para N borrados.
- **Las funciones grandes están donde deben:** las seis mayores
  (`addMovementsBatch_` 663 líneas, `archiveOldMovements` 457) son las que
  escriben, y una escritura atómica no se puede partir sin perder la atomicidad.

---

## 5 · LA LISTA, POR ORDEN

| # | Qué | Por qué ése | Tamaño |
|---|---|---|---|
| **1** | **C-01** · guardar la media de coste sin redondear | Es dinero, está medido ($202 por cada 7.000 unidades) y el arreglo es una línea | Pequeño |
| **2** | **C-02 + C-03** · que un stock imposible se vea | La app ya lo detecta y tira la prueba a un log que nadie abre | Mediano |
| **3** | **H-15** · el testigo de sesión con un generador de verdad | Es el cimiento de la autenticación, y no obliga a nadie a reautorizar | Pequeño |
| **4** | **O-01** · paginar lo que viaja en el arranque | Es el coste que más crece con el tiempo, y crece en silencio | Mediano |
| **5** | **H-09** · el documento que se queda en el Drive para siempre | Es el único 🔴 de seguridad abierto | Mediano |
| **6** | **D-01** · dejar rastro de la media de coste | Hace auditable lo que el 1 arregla | Pequeño |
| **7** | **O-02** · cargar tarde lo que no hace falta al abrir | **Necesita tu decisión** sobre la regla del archivo único | Grande |
| — | O-03, D-03 | Cabos sueltos, cuando toque | Pequeños |

**Lo que no está en esta lista y sigue siendo lo más importante para OX Glass:
P-05** (proveedor ≠ marca). Esta revisión mira la salud de la app; P-05 es una
función que te falta y que se encarece cada día que pasa.
