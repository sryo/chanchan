// -------------------------------------------------------------- la primera hoja
// ------------------------------------------- el tema visto de lejísimos
// una barra por instrumento y no por renglón, y hasta cinco: más dicen «muchos».
// traducirLinea() y no traducir(): la forma y las secciones acá no dicen nada
const TIRAS_MAX = 5;
const _voces = new Map();

function vocesDe(txt) {
  if (_voces.has(txt)) return _voces.get(txt);
  const voces = [...new Set(txt.split('\n')
    .map((l, n) => traducirLinea(l, n + 1))
    .filter(r => r.tipo === 'parte')
    .map(r => r.voz))].slice(0, TIRAS_MAX);
  _voces.set(txt, voces);
  return voces;
}

const tira = txt => '<span class="tira">' +
  vocesDe(txt).map(v => '<span style="background:' + tramaDe(v) + '"></span>').join('') + '</span>';

// «hace un rato» y no «14:32»: se busca cuál se tocó recién
const HORA = 3600e3, DIA = 24 * HORA;

function desdeCuando(t) {
  if (!t) return '';
  const d = Date.now() - t;
  if (d < HORA) return 'recién';
  if (d < DIA) return 'hoy';
  if (d < 2 * DIA) return 'ayer';
  const dias = Math.round(d / DIA);
  if (dias < 7) return 'hace ' + dias + ' días';
  if (dias < 14) return 'hace una semana';
  if (dias < 31) return 'hace ' + Math.round(dias / 7) + ' semanas';
  if (dias < 60) return 'hace un mes';
  return 'hace ' + Math.round(dias / 30) + ' meses';
}

// la primera visita, y «nuevo»
const PRIMERA_HOJA = [
  '* en chanchán podés escribir música con palabras, así:',
  'la bata toca pum pa pum pa',
  'el bajo toca do - sol -',
  'el piano toca do mayor | fa mayor',
  '* o ir a un tema ya grabado, así: @ricotero',
].join('\n');

// --------------------------------------------------------- abrir otro tema
const panelTemas = document.createElement('div');
panelTemas.id = 'temas';
panelTemas.className = 'panel';
panelTemas.popover = 'auto';
document.body.appendChild(panelTemas);
const btnAbrir = document.getElementById('abrir');

// el botón lo abre y lo cierra solo: acá se arma la lista
panelTemas.addEventListener('beforetoggle', e => {
  if (e.newState !== 'open') { panelTemas.style.minWidth = ''; return; }
  armarTemas();
  // recién abierto se puede medir
  queueMicrotask(() => acomodar(panelTemas, btnAbrir.getBoundingClientRect()));
});

function armarTemas() {
  const mios = misTemas();
  const abierto = campoNombre.value.trim();
  // una sola marca y es la del tuyo, ver REGLAS.md
  const míoAbierto = mios.some(t => t.nombre === abierto);
  // la fecha va sólo en los propios: la columna vacía distingue un ejemplo cuando el encabezado se fue con el scroll
  const fila = (nombre, txt, dato, cuando, borrable) =>
    '<div class="op' + (nombre === abierto && (borrable || !míoAbierto) ? ' puesto' : '') +
    '" ' + dato + '>' +
    tira(txt) + esc(nombre || 'sin título') +
    '<span class="d">' + esc(cuando) + '</span>' +
    (borrable ? '<span class="borrar" title="borrarlo de la lista">' + icono('cerrar', 'chica') + '</span>' : '') + '</div>';
  panelTemas.innerHTML =
    (mios.length ? '<h3>mis temas</h3>' +
      mios.map((t, i) => fila(t.nombre, t.txt, 'data-mio="' + i + '"', desdeCuando(t.t), true)).join('') : '') +
    '<h3>temas</h3>' +
    EJEMPLOS.map((e, i) => fila(e.nombre, e.txt, 'data-i="' + i + '"', '')).join('') +
    // las dos últimas no abren un tema de la lista: raya y no rótulo
    '<div class="op aparte" data-nueva="1">nuevo</div>' +
    '<div class="op" data-archivo="1">importar archivo</div>';
  panelTemas.querySelectorAll('.op').forEach(el => el.addEventListener('mousedown', ev => {
    ev.preventDefault();
    // la × deja el panel abierto: borrar de a uno es un gesto de lista
    if (ev.target.closest('.borrar')) {
      const nombre = mios[+el.dataset.mio].nombre;
      olvidarTema(nombre);
      // si es el abierto, la tecla que sigue lo volvería a anotar: se queda sin nombre
      if (nombre === campoNombre.value.trim()) {
        campoNombre.value = '';
        acomodarNombre();
        guardarYa();
      }
      // abierto no se angosta: el puntero seguiría sobre otra fila
      panelTemas.style.minWidth = panelTemas.offsetWidth + 'px';
      return armarTemas();
    }
    mostrarPanel(panelTemas, false);
    // elegirArchivo() carga el tema solo
    if (el.dataset.archivo) return elegirArchivo();
    cargarTema(el.dataset.nueva ? { nombre: '', txt: PRIMERA_HOJA }
      : el.dataset.mio ? mios[+el.dataset.mio]
      : EJEMPLOS[+el.dataset.i]);
    src.focus();
  }));
}
