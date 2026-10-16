/* Shared play-board drawing and play-through math.
   Used by the coach app (app.js) and the player playbook page (playbook.html).
   Needs sports.js loaded first and a global SPORT naming the current sport. */
const $=s=>document.querySelector(s);

const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

const VB={x:-30,y:-45,w:560,h:530};

const clone=o=>JSON.parse(JSON.stringify(o));

const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

function qpt(a,t){const u=1-t;return {x:u*u*a.x1+2*u*t*a.cx+t*t*a.x2,y:u*u*a.y1+2*u*t*a.cy+t*t*a.y2};}
function samples(a){
  let pts=[];for(let i=0;i<=40;i++)pts.push(qpt(a,i/40));
  const s=pts[0],e=pts[pts.length-1];
  if(a.from)while(pts.length>3&&dist(pts[1],s)<17)pts.shift();
  if(a.to)while(pts.length>3&&dist(pts[pts.length-2],e)<19)pts.pop();
  return pts;
}
function resample(pts,step){
  const out=[pts[0]];let acc=0;
  for(let i=1;i<pts.length;i++){let a=pts[i-1],b=pts[i],d=dist(a,b);
    while(acc+d>=step){const t=(step-acc)/d;const p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};out.push(p);a=p;d=dist(a,b);acc=0;}
    acc+=d;}
  out.push(pts[pts.length-1]);return out;
}
const poly=pts=>pts.map((p,i)=>(i?"L":"M")+p.x.toFixed(1)+" "+p.y.toFixed(1)).join("");
function arrowHead(pts,col){
  const e=pts[pts.length-1],p=pts[Math.max(0,pts.length-3)];
  const ang=Math.atan2(e.y-p.y,e.x-p.x),L=13,s=.45;
  const a={x:e.x-L*Math.cos(ang-s),y:e.y-L*Math.sin(ang-s)},b={x:e.x-L*Math.cos(ang+s),y:e.y-L*Math.sin(ang+s)};
  return `<path d="M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${e.x.toFixed(1)} ${e.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}Z" style="fill:${col};stroke:${col};stroke-width:1.5;stroke-linejoin:round"/>`;
}
function actSVG(a,col){
  const pts=samples(a), base=`style="fill:none;stroke:${col};stroke-width:3;stroke-linecap:round;stroke-linejoin:round`;
  if(a.type==="cut")return `<path d="${poly(pts)}" ${base}"/>`+arrowHead(pts,col);
  if(a.type==="pass")return `<path d="${poly(pts)}" ${base};stroke-dasharray:9 7"/>`+arrowHead(pts,col);
  if(a.type==="shot")return `<path d="${poly(pts)}" ${base};stroke-width:3.5;stroke-dasharray:0.1 8"/>`+arrowHead(pts,col)+
    `<circle cx="${a.x2}" cy="${a.y2}" r="12" style="fill:none;stroke:${col};stroke-width:2;stroke-dasharray:3 3"/>`;
  if(a.type==="dribble"){
    const r=resample(pts,7), zz=[r[0]];
    for(let i=1;i<r.length-3;i++){const p=r[i-1],q=r[i+1]||r[i];const ang=Math.atan2(q.y-p.y,q.x-p.x)+Math.PI/2,o=(i%2?5.5:-5.5);zz.push({x:r[i].x+o*Math.cos(ang),y:r[i].y+o*Math.sin(ang)});}
    zz.push(...r.slice(-3));
    return `<path d="${poly(zz)}" ${base};stroke-width:2.5"/>`+arrowHead(pts,col);
  }
  if(a.type==="screen"){
    const e=pts[pts.length-1],p=pts[Math.max(0,pts.length-3)],ang=Math.atan2(e.y-p.y,e.x-p.x)+Math.PI/2;
    return `<path d="${poly(pts)}" ${base}"/><path d="M${(e.x+12*Math.cos(ang)).toFixed(1)} ${(e.y+12*Math.sin(ang)).toFixed(1)}L${(e.x-12*Math.cos(ang)).toFixed(1)} ${(e.y-12*Math.sin(ang)).toFixed(1)}" ${base};stroke-width:4"/>`;
  }
  return "";
}
function boardInner(fr,mode,tmp,fade){
  const P=mode==="print";
  const c=P?{out:"#fff",floor:"#fff",line:"#000",o:"#000",ofill:"#fff",d:"#000",act:"#000",ball:"#000",paint:"#fff"}
           :{out:"var(--court-out)",floor:"var(--court)",line:"var(--court-line)",o:"var(--accent)",ofill:"var(--surface)",d:"var(--ink)",act:"var(--ink)",ball:"var(--ball)",paint:"var(--court-paint)"};
  let s=courtSVG(SPORT,c);
  const acts=[...fr.actions];if(tmp)acts.push(tmp);
  s+=`<g style="opacity:${fade?0.3:1}">`+acts.map(a=>actSVG(a,c.act)).join("")+`</g>`;
  fr.tokens.filter(t=>t.kind!=="ball").forEach(t=>{
    if(t.kind==="o")s+=`<g><circle cx="${t.x}" cy="${t.y}" r="15" style="fill:${c.ofill};stroke:${c.o};stroke-width:3"/><text x="${t.x}" y="${t.y+6.5}" text-anchor="middle" style="fill:${c.o};font:700 ${lblSize(t)}px Arial,Helvetica,sans-serif">${esc(t.label||t.n)}</text></g>`;
    else s+=`<text x="${t.x}" y="${t.y+7}" text-anchor="middle" style="fill:${c.d};font:700 20px Arial,Helvetica,sans-serif">X<tspan style="font-size:12px" dy="3">${t.n}</tspan></text>`;
  });
  const b=fr.tokens.find(t=>t.kind==="ball");
  if(b)s+=`<circle cx="${b.x}" cy="${b.y}" r="7.5" style="fill:${c.ball};stroke:${P?"#000":"var(--ink)"};stroke-width:1.5"/>`;
  return s;
}
function lblSize(t){const n=String(t.label||t.n).length;return n>=3?10.5:n===2?14:18;}
function boardSVG(fr,mode,w){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB.x} ${VB.y} ${VB.w} ${VB.h}"${w?` width="${w}" height="${Math.round(w*VB.h/VB.w)}"`:""}>${boardInner(fr,mode)}</svg>`;}


/* Cuts, dribbles and screens move a player; passes and shots only move the ball. */
const isMove=a=>a.type!=="pass"&&a.type!=="shot";
function holderOf(fr){const b=fr.tokens.find(t=>t.kind==="ball");if(!b)return null;let h=null,bd=26;fr.tokens.forEach(t=>{if(t.kind==="o"){const d=dist(b,t);if(d<bd){bd=d;h=t;}}});return h;}

function nextTokens(f){
  const toks=clone(f.tokens),ball=toks.find(t=>t.kind==="ball"),h=holderOf(f);
  f.actions.forEach(a=>{
    if(a.from&&isMove(a)){const t=toks.find(x=>x.id===a.from);if(t){
      if(ball&&h&&h.id===t.id){ball.x=a.x2+13;ball.y=a.y2-13;}
      t.x=a.x2;t.y=a.y2;}}
  });
  f.actions.filter(a=>a.type==="pass").forEach(a=>{
    if(!ball)return;const r=a.to&&toks.find(x=>x.id===a.to);
    if(r){ball.x=r.x+13;ball.y=r.y-13;}else{ball.x=a.x2;ball.y=a.y2;}
  });
  f.actions.filter(a=>a.type==="shot").forEach(a=>{if(ball){ball.x=a.x2;ball.y=a.y2;}});
  return toks;
}

const ease=u=>u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2;

function buildTransition(frames,i){
  const f=frames[i], last=i===frames.length-1;
  const g=last?nextTokens(f):frames[i+1].tokens;
  const paths={};let moves=false;
  f.tokens.forEach(t=>{
    if(t.kind==="ball")return;
    const e=g.find(x=>x.id===t.id);
    if(!e){paths[t.id]=null;return;}
    const a=f.actions.find(a=>a.from===t.id&&isMove(a)&&Math.hypot(a.x2-e.x,a.y2-e.y)<3);
    if(a||dist(t,e)>1)moves=true;
    paths[t.id]=a?(u=>qpt(a,u)):(u=>({x:t.x+(e.x-t.x)*u,y:t.y+(e.y-t.y)*u}));
  });
  const b0=f.tokens.find(t=>t.kind==="ball"),b1=g.find(t=>t.kind==="ball");
  const h=holderOf(f), pass=f.actions.find(a=>a.type==="pass"||a.type==="shot");
  const ballMove=u=>{
    if(!b0)return null;
    if(h&&paths[h.id]){const p=paths[h.id](u);return {x:p.x+(b0.x-h.x),y:p.y+(b0.y-h.y)};}
    return {x:b0.x,y:b0.y};
  };
  let passCurve=null;
  if(b0&&b1){
    const s=ballMove(1);
    if(dist(s,b1)>2){
      let c={x:(s.x+b1.x)/2,y:(s.y+b1.y)/2};
      if(pass){c={x:c.x+(pass.cx-(pass.x1+pass.x2)/2),y:c.y+(pass.cy-(pass.y1+pass.y2)/2)};}
      passCurve={x1:s.x,y1:s.y,cx:c.x,cy:c.y,x2:b1.x,y2:b1.y};
    }
  }
  return {i,f,g,paths,ballMove,passCurve,moves,last,added:g.filter(t=>!f.tokens.some(x=>x.id===t.id))};
}
function animTokens(tr,phase,u){
  const out=[];
  tr.f.tokens.forEach(t=>{
    if(t.kind==="ball")return;
    const p=tr.paths[t.id];
    if(!p){if(phase==="hold")out.push(t);return;}
    const q=phase==="hold"?{x:t.x,y:t.y}:phase==="move"?p(ease(u)):p(1);
    out.push({...t,x:q.x,y:q.y});
  });
  if(phase!=="hold")tr.added.forEach(t=>{if(t.kind!=="ball")out.push(t);});
  let b=null;
  if(phase==="hold")b=tr.f.tokens.find(t=>t.kind==="ball");
  else if(phase==="move")b=tr.ballMove(ease(u));
  else b=tr.passCurve?qpt(tr.passCurve,ease(u)):tr.ballMove(1);
  if(b)out.push({id:"ball",kind:"ball",x:b.x,y:b.y});
  return out;
}

const DUR={hold:1100,move:1500,pass:800,end:900};

/* Pack a playbook into a link (used when there's no server, e.g. demo mode).
   The JSON is compressed and base64url-encoded into the part after "#". */
async function packPlaybook(obj){
  const bytes=new TextEncoder().encode(JSON.stringify(obj));
  let out=bytes,tag="z";
  if(window.CompressionStream){
    out=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer());
  }else tag="j";
  let bin="";for(let i=0;i<out.length;i+=0x8000)bin+=String.fromCharCode.apply(null,out.subarray(i,i+0x8000));
  return tag+btoa(bin).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
async function unpackPlaybook(str){
  const tag=str[0],b64=str.slice(1).replace(/-/g,"+").replace(/_/g,"/");
  const bin=atob(b64+"===".slice((b64.length+3)%4));
  let bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));
  if(tag==="z")bytes=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
  return JSON.parse(new TextDecoder().decode(bytes));
}
/* Only what players need: no plans, drills, staff or schedule. */
function playbookPayload(title,team,playList){
  const st=team.settings||{};
  return {v:1,title,team:{name:team.name,sport:st.sport||"basketball",color:st.color||"#5b2a86",color2:st.color2||"",school:st.school||"",mascot:st.mascot||"",teamLabel:st.teamLabel||""},
    plays:playList.map(p=>({id:p.id,name:p.name,type:p.type,notes:p.notes||"",frames:p.frames.map(compactFrame)}))};
}
/* Whole numbers are plenty for a diagram and keep packed links shorter. */
function compactFrame(f){
  const r=v=>typeof v==="number"?Math.round(v):v;
  return {caption:f.caption||"",
    tokens:f.tokens.map(t=>{const o={id:t.id,kind:t.kind,x:r(t.x),y:r(t.y)};if(t.n)o.n=t.n;if(t.label)o.label=t.label;return o;}),
    actions:f.actions.map(a=>({type:a.type,from:a.from||null,to:a.to||null,x1:r(a.x1),y1:r(a.y1),cx:r(a.cx),cy:r(a.cy),x2:r(a.x2),y2:r(a.y2)}))};
}
