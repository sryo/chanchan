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
