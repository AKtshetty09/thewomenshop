(function () {
  const { esc, icon, productCard, discount } = window.TWS;
  const C = window.SHOP_CONFIG;
  const $ = (s) => document.querySelector(s);
  const params = new URLSearchParams(location.search);

  document.querySelectorAll("[data-icon]").forEach((el) => (el.outerHTML = icon(el.dataset.icon)));

  const PRICES = [
    { label: `Under ${C.currency}799`, min: 0, max: 799 },
    { label: `${C.currency}800 – ${C.currency}1,499`, min: 800, max: 1499 },
    { label: `${C.currency}1,500 – ${C.currency}2,499`, min: 1500, max: 2499 },
    { label: `${C.currency}2,500 & above`, min: 2500, max: Infinity }
  ];
  const OFFS = [20, 30, 40, 50];

  // Filter state, seeded from the URL (?cat=Dresses&q=red&max=999&tag=new)
  const state = {
    cats: params.getAll("cat"),
    prices: [],
    sizes: [],
    colors: [],
    minOff: 0,
    hideSoldOut: false,
    sort: params.get("sort") || "",
    q: (params.get("q") || "").trim().toLowerCase(),
    tag: params.get("tag") || "",
    max: Number(params.get("max")) || 0
  };

  $("#results").innerHTML = Array.from({ length: 8 }, () => '<div class="skeleton"></div>').join("");

  window.loadProducts().then((products) => {
    // Category list = config categories + any new ones from the sheet
    const cats = [...new Set([...C.categories, ...products.map((p) => p.category)])];
    const countBy = (fn) => products.filter(fn).length;
    const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "Free Size"];
    const sizes = [...new Set(products.flatMap((p) => p.sizes))]
      .sort((a, b) => (sizeOrder.indexOf(a) + 1 || 99) - (sizeOrder.indexOf(b) + 1 || 99));

    $("#f-cat").innerHTML = cats.map((c) => `
      <label class="check"><input type="checkbox" value="${esc(c)}" ${state.cats.includes(c) ? "checked" : ""}> ${esc(c)} <small>(${countBy((p) => p.category === c)})</small></label>`).join("");
    $("#f-price").innerHTML = PRICES.map((r, i) => `
      <label class="check"><input type="checkbox" value="${i}"> ${r.label}</label>`).join("");
    $("#f-size").innerHTML = sizes.map((s) => `<label><input type="checkbox" value="${esc(s)}"><span>${esc(s)}</span></label>`).join("");
    // Colours: the 14 most common ones in the sheet
    const colorCount = {};
    products.forEach((p) => p.colors.forEach((c) => {
      const k = c.trim().toLowerCase();
      colorCount[k] = colorCount[k] || { name: c.trim(), n: 0 };
      colorCount[k].n++;
    }));
    const colors = Object.values(colorCount).sort((a, b) => b.n - a.n).slice(0, 14);
    $("#f-color").innerHTML = colors.map((c) => `
      <label class="check"><input type="checkbox" value="${esc(c.name.toLowerCase())}"> ${esc(c.name)} <small>(${c.n})</small></label>`).join("");
    $("#f-color-group").hidden = !colors.length;
    $("#f-off").innerHTML = OFFS.map((o) => `
      <label class="check"><input type="radio" name="off" value="${o}"> ${o}% and above</label>`).join("");
    $("#sort").value = state.sort;

    const checked = (sel) => [...document.querySelectorAll(`${sel} input:checked`)].map((i) => i.value);
    $("#filters").addEventListener("change", () => {
      state.cats = checked("#f-cat");
      state.prices = checked("#f-price").map(Number);
      state.sizes = checked("#f-size");
      state.colors = checked("#f-color");
      state.minOff = Number(checked("#f-off")[0] || 0);
      state.hideSoldOut = $("#f-stock").checked;
      render();
    });
    $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; render(); });
    $("#clear-filters").addEventListener("click", () => {
      document.querySelectorAll("#filters input").forEach((i) => (i.checked = false));
      Object.assign(state, { cats: [], prices: [], sizes: [], colors: [], minOff: 0, hideSoldOut: false, q: "", tag: "", max: 0 });
      history.replaceState(null, "", "shop.html");
      document.querySelector(".search input").value = "";
      render();
    });

    // Remove a single active filter pill
    $("#active-filters").addEventListener("click", (e) => {
      const b = e.target.closest("[data-remove]");
      if (!b) return;
      const [key, val] = b.dataset.remove.split("|");
      if (key === "cat") { state.cats = state.cats.filter((c) => c !== val); syncChecks("#f-cat", state.cats); }
      if (key === "size") { state.sizes = state.sizes.filter((s) => s !== val); syncChecks("#f-size", state.sizes); }
      if (key === "color") { state.colors = state.colors.filter((c) => c !== val); syncChecks("#f-color", state.colors); }
      if (key === "q") state.q = "";
      if (key === "tag") state.tag = "";
      if (key === "max") state.max = 0;
      render();
    });
    const syncChecks = (sel, values) => document.querySelectorAll(`${sel} input`).forEach((i) => (i.checked = values.includes(i.value)));

    function render() {
      let list = products.filter((p) => {
        if (state.cats.length && !state.cats.includes(p.category)) return false;
        if (state.prices.length && !state.prices.some((i) => p.price >= PRICES[i].min && p.price <= PRICES[i].max)) return false;
        // a size only counts if it isn't sold out
        if (state.sizes.length && !p.sizes.some((s) => state.sizes.includes(s) && !p.soldOutSizes.includes(s))) return false;
        if (state.colors.length && !p.colors.some((c) => state.colors.includes(c.trim().toLowerCase()))) return false;
        if (state.minOff && discount(p) < state.minOff) return false;
        if (state.hideSoldOut && !p.inStock) return false;
        if (state.tag && p.tag !== state.tag) return false;
        if (state.max && p.price > state.max) return false;
        if (state.q) {
          const hay = [p.name, p.category, p.description, p.fabric, ...p.colors, p.id].join(" ").toLowerCase();
          if (!state.q.split(/\s+/).every((w) => hay.includes(w))) return false;
        }
        return true;
      });

      const sorters = {
        new: (a, b) => products.indexOf(b) - products.indexOf(a),
        low: (a, b) => a.price - b.price,
        high: (a, b) => b.price - a.price,
        off: (a, b) => discount(b) - discount(a)
      };
      list = list.slice().sort(sorters[state.sort] || ((a, b) => b.inStock - a.inStock));

      // Title & breadcrumb
      let title = "All Products";
      if (state.q) title = `Results for “${state.q}”`;
      else if (state.tag === "new") title = "New Arrivals";
      else if (state.tag === "bestseller") title = "Bestsellers";
      else if (state.cats.length === 1) title = state.cats[0];
      else if (state.max) title = `Under ${C.currency}${state.max.toLocaleString("en-IN")}`;
      $("#page-title").innerHTML = `${esc(title)} <small>${list.length} item${list.length === 1 ? "" : "s"}</small>`;
      $("#crumb").textContent = title;
      document.title = `${title} | ${C.name}`;

      // Active filter pills
      const pills = [
        ...state.cats.map((c) => [`cat|${c}`, c]),
        ...state.sizes.map((s) => [`size|${s}`, `Size ${s}`]),
        ...state.colors.map((c) => [`color|${c}`, c.replace(/^./, (x) => x.toUpperCase())]),
        state.q && ["q|", `“${state.q}”`],
        state.tag && ["tag|", state.tag === "new" ? "New" : "Bestseller"],
        state.max && ["max|", `Under ${C.currency}${state.max}`]
      ].filter(Boolean);
      $("#active-filters").innerHTML = pills.map(([k, label]) => `<span class="pill">${esc(label)} <button data-remove="${esc(k)}" aria-label="Remove">×</button></span>`).join("");

      if (!list.length) {
        $("#more-wrap").hidden = true;
        $("#results").innerHTML = window.productsFailed ? `
          <div class="no-results">
            <h3>Couldn't load products</h3>
            <p class="muted">Please check your internet connection and refresh the page.</p>
            <a class="btn" href="javascript:location.reload()" style="margin-top:14px">Refresh</a>
          </div>` : `
          <div class="no-results">
            <h3>No styles found</h3>
            <p class="muted">Try removing a filter, or ask us on WhatsApp. We may have it in stock!</p>
            <a class="btn" href="shop.html" style="margin-top:14px">See all products</a>
          </div>`;
        return;
      }
      current = list;
      shown = 0;
      $("#results").innerHTML = "";
      showMore();
    }

    // Show products 24 at a time so 300 photos don't load at once
    const PAGE = 24;
    let current = [], shown = 0;
    function showMore() {
      $("#results").insertAdjacentHTML("beforeend", current.slice(shown, shown + PAGE).map(productCard).join(""));
      shown = Math.min(shown + PAGE, current.length);
      const left = current.length - shown;
      $("#more-wrap").hidden = left <= 0;
      $("#more-count").textContent = `Showing ${shown} of ${current.length}`;
      $("#load-more").textContent = `Show ${Math.min(PAGE, left)} more`;
    }
    $("#load-more").addEventListener("click", showMore);
    render();
  });

  /* mobile filter panel */
  const filters = $("#filters");
  const backdrop = () => document.querySelector(".drawer-backdrop");
  $("#open-filters").addEventListener("click", () => { filters.classList.add("open"); backdrop().classList.add("open"); });
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-close-filters], [data-close-drawers]")) { filters.classList.remove("open"); backdrop().classList.remove("open"); }
  });
})();
