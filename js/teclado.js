// ---------------------------------------------------------------- el teclado
// los atajos, en el orden en que cada archivo los anota: el primero que contesta
// gana. Ver REGLAS.md
const atajos = [];
const MAC = /Mac|iPhone|iPad/.test(navigator.platform);

// una orden dice si aplica: con «hacer» lo hace, sin «hacer» sólo contesta
const encadenar = (...ordenes) => hacer => ordenes.some(o => o(hacer));

// «Mod» es ⌘ en Mac y ctrl en el resto; los modificadores van siempre en el mismo orden
function nombreDeTecla(s) {
  const partes = s.split('-'), tecla = partes.pop();
  const mods = new Set(partes.map(m => m === 'Mod' ? (MAC ? 'Meta' : 'Ctrl') : m));
  return ['Alt', 'Ctrl', 'Meta', 'Shift'].filter(m => mods.has(m)).map(m => m + '-').join('') +
    (tecla.length === 1 ? tecla.toLowerCase() : tecla);
}
const teclaDe = e => (e.altKey ? 'Alt-' : '') + (e.ctrlKey ? 'Ctrl-' : '') + (e.metaKey ? 'Meta-' : '') +
  (e.shiftKey ? 'Shift-' : '') + (e.key.length === 1 ? e.key.toLowerCase() : e.key);
// como se le muestra a una persona
const SIGNOS = { Meta: '⌘', Ctrl: 'ctrl', Alt: '⌥', Shift: '⇧', Enter: '↩', Tab: '⇥', Backspace: '⌫',
                 ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };
const mostrarTecla = s => nombreDeTecla(s).split('-').map(x => SIGNOS[x] || x).join('');

// donde: 'hoja' sólo con el foco en el texto; 'todos' también escribiendo el nombre
const atajo = (tecla, nombre, orden, donde = 'hoja') =>
  atajos.push({ tecla: nombreDeTecla(tecla), nombre, orden, donde });
addEventListener('keydown', e => {
  if (e.isComposing) return;
  const t = teclaDe(e), enHoja = document.activeElement === src;
  for (const a of atajos) {
    if (a.tecla !== t || (a.donde === 'hoja' && !enHoja)) continue;
    if (a.orden(true)) { e.preventDefault(); return; }
  }
});
