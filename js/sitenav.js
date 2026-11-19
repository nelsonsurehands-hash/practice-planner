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
