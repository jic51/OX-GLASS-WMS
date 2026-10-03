# Un panel de clientes: quién paga, desde cuándo, y si su instalación está viva

Jose, 2026-10-03:

> *"Quiero tener una forma de ver automáticamente y me diga cuándo empezó un
> cliente a pagar, el nombre y el correo, y todo lo demás de la app."*

Son **dos preguntas distintas con dos fuentes distintas**, y conviene separarlas
antes de construir nada, porque una ya está resuelta y la otra tiene un
obstáculo que hay que decidir a conciencia.

| Pregunta | Quién lo sabe | Estado |
|---|---|---|
| ¿Quién paga, desde cuándo, con qué nombre y correo? | **Stripe** | Resuelto el día que se active Stripe |
| ¿Su instalación está viva, sana y al día? | **La instalación** | **Hoy no lo sabemos** |

## 1. El dinero: eso ya lo da Stripe, no hay que construirlo

Cuándo empezó a pagar, el nombre, el correo, el plan, si una tarjeta falló, si
canceló — **todo eso lo tiene Stripe y es la fuente autorizada.** El panel de
Stripe ya lo enseña y ya manda avisos por correo.

No hay que duplicarlo ni hay que inventar un registro paralelo: un segundo sitio
donde apuntar quién paga es un segundo sitio que puede estar equivocado, y
cuando dos listas de lo mismo no coinciden, nadie sabe cuál creer. Es el mismo
error que ya nos ha mordido tres veces en el código.

**Lo único que de verdad hace falta de Stripe es traerlo a un sitio donde se
pueda cruzar con lo otro**, y eso se hace con sus *webhooks*: Stripe avisa a una
dirección nuestra cada vez que pasa algo.

| Evento de Stripe | Lo que contesta |
|---|---|
| `customer.subscription.created` | **cuándo empezó a pagar** ← la pregunta literal de Jose |
| `customer.subscription.updated` | cambió de plan |
| `customer.subscription.deleted` | se dio de baja |
| `invoice.paid` | sigue al día |
| `invoice.payment_failed` | **le falló la tarjeta — hay que llamar hoy, no el mes que viene** |

## 2. La instalación: esto es lo que falta, y falta casi entero

Hoy, de una instalación de un cliente, sólo nos llega **un correo, dos veces en
la vida, y sólo si la cosa va mal**: a los 3 y a los 7 días desde la
instalación, **y únicamente si no ha registrado ni un movimiento**.

Léelo otra vez, porque es importante: **si el cliente usa la app con normalidad,
no nos llega absolutamente nada. Nunca.** Un cliente que paga desde hace ocho
meses y otro cuya app lleva tres semanas rota se ven exactamente igual desde
aquí: silencio.

Y tenemos la prueba en casa. **Tres veces el archivado nocturno destrozó datos en
la instalación de OX Glass y nos enteramos entre catorce horas y dos días
después, y por casualidad.** Si eso pasa en la copia de un cliente que no sabe
leer un ERROR_LOG, no nos enteramos jamás: nos enteramos el día que pide la
devolución.

## 3. El obstáculo, que es una promesa escrita y hay que tratarla como tal

La política de privacidad, sección 3, dice textualmente:

> *"That email contains exactly four things: **your company name, your
> administrator's email address, how many users are registered, and how many days
> it has been since setup.** Nothing else — no inventory, no materials, no
> suppliers, no prices, no documents."*

Y además promete que **para cuando se manda** (3 y 7 días, sólo si no hay
movimientos, nunca más de dos mensajes).

**Esa promesa es un argumento de venta, no un estorbo.** Para quien duda en
confiarte su almacén, "cuatro cosas, nada más" vale más que cualquier función.
Ya una vez el código mandaba cinco cosas y la promesa decía cuatro, y la
decisión fue **estrechar el código, no ensanchar la promesa** — está escrito en
el propio archivo, en el comentario de `runCheckin_`.

Así que hay exactamente dos caminos, y es decisión de Jose, no mía:

### Camino A — no tocar la promesa

El panel sólo junta Stripe con esas cuatro cosas. **Consecuencia honesta: no
sabremos si la instalación de un cliente está sana.** Seguiremos enterándonos de
los desastres cuando el cliente se queje.

### Camino B — cambiar la promesa ANTES de recoger nada, y hacerlo bien

Un latido diario, con una lista corta, cerrada y escrita en la política de
privacidad antes de que el código mande el primer byte:

**Lo que mandaría:**

| Campo | Para qué |
|---|---|
| Nombre de la empresa y correo del admin | saber de quién es |
| Versión de la app y *build* | **si corre código viejo** — exactamente lo que nos costó dos semanas |
| Cuántos movimientos tiene, en total | si la está usando |
| Fecha del último movimiento | **si dejó de usarla** — el aviso de cancelación más fiable que existe |
| Cuántos usuarios registrados | tamaño de la cuenta |
| Cuántos errores en las últimas 24 h, y el texto del último | si está rota |
| Si el backup de anoche corrió | si está desprotegida |

**Lo que NO mandaría jamás, y va escrito en la política con las mismas letras:**
ni un nombre de material, ni una cantidad, ni un proveedor, ni un proyecto, ni
un precio, ni un documento, ni el contenido de ninguna celda. **Cuánto, nunca
qué.** Esa frontera es todo el argumento, y el día que se cruce "por una sola
cosita" deja de valer.

**Y con interruptor.** Un ajuste visible —no escondido en Script Properties— que
lo apaga, y que al apagarlo diga qué se pierde: *"si lo apagas, no podremos
avisarte de que tu copia tiene un problema antes de que lo notes."*

**Mi recomendación: el camino B.** No por el negocio, sino por los clientes: un
proveedor que se entera de que tu almacén está roto antes que tú vale más que
uno que promete no mirar. Pero con la promesa reescrita primero, en el mismo
tono concreto que tiene hoy, y con el interruptor de verdad.

## 4. Dónde vive el panel

**En el Drive de Jose, nunca en el archivo de un cliente.** Una hoja de cálculo
`Acopio — Clientes` con su propio script pequeño:

- una pestaña `CLIENTES`: una fila por instalación, cruzada por **correo**, que
  es la única llave que comparten Stripe y la instalación;
- una pestaña `EVENTOS`: el registro crudo de todo lo que llega, que nunca se
  edita a mano — cuando una cuenta no cuadre, ahí está qué llegó y cuándo;
- un `doPost` que recibe los *webhooks* de Stripe **verificando su firma** (si no
  se verifica, cualquiera que descubra la dirección puede inventarse clientes);
- y, si sale el camino B, otro que recibe los latidos.

Una pantalla sencilla encima, con lo único que de verdad se mira a diario:

> **quién pagó y no ha instalado · quién instaló y no registra nada · a quién le
> falló la tarjeta · qué instalación lleva días sin dar señales · quién corre una
> versión vieja**

## 5. Orden para construirlo

1. **Stripe primero**, cuando se active: sus webhooks y la hoja. Eso solo ya
   contesta la pregunta literal —*cuándo empezó a pagar, nombre y correo*— y no
   depende de ninguna decisión de privacidad.
2. **Decidir A o B**, por escrito, y si es B **reescribir la política antes de
   escribir una línea de código**, con su prueba que compare lo prometido con lo
   que el código manda — porque `test-checkin` ya cuenta los campos del correo
   por una razón, y esa razón fue que una vez se nos descuadró.
3. **El latido**, si es B.
4. **La pantalla** al final: con dos fuentes puestas, la pantalla es media tarde.
   Sin ellas, es una maqueta bonita que no sabe nada.

---

# 6. ¿Qué más recoger? — primero la regla, después la lista

Jose, 2026-10-03:

> *"Si vamos a obtener información del cliente (cuánto, no qué), entonces podemos
> obtener más información que nos ayude a mejorar la calidad de la app y el
> servicio: tiempo que dura en cargar la app (no sé si es un dato importante),
> cantidad de errores y qué tipo de errores, tiempo que demora en guardar un
> movimiento, cuántas personas había conectadas y qué estaba haciendo cada una si
> hay un fallo, si la app maneja clientes con dominio y sin dominio… ¿Será bueno
> tener esos datos y qué otros nos serían útiles?"*

**Sí, y la mayoría de lo que propone es exactamente lo que hace falta.** Pero
antes de la lista hace falta un filtro, porque el fallo típico de esto no es
recoger poco: es recoger un pantano que nadie mira, y entonces el día que pasa
algo no se encuentra nada entre el ruido.

## El filtro, y es una sola pregunta

> **¿Qué decisión tomaría distinto si tuviera este dato?**

Si la respuesta es "ninguna, pero estaría bien saberlo", no se recoge. Nada que
no conteste una pregunta concreta entra en la lista — ni siquiera cuando es
fácil de recoger, sobre todo cuando es fácil de recoger.

Y el segundo filtro sigue siendo el de antes, que no se toca: **cuánto, nunca
qué.**

## Tus cinco, uno por uno

### 1. Tiempo de carga de la app → **SÍ, y es de los más importantes**

Preguntabas si es un dato importante. **Es el que más falta hace ahora mismo**,
por una razón muy concreta: acabamos de decidir que el archivado debe disparar
**por tamaño y no por calendario**, y dijimos que el umbral *"hay que medirlo, no
inventarlo"*. Pues el tiempo de carga medido en instalaciones reales, junto al
número de movimientos de cada una, **es esa medición** — y sale gratis, en vez de
montar un laboratorio con datos falsos.

Con una condición para que sirva: **separado en dos**, el tiempo del servidor
(preparar los datos) y el del navegador (pintarlos). Un solo número que diga "14
segundos" no se puede arreglar, porque no dice dónde arreglarlo.

### 2. Cantidad y tipo de errores → **SÍ, pero el MENSAJE no**

La cantidad y el tipo, sí, y el ERROR_LOG ya está estructurado para eso
(severidad, acción, origen, identificador). Eso contesta *"¿esta versión rompió
algo?"* y *"¿qué pantalla falla más?"*.

**El texto del mensaje, no, y éste es el agujero que nadie ve venir:** un mensaje
de error se construye a menudo con los datos que lo causaron — *"cannot save
SUNBRIDGE PHASE 1"*. Mandar mensajes crudos es mandar inventario por la puerta de
atrás, justo lo que la política promete que no pasa.

La forma correcta es mandar **la acción y el tipo de fallo** (un código), no el
texto. Y si algún día hace falta el texto, pasa por un limpiador y la prueba de
que limpia va antes que el envío.

### 3. Tiempo en guardar un movimiento → **SÍ**

Y además es medible ya: el guardado tiene principio y final claros. Vale para lo
mismo que el de carga — con el tamaño de la instalación al lado, dice cuándo la
app empieza a sufrir y por qué.

Nota de lo que ya sabemos: borrar trece movimientos pasó de dos minutos y medio a
cincuenta y cinco segundos, y ese número salió de **un vídeo tuyo**. Con esto, el
número sale de todos los clientes y sin que nadie grabe nada.

### 4. Cuántos conectados y qué hacía cada uno al fallar → **SÍ, con un matiz que importa**

Útil, y de lo mejor de tu lista: la mitad de los fallos raros de esta app han
sido dos personas haciendo cosas a la vez, y reconstruirlo a posteriori es
imposible hoy.

**El matiz: NUNCA el correo del empleado.** El del administrador es nuestro
contacto, tiene una relación con nosotros y está en la política. **Un operario
del almacén no ha aceptado nada** — no nos ha contratado, no ha leído nuestra
política y probablemente no sabe que existimos. Mandar su correo a un servidor
nuestro porque resulta que su jefe compró el programa es exactamente la clase de
cosa que no vamos a hacer.

Se manda **cuántas sesiones había y qué acción tenía cada una en curso**, con un
identificador anónimo y estable (para poder decir "la sesión A y la B chocaron")
que no se pueda volver a convertir en una persona.

### 5. Con dominio y sin dominio → **SÍ, barato y decide trabajo**

`COMPANY_DOMAIN` ya sale en la comprobación de instalación como *IMPORTANT*: sin
él, el personal tiene que entrar con Google en vez de ser reconocido. Saber
cuántos clientes están de cada lado dice directamente dónde merece la pena
invertir en el acceso, en vez de suponerlo.

## Lo que yo añadiría

| Dato | La decisión que desbloquea |
|---|---|
| **Tamaño: movimientos, materiales, ubicaciones, usuarios, adjuntos** | el umbral del archivado; y segmentar "va lento" por tamaño real |
| **% del techo de 10 millones de celdas** (ya se mide en `storageInfo_`) | **avisar al cliente ANTES de que se le llene**, no después. Hoy nadie lo mira hasta que alguien abre Settings |
| **Qué pantallas se abren y cuáles no** | qué mejorar y qué sobra. Hay mucha app construida; si nadie abre una pantalla, eso vale oro |
| **Qué funciones se usan** (AI Extract, etiquetas, packs, reservas) | lo mismo, y además qué vender |
| **Teléfono o escritorio, y ancho de pantalla** | cuánto invertir en pantallas pequeñas. Hoy se decide a ojo |
| **Fallos de permiso / autorización** | **esto habría cazado en un día lo del manifiesto viejo** que nos tiene parados ahora mismo |
| **Reintentos: guardar pulsado dos veces seguidas** | es la huella de "no sé si se guardó". Mide confusión, que es un fallo aunque nada reviente |
| **Que el latido NO llegue** | el más valioso de todos y no cuesta nada: el silencio de una instalación que antes hablaba |

## Lo que no se manda, nunca, y va escrito con estas palabras

Nombres de materiales, categorías, proveedores, proyectos, clientes finales,
cantidades, precios, comentarios, nombres de archivo, enlaces a documentos,
correos de empleados, y el texto crudo de cualquier mensaje de error.

## Cinco reglas de ingeniería, porque esto se puede hacer mal

1. **Un resumen diario, no un chorro de eventos.** Los números se acumulan en la
   propia instalación y se manda un paquete al día. Un evento por acción
   multiplica por mil el tráfico y no contesta ni una pregunta más.
2. **Jamás en el camino crítico.** Nunca hacer más lento un guardado para contar
   que los guardados van lentos. Si el envío falla, se descarta en silencio.
3. **La cuota que se gasta es la del cliente.** `UrlFetch` sale de SU cuota
   diaria de Apps Script. Un latido al día no se nota; algo más agresivo le está
   cobrando al cliente el precio de nuestros datos sin decírselo.
4. **Caducidad y borrado.** Cuánto tiempo se guarda, y qué se borra cuando un
   cliente se va. Si no se decide ahora, no se decide nunca.
5. **Una lista, en un sitio, con su prueba.** La política y el código tienen que
   decir lo mismo, y tiene que haber una prueba que los compare — `test-checkin`
   cuenta los campos del correo precisamente porque una vez se descuadraron.

## Por dónde empezar: la versión 1 del latido

Cinco cosas, todas atadas a una decisión que ya tenemos pendiente:

1. versión y *build*
2. número de movimientos + tiempo de carga (servidor / navegador)
3. errores de las últimas 24 h: cuántos, por acción y tipo
4. fecha del último movimiento
5. % del techo de celdas

Con eso sabemos **quién corre código viejo, a quién se le está llenando el
archivo, quién dejó de usarla y qué pantalla falla más** — y además sale el
número del umbral del archivado. Lo demás se añade cuando la primera tanda
demuestre que la miramos.
