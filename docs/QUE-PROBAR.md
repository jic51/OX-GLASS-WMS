# Qué probar — lo que ninguna prueba automática puede cubrir

> Jose, 2026-09-29: *"¿qué más debería probar en la app?"*

Hay 120 pruebas automáticas corriendo antes de cada entrega. Este documento es
lo que **no** pueden tocar, ordenado por cuánto dolería que fallara delante de
un cliente.

## La idea que ordena toda la lista

**Jose prueba siempre en la misma esquina del mundo:** como ADMIN, en su
portátil, con buena conexión, él solo, con datos que conoce de memoria. Eso deja
cuatro clases enteras sin tocar, y son justo las que muerden:

| Lo que Jose no puede variar solo | Lo que esconde |
|---|---|
| **Otro rol** | los permisos, que es lo que un cliente compra |
| **Otro aparato** | el teléfono, que es donde trabaja la bodega |
| **Otra persona a la vez** | las carreras entre dos guardados |
| **Otro volumen** | el techo de 6 minutos de Apps Script |

Todo lo de abajo es una de esas cuatro, o el caso raro que sólo aparece con
datos de verdad.

---

## 1. Entrar con otra cuenta — lo primero, y cuesta cinco minutos

### 1a. Un Gmail personal de fuera

**Por qué ahora:** Jose acaba de publicar el consent screen, y **que OX lleve
meses funcionando no prueba nada** — su gente entra por la puerta automática
(`Session.getActiveUser()`), que no toca el cliente OAuth. El camino OAuth puede
llevar meses sin ejercitarse.

**Cómo:** que alguien con un Gmail personal, **fuera de `@ox-glass.com` y fuera
de la lista de usuarios de prueba**, abra la URL de la app.

- Entra → está en producción. ✅
- *"Access blocked… is currently being tested"* → sigue en Testing.

**Es la única comprobación que vale.** Mirar la consola dice lo que la consola
cree; esto dice lo que le pasa a un cliente.

### 1b. Un usuario WAREHOUSE y un VIEWER

**Por qué:** los permisos son lo que un cliente compra —"que el de bodega no
pueda borrar mis costos"— y Jose no los ha visto nunca desde dentro, porque
siempre es ADMIN.

Crea dos cuentas en Manage Users, entra con cada una (ventana de incógnito
sirve) y comprueba:

- [ ] **VIEWER no puede escribir nada.** Ni entrada, ni salida, ni editar, ni
      borrar. Ni un botón que parezca que sí y luego falle.
- [ ] **WAREHOUSE no ve costos** si no tiene el permiso. Ni en la tabla, ni en
      el CSV, ni en Project View.
- [ ] **WAREHOUSE sin `canEditMovements` no ve ✏️ ni 🗑** — y tampoco las
      casillas de selección.
- [ ] **Ninguno de los dos entra a Settings** donde no debe.
- [ ] Enciende `canEditMovements` a uno y comprueba que **aparece sin tener que
      volver a entrar**.

> Lo que se busca no es "sale un error": es que **la puerta ni se vea**. Un
> botón que existe y luego dice que no se puede es una promesa rota.

---

## 2. El teléfono — donde de verdad se usa

La bodega no trabaja en un portátil. Con el teléfono de verdad, no encogiendo
la ventana del navegador:

- [ ] Registrar una **entrada completa** con foto adjunta, de pie, con una mano.
- [ ] Registrar una **salida** con material y ubicación.
- [ ] El **Warehouse Map** — ¿se puede tocar un estante con el dedo?
- [ ] Buscar un material y leer su cantidad **sin hacer zoom**.
- [ ] Las tablas, ¿se pueden desplazar de lado sin perder el nombre?

**Qué anotar:** cada vez que tengas que hacer zoom, cada vez que falles un
botón, y cada pantalla donde el teclado tape lo que estás escribiendo.

---

## 3. Los adjuntos — el fallo que más asusta

Los documentos y fotos **no viven en la hoja**, viven en carpetas del Drive. Es
la parte con más piezas y la que peor se ve cuando falla.

- [ ] Adjuntar **una foto** en una entrada y volver a abrirla al día siguiente.
- [ ] Adjuntar **un PDF** y abrirlo.
- [ ] Adjuntar **varios** en un mismo movimiento.
- [ ] Abrir un adjunto **viejo**, de hace meses.
- [ ] Que lo abra **otra persona**, no Jose — el permiso del archivo es de quien
      lo subió, y esto es lo que no se puede comprobar desde una sola cuenta.
- [ ] El **lector con IA**: subir un packing list de verdad, de un proveedor de
      verdad, y ver si acierta. Y probar uno **malo** — torcido, con sombra, o
      de un proveedor con un formato raro — porque lo que importa es qué hace
      cuando no entiende: tiene que decirlo, no inventar.

---

## 4. Los correos — nadie los ve hasta que faltan

Cuatro caminos que salen del sistema solo, y por eso ninguno se prueba por
accidente:

- [ ] **Reporte diario** — que llegue a la hora configurada, y que un día sin
      movimientos diga "(no movements)" en vez de no llegar.
- [ ] **Alertas de stock mínimo** — baja un material por debajo de su mínimo a
      propósito y espera el aviso.
- [ ] **Aviso de error** — desde v12.14, si el archivado nocturno falla, tiene
      que llegar un correo. Esto no había forma de saberlo el 26/09.
- [ ] **Check-in** — que llegue al `SUPPORT_EMAIL` y que diga sólo lo que la
      política promete que dice.

---

## 5. Varias personas a la vez — la que ningún test sustituye

Ya está documentada como pendiente en `ANTES-DE-VENDER.md` §7, y sigue siéndolo.
Tres o cuatro navegadores contra la copia de prueba, **a la vez**:

- [ ] Dos salidas **del mismo material, del mismo estante**, en el mismo
      segundo. Sumar a mano y comparar.
- [ ] Uno borra un movimiento mientras otro lo edita.
- [ ] Uno renombra una categoría mientras otro guarda en ella.
- [ ] Dos personas restaurando **el mismo** movimiento de la papelera.

**Qué se busca:** que al final los números cuadren, y que quien perdió la
carrera lo sepa — no que se le diga que funcionó.

> El guion está en `GUION-PRUEBA-CONCURRENCIA.md`.

---

## 6. El volumen — el techo de los 6 minutos

Apps Script corta una ejecución a los 6 minutos. El motor de stock ya se midió y
crece de forma lineal (`test-scale.js`), así que el sospechoso es leer y escribir
en Sheets, no calcular.

- [ ] **Importar** un archivo grande de verdad (500+ filas).
- [ ] **Rebuild Stock Totals** sobre el archivo entero, cronometrado.
- [ ] **Borrar 20 movimientos de golpe**.
- [ ] **Check my data** sobre las 1.271 filas.

**Anota el tiempo de cada uno.** No hace falta que sea rápido; hace falta saber
a cuántas filas deja de terminar, porque eso decide qué se le puede prometer a
un cliente grande.

---

## 7. Lo que cambió esta semana — repaso corto

Cosas que acaban de moverse y merecen una pasada antes de olvidarlas:

- [ ] **v12.21 — la papelera.** Borra una salida, saca el mismo material otra
      vez, e intenta devolver la primera. Tiene que **negarse** y dejarla en la
      papelera. (Éste ya lo hiciste.)
- [ ] **v12.21 — Check my data** sobre los datos reales: ¿queda alguna tarjeta
      roja *Less than nothing*?
- [ ] **v12.20 — ＋ Add a pack** en Settings → Materials, con un material que no
      tenga factor todavía. Y comprobar que **rechaza** un nombre que no existe.
- [ ] **v12.20 — el orden alfabético** en los desplegables del formulario.
- [ ] **v12.15 — las etiquetas**: hacer una entrada **sin marcar ninguna** y
      comprobar que la ventana de impresión no se abre.
- [ ] **Las etiquetas en la impresora térmica de verdad**, en 4×6. Que salgan del
      tamaño correcto y se lean a un metro de distancia.

---

## 8. Los datos raros — los que sólo aparecen con historia de verdad

- [ ] Un PO como **`07-6329`** o **`0012`**: guardarlo, borrarlo, restaurarlo
      desde la papelera, y comprobar que sigue diciendo lo mismo. Es el fallo
      del 09/09 y el que más silenciosamente destruye información.
- [ ] Un nombre de material **con acentos, comillas o barras**.
- [ ] Una cantidad **fraccionada** (2.5).
- [ ] Un material que exista en **dos categorías** — ya lo tienes:
      `SR-MM213-TT-091026` está en WINDOW y en SCREEN. Comprobar que se cuentan
      por separado en todas las pantallas.
- [ ] **Renombrar un material** con historia y después hacer Rebuild Stock
      Totals: los totales tienen que cuadrar igual.

---

## 9. Lo aburrido que nadie prueba

- [ ] **Cerrar sesión y volver a entrar.**
- [ ] Dejar la app abierta **toda la noche** y usarla por la mañana sin recargar.
- [ ] **Dos pestañas abiertas** de la misma app: guardar en una y mirar la otra.
- [ ] **Quitar el wifi** a media carga y volver a ponerlo.
- [ ] El **botón de atrás** del navegador.
- [ ] **CSV**: exportarlo y abrirlo en Excel — que los PO no se conviertan en
      fechas ahí tampoco.

---

## Cómo anotar lo que encuentres

Tres datos y con eso basta:

1. **Qué esperabas** que pasara.
2. **Qué pasó.**
3. **Qué hiciste justo antes**, aunque parezca que no tiene que ver.

El tercero es el que más vale y el que siempre falta. El fallo de la papelera se
resolvió porque Jose contó la secuencia completa —borré, restauré, volví a
borrar—, no porque contara el síntoma.

Y si sale un número raro, **la captura de la hoja vale más que la captura de la
app**: la app enseña el resultado de la aritmética, y la hoja enseña de dónde
salió.
