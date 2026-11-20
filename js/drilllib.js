/* The Extra Coach drill library: proven basketball drills, written for coaches.
   Categories: Individual (one player, one ball), Skill (partners and small groups) and Team (the whole roster).
   25 of them have an animated version (sim) that plays in js/drillsim.js.
   Court spots are in feet with the basket at (5.25, 25): x runs from the baseline (0) to half court (47)
   and on to the far baseline (94); y runs sideline (0) to sideline (50). In the half-court picture the
   basket is at the top, so y = 0 is the left side of the screen and y = 50 the right. */
(function(){
const B=[5.25,25],RB=[88.75,25];
const PI=Math.PI;

/* ===================== INDIVIDUAL ===================== */

const mikan={court:"half",
  cast:[{id:"a",t:"o",x:6.6,y:28.6,f:PI}],balls:[{id:"b",on:"a"}],
  beats:[
    {cap:"Right-hand layup off the left foot, using the backboard on the right side of the rim.",acts:[
      {shot:"a",kind:"layup",reb:"a"},{m:"a",to:[6.6,21.4],at:380,t:700,face:B}],hold:120},
    {cap:"Catch it out of the net above your head. Never let it hit the floor.",acts:[],hold:250},
    {cap:"Step across and finish left-handed off the right foot. Keep the ball high the whole time.",acts:[
      {shot:"a",kind:"layup",reb:"a"},{m:"a",to:[6.6,28.6],at:380,t:700,face:B}],hold:120},
    {cap:"Keep the rhythm: right, left, right, left. Go for 30 seconds or 10 makes in a row.",acts:[],hold:250}]};

const form={court:"half",
  cast:[{id:"a",t:"o",x:11,y:25,f:PI},{id:"p",t:"o",x:5.6,y:29.6,f:0}],balls:[{id:"b",on:"a"}],
  beats:[
    {cap:"One hand, ball on the finger pads, elbow under the ball. Shoot it straight up and in.",acts:[{shot:"a",kind:"set",reb:"p"}],hold:350},
    {cap:"Hold the follow-through until the ball hits the net. Partner rebounds and passes back.",acts:[{m:"a",to:[10,20.5],t:800,face:B},{pass:"p",to:"a",at:250}],hold:200},
    {cap:"Square your feet and shoulders to the rim from every spot.",acts:[{shot:"a",kind:"set",reb:"p"}],hold:350},
    {cap:"Next spot. Same shot, same rhythm every time.",acts:[{m:"a",to:[10,29.5],t:900,face:B},{pass:"p",to:"a",at:250}],hold:200},
    {cap:"Make five in a row from each spot before you take a step back.",acts:[{shot:"a",kind:"set",reb:"p"}],hold:350},
    {cap:"Back to the middle and start again.",acts:[{m:"a",to:[11,25],t:800,face:B},{pass:"p",to:"a",at:250}],hold:200}]};

const coneWeave={court:"half",
  cast:[{id:"a",t:"o",x:45,y:25,f:PI},{id:"k1",t:"cone",x:40,y:25},{id:"k2",t:"cone",x:34,y:25},{id:"k3",t:"cone",x:28,y:25},{id:"k4",t:"cone",x:22,y:25}],
  balls:[{id:"b",on:"a"}],
  beats:[
    {cap:"Weave the cones. Ball in the outside hand, away from the cone. Cross over at every cone.",acts:[
      {m:"a",path:[[42.5,23],[40,21.6],[37,25],[34,28.4],[31,25],[28,21.6],[25,25],[22,28.4],[19,26.5]],to:[15,28],cross:true,t:5400}],hold:0},
    {cap:"Burst out of the last cone and finish with a right-hand layup.",acts:[{m:"a",to:[8.4,29.2],t:900,hand:"R"}],hold:0},
    {cap:"Rebound, then speed dribble back up the sideline and go again.",acts:[{shot:"a",kind:"layup",reb:"a"},{m:"a",at:900,path:[[14,40],[30,42]],to:[45,25],t:3200,hand:"R",quiet:true}],hold:300}]};

const speedDribble={court:"full",
  cast:[{id:"a",t:"o",x:3,y:43,f:0}],balls:[{id:"b",on:"a"}],
  beats:[
    {cap:"Push the ball out in front and sprint. Right hand, three or four dribbles to half court.",acts:[{m:"a",path:[[30,41],[60,39],[78,34.5]],to:[84.4,30.4],pace:"run",hand:"R"}],hold:0},
    {cap:"Right-hand layup at full speed: high off the glass, soft touch.",acts:[{shot:"a",kind:"layup",reb:"a"},{m:"a",to:[86.5,25],at:300,t:600,face:RB}],hold:100},
    {cap:"Come back left-handed down the other side.",acts:[{m:"a",path:[[80,12],[50,10],[20,13]],to:[9.6,19.8],pace:"run",hand:"L"}],hold:0},
    {cap:"Left-hand layup off the right foot.",acts:[{shot:"a",kind:"layup",reb:"a"},{m:"a",to:[5.5,23.5],at:300,t:600,face:B}],hold:100},
    {cap:"Out to the corner and go again. Count your dribbles and try to use fewer each trip.",acts:[{m:"a",to:[3,43],t:1500,quiet:true,hand:"R"}],hold:300}]};

const aroundWorld={court:"half",
  cast:[{id:"a",t:"o",x:6,y:40,f:PI},{id:"r",t:"o",x:7.2,y:23.2,f:0}],balls:[{id:"b",on:"a"}],
  beats:(()=>{const spots=[[6,40],[13,38],[19,25],[13,12],[6,10]],caps=["Right baseline. Bank it or swish it, but square up first.","Right wing.","Free-throw line.","Left wing.","Left baseline. Make it to finish the trip, then go back around."];
    const b=[];spots.forEach((s,i)=>{b.push({cap:caps[i],acts:[{shot:"a",reb:"r"}],hold:300});
      const n=spots[(i+1)%spots.length];b.push({cap:i<4?"Partner passes to the next spot.":"Jog back to the first spot.",acts:[{m:"a",path:i<4?[]:[[14,25]],to:n,t:i<4?950:1900,face:B,quiet:i===4},{pass:"r",to:"a",at:i<4?250:1300}],hold:200});});return b;})()};

/* ===================== SKILL ===================== */

const partnerPass={court:"half",
  cast:[{id:"a",t:"o",x:14,y:17,f:PI/2},{id:"b",t:"o",x:14,y:31,f:-PI/2},{id:"c",t:"o",x:30,y:17,f:PI/2},{id:"d",t:"o",x:30,y:31,f:-PI/2}],
  balls:[{id:"b1",on:"a"},{id:"b2",on:"c"}],
  beats:(()=>{const b=[],kinds=[["chest","Chest pass: step toward your partner, thumbs down on the follow-through."],["chest","Hit your partner's target hand, chest high."],["bounce","Bounce pass: the ball hits the floor two-thirds of the way there."],["bounce","Catch with two hands, then pass right back."],["over","Overhead pass: ball above the forehead, snap it with your wrists."],["over","Catch it high and keep it high."]];
    kinds.forEach(([k,cap],i)=>{const [p1,q1,p2,q2]=i%2?["b","a","d","c"]:["a","b","c","d"];
      const yy=i%2?31:17,dy=i%2?-1.4:1.4;
      const step=(id,x)=>({m:id,path:[[x,yy+dy]],to:[x,yy],t:620,quiet:true,nob:true});
      b.push({cap,acts:[step(p1,14),step(p2,30),{pass:p1,to:q1,at:200,kind:k},{pass:p2,to:q2,at:200,kind:k}],hold:250});});return b;})()};

const giveGo={court:"half",
  cast:[{id:"t1",t:"o",x:29,y:25,f:PI},{id:"t2",t:"o",x:32.5,y:25,f:PI},{id:"t3",t:"o",x:36,y:25,f:PI},{id:"w1",t:"o",x:17,y:44.5,f:-PI/2},{id:"w2",t:"o",x:20.5,y:47.5,f:-PI/2}],
  balls:[{id:"b",on:"t1"}],
  beats:[
    {cap:"Pass to the wing and show your hands.",acts:[{pass:"t1",to:"w1"}],hold:150},
    {cap:"Take a jab step away to set it up…",acts:[{m:"t1",to:[27.5,21.2],t:420,face:B}],hold:60},
    {cap:"…then plant and cut hard to the rim. The wing hits you with a bounce pass on the way.",acts:[{m:"t1",path:[[19,27.5]],to:[8.6,28.6],pace:"sprint"},{pass:"w1",to:"t1",at:650,kind:"bounce"}],hold:0},
    {cap:"Finish the layup and get your own rebound.",acts:[{shot:"t1",kind:"layup",reb:"t1"},{m:"t1",to:[6.5,24.5],at:300,t:500}],hold:150},
    {cap:"Rotate: the cutter outlets to the next player and goes to the wing line; the wing goes to the top line.",acts:[
      {m:"t2",to:[29,25],t:700,quiet:true},{m:"t3",to:[32.5,25],t:700,quiet:true},
      {pass:"t1",to:"t2",at:450},
      {m:"t1",path:[[12,40]],to:[20.5,47.5],at:600,t:1700,quiet:true},
      {m:"w1",path:[[26,36]],to:[36,25],t:1900,quiet:true},
      {m:"w2",to:[17,44.5],at:400,t:800,quiet:true}],hold:250}]};

const closeout={court:"half",
  cast:[{id:"d",t:"d",x:6.5,y:23,f:0},{id:"o",t:"o",x:17,y:44.5,f:-PI/2}],balls:[{id:"b",on:"d"}],
  beats:[
    {cap:"Defender passes out to the wing and sprints at the ball.",acts:[{pass:"d",to:"o"},{m:"d",to:[12.8,36],at:150,pace:"sprint",face:"o"}],hold:0},
    {cap:"Chop your feet the last few steps: butt down, one hand high to take away the shot.",acts:[{m:"d",to:[15.6,41],pace:"slide",t:650,face:"o"}],hold:150},
    {cap:"Offense shot fakes…",acts:[{m:"o",path:[[16.2,44.2]],to:[17,44.5],t:520,quiet:true,nob:true}],hold:100},
    {cap:"…and drives baseline. Slide and cut him off before the baseline. No layup.",acts:[{m:"o",path:[[13,47]],to:[9.5,47.2],t:1000,hand:"R"},{m:"d",to:[9.4,44],pace:"slide",t:1000,at:120,face:"o"}],hold:250},
    {cap:"Offense kicks it back. Reset and switch roles.",acts:[{pass:"o",to:"d",at:200,kind:"hand"},{m:"o",to:[17,44.5],at:500,t:1300,quiet:true},{m:"d",to:[6.5,23],at:500,t:2000,quiet:true,face:"o"}],hold:300}]};

const boxOut={court:"half",
  cast:[{id:"c",t:"c",x:19,y:25,f:PI},{id:"o",t:"o",x:13.6,y:34.2,f:PI},{id:"d",t:"d",x:10.4,y:31,f:0.8}],balls:[{id:"b",on:"c"}],
  beats:[
    {cap:"Defender stands between his man and the basket. Coach shoots.",acts:[{shot:"c",miss:true,missTo:[8.2,29.8],t:1250},{m:"d",to:[12,32.6],at:150,t:420,face:"o"}],hold:0},
    {cap:"See your man, step into him, then reverse pivot: back into his chest, butt low, elbows wide.",acts:[{m:"d",to:[11.7,32.3],t:500,face:[-3,20],quiet:true},{m:"o",path:[[13.4,31.8]],to:[12.9,30],t:900},{m:"d",to:[11,30.6],at:300,t:700,pace:"slide",face:[2,18]}],hold:0},
    {cap:"Hold the box out until the ball hits the floor, then go get it with two hands.",acts:[{m:"d",to:[8.8,29.8],t:520,face:[8.2,29.8]},{take:"d",ball:"b",at:520}],hold:250},
    {cap:"Chin it, pivot and outlet to the coach. Reset.",acts:[{pass:"d",to:"c",at:150},{m:"d",to:[10.4,31],at:500,t:1000,quiet:true},{m:"o",to:[13.6,34.2],at:300,t:1000,quiet:true}],hold:400}]};

const oneOnOne={court:"half",
  cast:[{id:"c",t:"c",x:29,y:25,f:PI},{id:"o",t:"o",x:19,y:43.5,f:PI},{id:"d",t:"d",x:14.5,y:37,f:0.6}],balls:[{id:"b",on:"c"}],
  beats:[
    {cap:"V-cut: walk him in, then plant and pop out to the wing.",acts:[{m:"o",path:[[12.5,41.5]],to:[17.5,44.6],t:1250},{m:"d",to:[14.6,41.4],t:1250,pace:"slide",face:"o"}],hold:0},
    {cap:"Coach passes. Defender closes out under control.",acts:[{pass:"c",to:"o"},{m:"d",to:[15.2,42.4],t:500,pace:"slide",face:"o"}],hold:150},
    {cap:"Jab at the defense to see how he reacts…",acts:[{m:"o",path:[[16.8,43.2]],to:[17.5,44.6],t:520,quiet:true,nob:true}],hold:80},
    {cap:"…then attack the top foot and drive baseline.",acts:[{m:"o",path:[[13,47],[8.5,40]],to:[7.6,31.2],t:1500,hand:"R"},{m:"d",path:[[12,45]],to:[9.2,37],t:1500,pace:"slide",at:150,face:"o"}],hold:0},
    {cap:"Finish through contact. Defender rebounds and outlets to the coach.",acts:[{shot:"o",kind:"layup",reb:"d"},{m:"d",to:[7,30],t:500}],hold:100},
    {cap:"Reset and switch: offense becomes defense.",acts:[{pass:"d",to:"c",at:100},{m:"o",to:[19,43.5],at:300,t:1300,quiet:true},{m:"d",to:[14.5,37],at:400,t:1400,quiet:true}],hold:300}]};

const pnr={court:"half",
  cast:[{id:"o1",t:"o",n:1,x:30,y:25,f:PI},{id:"d1",t:"d",n:1,x:25.8,y:25.4,f:0},{id:"o5",t:"o",n:5,x:19,y:32,f:PI},{id:"d5",t:"d",n:5,x:15.5,y:30.5,f:0.3}],
  balls:[{id:"b",on:"o1"}],
  beats:[
    {cap:"5 sprints up and sets a ball screen on 1's defender, on his right hip.",acts:[{m:"o5",to:[25.6,28.6],t:1000,screen:true,face:[30,20]},{m:"d5",to:[19.5,30],t:1000,pace:"slide",face:"o1"},{dr:"o1",t:1000}],hold:0},
    {cap:"1 sets him up, then comes off shoulder to shoulder, attacking the paint.",acts:[{m:"o1",path:[[26.5,32.5]],to:[20.5,36],t:1300,hand:"R"},{m:"d1",path:[[28.4,30.2]],to:[23.2,35],t:1300,at:300,pace:"run",face:"o1"},{m:"d5",to:[21.6,31.8],t:600,pace:"slide",face:"o1"}],hold:0},
    {cap:"5 rolls hard to the rim while his defender is helping on the ball.",acts:[{m:"o5",path:[[20,27.5]],to:[9.6,27.6],t:1250,face:B},{m:"d5",to:[15,30],at:250,t:1100,pace:"run"},{dr:"o1",t:600}],hold:0},
    {cap:"1 hits the roll man with a bounce pass. 5 finishes before the help gets there.",acts:[{pass:"o1",to:"o5",kind:"bounce"},{m:"d5",to:[10.5,28.8],at:200,t:600,pace:"run"}],hold:0},
    {cap:"Layup. Reset and run it from the other side.",acts:[{shot:"o5",kind:"layup",reb:"d5"},{m:"d5",to:[7,26],t:600}],hold:600}]};

const postDrop={court:"half",
  cast:[{id:"w",t:"o",n:2,x:17,y:44.5,f:-PI/2},{id:"p",t:"o",n:5,x:8.6,y:33.4,f:0.95},{id:"d",t:"d",n:5,x:9.9,y:31.4,f:0.6}],balls:[{id:"b",on:"w"}],
  beats:[
    {cap:"Post seals the defender on his back: wide base, low, target hand up away from the defense.",acts:[{m:"p",to:[8.4,33.5],t:400,face:"w",quiet:true},{m:"d",to:[9.8,32.2],t:400,face:"w",quiet:true}],hold:200},
    {cap:"Wing feeds the post with a bounce pass to the target hand.",acts:[{pass:"w",to:"p",kind:"bounce"}],hold:200},
    {cap:"Feel the defender on the high side, so drop step to the baseline with one power dribble.",acts:[{m:"p",path:[[6.8,33.2]],to:[6,30.6],t:750,face:B}],hold:0},
    {cap:"Two-foot power layup, chin the ball, go up strong.",acts:[{shot:"p",kind:"layup",reb:"d"},{m:"d",to:[7.2,29],t:500}],hold:150},
    {cap:"Defender outlets to the wing. Reset.",acts:[{pass:"d",to:"w",at:150},{m:"p",to:[8.6,33.4],at:450,t:900,quiet:true,face:"w"},{m:"d",to:[9.9,31.4],at:450,t:900,quiet:true,face:"w"}],hold:400}]};

const chaseDown={court:"full",
  cast:[{id:"o",t:"o",x:19,y:41,f:0},{id:"d",t:"d",x:6,y:44,f:0}],balls:[{id:"b",on:"o"}],
  beats:[
    {cap:"On the whistle the offense speed dribbles for a layup. The defender sprints after him.",acts:[{m:"o",path:[[50,38],[75,34]],to:[84.4,30.4],t:5000,hand:"R",pace:"run"},{m:"d",path:[[50,40.5],[75,35.5]],to:[82.6,31.6],t:5000,pace:"sprint"}],hold:0},
    {cap:"Finish high off the glass. Defender: contest from behind, hands up, no fouls.",acts:[{shot:"o",kind:"layup",reb:"d"},{m:"d",to:[84.6,27.5],t:500}],hold:200},
    {cap:"Jog back and switch roles.",acts:[{pass:"d",to:"o",at:100,kind:"hand"},{m:"o",to:[19,41],at:500,t:4200,quiet:true},{m:"d",to:[6,44],at:300,t:4200,quiet:true}],hold:300}]};

const zigzag={court:"full",
  cast:[{id:"o",t:"o",x:3,y:9,f:0},{id:"d",t:"d",x:7,y:9,f:PI}],balls:[{id:"b",on:"o"}],
  beats:(()=>{const pts=[[12,3.5],[22,15.5],[32,3.5],[42,15.5],[52,3.5],[62,15.5],[72,3.5],[82,15.5]];
    return [
    {cap:"Offense zigzags up the court in the lane-to-sideline channel, changing direction with a crossover.",acts:[
      {m:"o",path:pts,to:[89,9],t:13000,cross:true,lin:true},
      {m:"d",path:pts.map(([x,y])=>[x+4,y]),to:[91.2,9],t:13000,pace:"back",face:"o",lin:true}],hold:200},
    {cap:"Defender: open the gate with a drop step, slide, and beat him to every spot. Jog back and switch.",acts:[{pass:"o",to:"d"},{m:"o",to:[3,9],at:400,t:4500,quiet:true},{m:"d",to:[7,9],at:300,t:4600,quiet:true,face:[0,9]},{pass:"d",to:"o",at:4300}],hold:300}];})()};

const catchShoot={court:"half",
  cast:[{id:"a",t:"o",x:13,y:9,f:-PI/2},{id:"p",t:"o",x:7.2,y:25,f:0}],balls:[{id:"b",on:"p"}],
  beats:(()=>{const spots=[[17,5.5],[25,15],[29,25],[25,35],[17,44.5]],b=[];
    spots.forEach((s,i)=>{const inside=[s[0]-5,s[1]+(25-s[1])*.25];
      b.push({cap:i===0?"Cut hard to your spot with your hands ready: target up, knees bent.":"V-cut to the next spot. Hop into the catch, feet already set.",acts:[{m:"a",path:i?[inside]:[],to:s,t:1100,face:B},{pass:"p",to:"a",at:500}],hold:0});
      b.push({cap:"Catch and shoot in one motion. Partner rebounds.",acts:[{shot:"a",reb:"p"}],hold:250});});
    b.push({cap:"Five spots done. Back to the start and switch shooter.",acts:[{m:"a",to:[13,9],t:2000,quiet:true}],hold:200});return b;})()};

/* ===================== TEAM ===================== */

const layupLines={court:"half",
  cast:[{id:"s1",t:"o",x:30,y:42,f:PI},{id:"s2",t:"o",x:33.2,y:43.6,f:PI},{id:"s3",t:"o",x:36.4,y:45.2,f:PI},
        {id:"r1",t:"o",x:30,y:8,f:PI},{id:"r2",t:"o",x:33.2,y:6.4,f:PI},{id:"r3",t:"o",x:36.4,y:4.8,f:PI}],
  balls:[{id:"b1",on:"s1"},{id:"b2",on:"s2"},{id:"b3",on:"s3"}],
  beats:[
    {cap:"Shooting line on the right, rebounding line on the left. First shooter dribbles in.",acts:[{m:"s1",path:[[19,37]],to:[8.3,29.4],t:2000,hand:"R"},{m:"r1",path:[[19,15]],to:[7.2,21],at:800,t:1500}],hold:0},
    {cap:"Right-hand layup off the left foot. The rebounder times his cut and catches it out of the net.",acts:[{shot:"s1",kind:"layup",reb:"r1"},{m:"r1",to:[6.2,23.4],at:250,t:500}],hold:100},
    {cap:"Rebounder dribbles to the back of the shooting line. Shooter jogs to the back of the rebounding line.",acts:[
      {m:"r1",path:[[16,40]],to:[36.4,45.2],t:2200,hand:"R"},{m:"s1",path:[[17,14]],to:[36.4,4.8],t:2200},
      {m:"s2",to:[30,42],at:300,t:800,quiet:true},{m:"s3",to:[33.2,43.6],at:300,t:800,quiet:true},
      {m:"r2",to:[30,8],at:300,t:800,quiet:true},{m:"r3",to:[33.2,6.4],at:300,t:800,quiet:true}],hold:150}]};

function weave(){
  const lane={l:9,m:25,r:41};const cast=[{id:"a",t:"o",x:3,y:9,f:0},{id:"b",t:"o",x:3,y:25,f:0},{id:"c",t:"o",x:3,y:41,f:0}];
  let st={a:"l",b:"m",c:"r"},x=3,side="r";const beats=[];
  const who=l=>Object.keys(st).find(k=>st[k]===l);
  for(let k=0;k<6;k++){
    const m=who("m"),tgt=who(side),other=who(side==="r"?"l":"r"),nx=x+12.5;
    beats.push({cap:k===0?"Middle player passes to a wing, then runs behind the player he passed to.":k===1?"The new middle player passes to the other wing and goes behind him. Nobody dribbles.":"Pass, go behind, fill the outside lane. Keep the ball off the floor.",acts:[
      {m:tgt,path:[[x+7.5,side==="r"?35:15]],to:[nx,lane.m],t:1050},
      {m:m,path:[[x+3,side==="r"?31:19]],to:[nx-2,lane[side]],t:1050},
      {m:other,to:[nx+1,lane[st[other]]],t:1050},
      {pass:m,to:tgt,at:120,t:520}],hold:0});
    st[m]=side;st[tgt]="m";side=side==="r"?"l":"r";x=nx;
  }
  const m=who("m"),tgt=who(side),other=who(side==="r"?"l":"r");
  beats.push({cap:"Last pass goes to the wing cutting to the rim for the layup.",acts:[
    {m:tgt,path:[[x+8,side==="r"?36:14]],to:[85.5,side==="r"?29.5:20.5],t:1250},{m:m,to:[x+12,lane.m],t:1250},
    {m:other,to:[x+14,lane[side==="r"?"l":"r"]],t:1250},{pass:m,to:tgt,at:300,t:520}],hold:0});
  beats.push({cap:"Finish with the outside hand. The other two crash the boards.",acts:[
    {shot:tgt,kind:"layup",reb:m},{m:m,to:[86,25],t:900},{m:other,to:[84,side==="r"?14:36],t:900}],hold:800});
  return {court:"full",cast,balls:[{id:"b",on:"b"}],beats};
}

const threeTwo={court:"full",
  cast:[{id:"o1",t:"o",n:1,x:40,y:25,f:0},{id:"o2",t:"o",n:2,x:40,y:8,f:0},{id:"o3",t:"o",n:3,x:40,y:42,f:0},
        {id:"x4",t:"d",n:4,x:70,y:25,f:PI},{id:"x5",t:"d",n:5,x:83,y:25,f:PI}],balls:[{id:"b",on:"o1"}],
  beats:[
    {cap:"3-on-2: attack in three lanes. The defense is in tandem: one at the top, one under the rim.",acts:[{m:"o1",to:[66,25],t:2200},{m:"o2",to:[76,8],t:2200},{m:"o3",to:[76,42],t:2200},{m:"x4",to:[71.5,25],t:2000,pace:"slide",face:"o1"}],hold:0},
    {cap:"Middle stops at the top and passes to a wing. Bottom defender takes the ball; top defender drops to the rim.",acts:[{pass:"o1",to:"o3"},{m:"x5",to:[79.6,37.6],at:100,t:800,pace:"run",face:"o3"},{m:"x4",to:[84,26.5],at:150,t:900,pace:"run",face:"o3"},{m:"o3",to:[78,41],t:600,quiet:true}],hold:0},
    {cap:"Skip it to the weak-side wing. He's open while the defense rotates.",acts:[{pass:"o3",to:"o2",kind:"over"},{m:"x4",to:[83,14],at:300,t:900,pace:"run",face:"o2"},{m:"o2",to:[79,9],t:500,quiet:true}],hold:0},
    {cap:"Attack the rim before the rotation gets there.",acts:[{m:"o2",path:[[82,15]],to:[85.4,19.8],t:900,hand:"L"},{m:"x4",to:[85,22],t:700,pace:"run"}],hold:0},
    {cap:"Score.",acts:[{shot:"o2",kind:"layup",reb:"x5"},{m:"x5",to:[86.5,26],t:900}],hold:150},
    {cap:"Now it's 2-on-1 the other way: the two defenders attack, and the shooter sprints back alone.",acts:[
      {sw:"x4",to:"o"},{sw:"x5",to:"o"},{sw:"o2",to:"d"},
      {m:"x4",path:[[78,36]],to:[66,40],t:1300},{pass:"x5",to:"x4",at:500},
      {m:"o2",path:[[70,14]],to:[16,25],t:3800,pace:"sprint"},
      {m:"o1",to:[55,49],t:2200,quiet:true},{m:"o3",to:[59,49],t:2200,quiet:true}],hold:0},
    {cap:"Push it in two lanes, wide apart.",acts:[{m:"x4",path:[[45,38]],to:[24,34],t:2800,hand:"R"},{m:"x5",path:[[60,14],[40,10]],to:[24,11],t:2800},{m:"o2",to:[13,26],t:2600,pace:"back",face:"x4"}],hold:0},
    {cap:"Make the lone defender commit to the ball, then pass for the layup.",acts:[{m:"x4",to:[15,30],t:800,hand:"R"},{m:"o2",to:[12.5,28.5],t:700,pace:"slide",face:"x4"},{m:"x5",path:[[14,13]],to:[8.4,20.6],t:1300},{pass:"x4",to:"x5",at:850,kind:"bounce"}],hold:0},
    {cap:"Finish. The next three go.",acts:[{shot:"x5",kind:"layup",reb:"o2"},{m:"o2",to:[6.6,23],t:600}],hold:700}]};

const elevenMan={court:"full",
  cast:[{id:"a1",t:"o",x:36,y:25,f:0},{id:"a2",t:"o",x:36,y:9,f:0},{id:"a3",t:"o",x:36,y:41,f:0},
        {id:"r1",t:"d",x:72,y:25,f:PI},{id:"r2",t:"d",x:84,y:25,f:PI},
        {id:"ro1",t:"o",x:71,y:1.2,f:PI/2},{id:"ro2",t:"o",x:71,y:48.8,f:-PI/2},
        {id:"l1",t:"d",x:22,y:25,f:0},{id:"l2",t:"d",x:10,y:25,f:0},
        {id:"lo1",t:"o",x:23,y:1.2,f:PI/2},{id:"lo2",t:"o",x:23,y:48.8,f:-PI/2}],
  balls:[{id:"b",on:"a1"}],
  beats:[
    {cap:"11-man break: three attack two. Outlet players wait on both sidelines at the free-throw line.",acts:[{m:"a1",to:[66,25],t:2300},{m:"a2",to:[77,9],t:2300},{m:"a3",to:[77,41],t:2300},{m:"r1",to:[71,25],t:1600,pace:"slide",face:"a1"}],hold:0},
    {cap:"Middle hits the wing. The defense rotates, and the wing takes the jumper.",acts:[{pass:"a1",to:"a3"},{m:"r2",to:[80,37.5],at:100,t:800,pace:"run",face:"a3"},{m:"r1",to:[83.6,27],at:150,t:900,pace:"run"},{shot:"a3",at:900,miss:true,missTo:[84.8,31],t:1100}],hold:0},
    {cap:"Whoever gets the rebound outlets to the sideline on his side. The other outlet sprints to the middle.",acts:[{m:"r2",to:[84,30.5],t:600},{take:"r2",ball:"b",at:620},{m:"ro2",to:[72,46],t:800},{pass:"r2",to:"ro2",at:900,kind:"over"},{m:"ro1",path:[[66,12]],to:[60,25],at:500,t:1600,pace:"sprint"},{m:"r1",path:[[78,14]],to:[62,8],at:400,t:1700,pace:"sprint"}],hold:0},
    {cap:"The new three attack the other way. Two attackers stay as the next defenders; the rest fill the outlet spots.",acts:[
      {pass:"ro2",to:"ro1",at:0},{sw:"r1",to:"o"},{sw:"r2",to:"o"},{sw:"a2",to:"d"},{sw:"a3",to:"d"},
      {m:"ro1",to:[27,25],at:300,t:3000},{m:"ro2",path:[[55,44]],to:[17,42],t:3300,pace:"sprint"},{m:"r1",to:[17,8],t:3300,pace:"sprint"},
      {m:"l1",to:[25.5,25],at:1800,t:1300,pace:"slide",face:"ro1"},
      {m:"a3",to:[72,25],t:1400},{m:"a2",to:[84,25],t:1200},{m:"a1",to:[71,1.2],t:1800},{m:"r2",to:[71,48.8],t:1600}],hold:0},
    {cap:"Same reads at this end: pass to a wing, defense rotates, finish.",acts:[{pass:"ro1",to:"r1"},{m:"l2",to:[13,12],at:150,t:800,pace:"run",face:"r1"},{m:"l1",to:[8,22],at:150,t:900,pace:"run"},{m:"r1",path:[[12,10]],to:[8.6,19.8],at:500,t:1100,hand:"L"}],hold:0},
    {cap:"Score, outlet, and it keeps going: the break never stops.",acts:[{shot:"r1",kind:"layup",reb:"l2"},{m:"l2",to:[6.8,22.5],t:700}],hold:800}]};

function rotateLines(spots,center,order,sizes,ballAt,caps){
  // Lines at each spot; pass to the next line in `order`, then follow your pass to the back of that line.
  const away=k=>{const s=spots[k],dx=s[0]-center[0],dy=s[1]-center[1],L=Math.hypot(dx,dy);return [dx/L,dy/L];};
  const slot=(k,i)=>{const u=away(k);return [spots[k][0]+u[0]*3*i,spots[k][1]+u[1]*3*i];};
  const lines=spots.map(()=>[]);const cast=[];let n=0;
  spots.forEach((s,k)=>{for(let i=0;i<sizes[k];i++){const id="p"+(n++),p=slot(k,i),u=away(k);cast.push({id,t:"o",x:p[0],y:p[1],f:Math.atan2(-u[1],-u[0])});lines[k].push(id);}});
  const beats=[];let from=ballAt;
  order.forEach((to,i)=>{
    const passer=lines[from][0],rcv=lines[to][0];
    const acts=[{pass:passer,to:rcv,at:120}];
    const back=slot(to,lines[to].length),mid=[(spots[from][0]+spots[to][0])/2,(spots[from][1]+spots[to][1])/2];
    const o=[mid[0]+(mid[0]-center[0])*.25,mid[1]+(mid[1]-center[1])*.25];
    acts.push({m:passer,path:[o],to:back,at:350,t:2300,face:center});
    lines[from].shift();lines[to].push(passer);
    lines[from].forEach((id,j)=>acts.push({m:id,to:slot(from,j),at:500,t:700,quiet:true,face:center}));
    beats.push({cap:caps[i%caps.length],acts,hold:0});
    from=to;
  });
  beats[beats.length-1].hold=300;
  return {cast,beats};
}

const fourCorner=(()=>{const spots=[[8,9],[8,41],[38,41],[38,9]],c=[23,25];
  const r=rotateLines(spots,c,[1,2,3,0],[2,2,2,2],0,["Pass to the next corner, then follow your pass to the back of that line.","Receiver steps to meet the pass with hands ready.","Pass, follow, and talk: call the name of the player you pass to.","Keep it moving. Add a second ball when they're sharp."]);
  return {court:"half",cast:r.cast,balls:[{id:"b",on:"p0"}],beats:r.beats};})();

const fiveStar=(()=>{const c=[23,25],spots=[0,1,2,3,4].map(k=>{const a=PI+PI/5+k*2*PI/5;return [c[0]+13.5*Math.cos(a),c[1]+13.5*Math.sin(a)];});
  const r=rotateLines(spots,c,[2,4,1,3,0],[2,1,1,1,1],0,["Five lines in a star. Pass across the star, skipping the line next to you.","Follow your pass to the back of that line.","Crisp chest passes, catch with two hands.","Every pass goes two lines over, so the ball draws a star.","Once it's smooth, add a second ball from another line."]);
  return {court:"half",cast:r.cast,balls:[{id:"b",on:"p0"}],beats:r.beats};})();

const shell=(()=>{
  const O={o1:[26,17],o2:[26,33],o3:[15,4.5],o4:[15,45.5]},chain=["o3","o1","o2","o4"];
  const cast=[];Object.entries(O).forEach(([id,p])=>cast.push({id,t:"o",n:id.slice(1),x:p[0],y:p[1],f:Math.atan2(25-p[1],5.25-p[0])+PI}));
  const unit=(a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1;return [dx/L,dy/L];};
  function spot(man,ball){const p=O[man],bp=O[ball];
    if(man===ball){const u=unit(p,B);return [p[0]+u[0]*3.6,p[1]+u[1]*3.6];}
    const gap=Math.abs(chain.indexOf(man)-chain.indexOf(ball));
    if(gap===1){const ub=unit(p,bp),uB=unit(p,B);return [p[0]+ub[0]*3.2+uB[0]*1.6,p[1]+ub[1]*3.2+uB[1]*1.6];}
    return [p[0]+(B[0]-p[0])*.48,p[1]+(bp[1]-p[1])*.56];}
  Object.keys(O).forEach(id=>{const s=spot(id,"o1");cast.push({id:"x"+id.slice(1),t:"d",n:id.slice(1),x:s[0],y:s[1],f:Math.atan2(O.o1[1]-s[1],O.o1[0]-s[0])});});
  const seq=[["o1","o2","Ball moves to 2. Every defender moves while the ball is in the air."],["o2","o4","On the ball: pressure. One pass away: deny, hand in the lane."],["o4","o2","Two passes away: help. One foot in the paint, see your man and the ball."],["o2","o1","Jump to the ball on every pass. Get there before the catch."],["o1","o3","Ball to the wing. The weak side sinks to the middle of the lane."],["o3","o1","Back to the top and around again. Talk on every pass: ball, deny, help."]];
  const beats=seq.map(([f,t,cap])=>{const acts=[{pass:f,to:t,t:700}];
    Object.keys(O).forEach(id=>{const s=spot(id,t);acts.push({m:"x"+id.slice(1),to:s,t:780,at:60,pace:"slide",face:t,quiet:true});});
    return {cap,acts,hold:650};});
  return {court:"half",cast,balls:[{id:"b",on:"o1"}],beats};})();

const knockout={court:"half",
  cast:[{id:"k1",t:"o",n:1,x:19,y:25,f:PI},{id:"k2",t:"o",n:2,x:22.5,y:25,f:PI},{id:"k3",t:"o",n:3,x:26,y:25,f:PI},{id:"k4",t:"o",n:4,x:29.5,y:25,f:PI}],
  balls:[{id:"ba",on:"k1"},{id:"bb",on:"k2"}],
  beats:[
    {cap:"One line at the free-throw line, first two players have a ball. 1 shoots.",acts:[{shot:"k1",miss:true,missTo:[8.5,30],t:1200}],hold:0},
    {cap:"1 misses and chases it. 2 steps up and shoots right away. If 2 scores before 1, player 1 is out.",acts:[{m:"k1",to:[9,29.5],t:900},{take:"k1",ball:"ba",at:920},{m:"k2",to:[19,25],t:500},{shot:"k2",at:650,reb:"k2"},{m:"k2",to:[7.2,24],at:1000,t:900}],hold:0},
    {cap:"2 scored first, so 1 is knocked out. 2 passes to the next shooter and goes to the back of the line.",acts:[{shot:"k1",at:100,kind:"layup",reb:"k1"},
      {m:"k3",to:[19,25],t:700,quiet:true},{m:"k4",to:[22.5,25],t:700,quiet:true},
      {pass:"k2",to:"k3",at:300},{m:"k2",path:[[15,36]],to:[26,25],at:500,t:1700},
      {pass:"k1",to:"k4",at:900},{m:"k1",to:[36,48],at:1100,t:2000}],hold:400},
    {cap:"Last player left standing wins. Keep the line moving so nobody waits long.",acts:[],hold:900}]};

const sharks={court:"half",
  cast:[...[6,14,22,30,38,45].map((y,i)=>({id:"m"+i,t:"o",x:45,y,f:PI})),{id:"s1",t:"d",x:24,y:16,f:0},{id:"s2",t:"d",x:24,y:34,f:0}],
  balls:[0,1,2,3,4,5].map(i=>({id:"b"+i,on:"m"+i})),
  beats:[
    {cap:"Minnows each have a ball on the half-court line. Two sharks wait in the middle.",acts:[{dr:"m0",t:900},{dr:"m1",t:900},{dr:"m2",t:900},{dr:"m3",t:900},{dr:"m4",t:900},{dr:"m5",t:900}],hold:0},
    {cap:"\"Fish, fish, come out and swim!\" Minnows dribble to the baseline without losing the ball.",acts:[
      {m:"m0",path:[[30,4],[15,6]],to:[1.5,5],t:4300,cross:true},
      {m:"m1",path:[[33,11]],to:[22.5,13],t:1900,cross:true},
      {m:"m2",path:[[32,26],[16,23]],to:[1.5,22],t:4500,cross:true},
      {m:"m3",path:[[31,33],[18,28]],to:[1.5,30],t:4400,cross:true},
      {m:"m4",path:[[30,43],[14,38]],to:[1.5,37],t:4200,cross:true},
      {m:"m5",path:[[28,47],[12,46]],to:[1.5,45],t:4000,cross:true},
      {m:"s1",path:[[26,14]],to:[23.5,13.5],t:1900,pace:"run",face:"m1"},
      {m:"s2",path:[[22,33],[14,35]],to:[9,37.5],t:4000,pace:"run",face:"m4"},
      {ball:"b1",to:[17,-1],at:1950,t:1100},{sw:"m1",to:"d",at:2100},{m:"s1",to:[18,18],at:2000,t:2000,pace:"run"}],hold:200},
    {cap:"Lose your ball and you become a shark. Last minnow left wins.",acts:[{m:"m1",to:[24,25],t:1300,pace:"jog"}],hold:1200}]};

const lineDrills=(()=>{const ys=[12,20,28,36],sp=[1,1.05,.97,1.08],legs=[[19,"Free-throw line and back. Touch every line with your hand."],[47,"Half court and back."],[75,"Far free-throw line and back."],[94,"Full court and back. Sprint through the finish."]];
  const cast=ys.map((y,i)=>({id:"r"+i,t:"o",x:.9,y,f:0}));
  const beats=legs.map(([L,cap])=>{const acts=[];ys.forEach((y,i)=>{const go=Math.max(900,(L-1.8)/17*1000*sp[i])+250;acts.push({m:"r"+i,to:[L-1,y],t:go,quiet:i>0});acts.push({m:"r"+i,to:[.9,y],at:go+120,t:go,quiet:i>0,face:[94,y]});});return {cap,acts,hold:500};});
  return {court:"full",cast,beats};})();

/* ===================== LIBRARY ===================== */
const D=(id,name,cat,group,o)=>({id,name,cat,group,...o});
const LIB=[
 // Individual
 D("mikan","Mikan Drill","Individual","Finishing",{level:"All ages",players:"1",minutes:4,equip:"1 ball",
   setup:"One player under the basket with a ball.",
   how:["Start on the right side of the rim and make a right-hand layup off the left foot.","Catch the ball out of the net before it touches the floor.","Step across under the rim and make a left-hand layup off the right foot.","Keep alternating without stopping."],
   points:["Ball stays above the shoulders, never brought down","Use the backboard on every layup","Short, quick steps across the lane","Rhythm first, then speed"],
   vary:["Reverse Mikan: finish reverse layups on each side","Count makes in 30 seconds and try to beat it"],sim:mikan}),
 D("form-shooting","Form Shooting","Individual","Shooting",{level:"All ages",players:"1 + a rebounder",minutes:6,equip:"1 ball",
   setup:"Shooter 6 to 8 feet from the rim; a partner under the basket.",
   how:["Shoot one-handed (guide hand off) from right in front of the rim.","Hold the follow-through until the ball hits the net.","Make five in a row from each spot: middle, left, right.","Take a step back only when the five go in."],
   points:["Elbow under the ball, wrist cocked","Ball on the finger pads, not the palm","Feet and shoulders square to the rim","Same shot every time, high arc"],
   vary:["Add the guide hand once form is solid","Eyes closed after the release to feel the shot"],sim:form}),
 D("cone-weave","Cone Weave Dribble","Individual","Ball handling",{level:"All ages",players:"1 per line",minutes:6,equip:"4–6 cones, 1 ball each",
   setup:"Cones in a line from half court toward the basket, about 6 feet apart.",
   how:["Dribble toward the first cone and cross over just before it.","Weave through every cone, keeping the ball in the hand away from the cone.","Explode out of the last cone into a layup.","Speed dribble back up the sideline and go again."],
   points:["Ball low and tight on the crossover","Eyes up, not on the ball","Change speed coming out of each cone","Left hand gets as many reps as the right"],
   vary:["Between-the-legs or behind-the-back at each cone","Finish with a pull-up jumper instead of a layup"],sim:coneWeave}),
 D("speed-dribble","Full-Court Speed Dribble Layups","Individual","Ball handling",{level:"All ages",players:"1 per ball",minutes:5,equip:"1 ball each",
   setup:"Player starts in the corner on the baseline with a ball.",
   how:["Push the ball out in front and sprint the length of the floor with the right hand.","Finish a right-hand layup.","Rebound and come back down the other side with the left hand.","Finish a left-hand layup."],
   points:["Push it ahead and run to it","As few dribbles as possible","Stay wide, then angle to the rim","Under control for the finish"],
   vary:["Count dribbles and try to beat your number","Time the trip down and back"],sim:speedDribble}),
 D("around-the-world","Around the World","Individual","Shooting",{level:"All ages",players:"1 + a rebounder",minutes:6,equip:"1 ball",
   setup:"Five spots around the lane: both baselines, both wings, the free-throw line.",
   how:["Start on the right baseline and shoot.","Make it to move to the next spot.","Go all the way around to the left baseline and back.","Partner rebounds and passes to each spot."],
   points:["Square up before every shot","Bank shots from the angles are fine","Same form from every spot","Compete: fewest shots to go around wins"],
   vary:["Move the spots out as players improve","Add a shot fake and one dribble before each shot"],sim:aroundWorld}),

 // Skill (partners and small groups)
 D("partner-passing","Partner Passing","Skill","Passing",{level:"All ages",players:"2 per ball",minutes:5,equip:"1 ball per pair",
   setup:"Partners face each other 12 to 15 feet apart.",
   how:["Chest passes back and forth.","Switch to bounce passes, landing two-thirds of the way.","Then overhead passes.","Step toward your partner on every pass."],
   points:["Step into the pass","Thumbs down on the follow-through","Show a target with your hands","Catch with two hands and bring it to your chest"],
   vary:["One-hand push passes off the dribble","Move partners farther apart"],sim:partnerPass}),
 D("give-and-go","Give and Go","Skill","Offense",{level:"All ages",players:"5+",minutes:7,equip:"1–2 balls",
   setup:"One line at the top of the key with a ball, one line on the wing.",
   how:["Top player passes to the wing.","Jab step away, then cut hard to the rim.","Wing gives the ball back with a bounce pass.","Layup, then rotate lines."],
   points:["Sell the jab step","Cut in front of where the defense would be","Pass ahead of the cutter","Hands ready on the cut"],
   vary:["Add a defender on the cutter","Run it from the other side for left-hand finishes"],sim:giveGo}),
 D("closeout","Closeout Drill","Skill","Defense",{level:"All ages",players:"2 per group",minutes:6,equip:"1 ball",
   setup:"Defender under the basket with a ball, offense on the wing.",
   how:["Defender passes to the wing and sprints at him.","Chop the feet for the last few steps with a hand up.","Offense shot fakes and drives baseline.","Defender slides to cut him off, then switch."],
   points:["Sprint two-thirds of the way, chop the rest","Butt down, weight back","High hand takes away the shot","Force baseline and wall up"],
   vary:["Offense can shoot if the closeout is short","Play it live 1-on-1 after the closeout"],sim:closeout}),
 D("box-out","Box-Out Drill","Skill","Rebounding",{level:"All ages",players:"2 + coach",minutes:6,equip:"1 ball",
   setup:"Coach at the free-throw line, offense on the wing, defender between his man and the basket.",
   how:["Coach shoots.","Defender steps to his man, then reverse pivots into him.","Hold the box out until the ball hits the floor.","Go get the ball with two hands and outlet."],
   points:["Find your man first","Butt low, elbows wide, feet active","Contact before the ball comes off","Two hands, chin the ball"],
   vary:["Three-on-three box outs","Offense scores a point for every offensive rebound"],sim:boxOut}),
 D("one-on-one-wing","1-on-1 From the Wing","Skill","Offense",{level:"10 and up",players:"2 + coach",minutes:8,equip:"1 ball",
   setup:"Coach at the top with the ball, offense on the wing, defender in help position.",
   how:["Offense V-cuts to get open.","Coach passes; defender closes out.","Offense jabs, reads the defense and attacks.","Play to a score or a stop, then switch."],
   points:["Get open with a change of speed","Triple threat on the catch","Attack the defender's top foot","Defense: stay in front, contest without fouling"],
   vary:["Limit offense to two dribbles","Start from the other wing or the top"],sim:oneOnOne}),
 D("pick-and-roll","2-on-2 Pick and Roll","Skill","Offense",{level:"12 and up",players:"4",minutes:8,equip:"1 ball",
   setup:"Guard at the top with the ball, big at the elbow, a defender on each.",
   how:["Big sets a ball screen on the guard's defender.","Guard uses the screen shoulder to shoulder.","Big rolls hard to the rim.","Guard reads the help and passes or scores."],
   points:["Set up the defender before using the screen","Screener: wide base, hold it","Roll to the rim with a target hand","Read the big's defender to decide"],
   vary:["Defense switches, hedges or drops","Add a weak-side shooter for 3-on-3"],sim:pnr}),
 D("post-drop-step","Post Entry and Drop Step","Skill","Post play",{level:"10 and up",players:"3",minutes:6,equip:"1 ball",
   setup:"Passer on the wing, post player on the block with a defender.",
   how:["Post player seals the defender with a wide base.","Wing feeds a bounce pass to the target hand.","Feel the defender and drop step baseline with one power dribble.","Two-foot power layup."],
   points:["Seal with your back and butt, not your hands","Catch with two hands and chin it","Drop step away from the defender","Go up strong, ball high"],
   vary:["Defender plays the low side, so turn middle for a hook","Add a weak-side help defender"],sim:postDrop}),
 D("chase-down","Chase-Down Layups","Skill","Finishing",{level:"All ages",players:"2 per group",minutes:6,equip:"1 ball",
   setup:"Offense with a ball near the free-throw line extended; defender a few steps behind on the baseline.",
   how:["On the whistle, offense speed dribbles for a layup.","Defender sprints after him to contest.","Finish strong.","Switch roles coming back."],
   points:["Offense: never look back, just go","Finish high off the glass","Defense: sprint, then contest from behind","No fouls: go for the ball"],
   vary:["Move the defender closer to make it harder","Offense must finish with the left hand"],sim:chaseDown}),
 D("zigzag","Zigzag 1-on-1","Skill","Defense",{level:"All ages",players:"2 per group",minutes:6,equip:"1 ball per pair",
   setup:"Offense on the baseline with a ball, defender in front. Stay between the sideline and the lane line.",
   how:["Offense dribbles up the court in a zigzag.","Change direction with a crossover at each turn.","Defender slides, drop steps and stays in front.","Switch at the far end."],
   points:["Defense: open the gate with a drop step","Slide, don't cross your feet","Beat the dribbler to the spot","Offense: ball low on the crossover"],
   vary:["Defender hands behind his back","Make it live in the last third"],sim:zigzag}),
 D("catch-and-shoot","Partner Catch and Shoot","Skill","Shooting",{level:"10 and up",players:"2 per ball",minutes:8,equip:"1 ball per pair",
   setup:"Shooter on the perimeter, partner under the basket with a ball.",
   how:["Shooter cuts to a spot with hands ready.","Partner passes; shooter hops into the catch.","Shoot in one motion.","Five spots around the arc, then switch."],
   points:["Feet ready before the ball arrives","Hands up as a target","Low to high, no dip","Hold the follow-through"],
   vary:["Shot fake and one dribble pull-up","Partner closes out after the pass"],sim:catchShoot}),

 // Team
 D("layup-lines","Layup Lines","Team","Finishing",{level:"All ages",players:"6+",minutes:6,equip:"3 balls",
   setup:"Shooting line on the right wing with balls, rebounding line on the left wing.",
   how:["First shooter dribbles in for a right-hand layup.","First rebounder cuts in and catches it out of the net.","Rebounder dribbles to the back of the shooting line.","Shooter goes to the back of the rebounding line."],
   points:["Right side: left foot, right hand","Rebounder times the cut","Hustle between lines","Switch sides for left-hand layups"],
   vary:["Jump stops and power layups","Pull-up jumpers from the elbow"],sim:layupLines}),
 D("three-man-weave","Three-Man Weave","Team","Passing",{level:"10 and up",players:"3 per group",minutes:8,equip:"1 ball per group",
   setup:"Three lines on the baseline: one in the middle with a ball and one on each side.",
   how:["The middle player passes to a wing and runs behind the player he passed to.","The receiver cuts to the middle, passes to the other wing and goes behind him.","Weave the length of the court with no dribbles.","Last pass leads a wing to the rim for a layup."],
   points:["Catch and pass on the run","Lead your teammate, chest high","Always go behind the receiver","Wide lanes, even spacing"],
   vary:["Come back the other way after the layup","Set a number of passes before the shot"],sim:weave()}),
 D("three-on-two","3-on-2, 2-on-1 Continuous","Team","Transition",{level:"10 and up",players:"5+",minutes:10,equip:"1 ball",
   setup:"Three offensive players at half court; two defenders in tandem at the far basket.",
   how:["Three attack the two defenders.","After the score or rebound, the two defenders attack the other way.","The shooter sprints back alone to defend the 2-on-1.","The next three are ready to go."],
   points:["Fill three lanes, stay wide","Middle stops at the top of the key","Tandem defense: top takes the ball, bottom takes the first pass","2-on-1: make the defender commit, then pass"],
   vary:["Offense gets two passes max","Add a trailing defender"],sim:threeTwo}),
 D("eleven-man","11-Man Fast Break","Team","Transition",{level:"12 and up",players:"11",minutes:10,equip:"1 ball",
   setup:"Three attackers at half court, two defenders at each basket, two outlet players on each sideline at the free-throw line.",
   how:["Three attack two.","Whoever rebounds outlets to the sideline on his side.","The other outlet sprints to the middle; the rebounder fills a lane.","The new three attack the other end; two of the old three stay to defend."],
   points:["Outlet fast and to the sideline","Sprint the lanes, wide","Make the extra pass","Talk on defense: ball, I've got the ball, rotate"],
   vary:["Require a pass before half court","Count scores in a row"],sim:elevenMan}),
 D("four-corner-passing","Four Corner Passing","Team","Passing",{level:"All ages",players:"8+",minutes:5,equip:"1–2 balls",
   setup:"Four lines at the corners of a square.",
   how:["Pass to the next corner.","Follow your pass to the back of that line.","Keep it going around.","Change direction and add a second ball."],
   points:["Step to meet the pass","Call the receiver's name","Pass and sprint, no jogging","Two-hand catch, quick release"],
   vary:["Two balls at once","Receiver must make a pivot before passing"],sim:fourCorner}),
 D("five-star-passing","Five-Star Passing","Team","Passing",{level:"All ages",players:"6+",minutes:5,equip:"1–2 balls",
   setup:"Five lines in a star shape around the free-throw area.",
   how:["Pass across the star, skipping the line next to you.","Follow your pass to the back of that line.","The ball traces a star.","Add a second ball once it's smooth."],
   points:["Chest pass, step in","Catch and pass quickly","Follow your pass every time","Talk: call names"],
   vary:["Bounce passes only","Two balls at once"],sim:fiveStar}),
 D("shell-drill","Shell Drill (4-on-4)","Team","Defense",{level:"12 and up",players:"8",minutes:10,equip:"1 ball",
   setup:"Four offensive players around the perimeter, four defenders.",
   how:["Offense moves the ball around the perimeter.","Defenders adjust on every pass.","On the ball: pressure. One pass away: deny. Two away: help.","Make it live after a set number of passes."],
   points:["Move while the ball is in the air","See your man and the ball","Help side: one foot in the paint","Talk on every pass"],
   vary:["Add penetration and help-and-recover","Add cutters and screens"],sim:shell}),
 D("knockout","Knockout","Team","Shooting",{level:"All ages",players:"4+",minutes:6,equip:"2 balls",
   setup:"One line at the free-throw line; the first two have balls.",
   how:["First player shoots; if he misses, he rebounds and keeps shooting.","The second player shoots as soon as the first one does.","If the second scores before the first, the first is out.","Pass the ball to the next player after you score."],
   points:["Quick but balanced shots","Follow your misses","Pass to the next shooter right away","Last one in wins"],
   vary:["Shoot from the elbows","Layups only for younger players"],sim:knockout}),
 D("sharks-and-minnows","Sharks and Minnows","Team","Ball handling",{level:"Ages 6–12",players:"6+",minutes:6,equip:"1 ball per minnow",
   setup:"Minnows with balls on the half-court line; two sharks in the middle.",
   how:["Sharks call \"Fish, fish, come out and swim!\"","Minnows dribble to the baseline.","Sharks try to knock balls away.","Lose your ball and become a shark."],
   points:["Eyes up to see the sharks","Protect the ball with your body","Change speed and direction","Sharks: go for the ball, not the player"],
   vary:["Weak hand only","Two sharks start with a ball too"],sim:sharks}),
 D("line-drills","Line Drills","Team","Conditioning",{level:"All ages",players:"Whole team",minutes:4,equip:"None",
   setup:"Players on the baseline.",
   how:["Sprint to the free-throw line and back.","Half court and back.","Far free-throw line and back.","Full court and back."],
   points:["Touch every line with your hand","Sprint through the finish","Plant and push off the outside foot","Set a time goal"],
   vary:["Dribble a ball the whole way","Defensive slides on the first leg"],sim:lineDrills}),

 // More drills (written, no animation yet)
 D("dynamic-warmup","Dynamic Warm-Up","Team","Warm-up",{level:"All ages",players:"Whole team",minutes:8,equip:"None",setup:"Lines on the baseline.",how:["Jog to half court and back.","High knees, butt kicks and carioca to half court.","Walking lunges with a twist, then defensive slides.","Finish with two build-up sprints."],points:["Full effort on every rep","Talk to each other","Good posture, quick feet"],vary:["Add a ball: dribble every movement"]}),
 D("stationary-handling","Stationary Ball Handling","Individual","Ball handling",{level:"All ages",players:"1",minutes:5,equip:"1 ball",setup:"Each player with a ball in a stance.",how:["Pound dribbles: right, then left, 30 seconds each.","Crossovers in front.","Between the legs, then behind the back.","Finish with 30 seconds of combos."],points:["Eyes up","Ball below the knee","Fingertips, not palm","Stay in a stance"],vary:["Call out fingers the coach holds up","Close your eyes"]}),
 D("figure-eight","Figure-8 Dribble","Individual","Ball handling",{level:"All ages",players:"1",minutes:3,equip:"1 ball",setup:"Feet wide, knees bent.",how:["Dribble around and through your legs in a figure 8.","Switch direction after 30 seconds.","Then wrap the ball around the legs without dribbling."],points:["Low stance","Fingertip control","Keep the ball moving"],vary:["Speed rounds: count the eights in 30 seconds"]}),
 D("two-ball","Two-Ball Dribbling","Individual","Ball handling",{level:"10 and up",players:"1",minutes:4,equip:"2 balls",setup:"A ball in each hand.",how:["Dribble both at the same time.","Then alternate.","High–low, then walk forward and back."],points:["Weak hand sets the pace","Eyes up","Pound it hard"],vary:["Two-ball crossovers","Two-ball cone weave"]}),
 D("free-throws","Free-Throw Routine","Individual","Shooting",{level:"All ages",players:"1+",minutes:6,equip:"1 ball per basket",setup:"Players spread across baskets in pairs.",how:["Same routine before every shot: dribbles, breath, look at the rim.","Shoot two, partner rebounds.","Rotate every two shots.","Track makes out of 10."],points:["Same routine every time","Feet set, square","Hold the follow-through"],vary:["Shoot when tired, after a sprint","Team goal: make 7 of 10 or run"]}),
 D("elbow-shooting","Elbow Pull-Ups","Individual","Shooting",{level:"10 and up",players:"1 + rebounder",minutes:6,equip:"1 ball",setup:"Start at half court on the right side.",how:["Speed dribble to the right elbow.","Hop into a pull-up jumper.","Rebound, outlet and go to the left elbow."],points:["Stop on balance","Rise straight up","Shot pocket, no dip"],vary:["Add a hesitation or crossover first"]}),
 D("beat-the-pro","Beat the Pro","Individual","Shooting",{level:"10 and up",players:"1",minutes:5,equip:"1 ball",setup:"Shooter picks a spot.",how:["Make it: you get 1 point.","Miss it: the 'pro' gets 2 points.","First to 11 wins."],points:["Game speed shots","Compete with yourself"],vary:["Move the spot after every make"]}),
 D("superman-rebound","Superman Rebounding","Individual","Rebounding",{level:"10 and up",players:"1",minutes:3,equip:"1 ball",setup:"Player outside the lane on one side.",how:["Toss the ball off the backboard to the other side.","Sprint across the lane and grab it before it lands.","Toss it back and repeat."],points:["Two hands, chin it","Explode off two feet","Land balanced"],vary:["Add a power layup every third rep"]}),
 D("jump-stop-pivot","Jump Stop and Pivot","Skill","Footwork",{level:"Ages 6–12",players:"Whole team",minutes:4,equip:"Optional balls",setup:"Lines on the baseline.",how:["Jog forward, jump stop on two feet on the whistle.","Front pivot, then reverse pivot.","Keep the pivot foot planted."],points:["Land on both feet at once","Low and balanced","Ball protected at the chin"],vary:["Add a pass after the pivot"]}),
 D("defensive-slides","Defensive Slides","Skill","Defense",{level:"All ages",players:"Whole team",minutes:4,equip:"None",setup:"Players spread out facing the coach.",how:["Coach points; players slide that way.","Sprint forward on a shot signal, then back pedal.","Chop feet on the whistle."],points:["Don't click your heels","Head level, no bouncing","Hands active"],vary:["Add a ball and closeouts"]}),
 D("defensive-mirror","Defensive Mirror","Skill","Defense",{level:"All ages",players:"2 per pair",minutes:3,equip:"Lines or cones",setup:"Partners face each other across a line.",how:["Leader slides side to side.","Defender mirrors and stays in front.","Switch after 20 seconds."],points:["Quick feet","Stay low","Eyes on the hips"],vary:["Leader can fake"]}),
 D("deny-the-wing","Deny the Wing","Skill","Defense",{level:"12 and up",players:"3",minutes:6,equip:"1 ball",setup:"Coach at the top, offense on the wing, defender denying.",how:["Defender denies the pass with a hand in the lane.","Offense V-cuts and back-cuts.","Defender opens to the ball on a back cut."],points:["Ear on the chest of your man","See the ball","Open up on the back cut"],vary:["Make it live on the catch"]}),
 D("help-recover","Help and Recover","Skill","Defense",{level:"12 and up",players:"4",minutes:6,equip:"1 ball",setup:"Two offense, two defense on one side.",how:["Ball handler drives.","Help defender stops the drive.","Ball is kicked back; help defender recovers with a closeout."],points:["Help early","Sprint back, chop feet","Talk: I've got help"],vary:["Add a third offensive player"]}),
 D("take-a-charge","Take a Charge","Skill","Defense",{level:"12 and up",players:"2",minutes:4,equip:"Mat optional",setup:"Defender in the lane with feet set.",how:["Offense drives slowly.","Defender beats him to the spot, chest square.","Fall back on the backside, hands across chest."],points:["Feet set before contact","Take it in the chest","Safe fall: sit and roll"],vary:["Slide in from help position"]}),
 D("loose-ball","Loose Ball Dive","Skill","Hustle",{level:"All ages",players:"2",minutes:3,equip:"1 ball, mats optional",setup:"Two players beside the coach.",how:["Coach rolls the ball out.","Both chase it; first to secure it gets a point.","Pass it to the coach from the floor."],points:["Get low early","Secure with two hands","Call for timeout or pass from the floor"],vary:["Winner plays 1-on-1 to the rim"]}),
 D("tip-drill","Tip Drill","Skill","Rebounding",{level:"12 and up",players:"3+",minutes:3,equip:"1 ball",setup:"Line beside the backboard.",how:["Tip the ball off the glass.","Run to the back of the line.","Next player tips it in rhythm."],points:["Fingertips","Jump quickly","Stay in rhythm"],vary:["Finish with a tip-in"]}),
 D("triangle-passing","Triangle Passing","Skill","Passing",{level:"All ages",players:"3",minutes:4,equip:"1 ball",setup:"Three players in a triangle.",how:["Pass and follow your pass.","Change direction after 30 seconds.","Add a defender in the middle."],points:["Step to the ball","Pass away from the defender"],vary:["Monkey in the middle"]}),
 D("outlet-passing","Rebound and Outlet","Skill","Transition",{level:"10 and up",players:"3",minutes:5,equip:"1 ball",setup:"Rebounder under the basket, outlets on both wings.",how:["Coach misses a shot.","Rebounder chins it and pivots to the outside.","Two-hand overhead outlet to the wing.","Wing pushes it up the floor."],points:["Pivot away from traffic","Outlet goes to the sideline","Wing: back to the sideline, see the floor"],vary:["Add a defender to pressure the outlet"]}),
 D("monkey-middle","Monkey in the Middle","Skill","Passing",{level:"Ages 6–12",players:"3",minutes:4,equip:"1 ball",setup:"Two passers, one defender between them.",how:["Passers pivot and fake to get the pass past the defender.","Defender who deflects switches with the passer."],points:["Pivot, fake, pass","Bounce and overhead passes"],vary:["Passers can take one dribble"]}),
 D("dribble-knockout","Dribble Knockout","Team","Ball handling",{level:"Ages 6–12",players:"6+",minutes:5,equip:"1 ball each",setup:"Everyone dribbles inside the three-point line.",how:["Keep your dribble while knocking others' balls out.","Knocked out? Do 10 stationary dribbles outside, then rejoin.","Last one dribbling wins."],points:["Protect with your body","Eyes up"],vary:["Weak hand only"]}),
 D("dribble-tag","Dribble Tag","Team","Ball handling",{level:"Ages 6–10",players:"6+",minutes:4,equip:"1 ball each",setup:"Everyone dribbling in half court; one or two taggers.",how:["Taggers dribble and tag.","Tagged players freeze and dribble in place until freed.","Switch taggers every minute."],points:["Keep the dribble alive","Change speed"],vary:["Tagged players switch hands"]}),
 D("hot-shot","Hot Shot","Team","Shooting",{level:"All ages",players:"Any",minutes:5,equip:"1 ball per basket",setup:"Spots marked with point values around the lane.",how:["One minute to score as many points as possible.","Partner rebounds.","Switch."],points:["Shoot on balance","Mix close and far"],vary:["Team totals"]}),
 D("buzzer-beater","Buzzer Beater","Team","Shooting",{level:"All ages",players:"Any",minutes:4,equip:"1 ball per player",setup:"Players at different spots; coach counts down from 5.",how:["Coach counts down.","Shooter must release before zero.","Count makes."],points:["Quick and balanced","Celebrate the makes"],vary:["Dribble from half court"]}),
 D("three-on-three","3-on-3 Half Court","Team","Scrimmage",{level:"10 and up",players:"6",minutes:10,equip:"1 ball",setup:"Three on three in the half court.",how:["Play to 5 baskets.","Winners stay, or rotate every score.","Add a rule: every player touches the ball."],points:["Spacing","Pass and cut","Help defense"],vary:["Score only off cuts","Two-dribble limit"]}),
 D("cutthroat","4-on-4 Cutthroat","Team","Scrimmage",{level:"12 and up",players:"12",minutes:10,equip:"1 ball",setup:"Three teams of four; one waits.",how:["Offense scores and stays on offense.","Defense must get three stops in a row to go to offense.","Waiting team rotates in on a score."],points:["Defensive intensity","Rebound to finish the stop"],vary:["Count deflections"]}),
 D("controlled-scrimmage","Controlled Scrimmage","Team","Scrimmage",{level:"All ages",players:"10",minutes:15,equip:"1 ball",setup:"5-on-5 full court with the coach stopping play.",how:["Run your offense and defense live.","Coach stops play to teach.","Start possessions from game situations: down 2, 30 seconds left."],points:["Run your sets","Communicate"],vary:["Scrimmage to a score target"]}),
 D("press-break","Press Break Walkthrough","Team","Offense",{level:"12 and up",players:"10",minutes:8,equip:"1 ball",setup:"Five on five, full court, inbounding under your basket.",how:["Walk through the press break spots.","Add the defense at half speed.","Then go live."],points:["Inbounder: see the whole floor","Meet the pass","Middle of the floor is the target"],vary:["Defense picks the press"]}),
 D("blob","Baseline Out-of-Bounds Walkthrough","Team","Offense",{level:"10 and up",players:"10",minutes:6,equip:"1 ball",setup:"Five offense, five defense, ball under your basket.",how:["Walk through each inbound play.","Then run it against defense.","Track how many scores you get."],points:["Inbounder slaps the ball to start","Screen and cut with timing","Safety outlet every time"],vary:["Five seconds on the clock"]}),
];
self.DRILL_LIB=LIB;
})();
