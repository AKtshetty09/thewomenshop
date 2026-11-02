/* Kavya's Shop (twshop.in/admin as a home-screen app): keeps the admin's own files on the phone,
   so it opens fast and still opens with a weak signal.
   - The admin page is always fetched online first (4 seconds at most), so updates arrive straight away.
   - Files with ?v=… never change (a new version gets a new ?v=), so the saved copy is used.
   - Shop data (Google Sheets, the admin script) and photos are never saved here.
   - If saving on the phone fails for any reason, it simply uses the internet, so the admin always opens. */
const CACHE = "kavyas-shop-v1";
const PAGE = "admin-page";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  // only this app's old copies (the customer website keeps its own files)
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith("kavyas-shop-") && k !== CACHE).map((k) => caches.delete(k))))
    .catch(() => {})
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return; // the admin script, fonts, photos: straight to the internet
  const handle = req.mode === "navigate" ? page
    : url.searchParams.has("v") ? versioned
    : /\.(png|jpg|ico|webmanifest)$/.test(url.pathname) ? onlineFirst : null;
  if (handle) e.respondWith(handle(req).catch(() => fetch(req)));
});

const save = (cache, key, res) => cache.put(key, res).catch(() => {});
const timeout = (ms) => new Promise((_, fail) => setTimeout(() => fail(new Error("slow")), ms));

// the admin page: the online copy, or the saved one when the internet is slow or off
async function page(req) {
  const cache = await caches.open(CACHE);
  const online = fetch(new Request(req.url, { cache: "no-cache", credentials: "same-origin" })).then((res) => {
    if (res.ok) save(cache, PAGE, res.clone());
    return res;
  });
  online.catch(() => {}); // offline: handled below
  try {
    return await Promise.race([online, timeout(4000)]);
  } catch (err) {
    return (await cache.match(PAGE).catch(() => null)) || online;
  }
}

// css/js?v=…: saved copy if there is one; a new version replaces the old one
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

// logo and icons: online copy, saved copy when offline
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
