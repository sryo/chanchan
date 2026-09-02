// --------------------------------------------- editar varios de una vez
const PLURAL = { nota: 'notas', paso: 'pasos', modificador: 'modificadores' };
const botonSel = document.createElement('button');
botonSel.id = 'seleccion';
colgar(botonSel, 2);
document.body.appendChild(botonSel);
let tokensSel = [];

// los tokens de la selección siguen al texto; los que se fueron, se van
alCambiar.push(pasos => {
  tokensSel = tokensSel.map(t => {
    const r = mapearRango({ desde: t.abs, hasta: t.abs + t.len }, pasos);
    return r && { ...t, abs: r.desde, len: r.hasta - r.desde };
  }).filter(Boolean);
});

function tokensEnSeleccion() {
  const a = src.selectionStart, b = src.selectionEnd;
  if (a === b) return [];
  const lineas = src.value.split('\n');
  const out = [];
  let base = 0;
  marcasActuales.forEach((tks, l) => {
    for (const t of tks || []) {
      // sólo los tipos que seccionesSeleccion() sabe editar
      if (!PLURAL[t.tipo]) continue;
      const ini = base + t.i;
      if (ini < b && ini + t.len > a) out.push({ ...t, l, abs: ini });
    }
    base += (lineas[l] || '').length + 1;
  });
  return out.sort((x, y) => x.abs - y.abs);
}

// ::selection es uno solo para todo el textarea: se tiñe mientras la selección
// no cruce de parte. Que el cursor tome color es el aviso de que la línea compiló
function tenirTextarea() {
  const a = resolver(src.selectionStart).l, fin = resolver(src.selectionEnd);
  const z = fin.i === 0 && fin.l > a ? fin.l - 1 : fin.l;
  const tocadas = [];
  for (let l = a; l <= z; l++) tocadas.push({ l });
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

// toda la operación es un grupo solo para atrás; la selección sigue sobre lo nuevo y el botón con ella
function aplicarAVarios(fn) {
  const pasos = [];
  for (const t of tokensSel) {
    const nuevo = fn(t);
    if (nuevo != null) pasos.push(paso(t.abs, src.value.substr(t.abs, t.len), nuevo));
  }
  if (pasos.length) aplicar(pasos);
}

// una orden: sin «hacer» sólo dice si entra, y el menú lo pinta en gris cuando no
const transponer = delta => hacer => {
  const notas = tokensSel.filter(t => t.raiz);
  if (!notas.length) return false;
  const semis = notas.map(semiDe);
  // el recorte es del grupo entero: nota por nota rompería los intervalos
  const d = delta > 0 ? Math.min(delta, SEMI_MAX - Math.max(...semis))
                      : Math.max(delta, SEMI_MIN - Math.min(...semis));
  if (!d) return false;
  if (hacer) aplicarAVarios(t => t.raiz ? notaDesdeSemi(semiDe(t) + d, t.acorde || '') : null);
  return true;
};

function seccionesSeleccion() {
  const que = tokensSel[0].tipo;
  const aTodos = (ops, hacer) => ops.map(o => ({ ...o, hacer: () => hacer(o) }));
  const campo = (ops, clave, vacio) =>
    aTodos([{ txt: vacio }].concat(ops), o => aplicarAVarios(t => armarNota({ ...t, [clave]: o.txt === vacio ? '' : o.txt })));
  if (que === 'nota') return [
    { titulo: 'transponer', ops: [['+1 octava',12],['+1 tono',2],['+1 semitono',1],
        ['−1 semitono',-1],['−1 tono',-2],['−1 octava',-12]]
        .map(([txt, d]) => ({ txt, orden: transponer(d) })) },
    ...CAMPOS_NOTA(vozDeLinea(tokensSel[0].l)).map(([titulo, clave, vacio, ofertas]) => ({ titulo, ops: campo(ofertas, clave, vacio) })),
  ];
  if (que === 'paso') return [
    { titulo: 'golpes', ops: aTodos(ofrecerGolpes(), o => aplicarAVarios(() => o.txt)) },
    { titulo: '', pie: true, ops: aTodos(ofrecerSilencios(), o => aplicarAVarios(() => o.txt)) },
  ];
  return [{ titulo: 'cómo', ops: aTodos(ofrecerModificadores(), o => aplicarAVarios(() => o.txt)) }];
}

botonSel.addEventListener('mousedown', e => {
  e.preventDefault();
  const secs = seccionesSeleccion();
  const r = botonSel.getBoundingClientRect();
  menu.classList.add('columnas');
  pintarPanel(menu, secs, null, tokensSel);
  mostrarPanel(menu, true);
  acomodar(menu, r);
});
invocaPanel(botonSel, menu);

document.addEventListener('selectionchange', () => { if (document.activeElement === src) mirarSeleccion(); });
