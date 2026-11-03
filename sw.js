/* The Women Shop as a home-screen app (and a little faster for repeat visitors).
   - Pages are always fetched online first, so changes reach everyone straight away.
   - Files with ?v=… never change (a new version gets a new ?v=), so the copy on the phone is used.
   - Products, prices, stock, reviews and photos are never stored here: they always come fresh.
   - No internet: a friendly "You're offline" page.
   - If storage on the phone fails for any reason, it simply uses the internet.
   EMERGENCY OFF SWITCH: set OFF = true and publish. Every phone removes this helper on its next visit. */
const OFF = false;
const CACHE = "tws-site-v2";
const OFFLINE = "/offline.html";

self.addEventListener("install", (e) => {
  self.skipWaiting();
  if (!OFF) e.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE, "/assets/logo.jpg"])).catch(() => {}));
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys().catch(() => []);
    // the admin app (/admin) keeps its own files: leave them alone
    await Promise.all(keys.filter((k) => k.startsWith("tws-site-") && (OFF || k !== CACHE)).map((k) => caches.delete(k).catch(() => {})));
    if (OFF) {
      await self.registration.unregister();
      return;
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  if (OFF) return;
  const req = e.request;
  const url = new URL(req.url);
  // the sheets, photos, fonts, visitor stats, and the admin app: straight to the internet as usual
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/admin")) return;
  const handle = req.mode === "navigate" ? page
    : url.searchParams.has("v") ? versioned
    : /\.(png|jpg|jpeg|ico|webmanifest)$/.test(url.pathname) ? onlineFirst : null;
  if (handle) e.respondWith(handle(req).catch(() => fetch(req)));
});

const save = (cache, key, res) => cache.put(key, res).catch(() => {});

// pages: online (checked for changes every time); no internet → the offline page
async function page(req) {
  try {
    // always ask the server whether the page changed (skips the phone's 10-minute copy)
    return await fetch(new Request(req.url, { cache: "no-cache", credentials: "same-origin" }));
  } catch (err) {
    const cache = await caches.open(CACHE);
    return (await cache.match(OFFLINE).catch(() => null)) || Response.error();
  }
}

// css/js?v=…: the copy on the phone if there is one; a new version replaces the old one
async function versioned(req) {
  const cache = await caches.open(CACHE);
  const saved = await cache.match(req).catch(() => null);
  if (saved) return saved;
  const res = await fetch(req);
  if (res.ok) {
    const path = new URL(req.url).pathname;
    const keys = await cache.keys().catch(() => []);
    await Promise.all(keys.filter((k) => new URL(k.url).pathname === path).map((k) => cache.delete(k).catch(() => {})));
    await save(cache, req, res.clone());
  }
  return res;
}

// logo and icons: online copy, the saved one when offline
async function onlineFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) save(cache, req, res.clone());
    return res;
  } catch (err) {
    return (await cache.match(req).catch(() => null)) || Response.error();
  }
}
