// --------------------------------------------------------------- deshacer
// instantáneas del texto entero, que un tema son unos cientos de caracteres; el
// ctrl+Z nativo no sirve porque asignar src.value le borra el historial
let historial = [], puntero = -1, grupoTecla = 0, aplicando = false;

// el historial es de la hoja, ver REGLAS.md: cambiar de tema guarda el de la que se deja y levanta el del que llega
const historiales = new Map();
function cambiarHistorial(deja, llega) {
  historiales.set(claveTema(deja), { historial, puntero });
  ({ historial, puntero } = historiales.get(claveTema(llega)) || { historial: [], puntero: -1 });
}

function registrar(txt, ancla, grupo) {
  if (aplicando) return;
  const arriba = historial[puntero];
  // un arrastre entero, o una ráfaga de tecleo, son un solo paso para atrás
  if (grupo && arriba && arriba.grupo === grupo) { arriba.txt = txt; arriba.ancla = ancla; return; }
  // lo mismo que ya está arriba no es un paso
  if (!grupo && arriba && arriba.txt === txt) return;
  historial.length = puntero + 1;          // al cambiar algo se pierde el rehacer
  historial.push({ txt, ancla, grupo });
  puntero = historial.length - 1;
}

function irA(i, cual) {
  if (i < 0 || i >= historial.length) return;
  puntero = i;
  aplicando = true;
  const txt = historial[i].txt;
  const ancla = historial[cual === 'deshacer' ? i + 1 : i].ancla;
  // deshaciendo, el cursor va al principio de lo que se va; rehaciendo, al final de lo que vuelve
  const donde = ancla && baseDe(txt.split('\n'), ancla.l) + ancla.i + (cual === 'deshacer' ? 0 : ancla.len);
  escribir(txt, ancla ? donde : undefined);
  actualizar(true);
  aplicando = false;
  mostrarDeshacer(ancla, cual === 'deshacer');
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

// 600 ms sin teclear cierran el grupo
let relojTecla;
function registrarTecla() {
  registrar(src.value, null, 'tecla' + grupoTecla);
  clearTimeout(relojTecla);
  relojTecla = setTimeout(() => grupoTecla++, 600);
}

const deshacer = () => irA(puntero - 1, 'deshacer');
const rehacer  = () => irA(puntero + 1, 'rehacer');

addEventListener('keydown', e => {
  if (!(e.metaKey || e.ctrlKey) || norm(e.key) !== 'z') return;
  // escribiendo el nombre, deshacer es del nombre: el historial es del tema
  if (document.activeElement === campoNombre) return;
  e.preventDefault();
  e.shiftKey ? rehacer() : deshacer();
});
