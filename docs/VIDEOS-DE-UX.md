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

## Estado

**Esperando el resto de los vídeos.** Cuando lleguen, esta tabla crece y
entonces —y no antes— se decide el rediseño y se trocea en el backlog.
