// M-03 · LA FOTO LLENA LA HOJA, Y NO SALE GIRADA.
//
// Jose, 11/11, con el PDF de un Bill of Lading guardado por la app: *"al
// guardar el PDF con las fotos se ven peor que nunca, las fotos sólo ocupan
// una parte de toda la hoja y también se guardan giradas"*. Y el 12/11,
// precisando lo primero: *"deben tener su mayor tamaño dentro de la hoja"*.
//
// Son DOS causas distintas y conviene no volver a mezclarlas, que es lo que
// pasó el 12/10:
//
//   (a) LA HOJA estaba clavada en Carta vertical. Una foto apaisada entra a lo
//       ancho y deja media hoja en blanco. Aritmética, no un fallo.
//   (b) LAS FOTOS giradas sí era un fallo nuestro: hay DOS puertas por las que
//       sube una imagen y sólo una enderezaba.
//
// Esto EJECUTA las dos. El error que ya cometí tres veces en este proyecto es
// comprobar con una expresión regular que la línea está escrita: eso pasa
// igual con el fallo dentro.
//
// Uso:  NODE_PATH="$(npm root -g)" node tools/test-la-foto-llena-la-hoja.js

const fs   = require('fs');
const path = require('path');
const A    = require('./andamio.js');

const RAIZ = path.join(__dirname, '..');
const GS   = fs.readFileSync(path.join(RAIZ, 'Code_v3_fixed.gs'), 'utf8');
const HTML = fs.readFileSync(path.join(RAIZ, 'Index_v3_fixed.html'), 'utf8');

let ok = 0;
const fallos = [];
function check(etiqueta, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + etiqueta); return; }
  fallos.push(etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
  console.log('  ✗    ' + etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
}

// ════════════════════════════════════════════════════════════════════════════
// 1 · LA HOJA SE PONE DEL LADO DE LA FOTO
// ════════════════════════════════════════════════════════════════════════════
//
// Se monta un Google Docs de mentira que se comporta como el de verdad en lo
// único que importa aquí: `appendImage` devuelve una imagen con el tamaño YA
// auto-escalado al ancho del cuerpo, y `setPageWidth/Height` cambian la hoja.
// Con eso se puede medir qué porcentaje de la hoja ocupa la foto al final.

console.log('\n═══ 1 · LA HOJA SE PONE DEL LADO DE LA FOTO ═══\n');

function docDeMentira() {
  const estado = { pw: 612, ph: 792, imagenes: [] };

  function nuevaImagen(ratio) {
    // Como el de verdad: entra escalada al ancho del cuerpo que haya al
    // insertarla, conservando la proporción.
    let w = estado.pw, h = Math.round(estado.pw / ratio);
    const img = {
      getWidth:  () => w,
      getHeight: () => h,
      setWidth:  v => { w = v; return img; },
      setHeight: v => { h = v; return img; },
      getParent: () => ({ asParagraph: () => ({
        setSpacingBefore: () => {}, setSpacingAfter: () => {},
        setLineSpacing:   () => {}, setAlignment:    () => {}
      }) }),
      _dims: () => ({ w, h })
    };
    return img;
  }

  const body = {
    setMarginTop: () => {}, setMarginBottom: () => {},
    setMarginLeft: () => {}, setMarginRight: () => {},
    clear: () => {}, appendPageBreak: () => {},
    setPageWidth:  v => { estado.pw = v; },
    setPageHeight: v => { estado.ph = v; },
    appendImage: blob => {
      const img = nuevaImagen(blob._ratio);
      estado.imagenes.push(img);
      return img;
    }
  };
  return { body: body, estado: estado };
}

/* Se ejecuta `photosToDocPdf_` de verdad, con todo lo de Google sustituido.
 * `basicNiega_` no hace nada aquí: lo que se mide es la geometría, no el
 * permiso — y el permiso ya tiene su propia prueba. */
function montarPdf(ratios) {
  const d = docDeMentira();
  let fotos = ratios.map(r => ({ fileData: 'x', fileMimeType: 'image/jpeg', _ratio: r }));

  const ctx = {
    basicNiega_: function () {},
    DocumentApp: {
      create: () => ({
        getBody: () => d.body,
        saveAndClose: () => {},
        getId: () => 'DOC1'
      }),
      HorizontalAlignment: { LEFT: 'L', CENTER: 'C' }
    },
    Utilities: {
      base64Decode: () => [1],
      // El blob tiene que arrastrar la proporción hasta `appendImage`, que es
      // lo único que el Docs de mentira necesita saber de la foto.
      newBlob: function (bytes, mime) { return { _ratio: fotos[this._i++]._ratio, _mime: mime }; },
      _i: 0
    },
    DriveApp: { getFileById: () => ({
      getAs: () => ({ setName: () => {} }),
      setTrashed: () => {}
    }) },
    Date: Date, Math: Math, Number: Number, String: String
  };
  ctx.Utilities._i = 0;

  /* `basicNiega_` va en `dobles` y no en el contexto: existe en el archivo, y
   * el andamio se niega —con razón— a dejar que una declaración del producto
   * pise silenciosamente a un doble. Aquí se sustituye a propósito porque lo
   * que se mide es la geometría, no el permiso, y el permiso ya tiene su
   * propia prueba. */
  const F = A.montar(ctx, GS, ['photosToDocPdf_'], { dobles: ['basicNiega_'] });
  F.photosToDocPdf_(fotos, 'doc', { createFile: () => ({ getId: () => 'PDF1' }) });
  return d.estado;
}

{
  /* UNA FOTO APAISADA 4:3 — el caso del PDF que mandó Jose. */
  const e = montarPdf([4 / 3]);
  const { w, h } = e.imagenes[0]._dims();
  const cubre = (w * h) / (e.pw * e.ph);

  check('con una foto apaisada, la hoja se pone apaisada',
    e.pw === 792 && e.ph === 612, { pw: e.pw, ph: e.ph });
  check('...y la foto cubre más del 90% de la hoja (antes: 58%)',
    cubre > 0.90, { cubre: Math.round(cubre * 100) + '%', w: w, h: h });
  check('...sin salirse de la hoja',
    w <= e.pw + 1 && h <= e.ph + 1, { w: w, h: h, pw: e.pw, ph: e.ph });
}

{
  /* UNA FOTO VERTICAL 3:4 — un albarán fotografiado de pie. La hoja se queda
   * vertical, que ya era lo correcto, y esto lo sujeta: el arreglo no puede
   * empeorar el caso que ya funcionaba. */
  const e = montarPdf([3 / 4]);
  const { w, h } = e.imagenes[0]._dims();
  const cubre = (w * h) / (e.pw * e.ph);

  check('con una foto vertical, la hoja se queda vertical',
    e.pw === 612 && e.ph === 792, { pw: e.pw, ph: e.ph });
  check('...y también cubre más del 90%',
    cubre > 0.90, { cubre: Math.round(cubre * 100) + '%' });
}

{
  /* MEZCLA: tres apaisadas y una de pie. Manda la mayoría, y la de pie sigue
   * entrando ENTERA — recortarla sería peor que dejarla pequeña, porque lo que
   * se recorta de un albarán es justo la parte que alguien necesitaba leer. */
  const e = montarPdf([4 / 3, 4 / 3, 4 / 3, 3 / 4]);
  check('con mayoría apaisada, manda la mayoría',
    e.pw === 792, { pw: e.pw });

  const raras = e.imagenes.filter(im => {
    const d = im._dims();
    return d.w > e.pw + 1 || d.h > e.ph + 1;
  });
  check('...y ninguna de las cuatro se sale de la hoja', raras.length === 0,
    e.imagenes.map(im => im._dims()));
}

{
  /* EMPATE: dos y dos. Se queda vertical. No es una preferencia estética — es
   * que con empate hay que elegir algo fijo, y vertical es lo de siempre y lo
   * que sale bien de una impresora sin tocar nada. */
  const e = montarPdf([4 / 3, 3 / 4]);
  check('con empate, la hoja se queda vertical', e.pw === 612, { pw: e.pw });
}

// ════════════════════════════════════════════════════════════════════════════
// 2 · LA SEGUNDA PUERTA TAMBIÉN ENDEREZA
// ════════════════════════════════════════════════════════════════════════════
//
// El arreglo del 12/10 vive en `getBase64`, que se llama desde UN sitio. Las
// fotos de los grupos de documentos —las que se convierten en PDF— pasan por
// `_compressImage`. Esto ejecuta esa función con un navegador de mentira donde
// la foto viene TUMBADA con marca EXIF, y comprueba que lo que sale está de
// pie.

console.log('\n═══ 2 · LA SEGUNDA PUERTA TAMBIÉN ENDEREZA ═══\n');

function navegadorDeMentira(soportaBitmap) {
  const dibujado = { w: 0, h: 0, de: null };
  const lienzo = {
    width: 0, height: 0,
    getContext: () => ({
      drawImage: (fuente, x, y, w, h) => {
        dibujado.w = w; dibujado.h = h; dibujado.de = fuente._quien;
      }
    }),
    toDataURL: () => 'data:image/jpeg;base64,AAAA'
  };

  const ctx = {
    document: { createElement: () => lienzo },
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} },
    FileReader: function () {
      this.readAsDataURL = function () {
        this.onload({ target: { result: 'data:image/jpeg;base64,CRUDO' } });
      };
    },
    // La foto del sensor: TUMBADA, 4000×3000, con marca EXIF que dice «gírala».
    // Respetando la marca mide 3000×4000; ignorándola, 4000×3000.
    Image: function () {
      const self = this;
      Object.defineProperty(this, 'src', {
        set: function () {
          self.naturalWidth  = 4000;   // el <img> SIN enderezar
          self.naturalHeight = 3000;
          self._quien = 'img';
          setTimeout(() => self.onload && self.onload(), 0);
        }
      });
    },
    Promise: Promise, Math: Math, Number: Number, String: String,
    setTimeout: setTimeout
  };
  if (soportaBitmap) {
    ctx.createImageBitmap = function (file, opts) {
      if (!opts || opts.imageOrientation !== 'from-image') {
        return Promise.reject(new Error('sin enderezar'));
      }
      return Promise.resolve({ width: 3000, height: 4000, _quien: 'bitmap', close: () => {} });
    };
  }
  return { ctx: ctx, dibujado: dibujado };
}

function comprimir(soportaBitmap) {
  return new Promise(resolve => {
    const n = navegadorDeMentira(soportaBitmap);
    const F = A.montar(n.ctx, HTML, ['_compressImage']);
    F._compressImage({ type: 'image/jpeg', size: 900000 }, 1200, 0.82, function (b64, mime) {
      setTimeout(() => resolve({ b64: b64, mime: mime, dib: n.dibujado }), 5);
    });
  });
}

(async () => {
  {
    const r = await comprimir(true);
    /* ESTO ES TODO EL FALLO, MEDIDO: la foto llega tumbada (4000×3000) y lo
     * que se sube tiene que estar de pie (más alto que ancho). Antes salía
     * 1200×900 — apaisada — y de ahí venían las dos quejas a la vez: «se
     * guardan giradas» Y «no ocupan toda la hoja». */
    check('lo que se sube está de pie, no tumbado', r.dib.h > r.dib.w,
      { ancho: r.dib.w, alto: r.dib.h });
    /* EL LÍMITE ES EL ANCHO, NO EL LADO LARGO, y esta comprobación lo decía
     * mal: pedía `max(ancho,alto) <= 1200` y fallaba con 1200×1600, que es
     * justo lo correcto. Una foto de pie limitada por el ancho mide más de
     * alto, y así ha sido siempre — el número que importa es el ancho, que es
     * lo que decide cuánto pesa el base64 que viaja en la llamada. */
    check('...y se encoge al ancho máximo pedido', r.dib.w <= 1200,
      { ancho: r.dib.w, alto: r.dib.h });
    check('...y viene del mapa de bits enderezado, no del <img> crudo',
      r.dib.de === 'bitmap', r.dib);
    check('...y sale como JPEG', r.mime === 'image/jpeg', r.mime);
  }

  {
    /* SIN `createImageBitmap` —un navegador viejo— la foto se sube igual. Una
     * foto torcida es un fastidio; una foto que no se sube es trabajo
     * perdido, y eso ya estaba escrito en `getBase64` el 12/10. */
    const r = await comprimir(false);
    check('sin createImageBitmap, la foto se sube igual', !!r.b64, r);
    check('...por el camino de antes', r.dib.de === 'img', r.dib);
  }

  {
    /* Y NO POR LOS DOS A LA VEZ. La primera versión de este arreglo llamaba a
     * `createImageBitmap` y dejaba corriendo el `img.src` de abajo, así que
     * cada foto se subía dos veces y el PDF salía con las páginas repetidas.
     * Se cuenta cuántas veces llama al callback. */
    let veces = 0;
    const n = navegadorDeMentira(true);
    const F = A.montar(n.ctx, HTML, ['_compressImage']);
    await new Promise(res => {
      F._compressImage({ type: 'image/jpeg', size: 900000 }, 1200, 0.82, function () {
        veces++;
      });
      setTimeout(res, 40);
    });
    check('la foto se procesa UNA vez, no dos', veces === 1, { veces: veces });
  }

  if (fallos.length) {
    console.error('\nFALLÓ:\n  ' + fallos.join('\n  ') + '\n');
    console.error('  El PDF de las fotos es lo que alguien abre meses después\n' +
                  '  para saber qué llegó. Si sale girado o a media hoja, no se\n' +
                  '  puede leer — y nadie vuelve a adjuntar una foto.\n');
    process.exit(1);
  }
  console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
})();
