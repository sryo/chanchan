// ------------------------------------------------- qué se está tocando ahora
// getTime() es el reloj de strudel en vueltas; a cada patrón espejo le
// preguntamos qué paso cae justo ahí y prendemos esa palabra en el editor.
let espejos = [];
let claveActivos = '';

function seguir() {
  requestAnimationFrame(seguir);
  moverAguja();
  const nuevos = new Set();
  if (sonando && espejos.length) {
    let t;
    try { t = getTime(); } catch (e) { t = null; }
    if (t != null) for (const e of espejos) {
      let haps;
      try { haps = e.pat.queryArc(t, t + 0.0001); } catch (err) { continue; }
      for (const h of haps) {
        const p = e.lugares[h.value && h.value.n];
        if (p) nuevos.add((e.nro - 1) + ':' + p.i);
      }
    }
  }
  const clave = [...nuevos].sort().join('|');
  if (clave === claveActivos) return;
  claveActivos = clave;
  activos = nuevos;
  pintar(marcasActuales);
}

// strudel corta el reloj pero no las notas que ya salieron: sin apagar el
// audio, «parar» deja sonando la cola de los acordes largos y del eco.
function silenciar() {
  hush();
  // hush() limpia los patrones registrados, pero el reloj sigue con el último
  // stack que se evaluó: sin dejarle un silencio cargado, cualquier cosa que
  // despierte el audio —una vista previa del menú, por ejemplo— revive el tema.
  Promise.resolve(evaluate('silence')).catch(() => { /* strudel a medio cargar */ });
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'running') ctx.suspend();
}

function despertar() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') return ctx.resume();
}

function correr(codigo) {
  try {
    evaluate(codigo);
  } catch (e) {
    sonando = false;
    refrescarTransporte();
    cajaErr.innerHTML += '<p><b>strudel:</b> ' + esc(String(e.message || e)) + '</p>';
  }
}

// ------------------------------------------------------------- tocar y parar
const OJO_TOCAR = '<svg viewBox="0 0 24 24" width="17" height="17"><polygon points="7,4 20,12 7,20"/></svg>';
const OJO_PARAR = '<svg viewBox="0 0 24 24" width="17" height="17">' +
  '<rect x="6.5" y="4.5" width="4.6" height="15"/><rect x="13.9" y="4.5" width="4.6" height="15"/></svg>';

function refrescarTransporte() {
  btnTocar.innerHTML = sonando ? OJO_PARAR : OJO_TOCAR;
  btnTocar.title = sonando ? 'parar' : 'tocar';
  btnTocar.setAttribute('aria-label', btnTocar.title);
}

function alternarTocar() {
  if (sonando) {
    sonando = false;
    ultimoCodigo = '';
    silenciar();
  } else {
    const r = actualizar(false);
    if (!r.codigo) { avisar('escribí algo primero: «el bombo toca pum - pum -».'); return; }
    sonando = true;
    ultimoCodigo = r.codigo;
    Promise.resolve(despertar()).then(() => correr(r.codigo));
  }
  refrescarTransporte();
}

btnTocar.addEventListener('click', alternarTocar);

// La barra espaciadora es una tecla del idioma —separa las palabras—, así que el
// atajo es el de siempre para «esto, ya»: Enter con el meta apretado. Anda
// también escribiendo, que es justo cuando se quiere oír lo que se acaba de
// cambiar sin sacar las manos del teclado.
addEventListener('keydown', e => {
  if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey)) return;
  e.preventDefault();
  alternarTocar();
});
