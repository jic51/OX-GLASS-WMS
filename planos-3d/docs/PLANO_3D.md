# Plano 3D — cómo está armado

Tres piezas, un solo motor.

```
tools/plan3d-engine.js        ← toda la lógica (única fuente de verdad)
        │  node tools/build.js  (lo inyecta en los dos destinos)
        ├──→ dist/OX_PLANO_CAPTURA.html   app de campo, offline, para el teléfono
        └──→ Index_v3_fixed.html          pestaña "📐 Plano 3D" del WMS
Code_v3_fixed.gs              ← hoja WAREHOUSE_LAYOUT (leer / guardar)
```

**Nunca edites el motor dentro de `Index_v3_fixed.html` ni dentro de `dist/`.**
Edita `tools/plan3d-engine.js` y corre `node tools/build.js`; el build reemplaza el
bloque entre los marcadores `PLAN3D ENGINE` y falla si alguien mete un `<script src>`
externo en la app offline.

## Comandos

```bash
node tools/test-engine.js   # 83 pruebas: geometría, validación, capacidad, CSV, SVG
node tools/build.js         # regenera dist/ y re-inyecta el motor en Index
```

## Modelo de datos

Todo en **pulgadas**. `x` crece hacia la derecha, `y` hacia el fondo, `z` hacia arriba.
`y = 0` es la pared del fondo (N) y `y = fondo` la pared del portón (S).
`rot` son grados en sentido horario vistos desde arriba, alrededor del centro de la caja.

| Kind | Qué es |
|---|---|
| `meta` | nombre, altura libre, diagonales medidas, contorno (JSON en `extra`) |
| `column` | columna estructural |
| `opening` | portón, puerta peatonal o andén (`extra` = pared N/S/E/W) |
| `obstacle` | oficina, baño, equipo fijo, el “mordisco” de la nave |
| `zone` | franja por familia de producto |
| `rack` | rack o área de almacenaje (`extra` = códigos de ubicación del WMS que agrupa) |

Ese mismo orden de columnas es el de la hoja `WAREHOUSE_LAYOUT` y el del CSV que
exporta la app de campo, así que se pega sin transformar nada.

## Qué valida

| Código | Qué detecta |
|---|---|
| `SQUARE_BAD` / `SQUARE_OFF` | las diagonales medidas no cuadran con el rectángulo dibujado |
| `RACK_OUT` | rack fuera del edificio |
| `RACK_OVERLAP` | dos racks en el mismo lugar |
| `RACK_COLUMN` / `RACK_OBSTACLE` | rack encima de una columna o de la oficina |
| `RACK_TALL` / `RACK_SPRINKLER` | rack más alto que la nave, o sin 18" bajo el techo |
| `DOOR_BLOCKED` | rack invadiendo el área libre frente a un portón |
| `NO_ACCESS` | no existe un pasillo del ancho mínimo que llegue a ese rack |
| `ZONE_FAMILY` | rack guardando una familia distinta a la de su zona |

`NO_ACCESS` no se calcula por pares de racks: rasteriza el piso a 6", lo erosiona con
medio ancho de pasillo y hace flood-fill desde las puertas. Si un rack no queda
conectado a esa red, no hay forma de llegar a él con un carro — aunque en el dibujo
“se vea” un hueco.

## Tipos de rack y cómo se mide su capacidad

| Tipo | Métrica |
|---|---|
| `ARACK` A-frame | pulgadas de apilado (largo × 2 caras) → piezas a 3.5" c/u |
| `VRACK` vertical con divisores | ranuras (largo ÷ 2.5" × niveles) |
| `CANT` cantilever | pies lineales (largo × niveles) |
| `PALLET` rack de pallets | posiciones (largo ÷ 48" × niveles) |
| `SHELF` / `FLOOR` / `TABLE` | pies cuadrados |

Son **capacidades teóricas**, techo absoluto: en la práctica se llena al 70–80 %.

## Permisos

- Ver el plano: cualquier usuario autenticado.
- Guardar el plano: **solo ADMIN** (`saveWarehouseLayout`). Mover un rack en el dibujo
  cambia dónde le dices a todo el mundo que busque, así que queda en el AUDIT_LOG.

## Desplegar en Apps Script

1. `node tools/build.js`
2. Pega `Code_v3_fixed.gs` e `Index_v3_fixed.html` en el editor de Apps Script — **los dos**.
3. Deploy → *New version* (si despliegas solo uno, el banner de versión te lo avisa).
4. La hoja `WAREHOUSE_LAYOUT` se crea sola la primera vez que guardas un plano.

## Probar sin haber medido

`layout/ejemplo-bodega.json` es una bodega de 100 × 60 ft con oficina, dos columnas y
las cinco zonas. Pégalo en *Importar captura* para ver la pestaña funcionando, y
reemplázalo con tu captura real cuando la tengas.
