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

### 4. acopio.net y la página de novedades

Sin landing no hay a dónde mandar a nadie, y bloquea también el hipervínculo
del nombre "Acopio" dentro de la app y la tarjeta de reenganche. Ver
`docs/LANDING.md`.

### 5. Verificar que el consent screen esté "In production"

Un cliente OAuth en modo **Testing** limita a 100 usuarios y **las
autorizaciones caducan a los 7 días** — el login externo se rompería solo cada
semana. Acopio solo pide scopes básicos (`email`, `profile`), que se pueden
publicar sin verificación de Google. Es un interruptor, no un trámite: Cloud
Console → OAuth consent screen → confirmar **"In production"**. Detalle en
`docs/PLAN-5-ANIOS.md`.

### 6. Cómo se cobra

Ni decidido ni construido. Para los primeros clientes, factura manual está
bien — pero hay que decidir el mecanismo y que la instalación no dependa de
que Jose recuerde cobrar.

---

## Importantes — no bloquean la primera venta, sí la décima

### 7. ~~Prueba de concurrencia~~ ✅ AUDITADA (v9.99) — quedan dos cosas

`tools/test-concurrency.js` y `docs/CONCURRENCIA.md`. Resultado: **guardar
movimientos —lo más frecuente y lo más peligroso— está bien protegido**, con
la lectura dentro del candado y liberación en `finally`. Pero hay **siete
caminos más que cambian el stock sin candado**, y dos los toca un admin en un
día normal: editar un movimiento guardado, y renombrar una categoría (que
reescribe la celda Categoría de cada fila del archive — ese lo encontró la
prueba, no la lectura a mano).

**Paso 1 aplicado en v10.0:** los dos que un admin toca de verdad —editar un
movimiento guardado y renombrar una categoría— ya toman el candado, vía un
ayudante compartido `withStockLock_`. `addMovementsBatch_` **no se tocó**: el
camino más crítico sigue exactamente como estaba.

De paso se corrigió el diseño: no hace falta un candado reentrante. Como
`refreshDerivedSheets_` se llama desde *dentro* de cada camino de riesgo,
candar el de afuera cubre al de adentro solo. Detalle en `CONCURRENCIA.md`.

**Paso 2 aplicado en v10.4:** `manageMaterial`, `mergeConfigValues` y
`mergeLocations` ya toman el candado. Revisarlos destapó cuatro bugs viejos en
`manageMaterial` —escritura celda por celda, cero reconstrucción de las hojas
derivadas, ARCHIVE_HISTORY sin tocar y MatID viejos— que se arreglaron junto
con el candado, porque poner candado sobre un bucle lento es la regresión que
ya habíamos arreglado en v10.1.

Falta:
1. **Los dos caminos restantes** — `refreshDerivedSheets_` (ya cubierto de
   forma transitiva donde importa) y `menuNormalizeStatus` (lo corre el dueño
   desde el menú, rarísimo).
2. **La prueba en vivo** — tres o cuatro navegadores contra una copia
   desplegada, guardando del mismo material a la vez, y contar a mano. Ningún
   test desde fuera puede sustituirla.

### 8. Límite de 6 minutos por ejecución

Una importación grande o una reconstrucción de stock podría chocar contra el
techo de Apps Script. No probado. El motor de stock ya se midió y es lineal
(`tools/test-scale.js`), así que el sospechoso es la lectura/escritura de
Sheets, no el cálculo.

### 9. Onboarding manual por cliente

El paso de OAuth en Cloud Console (~5 min) es tolerable con 5 clientes y
molesto con 50. Las alternativas están evaluadas en `BACKLOG.md` (sección
*"Open decision — external sign-in for customers"*). No hace falta resolverlo
para vender; sí para crecer.

### 10. Conteo cíclico (cycle count)

Diseñado en `BACKLOG.md`, sin construir. Todo sistema de inventario serio lo
tiene, y es la primera pregunta de un comprador con experiencia.

### 11. Códigos de barras / QR + etiquetas

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

**Orden fijado por Jose (v10.9) — lo siguiente a construir, en este orden:**

1. **Plantillas por industria** — la que más mueve la aguja del negocio, no del
   producto: baja la instalación de 3 h a ~1 h, y por lo tanto multiplica
   cuántos clientes caben antes de tener que contratar. Ver
   `PRECIOS-Y-COMPETENCIA.md`, sección "la conclusión que vale más que el
   precio".
2. **Botón de correo en la alerta de stock bajo** (`BACKLOG.md` 2c) — chico, y
   resuelve algo que un jefe de bodega hace todos los días.
3. **Códigos de barras / QR + etiquetas** — lo que más pide un comprador con
   experiencia, y lo que sostiene subir a $59–$69.
4. **Conteo cíclico** — el otro que pregunta ese mismo comprador.

Anotadas después de esas cuatro: grupos en Directory (`BACKLOG.md` 2d) y la
calculadora de costo por caja/pallet (2e).

---

**Orden anterior, fijado por Jose (v9.97):**

1. ~~Prueba de concurrencia~~ ✅ auditada · pasos 1 y 2 aplicados (v10.0/v10.4)
   — quedan dos caminos casi simbólicos y **la prueba en vivo**
2. **Página de novedades** — destraba el hipervínculo de "Acopio" en la app,
   la tarjeta de reenganche y el argumento del soporte mensual. El contenido
   ya está escrito: los mensajes de commit de cada versión.
3. ~~**Mostrar cuánto espacio queda** en Settings → System~~ ✅ HECHO (v10.5)
   — barra verde/ámbar/roja con el porcentaje encima, celdas, movimientos y
   pestañas, y un estimado de años restantes con las dos guardas de
   `CUANDO-SE-LLENE-EL-SHEET.md`. Aviso al 60%, alerta al 85%.
4. Restaurar un backup de prueba
5. Verificar "In production" en el consent screen
6. Plantilla maestra limpia
7. Decidir el cobro
8. Conteo cíclico y códigos de barras (producto, no lanzamiento)

Ya hechos: Política de Privacidad ✅ · prueba de escala del motor ✅ ·
landing ✅
