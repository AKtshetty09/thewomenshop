/* =========================================================
   Shared: header, footer, bag, wishlist, product cards, helpers
   ========================================================= */
(function () {
  const C = window.SHOP_CONFIG;

  /* ---------- helpers ---------- */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => C.currency + Number(n).toLocaleString("en-IN");
  const discount = (p) => (p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0);
  const PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><rect width="300" height="400" fill="#fbe7ee"/><text x="150" y="205" font-family="Georgia" font-size="22" fill="#c2185b" text-anchor="middle">The Women Shop</text></svg>'
  );

  const ICONS = {
    search: '<path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4.35-4.35"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8Z"/>',
    bag: '<path d="M6 7h12l1 14H5L6 7Z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    truck: '<path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
    chat: '<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2-5.4A8.5 8.5 0 1 1 21 11.5Z"/>',
    refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3V2Z"/>',
    instagram: '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/>',
    whatsapp: '<path d="M3 21l1.7-5A9 9 0 1 1 8 19.4L3 21Z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 1c-1-.5-2.5-2-3-3l1-1-1-2L9 8.5Z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    filter: '<path d="M3 5h18M6 12h12M10 19h4"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z"/>',
    pin: '<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'
  };
  const icon = (name, cls = "") =>
    `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;

  /* ---------- storage: bag & wishlist ---------- */
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch (e) { return []; } };
  const write = (k, v) => { localStorage.setItem(k, JSON.stringify(v)); updateCounts(); };

  const Wishlist = {
    all: () => read("tws_wishlist"),
    has: (id) => read("tws_wishlist").includes(id),
    toggle(id) {
      const list = read("tws_wishlist");
      const i = list.indexOf(id);
      if (i >= 0) list.splice(i, 1); else list.push(id);
      write("tws_wishlist", list);
      return i < 0;
    }
  };

  // A bag line is one product in one size and colour
  const sameLine = (b, id, size, color) => b.id === id && b.size === size && (b.color || "") === (color || "");
  const Bag = {
    all: () => read("tws_bag"),
    add(id, size, qty = 1, color = "") {
      const bag = read("tws_bag");
      const item = bag.find((b) => sameLine(b, id, size, color));
      if (item) item.qty += qty; else bag.push({ id, size, color, qty });
      write("tws_bag", bag);
    },
    setQty(id, size, color, qty) {
      let bag = read("tws_bag");
      const item = bag.find((b) => sameLine(b, id, size, color));
      if (item) item.qty = qty;
      bag = bag.filter((b) => b.qty > 0);
      write("tws_bag", bag);
    },
    clear: () => write("tws_bag", []),
    count: () => read("tws_bag").reduce((n, b) => n + b.qty, 0)
  };

  // Recently viewed products (newest first)
  const Recent = {
    all: () => read("tws_recent"),
    add(id) { write("tws_recent", [id, ...read("tws_recent").filter((x) => x !== id)].slice(0, 12)); }
  };

  function updateCounts() {
    const bagN = Bag.count(), wishN = read("tws_wishlist").length;
    document.querySelectorAll("[data-bag-count]").forEach((el) => { el.textContent = bagN; el.hidden = !bagN; });
    document.querySelectorAll("[data-wish-count]").forEach((el) => { el.textContent = wishN; el.hidden = !wishN; });
  }

  /* ---------- WhatsApp / Instagram links ---------- */
  const pageLink = (p) => (location.protocol.startsWith("http") ? `${location.origin}${location.pathname.replace(/[^/]*$/, "")}product.html?id=${encodeURIComponent(p.id)}` : "");
  const waLink = (text) => `https://wa.me/${C.whatsappNumber}?text=${encodeURIComponent(text)}`;
  const igProfile = `https://www.instagram.com/${C.instagramHandle}/`;
  const igDM = `https://ig.me/m/${C.instagramHandle}`;

  /* ---------- orders (saved on this device) ---------- */
  const Orders = {
    all: () => read("tws_orders"),
    save(order) {
      const list = read("tws_orders").filter((o) => o.id !== order.id);
      list.unshift(order);
      write("tws_orders", list.slice(0, 50));
    },
    remove: (id) => write("tws_orders", read("tws_orders").filter((o) => o.id !== id))
  };

  // items: [{ p, size, color, qty }] -> an order snapshot (keeps name/price/photo even if the product is later removed)
  function makeOrder(items) {
    const d = new Date();
    const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const lines = items.map(({ p, size, color, qty }) => ({ id: p.id, name: p.name, image: p.images[0] || "", size, color: color || "", qty, price: p.price }));
    return {
      id: `TWS${ymd}-${Math.floor(1000 + Math.random() * 9000)}`,
      date: d.toISOString(),
      items: lines,
      total: lines.reduce((n, i) => n + i.price * i.qty, 0)
    };
  }

  function orderWhatsApp(order) {
    const lines = order.items.map((it, i) => {
      const link = pageLink(it);
      const colour = it.color ? ` | Colour: ${it.color}` : "";
      return `${i + 1}. *${it.name}* (${it.id})\n   Size: ${it.size}${colour} | Qty: ${it.qty} | ${money(it.price * it.qty)}` + (link ? `\n   ${link}` : "");
    });
    return waLink(
      `Hi ${C.name}! I'd like to place an order.\n*Order ID: ${order.id}*\n\n${lines.join("\n")}\n\n*Total: ${money(order.total)}*\n\nPlease share payment & delivery details.`
    );
  }

  /* ---------- share a product (phone share menu, or copy the link) ---------- */
  async function shareProduct(p) {
    const url = pageLink(p) || location.href;
    const data = { title: p.name, text: `${p.name}: ${money(p.price)} at ${C.name}`, url };
    if (navigator.share) {
      try { await navigator.share(data); } catch (e) { /* closed the share menu */ }
      return;
    }
    try { await navigator.clipboard.writeText(url); toast("Link copied. Paste it anywhere to share"); }
    catch (e) { window.open(waLink(`${data.text}\n${url}`), "_blank", "noopener"); }
  }

  /* ---------- toast ---------- */
  function toast(msg) {
    let t = document.querySelector(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  /* ---------- product card ---------- */
  const thumb = (url) => window.toThumbUrl(url);
  function productCard(p) {
    const off = discount(p);
    const wished = Wishlist.has(p.id);
    const badge = !p.inStock ? '<span class="badge badge-dark">Sold out</span>'
      : p.tag === "new" ? '<span class="badge">New</span>'
      : p.tag === "bestseller" ? '<span class="badge badge-gold">Bestseller</span>' : "";
    const img2 = p.images[1] ? `<img class="img-alt" src="${esc(thumb(p.images[1]))}" alt="" loading="lazy">` : "";
    return `
      <article class="card ${p.inStock ? "" : "is-soldout"}">
        <a class="card-media" href="product.html?id=${encodeURIComponent(p.id)}">
          <img src="${esc(thumb(p.images[0]) || PLACEHOLDER)}" alt="${esc(p.name)}" loading="lazy" onerror="this.onerror=null;this.src='${PLACEHOLDER}'">
          ${img2}
          ${badge}
        </a>
        <button class="wish-btn ${wished ? "active" : ""}" data-wish="${esc(p.id)}" aria-label="Add to wishlist">${icon("heart")}</button>
        <a class="card-body" href="product.html?id=${encodeURIComponent(p.id)}">
          <p class="card-cat">${esc(p.category)}</p>
          <h3 class="card-title">${esc(p.name)}</h3>
          <p class="price">
            <strong>${money(p.price)}</strong>
            ${off ? `<s>${money(p.mrp)}</s><span class="off">(${off}% OFF)</span>` : ""}
          </p>
        </a>
      </article>`;
  }

  // One listener handles every wishlist heart on the page
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-wish]");
    if (!btn) return;
    e.preventDefault();
    const added = Wishlist.toggle(btn.dataset.wish);
    document.querySelectorAll(`[data-wish="${CSS.escape(btn.dataset.wish)}"]`).forEach((b) => b.classList.toggle("active", added));
    toast(added ? "Added to wishlist ♥" : "Removed from wishlist");
    document.dispatchEvent(new CustomEvent("wishlist:change"));
  });

  /* ---------- header ---------- */
  function renderHeader() {
    const el = document.getElementById("site-header");
    if (!el) return;
    const catLinks = C.categories.map((c) => `<a href="shop.html?cat=${encodeURIComponent(c)}">${esc(c)}</a>`).join("");
    el.outerHTML = `
      <div class="announce"><div class="announce-track" id="announce-track">${C.announcements.map(announceItem).join("")}</div></div>
      <header class="site-header">
        <div class="container header-inner">
          <button class="icon-btn menu-btn" data-open-menu aria-label="Open menu">${icon("menu")}</button>
          ${logoHtml()}
          <nav class="main-nav" aria-label="Main">
            <a href="shop.html?tag=new" class="nav-new">New In</a>
            ${catLinks}
          </nav>
          <form class="search" action="shop.html" role="search">
            ${icon("search")}
            <input name="q" type="search" placeholder="Search anarkalis, kurtis, sarees…" aria-label="Search products">
          </form>
          <div class="header-actions">
            <a class="icon-btn" href="wishlist.html" aria-label="Wishlist">${icon("heart")}<span class="count" data-wish-count hidden></span><small>Wishlist</small></a>
            <a class="icon-btn" href="orders.html" aria-label="My Orders">${icon("box")}<small>Orders</small></a>
            <button class="icon-btn" data-open-bag aria-label="Bag">${icon("bag")}<span class="count" data-bag-count hidden></span><small>Bag</small></button>
          </div>
        </div>
      </header>
      <div class="drawer-backdrop" data-close-drawers></div>
      <aside class="drawer drawer-left" id="menu-drawer" aria-label="Menu">
        <div class="drawer-head">${logoHtml()}<button class="icon-btn" data-close-drawers aria-label="Close">${icon("close")}</button></div>
        <nav class="mobile-nav">
          <a href="index.html">Home</a>
          <a href="shop.html?tag=new">New In</a>
          <a href="shop.html">Shop All</a>
          ${catLinks}
          <a href="wishlist.html">My Wishlist</a>
          <a href="orders.html">My Orders</a>
          <a href="policies.html">About &amp; Policies</a>
        </nav>
        <div class="drawer-foot">
          <a href="${igProfile}" target="_blank" rel="noopener">${icon("instagram")} @${esc(C.instagramHandle)}</a>
          <a href="${waLink("Hi " + C.name + "!")}" target="_blank" rel="noopener">${icon("whatsapp")} ${esc(C.phone)}</a>
          ${C.facebookUrl ? `<a href="${esc(C.facebookUrl)}" target="_blank" rel="noopener">${icon("facebook")} Facebook</a>` : ""}
        </div>
      </aside>
      <aside class="drawer drawer-right" id="bag-drawer" aria-label="Shopping bag">
        <div class="drawer-head"><h3>My Bag</h3><button class="icon-btn" data-close-drawers aria-label="Close">${icon("close")}</button></div>
        <div class="bag-body" id="bag-body"></div>
      </aside>`;

    // highlight current menu link
    const here = location.pathname.split("/").pop() + location.search;
    document.querySelectorAll(".main-nav a").forEach((a) => { if (a.getAttribute("href") === here) a.classList.add("active"); });
    const q = new URLSearchParams(location.search).get("q");
    if (q) document.querySelector(".search input").value = q;
  }

  // Logo image from config.js, or the shop name as text if no logo is set
  function logoHtml(extra = "") {
    const [first, last] = splitName(C.name);
    return C.logo
      ? `<a class="logo logo-has-img ${extra}" href="index.html"><img src="${esc(C.logo)}" alt="${esc(C.name)}"></a>`
      : `<a class="logo ${extra}" href="index.html">${esc(first)} <span>${esc(last)}</span></a>`;
  }

  function announceItem(a) {
    const { text, link } = typeof a === "string" ? { text: a } : a;
    if (!link) return `<span>${esc(text)}</span>`;
    const href = link === "whatsapp" ? waLink(`Hi ${C.name}!`) : link;
    const ext = /^https?:/.test(href) ? ' target="_blank" rel="noopener"' : "";
    return `<span><a href="${esc(href)}"${ext}>${esc(text)}</a></span>`;
  }

  function splitName(name) {
    const parts = name.trim().split(" ");
    const last = parts.length > 1 ? parts.pop() : "";
    return [parts.join(" "), last];
  }

  /* ---------- drawers ---------- */
  function openDrawer(id) {
    document.getElementById(id).classList.add("open");
    document.querySelector(".drawer-backdrop").classList.add("open");
    document.body.classList.add("no-scroll");
  }
  function closeDrawers() {
    document.querySelectorAll(".drawer.open, .drawer-backdrop.open").forEach((d) => d.classList.remove("open"));
    document.body.classList.remove("no-scroll");
  }
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-open-menu]")) openDrawer("menu-drawer");
    else if (e.target.closest("[data-open-bag]")) { renderBag(); openDrawer("bag-drawer"); }
    else if (e.target.closest("[data-close-drawers]")) closeDrawers();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawers(); });

  /* ---------- bag drawer ---------- */
  let bagItems = [];
  async function renderBag() {
    const body = document.getElementById("bag-body");
    const products = await window.loadProducts();
    const items = Bag.all()
      .map((b) => ({ ...b, p: products.find((p) => p.id === b.id) }))
      .filter((b) => b.p);
    bagItems = items;

    if (!items.length) {
      body.innerHTML = `
        <div class="empty">
          ${icon("bag", "ico-xl")}
          <h4>Your bag is empty</h4>
          <p>Add your favourite styles and order in one message.</p>
          <a class="btn" href="shop.html">Start shopping</a>
        </div>`;
      return;
    }

    const mrpTotal = items.reduce((n, i) => n + i.p.mrp * i.qty, 0);
    const total = items.reduce((n, i) => n + i.p.price * i.qty, 0);
    body.innerHTML = `
      <ul class="bag-list">
        ${items.map(({ p, size, color, qty }) => `
          <li class="bag-item">
            <a href="product.html?id=${encodeURIComponent(p.id)}"><img src="${esc(thumb(p.images[0]) || PLACEHOLDER)}" alt="${esc(p.name)}"></a>
            <div>
              <h4>${esc(p.name)}</h4>
              <p class="muted">Size: ${esc(size)}${color ? ` · Colour: ${esc(color)}` : ""}</p>
              <p class="price"><strong>${money(p.price)}</strong>${p.mrp > p.price ? `<s>${money(p.mrp)}</s>` : ""}</p>
              <div class="qty" data-id="${esc(p.id)}" data-size="${esc(size)}" data-color="${esc(color || "")}">
                <button data-qty="-1" aria-label="Decrease">−</button><span>${qty}</span><button data-qty="1" aria-label="Increase">+</button>
                <button class="remove" data-qty="remove" aria-label="Remove">${icon("trash")}</button>
              </div>
            </div>
          </li>`).join("")}
      </ul>
      <div class="bag-summary">
        <div class="row"><span>Total MRP</span><span>${money(mrpTotal)}</span></div>
        ${mrpTotal > total ? `<div class="row save"><span>Discount</span><span>−${money(mrpTotal - total)}</span></div>` : ""}
        <div class="row total"><span>Total</span><span>${money(total)}</span></div>
        <a class="btn btn-wa btn-block" href="#" data-checkout target="_blank" rel="noopener">${icon("whatsapp")} Order on WhatsApp</a>
        <a class="btn btn-outline btn-block" href="${igDM}" target="_blank" rel="noopener">${icon("instagram")} Order via Instagram DM</a>
        <p class="muted small center">We'll confirm availability, payment & delivery in chat.</p>
        ${C.policyNote ? `<p class="policy-note">${icon("info")} <span>${esc(C.policyNote)} · <a href="policies.html">Details</a></span></p>` : ""}
      </div>`;
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-qty]");
    if (!b) return;
    const box = b.closest(".qty");
    const item = Bag.all().find((i) => sameLine(i, box.dataset.id, box.dataset.size, box.dataset.color));
    if (!item) return;
    const v = b.dataset.qty;
    Bag.setQty(item.id, item.size, item.color, v === "remove" ? 0 : Math.max(0, Math.min(10, item.qty + Number(v))));
    renderBag();
  });

  // Checkout: save the order, let the link open WhatsApp, then empty the bag
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-checkout]");
    if (!a) return;
    if (!bagItems.length) return e.preventDefault();
    const order = makeOrder(bagItems);
    Orders.save(order);
    a.href = orderWhatsApp(order);
    setTimeout(() => { Bag.clear(); renderBag(); toast(`Order ${order.id} saved in My Orders`); }, 300);
  });

  /* ---------- reviews: stars, cards and the "Write a review" box ---------- */
  const stars = (n) => `<span class="stars" aria-label="${n} out of 5 stars">${"★".repeat(n)}<span class="stars-off">${"★".repeat(5 - n)}</span></span>`;

  function reviewCard(r) {
    return `
      <figure class="review">
        ${r.photo ? `<img src="${esc(thumb(r.photo))}" alt="Photo from ${esc(r.name)}" loading="lazy">` : ""}
        ${r.rating ? stars(r.rating) : ""}
        <blockquote>“${esc(r.text)}”</blockquote>
        <figcaption><strong>${esc(r.name)}</strong>${r.city ? `<span>${esc(r.city)}</span>` : ""}</figcaption>
      </figure>`;
  }

  // opts: { product, productName, order }
  function openReviewForm(opts = {}) {
    let modal = document.getElementById("review-modal");
    if (!modal) {
      document.body.insertAdjacentHTML("beforeend", `
        <div class="modal" id="review-modal" role="dialog" aria-modal="true" aria-labelledby="review-title">
          <div class="modal-box">
            <button class="icon-btn modal-close" data-close-review aria-label="Close">${icon("close")}</button>
            <form id="review-form" novalidate>
              <h3 id="review-title">Write a review</h3>
              <p class="muted small">Loved your outfit? Tell us in 30 seconds. Your review helps other women shop with confidence 💖</p>
              <p class="review-for" id="review-for"></p>
              <label class="field-label">Your rating *</label>
              <div class="star-pick" id="star-pick" role="radiogroup" aria-label="Rating">
                ${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}" aria-label="${n} star${n > 1 ? "s" : ""}">★</button>`).join("")}
              </div>
              <label class="field-label" for="rv-name">Your name *</label>
              <input class="field" id="rv-name" maxlength="40" autocomplete="name">
              <label class="field-label" for="rv-city">City</label>
              <input class="field" id="rv-city" maxlength="40" autocomplete="address-level2">
              <label class="field-label" for="rv-text">Your review *</label>
              <textarea class="field" id="rv-text" rows="4" maxlength="600" placeholder="How was the fabric, fit and colour?"></textarea>
              <input class="hp" id="rv-website" tabindex="-1" autocomplete="off" aria-hidden="true">
              <p class="size-error" id="rv-error" hidden></p>
              <button class="btn btn-block" type="submit" id="rv-submit">Submit review</button>
            </form>
            <div class="review-done" id="review-done" hidden>
              <div class="done-ico">💖</div>
              <h3>Thank you!</h3>
              <p class="muted">Your review has been sent. Thank you for shopping with The Women Shop!</p>
              <button class="btn" type="button" data-close-review>Done</button>
            </div>
          </div>
        </div>`);
      modal = document.getElementById("review-modal");
      const form = document.getElementById("review-form");
      let rating = 0;
      const paint = (n) => modal.querySelectorAll("[data-star]").forEach((b) => b.classList.toggle("on", Number(b.dataset.star) <= n));
      modal.addEventListener("click", (e) => {
        const st = e.target.closest("[data-star]");
        if (st) { rating = Number(st.dataset.star); paint(rating); }
        if (e.target === modal || e.target.closest("[data-close-review]")) modal.classList.remove("open");
      });
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const err = document.getElementById("rv-error");
        const val = (id) => document.getElementById(id).value.trim();
        const fail = (msg) => { err.textContent = msg; err.hidden = false; };
        if (val("rv-website")) return; // filled only by spam bots
        if (!rating) return fail("Please tap the stars to choose a rating");
        if (!val("rv-name")) return fail("Please enter your name");
        if (val("rv-text").length < 10) return fail("Please write a few more words about your purchase");
        err.hidden = true;

        const f = C.reviewForm.fields;
        const body = new URLSearchParams({
          [f.name]: val("rv-name"), [f.city]: val("rv-city"), [f.rating]: String(rating),
          [f.review]: val("rv-text"), [f.order]: modal.dataset.order || "", [f.product]: modal.dataset.product || ""
        });
        const btn = document.getElementById("rv-submit");
        btn.disabled = true; btn.textContent = "Sending…";
        try {
          // Google Forms doesn't allow reading the reply from another website, so a sent request counts as success
          await fetch(C.reviewForm.action, { method: "POST", mode: "no-cors", body });
          form.hidden = true;
          document.getElementById("review-done").hidden = false;
          form.reset(); rating = 0; paint(0);
        } catch (x) {
          fail("Couldn't send your review. Please check your internet and try again.");
        } finally {
          btn.disabled = false; btn.textContent = "Submit review";
        }
      });
    }
    modal.dataset.product = opts.product || "";
    modal.dataset.order = opts.order || "";
    document.getElementById("review-for").textContent = opts.productName ? `For: ${opts.productName}` : "";
    document.getElementById("review-form").hidden = false;
    document.getElementById("review-done").hidden = true;
    document.getElementById("rv-error").hidden = true;
    modal.classList.add("open");
    setTimeout(() => modal.querySelector("[data-star]").focus(), 50);
  }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") document.getElementById("review-modal")?.classList.remove("open"); });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-write-review]");
    if (b) openReviewForm({ product: b.dataset.product, productName: b.dataset.productName, order: b.dataset.order });
  });

  /* ---------- footer ---------- */
  function renderFooter() {
    const el = document.getElementById("site-footer");
    if (!el) return;
    el.outerHTML = `
      <footer class="site-footer">
        <div class="container footer-grid">
          <div>
            ${logoHtml("logo-light")}
            <p class="footer-about">${esc(C.tagline)} ✨ Handpicked kurtis, anarkalis, sarees and dresses, quality checked and delivered all over India.</p>
            <div class="socials">
              <a href="${igProfile}" target="_blank" rel="noopener" aria-label="Instagram">${icon("instagram")}</a>
              <a href="${waLink("Hi " + C.name + "!")}" target="_blank" rel="noopener" aria-label="WhatsApp">${icon("whatsapp")}</a>
              ${C.facebookUrl ? `<a href="${esc(C.facebookUrl)}" target="_blank" rel="noopener" aria-label="Facebook">${icon("facebook")}</a>` : ""}
              ${C.email ? `<a href="mailto:${esc(C.email)}" aria-label="Email">${icon("mail")}</a>` : ""}
            </div>
          </div>
          <div>
            <h4>Shop</h4>
            <a href="shop.html?tag=new">New Arrivals</a>
            <a href="shop.html?tag=bestseller">Bestsellers</a>
            ${C.categories.slice(0, 5).map((c) => `<a href="shop.html?cat=${encodeURIComponent(c)}">${esc(c)}</a>`).join("")}
          </div>
          <div>
            <h4>Help</h4>
            <a href="orders.html">My Orders</a>
            <a href="${waLink("Hi! I need help choosing a size.")}" target="_blank" rel="noopener">Size help</a>
            <a href="policies.html#shipping">Shipping</a>
            <a href="policies.html#exchange">Damaged item exchange</a>
            <a href="policies.html">About &amp; Policies</a>
            <a href="policies.html#privacy">Privacy</a>
          </div>
          <div>
            <h4>Contact</h4>
            <a href="${waLink("Hi " + C.name + "!")}" target="_blank" rel="noopener">${icon("whatsapp")} ${esc(C.phone)}</a>
            <a href="${igProfile}" target="_blank" rel="noopener">${icon("instagram")} @${esc(C.instagramHandle)}</a>
            ${C.facebookUrl ? `<a href="${esc(C.facebookUrl)}" target="_blank" rel="noopener">${icon("facebook")} Facebook</a>` : ""}
            ${C.email ? `<a href="mailto:${esc(C.email)}">${icon("mail")} ${esc(C.email)}</a>` : ""}
            <a href="${esc(C.mapsUrl)}" target="_blank" rel="noopener">${icon("pin")} ${esc(C.location)}</a>
          </div>
        </div>
        <div class="footer-bottom container">
          <span>© ${new Date().getFullYear()} ${esc(C.name)} · ${esc(C.domain)}</span>
          <a href="policies.html">${esc(C.policyNote)}</a>
        </div>
      </footer>
      <a class="wa-float" href="${waLink("Hi " + C.name + "!")}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">${icon("whatsapp")}</a>`;
  }

  /* ---------- values from the sheet's Settings tab ---------- */
  // "Delivery in {shipping}" → "Delivery in 7–8 working days"
  const fillText = (t) => String(t).replace(/\{shipping\}/g, C.shippingTime);

  // Banner "shows": a category name, "new", "bestseller", "all", or a full link
  function bannerLink(v) {
    const t = v.trim();
    if (/^(https?:|shop\.html|product\.html|policies\.html|index\.html)/i.test(t)) return t;
    if (/^(new|new arrivals)$/i.test(t)) return "shop.html?tag=new";
    if (/^bestsellers?$/i.test(t)) return "shop.html?tag=bestseller";
    if (/^all$/i.test(t)) return "shop.html";
    return `shop.html?cat=${encodeURIComponent(t)}`;
  }

  function applySettings(s) {
    if (s.instagram_followers) C.instagramFollowers = s.instagram_followers.replace(/\+$/, "");
    if (s.shipping_time) C.shippingTime = s.shipping_time;
    C.announcements.forEach((a, i) => {
      const text = s[`announcement_${i + 1}`];
      if (text) C.announcements[i] = typeof a === "string" ? text : { ...a, text };
    });
    C.heroSlides.forEach((slide, i) => {
      const get = (k) => s[`banner_${i + 1}_${k}`];
      if (get("image")) slide.image = window.toImageUrl(get("image"));
      // *word* in the heading is shown in pink italics
      if (get("heading")) slide.title = esc(get("heading")).replace(/\*(.+?)\*/g, "<em>$1</em>");
      if (get("small_text")) slide.eyebrow = get("small_text");
      if (get("text")) slide.text = get("text");
      if (get("button")) slide.button = get("button");
      if (get("shows")) slide.link = bannerLink(get("shows"));
    });
  }

  function fillSettings() {
    document.querySelectorAll("[data-followers]").forEach((el) => (el.textContent = `${C.instagramFollowers}+`));
    document.querySelectorAll("[data-shipping]").forEach((el) => (el.textContent = C.shippingTime));
    const track = document.getElementById("announce-track");
    if (track) track.innerHTML = C.announcements.map(announceItem).join("");
  }

  // Resolves once the Settings tab is applied (or after 2.5s, so a slow sheet never blocks the page)
  const settingsReady = Promise.race([
    window.loadSettings(),
    new Promise((resolve) => setTimeout(() => resolve({}), 2500))
  ]).then((s) => { applySettings(s); fillSettings(); return s; });

  /* ---------- init ---------- */
  renderHeader();
  renderFooter();
  // Show config.js values straight away; settingsReady updates them from the sheet
  fillSettings();
  updateCounts();
  window.addEventListener("storage", updateCounts);

  window.TWS = { esc, money, discount, icon, productCard, Bag, Wishlist, toast, Orders, Recent, shareProduct, thumb, stars, reviewCard, openReviewForm, makeOrder, orderWhatsApp, settingsReady, fillText, igDM, igProfile, waLink, openBag: () => { renderBag(); openDrawer("bag-drawer"); }, PLACEHOLDER };
})();
