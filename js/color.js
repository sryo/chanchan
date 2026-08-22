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

const MATIZ = Object.create(null);
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
// La croma es un pedido y no una promesa: 0,135 sólo entra en sRGB cerca del medio
// de la banda, y en las puntas el navegador la recorta —a L 0,38 la mitad de los
// tonos bajan, y el cian llega a 0,07—. Se pide igual porque recortar degrada
// parejo y bajarla a lo que entra en todas partes dejaría la rueda entera lavada.
//
// El largo de la banda es de dónde sale la distancia entre dos partes de la misma
// familia, así que cada una se estira — pero sólo hasta donde no cambia lo que el
// modo es. De noche el techo va a 0,56 y no más arriba: a 0,68 la franja más clara
// llegaba a casi seis de contraste y la cinta dejaba de ser fondo. De día el piso
// baja a 0,42 y no a 0,38, donde la franja más oscura pesaba como un subrayado.
//
// Estirarlas de más tampoco compraba: el piso de los seis temas de la casa queda
// en ΔE 0,074 contra los 0,075 de la versión que se iba de rango. El trabajo lo
// hace repartir la luz, no ensanchar la banda.
//
// El piso de día no puede bajar de la tinta de la página (0,309): abajo de ahí el
// nombre de una parte pesaría más que el texto del tema.
const BANDA = {
  trama: { claro: { de: 0.42, a: 0.60, croma: 0.135 }, oscuro: { de: 0.40, a: 0.56, croma: 0.15 } },
  tinta: { claro: { de: 0.40, a: 0.56, croma: 0.135 }, oscuro: { de: 0.62, a: 0.80, croma: 0.15 } },
};
const deNoche = () => document.documentElement.dataset.luz === 'oscuro';

// ----------------------------------------------------- la luz es de este tema
// El lugar de un instrumento adentro de su banda no sale del catálogo sino de los
// que suenan acá. Dos violas del catálogo son dos casilleros pegados de los ocho
// que tiene la familia y salían a ΔE 0,040, que es casi el mismo verde; repartidas
// entre las dos que hay en el tema se van a las dos puntas de la banda.
//
// Era el problema más grande de la rueda y no el que parecía: de los seis temas de
// la casa, en cuatro el par más parecido era de una misma familia —el peor, un
// pizzicato y un timbal a ΔE 0,027, abajo del umbral de «el mismo color a simple
// vista»— y en uno solo era de familias vecinas.
let pasoDelTema = Object.create(null);

// El tono hace de nombre de familia: es lo único que MATIZ le da igual a todos sus
// instrumentos, y no hace falta cargar el nombre hasta acá para agruparlos.
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
    // el orden del catálogo decide quién queda más claro, así que agregar una
    // viola no le da vuelta el color a la que ya estaba
    const nombres = [...suyos].sort((a, b) => MATIZ[a].paso - MATIZ[b].paso);
    nombres.forEach((n, i) =>
      // uno solo va al medio de la banda y no a la punta oscura: un tema de una
      // parte no tiene con qué contrastar y le conviene el lugar más legible
      pasoDelTema[n] = nombres.length > 1 ? i / (nombres.length - 1) : 0.5);
  }
}

// el tono es de la familia y no cambia nunca; la banda pone la luz y la croma
function enLaRueda(banda, voz) {
  const n = norm(voz || '');
  const m = MATIZ[n] || MATIZ[norm(INSTRUMENTO_POR_DEFECTO)];
  const b = BANDA[banda][deNoche() ? 'oscuro' : 'claro'];
  // el del catálogo es el de antes de que se reparta: lo usan el menú y el
  // sugeridor, que muestran instrumentos que todavía no están en ningún tema
  const paso = n in pasoDelTema ? pasoDelTema[n] : m.paso;
  return 'oklch(' + (b.de + (b.a - b.de) * paso).toFixed(3) + ' ' + b.croma + ' ' + m.tono + ')';
}

// lo que se lee
const tintaDe = voz => enLaRueda('tinta', voz);
// lo que sólo tiñe
const tramaDe = voz => enLaRueda('trama', voz);
