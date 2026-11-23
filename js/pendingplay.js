/* A play drawn on the public play designer page (basketball-play-designer/, js/designer-demo.js) is kept on
   this device as cpp:pendingPlay, and a practice built on the practice planner page (basketball-practice-planner/,
   js/planner-demo.js) as cpp:pendingPlan. Signed-out visitors who arrive from it go straight to "Create account",
   with their play shown on the card. Once a team is open (sign-up and email confirmation can reload the
   page), the play is saved to that team's play library and opened, so the coach's first play is already there. */
(function(){
const KEY="cpp:pendingPlay",DAYS=14;
const get=()=>{try{const j=JSON.parse(localStorage.getItem(KEY)||"null");
  if(!j||!j.play||!Array.isArray(j.play.frames)||!j.play.frames.length||Date.now()-j.at>DAYS*864e5){localStorage.removeItem(KEY);return null;}return j;}catch(e){return null;}};
const drop=()=>{try{localStorage.removeItem(KEY);}catch(e){}};
const owner=()=>{try{return !!localStorage.getItem("cpp:owner");}catch(e){return false;}};
const FROM=new URLSearchParams(location.search).get("from");
const PKEY="cpp:pendingPlan";
const getPlan=()=>{try{const j=JSON.parse(localStorage.getItem(PKEY)||"null");
  if(!j||!j.plan||!Array.isArray(j.plan.blocks)||!j.plan.blocks.length||Date.now()-j.at>DAYS*864e5){localStorage.removeItem(PKEY);return null;}return j;}catch(e){return null;}};
const dropPlan=()=>{try{localStorage.removeItem(PKEY);}catch(e){}};
const H=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

/* the sign-up card: "Your play is ready to save" with a small picture of it */
function banner(){
  const box=document.getElementById("joinInvite");
  if(!box||(typeof JOIN!=="undefined"&&JOIN))return;
  const pl=getPlan(),j=get();
  if(pl&&(FROM==="planner"||!j)){const b=pl.plan.blocks,tot=b.reduce((a,x)=>a+(+x.minutes||0),0);
    box.hidden=false;box.className="join-invite pp-card";
    box.innerHTML=`<ol class="pp-mini" aria-hidden="true">${b.slice(0,4).map(x=>`<li>${H(x.name)}</li>`).join("")}${b.length>4?`<li>+${b.length-4} more</li>`:""}</ol><div><small>Your practice is ready to save</small><b>${H(pl.plan.focus||`${b.length} drills · ${tot} min`)}</b><span>Create a free account and it becomes your next practice, drills and all. Already have one? Sign in.</span></div>`;return;}
  if(!j)return;
  let pic="";try{pic=`<svg class="pp-thumb" viewBox="-30 -45 560 530" aria-hidden="true">${boardInner(withDefense(j.play.frames[0],j.play.frames[0].defense||null),"screen")}</svg>`;}catch(e){}
  const n=(j.play.name||"").trim();
  box.hidden=false;box.className="join-invite pp-card";
  box.innerHTML=`${pic}<div><small>Your play is ready to save</small><b>${n?H(n):"Your play"}</b><span>Create a free account and it goes straight into your team's playbook. Already have one? Sign in.</span></div>`;
}
/* arriving from the designer page, signed out: open "Create account" instead of the homepage */
self.pendingPlayWelcome=function(){
  if(typeof authTab!=="function")return false;
  if(!((FROM==="designer"&&get())||(FROM==="planner"&&getPlan())))return false;
  show("screen-auth");authTab("up");banner();
  if(typeof track==="function")track(FROM+":signup");
  return true;
};
document.addEventListener("click",e=>{if(e.target.closest("#authTabIn,#authTabUp"))setTimeout(banner,0);});
setTimeout(banner,0);

/* once a team is open: save the play and open it */
let busy=false;
const iv=setInterval(async()=>{
  const j=get();if(!j){clearInterval(iv);return;}
  if(busy||typeof team==="undefined"||!team||!db||$("#app").hidden)return;
  if(owner()){clearInterval(iv);return;}            // the owner testing the page keeps it for a coach account
  if(typeof PERM!=="undefined"&&!PERM.plays){clearInterval(iv);return;}   // a view-only team: keep it for a team they coach
  if((SETTINGS.sport||"basketball")!=="basketball"){clearInterval(iv);return;}
  busy=true;clearInterval(iv);
  const p=j.play,base=titleCase((p.name||"").trim())||"My First Play";
  let name=base,k=2;while(plays.some(x=>(x.name||"").toLowerCase()===name.toLowerCase()))name=`${base} ${k++}`;
  const id=uid()+uid();
  const body={name,type:sp().playTypes.includes(p.type)?p.type:sp().playTypes[0],notes:"",frames:p.frames,updatedAt:Date.now(),editedBy:(typeof ME!=="undefined"&&ME&&ME.name)||""};
  try{
    if(!canWrite)throw new Error("view only");
    await db.collection("plays").doc(id).set(body);
  }catch(e){busy=false;return;}                     // keep it; it tries again next time the app opens
  drop();
  if(!plays.some(x=>x.id===id))plays.push({id,...body});
  setTab("plays");
  play=window.playFromSaved?playFromSaved({id,...body}):clone({id,...body});fi=0;hist=[];pdirty=false;PLAY_LOCK=true;renderEditor();renderPlayLib();
  const card=document.querySelector("#view-plays .board-card");if(card)card.scrollIntoView({behavior:"smooth",block:"start"});
  pflash(`Saved “${name}” to your play library. Tap Edit play to add the next step, or draw your next one.`);
  if(typeof track==="function")track("plays:fromdesigner");
},700);

/* once a team is open: save the practice as the next practice day and open it */
let pbusy=false,seen=0;
const piv=setInterval(async()=>{
  const j=getPlan();if(!j){clearInterval(piv);return;}
  if(pbusy||typeof team==="undefined"||!team||!db||$("#app").hidden){seen=0;return;}
  if(!seen)seen=Date.now();
  if(owner()||(typeof PERM!=="undefined"&&!PERM.plans)||(SETTINGS.sport||"basketball")!=="basketball"){clearInterval(piv);return;}
  if(!drills.length&&Date.now()-seen<4000)return;      // let the team's drills load so we reuse them
  pbusy=true;clearInterval(piv);
  try{
    if(!canWrite)throw new Error("view only");
    const p=j.plan,t=todayISO(),has=d=>plans[d]&&plans[d].blocks&&plans[d].blocks.length;
    const next=PRACTICES.map(x=>x[0]).filter(d=>d>=t);
    const date=next.find(d=>!has(d))||(has(t)?(next[0]||t):t);
    const blocks=[];
    for(const b of p.blocks){
      const nm=String(b.name||"").trim();if(!nm)continue;
      let d=(b.starter&&drills.find(x=>x.id===b.starter))||drills.find(x=>(x.name||"").toLowerCase()===nm.toLowerCase());
      if(!d){const id=uid()+uid(),cat=b.category||"";
        d={id,name:nm,categories:cat?[cat]:[],category:cat,minutes:+b.minutes||10,description:b.description||"",points:b.points||"",createdAt:Date.now()};
        const {id:_,...doc}=d;await db.collection("drills").doc(id).set(doc);if(!drills.some(x=>x.id===id))drills.push(d);}
      blocks.push({id:uid(),drillId:d.id,name:d.name,category:b.category||(d.categories||[])[0]||"",minutes:Math.max(1,Math.min(180,+b.minutes||d.minutes||10)),notes:""});
    }
    const old=plans[date];
    const doc=has(date)?{...old,blocks:old.blocks.concat(blocks)}:{date,start:p.start||practiceTimes(date).start,end:p.end||practiceTimes(date).end,focus:p.focus||"",blocks};
    doc.editedBy=(typeof ME!=="undefined"&&ME&&ME.name)||"";doc.editedAt=Date.now();
    await db.collection("plans").doc(date).set(doc);
    plans[date]=doc;dropPlan();
    setTab("plan");buildDateSelect();$("#planDate").value=date;loadPlan(date);
    note(`Your practice is saved for ${dLabel(date)}. Drag drills to change the order, or tap Run practice when it's time.`);
    if(typeof track==="function")track("plans:fromplanner");
  }catch(e){pbusy=false;}
},700);
function note(t){
  const old=document.getElementById("ppToast");if(old)old.remove();
  const el=document.createElement("div");el.id="ppToast";el.className="msg-toast";el.setAttribute("role","status");
  el.innerHTML=`<b>${H(t)}</b><button type="button" class="icon" aria-label="Dismiss">✕</button>`;
  el.querySelector("button").addEventListener("click",()=>el.remove());document.body.appendChild(el);setTimeout(()=>{if(el.isConnected)el.remove();},12000);
}
})();
