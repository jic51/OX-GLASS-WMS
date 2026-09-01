# Guion de la prueba de concurrencia

**Para Jose. Documento interno — no se publica.**

Esto cierra dos hallazgos abiertos de la auditoría (el 5 y el 8) y es lo único
que bloquea el rediseño del modelo de movimientos. No se puede hacer solo desde
el código: hay que provocar el choque de verdad.

---

## Lo que hace falta

**Tres cuentas de Google distintas y tres navegadores separados.** Eso es todo.

No hacen falta tres personas. Hacen falta tres **sesiones**, y las puedes tener
tú solo:

- tu cuenta normal, en Chrome;
- una segunda cuenta tuya, en una ventana de incógnito de Chrome;
- una tercera, en Firefox o Edge.

Si consigues gente, mejor —tres teléfonos es más fiel a la realidad— pero **no
esperes por ellos**. Llevas semanas esperando y esta prueba se hace en veinte
minutos.

Las tres cuentas tienen que estar dadas de alta en la app, con permiso para
sacar material.

---

## Antes de empezar

1. Elige un material real y anota su cantidad exacta. Escríbela **en papel**.
2. Con `Adjust`, déjalo en **1 unidad** en un solo estante.
3. Verifica en las tres sesiones que las tres ven `1`.
4. Ten el teléfono listo para capturar pantalla. Un fallo intermitente sin
   captura es imposible de perseguir después.

> **Ojo:** haz esto con un material de prueba, no con uno que la bodega esté
> usando hoy. Al final vas a tener que corregir la cantidad a mano.

---

## Prueba 1 — dos personas sacan la última unidad

**Esta es la importante.** Es el hallazgo 5.

1. En las tres sesiones, abre `Exit` con ese material y cantidad **1**.
2. Deja las tres pantallas listas, con el botón de guardar a la vista.
3. Cuenta en voz alta: tres, dos, uno — y **pulsa guardar en las tres a la vez**.

**Lo correcto:** una pasa. Las otras dos reciben un error claro que diga que no
hay suficiente. La cantidad queda en **0**.

**Lo malo:** pasan dos o tres. La cantidad queda en **−1** o **−2**.

Anota qué pasó y captura las tres pantallas.

**Repítelo cinco veces.** Es lo que hace útil esta prueba: un choque no se da
todas las veces, depende de milésimas. Si de cinco intentos **una sola vez**
pasan dos, está confirmado y hay que arreglarlo.

Entre intento e intento, vuelve a dejar el material en 1 con `Adjust`.

---

## Prueba 2 — dos movimientos del mismo material a la vez

Esto es el hallazgo 8: si todas las funciones que convierten movimientos en
existencias entienden lo que las otras hacen.

1. Deja el material en **10**.
2. Sesión A: prepara un `Entry` de **5** al mismo estante.
3. Sesión B: prepara un `Exit` de **3** desde ese estante.
4. Guarda las dos a la vez.

**Lo correcto:** 10 + 5 − 3 = **12**.

**Lo malo:** cualquier otro número. Sobre todo 15 o 7, que significan que uno de
los dos movimientos se calculó sobre una foto vieja y pisó al otro.

Repítelo tres veces.

---

## Prueba 3 — un ajuste mientras alguien registra

1. Deja el material en **10**.
2. Sesión A: prepara un `Adjust` diciendo que contaste **20**.
3. Sesión B: prepara un `Entry` de **5**.
4. Guarda las dos a la vez.

Aquí **no hay un único resultado correcto** y por eso vale la pena: depende de
cuál gane. Lo que importa es que el número final sea **explicable** mirando el
historial, y que el historial muestre los dos movimientos. Un número que no se
puede reconstruir con lo que quedó escrito es el fallo.

Anota el número y las dos filas del historial.

---

## Qué anotar en cada intento

| | |
|---|---|
| Prueba | 1, 2 o 3 |
| Intento | 1 de 5, 2 de 5… |
| Cantidad antes | del papel |
| Qué pulsó cada sesión | y a qué hora |
| Cuáles pasaron | y cuáles dieron error |
| El texto exacto del error | si lo hubo |
| Cantidad después | |
| Cantidad esperada | |
| Capturas | de las tres pantallas |

Mándame la hoja tal cual, aunque salga todo bien. **Un resultado limpio también
sirve** — cierra los dos hallazgos y desbloquea el rediseño.

---

## Al terminar

1. Corrige la cantidad del material de prueba con `Adjust`, hasta lo que dice tu
   papel.
2. Revisa el historial y comprueba que no quedó ningún movimiento raro.
3. Si algo quedó en negativo, **déjalo así y avísame**. El número en negativo es
   la evidencia; corregirlo antes de que yo lo vea la borra.

---

## Por qué esto no se puede probar desde el código

`tools/test-concurrency.js` ya existe y pasa. Lo que prueba es que **hay** un
candado y que la lógica de dentro es correcta.

Lo que no puede probar es si el candado abarca lo suficiente: si dos peticiones
que llegan a Apps Script con dos milésimas de diferencia leen la misma foto del
inventario antes de que ninguna escriba. Eso depende de cómo Google reparte las
ejecuciones, y solo se sabe provocándolo.

Es la misma razón por la que la auditoría dejó los hallazgos 5 y 8 abiertos en
vez de darlos por buenos: **una revisión que solo lee el código no puede
declarar segura una carrera.** Puede decir que el candado está puesto; no puede
decir que llegue a tiempo.
