# Análisis de seguridad de Acopio Pro — Parte 3: el perímetro de la instalación

Sigue de `ANALISIS-SEGURIDAD-2.md`. **Parte 3 cubre** el inicio de sesión
entero, el token que lleva el navegador, qué pasa cuando se le quita el acceso a
alguien que tiene la pestaña abierta, y los registros: qué se guarda de cada
persona y durante cuánto.

---

## RESUMEN

| | Qué | Gravedad |
|---|---|---|
| ✅ | **Quitarle el acceso a alguien funciona de verdad**, y está comprobado — fue un fallo y se arregló | — |
| ✅ | El token va firmado con HMAC-SHA256 y no se puede falsificar sin el secreto | — |
| 🟠 | **El inicio de sesión entero descansa en una cadena hecha con `Math.random()`** | media |
| 🟠 | Y el comentario del código dice que el limitador protege eso. **No lo protege** | media |
| 🟡 | El token dura **30 días** y **no hay forma de anular uno solo** | baja |
| 🟠 | Los registros guardan **el correo de cada persona, para siempre**. No hay limpieza ninguna | media |
| ⚪ | La firma se compara con `!==`, no en tiempo constante — **medido y descartado** | — |

---

## 1 · ✅ QUITARLE EL ACCESO A ALGUIEN FUNCIONA — Y ES MÉRITO DE HABERLO PROBADO

El token **no lleva el rol dentro**: lleva el correo. El rol se busca **en cada
llamada** en `USERS_V3`. Eso significa que desmarcar a alguien en Manage Users
tiene efecto **en la siguiente petición**, sin esperar a que caduque nada.

**Y esto estuvo roto**, lo cual es la parte que conviene recordar. Hasta el
2026-10-05, un usuario que estaba en `USERS_V3` **pero desactivado** no cortaba
el bucle: seguía, salía por abajo y caía en la lista vieja de `CONFIG` — **donde
está todo el mundo**, porque es la lista de la que se migró. En cualquier
instalación migrada, desactivar a alguien **no le quitaba el acceso**. La
pantalla decía «desactivado» y el servidor le dejaba entrar.

> *No era una puerta sin guardia: era una guardia que decía que sí.*

Hoy, si el correo aparece en `USERS_V3`, **esa fila decide** — activo, su rol;
desactivado, `DENIED`, y no se mira la lista vieja.

**Lo honesto que hay que decir igual:** el corte ocurre **en la siguiente
llamada al servidor**. Lo que esa persona ya tenga cargado en la pantalla sigue
en su pantalla hasta que recargue. No se puede evitar y no es un fallo —
cualquier app web funciona así— pero si a alguien se le echa en caliente,
**cerrarle la pestaña no lo hace la app**.

---

## 2 · 🟠 H-15 · El inicio de sesión descansa en una cadena de `Math.random()`

Esto es lo más importante de la Parte 3, así que conviene seguir el camino
entero.

**Cómo funciona el inicio de sesión de alguien de fuera del Workspace:**

1. La app abre una ventanita a Google con un parámetro `state` que **inventa el
   navegador**.
2. Google devuelve el código a `handleOAuthCallback_`, que lo cambia por el
   correo verificado y **lo guarda en la caché bajo la llave `login_<state>`**,
   durante 300 segundos.
3. La ventana principal llama a `pollLogin(state)` hasta que aparece, y ahí
   recibe **el token de sesión firmado**.

**Y aquí está lo que importa:** `pollLogin` **no tiene autenticación** —no puede
tenerla, corre antes de que exista ninguna identidad—. Así que, durante esos
cinco minutos, **quien presente la cadena `state` correcta se lleva un token de
sesión válido para ese correo.** Toda la seguridad del inicio de sesión es que
esa cadena no se pueda adivinar.

**Y así se fabrica** (`Index_v3_fixed.html` ~27422):

```js
var state = 'st_' + Math.random().toString(36).slice(2) + '_' + Date.now();
```

**Dos problemas, y el segundo es peor que el primero:**

### 2.1 `Math.random()` no es un generador criptográfico

Es `xorshift128+`: rápido, bien repartido, y **predecible** si alguien llega a
ver otras salidas del mismo generador. Para adivinar a ciegas hay del orden de
2⁵² posibilidades, así que **por fuerza bruta no es explotable hoy** y conviene
decirlo en vez de pintarlo peor. Pero es el sitio exacto donde se usa
`crypto.getRandomValues`, está en todos los navegadores desde hace una década,
y **es una línea**:

```js
var b = new Uint8Array(16); crypto.getRandomValues(b);
var state = 'st_' + Array.from(b, function (x) {
  return ('0' + x.toString(16)).slice(-2);
}).join('');
```

Y de paso se va el `Date.now()`, que no aporta nada: **es lo único de esa cadena
que el atacante ya sabe.**

### 2.2 El comentario del código dice que el limitador protege esto, y no lo protege

En `pollLogin`:

```js
// A tight limit here also blunts guessing at other people's login states.
requireQuota_('poll', state, 120, 300);
```

**El limitador está contado POR `state`.** Un atacante que prueba mil cadenas
distintas estrena un contador en cada una: **nunca llega a su límite**. El
limitador protege contra machacar un mismo `state`, que no es el ataque; contra
probar muchos, no hace nada.

**Por qué esto es lo que de verdad hay que arreglar:** porque alguien —nosotros,
dentro de un año— va a leer ese comentario y **va a dar por protegido algo que
no lo está**. Un comentario equivocado en un sitio de seguridad es peor que
ningún comentario. O se cuenta por quien llama (lo que haya: la IP no la tenemos
en Apps Script) o se borra la frase y se dice la verdad: *lo único que protege
esto es la entropía del `state`*.

### 2.3 Y una tercera, menor, que conviene anotar

`handleOAuthCallback_` **no comprueba el `state` contra nada**: lo usa como
llave de encuentro, no como protección contra falsificación de petición. Eso
permite, en teoría, que alguien haga que la app de otro recoja **el correo del
atacante** y esa persona acabe trabajando dentro de la cuenta de él. El daño es
raro y pequeño —se ve el correo equivocado arriba a la derecha— pero es gratis
cerrarlo cuando se toque esto: que la ventana principal guarde el `state` que
generó y **no acepte un token que vuelva con otro**.

---

## 3 · 🟡 H-16 · El token dura 30 días y no hay forma de anular uno solo

```js
var exp = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
```

El token es `base64(correo|caducidad).HMAC`. **Es imposible de falsificar sin el
secreto** y eso está bien. Pero es **sin estado**: el servidor no guarda una
lista de tokens vivos, así que **no hay forma de matar uno**.

**Por qué la gravedad es baja y no media:** si a alguien se le quita el acceso,
su token sigue siendo válido **pero no le sirve de nada**, porque el rol se
busca en cada llamada y saldrá `DENIED` (§ 1). El agujero real es más estrecho:
**un token robado de alguien que sigue trabajando aquí** vale hasta 30 días, y
lo único que lo mata es cambiar `SESSION_SECRET`, que **echa a todo el mundo a
la vez**.

**Lo que yo haría, y es de producto más que de código:** bajar a 7 días con
renovación silenciosa mientras se usa la app. Quien entra todos los días no nota
nada; un portátil robado en un taxi deja de servir el lunes siguiente en vez de
dentro de un mes. Si alguna vez hace falta anular de verdad uno solo, la forma
barata es meter un contador por persona en el token y subirlo desde Manage Users
con un botón «cerrar sesión en todas partes» — pero eso ya es construir, y no
hace falta todavía.

---

## 4 · 🟠 H-17 · Los registros guardan el correo de cada persona **para siempre**

**Medido:** `AUDIT_LOG` tiene columnas `Timestamp | Action | User | Details ×3`,
y `User` es el correo. `ERROR_LOG` también guarda el correo de quien provocó el
error. **Busqué una limpieza de registros en todo el archivo y no existe
ninguna.** Las dos hojas están clasificadas como *registro*: sólo se añade.

**Qué significa de verdad:** un bodeguero que se fue hace tres años sigue
nombrado, con su correo, en miles de filas del archivo de su antigua empresa. Y
si pide que le borren —que es un derecho en Europa y empieza a serlo en algunos
estados— **hoy la única respuesta que la app puede dar es «borra la hoja
entera»**, que es literalmente lo que dice el texto de privacidad: *"To delete
everything: delete the spreadsheet and the app's Drive folder."*

**Y es el mismo problema de H-02 con otra ropa:** una hoja que sólo crece, sin
que nadie haya decidido hasta cuándo.

**Por qué es MEDIA:** no es un agujero por el que entre nadie. Es que **estamos
guardando datos personales sin un plazo**, y ese es el tipo de cosa que no duele
nunca hasta el día que duele mucho — una inspección, un empleado enfadado, o un
cliente con personal en Europa.

**Lo que yo haría, y NO es borrar el registro de auditoría** —existe justamente
para poder mirar atrás—: **decir el plazo y cumplirlo.** Dos años de auditoría
en la hoja, lo anterior exportado a un fichero en el Drive del cliente y fuera
de la hoja viva; el registro de errores, 90 días y a la basura, que a nadie le
sirve un error de hace un año. Y escribirlo en los Términos, que hoy no dicen
nada de esto.

---

## 5 · ⚪ LA FIRMA SE COMPARA CON `!==` — MEDIDO Y DESCARTADO

```js
if (sig !== expect) return '';
```

Una comparación de cadenas normal termina en cuanto encuentra una diferencia, y
en teoría el tiempo que tarda filtra información sobre la firma correcta.

**Aquí no sirve, y conviene dejar escrito por qué** para que nadie lo vuelva a
levantar: entre el atacante y esa línea hay una petición HTTPS a Apps Script,
cuyo tiempo de respuesta varía en **decenas de milisegundos** por motivos que no
tienen nada que ver; la señal que se busca está en los **nanosegundos**. Y para
que sirviera de algo habría que medir millones de intentos, que es justo lo que
el limitador de peticiones sí corta.

**No se cambia. Queda anotado para no volver a mirarlo.**

---

## LO QUE FALTA

**Parte 4 — lo que Google puede cambiar debajo:** cuotas por cuenta, el límite
de seis minutos por ejecución, el tope de celdas, y qué se rompe si cambian las
reglas de las apps no verificadas o las del Marketplace.

**Y el análisis estructural**, que es la otra mitad del encargo.
