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

## Estado

**15 vídeos recogidos. Esperando el resto.** Cuando lleguen, estas tablas crecen
y entonces —y no antes— se decide el rediseño y se trocea en el backlog.
