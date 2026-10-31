(function () {
  const { esc, icon, productCard, igProfile, settingsReady, fillText } = window.TWS;
  const C = window.SHOP_CONFIG;
  const $ = (s) => document.querySelector(s);

  document.querySelectorAll("[data-icon]").forEach((el) => (el.outerHTML = icon(el.dataset.icon)));

  settingsReady.then(() => { renderHero(); renderPromises(); });

  /* hero slider (config.js → heroSlides, or the banner rows of the sheet's Settings tab) */
  function renderHero() {
  $("#hero").insertAdjacentHTML("afterbegin", C.heroSlides.map((s, i) => `
    <div class="slide ${i ? "" : "active"}">
      <img src="${esc(s.image)}" alt="" style="object-position:${esc(s.focus || "center")}" ${i ? 'loading="lazy"' : ""}>
      <div class="slide-content container">
        <span class="eyebrow">${esc(s.eyebrow)}</span>
        <h1>${s.title}</h1>
        <p>${esc(s.text)}</p>
        <a class="btn" href="${esc(s.link)}">${esc(s.button)}</a>
      </div>
    </div>`).join(""));
  const slides = [...document.querySelectorAll(".slide")];
  const dots = $(".hero-dots");
  dots.innerHTML = slides.map((_, i) => `<button aria-label="Slide ${i + 1}" class="${i ? "" : "active"}"></button>`).join("");
  let current = 0, timer;
  function go(i) {
    slides[current].classList.remove("active");
    dots.children[current].classList.remove("active");
    current = (i + slides.length) % slides.length;
    slides[current].classList.add("active");
    dots.children[current].classList.add("active");
    clearInterval(timer);
    timer = setInterval(() => go(current + 1), 6000);
  }
  [...dots.children].forEach((d, i) => d.addEventListener("click", () => go(i)));
  go(0);
  }

  /* promises */
  function renderPromises() {
    $("#promises").innerHTML = C.promises.map((p) => `
      <div class="promise">
        <div class="promise-ico">${icon(p.icon)}</div>
        <div><h4>${esc(fillText(p.title))}</h4><p>${esc(fillText(p.text))}</p></div>
      </div>`).join("");
  }

  /* skeletons while loading */
  const skeletons = (n) => Array.from({ length: n }, () => '<div class="skeleton"></div>').join("");
  $("#new-arrivals").innerHTML = skeletons(5);
  $("#bestsellers").innerHTML = skeletons(4);

  window.loadProducts().then((products) => {
    const inStockFirst = (a, b) => b.inStock - a.inStock;

    /* categories: picture = first product in that category */
    $("#cats").innerHTML = C.categories.map((c) => {
      const items = products.filter((p) => p.category === c);
      const pic = items.find((p) => p.images[0]);
      return `
        <a class="cat" href="shop.html?cat=${encodeURIComponent(c)}">
          <div class="cat-img"><img src="${esc(pic ? pic.images[0] : window.TWS.PLACEHOLDER)}" alt="${esc(c)}" loading="lazy"></div>
          <h3>${esc(c)}</h3>
          <p>${items.length} style${items.length === 1 ? "" : "s"}</p>
        </a>`;
    }).join("");

    /* new arrivals & bestsellers */
    const fresh = products.filter((p) => p.tag === "new").sort(inStockFirst);
    $("#new-arrivals").innerHTML = (fresh.length ? fresh : products.slice(-8).reverse()).slice(0, 10).map(productCard).join("");

    const best = products.filter((p) => p.tag === "bestseller").sort(inStockFirst);
    $("#bestsellers").innerHTML = (best.length ? best : products).slice(0, 8).map(productCard).join("");

    /* promo banners: photo = a "featured" product from that category (or its first product) */
    const pick = (cat) => {
      const inCat = products.filter((p) => p.category === cat && p.images[0]);
      return inCat.find((p) => p.featured) || inCat[0];
    };
    const promo = (cat, title, text) => {
      const p = pick(cat);
      return p ? `
      <a class="promo" href="shop.html?cat=${encodeURIComponent(cat)}">
        <img src="${esc(p.images[0])}" alt="${esc(title)}" loading="lazy">
        <div class="promo-body"><h3>${esc(title)}</h3><p>${esc(text)}</p><span class="btn btn-light">Shop now</span></div>
      </a>` : "";
    };
    $("#promos").innerHTML =
      promo("Anarkali Sets", "The Festive Edit", "Anarkalis with dupattas for every celebration") +
      promo("Top & Dupatta Sets", "Top & Dupatta Sets", "Easy, elegant and ready to wear");

    /* instagram grid */
    $("#insta-grid").innerHTML = products.filter((p) => p.images[0]).slice(0, 6)
      .map((p) => `<a href="${igProfile}" target="_blank" rel="noopener" aria-label="Instagram"><img src="${esc(p.images[0])}" alt="" loading="lazy"></a>`).join("");

    observeReveal();
  });

  $("#insta-btn").href = igProfile;
  $("#insta-btn").innerHTML = `${icon("instagram")} @${esc(C.instagramHandle)}`;

  /* reveal on scroll */
  function observeReveal() {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }), { threshold: 0.12 });
    document.querySelectorAll(".reveal:not(.in)").forEach((el) => io.observe(el));
  }
  observeReveal();
})();
