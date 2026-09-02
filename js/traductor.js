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

const MEZCLA = 'no mezclés golpes con notas en la misma línea: hacé dos líneas.';

// los tokens pintan el editor y arman el código
function traducirLinea(texto, nro) {
  const tk = [], errs = [];
  let roto = false;
  const marcar = (i, len, cls, dato) => { const t = { i, len, cls, ...dato }; tk.push(t); return t; };
  const error = (i, len, msg, dato) => { marcar(i, len, 'mal', { tipo: 'mal', ...dato }); errs.push({ nro, msg }); };

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
      marcar(desde, cola.trim().length, 'estructura', { tipo: 'compas' });
    }
    return { tipo: 'tempo', bpm, tiempos, tk, errs };
  }

  // ---- la <parte> toca <pasos>[, <modificador>]*
  const iVerbo = ws.findIndex(x => VERBO.test(x.w));
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

  const nombre = ws.slice(iNombre, iVerbo).map(x => x.w).join(' ') || 'parte';

  // ---- los pasos
  // la barra no es un paso: corta, y cada tramo reparte los suyos
  const pasos = [], lugares = [], pasoTk = [], cortes = [], acentos = [];
  let modo = null, primerGolpe = null, desconocidos = 0;
  const pw = palabras(clausulas[0].txt, clausulas[0].i);
  // lo que puede seguir a una nota: qué campo llena, cuántas palabras ocupa, hasta dónde llega y si trae el «!»
  const sufijoDeNota = k => {
    const pelada = j => norm(pw[j].w).replace(/!$/, '');
    const una = pelada(k), dos = k + 1 < pw.length ? una + ' ' + pelada(k + 1) : '';
    const con = (campo, valor, largo) => ({ campo, valor, largo,
      fin: pw[k + largo - 1].i + pw[k + largo - 1].w.length,
      acento: pw.slice(k, k + largo).some(x => /!$/.test(x.w)) });
    if (dos && ACORDE[dos]) return con('acorde', dos, 2);
    if (dos && OCTAVAS[dos]) return con('octN', dos, 2);
    if (ALTERACIONES[una]) return con('altN', una, 1);
    if (ACORDE[una]) return con('acorde', una, 1);
    if (OCTAVAS[una]) return con('octN', una, 1);
    return null;
  };
  const DICE = { altN: 'si va sostenida o bemol', octN: 'la altura', acorde: 'el acorde' };
  let notaAntes = null;    // la última nota leída y dónde terminó, para el sufijo que sobra
  for (let k = 0; k < pw.length; k++) {
    // «pum!»: el paso va acentuado; el signo es parte de la palabra
    const acento = /!$/.test(pw[k].w);
    const w = norm(pw[k].w).replace(/!$/, '');
    const sufijo = sufijoDeNota(k);
    if (acento && !(SONIDOS[w] || NOTAS[w] || sufijo)) { error(pw[k].i, pw[k].w.length, 'el «!» va pegado a un golpe o a una nota: «pum!».'); continue; }
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
      if (modo === 'nota') { roto = true; error(pw[k].i, pw[k].w.length, MEZCLA); }
      pasos.push(SONIDOS[w][0]); lugares.push({ i: pw[k].i, len: pw[k].w.length }); acentos[pasos.length - 1] = acento;
      modo = 'sonido';
    } else if (NOTAS[w]) {
      const d = { altN: '', octN: '', acorde: '' };
      let fin = pw[k].i + pw[k].w.length, k2 = k + 1, acentoNota = acento;
      // cada campo una vez: el repetido cierra el grupo y se marca en la vuelta que sigue. «do mayor!» también lo cierra
      for (let s; k2 < pw.length && (s = sufijoDeNota(k2)) && !d[s.campo]; k2 += s.largo) {
        d[s.campo] = s.valor;
        fin = s.fin;
        if (s.acento) { acentoNota = true; k2 += s.largo; break; }
      }
      const oct = d.octN ? OCTAVAS[d.octN] : OCTAVA_BASE, alt = ALTERACIONES[d.altN] || '';
      // raizLen parte el token para pintar la nota distinto de lo que la acompaña
      pasoTk.push(marcar(pw[k].i, fin - pw[k].i, 'nota',
        { tipo: 'nota', raiz: w, ...d, alto: altoDeOctava(oct), raizLen: pw[k].w.length }));
      lugares.push({ i: pw[k].i, len: fin - pw[k].i });
      if (d.acorde) {
        const raiz = GRADOS[NOTAS[w]] + (alt === '#' ? 1 : alt === 'b' ? -1 : 0);
        pasos.push('[' + ACORDE[d.acorde].map(iv => nombreNota(raiz + iv, oct)).join(',') + ']');
      } else {
        pasos.push(NOTAS[w] + alt + oct);
      }
      if (modo === 'sonido') { roto = true; error(pw[k].i, fin - pw[k].i, MEZCLA); }
      acentos[pasos.length - 1] = acentoNota;
      modo = 'nota';
      notaAntes = { hasta: k2, escrito: texto.slice(pw[k].i, fin) };
      k = k2 - 1;
    } else if (sufijo) {
      // «do sostenido bemol», «pum mayor»: va después de una nota, y de una que no lo tenga
      const escrito = texto.slice(pw[k].i, sufijo.fin);
      error(pw[k].i, sufijo.fin - pw[k].i, notaAntes && notaAntes.hasta === k
        ? '«' + escrito + '» sobra: «' + notaAntes.escrito + '» ya dice ' + DICE[sufijo.campo] + '.'
        : '«' + escrito + '» va después de una nota: «do ' + escrito + '».');
      k += sufijo.largo - 1;
    } else {
      // lo que no se entiende suena como silencio: el error ya está, y los otros pasos no se corren
      if (w === '.') error(pw[k].i, pw[k].w.length, 'el silencio es «-».');
      else if (GOLPES_VIEJOS[w]) error(pw[k].i, pw[k].w.length, '«' + w + '» ahora se escribe «' + GOLPES_VIEJOS[w] + '».');
      else {
        const s = parecida(pw[k].w);
        error(pw[k].i, pw[k].w.length, 'no conozco «' + pw[k].w + '»' + (s ? '. ¿Será «' + s + '»?' : '. Pasá el mouse por encima y tocá el ▾.'));
      }
      pasos.push('-'); lugares.push(null); desconocidos++;
    }
  }
  // recién acá se sabe si la línea es de golpes o de notas
  for (const t of pasoTk) t.modo = modo;
  if (sujetoTk) sujetoTk.modo = modo;
  if (!pasos.length) {
    // el token no toma el espacio de después del verbo; si no el ▾ pega «tocapum»
    const sobra = clausulas[0].txt.length - clausulas[0].txt.trimStart().length;
    const desde = clausulas[0].i + sobra;
    // el ▾ ofrece lo que puede ir ahí, y para eso tiene que saber de quién es el renglón
    error(desde, Math.max(1, clausulas[0].txt.trim().length), 'falta qué tocar: «' + nombre + ' toca pum - pa -».',
      { falta: 'paso', quien: nombre });
    return { tipo: 'mala', tk, errs };
  }
  // sin ningún paso entendido no hay qué tocar
  if (!modo && desconocidos) return { tipo: 'mala', tk, errs };

  // ---- los modificadores
  // las que dicen quién: «en pizzicato», «en una 808»
  const quiénTk = [];
  let cola = '', instrumento = null, callado = false, maquina = MAQUINA;
  // los tres períodos que forman el de la línea; «al doble» no cuenta
  let lento = 1, vueltasMascara = 1, vueltasMod = 1;
  // dos cláusulas sobre el mismo parámetro: la segunda no pisa a la primera en silencio
  const dicho = new Map();
  const sePisan = (clave, c, rango) => {
    const antes = dicho.get(clave);
    if (antes) error(rango[0], rango[1], '«' + c.txt.trim() + '» y «' + antes + '» se pisan: dejá una sola.');
    else dicho.set(clave, c.txt.trim());
    return !!antes;
  };
  for (const c of clausulas.slice(1)) {
    const n = norm(c.txt);
    if (!n) continue;
    const cw = palabras(c.txt, c.i);
    const rango = [cw[0].i, cw[cw.length-1].i + cw[cw.length-1].w.length - cw[0].i];
    const inst = n.match(/^en (?:un |una |el |la |los |las )?(.+)$/);
    const caja = inst && modo === 'sonido' ? maquinaDe(inst[1]) : null;
    if (caja) {
      if (sePisan('quien', c, rango)) continue;
      maquina = caja.banco;
      quiénTk.push(marcar(rango[0], rango[1], 'mod', { tipo: 'instrumento', conEn: true, modo: 'sonido' }));
      continue;
    }
    if (inst && instrumentoDe(inst[1])) {
      if (sePisan('quien', c, rango)) continue;
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
      if (sePisan('mask', c, rango)) continue;
      cola += mascaraDe(arreglo.n, arreglo.q);
      vueltasMascara = arreglo.n + arreglo.q;
      marcar(rango[0], rango[1], 'mod', { tipo: 'arreglo' });
      continue;
    }
    const euclid = leerEuclides(c.txt);
    if (euclid) {
      if (sePisan('struct', c, rango)) continue;
      cola += euclid.codigo;
      marcar(rango[0], rango[1], 'mod', { tipo: 'euclides' });
      continue;
    }
    const figura = leerFigura(c.txt);
    if (figura) {
      if (sePisan('struct', c, rango)) continue;
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
      // «callado» existe pero no es código: el error lo dice
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
      vueltasMod = mcm(vueltasMod, envuelve.vueltas);
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
      const pisa = mod[1].match(/^\.(\w+)/);
      if (pisa && PISAN.has(pisa[1]) && sePisan(pisa[1], c, rango)) continue;
      if (mod[1] === 'mute') callado = true;   // se saca del stack, no gasta CPU
      else cola += mod[1];
      const frena = /^\.slow\((\d+)\)$/.exec(mod[1]);
      if (frena) lento *= +frena[1];
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
  const ins = instrumento || instrumentoDe(nombre) || INSTRUMENTOS[INSTRUMENTO_POR_DEFECTO];
  const codigo = modo === 'nota'
    ? 'note("' + patron + '").sound("' + ins.sonido + '")' + ins.cola + cola
    : 's("' + patron + '").bank("' + maquina + '")' + cola;
  // el mismo patrón con el número de paso, para preguntarle a strudel cuál suena
  const espejo = pasos.map((x, k) => (x === '-' || x === '_') ? x : String(k));
  const cotejo = 'n("' + juntar(espejo) + '")' + cola;
  const voz = modo === 'sonido' ? primerGolpe : ins.nombre;
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
  // tipo, así el ▾ sigue siendo el de la forma. Y cada nombre sabe cuál tramo es
  const suena = nom => !!secciones.get(nom)?.suyas.length;
  if (nroForma) {
    let k = 0;
    for (const t of marcas[nroForma - 1]) {
      if (t.tipo !== 'forma') continue;
      if (!secciones.has(t.nombre)) t.cls = 'mal';
      if (suena(t.nombre)) t.tramo = k++;
    }
  }
  const orden = (forma || escritas).filter(suena);
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
