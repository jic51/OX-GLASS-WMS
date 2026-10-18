# Prueba 1b — la app web · 20 minutos

Esto reutiliza la hoja **PRUEBA 1 CLIC** que ya existe. **No hagas una hoja
nueva.**

Mide tres cosas:

| | Pregunta |
|---|---|
| 1 | ¿Desaparece la pantalla de «Google no ha verificado esta aplicación»? |
| 2 | ¿Funciona en el teléfono? |
| 3 | ¿Cuánto tarda de verdad el despliegue? |

---

## 1 · Cambiar el código del ORIGINAL

Abre `PRUEBA 1 CLIC` → **Extensiones → Apps Script**.

### `Código.gs`

**Selecciona todo lo que hay y bórralo.** Pega `web/Codigo.gs`.

> **Borrar, no añadir.** Si se queda el `onOpen` de antes, el script vuelve a
> usar `getUi()`, vuelve el permiso sensible, y la prueba mide justo lo contrario
> de lo que dice medir.

### `appsscript.json`

Lo mismo: **borra todo** y pega `web/appsscript.json`. Tiene que quedar **un solo
permiso**.

### `Panel.html`

**No lo toques.** Sirve igual.

Guarda (💾).

## 2 · Hacer la copia — con tu propia cuenta vale

El punto de hacer una copia es que la copia estrena un **proyecto de Cloud
automático**, que es lo que tendrá cualquier desconocido. Sirve tu cuenta: lo que
se mide es el proyecto, no quién eres.

Abre el enlace que termina en `/copy` y pulsa **Hacer una copia**.

## 3 · Desplegar — ⏱️ ARRANCA EL CRONÓMETRO

En la copia: **Extensiones → Apps Script → Implementar → Nueva implementación**.

- Tipo: **App web**
- Ejecutar como: **Yo**
- Quién tiene acceso: **Cualquier usuario**

Pulsa **Implementar**. Google pide autorización.

**📸 FOTO — LA QUE IMPORTA.** Fotografía **todas** las pantallas que salgan, una
por una. Lo que hay que buscar:

> ⚠️ **Google no ha verificado esta aplicación**

- **NO sale** → camino **1b**. Se acabó el susto, y encima funciona en el
  teléfono.
- **SÍ sale** → camino **1a**. Lo asumimos y lo adelantamos en el vídeo.

Copia la **dirección `/exec`** antes de cerrar el cuadro.

⏱️ **Para el cronómetro.** Apunta el tiempo real desde el paso 3. Ése es el
precio de este camino.

## 4 · Que funcione

Abre la dirección `/exec` en el navegador.

**📸 FOTO** — el panel, con las tres cifras. Pulsa **Escribir una fila** y
fotografía el mensaje.

## 5 · EL TELÉFONO

Mándate la dirección `/exec` por correo o WhatsApp y **ábrela en el teléfono**.

**📸 FOTO** — lo que se vea.

Esto es lo que la ventana dentro de la hoja **no podía hacer**. Si funciona,
deja de haber una versión gratis «de computadora» y pasa a haber una versión
gratis de verdad, que es un teléfono en la bodega.

Pulsa el botón también desde el teléfono. Que escriba desde ahí es la prueba
entera.

---

## Lo que hay que mandarme

| | Pregunta | Respuesta |
|---|---|---|
| 1 | ¿Salió «Google no ha verificado esta aplicación»? | sí / no |
| 2 | Minutos reales del despliegue | `____` |
| 3 | ¿Abrió en el teléfono? | sí / no |
| 4 | ¿Escribió la fila desde el teléfono? | sí / no |

## Un aviso para que nadie saque conclusiones de más

La prueba se hace con tu cuenta. Google puede enseñarle algo distinto a un
desconocido. **Si sale limpia, hay que repetirla con otra persona antes de
montar el embudo encima** — pero si sale sucia, ya sabemos bastante: con tu
propia cuenta no va a ser más suave que con la de un extraño.
