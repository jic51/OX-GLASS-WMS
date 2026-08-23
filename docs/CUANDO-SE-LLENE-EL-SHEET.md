# Cuando el Sheet del cliente se llene — plan

Investigación y plan. **Nada de esto está construido.**

---

## Los números reales

| Límite de Google Sheets | Valor |
|---|---|
| Celdas por archivo (**todas las pestañas juntas**) | **10,000,000** |
| Pestañas por archivo | 200 |
| Rendimiento empieza a sufrir | ~100,000 filas |
| Filas | Sin límite propio — las acota el tope de celdas |

Acopio usa **22 columnas** por movimiento (`AC_WIDTH`). Con eso:

- 10M celdas ÷ 22 = **~454,000 movimientos** si el archivo no tuviera nada más.
- Pero el mismo archivo carga CONFIG, USERS_V3, AUDIT_LOG, ERROR_LOG,
  LIVE_STOCK, SITE_STOCK, WASTED_STOCK, RESERVATIONS y ARCHIVE_HISTORY.
  Realistamente el archivo de movimientos se lleva el 60–70%.
- **Techo práctico: ~250,000–300,000 movimientos.**
- **Molestias mucho antes: alrededor de 100,000 filas.**

### Traducido a clientes de verdad

| Movimientos/día | Al año | Empieza a doler | Techo duro |
|---|---|---|---|
| 20 (taller chico) | 5,200 | ~19 años | nunca |
| 100 (bodega activa) | 26,000 | ~4 años | ~11 años |
| 300 (bodega grande) | 78,000 | ~1.3 años | ~3.5 años |
| 500 (operación intensa) | 130,000 | **~9 meses** | ~2 años |

**Conclusión honesta: la mayoría de los clientes nunca va a llegar. Pero un
cliente grande sí, y sería justo el que más paga y más ruido hace.**

## ⚠️ El archivado que ya existe NO resuelve esto

`ARCHIVE_HISTORY` mueve los movimientos viejos a **otra pestaña del mismo
archivo** (`ss.insertSheet`). Eso resuelve el problema de RENDIMIENTO —la hoja
viva queda chica— pero **no libera ni una sola celda del tope de 10M**, porque
el límite es por archivo, no por pestaña.

O sea: hoy tenemos media solución y conviene no confundirse con ella.

---

## Las opciones, y cuál recomiendo

### Opción 1 — Cierre de período con archivo aparte ✅ RECOMENDADA

Cuando el archivo se acerca al límite, los movimientos de los períodos viejos
se mueven a **un Sheet distinto en el mismo Drive del cliente**
(`Acopio — Archivo 2025`), y en el archivo vivo queda un **saldo de apertura**
por material y ubicación.

Es exactamente lo que hace cualquier sistema contable serio: se cierra el
período, se guarda el saldo, y el detalle viejo pasa a consulta.

**Por qué es la correcta aquí:**
- El stock deja de depender de reproducir la historia entera: pasa a ser
  *saldo de apertura + movimientos desde entonces*. **El sistema se vuelve más
  rápido para siempre**, no solo más chico.
- Ya existen las dos piezas: `loadOlderHistory` (leer historia vieja bajo
  demanda) y `getOrCreateFolder_` (crear archivos en el Drive del cliente).
- Un archivo, una URL, una instalación. El cliente no cambia de sistema.
- El archivo viejo es un Google Sheet normal: si un día nos dejan de pagar,
  siguen teniendo su historia y pueden abrirla.

**El riesgo, y hay que tratarlo con respeto:** si el saldo de apertura sale
mal, el stock queda mal **en silencio y para siempre**. La regla no negociable
es calcular el stock por los dos caminos (historia completa vs. saldo +
movimientos), **comparar, y solo si cuadran exactamente, cerrar el período**.
Y no borrar nada del archivo viejo: se copia primero, se verifica, y recién
después se limpia.

**Qué falta decidir:**
- ¿Se dispara solo al llegar a un umbral, o lo decide el admin? (Yo: aviso
  automático, ejecución manual — mover 100,000 filas no debería pasar sin que
  alguien lo sepa.)
- ¿Por año calendario o por cantidad de filas?
- ¿La app lee los archivos viejos bajo demanda, o solo se ofrece el enlace?
- El límite de 6 minutos por ejecución: mover 100,000 filas seguro no cabe en
  una corrida. Hay que hacerlo por tandas y poder retomar.

### Opción 2 — Un sistema por bodega/sucursal

Sirve cuando el cliente tiene operaciones separadas de verdad. **No es
solución al problema de tamaño** — es otra cosa que a veces se necesita
igual. Una sola bodega grande sigue llenando su archivo.

### Opción 3 — Base de datos externa

Resuelve el problema para siempre y **destruye el producto**: se acaba el "tus
datos en TU Drive", aparece un servidor que mantener, y el margen del 95% se
va. Es otro producto. Anotada para no volver a considerarla por accidente.

### Opción 4 — Borrar lo viejo

Exportar a CSV y borrar. Es lo que hace la gente sin plan. Barato, y pierde la
trazabilidad — que es justo lo que un sistema de inventario vende.

---

## Qué hacer AHORA (sin construir nada)

1. **Mostrar cuánto espacio queda.** En Settings → System, una línea:
   *"Tu archivo usa 180,000 de 10,000,000 celdas (1.8%)"*. Barato, y convierte
   un problema invisible en uno visible con años de anticipación.
2. **Avisar al 60%.** Una tarjeta al admin cuando se cruce ese umbral. A ese
   ritmo quedan meses, no días.
3. **Preguntarlo en la venta.** *"¿Cuántas entradas y salidas hacen al día?"*
   Con más de 300, hay que hablar de esto antes de firmar, no después.

Los tres son baratos y compran el tiempo necesario para construir la Opción 1
bien en vez de a las carreras con un cliente enojado.

---

## Fuentes

- [Zapier — qué significa el límite de 10 millones de celdas](https://zapier.com/blog/google-sheets-cell-limit/)
- [Sheetgo — cómo resolver el límite de 10M celdas](https://www.sheetgo.com/blog/spreadsheets-tips/google-sheets-cell-limit/)
- [Row Zero — límites de filas, columnas y tamaño](https://rowzero.com/blog/google-sheets-limits)
- [10XSheets — cuántas filas aguanta Google Sheets](https://www.10xsheets.com/blog/google-sheets-row-limit/)

---

## El indicador de espacio — diseño (idea de Jose)

Prioridad 3 en la lista de Jose. Su idea, y estoy de acuerdo:

- **Una barra que se va llenando**, verde cuando hay espacio y roja cuando se
  acaba, con **el porcentaje usado en el centro**.
- Debajo, **un estimado de cuánto falta para llenarla**.

La barra es claramente lo correcto: un número suelto ("1.847.322 celdas") no le
dice nada a nadie; una barra al 18% se entiende sin explicación.

### Sobre el estimado de tiempo — con cuidado

Jose propone calcular el promedio de movimientos por día **y además el
crecimiento de ese promedio desde el día 1**, para proyectar mejor. La idea es
buena pero tiene dos trampas que hay que esquivar, porque un estimado que
asusta sin razón es peor que no tener estimado:

1. **Los primeros meses mienten.** La carga inicial del inventario mete cientos
   de movimientos en pocos días. Proyectar con eso da "se llena en 8 meses"
   cuando la verdad son quince años.
2. **Extrapolar un crecimiento compone.** Si el promedio subió 12% en un
   trimestre y se proyecta ese 12% hacia adelante, a cinco años da un número
   absurdo. La curva real de una bodega se aplana; la fórmula no lo sabe.

**Lo que haría en su lugar:**

- Calcular el ritmo sobre los **últimos 90 días**, no sobre toda la historia.
  Eso descarta la carga inicial solo, sin reglas especiales.
- **No mostrar ningún estimado hasta tener 60 días de uso.** Antes de eso, la
  barra sola y una línea: *"Estimate available after 60 days of use."*
- Mostrarlo redondeado y en la unidad honesta: **"~7 years at your current
  pace"**, no "6.83 años". La precisión falsa invita a confiar de más.
- Usar el crecimiento **solo para elegir entre dos escenarios**, no para una
  proyección exponencial: *"~7 years — or ~5 if your pace keeps growing like
  the last year."* Dos números acotados, no una curva.
- El color por porcentaje, no por el estimado: verde <60%, ámbar 60–85%,
  rojo >85%. Y a partir del 60%, la tarjeta de aviso al admin.

Con eso el indicador dice la verdad tanto para el taller que nunca va a llegar
como para la operación intensa que sí.
