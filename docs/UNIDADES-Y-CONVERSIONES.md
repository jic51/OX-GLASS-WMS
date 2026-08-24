# Unidades y conversiones — diseño

Nace de una pregunta de Jose que parecía chica ("que la app calcule el costo
por caja") y resultó ser la función más grande de todo el backlog.

> **Nada de esto está construido.** Es diseño, y hay decisiones que tomar antes
> de escribir la primera línea. Se escribe primero justamente porque toca el
> motor de stock y el de costos, que son los dos sitios donde un error no da la
> cara: da un número, y el número está mal.

---

## Los dos ejemplos de Jose, que es donde está todo

**Sellador.** Llega **1 pallet = 30 cajas**, y **cada caja = 12 tubos**. Una
persona saca **3 cajas**; otra saca **5 tubos**.

**Panadería.** Llegan **10 sacos de harina de 50 kg**. Cada día se usan **15
kg** — y puede que esa panadería cuente en libras.

Lo que ambos tienen en común, y que el sistema hoy no sabe hacer:

- **Se compra en una unidad y se consume en otra.**
- **La unidad de compra ni siquiera es una sola** — el sellador entra por
  pallet, pero también podría entrar por caja suelta.
- **La cantidad que sale no siempre está en la unidad que entró.**

Hoy Acopio guarda un solo número por material y una sola unidad. Eso funciona
mientras todo el mundo hable en la misma unidad, y se rompe en cuanto alguien
saca 5 tubos de una caja.

---

## El concepto que lo resuelve, y es uno solo

Todo sistema de inventario serio lo hace igual: **una unidad base por material,
y todo lo demás son formas de nombrarla.**

| | Sellador | Harina |
|---|---|---|
| **Unidad base** (en la que se guarda TODO) | tubo | kg |
| **Paquete** | Caja = 12 tubos | Saco = 50 kg |
| **Paquete** | Pallet = 360 tubos | — |

**El stock siempre se guarda en la unidad base.** Los paquetes son atajos para
entrar y sacar, nunca una segunda contabilidad.

- Entra 1 pallet → se guardan **360 tubos**
- Sale 3 cajas → salen **36 tubos**
- Sale 5 tubos → salen **5 tubos**
- Quedan **319 tubos**, que la app puede mostrar además como *"26 cajas y 7
  tubos"*

Un solo número, una sola verdad. Todo lo demás es presentación.

### La regla que hace esto seguro

**Cada movimiento guarda la cantidad en unidad base Y el factor que se usó ese
día.**

No es un detalle: si el proveedor cambia la caja de 12 a 10 tubos el año que
viene, **las filas del año pasado no se pueden reinterpretar**. Son el registro
de lo que era cierto entonces.

Es exactamente el mismo principio que ya está escrito arriba de `updateConfig`
para los nombres de proveedor y proyecto: **la historia no se reescribe.**

---

## ⚠️ Dos cosas que parecen la misma y no lo son

Aquí es donde este tipo de función se suele construir mal.

**1. Conversión de EMPAQUE — la que Jose pidió.**
Caja → tubo, pallet → caja, saco → kg. **El factor lo pone el usuario**, es
distinto para cada material, y solo él lo sabe. 12 tubos por caja no es una
verdad del universo; es lo que ese proveedor mete en esa caja.

**2. Conversión de MEDIDA — la del ejemplo de la panadería.**
kg ↔ lb, metro ↔ pie. **El factor es universal**, no depende del material, y lo
sabemos nosotros: 1 kg = 2.20462 lb.

Meter las dos en el mismo mecanismo es el error clásico. Y para la primera
versión, **la respuesta correcta es soportar solo la primera**:

- Si la panadería cuenta en kg, su unidad base es kg y el saco es un paquete de
  50. Resuelto.
- Si cuenta en libras, su unidad base es lb y el saco es un paquete de 110.23.
  **También resuelto, sin que la app sepa nada de kilos.**

Lo que NO se puede hacer con solo empaques es que una misma panadería registre
unas entradas en kg y otras en lb. Eso sí necesita conversión de medida — y es
una función aparte, para el día que un cliente real la pida. **No la
inventemos antes.**

---

## Decisiones ya tomadas por Jose (v11.0)

| Pregunta | Respuesta |
|---|---|
| ¿La app supone la conversión? | **Nunca.** El dato lo da el usuario. |
| ¿Se le pregunta cada vez? | **No.** Lo escribe una vez, se autocompleta siempre, y **se puede cambiar cuando quiera**. |
| ¿Se guarda lo que pagó por el paquete? | **Sí** |
| ¿Unidades nuevas? | **PALLET, CASE, BAG**, y una lista propia por plantilla de industria |

Sobre la primera y la segunda juntas, que es el matiz que importa: **el sistema
no adivina, pero tampoco hace teclear lo mismo veinte veces.** El usuario
enseña la conversión una vez y la app la recuerda hasta que él la cambie. Eso
no es suponer — es recordar lo que él dijo.

---

## Lo que esto toca — y por qué hay que partirlo

Honestamente: **es la pieza más grande del backlog, más que los códigos de
barras.** Toca los dos sitios donde un error es silencioso.

| Qué | Por qué |
|---|---|
| El motor de stock | Todo se convierte a unidad base antes de sumar |
| El motor de costos | El promedio ponderado pasa a ser por unidad base |
| El archive | Filas nuevas: unidad tecleada, factor usado, precio del paquete |
| Cada formulario de movimiento | Elegir en qué unidad se está hablando |
| Cada pantalla que muestra cantidades | Decidir qué unidad enseñar |
| Las plantillas por industria | Cada una trae su lista de unidades |

**Los datos que ya existen no se rompen**, y eso es la mejor noticia del
diseño: un material de hoy tiene una unidad y cantidades en esa unidad. Esa
unidad pasa a ser su unidad base, sin paquetes definidos, y todo sigue
funcionando igual. La migración es no hacer nada.

---

## La propuesta: dos fases

### Fase 1 — Paquetes y costo. Chica, segura, y es lo que Jose pidió al principio.

- Por material: una lista de paquetes (`nombre` + `cuántas unidades base trae`),
  que el usuario escribe una vez y puede editar.
- En **ENTRY**: elegir paquete, cuántos, y **el precio del paquete**. La app
  calcula la cantidad en unidad base y el costo unitario, **mostrando la
  cuenta**.
- Se guarda además lo que pagó por el paquete.
- **La salida no cambia.** Todo sigue saliendo en unidad base.

**Riesgo: bajo.** El stock sigue guardándose exactamente igual; lo único nuevo
es una multiplicación al entrar y una división para el costo.

### Fase 2 — Sacar en la unidad que sea. Grande, y es donde está el peligro.

Sacar 3 cajas o 5 tubos del mismo material, mostrar el stock en la unidad que
le sirva a cada pantalla, y que el mapa de bodega hable en cajas mientras el
dashboard habla en tubos.

**Riesgo: alto**, y por eso va aparte. Aquí es donde un factor mal aplicado
convierte 319 tubos en 3,828 sin que nadie lo note hasta el conteo físico.

**La Fase 1 entrega la mayor parte del valor con una fracción del riesgo, y
deja los paquetes existiendo como dato — que es justo lo que la Fase 2
necesita para poder construirse bien.**

---

## Lo que falta decidir antes de la Fase 1

1. **¿Dónde viven los paquetes?** Una pestaña nueva (`MATERIAL_PACKS`) o
   columnas más en CONFIG. Me inclino por pestaña nueva: CONFIG ya está
   apretado y esto es una lista por material, no un catálogo.
2. **¿Un material puede tener varios paquetes a la vez?** El sellador dice que
   sí — caja **y** pallet. Encarece poco y sin eso el ejemplo de Jose no entra.
3. **¿Los factores admiten decimales?** El saco de 110.23 lb dice que sí.
   Pero decimales en cantidades de inventario traen redondeos, y hay que
   decidir con cuántos dígitos se guarda.
4. **¿Qué unidad ve el que solo mira?** El dashboard de hoy dice "5,357 units".
   Con unidades base distintas por material, esa suma deja de significar algo.
   Probablemente haya que quitarla o cambiarla — y eso es una decisión de
   producto, no técnica.
