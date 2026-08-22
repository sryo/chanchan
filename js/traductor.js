// ---------------------------------------------------------------- el traductor
// la vuelta larga es el mcm de las líneas, o el mayor divisor que entre en el tope: la cinta tiene que cerrar
const VUELTAS_CINTA = 16;
const mcd = (a, b) => b ? mcd(b, a % b) : a;
const mcm = (a, b) => a / mcd(a, b) * b;
function acotarVueltas(v) {
  if (v <= VUELTAS_CINTA) return v;
  for (let d = VUELTAS_CINTA; d > 1; d--) if (v % d === 0) return d;
  return 1;
}

// los tokens pintan el editor y arman el código
function traducirLinea(texto, nro) {
  const tk = [], errs = [];
  let roto = false;
  const marcar = (i, len, cls, dato) => { const t = { i, len, cls, ...dato }; tk.push(t); return t; };
  const error = (i, len, msg) => { marcar(i, len, 'mal', { tipo: 'mal' }); errs.push({ nro, msg }); };

  if (!texto.trim()) return { tipo: 'vacia', tk, errs };

  const ws = palabras(texto, 0);
  const sinArticulo = ws[0] && /^(el|la|los|las)$/i.test(ws[0].w) ? ws.slice(1) : ws;

  // ---- * una nota
  // va primero: «* la estrofa:» no es una sección; puede llevar «@la base»
  if (texto.trimStart().startsWith('*')) {
    const ast = texto.indexOf('*'), arroba = texto.indexOf('@', ast);
    const nombre = arroba < 0 ? '' : texto.slice(arroba + 1).replace(/[.,;:!?\s]+$/, '').trim();
    if (!nombre) {
      marcar(ast, texto.length - ast, 'comentario', { tipo: 'comentario' });
      return { tipo: 'comentario', tk, errs };
    }
    marcar(ast, arroba - ast, 'comentario', { tipo: 'comentario' });
    marcar(arroba, 1, 'estructura');
    const desde = texto.indexOf(nombre, arroba + 1), fin = desde + nombre.length;
    marcar(desde, nombre.length, 'enlace', { tipo: 'enlace', nombre });
    if (fin < texto.length) marcar(fin, texto.length - fin, 'comentario', { tipo: 'comentario' });
    return { tipo: 'comentario', nombre, tk, errs };
  }

  // ---- la estrofa:
  const sec = leerSeccion(texto);
  if (sec) {
    if (sec.falla) {
      error(0, texto.length, sec.falla === 'sinNombre'
        ? 'a la sección le falta el nombre: «la estrofa:».'
        : sec.falla === 'dura'
          ? 'el largo de la sección va «la estrofa dura ocho vueltas:», con un número de 1 a ' + VUELTAS_FORMA + '.'
          // los acentos entran: norm() los saca antes de la prueba
          : 'el nombre de la sección es una palabra sola, sin espacios: «' + sec.escrito + '» no entra.');
      return { tipo: 'mala', tk, errs };
    }
    for (const x of ws) {
      const crudo = x.w.replace(/:$/, '');
      if (norm(crudo) !== sec.nombre) { marcar(x.i, x.w.length, 'estructura'); continue; }
      marcar(x.i, crudo.length, 'sujeto', { tipo: 'seccion', nombre: sec.nombre, escrito: sec.escrito });
      if (crudo !== x.w) marcar(x.i + crudo.length, 1, 'estructura');
    }
    return { tipo: 'seccion', nombre: sec.nombre, escrito: sec.escrito, vueltas: sec.vueltas, tk, errs };
  }

  // ---- @la base
  // un signo y no una palabra, ver REGLAS.md
  const arroba = texto.indexOf('@');
  if (arroba >= 0 && !texto.slice(0, arroba).trim()) {
    marcar(arroba, 1, 'estructura');
    const nombre = texto.slice(arroba + 1).trim();
    if (!nombre) {
      error(arroba, 1, 'después del «@» va el nombre de otro tema: «@la base».');
      return { tipo: 'mala', tk, errs };
    }
    marcar(texto.indexOf(nombre, arroba + 1), nombre.length, 'enlace', { tipo: 'enlace', nombre });
    return { tipo: 'enlace', nombre, tk, errs };
  }

  // ---- va estrofa estrofa estribillo
  const forma = leerForma(texto);
  if (forma) {
    // cada nombre es su propio token, para el ▾
    for (const x of ws) {
      const suelta = norm(x.w);
      if (/^(la|el|banda|tema|cancion|canción|va)$/i.test(suelta)) marcar(x.i, x.w.length, 'estructura');
      else marcar(x.i, x.w.length, 'sujeto', { tipo: 'forma', nombre: suelta });
    }
    return { tipo: 'forma', nro, nombres: forma.nombres, tk, errs };
  }

  // ---- va a 92
  if (esTempo(texto)) {
    const m = texto.match(/(\d+(?:[.,]\d+)?)/);
    if (!/\bva a\b/.test(norm(texto)) || !m) {
      error(0, texto.length, 'para el tempo escribí «va a 92».');
      return { tipo: 'mala', tk, errs };
    }
    // sólo el número es token con menú: toda la frase no dejaría dónde poner el cursor
    if (m.index > 0) marcar(0, m.index, 'estructura');
    marcar(m.index, m[1].length, 'estructura', { tipo: 'tempo' });
    const finNum = m.index + m[1].length;
    if (finNum < texto.length) marcar(finNum, texto.length - finNum, 'estructura');
    // un cero deja el reloj de strudel parado sin decir por qué
    const bpm = parseFloat(m[1].replace(',', '.'));
    if (!(bpm >= TEMPO_MIN && bpm <= TEMPO_MAX)) {
      error(m.index, m[1].length, 'el tempo va entre ' + TEMPO_MIN + ' y ' + TEMPO_MAX + ' tiempos por minuto.');
      return { tipo: 'mala', tk, errs };
    }
    // «en tres»: cuántos tiempos tiene una vuelta; sin nada, cuatro
    let tiempos = 4;
    const cola = texto.slice(finNum);
    if (cola.trim()) {
      const en = norm(cola).match(/^en (\S+)$/);
      tiempos = en ? cuantasVueltas(en[1]) : 0;
      if (!(tiempos >= 2 && tiempos <= TIEMPOS_MAX)) {
        error(finNum, cola.length, 'después del número va el compás, «va a 120 en tres», con un número de 2 a ' + TIEMPOS_MAX + ', o nada.');
        return { tipo: 'mala', tk, errs };
      }
      tk.pop();
      const desde = finNum + (cola.length - cola.trimStart().length);
      marcar(finNum, desde - finNum, 'estructura');
      marcar(desde, cola.trim().length, 'estructura', { tipo: 'compas', tiempos });
    }
    return { tipo: 'tempo', bpm, tiempos, tk, errs };
  }

  // ---- la <parte> toca <pasos>[, <modificador>]*
  const iVerbo = ws.findIndex(x => /^(toca|tocan)$/i.test(x.w));
  if (iVerbo < 0) {
    error(0, texto.length, 'no entiendo la línea. Va «la bata toca pum - pa -» o «va a 92».');
    return { tipo: 'mala', tk, errs };
  }
  // el nombre entero es un solo token, para que el menú lo cambie de una; el artículo va aparte y pesa menos
  const iNombre = ws.length - sinArticulo.length;
  for (const x of ws.slice(0, iNombre)) marcar(x.i, x.w.length, 'articulo');
  let sujetoTk = null;
  if (iNombre < iVerbo) {
    const a = ws[iNombre], z = ws[iVerbo - 1];
    sujetoTk = marcar(a.i, z.i + z.w.length - a.i, 'sujeto', { tipo: 'instrumento' });
  }
  marcar(ws[iVerbo].i, ws[iVerbo].w.length, 'verbo');

  const desde = ws[iVerbo].i + ws[iVerbo].w.length;
  const resto = texto.slice(desde);

  const clausulas = [];
  let pos = 0;
  for (const trozo of resto.split(',')) {
    clausulas.push({ txt: trozo, i: desde + pos });
    pos += trozo.length + 1;
  }

  const nombre = ws.slice(ws.length - sinArticulo.length, iVerbo).map(x => x.w).join(' ') || 'parte';

  // ---- los pasos
  // la barra no es un paso: corta, y cada tramo reparte los suyos
  const pasos = [], lugares = [], pasoTk = [], cortes = [], acentos = [];
  let modo = null, primerGolpe = null;
  const pw = palabras(clausulas[0].txt, clausulas[0].i);
  for (let k = 0; k < pw.length; k++) {
    // «pum!»: el paso va acentuado; el signo es parte de la palabra
    const acento = /!$/.test(pw[k].w);
    const w = norm(pw[k].w).replace(/!$/, '');
    if (acento && !(SONIDOS[w] || NOTAS[w])) { error(pw[k].i, pw[k].w.length, 'el «!» va pegado a un golpe o a una nota: «pum!».'); continue; }
    if (w === '|') {
      marcar(pw[k].i, pw[k].w.length, 'estructura');
      cortes.push(pasos.length);
    } else if (w === '-') {
      pasoTk.push(marcar(pw[k].i, pw[k].w.length, 'silencio', { tipo: 'paso' }));
      pasos.push('-'); lugares.push(null);
    } else if (w === '_') {
      pasoTk.push(marcar(pw[k].i, pw[k].w.length, 'silencio', { tipo: 'paso' }));
      pasos.push('_'); lugares.push(null);
    } else if (SONIDOS[w]) {
      pasoTk.push(marcar(pw[k].i, pw[k].w.length, 'sonido', { tipo: 'paso', alto: ALTO_GOLPE[w] }));
      if (!primerGolpe) primerGolpe = w;
      if (modo === 'nota') { roto = true; error(pw[k].i, pw[k].w.length, 'no mezclés golpes con notas en la misma línea: hacé dos líneas.'); }
      pasos.push(SONIDOS[w][0]); lugares.push({ i: pw[k].i, len: pw[k].w.length }); acentos[pasos.length - 1] = acento;
      modo = 'sonido';
    } else if (NOTAS[w]) {
      let oct = OCTAVA_BASE, alt = '', acorde = '', fin = pw[k].i + pw[k].w.length;
      let altN = '', octN = '';
      let k2 = k + 1;
      while (k2 < pw.length) {
        const n2 = norm(pw[k2].w);
        // «menor séptima» antes que «menor»: el par de palabras le gana a la suelta
        const n3 = k2 + 1 < pw.length ? n2 + ' ' + norm(pw[k2 + 1].w) : '';
        if (n3 && ACORDE[n3]) { acorde = n3; k2++; }
        else if (ALTERACIONES[n2]) { alt = ALTERACIONES[n2]; altN = n2; }
        else if (ACORDE[n2]) { acorde = n2; }
        else if (OCTAVAS[n2]) { oct = OCTAVAS[n2]; octN = n2; }
        else if (n2 === 'muy' && k2 + 1 < pw.length && OCTAVAS['muy ' + norm(pw[k2+1].w)]) {
          octN = 'muy ' + norm(pw[k2+1].w); oct = OCTAVAS[octN]; k2++;
        } else break;
        fin = pw[k2].i + pw[k2].w.length;
        k2++;
      }
      // raizLen parte el token para pintar la nota distinto de lo que la acompaña
      pasoTk.push(marcar(pw[k].i, fin - pw[k].i, 'nota',
        { tipo: 'nota', raiz: w, altN, octN, acorde, alto: altoDeOctava(oct), raizLen: pw[k].w.length }));
      lugares.push({ i: pw[k].i, len: fin - pw[k].i });
      if (acorde) {
        const raiz = GRADOS[NOTAS[w]] + (alt === '#' ? 1 : alt === 'b' ? -1 : 0);
        pasos.push('[' + ACORDE[acorde].map(iv => nombreNota(raiz + iv, oct)).join(',') + ']');
      } else {
        pasos.push(NOTAS[w] + alt + oct);
      }
      if (modo === 'sonido') { roto = true; error(pw[k].i, fin - pw[k].i, 'no mezclés golpes con notas en la misma línea: hacé dos líneas.'); }
      acentos[pasos.length - 1] = acento;
      modo = 'nota';
      k = k2 - 1;
    } else if (w === '.') {
      error(pw[k].i, pw[k].w.length, 'el silencio es «-».');
    } else if (GOLPES_VIEJOS[w]) {
      error(pw[k].i, pw[k].w.length, '«' + w + '» ahora se escribe «' + GOLPES_VIEJOS[w] + '».');
    } else {
      const s = parecida(pw[k].w);
      error(pw[k].i, pw[k].w.length, 'no conozco «' + pw[k].w + '»' + (s ? '. ¿Será «' + s + '»?' : '. Pasá el mouse por encima y tocá el ▾.'));
    }
  }
  // recién acá se sabe si la línea es de golpes o de notas
  for (const t of pasoTk) t.modo = modo;
  if (sujetoTk) sujetoTk.modo = modo;
  if (!pasos.length) {
    // el token no toma el espacio de después del verbo; si no el ▾ pega «tocapum»
    const sobra = clausulas[0].txt.length - clausulas[0].txt.trimStart().length;
    const desde = clausulas[0].i + sobra;
    error(desde, Math.max(1, clausulas[0].txt.trim().length), 'falta qué tocar: «' + nombre + ' toca pum - pa -».');
    return { tipo: 'mala', tk, errs };
  }

  // ---- los modificadores
  // las que dicen quién: «en pizzicato», «en una 808»
  const quiénTk = [];
  let cola = '', instrumento = null, callado = false, maquina = MAQUINA;
  // los tres períodos que forman el de la línea; «al doble» no cuenta
  let lento = 1, vueltasMascara = 1, vueltasMod = 1;
  for (const c of clausulas.slice(1)) {
    const n = norm(c.txt);
    if (!n) continue;
    const cw = palabras(c.txt, c.i);
    const rango = [cw[0].i, cw[cw.length-1].i + cw[cw.length-1].w.length - cw[0].i];
    const inst = n.match(/^en (?:un |una |el |la |los |las )?(.+)$/);
    const caja = inst && modo === 'sonido' ? maquinaDe(inst[1]) : null;
    if (caja) {
      maquina = caja.banco;
      quiénTk.push(marcar(rango[0], rango[1], 'mod', { tipo: 'instrumento', conEn: true, modo: 'sonido' }));
      continue;
    }
    if (inst && instrumentoDe(inst[1])) {
      instrumento = instrumentoDe(inst[1]);
      quiénTk.push(marcar(rango[0], rango[1], 'mod', { tipo: 'instrumento', conEn: true }));
      continue;
    }
    // el arreglo, el euclidiano y las que envuelven llevan algo adentro: van antes de la tabla
    const arreglo = leerArreglo(c.txt);
    if (!arreglo && /\bvueltas?\s+si\b/.test(n)) {
      error(rango[0], rango[1], 'el arreglo va «cuatro vueltas sí y cuatro no», ' +
        'con números de 1 a ' + (VUELTAS_MAX - 1) + ' que sumen ' + VUELTAS_MAX + ' o menos.');
      continue;
    }
    if (arreglo) {
      cola += mascaraDe(arreglo.n, arreglo.q);
      vueltasMascara = arreglo.n + arreglo.q;
      marcar(rango[0], rango[1], 'mod', { tipo: 'arreglo' });
      continue;
    }
    const euclid = leerEuclides(c.txt);
    if (euclid) {
      cola += euclid.codigo;
      marcar(rango[0], rango[1], 'mod', { tipo: 'euclides', n: euclid.n, m: euclid.m });
      continue;
    }
    const figura = leerFigura(c.txt);
    if (figura) {
      cola += figura.codigo;
      marcar(rango[0], rango[1], 'mod', { tipo: 'figura' });
      continue;
    }
    const envuelve = leerCada(c.txt) || leerVeces(c.txt);
    if (envuelve) {
      if (envuelve.falla === 'numero') {
        error(rango[0], rango[1], 'el «cada» va «cada cuatro vueltas al doble», ' +
          'con un número de 2 a ' + VUELTAS_MAX + '.');
        continue;
      }
      // «callado» y «una por vuelta» existen pero no son código: el error lo dice
      if (envuelve.falla === 'centinela') {
        error(rango[0], rango[1], '«' + envuelve.dentro + '» no puede ir adentro de ' +
          'una frase que la aplique de a ratos: va sola, en su propia cláusula.');
        continue;
      }
      if (envuelve.falla === 'dentro') {
        const s = envuelve.dentro && parecida(envuelve.dentro);
        error(rango[0], rango[1], envuelve.dentro
          ? 'no conozco «' + envuelve.dentro + '»' + (s ? '. ¿Será «' + s + '»?' : '.')
          : 'falta qué hacer: «' + c.txt.trim() + ' al doble».');
        continue;
      }
      cola += envuelve.codigo;
      vueltasMod = mcm(mcm(vueltasMod, envuelve.vueltas), envuelve.adentro);
      marcar(rango[0], rango[1], 'mod', { tipo: 'veces' });
      continue;
    }
    if (n in RETIRADOS) {
      error(rango[0], rango[1], '«' + c.txt.trim() + '» ya no existe' + (RETIRADOS[n] ? ': ' + RETIRADOS[n] : '.'));
      continue;
    }
    const mod = modificadorDe(n);
    if (mod) {
      if (mod[1].startsWith('.transpose') && modo === 'sonido') {
        error(rango[0], rango[1], '«' + c.txt.trim() + '» sólo sirve con notas: los golpes no tienen altura.');
        continue;
      }
      if (mod[1] === 'mute') callado = true;   // se saca del stack, no gasta CPU
      else cola += mod[1];
      // sólo un .slow() entero: «que se abre» lleva uno adentro del filtro
      const frena = /^\.slow\((\d+)\)$/.exec(mod[1]);
      if (frena) lento *= +frena[1];
      if (mod[3]) vueltasMod = mcm(vueltasMod, mod[3]);
      marcar(rango[0], rango[1], 'mod', { tipo: 'modificador' });
      continue;
    }
    const s = parecida(c.txt);
    error(rango[0], rango[1], 'no conozco «' + c.txt.trim() + '»' + (s ? '. ¿Será «' + s + '»?' : '. Pasá el mouse por encima y tocá el ▾.'));
  }

  // un golpe que la caja no tiene sonaría mudo sin decir nada; el token se pinta, la línea sigue
  const caja = modo === 'sonido' && cajaDe(maquina), avisados = new Set();
  if (caja) for (const t of pasoTk) {
    const w = norm(texto.substr(t.i, t.len));
    if (SONIDOS[w] && !caja.piezas.has(SONIDOS[w][0])) {
      t.cls = 'mal';
      if (!avisados.has(w)) errs.push({ nro, msg: 'la ' + caja.nombre + ' no tiene ' + SONIDOS[w][1] + ': «' + w + '» ahí no suena.' });
      avisados.add(w);
    }
  }
  if (modo === 'sonido' && instrumento)
    errs.push({ nro, msg: 'los golpes ya traen su sonido: «en ' + instrumento.nombre + '» sólo sirve con notas.' });

  if (roto) return { tipo: 'mala', tk, errs };
  // un compás vacío es silencio
  // «_» no cruza la barra en strudel: el que abre un compás repite la nota que venía
  const porCompases = lista => {
    const out = [];
    let desde = 0;
    for (const c of cortes.concat([lista.length])) {
      const compas = lista.slice(desde, c);
      if (compas[0] === '_')
        compas[0] = lista.slice(0, desde).reverse().find(x => x !== '-' && x !== '_') || '-';
      out.push(compas);
      desde = c;
    }
    return '<' + out.map(c => '[' + (c.join(' ') || '-') + ']').join(' ') + '>';
  };
  const juntar = lista => cortes.length ? porCompases(lista) : lista.join(' ');
  const patron = juntar(pasos);
  // velocity y no gain: multiplica, así «bajito» y el acento conviven
  if (acentos.some(Boolean))
    cola = '.velocity("' + juntar(pasos.map((x, k) => (x === '-' || x === '_') ? x : acentos[k] ? '1.4' : '1')) + '")' + cola;
  let codigo;
  if (modo === 'nota') {
    const ins = instrumento || instrumentoDe(nombre) || INSTRUMENTOS[INSTRUMENTO_POR_DEFECTO];
    codigo = 'note("' + patron + '").sound("' + ins.sonido + '")' + ins.cola + cola;
  } else {
    codigo = 's("' + patron + '").bank("' + maquina + '")' + cola;
  }
  // el mismo patrón con el número de paso, para preguntarle a strudel cuál suena
  const espejo = pasos.map((x, k) => (x === '-' || x === '_') ? x : String(k));
  const cotejo = 'n("' + juntar(espejo) + '")' + cola;
  const voz = modo === 'sonido' ? primerGolpe
    : (instrumento || instrumentoDe(nombre) || INSTRUMENTOS[INSTRUMENTO_POR_DEFECTO]).nombre;
  if (sujetoTk) sujetoTk.voz = voz;
  for (const t of pasoTk) t.voz = voz;
  for (const t of quiénTk) t.voz = voz;
  const largo = cortes.length ? cortes.length + 1 : 1;
  const vueltas = mcm(mcm(largo * lento, vueltasMascara), vueltasMod);
  return { tipo: 'parte', nro, nombre, voz, codigo, cotejo, lugares, callado, vueltas, tk, errs };
}

function traducir(fuente) {
  const lineas = fuente.split('\n');
  const partes = [], renglones = [], errores = [], marcas = [], calladas = new Set(), enlaces = [];
  const secciones = new Map();
  let bpm = 90, tiempos = 4, abierta = null, forma = null, nroForma = 0;
  lineas.forEach((l, n) => {
    const r = traducirLinea(l, n + 1);
    marcas.push(r.tk);
    errores.push(...r.errs);
    if (r.tipo === 'tempo') {
      if (abierta) { abierta.bpm = r.bpm; abierta.tiempos = r.tiempos; }
      else { bpm = r.bpm; tiempos = r.tiempos; }
    }
    if (r.tipo === 'seccion') {
      // reabrir una sección le suma líneas en vez de pisarla
      abierta = secciones.get(r.nombre) ||
        { nombre: r.nombre, escrito: r.escrito, vueltas: null, bpm: null, tiempos: null, suyas: [] };
      if (r.vueltas) abierta.vueltas = r.vueltas;
      secciones.set(r.nombre, abierta);
    }
    if (r.tipo === 'forma') { forma = r.nombres; nroForma = r.nro; }
    if (r.nombre && (r.tipo === 'enlace' || r.tipo === 'comentario')) enlaces.push(r.nombre);
    if (r.tipo === 'parte') {
      // las líneas de antes de la primera sección suenan en todas
      r.seccion = abierta && abierta.nombre;
      renglones.push(r);
      // las calladas también miden: callar el bajo no achica la estrofa
      if (abierta) abierta.suyas.push(r);
      if (r.callado) calladas.add(n);
      else partes.push(r);
    }
  });
  // ---- la forma
  const escritas = [...secciones.keys()];
  // sin secciones el error es uno solo, no uno por nombre
  if (forma && !escritas.length)
    errores.push({ nro: nroForma, msg: 'no hay ninguna sección escrita. ' +
      'Una sección se abre con una línea que termina en dos puntos: «la estrofa:».' });
  else {
    const comoSeEscribe = n => secciones.get(n).escrito;
    const cuálesHay = escritas.length === 1
      ? 'Está ' + comoSeEscribe(escritas[0]) + '.'
      : 'Están ' + escritas.map(comoSeEscribe).join(', ') + '.';
    for (const nom of new Set(forma || [])) {
      const sec = secciones.get(nom);
      if (!sec)
        errores.push({ nro: nroForma,
          msg: 'no hay ninguna sección que se llame «' + nom + '». ' + cuálesHay });
      // una sección sin líneas se queda afuera de la forma, y se avisa una vez por nombre
      else if (!sec.suyas.length)
        errores.push({ nro: nroForma, msg: '«' + sec.escrito + '» no tiene ninguna ' +
          'línea escrita, así que no suena. Las líneas de una sección van debajo de sus dos puntos.' });
    }
  }
  // recién con la hoja entera se sabe qué secciones hay; cambia el color y no el
  // tipo, así el ▾ sigue siendo el de la forma
  if (nroForma) for (const t of marcas[nroForma - 1])
    if (t.tipo === 'forma' && !secciones.has(t.nombre)) t.cls = 'mal';
  const orden = (forma || escritas).filter(nom => secciones.get(nom)?.suyas.length);
  const largoDe = sec => Math.min(VUELTAS_FORMA,
    sec.vueltas || sec.suyas.reduce((a, r) => mcm(a, r.vueltas), 1));
  const tramos = orden.map(nom => {
    const sec = secciones.get(nom);
    return { nom, escrito: sec.escrito, largo: largoDe(sec) };
  });
  const total = tramos.reduce((a, t) => a + t.largo, 0);
  // dónde cambia el pulso, en vueltas: la lee el reloj mientras suena; ver REGLAS.md, el tempo es del reloj
  const tempos = [];
  let cae = 0;
  for (const t of tramos) {
    const sec = secciones.get(t.nom), suyo = { desde: cae, bpm: sec.bpm || bpm, tiempos: sec.tiempos || tiempos };
    const ultimo = tempos[tempos.length - 1];
    if (!ultimo || ultimo.bpm !== suyo.bpm || ultimo.tiempos !== suyo.tiempos) tempos.push(suyo);
    cae += t.largo;
  }

  for (const r of renglones) r.cotejo = enLaForma(r.cotejo, r.seccion, tramos);
  // con forma no se acota: el divisor de una canción es media canción
  const vueltas = tramos.length ? Math.max(1, total)
    : acotarVueltas(renglones.reduce((a, r) => mcm(a, r.vueltas), 1));
  const arranca = tempos.length ? tempos[0] : { bpm, tiempos };
  return { codigo: armarCodigo(partes, tramos, arranca.bpm, arranca.tiempos), errores, marcas, partes, renglones, calladas, enlaces,
           bpm: arranca.bpm, tiempos: arranca.tiempos, vueltas, tramos, tempos: tempos.length > 1 ? tempos : [] };
}

// un arrange por línea y no uno con stacks adentro: la cinta dibuja una franja por línea
const enLaForma = (cod, seccion, tramos) => !tramos.length || !seccion ? cod
  : 'arrange(' + tramos.map(t =>
      '[' + t.largo + ', ' + (t.nom === seccion ? cod : 'silence') + ']').join(', ') + ')';

// un bus de efectos por nombre y no por línea: la misma viola en dos secciones es
// una sola. aparte de traducir() porque el editor lo rearma sin lo que strudel rechazó
function armarCodigo(partes, tramos, bpm, tiempos = 4) {
  if (!partes.length) return '';
  const buses = [...new Set(partes.map(p => p.nombre))];
  const conBus = partes.map(p =>
    enLaForma(p.codigo, p.seccion, tramos) + '.orbit(' + buses.indexOf(p.nombre) + ')');
  // el nombre va en un comentario del código: estos tres lo cortan igual que un enter
  return 'setcpm(' + bpm + '/' + tiempos + ')\n' + (partes.length === 1
    ? conBus[0]
    : 'stack(\n' + conBus.map((c, i) => '  ' + c + ', // ' + partes[i].nombre.replace(/[\r\u2028\u2029]/g, ' ') +
        (partes[i].seccion ? ' · ' + partes[i].seccion : '')).join('\n') + '\n)');
}
