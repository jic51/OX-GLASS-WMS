# Lo que enseñan los reels de diseño — medido y leído

Jose, 2026-10-12, con cinco grabaciones: *"revisa estos videos y aprende, toma
el tiempo de respuesta de las cosas al dar clic y la forma de moverla y la
forma de las cosas."*

Este documento existe porque dos días antes pasó lo contrario: Jose dijo *"ya
habíamos hablado de eso antes"* sobre dos fallos reales, y tenía razón — se
habían perdido por no estar escritos. Esto se escribe para que no se pierda.

---

## CÓMO SE MIDIÓ, Y UN CAMBIO DE MÉTODO A MITAD

Empecé midiendo píxeles: diferencia entre fotogramas para sacar la duración de
cada animación, y saturación por píxel para sacar la disciplina de color.

**La mitad de eso no servía, y conviene decir cuál.**

Estos no son grabaciones de alguien usando una app: son **reels de diseño que
ENSEÑAN los números en pantalla**. Leerlos vale más que medirlos. Y la medida
de color estaba midiendo el vídeo que se reproduce dentro de Facebook —daba
73-87% de «azul claro», que es el tema del propio reel— no una interfaz.
**Descartada.**

La medida de TIEMPOS sí sirvió, y resultó valer el doble: da lo mismo que los
reels dicen por escrito. Dos métodos distintos, el mismo número.

### Lo que la medida de tiempos NO puede afirmar

- Las grabaciones **decodifican a 32–42 fps**, no a los 120 que anuncia el
  contenedor: es grabación de ritmo variable. La resolución real es ~25-30 ms,
  así que distingo 100 ms de 300 con confianza y **no distingo 120 de 140**.
- Las «ráfagas» mezclan transiciones con desplazamientos cortos. No sé separar
  un panel que se abre de un dedo que arrastra medio centímetro.

**139 ráfagas medidas** en los cinco vídeos. Medianas por vídeo: 134, 135, 141,
220 y 240 ms.

---

## 1 · LOS TIEMPOS

El reel sobre Linear lo dice en pantalla, sin que haya que medir nada:

> **80 ms hover · 150 ms max · 0 overshoot**

con **«generic 300 ms» TACHADO EN ROJO** y el control deslizante empujado de
`bouncy` hacia `snappy`.

El reel de la pila de notificaciones enseña su JavaScript, y ahí el descarte
espera **450 ms** antes de quitar la tarjeta del DOM.

### Cómo estamos nosotros

| | Acopio | Los reels |
|---|---|---|
| Salida del mazo (`--deck-out`) | **500 ms** | 450 ms |
| Entrada del mazo (`--deck-in`) | **620 ms** | 150 ms máximo |
| Borrado de tarjeta (`_DECK_LEAVE_ANIM_MS`) | **500 ms** | 450 ms |

**La salida la tenemos clavada.** La entrada es **cuatro veces** lo que ese
reel llama el máximo.

**Y NO ES UN FALLO: ES UNA ELECCIÓN DE JOSE**, escrita en el CSS desde que se
hizo — *"Jose asked for '2 out of 5' — unhurried enough that the eye follows
what moved, short of the point where waiting for it becomes the feeling."*

Lo que este documento añade es el otro número, no un veredicto. Si algún día
se decide acercarse, el sitio es `--deck-in` y nada más: está escrito una sola
vez, para todo el mazo.

**Lo que sí vale la pena mirar aparte:** los 80 ms de `hover`. Eso no es una
animación de entrada, es la respuesta al pasar el dedo o el ratón por encima —
y ahí nosotros no tenemos un número decidido, tenemos lo que haya salido en
cada regla.

---

## 2 · «BORDERS, NOT SHADOWS» — lo que más nos sirve

Decisión 02 del reel de Linear, literal:

    border: 1px solid rgba(255,255,255,.08)
    box-shadow: none

Las superficies se separan **por color de fondo**, no por sombra:

| | |
|---|---|
| lienzo | `#0B0D10` |
| lista | `#13161B` |
| hover | `#1A1E25` |

**POR QUÉ NOS IMPORTA TANTO:** medido el 2026-10-11, Acopio tiene **45 sombras
distintas para 55 usos**. Casi una sombra a medida por cada sitio donde se
usa — la peor cifra de toda la deuda estética, y la única para la que no
teníamos ninguna salida.

Este reel la tiene: **no tener casi ninguna.** Separar con un borde de 1px al
8% y con el color del fondo.

### Y cuando sí hay sombra, va teñida

El otro reel usa sombra, y no es negra:

    box-shadow: 0 18px 45px rgba(91,76,230,.16),
                0 0 0 2px rgba(116,92,255,.12);

Teñida con el **color de marca**, más un anillo de 2px. Las nuestras son todas
`rgba(0,0,0,…)`. Una sombra negra sobre un fondo de color es lo que hace que
una tarjeta parezca pegada con cinta; una teñida parece parte del mismo
material.

---

## 3 · «ONE COLOR. EVERYTHING ELSE GREY.»

Decisión 03: siete grises y **un solo color de marca** (`#5E6AD2`), con la
regla escrita debajo:

> **1 brand color · icons for status**

El estado se dice con **iconos**, no con color.

### Aquí discrepo en parte, y creo que tenemos razón nosotros

En una bodega, **rojo = sale** y **verde = entra** son significados reales que
alguien lee de un vistazo desde dos metros. Eso no es decoración y no se
sustituye por un icono sin perder velocidad de lectura.

Lo que sí hay que mirar es otra cosa: **cuántos colores usamos para cosas que
NO son estado.** Esa es la pregunta que este reel deja bien planteada, y no la
hemos hecho nunca.

---

## 4 · «DISMISSAL FOLLOWS STAKES»

Decisión 04 de otro reel, y es la regla más corta y más útil de las cinco:

> **reversible = toast · money = page**

- **Bajo riesgo** (ajustes guardados) → aviso flotante con *Undo*, se va solo
  a los **2,9 s**.
- **Alto riesgo** (pagar $48) → **una página entera**, no un aviso.

### Cómo estamos

Usamos aviso flotante para todo, **incluido borrar movimientos**. Lo que nos
salva es que tenemos **papelera**: borrar un movimiento SÍ es reversible, así
que el aviso está bien ganado y la regla nos da la razón.

**Donde habrá que aplicarla de verdad es en Stripe.** Cobrar no es reversible.

---

## 5 · EL DETALLE MÁS FINO: LAS COSAS CARAS SE MUEVEN POCO

El reel del arrastre anota los valores de su propia animación:

    scale 1.03  ·  +8 px shadow  ·  3° tilt

Un **3% de escala** y **tres grados**. Nada más.

Es la misma lección que salió sola al rediseñar las salidas del mazo el
2026-10-12: Jose propuso que la tarjeta aceptada cruzara, y acabó moviéndose
un 22% porque *una tarjeta volando media pantalla sobre el mapa es ruido y la
dirección se lee igual con un palmo*. Los reels lo llevan más lejos todavía.

---

## 6 · «DOS APPS CARGAN EN EXACTAMENTE 0,9 s. UNA SE SIENTE LENTA, LA OTRA INSTANTÁNEA»

Jose, 26/10, con una captura del reel de **moe.dev** (@mhmdnabdev): *"te mando
2 vídeos de UI/UX para que aprendas y guardes la información."*

El reel enseña dos teléfonos con **el mismo 0,9 s** encima y pregunta por qué
uno parece rápido. La respuesta no es de rendimiento: es de **qué se ve
mientras se espera**.

**Por qué éste nos toca más que ningún otro de la lista.** Es exactamente la
queja que Jose lleva repitiendo desde el 22/10 y que yo seguía tratando como un
problema de velocidad: *"según yo el vídeo muestra que aún sigue lenta la app
al abrir"*. Puede que no haya nada que acelerar. **Lo que hay es un hueco
blanco que no dice nada, y luego todo apareciendo de golpe y empujándose.**

Lo que se saca de aquí, y encaja con lo que él mismo pidió el 25/10 sobre el
nombre y el logo:

1. **Enseñar la FORMA antes que el dato.** Un hueco del tamaño exacto de lo que
   va a llegar —la tabla, las tarjetas, la barra de arriba— se lee como «ya
   casi». Un hueco vacío se lee como «no ha pasado nada».
2. **Nada que llegue tarde puede mover lo que ya está colocado.** Es la misma
   regla que las columnas del Dashboard y la misma que la fila nueva del
   registro de errores. Tres sitios, una regla.
3. **Lo primero que aparece tiene que ser lo que la persona vino a ver**, no la
   decoración. Si el logo llega antes que el stock, hemos gastado el primer
   segundo en lo que a nadie le importa.

Medido en nuestra propia barra de arriba el 26/10, con el navegador: cuando
llega el logo, las pestañas, el menú de la cuenta, el punto verde **y todo el
cuerpo de la página bajan 37 px de golpe**. Lo mismo a 1280, 820 y 390 px de
ancho — que es una buena noticia, porque significa **una sola regla**, no tres.

## 7 · «TUS NOMBRES DE COMPONENTE O AYUDAN A LA IA O LA CONFUNDEN»

Reel de **Memorisely**, mismo envío. Enseña una pauta de tres partes para
nombrar: **Base → Variant → Size Modifier** (`Button` · primario, secundario,
contorno, peligro · `Large`, `Medium`, `Small`), y la rejilla entera dibujada
para que las combinaciones se vean.

**Lo honesto primero: esto no es nuestro caso, y conviene decirlo.** Acopio no
tiene biblioteca de componentes ni Figma; es UN archivo con CSS escrito a mano,
y eso es a propósito. Copiar un sistema de nombres de Figma aquí sería ponerle
burocracia a algo que no la pide.

**Lo que sí nos sirve, y es la idea de debajo:** un nombre de clase tiene que
decir **en qué eje está**. Nuestras clases ya lo hacen a medias y por accidente
—`btn`, `btn-primary`, `btn-ghost`, `btn-sm` son exactamente Base + Variante +
Tamaño— pero conviven con otras que no siguen ninguna pauta. Y donde eso ya nos
costó algo real fue el 24/10, con `.pro-lock` y `.pro-off`: dos nombres
parecidos para dos cosas distintas (un BOTÓN con candado y una ZONA apagada), y
yo mismo me confundí leyéndolos.

**La regla que me llevo, sin inventar un sistema:** cuando dos clases se
parezcan en el nombre, o nombran lo mismo —y entonces sobra una— o nombran
cosas distintas —y entonces el nombre tiene que decir cuál es la diferencia—.
Ni `.pro-lock` ni `.pro-off` dicen que la una es para un botón y la otra para
una zona entera.

---

## LO QUE SE PUEDE HACER MAÑANA, SIN DECIDIR NADA GRANDE

1. **Las sombras** (tanda ya en la lista): en vez de inventar una escala de
   sombras, **quitarlas** y separar con borde de 1px y color de fondo. La tanda
   deja de ser «ordenar 45 valores» y pasa a ser «quitar casi todos».
2. **Teñir las pocas que queden** con el azul de marca en vez de negro.
3. **Decidir un número para `hover`**, que hoy no tenemos. 80 ms es el que
   proponen.
4. **Contar cuántos colores usamos para cosas que no son estado.** Es una
   medida que no cuesta nada y que todavía no está hecha.

---

**Fuentes.** Cinco reels enviados por Jose el 2026-10-12: tres de *Design
Motion* («Why Linear feels expensive», «Three done screens», «One drag, five
decisions»), uno de *Design & Code With A…* («Notification Stack UI Upgrade»)
y uno de *Kuls Tech* («Why do some sites load instantly»). Las cifras de
Acopio salen de `Index_v3_fixed.html` en la v12.59 y de las medidas del
2026-10-11 anotadas en `mockups/estandarizacion.html`.
