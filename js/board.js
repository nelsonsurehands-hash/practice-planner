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
  if(a.type==="pass")a={...a,cx:(a.x1+a.x2)/2,cy:(a.y1+a.y2)/2};   // passes are always straight
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
function boardInner(fr,mode,tmp,fade,ghost){
  const P=mode==="print";
  const c=P?{out:"#fff",floor:"#fff",line:"#000",o:"#000",ofill:"#fff",d:"#000",act:"#000",ball:"#000",paint:"#fff"}
           :{out:"var(--court-out)",floor:"var(--court)",line:"var(--court-line)",o:"var(--accent)",ofill:"var(--surface)",d:"var(--ink)",act:"var(--ink)",ball:"var(--ball)",paint:"var(--court-paint)"};
  let s=courtSVG(SPORT,c);
  if(ghost&&ghost.length)s+=`<g style="opacity:.22">`+ghost.map(a=>actSVG(a,c.act)).join("")+`</g>`;
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
  const b0=f.tokens.find(t=>t.kind==="ball"),b1=g.find(t=>t.kind==="ball"),h=holderOf(f);
  const hasTok=id=>f.tokens.some(x=>x.id===id);
  const anyMove=f.tokens.some(t=>{if(t.kind==="ball")return false;const e=g.find(x=>x.id===t.id);return e&&dist(t,e)>1;});

  /* Ball events in order: the passes, then a shot. */
  const events=f.actions.filter(a=>a.type==="pass").concat(f.actions.filter(a=>a.type==="shot"));
  const off0=b0&&h?{x:b0.x-h.x,y:b0.y-h.y}:{x:13,y:-13};
  const start0=b0?(h?{id:h.id,first:true}:{pt:{x:b0.x,y:b0.y}}):null;
  /* No pass drawn but the next step has the ball somewhere else: fly it there. */
  if(b0&&b1&&!events.length){
    const hd=h&&f.actions.find(a=>a.from===h.id&&isMove(a));
    const e=h?(hd?{x:hd.x2+13,y:hd.y2-13}:{x:b0.x,y:b0.y}):{x:b0.x,y:b0.y};
    if(dist(e,b1)>2)events.push({type:"pass",to:null,x1:e.x,y1:e.y,x2:b1.x,y2:b1.y,cx:(e.x+b1.x)/2,cy:(e.y+b1.y)/2});
  }

  /* Timeline (0..1). Passes happen DURING the movement, not after it: each ball event gets an equal
     slice and flies in the back half of it. A cutter who receives a pass finishes the cut right as the
     ball arrives; a player who catches and then dribbles starts after the catch; the starting ball
     handler drives first, then passes. Everyone else moves across the whole step. */
  const k=events.length,L=anyMove?0.5:0;
  const win=events.map((a,n)=>({s:(n+L)/Math.max(k,1),e:(n+1)/Math.max(k,1)}));
  const recv=id=>events.findIndex(a=>a.type==="pass"&&a.to===id);
  const sends=(id,after)=>events.findIndex((a,n)=>n>after&&a.from===id);
  const windowFor=(id,act)=>{
    if(!k||!act)return [0,1];
    const r=recv(id);
    if(r>=0){
      if(act.type==="dribble"){const nx=sends(id,r);return [win[r].e,nx>=0?win[nx].s:1];}
      return [0,win[r].e];
    }
    if(h&&id===h.id){const nx=sends(id,-1);if(nx>=0)return [0,Math.max(win[nx].s,.05)];}
    return [0,1];
  };
  const paths={};let moves=false;
  f.tokens.forEach(t=>{
    if(t.kind==="ball")return;
    const e=g.find(x=>x.id===t.id);
    if(!e){paths[t.id]=null;return;}
    const a=f.actions.find(a=>a.from===t.id&&isMove(a)&&Math.hypot(a.x2-e.x,a.y2-e.y)<3);
    if(a||dist(t,e)>1)moves=true;
    const raw=a?(v=>qpt(a,v)):(v=>({x:t.x+(e.x-t.x)*v,y:t.y+(e.y-t.y)*v}));
    const [w0,w1]=windowFor(t.id,a);
    paths[t.id]=u=>raw(ease(Math.min(1,Math.max(0,(u-w0)/((w1-w0)||1)))));   // u is raw step time
  });
  const posAt=(id,u)=>{const p=paths[id];if(p)return p(u);const t=f.tokens.find(x=>x.id===id);return t?{x:t.x,y:t.y}:null;};
  const holderMoves=!!(h&&paths[h.id]&&f.actions.some(a=>a.from===h.id&&isMove(a)));
  const carry=(c,u)=>{
    if(!c)return null;
    if(c.pt)return c.pt;
    const p=posAt(c.id,u);if(!p)return null;
    let o={x:13,y:-13};
    if(c.first){if(holderMoves){const [w0,w1]=windowFor(h.id,f.actions.find(a=>a.from===h.id&&isMove(a)));const v=Math.min(1,Math.max(0,(u-w0)/((w1-w0)||1)));o={x:off0.x+(13-off0.x)*v,y:off0.y+(-13-off0.y)*v};}else o=off0;}
    return {x:p.x+o.x,y:p.y+o.y};
  };
  const ballAt=u=>{
    if(!b0)return null;
    let c=start0;
    for(let n=0;n<k;n++){
      const a=events[n],{s:s0,e:e0}=win[n];
      const toId=a.type==="pass"&&a.to&&hasTok(a.to)?a.to:null;
      if(u<s0)return carry(c,u);
      if(u<e0){
        const A=carry(c,s0)||{x:a.x1,y:a.y1},B=toId?carry({id:toId},u):{x:a.x2,y:a.y2},v=ease((u-s0)/((e0-s0)||1));
        const bend=a.type==="shot"?{x:a.cx-(a.x1+a.x2)/2,y:a.cy-(a.y1+a.y2)/2}:{x:0,y:0};
        return qpt({x1:A.x,y1:A.y,cx:(A.x+B.x)/2+bend.x,cy:(A.y+B.y)/2+bend.y,x2:B.x,y2:B.y},v);
      }
      c=toId?{id:toId}:{pt:{x:a.x2,y:a.y2}};
    }
    return carry(c,u);
  };
  return {i,f,g,paths,ballAt,ballMove:ballAt,passCurve:null,moves:moves||!!(b0&&k),
    moveDur:DUR.move*Math.max(1,0.5+0.5*k),last,added:g.filter(t=>!f.tokens.some(x=>x.id===t.id))};
}
function animTokens(tr,phase,u){
  const out=[];
  tr.f.tokens.forEach(t=>{
    if(t.kind==="ball")return;
    const p=tr.paths[t.id];
    if(!p){if(phase==="hold")out.push(t);return;}
    const q=phase==="hold"?{x:t.x,y:t.y}:phase==="move"?p(u):p(1);
    out.push({...t,x:q.x,y:q.y});
  });
  if(phase!=="hold")tr.added.forEach(t=>{if(t.kind!=="ball")out.push(t);});
  let b=null;
  if(phase==="hold")b=tr.f.tokens.find(t=>t.kind==="ball");
  else if(phase==="move")b=tr.ballAt(u);
  else b=tr.ballAt(1);
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
  const extra={};["fid","opt","optName","from"].forEach(k=>{if(f[k])extra[k]=f[k];});
  return {...extra,caption:f.caption||"",
    tokens:f.tokens.map(t=>{const o={id:t.id,kind:t.kind,x:r(t.x),y:r(t.y)};if(t.n)o.n=t.n;if(t.label)o.label=t.label;return o;}),
    actions:f.actions.map(a=>({type:a.type,from:a.from||null,to:a.to||null,x1:r(a.x1),y1:r(a.y1),cx:r(a.cx),cy:r(a.cy),x2:r(a.x2),y2:r(a.y2)}))};
}

/* ---------- options (branches of a play) ----------
   A play has a main line of steps. An option is a branch of extra steps that starts from the end of
   one main step. Option steps are stored in the same frames list, marked {opt, optName, from}, where
   "from" is the fid of the main step they branch from. Old plays with no options are unchanged. */
function playLines(frames){
  const main=[],byId={},order=[];
  frames.forEach((f,i)=>{
    if(f.opt){if(!byId[f.opt]){byId[f.opt]={id:f.opt,name:f.optName||"",from:f.from,steps:[]};order.push(f.opt);}byId[f.opt].steps.push(i);}
    else main.push(i);
  });
  const options=order.map((id,n)=>{
    const o=byId[id];let b=main.findIndex(i=>frames[i].fid&&frames[i].fid===o.from);if(b<0)b=main.length-1;
    const letter=String.fromCharCode(65+n);
    return {...o,branch:b,letter,title:`Option ${letter}${o.name?": "+o.name:""}`};
  });
  return {main,options};
}
function optionOf(frames,lines,i){const f=frames[i];return f&&f.opt?lines.options.find(o=>o.id===f.opt)||null:null;}
/* The frame indexes you see when playing a line: the main steps, or the main steps up to the branch then the option. */
function lineIdx(lines,opt){return opt?lines.main.slice(0,opt.branch+1).concat(opt.steps):lines.main.slice();}
function stepName(frames,lines,i){
  const o=optionOf(frames,lines,i);
  if(!o){const k=lines.main.indexOf(i);return {short:`Step ${k+1}`,long:`Step ${k+1} of ${lines.main.length}`,opt:null};}
  const k=o.steps.indexOf(i);
  return {short:`${o.letter}${k+1}`,long:`${o.title} · step ${k+1} of ${o.steps.length}`,where:`branches off after step ${o.branch+1}`,opt:o};
}
/* Display order: main steps, then each option's steps. */
function displayOrder(lines){return lines.main.concat(...lines.options.map(o=>o.steps));}
