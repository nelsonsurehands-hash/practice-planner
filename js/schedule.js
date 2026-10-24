/* Parents' team calendar. Opened from a link like schedule.html?c=abc123…
   No account: the page reads the schedule through the public get_calendar function every time
   it opens (and again when the phone comes back to it), so it always shows the coach's latest.
   Parents can also subscribe in their phone's calendar app through the calendar-feed function.
   In demo mode (&demo=1) it reads the team saved in this browser. */
(function(){
const $=q=>document.querySelector(q);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const params=new URLSearchParams(location.search),ID=params.get("c")||"",DEMO=params.get("demo")==="1";
const CFG=window.APP_CONFIG||{},S=window.SchedCore;
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const ampm=t=>{if(!t)return "";const [h,m]=t.split(":").map(Number);return `${((h+11)%12)+1}:${String(m).padStart(2,"0")} ${h<12?"AM":"PM"}`;};
const span=(a,b)=>{const A=ampm(a),B=ampm(b);return A.slice(-2)===B.slice(-2)?`${A.slice(0,-3)} – ${B}`:`${A} – ${B}`;};
const longDay=s=>S.dObj(s).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
const todayISO=()=>S.isoOf(new Date());
const FEED=CFG.supabaseUrl&&!DEMO?`${CFG.supabaseUrl.replace(/\/$/,"")}/functions/v1/calendar-feed?c=${encodeURIComponent(ID)}`:"";
const pref=(k,v)=>{try{if(v===undefined)return localStorage.getItem("cpp:sched:"+k);localStorage.setItem("cpp:sched:"+k,v);}catch{return null;}};
let CAL=null,DAYS=[],filter=pref("f")||"all",view=pref("v")||"list",showPast=false,month=null,selDay=null,feedOK=null;

/* ---------- where the calendar lives ---------- */
let api;
if(DEMO){
  api={async get(){
    let teamId=null,share=null,t=null;
    try{teamId=localStorage.getItem("cpp:calshareTeam:"+ID);share=JSON.parse(localStorage.getItem("cpp:calshare:"+teamId)||"null");
      t=(JSON.parse(localStorage.getItem("cpp:demoTeams")||"[]")).find(x=>x.id===teamId);}catch{}
    if(!share||share.id!==ID||!share.active||!t)return null;const st=t.settings||{};
    return {title:share.title||"",show:share.show,team:{name:t.name,color:st.color,color2:st.color2,logo:st.logo,school:st.school,mascot:st.mascot,teamLabel:st.teamLabel},schedule:st};
  }};
}else{
  const sb=CFG.supabaseUrl&&window.supabase?window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey,{auth:{persistSession:false}}):null;
  api={async get(){if(!sb)throw new Error("not set up");const {data,error}=await sb.rpc("get_calendar",{p_id:ID});if(error)throw error;return data;}};
}

function fail(text){$("#scLoading").hidden=true;$("#scApp").hidden=true;$("#scError").hidden=false;$("#scError").textContent=text;}
function ink(hex){const m=/^#?([0-9a-f]{6})$/i.exec(hex||"");if(!m)return "#ffffff";const n=parseInt(m[1],16);
  const L=[n>>16&255,n>>8&255,n&255].map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});
  return .2126*L[0]+.7152*L[1]+.0722*L[2]>.4?"#17141c":"#ffffff";}
const teamName=()=>{const t=CAL.team||{};return [t.school&&t.mascot?`${t.school} ${t.mascot}`:t.name,t.teamLabel].filter(Boolean).join(" ");};

async function load(quiet){
  let c;try{c=await api.get();}catch{if(!quiet)fail("Couldn't load the schedule. Check your connection and try again.");return;}
  if(!c){fail("This calendar link is off or wrong. Ask your coach for the current link.");return;}
  CAL=c;const show=CAL.show||{};
  DAYS=S.days(CAL.schedule||{}).map(d=>({...d,
    game:show.games===false?null:d.game,practice:show.practices===false?null:d.practice,off:show.off===false?null:d.off,notes:show.off===false&&!d.game?[]:d.notes}))
    .filter(d=>d.game||d.practice||d.off||d.notes.length);
  const t=CAL.team||{},root=document.documentElement;
  root.style.setProperty("--team",t.color||"#5b2a86");root.style.setProperty("--team-ink",ink(t.color));
  if(t.color2){root.style.setProperty("--team2",t.color2);root.classList.add("has-c2");}
  const tc=document.querySelector('meta[name="theme-color"]');if(tc)tc.content=t.color||"#5b2a86";
  document.title=`${CAL.title||"Schedule"} · ${t.mascot||t.name||"Team"}`;
  $("#scEyebrow").textContent=[t.school&&t.mascot?`${t.school} ${t.mascot}`:t.name,t.teamLabel].filter(Boolean).join(" · ");
  $("#scTitle").textContent=CAL.title||"Schedule";
  if(t.logo){$("#scLogo").src=t.logo;$("#scLogo").hidden=false;}
  $("#scDemo").hidden=!DEMO;
  $("#scChecked").textContent=`Checked ${new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}.`;
  render();
  $("#scLoading").hidden=true;$("#scError").hidden=true;$("#scApp").hidden=false;
}

/* ---------- pieces ---------- */
const isTry=p=>/tryout/i.test((p.notes||[]).join(" "));
function events(d){
  const out=[];
  if(d.game&&filter!=="practice"){const g=d.game;out.push(`<div class="sc-e"><span class="sc-pill ${g.home?"p-game":"p-away"}">${g.home?"Home":"Away"}</span><b>${g.home?"vs":"at"} ${esc(g.opponent||"Game")}</b>${g.time?`<small>${ampm(g.time)}</small>`:""}${g.location?`<small>${esc(g.location)}</small>`:""}</div>`);}
  if(d.practice&&filter!=="games"){const p=d.practice;out.push(`<div class="sc-e"><span class="sc-pill p-prac">${isTry(p)?"Tryouts":"Practice"}</span><b>${span(p.start,p.end)}</b>${p.notes.filter(n=>!/tryout/i.test(n)).map(n=>`<small>${esc(n)}</small>`).join("")}</div>`);}
  if(filter==="all"){
    if(d.off)out.push(`<div class="sc-e"><span class="sc-pill p-off">No practice</span>${d.off.note&&d.off.note!=="No practice"?`<b>${esc(d.off.note)}</b>`:""}</div>`);
    d.notes.forEach(n=>out.push(`<div class="sc-e"><span class="sc-pill p-note">Note</span><b>${esc(n)}</b></div>`));
  }else if(d.game&&filter==="games")d.notes.forEach(n=>out.push(`<div class="sc-e"><small>${esc(n)}</small></div>`));
  return out;
}
const visible=()=>DAYS.filter(d=>events(d).length);

function renderNext(){
  const t=todayISO(),nowMin=new Date().getHours()*60+new Date().getMinutes();
  const upcoming=d=>d.date>t||(d.date===t);
  const ng=DAYS.find(d=>d.game&&upcoming(d)),np=DAYS.find(d=>d.practice&&upcoming(d)&&!(d.date===t&&(+d.practice.end.slice(0,2)*60+ +d.practice.end.slice(3))<nowMin));
  const when=d=>d.date===t?"Today":d.date===S.addDays(t,1)?"Tomorrow":longDay(d.date);
  const cards=[];
  if(ng)cards.push(`<div class="sc-nx game"><small>Next game · ${esc(when(ng))}</small><b>${ng.game.home?"vs":"at"} ${esc(ng.game.opponent||"Game")}</b><span>${[ng.game.time&&ampm(ng.game.time),ng.game.home?"Home":"Away",ng.game.location].filter(Boolean).map(esc).join(" · ")}${ng.notes.length?`<br>${esc(ng.notes.join(" · "))}`:""}</span></div>`);
  if(np)cards.push(`<div class="sc-nx"><small>Next practice · ${esc(when(np))}</small><b>${isTry(np.practice)?"Tryouts":"Practice"}</b><span>${span(np.practice.start,np.practice.end)}${np.practice.notes.length?` · ${esc(np.practice.notes.join(" · "))}`:""}</span></div>`);
  $("#scNext").innerHTML=cards.join("");$("#scNext").hidden=!cards.length;
}
function renderCalButtons(){
  const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  const btns=[];
  if(feedOK){const web=FEED.replace(/^https?:/,"webcal:");
    btns.push(`<a class="btn primary" href="${esc(web)}">📅 Subscribe in my calendar</a>`);
    btns.push(`<a class="btn" href="https://calendar.google.com/calendar/r?cid=${encodeURIComponent(web)}" target="_blank" rel="noopener">Google Calendar</a>`);
    $("#scCalHelp").textContent=ios?"Subscribe once and the team schedule stays in your iPhone's Calendar app. When the coach changes something, it updates on its own.":
      "Subscribe once and the schedule stays in your calendar app and updates on its own. On Android, use Google Calendar.";
  }else{
    btns.push(`<button class="btn" type="button" id="scIcs">📅 Add to my calendar</button>`);
    $("#scCalHelp").textContent="That adds today's copy of the schedule. For changes, check back on this page: it's always current. Tip: add this page to your Home Screen.";
  }
  $("#scCal").innerHTML=btns.join("");
}
function renderList(){
  const t=todayISO(),list=visible(),past=list.filter(d=>d.date<t),rest=list.filter(d=>d.date>=t);
  if(!list.length)return `<div class="sc-empty" style="margin-top:0">Nothing on the schedule yet.</div>`;
  const show=showPast||!rest.length?list:rest;let html="",cur="";
  if(past.length&&rest.length)html+=`<button class="btn sc-earlier" type="button" id="scPast">${showPast?"Hide":"Show"} earlier dates (${past.length})</button>`;
  show.forEach(d=>{const dt=S.dObj(d.date),m=MONTHS[dt.getMonth()]+" "+dt.getFullYear();
    if(m!==cur){cur=m;html+=`<h2 class="sc-month">${m}</h2>`;}
    html+=`<article class="sc-day${d.date===t?" today":""}${d.date<t?" past":""}${d.game&&filter!=="practice"?" has-game":""}" id="d-${d.date}">
      <div class="sc-date"><small>${S.DOW[dt.getDay()]}</small><b>${dt.getDate()}</b></div><div class="sc-ev">${events(d).join("")}</div></article>`;});
  return html;
}
function renderMonth(){
  const list=visible(),by=Object.fromEntries(list.map(d=>[d.date,d])),t=todayISO();
  if(!month){const first=list.find(d=>d.date>=t)||list[list.length-1];const base=first?S.dObj(first.date):new Date();month=[base.getFullYear(),base.getMonth()];}
  const [y,m]=month,start=new Date(y,m,1).getDay(),n=new Date(y,m+1,0).getDate();
  let cells=S.DOW.map(d=>`<div class="h">${d.slice(0,2)}</div>`).join("");
  for(let i=0;i<start;i++)cells+=`<div class="sc-c blank"></div>`;
  for(let day=1;day<=n;day++){const iso=S.isoOf(new Date(y,m,day)),d=by[iso];
    let tags="";if(d){if(d.game&&filter!=="practice")tags+=`<i class="g">${d.game.home?"vs":"@"} ${esc(d.game.opponent||"Game")}</i>`;
      if(d.practice&&filter!=="games")tags+=`<i class="p">${isTry(d.practice)?"Tryouts":ampm(d.practice.start).replace(/:00| [AP]M/g,"")}</i>`;
      if(filter==="all"&&d.off)tags+=`<i class="o">Off</i>`;
      if(filter==="all"&&!d.game&&!d.practice&&!d.off&&d.notes.length)tags+=`<i class="o">${esc(d.notes[0])}</i>`;}
    cells+=`<button type="button" class="sc-c${iso===t?" today":""}${iso===selDay?" sel":""}" data-day="${iso}" aria-label="${esc(longDay(iso))}"><span class="n">${day}</span>${tags}</button>`;}
  const pick=selDay&&by[selDay]?`<article class="sc-day sc-pick${by[selDay].game?" has-game":""}"><div class="sc-date"><small>${S.DOW[S.dObj(selDay).getDay()]}</small><b>${+selDay.slice(8)}</b></div><div class="sc-ev">${events(by[selDay]).join("")||`<small>Nothing scheduled.</small>`}</div></article>`:
    `<p class="help sc-pick">Tap a day for details.</p>`;
  return `<div class="sc-mnav"><button class="btn" type="button" data-mv="-1" aria-label="Previous month">‹</button><b>${MONTHS[m]} ${y}</b><button class="btn" type="button" data-mv="1" aria-label="Next month">›</button></div>
    <div class="sc-grid">${cells}</div>${pick}`;
}
function render(){
  renderNext();renderCalButtons();
  document.querySelectorAll("[data-f]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.f===filter)));
  document.querySelectorAll("[data-v]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.v===view)));
  $("#scBody").innerHTML=view==="month"?renderMonth():renderList();
}

/* ---------- actions ---------- */
document.addEventListener("click",e=>{
  const f=e.target.closest("[data-f]");if(f){filter=f.dataset.f;pref("f",filter);render();return;}
  const v=e.target.closest("[data-v]");if(v){view=v.dataset.v;pref("v",view);render();return;}
  if(e.target.closest("#scPast")){showPast=!showPast;render();return;}
  const mv=e.target.closest("[data-mv]");if(mv){let [y,m]=month;m+=+mv.dataset.mv;if(m<0){m=11;y--;}if(m>11){m=0;y++;}month=[y,m];selDay=null;render();return;}
  const d=e.target.closest("[data-day]");if(d){selDay=d.dataset.day;render();return;}
  if(e.target.closest("#scIcs")){
    const text=S.ics(DAYS,{show:CAL.show,team:teamName(),key:ID});
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type:"text/calendar"}));a.download="team-schedule.ics";document.body.appendChild(a);a.click();a.remove();
  }
});
/* Back on this page after a while: get the latest. */
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&CAL)load(true);});
setInterval(()=>{if(document.visibilityState==="visible"&&CAL)load(true);},5*60*1000);

if(!ID){fail("This calendar link is missing its code. Ask your coach for the link again.");return;}
load();
/* The phone-calendar subscription works once the coach has set up the calendar-feed function. */
if(FEED)fetch(FEED,{method:"GET"}).then(r=>r.ok?r.text():"").then(t=>{feedOK=/^BEGIN:VCALENDAR/.test(t);if(CAL)renderCalButtons();}).catch(()=>{});
})();
