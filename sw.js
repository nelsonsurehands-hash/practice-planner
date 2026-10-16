/* Offline support: keeps the app itself available with no signal (gym basements).
   Team data still needs a connection to sync. Bump VERSION when you deploy changes. */
const VERSION="cpp-v10";
const SHELL=["./","index.html","css/app.css","js/config.js","js/store.js","js/sports.js","js/board.js","playbook.html","js/playbook.js","js/app.js","js/boot.js","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png"];
const CDN=["cdn.jsdelivr.net","cdnjs.cloudflare.com","fonts.googleapis.com","fonts.gstatic.com"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",e=>{
  const url=new URL(e.request.url);
  if(e.request.method!=="GET")return;
  if(url.origin===location.origin){
    // Network first for the app files so updates show up; fall back to cache offline.
    e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(VERSION).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match("index.html"))));
  }else if(CDN.includes(url.hostname)){
    // Libraries and fonts: cache first.
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{const copy=res.clone();caches.open(VERSION).then(c=>c.put(e.request,copy));return res;})));
  }
  // Everything else (Supabase API, auth) always goes to the network.
});
