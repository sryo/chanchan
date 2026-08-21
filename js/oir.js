// ---------------------------------------------------------------- oír de a uno
// superdough es el mismo motor que usa el reloj, pero llamado a mano no le pisa
// el patrón a nadie: se puede probar un sonido sin cortar el tema que está yendo.
let esperaOir;

// una sola fuente de verdad para «a qué suena esto»: la comparten la barra y el menú
function recetaDe(que, clave) {
  if (que === 'golpe' && SONIDOS[clave])
    return { voces: [{ s: SONIDOS[clave][0], bank: MAQUINA, release: .25 }], dura: .4 };
  if (que === 'nota' && NOTAS[clave])
    return { voces: [{ s: 'piano', note: NOTAS[clave] + OCTAVA_BASE }], dura: .4 };
  if (que === 'acorde' && ACORDE[norm(clave)])
    return { voces: ACORDE[norm(clave)].map(i => ({ s: 'piano', note: nombreNota(i, OCTAVA_BASE) })), dura: .5 };
  if (que === 'octava' && OCTAVAS[clave])
    return { voces: [{ s: 'piano', note: 'c' + OCTAVAS[clave] }], dura: .4 };
  if (que === 'alteracion')
    // se oye contra el do, si no no se entiende medio tono de qué
    return { voces: [{ s:'piano', note:'c4' }, { s:'piano', note: clave === 'bemol' ? 'b3' : 'c#4', en:.35 }], dura: .3 };
  if (que === 'maquina')
    return { voces: [{ s: 'bd', bank: clave, release: .25 },
                     { s: 'sd', bank: clave, release: .25, en: .22 }], dura: .35 };
  if (que === 'instrumento') {
    const ins = instrumentoDe(clave);
    return ins && { voces: [{ s: ins.sonido, note: ins.fam === 'bajos' ? 'c2' : 'c4' }], dura: .45 };
  }
  return null;
}

const precalentados = new Set();
let vueltaOir = 0;

// La muestra se baja recién cuando se usa, y superdough agenda la nota a 30 ms:
// la primera vez el mp3 llega a los ~280 ms, con el momento ya pasado, y no suena
// nada. Así que la primera vez se dispara muda y se espera su promesa, que resuelve
// cuando el buffer está listo; recién ahí suena de verdad.
async function oir(receta) {
  if (!motorListo || !receta) return;
  const mia = ++vueltaOir;
  try {
    await despertar();
    let ctx = getAudioContext();
    const frios = receta.voces.filter(v => !precalentados.has(v.s));
    if (frios.length) {
      frios.forEach(v => precalentados.add(v.s));
      await Promise.all(frios.map(v =>
        strudel.superdough({ ...v, gain: 0 }, ctx.currentTime + .001, .01)));
      // si mientras bajaba el mouse se fue a otra cosa, ésta ya no va
      if (mia !== vueltaOir) return;
      ctx = getAudioContext();
    }
    const ahora = ctx.currentTime;   // después del await ya avanzó
    for (const voz of receta.voces)
      // el release corto es lo que corta la cola: sin él la muestra sigue sonando
      // como un segundo y medio después de lo que dura la nota, y si vas
      // recorriendo la lista se te encima con la siguiente
      strudel.superdough({ gain: .8, release: .12, ...voz }, ahora + .03 + (voz.en || 0), receta.dura);
  } catch (e) { /* si falla la muestra, mejor mudo que roto */ }
}
