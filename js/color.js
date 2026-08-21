// ------------------------------------------------------- el color de cada parte
// La familia da el matiz y el instrumento corre la luminosidad dentro de ella:
// todos los bajos son del mismo color, el slap más claro que el acústico.
//
// La rueda está escrita a mano y no salida de un orden cualquiera, porque el
// color tiene que querer decir algo: el bronce dorado, las cañas en el oliva de
// la madera, la flauta en el aire, las cuerdas frotadas en el azul frío. Y a la
// vez las nueve familias que de verdad conviven en un tema caen en los lugares
// pares, o sea a 40° unas de otras — que es lo único que la cinta necesita para
// que dos franjas no se confundan. Con el paso áureo, percusión y bajos quedaban
// a 12° y en «a lo charly» la batería y el bajo salían del mismo verde.
//
// Las otras nueve van en el medio, cada una al lado del pariente que le toca: la
// percusión afinada junto a la percusión, las láminas junto a los pianos, las
// del mundo junto a las violas. Eso las deja a 20° de su pariente, así que un
// tema con batería y steel drums cuesta un poco más de leer; es el precio de que
// la rueda se entienda.
const RUEDA = [
  'percusión', 'percusión afinada', 'bajos',    'órganos',  'metales',     'solistas',
  'cañas',     'colchones',         'violas',   'del mundo', 'flautas',    'efectos',
  'cuerdas',   'ruidos',            'conjuntos', 'osciladores', 'pianos',  'láminas',
];
const TONO = {};
RUEDA.forEach((f, i) => TONO[f] = i * (360 / RUEDA.length));

const MATIZ = {};
{
  const porFamilia = {};
  const anotar = (fam, nombre) => (porFamilia[fam] = porFamilia[fam] || []).push(nombre);
  // los de fuera del GM van primero: «piano» es el instrumento por defecto y le
  // toca el tono más plantado de su familia
  for (const [nombre, o] of Object.entries(SIN_GM)) anotar(o.fam, nombre);
  for (const [fam, tabla] of FAMILIAS) for (const nombre of Object.keys(tabla)) anotar(fam, nombre);
  porFamilia['percusión'] = Object.keys(SONIDOS);
  for (const [fam, nombres] of Object.entries(porFamilia))
    nombres.forEach((n, j) => MATIZ[norm(n)] = {
      // una familia nueva que no esté en la rueda entra con el tono del piano en
      // vez de quedarse sin color y romper el oklch
      tono: fam in TONO ? TONO[fam] : TONO['pianos'],
      // dónde cae dentro de su familia, de 0 a 1; la luz que le toca a ese
      // lugar la pone colorDe(), que es la que sabe sobre qué papel se dibuja
      paso: nombres.length > 1 ? j / (nombres.length - 1) : 0,
    });
}

// La rampa de cada familia se acortó por las dos puntas sin moverse de lugar: el
// medio quedó donde estaba, así que de día los colores siguen siendo claros y de
// noche siguen siendo apagados — que es como tiene que ser, un papel no se
// oscurece y una noche no se enciende. Lo que se fue son los extremos, que no
// eran color sino ausencia: con la banda entera, el último instrumento de cada
// familia (el clarinete, el timbal, los armónicos) se borraba contra la hoja
// clara, y el primero se borraba contra la oscura. Media familia sin dibujar.
// El sentido se conserva en los dos modos: el slap sigue más claro que el acústico.
const RAMPA = { claro: [0.54, 0.70], oscuro: [0.49, 0.65] };
const CROMA = { claro: 0.135, oscuro: 0.15 };
const deNoche = () => document.documentElement.dataset.luz === 'oscuro';

// El tono nunca cambia: una familia es la misma familia en los dos modos. De
// noche sube un poco de saturación — con la croma del día quedaban lavados.
function colorDe(voz) {
  const m = MATIZ[norm(voz || '')] || MATIZ[norm(INSTRUMENTO_POR_DEFECTO)];
  const modo = deNoche() ? 'oscuro' : 'claro';
  const [de, a] = RAMPA[modo];
  return 'oklch(' + (de + (a - de) * m.paso).toFixed(3) + ' ' + CROMA[modo] + ' ' + m.tono + ')';
}
