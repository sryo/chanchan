// ---------------------------------------------------------------- la hoja vacía
// El vocabulario entero ya lo sirven el menú del ▾ y el sugeridor, que además
// saben en qué palabra estás parado. Lo único que no vivía en ningún otro lado
// eran el molde y los temas hechos, así que van acá: mientras la hoja está en
// blanco, la página se explica sola; en cuanto escribís algo, desaparece.
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
    '<p class="molde">la <b>&lt;parte&gt;</b> toca <b>&lt;pasos&gt;</b>, <b>&lt;cómo&gt;</b></p>' +
    '<p class="molde">va a <b>&lt;n&gt;</b></p>' +
    (mios.length ? '<p class="pista">volvé a uno tuyo</p><div class="ejemplos mios"></div>' : '') +
    '<p class="pista">o abrí uno de estos</p>' +
    '<div class="ejemplos"></div>';
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
    '<h3>o de cero</h3><div class="op" data-nueva="1">hoja nueva</div>';
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
    cargarTema(el.dataset.nueva ? { nombre: '', txt: '' }
      : el.dataset.mio ? mios[+el.dataset.mio]
      : EJEMPLOS[+el.dataset.i]);
    src.focus();
    panelTemas.classList.remove('abierto');
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

const EJEMPLOS = [
  // Cada uno sale de abrir el midi de un tema real y copiar el esqueleto: el
  // tempo, la tonalidad, la vuelta entera de acordes y en qué corchea cae cada
  // golpe de la batería. No está el tema (no hay melodía ni letra), está la
  // base sobre la que el tema está armado, con la estrofa y el estribillo uno
  // atrás del otro.
  //   charly      → Demoliendo Hoteles: cuatro compases de do (el boogie es de
  //                 un acorde solo) y ahí recién fa do re re.
  //   spinetta    → Muchacha (ojos de papel): la frase de ocho, con el bajo
  //                 bajando la-sol-fa-re y volviendo por sol do si.
  //   ricotero    → Ji Ji Ji: el riff de re, dos compases por acorde, y el
  //                 estribillo que se va a fa do si bemol re en quintas.
  //   soda        → Persiana Americana: la estrofa va mi menor y do turnándose,
  //                 el estribillo re do sol mi menor.
  //   babasónicos → Putita: la-do-fa-do en la estrofa, fa-mi-la-do en el otro.
  { nombre: 'a lo charly', txt:
`va a 155

la bata toca pum tas pum tas
los platillos tocan chis chis chis chis, al doble
el bajo toca do grave do grave do grave do grave fa grave do grave re grave re grave, una por vuelta, en corcheas
la viola distorsionada toca do quinta do quinta do quinta do quinta fa quinta do quinta re quinta re quinta, una por vuelta, en corcheas
el piano toca do séptima do séptima do séptima do séptima fa mayor do mayor re mayor re mayor, una por vuelta` },

  { nombre: 'a lo spinetta', txt:
`va a 140

el piano toca la menor mi menor fa mayor re menor sol séptima sol séptima do mayor sol mayor, una por vuelta, con eco
el bajo toca la muy grave sol muy grave fa muy grave re muy grave sol muy grave sol muy grave do grave si muy grave, una por vuelta
la viola criolla toca mi la do mi, con eco, bajito` },

  { nombre: 'ricotero', txt:
`va a 169

la bata toca pum tas pum tas
los platillos tocan chis chis chis chis
el bajo toca re grave mi grave do sostenido grave re grave fa grave do grave si bemol grave re grave, una por vuelta, a la mitad, fuerte
el pedal toca - - - la muy grave, en un bajo, bajito
la viola distorsionada toca re menor mi menor do sostenido disminuido re menor fa quinta do quinta si bemol quinta re quinta, una por vuelta, a la mitad` },

  { nombre: 'a lo soda', txt:
`va a 101

la bata toca pum - tas pum - pum tas -
el ride toca tin tin tin tin, al doble, bajito
las palmas tocan - - chas - - - chas -
el bajo toca mi muy grave do grave mi muy grave do grave re grave do grave sol muy grave mi muy grave, una por vuelta, sincopado
la viola eléctrica toca mi menor do mayor mi menor do mayor re mayor do mayor sol mayor mi menor, una por vuelta, con eco, de un lado al otro` },

  { nombre: 'a lo babasónicos', txt:
`va a 89

la bata toca pum - tas pum - - tas -
los platillos tocan chis chis chis chis, al doble, bajito
el bajo toca la muy grave do grave fa muy grave do grave fa muy grave mi muy grave la muy grave do grave, una por vuelta, apagado
el piano toca la menor do mayor fa mayor do mayor fa mayor mi mayor la menor do mayor, una por vuelta, con eco, bajito` },

  // Grieg, «En la gruta del rey de la montaña», 1875: dominio público, así que
  // acá no hay esqueleto, está el tema entero nota por nota. Del midi salen la
  // tonalidad (mi menor, con la melodía arrancando en si), las dos frases de
  // dieciséis negras y el bajo que va de a dos: mi si mi si do sol mi si.
  // Grieg lo escribió para que se vaya acelerando; acá se acelera a mano,
  // subiendo el número de arriba mientras suena.
  { nombre: 'la gruta', txt:
`va a 138

la melodía toca si grave do sostenido re mi fa sostenido re fa sostenido - sol re sol - fa sostenido re fa sostenido - si grave do sostenido re mi fa sostenido re fa sostenido - sol re sol - re - - -, a un octavo, en pizzicato, fuerte
el contrabajo toca mi muy grave si muy grave mi muy grave si muy grave do grave sol grave mi muy grave si muy grave, a un cuarto
los timbales tocan mi muy grave - - -, bajito` },

  { nombre: 'tunga tunga', txt:
`va a 132

el bombo toca pum - pum -
el bajo toca do grave - sol grave -
el piano toca - do mayor - do mayor, bajito
los platillos tocan chis chis chis chis, al doble, bajito` },
];
