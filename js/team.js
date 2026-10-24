/* Team tab: your teams, the roster, the coaching staff, bus lists for away games,
   and game-day food sign-ups parents open from a link (no account needed).
   Roster players are saved as items of kind "players", bus lists as kind "trips" (one per game date).
   Food sign-up sheets live in their own tables (supabase/team-tools.sql); in demo mode they're
   kept in this browser so the parents' page can be previewed on this device. */
(function(){
let pane="teams", ROSTER=[], TRIPS={}, unsubs=[], busDate=null, tripTimer=null, needsDb="", rosterEdit=null, food=null;
try{pane=localStorage.getItem("cpp:tmPane")||"teams";}catch{}
const can=()=>!!(typeof PERM!=="undefined"&&PERM.schedule);
const isDbMissing=e=>/items_kind_check|check constraint|signup_boards|does not exist|schema cache/i.test((e&&e.message)||String(e||""));
const DB_HELP=`<div class="msg err tm-db">This needs one database update. In Supabase, open <b>SQL Editor → New query</b>, paste the contents of <a href="https://raw.githubusercontent.com/nelsonsurehands-hash/practice-planner/main/supabase/team-tools.sql" target="_blank" rel="noopener">supabase/team-tools.sql</a>, and tap <b>Run</b>. Then reload the app.</div>`;
const byNum=(a,b)=>(parseInt(a.number)||999)-(parseInt(b.number)||999)||String(a.name||"").localeCompare(b.name||"");
const pname=p=>`${p.number?"#"+p.number+" ":""}${p.name||"Player"}`;
const ampm=t=>{if(!t)return "";const [h,m]=t.split(":").map(Number);return `${((h+11)%12)+1}:${String(m).padStart(2,"0")} ${h<12?"AM":"PM"}`;};
const hm=t=>t?ampm(t):"";
const longDay=iso=>dObj(iso).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
const toMin=t=>{const [h,m]=String(t||"0:0").split(":").map(Number);return h*60+(m||0);};
/* Bus time: 90 minutes before the game (same rule as the calendar's Bus mark), or 3:00 PM. */
function busDefault(iso){const g=(SETTINGS.games||[]).find(x=>x.date===iso);if(!g||!g.time)return "15:00";const m=Math.max(0,toMin(g.time)-90);return String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0");}
const tel=s=>String(s||"").replace(/[^\d+]/g,"");

/* ---------- navigation ---------- */
function showPane(p){
  pane=p||pane;try{localStorage.setItem("cpp:tmPane",pane);}catch{}
  document.querySelectorAll(".tm-nav [data-tm]").forEach(b=>b.setAttribute("aria-selected",b.dataset.tm===pane));
  document.querySelectorAll("#view-team .tm-pane").forEach(x=>x.hidden=x.id!=="tm-"+pane);
  render();
  if(pane==="food"&&food&&!$("#view-team").hidden)loadFood();   // pick up new sign-ups
}
window.goTeam=(p,opts)=>{if(opts&&opts.date){if(p==="bus")busDate=opts.date;else if(window.TM)TM.date=opts.date;}setTab("team");showPane(p);};
window.onTeamTab=()=>showPane(pane);
$(".tm-nav").addEventListener("click",e=>{const b=e.target.closest("[data-tm]");if(b)showPane(b.dataset.tm);});
document.addEventListener("click",e=>{const b=e.target.closest("[data-goteam]");if(b)window.goTeam(b.dataset.goteam);});
function render(){
  if(typeof team==="undefined"||!team||$("#view-team").hidden)return;
  $("#tmEyebrow").textContent=[team.name,(team.settings||{}).teamLabel].filter(Boolean).join(" · ");
  if(pane==="teams")renderTeams();
  if(pane==="roster")renderRoster();
  if(pane==="staff")renderStaff();
  if(pane==="bus")renderBus();
  if(pane==="food")renderFood();
  if(TM.panes[pane])TM.panes[pane]();
}
/* If the team opened before this file finished loading (demo mode opens instantly), catch up. */
setTimeout(()=>{if(typeof store!=="undefined"&&store&&openedFor!==store)window.onTeamOpen();},0);
/* Shared with js/gameplan.js (Gameplan and Scouting report sections). */
const TM=window.TM={panes:{},opened:[],date:null,get roster(){return ROSTER;},get pane(){return pane;},can,
  put:(k,id,b)=>put(k,id,b),dbHelp:DB_HELP,isDbMissing,pname,hm,longDay,slug:s=>slug(s),pdfDoc:()=>pdfDoc(),pdfHead:(d,t,s)=>pdfHead(d,t,s),
  needsDb:()=>needsDb,render:()=>render()};

/* ---------- data for the open team ---------- */
let openedFor=null;
window.onTeamOpen=function(){
  openedFor=store;
  unsubs.forEach(u=>{try{u()}catch{}});unsubs=[];ROSTER=[];TRIPS={};busDate=null;rosterEdit=null;food=null;needsDb="";
  unsubs.push(store.collection("players").onSnapshot(s=>{ROSTER=s.docs.map(d=>({id:d.id,...d.data()})).sort(byNum);if(["roster","bus","game"].includes(pane))render();},()=>{}));
  /* Bus lists: redraw only for changes from someone else, so typing here isn't interrupted. */
  unsubs.push(store.collection("trips").onSnapshot(s=>{
    const next=Object.fromEntries(s.docs.map(d=>[d.id,d.data()]));
    if(tripTimer&&busDate&&TRIPS[busDate])next[busDate]=TRIPS[busDate];   // keep edits that haven't saved yet
    const changed=JSON.stringify(next)!==JSON.stringify(JSON.parse(JSON.stringify(TRIPS)));
    TRIPS=next;
    if(changed&&pane==="bus"&&!(document.activeElement&&document.activeElement.closest("#tm-bus input")))render();
  },()=>{}));
  TM.opened.forEach(f=>{try{f()}catch(e){console.error(e)}});
  render();
};
async function put(kind,id,body){
  try{await store.collection(kind).doc(id).set(body);return true;}
  catch(e){if(isDbMissing(e)){needsDb=kind;render();}else showNotice("Not saved: "+(e.message||"check your connection"));return false;}
}

/* ---------- my teams ---------- */
function teamCard(t){
  const st=t.settings||{},on=t.id===team.id;
  const mark=st.logo?`<img class="sw-logo" src="${esc(st.logo)}" alt="">`:`<span class="sw-dot" style="background:${esc(st.color||"#5b2a86")}${st.color2?`;box-shadow:inset -8px 0 0 ${esc(st.color2)}`:""}"></span>`;
  const games=(st.games||[]).length,season=st.seasonStart?`${longDay(st.seasonStart)} – ${longDay(st.seasonEnd)}`:"No season dates yet";
  return `<article class="tm-tcard${on?" on":""}">${mark}<div class="tm-tinfo"><b>${esc(t.name)}</b>
    <small>${st.teamLabel?esc(st.teamLabel)+" · ":""}${esc(sportName(t))} · ${esc(roleName(t.role))}</small>
    <small>${esc(season)} · ${games} game${games===1?"":"s"}</small></div>
    ${on?`<span class="tm-badge">Open now</span>`:`<button class="btn" data-openteam="${t.id}">Open</button>`}</article>`;
}
/* Teams are grouped by school or club; each grade or level (7th grade, 8th grade, JV…) is its own team. */
const schoolKey=t=>String((t.settings||{}).school||t.name||"").trim().toLowerCase();
function schoolGroups(){
  const m=new Map();
  teams.forEach(t=>{const k=schoolKey(t);if(!m.has(k))m.set(k,[]);m.get(k).push(t);});
  return [...m.values()].map(list=>{
    list.sort((a,b)=>String((a.settings||{}).teamLabel||"").localeCompare(String((b.settings||{}).teamLabel||""),undefined,{numeric:true}));
    const lead=list.find(t=>t.id===team.id)||list[0],st=lead.settings||{};
    return {key:schoolKey(lead),school:st.school||lead.name,mascot:st.mascot||"",lead,list};
  }).sort((a,b)=>(b.list.some(t=>t.id===team.id))-(a.list.some(t=>t.id===team.id))||a.school.localeCompare(b.school));
}
let addClassFor=null;
function addClassForm(g){
  const same=g.list.filter(t=>canEdit(t)),src=same.find(t=>t.id===team.id)||same[0]||g.lead;
  return `<form class="rs-form tm-addclass" data-school="${esc(g.key)}">
    <label class="f">Grade, level or team name<input name="label" required placeholder="e.g. 7th Grade Girls, JV, 8th Grade Boys" autocomplete="off"></label>
    <label class="f">Sport<select name="sport">${Object.keys(SPORTS).map(k=>`<option value="${k}"${((src.settings||{}).sport||"basketball")===k?" selected":""}>${esc(SPORTS[k].name)}</option>`).join("")}</select></label>
    <label class="f">Start it from<select name="from">${g.list.map(t=>`<option value="${t.id}"${t.id===src.id?" selected":""}>${esc((t.settings||{}).teamLabel||t.name)}</option>`).join("")}<option value="">Nothing, start fresh</option></select></label>
    <div class="exp-pick">
      <label><input type="checkbox" name="drills" checked> Drill library</label>
      <label><input type="checkbox" name="plays" checked> Plays (same sport only)</label>
      <label><input type="checkbox" name="sched" checked> Practice days, times and season dates</label>
      <label><input type="checkbox" name="roster"> Roster</label>
    </div>
    <p class="help" style="margin:0">The school name, team name, colors and logo carry over. Games, practice plans, calendar marks and staff start empty; staff join with the new team's own code.</p>
    <div class="actions" style="margin:0"><button class="btn primary" type="submit">Create team</button><button class="btn" type="button" data-addclass="">Cancel</button></div>
    <div class="msg" data-addmsg></div></form>`;
}
function renderTeams(){
  const owner=team.role==="owner"||!HOSTED,groups=schoolGroups();
  $("#tm-teams").innerHTML=`<div class="tm-card"><h3 class="tm-h">Schools and teams <small>${teams.length} team${teams.length===1?"":"s"}</small></h3>
    ${groups.map(g=>{const st=g.lead.settings||{};
      const mark=st.logo?`<img class="sw-logo" src="${esc(st.logo)}" alt="">`:`<span class="sw-dot" style="background:${esc(st.color||"#5b2a86")}${st.color2?`;box-shadow:inset -8px 0 0 ${esc(st.color2)}`:""}"></span>`;
      return `<section class="tm-school"><header>${mark}<div><b>${esc([g.school,g.mascot].filter(Boolean).join(" "))}</b><small>${g.list.length} team${g.list.length===1?"":"s"}</small></div></header>
        <ul class="tm-classes">${g.list.map(t=>{const ts=t.settings||{},on=t.id===team.id,n=(ts.games||[]).length;
          return `<li class="tm-class${on?" on":""}"><div><b>${esc(ts.teamLabel||"Main team")}</b><small>${esc(sportName(t))} · ${esc(roleName(t.role))} · ${n} game${n===1?"":"s"}</small></div>
            ${on?`<span class="tm-badge">Open now</span>`:`<button class="btn" type="button" data-openteam="${t.id}">Open</button>`}</li>`;}).join("")}</ul>
        ${addClassFor===g.key?addClassForm(g):g.list.some(t=>canEdit(t))||!HOSTED?`<button class="btn" type="button" data-addclass="${esc(g.key)}">+ Add a grade or team at ${esc(g.school)}</button>`:""}
      </section>`;}).join("")}
    <div class="actions" style="margin:12px 0 0"><button class="btn" type="button" id="tmNew">+ Add a different school or club</button>${HOSTED?`<button class="btn" type="button" id="tmJoin">Join another staff with a code</button>`:""}</div>
    <p class="help">Each grade or level is its own team with its own practice plans, plays, drills, calendar, roster and staff. Switch between them here or from the team button at the top.</p></div>
    <div class="tm-card"><h3 class="tm-h">This team</h3>
    <p class="help" style="margin-top:0">Name, colors, logo, season, practice days and games are in Settings.</p>
    <div class="actions" style="margin:0"><button class="btn" type="button" data-tab-go="settings">Team settings</button><button class="btn" type="button" data-goteam="roster">Roster</button><button class="btn" type="button" data-goteam="staff">Staff</button></div>
    ${owner?`<details class="tm-danger"><summary>Delete this team</summary>
      <p class="help">This permanently deletes <b>${esc(team.name)}</b>${HOSTED?" for everyone on the staff":""}: its practice plans, plays, drills, calendar, roster, bus lists and sign-up sheets. Download a backup first (Settings → Backup). Your other teams aren't affected.</p>
      <label class="f">Type the team name to confirm<input id="tmDelName" autocomplete="off" placeholder="${esc(team.name)}"></label>
      <button class="btn danger" type="button" id="tmDel">Delete team forever</button><div class="msg" id="tmDelMsg"></div></details>`:""}</div>`;
}
$("#tm-teams").addEventListener("submit",async e=>{
  const f=e.target.closest(".tm-addclass");if(!f)return;e.preventDefault();
  const label=f.label.value.trim();if(!label)return;
  const g=schoolGroups().find(x=>x.key===f.dataset.school),src=teams.find(t=>t.id===f.from.value)||null,base=(src||g.lead).settings||{};
  const sport=f.sport.value,sameSport=src&&((src.settings||{}).sport||"basketball")===sport;
  if(teams.some(t=>schoolKey(t)===g.key&&String((t.settings||{}).teamLabel||"").trim().toLowerCase()===label.toLowerCase())){msg(f.querySelector("[data-addmsg]"),`${g.school} already has a team called ${label}.`,"err");return;}
  const settings={...DEFAULT_SETTINGS,sport,school:base.school||"",mascot:base.mascot||"",teamLabel:label,color:base.color||"#5b2a86"};
  ["color2","logo","appIcon","quickAdds"].forEach(k=>{if(base[k]!==undefined)settings[k]=JSON.parse(JSON.stringify(base[k]));});
  if(src&&f.sched.checked)["practiceDays","weekdayStart","weekdayEnd","weekendStart","weekendEnd","seasonStart","seasonEnd","minPractices"].forEach(k=>{if(src.settings&&src.settings[k]!==undefined)settings[k]=JSON.parse(JSON.stringify(src.settings[k]));});
  const kinds=src?[["drills",f.drills.checked],["plays",f.plays.checked&&sameSport],["players",f.roster.checked]].filter(x=>x[1]).map(x=>x[0]):[];
  const btn=f.querySelector("[type=submit]");btn.disabled=true;msg(f.querySelector("[data-addmsg]"),"Creating "+label+"…");
  try{
    const copied={};for(const k of kinds)copied[k]=await readItems(src.id,k);
    const name=[settings.school,settings.mascot].filter(Boolean).join(" ")||label;let t;
    if(HOSTED){
      const {data,error}=await sb.rpc("create_team",{p_name:name,p_settings:settings,p_display_name:(team&&team.myName)||null});
      if(error)throw error;await loadTeams();t=teams.find(x=>x.id===data);if(!t)throw new Error("Team created, but it couldn't be loaded. Reload the app.");
    }else{t={id:"demo-"+uid(),name,settings,role:"owner",join_code:"",viewer_code:""};teams=[...readDemoTeams(),t];writeDemoTeams(teams);}
    addClassFor=null;await openTeam(t);
    for(const k of Object.keys(copied))if(copied[k].length)await store.bulkSet(k,copied[k].map(([id,d])=>[id,{...d,copiedFrom:(src.settings||{}).teamLabel||src.name}]));
    showPane("teams");
    showNotice(`${label} is ready${Object.keys(copied).length?`, with ${Object.entries(copied).map(([k,v])=>`${v.length} ${k==="players"?"players":k}`).join(", ")} from ${(src.settings||{}).teamLabel||src.name}`:""}. Add its games in the Calendar tab.`);
  }catch(err){btn.disabled=false;msg(f.querySelector("[data-addmsg]"),err.message||String(err),"err");}
});
$("#tm-teams").addEventListener("click",async e=>{
  const o=e.target.closest("[data-openteam]");
  if(o){const t=teams.find(x=>x.id===o.dataset.openteam);if(t){await openTeam(t);showPane("teams");}return;}
  if(e.target.closest("[data-tab-go]")){setTab(e.target.closest("[data-tab-go]").dataset.tabGo);return;}
  if(e.target.id==="tmNew"||e.target.id==="tmJoin"){showSetup(true,e.target.id==="tmJoin");return;}
  const ac=e.target.closest("[data-addclass]");
  if(ac){addClassFor=ac.dataset.addclass||null;renderTeams();const f=document.querySelector(".tm-addclass [name=label]");if(f)f.focus();return;}
  if(e.target.id==="tmDel"){
    if($("#tmDelName").value.trim().toLowerCase()!==team.name.trim().toLowerCase()){msg($("#tmDelMsg"),"Type the team name exactly to confirm.","err");return;}
    e.target.disabled=true;msg($("#tmDelMsg"),"Deleting…");
    const id=team.id;
    if(HOSTED){
      const {data,error}=await sb.from("teams").delete().eq("id",id).select("id");
      if(error||!data||!data.length){e.target.disabled=false;msg($("#tmDelMsg"),error?error.message:"Only a head coach can delete the team.","err");return;}
    }else{
      writeDemoTeams(readDemoTeams().filter(t=>t.id!==id));
      try{Object.keys(localStorage).filter(k=>k.startsWith(`cpp:${id}:`)||k===`cpp:food:${id}`).forEach(k=>localStorage.removeItem(k));}catch{}
    }
    await loadTeams();
    if(teams.length){await openTeam(teams[0]);showPane("teams");showNotice("Team deleted.");}else showSetup(false);
  }
});

/* ---------- roster ---------- */
function playerForm(p){
  p=p||{};
  return `<form class="rs-form" data-pid="${esc(p.id||"")}">
    <div class="rs-grid">
      <label class="f rs-n">Jersey #<input name="number" inputmode="numeric" value="${esc(p.number||"")}" maxlength="3"></label>
      <label class="f rs-name">Player name<input name="name" required value="${esc(p.name||"")}" placeholder="First and last name" autocomplete="off"></label>
      <label class="f">Grade or position<input name="pos" value="${esc(p.pos||"")}" placeholder="e.g. 8th · Guard"></label>
      <label class="f">Parent or guardian<input name="parent" value="${esc(p.parent||"")}" autocomplete="off"></label>
      <label class="f">Parent phone<input name="phone" type="tel" value="${esc(p.phone||"")}" autocomplete="off"></label>
      <label class="f">Parent email<input name="email" type="email" value="${esc(p.email||"")}" autocomplete="off"></label>
      <label class="f">Second contact<input name="parent2" value="${esc(p.parent2||"")}" placeholder="Name"></label>
      <label class="f">Second contact phone<input name="phone2" type="tel" value="${esc(p.phone2||"")}"></label>
    </div>
    <label class="f">Notes<input name="notes" value="${esc(p.notes||"")}" placeholder="Anything the staff should know"></label>
    <div class="actions" style="margin:4px 0 0"><button class="btn primary" type="submit">${p.id?"Save":"Add player"}</button><button class="btn" type="button" data-rsact="cancel">Cancel</button>${p.id?`<button class="btn danger" type="button" data-rsact="del" data-pid="${esc(p.id)}">Remove from roster</button>`:""}</div>
  </form>`;
}
function renderRoster(){
  const box=$("#tm-roster");
  if(HOSTED&&!can()&&!["owner","coach"].includes(team.role)){box.innerHTML=`<div class="tm-card"><h3 class="tm-h">Roster</h3><p class="help">The roster has parent phone numbers and emails, so only coaches can see it.</p></div>`;return;}
  const ed=can(),emails=[...new Set(ROSTER.map(p=>p.email).filter(Boolean))];
  box.innerHTML=(needsDb==="players"?DB_HELP:"")+`<div class="tm-card"><h3 class="tm-h">Roster <small>${ROSTER.length} player${ROSTER.length===1?"":"s"}</small></h3>
    ${ed?`<div class="actions" style="margin:0 0 10px"><button class="btn primary" type="button" data-rsact="add">+ Add player</button><button class="btn" type="button" data-rsact="paste">Paste a list</button>${ROSTER.length?`<button class="btn" type="button" data-rsact="print">Print roster</button>`:""}${emails.length?`<button class="btn" type="button" data-rsact="emails">Copy parent emails</button>`:""}</div>`:""}
    <div id="rsNew">${rosterEdit==="new"?playerForm():rosterEdit==="paste"?pasteForm():""}</div>
    ${ROSTER.length?`<ul class="rs-list">${ROSTER.map(p=>rosterEdit===p.id?`<li class="rs-row editing">${playerForm(p)}</li>`:
      `<li class="rs-row"><span class="rs-num">${esc(p.number||"–")}</span><div class="rs-who"><b>${esc(p.name||"")}</b>${p.pos?` <span class="rs-pos">${esc(p.pos)}</span>`:""}
        <small>${[p.parent,p.phone?`<a href="tel:${esc(tel(p.phone))}">${esc(p.phone)}</a>`:"",p.email?`<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>`:""].filter(Boolean).join(" · ")||"No parent contact yet"}</small>
        ${p.parent2||p.phone2?`<small>${esc(p.parent2||"")}${p.phone2?` · <a href="tel:${esc(tel(p.phone2))}">${esc(p.phone2)}</a>`:""}</small>`:""}
        ${p.notes?`<small class="rs-note">${esc(p.notes)}</small>`:""}</div>
        ${ed?`<button class="btn" type="button" data-rsact="edit" data-pid="${esc(p.id)}">Edit</button>`:""}</li>`).join("")}</ul>`:
      `<p class="help">No players yet. Add them one at a time, or paste a list from a spreadsheet or your notes. The roster is used for bus lists, and parents can pick their player on the food sign-up.</p>`}
    <div class="msg" id="rsMsg"></div></div>`;
}
function pasteForm(){
  return `<form class="rs-form" id="rsPaste"><label class="f">One player per line<textarea name="list" rows="7" placeholder="12 Ava Smith&#10;3 Maya Jones, Kim Jones, 417-555-0101, kim@email.com&#10;Lily Brown"></textarea></label>
  <p class="help">Start a line with the jersey number if you like. You can also paste rows from a spreadsheet in this order: number, player, parent, phone, email.</p>
  <div class="actions" style="margin:0"><button class="btn primary" type="submit">Add players</button><button class="btn" type="button" data-rsact="cancel">Cancel</button></div></form>`;
}
function parseList(text){
  return text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(l=>{
    let cols=l.includes("\t")?l.split("\t"):l.split(/\s*,\s*/);cols=cols.map(c=>c.trim());
    let number="",name=cols[0]||"";
    if(/^#?\d{1,3}$/.test(name)&&cols.length>1){number=name.replace("#","");cols.shift();name=cols[0];}
    else{const m=/^#?(\d{1,3})[\s.)-]+(.+)$/.exec(name);if(m){number=m[1];name=m[2];}}
    if(/^(name|player|#|number|no\.?)$/i.test(name))return null;   // header row
    return name?{number,name,parent:cols[1]||"",phone:cols[2]||"",email:cols[3]||""}:null;
  }).filter(Boolean);
}
$("#tm-roster").addEventListener("click",async e=>{
  const b=e.target.closest("[data-rsact]");if(!b)return;
  const a=b.dataset.rsact;
  if(a==="add"){rosterEdit="new";renderRoster();$("#rsNew [name=name]").focus();}
  if(a==="paste"){rosterEdit="paste";renderRoster();$("#rsPaste textarea").focus();}
  if(a==="edit"){rosterEdit=b.dataset.pid;renderRoster();}
  if(a==="cancel"){rosterEdit=null;renderRoster();}
  if(a==="del"){
    if(b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent="Tap again to remove";return;}
    try{await store.collection("players").doc(b.dataset.pid).delete();rosterEdit=null;}catch(err){msg($("#rsMsg"),err.message,"err");}
  }
  if(a==="emails"){const list=[...new Set(ROSTER.map(p=>p.email).filter(Boolean))].join(", ");
    try{await navigator.clipboard.writeText(list);msg($("#rsMsg"),`Copied ${list.split(",").length} parent emails. Paste them into the To or Bcc line.`,"ok");}catch{msg($("#rsMsg"),list,"ok");}}
  if(a==="print")printRoster();
});
$("#tm-roster").addEventListener("submit",async e=>{
  e.preventDefault();const f=e.target;
  if(f.id==="rsPaste"){
    const list=parseList(f.list.value);if(!list.length)return;
    const now=Date.now();let ok=0;
    for(const [i,p] of list.entries()){if(await put("players","p-"+uid(),{...p,createdAt:now+i}))ok++;else break;}
    rosterEdit=null;renderRoster();if(ok)msg($("#rsMsg"),`Added ${ok} player${ok===1?"":"s"}.`,"ok");return;
  }
  const d=Object.fromEntries(new FormData(f).entries());Object.keys(d).forEach(k=>d[k]=d[k].trim());
  if(!d.name)return;
  const id=f.dataset.pid||"p-"+uid(),old=ROSTER.find(p=>p.id===id)||{createdAt:Date.now()};
  if(await put("players",id,{...old,...d,id:undefined})){rosterEdit=null;renderRoster();}
});
function pdfDoc(){const {jsPDF}=window.jspdf;return new jsPDF({unit:"pt",format:"letter"});}
function pdfHead(doc,title,sub){
  doc.setFont("helvetica","bold");doc.setFontSize(18);doc.text(title,40,50);
  doc.setFont("helvetica","normal");doc.setFontSize(10.5);doc.setTextColor(90);doc.text(sub,40,68);doc.setTextColor(0);
  doc.setLineWidth(1.5);doc.line(40,78,572,78);return 98;
}
function printRoster(){
  const doc=pdfDoc();let y=pdfHead(doc,`${team.name} roster`,[(team.settings||{}).teamLabel,`${ROSTER.length} players`,`Printed ${longDay(todayISO())}`].filter(Boolean).join(" · "));
  const cols=[40,72,220,350,452];
  doc.setFont("helvetica","bold");doc.setFontSize(9.5);["#","Player","Parent / guardian","Phone","Email"].forEach((h,i)=>doc.text(h,cols[i],y));y+=14;
  doc.setFont("helvetica","normal");doc.setFontSize(10);
  ROSTER.forEach(p=>{
    if(y>740){doc.addPage();y=50;}
    doc.text(String(p.number||""),cols[0],y);doc.text(doc.splitTextToSize(p.name||"",140)[0],cols[1],y);
    doc.text(doc.splitTextToSize(p.parent||"",124)[0],cols[2],y);doc.text(p.phone||"",cols[3],y);doc.text(doc.splitTextToSize(p.email||"",120)[0],cols[4],y);
    if(p.parent2||p.phone2){y+=12;doc.setTextColor(90);doc.text(doc.splitTextToSize(p.parent2||"",124)[0],cols[2],y);doc.text(p.phone2||"",cols[3],y);doc.setTextColor(0);}
    y+=6;doc.setDrawColor(210);doc.line(40,y,572,y);doc.setDrawColor(0);y+=13;
  });
  doc.save(`${slug(team.name)}-roster.pdf`);
}
const slug=s=>String(s||"team").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

/* ---------- bus list for away games ---------- */
const awayGames=()=>(SETTINGS.games||[]).filter(g=>g.date&&g.home===false).sort((a,b)=>a.date<b.date?-1:1);
const calBus=iso=>((SETTINGS.special||[]).find(x=>x.date===iso&&x.bus)||{}).bus||"";
function tripFor(iso){
  const t=JSON.parse(JSON.stringify(TRIPS[iso]||{}));
  t.riders=t.riders||{};t.boarded=t.boarded||{};t.back=t.back||{};
  if(!t.depart)t.depart=calBus(iso)||busDefault(iso);
  if(t.from===undefined){const prev=Object.values(TRIPS).find(x=>x.from);t.from=prev?prev.from:"";}
  return t;
}
const status=(t,p)=>t.riders[p.id]||"bus";
function renderBus(){
  const box=$("#tm-bus"),games=awayGames(),today=todayISO();
  if(!games.length){box.innerHTML=`<div class="tm-card"><h3 class="tm-h">Bus list</h3><p class="help">No away games on the calendar yet. Add a game in the Calendar tab and set it to Away, and it shows up here.</p></div>`;return;}
  if(!busDate||!games.some(g=>g.date===busDate))busDate=(games.find(g=>g.date>=today)||games[games.length-1]).date;
  const g=games.find(x=>x.date===busDate),t=tripFor(busDate),ed=can();
  const riding=ROSTER.filter(p=>status(t,p)==="bus"),own=ROSTER.filter(p=>status(t,p)==="own"),out=ROSTER.filter(p=>status(t,p)==="out");
  const on=riding.filter(p=>t.boarded[p.id]).length,home=riding.filter(p=>t.back[p.id]).length;
  const dis=ed?"":" disabled";
  const seg=(p,s)=>`<div class="seg rd-seg" role="group" aria-label="Ride for ${esc(p.name)}">${[["bus","Bus"],["own","Own ride"],["out","Not going"]].map(([v,l])=>`<button type="button" data-ride="${v}" data-pid="${esc(p.id)}" aria-pressed="${s===v}"${dis}>${l}</button>`).join("")}</div>`;
  box.innerHTML=(needsDb==="trips"?DB_HELP:"")+`<div class="bus-games" role="list">${games.map(x=>`<button type="button" class="bus-g${x.date===busDate?" on":""}${x.date<today?" past":""}" data-busg="${x.date}"><b>${esc(longDay(x.date))}</b><small>at ${esc(x.opponent||"Game")}</small></button>`).join("")}</div>
  <div class="tm-card bus-card">
    <h3 class="tm-h">at ${esc(g.opponent||"Game")} <small>${esc(longDay(g.date))}${g.time?" · game "+hm(g.time):""}</small></h3>
    <div class="bus-grid">
      <label class="f">Bus departs<input type="time" data-trip="depart" value="${esc(t.depart||"")}"${dis}></label>
      <label class="f">Back at school about<input type="time" data-trip="return" value="${esc(t.return||"")}"${dis}></label>
      <label class="f">Leave from<input data-trip="from" value="${esc(t.from||"")}" placeholder="e.g. Front lot by the gym"${dis}></label>
      <label class="f">Bus # or driver<input data-trip="driver" value="${esc(t.driver||"")}"${dis}></label>
      <label class="f bus-wide">Coaches and chaperones riding<input data-trip="adults" value="${esc(t.adults||"")}" placeholder="e.g. Coach Cornelison, Coach Lee"${dis}></label>
      <label class="f bus-wide">Notes<input data-trip="notes" value="${esc(t.notes||"")}" placeholder="e.g. Wear warm-ups, bring a sack dinner"${dis}></label>
    </div>
    <p class="help bus-sync">${calBus(busDate)?"The departure time shows on the calendar too.":"Changing the departure time adds a Bus mark to this day on the calendar."}</p>
    ${ROSTER.length?`<div class="bus-sum"><span><b>${riding.length}</b> on the bus</span><span><b>${own.length}</b> own ride</span><span><b>${out.length}</b> not going</span>
      <span class="bus-hc${on===riding.length&&riding.length?" ok":""}">Leaving: <b>${on}</b> of ${riding.length} checked in</span>${home?`<span class="bus-hc${home===riding.length?" ok":""}">Coming home: <b>${home}</b> of ${riding.length}</span>`:""}</div>
    <div class="bus-mode seg" role="group" aria-label="Head count"><button type="button" data-hc="out" aria-pressed="${(t.hc||"out")==="out"}">Check in: leaving</button><button type="button" data-hc="back" aria-pressed="${t.hc==="back"}">Check in: coming home</button></div>
    <ul class="bus-list">${ROSTER.map(p=>{const s=status(t,p),k=(t.hc||"out")==="back"?"back":"boarded";
      return `<li class="bus-row s-${s}">${s==="bus"?`<label class="bus-chk"><input type="checkbox" data-board="${esc(p.id)}"${t[k][p.id]?" checked":""}><span class="sr">On the bus</span></label>`:`<span class="bus-chk none"></span>`}
        <div class="bus-who"><b>${esc(pname(p))}</b>${p.phone?`<small><a href="tel:${esc(tel(p.phone))}">${esc(p.parent||"Parent")} ${esc(p.phone)}</a></small>`:""}</div>${seg(p,s)}</li>`;}).join("")}</ul>
    <div class="actions" style="margin:12px 0 0"><button class="btn primary" type="button" data-busact="pdf">Print bus list</button><button class="btn" type="button" data-busact="text">Copy as text</button>${ed&&(on||home)?`<button class="btn" type="button" data-busact="clear">Clear check-ins</button>`:""}</div>`:
    `<p class="help">Add your players on the <button type="button" class="linkbtn" data-goteam="roster">Roster</button> page and they'll show up here, ready to check onto the bus.</p>`}
    <div class="msg" id="busMsg"></div>
  </div>`;
}
function saveTrip(t,now){
  TRIPS[busDate]={...t,date:busDate,opponent:(awayGames().find(g=>g.date===busDate)||{}).opponent||""};
  clearTimeout(tripTimer);const iso=busDate,body=TRIPS[iso];
  const go=()=>{tripTimer=null;put("trips",iso,body);};
  if(now)go();else tripTimer=setTimeout(go,500);
}
async function syncCalendarBus(iso,time){
  if(!time||!PERM.schedule)return;
  const st=JSON.parse(JSON.stringify(team.settings||{}));st.special=st.special||[];
  const x=st.special.find(s=>s.date===iso&&s.bus);
  if(x){if(x.bus===time)return;x.bus=time;x.note="Bus departs "+ampm(time);}else st.special.push({date:iso,kind:"note",note:"Bus departs "+ampm(time),bus:time});
  try{await saveSettings(st);if(window.onCalChange)window.onCalChange();}catch{}
}
$("#tm-bus").addEventListener("click",e=>{
  const g=e.target.closest("[data-busg]");if(g){busDate=g.dataset.busg;renderBus();return;}
  if(!busDate)return;
  const t=tripFor(busDate);
  const r=e.target.closest("[data-ride]");
  if(r&&can()){t.riders[r.dataset.pid]=r.dataset.ride;if(r.dataset.ride!=="bus"){delete t.boarded[r.dataset.pid];delete t.back[r.dataset.pid];}saveTrip(t,true);renderBus();return;}
  const h=e.target.closest("[data-hc]");if(h){t.hc=h.dataset.hc;saveTrip(t,true);renderBus();return;}
  const a=e.target.closest("[data-busact]");if(!a)return;
  if(a.dataset.busact==="clear"){t.boarded={};t.back={};saveTrip(t,true);renderBus();}
  if(a.dataset.busact==="pdf")printBus(t);
  if(a.dataset.busact==="text"){const txt=busText(t);
    (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>msg($("#busMsg"),"Copied. Paste it into a text or email.","ok"),()=>msg($("#busMsg"),txt,"ok"));}
});
$("#tm-bus").addEventListener("change",e=>{
  if(!busDate)return;const t=tripFor(busDate);
  const b=e.target.closest("[data-board]");
  if(b){const k=(t.hc||"out")==="back"?"back":"boarded";if(b.checked)t[k][b.dataset.board]=true;else delete t[k][b.dataset.board];saveTrip(t,true);renderBus();return;}
  const f=e.target.closest("[data-trip]");
  if(f&&can()){t[f.dataset.trip]=f.value.trim();saveTrip(t,true);if(f.dataset.trip==="depart")syncCalendarBus(busDate,f.value);}
});
$("#tm-bus").addEventListener("input",e=>{
  const f=e.target.closest("[data-trip]");if(!f||!busDate||!can())return;
  const t=tripFor(busDate);t[f.dataset.trip]=f.value;saveTrip(t);
});
function busLines(t){
  const g=awayGames().find(x=>x.date===busDate)||{};
  return {g,riding:ROSTER.filter(p=>status(t,p)==="bus"),own:ROSTER.filter(p=>status(t,p)==="own"),out:ROSTER.filter(p=>status(t,p)==="out")};
}
function busText(t){
  const {g,riding,own,out}=busLines(t);
  return [`${team.name}: bus to ${g.opponent||"the game"}`,`${longDay(busDate)}${g.time?" · game "+hm(g.time):""}`,
    `Bus departs ${hm(t.depart)}${t.from?" from "+t.from:""}${t.return?" · back about "+hm(t.return):""}`,
    t.adults?`Riding: ${t.adults}`:"",t.notes||"","",
    `On the bus (${riding.length}):`,...riding.map(p=>"  "+pname(p)),
    own.length?`\nOwn ride (${own.length}):\n`+own.map(p=>"  "+pname(p)).join("\n"):"",
    out.length?`\nNot going (${out.length}):\n`+out.map(p=>"  "+pname(p)).join("\n"):""].filter((x,i)=>x!==""||i===5).join("\n");
}
function printBus(t){
  const {g,riding,own,out}=busLines(t),doc=pdfDoc();
  let y=pdfHead(doc,`Bus list: at ${g.opponent||"Game"}`,[team.name,(team.settings||{}).teamLabel,longDay(busDate)+(g.time?" · game "+hm(g.time):"")].filter(Boolean).join(" · "));
  doc.setFontSize(11);
  const info=[["Departs",`${hm(t.depart)}${t.from?" from "+t.from:""}`],["Back about",hm(t.return)],["Bus / driver",t.driver],["Coaches & chaperones",t.adults],["Notes",t.notes]].filter(x=>x[1]);
  info.forEach(([k,v])=>{doc.setFont("helvetica","bold");doc.text(k,40,y);doc.setFont("helvetica","normal");doc.splitTextToSize(v,400).forEach((l,i)=>doc.text(l,160,y+i*13));y+=Math.max(1,doc.splitTextToSize(v,400).length)*13+3;});
  y+=10;doc.setFont("helvetica","bold");doc.setFontSize(12);doc.text(`On the bus (${riding.length})`,40,y);
  doc.setFontSize(9);doc.text("Leaving",392,y);doc.text("Return",442,y);y+=16;
  doc.setFont("helvetica","normal");doc.setFontSize(11);
  riding.forEach((p,i)=>{
    if(y>730){doc.addPage();y=50;}
    doc.text(`${i+1}.`,40,y);doc.text(pname(p),62,y);doc.setFontSize(9);doc.setTextColor(90);doc.text([p.parent,p.phone].filter(Boolean).join(" "),232,y);doc.setTextColor(0);doc.setFontSize(11);
    doc.rect(398,y-9,11,11);doc.rect(448,y-9,11,11);
    if(t.boarded[p.id]){doc.line(400,y-4,403,y);doc.line(403,y,408,y-8);}
    if(t.back[p.id]){doc.line(450,y-4,453,y);doc.line(453,y,458,y-8);}
    y+=20;
  });
  const list=(label,arr)=>{if(!arr.length)return;y+=8;if(y>720){doc.addPage();y=50;}doc.setFont("helvetica","bold");doc.setFontSize(12);doc.text(`${label} (${arr.length})`,40,y);y+=16;
    doc.setFont("helvetica","normal");doc.setFontSize(11);doc.splitTextToSize(arr.map(pname).join(", "),520).forEach(l=>{doc.text(l,40,y);y+=14;});};
  list("Own ride",own);list("Not going",out);
  y+=10;doc.setFontSize(10);doc.setTextColor(90);doc.text(`Total on the bus: ${riding.length} players${t.adults?` + ${t.adults.split(/,| and /).filter(s=>s.trim()).length} adults`:""}`,40,Math.min(y,760));
  doc.save(`bus-${busDate}-${slug(g.opponent)}.pdf`);
}

/* ---------- game-day food sign-ups ---------- */
const FOOD_SLOTS=[{name:"Post-game snacks",count:2},{name:"Drinks / water",count:1}];
const signupURL=id=>new URL("signup.html?s="+encodeURIComponent(id)+(HOSTED?"":"&demo=1"),location.href).href;
const randId=()=>{const a=new Uint8Array(12);crypto.getRandomValues(a);return Array.from(a,b=>"abcdefghijkmnpqrstuvwxyz23456789"[b%32]).join("");};
/* Same storage calls whether the sheet lives in Supabase or (demo mode) in this browser. */
const FoodAPI=HOSTED?{
  async load(){
    const {data,error}=await sb.from("signup_boards").select("*").eq("team_id",team.id).order("created_at",{ascending:false}).limit(1);
    if(error)throw error;const board=data&&data[0]||null;let entries=[];
    if(board){const r=await sb.from("signup_entries").select("id,game_date,slot,name,contact,player,item,created_at").eq("board_id",board.id).order("created_at");if(r.error)throw r.error;entries=r.data||[];}
    return {board,entries};
  },
  async create(b){const {error}=await sb.from("signup_boards").insert({...b,team_id:team.id});if(error)throw error;},
  async update(id,patch){const {error}=await sb.from("signup_boards").update(patch).eq("id",id);if(error)throw error;},
  async remove(id){const {error}=await sb.from("signup_entries").delete().eq("id",id);if(error)throw error;}
}:{
  key:()=>`cpp:food:${team.id}`,
  read(){try{return JSON.parse(localStorage.getItem(this.key())||"null")||{board:null,entries:[]};}catch{return {board:null,entries:[]};}},
  write(v){localStorage.setItem(this.key(),JSON.stringify(v));if(v.board)localStorage.setItem("cpp:foodboard:"+v.board.id,team.id);},
  async load(){return this.read();},
  async create(b){this.write({board:{...b,active:true,skip:[],created_at:new Date().toISOString()},entries:[]});},
  async update(id,patch){const v=this.read();v.board={...v.board,...patch};this.write(v);},
  async remove(id){const v=this.read();v.entries=v.entries.filter(e=>e.id!==id);this.write(v);}
};
const foodGames=b=>(SETTINGS.games||[]).filter(g=>g.date&&(b.games==="all"||(b.games==="home")===(g.home!==false))).sort((a,c)=>a.date<c.date?-1:1);
async function loadFood(){
  try{food=await FoodAPI.load();food.err="";}catch(e){food={board:null,entries:[],err:isDbMissing(e)?"db":e.message||"Couldn't load the sign-up sheet."};}
  if(pane==="food")renderFood();
}
function slotRows(slots){
  return (slots||FOOD_SLOTS).map(s=>`<div class="fd-slot"><input data-slotname value="${esc(s.name)}" placeholder="e.g. Snacks" aria-label="What to bring"><label>Spots<input data-slotcount type="number" min="1" max="20" value="${esc(s.count)}" aria-label="How many parents"></label><button class="icon" type="button" data-fdrm aria-label="Remove">✕</button></div>`).join("");
}
function boardForm(b){
  b=b||{title:"Game-day food",games:"all",slots:FOOD_SLOTS,note:""};
  return `<form id="fdForm" class="fd-form">
    <label class="f">Sign-up title<input name="title" value="${esc(b.title)}" required></label>
    <fieldset class="catpick"><legend>Which games</legend><div class="exp-pick">${[["all","All games"],["home","Home games only"],["away","Away games only"]].map(([v,l])=>`<label><input type="radio" name="games" value="${v}"${b.games===v?" checked":""}> ${l}</label>`).join("")}</div></fieldset>
    <fieldset class="catpick"><legend>What parents sign up for, at each game</legend><div id="fdSlots">${slotRows(b.slots)}</div>
      <button class="btn" type="button" id="fdAddSlot">+ Add an item</button></fieldset>
    <label class="f">Note to parents<textarea name="note" rows="3" placeholder="e.g. Please bring enough for ${Math.max(ROSTER.length,12)} players and coaches. Drop it off with Coach before tip-off.">${esc(b.note||"")}</textarea></label>
    <div class="actions" style="margin:0"><button class="btn primary" type="submit">${food&&food.board?"Save changes":"Create the parent link"}</button></div>
  </form>`;
}
function renderFood(){
  const box=$("#tm-food");
  if(!food){box.innerHTML=`<div class="tm-card"><p class="help">Loading sign-ups…</p></div>`;loadFood();return;}
  if(food.err==="db"){box.innerHTML=DB_HELP;return;}
  if(food.err){box.innerHTML=`<div class="tm-card"><p class="msg err">${esc(food.err)}</p></div>`;return;}
  const b=food.board,ed=can();
  if(!b){box.innerHTML=`<div class="tm-card"><h3 class="tm-h">Game-day food sign-up</h3>
    <p class="help" style="margin-top:0">Make one link to send to parents. They open it on their phone, pick a game and what they'll bring, and type their name and number. No account or app. You see every sign-up here.</p>
    ${ed?boardForm():`<p class="help">Ask your head coach to set this up.</p>`}<div class="msg" id="fdMsg"></div></div>`;return;}
  const url=signupURL(b.id),today=todayISO(),games=foodGames(b),up=games.filter(g=>g.date>=today),past=games.filter(g=>g.date<today);
  const by={};food.entries.forEach(e=>{const k=(e.game_date||"").slice(0,10)+"|"+e.slot;(by[k]=by[k]||[]).push(e);});
  const open=g=>(b.slots||[]).reduce((n,s)=>n+Math.max(0,s.count-(by[g.date+"|"+s.name]||[]).length),0);
  const gameCard=g=>{const skip=(b.skip||[]).includes(g.date);
    return `<article class="fd-game${skip?" skip":""}"><header><b>${esc(longDay(g.date))}</b> <span>${g.home===false?"at":"vs"} ${esc(g.opponent||"Game")}${g.time?" · "+hm(g.time):""}</span>
      <span class="fd-open">${skip?"No sign-ups":open(g)?`${open(g)} open`:"All filled"}</span></header>
      ${skip?"":(b.slots||[]).map(s=>{const list=by[g.date+"|"+s.name]||[];
        return `<div class="fd-srow"><div class="fd-sname">${esc(s.name)} <small>${list.length} of ${s.count}</small></div><ul>${list.map(e=>`<li><b>${esc(e.name)}</b>${e.player?` <span>(${esc(e.player)})</span>`:""}${e.item?` · ${esc(e.item)}`:""}<small>${/@/.test(e.contact)?`<a href="mailto:${esc(e.contact)}">${esc(e.contact)}</a>`:`<a href="tel:${esc(tel(e.contact))}">${esc(e.contact)}</a>`}</small>${ed?`<button class="icon" type="button" data-fdx="${esc(e.id)}" aria-label="Remove ${esc(e.name)}">✕</button>`:""}</li>`).join("")}${list.length<s.count?`<li class="fd-empty">${s.count-list.length} open</li>`:""}</ul></div>`;}).join("")}
      ${ed?`<button class="linkbtn fd-skip" type="button" data-fdskip="${g.date}">${skip?"Turn sign-ups back on for this game":"No food needed for this game"}</button>`:""}</article>`;};
  const filled=food.entries.filter(e=>(e.game_date||"")>=today).length;
  box.innerHTML=`<div class="tm-card fd-link"><h3 class="tm-h">${esc(b.title)} <small>${b.active?`${filled} sign-up${filled===1?"":"s"} so far`:"Link is off"}</small></h3>
    ${b.active?`<p class="help" style="margin-top:0">Send this link to parents by text, email or your team app. They don't need an account.</p>
    <div class="fd-url"><input readonly value="${esc(url)}" id="fdUrl" aria-label="Parent sign-up link"><button class="btn primary" type="button" data-fdact="copy">Copy link</button>${navigator.share?`<button class="btn" type="button" data-fdact="share">Send…</button>`:""}<a class="btn" href="${esc(url)}" target="_blank" rel="noopener">Open</a></div>
    <div class="actions" style="margin:8px 0 0"><button class="btn" type="button" data-fdact="msg">Copy a message for parents</button></div>`:
    `<p class="help" style="margin-top:0">Parents who open the link see that sign-ups are closed. Sign-ups so far are kept.</p>`}
    ${ed?`<details class="fd-edit"><summary>Change what parents sign up for</summary>${boardForm(b)}</details>
    <div class="actions" style="margin:8px 0 0"><button class="btn${b.active?" danger":""}" type="button" data-fdact="toggle">${b.active?"Turn off the link":"Turn the link back on"}</button></div>`:""}
    <div class="msg" id="fdMsg"></div></div>
    ${up.length?up.map(gameCard).join(""):`<div class="tm-card"><p class="help">No upcoming ${b.games==="all"?"":b.games+" "}games on the calendar.</p></div>`}
    ${past.length?`<details class="fd-past"><summary>Past games (${past.length})</summary>${past.map(gameCard).join("")}</details>`:""}`;
}
function readBoardForm(f){
  const slots=[...f.querySelectorAll(".fd-slot")].map(r=>({name:r.querySelector("[data-slotname]").value.trim(),count:Math.max(1,Math.min(20,+r.querySelector("[data-slotcount]").value||1))})).filter(s=>s.name);
  const names=new Set();const uniq=slots.filter(s=>!names.has(s.name.toLowerCase())&&names.add(s.name.toLowerCase()));
  return {title:f.title.value.trim()||"Game-day food",games:(f.querySelector("[name=games]:checked")||{}).value||"all",note:f.note.value.trim(),slots:uniq};
}
$("#tm-food").addEventListener("submit",async e=>{
  e.preventDefault();const f=e.target;if(f.id!=="fdForm")return;
  const v=readBoardForm(f);if(!v.slots.length){msg($("#fdMsg"),"Add at least one thing to bring.","err");return;}
  const btn=f.querySelector("[type=submit]");btn.disabled=true;
  try{
    if(food.board)await FoodAPI.update(food.board.id,v);else await FoodAPI.create({id:randId(),...v});
    await loadFood();msg($("#fdMsg"),food.board&&food.board.title===v.title?"Saved. Parents see the change right away.":"Link ready. Copy it and send it to parents.","ok");
  }catch(err){btn.disabled=false;if(isDbMissing(err)){food.err="db";renderFood();}else msg($("#fdMsg"),err.message,"err");}
});
$("#tm-food").addEventListener("click",async e=>{
  if(e.target.id==="fdAddSlot"){$("#fdSlots").insertAdjacentHTML("beforeend",slotRows([{name:"",count:1}]));$("#fdSlots .fd-slot:last-child input").focus();return;}
  if(e.target.closest("[data-fdrm]")){const r=e.target.closest(".fd-slot");if(document.querySelectorAll("#fdSlots .fd-slot").length>1)r.remove();return;}
  const x=e.target.closest("[data-fdx]");
  if(x){if(x.dataset.armed!=="1"){x.dataset.armed="1";x.textContent="Remove?";x.classList.add("armed");return;}
    try{await FoodAPI.remove(x.dataset.fdx);await loadFood();}catch(err){msg($("#fdMsg"),err.message,"err");}return;}
  const sk=e.target.closest("[data-fdskip]");
  if(sk){const b=food.board,d=sk.dataset.fdskip,skip=(b.skip||[]).includes(d)?b.skip.filter(x=>x!==d):[...(b.skip||[]),d];
    try{await FoodAPI.update(b.id,{skip});await loadFood();}catch(err){msg($("#fdMsg"),err.message,"err");}return;}
  const a=e.target.closest("[data-fdact]");if(!a)return;
  const url=food.board?signupURL(food.board.id):"";
  const text=()=>`${food.board.title}: please sign up to bring food for one of our ${team.settings.mascot||team.name} games. It takes a minute and you don't need an account: ${url}`;
  const copy=async(t,ok)=>{try{await navigator.clipboard.writeText(t);msg($("#fdMsg"),ok,"ok");}catch{$("#fdUrl").select();msg($("#fdMsg"),"Select the link and copy it.","err");}};
  if(a.dataset.fdact==="copy")copy(url,"Link copied.");
  if(a.dataset.fdact==="msg")copy(text(),"Message copied. Paste it into a text or email to parents.");
  if(a.dataset.fdact==="share")navigator.share({title:food.board.title,text:text(),url}).catch(()=>{});
  if(a.dataset.fdact==="toggle"){
    if(food.board.active&&a.dataset.armed!=="1"){a.dataset.armed="1";a.textContent="Tap again: parents can't sign up";return;}
    try{await FoodAPI.update(food.board.id,{active:!food.board.active});await loadFood();}catch(err){msg($("#fdMsg"),err.message,"err");}
  }
});
/* Fresh sign-ups when coming back to the app. */
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&pane==="food"&&!$("#view-team").hidden)loadFood();});
})();
