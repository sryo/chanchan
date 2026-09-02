// ------------------------------------------------ mover renglones y secciones
// las órdenes de estructura, ver REGLAS.md
const lineasDeLaHoja = () => src.value.split('\n');
// el último renglón de la hoja es el vacío del final: no cuenta, y el cursor ahí vale por el de arriba
const ultimoRenglon = lineas => lineas.length - 2;
// una selección que termina en la columna cero del renglón siguiente no lo toca
const renglonesEnSeleccion = lineas => {
  const tope = ultimoRenglon(lineas);
  const a = Math.min(resolver(src.selectionStart).l, tope), fin = resolver(src.selectionEnd);
  return [a, Math.max(a, Math.min(fin.i === 0 && fin.l > a ? fin.l - 1 : fin.l, tope))];
};
// reemplaza los renglones a..z por otros, en un solo paso
function cambioDeRenglones(lineas, a, z, nuevas) {
  return paso(baseDe(lineas, a), lineas.slice(a, z + 1).join('\n'), nuevas.join('\n'));
}
const correrSeleccion = delta => [src.selectionStart + delta, src.selectionEnd + delta];

// los encabezados, en orden, con su renglón; y de qué sección es un renglón
const encabezados = () => marcasActuales
  .map((tks, l) => { const s = (tks || []).find(t => t.tipo === 'seccion'); return s && { nombre: s.nombre, escrito: s.escrito, l }; })
  .filter(Boolean);
const seccionDe = l => encabezados().filter(e => e.l < l).pop() || null;
// hasta dónde llega una sección: el renglón antes del próximo encabezado, o el último
function finDeSeccion(lineas, e) {
  const sig = encabezados().find(x => x.l > e.l);
  return sig ? sig.l - 1 : ultimoRenglon(lineas);
}
// dónde entra un renglón nuevo en una sección: después de su último renglón con algo escrito
function dondeEntra(lineas, e) {
  let l = e ? finDeSeccion(lineas, e) : (encabezados()[0] || { l: ultimoRenglon(lineas) + 1 }).l - 1;
  const piso = e ? e.l : -1;
  while (l > piso && !lineas[l].trim()) l--;
  return l + 1;
}

// ---- con la selección: subir, bajar, duplicar
const moverRenglones = abajo => hacer => {
  const lineas = lineasDeLaHoja(), [a, z] = renglonesEnSeleccion(lineas);
  if (abajo ? z >= ultimoRenglon(lineas) : a <= 0) return false;
  if (hacer) {
    const bloque = lineas.slice(a, z + 1), vecino = abajo ? lineas[z + 1] : lineas[a - 1];
    const p = abajo ? cambioDeRenglones(lineas, a, z + 1, [vecino, ...bloque])
                    : cambioDeRenglones(lineas, a - 1, z, [...bloque, vecino]);
    aplicar(p, { sel: correrSeleccion((vecino.length + 1) * (abajo ? 1 : -1)) });
  }
  return true;
};
const duplicarRenglones = hacer => {
  const lineas = lineasDeLaHoja(), [a, z] = renglonesEnSeleccion(lineas);
  if (a === z && !lineas[a].trim()) return false;
  if (hacer) {
    const bloque = lineas.slice(a, z + 1);
    aplicar(cambioDeRenglones(lineas, a, z, [...bloque, ...bloque]), { sel: correrSeleccion(bloque.join('\n').length + 1) });
  }
  return true;
};
atajo('Alt-ArrowUp', 'subir el renglón', moverRenglones(false));
atajo('Alt-ArrowDown', 'bajar el renglón', moverRenglones(true));
atajo('Alt-Shift-ArrowDown', 'duplicar el renglón', duplicarRenglones);

// ---- con un renglón: llevarlo o copiarlo a otra sección, abrir una sección arriba
// «e» es el encabezado de destino, o null para arriba de todas
const llevarA = (l, e, copiar) => hacer => {
  const lineas = lineasDeLaHoja();
  const donde = dondeEntra(lineas, e);
  if (donde === l || donde === l + 1) return false;
  if (hacer) {
    const base = baseDe(lineas, l), renglon = lineas[l] + '\n';
    const pasos = [paso(baseDe(lineas, donde), '', renglon)];
    if (!copiar) pasos.push(paso(base, renglon, ''));
    aplicar(pasos, { cursor: donde > l && !copiar ? baseDe(lineas, donde) - renglon.length : baseDe(lineas, donde) });
  }
  return true;
};
const abrirSeccionArriba = l => hacer => {
  const lineas = lineasDeLaHoja();
  if (marcasActuales[l] && marcasActuales[l].some(t => t.tipo === 'seccion')) return false;
  if (hacer) {
    const libre = seccionLibre(encabezados().map(e => e.escrito));
    const texto = (l > 0 && lineas[l - 1].trim() ? '\n' : '') + articuloDe(libre) + ' ' + libre + ':\n';
    aplicar(paso(baseDe(lineas, l), '', texto), { cursor: baseDe(lineas, l) + texto.length });
  }
  return true;
};
// lo que el ▾ de una parte ofrece al pie
function ordenesDeParte(l) {
  const mia = seccionDe(l), otras = encabezados().filter(e => !mia || e.l !== mia.l);
  const ops = [{ txt: 'abrir una sección acá', orden: abrirSeccionArriba(l) }];
  if (mia) ops.push({ txt: 'llevar arriba de todas', orden: llevarA(l, null, false) });
  for (const e of otras) ops.push({ txt: 'llevar a ' + e.escrito, orden: llevarA(l, e, false) },
                                  { txt: 'copiar a ' + e.escrito, orden: llevarA(l, e, true) });
  return ops;
}

// ---- con un encabezado: seleccionar la sección, unirla con la anterior
const seleccionarSeccion = l => hacer => {
  const lineas = lineasDeLaHoja(), e = encabezados().find(x => x.l === l);
  if (!e) return false;
  if (hacer) {
    const z = finDeSeccion(lineas, e);
    src.setSelectionRange(baseDe(lineas, l), baseDe(lineas, z) + lineas[z].length);
    src.focus();
  }
  return true;
};
const unirConLaAnterior = l => hacer => {
  const lineas = lineasDeLaHoja(), es = encabezados(), k = es.findIndex(x => x.l === l);
  if (k <= 0) return false;
  if (hacer) {
    // el renglón vacío de antes del encabezado se va con él
    const a = l > 0 && !lineas[l - 1].trim() ? l - 1 : l;
    aplicar(paso(baseDe(lineas, a), lineas.slice(a, l + 1).join('\n') + '\n', ''), { cursor: baseDe(lineas, a) });
  }
  return true;
};
const ordenesDeEncabezado = l => [
  { txt: 'seleccionar la sección', orden: seleccionarSeccion(l) },
  { txt: 'unir con la anterior', orden: unirConLaAnterior(l) },
];
