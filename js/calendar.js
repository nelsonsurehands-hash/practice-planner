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
const isTryout=n=>/tryout/i.test(n||""), isMeeting=n=>/meeting/i.test(n||"");
const editable=()=>typeof team!=="undefined"&&team&&canEdit(team);

/* Everything that happens on each date. */
function buildDays(st){
  const days={};const get=iso=>days[iso]||(days[iso]={});
  const practices=computePractices(st);
  practices.forEach(([iso])=>{const sp=(st.special||[]).find(x=>x.date===iso);const t=practiceTimes(iso,st);get(iso).practice={...t,note:sp&&sp.kind!=="off"?sp.note||"":""};});
  (st.games||[]).forEach(g=>{if(g.date)get(g.date).game=g;});
  (st.special||[]).forEach(x=>{if(!x.date)return;if(x.kind==="off")get(x.date).off=x;else if(!get(x.date).practice)get(x.date).note=x;});
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
  if(d.game){
    const g=d.game;cls="game";
    body+=`<span class="tag ${g.home===false?"away":"home"}">${g.home===false?"Away":"Home"}</span><span class="ev"><b>${g.home===false?"at ":""}${esc(g.opponent||"Game")}</b><small>${ampm(g.time)}</small></span>`;
  }
  if(d.off){cls=cls||"holiday";body+=`<span class="ev holiday"><b>${esc(d.off.note||"No practice")}</b><small>No practice</small></span>`;}
  if(d.practice){
    const p=d.practice,tr=isTryout(p.note);cls=cls||(tr?"tryout":"practice");
    if(p.note&&!tr&&!isMeeting(p.note))body+=`<span class="tag holiday">${esc(p.note)}</span>`;
    body+=`<span class="ev"><b>${tr?"Tryouts":"Practice"}</b><small>${span(p.start,p.end)}</small></span>`;
    if(isMeeting(p.note))body+=`<span class="ev meeting"><b>${esc(p.note.replace(/^practice\s*\+\s*/i,""))}</b></span>`;
    const pi=planInfo(iso);if(pi)body+=`<span class="plan-dot" title="Practice plan ready">Plan ${pi.used}/${pi.avail}</span>`;
  }
  if(d.note&&!d.practice&&!d.off)body+=`<span class="ev"><b>${esc(d.note.note||"")}</b></span>`;
  return `<button type="button" class="cal-cell ${cls}${today?" today":""}" data-day="${iso}"><span class="d">${+iso.slice(8)}</span>${body}</button>`;
}
function monthHTML(y,m,days){
  const first=new Date(y,m,1),n=new Date(y,m+1,0).getDate(),pad=first.getDay();
  const isoD=dd=>`${y}-${String(m+1).padStart(2,"0")}-${String(dd).padStart(2,"0")}`;
  let pr=0,gm=0;const offs=[];
  for(let dd=1;dd<=n;dd++){const d=days[isoD(dd)];if(!d)continue;if(d.practice)pr++;if(d.game)gm++;if(d.off)offs.push([dd,d.off.note]);}
  const offTxt=offs.length?` · No practice ${offs.map(([dd,t])=>`${MONTHS[m].slice(0,3)} ${dd}${t?" ("+esc(t)+")":""}`).join(", ")}`:"";
  let cells="";for(let i=0;i<pad;i++)cells+=`<div class="cal-cell pad"></div>`;
  for(let dd=1;dd<=n;dd++){const iso=isoD(dd);cells+=cellHTML(iso,days[iso]);}
  const tail=(7-((pad+n)%7))%7;for(let i=0;i<tail;i++)cells+=`<div class="cal-cell pad"></div>`;
  return `<section class="cal-month" id="cal-${y}-${m+1}"><h3>${MONTHS[m]} ${y}</h3>
    <p class="sub">${pr} practice${pr===1?"":"s"} · ${gm} game${gm===1?"":"s"}${offTxt}</p>
    <div class="cal-grid">${DOW.map(x=>`<div class="dow">${x}</div>`).join("")}${cells}</div></section>`;
}

function render(){
  if(typeof SETTINGS==="undefined"||!$("#calMonths"))return;
  const st=SETTINGS,{days,practices}=buildDays(st),months=monthsToShow(st,days);
  $("#calEyebrow").textContent=[st.school&&st.mascot?st.school+" "+st.mascot:st.school||st.mascot,st.teamLabel].filter(Boolean).join(" · ");
  const fmtM=iso=>iso?`${MONTHS[+iso.slice(5,7)-1]} ${iso.slice(0,4)}`:"";
  $("#calSeason").innerHTML=st.seasonStart?`<b>${fmtM(st.seasonStart)} – ${fmtM(st.seasonEnd)}</b><small>${practices.length} practices · ${(st.games||[]).length} games</small>`:"";
  $("#calAddGame").hidden=!editable();
  if(!months.length){
    $("#calMonths").innerHTML=`<div class="empty">No schedule yet. Set your season dates and practice days in Settings, or tap + Game to add your first game.</div>`;
    $("#calCallout").hidden=true;$("#calGames").innerHTML="";$("#calFoot").textContent="";return;
  }
  /* practice count before the first game */
  const games=(st.games||[]).filter(g=>g.date).sort((a,b)=>a.date<b.date?-1:1),g1=games[0];
  if(g1){
    const before=practices.filter(([iso])=>iso<g1.date).length,need=+st.minPractices||0;
    const where=`${longDay(g1.date)} ${g1.home===false?"at":"vs"} ${esc(g1.opponent||"first opponent")}`;
    $("#calCallout").hidden=false;$("#calCallout").classList.toggle("short",!!need&&before<need);
    $("#calCallout").innerHTML=need?`<span class="mark">${before>=need?"✓":"!"}</span><span><b>Each player needs ${need} practices</b> before the first game (${where}). ${before} practice${before===1?" is":"s are"} scheduled before then${before>=need?", so this calendar meets the requirement.":`. That's ${need-before} short.`}</span>`
      :`<span class="mark">${before}</span><span><b>${before} practice${before===1?"":"s"}</b> before the first game (${where}). Set a required number in Settings → Season to have it checked.</span>`;
  }else $("#calCallout").hidden=true;
  $("#calMonths").innerHTML=months.map(([y,m])=>monthHTML(y,m,days)).join("");
  $("#calGames").innerHTML=games.length?`<caption>Game list</caption><thead><tr><th>Date</th><th>Opponent</th><th>Time</th><th>Location</th></tr></thead><tbody>`+
    games.map(g=>`<tr data-day="${g.date}"><td>${longDay(g.date)}</td><td class="opp">${esc(g.opponent||"")}</td><td>${ampm(g.time)}</td><td>${g.home===false?"Away":"Home"}</td></tr>`).join("")+`</tbody>`:"";
  $("#calFoot").textContent=`Practices ${span(st.weekdayStart,st.weekdayEnd)} weekdays${st.weekendStart?`, ${span(st.weekendStart,st.weekendEnd)} weekends`:""}. Change the season, practice days and times in Settings.`;
}
window.onCalChange=()=>{if(!$("#view-cal").hidden)render();};

/* ---------- day dialog ---------- */
let dayIso=null;
function openDay(iso){dayIso=iso;renderDay();const d=$("#dayDlg");if(!d.open)d.showModal();}
function renderDay(){
  const iso=dayIso,st=SETTINGS,{days}=buildDays(st),d=days[iso]||{},ed=editable();
  const regular=(st.practiceDays||[]).includes(dObj(iso).getDay())&&st.seasonStart&&iso>=st.seasonStart&&iso<=st.seasonEnd;
  const sp=(st.special||[]).find(x=>x.date===iso);
  let h=`<h2 id="dayTitle">${fullDay(iso)}</h2>`;
  if(d.game){const g=d.game;
    h+=`<div class="day-ev game"><b>${g.home===false?"at ":"vs "}${esc(g.opponent||"Game")}</b><span>${ampm(g.time)} · ${g.home===false?"Away":"Home"}</span></div>`;
    if(ed)h+=`<details class="day-edit"><summary>Edit this game</summary>${gameForm(g)}</details>`;
  }
  if(d.practice){const p=d.practice,pi=planInfo(iso);
    h+=`<div class="day-ev practice"><b>${isTryout(p.note)?"Tryouts":"Practice"}</b><span>${span(p.start,p.end)}${p.note?" · "+esc(p.note):""}</span>
      <span>${pi?`Plan ready: ${pi.used} of ${pi.avail} minutes booked`:"No practice plan yet"}</span></div>
      <button class="btn primary" type="button" data-go="plan">${pi?"Open practice plan":"Plan this practice"}</button>`;
    if(ed)h+=`<details class="day-edit"><summary>Change time or note</summary>
      <div class="grid2"><label class="f">Starts<input type="time" id="dpStart" value="${p.start}"></label><label class="f">Ends<input type="time" id="dpEnd" value="${p.end}"></label></div>
      <label class="f">Note<input id="dpNote" value="${esc(p.note||"")}" placeholder="e.g. No School, Tryouts, Parent meeting after practice"></label>
      <div class="actions" style="margin:0"><button class="btn primary" type="button" data-act="savePractice">Save</button><button class="btn danger" type="button" data-act="cancelPractice">No practice this day</button></div></details>`;
  }
  if(d.off){
    h+=`<div class="day-ev holiday"><b>${esc(d.off.note||"No practice")}</b><span>No practice</span></div>`;
    if(ed)h+=`<div class="actions" style="margin:0"><button class="btn" type="button" data-act="restore">${regular?"Put practice back on":"Remove this day off"}</button></div>`;
  }
  if(d.note&&!d.practice&&!d.off)h+=`<div class="day-ev"><b>${esc(d.note.note||"Note")}</b></div>`;
  if(!d.game&&!d.practice&&!d.off&&!d.note)h+=`<p class="help">Nothing scheduled.</p>`;
  if(ed&&!d.game)h+=`<details class="day-edit"><summary>Add a game this day</summary>${gameForm({date:iso,home:true,time:"17:30"})}</details>`;
  if(ed&&!d.practice&&!d.off){const t=practiceTimes(iso,st);
    h+=`<details class="day-edit"><summary>Add a practice this day</summary><div class="grid2"><label class="f">Starts<input type="time" id="dpStart" value="${t.start}"></label><label class="f">Ends<input type="time" id="dpEnd" value="${t.end}"></label></div>
      <label class="f">Note<input id="dpNote" placeholder="Optional"></label><div class="actions" style="margin:0"><button class="btn primary" type="button" data-act="savePractice">Add practice</button></div></details>
      <details class="day-edit"><summary>Mark as a day off or holiday</summary><label class="f">Name<input id="dpOff" placeholder="e.g. Thanksgiving"></label><div class="actions" style="margin:0"><button class="btn" type="button" data-act="markOff">Save day off</button></div></details>`;}
  h+=`<div class="msg" id="dayMsg"></div><div class="actions" style="margin:0"><button class="btn" type="button" data-act="close">Close</button></div>`;
  $("#dayBody").innerHTML=h;
}
function gameForm(g){
  return `<div class="day-game" data-orig="${esc(g.date||"")}"><label class="f">Opponent<input id="dgOpp" value="${esc(g.opponent||"")}" placeholder="e.g. Waynesville"></label>
    <div class="grid2"><label class="f">Date<input type="date" id="dgDate" value="${esc(g.date||dayIso)}"></label><label class="f">Time<input type="time" id="dgTime" value="${esc(g.time||"")}"></label></div>
    <label class="f">Where<select id="dgHome"><option value="1"${g.home!==false?" selected":""}>Home</option><option value="0"${g.home===false?" selected":""}>Away</option></select></label>
    <div class="actions" style="margin:0"><button class="btn primary" type="button" data-act="saveGame">Save game</button>${g.opponent!==undefined&&(SETTINGS.games||[]).some(x=>x.date===g.date)?`<button class="btn danger" type="button" data-act="delGame">Delete game</button>`:""}</div></div>`;
}
async function change(fn,done){
  const st=JSON.parse(JSON.stringify(team.settings||{}));st.games=st.games||[];st.special=st.special||[];
  fn(st);msg($("#dayMsg"),"Saving…");
  try{await saveSettings(st);render();renderDay();msg($("#dayMsg"),done||"Saved","ok");}
  catch(err){msg($("#dayMsg"),"Not saved: "+(err.message||"check your connection"),"err");}
}
const setSpecial=(st,iso,x)=>{st.special=st.special.filter(s=>s.date!==iso);if(x)st.special.push({date:iso,...x});};
$("#dayBody").addEventListener("click",e=>{
  const b=e.target.closest("[data-act],[data-go]");if(!b)return;const iso=dayIso,st0=SETTINGS;
  if(b.dataset.go==="plan"){
    $("#dayDlg").close();setTab("plan");
    const sel=$("#planDate");if(![...sel.options].some(o=>o.value===iso))buildDateSelect();
    sel.value=iso;loadPlan(iso);if(window.onViewChange)window.onViewChange();window.scrollTo(0,0);return;
  }
  const a=b.dataset.act;
  if(a==="close"){$("#dayDlg").close();return;}
  const regular=(st0.practiceDays||[]).includes(dObj(iso).getDay())&&st0.seasonStart&&iso>=st0.seasonStart&&iso<=st0.seasonEnd&&!(st0.games||[]).some(g=>g.date===iso);
  if(a==="savePractice"){
    const start=$("#dpStart").value,end=$("#dpEnd").value,note=$("#dpNote").value.trim();
    if(start&&end&&end<=start){msg($("#dayMsg"),"The end time needs to be after the start time.","err");return;}
    const wk=[0,6].includes(dObj(iso).getDay()),ds=wk?st0.weekendStart:st0.weekdayStart,de=wk?st0.weekendEnd:st0.weekdayEnd;
    const times=start===ds&&end===de?{}:{start,end};
    change(st=>setSpecial(st,iso,regular?(note||times.start?{kind:"note",note,...times}:null):{kind:"extra",note,...times}),"Practice saved");
  }
  if(a==="cancelPractice")change(st=>setSpecial(st,iso,{kind:"off",note:$("#dpNote")?$("#dpNote").value.trim():""}),"Marked as no practice");
  if(a==="markOff")change(st=>setSpecial(st,iso,{kind:"off",note:$("#dpOff").value.trim()}),"Day off saved");
  if(a==="restore")change(st=>setSpecial(st,iso,null),"Saved");
  if(a==="saveGame"){
    const box=b.closest(".day-game"),orig=box.dataset.orig,date=$("#dgDate").value,opp=$("#dgOpp").value.trim();
    if(!date||!opp){msg($("#dayMsg"),"Add the opponent and date.","err");return;}
    const g={date,opponent:opp,time:$("#dgTime").value,home:$("#dgHome").value==="1"};
    change(st=>{st.games=st.games.filter(x=>x.date!==orig&&x.date!==date);st.games.push(g);},"Game saved");
    if(date!==iso)dayIso=date;
  }
  if(a==="delGame"){
    if(b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent="Tap again to delete";setTimeout(()=>{b.dataset.armed="";b.textContent="Delete game";},3000);return;}
    change(st=>{st.games=st.games.filter(x=>x.date!==iso);},"Game deleted");
  }
});
$("#calMonths").addEventListener("click",e=>{const c=e.target.closest("[data-day]");if(c)openDay(c.dataset.day);});
$("#calGames").addEventListener("click",e=>{const r=e.target.closest("[data-day]");if(r)openDay(r.dataset.day);});
$("#calAddGame").addEventListener("click",()=>{openDay(todayISO()>=(SETTINGS.seasonStart||"")?todayISO():SETTINGS.seasonStart);const det=$("#dayBody").querySelector("details.day-edit:has(.day-game)");if(det)det.open=true;});
$("#calToday").addEventListener("click",()=>{
  const t=todayISO(),el=document.getElementById(`cal-${+t.slice(0,4)}-${+t.slice(5,7)}`)||$("#calMonths .cal-month");
  if(el)el.scrollIntoView({behavior:"smooth",block:"start"});
});

/* ---------- add everything to a phone calendar (.ics) ---------- */
$("#calIcs").addEventListener("click",async()=>{
  const st=SETTINGS,{days}=buildDays(st),team0=[st.school,st.mascot].filter(Boolean).join(" ")||"Team";
  const stamp=new Date().toISOString().replace(/[-:]/g,"").slice(0,15)+"Z";
  const dt=(iso,t)=>iso.replace(/-/g,"")+"T"+(t||"00:00").replace(":","")+"00";
  const plus=(t,m)=>{const x=toMin(t)+m;return String(Math.floor(x/60)%24).padStart(2,"0")+":"+String(x%60).padStart(2,"0");};
  const escI=s=>String(s||"").replace(/[\\;,]/g,m=>"\\"+m).replace(/\n/g,"\\n");
  const ev=[];
  Object.entries(days).sort().forEach(([iso,d])=>{
    if(d.practice)ev.push(["practice-"+iso,dt(iso,d.practice.start),dt(iso,d.practice.end),`${team0} ${isTryout(d.practice.note)?"tryouts":"practice"}`,d.practice.note||""]);
    if(d.game&&d.game.time)ev.push(["game-"+iso,dt(iso,d.game.time),dt(iso,plus(d.game.time,90)),`${team0} ${d.game.home===false?"at":"vs"} ${d.game.opponent||"game"}`,d.game.home===false?"Away game":"Home game"]);
  });
  const ics=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Practice Planner//EN","CALSCALE:GREGORIAN",`X-WR-CALNAME:${escI(team0)}`,
    ...ev.flatMap(([id,s,e,sum,desc])=>["BEGIN:VEVENT",`UID:${id}-${(team&&team.id)||"team"}@practice-planner`,`DTSTAMP:${stamp}`,`DTSTART:${s}`,`DTEND:${e}`,`SUMMARY:${escI(sum)}`,desc?`DESCRIPTION:${escI(desc)}`:null,"END:VEVENT"].filter(Boolean)),
    "END:VCALENDAR"].join("\r\n");
  const slug=team0.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"team";
  await saveFile(`${slug}-schedule.ics`,new Blob([ics],{type:"text/calendar"}));
  $("#calHint").textContent=`Saved ${ev.length} practices and games. Open the file to add them to your calendar.`;
});
})();
