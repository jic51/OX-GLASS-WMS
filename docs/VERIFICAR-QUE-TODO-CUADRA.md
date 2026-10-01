# ¿Cómo sé que todo cuadra? — antes de volver a poner el disparador

Jose, 2026-10-01, después de restaurar MASTER desde la copia buena y de correr
el ensayo del archivado:

> *"Cuando todo cuadre, 🩺 Check this installation para reinstalar el
> disparador desde el código nuevo." **¿CÓMO SÉ QUE TODO CUADRA? ¿CÓMO VERIFICO
> ESO?***

Tiene toda la razón en preguntarlo: "cuando todo cuadre" no es una instrucción,
es una suposición de que él sabe qué mirar. Esto es lo que hay que mirar, dónde
está cada cosa, y qué tiene que decir.

Hay **cuatro cosas distintas** que pueden no cuadrar, y son independientes entre
sí. Se comprueban en este orden porque cada una depende de la anterior:

| | Qué se comprueba | Dónde | Cuánto tarda |
|---|---|---|---|
| **A** | Que la restauración trajo TODO | en la hoja de cálculo | 3 min |
| **B** | Que la app dice lo mismo que la hoja | en la app | 3 min |
| **C** | Que el código que corre es el 12.29 | en la app y en el editor | 2 min |
| **D** | Que el disparador correrá ese código | editor + mañana | 1 min hoy |

---

## A. La restauración trajo todo — comparar la copia con el archivo vivo

**Por qué:** copiar y pegar una pestaña entre dos archivos puede dejar filas
fuera por abajo (si la selección no llegaba al final) o duplicarlas (si se pegó
dos veces). Las dos cosas se ven igual a simple vista: filas y filas de
movimientos. La única forma de saberlo es contar.

**No hay que escribir nada en las pestañas de datos.** Se crea una pestaña
nueva, se cuenta desde ahí, y se borra al terminar.

### Paso 1 — crear la pestaña de conteo en el archivo VIVO

1. Abre tu hoja de cálculo de trabajo (la de verdad, la que usa la app).
2. Abajo a la izquierda, al lado del nombre de la última pestaña, hay un
   botón **`+`** (un signo de más). Púlsalo. Aparece una pestaña nueva llamada
   `Hoja1` / `Sheet1` al final.
3. Haz doble clic en el nombre de esa pestaña nueva, escribe `CHECK` y pulsa
   Enter.
4. Haz clic en la celda **A1** y pega estas seis líneas **de una vez** (copia el
   bloque entero y pégalo en A1 — Google Sheets las reparte una por fila):

```
=COUNTA(MASTER_ARCHIVE_V3!A2:A)
=COUNTA(ARCHIVE_HISTORY!A2:A)
=COUNTA(MASTER_ARCHIVE_V3!W2:W)
=COUNTUNIQUE(MASTER_ARCHIVE_V3!W2:W)
=TEXT(MIN(MASTER_ARCHIVE_V3!A2:A),"yyyy-mm-dd")
=TEXT(MAX(MASTER_ARCHIVE_V3!A2:A),"yyyy-mm-dd")
```

Qué es cada número, de arriba abajo:

1. **Movimientos en la lista reciente.** Hoy el ensayo dice **1219**.
2. **Movimientos en el histórico archivado.** Hoy el ensayo dice **56**.
3. **Cuántos de esos 1219 tienen ID de movimiento.** Puede ser menor que 1219:
   los movimientos viejos de josephl se guardaron sin ID y eso ya lo sabemos.
4. **Cuántos IDs DISTINTOS hay.** Si 3 y 4 no son iguales, hay movimientos
   repetidos — es la señal de que algo se pegó dos veces.
5. **Fecha del movimiento más viejo** de la lista reciente.
6. **Fecha del más nuevo.** Tiene que ser de hoy o de ayer; si es de hace
   semanas, la restauración se trajo un archivo más viejo del que creías.

### Paso 2 — las mismas seis en la COPIA de respaldo

1. Ve a [drive.google.com](https://drive.google.com).
2. En la columna izquierda pulsa **Mi unidad**.
3. Busca la carpeta de respaldos (la que creó la app; si pusiste 📁 *Tidy up my
   Drive*, está dentro de la carpeta de Acopio) y entra.
4. Abre la copia **buena** — la de hoy a las 2:00 AM, la que ya usaste para
   restaurar. Se abre como una hoja de cálculo normal.
5. Repite el Paso 1 **dentro de la copia**: botón `+`, pestaña `CHECK`, pega las
   mismas seis fórmulas en A1.

### Paso 3 — comparar

Pon los dos grupos de seis números uno al lado del otro.

- **Los seis iguales** → la restauración es fiel. Nada se perdió y nada se
  duplicó. Esto es "cuadra".
- **El 1 o el 2 son MENORES en el archivo vivo** → faltan filas: se quedaron
  fuera de la selección al pegar. Hay que repetir el pegado (`Ctrl`+`A` dentro
  de la pestaña de la copia antes de copiar, para coger todo).
- **El 1 es MAYOR en el archivo vivo** → se pegó dos veces. No borres a ojo:
  mándame los números y te digo qué filas sobran.
- **El 3 y el 4 no coinciden entre sí** → IDs repetidos. Mándame los dos
  números.

> Si tienes cualquier duda con lo que sale, **manda los doce números** (seis del
> archivo vivo, seis de la copia) y yo te digo si cuadra. Es más rápido que
> adivinar, y los números no mienten.

### Paso 4 — borrar la pestaña CHECK

En los dos archivos: clic derecho sobre la pestaña `CHECK` → **Eliminar** →
confirmar. No deja rastro y no afecta a nada: ninguna parte de la app lee esa
pestaña.

---

## B. La app dice lo mismo que la hoja

**Por qué:** la app guarda en caché lo que leyó la última vez. Después de
restaurar una pestaña a mano, puede seguir pintando los totales de antes — y
eso se parece muchísimo a "la restauración no funcionó".

### 1. El total de movimientos

1. Abre la app.
2. Pulsa la pestaña **Movements**.
3. Pulsa `Ctrl`+`F5` (Windows) o `Cmd`+`Shift`+`R` (Mac) para forzar una recarga
   completa, y espera a que termine de cargar.
4. Baja hasta el final de la tabla. El botón de abajo tiene que decir:

   **`Load 300 more older movements (56 left)`** — o el número que toque.

   Lo importante no es el número exacto, es que **el botón diga un número y
   ofrezca traer más**. Si dice `All older history loaded`, es que ya están
   todos. Lo que ya no puede pasar es el `Older History (56)` de antes, que no
   distinguía "van 56 de 56" de "van 56 de 1.271".

5. Pulsa el botón. Tiene que **añadir** movimientos a los que ya hay, no
   reemplazarlos, y los que entren tienen que ser **más viejos** que los de
   arriba.

### 2. Una cantidad que te sepas de memoria

1. Pestaña **Dashboard**.
2. Busca un material cuyo stock sepas sin mirar — de los que tienes delante en
   el almacén.
3. La cantidad tiene que ser la real. Si no lo es, dímelo con el nombre del
   material y la cantidad que esperabas: eso es un problema de datos, no de la
   restauración, y se arregla distinto.

### 3. El aviso de "menos que nada"

1. Pulsa el círculo con tus iniciales, **arriba a la derecha**.
2. En el menú que se abre, pulsa **⚙️ App Settings**.
3. Arriba hay unas pestañas. Pulsa la que dice **System**.
4. Baja hasta donde dice **Check my data** y pulsa el botón
   **🔍 Check my data**.
5. Espera. Sale una lista de tarjetas con cosas que la app propone arreglar.

   **Lo que buscas es que NO haya ninguna tarjeta roja de "Less than
   nothing".** Esa tarjeta aparece cuando un material ha salido más veces de
   las que entró — que es exactamente la huella que deja una restauración
   incompleta: están las salidas pero faltan las entradas.

   Las otras tarjetas (nombres escritos de dos formas, movimientos sin
   proveedor) son normales y no urgentes. No hace falta tocar nada.

### 4. Un adjunto viejo tiene que abrirse

**Por qué:** los adjuntos no están en la hoja, están en Drive; la hoja sólo
guarda el enlace. Si la copia que restauraste es anterior a un adjunto, el
enlace puede apuntar a un archivo que ya no existe.

1. Pestaña **Movements**.
2. Busca en la columna de la derecha un movimiento que tenga el icono de
   adjunto (un clip 📎 o el número de documentos).
3. Púlsalo. Tiene que abrirse el PDF o la foto.
4. Haz lo mismo con **uno de los más viejos** que encuentres.

Si uno no abre, apunta de qué movimiento es y sigue: no bloquea nada, pero hay
que saberlo.

---

## C. El código que está corriendo es el 12.29

Esto es lo que más se nos ha escapado estas dos semanas, así que va con detalle.

**En este proyecto conviven DOS copias del código a la vez y no tienen por qué
ser la misma:**

- **El código guardado** (lo que Google llama *Head*, "Encabezado"): lo que
  acabas de pegar y guardar. Es lo que corre cuando pulsas un botón del menú de
  la hoja, y lo que corre cuando pulsas ▷ en el editor.
- **La versión publicada** (lo que corre cuando abres la app en el navegador):
  una **foto congelada** del código, hecha el día que publicaste. En tus
  Ejecuciones se ve como `Versión 271`. Esa foto **no cambia** cuando pegas
  código nuevo y guardas. Sigue sirviendo la 271 hasta que la vuelvas a
  publicar.

Es decir: **pegar y guardar NO actualiza la app del navegador.** Por eso el
ensayo del archivado te dio el informe nuevo (ese corre sobre el código
guardado) y la app de la pantalla puede seguir siendo vieja.

### 1. Qué versión tiene la app ahora mismo

1. Abre la app.
2. Pulsa el círculo con tus iniciales, **arriba a la derecha**.
3. Baja la vista al final de ese menú, justo encima de donde dice **Privacy
   Policy**. Hay una línea en gris pequeña.
4. Tiene que decir, literalmente:

   **`OX Glass Co. · Acopio v12.29 · build 8b55aed4`**

   (el nombre del principio es el de tu empresa, puede variar)

- **Si dice v12.29 · build 8b55aed4** → la app del navegador es la nueva.
  Sigue al punto D.
- **Si dice otra versión u otro build** → la app está sirviendo la foto
  congelada vieja. Hay que volver a publicar; es el punto siguiente.

### 2. Volver a publicar (si el punto anterior dio una versión vieja)

El camino corto, porque tu copia ya está enlazada a un proyecto de Google
Cloud:

1. Abre tu hoja de cálculo.
2. En la barra de menús de arriba, pulsa **🏭 Acopio** (el menú de la app, al
   lado de *Ayuda*).
3. Pulsa el submenú de administración y luego **Push Update Live**.
4. Sale un aviso **✅ Update published!** con la dirección de la app. Esa
   dirección **no cambia nunca**: los enlaces y marcadores de todos siguen
   valiendo.
5. Vuelve a la app, pulsa `Ctrl`+`F5` (Windows) o `Cmd`+`Shift`+`R` (Mac), y
   repite el punto C.1. Ahora tiene que decir v12.29.

Si ese botón da un error, el camino largo (el que siempre funciona):

1. Hoja de cálculo → menú **Extensiones** → **Apps Script**. Se abre el editor
   en otra pestaña.
2. **Arriba a la derecha**, botón azul **Implementar** / **Deploy**.
3. En el desplegable, **Gestionar implementaciones** / **Manage deployments**.
4. En la ventana que sale, arriba a la derecha de la implementación activa hay
   un lápiz **✏️**. Púlsalo.
5. Donde dice **Versión** / **Version** hay un desplegable. Ábrelo y elige
   **Versión nueva** / **New version**.
6. Pulsa **Implementar** / **Deploy**, y luego **Listo** / **Done**.
7. Vuelve a la app, `Ctrl`+`F5`, y repite el punto C.1.

### 3. Que el código guardado también es el 12.29

Ya lo comprobaste sin saberlo: el informe del ensayo que me mandaste trae las
líneas `SHEET WIDTHS`, `GUARD 1 (width) passes` y `GUARD 2 (count) passes`. **Ese
informe no existe antes de la v12.26.** Si sale, el código guardado es nuevo.

---

## D. El disparador correrá ese código

### 1. Instálalo A MANO, no con 🩺

**Cambio respecto a lo que te dije antes.** Te dije de reinstalarlo con
*🩺 Check this installation*, y es más cómodo, pero lo crea por programa
(`ScriptApp.newTrigger`) — que es exactamente como estaba creado el que falló
tres noches. No tengo forma de demostrar que eso tuviera la culpa, pero tampoco
tengo forma de demostrar que no, y el disparador a mano **se puede mirar en
pantalla**: ves a qué código está atado. El de antes no.

Así que esta vez a mano:

1. Hoja de cálculo → menú **Extensiones** → **Apps Script**.
2. En la columna de iconos de la **izquierda** del editor, el cuarto de arriba
   abajo es un **reloj despertador ⏰** (si pasas el ratón dice *Activadores* /
   *Triggers*). Púlsalo.
3. **Abajo a la derecha**, botón azul **+ Añadir activador** / **+ Add
   Trigger**.
4. Rellena la ventana que sale, de arriba abajo:
   - **Función a la que se ejecutará**: `archiveOldMovementsTrigger`
   - **Implementación que se debe ejecutar** / *Which deployment should run*:
     **`Encabezado`** / **`Head`** ← **esto es lo importante de todo el paso.**
     Si eliges un número de versión, el disparador queda atado a una foto
     congelada y pegar código nuevo no le afecta nunca.
   - **Origen del evento**: **Según la hora** / *Time-driven*
   - **Tipo de activador basado en tiempo**: **Temporizador por día** / *Day
     timer*
   - **Hora del día**: **3:00 a. m. a 4:00 a. m.**
   - **Configuración de notificación de errores**: *Notificarme
     inmediatamente*.
5. Pulsa **Guardar**. Si pide permisos, acéptalos con tu cuenta de dueño.
6. Vuelve a mirar la lista de activadores. Tiene que haber **UNA sola** línea
   de `archiveOldMovementsTrigger`, y en la columna de implementación tiene que
   decir **Encabezado** / **Head**.

   Si hay dos, borra la de más: pasa el ratón por encima de la fila, pulsa los
   **tres puntos ⋮** de la derecha y **Eliminar activador**. Dos disparadores
   significan dos archivados la misma noche.

### 2. La prueba definitiva, mañana por la mañana

Esta es la que contesta la pregunta de verdad, y por eso puse el sello de
versión en la v12.29: **a partir de ahora el trabajo nocturno firma con su
versión antes de tocar nada.**

Mañana, después de las 3:00 AM:

1. Abre la app.
2. Círculo con tus iniciales, arriba a la derecha → **⚙️ App Settings** →
   pestaña **System**.
3. Arriba sale la lista de lo que el sistema hizo solo. Busca la línea de esta
   noche.

**Qué significa cada caso:**

| Lo que ves | Qué significa | Qué hacer |
|---|---|---|
| `archive start` · *nightly archive starting · **v12.29*** | **El disparador está corriendo el código nuevo.** Resuelto. | Nada. |
| `archive start` con **otra versión** | Sigue corriendo código viejo, y ahora sabemos CUÁL. | Mándame el número. |
| **No hay ninguna línea** `archive start`, pero sí hay error en ERROR_LOG | Sigue corriendo código viejo: el código viejo no sabe firmar. | Mándame el error. |
| No hay nada de nada | El disparador no corrió. | Mira ⏰ Activadores otra vez. |

La línea de *Old movements archived* que sale después también lleva la versión
y el corte: `v12.29 · cutoff=6mo`.

> **Esta es la respuesta real a "¿cómo sé que todo cuadra?":** hasta la v12.28
> no se podía saber. Había que deducirlo de los números de línea de un error, y
> eso lo hice yo mirando el archivo, no tú mirando la pantalla. Desde la v12.29
> el trabajo nocturno dice su versión en voz alta, en tu propia hoja, todas las
> noches. Si vuelve a pasar, se ve a la mañana siguiente en una línea de texto.

---

## Lo del guion (`—`) en la columna Versión

Jose, con la captura de Ejecuciones: *"NO TIENE VERSIÓN"*.

Lo que se ve en su captura:

| Cuándo | Función | Resultado | Columna Versión |
|---|---|---|---|
| 1 oct, 3:19:05 AM | `archiveOldMovementsTrigger` | Error | **—** |
| 30 sept, 4:32:12 PM | `archiveOldMovementsTrigger` | Completado | **Encabezado** |
| varias | `doGet` / web app | Completado | **Versión 271** |

**Lo que NO voy a hacer es decirte que el guion es la prueba.** No lo es, y
conviene decirlo claro antes de que descansemos en él:

- Las dos filas que comparas **no son lo mismo**. La de las 4:32 de la tarde es
  una ejecución **lanzada a mano** (o desde un botón del menú); la de las 3:19
  de la madrugada la lanzó **el horario**. Que esas dos cosas se anoten distinto
  en esa columna puede ser completamente normal en Apps Script.
- Y no lo he podido confirmar en la documentación de Google: desde donde yo
  trabajo, `developers.google.com` está bloqueado por el proxy de salida. No voy
  a inventarme lo que dice.

**La prueba sigue siendo la de siempre, la de los números de línea**, y ésa es
sólida: el error de las 3:19 AM salía de `archiveOldMovements` en la **línea
2148**, y en tu archivo esa función empieza en la **4371** y ocupa unas 300
líneas. En el código que corrió esa noche entraba en 22 líneas. No era este
código. Eso no admite otra lectura.

**Pero la captura sí aporta algo nuevo, y es importante:** `Versión 271`. Eso
confirma que **este proyecto guarda fotos congeladas del código** — una versión
publicada es precisamente eso, y es la única manera de que código viejo exista
todavía dentro del proyecto. Si no hubiera versiones publicadas, no habría
código viejo que ejecutar en ninguna parte.

De ahí salen las dos cosas del punto C y del punto D:

1. **Volver a publicar** (C.2), para que la foto que sirve la app sea la 12.29 y
   no la 271.
2. **Crear el disparador a mano con `Encabezado`** (D.1), para que esté atado al
   código guardado y no a ninguna foto.

Y como no puedo demostrar a qué estaba atado el que falló — ese disparador ya
no existe, lo borramos, y su configuración se fue con él; fue el precio de
quitar el peligro de en medio, y lo volvería a pagar — lo que queda es el sello
de versión: **mañana por la mañana, la propia app dice qué versión corrió.**
