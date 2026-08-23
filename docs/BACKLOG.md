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
   now, but the in/out timing still feels abrupt. Jose (v9.89): leave it for
   later, not urgent.

2b. **Splash screen phrase rotation — explicitly for the NEXT version (Jose,
    v9.90), not this one.** Two changes to the rotating phrases under the
    logo on the loading screen: (1) add half a second to how long each
    phrase stays up before rotating to the next; (2) change the transition
    itself — not a plain fade, the current phrase should slide up and fade
    out while the next one slides up into place from below, instead of
    just disappearing/appearing in place. tools/test-splash-notes.js covers
    the rotation today and will need updating for both once this is picked
    up.
2c. **Botón de correo en la alerta de stock bajo** — idea de Jose (v10.6).
    En la barra de alertas del dashboard (`⚠ Below Minimum (N)` / `Zero
    Stock`), un botón que mande un correo ya redactado con **la lista de
    materiales por debajo del mínimo o en cero**: nombre, categoría, cuánto
    queda, cuál es el mínimo y —si está en Incoming— cuánto viene y para
    cuándo.

    El caso de uso es diario: el jefe de bodega ve la alerta y tiene que
    avisarle a compras o al PM. Hoy eso es mirar la pantalla y escribir el
    correo a mano, que es donde se pierde o se escribe mal.

    Los datos ya están calculados en `renderStats` (`belowMin`, `zeroItems`),
    así que el trabajo real es el formato del mensaje y dos decisiones que hay
    que hablar antes de construir:
    - **¿A quién va?** Un destinatario fijo en Settings, el Directory, o
      elegirlo en el momento.
    - **¿Lo envía la app o el usuario?** `MailApp` (como ya hacen los avisos de
      movimientos) deja registro y no depende del correo del empleado;
      `mailto:` abre su cliente con todo prellenado y le deja revisar y editar
      antes de mandar. No es lo mismo y conviene decidirlo, no elegirlo por
      descuido.

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
   people actually reach for. Jose (v9.89): maybe version 2, not this one.

4b. **Incoming — this week's orders on the visible calendar, editable from
    there (v9.90).** Right now the calendar just shows dots/markers; Jose
    wants the week's actual orders to appear ON it, and be editable,
    modifiable, and markable as received directly from that view instead of
    only from the list.

4c. **Incoming — receive a material and create the ENTRY from that same
    window, in one motion (v9.90). Needs real discussion before building.**
    Jose's own flag: OX Glass itself is an example of a business that often
    doesn't know exactly WHAT is arriving or WHEN — so an Entry built
    straight from an Incoming record risks getting made with wrong or
    incomplete information (category, quantity, unit cost) if the order
    itself was vague. Questions to settle first: does this only activate
    for orders with solid data already, and fall back to the normal
    open-ended Entry form otherwise? Does receiving partially (less than
    ordered) need its own path? Is the Incoming record's data ever
    authoritative over what's actually counted in at the dock, or always
    just a starting point the person receiving can freely change?


5. **Iconos profesionales y logo de Acopio — EN PAUSA, a la espera de Jose.**
   El ZIP de Streamline ya está (45 iconos, PNG 48×48 + 4 SVG) y las tres
   propuestas de marca están dibujadas. Jose decide cuándo se hace y cuál se
   usa; las dos van en la misma pasada porque comparten el mismo trabajo.

6. **Copiar un sistema VIVO arrastra la lista de usuarios — Jose (v9.90) no
   cree que haga falta resolver esto; en discusión.** Su argumento: los
   clientes van a descargar la plantilla limpia y usarla, no van a copiar el
   código de un cliente existente para usarlo por su cuenta — y si alguien
   lo hace de todos modos, eso es un problema legal de ellos, no nuestro.
   Mi lectura, para que decidamos con el caso real en mente en vez del
   caso que suena a robo: el escenario que originó este punto NO fue nadie
   copiando el sistema de un tercero — fue Jose copiando SU PROPIO archivo
   ya en uso (a su Drive personal), algo que cualquier dueño de un Sheet
   puede hacer con "Hacer una copia" de Google en dos clics, sin pasar por
   nosotros ni por el wizard. Un cliente real puede hacer exactamente lo
   mismo por razones legítimas — abrir una segunda bodega, sacar un
   respaldo antes de un cambio grande, armar una copia de prueba — y esa
   copia hereda TODOS los usuarios y roles del archivo original. El riesgo
   no es robo de propiedad intelectual; es que un empleado que ya no
   debería tener acceso (o que nunca debió tenerlo en esa bodega nueva)
   termine con acceso real a datos que no le corresponden, sin que nadie lo
   note. Es un riesgo real pero pequeño y poco frecuente. Recomendación: no
   vale la pena construir UI para esto ahora — una línea en la guía de
   configuración ("si copias tu propio archivo, revisa la lista de
   usuarios") cubre el caso a costo cero. Se puede revisar si empieza a
   pasar de verdad con clientes reales.

7. **Tracking de dispositivo/ubicación en movimientos y errores — alcance
   decidido (v9.90).** No es ubicación geográfica — es saber DE QUÉ
   DISPOSITIVO y CON QUÉ CUENTA ocurrió un error o un problema, para poder
   dar soporte. Jose confirmó el caso de uso exacto: poder decirle a un
   cliente "el dispositivo #### con la cuenta de JOSE CASTRO causó este
   error varias veces, en estas ocasiones" — para que el cliente decida qué
   hacer. La cuenta ya se guarda hoy (`userEmail` en ARCHIVE y en
   ERROR_LOG); falta el dispositivo/navegador, capturable vía
   `navigator.userAgent` en JS sin pedir permiso (nada que ver con
   geolocalización real). Acotado a `ERROR_LOG` — no a cada movimiento
   normal, que no necesita este dato y solo agranda ARCHIVE sin beneficio.
   Sin construir todavía.

8. **Notificaciones en vivo para el admin — Jose confirmó (v9.90): son
   AMBAS ideas, no una sola.**
   - **Idea A — tarjeta al momento.** "Jose movió 4 WINDOW de GLASS a B2B"
     aparece del lado izquierdo si el admin está en Dashboard o Warehouse
     Map (no hace falta si ya está viendo Movements); clic en la
     notificación lleva a esa fila en Movements & History y la resalta —
     mismo mecanismo que `_showMovementRows`/`.row-spotlight` que ya usan
     las tarjetas de "el sistema hizo esto solo" en Settings → System, así
     que la parte de "llevar y resaltar" ya existe y solo hay que
     reutilizarla. Preguntas reales antes de construir: ¿en tiempo real de
     verdad (empuje desde el servidor) o solo cuando el navegador ya está
     haciendo un refresh de todos modos (mismo patrón que
     `_refreshOpenRackDrawer`, v9.83 — sin trigger nuevo, sin polling
     nuevo)? Apps Script no tiene push real hacia el navegador sin algo
     como Firebase detrás, así que la opción honesta y gratis es la
     segunda: la próxima vez que `_applyData` corra con movimientos nuevos
     desde la última carga, comparar y armar las tarjetas de ahí. ¿Solo
     para movimientos de WAREHOUSE, o de cualquiera que no sea el propio
     admin? ¿Se pueden descartar como las tarjetas de "el sistema hizo esto
     solo"?
   - **Idea B — resumen de fin de día.** Cuando alguien de Warehouse deja
     un Entry o movimiento sin supplier/proyecto/etc., aparece la tarjeta
     de la idea A al lado. Si esa persona NO la corrige (o le pone "Not
     now"), al final del día se le avisa al admin con TODO lo que quedó
     sin corregir esa jornada, en un solo resumen. Jose no está seguro de
     si originalmente esto se había decidido como correo o como
     notificación dentro de la app — **falta confirmar el canal** antes de
     diseñar. Se parece en mecánica a "Sugerencias proactivas de calidad de
     datos" (más abajo, la deck de sugerencias ya construida) pero con un
     timing distinto (fin de día, no al momento) y un destinatario distinto
     (el admin sobre el trabajo de otros, no la persona que hizo el
     movimiento). Sin diseñar todavía — ni el canal, ni el disparador exacto
     de "fin de día" (¿hora fija? ¿cierre de turno?), ni si se agrupa por
     persona o por tipo de dato faltante.

9. **Menú de hamburguesa en pantallas pequeñas.** Idea de Jose (v9.88): en vez
   de las pestañas de navegación normales, un ícono de hamburguesa en móvil que
   abre el menú; una vez elegida una pestaña, se muestra la hamburguesa junto
   al nombre de la pestaña activa en vez de la fila completa de pestañas.
   Explícitamente para una versión futura, no esta — sin diseñar todavía.

10. **Nombre "Acopio" con hipervínculo (v9.89, pedido nuevo de Jose).** Debe
    apuntar a la página de Acopio, y al hacer clic mostrar una confirmación
    ("estás saliendo de Acopio, ¿deseas continuar?") antes de navegar.
    Bloqueado en un solo dato: **falta la URL real de destino** — nunca se
    debe inventar una URL, así que esto espera a que Jose la mande.

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
- **Toast delay feels laggy — replace with inline spin → check at the point of
  action (v9.80 feedback).** Jose's complaint: a toast showing up ~3 seconds
  after an action (not staying 3 seconds — SHOWING UP 3 seconds late) reads as
  the app being slow, even though it isn't broken. Root cause confirmed: that
  gap is real `google.script.run` round-trip time to Apps Script (serialize →
  dispatch to the sandboxed execution → run → serialize back), which routinely
  runs 1-4s even for a trivial call — nothing in our code controls that, so it
  cannot be "sped up" as asked.
  What CAN change: give feedback the INSTANT the user acts, not after the
  round trip. **Corrected after checking the actual code (Jose caught my
  first description being wrong):** the busy/done infrastructure
  (`_btnBusy`/`_btnDone`, v9.66, tools/test-button-states.js) does NOT
  uniformly show a tick on the button today. `submitMovement`'s single-material
  path (`_doSubmit`, ~line 5644) does it right — `_btnDone(btn, true, function(){
  closeModal(...) })` holds a ✓ on the button for 700ms before the window
  closes, exactly the "don't vanish the instant you click Save" behavior this
  item wants everywhere. But the multi-material ENTRY path (`_doMultiSubmit`,
  ~line 6580 — Materials to Receive, the more commonly used flow) never got
  the same treatment: it calls `_setModalBusy(...,false)` and `closeModal(...)`
  immediately after the spinner, with no `_btnDone` in between, so the button
  never shows a check at all — the ✅ the user sees is purely the toast's icon,
  arriving 400ms later, off in a different part of the screen, after the
  window is already gone. Fixing this item means: (1) wire `_doMultiSubmit` up
  to `_btnDone` the same way `_doSubmit` already is, and (2) THEN decide
  whether that's enough (submitMovement's pattern extended everywhere a
  `<button>` exists) or whether non-button controls (the Permissions
  switches — `_savePermSwitch` just disables the checkbox today, no spinner
  at all — catalog rename/merge, etc.) also need a lighter inline spin→check
  variant. Two different sizes of fix bundled under one complaint; scope
  precisely once this is picked up.
- **Info icon leading vs. trailing — refined rule (corrected same feedback
  round).** NOT "always move it before the label" — Jose's actual rule:
  where the underlying text is KEPT (an icon added alongside text that still
  shows), the icon leads (`ⓘ` before the label), so it reads as "there's more
  here" before the reader gets to the text. Where the text was REMOVED and
  the icon is now the only way to see it (every `_infoIc()` use shipped in
  v9.80 — Permissions' 4 switches + the role-label field, Company's 3 fields,
  System's 2 fields), it stays exactly where it already is, trailing — no
  code change needed there, all nine are correct as shipped. This rule only
  bites the next time an icon is added next to text that stays visible, not
  the ones already built. Applies everywhere `_infoIc` is used (NOT the Setup
  Wizard, which keeps its always-visible hints per the same conversation).

## Proteger el código — pregunta de Jose (v9.95), respuesta honesta

**Realidad de partida:** el código se entrega como fuente dentro del proyecto
de Apps Script del cliente. Puede leerlo, copiarlo y modificarlo. **No existe
ninguna forma de impedirlo** — no hay DRM en Apps Script. Cualquier propuesta
que empiece por "que no lo puedan copiar" es falsa.

Lo que sí es posible, de más a menos recomendable:

1. **Marca de origen (watermark) — RECOMENDADO, barato.** Un identificador
   único por instalación, generado en el primer arranque y guardado en Script
   Properties, más una constante de producto/versión ya presente. No impide
   copiar; sirve para **demostrar** de dónde salió una copia si algún día hace
   falta. Costo: casi cero. Ya existe media pieza (`APP_VERSION`, `PRODUCT`).
2. **Aviso de copyright + Términos de servicio — RECOMENDADO.** Ya hay
   `legal/TERMS-OF-SERVICE.md`. Para este modelo de negocio, esta es la
   protección real: no es técnica, es legal.
3. **Verificación de licencia contra un servidor de Jose ("llamar a casa") —
   NO recomendado.** Técnicamente se puede (`UrlFetchApp`). Tres problemas
   serios: (a) el cliente puede simplemente borrar esas líneas, es fuente
   abierta ante sus ojos; (b) crea un punto único de falla — si el servidor de
   Jose se cae, **todos los clientes que pagan** se quedan sin app; (c) un
   interruptor remoto que puede apagar la bodega de alguien es exactamente el
   tipo de cosa que destruye la confianza del cliente. El daño esperado supera
   al beneficio.
4. **Mover la lógica valiosa a un servidor propio — efectivo pero cambia el
   producto.** Es lo único que de verdad protege: si el cálculo vive en un
   servidor de Jose, copiar el script no copia la lógica. Pero destruye el
   argumento de venta actual (tus datos en TU Drive, sin depender de nadie),
   agrega hosting, y convierte esto en otro producto.

**Sobre "el código usa nuestras claves":** cierto que `OAUTH_CLIENT_ID` y
`OAUTH_CLIENT_SECRET` son de Jose, pero no sirven como palanca — solo
habilitan el login de gente fuera del dominio, y quien copiara el sistema
puede crear su propio cliente OAuth en 20 minutos. No es protección.

**El punto que importa más que todo lo anterior:** lo que se vende no es el
código, es el servicio — actualizaciones, soporte, instalación. Quien copie
el archivo se queda con una foto congelada, sin arreglos ni mejoras. Eso ya
es la protección más fuerte que tiene este modelo, y no hay que construir
nada para tenerla.

## Tarjeta de reenganche para clientes que dejaron de pagar — idea de Jose (v9.95)

**La idea:** cada ~6 meses, una sola vez, mostrar una tarjeta tipo "no te
pierdas las mejoras — acopio.com / service@acopio.com" con link al listado de
novedades y correcciones. Descartable, visualmente distinta de las tarjetas
normales, y en otro lugar, para no ser molesta.

**Lo que está bien:** la restricción que Jose se puso solo — poco frecuente,
descartable, sin bloquear nada — es exactamente lo que separa un recordatorio
útil de spam dentro de una herramienta que el cliente pagó.

**El problema de diseño, y cómo evitarlo:** la app **no sabe quién paga**. No
hay estado de licencia ni suscripción en ningún lado, y tampoco sabe si
existe una versión más nueva — el banner de "version mismatch" solo compara
Code.gs contra Index.html DENTRO de una instalación, no contra la última
versión publicada. Averiguar cualquiera de las dos cosas exige llamar a un
servidor de Jose, con todos los problemas del punto 3 de la sección de
arriba.

**Propuesta: hacerlo por tiempo, no por licencia.** Guardar en Script
Properties la fecha de instalación (ya existe `SETUP_COMPLETED_AT`, usado por
el check-in) y mostrar la tarjeta cuando hayan pasado 6 meses desde la última
vez que se mostró. Sin red, sin estado de pago, sin poder equivocarse. El
texto no afirma que haya algo nuevo — invita a ir a ver, que es justo lo que
Jose describió.

**Decisiones antes de construir:**
- **Solo ADMIN.** Un trabajador de bodega no puede comprar nada; para él es
  publicidad pura.
- **Dónde.** Jose pidió que no sea el deck normal. Settings → System es el
  lugar más honesto (donde ya se habla del estado del sistema), pero se ve
  poco. Alternativa: una franja discreta bajo el header, solo para admin.
- **"Descartar" tiene que durar.** En Script Properties, no en localStorage —
  descartarla en la computadora y que reaparezca en el teléfono la convierte
  en lo que se quería evitar.
- **BLOQUEADO:** acopio.com no existe todavía, y el listado de novedades
  tampoco. Sin esos dos, no hay a dónde mandar a nadie. Va después de la
  landing.

## Cycle count / conteo físico — idea de Jose (v9.91), diseño propuesto

**El problema real:** un cliente quiere revisar si lo que está físicamente en
la bodega coincide con lo que dice la app, y corregir las diferencias. Hoy no
hay ninguna forma de hacerlo.

**La idea original de Jose:** recorrer ubicación por ubicación dando check a
lo que encuentra; al final se compara lo marcado contra lo no marcado y se
muestra la lista de lo NO encontrado, con todos los datos del material
(cantidad, ubicación, fecha de recepción, movimientos desde el ENTRY) para
buscarlo bien; si de verdad no está, se elimina o se corrige.

**Lo que está bien de esa idea y hay que conservar:**
- **Recorrer por UBICACIÓN, no por lista de materiales.** Es exactamente como
  se cuenta en la vida real (uno se para frente a un rack, no busca un
  material por toda la bodega). Buen instinto.
- **"Búscalo bien antes de darlo por perdido"** con el historial completo del
  material a la vista. Esto es genuinamente valioso y ningún sistema barato lo
  hace. Los movimientos ya existen en ARCHIVE, así que sale casi gratis.

**Lo que yo cambiaría, en orden de importancia:**

1. **El check binario es el hueco más grande.** La diferencia más común NO es
   "desapareció" — es "debería haber 40 y hay 37". Un checkbox no puede
   expresar eso. Cada línea necesita un campo de cantidad contada.
   **Recomendación: conteo a ciegas (blind count) por defecto** — que la
   persona escriba lo que ve SIN ver primero lo que la app esperaba. Mostrar
   el número esperado sesga fuertemente hacia confirmarlo ("sí, se ve más o
   menos igual") y es la razón número uno por la que los conteos salen
   limpios y el inventario sigue mal. Es barato de construir y es lo que más
   mejora la exactitud. Con un interruptor para apagarlo.

2. **NUNCA borrar ni editar el historial. Escribir un ajuste.** Esto no es
   preferencia, es forzado por la arquitectura: el stock NO se guarda en
   ningún lado, se recalcula reproduciendo cada movimiento
   (`calculateStock()`), y los costos van estampados por fila. Borrar un
   ENTRY reescribe el pasado y cambia retroactivamente el promedio ponderado
   y todo lo que dependa de él. El resultado correcto de un conteo es un
   movimiento NUEVO que dice "el día D contamos y ajustamos de 40 a 37,
   motivo X".
   **Recomendación: un 6º tipo de movimiento, `ADJUST`/`COUNT`.** Hoy solo
   existen ENTRY, EXIT, TRANSFER, RETURN, WASTE. Se podría reusar WASTE para
   los faltantes, pero WASTE significa "dañado/consumido", que es mentira si
   fue un error de captura — y sobre todo **WASTE no puede expresar un
   SOBRANTE** (encontrar más de lo esperado, que pasa seguido cuando algo se
   guardó en el rack equivocado). Registrar un sobrante como ENTRY inventa
   una compra que nunca ocurrió y corrompe el costo promedio, justo contra la
   regla de "nunca inventar un costo" que ya está en este documento. Costo del
   6º tipo: tocar `calculateStock`, la validación de `addMovementsBatch_`, los
   badges/filtros del frontend y el motor de costos.

3. **Un conteo es una SESIÓN, no un momento.** Contar una bodega toma horas o
   días y suele hacerlo más de una persona. Necesita guardarse y poder
   retomarse: quién lo empezó, qué fecha, qué racks cubre, cuánto lleva
   avanzado. Sin esto, un refresh del navegador borra todo el trabajo y nadie
   va a terminar un conteo nunca.

4. **Hace falta un botón de "encontré algo que no está en esta lista".**
   Sutileza que la versión original se pierde: si solo muestras "lo que la app
   cree que hay en A1A" para palomear, **es imposible descubrir un material
   que físicamente está en A1A pero la app cree que está en otro lado**. Y
   encontrar stock mal ubicado es una de las cosas para las que existe un
   conteo físico.

5. **El entregable es el reporte de variaciones.** Al terminar: lista de
   diferencias con esperado / contado / delta, **el valor en dólares del
   delta** (los costos ya existen desde v9.78), y un clic para aceptar y
   escribir el ajuste. Guardar el registro del conteo permite después ver "en
   este material siempre salimos cortos" — que es como se detecta un robo o
   un proceso roto.

6. **Control de alcance.** Todos piden "contar toda la bodega" y nadie lo
   termina. La práctica real es conteo cíclico ABC: lo caro y lo que más se
   mueve se cuenta seguido, el resto rara vez. La app ya tiene costos e
   historial de movimientos, así que podría SUGERIR qué contar. Pero para una
   v1, basta con "elige unos racks y cuéntalos".

**Propuesta de alcance para una v1 realmente construible:** sesión de conteo
guardada → elegir racks → recorrer rack por rack escribiendo cantidades a
ciegas → botón de "encontré algo más" → reporte de variaciones con valor en
dólares → aceptar y escribir movimientos `ADJUST`. El panel de detalle con el
historial del material (la mejor parte de la idea de Jose) va en el reporte de
variaciones, que es donde de verdad se usa: cuando ya sabes que hay una
diferencia y necesitas entender por qué.

**Sin decidir todavía:** ¿quién puede hacer un conteo (WAREHOUSE, o solo
ADMIN)? ¿aceptar los ajustes necesita permiso aparte, dado que mueven dinero?
¿se congela el rack mientras se cuenta, o se permite que alguien haga un
movimiento a media sesión (y entonces la variación se calcula contra qué)?

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

## Roles — 3 fijos + permisos desde v9.76, nombre del WAREHOUSE editable desde v9.79

Siguen siendo 3 roles fijos internamente (ADMIN/WAREHOUSE/VIEWER — USERS_V3 y
cada `role ===` en el código nunca cambian). Lo que SÍ es ajustable ahora:

- **v9.76** — 4 interruptores (`canSeeCosts`, `canEditMovements`,
  `canManageCatalog`, `canExportData`) que ensanchan lo que WAREHOUSE puede
  hacer, uno por uno. Settings → Permissions.
- **v9.79** — el ADMIN puede renombrar cómo se MUESTRA el rol WAREHOUSE en
  toda la app (badges, menú de cuenta, formulario de usuarios) — "Supervisor",
  "Manager", lo que ya use el cliente. Solo texto: no toca el valor guardado
  ni ningún chequeo de permisos. Verificado en tools/test-role-label.js.

**Un 4to tipo de rol de verdad (no solo un WAREHOUSE con más permisos) sigue
sin construirse.** Exigiría rediseñar `requireAuth_`, cada chequeo de rol, los
valores posibles en USERS_V3, el `<select>` de rol y la aplicación de permisos
en todo el código — un rediseño real, no una extensión. El sistema de
permisos ya construido cubre buena parte de lo que un 4to rol daría en la
práctica (un WAREHOUSE con ciertos interruptores prendidos y otros no ya se
comporta como un nivel distinto). Roles verdaderamente personalizados es
trabajo legítimo para una versión futura, no para ahora.

## Precios y costos — CORE en v9.78, costo por proyecto y desperdicio en v9.79/v9.80, alerta de precio en v9.87

**Lo de abajo es el diseño original; lo que sigue ya está construido y
verificado (20 aserciones en tools/test-pricing.js sobre el motor real).**

Lo que YA existe: costo opcional en cada línea de ENTRY (visible solo con
`canSeeCosts`), promedio ponderado recalculado y estampado por fila, EXIT/
WASTE/TRANSFER siempre valorados desde el promedio del servidor — nunca de lo
que mande el cliente —, "Inventory Value" en el dashboard con el conteo
honesto de "X de Y SKUs con precio", (v9.79) el tile "Project Cost" en
Project View — suma de `EXIT.totalCost` para ese proyecto, verificado en
tools/test-project-cost.js (RETURN/WASTE no cuentan, un EXIT sin costo no
rompe la suma, sin ningún EXIT con precio el tile simplemente no aparece),
(v9.80) el tile "Waste Cost" en el dashboard — suma de `WASTE.totalCost`
estampado (nunca recalculado del promedio de hoy), verificado en
tools/test-waste-cost.js con el mismo patrón honesto: sin ningún WASTE con
precio, el tile no aparece en vez de mostrar $0 — y (v9.87) la alerta de
cambio de precio en ENTRY: al escribir un Unit Cost que difiere ≥15% del
promedio en `config.avgCost` para ese material, aparece un aviso inline
justo debajo del campo ("20% higher/lower than the average on record —
$20.00 → $24.00"). Avisa en ambas direcciones, no solo subidas (una bajada
también es información útil). 15% es el umbral elegido — el ejemplo de Jose
fue 18%, ajustable si en la práctica suena demasiado o muy poco sensible.
Verificado en tools/test-price-alert.js (21 aserciones): no avisa dentro del
umbral, no avisa sin promedio previo que comparar, no avisa con costo o
nombre vacíos, y el aviso se limpia solo si el número se corrige.

**Deliberadamente NO en esta pasada** — cada uno es su propio trabajo:
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
- **Rediseñar el Low-Stock Monitor** — HECHO en v9.74.
- **Sincronización entre ventanas abiertas — Jose quiere hacerlo (v9.90).
  Decidido en la conversación, sin construir todavía:**
  - Sondeo (polling), no push real — Apps Script no lo tiene. Cada N
    segundos, una llamada barata (`getVersionStamp` o similar — NO recarga
    todos los datos, solo un número/hash) pregunta "¿cambió algo desde la
    última vez?"; solo si la respuesta es sí se dispara una actualización.
  - **Se apaga con la pestaña en segundo plano** (`document.visibilityState`)
    — decidido, para no gastar cuota de ejecución en pestañas olvidadas
    abiertas. Intervalo exacto (¿15s? ¿30s?) por definir al construirlo.
  - **Enfocado en stock y movimientos únicamente** — decidido. Usuarios,
    config y permisos NO se sincronizan en vivo; se actualizan solos la
    próxima vez que esa pestaña recargue la página normalmente.
  - **La actualización NO puede ser una recarga completa de la página, ni de
    todas las pestañas.** Decidido, y es la parte que más cambia el diseño
    original: cuando algo cambia, solo se actualiza el dato puntual que
    cambió (el número, el nombre, el material específico) en la pestaña
    donde el usuario está activo ahora mismo — nunca todas las pestañas
    abiertas, y nunca la página completa. Esto es bastante más trabajo que
    un simple "recargar stock de fondo": hace falta que el servidor pueda
    decir QUÉ cambió puntualmente (no solo "algo cambió"), y que el
    frontend sepa parchar solo esa celda/número en el DOM sin re-renderizar
    toda la tabla — evita perder lo que alguien esté escribiendo a medio
    llenar en un formulario de Entry, que era la preocupación original.
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


## Icono de pestaña por cliente ("Nivel 2") — aplazado a propósito en v10.3

**Lo que SÍ quedó (v10.3):** un solo icono de Acopio para todas las
instalaciones, en `ACOPIO_FAVICON_URL`. Cero acción del cliente. La constante
está **vacía todavía** porque `setFaviconUrl` necesita una URL pública que los
servidores de Google puedan pedir sin credenciales, y Acopio aún no tiene casa
pública. Vacío = el comportamiento de hoy, sin estados a medias. Encenderlo es
cambiar **una línea**: `acopio.com/favicon.png`, o un PNG cuadrado en el Drive
**de Jose** compartido "cualquiera con el enlace"
(`https://drive.google.com/uc?export=view&id=ID`) — el Drive del cliente no se
toca, así que no se publica nada de él.

Decisión de Jose: *"hagamos así por ahora, si sale otra mejor opción en el
futuro lo cambiamos, sino lo dejamos así para siempre."* Y es la decisión
comercialmente correcta además de la barata: cada pestaña abierta en cada
bodega mostrando el icono de Acopio es la diferencia entre parecer un producto
y parecer una hoja de cálculo.

**Lo aplazado — el icono propio de cada cliente.** No es una línea, es una
feature:

1. **Hay que publicar un archivo del Drive del cliente.** El logo ya vive ahí
   (`COMPANY_LOGO_ID`), pero dentro de la app se muestra porque **el servidor
   lee el archivo privado y manda los bytes**. Un favicon no puede: lo pide el
   navegador desde la página de Google, sin permisos. Hace falta
   `setSharing(ANYONE_WITH_LINK, VIEW)` sobre un archivo del cliente — con
   consentimiento explícito, nunca en silencio.
2. **Falla sola en empresas grandes.** Muchos Google Workspace prohíben
   compartir fuera de la organización. El `setSharing` falla justo con los
   clientes que más pagan. Hay que detectarlo, caer al icono de Acopio y
   **decírselo**, no dejarlo mudo.
3. **Un logo ancho en 16 píxeles es una mancha.** Por eso va junto con pedir
   **dos** logos, no tres, explicando para qué sirve cada uno:

   | Logo | Dónde se usa | Obligatorio |
   |---|---|---|
   | Horizontal (el que ya se pide) | Barra superior, PDFs, correos | Sí |
   | Cuadrado | Pestaña del navegador, y mañana icono de app móvil | No — si falta, se usa el de Acopio |

   El tercero (monocromo) solo importa para impresión, y ahí no estamos.

`FAVICON_URL` sigue existiendo y gana sobre todo lo demás, así que un cliente
que insista hoy se resuelve con una Script Property mientras tanto.
