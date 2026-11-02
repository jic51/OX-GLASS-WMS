# El valor del inventario usado — el encargo de OX, y cómo empezar

Jose, 3/11: *"en OX me dieron una asignación, quieren usar la app para hacer
tracking del valor del inventario utilizado cada mes… me van a dar los valores
de ciertos materiales y vamos a empezar por ahí. Lo que me pidieron es: la app
debe darnos la diferencia entre lo que tenemos al inicio y lo que tenemos al
final. Empezaremos sólo por el FLASHING."*

**Esto es el primer uso real de la app por la empresa.** Todo lo demás de este
registro es higiene; esto es el motivo por el que existe. Así que el documento
empieza por lo que la app ya hace medido, no por lo que me gustaría que hiciera.

---

## 1 · Lo que la app YA hace (verificado en el código, no de memoria)

| Qué | Dónde está | Estado |
|---|---|---|
| Cada movimiento lleva **precio unitario** y **total** | `AC.UNIT_COST` (col 20) y `AC.TOTAL_COST` (col 21) de MASTER_ARCHIVE | ✅ existe desde hace meses |
| Una **entrada** con precio escrito guarda ese precio en la fila | `processMovement`, rama de coste | ✅ |
| …y actualiza el **promedio ponderado** de ese material | `avgCostMap`, `(stockAntes × promedioAntes + qty × precio) / (stockAntes + qty)` | ✅ |
| El promedio se guarda en la hoja | CONFIG, columnas 14/15/16 → categoría · nombre · promedio | ✅ |
| Una **salida sin precio escrito** se valora al promedio del material | `unitCost = avgCostMap[matId].avg; totalCost = unitCost × qty` | ✅ **esto ya es «el valor de lo utilizado»** |
| El total de dinero **por obra** | `renderProjectView` → `projectCost` | ✅ |
| Quién puede ver dinero y quién no | `canSeeCosts_` | ✅ |
| Precio recordado **por paquete** (caja de 100, etc.) | hoja PACKS + `packMath_` → precio por unidad de almacén | ✅ |

**Conclusión medida:** el motor de costes está entero y funciona. Lo que falta no
es contabilidad, son **dos cosas concretas**, y están en la sección 3.

---

## 2 · La cuenta que OX está pidiendo, escrita como cuenta

Lo que pidieron en una frase —*«la diferencia entre lo que tenemos al inicio y
lo que tenemos al final»*— es esta identidad:

```
valor al final  =  valor al inicio  +  valor de lo que entró  −  valor de lo que salió
```

y por tanto, lo que ellos llaman la diferencia:

```
inicio − final  =  valor de lo que salió  −  valor de lo que entró
```

**El término que de verdad quieren es «valor de lo que salió».** Es el coste del
material que se fue a las obras ese mes. La app ya lo escribe movimiento a
movimiento; lo que no hay es quien lo sume por mes y por categoría.

### 2.1 · La decisión que hay que tomar ANTES del primer número

Qué cuenta como «utilizado». No es una pregunta técnica, es de ellos, y si no se
acuerda por escrito el primer informe se discute en vez de usarse:

| Tipo de movimiento | ¿Es «utilizado»? | Por qué |
|---|---|---|
| **EXIT** a una obra | **Sí** | Es el caso normal: salió del almacén a un trabajo |
| **WASTE** | **Sí** | Se perdió, y costó dinero igual |
| **RETURN** de una obra | **Resta** | Volvió: ese valor no se consumió |
| **TRANSFER** entre estanterías | **No** | Sigue en el almacén |
| **ADJUST** | **No** (pero se informa aparte) | Es una corrección de conteo, no consumo. Meterlo dentro esconde los errores de inventario dentro del coste de las obras |

**Mi recomendación:** `utilizado = EXIT + WASTE − RETURN`, y los ADJUST en una
línea propia al final del informe, con su valor. Así el número de las obras es
el de las obras, y el descuadre del almacén se ve en vez de disolverse.

---

## 3 · Lo que falta, y es poco

### 🔴 3.1 · No se puede ponerle precio a lo que YA está en la estantería

Esto es el bloqueo real del mes 1, y conviene entenderlo bien porque es fácil
creer que ya está resuelto:

- La pantalla de **paquetes/precios** (la que Jose vio en Básico) escribe en la
  hoja PACKS. Eso es **el precio que usará la PRÓXIMA entrada**.
- El **promedio** de un material (`avgCost` en CONFIG) sólo se mueve **cuando
  entra mercancía con precio**.
- Así que un material que **ya está en el almacén** y entró sin precio **no tiene
  valor**, y cada salida suya se escribe con el coste **en blanco**.

Y aquí está la trampa, que es la misma de siempre en este proyecto: **no avisa**.
El informe del mes sale, con un número más bajo de lo real, y nada dice que
faltan precios.

**Lo que hay que construir, y es una pantalla pequeña:** poner precio a un
material directamente. Es exactamente lo que Jose dibujó en su imagen 2:

```
1. elegir CATEGORÍA   (FLASHING)
2. buscar el MATERIAL en una lista de esa categoría
3. la UNIDAD          (PCS, FT, BOX…)
4. el PRECIO por esa unidad
```

Esa pantalla sola desbloquea el encargo: rellena el promedio de los materiales
que ya están en el almacén, con lo que **todas las salidas pasan a estar
valoradas**, y el valor inicial es `cantidad en mano × precio`.

**Y con un contador a la vista:** *«3 de 48 materiales de FLASHING no tienen
precio»*. Sin eso volvemos a tener dos cosas que tienen que coincidir —los
precios y los materiales— sin que nada lo obligue.

### 🟠 3.2 · No hay informe mensual de valor

Hoy el dato está, pero hay que sacarlo a mano: exportar Movements y sumar en
Excel. Para el mes 1 **eso vale** y conviene hacerlo así a propósito: es la
forma de comprobar que el número de la app es el correcto antes de fiarse de
una pantalla que lo calcule.

Lo que hace falta después: un informe con **dos fechas y una categoría**, que dé

- valor al inicio (cantidad en mano a la fecha × precio),
- valor que entró,
- valor que salió, separado en EXIT / WASTE / RETURN,
- valor al final,
- y **la lista de materiales sin precio**, que es lo que dice si el número es de fiar.

---

## 4 · Qué tienes que tener TÚ para empezar, en orden

**Paso 1 — saca la lista de FLASHING de la app.** Dashboard → filtro de
categoría `FLASHING` → ⬇ Export. Ese fichero **es** el formulario que le pasas a
OX: ya trae los nombres exactamente como la app los conoce, y así los precios
vuelven pegados al nombre correcto en vez de a uno parecido.

**Paso 2 — pídeles tres columnas, no una.** Un precio sin unidad no sirve:
`$8` puede ser la pieza o la caja de diez.

| Lo que tienes que pedir | Por qué |
|---|---|
| Material (el nombre tal cual salió del export) | Para que no haya que adivinar a cuál se refiere |
| **Unidad** del precio (PCS, FT, BOX de cuántos) | Sin esto el número está mal por un factor de 10 o de 100 |
| Precio por esa unidad | — |
| **Desde qué fecha** vale ese precio | El inventario se valora a la fecha de corte, no a la de hoy |

**Paso 3 — acuerda por escrito qué es «utilizado»** (la tabla de 2.1). Una
línea en un correo basta, pero que exista.

**Paso 4 — fija la fecha de corte del mes.** «Fin de mes» no es una fecha: si
una salida se registra el día 1 por material que se llevaron el 31, cae en el
mes siguiente. Mi recomendación: **el corte es el último día del mes a las
23:59, por la fecha del movimiento**, y los registros atrasados se corrigen con
la fecha real, no con la de captura.

**Paso 5 — el conteo inicial.** Para que el «valor al inicio» del mes 1 sea
real, la cantidad en mano de FLASHING tiene que estar bien ese día. Si no lo
está, el primer informe arrastra el error para siempre. Un conteo de FLASHING
—sólo FLASHING, que son pocos— antes de empezar.

---

## 5 · Lo que yo haría, en este orden

1. **Pasos 1 a 3 de arriba.** No necesitan código y son lo que tarda, porque
   dependen de que OX conteste.
2. **La pantalla de precios** (3.1), con el contador de materiales sin precio.
   Es lo único que bloquea de verdad.
3. **El mes 1 se cierra a mano**, exportando Movements y sumando en Excel, y se
   compara con lo que diga la app. Ese cuadre es la prueba.
4. **Después** el informe de dos fechas (3.2), ya sabiendo que el número cuadra.

Empezar por el informe sería construir una pantalla bonita sobre precios que no
existen.

---

## 6 · Lo que hay que decirle a OX desde el principio

- **El primer mes es el caro.** Hay que poner precio a lo que ya está y contar
  FLASHING. Los meses siguientes no cuestan nada: cada entrada trae su precio.
- **Si una entrada se registra sin precio, el mes sale bajo.** La app lo va a
  decir (el contador de 3.1), pero quien registra tiene que saber que el precio
  no es opcional.
- **El promedio es ponderado, no el último precio.** Si compran lo mismo a dos
  precios, la salida se valora al promedio de lo que había. Es lo correcto
  contablemente y hay que decirlo antes de que alguien compare con una factura
  suelta y crea que la app se equivoca.
