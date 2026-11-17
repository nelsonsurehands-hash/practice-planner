/* Plays tab → Common plays: well-known basketball sets (Horns, Flex, 1-4 High, zone offense, press break,
   out-of-bounds plays…) with how-to notes. Watch one run, then add it to your playbook or open it in the
   designer to change it. The plays come from js/playlib.js, built from the same data as the public pages
   on theextracoach.com/basketball/plays/, so the app and the website always match. */
(function(){
const LIB=()=>window.PLAY_LIBRARY||[];
const btn=document.getElementById("pCommon");if(!btn)return;
let dlg=null,cur=null,step=0,anim=null;
const isBB=()=>(typeof SPORT==="string"?SPORT:"basketball")==="basketball";
function showBtn(){btn.hidden=!isBB()||!LIB().length;}
const thumb=f=>`<svg viewBox="${VB.x} ${VB.y} ${VB.w} ${VB.h}" class="cl-thumb" aria-hidden="true">${boardInner(withDefense(f,f.defense),"screen")}</svg>`;
const notesOf=p=>[p.when&&`When to use it: ${p.when}`,p.points.length&&"Coaching points:\n"+p.points.map(x=>"• "+x).join("\n"),
  p.reads.length&&"Reads:\n"+p.reads.map(x=>"• "+x).join("\n")].filter(Boolean).join("\n\n");
const mine=p=>typeof plays!=="undefined"&&plays.find(x=>(x.name||"").trim().toLowerCase()===p.name.toLowerCase());

function open(){
  if(!dlg){dlg=document.createElement("dialog");dlg.className="cl-dlg";document.body.appendChild(dlg);
    dlg.addEventListener("click",onClick);dlg.addEventListener("close",()=>{anim=null;});}
  list();if(!dlg.open)dlg.showModal();if(window.track)track("plays:common");
}
function list(){
  anim=null;cur=null;
  dlg.innerHTML=`<div class="dlg"><div class="cl-top"><div><small class="hm-k">Common plays</small><h2>Well-known sets, ready to run</h2></div><button class="icon" type="button" data-cl="close" aria-label="Close">✕</button></div>
    <p class="help" style="margin:0 0 12px">Watch any play run step by step and read how to teach it. Add it to your playbook as it is, or open it in the designer and make it yours.</p>
    <div class="cl-grid">${LIB().map(p=>`<button type="button" class="cl-card" data-cl="pick" data-id="${p.id}">${thumb(p.frames[0])}<span><b>${esc(p.name)}</b><small>${esc(p.type)}</small>${mine(p)?`<em>In your playbook</em>`:""}</span></button>`).join("")}</div></div>`;
}
function detail(id){
  cur=LIB().find(p=>p.id===id);if(!cur)return;step=0;anim=null;
  const p=cur,can=typeof PERM==="undefined"||PERM.plays,have=mine(p);
  dlg.innerHTML=`<div class="dlg cl-detail"><div class="cl-top"><button class="btn" type="button" data-cl="back">‹ All plays</button><button class="icon" type="button" data-cl="close" aria-label="Close">✕</button></div>
    <small class="hm-k">${esc(p.type)} · ${esc(p.level)}</small><h2 class="cl-name">${esc(p.name)}</h2>
    <div class="cl-cols"><div class="cl-player">
      <div class="cl-board"><svg viewBox="${VB.x} ${VB.y} ${VB.w} ${VB.h}" id="clSvg" role="img" aria-label="${esc(p.name)} diagram"></svg></div>
      <div class="cl-ctrl"><button class="btn primary" type="button" data-cl="run" id="clRun">▶ Watch it run</button>
        <span class="cl-steps">${p.frames.map((_,i)=>`<button type="button" class="btn" data-cl="step" data-i="${i}" aria-pressed="${i===0}">${i+1}</button>`).join("")}</span></div>
      <p class="cl-cap" id="clCap" aria-live="polite"></p></div>
    <div class="cl-info"><p>${esc(p.intro)}</p>
      ${p.when?`<h3>When to use it</h3><p>${esc(p.when)}</p>`:""}
      <h3>Coaching points</h3><ul>${p.points.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
      ${p.reads.length?`<h3>Reads</h3><ul>${p.reads.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}</div></div>
    <div class="actions cl-acts">${can?`<button class="btn primary" type="button" data-cl="add">${have?"Add another copy":"Add to my playbook"}</button><button class="btn" type="button" data-cl="edit">Open in the designer</button>`:`<span class="help">You have view-only access to this team's plays.</span>`}
      <a class="linkbtn" href="${esc(p.url)}" target="_blank" rel="noopener">Share the how-to page ↗</a></div>
    ${have?`<p class="help" style="margin:6px 0 0">“${esc(have.name)}” is already in your playbook.</p>`:""}</div>`;
  show(0);
}
const svgEl=()=>document.getElementById("clSvg");
function draw(fr,fade){const s=svgEl();if(s)s.innerHTML=boardInner(fr,"screen",null,fade);}
function show(i){
  step=i;const f=cur.frames[i];draw(withDefense(f,playDefense(cur.frames)));
  const c=document.getElementById("clCap");if(c)c.innerHTML=`<b>Step ${i+1} of ${cur.frames.length}</b> ${esc(f.caption||"")}`;
  dlg.querySelectorAll("[data-cl=step]").forEach(b=>b.setAttribute("aria-pressed",+b.dataset.i===i));
}
/* The same play-through as the public pages (js/showcase.js) and the editor: hold, move, pass, next step. */
function run(){
  const frames=cur.frames,sch=playDefense(frames),rb=document.getElementById("clRun");
  anim={i:0,frames,opt:null,phase:"hold",t:0,tr:buildTransition(frames,0),last:performance.now(),paused:false,sch};
  show(0);rb.textContent="❚❚ Pause";requestAnimationFrame(tick);
}
function tick(now){
  const a=anim;if(!a||a.paused||!dlg.open)return;const rb=document.getElementById("clRun");
  const dtv=now-a.last;a.t+=dtv;a.last=now;const tr=a.tr,D=DUR;
  const dur=a.phase==="move"?(tr.moves?(tr.moveDur||D.move):0):a.phase==="pass"?(tr.passCurve?D.pass:0):a.phase==="end"?D.end:D.hold*0.7;
  if(a.t>=dur){a.t=0;
    if(a.phase==="hold")a.phase="move";
    else if(a.phase==="move")a.phase="pass";
    else if(a.phase==="pass"){if(tr.last)a.phase="end";else{a.i++;a.tr=buildTransition(a.frames,a.i);a.phase="hold";show(a.i);}}
    else{draw({tokens:animDefense(a,animTokens(tr,"pass",1),400,a.sch),actions:[]});a.done=true;a.paused=true;if(rb)rb.textContent="↻ Watch again";return;}
    requestAnimationFrame(tick);return;}
  const u=dur?a.t/dur:1;
  draw({tokens:animDefense(a,animTokens(tr,a.phase,u),dtv,a.sch),actions:tr.f.actions},a.phase!=="hold");
  requestAnimationFrame(tick);
}
/* Put the play in the editor as a new, unsaved play (the same way a play copied from another coach comes in). */
function toEditor(save){
  const p=cur,go=async()=>{
    dlg.close();setTab("plays");
    play={id:null,name:p.name,type:sp().playTypes.includes(p.type)?p.type:(sp().playTypes.find(t=>/offense/i.test(t)&&/half/i.test(t))||sp().playTypes[0]),
      notes:notesOf(p),frames:JSON.parse(JSON.stringify(p.frames)),from:"library:"+p.id};
    fi=0;hist=[];pdirty=true;PLAY_LOCK=false;renderEditor();renderPlayLib();scrollTo(0,0);
    if(window.track)track(save?"plays:common-add":"plays:common-edit");
    if(save){const ok=await savePlay();pflash(ok?`“${p.name}” is in your playbook. Change anything you like; your copy is yours.`:`“${p.name}” is open. Tap Save play to keep it.`);}
    else{$("#pStatus").textContent="From Common plays · not saved yet";pflash(`“${p.name}” is open in the designer. Change anything, then tap Save play to keep it.`);}
  };
  if(window.guardPlay&&!guardPlay(go))return;go();
}
function onClick(e){
  if(e.target===dlg){dlg.close();return;}
  const b=e.target.closest("[data-cl]");if(!b)return;const k=b.dataset.cl;
  if(k==="close")dlg.close();
  if(k==="pick")detail(b.dataset.id);
  if(k==="back")list();
  if(k==="step"){anim=null;const rb=document.getElementById("clRun");if(rb)rb.textContent="▶ Watch it run";show(+b.dataset.i);}
  if(k==="run"){if(anim&&!anim.done){anim.paused=!anim.paused;if(!anim.paused){anim.last=performance.now();requestAnimationFrame(tick);}b.textContent=anim.paused?"▶ Resume":"❚❚ Pause";return;}run();}
  if(k==="add")toEditor(true);
  if(k==="edit")toEditor(false);
}
btn.addEventListener("click",open);
showBtn();
const prev=window.onSportChange;window.onSportChange=function(){if(prev)prev.apply(this,arguments);showBtn();};
setInterval(showBtn,3000);
window.openCommonPlays=open;
})();
