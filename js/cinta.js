// ---------------------------------------------------------------- la cinta
// el grosor total no cambia: las partes se reparten los mismos píxeles
const cinta = document.getElementById('cinta');
// dónde cae el secuenciador: lo lee la aguja
let tramo = { desde: 0, hasta: 0, vueltas: 1 };

// ------------------------------------------------ qué golpe va en qué momento
// los golpes los da strudel, ver REGLAS.md
const TOPE_GOLPES = 4000;             // por si alguien encadena aceleradores

function golpesDe(pat, vueltas) {
  let haps;
  try { haps = pat.queryArc(0, vueltas); } catch (e) { return null; }
  const out = [];
  for (const h of haps) {
    // un hap sin «whole» es el pedazo de otro, cortado por el borde de la consulta
    if (!h.whole) continue;
    const desde = Math.max(0, Number(h.whole.begin));
    const hasta = Math.min(vueltas, Number(h.whole.end));
    if (hasta <= desde) continue;
    out.push({ desde, hasta, n: h.value && h.value.n });
    if (out.length >= TOPE_GOLPES) break;
  }
  return out;
}

// mientras strudel no está, el ancho se reparte entre los pasos escritos
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
  // el arco es concéntrico con el botón
  const caja = btnTocar.getBoundingClientRect();
  const cx = caja.width ? caja.left + caja.width / 2 : 120;
  const cy = caja.height ? caja.top + caja.height / 2 : 120;
  const RADIO = Math.max(marco, (cx + cy) / 2 - medio);
  // donde las franjas terminan de doblar, que cae sobre el margen de las palabras
  const arranque = cx;
  // cierra justo en el borde: unos píxeles más allá la aguja se apaga antes de llegar
  const fin = w;
  const grueso = marco / Math.max(1, n);
  const vueltas = Math.max(1, actual.vueltas);
  tramo = { desde: arranque, hasta: fin, vueltas };
  const enX = v => arranque + (fin - arranque) * (v / vueltas);
  const trazo = (d, color, ancho) =>
    '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + ancho.toFixed(2) + '" />';
  let svg = '';
  if (!n) svg += '<path d="M ' + medio + ' ' + h + ' L ' + medio + ' ' + cy +
    ' A ' + RADIO + ' ' + RADIO + ' 0 0 1 ' + cx + ' ' + medio + ' L ' + fin + ' ' + medio +
    '" fill="none" style="stroke: var(--linea); stroke-width: 2.5" />';
  renglones.forEach((r, i) => {
    const d = marco / 2 - grueso / 2 - i * grueso;
    const x = medio - d, y = medio - d, radio = RADIO + d;
    const color = tramaDe(r.voz);
    const curva = 'M ' + x + ' ' + h + ' L ' + x + ' ' + cy +
      ' A ' + radio + ' ' + radio + ' 0 0 1 ' + cx + ' ' + y;
    // una parte callada va fina entera, entrada incluida
    const ancho = r.callado ? Math.max(2.5, grueso * 0.25) : grueso + 0.6;
    svg += '<g class="franja' + (r.nro - 1 === franjaSeñalada ? ' sola' : '') +
      '" data-l="' + (r.nro - 1) + '"><title>' + esc(r.nombre) + '</title>';
    // la entrada va entera, sin cortes
    svg += trazo(curva + ' L ' + arranque + ' ' + y, color, ancho);
    for (const g of r.golpes || golpesParejos(r, vueltas)) {
      const a = enX(g.desde), z = enX(g.hasta);
      // el hueco separa dos golpes seguidos y nada más: más grande, la cinta es un código de barras
      const hueco = Math.min(4, (z - a) * 0.28);
      if (z - a <= hueco) continue;
      svg += trazo('M ' + (a + hueco / 2) + ' ' + y + ' L ' + (z - hueco / 2) + ' ' + y, color, ancho);
    }
    // el blanco es sólo el tramo horizontal: la entrada queda tapada por el editor
    svg += '<path class="toque" d="M ' + arranque + ' ' + y + ' L ' + fin + ' ' + y +
      '" stroke-width="' + grueso.toFixed(2) + '" /></g>';
  });
  // tapa las franjas y deja la regla, los cortes y los rótulos, que son el marco
  let vt = 0;
  for (const t of (n ? actual.tramos : [])) {
    const x = enX(vt), ancho2 = enX(vt + t.largo) - x;
    svg += '<rect class="tramo' + (t.nom === tramoSeñalado ? ' sola' : '') + '"' +
      ' data-nom="' + esc(t.nom) + '" x="' + x.toFixed(1) + '" y="0"' +
      ' width="' + ancho2.toFixed(1) + '" height="' + marco + '" />';
    vt += t.largo;
  }
  // la regla se calla cuando no entra: sesenta compases en mil píxeles son una trama, no una cuenta
  const ancho = (fin - arranque) / vueltas;
  if (n && (!actual.tramos.length || ancho >= 7))
    for (let k = 0; k < vueltas; k++)
      svg += '<line class="regla" x1="' + enX(k).toFixed(1) + '" x2="' + enX(k).toFixed(1) + '"' +
        ' y1="0" y2="' + (marco + 5) + '" />';
  let v = 0;
  for (const t of (n ? actual.tramos : [])) {
    const x = enX(v);
    const sola = t.nom === tramoSeñalado ? ' sola' : '';
    svg += '<line class="corte" x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '"' +
      ' y1="0" y2="' + (marco + 16) + '" />';
    // el nombre sólo si su sección le da lugar
    if (t.largo * ancho > t.escrito.length * 6 + 8)
      svg += '<text class="rotulo' + sola + '" data-nom="' + esc(t.nom) + '"' +
        ' x="' + (x + 5).toFixed(1) + '" y="' + (marco + 13) + '">' + esc(t.escrito) + '</text>';
    v += t.largo;
  }
  // el anillo lleva la vuelta corta, la que se cuenta con el pie; la aguja, la forma entera.
  // del color de la aguja y no de la marca: es tiempo, ver REGLAS.md
  vueltaAnillo = 2 * Math.PI * ((caja.width || 64) / 2 + 6);
  svg += '<circle id="anillo" cx="' + cx + '" cy="' + cy + '" r="' + ((caja.width || 64) / 2 + 6) + '"' +
    ' fill="none" stroke="var(--texto)" stroke-width="2" stroke-linecap="round"' +
    ' transform="rotate(-90 ' + cx + ' ' + cy + ')"' +
    ' stroke-dasharray="0 ' + vueltaAnillo.toFixed(1) + '" style="display: none" />';
  // al final, para quedar arriba de las franjas
  svg += '<line id="aguja" y1="-2" y2="' + (marco + 2) + '" x1="-9" x2="-9"' +
    ' style="stroke: var(--texto); stroke-width: 2; display: none" />';
  cinta.innerHTML = svg;
  aguja = document.getElementById('aguja');
  anillo = document.getElementById('anillo');
}

// la cinta abarca la vuelta larga: una sola aguja sirve para todas las franjas
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

// el botón y el logo se tiñen con las puntas del tema, en trama: son una pieza con la cinta
function pintarMarca(renglones) {
  const raiz = document.documentElement.style;
  dibujarIcono(renglones);
  if (!renglones.length) {
    for (const v of ['--marca', '--marca-fin', '--marca-tinta']) raiz.removeProperty(v);
    // sin tema el botón es la tinta de la página, y de noche la tinta es clara: el ojo se da vuelta
    raiz.setProperty('--ojo', 'var(--fondo)');
    return;
  }
  raiz.removeProperty('--ojo');
  raiz.setProperty('--marca', tramaDe(renglones[0].voz));
  raiz.setProperty('--marca-fin', tramaDe(renglones[renglones.length - 1].voz));
  raiz.setProperty('--marca-tinta', tintaDe(renglones[0].voz));
}

// --------------------------------------------------------------- la pestaña
// el codo de la cinta, ver REGLAS.md; a escala no entra: a 16 px la banda mide un cuarto de píxel
const ICONO = { borde: 1.2, banda: 6.2, centro: 8.4 };
const pestaña = document.querySelector('link[rel="icon"]');
let ultimoIcono = '';

// el centro del arco está en la diagonal: las franjas salen concéntricas, como las grandes
const trazoIcono = (x, ancho, color) =>
  '<path d="M' + x.toFixed(2) + ',16V' + ICONO.centro +
  'A' + (ICONO.centro - x).toFixed(2) + ',' + (ICONO.centro - x).toFixed(2) +
  ',0,0,1,' + ICONO.centro + ',' + x.toFixed(2) + 'H16"' +
  ' fill="none" stroke="' + color + '" stroke-width="' + ancho.toFixed(2) + '"/>';

function dibujarIcono(renglones) {
  const n = renglones.length;
  let dibujo;
  if (!n) {
    // el marco solo, en la tinta del punteo: la del marco no se ve contra la barra del navegador
    const tinta = getComputedStyle(document.documentElement).getPropertyValue('--punteo').trim();
    dibujo = trazoIcono(ICONO.borde + ICONO.banda / 2, 1.6, tinta);
  } else {
    const grueso = ICONO.banda / n;
    dibujo = renglones.map((r, i) => trazoIcono(
      ICONO.borde + grueso / 2 + i * grueso,
      r.callado ? Math.max(0.5, grueso * 0.25) : grueso + 0.15,
      tramaDe(r.voz))).join('');
  }
  // se pinta en cada tecla y cambia una de cada mil
  if (dibujo === ultimoIcono) return;
  ultimoIcono = dibujo;
  pestaña.href = 'data:image/svg+xml,' + encodeURIComponent(
    // con comas, como el escrito a mano en el html, que no puede llevar espacios sin escapar
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0,0,16,16">' + dibujo + '</svg>');
}

function reacomodar() {
  dibujarCinta(actual.renglones);
  armarPuntos(marcasActuales, calladasActuales);
  acomodarColgantes();      // el texto se reacomodó abajo de ellos
}
addEventListener('resize', reacomodar);

// ------------------------------------------------------ señalar una franja
// el puntito y la franja son la misma línea: pasar por uno enciende al otro
let franjaSeñalada = null;

function aplicarFranja(l) {
  if (franjaSeñalada === l) return;
  franjaSeñalada = l;
  cinta.classList.toggle('senalando', l != null);
  for (const g of cinta.querySelectorAll('.franja')) g.classList.toggle('sola', +g.dataset.l === l);
  for (const b of document.querySelectorAll('.punto')) b.classList.toggle('senalado', +b.dataset.l === l);
}

// pasar por el nombre de una sección apaga el resto del tiempo
let tramoSeñalado = null;

function señalarTramo(nom) {
  // una sección que la forma no toca no tiene dónde encenderse, y apagar todo sería peor
  if (nom != null && !actual.tramos.some(t => t.nom === nom)) nom = null;
  if (tramoSeñalado === nom) return;
  tramoSeñalado = nom;
  cinta.classList.toggle('senalandoTramo', nom != null);
  for (const el of cinta.querySelectorAll('.tramo, .rotulo'))
    el.classList.toggle('sola', el.dataset.nom === nom);
}

// la cinta está en el camino a la barra del navegador: cruzarla no es apuntarle;
// desde el puntito no hay espera, ni con la cinta ya encendida, ni para apagar
const ESPERA_FRANJA = 140;
let relojFranja;

function señalarFranja(l, desdeLaCinta) {
  clearTimeout(relojFranja);
  if (l == null || !desdeLaCinta || franjaSeñalada != null) return aplicarFranja(l);
  relojFranja = setTimeout(() => aplicarFranja(l), ESPERA_FRANJA);
}

// una sola escucha para franja y punto: dos separadas se pisaban
addEventListener('mouseover', e => {
  const el = e.target.closest && e.target.closest('.franja, .punto');
  señalarFranja(el ? +el.dataset.l : null, !!el && el.classList.contains('franja'));
});
document.documentElement.addEventListener('mouseleave', () => señalarFranja(null));
