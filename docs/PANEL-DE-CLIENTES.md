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
