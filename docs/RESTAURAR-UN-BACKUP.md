# Restaurar un backup

<!-- PRIVADO. Nombra secretos de instalación y dice por escrito que el cliente
     OAuth es el mismo para todos los clientes. La versión para el cliente es
     `RESTAURAR-UNA-COPIA.md`, escrita desde cero, y es la que está publicada
     como `restaurar.html`. Si cambias un procedimiento aquí, mira si la otra
     dice algo que ya no es verdad. -->

> **Este documento empieza por el POR QUÉ, y no por los pasos, a propósito.**
>
> Hasta la v12.18 aquí había un solo procedimiento: el del peor caso — el
> archivo entero desaparecido, proyecto nuevo, URL nueva, avisar al equipo,
> volver a registrar el redirect URI. Nueve pasos y media hora larga.
>
> El 26 de septiembre de 2026 pasó lo primero de verdad, en producción, en OX
> Glass: el archivado nocturno vació `MASTER_ARCHIVE_V3`. **Ese caso no estaba
> cubierto por este documento**, y era el fácil: el archivo estaba sano, el
> proyecto de script intacto, la URL buena, los adjuntos en su sitio. Solo
> faltaban unas filas. Jose lo resolvió copiando una pestaña, en minutos, sin
> volver a publicar nada — y lo resolvió porque sabía lo que hacía, no porque
> lo dijera este documento.
>
> De ahí la forma nueva: **primero se responde POR QUÉ estás restaurando, y esa
> respuesta elige la ruta.** Tomar la ruta larga cuando te tocaba la corta no
> es solo lento: te hace generar una URL nueva, romper el acceso de todo el
> equipo y volver a configurar OAuth para arreglar un problema que eran tres
> filas.

---

## PARTE A — Por qué alguien llega aquí

Un backup no se restaura "por si acaso". Se restaura por una de estas cuatro
razones, y cada una rompe una cosa distinta.

### A1. Faltan filas, o una pestaña está dañada — pero la app funciona

Entras a la app y los movimientos no están, o están a medias, o el stock no
cuadra con el almacén. La app carga, la gente puede entrar, los adjuntos
abren. Lo que está mal son los **datos de una pestaña**.

**Ha pasado de verdad:** 26/09/2026, 3:19:10. El archivado nocturno escribió
filas de 23 columnas en un rango de 20 y `setValues` falló — pero el
`clearContent()` ya había corrido. Ver `INCIDENTE-2026-09-26-ARCHIVO.md`.
Recuperado del backup de las 2:36 con cero movimientos perdidos.

También llega aquí quien borró filas a mano en el Sheet, o pegó encima de una
pestaña, o le dio a deshacer de más.

→ **Ruta 1.** Unos minutos. No se vuelve a publicar nada. La URL no cambia.

### A2. El Sheet está inservible, pero el proyecto de script está bien

La hoja no abre, o abre corrupta, o tiene tantas pestañas rotas que no vale la
pena ir una por una. Pero el archivo existe, el proyecto de Apps Script sigue
adjunto, y la implementación sigue publicada en la misma URL.

→ **Ruta 2.** Media hora. La URL **no** cambia. Es la diferencia que la hace
valer la pena.

### A3. El archivo entero ya no está

Borrado, en la papelera y vaciada, o el dueño de la cuenta salió de la empresa
y con él el Drive. No hay nada que reparar: hay que levantar el sistema desde
la copia.

→ **Ruta 3.** Una o dos horas contando avisos y verificación. **URL nueva
obligatoria**, y con ella el trabajo de OAuth y avisar al equipo.

### A4. Nada se rompió — es el simulacro

Restauras para comprobar que puedes. **Esto no es opcional y no es paranoia:
un backup que nunca se restauró no es un backup, es un archivo.** El primer
simulacro (v11.13) descubrió que `writeConfigSnapshot_` no había funcionado
nunca en producción: dieciséis versiones de backups que se veían sanos y
salían sin la configuración.

→ **Ruta 3, en una copia de prueba**, nunca sobre el archivo del cliente.

---

## PARTE B — Elegir la ruta en treinta segundos

Contesta en orden y para en la primera que sea "no":

1. **¿Abre el Google Sheet?** No → **Ruta 3**
2. **¿Carga la app en su URL de siempre?** No → **Ruta 2**
3. **¿Abre un movimiento viejo con foto adjunta?** No → **Ruta 2**
   *(si esto falla, lo roto es la configuración, no los datos)*
4. Todo sí, solo faltan datos → **Ruta 1**

---

## PARTE C — Las tres rutas

Las tres empiezan igual. Este paso no se salta en ninguna.

### PASO 0 — Común a las tres rutas

1. **No borres nada.** Si hay un archivo dañado, renómbralo
   (`… — ROTO 2026-09-26`) y déjalo donde está. Es lo único que queda si la
   restauración sale mal.
2. **Apaga los disparadores nocturnos antes de tocar los datos.** No hay botón
   en la app para esto — se hace en el editor: **Extensiones → Apps Script →
   ⏰ Disparadores** (el reloj de la barra izquierda), y borras estos dos:
   - `dailyBackupTrigger` — el backup, **2 AM**
   - `archiveOldMovementsTrigger` — el archivado, **3 AM**

   Si no lo haces y la noche te pilla a medias, el archivado corre sobre un
   archivo a medio restaurar, y el backup de las 2 AM te guarda el estado roto
   encima del bueno. Se vuelven a poner solos con
   **🩺 Check this installation** en el Paso final; no hace falta recordar cómo
   se instalan.

   > **Esto merece un botón y no lo tiene.** Anotado en `BACKLOG.md`: un
   > interruptor "pausa el mantenimiento nocturno" en Settings → System, que se
   > apague solo a las 24 horas para que nadie lo deje apagado sin querer.
3. **Anota qué falta y desde cuándo.** Determina qué backup necesitas:
   **Settings → System → All backups in Drive**, o la carpeta
   `<prefijo>_Backups` del Drive del cliente. **Elige el último backup ANTERIOR
   al daño**, no el más reciente — el más reciente puede que ya tenga el daño
   dentro. En OX el daño fue a las 3:19 y el backup bueno era el de las 2:36.
4. **Copia el backup antes de tocarlo.** Clic derecho → **Hacer una copia**. El
   backup es tu único ejemplar bueno; se trabaja sobre la copia, nunca sobre él.

---

### RUTA 1 — Devolver filas a una pestaña *(unos minutos)*

Es la ruta corta y es la que más se va a usar. **No se vuelve a publicar nada,
no se toca Apps Script, no cambia ninguna URL, nadie se queda sin entrar.**

1. Abre la copia del backup **y** el archivo vivo, en dos pestañas del
   navegador.
2. En la copia, clic derecho en la pestaña que necesitas →
   **Copiar a → Hoja de cálculo existente** → elige el archivo vivo. Llega con
   el nombre `Copia de MASTER_ARCHIVE_V3`.
3. En el archivo vivo, renombra la pestaña dañada
   (`MASTER_ARCHIVE_V3_ROTA`) — **renombrar, no borrar**.
4. Renombra la recién llegada al nombre exacto que tenía:
   `MASTER_ARCHIVE_V3`. El nombre tiene que ser idéntico; la app busca por
   nombre.
5. **Reconstruye lo derivado: Settings → System → 🔧 Rebuild Stock Totals Now.** Las
   hojas de stock se calculan desde el archivo, así que hasta que no corras
   esto la app muestra el stock de antes. Este paso es obligatorio y es el que
   más se olvida.
6. Recarga la app. Comprueba: el conteo de movimientos, el stock de tres
   materiales que conozcas de memoria, y **un movimiento viejo con adjunto**.
7. Cuando cuadre, borra la pestaña `_ROTA` y **vuelve a poner los dos
   disparadores**: menú **🏭 Acopio → 🔧 Advanced → 🩺 Check this
   installation** los reinstala y te dice cuáles reinstaló.

**Si lo que falta son solo unas filas y el resto de la pestaña está bien**, es
lo mismo pero por rango: copia de la copia el bloque de filas que falta y
pégalo al final de la pestaña viva, con **Pegar solo valores**
(`Ctrl+Shift+V`) para no traerte formatos. Luego, igual, Rebuild Stock Totals Now.

> **Por qué pegar valores y no formato:** las celdas de Acopio guardan texto
> en columnas que Sheets quiere convertir a fecha o a número. Pegar con formato
> es la forma más fácil de convertir un PO `007` en un `7`.

---

### RUTA 2 — Restaurar los datos en el mismo archivo *(media hora)*

Cuando el Sheet es un desastre pero el proyecto de script y la URL están
bien. La ganancia es entera: **la URL no cambia**, así que no hay que avisar a
nadie, ni registrar redirect URIs, ni volver a poner Script Properties.

1. Paso 0 completo.
2. En el archivo vivo, renombra **todas** las pestañas dañadas con el sufijo
   `_ROTA`. No borres ninguna todavía.
3. Desde la copia del backup, **Copiar a → Hoja de cálculo existente** una por
   una, y renómbralas al nombre exacto. El orden que conviene:
   `CONFIG` → `USERS_V3` → `MASTER_ARCHIVE_V3` → `ARCHIVED_HISTORY`.
   *(`CONFIG` primero porque de ahí salen categorías, unidades y proyectos: si
   llega después, la app pinta movimientos que se refieren a cosas que aún no
   existen.)*
4. **NO copies** `ACOPIO_CONFIG_SNAPSHOT`: esa pestaña es para leerla, no para
   instalarla, y en la Ruta 2 no la necesitas — tus Script Properties siguen
   en su sitio.
5. Menú **🏭 Acopio → 🔧 Advanced → 🩺 Check this installation**. Tiene que
   salir sin faltantes, y de paso reinstala los dos disparadores que apagaste
   en el Paso 0.
6. **Settings → System → 🔧 Rebuild Stock Totals Now.**
7. Verificación (la lista de la Parte D).
8. Borra las `_ROTA`.

---

### RUTA 3 — Levantar el sistema desde cero *(una o dos horas)*

Solo cuando el archivo ya no existe. Es la única ruta que genera una URL
nueva, y por eso es la única que interrumpe al equipo del cliente.

1. Paso 0 completo. Trabajas sobre **la copia** del backup, renombrada con el
   nombre real del sistema del cliente.

2. **Vuelve a poner las Script Properties.** Están dentro de la copia, en la
   pestaña **`ACOPIO_CONFIG_SNAPSHOT`** — al final de la lista de pestañas, y
   con muchas pestañas es fácil pasarla por alto. La escribe el sistema solo;
   no hay nada que copiar a mano de antemano.

   Abre la copia → **Extensiones → Apps Script** → ⚙️ **Project Settings** →
   **Script Properties**, y crea las del cuadro de la Parte D con los valores
   de esa pestaña.

   **`FOLDER_PREFIX` primero.** Si no se pone, los adjuntos no abren y el
   síntoma no dice por qué.

   > La app te dice si esa pestaña está: **Settings → System**, debajo de
   > "Last backup", aparece *"✓ Includes your settings — N saved in the
   > ACOPIO_CONFIG_SNAPSHOT tab"*. **Si no aparece, o aparece en naranja**, la
   > copia tiene tus datos pero no tu configuración. Antes de v11.13 ese fallo
   > era invisible.

   Si perdiste valores, hay dos ayudas que ya existen:
   - **`FOLDER_PREFIX` se deduce**: las carpetas del Drive del cliente se
     llaman `<prefijo>_Docs`, así que el nombre de la carpeta te lo dice.
   - **🏭 Acopio → 🔧 Advanced → 🩺 Check this installation** repara
     `SESSION_SECRET`, deduce `OAUTH_REDIRECT_URI` desde `WEB_APP_URL`, marca
     `SETUP_COMPLETE` si ya hay un admin, y te dice qué falta.

3. **Publica.** **Deploy → New deployment** → Web app →
   **Execute as: Me** · **Who has access: Anyone with a Google account**.

4. **Registra la URL nueva.** Es obligatoriamente nueva: es otro proyecto de
   script. Por lo tanto:
   - Ponla en `WEB_APP_URL`.
   - Añádela a **Authorized redirect URIs** del cliente OAuth y ponla en
     `OAUTH_REDIRECT_URI`. Si no, la gente de fuera del dominio no entra
     (ver `ACCESO-Y-LOGIN.md`).
   - Dásela al equipo del cliente. Sus marcadores viejos ya no sirven.

5. **Vuelve a poner a mano lo que el snapshot no trae** (Parte D):
   `OAUTH_CLIENT_SECRET` y `GEMINI_API_KEY`. Los otros dos se recrean solos.

6. **Settings → System → 🔧 Rebuild Stock Totals Now.**

7. Verificación completa (Parte D).

8. **Vuelve a encender el backup: 🏭 Acopio → 🗄 Backup Now / Enable Daily
   Backup.** Los triggers pertenecen al proyecto de script, así que la copia
   nueva no tiene ninguno. Sin este paso el sistema restaurado **no se está
   respaldando**, y nadie lo nota hasta la próxima emergencia.

---

## PARTE D — Lo que el backup no trae, y cómo verificar

### Verificación — no digas que terminó sin esto

En las tres rutas:

- [ ] El conteo de movimientos cuadra con lo que esperabas
- [ ] El stock de tres materiales que conozcas de memoria cuadra
- [ ] **🔧 Rebuild Stock Totals Now corrido** después de tocar el archivo
- [ ] Los dos disparadores nocturnos de vuelta: **⏰ Disparadores** del editor
      lista `dailyBackupTrigger` y `archiveOldMovementsTrigger`

Solo en las Rutas 2 y 3:

- [ ] `🩺 Check this installation` sin faltantes
- [ ] **Abre un movimiento viejo con foto o PDF adjunto.** Esta es LA prueba de
      que `FOLDER_PREFIX` quedó bien, y la que más se olvida
- [ ] Entra un usuario del dominio
- [ ] Entra un usuario de fuera del dominio, si los hay
- [ ] Las alertas de stock mínimo siguen puestas (⚙ Stock Alerts)

Solo en la Ruta 3:

- [ ] La URL nueva está en `WEB_APP_URL` **y** en Authorized redirect URIs
- [ ] El equipo del cliente tiene la URL nueva

---

### El hallazgo que hay que conocer antes de necesitarlo

**El backup es una copia del Google Sheet. Las Script Properties NO viven en
el Sheet — viven en el proyecto de Apps Script.** Cuando Google copia una hoja
con un script adjunto, crea un proyecto de script NUEVO, y ese proyecto nace
con las Script Properties **vacías**.

Consecuencia: los DATOS se restauran completos, la CONFIGURACIÓN no. Y por eso
la Ruta 1 y la Ruta 2 son tan preferibles: en ellas el proyecto de script no
cambia, así que esto no te afecta.

#### Lo que SÍ vuelve (está dentro de la hoja)

- Todos los movimientos (`MASTER_ARCHIVE_V3`) y el historial archivado
- La lista de usuarios y sus roles (`USERS_V3`)
- Categorías, proyectos, proveedores, ubicaciones, unidades, mínimos y costos
  promedio (`CONFIG`)
- Las hojas derivadas de stock, el log de auditoría y el de errores

#### Lo que NO vuelve (vive en Script Properties)

Ordenado por lo que más duele:

| Propiedad | Qué pasa si falta |
|---|---|
| `FOLDER_PREFIX` | **LO PEOR: toda foto y documento adjunto deja de abrir.** La app busca en una carpeta que no es donde están. |
| `FOLDER_PREFIX_HISTORY` | Igual, para adjuntos anteriores a un cambio de nombre de empresa. |
| `COMPANY_DOMAIN` | El personal de la empresa deja de reconocerse solo; a todos les pide "Sign in with Google". |
| `WEB_APP_URL` | La app no sabe su propia dirección. |
| `OAUTH_CLIENT_ID` / `_SECRET` | La gente de fuera del dominio no puede entrar. |
| `SETUP_COMPLETE` | La app se cree recién instalada y ofrece correr el asistente otra vez. |
| `WMS_MONITORED_MATERIALS` | Se pierden todas las alertas de stock mínimo. |
| `COMPANY_NAME`, `COMPANY_LOGO_ID` | La app dice "Warehouse" y sin logo. |
| `COLUMN_PREFS` | Los encabezados renombrados vuelven a sus nombres por defecto. |
| `ROLE_PERMS_WAREHOUSE`, `WAREHOUSE_ROLE_LABEL` | Los permisos extra y el nombre del rol vuelven al default. |
| `GEMINI_API_KEY` | El lector de documentos con IA deja de funcionar. |
| `SESSION_SECRET` | Se recrea solo. Todos vuelven a iniciar sesión una vez. |
| `SUPPORT_EMAIL` | Los reportes solo van al admin del cliente, no a nosotros. |

#### Qué lleva el snapshot y qué no

Construido en v9.97 (`writeConfigSnapshot_`, guardado por
`tools/test-config-snapshot.js`), **arreglado de verdad en v11.14**. La
pestaña se escribe en la hoja VIVA justo antes de copiar, para que la copia la
herede, y solo dentro de la copia de backup.

**Incluye** todo lo que es del cliente y duele perder: `FOLDER_PREFIX` y
`FOLDER_PREFIX_HISTORY`, `COMPANY_*`, `WMS_MONITORED_MATERIALS`,
`COLUMN_PREFS`, `ROLE_PERMS_WAREHOUSE`, `WAREHOUSE_ROLE_LABEL`, `WEB_APP_URL`,
`ARCHIVE_CUTOFF`, `OAUTH_CLIENT_ID`.

**Excluye cuatro, y cada una por su razón:**

| Propiedad | Por qué no |
|---|---|
| `OAUTH_CLIENT_SECRET` | **No es del cliente, es de Jose, y es el mismo para todos.** Ponerlo en un archivo del Drive de cada cliente lo expone a mucha más gente. Se vuelve a poner a mano. |
| `GEMINI_API_KEY` | Es una llave de pago del cliente. Que la vuelva a pegar él, deliberadamente. |
| `SESSION_SECRET` | Se recrea solo. Copiarlo solo alarga su vida sin ganar nada. |
| `WMS_SESSIONS` | Efímero, no significa nada al día siguiente. |

La pestaña lleva una nota arriba diciendo cuáles cuatro faltan y por qué, para
que quien restaure no crea que están todos.

---

### ⚠️ Backups anteriores a v11.14: no tienen la configuración

El simulacro de Jose (v11.13) destapó que `writeConfigSnapshot_` **nunca
funcionó en producción**. Llamaba a `SpreadsheetApp.openById` sobre la copia
terminada, y el manifiesto declara `spreadsheets.currentonly`, que da acceso a
la hoja contenedora **y a ninguna otra**. El error se tragaba en un
`Logger.log` que nadie lee, así que **desde v9.97 hasta v11.13 todos los
backups salieron con los datos y sin los ajustes**, y se veían perfectamente
sanos.

**Qué hacer:** no sirve de nada recuperarlos. Actualiza a v11.14 o posterior,
haz un **Backup Now**, y confirma en Settings → System que dice *"✓ Includes
your settings"*. Ese es tu primer backup restaurable. Los anteriores siguen
teniendo todos los movimientos — lo más difícil de reconstruir; lo que les
falta son las Script Properties, y esas se vuelven a poner con el cuadro de
arriba.

---

### ⚠️ Dónde NO debe guardarse la copia de la configuración

En una conversación se sugirió que Jose guardara una copia de las Script
Properties de cada cliente en su propio archivo de soporte. **Eso está mal y
queda descartado.** Contradice de frente la promesa central del producto —
"tus datos no salen de tu Drive, nosotros no recibimos nada" — y además
metería el `OAUTH_CLIENT_SECRET`, que es de Jose y es compartido entre todos
los clientes, en un archivo suelto.

**La copia vive en el Drive del propio cliente**, dentro de cada backup, y
nunca sale de ahí. Es la respuesta correcta a "¿cómo guardamos esto si no
debemos tener acceso a los datos del cliente?": no lo guardamos nosotros — lo
guarda él, en su propio archivo, automáticamente. Es más honesto Y más
robusto.

---

## PARTE E — El vídeo (Ruta 3, que es la que Jose va a grabar)

"Desde cero" es la Ruta 3, y es la que hay que grabar porque es la única que
nadie ha hecho entera. Pero grábala **como simulacro**, sobre una copia de
prueba, nunca sobre el archivo de OX.

**Grábalo en dos vídeos, no en uno.** El largo es el que te salva; el corto es
el que la gente ve de verdad.

### Vídeo A — "Faltan datos" *(2–3 minutos, Ruta 1)*

Es el caso que va a pasar de verdad, y es el que tranquiliza. Lo que tiene que
verse, en este orden:

1. La app con los movimientos vacíos, y **el aviso 🚨 que la propia app da**
   cuando el archivo está vacío pero hay stock (v12.14). Diez segundos.
2. Settings → System → **All backups in Drive**, y el dedo eligiendo el
   backup **anterior** al daño. Aquí hace falta decir en voz alta por qué no se
   elige el más reciente.
3. Clic derecho → Hacer una copia.
4. Copiar la pestaña a la hoja viva, renombrar la rota a `_ROTA`, renombrar la
   nueva al nombre exacto.
5. **🔧 Rebuild Stock Totals Now**, y la app recargada con los datos de vuelta.
6. Final: el reloj. "Esto fueron seis minutos y nadie se quedó sin entrar."

### Vídeo B — "El archivo ya no está" *(10–15 minutos, Ruta 3)*

Sin prisa y sin cortes en los dos sitios donde la gente se pierde:

- **La pestaña `ACOPIO_CONFIG_SNAPSHOT`.** Enséñala en pantalla, al final de la
  lista, y lee en voz alta la nota de arriba que dice qué cuatro propiedades NO
  están y por qué. Es el minuto que evita la llamada de soporte.
- **Pegar las Script Properties una por una**, con `FOLDER_PREFIX` primero, y
  diciendo por qué es la primera.
- **Deploy → New deployment** y, en cuanto salga la URL nueva, ir a registrarla
  en los dos sitios (`WEB_APP_URL` y Authorized redirect URIs) **sin cortar**.
  Dejarlo para después es el error que se comete en la vida real.
- El cierre no es "ya carga". El cierre es **abrir un movimiento viejo con foto
  adjunta y que la foto abra**. Esa es la prueba de que `FOLDER_PREFIX` quedó
  bien, y es la que más se olvida.

**Mientras grabas, apunta cada vez que dudes.** Cada duda es una línea que falta
en este documento, y este documento existe porque el 26 de septiembre la Ruta 1
no estaba escrita.

---

## PARTE F — Estado del simulacro

| Ruta | ¿Ejecutada de principio a fin? |
|---|---|
| Ruta 1 | **Sí, en producción**, 26/09/2026, en OX Glass. Cero movimientos perdidos. |
| Ruta 2 | No. |
| Ruta 3 | Pasos 0 y 1 confirmados en producción (v11.13); el resto no, y el Paso 2 destapó dos problemas reales la primera vez que se intentó. |

**Ejecutar la Ruta 3 completa, en una copia de prueba, sigue siendo la tarea
pendiente más importante antes de vender.**
