# Recuperar los movimientos — guía de clics, 2026-10-01

> Esto NO es el manual general (`RESTAURAR-UN-BACKUP.md`). Es la guía para lo que
> hay que hacer hoy, escrita suponiendo que nunca has abierto el editor de Apps
> Script. Cada paso dice dónde hacer clic y qué vas a ver.

**Situación:** el 29/09 a las 3:19 el archivado nocturno falló y dejó
`MASTER_ARCHIVE_V3` y `ARCHIVE_HISTORY` vacíos. El backup de hoy y el de ayer ya
traen el vacío. **El bueno es el de `2026-09-29_0236`**, 43 minutos antes del
fallo.

Son cuatro partes y unos 20 minutos:

- **A.** Apagar el trabajo nocturno (5 min) — *antes de nada*
- **B.** Devolver los movimientos (10 min)
- **C.** Comprobar que están bien (3 min)
- **D.** Correr el ensayo y mandarme el informe (2 min)

---

## ANTES DE EMPEZAR — abre el editor de Apps Script

Lo vas a necesitar en las partes A y D. Hazlo una vez y deja esa pestaña abierta.

1. Abre tu hoja de cálculo de Acopio (la de verdad, no un backup).
2. En la barra de menús de arriba —donde dice *Archivo, Editar, Ver, Insertar,
   Formato, Datos, Herramientas, **Extensiones**, Ayuda*— haz clic en
   **Extensiones**.
3. En el menú que se abre, haz clic en **Apps Script**.
4. **Se abre una pestaña nueva del navegador.** Es el editor. Tarda unos
   segundos.

### Cómo es el editor por dentro

A la **izquierda del todo** hay una columna estrecha con cuatro iconos, uno
debajo de otro. De arriba abajo:

| Icono | Se llama | Para qué |
|---|---|---|
| `< >` | **Editor** | el código. Es lo que se ve al abrir. |
| `🕐` (un reloj) | **Activadores** / *Triggers* | **la Parte A** |
| `☰` (líneas) | **Ejecuciones** / *Executions* | **ver qué pasó el 29 a las 3:19** |
| `⚙` | **Configuración del proyecto** | las Script Properties |

> Si la columna sólo enseña los iconos sin texto, pasa el ratón por encima y
> sale el nombre.

---

# PARTE A — Apagar el trabajo nocturno

**Por qué primero:** si no lo apagas, esta noche a las 3 vuelve a correr y puede
volver a vaciar lo que acabas de restaurar.

1. En el editor, haz clic en el icono del **reloj 🕐** (Activadores).
2. Se abre una tabla con los trabajos programados. Vas a ver filas como:

   ```
   dailyBackupTrigger            Basado en el tiempo   Temporizador de hora   2am a 3am
   archiveOldMovementsTrigger    Basado en el tiempo   Temporizador de hora   3am a 4am
   dailyCheckinTrigger           ...
   ```

3. Busca la fila que dice **`archiveOldMovementsTrigger`**.
4. **Al final de esa fila, a la derecha, hay tres puntos verticales `⋮`.** Haz
   clic ahí.
5. Elige **Eliminar activador** (*Delete trigger*). Confirma.

**Eso es todo.** El archivado deja de correr de noche. No pasa nada por dejarlo
apagado unos días: su única función es mover movimientos viejos de una pestaña a
otra, y nada se rompe por no hacerlo.

> **No borres `dailyBackupTrigger`.** Ése es el backup y lo quieres encendido.

### De paso: mira qué pasó el 29 a las 3:19

Esto es opcional pero vale mucho y son treinta segundos.

1. Clic en el icono de **líneas ☰** (Ejecuciones).
2. Sale una lista de todo lo que ha corrido, con fecha, duración y estado.
3. Busca la del **29/09 alrededor de las 3:19**, con estado **Con errores**
   (*Failed*).
4. **Haz clic en esa fila**: se despliega y enseña el error completo, con las
   líneas de código donde ocurrió.
5. **Hazme una captura de eso.** Es lo que necesito para saber si el código que
   corrió esa noche era el de la v12.14 o uno anterior — que es la pregunta que
   no he podido contestar.

---

# PARTE B — Devolver los movimientos

### B1. Encontrar el backup bueno

1. Abre **Google Drive** (drive.google.com).
2. En el buscador de arriba escribe: **`Backup 2026-09-29`**
3. Tiene que salir un archivo llamado algo como:
   **`OX Glass LLC. — Acopio — Backup 2026-09-29_0236`**
4. **Ábrelo** (doble clic).

### B2. Mirarlo ANTES de usarlo

**Este minuto es el que evita el error que más duele** — reemplazar lo que
tienes por una copia que también estaba mal.

1. Abajo del todo verás las pestañas. Haz clic en **`MASTER_ARCHIVE_V3`**.
2. **¿Tiene filas con datos debajo de la cabecera?**
   - **Sí** → sigue en B3. 👍
   - **No, está vacía** → ese backup tampoco sirve. Busca
     `Backup 2026-09-28` y repite. Dímelo si ninguno tiene datos.

### B3. Copiar la pestaña a tu archivo vivo

Esto **no mueve nada**: hace una copia. El backup se queda como está.

1. Sigues en el backup, en la pestaña `MASTER_ARCHIVE_V3`.
2. **Haz clic derecho sobre el NOMBRE de la pestaña** (abajo, donde pone
   `MASTER_ARCHIVE_V3`).
3. En el menú elige **Copiar en** → **Hoja de cálculo existente**.
4. Se abre un buscador de archivos de tu Drive. **Elige tu hoja de Acopio de
   verdad** (la que usas a diario, no un backup).
5. Sale un aviso de *"Hoja copiada"* con un botón para abrir el destino.

### B4. Ponerle el nombre correcto

1. Ve a tu **hoja de Acopio de verdad**.
2. Abajo verás una pestaña nueva llamada **`Copia de MASTER_ARCHIVE_V3`**.
3. **La vieja, la vacía, NO se borra todavía.** Haz clic derecho en la pestaña
   `MASTER_ARCHIVE_V3` (la vacía) → **Cambiar nombre** → escribe
   **`MASTER_ARCHIVE_V3_ROTA`** → Enter.
4. Ahora haz clic derecho en **`Copia de MASTER_ARCHIVE_V3`** → **Cambiar
   nombre** → escribe exactamente **`MASTER_ARCHIVE_V3`** → Enter.

> **El nombre tiene que ser idéntico**, con las mayúsculas y el `_V3`. La app
> busca la pestaña por su nombre: si tiene una letra distinta, no la encuentra.

### B5. Reconstruir los totales

**Este paso es obligatorio y es el que más se olvida.** Las cifras de stock no
se guardan: se calculan desde el archivo. Hasta que no corras esto, la app
seguirá enseñando los totales de antes.

1. Abre la **app de Acopio** (la URL de siempre) y **recarga la página** (F5).
2. Arriba a la derecha, haz clic en **tu círculo verde con tus iniciales (JC)**.
3. En el menú que baja, haz clic en **⚙️ App Settings**.
4. En la columna de la izquierda, abajo del todo, haz clic en **System**.
5. Busca el recuadro que dice **STOCK TOTALS** y pulsa
   **🔧 Rebuild Stock Totals Now**.
6. Espera a que termine (puede tardar medio minuto).

---

# PARTE C — Comprobar que quedó bien

Tres comprobaciones. Si alguna falla, **no borres nada** y dímelo.

### C1. El conteo

1. En la app, pestaña **Movements & History**.
2. **Abajo de la tabla, a la izquierda, hay una línea que dice algo como
   `50 of 1271 records`.** Ese segundo número es el total.
3. **¿Se parece a lo que tenías?** Antes del fallo eran **1.271**.

### C2. Un adjunto viejo

**Ésta es la que más se olvida y la que más importa**, porque comprueba que la
app sigue encontrando tus fotos y PDFs.

1. En Movements & History, mira la columna del final, **DOC**.
2. Busca una fila que tenga un **clip 📎 o una miniatura** — da igual cuál, mejor
   si es de hace meses.
3. **Haz clic en ella.**
4. **¿Se abre la foto o el PDF?**
   - **Sí** → perfecto, todo está en su sitio.
   - **No** → párate aquí y dímelo.

### C3. Tres cantidades que te sepas de memoria

1. Ve a **Stock Dashboard**.
2. Busca tres materiales cuyas cantidades conozcas.
3. **¿Cuadran con lo que hay en la bodega?**

### C4. Borrar la pestaña rota

**Sólo si C1, C2 y C3 salieron bien.**

1. En tu hoja de cálculo, abajo, haz clic derecho en la pestaña
   **`MASTER_ARCHIVE_V3_ROTA`**.
2. Elige **Eliminar** y confirma.

Eso es todo lo que significaba "borra la `_ROTA`": era la pestaña vacía que
renombraste en B4 para no perderla por si algo salía mal. Una vez comprobado que
los datos buenos están, ya no hace falta.

---

# PARTE D — El ensayo, y qué mandarme

**Hazlo DESPUÉS de restaurar**, para que el ensayo mire datos de verdad.

### D1. Pega la v12.26 primero

Si todavía no has puesto los archivos que te mandé:

1. En el editor de Apps Script, icono **`< >`** (Editor).
2. A la izquierda verás la lista de archivos: `Code.gs`, `Index.html`, etc.
3. Clic en **`Code.gs`** → selecciona todo (Ctrl+A / Cmd+A) → pega el
   `Code_v3_fixed.gs` nuevo.
4. Clic en **`Index.html`** → selecciona todo → pega el `Index_v3_fixed.html`
   nuevo.
5. **Guarda** (el icono del disquete 💾, o Ctrl+S).

> Para el ensayo **no hace falta hacer Deploy**. El menú de la hoja corre el
> código guardado, no el publicado. El Deploy sólo hace falta para que la app
> web cambie.

### D2. Correr el ensayo

1. Ve a tu **hoja de cálculo** y **recárgala** (F5). Espera a que aparezca el
   menú **🏭 Acopio** arriba, al lado de *Ayuda*.
2. Clic en **🏭 Acopio** → **🔧 Advanced** → **🌙 Test the nightly archive
   (changes nothing)**.
3. Si te pide permisos, acéptalos.
4. Sale una ventana con el informe.

**No escribe nada.** Puedes pulsarlo las veces que quieras.

### D3. Qué mandarme

**Una captura de la ventana entera.** Si el texto es largo y no cabe:

- Puedes seleccionar el texto de la ventana con el ratón y copiarlo (Ctrl+C), y
  pegármelo aquí. Es mejor que la captura porque lo puedo leer entero.

Lo que necesito ver, y está todo en esa ventana:

```
RESULT: ...
SHEET WIDTHS
  The row model needs   : 23 columns
  MASTER_ARCHIVE_V3 has : ??        ← ESTE número es el que lo explica todo
  ARCHIVE_HISTORY has   : ??        ← y éste
MOVEMENTS RIGHT NOW ...
CUTOFF ...
AFTER TONIGHT IT WOULD LEAVE ...
✗ WHAT FAILED  (si sale)
STEP BY STEP ...
```

**Si sale `✗ WHAT FAILED`, perfecto** — eso es exactamente lo que llevamos dos
semanas sin poder ver, y con ese mensaje sé dónde está.

**Si NO sale ningún fallo**, también sirve: significa que con tus datos de hoy el
trabajo correría bien, y entonces lo que falló el 29 era código viejo. En ese
caso vuelves a encender el trigger (Parte A al revés: en Activadores, botón
**+ Añadir activador**, función `archiveOldMovementsTrigger`, a las 3 AM) — o más
fácil: menú **🏭 Acopio → 🔧 Advanced → 🩺 Check this installation**, que lo
reinstala solo y te lo dice.

---

## Tu pregunta sobre los movimientos viejos — la respuesta

> *"La app no muestra los movimientos cuando hay el fallo al archivar, lo que
> significa que la función archivar no muestra los movimientos viejos ni aunque
> el usuario lo quiera, ¿o no es así?"*

**No es así, pero la pregunta señala algo real.**

Los movimientos viven en **dos pestañas**, no en una:

| Pestaña | Qué tiene | Dónde se ve |
|---|---|---|
| `MASTER_ARCHIVE_V3` | lo reciente (dentro del corte de 6 meses) | Movements & History, al abrir |
| `ARCHIVE_HISTORY` | lo que pasó el corte | el botón **📜 Load Older History** |

El archivado **mueve** filas de la primera a la segunda. **No borra nada y no
esconde nada**: `loadOlderHistory` lee la segunda pestaña entera y la enseña.

**Lo que te pasó a ti es otra cosa:** las DOS pestañas están vacías. No es que la
app no te los enseñe — es que no están. Eso es pérdida de datos, no un problema
de visualización.

**Pero tienes razón en el fondo**, y es una crítica justa al diseño: la pantalla
principal sólo enseña una de las dos pestañas, y hay que saber que existe un
botón. Si no lo sabes, parece que tus movimientos desaparecieron.

Por eso la v12.25 cambió el mensaje. Ahora, cuando la lista reciente está vacía
pero el histórico tiene filas, la app ya no dice "No movements match your
filters" sino:

> **Nothing recent — all 1.271 of your movements are in the archived history.**
> Nothing is lost… Press **Load Older History** to see them.

Y si ves ese mensaje y no esperabas que todo estuviera en el histórico, te dice
también lo que de verdad pasa: **tu corte de archivado es más corto de lo que
crees**. El tuyo está en **6 meses**, así que cualquier movimiento anterior a
abril de 2026 sale de la lista principal. Eso es normal y es para lo que existe
el corte — pero conviene saberlo.

Si quieres verlos todos siempre en la lista principal, sube el corte en
**Settings → System**. El precio es que la app carga más despacio cuantos más
movimientos tenga que traer de golpe.

---

## Y cuando ya hayas restaurado: ¿cómo sabes que cuadra?

Restaurar no es el final. Copiar y pegar una pestaña entre dos archivos puede
dejar filas fuera por abajo o duplicarlas, y las dos cosas se ven igual a simple
vista. Hay que contar.

Las comprobaciones, con los clics y con lo que tiene que decir cada pantalla,
están en **`docs/VERIFICAR-QUE-TODO-CUADRA.md`**: comparar la copia con el
archivo vivo, que la app diga lo mismo que la hoja, que el código que corre sea
el que pegaste (que NO es automático: publicar es un paso aparte), y que el
disparador nocturno esté atado al código guardado y no a una foto congelada.
