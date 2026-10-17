/* Player playbook page: read-only, no sign-in.
   Opens either ?pb=<share id> (hosted app) or #<packed data> (link with the plays inside it). */
const CFG=window.APP_CONFIG||{};
let SPORT="basketball", BOOK=null, cur=null, step=0, anim=null, filter="";
const show=(id,on)=>{$(id).hidden=!on;};

async function load(){
  const params=new URLSearchParams(location.search), hash=location.hash.slice(1);
  try{
    if(params.get("preview")){
      BOOK=JSON.parse(localStorage.getItem("cpp:previewBook")||"null");
      if(!BOOK)return fail("Nothing to preview. Go back to the planner and tap Share with players.");
      $("#pbPreviewBar").hidden=false;
    }else if(params.get("pb")){
      if(!(CFG.supabaseUrl&&CFG.supabaseAnonKey&&window.supabase))throw new Error("This playbook link needs the hosted app.");
      const sb=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey,{auth:{persistSession:false}});
      const {data,error}=await sb.rpc("get_playbook",{p_id:params.get("pb")});
      if(error)throw error;
      if(!data)return fail("This playbook link has been turned off or doesn't exist. Ask your coach for a new one.");
      BOOK=data;
    }else if(hash){BOOK=await unpackPlaybook(hash);}
    else return fail("No playbook in this link. Ask your coach to send it again.");
  }catch(e){return fail("This playbook couldn't be opened. Check your connection, or ask your coach for a new link.");}
  start();
}
function fail(text){show("#pbLoading",false);$("#pbError").textContent=text;show("#pbError",true);}

function start(){
  const t=BOOK.team||{};
  SPORT=SPORTS[t.sport]?t.sport:"basketball";
  document.documentElement.style.setProperty("--team",t.color||"#5b2a86");
  if(t.color2){document.documentElement.style.setProperty("--team2",t.color2);document.documentElement.classList.add("has-c2");}
  if(t.logo){const im=$("#pbLogo");im.src=t.logo;im.hidden=false;const fav=document.querySelector('link[rel="icon"]');if(fav)fav.href=t.logo;}
  document.querySelector('meta[name="theme-color"]').content=t.color||"#5b2a86";
  $("#pbEyebrow").textContent=[t.school&&t.mascot?t.school+" "+t.mascot:t.name,t.teamLabel].filter(Boolean).join(" · ");
  $("#pbTitle").textContent=BOOK.title||"Playbook";
  document.title=`${BOOK.title||"Playbook"} · ${t.name||"Team"}`;
  BOOK.plays=(BOOK.plays||[]).filter(p=>p.frames&&p.frames.length);
  $("#pbCount").textContent=`${BOOK.plays.length} play${BOOK.plays.length===1?"":"s"}`;
  const L=SPORTS[SPORT].tools;
  $("#pbLegend").textContent="Key: "+[`solid arrow = ${L.cut.toLowerCase()}`,`dashed arrow = ${L.pass.toLowerCase()}`,L.dribble&&`zigzag = ${L.dribble.toLowerCase()}`,L.screen&&`line with a bar = ${L.screen.toLowerCase()}`,L.shot&&`dotted arc = ${L.shot.toLowerCase()}`].filter(Boolean).join(" · ");
  show("#pbLoading",false);show("#pbApp",true);
  renderList();
  const want=new URLSearchParams(location.search).get("play");
  if(want){const i=BOOK.plays.findIndex(p=>p.id===want);if(i>=0)openPlay(i);}
}

/* ---------- list ---------- */
function renderList(){
  const types=[...new Set(BOOK.plays.map(p=>p.type||"Plays"))];
  $("#pbTypes").innerHTML=types.length>1?[`<button aria-pressed="${!filter}" data-type="">All</button>`,...types.map(t=>`<button aria-pressed="${filter===t}" data-type="${esc(t)}">${esc(t)}</button>`)].join(""):"";
  const q=$("#pbSearch").value.trim().toLowerCase();
  const list=BOOK.plays.map((p,i)=>({p,i})).filter(({p})=>(!filter||(p.type||"Plays")===filter)&&(!q||(p.name+" "+(p.type||"")+" "+(p.notes||"")).toLowerCase().includes(q)));
  if(!list.length){$("#pbList").innerHTML=`<p class="help">No plays match.</p>`;return;}
  const groups={};list.forEach(x=>{(groups[x.p.type||"Plays"]=groups[x.p.type||"Plays"]||[]).push(x);});
  $("#pbList").innerHTML=Object.entries(groups).map(([type,items])=>`<div class="pb-group">${esc(type)}</div><div class="pb-list">`+
    items.map(({p,i})=>`<button class="pb-card" data-open="${i}">${boardSVG(p.frames[0],"screen")}<span><b>${esc(p.name)}</b><small>${p.frames.length} step${p.frames.length>1?"s":""}</small></span></button>`).join("")+`</div>`).join("");
}
$("#pbTypes").addEventListener("click",e=>{const b=e.target.closest("[data-type]");if(!b)return;filter=b.dataset.type;renderList();});
$("#pbSearch").addEventListener("input",renderList);
$("#pbList").addEventListener("click",e=>{const b=e.target.closest("[data-open]");if(b)openPlay(+b.dataset.open);});

/* ---------- one play ---------- */
function openPlay(i){
  stopRun();cur=i;step=0;
  const p=BOOK.plays[i];
  $("#pbName").textContent=p.name;$("#pbPlayType").textContent=p.type||"";
  $("#pbNotes").textContent=p.notes||"";
  $("#pbPrevPlay").disabled=i===0;$("#pbNextPlay").disabled=i===BOOK.plays.length-1;
  show("#pbListView",false);show("#pbPlayView",true);window.scrollTo(0,0);
  renderStep();
}
function renderStep(){
  const p=BOOK.plays[cur],f=p.frames[step];
  $("#pbBoard").innerHTML=boardInner(f,"screen");
  $("#pbSteps").innerHTML=p.frames.length>1?p.frames.map((_,k)=>`<button class="step" aria-pressed="${k===step}" data-step="${k}">Step ${k+1}</button>`).join(""):"";
  $("#pbCap").innerHTML=`<b>Step ${step+1} of ${p.frames.length}</b>${esc(f.caption||"")}`;
  $("#pbPrev").disabled=step===0;$("#pbNext").disabled=step===p.frames.length-1;
}
$("#pbSteps").addEventListener("click",e=>{const b=e.target.closest("[data-step]");if(!b)return;stopRun();step=+b.dataset.step;renderStep();});
$("#pbPrev").addEventListener("click",()=>{stopRun();if(step>0){step--;renderStep();}});
$("#pbNext").addEventListener("click",()=>{stopRun();if(step<BOOK.plays[cur].frames.length-1){step++;renderStep();}});
$("#pbBack").addEventListener("click",()=>{stopRun();show("#pbPlayView",false);show("#pbListView",true);});
$("#pbPrevPlay").addEventListener("click",()=>{if(cur>0)openPlay(cur-1);});
$("#pbNextPlay").addEventListener("click",()=>{if(cur<BOOK.plays.length-1)openPlay(cur+1);});

/* swipe left/right on the diagram to change steps */
let sx=null;
$("#pbBoard").addEventListener("touchstart",e=>{sx=e.touches[0].clientX;},{passive:true});
$("#pbBoard").addEventListener("touchend",e=>{if(sx===null)return;const dx=e.changedTouches[0].clientX-sx;sx=null;
  if(Math.abs(dx)<50)return;stopRun();const n=BOOK.plays[cur].frames.length;step=Math.max(0,Math.min(n-1,step+(dx<0?1:-1)));renderStep();},{passive:true});

/* ---------- play through ---------- */
function stopRun(){if(!anim)return;anim=null;$("#pbRun").textContent="▶ Play through";}
$("#pbRun").addEventListener("click",()=>{
  if(anim&&!anim.done){if(anim.paused){anim.paused=false;anim.last=performance.now();$("#pbRun").textContent="❚❚ Pause";requestAnimationFrame(tick);}else{anim.paused=true;$("#pbRun").textContent="▶ Resume";}return;}
  const frames=BOOK.plays[cur].frames,s0=anim&&anim.done?0:step;
  anim={i:s0,phase:"hold",t:0,tr:buildTransition(frames,s0),last:performance.now(),paused:false};
  step=s0;renderStep();$("#pbRun").textContent="❚❚ Pause";requestAnimationFrame(tick);
});
function tick(now){
  if(!anim||anim.paused)return;
  anim.t+=now-anim.last;anim.last=now;
  const tr=anim.tr,frames=BOOK.plays[cur].frames;
  const dur=anim.phase==="move"?(tr.moves?(tr.moveDur||DUR.move):0):anim.phase==="pass"?(tr.passCurve?DUR.pass:0):anim.phase==="end"?DUR.end:DUR.hold;
  if(anim.t>=dur){
    anim.t=0;
    if(anim.phase==="hold")anim.phase="move";
    else if(anim.phase==="move")anim.phase="pass";
    else if(anim.phase==="pass"){
      if(tr.last)anim.phase="end";
      else{anim.i++;step=anim.i;anim.tr=buildTransition(frames,anim.i);anim.phase="hold";renderStep();}
    }else{
      $("#pbBoard").innerHTML=boardInner({tokens:animTokens(tr,"pass",1),actions:[]},"screen");
      anim.done=true;anim.paused=true;$("#pbRun").textContent="↻ Watch again";return;
    }
    requestAnimationFrame(tick);return;
  }
  const u=dur?anim.t/dur:1;
  $("#pbBoard").innerHTML=boardInner({tokens:animTokens(tr,anim.phase,u),actions:tr.f.actions},"screen",null,anim.phase!=="hold");
  requestAnimationFrame(tick);
}

load();
