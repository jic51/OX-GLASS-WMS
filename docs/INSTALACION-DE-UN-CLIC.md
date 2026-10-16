# La instalación de un clic — qué falta de verdad

Jose, 2026-10-16: *"investiga la instalación, creo que sé la respuesta porque ya
habíamos hablado de eso, pero actualmente yo puedo hacer el push and run con un
clic, tal vez sí se pueda."*

Investigado contra el código y la documentación que ya existe, no de memoria.

---

## 1. La copia YA es de un clic, y el script viaja con ella

Está en `CUSTOMER-SETUP.md` desde hace tiempo, paso 1:

> Abre el enlace que te mandaron. Termina en `/copy`. Google pregunta dónde
> guardarlo. Pulsa **Make a copy**.
>
> Verás un aviso de que «las funciones y el archivo de Apps Script también se
> copiarán». Ése es el sistema — tiene que venir.

**Eso ya resuelve la mitad del problema que creíamos tener.** Un script atado a
una hoja (*container-bound*) se copia con ella. No hay que pegar nada.

## 2. Lo que NO es de un clic son los pasos 3 y 4

El mismo documento, y aquí está toda la fricción:

| Paso | Qué pide | Cuánto duele |
|---|---|---|
| 1 · Copiar | Un clic | nada |
| 2 · Asistente | Se abre solo | nada |
| **3 · Publicar** | **Desplegar como app web** | **mucho** |
| **4 · Pegar la dirección** | Copiar el `/exec` y pegarlo | **mucho, y se olvida** |

El paso 4 tiene incluso su propia advertencia en el documento porque **la gente
se lo salta**: *"cuando Google te enseñe la Web app URL, cópiala ANTES de cerrar
ese cuadro"*.

Y por el camino, la pantalla de **«Google hasn't verified this app»**, que el
documento tiene que dedicar una sección entera a explicar que es normal.

## 3. La pantalla que asusta tiene UNA causa, y ya la conocíamos

`appsscript.json` declara **once permisos**. Uno de ellos,
`https://www.googleapis.com/auth/drive`, es **restringido** — y
`FINDING-drive-file-scope.md` cuenta que ya intentamos escapar de él y no se
pudo: `DriveApp.createFolder()` exige `drive` completo aunque la carpeta que
crea sea suya. El intento está probado y revertido.

Mientras la app suba documentos, ese permiso se queda, y con él la pantalla.

## 4. Y AQUÍ ESTÁ LO BUENO: lo que Jose quiere quitar es exactamente lo que trae los permisos malos

| Lo que se quita de la versión gratis | Permiso que se va |
|---|---|
| Subir fotos y PDF | **`drive`** ← el restringido, el de la pantalla |
| | `documents` |
| Detección de usuarios | `userinfo.email`, `userinfo.profile` |
| Informes y avisos por correo | `script.send_mail` |
| Lector de correos (Gemini) | `script.external_request` |
| Respaldo nocturno | `script.scriptapp` |
| Auto-reparación de la dirección | `script.deployments`, `script.projects` |
| QR y etiquetas | *(ninguno — se dibujan en el navegador)* |
| Reservas | *(ninguno)* |

**Quedan dos:**

- `spreadsheets.currentonly` — sólo la hoja a la que está atado. No es sensible.
- `script.container.ui` — para enseñar la ventana dentro de la hoja.

De once a dos, y **ninguno restringido**. No es una coincidencia afortunada: las
funciones que piden permisos fuertes son precisamente las que un inventario
básico no necesita.

## 5. Sin app web no hay paso 3 ni paso 4

Si la versión gratis **no se despliega** y vive como ventana dentro de la propia
hoja (`showModalDialog`), desaparecen los dos pasos caros: no hay despliegue, no
hay `/exec` que copiar, no hay dirección que pegar.

La instalación entera queda:

1. Clic en el enlace `/copy` → **Make a copy**
2. Se abre la hoja; hay un menú
3. Clic en el menú → autorizar una vez → la app se abre

## 6. Pero hay un muro que YA nos costó caro una vez

Está escrito en `Code_v3_fixed.gs`, en `onOpen`, y conviene leerlo antes de
diseñar nada encima:

> `onOpen` es un disparador **SIMPLE**. Los disparadores simples corren **sin
> autorización** y tienen prohibido cualquier servicio que la necesite — lo que
> incluye `showModalDialog` y `Session.getActiveUser()`. **Autorizar la copia no
> lo cambia: un disparador simple siempre corre restringido.**

Un cliente vio por eso un cuadro gris de excepción como primera pantalla del
producto. Por eso hoy existe la pestaña **«👉 START HERE»**: una hoja visible no
necesita ningún permiso.

**Qué significa para la versión gratis:** el menú sí se puede poner solo
(`createMenu` funciona sin autorización). La ventana NO se puede abrir sola.
Tiene que haber un clic del usuario en el menú. **Un clic más, no un muro** —
pero hay que diseñarlo así desde el principio y no descubrirlo después.

---

## Lo que NO se pudo confirmar, y hay que medir

Dos cosas. Las dos se resuelven en media hora con una hoja de pruebas, y
ninguna se puede dar por buena sin hacerlo:

**1. ¿Esos dos permisos evitan de verdad la pantalla de «app sin verificar»?**
La documentación de Google dice que la pantalla sale con permisos *sensibles o
restringidos*, pero **Google no publica una lista definitiva de cuáles son
sensibles**. Varias fuentes de terceros coinciden en que los `currentonly` no la
disparan. Coinciden, pero no son Google.

*Cómo se comprueba:* una hoja nueva, un script atado con sólo esos dos permisos,
compartirla, copiarla desde otra cuenta y mirar qué pantalla sale. Es la
diferencia entre «instalación de un clic» y «instalación de un clic con un susto
en medio», y de eso depende todo el plan.

**2. ¿De qué tamaño puede ser la ventana?**
No hay ningún tope documentado. `HtmlOutput` acepta `setWidth`/`setHeight` y
desde dentro se puede redimensionar con `google.script.host.setWidth`. Lo que no
se sabe es cuánto deja Sheets en la práctica. Una barra lateral son ~300 px y eso
sí sería demasiado estrecho para esta app.

---

## Y una corrección sobre el «push and run con un clic»

Eso es `clasp`, y es **Jose desplegando en los proyectos de Jose**. No se
traslada a un desconocido: hace falta Node, instalar la herramienta, iniciar
sesión, y activar la API de Apps Script en los ajustes de la cuenta. Es un clic
*para quien ya montó las cuatro cosas de antes.*

Lo que sí se traslada es la copia con el script dentro, que es lo que ya hacemos.

## Las dos renuncias, dichas claras

**1. El cliente estaría DENTRO de la hoja.** Va contra la regla de Jose — *"el
cliente no debe ir al sheet nunca"*. Para la versión de pago se mantiene. Para la
gratis puede ser al revés: ver los datos ahí al lado es el argumento de venta
entero (*"están en TU Drive, yo no los veo"*), y además es un vídeo que se graba
solo.

**2. No hay dirección que compartir.** Sin app web no hay enlace que mandarle a
un compañero. Lo que parece una pérdida **encaja exactamente con el modelo**:
gratis para quien trabaja solo, Pro cuando hay equipo. El límite técnico y el
límite comercial son el mismo, y eso es raro y bueno: no hay que inventar una
restricción artificial ni vigilar que nadie se la salte.
