# Prueba de la instalación de un clic — pasos

**20 minutos.** Contesta las cuatro cosas de las que depende la versión gratis.

> **LO MÁS IMPORTANTE DE ESTA PÁGINA:** la parte que de verdad importa se prueba
> **DESDE UNA SEGUNDA CUENTA DE GOOGLE**, no desde la tuya. Tú eres el dueño del
> original: Google ya te conoce y te enseña una pantalla distinta —o ninguna— de
> la que ve un desconocido. Probarlo con tu cuenta y dar el resultado por bueno
> es el error que haría inútil toda la prueba.
>
> Sirve cualquier segunda cuenta: una personal, la de tu mujer, una nueva de
> gmail hecha para esto.

---

## PARTE A — montar el original (con tu cuenta)

### A1. Hoja nueva

Entra a [sheets.new](https://sheets.new). Llámala **PRUEBA 1 CLIC**.

Escribe en la fila 1, para que la fila que escriba la prueba tenga encabezados:

| A1 | B1 | C1 |
|---|---|---|
| `Cuándo` | `Versión` | `Texto` |

### A2. Abrir el editor de scripts

**Extensiones → Apps Script.** Se abre en otra pestaña.

### A3. El código

Borra todo lo que haya en `Código.gs` y pega **`Codigo.gs`** de esta carpeta.

### A4. El panel

Botón **+** junto a *Archivos* → **HTML**. Llámalo exactamente **`Panel`**
(Google le pone `.html` solo). Borra lo que trae y pega **`Panel.html`**.

> El nombre tiene que ser `Panel` porque el código pide
> `createHtmlOutputFromFile('Panel')`. Si no coincide, da error al abrir.

### A5. Los permisos — este paso es el que mide todo

⚙️ **Configuración del proyecto** (izquierda) → marca
**«Mostrar el archivo de manifiesto appsscript.json en el editor»**.

Vuelve al editor. Ahora aparece `appsscript.json`. Ábrelo, **borra todo** y pega
**`appsscript.json`** de esta carpeta.

> Declara dos permisos y nada más. **Si algún día añades a este archivo de
> prueba una línea que use `DriveApp`, `Session.getActiveUser`, `MailApp` o
> `UrlFetchApp`, Google añade su permiso solo y la prueba deja de medir lo que
> dice medir.**

Guarda (💾).

### A6. Comprobación rápida, todavía con tu cuenta

Vuelve a la hoja y **recárgala**. Arriba tiene que salir el menú **🧪 Prueba**.

- ✅ Sale → el menú funciona sin autorizar. **Ésa es la pregunta 3.**
- ❌ No sale → para aquí y dímelo. Sin menú no hay por dónde entrar.

---

## PARTE B — la prueba de verdad (con la SEGUNDA cuenta)

### B1. Preparar el enlace de copia

En la hoja: **Compartir** → **Acceso general** → *Cualquier persona con el
enlace* → **Lector** → **Copiar enlace**.

Pega el enlace en algún sitio y **cambia el final**:

```
.../edit?usp=sharing     ← lo que te da Google
.../copy                 ← cámbialo a esto
```

O sea, borra desde `/edit` hasta el final y escribe `/copy`.

### B2. Cerrar sesión de verdad

Abre una **ventana de incógnito** y entra con la **segunda cuenta**. No basta
con cambiar de cuenta en la misma ventana: Google arrastra sesiones y acabarías
probando con la tuya sin darte cuenta.

### B3. El momento de la verdad

Pega el enlace `/copy` en la ventana de incógnito.

**📸 FOTO 1** — la pantalla que pide hacer la copia.

Pulsa **Hacer una copia**.

**📸 FOTO 2** — lo que salga inmediatamente después. Aquí es donde Google avisa
de que «también se copiarán las funciones y el archivo de Apps Script».

### B4. Entrar

En la copia recién hecha:

**📸 FOTO 3** — ¿sale el menú **🧪 Prueba** sin hacer nada?

Pulsa **🧪 Prueba → Abrir la ventana**.

**📸 FOTO 4 — LA FOTO QUE IMPORTA.** Lo que Google enseñe ahora para pedir
permisos. Fotografía **todas** las pantallas que salgan, una por una, hasta que
se abra la ventana. Busca especialmente si en alguna aparece:

> ⚠️ **Google hasn't verified this app**

- **Si NO aparece** → la versión gratis se instala en un clic de verdad. Vía
  libre.
- **Si SÍ aparece** → sigue funcionando, pero hay un susto en medio y hay que
  decidir si se asume o se escribe un aviso en la landing que lo adelante.

Lee también **qué permisos pide**. Si dice algo de «ver y administrar tus
archivos de Drive», algo se coló: vuelve al paso A5.

### B5. El tamaño

Cuando se abra la ventana:

**📸 FOTO 5** — la ventana entera, con las tres cifras grandes visibles.

Se pidieron 2000×2000. Lo que diga **Ancho real** y **Alto real** es lo que
Sheets da de verdad. **Ésa es la pregunta 2.**

### B6. Escribir

Pulsa **Escribir una fila en la hoja**.

**📸 FOTO 6** — el mensaje que salga debajo del botón.

- Verde → el permiso pequeño alcanza para trabajar. **Pregunta 4 contestada.**
- Rojo → **copia el mensaje entero tal cual**, sin acortar. Google nombra el
  permiso exacto que falta y ése es el dato.

---

## Lo que hay que mandarme

Las seis fotos, y estas cuatro respuestas:

| | Pregunta | Respuesta |
|---|---|---|
| 1 | ¿Salió «Google hasn't verified this app»? | sí / no |
| 2 | Ancho × alto reales de la ventana | `____ × ____` |
| 3 | ¿El menú 🧪 salió solo en la copia? | sí / no |
| 4 | ¿Escribió la fila? | sí / no — y el mensaje si fue rojo |

Con eso se decide si la versión gratis se instala en un clic limpio o en un clic
con susto, y de qué tamaño puede ser su pantalla. Son las dos cosas que no se
pueden dar por supuestas.

---

## ⚠️ HAZLO EN UNA COMPUTADORA — visto el 16/10

La primera persona que probó esto lo hizo en un **iPad con Safari** y falló dos
veces. Llegó a la pantalla de copiar —con el aviso del Apps Script y todo— y al
pulsar **Crear una copia** salió:

> **No se pudo abrir el archivo en este momento.**
> Verifica la dirección e inténtalo de nuevo.

**Eso NO es un problema de permisos**, y conviene saberlo porque parece uno: si
el compartir estuviera mal, la pantalla de copiar no habría llegado a salir.

Las causas conocidas de ese error exacto al copiar una hoja son tres, y la
persona tenía las tres:

1. **Tablet o teléfono en vez de computadora.** Los enlaces `/copy` no son
   fiables fuera del escritorio.
2. **Safari.**
3. **Varias cuentas de Google abiertas a la vez.**

Si falla en la computadora también, el rodeo que funciona: cambiar `/copy` por
`/edit` al final del enlace, abrir la hoja, y usar **Archivo → Hacer una copia**
desde dentro.

### Y esto NO es sólo un problema de la prueba

Si el `/copy` es frágil en el móvil, **lo es también para la versión gratis**. El
plan es que la gente la descubra en vídeos de redes sociales, y ese público entra
desde el teléfono. Alguien que ve un reel, pulsa el enlace y recibe «no se pudo
abrir el archivo» no vuelve.

No mata el plan. Significa que la landing tiene que decir **«hazlo desde una
computadora»** antes del enlace, y que el vídeo tiene que grabarse en una
computadora. Es una frase, pero hay que saberla ANTES de montar el embudo.

## ⚠️ Y UNA PREGUNTA ABIERTA QUE SE CONTESTA EN 30 SEGUNDOS

**¿Aparece el menú 🧪 al abrir la hoja de prueba en el teléfono?**

No se pudo confirmar en la documentación si los menús y las ventanas de Apps
Script se pintan en la app de Sheets del móvil. **Abrir la hoja en el teléfono y
mirar** lo contesta.

Si NO aparecen, la versión gratis con la ventana dentro de la hoja **sólo
funciona en computadora** — y eso importa mucho, porque el caso de uso de Acopio
es un teléfono en la bodega. Habría un corte limpio y honesto:

| | |
|---|---|
| **Gratis** | se instala y se usa **en la computadora** |
| **Pro** | app web desplegada, **funciona en el teléfono** |

Encaja con el otro límite —gratis para quien trabaja solo, Pro para un equipo—
pero hay que medirlo antes de prometer nada.

## Si algo sale mal por el camino

| Lo que ves | Qué es |
|---|---|
| **«No se pudo abrir el archivo en este momento»** al copiar | Casi siempre tablet/teléfono, Safari, o varias cuentas abiertas. Ver arriba |
| **«No se encontró el archivo Panel»** | El archivo HTML no se llama exactamente `Panel` |
| **El menú 🧪 no aparece** | No se guardó el código, o la hoja no se recargó tras guardar |
| **Cuadro gris de excepción al abrir la hoja** | Algo intenta abrir la ventana solo. En esta prueba no debería pasar: la ventana sólo se abre al pulsar el menú |
| **Pide permisos de Drive** | Se coló algo en el código. Revisa el paso A5 |

## Lo que esta prueba NO contesta

Para que nadie saque conclusiones de más:

- **No prueba Acopio**, prueba el camino de instalación. La app real tiene más
  código, pero no más permisos de los que declare.
- **No dice cuánta gente lo instalará.** Dice cuántos clics y cuántos sustos hay.
- **No vale para la versión de pago.** Ésa sube documentos a Drive, y ese permiso
  es restringido — eso ya está medido y revertido en
  `docs/FINDING-drive-file-scope.md`.

---

# RESULTADOS — 16/10/2026

Jose hizo la prueba en su cuenta personal (computadora) y en un iPad.

| | Pregunta | Respuesta |
|---|---|---|
| 1 | ¿Sale «Google hasn't verified this app»? | **SÍ** ❌ |
| 2 | Tamaño real de la ventana | **828 × 755** (pantalla 1920×1080) |
| 3 | ¿El menú 🧪 sale solo en la copia? | **SÍ** ✅ |
| 4 | ¿Escribe la fila? | sin respuesta todavía |

## 1 · La pantalla fea SÍ sale — y yo me equivoqué sobre por qué

Dije que con dos permisos no sensibles «debería salir la suave». Salió la fea.
Las fuentes de terceros en las que me apoyé decían que los `currentonly` no la
disparan, y **no eran Google**. Lo dije así y aun así apunté en la dirección
equivocada.

**Pero la causa no son los permisos, y la teníamos escrita desde el 1 de
octubre.** `PROYECTO-DE-CLOUD.md`, en su propia tabla:

> **Quién pide los permisos** — *«la pantalla de "esta aplicación quiere acceder
> a tu Drive": el nombre, el logo y el aviso de "Google no la ha verificado"
> salen de ahí»* (del proyecto de Cloud).

La hoja de prueba usó el **proyecto automático** que Google crea para cada
script. Ése **siempre está en modo «Testing»**, y la documentación de Google dice
que en Testing la pantalla sale SIEMPRE, sin importar qué permisos se pidan:

> *Google mostrará un mensaje de advertencia antes de permitir que un usuario de
> prueba autorice los permisos... advirtiendo sobre los riesgos de dar acceso a
> sus datos a una aplicación no verificada.*

Así que la prueba midió el proyecto, no los permisos. **Es un resultado válido y
una conclusión equivocada mía, no un fallo del montaje.**

### La prueba de que los permisos SÍ quedaron bien

La pantalla de consentimiento enseñó exactamente dos cosas, y ninguna es Drive:

- *View and manage spreadsheets that this application has been installed in*
- *Display and run third-party web content in prompts and sidebars inside Google applications*

Eso es `spreadsheets.currentonly` + `script.container.ui` y nada más. **El
recorte de once permisos a dos funciona.** Era la mitad de la apuesta y está
ganada.

### Lo que falta probar, y son otros 20 minutos

Atar el script a un **proyecto de Cloud propio** (uno NUEVO, no el de la app de
pago, que tiene configurado el permiso de Drive) y darle a **Publish app** para
sacarlo de Testing.

Google dice, en su propia ayuda: *«si tu app usa sólo permisos no sensibles, no
es obligatorio pasar por el proceso de verificación»*. Lo que **no** dice en
ninguna página oficial que yo encontrara es si estos dos permisos cuentan como no
sensibles. Eso se ve en la consola al añadirlos: Google los separa en «no
sensibles», «sensibles» y «restringidos». **Mirar en qué cajón caen contesta la
pregunta sin esperar a nada.**

## 2 · La ventana da 828 × 755

Se pidieron 2000×2000. En una pantalla de 1920×1080 dio **828 de ancho y 755 de
alto**.

Es trabajable: la app ya funciona desde 375 px, y 828 es más que un teléfono.
Pero es una caja fija, no pantalla completa, y eso hay que tenerlo en cuenta al
decidir qué entra en la versión gratis — una tabla de movimientos con ocho
columnas ahí dentro va apretada.

## 3 · El menú sale solo ✅

Confirmado en la copia. Sin autorizar nada, el menú 🧪 está ahí. El camino de
entrada existe.

## 4 · El iPad no sirve para instalar — y no es cosa de Safari

Jose lo probó en el iPad con **Chrome**, y también **en incógnito**. Falló las
dos veces, igual que con Safari.

**Entonces no es el navegador: es el aparato.** Y eso convierte una molestia del
guion de prueba en un hecho del producto: **la instalación es de computadora.**

Para el embudo de la versión gratis significa que la landing tiene que decirlo
ANTES del enlace, y que el vídeo se graba en una computadora. Quien llegue desde
un reel en el teléfono va a chocar con esto.

## 5 · Escribe ✅ — y el permiso pequeño alcanza

> ✓ Escrita la fila 2 en «Sheet1»

Con `spreadsheets.currentonly` se escribe en la hoja sin problema. **Eso es todo
lo que la versión básica necesita hacer**: registrar movimientos. Pregunta 4
contestada, y en verde.

## 6 · EL TELÉFONO NO PUEDE ABRIRLA — confirmado por Jose

Jose, 16/10: *"intenté abrir el sheet en mi teléfono pero sólo abre la
aplicación Sheets y no aparece el menú"*.

Confirmado, y la conclusión es correcta: **la app dentro de la hoja no se puede
abrir desde un teléfono.** La app de Sheets del móvil no pinta los menús ni las
ventanas de Apps Script.

### Esto es lo que más cambia el plan, y conviene decirlo entero

El caso de uso de Acopio **es un teléfono en una bodega**. Una versión gratis que
sólo funciona en computadora no es una herramienta: es una demostración.

Pero no es un callejón sin salida, porque **las dos puertas pueden convivir**:

| | Cómo se instala | Dónde funciona |
|---|---|---|
| **Dentro de la hoja** | un clic | sólo computadora |
| **Desplegada como app web** | ~5 minutos | computadora **y teléfono** |

Y la segunda **no necesita ningún permiso más** que los dos que ya medimos:
desplegar una app web no añade permisos. O sea que el camino de arriba no
excluye el de abajo.

### El embudo que sale de esto, y es mejor que el que teníamos

1. **Un clic** → funciona → registra diez movimientos en la computadora → ya vio
   que sirve.
2. **«¿Lo quieres en el teléfono de la bodega?»** → cinco minutos guiados de
   despliegue. Opcional, y sólo lo hace quien ya le encontró el valor.
3. **«¿Y que lo use tu equipo?»** → eso es Pro.

Dos escalones, y cada uno se sube **después** de haber recibido algo. El error
sería pedir el despliegue de entrada, que es justo lo que hace hoy la versión de
pago y por lo que la instalación dura diez minutos.

---

# SEGUNDA RONDA — proyecto de Cloud propio · 17/10/2026

Jose creó el proyecto **ACOPIO FREE** (`692774014234`), le configuró la pantalla
de consentimiento, lo pasó a **In production**, lo ató al script de `PRUEBA 1
CLIC` e hizo la copia desde `jose@ox-glass.com`.

## 1 · LA PANTALLA FEA DESAPARECIÓ ✅

La pantalla de permisos de la copia es la **suave**: el nombre de la app, los dos
permisos con casilla, y nada más. **No hay «Google hasn't verified this app», no
hay «Configuración avanzada → Ir a (no seguro)».**

Lo único que queda es un recuadro informativo azul:

> *Obtén más información sobre el motivo por el que no ves los vínculos a la
> Política de Privacidad o las Condiciones del Servicio de PRUEBA 1 CLIC*

Eso sale porque el proyecto no tiene política de privacidad configurada. Es una
línea de texto, no un susto.

**Queda confirmado lo que decía `PROYECTO-DE-CLOUD.md` desde el 1 de octubre: la
pantalla fea la trae el proyecto automático en modo Testing, no los permisos.**

## 2 · EL CAJÓN DE CADA PERMISO — y aquí está el problema

La consola los separó así:

| Permiso | Cajón |
|---|---|
| `spreadsheets.currentonly` | **No sensible** ✅ |
| `script.container.ui` | **SENSIBLE** ⚠️ |
| *(restringidos)* | vacío ✅ |

Yo esperaba los dos en «no sensibles». **`script.container.ui` es sensible**, y
eso enciende el aviso que Google puso en la misma página:

> *Your app requires verification. When you have finished configuring your
> information, please submit your app for review.*

## 3 · EL MURO NUEVO: el tope de usuarios

De la propia página de *Audience*, palabra por palabra:

> *The user cap limits the number of users that can grant permission to your app
> when requesting **unapproved sensitive or restricted scopes**. The user cap
> applies **over the entire lifetime of the project**, and it **cannot be reset
> or changed**.*

Tenemos un permiso sensible sin aprobar. **Luego el tope aplica.** El número que
Google documenta es **100 usuarios**, y es de por vida del proyecto.

**Cien instalaciones y se acabó, para siempre, en ese proyecto.** Para una
versión que se regala en redes para hacerse conocidos, cien es nada.

### No es un callejón: es papeleo, y es gratis

Hay que separar dos cosas que suenan igual y cuestan muy distinto:

| | Qué pide Google | Coste |
|---|---|---|
| Permiso **restringido** (el `drive` de la app de pago) | Auditoría de seguridad **CASA** | **500–4.500 $/año** |
| Permiso **sensible** (nuestro `script.container.ui`) | **Verificación de la app** | **0 $** |

Lo que pide la verificación de un permiso sensible:

1. Ser **dueño verificado del dominio** → `acopio.net` es nuestro ✅
2. **Página de inicio** de la app en ese dominio → la landing ya existe ✅
3. **Política de privacidad** y **condiciones del servicio** en ese dominio → *faltan*
4. **Vídeo en YouTube** enseñando el flujo de permisos y para qué se usa cada uno → *falta*
5. Nombre y logo de la app → los tenemos ✅

**Tres de cinco están hechos.** Y los dos que faltan hay que hacerlos de todas
formas para la landing.

> **Esto hay que empezarlo antes que el código de la versión gratis, no después.**
> La revisión de Google tarda de días a semanas, y mientras tanto el tope corre.
> Si se lanza primero y se verifica después, se gastan instalaciones del cupo de
> por vida en gente que probablemente ni vuelva.

## 4 · Las casillas vienen DESMARCADAS

En la pantalla de permisos, los dos permisos salen con la **casilla vacía** y un
*«Seleccionar todos»* arriba. Si alguien pulsa **Continuar** sin marcar nada, la
app no recibe permisos y falla.

No es un detalle: es el primer minuto del producto, con alguien que llegó de un
vídeo y no tiene paciencia. **El vídeo de instalación tiene que enseñar la
pulsación de «Seleccionar todos»**, y la app tiene que saber decir qué pasó si
llega sin permisos, en vez de enseñar un error de Google.

## 5 · El tamaño, tercera medida

| Pantalla | Navegador | Ventana que dio Sheets |
|---|---|---|
| 1920×1080 | en ventana | 828 × 755 |
| 1920×1080 | maximizado | 1536 × 756 |
| 2560×1440 | en ventana | **1135 × 767** |

**El ancho sigue a la ventana del navegador. El alto se queda clavado entre 755 y
767 pase lo que pase**, incluso con 1440 px de pantalla disponibles.

Para diseñar: **el alto útil son ~750 px y no va a crecer.** El ancho se tiene
que comportar como ya se comporta la app, de 375 px para arriba.

## 6 · CONTESTADO, Y AL REVÉS DE LO QUE YO SUPUSE: la copia NO hereda

Jose lo comprobó el 17/10. En la configuración del proyecto de **`copia PRUEBA 1
CLIC`**:

> **GCP: Predeterminada**

No `692774014234`. **Predeterminada** = el proyecto automático que Google fabrica
para cada script nuevo. **La copia se hizo el suyo.**

### Yo había deducido lo contrario, y la deducción estaba mal

Dije que las señales apuntaban a que sí lo heredó, porque la pantalla de permisos
decía «PRUEBA 1 CLIC» y no «Copia de PRUEBA 1 CLIC». El nombre era el dato
correcto y lo leí al revés: **esa pantalla era la del ORIGINAL**, que sí tiene
ACOPIO FREE atado. La de la copia habría dicho «copia PRUEBA 1 CLIC».

### Lo que esto significa de verdad, y son dos cosas opuestas

**LA MALA.** Un proyecto automático **siempre está en Testing**, y en Testing la
pantalla fea sale siempre. Como cada copia se fabrica el suyo, **la pantalla fea
sale para todo el que instale, y no hay nada en el proyecto de Jose que lo
cambie.** Verificar ACOPIO FREE no alcanza a las copias: no lo usan.

**LA BUENA, y no es pequeña.** El tope de usuarios es **por proyecto**. Si cada
quien tiene el suyo, **cada quien es el usuario número 1 de su propio proyecto**.
El tope de 100 **no se consume nunca** por este camino. El muro de la sección 3
no existe mientras se distribuya copiando.

### Las dos no se pueden tener a la vez

| Cómo se distribuye | Pantalla fea | Tope de 100 |
|---|---|---|
| **Copiando la hoja** (hoy) | **sale siempre** | **nunca aplica** |
| **Add-on de Marketplace** (un solo proyecto) | se va al verificar | aplica hasta verificar |

Y de aquí sale la decisión real, que **no se prueba, se decide**:

1. **Asumir la pantalla** y adelantarla en el vídeo y en la landing — «Chrome te
   va a avisar; es normal en Apps Script; pulsa Configuración avanzada → Ir a».
   Es lo que hace casi todo lo que se regala hecho en Apps Script.
2. **Add-on de Google Workspace Marketplace**: un solo script, un solo proyecto,
   verificado, y el usuario le da a *Instalar* sin copiar nada. Es la solución de
   verdad y es un cambio de arquitectura, no un ajuste.

**Desplegar como app web no es una tercera salida**: la copia desplegada sigue
usando su proyecto automático y la pantalla sale igual.

> El trabajo de branding que Jose ya hizo (dominio, política, condiciones)
> **no se tira**: es exactamente lo que pide el camino 2. Lo que cambia es que
> deja de ser urgente para lanzar, y pasa a ser requisito de la versión add-on.

### Y una pendiente de la pantalla de Branding

La verificación del branding salió bien pero quedó **sin publicar**:

> *Your branding has been verified, but is not yet being shown to users. Publish
> it before the verified result expires in **7 days**.*

Por eso los enlaces de política y condiciones no aparecían en la pantalla de
permisos: están guardados, no publicados. Se arregla con el botón **Publish
branding**, y hay siete días antes de que la verificación caduque y haya que
repetirla.
