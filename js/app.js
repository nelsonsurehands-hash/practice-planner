let SPORT="basketball", CATS=SPORTS.basketball.cats;
let ME={id:"me",name:"Coach"}, STAFF=[], READONLY=false;   // set by boot.js
function ago(ts){if(!ts)return "";const m=Math.round((Date.now()-ts)/60000);if(m<1)return "just now";if(m<60)return m+" min ago";const h=Math.round(m/60);if(h<24)return h+" hr ago";const d=Math.round(h/24);return d<7?d+" day"+(d>1?"s":"")+" ago":new Date(ts).toLocaleDateString("en-US",{month:"short",day:"numeric"});}
function setReadOnly(flag){
  READONLY=!!flag;document.body.classList.toggle("readonly",READONLY);
  ["#planStart","#planEnd","#planFocus","#pName","#pType","#pCaption","#pNotes"].forEach(q=>{const el=$(q);if(el)el.disabled=READONLY;});
  if(cur)renderPlan();
  if(typeof renderPlayLib==="function")renderPlayLib();
}
const sp=()=>SPORTS[SPORT]||SPORTS.basketball;
let PRACTICES=[], SETTINGS={};
const DOW=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DEFAULT_SETTINGS={sport:"basketball",school:"",mascot:"",teamLabel:"",color:"#5b2a86",weekdayStart:"16:00",weekdayEnd:"18:00",weekendStart:"10:00",weekendEnd:"12:00",
  seasonStart:"",seasonEnd:"",practiceDays:[1,2,3,4,5],games:[],special:[]};
const isoOf=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
function addDays(iso,n){const d=dObj(iso);d.setDate(d.getDate()+n);return isoOf(d);}
function computePractices(st){
  const games={};(st.games||[]).forEach(g=>{if(g.date)games[g.date]=g;});
  const special={};(st.special||[]).forEach(x=>{if(x.date)special[x.date]=x;});
  const days=new Set(st.practiceDays||[]), out=new Map();
  const noteFor=(iso,base)=>{const g=games[addDays(iso,1)];const before=g?`Before ${g.opponent||"game"} (${DOW[dObj(g.date).getDay()]})`:"";return [base,before].filter(Boolean).join(" · ");};
  if(st.seasonStart&&st.seasonEnd&&st.seasonStart<=st.seasonEnd){
    for(let iso=st.seasonStart,guard=0;iso<=st.seasonEnd&&guard<400;iso=addDays(iso,1),guard++){
      const sp=special[iso];
      let on=days.has(dObj(iso).getDay())&&!games[iso];
      if(sp&&sp.kind==="off")on=false;
      if(sp&&sp.kind==="extra")on=true;
      if(on)out.set(iso,noteFor(iso,sp&&sp.kind!=="off"?sp.note||"":""));
    }
  }
  Object.values(special).forEach(x=>{if(x.kind==="extra"&&!out.has(x.date))out.set(x.date,noteFor(x.date,x.note||""));});
  return [...out.entries()].sort((a,b)=>a[0]<b[0]?-1:1);
}
function teamTitle(){return [SETTINGS.school,SETTINGS.mascot].filter(Boolean).join(" ")||"Team";}
function pdfHeader(kind){const k=(kind||SETTINGS.teamLabel||"").toUpperCase();return teamTitle().toUpperCase()+(k?"  |  "+k:"");}
function contrastInk(hex){const m=/^#?([0-9a-f]{6})$/i.exec(hex||"");if(!m)return "#ffffff";const n=parseInt(m[1],16),r=(n>>16&255)/255,g=(n>>8&255)/255,b=(n&255)/255;
  const L=[r,g,b].map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4));return (0.2126*L[0]+0.7152*L[1]+0.0722*L[2])>0.4?"#17141c":"#ffffff";}
/* Second color and logo. color2 is only used for stripes and fills, so any color stays readable. */
function applyBrand(st){
  const root=document.documentElement,c2=st.color2||"";
  if(c2){root.style.setProperty("--team2",c2);root.classList.add("has-c2");}
  else{root.style.removeProperty("--team2");root.classList.remove("has-c2");}
  const img=document.getElementById("brandLogo");
  if(img){if(st.logo){img.src=st.logo;img.hidden=false;}else{img.removeAttribute("src");img.hidden=true;}}
  const fav=document.querySelector('link[rel="icon"]');if(fav)fav.href=st.logo||"icons/icon-192.png";
}
/* A grayscale PNG of the logo for the black-and-white printouts (cached per logo). */
let _grayLogo={src:null,url:null,w:0,h:0};
function grayLogo(src){
  if(!src)return Promise.resolve(null);
  if(_grayLogo.src===src)return Promise.resolve(_grayLogo);
  return new Promise(res=>{const im=new Image();im.onload=()=>{
    const c=document.createElement("canvas");c.width=im.naturalWidth;c.height=im.naturalHeight;const x=c.getContext("2d");
    x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0);
    const d=x.getImageData(0,0,c.width,c.height),a=d.data;
    for(let i=0;i<a.length;i+=4){const g=Math.round(.299*a[i]+.587*a[i+1]+.114*a[i+2]);a[i]=a[i+1]=a[i+2]=g;}
    x.putImageData(d,0,0);_grayLogo={src,url:c.toDataURL("image/png"),w:c.width,h:c.height};res(_grayLogo);
  };im.onerror=()=>res(null);im.src=src;});
}
/* Draw the logo in a box (points) at the left edge; returns how far to indent the title beside it. */
async function pdfLogo(doc,left,top,box){
  const g=await grayLogo(SETTINGS.logo);if(!g||!g.w)return 0;
  const s=Math.min(box/g.w,box/g.h),w=g.w*s,h=g.h*s;
  try{doc.addImage(g.url,"PNG",left,top+(box-h)/2,w,h);}catch{return 0;}
  return w+12;
}
function applySettings(st){
  SETTINGS={...DEFAULT_SETTINGS,...(st||{})};
  PRACTICES=computePractices(SETTINGS);
  SPORT=SPORTS[SETTINGS.sport]?SETTINGS.sport:"basketball";refreshSportUI();
  document.documentElement.style.setProperty("--team",SETTINGS.color||"#5b2a86");
  document.documentElement.style.setProperty("--team-ink",contrastInk(SETTINGS.color));
  applyBrand(SETTINGS);
  $("#eyebrow").textContent=[SETTINGS.school,SETTINGS.teamLabel].filter(Boolean).join(" · ");
  $("#brandName").textContent=SETTINGS.mascot||SETTINGS.school||"Team";
  document.title=(SETTINGS.mascot||SETTINGS.school||"Coach")+" Practice Planner";
  const tc=document.querySelector('meta[name="theme-color"]');if(tc)tc.content=SETTINGS.color||"#5b2a86";
  if(cur){buildDateSelect();renderPlan();}
  if(window.onCalChange)window.onCalChange();
}

const toMin=t=>{const [h,m]=(t||"0:0").split(":").map(Number);return h*60+m};
const fmt=m=>{let h=Math.floor(m/60)%24,mm=m%60;const h12=((h+11)%12)+1;return h12+":"+String(mm).padStart(2,"0")};
const dObj=s=>new Date(s+"T12:00:00");
const dLabel=s=>dObj(s).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
const catsOf=d=>Array.isArray(d.categories)&&d.categories.length?d.categories:(d.category?[d.category]:[]);
const catLabel=d=>catsOf(d).join(" / ");
const uid=()=>Math.random().toString(36).slice(2,10);

let db=null, canWrite=true;
let drills=[];           // [{id,...}]
let plans={};            // date -> plan
let cur=null;            // current plan object (working copy)
let pickCat="", saveTimer=null;

/* Practice times for a day: a special day's own times (e.g. no-school days start earlier), else weekday/weekend times. */
function practiceTimes(date,st){
  st=st||SETTINGS;const sp=(st.special||[]).find(x=>x.date===date);
  const wk=[0,6].includes(dObj(date).getDay());
  return {start:(sp&&sp.start)||(wk?st.weekendStart:st.weekdayStart)||"16:00",end:(sp&&sp.end)||(wk?st.weekendEnd:st.weekdayEnd)||"18:00"};
}
function defaultPlan(date){
  const t=practiceTimes(date);
  return {date,start:t.start,end:t.end,focus:"",blocks:[]};
}
function todayISO(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}

/* ---------- date select ---------- */
function buildDateSelect(){
  const sel=$("#planDate");
  const known=new Set(PRACTICES.map(p=>p[0]));
  const extra=Object.keys(plans).filter(d=>!known.has(d));
  const all=[...PRACTICES.map(p=>p[0]),...extra].sort();
  const note=Object.fromEntries(PRACTICES.map(p=>[p[0],p[1]||""]));
  const prev=sel.value;
  sel.innerHTML=all.map(d=>`<option value="${d}">${dLabel(d)}${note[d]?" — "+esc(note[d]):""}${plans[d]&&plans[d].blocks&&plans[d].blocks.length?"  ✓":""}</option>`).join("");
  if(prev&&all.includes(prev)) sel.value=prev;
  else if(all.length){const t=todayISO();sel.value=all.find(d=>d>=t)||all[all.length-1];}
  else{sel.innerHTML=`<option value="${todayISO()}">${dLabel(todayISO())}</option>`;sel.value=todayISO();}
}

/* ---------- plan rendering ---------- */
function loadPlan(date){
  cur=JSON.parse(JSON.stringify(plans[date]||defaultPlan(date)));
  renderPlan();
}
function coachField(b){
  if(READONLY)return b.coach?`<div class="led">Led by ${esc(b.coach)}</div>`:"";
  if(STAFF.length<2&&!b.coach)return "";
  const names=[...new Set([...STAFF,b.coach].filter(Boolean))];
  return `<select class="coachSel" data-act="coach" aria-label="Coach leading ${esc(b.name)}"><option value="">Led by: anyone</option>${names.map(n=>`<option value="${esc(n)}"${n===b.coach?" selected":""}>Led by ${esc(n)}</option>`).join("")}</select>`;
}
function renderPlan(){
  $("#planStart").value=cur.start; $("#planEnd").value=cur.end; $("#planFocus").value=cur.focus||"";
  const info=PRACTICES.find(p=>p[0]===cur.date);
  $("#dayTag").innerHTML=info&&info[1]?`<span class="daytag${/Before/.test(info[1])?" game":""}">${esc(info[1])}</span>`:"";
  const s=toMin(cur.start), e=toMin(cur.end), avail=Math.max(0,e-s);
  let t=s, used=0;
  const list=$("#script");
  if(!cur.blocks.length){
    list.innerHTML=`<li class="empty">No drills yet. Add drills from the list on the right, or copy a past plan below. Times fill in automatically from ${fmt(s)}.</li>`;
  } else {
    list.innerHTML=cur.blocks.map((b,i)=>{
      const st=t; t+=b.minutes; used+=b.minutes;
      const late=t>e;
      return `<li class="block${late?" late":""}" data-i="${i}">
        <div class="time">${fmt(st)}–${fmt(t)}<small>${b.minutes} min</small></div>
        <div style="min-width:0"><div class="name">${esc(b.name)}${b.category?`<span class="chip">${esc(b.category)}</span>`:""}</div>
          ${coachField(b)}
          ${READONLY?(b.notes?`<div class="note-ro">${esc(b.notes)}</div>`:""):`<input class="note" data-act="note" value="${esc(b.notes||"")}" placeholder="Notes for today" aria-label="Notes for ${esc(b.name)}">`}</div>
        <div class="ctrls edit-only">
          <div class="mins"><button data-act="dec" aria-label="Less time">−</button><input data-act="min" type="number" min="1" max="90" value="${b.minutes}" aria-label="Minutes"><button data-act="inc" aria-label="More time">+</button></div>
          <button class="icon" data-act="up" aria-label="Move up">↑</button>
          <button class="icon" data-act="down" aria-label="Move down">↓</button>
          <button class="icon" data-act="del" aria-label="Remove">✕</button>
        </div></li>`;
    }).join("");
  }
  renderMeter(s,avail,used);
  renderCopyFrom();
  renderPick();
}
function totals(){const avail=Math.max(0,toMin(cur.end)-toMin(cur.start));const used=cur.blocks.reduce((a,b)=>a+b.minutes,0);return {avail,used,left:avail-used};}
function renderMeter(s,avail,used){
  const left=avail-used, m=$("#meter");
  m.classList.toggle("over",left<0); m.classList.toggle("full",left===0&&used>0);
  $("#mLeft").textContent=Math.abs(left);
  $("#mLeftLabel").textContent=left<0?"min over":left===0&&used>0?"min left · full":"min left";
  $("#planEdited").textContent=cur.editedBy?`Last edited by ${cur.editedBy} · ${ago(cur.editedAt)}`:"";
  $("#mUsed").textContent=used; $("#mAvail").textContent=avail;
  const scale=Math.max(avail,used)||1;
  let acc=0;
  $("#mTrack").innerHTML=cur.blocks.map(b=>{
    const inT=Math.max(0,Math.min(b.minutes,avail-acc)), outT=b.minutes-inT; acc+=b.minutes;
    return (inT?`<i style="width:${inT/scale*100}%" title="${esc(b.name)}"></i>`:"")+(outT?`<i class="overflow" style="width:${outT/scale*100}%"></i>`:"");
  }).join("");
  const ticks=[];for(let k=0;k<=avail;k+=30)ticks.push(k);if(ticks[ticks.length-1]!==avail)ticks.push(avail);
  $("#mTicks").innerHTML=avail?ticks.map(k=>`<span style="left:${k/scale*100}%">${fmt(s+k)}</span>`).join(""):"";
  if(left<0&&!msgTimer)$("#mMsg").textContent=`Booked past ${fmt(s+avail)}. Shorten or remove ${-left} min of drills.`;
  else if(!msgTimer)$("#mMsg").textContent="";
}
let msgTimer=null;
function flash(t){$("#mMsg").textContent=t;clearTimeout(msgTimer);msgTimer=setTimeout(()=>{msgTimer=null;renderPlan();},3500);}
function renderCopyFrom(){
  const opts=Object.values(plans).filter(p=>p.date!==cur.date&&p.blocks&&p.blocks.length).sort((a,b)=>b.date.localeCompare(a.date));
  $("#copyFrom").innerHTML=`<option value="">Copy a past plan…</option>`+opts.map(p=>`<option value="${p.date}">${dLabel(p.date)}${p.focus?" — "+esc(p.focus):""}</option>`).join("");
}

function changed(){renderPlan();scheduleSave();}
function scheduleSave(){
  if(!db||!canWrite){$("#saved").textContent=db?"View only":"Not saved in this view";return;}
  $("#saved").textContent="Saving…";
  clearTimeout(saveTimer);
  saveTimer=setTimeout(async()=>{
    cur.editedBy=ME.name;cur.editedAt=Date.now();
    const snap=JSON.parse(JSON.stringify(cur));
    plans[snap.date]=snap;
    try{await db.collection("plans").doc(snap.date).set(snap);$("#saved").textContent="Saved";if(cur&&cur.date===snap.date)$("#planEdited").textContent=`Last edited by ${snap.editedBy} · ${ago(snap.editedAt)}`;}
    catch(e){handleWriteErr(e);}
    saveTimer=null;
  },700);
}
function handleWriteErr(e){
  if(e&&e.code==="invalid_argument"){canWrite=false;$("#saved").textContent="View only";showNotice("You do not have permission to change this team data.");}
  else if(e&&e.code==="quota_exceeded"){$("#saved").textContent="Not saved";showNotice("Storage is full. Delete some old plans or drills, then try again.");}
  else{$("#saved").textContent="Not saved — check your connection";}
}
function showNotice(t){const n=$("#notice");n.textContent=t;n.hidden=false;}

function addBlock(b){
  const {left}=totals();
  if(left<=0){flash("Practice is full. Shorten or remove a drill to make room.");return;}
  if(b.minutes>left){flash(`${b.name} shortened to ${left} min to fit.`);b={...b,minutes:left};}
  cur.blocks.push({id:uid(),notes:"",...b});changed();
}

$("#script").addEventListener("click",e=>{
  const btn=e.target.closest("button[data-act]"); if(!btn)return;
  const i=+btn.closest(".block").dataset.i, b=cur.blocks[i], a=btn.dataset.act;
  if(a==="inc"){if(totals().left<=0){flash("No minutes left. Take time from another drill first.");return;}b.minutes=Math.min(90,b.minutes+1);}
  if(a==="dec")b.minutes=Math.max(1,b.minutes-1);
  if(a==="up"&&i>0)[cur.blocks[i-1],cur.blocks[i]]=[cur.blocks[i],cur.blocks[i-1]];
  if(a==="down"&&i<cur.blocks.length-1)[cur.blocks[i+1],cur.blocks[i]]=[cur.blocks[i],cur.blocks[i+1]];
  if(a==="del")cur.blocks.splice(i,1);
  changed();
});
$("#script").addEventListener("change",e=>{
  const el=e.target; const li=el.closest(".block"); if(!li)return;
  const b=cur.blocks[+li.dataset.i];
  if(el.dataset.act==="min"){const max=Math.max(1,b.minutes+Math.max(0,totals().left));let v=Math.max(1,Math.min(90,parseInt(el.value)||1));if(v>max){flash(`Only ${max} min fit for ${b.name}.`);v=max;}b.minutes=v;changed();}
  if(el.dataset.act==="note"){b.notes=el.value;scheduleSave();}
  if(el.dataset.act==="coach"){if(el.value)b.coach=el.value;else delete b.coach;scheduleSave();}
});
$("#planDate").addEventListener("change",e=>{loadPlan(e.target.value);if(window.onViewChange)window.onViewChange();});
$("#planStart").addEventListener("change",e=>{cur.start=e.target.value||cur.start;changed();});
$("#planEnd").addEventListener("change",e=>{cur.end=e.target.value||cur.end;changed();});
$("#planFocus").addEventListener("change",e=>{cur.focus=e.target.value;scheduleSave();renderCopyFrom();});
$("#copyFrom").addEventListener("change",e=>{
  const src=plans[e.target.value]; if(!src)return;
  cur.blocks=src.blocks.map(b=>({...b,id:uid()}));
  if(!cur.focus)cur.focus=src.focus||"";
  changed();
});
let clearArmed=false;
$("#clearPlan").addEventListener("click",e=>{
  if(!cur.blocks.length)return;
  if(!clearArmed){clearArmed=true;e.target.textContent="Tap again to clear";setTimeout(()=>{clearArmed=false;e.target.textContent="Clear plan";},3000);return;}
  clearArmed=false;e.target.textContent="Clear plan";cur.blocks=[];changed();
});
$("#copyText").addEventListener("click",async e=>{
  let t=toMin(cur.start);
  const lines=[`${teamTitle()} Practice — ${dLabel(cur.date)} (${fmt(toMin(cur.start))}–${fmt(toMin(cur.end))})`];
  if(cur.focus)lines.push("Focus: "+cur.focus);
  lines.push("");
  cur.blocks.forEach(b=>{const s=t;t+=b.minutes;lines.push(`${fmt(s)}–${fmt(t)}  ${b.name} (${b.minutes} min)${b.coach?" ["+b.coach+"]":""}${b.notes?" — "+b.notes:""}`);});
  const text=lines.join("\n");
  try{await navigator.clipboard.writeText(text);e.target.textContent="Copied";}
  catch{const ta=document.createElement("textarea");ta.value=text;document.body.append(ta);ta.select();try{document.execCommand("copy");e.target.textContent="Copied";}catch{e.target.textContent="Copy failed";}ta.remove();}
  setTimeout(()=>e.target.textContent="Copy as text",1800);
});
document.querySelectorAll("[data-quick]").forEach(b=>b.addEventListener("click",()=>addBlock({drillId:null,name:b.dataset.quick,category:"",minutes:+b.dataset.min})));

/* ---------- printable black & white PDF ---------- */
async function buildPdf(){
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:"pt",format:"letter"});
  const W=612,H=792,M=40,R=W-M;
  const cols=[M,M+82,M+112,M+280]; // time, min, drill, notes
  let y=M;
  doc.setTextColor(0);doc.setDrawColor(0);
  const lx=M+await pdfLogo(doc,M,M-12,50);
  doc.setFont("helvetica","bold");doc.setFontSize(9);
  doc.text(pdfHeader(),lx,y);y+=24;
  doc.setFontSize(22);doc.text("PRACTICE PLAN",lx,y);
  doc.setFontSize(12);doc.setFont("helvetica","normal");
  const dl=dObj(cur.date).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});
  doc.text(dl,R,y-14,{align:"right"});
  doc.text(`${fmt(toMin(cur.start))} – ${fmt(toMin(cur.end))} PM`,R,y,{align:"right"});
  y+=10;doc.setLineWidth(2);doc.line(M,y,R,y);y+=18;
  const info=PRACTICES.find(p=>p[0]===cur.date);
  doc.setFontSize(10.5);
  if(cur.focus){doc.setFont("helvetica","bold");doc.text("FOCUS:",M,y);doc.setFont("helvetica","normal");const f=doc.splitTextToSize(cur.focus,R-M-50);doc.text(f,M+50,y);y+=f.length*13;}
  if(info&&info[1]){doc.setFont("helvetica","bold");doc.text("NOTE:",M,y);doc.setFont("helvetica","normal");doc.text(info[1],M+50,y);y+=13;}
  y+=8;
  const head=()=>{doc.setFont("helvetica","bold");doc.setFontSize(9);
    doc.setFillColor(0);doc.rect(M,y,R-M,18,"F");doc.setTextColor(255);
    ["TIME","MIN","DRILL","COACHING POINTS / NOTES"].forEach((h,i)=>doc.text(h,cols[i]+5,y+12));
    doc.setTextColor(0);y+=18;};
  head();
  let t=toMin(cur.start),used=0;
  cur.blocks.forEach(b=>{
    const s=t;t+=b.minutes;used+=b.minutes;
    const d=b.drillId?drills.find(x=>x.id===b.drillId):null;
    doc.setFontSize(10);
    const nameL=doc.splitTextToSize(b.name+(b.category?` (${b.category})`:""),cols[3]-cols[2]-10);
    const pts=[b.coach?("Led by: "+b.coach):"",b.notes?("Today: "+b.notes):"",d&&d.points?d.points:""].filter(Boolean).join("\n");
    doc.setFontSize(9);
    const ptsL=pts?doc.splitTextToSize(pts,R-cols[3]-10):[];
    const h=Math.max(nameL.length*12,ptsL.length*11,12)+12;
    if(y+h>H-M-40){doc.addPage();y=M;head();}
    doc.setFontSize(10);doc.setFont("courier","bold");
    doc.text(`${fmt(s)}-${fmt(t)}`,cols[0]+5,y+14);
    doc.setFont("helvetica","normal");doc.text(String(b.minutes),cols[1]+5,y+14);
    doc.setFont("helvetica","bold");doc.text(nameL,cols[2]+5,y+14);
    doc.setFont("helvetica","normal");doc.setFontSize(9);if(ptsL.length)doc.text(ptsL,cols[3]+5,y+13);
    doc.rect(M+0,y,0,0);
    y+=h;doc.setLineWidth(.5);doc.line(M,y,R,y);
    // checkbox-free; vertical rules
    [cols[1],cols[2],cols[3]].forEach(x=>doc.line(x,y-h,x,y));
    doc.line(M,y-h,M,y);doc.line(R,y-h,R,y);
  });
  if(!cur.blocks.length){doc.setFont("helvetica","italic");doc.setFontSize(10);doc.text("No drills planned yet.",M+5,y+16);y+=26;}
  y+=16;doc.setFont("helvetica","bold");doc.setFontSize(10);
  doc.text(`Total planned: ${used} of ${Math.max(0,toMin(cur.end)-toMin(cur.start))} min`,M,y);
  y+=22;
  if(y<H-M-60){doc.text("NOTES",M,y);doc.setLineWidth(.5);y+=20;while(y<H-M-10){doc.line(M,y,R,y);y+=22;}}
  const pids=[...new Set(cur.blocks.map(b=>b.playId).filter(Boolean))];
  for(const id of pids){const p=plays.find(x=>x.id===id);if(p)await addPlayPages(doc,p,false);}
  return doc;
}
$("#printPdf").addEventListener("click",async e=>{
  const btn=e.currentTarget;
  if(!window.jspdf){btn.textContent="PDF tool didn't load";setTimeout(()=>btn.textContent="Printable PDF",2500);return;}
  let doc;try{doc=await buildPdf();}catch{btn.textContent="Couldn't build PDF";setTimeout(()=>btn.textContent="Printable PDF",2500);return;}
  saveFile(`Practice Plan ${cur.date}.pdf`,doc.output("blob"));btn.textContent="PDF downloaded";
  setTimeout(()=>btn.textContent="Printable PDF",2500);
});

/* ---------- bench (drill picker) ---------- */
function renderPickCats(){
  const used=CATS.filter(c=>drills.some(d=>catsOf(d).includes(c)));
  $("#pickCats").innerHTML=[`<button aria-pressed="${!pickCat}" data-c="">All</button>`,...used.map(c=>`<button aria-pressed="${pickCat===c}" data-c="${esc(c)}">${esc(c)}</button>`),...(plays.length?[`<button aria-pressed="${pickCat==="Plays"}" data-c="Plays">Plays</button>`]:[])].join("");
}
function renderPick(){
  const q=$("#pickSearch").value.trim().toLowerCase();
  const list=pickCat==="Plays"?[]:drills.filter(d=>(!pickCat||catsOf(d).includes(pickCat))&&(!q||(d.name+" "+catLabel(d)).toLowerCase().includes(q)));
  const plist=(!pickCat||pickCat==="Plays")?[...plays].sort((a,b)=>a.name.localeCompare(b.name)).filter(p=>!q||(p.name+" "+p.type).toLowerCase().includes(q)):[];
  const left=cur?totals().left:999;
  const pbtn=(attr,name,m)=>left<=0?`<button disabled>Full</button>`:m>left?`<button class="trim" ${attr} aria-label="Add ${esc(name)} for ${left} minutes">Add ${left} min</button>`:`<button ${attr} aria-label="Add ${esc(name)}">Add</button>`;
  document.querySelectorAll("[data-quick]").forEach(q=>q.disabled=left<=0);
  $("#picklist").innerHTML=list.length?list.map(d=>{const m=d.minutes||10;
    const btn=left<=0?`<button disabled>Full</button>`:m>left?`<button class="trim" data-id="${d.id}" aria-label="Add ${esc(d.name)} for ${left} minutes">Add ${left} min</button>`:`<button data-id="${d.id}" aria-label="Add ${esc(d.name)}">Add</button>`;
    return `<div class="pick"><div><b>${esc(d.name)}</b><span>${esc(catsOf(d).join(" · "))} · ${m} min</span></div>${btn}</div>`;}).join("")
    :(plist.length?"":`<div class="empty">${drills.length?"No drills match.":"Your drill library is empty. Add drills in the Drill Library tab."}</div>`);
  $("#picklist").innerHTML+=plist.map(p=>`<div class="pick play"><div><b>${esc(p.name)}</b><span>Play · ${esc(p.type)} · 10 min</span></div>${pbtn(`data-play="${p.id}"`,p.name,10)}</div>`).join("");
}
$("#pickCats").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;pickCat=b.dataset.c;renderPickCats();renderPick();});
$("#pickSearch").addEventListener("input",renderPick);
$("#picklist").addEventListener("click",e=>{
  const pb=e.target.closest("button[data-play]");
  if(pb){const p=plays.find(x=>x.id===pb.dataset.play);if(p)addBlock({drillId:null,playId:p.id,name:p.name,category:"Play · "+p.type,minutes:10});return;}
  const b=e.target.closest("button[data-id]");if(!b)return;
  const d=drills.find(x=>x.id===b.dataset.id);
  addBlock({drillId:d.id,name:d.name,category:catLabel(d),minutes:d.minutes||10});
});

/* ---------- library ---------- */
const getCats=()=>[...document.querySelectorAll("#dCats input:checked")].map(x=>x.value);
const setCats=a=>document.querySelectorAll("#dCats input").forEach(x=>x.checked=a.includes(x.value));
$("#dCats").addEventListener("change",()=>$("#dCatErr").hidden=true);
let editing=null;
function usage(){const u={};Object.values(plans).forEach(p=>(p.blocks||[]).forEach(b=>{if(b.drillId)u[b.drillId]=(u[b.drillId]||0)+1;}));return u;}
function renderLib(){
  $("#drillCount").textContent=drills.length?`(${drills.length})`:"";
  const q=$("#libSearch").value.trim().toLowerCase(), cat=$("#libCat").value, u=usage();
  const list=drills.filter(d=>(!cat||catsOf(d).includes(cat))&&(!q||(d.name+" "+catLabel(d)+" "+d.description+" "+d.points).toLowerCase().includes(q)));
  if(!list.length){$("#library").innerHTML=`<div class="empty">${drills.length?"No drills match your search.":"No drills yet. Add your first drill with the form, and it will show up here and in the practice planner."}</div>`;return;}
  $("#library").innerHTML=CATS.filter(c=>(!cat||c===cat)&&list.some(d=>catsOf(d).includes(c))).map(c=>{
    const ds=list.filter(d=>catsOf(d).includes(c));
    return `<div class="catgroup"><h3>${esc(c)}<small>${ds.length} drill${ds.length>1?"s":""}</small></h3>${ds.map(d=>`
      <article class="drill"><div class="drill-top"><b>${esc(d.name)}</b><span class="drill-meta">${d.minutes} min · used ${u[d.id]||0}×</span></div>
      ${catsOf(d).length>1?`<div class="tags">${catsOf(d).map(x=>`<span class="chip${x===c?" here":""}">${esc(x)}</span>`).join("")}</div>`:""}
      ${d.description?`<p>${esc(d.description)}</p>`:""}
      ${d.points?`<p><strong>Coaching points:</strong> ${esc(d.points)}</p>`:""}
      ${d.editedBy?`<p class="by">Added or edited by ${esc(d.editedBy)}</p>`:""}<div class="actions edit-only"><button class="btn" data-edit="${d.id}">Edit</button><button class="btn" data-copy="drills" data-id="${d.id}">Copy to team</button><button class="btn danger" data-del="${d.id}">Delete</button></div></article>`).join("")}</div>`;
  }).join("");
}
$("#libSearch").addEventListener("input",renderLib);
$("#libCat").addEventListener("change",renderLib);
$("#library").addEventListener("click",async e=>{
  const ed=e.target.closest("[data-edit]"), del=e.target.closest("[data-del]");
  if(ed){const d=drills.find(x=>x.id===ed.dataset.edit);editing=d.id;
    $("#dName").value=d.name;setCats(catsOf(d));$("#dMin").value=d.minutes;$("#dDesc").value=d.description||"";$("#dPoints").value=d.points||"";
    $("#formTitle").textContent="Edit drill";$("#dSave").textContent="Save changes";$("#dCancel").hidden=false;$("#dName").focus();window.scrollTo({top:0,behavior:"smooth"});}
  if(del){
    if(del.dataset.armed!=="1"){del.dataset.armed="1";del.textContent="Tap to confirm";setTimeout(()=>{del.dataset.armed="";del.textContent="Delete";},3000);return;}
    const id=del.dataset.del; drills=drills.filter(x=>x.id!==id); renderAllDrills();
    if(db&&canWrite){try{await db.collection("drills").doc(id).delete();}catch(err){handleWriteErr(err);}}
  }
});
function resetForm(){editing=null;$("#drillForm").reset();setCats([]);$("#dCatErr").hidden=true;$("#dMin").value=10;$("#formTitle").textContent="Add a drill";$("#dSave").textContent="Add drill";$("#dCancel").hidden=true;}
$("#dCancel").addEventListener("click",resetForm);
$("#drillForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const cs=getCats();
  if(!cs.length){$("#dCatErr").hidden=false;return;}
  const body={editedBy:ME.name,name:$("#dName").value.trim(),categories:cs,category:cs[0],minutes:Math.max(1,parseInt($("#dMin").value)||10),description:$("#dDesc").value.trim(),points:$("#dPoints").value.trim()};
  if(!body.name)return;
  const id=editing||uid()+uid();
  const prev=drills.find(d=>d.id===id);
  body.createdAt=prev?prev.createdAt:Date.now();
  if(prev)Object.assign(prev,body);else drills.push({id,...body});
  sortDrills();renderAllDrills();resetForm();
  if(db&&canWrite){try{await db.collection("drills").doc(id).set(body);}catch(err){handleWriteErr(err);}}
});
function sortDrills(){drills.sort((a,b)=>a.name.localeCompare(b.name));}
function renderAllDrills(){renderLib();renderPickCats();renderPick();}


/* ---------- plays: drawing board + library ---------- */
function hints(t){
  const n=sp().players, L=sp().tools;
  return ({move:"Drag players and the ball. Lines attached to a player move with them.",
    o:`Tap to place the next player (1–${n}).`,d:`Tap to place the next defender (X1–X${n}).`,
    ball:"Tap a player to give them the ball.",
    cut:`Drag from a player to draw a ${(L.cut||"move").toLowerCase()}.`,pass:`Tap the player to ${(L.pass||"pass").toLowerCase()} to. Keep tapping players to ${(L.pass||"pass").toLowerCase()} again in the same step.`,
    dribble:`Drag from the player with the ball to draw a ${(L.dribble||"dribble").toLowerCase()}.`,screen:`Drag from a player to where she sets the ${(L.screen||"screen").toLowerCase()}.`,
    label:"Tap a player to give them a label, like PG, QB or 1B.",
    erase:"Tap a player, the ball or a line to remove it."})[t]||"";
}
let plays=[], play=null, fi=0, tool="move", hist=[], pdirty=false, drag=null, temp=null, hintTimer=null;
const frame=()=>play.frames[fi];

function formTokens(name){
  const f=sp().forms[name]||[];
  const toks=f.map(([n,x,y],i)=>typeof n==="number"?{id:"o"+n,kind:"o",n,x,y}:{id:"o"+(i+1),kind:"o",n:i+1,label:n,x,y});
  if(toks.length){const h=toks[0];toks.push({id:"ball",kind:"ball",x:h.x+13,y:h.y-13});}
  return toks;
}
function blankPlay(){const f=Object.keys(sp().forms)[0];return {id:null,name:"",type:sp().playTypes[0],notes:"",frames:[{caption:"",tokens:f?formTokens(f):[],actions:[]}]};}

/* geometry */
/* editor rendering */
function renderBoard(){$("#board").innerHTML=boardInner(frame(),"screen",temp);renderOptBanner(fi);}
/* The option banner above the board: says loudly when you're looking at an option, not the main play. */
function renderOptBanner(i){
  const L=playLines(play.frames),n=stepName(play.frames,L,i),lead=!n.opt&&anim&&anim.opt?L.options.find(x=>x.id===anim.opt.id):null;
  $("#pOptBanner").hidden=!n.opt&&!lead;$("#boardFrame").classList.toggle("opt",!!n.opt);
  if(n.opt)$("#pOptBanner").innerHTML=`<b>${esc(n.opt.title)}</b><span>Step ${n.opt.steps.indexOf(i)+1} of ${n.opt.steps.length} · ${esc(n.where)}</span>`;
  else if(lead)$("#pOptBanner").innerHTML=`<b>${esc(lead.title)}</b><span>Set-up: the option starts after step ${lead.branch+1}</span>`;
}
function renderSteps(){
  const L=playLines(play.frames);
  const branches=k=>L.options.filter(o=>o.branch===k).map(o=>o.letter).join("");
  $("#pSteps").innerHTML=L.main.map((i,k)=>`<button class="step" aria-pressed="${i===fi}" data-step="${i}">Step ${k+1}${branches(k)?`<span class="branch" title="Options branch off here">${branches(k)}</span>`:""}</button>`).join("")+
    L.options.map(o=>`<div class="optgroup"><span class="optlabel">${esc(o.title)}<small>after step ${o.branch+1}</small></span>`+
      o.steps.map((i,k)=>`<button class="step opt" aria-pressed="${i===fi}" data-step="${i}">${o.letter}${k+1}</button>`).join("")+`</div>`).join("");
  $("#pDelStep").disabled=L.main.length<2&&!frame().opt;
  $("#pCaption").value=frame().caption||"";
  const o=optionOf(play.frames,L,fi);
  $("#pOptBox").hidden=!o;if(o&&document.activeElement!==$("#pOptName"))$("#pOptName").value=o.name;
  $("#pAddOpt").textContent=o?`+ Another option after step ${o.branch+1}`:`+ Add option after this step`;
  $("#pLines").hidden=!L.options.length;
  $("#pLines").innerHTML=`<span class="lbl">Play</span><button class="btn" data-line="">Main play</button>`+L.options.map(o=>`<button class="btn optbtn" data-line="${o.id}">${esc(o.title)}</button>`).join("");
  renderOptBanner(fi);
}
const fidOf=f=>f.fid||(f.fid=uid());
function renderEditor(){
  if(anim)stopAnim();
  $("#pName").value=play.name;$("#pType").value=play.type;$("#pNotes").value=play.notes||"";
  renderSteps();renderBoard();
  $("#pStatus").textContent=pdirty?"Unsaved changes":(play.id?"Saved":"");
  $("#pEditTitle").textContent=play.id?(READONLY?play.name||"Play":"Edit play"):"New play";
}
function setTool(t){tool=t;document.querySelectorAll("#ptools [data-tool]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.tool===t));$("#pHint").textContent=hints(t);$("#labelBox").hidden=true;}
function pflash(t){$("#pHint").textContent=t;clearTimeout(hintTimer);hintTimer=setTimeout(()=>$("#pHint").textContent=hints(tool),3000);}
function markDirty(){pdirty=true;$("#pStatus").textContent="Unsaved changes";}
function pushHist(){hist.push(JSON.stringify({frames:play.frames,fi}));if(hist.length>60)hist.shift();}

/* pointer handling */
function svgPt(e){const svg=$("#board"),p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(svg.getScreenCTM().inverse());return {x:Math.max(VB.x+8,Math.min(VB.x+VB.w-8,q.x)),y:Math.max(VB.y+8,Math.min(VB.y+VB.h-8,q.y))};}
function hitTok(p,kinds){let best=null,bd=22;frame().tokens.forEach(t=>{if(kinds&&!kinds.includes(t.kind))return;const d=dist(p,t)-(t.kind==="ball"?6:0);if(d<bd){bd=d;best=t;}});return best;}
/* Where a player ends up at the end of this step (the end of their cut, or where they stand). */
function destOf(fr,id){const a=fr.actions.find(a=>a.from===id&&isMove(a));if(a)return {x:a.x2,y:a.y2};const t=fr.tokens.find(t=>t.id===id);return t?{x:t.x,y:t.y}:null;}
/* A pass to a player always ends where that player will catch it (after their cut). */
function syncPasses(fr){
  fr.actions.forEach(a=>{if(a.type!=="pass"||!a.to)return;const d=destOf(fr,a.to);if(!d){a.to=null;return;}
    const dx=d.x-a.x2,dy=d.y-a.y2;if(Math.abs(dx)+Math.abs(dy)<.5)return;a.x2=d.x;a.y2=d.y;a.cx+=dx/2;a.cy+=dy/2;});
  const caught=new Set();
  fr.actions.forEach(a=>{if(a.type!=="pass")return;
    if(a.from&&caught.has(a.from)){const d=destOf(fr,a.from);if(d){const dx=d.x-a.x1,dy=d.y-a.y1;if(Math.abs(dx)+Math.abs(dy)>=.5){a.x1=d.x;a.y1=d.y;a.cx+=dx/2;a.cy+=dy/2;}}}
    if(a.to)caught.add(a.to);});
  fr.actions.forEach(a=>{if(a.type!=="shot")return;const who=finalHolder(fr);const s=who&&shotStart(fr,who);
    if(!s){fr.actions=fr.actions.filter(x=>x!==a);return;}a.from=who;Object.assign(a,shotArc(s));});
}
/* The teammate at a spot: someone standing there, or someone whose cut ends there. */
function receiverAt(fr,pt,except){let r=null,bd=26;
  fr.tokens.forEach(o=>{if(o.kind!=="o"||o.id===except)return;const d=destOf(fr,o.id),k=Math.min(dist(pt,d),dist(pt,o)+4);if(k<bd){bd=k;r=o;}});return r;}
/* Tap-to-pass: the ball goes from whoever has it now (after earlier passes this step) to the tapped teammate. */
function tapPass(pt){
  const fr=frame(),from=finalHolder(fr),passer=from&&fr.tokens.find(x=>x.id===from);
  if(fr.actions.some(a=>a.type==="shot")){pflash("This step ends with a shot. Tap Shot to remove it before adding passes.");return;}
  if(!passer){pflash(fr.actions.some(a=>a.type==="pass")?"The last pass went to an empty spot. Tap Undo, or start a new step.":"Give a player the ball first (Ball tool), then tap players to pass.");return;}
  const r=receiverAt(fr,pt,from);
  if(!r&&dist(pt,destOf(fr,from))<26){pflash(`${passer.label||passer.n} already has the ball. Tap a teammate to pass to.`);return;}
  const a0=destOf(fr,from),start=catchers(fr).includes(from)||fr.actions.some(a=>a.from===from&&isMove(a))?a0:{x:passer.x,y:passer.y};
  const end=r?destOf(fr,r.id):pt;
  pushHist();
  editStep(()=>{fr.actions.push({id:uid(),type:"pass",from,to:r?r.id:null,x1:start.x,y1:start.y,cx:(start.x+end.x)/2,cy:(start.y+end.y)/2,x2:end.x,y2:end.y});});
  markDirty();renderBoard();
  const n=fr.actions.filter(a=>a.type==="pass").length;
  pflash(r?`Pass ${n}: ${passer.label||passer.n} → ${r.label||r.n}. Tap the next player to pass again${n>1?"":" in this step"}, or Undo.`:`Pass ${n}: ${passer.label||passer.n} → that spot.`);
}
/* Who has the ball after this step's passes (null if the last pass goes to an empty spot). */
function finalHolder(fr){const h=holderOf(fr);let id=h?h.id:null;fr.actions.forEach(a=>{if(a.type==="pass")id=a.to||null;});return id;}
/* Players who catch a pass in this step: a later pass from them starts where they caught it. */
function catchers(fr){return fr.actions.filter(a=>a.type==="pass"&&a.to).map(a=>a.to);}
/* A shot leaves from where the shooter is at the end of the step and arcs to the basket or goal. */
function shotStart(fr,id){const d=destOf(fr,id),t=fr.tokens.find(x=>x.id===id),b=fr.tokens.find(x=>x.kind==="ball"),h=holderOf(fr);
  if(!d||!t)return null;return b&&h&&h.id===id&&!catchers(fr).includes(id)?{x:d.x+(b.x-t.x),y:d.y+(b.y-t.y)}:{x:d.x+13,y:d.y-13};}
function shotArc(s){const T=sp().target,len=Math.hypot(T.x-s.x,T.y-s.y),lift=Math.max(22,len*.32);
  const mx=(s.x+T.x)/2,my=(s.y+T.y)/2,nx=(T.y-s.y)/(len||1),ny=-(T.x-s.x)/(len||1),side=ny<0?1:-1;
  return {x1:s.x,y1:s.y,cx:mx+nx*lift*side,cy:my+ny*lift*side,x2:T.x,y2:T.y};}
/* After a change in step i, carry the new end positions into the following steps,
   but only for players and the ball that were just sitting where the old step left them. */
function carryForward(i,before){
  const after=nextTokens(play.frames[i]);
  const L=playLines(play.frames),seqs=[lineIdx(L,null),...L.options.map(o=>lineIdx(L,o))].filter(q=>q.includes(i));
  seqs.forEach(seq=>after.forEach(n=>{
    const o=before.find(x=>x.id===n.id);if(!o||dist(o,n)<1)return;
    for(let q=seq.indexOf(i)+1;q<seq.length;q++){
      const fj=play.frames[seq[q]],t=fj.tokens.find(x=>x.id===n.id);
      if(!t||dist(t,o)>2)break;
      const dx=n.x-t.x,dy=n.y-t.y;
      if(t.kind!=="ball"){const h=holderOf(fj);const b=fj.tokens.find(x=>x.kind==="ball");
        fj.actions.forEach(a=>{if(a.from===t.id){a.x1+=dx;a.y1+=dy;a.cx+=dx/2;a.cy+=dy/2;}});
        t.x=n.x;t.y=n.y;
        if(h&&h.id===t.id&&b&&!after.some(x=>x.kind==="ball"&&before.some(y=>y.kind==="ball"&&dist(x,y)>=1))){b.x+=dx;b.y+=dy;}
        syncPasses(fj);
        if(fj.actions.some(a=>a.from===t.id&&isMove(a)))break;
      }else{
        t.x=n.x;t.y=n.y;
        const h=holderOf(fj);
        if(fj.actions.some(a=>!isMove(a))||(h&&fj.actions.some(a=>a.from===h.id&&isMove(a))))break;
      }
    }
  }));
}
/* Run an edit on the current step, then keep the arrows and later steps in line with it. */
function editStep(fn){const before=nextTokens(frame());fn();syncPasses(frame());carryForward(fi,before);}
function hitAct(p){let best=null,bd=12;frame().actions.forEach(a=>{samples(a).forEach(q=>{const d=dist(p,q);if(d<bd){bd=d;best=a;}});});return best;}

const board=$("#board");
board.addEventListener("pointerdown",e=>{
  if(!play||anim||READONLY)return;
  const p=svgPt(e), fr=frame();
  if(tool==="move"){
    const t=hitTok(p);if(!t)return;
    pushHist();const h=holderOf(fr);
    drag={t,dx:p.x-t.x,dy:p.y-t.y,ball:t.kind!=="ball"&&h&&h.id===t.id?fr.tokens.find(x=>x.kind==="ball"):null,moved:false,before:nextTokens(fr)};
    board.setPointerCapture(e.pointerId);return;
  }
  if(tool==="o"||tool==="d"){
    const used=fr.tokens.filter(t=>t.kind===tool).map(t=>t.n);
    const n=Array.from({length:sp().players},(_,k)=>k+1).find(k=>!used.includes(k));
    if(!n){pflash(`All ${sp().players} ${tool==="o"?"players":"defenders"} are placed. Use Move to reposition.`);return;}
    pushHist();fr.tokens.push({id:tool+n,kind:tool,n,x:p.x,y:p.y});markDirty();renderBoard();return;
  }
  if(tool==="ball"){
    const t=hitTok(p,["o"]);pushHist();
    let b=fr.tokens.find(x=>x.kind==="ball");if(!b){b={id:"ball",kind:"ball"};fr.tokens.push(b);}
    if(t){b.x=t.x+13;b.y=t.y-13;}else{b.x=p.x;b.y=p.y;}
    markDirty();renderBoard();return;
  }
  if(tool==="label"){
    const t=hitTok(p,["o"]);if(!t){pflash("Tap a player to label them.");return;}
    labelTarget=t.id;$("#labelBox").hidden=false;$("#labelWho").textContent=`Label for player ${t.n}`;$("#labelInput").value=t.label||"";$("#labelInput").focus();return;
  }
  if(tool==="erase"){
    const t=hitTok(p);
    if(t){pushHist();fr.tokens=fr.tokens.filter(x=>x!==t);fr.actions=fr.actions.filter(a=>a.from!==t.id&&a.to!==t.id);markDirty();renderBoard();return;}
    const a=hitAct(p);if(a){pushHist();editStep(()=>{fr.actions=fr.actions.filter(x=>x!==a);});markDirty();renderBoard();}
    return;
  }
  // line tools
  let s=hitTok(p,["o","d"]),st=s?{x:s.x,y:s.y}:null;
  if(tool==="pass"){
    /* Chain passes in one step: start a pass from where a teammate catches the previous one. */
    let bd=24;catchers(fr).forEach(id=>{const d=destOf(fr,id);if(d&&dist(p,d)<bd){bd=dist(p,d);s=fr.tokens.find(x=>x.id===id);st={x:d.x,y:d.y};}});
  }
  st=st||p;
  temp={type:tool,pts:[st],from:s?s.id:null,x1:st.x,y1:st.y,cx:st.x,cy:st.y,x2:st.x,y2:st.y};
  board.setPointerCapture(e.pointerId);
});
board.addEventListener("pointermove",e=>{
  if(drag){const p=svgPt(e),t=drag.t,ox=t.x,oy=t.y;t.x=p.x-drag.dx;t.y=p.y-drag.dy;const dx=t.x-ox,dy=t.y-oy;
    if(drag.ball){drag.ball.x+=dx;drag.ball.y+=dy;}
    frame().actions.forEach(a=>{if(a.from===t.id){a.x1+=dx;a.y1+=dy;a.cx+=dx/2;a.cy+=dy/2;}});syncPasses(frame());
    drag.moved=true;renderBoard();return;}
  if(temp){const p=svgPt(e),last=temp.pts[temp.pts.length-1];if(dist(p,last)<3)return;temp.pts.push(p);
    const s=temp.pts[0],m=temp.pts[Math.floor(temp.pts.length/2)];
    Object.assign(temp,{x2:p.x,y2:p.y,cx:2*m.x-(s.x+p.x)/2,cy:2*m.y-(s.y+p.y)/2});renderBoard();}
});
function endPointer(){
  if(drag){if(drag.moved){syncPasses(frame());carryForward(fi,drag.before);markDirty();}else hist.pop();drag=null;return;}
  if(!temp)return;
  const t=temp;temp=null;
  const s=t.pts[0],e=t.pts[t.pts.length-1];
  if(t.pts.length<3||dist(s,e)<20){if(t.type==="pass"){tapPass(e);return;}renderBoard();pflash(hints(tool));return;}
  let to=null,end={x:e.x,y:e.y};
  if(t.type==="pass"){
    /* Who catches it: a teammate whose cut ends where you let go, or a teammate standing there.
       The ball goes where they'll be; with nobody there, it goes exactly where you let go. */
    const r=receiverAt(frame(),end,t.from);
    if(r){to=r.id;end=destOf(frame(),r.id);}
  }
  const m=t.pts[Math.floor(t.pts.length/2)],mid={x:(s.x+end.x)/2,y:(s.y+end.y)/2};
  const chord=Math.hypot(end.x-s.x,end.y-s.y)||1;
  const dev=Math.abs((end.x-s.x)*(s.y-m.y)-(s.x-m.x)*(end.y-s.y))/chord;
  const c=dev<10||t.type==="pass"?mid:{x:2*m.x-mid.x,y:2*m.y-mid.y};   // passes are always straight
  pushHist();
  editStep(()=>{frame().actions.push({id:uid(),type:t.type,from:t.from,to,x1:s.x,y1:s.y,cx:c.x,cy:c.y,x2:end.x,y2:end.y});});
  markDirty();renderBoard();
  if(t.type==="pass")pflash(to?`Pass to ${(frame().tokens.find(x=>x.id===to)||{}).n||"player"}: the ball moves to where they catch it. To pass again in this step, draw from that catch spot.`:"Pass to a spot: the ball moves to where you let go.");
}
board.addEventListener("pointerup",endPointer);
board.addEventListener("pointercancel",()=>{drag=null;temp=null;renderBoard();});

/* toolbar + steps */
$("#ptools").addEventListener("click",e=>{if(anim)stopAnim();const b=e.target.closest("[data-tool]");if(b)setTool(b.dataset.tool);});
let labelTarget=null;
$("#labelForm").addEventListener("submit",e=>{
  e.preventDefault();if(!labelTarget)return;
  const v=$("#labelInput").value.trim().slice(0,3);pushHist();
  play.frames.forEach(f=>f.tokens.forEach(t=>{if(t.id===labelTarget){if(v)t.label=v;else delete t.label;}}));
  $("#labelBox").hidden=true;labelTarget=null;markDirty();renderBoard();
});
$("#labelCancel").addEventListener("click",()=>{$("#labelBox").hidden=true;labelTarget=null;});
/* Rebuild everything that depends on the team's sport. */
function refreshSportUI(){
  const S=sp();CATS=S.cats;
  $("#pType").innerHTML=S.playTypes.map(t=>`<option>${t}</option>`).join("");
  const forms=Object.keys(S.forms);
  $("#pForm").innerHTML=`<option value="">Start from a set…</option>`+forms.map(f=>`<option>${f}</option>`).join("")+`<option>Empty</option>`;
  $("#pShot").hidden=!S.tools.shot;
  ["cut","pass","dribble","screen"].forEach(k=>{const b=document.querySelector(`#ptools [data-tool="${k}"]`);if(!b)return;
    b.hidden=!S.tools[k];if(S.tools[k])b.lastChild.textContent=S.tools[k];});
  $("#pAutoD").hidden=!S.defend;
  $("#board").setAttribute("aria-label",S.board);
  $("#dCats").innerHTML=CATS.map((c,i)=>`<label><input type="checkbox" id="dc${i}" value="${c}"><span>${c}</span></label>`).join("");
  $("#libCat").innerHTML=`<option value="">All categories</option>`+CATS.map(c=>`<option>${c}</option>`).join("");
  const tb=document.querySelector(`#ptools [data-tool="${tool}"]`);if(tb&&tb.hidden)tool="move";
  setTool(tool);
}
$("#pForm").addEventListener("change",e=>{
  const f=e.target.value;if(!f)return;pushHist();
  if(f==="Empty"){frame().tokens=[];frame().actions=[];e.target.value="";markDirty();renderBoard();return;}
  const fr=frame();fr.tokens=fr.tokens.filter(t=>t.kind==="d").concat(formTokens(f));fr.actions=[];
  e.target.value="";markDirty();renderBoard();
});
$("#pAutoD").addEventListener("click",()=>{
  const fr=frame(),os=fr.tokens.filter(t=>t.kind==="o"&&t.y>0);
  if(!os.length){pflash("Place offensive players first.");return;}
  pushHist();fr.tokens=fr.tokens.filter(t=>t.kind!=="d");
  if(!sp().defend)return;
  os.forEach(o=>{const q=sp().defend(o);fr.tokens.push({id:"d"+o.n,kind:"d",n:o.n,x:q.x,y:q.y});});
  markDirty();renderBoard();
});
$("#pUndo").addEventListener("click",()=>{if(!hist.length){pflash("Nothing to undo.");return;}const h=JSON.parse(hist.pop());play.frames=h.frames;fi=Math.min(h.fi,play.frames.length-1);markDirty();renderSteps();renderBoard();});
let clearStepArmed=false;
$("#pClear").addEventListener("click",e=>{
  if(!frame().actions.length){pflash("No lines to clear on this step.");return;}
  if(!clearStepArmed){clearStepArmed=true;e.currentTarget.textContent="Tap again to clear lines";setTimeout(()=>{clearStepArmed=false;$("#pClear").textContent="Clear lines";},3000);return;}
  clearStepArmed=false;$("#pClear").textContent="Clear lines";pushHist();editStep(()=>{frame().actions=[];});markDirty();renderBoard();
});
$("#pSteps").addEventListener("click",e=>{const b=e.target.closest("[data-step]");if(!b)return;if(anim)stopAnim();fi=+b.dataset.step;renderSteps();renderBoard();});
$("#pShot").addEventListener("click",()=>{
  if(anim)stopAnim();
  const fr=frame(),had=fr.actions.find(a=>a.type==="shot");
  if(had){pushHist();editStep(()=>{fr.actions=fr.actions.filter(a=>a!==had);});markDirty();renderBoard();pflash("Shot removed.");return;}
  const who=finalHolder(fr),h=who&&fr.tokens.find(x=>x.id===who);
  if(!h){pflash(fr.actions.some(a=>a.type==="pass")?"The last pass goes to an empty spot, so nobody has the ball to shoot.":"Give a player the ball first (Ball tool), then tap Shot.");return;}
  pushHist();editStep(()=>{fr.actions.push({id:uid(),type:"shot",from:h.id,to:null,...shotArc(shotStart(fr,h.id))});});
  markDirty();renderBoard();pflash(`${h.label||h.n} shoots${catchers(fr).includes(h.id)?" off the catch":fr.actions.some(a=>a.from===h.id&&isMove(a))?" after their move":""}. Tap Shot again to remove it.`);
});
$("#pAddOpt").addEventListener("click",()=>{
  if(anim)stopAnim();
  const L=playLines(play.frames),o=optionOf(play.frames,L,fi);
  const baseIdx=o?L.main[o.branch]:fi,base=play.frames[baseIdx];
  pushHist();
  const id="opt"+uid(),letter=String.fromCharCode(65+L.options.length);
  const nf={caption:"",tokens:nextTokens(base),actions:[],opt:id,optName:"",from:fidOf(base)};
  play.frames.push(nf);fi=play.frames.length-1;markDirty();renderSteps();renderBoard();
  $("#pOptName").focus();
  pflash(`Option ${letter} starts where step ${L.main.indexOf(baseIdx)+1} ends. Name it, draw it, and use + Next step for more option steps.`);
});
$("#pOptName").addEventListener("input",e=>{const f=frame();if(!f.opt)return;play.frames.forEach(x=>{if(x.opt===f.opt)x.optName=e.target.value.trim();});markDirty();
  const keep=e.target.selectionStart;renderSteps();e.target.focus();try{e.target.setSelectionRange(keep,keep);}catch{}});
let delOptArmed=false;
$("#pOptDel").addEventListener("click",e=>{
  const f=frame();if(!f.opt)return;
  if(!delOptArmed){delOptArmed=true;e.currentTarget.textContent="Tap again to delete the option";setTimeout(()=>{delOptArmed=false;$("#pOptDel").textContent="Delete this option";},3000);return;}
  delOptArmed=false;$("#pOptDel").textContent="Delete this option";
  pushHist();const L=playLines(play.frames),o=optionOf(play.frames,L,fi),back=play.frames[L.main[o.branch]];
  play.frames=play.frames.filter(x=>x.opt!==f.opt);fi=Math.max(0,play.frames.indexOf(back));markDirty();renderSteps();renderBoard();
});
$("#pLines").addEventListener("click",e=>{const b=e.target.closest("[data-line]");if(!b)return;if(anim)stopAnim();startAnim(b.dataset.line||"main");});
$("#pDup").addEventListener("click",()=>{
  pushHist();
  const f=frame(),copy=JSON.parse(JSON.stringify(f));copy.actions.forEach(a=>a.id=uid());delete copy.fid;
  play.frames.splice(fi+1,0,copy);fi++;markDirty();renderSteps();renderBoard();
  pflash(`Step ${fi} copied as step ${fi+1}, with the same players and lines.`);
});
$("#pNext").addEventListener("click",()=>{
  pushHist();
  const cf=frame(),nf={caption:"",tokens:nextTokens(cf),actions:[]};
  if(cf.opt)Object.assign(nf,{opt:cf.opt,optName:cf.optName||"",from:cf.from});
  play.frames.splice(fi+1,0,nf);fi++;markDirty();renderSteps();renderBoard();
  pflash(cf.opt?"New option step: players moved to where their lines ended.":"New step: players moved to where their lines ended.");
});


/* ---------- play-through animation ---------- */
let anim=null;
/* k = position in the line being played; anim.seq maps it to the real step */
function animCaption(k){
  const i=anim.seq[k],f=play.frames[i],L=playLines(play.frames),n=stepName(play.frames,L,i);
  $("#pAnimCap").innerHTML=`<b>${n.opt?esc(n.opt.title)+" · ":""}${n.opt?`Step ${n.opt.steps.indexOf(i)+1} of ${n.opt.steps.length}`:n.long}</b>${f.caption?esc(f.caption):""}`;
  document.querySelectorAll("#pSteps [data-step]").forEach(b=>b.setAttribute("aria-pressed",+b.dataset.step===i));
  renderOptBanner(i);
}
/* line: undefined = the line of the step you're on; "main" = main play; or an option id */
function startAnim(line){
  if(!play.frames.length)return;
  if(line===undefined&&anim&&anim.paused&&!anim.done){anim.paused=false;anim.last=performance.now();$("#pPlay").innerHTML="&#10074;&#10074; Pause";requestAnimationFrame(tick);return;}
  if(line===undefined&&anim&&!anim.paused){anim.paused=true;$("#pPlay").innerHTML="&#9654; Resume";return;}
  const L=playLines(play.frames);
  const opt=line===undefined?optionOf(play.frames,L,fi):line==="main"?null:L.options.find(o=>o.id===line)||null;
  const seq=lineIdx(L,opt),frames=seq.map(i=>play.frames[i]);
  let start;
  if(line===undefined){const k=seq.indexOf(fi);start=k>=0&&k<seq.length-1?k:0;}
  else start=opt?Math.max(0,opt.branch):0;    // an option plays from the step it branches off
  anim={i:start,seq,frames,opt,phase:"hold",t:0,tr:buildTransition(frames,start),last:performance.now(),paused:false};
  $("#pPlay").innerHTML="&#10074;&#10074; Pause";$("#pStop").hidden=false;$("#boardFrame").classList.add("playing");
  document.querySelectorAll("#pLines [data-line]").forEach(b=>b.setAttribute("aria-pressed",(b.dataset.line||null)===(opt?opt.id:null)));
  board.style.cursor="default";animCaption(start);requestAnimationFrame(tick);
}
function stopAnim(){
  if(!anim)return;anim=null;
  $("#pPlay").innerHTML="&#9654; Play through";$("#pStop").hidden=true;$("#boardFrame").classList.remove("playing");
  document.querySelectorAll("#pLines [data-line]").forEach(b=>b.removeAttribute("aria-pressed"));
  board.style.cursor="";$("#pAnimCap").textContent="";renderSteps();renderBoard();
}
function tick(now){
  if(!anim||anim.paused)return;
  const spd=+$("#pSpeed").value||1;
  anim.t+=(now-anim.last)*spd;anim.last=now;
  const tr=anim.tr;
  const dur=anim.phase==="move"?(tr.moves?(tr.moveDur||DUR.move):0):anim.phase==="pass"?(tr.passCurve?DUR.pass:0):anim.phase==="end"?DUR.end:DUR.hold;
  if(anim.t>=dur){
    anim.t=0;
    if(anim.phase==="hold")anim.phase="move";
    else if(anim.phase==="move")anim.phase="pass";
    else if(anim.phase==="pass"){
      if(tr.last){anim.phase="end";}
      else{anim.i++;anim.tr=buildTransition(anim.frames,anim.i);anim.phase="hold";animCaption(anim.i);}
    }
    else if(anim.phase==="end"){
      $("#board").innerHTML=boardInner({tokens:animTokens(tr,"pass",1),actions:[]},"screen");
      anim.paused=true;$("#pPlay").innerHTML="&#8635; Replay";$("#pAnimCap").innerHTML+=` <span style="color:var(--muted)">· End of play</span>`;
      anim.done=true;return;
    }
    requestAnimationFrame(tick);return;
  }
  const u=dur?anim.t/dur:1;
  const ph=anim.phase==="end"?"pass":anim.phase;
  $("#board").innerHTML=boardInner({tokens:animTokens(tr,ph,anim.phase==="end"?1:u),actions:anim.phase==="end"?[]:tr.f.actions},"screen",null,anim.phase!=="hold");
  requestAnimationFrame(tick);
}
$("#pPlay").addEventListener("click",()=>{
  if(anim&&anim.done){const o=anim.opt;anim=null;startAnim(o?o.id:"main");return;}
  startAnim();
});
$("#pStop").addEventListener("click",stopAnim);
document.querySelector(".board-card").addEventListener("click",e=>{const b=e.target.closest("button");if(anim&&b&&!["pPlay","pStop"].includes(b.id)&&!b.closest("#pLines"))stopAnim();},true);
document.querySelector(".board-card").addEventListener("change",e=>{if(anim&&e.target.id==="pForm")stopAnim();},true);

let delStepArmed=false;
$("#pDelStep").addEventListener("click",e=>{
  if(play.frames.length<2)return;
  if(!delStepArmed){delStepArmed=true;e.currentTarget.textContent="Tap again to delete";setTimeout(()=>{delStepArmed=false;$("#pDelStep").textContent="Delete step";},3000);return;}
  delStepArmed=false;$("#pDelStep").textContent="Delete step";
  pushHist();
  const gone=play.frames[fi];
  if(!gone.opt&&gone.fid){   // options that branched off this step now branch off the step before it (or after it)
    const L=playLines(play.frames),k=L.main.indexOf(fi),alt=play.frames[L.main[k-1]!==undefined?L.main[k-1]:L.main[k+1]];
    if(alt)play.frames.forEach(f=>{if(f.opt&&f.from===gone.fid)f.from=fidOf(alt);});
  }
  play.frames.splice(fi,1);fi=Math.max(0,Math.min(fi-1,play.frames.length-1));markDirty();renderSteps();renderBoard();
});
$("#pCaption").addEventListener("input",e=>{frame().caption=e.target.value;markDirty();});
$("#pName").addEventListener("input",e=>{play.name=e.target.value;markDirty();});
$("#pType").addEventListener("change",e=>{play.type=e.target.value;markDirty();});
$("#pNotes").addEventListener("input",e=>{play.notes=e.target.value;markDirty();});

/* save / new / library */
$("#pSave").addEventListener("click",async()=>{
  if(!play.name.trim()){pflash("Give the play a name before saving.");$("#pName").focus();return;}
  const id=play.id||uid()+uid();
  const body={name:play.name.trim(),type:play.type,notes:play.notes||"",frames:play.frames,updatedAt:Date.now(),editedBy:ME.name};
  play.id=id;pdirty=false;
  const ex=plays.find(p=>p.id===id);if(ex)Object.assign(ex,body);else plays.push({id,...body});
  renderPlayLib();renderPickCats();renderPick();renderEditor();
  if(!db||!canWrite){$("#pStatus").textContent=db?"View only":"Not saved in this view";return;}
  $("#pStatus").textContent="Saving…";
  try{await db.collection("plays").doc(id).set(body);$("#pStatus").textContent="Saved to play library";}
  catch(err){handleWriteErr(err);$("#pStatus").textContent="Not saved";pdirty=true;}
});
let newArmed=false;
$("#pNew").addEventListener("click",e=>{
  if(pdirty&&!newArmed){newArmed=true;e.currentTarget.textContent="Discard changes?";setTimeout(()=>{newArmed=false;$("#pNew").textContent="New play";},3000);return;}
  newArmed=false;$("#pNew").textContent="New play";
  play=blankPlay();fi=0;hist=[];pdirty=false;renderEditor();renderPlayLib();$("#pName").focus();
});
function playSummary(frames){const L=playLines(frames),n=L.main.length,k=L.options.length;return `${n} step${n>1?"s":""}${k?` · <b class="optcount">${k} option${k>1?"s":""}</b>`:""}`;}
function renderPlayLib(){
  $("#playCount").textContent=plays.length?`(${plays.length})`:"";
  const q=$("#plSearch").value.trim().toLowerCase();
  const list=[...plays].sort((a,b)=>a.name.localeCompare(b.name)).filter(p=>!q||(p.name+" "+p.type+" "+(p.notes||"")).toLowerCase().includes(q));
  $("#plList").innerHTML=list.length?list.map(p=>`<article class="pcard${play&&play.id===p.id?" open":""}" data-card="${p.id}">
      <div class="pthumb">${boardSVG(p.frames[0],"screen")}</div>
      <div style="min-width:0"><b>${esc(p.name)}</b><span>${esc(p.type)} · ${playSummary(p.frames)}</span>
      <div class="actions"><button class="btn" data-open="${p.id}">${READONLY?"View":"View / edit"}</button><button class="btn edit-only" data-copy="plays" data-id="${p.id}">Copy</button><button class="btn danger edit-only" data-pdel="${p.id}">Delete</button></div></div></article>`).join("")
    :`<div class="empty">${plays.length?"No plays match.":"No plays saved yet. Draw a play on the board, name it, and tap Save play."}</div>`;
}
$("#plSearch").addEventListener("input",renderPlayLib);
$("#pNewTop").addEventListener("click",()=>{$("#pNew").click();document.querySelector("#view-plays .board-card").scrollIntoView({behavior:"smooth",block:"start"});});
$("#pToLib").addEventListener("click",()=>document.querySelector("#view-plays .playlib").scrollIntoView({behavior:"smooth",block:"start"}));
$("#plList").addEventListener("click",async e=>{
  let o=e.target.closest("[data-open]");const d=e.target.closest("[data-pdel]");
  /* Tapping anywhere on a play card (picture or name) opens it, same as the button. */
  if(!o&&!d&&!e.target.closest("button")){const card=e.target.closest("[data-card]");if(card)o=card.querySelector("[data-open]");}
  if(o){
    if(pdirty&&o.dataset.armed!=="1"){o.dataset.armed="1";o.textContent="Discard changes?";setTimeout(()=>{o.dataset.armed="";o.textContent=READONLY?"View":"View / edit";},3000);return;}
    const p=plays.find(x=>x.id===o.dataset.open);play=clone(p);fi=0;hist=[];pdirty=false;renderEditor();renderPlayLib();
    document.querySelector("#view-plays .board-card").scrollIntoView({behavior:"smooth",block:"start"});
  }
  if(d){
    if(d.dataset.armed!=="1"){d.dataset.armed="1";d.textContent="Tap to confirm";setTimeout(()=>{d.dataset.armed="";d.textContent="Delete";},3000);return;}
    const id=d.dataset.pdel;plays=plays.filter(x=>x.id!==id);
    if(play&&play.id===id){play.id=null;pdirty=true;renderEditor();}
    renderPlayLib();renderPickCats();renderPick();
    if(db&&canWrite){try{await db.collection("plays").doc(id).delete();}catch(err){handleWriteErr(err);}}
  }
});

/* printing */
function svgToPng(svg,w){return new Promise((res,rej)=>{const img=new Image();img.onload=()=>{const c=document.createElement("canvas");c.width=w;c.height=Math.round(w*VB.h/VB.w);const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);res(c.toDataURL("image/png"));};img.onerror=()=>rej(new Error("diagram"));img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);});}
async function addPlayPages(doc,p,fresh){
  const W=612,H=792,M=40,R=W-M,IW=300,IH=IW*VB.h/VB.w;
  if(!fresh)doc.addPage();
  let y=M;
  const lx=M+await pdfLogo(doc,M,M-12,44);
  doc.setTextColor(0);doc.setFont("helvetica","bold");doc.setFontSize(9);
  doc.text(pdfHeader("Play"),lx,y);y+=24;
  doc.setFontSize(20);doc.text(p.name.toUpperCase(),lx,y);
  doc.setFont("helvetica","normal");doc.setFontSize(11);doc.text(p.type,R,y,{align:"right"});
  y+=10;doc.setLineWidth(2);doc.line(M,y,R,y);y+=16;
  if(p.notes){doc.setFontSize(10);const n=doc.splitTextToSize(p.notes,R-M);doc.text(n,M,y);y+=n.length*12+4;}
  doc.setFontSize(8.5);doc.setFont("helvetica","italic");
  const L=sp().tools;doc.text([`Solid arrow = ${L.cut.toLowerCase()}`,`Dashed arrow = ${L.pass.toLowerCase()}`,L.dribble&&`Zigzag = ${L.dribble.toLowerCase()}`,L.screen&&`Line with bar = ${L.screen.toLowerCase()}`,L.shot&&`Dotted arc = ${L.shot.toLowerCase()}`].filter(Boolean).join("     "),M,y);y+=14;
  /* Main steps first, then each option under its own heading, boxed with a heavier border. */
  const PL=playLines(p.frames);let lastOpt=null;
  for(const i of displayOrder(PL)){
    const f=p.frames[i],n=stepName(p.frames,PL,i),o=n.opt;
    if(o&&o!==lastOpt){
      if(y+IH+40>H-M){doc.addPage();y=M;}
      y+=6;doc.setFillColor(0);doc.rect(M,y,R-M,22,"F");doc.setTextColor(255);doc.setFont("helvetica","bold");doc.setFontSize(12);
      doc.text(o.title.toUpperCase(),M+8,y+15);doc.setFont("helvetica","normal");doc.setFontSize(9.5);doc.text(`Branches off after step ${o.branch+1}`,R-8,y+15,{align:"right"});
      doc.setTextColor(0);y+=32;lastOpt=o;
    }
    if(y+IH>H-M){doc.addPage();y=M;}
    const img=await svgToPng(boardSVG(f,"print",900),900);
    doc.addImage(img,"PNG",M,y,IW,IH);doc.setLineWidth(o?2.5:.75);doc.rect(M,y,IW,IH);
    doc.setFont("helvetica","bold");doc.setFontSize(13);doc.text(o?`OPTION ${o.letter} · STEP ${o.steps.indexOf(i)+1}`:n.short.toUpperCase(),M+IW+16,y+16);
    doc.setFont("helvetica","normal");doc.setFontSize(10);
    if(f.caption){const c=doc.splitTextToSize(f.caption,R-(M+IW+16));doc.text(c,M+IW+16,y+34);}
    y+=IH+18;
  }
}
async function savePdf(btn,label,make,name){
  if(!window.jspdf){btn.textContent="PDF tool didn't load";setTimeout(()=>btn.textContent=label,2500);return;}
  btn.textContent="Building PDF…";
  try{const doc=await make();saveFile(name,doc.output("blob"));btn.textContent="PDF downloaded";}
  catch(err){btn.textContent="Couldn't build PDF";}
  setTimeout(()=>btn.textContent=label,2500);
}
$("#pPdf").addEventListener("click",e=>{
  if(!play.name.trim()){pflash("Name the play before printing.");$("#pName").focus();return;}
  savePdf(e.currentTarget,"Printable PDF",async()=>{const doc=new window.jspdf.jsPDF({unit:"pt",format:"letter"});await addPlayPages(doc,play,true);return doc;},`Play - ${play.name.trim()}.pdf`);
});

play=blankPlay();setTool("move");renderEditor();renderPlayLib();

async function saveFile(name,data){
  const blob=data instanceof Blob?data:new Blob([data],{type:"application/json"});
  // Inside a Claude preview, downloads go through Claude's save prompt.
  const dl=window.claude&&window.claude.use?await window.claude.use("downloads").catch(()=>null):null;
  if(dl){try{await dl.save({filename:name,data:blob});return;}catch(e){if(e&&e.code==="declined")return;}}
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);
}

/* ---------- tabs ---------- */
document.querySelectorAll(".tabs button").forEach(b=>b.addEventListener("click",()=>setTab(b.dataset.tab)));
function setTab(t){
  document.querySelectorAll(".tabs button").forEach(b=>b.setAttribute("aria-selected",b.dataset.tab===t));
  document.querySelectorAll("section.view").forEach(v=>v.hidden=v.id!=="view-"+t);
  if(window.onViewChange)window.onViewChange();
  if(t==="settings"&&window.onSettingsTab)window.onSettingsTab();
  if(t==="cal"&&window.onCalChange)window.onCalChange();
  try{localStorage.setItem("tab",t)}catch{}
}
try{const t=localStorage.getItem("tab");if(t)setTab(t)}catch{}

/* ---------- start / stop (called by boot.js once a team is chosen) ---------- */
let unsubs=[];
function stopPlanner(){unsubs.forEach(u=>{try{u()}catch{}});unsubs=[];db=null;drills=[];plans={};plays=[];cur=null;}
function startPlanner(store,settings){
  stopPlanner();
  db=store;canWrite=true;
  applySettings(settings);
  buildDateSelect(); loadPlan($("#planDate").value); renderAllDrills();
  play=blankPlay();fi=0;hist=[];pdirty=false;renderEditor();renderPlayLib();
  let firstPlans=true;
  const err=()=>showNotice("Couldn't load your team's data. Check your connection and reload.");
  unsubs.push(db.collection("drills").onSnapshot(s=>{
    drills=s.docs.map(d=>({id:d.id,...d.data()}));sortDrills();renderAllDrills();
  },err));
  unsubs.push(db.collection("plays").onSnapshot(s=>{
    plays=s.docs.map(d=>({id:d.id,...d.data()}));renderPlayLib();renderPickCats();renderPick();
  },err));
  unsubs.push(db.collection("plans").onSnapshot(s=>{
    plans={};s.docs.forEach(d=>{plans[d.id]=d.data();});
    buildDateSelect();
    const inc=plans[cur.date];
    if(firstPlans||(!saveTimer&&inc&&!s.metadata.hasPendingWrites&&JSON.stringify(inc)!==JSON.stringify(cur))){firstPlans=false;loadPlan($("#planDate").value);}
    else renderCopyFrom();
    renderLib();
  },err));
}

/* Copy to another team (handled by boot.js) */
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-copy]");if(!b||!window.openCopy)return;
  e.preventDefault();e.stopPropagation();window.openCopy(b.dataset.copy,b.dataset.id);
},true);
