// ------------------------------------------------- silenciar una línea
// «callado» es una palabra del idioma y no un estado escondido de la interfaz:
// acá el texto es el tema, así que si mandás un enlace tiene que sonar igual.
// Los puntitos del margen son un atajo para escribirla.
const puntos = document.createElement('div');
puntos.id = 'puntos';
document.querySelector('.wrap').appendChild(puntos);

// el parser acepta «callado» en cualquier cláusula, así que preguntarle a él y
// no a una regex que lo exige al final: si no, «pum, callado, fuerte» sale
// silenciado por el compilador y el puntito lo muestra sonando
const sacarCallado = ln => ln.replace(/\s*,\s*callado\b/i, '');
const ponerCallado = ln => sacarCallado(ln) + ', callado';

function lineasQueSuenan(marcas) {
  return marcas.map((tks, l) =>
    (tks || []).some(t => t.tipo && t.tipo !== 'tempo' && t.tipo !== 'mal') ? l : -1)
    .filter(l => l >= 0);
}

function armarPuntos(marcas, calladas, renglones = renglonesActuales) {
  const caja = hl.getBoundingClientRect();
  const color = new Map(renglones.map(r => [r.nro - 1, colorDe(r.voz)]));
  puntos.innerHTML = '';
  for (const l of lineasQueSuenan(marcas)) {
    const sp = hl.querySelector('span[data-l="' + l + '"]');
    if (!sp) continue;
    const sr = sp.getBoundingClientRect();
    const y = sr.top - caja.top;
    if (y < 0 || y > caja.height) continue;
    const b = document.createElement('button');
    b.className = 'punto' + (calladas.has(l) ? ' callado' : '');
    // el punto es la franja de la cinta vista de canto: mismo color, misma parte
    if (color.has(l)) b.style.color = color.get(l);
    b.dataset.l = l;
    b.title = 'silenciar · may+click deja sólo ésta';
    puntos.appendChild(b);
    // centrado contra el alto real del renglón: si cambia la fuente sigue andando
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
