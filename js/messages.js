/* Message center: a bell at the top of the app with every note the coach sent from the feedback card and
   each reply from The Extra Coach team (supabase/messages.sql). A red count shows unread replies; it checks
   when the app opens, when it comes back to the screen, and every few minutes while it's open. A new reply
   that arrives while the app is open pops a small notice. Installed apps also get a badge on the icon. */
(function(){
const h=t=>String(t==null?"":t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const ready=()=>typeof HOSTED!=="undefined"&&HOSTED&&typeof user!=="undefined"&&user&&typeof sb!=="undefined"&&sb&&!isOwner();
const isOwner=()=>{try{return !!localStorage.getItem("cpp:owner");}catch(e){return false;}};
let list=null,unread=0,off=false,timer=null,lastUnread=-1;
const when=iso=>{const d=new Date(iso),days=Math.floor((Date.now()-d)/864e5);return days<1?d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}):days<7?d.toLocaleDateString("en-US",{weekday:"short"}):d.toLocaleDateString("en-US",{month:"short",day:"numeric"});};

/* the bell, next to the ? at the top */
const bell=document.createElement("button");bell.type="button";bell.className="btn msg-bell";bell.id="msgBell";bell.hidden=true;
bell.setAttribute("aria-label","Messages");bell.title="Messages";
bell.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg><span class="msg-n" id="msgN" hidden></span>`;
function place(){const bar=document.querySelector(".app-bar"),q=document.getElementById("pageHelpBtn");if(q&&q.parentNode)q.parentNode.insertBefore(bell,q);else if(bar)bar.appendChild(bell);}
place();

const dlg=document.createElement("dialog");dlg.className="msg-dlg";dlg.id="msgDlg";dlg.setAttribute("aria-labelledby","msgT");document.body.appendChild(dlg);

async function load(){
  if(off||!ready())return;
  try{
    const {data,error}=await sb.rpc("my_messages");
    if(error){if(/function|schema cache|does not exist/i.test(error.message))off=true;return;}
    list=Array.isArray(data)?data:[];
  }catch(e){return;}
  unread=list.filter(x=>x.unread).length;
  bell.hidden=!list.length;const n=document.getElementById("msgN");n.hidden=!unread;n.textContent=unread>9?"9+":String(unread);
  bell.setAttribute("aria-label",unread?`Messages, ${unread} new`:"Messages");
  try{if(navigator.setAppBadge){unread?navigator.setAppBadge(unread):navigator.clearAppBadge();}}catch(e){}
  if(lastUnread>=0&&unread>lastUnread&&!dlg.open)toast();
  lastUnread=unread;
  if(dlg.open)draw();
}
function toast(){
  if(document.getElementById("msgToast"))return;
  const t=document.createElement("div");t.id="msgToast";t.className="msg-toast";t.setAttribute("role","status");
  t.innerHTML=`<b>New reply from The Extra Coach team</b><button type="button" class="btn primary" data-msg="open">Read it</button><button type="button" class="icon" data-msg="x" aria-label="Dismiss">✕</button>`;
  document.body.appendChild(t);setTimeout(()=>{if(t.isConnected)t.remove();},12000);
}
function draw(){
  dlg.innerHTML=`<div class="dlg msg"><div class="hg-head"><h2 id="msgT">Messages</h2><button type="button" class="icon" data-msg="close" aria-label="Close">✕</button></div>
    <p class="help" style="margin-top:0">Your notes to The Extra Coach team, and our replies.</p>
    <div class="msg-list">${(list||[]).map(x=>{const you=x.message||(x.picks||[]).join(", ");
      return `<div class="msg-thread">${you?`<div class="msg-b you"><small>You · ${h(when(x.at))}</small><p>${h(you)}</p></div>`:""}
        ${x.reply?`<div class="msg-b them${x.unread?" new":""}"><small>The Extra Coach team · ${h(when(x.replied_at))}${x.unread?` <em>New</em>`:""}</small><p>${h(x.reply).replace(/\n/g,"<br>")}</p></div>`:`<p class="msg-wait">We'll reply here.</p>`}</div>`;}).join("")||`<p class="help">No messages yet.</p>`}</div>
    <div class="msg-write"><label for="msgTxt">Write to The Extra Coach team</label><textarea id="msgTxt" rows="3" maxlength="2000" placeholder="A question, an idea, or something that's in your way"></textarea>
      <label class="fb-ok"><input type="checkbox" id="msgEmail" checked> Email me when you reply</label>
      <div class="fb-act"><button type="button" class="btn primary" data-msg="send">Send</button><span class="fb-msg" id="msgOut" aria-live="polite"></span></div></div></div>`;
}
async function open(){
  const t=document.getElementById("msgToast");if(t)t.remove();
  if(list===null)await load();draw();if(!dlg.open)dlg.showModal();
  if(unread){try{await sb.rpc("seen_all_replies");}catch(e){}
    const c=document.getElementById("fbReply");if(c)c.remove();
    unread=0;lastUnread=0;document.getElementById("msgN").hidden=true;bell.setAttribute("aria-label","Messages");try{navigator.clearAppBadge&&navigator.clearAppBadge();}catch(e){}
    setTimeout(()=>{(list||[]).forEach(x=>x.unread=false);if(dlg.open)draw();},2500);}
  if(typeof track==="function")track("messages:open");
}
document.addEventListener("click",async e=>{
  if(e.target.closest("#msgBell")){open();return;}
  const b=e.target.closest("[data-msg]");if(!b)return;const a=b.dataset.msg;
  if(a==="close"){dlg.close();return;}
  if(a==="x"){const t=document.getElementById("msgToast");if(t)t.remove();return;}
  if(a==="open"){open();return;}
  if(a==="send"){
    const txt=(document.getElementById("msgTxt").value||"").trim(),out=document.getElementById("msgOut");
    if(!txt){out.textContent="Write a few words first.";return;}
    b.disabled=true;b.textContent="Sending…";
    const {error}=await sb.rpc("send_feedback",{p_team:(typeof team!=="undefined"&&team&&team.id)||null,p_picks:[],p_message:txt,p_contact:document.getElementById("msgEmail").checked});
    if(error){b.disabled=false;b.textContent="Send";out.textContent="Not sent. Check your connection and try again.";return;}
    if(typeof track==="function")track("messages:sent");
    await load();draw();const o=document.getElementById("msgOut");if(o)o.textContent="Sent. We'll reply here.";
  }
});
dlg.addEventListener("click",e=>{if(e.target===dlg)dlg.close();});
/* check now (once signed in), when the app comes back to the screen, and every 3 minutes while it's open */
let tries=0;const first=setInterval(()=>{if(ready()){clearInterval(first);load();}else if(++tries>40)clearInterval(first);},500);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")load();});
timer=setInterval(()=>{if(document.visibilityState==="visible")load();},180000);
self.MessageCenter={open,load,_set:(l)=>{list=l;unread=l.filter(x=>x.unread).length;bell.hidden=!l.length;const n=document.getElementById("msgN");n.hidden=!unread;n.textContent=String(unread);}};   // _set is for testing
})();
