// ------------------------------------------------------------------ el tiempo
// «va a 92» es una línea del tema y no un ajuste escondido en la interfaz, igual
// que «callado». Esto es un atajo para esa línea, como los puntitos del margen
// lo son para aquélla: dice lo mismo con las mismas palabras, y lo que cambia lo
// cambia escribiendo. Vive en la barra porque el tempo es lo único del tema que
// se quiere mover mientras suena, mirando la cinta y no la hoja.
const btnPulso = document.getElementById('pulso');
let bpmActual = 90;

function refrescarPulso(bpm) {
  bpmActual = bpm;
  btnPulso.textContent = bpm;
}

// el número del tempo tal como lo dejó el traductor, o null si el tema no dice
// a qué velocidad va
function tokenTempo() {
  for (let l = 0; l < marcasActuales.length; l++) {
    const t = (marcasActuales[l] || []).find(x => x.tipo === 'tempo');
    if (t) return { l, i: t.i, len: t.len, tipo: 'tempo' };
  }
  return null;
}

function ponerTempo(bpm, grupo) {
  if (bpm === bpmActual) return;
  const t = tokenTempo();
  if (t) return reemplazar(t, String(bpm), grupo);
  // Sin línea de tempo el tema igual va a noventa —es lo que asume el
  // traductor—, así que el primer tirón no cambia nada de cómo suena: escribe
  // arriba de todo lo que ya estaba pasando, y de ahí en más se mueve como
  // cualquier otro número.
  const linea = 'va a ' + bpm;
  escribir(linea + '\n\n' + src.value, linea.length);
  registrar(src.value, { l: 0, i: 5, len: String(bpm).length }, grupo);
  actualizar(true);
}

// La misma cuenta que arrastrar el número en la hoja (ver sugeridor.js): cuatro
// píxeles por tiempo, y todo el tirón es un solo paso para atrás. Acá no hace
// falta el Alt que allá evita pelearse con la selección de texto — este botón no
// tiene texto que seleccionar.
let tira = null;

btnPulso.addEventListener('mousedown', e => {
  e.preventDefault();
  // el menú se cierra solo al apretar afuera; sin saber que estaba abierto, el
  // mismo click que lo cierra lo volvería a abrir y no habría manera de sacarlo
  tira = { x: e.clientX, base: bpmActual, movido: false,
           abierto: !!tokenDelMenu, grupo: 'pulso' + Date.now() };
});

addEventListener('mousemove', e => {
  if (!tira) return;
  const dx = e.clientX - tira.x;
  if (!tira.movido && Math.abs(dx) < UMBRAL) return;
  tira.movido = true;
  ponerTempo(Math.min(400, Math.max(20, Math.round(tira.base + dx / 4))), tira.grupo);
});

addEventListener('mouseup', () => {
  // un click sin arrastre abre el mismo menú que el ▾ del número en la hoja
  if (tira && !tira.movido && !tira.abierto) abrirMenuTempo();
  tira = null;
});

function abrirMenuTempo() {
  const t = tokenTempo();
  if (!t) return;                 // sin línea de tempo no hay nada que listar: se arrastra
  abrirMenu({ ...t, r: btnPulso.getBoundingClientRect() });
}

// con el foco puesto, las flechas: de a uno, y de a diez con mayúsculas
btnPulso.addEventListener('keydown', e => {
  const paso = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1
    : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
  if (!paso) return;
  e.preventDefault();
  ponerTempo(Math.min(400, Math.max(20, bpmActual + paso * (e.shiftKey ? 10 : 1))), 'flechas');
});
