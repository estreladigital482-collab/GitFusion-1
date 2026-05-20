const CACHE='gitfusion-appshell-v16-4';
const ASSETS=['/','/index.html','/styles.css','/app.js','/apk-ai-runtime.js','/apk-bootstrap.js','/bootstrap-packages.json','/manifest.webmanifest','/assets/mascot-inner-clean.png','/assets/gitfusion-icon-selected.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))); self.clients.claim();});
self.addEventListener('fetch',event=>{ const req=event.request; if(req.method!=='GET') return; event.respondWith(fetch(req).then(res=>{ const copy=res.clone(); caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{}); return res; }).catch(()=>caches.match(req).then(cached=>cached||caches.match('/index.html')))); });
