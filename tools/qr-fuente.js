/* ─────────────────────────────────────────────────────────────────────────────
 * UN CODIFICADOR DE QR, ENTERO, DENTRO DEL ARCHIVO.
 *
 * ESTE ARCHIVO ES LA FUENTE. Se copia tal cual dentro de `Index_v3_fixed.html`
 * —`tools/test-qr.js` comprueba que las dos copias son idénticas— y vive
 * también aquí suelto porque así se puede probar en Node contra un
 * DECODIFICADOR DE VERDAD, que es la única forma honesta de saber si un QR
 * escanea. Un QR mal hecho se dibuja igual de bonito que uno bueno.
 *
 * POR QUÉ NO UNA LIBRERÍA NI UN SERVICIO
 *
 *  · Un servicio tipo `api.qrserver.com` manda el identificador del material
 *    de un cliente a un tercero cada vez que se imprime una etiqueta, y deja
 *    de funcionar sin internet. Las dos cosas son inaceptables aquí: Jose
 *    dijo *"no publicar nada que tenga información importante de acopio o
 *    mía"* y una bodega imprime etiquetas con el wifi caído.
 *  · Una librería externa en la app significa una etiqueta `<script src>` en
 *    una aplicación que es UN SOLO ARCHIVO a propósito, y que se instala
 *    copiando y pegando.
 *
 * QUÉ ABARCA, Y QUÉ NO
 *
 *  · Modo BYTE (ISO-8859-1), que es lo que necesitamos: `ACP1:...`.
 *  · Nivel de corrección M (~15%). En una etiqueta térmica que va a vivir en
 *    un estante con polvo, L es poco y Q desperdicia sitio.
 *  · Versiones 1 a 10 — hasta 216 bytes de datos. El texto más largo que
 *    pondremos ronda los 90.
 *  · No hay modo numérico ni alfanumérico: comprimirían más, y por 90 bytes
 *    no vale el código que haría falta mantener.
 * ───────────────────────────────────────────────────────────────────────────── */

/* ── Aritmética en GF(256), que es lo que hace funcionar la corrección ─────── */
var QR_EXP = new Array(512), QR_LOG = new Array(256);
(function(){
  var x = 1;
  for (var i = 0; i < 255; i++){
    QR_EXP[i] = x;
    QR_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11D;          // el polinomio del estándar
  }
  for (var j = 255; j < 512; j++) QR_EXP[j] = QR_EXP[j - 255];
})();

function qrMul(a, b){
  if (a === 0 || b === 0) return 0;
  return QR_EXP[QR_LOG[a] + QR_LOG[b]];
}

/* El polinomio generador de `grado` términos. */
function qrGenPoly(grado){
  var p = [1];
  for (var i = 0; i < grado; i++){
    var n = new Array(p.length + 1);
    for (var k = 0; k < n.length; k++) n[k] = 0;
    for (var j = 0; j < p.length; j++){
      n[j]     ^= qrMul(p[j], 1);
      n[j + 1] ^= qrMul(p[j], QR_EXP[i]);
    }
    p = n;
  }
  return p;
}

/* División polinómica: devuelve los `grado` codewords de corrección. */
function qrEC(datos, grado){
  var gen = qrGenPoly(grado);
  var resto = datos.slice();
  for (var i = 0; i < grado; i++) resto.push(0);
  for (var k = 0; k < datos.length; k++){
    var coef = resto[k];
    if (!coef) continue;
    for (var j = 0; j < gen.length; j++) resto[k + j] ^= qrMul(gen[j], coef);
  }
  return resto.slice(datos.length);
}

/* ── Las tablas del estándar, sólo nivel M y versiones 1-10 ───────────────── */
/*  [total de codewords, EC por bloque, bloques g1, datos g1, bloques g2, datos g2] */
var QR_M = {
  1:  [ 26, 10, 1, 16, 0,  0],
  2:  [ 44, 16, 1, 28, 0,  0],
  3:  [ 70, 26, 1, 44, 0,  0],
  4:  [100, 18, 2, 32, 0,  0],
  5:  [134, 24, 2, 43, 0,  0],
  6:  [172, 16, 4, 27, 0,  0],
  7:  [196, 18, 4, 31, 0,  0],
  8:  [242, 22, 2, 38, 2, 39],
  9:  [292, 22, 3, 36, 2, 37],
  10: [346, 26, 4, 43, 1, 44]
};
var QR_ALIN = {
  1: [], 2: [6,18], 3: [6,22], 4: [6,26], 5: [6,30],
  6: [6,34], 7: [6,22,38], 8: [6,24,42], 9: [6,26,46], 10: [6,28,50]
};

function qrDatosDe(v){
  var t = QR_M[v];
  return t[2] * t[3] + t[4] * t[5];
}

/* ── Texto → codewords ───────────────────────────────────────────────────── */
function qrBytes(txt){
  var out = [];
  for (var i = 0; i < txt.length; i++){
    var c = txt.charCodeAt(i);
    /* Modo byte es ISO-8859-1. Cualquier cosa por encima de 255 no cabe, y
     * callarse y escribir basura sería peor que no imprimir: la etiqueta
     * saldría con un QR que escanea y dice otra cosa. */
    if (c > 255) throw new Error('QR: character out of range: ' + txt[i]);
    out.push(c);
  }
  return out;
}

function qrVersionPara(n){
  for (var v = 1; v <= 10; v++){
    var cab = (v <= 9) ? 8 : 16;                  // bits de longitud en modo byte
    if (qrDatosDe(v) * 8 >= 4 + cab + n * 8) return v;
  }
  throw new Error('QR: too much data (' + n + ' bytes)');
}

function qrCodewords(txt){
  var bytes = qrBytes(txt);
  var v     = qrVersionPara(bytes.length);
  var cab   = (v <= 9) ? 8 : 16;
  var bits  = [];
  function meter(valor, n){
    for (var i = n - 1; i >= 0; i--) bits.push((valor >> i) & 1);
  }
  meter(4, 4);                                    // modo byte
  meter(bytes.length, cab);
  for (var i = 0; i < bytes.length; i++) meter(bytes[i], 8);

  var cap = qrDatosDe(v) * 8;
  for (var t = 0; t < 4 && bits.length < cap; t++) bits.push(0);   // terminador
  while (bits.length % 8) bits.push(0);

  var cw = [];
  for (var b = 0; b < bits.length; b += 8){
    var n = 0;
    for (var k = 0; k < 8; k++) n = (n << 1) | bits[b + k];
    cw.push(n);
  }
  /* Relleno alterno del estándar. */
  var relleno = [0xEC, 0x11], r = 0;
  while (cw.length < qrDatosDe(v)) cw.push(relleno[r++ % 2]);

  /* Bloques, corrección, y el ENTRELAZADO — que es la parte que se olvida y
   * produce un QR que se dibuja bien y no decodifica. */
  var t2 = QR_M[v], ecN = t2[1];
  var bloques = [], ecs = [], pos = 0;
  function trocear(cuantos, tam){
    for (var i = 0; i < cuantos; i++){
      var d = cw.slice(pos, pos + tam); pos += tam;
      bloques.push(d); ecs.push(qrEC(d, ecN));
    }
  }
  trocear(t2[2], t2[3]);
  trocear(t2[4], t2[5]);

  var fuera = [], max = Math.max(t2[3], t2[5]);
  for (var c = 0; c < max; c++)
    for (var bq = 0; bq < bloques.length; bq++)
      if (c < bloques[bq].length) fuera.push(bloques[bq][c]);
  for (var e = 0; e < ecN; e++)
    for (var bq2 = 0; bq2 < ecs.length; bq2++) fuera.push(ecs[bq2][e]);

  return { version: v, cw: fuera };
}

/* ── La matriz ───────────────────────────────────────────────────────────── */
function qrMatriz(txt){
  var r = qrCodewords(txt), v = r.version, n = 17 + 4 * v;
  var m = [], fijo = [];
  for (var i = 0; i < n; i++){
    m.push(new Array(n).fill(0));
    fijo.push(new Array(n).fill(false));
  }
  function poner(x, y, val){ m[y][x] = val ? 1 : 0; fijo[y][x] = true; }

  function buscador(ox, oy){
    for (var y = -1; y <= 7; y++) for (var x = -1; x <= 7; x++){
      var px = ox + x, py = oy + y;
      if (px < 0 || py < 0 || px >= n || py >= n) continue;
      var dentro = (x >= 0 && x <= 6 && (y === 0 || y === 6)) ||
                   (y >= 0 && y <= 6 && (x === 0 || x === 6)) ||
                   (x >= 2 && x <= 4 && y >= 2 && y <= 4);
      poner(px, py, dentro);
    }
  }
  buscador(0, 0); buscador(n - 7, 0); buscador(0, n - 7);

  /* Temporización */
  for (var i2 = 8; i2 < n - 8; i2++){
    poner(i2, 6, i2 % 2 === 0);
    poner(6, i2, i2 % 2 === 0);
  }

  /* Alineación — nunca encima de un buscador */
  var al = QR_ALIN[v];
  for (var a = 0; a < al.length; a++) for (var b = 0; b < al.length; b++){
    var cx = al[a], cy = al[b];
    if ((cx <= 8 && cy <= 8) || (cx <= 8 && cy >= n - 9) || (cx >= n - 9 && cy <= 8)) continue;
    for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++)
      poner(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }

  poner(8, n - 8, true);                          // el módulo oscuro, siempre

  /* Sitio reservado del formato (se escribe después, con la máscara elegida) */
  for (var k = 0; k <= 8; k++){
    if (k !== 6){ fijo[8][k] = true; fijo[k][8] = true; }
  }
  for (var k2 = 0; k2 < 8; k2++){
    fijo[8][n - 1 - k2] = true;
    fijo[n - 1 - k2][8] = true;
  }
  /* y el de la versión, a partir de la 7 */
  if (v >= 7){
    for (var y2 = 0; y2 < 6; y2++) for (var x2 = 0; x2 < 3; x2++){
      fijo[y2][n - 11 + x2] = true;
      fijo[n - 11 + x2][y2] = true;
    }
  }

  /* Los datos, en zigzag desde abajo a la derecha */
  var cw = r.cw, bit = 0, arriba = true;
  for (var col = n - 1; col > 0; col -= 2){
    if (col === 6) col--;                         // la columna de temporización
    for (var paso = 0; paso < n; paso++){
      var fila = arriba ? (n - 1 - paso) : paso;
      for (var c2 = 0; c2 < 2; c2++){
        var x3 = col - c2;
        if (fijo[fila][x3]) continue;
        var val = 0;
        if (bit < cw.length * 8){
          val = (cw[bit >> 3] >> (7 - (bit & 7))) & 1;
        }
        m[fila][x3] = val;
        bit++;
      }
    }
    arriba = !arriba;
  }
  return { m: m, n: n, v: v, fijo: fijo };
}

function qrMascara(k, x, y){
  switch (k){
    case 0: return (y + x) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (y + x) % 3 === 0;
    case 4: return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
    case 5: return ((y * x) % 2) + ((y * x) % 3) === 0;
    case 6: return (((y * x) % 2) + ((y * x) % 3)) % 2 === 0;
    default: return (((y + x) % 2) + ((y * x) % 3)) % 2 === 0;
  }
}

function qrPenaliza(m, n){
  var p = 0, i, j, run, oscuros = 0;
  function serie(get){
    for (i = 0; i < n; i++){
      run = 1;
      for (j = 1; j < n; j++){
        if (get(i, j) === get(i, j - 1)) run++;
        else { if (run >= 5) p += 3 + (run - 5); run = 1; }
      }
      if (run >= 5) p += 3 + (run - 5);
    }
  }
  serie(function(i2, j2){ return m[i2][j2]; });     // filas
  serie(function(i2, j2){ return m[j2][i2]; });     // columnas

  for (i = 0; i < n - 1; i++) for (j = 0; j < n - 1; j++){
    var s = m[i][j] + m[i][j+1] + m[i+1][j] + m[i+1][j+1];
    if (s === 0 || s === 4) p += 3;
  }

  var patron = [1,0,1,1,1,0,1];
  function busca(get){
    for (i = 0; i < n; i++) for (j = 0; j <= n - 7; j++){
      var ok = true;
      for (var k = 0; k < 7; k++) if (get(i, j + k) !== patron[k]) { ok = false; break; }
      if (!ok) continue;
      var antes = true, despues = true;
      for (var k2 = 1; k2 <= 4; k2++){
        if (j - k2 < 0 || get(i, j - k2) !== 0) { antes = false; break; }
      }
      for (var k3 = 0; k3 < 4; k3++){
        if (j + 7 + k3 >= n || get(i, j + 7 + k3) !== 0) { despues = false; break; }
      }
      if (antes || despues) p += 40;
    }
  }
  busca(function(i2, j2){ return m[i2][j2]; });
  busca(function(i2, j2){ return m[j2][i2]; });

  for (i = 0; i < n; i++) for (j = 0; j < n; j++) if (m[i][j]) oscuros++;
  var pct = oscuros * 100 / (n * n);
  p += Math.floor(Math.abs(pct - 50) / 5) * 10;
  return p;
}

function qrFormato(mascara){
  /* Nivel M = 00. BCH(15,5) y el XOR del estándar. */
  var datos = (0 << 3) | mascara, resto = datos << 10;
  for (var i = 4; i >= 0; i--){
    if (resto & (1 << (i + 10))) resto ^= 0x537 << i;
  }
  return ((datos << 10) | resto) ^ 0x5412;
}

function qrVersionBits(v){
  var resto = v << 12;
  for (var i = 5; i >= 0; i--){
    if (resto & (1 << (i + 12))) resto ^= 0x1F25 << i;
  }
  return (v << 12) | resto;
}

/** Texto → matriz de 0/1 lista para pintar. */
function qrGenerar(txt){
  var base = qrMatriz(txt), n = base.n, v = base.v, fijo = base.fijo;
  var mejor = null, mejorP = Infinity, mejorK = 0;

  for (var k = 0; k < 8; k++){
    var m = base.m.map(function(f){ return f.slice(); });
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++)
      if (!fijo[y][x] && qrMascara(k, x, y)) m[y][x] ^= 1;

    /* El formato tiene que estar puesto ANTES de puntuar: sus módulos cuentan
     * para las series y para la proporción de oscuros. Puntuar sin él elige
     * una máscara por un dibujo que no es el que se imprime. */
    var fmt = qrFormato(k);
    for (var i = 0; i < 15; i++){
      var bit = (fmt >> i) & 1;
      if (i < 6)       m[i][8] = bit;
      else if (i === 6) m[7][8] = bit;
      else if (i === 7) m[8][8] = bit;
      else if (i === 8) m[8][7] = bit;
      else              m[8][14 - i] = bit;

      if (i < 8) m[8][n - 1 - i] = bit;
      else       m[n - 15 + i][8] = bit;
    }
    m[n - 8][8] = 1;

    if (v >= 7){
      var vb = qrVersionBits(v);
      for (var b = 0; b < 18; b++){
        var bb = (vb >> b) & 1;
        m[Math.floor(b / 3)][n - 11 + (b % 3)] = bb;
        m[n - 11 + (b % 3)][Math.floor(b / 3)] = bb;
      }
    }

    var p = qrPenaliza(m, n);
    if (p < mejorP){ mejorP = p; mejor = m; mejorK = k; }
  }
  return { m: mejor, n: n, version: v, mascara: mejorK };
}

/** La matriz, como un SVG cuadrado que se escala solo. Sin imágenes, sin
 *  canvas y sin fuentes: una etiqueta térmica es blanco y negro puro, y un SVG
 *  de rectángulos sale nítido a cualquier tamaño de impresión. */
function qrSvg(txt, lado){
  var q = qrGenerar(txt), n = q.n, borde = 4;      // zona tranquila del estándar
  var total = n + borde * 2;
  var p = [];
  for (var y = 0; y < n; y++){
    var x = 0;
    while (x < n){
      if (!q.m[y][x]) { x++; continue; }
      var ancho = 0;
      while (x + ancho < n && q.m[y][x + ancho]) ancho++;
      p.push('M' + (x + borde) + ' ' + (y + borde) + 'h' + ancho + 'v1h-' + ancho + 'z');
      x += ancho;
    }
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + ' ' + total +
         '" width="' + lado + '" height="' + lado + '" shape-rendering="crispEdges">' +
         '<rect width="' + total + '" height="' + total + '" fill="#fff"/>' +
         '<path d="' + p.join('') + '" fill="#000"/></svg>';
}

if (typeof module !== 'undefined' && module.exports){
  module.exports = { qrGenerar: qrGenerar, qrSvg: qrSvg, qrCodewords: qrCodewords };
}
