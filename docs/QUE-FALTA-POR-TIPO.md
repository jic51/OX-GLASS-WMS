# Qué falta, por tipo — y qué es indispensable ahora

Jose, 2026-10-13: *"¿Algo de eso que dices es urgente o muy importante? ¿Qué más
hay en la lista? De todas las cosas que te he dicho y que pusimos en la lista
(que deben ser muchas), ¿cuáles son indispensables ahora? ¿Cuáles son de
interfaz? ¿Cuáles de visualización? ¿Cuáles de manejo de datos? ¿Cuáles de
seguridad? ¿Cuáles hacen la app mejor (más rápida, más atractiva, mejor)?"*

Leído de `BACKLOG.md`, `ANTES-DE-VENDER.md`, `SEGURIDAD-ESTADO.md`,
`LO-QUE-FALTA-EN-LA-APP.md` y `LISTA-DE-LA-V2.md`, y **comprobado en el código**
donde se podía. Esto último importa: cuatro entradas estaban dadas por abiertas
y ya estaban hechas, y se han corregido al escribir esto.

**Este documento no se publica.** Nombra los huecos de seguridad que siguen
abiertos, y ésa es la única cosa del proyecto que no debe salir de aquí.

---

## LA RESPUESTA CORTA A LO PRIMERO

**Nada de lo estético es urgente ni importante.** Los pesos de letra, el
espaciado interletra, las 230 longitudes que quedan, las ventanas y ajustes, el
`border:none` del botón principal: todo eso puede esperar meses sin que pase
nada. Son deuda ordenada, y lo que las tres últimas tandas compraron no es
belleza, es que el próximo cambio sea barato.

Lo llamé «lo que queda» y eso sonó a lista de pendientes. Es más honesto
llamarlo **lo que podría hacerse cuando no haya nada mejor que hacer**, y ahora
mismo hay bastantes cosas mejores.

---

## 1 · INDISPENSABLE AHORA — y son cuatro, no cuarenta

Indispensable quiere decir una cosa concreta: **sin esto no se le puede cobrar a
la primera persona**, o se le puede cobrar y sale mal.

### 1.1 🔴 La comprobación de un minuto del acceso — EMPIEZA POR AQUÍ

Que alguien con un **Gmail personal**, fuera de `@ox-glass.com` y fuera de la
lista de usuarios de prueba, entre de verdad.

Por qué es la primera: si el consent screen quedó en *Testing*, la gente de un
cliente nuevo **queda bloqueada, no avisada** — ven *"Access blocked… is
currently being tested"*. Y que OX lleve meses sin problemas **no prueba nada**,
porque la gente del dominio entra por la puerta automática, que no toca el
cliente OAuth.

Un minuto de trabajo contra el riesgo de que el primer cliente no pueda entrar.
Es la mejor relación de toda la lista. Jose dice que lo publicó el 29/09; esto
sólo lo confirma desde fuera.

### 1.2 🔴 El ensayo de restauración, del paso 3 en adelante — Jose

Lo pendiente de más consecuencia que queda, y **la única cosa que ninguna prueba
automática puede sustituir**. Pasos 0, 1 y 2 confirmados en producción. Del 3 en
adelante no se ha hecho nunca de principio a fin: recuperar la copia, pegarle
las propiedades, republicar, y comprobar que **los adjuntos abren**.

*Un backup que nunca se restauró no es un backup; es un archivo.*

Y ya hay precedente de que esto encuentra cosas: el simulacro de Jose en la
v11.13 descubrió que `writeConfigSnapshot_` **nunca había funcionado en
producción** —abría la copia con un permiso que el manifiesto no concede y el
error se tragaba en un `Logger.log` que nadie lee—, así que de la v9.97 a la
v11.13 todos los backups salieron con los datos, sin los ajustes, y **con
aspecto perfectamente sano**.

### 1.3 🔴 La plantilla maestra limpia — Jose

Las herramientas están desde la v9.30. Falta lo que sólo él puede hacer:
renombrar el proyecto de Apps Script, compartir como Viewer, generar el enlace
`/copy`, y **copiarla él mismo una vez para ver lo que ve un cliente**. Sin
esto no hay nada que entregar.

### 1.4 🔴 Stripe — Jose

Decidido desde el 22/09: Stripe desde el día 1. Falta configurarlo. Y lo
importante: **para los primeros clientes no hace falta escribir código** — un
Payment Link cobra sin que Acopio se entere. Conectar el pago con la app (apagarla
si dejan de pagar) es un proyecto aparte y **no** bloquea la primera venta.

> **Tres de los cuatro son de Jose, no míos.** Eso es lo que de verdad dice esta
> sección: lo que bloquea cobrar no es código que falte, es media tarde de él.

---

## 2 · SEGURIDAD

De los siete huecos que listaba `SEGURIDAD-ESTADO.md` el 05/10, tres se cerraron
(v12.39, v12.40, v12.41). Quedan cuatro, y **sólo uno lo llamaría importante**.

### 2.1 🟠 IMPORTANTE — seis puertas sin tope de llamadas

**Comprobado hoy, función por función:** `getIncoming`, `addIncoming`,
`updateIncoming`, `deleteIncoming`, `getMonitoredMaterials` y `getSetupState`
comprueban identidad pero **no tienen ni un `requireQuota_` ni un `throttle_`**.
`processMovement` y `getInitialData` sí los tienen.

No permiten hacer nada indebido. Permiten **agotar la cuota diaria de Apps
Script de la instalación**, y eso deja la app muerta para todos hasta el día
siguiente. Es una denegación de servicio barata, y la puede causar sin querer
una pestaña olvidada en un bucle.

**Es pequeño, es mío, y lo puedo hacer en una tanda.** Es lo único de seguridad
que yo movería antes que cualquier otra cosa de este documento.

### 2.2 🟡 `getSetupState` sin identidad

Es la única que corre sin identidad, y por necesidad: hay que poder preguntar
«¿esto está configurado?» antes de que exista nadie. Falta **revisar qué
devuelve exactamente** cuando no hay instalación, y que no sea más de lo
imprescindible. Pequeño, y va junto con 2.1.

### 2.3 🟡 No hay forma de matar un token robado

Quitar a alguien de `USERS_V3` ya le deja fuera en su siguiente llamada (eso se
arregló en la v12.39). Lo que no hay es forma de invalidar un token **robado** de
alguien que sigue siendo legítimo. Hace falta un botón de *«cerrar todas las
sesiones»* que rote `SESSION_SECRET`. Mediano.

### 2.4 🟡 El registro de errores puede llevar datos del cliente

`logError_` guarda el mensaje, y los mensajes se construyen con lo que causó el
fallo (*"cannot save SUNBRIDGE PHASE 1"*). Hoy **no es una fuga**: se queda en
una pestaña del propio cliente. Se convierte en fuga **el día que mandemos
errores a un panel nuestro**, y hay que limpiarlo antes de que ese panel exista,
no después.

### 2.5 🔵 Decisiones de Jose, no código

- **Treinta días de sesión sin reidentificarse.** Para un almacén quizá está
  bien, pero hay que decidirlo a propósito y escribirlo, no heredarlo.
- **Rotar las dos claves que pegaste en el chat** (`OAUTH_CLIENT_SECRET` y
  `GEMINI_API_KEY`). Lo aplazaste y sigue aplazado; queda escrito.

### 2.6 ✅ Lo que no es un agujero y lo parece

El código es visible para el cliente (es su Apps Script), la hoja es la base de
datos (quien puede abrir la hoja ve los datos — eso es Drive), y el aviso de
«app no verificada» al instalar es la pantalla normal de Google.

---

## 3 · MANEJO DE DATOS

Es la familia donde está **lo más importante que no bloquea la venta**.

### 3.1 🔴 Movimientos sin ID — y la causa sigue sin saberse

Falta el aviso en la app, y sobre todo falta **saber por qué pasó**. Depende de
que Jose mire un backup del 25/09. Lo pongo primero de esta sección porque un
dato sin identificador es el único tipo de fallo que no se arregla después: no se
sabe a qué fila volver.

### 3.2 🔴 AUDIT_LOG dentro de la app

**Es el único dato de peso que obliga a abrir la hoja**, y por tanto lo único
que hoy incumple tu propia regla —*"el cliente no debe ir al sheet nunca"*—.

Hoy, dentro de la app, no hay respuesta a: ¿quién **borró** este movimiento y
qué decía? ¿Quién **editó** esta cantidad y qué ponía antes? ¿Quién dio de alta
o quitó a este usuario? ¿Qué accesos se rechazaron?

Quién *grabó* un movimiento sí se ve. Quién lo **cambió o lo quitó después** no
—y eso es justo lo que se pregunta cuando algo no cuadra—.

### 3.3 🟠 La prueba de concurrencia EN VIVO

Tres o cuatro navegadores contra una copia desplegada, guardando del mismo
material a la vez, y contar a mano. **Ningún test desde fuera puede
sustituirla.** Los pasos 1 y 2 están aplicados (v10.0, v10.4) y quedan dos
caminos casi simbólicos; lo que falta es la prueba con gente.

### 3.4 🟠 El techo de seis minutos de Apps Script

Una importación grande o una reconstrucción de stock podría chocar contra él.
**No probado.** El motor de stock ya se midió y es lineal (`test-scale.js`), así
que el sospechoso es la lectura y escritura de Sheets, no el cálculo. Va junto
con **archivar por tandas** y **archivar por tamaño y no por calendario**, que
son la protección para cuando el archivo sea grande.

### 3.5 🟠 Estandarizar las columnas — faltan Incoming y Project View

`COL_TABLES` sólo tiene dos miembros, `stock` y `mov`. Movements y Dashboard
están hechos, con `test-columnas.js` midiendo la x de cada columna con siete
filtros. Las otras dos tablas no.

### 3.6 🟠 Lo que pide un comprador con experiencia

- **Conteo cíclico.** Diseñado, sin construir. Todo sistema de inventario serio
  lo tiene y es la primera pregunta de un comprador que sabe.
- **Códigos de barras / QR.** La otra primera pregunta, y lo que sostiene subir
  el precio a $59–$69.
- **El conteo físico** (`LO-QUE-FALTA-EN-LA-APP.md` 3.5): hoy no hay dónde meter
  el resultado de contar la bodega a mano. Grande, y es la pantalla que convierte
  Acopio en el sistema de verdad de la bodega. Después de las demás.

### 3.7 🟡 Más pequeño

Dependencias de materiales al fusionar · abrir un movimiento nuevo con los datos
de otro · pausar el mantenimiento nocturno · la versión en los otros tres
trabajos automáticos · el rótulo de `ARCHIVE_START`.

---

## 4 · VISUALIZACIÓN — lo que se mira, se lee y no existe

**No tenemos ningún informe.** Lo único que hay es *descargar los datos*, que no
es un informe, es un CSV. Es la familia más vacía de todas y la que más valor
tiene por hora de trabajo, porque **los datos ya están**.

Por orden de lo que yo haría:

1. 🔴 **Valor del inventario ahora** — total, por categoría y por ubicación.
   **Pequeño**: `UNIT_COST`, `TOTAL_COST` y el interruptor `canSeeCosts` ya
   existen. Es lo primero que pide quien lleva las cuentas, y hoy no hay
   respuesta ni en la app ni en la hoja.
2. 🔴 **Avisar al guardar cuando algo baja del mínimo.** El Low-Stock Monitor ya
   existe pero sólo avisa en el Dashboard — enterarse cuando ya se lo han
   llevado llega tarde. Pequeño, y se nota el mismo día.
3. 🔴 **El recibo de entrega** (*delivery slip*). Hoy, cuando alguien se lleva
   material, **no queda nada en papel ni en PDF**: el que se lo lleva no firma
   nada y el de bodega no se queda con nada. El sistema de Excel del vídeo sí lo
   tiene. Mediano, y la parte de imprimir ya existe para las etiquetas.
4. 🟠 **El informe de reposición** — lo que está bajo mínimo, cuánto falta, qué
   proveedor lo trae y cuándo se compró por última vez. Eso es una orden de
   compra a medio escribir.
5. 🟠 **Lo que no se mueve** — *"¿qué lleva seis meses parado?"*. En una bodega
   de vidrio eso es sitio ocupado y dinero quieto. Pequeño: la fecha del último
   movimiento ya está en los datos.
6. 🟠 **Consumo y desperdicio por proyecto y periodo** — hoy el desperdicio es el
   total de siempre, que no sirve para cerrar un mes. Es lo que se factura.

Y lo que **no** haría: una pestaña por informe. Siete pestañas arriba convierten
una app que se entiende en un menú que hay que estudiar. **Una sola pestaña
Reports** con una lista dentro y cada informe con su rango de fechas.

**Una pregunta antes de construir cualquiera de los seis:** puede que quien lleve
las cuentas en OX Glass no quiera una pantalla, sino **el informe por correo el
día 1 de cada mes**. Eso es más barato y probablemente más útil — pero no lo sé,
y hay que preguntárselo.

### 4.1 Más pequeño, de visualización

- Las columnas escondidas, en gris opaco y no transparentes.
- Raw Loc y las columnas de diagnóstico, al soporte y fuera de la vista.
- Incoming agrupado por fecha.
- 🟠 **Una prueba de navegador a un zoom que no sea el 100 %.** Jose trabaja al
  157 % y ahí hay una clase de fallos que desde aquí no se ven. Esta no es
  cosmética: es una prueba que falta.

---

## 5 · INTERFAZ — lo que se toca y se pulsa

### 5.1 🟠 El changelog no se enseña en la app

Escribimos dos por versión —inglés y español—, los publicamos, y dentro de la
app hay **cero** enlaces que lleven ahí: **un cliente nunca se entera de lo que
mejora**. Es el que más desproporción tiene entre lo que cuesta y lo que vale,
porque el soporte mensual se justifica con esto.

*What's new* en el menú de la cuenta, con punto de novedad cuando `APP_VERSION`
cambie. **Antes hay que decidir** si abre la web o si el texto viaja dentro del
archivo: lo segundo funciona sin internet y no manda a nadie fuera, pero hay que
llevarlo dentro.

### 5.2 Lo pequeño, todo junto

La categoría empieza vacía · los dos botones de Incoming pegados arriba ·
sugerencias de PM en Edit Movement y Edit Receiving · los dos indicadores de
espera de la papelera · la columna DOC (dos al lado y una flecha, en vez de
apilarse) · las etiquetas no se pueden apagar · el aviso de offline debajo de
las pestañas · la lista de avisos agrupada como la de Google · el logo de Acopio
en los dos sitios de marca con el bloque entero como enlace · repasar el menú
🏭 Acopio (qué de eso le sirve al cliente) · menú hamburguesa en pantallas
pequeñas · el salto pequeño al cargar más (esperando tu vídeo).

### 5.3 La segunda mitad de una entrada ya arreglada

El cartel de reservas se arregló (v12.59), pero la entrada pedía dos cosas:
también **repasar todos los botones que llaman al servidor**, para que ninguno
suponga la causa de lo que salió mal. Se arregló el que grabaste, no la clase
entera.

---

## 6 · LO QUE HACE LA APP MEJOR

Separado en las tres cosas que preguntas, porque no son la misma.

### 6.1 Más rápida

Casi todo está hecho y medido: guardar pasó de once segundos a inmediato, y
borrar trece movimientos de dos minutos y medio a cincuenta y cinco segundos.

Lo que queda de velocidad **no es velocidad, es techo**: el límite de seis
minutos (3.4), archivar por tandas y archivar por tamaño en vez de por
calendario. No se nota hoy; se nota el día que una instalación sea grande.

### 6.2 Más atractiva

Todo lo estético, y **nada de ello es urgente**: los pesos de letra (197 usos,
0 % por token), el espaciado interletra (39 usos, 0 %), las 230 longitudes de
espaciado que sí se mueven —ya con el arnés de medida hecho para ellas—, las
ventanas y ajustes (268 declaraciones de letra a pelo, donde viven también los
diez tamaños de letra de las píldoras) y el `border:none` del `.btn` principal,
que deja un Save azul 2 px desalineado con un Cancel gris.

También de aquí: iconos profesionales y logo definitivo, y los 80 ms de `hover`
que proponen los reels y que hoy no tenemos decididos.

### 6.3 Mejor de verdad — y ésta mueve el negocio, no el producto

**Plantillas por industria.** Baja la instalación de tres horas a una, y por lo
tanto **multiplica cuántos clientes caben antes de tener que contratar a
alguien**. Es la primera del orden que tú mismo fijaste en la v10.9, y sigue
siendo la que más mueve la aguja de todo este documento — más que cualquier
informe y más que cualquier arreglo.

Detrás, en tu propio orden: el botón de correo en la alerta de stock bajo,
códigos de barras y etiquetas, y el conteo cíclico.

---

## 7 · ESPERANDO UNA DECISIÓN TUYA, NO CÓDIGO

- Panel de clientes: ¿camino A o B?
- ¿De qué proyecto de Cloud cuelga la copia del cliente? (con la comprobación
  previa: copiar una hoja y leer qué dice en ⚙️ Configuración del proyecto)
- Stripe (ver 1.4) · plantilla maestra y ensayo de restauración (1.2, 1.3)
- El correo diario con secciones elegibles — **a favor**, con dos reglas: una
  sección sin nada que decir no se imprime, y un solo cálculo para el correo, la
  pantalla y la descarga.
- Un chat dentro de la app — se puede, pero Google Chat es de Workspace y no
  serviría para clientes con Gmail personal. Yo lo haría dentro de Acopio con el
  latido que ya existe, en la v2 y detrás de los informes.
- Permisos por persona (decidido el 05/10, va después de la guardia de escritura)
- Pulsar **Verificar** en Search Console, ahora que la etiqueta está publicada
- Medir Core Web Vitals en `pagespeed.web.dev`
- Preguntar a quien lleve las cuentas en OX Glass: ¿pantalla o correo el día 1?
- Medir las horas de soporte reales por cliente (aplazado hasta que haya clientes)
- Rotar las dos claves del chat (aplazado por ti)

---

## 8 · SI ME HICIERAS ELEGIR CINCO COSAS Y NADA MÁS

1. **La comprobación de un minuto del Gmail personal** (1.1). Un minuto.
2. **Los topes de las seis puertas** (2.1). Mío, pequeño, y es el único hueco de
   seguridad que llamaría importante.
3. **El ensayo de restauración del paso 3 en adelante** (1.2). Tuyo, y es lo de
   más consecuencia de toda la lista.
4. **El valor del inventario ahora** (4.1). Pequeño, los datos están, y es lo
   primero que pide quien lleva las cuentas.
5. **Plantillas por industria** (6.3). La que de verdad cambia el negocio.

Lo estético no está entre las cinco, ni entre las quince.
