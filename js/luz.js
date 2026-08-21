// ---------------------------------------------------------------- papel o tinta
// La elección se guarda; sin elección manda el sistema. Los colores de los
// instrumentos no se recalculan solos: hay que volver a pintarlos. Y el texto
// también, desde que el nombre de la parte se pinta con el color de su parte:
// eso sale de la rueda, que mira de qué lado está la luz, y no de la hoja.
document.getElementById('luz').addEventListener('click', () => {
  const cual = deNoche() ? 'claro' : 'oscuro';
  document.documentElement.dataset.luz = cual;
  try { localStorage.setItem(CASA + ':luz', cual); } catch (e) { /* modo privado */ }
  dibujarCinta(renglonesActuales);
  pintarMarca(renglonesActuales);
  repintarTexto();
});
