// ---------------------------------------------------------------- la cinta
// El grosor total no cambia nunca —las partes se reparten los mismos píxeles—,
// así que sumar una línea no mueve nada de lo que hay abajo.
const cinta = document.getElementById('cinta');
// dónde cae el secuenciador en la pantalla: lo necesita la aguja de la vuelta
let tramo = { desde: 0, hasta: 0, vueltas: 1 };

// ------------------------------------------------ qué golpe va en qué momento
// Los golpes salen del propio strudel y no de una cuenta nuestra: ver REGLAS.md.
const TOPE_GOLPES = 4000;             // por si alguien encadena aceleradores

function golpesDe(pat, vueltas) {
  let haps;
  try { haps = pat.queryArc(0, vueltas); } catch (e) { return null; }
  const out = [];
  for (const h of haps) {
    // un hap sin «whole» es el pedazo de otro, cortado por el borde de la
    // consulta: no es un golpe nuevo y dibujarlo duplicaría el que ya está
    if (!h.whole) continue;
    const desde = Math.max(0, Number(h.whole.begin));
    const hasta = Math.min(vueltas, Number(h.whole.end));
    if (hasta <= desde) continue;
    out.push({ desde, hasta, n: h.value && h.value.n });
    if (out.length >= TOPE_GOLPES) break;
  }
  return out;
}

// Mientras strudel no está no hay a quién preguntarle: se reparte el ancho entre
// los pasos escritos. Dura lo que dura el prebake.
function golpesParejos(r, vueltas) {
  const paso = vueltas / r.lugares.length;
  return r.lugares.map((l, k) => l && { desde: k * paso, hasta: (k + 1) * paso, n: k })
    .filter(Boolean);
}

function dibujarCinta(renglones) {
  const w = innerWidth, h = innerHeight;
  cinta.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
  cinta.setAttribute('preserveAspectRatio', 'none');
  const n = renglones.length;
  const marco = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--marco')) || 65;
  const medio = marco / 2;
  // La curva es concéntrica con el botón: el centro del arco es el centro del
  // botón, y el radio sale de ahí. El hueco de arriba y la sangría miden lo
  // mismo, así que el centro cae a la misma distancia de los dos bordes.
  const caja = btnTocar.getBoundingClientRect();
  const cx = caja.width ? caja.left + caja.width / 2 : 120;
  const cy = caja.height ? caja.top + caja.height / 2 : 120;
  const RADIO = Math.max(marco, (cx + cy) / 2 - medio);
  // Donde el secuenciador empieza a contar. Es el punto en que las franjas
  // terminan de doblar —todos los arcos son concéntricos, así que las cinco se
  // enderezan en la misma vertical—, y esa vertical cae sobre el margen donde
  // empiezan las palabras, abajo: la franja arranca donde arranca su línea.
  const arranque = cx;
  // La vuelta larga cierra justo en el borde: un secuenciador tiene que mostrar
  // dónde vuelve, y unos píxeles más allá la aguja se apaga antes de llegar.
  const fin = w;
  const grueso = marco / Math.max(1, n);
  const vueltas = Math.max(1, actual.vueltas);
  tramo = { desde: arranque, hasta: fin, vueltas };
  const enX = v => arranque + (fin - arranque) * (v / vueltas);
  const trazo = (d, color, ancho) =>
    '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + ancho.toFixed(2) + '" />';
  let svg = '';
  // sin partes escritas el marco no desaparece: queda su raya, esperando
  if (!n) svg += '<path d="M ' + medio + ' ' + h + ' L ' + medio + ' ' + cy +
    ' A ' + RADIO + ' ' + RADIO + ' 0 0 1 ' + cx + ' ' + medio + ' L ' + fin + ' ' + medio +
    '" fill="none" style="stroke: var(--linea); stroke-width: 2.5" />';
  renglones.forEach((r, i) => {
    const d = marco / 2 - grueso / 2 - i * grueso;
    const x = medio - d, y = medio - d, radio = RADIO + d;
    const color = tramaDe(r.voz);
    const curva = 'M ' + x + ' ' + h + ' L ' + x + ' ' + cy +
      ' A ' + radio + ' ' + radio + ' 0 0 1 ' + cx + ' ' + y;
    // el silencio es un silencio: no se dibuja nada. Lo único que queda fino es
    // una parte callada, que sí está escrita pero no suena — y va fina en toda su
    // franja, entrada incluida: media franja gorda y media fina decía dos cosas
    // distintas de la misma línea, y la gorda es la que más se ve.
    const ancho = r.callado ? Math.max(2.5, grueso * 0.25) : grueso + 0.6;
    svg += '<g class="franja' + (r.nro - 1 === franjaSeñalada ? ' sola' : '') +
      '" data-l="' + (r.nro - 1) + '"><title>' + esc(r.nombre) + '</title>';
    // la entrada, de abajo hasta la vuelta de la esquina: va entera, sin cortes
    svg += trazo(curva + ' L ' + arranque + ' ' + y, color, ancho);
    for (const g of r.golpes || golpesParejos(r, vueltas)) {
      const a = enX(g.desde), z = enX(g.hasta);
      // El hueco separa dos golpes seguidos y nada más. Llegaba a ocho píxeles y
      // eso lo convertía en otra cosa: todos los golpes quedaban con la misma
      // sangría al lado, tocara una redonda o una semicorchea, y la cinta se leía
      // como una tira de código de barras en vez de como algo que dura.
      const hueco = Math.min(4, (z - a) * 0.28);
      if (z - a <= hueco) continue;
      svg += trazo('M ' + (a + hueco / 2) + ' ' + y + ' L ' + (z - hueco / 2) + ' ' + y, color, ancho);
    }
    // El blanco es sólo el tramo horizontal: la entrada dice de qué renglón baja la
    // franja, no cuándo suena, y queda tapada por el editor casi en todo su largo.
    svg += '<path class="toque" d="M ' + arranque + ' ' + y + ' L ' + fin + ' ' + y +
      '" stroke-width="' + grueso.toFixed(2) + '" /></g>';
  });
  // La regla de vueltas y los cortes de sección son dos reglas y no una: por qué
  // van en tinta, en la hoja (#cinta .regla). La de vueltas se calla cuando no
  // entra —una forma de sesenta compases en mil píxeles es una trama gris, no una
  // cuenta—, y sin partes no hay nada que medir.
  const ancho = (fin - arranque) / vueltas;
  if (n && (!actual.tramos.length || ancho >= 7))
    for (let k = 0; k < vueltas; k++)
      svg += '<line class="regla" x1="' + enX(k).toFixed(1) + '" x2="' + enX(k).toFixed(1) + '"' +
        ' y1="0" y2="' + (marco + 5) + '" />';
  let v = 0;
  for (const t of (n ? actual.tramos : [])) {
    const x = enX(v);
    svg += '<line class="corte" x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '"' +
      ' y1="0" y2="' + (marco + 16) + '" />';
    // el nombre sólo si su sección le da lugar: escrito encima del de al lado no
    // dice cuál es cuál, dice que hay letras. Va tal como se escribió y no
    if (t.largo * ancho > t.escrito.length * 6 + 8)
      svg += '<text class="rotulo" x="' + (x + 5).toFixed(1) + '" y="' + (marco + 13) + '">' +
        esc(t.escrito) + '</text>';
    v += t.largo;
  }
  // El anillo del botón lleva la vuelta corta, la que se cuenta con el pie. La
  // aguja recorre la forma entera, que puede ser de dieciséis; para entrar a
  // tiempo hace falta la otra. Del mismo color que la aguja y no del de la
  // marca: las dos dicen lo mismo —dónde estamos ahora— y tienen que leerse
  // como una sola cosa puesta encima del tema, no como parte de él.
  vueltaAnillo = 2 * Math.PI * ((caja.width || 64) / 2 + 6);
  svg += '<circle id="anillo" cx="' + cx + '" cy="' + cy + '" r="' + ((caja.width || 64) / 2 + 6) + '"' +
    ' fill="none" stroke="var(--texto)" stroke-width="2" stroke-linecap="round"' +
    ' transform="rotate(-90 ' + cx + ' ' + cy + ')"' +
    ' stroke-dasharray="0 ' + vueltaAnillo.toFixed(1) + '" style="display: none" />';
  // la aguja va al final para quedar arriba de todas las franjas
  svg += '<line id="aguja" y1="-2" y2="' + (marco + 2) + '" x1="-9" x2="-9"' +
    ' style="stroke: var(--texto); stroke-width: 2; display: none" />';
  cinta.innerHTML = svg;
  aguja = document.getElementById('aguja');
  anillo = document.getElementById('anillo');
}

// La cinta abarca la vuelta larga, así que una sola aguja sirve para todas las
// franjas: llega a la punta justo cuando la línea más lenta terminó su cuerda.
let aguja = null, anillo = null, vueltaAnillo = 0;

function moverAguja() {
  if (!aguja) return;
  let t = null;
  if (sonando) { try { t = getTime(); } catch (e) { t = null; } }
  if (t == null) {
    aguja.style.display = 'none';
    if (anillo) anillo.style.display = 'none';
    return;
  }
  const v = tramo.vueltas || 1;
  const x = tramo.desde + (tramo.hasta - tramo.desde) * ((t % v) / v);
  aguja.setAttribute('x1', x.toFixed(1));
  aguja.setAttribute('x2', x.toFixed(1));
  aguja.style.display = '';
  if (anillo) {
    anillo.setAttribute('stroke-dasharray',
      ((t % 1) * vueltaAnillo).toFixed(1) + ' ' + vueltaAnillo.toFixed(1));
    anillo.style.display = '';
  }
}

// El botón y el logo se tiñen con las puntas del tema. Van en trama, la misma
// banda de la cinta: el botón cae dentro de la curva que dibujan las franjas y
// el logo va apoyado contra él, así que son una sola pieza.
function pintarMarca(renglones) {
  const raiz = document.documentElement.style;
  if (!renglones.length) {
    for (const v of ['--marca', '--marca-fin', '--marca-tinta']) raiz.removeProperty(v);
    // Sin tema el botón no es un color de la rueda: es la tinta de la página. Y de
    // noche la tinta es clara, así que el ojo tiene que darse vuelta o desaparece
    // adentro del botón. El ojo es de quien lo lleva, no del modo.
    raiz.setProperty('--ojo', 'var(--fondo)');
    return;
  }
  raiz.removeProperty('--ojo');
  raiz.setProperty('--marca', tramaDe(renglones[0].voz));
  raiz.setProperty('--marca-fin', tramaDe(renglones[renglones.length - 1].voz));
  raiz.setProperty('--marca-tinta', tintaDe(renglones[0].voz));
}

function reacomodar() {
  dibujarCinta(actual.renglones);
  armarPuntos(marcasActuales, calladasActuales);
  acomodarColgantes();      // el texto se reacomodó abajo de ellos
}
addEventListener('resize', reacomodar);

// ------------------------------------------------------ señalar una franja
// El puntito y la franja son la misma línea vista de dos lados, así que pasar
// por uno enciende al otro. Por qué hace falta, en la hoja (#cinta.senalando).
let franjaSeñalada = null;

function aplicarFranja(l) {
  if (franjaSeñalada === l) return;
  franjaSeñalada = l;
  cinta.classList.toggle('senalando', l != null);
  for (const g of cinta.querySelectorAll('.franja')) g.classList.toggle('sola', +g.dataset.l === l);
  for (const b of document.querySelectorAll('.punto')) b.classList.toggle('senalado', +b.dataset.l === l);
}

// El borde de arriba de la ventana es el camino obligado hacia las pestañas y la
// barra del navegador, y la cinta está justo ahí: sin la espera, el marco entero
// se apagaba cada vez que uno se iba de la página. Apuntarle a una franja lleva
// más que cruzarla. Desde el puntito no hay espera —ir hasta un blanco de
// veintidós píxeles en el margen ya es apuntar—, ni tampoco para pasar de una
// franja a la de al lado con la cinta ya encendida, ni para apagar.
const ESPERA_FRANJA = 140;
let relojFranja;

function señalarFranja(l, desdeLaCinta) {
  clearTimeout(relojFranja);
  if (l == null || !desdeLaCinta || franjaSeñalada != null) return aplicarFranja(l);
  relojFranja = setTimeout(() => aplicarFranja(l), ESPERA_FRANJA);
}

// Una sola escucha para los dos lados: lo que está abajo del mouse dice qué línea
// es —sea la franja o el punto—, y si no hay ninguno se apaga. Dos escuchas
// separadas se pisaban, porque la de arriba veía el punto como «nada».
addEventListener('mouseover', e => {
  const el = e.target.closest && e.target.closest('.franja, .punto');
  señalarFranja(el ? +el.dataset.l : null, !!el && el.classList.contains('franja'));
});
document.documentElement.addEventListener('mouseleave', () => señalarFranja(null));
