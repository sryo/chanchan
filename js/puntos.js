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
    b.title = 'silenciar · may+click deja sólo ésta';
    // se rehacen en cada tecleo, y el que la franja tiene señalado no se puede perder
    if (l === franjaSeñalada) b.classList.add('senalado');
    puntos.appendChild(b);
    // después de colgarlo: suelto, offsetHeight mide cero
    b.style.top = (y + (sr.height - b.offsetHeight) / 2) + 'px';
  }
}

puntos.addEventListener('mousedown', e => {
  const b = e.target.closest('.punto');
  if (!b) return;
  e.preventDefault();
  alternarCallado(+b.dataset.l, e.shiftKey);
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
  // un paso por renglón tocado; solo o silencio, un solo grupo para atrás
  const pasos = [];
  let base = 0;
  lineas.forEach((ln, k) => { if (nuevas[k] !== ln) pasos.push(paso(base, ln, nuevas[k])); base += ln.length + 1; });
  if (pasos.length) aplicar(pasos);
}
