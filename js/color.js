// ------------------------------------------------------- el color de cada parte
// El orden de esta lista es el orden de la rueda y está puesto a mano: por qué,
// en REGLAS.md. Al tocarlo, las nueve familias que conviven van en los pares.
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
// Cuatro bandas: dos trabajos —teñir y leerse— por dos modos. Por qué se parte
// por trabajo y no por modo, en REGLAS.md. Los números, que es lo que vive acá:
//
// La croma del día no puede pasar de 0,135: con más se sale de gamut en un tercio
// de los tonos, el navegador los recorta, y el contraste salta de un tono a otro.
// De noche la trama baja hasta rozar el fondo a propósito — el primero de cada
// familia, y ahí caen «pum» y «piano», queda en menos de dos de contraste. La
// cinta de noche es una cinta apagada. Para levantarla sin aclararla hay que
// acortarla por abajo (0.43 en vez de 0.40), no correrla entera.
const BANDA = {
  trama: { claro: { de: 0.48, a: 0.58, croma: 0.135 }, oscuro: { de: 0.40, a: 0.50, croma: 0.15 } },
  tinta: { claro: { de: 0.44, a: 0.56, croma: 0.135 }, oscuro: { de: 0.62, a: 0.76, croma: 0.15 } },
};
const deNoche = () => document.documentElement.dataset.luz === 'oscuro';

// el tono es de la familia y no cambia nunca; la banda pone la luz y la croma
function enLaRueda(banda, voz) {
  const m = MATIZ[norm(voz || '')] || MATIZ[norm(INSTRUMENTO_POR_DEFECTO)];
  const b = BANDA[banda][deNoche() ? 'oscuro' : 'claro'];
  return 'oklch(' + (b.de + (b.a - b.de) * m.paso).toFixed(3) + ' ' + b.croma + ' ' + m.tono + ')';
}

// lo que se lee
const tintaDe = voz => enLaRueda('tinta', voz);
// lo que sólo tiñe
const tramaDe = voz => enLaRueda('trama', voz);
