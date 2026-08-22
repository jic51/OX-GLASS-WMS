# Antes de vender — lista priorizada

Qué falta antes de cobrarle a la primera persona. Ordenado por riesgo real,
no por esfuerzo.

---

## Bloqueantes — no se vende sin esto

### 1. ~~Política de Privacidad desactualizada~~ ✅ HECHO (v9.96)

v9.77 agregó el check-in automático (correo a `SUPPORT_EMAIL` con nombre de
empresa, correo del admin y conteos) mientras la política, en sus dos copias,
seguía diciendo que no recibimos nada. Corregido en `legal/PRIVACY-POLICY.md`
y en la copia dentro de la app, y `tools/test-legal-sync.js` impide que las
dos vuelvan a divergir.

### 2. Plantilla maestra limpia — acción de Jose

Herramientas listas desde v9.30 (Advanced → Erase everything / Check if
clean). Falta lo que solo Jose puede hacer: renombrar el proyecto de Apps
Script, compartir como Viewer, generar el link `/copy`, y **copiarla él mismo
una vez para ver lo que ve un cliente**. Ver `docs/MASTER-TEMPLATE.md`.

### 3. Probar una restauración de backup, de principio a fin

**Nunca se ha hecho.** El procedimiento está escrito y auditado contra el
código en `docs/RESTAURAR-UN-BACKUP.md`, y ya reveló un hallazgo serio: el
backup copia la hoja, pero **las Script Properties no viven en la hoja**, así
que una restauración recupera todos los datos y **ninguna** de la
configuración — incluido `FOLDER_PREFIX`, sin el cual **todos los adjuntos
dejan de abrir**.

Hacerlo una vez en una copia de prueba. Un backup que nunca se restauró no es
un backup.

### 4. acopio.com y la página de novedades

Sin landing no hay a dónde mandar a nadie, y bloquea también el hipervínculo
del nombre "Acopio" dentro de la app y la tarjeta de reenganche. Ver
`docs/LANDING.md`.

### 5. Cómo se cobra

Ni decidido ni construido. Para los primeros clientes, factura manual está
bien — pero hay que decidir el mecanismo y que la instalación no dependa de
que Jose recuerde cobrar.

---

## Importantes — no bloquean la primera venta, sí la décima

### 6. Prueba de concurrencia

Lo que la literatura señala como el punto de quiebre de las hojas de cálculo
como inventario **no es el rendimiento, son los conflictos de edición
simultánea**. Acopio escribe desde el servidor y no desde la hoja, lo que
ayuda mucho, pero nadie ha probado 3–4 personas guardando movimientos a la
vez. Es exactamente lo que hace una bodega en la mañana.

### 7. Límite de 6 minutos por ejecución

Una importación grande o una reconstrucción de stock podría chocar contra el
techo de Apps Script. No probado. El motor de stock ya se midió y es lineal
(`tools/test-scale.js`), así que el sospechoso es la lectura/escritura de
Sheets, no el cálculo.

### 8. Onboarding manual por cliente

El paso de OAuth en Cloud Console (~5 min) es tolerable con 5 clientes y
molesto con 50. Las alternativas están evaluadas en `BACKLOG.md` (sección
*"Open decision — external sign-in for customers"*). No hace falta resolverlo
para vender; sí para crecer.

### 9. Conteo cíclico (cycle count)

Diseñado en `BACKLOG.md`, sin construir. Todo sistema de inventario serio lo
tiene, y es la primera pregunta de un comprador con experiencia.

### 10. Códigos de barras / QR + etiquetas

Igual que arriba: es de las primeras cosas que pregunta un jefe de bodega.

---

## Menores — se pueden vender sin esto y arreglar después

- Columna de costo en el CSV y editar el costo de un movimiento ya guardado
- Visor de PDF real (necesita PDF.js)
- Sincronización entre ventanas abiertas (diseño ya decidido en `BACKLOG.md`)
- Pase de pulido: scrollbars, animaciones, feedback instantáneo en Materials
  to Receive
- Menú hamburguesa en pantallas pequeñas
- Iconos profesionales y logo definitivo

---

## Orden sugerido

1. Política de Privacidad ✅
2. Restaurar un backup de prueba **(el más barato y el de mayor riesgo real)**
3. Prueba de escala ✅ — motor medido y lineal; falta la parte de Sheets
4. Plantilla maestra limpia
5. Landing + página de novedades
6. Decidir el cobro
7. Prueba de concurrencia
8. Conteo cíclico y códigos de barras (esto ya es producto, no lanzamiento)

Los tres primeros son baratos y son riesgo real si un cliente los descubre
antes que nosotros.
