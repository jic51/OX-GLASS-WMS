# Referencias de forma para el móvil

Jose, 2026-10-13, con cuatro imágenes: *"guarda estas imágenes y ponle un
comentario que diga que vamos a hacer algo así (no todo, algunas partes, no con
los mismos colores pero con la misma forma) para la app en el mobile."*

---

## LO QUE SON Y LO QUE NO SON

**Son referencias de FORMA, no de aspecto.** Jose lo dijo con esas palabras y
conviene dejarlo escrito porque es la diferencia entre que esto sirva y que
arruine la app:

- **NO los colores.** Ninguno. El crema y marrón de la primera, el morado de la
  segunda, los pasteles de la tercera: nada de eso entra. Acopio ya tiene su
  paleta y en ella el **rojo significa que sale material y el verde que entra**.
  Eso lo lee alguien de bodega desde dos metros y no es decoración: es velocidad
  de lectura. Un rediseño que toque esos dos colores quita información.
- **NO el contenido.** Son apps de hábitos, de tareas y de métricas de equipo.
  Nada de lo que cuentan se parece a mover vidrio entre estantes.
- **SÍ la forma:** cómo se agrupa, cómo se apila en vertical, cuánto aire hay
  entre bloques, dónde van los botones cuando sólo tienes un pulgar.

**Y no son trabajo decidido.** Están aquí por lo mismo que `VIDEOS-DE-UX.md`:
decidir el rediseño con la mitad de las referencias sería decidirlo mal. Esto
es el material, no el plan.

---

## QUÉ MIRAR EN CADA UNA

### `01-habitos-tarjetas.png` — la que más sirve

Una rejilla de tarjetas de dos columnas donde cada una es una cosa con su
estado. En móvil, **una tabla de movimientos no es una tabla**: son tarjetas.
Acopio ya apila filas en pantalla pequeña, pero las apila como filas estiradas,
no como esto.

Lo aprovechable, en concreto:

- **La tira de días arriba**, con el de hoy marcado. Acopio tiene fecha en un
  campo de formulario; en el móvil, elegir día es lo más frecuente que se hace.
- **El contador «3/7 done»** pegado al título de la sección. Acopio tiene
  cifras así —cuántos entrantes sin registrar, cuántos bajo mínimo— y hoy viven
  lejos de lo que cuentan.
- **La tarjeta con una línea grande y una pequeña debajo.** Es exactamente la
  «sublínea» que la v12.62 unificó, usada bien.

Lo que NO: el dibujito por tarjeta. Bonito en una app de hábitos de siete
tarjetas; en una bodega con doscientos materiales es ruido y peso.

### `02-tablero-tareas.png` — la rejilla de entrada

La primera pantalla: seis cuadrados grandes, cada uno con icono, nombre y
cuántas cosas tiene dentro. **Para el móvil de Acopio eso es mejor que las
pestañas de arriba**, que en pantalla pequeña se aprietan hasta no leerse.
Stock · Movimientos · Mapa · Entrantes · Proyectos, cada uno con su cuenta.

Y la tercera pantalla enseña algo que Acopio necesitará: **una lista de tareas
con casilla dentro de una ficha**. Es la forma del conteo físico, el día que se
construya.

### `03-metricas-calendario.png` — para los informes, no para hoy

Es la forma que tendrían los informes que no tenemos (`LO-QUE-FALTA-EN-LA-APP`
§3): una cifra grande, su variación, y debajo el detalle. La pantalla del
calendario con los puntos en los días con algo es exactamente «qué llega esta
semana».

**El aviso:** esos degradados y esas tarjetas translúcidas son caros de pintar
y Acopio corre dentro de un iframe de Apps Script en teléfonos de bodega. La
forma sí; el cristal esmerilado no.

### `04-menu-cuenta-claro-oscuro.png` — el que menos trabajo da

Un menú de cuenta, el mismo en claro y en oscuro, con el interruptor de tema
dentro. **Acopio ya tiene esto casi igual** —menú de cuenta con modo oscuro,
ajustes, usuarios—. Lo que enseña y nosotros no tenemos es **la barra de
espacio con su color según lo lleno que esté**, que en Acopio vive escondida en
Ajustes → Sistema.

Lo de abajo (*"Start a Project Brief"*) es un anuncio dentro del producto.
**Eso no.** Es justo lo que decidimos no hacer al construir la ventana de
novedades: sale porque pasó el tiempo, no porque le pasara algo al usuario.

### `05-menu-lateral.png` — guardada para una versión futura

Jose, 2026-10-14: *"guárdala porque en alguna versión haremos un menú lateral
que se vea así, por ahora no."*

Un menú lateral de dos capas: una tira estrecha de iconos siempre visible, y al
lado el panel ancho con los nombres y los apartados desplegados. Lo que
resuelve, y por eso vale la pena guardarla: **Acopio navega con pestañas
arriba**, y en el teléfono esas pestañas se aprietan hasta no leerse. Un menú
lateral no tiene ese límite — crece hacia abajo, que es donde sobra sitio.

Lo aprovechable: la tira de iconos con la etiqueta flotante al pasar por
encima, los apartados que se despliegan dentro del propio menú (Settings →
Data source / Targets / Members), y el candado en las secciones a las que no
se tiene acceso, que dice «existe y no es para ti» en vez de esconderlas — eso
último es justo lo contrario de lo que hace Acopio hoy con los botones de
admin, y es mejor.

**Por ahora no**, dicho por Jose. Guardada aquí para cuando toque.

### `06-menu-lateral-medidas.png` — la del menú lateral, CON MEDIDAS

Jose, 2026-10-14: *"te paso otra imagen para guardar y tener como referencia al
modificar y crear apps y menús."*

`06-menu-lateral-medidas.png`. La primera vez el archivo no llegó al disco y
aquí sólo quedó la descripción; Jose la reenvió y ya está guardada.

Es el mismo menú lateral de `05`, pero **anotado con sus medidas**: una tira de
iconos a la izquierda y un panel ancho al lado, con las separaciones marcadas
en naranja.

**Las medidas, tal como vienen anotadas:**

| | |
|---|---|
| margen exterior de la tira | 8 px |
| hueco entre iconos | 8 px |
| alto de un icono con su texto | 56 px |
| separación arriba del bloque | 24 px |
| alto de una fila del panel | 32 px |
| alto de la fila destacada (*Create New Workspace*) | 48 px |
| separación entre grupos del panel | 12 px |
| margen inferior | 16 px |
| margen lateral del panel | 8 px · 12 px |

### Lo que esto nos dice, y es más útil que el dibujo

**Es una escala de 4: 8, 12, 16, 24, 32, 48, 56.** Todo múltiplo de cuatro, sin
excepciones.

La nuestra (`--sp-1` … `--sp-10`, v12.62) es: **4 · 6,4 · 8 · 9,6 · 12 · 16 ·
20 · 24 · 32 · 48**. Siete de los diez peldaños coinciden con los suyos. Los
dos que desentonan son **6,4 y 9,6**, y desentonan por un motivo concreto: los
nuestros salen de `rem` —`.4rem` y `.6rem`— y los suyos de píxeles. Un `.4rem`
son 6,4 px, que no es múltiplo de cuatro de ninguna manera.

**No propongo cambiarlos.** Esos dos peldaños se eligieron porque eran los
valores que ya usaba media app, y moverlos movería más pantalla de la que
arreglaría. Pero queda escrito que la escala de fuera es más limpia que la
nuestra, y por qué la nuestra no lo es: **nació de lo que había, no de una
decisión**.

Y una cosa que sí copiaría tal cual: **la fila destacada es más alta (48 px
contra 32)**, no de otro color. La jerarquía por tamaño aguanta en blanco y
negro y a dos metros; la jerarquía por color no.

---

## LO QUE YO HARÍA, CUANDO TOQUE

Por orden de lo que cambia la vida de alguien con un teléfono en la bodega:

1. **La rejilla de entrada** (de `02`), que resuelve las pestañas apretadas.
2. **Las tarjetas de movimiento** (de `01`), que resuelven la tabla estirada.
3. **El selector de día en tira** (de `01`), lo más tocado en móvil.
4. **La barra de espacio a la vista** (de `04`), una línea.

Los informes (`03`) van cuando existan los informes.

**Nada de esto antes de vender.** Jose, 13/10: *"hay muchas cosas que quiero
cambiar pero primero quiero venderla y empezar a obtener datos y dinero."*
Estas cuatro imágenes son para después de eso, y están guardadas para que no se
pierdan mientras tanto — que es lo que pasó con dos fallos en octubre y por lo
que existe `LO-QUE-ENSENAN-LOS-REELS.md`.
