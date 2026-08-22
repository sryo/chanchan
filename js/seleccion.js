// --------------------------------------------- editar varios de una vez
const PLURAL = { nota: 'notas', paso: 'pasos', modificador: 'modificadores' };
const botonSel = document.createElement('button');
botonSel.id = 'seleccion';
colgar(botonSel, 2);
document.body.appendChild(botonSel);
let tokensSel = [];

function tokensEnSeleccion() {
  const a = src.selectionStart, b = src.selectionEnd;
  if (a === b) return [];
  const bases = []; let acum = 0;
  for (const ln of src.value.split('\n')) { bases.push(acum); acum += ln.length + 1; }
  const out = [];
  marcasActuales.forEach((tks, l) => {
    for (const t of tks || []) {
      // sólo los tipos que seccionesSeleccion() sabe editar
      if (!PLURAL[t.tipo]) continue;
      const ini = bases[l] + t.i;
      if (ini < b && ini + t.len > a) out.push({ ...t, l, abs: ini });
    }
  });
  return out.sort((x, y) => x.abs - y.abs);
}

// ::selection es uno solo para todo el textarea: se tiñe mientras la selección
// no cruce de parte. Que el cursor tome color es el aviso de que la línea compiló
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
  if (toks.length < 2 || tipos.size > 1) {
    tokensSel = [];
    if (botonSel.classList.contains('vivo')) { botonSel.classList.remove('vivo'); acomodarColgantes(); }
    return;
  }
  tokensSel = toks;
  pintarDeQuien(botonSel, toks);
  botonSel.innerHTML = icono('chevron', 'chica') + toks.length + ' ' + PLURAL[[...tipos][0]];
  pegarA(botonSel, toks[toks.length - 1]);
}

// de derecha a izquierda: así ningún cambio corre los offsets que siguen
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
  // el recorte es del grupo entero: nota por nota rompería los intervalos
  const d = delta > 0 ? Math.min(delta, SEMI_MAX - Math.max(...semis))
                      : Math.max(delta, SEMI_MIN - Math.min(...semis));
  if (!d) return;
  aplicarAVarios(t => t.raiz ? notaDesdeSemi(semiDe(t) + d, t.acorde || '') : null);
}

function seccionesSeleccion() {
  const que = tokensSel[0].tipo;
  const aTodos = (ops, hacer) => ops.map(o => ({ ...o, hacer: () => hacer(o) }));
  const campo = (ops, clave, vacio) =>
    aTodos([{ txt: vacio }].concat(ops), o => aplicarAVarios(t => armarNota({ ...t, [clave]: o.txt === vacio ? '' : o.txt })));
  if (que === 'nota') return [
    { titulo: 'transponer', ops: [['+1 octava',12],['+1 tono',2],['+1 semitono',1],
        ['−1 semitono',-1],['−1 tono',-2],['−1 octava',-12]]
        .map(([txt, d]) => ({ txt, hacer: () => transponer(d) })) },
    { titulo: 'medio tono', ops: campo(ofrecerAlteraciones(), 'altN', 'sin alterar') },
    { titulo: 'altura', detalle: true, ops: campo(ofrecerOctavas(), 'octN', 'normal') },
    { titulo: 'acorde', ops: campo(ofrecerAcordes(), 'acorde', 'una nota sola') },
  ];
  if (que === 'paso') return [
    { titulo: 'golpes', ops: aTodos(ofrecerGolpes(), o => aplicarAVarios(() => o.txt)) },
    { titulo: '', pie: true, ops: aTodos(ofrecerSilencios(), o => aplicarAVarios(() => o.txt)) },
  ];
  if (que === 'modificador') return [
    { titulo: 'cómo', ops: aTodos(ofrecerModificadores(), o => aplicarAVarios(() => o.txt)) }];
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
  acomodar(menu, r);
});

document.addEventListener('selectionchange', () => { if (document.activeElement === src) mirarSeleccion(); });
