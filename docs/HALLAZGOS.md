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
viva en **un campo que el usuario no pueda tocar**, no en el comentario. Ver la
discusión del 27/10 en `BACKLOG.md`.
