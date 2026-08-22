// ------------------------------------------------------- el color de cada parte
// a mano: las nueve familias que conviven van en los pares; ver REGLAS.md, la rueda
const RUEDA = [
  'percusión', 'percusión afinada', 'bajos',    'órganos',  'metales',     'solistas',
  'cañas',     'colchones',         'violas',   'del mundo', 'flautas',    'efectos',
  'cuerdas',   'ruidos',            'conjuntos', 'osciladores', 'pianos',  'láminas',
];
const TONO = {};
RUEDA.forEach((f, i) => TONO[f] = i * (360 / RUEDA.length));

const MATIZ = Object.create(null);
{
  const porFamilia = {};
  const anotar = (fam, nombre) => (porFamilia[fam] = porFamilia[fam] || []).push(nombre);
  // los de fuera del GM van primero, así «piano» abre su familia
  for (const [nombre, o] of Object.entries(SIN_GM)) anotar(o.fam, nombre);
  for (const [fam, tabla] of FAMILIAS) for (const nombre of Object.keys(tabla)) anotar(fam, nombre);
  porFamilia['percusión'] = Object.keys(SONIDOS);
  for (const [fam, nombres] of Object.entries(porFamilia))
    nombres.forEach((n, j) => MATIZ[norm(n)] = {
      // sin tono el oklch no parsea
      tono: fam in TONO ? TONO[fam] : TONO['pianos'],
      // de 0 a 1 dentro de su familia; la luz la pone enLaRueda()
      paso: nombres.length > 1 ? j / (nombres.length - 1) : 0,
    });
}

// ------------------------------------------------------ el mismo tono, dos luces
// la trama tiñe y la tinta se lee: ver REGLAS.md, cuatro bandas; de día el piso es la
// tinta de la página (0,309), y la croma se pide aunque el navegador recorte las puntas
const BANDA = {
  trama: { claro: { de: 0.42, a: 0.60, croma: 0.135 }, oscuro: { de: 0.40, a: 0.56, croma: 0.15 } },
  tinta: { claro: { de: 0.40, a: 0.56, croma: 0.135 }, oscuro: { de: 0.62, a: 0.80, croma: 0.15 } },
};
const deNoche = () => document.documentElement.dataset.luz === 'oscuro';

// ----------------------------------------------------- la luz es de este tema
// el lugar en la banda sale de los que suenan en el tema, no del catálogo: ver REGLAS.md, la rueda
let pasoDelTema = Object.create(null);

// el tono hace de nombre de familia
function repartirLaLuz(marcas) {
  const porFamilia = new Map();
  for (const t of marcas.flat()) {
    const m = t && t.voz && MATIZ[norm(t.voz)];
    if (!m) continue;
    if (!porFamilia.has(m.tono)) porFamilia.set(m.tono, new Set());
    porFamilia.get(m.tono).add(norm(t.voz));
  }
  pasoDelTema = Object.create(null);
  for (const suyos of porFamilia.values()) {
    // ordena el catálogo, así agregar una viola no cambia el color de la otra
    const nombres = [...suyos].sort((a, b) => MATIZ[a].paso - MATIZ[b].paso);
    nombres.forEach((n, i) =>
      // uno solo va al medio, que es lo más legible
      pasoDelTema[n] = nombres.length > 1 ? i / (nombres.length - 1) : 0.5);
  }
}

function enLaRueda(banda, voz) {
  const n = norm(voz || '');
  const m = MATIZ[n] || MATIZ[norm(INSTRUMENTO_POR_DEFECTO)];
  const b = BANDA[banda][deNoche() ? 'oscuro' : 'claro'];
  // sin repartir —el menú, el sugeridor— vale el del catálogo
  const paso = n in pasoDelTema ? pasoDelTema[n] : m.paso;
  return 'oklch(' + (b.de + (b.a - b.de) * paso).toFixed(3) + ' ' + b.croma + ' ' + m.tono + ')';
}

const tintaDe = voz => enLaRueda('tinta', voz);
const tramaDe = voz => enLaRueda('trama', voz);
