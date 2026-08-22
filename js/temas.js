// ---------------------------------------------------------------- la hoja vacía
// el primer paso, que el ▾ y el sugeridor no dan: qué es esto y cómo se empieza
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

// apretar uno escribe y suena; queda como hoja tuya, sin nombre
const RENGLONES_DE_MUESTRA = ['la bata toca pum pa pum pa', 'el bajo toca do - sol -', 'el piano toca do mayor | fa mayor'];

function armarVacio() {
  const mios = misTemas();
  // mismo nombre, mismo tema, ver REGLAS.md: acá iría dos veces; el panel sí muestra los dos
  const ejemplos = EJEMPLOS.filter(e => !mios.some(t => t.nombre === e.nombre));
  cajaVacio.innerHTML =
    '<p class="lema">acá la música se escribe con palabras.</p>' +
    '<p class="pista primera">empezá con una de éstas, o escribí la tuya:</p>' +
    '<div class="ejemplos lineas"></div>' +
    (mios.length ? '<p class="pista">volvé a uno tuyo</p><div class="ejemplos mios"></div>' : '') +
    (ejemplos.length ? '<p class="pista">o escuchá un tema hecho</p><div class="ejemplos temas"></div>' : '');
  const lineas = cajaVacio.querySelector('.ejemplos.lineas');
  for (const linea of RENGLONES_DE_MUESTRA) {
    const b = document.createElement('button');
    b.className = 'linea';
    b.textContent = linea;
    b.addEventListener('click', () => {
      escribir(linea + '\n', linea.length);
      registrar(src.value, null);
      // sin sonidos todavía, queda escrito: el botón ya dice que carga
      if (motorListo && !sonando) alternarTocar(); else actualizar(true);
      src.focus();
    });
    lineas.appendChild(b);
  }
  const poner = (lista, caja) => {
    for (const e of lista) {
      const b = document.createElement('button');
      b.textContent = e.nombre;
      b.addEventListener('click', () => { cargarTema(e); src.focus(); });
      caja.appendChild(b);
    }
  };
  if (mios.length) poner(mios, cajaVacio.querySelector('.ejemplos.mios'));
  if (ejemplos.length) poner(ejemplos, cajaVacio.querySelector('.ejemplos.temas'));
}

// --------------------------------------------------------- abrir otro tema
// con algo escrito la hoja vacía no está: los temas cuelgan del nombre
const panelTemas = document.createElement('div');
panelTemas.id = 'temas';
panelTemas.className = 'panel';
document.body.appendChild(panelTemas);
const btnAbrir = document.getElementById('abrir');

// para quien no ve la lista
const mostrarTemas = si => { panelTemas.classList.toggle('abierto', si); btnAbrir.setAttribute('aria-expanded', si); };

function abrirTemas() {
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
      // sin esto el de afuera lo cerraría: abrirTemas() rehizo el panel y la fila apretada ya no está en él
      ev.stopPropagation();
      return abrirTemas();
    }
    mostrarTemas(false);
    // elegirArchivo() carga el tema solo
    if (el.dataset.archivo) return elegirArchivo();
    cargarTema(el.dataset.nueva ? { nombre: '', txt: '' }
      : el.dataset.mio ? mios[+el.dataset.mio]
      : EJEMPLOS[+el.dataset.i]);
    src.focus();
  }));
  const r = btnAbrir.getBoundingClientRect();
  panelTemas.style.left = Math.round(r.left) + 'px';
  panelTemas.style.top = Math.round(r.bottom + 6) + 'px';
  mostrarTemas(true);
}

btnAbrir.addEventListener('click', () => {
  panelTemas.classList.contains('abierto') ? mostrarTemas(false) : abrirTemas();
});
addEventListener('mousedown', e => {
  if (!dentroDe(e.target, panelTemas, btnAbrir)) mostrarTemas(false);
});
addEventListener('keydown', e => { if (e.key === 'Escape') mostrarTemas(false); });
