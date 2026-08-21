// --------------------------------------------- editar varios de una vez
const PLURAL = { nota: 'notas', paso: 'pasos', modificador: 'modificadores' };
const botonSel = document.createElement('button');
botonSel.id = 'seleccion';
document.body.appendChild(botonSel);
let tokensSel = [];

// los tokens que caen dentro de la selección, con su posición absoluta en el texto
function tokensEnSeleccion() {
  const a = src.selectionStart, b = src.selectionEnd;
  if (a === b) return [];
  const bases = []; let acum = 0;
  for (const ln of src.value.split('\n')) { bases.push(acum); acum += ln.length + 1; }
  const out = [];
  marcasActuales.forEach((tks, l) => {
    for (const t of tks || []) {
      // sólo los tipos que seccionesSeleccion() sabe editar: con otros el
      // botón salía rotulado «2 undefined» y no hacía nada al apretarlo
      if (!PLURAL[t.tipo]) continue;
      const ini = bases[l] + t.i;
      if (ini < b && ini + t.len > a) out.push({ ...t, l, abs: ini });
    }
  });
  return out.sort((x, y) => x.abs - y.abs);
}

// El resaltado y el cursor son de la parte sobre la que caen. Eran lo último que
// seguía pintándose de un color ajeno encima de las palabras de un renglón, y
// quedaba un lavado rojo sobre palabras verdes. ::selection es uno solo para todo el
// textarea y no puede ir renglón por renglón, así que se tiñe mientras la
// selección no se salga de una parte —que es como se selecciona casi siempre—; en
// cuanto cruza de una a otra se queda sin dueño y cae en la tinta de la página.
// Con el cursor solo el renglón es uno y siempre hay dueño, salvo mientras la
// línea todavía no se entiende: ahí el cursor va en tinta común, y en cuanto el
// idioma la reconoce toma color. Es un aviso gratis de que la línea compiló.
function tenirTextarea() {
  const a = src.selectionStart, b = src.selectionEnd;
  const tocadas = [];
  let ini = 0;
  for (const [l, ln] of src.value.split('\n').entries()) {
    if (ini <= b && ini + ln.length >= a) tocadas.push({ l, tipo: esTempo(ln) ? 'tempo' : '' });
    ini += ln.length + 1;
  }
  pintarDeQuien(src, tocadas);
}

function mirarSeleccion() {
  tenirTextarea();
  const toks = tokensEnSeleccion();
  const tipos = new Set(toks.map(t => t.tipo));
  if (toks.length < 2 || tipos.size > 1) { botonSel.classList.remove('vivo'); tokensSel = []; return; }
  tokensSel = toks;
  pintarDeQuien(botonSel, toks);
  botonSel.textContent = '▾ ' + toks.length + ' ' + PLURAL[[...tipos][0]];
  pegarA(botonSel, toks[toks.length - 1]);
}

// se reescribe de derecha a izquierda: si no, cada cambio corre los offsets que siguen
function aplicarAVarios(fn) {
  let txt = src.value;
  for (const t of tokensSel.slice().sort((a, b) => b.abs - a.abs)) {
    const nuevo = fn(t);
    if (nuevo != null) txt = txt.slice(0, t.abs) + nuevo + txt.slice(t.abs + t.len);
  }
  escribir(txt);
  registrar(src.value, null);      // toda la operación es un paso solo
  actualizar(true);
  botonSel.classList.remove('vivo');
}

function transponer(delta) {
  const notas = tokensSel.filter(t => t.raiz);
  if (!notas.length) return;
  const semis = notas.map(semiDe);
  // el recorte se calcula para el grupo entero: recortando nota por nota se
  // romperían los intervalos y la melodía quedaría aplastada
  const d = delta > 0 ? Math.min(delta, SEMI_MAX - Math.max(...semis))
                      : Math.max(delta, SEMI_MIN - Math.min(...semis));
  if (!d) return;
  aplicarAVarios(t => t.raiz ? notaDesdeSemi(semiDe(t) + d, t.acorde || '') : null);
}

function seccionesSeleccion() {
  const que = tokensSel[0].tipo;
  if (que === 'nota') return [
    { titulo: 'transponer', ops: [['+1 octava',12],['+1 tono',2],['+1 semitono',1],
        ['−1 semitono',-1],['−1 tono',-2],['−1 octava',-12]]
        .map(([txt, d]) => ({ txt, hacer: () => transponer(d) })) },
    { titulo: 'medio tono', ops: [{ txt: 'sin alterar', v: '' }]
        .concat(Object.keys(ALTERACIONES).map(v => ({ txt: v, v })))
        .map(o => ({ txt: o.txt, hacer: () => aplicarAVarios(t => armarNota({ ...t, altN: o.v })) })) },
    { titulo: 'altura', detalle: true, ops: [{ txt: 'normal', v: '' }]
        .concat(Object.keys(OCTAVAS).map(v => ({ txt: v, v })))
        .map(o => ({ txt: o.txt, hacer: () => aplicarAVarios(t => armarNota({ ...t, octN: o.v })) })) },
    { titulo: 'acorde', ops: [{ txt: 'una nota sola', v: '' }]
        .concat(Object.keys(ACORDES).map(v => ({ txt: v, v })))
        .map(o => ({ txt: o.txt, hacer: () => aplicarAVarios(t => armarNota({ ...t, acorde: o.v })) })) },
  ];
  if (que === 'paso') return [
    { titulo: 'golpes', ops: Object.entries(SONIDOS).map(([p, [, d]]) =>
        ({ txt: p, desc: d, receta: recetaDe('golpe', p), hacer: () => aplicarAVarios(() => p) })) },
    { titulo: 'o nada', pie: true, ops: [
        { txt: '-', desc: 'este paso queda en silencio', hacer: () => aplicarAVarios(() => '-') },
        { txt: '_', desc: 'sigue sonando la anterior',   hacer: () => aplicarAVarios(() => '_') }] },
  ];
  if (que === 'modificador') return [
    { titulo: 'cómo', ops: MODIFICADORES.map(m =>
        ({ txt: m[0], desc: m[2], hacer: () => aplicarAVarios(() => m[0]) })) }];
  return null;
}

botonSel.addEventListener('mousedown', e => {
  e.preventDefault();
  const secs = seccionesSeleccion();
  if (!secs) return;
  const r = botonSel.getBoundingClientRect();
  menu.classList.add('columnas');
  pintarPanel(menu, secs, null, tokensSel);
  menu.classList.add('abierto');
  menu.style.top = (r.bottom + 4) + 'px';
  menu.style.left = Math.max(8, Math.min(r.left, innerWidth - menu.offsetWidth - 8)) + 'px';
});

document.addEventListener('selectionchange', () => { if (document.activeElement === src) mirarSeleccion(); });
