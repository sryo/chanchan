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
  src.value = historial[i].txt;
  actualizar(true);
  aplicando = false;
  mostrarDeshacer(historial[cual === 'deshacer' ? i + 1 : i].ancla, cual === 'deshacer');
}

// el botón vive pegado a la palabra que cambió y se va solo a los pocos segundos
const botonDeshacer = document.createElement('button');
botonDeshacer.id = 'deshacer';
document.body.appendChild(botonDeshacer);
let relojDeshacer;

function mostrarDeshacer(ancla, esRehacer) {
  clearTimeout(relojDeshacer);
  botonDeshacer.textContent = esRehacer ? '↷' : '↶';
  botonDeshacer.title = esRehacer ? 'rehacer' : 'deshacer';
  botonDeshacer.dataset.que = esRehacer ? 'rehacer' : 'deshacer';
  if (!pegarA(botonDeshacer, ancla)) return;
  relojDeshacer = setTimeout(() => botonDeshacer.classList.remove('vivo'), 4000);
}

botonDeshacer.addEventListener('mousedown', e => {
  e.preventDefault();
  botonDeshacer.dataset.que === 'rehacer' ? rehacer() : deshacer();
});

const deshacer = () => irA(puntero - 1, 'deshacer');
const rehacer  = () => irA(puntero + 1, 'rehacer');

addEventListener('keydown', e => {
  if (!(e.metaKey || e.ctrlKey) || norm(e.key) !== 'z') return;
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
  pintar(traducir(src.value).marcas);
});
let relojTecla;
// uno solo, y en orden: primero el espejo, si no los puntitos miden contra
// geometría vieja porque se posicionan a partir de los spans de #hl
src.addEventListener('scroll', () => {
  hl.scrollTop = src.scrollTop;
  hl.scrollLeft = src.scrollLeft;
  armarPuntos(marcasActuales, calladasActuales);
  cerrarMenu();
});

const OJO_TOCAR = '<svg viewBox="0 0 24 24" width="17" height="17"><polygon points="7,4 20,12 7,20"/></svg>';
const OJO_PARAR = '<svg viewBox="0 0 24 24" width="17" height="17">' +
  '<rect x="6.5" y="4.5" width="4.6" height="15"/><rect x="13.9" y="4.5" width="4.6" height="15"/></svg>';

function refrescarTransporte() {
  btnTocar.innerHTML = sonando ? OJO_PARAR : OJO_TOCAR;
  btnTocar.title = sonando ? 'parar' : 'tocar';
  btnTocar.setAttribute('aria-label', btnTocar.title);
}

btnTocar.addEventListener('click', () => {
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
});
