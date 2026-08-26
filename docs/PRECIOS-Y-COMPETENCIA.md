# Precios y competencia — investigación de mercado (agosto 2026)

Datos verificados contra fuentes públicas, listadas al final. Se actualiza
cuando cambien los precios de los competidores o cuando tengamos clientes
reales de los que aprender.

---

## Qué cobra el mercado

| Producto | Precio | Modelo |
|---|---|---|
| **Sortly** Advanced | $29/mes anual · $49/mes mensual | Plano |
| **Sortly** Ultra | $89/mes | Plano |
| **Zoho Inventory** | Gratis · $29–$99/mes por organización | Plano |
| **inFlow** | ~$110/mes por 2 usuarios | **Por usuario** |
| Promedio del sector | **~$150/usuario/mes** (~$1,530/usuario/año) | Por usuario |
| Rango típico PyME | $50–$300/mes | Varios |
| Gama básica | $20–$50/mes | Plano |
| Enterprise | $5,000+/mes | Cotización |

Dos datos del mercado que importan más que la tabla:

1. **El primer año siempre cuesta más.** Onboarding, hardware e integraciones
   a menudo **igualan** el costo de la suscripción. Cobrar instalación aparte
   es la norma de la industria, no algo que haya que justificar.
2. **El costo oculto del cliente que NO compra nada** son 3–5 horas por semana
   de reconciliación manual. Ese es el número contra el que se vende, no
   contra el precio de Sortly.

---

## Contra quién competimos de verdad

**No es Sortly. Es "una hoja de cálculo desordenada" o papel.**

Es la decisión más importante de este documento, porque cambia todo el
encuadre: no estamos peleando por ser más baratos que Sortly, estamos
peleando contra la inercia de seguir haciéndolo a mano. El cliente objetivo
no está comparando software — está aguantando un problema.

### Dónde ganamos

- **Sin cobro por usuario.** Es el argumento más fuerte y no nos cuesta nada:
  Google Sheets no cobra por usuario. Una bodega de 8 personas paga lo mismo
  que una de 1. En inFlow serían $440+/mes.
- **Los datos viven en el Drive del cliente.** Sin migración, sin miedo a
  quedarse encerrado, y si deja de pagar su sistema sigue funcionando. Ningún
  SaaS puede decir eso.
- **Trabaja con lo que ya tienen.** Google Sheets, Drive, Gmail. Nada nuevo
  que aprender ni que administrar.
- **Instalación hecha por nosotros.** El competidor barato te manda un enlace
  y suerte.

### Dónde perdemos, y hay que decirlo

- **Sin códigos de barras ni escáner.** Todo competidor serio lo tiene, y un
  comprador de bodega lo pregunta.
- **Sin conteo cíclico.** Diseñado (ver `BACKLOG.md`), sin construir.
- **Sin app móvil nativa.** Es web; funciona en el teléfono, pero no está en
  las tiendas.
- **Sin integraciones** con contabilidad ni e-commerce.
- **Techo de escala heredado de Google Sheets** (ver abajo).
- **Instalación manual por cliente** (~5 min de Cloud Console cuando hay gente
  fuera del dominio). No escala a decenas de clientes por mes sin cambiar algo.

---

## ✅ PRECIO DECIDIDO (v10.8) — un producto, con complementos

Jose revisó una propuesta de tres planes (Esencial / Profesional / Avanzado) y
la descartamos por una razón estructural, no de gusto:

**El tiering por FUNCIONES no se puede hacer cumplir en esta arquitectura.** El
código corre dentro de la cuenta de Google del cliente; puede abrir el editor
de Apps Script. Un "plan sin módulo de costos" es un interruptor que él mismo
puede voltear. Y construir ese bloqueo cuesta ingeniería real, triplica lo que
hay que probar en cada versión, y hace que cada reporte de bug empiece con
"¿en qué plan estás?".

Se cobra, entonces, por lo que **sí** es exigible: lo que consume tiempo de
Jose o tiene un costo real detrás.

### Base
| | |
|---|---|
| Instalación | **$500**, una sola vez |
| Suscripción | **$49/mes** o **$490/año** (2 meses gratis) |

### Complementos
| | Instalación | Mensual |
|---|---|---|
| Bodega adicional | +$250 | +$25 |
| Soporte prioritario (4 h hábiles, WhatsApp) | — | +$20 |
| Lector de correos gestionado (llave nuestra) | — | +$15 |
| Migración de su histórico | $300–$800 | — |
| Capacitación extra, por sesión | $150 | — |

**Precio fundador — los primeros 3 clientes:** $39/mes congelado para siempre,
a cambio de permiso para usar su nombre y sus números. No es bajar el precio,
es comprar material de venta.

**Congelado mientras NO se vayan.** Jose (v11.20): quien cancela y regresa
vuelve como cliente nuevo — precios vigentes, sin precio fundador y sin los
beneficios que tenía, incluida la instalación si hay que rehacerla. Está en la
sección 9 de los Términos, no solo aquí, porque es de las cosas que se
discuten y hay que poder señalarlas.

**El lector de correos** es el único complemento que corresponde a una función,
y solo porque tiene un costo real detrás: necesita una llave de API de Gemini.
Si la pone el cliente (v10.8 lo permite desde Settings → System), es gratis. Si
la ponemos y administramos nosotros, se cobra.

**Cuándo subir a $59–$69:** cuando existan códigos de barras y conteo cíclico.

### Errores corregidos de la propuesta de tres planes

1. Trataba como "por crear" el lector de correos, el costo promedio ponderado y
   el archivado automático. **Los tres están en producción** (v9.61, v9.78, y
   el archivado desde antes). Eso invalidaba su consejo de "vender el mapa de
   ruta" con esas funciones.
2. La suma estaba mal: 60/20/20 sobre 100 clientes da **$5,300/mes**, no
   $4,900.
3. "Margen operativo del 95%" es cierto solo si el tiempo de Jose vale $0. Con
   las horas de `PLAN-5-ANIOS.md`, el margen real del Año 3 ronda el **52%**.

### La conclusión que vale más que el precio

El cuello de botella son horas, no dinero. Y eso invierte la intuición:

| | Ingreso/mes | Carga |
|---|---|---|
| 100 clientes a $39 | $3,900 | ~16 h/semana |
| 50 clientes a $79 | $3,950 | **~8 h/semana** |

**Cuando el límite son horas, el precio es la palanca, no el volumen.** Y
"plantillas por industria" deja de ser una función bonita: es la que baja la
instalación de 3 h a 1 h y por lo tanto la que multiplica cuántos clientes
caben antes de contratar. Vale más, en dinero, que cualquier ajuste de precio.

Ver `LICENCIA-E-INTEGRIDAD.md` para qué pasa cuando dejan de pagar.

---

## Precio anterior (v9.96) — se conserva por el razonamiento

- **Instalación: $400, una sola vez.** Es trabajo real — instalar, configurar,
  capacitar, y OAuth si hace falta. Coincide con lo que la industria ya cobra
  como onboarding.
- **Soporte + actualizaciones: $39/mes**, o **$390/año** (dos meses gratis).

Por qué $39, y no más ni menos:

- **Debajo del mensual de Sortly ($49)** y a la par de su precio anual.
  Comparable de frente sin ser el más barato.
- **Encima de la línea de "demasiado barato para ser serio" (~$20).** Es un
  sistema donde una empresa confía su inventario; un precio de juguete espanta
  al comprador que más nos conviene.
- **Sin cobro por usuario**, que es donde el número se vuelve imbatible en
  cuanto la bodega tiene más de dos personas.
- Encaja con lo ya decidido: las actualizaciones se cobran dentro del soporte
  mensual, no como upgrade suelto.

### Cuándo subir el precio

- Cuando **códigos de barras** y **conteo cíclico** existan: ahí el producto
  compite de frente con Sortly Advanced y $49–$59 es defendible.
- Cuando haya **10 clientes pagando sin quejarse del precio** — señal clara de
  que está por debajo del valor.
- Subir **solo para clientes nuevos**. Los existentes conservan su precio: es
  barato de conceder y compra lealtad y recomendaciones.

### Cuándo NO bajarlo

Casi nunca. Si no cierran ventas, el problema rara vez es el precio en este
rango — es que falta algo del cuadro de "dónde perdemos", o que el cliente no
tenía el problema. Bajar el precio a un cliente que no tiene el problema solo
consigue un cliente que paga poco y pide mucho.

La excepción legítima: **descuento por caso de estudio** para los 2–3
primeros, a cambio de permiso para usar su nombre y sus números. Eso no es
bajar el precio, es comprar material de venta.

---

## Techo de escala — lo que sabemos y lo que no

**Medido** (`tools/test-scale.js`): el motor de stock (`calculateStock`) es
**lineal**. 100,000 movimientos se recalculan en ~0.4 s de cómputo puro, sin
degradación. El algoritmo no es el problema.

**No medido, y es donde está el riesgo real:**
- Tiempo de lectura/escritura de Google Sheets (el costo verdadero).
- El **límite de 6 minutos por ejecución** de Apps Script.
- **Edición concurrente.** La literatura sobre hojas de cálculo como sistema
  de inventario dice que los conflictos de edición simultánea rompen la
  integridad **antes** que el rendimiento. Acopio escribe desde el servidor,
  no desde la hoja, lo que ayuda — pero no está probado con 3–4 personas
  guardando a la vez.
- Cuotas de Apps Script: 100 correos/día en cuentas normales, 1,500/día en
  Workspace.

**Mitigaciones que ya existen:** hojas derivadas de stock
(`buildStockFromDerivedSheets_`), archivado de movimientos viejos, y lectura
solo de la cola del log de auditoría.

**Qué decirle a un cliente hoy, con honestidad:** el sistema está probado
cómodamente en el rango de una bodega pequeña o mediana. Para una operación
con decenas de miles de movimientos al año hay que medirlo antes de prometer
nada.

---

## Fuentes

- [inFlow — costo de software de inventario 2026](https://www.inflowinventory.com/blog/inventory-management-software-cost/)
- [Brahmin Solutions — $50–$500/mes](https://www.brahmin-solutions.com/blog/what-is-the-average-cost-of-an-inventory-management-system)
- [Unleashed — costo promedio](https://www.unleashedsoftware.com/product/inventory-management-software/average-cost-inventory-management-software/)
- [Zoho Inventory — comparación de precios](https://www.zoho.com/us/inventory/pricing-comparison/)
- [Capterra — Zoho Inventory vs Sortly](https://www.capterra.com/compare/146241-169199/Zoho-Inventory-vs-Sortly-Pro)
- [FounderJar — precios de Sortly](https://www.founderjar.com/sortly-pricing/)
- [Inventory Planner — límites de las hojas de inventario](https://www.inventory-planner.com/inventory-sheets/)
- [Inventory System Solutions — retos de Google Sheets para inventario](https://inventorysystemsolutions.com/challenges-and-best-practices-for-google-sheets-inventory-management-system/)
