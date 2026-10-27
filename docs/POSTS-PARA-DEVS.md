# Publicar en subreddits de programadores — y qué corregir del borrador de la otra IA

Jose, 27/10, pegando un borrador de otra IA: *"mira lo que me dice esta AI,
¿cómo lo mejoramos?"*

**Lo bueno primero, y es bastante:** el encuadre es correcto. «Zero
infrastructure», «data ownership», «Sheets as a headless DB» y **BYOS — Bring
Your Own Sheet** son exactamente las palabras con las que un programador
entiende en diez segundos qué es esto. Esa parte la adopto entera. **BYOS es un
buen nombre y no se nos había ocurrido.**

Lo que sigue es lo que hay que cambiar antes de publicarlo, ordenado por **lo
que cuesta cada error**.

---

## 1 · 🔴 La lista de subreddits tiene uno que te va a borrar

| Subreddit | ¿Se puede hablar de lo tuyo? |
|---|---|
| **r/SideProject** | **Sí.** Es literalmente para eso |
| **r/indiehackers** | **Sí** |
| **r/SaaS** | **Sí**, aunque es el más ruidoso de los cuatro |
| **r/webdev** | **NO.** La autopromoción está prohibida y se borra sola |

Publicar en r/webdev un post con el nombre del producto y una captura **no es
arriesgado: es que no va a durar**. Y una retirada por autopromoción queda en el
historial de la cuenta, que es lo que decide si el siguiente post pasa. **r/webdev
se cae de la lista.**

**El orden que yo seguiría:** r/SideProject primero (es el más tolerante y sirve
de ensayo), y **según cómo vaya**, r/indiehackers una semana después. Un sitio
al día sigue valiendo.

---

## 2 · 🔴 Dos de las tres respuestas técnicas preparadas son FALSAS para tu app

Esto es lo serio del borrador. La otra IA no ha visto el código, así que
escribió lo que **suele** hacer una app de Apps Script, no lo que hace la tuya.
Y en un subreddit de programadores, **contestar algo falso es la única forma
real de perder**: el que pregunta sabe, repregunta, y ahí se acaba la
credibilidad de todo lo demás que dijiste.

### 2.1 «optimistic UI updates» — **no es lo que hace tu app, y lo tuyo es mejor**

Lo que la IA te pone en la boca: *"we do optimistic UI updates so the team
doesn't feel the latency."*

**Tu app espera al servidor a propósito.** El botón se pone en `Saving…` y el
número no cambia hasta que el servidor contesta. Y la razón es buena: **un
número de stock optimista es un número que puede ser mentira**, y el bodeguero
que lo lee se va a llevar material que no está.

**Lo que sí es verdad y conviene decir:**

> We batch-read on load instead of querying per click, so the first paint is one
> round trip. But writes are not optimistic — the stock number doesn't move
> until the server confirms it. A stock figure that might be wrong is worse than
> a spinner, because somebody walks to a rack on the strength of it.

Eso es una decisión de producto defendible y **suena a alguien que ha pensado el
problema**, que es justo lo que quieres parecer.

### 2.2 «weighing a Workspace Add-on vs clasp / GitHub Actions pipeline» — eso no es lo que haces

La IA se inventó una hoja de ruta. Lo tuyo es **un archivo que se pega**, con su
versión y su huella de compilación, y un compilador que **se niega a generar el
archivo si no analiza** (`build-paste.js`). Eso es más raro y más interesante que
un pipeline de clasp, que lo tiene todo el mundo:

> Updates are a paste. The whole app is one file with a version and a build hash
> stamped in it, and the build script parses the JS before it writes — if it
> doesn't parse, there's no file to paste. No file beats a broken file. An
> Add-on would make updates automatic and I'd lose the thing customers actually
> buy, which is that nothing of mine runs in their account without them putting
> it there.

### 2.3 «append-only transactions **whenever possible**» — quita el *whenever possible*

Es append-only **siempre**. El stock se deriva del registro, nunca se escribe.
Un *whenever possible* en una frase que es verdad sin él **suena a que estás
tapando algo**, y un programador lo huele.

---

## 3 · 🟠 Las tres preguntas del final son el delator de que lo escribió una IA

Tu propia regla del § 1 lo dice: *"las tres preguntas son de verdad"*. Las de
este borrador no lo son — **1 y 2 son «¿alguien ha visto algo tan original como
lo mío?»** disfrazadas de duda. Eso en r/SideProject se nota a la primera.

**La 3 sí es real** (*"what red flags do you see pushing Sheets this far?"*) y es
la única que yo dejaría. **Una pregunta de verdad trae más respuestas que tres de
mentira**, y además ésa te sirve para el producto.

---

## 4 · 🟠 Faltan las tres cosas que a un programador le harían creerte

El borrador vende con adjetivos. Tú tienes **números**, que es con lo que se
habla ahí:

1. **El techo, medido y en pantalla.** 10M celdas por archivo, contadas como
   celdas de rejilla y no llenas; la app enseña el porcentaje usado y **estima
   los años que quedan** con el ritmo de los últimos 90 días. Que un proyecto
   de fin de semana conozca su propio límite **no se lo espera nadie**.
2. **180 archivos de prueba**, incluido uno que recorre **las 107 funciones
   globales** y exige que cada una lleve guardia o una excepción **con el motivo
   escrito**.
3. **Un archivo, a propósito.** Sin librerías, sin `<script src>`.

---

## 5 · 🟡 «Self-hosted in Workspace» es la palabra equivocada

No es self-hosted: lo hospeda Google. Lo correcto —y es lo que quieres decir— es
**«it runs in the customer's own Google account»**. Un programador que lee
«self-hosted» y descubre que es Apps Script piensa que le vendiste humo con una
palabra de moda, y eso contamina el resto.

---

## 6 · ⚠️ LA PREGUNTA QUE NADIE TE PREPARÓ, Y ES LA QUE VA A LLEGAR

El borrador prepara concurrencia, latencia y despliegue. **La que de verdad hace
un programador que conoce Apps Script es otra:**

> *"If you deploy with `executeAs: USER_DEPLOYING` and `access: ANYONE`, every
> global function in that project is a public endpoint running as the admin.
> How do you authorize?"*

**Es la pregunta correcta, y tienes la respuesta mejor que la mayoría:**

> Right, and that's the sharpest thing about this platform. Every global without
> a leading underscore is a public endpoint running as whoever deployed it — 107
> of them in my case. So there's a test that walks all of them on every build:
> each one either goes through the auth guard or sits in an exception list with
> a written reason. Zero unexplained. The role itself never comes from the
> browser — the client sends a session token, the server looks the role up.
> That's the part people get wrong, and it's the one that matters, because
> otherwise a warehouse guy edits one field and becomes an admin.

**Esa respuesta sola vale más que el post entero.** Si te preguntan eso, la
conversación cambia de «otro CRUD sobre Sheets» a «este tío sabe lo que hace».

---

## 7 · EL POST, REESCRITO

Más corto que el de la IA. Un post largo con una lista de funciones se lee como
una página de producto; **la historia y una pantalla** se leen como una persona.

> **Title:** I built a warehouse system that runs entirely inside the customer's
> own Google account — Sheets as a headless DB, zero infrastructure
>
> I manage the warehouse for a small glass and windows company. We ran inventory
> on a plain Google Sheet for two years, and it worked until it didn't: two
> people editing at once, no rack-level visibility, and no clean way to see what
> a job actually consumed.
>
> Nobody wanted another subscription or another login, and we were already on
> Workspace — so I built the app on top of Apps Script and kept the Sheet as the
> database. Bring your own sheet, basically. It installs into the customer's own
> Apps Script project: there's no server of mine in the middle, and the data
> never leaves their Drive.
>
> The part I didn't expect: **most of my warehouse crew has never opened the
> underlying spreadsheet.** They do the whole day inside the app. The sheet
> became an implementation detail.
>
> Three things that made it survive daily use, in case they're useful to anyone
> doing something similar:
>
> - **Stock is never written, only derived.** Every entry, exit, transfer and
>   adjustment is an append-only row; the stock view is rebuilt from it. There
>   isn't a single formula in the file.
> - **Writes are serialized server-side** under `LockService`, and they're not
>   optimistic — the number doesn't move until the server confirms. A stock
>   figure that might be wrong is worse than a spinner, because somebody walks
>   to a rack on the strength of it.
> - **The app knows its own ceiling.** A Sheet is 10M cells, and it slows down
>   long before that, so there's a line in settings showing how full the file is
>   and roughly how many years are left at the current pace.
>
> Screenshot is our warehouse map — rack capacity and per-project reservations.
>
> The real question I came to ask: **what breaks first when you push Sheets +
> Apps Script this far into daily operations?** I know where the cell ceiling is
> and I've handled concurrency, but I'd rather hear the failure mode I haven't
> thought of from someone who's hit it.

**Qué cambió respecto al de la IA:** una pregunta real en vez de tres falsas,
tres hechos verificables en vez de una lista de funciones, ninguna palabra que
no sea verdad, y el nombre del producto fuera del cuerpo. **En r/SideProject
puedes ponerlo**; yo lo dejaría para un comentario cuando alguien pregunte, que
es lo que hace que el post no se lea como un anuncio.

---

## 8 · LA CAPTURA

La IA tiene razón en una cosa y conviene subrayarla: **sube la imagen como
imagen**, no un enlace. Reddit entierra los enlaces externos y enseña las
imágenes. Mapa de almacén, 1200×630 o 1080×1080, **y con datos inventados** — la
regla del § 4 no cambia porque el subreddit sea de programadores: la primera
captura que subas lleva los nombres de tus clientes.
