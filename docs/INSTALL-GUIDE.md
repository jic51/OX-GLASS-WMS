# Guía de instalación — Acopio

**Tiempo estimado: 5 minutos.** No necesitas saber programación. Solo una
cuenta de Google (Gmail normal o de empresa).

Al terminar vas a tener tu propio sistema de inventario, corriendo en tu propia
cuenta de Google, con tus datos en tu propio Google Drive. Nadie más —ni
siquiera nosotros— tiene acceso a tu información.

---

## Antes de empezar

Vas a recibir de nosotros **un enlace**. Ten ese enlace a la mano.

> **Importante:** hazlo desde una computadora (no el teléfono), con **una sola
> cuenta de Google abierta en el navegador**. Si tienes varias cuentas
> abiertas al mismo tiempo, Google se confunde sobre cuál usar y la
> instalación puede fallar de formas raras. Lo más seguro: una ventana de
> **incógnito**, con solo la cuenta que va a ser la dueña del sistema.

**¿Cuál cuenta debe ser la dueña?** La primera persona que abre el enlace y
completa la configuración se convierte automáticamente en el
**administrador**. Elige bien desde el principio.

---

## Paso 1 — Haz tu copia

1. Abre el enlace que te enviamos.
2. Te va a pedir **"Hacer una copia"**. Acepta.

Eso es todo. Ya tienes tu propio sistema — completamente tuyo, en tu Drive,
sin nada compartido con nadie más. El código va incluido en la copia; no hay
que instalar ni pegar nada.

---

## Paso 2 — Configura tu empresa

Al abrir tu copia, un asistente aparece automáticamente sobre la hoja
(si no aparece: menú **🏭 Acopio → 🚀 Set Up Acopio**).

Te va a pedir, en orden:

1. **Tu empresa** — nombre, tu correo, logo (opcional).
2. **Qué guardas** — categorías de material. Puedes elegir una plantilla
   (vidrio, construcción) o empezar en blanco.
3. **Dónde lo guardas** — tus racks/ubicaciones. Hay un generador automático
   (filas × niveles × lados) o puedes escribirlos a mano.
4. **Quién trabaja aquí** — tu equipo, con su rol (Admin / Bodega / Solo
   lectura).
5. **Proveedores y proyectos** — opcional, se puede saltar.

Nada de esto se pierde si cierras la ventana a medias — retoma donde ibas.

---

## Paso 3 — El único paso técnico (una sola vez)

Al final del asistente, te va a pedir **publicar tu sistema**. Es el único
paso donde vas a ver algo parecido a "código", y el asistente te lleva de la
mano:

1. **Extensiones → Apps Script**
2. Botón azul **Implementar (Deploy) → Nueva implementación**
3. Engranaje ⚙️ junto a "Seleccionar tipo" → **Aplicación web**
4. **Ejecutar como: Yo** · **Quién tiene acceso: Cualquier usuario con una
   cuenta de Google**
5. **Implementar**, luego **Autorizar acceso**

> **¿Sale "Google no ha verificado esta aplicación"?** Es normal — le estás
> dando permiso a tu propio sistema, no a una app pública. Clic en
> **Configuración avanzada → Ir a [tu proyecto] (no seguro)**.

6. Regresa a la pestaña del asistente y da clic en **"Ya lo hice — muéstrame
   mi link"**. El sistema verifica que funcionó y te entrega tu dirección web
   permanente.

**Guarda ese enlace** — es tu sistema. Compártelo con tu equipo (solo entrarán
quienes hayas dado de alta en el paso 4).

> ¿Se te perdió el enlace? Menú **🏭 Acopio → Open WMS App**, siempre desde tu
> hoja de cálculo.

---

## Ya tienes tu inventario en Excel

No lo captures a mano: **Configuración → Importar**. Guarda tu archivo como
**.csv** primero (un .xlsx será rechazado).

---

## Problemas comunes

**"Sign-in is not configured" / no me deja entrar**
Casi siempre es tener varias cuentas de Google abiertas en el navegador. Abre
una ventana de incógnito, entra solo con la cuenta dueña, y prueba de nuevo.

**Actualicé el código pero no veo los cambios**
Publicar una versión nueva no es lo mismo que guardar. En el editor:
**Implementar → Administrar implementaciones → ✏️ (editar) → Versión: Nueva
versión → Implementar**. Usa **Administrar implementaciones**, no "Nueva
implementación" — esa última crea una URL distinta y tu equipo seguiría
entrando a la vieja.

**Agregamos una función nueva y da error de permisos**
Fuérzalo así: en el editor de Apps Script, elige cualquier función en el menú
de arriba y presiona ▶ **Ejecutar**. Ahí aparece la ventana de autorización.

**No me llegan los correos de notificación**
Cuentas de Gmail normales: límite de 100 correos/día. Cuentas de Google
Workspace: 1,500/día.

---

## ¿Necesitas ayuda?

Dentro de la app, abajo a la derecha, hay un botón 🐞 (**Reportar un
problema**). Escribe qué pasó y adjunta una foto — nos llega directo.
