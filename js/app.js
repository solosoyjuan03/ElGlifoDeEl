/* ============================================================
   app.js — Lógica del lector de libros
   Navegación, índice, barra de progreso, teclado y gestos táctiles
   ============================================================ */

const estado = {
  actual: 0,
  total: PAGINAS.length
};

/* ---------- Referencias del DOM ---------- */
const seccionPortada = document.getElementById("portada");
const seccionLector = document.getElementById("lector");
const btnAbrir = document.getElementById("btnAbrir");
const btnIndice = document.getElementById("btnIndice");
const panelIndice = document.getElementById("panelIndice");
const listaCapitulos = document.getElementById("listaCapitulos");
const pagina = document.getElementById("pagina");
const numeroCap = document.getElementById("numeroCap");
const tituloCap = document.getElementById("tituloCap");
const contenido = document.getElementById("contenido");
const efectoPagina = document.getElementById("efectoPagina");
const btnAnterior = document.getElementById("btnAnterior");
const btnSiguiente = document.getElementById("btnSiguiente");
const puntos = document.getElementById("puntos");
const progresoRelleno = document.getElementById("progresoRelleno");
const progresoTexto = document.getElementById("progresoTexto");

/* ---------- Renderizar el índice y los puntos ---------- */
function construirNavegacion() {
  listaCapitulos.innerHTML = "";
  puntos.innerHTML = "";

  PAGINAS.forEach((p, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="cap-num">${p.numero || i + 1}</span><span>${p.titulo || "Página " + (i + 1)}</span>`;
    li.addEventListener("click", () => { cerrarIndice(); irA(i); });
    listaCapitulos.appendChild(li);

    const punto = document.createElement("button");
    punto.className = "punto";
    punto.title = p.titulo || "Página " + (i + 1);
    punto.addEventListener("click", () => irA(i));
    puntos.appendChild(punto);
  });
}

/* ---------- Mostrar una página ---------- */
function mostrar(i) {
  const p = PAGINAS[i];
  numeroCap.textContent = p.numero || "";
  tituloCap.textContent = p.titulo || "";

  contenido.innerHTML = "";
  (p.texto || [String(p.texto || "")]).forEach(parrafo => {
    const el = document.createElement("p");
    el.textContent = parrafo;
    contenido.appendChild(el);
  });

  // Estado de botones
  btnAnterior.disabled = i === 0;
  btnSiguiente.disabled = i === estado.total - 1;

  // Índice activo y puntos
  listaCapitulos.querySelectorAll("li").forEach((li, j) => li.classList.toggle("activo", j === i));
  puntos.querySelectorAll(".punto").forEach((pt, j) => pt.classList.toggle("activo", j === i));

  // Progreso
  progresoRelleno.style.width = ((i + 1) / estado.total * 100) + "%";
  progresoTexto.textContent = `Página ${i + 1} de ${estado.total}`;

  // Scroll arriba
  pagina.querySelector(".pagina-inner").scrollTop = 0;

  estado.actual = i;
}

/* ---------- Navegar con animación de voltar página ---------- */
let animando = false;
function irA(i) {
  if (animando || i === estado.actual || i < 0 || i >= estado.total) return;
  animando = true;

  if (i > estado.actual) {
    efectoPagina.classList.remove("animar");
    void efectoPagina.offsetWidth; // reiniciar animación
    efectoPagina.classList.add("animar");
    pagina.classList.add("voltiando");
    setTimeout(() => {
      mostrar(i);
      pagina.classList.remove("voltiando");
      animando = false;
    }, 420);
  } else {
    mostrar(i);
    animando = false;
  }
}

const siguiente = () => irA(estado.actual + 1);
const anterior = () => irA(estado.actual - 1);

/* ---------- Índice ---------- */
function abrirIndice() { panelIndice.classList.add("abierto"); }
function cerrarIndice() { panelIndice.classList.remove("abierto"); }
function toggleIndice() { panelIndice.classList.toggle("abierto"); }

/* ---------- Eventos ---------- */
btnAbrir.addEventListener("click", () => {
  seccionPortada.classList.remove("activa");
  seccionLector.classList.add("activa");
});

btnIndice.addEventListener("click", toggleIndice);

// Cerrar índice al hacer clic fuera
document.addEventListener("click", (e) => {
  if (panelIndice.classList.contains("abierto") &&
    !panelIndice.contains(e.target) &&
    e.target !== btnIndice && !btnIndice.contains(e.target)) {
    cerrarIndice();
  }
});

btnSiguiente.addEventListener("click", siguiente);
btnAnterior.addEventListener("click", anterior);

// Teclado
document.addEventListener("keydown", (e) => {
  if (!seccionLector.classList.contains("activa")) return;
  if (e.key === "ArrowRight" || e.key === " ") siguiente();
  if (e.key === "ArrowLeft") anterior();
  if (e.key === "Escape") cerrarIndice();
  if (e.key.toLowerCase() === "i") toggleIndice();
});

// Gestos táctiles (deslizar)
let toqueX = null;
document.addEventListener("touchstart", (e) => { toqueX = e.changedTouches[0].clientX; }, { passive: true });
document.addEventListener("touchend", (e) => {
  if (toqueX === null) return;
  const dif = e.changedTouches[0].clientX - toqueX;
  if (Math.abs(dif) > 60) { dif < 0 ? siguiente() : anterior(); }
  toqueX = null;
}, { passive: true });

/* ---------- Inicio ---------- */
construirNavegacion();
mostrar(0);
