# ¿Partir la app en muchos archivos? — qué se gana, qué se paga, y cuándo

Jose, 2026-10-03:

> *"La app hoy es un solo código (2 en realidad, .gs y .html), pero una app
> profesional no es un solo bloque. ¿No es mejor dividir la app en bloques o
> funciones y que cada uno tenga su propio archivo? ¿Eso es bueno o malo?
> ¿Ventajas y desventajas?"*

**La premisa es correcta y la pregunta es la que hay que hacerse.** Hoy son:

| Archivo | Líneas |
|---|---|
| `Code_v3_fixed.gs` | **13.279** (297 funciones, 68 secciones) |
| `Index_v3_fixed.html` | **24.132** |
| `SetupWizard.html` | 612 |

Eso es grande de verdad. Pero la respuesta no es automática, porque depende de
dos cosas muy concretas: **cómo funciona Apps Script** y **cómo entregamos la app
a un cliente**.

## 1. Lo que la gente cree que gana al partir, y aquí NO se gana

**Apps Script no tiene módulos.** No hay `import` ni `export` ni `require`. Todos
los archivos `.gs` de un proyecto **comparten un único ámbito global** y se
cargan juntos.

Consecuencia directa: partir `Code.gs` en diez archivos da **orden**, no
**aislamiento**. Las 297 funciones siguen siendo globales. Dos funciones con el
mismo nombre en archivos distintos siguen pisándose — y ahora sin que se vea,
porque están en pantallas diferentes.

**Y aparece un problema nuevo que hoy no tenemos: el orden de carga.** Las
funciones se pueden llamar desde cualquier sitio, pero las variables de nivel
superior (`var AC_WIDTH = 23`, las tablas de configuración, las constantes) se
inicializan **en el orden en que están los archivos**. Si una constante vive en
un archivo que carga después del que la usa, el valor es `undefined` y no falla:
da un resultado equivocado.

Esto no es hipotético. **Ya nos mordió: hay una prueba llamada
`test-use-before-var.js` escrita precisamente por eso.** En un solo archivo el
orden se ve leyendo de arriba abajo. Repartido en diez, depende de en qué orden
estén los archivos, y eso no se ve en ninguna parte.

## 2. Lo que sí se gana

1. **Encontrar las cosas.** Trece mil líneas se navegan con el buscador, no con
   los ojos.
2. **Saber qué hay.** Una lista de archivos con nombres —`stock.gs`,
   `archivado.gs`, `usuarios.gs`— cuenta la forma del producto de un vistazo.
   Hoy eso sólo lo saben las 68 cabeceras de sección, y hay que leerlas.
3. **Tocar una cosa sin abrir el resto.** Cambios más pequeños, diferencias más
   fáciles de revisar.
4. **En el HTML, además, Apps Script SÍ tiene un mecanismo de verdad**:
   `HtmlService.createTemplateFromFile()` con `<?!= include('archivo') ?>`. Las
   24.132 líneas se pueden repartir en estilos, pantallas y lógica sin inventar
   nada. Es la parte donde partir es más natural y donde más líneas hay.

## 3. Lo que cuesta — y esto es lo que decide

### El coste que se paga una y otra vez: la entrega

**Hoy actualizar a un cliente es pegar tres archivos a mano.** Con veinte
archivos, son veinte pegadas a mano, en cada cliente, en cada versión, para
siempre.

Y no es una exageración teórica: **acabamos de perder un día entero porque se
olvidó UNO de los tres** — el `appsscript.json`, que además está escondido. Pasar
de 3 a 20 multiplica por siete las oportunidades de que se olvide alguno, y el
síntoma de olvidar uno nunca dice "te falta un archivo": dice *"no tienes
permiso para llamar a ScriptApp.getProjectTriggers"*.

### El coste de una vez: las 125 pruebas

El andamio de pruebas lee `Code_v3_fixed.gs` **por nombre** y saca de él cada
función para ejecutarla. Partir el archivo sin tocar el andamio rompe la
verificación entera: 125 pruebas que dejan de medir el producto.

Tiene arreglo —el andamio puede leer una carpeta y juntarla— pero es trabajo, y
es trabajo **antes** de poder confiar otra vez en las pruebas, no después.

## 4. La salida buena: separar cómo se escribe de cómo se entrega

**No son la misma pregunta, y tratarlas como si lo fueran es lo que hace que esto
parezca un todo o nada.**

> **Muchos archivos para escribir. Un archivo para entregar.**

Se escribe en `src/stock.gs`, `src/archivado.gs`, `src/usuarios.gs`… y un paso de
construcción los junta en el `Code_v3_fixed.gs` de siempre, en un orden fijo y
declarado. Lo mismo con el HTML.

Con eso:

- se gana todo lo del punto 2;
- **no se paga nada del punto 3**: al cliente se le sigue entregando el mismo
  número de archivos, y las pruebas siguen leyendo el archivo generado sin
  enterarse;
- el orden de carga deja de ser un azar y pasa a ser **una lista escrita en el
  script de construcción**, que es justo donde se puede ver y probar.

Y la costumbre ya la tenemos: `build-site.js` construye el sitio,
`build-fingerprint.js` sella los dos archivos. Esto es lo mismo, un paso más.

**Lo que NO sirve aquí:** `clasp`, la herramienta oficial de Google para subir
una carpeta local a un proyecto de Apps Script. Vale para *nuestro* proyecto,
pero no para los clientes: cada cliente tiene su propia copia, en su Drive, y no
vamos a instalarle una herramienta de línea de comandos para que reciba una
actualización.

## 5. Veredicto, y el momento

**No ahora.** Es un cambio grande, de riesgo medio, que **no arregla ningún fallo
que tengamos hoy** y que llega justo cuando lo que falta es vender. Y hay que ser
honesto con una cosa: el miedo que de verdad hay detrás de "quiero partirlo" casi
siempre es *"me da miedo tocar algo y romper otra cosa"* — y eso no lo arregla
partir el archivo. Lo arreglan las pruebas. De eso tenemos 125, y es la razón por
la que estos meses se ha podido cambiar código delicado sin romperlo.

**Lo que sí haría ya, y cuesta una hora:** un índice al principio de cada
archivo. Las 68 secciones ya existen; lo que falta es la lista al principio que
diga qué hay y en qué orden.

**Cuándo tocará hacerlo de verdad** — cuando pase cualquiera de estas tres:

1. **Toque el código alguien más que yo.** Con dos personas, un solo archivo son
   conflictos constantes y es el argumento más fuerte de todos.
2. **Haya un paso de construcción por otro motivo.** Entonces el reparto sale
   casi gratis y sería tonto no hacerlo.
3. **El editor empiece a ir mal con el archivo.** Es un síntoma, no una teoría:
   el día que pase, se nota.

**Y por dónde empezar cuando toque: por el HTML, no por el `.gs`.** Tiene casi el
doble de líneas, Apps Script trae `include()` de serie, y no tiene el problema
del orden de carga de las variables globales.
