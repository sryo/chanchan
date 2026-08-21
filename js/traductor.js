// ---------------------------------------------------------------- el traductor
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
    return { tipo: 'tempo', bpm: parseFloat(m[1].replace(',', '.')), tk, errs };
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
  for (const x of ws.slice(0, iNombre)) marcar(x.i, x.w.length, 'sujeto');
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
  const pasos = [], lugares = [], pasoTk = [];
  let modo = null, primerGolpe = null;
  const pw = palabras(clausulas[0].txt, clausulas[0].i);
  for (let k = 0; k < pw.length; k++) {
    const w = norm(pw[k].w);
    if (w === '-' || w === '.') {
      pasoTk.push(marcar(pw[k].i, pw[k].w.length, 'silencio', { tipo: 'paso' }));
      pasos.push('-'); lugares.push(null);
    } else if (w === '_') {
      // no es un paso nuevo: estira el anterior, como la ligadura de una partitura
      pasoTk.push(marcar(pw[k].i, pw[k].w.length, 'silencio', { tipo: 'paso' }));
      pasos.push('_'); lugares.push(null);
    } else if (SONIDOS[w]) {
      pasoTk.push(marcar(pw[k].i, pw[k].w.length, 'sonido', { tipo: 'paso' }));
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
      pasoTk.push(marcar(pw[k].i, fin - pw[k].i, 'nota', { tipo: 'nota', raiz: w, altN, octN, acorde }));
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
      error(pw[k].i, pw[k].w.length, 'no conozco «' + pw[k].w + '»' + (s ? '. ¿Será «' + s + '»?' : '. Tocá la palabra para ver qué puede ir ahí.'));
    }
  }
  // recién acá se sabe si la línea es de golpes o de notas
  for (const t of pasoTk) t.modo = modo;
  if (sujetoTk) sujetoTk.modo = modo;
  if (!pasos.length) {
    error(clausulas[0].i, Math.max(1, clausulas[0].txt.length), 'falta qué tocar: «' + nombre + ' toca pum - tas -».');
    return { tipo: 'mala', tk, errs };
  }

  // ---- los modificadores
  let cola = '', instrumento = null, alterna = false, callado = false, maquina = MAQUINA;
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
      marcar(rango[0], rango[1], 'mod', { tipo: 'arreglo' });
      continue;
    }
    const mod = MODIFICADORES.find(m => norm(m[0]) === n);
    if (mod) {
      if (mod[1] === '<>') alterna = true;
      else if (mod[1] === 'mute') callado = true;   // se saca del stack, no gasta CPU
      else cola += mod[1];
      marcar(rango[0], rango[1], 'mod', { tipo: 'modificador' });
      continue;
    }
    const s = parecida(c.txt);
    error(rango[0], rango[1], 'no conozco «' + c.txt.trim() + '»' + (s ? '. ¿Será «' + s + '»?' : '. Tocá la palabra para ver qué puede ir ahí.'));
  }

  if (modo === 'sonido' && instrumento)
    errs.push({ nro, msg: 'los golpes ya traen su sonido: «en ' + instrumento.nombre + '» sólo sirve con notas.' });

  if (roto) return { tipo: 'mala', tk, errs };
  const patron = alterna ? '<' + pasos.join(' ') + '>' : pasos.join(' ');
  let codigo;
  if (modo === 'nota') {
    const ins = instrumento || instrumentoDe(nombre) || INSTRUMENTOS[INSTRUMENTO_POR_DEFECTO];
    codigo = 'note("' + patron + '").sound("' + ins.sonido + '")' + ins.cola + cola;
  } else {
    codigo = 's("' + patron + '").bank("' + maquina + '")' + cola;
  }
  // el mismo patrón pero con el número de paso adentro: sirve para preguntarle
  // a strudel cuál se está tocando ahora sin adivinar la cuenta a mano
  const espejo = pasos.map((x, k) => (x === '-' || x === '_') ? x : k).join(' ');
  const cotejo = 'n("' + (alterna ? '<' + espejo + '>' : espejo) + '")' + cola;
  // el color de la línea: en los golpes lo elige el primero que suena, en las
  // notas el instrumento, igual que el sonido
  const voz = modo === 'sonido' ? primerGolpe
    : (instrumento || instrumentoDe(nombre) || INSTRUMENTOS[INSTRUMENTO_POR_DEFECTO]).nombre;
  return { tipo: 'parte', nro, nombre, voz, codigo, cotejo, lugares, callado, tk, errs };
}

function traducir(fuente) {
  const lineas = fuente.split('\n');
  const partes = [], renglones = [], errores = [], marcas = [], calladas = new Set();
  let bpm = 90;
  lineas.forEach((l, n) => {
    const r = traducirLinea(l, n + 1);
    marcas.push(r.tk);
    errores.push(...r.errs);
    if (r.tipo === 'tempo') bpm = r.bpm;
    if (r.tipo === 'parte') renglones.push(r);
    if (r.tipo === 'parte' && r.callado) calladas.add(n);
    if (r.tipo === 'parte' && !r.callado) partes.push(r);
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
  let codigo = '';
  if (partes.length) {
    codigo = 'setcpm(' + bpm + '/4)\n';
    codigo += partes.length === 1
      ? partes[0].codigo
      : 'stack(\n' + partes.map(p => '  ' + p.codigo + ', // ' + p.nombre).join('\n') + '\n)';
  }
  return { codigo, errores, marcas, partes, renglones, calladas, bpm };
}
