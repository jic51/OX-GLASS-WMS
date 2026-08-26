# El ícono de la pestaña — qué pasó, y cómo se arregla

## Lo que pasó

En v9.84 se envió un cambio que decía poner el ícono de Acopio en la pestaña,
y el logo del cliente en cuanto subiera uno. **No funcionaba.** Jose usó dos
instalaciones reales durante semanas y las dos siguieron mostrando el ícono
genérico de Apps Script.

Peor: había un test (`tools/test-favicon.js`) que pasaba. Eso fue lo que lo
mantuvo escondido.

## Por qué no funcionaba

Lo mismo que ya nos había mordido con los PDFs y con las peticiones directas
de archivos: **el sandbox**.

Lo que `Index_v3_fixed.html` dibuja no es la página del navegador. Es un
**iframe** servido desde `googleusercontent.com`, metido dentro de una página
de Google. Y **la pestaña toma su ícono del documento de arriba** — el de
Google, no el nuestro. Cambiar el `<link rel="icon">` dentro del iframe no
llega a la pestaña, y nunca iba a llegar.

La prueba de que es exactamente eso: **el título de la pestaña SÍ funciona.**
Dice "OX Glass LLC. — Acopio". Y funciona porque se pone del lado del
servidor, con `.setTitle()` sobre el `HtmlOutput`, que sí toca la página de
afuera. El ícono nunca tuvo su equivalente.

## Por qué el test no lo detectó

`test-favicon.js` cargaba `Index` como documento de nivel superior
(`file://`), donde un `<link rel="icon">` sí manda sobre la pestaña —
condición que **nunca** se da en producción.

Y las etiquetas del test decían *"favicon becomes the company logo"* cuando
lo que en realidad había comprobado era *"el atributo href cambió"*.

**La lección, anotada en el encabezado del propio test para que no se repita:
un test que verifica el mecanismo demuestra el mecanismo, no el resultado.**

## Cómo se arregla (v9.98)

`doGet` ahora llama a `setFaviconUrl()` sobre el `HtmlOutput` — del lado del
servidor, sobre la página de afuera, igual que `setTitle`. Lee la URL de una
Script Property nueva, **`FAVICON_URL`**.

### La restricción que decide todo

**Google va a buscar esa imagen él mismo.** Por lo tanto la URL tiene que ser:

- `https://` — no vale `data:`
- **pública** — no vale un archivo privado del Drive del cliente

Eso es lo que hace que "el logo del cliente se vuelve su ícono
automáticamente" no sea gratis: el logo vive privado en su Drive, y para
usarlo de ícono habría que exponerlo públicamente.

### Qué se puede hacer hoy, y qué falta decidir

**Ya funciona, en cuanto exista una URL:** poner `FAVICON_URL` en las Script
Properties de una instalación y volver a desplegar. Sin URL, se queda como
está hoy — el ícono de Google — que es exactamente lo que todos ven ahora, así
que no empeora nada.

**Falta:** un lugar público donde vivir el ícono de Acopio. Lo natural es
`acopio.net/favicon.png` cuando exista la landing. Mientras tanto, un archivo
de Drive marcado como público también sirve.

**Decisión pendiente de Jose — el ícono por cliente.** Para que cada cliente
vea SU logo en la pestaña, ese logo tiene que ser públicamente accesible. Un
logo de empresa no es información sensible (normalmente está en su propia
página web), pero es una excepción a la regla de "todo archivo nace privado"
y no la voy a tomar solo. Tres caminos:

1. **Solo el ícono de Acopio, igual para todos.** Cero decisiones, cero
   exposición. Resuelve el problema real que reportó Jose (no ver el ícono de
   Apps Script) y se ve consistente para todos los clientes.
2. **Ícono por cliente, con permiso explícito.** En el asistente, junto a la
   subida del logo: *"¿Usar tu logo también como ícono de la pestaña? Para
   eso el archivo del logo queda accesible por enlace público."* El cliente
   decide, informado.
3. **Ícono por cliente pedido aparte.** Que suba a `FAVICON_URL` una URL que
   él ya tenga pública (casi todas las empresas tienen su logo en su web).
   Nada nuevo se hace público por nuestra cuenta.

Mi recomendación: **(1) ahora, (3) como opción para quien lo pida.** La (2)
convierte una configuración cosmética en una pregunta sobre privacidad en
medio del asistente, que es un mal lugar para hacerla.

## Cómo verificar que quedó — esto NO lo puede probar ningún test de aquí

Necesita un despliegue real. El procedimiento es mirar:

1. Poner `FAVICON_URL` en las Script Properties con una URL pública `https://`.
2. **Volver a desplegar** (Manage deployments → ✏️ → New version).
3. Abrir la app y mirar la pestaña.

Si no cambia, el sospechoso es la URL: Google tiene que poder descargarla sin
sesión. Pruébala pegándola en una ventana de incógnito — si ahí no carga la
imagen, tampoco va a cargar para Google.

---

## v10.6 — lo que se investigó, y por qué queda parado

Jose desplegó v10.4 y v10.5 con `ACOPIO_FAVICON_URL` apuntando a un PNG suyo
en Drive, confirmado público (se abre en incógnito). **La pestaña no cambia.**

### Lo que dice la documentación

`HtmlOutput.setFaviconUrl(iconUrl)` es el método soportado, y la documentación
es explícita en un punto: **las etiquetas `<link rel="icon">` puestas dentro
del HTML de Apps Script se ignoran.** O sea que el camino del servidor es el
único, y es el que estamos usando — sobre el objeto `HtmlOutput`, antes de
devolverlo.

Existe además un reporte antiguo en el Issue Tracker de Google titulado
*"Allow standalone web-app script to set its favicon"* (issue 36756649). **No
pude abrirlo** —el proxy de la sesión bloquea `issuetracker.google.com`— así
que no sé si está resuelto, abierto o cerrado como "no se va a arreglar". Lo
anoto como pista, no como conclusión.

### El dato que más pesa, y que sale de nuestra propia app

**`setTitle()` SÍ funciona.** La pestaña muestra el nombre de la empresa. Es un
método hermano, del mismo objeto, aplicado a la misma página de nivel superior.

Eso descarta la explicación más cómoda ("Google no deja tocar la página de
arriba"): sí deja, y lo demuestra el título todos los días. Lo que queda por
distinguir es si Google **no inserta** la etiqueta del favicon, o si la inserta
y **el navegador no consigue cargar la imagen**.

### La comprobación que lo decide, sin adivinar

En la app desplegada, F12 → **Elements**, y mirar el `<head>` del documento
**de nivel superior** (no el del iframe), buscando `<link rel="icon"`:

- **Si la etiqueta está** con nuestra URL → `setFaviconUrl` funciona, y el
  problema es la imagen. Drive es mal anfitrión para esto: `lh3` y
  `uc?export=view` responden con redirecciones y límites de tasa, y un
  navegador que no recibe bytes de imagen limpios se queda con el icono por
  defecto sin decir nada. Se arregla con un `.png` servido directo desde
  acopio.net.
- **Si la etiqueta NO está** → Google no la aplica en despliegues `/exec`, y
  entonces no se puede. Se documenta y se cierra el tema.

Segunda comprobación, complementaria: pestaña **Network**, filtrar por `lh3` —
ver si el navegador siquiera pide la imagen y con qué responde.

### ⚠ RESUELTO — v10.7. La causa era una cláusula de la documentación

Jose abrió el hilo del Issue Tracker que yo no pude leer, y ahí está todo.

**El feature existe y funciona** desde diciembre de 2015 (`setFaviconUrl`,
issue 36756649 marcado como Fixed). No es que Google no lo permita.

**La causa de nuestro fallo está en una cláusula de la documentación que es
fácil de leer por encima:**

> `iconUrl` — *"The URL of the favicon image, **with the image extension
> indicating the image type**."*

**Google decide el tipo de imagen por cómo TERMINA la URL**, no por lo que
responde el servidor. Una URL de Drive termina en un id de archivo, así que no
hay extensión que leer y el icono se descarta.

El comentario **#22** del hilo (2017) reporta exactamente eso, con el mensaje
literal: *"The favicon icon image type is not supported"*, preguntando qué pasa
cuando el favicon está en Google Drive.

El comentario **#23** (2018) da el arreglo, que es el que aplicamos:

```javascript
.setFaviconUrl("https://docs.google.com/uc?id=XXXXXXXX#.ico")
```

**Añadir un fragmento al final.** Y es la herramienta correcta, no un truco
sucio: los navegadores **nunca envían el fragmento al servidor**. Google lee
`.png` del final de la cadena; Drive recibe exactamente la misma petición que
recibía antes. No cambia nada de la imagen — solo lo que Google puede deducir
de ella.

En v10.7 la constante quedó así:

```
https://lh3.googleusercontent.com/d/1pvA5GEB…#.png
```

Se conserva `lh3` en vez de `uc?export=view` porque Jose ya confirmó que esa
URL exacta muestra la imagen en una ventana de incógnito: o sea que es pública
y sí entrega bytes de imagen a un navegador. Esa mitad ya estaba probada; la
extensión era la que faltaba.

`tools/test-favicon.js` ahora exige la extensión, porque es un fallo invisible:
la URL se ve perfectamente correcta sin ella, la app no da ningún error, y el
único síntoma es una pestaña que calladamente nunca cambia.

**Dos apuntes más del hilo, por si aparecen:**
- Comentarios #17 y #19 (2016): avisos de *mixed content* porque Google
  envolvía la URL en `http://www.google.com/url?q=…`. Se reportó aparte
  (issue 36764429). Si reaparece, es eso y no nosotros.
- Sigue pendiente cambiar el id por el del logo **cuadrado**.

### Recomendación de fondo, que no cambia

**Esto sigue siendo un parche sobre el anfitrión equivocado.** Aunque Drive llegara a funcionar, sigue siendo el anfitrión
equivocado para un recurso que cada carga de cada cliente va a pedir. La
solución de verdad es un `.png` en acopio.net, y acopio.net ya está en la lista
de bloqueantes por otras tres razones. El código está listo y probado: el día
que exista el dominio, es **una línea**.


---

## ✅ FUNCIONA — confirmado en producción (v10.9)

Jose desplegó v10.9 y **el logo de Acopio aparece en la pestaña**. Con eso se
cierra la pregunta que quedó abierta tres versiones:

**`setFaviconUrl` SÍ se honra en una web app desplegada en `/exec`.** Todo lo
que parecía "quizá Google no lo soporta" era la extensión que faltaba en la
URL, y nada más. La sospecha estaba mal orientada; el comentario #22 del hilo
del Issue Tracker tenía la respuesta desde 2017.

**v11.0** cambia al logo de fondo transparente. Es lo correcto para un icono de
pestaña: se apoya limpio tanto sobre la barra clara como sobre la oscura,
mientras que un cuadro blanco enseña sus bordes en una de las dos.

Sigue en pie que el destino final es `acopio.net/favicon.png` — un archivo
normal en una URL normal no necesita nada de esto, y Drive es mal anfitrión
para algo que cada cliente pide en cada carga.
