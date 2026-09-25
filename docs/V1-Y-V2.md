# Separar la v1 de la v2 — respuesta a la pregunta de Jose

Jose, 2026-09-25: *"¿esto sigue siendo parte de v1 o ya no? ¿Cómo hago para
separar lo que vamos haciendo de v2, para tener una v1 separada de la v2?
¿Podemos hacerlo en GitHub: guardar una v1, trabajar y arreglar cosas ahí, pero
también seguir mejorando la app para la v2 por otro lado?"*

**Sí se puede. Y casi seguro que no deberíamos hacerlo — todavía.** Esta es la
razón, y qué hacer en su lugar.

---

## Lo primero: en Acopio, "la versión que tiene el cliente" no es una rama

Esto es lo que cambia toda la respuesta, y es propio de cómo se distribuye
Acopio.

Cada cliente tiene **su propia copia del código pegada en su propio proyecto de
Apps Script**. No hay servidor central, no hay actualización automática, no hay
"empujar la v1.2 a todo el mundo". **La versión que tiene un cliente es,
literalmente, el texto que Jose le pegó la última vez.**

Consecuencia directa: **el cliente ya está congelado en una versión, la tenga
este repositorio o no.** Una rama `v1` no lo congela más de lo que ya lo está.
Lo que hace falta no es una rama: es **saber exactamente qué build tiene cada
cliente**, para poder reproducirlo si hay que arreglarle algo.

---

## Lo que sí resuelve el problema: una etiqueta por entrega

En Git, una **etiqueta** (`tag`) es un nombre pegado a un commit concreto. No es
una línea de trabajo paralela: es un marcador que dice *"esto exacto fue lo que
salió"*.

```
git tag -a v1.0 -m "Lo que se instaló en OX Glass el 2026-09-25 · build 423e62dc"
git push origin v1.0
```

A partir de ahí, en cualquier momento del futuro:

```
git checkout v1.0          # el código EXACTO que tiene ese cliente
```

Cuesta un minuto, no se mantiene sola y no hay que acordarse de nada. Y con el
`build` en el mensaje, la etiqueta se cruza con lo que la app enseña en su menú
de cuenta — que es lo que Jose puede pedirle a un cliente por teléfono.

**Además hay que anotar quién tiene qué.** Una tabla en `CUSTOMER-SETUP.md`:

| Cliente | Instalado | Versión | Build |
|---|---|---|---|
| OX Glass | 2026-09-25 | v12.13 | 423e62dc |

Sin esa tabla, ninguna rama ni etiqueta sirve de nada, porque no se sabe a qué
mirar.

---

## Por qué una rama `v1` de mantenimiento es mala idea HOY

Una rama de mantenimiento es esto: `v1` se queda quieta, `main` sigue avanzando,
y **cada arreglo hay que hacerlo dos veces** — o hacerlo en una y trasplantarlo a
la otra (`cherry-pick`), comprobando que no choque.

Eso se paga **en cada arreglo, para siempre**. Y se paga para comprar una cosa:
poder arreglarle algo a un cliente **sin darle las mejoras nuevas**.

**Hoy esa compra no tiene sentido:**

- **Hay un cliente, y es Jose.** No hay nadie a quien haya que proteger de una
  mejora.
- **Las mejoras son arreglos.** Las últimas tres versiones son fallos que él
  encontró en producción. Un cliente al que le "protegemos" de eso se queda con
  los fallos.
- **Nada se actualiza solo.** Aunque este repositorio avance, el cliente no se
  entera hasta que alguien le pegue el código. La rama no lo protege de nada,
  porque ya está protegido por el hecho de que nadie le toca su copia.
- **Dos ramas es el doble de suite.** 116 pruebas × 2, y la garantía de que un
  día el arreglo se aplica en una y se olvida en la otra. Ese fallo —una
  conducta puesta en un camino y no en los demás— es el que más veces ha
  aparecido en este proyecto.

---

## Cuándo SÍ hay que crear la rama

Cuando aparezca la primera de estas tres, y no antes:

1. **Un cliente que paga y al que no se le puede tocar la app cuando queramos** —
   porque está en temporada alta, o porque su gente ya aprendió una pantalla y
   cambiarla sin avisar cuesta soporte.
2. **Un cambio que rompe algo a propósito** — cambiar la forma de la hoja, quitar
   una función, renombrar una pestaña. Ahí sí hace falta dejar quieta la línea
   que los clientes tienen.
3. **Más clientes de los que caben en una tarde de actualizar a mano.** Con tres
   se actualiza a mano; con veinte, no.

Hasta entonces: **una sola línea de trabajo, una etiqueta por cada instalación,
y la tabla de quién tiene qué.**

---

## Entonces, ¿esto que estamos haciendo es v1 o v2?

**Esa es la pregunta importante, y la respuesta no depende de Git.** "v1" no es
una rama: es **la promesa que se le hace al primero que pague**. Por eso la regla
es de contenido, no de herramienta:

| Va en la **v1** | Va en la **v2** |
|---|---|
| Algo que está **roto o dice un dato equivocado** | Algo que **funciona y se puede hacer mejor** |
| El filtro de estado (enseña "In Stock" en material que no se puede sacar) | Los grupos de Incoming |
| El editor de columnas (v12.12 y v12.13 — rotos a la vista) | La ventana de Edit |
| Lo que prometa la landing y el producto no haga | Los anchos de las otras tablas |
| | Conteo cíclico, códigos de barras |

Con esa regla, lo de estos días:

- **v12.12 y v12.13 son v1.** Los dos eran fallos visibles, y uno lo metí yo.
- **La unión de Qty+Unit es v1 por poco**, porque hoy se puede esconder Unit y
  dejar la cantidad sin decir de qué — eso es un dato incompleto en pantalla.
- **Las etiquetas que salen siempre son v2.** Molesta, no miente.
- **Todo lo demás de `BACKLOG.md` es v2.**

---

## Qué hacer, en orden

1. **Ahora mismo:** nada. Seguir en `consolidado-v8.8`.
2. **El día de la primera instalación de pago:** `git tag -a v1.0`, empujarla, y
   anotar la fila en la tabla de clientes.
3. **Cada vez que se le pegue código nuevo a un cliente:** etiqueta nueva y fila
   nueva en la tabla.
4. **El día que aparezca una de las tres condiciones de arriba:** crear
   `v1-mantenimiento` a partir de la etiqueta correspondiente, y **decirlo aquí**
   con la fecha y el motivo.
