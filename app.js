(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const token = params.get("i");
  const demo = params.get("demo") === "1";
  const config = window.RSVP_CONFIG || {};
  const isConfigured = /^https:\/\/.+\.supabase\.co\/?$/.test(config.supabaseUrl) && !!config.anonKey;
  let guest;

  function status(message, error = false) {
    $("status").textContent = message;
    $("status").classList.toggle("error", error);
  }
  async function rpc(name, args) {
    const response = await fetch(`${config.supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {"content-type":"application/json", apikey:config.anonKey, Authorization:`Bearer ${config.anonKey}`},
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
    $("remaining").textContent = remaining < 0 ? `Supera sus ${guest.max_seats} lugares reservados.` : remaining === 0 ? "Están utilizando todos sus lugares reservados." : `Quedan ${remaining} de sus lugares sin utilizar.`;
    $("remaining").classList.toggle("error", remaining < 0 || (attending && total === 0));
    if (attending && total === 0) $("remaining").textContent = "Elige al menos un lugar para confirmar.";
    $("submit-button").disabled = attending && (remaining < 0 || total === 0);
  }
  function showGuest(data) {
    guest = data;
    $("guest-name").textContent = `¡Hola, ${guest.label}!`;
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
    const detail = declined ? "Registramos que no podrán acompañarnos." : `Reservamos ${r.adults + r.children} ${r.adults + r.children === 1 ? "lugar" : "lugares"} para ustedes (${r.adults} adultos, ${r.children} niños).`;
    $("success").replaceChildren();
    const h = document.createElement("h2"), p = document.createElement("p"), change = document.createElement("button");
    h.textContent = title; p.textContent = detail;
    change.textContent = "Modificar mi respuesta";
    change.className = "change-button";
    change.type = "button";
    change.addEventListener("click", () => {$("success").hidden = true; $("guest-panel").hidden = false;});
    $("success").append(h,p,change);
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
        localStorage.setItem("lia-demo-rsvp", JSON.stringify(guest.rsvp));
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
    try { saved = JSON.parse(localStorage.getItem("lia-demo-rsvp")); } catch (_) {}
    showGuest({label:"Familia de ejemplo",max_seats:4,max_adults:2,max_children:2,deadline_text:"Vista previa: esta respuesta se guarda solo en este dispositivo.",rsvp:saved});
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
