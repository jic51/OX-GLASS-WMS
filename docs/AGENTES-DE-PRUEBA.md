# Agentes que usen la app para encontrar fallos

> Idea de Jose, 2026-09-28: *"¿hay alguna forma de crear agente(s) que prueben la
> app? Agentes que hagan entries con materiales inventados en tiempos aleatorios
> (receiving), agentes que corrijan materiales (warehouse), agentes que auditen la
> información (admins)… cada uno debe decir qué está mal según su criterio y
> sugerir una mejora, y luego de colectar todas esas mejoras en una lista las
> revisamos, les ponemos prioridad y si van a V1 (errores) o V2 (mejoras)."*

## Primero: la idea es buena, y por una razón concreta

**Todos los fallos graves de este mes los encontró Jose usando la app.** El PO
`07-6329` convertido en fecha, los movimientos sin ID, el archivo borrado a las
3:19, las columnas que saltan al filtrar. Ninguno salió de leer el código:
salieron de que una persona usara el sistema durante semanas y mirara.

Eso es un cuello de botella de **una** persona. Y los tres peores no se
encuentran leyendo código *por naturaleza*: aparecen con el tiempo (el archivado
nocturno), con el volumen (mil movimientos sin ID) o con un dato raro que a nadie
se le ocurre teclear (`07-6329`). Un robot que use la app sin parar durante
semanas es exactamente la herramienta para esa clase de fallo.

## Pero hay que partir la idea en tres, porque cuestan cosas muy distintas

La idea de Jose mezcla tres máquinas. Separadas, dos de ellas **no necesitan
ninguna IA y no consumen ningún plan**, y son las que encuentran los fallos
graves. La tercera sí es de agentes, y es la que hay que racionar.

| | Qué hace | ¿Necesita IA? | Qué clase de fallo encuentra |
|---|---|---|---|
| **1. El robot** | usa la app sin parar con datos inventados | **No** | los del tiempo y el volumen — los tres peores de este mes |
| **2. Las invariantes** | comprueba lo que debe ser verdad pase lo que pase | **No** | distorsiones de datos, descuadres, silencios |
| **3. El panel** | mira las pantallas y opina por oficio | **Sí** | UI/UX, huecos de flujo, cosas que "están bien" y molestan |

**El orden importa: 1 y 2 primero.** Son gratis de ejecutar, corren solos
durante meses, y son las que habrían pillado lo del 26 de septiembre.

---

## 1. El robot — un `.gs` con disparador en la copia DEMO

Un script en la copia **"my warehouse"** (la DEMO, nunca la de OX) con un
disparador que cada hora hace unas cuantas operaciones al azar llamando a las
funciones del propio sistema: `addEntry`, `submitMovement`, `manageMaterial`,
renombrar, ajustar, borrar, restaurar de la papelera.

Los materiales inventados ya están escritos: `tools/demo-nombres.gs` tiene
`BASES_DEMO` (40) y `TIPOS_DEMO` (12), que es de donde salen los nombres que Jose
ya usó para las capturas.

**Lo que hay que hacer bien, y es todo el valor del robot:**

- **Que corra a horas incómodas a propósito.** 1:55, 2:05, 2:59, 3:05. El backup
  es a las 2 y el archivado a las 3: **ahí vive la clase de fallo que borró el
  archivo**, y sólo se encuentra escribiendo mientras el trigger corre.
- **Que use datos feos a propósito.** `07-6329`, `0012`, `1/2`, `2.5`, nombres
  con acentos, con comillas, con `|||` (que es el separador del material ID),
  cantidades negativas, cero, y un nombre de 300 caracteres. Uno de cada diez.
- **Que a veces haga cosas a la vez.** Dos salidas del mismo estante en el mismo
  segundo — la prueba que Jose ya hizo a mano y que destapó los bloqueos.
- **Que deje rastro de lo que hizo**, en su propia pestaña, para que cuando algo
  descuadre se pueda reconstruir la secuencia. Sin esto, el robot encuentra
  fallos que no se pueden reproducir, que es casi lo mismo que no encontrarlos.

**Coste: cero.** Corre dentro del Google de Jose, con su cuota de Apps Script, sin
tocar ningún plan de Claude.

## 2. Las invariantes — lo que debe ser verdad pase lo que pase

La segunda mitad del robot, y la que convierte "hizo mil cosas" en "encontró
algo". Una función que lee la hoja después y exige:

- **El stock es la suma de los movimientos.** Reconstruir y comparar. Si no
  cuadra, el motor perdió algo — y esto es lo que hubiera gritado el 26/09 a las
  3:20 en vez de que lo descubriera una persona por la mañana.
- **Ningún movimiento sin `MOV_ID`.** Es el fallo de `josephl`, y sigue sin causa
  conocida (ver `BACKLOG.md`). Un robot que hace mil movimientos con tres roles
  distintos lo reproduce o lo descarta en una noche.
- **Ningún PO que se volvió número.** `test-text-stays-text.js` lo protege en el
  código; esto lo comprueba en los datos.
- **Todo material ID se recalcula igual.** `getMaterialId` no se guarda, se
  recalcula: si un renombrado dejó una fila cuyo ID no se reproduce, hay stock
  huérfano.
- **Las tres hojas derivadas coinciden con un rebuild.**
- **El audit log tiene una línea por cada cosa que pasó.** Un hueco en el audit
  log es un fallo por sí mismo.

Esto extiende lo que ya hay: `test-data-quality.js` y el menú **Run
Reconciliation**. **Coste: cero**, misma razón.

> **Las invariantes son la parte transferible.** Para cualquier programa con
> datos, "qué tiene que ser verdad sin importar lo que hizo el usuario" es una
> lista que se escribe una vez y se comprueba para siempre. Es lo que más se
> parece a un seguro de verdad.

## 3. El panel — aquí sí, agentes, y aquí hay que racionar

Los cuatro oficios de Jose son la parte buena de la idea, porque **cada uno ve
cosas distintas y ninguno ve las del otro**:

| Oficio | Qué mira, y qué sólo él nota |
|---|---|
| **Receiving** | cuántos clics cuesta meter una entrega de 12 líneas; si detecta el duplicado; si la etiqueta sale bien |
| **Shipping** | si puede sacar lo que no hay; si la reserva se respeta; si el proyecto equivocado es fácil de elegir |
| **Cycle count** | si la pantalla se puede comparar contra el estante sin papel; si el ajuste explica de dónde salió el número |
| **Admin** | si el audit log reconstruye el día; si los permisos hacen lo que dicen; si el coste no se filtra a quien no debe |

**El blocker honesto, dicho sin rodeos:** un agente mío no puede entrar a la app
desplegada. Requiere iniciar sesión con Google, no tengo esa sesión y no debo
tenerla. Lo que **sí** puede hacer, y es más de lo que parece, es conducir la app
contra el arnés que ya existe (`tools/andamio.js` + las 40 pruebas de navegador
con Playwright): la misma `Index_v3_fixed.html` de verdad, con un servidor de
mentira y datos fabricados. Eso cubre todo lo visual y todo el flujo. Lo que no
cubre es el servidor de verdad — y de eso se encarga el robot del punto 1, que sí
vive dentro.

## Sobre el plan Pro — lo que puedo afirmar y lo que no

**Lo que sí:** cada agente arranca en frío y vuelve a deducir el contexto, así
que un panel de seis agentes a la vez sobre la misma tarea es el camino caro. Y
los puntos 1 y 2 **no gastan plan en absoluto**, porque corren dentro del Google
de Jose.

**Lo que no:** no sé los límites exactos de su cuenta, y no voy a inventarlos.
Los ve él en su propio uso.

**Pero el diseño no depende de esa respuesta**, y eso es lo que importa:

- Puntos 1 y 2: gratis. Se construyen ya.
- Punto 3: **un oficio por sesión, no cuatro a la vez.** Cuatro sesiones cortas
  en cuatro días leen igual de bien que un panel simultáneo, cuestan menos, y
  además salen mejor: un agente solo no se contagia de las conclusiones de otro,
  que es justo el sesgo que un panel tiene que evitar.

## El filtro, que es lo que salva la lista de ser inútil

Un panel de agentes produce MUCHOS hallazgos, y la mayoría son opiniones. Sin un
filtro objetivo la lista se convierte en discusión.

**La regla, y encaja exacta con el V1/V2 que Jose ya propuso:**

> **Es un ERROR (V1) si se puede escribir una prueba que falle hoy y pase después.
> Si no se puede, es una MEJORA (V2).**

No es una regla burocrática: es la que este proyecto ya usa sin haberla escrito.
Cada arreglo de este mes tiene su prueba, y cada prueba nació de un fallo que se
podía reproducir. Un hallazgo que no se puede convertir en una prueba que falla no
es un fallo — es una preferencia, y las preferencias van a V2 y se ordenan por
cuánto molestan.

## ¿Sirve para otros proyectos?

Sí, y el molde es `robot + invariantes + panel`:

- **El robot** se reescribe por proyecto (habla con el programa de cada uno).
- **Las invariantes** son el patrón transferible, y el más valioso.
- **El panel** se transfiere entero cambiando los oficios.

Y hay un detalle que lo hace más barato de lo que parece la segunda vez: **el
robot y las invariantes se escriben una vez y no envejecen**, porque no
comprueban cómo está hecho el programa, sino qué tiene que seguir siendo verdad.
Las pruebas que miran el código hay que actualizarlas cada vez que el código
cambia; éstas no.

## Qué haría yo, en orden

1. **El robot en la copia DEMO**, con las horas incómodas y los datos feos. Un
   día de trabajo, y es el que habría pillado lo del 26/09.
2. **Las invariantes**, corriendo detrás del robot cada noche, con aviso por
   correo cuando una falle. Medio día.
3. **Dejarlo corriendo una semana sin mirar**, y leer lo que salga.
4. **Después** el panel, un oficio por sesión, empezando por Receiving — porque
   es el que más veces al día se usa y donde un clic de más cuesta más.

El orden no es por tamaño: es porque los puntos 1 y 2 encuentran los fallos que
**pierden datos**, y el punto 3 encuentra los que **molestan**. Los primeros van a
V1 por definición.
