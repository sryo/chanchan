// ---------------------------------------------------------------- la hoja vacía
// El vocabulario ya lo sirven el menú del ▾ y el sugeridor, que además saben en
// qué palabra estás parado; lo único que no vivía en ningún lado era el molde.
// ------------------------------------------- el tema visto de lejísimos
// Una barra por instrumento y no por renglón: la misma base tres veces son nueve
// renglones y tres colores, y nueve barras en quince píxeles son barro. Hasta
// cinco: más no dicen «seis instrumentos», dicen «muchos». No los tiempos por
// minuto, que era lo fácil de sacar y no es lo que uno recuerda de un tema.
// Va por traducirLinea() y no por traducir(): alcanza con leer cada renglón, y
// la forma y las secciones que arma el segundo acá no dicen nada. El resultado
// se guarda por texto.
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

// «hace un rato» y no «14:32»: de la lista propia se busca cuál se tocó recién
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

// Tres renglones de muestra: uno de golpes, uno de notas con un silencio, uno de
// acordes con barra — entre los tres está todo lo que el molde nombra. Apretar
// uno lo escribe en la hoja, que es lo único que hace sonar algo. Queda como una
// hoja tuya, sin nombre: no es un tema de la lista.
const RENGLONES_DE_MUESTRA = ['la bata toca pum tas pum tas', 'el bajo toca do - sol -', 'el piano toca do mayor | fa mayor'];
const TECLA_TOCAR = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘↩' : 'ctrl↩';

function armarVacio() {
  const mios = misTemas();
  // un ejemplo que ya está entre los tuyos con el mismo nombre es el mismo tema
  // —ver REGLAS.md—, y acá iría dos veces, una arriba de la otra; el panel del
  // nombre sí muestra los dos, que es la manera de volver a cómo venía
  const ejemplos = EJEMPLOS.filter(e => !mios.some(t => t.nombre === e.nombre));
  cajaVacio.innerHTML =
    '<p class="pista primera">escribí una línea, o tocá una de éstas:</p>' +
    '<div class="ejemplos lineas"></div>' +
    '<p class="pista">así se escribe</p>' +
    // las cuatro líneas que existen: el idioma entero puesto en el molde
    '<p class="molde">la <b>&lt;parte&gt;</b> toca <b>&lt;pasos&gt;</b> | <b>&lt;pasos&gt;</b>, <b>&lt;cómo&gt;</b></p>' +
    '<p class="molde">la <b>&lt;sección&gt;</b>:</p>' +
    '<p class="molde">el tema va <b>&lt;sección&gt;</b> <b>&lt;sección&gt;</b></p>' +
    '<p class="molde">va a <b>&lt;n&gt;</b></p>' +
    '<p class="pista leyenda">los pasos son golpes (pum tas chas) o notas (do re mi); la raya es silencio</p>' +
    '<p class="pista leyenda">para oírlo, ' + TECLA_TOCAR + ' o el botón de arriba · para cambiar una palabra, el ▾ que aparece al pasarle por encima</p>' +
    (mios.length ? '<p class="pista">volvé a uno tuyo</p><div class="ejemplos mios"></div>' : '') +
    (ejemplos.length ? '<p class="pista">o abrí uno de estos</p><div class="ejemplos temas"></div>' : '') +
    '<p class="pista suelto">o soltá un archivo acá</p>';
  const lineas = cajaVacio.querySelector('.ejemplos.lineas');
  for (const linea of RENGLONES_DE_MUESTRA) {
    const b = document.createElement('button');
    b.className = 'linea';
    b.textContent = linea;
    b.addEventListener('click', () => {
      escribir(linea + '\n', linea.length);
      registrar(src.value, null);
      actualizar(true);
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
// con algo escrito la hoja vacía no está, así que los temas cuelgan del nombre
const panelTemas = document.createElement('div');
panelTemas.id = 'temas';
panelTemas.className = 'panel';
document.body.appendChild(panelTemas);
const btnAbrir = document.getElementById('abrir');

// el botón dice si su lista está abierta, para quien no la ve
const mostrarTemas = si => { panelTemas.classList.toggle('abierto', si); btnAbrir.setAttribute('aria-expanded', si); };

function abrirTemas() {
  const mios = misTemas();
  const abierto = campoNombre.value.trim();
  // una sola marca y es la del tuyo; «borrable» es «es tuyo» —ver REGLAS.md—
  const míoAbierto = mios.some(t => t.nombre === abierto);
  // La fecha va sólo en los propios, y esa columna vacía es de paso lo que
  // distingue un ejemplo de uno tuyo cuando el encabezado ya se fue con el scroll.
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
    // las dos últimas no abren un tema de la lista, así que van separadas por una
    // raya y no por un rótulo: encabezar dos filas con un renglón entero era más
    // peso que las filas, y el texto de cada una ya dice lo que decía el rótulo
    '<div class="op aparte" data-nueva="1">nuevo</div>' +
    '<div class="op" data-archivo="1">importar archivo</div>';
  panelTemas.querySelectorAll('.op').forEach(el => el.addEventListener('mousedown', ev => {
    ev.preventDefault();
    // la × borra y deja el panel abierto: borrar de a uno es un gesto de lista,
    // y cerrarlo obligaría a volver a abrirlo por cada tema que sobra
    if (ev.target.closest('.borrar')) {
      const nombre = mios[+el.dataset.mio].nombre;
      olvidarTema(nombre);
      // si es el que está abierto, la tecla que sigue lo volvería a anotar: se queda
      // en la hoja, pero sin nombre, que es lo que deja de escribirlo en la lista
      if (nombre === campoNombre.value.trim()) {
        campoNombre.value = '';
        medirNombre();
        guardarYa();
      }
      // sin cortarlo acá, el que cierra el panel al apretar afuera lo cerraría:
      // para cuando le toca, la fila que se apretó ya no está en el panel —
      // abrirTemas() lo rehizo entero— y desde afuera eso es un click afuera
      ev.stopPropagation();
      return abrirTemas();
    }
    mostrarTemas(false);
    // elegirArchivo() carga el tema solo: acá no hay nada que cargar todavía
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
