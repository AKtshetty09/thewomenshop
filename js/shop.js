(function () {
  const { esc, icon, productCard, discount, swatch, settingsReady } = window.TWS;
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
  const lower = (v) => String(v || "").trim().toLowerCase();
  const upper = (v) => String(v || "").trim().toUpperCase();
  const withDupatta = (p) => /^(yes|y|included|include|with)/i.test(p.dupatta || "");

  // Filter state, read from the address (?cat=…&size=M&color=teal blue&fabric=georgette&sort=low…)
  const state = {
    cats: params.getAll("cat"),
    prices: params.getAll("price").map(Number).filter((i) => PRICES[i]),
    sizes: params.getAll("size").map(upper),
    colors: params.getAll("color").map(lower),
    fabrics: params.getAll("fabric").map(lower),
    sleeves: params.getAll("sleeve").map(lower),
    dupatta: params.get("dupatta") === "1",
    minOff: Number(params.get("off")) || 0,
    inStock: params.get("instock") === "1",
    sort: params.get("sort") || "",
    q: (params.get("q") || "").trim().toLowerCase(),
    tag: params.get("tag") || "",
    max: Number(params.get("max")) || 0
  };

  $("#results").innerHTML = Array.from({ length: 8 }, () => '<div class="skeleton"></div>').join("");

  Promise.all([window.loadProducts(), settingsReady]).then(([products]) => {
    /* ---------- filter options found in the sheet ---------- */
    const cats = [...new Set([...C.categories, ...products.map((p) => p.category)])];
    // first spelling seen for each size / colour / fabric / sleeve
    const named = (pairs) => {
      const m = new Map();
      pairs.forEach(([k, v]) => { if (k && !m.has(k)) m.set(k, v); });
      return m;
    };
    const sizeNames = named(products.flatMap((p) => p.sizes.map((s) => [upper(s), s])));
    const sizeKeys = window.sortSizes([...sizeNames.values()]).map(upper);
    const colorNames = named(products.flatMap((p) => p.variants.filter((v) => v.color).map((v) => [v.key, v])));
    const fabricNames = named(products.map((p) => [lower(p.fabric), p.fabric.trim()]));
    const sleeveNames = named(products.map((p) => [lower(p.sleeve), p.sleeve.trim()]));

    /* ---------- matching ---------- */
    // Colour, size and "in stock" are checked on the same colour version of a product:
    // "Teal + XL" only matches products whose teal version still has XL.
    const variantMatch = (p, colors, sizes, inStock) => p.variants.find((v) =>
      (!colors.length || colors.includes(v.key)) &&
      (!sizes.length || v.available.some((s) => sizes.includes(upper(s)))) &&
      (!inStock || v.inStock));

    function passes(p, st) {
      if (st.cats.length && !st.cats.includes(p.category)) return false;
      if (st.prices.length && !st.prices.some((i) => p.price >= PRICES[i].min && p.price <= PRICES[i].max)) return false;
      if (st.fabrics.length && !st.fabrics.includes(lower(p.fabric))) return false;
      if (st.sleeves.length && !st.sleeves.includes(lower(p.sleeve))) return false;
      if (st.dupatta && !withDupatta(p)) return false;
      if (st.minOff && discount(p) < st.minOff) return false;
      if (st.tag && p.tag !== st.tag) return false;
      if (st.max && p.price > st.max) return false;
      return !!variantMatch(p, st.colors, st.sizes, st.inStock);
    }

    // Products to filter: all, or the search results in best-match order (kept in memory per search)
    const searched = state.q ? window.TWS.searchProducts(products, state.q) : products;
    let memo = { q: state.q, list: searched };
    const pool = () => {
      if (!state.q) return products;
      if (memo.q !== state.q) memo = { q: state.q, list: window.TWS.searchProducts(products, state.q) };
      return memo.list;
    };

    // How many products an option would show, with all the other filters applied (like Myntra)
    const countWith = (change) => pool().filter((p) => passes(p, { ...state, ...change })).length;

    /* ---------- drawing the filter panel ---------- */
    const box = (group, value, label, count, checked, type = "checkbox") => `
      <label class="check ${!count && !checked ? "is-empty" : ""}">
        <input type="${type}" name="${group}" value="${esc(value)}" ${checked ? "checked" : ""} ${!count && !checked ? "disabled" : ""}>
        ${label} <small>(${count})</small>
      </label>`;

    function drawFilters() {
      $("#f-cat").innerHTML = cats.map((c) => box("cat", c, esc(c), countWith({ cats: [c] }), state.cats.includes(c))).join("");
      $("#f-price").innerHTML = PRICES.map((r, i) => box("price", i, r.label, countWith({ prices: [i] }), state.prices.includes(i))).join("");
      $("#f-size").innerHTML = sizeKeys.map((k) => {
        const n = countWith({ sizes: [k] }), on = state.sizes.includes(k);
        return `<label class="${!n && !on ? "is-empty" : ""}" title="${n} product${n === 1 ? "" : "s"}">
          <input type="checkbox" name="size" value="${esc(k)}" ${on ? "checked" : ""} ${!n && !on ? "disabled" : ""}><span>${esc(sizeNames.get(k))}</span></label>`;
      }).join("");
      $("#f-size-group").hidden = !sizeKeys.length;

      const colorList = [...colorNames].map(([k, v]) => ({ k, v, n: countWith({ colors: [k] }) }))
        .sort((a, b) => b.n - a.n || a.v.color.localeCompare(b.v.color));
      $("#f-color").innerHTML = colorList.map(({ k, v, n }) =>
        box("color", k, `${swatch(v.color, v.code)} ${esc(v.color)}`, n, state.colors.includes(k))).join("");
      $("#f-color-group").hidden = !colorList.length;

      const listed = (names, key, group) => [...names].map(([k, label]) => ({ k, label, n: countWith({ [key]: [k] }) }))
        .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label))
        .map(({ k, label, n }) => box(group, k, esc(label), n, state[key].includes(k))).join("");
      $("#f-fabric").innerHTML = listed(fabricNames, "fabrics", "fabric");
      $("#f-fabric-group").hidden = !fabricNames.size;
      $("#f-sleeve").innerHTML = listed(sleeveNames, "sleeves", "sleeve");
      $("#f-sleeve-group").hidden = !sleeveNames.size;

      const nDup = countWith({ dupatta: true });
      $("#f-dupatta").innerHTML = box("dupatta", "1", "With dupatta", nDup, state.dupatta);
      $("#f-dupatta-group").hidden = !products.some(withDupatta);

      $("#f-off").innerHTML = OFFS.map((o) => box("off", o, `${o}% and above`, countWith({ minOff: o }), state.minOff === o, "radio")).join("");
      $("#f-stock").innerHTML = box("instock", "1", "In stock only", countWith({ inStock: true }), state.inStock);
    }

    /* ---------- reading the panel, and the address ---------- */
    const picked = (name) => [...document.querySelectorAll(`#filters input[name="${name}"]:checked`)].map((i) => i.value);
    $("#filters").addEventListener("change", () => {
      state.cats = picked("cat");
      state.prices = picked("price").map(Number);
      state.sizes = picked("size");
      state.colors = picked("color");
      state.fabrics = picked("fabric");
      state.sleeves = picked("sleeve");
      state.dupatta = picked("dupatta").length > 0;
      state.minOff = Number(picked("off")[0] || 0);
      state.inStock = picked("instock").length > 0;
      render();
    });
    $("#sort").value = state.sort;
    $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; render(); });
    $("#clear-filters").addEventListener("click", () => {
      Object.assign(state, { cats: [], prices: [], sizes: [], colors: [], fabrics: [], sleeves: [], dupatta: false, minOff: 0, inStock: false, q: "", tag: "", max: 0 });
      document.querySelector(".search input").value = "";
      render();
    });

    function saveToAddress() {
      const u = new URLSearchParams();
      if (state.q) u.set("q", state.q);
      if (state.tag) u.set("tag", state.tag);
      if (state.max) u.set("max", state.max);
      state.cats.forEach((v) => u.append("cat", v));
      state.colors.forEach((v) => u.append("color", v));
      state.sizes.forEach((v) => u.append("size", v));
      state.fabrics.forEach((v) => u.append("fabric", v));
      state.sleeves.forEach((v) => u.append("sleeve", v));
      state.prices.forEach((v) => u.append("price", v));
      if (state.dupatta) u.set("dupatta", "1");
      if (state.minOff) u.set("off", state.minOff);
      if (state.inStock) u.set("instock", "1");
      if (state.sort) u.set("sort", state.sort);
      const qs = u.toString();
      history.replaceState(null, "", `shop.html${qs ? `?${qs}` : ""}`);
    }

    // Remove one active filter (the × on a pill)
    $("#active-filters").addEventListener("click", (e) => {
      const b = e.target.closest("[data-remove]");
      if (!b) return;
      const [key, val] = b.dataset.remove.split("|");
      const drop = (arr) => arr.filter((x) => String(x) !== val);
      if (key === "cat") state.cats = drop(state.cats);
      if (key === "price") state.prices = drop(state.prices);
      if (key === "size") state.sizes = drop(state.sizes);
      if (key === "color") state.colors = drop(state.colors);
      if (key === "fabric") state.fabrics = drop(state.fabrics);
      if (key === "sleeve") state.sleeves = drop(state.sleeves);
      if (key === "dupatta") state.dupatta = false;
      if (key === "off") state.minOff = 0;
      if (key === "instock") state.inStock = false;
      if (key === "q") { state.q = ""; document.querySelector(".search input").value = ""; }
      if (key === "tag") state.tag = "";
      if (key === "max") state.max = 0;
      render();
    });

    /* ---------- results ---------- */
    function render() {
      let list = pool().filter((p) => passes(p, state));

      const sorters = {
        new: (a, b) => products.indexOf(b) - products.indexOf(a),
        low: (a, b) => a.price - b.price,
        high: (a, b) => b.price - a.price,
        off: (a, b) => discount(b) - discount(a)
      };
      if (state.sort) list = list.slice().sort(sorters[state.sort]);
      else if (!state.q) list = list.slice().sort((a, b) => b.inStock - a.inStock);

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
        ...state.colors.map((c) => [`color|${c}`, colorNames.get(c)?.color || c, colorNames.get(c)]),
        ...state.sizes.map((s) => [`size|${s}`, `Size ${sizeNames.get(s) || s}`]),
        ...state.fabrics.map((f) => [`fabric|${f}`, fabricNames.get(f) || f]),
        ...state.sleeves.map((f) => [`sleeve|${f}`, sleeveNames.get(f) || f]),
        ...state.prices.map((i) => [`price|${i}`, PRICES[i].label]),
        state.dupatta && ["dupatta|", "With dupatta"],
        state.minOff && ["off|", `${state.minOff}%+ off`],
        state.inStock && ["instock|", "In stock"],
        state.q && ["q|", `“${state.q}”`],
        state.tag && ["tag|", state.tag === "new" ? "New" : "Bestseller"],
        state.max && ["max|", `Under ${C.currency}${state.max}`]
      ].filter(Boolean);
      $("#active-filters").innerHTML = pills.map(([k, label, v]) =>
        `<span class="pill">${v ? swatch(v.color, v.code) : ""}${esc(label)} <button data-remove="${esc(k)}" aria-label="Remove ${esc(label)}">×</button></span>`).join("");
      $("#show-results").textContent = `Show ${list.length} result${list.length === 1 ? "" : "s"}`;

      drawFilters();
      saveToAddress();

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

    // Show products 24 at a time so 300 photos don't load at once.
    // With a colour (or size) filter, each card shows the matching colour's photo and price.
    const PAGE = 24;
    let current = [], shown = 0;
    function card(p) {
      if (!state.colors.length && !state.sizes.length && !state.inStock) return productCard(p);
      const v = variantMatch(p, state.colors, state.sizes, state.inStock);
      return productCard(p, { color: v ? v.color : "" });
    }
    function showMore() {
      $("#results").insertAdjacentHTML("beforeend", current.slice(shown, shown + PAGE).map(card).join(""));
      shown = Math.min(shown + PAGE, current.length);
      const left = current.length - shown;
      $("#more-wrap").hidden = left <= 0;
      $("#more-count").textContent = `Showing ${shown} of ${current.length}`;
      $("#load-more").textContent = `Show ${Math.min(PAGE, left)} more`;
    }
    $("#load-more").addEventListener("click", showMore);
    render();
    if (state.q) {
      const n = searched.length;
      window.TWS.track(n ? "search" : "search-no-results", { q: state.q, results: n });
    }
  });

  /* mobile filter panel */
  const filters = $("#filters");
  const backdrop = () => document.querySelector(".drawer-backdrop");
  $("#open-filters").addEventListener("click", () => { filters.classList.add("open"); backdrop().classList.add("open"); });
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-close-filters], [data-close-drawers]")) { filters.classList.remove("open"); backdrop().classList.remove("open"); }
  });
})();
