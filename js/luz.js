// ---------------------------------------------------------------- papel o tinta
// Safari tiñe sus barras con el theme-color: va con el fondo del tema
const barraDelNavegador = document.querySelector('meta[name="theme-color"]');
const pintarBarra = () => {
  barraDelNavegador.content = getComputedStyle(document.documentElement).getPropertyValue('--fondo').trim();
};
pintarBarra();

// los colores salen de la rueda y no de la hoja: hay que volver a dibujar
document.getElementById('luz').addEventListener('click', () => {
  const cual = deNoche() ? 'claro' : 'oscuro';
  document.documentElement.dataset.luz = cual;
  try { localStorage.setItem(CASA + ':luz', cual); } catch (e) { /* modo privado */ }
  pintarBarra();
  dibujarCinta(actual.renglones);
  pintarMarca(actual.renglones);
  repintarTexto();
});
