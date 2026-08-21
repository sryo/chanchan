// ---------------------------------------------------------------- la cinta
// El marco es el tema visto de lejos: una franja por parte, cortada donde esa
// parte no toca. El grosor total no cambia nunca — las partes se reparten los
// mismos píxeles — así que sumar una línea no mueve nada de lo que hay abajo.
const cinta = document.getElementById('cinta');
let renglonesActuales = [];
// dónde cae el secuenciador en la pantalla: lo necesita la aguja de la vuelta
let tramo = { desde: 0, hasta: 0, alto: 65 };

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
  const arranque = cx + 128;          // dónde empieza el secuenciador sobre la cinta de arriba
  const fin = w + 20;                 // el último paso se va por el borde, no termina en seco
  const grueso = marco / Math.max(1, n);
  tramo = { desde: arranque, hasta: fin, alto: marco };
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
    const color = colorDe(r.voz);
    // la entrada, de abajo hasta la vuelta de la esquina: va entera, sin cortes
    svg += trazo('M ' + x + ' ' + h + ' L ' + x + ' ' + cy +
      ' A ' + radio + ' ' + radio + ' 0 0 1 ' + cx + ' ' + y + ' L ' + arranque + ' ' + y, color, grueso + 0.6);
    const golpes = r.lugares.map(l => !!l);
    const paso = (fin - arranque) / golpes.length;
    const hueco = Math.min(8, paso * 0.28);
    const callada = r.callado;
    golpes.forEach((suena, k) => {
      // el silencio es un silencio: no se dibuja nada. Lo único que queda fino
      // es una parte callada, que sí está escrita pero no suena
      if (!suena) return;
      const a = arranque + k * paso + hueco / 2, z = arranque + (k + 1) * paso - hueco / 2;
      svg += trazo('M ' + a + ' ' + y + ' L ' + z + ' ' + y, color,
        callada ? Math.max(2.5, grueso * 0.25) : grueso + 0.6);
    });
  });
  // la aguja va al final para quedar arriba de todas las franjas
  svg += '<line id="aguja" y1="-2" y2="' + (marco + 2) + '" x1="-9" x2="-9"' +
    ' style="stroke: var(--texto); stroke-width: 2; display: none" />';
  cinta.innerHTML = svg;
  aguja = document.getElementById('aguja');
}

// Dónde estamos en la vuelta. La vuelta es la del tema entero — la que fija
// «la banda va a tantos» —, así que una sola aguja sirve para todas las franjas.
// Las líneas con «una por vuelta» tardan varias en dar toda su cuerda: la aguja
// marca el pulso común, no el paso de cada una.
let aguja = null;

function moverAguja() {
  if (!aguja) return;
  let t = null;
  if (sonando) { try { t = getTime(); } catch (e) { t = null; } }
  if (t == null) { aguja.style.display = 'none'; return; }
  const x = tramo.desde + (tramo.hasta - tramo.desde) * (t % 1);
  aguja.setAttribute('x1', x.toFixed(1));
  aguja.setAttribute('x2', x.toFixed(1));
  aguja.style.display = '';
}

// el botón y el logo se tiñen con las puntas del tema: cada uno se ve distinto
function pintarMarca(renglones) {
  const raiz = document.documentElement.style;
  if (!renglones.length) {
    raiz.removeProperty('--marca'); raiz.removeProperty('--marca-fin');
    return;
  }
  raiz.setProperty('--marca', colorDe(renglones[0].voz));
  raiz.setProperty('--marca-fin', colorDe(renglones[renglones.length - 1].voz));
}

function reacomodar() {
  dibujarCinta(renglonesActuales);
  armarPuntos(marcasActuales, calladasActuales);
}
addEventListener('resize', reacomodar);
