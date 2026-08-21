// ---------------------------------------------------------------- la cinta
// El marco es el tema visto de lejos: una franja por parte, cortada donde esa
// parte no toca. El grosor total no cambia nunca — las partes se reparten los
// mismos píxeles — así que sumar una línea no mueve nada de lo que hay abajo.
const cinta = document.getElementById('cinta');
let renglonesActuales = [];
// cuántas vueltas del tema abarca el secuenciador de punta a punta
let vueltasActuales = 1;
// dónde cae el secuenciador en la pantalla: lo necesita la aguja de la vuelta
let tramo = { desde: 0, hasta: 0, vueltas: 1 };

// ------------------------------------------------ qué golpe va en qué momento
// Sacado del propio strudel y no contado a mano: el patrón espejo lleva el
// número de paso adentro, así que cada golpe que devuelve trae puesto de qué
// palabra escrita salió. Con eso la cinta muestra lo que de verdad va a sonar
// —los que estiran, los que aceleran, el pulso de «en corcheas», las vueltas
// que el arreglo saltea— sin que nosotros rehagamos ninguna de esas cuentas.
const TOPE_GOLPES = 600;              // por si alguien encadena aceleradores

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
  const fin = w + 20;                 // el último paso se va por el borde, no termina en seco
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
    // la entrada, de abajo hasta la vuelta de la esquina: va entera, sin cortes
    svg += trazo('M ' + x + ' ' + h + ' L ' + x + ' ' + cy +
      ' A ' + radio + ' ' + radio + ' 0 0 1 ' + cx + ' ' + y + ' L ' + arranque + ' ' + y, color, grueso + 0.6);
    // el silencio es un silencio: no se dibuja nada. Lo único que queda fino es
    // una parte callada, que sí está escrita pero no suena
    const ancho = r.callado ? Math.max(2.5, grueso * 0.25) : grueso + 0.6;
    for (const g of r.golpes || golpesParejos(r, vueltas)) {
      const a = enX(g.desde), z = enX(g.hasta);
      const hueco = Math.min(8, (z - a) * 0.28);
      if (z - a <= hueco) continue;
      svg += trazo('M ' + (a + hueco / 2) + ' ' + y + ' L ' + (z - hueco / 2) + ' ' + y, color, ancho);
    }
  });
  // Los bordes de vuelta. Ocho vueltas seguidas no se cuentan sin algo que las
  // separe, y son la unidad con la que está escrito el tema: cada línea de la
  // hoja da una de éstas. Van encima de las franjas porque son una regla sobre
  // la cinta, no un hueco en ella.
  for (let k = 1; k < vueltas; k++)
    svg += '<line x1="' + enX(k).toFixed(1) + '" x2="' + enX(k).toFixed(1) + '"' +
      ' y1="0" y2="' + marco + '" style="stroke: var(--linea); stroke-width: 1; stroke-opacity: .55" />';
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
}
addEventListener('resize', reacomodar);
