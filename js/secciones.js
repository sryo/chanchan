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
// el cursor en el renglón vacío del final vale por el de arriba: se lo sube a él antes de correrlo
const correrSeleccion = (delta, tope = Infinity) =>
  [Math.min(src.selectionStart, tope) + delta, Math.min(src.selectionEnd, tope) + delta];

// de qué sección es un renglón
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
    aplicar(p, { sel: correrSeleccion((vecino.length + 1) * (abajo ? 1 : -1), baseDe(lineas, z) + lineas[z].length) });
  }
  return true;
};
const duplicarRenglones = hacer => {
  const lineas = lineasDeLaHoja(), [a, z] = renglonesEnSeleccion(lineas);
  if (a === z && !lineas[a].trim()) return false;
  if (hacer) {
    const bloque = lineas.slice(a, z + 1);
    aplicar(cambioDeRenglones(lineas, a, z, [...bloque, ...bloque]), { sel: correrSeleccion(bloque.join('\n').length + 1, baseDe(lineas, z) + lineas[z].length) });
  }
  return true;
};
atajo('Alt-ArrowUp', 'subir el renglón', moverRenglones(false));
atajo('Alt-ArrowDown', 'bajar el renglón', moverRenglones(true));
atajo('Alt-Shift-ArrowDown', 'duplicar el renglón', duplicarRenglones);

// ⌥⌘↑ ⌥⌘↓: al encabezado de arriba o de abajo; en el borde no aplica y la tecla sigue su camino
const irASeccion = abajo => hacer => {
  const { l } = resolver(src.selectionStart), es = encabezados();
  const e = abajo ? es.find(x => x.l > l) : es.filter(x => x.l < l).pop();
  if (!e) return false;
  if (hacer) {
    const pos = baseDe(lineasDeLaHoja(), e.l);
    src.setSelectionRange(pos, pos);
    traerALaVista(pos);
  }
  return true;
};
atajo('Alt-Mod-ArrowUp', 'ir a la sección de arriba', irASeccion(false));
atajo('Alt-Mod-ArrowDown', 'ir a la sección de abajo', irASeccion(true));

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
// lo que el ▾ de una parte ofrece al pie; arriba de la primera sección, un renglón suena en todas
function ordenesDeParte(l) {
  const mia = seccionDe(l), otras = encabezados().filter(e => !mia || e.l !== mia.l);
  const sueltas = [{ txt: 'abrir una sección acá', orden: abrirSeccionArriba(l) }];
  if (mia) sueltas.push({ txt: 'que suene en todas', orden: llevarA(l, null, false) });
  // el solo del puntito con mayúscula: escribe «callado» en las otras, o lo saca de todas
  sueltas.push({ txt: calladasActuales.has(l) ? 'que suene' : 'callar', tecla: mostrarTecla('Mod-/'),
                 orden: hacer => { if (hacer) alternarCallado(l); return true; } });
  const lasDemas = lineasQueSuenan(marcasActuales).filter(i => i !== l);
  if (lasDemas.length) sueltas.push({ txt: lasDemas.every(i => calladasActuales.has(i)) ? 'que suenen todas' : 'que suene sólo ésta',
                                   tecla: '⇧ clic en el puntito',
                                   orden: hacer => { if (hacer) alternarCallado(l, true); return true; } });
  const a = e => { const art = articuloDe(e.escrito); return (art === 'el' ? 'al' : 'a ' + art) + ' ' + e.escrito; };
  return [
    { titulo: '', pie: true, ops: sueltas },
    { titulo: 'llevar', pie: true, mitad: true, ops: otras.map(e => ({ txt: a(e), orden: llevarA(l, e, false) })) },
    { titulo: 'copiar', pie: true, mitad: true, ops: otras.map(e => ({ txt: a(e), orden: llevarA(l, e, true) })) },
  ];
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
// una sección entera: su encabezado y sus renglones, sin los vacíos del final ni la forma, que no es de nadie
function tramoDeSeccion(lineas, e) {
  let z = finDeSeccion(lineas, e);
  while (z > e.l && (!lineas[z].trim() || leerRenglon(lineas[z]).clase === 'forma')) z--;
  return [e.l, z];
}
// la cambia de lugar con la de al lado; lo que haya entre las dos se queda en el medio
const moverSeccion = (l, abajo) => hacer => {
  const lineas = lineasDeLaHoja(), es = encabezados(), k = es.findIndex(x => x.l === l);
  const otra = es[k + (abajo ? 1 : -1)];
  if (k < 0 || !otra) return false;
  if (hacer) {
    const [a1, z1] = tramoDeSeccion(lineas, abajo ? es[k] : otra), [a2, z2] = tramoDeSeccion(lineas, abajo ? otra : es[k]);
    const arriba = lineas.slice(a1, z1 + 1), deAbajo = lineas.slice(a2, z2 + 1), medio = lineas.slice(z1 + 1, a2);
    const nuevas = [...lineas.slice(0, a1), ...deAbajo, ...medio, ...arriba, ...lineas.slice(z2 + 1)];
    const queda = abajo ? a1 + deAbajo.length + medio.length : a1;
    aplicar(cambioDeRenglones(lineas, a1, z2, [...deAbajo, ...medio, ...arriba]), { cursor: baseDe(nuevas, queda) });
  }
  return true;
};
// la copia va abajo con otro nombre: con el mismo sería la misma sección, y sumaría sus renglones
const duplicarSeccion = l => hacer => {
  const lineas = lineasDeLaHoja(), e = encabezados().find(x => x.l === l);
  if (!e) return false;
  if (hacer) {
    const [a, z] = tramoDeSeccion(lineas, e);
    const libre = seccionLibre(encabezados().map(x => x.escrito));
    const dura = (lineas[a].match(/\s+dura\s+\S+\s+vueltas?(?=\s*:\s*$)/) || [''])[0];
    const copia = [articuloDe(libre) + ' ' + libre + dura + ':', ...lineas.slice(a + 1, z + 1)];
    aplicar(cambioDeRenglones(lineas, z, z, [lineas[z], '', ...copia]), { cursor: baseDe(lineas, z) + lineas[z].length + 2 });
  }
  return true;
};
const ordenesDeEncabezado = l => [
  { txt: 'seleccionarla', orden: seleccionarSeccion(l) },
  { txt: 'subirla', orden: moverSeccion(l, false) },
  { txt: 'bajarla', orden: moverSeccion(l, true) },
  { txt: 'duplicarla', orden: duplicarSeccion(l) },
  { txt: 'unirla con la anterior', orden: unirConLaAnterior(l) },
];

// cuánto dura: se escribe en el encabezado, «la estrofa dura 8 vueltas:»
function duracionesDeEncabezado(l) {
  const linea = lineasDeLaHoja()[l], ahora = (leerSeccion(linea) || {}).vueltas || null;
  return [null, 4, 8, 16].map(n => ({
    txt: n ? 'dura ' + enLetras(n) + ' vueltas' : 'lo que tarden sus renglones', puesto: n === ahora,
    hacer: () => {
      const lineas = lineasDeLaHoja(), sin = lineas[l].replace(/\s+dura\s+\S+\s+vueltas?(?=\s*:\s*$)/, '');
      const nueva = sin.replace(/\s*:\s*$/, '') + (n ? ' dura ' + enLetras(n) + ' vueltas' : '') + ':';
      aplicar(cambioDeRenglones(lineas, l, l, [nueva]), { cursor: baseDe(lineas, l) + nueva.length });
    },
  }));
}

// la forma se escribe de a nombres: uno más al final, o uno menos con su espacio
function agregarALaForma(l, escrito) {
  const lineas = lineasDeLaHoja(), fin = baseDe(lineas, l) + lineas[l].trimEnd().length;
  aplicar(paso(fin, '', ' ' + escrito), { cursor: fin + escrito.length + 1 });
}
function sacarDeLaForma(t) {
  const lineas = lineasDeLaHoja(), linea = lineas[t.l];
  const desde = /\s/.test(linea[t.i - 1] || '') ? t.i - 1 : t.i;
  aplicar(paso(baseDe(lineas, t.l) + desde, linea.slice(desde, t.i + t.len), ''), { cursor: baseDe(lineas, t.l) + desde });
}
