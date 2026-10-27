# Análisis de seguridad de Acopio Pro — Parte 2: los datos y los permisos de Google

Sigue de `ANALISIS-SEGURIDAD.md`. **Parte 2 cubre** lo que la app puede leer de
Drive frente a lo que usa, quién puede abrir un documento adjunto, el camino de
los respaldos, y adónde sale la app a internet.

Mismo método que la Parte 1: leído y medido sobre el archivo, no un ataque a una
instalación viva. Donde no he podido comprobar algo, lo digo.

---

## RESUMEN

| | Qué | Gravedad |
|---|---|---|
| ✅ | **La app no habla con nadie que no sea Google.** Cero telemetría hacia nosotros | — |
| ✅ | Los secretos **se excluyen a propósito** del respaldo, y el motivo está escrito | — |
| ✅ | Un documento sólo se sirve si está dentro de la carpeta de la app, y queda registro del intento que no lo está | — |
| 🟠 | Esa exclusión es **una lista de nombres exactos**: el próximo secreto que se añada se copia solo | media |
| 🟠 | **Nuestro `OAUTH_CLIENT_SECRET` es el mismo en todas las instalaciones** y vive en el Drive de cada cliente | media |
| 🟠 | La frontera de la carpeta acepta **por NOMBRE**, no sólo por identificador | media |
| 🟠 | La limpieza de los ficheros ya compartidos existe, pero **hay que ir al Sheet a pulsarla** | media |
| 🟡 | Cualquier usuario con sesión, **sea cual sea su rol**, puede abrir cualquier fichero de la carpeta | baja |
| ⚪ | El permiso de Drive es el ancho, y **no es por descuido** — está medido y documentado | — |

---

## 1 · ✅ ADÓNDE SALE LA APP A INTERNET: SÓLO A GOOGLE

`script.external_request` permite llamar a cualquier dirección. Busqué **todas**
las salidas del archivo:

| Destino | Para qué |
|---|---|
| `oauth2.googleapis.com` | Cambiar el código de inicio de sesión por el correo verificado |
| `www.googleapis.com` | Drive (miniaturas a tamaño, subidas) |
| `generativelanguage.googleapis.com` | El lector de facturas, con la clave **del cliente** |
| `script.googleapis.com` | Comprobar el propio despliegue |
| `drive.google.com` / `docs.google.com` / `lh3.googleusercontent.com` | Enlaces que se enseñan, no llamadas |

**No hay una sola llamada a un servidor nuestro.** Eso significa, dicho como lo
diría un cliente: *la app no le cuenta a Jose lo que hago*. No hay telemetría,
ni «llamar a casa», ni comprobación de licencia contra un servidor. **Es una de
las cosas más fuertes que tiene este producto y hoy no se dice en ninguna
parte** — ni en la landing ni en los Términos.

---

## 2 · ✅ EL RESPALDO NO SE LLEVA LOS SECRETOS, Y ESTÁ RAZONADO

Antes de cada copia, la app vuelca las Script Properties en una pestaña
(`CONFIG_SNAPSHOT`) para que la copia las herede — porque una copia nace con las
Script Properties **vacías**, y sin `FOLDER_PREFIX` ningún documento vuelve a
abrirse.

Lo que **no** se vuelca, y por qué, ya estaba escrito en el código:

| Excluido | Motivo |
|---|---|
| `OAUTH_CLIENT_SECRET` | *"Es nuestro, no suyo, y es el mismo en todas las instalaciones"* |
| `GEMINI_API_KEY` | *"Una clave de pago suya — que la pegue él"* |
| `SESSION_SECRET` | Se regenera solo; copiarlo sólo alarga su vida |
| `WMS_SESSIONS` | Quién estaba dentro en ese momento |

**Esto está bien hecho.** La copia va a una carpeta de Drive donde puede
acabar más gente que la que puede leer la configuración del script, y la
diferencia está vista.

---

## 3 · 🟠 H-10 · Pero la exclusión es **una lista de nombres exactos**

**Dónde:** `Code_v3_fixed.gs` ~6828, `SNAPSHOT_EXCLUDE`, y ~6917:

```js
Object.keys(props).sort().forEach(function (k) {
  if (SNAPSHOT_EXCLUDE[k]) return;
  rows.push([k, String(props[k]), noteFor(k)]);   // todo lo demás se copia
});
```

**Lo que pasa.** Por defecto **se copia todo**, y sólo se salvan los cuatro
nombres de la lista. El día que se añada una propiedad nueva que lleve un
secreto —una clave de Stripe, un secreto de webhook, una contraseña de correo—
**aparece en la hoja y en cada copia de respaldo sin que nadie haga nada mal**.

**Por qué hay que arreglarlo, exactamente.** Es *dos cosas que tienen que
coincidir sin que nada lo obligue*, otra vez, y aquí el fallo es silencioso y
retroactivo: cuando alguien se dé cuenta, el secreto ya está en treinta copias
repartidas por el Drive del cliente, y borrarlo de la lista **no limpia las que
ya se hicieron**.

**Lo que yo haría, y es pequeño:** además de la lista, un patrón sobre el nombre
—`/SECRET|KEY|TOKEN|PASSWORD|PRIVATE/i`— que excluya por defecto y obligue a
añadir a mano lo que sí deba copiarse. Así el descuido falla hacia el lado
seguro: una propiedad inocente que se llame `API_KEY_LABEL` se queda fuera del
respaldo, que no rompe nada, en vez de un secreto quedándose dentro.

---

## 4 · 🟠 H-11 · Nuestro secreto de OAuth es el mismo en todas las instalaciones, y vive en el Drive del cliente

**Dónde:** `OAUTH_CLIENT_SECRET` en las Script Properties de **cada copia**, y
el propio código lo dice: *"es nuestro, no suyo, **y es el mismo en todas las
instalaciones**"*.

**Qué significa, sin dramatizar.** El administrador de cualquier cliente puede
abrir sus Script Properties y leerlo — es su proyecto. **No es una fuga: es el
diseño.** Y la prueba de que es fácil de leer es que Jose lo pegó en un chat sin
esfuerzo.

**Por qué importa igual, y son dos cosas distintas:**

1. **Con el identificador y el secreto se puede montar una pantalla de
   consentimiento que diga «Acopio»** y pedirle permisos a quien sea. No da
   acceso a los datos de otro cliente, pero sí permite engañar en nuestro
   nombre.
2. **Rotarlo los rompe a todos a la vez.** Hoy no hay forma de cambiar ese
   secreto para un cliente; cuando haya que cambiarlo, hay que tocar todas las
   instalaciones el mismo día.

**Lo que yo haría, y hay decisión dentro:** a partir de cierto número de
clientes, **un cliente OAuth por instalación** —el administrador crea el suyo en
su propio proyecto de Google— que es además lo coherente con *"tus datos en tu
cuenta"*. El coste es un paso más en la instalación, y es un paso feo. La
alternativa barata es dejarlo y **escribir aquí que es una decisión, no un
olvido** — que es lo que esta sección hace.

> **Nota del 26/10, de Jose, sobre rotar el que se pegó en el chat:** *"Lo haré
> después, por ahora no."* Sigue pendiente y es distinto de esto: aquello es un
> secreto concreto expuesto, esto es la forma del diseño.

---

## 5 · 🟠 H-12 · La frontera de la carpeta acepta por NOMBRE, no sólo por identificador

**Dónde:** `isFileWithinAppFolder_` (~1782).

```js
if (acceptedIds.indexOf(folder.getId()) !== -1) return true;
if (acceptedNames.indexOf(folder.getName()) !== -1) return true;   // ← ésta
```

**Primero lo bueno:** el identificador se comprueba antes, sube hasta ocho
niveles de carpetas padre, y un fichero de fuera se rechaza **y se registra**
con el correo de quien lo pidió. Eso está bien.

**El problema es la segunda línea**, y en particular que la lista de nombres
aceptados lleva **uno fijo escrito en el código**: `OX_WMS_v3_Docs`. Cualquier
carpeta del Drive del administrador que se llame así —incluida **una que alguien
le haya compartido**— convierte todo lo que hay debajo en servible por la app.

**Por qué importa justo ahora, y no antes.** Mientras había una instalación, no
podía chocar con nada. **El plan es tener muchos clientes**, y en ese mundo el
que tiene carpetas con ese nombre en su Drive es precisamente quien administra
más de una copia. Un revendedor —o Jose mismo, con la copia de un cliente en su
Drive— es el caso en que dos instalaciones comparten nombre de carpeta.

**Por qué el nombre está ahí, que es importante no romperlo:** las instalaciones
anteriores al asistente **no tienen identificador guardado**, y sin la línea del
nombre se quedan sin poder abrir ni un documento. Es una compatibilidad de
verdad, no una pereza.

**Lo que yo haría:** aceptar el nombre **sólo cuando no haya ningún
identificador guardado** para esa carpeta. Una instalación moderna deja de
depender del nombre; una vieja sigue funcionando igual que hoy.

---

## 6 · 🟠 H-13 · La limpieza de los ficheros ya compartidos existe — y hay que ir al Sheet a pulsarla

**Dónde:** `menuRevokePublicSharing` (~12418).

Hasta la v8.10, cada foto y cada documento se subía marcado **«cualquiera con el
enlace puede ver»**. Se quitó esa línea, pero eso **sólo cambia lo que se sube a
partir de entonces**: los ficheros que ya estaban en Drive siguen públicos. Para
ésos hay una función que recorre la carpeta y los vuelve privados, y está bien
hecha —se puede correr varias veces, respeta el límite de seis minutos y dice
cuántos revisó.

**El problema no es la función: es cómo se llega a ella.**

1. **Vive en el menú del Sheet**, y la regla de este producto es *el cliente no
   debe ir al sheet nunca*. Un cliente que sigue esa regla **nunca la va a
   pulsar**.
2. **Nada le dice que existe.** No hay tarjeta, ni aviso, ni una línea en
   «Comprobar esta instalación» que diga *"tienes 412 ficheros compartidos con
   enlace público"*.
3. Y es **exactamente la clase de fichero que no debería ser público**: facturas
   de proveedores con precios, albaranes con nombres de clientes.

**Lo que yo haría:** que **🩺 Check this installation** lo cuente y lo diga, y
que el botón para arreglarlo esté ahí, dentro de la app. La función ya está
escrita; lo único que falta es que alguien se entere.

---

## 7 · 🟡 H-14 · Un documento lo puede abrir cualquiera que tenga sesión, sea cual sea su rol

**Dónde:** `resolveOwnFile_` (~1694), por donde pasan `getPrivateFileData` y
`getPrivateFileThumbnail`.

Comprueba tres cosas, y están bien: que haya **sesión** (no vale un correo, hace
falta el token), una **cuota** por persona, y que el fichero esté **dentro de la
carpeta de la app**.

**Lo que NO comprueba es el rol, ni de quién es el movimiento.** La frontera es
**la carpeta, no la persona**: quien tenga sesión y un identificador de fichero
de dentro, lo abre.

**Gravedad baja, y conviene decir por qué** en vez de pintarlo peor: los
identificadores de Drive no se adivinan, y hoy todos los usuarios ven los mismos
movimientos, así que quien puede pedir el fichero ya podía ver su enlace.

**Por qué lo anoto igual.** Porque la frase anterior **es una propiedad de hoy,
no una garantía**: el día que haya permisos por proyecto o por bodega —que está
en la lista— el documento seguirá abriéndose para todos, y nadie se va a acordar
de esta función. Es el mismo patrón de siempre: *la seguridad de esto no está
aquí, está en que otra cosa siga siendo como es*.

---

## 8 · ⚪ EL PERMISO ANCHO DE DRIVE: ESTÁ MEDIDO, Y NO ES UN DESCUIDO

El manifiesto pide `drive` entero —*"ver, editar, crear y borrar **todos** tus
archivos de Drive"*— cuando la app sólo toca los que ella misma crea.

**Ya se intentó reducirlo y está documentado** en
`docs/FINDING-drive-file-scope.md`: con `drive.file` la app lee y escribe
movimientos bien, pero **`DriveApp.createFolder()` exige `drive` entero**, y con
él caen las fotos, los documentos, los adjuntos de llegadas, el PDF de varias
fotos y el respaldo diario. La exigencia está pegada al método de DriveApp, así
que no hay forma de esquivarla reordenando nuestro código.

**Lo anoto aquí para que la Parte 2 no parezca que no lo miró**, y con el precio
escrito: mientras sea un permiso restringido, publicar en el Marketplace de
Google exige **una auditoría CASA anual de entre 500 y 4.500 dólares**. La
salida existe —llamar a la API REST de Drive con `UrlFetchApp` en vez de
DriveApp— y es una reescritura de ocho funciones con prueba en vivo cada una. No
es para ahora; es para antes del Marketplace.

---

## LO QUE FALTA

**Parte 3 — el perímetro de la instalación:** el flujo de OAuth entero, el token
de sesión y su caducidad, qué pasa cuando se le quita el acceso a alguien que
tiene la pestaña abierta, y los registros — qué se guarda de cada persona y
durante cuánto.

**Parte 4 — lo que Google puede cambiar debajo:** cuotas, el límite de seis
minutos, y qué se rompe si cambian las reglas de las apps no verificadas.

**Y el análisis estructural**, que es la otra mitad del encargo.
