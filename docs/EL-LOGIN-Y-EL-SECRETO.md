# H-15 y H-11 — qué hay y qué opciones tenemos

Jose, 23/11: *"H-15 y H-11 · el token y el secreto de OAuth — ¿qué con esto?
¿qué hay o qué opción tenemos?"*

**La respuesta corta: son dos cosas muy distintas, y sólo una es decisión
tuya.**

| | Qué es | ¿Decisión tuya? |
|---|---|---|
| **H-15** | Tres descuidos míos en el inicio de sesión | **No.** Es trabajo, pequeño, y lo hago |
| **H-11** | Nuestro secreto de OAuth es el mismo en todas las instalaciones | **Sí**, y hay tres caminos |

---

## H-15 · El inicio de sesión — no hay nada que decidir, hay que hacerlo

### Qué pasa

Cuando alguien inicia sesión, el navegador se inventa una cadena —un «state»—
la manda a Google, y Google devuelve el correo verificado. El servidor guarda
ese correo bajo esa cadena durante cinco minutos. Y entonces:

> **Quien presente esa cadena en esos cinco minutos se lleva un token de sesión
> válido para ese correo.** Tiene que ser así: esa llamada corre *antes* de que
> exista ninguna identidad, así que no puede pedir ninguna.

**Y la cadena se hace con `Math.random()`**, que no es un generador para esto.
La mitad de ella es `Date.now()`, o sea **lo único que un atacante ya sabe**.

**Hoy no es explotable por fuerza bruta** —son del orden de 2⁵² posibilidades— y
hay que decirlo para no asustar de más. Lo que lo hace una cosa a arreglar es
que **el arreglo es una línea**.

### Las otras dos, y la segunda es peor que la primera

**2 · El limitador que no limita nada.** El código dice que el limitador *"frena
el adivinar los states de otras personas"*. **No lo frena:** está contado **por
state**, así que quien prueba mil cadenas distintas estrena un contador en cada
una y nunca llega al límite.

> **Un comentario equivocado en un sitio de seguridad es peor que ningún
> comentario**, porque alguien —nosotros, dentro de un año— va a dar por
> protegido algo que no lo está. Esto es lo que más me molesta de los tres.

**3 · El state no se comprueba al volver.** `handleOAuthCallback_` no lo compara
con nada: es una llave de encuentro, no una protección. Cerrarlo es gratis
cuando se toque lo demás.

### Lo que haría, y no necesito que decidas

1. La cadena, con `crypto.getRandomValues`. Una línea.
2. El limitador, contado por quien pregunta y no por lo que pregunta. Y **el
   comentario corregido**, que es la mitad del arreglo.
3. El state comprobado al volver.
4. Una prueba que **ejecute** el generador y compruebe que no sale de
   `Math.random()` — porque el día que alguien «simplifique» esa línea, esto
   tiene que ponerse rojo.

**Tamaño: pequeño.** Medio día con su prueba. Lo meto en la siguiente versión
salvo que me digas que no.

---

## H-11 · El secreto de OAuth — esto sí lo decides tú

### Qué es, y lo primero: no es una fuga

El identificador y el secreto de OAuth son **los mismos en todas las
instalaciones**, y viven en las Script Properties de la copia de cada cliente.
**Eso es el diseño, no un accidente:** el proyecto de Apps Script es suyo, así
que su administrador puede leerlos. El código ya lo dice.

### Por qué importa igual

1. **Con el identificador y el secreto se puede montar una pantalla de
   consentimiento que diga «Acopio»** y pedirle permisos a cualquiera. No da
   acceso a los datos de otro cliente —eso sigue en la cuenta de cada uno— pero
   **permite engañar en nuestro nombre**.
2. **Rotarlo los rompe a todos a la vez.** No hay forma de cambiarlo para uno
   solo: el día que haga falta cambiarlo, hay que tocar todas las
   instalaciones.

### Y una cosa que hay que decir, porque cambia la cuenta

**El 24 de octubre pegaste el `OAUTH_CLIENT_SECRET` y la clave de Gemini en
este chat.** Te lo dije entonces y contestaste: *"lo haré después, por ahora
no"* — y es tu decisión, sigue siéndolo. Pero ahora preguntas justo por esto, así
que la pongo encima de la mesa sin adornos:

> **Ese secreto está escrito en un historial de conversación.** Eso no es lo
> mismo que «sólo lo puede leer el administrador de cada copia»: es una copia
> más, fuera de las Script Properties de nadie. Mientras OX sea la única
> instalación el daño posible es pequeño. **El día que haya un segundo cliente,
> deja de serlo**, porque el secreto compartido empieza a valer para engañar en
> nombre de todos.

### Las tres opciones, y qué cuesta cada una

| | Qué | Cuesta | Cuándo tiene sentido |
|---|---|---|---|
| **A · Dejarlo** | Nada cambia | Nada | Sólo mientras **OX sea la única instalación** y el secreto no se haya ido a ninguna parte |
| **B · Rotarlo una vez** | Un secreto nuevo en Google Cloud, y ponerlo en cada instalación | Un rato tuyo, y **todas las instalaciones dejan de iniciar sesión hasta que se actualicen** | **Ahora**, precisamente porque está en un chat y porque hoy sólo hay una instalación que actualizar. Es el momento más barato que va a haber |
| **C · Un cliente OAuth por instalación** | Cada cliente crea el suyo en la instalación | **Un paso más, feo, en la instalación** de cada cliente nuevo | A partir de cierto número de clientes. Es lo coherente con *«tus datos en tu cuenta»* |

### Mi recomendación, en dos pasos

**1 · B ahora.** Rotar el secreto hoy cuesta **una instalación** —la tuya— y
quita de encima una copia que anda suelta en un historial. Dentro de seis meses
costará tantas instalaciones como clientes tengas. **Es la clase de cosa que
sólo se abarata hacia atrás.**

**2 · C cuando haya un tercer cliente**, no antes. Mientras sean uno o dos, el
paso extra en la instalación cuesta más de lo que protege — y la instalación es
exactamente donde se pierden los clientes.

**Y lo mismo con la clave de Gemini**, que es más fácil: ésa no rompe a nadie al
cambiarla. Rotarla es gratis y se puede hacer hoy mismo.

> **Nada de esto lo toco sin que me lo digas**, porque rotar un secreto es una
> acción sobre tu cuenta de Google, no sobre el código.
