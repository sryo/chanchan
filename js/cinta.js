// ---------------------------------------------------------------- la cinta
// El marco es el tema visto de lejos: una franja por parte, cortada donde esa
// parte no toca. El grosor total no cambia nunca — las partes se reparten los
// mismos píxeles — así que sumar una línea no mueve nada de lo que hay abajo.
// Se le puede preguntar de quién es cada franja pasándole por encima, pero nada
// más: la cinta se lee y no se escribe. Está dibujada detrás de todo y ocupa el
// borde entero de la ventana, así que un click suyo sería un click en el fondo
// de la página que cambia el texto sin que se vea dónde. Callar una parte es del
// puntito del margen, que es un botón, mide veintidós píxeles y está al lado del
// renglón que cambia.
const cinta = document.getElementById('cinta');
let renglonesActuales = [];
// cuántas vueltas del tema abarca el secuenciador de punta a punta
let vueltasActuales = 1;
// las secciones en el orden de la forma, con cuánto dura cada una
let tramosActuales = [];
// dónde cae el secuenciador en la pantalla: lo necesita la aguja de la vuelta
let tramo = { desde: 0, hasta: 0, vueltas: 1 };

// ------------------------------------------------ qué golpe va en qué momento
// Sacado del propio strudel y no contado a mano: el patrón espejo lleva el
// número de paso adentro, así que cada golpe que devuelve trae puesto de qué
// palabra escrita salió. Con eso la cinta muestra lo que de verdad va a sonar
// —los que estiran, los que aceleran, el pulso de «en corcheas», las vueltas
// que el arreglo saltea— sin que nosotros rehagamos ninguna de esas cuentas.
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
// los pasos escritos, que es como se dibujaba antes de que la cinta consultara.
// Dura lo que dura el prebake; al terminar, actualizar() vuelve a dibujar sola.
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
  // Antes eran 128 píxeles más a la derecha, que no eran de ningún lado.
  const arranque = cx;
  // Acá termina la vuelta larga y vuelve a empezar. Cae justo en el borde y no
  // veinte píxeles más allá, como estaba: aquello dejaba el punto de repetición
  // fuera de la pantalla, así que la aguja se apagaba antes de llegar y la vuelta
  // nunca se veía cerrar. Un secuenciador tiene que mostrar dónde vuelve.
  const fin = w;
  const grueso = marco / Math.max(1, n);
  const vueltas = Math.max(1, vueltasActuales);
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
    // la entrada: sube por el borde y dobla en la esquina hasta enderezarse
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
    // Lo que recibe el mouse es sólo el tramo horizontal, que es el que dice
    // cuándo. La entrada y la curva no son el secuenciador: dicen de qué renglón
    // baja la franja, no en qué momento suena, y encima quedan tapadas por el
    // editor casi en todo su largo — un blanco que responde arriba y no responde
    // abajo es peor que ninguno.
    svg += '<path class="toque" d="M ' + arranque + ' ' + y + ' L ' + fin + ' ' + y +
      '" stroke-width="' + grueso.toFixed(2) + '" /></g>';
  });
  // Los bordes de vuelta. Ocho vueltas seguidas no se cuentan sin algo que las
  // separe, y son la unidad con la que está escrito el tema: cada línea de la
  // hoja da una de éstas.
  //
  // Eran una raya del color del papel puesta encima de la cinta, y ahí no podían
  // verse: el borde de vuelta cae casi siempre donde la línea también corta un
  // golpe del anterior, así que la raya clara aterrizaba justo sobre un hueco
  // claro y no quedaba nada. Ahora van en tinta —que se lee sobre el papel del
  // hueco y sobre el color del golpe que lo cruza— y siguen unos píxeles por
  // debajo de la cinta, sobre la hoja: ese pedacito que sobra es lo que las
  // vuelve una regla y no una interrupción de la cinta. La primera va en el
  // arranque, que es donde la forma empieza a contar; y si no hay partes no hay
  // nada que medir, así que la hoja vacía no lleva regla.
  //
  // Con secciones hay dos reglas y no una. La de vueltas se calla cuando no entra
  // —una forma de sesenta compases en mil píxeles es una trama gris, no una
  // cuenta— y arriba de ella van los bordes de sección, que llevan el nombre
  // escrito: es lo que convierte a la cinta en la forma del tema y no en un
  // montón de vueltas iguales.
  const ancho = (fin - arranque) / vueltas;
  if (n && (!tramosActuales.length || ancho >= 7))
    for (let k = 0; k < vueltas; k++)
      svg += '<line class="regla" x1="' + enX(k).toFixed(1) + '" x2="' + enX(k).toFixed(1) + '"' +
        ' y1="0" y2="' + (marco + 5) + '" />';
  let v = 0;
  for (const t of (n ? tramosActuales : [])) {
    const x = enX(v);
    svg += '<line class="corte" x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '"' +
      ' y1="0" y2="' + (marco + 16) + '" />';
    // el nombre sólo si su sección le da lugar: escrito encima del de al lado no
    // dice cuál es cuál, dice que hay letras
    if (t.largo * ancho > t.nom.length * 6 + 8)
      svg += '<text class="rotulo" x="' + (x + 5).toFixed(1) + '" y="' + (marco + 13) + '">' +
        esc(t.nom) + '</text>';
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

// Dónde estamos en la forma. La cinta abarca la vuelta larga —hasta que todas
// las líneas vuelven a caer juntas—, así que la aguja la recorre entera y una
// sola sirve para todas las franjas: una línea con «una por vuelta» tarda ocho
// en dar toda su cuerda y la aguja llega a la punta justo cuando la terminó.
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

// El botón y el logo se tiñen con las puntas del tema: cada uno se ve distinto.
// Van en trama, la misma banda de la cinta y del puntito: el botón cae dentro de
// la curva que dibujan las franjas y el logo va apoyado contra él, así que son
// una sola pieza y tienen que ser un solo color. Aparte va la tinta del tema,
// que es para lo que se escribe con su color y no se pinta con él: el número del
// tempo, el ▾ del nombre, el tema abierto en la lista.
function pintarMarca(renglones) {
  const raiz = document.documentElement.style;
  if (!renglones.length) {
    for (const v of ['--marca', '--marca-fin', '--marca-tinta']) raiz.removeProperty(v);
    return;
  }
  raiz.setProperty('--marca', tramaDe(renglones[0].voz));
  raiz.setProperty('--marca-fin', tramaDe(renglones[renglones.length - 1].voz));
  raiz.setProperty('--marca-tinta', tintaDe(renglones[0].voz));
}

function reacomodar() {
  dibujarCinta(renglonesActuales);
  armarPuntos(marcasActuales, calladasActuales);
  acomodarColgantes();      // el texto se reacomodó abajo de ellos
}
addEventListener('resize', reacomodar);

// ------------------------------------------------------ señalar una franja
// El puntito del margen y la franja de la cinta son la misma línea vista de dos
// lados: el punto de canto, la franja de frente. Así que se contestan: pasar por
// uno enciende al otro. Hace falta porque el color es una clave y no una
// respuesta —dos partes de la misma familia salen del mismo tono a propósito, y
// la bata y los platillos son el mismo carmín—, así que de qué franja era cada
// línea había que deducirlo. Ahora se contesta apuntando.
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
