# El teléfono — plan de lo que cambia y lo que se mueve

Jose, 16/11: *"haz un plan para ver lo que vas a cambiar y mover, dame mockups
antes de empezar"*.

Los mockups están en `docs/mockups/telefono-1..4.png`, dibujados con los
colores y las medidas de la app sobre un teléfono de 360 px. Esto es la letra
pequeña de esos dibujos.

> **Nada de esto está construido.** Es para mirar y decidir, y después
> construyo. Si algo no te cuadra, se cambia ahora, que es cuando es barato.

---

## Lo que ya está hecho, para situar

**v15.3 · M-01:** Movements en el teléfono ya son tarjetas. Y el pintador se
escribió **una sola vez**: la fila sigue siendo la misma `<tr>` con los mismos
`<td>`; lo único que cambia es que dejan de comportarse como tabla, y el nombre
de cada dato sale de `_colLabel`.

**Eso es lo que abarata todo lo de abajo.** Stock, Incoming y la papelera son
tablas con la misma forma, así que lo que viene es sobre todo **decidir qué va
de frente en cada una**, no volver a escribirlo.

---

## 1 · M-06 — la barra de Movements  *(mockup 1)*

**El problema, medido:** en un Pixel 5 hay que bajar **una pantalla completa**
antes de ver el primer movimiento. Son siete controles, cada uno a ancho
completo y uno debajo de otro, porque el bloque de teléfono los pone en
columna.

Y el arreglo de M-01 lo empeora en relativo: ahora que las tarjetas se leen
bien, lo que estorba es llegar a ellas.

### Qué se mueve

| | |
|---|---|
| **Suben** | `+ Entry` y `− Exit`, del fondo al primer renglón, **uno al lado del otro** |
| **Se queda** | El buscador, estrecho, en el segundo renglón |
| **Se pliega** | Los dos filtros, `⬇ CSV` y `📜 Load Older History`, detrás de un botón **⚙ Filters** que los abre debajo |
| **No cambia** | El ordenador. Nada de esto sale del `@media (max-width:768px)` |

### Dónde se toca

- `Index_v3_fixed.html`, el bloque de teléfono: la `.toolbar` de Movements pasa
  de columna a dos renglones con `grid`.
- Un `<div>` nuevo que envuelve lo que se pliega, y un botón que lo abre. Es
  **marcado nuevo, no un segundo pintador**: los mismos controles, metidos en
  una caja.

### El riesgo, y es real

**La `.toolbar` es compartida.** La misma clase la usan Stock, Incoming y
Projects. Si se cambia a secas, se cambian las cuatro a la vez — y tres de
ellas no se han mirado.

**Lo que haría:** que la regla nueva cuelgue de la barra de Movements y no de
`.toolbar` a secas. Hay una prueba que mide esto (`test-telefono.js`) y se
amplía para que las otras tres barras sigan como están.

### Tamaño
**Pequeño.** Medio día con su prueba.

---

## 2 · Stock Dashboard en tarjetas  *(mockup 2)*

### Qué va de frente

Categoría · estado · **nombre** · existencia con su barra · ubicación.

**La barra y la insignia van arriba a propósito**, y es lo propio de esta
pantalla: son lo que dice de un vistazo si hay un problema. Esconderlas tras un
toque sería dejar la tarjeta bonita y muda.

### Qué espera al toque
Fecha de entrada, última nota, documentos, y los botones de la fila.

### Dónde se toca
- `renderStock`: el mismo `data-label` que ya lleva Movements (la línea es
  idéntica, `_colLabel('stock', k)`).
- CSS: un bloque hermano del de Movements. **Las reglas comunes se sacan a una
  clase compartida** — si se copian y pegan, son dos sitios que tienen que
  coincidir sin que nada lo obligue, y el día que se cambie el radio de la
  esquina sólo cambiará una.

### El riesgo
**La barra de existencia se dibuja con anchos en píxeles.** En una tarjeta de
ancho completo hay que comprobar que no se desborde — exactamente el fallo que
salió en M-01 con la barra de selección en 320 px.

### Tamaño
**Mediano.** Un día con su prueba.

---

## 3 · Incoming y la papelera  *(mockup 3)*

Salen casi solas una vez hecho Stock. Lo que cambia es **qué manda en cada
una**:

- **Incoming:** manda la **fecha** y el **estado**. Y `✓ Mark arrived` va **a
  la vista, no escondido** — es lo que se pulsa de pie junto al camión.
- **Papelera:** manda **quién y cuándo** lo borró. La pregunta que se hace ahí
  es *«¿quién borró esto?»*, no *«¿cuánto era?»*.

### Tamaño
**Pequeño** las dos, si van después de Stock.

---

## El orden, y por qué

| | Qué | Por qué ése |
|---|---|---|
| 1º | **M-06, la barra** | Lo que más se nota con menos código, y lo tocas cada vez que abres la pestaña |
| 2º | **Stock en tarjetas** | La segunda pantalla más mirada, y la que tiene lo propio que hay que decidir bien |
| 3º | **Incoming y papelera** | Salen casi solas una vez hecho Stock |

---

## Lo que NO está en este plan, y conviene saberlo

- **M-05** (las ventanas que cambian de obra) **no es esto.** Es servidor,
  costes, reservas y etiquetas — no se arregla moviendo cosas de sitio, y no se
  mira en un mockup.
- **La tercera rama de M-04** — corregir un campo dentro del propio aviso —
  sigue pendiente y es independiente de todo lo de arriba.
- **El ordenador no cambia en nada de esto.** Si en algún momento se nota un
  cambio ahí, es un fallo, no una mejora.

---

## Lo que necesito que decidas

1. **¿El orden te vale?** Si prefieres Stock antes que la barra, se cambia sin
   coste.
2. **En Incoming, ¿`Mark arrived` a la vista en cada tarjeta?** Ocupa un
   renglón en todas. Yo lo pondría; es el botón que se usa de pie.
3. **En la papelera, ¿restaurar (`↩`) a la vista o tras el toque?** Yo lo
   pondría a la vista por el mismo motivo, pero ahí el riesgo de pulsarlo sin
   querer es mayor.
