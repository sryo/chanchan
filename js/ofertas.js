// ------------------------------------------------------------- lo que se ofrece
// las listas del ▾, la selección y el sugeridor; la receta es lo que oir() necesita
const ofrecerGolpes = () => Object.entries(SONIDOS)
  .map(([txt, [, desc]]) => ({ txt, desc, receta: recetaDe('golpe', txt) }));

// sonar, callar o estirar es una sola dimensión, así que van juntos
const ofrecerSilencios = () => [
  { txt: '-', desc: 'este paso queda en silencio' },
  { txt: '_', desc: 'sigue sonando la anterior' },
];

const ofrecerNotas = voz => Object.keys(NOTAS)
  .map(txt => ({ txt, receta: recetaDe('nota', txt, voz) }));
const ofrecerAlteraciones = voz => Object.keys(ALTERACIONES)
  .map(txt => ({ txt, desc: 'medio tono', receta: recetaDe('alteracion', txt, voz) }));
const ofrecerOctavas = voz => Object.keys(OCTAVAS)
  .map(txt => ({ txt, desc: 'otra altura', receta: recetaDe('octava', txt, voz) }));
const ofrecerAcordes = voz => Object.keys(ACORDES)
  .map(txt => ({ txt, desc: 'notas juntas', receta: recetaDe('acorde', txt, voz) }));

const ofrecerModificadores = () => MODIFICADORES.map(m => ({ txt: m[0], desc: m[2] }));
const ofrecerEnvolvibles = () => MODIFICADORES.filter(envolvible).map(m => ({ txt: m[0], desc: m[2] }));
const ofrecerFiguras = () => Object.entries(FIGURAS)
  .map(([f, n]) => ({ txt: 'en ' + f, desc: n + ' por vuelta' }));
const ofrecerEuclides = () => EUCLIDES.map(([n, m]) =>
  ({ txt: fraseEuclides(n, m), desc: n + ' golpes en ' + m + ' pasos', n, m }));
const ofrecerArreglos = () => ARREGLOS.map(([n, q]) =>
  ({ txt: fraseArreglo(n, q), desc: (n + q) + ' vueltas', n, q }));
const ofrecerCompases = () => [['en dos', 2], ['en tres', 3], ['en cuatro', 4], ['en seis', 6]]
  .map(([txt, tiempos]) => ({ txt, desc: tiempos + ' tiempos por vuelta', tiempos }));

// cuán seguido pasa cada envoltura; las de «cada n vueltas» no están en la tabla
const ofrecerEnvolturas = () => ENVOLTURAS.map(txt => {
  const v = VECES.find(x => norm(x[0]) === norm(txt));
  const k = (norm(txt).match(/^cada (\S+) vueltas?$/) || [])[1];
  return { txt, desc: v ? v[2] : 'una de cada ' + (k || '') + ', y las otras como está' };
});

// los alias comparten objeto con su instrumento: por .nombre «guitarra» dice «viola»
const ofrecerInstrumentos = () => [...new Set(Object.values(INSTRUMENTOS))]
  .map(i => ({ txt: i.nombre, desc: i.fam, receta: recetaDe('instrumento', i.nombre) }));
const ofrecerAlias = () => Object.keys(ALIAS)
  .map(a => ({ txt: a, desc: ALIAS[a], receta: recetaDe('instrumento', a) }));
const ofrecerFamilias = () => [...new Set([...FAMILIAS.map(f => f[0]), ...Object.values(SIN_GM).map(i => i.fam)])]
  .map(txt => ({ txt, color: tintaDeFamilia(txt) }));
// los campos de una nota después de la raíz: título, clave, cómo se dice «sin», y lo que se ofrece
const CAMPOS_NOTA = voz => [
  ['medio tono', 'altN', 'sin alterar', ofrecerAlteraciones(voz)],
  ['altura', 'octN', 'normal', ofrecerOctavas(voz)],
  ['acorde', 'acorde', 'una nota sola', ofrecerAcordes(voz)],
];
const ofrecerMaquinas = () => [...new Map(Object.values(maquinas()).map(m => [m.banco, m])).values()]
  .map(m => ({ txt: m.nombre, desc: m.marca, marca: m.marca, banco: m.banco, receta: recetaDe('maquina', m.banco) }));
