// ---------------------------------------------------------------- el editor
const src = document.getElementById('src');
const hl = document.getElementById('hl');
const cajaErr = document.getElementById('errores');
const btnEnlace = document.getElementById('enlace');
const campoNombre = document.getElementById('nombre');

// al cajón de los errores del idioma, que es donde ya se está mirando
function avisar(msg) {
  cajaErr.innerHTML += '<p>' + esc(msg) + '</p>';
}

const icono = (n, clase) =>
  '<svg class="i' + (clase ? ' ' + clase : '') + '"><use href="#i-' + n + '"/></svg>';

const dentroDe = (nodo, ...donde) => donde.some(el => el && el.contains(nodo));
// abrir lo que ya está abierto tira
const mostrarPanel = (el, si) => { if (el.matches(':popover-open') !== si) el.togglePopover(si); };

let relojDicho;
// el botón es un signo: la palabra aparece sólo cuando tiene algo que decir
function decirEnElEnlace(txt) {
  btnEnlace.textContent = txt;
  btnEnlace.classList.add('dicho');
  clearTimeout(relojDicho);
  relojDicho = setTimeout(() => {
    btnEnlace.innerHTML = icono('enlace');
    btnEnlace.classList.remove('dicho');
  }, 1800);
}
const btnTocar = document.getElementById('tocar');

let marcasActuales = [], calladasActuales = new Set();
// lo último que dijo traducir(); lo escribe sólo actualizar()
let actual = { renglones: [], vueltas: 1, tramos: [], tempos: [], espejos: [] };

// de los encabezados y no de la forma, que una sección recién abierta no está en
// ninguna; se queda con la primera grafía
const seccionesEscritas = () => {
  const vistas = new Map();
  for (const x of marcasActuales.flat())
    if (x && x.tipo === 'seccion' && !vistas.has(x.nombre)) vistas.set(x.nombre, x.escrito);
  return vistas;
};
let activos = new Set();

// el span se rehace en cada pintada: se busca por posición, no se guarda el nodo
const spanDe = a => a && hl.querySelector('span[data-l="' + a.l + '"][data-i="' + a.i + '"]');

// el ancho de una letra es lo que mide la franja del ▾; se vuelve a medir al entrar la tipografía
let _letra = 0, _renglon = 0;
function medirTipografia() {
  const probeta = document.createElement('span');
  probeta.textContent = '0'.repeat(10);
  probeta.style.cssText = 'position:absolute;visibility:hidden;white-space:pre';
  hl.appendChild(probeta);
  _letra = probeta.getBoundingClientRect().width / 10;
  probeta.remove();
  _renglon = parseFloat(getComputedStyle(hl).lineHeight);
}
const anchoManija = () => { if (!_letra) medirTipografia(); return _letra; };
const altoRenglon = () => { if (!_renglon) medirTipografia(); return _renglon; };

// ------------------------------------------- lo que cuelga de una palabra
// la fila: el ▾, el deshacer, el de la selección; cada botón se anota desde su archivo
const SANGRIA_COLGANTE = 6;
const colgantes = [];
const colgar = (el, lugar) => { colgantes[lugar] = el; };

function pegarA(el, ancla, sangria = SANGRIA_COLGANTE) {
  if (!spanDe(ancla)) { el.classList.remove('vivo'); el.colgadoDe = null; return false; }
  el.colgadoDe = ancla;
  el.sangria = sangria;
  el.classList.add('vivo');
  acomodarColgantes();
  return true;
}

function acomodarColgantes() {
  const fila = new Map();
  for (const el of colgantes.filter(Boolean)) el.classList.remove('junta', 'juntado');
  for (const el of colgantes.filter(Boolean)) {
    if (!el.classList.contains('vivo')) continue;
    const sp = spanDe(el.colgadoDe);
    // la palabra se fue: la borraron, o el renglón dejó de entenderse
    if (!sp) { el.classList.remove('vivo'); el.colgadoDe = null; continue; }
    // el último trozo de una palabra partida — ver REGLAS.md
    const cajas = sp.getClientRects();
    const r = cajas[cajas.length - 1] || sp.getBoundingClientRect();
    const clave = el.colgadoDe.l + ':' + el.colgadoDe.i;
    const antes = fila.get(clave);
    if (antes) { antes.el.classList.add('junta'); el.classList.add('juntado'); }
    const x = antes ? antes.x : r.right + el.sangria;
    el.style.left = Math.round(x) + 'px';
    el.style.top = Math.round(r.top + (r.height - el.offsetHeight) / 2) + 'px';
    // el que sigue pisa un píxel al anterior: el borde del medio es uno solo
    fila.set(clave, { x: x + el.offsetWidth - 1, el });
  }
}

// el realce cambia en cada cuadro: se prende y apaga en los spans que ya están, sin
// rehacer el espejo; pintar() anota qué dejó puesto para que realzar() sepa qué mover
let realzados = new Set(), conManija = null;
const claveManija = () => señalado && enElBoton() ? señalado.l + ':' + señalado.i : null;
const vivoDe = t => 'color-mix(in oklab,' + tramaDe(t.voz) + ' 30%,var(--fondo))';
const spanEn = clave => clave ? spanDe({ l: clave.split(':')[0], i: clave.split(':')[1] }) : null;
const marcaEn = clave => {
  const [l, i] = clave.split(':').map(Number);
  return (marcasActuales[l] || []).find(x => x.i === i);
};

function realzar(nuevos = activos) {
  activos = nuevos;
  for (const clave of realzados) if (!activos.has(clave)) {
    const s = spanEn(clave);
    if (s) { s.classList.remove('t-activo'); s.style.removeProperty('--vivo'); }
  }
  for (const clave of activos) if (!realzados.has(clave)) {
    const s = spanEn(clave), t = marcaEn(clave);
    if (!s) continue;
    s.classList.add('t-activo');
    if (t && t.voz) s.style.setProperty('--vivo', vivoDe(t));
  }
  realzados = new Set(activos);
  const ahora = claveManija();
  if (ahora === conManija) return;
  const viejo = spanEn(conManija), nuevo = spanEn(ahora);
  if (viejo) viejo.classList.remove('t-manija');
  if (nuevo) nuevo.classList.add('t-manija');
  conManija = ahora;
}

function pintar(marcas) {
  marcasActuales = marcas;
  const lineas = src.value.split('\n');
  hl.innerHTML = lineas.map((l, n) => {
    const tk = (marcas[n] || []).slice().sort((a, b) => a.i - b.i);
    let out = '', cur = 0;
    // no hay geometría del cursor en ningún lado y con pre-wrap no se calcula:
    // un span vacío acá mide exacto y no corre el texto
    const anc = anclaCaret && anclaCaret.l === n ? anclaCaret.c : -1;
    let ancPuesto = false;
    const plano = (a, z) => {
      if (ancPuesto || anc < a || anc > z) return esc(l.slice(a, z));
      ancPuesto = true;
      return esc(l.slice(a, anc)) + '<span id="ancla"></span>' + esc(l.slice(anc, z));
    };
    for (const t of tk) {
      if (t.i < cur) continue;
      out += plano(cur, t.i);
      if (!ancPuesto && anc >= t.i && anc <= t.i + t.len) { ancPuesto = true; out += '<span id="ancla"></span>'; }
      const vivo = activos.has(n + ':' + t.i) ? ' t-activo' : '';
      const esEditable = t.tipo && t.tipo !== 'mal' ? ' t-editable' : '';
      const bajoElMouse = !(señalado && señalado.l === n && señalado.i === t.i) ? ''
        : enElBoton() ? ' t-manija' : '';
      const datos = t.tipo ? ' data-tipo="' + t.tipo + '" data-l="' + n + '" data-i="' + t.i + '" data-len="' + t.len + '"' : '';
      const alto = t.alto ? ' data-alto="' + t.alto + '"' : '';
      // el color sale de la rueda; el realce va como variable, así .t-activo sigue siendo una sola regla
      const tinte = !t.voz ? ''
        : t.cls === 'sujeto' ? ' style="color:' + tintaDe(t.voz) + '"'
        // el instrumento dice quién: del color de la parte, un escalón atrás del sujeto
        : t.tipo === 'instrumento' ? ' style="color:color-mix(in oklab,' + tintaDe(t.voz) + ' 62%,var(--fondo))"'
        : vivo ? ' style="--vivo:' + vivoDe(t) + '"'
        : '';
      // el span de afuera es el que sigue midiendo para el ▾ y para el realce
      const crudo = l.substr(t.i, t.len);
      const cuerpo = t.raizLen && t.raizLen < t.len
        ? esc(crudo.slice(0, t.raizLen)) + '<span class="t-cola">' + esc(crudo.slice(t.raizLen)) + '</span>'
        : esc(crudo);
      out += '<span class="t-' + t.cls + vivo + esEditable + bajoElMouse + '"' + datos + alto + tinte + '>' +
        cuerpo + '</span>';
      cur = t.i + t.len;
    }
    return out + plano(cur, l.length);
    // sin '\n' al final: el texto ya termina en uno, y un renglón de más le pone a
    // #hl una barra que #src no tiene, y ahí las líneas largas cortan distinto
  }).join('\n');
  hl.scrollTop = src.scrollTop;
  realzados = new Set(activos);
  conManija = claveManija();
}

const baseDe = (lineas, l) => lineas.slice(0, l).reduce((n, x) => n + x.length + 1, 0);

// asignar .value manda el cursor al final; esto lo devuelve
function escribir(txt, desde, hasta) {
  const a = desde ?? src.selectionStart, z = hasta ?? desde ?? src.selectionEnd;
  src.value = txt;
  src.setSelectionRange(Math.min(a, txt.length), Math.min(z, txt.length));
}

function asegurarRenglonFinal() {
  if (/\n$/.test(src.value)) return;
  const a = src.selectionStart, z = src.selectionEnd;
  src.value += '\n';
  src.setSelectionRange(a, z);
}

// al ritmo de la tecla, sin esperar a strudel: si los puntitos esperan, su data-l
// queda viejo y un click calla la línea de al lado
function repintarTexto() {
  const r = traducir(src.value);
  calladasActuales = r.calladas;
  repartirLaLuz(r.marcas);
  pintar(r.marcas);
  armarPuntos(r.marcas, r.calladas, r.renglones);
}

function actualizar(reproducir) {
  asegurarRenglonFinal();
  guardar();
  const r = traducir(src.value);
  calladasActuales = r.calladas;
  // strudel se consulta sólo acá, una vez por vuelta: los golpes quedan en el renglón;
  // y cada parte se prueba sola: si falla, se cae ella y no el tema entero
  if (motorListo) {
    for (const x of r.renglones) {
      try { x.pat = eval(x.cotejo); } catch (e) { x.pat = null; }
      x.golpes = x.pat && golpesDe(x.pat, r.vueltas);
    }
    const vivas = r.partes.filter(p => {
      try { eval(p.codigo).queryArc(0, 1); return true; }
      catch (e) {
        r.errores.push({ nro: p.nro, msg: 'strudel no pudo con esta línea, la salteo: ' + String(e.message || e) });
        return false;
      }
    });
    if (vivas.length < r.partes.length) { r.partes = vivas; r.codigo = armarCodigo(vivas, r.tramos, r.bpm, r.tiempos); }
  }
  // las calladas y las que strudel rechazó están escritas, pero no suenan
  const suenan = new Set(r.partes.map(p => p.nro));
  actual = { renglones: r.renglones, vueltas: r.vueltas, tramos: r.tramos, tempos: r.tempos,
             espejos: r.renglones.filter(x => x.pat && suenan.has(x.nro)) };
  // la luz se reparte antes de que algo pregunte por un color
  repartirLaLuz(r.marcas);
  pintar(r.marcas);
  armarPuntos(r.marcas, r.calladas);
  dibujarCinta(r.renglones);
  pintarMarca(r.renglones);
  cajaErr.innerHTML = r.errores.map(e =>
    '<p><b>línea ' + e.nro + ':</b> ' + esc(e.msg) + '</p>').join('');
  if (reproducir) seguirElTema(r);
  return r;
}

// el espejo y los puntitos al momento; lo que necesita a strudel, a los 400 ms
let relojActualizar;
src.addEventListener('input', () => {
  asegurarRenglonFinal();
  clearTimeout(relojActualizar);
  relojActualizar = setTimeout(() => actualizar(true), 400);
  registrarTecla();
  repintarTexto();
});
// primero el espejo: los puntitos se posicionan a partir de los spans de #hl
src.addEventListener('scroll', () => {
  hl.scrollTop = src.scrollTop;
  hl.scrollLeft = src.scrollLeft;
  armarPuntos(marcasActuales, calladasActuales);
  cerrarMenu();
  // al ▾ lo reacomoda cerrarMenu; al de deshacer hay que reacomodarlo acá
  acomodarColgantes();
});
