/* A play drawn on the public play designer page (basketball-play-designer/, js/designer-demo.js) is kept on
   this device as cpp:pendingPlay. Signed-out visitors who arrive from it go straight to "Create account",
   with their play shown on the card. Once a team is open (sign-up and email confirmation can reload the
   page), the play is saved to that team's play library and opened, so the coach's first play is already there. */
(function(){
const KEY="cpp:pendingPlay",DAYS=14;
const get=()=>{try{const j=JSON.parse(localStorage.getItem(KEY)||"null");
  if(!j||!j.play||!Array.isArray(j.play.frames)||!j.play.frames.length||Date.now()-j.at>DAYS*864e5){localStorage.removeItem(KEY);return null;}return j;}catch(e){return null;}};
const drop=()=>{try{localStorage.removeItem(KEY);}catch(e){}};
const owner=()=>{try{return !!localStorage.getItem("cpp:owner");}catch(e){return false;}};
const fromDesigner=new URLSearchParams(location.search).get("from")==="designer";

/* the sign-up card: "Your play is ready to save" with a small picture of it */
function banner(){
  const j=get(),box=document.getElementById("joinInvite");
  if(!j||!box||(typeof JOIN!=="undefined"&&JOIN))return;
  let pic="";try{pic=`<svg class="pp-thumb" viewBox="-30 -45 560 530" aria-hidden="true">${boardInner(withDefense(j.play.frames[0],j.play.frames[0].defense||null),"screen")}</svg>`;}catch(e){}
  const n=(j.play.name||"").trim();
  box.hidden=false;box.className="join-invite pp-card";
  box.innerHTML=`${pic}<div><small>Your play is ready to save</small><b>${n?String(n).replace(/[&<>"]/g,""):"Your play"}</b><span>Create a free account and it goes straight into your team's playbook. Already have one? Sign in.</span></div>`;
}
/* arriving from the designer page, signed out: open "Create account" instead of the homepage */
self.pendingPlayWelcome=function(){
  if(!fromDesigner||!get()||typeof authTab!=="function")return false;
  show("screen-auth");authTab("up");banner();
  if(typeof track==="function")track("designer:signup");
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
})();
