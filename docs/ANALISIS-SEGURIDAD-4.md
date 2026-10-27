# Análisis de seguridad de Acopio Pro — Parte 4: lo que Google puede cambiar debajo

Sigue de `ANALISIS-SEGURIDAD-3.md`. Esta parte es menos «seguridad» y más
**riesgo**: nada de lo que hay aquí es un agujero por el que entre nadie, pero
es lo que puede **apagar el producto de un día para otro** sin que hayamos
tocado una línea.

**De dónde salen los números.** De la página de cuotas de Google, consultada hoy
(27/10). Los repito aquí porque la página los cambia, y porque Google dice
literalmente que **pueden cambiar en cualquier momento y sin avisar**. Lo que
hay abajo es la foto de hoy, no una promesa.

| Límite | Cuenta normal (`@gmail.com`) | Google Workspace |
|---|---|---|
| **Tiempo por ejecución** | **6 min** | **6 min — el mismo** |
| Tiempo total de disparadores al día | **90 min** | **6 h** |
| Llamadas a internet al día | 20.000 | 100.000 |
| Ejecuciones a la vez | 30 por usuario | lo mismo (1.000 por script) |

---

## RESUMEN

| | Qué | Gravedad |
|---|---|---|
| 🟠 | **Todas las cuotas las paga UNA cuenta** — la del administrador — y las gasta el almacén entero | media |
| 🟠 | La app manda 14 clases de correo y **nunca pregunta cuántos le quedan** | media |
| 🟠 | Un administrador con Gmail personal tiene **90 minutos de disparadores al día**; con Workspace, 6 horas | media |
| 🟡 | Los **6 minutos son iguales en Workspace** — no hay forma de pagar para salir de ahí | baja |
| ⚪ | Google puede cambiar cualquiera de estos números sin avisar. Lo que nos salva no es técnico | — |

---

## 1 · 🟠 H-18 · Todas las cuotas las paga UNA cuenta, y las gasta el almacén entero

**Esto es lo que organiza toda la Parte 4, así que conviene decirlo primero y
claro.**

El manifiesto despliega con `executeAs: USER_DEPLOYING`. Eso significa que
**cada clic de cada bodeguero se ejecuta como el administrador**. No es un
detalle de permisos: es que **las cuotas de Google son por usuario**, y en esta
app ese usuario es siempre el mismo.

Traducido:

- Los **30 ejecuciones a la vez** no son 30 por persona: son 30 **para toda la
  empresa**. Un almacén con doce personas trabajando a la vez, cada una con la
  app abierta refrescando, va mucho más cerca de ese número de lo que parece.
- Los **90 minutos de disparadores al día** —en una cuenta normal— los comparten
  el respaldo nocturno, el archivado, el reporte diario y el aviso de instalación
  parada. **Cuatro disparadores, una bolsa.**
- Y el que se queda sin cuota **no es el que la gastó**: es el almacén entero,
  hasta el día siguiente.

**El código ya sabe esto**, y está escrito en `throttle_`: *"quota is per-owner
and shared by every real user: exhausting it takes the warehouse offline for
everybody. That is the failure this guards against, not data theft."* El
limitador de peticiones existe por eso. **Lo que falta no es la defensa: es
verlo venir.**

**Lo que yo haría:** que **🩺 Check this installation** enseñe lo que se está
gastando —ejecuciones del día, minutos de disparadores, correos enviados— igual
que ya enseña el espacio. El mismo razonamiento que funcionó con las 10M celdas:
**convertir un techo invisible en uno que se ve con meses de antelación.**

---

## 2 · 🟠 H-19 · La app manda 14 clases de correo y nunca pregunta cuántos le quedan

**Medido:** 14 sitios llaman a `MailApp.sendEmail`. **Cero** llaman a
`MailApp.getRemainingDailyQuota()`. La app no sabe nunca cuánto le queda.

**El límite de correos de Apps Script no está en la tabla de arriba porque es
otra cuota**, y es la estrecha: del orden de **100 destinatarios al día en una
cuenta normal** frente a 1.500 en Workspace. Cuando se acaba, `sendEmail` falla
— y varios de los sitios que lo llaman están dentro de un `try/catch` que se lo
traga a propósito, con buen criterio, para que un aviso fallido no tumbe la
operación que lo provocó.

**Y aquí está lo serio, que no es el correo: es lo que descansa sobre el
correo.** La limpieza de la papelera a los 30 días se decidió el 26/10 con este
razonamiento, que es bueno:

> *"La app le enviará un correo y una tarjeta al usuario a los 15, a los 25, a
> los 28, a los 29 y finalmente a los 30 días... así nos eliminamos el
> compromiso de mantener cosas que el cliente no quiere y la responsabilidad
> cae sobre él."*

**Ese argumento sólo vale si los correos llegan.** Si el día 29 la cuenta se
quedó sin cuota, el borrado automático ocurre igual y el cliente **no recibió el
último aviso** — y la frase «se lo avisamos cinco veces» deja de ser verdad
justo en el caso en que hace falta que lo sea. Son cinco correos por movimiento
caducado, en una cuenta que quizá tenga cien al día para todo.

**Lo que yo haría, y son dos cosas pequeñas:**

1. **Preguntar antes de mandar.** `getRemainingDailyQuota()` existe. Si quedan
   pocos, **mandar un solo correo con todo lo que caduca** en vez de uno por
   movimiento — que además es lo que ya había que hacer por otra razón, porque
   cinco correos al día nadie los lee.
2. **No borrar lo que no se pudo avisar.** Si el aviso del día 30 no salió, el
   borrado espera. Es una línea y es la que hace honesto todo el argumento.

---

## 3 · 🟠 H-20 · Gmail personal: 90 minutos de disparadores al día. Workspace: 6 horas

Es **cuatro veces menos**, sobre un recurso que comparte la instalación entera
(§ 1), y afecta justo a lo que corre de noche sin que nadie lo mire: el respaldo
y el archivado.

**Por qué importa de verdad:** un respaldo de una hoja grande tarda minutos, y
el archivado también. Cuatro disparadores diarios en una instalación cargada
pueden acercarse a los 90 minutos **sin que nadie se entere**, porque lo que
falla de noche falla en silencio. El respaldo diario sí avisa por correo cuando
falla — pero ese aviso es un correo, y el correo es la cuota del § 2.

**Y se junta con lo que ya estaba escrito en `SI-SE-VA-EL-ADMINISTRADOR.md`:**
un administrador con Gmail personal es el caso en que **no se puede transferir
la propiedad** si se va de la empresa. Son dos problemas distintos con la misma
causa y **la misma frase los arregla los dos**:

> **Instálalo desde una cuenta de empresa (Google Workspace), no desde un Gmail
> personal.** Con Workspace la empresa puede recuperar el sistema si quien lo
> montó se va, y la app tiene cuatro veces más margen para sus tareas de la
> noche.

Hoy la guía no lo dice. **Es texto, y cubre los dos.**

---

## 4 · 🟡 H-21 · Los seis minutos son iguales en Workspace. No hay forma de pagar para salir

Lo comprobé porque **se repite mucho lo contrario** —que Workspace da 30
minutos— y es falso hoy: **6 minutos por ejecución en los dos casos.**

**Por qué conviene tenerlo escrito y no de memoria:** es la diferencia entre
«cuando el cliente crezca, que pague Workspace» y la verdad, que es **todo lo
que procese muchas filas tiene que poder reanudarse, y punto**. No hay salida
comercial a ese límite.

La app ya lo hace bien en algún sitio —`menuRevokePublicSharing` se da un
presupuesto de 4,5 minutos y dice «vuelve a pulsarlo»— y **lo va a necesitar en
serio** en el cierre de período de `CUANDO-SE-LLENE-EL-SHEET.md`: mover 100.000
filas no cabe en una ejecución y nunca va a caber.

---

## 5 · ⚪ LO QUE NOS SALVA SI GOOGLE CAMBIA LAS REGLAS NO ES TÉCNICO

Google dice, en su propia página, que estos números **pueden cambiar en
cualquier momento y sin avisar**. Y hay más cosas suyas de las que dependemos y
que no controlamos: la pantalla de «Google no ha verificado esta aplicación»,
las reglas del Marketplace y la auditoría CASA (Parte 2, § 8), y el propio
Apps Script.

**No hay defensa técnica contra eso, y conviene no fingir que la hay.** Lo que
sí hay es una propiedad del diseño que conviene no perder nunca:

> **Todo se deriva de un registro que sólo crece.** El stock no se escribe, no
> hay fórmulas, y cada pantalla se reconstruye del mismo sitio. El día que haya
> que irse de Sheets, **lo que se migra es el registro** — y lo de arriba se
> vuelve a construir. Es un cambio de almacenamiento, no un rediseño.

Esa frase es la respuesta honesta a *«¿y si Google cierra esto?»*, y es la misma
que ya se usó para contestar a un programador en Reddit. **Que siga siendo
verdad es una decisión que se toma cada vez que alguien tiene la tentación de
guardar un total en una celda.**

---

## FIN DEL ANÁLISIS DE SEGURIDAD

Las cuatro partes están hechas:

| Parte | Qué cubrió |
|---|---|
| **1** | La superficie expuesta, quién decide la identidad, inyección de HTML, secretos |
| **2** | Los permisos de Google, quién abre un documento, los respaldos, adónde sale la app |
| **3** | El inicio de sesión, el token, quitar el acceso, los registros |
| **4** | Las cuotas y lo que Google puede cambiar debajo |

**21 hallazgos** en `HALLAZGOS.md`, con gravedad y motivo. Lo que queda del
encargo del 26/10 es **el análisis estructural**, que es la otra mitad.

### Lo que necesita a Jose, y por qué no lo puedo hacer yo

1. **Medir `ALLOWALL`** (H-06) en una copia de pruebas — el riesgo de tocarlo lo
   paga un cliente que no puede entrar.
2. **Decidir el cliente OAuth por instalación** (H-11) — es un paso más, feo, en
   la instalación.
3. **Mirar cuánto tarda de verdad el respaldo nocturno** (H-20): en el registro
   de ejecuciones de Apps Script, sumar lo que gastan los cuatro disparadores un
   día normal. Es el único número de esta parte que no se puede sacar leyendo el
   código.
