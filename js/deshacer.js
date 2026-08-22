// --------------------------------------------------------------- deshacer
// Instantáneas del texto entero: un tema son unos cientos de caracteres, no hace
// falta nada más fino. El ctrl+Z nativo no sirve acá — asignar src.value le borra
// el historial de una, y eso pasa en cada cambio del menú y en cada ejemplo.
const historial = [];
let puntero = -1, grupoTecla = 0, aplicando = false;

function registrar(txt, ancla, grupo) {
  if (aplicando) return;
  const arriba = historial[puntero];
  // un arrastre entero, o una ráfaga de tecleo, son un solo paso para atrás
  if (grupo && arriba && arriba.grupo === grupo) { arriba.txt = txt; arriba.ancla = ancla; return; }
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
  // el cursor vuelve a donde estuvo el cambio: deshaciendo, al principio de lo
  // que se va; rehaciendo, al final de lo que vuelve
  const donde = ancla && baseDe(txt.split('\n'), ancla.l) + ancla.i + (cual === 'deshacer' ? 0 : ancla.len);
  escribir(txt, ancla ? donde : undefined);
  actualizar(true);
  aplicando = false;
  mostrarDeshacer(ancla, cual === 'deshacer');
}

const botonDeshacer = document.createElement('button');
botonDeshacer.id = 'deshacer';
document.body.appendChild(botonDeshacer);
let relojDeshacer;
const VIDA_DESHACER = 9000;

// el reloj se reinicia al entrar y salir: si el mouse está encima, el botón no se
// va — irse justo cuando estabas yendo a apretarlo era la mitad del problema
function contarParaIrse() {
  clearTimeout(relojDeshacer);
  relojDeshacer = setTimeout(() => {
    botonDeshacer.classList.remove('vivo');
    acomodarColgantes();
  }, VIDA_DESHACER);
}

function mostrarDeshacer(ancla, esRehacer) {
  clearTimeout(relojDeshacer);
  // chico como el ▾: se sueldan de costado, así que la caja tiene que ser la misma
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

const deshacer = () => irA(puntero - 1, 'deshacer');
const rehacer  = () => irA(puntero + 1, 'rehacer');

addEventListener('keydown', e => {
  if (!(e.metaKey || e.ctrlKey) || norm(e.key) !== 'z') return;
  // escribiendo el nombre, deshacer es del nombre: el historial es del tema
  if (document.activeElement === campoNombre) return;
  e.preventDefault();
  e.shiftKey ? rehacer() : deshacer();
});

let reloj;
src.addEventListener('input', () => {
  asegurarRenglonFinal();
  clearTimeout(reloj);
  reloj = setTimeout(() => actualizar(true), 400);
  registrar(src.value, null, 'tecla' + grupoTecla);
  clearTimeout(relojTecla);
  relojTecla = setTimeout(() => grupoTecla++, 600);
  repintarTexto();
});
let relojTecla;
// uno solo, y en orden: primero el espejo, si no los puntitos miden contra
// geometría vieja porque se posicionan a partir de los spans de #hl
src.addEventListener('scroll', () => {
  hl.scrollTop = src.scrollTop;
  hl.scrollLeft = src.scrollLeft;
  armarPuntos(marcasActuales, calladasActuales);
  cerrarMenu();
  // al ▾ lo reacomoda cerrarMenu; al de deshacer hay que reacomodarlo acá
  acomodarColgantes();
});
