# Seguridad — lo que hay, lo que falta

Jose, 2026-10-05: *"corre un chequeo de la seguridad una vez más y enumera todas
las que tenemos y las que nos hacen falta corregir."*

Revisado contra el código, no de memoria. Fecha del repaso: **2026-10-05, v12.38**; al día siguiente se cerraron 2.1 y 2.2-bis (v12.40 y v12.41).

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

### 2.1 ✅ CORREGIDO (v12.40) — nadie vigilaba los intentos fallidos

Lo que decía aquí: *"un rechazo de `requireAuth_` no deja rastro en ninguna
parte. Sin eso, un intento de entrar a la fuerza es indistinguible de un día
tranquilo."* Era cierto y ya no lo es.

`registrarAccesoDenegado_` escribe una línea `ACCESS_DENIED` en AUDIT_LOG por
cada rechazo de puerta —sin sesión o no registrado— y manda **un** correo al
dueño al pasar de **10 rechazos en 10 minutos**. Tres topes, cada uno por un
motivo:

- **Una línea por persona y minuto.** Una pestaña olvidada reintenta sola cada
  veinte segundos; sin tope, un navegador en una mesa vacía entierra la línea
  que importaba bajo miles iguales.
- **El contador del aviso cuenta TODOS los intentos**, no sólo los escritos. La
  primera versión tenía el tope de escritura delante y el contador nunca pasaba
  de uno: **el correo no se habría mandado nunca**. Lo cazó la prueba antes de
  salir.
- **Un correo por hora y persona.** Un aviso por rechazo a partir del décimo
  convierte el buzón del dueño en el ruido del que huíamos — la lección del
  ERROR_LOG.

Y no se mezcla con los permisos: a un VIEWER al que se le niega **escribir** no
se le apunta aquí. Está dentro y le falta un permiso; meterlo en el registro de
rechazos esconde a los de fuera entre gente legítima.

Nunca lanza: corre dentro del camino que ya está rechazando a alguien, y el
rechazo es lo único que de verdad tiene que ocurrir.
`tools/test-acceso-denegado.js` lo ejecuta (21 comprobaciones).

### 2.2 ✅ CORREGIDO (v12.39) — y lo que yo dije aquí estaba MAL

**Lo que escribí en este documento el 2026-10-05 por la mañana:** *"un token
firmado vale 30 días y no hay forma de invalidarlo"*. **Es falso**, y lo
comprobé al ir a arreglarlo: cada llamada del navegador pasa por
`getUserRole`, que **lee USERS_V3 en el momento**. El token dice QUIÉN eres; la
hoja decide SI puedes pasar. Quitar a alguien le deja fuera en su siguiente
llamada, no en treinta días.

**Pero al comprobarlo apareció algo peor, y real.** `getUserRole` decía:

```javascript
if (uEmail === userEmail && isActive) return { ...rol... };
```

Si el correo estaba **pero desactivado**, el bucle seguía, salía por abajo y caía
en el apartado siguiente: **la lista vieja de CONFIG**. Y en CONFIG está todo el
mundo — es la lista de la que se migró. O sea que **en cualquier instalación
migrada, desmarcar a alguien en Manage Users no le quitaba el acceso**: la
pantalla decía "desactivado" y el servidor le dejaba entrar igual.

No era una puerta sin guardia. Era **una guardia que decía que sí**.

Y no se vio antes porque `test-endpoint-auth` comprueba que cada puerta TENGA
guardia — lo dice él mismo en su cierre: *"prueba que no falta ninguna guarda, no
que ninguna sea correcta"*. Ésta estaba y era equivocada.

Arreglado: si el correo aparece en USERS_V3, **esa fila decide** — activo → su
rol, desactivado → DENIED, sin mirar la lista vieja. `tools/test-revocar-acceso.js`
(10 comprobaciones) lo EJECUTA, incluido el caso de un token válido de alguien
ya expulsado. Mutación comprobada: quitada la línea, fallan tres.

**Lo que sigue faltando, y es más estrecho:** no hay forma de matar un token
**robado** de un usuario que sigue siendo legítimo. Para eso hace falta un botón
de *"cerrar todas las sesiones"* que rote `SESSION_SECRET`.

### 2.2-bis ✅ CORREGIDO (v12.41) — y era el MISMO agujero por el otro lado

Al arreglar lo de arriba quedó dicho que la lista vieja de CONFIG *"sigue dando
acceso"*, y se quedó ahí una semana. **Era el segundo goteo, y el peor de los
dos:** en la v12.39 la fila existía y decía "desactivado"; aquí **no hay fila
ninguna** y se entra igual. En la copia de Jose eran **diecinueve correos** que
Manage Users no lista y a los que, por tanto, **no se les podía quitar el
acceso desde la app**.

Arreglado sin borrar la lista vieja —esa gente trabaja— convirtiéndola en **un
camino de ida**: quien entra por ahí queda escrito en USERS_V3 en ese momento
(`adoptarUsuarioDeConfig_`), con su rol y activo, y desde entonces sale en
Manage Users con su interruptor. `revisarUsuarios_` hace lo mismo con las dos
listas enteras sin esperar a que nadie entre, y `menuCheckInstallation` lo
ejecuta y lo cuenta.

**La causa, dicha para la próxima vez:** dos listas que tienen que coincidir sin
que nada lo obligue. Es el cuarto caso de este patrón en el proyecto.

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
