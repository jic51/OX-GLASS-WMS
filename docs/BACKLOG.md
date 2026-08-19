# Acopio — Backlog

Running list of agreed-upon work, roughly in priority order. Items move out of
here once they ship (the commit message is the record of what changed and why).

## Next up

1. **Clean master template Sheet** — tooling shipped in v9.30 (Advanced →
   Erase everything / Check if clean). Remaining work is Jose's and cannot be
   done from code: rename the Apps Script project, share as Viewer, hand out the
   /copy link, and copy it once himself to see what a customer sees. See
   docs/MASTER-TEMPLATE.md.
2. **Polish the wizard's Copy button animation** — the checkmark transition works
   now, but the in/out timing still feels abrupt.
3. **Polish the company logo placement** in the topbar — it renders, but the
   sizing/position isn't what Jose wants yet. Jose says it is fine for now —
   waiting on him to say what he actually wants there.

4. **Group the Incoming list by kind of date as well as by state.** v9.55
   grouped it by what you need to do (Overdue / Expected / No date / Arrived /
   Cancelled). Jose also wants the option of grouping by how the date is known
   — exact, a window, approximate, unknown — which is a different question:
   the first asks "what do I chase today", the second asks "how solid is my
   plan". Same mechanism, so it is a small piece of work; worth doing once the
   flexible dates have been used for a while and it is clear which grouping
   people actually reach for.


5. **Rediseñar la ventana de Low-Stock Monitor.** Hoy es una parrilla de todos
   los materiales de golpe. Como lo quiere Jose:
   - El campo "Min" **deshabilitado** hasta que se marque su checkbox.
   - Arriba, centradas, **solo las etiquetas de categoría** en gris (el mismo
     gris de desactivado que ya usa la app), en orden alfabético.
   - Al hacer clic en una categoría toma **su propio color** y aparecen debajo
     sus materiales para marcar y ponerles mínimo. Se pueden activar varias.
   - Al volver a hacer clic se desactiva, y **abajo solo quedan los materiales
     con el checkbox marcado** (con el orden que tienen hoy, pero debajo del
     grupo de categorías).

   La idea de fondo: se empieza por la pregunta correcta — *"¿de qué categoría
   quiero vigilar algo?"* — en vez de por una lista de cientos de materiales.

6. **Iconos profesionales y logo de Acopio — EN PAUSA, a la espera de Jose.**
   El ZIP de Streamline ya está (45 iconos, PNG 48×48 + 4 SVG) y las tres
   propuestas de marca están dibujadas. Jose decide cuándo se hace y cuál se
   usa; las dos van en la misma pasada porque comparten el mismo trabajo.

7. **Copiar un sistema VIVO arrastra la lista de usuarios.** Jose copió el
   archivo de OX a su Drive personal y su correo personal ya estaba dentro,
   como WAREHOUSE, así que la copia nueva le daba menos permisos de los que
   correspondían a su propio archivo. No es un fallo — es lo que una copia hace
   — pero nadie lo espera. El wizard debería avisar cuando encuentra usuarios
   heredados y ofrecer vaciar la lista y dejar solo al dueño. La plantilla
   limpia ya resuelve el caso de un cliente; esto es para las copias que se
   hacen entre archivos propios.

## Open decision — access when the customer has no Workspace domain

The identification rule, verified in `getUserRole()`:

1. `Session.getActiveUser().getEmail()` returns an email ONLY when the visitor
   is in the same Google Workspace domain as the **owner of the copy** (or is
   the owner). Personal Gmail visitors get an empty string.
2. Otherwise the email has to come from a signed session token, issued by the
   "Sign in with Google" flow — which needs an OAuth client and its redirect URI
   registered by hand in Cloud Console.

`COMPANY_DOMAIN` plays no part in this. It is only used for wording on the
sign-in screen. Recognition comes from the real Workspace relationship between
visitor and owner, not from that property.

**So a company with no domain, where several people use personal Gmail, needs
the OAuth path for everyone except the person who made the copy.** That is the
scenario to solve, and there are three candidates:

1. **Register each customer's /exec URL on Jose's OAuth client.** Works today,
   ~5 minutes per customer, done once. Priced as a setup step.
2. **Broker redirect** — one fixed URL Jose owns that forwards back via the
   `state` parameter. One registration ever. Costs a permanent dependency on
   that broker and strict `state` validation.
3. **Deploy with `executeAs: USER_ACCESSING` instead of `USER_DEPLOYING`.**
   Then `getActiveUser()` returns everyone's real email with no OAuth client at
   all. NOT free: the script would run with each user's own permissions, so the
   owner has to share the spreadsheet and the Drive folders with them, every
   user sees the "unverified app" screen, and the whole "the server holds the
   owner's access, not yours" design changes. **Worth actually testing on a
   throwaway copy before deciding** — it is the only option that removes the
   manual step entirely, and its cost has not been measured.

Also worth writing into the setup guide either way: **if the company has a
Workspace domain, the copy must be made by a company account.** If someone
copies it with a personal Gmail, nobody in the domain is recognised
automatically any more — including the people who do have company accounts.

## Operación del negocio — riesgos anotados

**El cliente OAuth es un punto único de falla.** El ID y el secreto son de
Jose y quedan guardados en las Script Properties de CADA copia vendida.

- **Si se rompe algo con el acceso externo, revisar esto PRIMERO.** Es la pieza
  compartida entre todos los clientes: si falla, falla para todos a la vez, y
  eso se distingue de un problema de un solo cliente en treinta segundos.
- Un admin del cliente puede leer el secreto en sus propiedades. El daño posible
  es bajo (los permisos son solo nombre y correo) pero es real.
- **Si el proyecto de Cloud se pierde o se borra, las credenciales NO se
  recuperan.** Un cliente nuevo tiene un ID y un secreto nuevos, y hay que
  actualizarlos en la copia de cada cliente uno por uno, además de volver a
  registrar todas las URLs. Guardar el ID y el secreto fuera de Google, y no
  borrar ese proyecto nunca.

**Actualizaciones — decidido:** los bugs son prioridad y se empujan a todos los
clientes; las mejoras grandes se agrupan y se sueltan por tandas. La
actualización se cobra como parte del soporte mensual (opción 2 de las tres que
se discutieron). El Marketplace queda como la inversión que resolvería esto de
raíz, para cuando haya volumen que lo justifique.

## Polish pass (do at the end, after the functional work)

- **Scrollbars look bad.** Jose dislikes the default side scrollbar. Do NOT
  hide it outright: the bar is the only cue that a long Movements table or
  Settings list continues below, and removing it hides that from warehouse
  staff. Style it instead — thin (~6px), themed, low contrast, on the scrolling
  containers rather than the whole page.
- **Card removal animation.** When a card leaves either corner deck, the ones
  below should tilt slightly — less than the full pile angle — and slide up into
  the freed space, unhurried. Today it just disappears. Same treatment for the
  merge-suggestion boxes.
- **Audit every animation in the app.** Some look bad as they are, and several
  places that should have motion have none. Example raised: a merge-suggestion
  box currently just vanishes — it should collapse quickly and let the boxes
  below slide up into the freed space. Same question for toasts, modal
  open/close, row insertion in Movements, the deck fan, and tab switches. One
  pass, one consistent set of durations/easings, rather than tuning them one at
  a time.

## Idea to define — proactive data-quality suggestions

Jose's idea: the app notices gaps and inconsistencies and offers to fix them,
each as a card with two choices — "no supplier on the entry for X — add it?",
"no PM on the entry for X", "X and Y look like the same material — merge?".
Behind a Settings toggle, off by default.

The mechanics already exist (the suggestion deck, the similarity matcher, the
merge endpoints), so this is mostly rules plus judgement. What has to be
decided BEFORE building, because getting it wrong makes the app naggy and it
gets switched off for good:

- **Which gaps are worth raising at all?** A missing supplier on an internal
  transfer is not a problem; a missing supplier on a purchase probably is. The
  rules have to know the difference or every second movement raises a card.
- **When does it appear** — right after saving, batched daily, or only when
  someone opens the app? Immediately after saving is the most useful and the
  most annoying.
- **Who sees it?** Admin only, or the person who recorded the movement?
- **How does "Later" behave?** Never again for that row, or come back in a
  week? Never-again risks burying real gaps; recurring risks nagging.
- **A ceiling.** An installation importing a year of history would generate
  thousands at once. Needs a cap and a "review all" screen rather than a deck.

## Open decision — external sign-in for customers

Staff on the customer's own Google domain are identified automatically and need
no OAuth client. Only people OUTSIDE that domain (personal Gmail, contractors)
need the "Sign in with Google" button, which needs an OAuth client.

Google has **no public API** to add authorized redirect URIs to an OAuth client
— it is Cloud Console only, and there is an open feature request for it
(googleapis/google-cloud-go#10768). Every Apps Script copy has its own /exec
URL, so a shared client means registering each customer's URL by hand.

Three ways out, in preference order:

1. **Per-customer setup, as a paid step** (current behaviour). Ship with no
   OAuth client; enable it only for customers who ask, by adding their /exec URL
   to Jose's client. No work for the customers that don't need it.
2. **Broker redirect** — point the OAuth client at ONE fixed URL Jose owns,
   which forwards the code back to the customer's app via the `state`
   parameter. One redirect URI registered, ever, no per-customer work. Costs a
   permanent dependency on that broker staying up, and it must validate `state`
   strictly or it becomes an open redirect.
3. **Customer creates their own client** — full independence, but it is an hour
   of Cloud Console work no warehouse owner will do. Realistically dead.

Revisit when the first customer actually needs external access.

## Known limits (investigated, not fixable from code)

- **Self-deploy automation** — blocked by Google's hidden default Cloud project
  behind every Apps Script project. Can't enable APIs on it; switching to a
  standard project is irreversible and unavailable to personal accounts.
- **"Google hasn't verified this app" / missing Privacy Policy warnings** —
  permanently unavoidable per-customer under the copy-per-customer model, same
  root cause as above.
- **Inline PDF rendering** — Chrome's PDF viewer is a plugin, and plugins don't
  instantiate inside Apps Script's sandboxed googleusercontent.com frame. Worked
  around in v9.11 by showing Drive's server-side render of page 1; a true
  scrollable viewer would need PDF.js bundled in (~100 lines + testing).
- ~~Google's own Drive Picker~~ — NOT actually blocked. The first read of this
  was wrong: the Picker does need an API key from a standard Cloud project, but
  that project is Jose's and is configured once for all customers, not one per
  customer copy. Moved to Features as real work.

## Precios y costos — CORE construido en v9.78

**Lo de abajo es el diseño original; lo que sigue ya está construido y
verificado (20 aserciones en tools/test-pricing.js sobre el motor real).**

Lo que YA existe: costo opcional en cada línea de ENTRY (visible solo con
`canSeeCosts`), promedio ponderado recalculado y estampado por fila, EXIT/
WASTE/TRANSFER siempre valorados desde el promedio del servidor — nunca de lo
que mande el cliente —, y "Inventory Value" en el dashboard con el conteo
honesto de "X de Y SKUs con precio".

**Deliberadamente NO en esta pasada** — cada uno es su propio trabajo:
- **Costo por proyecto** (suma de EXIT × costo, agrupado por proyecto).
- **Desperdicio en dólares** (WASTE × costo, en el dashboard o un reporte).
- **Alerta de cambio de precio** ("este proveedor cobró 18% más que la vez
  pasada").
- **Columna de costo en el CSV de Movements** y en el import masivo.
- **Editar el costo de un movimiento ya guardado** — `modifyMovement` no toca
  las columnas de costo todavía; corregir una entrada con precio mal tecleado
  hoy no recalcula el promedio.

## Diseño pendiente — precios y costos en el flujo de datos

**Decidido en principio: costo promedio ponderado, calculado en la ENTRADA,
estampado en cada movimiento.**

Lo que hace un software de inventario normal: cada material tiene un costo, y
ese costo cambia con cada compra. Tres métodos estándar:

- **FIFO** — las unidades más viejas conservan su costo; se consumen en orden.
  Exige llevar *capas* (lotes) por material, y que alguien en bodega elija de
  qué lote sale cada salida. Es una segunda estructura de datos completa.
- **Promedio ponderado (WAC)** — un solo número por material, recalculado en
  cada entrada: `nuevo = (qty_ant*prom_ant + qty_ent*costo_ent)/(qty_ant+qty_ent)`.
- **Costo estándar** — un número fijo puesto a mano, con la diferencia contra
  lo real reportada aparte.

Se elige el promedio ponderado porque es un número por material y una fórmula
en la entrada, y porque es defendible ante un contador. FIFO es correcto pero
cuesta un modelo de lotes que ni la hoja ni el usuario de bodega aguantan.

**La pieza que casi todos hacen mal y hay que hacer bien: el costo se ESTAMPA
en la fila del movimiento.** Valorar una salida de hace un año con el promedio
de hoy da un número falso. Estampado, la historia es inmutable y auditable sin
recalcular nada.

Cambios concretos:
1. `MATERIALS`: `avg_cost` (calculado, no editable) y `last_cost` (referencia).
2. `MOVEMENTS`: `unit_cost` y `total_cost`. En ENTRY lo escribe el usuario (o
   total de factura ÷ cantidad); en EXIT/WASTE/TRANSFER lo rellena la app desde
   `avg_cost` y queda bloqueado.
3. Recalcular `avg_cost` en cada ENTRY.

Números que se desbloquean de inmediato:
- **Valor del inventario** en el dashboard — el único número que un dueño mira.
- **Costo por proyecto** — suma de EXIT por proyecto. Para OX Glass esto es lo
  más valioso: qué consumió realmente un trabajo.
- **Desperdicio en dólares** — WASTE × costo. Es el número que VENDE la app.
- **Gasto por proveedor y por periodo.**

Dónde podemos ser mejores que el software normal:
- **El costo es opcional por material.** Casi todos obligan a poner costo a
  todo. Aquí un material sin costo simplemente no entra en la valoración, y el
  dashboard dice honestamente "82% de tu stock está valorado". Es lo que hace
  que se pueda adoptar sin capturar 400 costos el primer día.
- **La app sugiere el costo de la última compra** en gris; escribir encima es
  una sola acción.
- **Alerta de cambio de precio** — "este proveedor cobró 18% más que la vez
  pasada". Barato de calcular, y es justo lo que un manager nota tarde.
- **Nunca inventar un costo.** Misma regla que las fechas en el importador de
  correo.

**Prerrequisito duro: permisos.** En una bodega la mayoría NO debe ver dinero.
Los permisos granulares dejan de ser opcionales y se vuelven el paso previo —
como mínimo una bandera `canSeeCosts` por rol antes de escribir la primera
columna de costo.

## Diseño pendiente — plantillas por industria (Store, Workshop…)

Investigado. Lo que un negocio tipo panadería/tienda necesita y una bodega no:

| Necesidad | ¿Lo tenemos? |
|---|---|
| Par levels / mínimos que disparan el pedido diario | **Sí** — es el Low-Stock Monitor |
| Desperdicio como métrica de primera clase | **Sí** — el tipo WASTE ya existe |
| Proveedores, entradas, historial | **Sí** |
| Categorías y unidades propias del rubro | **Sí**, solo hay que precargarlas |
| Caducidad por lote (FEFO: sale primero lo que vence primero) | **No** — feature real |
| Recetas (1 batch de pan consume 2kg de harina…) | **No** — feature real |
| Variantes (talla/color) y POS | **No**, y no es nuestro terreno |

**Conclusión honesta: una plantilla es un punto de partida, no otro producto.**
Podemos entregar un arranque "Store / Shop" que ayude de verdad, pero no
podemos llamarle sistema para panadería hasta que exista la caducidad.

Lo que una plantilla SÍ define (elegida en el wizard):
- Categorías y unidades de medida precargadas.
- Nombres de ubicación del rubro (Shelf / Cooler / Freezer / Dry storage en vez
  de Rack / Bay).
- **El vocabulario de la interfaz** — "Project" pasa a "Order" o "Job". Esta es
  la parte de mayor valor: es lo que hace que el cliente sienta que la app se
  hizo para él.
- Qué columnas se ven por defecto y reglas de mínimo de ejemplo.

Lo que NO cambia: el motor.

Tres arranques para empezar: **Warehouse** (lo que hay), **Store / Shop**,
**Workshop / Contractor**. Una panadería usa Store, más caducidad cuando exista.

Es además la forma más barata de ampliar el mercado: ~un día de trabajo por
plantilla, cero cambios de motor.

## Features — agrupados por dificultad

### Fáciles (una sesión cada uno)
- **Iconos profesionales** en vez de emojis. Bloqueado solo en que Jose baje
  los archivos. Qué pedir en Flaticon: **SVG** (no PNG), **una sola familia /
  estilo** para las ~50 que usa la app, trazo (outline) y no relleno de color,
  y en un solo ZIP. Estáticos primero; los animados solo para el splash y los
  estados vacíos, nunca en botones.
- **Icono de la app** (el que se ve al agregarla a la pantalla del teléfono).
  Trivial una vez haya diseño.
- **Auditoría responsive** — revisar y ajustar pantalla por pantalla. Sin
  lógica nueva, pero son varias pantallas.

### Medianos (dos a cuatro sesiones)
- **Rediseñar el Low-Stock Monitor** (ver arriba).
- **Sincronización entre ventanas abiertas.** Apps Script no tiene push, así
  que es sondeo: un `getVersionStamp` barato cada N segundos y recargar solo si
  cambió. El costo es cuota de ejecución, así que el intervalo hay que
  elegirlo con cuidado y apagarlo con la pestaña en segundo plano.
- **Limpieza del error log** — HECHO en v9.64.

### Grandes (una semana o más)
- **Precios y costos** (ver arriba). Ya no está bloqueado — el prerrequisito
  (permisos granulares) se resolvió en v9.76.
- **Plantillas por industria** (ver arriba).
- **QR / códigos de barras + impresión de etiquetas.**
- **Sugerencias proactivas de calidad de datos** (ver más abajo).
- **Drive Picker real** — bloqueado en que Jose cree el proyecto de Cloud.
- **Caducidad por lote (FEFO)** — prerrequisito de cualquier cliente de comida.

### Bloqueado por la plataforma — NO prometer
- **PWA instalable con modo offline.** Verificado: Apps Script sirve el HTML
  dentro de un iframe sandbox en googleusercontent.com, y un service worker no
  se puede registrar desde ahí — es el componente que hace que un PWA funcione
  sin conexión. Google lo documenta como restricción del HTML Service y nadie
  en la comunidad ha logrado desplegar un web app de GAS como PWA.
  Lo que SÍ se puede: "Agregar a pantalla de inicio" en Android y iOS crea un
  acceso directo con nuestro icono. Da el icono en el teléfono, no el offline.
  El offline de verdad exigiría sacar el frontend de Apps Script a un hosting
  propio, que es otro producto.

## Operational

- **PENDIENTE — actualizar la Política de Privacidad.** v9.77 agregó el
  check-in automático (día 3 / día 7 sin movimientos → un correo privado a
  `SUPPORT_EMAIL`, nunca al cliente). No manda contenido del inventario, pero
  sí manda nombre de empresa, correo del admin y un conteo — y eso sale del
  Drive del cliente, lo cual la política actual dice que nunca pasa. Falta una
  línea honesta en `docs/legal/PRIVACY-POLICY.md` antes de que esto llegue a
  un cliente real. No es urgente hoy (cero clientes, `SUPPORT_EMAIL` vacío en
  todo lado), pero si se activa antes de arreglar el texto, queda una promesa
  rota por escrito.

