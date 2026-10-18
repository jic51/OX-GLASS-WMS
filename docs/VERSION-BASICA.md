# Acopio Basic — la versión gratis

Decidida el 18/10/2026, después de cerrar la investigación de la instalación
(`docs/prueba-un-clic/`). Esto es el diseño; lo que está construido y lo que
falta se marca al final.

---

## 1 · Qué es, en una frase

**La app de hoy, con `ACOPIO_BASIC = true` y el manifiesto recortado a un
permiso.** Mismo archivo, misma arquitectura, misma forma de escribir en la hoja.

## 2 · Cómo se instala

| Paso | Cuánto cuesta |
|---|---|
| 1 · Clic en el enlace `/copy` → **Hacer una copia** | un clic |
| 2 · Extensiones → Apps Script → **Implementar → App web** | **1 min 47 s** (medido) |
| 3 · Abrir la dirección `/exec` | — |

**No sale la pantalla de «Google no ha verificado esta aplicación».** Medido el
17/10 con una copia limpia: *"fue directo a dar permisos"*. La causa está
aislada en `docs/prueba-un-clic/web/PASOS.md` — un solo permiso, y no sensible.

Y **funciona en el teléfono**: 411 × 658, con una fila escrita desde un Android.

## 3 · El permiso, y por qué es uno solo

```
https://www.googleapis.com/auth/spreadsheets.currentonly
```

La consola de Cloud lo clasifica como **no sensible**. Es el único que hay, y de
ahí sale todo lo demás de este documento: **cualquier función que necesite otro
permiso queda fuera por obligación, no por decisión comercial.**

| Se cae | Permiso que se iba a llevar | Cajón |
|---|---|---|
| Subir fotos y PDF | `drive` | **restringido** |
| | `documents` | sensible |
| Detección de usuarios | `userinfo.email`, `userinfo.profile` | sensible |
| Informes y avisos por correo | `script.send_mail` | sensible |
| Lector de correos (Gemini) | `script.external_request` | sensible |
| Respaldo nocturno | `script.scriptapp` | sensible |
| Auto-reparación de la dirección | `script.deployments`, `script.projects` | sensible |
| Menús y ventanas dentro de la hoja | `script.container.ui` | **sensible** |

El último es el que costó dos días de investigación: era el que traía la
pantalla fea, y es la razón de que la versión gratis sea una app web y no una
ventana dentro de la hoja.

## 4 · Las cuatro decisiones que sí son nuestras

Lo de arriba lo decide el manifiesto. Esto no:

| Se apaga | Se queda |
|---|---|
| Códigos QR y etiquetas | **Entry · Exit · Transfer · Return · Waste** |
| Reservas | Inventario, categorías y materiales |
| Tarjetas de llegadas (*incoming*) | Buscar · deshacer · restaurar de la papelera |
| Informes del boneyard | El boneyard **como movimiento** |
| | Las gráficas |

Las gráficas se quedan porque **se dibujan en el navegador y no cuestan ningún
permiso** — y son lo que hace presentable un vídeo de redes sociales, que es el
motivo entero de que esta versión exista.

El boneyard se parte por donde se parte solo: **el movimiento** (devolver
material indicando de qué proyecto sobró) es parte de `RETURN` y se queda; **los
informes** de qué sobró de dónde son Pro.

## 5 · Quién hace de portero

**Google, en el despliegue.** `"access": "MYSELF"` en `appsscript.basic.json`.

Dentro de la app no hay sesión, ni usuarios, ni roles — no podría haberlos,
porque `userinfo.email` es uno de los permisos que hay que quitar. Así que el
control de acceso lo pone la capa de abajo: **sólo el dueño de la copia puede
abrir su dirección `/exec`.** No cuesta ningún permiso y no hay sesión que
falsificar.

### Y esto recupera algo que se había caído

La investigación vieja (`docs/INSTALACION-DE-UN-CLIC.md`) celebraba que el
límite técnico y el comercial fueran el mismo: sin app web no había dirección
que compartir, luego gratis = una persona, sin tener que vigilar nada. Al
elegir la app web ese argumento se cayó, porque **sí** hay dirección.

`MYSELF` lo devuelve, y mejor, porque ahora es explícito:

> **Gratis = sólo tú puedes abrirla. Pro = tu equipo puede.**

Se explica en una frase, nadie se siente engañado, y lo sostiene Google.

## 6 · La regla que no se negocia: escribe IGUAL que Pro

Jose, 18/10: *"aun si el usuario decide usar acopio basico, la app debe guardar
en el sheet toda la informacion como la guarda actualmente, con todos los datos,
porque si el cliente decide en algun momento pasarse a la version pro, la app
debe mostrar todos los datos ya desde el momento que se actualice la app"*.

| Si la gratis escribe… | Pasar a Pro es… |
|---|---|
| **lo mismo** | cambiar el código, y ya |
| algo reducido | escribir una **migración**, probarla con datos de clientes, y ampliarla cada vez que Pro gane una columna |

Por eso `ACOPIO_BASIC` tiene prohibido tocar `AC`, `AC_WIDTH`, `appendRow`, los
encabezados de las hojas y el motor de existencias. Lo vigila
`tools/test-gratis-escribe-igual.js`.

### La única columna que no puede coincidir

`AC.USER_EMAIL`. Sin detección de usuarios no hay autor que escribir.

**Y vacía está mal**: al pasar a Pro, el historial enseñaría un hueco que parece
un fallo nuestro. Escribe `BASIC`, que es un dato honesto — *este movimiento se
registró en la versión básica, donde no había usuarios* — en lugar de un
agujero.

## 7 · Cómo se apaga algo — y por qué no es donde yo creía

La idea obvia era poner la puerta en las **102 funciones globales sin guión
bajo**, que son las que el navegador puede llamar. Se hizo el recorrido de
llamadas para ver cuáles tocan un servicio sin permiso en la versión básica, y
salieron **60 de 102** — con `processMovement`, `addMultiEntry` y
`getInitialData` dentro.

**Los permisos fuertes no viven en un rincón: están enhebrados por el centro.**
`processMovement` registra un movimiento —que la gratis tiene que hacer— y de
camino *puede* adjuntar un documento y mandar un aviso. Cerrar esa puerta no
apagaría una función de lujo: apagaría el producto.

Así que el apagado va en las **hojas**, donde de verdad se toca el servicio. Y
tiene **tres formas**, no una. Elegir mal la forma es lo que rompe la app:

| Forma | Para qué | Qué hace |
|---|---|---|
| **CALLAR** | correos, respaldos, disparadores, el menú | `if (basicApagado_()) return;` — nadie se entera |
| **NEGAR** | lo que se quitó a propósito: lector de correos, fotos, usuarios | `basicNiega_('Rack photos')` — un mensaje nuestro |
| **CONTESTAR OTRA COSA** | lo que decide si la app abre | `getUserRole` responde ADMIN sin preguntar |

> **La primera es la que hay que entender.** Si se usara NEGAR donde toca
> CALLAR, la versión gratis fallaría al guardar un movimiento por no poder
> mandar un correo que a nadie le hacía falta.

### `onOpen` tiene nombre propio

Es un disparador simple: corre **al abrir la hoja**, antes que nada y sin que
nadie lo pida, y llama a `getUi()`. Sin apagarlo, el primer minuto del producto
—el de alguien que acaba de copiar desde un vídeo— sería un cuadro de error de
Google. Se CALLA, nunca se niega, y lo vigila una comprobación propia.

La entrada a la app sigue siendo la pestaña **«START HERE»**, que es una hoja
visible y no necesita ningún permiso.

## 8 · El censo, para que lo que falta esté medido y no recordado

Las hojas se añaden solas: cualquiera que escriba un `MailApp.sendEmail` nuevo
dentro de seis meses crea una. Una lista a mano de «las que faltan» sería otra
vez dos cosas que tienen que coincidir sin que nada lo obligue.

Por eso `test-gratis-escribe-igual.js` las **cuenta**. El número puede bajar
cuando se apague una, y **no puede subir** sin que la prueba lo diga.

**Hoy faltan 47.** De ésas, unas quince son funciones `menu*`: en la versión
básica no se pueden llamar de ninguna manera, porque el menú lo crea `onOpen` y
`onOpen` se calla. Se dejan en la cuenta igual — que hoy sean inalcanzables es
consecuencia de otra decisión, y el día que esa decisión cambie volverían sin
que nadie se acordara.

## 9 · Estado

| | |
|---|---|
| ✅ La constante `ACOPIO_BASIC` y su documentación | `Code_v3_fixed.gs` |
| ✅ Viaja al navegador por los tres caminos de `getInitialData` | `basic:` |
| ✅ El manifiesto de un permiso, con `access: MYSELF` | `appsscript.basic.json` |
| ✅ Las tres formas de apagar | `basicApagado_`, `basicNiega_` |
| ✅ `onOpen` se calla — el primer minuto del producto | |
| ✅ `getUserRole` y `requireOwnerContext_` contestan sin preguntar | |
| ✅ 7 hojas que CALLAN (correos, disparadores, avisos) | |
| ✅ 10 puertas que NIEGAN (lector de correos, fotos, usuarios, IA, respaldo) | |
| ✅ La prueba, con 38 comprobaciones y el censo | `tools/test-gratis-escribe-igual.js` |
| ⬜ Las 47 hojas que faltan | el censo las nombra al correr |
| ⬜ Esconder las pestañas y botones en `Index` | |
| ⬜ `BASIC` en `AC.USER_EMAIL` | |
| ⬜ La sección de la landing y el vídeo de instalación | |

Nada de esto cambia la versión de pago: `ACOPIO_BASIC` se publica en `false`,
así que cada guardia es un `if` que nunca entra. Suite completa en verde, 160
de 160.
