/* Time in the app, for Settings → Usage. A visit starts when a coach opens the app, or comes back to it
   after 30 minutes away. Only time with the app on screen counts: the seconds add up while it's visible
   and are sent once a minute (and when the coach switches away). Saved by log_visit() in
   supabase/visit-time.sql; nothing is sent until that database step has been run (errors are ignored). */
(function(){
const GAP=30*60*1000, EVERY=60*1000;
const id=()=>(crypto.randomUUID?crypto.randomUUID():"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c==="x"?r:(r&3|8)).toString(16);}));
const installed=()=>{try{return matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;}catch{return false;}};
const ready=()=>typeof HOSTED!=="undefined"&&HOSTED&&typeof sb!=="undefined"&&sb&&typeof user!=="undefined"&&user&&typeof team!=="undefined"&&team;
let visit=null, shownAt=null, pending=0, hiddenAt=null, off=false;

function bank(){if(shownAt){pending+=Date.now()-shownAt;shownAt=document.visibilityState==="visible"?Date.now():null;}}
function send(){
  if(off||!ready())return;bank();
  const secs=Math.round(pending/1000);if(!visit||secs<1)return;pending-=secs*1000;
  sb.rpc("log_visit",{p_id:visit,p_team:team.id,p_add:Math.min(secs,120),p_installed:installed()})
    .then(r=>{if(r&&r.error&&/function|schema cache|does not exist/i.test(r.error.message))off=true;},()=>{});
}
function start(){visit=id();pending=0;shownAt=Date.now();}
document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="visible"){
    if(!visit||(hiddenAt&&Date.now()-hiddenAt>GAP))start();else shownAt=Date.now();
    hiddenAt=null;
  }else{send();shownAt=null;hiddenAt=Date.now();}
});
window.addEventListener("pagehide",send);
if(document.visibilityState==="visible")start();
setInterval(()=>{if(document.visibilityState==="visible")send();},EVERY);
})();
