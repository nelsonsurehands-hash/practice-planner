/* Drill library browser + season planner (Practice > Drill library).
   Browse the built-in library (js/drilllib.js), watch the animated drills (js/drillsim.js), add drills to
   the team's own library, and build a whole season of practice plans from a few answers. */
(function(){
const LIB=self.DRILL_LIB||[];
const byId=id=>LIB.find(d=>d.id===id);
const h=(s)=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const CATS3=["Individual","Skill","Team"];
const CAT_HELP={Individual:"One player, one ball",Skill:"Partners and small groups",Team:"The whole roster"};
const GROUP_CAT={Finishing:"Finishing",Shooting:"Shooting","Ball handling":"Ball handling",Passing:"Passing",Rebounding:"Rebounding",Transition:"Transition",Conditioning:"Conditioning",Scrimmage:"Scrimmage","Warm-up":"Warm-up",Footwork:"Warm-up","Post play":"Offense",Hustle:"Defense"};
function appCat(d){if(d.group==="Defense")return d.cat==="Team"?"Team Defense":"Defense";if(d.group==="Offense")return d.cat==="Team"?"Team Offense":"Offense";return GROUP_CAT[d.group]||"Other";}
const teamDrills=()=>typeof drills!=="undefined"?drills:[];
function teamDrillFor(d){const n=d.name.toLowerCase();return teamDrills().find(x=>x.lib===d.id)||teamDrills().find(x=>(x.name||"").toLowerCase()===n);}
const canEdit=()=>typeof PERM!=="undefined"&&PERM.drills&&!(typeof READONLY!=="undefined"&&READONLY);
function drillBody(d){
  return {editedBy:(typeof ME!=="undefined"&&ME.name)||"Coach",name:d.name,categories:[appCat(d)],category:appCat(d),minutes:d.minutes||10,
    description:[d.setup,...(d.how||[]).map((s,i)=>`${i+1}. ${s}`)].filter(Boolean).join("\n"),points:(d.points||[]).join("; "),lib:d.id,createdAt:Date.now()};
}
/* Make sure a library drill is in the team's drill library; returns its id. */
async function ensureDrill(d,quiet){
  const have=teamDrillFor(d);
  if(have){if(!have.lib&&typeof db!=="undefined"&&db&&canWrite){have.lib=d.id;const {id:_i,...rest}=have;try{await db.collection("drills").doc(have.id).set({...rest,lib:d.id});}catch(e){}}return have.id;}
  const id=uid()+uid(),body=drillBody(d);
  drills.push({id,...body});if(typeof sortDrills==="function")sortDrills();
  if(!quiet&&typeof renderAllDrills==="function")renderAllDrills();
  if(typeof db!=="undefined"&&db&&canWrite){try{await db.collection("drills").doc(id).set(body);}catch(e){if(typeof handleWriteErr==="function")handleWriteErr(e);}}
  return id;
}

/* ---------- the browse dialog ---------- */
let DLG=null,SIM=null,state={cat:"",q:"",anim:false,open:null};
function dialog(){
  if(DLG)return DLG;
  DLG=document.createElement("dialog");DLG.className="dlib";DLG.setAttribute("aria-labelledby","dlibTitle");
  DLG.innerHTML=`<div class="dlib-in"><header class="dlib-head"><button type="button" class="dlib-back" data-dl="back" hidden aria-label="Back to all drills">‹ All drills</button><h2 id="dlibTitle">Drill library</h2><button type="button" class="icon dlib-x" data-dl="close" aria-label="Close">✕</button></header><div class="dlib-body"></div></div>`;
  document.body.appendChild(DLG);
  DLG.addEventListener("click",onClick);
  DLG.addEventListener("input",e=>{if(e.target.id==="dlibQ"){state.q=e.target.value;renderList(true);}});
  DLG.addEventListener("close",()=>{stopSim();});
  DLG.addEventListener("cancel",e=>{if(state.open){e.preventDefault();back();}});
  return DLG;
}
function stopSim(){if(SIM){SIM.destroy();SIM=null;}}
function openLib(id){dialog();state.open=null;if(DLG.tagName==="DIALOG"&&!DLG.open)DLG.showModal();if(id){showDetail(id);}else renderList();}
function mountInline(el){DLG=el;el.classList.add("dlib","dlib-inline");el.innerHTML=`<div class="dlib-in"><header class="dlib-head"><button type="button" class="dlib-back" data-dl="back" hidden aria-label="Back to all drills">‹ All drills</button><h2 id="dlibTitle">Drill library</h2></header><div class="dlib-body"></div></div>`;
  el.addEventListener("click",onClick);el.addEventListener("input",e=>{if(e.target.id==="dlibQ"){state.q=e.target.value;renderList(true);}});renderList();}
function back(){stopSim();state.open=null;renderList();if(DLG&&DLG.scrollIntoView&&DLG.tagName!=="DIALOG")DLG.scrollIntoView({block:"start"});}
function filtered(){const q=state.q.trim().toLowerCase();
  return LIB.filter(d=>(!state.cat||d.cat===state.cat)&&(!state.anim||d.sim)&&(!q||(d.name+" "+d.group+" "+d.setup+" "+(d.how||[]).join(" ")).toLowerCase().includes(q)));}
function card(d){const mine=teamDrillFor(d);
  return `<button type="button" class="dlib-card" data-open="${d.id}"><span class="dlib-ct"><b>${h(d.name)}</b>${d.sim?`<i class="dlib-anim" aria-label="Animated">▶</i>`:""}</span>
    <span class="dlib-meta">${h(d.group)} · ${d.minutes} min · ${h(d.players)}</span>${mine?`<span class="dlib-have">In your drills</span>`:""}</button>`;}
function renderList(keepFocus){
  const B=DLG.querySelector(".dlib-body");DLG.querySelector(".dlib-back").hidden=true;DLG.querySelector("#dlibTitle").textContent="Drill library";
  const list=filtered(),n=LIB.length,na=LIB.filter(d=>d.sim).length;
  const groups=CATS3.filter(c=>!state.cat||c===state.cat).map(c=>{const ds=list.filter(d=>d.cat===c);if(!ds.length)return "";
    ds.sort((a,b)=>(b.sim?1:0)-(a.sim?1:0)||a.name.localeCompare(b.name));
    return `<section class="dlib-sec"><h3>${c}<small>${CAT_HELP[c]} · ${ds.length}</small></h3><div class="dlib-grid">${ds.map(card).join("")}</div></section>`;}).join("");
  if(!keepFocus||!B.querySelector("#dlibQ")){
    B.innerHTML=`<p class="dlib-lede">${n} proven drills, written for coaches. ${na} of them animated so you can see exactly how they run.</p>
    <div class="dlib-tools"><input id="dlibQ" type="search" placeholder="Search drills" value="${h(state.q)}" autocomplete="off"><div class="dlib-chips" role="group" aria-label="Filter">${["",...CATS3].map(c=>`<button type="button" data-cat="${c}" aria-pressed="${state.cat===c}">${c||"All"}</button>`).join("")}<button type="button" data-anim aria-pressed="${state.anim}">▶ Animated</button></div></div>
    <div class="dlib-list"></div>`;}
  else{B.querySelectorAll("[data-cat]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.cat===state.cat));B.querySelector("[data-anim]").setAttribute("aria-pressed",state.anim);}
  B.querySelector(".dlib-list").innerHTML=groups||`<p class="dlib-empty">No drills match. Try another word.</p>`;
}
function showDetail(id){
  const d=byId(id);if(!d)return;stopSim();state.open=id;
  const B=DLG.querySelector(".dlib-body");DLG.querySelector(".dlib-back").hidden=false;DLG.querySelector("#dlibTitle").textContent=d.cat+" drill";
  const mine=teamDrillFor(d),ed=canEdit();
  B.innerHTML=`<article class="dlib-d">
    <h3 class="dlib-name">${h(d.name)}</h3>
    <div class="dlib-facts"><span><b>${d.minutes}</b> min</span><span>Players: <b>${h(d.players)}</b></span><span>${h(d.group)}</span><span>${h(d.level)}</span><span>${h(d.equip)}</span></div>
    <div class="dlib-act dlib-addtop">${self.DLIB_PREVIEW?`<button type="button" class="btn primary" data-add="${d.id}">+ Add to my drills</button>`:mine?`<span class="dlib-have big">✓ In your drill library</span>`:ed?`<button type="button" class="btn primary" data-add="${d.id}">+ Add to my drills</button>`:`<span class="help">Ask your head coach to add it to the team's drills.</span>`}</div>
    ${d.sim?`<div class="dlib-sim" id="dlibSim"></div>`:""}
    <div class="dlib-cols">
      <div><h4>Setup</h4><p>${h(d.setup)}</p><h4>How it runs</h4><ol>${(d.how||[]).map(s=>`<li>${h(s)}</li>`).join("")}</ol></div>
      <div><h4>Coaching points</h4><ul>${(d.points||[]).map(s=>`<li>${h(s)}</li>`).join("")}</ul>${d.vary&&d.vary.length?`<h4>Make it harder or different</h4><ul>${d.vary.map(s=>`<li>${h(s)}</li>`).join("")}</ul>`:""}</div>
    </div>

  </article>`;
  if(d.sim){SIM=DrillSim.mount(B.querySelector("#dlibSim"),d);}
  B.scrollTop=0;if(DLG.tagName!=="DIALOG"&&DLG.scrollIntoView)DLG.scrollIntoView({block:"start"});
}
async function onClick(e){
  const t=e.target;
  if(t.closest("[data-dl=close]")){DLG.close();return;}
  if(t.closest("[data-dl=back]")){back();return;}
  const c=t.closest("[data-cat]");if(c){state.cat=c.dataset.cat;renderList(true);return;}
  if(t.closest("[data-anim]")){state.anim=!state.anim;renderList(true);return;}
  const o=t.closest("[data-open]");if(o){showDetail(o.dataset.open);return;}
  const a=t.closest("[data-add]");if(a){a.disabled=true;if(!self.DLIB_PREVIEW)await ensureDrill(byId(a.dataset.add));a.outerHTML=`<span class="dlib-have big">✓ Added to your drill library</span>`;if(window.cppTrack)cppTrack("drill:libadd");return;}
}

/* ---------- watch one drill (from a practice card or the team's drill list) ---------- */
let WDLG=null,WSIM=null;
function watch(id){const d=byId(id);if(!d||!d.sim)return;
  if(!WDLG){WDLG=document.createElement("dialog");WDLG.className="dlib dlib-watch";WDLG.innerHTML=`<div class="dlib-in"><header class="dlib-head"><h2 id="dwTitle"></h2><button type="button" class="icon dlib-x" aria-label="Close">✕</button></header><div class="dlib-body"><div class="dlib-sim" id="dwSim"></div><p class="dlib-more"><button type="button" class="btn sm" id="dwMore">Setup and coaching points</button></p></div></div>`;
    document.body.appendChild(WDLG);WDLG.querySelector(".dlib-x").onclick=()=>WDLG.close();WDLG.addEventListener("close",()=>{if(WSIM){WSIM.destroy();WSIM=null;}});
    WDLG.querySelector("#dwMore").onclick=()=>{const k=WDLG.dataset.id;WDLG.close();openLib(k);};}
  WDLG.dataset.id=id;WDLG.querySelector("#dwTitle").textContent=d.name;
  if(!WDLG.open)WDLG.showModal();
  if(WSIM)WSIM.destroy();WSIM=DrillSim.mount(WDLG.querySelector("#dwSim"),d);
}
document.addEventListener("click",e=>{const w=e.target.closest("[data-libwatch]");if(w){e.preventDefault();watch(w.dataset.libwatch);}
  const o=e.target.closest("[data-libopen]");if(o){e.preventDefault();openLib(o.dataset.libopen||"");}
  const s=e.target.closest("[data-season]");if(s){e.preventDefault();openSeason();}});
self.libWatchable=id=>{const d=byId(id);return !!(d&&d.sim);};
self.libIdFor=t=>t?(t.lib&&byId(t.lib)?t.lib:(LIB.find(x=>x.name.toLowerCase()===String(t.name||"").toLowerCase())||{}).id||null):null;

/* ---------- season planner ---------- */
const FOCUS=["Ball handling","Shooting","Finishing","Passing","Defense","Rebounding","Transition","Offense"];
const LEVELS=[["y","Ages 6–9"],["m","Ages 10–12"],["j","Ages 13–14"],["h","High school"]];
let SDLG=null,PLAN=null;
function fits(d,lv){const L=d.level||"All ages";
  if(lv==="y")return !/10 and up|12 and up/.test(L);
  if(lv==="m")return !/12 and up/.test(L);
  if(lv==="h")return !/Ages 6/.test(L);
  return true;}
function upcoming(){const today=new Date().toISOString().slice(0,10);return (typeof PRACTICES!=="undefined"?PRACTICES:[]).map(p=>p[0]).filter(iso=>iso>=today);}
function openSeason(){
  if(!SDLG){SDLG=document.createElement("dialog");SDLG.className="dlib dlib-season";SDLG.setAttribute("aria-labelledby","spTitle");document.body.appendChild(SDLG);
    SDLG.addEventListener("click",onSeasonClick);SDLG.addEventListener("change",onSeasonChange);}
  PLAN=null;renderSeasonForm();if(!SDLG.open)SDLG.showModal();
}
function renderSeasonForm(){
  const cal=upcoming(),today=new Date().toISOString().slice(0,10),useCal=cal.length>0;
  const fmtD=iso=>dObj(iso).toLocaleDateString("en-US",{month:"short",day:"numeric"});
  SDLG.innerHTML=`<div class="dlib-in"><header class="dlib-head"><h2 id="spTitle">Plan my season</h2><button type="button" class="icon dlib-x" data-sp="close" aria-label="Close">✕</button></header>
  <form class="dlib-body sp-form" onsubmit="return false">
    <p class="dlib-lede">Answer a few questions and get a full season of timed practices, built from the drill library and filled into your calendar. You can change any practice afterward.</p>
    <fieldset class="sp-q"><legend>Which practices?</legend>
      ${useCal?`<label class="sp-radio"><input type="radio" name="spWhen" value="cal" checked> The ${cal.length} practices on your calendar <small>${fmtD(cal[0])} to ${fmtD(cal[cal.length-1])}</small></label>`:""}
      <label class="sp-radio"><input type="radio" name="spWhen" value="new"${useCal?"":" checked"}> Pick days and weeks</label>${useCal||self.DLIB_PREVIEW?"":`<p class="help sp-tip">Tip: set your season dates and practice days in Calendar first, and the planner will use them.</p>`}
      <div class="sp-new"${useCal?" hidden":""}>
        <div class="sp-row"><label class="f">First practice<input type="date" id="spStart" value="${today}"></label><label class="f">Weeks<input type="number" id="spWeeks" min="1" max="20" value="8" inputmode="numeric"></label></div>
        <div class="sp-days" role="group" aria-label="Practice days">${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((n,i)=>`<label><input type="checkbox" value="${i}"${[1,3,4].includes(i)?" checked":""}> ${n}</label>`).join("")}</div>
        <div class="sp-row"><label class="f">Start time<input type="time" id="spTime" value="${(typeof SETTINGS!=="undefined"&&SETTINGS.weekdayStart)||"16:00"}"></label><label class="f">Length<select id="spLen">${[45,60,75,90,105,120].map(m=>`<option value="${m}"${m===90?" selected":""}>${m} minutes</option>`).join("")}</select></label></div>
      </div>
    </fieldset>
    <fieldset class="sp-q"><legend>Who are you coaching?</legend><div class="sp-seg">${LEVELS.map(([k,l],i)=>`<label><input type="radio" name="spLevel" value="${k}"${i===1?" checked":""}><span>${l}</span></label>`).join("")}</div></fieldset>
    <fieldset class="sp-q"><legend>What should get the most time? <small>Pick up to 3</small></legend><div class="sp-seg wrap">${FOCUS.map((f,i)=>`<label><input type="checkbox" name="spFocus" value="${f}"${["Ball handling","Shooting","Defense"].includes(f)?" checked":""}><span>${f}</span></label>`).join("")}</div></fieldset>
    <label class="sp-check"><input type="checkbox" id="spKeep" checked> Keep practices I've already planned</label>
    <div class="dlib-act"><button type="button" class="btn primary" data-sp="build">Build my season</button></div>
  </form></div>`;
}
function onSeasonChange(e){
  if(e.target.name==="spWhen")SDLG.querySelector(".sp-new").hidden=e.target.value!=="new";
  if(e.target.name==="spFocus"){const on=[...SDLG.querySelectorAll("[name=spFocus]:checked")];if(on.length>3)e.target.checked=false;}
}
function readForm(){
  const when=(SDLG.querySelector("[name=spWhen]:checked")||{}).value||"new";
  let dates=[];
  if(when==="cal")dates=upcoming().map(iso=>({iso,...practiceTimes(iso)}));
  else{const start=SDLG.querySelector("#spStart").value,weeks=Math.max(1,Math.min(20,+SDLG.querySelector("#spWeeks").value||8)),days=[...SDLG.querySelectorAll(".sp-days input:checked")].map(x=>+x.value);
    const t=SDLG.querySelector("#spTime").value||"16:00",len=+SDLG.querySelector("#spLen").value||90;
    const end=(()=>{const [hh,mm]=t.split(":").map(Number),m=hh*60+mm+len;return String(Math.floor(m/60)%24).padStart(2,"0")+":"+String(m%60).padStart(2,"0");})();
    if(start&&days.length)for(let i=0;i<weeks*7;i++){const iso=addDays(start,i);if(days.includes(dObj(iso).getDay()))dates.push({iso,start:t,end});}}
  const level=(SDLG.querySelector("[name=spLevel]:checked")||{}).value||"m";
  const focus=[...SDLG.querySelectorAll("[name=spFocus]:checked")].map(x=>x.value);
  return {dates,level,focus,keep:SDLG.querySelector("#spKeep").checked};
}
/* The plan for one practice: warm-up, individual skill work, small-group skill work on the focus areas,
   team drills, then a competitive finish. Early weeks lean on fundamentals; later weeks add more team
   play. Drills rotate so the same day never repeats back to back. */
function buildSeason(o){
  const pool=LIB.filter(d=>fits(d,o.level)),pick=(f)=>pool.filter(f);
  const ALIAS={"Ball handling":["zigzag","chase-down","one-on-one-wing"],Finishing:["chase-down","give-and-go"],Transition:["three-man-weave","chase-down","outlet-passing"],Offense:["give-and-go","pick-and-roll","one-on-one-wing","post-drop-step"],Defense:["zigzag","closeout","help-recover","deny-the-wing"],Rebounding:["box-out","tip-drill"],Passing:["three-man-weave","give-and-go"],Shooting:["catch-and-shoot"]};
  const focusIs=(d,f)=>(f==="Offense"?/Offense|Post play/.test(d.group):d.group===f)||(ALIAS[f]||[]).includes(d.id);
  const warm=pick(d=>d.group==="Warm-up"||d.group==="Footwork");
  const indiv=pick(d=>d.cat==="Individual"),skill=pick(d=>d.cat==="Skill"),team=pick(d=>d.cat==="Team"&&!/Scrimmage|Conditioning|Warm-up/.test(d.group));
  const games=pick(d=>d.cat==="Team"&&/Scrimmage/.test(d.group)),cond=pick(d=>d.group==="Conditioning");
  const young=o.level==="y",ctr={};
  let usedNow=new Set();
  const rot=(list,key,prefer)=>{list=list.filter(d=>!usedNow.has(d.id)&&d.id!=="free-throws");if(!list.length)return null;const pref=prefer?list.filter(prefer):[];const L=pref.length?pref:list;ctr[key]=(ctr[key]||0)+1;return L[(ctr[key]*7+key.length)%L.length];};
  const focusN=o.focus.length?o.focus:["Ball handling","Shooting","Defense"];
  const weeks={};const out=[];
  o.dates.forEach((dt,i)=>{
    const wk=Math.floor((dObj(dt.iso)-dObj(o.dates[0].iso))/6048e5)+1;weeks[wk]=(weeks[wk]||0)+1;
    const total=Math.max(30,(toMinS(dt.end)-toMinS(dt.start))||90),phase=o.dates.length<4?1:i/o.dates.length;
    const f1=focusN[i%focusN.length],f2=focusN[(i+1)%focusN.length];
    const blocks=[];usedNow=new Set();const add=(d,min,note)=>{if(!d)return;usedNow.add(d.id);blocks.push({lib:d.id,name:d.name,category:appCat(d),minutes:min,notes:note||""});};
    add(i%3===0||!warm.length?byId("dynamic-warmup"):rot(warm,"warm"),total>=75?10:8);
    add(rot(indiv,"ind:"+f1,d=>focusIs(d,f1)),total>=90?10:8,`Focus: ${f1.toLowerCase()}`);
    add(rot(skill,"sk:"+f1,d=>focusIs(d,f1)),total>=90?12:10);
    blocks.push({name:"Water break",category:"",minutes:3,notes:""});
    add(rot(skill,"sk:"+f2,d=>focusIs(d,f2)),10);
    if(total>=75)add(rot(indiv.concat(skill),"x:"+f2,d=>focusIs(d,f2)),8);
    add(rot(team,"team"+(phase<.34?"a":"b"),phase<.34?(d=>/Passing|Finishing/.test(d.group)):(d=>/Transition|Defense|Offense/.test(d.group))),total>=90?12:10);
    if(total>=90)add(rot(team,"team2"),10);
    // competitive finish: fun games for young teams, scrimmage for older, more of it later in the season
    const left=total-blocks.reduce((a,b)=>a+b.minutes,0);
    if(young){add(rot(pick(d=>/Ages 6/.test(d.level)&&d.cat==="Team"),"fun"),Math.max(5,Math.min(10,left-5)));}
    else if(left>12){add(rot(games,"scr",phase>.5?(d=>/Controlled|Cutthroat/.test(d.name)):(d=>/3-on-3|Cutthroat/.test(d.name))),Math.max(8,left-(total>=90?9:6)));
      if(total>=90&&!young)add(rot(cond,"cond"),4);}
    const used=blocks.reduce((a,b)=>a+b.minutes,0);
    const ft=byId("free-throws");if(ft&&total-used>=3)add(ft,Math.min(6,total-used),"Finish with free throws");
    const fin=blocks.reduce((a,b)=>a+b.minutes,0);if(fin<total&&blocks.length)blocks[blocks.length-1].minutes+=total-fin;
    out.push({iso:dt.iso,start:dt.start,end:dt.end,week:wk,focus:`${f1} and ${f2.toLowerCase()}`,blocks});
  });
  return out;
}
const toMinS=t=>{const [a,b]=(t||"0:0").split(":").map(Number);return a*60+b;};
function renderPreview(){
  const have=typeof plans!=="undefined"?plans:{};const keep=PLAN.keep;
  const fmtD=iso=>dObj(iso).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
  const rows=PLAN.items.map(p=>{const skip=keep&&have[p.iso]&&(have[p.iso].blocks||[]).length;
    return `<details class="sp-day${skip?" skip":""}"><summary><b>${fmtD(p.iso)}</b><span>Week ${p.week} · ${h(p.focus)}</span>${skip?`<em>Already planned, kept</em>`:`<em>${p.blocks.length} drills</em>`}</summary>
      <ol>${p.blocks.map(b=>`<li><span>${b.minutes} min</span>${h(b.name)}${b.lib&&libWatchable(b.lib)?` <button type="button" class="dlib-mini" data-libwatch="${b.lib}">▶</button>`:""}</li>`).join("")}</ol></details>`;}).join("");
  const n=PLAN.items.filter(p=>!(keep&&have[p.iso]&&(have[p.iso].blocks||[]).length)).length;
  SDLG.querySelector(".dlib-body").outerHTML=`<div class="dlib-body"><p class="dlib-lede">${PLAN.items.length} practices. Tap a day to see its drills.</p><div class="sp-list">${rows}</div>
    <div class="dlib-act"><button type="button" class="btn" data-sp="edit">‹ Change answers</button>${self.DLIB_PREVIEW?`<span class="help">In the app, this adds the ${n} practices to the team calendar.</span>`:`<button type="button" class="btn primary" data-sp="save"${n?"":" disabled"}>Add ${n} practice${n===1?"":"s"} to my calendar</button>`}</div><p class="sp-msg" id="spMsg" aria-live="polite"></p></div>`;
}
async function saveSeason(btn){
  btn.disabled=true;btn.textContent="Adding…";
  const have=typeof plans!=="undefined"?plans:{};let n=0;
  const ids={};for(const p of PLAN.items)for(const b of p.blocks)if(b.lib&&!ids[b.lib])ids[b.lib]=await ensureDrill(byId(b.lib),true);
  if(typeof renderAllDrills==="function")renderAllDrills();
  for(const p of PLAN.items){
    if(PLAN.keep&&have[p.iso]&&(have[p.iso].blocks||[]).length)continue;
    const plan={date:p.iso,start:p.start,end:p.end,focus:p.focus,blocks:p.blocks.map(b=>({id:uid(),drillId:b.lib?ids[b.lib]:null,name:b.name,category:b.category,minutes:b.minutes,notes:b.notes||""})),editedBy:(typeof ME!=="undefined"&&ME.name)||"Coach",editedAt:Date.now(),addedFrom:"season"};
    plans[p.iso]=plan;n++;
    if(typeof db!=="undefined"&&db&&canWrite){try{await db.collection("plans").doc(p.iso).set(plan);}catch(e){if(typeof handleWriteErr==="function")handleWriteErr(e);}}
  }
  if(typeof buildDateSelect==="function")buildDateSelect();
  if(typeof cur!=="undefined"&&cur&&plans[cur.date]&&typeof loadPlan==="function")loadPlan(cur.date);
  if(window.renderHome)renderHome();
  if(window.cppTrack)cppTrack("season:built");
  SDLG.querySelector("#spMsg").textContent=`✓ ${n} practice${n===1?"":"s"} added. Open any date in Practice plan to change it.`;
  btn.textContent="Done";btn.dataset.sp="close";btn.disabled=false;
}
function onSeasonClick(e){
  const b=e.target.closest("[data-sp]");if(!b)return;const k=b.dataset.sp;
  if(k==="close"){SDLG.close();return;}
  if(k==="edit"){renderSeasonForm();return;}
  if(k==="build"){const o=readForm();if(!o.dates.length){alertMsg("Pick at least one practice day.");return;}PLAN={...o,items:buildSeason(o)};renderPreview();return;}
  if(k==="save"){saveSeason(b);}
}
function alertMsg(t){let m=SDLG.querySelector(".sp-err");if(!m){m=document.createElement("p");m.className="sp-err";SDLG.querySelector(".dlib-act").before(m);}m.textContent=t;}

/* ---------- entry points in the Drill library tab ---------- */
function mountEntry(){
  const host=document.querySelector("#view-lib .lib-tools");if(!host||document.getElementById("dlibEntry"))return;
  const el=document.createElement("div");el.id="dlibEntry";el.className="dlib-entry";
  el.innerHTML=`<div><b>Drill library</b><span>${LIB.length} proven drills, ${LIB.filter(d=>d.sim).length} animated. Add any of them to your drills.</span></div><div class="dlib-entry-b"><button type="button" class="btn primary" data-libopen="">Browse drills</button><button type="button" class="btn" data-season>Plan my season</button></div>`;
  host.before(el);
}
if(document.readyState!=="loading")mountEntry();else document.addEventListener("DOMContentLoaded",mountEntry);
self.openDrillLib=openLib;self.mountDrillLib=mountInline;self.openSeasonPlanner=openSeason;self.buildSeasonPlan=buildSeason;
})();
