// ---------------------------------------------------------------- la hoja vacía
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

// se copian como cualquier párrafo, y apretar uno lo escribe y lo hace sonar
const ESPERA_CLICK = 180;

// Cada cosa de la hoja vacía es un enlace de verdad: se copia con el botón derecho,
// se abre en otra pestaña, se alcanza con Tab. El hash se arma después, que es
// asíncrono. Sin draggable, que arrastrar un enlace arrastra la dirección en vez de
// seleccionar el texto.
const afuera = e => e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0;

function enlaceA(nombre, txt) {
  const a = document.createElement('a');
  a.textContent = nombre || txt.split('\n')[0];
  a.draggable = false;
  a.href = '#';
  hashDe(nombre, txt).then(h => { a.href = '#' + h; });
  return a;
}
const RENGLONES_DE_MUESTRA = ['la bata toca pum pa pum pa', 'el bajo toca do - sol -', 'el piano toca do mayor | fa mayor'];

// el texto recibe el mouse para poder copiarlo, así que apretarlo ya no cae en la
// hoja: se la devuelve, salvo que se esté seleccionando o sea un botón
cajaVacio.addEventListener('click', e => {
  if (getSelection().isCollapsed && !e.target.closest('button, a')) src.focus();
});

function armarVacio() {
  const mios = misTemas();
  // mismo nombre, mismo tema, ver REGLAS.md: acá iría dos veces; el panel sí muestra los dos
  const ejemplos = EJEMPLOS.filter(e => !mios.some(t => t.nombre === e.nombre));
  cajaVacio.innerHTML =
    '<p class="lema">acá la música se escribe con palabras.</p>' +
    '<p class="pista primera">empezá con una de éstas, o escribí la tuya:</p>' +
    '<div class="muestras"></div>' +
    (mios.length ? '<p class="pista">volvé a uno tuyo</p><div class="ejemplos mios"></div>' : '') +
    (ejemplos.length ? '<p class="pista">o escuchá un tema hecho</p><div class="ejemplos temas"></div>' : '');
  const muestras = cajaVacio.querySelector('.muestras');
  for (const linea of RENGLONES_DE_MUESTRA) {
    const p = enlaceA('', linea);
    p.className = 'muestra';
    let apreto = null, espera;
    p.addEventListener('mousedown', e => { apreto = [e.clientX, e.clientY]; });
    p.addEventListener('click', e => {
      const a = apreto; apreto = null;
      clearTimeout(espera);
      if (afuera(e)) return;                    // otra pestaña: que lo abra el enlace
      e.preventDefault();
      // el segundo click de un doble o un triple es para seleccionar, y llega tarde
      // para el primero: por eso escribir espera a que no venga ninguno
      if (e.detail > 1) return;
      // arrastrar para copiar termina en un click: un arrastre no escribe
      if (a && Math.hypot(e.clientX - a[0], e.clientY - a[1]) > UMBRAL) return;
      espera = setTimeout(() => {
        escribir(linea + '\n', linea.length);
        registrar(src.value, null);
        // sin sonidos todavía, queda escrito: el botón ya dice que carga
        if (motorListo && !sonando) alternarTocar(); else actualizar(true);
        src.focus();
      }, ESPERA_CLICK);
    });
    muestras.appendChild(p);
  }
  const poner = (lista, caja) => {
    for (const e of lista) {
      const a = enlaceA(e.nombre, e.txt);
      a.addEventListener('click', ev => {
        if (afuera(ev)) return;                 // otra pestaña: que lo abra el enlace
        ev.preventDefault();
        cargarTema(e);
        src.focus();
      });
      caja.appendChild(a);
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
