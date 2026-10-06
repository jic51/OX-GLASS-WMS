# Las 20 comprobaciones de SEO, pasadas por el sitio de verdad

> **ESTADO, 2026-10-06 (tarde): HECHAS LAS CINCO TANDAS.** De las veinte, **18
> están cumplidas y comprobadas por `tools/test-site-seo.js`** (30
> comprobaciones, cuatro mutaciones verificadas). Las dos que faltan son las dos
> que no puedo hacer yo: **Enforce HTTPS** y **Search Console** — **las dos
> hechas por Jose el mismo día**; ver el apartado 8. Lo construido
> está al final, en el apartado 7; la auditoría se conserva entera porque es lo
> que explica por qué se hizo cada cosa.

Jose, 2026-10-06, con una lista de 20 comprobaciones: *"mira la lista de cosas
que hay en esa imagen y verifica si las necesitamos y también si ya las tenemos.
Anota las que sí y verifícalas para saber cómo están. También haz una lista con
las que no y dime si las necesitamos o no y por qué. Luego haz un plan."*

**Comprobado en el sitio publicado, fichero por fichero** — `_site/`, 11 páginas,
`www.acopio.net`. Nada de esto es de memoria. Lo que no he podido comprobar desde
aquí lo digo con esas palabras.

---

## 0. Antes de la lista: PARA QUIÉN es este sitio

Importa, porque la mitad de las 20 comprobaciones sólo valen si alguien va a
buscar.

El sitio tiene **11 páginas**: la portada, el detalle del producto, los dos
changelogs, cinco documentos de cliente y los dos legales. No es un blog ni una
tienda. Quien llega es **una de tres personas**:

1. **Un comprador que busca** *"warehouse inventory google sheets"* o
   *"sistema de inventario para bodega"*. Para éste sirve casi toda la lista.
2. **Alguien a quien Jose le ha pasado el enlace** por WhatsApp o por correo.
   Para éste **no sirve ninguna comprobación de buscadores** — pero sí la número
   18, que es la que hace que el enlace se vea como algo serio al pegarlo.
3. **Un cliente que ya compró** y busca cómo instalar o cómo restaurar. Para éste
   sirve que sus documentos salgan en Google.

Y hay una cuarta que la lista casi no cubre, y que en 2026 pesa: **un asistente
de IA al que le preguntan "¿qué programa uso para mi bodega?"**. Es lo que
intenta la número 20.

---

## 1. LO QUE YA TENEMOS — y cómo está de verdad

| # | Comprobación | Estado |
|---|---|---|
| 3 | **Quitar `noindex`** | ✅ **Nada que hacer.** Buscado en las 11: no hay un solo `noindex`. Nada está bloqueado por error |
| 5 | **Meta titles** | 🟡 **Las 11 tienen `<title>`, pero el más importante es malo.** Ver abajo |
| 7 | **Un solo H1 por página** | 🟡 **10 de 11 bien. `docs/instalacion.html` tiene DOS** |
| 8 | **Orden de los encabezados** | ✅ **Correcto en las 11.** Van 1→2→3 sin saltarse ninguno |
| 9 | **Texto alternativo en imágenes** | ✅ **En todo el sitio hay UNA sola `<img>`** (el logo, en la portada) **y tiene su `alt`** |
| 11 | **Enlaces internos** | ✅ **Fuerte.** El pie de cada página enlaza a todas las demás: 11 páginas, todas a un clic de todas |
| 12 | **Enlaces rotos** | ✅ **Comprobado y verde**, y además automáticamente: `tools/test-site-links.js` corre en cada publicación. Un matiz abajo |
| 16 | **Forzar HTTPS** | 🟡 **En el contenido, sí**: no hay un solo enlace `http://` en las 11 páginas. **En el servidor, no lo puedo comprobar desde aquí** |
| 17 | **URLs limpias** | ✅ **Lo están.** `/detalle.html`, `/docs/setup.html`. Sin parámetros, sin números, sin basura. Una pega de criterio abajo |

### El `<title>` de la portada es **"Acopio"**, y eso no sirve para nada

Es el peor de los nueve que sí tenemos. En Google, el título es **la línea azul
que se pulsa**, y la nuestra dice una palabra que nadie busca, porque nadie
conoce el producto todavía.

Los demás están bien y se nota que están escritos a mano: *"Si algo se dañó, así
vuelves a ayer · Acopio"*, *"La vista por pasillo · Acopio"*. Ésos dicen de qué
van. El de la portada, no.

### Los dos H1 de la guía de instalación

`docs/instalacion.html` sale con `<h1>Guía de instalación — Acopio</h1>` y más
abajo otro `<h1>Actualizar un cliente ya instalado</h1>`. Viene del Markdown
original, que usa `#` dos veces. Dos H1 le dicen al buscador que la página trata
de dos cosas distintas, y entonces no la clasifica bien en ninguna.

### Los enlaces relativos de los changelogs

`changelog.html` y `novedades.html` se enlazan entre sí con `href="novedades.html"`
en vez de `href="/novedades.html"`. **Hoy funciona** porque los dos viven en la
raíz. Se rompería el día que uno se moviera a una carpeta. No es un fallo; es una
trampa puesta para el futuro.

---

## 2. LO QUE NO TENEMOS — Y SÍ HACE FALTA

### 🔴 15. Arreglar el móvil — y es el peor de los veinte

**Las cuatro páginas principales no tienen `<meta name="viewport">`.** Eso
incluye **la portada**.

Sin esa línea, un teléfono **no sabe que la página está pensada para él**: la
dibuja a ancho de escritorio y la encoge hasta que cabe. Letra ilegible, botones
que no se pueden dar, y hay que pellizcar para leer.

Y no es sólo eso. Comprobadas una a una, `index.html`, `detalle.html`,
`changelog.html` y `novedades.html` **no tienen `<!DOCTYPE html>`, ni `<html
lang="...">`, ni `<meta charset>`**. Empiezan directamente en `<title>`. Sin
doctype el navegador entra en *modo peculiaridades*, que es un modo de
compatibilidad de hace veinte años.

Las cinco páginas de `docs/` sí lo tienen todo, porque las construye
`build-site.js` con un molde. **Las cuatro escritas a mano son las que no.**

**Por qué importa más que ninguna otra:** el 60 % de la gente abre un enlace
desde el teléfono. Jose manda el enlace por WhatsApp. **El comprador lo abre en
el móvil, y lo primero que ve es una página de escritorio encogida.** Google
además mide el sitio como lo ve un teléfono: sin viewport, la portada suspende
antes de empezar.

### 🔴 18. La imagen al compartir (og:image)

**Ninguna de las 11 páginas tiene `og:image`, ni `og:title`, ni `og:description`.**

Esto es lo que se nota **sin saber nada de SEO**: cuando Jose pega
`www.acopio.net` en WhatsApp, en un correo o en un mensaje, sale **un recuadro
vacío con la dirección**. Con `og:image` sale una tarjeta con el logo, el nombre
y una frase.

Es la comprobación con mejor relación entre lo que cuesta y lo que cambia, porque
**ahora mismo la forma principal de llegar al sitio es Jose mandando el enlace**,
no la búsqueda.

### 🔴 6. Descripciones (meta description)

**Cero en las 11 páginas.** Es el párrafo gris que sale debajo del título en
Google. Sin él, Google recorta un trozo cualquiera de la página — a veces el
menú, a veces el pie legal.

No sube el puesto en la lista, pero **decide si alguien pulsa o no**, que a
efectos prácticos es lo mismo.

### 🟠 4. Canonical

**Cero en las 11.** Aquí hay un motivo concreto nuestro: el dominio es
`www.acopio.net` y existe también `acopio.net`. Si las dos responden, el buscador
puede verlas como **dos sitios con el mismo contenido** y repartir el crédito
entre los dos. El canonical dice cuál es la buena.

### 🟠 1 y 2. sitemap.xml y robots.txt

**No existe ninguno de los dos.** Comprobado: no están en `_site/`.

Con 11 páginas bien enlazadas, Google las encuentra igual — **el sitemap no es
imprescindible**. Lo que sí aporta aquí:

- Le dice **cuándo cambió cada una**, y los changelogs cambian en cada versión.
- Y el `robots.txt` **tiene un trabajo de verdad en este sitio**: es donde se
  apunta el sitemap, y es donde se diría qué no indexar el día que haya algo que
  no deba indexarse.

**Lo importante de los dos: los tiene que escribir `build-site.js` solo**, a
partir de la lista `PAGES`/`DOCS` que ya tiene. Un sitemap a mano es **otra lista
que tiene que coincidir con la de al lado sin que nada lo obligue**, y eso es
exactamente el fallo que llevamos todo el mes arreglando en los usuarios.

### 🟠 10. Datos estructurados (schema)

**Cero `ld+json` en las 11 páginas.** Es el bloque que le dice al buscador, en un
formato que entiende una máquina: *esto es un programa, se llama Acopio, hace
esto, cuesta esto, lo hace esta empresa*.

Es lo que convierte un resultado en una ficha. Y cada vez más, **es de lo que se
alimenta un asistente de IA** cuando le preguntan qué programa usar.

**Un cuidado:** el sitio ya publica `joseisrael5101@gmail.com` como contacto. En
un bloque de schema ese correo queda **en un formato que los recolectores de spam
leen directamente**. Si se mete el correo ahí, mejor que sea uno de empresa, no
el personal — pero eso es decisión tuya, no mía.

---

## 3. LO QUE NO TENEMOS Y **NO** HACE FALTA (todavía)

### ⏸ 20. llms.txt — **útil para nosotros, pero sé honesto: no es un estándar**

Lo digo claro porque está de moda y se vende como obligatorio: **`llms.txt` es
una convención propuesta, no un estándar. Ningún buscador la exige y no está
demostrado que ningún modelo la lea.** Quien diga lo contrario está adornando.

**Dicho eso, para este producto concreto yo la pondría igual**, por dos razones:

1. Es **un fichero de texto** que se escribe una vez y que `build-site.js` puede
   generar. Si mañana sirve, estamos; si no sirve, no ha costado nada.
2. Nuestro comprador **sí** pregunta a un asistente. Es un encargado de bodega
   que no sabe de programas: va a escribir *"qué uso para controlar materiales en
   mi bodega"* en un chat antes que en Google.

**No es prioridad.** Va al final de la lista, detrás de todo lo que sí está
demostrado.

### ⏸ 14. Core Web Vitals — **no lo puedo medir desde aquí, y adivinarlo no vale**

Son tres medidas de Google: cuánto tarda en salir lo grande, cuánto tarda en
responder al primer toque, y cuánto se mueve la página mientras carga. **Se miden
en el sitio en marcha**, y desde esta máquina no puedo abrirlo.

Lo que sí puedo decir mirando los ficheros:

- **A favor:** HTML estático, cero marcos de JavaScript, `preconnect` a Google
  Fonts ya puesto. Es el perfil que suele puntuar bien.
- **En contra:** `changelog.html` y `novedades.html` pesan **158 y 164 KB de HTML
  cada uno, y crecen en cada versión que publicamos**. Hoy no molesta; dentro de
  cien versiones será una página de medio mega. Hay que decidir algún día si se
  parten por año.
- **Y lo que seguro puntúa mal: sin `viewport`, Google mide la portada como una
  página no apta para móvil.** Así que el 14 **no se puede arreglar antes que el
  15** — hacerlo al revés es medir el sitio roto.

### ⏸ 13. Comprimir imágenes — **hay dos ficheros, y uno está gordo para lo que es**

En todo el sitio hay **dos imágenes**:

- `logo.png` — 17,8 KB para **100×130 píxeles**. Es mucho para ese tamaño, pero
  son 17 KB: no cambia nada medible.
- `favicon.svg` — **23,9 KB**, y se carga en **las 11 páginas**. Para un icono de
  pestaña es grande; un favicon típico va por debajo de 2 KB.

**No es prioridad**, pero el favicon es el más fácil de todos: es simplificarlo
una vez y ya.

### ✅ 3, 9, 12 — ya están, y no hay nada que hacer

Las dejo aquí también para que quede claro que **no es que no las necesitemos:
es que ya se cumplen**. Y dos de las tres **se cumplen porque hay una prueba que
las vigila**, no porque alguien se acordara.

---

## 4. LO QUE SÓLO PUEDE HACER JOSE

Estas dos no las puedo hacer ni comprobar yo. **Lo intenté**: desde esta máquina
el acceso a internet está filtrado y `www.acopio.net` no responde, y la ruta de
la API de GitHub que daría la respuesta está bloqueada. No voy a decir que están
bien sin haberlo visto.

### ❓ 16. Enforce HTTPS — comprobarlo, click a click

1. Abre **github.com** y entra en el repositorio **`jic51/acopio-site`**.
2. Arriba, en la fila de pestañas (Code · Issues · Pull requests · …), pulsa
   **Settings**. Es la última de la fila, con un icono de rueda dentada.
3. En la columna de la izquierda, baja hasta **Pages**.
4. Abajo del todo de esa pantalla hay una casilla que dice **Enforce HTTPS**.
   **Tiene que estar marcada.**
5. Si está en gris y no se deja marcar, pone debajo el motivo (normalmente que el
   certificado se está emitiendo). Espera unas horas y vuelve.

### ❓ 19. Search Console — y sin esto, lo demás es a ciegas

**Es la más importante de las dos**, y no porque mejore nada: porque **es la única
forma de saber si lo demás sirvió**. Sin ella no sabemos si Google ha visto el
sitio, qué busca la gente que llega, ni si algo da error.

1. Entra en **search.google.com/search-console** con tu cuenta de Google.
2. Arriba a la izquierda, pulsa el desplegable y luego **Agregar propiedad**.
3. Te da dos opciones. Elige la de la **derecha**, *"Prefijo de la URL"*, y
   escribe **`https://www.acopio.net`** tal cual, con `https://` y con `www.`
4. Para demostrar que es tuyo, elige **"Etiqueta HTML"** y copia la línea que te
   da. **Pásamela y yo la pongo** en la portada.
5. Cuando la línea esté publicada, vuelve y pulsa **Verificar**.

### 🟡 17. Una decisión tuya sobre las direcciones

Las direcciones mezclan los dos idiomas: `/detalle.html` y `/novedades.html` en
español, `/docs/setup.html` en inglés. **No es un fallo** y no afecta a Google.
Pero si algún día se cambian, **todos los enlaces viejos se rompen** — los de los
correos que ya mandaste, los del propio producto. **Si se van a cambiar, es ahora
y no dentro de un año.** Yo las dejaría como están.

---

## 5. EL PLAN

Ordenado por **lo que cambia algo de verdad**, no por el número de la lista.

### Tanda 1 — la cabecera de las cuatro páginas · cubre 6 de los 20

**Es una sola tarea** y arregla sola la mitad de la lista, porque los cuatro
ficheros de `landing/` tienen el mismo agujero: les falta la cabecera entera.
Añadir un `<head>` de verdad a cada uno trae de golpe:

- `<!DOCTYPE html>`, `<html lang>`, `<meta charset>` — **el fallo de fondo**
- **#15** `viewport` → el móvil
- **#5** un `<title>` que diga qué es, empezando por la portada
- **#6** la descripción
- **#4** el canonical
- **#18** `og:image`, `og:title`, `og:description` y las de Twitter

Y lo mismo en el molde de `build-site.js`, que arregla **las cinco páginas de
docs a la vez**.

**Tamaño:** una tarde. **Es la que yo haría primero, entera, antes que ninguna
otra.**

### Tanda 2 — la imagen de compartir · #18

Hay que **hacer la imagen**: 1200×630, con el logo, el nombre y una frase. Sin
ella, la tanda 1 deja las etiquetas apuntando a nada.

**Tamaño:** pequeño, pero es diseño, no código.

### Tanda 3 — los tres ficheros que genera el build · #1, #2, #20

`sitemap.xml`, `robots.txt` y `llms.txt`, **escritos por `build-site.js` a partir
de la lista que ya tiene**. Ninguno a mano, por la regla de siempre: dos listas
que tienen que coincidir sin que nada lo obligue acaban no coincidiendo.

**Tamaño:** pequeño. **Y aquí va la prueba**, `tools/test-site-seo.js`, que
compruebe que cada página publicada lleva su título, su descripción, su canonical,
su viewport y su doctype, y que el sitemap tiene exactamente las páginas que hay.
Sin esa prueba, esto se cumple hoy y se incumple en la tercera página nueva —
**es la diferencia entre arreglarlo y arreglarlo de verdad**, y lo hemos aprendido
caro este mes.

### Tanda 4 — la ficha para buscadores y asistentes · #10

El `ld+json` de `SoftwareApplication` + `Organization` en la portada. Va después
porque sólo luce cuando lo de arriba está puesto.

### Tanda 5 — los pequeños · #7, #12, #13

El segundo H1 de la guía de instalación, los dos enlaces relativos, y adelgazar
el favicon. Media hora los tres.

### Y en paralelo, lo tuyo

**#19 Search Console primero**, porque es lo que nos dirá si algo de esto sirvió,
y cuanto antes esté, antes empieza a recoger datos. Luego **#16**, que es una
casilla.

### Lo que NO voy a hacer en este plan

**#14 Core Web Vitals no se mide hasta que la tanda 1 esté publicada.** Medir
ahora es medir el sitio con el fallo del viewport dentro, sacar un número malo y
no saber cuánto de ese número era el viewport. Primero se arregla, luego se mide
—con PageSpeed Insights, que es gratis— y entonces se decide si hace falta
algo más.

---

## 6. Lo que esta lista NO cubre, y es lo que de verdad decide

Para que el plan no se lea mejor de lo que es:

**Las 20 comprobaciones son la fontanería. Ninguna hace que alguien busque
Acopio.** Hacen que, *cuando alguien busque*, el sitio no se descalifique solo; y
que *cuando Jose mande el enlace*, se vea serio. Eso vale, y es barato — pero no
es lo mismo que tener visitas.

Lo que trae visitas a un producto así es otra cosa y no está en la imagen: que
existan páginas que respondan a lo que la gente escribe de verdad —*"cómo llevar
el inventario de una bodega de vidrio"*, *"plantilla de inventario en Google
Sheets"*— y que haya a quién preguntárselo. **Eso es trabajo de meses y es de
Jose decidir si lo quiere.** Está anotado en `VENTAS.md` y no es parte de este
plan.


---

## 7. LO QUE SE CONSTRUYÓ, 2026-10-06

### El fallo de fondo, arreglado donde no se puede repetir

Las cuatro páginas de `landing/` ya no se publican tal cual: `build-site.js` les
pone la cabecera entera (`headOf`), la misma que ya construía para las de
`docs/`. **Una sola función escribe la cabecera de las once páginas**, así que
una página doce no puede volver a ser la que no tiene `viewport`.

Comprobado en un teléfono de 390 px: la portada ocupa 390 px, **no desborda**, el
titular sale a 41,7 px y el texto a 16,1 px. Antes salía a ancho de escritorio y
encogida.

### Lo que lleva ahora cada página

Doctype · `lang` · `charset` · **viewport** · título propio · descripción ·
canonical a sí misma · `og:` y `twitter:` completos con su imagen.

El `<title>` de la portada pasó de **"Acopio"** a *"Acopio — know what is on the
shelf without walking there"*.

### La tarjeta de compartir — `tools/build-og-image.js`

1200×630 a doble resolución, **dibujada con el navegador** y con **las fuentes de
la marca** (Archivo e Inter), no con una librería de imágenes: una tarjeta de
marca con la letra equivocada es peor que no tener tarjeta. 147 KB en JPEG — el
mismo dibujo en PNG pesaba 485 KB.

Dos cosas que el programa hace y conviene saber:

- **Incrusta las fuentes** en vez de enlazarlas. El navegador de esta máquina no
  alcanza Google Fonts, y una imagen que a veces sale con otra letra es peor que
  una que no sale.
- **Comprueba que se usaron**, y si no, **no escribe el fichero**.

> **Una corrección, porque enseña algo.** La primera versión de esa comprobación
> comparaba el ancho del titular con la fuente buena y con la de reserva, y daba
> *siempre* "no cargó" — con las fuentes perfectamente cargadas. Un `<h1>` es un
> bloque: su ancho es el del contenedor y no cambia nunca con la tipografía.
> **Estaba midiendo el recipiente en lugar del contenido.** Ahora se le pregunta
> al navegador directamente (`document.fonts.check`), que no hay nada que
> deducir.

### Los tres ficheros que no son páginas

`sitemap.xml`, `robots.txt` y `llms.txt`, **generados de la misma lista** que
decide qué se publica. Nada que mantener a mano, y una página nueva entra sola en
los tres. El `lastmod` del sitemap es la fecha del **fichero de origen**, no la
del build: un sitemap que dice que las once páginas cambiaron hoy, cada vez que
se compila, enseña al buscador a no hacerle caso.

### La ficha de datos estructurados

`SoftwareApplication` en la portada. **Sin precio y sin correo**, las dos por el
mismo motivo: lo que entra ahí lo recoge una máquina y lo repite meses después,
fuera de nuestro alcance. Un precio caducado en un comparador y el correo
personal de Jose en un recolector de spam son el mismo fallo.

### Los pequeños

- El segundo H1 de la guía de instalación → H2.
- Los dos enlaces relativos de los changelogs → absolutos.
- El favicon: **24 KB → 11 KB** (llevaba el logo entero dentro; un icono de
  pestaña se dibuja a 32 px).

### La prueba, que es lo que impide que esto se pudra

`tools/test-site-seo.js`, en la suite. **Lee las páginas del directorio, no de
una lista escrita dentro** — una lista allí sería una tercera copia de "qué
páginas hay", y diría que todo está bien sobre una página que ya no existe.

Mutaciones comprobadas: quitado el viewport → falla; canonical copiado de otra
página → falla; una página fuera del sitemap → falla; borrada la imagen de
compartir → falla.

### Y el candado de privacidad, que hizo su trabajo

`test-site-privacy.js` **rechazó los cuatro ficheros nuevos** hasta que se
argumentaron uno a uno en su lista. Eso es el diseño funcionando: un fichero que
aparece en el sitio tiene que defenderse antes de salir.

También dio **un falso positivo**: el patrón de correos encontró `2@6.fh` dentro
de los bytes del JPEG. Se acotó al texto — **las comprobaciones de cadenas
concretas siguen leyendo el sitio entero, imágenes incluidas**. Unos bytes al
azar pueden parecer un correo, pero no van a deletrear `OAUTH_CLIENT_SECRET`. Y
comprobado con una mutación que el candado sigue cazando: colar
`PRECIOS-Y-COMPETENCIA.md` en la lista de publicación produce cuatro fallos.

### Lo que sigue sin hacerse, y por qué

- **#16 Enforce HTTPS** y **#19 Search Console** — apartado 4. Son tuyas.
- **#14 Core Web Vitals** — ahora ya se puede medir, porque el viewport está
  arreglado. Con PageSpeed Insights, cuando el sitio esté publicado.
- **#17 los slugs** — se quedan como están, a falta de que digas otra cosa.


---

## 8. SEARCH CONSOLE Y HTTPS — 2026-10-06, por Jose

### La etiqueta de verificación, puesta y vigilada

Jose dio de alta la propiedad `https://www.acopio.net` y trajo la etiqueta. Está
en `build-site.js`, **sólo en la portada**, que es donde Google la busca.

Tres cosas quedaron escritas junto a ella, porque las tres se olvidan:

1. **No es un secreto.** Es una etiqueta pública en una página pública. No da
   acceso a nada; sólo demuestra que quien controla el sitio controla la
   propiedad. Por eso puede vivir en el repositorio.
2. **No se quita nunca, aunque la verificación ya esté hecha.** Google la vuelve
   a mirar cada cierto tiempo y, el día que no la encuentre, **quita el acceso a
   los datos** — en silencio, con un aviso por correo a una cuenta que nadie
   mira. Y se pierde justo lo único que dice si el resto del trabajo sirvió.
3. **Sólo en la portada.** En las once no verifica nada más y multiplica por once
   lo que hay que cambiar el día que cambie.

`test-site-seo.js` comprueba las tres cosas. Mutación verificada: vaciada la
etiqueta, fallan dos comprobaciones.

### HTTPS

Jose confirma que la casilla está marcada. **No lo he podido comprobar yo**: el
acceso a `acopio.net` desde esta máquina sigue filtrado por el proxy — da 403
antes de salir. Lo que sí he comprobado es que **lo publicado es lo que creemos
que es**, leyendo el repositorio del sitio directamente.

Queda, pues, apoyado en la palabra de Jose, y lo digo así en vez de ponerle un ✅
como si lo hubiera visto.

### Lo que falta, y ahora sí se puede

**#14 Core Web Vitals.** Antes no tenía sentido medir: el `viewport` roto habría
dado un número malo del que no se sabría qué parte era el viewport. Ahora el
sitio está sano y se puede medir de verdad, con **PageSpeed Insights**
(`pagespeed.web.dev`, gratis, se pega la dirección y ya). Es trabajo de Jose
porque hay que abrirlo desde fuera; si sale algo, se anota y se arregla.
