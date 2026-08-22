# La vista por pasillo — qué es, en qué se diferencia, y para quién sirve

Jose vio la maqueta del hero de la landing (una lista de ubicaciones con su
material y su cantidad) y preguntó: *"así no se ve la app, pero me parece
interesante — ¿en qué se diferencia de lo que tenemos, y para qué tipo de
empresa serviría?"*

Buena pregunta, y la respuesta es más interesante de lo que parece.

---

## Lo que la app tiene hoy

Dos formas de mirar el inventario, y las dos parten del **material**:

1. **Stock Dashboard** — una fila por material, con el total sumado de todas
   las ubicaciones. Contesta *"¿cuánto GLASS tenemos?"*
2. **Warehouse Map → Rack Drawer** — el mapa muestra los racks como fichas;
   al hacer clic en uno se abre un panel con lo que hay adentro. Contesta
   *"¿qué hay en A1A?"* — **pero de un rack a la vez, y hay que abrirlo.**

## Lo que la maqueta propone

Una lista **continua, ordenada por ubicación**, con varias ubicaciones a la
vista al mismo tiempo, y el stock bajo resaltado en línea.

La diferencia de fondo no es estética. Es **cuál es la unidad de lectura**:

| | Vista actual | Vista por pasillo |
|---|---|---|
| Empieza por | El material | La ubicación |
| Pregunta que contesta | "¿Cuánto tengo de X?" | "¿Qué hay del A1 al A9?" |
| Cuántos racks a la vez | Uno (hay que abrirlo) | Muchos, seguidos |
| Se usa | Sentado | **Caminando** |

Esa última fila es la clave. La vista actual es para responder desde el
escritorio. La vista por pasillo es para **llevarla en la mano recorriendo la
bodega**.

---

## Para qué tipo de empresa sirve de verdad

**Sirve mucho cuando la ubicación manda sobre el material:**

- **Bodegas con slotting fijo** — cada material tiene su casa, y la gente se
  mueve por dirección, no por nombre. Vidrio, ferretería, materiales de
  construcción, refacciones.
- **Operaciones donde se camina el pasillo**: surtir un pedido, revisar un
  nivel, verificar una fila entera después de un movimiento grande.
- **Tiendas y almacenes de tienda** con anaqueles numerados.

**No aporta gran cosa cuando:**

- El material no tiene ubicación fija (todo se apila donde cabe).
- Hay pocas ubicaciones — con 5 racks, el mapa actual ya se ve entero.
- La pregunta habitual es de totales, no de dónde está.

---

## El uso donde esto deja de ser cosmético

**Es exactamente la pantalla que necesita un conteo físico.**

Contar es, por definición, recorrer ubicaciones en orden y comparar lo que
hay con lo que el sistema dice. Eso pide justo esta vista: ubicaciones
seguidas, una línea por material, cantidad al lado, avanzando pasillo abajo.

O sea: la vista por pasillo **no es una tercera forma de mirar el
inventario** — es el chasis del conteo cíclico que ya está diseñado en
`BACKLOG.md`. Construirla suelta y construir el conteo después sería hacer
dos veces el mismo trabajo.

**Recomendación: no construirla por separado.** Que salga como parte del
conteo cíclico, y una vez que exista, evaluar si vale la pena dejarla
también como vista de solo lectura para "recorrer el pasillo" sin estar
contando. Ese segundo paso es barato si el primero ya está hecho, y no tiene
sentido al revés.

---

## Sobre la maqueta de la landing

Vale aclarar una cosa: **la maqueta del hero no es una captura de la app.**
Es una ilustración honesta —datos y códigos con la forma real que tienen— y
está ahí porque comunica el producto en un vistazo mejor que una captura
encogida.

Cuando exista la grabación de pantalla (el hueco ya está en la landing), la
maqueta puede quedarse igual: hace un trabajo distinto y lo hace bien.
