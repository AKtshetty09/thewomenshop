(function () {
  const { esc, icon, money, discount, productCard, Bag, Wishlist, Orders, makeOrder, orderWhatsApp, toast, waLink, PLACEHOLDER } = window.TWS;
  const C = window.SHOP_CONFIG;
  const $ = (s) => document.querySelector(s);
  const id = new URLSearchParams(location.search).get("id");

  window.loadProducts().then((products) => {
    const p = products.find((x) => x.id === id);
    if (!p) {
      $("#pdp").innerHTML = `
        <div class="empty">
          ${icon("bag", "ico-xl")}
          <h4>Product not found</h4>
          <p>It may have been sold out or removed.</p>
          <a class="btn" href="shop.html">Continue shopping</a>
        </div>`;
      return;
    }

    document.title = `${p.name} | ${C.name}`;
    $("#crumbs").innerHTML = `<a href="index.html">Home</a> / <a href="shop.html?cat=${encodeURIComponent(p.category)}">${esc(p.category)}</a> / <span>${esc(p.name)}</span>`;

    const off = discount(p);
    const images = p.images.length ? p.images : [PLACEHOLDER];
    const oneSize = p.sizes.length <= 1;
    let size = oneSize ? p.sizes[0] || "Free Size" : "";

    $("#pdp").innerHTML = `
      <div class="pdp">
        <div class="gallery">
          <div class="thumbs">${images.length > 1 ? images.map((src, i) => `<button class="${i ? "" : "active"}" data-img="${i}" aria-label="Image ${i + 1}"><img src="${esc(src)}" alt=""></button>`).join("") : ""}</div>
          <div class="main-img"><img id="main-img" src="${esc(images[0])}" alt="${esc(p.name)}" onerror="this.onerror=null;this.src='${PLACEHOLDER}'">
            ${images.length > 1 ? `
            <button class="gal-arrow prev" data-step="-1" aria-label="Previous photo">‹</button>
            <button class="gal-arrow next" data-step="1" aria-label="Next photo">›</button>
            <span class="gal-count" id="gal-count">1 / ${images.length}</span>` : ""}
          </div>
        </div>

        <div class="pdp-info">
          <p class="card-cat">${esc(p.category)} · Code ${esc(p.id)}</p>
          <h1>${esc(p.name)}</h1>
          <div class="pdp-price">
            <strong>${money(p.price)}</strong>
            ${off ? `<s>MRP ${money(p.mrp)}</s><span class="off">(${off}% OFF)</span>` : ""}
          </div>
          <p class="tax-note">Inclusive of all taxes</p>
          ${p.inStock ? "" : '<span class="stock-out">Currently sold out. Message us to get notified when it\'s back.</span>'}

          ${p.sizes.length ? `
          <div class="opt-block">
            <div class="opt-head">
              <h4>${oneSize ? "Size" : "Select Size"}</h4>
              <a href="${waLink(`Hi! Can you help me with the size for ${p.name} (${p.id})?`)}" target="_blank" rel="noopener">Need size help?</a>
            </div>
            <div class="sizes" id="sizes">${p.sizes.map((s) => `<button class="${oneSize ? "active" : ""}" data-size="${esc(s)}">${esc(s)}</button>`).join("")}</div>
            <p class="size-error" id="size-error" hidden>Please select a size</p>
          </div>` : ""}

          ${p.colors.length ? `
          <div class="opt-block">
            <div class="opt-head"><h4>Colour</h4></div>
            <div class="colors">${p.colors.map((c) => `<span>${esc(c)}</span>`).join("")}</div>
          </div>` : ""}

          <div class="actions">
            <button class="btn" id="add-bag" ${p.inStock ? "" : "disabled"}>${icon("bag")} Add to Bag</button>
            <button class="btn btn-outline btn-wish ${Wishlist.has(p.id) ? "active" : ""}" id="wish">${icon("heart")} Wishlist</button>
            <a class="btn btn-wa" id="wa-order" href="#" target="_blank" rel="noopener">${icon("whatsapp")} ${p.inStock ? "Buy now on WhatsApp" : "Notify me on WhatsApp"}</a>
          </div>
          ${C.policyNote ? `<p class="policy-note">${icon("info")} <span>${esc(C.policyNote)} · <a href="policies.html">Details</a></span></p>` : ""}

          <div class="pdp-promises">
            ${C.promises.map((x) => `<div class="promise"><div class="promise-ico">${icon(x.icon)}</div><div><h4>${esc(x.title)}</h4><p>${esc(x.text)}</p></div></div>`).join("")}
          </div>

          <div class="details">
            <h4>Product Details</h4>
            ${p.description ? `<p>${esc(p.description)}</p>` : ""}
            <dl>
              ${p.fabric ? `<dt>Fabric</dt><dd>${esc(p.fabric)}</dd>` : ""}
              ${p.colors.length ? `<dt>Colour</dt><dd>${esc(p.colors.join(", "))}</dd>` : ""}
              ${p.sizes.length ? `<dt>Sizes</dt><dd>${esc(p.sizes.join(", "))}</dd>` : ""}
              <dt>Product code</dt><dd>${esc(p.id)}</dd>
            </dl>
          </div>
        </div>
      </div>`;

    /* gallery */
    const mainImg = $("#main-img");
    let shown = 0;
    function showImg(i) {
      shown = (i + images.length) % images.length;
      mainImg.src = images[shown];
      document.querySelectorAll("[data-img]").forEach((x) => x.classList.toggle("active", Number(x.dataset.img) === shown));
      const thumb = document.querySelector(`[data-img="${shown}"]`);
      if (thumb) thumb.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
      if ($("#gal-count")) $("#gal-count").textContent = `${shown + 1} / ${images.length}`;
    }
    document.querySelectorAll("[data-img]").forEach((b) => b.addEventListener("click", () => showImg(Number(b.dataset.img))));
    document.querySelectorAll("[data-step]").forEach((b) => b.addEventListener("click", (e) => {
      e.stopPropagation(); // don't open the full-screen view
      showImg(shown + Number(b.dataset.step));
    }));
    const box = $(".main-img");
    // swipe left/right on phones
    let touchX = null;
    box.addEventListener("touchstart", (e) => (touchX = e.touches[0].clientX), { passive: true });
    box.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - touchX;
      if (images.length > 1 && Math.abs(dx) > 40) showImg(shown + (dx < 0 ? 1 : -1));
    });
    box.addEventListener("mousemove", (e) => {
      if (e.target.closest(".gal-arrow")) return (mainImg.style.transform = "");
      const r = box.getBoundingClientRect();
      mainImg.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
      mainImg.style.transform = "scale(1.6)";
    });
    box.addEventListener("mouseleave", () => (mainImg.style.transform = ""));
    box.addEventListener("click", () => {
      $("#lightbox img").src = mainImg.src;
      $("#lightbox").classList.add("open");
    });
    $("#lightbox").addEventListener("click", () => $("#lightbox").classList.remove("open"));

    /* size selection */
    const waBtn = $("#wa-order");
    if (!p.inStock) waBtn.href = waLink(`Hi! Please notify me when ${p.name} (${p.id}) is back in stock.`);
    const sizesEl = $("#sizes");
    if (sizesEl) sizesEl.addEventListener("click", (e) => {
      const b = e.target.closest("[data-size]");
      if (!b) return;
      sizesEl.querySelectorAll("button").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      size = b.dataset.size;
      $("#size-error").hidden = true;
    });

    function needSize() {
      if (size || !p.sizes.length) return false;
      $("#size-error").hidden = false;
      sizesEl.classList.remove("shake");
      void sizesEl.offsetWidth;
      sizesEl.classList.add("shake");
      sizesEl.scrollIntoView({ behavior: "smooth", block: "center" });
      return true;
    }

    $("#add-bag").addEventListener("click", () => {
      if (needSize()) return;
      Bag.add(p.id, size || "Free Size");
      toast("Added to bag 🛍️");
      window.TWS.openBag();
    });
    // Buy now: save the order to "My Orders", then the link opens WhatsApp
    waBtn.addEventListener("click", (e) => {
      if (!p.inStock) return;
      if (needSize()) return e.preventDefault();
      const order = makeOrder([{ p, size: size || "Free Size", qty: 1 }]);
      Orders.save(order);
      waBtn.href = orderWhatsApp(order);
      toast(`Order ${order.id} saved in My Orders`);
    });
    $("#wish").addEventListener("click", (e) => {
      const added = Wishlist.toggle(p.id);
      e.currentTarget.classList.toggle("active", added);
      toast(added ? "Added to wishlist ♥" : "Removed from wishlist");
    });

    /* similar products */
    const similar = products.filter((x) => x.id !== p.id && x.category === p.category)
      .concat(products.filter((x) => x.id !== p.id && x.category !== p.category))
      .slice(0, 10);
    if (similar.length) {
      $("#similar").innerHTML = similar.map(productCard).join("");
      $("#similar-wrap").hidden = false;
    }
  });
})();
