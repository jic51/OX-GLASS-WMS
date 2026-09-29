# El estándar de la plantilla — qué ve el cliente al abrir su hoja

> Jose, 2026-09-28: *"sobre la plantilla debemos estandarizarla y ponerle formato
> a todo, el formato profesional que queremos que los usuarios vean ya sea cuando
> yo les instale el programa o cuando ellos lo hagan (en algún momento vamos a
> automatizar todo)."*

`MASTER-TEMPLATE.md` dice cómo dejar la plantilla **limpia** (sin datos de OX,
sin secretos). Este documento dice cómo dejarla **presentable**. Son dos cosas
distintas y hasta ahora sólo estaba escrita la primera.

---

## El problema, medido

**Ya existe una casa de estilo, y sólo tres pestañas de veinte la usan.**

En `Code_v3_fixed.gs:8325`:

```javascript
var SH_NAVY = '#1B2A4A', SH_ACCENT = '#3B7DD8', SH_MUTED = '#6B7280', SH_PAPER = '#FFFFFF';
```

Con eso están hechas `👉 START HERE`, `TERMS` y `PRIVACY`: tipografía Arial,
jerarquía de tamaños, sin cuadrícula, ancho de columna medido, protección en modo
aviso. Se ven como un producto.

**Las otras diecisiete reciben esto y nada más:**

```javascript
sheet.setFrozenRows(1);
sheet.getRange(1, 1, 1, header.length).setFontWeight('bold');
```

Una fila fija y el encabezado en negrita. Sin anchos, sin color de pestaña, sin
formato de número, sin orden, sin decir cuáles se pueden tocar. Así que la
secuencia real que vive un cliente nuevo es: una pestaña de bienvenida cuidada
→ y detrás, diecisiete volcados de hoja de cálculo. **El contraste hace más daño
que si ninguna estuviera formateada**, porque enseña que sí sabíamos cómo.

---

## La decisión de fondo: esto tiene que ser código, no una lista de pasos

Un formato puesto a mano sobre la plantilla **se pierde en el primer `insertSheet`
que añada una pestaña nueva**, y nadie lo nota, porque lo que falta no falla. Es
el patrón que este proyecto ya conoce por su nombre: *dos listas que tienen que
coincidir sin nada que lo obligue* (`check-suite.js` existe por eso) y *un
comportamiento cableado en un camino y no en los otros* (`_entryTodoResolve`
existe por eso).

**Entonces: una función `aplicarFormatoEstandar_(ss)`**, llamada desde tres
sitios — al crear las hojas, desde el menú de la plantilla, y desde
`🩺 Check this installation` en modo "revisar y reportar". Idempotente: correrla
dos veces no cambia nada la segunda.

---

## El estándar

### 1. El color de la pestaña dice si se puede editar a mano

Esto no es decoración: **es la respuesta a la pregunta de soporte más frecuente
que va a haber**, y hoy no está escrita en ningún sitio. Cuatro grupos, en este
orden de pestañas:

| Grupo | Pestañas | Color | Qué significa |
|---|---|---|---|
| **Para leer** | `👉 START HERE`, `TERMS`, `PRIVACY` | `SH_NAVY` #1B2A4A | documentos, no hojas de trabajo |
| **Datos** | `MASTER_ARCHIVE_V3`, `INCOMING_V3`, `USERS_V3`, `CONFIG`, `MATERIAL_PACKS`, `PM_DIRECTORY`, `RACK_PHOTOS` | `SH_ACCENT` #3B7DD8 | el sistema vive aquí; se mira, se edita con cuidado |
| **Calculadas** | `LIVE_STOCK`, `SITE_STOCK`, `WASTED_STOCK`, `RESERVATIONS`, `MATERIAL_LOCKS` | `SH_MUTED` #6B7280 | **las reescribe la app: editar aquí no sirve de nada** |
| **Registro** | `AUDIT_LOG`, `ERROR_LOG`, `ARCHIVE_HISTORY`, `MOVEMENT_TRASH` | #9CA3AF | sólo se añade; no se corrige |

**Y en `A1` de cada calculada, una nota** (`setNote`, que el código no lee y la
persona ve al pasar el ratón): *"Rebuilt by Acopio from MASTER_ARCHIVE_V3. Edits
here are overwritten — change the movement instead."* Es la línea que evita que
alguien "arregle" el stock a mano y no entienda por qué vuelve.

### 2. El formato de número es `@` (texto), y es integridad, no estética

**Esto es lo más importante de la página y es contraintuitivo.**

Toda fila del archivo se escribe con `textSafeRow_` (`Code_v3_fixed.gs:1689`):
cada celda es texto. Y tiene que seguir siendo texto, porque Sheets **parsea** lo
que se le da: `setValues("07-6329")` no guarda esos ocho caracteres, lee *mes 07,
año 6329*, guarda `1617842` y le cuelga un formato de fecha. El PO deja de estar
en la celda, y no se puede recuperar de ahí — sólo de otras filas que aún lo
tengan. Jose lo encontró el 2026-09-09; lo guarda
`tools/test-text-stays-text.js`.

Y hay una frase en ese archivo que decide este apartado entero:

> *"Las otras hojas de Jose son viejas y llevan formato de texto puesto a mano.
> UNA INSTALACIÓN NUEVA no lo lleva: ahí el archivo lo crea `insertSheet`, con
> formato automático, y el PO se habría roto en el primer guardado."*

> ## ⚠️ CORRECCIÓN (2026-09-29, al construirlo) — yo exageré esto
>
> Este apartado decía: *"la plantilla de hoy sale sin la protección que la hoja
> de OX tiene por casualidad… es cerrar un agujero que hoy está abierto en toda
> instalación nueva"*, y se lo dije a Jose con esas palabras. **No es verdad, y
> la frase citada arriba es lo que me confundió: está en pasado condicional —
> "se HABRÍA roto"— porque describe el mundo ANTES de que existiera `textCell_`.**
>
> Lo que de verdad protege las escrituras de la app es `textCell_`, que pone una
> comilla delante de cada cadena en **todos** los caminos de escritura, y lo
> guarda `test-text-stays-text.js`. Eso ya cubre una instalación nueva.
>
> **El formato `@` sigue valiendo la pena, pero como SEGUNDA capa**, y sirve para
> lo que la comilla no alcanza: cuando una persona escribe **a mano** en la hoja,
> y el día que alguien añada un camino de escritura que se olvide de `textCell_`.
>
> Y eso cambia dónde se puede aplicar: **sólo en hojas vacías**. Poner `@` sobre
> una columna que ya tiene números cambia cómo se ven —un importe pasaría a
> enseñarse como texto y cualquier fórmula del cliente sobre esa columna dejaría
> de sumar—. Sobre una plantilla vacía no cuesta nada; sobre datos de verdad
> sería la clase de sorpresa que este proyecto evita.
>
> Implementado así en la v12.23: `aplicarFormatoEstandar_` mira hoja por hoja si
> tiene datos y se salta el formato de celdas en las que los tengan, **diciendo
> cuáles se saltó** en vez de callarlo.

Así que poner `setNumberFormat('@')` en las columnas de datos de una plantilla
vacía es gratis y protege desde el primer día. No va primero por urgencia —
`textCell_` ya cubre lo urgente— sino porque es el sitio donde no cuesta nada.

Consecuencia de estilo: el texto se alinea a la izquierda, así que las columnas
de cantidad y de dinero se alinean a la derecha **con
`setHorizontalAlignment('right')`**, que es presentación y no toca el valor.
Nunca con un formato de número, que sí lo tocaría.

### 3. La fila de encabezado

Una sola regla para las diecisiete: fondo `SH_NAVY`, letra blanca en negrita,
9,5 pt, `setFrozenRows(1)`, altura 28 px, alineada abajo. Hoy es negrita sobre
blanco, que es lo que hace que la pestaña se lea como un borrador.

### 4. Los anchos de columna

Por **clase de contenido**, no columna por columna, para que añadir una columna
no sea inventar un número:

| Clase | Ancho | Ejemplo |
|---|---|---|
| marca de tiempo | 140 | `Timestamp` |
| fecha | 100 | `Date Received` |
| texto corto | 110 | `Unit`, `Status`, `PO#` |
| texto normal | 170 | `Category`, `Supplier`, `Project` |
| texto largo | 260 | `Name`, `Comments` |
| cantidad / dinero | 90 | `Qty`, `Unit Cost` |
| identificador | 220 | `Material ID`, `Movement ID` |

Los números exactos se fijan **midiendo contra el contenido real** cuando se
implemente, igual que se midieron los 46 y 48 px de la columna Qty / Unit en la
v12.18. No antes: un ancho inventado es un ancho que hay que volver a cambiar.

`Comments` y `Name` con `setWrap(false)` y `setVerticalAlignment('middle')`: en
una hoja de mil filas, el texto envuelto convierte el desplazamiento en un salto
de altura por fila y hace la hoja ilegible. El texto completo se lee en la app,
que es donde se lee.

### 5. Cuadrícula y protección

- **Documentos** (`START HERE`, `TERMS`, `PRIVACY`): `setHiddenGridlines(true)` y
  `protect().setWarningOnly(true)` — ya lo tienen, es el modelo.
- **Calculadas y registro:** `protect().setWarningOnly(true)`. **Aviso, no
  bloqueo**, y a propósito: la app escribe en ellas con la misma cuenta, y un
  bloqueo de verdad es una forma nueva de que la app falle de noche. El aviso
  frena a la persona y no frena al código.
- **Datos:** sin protección. Son del cliente.

---

## Lo que NO se aplica a una instalación que ya funciona

Correr esto sobre la hoja de un cliente que lleva meses **pisaría decisiones
suyas**, y eso choca de frente con la regla de siempre: *los datos como el usuario
los ingresó*. Así que se parte en dos conjuntos:

**Seguro en cualquier momento** (no destruye nada que alguien haya elegido):
formato `@` de las columnas de datos, color de pestaña, nota en `A1`, fila fija,
estilo del encabezado, protección en modo aviso.

**Sólo en la plantilla y en instalaciones nuevas** (el cliente pudo haberlo
cambiado a propósito): anchos de columna, orden de las pestañas, alineaciones,
ocultar pestañas.

El botón que lo corre tiene que decir cuál de los dos va a hacer, antes de
hacerlo.

---

## Cómo se comprueba

`tools/test-formato-plantilla.js`, con la hoja falsa que ya usa
`test-archivo-nocturno.js` (registra las llamadas de formato en vez de dibujar):

1. **Todas las pestañas de `TEMPLATE_DATA_SHEETS` + `CONFIG` reciben formato.**
   Ésta es la que importa, y es la lección de `check-suite.js`: el fallo no va a
   ser un color mal puesto, va a ser una pestaña **nueva** que nadie añadió a la
   lista. La prueba compara contra `SHEETS`, no contra una lista propia.
2. **Ninguna columna de datos queda con formato distinto de `@`.** Es la que
   protege el PO.
3. **Correrlo dos veces no cambia nada la segunda** (idempotencia).
4. **El conjunto "seguro" no toca anchos ni orden.**

---

## Orden de trabajo

1. **`setNumberFormat('@')` en las columnas de datos.** Cierra un agujero real en
   toda instalación nueva. Se puede hacer solo, ya, sin el resto.
2. Encabezado, color de pestaña, nota en `A1`, fila fija. Barato y es el 80% de
   "se ve profesional".
3. Anchos medidos y orden de pestañas.
4. La prueba, y el botón en `🩺 Check this installation` que reporta lo que falta.

El punto 1 no es cosmético y no debería esperar al resto.
