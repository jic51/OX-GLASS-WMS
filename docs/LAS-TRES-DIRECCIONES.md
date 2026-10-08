# ⚠️ LAS TRES DIRECCIONES QUE TIENEN QUE COINCIDIR

> **Si algo falla al entrar en la app, EMPIEZA POR AQUÍ.** Lo de abajo costó
> varias sesiones de trabajo y tres diagnósticos equivocados míos, y la causa
> era siempre la misma: **una dirección puesta en un sitio y no en otro.**

Jose, 2026-10-08, cuando lo encontró él: *"eran las URL. La URL debe estar en
las propiedades del script y también en Cloud dentro del OAuth ID, si no, no
deja entrar. El problema es que llevamos algunas sesiones con el mismo problema
pero no sabíamos qué detalle faltaba revisar."*

---

## La dirección de la que hablamos

Es la de tu app, y acaba en `/exec`:

```
https://script.google.com/macros/s/AKfycbz…MUY-LARGO…/exec
```

**La verdadera es UNA sola**, y está en:

> `Extensiones → Apps Script → Deploy → Manage deployments`
> → la implementación **Active** → campo **Web app · URL**

**Cópiala de ahí y de ningún otro sitio.** No de la barra del navegador: ahí
Google le añade cosas según con qué cuenta estés mirando (`/a/macros/…`,
`/macros/u/0/…`) y esas variantes **no sirven para pegarlas en ningún lado.**

---

## Dónde tiene que estar, y son tres sitios

| # | Dónde | Qué pasa si falta o está mal |
|---|---|---|
| **1** | **El despliegue** (`Manage deployments`) | Es la verdad. De aquí se copia |
| **2** | **Script Properties** → `WEB_APP_URL` **y** `OAUTH_REDIRECT_URI` | *Open WMS App* lleva a una página muerta; el correo de invitación manda un enlace roto |
| **3** | **Cloud Console** → *Credenciales* → tu cliente de OAuth → **Authorized redirect URIs** | **`Error 400: redirect_uri_mismatch`** — la ventana de "Sign in with Google" se bloquea y la app se queda esperando |

### Dónde está el nº 2, clic a clic

1. `Extensiones → Apps Script`
2. Engranaje ⚙️ **`Configuración del proyecto`**
3. Baja a **`Propiedades de la secuencia de comandos`**
4. Comprueba que **`WEB_APP_URL`** y **`OAUTH_REDIRECT_URI`** tengan **la misma
   dirección**, la del punto 1

### Dónde está el nº 3, clic a clic

1. `console.cloud.google.com` → el proyecto correcto arriba a la izquierda
2. **`APIs y servicios` → `Credenciales`**
3. En **`OAuth 2.0 Client IDs`**, abre el tuyo *(no el que dice `Apps Script`
   con el triángulo ⚠️ — ése lo hizo Google y no se toca)*
4. **`Authorized redirect URIs`** → **`+ Add URI`** → pega la dirección →
   **Save**
5. Google avisa de que tarda *"de 5 minutos a unas horas"*. Suele ser un par de
   minutos.

> **El nº 3 sólo hace falta si usas el inicio de sesión con Google** — es decir,
> si entra gente de fuera del dominio de la empresa. Si no lo usas, con el 1 y
> el 2 basta.

---

## Cómo se rompen solas, que es lo que lo hace traicionero

Ninguna de las tres avisa, y se desalinean en situaciones **normales**:

- **Al copiar la hoja.** La copia es un script nuevo con su propia dirección;
  las propiedades llegan en blanco y hay que rellenarlas.
- **Al crear un despliegue NUEVO** en vez de actualizar el que había. Dirección
  nueva, y las otras dos siguen apuntando a la vieja.
- **Al cambiar el proyecto de Cloud.** El cliente de OAuth es otro, y el nuevo
  nace sin ninguna dirección autorizada.
- **Al renombrar la empresa** no pasa nada con esto — eso afecta a las
  carpetas, no a las direcciones.

---

## Los dos síntomas, y qué significa cada uno

| Lo que se ve | Qué falta |
|---|---|
| **"Acceso bloqueado — Error 400: redirect_uri_mismatch"** en la ventana de Google | **El nº 3.** La dirección no está en el cliente de OAuth |
| **"Sorry, unable to open the file at this time"** (pantalla de Google Drive) | **El nº 2**, o estás usando una dirección de otra copia |
| La app dice *"Waiting for sign-in…"* y no pasa nada | Casi siempre el **nº 3** — la ventana murió y la app no puede verla |
| *"Access not granted — this account is not registered"* | **Esto NO es de direcciones.** Es `USERS_V3`: ese correo no está dado de alta, o está mal escrito |

---

## Lo que la app comprueba sola, desde la v12.52

- **Antes de abrir la ventana de inicio de sesión**, compara la dirección de
  vuelta con la de la app. Si no son la misma, lo dice en el acto en vez de
  abrir una ventana que no puede volver.
- **A los 30 segundos** de espera nombra `redirect_uri_mismatch` y dice dónde
  se arregla, en vez de callarse cuatro minutos.
- **`🏭 Acopio → 🔧 Advanced → 🩺 Check this installation`** compara `WEB_APP_URL`
  con `OAUTH_REDIRECT_URI` y repara la segunda si apunta a otro despliegue.

**Lo que la app NO puede comprobar, y hay que mirar a mano:** el punto 3. La
ventana de Google es de otro dominio y la app no puede leer lo que dice. **Por
eso esta página existe.**

---

## La comprobación de un minuto, para hacer siempre al terminar una instalación

1. Abre `Manage deployments` y **copia** la URL.
2. Pégala en un bloc de notas.
3. Abre Script Properties y **compara** `WEB_APP_URL` y `OAUTH_REDIRECT_URI`.
   ¿Idénticas a la del bloc?
4. Si usas inicio de sesión con Google: abre el cliente de OAuth y **comprueba
   que esa misma dirección esté en la lista.**
5. **Entra desde otro navegador o en incógnito, con la cuenta de otra persona.**
   Esto es lo único que prueba las tres a la vez.

**El paso 5 es el que vale.** Los otros cuatro se pueden mirar y dar por buenos
sin que funcione; entrar de verdad, no.
