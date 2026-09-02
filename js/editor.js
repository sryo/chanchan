// ---------------------------------------------------------------- el editor
const src = document.getElementById('src');
const hl = document.getElementById('hl');
const cajaErr = document.getElementById('errores');
const btnEnlace = document.getElementById('enlace');
const campoNombre = document.getElementById('nombre');

// al cajón de los errores del idioma, que es donde ya se está mirando. El mismo
// aviso no se repite; y puede traer un botón que lo deshace: [rótulo, qué hacer]
function avisar(msg, deshace) {
  if ([...cajaErr.children].some(p => p.dataset.msg === msg)) return;
  const p = document.createElement('p');
  p.dataset.msg = msg;
  p.textContent = msg;
  if (deshace) {
    const b = document.createElement('button');
    b.className = 'volver';
    b.textContent = deshace[0];
    b.addEventListener('click', () => { deshace[1](); p.remove(); });
    p.append(' ', b);
  }
  cajaErr.appendChild(p);
}

const icono = (n, clase) =>
  '<svg class="i' + (clase ? ' ' + clase : '') + '"><use href="#i-' + n + '"/></svg>';

const dentroDe = (nodo, ...donde) => donde.some(el => el && el.contains(nodo));
// abrir lo que ya está abierto tira
const mostrarPanel = (el, si) => { if (el.matches(':popover-open') !== si) el.togglePopover(si); };
// el botón abre y cierra en su mousedown; como invocador, soltar el click sobre él no cuenta como «afuera»
const invocaPanel = (boton, panel) => {
  boton.popoverTargetElement = panel;
  boton.addEventListener('click', e => e.preventDefault());
};

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
const seccionesEscritas = () => new Map(encabezados().reverse().map(e => [e.nombre, e.escrito]));
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
  if (!spanDe(ancla)) { el.classList.remove('vivo'); el.colgadoDe = null; acomodarColgantes(); return false; }
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
// rehacer el espejo
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
    for (const t of tk) {
      if (t.i < cur) continue;
      out += esc(l.slice(cur, t.i));
      const esEditable = t.tipo && t.tipo !== 'mal' ? ' t-editable' : '';
      const datos = t.tipo ? ' data-tipo="' + t.tipo + '" data-l="' + n + '" data-i="' + t.i + '" data-len="' + t.len + '"' : '';
      const alto = t.alto ? ' data-alto="' + t.alto + '"' : '';
      // el color sale de la rueda; el realce y la manija los pone decorar() sobre los spans
      const tinte = !t.voz ? ''
        : t.cls === 'sujeto' ? ' style="color:' + tintaDe(t.voz) + '"'
        // el instrumento dice quién: del color de la parte, un escalón atrás del sujeto
        : t.tipo === 'instrumento' ? ' style="color:color-mix(in oklab,' + tintaDe(t.voz) + ' 62%,var(--fondo))"'
        : '';
      // el span de afuera es el que sigue midiendo para el ▾ y para el realce
      const crudo = l.substr(t.i, t.len);
      const cuerpo = t.raizLen && t.raizLen < t.len
        ? esc(crudo.slice(0, t.raizLen)) + '<span class="t-cola">' + esc(crudo.slice(t.raizLen)) + '</span>'
        : esc(crudo);
      out += '<span class="t-' + t.cls + esEditable + '"' + datos + alto + tinte + '>' + cuerpo + '</span>';
      cur = t.i + t.len;
    }
    return out + esc(l.slice(cur));
    // el salto de más: un pre no dibuja la fila vacía de después del último salto y el
    // textarea sí; sin él, al fondo de la hoja el espejo queda una fila más arriba
  }).join('\n') + '\n';
  hl.scrollTop = src.scrollTop;
  decorar();
}

// lo que no es del documento, el realce del reloj y la manija del mouse, va encima
// de los spans recién puestos: pintar() no lo sabe
function decorar() {
  realzados = new Set();
  conManija = null;
  realzar();
}

// la caja del glifo que está en pos, medida en el espejo, que es glifo a glifo el
// textarea; se mide el glifo y no un punto, porque un punto en el corte de una
// fila cae en la fila de arriba
function rectDe(pos) {
  const camino = document.createTreeWalker(hl, NodeFilter.SHOW_TEXT);
  let nodo = null, base = 0, ultimo = null;
  for (let n; (n = camino.nextNode());) {
    if (pos < base + n.data.length) { nodo = n; break; }
    base += n.data.length; ultimo = n;
  }
  const rango = document.createRange();
  const caja = c => ({ left: c.left, right: c.left, top: c.top, bottom: c.bottom });
  if (nodo && nodo.data[pos - base] !== '\n') {
    rango.setStart(nodo, pos - base); rango.setEnd(nodo, pos - base + 1);
    const c = rango.getClientRects()[0];
    if (c) return caja(c);
  }
  // sin glifo, al final de un renglón, un rango vacío no mide: un span vacío puesto
  // un instante sí, y ahí no hay corte de fila que lo confunda
  if (nodo) rango.setStart(nodo, pos - base);
  else if (ultimo) rango.setStart(ultimo, ultimo.data.length);
  else return caja(hl.getBoundingClientRect());
  rango.collapse(true);
  const marca = document.createElement('span');
  rango.insertNode(marca);
  const c = marca.getBoundingClientRect();
  const padre = marca.parentNode;
  marca.remove();
  padre.normalize();
  return caja(c);
}

const baseDe = (lineas, l) => lineas.slice(0, l).reduce((n, x) => n + x.length + 1, 0);
// dónde empieza el renglón de una posición; lastIndexOf con -1 miraría el 0
const inicioDeRenglon = (txt, pos) => pos > 0 ? txt.lastIndexOf('\n', pos - 1) + 1 : 0;
// de una posición en el texto a {l, i}, que es lo que miden los spans
function resolver(pos, txt = src.value) {
  const l = txt.slice(0, pos).split('\n').length - 1;
  return { l, i: pos - inicioDeRenglon(txt, pos) };
}
const anclaDe = (pos, len) => ({ ...resolver(pos), len });

// asignar .value manda el cursor al final; esto lo devuelve
function escribir(txt, a, z) {
  src.value = txt;
  src.setSelectionRange(Math.min(a, txt.length), Math.min(z, txt.length));
}

// quien tenga posiciones guardadas se anota acá y las corre cuando el texto cambia;
// «viejo» es el texto de antes, que es donde valen las posiciones que tiene
const alCambiar = [];
const avisarCambio = (pasos, viejo) => { for (const f of alCambiar) f(pasos, viejo); };

// un ancla {l, i, len} de antes, después de los pasos; null si lo que anclaba se fue.
// Sin len es un punto, y «lado» dice adónde va si le insertan encima
function mapearAncla(a, pasos, viejo, lado = 1) {
  if (!a) return a;
  const desde = baseDe(viejo.split('\n'), a.l) + a.i;
  if (a.len == null) return { ...a, ...resolver(mapearPor(desde, pasos, lado)) };
  const r = mapearRango({ desde, hasta: desde + a.len }, pasos);
  return r && { ...a, ...resolver(r.desde), len: r.hasta - r.desde };
}

// toda edición entra por acá, ver REGLAS.md. Varios pasos sobre el mismo texto van
// de atrás para adelante, así ninguno corre al otro
let nGesto = 0;
function aplicar(pasos, { cursor, sel, grupo } = {}) {
  pasos = [].concat(pasos).sort((a, b) => b.desde - a.desde);
  const selAntes = { a: src.selectionStart, z: src.selectionEnd };
  let txt = src.value;
  for (const p of pasos) txt = aplicarPaso(txt, p);
  const viejo = src.value;
  const [a, z] = sel || [cursor ?? mapearPor(selAntes.a, pasos, -1), cursor ?? mapearPor(selAntes.z, pasos, -1)];
  escribir(txt, a, z);
  anotarPasos(pasos, selAntes, grupo ?? 'gesto' + ++nGesto);
  avisarCambio(pasos, viejo);
  actualizar(true);
}

// los que cuelgan de una palabra la siguen cuando el texto cambia antes de ella
alCambiar.push((pasos, viejo) => {
  for (const el of colgantes) if (el && el.colgadoDe) el.colgadoDe = mapearAncla(el.colgadoDe, pasos, viejo);
});

function asegurarRenglonFinal() {
  if (/\n$/.test(src.value)) return;
  const a = src.selectionStart, z = src.selectionEnd;
  src.value += '\n';
  src.setSelectionRange(a, z);
}

// al ritmo de la tecla, sin esperar a strudel: si los puntitos esperan, su data-l
// queda viejo y un click calla la línea de al lado
function repintarTexto() {
  pintarHoja(traducir(src.value));
}

// la luz se reparte antes de que algo pregunte por un color
function pintarHoja(r) {
  calladasActuales = r.calladas;
  repartirLaLuz(r.marcas);
  pintar(r.marcas);
  armarPuntos(r.marcas, r.calladas, r.renglones);
  acomodarColgantes();
}

function actualizar(reproducir) {
  asegurarRenglonFinal();
  guardar();
  const r = traducir(src.value);
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
  pintarHoja(r);
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
  anotarTecleo();
  repintarTexto();
});
// primero el espejo: los puntitos se posicionan a partir de los spans de #hl
src.addEventListener('scroll', () => {
  hl.scrollTop = src.scrollTop;
  hl.scrollLeft = src.scrollLeft;
  armarPuntos(marcasActuales, calladasActuales);
  cerrarMenu();
});
