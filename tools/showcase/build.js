/* Builds the public plays & drills pages (theextracoach.com/basketball/...) from tools/showcase/data.js.
   Uses the app's own play designer code (js/sports.js + js/board.js) to make the diagrams,
   so every page shows exactly what the app draws.  Run:  node tools/showcase/build.js */
const fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.join(__dirname,"..",".."),SITE="https://theextracoach.com";
const ITEMS=require("./data.js");

/* ---- load the app's drawing code ---- */
const ctx={console,Math,JSON,document:{querySelector:()=>null},performance:{now:()=>0}};vm.createContext(ctx);
const code=["js/sports.js","js/board.js"].map(f=>fs.readFileSync(path.join(ROOT,f),"utf8")).join("\n")+
  "\n;var SPORT='basketball';this.__={boardSVG,nextTokens,withDefense,boardInner};";
vm.runInContext(code,ctx);
const B=ctx.__;

/* ---- turn the short step lists into the app's frames ---- */
const HOOP={x:250,y:58};
function tokensFrom(start){
  const toks=[];
  Object.entries(start).forEach(([id,v])=>{if(id==="ball")return;const kind=id[0]==="d"?"d":"o";toks.push({id,kind,n:+id.slice(1),x:v[0],y:v[1]});});
  const h=toks.find(t=>t.id===start.ball);toks.push({id:"ball",kind:"ball",x:h.x+13,y:h.y-13});
  return toks;
}
const r1=v=>Math.round(v*10)/10;
function curve(x1,y1,x2,y2,bend){const mx=(x1+x2)/2,my=(y1+y2)/2,dx=x2-x1,dy=y2-y1;return {cx:r1(mx-dy*(bend||0)),cy:r1(my+dx*(bend||0))};}
function framesOf(item){
  let toks=tokensFrom(item.start);const frames=[];
  item.steps.forEach((st,i)=>{
    toks=JSON.parse(JSON.stringify(toks));
    if(st.ball){const h=toks.find(t=>t.id===st.ball),b=toks.find(t=>t.kind==="ball");b.x=h.x+13;b.y=h.y-13;}
    const pos=Object.fromEntries(toks.map(t=>[t.id,{x:t.x,y:t.y}]));const actions=[];
    st.acts.forEach(a=>{
      const [type,id]=a;
      if(type==="pass"){const p=pos[id],q=pos[a[2]];actions.push({type,from:id,to:a[2],x1:p.x,y1:p.y,x2:q.x,y2:q.y,...curve(p.x,p.y,q.x,q.y,0)});return;}
      if(type==="shot"){const p=pos[id];actions.push({type,from:id,to:null,x1:p.x,y1:p.y,x2:HOOP.x,y2:HOOP.y,...curve(p.x,p.y,HOOP.x,HOOP.y,.18)});return;}
      const p=pos[id],x=a[2],y=a[3];actions.push({type,from:id,to:null,x1:p.x,y1:p.y,x2:x,y2:y,...curve(p.x,p.y,x,y,a[4])});pos[id]={x,y};
    });
    const f={fid:"f"+i,caption:st.cap,tokens:toks,actions};
    if(i===0&&item.defense)f.defense={type:item.defense};
    frames.push(f);toks=B.nextTokens(f);
  });
  return frames;
}

/* ---- page parts ---- */
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const urlOf=it=>`/basketball/${it.kind==="play"?"plays":"drills"}/${it.slug}/`;
const svgOf=(f,cls)=>B.boardSVG(f,"screen").replace("<svg ",`<svg class="${cls||""}" role="img" aria-label="${esc(f.caption)}" `);
const LEGEND=`<p class="sc-key"><span><i class="k-cut"></i>Cut</span><span><i class="k-pass"></i>Pass</span><span><i class="k-drib"></i>Dribble</span><span><i class="k-scr"></i>Screen</span><span><i class="k-shot"></i>Shot</span></p>`;
const head=({title,desc,canon,img,ld})=>`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${canon}">
<meta property="og:site_name" content="The Extra Coach">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${canon}">
<meta property="og:image" content="${SITE}${img||"/icons/icon-512.png"}">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#0a1230">
<link rel="icon" href="/brand/mark.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@500;700;800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap">
<link rel="stylesheet" href="/css/app.css">
<link rel="stylesheet" href="/css/showcase.css">
${(ld||[]).map(o=>`<script type="application/ld+json">${JSON.stringify(o).replace(/</g,"\\u003c")}</script>`).join("\n")}
</head>
<body class="sc">
<header class="sc-top"><div class="sc-wrap">
  <a class="lp-logo" href="/" aria-label="The Extra Coach home"><img src="/brand/mark.svg" alt="" width="36" height="36"><span>The Extra <b>Coach</b></span></a>
  <nav class="sc-nav" aria-label="Plays and drills"><a href="/basketball/#plays">Plays</a><a href="/basketball/#drills">Drills</a><a class="sc-cta-sm" href="/?from=showcase">Try it free</a></nav>
</div></header>`;
const foot=`<footer class="sc-foot"><div class="sc-wrap">
  <span class="lp-logo small"><img src="/brand/mark.svg" alt="" width="24" height="24"><span>The Extra <b>Coach</b></span></span>
  <span>Practice plans, animated plays, the season calendar and parent sign-ups in one app for your whole staff.</span>
  <a href="/basketball/">All plays &amp; drills</a>
</div></footer>`;
const cta=it=>`<aside class="sc-cta">
  <div><p class="sc-eyebrow">Made in The Extra Coach</p>
  <h2>${it.kind==="play"?"Draw your own plays like this":"Put this drill in your next practice"}</h2>
  <p>${it.kind==="play"?"Drag players onto the court, draw cuts, passes and screens, and watch the play run step by step. Share it with your players in one link.":"Build a timed practice plan in minutes: add drills, set the minutes and print it or send it to your staff. Free for coaches."}</p></div>
  <a class="sc-btn" href="/?from=${it.kind}">Create your team free</a>
</aside>`;

function itemPage(it,all){
  const frames=framesOf(it),url=urlOf(it),kindName=it.kind==="play"?"Play":"Drill";
  const title=it.kind==="play"?`${it.name}: Basketball Play Diagram (Animated) | The Extra Coach`:`${it.name}: Basketball Drill with Animated Diagram | The Extra Coach`;
  const facts=[["Type",it.type],["Level",it.level],it.minutes&&["Time",it.minutes+" min"],it.players&&["Players",it.players]].filter(Boolean);
  const listName=it.kind==="play"?"How to run it":"How the drill works";
  const extraTitle=it.kind==="play"?"Reads":"Variations",extra=it.kind==="play"?it.reads:it.variations;
  const related=all.filter(x=>x.kind===it.kind&&x.slug!==it.slug).slice(0,4);
  const ld=[{"@context":"https://schema.org","@type":"HowTo",name:`How to run the ${it.name}`,description:it.summary,
      totalTime:it.minutes?`PT${String(it.minutes).split(/[–-]/).pop()}M`:undefined,
      step:frames.map((f,i)=>({"@type":"HowToStep",position:i+1,name:`Step ${i+1}`,text:f.caption,url:`${SITE}${url}#step-${i+1}`}))},
    {"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[
      {"@type":"ListItem",position:1,name:"Basketball plays & drills",item:`${SITE}/basketball/`},
      {"@type":"ListItem",position:2,name:it.kind==="play"?"Plays":"Drills",item:`${SITE}/basketball/#${it.kind}s`},
      {"@type":"ListItem",position:3,name:it.name,item:`${SITE}${url}`}]}];
  return head({title,desc:it.summary,canon:url,ld})+`
<main class="sc-wrap sc-main">
  <nav class="sc-crumbs" aria-label="Breadcrumb"><a href="/basketball/">Basketball</a><span>›</span><a href="/basketball/#${it.kind}s">${it.kind==="play"?"Plays":"Drills"}</a><span>›</span><b>${esc(it.name)}</b></nav>
  <header class="sc-hero">
    <p class="sc-eyebrow">${esc(it.type)} · ${kindName}</p>
    <h1>${esc(it.name)}</h1>
    <p class="sc-lede">${esc(it.intro)}</p>
    <dl class="sc-facts">${facts.map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
  </header>
  <section class="sc-player" aria-label="Animated diagram">
    <div class="sc-board" id="scBoard">${svgOf(frames[0],"sc-svg")}</div>
    <div class="sc-ctrl">
      <button class="sc-btn" type="button" id="scRun">▶ Watch it run</button>
      <div class="sc-stepbtns" id="scSteps">${frames.map((f,i)=>`<button type="button" data-step="${i}" aria-pressed="${i===0}" aria-label="Step ${i+1}">${i+1}</button>`).join("")}</div>
    </div>
    <p class="sc-cap" id="scCap" aria-live="polite"><b>Step 1</b>${esc(frames[0].caption)}</p>
    ${LEGEND}${it.defense?`<p class="sc-note">X's show ${it.defense==="man"?"man-to-man":"zone"} defense moving the way the app draws it.</p>`:""}
  </section>
  <div class="sc-cols">
    <section class="sc-sec"><h2>${listName}</h2><ol class="sc-steps">${frames.map((f,i)=>`<li id="step-${i+1}"><button type="button" class="sc-steplink" data-step="${i}">Step ${i+1}</button> ${esc(f.caption)}</li>`).join("")}</ol></section>
    <section class="sc-sec"><h2>Coaching points</h2><ul class="sc-list">${it.points.map(p=>`<li>${esc(p)}</li>`).join("")}</ul>
      ${extra&&extra.length?`<h2>${extraTitle}</h2><ul class="sc-list">${extra.map(p=>`<li>${esc(p)}</li>`).join("")}</ul>`:""}</section>
  </div>
  ${cta(it)}
  ${related.length?`<section class="sc-sec"><h2>More ${it.kind==="play"?"plays":"drills"}</h2><div class="sc-grid">${related.map(card).join("")}</div></section>`:""}
</main>
${foot}
<script type="application/json" id="scData">${JSON.stringify({frames}).replace(/</g,"\\u003c")}</script>
<script src="/js/sports.js"></script>
<script src="/js/board.js"></script>
<script src="/js/showcase.js"></script>
</body>
</html>
`;
}
function card(it){const f=framesOf(it)[0];
  return `<a class="sc-card" href="${urlOf(it)}">${svgOf(f,"sc-thumb")}<span><b>${esc(it.name)}</b><small>${esc(it.type)}${it.minutes?" · "+esc(it.minutes)+" min":""}</small></span></a>`;}

function hubPage(all){
  const plays=all.filter(x=>x.kind==="play"),drills=all.filter(x=>x.kind==="drill");
  const desc="Free animated basketball plays and drills: common sets like Horns, 5-out motion and box BLOB, plus drills like the 3-man weave, Mikan and shell, with step-by-step diagrams.";
  const ld=[{"@context":"https://schema.org","@type":"CollectionPage",name:"Basketball plays & drills, animated",description:desc,url:`${SITE}/basketball/`,
    hasPart:all.map(it=>({"@type":"CreativeWork",name:it.name,url:SITE+urlOf(it)}))}];
  return head({title:"Basketball Plays & Drills with Animated Diagrams | The Extra Coach",desc,canon:"/basketball/",ld})+`
<main class="sc-wrap sc-main">
  <header class="sc-hero sc-hero-hub">
    <p class="sc-eyebrow">Free for coaches</p>
    <h1>Basketball plays &amp; drills, animated</h1>
    <p class="sc-lede">Common sets and practice drills you can watch run, step by step. Every diagram is drawn in The Extra Coach, the app coaches use to plan practices, draw plays and share them with their team.</p>
  </header>
  <section class="sc-sec" id="plays"><h2>Plays and sets</h2><div class="sc-grid">${plays.map(card).join("")}</div></section>
  <section class="sc-sec" id="drills"><h2>Drills</h2><div class="sc-grid">${drills.map(card).join("")}</div></section>
  ${cta({kind:"play"})}
</main>
${foot}
</body>
</html>
`;
}

/* ---- write it all ---- */
const out=(rel,html)=>{const p=path.join(ROOT,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,html);};
ITEMS.forEach(it=>out(urlOf(it).slice(1)+"index.html",itemPage(it,ITEMS)));
out("basketball/index.html",hubPage(ITEMS));
const today=new Date().toISOString().slice(0,10);
out("sitemap.xml",`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${["/","/basketball/",...ITEMS.map(urlOf)].map(u=>`  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}
</urlset>
`);
out("robots.txt",`User-agent: *
Allow: /
Disallow: /c/
Disallow: /f/
Disallow: /p/
Sitemap: ${SITE}/sitemap.xml
`);
console.log(`Built ${ITEMS.length} pages + hub, sitemap.xml, robots.txt`);
