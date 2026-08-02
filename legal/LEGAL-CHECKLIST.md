# Checklist antes de llevar el ToS al abogado

Este documento acompaña a `TERMS-OF-SERVICE.md`. Está en español porque es para
ti, no para el cliente. El ToS está en inglés porque tus clientes son empresas
en EE.UU.

**Nada de esto es asesoría legal.** El objetivo es que llegues donde el abogado
con las decisiones ya tomadas, porque cobran por hora y "no sé todavía" es la
parte cara.

---

## A. Bloqueador arquitectónico #1 — ¿quién es dueño del despliegue?

**Esta es la decisión más importante del documento entero.** Define si tu
exposición legal es baja o alta, y hoy no está resuelta.

El código exige este modo de despliegue (`Code_v3_fixed.gs:154`):

```
Deployment REQUIRED: "Execute as: Me (owner)" + "Who has access: Anyone with a
Google account"
```

`Execute as: Me (owner)` significa que **todo el código corre con los permisos
del dueño del proyecto de Apps Script**, no del usuario que hace clic. Eso es lo
que permite que empleados externos usen la app sin darles acceso directo al
Sheet — es una decisión de diseño correcta. Pero tiene una consecuencia legal
enorme según quién sea ese "owner":

| Modelo | Dueño del Apps Script | Tu acceso a los datos del cliente | Tu exposición legal |
|---|---|---|---|
| **A — Cliente dueño** | El cliente | **Ninguno** | Baja. Eres proveedor de software. |
| **B — Tú dueño** | Tú | **Total y permanente** | Alta. Eres *data processor*. |

En el **Modelo B** el ToS actual es **falso**: la Sección 7.2 dice que no tienes
acceso a los datos, y sí lo tendrías — a todo el inventario, proveedores, precios
y correos de cada cliente, simultáneamente. Firmar eso sería declarar algo
incorrecto en un contrato. Además te obligaría a:

- acuerdo de procesamiento de datos (DPA) con cada cliente,
- notificación de brechas,
- controles de acceso internos auditables,
- y tu propio seguro de responsabilidad cibernética.

**Recomendación: Modelo A.** El cliente es dueño de su copia. Tú entregas e
instalas. Es más trabajo de onboarding, pero es exactamente el argumento de
venta que ya tienes ("tus datos nunca salen de tu cuenta de Google") y reduce tu
riesgo a casi nada.

**Implicación práctica del Modelo A:** para dar soporte necesitarás que el
cliente te dé acceso temporal y explícito. Eso hay que diseñarlo, no
improvisarlo.

- [ ] **Decidir: Modelo A o B.** Todo lo demás depende de esto.

---

## B. Bloqueador arquitectónico #2 — los documentos subidos son públicos

Encontrado durante esta revisión. No estaba en la auditoría inicial.

Cada archivo que la app sube a Drive se marca como **"cualquiera con el enlace
puede ver"**, sin autenticación:

| Archivo | Qué se hace público |
|---|---|
| `Code_v3_fixed.gs:2002` | Fotos de racks |
| `Code_v3_fixed.gs:2075` | **Adjuntos de movimientos: facturas, POs, remisiones** |
| `Code_v3_fixed.gs:2163` | Imágenes de reportes |
| `Code_v3_fixed.gs:2239` | PDFs generados |

El enlace queda guardado en el Sheet (columna `DOC_LINKS`) y se manda por
correo. Cualquiera que reenvíe ese correo, comparta el Sheet o exporte un
reporte está regalando acceso permanente a facturas de proveedores con precios.

**Por qué importa comercialmente:** estás por vender esto a empresas. La primera
pregunta de seguridad de un cliente serio va a ser "¿dónde viven mis
documentos?". La respuesta hoy es "en URLs públicas". Eso mata la venta, y peor,
si no lo dices y hay una fuga, es responsabilidad tuya por omisión.

**Por qué NO lo arreglé en el commit de hoy:** cambiarlo a privado rompería la
visualización de documentos para los usuarios externos de OX Glass **esta
semana**, que es justo lo que pediste evitar. Los archivos pertenecen al dueño
del script; si dejan de ser públicos, un usuario externo que abra el enlace verá
"solicitar acceso" en vez del documento. Requiere una solución diseñada, no un
cambio de una línea.

**Opciones para arreglarlo (a evaluar juntos):**

1. Servir los archivos a través de la propia app, que ya sabe quién eres, en vez
   de enlaces directos a Drive. Es lo correcto, y es el más trabajo.
2. Compartir cada archivo explícitamente con los correos de los usuarios
   registrados. Más simple, pero se degrada con muchos usuarios.
3. Carpeta de Drive compartida con un grupo de Google que contenga a los
   usuarios. Intermedio, y delega la gestión a Google.

- [ ] **Decidir cómo se arregla**, y arreglarlo **antes** de vender a un tercero.
- [ ] Mientras no esté arreglado, la Sección 7.4 del ToS lo divulga. Esa cláusula
      se borra el día que se arregle.

---

## C. Decisiones de negocio que el ToS necesita

Cada `[CORCHETE]` en `TERMS-OF-SERVICE.md` es una de estas.

### Entidad y jurisdicción
- [ ] ¿Bajo qué entidad legal vendes? (No vendas software B2B a título personal —
      una LLC separa tu patrimonio del riesgo del negocio. Esto es lo primero que
      te va a decir el abogado.)
- [ ] Estado de constitución y estado de ley aplicable (§ 17.1).
- [ ] ¿Arbitraje o tribunales? (§ 17.2 — no lo copies de otro contrato.)

### Precio
- [ ] Monto y periodicidad (§ 4.1). Mencionaste que la competencia está en $300+/mes.
      Recuerda que tu costo marginal por cliente es casi cero, así que el precio
      es una decisión de posicionamiento, no de costos.
- [ ] ¿Por cuenta de Google, por usuario, o por volumen de inventario? El ToS
      asume **por cuenta**, que es lo más simple de administrar.
- [ ] Duración del término inicial y aviso de no-renovación (§ 4.2).
- [ ] Cobro de instalación/onboarding aparte. En el Modelo A el onboarding es
      trabajo real; no lo regales.

### Soporte y actualizaciones
- [ ] Horario y canal de soporte (§ 11.1).
- [ ] Tiempo de respuesta objetivo (§ 11.2). **No prometas tiempo de
      resolución ni uptime** — el uptime no depende de ti, depende de Google.
- [ ] Dijiste que las actualizaciones serán gratuitas. En § 10.1 eso se vuelve
      obligación contractual. Está redactado como gratuito **durante la
      suscripción**, que es lo correcto. No lo extiendas a "para siempre".
- [ ] Cuántas versiones atrás soportas (§ 10.3).

### Responsabilidad
- [ ] Confirmar el tope de 12 meses de fees (§ 14.3) con el abogado.
- [ ] Definir las excepciones al tope (§ 14.4).
- [ ] **Cotizar seguro de responsabilidad profesional (E&O) / cyber.** Un tope
      contractual no sirve si el cliente demanda igual y tú pagas la defensa de
      tu bolsillo. Para un producto que maneja inventario de terceros, esto no
      es opcional.

### Privacidad
- [ ] ¿Algún cliente tiene datos de residentes de California (CCPA) o de la UE
      (GDPR)? Si sí, hace falta un DPA además del ToS.
- [ ] La función de escaneo de Gmail lee correos de empleados. § 6.4 pone la
      obligación de consentimiento en el cliente — el abogado debe confirmar que
      eso es suficiente en los estados donde vendas.

---

## D. Deuda técnica que es también riesgo legal

No es trabajo de abogado, pero afecta lo que puedes prometer por escrito.

- [ ] **Sanitización contra inyección de fórmulas** — ✅ hecho en v7.3
      (rama `security/v7.3-injection-and-auth-fixes`).
- [ ] **Endpoints sin autenticación** — ✅ hecho en v7.3 (`getPublicUsers` y
      `exportMovementsCSV` del servidor eliminados).
- [ ] **Documentos públicos en Drive** — ❌ pendiente, ver sección B. *Bloqueador
      de venta.*
- [ ] **Auditoría de XSS** — pendiente. 120 usos de `innerHTML` en el frontend;
      existe un helper de escape (`_he()`) usado ~69 veces, pero no se verificó
      la cobertura completa. Antes de vender conviene cerrarlo.
- [ ] **Quitar el hardcode de OX Glass** — pendiente (es el punto #2 de tu lista;
      requiere trabajar sobre una copia).
- [ ] **Definir el límite de escala que estás dispuesto a soportar.** La § 8.4
      dice que el rendimiento se degrada con el volumen, pero deberías saber el
      número real (¿5.000 filas? ¿50.000?) antes de que un cliente lo descubra
      por ti. Vale la pena una prueba de carga.

---

## E. Qué llevarle al abogado

1. `TERMS-OF-SERVICE.md` con los corchetes ya resueltos.
2. Este checklist, con la sección A decidida.
3. Una descripción de una página del modelo de despliegue (quién es dueño de qué).
4. Las preguntas concretas:
   - ¿Es ejecutable el tope de responsabilidad en [ESTADO]?
   - ¿Necesito DPA además del ToS?
   - ¿LLC es suficiente o hace falta otra estructura?
   - ¿Qué seguro necesito y por qué monto?
