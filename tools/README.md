# tools/

Checks that run before anything is sent to Jose. All four, every time.

```
python3 tools/check-refs.py Index_v3_fixed.html Code_v3_fixed.gs
node --check <js extracted from the HTML <script> blocks>
node --check <Code_v3_fixed.gs copied to .js>
node tools/test-modal-shield.js
node tools/test-button-states.js
node tools/test-topbar-deck.js
node tools/test-checkin.js
node tools/test-pricing.js
node tools/test-project-cost.js
node tools/test-role-label.js
node tools/test-waste-cost.js
node tools/test-rack-drawer.js
node tools/test-backup-status.js
node tools/test-backup-backfill.js
node tools/test-tooltip-edge.js
node tools/test-tip-in-settings.js
node tools/test-stock-cat-column.js
node tools/test-estado-stock.js
node tools/test-stock-levels-bar.js
node tools/test-splash-notes.js
node tools/test-account-tooltip.js
node tools/test-favicon.js
node tools/test-responsive-polish.js
node tools/test-price-alert.js
node tools/test-account-tooltip-delay.js
node tools/test-bell-tooltip-collision.js
node tools/test-rowmode-stable.js
node tools/test-header-merge.js
node tools/test-sysactivity-dismiss.js
node tools/test-morning-arrived.js
node tools/test-legal-sync.js
node tools/test-config-snapshot.js
node tools/test-concurrency.js
node tools/test-category-rename.js
node tools/test-cfg-rename-reload.js
node tools/test-space-usage.js
node tools/test-ai-key.js
node tools/test-correo-mal-escrito.js
node tools/test-respaldo-parado.js
node tools/test-se-ve-al-guardar.js
node tools/test-borrar-y-editar-se-ven.js
node tools/test-borrar-usuario.js
node tools/test-vuelta-del-login.js
node tools/test-cinco-sin-riesgo.js
node tools/test-escala.js
node tools/test-espaciado.js
node tools/test-topes.js
node tools/test-proyecto-nuevo.js
node tools/test-ubicacion-avisa.js
node tools/test-novedades.js
node tools/test-qr.js
node tools/test-etiqueta-ubicacion.js
node tools/test-franja-conexion.js
node tools/test-escanear.js
node tools/test-vigilante-arranque.js
node tools/test-escanear-boton.js
node tools/test-boneyard.js
node tools/test-gratis-escribe-igual.js
node tools/test-limite-6min.js
node tools/test-equis-campos.js
node tools/test-return-fuera.js
node tools/test-return-lista.js
node tools/test-avisos-que-se-apilan.js
node tools/test-candados-hablan-de-lo-mismo.js
node tools/test-ventana-limpia.js
node tools/test-basica-sin-menu.js
node tools/test-pegar.js
node tools/test-importar-sin-perder.js
node tools/test-borrar-en-tanda.js
node tools/test-fusionar-y-ver-errores.js
node tools/test-seguro-que-si.js
node tools/test-dentro-y-fuera.js
node tools/test-mes-del-changelog.js
node tools/test-ediciones-coinciden.js
node tools/test-errorlog-fila-nueva.js
node tools/test-ajustes-no-se-quedan-grises.js
node tools/test-vigilante-arranque.js pegar/Index_v3_fixed.html
node tools/test-telefono.js
node tools/test-verdad-y-huerfanos.js
node tools/test-fotos-y-mayusculas.js
node tools/test-brand-corner.js
node tools/test-terms-checkbox.js
node tools/test-entry-autofill.js
node tools/test-packs.js
node tools/test-form-symmetry.js
node tools/test-pack-prompt.js
node tools/test-start-here.js
node tools/test-transfer-project.js
node tools/test-edit-gaps.js
node tools/test-incoming.js
node tools/test-incoming-delete.js
node tools/test-adjust.js
node tools/test-adjust-form.js
node tools/test-data-quality.js
node tools/test-landing-i18n.js
node tools/test-endpoint-auth.js
node tools/test-local-dates.js
node tools/test-fractional-qty.js
node tools/test-cost-privacy.js
node tools/test-html-escaping.js
node tools/test-window-stack.js
node tools/test-use-before-var.js
node tools/test-indice.js
node tools/test-la-misma-version.js
node tools/test-nombres-que-no-se-pisan.js
node tools/test-los-dos-escapes.js
node tools/test-auditoria-nombra-el-movimiento.js
node tools/test-papelera-se-alinea-sola.js
node tools/test-importacion-con-nombre-propio.js
node tools/test-deshacer-no-llena-la-papelera.js
node tools/test-el-aviso-dice-la-verdad.js
node tools/test-hoja-estrecha-no-revienta.js
node tools/test-url-de-la-app.js
node tools/test-no-saltar-al-cargar.js
node tools/test-config-escritura.js
node tools/test-pie-de-ventana.js
node tools/test-barra-conexion.js
node tools/test-revocar-acceso.js
node tools/test-acceso-denegado.js
node tools/test-enlace-pulsable.js
node tools/test-ubicacion-que-no-existe.js
node tools/test-informe-diario-hora.js
node tools/test-renombrar-de-uno-en-uno.js
node tools/test-sysact-followthrough.js
node tools/test-daily-report.js
node tools/test-morning-closes.js
node tools/test-morning-arrivals.js
node tools/test-user-column.js
node tools/test-derived-refresh.js
node tools/test-row-leave.js
node tools/test-bell-count.js
node tools/test-also-arrived.js
node tools/test-labels.js
node tools/test-selection-survives.js
node tools/test-site-links.js
node tools/test-site-seo.js
node tools/test-arrived-to-entry.js
node tools/test-settings-reopen.js
node tools/test-settings-system-tab.js
node tools/test-topbar-sticky.js
node tools/test-product-link.js
node tools/test-quiet-reload.js
node tools/test-busy-retry.js
node tools/test-live-pulse.js
node tools/test-lock-visible.js
node tools/test-inc-supplier.js
node tools/test-no-caduca.js
node tools/test-entry-todo-corre.js
node tools/test-carrera-incoming.js
node tools/test-andamio.js
node tools/test-refresco-tanda.js
node tools/test-tanda-borrado.js
node tools/test-salidas-animadas.js
node tools/test-seleccion-viva.js
node tools/test-sello-antes.js
node tools/test-usuarios-barra.js
node tools/test-short-stock.js
node tools/test-settings-boxes.js
node tools/test-toast-and-buttons.js
node tools/test-live-exit-unlock.js
node tools/test-load-race.js
node tools/test-movement-id.js
node tools/test-archivo-nocturno.js
node tools/test-canario-archivo.js
node tools/test-historico-tandas.js
node tools/test-papelera-ciclo.js
node tools/test-dependencias-material.js
node tools/test-formato-plantilla.js
node tools/test-demo-nombres.js
node tools/test-trash.js
node tools/test-role-permissions.js
node tools/test-move-tabs.js
node tools/test-delete-queue.js
node tools/test-mov-columns.js
node tools/test-locations.js
node tools/test-text-stays-text.js
node tools/test-write-queue.js
node tools/test-restore-batch.js
node tools/test-stock-basket.js
node tools/test-headers-repair.js
node tools/test-incoming-week.js
node tools/test-mazo-contador.js
node tools/test-pintar-al-confirmar.js
node tools/test-reservas.js
node tools/test-reservas-tira.js
node tools/test-incoming-duplicado.js
node tools/test-capas.js
node tools/test-ventanas.js
node tools/test-columnas.js
node tools/test-landing-verdad.js
node tools/build-site.js && node tools/test-site-privacy.js
node tools/check-changelog.js
node tools/check-publicado.js
node tools/test-solo-ingles.js
node tools/sync-legal.js --check
node tools/build-fingerprint.js --check
node tools/check-suite.js
```

Seis de esas pruebas llevaban entre uno y cuatro días escritas y **ninguna
estaba en esta lista**. Corrían porque yo me acordaba de correrlas, que es
exactamente la garantía que no tiene ninguna. Es el agujero que
`test-endpoint-auth` describe para las funciones públicas —nada contaba las
puertas— aplicado a las propias pruebas. `check-suite.js` es lo que ahora pone
la suite en rojo cuando alguien escribe una prueba y se olvida de esta lista.

Y cuando el release toca la landing, el changelog o los documentos públicos,
falta un paso más — **el que se olvidó durante catorce días**:

```
node tools/publish-site.js          # dice qué cambiaría
node tools/publish-site.js --push   # lo publica
```

Escribir el cambio y publicarlo son dos actos en dos repositorios: las fuentes
viven aquí, en `landing/`, y el sitio que la gente ve se sirve desde
`jic51/acopio-site`. En septiembre de 2026 las fuentes estuvieron corregidas y
probadas dos semanas mientras acopio.net seguía enseñando la página del día 3 —
la suite en verde, el changelog al día, y nada mirando el segundo paso. Lo
encontró Jose abriendo su propia web. `check-publicado.js` es lo que ahora pone
la suite roja cuando vuelve a pasar.

`tools/audit-responsive.js` and `tools/test-scale.js` are tape measures, not
tests — run them when the thing they measure changes, read the numbers, fix
what they show, run again. `audit-responsive.js` measures layout at six device
sizes; `test-scale.js` measures how calculateStock() behaves as one
installation's archive grows (it was linear to 100k movements when last run,
which answered "does the stock engine have a ceiling?" — no — and pointed the
remaining scale risk at Sheets I/O and concurrency instead).

The browser tests need `npm install playwright` once; Chromium is already on
the machine (`/opt/pw-browsers/chromium-*/chrome-linux/chrome`, override with
`CHROME_PATH`).

## Why there are browser tests at all

`node --check` parses. It does not run. `check-refs.py` finds calls to
functions nobody defined. Between them they catch typos and missing code, and
they caught nothing at all when v9.63 shipped code that was valid and simply
never stopped — an observer loop that starved the page and left the app on a
blank loading screen.

Anything that behaves over TIME — an observer, a timer, a state a button has to
come back from — is invisible to both. Those get a browser test.

- `test-modal-shield.js` — the window shield: one sync at startup and no loop,
  background frozen, front window live, stacking in both directions, everything
  released on close.
- `test-button-states.js` — the busy/done helpers: a button always gets its
  label back, on success and on failure, and the callback never runs before the
  tick or gets lost when the button is missing.
- `test-topbar-deck.js` — the notification pile's open/close (driven from JS
  because CSS `:hover` fed back into itself and made the front card resize three
  times), the scroll lock while it is open, the exit animation, and a
  MEASUREMENT that the tab bar is centred. That last one is the argument for
  browser tests in one line: the old auto-margin layout put the tabs 146px off
  centre and looked almost right.
- `audit-responsive.js` — opens the real app at six device sizes, on every tab,
  and reports sideways page scroll, controls too small for a thumb, anything
  past the right edge, and page errors. Screenshots land in ./audit/.
- `test-checkin.js` — runCheckin_'s milestone bookkeeping (Code_v3_fixed.gs),
  run in a Node vm with Apps Script's globals stubbed and time itself faked:
  fires once per milestone, never twice, catches up a backlog of overdue
  milestones as ONE email not several, stays silent when the customer is
  actually using the app, stays silent with no SUPPORT_EMAIL configured, and
  backfills SETUP_COMPLETED_AT on a pre-existing install without a false alarm.
- `test-pricing.js` — the weighted-average cost engine (addMovementsBatch_'s
  pricing branch, saveAvgCostUpdates_, and their real dependencies), lifted
  verbatim into a Node vm against fake in-memory sheets: bootstraps on a
  material's first cost, blends by quantity on the next one, a blank cost
  changes nothing, EXIT/WASTE always price from the average and ignore
  whatever a client sends, an unpriced material gets a blank cost (never a
  misleading 0), a purchase split across racks still blends correctly, cents
  round properly, and the CONFIG write-back updates one row per material
  rather than appending a duplicate on every entry.

- `test-project-cost.js` — renderProjectView's "Project Cost" tile, lifted
  verbatim into a Node vm against synthetic movements: sums EXIT.totalCost only
  (a RETURN or WASTE in the mix must not count), an uncosted EXIT contributes
  nothing rather than NaN, no priced EXIT at all hides the tile instead of
  showing $0, a legacy DISPATCHED row still normalizes to EXIT and counts, and
  the tile never renders for a role without canSeeCosts.
- `test-role-label.js` — the customizable WAREHOUSE-role display name
  (`_displayRole`, `_roleBadge`), lifted verbatim into a Node vm: ADMIN and
  VIEWER are never affected by a WAREHOUSE-only label, the badge still carries
  the `role-badge-warehouse` CSS class regardless of label text, the literal
  internal value never leaks once relabeled, and a label containing
  HTML-sensitive characters renders escaped rather than as live markup.

- `test-waste-cost.js` — renderStats's "Waste Cost" dashboard tile, lifted
  verbatim into a Node vm against synthetic movements: sums the cost STAMPED
  on each WASTE row (never today's average — waste from last year must not
  reprice itself), ENTRY/EXIT don't count, an uncosted WASTE row contributes
  nothing rather than NaN, no priced WASTE hides the tile instead of showing
  $0, a legacy DISPATCHED row normalizes to EXIT and stays excluded, and the
  tile never renders for a role without canSeeCosts.

- `test-rack-drawer.js` — the redesigned Rack Drawer (Warehouse Map → click a
  location), a full Playwright run against the real app: the photo section is
  gone, the Exit/Transfer/Waste menu stays collapsed until a material name is
  tapped, tapping Exit/Transfer/Waste opens the real movement modal with
  category/name/source rack pre-filled and qty left blank, and tapping the
  green "N avail" figure fills qty with that number — in the EXIT rows, the
  TRANSFER row, and the single-field WASTE stock check. This is the one that
  actually clicks the menu open and reads the resulting form fields, not just
  the HTML string that would build it. Also covers three data-integrity bugs
  Jose caught by using the app: an already-open drawer re-rendering (or
  auto-closing, if the rack is now empty) the moment fresh stock data lands
  instead of keeping showing a material that already left, the EXIT
  destination / single-material category fields actually resetting between
  two movements in a row instead of silently carrying over what was typed
  into the PREVIOUS one, and the TRANSFER row's "avail" figure showing the
  moment a rack is picked instead of staying blank until qty is typed —
  which made the whole tap-to-fill-qty shortcut impossible on a row the Rack
  Drawer had just pre-filled with a blank qty on purpose. Also covers
  switching type INSIDE an already-open modal (the Exit/Transfer/Return/
  Waste bar at the top): Entry and Return stay hidden for the life of a Rack
  Drawer material session (neither has a "from this exact rack" reading), and
  switching between Exit/Transfer/Waste keeps the same material instead of
  landing on an empty form — the two types keep completely separate fields
  (exit-cat-1/exit-name-1 vs the shared mType/mName), so nothing carried over
  on its own before this.
- `test-backup-status.js` — the backup box in Settings → System
  (`_drawBackupBox`), lifted verbatim into a Node vm: hidden on a fresh
  install with nothing recorded yet, shown with the right relative time and a
  working Drive link once there is one, an HTML-sensitive file name renders
  escaped, and the line survives even with the nightly schedule turned off
  (schedule and history are separate facts). Also covers the v9.93 full list
  — Jose asked what a customer does when they want YESTERDAY's backup, and
  the answer was "go hunting in Drive", since only the newest was ever
  linked. Every backup is now reachable, collapsed behind a count so ~30
  near-identical rows do not take over the tab, escaped in the list too, not
  offered at all when there is only one, and absent without crashing on an
  install whose server has not been redeployed yet. The list is built from
  the Drive folder (`listBackups_`) rather than AUDIT_LOG on purpose: the
  folder says what still EXISTS, so a backup the customer deleted stops
  being listed instead of being listed with a link that lands on Drive's
  "unable to open the file at this time". Writing LAST_BACKUP_AT/NAME/
  FILE_ID Script Properties on every backup (runBackupNow_) exists because
  AUDIT_LOG's ~1500-row readable tail can scroll a backup entry past in under
  a day on a busy install, even though the file is safe in Drive the whole
  time.
- `test-backup-backfill.js` — the one-time Drive backfill for installs that
  were already backing up before LAST_BACKUP_AT existed (getBackupStatus /
  _findMostRecentBackup_), lifted verbatim into a Node vm with DriveApp and
  PropertiesService stubbed: picks the actual NEWEST of several existing
  backup files (not first-in-list, not oldest), remembers what it found so
  the next load never re-scans Drive, does nothing false on a genuinely fresh
  install with no backups at all, and the trivial one-file case works too.
- `test-tooltip-edge.js` — the shared .tip tooltip's edge-avoidance
  (`_positionTip`), a Playwright run measuring real layout: an icon near the
  left or right edge of the window gets the bubble anchored to that same
  side instead of centred off past the viewport, one in the middle stays
  centred, and hovering back and forth leaves no stale edge class behind.
- `test-splash-notes.js` — the loading screen's rotating phrases and manual
  reload fallback (SPLASH_NOTES / `_showSplashReload`), a Playwright run
  using clock mocking to fast-forward through the real 3.5s rotation instead
  of actually waiting ~18 seconds per run: starts on the first phrase,
  rotates through all of them in order, the last one says the wait is longer
  than expected and stays there instead of looping back to "Connecting…", a
  working Reload control appears only once the phrases run out (not before),
  and hiding the splash for a real successful load stops the rotation for
  good.
- `test-account-tooltip.js` — the account button's tooltip
  (`_setAccountIdentity`'s data-tip build), lifted verbatim into a Node vm:
  shows the real name over the role (not the old static "Your account"),
  honors a custom WAREHOUSE role label instead of the raw internal value,
  falls back to email when there's no name on record, and confirms a name
  with HTML-sensitive characters is safe by construction (CSS `attr()` is
  never parsed as markup).
- `test-favicon.js` — the browser-tab icon, real Playwright against the real
  app: a real Acopio-branded icon from first paint instead of the generic
  Apps Script one Jose was seeing, swaps to the company's own uploaded logo
  the moment one exists (no second upload), and reverts to the default mark
  if the logo is removed.
- `test-responsive-polish.js` — three of Jose's screen-size reports, real
  viewport geometry at real sizes (nothing here is knowable from source
  alone): the topbar brand (logo/name/Acopio badge) stacks vertically and
  left-aligned on a real screen with the version number gone from there
  entirely, the SAME topbar stays the original row layout on a phone (only
  large screens were asked for), the version tag is hidden everywhere either
  way, the "not on your lists yet" bell panel measures out to two-thirds of
  a phone's width instead of half, and the Rack Drawer measures out to
  two-thirds instead of nearly the whole screen.
- `test-price-alert.js` — the ENTRY price-change alert (`_checkPriceChange`),
  lifted verbatim into a Node vm: no alert inside the ±15% threshold (noise,
  not a real change), warns on a real increase and informs on a real
  decrease with the right percentage and dollar figures in each direction,
  no alert for a material with no cost history yet to compare against, no
  crash on a blank cost/name/zero, and an alert that actually clears once
  the number is corrected back toward the average rather than staying stuck.
- `test-account-tooltip-delay.js` — the account button's 4-second hover
  delay (Jose: unlike the instant info icons, this one is for someone who
  lingers), a Playwright run reading the real computed `transition-delay`
  Chromium will animate with (CSS transitions run on the compositor's own
  clock, not page.clock's faked JS timers, so waiting 4 real seconds isn't
  needed): 4s while hovering the account button, every other `.tip` tooltip
  on the page stays instant (0s), and the tooltip is invisible at rest.
- `test-bell-tooltip-collision.js` — the account tooltip vs. the
  notification bell on a narrow phone: below 720px the bell sits directly
  under the avatar with the exact same 8px gap the tooltip drops down by,
  so Jose caught the bell rendering right through the tooltip's name/role
  text. v9.88 pushed the tooltip down to clear it; Jose (v9.90) wanted it
  back at its natural position instead, so now the bell fades out while the
  tooltip is up — timed to the same 4s hover delay, back instantly the
  moment the hover ends, and inert to taps while invisible
  (pointer-events:none). A wide screen, where the bell doesn't exist at all
  (the corner deck takes over), is unaffected by hovering the avatar.
- `test-rowmode-stable.js` — the Movements table's Edit/Delete row-mode
  toggle buttons, real Playwright clicks at three widths: clicking Edit (which
  makes a hint sentence appear) must not move the buttons, the hint has to
  render below them rather than beside them, and toggling Edit back off must
  return to the exact same spot. Root cause was the hint sharing a flex line
  with the "⚙ Columns" button above the table — long enough, it didn't fit and
  shoved the whole row down to a new toolbar line. The row-mode bar now lives
  on its own dedicated line from the start.
- `test-concurrency.js` — which write paths take the script lock, and what it
  costs when they do not. Two halves, deliberately labelled as different kinds
  of evidence: Part 1 is FACT read out of Code_v3_fixed.gs (who locks, whether
  the archive read happens inside the lock, whether it is released in a
  finally); Part 2 is a MODEL of read-modify-write showing a lost update with
  and without the lock — it does not execute addMovementsBatch_, which needs
  real Sheets. Neither proves a live installation survives four people at
  once; that still needs a deployed copy and several browsers. It earned its
  place immediately by finding a seventh unlocked stock-writer that reading
  the code by eye had cleared: renaming a category rewrites the Category cell
  of every matching archive row, which reads as a settings change. The
  known-gap list is spelled out by hand so that fixing one, or adding a new
  one, both force it to be updated rather than quietly passing.
- `test-category-rename.js` — the bulk Category-column rewrite
  (`renameCategoryColumn_`), lifted verbatim into a Node vm and run against a
  fake Sheet that records every round trip. Written because v10.1 replaced a
  setValue-per-row loop with one setValues, and that trade moves the risk: a
  mistake no longer corrupts rows slowly, it corrupts the whole column at
  once. So the assertion that matters is not "did the right cells change" but
  "did every OTHER cell come out byte-identical" — plus IGUANA surviving a
  rename of IGU, an empty cell staying empty, and a no-match rename writing
  nothing at all. It also reads the CALL SITE, because a correct helper
  pointed at one sheet is still a bug: renaming has to touch ARCHIVE_HISTORY
  as well as the archive (refreshDerivedSheets_ reads the two concatenated, so
  renaming only one splits a category into two materials the first time old
  rows are archived), rebuild the derived sheets afterwards, and write CONFIG
  from the same uppercased value the archive gets. That last one is the bug
  that started it: the catalog held "IGU (isolated glass unit)" while the
  movements held "IGU (ISOLATED GLASS UNIT)".
- `test-cfg-rename-reload.js` — the browser half of the same bug, and the one
  the server fix did not cover. v10.1 renamed the category correctly
  everywhere on the server; the tab still held movement rows saying the old
  name while the filter dropdown had already been patched to the new one, so
  filtering by a renamed category returned an empty table until the page was
  reloaded by hand. The fix is one line, which is exactly the kind of thing a
  later refactor drops silently, so both halves are asserted: a category
  rename MUST reload (skipCache + quiet), and add / delete / a project rename
  must NOT — `_applyCfgChangeLocally` exists so that entering ten categories
  is not ten round trips. Runs the real function in a vm with the browser
  stubbed.
- `test-space-usage.js` — the storage indicator's ESTIMATE, which is the only
  part of it that can lie. The bar reports a fact; the projection is where a
  wrong number either panics a customer with fifteen years of room or
  reassures one with nine months. Runs the real `spaceEstimate_` in a vm
  against fake timestamp columns, holding both failure modes shut: the opening
  inventory (hundreds of movements in three days) must not set the pace, and a
  rising pace must BRACKET a second figure rather than compound into a curve.
  It earned its place immediately by catching an off-by-one — `age <= 90`
  made the recent window 91 days wide, so every steady installation measured
  as growing 1% and would have been shown a "if your pace keeps growing"
  sentence that meant nothing. Fixed with strict bounds plus a 15% floor
  below which volume is treated as weather, not a trend.
- `test-ai-key.js` — the Gemini key, now settable from Settings → System
- `test-correo-mal-escrito.js` — una errata en un correo de usuario: se puede corregir desde la app, con sus guardas, y se avisa del dominio casi-igual antes de guardar
- `test-respaldo-parado.js` — que la app diga que el respaldo nocturno dejó de correr, y que se calle cuando no pasa nada
- `test-se-ve-al-guardar.js` — lo guardado se ve en el mismo segundo: el servidor devuelve las filas que escribió y las tres pantallas las pintan sin volver a preguntar
- `test-borrar-y-editar-se-ven.js` — lo mismo para borrar y editar: las cifras de después cuando el refresco de verdad ocurrió, y la fila editada tal como quedó en la hoja
- `test-borrar-usuario.js` — borrar de verdad una fila de usuario, con el rastro escrito antes y la lista vieja de CONFIG limpiada para que no vuelva sola
- `test-vuelta-del-login.js` — que la dirección de vuelta del inicio de sesión apunte a ESTA app y no a otra, y que si no, se diga antes de abrir una ventana que va a morir
- `test-cinco-sin-riesgo.js` — los cinco arreglos sin riesgo de la auditoría de columnas, y sobre todo el lado por el que cada uno falla: el total sólo se recalcula cuando se puede saber cuál debe ser, las tres hojas calculadas pierden cinco columnas sin que su único lector pierda un número, el aviso de CONFIG vigila exactamente las columnas que `loadConfig` lee de la fila 2, la nota de RESERVATIONS es la suya y la pestaña no se borra, y el renombrado de `AUDIT_LOG` no toca una cabecera que el cliente escribió
- `test-escala.js` — la escala de letra y la forma de los botones no se deshacen solas: los trece escalones de la opción A existen y están ordenados, los tres tamaños más usados no se movieron, ningún botón lleva un tamaño ni una altura a pelo, y lo que BORRA algo se MIDE en un navegador táctil —no se busca en el CSS— porque buscarlo en el CSS pasaba en verde con un botón de 34 px en pantalla
- `test-espaciado.js` — la escala de espaciado, la píldora y la sublínea. Los diez peldaños existen, van en orden y NINGUNO está a menos de 1,6 px del siguiente, que es la enfermedad que esta tanda curaba: diez valores con 30 usos cada uno separados 0,8 px. Y las dieciocho reglas que dibujan una píldora se MIDEN en un navegador —aplicando cada regla a un div dentro del documento, donde el :root alcanza— para comprobar que resuelven al mismo relleno y al mismo radio, con las tres contadoras cuadradas a propósito como excepción escrita; igual las doce sublíneas y su margen. Se mide en vez de buscar en el CSS porque un `var()` mal escrito deja la propiedad en su valor inicial y el grep pasa en verde
- `test-topes.js` — las seis puertas que comprobaban QUIÉN eres y no CUÁNTO llamas (`getIncoming`, `addIncoming`, `updateIncoming`, `deleteIncoming`, `getMonitoredMaterials`, `getSetupState`). No permitían hacer nada indebido: permitían agotar la cuota diaria de Apps Script y dejar la app muerta para todos hasta el día siguiente. La prueba LLAMA a cada una hasta que el tope salta, en vez de buscar el `requireQuota_` en el archivo — porque un grep no ve si el tope está puesto DESPUÉS del trabajo caro (no protege de nada) ni si cada función tiene su propio cubo (alternarlas lo esquiva). Comprueba también que la identidad sigue mandando sobre el tope, que el contador es por persona, y qué devuelve `getSetupState` sin identidad
- `test-proyecto-nuevo.js` — el «+ Add it» de un proyecto o proveedor nuevo se iba para siempre si pinchabas dos veces en el casillero: `focusin` lo borraba y sólo `change` podía reponerlo, y `change` no dispara si el texto no cambió. Abre un navegador y repite la secuencia que Jose grabó, porque el fallo no estaba en ninguna función —las tres eran correctas— sino en qué eventos las llaman. Vigila también que el `focusout` nuevo no invente carteles en un campo vacío, y que la tarjeta del mazo y el cartel del formulario digan lo mismo
- `test-ubicacion-avisa.js` — la ubicación que no existe, avisada al escribir y nunca como un fallo. Dos mitades: por un lado LEE EL ARCHIVO para comprobar que los tres caminos de guardado llaman a la MISMA `_errorConocido` —lo que falló no fue el comportamiento de un camino, fue que había tres listas que tenían que coincidir sin que nada lo obligara, y el usuario acabó leyendo `UNKNOWN_LOCATION|P|B` en pantalla—; por otro abre un navegador y comprueba que escribir `A1p` avisa ANTES de guardar, propone `A1A`, ofrece crearla, y NO opina cuando la lista de ubicaciones todavía no ha llegado, porque decir «no existe» antes de tener la lista sería mentir con cara de ayuda. Cubre también las filas de varios materiales, que se crean sobre la marcha
- `test-novedades.js` — la ventana de novedades, y casi todas sus comprobaciones son sobre CUÁNDO NO SALE, porque ahí está la frontera entre información y anuncio: no sale en la primera visita (contarle «lo que cambió» a quien entra por primera vez es contarle el final de una película que no ha visto), no sale dos veces por la misma versión, y no se apila sobre otra ventana. Comprueba además que se marca como vista AL ABRIR y no al pulsar el botón —quien la lea y la cierre con la ✕ no debe volver a verla mañana—, que el enlace apunta al ancla de ESA versión y que el ancla existe de verdad en los dos changelogs, que la lista de dentro del archivo empieza por la versión actual y no pasa de cuatro, y que con el producto renombrado no salen ni el enlace ni el correo
- `test-qr.js` — el QR de la etiqueta, y lo DECODIFICA con `jsQR`, que es un lector independiente, en vez de comparar la matriz contra una guardada. Un QR mal hecho se dibuja exactamente igual de bonito que uno bueno —cuadros negros, tres esquinas, aspecto perfecto— y el teléfono no lo lee; comparar con una matriz de ayer sólo diría «sale lo mismo que ayer», que si ayer ya estaba mal es verde con el fallo dentro. Prueba diez casos sacados de datos reales de Jose (nombres largos, dos puntos dentro del nombre, ubicaciones raras) y además al tamaño al que se imprime de verdad: 30 mm a 203 ppp. Y compara carácter a carácter la copia del codificador que vive en la app con `tools/qr-fuente.js`, porque dos copias que tienen que coincidir necesitan algo que lo obligue
- `test-etiqueta-ubicacion.js` — la etiqueta que se pega al ESTANTE, que es la otra mitad de poder escanear. Además de decodificar el código con un lector independiente, mide tres cosas que no se ven: que a 34 mm —lo que dejan tres por hoja— el código siga por encima del suelo de 0,40 mm por módulo; que la hoja ESCALE, renderizando a 4×6 y a A4 y comprobando que el código acaba del mismo tamaño FÍSICO por los dos caminos (es lo que hace que funcione en una impresora que sólo ofrece A4 y luego encoge la página); y que la etiqueta NO lleve nada que caduque —ni cantidad, ni fecha, ni PO—, porque una etiqueta de rack vive años y mentiría al día siguiente
- `test-franja-conexion.js` — el aviso de sin conexión flota y ya no empuja la app, pero lo que de verdad vigila esta prueba es que NO VUELVA EL FALLO VIEJO: una versión anterior ya flotaba y en un teléfono tapaba la barra de navegación, dejando los botones debajo sin poder pulsarse. Mide a 375 px que la barra no se mueve ni un píxel al aparecer el aviso, que `elementFromPoint` en el centro del botón de la cuenta devuelve el BOTÓN y no el aviso, y que pulsarlo de verdad abre el menú con el aviso en pantalla. Comprueba además que el aviso de VERSIONES sigue ocupando sitio —ése vive meses y no puede taparse— y que el de conexión aguanta varios segundos en vez de parpadear
- `test-escanear.js` — leer los códigos con la cámara, PROBADO SIN CÁMARA. Ni `getUserMedia` ni `BarcodeDetector` existen en el navegador de la suite, así que todo lo que decide algo recibe TEXTO y no fotogramas: la cámara sólo convierte una cosa en la otra. Los textos de prueba se generan con el MISMO codificador que imprime las etiquetas, de modo que si el formato cambia en un lado y no en el otro, esto se entera. Comprueba que repetir la misma lectura —la cámara dispara cuatro veces por segundo— no cuenta como suceso, que la combinación de lo escaneado decide el movimiento, que escanear RELLENA el formulario y NO llama a guardar, que el destino no se inventa cuando no se escaneó un estante, y que sin lector se avisa ANTES de encender la cámara
- `build-paste.js` — **no es una prueba: es la herramienta que genera el archivo que se pega en Apps Script.** Quita SÓLO los comentarios —con `acorn`, un parser de verdad, porque `'http://x'` lleva un `//` dentro y una expresión regular puede llevar un `/*`— y deja el producto intacto: no renombra nada, no junta líneas, no toca una cadena. 2,18 MB → 1,18 MB. No minifica a propósito: el día que algo falle, lo único que llega desde la bodega es un número de línea de la consola, y con los nombres cambiados ese número no lleva a ninguna parte. Vuelve a parsear el resultado y comprueba que la versión y el sello no se movieron; si algo no cuadra no escribe nada, porque dar un archivo roto es exactamente el problema que esto intenta resolver
- `test-equis-campos.js` — la ✕ que vacía un campo, **medida en el navegador y no leída**. Jose, 20/10: *"es molesto tener que borrar letra por letra... debemos ponerlo en todos los lugares donde se escribe, excepto lo que no dejan escribir cualquier cosa y dan la lista para escoger"*. Abre un navegador porque lo que hay que comprobar no se puede leer: la ✕ se pone **envolviendo** cada campo, y envolver un elemento le cambia el padre y el hermano. Había dos avisos —«proveedor nuevo» y «ubicación desconocida»— que buscaban lo suyo con `input.nextElementSibling`, y envolver los campos los habría roto **en silencio**: el aviso se habría seguido creando y nadie lo habría encontrado para quitarlo. Comprueba que la llevan todos los campos de escritura y **ningún** `<select>` ni fecha, que sólo aparece cuando hay algo que borrar, que al pulsarla el campo queda vacío, y que **avisa con `input` y con `change`** — vaciar la búsqueda sin avisar dejaría la tabla filtrada por un texto que ya no está escrito en ninguna parte, que es peor que no tener la ✕
- `test-limite-6min.js` — **no avisa de que hay un riesgo, avisa de cuánto falta.** Jose, 20/10: *"escribir la prueba no resuelve el problema, hay que pensar cómo hacemos que esa prueba nos dé el dato que necesitamos para manejar la situación"*. Tenía razón: un rojo que dice «hay una escritura dentro de un bucle» se mira una vez, se decide que «va bien por ahora», y se aprende a ignorarlo. Así que lo que saca no es un sí/no sino una FORMA: `llamadas = constante + (por_vuelta × vueltas)`. Lo que consume los seis minutos de Apps Script no es la cuenta, son las LLAMADAS a la hoja — leer 20.000 filas de golpe es UNA; escribirlas de una en una son 20.000. Con `por_vuelta = 0` no hay techo y no hay nada que vigilar. Hoy sólo una operación lo tiene, `refreshDerivedSheets_`, y la lista de excepciones **obliga a decir sobre qué itera**: su bucle recorre las filas ROTAS, no las del archivo, y llamarlas «filas» daría un techo que asusta y que no es verdad. El tope impide que aparezca una segunda sin que alguien lo decida. Y dice en voz alta que **está sin calibrar**: pasar de llamadas a minutos necesita un número que no se puede medir desde un portátil contra un archivo de texto, así que la cabecera explica cómo medirlo una sola vez en la instalación de verdad en lugar de inventárselo
- `test-basica-sin-menu.js` — **la gratis no tiene menú, y nada puede mandar a buscarlo**. Jose, 21/10, con una captura: *"sale que debo ir al menú Acopio pero el menú Acopio no aparece"*. Y no es que no aparezca: **no puede aparecer** — un menú en la hoja necesita `script.container.ui`, un permiso SENSIBLE que la gratis no pide a propósito, porque pedirlo trae justo la pantalla de aviso de Google que esa edición existe para evitar. `onOpen` ya se callaba por eso; lo que se quedó sin cambiar fue el TEXTO que la hoja escribe al aceptar los términos. Dos sitios que tenían que decir lo mismo sin que nada lo obligara, esta vez entre un permiso y una frase. Comprueba que el manifiesto no pida el permiso, que `onOpen` se calle, que **ninguna frase sobre el menú quede antes de la guardia de edición** —lo que está antes lo lee todo el mundo— y que la rama de la gratis diga las tres cosas que hacen falta: que aquí NO hay menú, que el paso siguiente es desplegar la app, y dónde se pone el nombre de la empresa, porque en esa edición **no hay asistente que lo pregunte**. Y que el recordatorio de «setup has not been done yet» se calle ahí: `setupComplete` nunca llega a ser cierto en la gratis, así que saldría para siempre pidiendo algo que no se puede hacer — y un aviso que no se puede satisfacer enseña a ignorar los avisos
- `test-mes-del-changelog.js` — **el mes de arriba tiene que ser el mes de ahora**. Jose, 24/10, con una captura de la página que está publicada en internet, la misma a la que lleva el aviso de novedades dentro de la app: *"¿por qué dice septiembre arriba? ¿Y por qué todo ese párrafo habla de las cosas que se hicieron en el pasado?"*. Las **veintiocho versiones de octubre** estaban bajo un encabezado que decía «September 2026», con un párrafo que resumía el trabajo de septiembre — así que quien abría la app, pulsaba «novedades» y llegaba ahí leía primero un resumen de hacía dos meses. La causa es la de siempre: el mes es un `<h2>` escrito a mano, cada versión se inserta arriba del todo —o sea, dentro de la sección que esté primera— y nadie vuelve a mirar qué dice su encabezado. **Se compara contra `landing/.publicado` y no contra el reloj**, y eso es la mitad del diseño: contra el reloj fallaría el día 1 de cada mes aunque todo estuviera bien —el primero de noviembre el changelog diría «Octubre», correctamente, porque nada se habría publicado aún en noviembre— y un guardia que se pone rojo por el calendario es un guardia que se aprende a ignorar. Comprueba además que la entrada más nueva esté **debajo** de ese encabezado y no colada en la sección de abajo (el mismo fallo con los papeles cambiados), que no haya dos resúmenes idénticos (la señal de que la sección se partió y el texto no), y en las dos páginas, inglesa y española
- `test-ajustes-no-se-quedan-grises.js` — **Ajustes no puede quedarse muerto, y una pestaña tiene un solo dueño**. Jose, 25/10, con un vídeo de su copia Básica: *"cuando en Settings la pantalla se queda en gris y no deja tocar nada, todas las ventanas aparecen con un Acopio Pro en la esquina"*, y en el mismo mensaje la consecuencia: *"no se puede probar importar/borrar, fusionar, papelera"*. **Cuatro cosas de su lista de verificación bloqueadas por esto** — no era un detalle visual, era el motivo de que no pudiera avanzar. Son **dos fallos** en el mismo vídeo. (1) `settingsTabContent` es UN elemento que se repinta en cada pestaña; abrir «System» —que sí es de Pro— le ponía `pro-off`, y al cambiar de pestaña `_basicApagarAjuste` salía por su `return` **sin quitarlo**. La causa de fondo no es el `return`: **había una función para APAGAR una zona y ninguna para ENCENDERLA**, y una pareja a la que le falta una mitad se acaba usando a medias; además el oyente del clic llevaba la clave dentro de un `function` anónimo, así que no se podía quitar ni queriendo — ahora lo que se enciende y se apaga es el atributo y el oyente lo lee al pulsar. (2) En esa misma copia Básica se veían **Permissions, Directory e Import**, que `BASIC_FUERA.ajustes` dice que no van: la lista no estaba mal, la pisaban después. `_basicPintar` las escondía al arrancar y `_filterSettingsSidebar` recorría TODOS los botones poniendo `display=''` a los que el ROL permite — y para un administrador eso es todos. **Dos reglas escribiendo el mismo `style.display`**, con el agravante de que no tenían que coincidir sino COMBINARSE, y nadie las combinaba; `_settingsTabVisible` es ahora el único sitio donde se juntan — **es lo que yo llamaba «un solo dueño de la visibilidad de pestañas» y que Jose pidió que le explicara**. Se prueba en un navegador porque las dos son estado que se ACUMULA al usar la pantalla, y leer el código no distingue «lo pone» de «lo quita cuando toca». Comprueba las cuatro pestañas que él no pudo abrir una por una, que volver a System vuelve a apagarla (encender no puede ser un camino de ida, o el respaldo quedaría abierto en la gratis), que el oyente no se duplica, que la regla del rol **no se perdió** al juntar las dos, y que una pestaña guardada que la edición no lleva cae en el catálogo en vez de dejar un panel en blanco. Las dos mitades comprobadas en rojo por separado
- `test-errorlog-fila-nueva.js` — **una fila nueva entra arriba, y el resto de la tabla no se toca**. Jose, 22/10: *"los errores deben actualizarse de inmediato sin repintar toda la pantalla o ventana, sólo la fila que falta"*. La v12.93 lo construyó y `test-fusionar-y-ver-errores` comprobaba que estuviera **escrito** así —que se marque con `row-enter`, que una sola función dibuje una fila, que la animación respete `prefers-reduced-motion`—, leyendo el archivo. Eso no es lo mismo. **«Sin repintar» no es una propiedad del texto del programa, es una propiedad de lo que le pasa al DOM**: un `innerHTML` que volviera a escribir la misma tabla pasaría cualquier lectura del código —las filas quedarían idénticas— y rompería justo lo que él pidió. La forma de medirlo es marcar los nodos antes y comprobar que después **son los mismos objetos**, y eso sólo se puede hacer en un navegador. Ejecuta `_refrescarErrorLog` con un servidor fingido al que se le añade una fila entre dos refrescos —provocar un error **sin cerrar Ajustes**, que es el caso de Jose— y exige: cero redibujados, la fila nueva arriba del todo y marcada, **sólo ella** animada (si se animaran todas, cada error haría parpadear la pantalla entera), las tres viejas los mismos nodos, el texto del buscador intacto, una fila que no casa con el buscador **no se cuela** pero **sí se cuenta** en el aviso de «N new since you opened this», y que vaciar el registro **sí** redibuje, porque «una fila más» y «la lista es otra» son dos cosas y dejar filas fantasma sería una tabla que miente. Comprobado en rojo haciendo que la fila nueva redibuje: ocho fallos. **Y una cosa que no se puede afirmar**: escribí primero «la fila que estabas leyendo no se mueve ni un píxel» y salió roja con el producto sano — la fila vieja pasó de y=31 a y=65 mientras `scrollTop` iba de 20 a 30, porque el anclaje de scroll de Chrome compensa en parte y no del todo, y eso no lo decide la app. Lo que sí distingue las dos formas de actualizar es que **redibujar te devuelve arriba del todo** y perder el sitio; eso es lo que se comprueba
- `test-ediciones-coinciden.js` — **lo que la página promete y lo que la app abre tienen que ser lo mismo**. Jose, 24/10: *"me puse a ver que en la landing y en todos los documentos sólo se habla de Acopio, no hay Acopio Básico ni Pro, así que hay que buscar, analizar, añadir o cambiar todo lo que habla de Acopio"*. Tenía razón, y lo que había era peor que una omisión: la landing llevaba **una** lista de quince funciones bajo «Built by someone who runs a warehouse», y **cuatro de ellas están cerradas en la versión gratis** —las fotos, el equipo con sus permisos, las etiquetas impresas y el respaldo de cada noche—. Quien leyera la página, instalara la gratis y fuera a buscar las fotos no encontraba una función que faltaba: encontraba una promesa que no se cumplía. Y la nota de «What Pro adds» que escribí ese mismo día la escribí de memoria y **se me dejó tres de las once ofertas fuera** (escanear, apartar material y avisar por correo al guardar) — otra vez dos cosas que tienen que coincidir sin que nada lo obligue, el mapa de candados de la app (`BASIC_PRO`, `BASIC_FUERA`) y la lista de la página, en dos archivos distintos y sin nada que los junte. Ahora cada línea de la sección de Pro lleva `data-pro` con la clave del candado que la cierra, y la prueba exige **las dos direcciones**: que toda clave que la página nombre exista de verdad en la app, y que **toda oferta de `BASIC_PRO` aparezca en la página** — son la superficie de venta de la gratis, y la que no se nombra no se puede comprar. Lo que `BASIC_FUERA` esconde **no** se exige al revés, y a propósito: es «fontanería que no vende nada» (palabras del comentario de la propia app), el botón de soporte y el reconstructor de existencias, y que no estén en la página es correcto. Comprueba además que la lista esté **partida en dos** con su encabezado por edición, que ninguna función de Pro se haya colado entre las gratis ni al revés, y que las dos ediciones se **nombren** en inglés y en español con el $0 a la vista — sin eso se podría quitar toda la partición y el resto seguiría verde. Y dos reglas más que salieron de dos errores míos del mismo día: **ninguna oferta puede sostener dos líneas** (una línea sí puede nombrar dos candados —el lector de correos y el de facturas son dos ofertas y una sola frase—, pero dos líneas con el mismo candado significan que al pulsar una la app contesta de la otra, que es literalmente el fallo del 21/10 que Jose encontró con el low stock y los incomings); y **nada de lo prometido en Básico puede necesitar un permiso que su manifiesto no pide** — metí en esa lista «un reporte cada tarde, que llega solo por correo» leyendo el mapa de candados y no `appsscript.basic.json`, que pide UN permiso: sin `script.send_mail` no hay ningún correo y sin `script.scriptapp` no hay disparadores, así que era imposible dos veces. **El candado es la mitad de la verdad; el permiso es la otra**, porque una función puede faltar en la gratis por estar cerrada con una oferta detrás o porque el permiso no se pide, y yo sólo había mirado la primera. Con una regla final que se pone roja si ese manifiesto deja de tener un solo permiso, porque entonces las tres anteriores hay que volver a mirarlas
- `test-dentro-y-fuera.js` — **dentro de la bodega y fuera son dos cosas distintas**, y es el hallazgo de concepto más importante que ha hecho Jose. 23/10, con una captura del formulario de devolución: el campo de «de dónde vuelve» llevaba una OBRA y debajo salía *«📍 GHH SCENIC MOUNTAIN 4PLEX PHASE2 is not a location in your warehouse yet · [+ Create…]»* — pulsarlo le añade al mapa de su almacén **un estante que no existe**. La causa: `#mSrc` es «Source Rack» en una entrada, una salida y un traslado —un sitio de DENTRO— y pasa a ser «de qué obra vuelve» en una devolución —un sitio de FUERA—, y lo único que cambiaba al cambiar de pestaña era la etiqueta; su `list` seguía siendo la de estantes, así que todo lo que pregunta «¿es esto un campo de ubicación?» contestaba que sí. **Un elemento con dos significados.** La prueba ejecuta `_esCampoDeUbicacion` contra el mismo elemento con y sin la marca, y contra el estante de destino, que **sí** debe seguir avisando. La segunda mitad es la que Jose pidió dos veces: *"¿por qué hay un FROM y un CAME BACK FROM? Esas son la misma pregunta que espera dos datos diferentes"* — y su captura lo prueba, los dos campos con el mismo texto escrito y cada uno ofreciendo una cosa distinta («crea esto como estantería» / «añade esta obra a tu lista»). Ahora se pregunta una vez y la obra **se deduce**, porque esa columna es la que sostiene el boneyard del 15/10: si lo contestado es una obra conocida se guarda con el nombre **tal como está en la lista** (escribir la versión tecleada sembraría los duplicados que la v12.93 limpió), y si es una dirección suelta la columna queda vacía, que es la verdad. Ejecuta además el constructor de la lista de sitios de fuera contra movimientos de mentira: un estante que aparece como destino de una salida **no entra**, porque si está en Settings → Locations es de dentro pase lo que pase en los movimientos. Y cubre algo que salió del propio Error Log de Jose: seis `SYSTEM_BUSY` seguidos registrados como ERROR en un minuto — esperar turno no es una avería, y desde que ERROR avisa por correo era un correo al admin cada vez que dos personas guardaban a la vez
- `test-seguro-que-si.js` — **decir «sí» en un aviso tiene que guardar, no reventar**. Jose, 23/10: devolvió 60 de un material del que sólo habían salido 49, el aviso salió bien, pulsó **Save anyway** y la app reventó con `Cannot set properties of undefined (setting 'forceSubmit')`. No se podía guardar. **Y no era una, eran cinco**: las cinco preguntas de «¿seguro?» de `submitMovement` —existencias en una entrada por ubicaciones, filas de un traslado, devolución sin estante, devolución de más de lo que salió, merma sin existencias— llamaban a `_doSubmit` **antes de que `payload` existiera**. `_doSubmit` es una declaración de función, así que está disponible desde el principio del cuerpo; `payload` es un `var`, así que ahí vale `undefined`. Cinco diálogos en los que decir «sí» reventaba, y sólo se descubrió el día que alguien dijo «sí» en uno. La prueba **no mira los cinco casos, mira la forma**: parte la función por donde nace el `payload` y exige **cero** llamadas a `_doSubmit` y cero ventanas de confirmación antes de ese punto — así la pregunta número seis que alguien escriba mañana cae aquí igual. Y defiende la estructura que lo arregla: un chequeo **apunta** la pregunta (`_preguntarAntes`, gana la primera, como antes), y hay **un solo sitio** que decide entre preguntar y guardar, después del `payload`. De paso corrige algo que nadie había notado: antes un aviso blando cortaba el camino con `return` y las validaciones duras de más abajo no llegaban a correr; ahora un error de verdad gana a un «¿seguro?», que es el orden correcto
- `test-fusionar-y-ver-errores.js` — **unir nombres no puede negarse en el caso más común, y el registro de errores tiene que ser una ventana**. Dos cosas de la misma sesión de Jose (22/10), juntas porque la segunda es la herramienta con la que se diagnostica la primera. **La fusión**: en su pantalla había 20 grupos de proyectos duplicados y 8 de proveedores, y **fallaban los 28** — «ASPEN HOLLOW LOT 14» catorce veces. Dos líneas se contradecían sin saberlo: el navegador proponía como duplicados dos nombres que tras normalizar son el mismo, y el servidor quitaba de `from` todo lo que en mayúsculas coincidía con `into`, se quedaba sin nada y se negaba — **justo en el error de escritura más frecuente que hay**. La prueba ejecuta el detector de parecidos para confirmar que sigue agrupando grafías (es correcto que lo haga; lo que estaba mal era negarse después) y que sigue sin agrupar dos obras distintas. **La causa de fondo**, que es el segundo arreglo: nada en el camino de escritura de CONFIG comprobaba duplicados — el único sitio que sí era el botón «añadir» de Ajustes, la puerta de delante cerrada con llave y las tres de atrás abiertas. Ejecuta el escritor con las catorce copias de Jose más dos grafías de otro nombre y comprueba que salen tres, conservando la primera grafía y **diciendo lo que quitó**. Defiende también una decisión difícil: `loadConfig` **no** esconde los duplicados al leer, porque `updateConfig` escribe celda a celda y la hoja no se reescribe con el uso normal — esconderlos dejaría las catorce filas ahí para siempre sin que nadie pudiera verlas ni arreglarlas, que es quitar el síntoma y dejar el problema sin dueño. **El Error Log**: se traía una vez al abrir Ajustes y entrar en la pestaña no volvía a preguntar, y `var _errorLogData = []` nace lista vacía —verdadera en JavaScript— así que el `if` que debía pedirla era inalcanzable. Ahora pregunta al entrar y, como pidió Jose, **mete sólo las filas que faltan arriba** en vez de repintar: el scroll no se mueve, el buscador conserva lo escrito, y no te saca del grupo que acabas de intentar fusionar. Qué fila es nueva se sabe por su `requestId` y no por la fecha, que fallaría con dos errores en el mismo segundo — justo lo que pasa en una ráfaga
- `test-borrar-en-tanda.js` — **borrar 490 no pueden ser 490 peticiones, y tiene que poderse parar**. Jose, 22/10, con dos vídeos —el principio y el final, porque grabar la media hora entera no cabía—: marcó 490 movimientos, pulsó Delete, **tardó casi treinta minutos**, acabó en *«450 moved to the trash · 40 could not be deleted»* con dos avisos idénticos apilados, y *"no hay forma de pararlos ni borrar lo que la app ya está haciendo"*. No la había: nada en toda la app vaciaba `_delQueue`. Las cuatro faltas salían de lo mismo —una petición por fila—: la media hora (490 viajes, cada uno reconstruyendo el almacén), el *«Too many requests»* (el servidor permite 240 llamadas/minuto y **la ráfaga de la app lo atravesó**, y luego el mensaje le pedía a Jose que esperara), los 40 avisos apilados, y que 490 peticiones sueltas no tienen un punto donde cortar que se pueda contar. La prueba **ejecuta el motor** contra una hoja de 493 filas: comprueba que un trozo se lleva como mucho el tope y **dice que quedan más**, que devuelve **los ids que se llevó y no sólo cuántos** (la primera versión devolvía el número y el navegador quitaba «los primeros N que pedí», dando por hecho que el servidor recorre la hoja en el orden en que se marcaron las filas — no tiene por qué), que lo que no se pidió sigue donde estaba, que la cuenta cuadra, y sobre todo que **toda la tanda cuesta una lectura y dos escrituras**, que es la diferencia entre media hora y unos segundos. Más el botón de parar (sólo en los trabajos que de verdad se pueden parar; un botón que no para nada enseña a no pulsar el que sí), que el final diga **cuántas se borraron y cuántas quedaron intactas**, que «Too many requests» cuente como turno y no como fallo, que los avisos idénticos se agrupen con un contador en vez de apilarse, y que deshacer una importación grande **siga pidiendo hasta terminar** en vez de quedarse a medias diciendo que ya está. Conserva a propósito el camino de UNA fila: ahí sigue siendo mejor — quita la fila al pulsar, la devuelve a su sitio si el servidor dice que no, y trae las cifras del almacén
- `test-importar-sin-perder.js` — **importar no puede perder filas, ni duplicar un almacén en silencio**. Jose, 22/10, con una captura de su pantalla: se leían cuatro números a la vez y ninguno era el mismo — *1053 líneas · 1052 row(s) found · 1052 ready to import · Showing the first 100 of **500** rows · ✓ Import **1052** Valid Row(s)*. El que mandaba era el que no se veía: el servidor devolvía `parsed.slice(0, 500)` como MUESTRA, el navegador la guardaba y se la devolvía al confirmar, y **552 filas se quedaban fuera sin que nada lo dijera**. El servidor creyó que mandaba una muestra; el navegador creyó que recibía los datos — vigésimo caso de dos cosas que tenían que coincidir sin que nada lo obligara, y el único que destruye información. La prueba **ejecuta** el lector contra un CSV de 1.200 filas de verdad, porque leer el código diría que parsea el fichero y sólo correrlo dice si da 1.200 o 500. Además cubre la pregunta que hizo Jose antes de dejarme empezar —*"¿y si alguien sube el mismo archivo dos veces?"*—: la **huella** reconoce el mismo inventario aunque venga en otro orden, distingue uno al que le añadieron una fila, y distingue dos cantidades intercambiadas **aunque la suma sea idéntica** (el caso que una suma sola no ve); y el **deshacer** manda las filas a la papelera, escribe allí ANTES de quitarlas de la hoja, reescribe la hoja de una vez en lugar de mil `deleteRow` que se comerían los seis minutos, y mira también el archivo histórico. Y la prueba del ácido de la nota de Jose sobre migraciones: se cuentan filas **y** unidades antes y después, se comparan las dos, un descuadre se registra como ERROR, y el resultado se enseña **cuadre o no** — un número que sólo sale cuando algo va mal no se mira nunca
- `test-pegar.js` — **el archivo recortado es el mismo producto, y sus líneas son las mismas**. Jose, 22/10, aprobando que la app se sirva sin la prosa: la página baja de 1.590 KB a 897 KB, y **por la red de 527 KB a 225 KB**, que es lo que de verdad espera alguien en la bodega mirando una barra. El problema es que a partir de ahí lo que él pega **no es el archivo que yo leo**: dos cosas que tienen que coincidir sin que nada lo obligue, que es la falta de siempre. Comprueba cuatro: que es el mismo producto (misma versión y mismo sello, y que un `//` dentro de una URL o un texto que ve el usuario sobrevivieron enteros); que la prosa **sí** se fue (si no mordiera, el verde sería compatible con una herramienta que no quita nada); y sobre todo **que las líneas no se mueven** — mismo número de líneas y **cada una de las 1.181 `function nombre(` en la MISMA línea que en el repositorio**. Esto último es lo que hace que la consola de Jose siga sirviendo: él manda la captura, yo leo «línea 19174» y voy ahí. Con las líneas movidas ese número llevaría a OTRA línea, que es peor que no llevar a ninguna, porque se lee código que no tiene nada que ver y se saca una conclusión falsa con total confianza. Contar líneas solo no bastaría —se quita una aquí y se añade otra allá y el total cuadra—, por eso se miran las funciones una a una. Que el archivo recortado **arranque** se mira aparte, en un navegador de verdad: `node tools/test-vigilante-arranque.js pegar/Index_v3_fixed.html`, los mismos 36 verdes que el del repositorio
- `test-ventana-limpia.js` — **la ventana de movimiento, limpia**. Jose, 21/10, marcando cuatro cosas en tres capturas: *"quiero que todas las cosas que no se usen no molesten en la pantalla o ventana"*. Eran DIECISÉIS controles para registrar «llegaron 20 ventanas, están en A1A». Mide las tres soluciones, que son distintas a propósito: **Documentos** se pliega a una línea (es algo que se hace a veces y después, no un dato del movimiento), la casilla **🏷 Label** se va de la línea de cada material y la pregunta se mueve al aviso de guardado —donde se puede contestar con los bultos delante—, y los **campos que esta bodega nunca llena** se pliegan solos, sin checkbox, porque la app ya tiene todos los movimientos guardados y no hay nada que preguntar. Lo que de verdad defiende no es el plegado sino **que no se pierda nada**: con poca historia no se esconde NADA (una instalación nueva no puede decidir por una bodega que aún no ha dicho qué usa), nunca se esconde un campo CON VALOR, la línea «+ N campos más» está siempre y dice cuántos esconde, Documentos **se niega a plegarse** si hay algo dentro, y la cuenta sólo habla de lo que estaba a la vista — decir «+ 4» en WASTE, donde el tipo ya había escondido cuatro, sería mentir con un número. Comprueba además que el botón del aviso corre lo suyo **o** lo de «si no se pulsa», nunca las dos — dos ventanas apiladas es el error que costó la v11.29 — y que el campo de **camión** aparece sólo si la bodega tiene camiones registrados
- `test-candados-hablan-de-lo-mismo.js` — **cada candado tiene que contestar de lo que se pulsó**. Jose, 21/10: *"al dar clic en la ventana de low stock aparece un mensaje que dice algo sobre los incomings... analiza TODOS los candados y el mensaje que muestra, deben hablar de lo mismo"*. Existe porque el repaso a mano ya se hizo —lo hice yo al escribir el mapa— y aun así salían tres mal: el mapa es `id del botón → clave de la oferta`, **dos listas que tienen que decir lo mismo sin que nada lo obligue**, la misma falta de siempre en forma de texto. Compara las palabras de la etiqueta visible del botón (y su `title`, que a menudo es el que de verdad lo explica) con el título y el texto de su oferta; las que no coinciden y aun así son correctas —«Manage Users» contra «Your team»— se escriben con su motivo, como en `test-limite-6min.js`. Comprueba además que ningún candado apunte a una oferta que no existe (sería un candado mudo), que **ninguna oferta se quede sin usar** —y para eso cuenta las TRES puertas, incluida la llamada directa `_proPitch('reservas')` de `openLockModal`, que no está en ningún mapa: contar sólo los mapas habría dicho que esa oferta es trabajo muerto— y que el **⚙ Monitor NO lleve candado en la gratis**, porque la franja de «⚠ Below Minimum (5)» sí se ve ahí y enseñar un problema escondiendo el control que lo define es peor que no enseñar ninguna de las dos cosas
- `test-avisos-que-se-apilan.js` — **dos avisos que se apilaban, medidos en el navegador**, los dos salidos de vídeos de Jose del 21/10 y los dos la misma falta con dos caras: algo que se AÑADE cada vez en vez de haber UNO. (1) El aviso de Pro: pulsa el candado de «Incoming» cuatro veces y se apilan cuatro avisos idénticos tapando la barra de pestañas. No es un fallo de dibujo — lo que una persona hace cuando pulsa algo y no pasa lo que esperaba es **volver a pulsar**, así que las cuatro copias no son el caso raro sino el normal: el aviso se multiplicaba justo con quien no lo entendió a la primera, y encima le tapaba la navegación con la que se habría ido. (2) El mazo: doce clics en la ✕ y seguían entrando tarjetas de respaldos y archivados de cada noche. La línea que lo vacía es *una tarjeta es para «la app cambió algo que tú no pediste»; un registro es para «la app hizo su trabajo»*. Comprueba que cuatro pulsaciones dan UN aviso, que pulsar otro candado lo reusa en vez de apilar, que lleva el golpecito de «ya te oí» —sin él insistir no produce nada visible, que es lo que lleva a seguir pulsando— y que el enlace a Pro sobrevive al reuso. Y defiende **la mitad que importa**: que las rutinas desaparezcan del MAZO y no del producto. Siguen enteras en la lista que lee Settings → System, porque una prueba que sólo comprobara que ya no salen estaría igual de contenta si alguien las borrara del todo — una pérdida de datos con cara de arreglo
- `test-return-fuera.js` — **lo que está fuera de bodega, agrupado por material Y por lugar.** Jose, 20/10: *"para RETURN debe ser POR MATERIAL, porque no importa si se hicieron 4 EXITs de un material a un mismo lugar, importa cuánto material hay en ESE LUGAR para devolver la cantidad que necesitamos de ese lugar a la bodega"*. Ejecuta `getOutstandingBySite` de verdad —sacada del archivo con `andamio.levantar()`, así que mañana hereda sola las funciones que se le añadan— sobre una historia completa: cuatro salidas del mismo material a la misma obra tienen que dar UNA línea con la suma, y dos obras distintas DOS líneas, porque una lista por movimiento obliga a sumar de cabeza y una lista por material a secas da un número que no se puede devolver a ninguna parte. Comprueba también que una devolución RESTA del saldo de su sitio, que un saldo que llega a cero o a negativo **desaparece de la lista** —ofrecer devolver algo que ya volvió es el agujero que esto viene a cerrar—, que el sitio se lee de `DEST_LOC` en una salida y de `SRC_LOC` en una devolución (la misma columna al revés), que una fila sin sitio no se ofrece, y que los datos que se autorrellenan salen de la **última** salida y no de la primera, sin que un campo vacío reciente borre lo que dijo la anterior
- `test-return-lista.js` — la otra mitad de lo mismo, **medida en el navegador**. Jose: *"debería dar la lista de todos los materiales parecidos y SOLO COMO LISTA FLOTANTE, no como tarjetas abajo del nombre... debería tomar los datos de ese material y autorrellenar los campos... incluso debe sugerir la cantidad como se lo hace en un EXIT"*. Abre un navegador porque lo que importa aquí no se puede leer: que la lista salga **al entrar en el campo** y no tras teclear dos letras —al devolver no se sabe el nombre, que es justo el motivo por el que Jose la pidió—, que elegir una fila deje puestos nombre, sitio, cantidad sugerida, unidad, obra, PM y categoría, y que la caja se cierre **después** del `input` del nombre, porque ese `input` vuelve a entrar en la misma función que la abre. Defiende dos decisiones a propósito: que «Returned By» se quede VACÍO (esa columna cambia de significado con la dirección del movimiento — en la salida es quien lo entregó, en la devolución quien lo trae) y que una unidad que no está entre las opciones del desplegable **no se escriba**, porque asignarla lo dejaría en blanco y un blanco ahí es el dato perdido en silencio. Y que haya **UN** cuadro y no dos: las dos listas que cuelgan del nombre son contrarias —en bodega / fuera de bodega— y con dos cuadros, cada uno con su mostrar y su esconder, el día que uno se abra sin que el otro se cierre se ven las dos a la vez. La prueba encontró dos cosas: que cambiar de pestaña dejaba la caja flotando encima del formulario nuevo, y que `mPM` estaba escondido en RETURN mientras `_doSubmit` lo lee SIEMPRE, así que un PM escrito en una entrada viajaba a la devolución sin que nadie lo viera
- `test-gratis-escribe-igual.js` — que la versión gratis escriba en la hoja exactamente lo mismo que la de pago. Jose, 18/10: *"aun si el usuario decide usar acopio basico, la app debe guardar en el sheet toda la informacion como la guarda actualmente... sino, pasaremos mucho tiempo arreglando todo"*. Si la gratis escribiera un formato reducido, pasar a Pro dejaría de ser cambiar el código y pasaría a ser una MIGRACIÓN que además habría que acordarse de ampliar cada vez que Pro ganara una columna — o sea, otra vez dos cosas que tienen que coincidir sin que nada lo obligue. La prueba no lo pide por escrito: comprueba que `ACOPIO_BASIC` **no aparezca** en `addMovementsBatch_`, `parseArchiveRow`, `padRow_`, `ensureArchiveWidth_`, `processMovementInner_` ni `calculateStock`, así que no existe código capaz de escribir distinto. Mira el código sin comentarios (el de la constante nombra `AC` y `appendRow` para explicar lo que tiene prohibido, y buscar el texto crudo haría que la prohibición contara como el delito). Vigila además que la constante esté declarada UNA vez y en `false` en el archivo que se publica, que viaje al navegador por los tres caminos de `getInitialData` en vez de que `Index` declare su propia copia, que `AC` y `AC_WIDTH` no tengan condiciones, y los dos manifiestos: el de la gratis con UN permiso no sensible y `access: MYSELF` —sin usuarios dentro, el portero es el despliegue— y el de pago intacto
- `test-boneyard.js` — qué sobró de qué obra y dónde se usó. Corre el MOTOR DE STOCK DE VERDAD, sacado del archivo con `vm`, sobre la historia completa del caso de Jose: se compran 60, salen 60 a BLACK HOUSE 2, vuelven 40, y 12 de ésas se van a LAKESHORE. Comprueba el número que sale, no que el código esté escrito. Defiende las dos decisiones de diseño: que boneyard sea un ESTADO y no una categoría —como categoría, cada categoría nueva necesitaría su gemela y nada obligaría a crearla—, y que el origen viva en su propia columna y no en `PROJECT`, porque el motor hace `s.project = m.project` y una devolución dejaría el material etiquetado con la obra de la que volvió. Cubre además lo que NO debe entrar: una entrada de proveedor con origen, y una devolución vieja sin él
- `test-escanear-boton.js` — el botón «Scan label» en la fila de Entry y Exit, y las DOS maneras de estropearlo. Un botón que está a la vista todo el día tiene que poder hacer algo: sin cámara (un escritorio normal) enseñaría el producto como roto, y con rol de solo lectura sería un atajo a un formulario que esa persona no puede enviar. Las dos condiciones viven juntas en `_escPintarBoton` para que no se puedan contradecir, y la prueba vigila justo eso — que la lista de roles de `applyRoleUI` NO lo nombre, porque meterlo ahí le daría visibilidad por rol saltándose la cámara. Comprueba además que siga en la MISMA fila que Entry (el sitio es el punto entero) y que el del menú de la cuenta no se haya movido: se sumó, no se mudó
- `test-vigilante-arranque.js` — que cuando la app no arranque, algo quede vivo para contarlo. La app tenía TRES protecciones para el caso «el script no corre» y las tres vivían dentro del mismo `<script>` de veintidós mil líneas al que protegían; un bloque que no compila no ejecuta ni una línea, así que el día que no compiló se cayeron juntas y la pantalla de carga se quedó puesta diciendo «conectando» cuando quería decir «me morí antes de empezar». La comprobación que lo dice de verdad ROMPE el bloque grande a propósito y mira si sale el aviso. Vigila además que el vigilante siga en SU bloque y sin llamar a nada del otro —moverlo «para tenerlo todo junto» lo deja leyéndose igual de bien y sirviendo para nada—, que distinga «falta nuestro archivo» de «falta la librería de Google» porque las soluciones no se parecen, y que sin Google Charts la app siga pintando cifras en vez de morirse por dos gráficas
- `test-telefono.js` — las cuatro cosas que Jose encontró grabando la app en su teléfono, todas MEDIDAS en un navegador: que el nombre del material quepa en el cajón del estante (salía como "P…" en la pantalla desde la que se pulsa Exit), que la entrada al mazo sea UNA y valga abierto y cerrado, que la salida aceptada se mueva y la descartada no, que la ventana use `dvh` para que el teclado no tape el botón de guardar, y que la cabecera se encoja al bajar en el teléfono y NO en el escritorio
- `test-verdad-y-huerfanos.js` — tres cosas que daban una respuesta FALSA con cara de respuesta buena: que la app no acuse a un compañero inexistente de soltar una reserva (lo dedujo del efecto; el dato real estaba en la columna UnlockedBy sin leer), que el cartel obedezca el estado que manda el servidor en vez de adivinarlo, que buscar DIGA cuándo no miró el archivo en vez de contestar "no hay nada", y que fusionar dos ubicaciones mueva también los candados y las fotos — lo que no se ve se quedaba apuntando a un estante muerto
- `test-fotos-y-mayusculas.js` — que la foto se enderece antes de subirla (y que eso NO toque los PDFs, que pasan por la misma puerta y dejarían de ser PDFs si cruzaran un canvas), que la vista previa deje de recortar el documento por arriba, y que PO, GC, proveedor y recibido-por se guarden con una sola grafía. El giro se MIDE ejecutando `getBase64` con un JPEG construido a mano que lleva marca de orientación 6
  instead of the Apps Script editor. The feature is small; the failure modes
  are not, so both are held shut here: the key must never come back to the
  BROWSER (getAiStatus returns configured + the last four characters and
  nothing else) and must never reach a SHEET (the audit log records that a key
  was set, never the key — that tab is openable by anyone with the file).
  Also asserts the reason the save is deliberately slow: it spends one real
  call verifying the key BEFORE storing it, a rejected key is not stored, and
  a rejected REPLACEMENT leaves the working one alone. And that a missing key
  is treated as an unconfigured setting rather than a failure — NO_AI_KEY is a
  marker the browser turns into an explanation with a button, not a red
  error.
- `test-brand-corner.js` — the logo / company name / "Acopio" badge lockup,
  and the test a screenshot cannot be: it MEASURES the badge's bottom edge
  against the navy strip's bottom edge and fails on overlap, rather than on
  looking wrong to somebody. Runs three real logo shapes (wide, square, tall)
  because the bug was shape-dependent — the merged topbar takes the brand
  block out of flow so the tabs centre on the page, which is right and was
  measured, but an out-of-flow block cannot tell its container how tall it is,
  and min-height:74px held only while the logo was a fixed 26px. Also asserts
  no shape collapses under 18px in either axis (a tall logo at a fixed height
  is an unreadable sliver), that --brand-h is measured rather than hardcoded,
  and that the company name uses a different face from the rest of the app
  without waiting on a font server to render.
- `test-terms-checkbox.js` — the consent checkbox on the "👉 START HERE"
  sheet, run in a Node vm against a fake sheet that remembers what was
  CLEARED rather than merely overwritten. It exists because Jose found the one
  surface whose only job is recording agreement recording the opposite:
  un-ticking the box left "Accepted 8/24/2026, 2:30:03 PM" and the next-step
  line sitting there, a page claiming a consent that had just been visibly
  withdrawn. onEdit returned early on anything that was not TRUE, so the
  un-tick was never handled — easy to write and easy to miss, because the
  happy path looks perfect. Also covers what a SIMPLE trigger must never do:
  react to another cell, react to B14 on a different tab (B14 exists on every
  sheet), or throw on a malformed event and put a red error marker on the
  customer's file.
- `test-entry-autofill.js` — picking a material that already exists out of
  "📦 Already In Stock" on the ENTRY form. Two halves of one bug, both of
  which looked like nothing happening rather than like an error: the pick
  filled only the NAME, and everything that did autofill wrote into the SHARED
  fields at the bottom of the form — which only exist while "All materials
  share the same Supplier / GC / Project / PM…" is ticked. Untick it and each
  line grows its own set with different ids, so the autofill was writing into
  five boxes that were hidden at the time. The happy path worked perfectly,
  which is why it survived. Covers both checkbox states, that it fills the
  RIGHT line out of several, that anything already typed is never overwritten,
  that a material with no history fills nothing rather than guessing, that the
  GENERIC placeholder project is not offered as though it were real, and that
  the most recent movement wins.
- `test-packs.js` — the packs data layer (MATERIAL_PACKS), the half of the
  units feature that ships before any of it is visible. Runs `packMath_`,
  `packKey_`, `roundQty_`, `readPacks_`, `saveMaterialPack` and
  `deleteMaterialPack` in a Node vm against a fake spreadsheet. The arithmetic
  cases are worked out BY HAND, not copied from the output — a test that
  asserts whatever the code happens to print is not a test, and this one
  caught my own error first (I had written 0.4083 for 45/110.23, which is
  0.4082). Covers the floating-point trap that makes inventory drift
  (0.1 + 0.2 stored as 0.30000000000000004 and never reconciling), a factor or
  price of zero or a negative returning null instead of an Infinity that would
  reach a sheet, and a material carrying several packs at once (a pallet of
  360 tubes AND a box of 12). It also pins the refusals, which are the rows
  that would look like they changed something while changing nothing: a pack
  of exactly 1, a pack size that is not a number, a hand-edited sheet row with
  a blank size — skipped rather than defaulted to 1, because a silent 1 makes
  "12 boxes" quietly mean 12 units. Just as hard, it asserts what the
  packs layer must NOT touch: `calculateStock`, `refreshDerivedSheets_` and
  `addMovementsBatch_` still contain no reference to packs, so stock is still
  replayed exactly as before and this release cannot move a number.
- `test-start-here.js` — the very first screen a customer ever sees, actually
  RUN. `createStartHereSheet_` draws the welcome panel, the consent checkbox
  and (v11.12) the two tabs holding the Terms and the Privacy Policy plus the
  links into them; it executes once, on first open, before anything else in
  the product exists. That makes it the worst possible place for an untested
  throw — a half-drawn sheet, no app, no wizard, and nothing saying why. It
  was also the least-covered code in the file: `test-terms-checkbox.js` covers
  what happens when the box is TICKED, and nothing covered the drawing, so
  `node --check` was the only thing that had ever looked at it. Runs the real
  functions in a Node vm against a fake spreadsheet: both documents get a tab
  with their text and their "last updated" date, running twice replaces the
  tab instead of stacking a second one, and the consent sentence stays one
  sentence with exactly two links — each pointing at the gid of the right tab,
  which is the silent failure here, because a link to the wrong tab still
  looks like a working link.
- `sync-legal.js` — not a test, a generator, but `--check` runs with the
  suite. There are now THREE copies of the legal text: `legal/*.md` (source of
  truth), `LEGAL_DOCS` in the app, and the two spreadsheet tabs the customer
  reads before ticking the consent box. The third is generated rather than
  hand-maintained, because the drift this guards against has already happened
  once (see `test-legal-sync.js`) and a third hand-kept copy would have made
  it likelier, not less.
- `test-form-symmetry.js` — a browser test for the rule that a checkbox may
  MOVE fields but must not rewrite the form around them. ENTRY's "All
  materials share the same…" and EXIT's "All materials go to the same
  destination" each swap a shared block for a per-material one, and both had
  drifted: ENTRY's per-material block asked "PM" where the shared block asks
  "PM (Project Manager)" and put it before Received By instead of after;
  EXIT's per-material Destination sat ABOVE the rack list, so ticking the box
  shoved every rack row up or down. Neither is an error — each screen looks
  fine alone, and only somebody toggling the checkbox and watching the form
  rearrange itself would ever see it, which is why both survived. The EXIT
  half is measured, not read: it snapshots positions relative to the top of
  the material box (so scrolling between snapshots cannot fake a result) and
  asserts the rack list starts at the same offset either way. Also guards the
  "×" rule — the delete button is hidden on the last material and the last
  location, because all four remove functions refuse to delete it and it was
  a red button that did nothing when pressed. It asserts the column widths
  are unchanged when that button hides, which is the reason the location
  buttons use `visibility` and the material ones use `display`. Writing it
  caught a third bug nobody had reported: `.btn-remove-loc` carries
  `transition:.15s` with no property named — meaning `all`, visibility
  included — so adding a second rack row left the first row's × invisible for
  ~150ms at exactly the moment you look to see whether anything happened.
- `test-config-snapshot.js` — the configuration snapshot written into every
  backup copy (`writeConfigSnapshot_`), lifted verbatim into a Node vm with
  SpreadsheetApp and PropertiesService stubbed. A backup copies the
  SPREADSHEET, but Script Properties belong to the Apps Script project, so a
  restored copy used to come back with every movement and no configuration —
  worst of all FOLDER_PREFIX, without which every attachment silently stops
  opening. Checks the properties that must be carried AND, just as hard, the
  four that must never be: OAUTH_CLIENT_SECRET above all, since it is ours
  rather than the customer's and identical across every installation. Also
  that all four are still NAMED so whoever restores knows what is missing,
  that a fresh install says so instead of writing an empty grid, and that the
  snapshot opens the copy by id and never touches the live spreadsheet.
- `test-legal-sync.js` — keeps `legal/*.md` and the copies embedded in the app
  (LEGAL_DOCS) from drifting apart. The drift already happened once and it
  mattered: v9.77 shipped the setup check-in, which emails us the company
  name and the admin's address, while both copies of the privacy policy still
  said we receive nothing at all. Nothing in the toolchain could see it — a
  stale sentence is valid HTML and valid Markdown. Checks matching
  "last updated" dates and numbered section headings in both, that specific
  disclosures a customer relies on appear in BOTH copies, and that the one
  claim that was actually false ("a subpoena produces nothing, because we
  hold nothing") cannot come back.
- `test-morning-arrived.js` — the "Mark arrived →" shortcut on the morning
  popup's cards (v9.94), showMorningPopup lifted verbatim into a Node vm and
  its markup read back. Checks the RULES rather than the styling: an ADMIN
  gets it, WAREHOUSE and VIEWER never do (same gate as the Incoming table's
  own edit pencil), it is not offered on a delivery already marked Arrived,
  it IS offered on later-this-week rows since deliveries turn up early, and
  an item id containing a quote cannot break out of the attribute. Also
  asserts what the handler must NOT do: it re-checks the role instead of
  trusting that the button was hidden, and it never calls the server — it
  opens the item's own edit window with Arrived pre-selected and the person
  still presses Save, because a delivery marked received by one stray tap is
  worse than one extra click.
- `test-morning-arrivals.js` — that the morning popup stops saying "Nothing
  arriving today" on a morning when three deliveries already arrived (v11.71),
  the real `_todayArrivals`, `_incEntryWhere`, `_incItemHtml`,
  `showMorningPopup`, `openWeekSchedule` and `_refreshMorningPopup` lifted into
  a Node vm with only the DOM faked. The cause was one line:
  `_thisWeeksDeliveries` filters on `_incStillPending`, so a delivery marked
  Arrived does not sort lower — it vanishes, and the sentence was computed over
  a list the three arrivals had already been removed from. Half the assertions
  here are not about finding the entry but about **staying quiet when it cannot
  be sure**: nothing links a delivery to a movement, so the rack is found by
  matching, and matching is guessing. Showing the wrong rack silences the alarm
  that material arrived unregistered; showing none when it was registered only
  nags. So it checks that an entry from another day with no PO does not count,
  that a matching PO does count across days but never before the delivery's own
  date, that a different category disqualifies while a missing one does not,
  that an EXIT is never mistaken for an ENTRY, and that a split entry names
  every rack. Then Jose narrowed the rule — "when I said nothing shows, I meant
  the LOCATION; every material this week expects or receives has to be visible
  in the window" — which exposed two more holes with one cause: both lists only
  looked forward from today, so a delivery that arrived Monday and still had no
  entry was gone by Tuesday, and so was one that was due Monday and nobody
  marked. Now `_weekArrivals` and `_overdueThisWeek` cover the whole week, and
  this checks that they show up, that today sorts first, that the late block
  sits at the top, that a delivery's rack is matched against **its own day**
  rather than today (or everything before today would print blank), that last
  week's arrivals stay out, and — the part that matters — that neither list
  counts toward closing the window, since one stale Pending row nobody cleans
  would otherwise hold it open forever. Plus the button opening on arrivals or
  late rows alone, and the bigger Arrived badge hung off `#morningPopupBody` so
  it cannot reach the Incoming tab, which Jose said explicitly is fine as it is.
- `test-user-column.js` — that the Movements "User" column shows a person and
  not an address (v11.73), `userDirectory_` lifted out of `Code_v3_fixed.gs`
  into a Node vm against a fake sheet, the cell builders out of the HTML, and
  the hover card measured in a real browser. The missing piece was on the
  server: the name lives in USERS_V3 and does not travel with movements, and
  `getUsers()` is ADMIN-only, so for a warehouse user the column would have
  stayed an address no matter what shape it was given. Two decisions are what
  this file actually protects. **The name is not written into the movement** —
  it is resolved when the row is drawn, so fixing a spelling in Manage Users
  corrects every row that person ever saved instead of leaving the old name
  frozen in thousands of them. And **no name is ever guessed from an address**:
  splitting on the dot would turn `info@` and `jc@` into people who do not
  exist, and an invented name on the record of who moved stock is worse than an
  address. It also pins what leaves the sheet — the fake sheet records the range
  it was asked for, so a future "just send the whole row and let the browser
  filter" would fail here rather than quietly shipping everyone's role to
  everyone — and that `userNames` sits OUTSIDE the `if (auth.role === 'ADMIN')`
  block, a mistake only Jose would never see, because Jose is an admin. The
  browser half measures the one thing reading the file cannot: that the card
  stays open while the mouse crosses the gap from the name to its buttons, which
  is the whole reason it is not a tooltip.
- `test-derived-refresh.js` — `refreshDerivedSheets_` executed for real against
  fake sheets that RECORD what was asked of them (v11.74). Nine files in this
  directory name that function; none of them ran it — most read it as text and
  pattern-match inside, and `test-text-stays-text.js` replaces it with an empty
  stub. So until this file existed, the arithmetic that produces every stock
  total in the app could be changed and the suite stayed green. It got found
  while measuring why the app pauses before each toast. The change it guards is
  small — don't read ARCHIVE_HISTORY when it is empty — but the bug it could
  introduce is silent and expensive: skip it when it has rows and those
  movements stop counting, so the warehouse reports less material than it holds
  and nothing warns. Both halves are checked, and the recording is the point:
  asserting "the total came out right" would pass on a version that reads the
  empty sheet anyway and throws the answer away. It also covers the arithmetic
  nobody was executing — ENTRY/EXIT/TRANSFER/RETURN/WASTE netting in one rack,
  ADJUST moving stock in both directions without inventing waste or site stock,
  a zero rack not taking up a row — and the line the source itself marks
  CRITICAL: `"B1A"` and `" b1a "` are one rack, or a +21 parks under one key
  while its −21 lands under another and the material never leaves the warehouse.
  **The measurement that started it, from Jose's file:** reading ARCHIVE_HISTORY
  with ZERO rows cost 1043/426/422 ms; reading MASTER_ARCHIVE_V3 with 1061 rows
  × 23 columns cost 964/983/643 ms. What Sheets charges for is the round trip,
  not the data — so any optimization that starts with "read fewer cells" is
  looking at the wrong number.
- `test-row-leave.js` — the one way a row leaves, and the row leaving on the
  CLICK rather than on the server's answer (v11.75), measured in a real browser.
  Jose asked for the motion everywhere something disappears — "debe ser estándar
  en la app" — so this is not "animate deleting movements", it is `_rowLeave`,
  one function whose `done` callback is what lets eight different places share
  one shape instead of eight similar ones. The assertion that matters measures
  the row's real HEIGHT mid-animation, not the presence of a class: **the trap
  this file exists to catch is the v11.66 lesson** — a caller that redraws its
  whole list wipes out the element being animated in the same frame, the row
  never shrinks, the list just flickers, and a class-based check would pass
  anyway. It also pins that a table row shrinks the TABLE with it (so the rows
  below genuinely rise), that a card both shrinks and slides (a `<td>` cannot
  take a transform, which is why there are two classes), that `done` always
  fires exactly once — no element, detached element, reduced motion — and that
  `prefers-reduced-motion` gets the callback immediately instead of 240 ms
  later. The source half checks ORDER, not mentions: `_rowLeave` before
  `_delEnqueue`, the redraw INSIDE the callback, and the rollback putting a
  refused row back at its own index rather than at the end — the end would tell
  someone their movement is the newest when it is a month old.
- `test-bell-count.js` — that the bell's number and the bell's list are the same
  thing (v11.77), the real `_syncCfgBell` run against a fake DOM that remembers
  what was put into it. Jose photographed a bell reading 3 that opened onto 2:
  the count summed all three kinds of card, the panel was built from two of
  them, and the comment directly above the line promised "The panel lists ALL
  of them" — the third comment in two days claiming what its code does not do.
  The assertion is the INVARIANT, not that one fix: badge number equals row
  count. A counter that disagrees with its own list teaches people not to trust
  the bell, which the counter's own comment already said the last time this
  happened with a different card kind. The fake `querySelectorAll` really
  searches the HTML it was handed rather than returning an empty list — without
  that, the second bug here would have shipped: the deck's button handlers are
  bound with `deck.querySelectorAll(...)`, so putting the same attribute in the
  panel and assuming the behaviour comes with it leaves two buttons that do
  nothing. Also pins that the panel lists ALL of them while the pile rations to
  five, and that the orange ones sort first.
- `test-also-arrived.js` — the offer to mark the OTHER expected deliveries that
  a multi-material entry just covered (v11.78), the real matcher and dialog
  logic lifted into a Node vm with a DOM that remembers what it was given. Jose
  received a truckload, entered all four materials at once because he had the
  paperwork in hand, and only the delivery he came in through stopped being
  "expected" — his screenshot has `ENTRY · IGU-KUNA-JA · +1` in the table behind
  a popup still calling `IGU-KUNA-JA` Pending. **What this file protects is not
  that it finds things, it is that it does not invent them.** Nothing links a
  delivery to a movement, so the match is a guess, and the two possible errors
  cost very different amounts: missing one means marking it by hand as before,
  while marking one that is still on the road means you stop waiting for
  material that never came and nobody notices until it is missing. So half the
  assertions require that NOTHING appears — a delivery from another day, one
  already arrived or cancelled, one whose category disagrees, a PO match dated
  in the future, and the delivery the form itself came from (already saved as
  Arrived, though the browser's copy has not caught up yet). It also pins that
  the offer writes nothing, that only ticked boxes are saved, that the whole
  17-column row goes back rather than the status alone, and that the matching
  rule exists exactly ONCE — `_incEntryWhere` and this share
  `_incMatchesMove`, because two similar copies means the day one is tuned the
  app says "it is in A-3" about a delivery it is simultaneously offering to
  mark as arrived.
- `andamio.js` — NOT a test: the shared scaffolding the vm-based tests are
  built on. It exists because the suite went red six times in one week for the
  same reason: a test lifts function X out of the source, somebody adds a call
  to Y inside X, the sandbox has no Y, and the test dies on "Y is not defined" —
  measuring the scaffolding instead of the product. Each time the fix was to add
  the missing name BY HAND to that one sandbox, i.e. to maintain by hand a
  dependency list the source already knows. `levantar()` resolves them
  transitively instead. Two things it got wrong first, both kept in the comments
  because they are the interesting part: it matched `name(` and so missed
  `textCell_`, which `textSafeRow_` passes to map as a bare REFERENCE (the same
  shape that slipped past me twice hunting the double-quote), and without stubs
  it drags 147 KB of the 553 KB file because `getUserRole` pulls a quarter of it
  — so `dobles` is not only where you fake things, it is where the search stops.
  `montar()` is the recommended entry point: a `function X(){}` declared inside
  the box SHADOWS the X a test put in the context, so a test could believe it
  was measuring its own double while actually running the product. It refuses
  loudly instead of letting that pass. Also ships the Sheets-parsing fake sheet
  (it parses dates, eats the leading apostrophe, and its deleteRow really
  shifts) and the scorekeeper.
- `test-refresco-tanda.js` — ten deletes in a row cost TWO rebuilds of the
  derived sheets, not ten (v11.89). Jose after testing two accounts: "everything
  updates, NOT at the speed I would like" — and there was a number behind it.
  `refreshDerivedSheets_` rebuilds LIVE_STOCK/SITE_STOCK/WASTED_STOCK, about
  nine round trips to Google, measured on HIS sheet at 3.7 s. Every operation
  paid it alone, so deleting ten rows cost ~40 s of work that needed one. The
  browser already batched its own reload; the SERVER's work was not batched.
  The question that had to be answered before writing any of it — can this be
  deferred without letting somebody take out material that is no longer there? —
  is answered in the code: the derived sheets are for DISPLAY, while validating
  a movement reads the ARCHIVE through `buildStockSnapshot_`. Deferring can make
  numbers lag; it cannot pass an impossible exit. TWO and not one, stated that
  way on purpose: the FIRST cannot defer because nothing is behind it yet (the
  other nine queue up while it travels) and the LAST refreshes itself because
  nothing follows — rounding that to "one" would be rounding in my favour. Both
  halves are pinned: that the batching happens, and that the refresh ACTUALLY
  OCCURS, including the safety net where a burst cut short leaves a mark that
  the next `getInitialData` clears BEFORE reading the derived sheets. Two test
  mistakes are kept in the comments because they are the interesting part: a
  synchronous fake server made all ten look un-deferred (with an instant reply
  each job finishes before the next is queued, so the queue never has depth),
  and `_refrescoAplazado` is a VARIABLE, not a function, so the harness does not
  lift it — module state is asked for by name.
- `test-tanda-borrado.js` — deleting several movements at once, and the two
  things Jose filmed on 2026-09-15 (v11.90). The rows left the screen on click,
  as they should, and then CAME BACK a few seconds later to leave one by one —
  some of them not even greyed out, selectable, and failing with `GONE|` on the
  second try. His own error log closed it: deleted at 3:08 PM, refused at
  3:09:50 PM, SAME ACCOUNT, same movement. That is not two people colliding,
  it is one screen showing the same row twice. Cause, one for both symptoms:
  every delete moves the data stamp, this window's own heartbeat sees it
  changed and asks for a silent reload, and that reload carries a picture taken
  before the run finished. The v11.53 sequence guard does not cover it and that
  is worth stating, because it looks like it should: that rule drops responses
  that arrive OUT OF ORDER, and this one arrives in turn — it is the newest
  there is. What is stale is not the response, it is the moment the picture was
  taken. So the rule added is not about order, it is about timing: while a
  delete is in the air, no reload paints. The test does not read the file for
  phrases — it EXTRACTS the real guard out of `loadDataFromGoogle` and executes
  it, and runs the real delete queue against a fake server that answers on
  demand, which is the only way the queue ever has depth (the same mistake
  `test-refresco-tanda` made first). It also pins the old rule alone letting the
  mid-run picture through, so the bug is demonstrated and not just asserted.
  Second half: thirteen deletes used to raise thirteen toasts stacked over the
  table; now one line counts them off and ends in a green check, and a FAILED
  delete still gets its own toast because that one has to be read. The counter
  counts what was actually QUEUED, not what was selected — a row already being
  deleted does not queue a second time, and counting it would leave the line
  stuck at "12 of 13" waiting for an answer that never comes. Writing the test
  is what caught `_doDeleteMovementRow` returning nothing at all on the happy
  path, so every caller read it as "did not queue".
- `test-usuarios-barra.js` — Manage Users, the orange wall and the drawer title
  (v11.98). Jose asked for the movements-table pattern in Manage Users: name
  over email, role over date, the Add User form behind a button, and Edit /
  Deactivate switching on only when somebody is ticked. Three decisions on top
  of that are mine and each is pinned by execution, because none is visible by
  looking: your own row cannot be ticked (the server already refuses
  self-removal — the disabled checkbox is that rule said before you press);
  Edit needs exactly one while deactivating takes several; and the button reads
  Deactivate or Reactivate depending on what is ticked, switching OFF on a mixed
  selection rather than picking a half for you. Reactivating is new to the app —
  `updateUser` has always accepted `active`, nobody was asking it, and the
  window's footer sent people to edit the spreadsheet by hand. The bar is what
  runs here: it holds the decision about what may be done to a selection, and it
  is what breaks silently. Writing it caught two mistakes of mine worth keeping:
  the harness never called `_updateUsrActionBar()` on construction, so the
  "nothing ticked" state it measured was really "nobody has painted anything",
  which is not a state the product has; and counting `<th` matched `<thead` too,
  reporting six columns where there are five — a check that counts tags has to
  count tags, not prefixes.
- `test-sello-antes.js` — the stamp is read BEFORE the data, never after
  (v11.97). Jose, after deleting thirteen movements with two accounts open: "the
  last one never updates in the other account, NEVER" — confirmed over eight
  minutes of recording plus the time to compress it, download it and write the
  message. Not slow: permanent, and the cause was the order of two reads.
  `getInitialData` read the whole archive and then, in the returned object,
  read the data stamp. A delete committing between those two reads left the
  browser holding the movement list from BEFORE together with the stamp from
  AFTER — and the heartbeat compares stamps, so from then on its own and the
  server's matched, it concluded nothing had changed, and it never asked again.
  The row stayed on screen forever. It hit the LAST of a batch specifically
  because the first twelve are corrected by the reload that the next delete's
  bump triggers, and the thirteenth has nothing behind it; since v11.96 it is
  also the slowest, being the only one that rebuilds, so its window is the
  widest. v11.96 did not create this — it removed the noise that was hiding it.
  The order is not symmetric, which is the whole point: stamp-after-data gives a
  new stamp with old data, a lie that never corrects itself; stamp-before-data
  gives an old stamp with new data, which costs one wasted fetch. The test runs
  the race in both orders against the real `_pulseOk`, proves fifty heartbeats
  never recover from the old order, and pins that the product uses the new one —
  including that `dataStamp_()` is called exactly ONCE inside `getInitialData`,
  because a second call would reintroduce the bug without touching the fixed
  line. Writing it caught my own wrong expectation: with the stamp read first
  the data can come back already fresh, so the guarantee is not "the screen is
  stale" but "the stored stamp is never newer than the stored data", and both
  interleavings are tested.
- `test-seleccion-viva.js` — what is ticked is what is on screen (v11.95). Jose:
  "while ticking more movements, all the ticks cleared, that is strange". Not
  strange — reproducible, and it had two halves. `_TAB_RENDERS.movements` did
  `_movPage = 1` before painting, and that map is called by `renderAll`, which
  runs on EVERY silent reload — with two accounts working, every twenty seconds.
  The table folded back to page one and anything ticked beyond it stopped being
  drawn. The half that did not show is the one that mattered: the selection
  survived, because `_selectedMovements` walks the whole list rather than what is
  painted, so Delete stayed armed on rows nobody could see. Ticking eight, seeing
  none, and having Delete take eight is worse than losing the selection, because
  losing it is at least visible. Two rules now, tested separately: fresh data
  does not change your page (that belongs to switching screens and changing
  filters, which already do it), and a row that is not painted is not selected —
  which also covers the other account deleting a row you had ticked. The test
  EXECUTES the real pagination block, lifted out of `renderMovements` by markers
  rather than regex, against a fake table; asserting the `_movPage = 1` line is
  gone would test the fix instead of the bug. Also pins the hover card: it was
  `width:max-content`, so it measured whatever the email measured, and a wider
  card shifts further to stay inside the window — one cause for both of Jose's
  complaints, the size and the moving. Writing that check taught its own lesson:
  the first version searched the whole CSS block for `width:max-content` and
  failed, because the comment explaining the fix NAMES what was removed. A test
  that reads prose measures prose; it strips comments first now.
- `test-salidas-animadas.js` — every place a row disappears, it is seen to
  disappear (v11.94). The animation existed since v11.66 for deleting a movement
  and putting one back, and the CSS above it said, word for word, "the eight
  places where something disappears use it through _rowLeave". There were TWO.
  That comment was written with the intention and never revisited — which is
  exactly what a comment cannot hold, because it does not fall over when it
  stops being true. A counted number does, and that is what this file is.
  It pins the ORDER at each of the ten sites by running it, not by finding the
  call: repaint-then-animate shows nothing, because the repaint takes away the
  element being animated (the v11.66 trap, which has now cost two versions), so
  the repaint has to live inside the callback. Also pinned: several rows animate
  together and the repaint waits for the LAST one; nothing painted still does
  the work, immediately; reduced-motion gets no animation and no delay; a row
  already detached does not block the delete; and the callback cannot fire
  twice. The lookup is a separate guard with its own reason — values are typed
  by a person into a spreadsheet, and "JOSE'S HOUSE" inside a querySelector does
  not return null, it THROWS, which would take the whole delete down for the
  sake of animating it. So the helper compares attributes in JavaScript instead
  of building a selector, and the test carries an apostrophe and a double quote.
  Merging materials looks at name AND category, because the MatID is made of
  both and animating by name alone would show the wrong one leaving.
- `test-andamio.js` — the only test whose subject is the scaffolding. It pins
  ALL SIX of the real breakages by name, checking the dependency that was
  missing each time is now resolved on its own, plus that the resolver knows how
  to fail: a renamed function must blow up rather than return nothing, a shadowed
  double must be refused, and what comes out must actually compile.
- `test-carrera-incoming.js` — two people at once cannot make one person's edit
  land on somebody else's delivery (v11.85). `deleteIncoming` removed the row by
  NUMBER — `deleteRow(i + 1)`, and everything below shifts up — while
  `updateIncoming` wrote by its own, and neither took the lock: A opens delivery
  #5 (found at row 6), B deletes #2, A saves into row 6, which is now a
  different delivery. Both actions are ADMIN and Jose works with two accounts
  open. It is the same lesson he confirmed live on 2026-09-07 about movements —
  "a row number is what made this dangerous" — applied there and never wired in
  here. The test runs the REAL functions against a fake sheet whose `deleteRow`
  actually shifts, and INTERLEAVES the delete at the exact moment the edit has
  read and not yet written. The first version of this test was wrong and the
  mistake is worth keeping: it called `deleteRow` straight on the sheet from
  inside the write, which bypasses the lock entirely — forcing a failure
  underneath the fix proves the test is broken, not that the fix is missing. It
  now models what really happens, two separate Apps Script executions, by having
  the fake lock refuse re-entry the way `tryLock` does. It also guards the other
  half: the script lock is ONE for the whole script, so an incoming edit can now
  wait behind a movement save, and without the browser retry this would have
  traded a silent race for a visible error — which is not a fix. Including the
  trap that nearly shipped: the delete's retry must re-SEND, not re-enter
  `_doDeleteIncomingItem`, because `_busyRetry` deliberately leaves the button
  busy and the re-entry would have turned around at `if (btn && btn.disabled)
  return` and lost the delete in silence. Verified by removing the lock and
  watching four assertions go red.
- `test-entry-todo-corre.js` — the orange "it arrived, its entry is missing"
  card is cleared because we WATCHED IT HAPPEN, not because the call appears in
  the source. Until v11.70 saving an ENTRY never cleared it, so the card kept
  its "Make the entry" button, which reopened the form pre-filled with the same
  thing: saving again created the same movement again, without limit — Jose
  caught a duplicated M-KUNA D-JA +44 PO 2444540. What makes this worth its own
  file is not the bug but that A GREEN TEST SAT ON TOP OF IT: it checked that
  `_entryTodoResolve` APPEARED inside `submitMovement`, and it did — in code no
  ENTRY ever walks, because `submitMovement` leaves for `submitMultiEntry` on
  its third line. Trying to catch that with a detector does not work: scanning
  for "code after an unconditional return" as text raises 66 warnings on this
  healthy file, nearly all false (a multi-line return throws off the brace
  count), and doing it properly needs a real JavaScript parser, which this repo
  has no dependency for. Executing is simpler and needs no detector — a call in
  dead code does not happen. So the REAL `submitMultiEntry` runs against
  fourteen fake form boxes and a `google.script.run` that answers the way Apps
  Script does, and the assertions are about what occurred: the card is settled,
  it is settled AFTER the server accepted the movement (settling it for a save
  that could still fail would clear it on a lie), the failure path settles
  nothing, and the labels come before "did these arrive too?" rather than both
  at once. Verified by breaking the app on purpose in both directions: delete
  the line and both tests go red; leave the line written but put a `return`
  in front of it and the text test stays GREEN while this one fails.
- `test-no-caduca.js` — the only test in the repo whose subject is the other
  tests. On Monday 2026-09-14 the suite went red with nothing changed:
  `test-morning-arrivals` pinned its deliveries to Thursday the 10th and ran
  `openWeekSchedule()`, which does not RECEIVE the date — it reads `new Date()`.
  It passed while the real day fell in the same Sunday-to-Saturday week and went
  permanently red once it did not. A test that turns red on its own is worse
  than no test: it teaches people to glance at the suite and think "that one
  again", and the day a real red arrives it gets the same glance. So the rule is
  enforced rather than remembered: a test that hardcodes a date AND executes
  product code that reads the clock must neutralise the clock (three ways are
  accepted, all three already in use). Counting it by hand is what does not
  work — looking for it manually, three more files seemed to share the shape and
  all three were already fine. It carries a reviewed-and-cleared list with a
  written reason per entry, and that list fails if an entry stops being flagged,
  the same treatment `test-cost-privacy` gives its INTERNAL list: an exception
  nobody revisits stops being an exception and becomes a hole.
- `test-inc-supplier.js` — the delivery card reads *material - supplier* on ONE
  line (v11.82), measured in a real browser with the whole stylesheet rather
  than read off the CSS. What decides "did it drop to a second line?" is the
  height the browser gives the row, not the word `nowrap` appearing somewhere.
  It measures all four combinations, and the measurement is what caught the
  first design being wrong: with `flex-shrink` on both halves, flex divides the
  shrinking in PROPORTION to size, so a very long material name next to "AMSCO"
  clipped AMSCO too — "AMSC…" with room to spare. The rule that does what was
  asked is that the supplier does not shrink and is capped at 55% of the line,
  so whichever half is genuinely too long is the one that gives way. Both halves
  carry a `title`: shortening on screen must never mean losing what the person
  typed.
- `test-lock-visible.js` — a locked material has to say so on the screen the
  person is actually looking at, and it has to say so to EVERYONE (v11.80).
  Jose locked MH 145 at B2A from one account and the other account showed
  nothing, before or after a reload. Two separate holes, in two files, and this
  file guards both together on purpose: `lockMaterial`/`unlockMaterial` were
  outside `DATA_STAMP_ACTIONS` (so no other session ever heard), AND
  `renderStock` did not mention locks on any line (so there was nowhere to
  hear it). Fixing either one alone leaves the report exactly as invisible as
  it was. The screen half is not checked by grepping for the word "lock" —
  that trap already shipped two green bugs this week — it lifts the real
  `_stockLocks` / `_lockLines` and the Location cell EXTRACTED from
  `renderStock`, and reads the string that comes out. So it pins that the
  padlock goes BEFORE the text (the cell is `text-overflow:ellipsis`, and
  anything at the end vanishes first on exactly the rows with most racks),
  that a lock on a rack the material has since left is NOT marked (marking
  locks that no longer stop anything teaches people to distrust the padlock —
  the same damage as the bell that said 3), that the hover still carries the
  rack summary it always carried, and that a reason typed with a quote in it
  does not blow the attribute open. Plus the wording matches what the backend
  really enforces: EXIT and WASTE always blocked, an empty destination list
  meaning "move it anywhere in the warehouse, just don't take it out" rather
  than "nowhere".
- `test-labels.js` — the 4"×6" labels printed as an entry is saved (v11.79),
  measured in a real browser against the real `_labelHtml` in the real print
  sheet. A label is not a screen: the paper is the size it is, so checking that
  the CSS "says 101.6mm" proves nothing — what matters is the rectangle the
  browser draws and whether the content fits INSIDE it. The case that breaks
  this if it breaks is a very long material name: push the quantity off the
  paper and the printer produces a label with no count on it, stuck to a bundle,
  and nobody finds out until there are fifty of them. So it prints a name long
  enough to overflow and asserts the label does not grow, the content still
  fits, and the quantity block is still on the paper. Half the file measures the
  PRINT rule, which has no second chance: with `page.emulateMedia('print')` it
  checks that NO sibling of `<body>` is still visible — otherwise six pages of
  dashboard come out ahead of the first label, on stock that is bought in rolls
  — that each label breaks to its own page while the LAST one does not (or every
  batch ends by spitting a blank page), and that the reserved code area prints
  with no border and no text, because a printed empty box reads as a half-made
  label. Plus one label per RACK rather than per material — "44 · C2A, B4A"
  would be lying in both places at once — copies defaulting to 1, and the
  chaining that makes the "did these arrive too?" question fire exactly once
  after the label dialog closes, including when there was nothing to label at
  all and no dialog appeared.
- `test-sysactivity-dismiss.js` — that dismissing a system notice does NOT
  erase it from the maintenance record (`getSystemActivity` + both its
  consumers), backend lifted verbatim into a Node vm with the Sheets API
  stubbed. Settings → System said "Nothing automatic has run yet" directly
  above a "Last backup: today at 2:13 AM" line that was perfectly true —
  both read one list, but the corner deck is a NOTICE you press ✕ on and
  Settings → System is a RECORD that has to keep saying the backup ran, and
  dismissed rows were being dropped at the source. Checks that all six
  nightly backups come back with four of them dismissed, that they are
  flagged rather than missing, that each keeps its Drive link either way,
  that the deck's limit is still spent on live cards instead of being
  starved by old dismissals, and that the two consumers genuinely disagree
  — deck filters on `dismissed`, Settings does not.
- `test-header-merge.js` — the topbar header compaction (v9.89, from Jose's
  annotated screenshot): on a wide screen the brand block (logo/company name/
  Acopio badge) sits beside the tabs instead of in its own mostly-empty row
  above them; below 769px nothing changes, row1 still jumps above row2 same
  as before. v9.91: Jose then caught the tabs landing off-centre once
  merged, since row2 was centring its nav against "whatever space brand
  left over," not the middle of the page. Fixed by taking brand out of flow
  (position:absolute) so row2 goes back to spanning the full width — with
  column 1 given the same measured width as brand actually needs
  (`--brand-w` / `_syncBrandWidth`) so it can float over it without
  overlapping the first tab — and by deciding whether to merge at all in JS
  (force it on, check if a tab wrapped, revert if so) rather than a fixed
  breakpoint that only happens to work for one company name's length. Real
  Playwright geometry at seven widths: the last tab never overlaps the
  avatar or the bell, brand never overlaps the tabs, and — the actual v9.91
  bug — the tabs' centre matches the real page centre exactly when merged,
  not just centred in the leftover space next to brand.

- `test-incoming.js` — the two halves of an expected delivery that disagreed
  with each other (v11.21, both from one screenshot Jose sent). `addIncoming`
  hard-coded `'Pending'` in its `appendRow` and never read `data.status`,
  while `updateIncoming` honoured it — so a delivery entered as already
  Arrived, or cancelled on the spot, saved as Pending and needed a second
  edit to stick. Both now go through one `incomingStatus_`, which is what
  stops them drifting apart again, and the test also compares the three
  states it accepts against the three options the dropdown actually offers.
  The rest of the file pins the delete guard's shape, including that an
  error which is a bare string still reads properly.
- `test-incoming-delete.js` — the same guard, running. Jose pressed Delete
  twice because the first press changed nothing on screen (the window stays
  open until the server answers), and the second press hit a row already
  removed: `Incoming item not found`, in red, for a delete that had worked.
  A written check can see the guard exists; only a running page can be asked
  whether the sequence still produces an error. Holds the server's answer
  open to inspect the in-flight window, then checks that the second press
  never reaches the server, that "already gone" ends green, that a real
  failure still ends red with the window left open to retry, and that the
  button is never latched shut afterwards.

- `test-adjust.js` — the ADJUST movement type (v11.22), the count that
  disagreed with the record. WASTE is material that existed and was lost —
  it has a cost and belongs to a job. ADJUST says the RECORD is wrong: no
  cost, no project, a required reason, and it can go UP as easily as down.
  Keeping them apart is not tidiness — a miscount filed as waste turns the
  company's waste figure into "waste plus bookkeeping errors". Most of this
  file is about the real risk in the change, which was not the feature but
  AGREEMENT: four separate functions turn movements into stock, and if one
  of them has never heard of ADJUST its numbers drift from the other three
  and the symptom is a rack quietly reading wrong weeks later. It checks all
  four know the type AND handle both directions, runs the real snapshot
  builder over an archive containing adjustments, and pins what the writer
  refuses (no direction, no reason, a downward adjust bigger than the rack
  holds — reported as "the count went stale", never as "insufficient stock",
  which would be nonsense on a correction whose premise is that the stock
  figure is wrong).
- `test-adjust-form.js` — the same screen's live arithmetic in a real
  browser: type a count, and on every keystroke it has to say which way the
  correction goes, how big it is, and what it is NOT. The delta line has
  words in it because somebody reaching for Adjust when they mean Waste has
  exactly one chance to notice before the row is written. Also the two
  distinctions a static check cannot make: a count of ZERO is an answer
  ("the shelf is empty") while an empty box is not, and a rack the app has
  never seen the material in reads 0 the same as an empty one — far more
  often a typo than a discovery, so the screen says so out loud instead of
  quietly inventing stock.

- `test-data-quality.js` — the sweep that finally looks at what is already
  saved (v11.23). Jose asked why the app had stopped finding things to
  correct; it never started, because the only checker that existed ran while
  somebody TYPED a name. Most of this file is about what the sweep REFUSES to
  say, because its output invites a destructive action: merging two materials
  moves stock. The pair that decides whether the whole feature is trustworthy
  is `BS10` vs `BS 10` (the same window — must be found) against `JJF 109` vs
  `JJF 110` (two products — must never be offered as a merge, not even as a
  "have a look"). It runs the real scan over a fake archive, and also pins the
  refusals: two suppliers on record means no proposal at all, an EXIT with no
  job is left alone, GC/PO/PM are never bulk-filled, GENERIC is never a
  project to merge into, and the whole apply path goes through the merge
  functions the Settings screens already use.
- `test-landing-i18n.js` — the landing page, now one file in two languages
  (v11.24). What it guards is not the toggle: it is that the two languages
  cannot drift. `landing/index.html` and `landing/es.html` were the same 582
  lines twice, and that is not a hypothetical cost — the published "Acopio en
  Detalle" sat at last quarter's price for weeks because one file was updated
  and another was not. So: every marked element has a Spanish string, every
  Spanish string is still attached to something, switching there and back
  returns the English page byte-identical, and **the prices read the same in
  both**, because a number is not a translation. Also the two things a static
  check cannot see — the language button is visible and thumb-sized at 375px
  (the nav it would naturally live in is hidden there), and the page still
  opens, in English, when `localStorage` throws. Y desde el 24/10, **una
  clave, un texto**: las claves son `t` + un número puesto a mano y el
  diccionario es un objeto literal, así que reusar un número que ya existía
  no da ningún error — el `data-i18n` duplicado se queda en el HTML y la
  entrada repetida la gana la última. Pasó añadiendo las dos ediciones al
  precio: usé t82–t85, que ya eran «Palabras del fundador» y sus tres
  párrafos, y en español la tarjeta de Acopio Básico mostraba el texto del
  fundador. Las comprobaciones de arriba no lo veían (la clave existía y
  estaba en uso: ni faltaba ni era huérfana). La nueva se cuenta **en el
  HTML del archivo, no en el DOM**, y ése es el detalle que la hace
  funcionar: `acopioApplyLang` memoriza el inglés en `ACOPIO_EN[k]`, una
  entrada por CLAVE y no por elemento, así que el primer elemento guarda su
  inglés y acto seguido se lo escribe encima al segundo — para cuando el DOM
  se puede leer los dos dicen lo mismo y la diferencia ha desaparecido.
  (De paso: eso significa que una clave reusada rompe también la página
  inglesa, no sólo la española.)
- `test-endpoint-auth.js` — **Priority 1 of the v11.26 audit, and it is not a
  bug fix.** `appsscript.json` deploys the app as `executeAs: USER_DEPLOYING` +
  `access: ANYONE`, which means Apps Script exposes every top-level function
  whose name does not end in `_` as an internet-reachable endpoint running with
  the owner's permissions — not the ones the frontend calls, all of them. The
  per-function defence was well built and, function by function, correct. What
  did not exist was anything checking it was COMPLETE. Nothing counted the
  doors, which is how `getSystemActivity` shipped: a public function reading
  the audit sheet — who saved what, and when — with no token and no role check.
  This enumerates all 93 public globals and fails unless each is either guarded
  by one of five recognised primitives or named in an allow-list *with a
  written reason*. The allow-list is checked for rot too: an entry for a
  function that no longer exists, or that has since grown a real guard, fails.
  It reads source, so it proves no guard is MISSING — not that any guard is
  correct.
- `test-local-dates.js` — finding 1. `_isoDate` was
  `dt.toISOString().substring(0,10)`, which converts to UTC first; Utah is
  UTC−6/−7, so from about 6pm local every date the app produced was TOMORROW.
  The evening shift filed its receipts a day late, every day, with no error and
  nothing that looked wrong. The worst of the fourteen sites was the movement
  form's default date. `process.env.TZ` is pinned to `America/Denver` at the
  top of the file, above the first `Date` — deliberately, because a test that
  only passes in the timezone it was written in is exactly how this went
  unnoticed for months. Both halves of the year are covered, since the offset
  differs, and January's case crosses a month boundary.
- `test-fractional-qty.js` — finding 3. Every quantity box in the entry forms
  was read with `parseInt`, which truncates: 2.5 became 2, 0.75 became 0. The
  app disagreed with itself and never noticed — the edit modal used
  `parseFloat`, the backend `Number()`, and only the form where a number FIRST
  enters the building threw the fraction away, while the units menu has offered
  SQ FT, LN FT, SHEET and ROLL since day one. Guards both halves of the fix,
  because either alone does nothing: `_qty` reading with `parseFloat`, and
  `step="any"` on the inputs — an `<input type="number">` with no step defaults
  to step=1, so the browser rejects 2.5 before any script sees it. Also checks
  the fix was not over-applied: row indexes and z-indexes still use `parseInt`,
  which is right for them.
- `test-cost-privacy.js` — finding 2, and the one with a signature on it: the
  published feature page promises a customer that the warehouse role does not
  see costs unless an admin turns it on. Costs were computed for everyone and
  put on the wire for everyone; `_canSeeCosts()` then hid them IN THE BROWSER,
  which hides them from the screen and not from the person. A permission
  enforced by the code that draws the pixels is a preference. Guards three
  things: that the server strips at BOTH doors (`getInitialData` and
  `loadOlderHistory` — stripping only the first would have moved the leak
  rather than closed it); that `canSeeCosts_()` on the server and
  `_canSeeCosts()` in the browser give the same answer for every role and both
  toggle states, since drift there fails silently in the worse direction; and
  that no third door opens later — every caller of `parseArchiveRow` that can
  return its objects to a browser must strip or be named as internal. Also
  covers the roster found alongside: `loadConfig()` returns CONFIG whole, so
  every colleague's email with their role, plus `adminEmail`, went to every
  role on every load, read by nothing.
- `test-html-escaping.js` — findings 6, 10 and 11, which are one bug wearing
  three numbers: text a person typed, dropped into innerHTML unescaped. The
  reason to treat them as one: `catBadge` is a single function behind SEVEN
  screens (the audit said eight — it had counted the definition), so it is one
  fix, not seven bug reports. Runs the escaper and `catBadge` for real rather
  than only grepping, and records the deliberate non-fix: `_addRejectedFileChip`
  sets `.title` as a PROPERTY, which the browser never parses, so escaping
  there would show `&amp;` to a reader. A later sweep would otherwise "fix" it.
- `test-window-stack.js` — which window is in front. Jose hit this on the
  deployed v11.25: from the morning popup, **Mark arrived** opened the edit
  modal BEHIND it, and the modal was not merely behind — it was DEAD. That
  second part is not a second bug. The window shield deliberately makes every
  window but the front one inert, picks the front one by z-index, and was
  reading the stack correctly; the stack was wrong. `.morning-overlay` was
  2000, tied with the setup wizard and 1450 above every modal (`.overlay` is
  550). The popup only ever OPENS modals — the relationship runs one way — so
  it belongs underneath: 540, above the page and top bar, below all four window
  layers. A whole file for one number because the number was invented once by
  someone reasoning "a popup should be on top", which is true of a popup and
  false of a popup that opens other windows. It also fails on a TIE, since the
  shield breaks ties by document order and that is how this one happened.
- `test-use-before-var.js` — the one-underscore bug. `getInitialData` built
  its payload with `getSystemActivity_(30, _auth.email)`; the variable in that
  scope is `auth`. A `_auth` DID exist — declared at the bottom of the same
  function, inside the error handler — and `var` hoists, so it was there
  holding `undefined`. `_auth.email` threw a TypeError on every call and an
  inline `catch` returned `[]`. **systemActivity was empty on every load, for
  every user, since the line was written**, which darkened the corner deck and
  Settings → System together — both read that one list. The backups were never
  broken; their rows just never left the server. Nothing could catch it:
  `node --check` is happy, and `test-sysactivity-dismiss.js` passes because it
  calls the function directly in a vm and never exercises the call site. So
  this file checks the general rule instead — no function may READ a `var`
  above the line declaring it, which can only ever yield `undefined`. Worth
  reading for the detector's own four blind spots, all found by running it and
  all fixed rather than assumed away: callback parameters, module-level vars
  between functions, prose inside string literals, and regex flags (`/…/i.test`
  read as a variable `i`). The first run reported five offenders and all five
  were correct code.
- `test-sysact-followthrough.js` — the two dead ends behind the cards v11.30
  finally made visible. Jose pressed both links on the first card he saw and
  both went nowhere, which is what you would expect of a feature nobody could
  reach for months: its links had never been followed. **"Show the movements"**
  answered with "use Load Older History to see them" — true, and guaranteed
  rather than exceptional, since a re-link card names rows old enough to be
  past the archive cutoff by definition. It now fetches the archive itself and
  retries once. **"Details →"** opened Settings and marked nothing: the
  spotlight ran on a `setTimeout(…, 350)` while `openSettingsModal` was still
  waiting on a `google.script.run` round trip, so it looked for an element that
  did not exist yet and hit `if (!el) return` — silent. A bigger timeout only
  makes the race longer; the fix is to stop racing, so the id is remembered and
  `_renderSystemTab` applies it after it paints. The spotlight half is executed
  against a stub DOM rather than only grepped.
- `build-site.js` + `test-site-privacy.js` — the door between Jose's papers and
  the internet. The build is **default deny**: a file is published only if it is
  named, with a written reason, so a document added to `docs/` tomorrow is
  private by construction and nobody has to remember anything. The guard is two
  locks that do not share a source of truth — its allow-list is typed out again
  by hand rather than imported, so one wrong list cannot satisfy both — and the
  second lock greps the BUILT OUTPUT, which is the only thing that can catch a
  public document growing a private paragraph. **It earned itself on its first
  run**, refusing three real leaks: `RESTAURAR-UN-BACKUP.md`, which names
  `SESSION_SECRET` and `OAUTH_CLIENT_SECRET` and explains that the OAuth secret
  is shared across every customer; the product page telling readers that "the
  margin on an additional customer is practically the whole price"; and the
  personal Gmail standing as the public contact on three pages. The third is
  still failing on purpose — it is Jose's decision, not a defect, and nothing
  publishes until he makes it.
- `check-changelog.js` — not a test; a guard against rot. Both public
  changelog pages sat at v10.6 while the app shipped v11.22 — fifteen versions
  of silence on a page whose whole promise is "every change that reaches your
  installation" — and nothing warned, because nothing was watching. It was
  found when Jose happened to open it. This fails the release when the newest
  entry is more than five versions behind `APP_VERSION`, or when the two
  languages are not level with each other. Deliberately NOT one entry per
  version: most releases do not deserve one, and a changelog padded with
  internal work is worse than a short one. The rule is only that the gap stays
  small.

All of these lift the real code out of `Index_v3_fixed.html` (or
`Code_v3_fixed.gs`) rather than keeping a copy, so they cannot quietly drift
away from what ships.
