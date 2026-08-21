// ---------------------------------------------------------------- la hoja vacía
// El vocabulario entero ya lo sirven el menú del ▾ y el sugeridor, que además
// saben en qué palabra estás parado. Lo único que no vivía en ningún otro lado
// era el molde, así que va acá: mientras la hoja está en blanco, la página se
// explica sola; en cuanto escribís algo, desaparece. Los temas hechos están en
// ejemplos.js, que es donde tienen que estar: son largos y esto es interfaz.
const cajaVacio = document.getElementById('vacio');

// Irse a otro tema es el momento de escribir en disco de verdad: el guardado de
// cada tecla es perezoso a propósito, y sin vaciarlo acá abrir un ejemplo se
// llevaba puesto lo que estabas escribiendo.
function cargarTema(tema) {
  guardarYa();
  src.value = conRenglonFinal(tema.txt);
  campoNombre.value = tema.nombre;
  medirNombre();
  registrar(src.value, null);
  armarVacio();
  actualizar(true);
  guardar();
}

// el número de la derecha en las listas: los propios pueden no tener línea de
// tempo, y entonces no dice nada en vez de romperse
const tempoDe = txt => (/\bva a (\d+)/.exec(txt) || ['', ''])[1];

function armarVacio() {
  const mios = misTemas();
  cajaVacio.innerHTML =
    // las cuatro líneas que existen: una parte, una sección, el orden en que van,
    // y el pulso. Es el idioma entero puesto en el molde.
    '<p class="molde">la <b>&lt;parte&gt;</b> toca <b>&lt;pasos&gt;</b> | <b>&lt;pasos&gt;</b>, <b>&lt;cómo&gt;</b></p>' +
    '<p class="molde">la <b>&lt;sección&gt;</b>:</p>' +
    '<p class="molde">el tema va <b>&lt;sección&gt;</b> <b>&lt;sección&gt;</b></p>' +
    '<p class="molde">va a <b>&lt;n&gt;</b></p>' +
    (mios.length ? '<p class="pista">volvé a uno tuyo</p><div class="ejemplos mios"></div>' : '') +
    '<p class="pista">o abrí uno de estos</p>' +
    '<div class="ejemplos"></div>' +
    '<p class="pista suelto">o soltá un archivo acá</p>';
  const poner = (lista, caja) => {
    for (const e of lista) {
      const b = document.createElement('button');
      b.textContent = e.nombre;
      b.addEventListener('click', () => { cargarTema(e); src.focus(); });
      caja.appendChild(b);
    }
  };
  if (mios.length) poner(mios, cajaVacio.querySelector('.ejemplos.mios'));
  poner(EJEMPLOS, cajaVacio.querySelector('.ejemplos:not(.mios)'));
}

// --------------------------------------------------------- abrir otro tema
// Con algo ya escrito la hoja vacía no está, así que los temas cuelgan del
// nombre: es donde vive la identidad del tema, y es el mismo panel del ▾.
const panelTemas = document.createElement('div');
panelTemas.id = 'temas';
panelTemas.className = 'panel';
document.body.appendChild(panelTemas);
const btnAbrir = document.getElementById('abrir');

function abrirTemas() {
  const mios = misTemas();
  const abierto = campoNombre.value.trim();
  const fila = (nombre, txt, dato, borrable) =>
    '<div class="op' + (nombre === abierto ? ' puesto' : '') + '" ' + dato + '>' +
    esc(nombre || 'sin título') + '<span class="d">' + tempoDe(txt) + '</span>' +
    (borrable ? '<span class="borrar" title="borrarlo de la lista">×</span>' : '') + '</div>';
  panelTemas.innerHTML =
    (mios.length ? '<h3>mis temas</h3>' +
      mios.map((t, i) => fila(t.nombre, t.txt, 'data-mio="' + i + '"', true)).join('') : '') +
    '<h3>temas</h3>' +
    EJEMPLOS.map((e, i) => fila(e.nombre, e.txt, 'data-i="' + i + '"')).join('') +
    '<h3>o de cero</h3><div class="op" data-nueva="1">hoja nueva</div>' +
    '<div class="op" data-archivo="1">abrir un archivo…</div>';
  panelTemas.querySelectorAll('.op').forEach(el => el.addEventListener('mousedown', ev => {
    ev.preventDefault();
    // la × borra y deja el panel abierto: borrar de a uno es un gesto de lista,
    // y cerrarlo obligaría a volver a abrirlo por cada tema que sobra
    if (ev.target.classList.contains('borrar')) {
      olvidarTema(mios[+el.dataset.mio].nombre);
      // sin cortarlo acá, el que cierra el panel al apretar afuera lo cerraría:
      // para cuando le toca, la fila que se apretó ya no está en el panel —
      // abrirTemas() lo rehizo entero— y desde afuera eso es un click afuera
      ev.stopPropagation();
      return abrirTemas();
    }
    panelTemas.classList.remove('abierto');
    // el diálogo de archivos lo abre elegirArchivo(), que después carga el tema:
    // no hay nada que cargar todavía
    if (el.dataset.archivo) return elegirArchivo();
    cargarTema(el.dataset.nueva ? { nombre: '', txt: '' }
      : el.dataset.mio ? mios[+el.dataset.mio]
      : EJEMPLOS[+el.dataset.i]);
    src.focus();
  }));
  const r = btnAbrir.getBoundingClientRect();
  panelTemas.style.left = Math.round(r.left) + 'px';
  panelTemas.style.top = Math.round(r.bottom + 6) + 'px';
  panelTemas.classList.add('abierto');
}

btnAbrir.addEventListener('click', () => {
  panelTemas.classList.contains('abierto') ? panelTemas.classList.remove('abierto') : abrirTemas();
});
addEventListener('mousedown', e => {
  if (!panelTemas.contains(e.target) && e.target !== btnAbrir) panelTemas.classList.remove('abierto');
});
addEventListener('keydown', e => { if (e.key === 'Escape') panelTemas.classList.remove('abierto'); });
