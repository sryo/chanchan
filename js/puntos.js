// ------------------------------------------------- silenciar una línea
// los puntitos del margen son un atajo para escribir «callado» — ver REGLAS.md
const puntos = document.createElement('div');
puntos.id = 'puntos';
document.querySelector('.wrap').appendChild(puntos);

// el traductor marca la cláusula «callado» donde esté: sacarla es cortar desde su coma
function sinCallado(ln, l) {
  const t = (marcasActuales[l] || []).find(x => x.callado);
  if (!t) return ln;
  const coma = ln.lastIndexOf(',', t.i);
  return ln.slice(0, coma < 0 ? t.i : coma) + ln.slice(t.i + t.len);
}
const conCallado = (ln, l) => sinCallado(ln, l) + ', callado';

// no son partes: nada que callar
const NO_SUENA = ['tempo', 'compas', 'mal', 'seccion', 'forma', 'enlace', 'comentario'];

function lineasQueSuenan(marcas) {
  return marcas.map((tks, l) =>
    (tks || []).some(t => t.tipo && !NO_SUENA.includes(t.tipo)) ? l : -1)
    .filter(l => l >= 0);
}

function armarPuntos(marcas, calladas, renglones = actual.renglones) {
  const caja = hl.getBoundingClientRect();
  const color = new Map(renglones.map(r => [r.nro - 1, tramaDe(r.voz)]));
  puntos.innerHTML = '';
  for (const l of lineasQueSuenan(marcas)) {
    const sp = hl.querySelector('span[data-l="' + l + '"]');
    if (!sp) continue;
    const sr = sp.getBoundingClientRect();
    const y = sr.top - caja.top;
    if (y < 0 || y > caja.height) continue;
    const b = document.createElement('button');
    b.className = 'punto' + (calladas.has(l) ? ' callado' : '');
    b.setAttribute('aria-pressed', calladas.has(l));
    if (color.has(l)) b.style.color = color.get(l);
    b.dataset.l = l;
    b.title = (calladas.has(l) ? 'que suene' : 'callar') + ' el renglón ' + (l + 1) + ' · mayúscula y clic: que suene sólo éste';
    b.setAttribute('aria-label', (calladas.has(l) ? 'que suene' : 'callar') + ' el renglón ' + (l + 1));
    // se rehacen en cada tecleo, y el que la franja tiene señalado no se puede perder
    if (l === franjaSeñalada) b.classList.add('senalado');
    puntos.appendChild(b);
    // después de colgarlo: suelto, offsetHeight mide cero
    b.style.top = (y + (sr.height - b.offsetHeight) / 2) + 'px';
    // partido en varias filas, se lo dice al margen: la segunda fila no es otro renglón
    const tramos = [...hl.querySelectorAll('span[data-l="' + l + '"]')].flatMap(s => [...s.getClientRects()]);
    const abajo = Math.max(...tramos.map(r => r.bottom)) - caja.top;
    if (abajo - (y + sr.height) > sr.height / 2) {
      const sigue = document.createElement('div');
      sigue.className = 'sigue';
      const desde = y + (sr.height + b.offsetHeight) / 2 + 2;
      sigue.style.cssText = 'left:' + (b.offsetWidth / 2 - 1) + 'px;top:' + desde + 'px;height:' + Math.max(0, abajo - desde) + 'px;background:' + (color.get(l) || 'var(--linea)');
      puntos.appendChild(sigue);
    }
  }
}

puntos.addEventListener('mousedown', e => {
  const b = e.target.closest('.punto');
  if (!b || e.button !== 0) return;     // el botón derecho es del navegador
  e.preventDefault();
  alternarCallado(+b.dataset.l, e.shiftKey);
});
// desde el teclado no hay mousedown: Enter y espacio llegan como click
puntos.addEventListener('click', e => {
  const b = e.target.closest('.punto');
  if (b && !e.detail) alternarCallado(+b.dataset.l, e.shiftKey);
});

function alternarCallado(l, solo) {
  const lineas = src.value.split('\n'), nuevas = lineas.slice();
  const partes = lineasQueSuenan(marcasActuales);
  if (solo) {
    const otras = partes.filter(i => i !== l);
    // si ya estaban todas calladas, el mismo gesto las devuelve
    const todasMudas = otras.every(i => calladasActuales.has(i));
    otras.forEach(i => { nuevas[i] = todasMudas ? sinCallado(lineas[i], i) : conCallado(lineas[i], i); });
    nuevas[l] = sinCallado(lineas[l], l);
  } else {
    nuevas[l] = calladasActuales.has(l) ? sinCallado(lineas[l], l) : conCallado(lineas[l], l);
  }
  reescribirRenglones(lineas, nuevas, l);
}

// un paso por renglón tocado, todos en un solo grupo para atrás; el deshacer cuelga del nombre de la parte
function reescribirRenglones(lineas, nuevas, l) {
  const pasos = [];
  let base = 0;
  lineas.forEach((ln, k) => { if (nuevas[k] !== ln) pasos.push(paso(base, ln, nuevas[k])); base += ln.length + 1; });
  if (!pasos.length) return;
  aplicar(pasos);
  const nombre = (marcasActuales[l] || []).find(t => t.cls === 'sujeto');
  if (nombre) mostrarDeshacer({ l, i: nombre.i, len: nombre.len }, false);
  else mostrarDeshacer(anclaDe(baseDe(src.value.split('\n'), l), 1), false);
}

// ⌘/: los renglones del cursor que suenan se callan o vuelven a sonar, todos juntos; si ninguno es
// una parte, se vuelven apunte o dejan de serlo. Callar una parte no es apuntarla: perdería su franja
const callarOApuntar = hacer => {
  const lineas = src.value.split('\n'), [a, z] = renglonesEnSeleccion(lineas);
  const rango = Array.from({ length: z - a + 1 }, (_, k) => a + k);
  const suenan = new Set(lineasQueSuenan(marcasActuales)), partes = rango.filter(l => suenan.has(l));
  const escritos = rango.filter(l => lineas[l].trim());
  if (!partes.length && !escritos.length) return false;
  if (!hacer) return true;
  const nuevas = lineas.slice();
  if (partes.length) {
    const todasCalladas = partes.every(l => calladasActuales.has(l));
    for (const l of partes) nuevas[l] = todasCalladas ? sinCallado(lineas[l], l) : conCallado(lineas[l], l);
    reescribirRenglones(lineas, nuevas, partes[0]);
  } else {
    const apuntes = escritos.every(l => /^\s*\*/.test(lineas[l]));
    for (const l of escritos) nuevas[l] = apuntes ? lineas[l].replace(/^(\s*)\*\s?/, '$1') : '* ' + lineas[l];
    reescribirRenglones(lineas, nuevas, escritos[0]);
  }
  return true;
};
atajo('Mod-/', 'callar o que suene', callarOApuntar);
