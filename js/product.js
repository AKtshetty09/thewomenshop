(function () {
  const { esc, icon, money, discount, productCard, Bag, Wishlist, Orders, Recent, shareProduct, thumb, makeOrder, orderWhatsApp, toast, waLink, settingsReady, fillText, PLACEHOLDER } = window.TWS;
  const C = window.SHOP_CONFIG;
  const $ = (s) => document.querySelector(s);
  const id = new URLSearchParams(location.search).get("id");

  Promise.all([window.loadProducts(), settingsReady]).then(([products]) => {
    const p = products.find((x) => x.id === id);
    if (!p) {
      const failed = window.productsFailed;
      $("#pdp").innerHTML = `
        <div class="empty">
          ${icon("bag", "ico-xl")}
          <h4>${failed ? "Couldn't load this product" : "Product not found"}</h4>
          <p>${failed ? "Please check your internet connection and refresh the page." : "It may have been sold out or removed."}</p>
          <a class="btn" href="${failed ? "javascript:location.reload()" : "shop.html"}">${failed ? "Refresh" : "Continue shopping"}</a>
        </div>`;
      return;
    }

    Recent.add(p.id);
    setPageInfo(p);
    $("#crumbs").innerHTML = `<a href="index.html">Home</a> / <a href="shop.html?cat=${encodeURIComponent(p.category)}">${esc(p.category)}</a> / <span>${esc(p.name)}</span>`;

    const off = discount(p);
    const images = p.images.length ? p.images : [PLACEHOLDER];
    const available = p.sizes.filter((s) => !p.soldOutSizes.includes(s));
    // Pre-select when there is only one choice
    let size = !p.sizes.length ? "Free Size" : p.sizes.length === 1 ? available[0] || "" : "";
    let color = p.colors.length === 1 ? p.colors[0] : "";

    $("#pdp").innerHTML = `
      <div class="pdp">
        <div class="gallery">
          <div class="thumbs">${images.length > 1 ? images.map((src, i) => `<button class="${i ? "" : "active"}" data-img="${i}" aria-label="Image ${i + 1}"><img src="${esc(thumb(src))}" alt=""></button>`).join("") : ""}</div>
          <div class="main-img"><img id="main-img" src="${esc(images[0])}" alt="${esc(p.name)}" onerror="this.onerror=null;this.src='${PLACEHOLDER}'">
            ${images.length > 1 ? `
            <button class="gal-arrow prev" data-step="-1" aria-label="Previous photo">‹</button>
            <button class="gal-arrow next" data-step="1" aria-label="Next photo">›</button>
            <span class="gal-count" id="gal-count">1 / ${images.length}</span>` : ""}
          </div>
        </div>

        <div class="pdp-info">
          <div class="pdp-top">
            <p class="card-cat">${esc(p.category)} · Code ${esc(p.id)}</p>
            <button class="share-btn" id="share" aria-label="Share this product">${icon("share")} Share</button>
          </div>
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
              <h4>${p.sizes.length === 1 ? "Size" : "Select Size"}</h4>
              <a href="${waLink(`Hi! Can you help me with the size for ${p.name} (${p.id})?`)}" target="_blank" rel="noopener">Need size help?</a>
            </div>
            <div class="sizes" id="sizes">${p.sizes.map((s) => {
              const sold = p.soldOutSizes.includes(s);
              return `<button class="${s === size ? "active" : ""} ${sold ? "sold" : ""}" data-size="${esc(s)}" ${sold ? 'disabled title="Sold out"' : ""}>${esc(s)}</button>`;
            }).join("")}</div>
            ${p.soldOutSizes.length && p.inStock ? `<p class="opt-note">Crossed-out sizes are sold out. <a href="${waLink(`Hi! Is ${p.name} (${p.id}) coming back in size ${p.soldOutSizes.join("/")}?`)}" target="_blank" rel="noopener">Ask us about them</a></p>` : ""}
            <p class="size-error" id="size-error" hidden>Please select a size</p>
          </div>` : ""}

          ${p.colors.length ? `
          <div class="opt-block">
            <div class="opt-head"><h4>${p.colors.length > 1 ? "Select Colour" : "Colour"}</h4></div>
            <div class="sizes colors-pick" id="colors">${p.colors.map((c) => `<button class="${c === color ? "active" : ""}" data-color="${esc(c)}">${esc(c)}</button>`).join("")}</div>
            <p class="size-error" id="color-error" hidden>Please select a colour</p>
          </div>` : ""}

          <div class="actions">
            <button class="btn" id="add-bag" ${p.inStock ? "" : "disabled"}>${icon("bag")} Add to Bag</button>
            <button class="btn btn-outline btn-wish ${Wishlist.has(p.id) ? "active" : ""}" id="wish">${icon("heart")} Wishlist</button>
            <a class="btn btn-wa" id="wa-order" href="#" target="_blank" rel="noopener">${icon("whatsapp")} ${p.inStock ? "Buy now on WhatsApp" : "Notify me on WhatsApp"}</a>
          </div>
          ${C.policyNote ? `<p class="policy-note">${icon("info")} <span>${esc(C.policyNote)} · <a href="policies.html">Details</a></span></p>` : ""}

          <div class="pdp-promises">
            ${C.promises.map((x) => `<div class="promise"><div class="promise-ico">${icon(x.icon)}</div><div><h4>${esc(fillText(x.title))}</h4><p>${esc(fillText(x.text))}</p></div></div>`).join("")}
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
      const t = document.querySelector(`[data-img="${shown}"]`);
      if (t) t.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
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

    /* size & colour selection */
    function picker(el, onPick) {
      if (!el) return;
      el.addEventListener("click", (e) => {
        const b = e.target.closest("button:not([disabled])");
        if (!b) return;
        el.querySelectorAll("button").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        onPick(b);
      });
    }
    picker($("#sizes"), (b) => { size = b.dataset.size; $("#size-error").hidden = true; });
    picker($("#colors"), (b) => { color = b.dataset.color; $("#color-error").hidden = true; });

    // Returns true (and points at the missing choice) if size or colour is still needed
    function missingChoice() {
      const flag = (el, err) => {
        $(err).hidden = false;
        el.classList.remove("shake");
        void el.offsetWidth;
        el.classList.add("shake");
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        return true;
      };
      if (p.sizes.length && !size) return flag($("#sizes"), "#size-error");
      if (p.colors.length > 1 && !color) return flag($("#colors"), "#color-error");
      return false;
    }

    const waBtn = $("#wa-order");
    if (!p.inStock) waBtn.href = waLink(`Hi! Please notify me when ${p.name} (${p.id}) is back in stock.`);

    $("#add-bag").addEventListener("click", () => {
      if (missingChoice()) return;
      Bag.add(p.id, size || "Free Size", 1, color);
      toast("Added to bag 🛍️");
      window.TWS.openBag();
    });
    // Buy now: save the order to "My Orders", then the link opens WhatsApp
    waBtn.addEventListener("click", (e) => {
      if (!p.inStock) return;
      if (missingChoice()) return e.preventDefault();
      const order = makeOrder([{ p, size: size || "Free Size", color, qty: 1 }]);
      Orders.save(order);
      waBtn.href = orderWhatsApp(order);
      toast(`Order ${order.id} saved in My Orders`);
    });
    $("#wish").addEventListener("click", (e) => {
      const added = Wishlist.toggle(p.id);
      e.currentTarget.classList.toggle("active", added);
      toast(added ? "Added to wishlist ♥" : "Removed from wishlist");
    });
    $("#share").addEventListener("click", () => shareProduct(p));

    /* similar products */
    const similar = products.filter((x) => x.id !== p.id && x.category === p.category)
      .concat(products.filter((x) => x.id !== p.id && x.category !== p.category))
      .slice(0, 10);
    if (similar.length) {
      $("#similar").innerHTML = similar.map(productCard).join("");
      $("#similar-wrap").hidden = false;
    }

    /* recently viewed (other products this visitor opened before) */
    const recent = Recent.all().filter((x) => x !== p.id).map((x) => products.find((q) => q.id === x)).filter(Boolean).slice(0, 10);
    if (recent.length) {
      $("#recent").innerHTML = recent.map(productCard).join("");
      $("#recent-wrap").hidden = false;
    }
  });

  // Title, description and Google product details for this product
  function setPageInfo(p) {
    const desc = `${p.name}: ${money(p.price)}${p.fabric ? ` · ${p.fabric}` : ""}. ${p.description || ""}`.trim().slice(0, 160);
    document.title = `${p.name} | ${C.name}`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", desc);
    const canonical = document.createElement("link");
    canonical.rel = "canonical";
    canonical.href = `https://${C.domain}/product.html?id=${encodeURIComponent(p.id)}`;
    document.head.appendChild(canonical);

    const data = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      sku: p.id,
      image: p.images,
      description: p.description || p.name,
      category: p.category,
      brand: { "@type": "Brand", name: C.name },
      offers: {
        "@type": "Offer",
        url: canonical.href,
        priceCurrency: "INR",
        price: p.price,
        availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
      }
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }
})();
