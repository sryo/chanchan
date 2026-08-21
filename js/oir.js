// ---------------------------------------------------------------- oír de a uno
// superdough es el mismo motor que usa el reloj, pero llamado a mano no le pisa
// el patrón a nadie: se puede probar un sonido sin cortar el tema que está yendo.
let esperaOir;

// Una sola fuente de verdad para «a qué suena esto», compartida por el menú y el
// sugeridor. Probar una nota suena con el instrumento de la línea donde está el
// cursor y no con el piano; los graves abajo, si no no se les oye el cuerpo.
function vozPara(voz) {
  const ins = instrumentoDe(voz || '') || INSTRUMENTOS[INSTRUMENTO_POR_DEFECTO];
  return { s: ins.sonido, oct: ins.fam === 'bajos' ? OCTAVA_BASE - 2 : OCTAVA_BASE };
}

const vozDeLinea = l => (renglonesActuales.find(r => r.nro - 1 === l) || {}).voz;

function recetaDe(que, clave, voz) {
  const { s, oct } = vozPara(voz);
  if (que === 'golpe' && SONIDOS[clave])
    return { voces: [{ s: SONIDOS[clave][0], bank: MAQUINA, release: .25 }], dura: .4 };
  if (que === 'nota' && NOTAS[clave])
    return { voces: [{ s, note: NOTAS[clave] + oct }], dura: .4 };
  if (que === 'acorde' && ACORDE[norm(clave)])
    return { voces: ACORDE[norm(clave)].map(i => ({ s, note: nombreNota(i, oct) })), dura: .5 };
  if (que === 'octava' && OCTAVAS[clave])
    return { voces: [{ s, note: 'c' + OCTAVAS[clave] }], dura: .4 };
  if (que === 'alteracion')
    // se oye contra el do, si no no se entiende medio tono de qué
    return { voces: [{ s, note: 'c' + oct }, { s, note: nombreNota(clave === 'bemol' ? -1 : 1, oct), en: .35 }], dura: .3 };
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
let vueltaOir = 0, relojDormir;

// Parar no detiene el reloj de strudel: lo que de verdad calla el tema es
// suspender el audio (ver silenciar()). Y la vista previa necesita el audio
// despierto para sonar, así que al despertarlo revivía el tema entero. Se lo
// devuelve a dormir en cuanto la muestra terminó, salvo que mientras tanto
// hayas apretado tocar.
function volverADormir(dura) {
  clearTimeout(relojDormir);
  relojDormir = setTimeout(() => {
    const ctx = getAudioContext();
    if (!sonando && ctx && ctx.state === 'running') ctx.suspend();
  }, (dura + .6) * 1000);
}

// La muestra se baja recién cuando se usa, y superdough agenda la nota a 30 ms:
// la primera vez el mp3 llega a los ~280 ms, con el momento ya pasado, y no suena
// nada. Así que la primera vez se dispara muda y se espera su promesa, que resuelve
// cuando el buffer está listo; recién ahí suena de verdad.
async function oir(receta) {
  if (!motorListo || !receta) return;
  const mia = ++vueltaOir;
  clearTimeout(relojDormir);
  const dormido = !sonando && (getAudioContext() || {}).state === 'suspended';
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
    if (dormido) volverADormir(receta.dura + Math.max(0, ...receta.voces.map(v => v.en || 0)));
  } catch (e) { /* si falla la muestra, mejor mudo que roto */ }
}
