/* Run practice: a full-screen, gym-ready view of today's plan for the coach's phone.
   Big drill name, a countdown for the current block, what's next, and the drill notes.
   Follows the clock when practice is happening now; otherwise starts when you tap Start. */
(function(){
const $r=s=>document.querySelector(s);
let R=null;            // {date, i, t0, started, buzzed}
let tick=null, lock=null, el=null;
const KEY=d=>"cpp:run:"+d;
const now=()=>Date.now();
const pad=n=>String(n).padStart(2,"0");
const mmss=s=>{s=Math.max(0,Math.round(s));return Math.floor(s/60)+":"+pad(s%60);};
const todayISO=()=>{const d=new Date();return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());};
const clock=()=>new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
const blocks=()=>(typeof cur!=="undefined"&&cur&&cur.blocks)||[];
function starts(){const s=toMin(cur.start||"16:00");let t=s;return blocks().map(b=>{const a=t;t+=+b.minutes||0;return a;});}
function atMin(iso,m){const [y,mo,d]=iso.split("-").map(Number);return new Date(y,mo-1,d,Math.floor(m/60),m%60).getTime();}
function save(){try{localStorage.setItem(KEY(R.date),JSON.stringify({i:R.i,t0:R.t0,started:R.started}));}catch{}}
function drillOf(b){return b&&b.drillId&&typeof drills!=="undefined"?drills.find(d=>d.id===b.drillId):null;}

function begin(){
  const B=blocks();if(!B.length)return;
  const date=cur.date||todayISO();R={date,i:0,t0:0,started:false,buzzed:-1};
  let saved=null;try{saved=JSON.parse(localStorage.getItem(KEY(date))||"null");}catch{}
  const st=starts(),endM=toMin(cur.start||"16:00")+B.reduce((a,b)=>a+(+b.minutes||0),0);
  if(saved&&saved.started&&saved.i<B.length&&now()-saved.t0<6*3600e3){Object.assign(R,saved);}
  else if(date===todayISO()){
    const nm=new Date().getHours()*60+new Date().getMinutes()+new Date().getSeconds()/60;
    if(nm>=st[0]&&nm<endM){let i=st.length-1;while(i>0&&st[i]>nm)i--;R.i=i;R.t0=atMin(date,st[i]);R.started=true;}
  }
  open();
}

function open(){
  el=document.createElement("div");el.id="runView";el.className="run";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");el.setAttribute("aria-label","Run practice");
  el.innerHTML=`<header class="run-top"><button type="button" class="run-x" data-run="exit" aria-label="Exit">✕</button>
      <div class="run-team"><b>${esc((typeof teamTitle==="function"&&teamTitle())||"Practice")}</b><span>${esc(dayLabel())}</span></div>
      <div class="run-clock" id="runClock"></div></header>
    <div class="run-bar" id="runBar" aria-hidden="true"></div>
    <main class="run-main" id="runMain"></main>
    <footer class="run-foot"><button type="button" class="run-nav" data-run="prev" aria-label="Back one block">‹ Back</button>
      <button type="button" class="run-go" data-run="go" id="runGo"></button>
      <button type="button" class="run-nav" data-run="list" aria-label="See the whole plan">☰ Plan</button></footer>
    <div class="run-list" id="runList" hidden></div>`;
  document.body.appendChild(el);document.body.classList.add("run-on");
  el.addEventListener("click",onClick);
  try{if(matchMedia("(pointer:fine)").matches||!/iP(hone|ad|od)/.test(navigator.userAgent))document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen().catch(()=>{});}catch{}
  wake();document.addEventListener("visibilitychange",wake);document.addEventListener("keydown",onKey);
  draw(true);tick=setInterval(()=>draw(false),250);
  $r("#runGo").focus({preventScroll:true});
}
function close(){
  clearInterval(tick);tick=null;if(el){el.remove();el=null;}document.body.classList.remove("run-on");
  document.removeEventListener("visibilitychange",wake);document.removeEventListener("keydown",onKey);
  try{if(lock){lock.release();lock=null;}}catch{}
  try{if(document.fullscreenElement)document.exitFullscreen();}catch{}
}
async function wake(){try{if(document.visibilityState==="visible"&&navigator.wakeLock&&!lock){lock=await navigator.wakeLock.request("screen");lock.addEventListener("release",()=>{lock=null;});}}catch{}}
function onKey(e){if(e.key==="Escape"){if(!$r("#runList").hidden)$r("#runList").hidden=true;else close();}else if(e.key==="ArrowRight")go(1);else if(e.key==="ArrowLeft")go(-1);else if(e.key===" "&&!R.started){e.preventDefault();start();}}
function dayLabel(){const [y,m,d]=(cur.date||todayISO()).split("-").map(Number);const dt=new Date(y,m-1,d);
  return (cur.date===todayISO()?"Today · ":"")+dt.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})+(cur.focus?" · "+cur.focus:"");}
function start(){R.started=true;R.t0=now();R.buzzed=-1;save();draw(true);}
function go(d){const B=blocks(),n=R.i+d;if(n<0)return;if(n>=B.length){R.i=B.length;R.started=true;save();draw(true);return;}
  R.i=n;R.t0=now();R.started=true;R.buzzed=-1;save();draw(true);}
function onClick(e){
  const t=e.target.closest("[data-run]");if(!t)return;const a=t.dataset.run;
  if(a==="exit")close();else if(a==="prev")go(-1);else if(a==="next")go(1);
  else if(a==="go"){if(!R.started)start();else if(R.i>=blocks().length)close();else go(1);}
  else if(a==="list"){const L=$r("#runList");L.hidden=!L.hidden;if(!L.hidden)drawList();}
  else if(a==="pick"){R.i=+t.dataset.i;R.t0=now();R.started=true;R.buzzed=-1;save();$r("#runList").hidden=true;draw(true);}
  else if(a==="closelist")$r("#runList").hidden=true;
  else if(a==="restart"){R.i=0;R.started=false;try{localStorage.removeItem(KEY(R.date));}catch{}draw(true);}
}
function drawList(){
  const B=blocks(),st=starts();
  $r("#runList").innerHTML=`<div class="run-lh"><b>Today's plan</b><button type="button" class="run-x" data-run="closelist" aria-label="Close list">✕</button></div>
    <ol>${B.map((b,i)=>`<li><button type="button" data-run="pick" data-i="${i}" class="${i===R.i?"on":i<R.i?"done":""}"><span>${fmt(st[i])}</span><b>${esc(b.name)}</b><em>${b.minutes} min</em></button></li>`).join("")}</ol>
    <p class="run-hint">Tap a block to jump to it. Its timer starts now.</p>`;
}
function draw(full){
  if(!el)return;const B=blocks(),st=starts(),i=R.i;
  $r("#runClock").textContent=clock();
  if(full){
    $r("#runBar").innerHTML=B.map((b,k)=>`<i class="${k<i?"done":k===i?"on":""}" style="flex:${Math.max(1,+b.minutes||1)}"></i>`).join("");
    const go=$r("#runGo");
    if(i>=B.length){
      $r("#runMain").innerHTML=`<div class="run-done"><div class="run-kick">Practice done</div><h2>Nice work, Coach.</h2><p>${B.length} blocks, ${B.reduce((a,b)=>a+(+b.minutes||0),0)} minutes.</p>
        <button type="button" class="run-ghost" data-run="restart">Start over</button></div>`;
      go.textContent="Close";go.className="run-go";return;
    }
    const b=B[i],nx=B[i+1],d=drillOf(b);
    const desc=d&&(d.description||"").trim(),pts=d&&(d.points||"").trim();
    $r("#runMain").innerHTML=`
      <div class="run-meta"><span class="run-kick">${R.started?"Now":"First up"} · ${i+1} of ${B.length}</span><span class="run-when">${fmt(st[i])}–${fmt(st[i]+(+b.minutes||0))}</span></div>
      <h2 class="run-name">${esc(b.name)}</h2>
      ${b.category||b.coach?`<div class="run-tags">${b.category?`<span>${esc(b.category)}</span>`:""}${b.coach?`<span>Led by ${esc(b.coach)}</span>`:""}</div>`:""}
      <div class="run-timer" id="runTimer"><b id="runLeft"></b><span id="runLeftL"></span></div>
      <div class="run-sched" id="runSched"></div>
      ${b.notes?`<div class="run-note">${esc(b.notes)}</div>`:""}
      ${desc||pts?`<div class="run-drill">${desc?`<p>${esc(desc).replace(/\n/g,"<br>")}</p>`:""}${pts?`<p class="run-pts"><b>Coaching points</b>${esc(pts)}</p>`:""}</div>`:""}
      <button type="button" class="run-next" data-run="list">${nx?`<span>Up next</span><b>${esc(nx.name)}</b><em>${nx.minutes} min</em>`:`<span>Up next</span><b>End of practice</b><em></em>`}<i aria-hidden="true">☰</i></button>`;
    go.textContent=R.started?(nx?"Next drill":"Finish"):"Start practice";go.className="run-go"+(R.started?"":" big");
  }
  if(i>=B.length)return;
  const b=B[i],len=(+b.minutes||0)*60;
  const left=R.started?len-(now()-R.t0)/1000:len;
  const L=$r("#runLeft"),T=$r("#runTimer");if(!L)return;
  if(left>=0){L.textContent=mmss(left);$r("#runLeftL").textContent=R.started?"left":"min block";T.className="run-timer"+(R.started&&left<=60?" warn":"");}
  else{L.textContent="+"+mmss(-left);$r("#runLeftL").textContent="over";T.className="run-timer over";}
  if(R.started&&left<=0&&R.buzzed!==i){R.buzzed=i;try{navigator.vibrate&&navigator.vibrate([250,120,250]);}catch{}}
  const sc=$r("#runSched");
  if(sc){if(R.started&&R.date===todayISO()){const late=Math.round((R.t0-atMin(R.date,st[i]))/60000);
      sc.textContent=Math.abs(late)<1?"On schedule":late>0?`${late} min behind schedule`:`${-late} min ahead of schedule`;sc.className="run-sched"+(late>=3?" late":"");}
    else sc.textContent="";}
}
self.runPractice=begin;
document.addEventListener("click",e=>{if(e.target.closest("#runPlan"))begin();});
})();
