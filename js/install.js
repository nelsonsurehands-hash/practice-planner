/* Getting coaches to put the app on their home screen.
   - Android (and Chrome/Edge on computers) let us offer a real one-tap "Install app" button.
   - iPhone/iPad don't, so we show the two steps: Share, then Add to Home Screen.
   - A small banner on phones from the second day a coach uses the app (never on the first screen, never
     once it's installed). "Not now" waits two weeks; after the second "Not now" it stops for good.
   - The Get started checklist (js/onboard.js) has a step for it that opens the same instructions.
   Opening the installed app counts in Settings → Usage, so you can see how many coaches installed it. */
(function(){
const ua=navigator.userAgent||"";
const isIOS=/iPhone|iPad|iPod/.test(ua)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
const isAndroid=/Android/i.test(ua);
const isPhone=isIOS||isAndroid||matchMedia("(max-width:720px) and (pointer:coarse)").matches;
const installed=()=>{try{return matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;}catch{return false;}};
const ls=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);}catch{}return null;};
const today=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
const addDays=(iso,n)=>{const d=new Date(iso+"T12:00:00");d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);};
const tr=k=>{if(typeof track==="function")track(k);};
let deferred=null;   // Chrome/Edge's install prompt, saved until the coach taps Install

window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;refresh();});
window.addEventListener("appinstalled",()=>{deferred=null;tr("install:done");hideBanner();markDone();});

/* Days the app was opened in a browser on this device: the banner waits for the second one. */
(function(){const d=ls("cpp:days")?JSON.parse(ls("cpp:days")):[];const t=today();if(!d.includes(t)){d.push(t);ls("cpp:days",JSON.stringify(d.slice(-30)));}})();
const dayCount=()=>{try{return JSON.parse(ls("cpp:days")||"[]").length;}catch{return 1;}};

/* Running as the installed app: count it, and tick the checklist step on every device. */
function markDone(){
  if(typeof SETTINGS==="undefined"||!SETTINGS.onboard||(SETTINGS.onboard.seen||{}).install)return;
  if(typeof team==="undefined"||!team||!(team.role==="owner"||!team.role))return;
  try{saveSettings({...team.settings,onboard:{...SETTINGS.onboard,seen:{...(SETTINGS.onboard.seen||{}),install:true}}});}catch{}
}
if(installed()){let n=0;const iv=setInterval(()=>{n++;if(typeof team!=="undefined"&&team&&typeof SETTINGS!=="undefined"){clearInterval(iv);tr("app:installed");markDone();}else if(n>80)clearInterval(iv);},500);}

/* ---------- the how-to sheet ---------- */
const SHARE_ICON=`<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 11H5.5A1.5 1.5 0 0 0 4 12.5v7A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5H17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
const PLUS_ICON=`<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
const DOTS_ICON=`<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="5" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="19" r="2" fill="currentColor"/></svg>`;
let dlg=null;
function sheet(){
  if(!dlg){dlg=document.createElement("dialog");dlg.className="in-dlg";document.body.appendChild(dlg);
    dlg.addEventListener("click",async e=>{if(e.target===dlg||e.target.closest("[data-in=close]")){dlg.close();return;}
      if(e.target.closest("[data-in=go]")&&deferred){const d=deferred;deferred=null;dlg.close();d.prompt();
        try{const r=await d.userChoice;tr(r&&r.outcome==="accepted"?"install:accepted":"install:declined");}catch{}refresh();}});}
  const steps=deferred?"":isIOS?`<ol class="in-steps">
      <li><span class="in-ic">${SHARE_ICON}</span><span>Tap the <b>Share</b> button${/CriOS|FxiOS|EdgiOS/.test(ua)?" (top right of the address bar)":" at the bottom of Safari"}.</span></li>
      <li><span class="in-ic">${PLUS_ICON}</span><span>Scroll down and tap <b>Add to Home Screen</b>, then <b>Add</b>.</span></li>
      <li><span class="in-ic"><img src="icons/icon-192.png" alt="" width="22" height="22"></span><span>Open The Extra Coach from your home screen from now on.</span></li></ol>`
    :`<ol class="in-steps">
      <li><span class="in-ic">${DOTS_ICON}</span><span>Tap your browser's <b>menu</b> (⋮ at the top right).</span></li>
      <li><span class="in-ic">${PLUS_ICON}</span><span>Tap <b>Install app</b> or <b>Add to Home screen</b>.</span></li>
      <li><span class="in-ic"><img src="icons/icon-192.png" alt="" width="22" height="22"></span><span>Open The Extra Coach from your home screen from now on.</span></li></ol>`;
  dlg.innerHTML=`<div class="dlg"><div class="in-top"><img src="icons/icon-192.png" alt="" width="52" height="52"><div><h2>Put The Extra Coach on your home screen</h2>
      <p class="help">It opens in one tap like any app, full screen, and you're always signed in.</p></div></div>
    ${steps}
    <div class="actions" style="justify-content:flex-end;margin:4px 0 0">${deferred?`<button class="btn" type="button" data-in="close">Not now</button><button class="btn primary" type="button" data-in="go">Install app</button>`:`<button class="btn primary" type="button" data-in="close">Got it</button>`}</div></div>`;
  if(!dlg.open)dlg.showModal();tr("install:howto");
}

/* ---------- the banner (phones only) ---------- */
let bar=null;
function hideBanner(){if(bar){bar.remove();bar=null;document.body.classList.remove("has-inbar");}}
function wantBanner(){
  if(installed()||!isPhone||document.getElementById("app").hidden)return false;
  if(ls("cpp:installNo")==="never")return false;
  const snooze=ls("cpp:installSnooze");if(snooze&&today()<snooze)return false;
  return dayCount()>=2||(typeof SETTINGS!=="undefined"&&SETTINGS.onboard&&Object.keys(SETTINGS.onboard.seen||{}).length>0);
}
function refresh(){
  if(!wantBanner()){hideBanner();return;}
  if(bar)return;
  bar=document.createElement("div");bar.className="in-bar";bar.setAttribute("role","region");bar.setAttribute("aria-label","Add the app to your home screen");
  bar.innerHTML=`<img src="icons/icon-192.png" alt="" width="36" height="36"><span><b>Add to your home screen</b><small>Open it in one tap, like an app.</small></span>
    <button type="button" class="btn primary" data-inb="go">${deferred?"Install":"Show me"}</button><button type="button" class="icon" data-inb="no" aria-label="Not now">✕</button>`;
  bar.addEventListener("click",e=>{const b=e.target.closest("[data-inb]");if(!b)return;
    if(b.dataset.inb==="go"){hideBanner();sheet();}
    else{const n=+(ls("cpp:installNoCount")||0)+1;ls("cpp:installNoCount",String(n));
      if(n>=2)ls("cpp:installNo","never");else ls("cpp:installSnooze",addDays(today(),14));tr("install:notnow");hideBanner();}});
  document.body.appendChild(bar);document.body.classList.add("has-inbar");tr("install:banner");
}
/* Check after the team loads, and again when the coach comes back to the tab. */
let tries=0;const iv=setInterval(()=>{tries++;if(typeof team!=="undefined"&&team){clearInterval(iv);setTimeout(refresh,2500);}else if(tries>120)clearInterval(iv);},500);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")refresh();});

window.Install={installed,canShow:()=>!installed()&&(isPhone||!!deferred),open:sheet,isPhone};
})();
