/* Site menu on the public pages (plays, drills, templates, privacy…): same header as the homepage,
   with the menu button opening a panel on phones. */
(function(){
const nav=()=>document.getElementById("lpNav"),btn=()=>document.getElementById("lpMenu");
const close=()=>{const n=nav(),b=btn();if(n)n.classList.remove("open");if(b)b.setAttribute("aria-expanded","false");};
document.addEventListener("click",e=>{
  const n=nav();if(!n)return;
  if(e.target.closest("#lpMenu")){const open=!n.classList.contains("open");n.classList.toggle("open",open);btn().setAttribute("aria-expanded",open);return;}
  if(n.classList.contains("open")&&(e.target.closest("#lpNav a")||!e.target.closest(".lp-top")))close();
});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&nav()&&nav().classList.contains("open")){close();btn().focus();}});
})();
/* Remember where a visitor came from (a tagged ?ref= link, or Facebook/Instagram/Google), the same way the
   app does, so a coach who reads a play page first and signs up later still counts toward that link. */
(function(){try{
  const q=new URLSearchParams(location.search);let ref=(q.get("ref")||"").trim().toLowerCase();
  if(!/^[a-z0-9]{2,20}$/.test(ref))ref="";
  if(!ref){let h="";try{h=document.referrer?new URL(document.referrer).hostname:"";}catch{}
    if(h===location.hostname)h="";
    ref=q.has("fbclid")?(/instagram/i.test(navigator.userAgent)?"instagram":"facebook"):q.has("igshid")||q.has("igsh")?"instagram":q.has("gclid")?"google":
      /(^|\.)google\./.test(h)?"google":/(^|\.)bing\.com$/.test(h)?"bing":/duckduckgo\.com$/.test(h)?"duckduckgo":/(^|\.)yahoo\./.test(h)?"yahoo":
      /(^|\.)(facebook\.com|fb\.com|fb\.me)$/.test(h)?"facebook":/(^|\.)instagram\.com$/.test(h)?"instagram":/(^|\.)(t\.co|twitter\.com|x\.com)$/.test(h)?"twitter":"";}
  if(ref&&!localStorage.getItem("cpp:ref"))localStorage.setItem("cpp:ref",ref);
  if(q.has("ref")){q.delete("ref");history.replaceState(null,"",location.pathname+(q.toString()?"?"+q:"")+location.hash);}
}catch{}})();
