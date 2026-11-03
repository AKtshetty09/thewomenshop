(function () {
  const { esc, icon, money, discount, productCard, Bag, Wishlist, Orders, Recent, shareProduct, thumb, track, shippingLine, swatch, stars, reviewCard, makeOrder, orderWhatsApp, toast, waLink, settingsReady, fillText, PLACEHOLDER } = window.TWS;
  const C = window.SHOP_CONFIG;
  const $ = (s) => document.querySelector(s);
  const params = new URLSearchParams(location.search);
  // twshop.in/p/TWS001(-colour) pages set PRODUCT_ID / PRODUCT_COLOR; product.html?id=TWS001&c=colour uses the link
  const id = window.PRODUCT_ID || params.get("id");
  let wanted = window.PRODUCT_COLOR || params.get("c") || "";

  Promise.all([window.loadProducts(), settingsReady]).then(([products]) => {
    let p = products.find((x) => x.id === id);
    // twshop.in/p/TWS001-rust-orange shared before its own page was made
    if (!p && id) {
      for (const q of products.slice().sort((a, b) => b.id.length - a.id.length)) {
        if (!id.startsWith(`${q.id}-`)) continue;
        const v = q.variants.find((x) => window.colorSlug(x.color) === id.slice(q.id.length + 1));
        if (v) { p = q; wanted = v.color; break; }
      }
    }
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

    const multi = p.variants.length > 1;
    // the colour from the link (name or link form), else the first colour in stock
    const fromLink = wanted && p.variants.find((v) => v.key === window.colorKey(wanted) || window.colorSlug(v.color) === window.colorSlug(wanted));
    let variant = fromLink || p.variants.find((v) => v.inStock) || p.variants[0];
    // Colour buttons show each colour's photo when colours have their own photos
    const photoPick = multi && new Set(p.variants.map((v) => v.images[0])).size > 1;
    let size = "";

    Recent.add(p.id);
    $("#crumbs").innerHTML = `<a href="index.html">Home</a> / <a href="shop.html?cat=${encodeURIComponent(p.category)}">${esc(p.category)}</a> / <span>${esc(p.name)}</span>`;

    $("#pdp").innerHTML = `
      <div class="pdp">
        <div class="gallery" id="gallery"></div>

        <div class="pdp-info">
          <div class="pdp-top">
            <p class="card-cat">${esc(p.category)} · Code ${esc(p.id)}</p>
            <button class="share-btn" id="share" aria-label="Share this product">${icon("share")} Share</button>
          </div>
          <h1>${esc(p.name)}</h1>
          <div class="pdp-price" id="price"></div>
          <p class="tax-note">Inclusive of all taxes</p>
          <p class="ship-note">${icon("truck")} <span>Shipping: ${esc(shippingLine())} · more items: by weight, confirmed on WhatsApp</span></p>
          <div id="stock-notes"></div>

          ${p.colors.length ? `
          <div class="opt-block">
            <div class="opt-head">
              <h4>Colour: <span class="opt-value" id="color-name"></span></h4>
              ${multi ? `<span class="muted small">${p.variants.length} colours</span>` : ""}
            </div>
            <div class="${photoPick ? "variant-pick" : "sizes colors-pick"}" id="colors" role="radiogroup" aria-label="Colour">
              ${p.variants.map((v) => photoPick ? `
                <button type="button" class="vp" data-key="${esc(v.key)}" role="radio" aria-label="${esc(v.color)}${v.inStock ? "" : " (sold out)"}">
                  ${v.shownIn
                    ? `<span class="vp-img vp-dot">${swatch(v.color, v.code, "big")}</span>`
                    : `<span class="vp-img"><img src="${esc(thumb(v.images[0]) || PLACEHOLDER)}" alt="" loading="lazy"></span>`}
                  <span class="vp-name">${esc(v.color)}</span>
                </button>` : `
                <button type="button" data-key="${esc(v.key)}" role="radio">${swatch(v.color, v.code)} ${esc(v.color)}</button>`).join("")}
            </div>
          </div>` : ""}

          ${p.sizes.length ? `
          <div class="opt-block">
            <div class="opt-head">
              <h4>${p.sizes.length === 1 ? "Size" : "Select Size"}</h4>
              <a href="assets/size-chart.jpg" id="size-chart">Size chart</a>
            </div>
            <div class="sizes" id="sizes" role="radiogroup" aria-label="Size">
              ${p.sizes.map((s) => `<button type="button" data-size="${esc(s)}" role="radio">${esc(s)}</button>`).join("")}
            </div>
            <p class="opt-note" id="size-note" hidden></p>
            <p class="size-error" id="size-error" hidden>Please select a size</p>
          </div>` : ""}

          <div class="actions">
            <button class="btn" id="add-bag">${icon("bag")} Add to Bag</button>
            <button class="btn btn-outline btn-wish ${Wishlist.has(p.id) ? "active" : ""}" id="wish">${icon("heart")} Wishlist</button>
            <a class="btn btn-wa" id="wa-order" href="#" target="_blank" rel="noopener"></a>
          </div>
          ${C.policyNote ? `<p class="policy-note">${icon("info")} <span>${esc(C.policyNote)} · <a href="policies.html">Details</a></span></p>` : ""}

          <div class="pdp-promises">
            ${C.promises.map((x) => `<${x.wa ? `a class="promise promise-link" href="${esc(waLink(x.wa))}" target="_blank" rel="noopener"` : 'div class="promise"'}><div class="promise-ico">${icon(x.icon)}</div><div><h4>${esc(fillText(x.title))}</h4><p>${esc(fillText(x.text))}</p></div></${x.wa ? "a" : "div"}>`).join("")}
          </div>

          <div class="details">
            <h4>Product Details</h4>
            ${p.description ? `<p>${esc(p.description)}</p>` : ""}
            <dl>
              ${p.details.map((d) => `<dt>${esc(d.label)}</dt><dd>${esc(d.value)}</dd>`).join("")}
              <dt>Product code</dt><dd>${esc(p.id)}</dd>
            </dl>
          </div>
        </div>
      </div>`;

    /* ---------- gallery (rebuilt when the colour changes) ---------- */
    let images = [], shown = 0;
    const gallery = $("#gallery");
    function setImages(list) {
      images = list.length ? list : [PLACEHOLDER];
      shown = 0;
      gallery.innerHTML = `
        <div class="thumbs">${images.length > 1 ? images.map((src, i) => `<button class="${i ? "" : "active"}" data-img="${i}" aria-label="Photo ${i + 1}"><img src="${esc(thumb(src))}" alt=""></button>`).join("") : ""}</div>
        <div class="main-img"><img id="main-img" src="${esc(images[0])}" alt="${esc(p.name)}${variant.color ? ` – ${esc(variant.color)}` : ""}" onerror="this.onerror=null;this.src='${PLACEHOLDER}'">
          ${images.length > 1 ? `
          <button class="gal-arrow prev" data-step="-1" aria-label="Previous photo">‹</button>
          <button class="gal-arrow next" data-step="1" aria-label="Next photo">›</button>
          <span class="gal-count" id="gal-count">1 / ${images.length}</span>` : ""}
          ${variant.shownIn ? `<span class="shown-in">Shown in ${esc(variant.shownIn)} · ${esc(variant.color)} photos coming soon</span>` : ""}
        </div>`;
    }
    function showImg(i) {
      shown = (i + images.length) % images.length;
      $("#main-img").src = images[shown];
      gallery.querySelectorAll("[data-img]").forEach((x) => x.classList.toggle("active", Number(x.dataset.img) === shown));
      const t = gallery.querySelector(`[data-img="${shown}"]`);
      if (t) t.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
      if ($("#gal-count")) $("#gal-count").textContent = `${shown + 1} / ${images.length}`;
    }
    // one set of listeners on the gallery box, so they keep working after the photos change
    gallery.addEventListener("click", (e) => {
      const t = e.target.closest("[data-img]");
      const step = e.target.closest("[data-step]");
      if (t) return showImg(Number(t.dataset.img));
      if (step) return showImg(shown + Number(step.dataset.step));
      if (e.target.closest(".main-img")) {
        $("#lightbox img").src = $("#main-img").src;
        $("#lightbox").classList.add("open");
      }
    });
    let touchX = null;
    gallery.addEventListener("touchstart", (e) => { if (e.target.closest(".main-img")) touchX = e.touches[0].clientX; }, { passive: true });
    gallery.addEventListener("touchend", (e) => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (images.length > 1 && Math.abs(dx) > 40) showImg(shown + (dx < 0 ? 1 : -1));
    });
    gallery.addEventListener("mousemove", (e) => {
      const img = $("#main-img"), box = e.target.closest(".main-img");
      if (!img) return;
      if (!box || e.target.closest(".gal-arrow")) return (img.style.transform = "");
      const r = box.getBoundingClientRect();
      img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
      img.style.transform = "scale(1.6)";
    });
    gallery.addEventListener("mouseleave", () => { const img = $("#main-img"); if (img) img.style.transform = ""; });
    $("#lightbox").addEventListener("click", () => $("#lightbox").classList.remove("open"));
    // "Size chart": the chart picture in the same full-screen viewer (tap anywhere to close)
    $("#size-chart")?.addEventListener("click", (e) => {
      e.preventDefault();
      $("#lightbox img").src = "assets/size-chart.jpg";
      $("#lightbox").classList.add("open");
      track("size-chart-open", { product: p.id });
    });

    const joinAnd = (a) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);
    const inColour = (v) => (multi && v.color ? ` in ${v.color}` : "");
    const notifyLink = (v, sizes) => waLink(`Hi! Please let me know when ${p.name} (${p.id})${inColour(v)}${sizes.length ? `, size ${sizes.join("/")}` : ""} is back in stock.`);

    /* ---------- show everything for the chosen colour ---------- */
    const waBtn = $("#wa-order");
    function setVariant(v, { fromUser = false } = {}) {
      variant = v;
      setImages(v.images);

      const off = discount(v);
      $("#price").innerHTML = `<strong>${money(v.price)}</strong>${off ? `<s>MRP ${money(v.mrp)}</s><span class="off">(${off}% OFF)</span>` : ""}`;
      $("#stock-notes").innerHTML =
        (v.madeToOrder ? `<p class="mto-note">${icon("info")} <span>${esc(C.madeToOrderText)}</span></p>` : "") +
        "";

      // colour buttons
      if ($("#colors")) {
        $("#color-name").textContent = v.color;
        $("#colors").querySelectorAll("[data-key]").forEach((b) => {
          const x = p.variants.find((y) => y.key === b.dataset.key);
          b.classList.toggle("active", x === v);
          b.classList.toggle("sold", multi && !x.inStock); // only mark a colour sold out when there are others to pick
          b.setAttribute("aria-checked", x === v);
        });
      }

      // sizes for this colour: sizes it doesn't come in, or has sold out of, are crossed out
      if ($("#sizes")) {
        if (p.sizes.length === 1 && v.available.length === 1) size = v.available[0];
        else if (size && !v.available.includes(size)) size = "";
        $("#sizes").querySelectorAll("[data-size]").forEach((b) => {
          const ok = v.available.includes(b.dataset.size);
          b.classList.toggle("sold", !ok);
          b.disabled = !ok;
          b.title = ok ? "" : "Sold out";
          b.classList.toggle("active", b.dataset.size === size);
          b.setAttribute("aria-checked", b.dataset.size === size);
        });
        const soldOut = v.made.filter((s) => !v.available.includes(s)); // made in this colour, but run out
        const note = $("#size-note");
        // only a short note when this colour isn't made in every size (sold-out sizes are just crossed out)
        note.hidden = !v.inStock || soldOut.length > 0 || v.made.length === p.sizes.length;
        if (!note.hidden) {
          note.innerHTML = `<span>${esc(v.color || "This style")} comes in ${v.made.length === 1 ? "size" : "sizes"} <strong>${esc(joinAnd(v.made))}</strong>.</span>`;
        }
        $("#size-error").hidden = true;
      }

      // buttons
      $("#add-bag").disabled = !v.inStock;
      waBtn.innerHTML = `${icon("whatsapp")} ${v.inStock ? "Buy now on WhatsApp" : "Notify me on WhatsApp"}`;
      waBtn.href = v.inStock ? "#" : notifyLink(v, []);

      setPageInfo(p, v);
      if (fromUser && multi) {
        // keep the chosen colour in the address, so refresh/back/share keep it
        history.replaceState(null, "", `product.html?id=${encodeURIComponent(p.id)}&c=${encodeURIComponent(window.colorSlug(v.color))}`);
        track("colour-change", { product: p.id, colour: v.color });
      }
    }

    $("#colors")?.addEventListener("click", (e) => {
      const b = e.target.closest("[data-key]");
      if (!b) return;
      const v = p.variants.find((x) => x.key === b.dataset.key);
      if (v && v !== variant) setVariant(v, { fromUser: true });
    });
    $("#sizes")?.addEventListener("click", (e) => {
      const b = e.target.closest("[data-size]:not([disabled])");
      if (!b) return;
      size = b.dataset.size;
      $("#sizes").querySelectorAll("[data-size]").forEach((x) => {
        x.classList.toggle("active", x === b);
        x.setAttribute("aria-checked", x === b);
      });
      $("#size-error").hidden = true;
    });

    // true (and points at the size buttons) when a size still has to be chosen
    function missingSize() {
      if (!p.sizes.length || size) return false;
      const el = $("#sizes");
      $("#size-error").hidden = false;
      el.classList.remove("shake");
      void el.offsetWidth;
      el.classList.add("shake");
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      return true;
    }

    $("#add-bag").addEventListener("click", () => {
      if (!variant.inStock || missingSize()) return;
      Bag.add(p.id, size || "Free Size", 1, variant.color);
      track("add-to-bag", { product: p.id, colour: variant.color });
      toast("Added to bag 🛍️");
      window.TWS.openBag();
    });
    // Buy now: save the order to "My Orders", then the link opens WhatsApp
    waBtn.addEventListener("click", (e) => {
      if (!variant.inStock) return;
      if (missingSize()) return e.preventDefault();
      const order = makeOrder([{ p, size: size || "Free Size", color: variant.color, qty: 1 }]);
      Orders.save(order);
      track("whatsapp-order", { from: "product", product: p.id, colour: variant.color, total: order.total });
      waBtn.href = orderWhatsApp(order);
      toast(`Order ${order.id} saved in My Orders`);
    });
    $("#wish").addEventListener("click", (e) => {
      const added = Wishlist.toggle(p.id);
      if (added) track("wishlist-add", { product: p.id });
      e.currentTarget.classList.toggle("active", added);
      toast(added ? "Added to wishlist ♥" : "Removed from wishlist");
    });
    $("#share").addEventListener("click", () => { track("share", { product: p.id, colour: variant.color }); shareProduct(p, variant.color); });

    setVariant(variant);

    /* reviews for this product */
    const wr = $("#write-review");
    wr.dataset.product = p.id;
    wr.dataset.productName = p.name;
    $("#product-reviews").hidden = false;
    window.loadReviews().then((all) => {
      const mine = all.filter((r) => r.product === p.id);
      if (!mine.length) {
        $("#review-summary").textContent = "No reviews yet. Bought this? Tell others what you think.";
        return;
      }
      const rated = mine.filter((r) => r.rating);
      const avg = rated.length ? rated.reduce((n, r) => n + r.rating, 0) / rated.length : 0;
      $("#review-summary").innerHTML = `${avg ? `${stars(Math.round(avg))} <strong>${avg.toFixed(1)}</strong> · ` : ""}${mine.length} review${mine.length === 1 ? "" : "s"}`;
      $("#product-review-list").innerHTML = mine.map(reviewCard).join("");
    });

    /* similar products */
    const similar = products.filter((x) => x.id !== p.id && x.category === p.category)
      .concat(products.filter((x) => x.id !== p.id && x.category !== p.category))
      .slice(0, 10);
    if (similar.length) {
      $("#similar").innerHTML = similar.map((x) => productCard(x)).join("");
      $("#similar-wrap").hidden = false;
    }

    /* recently viewed (other products this visitor opened before) */
    const recent = Recent.all().filter((x) => x !== p.id).map((x) => products.find((q) => q.id === x)).filter(Boolean).slice(0, 10);
    if (recent.length) {
      $("#recent").innerHTML = recent.map((x) => productCard(x)).join("");
      $("#recent-wrap").hidden = false;
    }
  });

  // Title, description and Google product details for this product and colour
  let ld = null, canonical = null;
  function setPageInfo(p, v) {
    const name = p.variants.length > 1 && v.color ? `${p.name} – ${v.color}` : p.name;
    const fabric = p.details.find((d) => d.label === "Fabric");
    const desc = `${name}: ${money(v.price)}${fabric ? ` · ${fabric.value}` : ""}. ${p.description || ""}`.trim().slice(0, 160);
    document.title = `${name} | ${C.name}`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", desc);
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `https://${C.domain}/p/${encodeURIComponent(p.id)}`;

    const data = {
      "@context": "https://schema.org",
      "@type": "Product",
      name,
      sku: v.color ? `${p.id}-${window.colorSlug(v.color)}` : p.id,
      image: v.images,
      description: p.description || p.name,
      category: p.category,
      color: v.color || undefined,
      brand: { "@type": "Brand", name: C.name },
      offers: {
        "@type": "Offer",
        url: canonical.href,
        priceCurrency: "INR",
        price: v.price,
        availability: v.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
      }
    };
    if (!ld) {
      ld = document.createElement("script");
      ld.type = "application/ld+json";
      document.head.appendChild(ld);
    }
    ld.textContent = JSON.stringify(data);
  }
})();
