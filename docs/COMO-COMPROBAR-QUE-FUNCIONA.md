# Cómo comprobar que todo esto funciona

Jose, 2026-10-06: *"dime cómo comprobamos que todo lo que estamos haciendo
funcione y qué es lo que sigue."*

Buena pregunta, y la mejor que se puede hacer después de dos días construyendo.
Lo divido en tres, porque son tres cosas distintas que se comprueban de maneras
distintas:

1. **Lo que se comprueba solo**, y ya está corriendo.
2. **Lo que tienes que mirar tú**, con dónde y cuándo.
3. **Lo que no se puede comprobar todavía**, y cuánto hay que esperar.

---

## 1. LO QUE SE COMPRUEBA SOLO

Esto ya corre en cada publicación y **pone la cosa en rojo si algo se rompe**.
No hay que acordarse de nada.

| Qué vigila | Cuántas comprobaciones |
|---|---|
| Que cada página lleve título, descripción, canonical, viewport, doctype e idioma | `test-site-seo.js` — **47** |
| Que las dos portadas (inglés y español) tengan título, descripción e **imagen distintas** | dentro de las 47 |
| Que la etiqueta de Search Console siga ahí | dentro de las 47 |
| Que el sitemap diga exactamente las páginas que hay — ni una de más ni de menos | dentro de las 47 |
| Que las direcciones viejas lleven a un documento **que existe** | dentro de las 47 |
| Que no se publique ni un papel tuyo | `test-site-privacy.js` |
| Que no haya enlaces rotos y que se pueda llegar a todo | `test-site-links.js` |
| Que la landing no diga nada que no sea verdad | `test-landing-verdad.js` — **48** |

**Por qué esto importa más de lo que parece:** el fallo que encontramos ayer —la
portada sin `viewport`— llevaba ahí **desde que existe el sitio**, y nadie lo
había visto. No porque nadie supiera que hacía falta: porque **nada lo miraba**.
Ahora lo mira algo en cada publicación.

**Y además probé que las pruebas detectan de verdad.** Rompí cada cosa a
propósito y comprobé que fallaba: sin viewport → falla; canonical copiado de otra
página → falla; una página fuera del sitemap → falla; la imagen de compartir
borrada → falla; la etiqueta de Google vaciada → falla; la portada española con
la tarjeta inglesa → falla. **Una prueba que no se ha visto fallar no es una
prueba, es una decoración.**

---

## 2. LO QUE TIENES QUE MIRAR TÚ

### 2.1 Hoy mismo, cinco minutos

**A. Pégate el enlace a ti mismo por WhatsApp. Los dos:**

- `www.acopio.net` → tiene que salir la tarjeta **en inglés**
- `www.acopio.net/es/` → tiene que salir la tarjeta **en español**

Si sale el recuadro gris de antes, es que WhatsApp tiene guardada la vista previa
vieja: cambia el enlace a `www.acopio.net/?1` y vuelve a probar.

**B. Ábrelo en tu teléfono.** Lo que arreglamos ayer: la portada tiene que verse
hecha para el teléfono, no una página de escritorio encogida. Si tienes que
pellizcar para leer, algo salió mal y quiero saberlo.

**C. Comprueba que las direcciones viejas llevan a algún sitio.** Entra a
`www.acopio.net/setup.html` — tiene que saltar solo a `/docs/setup.html`.

### 2.2 Esta semana, en Search Console

Entra a `search.google.com/search-console` y mira tres cosas. **Todavía van a
estar casi vacías, y eso es normal** — Google tarda de días a un par de semanas
en pasar por un sitio nuevo.

| Dónde | Qué miras | Qué quieres ver |
|---|---|---|
| **Páginas** (menú izquierdo, *Indexación*) | Cuántas ha indexado | Que vaya subiendo hacia **12**. Si alguna sale como "Excluida", dime cuál y por qué |
| **Sitemaps** | Pega `sitemap.xml` y dale a Enviar | Que diga **Correcto** y que detectó 12 direcciones |
| **Rendimiento** | Qué busca la gente que llega | Vacío al principio. En unas semanas, **qué palabras escribió la gente** — y eso vale más que cualquier opinión mía |

**Lo más útil de los tres es el tercero**, y no hoy: dentro de un mes. Te va a
decir **con qué palabras te busca la gente de verdad**, que casi nunca son las
que uno creía. Eso cambia los títulos de la página, no al revés.

### 2.3 Una vez, cuando quieras

**La velocidad.** Entra a `pagespeed.web.dev`, pega `www.acopio.net` y dale.
Ahora sí tiene sentido medir —antes el `viewport` roto habría dado un número malo
del que no se sabría qué parte era el viewport—. **Pásame el resultado y lo
leemos juntos**; no hagas caso tú solo a los números rojos, que muchos no
importan.

**Que la ficha se entiende.** `search.google.com/test/rich-results`, pega la
dirección. Debe reconocer un *SoftwareApplication*.

---

## 3. LO QUE NO SE PUEDE COMPROBAR TODAVÍA

Dicho claro, porque la alternativa es que te quedes esperando algo que no va a
pasar cuando crees:

- **Que alguien te encuentre buscando.** Un sitio nuevo tarda **semanas o
  meses** en salir en Google para algo competido, y para algunas palabras no
  sale nunca. **Nada de lo que hicimos ayer trae visitas por sí solo.** Lo que
  hace es que, cuando alguien llegue, el sitio no se descalifique solo.
- **Si el producto le interesa a alguien que no seas tú.** Eso no lo dice
  ninguna herramienta: lo dicen las respuestas al primer post. Está en
  `SALIR-A-PUBLICAR.md`.
- **Si el precio está bien.** Hasta que alguien diga que sí o que no, es una
  suposición.

---

## 4. QUÉ SIGUE

Ordenado por lo que yo haría, no por tamaño.

### 4.1 Lo tuyo, y bloquea lo demás

1. **La copia de demo con datos inventados.** Una tarde. **Sin esto no se publica
   ni una captura**, porque las tuyas llevan los nombres de tus clientes, de tus
   proveedores y de tus empleados. Está explicado en `CAPTURAS-PARA-LA-LANDING.md`.
2. **Las dos capturas** (el mapa con un estante abierto, y la app en el teléfono)
   y **la del antes/después**. Con eso ya se puede publicar.
3. **El primer post**, en `SALIR-A-PUBLICAR.md`. Empieza por LinkedIn, que no
   tiene reglas que te expulsen.

### 4.2 Lo del producto, que sigue mandando

**Lo roto antes que lo nuevo**, y hay dos cosas de datos esperando:

1. **Se puede escribir una ubicación que no existe** y la app la crea en
   silencio. El material consta en un sitio que no está en ninguna estantería.
2. **La guardia de escritura es una lista de quién NO.** Hoy da igual; el día que
   haya un rol más, entra escribiendo sin que nadie lo decida. Una línea y una
   prueba.
3. **El cartel de reservas que se queda viejo** y acusa a un tercero que no
   existe.

### 4.3 Lo que te van a preguntar en cuanto publiques

De la comparación con el competidor de Excel (`COMPETIDOR-EXCEL.md`): un cliente
que haya visto un vídeo de ésos pregunta *"¿lleva costos? ¿me avisa cuándo pedir?
¿me imprime un comprobante de entrega?"*. **Hoy son tres noes.**

Lo más barato de los tres, y el que más se nota:

> **Avisar al guardar cuando una salida deja el material por debajo del mínimo.**
> El mínimo ya existe y ya se enseña en el Dashboard; sólo hay que mirarlo en el
> momento correcto. **Enterarse después de que se lo llevaron llega tarde.**

Luego el **valor del inventario** (las columnas de coste ya están) y el **recibo
de entrega**. Todo con su orden y su tamaño en `LO-QUE-FALTA-EN-LA-APP.md`.

### 4.4 Y lo que está esperándote a ti

- Los vídeos de UX/UI que faltan.
- La decisión del panel de clientes (camino A o B).
- Stripe.
- La plantilla maestra y el ensayo de restauración — **el único de esta lista que
  protege datos**, y lleva más tiempo esperando de la cuenta.

---

## 5. Si sólo haces una cosa esta semana

**La copia de demo.** No porque sea lo más importante del producto, sino porque
**es lo único que bloquea todo lo demás**: sin ella no hay capturas, sin capturas
no hay post, y sin post no hay nadie a quien preguntarle si esto le sirve.
