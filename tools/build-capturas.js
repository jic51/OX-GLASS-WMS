// LAS CAPTURAS DE LA LANDING, DIBUJADAS POR UN COMANDO.
//
// Jose, 11/11: *"empieza arreglando el doc de las capturas y haz todo lo que
// puedas hacer solo y lo que no, pregúntame."*
//
// ── POR QUÉ ESTO EXISTE, Y QUÉ DESBLOQUEA ───────────────────────────────────
//
// `docs/CAPTURAS-PARA-LA-LANDING.md` abre con una regla que no se negocia:
// **ninguna captura sale del almacén real con los datos reales.** Clientes,
// obras, proveedores, empleados por su nombre y el correo de Jose se leen sin
// esforzarse en cualquier pantallazo del OX de verdad, y una landing la lee la
// competencia.
//
// Y abre también con un bloqueo: *«0 · copia de demo con datos inventados —
// bloquea todo lo demás»*. Una tarde de trabajo que no se ha hecho, y sin la
// cual no se puede grabar nada. Lleva bloqueando desde el 22/09.
//
// **Esto lo quita para las capturas fijas.** Las pruebas de pantalla ya
// arrancan la app entera en un navegador de verdad con un `google.script.run`
// falso (ver `tools/test-columnas.js`): si se le puede dar un almacén de
// mentira a una prueba, se le puede dar a una captura. Lo que sale es la app
// de verdad, con su CSS de verdad, con datos que no son de nadie.
//
// Lo que esto NO desbloquea: los siete vídeos. Ésos necesitan la app viva, con
// su hoja y su sesión, y los sigue teniendo que grabar Jose.
//
// ── LA REGLA DE LOS DATOS ───────────────────────────────────────────────────
//
// Todo lo de aquí abajo es **inventado**, y a propósito se parece a un almacén
// de vidrio sin ser el de nadie: `Cedarline Glass Co.`, obras tipo `MAPLE
// STREET REMODEL`, proveedores tipo `NORTHGATE SUPPLY`. Si algún día alguien
// reconoce un nombre de aquí, es que se coló — y hay que quitarlo.
//
// Los números NO son redondos. Un almacén de verdad tiene 5.288, no 5.000, y
// una captura con todo en cientos se huele a ejemplo a la primera.
//
// Uso:  NODE_PATH="$(npm root -g)" CHROME_PATH=/opt/pw-browsers/chromium-*/chrome-linux*/chrome \
//       node tools/build-capturas.js [--solo dashboard]
//
// Escribe en landing/assets/capturas/*.png

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { chromium } = require('playwright');

const ROOT    = path.join(__dirname, '..');
const SALIDA  = path.join(ROOT, 'landing', 'assets', 'capturas');
const INDEX   = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

const ANCHO = 1600, ALTO = 900;

// ════════════════════════════════════════════════════════════════════════════
// EL ALMACÉN INVENTADO
// ════════════════════════════════════════════════════════════════════════════

const EMPRESA  = 'Cedarline Glass Co.';
const YO       = { email: 'sam@cedarlineglass.com', nombre: 'Sam Ortega' };

const CATS = ['WINDOW', 'SCREEN', 'IGU (INSULATED GLASS UNIT)', 'MIRROR',
              'SHOWER', 'HARDWARE', 'FLASHING'];

const OBRAS = ['MAPLE STREET REMODEL', 'RIVERBEND TOWNHOMES', 'OAKMONT RESIDENCE',
               'HARBOR VIEW LOFTS', 'CEDAR PARK DUPLEX'];

const PROVEEDORES = ['NORTHGATE SUPPLY', 'PINEWOOD GLASS', 'ATLAS WINDOWS',
                     'VERTEX HARDWARE'];

const GENTE = ['SAM ORTEGA', 'DANA REYES', 'MARCUS HALE', 'PRIYA NAIR'];
const CORREOS = { 'SAM ORTEGA': 'sam@cedarlineglass.com', 'DANA REYES': 'dana@cedarlineglass.com',
                  'MARCUS HALE': 'marcus@cedarlineglass.com', 'PRIYA NAIR': 'priya@cedarlineglass.com' };

/* Los estantes, con la forma que tiene un almacén de verdad: pasillos con
 * letra, un par de sitios que no son estantes (el patio, el camión) y uno con
 * nombre largo, porque el nombre largo es el que rompe las tablas. */
const SITIOS = ['A1A', 'A1B', 'A2A', 'A2B', 'B1A', 'B1B', 'B2C', 'C1A', 'C1B',
                'C2A', 'D3A', 'D3B', 'YARD NORTH', 'TRUCK 2',
                'MIRRORS & SHOWERS — BACK BAY'];

/* ── EL CATÁLOGO ────────────────────────────────────────────────────────────
 *
 * **Veinte materiales no sirven, y el primer intento lo enseñó.** La tarjeta
 * decía `20 SKUS TRACKED`, la mitad de los estantes salían `empty` y el cajón
 * del estante abierto tenía dos líneas. Un almacén de verdad no se parece a
 * eso, y una captura así dice «esto es una demo» antes de que nadie lea nada.
 *
 * Así que el catálogo se genera: familias reales de una vidriera, cada una con
 * sus medidas y acabados, que es exactamente como se llaman las cosas en un
 * almacén de ventanas. Salen unos 300 artículos con nombres largos y cortos
 * mezclados — y los largos son los que de verdad ponen a prueba la tabla. */
const FAMILIAS = [
  { cat:'WINDOW', base:'SH', desc:'SINGLE HUNG',
    medidas:['2436','2440','3048','3060','3648','3660'], acab:['WHITE','BRONZE','BLACK'] },
  { cat:'WINDOW', base:'DH', desc:'DOUBLE HUNG',
    medidas:['2836','3048','3660','4048'], acab:['WHITE','BRONZE LOW-E','CLAY'] },
  { cat:'WINDOW', base:'SLIDER', desc:'',
    medidas:['5030','6040','6080'], acab:['CLEAR TEMPERED','OBSCURE','LOW-E'] },
  { cat:'WINDOW', base:'PICTURE WINDOW', desc:'',
    medidas:['4848','6048','7248'], acab:['WHITE','BLACK'] },
  { cat:'WINDOW', base:'CASEMENT', desc:'',
    medidas:['2440','2860','3060'], acab:['WHITE','BRONZE'] },
  { cat:'SCREEN', base:'HALF SCREEN', desc:'',
    medidas:['2436','3048','3660'], acab:['CHARCOAL','BLACK'] },
  { cat:'SCREEN', base:'FULL SCREEN', desc:'',
    medidas:['2436','3048','3660','4048'], acab:['CHARCOAL','BLACK'] },
  { cat:'SCREEN', base:'SCREEN FRAME STOCK', desc:'',
    medidas:['8FT','10FT'], acab:['MILL','BRONZE'] },
  { cat:'IGU (INSULATED GLASS UNIT)', base:'IGU', desc:'',
    medidas:['16X48','24X60','30X48','36X60','42X72'],
    acab:['TEMPERED CLEAR','OBSCURE','GREY TINT','LOW-E ARGON'] },
  { cat:'MIRROR', base:'MIRROR', desc:'',
    medidas:['24X36','30X40','36X48','48X72'], acab:['PLAIN','BEVELED'] },
  { cat:'SHOWER', base:'SHOWER DOOR', desc:'',
    medidas:['28X72','30X72','34X76'], acab:['BRUSHED NICKEL','MATTE BLACK','CHROME'] },
  { cat:'SHOWER', base:'SHOWER PANEL', desc:'',
    medidas:['30X72','34X72'], acab:['CLEAR','FROSTED'] },
  { cat:'HARDWARE', base:'SASH LOCK', desc:'',
    medidas:[''], acab:['WHITE','BRONZE','BLACK'] },
  { cat:'HARDWARE', base:'ROLLER ASSEMBLY', desc:'',
    medidas:['1-1/4','1-3/8'], acab:['STEEL','NYLON'] },
  { cat:'HARDWARE', base:'NAIL FIN CLIP', desc:'', medidas:[''], acab:[''] },
  { cat:'HARDWARE', base:'BALANCE SPRING', desc:'', medidas:['28','32','36'], acab:[''] },
  { cat:'FLASHING', base:'FLASHING ROLL', desc:'', medidas:['6IN','9IN','12IN'], acab:[''] },
  { cat:'FLASHING', base:'SILL PAN', desc:'', medidas:['36IN','48IN','72IN'], acab:[''] }
];

const MATERIALES = [];
FAMILIAS.forEach(function (f) {
  f.medidas.forEach(function (m) {
    f.acab.forEach(function (a) {
      const nombre = [f.base, m, a].filter(Boolean).join(' ');
      MATERIALES.push([f.cat, nombre]);
    });
  });
});

const NOTAS = ['', 'A-frame, back row', '', 'Check the glass before pulling — two were chipped',
               '', 'Customer pickup, do not ship', ''];

/* Un generador con semilla: la misma captura dos veces da la misma imagen, que
 * es lo que permite volver a generarlas cuando cambie el CSS y comparar. Con
 * Math.random cada tanda sería distinta y nadie sabría si cambió el producto o
 * cambiaron los datos. */
let _semilla = 20261112;
function rnd() {
  _semilla = (_semilla * 1664525 + 1013904223) % 4294967296;
  return _semilla / 4294967296;
}
const elige = a => a[Math.floor(rnd() * a.length)];
const entre = (a, b) => a + Math.floor(rnd() * (b - a + 1));

const matId = (cat, name) => cat.toLowerCase() + '|||' + name.toLowerCase();

/* ── LAS EXISTENCIAS ────────────────────────────────────────────────────────
 * Hacen falta las cuatro insignias a la vista (In Stock, Reserved, All at Site,
 * Zero Stock), porque enseñar las cuatro es lo que demuestra que el sistema
 * sabe más que «hay o no hay». Y hacen falta unas cuantas por debajo del
 * mínimo, para la captura del aviso de stock bajo. */
const STOCK = {};
const MINIMOS = {};
MATERIALES.forEach(function (m, i) {
  const [cat, name] = m;
  const id = matId(cat, name);

  // i % 9 === 0 → cero;  i % 7 === 3 → todo en obra;  i % 5 === 1 → reservado
  const cero  = (i % 9 === 0);
  const enObra = (i % 7 === 3);
  const wh    = cero ? 0 : (enObra ? 0 : entre(6, 412));
  const site  = enObra ? entre(4, 38) : (i % 4 === 0 ? entre(2, 16) : 0);
  /* `Reserved` NO es «tiene algo reservado»: la insignia sale cuando queda
   * CERO disponible y todavía hay material en bodega — o sea, todo lo que hay
   * está comprometido con una obra. Con reservas parciales la fila dice
   * `In Stock`, que es correcto y no enseña la cuarta insignia. Por eso unos
   * cuantos van reservados enteros: es lo que pasa cuando una obra se lleva
   * la línea completa, y es lo que 3.2 pide ver. */
  const resv  = cero || enObra ? 0
              : (i % 17 === 4 ? wh : (i % 5 === 1 ? Math.min(wh, entre(2, 12)) : 0));

  /* El material repartido en DOS estantes cuando hay bastante. Es lo que hace
   * que la columna de ubicación diga algo y no sea siempre un código suelto. */
  /* EL PASO TIENE QUE SER PRIMO CON EL NÚMERO DE SITIOS. Con `i*3 % 15` sólo
   * salían los múltiplos de 3, así que cinco estantes —A1B, B1A, C1A, D3A y
   * el camión— aparecían `empty` en el mapa pase lo que pase. Un mapa con un
   * tercio de los estantes vacíos no se lee como un almacén, se lee como una
   * demo a medio llenar. Con 7 (primo con 15) se recorren todos. */
  const locs = {};
  if (wh > 0) {
    const a = SITIOS[(i * 7) % SITIOS.length];
    if (wh > 40) {
      const b = SITIOS[(i * 7 + 4) % SITIOS.length];
      const parte = Math.floor(wh * 0.6);
      locs[a] = parte; locs[b] = wh - parte;
    } else locs[a] = wh;
  }

  STOCK[id] = {
    matId: id, name: name, category: cat, project: '', unit: 'UNIT',
    warehouseQty: wh, siteQty: site, wastedQty: 0,
    reservedQty: resv, availableQty: Math.max(0, wh - resv),
    totalQty: wh + site, warehouseLocs: locs, status: 'OK',
    lastNote: NOTAS[i % NOTAS.length],
    dateReceived: '2026-1' + (i % 2 ? '0' : '1') + '-' + String((i % 27) + 1).padStart(2, '0')
  };

  /* ── LOS MÍNIMOS ─────────────────────────────────────────────────────────
   * `config.minStock` va **por nombre**, no por matId — lo leen así tanto el
   * panel de avisos como la ventana del monitor. Se puso primero por matId y
   * el panel salía vacío: la captura habría enseñado un almacén sin un solo
   * aviso, que es justo lo contrario de lo que 3.8 promete.
   *
   * Uno de cada tres queda POR DEBAJO del mínimo a propósito (naranja) y los
   * que están a cero salen en rojo por su cuenta. Sin las dos cosas mezcladas
   * la captura no enseña los dos colores, que es el único motivo de hacerla. */
  if (i % 3 !== 2) {
    MINIMOS[name] = (i % 3 === 0 && wh > 0)
      ? wh + entre(6, 40)          // por debajo del mínimo → naranja
      : Math.max(4, Math.floor(wh / 3));   // holgado → no avisa
  }
});

/* ── LOS MOVIMIENTOS ────────────────────────────────────────────────────────
 * 180, con los cinco tipos, fechas que bajan, y gente distinta. Las salidas
 * llevan obra; las entradas, proveedor y PO. */
/* ── LOS PRECIOS ────────────────────────────────────────────────────────────
 * Inventados, pero con el orden de magnitud correcto para cada familia: una
 * ventana no cuesta lo mismo que un clip. Hacen falta porque sin ellos la
 * tarjeta de `WASTE COST` sale en **$0**, y un cero ahí no se lee como «no
 * hemos roto nada», se lee como «esto está a medio hacer». */
const PRECIO_CAT = {
  'WINDOW': [180, 640], 'SCREEN': [22, 78],
  'IGU (INSULATED GLASS UNIT)': [95, 410], 'MIRROR': [38, 190],
  'SHOWER': [210, 720], 'HARDWARE': [1.4, 12], 'FLASHING': [9, 46]
};
const PRECIO = {};
MATERIALES.forEach(function (m) {
  const r = PRECIO_CAT[m[0]] || [10, 60];
  PRECIO[matId(m[0], m[1])] = Math.round((r[0] + rnd() * (r[1] - r[0])) * 100) / 100;
});

/* 420 y no 180: con 180 movimientos repartidos entre 127 materiales, la mitad
 * de las filas del Dashboard salían con la fecha en «—», porque esa columna se
 * saca del último movimiento de ese material y muchos no tenían ninguno. Una
 * tabla con media columna vacía parece un sistema a medio llenar. */
const TIPOS = ['ENTRY', 'EXIT', 'EXIT', 'TRANSFER', 'RETURN', 'ENTRY', 'WASTE'];
const MOVS = [];
/* ── EL ORDEN IMPORTA, Y SE EQUIVOCÓ ────────────────────────────────────────
 * La app pinta `srcMovs.slice().reverse()`: la ÚLTIMA fila de la hoja es la
 * primera de la pantalla, porque una hoja de cálculo crece hacia abajo. Al
 * generar los movimientos del más nuevo al más viejo, la pantalla enseñaba el
 * extremo equivocado — las diez filas de arriba tenían todas la misma fecha, y
 * la más vieja. Aquí se generan como se escriben: **del más viejo al más
 * nuevo**, y así lo de arriba es lo de hoy. */
const N_MOVS = 420;
for (let i = 0; i < N_MOVS; i++) {
  const [cat, name] = MATERIALES[(i * 7) % MATERIALES.length];
  const tipo = TIPOS[i % TIPOS.length];
  const quien = GENTE[i % GENTE.length];
  /* Las fechas bajan desde el 12 de noviembre hacia atrás, unas 14 por día,
   * que es un ritmo creíble para un almacén de este tamaño. Se calcula con una
   * fecha de verdad y no restando números a mano: restando a mano, con 420
   * movimientos el día se iba a negativo y salían fechas imposibles. */
  const base = new Date(Date.UTC(2026, 10, 12));
  base.setUTCDate(base.getUTCDate() - Math.floor((N_MOVS - 1 - i) / 14));
  const mes = String(base.getUTCMonth() + 1).padStart(2, '0');
  const d   = base.getUTCDate();
  const cant = entre(1, 48);
  const pu   = PRECIO[matId(cat, name)] || 0;
  MOVS.push({
    rowIdx: i + 2, movementId: 'M' + (9000 + i),
    moveType: tipo, category: cat, name: name,
    qty: cant, unit: 'UNIT',
    po: tipo === 'ENTRY' ? String(entre(10400, 10980)) : '',
    dateRec: base.getUTCFullYear() + '-' + mes + '-' + String(d).padStart(2, '0'),
    sourceLoc: (tipo === 'EXIT' || tipo === 'TRANSFER' || tipo === 'WASTE') ? SITIOS[i % SITIOS.length] : '',
    destLoc:   (tipo === 'ENTRY' || tipo === 'TRANSFER' || tipo === 'RETURN') ? SITIOS[(i + 4) % SITIOS.length] : '',
    project:   (tipo === 'EXIT' || tipo === 'RETURN') ? OBRAS[i % OBRAS.length] : '',
    supplier:  tipo === 'ENTRY' ? PROVEEDORES[i % PROVEEDORES.length] : '',
    responsible: quien,
    comments: NOTAS[i % NOTAS.length],
    pm: '', gc: '', userEmail: CORREOS[quien], docLinks: '',
    unitCost: pu, totalCost: Math.round(pu * cant * 100) / 100
  });
}

/* ── LAS ENTREGAS ESPERADAS ─────────────────────────────────────────────────
 *
 * **El campo se llama `estDate`, no `expectedDate`.** Con el nombre inventado,
 * la semana entera salía «Nothing scheduled» y las cinco entregas caían en el
 * grupo *«No date yet — waiting on the supplier to say when»*. Los nombres
 * salen de `parseIncomingRow` en el servidor, y hay que leerlos de ahí y no
 * suponerlos.
 *
 * Y `dateMode` es lo que convierte esta captura en la que pide el documento:
 * los cuatro modos existen —`exact`, `window`, `about`, `unknown`— y enseñar
 * los cuatro es lo que demuestra que el sistema sabe la diferencia entre «el
 * jueves», «la semana que viene» y «no lo han dicho». Eso es lo que la
 * competencia barata no tiene. */
const INCOMING = [
  { id: 'I2', estDate: '2026-11-12', dateMode: 'exact', status: 'Arrived',
    category: 'WINDOW', name: 'SH 3048 WHITE', qty: 48, unit: 'UNIT',
    supplier: 'ATLAS WINDOWS', po: '10855', notes: 'Unloaded at dock 2',
    addedBy: CORREOS['SAM ORTEGA'], addedAt: '2026-11-05', pm: 'Sam Ortega',
    docLink: '', estDateEnd: '', dateNote: '' },

  { id: 'I4', estDate: '2026-11-13', dateMode: 'exact', status: 'Pending',
    category: 'HARDWARE', name: 'ROLLER ASSEMBLY 1-1/4 STEEL', qty: 200, unit: 'BOX',
    supplier: 'VERTEX HARDWARE', po: '10866', notes: '',
    addedBy: CORREOS['MARCUS HALE'], addedAt: '2026-11-06', pm: 'Marcus Hale',
    docLink: '', estDateEnd: '', dateNote: '' },

  { id: 'I1', estDate: '2026-11-14', dateMode: 'exact', status: 'Pending',
    category: 'IGU (INSULATED GLASS UNIT)', name: 'IGU 24X60 TEMPERED CLEAR',
    qty: 24, unit: 'UNIT', supplier: 'NORTHGATE SUPPLY', po: '10842',
    notes: 'Two pallets, forklift needed',
    addedBy: CORREOS['DANA REYES'], addedAt: '2026-11-04', pm: 'Dana Reyes',
    docLink: '', estDateEnd: '', dateNote: '' },

  /* Iba con `dateMode:'window'` del 16 al 20, y la semana la enseñaba **tres
   * veces**, una por día del rango, sin nada que dijera que es la misma
   * entrega. Es comportamiento de la app, no de estos datos — queda anotado
   * como W-08 en HALLAZGOS. Aquí va con fecha exacta para que la captura no
   * enseñe lo que parece un triplicado. */
  { id: 'I3', estDate: '2026-11-16', dateMode: 'exact', status: 'Pending',
    category: 'MIRROR', name: 'MIRROR 36X48 BEVELED', qty: 12, unit: 'UNIT',
    supplier: 'PINEWOOD GLASS', po: '10861', notes: '',
    addedBy: CORREOS['PRIYA NAIR'], addedAt: '2026-11-07', pm: 'Priya Nair',
    docLink: '', estDateEnd: '', dateNote: '' },

  { id: 'I5', estDate: '2026-11-18', dateMode: 'about', status: 'Pending',
    category: 'SHOWER', name: 'SHOWER DOOR 28X72 BRUSHED NICKEL', qty: 6, unit: 'UNIT',
    supplier: 'NORTHGATE SUPPLY', po: '10870', notes: 'Confirm finish before it ships',
    addedBy: CORREOS['DANA REYES'], addedAt: '2026-11-08', pm: 'Dana Reyes',
    docLink: '', estDateEnd: '', dateNote: 'around the 18th' },

  { id: 'I6', estDate: '', dateMode: 'unknown', status: 'Pending',
    category: 'SCREEN', name: 'FULL SCREEN 4048 CHARCOAL', qty: 60, unit: 'UNIT',
    supplier: 'ATLAS WINDOWS', po: '10874', notes: 'On backorder',
    addedBy: CORREOS['SAM ORTEGA'], addedAt: '2026-11-09', pm: 'Sam Ortega',
    docLink: '', estDateEnd: '', dateNote: '' }
];

/* LA VERSIÓN DEL SERVIDOR SALE DEL PROPIO ARCHIVO, y no es un detalle: con
 * `'demo'` ahí, la app abre con la franja naranja de «Version mismatch —
 * Redeploy BOTH files» cruzando la pantalla. Salía en las cinco capturas. */
const VERSION = (INDEX.match(/APP_VERSION\s*=\s*'([^']+)'/) || [])[1] || '';

const DATA = {
  userRole: 'ADMIN', userEmail: YO.email, userName: YO.nombre, serverVersion: VERSION,
  company: { name: EMPRESA },
  movements: MOVS, stock: STOCK, materialLocks: [],
  /* `null` = vigílalo todo, que es la regla de la app desde siempre. Una lista
   * aquí filtraría el panel y la captura enseñaría menos de lo que hay. */
  monitoredMaterials: null,
  config: {
    minStock: MINIMOS,
    categories: CATS, projects: OBRAS, suppliers: PROVEEDORES,
    locations: SITIOS.map(s => ({ name: s, type: s.indexOf('TRUCK') === 0 ? 'TRUCK'
                                             : s.indexOf('YARD') === 0 ? 'YARD' : 'RACK' })),
    units: ['UNIT', 'BOX', 'PALLET', 'ROLL']
  },
  incoming: INCOMING, rackPhotos: {}, systemActivity: [],
  rolePerms: { canSeeCosts: true, canEditMovements: true, canManageCatalog: true, canExportData: true },
  warehouseRoleLabel: 'Warehouse', archiveCutoffMonths: 12,
  oauthClientId: '', oauthRedirectUri: ''
};

// ════════════════════════════════════════════════════════════════════════════
// EL ARRANQUE
// ════════════════════════════════════════════════════════════════════════════

/* El mismo falso `google.script.run` que usan las pruebas de pantalla. Cualquier
 * llamada que no sea `getInitialData` contesta un objeto vacío: suficiente para
 * dibujar, y nada se guarda en ningún sitio porque no hay a dónde. */
function paginaDemo() {
  const stub = `<script>
window.google=window.google||{};
window.google.charts={load:function(){},setOnLoadCallback:function(){}};
Object.assign(window.google,{script:{run:new Proxy({},{get:function(t,k){return function(){
 if(k==='withSuccessHandler'){t._ok=arguments[0];return window.google.script.run;}
 if(k==='withFailureHandler'){return window.google.script.run;}
 var ok=t._ok;
 if(k==='getInitialData'){setTimeout(function(){ok&&ok(window.__DATA);},20);return;}
 /* Las acciones que devuelven una LISTA tienen que contestar una lista. Con
    un objeto vacío, \`listImports\` reventaba en \`_importsData.filter\` y la
    pantalla del importador salía con un aviso rojo de error encima. */
 var a0=String(arguments[0]||'');
 if(k==='processMovement'&&/^list/i.test(a0)){setTimeout(function(){ok&&ok([]);},10);return;}
 setTimeout(function(){ok&&ok({});},10);};}})}});
window.__DATA=${JSON.stringify(DATA)};
<\/script>`;
  const f = path.join(os.tmpdir(), 'ac-cap-' + Date.now() + '.html');
  fs.writeFileSync(f, INDEX.replace('</head>', stub + '</head>'));
  return f;
}

async function abrir(browser, viewport) {
  const page = await browser.newPage({
    viewport: viewport || { width: ANCHO, height: ALTO },
    deviceScaleFactor: 2,          // una captura que mira una persona
    colorScheme: 'light'
  });
  const fallos = [];
  page.on('pageerror', e => fallos.push(e.message));
  await page.goto('file://' + paginaDemo(), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1100);
  page._fallos = fallos;
  return page;
}

function salida(nombre) {
  fs.mkdirSync(SALIDA, { recursive: true });
  return path.join(SALIDA, nombre + '.png');
}

/* ── POR QUÉ ESTAS CAPTURAS EMPIEZAN MÁS ABAJO ──────────────────────────────
 *
 * Las dos gráficas del Dashboard las dibuja **Google Charts, que se carga de
 * `www.gstatic.com`** — y esa dirección no está permitida en la red de esta
 * sesión. Sin ella las dos cajas salen **blancas**, y dos rectángulos vacíos
 * en medio de una captura de producto son peores que no tener la captura.
 *
 * Así que se encuadra por debajo: se lleva el elemento pedido al borde de
 * arriba y se fotografía la pantalla desde ahí. **Es un encuadre, no un
 * retoque** — no se esconde nada ni se cambia nada, se elige dónde empieza la
 * foto, que es lo que hace cualquiera al hacer una captura.
 *
 * Si algún día las gráficas hacen falta en una captura, hay dos caminos y
 * ninguno es éste: permitir `www.gstatic.com` en el entorno, o que la saque
 * Jose desde la copia de demo, donde el navegador sí llega. */
/* La cabecera va fija arriba, así que llevar un elemento a `scrollY = 0` lo
 * mete DEBAJO de la cabecera y sale cortado por la mitad. Pasó con las
 * tarjetas de cifras en el primer intento. Se mide la cabecera en vez de
 * clavar un número: si algún día cambia de alto, esto sigue encuadrando bien. */
async function recorteDesde(page, selector, nombre, extra) {
  await page.evaluate(([sel, ex]) => {
    const el = document.querySelector(sel);
    if (!el) return;
    const tb = document.querySelector('.topbar');
    const alto = tb ? tb.getBoundingClientRect().height : 0;
    const y = el.getBoundingClientRect().top + window.scrollY - alto - (ex || 16);
    window.scrollTo(0, Math.max(0, y));
  }, [selector, extra]);
  await page.waitForTimeout(350);
  await page.screenshot({ path: salida(nombre) });
}

// ════════════════════════════════════════════════════════════════════════════
// LAS CAPTURAS
// ════════════════════════════════════════════════════════════════════════════

const CAPTURAS = {

  // 3.2 — Stock Dashboard: las tarjetas de arriba y la tabla llena
  'dashboard': async (b) => {
    const p = await abrir(b);
    await p.evaluate(() => showTab('dashboard', 'btn-dashboard'));
    await p.waitForTimeout(600);
    await recorteDesde(p, '#statsRow', '3.2-stock-dashboard');

    /* ── Y UNA SEGUNDA, QUE ES LA QUE PIDE EL DOCUMENTO ──────────────────
     * 3.2 pide **las cuatro insignias a la vista** (`In Stock`, `Reserved`,
     * `All at Site`, `Zero Stock`), porque enseñar las cuatro es lo que
     * demuestra que el sistema sabe más que «hay o no hay».
     *
     * Y arriba del todo no pueden salir las cuatro: la tabla se ordena por
     * cantidad en bodega de mayor a menor (`renderStock`), y tanto
     * `All at Site` como `Zero Stock` tienen CERO en bodega, así que viven
     * siempre al final. No es un defecto de los datos — es el orden de la
     * tabla, y forzarlo sería inventar un almacén que no existe.
     *
     * Así que se encuadra donde de verdad se tocan: la frontera. Se busca la
     * primera fila a cero y se encuadra unas filas por encima, de modo que en
     * la misma pantalla haya material con existencia, reservado, todo en obra
     * y agotado. Eso sí es verdad y sí se ve. */
    /* El desplazamiento se calcula y se hace EN LA MISMA llamada. El primer
     * intento marcaba la fila con un atributo y la volvía a buscar después;
     * para entonces la tabla ya se había repintado, el atributo había
     * desaparecido y la captura salía idéntica a la de arriba sin avisar. */
    /* Y hay que mover **el contenedor de la tabla**, no la ventana. Las 127
     * filas están todas dibujadas, pero el cuerpo de la tabla tiene su propio
     * desplazamiento interno: con `window.scrollTo` la página llegaba al final
     * y la tabla seguía enseñando las doce primeras. Por eso la primera
     * versión de esta captura salía igual que la de arriba. */
    const frontera = await p.evaluate(() => {
      const filas = Array.from(document.querySelectorAll('#stockBody tr'));
      const i = filas.findIndex(tr => /Zero Stock|All at Site/.test(tr.textContent));
      if (i < 0) return { ok: false, filas: filas.length };
      const objetivo = filas[Math.max(0, i - 6)];

      let caja = objetivo.parentElement;
      while (caja && caja !== document.body &&
             caja.scrollHeight <= caja.clientHeight + 2) caja = caja.parentElement;
      if (!caja || caja === document.body) return { ok: false, filas: filas.length, sinCaja: true };

      caja.scrollTop = objetivo.offsetTop - (objetivo.parentElement.offsetTop || 0) - 8;
      const tb = document.querySelector('.topbar');
      const alto = tb ? tb.getBoundingClientRect().height : 0;
      const tarjeta = caja.closest('.card, .panel, .table-card') || caja;
      window.scrollTo(0, Math.max(0, tarjeta.getBoundingClientRect().top + window.scrollY - alto - 16));
      return { ok: true, filas: filas.length, enFila: i, scroll: caja.scrollTop };
    });
    if (frontera.ok) {
      await p.waitForTimeout(350);
      await p.screenshot({ path: salida('3.2b-los-cuatro-estados') });
    } else {
      console.log('\n    ⚠ sin frontera de estados (' + frontera.filas + ' filas) — 3.2b no se escribe');
    }
    return p;
  },

  // Movements, que no estaba en la lista y hace falta para el historial
  'movimientos': async (b) => {
    const p = await abrir(b);
    await p.evaluate(() => showTab('movements', 'btn-movements'));
    await p.waitForTimeout(600);
    await p.screenshot({ path: salida('3.3-movimientos') });
    return p;
  },

  // 3.1 — Warehouse Map con un estante abierto
  'mapa': async (b) => {
    const p = await abrir(b);
    await p.evaluate(() => showTab('warehouse', 'btn-warehouse'));
    await p.waitForTimeout(700);
    await p.evaluate(() => { if (typeof openRackDrawer === 'function') openRackDrawer('A1A'); });
    await p.waitForTimeout(700);
    await p.screenshot({ path: salida('3.1-mapa-estante-abierto') });
    return p;
  },

  // 3.5 — Incoming. Dos: la semana y la lista con proveedores y PO.
  'incoming': async (b) => {
    const p = await abrir(b);
    await p.evaluate(() => showTab('incoming', 'btn-incoming'));
    await p.waitForTimeout(800);
    await p.screenshot({ path: salida('3.5-incoming-semana') });

    /* La lista de abajo es la que pide el documento —proveedores, PO y
     * estados distintos—, y vive más abajo de lo que cabe en una pantalla.
     * Se busca por su título porque no tiene id propio. */
    const ok = await p.evaluate(() => {
      /* El título, no su tarjeta: `closest('.card')` subía hasta un envoltorio
       * que empieza arriba del todo, así que la captura salía igual que la de
       * la semana. Se baja 24 px por encima del título y ya. */
      const h = Array.from(document.querySelectorAll('h1,h2,h3,h4'))
        .find(e => /All Incoming/.test(e.textContent));
      if (!h) return false;
      const tb = document.querySelector('.topbar');
      const alto = tb ? tb.getBoundingClientRect().height : 0;
      window.scrollTo(0, Math.max(0, h.getBoundingClientRect().top + window.scrollY - alto - 24));
      return true;
    });
    if (ok) { await p.waitForTimeout(350); await p.screenshot({ path: salida('3.5-incoming-lista') }); }
    else console.log('\n    ⚠ no encontré «All Incoming» — sólo sale la semana');
    return p;
  },

  /* 3.6 — El asistente de instalación.
   *
   * Vive en su propio archivo (`SetupWizard.html`) y Google lo abre como
   * diálogo de 720×680, así que se fotografía a ese tamaño y no a 1600: una
   * ventana de 720 estirada a 1600 no es lo que ve nadie.
   *
   * Se encuadra el paso de las UBICACIONES y no el primero. El primero es una
   * caja de texto vacía y no dice nada; el de ubicaciones enseña las fichas,
   * que es donde se entiende de un vistazo que configurar esto son cuatro
   * preguntas y no un manual. */
  'asistente': async (b) => {
    const wiz = fs.readFileSync(path.join(ROOT, 'SetupWizard.html'), 'utf8');
    const stub = `<script>
window.google=window.google||{};
Object.assign(window.google,{script:{run:new Proxy({},{get:function(t,k){return function(){
 if(k==='withSuccessHandler'){t._ok=arguments[0];return window.google.script.run;}
 if(k==='withFailureHandler'){return window.google.script.run;}
 var ok=t._ok;
 if(k==='getSetupState'){setTimeout(function(){ok&&ok({ownerEmail:'${YO.email}',needsSetup:true});},20);return;}
 setTimeout(function(){ok&&ok({});},10);};}})}});
<\/script>`;
    const f = path.join(os.tmpdir(), 'ac-wiz-' + Date.now() + '.html');
    fs.writeFileSync(f, wiz.replace('</head>', stub + '</head>'));

    const p = await b.newPage({ viewport: { width: 720, height: 560 },
                                deviceScaleFactor: 2, colorScheme: 'light' });
    p._fallos = [];
    p.on('pageerror', e => p._fallos.push(e.message));
    await p.goto('file://' + f, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(700);
    await p.evaluate(([emp, sitios]) => {
      W.companyName = emp;
      W.categories  = ['WINDOW', 'SCREEN', 'IGU (INSULATED GLASS UNIT)', 'MIRROR',
                       'SHOWER', 'HARDWARE', 'FLASHING'];
      /* Las ubicaciones del asistente son OBJETOS `{name, type}`, no cadenas:
       * `dibujar()` pregunta por `W.locations[i].type` para pintar de naranja
       * las que no son estantes. Con cadenas sueltas las fichas salían todas
       * con el texto de ejemplo `LOCATION` en gris y la captura no enseñaba
       * ni un solo nombre. */
      W.locations = sitios.map(function (s) {
        return { name: s, type: /^(TRUCK|YARD)/.test(s) ? 'SITE' : 'RACK' };
      });
      step = 2;                       // «Where do you store it?»
      render();
      /* Con los once primeros sitios salían once estantes y ni un camión, así
       * que la ficha naranja —y con ella la frase «un camión también es un
       * sitio donde cabe material»— no se veía. Van nueve estantes y los dos
       * que no lo son. */
    }, [EMPRESA, SITIOS.slice(0, 9).concat(['YARD NORTH', 'TRUCK 2'])]);
    await p.waitForTimeout(450);
    await p.screenshot({ path: salida('3.6-asistente-instalacion') });
    return p;
  },

  /* 3.7 — El importador, con las filas malas señaladas y una corregida.
   *
   * Se le pasa a `_renderImportPreview` la MISMA forma que devuelve el
   * servidor, y a partir de ahí pinta la pantalla de verdad: el recuento, el
   * aviso de lo que se va a crear, el filtro y las filas que fallan. */
  'importar': async (b) => {
    const p = await abrir(b);
    await p.evaluate(() => { openSettingsModal(); });
    await p.waitForTimeout(500);
    await p.evaluate(() => { _renderSettingsTab('import'); });
    await p.waitForTimeout(400);

    await p.evaluate(([cats, sitios, obras, provs]) => {
      function fila(n, cat, name, qty, loc, extra) {
        return Object.assign({
          rowNum: n, category: cat, name: name, qty: qty, unit: 'UNIT',
          location: loc, project: '', supplier: '', po: '', comments: '',
          valid: true, errors: []
        }, extra || {});
      }
      const buenas = [
        fila(2, cats[0], 'SH 3048 WHITE',              48, sitios[0]),
        fila(3, cats[0], 'DH 2836 BRONZE LOW-E',       24, sitios[1]),
        fila(4, cats[1], 'HALF SCREEN 3048 CHARCOAL',  96, sitios[2]),
        fila(5, cats[2], 'IGU 24X60 TEMPERED CLEAR',   36, sitios[3]),
        fila(6, cats[3], 'MIRROR 36X48 BEVELED',       12, sitios[4])
      ];
      /* Las tres que fallan, y cada una por un motivo distinto — que es lo que
       * hace entender la pantalla de un vistazo: falta la cantidad, falta la
       * categoría, y la cantidad no es un número. */
      const malas = [
        fila(41, cats[1], 'FULL SCREEN 2436 BLACK', '', sitios[2],
             { valid: false, errors: ['qty is missing'] }),
        fila(78, '',      'SASH LOCK WHITE',        60, sitios[5],
             { valid: false, errors: ['category is missing'] }),
        fila(205, cats[4],'SHOWER PANEL 34X72 FROSTED', 'six', sitios[6],
             { valid: false, errors: ['qty is not a number'] })
      ];
      _renderImportPreview({
        rows: buenas.concat(malas),
        invalidSample: malas,
        rawLineCount: 601, totalRows: 600, validRows: 597,
        willCreate: {
          locations: [sitios[7], sitios[8]], locationsTotal: 2,
          categories: [], categoriesTotal: 0,
          projects: [obras[0]], projectsTotal: 1,
          suppliers: [provs[0], provs[1]], suppliersTotal: 2
        },
        sheetNames: [], usedSheet: ''
      });
      /* Y una corregida a la vista: se teclea la cantidad que faltaba en la
       * fila 41 y el recuento de abajo sube solo. Es la mitad que convence —
       * sin ella, la captura sólo enseña que algo falló. */
      _impFixes[41] = { qty: 72 };
      _impPintarTabla();
    }, [CATS, SITIOS, OBRAS, PROVEEDORES]);
    await p.waitForTimeout(500);
    await p.screenshot({ path: salida('3.7-importar') });
    return p;
  },

  // 3.8 — El aviso de stock bajo, con rojas y naranjas
  'stock-bajo': async (b) => {
    const p = await abrir(b);
    await p.evaluate(() => showTab('dashboard', 'btn-dashboard'));
    await p.waitForTimeout(400);
    /* El panel con las tarjetas rojas y naranjas se abre desde la franja de
     * aviso. No es la ventana del monitor —ésa es la de elegir qué vigilar—
     * sino `stockDetailPanel`, que es lo que 3.8 pide. */
    await p.click('#alertBanner');
    await p.waitForTimeout(800);
    await recorteDesde(p, '#alertBanner', '3.8-stock-bajo');
    return p;
  }
};

// ════════════════════════════════════════════════════════════════════════════

(async () => {
  const soloIdx = process.argv.indexOf('--solo');
  const solo = soloIdx > -1 ? process.argv[soloIdx + 1] : null;
  const lista = solo ? [solo] : Object.keys(CAPTURAS);

  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  let hechas = 0;
  for (const nombre of lista) {
    if (!CAPTURAS[nombre]) { console.log('  ?    no existe la captura «' + nombre + '»'); continue; }
    process.stdout.write('  ' + nombre + ' … ');
    try {
      const p = await CAPTURAS[nombre](browser);
      const f = (p._fallos || []).filter(m => !/ResizeObserver/.test(m));
      console.log('ok' + (f.length ? '   ⚠ ' + f.length + ' error(es) en la página: ' + f[0] : ''));
      await p.close();
      hechas++;
    } catch (e) {
      console.log('FALLÓ → ' + e.message);
    }
  }
  await browser.close();
  console.log('\n  ' + hechas + '/' + lista.length + ' en ' + path.relative(ROOT, SALIDA) + '\n');
})();
