(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const cfg = window.RSVP_CONFIG || {};
  const ready = /^https:\/\/.+\.supabase\.co\/?$/.test(cfg.supabaseUrl) && !!cfg.anonKey && !!window.supabase;
  const client = ready ? window.supabase.createClient(cfg.supabaseUrl, cfg.anonKey) : null;
  const inviteBase = new URL("./", location.href);
  const msg = (text, error=false) => {$("admin-message").textContent=text;$("admin-message").classList.toggle("error",error);};
  const previewURL = () => {
    const u = new URL(inviteBase);
    u.searchParams.set("demo","1");u.searchParams.set("nombre",$("invite-name").value.trim()||"Dulce");
    u.searchParams.set("adultos",$("invite-adults").value);u.searchParams.set("ninos",$("invite-children").value);
    return u.href;
  };
  $("preview").addEventListener("click",()=>window.open(previewURL(),"_blank","noopener"));
  $("demo-link").href = new URL("./?demo=1&nombre=Dulce&adultos=2&ninos=3",location.href).href;
  if (!ready) {$("setup-panel").hidden=false;$("preview-panel").hidden=false;return;}

  async function load() {
    const {data:{session}} = await client.auth.getSession();
    if (!session) {$("dashboard").hidden=true;$("login-panel").hidden=false;return;}
    const [settings,guestResult,rsvpResult] = await Promise.all([
      client.from("event_settings").select("id").single(),
      client.from("guests").select("id,token,label,max_adults,max_children,active").order("label"),
      client.from("rsvps").select("guest_id,status,adults,children")
    ]);
    const error = settings.error || guestResult.error || rsvpResult.error;
    if (error || !settings.data) {$("dashboard").hidden=true;$("login-panel").hidden=false;msg("Esta cuenta no tiene acceso al panel. Revisa el correo de administrador.",true);return;}
    $("login-panel").hidden=true;$("dashboard").hidden=false;msg("");
    const guests=guestResult.data||[],rsvps=rsvpResult.data||[];
    const activeConfirmed=rsvps.filter(r=>r.status==="attending" && guests.some(g=>g.id===r.guest_id&&g.active));
    $("confirmed-adults").textContent=activeConfirmed.reduce((n,r)=>n+r.adults,0);
    $("confirmed-children").textContent=activeConfirmed.reduce((n,r)=>n+r.children,0);
    $("confirmed-total").textContent=activeConfirmed.reduce((n,r)=>n+r.adults+r.children,0);
    $("confirmed-total").nextElementSibling.textContent=`confirmados de ${guests.filter(g=>g.active).reduce((n,g)=>n+g.max_adults+g.max_children,0)} lugares invitados`;
    const byGuest = new Map(rsvps.map(r => [r.guest_id, r]));
    const groups = {going:[], pending:[], declined:[], inactive:[]};
    for (const g of guests) {
      const r = byGuest.get(g.id);
      const kind = !g.active ? "inactive" : r?.status === "attending" ? "going" : r?.status === "declined" ? "declined" : "pending";
      groups[kind].push({guest:g, response:r});
    }
    for (const [kind, entries] of Object.entries(groups)) {
      const list = $(`${kind}-list`); list.replaceChildren();
      $(`${kind}-count`).textContent = entries.length;
      if (!entries.length && kind !== "inactive") {
        const empty = document.createElement("li"); empty.className = "empty-status";
        empty.textContent = kind === "going" ? "Todavía nadie." : kind === "pending" ? "Todos respondieron." : "Nadie por ahora.";
        list.append(empty);
      }
      for (const {guest:g, response:r} of entries) {
        const item = document.createElement("li"), name = document.createElement("strong"), detail = document.createElement("span");
        name.textContent = g.label;
        detail.textContent = kind === "going" ? `${r.adults} ${r.adults === 1 ? "adulto" : "adultos"} · ${r.children} ${r.children === 1 ? "niño" : "niños"}`
          : kind === "pending" ? `Invitados: ${g.max_adults} adultos · ${g.max_children} niños`
          : kind === "inactive" ? "Enlace desactivado" : "Avisó que no asistirá";
        item.append(name, detail); list.append(item);
      }
    }
    $("inactive-group").hidden = !groups.inactive.length;
    const list=$("guest-list");list.replaceChildren();
    if (!guests.length) {list.textContent="Aún no hay invitaciones. Crea la primera arriba.";return;}
    for (const g of guests) {
      const r=rsvps.find(x=>x.guest_id===g.id),row=document.createElement("article");row.className="guest-row";
      const name=document.createElement("strong");name.textContent=g.label;
      const summary=document.createElement("p");summary.textContent=`${g.max_adults} adultos · ${g.max_children} niños · ${!g.active?"Desactivada":r?.status==="attending"?`Confirmó ${r.adults} adultos y ${r.children} niños`:r?.status==="declined"?"No asistirá":"Pendiente"}`;
      const controls=document.createElement("div");controls.className="guest-controls";
      const adultInput=document.createElement("input"),childInput=document.createElement("input");
      for(const [el,value,label] of [[adultInput,g.max_adults,"Adultos"],[childInput,g.max_children,"Niños"]]){el.type="number";el.min="0";el.max="30";el.value=value;el.setAttribute("aria-label",`${label} para ${g.label}`);}
      const copy=document.createElement("button");copy.type="button";copy.textContent="Copiar enlace";copy.className="secondary";
      copy.addEventListener("click",async()=>{const u=new URL(inviteBase);u.searchParams.set("i",g.token);await navigator.clipboard.writeText(u.href);msg(`Enlace de ${g.label} copiado.`);});
      const save=document.createElement("button");save.type="button";save.textContent="Guardar cupos";save.className="secondary";
      save.addEventListener("click",async()=>{const a=Number(adultInput.value),c=Number(childInput.value);if(!valid(a,c)){msg("Asigna entre 1 y 30 lugares en total.",true);return;}if(r?.status==="attending"&&(a<r.adults||c<r.children)){msg("Primero corrige la respuesta confirmada; los nuevos cupos no pueden ser menores.",true);return;}const {error}=await client.from("guests").update({max_adults:a,max_children:c}).eq("id",g.id);if(error){msg(error.message,true);return;}await load();msg(`Lugares de ${g.label} actualizados.`);});
      const toggle=document.createElement("button");toggle.type="button";toggle.textContent=g.active?"Desactivar":"Reactivar";toggle.className="text-button";
      toggle.addEventListener("click",async()=>{const {error}=await client.from("guests").update({active:!g.active}).eq("id",g.id);if(error){msg(error.message,true);return;}await load();});
      controls.append(adultInput,childInput,save,copy,toggle);row.append(name,summary,controls);list.append(row);
    }
  }
  $("refresh-status").addEventListener("click", async () => {
    $("refresh-status").disabled = true;
    try { await load(); msg("Lista actualizada."); }
    finally { $("refresh-status").disabled = false; }
  });
  function valid(a,c){return Number.isInteger(a)&&Number.isInteger(c)&&a>=0&&c>=0&&a+c>=1&&a+c<=30;}
  $("login-form").addEventListener("submit",async e=>{e.preventDefault();msg("Enviando enlace de acceso…");const {error}=await client.auth.signInWithOtp({email:$("admin-email").value.trim(),options:{emailRedirectTo:location.origin+location.pathname}});msg(error?error.message:"Revisa tu correo y abre el enlace para entrar al panel.",!!error);});
  $("logout").addEventListener("click",async()=>{await client.auth.signOut();await load();});
  $("new-invite").addEventListener("submit",async e=>{
    e.preventDefault();const label=$("invite-name").value.trim(),max_adults=Number($("invite-adults").value),max_children=Number($("invite-children").value);
    if(!label||!valid(max_adults,max_children)){msg("Escribe un nombre y asigna entre 1 y 30 lugares.",true);return;}
    const {data,error}=await client.from("guests").insert({label,max_adults,max_children}).select("token").single();
    if(error){msg(error.message,true);return;}
    $("invite-name").value="";await load();
    const u=new URL(inviteBase);u.searchParams.set("i",data.token);
    try{await navigator.clipboard.writeText(u.href);msg(`Invitación de ${label} creada. Su enlace ya está copiado.`);}catch{msg(`Invitación de ${label} creada. Usa “Copiar enlace” en su ficha.`);}
  });
  client.auth.onAuthStateChange(()=>setTimeout(load,0));load();
})();
