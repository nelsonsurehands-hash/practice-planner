/* Homepage visitors (Settings → Usage → "Homepage visitors"): anonymous counts of how far people get on the
   homepage before signing up: landed, scrolled, saw the features, reached the bottom, tapped Create,
   started the form, submitted it. No names, emails or cookies: each step is counted once per visit, by the
   link they came from (the ad, page posts, Google…). Saved by log_landing() in supabase/landing-funnel.sql. */
(function(){
const ok=()=>typeof HOSTED!=="undefined"&&HOSTED&&typeof sb!=="undefined"&&sb&&!window.HOME_PREVIEW&&!(typeof user!=="undefined"&&user);
const src=()=>{let r="";try{r=localStorage.getItem("cpp:ref")||"";}catch{}return /^[a-z0-9]{1,20}$/.test(r)?r:"direct";};
const queue=[];let timer=null,off=false;
function hit(step){
  if(off||!ok())return;
  try{if(localStorage.getItem("cpp:owner"))return;}catch{}
  try{const k="cpp:lp:"+step;if(sessionStorage.getItem(k))return;sessionStorage.setItem(k,"1");}catch{}
  queue.push(step);clearTimeout(timer);timer=setTimeout(flush,1500);
  /* the site-wide page report: homepage steps on "home"; the sign-up form credited to the first page they landed on */
  if(self.siteTrack)siteTrack(step,step==="form"||step==="signup"?siteTrack.entry():"home");
}
function flush(){
  clearTimeout(timer);if(!queue.length||off||typeof sb==="undefined"||!sb)return;
  const steps=queue.splice(0);
  sb.rpc("log_landing",{p_src:src(),p_steps:steps}).then(r=>{if(r&&r.error&&/function|schema cache|does not exist/i.test(r.error.message))off=true;},()=>{});
}
window.addEventListener("pagehide",flush);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")flush();});
const shown=()=>{const l=document.getElementById("screen-landing");return !!(l&&!l.hidden);};

/* landed, then how far down they get */
let tries=0;const iv=setInterval(()=>{if(shown()){hit("land");clearInterval(iv);}else if(++tries>60)clearInterval(iv);},500);
window.addEventListener("scroll",()=>{if(shown()&&scrollY>innerHeight*.5)hit("scroll");},{passive:true});
if("IntersectionObserver" in window){
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting&&shown())hit(e.target.dataset.lpStep);}),{threshold:.35});
  const watch=(sel,step)=>{const el=document.querySelector(sel);if(el){el.dataset.lpStep=step;io.observe(el);}};
  watch("#lp-features","features");watch("#screen-landing .lp-foot","bottom");
}
/* tapped Create / Sign in, started the sign-up form, submitted it */
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-lp]");if(b&&shown())hit(b.dataset.lp==="up"?"cta":"signin");
  const o=e.target.closest("[data-provider]");if(o&&typeof authMode!=="undefined"&&authMode==="up")hit("signup");
},true);
document.addEventListener("input",e=>{if(e.target.closest("#authForm")&&typeof authMode!=="undefined"&&authMode==="up")hit("form");},true);
document.addEventListener("submit",e=>{if(e.target.id==="authForm"&&typeof authMode!=="undefined"&&authMode==="up"){hit("signup");flush();}},true);
})();
