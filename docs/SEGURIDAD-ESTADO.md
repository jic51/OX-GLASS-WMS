# Seguridad — lo que hay, lo que falta

Jose, 2026-10-05: *"corre un chequeo de la seguridad una vez más y enumera todas
las que tenemos y las que nos hacen falta corregir."*

Revisado contra el código, no de memoria. Fecha del repaso: **2026-10-05, v12.38**.

---

## 1. LO QUE HAY, Y SE SOSTIENE

### 1.1 La puerta: ninguna función pública sin guardia

La app expone **19 funciones** al navegador. Apps Script hace públicas **todas**
las funciones de nivel superior, así que la lista no es una decisión de diseño:
es una consecuencia del lenguaje, y la única defensa por nombre es **el guion
bajo final** (`doThing_`, no `_doThing`).

Eso ya nos mordió: 66 ayudantes se llamaban `_nombre`, que no protege nada.
Entre ellos **`makeSessionToken_`, que fabrica una sesión de ADMIN para el correo
que se le pida** — una llamada desde la consola del navegador y adentro. Se
renombraron todos en la v8.21.

**Lo que lo sostiene hoy no es la regla escrita, es el contador:**
`tools/test-endpoint-auth.js` recorre el archivo, encuentra **toda** función
pública y falla si alguna no lleva guardia o no está en una lista con su motivo
escrito. Verde en el repaso de hoy.

### 1.2 Quién eres: sesión firmada, no confianza

- Token = `base64(correo|caducidad).base64(HMAC-SHA256)`, firmado con
  `SESSION_SECRET` (creado solo, una vez, por instalación). Sin el secreto no se
  puede fabricar ni modificar: cambiar el correo invalida la firma.
- Caduca a los **30 días**.
- `requireAuth_` mira **la sesión de la app**, no la de Google. Por eso toda
  entrada desde el menú de la hoja tiene que declararse con `setVerifiedAuth_` —
  y por eso el ensayo del archivado salió sin identidad y no arrancaba.
- `requireOwnerContext_` es más fuerte: exige que el usuario **efectivo** y el
  **activo** sean el mismo, que sólo ocurre cuando corre el dueño o un
  disparador. Protege publicar, borrar la papelera y los trabajos nocturnos.

### 1.3 Qué puedes hacer: permisos por instalación

Roles ADMIN / WAREHOUSE / VIEWER con permisos por rol (`rolePerms`), y **la regla
vive en el servidor**: el navegador decide qué OFRECE, el servidor decide qué
PERMITE. Los botones escondidos no son la defensa.

### 1.4 Contra inundaciones

`throttle_` + `requireQuota_` en los puntos caros, cada uno con su número:

| Puerta | Límite |
|---|---|
| `processMovement` (todas las escrituras) | 240 / 60 s |
| `getInitialData` | 180 / 300 s |
| Archivos privados | 600 / 300 s |
| `pollLogin` (antes de haber identidad) | 120 / 300 s |
| Latido | 60 / 300 s |
| Reportar un problema | 10 / 600 s |
| Leer un correo con IA | 20 / 600 s |

### 1.5 Documentos privados

Los adjuntos **no son públicos**. `getPrivateFileData` verifica la sesión y que
el archivo sea de los que la app creó, y lo devuelve en base64 por el mismo canal
que todo lo demás. Nunca hay una URL que se pueda pasar por ahí.

### 1.6 Contra la inyección en pantalla (XSS)

`_he()` escapa todo lo que llega a `innerHTML` en los avisos. **No era teórico:**
muchos mensajes del servidor devuelven, tal cual, lo que alguien escribió en un
nombre de material — *"INSUFFICIENT STOCK for &lt;nombre&gt;"*— y cualquier usuario
WAREHOUSE puede poner ese nombre. Era un XSS almacenado alcanzable por cualquiera.

### 1.7 Lo que no se manda a ninguna parte

El correo de check-in lleva **cuatro datos y nada más**, y la política de
privacidad lo dice con esas palabras. `test-checkin` **cuenta los campos**,
porque una vez el código mandaba cinco y el texto prometía cuatro.

### 1.8 El secreto de IA

`GEMINI_API_KEY` vive en las Script Properties de **la instalación del cliente**,
nunca en el código ni en nuestro lado. La llamada la hace el servidor, así que la
clave no baja al navegador.

---

## 2. LO QUE FALTA, POR ORDEN

### 2.1 🔴 Nadie vigila los intentos fallidos

No hay registro de *"a este correo se le rechazó la sesión quince veces en un
minuto"*. `pollLogin` tiene tope, pero un rechazo de `requireAuth_` no deja
rastro en ninguna parte. **Sin eso, un intento de entrar a la fuerza es
indistinguible de un día tranquilo.**

Lo que haría: una línea en AUDIT_LOG por rechazo, con el correo y la hora, y un
aviso al dueño a partir de N en una ventana corta.

### 2.2 🔴 La sesión no se puede revocar

Un token firmado vale **30 días** y no hay forma de invalidarlo. Si alguien se va
de la empresa y se le quita de USERS_V3, su token sigue siendo criptográficamente
válido hasta que caduque.

Lo que haría: que `requireAuth_` compruebe que el correo **sigue** en USERS_V3 en
cada llamada — es una lectura que ya se hace casi siempre— y un botón de
*"cerrar todas las sesiones"* que rote `SESSION_SECRET`.

### 2.3 🟠 Varias puertas sin tope

`getIncoming`, `addIncoming`, `updateIncoming`, `deleteIncoming`,
`getMonitoredMaterials` y `getSetupState` comprueban identidad pero **no tienen
límite de llamadas**. No permiten hacer nada indebido, pero sí **agotar la cuota
diaria de Apps Script de la instalación**, que deja la app muerta para todos
hasta el día siguiente. Es una denegación de servicio barata desde dentro.

### 2.4 🟠 `getSetupState` antes de que exista nadie

Es la única que corre **sin identidad**, por necesidad: hay que poder preguntar
"¿esto está configurado?" antes de que haya usuarios. Hay que revisar **qué
devuelve exactamente** cuando la instalación aún no está configurada, y que no
sea más de lo imprescindible.

### 2.5 🟡 El registro de errores puede llevar datos del cliente

`logError_` guarda el mensaje del error, y los mensajes se construyen a menudo
con lo que causó el fallo (*"cannot save SUNBRIDGE PHASE 1"*). Queda en una
pestaña del propio cliente, así que no sale de su casa — **pero el día que
mandemos errores a un panel nuestro, eso se convierte en una fuga.** Hay que
limpiarlo antes de que exista ese panel, no después.

### 2.6 🟡 No hay segundo factor ni caducidad corta

Treinta días sin volver a identificarse es cómodo y es mucho. Para un almacén
quizá está bien; **hay que decidirlo a propósito** y escribirlo, no heredarlo.

### 2.7 🟡 La integridad del código no se comprueba sola

El sello de build detecta que dos archivos no son del mismo juego, pero **nada
comprueba que el código no haya sido modificado** en la copia del cliente — y no
se puede: es su Drive y su script. Está razonado en
`docs/LICENCIA-E-INTEGRIDAD.md`; se deja dicho aquí para que no parezca un olvido.

---

## 3. LO QUE NO ES UN AGUJERO Y LO PARECE

- **El código es visible para el cliente.** Es su copia de Apps Script; no hay
  forma de esconderlo y no se intenta.
- **La hoja de cálculo es la base de datos.** Quien puede abrir la hoja ve los
  datos. Eso es Drive, no la app, y es lo mismo que cualquier hoja compartida.
- **El aviso de "app no verificada" al instalar.** Es la pantalla normal de
  Google para un proyecto sin verificar, no un fallo.
