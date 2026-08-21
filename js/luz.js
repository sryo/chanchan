// ---------------------------------------------------------------- papel o tinta
// La elección se guarda; sin elección manda el sistema. Los colores de los
// instrumentos no se recalculan solos: hay que volver a pintarlos.
document.getElementById('luz').addEventListener('click', () => {
  const cual = deNoche() ? 'claro' : 'oscuro';
  document.documentElement.dataset.luz = cual;
  try { localStorage.setItem(CASA + ':luz', cual); } catch (e) { /* modo privado */ }
  dibujarCinta(renglonesActuales);
  pintarMarca(renglonesActuales);
  armarPuntos(marcasActuales, calladasActuales);
});
