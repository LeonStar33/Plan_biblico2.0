// app.js - versión corregida para mostrar los versículos correctamente
const VERSION = "es-vbl";
const API_BASE = `https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/${VERSION}/books/`;

let progreso = JSON.parse(localStorage.getItem("progreso") || "{}");

const chapterCounts = {
  "genesis": 50, "salmos": 150, "proverbios": 31,
  "mateo": 28, "marcos": 16, "lucas": 24, "juan": 21,
  "hechos": 28, "romanos": 16, "1corintios": 16, "2corintios": 13,
  "galatas": 6, "efesios": 6, "filipenses": 4, "colosenses": 4,
  "1tesalonicenses": 5, "2tesalonicenses": 3, "1timoteo": 6, "2timoteo": 4,
  "tito": 3, "filemon": 1, "hebreos": 13, "santiago": 5,
  "1pedro": 5, "2pedro": 3, "1juan": 5, "2juan": 1,
  "3juan": 1, "judas": 1, "apocalipsis": 22
};

const planEl = document.getElementById("dias");
const planRoot = document.getElementById("plan");
const lector = document.getElementById("lector");
const tituloVerso = document.getElementById("titulo-verso");
const textoVerso = document.getElementById("texto-verso");

// Función auxiliar para capitalizar
function capitalizar(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Generar plan básico (Proverbios + Génesis, luego Salmos + NT)
function generarPlanLectura() {
  const proLen = chapterCounts["proverbios"];
  const psaLen = chapterCounts["salmos"];
  const genLen = chapterCounts["genesis"];
  const ntBooks = [
    "mateo", "marcos", "lucas", "juan", "hechos", "romanos",
    "1corintios", "2corintios", "galatas", "efesios", "filipenses",
    "colosenses", "1tesalonicenses", "2tesalonicenses", "1timoteo",
    "2timoteo", "tito", "filemon", "hebreos", "santiago",
    "1pedro", "2pedro", "1juan", "2juan", "3juan", "judas", "apocalipsis"
  ];

  let plan = [];
  let dia = 1, pro = 1, psa = 1, gen = 1;
  let ntIndex = 0, ntCap = 1;
  let fase = 1;

  while (true) {
    let lecturas = [];

    if (fase === 1) {
      if (pro <= proLen && gen <= genLen) {
        lecturas.push({ libro: "proverbios", cap: pro });
        lecturas.push({ libro: "genesis", cap: gen });
        pro++; gen++;
      } else {
        fase = 2;
        continue;
      }
    } else if (fase === 2) {
      if (gen <= genLen) {
        lecturas.push({ libro: "salmos", cap: psa });
        lecturas.push({ libro: "genesis", cap: gen });
        psa++; gen++;
      } else {
        fase = 3;
        ntIndex = 0;
        ntCap = 1;
        continue;
      }
    } else {
      // NT
      if (ntIndex >= ntBooks.length) break;
      if (pro > proLen) { pro = 1; }
      lecturas.push({ libro: "proverbios", cap: pro });
      pro++;
      lecturas.push({ libro: ntBooks[ntIndex], cap: ntCap });
      ntCap++;
      if (ntCap > (chapterCounts[ntBooks[ntIndex]] || 1)) {
        ntIndex++; ntCap = 1;
      }
    }

    plan.push({ dia, lecturas });
    dia++;
    if (dia > 4000) break;
  }

  return plan;
}

// Render del plan
function renderPlan() {
  planEl.innerHTML = "";
  const plan = generarPlanLectura();

  plan.forEach((d) => {
    const div = document.createElement("div");
    div.className = "dia";
    div.id = `dia-${d.dia}`;
    div.innerHTML = `<h3>Día ${d.dia}</h3>`;

    d.lecturas.forEach((l) => {
      const key = `Dia${d.dia}_${l.libro}_${l.cap}`;
      const lbl = document.createElement("label");
      lbl.className = "reading";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = !!progreso[key];
      checkbox.addEventListener("change", () => {
        progreso[key] = checkbox.checked;
        localStorage.setItem("progreso", JSON.stringify(progreso));
      });
      const span = document.createElement("span");
      span.textContent = `${capitalizar(l.libro)} ${l.cap}`;
      const btn = document.createElement("button");
      btn.className = "leer";
      btn.textContent = "📖 Leer";
      btn.addEventListener("click", () => abrirCapitulo(l.libro, l.cap, key));
      lbl.append(checkbox, span, btn);
      div.appendChild(lbl);
    });

    planEl.appendChild(div);
  });
}

// Abrir un capítulo desde la API
async function abrirCapitulo(libro, capNum, key) {
  planRoot.classList.add("oculto");
  lector.classList.remove("oculto");
  tituloVerso.textContent = `${capitalizar(libro)} ${capNum}`;
  textoVerso.innerHTML = `<p>Cargando ${capitalizar(libro)} ${capNum}...</p>`;

  const url = `${API_BASE}${libro}/chapters/${capNum}.json`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Error en API");
    const data = await res.json();
    if (!data.data) throw new Error("Formato API inesperado");
    const versos = data.data;

    let html = "";
    for (const v of versos) {
      html += `<p><b>${v.verse}</b>. ${v.text}</p>`;
    }
    textoVerso.innerHTML = html;

    progreso[key] = true;
    localStorage.setItem("progreso", JSON.stringify(progreso));
  } catch (err) {
    console.error("❌ Error cargando capítulo:", err);
    textoVerso.innerHTML = `<p>⚠️ No se pudo conectar o cargar ${capitalizar(libro)} ${capNum}.</p>
      <p class="small">${err.message}</p>
      <p class="small">URL intentada: ${url}</p>`;
  }
}

// Cerrar lector
function cerrarVerso() {
  lector.classList.add("oculto");
  planRoot.classList.remove("oculto");
  renderPlan();
}

// Exportar/Importar progreso
function exportarProgreso() {
  const blob = new Blob([JSON.stringify(progreso)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "progreso.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importarProgreso(ev) {
  const f = ev.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      progreso = JSON.parse(e.target.result);
      localStorage.setItem("progreso", JSON.stringify(progreso));
      renderPlan();
      alert("✅ Progreso importado correctamente.");
    } catch {
      alert("❌ Archivo no válido.");
    }
  };
  reader.readAsText(f);
}

// Ir al último día leído
function irUltimoDia() {
  const keys = Object.keys(progreso);
  if (keys.length === 0) {
    alert("Aún no tienes lecturas registradas.");
    return;
  }
  let max = 0;
  for (const k of keys) {
    const m = /Dia(\d+)_/.exec(k);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  const el = document.getElementById(`dia-${max}`);
  if (el) {
    el.scrollIntoView({ behavior: "smooth" });
    el.classList.add("destacado");
    setTimeout(() => el.classList.remove("destacado"), 1500);
  }
}

document.addEventListener("DOMContentLoaded", renderPlan);
