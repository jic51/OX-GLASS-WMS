# Soporte y devoluciones — cómo aplicarlo

> **El texto que obliga son los Términos** (`legal/TERMS-OF-SERVICE.md`,
> secciones 5 y 9), que es lo que el cliente acepta al marcar la casilla. Este
> documento es para Jose: la misma política en lenguaje de trabajo, con los
> casos que van a aparecer y qué contestar.
>
> Si los dos alguna vez dicen cosas distintas, **manda el de los Términos**, y
> hay que arreglar este. `tools/test-legal-sync.js` vigila que las tres copias
> del contrato (el `.md`, la app y la pestaña del Sheet) digan lo mismo; no
> puede vigilar este archivo.

---

## Por qué esto existe

Nada de esto se discute cuando el cliente está contento. Se discute cuando
está molesto, y para entonces ya es tarde para definirlo. Escrito de antemano,
la conversación es "esto es lo que acordamos"; sin escribir, es la palabra de
uno contra la del otro y siempre pierde el que vende.

---

## 1. El tiempo de respuesta: **un día hábil**

Jose preguntó si 2 o 3 horas era realista y profesional. **La respuesta es
no**, por tres razones concretas:

1. **Tienes un trabajo de tiempo completo.** Un correo que entra a las 10 de
   la mañana mientras descargas un camión no se contesta a las 12. Prometer 2
   horas es prometer algo que vas a incumplir en la primera semana.
2. **Prometer 2 horas y contestar en 9 es peor que prometer un día hábil y
   contestar en 3.** El mismo correo, la misma hora, y en un caso quedaste mal
   y en el otro quedaste bien. Lo único que cambió fue la promesa.
3. **Rompe el complemento que ya vendes.** El soporte prioritario cuesta
   +$20/mes y promete **4 horas hábiles**. Si el soporte base contesta en 2 o
   3, el complemento no vende nada — y un cliente que lo note tiene razón en
   sentirse vendido algo que ya tenía.

**Lo comprometido:** contestar en **un día hábil**, lunes a viernes, sin
feriados de EE. UU., hora de Montaña.

En la práctica vas a contestar mucho antes casi siempre. Eso es exactamente lo
que se busca: la promesa es el piso, no la expectativa.

**Y es responder, no resolver.** Los Términos lo dicen con esas palabras.
Nunca prometas cuánto tarda un arreglo; sí prometes que en un día hábil la
persona sabe qué está pasando y qué sigue.

---

## 2. Qué incluye el mensual

- **Todas las versiones nuevas**, mientras la licencia esté activa. No hay una
  versión superior que comprar después: las mejoras SON la suscripción.
- **Arreglos de errores y actualizaciones de seguridad.**
- **Preguntas de uso**, por correo.
- **Ayuda para leer sus propios datos** cuando algo no cuadra.

---

## 3. Qué NO incluye — y se cotiza aparte

Todo esto se cotiza **antes** de empezar. Nunca se cobra nada sin acuerdo
escrito previo.

| Trabajo | Por qué se cobra |
|---|---|
| Importar su histórico | Es trabajo de horas, distinto en cada cliente |
| Capacitación extra | La instalación incluye una sesión; las demás no |
| Cambios hechos a su medida | Un reporte o campo que solo esa empresa necesita |
| Recuperar datos que ellos borraron | Cuando se pueda |
| **Reparar una copia modificada** | El código es licenciado, no vendido — ver `LICENCIA-E-INTEGRIDAD.md`. Puedes **negarte** |
| Bodega adicional | Tiene su propio precio |

---

## 4. Devoluciones

### La instalación ($500) — decisión de Jose

- **Antes de hacerla: se devuelve completa.** Si se arrepienten antes de que
  instales, no hiciste nada y no cobras nada.
- **Una vez hecha: no se devuelve.** Es trabajo entregado — instalaste,
  configuraste sus categorías y racks, cargaste su equipo y capacitaste. Sigue
  siendo así aunque después cancelen la suscripción.

### El mensual ($49)

- **Cancelan dentro de 14 días de un cobro** → ese mes se devuelve completo.
- **Después de 14 días** → ese mes no se devuelve, y conservan soporte y
  versiones hasta que termine.
- **Anual ($490)** → se devuelven los **meses enteros que no han usado**. Los
  ya empezados no.
- **Si la culpa es nuestra** → si un defecto lo deja inservible y no lo
  arreglas en 30 días desde que lo reportaron, se devuelve el período completo
  sin importar las fechas. Nadie debe pagar un mes en el que no funcionó.

Las devoluciones se hacen por el mismo medio de pago, dentro de **10 días
hábiles** de acordadas.

> **Los 14 días, los meses enteros y los 30 días son propuesta mía**, no
> decisión de Jose. Él dijo "depende del caso y la fecha"; eso no se puede
> poner en un contrato, porque "depende" es lo que produce discusiones. Son
> números defendibles y aplicables igual con todos. Si quiere otros, se
> cambian en `legal/TERMS-OF-SERVICE.md` y se corre `node tools/sync-legal.js`.

---

## 5. Cuando dejan de pagar

**No se apaga nada.** Está en su cuenta de Google, no hay forma de apagarlo, y
no la usaríamos si la hubiera. Lo que se acaba es el soporte y las versiones
nuevas — no el software, y no el acceso a sus propios datos.

Eso ya estaba decidido (v10.8) y ahora está escrito en la sección 9 y en la 10.

---

## 6. Casos que van a aparecer, y qué contestar

**"Instalaste ayer y ya no lo quiero. Devuélvanme todo."**
El mensual sí (está dentro de 14 días). La instalación no: ese trabajo se hizo
y se entregó. Dilo así, sin rodeos, y ofrece ayudarles a exportar sus datos.

**"Llevo tres meses pagando y casi no lo uso."**
No hay devolución — el servicio estuvo disponible. Pero esto es un aviso de
que se van: es exactamente para lo que existe la alerta de check-in. Vale más
una llamada que los $49.

**"Se cayó una semana y no me contestaste."**
Si es un defecto nuestro y pasaron más de 30 días desde el reporte, se
devuelve el período. Si fue menos, no aplica, pero conviene preguntarse por
qué tardó tanto.

**"¿Me pueden importar mis 3 años de Excel?"**
Sí, y se cotiza aparte. Nunca lo incluyas "de cortesía" en la primera venta:
crea el precedente de que lo que cuesta horas es gratis.

**"Cambié una fórmula y ahora no abre."**
Reparar una copia modificada es trabajo cobrable, y puedes negarte. Ver
`LICENCIA-E-INTEGRIDAD.md`. La huella de integridad
(`node tools/build-fingerprint.js --check`) te dice si el archivo es el que
entregaste o no.

---

## 7. Lo que falta decidir

- **Facturación.** No hay proceso: cómo se cobra, con qué, y qué pasa si un
  pago falla. Los Términos dicen "según lo acordado por escrito al comprar",
  lo cual es correcto pero no es un proceso.
- **Un correo de bienvenida** que repita esto en dos frases. `WELCOME-EMAIL.md`
  existe pero no menciona soporte ni devoluciones.
- **Precio fundador.** Los primeros 3 clientes pagan $39 congelado. Falta
  escribir qué pasa si uno de ellos cancela y vuelve: ¿recupera el precio
  fundador? Yo diría que no.
