# Restaurar un backup — procedimiento, y lo que el backup NO trae

> **Estado (v11.13): Jose está ejecutando el simulacro por primera vez.**
> Pasos 0 y 1 confirmados en producción — el backup se crea y aparece en la
> carpeta. El Paso 2 ya destapó un problema real: la pestaña del snapshot no
> se llamaba como decían estas instrucciones, y si su escritura fallaba nadie
> se enteraba. Ambas cosas corregidas. El resto del procedimiento sigue sin
> ejecutarse de principio a fin.
> Hacerlo una vez, en una copia de prueba, es la tarea pendiente más
> importante antes de vender. Un backup que nunca se restauró no es un
> backup; es un archivo.

---

## El hallazgo que hay que conocer antes de necesitarlo

**El backup es una copia del Google Sheet. Las Script Properties NO viven en
el Sheet — viven en el proyecto de Apps Script.** Cuando Google copia una
hoja con un script adjunto, crea un proyecto de script NUEVO, y ese proyecto
nace con las Script Properties **vacías**.

Consecuencia: los DATOS se restauran completos, la CONFIGURACIÓN no.

### Lo que SÍ vuelve (está dentro de la hoja)

- Todos los movimientos (`MASTER_ARCHIVE_V3`) y el historial archivado
- La lista de usuarios y sus roles (`USERS_V3`)
- Categorías, proyectos, proveedores, ubicaciones, unidades, mínimos y
  costos promedio (`CONFIG`)
- Las hojas derivadas de stock, el log de auditoría y el de errores

### Lo que NO vuelve (vive en Script Properties)

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

### ⚠️ Corrección — dónde NO debe guardarse esta copia

En una conversación se sugirió que Jose guardara una copia de las Script
Properties de cada cliente en su propio archivo de soporte. **Eso está mal y
queda descartado.** Contradice de frente la promesa central del producto —
"tus datos no salen de tu Drive, nosotros no recibimos nada" — y además
metería el `OAUTH_CLIENT_SECRET`, que es de Jose y es compartido entre todos
los clientes, en un archivo suelto.

**La copia tiene que vivir en el Drive del propio cliente.** Ver la mejora
propuesta al final de este documento: la instantánea se escribe dentro de cada
backup, en el Drive del cliente, y nunca sale de ahí.

Mientras eso no esté construido, la recuperación se hace con las ayudas que ya
existen en el código (Paso 2), no guardando datos de clientes por fuera.

---

## Procedimiento de restauración

### Paso 0 — Antes de tocar nada

1. **No borres el archivo dañado.** Renómbralo (`… — ROTO 2026-08-21`). Si la
   restauración sale mal, es lo único que queda.
2. Anota qué se perdió y desde cuándo. Determina **qué backup** necesitas: en
   la app, **Settings → System → All backups in Drive**, o directo en la
   carpeta `<prefijo>_Backups` del Drive del cliente.
3. **Saca las Script Properties del archivo dañado si todavía abre**: editor
   de Apps Script → ⚙️ Project Settings → Script Properties. Cópialas a un
   lado. Esto es lo que te va a ahorrar el 80% del trabajo.

### Paso 1 — Hacer una copia del backup

**No trabajes sobre el archivo de backup.** Es tu único ejemplar bueno.

En Drive: clic derecho sobre el backup → **Hacer una copia**. Renómbrala con
el nombre real del sistema del cliente.

### Paso 2 — Volver a poner las Script Properties

**La pestaña se llama `ACOPIO_CONFIG_SNAPSHOT`.** No se llama "snapshot" ni
"configuración": está al final de la lista de pestañas de la copia, y con
muchas pestañas es fácil pasarla por alto. La escribe **el sistema solo**,
dentro de cada backup — no hay nada que copiar a mano de antemano.

> Jose la buscó por el nombre equivocado durante el primer simulacro de
> restauración (v11.13), porque las instrucciones decían "la pestaña del
> snapshot" sin dar el nombre. Ahora la app también lo dice: en
> **Settings → System**, debajo de "Last backup", aparece
> *"✓ Includes your settings — N saved in the ACOPIO_CONFIG_SNAPSHOT tab"*.

**Si esa línea NO aparece, o aparece en naranja**, la copia tiene tus datos
pero no tu configuración, y hay que reconstruirla a mano con las ayudas del
final de este paso. Antes de v11.13 ese fallo era invisible.

Abre la copia → **Extensiones → Apps Script** → ⚙️ **Project Settings** →
**Script Properties**, y vuelve a crear las del cuadro de arriba con los
valores de esa pestaña.

**El orden importa: `FOLDER_PREFIX` primero.** Si no se pone, los adjuntos no
abren y el síntoma no dice por qué.

Si perdiste los valores, hay dos ayudas que ya existen en el código:
- **`FOLDER_PREFIX` se puede deducir**: las carpetas del Drive del cliente se
  llaman `<prefijo>_Docs`, así que el nombre de la carpeta te dice el
  prefijo.
- Menú **🏭 Acopio → 🔧 Advanced → 🩺 Check this installation**: repara solo
  `SESSION_SECRET`, deduce `OAUTH_REDIRECT_URI` desde `WEB_APP_URL`, y marca
  `SETUP_COMPLETE` si ya hay un admin en la lista. Y te dice qué falta.

### Paso 3 — Volver a publicar

**Deploy → New deployment** → Web app → **Execute as: Me** · **Who has
access: Anyone with a Google account**.

Esto genera una **URL nueva**, obligatoriamente: es un proyecto de script
distinto. Por lo tanto:
- Hay que darle la URL nueva al equipo del cliente.
- Hay que **registrar la URL nueva** en Authorized redirect URIs del cliente
  OAuth, y ponerla en `OAUTH_REDIRECT_URI`. Si no, la gente de fuera del
  dominio no entra (ver `ACCESO-Y-LOGIN.md`).

### Paso 4 — Verificar antes de decir que terminó

- [ ] `🩺 Check this installation` sin faltantes
- [ ] El stock de la pantalla principal cuadra con lo que el cliente espera
- [ ] **Abre un movimiento viejo que tenga foto o PDF adjunto y compruébalo.**
      Esta es LA prueba de que `FOLDER_PREFIX` quedó bien, y la que más se
      olvida
- [ ] Entra un usuario del dominio
- [ ] Entra un usuario de fuera del dominio, si los hay
- [ ] Las alertas de stock mínimo siguen configuradas (⚙ Stock Alerts)
- [ ] Vuelve a encender el backup nocturno — **el trigger no se copia**

### Paso 5 — Volver a encender el backup

**🏭 Acopio → 🗄 Backup Now / Enable Daily Backup.** Los triggers pertenecen
al proyecto de script, así que la copia nueva no tiene ninguno: sin este
paso, el sistema restaurado **no se está respaldando** y nadie lo nota hasta
la próxima emergencia.

---

## ✅ CONSTRUIDO EN v9.97 — el backup se lleva la configuración consigo

> **Este documento decía "sin construir". Ya no lo está**, y eso cambia el
> Paso 2: en cualquier backup hecho con v9.97 o posterior, la configuración
> está DENTRO de la copia, en una pestaña llamada
> `ACOPIO_CONFIG_SNAPSHOT`. El Paso 2 pasa de "reconstruir adivinando" a
> "copiar de esa pestaña".
>
> Los backups hechos ANTES de v9.97 no la tienen. Para esos, sigue valiendo
> el Paso 2 tal como está escrito arriba.
>
> Implementado como `writeConfigSnapshot_`, guardado por
> `tools/test-config-snapshot.js`. La pestaña solo se escribe dentro de la
> COPIA, nunca en el archivo vivo.

**La idea, que sigue siendo la correcta:** que el backup se lleve la
configuración consigo, dentro del Drive del cliente. Es la respuesta correcta a "¿cómo guardamos esto si no debemos
tener acceso a los datos del cliente?": no lo guardamos nosotros — lo guarda
él, en su propio archivo, automáticamente.

**Cómo:** `runBackupNow_` escribe una pestaña extra en **la copia de backup**
(nunca en el archivo vivo) con una fila por Script Property. El Paso 2 pasa de
"reconstruir adivinando" a "copiar de esta pestaña".

**Qué se incluye:** todo lo que es del cliente y es doloroso perder —
`FOLDER_PREFIX` y `FOLDER_PREFIX_HISTORY` (los adjuntos), `COMPANY_*`,
`WMS_MONITORED_MATERIALS`, `COLUMN_PREFS`, `ROLE_PERMS_WAREHOUSE`,
`WAREHOUSE_ROLE_LABEL`, `WEB_APP_URL`, `ARCHIVE_CUTOFF`, `OAUTH_CLIENT_ID`.

**Qué se excluye, y por qué cada uno:**

| Propiedad | Por qué no |
|---|---|
| `OAUTH_CLIENT_SECRET` | **No es del cliente, es de Jose, y es el mismo para todos.** Ponerlo en un archivo del Drive de cada cliente lo expone a mucha más gente. Se vuelve a poner a mano. |
| `GEMINI_API_KEY` | Es una llave de pago del cliente. Que la vuelva a pegar él, deliberadamente. |
| `SESSION_SECRET` | Se recrea solo. Copiarlo solo alarga su vida sin ganar nada. |
| `WMS_SESSIONS` | Efímero, no significa nada al día siguiente. |

La pestaña lleva una nota arriba diciendo cuáles cuatro faltan y por qué, para
que quien restaure no crea que están todos.

**Efecto secundario que vale la pena:** el cliente termina con su propia
configuración respaldada todas las noches, en su Drive, sin que nosotros
tengamos nada. Es más honesto Y más robusto que la alternativa que se había
sugerido.
