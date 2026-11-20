/* "How can we help?" A short card on Home for new coaches, once they've had a day with the app
   (or opened it a few times). Answers go to send_feedback() in supabase/feedback.sql and show up for
   the owner on Settings → Usage. "Not now" asks again in a week, twice at most. */
(function(){
const KEY="cpp:fb",PICKS=["Planning practices","Drawing plays","The season calendar","Sharing with parents","Game stats","Getting my staff on it"];
const get=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}");}catch(e){return {};}};
const put=o=>{try{localStorage.setItem(KEY,JSON.stringify(o));}catch(e){}};
try{const s=get();s.opens=(s.opens||0)+1;put(s);}catch(e){}
function due(){
  if(typeof HOSTED==="undefined"||!HOSTED||typeof user==="undefined"||!user||typeof sb==="undefined"||!sb)return false;
  try{if(localStorage.getItem("cpp:owner"))return false;}catch(e){}
  const s=get();if(s.done||(s.asks||0)>=3)return false;if(s.snooze&&Date.now()<s.snooze)return false;
  const age=Date.now()-new Date(user.created_at||Date.now()).getTime();
  return age>20*3600e3||(s.opens||0)>=3;
}
const h=t=>String(t==null?"":t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function card(){
  return `<section class="hm-card fb-card" id="fbCard" aria-labelledby="fbT">
    <p class="fb-k">Quick question</p><h3 id="fbT">How can we help you coach?</h3>
    <p class="fb-sub">Tell us what you'd like the app to do better for your team. We read every answer.</p>
    <div class="fb-picks" role="group" aria-label="What do you most want help with?">${PICKS.map(p=>`<label><input type="checkbox" value="${h(p)}"><span>${h(p)}</span></label>`).join("")}</div>
    <label class="fb-l" for="fbMsg">Anything that would make it more useful, or that's in your way?</label>
    <textarea id="fbMsg" rows="3" maxlength="2000" placeholder="e.g. I'd love to print my practice plan with drill diagrams"></textarea>
    <label class="fb-ok"><input type="checkbox" id="fbContact"> It's OK to email me back</label>
    <div class="fb-act"><button type="button" class="btn primary" id="fbSend">Send</button><button type="button" class="btn" id="fbLater">Not now</button><span class="fb-msg" id="fbMsgOut" aria-live="polite"></span></div>
  </section>`;
}
function mount(){
  const home=document.getElementById("homeBody");if(!home||document.getElementById("fbCard")||!due())return;
  if(home.querySelector(".hm-wait"))return;
  home.insertAdjacentHTML("afterbegin",card());
  const s=get();s.asks=(s.asks||0)+(s.shownAt&&Date.now()-s.shownAt<6*864e5?0:1);s.shownAt=s.shownAt&&Date.now()-s.shownAt<6*864e5?s.shownAt:Date.now();put(s);
}
document.addEventListener("click",async e=>{
  if(e.target.closest("#fbLater")){const s=get();s.snooze=Date.now()+7*864e5;s.shownAt=0;put(s);const c=document.getElementById("fbCard");if(c)c.remove();if(typeof track==="function")track("feedback:later");return;}
  const b=e.target.closest("#fbSend");if(!b)return;
  const c=document.getElementById("fbCard"),picks=[...c.querySelectorAll(".fb-picks input:checked")].map(x=>x.value),msg=c.querySelector("#fbMsg").value.trim(),out=c.querySelector("#fbMsgOut");
  if(!picks.length&&!msg){out.textContent="Pick one or write a few words first.";return;}
  b.disabled=true;b.textContent="Sending…";
  const {error}=await sb.rpc("send_feedback",{p_team:(typeof team!=="undefined"&&team&&team.id)||null,p_picks:picks,p_message:msg,p_contact:c.querySelector("#fbContact").checked});
  if(error){b.disabled=false;b.textContent="Send";out.textContent=/function|schema cache|does not exist/i.test(error.message)?"Feedback isn't switched on yet. Thanks for trying!":"Not sent. Check your connection and try again.";return;}
  const s=get();s.done=1;put(s);if(typeof track==="function")track("feedback:sent");
  c.innerHTML=`<p class="fb-k">Thank you</p><h3>Got it. We read every one.</h3><p class="fb-sub">Your answer helps decide what gets built next.</p>`;
  setTimeout(()=>{c.style.transition="opacity .4s";c.style.opacity="0";setTimeout(()=>c.remove(),400);},5000);
});
self.showFeedbackCard=()=>{const home=document.getElementById("homeBody");if(home&&!document.getElementById("fbCard"))home.insertAdjacentHTML("afterbegin",card());};
(()=>{const home=document.getElementById("homeBody");if(!home||!window.MutationObserver)return;let q=0;
  new MutationObserver(()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;mount();});}).observe(home,{childList:true});})();
})();
