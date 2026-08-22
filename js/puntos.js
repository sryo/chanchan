// ------------------------------------------------- silenciar una línea
// los puntitos del margen son un atajo para escribir «callado» — ver REGLAS.md
const puntos = document.createElement('div');
puntos.id = 'puntos';
document.querySelector('.wrap').appendChild(puntos);

// el parser acepta «callado» en cualquier cláusula, así que no se busca al final
const sacarCallado = ln => ln.replace(/\s*,\s*callado\b/i, '');
const ponerCallado = ln => sacarCallado(ln) + ', callado';

// tienen menú pero no son partes: nada que callar
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
  const lineas = src.value.split('\n');
  const partes = lineasQueSuenan(marcasActuales);
  if (solo) {
    const otras = partes.filter(i => i !== l);
    // si ya estaban todas calladas, el mismo gesto las devuelve
    const todasMudas = otras.every(i => calladasActuales.has(i));
    otras.forEach(i => { lineas[i] = todasMudas ? sacarCallado(lineas[i]) : ponerCallado(lineas[i]); });
    lineas[l] = sacarCallado(lineas[l]);
  } else {
    lineas[l] = calladasActuales.has(l) ? sacarCallado(lineas[l]) : ponerCallado(lineas[l]);
  }
  escribir(lineas.join('\n'));
  registrar(src.value, null);      // solo o silencio, un solo paso para atrás
  actualizar(true);
}
