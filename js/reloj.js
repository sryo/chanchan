// ------------------------------------------------- qué se está tocando ahora
// getTime() es el reloj de strudel, contado en vueltas
let claveActivos = '', tempoPuesto = null;    // el tempo que el reloj tiene ahora, {bpm, tiempos}
const SIN_SONIDO = 'no se pudo cargar el sonido: fijate la conexión y recargá.';
let sonando = false, ultimoCodigo = '', motorListo = false;
let tocarAlLevantar = false;
// dónde arranca a sonar el tema: el reloj de strudel sigue su cuenta, y el tema va corrido esta cantidad
// de vueltas. No es del documento: es desde dónde se escucha, como adelantar una grabación
let desdeVuelta = 0;
const enElTema = () => getTime() + desdeVuelta;
// la sección que suena, para marcarla en el texto; null parado o sin secciones
let tramoSonando = null, clavesDelTramo = [];
function motorLevantado() {
  motorListo = true;
  callarAviso('motor');
  if (tocarAlLevantar) { tocarAlLevantar = false; alternarTocar(); }
}

function seguirTempo(t) {
  if (!actual.tempos.length) return;
  const v = Math.max(1, actual.vueltas);
  const donde = ((t % v) + v) % v;
  let cual = actual.tempos[0];
  for (const x of actual.tempos) if (donde >= x.desde) cual = x;
  if (tempoPuesto && tempoPuesto.bpm === cual.bpm && tempoPuesto.tiempos === cual.tiempos) return;
  tempoPuesto = cual;
  ponerTempo(cual.bpm, cual.tiempos);
}

function seguir() {
  requestAnimationFrame(seguir);
  moverAguja();
  const nuevos = new Set();
  if (sonando) {
    let t;
    try { t = enElTema(); } catch (e) { t = null; }
    marcarTramo(t);
    for (const c of clavesDelTramo) nuevos.add(c);
    if (t != null) for (const e of actual.espejos) {
      let haps;
      try { haps = e.pat.queryArc(t, t + 0.0001); } catch (err) { continue; }
      for (const h of haps) {
        const p = e.lugares[h.value && h.value.n];
        if (p) nuevos.add((e.nro - 1) + ':' + p.i);
      }
    }
  }
  if (!sonando && tramoSonando != null) marcarTramo(null);
  const clave = [...nuevos].sort().join('|');
  if (clave === claveActivos) return;
  claveActivos = clave;
  realzar(nuevos);
}

// en qué tramo de la forma cae la vuelta t; cambia sólo al cruzar un borde de sección
function tramoEn(t) {
  if (t == null || !actual.tramos.length) return null;
  const v = Math.max(1, actual.vueltas), donde = ((t % v) + v) % v;
  let desde = 0;
  for (let k = 0; k < actual.tramos.length; k++) {
    desde += actual.tramos[k].largo;
    if (donde < desde) return k;
  }
  return actual.tramos.length - 1;
}
// la hoja o la cinta se rehicieron: la sección que suena se vuelve a buscar en el cuadro que sigue
function olvidarTramo() { tramoSonando = undefined; }

// el encabezado de la sección que suena y su nombre en la forma se encienden, en tinta de página
function marcarTramo(t) {
  const k = tramoEn(t);
  if (k === tramoSonando) return;
  tramoSonando = k;
  clavesDelTramo = [];
  if (k != null) marcasActuales.forEach((tks, l) => (tks || []).forEach(x => {
    if ((x.tipo === 'seccion' && x.nombre === actual.tramos[k].nom) || (x.tipo === 'forma' && x.tramo === k))
      clavesDelTramo.push(l + ':' + x.i);
  }));
  rotuloSonando(k);
}

// rAF se frena en una pestaña escondida y strudel sigue; y un cuadro ya es tarde: strudel
// agenda hasta un cuarto de segundo adelante, así que se mira 0,2 s adelante
const ADELANTE = 0.2;
function tempoQueViene() {
  let t;
  try { t = enElTema(); } catch (e) { return; }
  const p = tempoPuesto || actual.tempos[0] || { bpm: 90, tiempos: 4 };
  seguirTempo(t + ADELANTE * p.bpm / (60 * p.tiempos));     // contado en vueltas
}
setInterval(() => { if (sonando) tempoQueViene(); }, 40);

// hush() corta el reloj pero no las notas que ya salieron: sin apagar el audio queda la cola
function silenciar() {
  hush();
  // el último stack evaluado queda cargado y lo que arranque el reloj lo reviviría;
  // con un silencio cargado, revive el silencio
  Promise.resolve(evaluate('silence')).catch(() => { /* strudel a medio cargar */ });
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'running') ctx.suspend();
}

function despertar() {
  const ctx = getAudioContext();
  // en iOS una llamada o cambiar de app lo deja «interrupted», no «suspended»
  if (ctx && ctx.state !== 'running') return ctx.resume();
}

// el tempo es del reloj, ver REGLAS.md: decírselo directo deja arrastrar el número
// mientras suena; re-evaluar cambia recién en el borde de la vuelta
function ponerTempo(bpm, tiempos = 4) {
  try { setcpm(bpm / tiempos); } catch (e) { /* strudel todavía no levantó */ }
}

// evaluate() no rechaza: lo que strudel no pudo llega por el onEvalError de arranque.js
function strudelNoPudo(e) {
  sonando = false;
  refrescarTransporte();
  console.error(e);
  avisar('no se pudo tocar este tema.');
}

// el «setcpm» del código es el de la primera sección: con tempos por sección, el que toca
// ahora se vuelve a poner apenas evaluó, antes de que el reloj agende a otro pulso
function correr(codigo) {
  tempoPuesto = null;
  try {
    // el tema corrido desde donde se pidió; el código es el mismo, ver desdeVuelta
    Promise.resolve(evaluate(desdeVuelta ? codigo + '.early(' + desdeVuelta + ')' : codigo))
      .then(() => { if (sonando) tempoQueViene(); });
  } catch (e) {
    strudelNoPudo(e);
  }
}

function seguirElTema(r) {
  if (!sonando || r.codigo === ultimoCodigo) return;
  // el tempo es la primera línea del código: si el resto quedó igual hay un número
  // que decirle al reloj, no un tema que cortar y arrancar de nuevo
  const soloElTempo = ultimoCodigo && r.codigo &&
    ultimoCodigo.slice(ultimoCodigo.indexOf('\n')) === r.codigo.slice(r.codigo.indexOf('\n'));
  ultimoCodigo = r.codigo;
  // sin nada que tocar hay que apagar: strudel seguiría con el último stack
  if (!r.codigo) { sonando = false; silenciar(); refrescarTransporte(); }
  // con secciones el número lo pone seguirTempo() en el tic que sigue; acá sólo se olvida el de antes
  else if (soloElTempo) {
    tempoPuesto = null;
    if (actual.tempos.length) tempoQueViene(); else ponerTempo(r.bpm, r.tiempos);
  }
  else correr(r.codigo);
}

// ------------------------------------------------------------- tocar y parar
// el atajo va en el title: es lo único del transporte que la pantalla no muestra
const TECLA_TOCAR = mostrarTecla('Mod-Enter');
function refrescarTransporte() {
  btnTocar.innerHTML = icono(sonando ? 'parar' : 'tocar', 'maciza');
  const que = sonando ? 'parar' : 'tocar';
  btnTocar.title = que + ' · ' + TECLA_TOCAR;
  btnTocar.setAttribute('aria-label', que);
}

// «inicio», en vueltas del tema: desde dónde arranca. Sin él sigue desde donde iba
function alternarTocar(inicio) {
  if (sonando) {
    sonando = false;
    ultimoCodigo = '';
    silenciar();
  } else {
    if (typeof evaluate !== 'function') { avisar(SIN_SONIDO); return; }
    // apretar antes de que bajen los sonidos no se pierde: toca apenas estén
    if (!motorListo) { tocarAlLevantar = true; avisar('cargando sonidos…', null, 'motor'); return; }
    const r = actualizar(false);
    if (!r.codigo) { avisar('escribí algo primero: «la bata toca pum - pa -».'); return; }
    sonando = true;
    ultimoCodigo = r.codigo;
    Promise.resolve(despertar()).then(() => calentarTema(r)).then(() => {
      if (!sonando) return;
      if (inicio != null) desdeVuelta = inicio - getTime();
      correr(r.codigo);
    });
  }
  refrescarTransporte();
}

// sin pasarle el evento: alternarTocar lo tomaría por la vuelta de inicio
btnTocar.addEventListener('click', () => alternarTocar());

// la barra espaciadora es una tecla del idioma, así que el atajo es meta+Enter; anda también escribiendo el nombre
atajo('Mod-Enter', 'tocar o parar', hacer => { if (hacer) alternarTocar(); return true; }, 'todos');

// dónde empieza, en vueltas, la sección del cursor: la de su nombre en la forma, o la primera
// pasada por la sección en la que está escrito
function inicioDelCursor() {
  if (!actual.tramos.length) return null;
  const { l, i } = resolver(src.selectionStart);
  const enForma = (marcasActuales[l] || []).find(x => x.tipo === 'forma' && x.i <= i && i <= x.i + x.len && x.tramo != null);
  const e = encabezados().filter(x => x.l <= l).pop();
  const k = enForma ? enForma.tramo : e ? actual.tramos.findIndex(t => t.nom === e.nombre) : 0;
  if (k < 0) return null;
  return actual.tramos.slice(0, k).reduce((a, t) => a + t.largo, 0);
}
atajo('Mod-Shift-Enter', 'tocar desde esta sección', hacer => {
  const inicio = inicioDelCursor();
  if (inicio == null) return false;
  if (hacer) { if (sonando) alternarTocar(); alternarTocar(inicio); }
  return true;
});
