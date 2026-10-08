// LA VENTANA DE INICIAR SESIÓN VOLVÍA A OTRA APP, Y NADIE LO DECÍA.
//
// Jose, 2026-10-08, después de un día entero intentando entrar en la DEMO con
// su cuenta de empresa. Su captura lo enseñó sin lugar a dudas:
//
//     la página:    …/s/AKfycbzxKF659yaTtULpAYx4HngN…/exec
//     la ventanita: …/s/AKfycbzxQ1YeehasKAj2o1…      → "No se pudo abrir el archivo"
//
// DOS DESPLIEGUES DISTINTOS. `OAUTH_REDIRECT_URI` apuntaba a uno viejo, así que
// la ventana de Google volvía a una app que ya no contesta, moría con el error
// genérico de Drive, y la pantalla se quedaba CUATRO MINUTOS en "Waiting for
// sign-in…" para terminar con "Timed out. Please try again." — un mensaje que
// invita a repetir exactamente lo mismo.
//
// ── POR QUÉ SE ME ESCAPÓ DOS VECES ────────────────────────────────────────
//
// Di dos diagnósticos equivocados antes de éste (la forma `/a/macros/`, y la
// autorización caducada) porque comparaba DIRECCIONES ENTERAS. Y eso no se
// puede comparar: Google escribe el principio de una forma u otra según con qué
// cuenta miras —`/macros/`, `/a/macros/`, `/macros/u/0/`— y las tres son la
// misma app.
//
// Lo que identifica es el trozo de después de `/s/`. Comparar la parte que
// identifica y no la que decora es toda la diferencia, y es lo que mide la
// sección 1.
//
// ── Y SE DESALINEAN SOLAS ─────────────────────────────────────────────────
//
// Al copiar la hoja, al crear un despliegue NUEVO en vez de actualizar el que
// había, y al cambiar el proyecto de Cloud. Ninguna de las tres avisa. Por eso
// no basta con arreglarlo una vez: hace falta que algo lo mire.
//
// Uso:  node tools/test-vuelta-del-login.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const GS   = fs.readFileSync(path.join(ROOT, 'Code_v3_fixed.gs'), 'utf8');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');
const A    = require('./andamio.js');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

const VIVO  = 'AKfycbzxKF659yaTtULpAYx4HngN_DoEF0VrdH4CwHhMbGKCAlEKvGYKEjAGfCuJxSP1XKcw';
const MUERTO = 'AKfycbzxQ1YeehasKAj2o1ZZZZZZZZZZZZZZZZZZZZZZ';

console.log('\n═══ 1. Se compara lo que identifica, no lo que decora ═══\n');
{
  // Las dos mitades, la del servidor y la del navegador, se miden JUNTAS: son
  // gemelas a propósito y el día que una cambie sin la otra, esto lo dice.
  const ctx = { console };
  vm.createContext(ctx);
  vm.runInContext(A.fnSrc(GS, 'idDeDespliegue_') + '\n' + A.fnSrc(HTML, '_idDeDespliegue'), ctx);
  const pares = [
    ['https://script.google.com/macros/s/' + VIVO + '/exec',                 VIVO, 'la forma normal'],
    ['https://script.google.com/a/macros/ox-glass.com/s/' + VIVO + '/exec',  VIVO, 'la de una cuenta de empresa'],
    ['https://script.google.com/macros/u/0/s/' + VIVO + '/exec',             VIVO, 'la que lleva el número de cuenta del navegador'],
    ['https://script.google.com/a/macros/s/' + VIVO + '/exec',               VIVO, 'la de empresa sin el dominio']
  ];
  pares.forEach(function(p){
    check('LAS TRES FORMAS DE LA MISMA APP dan el mismo identificador — ' + p[2] +
          '. Comparar la dirección entera es lo que me hizo fallar dos diagnósticos',
      ctx.idDeDespliegue_(p[0]) === p[1] && ctx._idDeDespliegue(p[0]) === p[1],
      { servidor: ctx.idDeDespliegue_(p[0]), navegador: ctx._idDeDespliegue(p[0]) });
  });
  check('y dos despliegues distintos NO se confunden, que es el caso de Jose',
    ctx.idDeDespliegue_('https://script.google.com/macros/s/' + VIVO + '/exec') !==
    ctx.idDeDespliegue_('https://script.google.com/a/macros/ox-glass.com/s/' + MUERTO + '/exec'));
  check('lo que no es una dirección de Apps Script devuelve vacío — "no sé", y quien ' +
        'llama no afirma nada con eso',
    ctx.idDeDespliegue_('https://ejemplo.com/x') === '' &&
    ctx.idDeDespliegue_('') === '' && ctx._idDeDespliegue(null) === '');
  check('las dos mitades son GEMELAS: mismo resultado en todos los casos — si una cambia ' +
        'sin la otra, la pantalla y el servidor opinarían distinto sobre la misma dirección',
    pares.every(p => ctx.idDeDespliegue_(p[0]) === ctx._idDeDespliegue(p[0])));
}

console.log('\n═══ 2. No se abre una ventana que ya sabemos que va a morir ═══\n');
{
  function probar(hrefId, vueltaId) {
    const texto = { valor: '', color: '' };
    const ctx = {
      console, location: { href: 'https://script.google.com/a/macros/ox-glass.com/s/' + hrefId + '/exec' },
      _oauthClientId: 'cliente.apps.googleusercontent.com',
      _oauthRedirectUri: 'https://script.google.com/macros/s/' + vueltaId + '/exec',
      _loginPollTimer: null,
      document: { getElementById: () => ({ set textContent(v){ texto.valor = v; },
                                           get textContent(){ return texto.valor; },
                                           style: { set color(c){ texto.color = c; }, get color(){ return texto.color; } } }) },
      window: { open: () => { texto.abrio = true; return { closed: false }; } },
      setInterval: () => 1, clearInterval: () => {},
      encodeURIComponent, Math, Date
    };
    vm.createContext(ctx);
    vm.runInContext(A.fnSrc(HTML, '_idDeDespliegue') + '\n' + A.fnSrc(HTML, '_startGoogleLogin'), ctx);
    ctx._startGoogleLogin();
    return texto;
  }

  const malo = probar(VIVO, MUERTO);
  check('EL CASO DE JOSE: con la vuelta apuntando a otra app, NO SE ABRE la ventana — ' +
        'abrirla sería hacer esperar cuatro minutos para no enterarse de nada',
    !malo.abrio, malo);
  check('...y se dice en el acto, no a los cuatro minutos', /different deployment/i.test(malo.valor), malo.valor);
  check('...con los DOS identificadores delante, para poder comparar sin adivinar',
    malo.valor.indexOf(MUERTO.substring(0, 10)) !== -1 &&
    malo.valor.indexOf(VIVO.substring(0, 10)) !== -1, malo.valor);
  check('...y dice DÓNDE se arregla, en vez de dejar a alguien mirando un error',
    /Check this installation/i.test(malo.valor), malo.valor);

  const bueno = probar(VIVO, VIVO);
  check('cuando las dos son la misma app, la ventana se abre como siempre — esto no puede ' +
        'estorbar al caso normal', bueno.abrio === true, bueno);
}

console.log('\n═══ 3. Y la espera deja de ser muda ═══\n');
{
  const fn = A.fnSrc(HTML, '_startGoogleLogin');
  /* SIN COMENTARIOS para la comprobación de abajo, y el motivo es gracioso: el
   * comentario que explica este arreglo CITA la frase vieja —"Timed out. Please
   * try again."— para decir por qué se quitó. Mi primer intento la buscó en el
   * código entero y la encontró ahí, en la explicación de su propia
   * eliminación. Medir el comentario en vez del código. */
  const sinComent = fn.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  check('a los ~30 segundos se dice algo — lo normal tarda menos de diez, y a los treinta ' +
        'lo más probable es que la ventana se murió, no que alguien lea despacio',
    /tries === 20 && status/.test(fn));
  check('...y el final ya no es "Timed out. Please try again.", que invitaba a repetir lo ' +
        'mismo sin saber nada', !/Timed out\. Please try again\./.test(sinComent), sinComent.length);
  check('...sino que dice dónde mirar si falla dos veces',
    /never came back/.test(fn) && /Check this\s+'?\s*\+?\s*'?installation/i.test(fn.replace(/\s+/g, ' ')));
}

console.log('\n═══ 4. Y algo lo vigila, porque se desalinean solas ═══\n');
{
  const chk = A.fnSrc(GS, 'menuCheckInstallation');
  check('Check installation compara las dos direcciones', /idDeDespliegue_\(url\)/.test(chk));
  /* LA CONDICIÓN, no sólo la reparación.
   *
   * Mi primer intento comprobaba que apareciera
   * `setProperty('OAUTH_REDIRECT_URI', url)` — y esa línea existe DOS VECES en
   * esta función: en la reparación de "falta" que ya había, y en la nueva de
   * "apunta a otra". Así que al desactivar la nueva, la prueba seguía verde:
   * encontraba la vieja y daba por bueno algo que ya no pasaba. Lo vi con la
   * mutación, que para eso está.
   *
   * Lo que de verdad distingue a la rama nueva es su CONDICIÓN. */
  check('...y la condición que distingue "apunta a otra app" de "falta" sigue en pie — ' +
        'la reparación sola no basta: esa línea existe dos veces en esta función',
    /idApp && idVuelta && idApp !== idVuelta/.test(chk), chk.indexOf('idApp'));
  check('...y repara, como hace con las demás propiedades',
    /setProperty\('OAUTH_REDIRECT_URI', url\)/.test(chk));
  /* Repararla y callarse lo de fuera sería cambiar un fallo por otro más
   * difícil de ver: el cliente de OAuth, en Cloud Console, tiene que tener esa
   * misma dirección en su lista. */
  check('...y DICE LO QUE FALTA POR HACER FUERA — la dirección tiene que estar también en ' +
        'el cliente de OAuth, y eso no se puede hacer desde aquí',
    /Authorized redirect URIs/.test(chk));

  const act = A.fnSrc(GS, 'selfActivateWebApp_');
  check('publicar mantiene al día la dirección de vuelta — es la ÚNICA función que conoce ' +
        'la buena de primera mano, y ya aprendió esta lección en la v12.42 con la otra',
    /setProperty\('OAUTH_REDIRECT_URI', url\)/.test(act));
  check('...sólo si había una y apunta a otro despliegue; si no había, redirectUri_ ya cae ' +
        'en la que se acaba de guardar',
    /vueltaVieja && idDeDespliegue_\(vueltaVieja\)/.test(act));
  check('...y queda en la auditoría de dónde a dónde', /OAUTH_REDIRECT_FIXED/.test(act));
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones\n');
process.exit(fail ? 1 : 0);
