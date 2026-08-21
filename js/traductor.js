// ---------------------------------------------------------------- el traductor
// La vuelta larga es hasta donde todas las líneas vuelven a caer juntas: una de
// cuatro vueltas y otra de seis se reencuentran a las doce. Es lo que la cinta
// dibuja de punta a punta. Si no entra en el tope se baja al divisor más grande
// que sí entre, así la cinta sigue cerrando sobre sí misma en vez de cortar una
// forma por la mitad.
const VUELTAS_CINTA = 16;
const mcd = (a, b) => b ? mcd(b, a % b) : a;
const mcm = (a, b) => a / mcd(a, b) * b;
function acotarVueltas(v) {
  if (v <= VUELTAS_CINTA) return v;
  for (let d = VUELTAS_CINTA; d > 1; d--) if (v % d === 0) return d;
  return 1;
}

// Cada línea se convierte en un patrón de strudel. Los tokens que salen de acá
// sirven para las dos cosas: pintar el editor y armar el código.
function traducirLinea(texto, nro) {
  const tk = [], errs = [];
  let roto = false;
  const marcar = (i, len, cls, dato) => { const t = { i, len, cls, ...dato }; tk.push(t); return t; };
  const error = (i, len, msg) => { marcar(i, len, 'mal', { tipo: 'mal' }); errs.push({ nro, msg }); };

  if (!texto.trim()) return { tipo: 'vacia', tk, errs };

  const ws = palabras(texto, 0);
  const sinArticulo = ws[0] && /^(el|la|los|las)$/i.test(ws[0].w) ? ws.slice(1) : ws;

  // ---- la estrofa:
  const sec = leerSeccion(texto);
  if (sec) {
    if (sec.falla) {
      error(0, texto.length, sec.falla === 'sinNombre'
        ? 'a la sección le falta el nombre: «la estrofa:».'
        : sec.falla === 'dura'
          ? 'el largo de la sección va «la estrofa dura ocho vueltas:», con un número de 1 a ' + VUELTAS_FORMA + '.'
          : 'el nombre de la sección es una palabra sola, sin acentos ni espacios: «' + sec.nombre + '» no entra.');
      return { tipo: 'mala', tk, errs };
    }
    // Todo lo que no es el nombre es andamio: el artículo, el «dura ocho
    // vueltas», los dos puntos. Va con la tinta del «toca», así que el nombre
    // queda solo y la hoja se lee como un papelito de ensayo.
    for (const x of ws) {
      const suelta = norm(x.w).replace(/:$/, '');
      if (suelta === sec.nombre) marcar(x.i, suelta.length, 'sujeto', { tipo: 'seccion', nombre: sec.nombre });
      else marcar(x.i, x.w.length, 'estructura');
    }
    return { tipo: 'seccion', nombre: sec.nombre, vueltas: sec.vueltas, tk, errs };
  }

  // ---- va estrofa estrofa estribillo
  const forma = leerForma(texto);
  if (forma) {
    // cada nombre es su propio token: son los que llevan el color de la sección
    // y los que el ▾ puede cambiar por otro de los que hay
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
    // sólo el número lleva menú y arrastre: si el token fuera toda la frase no
    // habría dónde poner el cursor en esta línea
    if (m.index > 0) marcar(0, m.index, 'estructura');
    marcar(m.index, m[1].length, 'estructura', { tipo: 'tempo' });
    const finNum = m.index + m[1].length;
    if (finNum < texto.length) marcar(finNum, texto.length - finNum, 'estructura');
    // el menú y el arrastre ya acotan; escrito a mano entraba cualquier cosa, y
    // un cero deja el reloj de strudel detenido sin decir por qué
    const bpm = parseFloat(m[1].replace(',', '.'));
    if (!(bpm >= 20 && bpm <= 400)) {
      error(m.index, m[1].length, 'el tempo va entre 20 y 400 tiempos por minuto.');
      return { tipo: 'mala', tk, errs };
    }
    return { tipo: 'tempo', bpm, tk, errs };
  }

  // ---- la <parte> toca <pasos>[, <modificador>]*
  const iVerbo = ws.findIndex(x => /^(toca|tocan)$/i.test(x.w));
  if (iVerbo < 0) {
    error(0, texto.length, 'no entiendo la línea. Va «la bata toca pum - tas -» o «va a 92».');
    return { tipo: 'mala', tk, errs };
  }
  // el artículo queda suelto y el nombre entero es un solo blanco: es el que
  // elige el instrumento, así que el menú lo tiene que poder cambiar de una
  const iNombre = ws.length - sinArticulo.length;
  // el artículo va aparte del nombre: es gramática, no es quién toca, y con la
  // misma tinta plena que «viola distorsionada» pesaba lo mismo que ella
  for (const x of ws.slice(0, iNombre)) marcar(x.i, x.w.length, 'articulo');
  let sujetoTk = null;
  if (iNombre < iVerbo) {
    const a = ws[iNombre], z = ws[iVerbo - 1];
    sujetoTk = marcar(a.i, z.i + z.w.length - a.i, 'sujeto', { tipo: 'instrumento' });
  }
  marcar(ws[iVerbo].i, ws[iVerbo].w.length, 'verbo');

  const desde = ws[iVerbo].i + ws[iVerbo].w.length;
  const resto = texto.slice(desde);

  // partir en cláusulas por coma, guardando la posición de cada una
  const clausulas = [];
  let pos = 0;
  for (const trozo of resto.split(',')) {
    clausulas.push({ txt: trozo, i: desde + pos });
    pos += trozo.length + 1;
  }

  const nombre = ws.slice(ws.length - sinArticulo.length, iVerbo).map(x => x.w).join(' ') || 'parte';

  // ---- los pasos
  // Los compases de la línea. La barra no agrega un paso: corta. Sin barras hay
  // un compás solo y todo queda como estaba; con barras cada tramo es una vuelta
  // y adentro los pasos se reparten entre ellos, así que un compás en negras
  // puede ir seguido de otro en semicorcheas —que es como está escrita cualquier
  // melodía— sin tener que buscarle a la línea entera un denominador común.
  const pasos = [], lugares = [], pasoTk = [], cortes = [];
  let modo = null, primerGolpe = null;
  const pw = palabras(clausulas[0].txt, clausulas[0].i);
  for (let k = 0; k < pw.length; k++) {
    const w = norm(pw[k].w);
    if (w === '|') {
      // va en la tinta del andamio, como el «toca» y el artículo: es gramática,
      // no es algo que suene
      marcar(pw[k].i, pw[k].w.length, 'estructura');
      cortes.push(pasos.length);
    } else if (w === '-' || w === '.') {
      pasoTk.push(marcar(pw[k].i, pw[k].w.length, 'silencio', { tipo: 'paso' }));
      pasos.push('-'); lugares.push(null);
    } else if (w === '_') {
      // no es un paso nuevo: estira el anterior, como la ligadura de una partitura
      pasoTk.push(marcar(pw[k].i, pw[k].w.length, 'silencio', { tipo: 'paso' }));
      pasos.push('_'); lugares.push(null);
    } else if (SONIDOS[w]) {
      pasoTk.push(marcar(pw[k].i, pw[k].w.length, 'sonido', { tipo: 'paso', alto: ALTO_GOLPE[w] }));
      if (!primerGolpe) primerGolpe = w;
      if (modo === 'nota') { roto = true; error(pw[k].i, pw[k].w.length, 'no mezclés golpes con notas en la misma línea: hacé dos líneas.'); }
      pasos.push(SONIDOS[w][0]); lugares.push({ i: pw[k].i, len: pw[k].w.length });
      modo = 'sonido';
    } else if (NOTAS[w]) {
      let oct = OCTAVA_BASE, alt = '', acorde = '', fin = pw[k].i + pw[k].w.length;
      let altN = '', octN = '';
      // se comen las palabras que acompañan a la nota: bemol, sostenido, grave, muy agudo…
      let k2 = k + 1;
      while (k2 < pw.length) {
        const n2 = norm(pw[k2].w);
        if (ALTERACIONES[n2]) { alt = ALTERACIONES[n2]; altN = n2; }
        else if (ACORDE[n2]) { acorde = n2; }
        else if (OCTAVAS[n2]) { oct = OCTAVAS[n2]; octN = n2; }
        else if (n2 === 'muy' && k2 + 1 < pw.length && OCTAVAS['muy ' + norm(pw[k2+1].w)]) {
          octN = 'muy ' + norm(pw[k2+1].w); oct = OCTAVAS[octN]; k2++;
        } else break;
        fin = pw[k2].i + pw[k2].w.length;
        k2++;
      }
      // raizLen parte el token en dos para pintarlo: la nota adelante y lo que la
      // acompaña atrás. «la muy grave sol muy grave» es cuatro quintos octava, y
      // con todo del mismo peso la línea del bajo no se lee, se descifra.
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
      modo = 'nota';
      k = k2 - 1;
    } else {
      const s = parecida(pw[k].w);
      error(pw[k].i, pw[k].w.length, 'no conozco «' + pw[k].w + '»' + (s ? '. ¿Será «' + s + '»?' : '. Pasá el mouse por encima y tocá el ▾.'));
    }
  }
  // recién acá se sabe si la línea es de golpes o de notas
  for (const t of pasoTk) t.modo = modo;
  if (sujetoTk) sujetoTk.modo = modo;
  if (!pasos.length) {
    // sin el recorte, el token abarca el espacio que sigue al verbo, y aceptar
    // una corrección del ▾ dejaba «el bombo tocapum»
    const sobra = clausulas[0].txt.length - clausulas[0].txt.trimStart().length;
    const desde = clausulas[0].i + sobra;
    error(desde, Math.max(1, clausulas[0].txt.trim().length), 'falta qué tocar: «' + nombre + ' toca pum - tas -».');
    return { tipo: 'mala', tk, errs };
  }

  // ---- los modificadores
  let cola = '', instrumento = null, alterna = false, callado = false, maquina = MAQUINA;
  // En cuántas vueltas la línea vuelve a empezar. Son tres cosas distintas: los
  // que la estiran («a la mitad»), el arreglo, que la saca de a vueltas enteras, y
  // los que duran lo mismo pero tardan en repetirse —«rodando», «cada cuatro
  // vueltas al doble»—. «al doble» no cuenta: entra dos veces en la misma vuelta
  // sin mover el punto donde se repite.
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
      marcar(rango[0], rango[1], 'mod', { tipo: 'instrumento', conEn: true, modo: 'sonido' });
      continue;
    }
    if (inst && instrumentoDe(inst[1])) {
      instrumento = instrumentoDe(inst[1]);
      marcar(rango[0], rango[1], 'mod', { tipo: 'instrumento', conEn: true });
      continue;
    }
    // el arreglo va antes de la tabla: la tabla es de frases fijas y ésta lleva
    // números adentro, así que no pueden confundirse
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
    // el reparto euclidiano y las que envuelven a otra frase van también antes de
    // la tabla, y por lo mismo: la tabla es de frases fijas y éstas llevan adentro
    // un número o una frase entera
    const euclid = leerEuclides(c.txt);
    if (euclid) {
      cola += euclid.codigo;
      marcar(rango[0], rango[1], 'mod', { tipo: 'euclides', n: euclid.n, m: euclid.m });
      continue;
    }
    const envuelve = leerCada(c.txt) || leerVeces(c.txt);
    if (envuelve) {
      if (envuelve.falla === 'numero') {
        error(rango[0], rango[1], 'el «cada» va «cada cuatro vueltas al doble», ' +
          'con un número de 2 a ' + VUELTAS_MAX + '.');
        continue;
      }
      // «callado» y «una por vuelta» están en la tabla pero no son código: una
      // saca la línea del stack antes de que haya cola y la otra arma el patrón.
      // Decir «no la conozco» de una palabra que sí existe manda a buscar un
      // error de tipeo que no está.
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
    const mod = modificadorDe(n);
    if (mod) {
      if (mod[1] === '<>' && cortes.length) {
        error(rango[0], rango[1], 'esta línea ya está partida en compases con «|», ' +
          'que es lo mismo que hace «una por vuelta» pero paso por paso.');
        continue;
      }
      if (mod[1] === '<>') alterna = true;
      else if (mod[1] === 'mute') callado = true;   // se saca del stack, no gasta CPU
      else cola += mod[1];
      const frena = /\.slow\((\d+)\)/.exec(mod[1]);
      if (frena) lento *= +frena[1];
      if (mod[3]) vueltasMod = mcm(vueltasMod, mod[3]);
      marcar(rango[0], rango[1], 'mod', { tipo: 'modificador' });
      continue;
    }
    const s = parecida(c.txt);
    error(rango[0], rango[1], 'no conozco «' + c.txt.trim() + '»' + (s ? '. ¿Será «' + s + '»?' : '. Pasá el mouse por encima y tocá el ▾.'));
  }

  if (modo === 'sonido' && instrumento)
    errs.push({ nro, msg: 'los golpes ya traen su sonido: «en ' + instrumento.nombre + '» sólo sirve con notas.' });

  if (roto) return { tipo: 'mala', tk, errs };
  // Un compás es un corchete y la vuelta los va turnando: «do re | mi» sale
  // «<[c4 d4] [e4]>». Es la misma pieza que usa «una por vuelta» —el <> de
  // strudel— y por eso las dos no pueden ir juntas. Un compás sin nada adentro
  // es un compás de silencio, que es algo que existe y hay que poder escribir.
  //
  // Una ligadura no cruza la barra. Cada compás es un corchete aparte y adentro
  // de <> no hay nada anterior que estirar —strudel ni siquiera lo parsea—, así
  // que el «_» que abre un compás vuelve a decir la nota que venía sonando. Es
  // lo más cerca que una maquinita de loops llega de un ligado, y es lo que
  // pasa igual al final de la vuelta, cuando el tema vuelve a empezar.
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
  const juntar = lista => cortes.length ? porCompases(lista)
    : alterna ? '<' + lista.join(' ') + '>' : lista.join(' ');
  const patron = juntar(pasos);
  let codigo;
  if (modo === 'nota') {
    const ins = instrumento || instrumentoDe(nombre) || INSTRUMENTOS[INSTRUMENTO_POR_DEFECTO];
    codigo = 'note("' + patron + '").sound("' + ins.sonido + '")' + ins.cola + cola;
  } else {
    codigo = 's("' + patron + '").bank("' + maquina + '")' + cola;
  }
  // el mismo patrón pero con el número de paso adentro: sirve para preguntarle
  // a strudel cuál se está tocando ahora sin adivinar la cuenta a mano
  const espejo = pasos.map((x, k) => (x === '-' || x === '_') ? x : String(k));
  const cotejo = 'n("' + juntar(espejo) + '")' + cola;
  // el color de la línea: en los golpes lo elige el primero que suena, en las
  // notas el instrumento, igual que el sonido
  const voz = modo === 'sonido' ? primerGolpe
    : (instrumento || instrumentoDe(nombre) || INSTRUMENTOS[INSTRUMENTO_POR_DEFECTO]).nombre;
  // El color de la parte también baja al texto. El nombre se pinta con él —la
  // franja de la cinta, el puntito del margen y la palabra pasan a ser una sola
  // cosa, en vez de una clave que hay que ir a consultar al margen— y los pasos
  // lo llevan puesto para teñir con él el realce de lo que está sonando.
  if (sujetoTk) sujetoTk.voz = voz;
  for (const t of pasoTk) t.voz = voz;
  // los compases y «una por vuelta» son las dos maneras de que la línea dure más
  // de una vuelta, y no pueden estar las dos a la vez
  const largo = cortes.length ? cortes.length + 1 : alterna ? pasos.length : 1;
  const vueltas = mcm(mcm(largo * lento, vueltasMascara), vueltasMod);
  return { tipo: 'parte', nro, nombre, voz, codigo, cotejo, lugares, callado, vueltas, tk, errs };
}

function traducir(fuente) {
  const lineas = fuente.split('\n');
  const partes = [], renglones = [], errores = [], marcas = [], calladas = new Set();
  // las secciones en el orden en que están escritas, y las líneas de cada una
  const secciones = new Map();
  let bpm = 90, abierta = null, forma = null, nroForma = 0;
  lineas.forEach((l, n) => {
    const r = traducirLinea(l, n + 1);
    marcas.push(r.tk);
    errores.push(...r.errs);
    // Un tempo adentro de un bloque es de esa sección; afuera es el del tema. Es
    // lo único que hacía falta para O Fortuna, que va de 130 a 320 y vuelve.
    if (r.tipo === 'tempo') { if (abierta) abierta.bpm = r.bpm; else bpm = r.bpm; }
    if (r.tipo === 'seccion') {
      // volver a abrir una sección que ya existe le suma líneas en vez de pisarla:
      // así se le puede agregar una parte más abajo sin tener que subirla al bloque
      abierta = secciones.get(r.nombre) || { nombre: r.nombre, vueltas: null, bpm: null, suyas: [] };
      if (r.vueltas) abierta.vueltas = r.vueltas;
      secciones.set(r.nombre, abierta);
    }
    if (r.tipo === 'forma') { forma = r.nombres; nroForma = r.nro; }
    if (r.tipo === 'parte') {
      // las líneas de antes de la primera sección son del tema entero y suenan en
      // todas: es lo que deja escribir una sola vez la batería que no cambia
      r.seccion = abierta && abierta.nombre;
      renglones.push(r);
      // el largo de la sección lo dan todas sus líneas y no sólo las que suenan:
      // si no, callar el bajo achicaría la estrofa a lo que dure la batería
      if (abierta) abierta.suyas.push(r);
      if (r.callado) calladas.add(n);
      else partes.push(r);
    }
  });
  // cada parte se prueba sola: si una falla, se cae ella y no el tema entero
  if (motorListo) {
    for (let i = partes.length - 1; i >= 0; i--) {
      try { eval(partes[i].codigo).queryArc(0, 1); }
      catch (e) {
        errores.push({ nro: partes[i].nro, msg: 'strudel no pudo con esta línea, la salteo: ' + String(e.message || e) });
        partes.splice(i, 1);
      }
    }
  }
  // ---- la forma
  // Sin línea de forma las secciones van una vez cada una, en el orden en que
  // están escritas: es lo que uno espera al leer la hoja de arriba abajo.
  const escritas = [...secciones.keys()];
  // sin ninguna sección escrita el problema es uno solo y es ése: repetirlo por
  // cada nombre de la forma manda a buscar cuatro errores donde hay uno
  if (forma && !escritas.length)
    errores.push({ nro: nroForma, msg: 'no hay ninguna sección escrita. ' +
      'Una sección se abre con una línea que termina en dos puntos: «la estrofa:».' });
  else for (const nom of forma || [])
    if (!secciones.has(nom))
      errores.push({ nro: nroForma, msg: 'no hay ninguna sección que se llame «' + nom + '». ' +
        (escritas.length === 1 ? 'Está ' + escritas[0] + '.' : 'Están ' + escritas.join(', ') + '.') });
  const orden = (forma || escritas).filter(nom => secciones.has(nom));
  // Cuánto dura cada sección: lo que diga su «dura», y si no, hasta donde sus
  // líneas vuelven a caer juntas. Una sección de una línea de cuatro compases
  // dura cuatro vueltas sin que haya que decirlo.
  const largoDe = sec => Math.min(VUELTAS_FORMA,
    sec.vueltas || sec.suyas.reduce((a, r) => mcm(a, r.vueltas), 1));
  const tramos = orden.map(nom => ({ nom, largo: largoDe(secciones.get(nom)) }));
  const total = tramos.reduce((a, t) => a + t.largo, 0);
  // Dónde cambia el pulso, en vueltas. El patrón no lleva el tempo adentro —el
  // «setcpm» es del reloj, no de la línea—, así que esto es una tabla que el
  // reloj va leyendo mientras suena, igual que ya hace con la aguja.
  const tempos = [];
  let cae = 0;
  for (const t of tramos) {
    const suyo = secciones.get(t.nom).bpm || bpm;
    if (!tempos.length || tempos[tempos.length - 1].bpm !== suyo) tempos.push({ desde: cae, bpm: suyo });
    cae += t.largo;
  }

  // Una parte por tramo: donde no le toca va un silencio. Se arma un «arrange»
  // por línea y no uno solo con los stacks adentro, y eso es lo que deja todo lo
  // de abajo como estaba: la cinta sigue dibujando una franja por línea —cortada
  // donde no suena, que es lo que ya hacía con los golpes—, el puntito del margen
  // sigue siendo el índice de la línea, y el espejo se arma igual que el patrón.
  const enLaForma = (cod, seccion) => !tramos.length || !seccion ? cod
    : 'arrange(' + tramos.map(t =>
        '[' + t.largo + ', ' + (t.nom === seccion ? cod : 'silence') + ']').join(', ') + ')';
  for (const r of renglones) r.cotejo = enLaForma(r.cotejo, r.seccion);

  let codigo = '';
  if (partes.length) {
    // Lo único que el traductor le agrega a la línea sin que lo diga el idioma: un
    // bus de efectos por parte. Hasta acá todas compartían uno solo, así que «con
    // eco» en una línea metía a las otras en la misma sala y el eco de la viola
    // salía teñido de bombo. Con el bus propio, cada «con eco» es de su parte.
    //
    // El bus va por nombre y no por línea: la misma viola escrita en la estrofa y
    // en el estribillo es una sola viola, y con un bus por línea su eco se cortaba
    // en seco cada vez que cambiaba la sección.
    const buses = [...new Set(partes.map(p => p.nombre))];
    const conBus = partes.map(p =>
      enLaForma(p.codigo, p.seccion) + '.orbit(' + buses.indexOf(p.nombre) + ')');
    codigo = 'setcpm(' + (tempos.length ? tempos[0].bpm : bpm) + '/4)\n';
    codigo += partes.length === 1
      ? conBus[0]
      : 'stack(\n' + conBus.map((c, i) => '  ' + c + ', // ' + partes[i].nombre +
          (partes[i].seccion ? ' · ' + partes[i].seccion : '')).join('\n') + '\n)';
  }
  // Con forma, la vuelta larga es la forma entera y no se puede acotar: acotar
  // busca un divisor, y el divisor de una canción es media canción.
  const vueltas = tramos.length ? Math.max(1, total)
    : acotarVueltas(renglones.reduce((a, r) => mcm(a, r.vueltas), 1));
  // el primero de la tabla es con el que arranca el tema: si la primera sección
  // trae el suyo, ése es el que va en el «setcpm» del código
  const arranca = tempos.length ? tempos[0].bpm : bpm;
  return { codigo, errores, marcas, partes, renglones, calladas,
           bpm: arranca, vueltas, tramos, tempos: tempos.length > 1 ? tempos : [] };
}
