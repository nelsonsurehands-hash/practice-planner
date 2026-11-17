/* Getting started, for a coach's very first team only (settings.onboard is set when that team is made).
   1. A "Get started" checklist on Home: roster, first practice, first play, games, an assistant, parents.
      Each step checks itself off from the team's real data, so it works on any device.
   2. Starter mode: the game-day and parent tools (settings.onboard.starterOff) start turned off so the app
      isn't overwhelming. Once the coach has done most of the checklist, or after a few days, we ask if
      they're ready for the rest, and turn it all on with one tap.
   Teams made before this existed have no settings.onboard, so nothing here ever shows for them. */
(function(){
const STARTER_OFF=["game","scout","stats","sched","bus","food"];
const READY_STEPS=4, READY_DAYS=5, SNOOZE_DAYS=4;
const H=k=>typeof hasFeature!=="function"||hasFeature(k);
const OB=()=>(typeof SETTINGS!=="undefined"&&SETTINGS.onboard)||null;
const mine=()=>typeof team!=="undefined"&&team&&(team.role==="owner"||!team.role);
const daysSince=iso=>iso?Math.floor((Date.parse(todayISO())-Date.parse(iso))/864e5):0;
const lsKey=()=>"cpp:ob:"+(typeof team!=="undefined"&&team?team.id:"");
const local=()=>{try{return JSON.parse(localStorage.getItem(lsKey())||"{}");}catch{return {};}};
const setLocal=o=>{try{localStorage.setItem(lsKey(),JSON.stringify({...local(),...o}));}catch{}};

async function saveOB(patch){
  const ob={...(OB()||{}),...patch};
  try{await saveSettings({...team.settings,onboard:ob});}
  catch{if(typeof SETTINGS!=="undefined")SETTINGS.onboard=ob;}   // couldn't save: still update this screen
}

/* The steps. done() reads the team's real data; "seen" steps count once the coach has opened them. */
function steps(){
  const ob=OB()||{},seen=ob.seen||{};
  const roster=(window.TM&&TM.roster)||[];
  const anyPlan=typeof plans!=="undefined"&&Object.values(plans).some(p=>p&&p.blocks&&p.blocks.length);
  const anyPlay=typeof plays!=="undefined"&&plays.length>0;
  const games=(SETTINGS.games||[]).length>0;
  const staff=(typeof STAFF!=="undefined"&&STAFF.length>1)||seen.staff;
  return [
    {k:"roster",t:"Add your roster",s:"Type players in, or snap a photo of your roster sheet.",done:roster.length>0},
    H("plans")&&{k:"plan",t:"Build your first practice",s:"Pick drills, set the minutes, and the times fill in.",done:anyPlan},
    H("plays")&&{k:"play",t:"Draw your first play",s:"Start from a set like Horns, then drag and draw.",done:anyPlay},
    {k:"games",t:"Add your games",s:"Type them in, or snap a photo of the schedule.",done:games},
    {k:"staff",t:"Invite an assistant coach",s:"Share your staff code so they can help.",done:!!staff},
    H("plink")&&{k:"parents",t:"Send parents the calendar link",s:"One link that's always up to date.",done:!!seen.parents}
  ].filter(Boolean);
}
const featLabel=k=>{const f=(typeof FEATURES!=="undefined"?FEATURES:[]).find(x=>x[0]===k);return f?{l:f[1],h:f[2]}:{l:k,h:""};};
const waiting=()=>{const ob=OB();return ob&&!ob.unlocked?(ob.starterOff||[]).filter(k=>!H(k)):[];};

/* ---------- the Home card ---------- */
function card(){
  const ob=OB();if(!ob||!mine())return "";
  const list=steps(),n=list.filter(x=>x.done).length,all=n===list.length,more=waiting();
  if(ob.hidden||(all&&!more.length))return "";
  const pct=Math.round(n/list.length*100);
  return `<div class="hm-card ob-card"><div class="ob-head"><div><small class="hm-k">Get started</small>
      <h3 class="ob-title">${all?"You're all set up":n?"Nice start. Keep going":"Set up your team in a few minutes"}</h3></div>
      <span class="ob-count"><b>${n}</b> of ${list.length}</span></div>
    <div class="ob-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${list.length}" aria-valuenow="${n}"><i style="width:${pct}%"></i></div>
    <ol class="ob-steps">${list.map(x=>`<li class="${x.done?"done":""}"><span class="ob-tick" aria-hidden="true">${x.done?"✓":""}</span>
      <span class="ob-txt"><b>${x.t}</b><small>${x.s}</small></span>
      ${x.done?`<span class="ob-ok">Done</span>`:`<button type="button" class="btn ob-go" data-ob="${x.k}">Start</button>`}</li>`).join("")}</ol>
    ${more.length?`<div class="ob-more"><span>🔓 <b>${more.length} more tool${more.length===1?"":"s"}</b> ready when you are: ${more.map(k=>esc(featLabel(k).l)).join(", ")}.</span>
      <button type="button" class="linkbtn" data-ob="unlock">See them</button></div>`:""}
    <div class="ob-foot"><button type="button" class="linkbtn" data-ob="tour">Take the 1-minute tour</button><button type="button" class="linkbtn" data-ob="hide">Hide this list</button></div></div>`;
}

function go(k){
  const ob=OB()||{};
  if(k==="roster")goTeam("roster");
  if(k==="plan")setTab("plan");
  if(k==="play")setTab("plays");
  if(k==="games")setTab("cal");
  if(k==="staff"){goTeam("staff");saveOB({seen:{...(ob.seen||{}),staff:true}});}
  if(k==="parents"){goTeam("plink");saveOB({seen:{...(ob.seen||{}),parents:true}});}
  if(typeof track==="function")track("onboard:"+k);
  scrollTo(0,0);
}

/* ---------- "Ready for the rest?" ---------- */
let dlg=null,askedThisVisit=false;
function ask(){
  const more=waiting();if(!more.length)return;
  if(!dlg){dlg=document.createElement("dialog");dlg.className="ob-dlg";document.body.appendChild(dlg);}
  const done=steps().filter(x=>x.done).length;
  dlg.innerHTML=`<div class="dlg"><div class="ob-dlg-ic" aria-hidden="true">🏆</div>
    <h2>Ready for the rest of the app?</h2>
    <p>${done>=READY_STEPS?"You've got the basics down.":"You've been coaching with the basics for a few days."} When you're ready, these tools are one tap away:</p>
    <ul class="ob-feats">${more.map(k=>{const f=featLabel(k);return `<li><b>${esc(f.l)}</b><small>${esc(f.h)}</small></li>`;}).join("")}</ul>
    <div class="actions" style="justify-content:flex-end;flex-wrap:wrap"><button class="btn" type="button" data-od="later">Not yet</button>
      <button class="btn" type="button" data-od="pick">Pick some</button><button class="btn primary" type="button" data-od="all">Turn them all on</button></div>
    <p class="help" style="text-align:center;margin:10px 0 0">You can turn any of these on or off later in Settings → Features.</p></div>`;
  dlg.onclick=async e=>{const b=e.target.closest("[data-od]");if(e.target===dlg){dlg.close();return;}if(!b)return;const k=b.dataset.od;dlg.close();
    if(k==="later"){setLocal({snooze:SchedCore.addDays(todayISO(),SNOOZE_DAYS)});if(typeof track==="function")track("onboard:later");}
    if(k==="pick"){if(typeof track==="function")track("onboard:pick");setTab("settings");setTimeout(()=>{const b=document.querySelector('[data-acc="features"]');if(b)b.click();},150);}
    if(k==="all"){const f={...(team.settings.features||{})};more.forEach(x=>f[x]=true);
      try{await saveSettings({...team.settings,features:f,onboard:{...(OB()||{}),unlocked:true}});}catch{}
      if(typeof applyFeatures==="function")applyFeatures();if(typeof track==="function")track("onboard:unlock");
      if(typeof showNotice==="function")showNotice("Everything's on. Look for Gameplans, Stats and Parent Admin under the Team tab.");
      if(window.renderHome)renderHome();}
  };
  if(!dlg.open)dlg.showModal();
}
/* Ask once per visit, when they've done enough or it's been a few days, unless they said "not yet". */
function maybeAsk(){
  const ob=OB();if(!ob||!mine()||askedThisVisit||!waiting().length)return;
  const snooze=local().snooze;if(snooze&&todayISO()<snooze)return;
  const done=steps().filter(x=>x.done).length;
  if(done<READY_STEPS&&daysSince(ob.since)<READY_DAYS)return;
  if(document.querySelector("dialog[open]")||document.getElementById("view-home").hidden)return;
  askedThisVisit=true;setTimeout(()=>{if(!document.querySelector("dialog[open]"))ask();},1200);
}

document.getElementById("view-home").addEventListener("click",e=>{
  const b=e.target.closest("[data-ob]");if(!b)return;e.stopPropagation();const k=b.dataset.ob;
  if(k==="hide"){saveOB({hidden:true}).then(()=>window.renderHome&&renderHome());if(typeof track==="function")track("onboard:hide");return;}
  if(k==="tour"){if(window.showTour)showTour();return;}
  if(k==="unlock"){ask();return;}
  go(k);
});

window.Onboard={STARTER_OFF,card,maybeAsk,ask,active:()=>!!(OB()&&mine()&&!OB().hidden)};
})();
