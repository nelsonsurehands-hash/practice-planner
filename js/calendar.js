/* Calendar tab: the whole season month by month, built from the team's schedule in Settings
   (season dates, practice days and times, games, and special days). Laid out like the
   "8th Grade Girls Schedule" calendar: colored days, a legend, a practice-count check before
   the first game, and a game list. Tap a day to open its practice plan or change it. */
(function(){
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const ampm=t=>{if(!t)return "";const [h,m]=t.split(":").map(Number);return `${((h+11)%12)+1}:${String(m).padStart(2,"0")} ${h<12?"AM":"PM"}`;};
const span=(a,b)=>{const A=ampm(a),B=ampm(b);return A.slice(-2)===B.slice(-2)?`${A.slice(0,-3)} – ${B}`:`${A} – ${B}`;};
const longDay=iso=>dObj(iso).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
const fullDay=iso=>dObj(iso).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
const isTryout=n=>/tryout/i.test(n||""), isMeeting=n=>/meeting/i.test(n||""), isBus=n=>/^bus\b/i.test(n||"");
const editable=()=>typeof PERM!=="undefined"&&PERM.schedule;

/* Everything that happens on each date. A date can carry several marks at once. */
function buildDays(st){
  const days={};const get=iso=>days[iso]||(days[iso]={});
  const practices=computePractices(st),by=specialsByDate(st);
  practices.forEach(([iso])=>{const notes=specialNotes(by[iso]);get(iso).practice={...practiceTimes(iso,st),notes,note:notes.join(" · ")};});
  (st.games||[]).forEach(g=>{if(g.date)get(g.date).game=g;});
  Object.entries(by).forEach(([d,l])=>{
    const offs=l.filter(x=>x.kind==="off");
    if(offs.length){const names=offs.map(x=>x.note).filter(Boolean);get(d).off={note:names.filter(n=>!/^no practice$/i.test(n)).join(" · ")||names.join(" · "),list:offs};}
    const notes=specialNotes(l);if(notes.length&&!get(d).practice)get(d).tags=notes;
  });
  return {days,practices};
}
function monthsToShow(st,days){
  const all=Object.keys(days).concat([st.seasonStart,st.seasonEnd].filter(Boolean)).sort();
  if(!all.length)return [];
  const out=[];let y=+all[0].slice(0,4),m=+all[0].slice(5,7)-1;const ey=+all[all.length-1].slice(0,4),em=+all[all.length-1].slice(5,7)-1;
  while(y<ey||(y===ey&&m<=em)){out.push([y,m]);m++;if(m>11){m=0;y++;}if(out.length>24)break;}
  return out;
}
function planInfo(iso){
  const p=(typeof plans!=="undefined"&&plans[iso])||null;if(!p||!p.blocks||!p.blocks.length)return null;
  const used=p.blocks.reduce((a,b)=>a+(b.minutes||0),0),avail=Math.max(0,toMin(p.end)-toMin(p.start));
  return {used,avail};
}

function cellHTML(iso,d){
  const today=iso===todayISO();
  if(!d)return `<button type="button" class="cal-cell${today?" today":""}" data-day="${iso}"><span class="d">${+iso.slice(8)}</span></button>`;
  let cls="",body="";
  /* order: games and practices first, then team events (meetings, bus), then school labels like No School */
  const evHTML=list=>list.filter(isMeeting).map(n=>`<span class="ev meeting"><b>${esc(n.replace(/^practice\s*\+\s*/i,""))}</b></span>`).join("")+
    list.filter(isBus).map(n=>`<span class="ev bus"><b>${esc(n)}</b></span>`).join("");
  const tagsHTML=list=>list.filter(n=>!isTryout(n)&&!isMeeting(n)&&!isBus(n)).map(n=>`<span class="tag holiday">${esc(n)}</span>`).join("");
  if(d.game){
    const g=d.game;cls="game";
    body+=`${g.event?`<span class="gev">${esc(g.event)}</span>`:""}<span class="tag ${g.home===false?"away":"home"}">${g.home===false?"Away":"Home"}</span><span class="ev"><b>${g.home===false?"at ":""}${esc(g.opponent||"Game")}</b><small>${g.time?ampm(g.time):"Time TBD"}</small></span>`;
  }
  let after="";
  if(d.off&&d.off.note){const np=/^no practice$/i.test(d.off.note);cls=cls||(np?"nopr":"holiday");after+=np?`<span class="ev nopr"><b>No practice</b></span>`:`<span class="ev holiday"><b>${esc(d.off.note)}</b><small>No practice</small></span>`;}
  if(d.practice){
    const p=d.practice,tr=p.notes.some(isTryout);cls=cls||(tr?"tryout":"practice");
    body+=`<span class="ev"><b>${tr?"Tryouts":"Practice"}</b><small>${span(p.start,p.end)}</small></span>`;
    body+=evHTML(p.notes);
    const pi=planInfo(iso);if(pi)body+=`<span class="plan-dot" title="Practice plan ready (${pi.used} of ${pi.avail} min)" aria-label="Practice plan ready">P</span>`;
    after+=tagsHTML(p.notes);
  }
  if(d.tags){body+=evHTML(d.tags);after+=tagsHTML(d.tags);}
  body+=after;
  return `<button type="button" class="cal-cell ${cls}${today?" today":""}" data-day="${iso}"><span class="d">${+iso.slice(8)}</span>${body}</button>`;
}
function monthHTML(y,m,days){
  const first=new Date(y,m,1),n=new Date(y,m+1,0).getDate(),pad=first.getDay();
  const isoD=dd=>`${y}-${String(m+1).padStart(2,"0")}-${String(dd).padStart(2,"0")}`;
  let pr=0,gm=0;const offs=[];
  for(let dd=1;dd<=n;dd++){const d=days[isoD(dd)];if(!d)continue;if(d.practice)pr++;if(d.game)gm++;if(d.off&&d.off.note)offs.push([dd,d.off.note]);}
  /* group a run of days with the same name (a break) into one "Dec 21–31 (Winter Break)" */
  const runs=[];offs.forEach(([dd,t])=>{const r=runs[runs.length-1];if(r&&r.t===t)r.b=dd;else runs.push({a:dd,b:dd,t});});
  const mo=MONTHS[m].slice(0,3);
  const offTxt=runs.length?` · No practice ${runs.map(r=>`${mo} ${r.a}${r.b>r.a?"–"+r.b:""}${r.t?" ("+esc(r.t)+")":""}`).join(", ")}`:"";
  let cells="";for(let i=0;i<pad;i++)cells+=`<div class="cal-cell pad"></div>`;
  for(let dd=1;dd<=n;dd++){const iso=isoD(dd);cells+=cellHTML(iso,days[iso]);}
  const tail=(7-((pad+n)%7))%7;for(let i=0;i<tail;i++)cells+=`<div class="cal-cell pad"></div>`;
  return `<section class="cal-month" id="cal-${y}-${m+1}"><h3>${MONTHS[m]} ${y}</h3>
    <p class="sub">${pr} practice${pr===1?"":"s"} · ${gm} game${gm===1?"":"s"}${offTxt}</p>
    <div class="cal-grid">${DOW.map(x=>`<div class="dow">${x}</div>`).join("")}${cells}</div></section>`;
}

/* Switch between your teams' calendars without leaving the Calendar tab. */
function renderTeamPick(){
  const w=$("#calTeamWrap");if(typeof teams==="undefined"||teams.length<2){w.hidden=true;return;}
  const groups=new Map();teams.forEach(t=>{const st=t.settings||{},k=[st.school,st.mascot].filter(Boolean).join(" ")||t.name;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(t);});
  $("#calTeam").innerHTML=[...groups.entries()].map(([k,list])=>`<optgroup label="${esc(k)}">${list.sort((a,b)=>String((a.settings||{}).teamLabel||"").localeCompare(String((b.settings||{}).teamLabel||""),undefined,{numeric:true}))
    .map(t=>`<option value="${t.id}"${!hubOn&&t.id===team.id?" selected":""}>${esc((t.settings||{}).teamLabel||t.name)}</option>`).join("")}</optgroup>`).join("")+`<option value="__all"${hubOn?" selected":""}>📅 All my teams</option>`;
  w.hidden=false;
}
$("#calTeam").addEventListener("change",async e=>{
  if(e.target.value==="__all"){hubOn=true;try{localStorage.setItem("cpp:calHub","1");}catch{}render();return;}
  hubOn=false;try{localStorage.removeItem("cpp:calHub");}catch{}
  const t=teams.find(x=>x.id===e.target.value);if(t&&t.id!==team.id){await openTeam(t);setTab("cal");}else render();});
/* ---------- All my teams: one calendar with every team's practices and games ---------- */
let hubOn=false;try{hubOn=localStorage.getItem("cpp:calHub")==="1";}catch{}
const shortLabel=t=>{const s=t.settings||{},l=s.teamLabel||t.name||"Team";return l.replace(/\s+(girls|boys)?\s*(basketball|volleyball|soccer|football|baseball|softball)$/i,"").replace(/\s+(girls|boys)$/i,"")||l;};
function hubData(all){
  const list=[...teams].filter(t=>all||!VF.hideTeams.includes(t.id)).sort((a,b)=>String((a.settings||{}).teamLabel||a.name).localeCompare(String((b.settings||{}).teamLabel||b.name),undefined,{numeric:true}));
  return list.map(t=>({t,label:shortLabel(t),color:(t.settings||{}).color||"#5b2a86",days:all?buildDays(t.settings||{}).days:filterDays(buildDays(t.settings||{}).days)}));
}
function hubItems(H,iso){
  const groups=new Map(),add=(kind,text,h)=>{const k=kind+"|"+text;if(!groups.has(k))groups.set(k,{kind,text,teams:[]});groups.get(k).teams.push(h);};
  H.forEach(h=>{const d=h.days[iso];if(!d)return;
    if(d.game){const g=d.game;add("game",`${g.home===false?"at":"vs"} ${g.opponent||"Game"}${g.time?" "+ampm(g.time).replace(":00",""):""}`,h);}
    if(d.practice)add("practice",`Practice ${ampm(d.practice.start).replace(":00","")}`,h);
    if(d.off&&d.off.note)add("off",/^no practice$/i.test(d.off.note)?"No practice":d.off.note,h);
    (d.tags||[]).filter(n=>!isBus(n)).forEach(n=>add("note",n,h));});
  return [...groups.values()];
}
function renderHub(){
  const H=hubData(),all={};H.forEach(h=>Object.assign(all,h.days));
  const st={seasonStart:H.map(h=>(h.t.settings||{}).seasonStart).filter(Boolean).sort()[0],seasonEnd:H.map(h=>(h.t.settings||{}).seasonEnd).filter(Boolean).sort().pop()};
  const months=monthsToShow(st,all);
  $("#calEyebrow").textContent="All my teams";$("#calArrive").hidden=true;$("#calCallout").hidden=true;$("#calAddGame").hidden=!editable();
  $("#calSeason").innerHTML=`<div class="hub-key">${H.map(h=>`<span><i style="background:${esc(h.color)}"></i>${esc(h.label)}</span>`).join("")}</div>`;
  if(!months.length){$("#calMonths").innerHTML=`<div class="empty">No events on your teams yet.</div>`;$("#calGames").innerHTML="";$("#calFoot").textContent="";return;}
  const keys=months.map(([y,m])=>y+"-"+m);
  if(!calMonth||!keys.includes(calMonth)){const t=todayISO(),tk=+t.slice(0,4)+"-"+(+t.slice(5,7)-1);calMonth=keys.includes(tk)?tk:keys[0];}
  const idx=keys.indexOf(calMonth),one=calView==="month";
  document.querySelectorAll("[data-calview]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.calview===calView));
  $("#calNav").hidden=!one;$("#calNavLabel").textContent=one?`${MONTHS[months[idx][1]]} ${months[idx][0]}`:"";
  $("#calPrev").disabled=idx<=0;$("#calNext").disabled=idx>=keys.length-1;$("#calMonths").classList.toggle("one-month",one);
  const cell=iso=>{const items=hubItems(H,iso),today=iso===todayISO();
    return `<button type="button" class="cal-cell hub${today?" today":""}" data-day="${iso}"><span class="d">${+iso.slice(8)}</span>${items.map(x=>`<span class="hub-ev ${x.kind}"><span class="hub-dots">${x.teams.map(h=>`<i style="background:${esc(h.color)}" title="${esc(h.label)}"></i>`).join("")}</span><b>${esc(x.text)}</b>${x.teams.length<H.length||x.kind==="game"?`<small>${esc(x.teams.map(h=>h.label).join(", "))}</small>`:""}</span>`).join("")}</button>`;};
  $("#calMonths").innerHTML=(one?[months[idx]]:months).map(([y,m])=>{const first=new Date(y,m,1),n=new Date(y,m+1,0).getDate(),pad=first.getDay();
    const isoD=dd=>`${y}-${String(m+1).padStart(2,"0")}-${String(dd).padStart(2,"0")}`;let c="";for(let i=0;i<pad;i++)c+=`<div class="cal-cell pad"></div>`;
    for(let dd=1;dd<=n;dd++)c+=cell(isoD(dd));const tail=(7-((pad+n)%7))%7;for(let i=0;i<tail;i++)c+=`<div class="cal-cell pad"></div>`;
    return `<section class="cal-month"><h3>${MONTHS[m]} ${y}</h3><div class="cal-grid">${DOW.map(x=>`<div class="dow">${x}</div>`).join("")}${c}</div></section>`;}).join("");
  const games=[];H.forEach(h=>((h.t.settings||{}).games||[]).forEach(g=>{if(g.date)games.push({g,h});}));games.sort((a,b)=>a.g.date<b.g.date?-1:a.g.date>b.g.date?1:0);
  $("#calGames").innerHTML=games.length&&!VF.hide.game?`<caption>Game list · all teams</caption><thead><tr><th>Date</th><th>Team</th><th>Opponent</th><th>Time</th><th>Location</th></tr></thead><tbody>`+
    games.map(({g,h})=>`<tr data-day="${g.date}"><td>${longDay(g.date)}</td><td><i class="hub-dot" style="background:${esc(h.color)}"></i>${esc(h.label)}</td><td class="opp">${esc(g.opponent||"")}${g.event?`<small class="gl-ev">${esc(g.event)}</small>`:""}</td><td>${g.time?ampm(g.time):"TBD"}</td><td>${g.home===false?"Away":"Home"}${g.location?" · "+esc(g.location):""}</td></tr>`).join("")+`</tbody>`:"";
  $("#calFoot").textContent="Every team you coach, on one calendar. Tap a day to change practices for the teams you pick, or to add a game for one team.";
}

/* ---------- view filter (what you see; doesn't change anything) ---------- */
let VF={hideTeams:[],hide:{}};try{VF={hideTeams:[],hide:{},...JSON.parse(localStorage.getItem("cpp:calFilter")||"{}")};}catch{}
const saveVF=()=>{try{localStorage.setItem("cpp:calFilter",JSON.stringify(VF));}catch{}};
function filterDays(days){if(!VF.hide.practice&&!VF.hide.game&&!VF.hide.off)return days;const out={};
  Object.entries(days).forEach(([k,d])=>{const x={...d};if(VF.hide.practice)delete x.practice;if(VF.hide.game)delete x.game;if(VF.hide.off){delete x.off;delete x.tags;}if(x.practice||x.game||x.off||x.tags)out[k]=x;});return out;}
function renderFilter(){
  const el=$("#calFilter");if(!el)return;const hub=hubOn&&typeof teams!=="undefined"&&teams.length>1;
  const chip=(attr,val,on,label,dot)=>`<label class="vf-chip${on?" on":""}"><input type="checkbox" ${attr}="${esc(val)}"${on?" checked":""}>${dot?`<i class="hub-dot" style="background:${esc(dot)}"></i>`:""}<span>${esc(label)}</span></label>`;
  el.innerHTML=`<span class="vf-k">Show</span>${hub?hubData(true).map(h=>chip("data-vft",h.t.id,!VF.hideTeams.includes(h.t.id),h.label,h.color)).join(""):""}${[["practice","Practices"],["game","Games"],["off","Days off & notes"]].map(([k,l])=>chip("data-vfk",k,!VF.hide[k],l)).join("")}`;
}
document.addEventListener("change",e=>{const t=e.target;
  if(t.dataset.vft!==undefined){VF.hideTeams=t.checked?VF.hideTeams.filter(x=>x!==t.dataset.vft):[...new Set([...VF.hideTeams,t.dataset.vft])];saveVF();render();}
  if(t.dataset.vfk!==undefined){VF.hide={...VF.hide,[t.dataset.vfk]:!t.checked};saveVF();render();}});
function render(){
  renderTeamPick();renderFilter();
  if(hubOn&&typeof teams!=="undefined"&&teams.length>1){renderHub();return;}
  if(typeof SETTINGS==="undefined"||!$("#calMonths"))return;
  const st=SETTINGS,{days,practices}=buildDays(st),months=monthsToShow(st,days);
  $("#calEyebrow").textContent=[st.school&&st.mascot?st.school+" "+st.mascot:st.school||st.mascot,st.teamLabel].filter(Boolean).join(" · ");
  const fmtM=iso=>iso?`${MONTHS[+iso.slice(5,7)-1]} ${iso.slice(0,4)}`:"";
  {const a=+st.arriveEarly||0,el=$("#calArrive");if(el){el.hidden=!a;el.textContent=a?`⏰ Players arrive ${a} minutes before every practice`:"";}}
  $("#calSeason").innerHTML=st.seasonStart?`<b>${fmtM(st.seasonStart)} – ${fmtM(st.seasonEnd)}</b><small>${practices.length} practices · ${(st.games||[]).length} games</small>`:"";
  $("#calAddGame").hidden=!editable();
  if(!months.length){
    $("#calMonths").innerHTML=`<div class="empty">No schedule yet. Set your season dates and practice days below (Season &amp; practice setup), or tap + Game to add your first game.</div>`;
    $("#calCallout").hidden=true;$("#calGames").innerHTML="";$("#calFoot").textContent="";return;
  }
  $("#calCallout").hidden=true;
  const games=(st.games||[]).filter(g=>g.date).sort((a,b)=>a.date<b.date?-1:1);
  /* Month view: one month at a time with ‹ › (or swipe). Full season: every month stacked. */
  const keys=months.map(([y,m])=>y+"-"+m);
  if(!calMonth||!keys.includes(calMonth)){const t=todayISO(),tk=+t.slice(0,4)+"-"+(+t.slice(5,7)-1);calMonth=keys.includes(tk)?tk:keys[0];}
  const idx=keys.indexOf(calMonth),one=calView==="month";
  document.querySelectorAll("[data-calview]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.calview===calView));
  $("#calNav").hidden=!one;
  $("#calNavLabel").textContent=one?`${MONTHS[months[idx][1]]} ${months[idx][0]}`:"";
  $("#calPrev").disabled=idx<=0;$("#calNext").disabled=idx>=keys.length-1;
  $("#calMonths").classList.toggle("one-month",one);
  {const fd=filterDays(days);$("#calMonths").innerHTML=(one?[months[idx]]:months).map(([y,m])=>monthHTML(y,m,fd)).join("");}
  $("#calGames").innerHTML=games.length&&!VF.hide.game?`<caption>Game list</caption><thead><tr><th>Date</th><th>Opponent</th><th>Time</th><th>Location</th></tr></thead><tbody>`+
    games.map(g=>`<tr data-day="${g.date}"><td>${longDay(g.date)}</td><td class="opp">${esc(g.opponent||"")}${g.event?`<small class="gl-ev">${esc(g.event)}</small>`:""}</td><td>${g.time?ampm(g.time):"TBD"}</td><td>${g.home===false?"Away":"Home"}${g.location?" · "+esc(g.location):""}</td></tr>`).join("")+`</tbody>`:"";
  $("#calFoot").textContent=`Practices ${span(st.weekdayStart,st.weekdayEnd)} weekdays${st.weekendStart?`, ${span(st.weekendStart,st.weekendEnd)} weekends`:""}. Change the season, practice days and times below.`;
}
window.onCalChange=()=>{if(!$("#view-cal").hidden)render();};
/* Season & practice setup lives at the bottom of the Calendar tab. */
document.addEventListener("click",e=>{if(!e.target.closest("#calSetupBtn"))return;
  if(window.onSettingsTab)window.onSettingsTab();const d=$("#acc-schedule");if(d)d.open=true;$("#calSetup").scrollIntoView({behavior:"smooth",block:"start"});});
let calView="month",calMonth=null;
try{calView=localStorage.getItem("cpp:calView")||"month";}catch{}
document.querySelector(".cal-viewbar .seg").addEventListener("click",e=>{const b=e.target.closest("[data-calview]");if(!b)return;
  calView=b.dataset.calview;try{localStorage.setItem("cpp:calView",calView);}catch{}render();});
function stepMonth(dir){const [y,m]=calMonth.split("-").map(Number);const d=new Date(y,m+dir,1);const k=d.getFullYear()+"-"+d.getMonth();
  const before=calMonth;calMonth=k;render();if(calMonth===before)return;
  const el=$("#calMonths .cal-month");if(el){el.classList.add(dir>0?"slide-l":"slide-r");}}
$("#calPrev").addEventListener("click",()=>stepMonth(-1));
$("#calNext").addEventListener("click",()=>stepMonth(1));
/* swipe left/right on the month to change it */
let calSx=null,calSy=null;
$("#calMonths").addEventListener("touchstart",e=>{if(calView!=="month")return;calSx=e.touches[0].clientX;calSy=e.touches[0].clientY;},{passive:true});
$("#calMonths").addEventListener("touchend",e=>{if(calSx===null)return;const dx=e.changedTouches[0].clientX-calSx,dy=e.changedTouches[0].clientY-calSy;calSx=null;
  if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5){const b=dx<0?$("#calNext"):$("#calPrev");if(!b.disabled)stepMonth(dx<0?1:-1);}},{passive:true});
document.addEventListener("keydown",e=>{if($("#view-cal").hidden||calView!=="month"||document.querySelector("dialog[open]")||/INPUT|SELECT|TEXTAREA/.test((document.activeElement||{}).tagName||""))return;
  if(e.key==="ArrowLeft"&&!$("#calPrev").disabled)stepMonth(-1);if(e.key==="ArrowRight"&&!$("#calNext").disabled)stepMonth(1);});

/* ---------- day dialog ---------- */
let dayIso=null,lastMark=null;
let dayTeams=null;   // All my teams: the teams practice/day changes go to (null = just this team)
function openDay(iso,hub){dayIso=iso;lastMark=null;dayTeams=hub?teams.filter(canSchedule).map(t=>t.id):null;renderDay();const d=$("#dayDlg");if(!d.open)d.showModal();}
const entriesOn=(st,iso)=>(st.special||[]).filter(x=>x.date===iso);
const isRegular=(st,iso)=>(st.practiceDays||[]).includes(dObj(iso).getDay())&&!!st.seasonStart&&iso>=st.seasonStart&&iso<=st.seasonEnd&&!(st.games||[]).some(g=>g.date===iso);
/* Marks stack: check as many as apply. Unchecking removes only that mark. */
const MARKS=[
  {id:"noschool",label:"No school",cls:"holiday",test:x=>/no school/i.test(x.note||"")},
  {id:"holiday",label:"Holiday / break",cls:"holiday",test:x=>x.kind==="off"&&!/no school|^no practice$/i.test(x.note||"")},
  {id:"nopractice",label:"No practice",cls:"nopr",test:x=>x.kind==="off"&&(!x.note||/^no practice$/i.test(x.note))},
  {id:"tryout",label:"Tryouts",cls:"tryout",test:x=>/tryout/i.test(x.note||"")},
  {id:"meeting",label:"Meeting",cls:"meeting",test:x=>/meeting/i.test(x.note||"")},
  {id:"bus",label:"Bus departure",cls:"bus",test:x=>x.bus!==undefined||/^bus\b/i.test(x.note||"")},
  {id:"extra",label:"Extra practice",cls:"practice",test:x=>x.kind==="extra"&&!x.note,only:(reg,d)=>!reg&&!d.game},
];
function markValue(id,regular,st){
  switch(id){
    case "noschool":return {kind:"note",note:"No School"};
    case "holiday":return {kind:"off",note:"Holiday"};
    case "nopractice":return {kind:"off",note:"No practice"};
    case "tryout":return {kind:regular?"note":"extra",note:"Tryouts"};
    case "meeting":return {kind:"note",note:regular?"Parent meeting after practice":"Meeting"};
    case "extra":return {kind:"extra",note:""};
    case "bus":{const t=busDefault(dayIso,st);return {kind:"note",note:"Bus departs "+ampm(t),bus:t};}
  }
}
/* Bus time: 90 minutes before that day's game, or 3:00 PM if there's no game. */
function busDefault(iso,st){const g=((st||SETTINGS).games||[]).find(x=>x.date===iso);if(!g||!g.time)return "15:00";const m=Math.max(0,toMin(g.time)-90);return String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0");}
const prNoteOf=st=>{const n=String((st&&st.practiceNote)||"").trim();return /^players arrive \d+ min(ute)?s? (before|early)/i.test(n)?"":n;};
function renderDay(){
  const iso=dayIso,st=SETTINGS,{days}=buildDays(st),d=days[iso]||{},ed=editable();
  const regular=isRegular(st,iso),list=entriesOn(st,iso);
  let h=`<h2 id="dayTitle">${fullDay(iso)}</h2>`;
  /* All my teams: who's doing what today, and which teams the practice and day changes go to. */
  if(dayTeams){const H=hubData(true);
    h+=`<div class="hub-sum">${H.map(x=>{const d2=x.days[iso],l=[];
      if(d2&&d2.game){const g=d2.game;l.push(`${g.home===false?"at":"vs"} ${esc(g.opponent||"Game")} · ${g.time?ampm(g.time):"TBD"}`);}
      if(d2&&d2.practice)l.push(`Practice ${span(d2.practice.start,d2.practice.end)}`);
      if(d2&&d2.off&&d2.off.note)l.push(esc(/^no practice$/i.test(d2.off.note)?"No practice":d2.off.note));
      return `<div style="--tc:${esc(x.color)}"><b>${esc(x.label)}</b><span>${l.join(" · ")||"Nothing scheduled"}</span></div>`;}).join("")}</div>`;
    if(ed)h+=`<div class="day-link"><span>Practices and day marks for:</span>${H.filter(x=>canSchedule(x.t)).map(x=>`<label class="link-t"><input type="checkbox" data-dteam="${esc(x.t.id)}"${dayTeams.includes(x.t.id)?" checked":""}><i class="hub-dot" style="background:${esc(x.color)}"></i><span>${esc(x.label)}</span></label>`).join("")}</div>`;}
  if(ed){const marks=MARKS.filter(m=>!m.only||m.only(regular,d));
    h+=`<fieldset class="marks"><legend>Mark this day <small>(check all that apply)</small></legend>${marks.map(m=>`<label class="mark ${m.cls}"><input type="checkbox" data-mark="${m.id}"${list.some(m.test)?" checked":""}><span>${m.label}</span></label>`).join("")}</fieldset>`;
    const lm=lastMark&&MARKS.find(m=>m.id===lastMark&&list.some(m.test));
    if(lm){const end=addDays(iso,4);
      h+=`<div class="more-days ${lm.cls}"><b>Add “${esc((list.find(lm.test)||{}).note||lm.label)}” to more days</b>
        <div class="md-row"><label class="f">Through<input type="date" id="mdTo" value="${end}" min="${addDays(iso,1)}"></label>
        <button class="btn primary" type="button" data-act="mdAdd" data-mark="${lm.id}">Add to those days</button></div>
        <label class="md-opt"><input type="checkbox" id="mdOnly" checked> Only days we'd normally practice (skip weekends and games)</label>
        <p class="help" id="mdPreview"></p></div>`;}
  }
  if(dayTeams){   // every team's game this day, each editable on its own
    hubData(true).forEach(x=>{const g=((x.t.settings||{}).games||[]).find(y=>y.date===iso);if(!g)return;const can=canSchedule(x.t);
      const bus=((x.t.settings||{}).special||[]).find(y=>y.date===iso&&(y.bus!==undefined||isBus(y.note)));
      h+=`<div class="day-ev game" style="--tc:${esc(x.color)}"><small class="gev-h"><i class="hub-dot" style="background:${esc(x.color)}"></i>${esc(x.label)}${g.event?" · "+esc(g.event):""}</small><b>${g.home===false?"at ":"vs "}${esc(g.opponent||"Game")}</b><span>${g.time?ampm(g.time):"Time TBD"} · ${g.home===false?"Away":"Home"}${bus?" · "+esc(bus.note):""}</span>${g.location?`<span>📍 ${esc(g.location)}</span>`:""}${can?`<button class="btn danger day-del" type="button" data-act="delGame" data-team="${esc(x.t.id)}" data-label="Delete game">Delete game</button>`:""}</div>`;
      if(can)h+=`<details class="day-edit"><summary>Edit ${esc(x.label)}'s game</summary>${gameForm(g,x.t.id)}</details>`;});
  }else if(d.game){const g=d.game;
    h+=`<div class="day-ev game">${g.event?`<small class="gev-h">${esc(g.event)}</small>`:""}<b>${g.home===false?"at ":"vs "}${esc(g.opponent||"Game")}</b><span>${g.time?ampm(g.time):"Time TBD"} · ${g.home===false?"Away":"Home"}</span>${g.location?`<span>📍 ${esc(g.location)}</span>`:""}${ed?delBtn("delGame","Delete game"):""}</div>`;
    h+=`<div class="actions day-bus"><button class="btn" type="button" data-act="gamePlan">Gameplan</button><button class="btn" type="button" data-act="scoutRep">Scouting report</button>${g.home===false?`<button class="btn" type="button" data-act="busList">Bus list</button>`:""}</div>`;
    if(ed)h+=`<details class="day-edit"><summary>Edit this game</summary>${gameForm(g)}</details>`;
  }
  const bus=list.find(x=>x.bus!==undefined||isBus(x.note));
  if(bus)h+=`<div class="day-ev bus"><b>Bus departs</b>${ed?`<label class="f">Leaves at<input type="time" id="dpBus" value="${esc(bus.bus||"")}"></label>`:`<span>${esc(bus.note)}</span>`}</div>`;
  const noteChips=()=>{const ns=list.map((x,i)=>({x,i})).filter(o=>o.x.kind!=="off"&&o.x.note&&!isBus(o.x.note));
    return ns.length?`<div class="note-chips">${ns.map(o=>`<span class="nchip">${esc(o.x.note)}${ed?`<button type="button" class="icon" data-rmentry="${o.i}" aria-label="Remove ${esc(o.x.note)}">✕</button>`:""}</span>`).join("")}</div>`:"";};
  if(d.practice){const p=d.practice,pi=planInfo(iso);
    h+=`<div class="day-ev practice">${dayTeams?`<small class="gev-h"><i class="hub-dot" style="background:${esc((SETTINGS||{}).color||"#5b2a86")}"></i>${esc(teamShort(team))}'s practice · changes go to the checked teams</small>`:""}<b>${p.notes.some(isTryout)?"Tryouts":"Practice"}</b><span>${span(p.start,p.end)}</span>${prNoteOf(SETTINGS)?`<span class="pr-note">📌 ${esc(prNoteOf(SETTINGS))}</span>`:""}${noteChips()}
      <span>${pi?`Plan ready: ${pi.used} of ${pi.avail} minutes booked`:"No practice plan yet"}</span>${ed?delBtn("delPractice","Cancel this practice"):""}</div>
      <button class="btn primary" type="button" data-go="plan">${pi?"Open practice plan":"Plan this practice"}</button>`;
    if(ed)h+=`<details class="day-edit"><summary>Change time or add a note</summary><div class="day-form">
      <div class="grid2"><label class="f">Starts<input type="time" id="dpStart" value="${p.start}"></label><label class="f">Ends<input type="time" id="dpEnd" value="${p.end}"></label></div>
      <label class="f">Add a note<input id="dpNote" placeholder="e.g. Bring white jerseys"></label>
      ${moreDaysPicker(iso)}
      <div class="actions" style="margin:0"><button class="btn primary" type="button" data-act="savePractice" id="dpSave">Save</button></div></div></details>`;
  }
  if(d.off){
    const offs=list.map((x,i)=>({x,i})).filter(o=>o.x.kind==="off");
    h+=`<div class="day-ev ${d.off.note&&!/^no practice$/i.test(d.off.note)?"holiday":"nopr"}"><b>${esc(d.off.note||"No practice")}</b><span>No practice${regular?" (normally a practice day)":""}</span>
      ${ed?offs.filter(o=>!/^no practice$/i.test(o.x.note||"")).map(o=>`<label class="f">Name<input data-offname="${o.i}" value="${esc(o.x.note||"")}" placeholder="e.g. Thanksgiving, Winter Break"></label>`).join(""):""}
      ${ed?delBtn("restore",regular?"Remove day off (practice goes back on)":"Remove day off"):""}</div>`;
  }
  if(d.tags&&!d.practice&&d.tags.some(n=>!isBus(n)))h+=`<div class="day-ev"><b>Notes</b>${noteChips()}</div>`;
  if(!d.game&&!d.practice&&!d.off&&!d.tags)h+=`<p class="help">Nothing scheduled.</p>`;
  if(ed&&(dayTeams||!d.game))h+=`<details class="day-edit"><summary>Add a game this day</summary>${gameForm({date:iso,home:true,time:"17:30"},dayTeams?((teams.filter(canSchedule).find(t=>!((t.settings||{}).games||[]).some(y=>y.date===iso))||team).id):null)}</details>`;
  if(ed&&!d.practice&&!d.off){const t=practiceTimes(iso,st);
    h+=`<details class="day-edit"><summary>Add a practice this day</summary><div class="day-form"><div class="grid2"><label class="f">Starts<input type="time" id="dpStart" value="${t.start}"></label><label class="f">Ends<input type="time" id="dpEnd" value="${t.end}"></label></div>
      <label class="f">Add a note<input id="dpNote" placeholder="Optional"></label><div class="actions" style="margin:0"><button class="btn primary" type="button" data-act="savePractice">Add practice</button></div></div></details>`;}
  h+=`<div class="msg" id="dayMsg"></div><div class="actions" style="margin:0"><button class="btn" type="button" data-act="close">Close</button></div>`;
  $("#dayBody").innerHTML=h;mdPreview();
}
/* "Change time" for more than one practice: pick any of the coming practice days to get the same time. */
const DOWL=["Sundays","Mondays","Tuesdays","Wednesdays","Thursdays","Fridays","Saturdays"];
function moreDaysPicker(iso){
  const days=PRACTICES.map(p=>p[0]).filter(d=>d>iso).slice(0,60);
  if(!days.length)return "";
  const dow=dObj(iso).getDay();
  return `<div class="md-pick"><div class="md-head"><b>Apply to more practices</b><small id="mdCount">Just this day</small></div>
    <div class="md-quick"><button type="button" class="btn" data-mdq="dow">Every ${DOWL[dow].slice(0,-1)}</button><button type="button" class="btn" data-mdq="week">Rest of this week</button><button type="button" class="btn" data-mdq="all">All ${days.length}</button><button type="button" class="linkbtn" data-mdq="none">Clear</button></div>
    <div class="md-chips">${days.map(d=>`<label class="md-chip${dObj(d).getDay()===dow?" same":""}"><input type="checkbox" data-mdday="${d}"><span>${esc(longDay(d))}${PRACTICES.find(p=>p[0]===d)[1]?" ·":""}</span></label>`).join("")}</div></div>`;
}
function mdPicked(){return [...document.querySelectorAll("#dayBody [data-mdday]:checked")].map(x=>x.dataset.mdday);}
function mdCount(){const n=mdPicked().length,c=$("#mdCount"),b=$("#dpSave");if(c)c.textContent=n?`This day + ${n} more`:"Just this day";if(b)b.textContent=n?`Save for ${n+1} practices`:"Save";}
/* "Add to more days": every day after this one through the chosen date gets the same mark
   (with its name and times), added alongside whatever is already there. */
function mdDays(){
  const to=$("#mdTo")&&$("#mdTo").value,only=$("#mdOnly")&&$("#mdOnly").checked,st=SETTINGS,out=[];
  if(!to||to<=dayIso)return out;
  for(let d=addDays(dayIso,1),i=0;d<=to&&i<370;d=addDays(d,1),i++){if(only&&!isRegular(st,d))continue;out.push(d);}
  return out;
}
function mdPreview(){const p=$("#mdPreview");if(!p)return;const l=mdDays();
  p.textContent=l.length?`${l.length} more day${l.length>1?"s":""}: ${longDay(l[0])}${l.length>1?" to "+longDay(l[l.length-1]):""}.`:"Pick a later date.";}
$("#dayBody").addEventListener("change",e=>{
  if(e.target.dataset.dteam!==undefined){dayTeams=[...document.querySelectorAll("#dayBody [data-dteam]:checked")].map(x=>x.dataset.dteam);return;}
  if(e.target.id==="dgTbd"){const t=$("#dgTime");t.disabled=e.target.checked;if(e.target.checked)t.value="";else t.focus();return;}
  if(e.target.id==="mdTo"||e.target.id==="mdOnly"){mdPreview();return;}
  if(e.target.dataset.mdday){mdCount();return;}
  if(e.target.id==="dpBus"){const t=e.target.value;if(!t)return;
    change(st=>{const x=st.special.find(s=>s.date===dayIso&&(s.bus!==undefined||isBus(s.note)));if(x){x.bus=t;x.note="Bus departs "+ampm(t);}},"Bus time saved",[team.id]);return;}
  const c=e.target.closest("[data-mark]");if(!c||c.tagName!=="INPUT")return;
  const iso=dayIso,m=MARKS.find(x=>x.id===c.dataset.mark);
  if(!c.checked){lastMark=null;change(st=>{st.special=st.special.filter(x=>!(x.date===iso&&m.test(x)));},`${m.label} removed`);}
  else{lastMark=m.id;change(st=>{if(!st.special.some(x=>x.date===iso&&m.test(x)))st.special.push({date:iso,...markValue(m.id,isRegular(st,iso),st)});},`Marked: ${m.label}`);}
});
/* Rename a holiday or break (e.g. "Thanksgiving") right from its card. */
$("#dayBody").addEventListener("input",e=>{if(e.target.dataset.offname!==undefined)e.target.dataset.dirty="1";});
$("#dayBody").addEventListener("focusout",e=>{
  const t=e.target;if(t.dataset.offname===undefined||t.dataset.dirty!=="1")return;const v=t.value.trim();if(!v)return;
  const target=entriesOn(SETTINGS,dayIso)[+t.dataset.offname];
  change(st=>{const x=st.special.find(s=>s.date===dayIso&&s.kind==="off"&&s.note===(target&&target.note));if(x)x.note=v;},"Name saved");
});
const delBtn=(act,label)=>`<button class="btn danger day-del" type="button" data-act="${act}" data-label="${label}">${label}</button>`;
function gameForm(g,tid){
  const gt=teams.find(t=>t.id===(tid||team.id))||team,bus=((gt.settings||{}).special||[]).find(x=>x.date===g.date&&(x.bus!==undefined||isBus(x.note)));
  const teamSel=dayTeams?(tid&&g.opponent?`<input type="hidden" id="dgTeam" value="${esc(gt.id)}">`:`<label class="f">Team<select id="dgTeam">${teams.filter(canSchedule).map(t=>`<option value="${esc(t.id)}"${t.id===gt.id?" selected":""}>${esc(teamShort(t))}</option>`).join("")}</select></label>`):"";
  return `<div class="day-game" data-orig="${esc(g.date||"")}">${teamSel}<label class="f">Event or tournament <small>(optional)</small><input id="dgEvent" list="dgEventList" value="${esc(g.event||"")}" placeholder="e.g. Conference Tournament"></label><datalist id="dgEventList">${[...new Set((SETTINGS.games||[]).map(x=>x.event).filter(Boolean))].map(v=>`<option value="${esc(v)}">`).join("")}</datalist>
    <label class="f">Opponent<input id="dgOpp" value="${esc(g.opponent||"")}" placeholder="e.g. Waynesville"></label>
    <div class="grid2"><label class="f">Date<input type="date" id="dgDate" value="${esc(g.date||dayIso)}"></label><div class="f">Time<span class="tbd-wrap"><input type="time" id="dgTime" aria-label="Game time" value="${esc(g.tbd?"":g.time||"")}"${g.tbd?" disabled":""}><label class="tbd"><input type="checkbox" id="dgTbd"${g.tbd?" checked":""}> TBD</label></span></div></div>
    <label class="f">Where<select id="dgHome"><option value="1"${g.home!==false?" selected":""}>Home</option><option value="0"${g.home===false?" selected":""}>Away</option></select></label>
    <label class="f">Location <small>(optional)</small><input id="dgLoc" list="dgLocList" value="${esc(g.location||"")}" placeholder="e.g. Ozark High School, 1350 W Bluff Dr"></label><datalist id="dgLocList">${[...new Set((SETTINGS.games||[]).map(x=>x.location).filter(Boolean))].map(v=>`<option value="${esc(v)}">`).join("")}</datalist>
    <label class="f">Bus departs <small>(optional)</small><input type="time" id="dgBus" value="${esc(bus&&bus.bus||"")}"></label>
    <div class="actions" style="margin:0"><button class="btn primary" type="button" data-act="saveGame">Save game</button></div></div>`;
}
/* Save a change to this team, or on the All my teams calendar to each checked team (targets: team ids). */
async function change(fn,done,targets){
  const ids=targets||dayTeams||[team.id];
  if(!ids.length){msg($("#dayMsg"),"Check at least one team.","err");return;}
  msg($("#dayMsg"),"Saving…");
  try{
    for(const id of ids){const t=id===team.id?team:teams.find(x=>x.id===id);if(!t)continue;
      const st=JSON.parse(JSON.stringify(t.settings||{}));st.games=st.games||[];st.special=st.special||[];
      fn(st,t);await saveTeamSettings(t,st);}
    render();renderDay();msg($("#dayMsg"),(done||"Saved")+(ids.length>1?` (${ids.length} teams)`:""),"ok");
  }catch(err){msg($("#dayMsg"),"Not saved: "+(err.message||"check your connection"),"err");}
}
$("#dayBody").addEventListener("click",e=>{
  const q=e.target.closest("[data-mdq]");
  if(q){const k=q.dataset.mdq,dow=dObj(dayIso).getDay(),wkEnd=addDays(dayIso,6-dow);
    document.querySelectorAll("#dayBody [data-mdday]").forEach(x=>{const d=x.dataset.mdday;
      if(k==="none")x.checked=false;else if(k==="all")x.checked=true;else if(k==="dow"){if(dObj(d).getDay()===dow)x.checked=true;}else if(k==="week"){if(d<=wkEnd)x.checked=true;}});
    mdCount();return;}
  const b=e.target.closest("[data-act],[data-go],[data-rmentry]");if(!b)return;const iso=dayIso,st0=SETTINGS;
  if(b.dataset.go==="plan"){
    $("#dayDlg").close();setTab("plan");
    const sel=$("#planDate");if(![...sel.options].some(o=>o.value===iso))buildDateSelect();
    sel.value=iso;loadPlan(iso);if(window.onViewChange)window.onViewChange();window.scrollTo(0,0);return;
  }
  if(b.dataset.rmentry!==undefined){const x=entriesOn(st0,iso)[+b.dataset.rmentry];if(!x)return;
    change(st=>{const i=st.special.findIndex(s=>s.date===iso&&s.kind===x.kind&&s.note===x.note);if(i>=0){
      const s=st.special[i];if(s.start||s.end){s.note="";}else st.special.splice(i,1);}},"Removed");return;}
  const a=b.dataset.act;
  if(a==="close"){$("#dayDlg").close();return;}
  if(a==="gamePlan"||a==="scoutRep"){$("#dayDlg").close();window.goTeam&&window.goTeam(a==="gamePlan"?"game":"scout",{date:dayIso});return;}
  if(a==="busList"){$("#dayDlg").close();window.goTeam&&window.goTeam("bus",{date:dayIso});return;}
  if(b.classList.contains("day-del")&&b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent="Tap again to confirm";setTimeout(()=>{b.dataset.armed="";b.textContent=b.dataset.label;},3000);return;}
  const regular=isRegular(st0,iso);
  if(a==="mdAdd"){
    const m=MARKS.find(x=>x.id===b.dataset.mark),src=entriesOn(st0,iso).find(m.test),days=mdDays();
    if(!days.length){msg($("#dayMsg"),"Pick a later date.","err");return;}
    let added=0;
    change(st=>{days.forEach(d=>{if(st.special.some(x=>x.date===d&&m.test(x)))return;
      const v=src?{...src,date:d}:{date:d,...markValue(m.id,isRegular(st,d))};
      if(m.id==="tryout"&&!isRegular(st,d))v.kind="extra";
      st.special.push(v);added++;});},`Added to ${days.length} more day${days.length>1?"s":""}. Anything already on those days stays.`);
    return;
  }
  if(a==="savePractice"){
    const start=$("#dpStart").value,end=$("#dpEnd").value,note=$("#dpNote").value.trim(),more=mdPicked();
    if(start&&end&&end<=start){msg($("#dayMsg"),"The end time needs to be after the start time.","err");return;}
    /* Set one day's practice time (a custom time is kept only when it differs from the usual time for that day). */
    const setTime=(st,d,withNote)=>{
      const reg=isRegular(st,d),wk=[0,6].includes(dObj(d).getDay()),ds=wk?st.weekendStart:st.weekdayStart,de=wk?st.weekendEnd:st.weekdayEnd;
      const custom=!(start===ds&&end===de);
      st.special.filter(x=>x.date===d&&x.kind!=="off").forEach(x=>{delete x.start;delete x.end;});
      if(!reg&&!st.special.some(x=>x.date===d&&x.kind==="extra"))st.special.push({date:d,kind:"extra",note:""});
      if(custom){const host=st.special.find(x=>x.date===d&&x.kind==="extra")||st.special.find(x=>x.date===d&&x.kind==="note"&&!x.note);
        if(host)Object.assign(host,{start,end});else st.special.push({date:d,kind:"note",note:"",start,end});}
      st.special=st.special.filter(x=>!(x.date===d&&x.kind==="note"&&!x.note&&!x.start));
      if(withNote&&note)st.special.push({date:d,kind:"note",note});
    };
    change(st=>{setTime(st,iso,true);more.forEach(d=>setTime(st,d,false));},
      more.length?`Practice time saved for ${more.length+1} practices (${span(start,end)}).`:"Practice saved");
  }
  if(a==="restore")change(st=>{st.special=st.special.filter(x=>!(x.date===iso&&x.kind==="off"));},"Day off removed");
  if(a==="delPractice")change(st=>{
    if(isRegular(st,iso)){if(!st.special.some(x=>x.date===iso&&x.kind==="off"))st.special.push({date:iso,kind:"off",note:"No practice"});}
    else st.special=st.special.filter(x=>!(x.date===iso&&x.kind==="extra"));},"Practice cancelled");
  if(a==="saveGame"){
    const box=b.closest(".day-game"),orig=box.dataset.orig,date=$("#dgDate").value,opp=$("#dgOpp").value.trim();
    if(!date||!opp){msg($("#dayMsg"),"Add the opponent and date.","err");return;}
    const tbd=$("#dgTbd").checked,g={date,opponent:opp,time:tbd?"":$("#dgTime").value,home:$("#dgHome").value==="1"};
    {const ev=$("#dgEvent").value.trim(),loc=$("#dgLoc").value.trim();if(ev)g.event=ev;if(loc)g.location=loc;}
    if(tbd||!g.time)g.tbd=true;
    const tid=($("#dgTeam")||{}).value||team.id,busT=$("#dgBus").value;
    change(st=>{st.games=st.games.filter(x=>x.date!==orig&&x.date!==date);st.games.push(g);
      /* bus departure for this game: one entry per game day */
      st.special=st.special.filter(x=>!((x.date===orig||x.date===date)&&(x.bus!==undefined||isBus(x.note))));
      if(busT)st.special.push({date,kind:"note",note:"Bus departs "+ampm(busT),bus:busT});},"Game saved",[tid]);
    if(date!==iso)dayIso=date;
  }
  if(a==="delGame"){
    change(st=>{st.games=st.games.filter(x=>x.date!==iso);},"Game deleted",[b.dataset.team||team.id]);
  }
});
const dayOpen=iso=>openDay(iso,hubOn&&typeof teams!=="undefined"&&teams.length>1);
$("#calMonths").addEventListener("click",e=>{const c=e.target.closest("[data-day]");if(c)dayOpen(c.dataset.day);});
$("#calGames").addEventListener("click",e=>{const r=e.target.closest("[data-day]");if(r)dayOpen(r.dataset.day);});
$("#calAddGame").addEventListener("click",()=>{openDay(todayISO()>=(SETTINGS.seasonStart||"")?todayISO():SETTINGS.seasonStart,hubOn&&teams.length>1);const det=$("#dayBody").querySelector("details.day-edit:has(.day-game)");if(det)det.open=true;});
$("#calToday").addEventListener("click",()=>{
  const t=todayISO();
  if(calView==="month"){calMonth=+t.slice(0,4)+"-"+(+t.slice(5,7)-1);render();$("#calNav").scrollIntoView({behavior:"smooth",block:"start"});return;}
  const el=document.getElementById(`cal-${+t.slice(0,4)}-${+t.slice(5,7)}`)||$("#calMonths .cal-month");
  if(el)el.scrollIntoView({behavior:"smooth",block:"start"});
});

/* ---------- export: phone calendar (.ics), printable PDF, spreadsheet (.csv) ---------- */
$("#calIcs").addEventListener("click",()=>{$("#expMsg").textContent="";
  const box=$("#expTeams"),hub=hubOn&&teams.length>1;
  if(box){box.hidden=teams.length<2;box.innerHTML=teams.length<2?"":`<legend>Teams</legend><div class="exp-pick">${[...teams].sort((a,b)=>shortLabel(a).localeCompare(shortLabel(b),undefined,{numeric:true})).map(t=>`<label><input type="checkbox" data-expt="${esc(t.id)}"${(hub?!VF.hideTeams.includes(t.id):t.id===team.id)?" checked":""}> ${esc(shortLabel(t))}</label>`).join("")}</div>`;}
  $("#calExpDlg").showModal();});
$("#expClose").addEventListener("click",()=>$("#calExpDlg").close());
/* Export: this team, or any of your teams together (each event labeled with its team). */
function expTeams(){const boxes=[...document.querySelectorAll("#expTeams [data-expt]")];
  return boxes.length?boxes.filter(x=>x.checked).map(x=>teams.find(t=>t.id===x.dataset.expt)).filter(Boolean):[team];}
function exportEvents(){
  const pick=expTeams(),many=pick.length>1,want={p:$("#expP").checked,g:$("#expG").checked,o:$("#expO").checked,b:!$("#expB")||$("#expB").checked};
  const st=many?{...SETTINGS,teamLabel:pick.map(shortLabel).join(" & ")}:(pick[0]===team?SETTINGS:(pick[0].settings||{}));
  const team0=[st.school,st.mascot].filter(Boolean).join(" ")||"Team",ev=[];
  pick.forEach(t=>{const ts=t===team?SETTINGS:(t.settings||{}),{days}=buildDays(ts),pre=many?shortLabel(t)+": ":"";
    const bus=iso=>((ts.special||[]).find(x=>x.date===iso&&(x.bus!==undefined||isBus(x.note)))||{}).note||"";
    Object.keys(days).sort().forEach(iso=>{const d=days[iso];
      if(want.p&&d.practice)ev.push({iso,kind:"practice",tid:t.id,title:pre+(isTryout(d.practice.note)?"Tryouts":"Practice"),start:d.practice.start,end:d.practice.end,note:d.practice.note||""});
      if(want.g&&d.game)ev.push({iso,kind:"game",tid:t.id,title:pre+`${d.game.home===false?"at":"vs"} ${d.game.opponent||"Game"}`,start:d.game.time,end:d.game.time?plus(d.game.time,90):"",note:[d.game.event,d.game.home===false?"Away":"Home",d.game.location,want.b?bus(iso):""].filter(Boolean).join(" · ")});
      if(want.o&&d.off&&d.off.note)ev.push({iso,kind:"off",tid:t.id,title:pre+d.off.note,note:"No practice"});
    });});
  ev.sort((a,b)=>a.iso<b.iso?-1:a.iso>b.iso?1:(a.start||"")<(b.start||"")?-1:1);
  const slug=team0.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"team";
  return {st,ev,team0,slug};
}
const plus=(t,m)=>{const x=toMin(t)+m;return String(Math.floor(x/60)%24).padStart(2,"0")+":"+String(x%60).padStart(2,"0");};
$("#calExpDlg").addEventListener("click",async e=>{
  const b=e.target.closest("[data-exp]");if(!b)return;
  const {st,ev,team0,slug}=exportEvents();
  if(!ev.length){msg($("#expMsg"),expTeams().length?"Pick at least one kind of event to export.":"Pick at least one team.","err");return;}
  const kind=b.dataset.exp;msg($("#expMsg"),"Building…");
  try{
    if(kind==="ics"){
      const stamp=new Date().toISOString().replace(/[-:]/g,"").slice(0,15)+"Z";
      const dt=(iso,t)=>iso.replace(/-/g,"")+"T"+t.replace(":","")+"00",dd=iso=>iso.replace(/-/g,"");
      const escI=x=>String(x||"").replace(/[\\;,]/g,m=>"\\"+m).replace(/\n/g,"\\n");
      const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Practice Planner//EN","CALSCALE:GREGORIAN",`X-WR-CALNAME:${escI(team0)}`];
      ev.forEach(x=>{
        lines.push("BEGIN:VEVENT",`UID:${x.kind}-${x.iso}-${x.tid||(team&&team.id)||"team"}@practice-planner`,`DTSTAMP:${stamp}`);
        if(x.start)lines.push(`DTSTART:${dt(x.iso,x.start)}`,`DTEND:${dt(x.iso,x.end||plus(x.start,60))}`);
        else lines.push(`DTSTART;VALUE=DATE:${dd(x.iso)}`,`DTEND;VALUE=DATE:${dd(addDays(x.iso,1))}`);
        lines.push(`SUMMARY:${escI(team0+" "+x.title.replace(/^Practice$/,"practice").replace(/^Tryouts$/,"tryouts"))}`);
        if(x.note)lines.push(`DESCRIPTION:${escI(x.note)}`);
        lines.push("END:VEVENT");
      });
      lines.push("END:VCALENDAR");
      await saveFile(`${slug}-schedule.ics`,new Blob([lines.join("\r\n")],{type:"text/calendar"}));
      msg($("#expMsg"),`Saved ${ev.length} events. Open the file on your phone to add them to your calendar.`,"ok");
    }
    if(kind==="csv"){
      const q=v=>/[",\n]/.test(v)?`"${String(v).replace(/"/g,'""')}"`:String(v);
      const rows=[["Date","Day","Event","Start","End","Notes"],...ev.map(x=>[x.iso,DOW[dObj(x.iso).getDay()],x.title,x.start?ampm(x.start):"",x.end?ampm(x.end):"",x.note])];
      await saveFile(`${slug}-schedule.csv`,new Blob([rows.map(r=>r.map(q).join(",")).join("\r\n")],{type:"text/csv"}));
      msg($("#expMsg"),`Saved ${ev.length} events as a spreadsheet.`,"ok");
    }
    if(kind==="pdf"){
      if(!window.jspdf){msg($("#expMsg"),"The PDF tool didn't load. Check your connection and try again.","err");return;}
      await saveFile(`${slug}-calendar.pdf`,calendarPdf(st,ev,team0).output("blob"));
      msg($("#expMsg"),"Saved a printable calendar, one month per page.","ok");
    }
  }catch(err){msg($("#expMsg"),"Couldn't export: "+(err.message||err),"err");}
});
/* Black-and-white month grids, one month per landscape page, plus a game list. */
function calendarPdf(st,ev,team0){
  const {jsPDF}=window.jspdf,doc=new jsPDF({unit:"pt",format:"letter",orientation:"landscape"});
  const W=792,H=612,M=32,byDay={};ev.forEach(x=>(byDay[x.iso]=byDay[x.iso]||[]).push(x));
  const isos=ev.map(x=>x.iso).sort();let y0=+isos[0].slice(0,4),m0=+isos[0].slice(5,7)-1;const y1=+isos[isos.length-1].slice(0,4),m1=+isos[isos.length-1].slice(5,7)-1;
  const label=[team0,st.teamLabel].filter(Boolean).join("  |  ").toUpperCase();let first=true;
  for(let y=y0,m=m0;y<y1||(y===y1&&m<=m1);m===11?(m=0,y++):m++){
    if(!first)doc.addPage();first=false;
    doc.setTextColor(0);doc.setFont("helvetica","bold");doc.setFontSize(9);doc.text(label,M,M);
    doc.setFontSize(24);doc.text(`${MONTHS[m].toUpperCase()} ${y}`,M,M+26);
    const top=M+40,cw=(W-2*M)/7,first0=new Date(y,m,1).getDay(),n=new Date(y,m+1,0).getDate(),rows=Math.ceil((first0+n)/7),ch=(H-top-M-14)/rows;
    doc.setFillColor(0);doc.rect(M,top,W-2*M,14,"F");doc.setTextColor(255);doc.setFontSize(8);
    DOW.forEach((d,i)=>doc.text(d.toUpperCase(),M+i*cw+cw/2,top+10,{align:"center"}));doc.setTextColor(0);
    doc.setDrawColor(0);doc.setLineWidth(.6);
    for(let i=0;i<rows*7;i++){
      const x=M+(i%7)*cw,yy=top+14+Math.floor(i/7)*ch,dd=i-first0+1;
      const iso=`${y}-${String(m+1).padStart(2,"0")}-${String(dd).padStart(2,"0")}`,list=dd>=1&&dd<=n?byDay[iso]||[]:[];
      if(list.some(e=>e.kind==="game")){doc.setFillColor(225);doc.rect(x,yy,cw,ch,"F");}
      doc.rect(x,yy,cw,ch);
      if(dd<1||dd>n)continue;
      doc.setFont("helvetica","bold");doc.setFontSize(9);doc.text(String(dd),x+4,yy+11);
      let ty=yy+23;
      list.forEach(e=>{
        doc.setFont("helvetica",e.kind==="off"?"italic":"bold");doc.setFontSize(8);
        const t=doc.splitTextToSize(e.title,cw-8);doc.text(t,x+4,ty);ty+=t.length*9;
        doc.setFont("helvetica","normal");doc.setFontSize(7.5);
        const sub=e.kind==="practice"?span(e.start,e.end)+(e.note&&!isTryout(e.note)?" · "+e.note:""):e.kind==="game"?[ampm(e.start),e.note].filter(Boolean).join(" · "):"No practice";
        if(sub){const s2=doc.splitTextToSize(sub,cw-8);doc.text(s2,x+4,ty);ty+=s2.length*8.5+2;}
      });
    }
  }
  const games=ev.filter(e=>e.kind==="game");
  if(games.length){
    doc.addPage();doc.setFont("helvetica","bold");doc.setFontSize(9);doc.text(label,M,M);doc.setFontSize(22);doc.text("GAME LIST",M,M+26);
    let y=M+50;const cols=[M,M+130,M+430,M+530];doc.setFontSize(9);["DATE","OPPONENT","TIME","LOCATION"].forEach((h,i)=>doc.text(h,cols[i],y));
    y+=6;doc.setLineWidth(1.5);doc.line(M,y,W-M,y);y+=16;doc.setLineWidth(.5);
    games.forEach(g=>{doc.setFont("helvetica","normal");doc.setFontSize(10.5);doc.text(longDay(g.iso),cols[0],y);doc.setFont("helvetica","bold");doc.text(g.title.replace(/^(vs|at) /,""),cols[1],y);
      doc.setFont("helvetica","normal");doc.text(ampm(g.start),cols[2],y);doc.text(g.note,cols[3],y);y+=7;doc.line(M,y,W-M,y);y+=15;if(y>H-M){doc.addPage();y=M;}});
  }
  return doc;
}
})();
