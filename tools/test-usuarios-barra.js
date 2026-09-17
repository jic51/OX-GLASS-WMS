#!/usr/bin/env node
/* ─────────────────────────────────────────────────────────────────────────────
   MANAGE USERS, EL MURO Y EL TÍTULO DEL CAJÓN.

   Los tres que Jose aprobó el 2026-09-17, y los tres por sus propias palabras.

   1 · MANAGE USERS. "Quiero hacer lo que hicimos con Date, Category, Name y
       Type: poner nombre y correo uno sobre otro, y rol y added uno sobre
       otro... también quiero quitar el cuadro de Add User de arriba y sólo
       dejarlo como un botón que al dar clic abre el cuadro... también el botón
       editar y desactivar sólo se activan cuando seleccionamos algún usuario,
       lo que significa que también debemos poner check boxes."

       Tres cosas que decidí yo encima de eso, y que se prueban aquí porque
       ninguna es evidente mirando la pantalla:
         · TU PROPIA FILA NO SE MARCA. El servidor ya se niega a que te borres
           a ti mismo; la casilla apagada es esa misma regla dicha antes de
           pulsar, en vez de después.
         · EDITAR CON UNO, DESACTIVAR CON VARIOS. Un formulario no puede decir
           la verdad sobre dos usuarios a la vez.
         · EL BOTÓN CAMBIA SEGÚN LO MARCADO, y con una mezcla se apaga.
           "Deactivate" sobre alguien que ya está fuera no significa nada, y
           hacer las dos cosas con un botón es pedir un accidente. Reactivar no
           existía: el pie de la ventana mandaba a editar la hoja a mano, aunque
           el servidor sabía hacerlo desde siempre.

   2 · EL MURO NARANJA, topado a dos tercios de la ventana.

   3 · EL TÍTULO DEL CAJÓN. "Sólo quiero que aparezca el nombre del material
       cuando se lo selecciona... y aparecen las opciones."

   Lo que se ejecuta de verdad es la barra: es donde vive la decisión de qué se
   puede hacer sobre lo marcado, y es la que se rompe en silencio.
   ───────────────────────────────────────────────────────────────────────── */

const vm = require('vm');
const A  = require('./andamio.js');

const HTML = A.fuente('html');
const m    = A.marcador('usuarios, muro y cajón');

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('la barra sabe qué se puede hacer con lo marcado');

function caja(usuarios, yo){
  const botones = {
    btnUsrEdit:   { disabled: true, title: '' },
    btnUsrActive: { disabled: true, title: '', textContent: '' },
    usrSelCount:  { textContent: '' },
    usrSelAll:    { checked: false, indeterminate: false, disabled: false }
  };
  const ctx = {
    Math, Date, String, Number, JSON, Array, Object, console,
    _usersData: usuarios,
    userEmail: yo || 'jefe@ox.com',
    _usrSelection: {},
    document: {
      getElementById: (id) => botones[id] || null,
      // La tabla no está pintada en esta caja: lo que se mide es la DECISIÓN,
      // no el HTML. _syncUsrSelectAll recorre casillas y sin ellas no hace
      // nada, que es exactamente lo que hace en un móvil con la lista cerrada.
      querySelectorAll: () => []
    }
  };
  const c = A.montar(ctx, HTML,
    ['_usrPickable', '_selectedUsers', 'toggleUsrSelect', '_syncUsrSelectAll',
     '_updateUsrActionBar'], {});
  // La app pinta la barra al final de cada _renderUsersTable, así que la caja
  // tiene que empezar igual: sin esto el estado inicial no es "nada marcado",
  // es "nadie ha pintado nada todavía", y eso no existe en el producto.
  c._updateUsrActionBar();
  return {
    ctx: c, botones,
    marcar(...correos){
      correos.forEach(e => { c._usrSelection[e] = true; });
      c._updateUsrActionBar();
    },
    limpiar(){ c._usrSelection = {}; c._updateUsrActionBar(); }
  };
}

const GENTE = [
  { email: 'jefe@ox.com',  name: 'Jose',  role: 'ADMIN',     active: true  },
  { email: 'ana@ox.com',   name: 'Ana',   role: 'WAREHOUSE', active: true  },
  { email: 'luis@ox.com',  name: 'Luis',  role: 'WAREHOUSE', active: true  },
  { email: 'vieja@ox.com', name: 'Rosa',  role: 'VIEWER',    active: false },
  { email: 'otro@ox.com',  name: 'Pedro', role: 'VIEWER',    active: false }
];

{
  const k = caja(GENTE);
  m.check('sin nada marcado, Edit está apagado', k.botones.btnUsrEdit.disabled === true);
  m.check('...y lo dice', /Tick a user first/.test(k.botones.btnUsrEdit.title));
  m.check('sin nada marcado, el otro botón también', k.botones.btnUsrActive.disabled === true);
  m.check('...y por defecto ofrece desactivar, no reactivar',
    k.botones.btnUsrActive.textContent === '🚫 Deactivate');
  m.check('...y no dice que haya nada marcado', k.botones.usrSelCount.textContent === '');
}

{
  const k = caja(GENTE);
  k.marcar('ana@ox.com');
  m.check('con UNO marcado se puede editar', k.botones.btnUsrEdit.disabled === false);
  m.check('...y el botón dice a quién', /ana@ox\.com/.test(k.botones.btnUsrEdit.title));
  m.check('...y se puede desactivar', k.botones.btnUsrActive.disabled === false);
  m.check('...en singular', /1 user\b/.test(k.botones.btnUsrActive.title), k.botones.btnUsrActive.title);
  m.check('...y la cuenta se ve', k.botones.usrSelCount.textContent === '1 selected');
}

{
  const k = caja(GENTE);
  k.marcar('ana@ox.com', 'luis@ox.com');
  m.check('con DOS marcados ya no se puede editar — un formulario no puede ' +
          'decir la verdad sobre dos a la vez', k.botones.btnUsrEdit.disabled === true);
  m.check('...y lo explica', /just one/.test(k.botones.btnUsrEdit.title), k.botones.btnUsrEdit.title);
  m.check('pero desactivar los dos sí', k.botones.btnUsrActive.disabled === false);
  m.check('...en plural', /2 users/.test(k.botones.btnUsrActive.title));
}

{
  /* REACTIVAR, que antes no existía: el pie de la ventana mandaba a editar la
     hoja de cálculo a mano. El servidor aceptaba `active` desde siempre. */
  const k = caja(GENTE);
  k.marcar('vieja@ox.com', 'otro@ox.com');
  m.check('con dos inactivos marcados, el botón ofrece REACTIVAR',
    k.botones.btnUsrActive.textContent === '↩ Reactivate', k.botones.btnUsrActive.textContent);
  m.check('...y está encendido', k.botones.btnUsrActive.disabled === false);
  m.check('...y dice qué va a pasar',
    /sign in again/.test(k.botones.btnUsrActive.title), k.botones.btnUsrActive.title);
}

{
  /* LA MEZCLA SE APAGA. Es la decisión que más fácil habría sido resolver
     "eligiendo por mí", y sería la peor: la mitad de lo marcado haría una cosa
     y la otra mitad otra, sin que nadie lo pidiera. */
  const k = caja(GENTE);
  k.marcar('ana@ox.com', 'vieja@ox.com');
  m.check('activos e inactivos a la vez: el botón se APAGA',
    k.botones.btnUsrActive.disabled === true);
  m.check('...diciendo por qué, no callado',
    /one kind at a time/.test(k.botones.btnUsrActive.title), k.botones.btnUsrActive.title);
  m.check('...y la cuenta sigue enseñando los dos', k.botones.usrSelCount.textContent === '2 selected');
}

{
  /* TU PROPIA FILA. El servidor se niega en redondo ("You cannot remove your
     own account"); esto es la misma regla dicha antes de pulsar. Se comprueba
     desde el MODELO, no desde la casilla: si mañana alguien se marca a sí mismo
     por otro camino, la barra tampoco debe contarlo. */
  const k = caja(GENTE, 'jefe@ox.com');
  m.check('yo mismo no soy marcable', k.ctx._usrPickable(GENTE[0]) === false);
  m.check('...y cualquier otro sí', k.ctx._usrPickable(GENTE[1]) === true);

  k.marcar('jefe@ox.com');
  m.check('marcarme a mí mismo no cuenta para nada', k.botones.usrSelCount.textContent === '');
  m.check('...y los dos botones siguen apagados',
    k.botones.btnUsrEdit.disabled === true && k.botones.btnUsrActive.disabled === true);

  k.marcar('ana@ox.com');
  m.check('con otro marcado además de mí, sólo cuenta el otro',
    k.botones.usrSelCount.textContent === '1 selected', k.botones.usrSelCount.textContent);
}

{
  // Un correo que ya no está en la lista no puede quedarse contando.
  const k = caja(GENTE);
  k.marcar('ana@ox.com', 'fantasma@ox.com');
  m.check('un usuario que ya no existe no cuenta',
    k.botones.usrSelCount.textContent === '1 selected', k.botones.usrSelCount.textContent);
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('lo que se quitó de la pantalla, y lo que se puso');

{
  m.check('el formulario ya no vive siempre encima de la lista: está en su ' +
          'propia ventana', /<div class="overlay" id="userFormOverlay">/.test(HTML));
  m.check('...que es HERMANA de la lista, no hija — anidada quedaría debajo de ' +
          'la ventana que la abre',
    HTML.indexOf('id="userFormOverlay"') > HTML.indexOf('<!-- Add / Edit form'),
    true);
  m.check('...y se abre con un botón', /onclick="openUserForm\(\)"/.test(HTML));

  const tabla = HTML.slice(HTML.indexOf('<table class="users-table">'),
                           HTML.indexOf('</table>', HTML.indexOf('<table class="users-table">')));
  /* `<th` A SECAS TAMBIÉN CASA CON `<thead`, y mi primera versión contaba seis
     donde hay cinco. Una comprobación que cuenta etiquetas tiene que contar
     etiquetas, no prefijos. */
  const ths = (tabla.match(/<th[ >]/g) || []).length;
  m.check('la cabecera baja de siete columnas a cinco', ths === 5, ths);
  m.check('...y la primera es la casilla de marcar',
    /<th class="mov-sel-cell"><input type="checkbox" id="usrSelAll"/.test(tabla));
  m.check('...con Usuario y Rol\\/Added como columnas apiladas',
    /<th>User<\/th><th>Role \/ Added<\/th>/.test(tabla), tabla.slice(0, 200));

  const pinta = A.fnSrc(HTML, '_renderUsersTable');
  m.check('el nombre va arriba y el correo abajo, en la misma columna',
    /usr-top[\s\S]{0,200}_he\(u\.email\)/.test(pinta));
  m.check('el rol arriba y la fecha abajo, en la misma columna',
    /_roleBadge\(u\.role\)[\s\S]{0,140}u\.addedAt/.test(pinta));
  m.check('las filas ya no llevan botones de acción — viven en la barra',
    !/data-action="edit-user"/.test(HTML) && !/data-action="deact-user"/.test(HTML));
  m.check('...y el delegador tampoco los escucha ya',
    !/a === 'deact-user'/.test(HTML));

  /* EL PIE DE LA VENTANA DECÍA QUE FUERAS A LA HOJA DE CÁLCULO. Mientras
     reactivar no existía era verdad; ahora sería mandar a alguien a editar
     datos a mano cuando hay un botón. */
  m.check('el pie ya no manda a editar la hoja USERS_V3 a mano',
    !/re-activate, edit the row directly in the USERS_V3/i.test(HTML));
  m.check('...y explica el botón que ahora sí existe',
    /press Reactivate to let them back in/.test(HTML));
}

{
  /* REACTIVAR VA POR updateUser, no por un endpoint nuevo: el servidor ya
     escribía `active` y nadie se lo pedía. Menos código nuevo es menos sitio
     donde equivocarse. */
  const fn = A.fnSrc(HTML, 'toggleSelectedUsers');
  m.check('reactivar usa updateUser con active:true',
    /'updateUser', _h\(\{ email: u\.email, active: true \}\)/.test(fn));
  m.check('...y desactivar sigue usando removeUser, que ya guardaba el rastro',
    /'removeUser', _h\(\{ email: u\.email \}\)/.test(fn));
  m.check('las dos van por la cola de escrituras, como todo lo que escribe',
    /_acWrite\(\{/.test(fn) && /prog: true/.test(fn));
  m.check('...y se cuentan en la línea de progreso, no en un aviso por usuario',
    /_progStart\(sel\.length/.test(fn));
  m.check('y preguntan antes, nombrando a quién', /_showConfirm\(\{/.test(fn) &&
    /quienes\.join/.test(fn));
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('el muro naranja, topado a dos tercios');

{
  const css = HTML.slice(HTML.indexOf('.deck{position:fixed'),
                         HTML.indexOf('.deck:empty'));
  m.check('la pila no puede pasar de dos tercios de la ventana',
    /max-height:calc\(66\.6vh - 22px\)/.test(css), css);
  m.check('...restando su propio margen de abajo, o dos tercios ya no serían ' +
          'dos tercios', /- 22px/.test(css));
  m.check('si no cabe, se desplaza dentro de su hueco — nunca esconde una tarjeta',
    /overflow-y:auto/.test(css));
  m.check('...y sin barra gris, como el resto de la app', /scrollbar-width:none/.test(css));
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('el cajón dice qué material estás tocando');

{
  const fn = A.fnSrc(HTML, '_toggleRdwActions');
  m.check('al abrir las opciones, el título pasa a ser el material',
    /_rdwTitle\(item && item\.name \? '📦 ' \+ item\.name/.test(fn), fn.slice(-400));
  m.check('...y al cerrarlas vuelve al estante', /\} else \{[\s\S]{0,140}_rdwTitleRack\(\)/.test(fn));
  m.check('sin nombre no se deja la cabecera vacía: se queda el estante',
    /_openRackName \|\| 'Rack'/.test(fn));

  const abrir = A.fnSrc(HTML, 'openRackDrawer');
  m.check('al abrir o repintar el cajón, el título es el del estante — el ' +
          'material que mirabas puede haberse ido',
    /_rdwTitle\('📦 ' \+ rackName\)/.test(abrir));
}

m.fin();
