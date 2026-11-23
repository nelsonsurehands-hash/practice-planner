/* Website page tracking (Settings → Usage → "Pages on the website"). Anonymous counts only: no names, emails,
   cookies or IP addresses. Each step is counted once per visit, by page and by the link the visitor came from
   (?ref= tag, Facebook, Google…). Saved by log_page() in supabase/site-pages.sql.
   - Public pages load this through js/sitenav.js; it counts landed, scrolled, reached the bottom, tried the
     demo, tapped sign up / sign in, and went on to another page. The demos add their own steps with
     siteTrack("build"), siteTrack("run"), siteTrack("save")…
   - The app counts its homepage the same way (js/landing.js), and credits "started the form", "signed up"
     and "made a team" to the first page this device ever landed on (cpp:entry). */
(function(){
if(self.siteTrack)return;
const ls=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v);}catch(e){return null;}};
const owner=()=>!!ls("cpp:owner");
const src=()=>{const r=ls("cpp:ref")||"";return /^[a-z0-9]{1,20}$/.test(r)?r:"direct";};
const pageId=p=>{p=String(p==null?location.pathname:p).toLowerCase().replace(/index\.html$/,"").replace(/^\/+|\/+$/g,"");return p||"home";};
const isApp=()=>!!document.getElementById("app");
const PAGE=isApp()?"home":pageId();
if(!ls("cpp:entry"))ls("cpp:entry",PAGE);
const entry=()=>ls("cpp:entry")||PAGE;

const queue={};let timer=null,off=false;
function send(page,steps,keep){
  const c=self.APP_CONFIG||{};if(!c.supabaseUrl||!c.supabaseAnonKey)return;
  fetch(c.supabaseUrl.replace(/\/$/,"")+"/rest/v1/rpc/log_page",{method:"POST",keepalive:!!keep,
    headers:{"Content-Type":"application/json",apikey:c.supabaseAnonKey,Authorization:"Bearer "+c.supabaseAnonKey},
    body:JSON.stringify({p_page:page,p_src:src(),p_steps:steps})}).then(r=>{if(r.status===404)off=true;},()=>{});
}
function flush(keep){clearTimeout(timer);timer=null;Object.keys(queue).forEach(p=>{const s=queue[p];delete queue[p];if(s.length&&!off)send(p,s,keep);});}
self.siteTrack=function(step,page){
  if(off||owner()||!/^[a-z0-9_]{1,24}$/.test(step))return;
  page=page?pageId(page):PAGE;
  try{const k="cpp:pt:"+page+":"+step;if(sessionStorage.getItem(k))return;sessionStorage.setItem(k,"1");}catch(e){}
  (queue[page]=queue[page]||[]).push(step);
  /* steps that usually lead straight to another page go out right away */
  if(queue[page].length>=12||/^(save|cta|signin|next|signup|team)$/.test(step))flush(true);else{clearTimeout(timer);timer=setTimeout(flush,1500);}
};
self.siteTrack.entry=entry;
addEventListener("pagehide",()=>flush(true));
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")flush(true);});
if(isApp())return;   // the app's homepage is counted by js/landing.js

/* public pages */
const t=self.siteTrack;
t("land");
addEventListener("scroll",()=>{const h=document.documentElement.scrollHeight-innerHeight;
  if(h>0&&scrollY>h*.4)t("scroll");if(h>0&&scrollY>h-200)t("bottom");},{passive:true});
document.addEventListener("pointerdown",e=>{if(e.target.closest(".td,.tp,.sc-player,.sc-board,.td-tools"))t("try");},true);
document.addEventListener("click",e=>{const a=e.target.closest("a[href]");if(!a)return;
  let u;try{u=new URL(a.href,location.href);}catch(x){return;}
  if(u.origin!==location.origin)return;
  if(u.pathname==="/"&&u.searchParams.has("signin"))t("signin");
  else if(u.pathname==="/"&&u.searchParams.has("from"))t("cta");
  else if(pageId(u.pathname)!==PAGE)t("next");},true);
})();
