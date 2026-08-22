# Concurrencia — qué pasa cuando dos personas guardan a la vez

Resultado de la prueba que Jose puso primera en la lista.
Ejecutable: `node tools/test-concurrency.js`

---

## La respuesta corta

**Guardar movimientos —lo que más se hace y lo más peligroso— está bien
protegido.** Ese camino ya estaba pensado para esto y está bien hecho.

**Hay siete caminos más que también cambian el stock y NO estaban protegidos.**
Dos de ellos —los dos que un admin toca de verdad en un día normal— ya lo están
desde v10.0. Los otros cinco siguen abiertos, y son cada vez menos frecuentes.

*(Lo de abajo se escribió con los siete abiertos; se conserva tal cual porque
explica el problema. Lo aplicado está al final, en "El arreglo".)*

Ninguno es tan frecuente como guardar un movimiento, pero varios son cosas que
un admin hace en un día normal, y el daño sería silencioso.

Nada de esto se ha probado todavía con gente real al mismo tiempo. Esta prueba
acota dónde mirar.

---

## Lo que sí está protegido

| Camino | Candado |
|---|---|
| `addMovementsBatch_` — guardar movimientos | `waitLock(8000)` |
| `archiveOldMovements` — mover filas viejas | `tryLock(10000)` |

Y está bien hecho, en tres detalles que suelen fallar:

1. **La lectura ocurre DENTRO del candado.** Si el archive se leyera antes,
   el candado sería decorativo: dos ejecuciones leerían el mismo "antes" y
   luego se turnarían para escribir, y la segunda igual pisaría a la primera.
2. **Se libera en un `finally`.** Un error de validación no puede dejar el
   candado tomado y a todos los demás afuera.
3. **Los dos casos fallan distinto, y es correcto.** Guardar un movimiento
   falla **ruidosamente** ("System busy — please retry") porque hay una
   persona esperando; el archivado de fondo se rinde en silencio y lo intenta
   después, porque no hay nadie mirando.

## Los siete caminos sin candado

Ordenados por riesgo real, no por gravedad teórica:

| Camino | Qué hace | Qué tan seguido |
|---|---|---|
| ~~`modifyMovement`~~ ✅ v10.0 | Editar un movimiento guardado (cantidad, categoría, nombre — todo cambia el stock) | **Un admin, cualquier día** |
| ~~`updateConfig`~~ ✅ v10.0 | **Renombrar una categoría reescribe la celda Categoría de CADA fila del archive** | Ocasional, y toca todo |
| `manageMaterial` | Renombrar / fusionar / borrar un material — reescribe muchas filas | Ocasional |
| `mergeConfigValues` | Fusionar categorías o proyectos | Poco frecuente |
| `mergeLocations` | Fusionar ubicaciones | Poco frecuente |
| `refreshDerivedSheets_` | Reescribe LIVE_STOCK / SITE_STOCK / WASTED_STOCK | **Constante** (pero ver abajo) |
| `menuNormalizeStatus` | Limpieza única del Status desde el menú | Rarísimo, lo corre el dueño |

**`updateConfig` lo encontró la prueba, no yo leyendo el código.** Al revisar
a mano lo di por inocente porque parece un cambio de configuración; lo que
hace en realidad es recorrer el archive completo reescribiendo celdas. Es
justo la clase de cosa que un par de ojos pasa por alto y un test no.

### El caso peligroso, en concreto

Un admin corrige un movimiento de ayer mientras alguien en bodega registra una
salida. Los dos leen el estado, los dos escriben. **No hay error, no hay
aviso, los dos ven "guardado ✓"** — y el número queda mal hasta que alguien
vaya a contar físicamente. Ese silencio es el problema, no la colisión.

### Un matiz importante sobre `refreshDerivedSheets_` — y una corrección

Se llama **desde dentro** de `addMovementsBatch_`, que ya tiene el candado. O
sea que en el camino más frecuente **sí está protegido**.

Antes escribí aquí que esto obligaba a un candado reentrante. **Es al revés**, y
vale la pena decirlo claro porque cambió el arreglo entero:

`refreshDerivedSheets_` se llama desde **dentro** de `modifyMovement`,
`manageMaterial`, `mergeConfigValues`, `mergeLocations` y `addMovementsBatch_`.
Como la llamada va anidada dentro del que llama, **poner el candado en el de
afuera ya cubre al de adentro, gratis**. Lo que sí rompería es darle a
`refreshDerivedSheets_` un `waitLock` propio: ahí sí se bloquearía a sí mismo.

Resultado: no hace falta ninguna maquinaria de reentrancia, y el paso 3 se hace
casi solo con los pasos 1 y 2. El candado quedó siendo diez líneas en vez de
veinte, sin un contador de profundidad que mantener.

---

## El arreglo — paso 1 aplicado en v10.0

Un solo ayudante, sin reentrancia (ver la corrección de arriba), y que los
caminos que faltaban lo usen:

```javascript
function withStockLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    throw new Error('System busy — someone else is saving right now. Please try again in a moment.');
  }
  try { return fn(); }
  finally { try { lock.releaseLock(); } catch (e) {} }
}
```

Dos reglas para usarlo, escritas también en el código: no llamarlo desde algo
que ya tiene el candado, y no envolver un bloque que llame a
`archiveOldMovements` — ese toma este mismo candado y lo encontraría tomado.

**Lo hecho en v10.0 (paso 1):**

- `modifyMovement` se partió en dos. La comprobación de permisos se queda
  afuera (un VIEWER debe recibir un "no" sin hacer cola por el candado) y todo
  lo que toca la hoja se movió a `modifyMovementLocked_`, dentro del candado.
  Se partió en vez de reindentar 140 líneas de lógica ya auditada: así el
  `diff` muestra el candado y nada más.
- En `updateConfig` se envolvió **solo** el bloque de renombrar categoría, no
  la función entera, por la segunda regla de arriba: la rama de
  `archiveCutoffMonths` llama a `archiveOldMovements`. (Esa rama hace `return`
  antes de llegar al renombrado, así que los dos nunca corren en la misma
  ejecución — pero el bloque queda acotado igual, para que siga siendo cierto
  si mañana alguien mueve un `return`.)
- `addMovementsBatch_` **no se tocó.** Sigue con su `waitLock(8000)` de
  siempre. El camino más crítico del producto queda exactamente como estaba y
  como estaba probado.

`tools/test-concurrency.js` verifica que `modifyMovementLocked_` **solo** se
alcanza desde dentro de `withStockLock_` — contando paréntesis, no confiando en
el sufijo del nombre. Si alguien lo llama desde fuera del candado, la prueba
falla.

**Qué es lo peor que puede pasar con este arreglo:** que a alguien le salga
"System busy — please try again" cuando un admin está renombrando una categoría
grande. Nunca pérdida de datos: el que no consigue el candado no escribe nada.
Y Apps Script suelta el candado cuando termina la ejecución, así que ni un bug
que se saltara el `releaseLock` podría dejarlo tomado más allá de esa petición.

**Lo que falta, en orden:**
2. `manageMaterial`, `mergeConfigValues`, `mergeLocations`
3. `refreshDerivedSheets_` — ya cubierto de forma transitiva en los caminos
   que importan; queda decidir si vale la pena para las llamadas sueltas
4. `menuNormalizeStatus` — casi simbólico

---

## Lo que esta prueba NO demuestra

Importante, después de lo que pasó con el favicon:

- **Parte 1** es un hecho sobre el código fuente: quién toma el candado.
  Eso es verificable y está verificado.
- **Parte 2** es un **modelo** del mecanismo (lectura-modificación-escritura
  con y sin candado). No ejecuta `addMovementsBatch_` — eso necesita Sheets de
  verdad. Demuestra el mecanismo, no el producto.
- **Ninguna de las dos** demuestra que una instalación real aguante cuatro
  personas trabajando a la vez.

Eso sigue necesitando una prueba en vivo: una copia desplegada, tres o cuatro
navegadores, todos guardando movimientos del mismo material al mismo tiempo, y
después contar a mano. Es la prueba que falta, y ahora al menos se sabe qué
mirar.
