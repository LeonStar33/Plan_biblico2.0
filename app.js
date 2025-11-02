// app.js - versión final usando API es-vbl con fallback local
const VERSION = "es-vbl";
const API_BASE = `https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/${VERSION}/books/`;

// Progreso guardado
let progreso = JSON.parse(localStorage.getItem("progreso") || "{}");

// Capítulos por libro (valores estándar)
const chapterCounts = {
  "genesis":50,"exodo":40,"levitico":27,"numeros":36,"deuteronomio":34,"josue":24,"jueces":21,"rut":4,
  "1samuel":31,"2samuel":24,"1reyes":22,"2reyes":25,"1cronicas":29,"2cronicas":36,"esdras":10,"nehemias":13,
  "ester":10,"job":42,"salmos":150,"proverbios":31,"eclesiastes":12,"cantares":8,"isaias":66,"jeremias":52,
  "lamentaciones":5,"ezequiel":48,"daniel":12,"oseas":14,"joel":3,"amos":9,"abdias":1,"jonas":4,"miqueas":7,
  "nahum":3,"habacuc":3,"sofonias":3,"hageo":2,"zacarias":14,"malaquias":4,
  "mateo":28,"marcos":16,"lucas":24,"juan":21,"hechos":28,"romanos":16,"1corintios":16,"2corintios":13,
  "galatas":6,"efesios":6,"filipenses":4,"colosenses":4,"1tesalonicenses":5,"2tesalonicenses":3,
  "1timoteo":6,"2timoteo":4,"tito":3,"filemon":1,"hebreos":13,"santiago":5,"1pedro":5,"2pedro":3,
  "1juan":5,"2juan":1,"3juan":1,"judas":1,"apocalipsis":22
};

// Elementos DOM
const planEl = document.getElementById("dias");
const planRoot = document.getElementById("plan");
const lector = document.getElementById("lector");
const tituloVerso = document.getElementById("titulo-verso");
const textoVerso = document.getElementById("texto-verso");

// Util: capitalizar
function cap(str){
  if(!str) return str;
  return str.charAt(0).toUpperCase()+str.slice(1);
}

// Generar plan según la lógica acordada
function generarPlanLectura(){
  const proLen = chapterCounts["proverbios"];
  const psaLen = chapterCounts["salmos"];
  const genLen = chapterCounts["genesis"];

  let dia = 1;
  let plan = [];

  // Counters
  let proCap = 1, psaCap = 1, genCap = 1;
  let ntIndex = 0, ntCap = 1;
  // NT order array from chapterCounts keys for NT
  const ntBooks = ["mateo","marcos","lucas","juan","hechos","romanos","1corintios","2corintios","galatas","efesios","filipenses","colosenses","1tesalonicenses","2tesalonicenses","1timoteo","2timoteo","tito","filemon","hebreos","santiago","1pedro","2pedro","1juan","2juan","3juan","judas","apocalipsis"];

  // Phase:
  // 1) Proverbios + Génesis until Proverbios done (proCap > proLen)
  // 2) Salmos + Génesis until Genesis done (genCap > genLen)
  // 3) Salmos + NT until Salmos done
  // 4) Cycle Proverbios <-> Salmos + NT until NT finished
  let phase = 1;

  const MAX_DAYS = 20000;
  while(dia < MAX_DAYS){
    let lecturas = [];

    if(phase === 1){
      if(proCap <= proLen && genCap <= genLen){
        lecturas.push({libro:"proverbios",cap:proCap});
        lecturas.push({libro:"genesis",cap:genCap});
        proCap++; genCap++;
      } else {
        phase = 2;
        continue;
      }
    } else if(phase === 2){
      if(genCap <= genLen){
        lecturas.push({libro:"salmos",cap:psaCap});
        lecturas.push({libro:"genesis",cap:genCap});
        psaCap++; genCap++;
      } else {
        phase = 3;
        ntIndex = 0; ntCap = 1;
        continue;
      }
    } else if(phase === 3){
      if(psaCap <= psaLen){
        lecturas.push({libro:"salmos",cap:psaCap});
        if(ntIndex < ntBooks.length){
          lecturas.push({libro:ntBooks[ntIndex],cap:ntCap});
          ntCap++;
          if(ntCap > (chapterCounts[ntBooks[ntIndex]] || 999)){
            ntIndex++; ntCap = 1;
          }
        }
        psaCap++;
      } else {
        phase = 4;
        proCap = 1;
        continue;
      }
    } else if(phase === 4){
      if(ntIndex >= ntBooks.length){
        plan.push({dia, lecturas: [{libro:"fin",cap:0}]});
        break;
      }
      if(proCap <= proLen){
        lecturas.push({libro:"proverbios",cap:proCap});
        proCap++;
      } else {
        if(psaCap < 1 || psaCap > psaLen) psaCap = 1;
        lecturas.push({libro:"salmos",cap:psaCap});
        psaCap++;
        if(psaCap > psaLen) proCap = 1;
      }
      if(ntIndex < ntBooks.length){
        lecturas.push({libro:ntBooks[ntIndex],cap:ntCap});
        ntCap++;
        if(ntCap > (chapterCounts[ntBooks[ntIndex]] || 999)){
          ntIndex++; ntCap = 1;
        }
      }
    }

    if(lecturas.length > 0){
      plan.push({dia, lecturas});
      dia++;
    } else break;

    if(dia > 4000) break;
  }

  return plan;
}

// Render plan to DOM
function renderPlan(){
  planEl.innerHTML = "";
  const plan = generarPlanLectura();
  for(const d of plan){
    const div = document.createElement("div");
    div.className = "dia";
    div.id = `dia-${d.dia}`;
    div.innerHTML = `<h3>Día ${d.dia}</h3>`;
    for(const l of d.lecturas){
      if(l.libro === "fin"){
        const p = document.createElement("p");
        p.className = "small";
        p.textContent = "🎉 Plan completado: Apocalipsis leído.";
        div.appendChild(p);
        continue;
      }
      const lbl = document.createElement("label");
      lbl.className = "reading";
      const key = `Dia${d.dia}_${l.libro}_${l.cap}`;
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = !!progreso[key];
      checkbox.addEventListener("change", ()=>{
        progreso[key] = checkbox.checked;
        localStorage.setItem("progreso", JSON.stringify(progreso));
      });
      const span = document.createElement("span");
      span.textContent = `${cap(l.libro)} ${l.cap}`;
      const btn = document.createElement("button");
      btn.className = "leer";
      btn.textContent = "📖 Leer";
      btn.dataset.libro = l.libro;
      btn.dataset.cap = l.cap;
      btn.addEventListener("click", ()=> abrirCapitulo(l.libro, l.cap, key));
      lbl.appendChild(checkbox);
      lbl.appendChild(span);
      lbl.appendChild(btn);
      div.appendChild(lbl);
    }
    planEl.appendChild(div);
  }
}

// Open chapter: try API, fallback to cached localStorage or local es_rvr.json
async function abrirCapitulo(libro, cap, key){
  // show lector, hide plan
  planRoot.classList.add("oculto");
  lector.classList.remove("oculto");
  tituloVerso.innerText = `${cap(libro)} ${cap}`;
  textoVerso.innerHTML = `<p>Cargando ${cap(libro)} ${cap}…</p>`;

  const url = `${API_BASE}${libro}/chapters/${cap}.json`;

  try {
    const res = await fetch(url);
    if(!res.ok) throw new Error("404 API");
    const data = await res.json();
    if(!data || !data.data) throw new Error("Formato API distinto");
    const verses = data.data;
    let html = "";
    verses.forEach(v => {
      html += `<p><b>${v.verse}</b>. ${v.text}</p>`;
    });
    textoVerso.innerHTML = html;
    try{ localStorage.setItem(`respaldo_${libro}_${cap}`, JSON.stringify(data)); }catch(e){}
    if(key){
      progreso[key] = true;
      localStorage.setItem("progreso", JSON.stringify(progreso));
    }
  } catch(err){
    console.error("API error:", err);
    const cache = localStorage.getItem(`respaldo_${libro}_${cap}`);
    if(cache){
      const data = JSON.parse(cache);
      let html = `<p class="small">⚠️ No se pudo conectar a la API. Mostrando respaldo local.</p>`;
      data.data.forEach(v => { html += `<p><b>${v.verse}</b>. ${v.text}</p>`; });
      textoVerso.innerHTML = html;
      if(key){ progreso[key]=true; localStorage.setItem("progreso", JSON.stringify(progreso)); }
      return;
    }
    // try es_rvr.json local file
    try {
      const localResp = await fetch("es_rvr.json");
      if(localResp.ok){
        const localData = await localResp.json();
        // find matching book by name (loosen match)
        const found = localData.find(b => {
          const n = (b.name||"").toLowerCase();
          return n.includes(libro) || libro.includes(n) || n.replace(/[^a-z0-9]/g,"").includes(libro.replace(/[^a-z0-9]/g,""));
        });
        if(found && found.chapters && found.chapters[cap-1]){
          const versesArr = found.chapters[cap-1];
          let html = `<p class="small">⚠️ No se pudo conectar a la API. Mostrando respaldo local (archivo).</p>`;
          versesArr.forEach((v,i)=>{ html += `<p><b>${i+1}</b>. ${v}</p>`; });
          textoVerso.innerHTML = html;
          if(key){ progreso[key]=true; localStorage.setItem("progreso", JSON.stringify(progreso)); }
          return;
        }
      }
    } catch(e){
      console.warn("No hay es_rvr.json o no se pudo leer.", e);
    }
    textoVerso.innerHTML = `<p>⚠️ No se encontró contenido para ${cap(libro)} ${cap}. Intenta más tarde.</p>`;
  }
}

// Close reader
function cerrarVerso(){
  lector.classList.add("oculto");
  planRoot.classList.remove("oculto");
  renderPlan();
  window.scrollTo({top:0, behavior:"smooth"});
}

// Export/import progreso
function exportarProgreso(){
  const blob = new Blob([JSON.stringify(progreso)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "progreso.json"; a.click();
  URL.revokeObjectURL(url);
}
function importarProgreso(ev){
  const f = ev.target.files[0]; if(!f) return;
  const reader = new FileReader();
  reader.onload = e=>{
    try{
      progreso = JSON.parse(e.target.result);
      localStorage.setItem("progreso", JSON.stringify(progreso));
      renderPlan();
      alert("✅ Progreso importado");
    }catch{
      alert("❌ Archivo inválido");
    }
  };
  reader.readAsText(f);
}

// Ir al último día marcado
function irUltimoDia(){
  const keys = Object.keys(progreso);
  if(keys.length===0){ alert("Aún no tienes lecturas registradas."); return; }
  let max = 0;
  for(const k of keys){
    const m = /Dia(\d+)_/.exec(k);
    if(m){ const n = parseInt(m[1],10); if(n>max) max=n; }
  }
  if(max===0) { alert("Aún no tienes lecturas registradas."); return; }
  const el = document.getElementById(`dia-${max}`);
  if(el){ el.scrollIntoView({behavior:"smooth", block:"start"}); el.classList.add("destacado"); setTimeout(()=>el.classList.remove("destacado"),1200); }
}

// Init
document.addEventListener("DOMContentLoaded", ()=>{
  renderPlan();
});