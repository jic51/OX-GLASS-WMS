# Reparto por tiempo — el plan de construcción

> **Qué es esto.** `CUANDO-SE-LLENE-EL-SHEET.md` decidió **qué** hacer el día
> que un cliente llene su archivo: cerrar el período y mandar lo viejo a otro
> Sheet. Esto es el **cómo**, con el detalle suficiente para construirlo sin
> volver a pensarlo.
>
> **Nada de esto está construido.** Escrito el 4/11/2026, a petición de Jose:
> *"habrá alguna que llegue, y quiero estar preparado antes de poder decir: lo
> siento, no sabemos cómo ayudarles."*

---

## 0 · De dónde salió, porque importa

El 3/11 yo le dije a Jose que varios Sheets no servían, con tres pegas. Él
contestó las tres y **tenía razón en las tres**:

| Mi pega | Su respuesta |
|---|---|
| *"Leer diez archivos cuesta diez lecturas"* | *"¿Y si cada hoja lleva un índice? O una lista de lo que hay en cada sheet, como los stocks que ya guardamos para no recontar"* |
| *"No hay candado entre archivos"* | *"Eso es porque hoy sólo tenemos uno. No creo que sea imposible crear reglas para que trabaje en varios"* |
| *"La cuota"* | *"La cuota no va a cambiar, pero podemos planificar alrededor de ella"* |

La segunda es la que desbloquea todo, y la explicación está en §2: **no hace
falta un candado entre archivos si ninguna operación toca dos archivos.** Yo
había dado por supuesto que sí, y de ahí salía la dificultad.

---

## 1 · La idea, en una frase

**Un archivo por período. Sólo el del período en curso se escribe. Los demás
son de sólo lectura. Una lista en el archivo vivo dice qué hay en cada uno.**

```
Acopio — Mi Empresa           ← EL VIVO. Aquí se escribe. Siempre.
  · MASTER_ARCHIVE_V3           movimientos del período en curso
  · CONFIG, USERS_V3, …         la configuración, siempre aquí
  · SALDO_APERTURA              lo que había al empezar el período  ← NUEVO
  · PERIODOS                    la lista de archivos cerrados       ← NUEVO

Acopio — Archivo 2024         ← CERRADO. Nadie escribe. Sólo se lee si se pide.
Acopio — Archivo 2025         ← CERRADO.
```

---

## 2 · Por qué NO hace falta un candado entre archivos

Esta es la pieza que hace que todo lo demás sea sencillo, y conviene leerla
despacio porque es contraintuitiva.

**El miedo era éste:** si un movimiento escribe en el archivo A y en el B, y
falla entre medias, queda a medias y no hay forma de deshacerlo. `LockService`
protege dentro de un archivo; entre dos, no hay nada.

**Y es verdad — pero sólo si alguna operación toca dos archivos.**

Repartiendo **por tiempo**, ninguna lo hace:

| Operación | Qué archivo toca |
|---|---|
| Registrar un movimiento | **Sólo el vivo.** Un movimiento nuevo es de hoy, y hoy es el período en curso |
| Editar un movimiento | **Sólo el vivo.** Uno cerrado no se puede editar, por la misma razón por la que hoy no se edita uno archivado |
| Borrar un movimiento | **Sólo el vivo** |
| Ver el histórico viejo | **Sólo lee.** Y leer no necesita candado |
| El cierre de período | **Las dos** — y es la única. Pasa una vez al año, la lanza una persona, y §5 dice cómo se hace para que no pueda quedar a medias |

**Un archivo que nadie escribe no necesita candado.** Toda la seguridad sigue
siendo la de hoy: un candado, sobre un archivo, el vivo.

---

## 3 · Las dos pestañas nuevas

### 3.1 · `PERIODOS` — la lista, en el archivo vivo

Lo que Jose llamó *"una lista de lo que hay en cada sheet"*. **Una lectura, no
diez.**

| Columna | Qué lleva | Para qué |
|---|---|---|
| `periodo` | `2024`, `2025-S1`… | El nombre que ve la gente |
| `fileId` | El id del Sheet cerrado | Para leerlo cuando se pida |
| `desde` / `hasta` | Fechas del primer y último movimiento | **Es el índice.** Permite saber si un rango pedido toca ese archivo sin abrirlo |
| `filas` | Cuántos movimientos lleva | Para decir *"1.200 movimientos en 2024"* sin abrir nada |
| `cerrado_el` / `cerrado_por` | Cuándo y quién | Auditoría |
| `huella` | Suma de comprobación de lo movido | §5.4: permite verificar años después que el archivo no se tocó |

**Por qué `desde`/`hasta` y no una lista de materiales:** la pregunta que se
hace de verdad sobre un archivo viejo es *«enséñame lo de tal fecha»*, no
*«¿tienes el material X?»* — para eso está el stock vivo, que ya es un saldo.
Un índice por material sería grande, costaría mantenerlo y respondería una
pregunta que nadie hace.

### 3.2 · `SALDO_APERTURA` — lo que había al empezar

Una fila por material y ubicación: cantidad y coste promedio al cerrar el
período anterior.

**Es lo que hace que el sistema sea más rápido para siempre**, no sólo más
chico: el stock deja de ser *«reproduce toda la historia»* y pasa a ser
*«saldo de apertura + lo que pasó desde entonces»*.

---

## 4 · Las invariantes — lo que nunca puede dejar de ser cierto

Esto es lo que las pruebas tienen que sujetar. Si alguna se rompe, el sistema
miente sobre el inventario de alguien.

| # | Invariante | Si se rompe |
|---|---|---|
| **I1** | `stock de hoy` = `SALDO_APERTURA` + movimientos del archivo vivo | El stock queda mal **en silencio y para siempre** |
| **I2** | Ningún `movId` existe en dos archivos a la vez | Un movimiento contado dos veces |
| **I3** | Los rangos `desde`–`hasta` de `PERIODOS` no se solapan ni dejan huecos | Un mes que no aparece en ningún sitio, o que aparece dos veces |
| **I4** | Un archivo cerrado nunca cambia después de cerrarse | Deja de poder auditarse |
| **I5** | `CONFIG` y `USERS_V3` viven **sólo** en el vivo | Dos configuraciones que tienen que coincidir sin que nada lo obligue — la falta que este proyecto lleva cuarenta veces encontrando |

**I1 es la que no se negocia.** Antes de cerrar nada hay que calcular el stock
**por los dos caminos** —historia completa y saldo + movimientos— y **sólo si
dan exactamente lo mismo**, cerrar.

---

## 5 · El cierre, paso a paso

La única operación que toca dos archivos. Se lanza **a mano**, con un aviso
previo: mover cien mil filas no debería pasar sin que alguien lo sepa.

### 5.1 · El límite de los 6 minutos manda el diseño

Mover 100.000 filas no cabe en una ejecución. **Y no se arregla yendo más
rápido: se arregla pudiendo retomar.** Así que el cierre es una **máquina de
estados** guardada en la hoja, no una función larga.

```
PREPARAR → COPIAR → VERIFICAR → SELLAR → LIMPIAR → HECHO
```

Cada paso es idempotente: si la ejecución muere, la siguiente lee en qué paso
estaba y **repite ese paso desde el principio** sin estropear nada. Es el mismo
patrón que `borrarFilasEnTanda_` ya usa con su `quedanPor`.

### 5.2 · Los pasos

| Paso | Qué hace | Si muere aquí |
|---|---|---|
| **PREPARAR** | Calcula el corte, cuenta filas, calcula el `SALDO_APERTURA` **en memoria** y la huella. No escribe nada todavía | No pasó nada. Se repite |
| **COPIAR** | Crea el archivo nuevo y vuelca las filas **por tandas**, anotando cuántas van | Se retoma por donde iba. Las filas siguen **también** en el vivo |
| **VERIFICAR** | Lee el archivo nuevo y comprueba: mismo número de filas, misma huella, y **el stock por los dos caminos (I1)** | No se ha quitado nada. Se repite |
| **SELLAR** | Escribe `SALDO_APERTURA` y la fila en `PERIODOS` | Se repite: escribir lo mismo dos veces da lo mismo |
| **LIMPIAR** | **Y sólo ahora** borra del vivo las filas copiadas | Quedan filas duplicadas en el vivo. Molesto, **no grave**: se retoma |
| **HECHO** | — | — |

**El orden es toda la seguridad.** Copiar antes de borrar, verificar antes de
sellar, y borrar lo último. Si algo sale mal en cualquier punto, **lo peor que
puede pasar es tener los datos dos veces**, nunca ninguna. Es el mismo
razonamiento que ya protege `borrarFilasEnTanda_` —papelera primero, hoja
después— y el que faltó el 26/09/2026, cuando se limpió antes de comprobar y se
perdió el archivo entero de movimientos.

### 5.3 · Y el aviso de la pantalla tiene que decirlo antes

Lo irreversible de esta app es vaciar la papelera; esto sería lo segundo. La
pantalla tiene que decir qué va a pasar **antes** de pulsar, no después — la
lección de `test-el-aviso-dice-la-verdad.js`.

### 5.4 · La huella

Suma de comprobación de lo que se movió (cantidad de filas + suma de
cantidades + suma de costes). Se guarda en `PERIODOS` y permite, años después,
comprobar que el archivo cerrado es el que se cerró. **Es la misma idea que la
huella de las importaciones**, que ya funciona.

---

## 6 · Lo que esto cuesta en permisos — y es mucho menos de lo que yo creía

Aquí estaba el obstáculo caro, y resulta que no lo es.

**El problema aparente:** la app pide `spreadsheets.currentonly`, que es
*«sólo la hoja a la que estoy pegado»*. Con ese permiso `SpreadsheetApp.openById`
**no puede abrir otro archivo**. Añadir el permiso `spreadsheets` completo
obligaría a **todos los clientes a volver a autorizar**, que es justo el coste
que mantiene aparcado H-03.

**Y no hace falta, porque la app YA hace las dos operaciones que necesita**, por
otro camino, en `excelToSheets_` desde que se lee un `.xlsx`:

| Lo que hace falta | Cómo se hace ya hoy |
|---|---|
| **Crear** un Sheet nuevo con contenido | `POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart` con `mimeType: application/vnd.google-apps.spreadsheet` |
| **Leer** otro Sheet entero | `GET https://docs.google.com/spreadsheets/d/<id>/export?format=csv` |

Las dos con `Authorization: Bearer ScriptApp.getOAuthToken()` y el permiso
`drive`, que la edición Pro **ya pide**.

**Consecuencia: el cierre de período se puede construir sin que ningún cliente
tenga que volver a autorizar nada.** Eso cambia el coste del proyecto de
«hay que avisar a todos los clientes» a «es código nuestro».

> **Lo que sí hay que comprobar en una copia de pruebas antes de confiar:** que
> el export en CSV de un archivo de 300.000 filas no se corte ni se coma los
> ceros a la izquierda de un PO. Es exactamente la clase de cosa que parece que
> funciona con veinte filas. **Primera tarea de la fase 1.**

### Y en Básico, no

`appsscript.basic.json` pide **sólo** `spreadsheets.currentonly`: ni `drive` ni
peticiones externas. Así que esto es **de Pro**, por una razón técnica real y
no comercial. Básico avisa del espacio y ahí se queda.

---

## 7 · Qué hay que tocar en el código

| Dónde | Qué cambia |
|---|---|
| `loadOlderHistory` | Hoy lee la pestaña `ARCHIVE_HISTORY`. Pasa a mirar `PERIODOS` y, si el rango pedido cae en un archivo cerrado, traerlo por el export en CSV. **Es el único sitio del que cuelga leer lo viejo**, así que es un cambio y no veinte |
| `rebuildStock` / `refreshDerivedSheets_` | Empezar desde `SALDO_APERTURA` en vez de desde cero |
| `getSpaceUsage` | Sumar el espacio de todos los archivos, no sólo el vivo, y enseñarlos por separado |
| `getInitialData` | Mandar la lista de períodos para que la pantalla ofrezca *«ver 2024»* |
| **Nuevo** `cerrarPeriodo` | La máquina de estados de §5 |
| **Nuevo** `periodoDeLaFecha_` | Una sola regla, escrita una vez, que dice a qué archivo pertenece una fecha. Leen de ella `loadOlderHistory` y el cierre |
| `archiveOldMovements` | **No se toca, y hay que entender por qué.** Mueve filas a otra *pestaña* del *mismo* archivo: resuelve el rendimiento y **no libera ni una celda**. Las dos cosas conviven: el archivado nocturno mantiene la hoja viva chica; el cierre de período mantiene el **archivo** chico |

---

## 8 · Las pruebas, que se escriben ANTES

| Prueba | Qué sujeta |
|---|---|
| `test-cierre-cuadra.js` | **I1**: el stock por los dos caminos da lo mismo. Con decimales, con costes, con devoluciones y con ajustes negativos |
| `test-cierre-se-retoma.js` | Matar el cierre en cada uno de los cinco pasos y comprobar que al repetir termina bien y **sin duplicar** |
| `test-cierre-no-borra-antes.js` | Que LIMPIAR no pueda correr si VERIFICAR no pasó. **Es el 26/09 otra vez**, y es la prueba más importante de la lista |
| `test-periodos-sin-huecos.js` | **I3**: los rangos no se solapan ni dejan huecos |
| `test-un-solo-archivo-escribe.js` | Barrido estático: ninguna función de escritura menciona un `fileId` que no sea el vivo. **Es lo que mantiene cierto el §2** |

---

## 9 · En qué orden se construye

Cada fase entrega algo por su cuenta. **Nada de esto hay que hacerlo hoy.**

| Fase | Qué | Vale por sí sola |
|---|---|---|
| **0** | Probar el export en CSV con 300.000 filas (§6) | Dice si el plan entero se sostiene. **Un día** |
| **1** | `SALDO_APERTURA` y que el stock se calcule desde él, **con todo todavía en un archivo** | La app se vuelve más rápida **ya**, sin mover nada. Y deja I1 probada antes de que haga falta |
| **2** | `PERIODOS` + leer un archivo cerrado | Se puede cerrar **a mano** y la app ya sabe leerlo |
| **3** | `cerrarPeriodo` automático con su máquina de estados | El botón |
| **4** | Que el espacio sume todos los archivos | Cierra el círculo |

**La fase 1 es la que yo haría primero aunque nadie estuviera cerca del tope**,
porque hace la app más rápida para todos y porque prueba la invariante difícil
cuando todavía no hay nada que perder.

---

## 10 · Lo que falta decidir — es de Jose

| | Pregunta | Mi recomendación |
|---|---|---|
| 1 | ¿Por año calendario o por número de filas? | **Por año.** Un informe anual se entiende; «el archivo 3» no |
| 2 | ¿Automático o a mano? | **Aviso automático, ejecución a mano.** Mover cien mil filas no debería pasar sin que alguien lo sepa |
| 3 | ¿La app lee lo viejo, o sólo ofrece el enlace al archivo? | **Que lo lea**, pero sólo cuando se pida. El enlace suelto es mandar al cliente al Sheet, y *«el cliente no debe ir al sheet nunca»* |
| 4 | ¿Dónde vive el archivo cerrado? | En la misma carpeta que los respaldos, en el Drive **del cliente** |
| 5 | ¿Qué pasa si el cliente borra un archivo cerrado? | La app lo detecta al leer `PERIODOS` y lo dice. **No se puede impedir y no hay que fingir que sí** |

---

## 11 · Lo que este plan NO resuelve, dicho claro

- **El rendimiento con muchas filas.** Una hoja empieza a ir lenta alrededor de
  las **100.000 filas**, y eso Google no lo dobló. El cierre de período ayuda
  —el vivo queda chico— pero quien llegue ahí dentro del período en curso
  seguirá notándolo.
- **La cuota de Apps Script.** Más archivos no gastan más en el día a día
  (sólo se lee el vivo), pero el cierre en sí es un trabajo grande. Va fuera de
  horas y por tandas.
- **Nada de esto hace falta todavía.** Con 20M celdas y 26 columnas, un archivo
  aguanta ~500.000 movimientos. El disparador acordado —el 60 %— lo vigila la
  app sola. Esto se construye cuando ese número se encienda, **no antes**, y el
  motivo de escribirlo hoy es poder contestar *«sí, sabemos cómo»* el día que
  alguien pregunte.
