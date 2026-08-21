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
      // lugar lo pone enLaRueda(), que es la que sabe sobre qué papel se dibuja
      paso: nombres.length > 1 ? j / (nombres.length - 1) : 0,
    });
}

// ------------------------------------------------------ el mismo tono, dos luces
// El color de una parte hace dos trabajos que piden lo contrario, y con una sola
// rampa uno de los dos siempre salía mal. La cinta es una franja ancha en el
// borde: le alcanza con teñir, y tiene que quedar aireada de día y apagada de
// noche. El nombre de la parte es texto de dieciséis píxeles: tiene que leerse.
// Las dos cosas que el papel manda —la hoja clara no se ensombrece, la noche no
// se enciende— empujan la banda al medio, y en el medio el texto se pierde: el
// nombre de una parte llegaba a dos de contraste contra la hoja, que no es poco
// contraste, es no estar. Peor, la banda del día y la de la noche terminaban a
// cinco centésimas una de otra, o sea que eran la misma.
//
// Así que la banda se parte por trabajo y no por modo. La tinta es la que tiene
// que leerse, y por eso se da vuelta entera entre un modo y el otro: hunde sobre
// papel y sale sobre la noche, siempre del lado de acá de la tinta de la página,
// así que el nombre de una parte es texto de color y nunca un subrayado
// fluorescente. La trama sólo tiñe, y ahí la diferencia entre los dos modos no
// la puede hacer la luz sola: correrla lo suficiente como para que se note deja
// la franja más pálida de cada familia en menos de dos contra su fondo, que es
// casi no estar. La hace también la croma, y ésa sale gratis.
//
// De día la rueda va más clara y desaturada, que es tinta sobre papel: lavada,
// impresa. De noche va más profunda y saturada, que es luz sobre vidrio. Son dos
// medios distintos y no el mismo pigmento con otro fondo atrás, que es lo que
// eran antes —las dos bandas terminaban a dos centésimas una de otra—. Y de
// paso la croma del día entra entera en la pantalla: con 0,135 se salía de gamut
// en un tercio de los tonos y el navegador los recortaba, así que la rueda no
// rendía los colores que se le pedían y el contraste saltaba de un tono a otro.
// De noche la banda baja hasta rozar el fondo y eso es lo buscado, no un
// descuido: el primero de cada familia —y ahí caen «pum» y «piano», que son los
// dos que más aparecen— queda en menos de dos de contraste. La cinta de noche es
// una cinta apagada. Si algún día se quiere levantar sin aclararla, lo que hay
// que hacer es acortarla por abajo (0.43 en vez de 0.40), no correrla entera.
const BANDA = {
  trama: { claro: { de: 0.48, a: 0.58, croma: 0.135 }, oscuro: { de: 0.40, a: 0.50, croma: 0.15 } },
  tinta: { claro: { de: 0.38, a: 0.50, croma: 0.135 }, oscuro: { de: 0.62, a: 0.76, croma: 0.15 } },
};
const deNoche = () => document.documentElement.dataset.luz === 'oscuro';

// El tono nunca cambia: una familia es la misma familia en los dos modos y en
// los dos trabajos, y es lo único que dice quién toca. Lo demás —cuánta luz,
// cuánta saturación— es de qué lado del papel estamos y qué trabajo hace el
// color. El sentido se conserva en las cuatro bandas: el slap sigue siendo más
// claro que el acústico.
function enLaRueda(banda, voz) {
  const m = MATIZ[norm(voz || '')] || MATIZ[norm(INSTRUMENTO_POR_DEFECTO)];
  const b = BANDA[banda][deNoche() ? 'oscuro' : 'claro'];
  return 'oklch(' + (b.de + (b.a - b.de) * m.paso).toFixed(3) + ' ' + b.croma + ' ' + m.tono + ')';
}

// lo que se lee: el nombre de la parte, el puntito del margen, el logo y el
// botón de tocar, y el ▾ con su menú
const tintaDe = voz => enLaRueda('tinta', voz);
// lo que sólo tiñe: la cinta, y el realce de lo que está sonando
const tramaDe = voz => enLaRueda('trama', voz);
