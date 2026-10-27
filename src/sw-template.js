const CACHE="cap-shell-__VERSION__";
const ASSETS=__ASSETS__;
const urls=new Set(ASSETS.map(path=>new URL(path,self.registration.scope).href));
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll([...urls]))));
self.addEventListener("activate",event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith("cap-shell-")&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener("fetch",event=>{
 const request=event.request,url=new URL(request.url);
 // Ne jamais mettre en cache session, requête Auth, API, configuration ou données utilisateur.
 if(request.method!=="GET"||url.origin!==self.location.origin||url.search)return;
 const home=new URL("./",self.registration.scope).href;
 if(url.href===home)url.pathname+="index.html";
 if(!urls.has(url.href))return;
 event.respondWith((async()=>{
  const cached=await caches.match(url.href,{cacheName:CACHE});
  if(cached)return cached;
  return fetch(request); // pas de mise en cache dynamique
 })());
});
