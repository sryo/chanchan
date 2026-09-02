// ------------------------------------------------------------- las reglas
// lo que se transforma al vuelo mientras se tipea, y el Backspace que lo devuelve.
// Ver REGLAS.md
// la última: dónde quedó lo puesto, y lo que había tipeado quien escribe
let ultimaRegla = null;
const recordarRegla = (desde, largo, tipeado) => { ultimaRegla = { desde, hasta: desde + largo, tipeado }; };
// cualquier otro cambio la olvida; la regla se recuerda después de aplicarse
alCambiar.push(() => { ultimaRegla = null; });
// moverse también, salvo que el cursor esté donde la regla lo dejó
document.addEventListener('selectionchange', () => {
  if (ultimaRegla && (src.selectionStart !== ultimaRegla.hasta || src.selectionEnd !== ultimaRegla.hasta)) ultimaRegla = null;
});

const volverALoTipeado = hacer => {
  const r = ultimaRegla;
  if (!r || src.selectionStart !== r.hasta || src.selectionEnd !== r.hasta) return false;
  if (hacer) aplicar(paso(r.desde, src.value.slice(r.desde, r.hasta), r.tipeado), { cursor: r.desde + r.tipeado.length });
  return true;
};
atajo('Backspace', 'volver a lo tipeado', volverALoTipeado);

// cada regla mira el renglón hasta el cursor; el «$» es el cursor
const REGLAS_DE_ENTRADA = [
  // «do#» es como se escribe apurado; el idioma dice «do sostenido»
  [/\b(do|re|mi|fa|sol|la|si)#$/i, m => m[1] + ' sostenido'],
];

// sólo al tipear texto, y no en medio de una composición: la tilde muerta no es texto
src.addEventListener('input', e => {
  if (e.isComposing || (e.inputType && !e.inputType.startsWith('insert'))) return;
  if (src.selectionStart !== src.selectionEnd) return;
  const pos = src.selectionStart, base = inicioDeRenglon(src.value, pos);
  const linea = src.value.slice(base, src.value.indexOf('\n', pos));
  if (leerRenglon(linea).clase !== 'parte') return;
  const antes = src.value.slice(base, pos);
  for (const [re, hacer] of REGLAS_DE_ENTRADA) {
    const m = re.exec(antes);
    if (!m) continue;
    const desde = pos - m[0].length, puesto = hacer(m);
    aplicar(paso(desde, m[0], puesto), { cursor: desde + puesto.length });
    recordarRegla(desde, puesto.length, m[0]);
    return;
  }
});
