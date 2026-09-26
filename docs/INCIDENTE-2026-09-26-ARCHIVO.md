# El 26 de septiembre de 2026 — el trabajo nocturno borró el archivo

Qué pasó, por qué, cómo se recupera y qué se cambió para que no pueda repetirse.

---

## Lo primero, porque es lo que importa: **no se perdió nada**

La copia de seguridad de las **2:36 de la madrugada** tiene los movimientos
completos. Se hace **una hora antes** que el trabajo que falló, y eso no es
casualidad: está puesto así a propósito, por si este trabajo alguna vez tenía un
fallo. Lo tuvo.

Y no se perdió **ni un movimiento posterior**: según el AUDIT_LOG, el último
movimiento guardado fue el **25/09 a las 16:03**, y la copia se hizo a las 2:36
del día siguiente. Entre la copia y el desastre no se escribió nada.

---

## Qué pasó, exactamente

El ERROR_LOG lo dice en una línea:

```
26/09/2026 3:19:10  ERROR  system  backend  archiveOldMovements
El número de columnas de los datos no coincide con el número de columnas del
rango. Los datos tienen 23, y el rango, 20.
```

El trabajo nocturno de archivado hacía esto, **en este orden**:

```javascript
archive.getRange(...).clearContent();      // 1. BORRAR
archive.getRange(...).setValues(filas);    // 2. ESCRIBIR   ← reventó aquí
```

`MASTER_ARCHIVE_V3` tenía **20 columnas** de ancho. Una fila de movimiento tiene
**23** desde que existen las columnas de costo. Al pedir un rango de 23 columnas
sobre una hoja de 20, Sheets **lo recorta a 20 sin avisar**, y `setValues` con
filas de 23 lanza un error.

Para cuando lanzó, el paso 1 ya había ocurrido. **El archivo entero quedó
vacío.**

### No es un fallo, son tres

1. **Existía una función para esto y no se llamaba.** `ensureArchiveWidth_` lleva
   meses en el código, escrita exactamente para ensanchar una hoja estrecha, y
   este trabajo nunca la usaba. Una hoja creada antes de las columnas de costo es
   el caso **normal** en una actualización, no el raro.

2. **Borrar antes de escribir.** Éste es el grave, y **seguiría siendo grave con
   el ancho bien**: entre esas dos líneas cabe una cuota agotada, un tiempo de
   espera o un error pasajero de Sheets. Cualquiera de los tres se lleva el
   archivo igual.

3. **Nadie se enteró.** El error fue a ERROR_LOG, que es una pestaña que nadie
   mira, y la app siguió abriéndose diciendo *"No movements match your filters"*
   — la misma frase que dice cuando un filtro no encuentra nada. Catorce horas.

---

## Cómo recuperarlo — 5 minutos

> **Antes de nada: NO reconstruyas nada todavía.** Las existencias
> (`LIVE_STOCK`) se recalculan **a partir de** `MASTER_ARCHIVE_V3`. Con el
> archivo vacío, una reconstrucción pondría el stock a cero **de verdad**.
> Primero se devuelven los movimientos; después se reconstruye.

1. Abre en Drive la copia **`OX Glass LLC. — Acopio — Backup 2026-09-26_0236`**.
2. Abajo, clic derecho sobre la pestaña **`MASTER_ARCHIVE_V3`** →
   **Copiar en** → **Hoja de cálculo existente** → elige tu hoja viva.
3. En la hoja viva aparecerá una pestaña nueva llamada
   **`Copia de MASTER_ARCHIVE_V3`**.
4. **Borra** la pestaña `MASTER_ARCHIVE_V3` vacía.
5. **Renombra** `Copia de MASTER_ARCHIVE_V3` a **`MASTER_ARCHIVE_V3`**, con ese
   nombre exacto, en mayúsculas.
6. Repite lo mismo con **`ARCHIVE_HISTORY`** sólo si la del respaldo tiene filas.
7. Recarga la app. Los movimientos tienen que estar.
8. **Ahora sí**, si las existencias no cuadran: Settings → System → reconstruir.

---

## Lo que se cambió (v12.14)

### 1. Las hojas se ensanchan antes de tocar nada

`ensureArchiveWidth_` se llama ahora sobre las dos hojas al principio del
trabajo. Si aun así no caben, el trabajo **se planta sin escribir**.

### 2. Escribir primero, limpiar después

Toda la escritura pasa por `escribirHojaCompleta_`, que pone las filas y
**después** limpia sólo lo que sobra por debajo. Si la escritura falla, **no se
ha borrado nada** y la hoja conserva sus filas.

### 3. La hoja que GANA filas se escribe antes que la que las pierde

Antes era al revés. Si fallaba la segunda escritura, las filas no estaban en
ninguna de las dos. Ahora lo peor que puede pasar es un **duplicado**, que se ve
y se arregla, en vez de un **agujero**, que no se ve.

### 4. Dos cuentas tienen que coincidir

Este trabajo sólo **mueve** filas entre dos hojas, así que el total tiene que ser
idéntico antes y después.

- **Antes de escribir:** si la cuenta no cuadra, no se escribe **nada**.
- **Después de escribir:** se vuelve a contar **sobre las hojas**, no sobre las
  variables. *"La aritmética está bien"* y *"la escritura llegó"* son preguntas
  distintas, y la segunda no era tarea de nadie.

> Las dos cuentas usan la **misma definición de fila** que usa el reparto. La
> primera versión comparaba longitudes de lista, y la prueba encontró que así una
> fila vacía cuadraba perfectamente y se perdía igual.

### 5. Ahora grita

- **Correo al admin** cuando el trabajo falla o cuando las cuentas no cuadran,
  diciendo que la copia de las 2am lo tiene todo.
- **La app deja de disimular.** Tener existencias en los estantes y **cero**
  movimientos registrados es imposible: cada unidad de un estante llegó por una
  entrada, y esa entrada es una fila del archivo. Cuando se da esa mezcla, la
  pantalla de Movements lo dice con todas las letras en vez de enseñar una tabla
  vacía educada.

---

## Cómo se comprueba

`tools/test-archivo-nocturno.js`, 25 comprobaciones. Reconstruye la noche del 26
con una hoja falsa que imita las **dos crueldades** de Sheets que hicieron falta
para el desastre: que `getRange` **recorte** el ancho sin avisar, y que
`setValues` **lance** cuando no coincide. Sin esas dos fidelidades, la prueba
pasaría en verde sobre el código que destruyó los datos.

Devolver el código a como estaba esa noche hace fallar **9 comprobaciones**, con
este resultado entre ellas:

```
Y AUN ASÍ NO SE PERDIÓ NADA → {"archivo":0,"historico":0,"total":16}
```

Es decir: **la prueba reproduce el desastre**.

---

## Lo que esto enseñó, y va más allá de este trabajo

**Un borrado y una escritura que tienen que ocurrir juntos no pueden ir en ese
orden.** En Apps Script no hay transacciones: no se puede decir "las dos o
ninguna". Lo único que se puede elegir es **cuál va primera**, y la regla es que
la destructiva va **última**, siempre.

### El barrido del resto del archivo — hecho, y queda UN sitio

Busqué `clearContent()` en todo `Code_v3_fixed.gs`. Hay cuatro sitios más:

| Dónde | ¿Mismo fallo? |
|---|---|
| `escribirHojaCompleta_` | No — es el arreglo de arriba |
| `menuEraseEverything` (2 sitios) | **No.** Ahí borrar *es* el objetivo: es la herramienta que deja limpia la plantilla maestra. No hay escritura después que pueda fallar |
| La celda del sello de términos | No — es una sola celda, no hay nada que perder |
| **`writeConfigColumn_`** (línea ~655) | **SÍ. Mismo patrón, menor alcance** |

`writeConfigColumn_` borra una columna entera de `CONFIG` y después escribe los
valores. Es lo que guarda **categorías, proyectos, proveedores y locaciones**. Si
la escritura falla entre las dos líneas, esa lista se queda **vacía**.

**Por qué no lo he arreglado en esta misma versión, dicho claro:** este cambio es
un arreglo crítico sobre datos, y meterle un segundo cambio a otro camino
distinto multiplica lo que puede salir mal justo cuando menos conviene. El
alcance además no se parece: perder el catálogo es molesto y se vuelve a
escribir a mano en diez minutos; perder el archivo de movimientos es perder el
trabajo de un año.

**Pero hay que hacerlo**, y con la misma forma: escribir primero, limpiar la cola
después. Anotado en `BACKLOG.md`.
