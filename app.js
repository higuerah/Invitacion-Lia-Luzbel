(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const token = params.get("i");
  const demo = params.get("demo") === "1";
  const demoKey = `lia-demo-${params.get("nombre") || "Dulce"}-${params.get("adultos") || 2}-${params.get("ninos") || 3}`;
  const config = window.RSVP_CONFIG || {};
  const isConfigured = /^https:\/\/.+\.supabase\.co\/?$/.test(config.supabaseUrl) && !!config.anonKey;
  let guest;

  function showStage(name) {
    $("envelope-stage").hidden = name !== "envelope";
    $("poster-stage").hidden = name !== "poster";
    $("rsvp-stage").hidden = name !== "rsvp";
    $("page-topbar").hidden = name === "envelope";
    window.scrollTo({top:0,behavior:"instant"});
    if (name === "rsvp") $("rsvp-title").focus({preventScroll:true});
  }
  $("open-rsvp").addEventListener("click", () => showStage("rsvp"));
  $("back-to-poster").addEventListener("click", () => showStage("poster"));

  const song = $("song"), musicButton = $("music-button");
  $("open-envelope").addEventListener("click", () => {
    $("open-envelope").disabled = true;
    $("envelope-stage").classList.add("opening");
    // The play call must happen inside this tap for iPhone audio permissions.
    song.play().then(() => {
      musicButton.textContent = "Ⅱ Pausar canción";
      musicButton.setAttribute("aria-label","Pausar canción");
    }).catch(() => {
      musicButton.textContent = "▶ Escuchar canción";
      musicButton.setAttribute("aria-label","Reproducir canción");
    });
    setTimeout(() => showStage("poster"), 560);
  });
  const cueSchedule = config.songCues || [
    {time:12.5,type:"flowers"}, {time:19.4,type:"splash"},
    {time:24.2,type:"flowers"}, {time:41,type:"splash"}
  ];
  let lastSongTime = 0;
  const firedCues = new Set();
  function burst(type) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layer = $("particle-layer"), count = type === "flowers" ? 16 : 22;
    for (let n=0;n<count;n++) {
      const particle=document.createElement("span");
      particle.className=`particle ${type}`;
      particle.textContent=type === "flowers" ? "🌺" : "💦";
      particle.style.setProperty("--x",`${8+Math.random()*84}vw`);
      particle.style.setProperty("--dx",`${-55+Math.random()*110}px`);
      particle.style.setProperty("--delay",`${Math.random()*.7}s`);
      particle.style.setProperty("--size",`${20+Math.random()*22}px`);
      layer.append(particle);
      particle.addEventListener("animationend",()=>particle.remove(),{once:true});
    }
  }
  song.addEventListener("timeupdate",()=>{
    const t=song.currentTime;
    if(t < lastSongTime-1) firedCues.clear();
    cueSchedule.forEach((cue,i)=>{if(!firedCues.has(i)&&t>=cue.time&&lastSongTime<cue.time+1.5){burst(cue.type);firedCues.add(i);}});
    lastSongTime=t;
  });
  song.addEventListener("ended",()=>{firedCues.clear();lastSongTime=0;musicButton.textContent="↻ Escuchar de nuevo";musicButton.setAttribute("aria-label","Volver a reproducir canción");});
  musicButton.addEventListener("click",async()=>{
    if(!song.paused){song.pause();musicButton.textContent="▶ Seguir canción";musicButton.setAttribute("aria-label","Reanudar canción");return;}
    try{await song.play();musicButton.textContent="Ⅱ Pausar canción";musicButton.setAttribute("aria-label","Pausar canción");}
    catch{musicButton.textContent="▶ Toca para escuchar";}
  });

  function status(message, error = false) {
    $("status").textContent = message;
    $("status").classList.toggle("error", error);
  }
  async function rpc(name, args) {
    const response = await fetch(`${config.supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {"content-type":"application/json", apikey:config.anonKey},
      body: JSON.stringify(args)
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message || "No se pudo conectar. Intenta de nuevo.");
    return data;
  }
  function populate() {
    for (const id of ["adults", "children"]) {
      const select = $(id);
      select.replaceChildren();
      const max = id === "adults" ? guest.max_adults : guest.max_children;
      for (let n = 0; n <= max; n++) select.add(new Option(String(n), String(n)));
    }
    const defaultAdults = Math.min(1, guest.max_adults);
    const defaultChildren = defaultAdults ? 0 : 1;
    $("adults").value = String(Math.min(guest.rsvp?.adults ?? defaultAdults, guest.max_adults));
    $("children").value = String(Math.min(guest.rsvp?.children ?? defaultChildren, guest.max_children));
    if (guest.rsvp?.status === "declined") document.querySelector('[name="attendance"][value="no"]').checked = true;
    updateCounts();
  }
  function updateCounts() {
    const attending = document.querySelector('[name="attendance"]:checked').value === "yes";
    $("counts").hidden = !attending;
    const total = Number($("adults").value) + Number($("children").value);
    const remaining = guest.max_seats - total;
    $("remaining").textContent = remaining < 0 ? `Supera sus ${guest.max_seats} lugares reservados.` : remaining === 0 ? "Están utilizando todos sus lugares reservados." : remaining === 1 ? "Queda 1 de sus lugares sin utilizar." : `Quedan ${remaining} de sus lugares sin utilizar.`;
    $("remaining").classList.toggle("error", remaining < 0 || (attending && total === 0));
    if (attending && total === 0) $("remaining").textContent = "Elige al menos un lugar para confirmar.";
    $("submit-button").disabled = attending && (remaining < 0 || total === 0);
  }
  function showGuest(data) {
    guest = data;
    $("envelope-greeting").textContent = `¡Hola, ${guest.label}! Recibiste una invitación 🌺`;
    $("personal-greeting").textContent = `¡Hola, ${guest.label}! 🌺 Te invito a mi albercada`;
    $("personal-greeting").hidden = false;
    $("guest-name").textContent = `¡Qué gusto invitarte, ${guest.label}!`;
    $("seat-count").textContent = guest.max_seats;
    $("seat-word").textContent = guest.max_seats === 1 ? "lugar" : "lugares";
    $("seat-detail").textContent = `${guest.max_adults} ${guest.max_adults === 1 ? "adulto" : "adultos"} · ${guest.max_children} ${guest.max_children === 1 ? "niño" : "niños"}`;
    $("deadline").textContent = guest.deadline_text || "";
    populate();
    $("guest-panel").hidden = false;
    status("");
    if (guest.rsvp) showSuccess(false);
  }
  function showSuccess(fresh) {
    const r = guest.rsvp;
    const declined = r.status === "declined";
    const title = declined ? "Gracias por avisarnos 💛" : fresh ? "¡Qué alegría! Nos vemos pronto 🌺" : "Tu confirmación está registrada 🌺";
    const detail = declined ? "Registramos que no podrán acompañarnos." : `Reservamos ${r.adults + r.children} ${r.adults + r.children === 1 ? "lugar" : "lugares"} para ustedes (${r.adults} ${r.adults === 1 ? "adulto" : "adultos"}, ${r.children} ${r.children === 1 ? "niño" : "niños"}).`;
    $("success").replaceChildren();
    const h = document.createElement("h2"), p = document.createElement("p"), receipt = document.createElement("div"), reminder = document.createElement("p"), change = document.createElement("button");
    h.textContent = title; p.textContent = detail;
    receipt.className = "receipt-details";
    const invited = document.createElement("strong");
    invited.textContent = `Invitación de ${guest.label}`;
    const when = document.createElement("span"), where = document.createElement("span");
    when.textContent = "📅 Sábado 3 de octubre · 3:00 p. m.";
    where.textContent = "📍 Bambú, Churubusco 219 casi esquina con Tabasco";
    receipt.append(invited, when, where);
    reminder.className = "receipt-reminder";
    reminder.textContent = "Guarda este enlace: podrás volver a abrir tu invitación y consultar tu respuesta cuando quieras.";
    change.textContent = "Modificar mi respuesta";
    change.className = "change-button";
    change.type = "button";
    change.addEventListener("click", () => {$("success").hidden = true; $("guest-panel").hidden = false;});
    $("success").append(h,p,receipt,reminder,change);
    $("success").hidden = false;
    $("guest-panel").hidden = true;
  }
  document.querySelectorAll('[name="attendance"]').forEach(el => el.addEventListener("change", updateCounts));
  ["adults","children"].forEach(id => $(id).addEventListener("change", updateCounts));
  $("rsvp-form").addEventListener("submit", async e => {
    e.preventDefault();
    const attending = document.querySelector('[name="attendance"]:checked').value === "yes";
    const adults = attending ? Number($("adults").value) : 0;
    const children = attending ? Number($("children").value) : 0;
    if (attending && (adults + children < 1 || adults > guest.max_adults || children > guest.max_children)) return;
    $("submit-button").disabled = true;
    status("Guardando tu respuesta…");
    try {
      if (demo) {
        guest.rsvp = {status:attending ? "attending":"declined",adults,children};
        localStorage.setItem(demoKey, JSON.stringify(guest.rsvp));
      } else {
        const result = await rpc("submit_rsvp", {p_token:token,p_adults:adults,p_children:children});
        guest.rsvp = result.rsvp;
      }
      showSuccess(true); status("");
    } catch (err) { status(err.message || "No se pudo guardar.", true); }
    finally {$("submit-button").disabled = false;}
  });
  if (demo) {
    let saved = null;
    const demoName = (params.get("nombre") || "Dulce").slice(0,60);
    const maxAdults = Math.max(0,Math.min(30,Number(params.get("adultos") ?? 2) || 0));
    const maxChildren = Math.max(0,Math.min(30,Number(params.get("ninos") ?? 3) || 0));
    const adults = maxAdults + maxChildren ? maxAdults : 2;
    const children = maxAdults + maxChildren ? maxChildren : 3;
    try { saved = JSON.parse(localStorage.getItem(demoKey)); } catch (_) {}
    showGuest({label:demoName,max_seats:adults+children,max_adults:adults,max_children:children,deadline_text:"Vista previa: esta respuesta se guarda solo en este dispositivo.",rsvp:saved});
  } else if (!token) {
    $("missing-link").hidden = false;
    status(isConfigured ? "" : "La confirmación en línea está en preparación.");
  } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    status("El enlace de invitación no es válido.", true);
  } else if (!isConfigured) {
    status("La confirmación en línea está en preparación. Vuelve a intentarlo más tarde.");
  } else {
    status("Buscando tu invitación…");
    rpc("get_invitation", {p_token:token}).then(data => {
      if (!data) throw new Error("No encontramos esta invitación. Pide tu enlace personal a quien te invitó.");
      showGuest(data);
    }).catch(err => status(err.message, true));
  }
})();
