/* Try-it practice builder on the public practice planner page (basketball-practice-planner/): search drills,
   add them, drag them into order, set the minutes and see the clock times. "Save this practice" keeps it on
   this device as cpp:pendingPlan; after sign-up the app saves it as the coach's next practice (js/pendingplay.js). */
(function(){
const DRILLS=[
  ["Dynamic Warm-up","Warm-up",8,"Lines baseline to half court and back: high knees, butt kicks, carioca, lunges with twist, defensive slides, backpedal, sprint.","Full effort on every rep. Talk to each other.","starter-dynamic-warmup"],
  ["Two-Ball Dribbling","Ball handling",6,"Each player with two balls: same-time pounds, alternating, high-low, then walking forward and back.","Eyes up. Pound the ball below the waist.","starter-two-ball"],
  ["Mikan Drill","Finishing",5,"Continuous alternating layups under the rim, right hand off the right side, left hand off the left. Count makes in 30 or 60 seconds.","Use the backboard. Keep the ball high.","starter-mikan"],
  ["3-Man Weave","Passing",8,"Three lines on the baseline. Pass and go behind the player you passed to, full court, finish with a layup.","Pass ahead, don't dribble. Sprint the lanes.","starter-3man-weave"],
  ["Form Shooting","Shooting",8,"One-hand form shots close to the rim, then step back a few feet at a time.","Elbow in, hold the follow-through.","starter-form-shooting"],
  ["Partner Shooting","Shooting",8,"One shoots, one rebounds and passes. Switch after five makes or 60 seconds.","Shot ready before the catch.","starter-partner-shooting"],
  ["Shell Drill (4-on-4)","Defense",12,"Four on offense pass around the perimeter; four defenders jump to the ball and move to help on every pass.","Move on the pass, not the catch. Talk.","starter-shell"],
  ["Closeouts","Defense",6,"Start under the rim, sprint to a shooter, chop your feet, high hand, then slide to contain the drive.","Short choppy steps the last few feet.","starter-closeouts"],
  ["Box Out Battle","Rebounding",6,"Coach shoots, defenders find, hit and hold their man, then go get the ball.","Make contact first. Wide base.","starter-box-out"],
  ["Free Throw Sprints","Conditioning",5,"Team shoots free throws in turn. Each miss means a sprint for everybody.","Same routine every time.","starter-ft-sprints"],
  ["Controlled Scrimmage","Scrimmage",15,"5-on-5 with the coach stopping play to teach. Call the sets you ran today.","Run the offense, not just pickup.","starter-scrimmage"],
  ["Zig-Zag Dribble","Ball handling",6,"Dribble full court in a zig-zag, changing direction at each sideline: crossover, between the legs, behind the back.","Plant hard and push off. Change speed.",""],
  ["Stationary Ball Handling","Ball handling",5,"Pound dribbles, figure eights, around the legs, then quick crossovers on the coach's call.","Fingertips, not palms.",""],
  ["2-Line Layups","Finishing",6,"Shooting line and rebounding line at each elbow. Layup off the pass, switch lines.","Two-foot jump stop or proper footwork. Call for the ball.",""],
  ["Power Layups","Finishing",5,"Catch on the block, two-foot power step, finish through contact off the glass.","Chin the ball. Go up strong.",""],
  ["Spot Shooting","Shooting",8,"Five spots around the arc. Make two at each spot before moving on.","Feet set on the catch.",""],
  ["Beat the Pro","Shooting",6,"One shot from a spot: a make is your point, a miss is the pro's two. First to 11.","Game speed. Shoot it like it counts.",""],
  ["Elbow Pull-ups","Shooting",6,"Dribble from the wing to the elbow, pull up for a jump shot. Both sides, both hands.","Stop on balance, then rise.",""],
  ["Partner Passing","Passing",5,"Chest, bounce and overhead passes to a partner, then one-hand push passes off the dribble.","Step into the pass. Hit the target hand.",""],
  ["2-on-1 Fast Break","Transition",8,"Two attack one defender full court. Make the defender commit, then make the right pass.","Wide lanes. Score in two passes or fewer.",""],
  ["3-on-2, 2-on-1","Transition",10,"Three attack two. The shooter and passer sprint back to defend the two who come the other way.","Get back on the turnover.",""],
  ["Defensive Slides","Defense",5,"Zig-zag the length of the court in a stance, sliding to each line and drop-stepping.","Don't cross your feet. Stay low.",""],
  ["Help-Side Rotation","Defense",8,"Offense drives baseline; the help defender rotates to stop it and the next defender rotates behind.","See ball and man. Rotate early.",""],
  ["Rebound and Outlet","Rebounding",6,"Rebound, pivot to the sideline, outlet to the guard who has spaced out wide.","Two hands, chin it, then pivot.",""],
  ["Line Sprints","Conditioning",4,"Sprint to the free throw line and back, half court and back, far free throw line and back, full court and back.","Touch every line.",""],
  ["5-on-0 Half-Court Sets","Offense",10,"Walk through, then run at game speed, each half-court set you'll call this week.","Every cut sharp. Know your spot.",""],
  ["Out-of-Bounds Plays","Offense",8,"Run your baseline and sideline inbounds plays against a scout defense.","Inbounder slaps the ball to start.",""],
  ["Press Break","Offense",8,"Break full-court pressure 5-on-5: inbound, middle flash, ball reversal, attack.","Meet every pass. Don't dribble into traps.",""],
  ["Water Break","Break",3,"","",""]
];
const CATS=["Warm-up","Ball handling","Shooting","Finishing","Passing","Transition","Defense","Rebounding","Offense","Conditioning","Scrimmage","Break"];
const HUE={"Warm-up":"#14897a","Ball handling":"#0f7fa8","Shooting":"#e2672a","Finishing":"#c2410c","Passing":"#b07d0c","Transition":"#2f62d6","Defense":"#b3263a","Rebounding":"#a3487e","Offense":"#6d3bb0","Conditioning":"#2f62d6","Scrimmage":"#2f8a4a","Break":"#8a8794"};
const D=DRILLS.map(([name,cat,min,desc,pts,starter],i)=>({i,name,cat,min,desc,pts,starter}));
const h=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const $=id=>document.getElementById(id);
const list=$("tpList"),res=$("tpRes"),q=$("tpQ"),start=$("tpStart"),sum=$("tpSum"),saveBox=$("tpSave"),chips=$("tpChips");
let uid=0,plan=[0,1,4].map(i=>({k:++uid,d:D[i],min:D[i].min})),cat="",drag=null,flash=null,touched=false;

const toMin=v=>{const [a,b]=String(v||"15:30").split(":").map(Number);return a*60+(b||0);};
const clock=m=>{m=((m%1440)+1440)%1440;const H=Math.floor(m/60),M=m%60;return `${H%12||12}:${String(M).padStart(2,"0")}`;};
const ampm=m=>{m=((m%1440)+1440)%1440;return Math.floor(m/60)<12?"AM":"PM";};

function drawPlan(){
  let t=toMin(start.value);
  list.innerHTML=plan.map((b,i)=>{const a=t;t+=b.min;
    return `<li class="tp-b${drag&&drag.k===b.k?" dragging":""}${flash===b.k?" new":""}" data-k="${b.k}" style="--c:${HUE[b.d.cat]||"#8a8794"}">
      <button type="button" class="tp-grip" data-grip aria-label="Drag ${h(b.d.name)} to move it"><span></span><span></span><span></span></button>
      <div class="tp-when"><b>${clock(a)}</b><span>${clock(t)}</span></div>
      <div class="tp-what"><b>${h(b.d.name)}</b><span>${h(b.d.cat)}</span></div>
      <div class="tp-min" role="group" aria-label="Minutes for ${h(b.d.name)}"><button type="button" data-m="-1" aria-label="One minute less">−</button><output>${b.min}<small>min</small></output><button type="button" data-m="1" aria-label="One minute more">+</button></div>
      <button type="button" class="tp-x" data-x aria-label="Remove ${h(b.d.name)}">✕</button></li>`;}).join("")||`<li class="tp-empty">Search a drill below and tap + to add it.</li>`;
  const tot=plan.reduce((s,b)=>s+b.min,0),end=toMin(start.value)+tot;
  sum.innerHTML=`<span><b>${plan.length}</b> drill${plan.length===1?"":"s"}</span><span><b>${tot}</b> min</span><span>Ends <b>${clock(end)} ${ampm(end)}</b></span>`;
  saveBox.hidden=!touched||!plan.length;
}
function drawRes(){
  const s=q.value.trim().toLowerCase(),inPlan=new Set(plan.map(b=>b.d.i));
  let hits=D.filter(d=>(!cat||d.cat===cat)&&(!s||d.name.toLowerCase().includes(s)||d.cat.toLowerCase().includes(s)||d.desc.toLowerCase().includes(s)));
  hits.sort((a,b)=>(inPlan.has(a.i)-inPlan.has(b.i))||(s?(a.name.toLowerCase().startsWith(s)?0:1)-(b.name.toLowerCase().startsWith(s)?0:1):0));
  res.innerHTML=hits.slice(0,s||cat?12:8).map(d=>`<li style="--c:${HUE[d.cat]}"><button type="button" data-add="${d.i}">
      <span class="tp-r-t"><b>${h(d.name)}</b><span>${h(d.cat)} · ${d.min} min${inPlan.has(d.i)?" · in your plan":""}</span></span><span class="tp-plus" aria-hidden="true">+</span></button></li>`).join("")
    ||`<li class="tp-none">No drill called “${h(q.value.trim())}” here. In the app you can add your own.</li>`;
  chips.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.cat===cat));
}
chips.innerHTML=`<button type="button" data-cat="" aria-pressed="true">All</button>`+CATS.filter(c=>D.some(d=>d.cat===c)).map(c=>`<button type="button" data-cat="${h(c)}" aria-pressed="false">${h(c)}</button>`).join("");
chips.addEventListener("click",e=>{const b=e.target.closest("[data-cat]");if(!b)return;cat=b.dataset.cat;drawRes();});
q.addEventListener("input",drawRes);
start.addEventListener("input",drawPlan);
res.addEventListener("click",e=>{const b=e.target.closest("[data-add]");if(!b)return;const d=D[+b.dataset.add];
  plan.push({k:++uid,d,min:d.min});flash=uid;touched=true;drawPlan();drawRes();setTimeout(()=>{flash=null;},700);
  const li=list.querySelector(`[data-k="${uid}"]`);if(li&&li.getBoundingClientRect().bottom>innerHeight)li.scrollIntoView({block:"nearest",behavior:"smooth"});});
list.addEventListener("click",e=>{const li=e.target.closest("[data-k]");if(!li)return;const b=plan.find(x=>x.k===+li.dataset.k);
  const m=e.target.closest("[data-m]");if(m){b.min=Math.max(1,Math.min(90,b.min+(+m.dataset.m)));touched=true;drawPlan();return;}
  if(e.target.closest("[data-x]")){plan=plan.filter(x=>x!==b);touched=true;drawPlan();drawRes();}});

/* drag a drill by its grip to a new spot */
list.addEventListener("pointerdown",e=>{const g=e.target.closest("[data-grip]");if(!g)return;e.preventDefault();
  const li=g.closest("[data-k]");drag={k:+li.dataset.k,id:e.pointerId};try{list.setPointerCapture(e.pointerId);}catch{}drawPlan();});
list.addEventListener("pointermove",e=>{if(!drag)return;e.preventDefault();
  const items=[...list.querySelectorAll("[data-k]")],from=plan.findIndex(b=>b.k===drag.k);
  let to=items.findIndex(el=>{const r=el.getBoundingClientRect();return e.clientY<r.top+r.height/2;});if(to<0)to=items.length-1;else if(to>from)to--;
  if(to!==from&&to>=0){const [b]=plan.splice(from,1);plan.splice(to,0,b);touched=true;drawPlan();}
  if(e.clientY<60)scrollBy(0,-8);else if(e.clientY>innerHeight-60)scrollBy(0,8);});
const end=()=>{if(!drag)return;drag=null;drawPlan();};
list.addEventListener("pointerup",end);list.addEventListener("pointercancel",end);
/* keyboard: arrow keys on a grip move the drill */
list.addEventListener("keydown",e=>{const g=e.target.closest("[data-grip]");if(!g||!/^Arrow(Up|Down)$/.test(e.key))return;e.preventDefault();
  const k=+g.closest("[data-k]").dataset.k,i=plan.findIndex(b=>b.k===k),j=i+(e.key==="ArrowUp"?-1:1);if(j<0||j>=plan.length)return;
  [plan[i],plan[j]]=[plan[j],plan[i]];touched=true;drawPlan();const ng=list.querySelector(`[data-k="${k}"] [data-grip]`);if(ng)ng.focus();});

/* print it: the same sheet the app makes, simplified */
$("tpPrint").addEventListener("click",()=>{touched=true;drawPlan();window.print();});

/* save it: keep on this device and open the app; after sign-up it becomes their next practice */
function keep(){
  if(!plan.length)return false;
  const s=toMin(start.value),tot=plan.reduce((a,b)=>a+b.min,0),hm=m=>`${String(Math.floor(m/60)%24).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;
  try{localStorage.setItem("cpp:pendingPlan",JSON.stringify({at:Date.now(),plan:{start:hm(s),end:hm(s+tot),focus:($("tpFocus").value||"").trim().slice(0,80),
    blocks:plan.map(b=>({name:b.d.name,category:b.d.cat,minutes:b.min,description:b.d.desc,points:b.d.pts,starter:b.d.starter||null}))}}));}catch(e){return false;}
  return true;
}
saveBox.addEventListener("submit",e=>{e.preventDefault();keep();location.href="/?from=planner";});
document.querySelectorAll('a[href^="/?from="]').forEach(a=>a.addEventListener("click",()=>{if(touched)keep();}));
drawPlan();drawRes();
})();
