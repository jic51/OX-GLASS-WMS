# Acopio — Backlog

Running list of agreed-upon work, roughly in priority order. Items move out of
here once they ship (the commit message is the record of what changed and why).

## Next up

0. ~~**Quitar el `1` prellenado de Quantity en Incoming**~~ ✅ **Hecho
   (v11.24).** La caja abre vacía, como las cinco ventanas de movimientos desde
   la v11.7. **La decisión que faltaba —si una entrega sin cantidad se permite—
   es que SÍ:** una entrega registrada desde una hoja de carga adjunta muchas
   veces no tiene número hasta que llega el camión, y ese es justo el flujo que
   la app ofrece ("adjunta el PDF en vez de escribir cada material"). Se guarda
   como 0, y **0 nunca se imprime como número**: los cuatro lugares que decían
   "0 UNIT" dicen ahora "qty not stated", y la columna que muestra solo la cifra
   muestra "—". Un 0 es una cifra alrededor de la cual la gente planifica.

1. ~~**Clean master template Sheet**~~ ✅ **Hecho — Jose (v11.23):** "la
   plantilla ya está lista y la actualizo con cada nuevo código que me das."
   Queda por confirmar una sola cosa cuando tenga tiempo: **copiarla él mismo
   una vez** para ver lo que ve un cliente en su primer minuto. Es la única
   parte que no se puede verificar desde adentro. Ver docs/MASTER-TEMPLATE.md.
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

2d. **Grupos en Directory, como en Locations** — idea de Jose (v10.9).
    Hoy el Directory es una lista plana de nombres y correos. Jose quiere lo
    mismo que se hizo con las ubicaciones: **crear grupos y arrastrar los
    contactos a cada uno** (Compras, PMs, Choferes, Proveedores…).

    El para qué no es organizar la libreta — es el paso siguiente: **al
    guardar un movimiento, elegir destinatarios POR GRUPO** en vez de tildar
    seis nombres uno por uno. "Avísale a Compras" es una acción; "avísale a
    Kim, Madeline, Joe, Joe, Adam y Terry" es una lista que alguien va a
    teclear mal.

    Lo bueno: la mitad ya existe. `_renderLocationsTab` tiene el arrastrar,
    los grupos, el orden guardado y el archivar-en-vez-de-borrar, y ese
    patrón se traslada. Lo que hay que decidir antes de construir:
    - ¿Un contacto puede estar en varios grupos? (Yo diría **sí** — un PM
      también es alguien a quien se le avisa de una salida.)
    - ¿El grupo se guarda como una columna más en el Directory, igual que
      `locationTypes` en CONFIG?
    - Al elegir un grupo en el correo de notificación, ¿se congela la lista de
      correos en ese momento o se resuelve el grupo cada vez? (Yo: **resolver
      cada vez**, para que agregar a alguien a Compras lo incluya sin tocar
      nada más.)

2e. **Costo por caja / por pallet — que la app haga la cuenta** — idea de Jose
    (v10.9). Hoy el campo dice `Unit Cost` y espera el costo de UNA unidad de
    stock. El problema real: **el cliente casi nunca sabe ese número.** Sabe
    lo que le facturaron — $120 la caja, $600 el pallet — y la división la
    hace de cabeza, mal, o no la hace.

    Diseño propuesto, en dos piezas separadas a propósito:

    **(a) La etiqueta sigue a la unidad.** Si la unidad es Box, el campo dice
    `Cost per Box`, no `Unit Cost`. Cero matemática nueva, y quita la
    ambigüedad de raíz: hoy nadie sabe si "unit cost" significa la unidad de
    stock o la unidad de compra.

    **(b) Una calculadora opcional al lado.** Un enlace del tipo *"solo sé el
    precio por caja/pallet"* que pide dos números —precio del paquete, y
    cuántas unidades de stock trae— y **llena el campo de costo con el
    resultado, mostrando la cuenta**. `$120 ÷ 24 = $5.00 por unidad`.

    **La regla que no se negocia:** lo que se GUARDA sigue siendo el costo por
    unidad de stock. Todo el motor de costos —promedio ponderado, costo por
    proyecto, costo del desperdicio— depende de eso. La calculadora es una
    calculadora, no un modelo de datos nuevo. Así el riesgo es casi cero.

    **→ ESTO CRECIÓ. Ver `docs/UNIDADES-Y-CONVERSIONES.md`.**

    Las respuestas de Jose (v11.0) convirtieron una calculadora en la función
    más grande del backlog, y el diseño se movió a su propio documento. Lo
    esencial:

    - **La conversión SÍ se recuerda por material** — pero no porque la app la
      suponga: *"el usuario la escribe una vez y se autocompleta siempre, con
      la opción de cambiarla cuando quiera"*. El sistema no adivina, y tampoco
      hace teclear lo mismo veinte veces.
    - **Sí se guarda lo que pagó por el paquete.**
    - **Sí se agregan PALLET, CASE y BAG**, y cada plantilla de industria trae
      su propia lista de unidades.
    - **Y el caso que yo había puesto fuera de alcance resultó ser el
      corazón del asunto:** llega un pallet con 30 cajas de sellador, cada
      caja con 12 tubos, y una persona saca 3 cajas mientras otra saca 5
      tubos. Una panadería recibe sacos de 50 kg y usa 15 kg al día. Eso no es
      un caso raro: es cómo funcionan las bodegas.

    El diseño se parte en dos fases —paquetes y costo primero (riesgo bajo),
    sacar en cualquier unidad después (riesgo alto)— y quedan cuatro
    decisiones abiertas. Todo en el documento.

2f. ~~**La esquina de la marca**~~ ✅ HECHO (v11.2). Lo pedido y lo entregado:

    - **La insignia "Acopio" se sale de la franja azul** y toca el borde
      blanco. Tiene que quedar **dentro**, sin rozar el filo. Si hay que
      achicarla, se achica.
    - **El logo de la empresa está pegado a la barra del navegador.** Necesita
      aire arriba. Hoy se ve improvisado y debería verse profesional.
    - **El logo hay que tratarlo según su forma.** Un logo cuadrado, uno
      horizontal y uno vertical no se pueden meter en la misma caja: el que se
      escale por ancho aplasta a los otros dos. Hay que medir la proporción al
      cargarlo y encajarlo con la regla que le toque.
    - **Una tipografía distinta para el nombre de la empresa**, para que se
      note que es el nombre del cliente y no una etiqueta más de la interfaz.
      Nada llamativo — que se note diferente y se vea serio.

2h. **Enlaces a los Términos y a la Privacidad en la hoja de bienvenida** —
    pedido de Jose (v11.3). Hoy la casilla dice *"I accept the Terms of Service
    and Privacy Policy"* y **no hay forma de leerlos antes de aceptar**. Pedir
    consentimiento sobre un texto que no se puede abrir no es aceptable en la
    única pantalla del producto cuyo trabajo es registrar un acuerdo.

    **El problema no es poner el hipervínculo, es a dónde apunta.** Antes de la
    instalación el cliente no tiene la app desplegada, así que el enlace a
    Settings → Legal no le sirve. Y acopio.net todavía no existe: **inventar
    una URL ya me costó una vez y no se repite**. Dos opciones reales:

    - **(a) El texto viaja en el archivo.** Una pestaña más en la plantilla
      (`📄 TERMS & PRIVACY`) con los dos documentos, y los dos nombres de C14
      enlazados a ella con un `#gid`. **Es la única que es cierta antes de que
      exista el dominio**, funciona sin conexión a nada nuestro, y encaja con
      la promesa del producto: todo vive en su archivo. El costo: una TERCERA
      copia del texto legal, que habría que sumar a `tools/test-legal-sync.js`
      para que no derive de las otras dos.
    - **(b) Esperar a acopio.net** y enlazar a las páginas públicas. Más
      limpio, sin copias, y **bloqueado** hasta que exista el dominio.

    Mi recomendación: **(a)**, porque el bloqueo de (b) no tiene fecha y esto
    es consentimiento. Falta el visto bueno de Jose por la copia extra.

2i. **Los Incoming SIN FECHA deben salir TODOS los días** — pedido de Jose
    (v11.5), y subrayado: *"todos los días todos los días"*.

    Hoy el aviso de la mañana muestra lo que llega **hoy**. Un pedido sin fecha
    no llega ningún día en particular, así que **no aparece nunca** — y es
    justamente el que más fácil se olvida, porque no hay nada en el calendario
    que lo recuerde. El sistema ya distingue cuatro clases de fecha (exacta,
    ventana, aproximada, desconocida) precisamente porque forzar una fecha
    inventada es peor que no tener fecha; lo que falta es que `unknown` tenga
    su propio lugar en la pantalla de la mañana.

    Es chico y de valor diario. Regla: mientras un Incoming siga sin fecha y
    sin recibirse, sale en el aviso de la mañana **cada día**, en su propio
    grupo ("No date — chase these") y no mezclado con los de hoy.

2g. **"Report a problem" tarda 4–5 segundos en dejar escribir** — reportado por
    Jose (v11.1). **Causa NO encontrada todavía.** Lo que sí se hizo y lo que
    se descartó, para que la próxima vuelta empiece con evidencia:

    - **Medido en aislamiento: 17 ms** desde el clic hasta que el textarea es
      interactivo. La ventana en sí no carga nada, y no hace ninguna llamada
      al servidor al abrirse. El problema no está en el código del modal.
    - **Hipótesis probada y DESCARTADA:** que `html.modal-open{overflow:hidden}`
      quitara la barra de scroll y forzara un reflow de la página entera con
      sus 579 filas. Medido en una página de 600 filas: **0.4 ms**, y con
      `scrollbar-gutter:stable` 0.3 ms. No es eso. (Vale anotarlo: iba a
      "arreglarlo" y habría sido un cambio inútil sobre una causa inventada.)
    - **Hecho en v11.1:** el cursor entra solo en el campo de texto al abrir.
      Es una mejora por sí sola, y además sirve de sonda — si con eso todavía
      hay que esperar, entonces el hilo principal está ocupado y no es un
      problema de foco.

    **Lo que falta es una medición en la instalación real de Jose**, porque el
    entorno de producción tiene lo que la prueba no: el iframe de Apps Script,
    3.300 movimientos y dos gráficos de Google. Receta, 30 segundos: F12 →
    pestaña **Performance** → grabar → clic en "Report a problem" → parar. La
    barra larga del flame chart trae el nombre de la función que bloquea.

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

## Resuelta en v11.11 — el factor que se escribe y no se guarda

Jose: *"debemos definir qué pasa si el cliente no da clic en 'ADD' el número de
unidades por box"*, y propuso una tarjeta recordatoria.

Se hizo algo más simple que resuelve el problema en vez de recordarlo: **salir
del campo guarda un factor NUEVO**. Escribir 12 en una casilla que pregunta
"how many units?" ES la respuesta; pedir además un clic solo creaba una forma
de contestar y ser ignorado. La línea cambia enseguida a "12 units per box
[edit]", así que se ve que quedó.

**Cambiar** un factor que ya existe queda excluido a propósito: eso altera
costos que ya se están calculando, así que conserva la advertencia de dos
pulsaciones y nunca se guarda por irse del campo.

Si aun así Jose quiere la tarjeta, el mecanismo (`_typedCfgAdds` /
`_recomputeCfgDeck`) ya existe y es media hora — pero con esto ya no hay nada
que recordar.

## Resueltas en v11.10 — y lo que Jose decidió

- **Nombre del grupo de documentos:** "Invoice" → **"Document"**. Jose: el grupo
  guarda lo que sea que se adjunte, y bautizarlo con el nombre de un solo tipo
  de papel hace que los demás parezcan fuera de lugar.

- **Costo de 0 — cómo se maneja.** Jose: *"hay cosas que no sabemos cuánto
  cuestan (la mayoría de las cosas en OX), así que no le vamos a poner costos
  si no sabemos el valor real"*. O sea: el caso común no es un 0, es **dejarlo
  en blanco**, y eso ya funcionaba bien (no se registra costo, el promedio no
  se toca, el reporte lo muestra sin precio en vez de gratis).
  Lo que se agregó es que un **0 escrito** deje de ser silencioso: avisa que se
  va a registrar como GRATIS y que arrastra el promedio hacia abajo, y señala
  la casilla vacía como la forma de decir "no lo sabemos". No se bloquea: una
  muestra gratis es algo real que registrar.
  **Sigue abierto, chico:** `packMath_` (precio del paquete) toma la decisión
  contraria — 0 no da costo. Las dos mitades aún no coinciden, pero ahora la
  que puede hacer daño avisa.

## ✅ HECHO (v11.19) — política de soporte y de devoluciones

Escrita donde obliga: **secciones 5 y 9 de los Términos**, que es lo que el
cliente acepta. `docs/SOPORTE-Y-DEVOLUCIONES.md` es la versión de trabajo para
Jose, con los casos que van a aparecer y qué contestar.

Decisiones de Jose: la instalación **no se devuelve una vez hecha** (sí antes
de hacerla); el mensual **sí se devuelve**, según caso y fecha.

Propuesta mía, convertida en números aplicables porque "depende" no se puede
poner en un contrato: 14 días para el mensual, meses enteros no usados en el
anual, y devolución del período si un defecto nuestro no se arregla en 30 días.

**Tiempo de respuesta: un día hábil**, y Jose había propuesto 2–3 horas. Le
dije que no por tres razones, y la tercera es la que decide: el complemento de
soporte prioritario ya vende **4 horas hábiles** por +$20/mes. Un soporte base
de 2 horas deja ese complemento sin nada que vender.

**Falta todavía:** el proceso de facturación (con qué se cobra, qué pasa si un
pago falla), mencionar soporte y devoluciones en `WELCOME-EMAIL.md`, y decidir
si un cliente fundador que cancela recupera su precio al volver (yo diría que
no).

## ✅ HECHO (v11.21) — los dos defectos de Incoming que Jose fotografió

**El Status se tiraba a la basura al crear.** `addIncoming` escribía
`'Pending'` fijo y nunca leía `data.status`, mientras que `updateIncoming` sí
lo respetaba. Una entrega registrada como Arrived —o anulada en el momento—
se guardaba Pending y había que editarla otra vez. Las dos mitades pasan ahora
por `incomingStatus_`, que es lo que impide que vuelvan a separarse.

**Borrar no decía nada y no se bloqueaba.** La ventana se queda abierta hasta
que el servidor contesta, así que el botón seguía bajo el dedo y sin ningún
cambio en pantalla. El segundo clic llegaba a una fila ya borrada:
`Incoming item not found`, en rojo, por un borrado que había funcionado.
Ahora el botón se deshabilita con spinner, el segundo clic no sale del
navegador, "no encontrado" termina en verde, y un error de verdad sigue
dejando la ventana abierta para reintentar.

`tools/test-incoming.js` y `tools/test-incoming-delete.js`.

**Visto de paso, no tocado:** la caja Quantity de Incoming abre con un `1`
escrito (`<input id="incQty" … value="1">`). Es exactamente lo que Jose mandó
quitar de las ventanas de movimientos en v11.7 ("al abrir la ventana no debe
haber ningún dato escrito, ni siquiera '0' en qty"). No lo cambié porque no lo
pidió para esta ventana y un cambio no pedido en un formulario es cómo se
rompe algo que funcionaba; dice él y se quita en dos líneas.

## ✅ HECHO (v11.22) — los documentos publicados, al día

Jose decidió: **el changelog se mantiene.** Así que se puso al día y se
republicó todo.

- **Acopio en Detalle** — precios corregidos ($500 + $49/mes, y el anual de
  $490). De paso: decía "cinco tipos de movimiento" cuando ya son seis, y el
  hueco de "conteo cíclico" decía "diseñado, sin construir" cuando ya existe la
  mitad que corrige. Un documento cuya promesa es "esto está construido y en
  producción" no puede republicarse con datos viejos.
- **Acopio Changelog** y **Novedades de Acopio** — de v10.6 a v11.22, en los
  dos idiomas. **No una entrada por versión**: doce entradas agrupadas por lo
  que un cliente nota. Incluye el error de la etiqueta de costo por caja
  (v11.5–v11.8) con la recomendación de revisar el costo de cualquier material
  que se haya precificado por caja en ese rango — un changelog que solo cuenta
  las cosas buenas no lo lee nadie dos veces.

**Y para que no se vuelva a atrasar: `tools/check-changelog.js`.** Falla el
release si el changelog público va más de 5 versiones detrás de `APP_VERSION`,
o si los dos idiomas no están parejos. No exige una entrada por versión —
la mayoría no la merece— pero sí que el hueco se quede chico. La página estuvo
15 versiones atrás sin que nada avisara; se encontró porque Jose la abrió.

## Documentos publicados — qué es cada uno y cuál está desactualizado (v11.21)

Jose preguntó por la lista de artifacts. Auditada contra las fuentes del repo:

| Publicado | Fuente en el repo | Estado |
|---|---|---|
| **Acopio** (×2, 22 ago) | `landing/index.html`, `landing/es.html` | Precios al día ($500 / $49 / $490). Se van a rehacer igual con el botón ES/EN |
| **Acopio en Detalle** (24 ago) | `landing/acopio-overview.html` | **Desactualizado: dice $400 y $39/mes.** El archivo del repo también — la fuente nunca se actualizó cuando subimos el precio |
| **Acopio Changelog** (23 ago) | `landing/changelog.html` | Se detiene en **v10.6**. Faltan ~15 versiones |
| **Novedades de Acopio** (23 ago) | `landing/novedades.html` | Igual: se detiene en v10.6 |
| **Acopio Marks** (17 ago) | — (sin fuente en el repo) | Documento de trabajo (las marcas/logos que se compararon), no es para clientes |

**Por qué pasó:** los artifacts son copias publicadas, no ventanas al repo. Se
actualizan cuando alguien los vuelve a publicar, y nada avisa cuando el
contenido que reflejan cambió. El precio subió en `landing/*.html` pero
`acopio-overview.html` quedó fuera de ese cambio, y el changelog dejó de
alimentarse en v10.6.

**Qué falta decidir (de Jose):** el changelog público, ¿se mantiene? Ponerlo al
día son ~15 versiones de trabajo y después hay que alimentarlo en cada
release. Si no se va a alimentar, es mejor despublicarlo que dejarlo mintiendo.
El precio de "Acopio en Detalle" hay que arreglarlo pase lo que pase.

## ✅ HECHO (v11.22) — el botón "Adjust"

Jose: "DEBEMOS PONER EL BOTÓN DE ADJUST… NO RECUERDO QUÉ EXACTAMENTE HARÁ
DIFERENTE A WASTE". Propuesto en v11.21, aprobado ("ASI ESTA BIEN"), construido
en v11.22.

**La línea, que es lo único que importa de este tipo de movimiento:**

- **WASTE = material que existió y se perdió.** Tiene costo, se le carga al
  proyecto, y "cuánto desperdiciamos" es una pregunta real sobre él.
- **ADJUST = el conteo no cuadra.** El sistema dice 40, el rack tiene 38. Eso
  **no** significa que se rompieron dos: significa que **el registro está mal**.
  Costo cero, sin proyecto, motivo obligatorio, y **puede subir el stock**,
  cosa que Waste nunca hace.

Si un error de conteo se registra como Waste, la cifra de desperdicio de la
empresa pasa a ser "desperdicio + errores de anotación", y son dos problemas
distintos con dos soluciones distintas.

**Cómo se pide:** no se escribe la diferencia, se escribe **lo que contaste**.
La app ya sabe lo que ella creía y saca la resta. Quien está parado frente al
rack tiene "38" en la cabeza, no "menos 2", y pedir la resta es pedir una
operación que se puede invertir sin darse cuenta.

**Dónde vive la dirección:** en **cuál de las dos columnas de rack** se llena
— Source si el conteo salió corto, Destination si salió largo. Es la misma
gramática que ya usan los otros tipos (ENTRY escribe DEST, EXIT y WASTE
escriben SRC, TRANSFER escribe las dos). La alternativa era una cantidad
negativa, y habría metido un número negativo en cada suma, badge, gráfico y
exportación de la app.

**El riesgo real de este cambio no era la feature, era el ACUERDO:** hay
**cuatro** funciones que convierten movimientos en stock. Si una no conoce
ADJUST, sus números se separan de las otras tres y el síntoma aparece semanas
después como un rack que lee mal sin apuntar a nada. `tools/test-adjust.js`
vigila que las cuatro sepan, y que las cuatro manejen **las dos direcciones**.

`tools/test-adjust.js` y `tools/test-adjust-form.js`.

## ✅ HECHO (v11.25) — las entregas esperadas, cuatro cosas que Jose fotografió

**1. La categoría desaparecía al abrir una entrega.** Abrió una entrega de IGU
desde el aviso de la mañana y la casilla Category estaba VACÍA, en un registro
cuya etiqueta decía IGU una línea más arriba.

La causa raíz no estaba en la ventana: **renombrar una categoría reescribía el
archivo y dejaba `INCOMING_V3` intacto.** Jose había renombrado la categoría a
"IGU (ISOLATED GLASS UNIT)"; la fila de la entrega seguía diciendo "IGU",
ninguna opción del desplegable decía "IGU", y **un `<select>` al que se le da un
valor que no tiene no selecciona nada, en silencio** — y Guardar habría escrito
esa nada de vuelta. Ahora el renombrado alcanza también las entregas
(`renameIncomingCategory_`), y como red de seguridad para todas las otras formas
de perder una categoría (borrada, importada, editada a mano en la hoja) la
ventana compara sin distinguir mayúsculas y, si de verdad no está en la lista,
**la agrega en vez de tirarla**, marcada como "(not on your list)".

**2. El aviso ya no se cierra al marcar el primer material.** Jose: "luego de
seleccionar el primer material y dar clic en recibido, la ventana se cierra y no
hay otra forma de reabrirla más que actualizar la página completa." Es una lista
que se recorre —tres entregas en la mañana son tres viajes— y cerrarla tras la
primera obligaba a recargar la app. La ventana de edición se abre encima, y el
aviso **se redibuja solo** cuando el guardado aterriza.

**3. Y hay forma de volver a abrirlo:** botón **"☀️ This week's schedule"** en
la cabecera de Incoming. Antes solo aparecía una vez por carga de página.

**4. El botón "Mark arrived" está en cada material** de las tarjetas de la
semana, no solo dentro del aviso — el aviso sale una vez al día y las tarjetas
están siempre en pantalla.

**Y la presentación, en el orden que Jose dibujó:** categoría en su propia línea
arriba; luego **cuántos** y **qué** en una línea; luego lo que se anotó; abajo el
estado y la única acción. **Un solo renderizador (`_incItemHtml`) para las
tarjetas y el aviso** — tener dos es como se separaron.

*Decisión que tomé:* la categoría conserva su pastilla de color en vez del texto
plano del boceto, porque ese color es el mismo que la categoría tiene en todas
las demás pantallas y está haciendo trabajo — uno encuentra MIRROR en una
tarjeta por el color antes de leer una palabra.

## ✅ HECHO (v11.26) — el merge que se negaba a sí mismo, y dos ajustes de Jose

**1. "Nothing to merge — that is already the only spelling", sobre dos
ortografías que el barrido acababa de encontrar él mismo.** Jose lo vio en
`SWEETWATER - SPRING CANYON 2 · Sweetwater - SPRING CANYON 2`.

El filtro que quita al superviviente de la lista a fusionar comparaba en
mayúsculas — copiado del merge de Settings, donde tiene sentido (no puedes
fusionar un valor consigo mismo). Aquí borraba **el hallazgo más común que
existe**: las mismas letras con distinta caja. Una diferencia de mayúsculas es
una diferencia real en lo que está guardado, y normalizarla es un merge como
cualquier otro. Ahora solo se descarta una repetición byte por byte.

Y en el camino de ubicaciones, un merge que solo cambia la caja borra también la
fila del superviviente (su versión en mayúsculas está en `wanted`) y la vuelve a
agregar — como `RACK` pelado, sacando la ubicación del grupo en el que alguien
la había archivado. Ahora **recuerda su grupo**.

**2. La presentación, segundo boceto:** el nombre a la izquierda y **la cantidad
enfrente, a la derecha**, con el estado debajo de la cantidad. Dos columnas en
vez de cuatro líneas apiladas, y el punto es el borde derecho: **cada cantidad
debajo de la anterior, cada estado debajo del anterior.** Se ve lo que falta por
recibir sin leer un solo nombre de material.

**3. "This week's arrivals" se movió al menú del avatar**, sin filtro de rol.
Jose: "el botón debería estar en un lugar donde todos tengan acceso sin tener
que ir a la pantalla de incoming." Los botones **"Mark arrived" dentro del aviso
siguen siendo solo de ADMIN**, así que quien es de bodega lee la lista y no la
puede cambiar.

## Comentarios sobre un material, sin editar el movimiento — idea de Jose (v11.23)

Jose, textual: *"sé que tenemos comentarios en cada movimiento pero para añadir
un comentario se debe editar todo el movimiento… solo la persona editando puede
hacerlo. Debemos dejar que cualquier persona en bodega agregue comentarios sin
necesidad de editar el movimiento."*

**El problema es real y es de permisos, no de pantallas.** El campo Comments
vive en la fila del movimiento. Escribir ahí significa `updateMovementRow`, que
pide permiso de edición, exige un motivo del cambio, manda correo al
administrador y queda en la bitácora de auditoría — todo correcto para
*corregir un registro*, y todo desproporcionado para *dejar una nota*. El
resultado es que nadie deja notas.

**Lo que Jose describió, en su orden:**

- En el tablero, al hacer clic en un material (la fila que se expande,
  `toggleStockDetail`), **una sección nueva al lado** que muestra el **último
  comentario**.
- Al hacer clic en esa sección se abre una **ventana emergente** con scroll:
  nombre y correo de quien escribió, el comentario y la fecha.
- **Botón para añadir** en el encabezado de esa ventana.
- **La ventana se cierra al tocar afuera solo si no hay nada escrito.** (Buen
  detalle, y ya hay precedente en la app: `closeMoveModalGuarded`.)

### Lo que hay que decidir antes de construir

- **El hilo es del MATERIAL, no del movimiento.** Eso es lo que dice el diseño
  de Jose: la sección vive donde se hace clic a un material. Es una decisión
  importante y buena, porque significa **no tocar el archivo de movimientos**:
  un almacén nuevo (`COMMENTS_V3`: id, matId, texto, autor, correo, fecha,
  borrado) en vez de escribir en una columna que ya tiene dueño. El campo
  Comments del movimiento se queda como está, para lo que siempre fue: lo que
  se dijo de **ese** movimiento.
- **Quién puede escribir:** cualquiera que pueda registrar movimientos
  (WAREHOUSE y ADMIN). Ese es el punto entero.
- **Quién puede borrar:** el autor y el ADMIN. Nadie edita el comentario de
  otro; un hilo que se puede reescribir no sirve como registro.
- **¿Se editan los propios?** Yo diría que no, o solo por unos minutos. Un
  comentario es lo que alguien dijo ese día.
- **Techo:** el último comentario en la fila, y la ventana con scroll y
  paginado si el hilo es largo — la misma disciplina que el historial.
- **¿Notifica a alguien?** Empezar sin notificación. Añadir correos a algo que
  todavía nadie usa es cómo se construye una función que la gente apaga.

## Lo que está en manos de Jose — estado al v11.23

- ✅ **Plantilla maestra** — lista, y la actualiza con cada versión. Falta solo
  copiarla él una vez para ver lo que ve un cliente.
- ✅ **Con qué se cobra** — **Stripe**, desde el primer cliente. Escrito en los
  Términos §9, en la Privacidad §5 y en `SOPORTE-Y-DEVOLUCIONES.md` §6, con la
  lista de lo que hay que montar en el panel antes del primer cobro.
- 🔄 **Ensayo de restauración** — en curso. Deploy → New deployment, 🩺 Check, y
  la prueba de adjuntos que demuestra que `FOLDER_PREFIX` volvió. Ver
  `RESTAURAR-UN-BACKUP.md`.
- ⏳ **Prueba de concurrencia en vivo** — aplazada: Jose (v11.23) necesita
  encontrar 3 o 4 personas que le ayuden. **No sirve la misma cuenta en varios
  navegadores** — Apps Script serializa por usuario, así que esa prueba pasa
  siempre y no prueba nada. Lo que hay que ver es a cuatro personas distintas
  guardando movimientos del mismo material al mismo tiempo. `test-concurrency.js`
  cubre la lógica; esto cubre la plataforma.
- ⏳ **Pantalla de consentimiento "In production"** en Google Cloud Console.
- ⏳ **A nombre de quién se factura**, e impuesto sobre las ventas en Utah y en
  el estado del cliente.

## ✅ HECHO (v11.24) — la landing en un solo archivo con botón ES/EN

`landing/acopio.html` reemplaza a `landing/index.html` y `landing/es.html`, que
eran **las mismas 582 líneas dos veces**. El inglés vive en el marcado (la
página se lee y se indexa con JavaScript apagado) y el español es un
diccionario de 109 claves al final, enganchado por `data-i18n` en cada elemento
—`data-i18n-attr` para un atributo como un placeholder—.

**Generado una sola vez a partir de los dos archivos, no retecleado.** Los dos
estaban alineados línea por línea, así que la fusión fue mecánica; retipear 100
líneas de texto de venta a mano es exactamente cómo un precio termina bien en
un idioma y mal en el otro — que es lo que ya pasó con "Acopio en Detalle".

**Decisiones:**
- **El botón vive FUERA de `<nav>`.** El nav es `display:none` bajo 640px, y un
  botón de idioma que un teléfono no puede ver no es un botón de idioma. Con
  `min-height:38px`, porque a `.4rem` de padding salía de 28px — un control al
  que se apunta, no uno que se golpea.
- **El idioma inicial:** una elección explícita manda para siempre; si no la
  hay, decide `navigator.language`. Si `localStorage` lanza (ventana privada,
  navegador que bloquea datos de sitio) la página abre en inglés en vez de no
  abrir.
- **Una clave que falte deja el inglés en pie.** Una página a medio traducir es
  fea; una en blanco está rota.
- **El correo que arma el formulario también cambia de idioma.** Quien llena un
  formulario en español no debería mandar un correo en inglés.

`tools/test-landing-i18n.js` — y lo que vigila de verdad no es el botón, es que
**los dos idiomas no se puedan separar**: cada elemento marcado tiene su
cadena, cada cadena sigue enganchada a algo, ir y volver devuelve el inglés
exacto, y **los precios se leen igual en los dos**, porque un número no es una
traducción.

**Pendiente de Jose:** los dos artifacts publicados de la landing (dos
"Acopio") ahora son uno solo. Hay que republicar uno con el archivo nuevo y
retirar el otro — no lo hago yo a ciegas porque publicar sobre el equivocado
dejaría viva la página vieja en español.

## Cómo distinguir dos camiones el mismo día — problema abierto

Jose (v11.11), y es un problema real, no un detalle: si un Incoming es
**una fila por material** y el camión es **un grupo de filas del mismo día**,
entonces dos entregas del MISMO proveedor el MISMO día se mezclan y no hay
forma de saber qué vino en cuál.

Jose ya escribió la respuesta sin darse cuenta: el campo **"What were you
told?"** en el que él pone *"Window Truck 8/24/26"*. Eso ES el nombre de la
entrega. La propuesta:

- Ese texto se convierte en el **identificador del grupo**. Dos camiones el
  mismo día del mismo proveedor se distinguen porque uno dice "Window Truck" y
  el otro "Glass Truck" — y si alguien no escribe nada, el grupo se llama por
  proveedor y fecha, como hoy.
- En Incoming las filas se **agrupan bajo ese título**, con un botón de
  "llegó todo" para el grupo entero y la casilla por material para cuando
  falta una caja.
- Nadie tiene que aprender un concepto nuevo: ya lo estaba escribiendo.

No construido todavía — va junto con los varios materiales por Incoming.

## Pendiente grande — varios materiales en "Add Expected Material"

Pedido de Jose (v11.10). Hoy el modal de Incoming recibe **un solo material**:
una categoría, un nombre, una cantidad, una unidad, un supplier, un PO, un PM.
Jose quiere lo mismo que tiene ENTRY: **varias líneas de material, con la
casilla de "todos comparten el mismo supplier / proyecto / categoría…"** para
poder separarlos cuando no lo comparten.

Por qué no se hizo junto con lo demás: no es diseño, es la **forma de los
datos**. Un Incoming hoy es una fila con un material; esto lo convierte en una
fila con N materiales, y hay que decidir antes de escribir código:

- ¿Cada material es **su propia fila** de Incoming (y entonces "el camión del
  8/24" es un grupo de filas que hay que poder marcar como llegado junto), o
  **una fila con varios materiales dentro**?
  Yo diría **filas separadas con un id de grupo**: marcar llegada por material
  es lo que pasa de verdad (llega el camión y falta una caja), y el dashboard y
  el popup de la mañana ya cuentan filas.
- Al convertir un Incoming en ENTRY, ¿se abre el formulario con **todas** las
  líneas cargadas?
- El extractor de IA (AI Extract) ya lee una hoja de carga con varios
  materiales — hoy tiene que aplanarlos a uno. Esto es justamente lo que le
  faltaba.

## Polish pass (do at the end, after the functional work)

- **2j — TRANSFER / RETURN / WASTE now follow the ENTRY/EXIT layout. DONE in
  v11.7.** Jose spotted two differences: the date was buried third instead of
  first (an accident — all five screens share one grid, and ENTRY/EXIT only
  looked right because they hide the fields before the date), and the three
  had no coloured material box while ENTRY and EXIT each had one.
  Fixed by lifting the date into its own row above the grid and wrapping the
  core fields plus each type's location fields in `.move-mat-box`, tinted
  blue / purple / amber to match the tab, with a "Material" header and a
  quantity badge — Jose's answer to the open question was "sí lleva
  encabezado". The badge reads what will actually be saved, which is the
  transfer rows' sum on TRANSFER and the Quantity box on RETURN/WASTE.
  Guarded by tools/test-form-symmetry.js.

  **Still open, deliberately NOT done:** TRANSFER, RETURN and WASTE are still
  *single-material* forms. Making them multi-material like ENTRY/EXIT is the
  bigger asymmetry underneath this one and touches the save path, not just
  layout. Worth deciding separately.

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
pierdas las mejoras — acopio.net / service@acopio.net" con link al listado de
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
- **BLOQUEADO:** acopio.net no existe todavía, y el listado de novedades
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

## ✅ HECHO (v11.23) — el barrido de calidad de datos

Construido en Settings → System → **"Check my data"**. Las decisiones que
estaban abiertas, resueltas y por qué:

- **¿Cuándo aparece?** Solo cuando se presiona. Un barrido que interrumpe al
  guardar es lo que la gente apaga, y un resumen diario se vuelve algo que
  ignorar. Y de paso elimina un subsistema entero: **sin fastidio no
  solicitado no hay nada que descartar**, así que no hay estado de "recuérdame
  después" que guardar, que equivocar, ni que perder en una restauración.
- **¿Quién lo ve?** ADMIN, las dos puntas (escanear y aplicar).
- **¿Qué revisa?** Tres familias, y **no tienen la misma confianza** — eso es
  lo que hace peligrosa esta función si se finge lo contrario:
  1. **"Escrito de dos formas"** (casi certeza). Dos textos distintos cuya
     clave *aplastada* —sin espacios ni puntuación— es la misma. `BS10` y
     `BS 10` colapsan; `JJF 109` y `JJF 110` **no**, porque sus dígitos
     difieren. Materiales, proyectos, proveedores y racks.
  2. **"Le falta lo que sus hermanos tienen"** (alta). Agrupado por MatID, que
     es la regla de Jose. **Solo proveedor y el proyecto de los TRANSFER**
     viejos. GC, PO y PM tienen el mismo hueco y **quedan fuera a propósito**:
     una orden de compra es de una entrega y un contratista es de una obra;
     copiarlos en masa haría que la app afirme algo que nadie le dijo.
  3. **"Échale un ojo"** (adivinanza, **sin botón**). Errores de tecleo —
     distancia de edición de uno o dos caracteres, con los dígitos iguales.
     `CLIFTON BUILDING` vs `CLIFTON BULIDING` sí; `GE SILPRUF SEALANT` vs
     `GE SILPRUF SEALER` no, porque compartir palabras es lo que hace una
     familia de productos.
- **UN TECHO.** 150 hallazgos, los más grandes primero, y la pantalla **dice
  cuántos quedaron fuera**. Un primer barrido sobre un año importado produce
  miles.
- **Nada se aplica solo**, y cada fusión pasa por la función que ya existía
  para ese tipo de valor — la misma que llaman las pantallas de Settings, ya
  con candado, ya reescribiendo los dos archivos. Dos caminos para fusionar un
  material significaría que el menos usado es el roto.

`tools/test-data-quality.js` (60 comprobaciones).

**Lo que NO se construyó, y por qué:** un diccionario del rubro para "palabras
mal escritas" de verdad. Sin él, "mal escrito" y "así se llama" son
indistinguibles, y la familia 3 es lo más lejos que se puede llegar
honestamente.

## Diseño original (superado por lo de arriba) — LA LIMPIEZA DE DATOS

Jose preguntó: *"¿la app no ha encontrado nada últimamente que corregir?
¿construimos la parte donde está constantemente buscando cosas que corregir?"*

**Respuesta honesta: no, nunca se construyó.** Lo único que existe es
`_findSimilarMaterial`, y solo se dispara **mientras se escribe** un nombre en
el formulario. Nada revisa los datos que ya están guardados. Por eso no
encuentra nada: no está mirando.

Lo que Jose pidió, en sus palabras: *"revisar todos los nombres parecidos, los
nombres de proyectos parecidos, las destinations y sugerir que se las corrija,
también buscar palabras mal escritas, y arreglar movimientos según el id,
porque si tienen el mismo id es porque son el mismo material."*

**Ya hay media pieza construida (v11.17):** al editar un movimiento, los campos
vacíos se llenan desde el historial del mismo material y se marcan como
sugerencia. Eso es la versión MANUAL de "arreglar movimientos según el id" —
un movimiento a la vez, con la persona decidiendo. El barrido automático es la
misma idea aplicada a todo el archivo de una vez.

### Lo que hay que decidir ANTES de construir
Equivocarse aquí hace la app fastidiosa, y una app fastidiosa se apaga y no se
vuelve a encender.

- **¿Qué se revisa?** Cuatro familias, y no son igual de seguras:
  1. **Huecos** (mismo MatID, unos con supplier y otros sin) — la más segura,
     porque la respuesta ya está en los datos del propio cliente.
  2. **Nombres de material parecidos** — ya hay matcher. Riesgo: `JJF 109` y
     `JJF 110` son cosas distintas y se parecen muchísimo.
  3. **Proyectos y destinos parecidos** (`BS10` vs `PAT BS 10`) — el caso que
     Jose vio. Aquí NO se puede fusionar solo: puede que sean dos trabajos.
  4. **Palabras mal escritas** — la más difícil de todas. Sin un diccionario
     del rubro, "mal escrito" y "así se llama" son indistinguibles.
- **¿Cuándo aparece?** Al guardar es lo más útil y lo más molesto. Un barrido
  diario con un resumen es lo más llevadero.
- **¿Quién lo ve?** Solo ADMIN, probablemente: fusionar materiales cambia el
  stock.
- **¿Qué hace "Después"?** Nunca más para esa fila entierra problemas reales;
  volver en una semana fastidia.
- **UN TECHO.** Una instalación que importa un año de historia generaría miles
  de tarjetas de golpe. Hace falta un límite y una pantalla de "revisar todo",
  no un mazo de tarjetas.
- **Nada se aplica solo.** Fusionar dos materiales mueve stock. Toda sugerencia
  se propone; nadie la ejecuta sin que una persona la acepte.

## Idea original (superada por lo de arriba) — proactive data-quality suggestions

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
cambiar **una línea**: `acopio.net/favicon.png`, o un PNG cuadrado en el Drive
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
