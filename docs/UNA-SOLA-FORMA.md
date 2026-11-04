# Una sola forma — inventario de lo que ya existe, y qué unificaría

Jose, 4/11: *"analiza qué partes de la app son parecidas (listas, partes que
guardan o se pueden cambiar, partes donde se puede seleccionar uno o más,
partes donde se puede editar, borrar, etc.) y sugiere qué tenemos ya construido
y qué le cambiarías tú para que la app se vea profesional, ordenada y con la
forma de manejar los datos igual en todas partes."*

**La respuesta corta: no falta casi nada. Lo que falta es usar lo que hay.**

Cada pieza de esta lista existe, funciona y está probada en algún sitio de la
app. El problema no es que falten mecanismos — es que hay **cinco maneras de
elegir una fila**, **tres de guardar** y **dos de abrir un panel**, y la
diferencia entre ellas no significa nada. Nadie la decidió: se fueron
escribiendo una detrás de otra.

---

## 1 · El censo — qué hay y dónde

### 1.1 · Las listas

| Pantalla | Qué lista | Cómo se elige | Cómo se actúa |
|---|---|---|---|
| **Dashboard** | materiales | casilla por fila + «todos» | barra de acciones arriba |
| **Movements** | movimientos | casilla por fila + «todos» | barra de acciones arriba |
| **Categories / Projects / Suppliers** | nombres | **modo** (`cfg`) + casilla aparte para fusionar | lápiz/papelera **en la fila**, según el modo |
| **Locations** | ubicaciones y grupos | **modo** (`loc`) + casilla aparte | ídem, con reglas propias |
| **Materials** | materiales | **modo** (`mat`) | ventanita del navegador (`prompt`) |
| **Directory** | contactos | **modo** (`pm`) | papelera en la fila |
| **Users** | personas | **casilla** (`_usrSelection`) | barra propia |
| **Prices** | materiales con precio | — | Guardar por fila |
| **Error log** | errores | — | — |
| **Import** | filas del fichero | — *(pedido: casillas)* | — |

**Cinco mecanismos para la misma idea.** Dos de casilla + barra (Dashboard,
Movements, Users), cuatro de «modo» (`cfg`, `loc`, `mat`, `pm`), y además
Categories y Locations llevan **las dos a la vez**: el modo para renombrar y
una casilla distinta para fusionar. En la misma lista.

### 1.2 · Lo que guarda

| Pantalla | Botón | Estado al 4/11 |
|---|---|---|
| Name & Logo | Save changes | ✅ v13.9 — se enciende con un cambio |
| Permissions | Save | ✅ v13.9 — y no deja vaciar el nombre |
| Daily report | Save | ✅ v13.9 |
| Prices | Save por fila | ✅ v13.9 — por fila, con su propia casilla |
| Permissions (interruptores) | — | guardan **al tocarlos**, sin botón |
| Locations | Save layout | por revisar |
| Low-Stock Monitor | — | guarda al tocar |

**Tres maneras de guardar:** un botón de confirmar, guardar al tocar, y guardar
por fila. **Las tres son correctas en su sitio** y la diferencia sí significa
algo — un interruptor que guarda solo es mejor que uno con botón — pero **no
está escrito en ningún lado cuándo va cada una**, así que la próxima pantalla
elegirá por casualidad.

### 1.3 · Lo que ya está resuelto y se puede copiar tal cual

| Pieza | Dónde vive | Qué resuelve |
|---|---|---|
| `_vigilarGuardar` | v13.9 | Guardar encendido sólo si hay algo que guardar, y nunca sin lo obligatorio |
| `.cfg-pickbar` | v13.9 | Una franja de acciones que **no empuja** la lista |
| Tarjeta de contacto al pasar por encima | columna *User* de Movements | nombre, correo, botones de Email/Meet/Schedule |
| `_repintarSinSaltar` | «Load more» | repintar sin mover la vista |
| `_showConfirm` | todas partes | preguntar antes de algo serio |
| `_btnBusy` / `_btnDone` | todas partes | un botón que dice que está trabajando |
| Barra de acciones por selección | Dashboard y Movements | botones que se encienden con lo marcado |
| Agrupado en el centro | **Low-Stock Monitor Settings** | la forma que Jose quiere para Categories |
| Abanico que se abre | *All backups in Drive (xx)* | esconder lo que casi siempre está bien |
| `ROW_MODES` | `cfg`/`loc`/`mat`/`pm`/`usr` | el mecanismo de modos, con sus textos |

**Diez piezas. Ninguna hay que inventarla.**

---

## 2 · Lo que yo cambiaría, y por qué

### 2.1 · Una sola forma de elegir: **casilla + barra**. Fuera los modos

Hoy conviven dos ideas:

- **Modo:** pulsas «Rename», la lista entra en modo renombrar, y entonces el
  lápiz de cada fila hace algo.
- **Selección:** marcas filas y los botones de arriba se encienden.

**La selección es mejor, y no es cuestión de gusto:**

| | Modo | Selección |
|---|---|---|
| ¿Sobre qué actúa? | sobre la fila que pulses **después** | sobre lo que **ya está marcado y se ve** |
| ¿Se puede actuar sobre varias? | no | sí |
| ¿Se sabe qué va a pasar antes de pulsar? | no: hay que recordar en qué modo estás | sí: la barra lo dice y cuenta cuántas |
| ¿Hay estado invisible? | **sí** — un modo encendido que no miras | no |

Y **la app ya tomó esta decisión una vez**. `ROW_MODES` lleva escrito que
`mov` salió de ahí en la v11.59 *"sus acciones viven en la fila de Columns,
encendidas por lo que hay marcado… El modo era lo que hacía crecer y encoger la
tabla al pulsar un botón"*. Se hizo en Movements, funcionó, y no se llevó a las
otras cuatro.

**Lo que propongo:** `cfg`, `loc`, `mat` y `pm` pasan a casilla + barra, con la
regla de Jose encima:

> **Una marcada → Renombrar y Borrar. Varias → sólo Borrar** (y Fusionar donde
> tenga sentido).

Porque **renombrar es de uno y borrar es de muchos**. Esa regla no hay que
explicarla: se ve en qué botones se encienden.

Y de paso desaparece la rareza de Categories y Locations, que hoy llevan
**modo** y **casilla** a la vez para cosas distintas en la misma lista.

### 2.2 · Nada de ventanitas del navegador

Materials renombra con un `prompt()` del navegador. Por eso Jose vio
*"se mezclan letras mayúsculas y minúsculas"* —ese camino no pasa por la
normalización que sí tienen los demás— y por eso *"toda la lista se queda
desactivada"* mientras tanto.

**Se edita en la propia fila**, como ya se hace en otros sitios. Mismo aspecto,
mismas reglas de texto, y la lista sigue viva.

### 2.3 · Cuándo lleva botón de Guardar y cuándo no — escrito, de una vez

| Si el cambio es… | Entonces | Ejemplo |
|---|---|---|
| **Un interruptor** (sí/no) | guarda al tocarlo, sin botón | los permisos |
| **Un formulario** (varios campos juntos) | **un** Guardar, encendido sólo si algo cambió | Name & Logo |
| **Una fila de una lista** | Guardar **en esa fila**, con su propio estado | Prices |
| **Algo que se hace ahora** | botón siempre encendido | *Send one now* |

Los cuatro casos ya existen en la app. Lo único nuevo aquí es **la tabla**, que
es lo que impide que la quinta pantalla elija al azar.

### 2.4 · Las franjas: siempre en su sitio

Lo de la v13.9 aplicado a todas: **la franja de acciones reserva su hueco desde
el principio**, vacía lleva la instrucción en gris, llena se le enciende el
fondo. **Nada se mueve nunca.** Es la tercera vez que este proyecto arregla el
mismo salto; que sea la última.

### 2.5 · Un nombre de persona es siempre lo mismo

La tarjeta de contacto que ya existe en Movements va también en **Suppliers**,
**Directory** y en cualquier sitio donde aparezca un correo. Es ponerle la
clase y el `data-` a un `<span>`.

### 2.6 · Lo que casi siempre está bien, plegado

Lo que pidió Jose para System: *«ver»* que abre un abanico, como *All backups
in Drive (xx)*. Misma regla para el Error Log y para los avisos del sistema.
**Una pantalla de diagnóstico que grita cuando todo va bien enseña a no
mirarla.**

---

## 3 · Lo que NO cambiaría, y conviene decirlo

- **Las tres formas de guardar se quedan.** La diferencia significa algo. Lo
  que había que arreglar era que no estuviera escrito cuál va cuándo.
- **Las acciones en la fila se quedan** donde la acción es de una sola fila
  (adjuntar un documento, el ojo de una ubicación). Lo que se va es el **modo**
  que las gobierna desde arriba.
- **Movements y Dashboard no se tocan.** Son la forma a la que van las demás.

---

## 4 · El orden, y qué entrega cada paso

| | Qué | Vale por sí solo |
|---|---|---|
| ✅ | `_vigilarGuardar` y la franja que no salta | **Hecho, v13.9** |
| **1** | La tabla de §2.3 escrita en `ESTANDAR-DE-LA-PLANTILLA.md` | Media hora, y guía todo lo demás |
| **2** | **Categories** a casilla + barra, con la regla de uno/varios | Es el diseño que Jose ya definió, y el molde para las otras tres |
| **3** | Locations, Directory y Materials al mismo molde | Desaparecen los modos y el `prompt()` |
| **4** | La tarjeta de contacto en Suppliers y Directory | Barato y se nota |
| **5** | Error Log y System plegados | Cierra la parte de diagnóstico |

**El paso 1 no es burocracia: es lo que hace que el 2 no haya que repetirlo.**
Sin la tabla escrita, la pantalla que se escriba en diciembre volverá a elegir
por casualidad, y en enero habrá otra lista de veintitrés cosas.
