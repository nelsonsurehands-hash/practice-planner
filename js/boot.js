/* App start-up: sign-in, teams and staffs, Settings, copying between teams, backups. */
const CFG=window.APP_CONFIG||{};
const HOSTED=!!(CFG.supabaseUrl&&CFG.supabaseAnonKey&&window.supabase);
let sb=null, user=null, team=null, teams=[], store=null, members=[];

/* Starter drills by sport (offered when a team is created). */
const STARTERS={
 basketball:[["starter-dynamic-warmup",{name:"Dynamic Warm-up",categories:["Warm-up"],minutes:8,description:"Lines baseline to half court and back: high knees, butt kicks, carioca, lunges with twist, defensive slides, backpedal, sprint.",points:"Full effort on every rep. Talk to each other."}],
 ["starter-two-ball",{name:"Two-Ball Dribbling",categories:["Ball handling"],minutes:6,description:"Each player with two balls: same-time pounds, alternating, high-low, then walking forward and back.",points:"Eyes up. Pound the ball below the waist."}],
 ["starter-mikan",{name:"Mikan Drill",categories:["Finishing"],minutes:5,description:"Continuous alternating layups under the rim, right hand off the right side, left hand off the left. Count makes in 30 or 60 seconds.",points:"Use the backboard. Keep the ball high."}],
 ["starter-3man-weave",{name:"3-Man Weave",categories:["Passing","Transition"],minutes:8,description:"Three lines at the baseline. Pass and go behind the receiver, full court, finish with a layup. Add a 2-on-1 coming back.",points:"Lead passes, no dribbles. Sprint to fill the lane."}],
 ["starter-form-shooting",{name:"Form Shooting",categories:["Shooting"],minutes:8,description:"Partners, close to the rim. One-hand shots, then two hands, stepping back after every 5 makes.",points:"Elbow under the ball, hold the follow-through."}],
 ["starter-partner-shooting",{name:"Partner Shooting",categories:["Shooting"],minutes:8,description:"Shooter and rebounder/passer. Shooter moves to 5 spots around the arc; switch after 10 shots.",points:"Feet ready before the catch. Call for the ball."}],
 ["starter-shell",{name:"Shell Drill (4-on-4)",categories:["Defense"],minutes:12,description:"4 offense on the perimeter pass it around; defense moves on every pass to on-ball, deny or help. Add skip passes, then drives.",points:"Jump to the ball on every pass. Talk: ball, help, deny."}],
 ["starter-closeouts",{name:"Closeouts",categories:["Defense"],minutes:6,description:"Defender starts under the rim, passes to a shooter on the wing, closes out with choppy steps, then contains one dribble.",points:"Sprint then chop. Hands high."}],
 ["starter-box-out",{name:"Box Out Battle",categories:["Rebounding","Defense"],minutes:6,description:"3-on-3 inside the lane. Coach shoots; defense must box out and secure the rebound.",points:"Find, hit, then get the ball. Wide base."}],
 ["starter-ft-sprints",{name:"Free Throw Sprints",categories:["Conditioning","Shooting"],minutes:5,description:"A player shoots a free throw: a make cancels the sprint, a miss is a down-and-back for the team.",points:"Game-pressure free throws while tired."}],
 ["starter-scrimmage",{name:"Controlled Scrimmage",categories:["Scrimmage"],minutes:15,description:"5-on-5 with stops to teach. Run the offense and defense from the day's focus.",points:"Pick one or two things to correct and stick to them."}]],
 volleyball:[
  ["vb-pepper",{name:"Pepper",categories:["Warm-up","Passing","Setting"],minutes:8,description:"Partners: pass, set, hit in a continuous rally. Switch to dig-set-hit after 2 minutes.",points:"Platform angle to target. Talk on every touch."}],
  ["vb-serve-targets",{name:"Serving Targets",categories:["Serving"],minutes:10,description:"Servers aim at zones 1, 5 and 6 marked with cones. Count makes per player.",points:"Same toss every time. Follow through to the target."}],
  ["vb-serve-receive",{name:"3-Person Serve Receive",categories:["Serve receive","Passing"],minutes:12,description:"Three passers in W formation receive live serves; setter at target scores each pass 0–3.",points:"Call the ball early. Feet to the ball, then platform."}],
  ["vb-block-footwork",{name:"Block Footwork",categories:["Blocking"],minutes:6,description:"Front row slides and crosses along the net to antenna and middle, jumping on coach's cue.",points:"Hands over the net, press. Close the seam with the middle."}],
  ["vb-queen-court",{name:"Queen of the Court",categories:["Scrimmage","Transition"],minutes:15,description:"Teams of 2–3 challenge the queen side; win the rally to move over.",points:"Compete every ball. Fast transition off the net."}]],
 soccer:[
  ["sc-rondo",{name:"Rondo 5v2",categories:["Warm-up","Possession","Passing"],minutes:10,description:"Five on the outside of a 10x10 grid keep the ball from two defenders. Defender who wins it swaps with the passer.",points:"Two-touch max. Open your body to the next pass."}],
  ["sc-passing-pattern",{name:"Passing Pattern (Y)",categories:["Passing"],minutes:10,description:"Y-shaped passing pattern with follow-your-pass rotation; add a give-and-go.",points:"Pass to the back foot. Check away before checking to the ball."}],
  ["sc-1v1",{name:"1v1 to Goal",categories:["Dribbling","Defending","Finishing"],minutes:10,description:"Attacker receives from coach and goes 1v1 against a defender to a small goal.",points:"Attack the front foot. Defender stays low and patient."}],
  ["sc-finishing",{name:"Finishing Waves",categories:["Shooting","Finishing"],minutes:12,description:"Wide player crosses, two runners attack near and far post.",points:"Near post run first. Strike across the keeper."}],
  ["sc-ssg",{name:"Small-Sided Game 4v4",categories:["Small-sided games","Scrimmage"],minutes:15,description:"4v4 on a short field with small goals; restart with coach serves.",points:"Width and support angles. Win it back within 5 seconds."}]],
 football:[
  ["fb-dynamic",{name:"Dynamic Warm-up",categories:["Warm-up"],minutes:10,description:"Lines 10 yards: high knees, carioca, backpedal, shuffle, build-ups.",points:"Full speed on the last rep."}],
  ["fb-tackling-circuit",{name:"Tackling Circuit",categories:["Tackling","Defense"],minutes:12,description:"Stations: form fit, angle tackle on bags, shoulder tackle on tubes.",points:"Eyes up, near foot, wrap and roll."}],
  ["fb-routes-on-air",{name:"Routes on Air",categories:["Route running","Offense"],minutes:10,description:"QBs and receivers run the route tree against air at full speed.",points:"Sell the stem. Break at exact depth."}],
  ["fb-oline-sled",{name:"O-Line Sled",categories:["Blocking","Individual"],minutes:8,description:"First step, punch, drive on the sled by position group.",points:"Pad level below the defender. Short first step."}],
  ["fb-team-period",{name:"Team Period",categories:["Team","Offense","Defense"],minutes:20,description:"Offense vs defense, scripted plays from the day's install.",points:"Get lined up fast. Coach one thing per rep."}]],
 baseball:[
  ["bs-throwing",{name:"Throwing Progression",categories:["Warm-up","Throwing"],minutes:10,description:"Wrist flips, one-knee, long toss back to 90 feet.",points:"Lead with the glove-side shoulder. Finish over the front leg."}],
  ["bs-infield",{name:"Infield / Outfield",categories:["Fielding","Team defense"],minutes:15,description:"Coach hits rounds to every position with throws to each base and home.",points:"Get around the ball. Crow hop on outfield throws."}],
  ["bs-tee-work",{name:"Tee and Soft Toss",categories:["Hitting"],minutes:12,description:"Stations: high tee, low tee, soft toss from the side.",points:"Hands inside the ball. Barrel stays through the zone."}],
  ["bs-baserunning",{name:"Baserunning: First to Third",categories:["Baserunning"],minutes:10,description:"Runners read the ball off the bat and go first to third on a single.",points:"Round the bag at second. Find the coach early."}],
  ["bs-cutoffs",{name:"Cutoffs & Relays",categories:["Team defense","Throwing"],minutes:10,description:"Hits to the gaps; outfield hits the cutoff, infield calls the play.",points:"Line up the cut. Loud, early calls."}]],
 other:[]
};
function startersFor(sport){return (STARTERS[sport]||[]).map(([id,d])=>[id,{...d,category:d.categories[0],createdAt:Date.now()}]);}

const screens=["screen-loading","screen-auth","screen-setup","app"];
function show(id){screens.forEach(x=>{$("#"+x).hidden=x!==id;});window.scrollTo(0,0);}
const msg=(el,text,kind)=>{el.textContent=text||"";el.className="msg"+(kind?" "+kind:"");};
const sportName=t=>(SPORTS[(t.settings||{}).sport]||SPORTS.basketball).name;
const roleName=r=>({owner:"Head coach",coach:"Coach",viewer:"View only"})[r]||r;
const canEdit=t=>t&&t.role!=="viewer";

/* ---------- demo mode: teams kept in this browser ---------- */
const DEMO_KEY="cpp:demoTeams";
function readDemoTeams(){
  try{
    const list=JSON.parse(localStorage.getItem(DEMO_KEY)||"null");if(list)return list;
    const old=JSON.parse(localStorage.getItem("cpp:demoTeam")||"null");   // earlier single-team demo
    if(old){localStorage.setItem(DEMO_KEY,JSON.stringify([old]));return [old];}
  }catch{}
  return [];
}
function writeDemoTeams(list){try{localStorage.setItem(DEMO_KEY,JSON.stringify(list));}catch{}}
function demoName(){try{return localStorage.getItem("cpp:demoName")||"Me";}catch{return "Me";}}

/* ---------- start-up ---------- */
async function init(){
  document.querySelectorAll(".hosted-only").forEach(x=>x.hidden=!HOSTED);
  document.querySelectorAll(".demo-only").forEach(x=>x.hidden=HOSTED);
  if(!HOSTED){
    $("#demoBar").hidden=false;$("#joinForm").hidden=true;$("#joinDivider").hidden=true;
    user={id:"me",email:""};
    teams=readDemoTeams();
    return teams.length?openTeam(pickLast()):showSetup(false);
  }
  sb=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey,{auth:{persistSession:true,detectSessionInUrl:true,flowType:"implicit"}});
  /* Implicit flow: links in emails (confirm, reset password) and Google/Facebook sign-in return
     with the session in the address, so they work even if the email opens in another browser. */
  const back=new URLSearchParams(location.hash.slice(1)+"&"+location.search.slice(1));
  const linkErr=back.get("error_description")||back.get("error");
  RECOVERY=back.get("type")==="recovery";
  renderOauth();
  sb.auth.onAuthStateChange((event,session)=>{
    if(event==="PASSWORD_RECOVERY"){RECOVERY=true;showNewPassword();return;}
    if(event==="SIGNED_IN"&&session&&!user&&!RECOVERY)afterLogin(session.user);
    if(event==="SIGNED_OUT")location.reload();
  });
  const {data:{session}}=await sb.auth.getSession();
  if(session){history.replaceState(null,"",location.pathname);if(RECOVERY){showNewPassword();return;}afterLogin(session.user);return;}
  show("screen-auth");
  if(linkErr){
    history.replaceState(null,"",location.pathname);
    msg($("#authMsg"),/expired|invalid/i.test(linkErr)?"That email link has expired or was already used. Tap Forgot password to get a new one.":"Sign-in didn't finish: "+linkErr.replace(/\+/g," "),"err");
  }
}
function pickLast(){let last=null;try{last=localStorage.getItem("cpp:lastTeam");}catch{}return teams.find(x=>x.id===last)||teams[0];}
async function afterLogin(u){
  user=u;
  await loadTeams();
  if(teams.length)openTeam(pickLast());else showSetup(false);
}
async function loadTeams(){
  if(!HOSTED){teams=readDemoTeams();return;}
  const {data,error}=await sb.from("team_members").select("role,title,display_name, teams(id,name,settings,join_code,viewer_code)").eq("user_id",user.id);
  if(error){show("screen-auth");msg($("#authMsg"),"Couldn't load your teams: "+error.message,"err");teams=[];return;}
  teams=(data||[]).filter(r=>r.teams).map(r=>({...r.teams,role:r.role,title:r.title,myName:r.display_name}))
    .sort((a,b)=>a.name.localeCompare(b.name));
}
async function loadMembers(){
  if(!HOSTED){members=[{user_id:"me",display_name:demoName(),title:"Head Coach",role:"owner"}];return;}
  const {data}=await sb.from("team_members").select("user_id,role,email,display_name,title,joined_at").eq("team_id",team.id).order("joined_at");
  members=data||[];
}
async function openTeam(t){
  team=t;
  if(store)store.close();
  store=HOSTED?supabaseStore(sb,t.id,user.id):localStore(t.id);
  try{localStorage.setItem("cpp:lastTeam",t.id);}catch{}
  await loadMembers();
  const me=members.find(m=>m.user_id===user.id);
  ME={id:user.id,name:(me&&me.display_name)||(HOSTED?(user.email||"").split("@")[0]:demoName())};
  STAFF=members.filter(m=>m.role!=="viewer").map(m=>m.display_name||(m.email||"").split("@")[0]).filter(Boolean);
  show("app");
  startPlanner(store,t.settings||{});
  setReadOnly(!canEdit(t));
  $("#viewOnlyBar").hidden=canEdit(t);
  renderSwitcher();
  if(!$("#view-settings").hidden)window.onSettingsTab();
  startPresence();
}

/* ---------- team switcher (header) ---------- */
function renderSwitcher(){
  $("#swName").textContent=team.name;
  $("#swMeta").textContent=`${sportName(team)} · ${roleName(team.role)}`;
  $("#swMenu").innerHTML=`<div class="sw-head">Your teams</div>`+
    teams.map(t=>`<button class="sw-item${t.id===team.id?" on":""}" data-team="${t.id}" role="menuitem">
      ${(t.settings||{}).logo?`<img class="sw-logo" src="${esc(t.settings.logo)}" alt="">`:`<span class="sw-dot" style="background:${esc((t.settings||{}).color||"#5b2a86")}${(t.settings||{}).color2?`;box-shadow:inset -6px 0 0 ${esc(t.settings.color2)}`:""}"></span>`}
      <span><b>${esc(t.name)}</b><small>${esc(sportName(t))} · ${esc(roleName(t.role))}</small></span></button>`).join("")+
    `<div class="sw-actions"><button class="btn" id="swNew">+ New team</button>${HOSTED?`<button class="btn" id="swJoin">Join a staff</button>`:""}</div>`;
}
$("#swMenu").addEventListener("click",e=>{
  const b=e.target.closest("[data-team]");
  if(b){const t=teams.find(x=>x.id===b.dataset.team);$("#teamSw").open=false;if(t&&t.id!==team.id){openTeam(t);setTab("plan");}return;}
  if(e.target.id==="swNew"||e.target.id==="swJoin"){$("#teamSw").open=false;showSetup(true,e.target.id==="swJoin");}
});
document.addEventListener("click",e=>{const d=$("#teamSw");if(d.open&&!d.contains(e.target))d.open=false;});

/* ---------- sign in ---------- */
/* Email + password. "Create account" signs you up; "Forgot password?" emails a reset link. */
let authMode="in";
function authTab(mode){
  authMode=mode;
  $("#authTabIn").setAttribute("aria-selected",mode==="in");$("#authTabUp").setAttribute("aria-selected",mode==="up");
  $("#authNameWrap").hidden=mode!=="up";$("#authForgot").hidden=mode!=="in";
  $("#authPass").autocomplete=mode==="up"?"new-password":"current-password";
  $("#authPass").placeholder=mode==="up"?"At least 8 characters":"";
  $("#authBtn").textContent=mode==="up"?"Create account":"Sign in";
  $("#authMsg").textContent="";$("#authMsg").className="msg";
}
$("#authTabIn").addEventListener("click",()=>authTab("in"));
$("#authTabUp").addEventListener("click",()=>authTab("up"));
const authErr=m=>/invalid login/i.test(m)?"Email or password is wrong. New here? Tap Create account. Forgot it? Tap Forgot password.":
  /already registered|already been registered/i.test(m)?"There's already an account with that email. Tap Sign in, or Forgot password to set a new one.":
  /email not confirmed/i.test(m)?"Confirm your email first: tap the link in the email we sent, then sign in.":
  /rate limit/i.test(m)?"Too many emails sent in the last hour. Wait a bit and try again.":
  /provider is not enabled|unsupported provider/i.test(m)?"That sign-in option isn't turned on yet. Use email and password for now.":m;
$("#authForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const email=$("#authEmail").value.trim(),password=$("#authPass").value;if(!email||!password)return;
  if(password.length<8){msg($("#authMsg"),"Passwords need at least 8 characters.","err");return;}
  $("#authBtn").disabled=true;msg($("#authMsg"),authMode==="up"?"Creating your account…":"Signing in…");
  if(authMode==="up"){
    const name=$("#authName").value.trim();
    const {data,error}=await sb.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname,data:name?{full_name:name}:{}}});
    $("#authBtn").disabled=false;
    if(error){msg($("#authMsg"),authErr(error.message),"err");return;}
    if(!data.session){
      if(data.user&&Array.isArray(data.user.identities)&&!data.user.identities.length){msg($("#authMsg"),authErr("already registered"),"err");return;}
      authTab("in");$("#authEmail").value=email;
      msg($("#authMsg"),`Almost done: tap the confirmation link we sent to ${email}, then sign in here.`,"ok");return;
    }
    return;   // signed in: onAuthStateChange opens the app
  }
  const {error}=await sb.auth.signInWithPassword({email,password});
  $("#authBtn").disabled=false;
  if(error)msg($("#authMsg"),authErr(error.message),"err");
});
$("#authForgot").addEventListener("click",async()=>{
  const email=$("#authEmail").value.trim();
  if(!email){msg($("#authMsg"),"Type your email above, then tap Forgot password.","err");$("#authEmail").focus();return;}
  msg($("#authMsg"),"Sending…");
  const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
  if(error)msg($("#authMsg"),authErr(error.message),"err");
  else msg($("#authMsg"),`Check ${email} for a link to set your password. Open it on this device.`,"ok");
});
/* Back from the reset email: pick a new password, then carry on into the app. */
let RECOVERY=false;
function showNewPassword(){
  show("screen-auth");$("#authForm").hidden=true;$(".auth-tabs").hidden=true;$("#oauthBox").hidden=true;$("#newPwForm").hidden=false;$("#newPass").focus();
}
$("#newPwForm").addEventListener("submit",async e=>{
  e.preventDefault();const v=$("#newPass").value;if(v.length<8){msg($("#authMsg"),"Use at least 8 characters.","err");return;}
  $("#newPwBtn").disabled=true;msg($("#authMsg"),"Saving…");
  const {data,error}=await sb.auth.updateUser({password:v});
  $("#newPwBtn").disabled=false;
  if(error){msg($("#authMsg"),authErr(error.message),"err");return;}
  RECOVERY=false;$("#newPwForm").hidden=true;$("#authForm").hidden=false;$(".auth-tabs").hidden=false;msg($("#authMsg"),"");
  afterLogin(data.user);
});
/* Google / Facebook: only the providers listed in js/config.js (turned on in Supabase) are shown. */
function renderOauth(){
  const list=(CFG.oauth||[]).filter(p=>["google","facebook"].includes(p));
  $("#oauthBox").hidden=!list.length;
  document.querySelectorAll("[data-provider]").forEach(b=>b.hidden=!list.includes(b.dataset.provider));
}
$("#oauthBox").addEventListener("click",async e=>{
  const b=e.target.closest("[data-provider]");if(!b)return;
  msg($("#authMsg"),"Opening "+b.textContent.replace("Continue with ","")+"…");
  const {error}=await sb.auth.signInWithOAuth({provider:b.dataset.provider,options:{redirectTo:location.origin+location.pathname}});
  if(error)msg($("#authMsg"),authErr(error.message),"err");
});

/* ---------- create or join a team ---------- */
function showSetup(canGoBack,focusJoin){
  $("#suBack").hidden=!canGoBack;msg($("#setupMsg"),"");msg($("#joinMsg"),"");
  const nm=team&&team.myName||"";$("#suName").value=nm;$("#joinName").value=nm;
  updateStarterLabel();
  show("screen-setup");
  if(focusJoin)$("#joinCode").focus();
}
function updateStarterLabel(){
  const n=(STARTERS[$("#suSport").value]||[]).length;
  $("#suStarterWrap").hidden=!n;$("#suStarterText").textContent=`Add ${n} starter drills`;
}
$("#suSport").addEventListener("change",updateStarterLabel);
$("#suBack").addEventListener("click",()=>{show("app");});
$("#setupForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const sport=$("#suSport").value;
  const settings={...DEFAULT_SETTINGS,sport,
    school:$("#suSchool").value.trim(),mascot:$("#suMascot").value.trim(),teamLabel:$("#suLabel").value.trim(),
    color:$("#suColor").value,seasonStart:$("#suStart").value,seasonEnd:$("#suEnd").value,
    weekdayStart:$("#suWdS").value||"16:00",weekdayEnd:$("#suWdE").value||"18:00"};
  const name=[settings.school,settings.mascot,settings.teamLabel&&!settings.mascot?settings.teamLabel:""].filter(Boolean).join(" ")||"My team";
  let t;
  if(HOSTED){
    msg($("#setupMsg"),"Creating team…");
    const {data,error}=await sb.rpc("create_team",{p_name:name,p_settings:settings,p_display_name:$("#suName").value.trim()||null});
    if(error){msg($("#setupMsg"),error.message,"err");return;}
    await loadTeams();t=teams.find(x=>x.id===data);
    if(!t){msg($("#setupMsg"),"Team created, but it couldn't be loaded. Reload the page.","err");return;}
  }else{
    t={id:"demo-"+uid(),name,settings,role:"owner",join_code:"",viewer_code:""};
    teams=[...readDemoTeams(),t];writeDemoTeams(teams);
  }
  const addStarters=$("#suStarter").checked;
  $("#setupForm").reset();updateStarterLabel();
  await openTeam(t);setTab("plan");
  if(addStarters&&STARTERS[sport]&&STARTERS[sport].length){try{await store.bulkSet("drills",startersFor(sport));}catch{}}
});
$("#suSample").addEventListener("click",async e=>{
  const b=e.currentTarget;b.disabled=true;b.textContent="Loading sample…";
  try{
    const data=await (await fetch("data/sample-team.json")).json();
    const t={id:"demo-"+uid(),name:data.team||"Sample team",settings:{...DEFAULT_SETTINGS,...data.settings},role:"owner",join_code:"",viewer_code:""};
    teams=[...readDemoTeams(),t];writeDemoTeams(teams);
    await openTeam(t);setTab("plan");
    await store.bulkSet("drills",data.drills.map(({id,...d})=>[id,d]));
    await store.bulkSet("plays",data.plays.map(({id,...p})=>[id,p]));
    await store.bulkSet("plans",data.plans.map(p=>[p.date,p]));
  }catch(err){msg($("#setupMsg"),"Couldn't load the sample team.","err");}
  b.disabled=false;b.textContent="Explore with sample team";
});
$("#joinForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const code=$("#joinCode").value.trim().toUpperCase();if(!code)return;
  msg($("#joinMsg"),"Joining…");
  const {data,error}=await sb.rpc("join_team",{p_code:code,p_display_name:$("#joinName").value.trim()||null});
  if(error){msg($("#joinMsg"),error.message,"err");return;}
  await loadTeams();const t=teams.find(x=>x.id===data);
  if(t){$("#joinForm").reset();await openTeam(t);setTab("plan");}
  else msg($("#joinMsg"),"Joined, but the team couldn't be loaded. Reload the page.","err");
});

/* ---------- who else is here (live) ---------- */
let presenceTimer=null;
function viewState(){
  const tab=["plan","lib","plays","settings"].find(t=>!$("#view-"+t).hidden)||"plan";
  return {name:ME.name,tab,date:cur?cur.date:null};
}
function startPresence(){
  $("#presenceBar").hidden=true;
  if(!store||!store.presence)return;
  store.onPresence(list=>{
    const others=list.filter(p=>p.user!==user.id);
    if(!others.length){$("#presenceBar").hidden=true;return;}
    const where=p=>p.tab==="plan"&&p.date?`planning ${dLabel(p.date)}`:p.tab==="plays"?"in Plays":p.tab==="lib"?"in Drills":"in Settings";
    $("#presenceBar").innerHTML=`<span class="live" aria-hidden="true"></span> Also here: `+others.map(p=>`<b>${esc(p.name)}</b> <span>${where(p)}</span>`).join(", ");
    $("#presenceBar").hidden=false;
  });
  window.onViewChange();
}
window.onViewChange=function(){
  if(!store||!store.presence)return;
  clearTimeout(presenceTimer);presenceTimer=setTimeout(()=>store.presence({...viewState(),user:user.id}),300);
};

/* ---------- Settings tab ---------- */
let draft=null;
$("#sDays").innerHTML=DOW.map((d,i)=>`<label><input type="checkbox" id="sd${i}" value="${i}"><span>${d}</span></label>`).join("");
function gameRow(g,i){return `<div class="row game" data-i="${i}">
  <input type="date" data-f="date" value="${esc(g.date||"")}" aria-label="Game date">
  <input data-f="opponent" value="${esc(g.opponent||"")}" placeholder="Opponent" aria-label="Opponent">
  <input type="time" data-f="time" value="${esc(g.time||"")}" aria-label="Game time">
  <select data-f="home" aria-label="Home or away"><option value="1"${g.home!==false?" selected":""}>Home</option><option value="0"${g.home===false?" selected":""}>Away</option></select>
  <button class="icon rm" data-rm="games" aria-label="Remove game">✕</button></div>`;}
function specialRow(x,i){return `<div class="row special" data-i="${i}">
  <input type="date" data-f="date" value="${esc(x.date||"")}" aria-label="Date">
  <select data-f="kind" aria-label="Kind of day"><option value="off"${x.kind==="off"?" selected":""}>No practice</option><option value="extra"${x.kind==="extra"?" selected":""}>Extra practice</option><option value="note"${x.kind==="note"?" selected":""}>Note only</option></select>
  <input data-f="note" value="${esc(x.note||"")}" placeholder="e.g. Thanksgiving, Tryouts" aria-label="Note">
  <input type="time" data-f="start" value="${esc(x.start||"")}" aria-label="Practice starts (optional)" title="Practice starts (leave blank for the usual time)">
  <input type="time" data-f="end" value="${esc(x.end||"")}" aria-label="Practice ends (optional)" title="Practice ends (leave blank for the usual time)">
  <button class="icon rm" data-rm="special" aria-label="Remove day">✕</button></div>`;}
function renderRows(){
  $("#sGames").innerHTML=draft.games.length?draft.games.map(gameRow).join(""):`<p class="help">No games yet.</p>`;
  $("#sSpecial").innerHTML=draft.special.length?draft.special.map(specialRow).join(""):`<p class="help">No special days yet.</p>`;
}
function readForm(){
  draft.sport=$("#sSport").value;
  draft.school=$("#sSchool").value.trim();draft.mascot=$("#sMascot").value.trim();draft.teamLabel=$("#sLabel").value.trim();draft.color=$("#sColor").value;
  draft.color2=$("#sUseC2").checked?$("#sColor2").value:"";
  draft.weekdayStart=$("#sWdS").value;draft.weekdayEnd=$("#sWdE").value;draft.weekendStart=$("#sWeS").value;draft.weekendEnd=$("#sWeE").value;
  draft.seasonStart=$("#sStart").value;draft.seasonEnd=$("#sEnd").value;
  draft.minPractices=+$("#sMinPr").value||0;
  draft.special.forEach(x=>{if(!x.start)delete x.start;if(!x.end)delete x.end;});
  draft.practiceDays=[...document.querySelectorAll("#sDays input:checked")].map(x=>+x.value);
  return draft;
}
/* ---------- Settings sections (accordion) ---------- */
/* One-line summary on each closed section, so you can see what's inside without opening it. */
function accSummaries(){
  if(!draft)return;
  const t=x=>x?ampm12(x):"";
  const sub=(id,txt)=>{const el=document.getElementById("accSub-"+id);if(el)el.textContent=txt;};
  sub("team",[draft.school,draft.mascot].filter(Boolean).join(" ")+(draft.teamLabel?" · "+draft.teamLabel:""));
  const n=computePractices(draft).length,dd=(draft.practiceDays||[]).map(i=>DOW[i]).join(", ");
  sub("schedule",draft.seasonStart?`${n} practices · ${dd} · ${t(draft.weekdayStart)}–${t(draft.weekdayEnd)}`:"Set your season dates and practice days");
  const g=(draft.games||[]).filter(x=>x.date).sort((a,b)=>a.date<b.date?-1:1),nx=g.find(x=>x.date>=todayISO());
  sub("games",g.length?`${g.length} game${g.length>1?"s":""}${nx?` · next: ${dLabel(nx.date)} ${nx.home===false?"at":"vs"} ${nx.opponent||""}`:""}`:"No games yet");
  const sp=(draft.special||[]).filter(x=>x.date),off=sp.filter(x=>x.kind==="off").length,ex=sp.filter(x=>x.kind==="extra").length;
  sub("special",sp.length?`${off} day${off===1?"":"s"} off · ${ex} extra practice${ex===1?"":"s"} · ${sp.length-off-ex} with notes`:"Holidays, extra practices and notes");
  sub("staff",members.length?`${members.length} on staff`:"");
  sub("account",HOSTED&&user?user.email||"":"Demo mode");
}
const ampm12=x=>{const [h,m]=x.split(":").map(Number);return `${((h+11)%12)+1}:${String(m).padStart(2,"0")}${h<12?"am":"pm"}`;};
function openAcc(id,scroll){
  const d=document.getElementById("acc-"+id);if(!d)return;d.open=true;
  if(scroll)d.scrollIntoView({behavior:"smooth",block:"start"});
}
document.querySelector(".set-nav").addEventListener("click",e=>{const b=e.target.closest("[data-acc]");if(b)openAcc(b.dataset.acc,true);});
/* Remember which sections are open on this device. Team starts open the first time. */
(function(){
  let open=["team"];try{const v=JSON.parse(localStorage.getItem("cpp:accOpen")||"null");if(Array.isArray(v))open=v;}catch{}
  document.querySelectorAll("#view-settings details.acc").forEach(d=>{d.open=open.includes(d.id.slice(4));
    d.addEventListener("toggle",()=>{try{localStorage.setItem("cpp:accOpen",JSON.stringify([...document.querySelectorAll("#view-settings details.acc[open]")].map(x=>x.id.slice(4))));}catch{}});});
})();
function updatePreview(){
  const st=readForm(),list=computePractices(st);
  accSummaries();
  $("#sPreview").textContent=list.length?`${list.length} practice days scheduled, ${dLabel(list[0][0])} to ${dLabel(list[list.length-1][0])}.`:"Set season dates and practice days to build your practice calendar.";
}
window.onSettingsTab=function(){
  if(!team)return;
  draft=JSON.parse(JSON.stringify({...DEFAULT_SETTINGS,...(team.settings||{})}));
  draft.games=draft.games||[];draft.special=draft.special||[];
  $("#sSport").value=draft.sport||"basketball";$("#sSportHelp").hidden=true;
  $("#sSchool").value=draft.school||"";$("#sMascot").value=draft.mascot||"";$("#sLabel").value=draft.teamLabel||"";$("#sColor").value=draft.color||"#5b2a86";
  $("#sColor2").value=draft.color2||"#f2b705";$("#sUseC2").checked=!!draft.color2;renderLogoEdit();
  $("#sWdS").value=draft.weekdayStart||"";$("#sWdE").value=draft.weekdayEnd||"";$("#sWeS").value=draft.weekendStart||"";$("#sWeE").value=draft.weekendEnd||"";
  $("#sStart").value=draft.seasonStart||"";$("#sEnd").value=draft.seasonEnd||"";$("#sMinPr").value=draft.minPractices||"";
  document.querySelectorAll("#sDays input").forEach(x=>x.checked=(draft.practiceDays||[]).includes(+x.value));
  renderRows();updatePreview();$("#sStatus").textContent="";
  renderStaff();renderAccount();$("#importBox").innerHTML="";
  document.querySelectorAll("#view-settings .st-edit .acc-body :is(input,select,button)").forEach(el=>el.disabled=!canEdit(team));
  accSummaries();
};
function renderLogoEdit(){
  $("#sLogoPrev").innerHTML=draft.logo?`<img src="${draft.logo}" alt="Team logo">`:"No logo";
  $("#sLogoRm").hidden=!draft.logo;
}
/* Shrink an uploaded logo so it fits comfortably in the team's settings. */
function shrinkImage(file,max){
  return new Promise((res,rej)=>{const url=URL.createObjectURL(file),im=new Image();
    im.onload=()=>{URL.revokeObjectURL(url);const s=Math.min(1,max/Math.max(im.naturalWidth,im.naturalHeight));
      const c=document.createElement("canvas");c.width=Math.max(1,Math.round(im.naturalWidth*s));c.height=Math.max(1,Math.round(im.naturalHeight*s));
      c.getContext("2d").drawImage(im,0,0,c.width,c.height);
      let out=c.toDataURL("image/webp",.9);if(!out.startsWith("data:image/webp"))out=c.toDataURL("image/png");res(out);};
    im.onerror=()=>{URL.revokeObjectURL(url);rej(new Error("bad image"));};im.src=url;});
}
$("#sLogo").addEventListener("change",async e=>{
  const f=e.target.files[0];e.target.value="";if(!f)return;
  try{let out=await shrinkImage(f,256);if(out.length>150000)out=await shrinkImage(f,160);
    draft.logo=out;renderLogoEdit();$("#sStatus").textContent="Unsaved changes";}
  catch{$("#sStatus").textContent="That file couldn't be read as an image. Try a PNG or JPG.";}
});
$("#sLogoRm").addEventListener("click",()=>{draft.logo="";renderLogoEdit();$("#sStatus").textContent="Unsaved changes";});
const settingsView=$("#view-settings");
$("#sSport").addEventListener("change",()=>{$("#sSportHelp").hidden=$("#sSport").value===((team.settings||{}).sport||"basketball");});
settingsView.addEventListener("input",e=>{
  const row=e.target.closest(".row");
  if(row){const list=row.classList.contains("game")?draft.games:draft.special,item=list[+row.dataset.i],f=e.target.dataset.f;
    item[f]=f==="home"?e.target.value==="1":e.target.value;}
  if(e.target.closest(".st-edit"))$("#sStatus").textContent="Unsaved changes";
  updatePreview();
});
settingsView.addEventListener("change",e=>{if(e.target.matches("select[data-f]"))settingsView.dispatchEvent(new Event("input",{bubbles:true}));});
settingsView.addEventListener("click",e=>{
  const rm=e.target.closest("[data-rm]");
  if(rm){const row=rm.closest(".row");draft[rm.dataset.rm].splice(+row.dataset.i,1);renderRows();updatePreview();$("#sStatus").textContent="Unsaved changes";}
});
$("#sAddGame").addEventListener("click",()=>{draft.games.push({date:"",opponent:"",time:"",home:true});renderRows();$("#sStatus").textContent="Unsaved changes";$("#sGames .row:last-child input").focus();});
$("#sAddSpecial").addEventListener("click",()=>{draft.special.push({date:"",kind:"off",note:""});renderRows();$("#sSpecial .row:last-child input").focus();});
async function saveSettings(st){
  st.games=(st.games||[]).filter(g=>g.date).sort((a,b)=>a.date<b.date?-1:1);
  st.special=(st.special||[]).filter(x=>x.date).sort((a,b)=>a.date<b.date?-1:1);
  const name=[st.school,st.mascot].filter(Boolean).join(" ")||team.name;
  if(HOSTED){
    const {error}=await sb.from("teams").update({name,settings:st}).eq("id",team.id);
    if(error)throw error;
  }else{writeDemoTeams(readDemoTeams().map(t=>t.id===team.id?{...t,name,settings:st}:t));}
  const sportChanged=(team.settings||{}).sport!==st.sport;
  team.name=name;team.settings=st;teams=teams.map(t=>t.id===team.id?team:t);
  applySettings(st);renderSwitcher();
  if(sportChanged){play=blankPlay();fi=0;hist=[];pdirty=false;renderEditor();renderPlayLib();renderAllDrills();}
}
$("#sSave").addEventListener("click",async()=>{
  const st=readForm();$("#sStatus").textContent="Saving…";
  try{await saveSettings(st);$("#sStatus").textContent="Saved";window.onSettingsTab();$("#sStatus").textContent="Saved";}
  catch(err){$("#sStatus").textContent="Not saved: "+(err.message||"check your connection");}
});


/* ---------- coaching staff ---------- */
async function renderStaff(){
  const box=$("#staffBody");
  if(!HOSTED){box.innerHTML=`<p class="help">Staffs need sign-in, which is off in demo mode. Once the app is connected to Supabase, this is where you invite assistant coaches, give them titles and decide who can edit.</p>`;return;}
  await loadMembers();
  const owner=team.role==="owner";
  const codeRow=(label,code,kind,help)=>`<div class="coderow"><div><div class="eyebrow">${label}</div><span class="code">${esc(code||"—")}</span></div>
      <div class="actions" style="margin:0"><button class="btn" data-copycode="${esc(code||"")}">Copy</button>${owner?`<button class="btn" data-newcode="${kind}">New code</button>`:""}</div>
      <p class="help" style="flex-basis:100%">${help}</p></div>`;
  box.innerHTML=(team.role==="viewer"?"":
      codeRow("Staff code",team.join_code,"staff","Coaches who join with this code can edit plans, drills and plays.")+
      codeRow("View-only code",team.viewer_code,"viewer","For team managers, trainers or players: they can see and print plans and play through plays, but not change anything."))+
    `<ul class="members">${members.map(m=>{
      const me=m.user_id===user.id,name=esc(m.display_name||(m.email||"").split("@")[0]);
      const roleSel=owner?`<select data-role="${m.user_id}" aria-label="Role for ${name}">${["owner","coach","viewer"].map(r=>`<option value="${r}"${r===m.role?" selected":""}>${roleName(r)}</option>`).join("")}</select>`:`<span class="role">${roleName(m.role)}</span>`;
      const title=owner?`<input data-title="${m.user_id}" value="${esc(m.title||"")}" placeholder="Title (e.g. JV Coach)" aria-label="Title for ${name}">`:`<span class="mtitle">${esc(m.title||"")}</span>`;
      const rm=owner&&!me?`<button class="icon" data-remove="${m.user_id}" aria-label="Remove ${name}">✕</button>`:"";
      return `<li class="member"><div class="who"><b>${name}${me?" (you)":""}</b><small>${esc(m.email||"")}</small></div>${title}${roleSel}${rm}</li>`;}).join("")}</ul>
    <div class="msg" id="staffMsg"></div>
    <div class="actions" style="margin:0"><button class="btn danger" id="leaveTeam">Leave this team</button></div>`;
}
$("#staffBody").addEventListener("click",async e=>{
  const c=e.target.closest("[data-copycode]");
  if(c){try{await navigator.clipboard.writeText(c.dataset.copycode);c.textContent="Copied";}catch{c.textContent=c.dataset.copycode;}setTimeout(()=>c.textContent="Copy",2000);return;}
  const n=e.target.closest("[data-newcode]");
  if(n){
    if(n.dataset.armed!=="1"){n.dataset.armed="1";n.textContent="Old code stops working. Tap again";return;}
    const {data,error}=await sb.rpc("new_join_code",{p_team:team.id,p_kind:n.dataset.newcode});
    if(error){msg($("#staffMsg"),error.message,"err");return;}
    if(n.dataset.newcode==="viewer")team.viewer_code=data;else team.join_code=data;renderStaff();return;
  }
  const r=e.target.closest("[data-remove]");
  if(r){
    if(r.dataset.armed!=="1"){r.dataset.armed="1";r.textContent="Remove?";r.classList.add("danger");return;}
    const {error}=await sb.rpc("remove_member",{p_team:team.id,p_user:r.dataset.remove});
    if(error)msg($("#staffMsg"),error.message,"err");else renderStaff();return;
  }
  if(e.target.id==="leaveTeam"){
    const b=e.target;if(b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent="Tap again to leave "+team.name;return;}
    const {error}=await sb.rpc("remove_member",{p_team:team.id,p_user:user.id});
    if(error){msg($("#staffMsg"),error.message,"err");return;}
    await loadTeams();if(teams.length){openTeam(teams[0]);setTab("plan");}else showSetup(false);
  }
});
$("#staffBody").addEventListener("change",async e=>{
  const sel=e.target.closest("[data-role]"),ti=e.target.closest("[data-title]");
  if(!sel&&!ti)return;
  const args=sel?{p_team:team.id,p_user:sel.dataset.role,p_role:sel.value,p_title:null}:{p_team:team.id,p_user:ti.dataset.title,p_role:null,p_title:ti.value};
  const {error}=await sb.rpc("set_member",args);
  if(error){msg($("#staffMsg"),error.message,"err");renderStaff();return;}
  msg($("#staffMsg"),"Saved","ok");
  if(sel&&sel.dataset.role===user.id){await loadTeams();team=teams.find(t=>t.id===team.id)||team;openTeam(team);}
});

/* ---------- account ---------- */
function renderAccount(){
  const box=$("#accountBody");
  box.innerHTML=(HOSTED?`<p class="help">Signed in as <b>${esc(user.email||"")}</b>.</p>`:`<p class="help">Demo mode: no account needed.</p>`)+
    `<form id="nameForm" class="actions" style="margin:0;align-items:end"><label class="f" style="flex:1 1 200px">Your name (shown to your staff)<input id="myName" value="${esc(ME.name||"")}"></label><button class="btn" type="submit">Save name</button></form><div class="msg" id="nameMsg"></div>`+
    (HOSTED?`<form id="pwSetForm" class="actions" style="margin:0;align-items:end"><input type="email" autocomplete="username" value="${esc(user.email||"")}" hidden aria-hidden="true"><label class="f" style="flex:1 1 200px">Change password<input id="newPw" type="password" autocomplete="new-password" minlength="8" placeholder="At least 8 characters"></label><button class="btn" type="submit">Set password</button></form><div class="msg" id="pwMsg"></div>`:"")+
    `<div class="actions" style="margin-top:0">${HOSTED?`<button class="btn danger" id="signOut">Sign out</button>`:`<button class="btn danger" id="resetDemo">Erase demo data</button>`}</div>`;
  $("#nameForm").addEventListener("submit",async e=>{
    e.preventDefault();const v=$("#myName").value.trim();if(!v)return;
    if(HOSTED){
      const {error}=await sb.rpc("update_my_name",{p_name:v});
      if(error){msg($("#nameMsg"),error.message,"err");return;}
      sb.auth.updateUser({data:{full_name:v}}).catch(()=>{});
    }else{try{localStorage.setItem("cpp:demoName",v);}catch{}}
    ME.name=v;await loadMembers();STAFF=members.filter(m=>m.role!=="viewer").map(m=>m.display_name).filter(Boolean);
    msg($("#nameMsg"),"Saved","ok");renderStaff();if(cur)renderPlan();window.onViewChange();
  });
  if(HOSTED)$("#signOut").addEventListener("click",async()=>{await sb.auth.signOut();});
  if(HOSTED)$("#pwSetForm").addEventListener("submit",async e=>{
    e.preventDefault();const v=$("#newPw").value;
    if(v.length<8){msg($("#pwMsg"),"Use at least 8 characters.","err");return;}
    msg($("#pwMsg"),"Saving…");
    const {error}=await sb.auth.updateUser({password:v});
    if(error){msg($("#pwMsg"),/reauth|recent/i.test(error.message)?"For safety, sign out, sign back in, then change the password right away.":error.message,"err");return;}
    $("#newPw").value="";msg($("#pwMsg"),`Password saved. Sign in anywhere with ${user.email} and this password.`,"ok");
  });
  else $("#resetDemo").addEventListener("click",e=>{
    if(e.target.dataset.armed!=="1"){e.target.dataset.armed="1";e.target.textContent="Tap again to erase every demo team";return;}
    Object.keys(localStorage).filter(k=>k.startsWith("cpp:")).forEach(k=>localStorage.removeItem(k));location.reload();
  });
}

/* ---------- copy to another team ---------- */
let copyJob=null;
window.openCopy=function(kind,id){
  const targets=teams.filter(t=>t.id!==team.id&&canEdit(t));
  const dlg=$("#copyDlg");msg($("#copyMsg"),"");
  let item,label;
  if(kind==="plans"){item=cur;label=`the practice plan for ${dLabel(cur.date)}`;}
  else if(kind==="drills"){item=drills.find(d=>d.id===id);label=item&&`the drill "${item.name}"`;}
  else{item=plays.find(p=>p.id===id);label=item&&`the play "${item.name}"`;}
  if(!item)return;
  copyJob={kind,item:JSON.parse(JSON.stringify(item))};
  const sameSport=t=>((t.settings||{}).sport||"basketball")===SPORT;
  $("#copyWhat").textContent=targets.length?`Copy ${label} to another team you coach.`+(kind==="plays"?" Plays can only go to teams with the same sport.":""):
    "You don't coach any other teams yet. Create or join one from the team menu at the top.";
  $("#copyTeam").innerHTML=targets.map(t=>`<option value="${t.id}"${kind==="plays"&&!sameSport(t)?" disabled":""}>${esc(t.name)} (${esc(sportName(t))})</option>`).join("");
  const first=targets.find(t=>kind!=="plays"||sameSport(t));if(first)$("#copyTeam").value=first.id;
  $("#copyTeam").disabled=$("#copyGo").disabled=!first;
  $("#copyDateRow").hidden=kind!=="plans";$("#copyDate").value=cur?cur.date:"";
  $("#copyGo").textContent="Copy";
  dlg.showModal();
};
$("#copyGo").addEventListener("click",async e=>{
  e.preventDefault();if(!copyJob)return;
  const target=teams.find(t=>t.id===$("#copyTeam").value);if(!target)return;
  const {kind}=copyJob;const data={...copyJob.item};delete data.id;
  data.editedBy=ME.name;data.copiedFrom=team.name;
  let id;
  if(kind==="plans"){id=$("#copyDate").value;if(!id){msg($("#copyMsg"),"Pick a practice date.","err");return;}data.date=id;data.editedAt=Date.now();}
  else id=uid()+uid();
  msg($("#copyMsg"),"Copying…");
  try{
    if(HOSTED){
      const {error}=await sb.from("items").upsert({team_id:target.id,kind,id,data,updated_at:new Date().toISOString(),updated_by:user.id});
      if(error)throw error;
    }else{const s2=localStore(target.id);await s2.bulkSet(kind,[[id,data]]);s2.close();}
    msg($("#copyMsg"),`Copied to ${target.name}.`+(kind==="plans"?" It replaces any plan that team had on that date.":""),"ok");
    $("#copyGo").textContent="Copy again";
  }catch(err){msg($("#copyMsg"),"Couldn't copy: "+(err.message||"check your connection"),"err");}
});
$("#copyCancel").addEventListener("click",e=>{e.preventDefault();$("#copyDlg").close();});

/* ---------- share plays with players ---------- */
const playbookURL=q=>new URL("playbook.html"+q,location.href).href;
function shareLinkFor(id){return playbookURL("?pb="+encodeURIComponent(id));}
/* 10 letters/digits: short enough to text, about 60 bits so links can't be guessed. */
function randomId(){const A="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789",b=new Uint8Array(10);crypto.getRandomValues(b);return [...b].map(x=>A[x%A.length]).join("");}
/* Inside the Claude preview there is no web address players could open. */
const IN_PREVIEW=!!(window.claude&&window.claude.use);
async function renderShareLinks(){
  const box=$("#shareExisting");
  if(!HOSTED){box.innerHTML="";return;}
  const {data,error}=await sb.from("playbooks").select("id,title,play_ids,active,views,created_at").eq("team_id",team.id).order("created_at",{ascending:false});
  if(error||!data||!data.length){box.innerHTML="";return;}
  box.innerHTML=`<h3 style="font-size:16px;text-transform:uppercase;color:var(--muted);margin:6px 0">Your player links</h3><ul class="links">`+data.map(l=>`<li class="${l.active?"":"off"}"><span><b>${esc(l.title)}</b><small>${l.play_ids?l.play_ids.length+" plays":"All plays"} · opened ${l.views} time${l.views===1?"":"s"}${l.active?"":" · turned off"}</small></span>
    <span class="actions" style="margin:0">${l.active?`<button class="btn" type="button" data-linkcopy="${esc(l.id)}">Copy</button><button class="btn danger" type="button" data-linkoff="${esc(l.id)}">Turn off</button>`:`<button class="btn" type="button" data-linkon="${esc(l.id)}">Turn on</button>`}</span></li>`).join("")+`</ul>`;
}
$("#shareBook").addEventListener("click",()=>{
  if(!plays.length){pflash("Save a play first, then share it.");return;}
  $("#shareName").value=`${SETTINGS.mascot||team.name} Playbook`;
  $("#sharePlays").innerHTML=[...plays].sort((a,b)=>(a.type||"").localeCompare(b.type||"")||a.name.localeCompare(b.name))
    .map(p=>`<label><input type="checkbox" value="${esc(p.id)}" checked> <span>${esc(p.name)} <small>${esc(p.type||"")}</small></span></label>`).join("");
  $("#shareMake").textContent=IN_PREVIEW&&!HOSTED?"Preview player view":"Create player link";
  $("#shareHelp").textContent=IN_PREVIEW&&!HOSTED?
    "You're in the Claude preview, which has no web address your players could open, so it can't make player links. Tap Preview player view to see exactly what players will get. Real, short player links work once the app is hosted (Netlify) and connected to Supabase.":
    HOSTED?
    "Players open the link on any phone with no account. They see only these plays, never your practice plans, drills or staff. Changes you make to these plays show up for them automatically, and you can turn a link off anytime.":
    "Players open the link on any phone with no account, and see only these plays. Demo mode has no server, so the plays are packed into the link itself. That makes the link long, and edits you make later won't show. Connect Supabase (see the README) for short links that stay up to date.";
  $("#shareResult").hidden=true;msg($("#shareMsg"),"");$("#shareMake").disabled=false;
  $("#shareSend").hidden=!navigator.share;
  renderShareLinks();
  $("#shareDlg").showModal();
});
$("#shareAll").addEventListener("click",()=>document.querySelectorAll("#sharePlays input").forEach(x=>x.checked=true));
$("#shareNone").addEventListener("click",()=>document.querySelectorAll("#sharePlays input").forEach(x=>x.checked=false));
$("#shareMake").addEventListener("click",async()=>{
  const ids=[...document.querySelectorAll("#sharePlays input:checked")].map(x=>x.value);
  if(!ids.length){msg($("#shareMsg"),"Pick at least one play.","err");return;}
  const title=$("#shareName").value.trim()||"Playbook";
  msg($("#shareMsg"),"Creating link…");
  let link;
  try{
    if(HOSTED){
      const id=randomId(),all=ids.length===plays.length;
      const {error}=await sb.from("playbooks").insert({id,team_id:team.id,title,play_ids:all?null:ids});
      if(error)throw error;
      link=shareLinkFor(id);renderShareLinks();
    }else{
      const chosen=plays.filter(p=>ids.includes(p.id)),payload=playbookPayload(title,team,chosen);
      if(IN_PREVIEW){
        try{localStorage.setItem("cpp:previewBook",JSON.stringify({...payload,team:{...payload.team,logo:(team.settings||{}).logo||""}}));}catch{}
        $("#shareDlg").close();location.href="playbook.html?preview=1";return;
      }
      link=playbookURL("#"+await packPlaybook(payload));
    }
  }catch(err){msg($("#shareMsg"),"Couldn't create the link: "+(err.message||"check your connection"),"err");return;}
  $("#shareLink").value=link;$("#shareOpen").href=link;$("#shareResult").hidden=false;
  msg($("#shareMsg"),HOSTED?"Link ready. Send it to your players.":`Link ready, but long (${link.length.toLocaleString()} characters) because demo mode has no server. Email works best.`,"ok");
});
$("#shareCopy").addEventListener("click",async e=>{
  const v=$("#shareLink").value;
  try{await navigator.clipboard.writeText(v);e.target.textContent="Copied";}catch{$("#shareLink").select();e.target.textContent="Press and hold to copy";}
  setTimeout(()=>e.target.textContent="Copy link",2000);
});
$("#shareSend").addEventListener("click",()=>{navigator.share({title:$("#shareName").value||"Playbook",text:"Our team plays:",url:$("#shareLink").value}).catch(()=>{});});
$("#shareExisting").addEventListener("click",async e=>{
  const c=e.target.closest("[data-linkcopy]"),off=e.target.closest("[data-linkoff]"),on=e.target.closest("[data-linkon]");
  if(c){try{await navigator.clipboard.writeText(shareLinkFor(c.dataset.linkcopy));c.textContent="Copied";}catch{c.textContent="Copy failed";}return;}
  if(off&&off.dataset.armed!=="1"){off.dataset.armed="1";off.textContent="Tap again: players lose access";return;}
  const id=(off||on)&&(off||on).dataset[off?"linkoff":"linkon"];if(!id)return;
  const {error}=await sb.from("playbooks").update({active:!!on}).eq("id",id);
  if(error)msg($("#shareMsg"),error.message,"err");else renderShareLinks();
});
$("#shareClose").addEventListener("click",e=>{e.preventDefault();$("#shareDlg").close();});

/* ---------- backups ---------- */
$("#sExport").addEventListener("click",()=>{
  const data={format:"practice-planner-backup",version:1,exportedAt:new Date().toISOString(),team:team.name,settings:team.settings,
    drills:drills.map(d=>({...d})),plays:plays.map(p=>({...p})),plans:Object.values(plans)};
  const slug=(team.name||"team").toLowerCase().replace(/[^a-z0-9]+/g,"-");
  saveFile(`${slug}-backup-${todayISO()}.json`,JSON.stringify(data,null,1));
});
$("#sImport").addEventListener("change",async e=>{
  const f=e.target.files[0];e.target.value="";if(!f)return;
  const box=$("#importBox");let data;
  try{data=JSON.parse(await f.text());}catch{box.innerHTML=`<p class="msg err">That file isn't a planner backup.</p>`;return;}
  if(data.format!=="practice-planner-backup"){box.innerHTML=`<p class="msg err">That file isn't a planner backup.</p>`;return;}
  const n={drills:(data.drills||[]).length,plays:(data.plays||[]).length,plans:(data.plans||[]).length};
  box.innerHTML=`<p class="help">This backup has <b>${n.drills}</b> drills, <b>${n.plays}</b> plays and <b>${n.plans}</b> practice plans. Items with the same ID or practice date will be replaced; everything else stays.</p>
    ${data.settings?`<label class="f" style="flex-direction:row;align-items:center;gap:8px;text-transform:none;letter-spacing:0;font-size:14px;font-weight:500;color:var(--ink)"><input type="checkbox" id="impSettings" style="width:auto"> Also use this backup's team settings (sport, name, colors, season, games)</label>`:""}
    <div class="actions" style="margin-top:0"><button class="btn primary" id="impGo">Import</button><button class="btn" id="impCancel">Cancel</button></div><div class="msg" id="impMsg"></div>`;
  $("#impCancel").addEventListener("click",()=>box.innerHTML="");
  $("#impGo").addEventListener("click",async ev=>{
    ev.target.disabled=true;msg($("#impMsg"),"Importing…");
    try{
      const strip=o=>{const {id,...rest}=o;return rest;};
      if(n.drills)await store.bulkSet("drills",data.drills.map(d=>[d.id,strip(d)]));
      if(n.plays)await store.bulkSet("plays",data.plays.map(p=>[p.id,strip(p)]));
      if(n.plans)await store.bulkSet("plans",data.plans.filter(p=>p.date).map(p=>[p.date,p]));
      const useSettings=data.settings&&$("#impSettings")&&$("#impSettings").checked;
      if(useSettings){await saveSettings({...DEFAULT_SETTINGS,...(team.settings||{}),...data.settings});window.onSettingsTab();}
      box.innerHTML=`<p class="msg ok" id="impMsg">Imported ${n.drills} drills, ${n.plays} plays and ${n.plans} plans${useSettings?", plus the team settings":""}.</p>`;
    }catch(err){msg($("#impMsg"),"Import stopped: "+(err.message||"check your connection"),"err");ev.target.disabled=false;}
  });
});

/* ---------- offline support ---------- */
if("serviceWorker" in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("sw.js").catch(()=>{});

init().catch(err=>{show("screen-auth");msg($("#authMsg"),"Something went wrong starting the app: "+err.message,"err");});
