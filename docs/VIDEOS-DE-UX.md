# Los vídeos de Jose — el registro

Jose, 2026-10-05: *"también te voy a pasar unos vídeos para que veas cómo quiero
cambiar la app (en especial la UX/UI)… ya te estoy enviando vídeos, pero aún
faltan muchos."*

Esto es el registro: **qué mandó, qué enseña y qué de eso sirve para Acopio**.
Está aquí y no en el backlog porque todavía **no es trabajo decidido** — faltan
vídeos, y decidir el rediseño con la mitad de las referencias sería decidirlo mal.

**Lo que NO hago con estos vídeos:** copiarlos. Son páginas de demostración con
tres filas de datos de mentira. Acopio pinta tablas de cientos de filas que
alguien mira ocho horas. Algunas de estas ideas mejoran eso y otras lo empeoran,
y abajo digo cuál es cuál.

---

## Lo que llegó el 2026-10-05 (10 vídeos)

### A. UNO ES UN FALLO DE VERDAD, NO UNA REFERENCIA

**`2053-37` — Warehouse Map, las reservas.** Está tratado aparte, en el backlog:
el cartel de reservas se queda viejo después de soltar una, así que se vuelve a
pulsar Release sobre algo que ya no está y la app contesta *"someone else got
there first"* y *"Released 0 reservations — 2 had already been released by
someone else"* **cuando no había nadie más: era él, segundos antes, sobre una
pantalla sin refrescar**. Acusar a un tercero que no existe es peor que no decir
nada.

### B. UN COMPETIDOR (2 vídeos) — y es el más útil de todos

**"Conociendo Excel" — *Control de inventarios y almacenes PRO*.** Un sistema de
inventario hecho en Excel, para pymes. Lo que tiene y nosotros no:

- **Mínimo, máximo y punto de reorden POR ALMACÉN**, y un aviso **en el momento
  de registrar la salida**: *"esta salida deja el producto por debajo del mínimo
  asignado en el almacén seleccionado"*.
- **Existencias por almacén con coste y valor total.**
- **RECIBO DE ENTREGA imprimible**: nº de operación, fecha, tipo de movimiento,
  entregado a, almacén origen, comentario y las líneas.
- Una pestaña por informe: *Reporte movimientos, Reporte inventario, Reporte
  reorden*.

Todo eso está recogido y razonado en **`LO-QUE-FALTA-EN-LA-APP.md`**. Lo que NO
me llevo es su menú de diez botones: eso es Excel resolviendo que no tiene
navegación, y nosotros sí la tenemos.

### C. SIETE SON REFERENCIAS DE INTERFAZ

Seis son del mismo formato —*"basic vs premium"*, de **Design & Code With AV**— y
uno es una explicación de UX —**Design Motion**—. Lo que cada uno enseña, y qué
parte aplica aquí:

| Vídeo | Lo que enseña | ¿Sirve para Acopio? |
|---|---|---|
| **Activity feed** | Avatar, raya de tiempo vertical, nombre de la cosa resaltado, hora relativa, chips de filtro (All / New / Updates) | **SÍ, y mucho.** Es la pantalla que le falta a AUDIT_LOG. Es la referencia más directa de los siete |
| **Collaboration access** | Lista de personas con su permiso al lado en un desplegable, invitar por correo, "Copy link" | **SÍ.** Es Manage Users, y encima es la forma de los **permisos por persona** que acabamos de decidir |
| **Chip selector** | Pastillas con icono y estado marcado visible | **SÍ, en pequeño.** Los filtros de categoría de Movements ya son pastillas; les falta el icono y que se vea mejor cuál está puesta |
| **Glassmorphism search** | Buscador con cristal esmerilado y el atajo ⌘K dentro | **El atajo sí, el cristal no.** Un fondo translúcido sobre una tabla densa resta contraste, y Jose trabaja al 157 % |
| **Newsletter / Recharge plan** | Tarjetas con degradado, icono y badge | **Sólo el principio.** No tenemos tarjetas de precio; lo que sí vale es el principio de *una cosa destacada y el resto callado* |
| **Sheets are a system** (Design Motion) | Hojas inferiores en móvil: hoja para seguir en la página, modal para parar; tres alturas (peek / half / full); cierra la velocidad, no la distancia | **A tener en cuenta el día del móvil.** Hoy las ventanas de Acopio son modales de escritorio |

---

## Lo que de verdad dicen los siete juntos

Es el mismo mensaje repetido, y conviene decirlo en una frase porque es lo que
hay que aplicar: **el contenido no cambia, cambia cuánto trabajo hace la
presentación**. En las versiones "premium" no hay más datos; hay jerarquía
(una cosa manda), estado visible (lo marcado se ve marcado), identidad (icono o
avatar en vez de una inicial) y movimiento corto en lo que se toca.

**Dos cosas que yo añadiría cuando se haga el rediseño**, porque estas
referencias no pueden saberlas:

1. **Jose trabaja al 157 % de zoom.** Media de nuestras pruebas de navegador
   corren al 100 %. Sombras suaves, cristales y textos de 12 px se comportan
   distinto ahí. Ya está en el backlog: *una prueba de navegador a un zoom que no
   sea el 100 %*, y sube de prioridad el día que empiece el rediseño.
2. **Las tablas largas no son un feed.** Un avatar y una sombra por fila en una
   lista de tres entradas queda precioso; en 164 movimientos es ruido y es lento.
   Lo que valga para la actividad y para los usuarios **no vale automáticamente
   para Movements**.

---

## Segunda tanda, 2026-10-05 noche (5 vídeos) — *AI Builder Components*

Los cinco son del mismo autor, **@davidm_ai (David Mráz)**, y son de otra clase
que los de arriba: no son "básico contra premium", son **un componente suelto
con su CSS a la vista**. Eso los hace más útiles para decidir y más peligrosos
para copiar: enseñan una técnica, no una pantalla, y la técnica siempre parece
que encaja.

| Vídeo | Qué es, técnicamente | ¿Sirve para Acopio? |
|---|---|---|
| **Bento Skyline** | **Una sola rejilla y cinco tamaños de pantalla**, con `grid-template-areas` reescritas por `@media`: las mismas piezas (hero, chart, stat, list, quote, cta) se recolocan sin tocar el HTML | **SÍ, y es el más aprovechable de los cinco.** Ver abajo |
| **Pagination Styles** | Ocho formas de pasar páginas: Classic, Pills, Dots, Bordered, Track, **Compact (2 / 5)**, **Progress** (barra + 3 / 5), Steps | **A medias, y choca con lo que ya pediste.** Ver abajo |
| **Floating Button** | Un botón redondo que se **abre** en un menú de acciones rápidas, animando `clip-path: inset(...)` de círculo a tarjeta | **El patrón sí, la animación no.** Ver abajo |
| **Island Carousel** | Carrusel con `scroll-snap-type: x mandatory` + `scroll-snap-align: center`, flechas y puntitos | **Casi no.** Una fila que se arrastra enseña una cosa cada vez; el mapa de la bodega existe para ver muchas de golpe. Lo único que valdría es en móvil, para las fotos de un estante |
| **Card Stack** | Cartas apiladas que se abren en abanico al pasar por encima, con variables CSS por carta | **No, y ya lo decidiste tú.** En el backlog está tu propia petición para la columna DOC: *"dos al lado y una flecha, en vez de apilarse"*. Esto es exactamente lo contrario: esconde información detrás de más información y obliga a apuntar bien con el ratón para leer |

### El de la rejilla (Bento Skyline) — por qué éste sí

Es la respuesta técnica a un problema que ya tenemos escrito en dos sitios del
backlog: **estandarizar las columnas** y **que la app se comporte en pantallas
pequeñas**. Hoy el Stock Dashboard se recoloca con reglas sueltas repartidas por
la hoja de estilos; una rejilla con **áreas con nombre** dice la colocación de
cada tamaño en un solo bloque que se lee de un vistazo:

- Deja de haber reglas que se pisan entre sí, que es de lo que ya avisa el propio
  archivo (*"cuidado con las especificidades: es fácil generar clases que se
  cancelan"*).
- Y degrada mejor **al 157 % de zoom**, que es como trabajas: una rejilla de
  áreas recoloca; un apaño de flex se desborda.

**No es urgente** y no toca nada roto, pero es la forma correcta de hacer el
rediseño cuando llegue, en vez de añadir otra capa de parches encima.

### El de la paginación — honesto: choca con lo que ya pediste

Es el que más me tienta, porque **resuelve de raíz el problema del salto**: si la
lista no crece, no hay nada a lo que anclar el scroll, y toda esa familia de
fallos desaparece.

**Pero tú ya decidiste lo contrario**, y con razones: *"la vista del usuario debe
quedarse viendo los movimientos que ya se veían y añadir los demás debajo, no
debemos irnos hasta el último"*. Eso es acumular, no paginar. Paginar
significaría que los movimientos que estabas mirando **desaparecen** al pasar de
página.

Así que lo guardo como **lo que sí se puede llevar sin cambiar la decisión**: el
indicador de **Compact** o **Progress** — *"164 of 320"* con su barra, junto al
botón de cargar más. Hoy no hay forma de saber cuánto queda, y eso es la mitad de
lo que la paginación da gratis, sin quitarte lo que pediste.

### El botón flotante — el patrón sí, la animación no

Un botón de acciones rápidas (ENTRY, EXIT, TRANSFER) flotando en móvil es un
patrón de verdad y resuelve algo real: en el teléfono, los botones de acción
quedan arriba y hay que subir cada vez.

Lo que no me llevaría es **animar `clip-path`**. Es bonito y es caro: fuerza
repintados en cada fotograma, en un navegador que al mismo tiempo está pintando
una tabla de cientos de filas. La misma apertura con opacidad y `transform`
cuesta mucho menos y se ve igual.

### Lo que esta tanda añade a la conclusión de arriba

La de los siete primeros era *"el contenido no cambia, cambia cuánto trabajo hace
la presentación"*. Ésta añade la contraria, y conviene que estén las dos escritas:
**una técnica bonita aplicada a la pantalla equivocada quita información**. El
carrusel enseña de uno en uno lo que hoy se ve de golpe; el abanico de cartas
esconde detrás lo que hoy está al lado. De los cinco, dos mejoran Acopio, uno a
medias, y dos lo empeorarían.

---

## Tercera tanda, 2026-10-05 noche (5 vídeos) — el mismo autor, y un patrón

Otra vez **@davidm_ai**. Pero esta tanda dice algo que las anteriores no decían,
y es lo primero que hay que escribir:

> **Tres de los cinco son el mismo tema: UNA SOLA COLOCACIÓN QUE SE RECOLOCA
> SOLA.** Bento Grid, List & Detail Panes y Container Queries son tres formas de
> lo mismo. Y con el *Bento Skyline* de la tanda anterior, **Jose me ha mandado
> esa idea cuatro veces**. Eso ya no es casualidad: es lo que de verdad le
> molesta de la app, aunque no lo haya dicho con esas palabras.

Lo que hay detrás, y encaja con todo lo demás que sabemos: **trabaja al 157 % de
zoom**. A ese zoom una pantalla de portátil se comporta como una tablet, y Acopio
hoy se recoloca con reglas sueltas repartidas por la hoja de estilos en vez de
con una colocación declarada. Por eso se le desborda, se le parten los nombres y
se le pegan los botones.

| Vídeo | Qué es | ¿Sirve para Acopio? |
|---|---|---|
| **Container Queries** | *"Un componente, un contenedor: arrastra su borde, la ventana no se mueve."* Una tarjeta se adapta **al ancho que le ha tocado**, no al de la pantalla | **SÍ, y es el más valioso de los quince.** Ver abajo |
| **List & Detail Panes** | *"Cuatro paneles se pliegan en uno, y el detalle pasa a ser una pantalla."* Riel de iconos + lista + detalle, con `grid-template-areas` por tamaño y un `.detail-open` que cambia las áreas | **SÍ.** Es literalmente la forma de Settings (barra lateral + panel), que hoy no se pliega bien en un teléfono |
| **Mobile Bottom Menu** | Seis barras inferiores: Minimal, Bottom Line, Glass, Expanding Tab, **Centre FAB**, Gradient Bold | **SÍ, para el día del móvil.** Nuestras cinco pestañas viven arriba; en un teléfono están donde el pulgar no llega. El *Centre FAB* es la pareja del Floating Button de la tanda anterior |
| **Notification Stack** | Avisos apilados que dicen *"2 notifications"* y se abren en lista; conmutador Stacked / List | **A medias, y con cuidado.** Es la pantalla del punto del backlog *"agrupar los avisos como hace Google"*, pero ver abajo |
| **Bento Grid** | Lo mismo que el *Bento Skyline* de la tanda anterior, otra demostración | **Repetido.** No añade técnica; **añade insistencia**, que es el dato |

### Container Queries — por qué éste es el más valioso de los quince

Es el único que arregla un fallo **que ya tenemos documentado y que resolvimos a
mano**. En el código, el ancho de los nombres de estante está ajustado **contando
caracteres**: a los 12 una cosa, a los 17 otra, con el estante real de Jose
—*WINDOW WAREHOUSE*— escrito en los comentarios como el caso que no cabía. Eso es
lo que hay que hacer cuando no se puede preguntar *"¿cuánto espacio me ha
tocado?"*.

Container queries es exactamente esa pregunta. Una tarjeta de estante no sabe hoy
si está estrecha porque la pantalla es pequeña o porque la rejilla le dio menos
sitio — y **son dos cosas distintas que la app trata igual**. Con esto, la tarjeta
decide por su propio ancho y los ajustes a ojo sobran.

**Dos avisos para cuando se haga:**

1. **Funciona en los navegadores actuales** (Chrome, Safari y Firefox desde
   2023), pero **no degrada solo**: en uno viejo, la regla simplemente no se
   aplica y la tarjeta se queda con el estilo base. Hay que escribirlo de forma
   que el estilo base ya sea usable, no que dependa de la consulta.
2. **No sirve para las etiquetas impresas.** Ahí el ancho es de papel, en
   milímetros, y el escalado por número de caracteres se queda como está.

### List & Detail Panes — lo tenemos a medias ya

Settings ya es un riel con una barra lateral y un panel. Lo que el vídeo añade es
**qué hacer cuando no caben los dos**: la lateral se reduce a iconos, y luego el
detalle se come la pantalla entera con un camino de vuelta. Es la pieza que falta
para que Settings se use de verdad en un teléfono, y es la misma forma que
necesitaría un día el detalle de un movimiento.

### Notification Stack — a medias, y hay que decir por qué

Es la pantalla del punto que está abierto en el backlog. **Pero apilar esconde**,
y hay dos cosas ya decididas que esto no puede romper:

- **El aviso de sin conexión NO va ahí** — lo decidiste tú el 05/10, y tienes
  razón: la lista es para *lo que la app está haciendo*, y quedarse sin internet
  no es una tarea.
- **Un error no se apila nunca.** Un *"no se pudo guardar"* reducido a *"3
  notifications"* es un error que nadie lee, que es la forma de perder trabajo.
  Lo que se agrupa son los ✓ de lo que salió bien.

Así que de aquí me llevo **la forma** (el recuento, el abrir y cerrar), no la
regla de qué entra.

### Lo que esta tanda añade a las dos conclusiones anteriores

Las anteriores eran *"el contenido no cambia, cambia cuánto trabajo hace la
presentación"* y *"una técnica bonita en la pantalla equivocada quita
información"*. Ésta añade la tercera, y es la más útil de las tres:

**Lo que se repite en lo que manda Jose vale más que lo que dice cada vídeo
suelto.** Cuatro de quince son la misma idea de colocación. Ninguno de los cuatro
la pide con palabras; los cuatro juntos sí. **El rediseño, cuando se haga, empieza
por ahí** — una colocación declarada que se recoloca sola, probada al 157 %— y no
por las sombras y los degradados, que es por donde empezaría cualquiera mirando
los vídeos de uno en uno.

---

## Cuarta tanda, 2026-10-05 noche (5 vídeos) — y la idea va por la quinta vez

Otra vez **@davidm_ai**. Y **Responsive Breakpoints vuelve a ser la rejilla que
se recoloca sola**: van **cinco de veinticinco**. Ya no hace falta interpretarlo
más; está anotado arriba y es por donde empieza el rediseño.

Lo nuevo de esta tanda son dos cosas que **no son de estilo**, y una de ellas se
puede hacer mañana.

| Vídeo | Qué es | ¿Sirve para Acopio? |
|---|---|---|
| **Account Menu** | Menú de la cuenta: foto, nombre y correo, Mi perfil, Ajustes, Facturación, Ayuda, **"What's new" con un punto de novedad**, cambiar de cuenta, modo oscuro, cerrar sesión | **SÍ — y una parte se hace mañana.** Ver abajo |
| **HTML Semantic Elements** | `<header> <nav> <main> <section> <article> <aside> <footer>` en vez de `<div>` para todo, por accesibilidad y por que una máquina entienda la página | **SÍ, y es medible: lo tenemos a cero.** Ver abajo |
| **Workspace Sidebar** | Barra lateral con **cambiador de espacio de trabajo** (Mercedes, Porsche, Tesla, BMW…), que se encoge a un riel de iconos | **El riel sí; el cambiador, no todavía.** Ver abajo |
| **Responsive Breakpoints** | Seis regiones (header, sidebar, main, widget, stats, footer) recolocándose con `grid-template-areas` | **Repetido — quinta vez.** Confirma el patrón, no añade técnica |
| **CSS Border Radius** | Taller de redondeos: blob, círculo, pastilla, y un radio distinto por tipo de pieza (tarjeta, avatar, botón, burbuja) | **Poco.** Lo único que me llevo es el principio: **el redondeo es un valor por TIPO de pieza**, no uno para todo |

### El menú de la cuenta — hay un agujero que no había visto

Lo encontré comprobando este vídeo contra el código, y es de los que dan
vergüenza: **la app publica un changelog y nunca se lo enseña a nadie.**

Buscado en `Index_v3_fixed.html`: **cero menciones** a `changelog`, a
*"What's new"* o a la página de novedades. Escribimos dos changelogs en cada
versión —inglés y español— los publicamos en acopio-site, y **dentro de la app no
hay un solo enlace que lleve ahí**. El número de versión sale en el pie y no se
puede pulsar.

O sea: **un cliente nunca se entera de lo que mejora.** Pega el código, la app
cambia, y nadie le cuenta por qué. Todo el trabajo de escribir esos changelogs se
queda en una página que sólo visita quien ya sabe que existe.

**Lo que haría, y es pequeño:** *What's new* en el menú de la cuenta, con un punto
de novedad cuando `APP_VERSION` no es la que vio la última vez. **Pendiente de
decidir una cosa:** si abre la página web o si el texto viaja dentro de la app.
Lo segundo funciona sin internet y no manda a nadie fuera, pero obliga a llevar
el changelog en el archivo. Lo hablamos antes de hacerlo.

Del resto del vídeo: **el modo oscuro ya lo tenemos** (`[data-theme="dark"]`, 48
reglas), y *Facturación* y *cambiar de cuenta* no son de esta app.

### Los elementos semánticos — lo tenemos literalmente a cero

Contado en el archivo:

| | Cuántos hay |
|---|---|
| `<div>` | **707** |
| `<nav>` | 1 |
| `<main>`, `<header>`, `<section>`, `<article>`, `<aside>`, `<footer>` | **0 de cada uno** |

Lo bueno: `<button>` sí se usa de verdad (263), que es la parte que más importa
para poder manejar la app con el teclado.

**Lo digo sin exagerar su urgencia:** esto no rompe nada hoy ni es nada de lo que
Jose se haya quejado. Pero es gratis mientras se reescribe la colocación —que es
lo que va a pasar en el rediseño— y es lo que hace que la app se pueda manejar
con teclado, que la lea un lector de pantalla y, como dice el propio vídeo, que
una máquina entienda la página. **Cambiar 707 `<div>` por gusto, no; ponerlos bien
en lo que se toque, sí.**

### La barra lateral con cambiador — la mitad sí, la mitad no

**El riel que se encoge a iconos es la misma idea del *List & Detail Panes*** de
la tanda anterior, y es útil por lo mismo: Settings ya es barra lateral + panel.

**El cambiador de espacio de trabajo es otra cosa, y hay que decir por qué no se
puede hoy:** cada instalación de Acopio es **su propia hoja, su propio script y su
propia dirección**. Dos copias —la DEMO y la de verdad— no se ven entre sí, así
que un cambiador dentro de una no podría llegar a los datos de la otra. No es una
pantalla que falte: es una decisión de arquitectura que todavía está abierta, y
está en `PANEL-DE-CLIENTES.md` esperando que Jose elija camino A o B.

Donde sí encajaría **dentro de una sola instalación** es para **varios almacenes**
—el competidor del otro vídeo tiene ALMACÉN A / B / C—, pero eso es una
funcionalidad, no un estilo, y hoy no está ni pedida.

### Lo que esta tanda añade

Poco de estilo y dos cosas de fondo, que es mejor reparto del que parecía:

1. **Un agujero real encontrado**: el changelog que no se enseña. No lo habría
   visto sin este vídeo.
2. **Una medida, no una opinión**: 707 `<div>` y cero `<main>`. El rediseño tiene
   ahí una tarea concreta en vez de un buen propósito.

---

## Quinta tanda, 2026-10-06 (2 vídeos) — y uno de ellos ya lo teníamos hecho

| Vídeo | Qué es | ¿Sirve para Acopio? |
|---|---|---|
| **El botón, en seis pasos** (*Clintontheuiuxguy*) | Seis mejoras con NÚMEROS: tamaño, etiqueta, contraste, profundidad, detalle y movimiento | **SÍ — y el primero ya está hecho, mejor que en el vídeo.** Ver abajo |
| **Cómo crece una app de red** (*Building*) | Tácticas de arranque: traer un amigo, lista de espera, el efecto red | **No.** Acopio no es una app de red. Ver abajo |

### El del botón — el primero ya lo teníamos, y de los otros cinco valen tres

Es el único de los veintisiete que trae **números comprobables**, así que lo he
medido contra nuestro CSS en vez de opinar.

**1. TAMAÑO — *"44 px o el dedo falla"*. ✅ YA ESTÁ, Y NUESTRA VERSIÓN ES MEJOR.**

El vídeo dice 44 px de alto mínimo. Nosotros lo tenemos desde hace tiempo y
además **con el criterio correcto**: la regla está bajo `@media (pointer: coarse)`
—el dedo— y no bajo un ancho de pantalla, con el motivo escrito en el propio
archivo:

> *"(pointer: coarse) y no un ancho, a propósito: esto va del dedo, no de la
> ventana. Una tableta a 1024 px sigue siendo una pantalla táctil, y una ventana
> estrecha en un portátil sigue siendo un ratón — una regla por ancho se
> equivoca en los dos casos."*

Dentro hay 44 px para botones y pestañas, 36–40 px para los sueltos, y **34 px a
propósito dentro de una fila de tabla**, también razonado (44 doblaría el alto de
cada fila). El vídeo lo llamaría un fallo; nosotros lo decidimos sabiendo lo que
costaba. **Eso no se cambia por un vídeo.**

**2. ETIQUETA — *"di lo que va a pasar"*.** Ya lo hacemos (*Save*, *Release*,
*Publish*), y es la regla que seguimos en los avisos. Nada que corregir.

**3. CONTRASTE — *"un borde que se vea"*: etiqueta ≥ 4,5:1 y borde ≥ 3:1 contra
la página.** 🟡 **Esto sí hay que medirlo.** Nuestros `.btn-ghost` son fondo
transparente con `1px solid var(--border)`, y un borde gris claro sobre fondo
claro es justo el caso que el vídeo señala: *"un relleno al 1,6:1 no tiene borde,
y el botón desaparece"*. **No lo he medido todavía.** Es una comprobación
objetiva y barata, y encaja con lo que Jose pidió para las columnas escondidas
(*"opacas, no transparentes"*).

**4. PROFUNDIDAD y 5. DETALLE** (sombra hacia abajo, borde superior iluminado,
radio de pastilla, icono de 20 px con 10 px de hueco) — **es estilo**, y va con
el rediseño. Se guarda, no se hace suelto.

**6. MOVIMIENTO — *"cada toque contesta"*: 200 ms al pasar, 120 ms al pulsar y se
hunde 1 px.** 🟡 Hoy tenemos `transition:.15s` y un `filter:brightness(.92)` al
pasar por encima, **y nada al pulsar**. Y resulta que **esto conecta con un fallo
real que Jose ya reportó**: el botón de Release no parecía hacer nada. Una
respuesta al pulsar es la mitad de ese arreglo — la otra mitad es refrescar el
cartel, que ya está anotado.

### El de la app de red — no, y conviene decir por qué

Habla de cómo arranca una app que **vale más cuanto más gente la usa** (invitar a
un amigo, listas de espera). **Acopio no es eso.** Su valor para OX Glass no sube
porque lo use otra empresa; cada instalación es un mundo cerrado, y ésa es una
decisión de diseño y de seguridad, no una carencia.

**Lo único que rescato, y es pequeño:** la invitación que acabamos de construir
en la v12.42 es, técnicamente, un *"trae a un compañero"* — y es lo único de ese
vídeo que aplica, porque **dentro de una misma empresa** sí hay un efecto de que
entren todos.

Lo demás —lista de espera, viralidad— es para vender a consumidores. Lo que
mueve la aguja aquí está en `VENTAS.md` y no se parece.

---

## Estado

**27 vídeos recogidos. Esperando el resto.** Cuando lleguen, estas tablas crecen
y entonces —y no antes— se decide el rediseño y se trocea en el backlog.
