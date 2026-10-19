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

**Hoy faltan 46.** De ésas, unas quince son funciones `menu*`: en la versión
básica no se pueden llamar de ninguna manera, porque el menú lo crea `onOpen` y
`onOpen` se calla. Se dejan en la cuenta igual — que hoy sean inalcanzables es
consecuencia de otra decisión, y el día que esa decisión cambie volverían sin
que nadie se acordara.

## 9 · La columna del autor, y una prueba que empujó a un diseño mejor

El primer intento fue `ACOPIO_BASIC ? 'BASIC' : auth.email` dentro del escritor
de filas. **`test-gratis-escribe-igual.js` lo rechazó**, que es exactamente para
lo que existe: si el camino de escritura puede preguntar en qué edición está,
puede empezar a escribir distinto.

Y al buscar otra forma apareció que **la condición de verdad nunca fue «¿es la
versión básica?» sino «¿hay autor?»** — y eso se ve en el propio dato:

```js
function autorDeLaFila_(email) {
  return String(email || '').trim() || 'BASIC';
}
```

No sabe qué edición es, y no le hace falta. La prueba empujó a un diseño mejor,
no a un rodeo.

> Que `getUserRole` devuelva el correo **vacío** en la versión básica no es un
> descuido pendiente de arreglar: **es lo que hace que esto funcione.** Si
> devolviera un correo inventado, la fila mentiría.

## 10 · La pantalla: esconder unas, ofrecer otras

**Esto cambió el 19/10 y la idea fue de Jose**, contra lo que yo había decidido:

> *"¿qué tal si cuando alguien intenta subir una imagen en básico, la app le dice
> que esa función sólo está disponible en Pro?"*

Yo había escrito *«esconder, no desactivar: un botón gris invita a preguntar qué
le pasa»*. Eso valía contra un botón **mudo**. Un botón que **explica** no es lo
mismo, y mi razón no le aplicaba.

Lo que sí aplica es para qué existe la versión gratis: **vender Pro.** Si nunca
ven que se pueden subir fotos, nunca van a querer subir fotos — y esconder deja
la versión gratis **sin ninguna superficie de venta**. Peor: el momento en que
alguien pulsa ese botón es el de **máxima intención** que vamos a tener nunca.

### Las tres listas

| | Qué pasa |
|---|---|
| `BASIC_FUERA` | se esconde |
| `BASIC_PRO` | el catálogo de ofertas: título y qué se gana |
| `BASIC_PRO_BOTONES` | qué botón abre qué oferta |

**Ocho ofertas**: fotos y documentos, etiquetas y QR, escanear, apartar
material, el equipo, llegadas, respaldo nocturno, y el lector de correos —éste
con su propio mensaje porque vende demasiado para una frase genérica.

**Y sólo cuatro cosas escondidas**: soporte, comprobación de datos,
reconstructor de existencias y rellenar identificadores. Nadie sube a Pro por un
botón de soporte, y **veinte puertas cerradas hacen que una herramienta parezca
una demostración caducada**.

### Las tres reglas que deciden si vende o molesta

**1 · La frecuencia.** El mensaje entero **una vez** por función; después, una
línea callada. Un aviso que sale siempre no es un aviso, es acoso, y la gente
desinstala por eso. El recuerdo vive en `localStorage`, y si falla se cae del
lado bueno: enseña la oferta. Perder el recuerdo es una molestia; perder la
oferta es perder la venta.

**2 · Nunca corta un guardado.** Subir fotos no es un botón suelto: está dentro
del formulario de un movimiento. Si el aviso rompiera el guardado, la versión
gratis sería **peor en lo único que sabe hacer**. El movimiento se guarda igual,
sin foto.

**3 · Las palabras son el producto.**

> ❌ *«Not available in Acopio Basic»* — un muro
> ✅ *«Attach photos, PDFs and delivery notes to any movement»* — una oferta

Mismo trabajo, resultado opuesto. Lo vigila una comprobación.

### Dos detalles que costaron un rato

**El candado reemplaza el `onclick`, no añade un oyente.** Estos botones llevan
su acción escrita en el HTML (`onclick="openEmailImport()"`). Un oyente añadido
correría **además** de ella: saldría la oferta **y** se intentaría hacer lo que
no se puede.

**`_basicPintar()` va al FINAL de `applyRoleUI`, no al principio.** Todo lo de
arriba decide por rol qué se ve, y varias de esas líneas tocan botones que la
básica quiere dejar a la vista — `_escPintarBoton` esconde el de escanear cuando
no hay cámara. Puesto antes, cualquiera de ellas lo deshacía. La edición manda
sobre el rol porque es una capa más abajo: el rol decide qué puede hacer esta
persona, la edición decide **qué existe**.

### El enlace va a la raíz, y no a `/pro`

Lo escribí apuntando a `acopio.net/pro`. **Esa página no existe**: habría sido un
404 justo en el momento de más interés. Un enlace del app a una página del sitio
son otras dos cosas que tienen que coincidir sin que nada lo obligue, y **la raíz
es la única ruta que no puede faltar**.

El `?de=<función>` viaja igual, así que las estadísticas del sitio dicen qué
función empuja gente hacia Pro — **sin rastrear a nadie y sin pedir un permiso
más**, porque abrir una página no es una petición nuestra. Es el único dato que
la versión básica puede darnos.

## 11 · Estado

| | |
|---|---|
| ✅ La constante, el manifiesto de un permiso y `access: MYSELF` | |
| ✅ Las tres formas de apagar | `basicApagado_`, `basicNiega_` |
| ✅ `onOpen` se calla — el primer minuto del producto | |
| ✅ `getUserRole` y `requireOwnerContext_` contestan sin preguntar | |
| ✅ 7 hojas que CALLAN · 10 puertas que NIEGAN | |
| ✅ `BASIC` en la columna del autor, sin mirar la edición | `autorDeLaFila_` |
| ✅ La pantalla esconde cuatro cosas y **ofrece ocho con candado** | `BASIC_FUERA`, `BASIC_PRO` |
| ✅ Una pestaña escondida tampoco se abre | `showTab` |
| ✅ La prueba, 62 comprobaciones y el censo | |
| ✅ `getSetupState` no pide el asistente — abre directa al inventario | |
| ⬜ **Nadie ha ARRANCADO todavía Acopio Basic** | ← lo siguiente |
| ⬜ Las 46 hojas del censo (unas 15 son `menu*`, inalcanzables) | |
| ⬜ La sección de la landing y el vídeo de instalación | |

### Lo único que queda antes de poder prometer nada

**El código está, pero la versión básica no se ha ejecutado nunca.** Todo lo de
arriba son guardias que, con `ACOPIO_BASIC = false`, nunca entran — así que la
suite verde dice que **Pro sigue intacto**, no que la básica funcione.

Eso se comprueba de una sola manera: poner la constante en `true`, desplegar la
copia de prueba y abrirla. Hasta entonces, esto es una versión básica escrita,
no probada.

Nada de esto cambia la versión de pago. Suite completa: 160 de 160.
