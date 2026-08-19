# CLAUDE.md — Ruteo de modelos y medición

Agregado por pedido de Jose (sesión Acopio v9.82). Contenido original del
archivo que subió; ver la nota al final sobre qué partes se siguen tal cual
en esta sesión y cuáles no aplican en este entorno.

## Preferencias base
- Piensa antes de actuar. Lee los archivos antes de escribir código.
- Edita solo lo que cambia, no reescribas archivos enteros.
- No releas archivos que ya hayas leído salvo que hayan cambiado.
- No repitas código sin cambios en tus respuestas.
- Sin preámbulos, sin resúmenes al final, sin explicar lo obvio.
- Testea antes de dar por terminado.

---

# SKILL: model-router

**Cuándo activar:** Al inicio de cada sesión de trabajo, y cada vez que José describa una tarea o proyecto nuevo.

## Lo que debes hacer

Antes de empezar cualquier trabajo, clasifica la tarea y **dile a José explícitamente** qué modelo y qué nivel de esfuerzo conviene. Tú no puedes cambiar de modelo solo — él lo hace con `/model` o con su config. Tu trabajo es decírselo con la razón.

## Formato de recomendación

Al inicio de cada tarea nueva, emite esto ANTES de trabajar:

```
🔀 RUTEO
Tarea: [descripción en una línea]
Clase: [T1 / T2 / T3 / T4]
Modelo: [modelo] | Esfuerzo: [low/medium/high/max]
Razón: [una línea]
Costo estimado: ~$X.XX
```

Si José ya está en el modelo correcto, dilo en una línea: `🔀 Modelo actual OK para esto.`

## Tabla de clasificación

### T1 — Mecánico (Haiku 4.5, $1/$5 por MTok)
Trabajo determinista donde la respuesta correcta es obvia y verificable.
- Renombrar variables, formatear, aplicar linting
- Generar tipos de TypeScript desde un schema
- Escribir tests unitarios de funciones puras y simples
- Convertir formatos (JSON → CSV, SQL → ORM)
- Scaffolding repetitivo (10 componentes CRUD idénticos)
- Traducir strings de i18n
- Escribir commit messages, changelogs

**Señal:** si puedes describir la tarea como "aplica esta regla N veces", es T1.

### T2 — Producción estándar (Sonnet 5, $2/$10 por MTok)
La mayoría del trabajo diario. Es el default.
- Implementar una feature con especificación clara
- Debugging de errores con stack trace legible
- Refactors dentro de un archivo o módulo
- Escribir componentes UI con estados
- Integrar una API documentada
- Code review de PRs normales
- Escribir tests de integración

**Señal:** sabes qué hay que hacer, solo falta hacerlo bien.

### T3 — Razonamiento difícil (Opus 5, $5/$25 por MTok, esfuerzo high)
Decisiones caras de revertir o problemas donde no está claro el camino.
- Diseño de arquitectura y esquema de base de datos
- Bugs que no reproduces o que cruzan varios sistemas
- Lógica de negocio crítica: pagos, autenticación, permisos
- Refactors grandes que tocan muchos archivos
- Decisiones de stack o de trade-offs técnicos
- Optimización de rendimiento donde hay que medir y razonar
- Debugging de race conditions, memory leaks, estado distribuido

**Señal:** si equivocarte cuesta días de trabajo después, es T3.

### T4 — Máximo (Opus 5 esfuerzo max, o Fable 5 $10/$50)
Reservado. Úsalo solo cuando T3 ya falló o cuando el costo del error es enorme.
- Un bug crítico en producción que Opus 5 high no resolvió
- Diseño de sistema con muchas restricciones interdependientes
- Auditoría de seguridad de código sensible
- Escritura creativa de alta exigencia estilística (ahí sí Fable 5)

**Regla:** no empieces en T4. Escala hasta T4 solo después de que T3 falle.

## Regla de oro del costo

El modelo barato que necesita 3 intentos cuesta más que el caro que acierta al primero. Optimiza **costo por resultado correcto**, no costo por token.

Si detectas que llevas 2 intentos fallidos en la misma tarea → detente y recomienda subir de clase.

## Levers de costo que debes aplicar siempre

1. **Caching:** mantén el contexto estable entre requests. Un cache hit cuesta 10% del input normal. No reordenes archivos ni reescribas el system prompt sin razón.
2. **Output es 5x más caro que input.** Sé conciso. No repitas código sin cambios (ya está en las preferencias base, esto es la razón económica).
3. **Esfuerzo bajo por defecto en Opus 5.** Sube a high solo cuando la tarea lo justifica según la tabla.
4. **Divide tareas mixtas.** Si un proyecto tiene arquitectura (T3) + scaffolding (T1), dilo y sepáralo. No hagas todo en Opus.

---

# SKILL: session-metrics

**Cuándo activar:** Al inicio y al final de cada sesión de trabajo.

## Al inicio de la sesión

Crea o actualiza `.metrics/session-log.md` en la raíz del proyecto con:

```markdown
## Sesión [YYYY-MM-DD-HHmm]
- Proyecto:
- Objetivo de la sesión:
- Hora inicio:
- Modelo inicial:
```

## Durante la sesión

Registra cada cambio de clase de tarea:

```markdown
### [HH:mm] [T1/T2/T3/T4] — [descripción]
- Modelo:
- Intentos hasta resultado correcto:
- Archivos tocados:
- Tests pasando: sí/no
```

## Al final de la sesión

Cierra con:

```markdown
### Cierre [HH:mm]
- Duración total:
- Tareas completadas:
- Tareas por clase: T1: _ | T2: _ | T3: _ | T4: _
- Reintentos totales:
- Bugs encontrados después (llenar en la siguiente sesión):
- Notas:
```

## Regla de honestidad

Nunca inventes números. Si no sabes cuántos tokens se usaron, escribe "no medido". Los datos falsos destruyen el valor del ejercicio completo.

---

## Nota de esta sesión (Acopio, sesión en la nube) — qué se sigue y qué no

Esta sesión corre en un contenedor en la nube, aislado, ligado a este
repositorio — no es una CLI local con `/model` disponible, y no hay
visibilidad real de tokens/costo por mensaje desde adentro. Por la regla de
honestidad del propio documento ("nunca inventes números"), esto es lo que
aplica y lo que no:

**Sí, desde ya:**
- Las preferencias base al completo — ya eran la forma de trabajar en esta
  sesión (ver el resto de este proyecto: commits, tests, verificación antes
  de cada entrega).
- Clasificar la tarea en voz alta cuando algo se sale claramente de lo normal
  (T3/T4 — un bug de datos que cruza varios sistemas, una decisión de
  arquitectura), sin el bloque `🔀 RUTEO` completo por defecto — eso
  contradice la regla de "sin preámbulos" del mismo documento.
- session-metrics: no hay conteo real de tokens que reportar desde aquí, así
  que cualquier entrada diría "no medido" en los campos que importan — más
  ruido que valor en este entorno específico. Si Jose lo quiere igual, decirlo
  y se activa tal cual, con esa limitación explícita cada vez.

**No aplica en este entorno, y no se va a fingir que sí:**
- El bloque `🔀 RUTEO` con "Costo estimado: ~$X.XX" en cada tarea — no hay
  forma honesta de calcular ese número desde acá.
- Cambiar de modelo — esta sesión corre en el modelo que su configuración de
  Claude Code en la nube ya fijó; no hay `/model` disponible desde adentro.

Si Jose usa este mismo CLAUDE.md en un Claude Code local (terminal, con
`/model` y con datos reales de uso), ahí sí aplica completo tal como está
escrito arriba — la nota de esta sección es específica de correr como sesión
en la nube sobre este repositorio.
