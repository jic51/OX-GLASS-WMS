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
