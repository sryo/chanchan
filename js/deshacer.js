// --------------------------------------------------------------- deshacer
// pasos y no fotos, ver REGLAS.md. El ctrl+Z nativo no sirve porque asignar
// src.value le borra el historial
let hechos = [], deshechos = [];
// el texto contra el que se mide el tecleo: lo que cambió desde acá es un paso
let anterior = '';
const PLAZO_GRUPO = 600, HONDO = 100;

// un historial por hoja, ver REGLAS.md; se levanta sólo si el texto es el que dejó,
// que volver a un ejemplo desde su fila trae el texto original y no el de la copia
const historiales = new Map();
function cambiarHistorial(deja, llega, txtLlega) {
  if (deja) historiales.set(claveTema(deja), { hechos, deshechos, txt: src.value });
  const h = historiales.get(claveTema(llega));
  historiales.delete(claveTema(llega));
  ({ hechos, deshechos } = h && h.txt === txtLlega ? h : { hechos: [], deshechos: [] });
}
// el texto de ahora es el punto de partida, no un paso
const arrancarHistorial = () => { anterior = src.value; };

// [desde, hasta] de lo que los pasos dejaron puesto, en el texto de después
const rangoDe = pasos => [Math.min(...pasos.map(p => p.desde)), Math.max(...pasos.map(p => p.desde + p.puesto.length))];
// ¿lo que este paso saca toca lo que el grupo dejó puesto?
const tocaA = (pasos, [a, z]) => pasos.some(p => p.desde <= z && p.desde + p.sacado.length >= a);
const cerrarGrupo = () => { if (hechos.length) hechos[hechos.length - 1].cerrado = true; };

// pasos ya aplicados, en el orden en que se aplicaron; selAntes es el cursor de antes.
// Un gesto lleva su grupo y sigue sólo con el mismo; el tecleo no lleva ninguno
function anotarPasos(pasos, selAntes, grupo) {
  const arriba = hechos[hechos.length - 1], ahora = Date.now();
  const sigue = arriba && !arriba.cerrado && (grupo != null
    ? arriba.grupo === grupo
    : arriba.grupo == null && ahora - arriba.t <= PLAZO_GRUPO && tocaA(pasos, arriba.rango));
  if (sigue) {
    const [a, z] = rangoDe(pasos), [a0, z0] = arriba.rango;
    arriba.pasos.push(...pasos);
    arriba.rango = [Math.min(mapearPor(a0, pasos, -1), a), Math.max(mapearPor(z0, pasos, 1), z)];
    arriba.t = ahora;
  } else {
    hechos.push({ pasos, selAntes, rango: rangoDe(pasos), t: ahora, grupo });
    if (hechos.length > HONDO) hechos.shift();
  }
  deshechos = [];
  anterior = src.value;
}

// el tecleo no se intercepta: lo que el textarea cambió es un paso igual
let selAntesDeTecla = null;
function anotarTecleo() {
  const viejo = anterior, p = pasoEntre(viejo, src.value);
  if (!p) return;
  anotarPasos([p], selAntesDeTecla || { a: src.selectionStart, z: src.selectionEnd });
  selAntesDeTecla = null;
  avisarCambio([p], viejo);
}
src.addEventListener('beforeinput', e => {
  // el «deshacer» del menú Edición iría a la pila nativa, que está vacía
  if (e.inputType === 'historyUndo' || e.inputType === 'historyRedo') {
    e.preventDefault();
    e.inputType === 'historyUndo' ? deshacer() : rehacer();
    return;
  }
  selAntesDeTecla = { a: src.selectionStart, z: src.selectionEnd };
});

// aplica los pasos de un grupo, deja el cursor y cuelga el botón; si un paso no
// calza el historial está mal y se tira entero antes que romper el texto
function pasar(pasos, sel, ancla, esRehacer) {
  const viejo = src.value;
  let txt;
  try { txt = pasos.reduce(aplicarPaso, viejo); }
  catch (e) { hechos = []; deshechos = []; return false; }
  escribir(txt, sel.a, sel.z);
  anterior = txt;
  avisarCambio(pasos, viejo);
  actualizar(true);
  mostrarDeshacer(ancla, esRehacer);
  return true;
}

function deshacer() {
  const g = hechos.pop();
  if (!g) return false;
  deshechos.push({ ...g, selDespues: { a: src.selectionStart, z: src.selectionEnd } });
  cerrarGrupo();
  const p = g.pasos[0];
  return pasar(g.pasos.slice().reverse().map(invertir), g.selAntes, anclaDe(p.desde, p.sacado.length), true);
}

function rehacer() {
  const g = deshechos.pop();
  if (!g) return false;
  hechos.push({ ...g, cerrado: true });
  const p = g.pasos[0];
  return pasar(g.pasos, g.selDespues, anclaDe(p.desde, p.puesto.length), false);
}

const botonDeshacer = document.createElement('button');
botonDeshacer.id = 'deshacer';
colgar(botonDeshacer, 1);
document.body.appendChild(botonDeshacer);
let relojDeshacer;
const VIDA_DESHACER = 9000;

function contarParaIrse() {
  clearTimeout(relojDeshacer);
  relojDeshacer = setTimeout(() => {
    botonDeshacer.classList.remove('vivo');
    acomodarColgantes();
  }, VIDA_DESHACER);
}

function mostrarDeshacer(ancla, esRehacer) {
  clearTimeout(relojDeshacer);
  // chico como el ▾: se sueldan de costado, la caja tiene que ser la misma
  botonDeshacer.innerHTML = icono(esRehacer ? 'rehacer' : 'deshacer', 'chica');
  botonDeshacer.title = esRehacer ? 'rehacer' : 'deshacer';
  botonDeshacer.dataset.que = esRehacer ? 'rehacer' : 'deshacer';
  pintarDeQuien(botonDeshacer, ancla);
  if (!pegarA(botonDeshacer, ancla)) return;
  contarParaIrse();
}

botonDeshacer.addEventListener('mouseenter', () => clearTimeout(relojDeshacer));
botonDeshacer.addEventListener('mouseleave', contarParaIrse);

botonDeshacer.addEventListener('mousedown', e => {
  e.preventDefault();
  botonDeshacer.dataset.que === 'rehacer' ? rehacer() : deshacer();
});

// sólo en la hoja: escribiendo el nombre, deshacer es del nombre
atajo('Mod-z', 'deshacer', hacer => hacer ? deshacer() : hechos.length > 0);
atajo('Mod-Shift-z', 'rehacer', hacer => hacer ? rehacer() : deshechos.length > 0);
