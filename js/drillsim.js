/* Drill simulator: animated drills on a half court or a full court.
   A drill's sim is written in feet, with the basket a coach faces at the left end (5.25, 25):
     x = 0 baseline … 47 half-court line … 94 far baseline,  y = 0 … 50 sideline to sideline.
   Half-court drills draw portrait (basket at the top, like the play board). Full-court drills draw
   landscape on wide screens and portrait (left basket at the top) on narrow ones.

   sim = { court:"half"|"full", cast:[{id,t:"o"|"d"|"c"|"cone",x,y,n?}], balls:[{id,on:playerId}|{id,x,y}],
           beats:[{cap, hold?, acts:[…]}] }
   Actions in a beat run together (each may start late with `at`, ms):
     {m:id, to:[x,y]|path:[[x,y]…], pace?:"walk"|"jog"|"run"|"sprint"|"slide"|"back", t?, at?, face?:[x,y]|id, quiet?, screen?}
         A player with the ball dribbles when they move. `quiet` hides the diagram line (line shuffles).
     {dr:id, t, cross?} dribble in place (cross = switch hands every bounce)
     {pass:id, to:id, at?, t?, kind?:"chest"|"bounce"|"lob"|"hand"}
     {shot:id, at?, t?, kind?:"jumper"|"layup"|"set", miss?, reb?:id}   then the ball goes to `reb` (or stays under the net)
     {ball:ballId, to:[x,y], t?, at?}   a loose ball rolls/bounces to a spot
     {take:id, ball:ballId, at?}        a player picks up a loose ball where it lies
   The engine compiles everything to time-based segments, then draws any moment without simulation,
   so pausing, scrubbing and looping are exact. */
(function(){
const F=10;                                   // drawing units per foot
const BASKET_L={x:5.25,y:25}, BASKET_R={x:88.75,y:25};
const PACE={walk:4.5,jog:9,run:13,sprint:17,slide:7,back:7.5,dribble:11};   // feet per second
const easeIO=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const smooth=t=>t*t*(3-2*t);
const lerp=(a,b,t)=>a+(b-a)*t;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const P=a=>Array.isArray(a)?{x:a[0],y:a[1]}:{x:a.x,y:a.y};
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

/* ---------- paths: Catmull-Rom through the points, measured so speed is even along the way ---------- */
function curve(pts){
  if(pts.length<3)return pts.slice();
  const out=[pts[0]];
  for(let i=0;i<pts.length-1;i++){
    const p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(pts.length-1,i+2)];
    const n=Math.max(4,Math.ceil(dist(p1,p2)/1.2));
    for(let k=1;k<=n;k++){const t=k/n,t2=t*t,t3=t2*t;
      out.push({x:.5*((2*p1.x)+(-p0.x+p2.x)*t+(2*p0.x-5*p1.x+4*p2.x-p3.x)*t2+(-p0.x+3*p1.x-3*p2.x+p3.x)*t3),
                y:.5*((2*p1.y)+(-p0.y+p2.y)*t+(2*p0.y-5*p1.y+4*p2.y-p3.y)*t2+(-p0.y+3*p1.y-3*p2.y+p3.y)*t3)});}
  }
  return out;
}
function measure(pts){const L=[0];for(let i=1;i<pts.length;i++)L.push(L[i-1]+dist(pts[i-1],pts[i]));return L;}
function along(pts,L,u){             // point at fraction u of the length, and the heading there
  const tot=L[L.length-1];if(tot<1e-6)return {x:pts[0].x,y:pts[0].y,a:null};
  const d=u*tot;let i=1;while(i<L.length-1&&L[i]<d)i++;
  const s=(d-L[i-1])/((L[i]-L[i-1])||1),a=pts[i-1],b=pts[i];
  return {x:lerp(a.x,b.x,s),y:lerp(a.y,b.y,s),a:Math.atan2(b.y-a.y,b.x-a.x)};
}

/* ---------- compile a sim into timed segments ---------- */
function compile(sim){
  const ents={},order=[];
  (sim.cast||[]).forEach(c=>{ents[c.id]={...c,x:c.x,y:c.y};order.push(c.id);});
  const pos={},face={};
  order.forEach(id=>{pos[id]={x:ents[id].x,y:ents[id].y};face[id]=ents[id].f!=null?ents[id].f:faceDefault(ents[id],sim);});
  const segs={};order.forEach(id=>segs[id]=[]);
  const balls={},bsegs={};
  (sim.balls||[]).forEach(b=>{balls[b.id]={on:b.on||null,x:b.x,y:b.y};bsegs[b.id]=[];});
  const ballOf=pid=>Object.keys(balls).find(k=>balls[k].on===pid);
  const beats=[];let T=0;const nets=[];const swaps={};
  const where=(id,t)=>{                    // a player's spot at time t (within what's compiled so far)
    const S=segs[id];for(let i=S.length-1;i>=0;i--){const s=S[i];if(t>=s.t0){if(t>=s.t1)return {...s.pts[s.pts.length-1]};const u=s.ease((t-s.t0)/(s.t1-s.t0)),q=along(s.pts,s.L,u);return {x:q.x,y:q.y};}}
    return {...pos[id]};};
  for(const bt of sim.beats||[]){
    const t0=T;let end=t0;const arrows=[];
    const moves=(bt.acts||[]).filter(a=>a.m),others=(bt.acts||[]).filter(a=>!a.m);
    const ballHolderAt={};                 // dribbling: who has a ball at the start of the beat
    Object.keys(balls).forEach(k=>{if(balls[k].on)ballHolderAt[balls[k].on]=k;});
    // moves first, so passes can find receivers mid-cut
    for(const a of moves){
      const id=a.m;if(!pos[id])continue;
      const start=where(id,t0+(a.at||0));
      const raw=[start,...(a.path?a.path.map(P):[]),...(a.to?[P(a.to)]:[])];
      const pts=curve(raw),L=measure(pts),len=L[L.length-1];
      const passesNow=others.some(o=>(o.pass===id||o.shot===id)&&(o.at||0)<(a.at||0)+900);
      const hasBall=!!ballHolderAt[id]&&!a.nob&&!passesNow;
      const pace=a.pace||(hasBall?"dribble":ents[id].t==="d"?"slide":"run");
      const dur=a.t||Math.max(350,len/PACE[pace]*1000+(len>3?260:0));
      const s0=t0+(a.at||0),s1=s0+dur;
      segs[id].push({t0:s0,t1:s1,pts,L,ease:a.lin?(u=>u):easeIO,dribble:hasBall,face:a.face||null,pace,screen:!!a.screen,cross:!!a.cross,hand:a.hand||null});
      end=Math.max(end,s1);
      if(!a.quiet&&len>2)arrows.push({k:a.screen?"screen":hasBall?"dribble":pace==="slide"||pace==="back"?"slide":"cut",pts,team:ents[id].t,t0:s0,t1:s1});
    }
    // ball actions in time order
    others.sort((p,q)=>(p.at||0)-(q.at||0));
    for(const a of others){
      const at=t0+(a.at||0);
      if(a.dr){const k=ballOf(a.dr);if(k){bsegs[k].push({k:"dr",who:a.dr,t0:at,t1:at+(a.t||1600),cross:!!a.cross});end=Math.max(end,at+(a.t||1600));}continue;}
      if(a.pass){
        const k=ballOf(a.pass);if(!k)continue;
        const from=where(a.pass,at);const kind=a.kind||"chest";
        // aim at where the receiver will be when the ball gets there
        let dur=a.t||0,to=where(a.to,at+400);
        for(let i=0;i<3;i++){const d=dist(from,to);dur=a.t||Math.max(kind==="hand"?260:380,d/(kind==="lob"?34:kind==="bounce"?40:kind==="over"?46:52)*1000);to=where(a.to,at+dur);}
        bsegs[k].push({k:"fly",from,to,t0:at,t1:at+dur,kind,who:a.pass,rcv:a.to});
        balls[k].on=a.to;end=Math.max(end,at+dur);
        if(!a.quiet&&kind!=="hand")arrows.push({k:"pass",pts:[from,to],t0:at,t1:at+dur});
        continue;}
      if(a.shot){
        const k=ballOf(a.shot);if(!k)continue;
        const from=where(a.shot,at),hoop=a.hoop==="R"?BASKET_R:a.hoop==="L"?BASKET_L:nearestHoop(from,sim);
        const kind=a.kind||(dist(from,hoop)<6?"layup":"jumper");
        const fly=a.t||(kind==="layup"?620:Math.min(1300,700+dist(from,hoop)*22));
        bsegs[k].push({k:"shot",from,to:{...hoop},t0:at,t1:at+fly,kind,who:a.shot,miss:!!a.miss});
        let t=at+fly;
        if(!a.miss){nets.push({t,hoop});bsegs[k].push({k:"net",at:{...hoop},t0:t,t1:t+260});t+=260;}
        const floor=a.missTo?P(a.missTo):{x:hoop.x+(hoop===BASKET_L?2.2:-2.2),y:hoop.y+(a.miss?5*(a.side||1):.8)};
        if(a.miss){bsegs[k].push({k:"bounce",from:{...hoop},to:floor,t0:t,t1:t+520,h0:10});t+=520;}
        balls[k].on=null;balls[k].x=floor.x;balls[k].y=floor.y;
        if(a.reb){
          const r=where(a.reb,t+380);
          bsegs[k].push({k:"fly",from:a.miss?floor:{...hoop},to:r,t0:t,t1:t+380,kind:"reb",h0:a.miss?2:7,who:null,rcv:a.reb});
          balls[k].on=a.reb;t+=380;
        }else if(!a.miss){bsegs[k].push({k:"drop",from:{...hoop},to:floor,t0:t,t1:t+520});t+=520;}
        end=Math.max(end,t);continue;}
      if(a.take){balls[a.ball].on=a.take;bsegs[a.ball].push({k:"take",who:a.take,t0:at,t1:at});continue;}
      if(a.ball){const b=balls[a.ball];const from=b.on?where(b.on,at):{x:b.x,y:b.y},to=P(a.to),d=a.t||Math.max(500,dist(from,to)/22*1000);
        bsegs[a.ball].push({k:"roll",from,to,t0:at,t1:at+d});b.on=null;b.x=to.x;b.y=to.y;end=Math.max(end,at+d);continue;}
      if(a.sw){(swaps[a.sw]=swaps[a.sw]||[]).push({t:at,to:a.to});continue;}
    }
    end=Math.max(end+(bt.hold!=null?bt.hold:300),t0+300);
    beats.push({t0,t1:end,cap:bt.cap||"",arrows});
    order.forEach(id=>{pos[id]=where(id,end);});
    T=end;
  }
  // Can the loop restart without a visible jump? Yes when the end looks the same as the start
  // (same kinds of player on the same spots, balls in the same places).
  // same kinds of player on the same spots (within a few inches), in any order
  const same=(()=>{const left=order.map(id=>({k:ents[id].t+(ents[id].n||""),x:pos[id].x,y:pos[id].y}));
    return order.every(id=>{const e=ents[id],k=e.t+(e.n||"");const i=left.findIndex(q=>q.k===k&&Math.hypot(q.x-e.x,q.y-e.y)<.35);if(i<0)return false;left.splice(i,1);return true;});})();
  const swapped=Object.keys(swaps).length>0;
  return {sim,ents,order,segs,bsegs,beats,total:T,nets,swaps,seamless:same&&!swapped,start:Object.fromEntries((sim.balls||[]).map(b=>[b.id,{on:b.on||null,x:b.x,y:b.y}]))};
}
function faceDefault(e,sim){return e.t==="d"||e.t==="c"?Math.PI:0;}
function nearestHoop(p,sim){return sim.court==="full"&&p.x>47?BASKET_R:BASKET_L;}

/* ---------- state at time t ---------- */
function playerAt(C,id,t){
  const S=C.segs[id];let last=null;
  for(const s of S){
    if(t<s.t0)break;
    if(t<=s.t1){const u=s.ease((t-s.t0)/((s.t1-s.t0)||1)),q=along(s.pts,s.L,u);
      return {x:q.x,y:q.y,head:q.a,moving:u>0&&u<1,seg:s,u};}
    last=s;
  }
  if(last){const e=last.pts[last.pts.length-1];return {x:e.x,y:e.y,head:null,moving:false,seg:null,last};}
  return {x:C.ents[id].x,y:C.ents[id].y,head:null,moving:false};
}
function ballAt(C,k,t,P){             // P = player states at t
  const S=C.bsegs[k];let st={on:C.start[k].on,x:C.start[k].x,y:C.start[k].y},cur=null;
  for(const s of S){
    if(t<s.t0)break;
    if(t<=s.t1&&s.t1>s.t0){cur=s;break;}
    // finished segment: update holder/rest spot
    if(s.k==="fly")st={on:s.rcv||null,x:s.to.x,y:s.to.y};
    else if(s.k==="shot")st={on:null,x:s.to.x,y:s.to.y};
    else if(s.k==="net"||s.k==="drop"||s.k==="bounce"||s.k==="roll")st={on:null,x:(s.to||s.at).x,y:(s.to||s.at).y};
    else if(s.k==="take")st={on:s.who,x:0,y:0};
  }
  if(cur){const u=(t-cur.t0)/((cur.t1-cur.t0)||1);
    if(cur.k==="dr")return held(C,cur.who,P,t,true,cur.cross);
    if(cur.k==="fly"){const from=cur.who&&P[cur.who]?handPt(P[cur.who],C,cur.who):cur.from;
      const to=cur.rcv&&P[cur.rcv]?handPt(P[cur.rcv],C,cur.rcv,true):cur.to;
      const v=cur.kind==="reb"?u:smooth(u)*.25+u*.75;
      const x=lerp(from.x,to.x,v),y=lerp(from.y,to.y,v);
      let h=cur.kind==="over"?6.5+2.2*Math.sin(Math.PI*u):cur.kind==="lob"?4+10*Math.sin(Math.PI*u):cur.kind==="bounce"?(u<.62?4*(1-u/.62):3.4*((u-.62)/.38)):cur.kind==="reb"?lerp(cur.h0||7,3.5,u)+1.5*Math.sin(Math.PI*u):4.2+.6*Math.sin(Math.PI*u);
      return {x,y,h,air:true};}
    if(cur.k==="shot"){const lay=cur.kind==="layup";const v=smooth(u);
      const x=lerp(cur.from.x,cur.to.x,v),y=lerp(cur.from.y,cur.to.y,v);
      const h=lay?lerp(7.5,10,u)+2.2*Math.sin(Math.PI*u):lerp(7.5,10,u)+(cur.kind==="set"?4:6.5)*Math.sin(Math.PI*u);
      return {x,y,h,air:true,shot:true};}
    if(cur.k==="net"){return {x:cur.at.x,y:cur.at.y,h:lerp(10,6.5,u),air:true,net:u};}
    if(cur.k==="drop"||cur.k==="bounce"){const x=lerp(cur.from.x,cur.to.x,u),y=lerp(cur.from.y,cur.to.y,u);
      const h0=cur.k==="drop"?6.5:10;const h=u<.55?h0*(1-u/.55)*(1-u/.55):1.6*Math.sin(Math.PI*(u-.55)/.45);return {x,y,h:Math.max(0,h),air:true};}
    if(cur.k==="roll"){const v=easeIO(u);return {x:lerp(cur.from.x,cur.to.x,v),y:lerp(cur.from.y,cur.to.y,v),h:Math.abs(Math.sin(u*Math.PI*3))*2*(1-u),air:true};}
  }
  if(st.on&&P[st.on]){const p=P[st.on];return held(C,st.on,P,t,p.moving&&p.seg&&p.seg.dribble,false);}
  return {x:st.x,y:st.y,h:0,air:false,rest:true};
}
function handPt(p,C,id,catching){const a=p.f!=null?p.f:0,side=1;
  return {x:p.x+Math.cos(a)*1.1+Math.cos(a+Math.PI/2)*.9*side,y:p.y+Math.sin(a)*1.1+Math.sin(a+Math.PI/2)*.9*side};}
function held(C,id,P,t,dribbling,cross){
  const p=P[id],a=p.f!=null?p.f:0;
  if(!dribbling){const q=handPt(p,C,id);return {x:q.x,y:q.y,h:3.6,air:false};}
  const per=440,ph=(t%per)/per,bounce=Math.abs(Math.cos(ph*Math.PI));     // 1 = in the hand, 0 = on the floor
  const n=Math.floor(t/per);let side=cross?(n%2?-1:1):1;
  const sg=p.seg;if(sg&&sg.hand)side=sg.hand==="L"?-1:1;
  if(sg&&sg.cross&&p.u!=null){const a1=along(sg.pts,sg.L,Math.max(0,p.u-.04)).a,a2=along(sg.pts,sg.L,Math.min(1,p.u+.04)).a;
    if(a1!=null&&a2!=null){let c=a2-a1;while(c>Math.PI)c-=2*Math.PI;while(c<-Math.PI)c+=2*Math.PI;side=-Math.tanh(c*9);if(Math.abs(side)<.35)side=side<0?-.35:.35;}}
  const fwd=1.5,lat=1.25*side;
  return {x:p.x+Math.cos(a)*fwd+Math.cos(a+Math.PI/2)*lat,y:p.y+Math.sin(a)*fwd+Math.sin(a+Math.PI/2)*lat,h:.15+3.1*bounce,air:false,dribble:true};
}

/* ---------- drawing ---------- */
let WOOD="";
function woodDefs(){
  if(WOOD)return WOOD;
  let seed=7;const r=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  const pw=22,cols=10,TH=420;let b="";
  for(let k=0;k<cols;k++){const x=k*pw;let y=-r()*220;
    while(y<TH){const len=110+r()*190,tn=r();
      b+=`<rect x="${x}" y="${y.toFixed(1)}" width="${pw}" height="${len.toFixed(1)}" fill="hsl(${(31+tn*6).toFixed(1)},${(44+tn*10).toFixed(1)}%,${(64+tn*9).toFixed(1)}%)"/><rect x="${x}" y="${(y+len-1).toFixed(1)}" width="${pw}" height="1.4" fill="rgba(90,55,20,.26)"/>`;
      for(let g=0;g<3;g++){const gx=x+2+r()*(pw-4);b+=`<path d="M${gx.toFixed(1)} ${y.toFixed(1)}q${((r()-.5)*5).toFixed(1)} ${(len/2).toFixed(1)} ${((r()-.5)*4).toFixed(1)} ${len.toFixed(1)}" fill="none" stroke="rgba(120,78,34,.13)" stroke-width=".8"/>`;}
      y+=len;}
    b+=`<rect x="${x+pw-1}" y="0" width="1.1" height="${TH}" fill="rgba(90,55,20,.2)"/>`;}
  return WOOD=`<pattern id="dsWood" patternUnits="userSpaceOnUse" width="${pw*cols}" height="${TH}" patternTransform="rotate(90)"><rect width="${pw*cols}" height="${TH}" fill="#cfa46d"/>${b}</pattern>`;
}
/* One basket end in court feet (left end); mirror for the right. High school: 12 ft lane, FT line 15 ft
   from the backboard, 19 ft 9 in three, 6 ft circles, backboard 4 ft in, rim 18 in. */
function endSVG(mir){
  const X=x=>mir?94-x:x,L="stroke:#fffdf8;stroke-width:2.2;fill:none";
  const lane=`<rect x="${X(mir?19:0)*F}" y="${19*F}" width="${19*F}" height="${12*F}" style="fill:var(--ds-paint);stroke:#fffdf8;stroke-width:2.2"/>`;
  const ft=`<path d="M${X(19)*F} ${19*F}A${6*F} ${6*F} 0 0 ${mir?0:1} ${X(19)*F} ${31*F}" style="${L}"/><path d="M${X(19)*F} ${19*F}A${6*F} ${6*F} 0 0 ${mir?1:0} ${X(19)*F} ${31*F}" style="${L};stroke-dasharray:9 8"/>`;
  const three=`<path d="M${X(0)*F} ${5.25*F}H${X(5.25)*F}A${19.75*F} ${19.75*F} 0 0 ${mir?0:1} ${X(5.25)*F} ${44.75*F}H${X(0)*F}" style="${L}"/>`;
  let hash="";[7,11,14,17].forEach((h,i)=>{
    if(i===0){hash+=`<rect x="${(mir?X(h+1):X(h))*F}" y="${(19-.8)*F}" width="${F}" height="${.8*F}" style="fill:#fffdf8"/><rect x="${(mir?X(h+1):X(h))*F}" y="${31*F}" width="${F}" height="${.8*F}" style="fill:#fffdf8"/>`;}
    else hash+=`<path d="M${X(h)*F} ${(19-.8)*F}v${.8*F}M${X(h)*F} ${31*F}v${.8*F}" style="${L}"/>`;});
  const board=`<line x1="${X(4)*F}" y1="${22*F}" x2="${X(4)*F}" y2="${28*F}" style="stroke:#f4f6fb;stroke-width:4;stroke-linecap:round"/>`;
  const rim=`<line x1="${X(4)*F}" y1="${25*F}" x2="${X(4.5)*F}" y2="${25*F}" style="stroke:#e2672a;stroke-width:3"/><circle class="ds-net" cx="${X(5.25)*F}" cy="${25*F}" r="${.75*F}" style="fill:rgba(255,255,255,.35);stroke:#e2672a;stroke-width:2.6"/>`;
  return lane+ft+three+hash+board+rim;
}
function courtSVG(full){
  const W=(full?94:47)*F,H=50*F,pad=3*F;
  let s=`<rect x="${-pad}" y="${-pad}" width="${W+2*pad}" height="${H+2*pad}" style="fill:var(--ds-out)"/>`+
        `<rect x="0" y="0" width="${W}" height="${H}" style="fill:url(#dsWood)"/>`;
  s+=endSVG(false);
  if(full)s+=endSVG(true);
  s+=`<rect x="0" y="0" width="${W}" height="${H}" style="fill:none;stroke:#fffdf8;stroke-width:3"/>`;
  s+=full?`<path d="M${47*F} 0V${H}" style="stroke:#fffdf8;stroke-width:2.2"/><circle cx="${47*F}" cy="${25*F}" r="${6*F}" style="fill:none;stroke:#fffdf8;stroke-width:2.2"/><circle cx="${47*F}" cy="${25*F}" r="${2*F}" style="fill:none;stroke:#fffdf8;stroke-width:2.2"/>`
         :`<path d="M${47*F} ${19*F}A${6*F} ${6*F} 0 0 0 ${47*F} ${31*F}" style="fill:none;stroke:#fffdf8;stroke-width:2.2"/>`;
  return s;
}

/* arrows (coaching-diagram lines for the current step) */
function zig(pts){const out=[];let acc=0,side=1;out.push(pts[0]);
  for(let i=1;i<pts.length;i++){acc+=dist(pts[i-1],pts[i]);if(acc>=1.1&&i<pts.length-4){acc=0;side=-side;const a=Math.atan2(pts[i].y-pts[i-1].y,pts[i].x-pts[i-1].x)+Math.PI/2;out.push({x:pts[i].x+Math.cos(a)*.55*side,y:pts[i].y+Math.sin(a)*.55*side});}}
  out.push(pts[pts.length-1]);return out;}
function head(a,b,col,w){const ang=Math.atan2(b.y-a.y,b.x-a.x),L=1.3*F;
  const p1={x:b.x*F-Math.cos(ang-.45)*L,y:b.y*F-Math.sin(ang-.45)*L},p2={x:b.x*F-Math.cos(ang+.45)*L,y:b.y*F-Math.sin(ang+.45)*L};
  return `<path d="M${p1.x.toFixed(1)} ${p1.y.toFixed(1)}L${(b.x*F).toFixed(1)} ${(b.y*F).toFixed(1)}L${p2.x.toFixed(1)} ${p2.y.toFixed(1)}" style="fill:none;stroke:${col};stroke-width:${w};stroke-linecap:round;stroke-linejoin:round"/>`;}
function arrowSVG(a){
  const col=a.team==="d"?"#a3241c":"#1d1720",w=2.4;
  let pts=a.pts.slice();const tot=measure(pts);const T=tot[tot.length-1];
  // stop short of the player circle at the end
  if(T>3){const cut=a.k==="pass"?1.6:1.5;const q=along(pts,tot,(T-cut)/T);let i=tot.findIndex(v=>v>=T-cut);pts=pts.slice(0,i).concat([{x:q.x,y:q.y}]);}
  const d=(arr)=>"M"+arr.map(p=>`${(p.x*F).toFixed(1)} ${(p.y*F).toFixed(1)}`).join("L");
  const end=pts[pts.length-1],pre=pts[Math.max(0,pts.length-3)];
  if(a.k==="pass")return `<path d="${d(pts)}" style="fill:none;stroke:${col};stroke-width:${w};stroke-dasharray:7 6;stroke-linecap:round"/>`+head(pts[0],end,col,w);
  if(a.k==="dribble")return `<path d="${d(zig(pts))}" style="fill:none;stroke:${col};stroke-width:${w};stroke-linejoin:round"/>`+head(pre,end,col,w);
  if(a.k==="screen"){const ang=Math.atan2(end.y-pre.y,end.x-pre.x)+Math.PI/2,r=1.3;
    return `<path d="${d(pts)}" style="fill:none;stroke:${col};stroke-width:${w}"/><path d="M${((end.x+Math.cos(ang)*r)*F).toFixed(1)} ${((end.y+Math.sin(ang)*r)*F).toFixed(1)}L${((end.x-Math.cos(ang)*r)*F).toFixed(1)} ${((end.y-Math.sin(ang)*r)*F).toFixed(1)}" style="stroke:${col};stroke-width:4.5;stroke-linecap:round"/>`;}
  if(a.k==="slide")return `<path d="${d(pts)}" style="fill:none;stroke:${col};stroke-width:${w};stroke-dasharray:2 5;stroke-linecap:round"/>`+head(pre,end,col,w);
  return `<path d="${d(pts)}" style="fill:none;stroke:${col};stroke-width:${w};stroke-linecap:round"/>`+head(pre,end,col,w);
}

/* ---------- the widget ---------- */
function mount(el,drill,opt={}){
  const sim=drill.sim||drill,full=sim.court==="full";
  const C=compile(sim);
  let portrait=!full;
  const decide=()=>{if(!full)return true;const w=el.clientWidth||600;return opt.orient?opt.orient==="portrait":w<560;};
  portrait=decide();
  el.classList.add("ds");el.innerHTML="";
  const box=document.createElement("div");box.className="ds-stage";el.appendChild(box);
  const capEl=document.createElement("div");capEl.className="ds-cap";
  const bar=document.createElement("div");bar.className="ds-bar";
  if(opt.captions!==false)el.appendChild(capEl);
  if(opt.controls!==false)el.appendChild(bar);
  const W=(full?94:47)*F,H=50*F,pad=2.5*F;
  // world → screen: portrait swaps the axes so the left basket sits at the top
  const map=(x,y)=>portrait?{x:y,y:x}:{x,y};
  function build(){
    const vw=portrait?H:W,vh=portrait?W:H;
    const vb=`${-pad} ${-pad} ${vw+2*pad} ${vh+2*pad}`;
    const court=`<g transform="${portrait?"matrix(0 1 1 0 0 0)":""}">${courtSVG(full)}<g class="ds-arrows"></g></g>`;
    box.innerHTML=`<svg viewBox="${vb}" class="ds-svg" role="img" aria-label="${esc(drill.name||"Drill")} animation"><defs>${woodDefs()}</defs>${court}<g class="ds-shadows"></g><g class="ds-people"></g><g class="ds-balls"></g></svg>`;
    const svg=box.firstChild,ppl=svg.querySelector(".ds-people"),shd=svg.querySelector(".ds-shadows"),bl=svg.querySelector(".ds-balls");
    const nodes={};
    C.order.forEach(id=>{const e=C.ents[id];const g=document.createElementNS("http://www.w3.org/2000/svg","g");
      if(e.t==="cone")g.innerHTML=`<path d="M0 -9L8 7H-8Z" style="fill:#ff7a2f;stroke:#fff;stroke-width:1.6;stroke-linejoin:round"/><ellipse cx="0" cy="7" rx="9" ry="2.6" style="fill:#e85d14"/>`;
      const SH=`<circle cx="2.2" cy="2.6" r="15.5" style="fill:rgba(30,16,4,.28)"/>`;
      const oArt=`<circle r="15.5" style="fill:var(--ds-team);stroke:#fff;stroke-width:2.5"/><path class="ds-nose" d="M15 -6L22 0L15 6Z" style="fill:var(--ds-team)"/>${e.n!=null?`<text y="6" text-anchor="middle" style="fill:#fff;font:800 ${String(e.n).length>1?13:17}px Arial,Helvetica,sans-serif">${esc(e.n)}</text>`:""}`;
      const dArt=`<circle r="15.5" style="fill:#fff;stroke:#a3241c;stroke-width:3"/><path class="ds-nose" d="M15 -6L22 0L15 6Z" style="fill:#a3241c"/><text y="6" text-anchor="middle" style="fill:#a3241c;font:800 ${e.n?15:17}px Arial,Helvetica,sans-serif">X${e.n?`<tspan style="font-size:10px" dy="3">${esc(e.n)}</tspan>`:""}</text>`;
      if(e.t==="cone"){g.innerHTML=`<path d="M0 -9L8 7H-8Z" style="fill:#ff7a2f;stroke:#fff;stroke-width:1.6;stroke-linejoin:round"/><ellipse cx="0" cy="7" rx="9" ry="2.6" style="fill:#e85d14"/>`;}
      else if(C.swaps[id]){g.innerHTML=SH+`<g class="ds-o">${oArt}</g><g class="ds-d">${dArt}</g>`;}
      else if(e.t==="d")g.innerHTML=SH+`<circle r="15.5" style="fill:#fff;stroke:#a3241c;stroke-width:3"/><path class="ds-nose" d="M15 -6L22 0L15 6Z" style="fill:#a3241c"/><text y="6" text-anchor="middle" style="fill:#a3241c;font:800 ${e.n?15:17}px Arial,Helvetica,sans-serif">X${e.n?`<tspan style="font-size:10px" dy="3">${esc(e.n)}</tspan>`:""}</text>`;
      else if(e.t==="c")g.innerHTML=SH+`<circle r="15.5" style="fill:#4a5068;stroke:#fff;stroke-width:2.5"/><path class="ds-nose" d="M15 -6L22 0L15 6Z" style="fill:#4a5068"/><text y="6" text-anchor="middle" style="fill:#fff;font:800 16px Arial,Helvetica,sans-serif">C</text>`;
      else g.innerHTML=SH+`<circle r="15.5" style="fill:var(--ds-team);stroke:#fff;stroke-width:2.5"/><path class="ds-nose" d="M15 -6L22 0L15 6Z" style="fill:var(--ds-team)"/>${e.n!=null?`<text y="6" text-anchor="middle" style="fill:#fff;font:800 ${String(e.n).length>1?13:17}px Arial,Helvetica,sans-serif">${esc(e.n)}</text>`:""}`;
      ppl.appendChild(g);nodes[id]={g,nose:g.querySelector(".ds-nose"),f:C.ents[id].f!=null?C.ents[id].f:faceDefault(e)};
      if(C.swaps[id]){const o=g.querySelector('.ds-o'),d=g.querySelector('.ds-d');nodes[id].alt={o,d};nodes[id].tm=null;}});
    const bn={};Object.keys(C.bsegs).forEach(k=>{
      const s=document.createElementNS("http://www.w3.org/2000/svg","ellipse");s.setAttribute("rx","7");s.setAttribute("ry","5");s.setAttribute("style","fill:rgba(40,22,8,.28)");shd.appendChild(s);
      const g=document.createElementNS("http://www.w3.org/2000/svg","g");g.innerHTML=`<circle r="7" style="fill:#e2672a;stroke:#3a1d0c;stroke-width:1.3"/><path d="M-7 0H7M0-7V7M-4.7 -5.2Q-1.5 0 -4.7 5.2M4.7 -5.2Q1.5 0 4.7 5.2" style="fill:none;stroke:#3a1d0c;stroke-width:.9;stroke-linecap:round"/>`;bl.appendChild(g);bn[k]={g,s};});
    return {svg,nodes,bn,arrows:svg.querySelector(".ds-arrows"),nets:[...svg.querySelectorAll(".ds-net")]};
  }
  let V=build();
  // controls
  const speeds=[.5,.75,1,1.5];let speed=opt.speed||1,playing=opt.autoplay!==false,t=0,last=null,raf=0,beatShown=-1,fade=0;
  if(opt.controls!==false){
    bar.innerHTML=`<button type="button" class="ds-b" data-ds="prev" aria-label="Previous step">‹</button><button type="button" class="ds-b ds-play" data-ds="play" aria-label="Pause">❚❚</button><button type="button" class="ds-b" data-ds="next" aria-label="Next step">›</button><div class="ds-track" data-ds="seek"><i></i></div><button type="button" class="ds-b ds-sp" data-ds="speed">${speed}×</button>`;
    bar.addEventListener("click",e=>{const b=e.target.closest("[data-ds]");if(!b)return;const k=b.dataset.ds;
      if(k==="play"){playing=!playing;last=null;if(playing&&t>=C.total)t=0;sync();loop();}
      else if(k==="speed"){speed=speeds[(speeds.indexOf(speed)+1)%speeds.length];b.textContent=speed+"×";}
      else if(k==="prev"||k==="next"){const i=C.beats.findIndex(x=>t>=x.t0&&t<x.t1);let j=k==="next"?i+1:(t-C.beats[Math.max(i,0)].t0>600?i:i-1);
        j=(j+C.beats.length)%C.beats.length;t=C.beats[j].t0+1;playing=false;sync();draw();}
      else if(k==="seek"){const r=b.getBoundingClientRect();t=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*C.total;draw();}});
  }
  function sync(){const b=bar.querySelector(".ds-play");if(b){b.textContent=playing?"❚❚":"▶";b.setAttribute("aria-label",playing?"Pause":"Play");}}
  sync();
  function draw(){
    const PS={};
    C.order.forEach(id=>{const s=playerAt(C,id,t),n=V.nodes[id];
      // facing: a set target, else the way they move; turn smoothly
      let want=n.f;const seg=s.seg||s.last;
      if(s.seg&&s.seg.face){const f=s.seg.face;const tp=typeof f==="string"?(PS[f]||playerAt(C,f,t)):P(f);want=Math.atan2(tp.y-s.y,tp.x-s.x);}
      else if(s.moving&&s.head!=null)want=s.seg&&s.seg.pace==="back"?s.head+Math.PI:s.head;
      else if(!s.moving&&s.last&&s.last.face){const f=s.last.face;const tp=typeof f==="string"?(PS[f]||playerAt(C,f,t)):Array.isArray(f)?{x:f[0],y:f[1]}:f;want=Math.atan2(tp.y-s.y,tp.x-s.x);}
      let d=want-n.f;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;
      n.f=n.instant?want:n.f+d*Math.min(1,.22);n.instant=false;
      PS[id]={x:s.x,y:s.y,f:n.f,moving:s.moving,seg:s.seg,u:s.u};
      if(n.alt){const sw=(C.swaps[id]||[]).filter(w=>w.t<=t).pop();const tm=sw?sw.to:C.ents[id].t;if(tm!==n.tm){n.tm=tm;n.alt.o.style.display=tm==='d'?'none':'';n.alt.d.style.display=tm==='d'?'':'none';n.nose=n.alt[tm==='d'?'d':'o'].querySelector('.ds-nose');}}
      const q=map(s.x,s.y),ang=portrait?Math.PI/2-n.f:n.f;
      n.g.setAttribute("transform",`translate(${(q.x*F).toFixed(1)} ${(q.y*F).toFixed(1)})`);
      if(n.nose)n.nose.setAttribute("transform",`rotate(${(ang*180/Math.PI).toFixed(1)})`);
      const scr=s.seg&&s.seg.screen&&s.u>.9||(!s.moving&&s.last&&s.last.screen&&t-s.last.t1<900);
      {const cs=n.g.querySelectorAll("circle");const ci=cs[1]||cs[0];if(ci)ci.setAttribute("stroke-dasharray",scr?"4 3":"");}});
    Object.keys(V.bn).forEach(k=>{const b=ballAt(C,k,t,PS),q=map(b.x,b.y),sc=1+b.h*.045,o=b.h*.13;
      V.bn[k].g.setAttribute("transform",`translate(${(q.x*F).toFixed(1)} ${(q.y*F).toFixed(1)}) scale(${sc.toFixed(3)})`);
      const sq=map(b.x+o,b.y+o);V.bn[k].s.setAttribute("cx",(sq.x*F).toFixed(1));V.bn[k].s.setAttribute("cy",(sq.y*F).toFixed(1));
      V.bn[k].s.setAttribute("opacity",(b.h<.4?.9:Math.max(.25,1-b.h*.06)).toFixed(2));});
    // nets ripple right after a make
    V.nets.forEach(n=>n.style.strokeWidth="2.6");
    C.nets.forEach(nt=>{const dt=t-nt.t;if(dt>=0&&dt<450){const left=nt.hoop.x<47;const el2=V.nets[left?0:V.nets.length-1];if(el2){el2.style.fill=`rgba(255,255,255,${(.35+.5*(1-dt/450)).toFixed(2)})`;}}});
    // step arrows and caption
    const bi=C.beats.findIndex(x=>t>=x.t0&&t<x.t1),B=C.beats[bi<0?C.beats.length-1:bi];
    if(bi!==beatShown){beatShown=bi;V.arrows.innerHTML=B?B.arrows.map(arrowSVG).join(""):"";if(opt.captions!==false)capEl.innerHTML=B&&B.cap?`<b>${(bi<0?C.beats.length-1:bi)+1}/${C.beats.length}</b>${esc(B.cap)}`:"";}
    if(B){const u=(t-B.t0)/((B.t1-B.t0)||1);V.arrows.style.opacity=(u<.12?u/.12:u>.88?Math.max(.15,(1-u)/.12):1)*.75;}
    const tr=bar.querySelector(".ds-track i");if(tr)tr.style.width=(t/C.total*100).toFixed(2)+"%";
    V.svg.style.opacity=fade?String(1-fade):"";
  }
  function loop(){cancelAnimationFrame(raf);if(!playing)return;
    raf=requestAnimationFrame(now=>{if(!el.isConnected){destroy();return;}
      if(last!=null){const dt=Math.min(64,now-last)*speed;t+=dt;
        if(t>=C.total){if(C.seamless){t-=C.total;}else{fade=Math.min(1,fade+dt/320);if(fade>=1){t=0;Object.values(V.nodes).forEach(n=>n.instant=true);}}}
        else if(fade>0)fade=Math.max(0,fade-dt/320);}
      last=now;draw();loop();});}
  // pause when off screen (lists of many drills)
  let io=null;if("IntersectionObserver" in window){io=new IntersectionObserver(es=>{es.forEach(e=>{if(!e.isIntersecting){cancelAnimationFrame(raf);last=null;}else if(playing){last=null;loop();}});});io.observe(el);}
  let ro=null;if(full&&"ResizeObserver" in window){ro=new ResizeObserver(()=>{const p=decide();if(p!==portrait){portrait=p;V=build();beatShown=-1;draw();}});ro.observe(el);}
  Object.values(V.nodes).forEach(n=>n.instant=true);
  draw();loop();
  function destroy(){cancelAnimationFrame(raf);playing=false;if(io)io.disconnect();if(ro)ro.disconnect();}
  return {destroy,play(){playing=true;last=null;sync();loop();},pause(){playing=false;sync();},seek(ms){t=ms;draw();},get total(){return C.total;},get time(){return t;},compiled:C};
}
self.DrillSim={mount,compile};
})();
