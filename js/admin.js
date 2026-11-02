/* Shop Admin (twshop.in/admin): add and edit products, colours, photos and stock from a phone.
   It talks to the Google Apps Script attached to the product sheet (scripts/admin-apps-script.gs),
   which writes the sheet (one row per colour) and saves photos in Google Drive. */
(function () {
  const C = window.SHOP_CONFIG;
  const app = document.getElementById("admin");
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => C.currency + Number(n || 0).toLocaleString("en-IN");
  const keyOf = (h) => String(h || "").trim().toLowerCase().replace(/\s+/g, "_");
  const list = (v) => String(v || "").split(",").map((s) => s.trim()).filter(Boolean);
  const yes = (v) => /^(yes|y|true|1)$/i.test(String(v || "").trim());
  const up = (s) => String(s).toUpperCase();
  const thumbOf = (url) => window.toThumbUrl(window.toImageUrl(url || ""));
  const dot = (name, code) => window.swatchColor(name, code) || "conic-gradient(#e0336f,#f2c318,#2e8b3e,#2457c5,#6a2c8c,#e0336f)";
  const STD_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "Free Size"];
  const SLEEVES = ["Full sleeve", "Three-quarter sleeve", "Half sleeve", "Short sleeve", "Sleeveless", "Cap sleeve"];
  const AUTH = "tws_admin";

  let auth = JSON.parse(localStorage.getItem(AUTH) || "null") || {};
  let designs = [];     // products from the sheet
  let editing = null;   // the product on the edit screen
  let dirty = false;    // unsaved changes on the edit or settings screen
  let reviews = { list: [], error: "" }; // customer reviews
  let settingsMap = {};  // Settings tab: { key: value }
  let cfg = null;        // the shop settings being edited
  let orders = { list: [], url: "", error: "" }; // customer orders (private sheet)
  let order = null;      // the order on the order screen
  let loadedAt = 0;      // when everything was last read from the sheets

  function toast(msg) {
    const t = $("#adm-toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove("show"), 3200);
  }

  /* ---------- talking to the Google script ---------- */
  async function call(action, data = {}) {
    let res;
    try {
      res = await fetch(auth.url, { method: "POST", body: JSON.stringify({ pin: auth.pin, action, ...data }) });
    } catch (e) {
      throw new Error("Can't reach the admin script. Check your internet connection and the admin link.");
    }
    let j;
    try { j = await res.json(); } catch (e) {
      throw new Error("The admin script didn't answer properly. Check it's deployed as a Web app with access \"Anyone\".");
    }
    if (!j.ok) throw new Error(j.error || "Something went wrong");
    return j;
  }

  /* ---------- log in ---------- */
  function showLogin(msg = "") {
    $("#logout").hidden = true;
    setTabs(null);
    app.innerHTML = `
      <section class="adm-card adm-login">
        <h1>Shop Admin</h1>
        <p class="muted">Add products, colours, photos and stock from your phone.</p>
        ${msg ? `<p class="adm-error">${esc(msg)}</p>` : ""}
        <form id="login" novalidate>
          <label class="field-label" for="lg-url">Admin link (Web app link from Google Apps Script)</label>
          <input class="field" id="lg-url" value="${esc(auth.url || "")}" placeholder="https://script.google.com/macros/s/…/exec" autocomplete="off" spellcheck="false">
          <label class="field-label" for="lg-pin">PIN</label>
          <input class="field" id="lg-pin" type="password" autocomplete="current-password">
          <button class="btn btn-block" type="submit" id="lg-go">Log in</button>
          <p class="muted small center">Remembered on this phone only. Log out on shared devices.</p>
        </form>
      </section>`;
    $("#login").addEventListener("submit", async (e) => {
      e.preventDefault();
      const url = $("#lg-url").value.trim(), pin = $("#lg-pin").value;
      if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(url)) return showLogin("Please paste the Web app link. It starts with https://script.google.com/");
      if (!pin) return showLogin("Please enter your PIN");
      auth = { url, pin };
      $("#lg-go").disabled = true;
      $("#lg-go").textContent = "Checking…";
      try {
        await call("ping");
        localStorage.setItem(AUTH, JSON.stringify(auth));
        start();
      } catch (err) {
        auth = { url };
        showLogin(err.message);
      }
    });
  }
  $("#logout").addEventListener("click", () => {
    if (dirty && !confirm("You have unsaved changes. Log out anyway?")) return;
    auth = { url: auth.url };
    localStorage.setItem(AUTH, JSON.stringify(auth));
    dirty = false;
    showLogin("Logged out.");
  });

  /* ---------- sheet rows → products (one row per colour; same id = one product) ---------- */
  function toDesigns(headers, rows) {
    const keys = headers.map(keyOf);
    const byId = new Map();
    rows.forEach(({ row, cells }) => {
      const o = {};
      keys.forEach((k, i) => { if (k && !o[k]) o[k] = String(cells[i] ?? "").trim(); });
      if (!o.id) return;
      const images = cells.map((v, i) => [keys[i], String(v ?? "").trim()])
        .filter(([k, v]) => v && (k.startsWith("image") || (!k && /^https?:\/\//i.test(v)))).map(([, v]) => v);
      if (!byId.has(o.id)) byId.set(o.id, []);
      byId.get(o.id).push({ row, o, images });
    });
    return [...byId].map(([id, rs]) => {
      const base = rs.find((r) => r.o.name) || rs[0];
      const b = base.o;
      const sizes = window.sortSizes([...new Map(rs.flatMap((r) => list(r.o.sizes)).map((s) => [up(s), s])).values()]);
      const d = {
        id, name: b.name || "", category: b.category || "", price: b.price || "", mrp: b.mrp || "", sizes,
        description: b.description || "", fabric: b.fabric || "", lining: b.lining || "", length: b.length || "",
        sleeve_type: b.sleeve_type || b.sleeve || "", dupatta: b.dupatta || "", bottom: b.bottom || "",
        other_details: b.other_details || "", tag: (b.tag || "").toLowerCase(), featured: yes(b.featured),
        made_to_order: yes(b.made_to_order), hidden: /^(hide|hidden|draft)$/i.test(b.in_stock || ""),
        split: false, colours: []
      };
      const ordered = [base, ...rs.filter((r) => r !== base)];
      ordered.forEach((r) => {
        const names = list(r.o.colors || r.o.colours || r.o.color || r.o.colour);
        if (names.length > 1) d.split = true;
        const own = list(r.o.sizes).map(up);
        const sold = new Set(list(r.o.sold_out_sizes).map(up));
        (names.length ? names : [""]).forEach((color, j) => d.colours.push({
          row: j === 0 ? r.row : null, // extra colours of a shared row become new rows when saved
          color, color_code: r.o.color_code || "",
          images: r.images.map((url) => ({ url })),
          // sizes a colour isn't made in are shown as sold out
          sold_out: sizes.filter((s) => sold.has(up(s)) || (own.length && !own.includes(up(s)))),
          in_stock: !/^(no|n|false|0|hide|hidden|draft)$/i.test(r === base ? (d.hidden ? "yes" : r.o.in_stock) : r.o.in_stock),
          price: r === base ? "" : r.o.price || ""
        }));
      });
      return d;
    });
  }

  /* ---------- product list ---------- */
  let listQuery = "", listFilter = "all";
  async function showList(highlight, reload = false) {
    if (reload && !(await refresh())) return;
    setTabs("products");
    editing = null;
    cfg = null;
    order = null;
    dirty = false;
    app.innerHTML = `
      <div class="adm-head">
        <h1>Products <small>${designs.length}</small></h1>
        <button class="btn" id="add">+ Add product</button>
      </div>
      <input class="field adm-search" id="q" type="search" placeholder="Search by name, code or category" value="${esc(listQuery)}">
      <div class="adm-chips" id="filters">
        ${[["all", "All"], ["some", "Some sold out"], ["out", "Sold out"], ["hidden", "Hidden"]].map(([k, l]) =>
          `<button type="button" data-filter="${k}" class="${k === listFilter ? "on" : ""}">${l}</button>`).join("")}
      </div>
      <div class="adm-list" id="items"></div>`;
    $("#add").addEventListener("click", () => showEdit(null));
    $("#q").addEventListener("input", (e) => { listQuery = e.target.value; drawItems(); });
    $("#filters").addEventListener("click", (e) => {
      const b = e.target.closest("[data-filter]");
      if (!b) return;
      listFilter = b.dataset.filter;
      $("#filters").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
      drawItems();
    });
    $("#items").addEventListener("click", (e) => {
      const b = e.target.closest("[data-id]");
      if (b) showEdit(designs.find((d) => d.id === b.dataset.id));
    });
    drawItems(highlight);
  }

  function statusOf(d) {
    if (d.hidden) return ["hidden", "Hidden"];
    const open = d.colours.filter((c) => c.in_stock && (!d.sizes.length || c.sold_out.length < d.sizes.length));
    if (!open.length) return ["out", "Sold out"];
    if (open.length < d.colours.length || d.colours.some((c) => c.sold_out.length)) return ["some", "Some sold out"];
    return ["ok", "In stock"];
  }

  function drawItems(highlight) {
    const q = listQuery.trim().toLowerCase();
    const shown = designs.filter((d) => {
      if (q && ![d.name, d.id, d.category].join(" ").toLowerCase().includes(q)) return false;
      return listFilter === "all" || statusOf(d)[0] === listFilter;
    });
    $("#items").innerHTML = shown.length ? shown.map((d) => {
      const [st, label] = statusOf(d);
      const img = d.colours.find((c) => c.images.length)?.images[0]?.url;
      return `
        <button type="button" class="adm-item ${d.id === highlight ? "flash" : ""}" data-id="${esc(d.id)}">
          <span class="adm-thumb">${img ? `<img src="${esc(thumbOf(img))}" alt="" loading="lazy">` : ""}</span>
          <span class="adm-item-main">
            <strong>${esc(d.name || "(no name)")}</strong>
            <small>${esc(d.id)} · ${money(d.price)} · ${esc(d.category)}</small>
            <span class="adm-dots">${d.colours.filter((c) => c.color).slice(0, 8).map((c) =>
              `<i style="background:${dot(c.color, c.color_code)}" title="${esc(c.color)}"></i>`).join("")}
              <small>${d.colours.length} colour${d.colours.length === 1 ? "" : "s"}</small></span>
          </span>
          <span class="adm-status ${st}">${label}</span>
        </button>`;
    }).join("") : `<p class="muted center">No products here.</p>`;
  }

  /* ---------- add / edit a product ---------- */
  const blankColour = () => ({ row: null, color: "", color_code: "", images: [], sold_out: [], in_stock: true, price: "" });

  function showEdit(d) {
    setTabs(null);
    cfg = null;
    order = null;
    editing = d ? JSON.parse(JSON.stringify(d)) : {
      id: "", name: "", category: C.categories[0] || "", price: "", mrp: "", sizes: ["S", "M", "L", "XL", "XXL"],
      description: "", fabric: "", lining: "", length: "", sleeve_type: "", dupatta: "", bottom: "", other_details: "",
      tag: "new", featured: false, made_to_order: false, hidden: false, split: false, colours: [blankColour()]
    };
    dirty = false;
    renderEdit();
    window.scrollTo(0, 0);
  }

  function options(values, selected) {
    return values.map((v) => `<option value="${esc(v)}" ${v === selected ? "selected" : ""}>${esc(v || "—")}</option>`).join("");
  }

  function renderEdit() {
    const d = editing;
    const y = window.scrollY;
    const cats = [...new Set([...C.categories, ...designs.map((x) => x.category), d.category].filter(Boolean))];
    const allColours = [...new Set([...window.colourNames, ...designs.flatMap((x) => x.colours.map((c) => c.color))].filter(Boolean))];
    const fabrics = [...new Set(designs.map((x) => x.fabric).filter(Boolean))];
    const sizeChoices = [...new Set([...STD_SIZES, ...d.sizes])];
    app.innerHTML = `
      <div class="adm-head">
        <button type="button" class="adm-back" data-act="back">← Products</button>
        ${d.id ? `<a class="adm-view" href="p/${encodeURIComponent(d.id)}" target="_blank" rel="noopener">View on website ↗</a>` : ""}
      </div>
      <h1 class="adm-h1">${d.id ? `${esc(d.name)} <small>${esc(d.id)}</small>` : "New product"}</h1>
      ${d.split ? `<p class="adm-note">This product had several colours in one sheet row. When you save, each colour gets its own row, so you can give each colour its own photos.</p>` : ""}
      <p class="adm-error" id="err" hidden></p>

      <section class="adm-card">
        <h2>Basics</h2>
        <label class="field-label">Product name *</label>
        <input class="field" data-f="name" value="${esc(d.name)}" placeholder="e.g. Heavy Handwork Anarkali & Dupatta Set">
        <label class="field-label">Category *</label>
        <select class="field" data-f="category">${options(cats, d.category)}<option value="__new">+ New category…</option></select>
        <div class="adm-two">
          <div><label class="field-label">Price (₹) *</label><input class="field" data-f="price" type="number" inputmode="numeric" min="1" value="${esc(d.price)}" placeholder="1299"></div>
          <div><label class="field-label">MRP (₹)</label><input class="field" data-f="mrp" type="number" inputmode="numeric" min="0" value="${esc(d.mrp)}" placeholder="2299"></div>
        </div>
        <label class="field-label">Sizes it's made in <span class="muted small">(tap to choose)</span></label>
        <div class="adm-sizes">${sizeChoices.map((s) => `<button type="button" data-act="size" data-size="${esc(s)}" class="${d.sizes.includes(s) ? "on" : ""}">${esc(s)}</button>`).join("")}
          <button type="button" data-act="custom-size" class="adm-plus">+ Other</button></div>
        <div class="adm-two">
          <div><label class="field-label">Label</label><select class="field" data-f="tag">${options(["", "new", "bestseller"], d.tag).replace(">new<", ">New arrival<").replace(">bestseller<", ">Bestseller<").replace(">—<", ">None<")}</select></div>
          <div class="adm-checks">
            <label class="adm-toggle"><input type="checkbox" data-f="featured" ${d.featured ? "checked" : ""}> Show in home banners</label>
            <label class="adm-toggle"><input type="checkbox" data-f="made_to_order" ${d.made_to_order ? "checked" : ""}> Made to order</label>
          </div>
        </div>
        <label class="adm-toggle adm-hide"><input type="checkbox" data-f="hidden" ${d.hidden ? "checked" : ""}> Hide from website (draft)</label>
      </section>

      <section class="adm-card">
        <h2>Product details</h2>
        <label class="field-label">Description</label>
        <textarea class="field" data-f="description" rows="3" placeholder="A few lines about the product">${esc(d.description)}</textarea>
        <div class="adm-two">
          <div><label class="field-label">Fabric</label><input class="field" data-f="fabric" list="dl-fabric" value="${esc(d.fabric)}" placeholder="Georgette"></div>
          <div><label class="field-label">Lining</label><input class="field" data-f="lining" value="${esc(d.lining)}" placeholder="Crepe"></div>
          <div><label class="field-label">Length</label><input class="field" data-f="length" value="${esc(d.length)}" placeholder="52 inches"></div>
          <div><label class="field-label">Sleeve type</label><input class="field" data-f="sleeve_type" list="dl-sleeve" value="${esc(d.sleeve_type)}" placeholder="Full sleeve"></div>
          <div><label class="field-label">Dupatta</label><select class="field" data-f="dupatta">${options(["", "Included", "Not included"], d.dupatta)}</select></div>
          <div><label class="field-label">Bottom</label><select class="field" data-f="bottom">${options(["", "Included", "Not included"], d.bottom)}</select></div>
        </div>
        <label class="field-label">Other details</label>
        <input class="field" data-f="other_details" value="${esc(d.other_details)}" placeholder="Work: Handwork; Occasion: Festive">
      </section>

      <section class="adm-card">
        <h2>Colours, photos &amp; stock <small>${d.colours.length}</small></h2>
        <p class="muted small">Each colour has its own photos. Tap a size to mark it <strong>sold out</strong> in that colour. The first colour is shown first on the website.</p>
        ${d.colours.map(colourCard).join("")}
        <button type="button" class="btn btn-outline btn-block" data-act="add-colour">+ Add another colour</button>
      </section>

      ${d.id ? `
      <section class="adm-card adm-danger">
        <h2>Delete product</h2>
        <p class="muted small">Removes it from the website and the sheet. To keep it for later, tick "Hide from website" instead.</p>
        <button type="button" class="btn btn-outline" data-act="delete">Delete ${esc(d.id)}</button>
      </section>` : ""}

      <div class="adm-save"><button type="button" class="btn btn-block" data-act="save" id="save">${d.id ? "Save changes" : "Add product"}</button></div>

      <datalist id="dl-colour">${allColours.map((c) => `<option value="${esc(c)}">`).join("")}</datalist>
      <datalist id="dl-fabric">${fabrics.map((c) => `<option value="${esc(c)}">`).join("")}</datalist>
      <datalist id="dl-sleeve">${SLEEVES.map((c) => `<option value="${esc(c)}">`).join("")}</datalist>`;
    window.scrollTo(0, y);
  }

  function colourCard(c, i) {
    const d = editing;
    return `
      <article class="adm-colour" data-i="${i}">
        <div class="adm-colour-head">
          <span class="adm-dot" style="background:${dot(c.color, c.color_code)}"></span>
          <input class="field" data-c="color" list="dl-colour" value="${esc(c.color)}" placeholder="Colour, e.g. Rust orange">
          ${i > 0 ? `<button type="button" class="adm-icon" data-act="first" title="Show this colour first">↑ First</button>` : ""}
          ${d.colours.length > 1 ? `<button type="button" class="adm-icon danger" data-act="remove-colour" title="Remove this colour">✕</button>` : ""}
        </div>
        <div class="adm-photos">
          ${c.images.map((im, k) => `
            <div class="adm-photo ${im.uploading ? "busy" : ""} ${im.error ? "err" : ""}">
              <img src="${esc(im.preview || thumbOf(im.url))}" alt="">
              ${k === 0 ? `<span class="adm-main-tag">Main</span>` : `<button type="button" data-act="main-photo" data-k="${k}" class="adm-star" title="Make main photo">★</button>`}
              <button type="button" data-act="remove-photo" data-k="${k}" class="adm-x" title="Remove photo">✕</button>
              ${im.uploading ? `<span class="adm-busy">Uploading…</span>` : ""}
              ${im.error ? `<button type="button" class="adm-retry" data-act="retry-photo" data-k="${k}">Retry</button>` : ""}
            </div>`).join("")}
          <label class="adm-add-photo"><span>＋</span>Add photos<input type="file" accept="image/*" multiple data-act="photos" hidden></label>
        </div>
        ${d.sizes.length ? `
        <p class="adm-label">Sizes <span class="muted small">(crossed = sold out)</span></p>
        <div class="adm-sizes adm-stock">${d.sizes.map((s) => `<button type="button" data-act="stock" data-size="${esc(s)}" class="${c.sold_out.includes(s) ? "off" : "on"}">${esc(s)}</button>`).join("")}</div>` : ""}
        <label class="adm-toggle"><input type="checkbox" data-c="soldout" ${c.in_stock ? "" : "checked"}> This whole colour is sold out</label>
        ${i > 0 ? `<label class="adm-mini">Different price for this colour (optional)<input class="field" data-c="price" type="number" inputmode="numeric" value="${esc(c.price)}" placeholder="${esc(d.price)}"></label>` : ""}
      </article>`;
  }

  /* ---------- edit screen: typing, ticking, tapping ---------- */
  app.addEventListener("input", (e) => {
    if (!editing) return;
    const f = e.target.dataset.f, cf = e.target.dataset.c;
    if (f && e.target.type !== "checkbox" && e.target.tagName !== "SELECT") { editing[f] = e.target.value; dirty = true; }
    if (cf === "color" || cf === "price") {
      const card = e.target.closest("[data-i]");
      const c = editing.colours[Number(card.dataset.i)];
      c[cf] = e.target.value;
      if (cf === "color") $(".adm-dot", card).style.background = dot(c.color, c.color_code);
      dirty = true;
    }
  });

  app.addEventListener("change", (e) => {
    if (!editing) return;
    const t = e.target, f = t.dataset.f;
    if (f && t.type === "checkbox") { editing[f] = t.checked; dirty = true; }
    if (f && t.tagName === "SELECT") {
      if (t.value === "__new") {
        const name = (prompt("New category name") || "").trim();
        if (name) editing.category = name;
        return renderEdit();
      }
      editing[f] = t.value;
      dirty = true;
    }
    if (t.dataset.c === "soldout") {
      editing.colours[Number(t.closest("[data-i]").dataset.i)].in_stock = !t.checked;
      dirty = true;
    }
    if (t.dataset.act === "photos" && t.files.length) {
      addPhotos(Number(t.closest("[data-i]").dataset.i), [...t.files]);
      t.value = "";
    }
  });

  app.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b || !editing || b.tagName === "INPUT") return;
    const d = editing;
    const card = b.closest("[data-i]");
    const c = card ? d.colours[Number(card.dataset.i)] : null;
    const act = b.dataset.act;
    if (act === "back") {
      if (dirty && !confirm("Leave without saving your changes?")) return;
      return showList();
    }
    if (act === "save") return save();
    if (act === "delete") return remove();
    if (act === "size") {
      const s = b.dataset.size;
      d.sizes = d.sizes.includes(s) ? d.sizes.filter((x) => x !== s) : window.sortSizes([...d.sizes, s]);
    }
    if (act === "custom-size") {
      const s = (prompt("Size name, e.g. 32 or Free Size") || "").trim();
      if (s && !d.sizes.includes(s)) d.sizes = window.sortSizes([...d.sizes, s]);
    }
    if (act === "stock") {
      const s = b.dataset.size;
      c.sold_out = c.sold_out.includes(s) ? c.sold_out.filter((x) => x !== s) : [...c.sold_out, s];
    }
    if (act === "add-colour") d.colours.push(blankColour());
    if (act === "remove-colour") {
      if (!confirm(`Remove ${c.color || "this colour"}${c.images.length ? " and its photos" : ""}?`)) return;
      d.colours.splice(d.colours.indexOf(c), 1);
    }
    if (act === "first") d.colours.unshift(...d.colours.splice(d.colours.indexOf(c), 1));
    if (act === "main-photo") c.images.unshift(...c.images.splice(Number(b.dataset.k), 1));
    if (act === "remove-photo") c.images.splice(Number(b.dataset.k), 1);
    if (act === "retry-photo") { upload(c.images[Number(b.dataset.k)]); return; }
    dirty = true;
    renderEdit();
  });

  /* ---------- photos: shrink on the phone, then upload to Google Drive ---------- */
  function toJpeg(file, max = 1600) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)); // longest side at most max px
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.naturalWidth * scale);
        cv.height = Math.round(img.naturalHeight * scale);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        resolve(cv.toDataURL("image/jpeg", 0.85).split(",")[1]);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("This photo couldn't be read. Please use a JPG or PNG photo.")); };
      img.src = url;
    });
  }

  async function addPhotos(ci, files) {
    const c = editing.colours[ci];
    const added = files.map((file) => ({ file, preview: URL.createObjectURL(file), uploading: true }));
    c.images.push(...added);
    dirty = true;
    renderEdit();
    for (const im of added) await upload(im); // one at a time
  }

  async function upload(im) {
    im.uploading = true;
    im.error = false;
    renderEdit();
    try {
      const data = await toJpeg(im.file);
      const j = await call("upload", { name: `${editing.id || "new"}-${Date.now()}`, data });
      im.url = j.url;
    } catch (e) {
      im.error = true;
      toast(e.message);
    }
    im.uploading = false;
    if (editing) renderEdit();
  }

  /* ---------- save / delete ---------- */
  function fail(msg) {
    const box = $("#err");
    box.textContent = msg;
    box.hidden = false;
    box.scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  }

  // A product in the shape the script's "save" expects
  const designPayload = (d) => ({
    id: d.id, name: d.name.trim(), category: d.category, price: d.price, mrp: d.mrp, sizes: d.sizes,
    description: d.description, fabric: d.fabric, lining: d.lining, length: d.length, sleeve_type: d.sleeve_type,
    dupatta: d.dupatta, bottom: d.bottom, other_details: d.other_details, tag: d.tag,
    featured: d.featured, made_to_order: d.made_to_order, hidden: d.hidden,
    colours: d.colours.map((c) => ({
      row: c.row, color: c.color.trim(), color_code: c.color_code,
      images: c.images.map((im) => im.url).filter(Boolean),
      sold_out: c.sold_out.filter((s) => d.sizes.includes(s)),
      in_stock: c.in_stock, price: c.price
    }))
  });

  async function save() {
    const d = editing;
    const names = d.colours.map((c) => c.color.trim().toLowerCase());
    if (!d.name.trim()) return fail("Please enter the product name.");
    if (!(Number(d.price) > 0)) return fail("Please enter the price.");
    if (Number(d.mrp) && Number(d.mrp) < Number(d.price)) return fail("MRP should be more than the price (or leave MRP empty).");
    if (d.colours.length > 1 && names.some((n) => !n)) return fail("Please give every colour a name.");
    if (new Set(names).size !== names.length) return fail("Two colours have the same name.");
    const photos = d.colours.flatMap((c) => c.images);
    if (photos.some((im) => im.uploading)) return fail("Please wait, photos are still uploading.");
    if (photos.some((im) => im.error)) return fail("Some photos didn't upload. Tap Retry on them, or remove them.");
    if (!photos.length) return fail("Please add at least one photo.");

    const design = designPayload(d);
    const btn = $("#save");
    btn.disabled = true;
    btn.textContent = "Saving…";
    try {
      const j = await call("save", { design });
      dirty = false;
      toast(`Saved ${j.id} ✓ It shows on the website within about 5 minutes.`);
      showList(j.id, true);
    } catch (e) {
      btn.disabled = false;
      btn.textContent = d.id ? "Save changes" : "Add product";
      fail(e.message);
    }
  }

  async function remove() {
    const d = editing;
    if (!confirm(`Delete "${d.name}" (${d.id}) from the website and the sheet?\n\nThis can't be undone. To keep it for later, tick "Hide from website" instead.`)) return;
    try {
      await call("delete", { id: d.id });
      dirty = false;
      toast(`Deleted ${d.id}`);
      showList(undefined, true);
    } catch (e) {
      fail(e.message);
    }
  }

  window.addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  /* =========================================================
     Loading everything, and the bottom tabs
     ========================================================= */
  // Reads products, reviews, settings and orders in one go. Returns false (and shows why) if it failed.
  async function refresh() {
    try {
      const j = await call("load");
      designs = toDesigns(j.products.headers, j.products.rows);
      reviews = toReviews(j.reviews);
      orders = toOrders(j.orders);
      loadedAt = Date.now();
      settingsMap = {};
      (j.settings.rows || []).forEach((r) => { settingsMap[keyOf(r.label)] = r.value; });
      return true;
    } catch (e) {
      if (/PIN/i.test(e.message)) { showLogin(e.message); return false; }
      setTabs(null);
      app.innerHTML = `<section class="adm-card"><p class="adm-error">${esc(e.message)}</p><button class="btn" id="retry">Try again</button></section>`;
      $("#retry").addEventListener("click", () => start());
      return false;
    }
  }

  // Coming back to the admin after 5+ minutes: read the sheets again (only on list screens, never mid-edit)
  document.addEventListener("visibilitychange", async () => {
    if (document.hidden || !auth.pin || !loadedAt || Date.now() - loadedAt < 5 * 60 * 1000 || dirty) return;
    const on = $("#tabs").hidden ? null : $("#tabs .on");
    const show = on && { home: showDashboard, products: () => showList(), orders: showOrders, reviews: showReviews }[on.dataset.tab];
    if (show && (await refresh())) show();
  });

  async function start() {
    $("#logout").hidden = false;
    setTabs(null);
    app.innerHTML = `<p class="adm-loading">Loading your shop…</p>`;
    if (await refresh()) showDashboard();
  }

  // active: "home" | "products" | "orders" | "reviews" | "settings", or null to hide the tabs
  function setTabs(active) {
    const tabs = $("#tabs");
    tabs.hidden = !active;
    document.body.classList.toggle("adm-has-tabs", !!active);
    tabs.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("on", b.dataset.tab === active));
    const waiting = reviews.list.filter((r) => !r.show).length;
    $("#tab-badge").textContent = waiting;
    $("#tab-badge").hidden = !waiting;
    const toShip = orders.list.filter((o) => o.status === "paid" || o.status === "packed").length;
    $("#tab-badge-orders").textContent = toShip;
    $("#tab-badge-orders").hidden = !toShip;
  }

  $("#tabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (!b) return;
    if (dirty && !confirm("Leave without saving your changes?")) return;
    dirty = false;
    ({ home: showDashboard, products: () => showList(), orders: showOrders, reviews: showReviews, settings: showSettings })[b.dataset.tab]();
    window.scrollTo(0, 0);
  });

  /* =========================================================
     Dashboard
     ========================================================= */
  const isSample = (url) => /images\.unsplash\.com/.test(url || "");

  function showDashboard() {
    setTabs("home");
    editing = null;
    cfg = null;
    order = null;
    const shown = designs.filter((d) => !d.hidden);
    const colours = shown.flatMap((d) => d.colours.map((c) => ({ d, c })));
    const soldOut = colours.filter(({ d, c }) => !c.in_stock || (d.sizes.length && c.sold_out.length >= d.sizes.length));
    const noPhotos = colours.filter(({ c }) => !c.images.length);
    const waiting = reviews.list.filter((r) => !r.show);
    const toShip = orders.list.filter((o) => o.status === "paid" || o.status === "packed");
    const unpaid = orders.list.filter((o) => o.status === "new");
    const thisMonth = monthOf(stampOf(new Date()));
    const monthSales = orders.list.filter((o) => monthOf(o.date) === thisMonth && SOLD.includes(o.status)).reduce((n, o) => n + salesOf(o), 0);

    // things to fix, most important first
    const todo = [];
    if (orders.error) todo.push({ kind: "bad", text: `Orders couldn't load: ${orders.error}`, go: "orders" });
    toShip.filter((o) => daysSince(o.paid_on || o.date) >= 2)
      .forEach((o) => todo.push({ kind: "warn", text: `${o.name} paid ${daysSince(o.paid_on || o.date)} days ago. Not shipped yet (${o.id})`, order: o.id }));
    unpaid.filter((o) => daysSince(o.date) >= 2)
      .forEach((o) => todo.push({ kind: "info", text: `${o.name} hasn't paid for ${daysSince(o.date)} days. Remind or cancel (${o.id})`, order: o.id }));
    orders.list.filter((o) => o.status === "shipped" && daysSince(o.shipped_on) >= 10)
      .forEach((o) => todo.push({ kind: "tip", text: `${o.name}'s order was shipped ${daysSince(o.shipped_on)} days ago. Delivered? (${o.id})`, order: o.id }));
    if (reviews.error) todo.push({ kind: "bad", text: `Reviews couldn't load: ${reviews.error}`, go: "reviews" });
    if (waiting.length) todo.push({ kind: "info", text: `${waiting.length} customer review${waiting.length === 1 ? " is" : "s are"} waiting for approval`, go: "reviews" });
    noPhotos.forEach(({ d, c }) => todo.push({ kind: "warn", text: `${d.id} · ${c.color || d.name} has no photos of its own`, id: d.id }));
    shown.filter((d) => d.colours.some((c) => c.images.some((im) => isSample(im.url))))
      .forEach((d) => todo.push({ kind: "warn", text: `${d.id} · ${d.name} still uses a sample photo`, id: d.id }));
    bannerList().forEach((b, i) => { if (isSample(b.image)) todo.push({ kind: "warn", text: `Home banner ${i + 1} still uses a sample photo`, go: "settings" }); });
    shown.filter((d) => !d.colours.some((c) => c.in_stock && (!d.sizes.length || c.sold_out.length < d.sizes.length)))
      .forEach((d) => todo.push({ kind: "info", text: `${d.id} · ${d.name} is completely sold out`, id: d.id }));
    shown.filter((d) => !d.description || !d.fabric)
      .forEach((d) => todo.push({ kind: "tip", text: `${d.id} · add ${!d.description ? "a description" : "the fabric"} (helps customers and Google)`, id: d.id }));

    const LIMIT = 8;
    const stat = (n, label, go, kind = "") => `<button type="button" class="adm-stat ${kind}" data-go="${go}"><strong>${n}</strong><span>${label}</span></button>`;
    app.innerHTML = `
      <h1 class="adm-h1">Hello! 👋</h1>
      <p class="muted">Here's your shop today.</p>
      <div class="adm-stats">
        ${stat(toShip.length, "orders to pack &amp; ship", "orders-ship", toShip.length ? "hot" : "")}
        ${stat(unpaid.length, "awaiting payment", "orders-new")}
        ${stat(money(monthSales), `sales in ${MONTHS[new Date().getMonth()]}`, "sales")}
        ${stat(waiting.length, "reviews waiting", "reviews", waiting.length ? "hot" : "")}
        ${stat(shown.length, "products on the website", "products")}
        ${stat(soldOut.length, "colours sold out", "products", soldOut.length ? "warn" : "")}
        ${stat(noPhotos.length, "colours without photos", "products", noPhotos.length ? "warn" : "")}
        ${stat(designs.length - shown.length, "hidden drafts", "products")}
      </div>

      <section class="adm-card">
        <h2>Needs attention ${todo.length ? `<small>${todo.length}</small>` : ""}</h2>
        ${todo.length ? `<ul class="adm-todo">${todo.slice(0, LIMIT).map((t) => `
          <li><button type="button" class="${t.kind}" ${t.order ? `data-order="${esc(t.order)}"` : t.id ? `data-open="${esc(t.id)}"` : `data-go="${t.go}"`}>${esc(t.text)} <span>›</span></button></li>`).join("")}</ul>
          ${todo.length > LIMIT ? `<p class="muted small">…and ${todo.length - LIMIT} more. Fix these first.</p>` : ""}`
        : `<p class="adm-allgood">Everything looks good ✨</p>`}
      </section>

      <section class="adm-card">
        <h2>Quick actions</h2>
        <div class="adm-quick">
          <button type="button" class="btn" data-quick="order">+ New order</button>
          <button type="button" class="btn btn-outline" data-quick="add">+ Add product</button>
          <a class="btn btn-outline" href="index.html" target="_blank" rel="noopener">View website</a>
          <a class="btn btn-outline" href="https://cloud.umami.is" target="_blank" rel="noopener">Visitor stats</a>
        </div>
        <p class="muted small">Changes show on the website within about 5 minutes of saving. A payment link without saving an order: <a href="paylink" target="_blank" rel="noopener">payment link tool</a>.</p>
      </section>`;
  }

  // where the dashboard's numbers and to-dos lead
  const GO = {
    products: () => showList(), reviews: () => showReviews(), settings: () => showSettings(),
    orders: () => { ordersView = "list"; showOrders(); },
    "orders-ship": () => { ordersView = "list"; orderFilter = "ship"; showOrders(); },
    "orders-new": () => { ordersView = "list"; orderFilter = "new"; showOrders(); },
    sales: () => { ordersView = "sales"; salesMonth = ""; showOrders(); }
  };
  app.addEventListener("click", (e) => {
    const go = e.target.closest("[data-go]");
    const open = e.target.closest("[data-open]");
    const quick = e.target.closest("[data-quick]");
    if (go) GO[go.dataset.go]();
    if (open) showEdit(designs.find((d) => d.id === open.dataset.open));
    if (quick) quick.dataset.quick === "order" ? showOrder(null) : showEdit(null);
    if (go || open || quick) window.scrollTo(0, 0);
  });

  /* =========================================================
     Reviews: approve / hide / delete / add the customer's photo
     ========================================================= */
  function toReviews(r) {
    if (!r || r.error) return { list: [], error: (r && r.error) || "" };
    const keys = r.headers.map(keyOf);
    const out = r.rows.map(({ row, cells }) => {
      const o = {};
      keys.forEach((k, i) => { if (k && !(k in o)) o[k] = String(cells[i] ?? "").trim(); });
      return {
        row, stamp: o.timestamp || cells[0] || "", name: o.name || "", city: o.city || "",
        rating: Math.min(5, Math.round(Number(o.rating) || 0)), text: o.review || o.reiew || "",
        order: o.order_id || "", product: o.product || "", photo: o.photo || "",
        show: /^(yes|y|true|1)$/i.test(o.show || "") ? "yes" : /^(no|n|false|0)$/i.test(o.show || "") ? "no" : ""
      };
    }).filter((x) => x.name || x.text);
    return { list: out.reverse(), error: "" }; // newest first
  }

  let reviewFilter = "waiting";
  function showReviews() {
    setTabs("reviews");
    editing = null;
    cfg = null;
    order = null;
    const counts = { waiting: 0, yes: 0, no: 0 };
    reviews.list.forEach((r) => { counts[r.show || "waiting"]++; });
    const shown = reviews.list.filter((r) => reviewFilter === "all" || (r.show || "waiting") === reviewFilter);
    const stars = (n) => "★".repeat(n) + `<span class="off">${"★".repeat(5 - n)}</span>`;
    const product = (id) => designs.find((d) => d.id === id);
    app.innerHTML = `
      <div class="adm-head"><h1>Reviews <small>${reviews.list.length}</small></h1></div>
      ${reviews.error ? `<p class="adm-error">The reviews sheet couldn't be opened: ${esc(reviews.error)}</p>` : ""}
      <p class="muted small">New reviews from the website wait here. <strong>Approve</strong> to show one on the website.</p>
      <div class="adm-chips" id="rv-filters">
        ${[["waiting", `Waiting (${counts.waiting})`], ["yes", `Approved (${counts.yes})`], ["no", `Hidden (${counts.no})`], ["all", "All"]].map(([k, l]) =>
          `<button type="button" data-rf="${k}" class="${k === reviewFilter ? "on" : ""}">${l}</button>`).join("")}
      </div>
      <div class="adm-reviews">
        ${shown.length ? shown.map((r) => {
          const p = product(r.product);
          const img = p && p.colours.find((c) => c.images.length)?.images[0]?.url;
          return `
          <article class="adm-review" data-row="${r.row}">
            <div class="adm-review-top">
              <span class="adm-stars">${stars(r.rating)}</span>
              <span class="adm-status ${r.show === "yes" ? "ok" : r.show === "no" ? "hidden" : "some"}">${r.show === "yes" ? "On website" : r.show === "no" ? "Hidden" : "Waiting"}</span>
            </div>
            <blockquote>“${esc(r.text)}”</blockquote>
            <p class="adm-review-by"><strong>${esc(r.name)}</strong>${r.city ? `, ${esc(r.city)}` : ""} <span class="muted">· ${esc(r.stamp)}</span></p>
            <p class="adm-review-for">${p
              ? `${img ? `<img src="${esc(thumbOf(img))}" alt="">` : ""}<span>About <strong>${esc(p.name)}</strong> (${esc(p.id)})</span>`
              : `<span>${r.product ? `Product code ${esc(r.product)}` : "About the shop in general"}</span>`}
              ${r.order ? `<span class="muted">Order ${esc(r.order)}</span>` : ""}</p>
            <div class="adm-review-photo">
              ${r.photo
                ? `<img src="${esc(thumbOf(r.photo))}" alt="Customer photo"><button type="button" class="adm-icon" data-rv="nophoto">Remove photo</button>`
                : `<label class="adm-icon">＋ Add customer's photo<input type="file" accept="image/*" data-rv="photo" hidden></label>`}
            </div>
            <div class="adm-review-actions">
              ${r.show !== "yes" ? `<button type="button" class="btn" data-rv="yes">Approve</button>` : ""}
              ${r.show !== "no" ? `<button type="button" class="btn btn-outline" data-rv="no">Hide</button>` : ""}
              <button type="button" class="adm-link-danger" data-rv="delete">Delete</button>
            </div>
          </article>`;
        }).join("") : `<p class="muted center">No reviews here.</p>`}
      </div>`;
  }

  async function reviewAction(row, change, done) {
    const r = reviews.list.find((x) => x.row === row);
    if (!r) return;
    app.querySelectorAll(`[data-row="${row}"] button`).forEach((b) => (b.disabled = true));
    try {
      await call("review", { row, stamp: r.stamp, ...change });
      toast(done);
      if (await refresh()) showReviews();
    } catch (e) {
      toast(e.message);
      if (await refresh()) showReviews();
    }
  }

  app.addEventListener("click", (e) => {
    const f = e.target.closest("[data-rf]");
    if (f) { reviewFilter = f.dataset.rf; return showReviews(); }
    const b = e.target.closest("button[data-rv]");
    if (!b) return;
    const row = Number(b.closest("[data-row]").dataset.row);
    const act = b.dataset.rv;
    if (act === "yes") reviewAction(row, { show: "yes" }, "Approved ✓ It shows on the website within about 5 minutes.");
    if (act === "no") reviewAction(row, { show: "no" }, "Hidden from the website");
    if (act === "nophoto") reviewAction(row, { photo: "" }, "Photo removed");
    if (act === "delete" && confirm("Delete this review for good?")) reviewAction(row, { remove: true }, "Review deleted");
  });

  app.addEventListener("change", async (e) => {
    const input = e.target.closest('input[data-rv="photo"]');
    if (!input || !input.files.length) return;
    const row = Number(input.closest("[data-row]").dataset.row);
    toast("Uploading photo…");
    try {
      const data = await toJpeg(input.files[0], 1200);
      const j = await call("upload", { name: `review-${row}-${Date.now()}`, data });
      reviewAction(row, { photo: j.url }, "Photo added ✓");
    } catch (err) {
      toast(err.message);
    }
  });

  /* =========================================================
     Shop settings: banners, top bar, menu, shipping, followers
     ========================================================= */
  const textOf = (a) => (typeof a === "string" ? a : (a && a.text) || "");
  const starsFromHtml = (h) => String(h || "").replace(/<em>(.*?)<\/em>/g, "*$1*").replace(/<[^>]+>/g, "");
  // "shop.html?cat=Anarkali%20Sets" → "Anarkali Sets", "shop.html?tag=new" → "new"
  function showsFromLink(link) {
    const m = String(link || "").match(/[?&](cat|tag)=([^&]+)/);
    if (m) return decodeURIComponent(m[2]);
    return /shop\.html$/.test(link || "") ? "all" : link || "all";
  }
  const S = (k) => settingsMap[k];
  const has = (k) => k in settingsMap;
  const val = (k, fallback) => (has(k) && S(k) !== "" ? S(k) : fallback);

  // The banners the website shows now (Settings tab, else the website's built-in ones)
  function bannerList() {
    const count = Math.min(5, parseInt(S("banner_count"), 10) || C.heroSlides.length);
    return Array.from({ length: count }, (_, i) => {
      const base = C.heroSlides[i] || C.heroSlides[0];
      const k = (f) => `banner_${i + 1}_${f}`;
      return {
        image: val(k("image"), base.image),
        smallText: has(k("small_text")) ? S(k("small_text")) : base.eyebrow || "",
        heading: val(k("heading"), starsFromHtml(base.title)),
        text: has(k("text")) ? S(k("text")) : base.text || "",
        button: val(k("button"), base.button || "Shop now"),
        shows: val(k("shows"), showsFromLink(base.link)),
        focus: val(k("focus"), "middle")
      };
    });
  }

  function showSettings() {
    setTabs("settings");
    editing = null;
    order = null;
    const rateKeys = Object.keys(settingsMap).map((k) => k.match(/^shipping_(\d+)_items?$/)).filter((m) => m && S(m[0]) !== "")
      .sort((a, b) => a[1] - b[1]);
    cfg = {
      banners: bannerList(),
      announcements: [0, 1, 2].map((i) => (has(`announcement_${i + 1}`) ? S(`announcement_${i + 1}`) : textOf(C.announcements[i]))),
      menu: has("menu_categories") && S("menu_categories") ? list(S("menu_categories")) : C.categories.slice(),
      shippingTime: val("shipping_time", C.shippingTime),
      rates: rateKeys.length ? rateKeys.map((m) => S(m[0]).replace(/[^\d.]/g, "")) : C.shippingRates.map(String),
      followers: val("instagram_followers", C.instagramFollowers),
      madeText: val("made_to_order_text", C.madeToOrderText),
      oldRateCount: Math.max(rateKeys.length, 6)
    };
    dirty = false;
    renderSettings();
  }

  const FOCUS_POS = { top: "center 15%", middle: "center", bottom: "center 85%" };
  const bannerText = (b) => `${b.smallText ? `<small>${esc(b.smallText)}</small>` : ""}
    <strong>${esc(b.heading).replace(/\*(.+?)\*/g, "<em>$1</em>")}</strong>
    ${b.text ? `<p>${esc(b.text)}</p>` : ""}<span>${esc(b.button || "Shop now")}</span>`;

  function renderSettings() {
    const y = window.scrollY;
    const cats = [...new Set([...cfg.menu, ...C.categories, ...designs.map((d) => d.category)].filter(Boolean))];
    const showsOptions = (v) => {
      const opts = [["new", "New arrivals"], ["bestseller", "Bestsellers"], ["all", "All products"], ...cats.map((c) => [c, `Category: ${c}`])];
      if (!opts.some(([k]) => k === v)) opts.push([v, `Link: ${v}`]);
      return opts.map(([k, l]) => `<option value="${esc(k)}" ${k === v ? "selected" : ""}>${esc(l)}</option>`).join("");
    };
    app.innerHTML = `
      <div class="adm-head"><h1>Shop settings</h1></div>
      <p class="adm-error" id="err" hidden></p>

      <section class="adm-card">
        <h2>Home page banners <small>${cfg.banners.length} of 5</small></h2>
        <p class="muted small">Phones show the middle of the photo; computers show it wide. Check both previews, and use "Show top / middle / bottom" to move the photo. Put <strong>*stars*</strong> around a word in the heading to make it pink.</p>
        ${cfg.banners.map((b, i) => `
          <article class="adm-banner" data-b="${i}">
            <div class="adm-prevs">${["phone", "computer"].map((kind) => `
              <figure class="adm-prev ${kind}">
                <div class="adm-prev-box">
                  ${b.preview || b.image ? `<img src="${esc(b.preview || thumbOf(b.image))}" alt="" style="object-position:${FOCUS_POS[b.focus] || "center"}">` : `<span class="adm-prev-empty">No photo yet</span>`}
                  <div class="adm-prev-text">${bannerText(b)}</div>
                  ${b.uploading ? `<i class="adm-busy">Uploading…</i>` : ""}
                </div>
                <figcaption>${kind === "phone" ? "On phones" : "On computers"}</figcaption>
              </figure>`).join("")}
            </div>
            <div class="adm-banner-tools">
              <label class="adm-icon">📷 Change photo<input type="file" accept="image/*" data-bset="photo" hidden></label>
              <select class="field" data-bset="focus" aria-label="Photo focus">
                ${[["top", "Show top of photo"], ["middle", "Show middle"], ["bottom", "Show bottom"]].map(([k, l]) => `<option value="${k}" ${k === b.focus ? "selected" : ""}>${l}</option>`).join("")}
              </select>
              ${i > 0 ? `<button type="button" class="adm-icon" data-bact="up">↑</button>` : ""}
              ${cfg.banners.length > 1 ? `<button type="button" class="adm-icon danger" data-bact="remove">✕</button>` : ""}
            </div>
            <div class="adm-two">
              <div><label class="field-label">Small text</label><input class="field" data-bset="smallText" value="${esc(b.smallText)}" placeholder="New Collection"></div>
              <div><label class="field-label">Button text</label><input class="field" data-bset="button" value="${esc(b.button)}" placeholder="Shop now"></div>
            </div>
            <label class="field-label">Heading</label>
            <input class="field" data-bset="heading" value="${esc(b.heading)}" placeholder="Anarkalis made for *celebrations*">
            <label class="field-label">Line under the heading</label>
            <input class="field" data-bset="text" value="${esc(b.text)}">
            <label class="field-label">Button opens</label>
            <select class="field" data-bset="shows">${showsOptions(b.shows)}</select>
          </article>`).join("")}
        ${cfg.banners.length < 5 ? `<button type="button" class="btn btn-outline btn-block" data-sact="add-banner">+ Add a banner</button>` : ""}
      </section>

      <section class="adm-card">
        <h2>Top bar messages</h2>
        <p class="muted small">The thin strip at the very top. Leave a box empty to remove that message. Message 2 opens WhatsApp; message 3 opens the shipping policy.</p>
        ${cfg.announcements.map((a, i) => `<label class="field-label">Message ${i + 1}</label><input class="field" data-sset="announcement" data-i="${i}" value="${esc(a)}" maxlength="90">`).join("")}
      </section>

      <section class="adm-card">
        <h2>Menu categories</h2>
        <p class="muted small">The categories in the website menu, in this order. Products in other categories still show in the shop and its filters.</p>
        <ul class="adm-menu">${cfg.menu.map((c, i) => `
          <li data-m="${i}"><span>${esc(c)}</span>
            ${i > 0 ? `<button type="button" class="adm-icon" data-mact="up">↑</button>` : ""}
            <button type="button" class="adm-icon danger" data-mact="remove">✕</button></li>`).join("")}</ul>
        <div class="adm-inline">
          <input class="field" id="new-cat" list="dl-cats" placeholder="Add a category, e.g. Lehengas">
          <button type="button" class="btn btn-outline" data-sact="add-cat">Add</button>
        </div>
        <datalist id="dl-cats">${cats.filter((c) => !cfg.menu.includes(c)).map((c) => `<option value="${esc(c)}">`).join("")}</datalist>
      </section>

      <section class="adm-card">
        <h2>Delivery &amp; shipping</h2>
        <label class="field-label">Delivery time</label>
        <input class="field" data-sset="shippingTime" value="${esc(cfg.shippingTime)}" placeholder="7–8 working days">
        <label class="field-label">Shipping charge</label>
        ${cfg.rates.map((r, i) => `
          <div class="adm-inline adm-rate"><span>${i + 1} item${i ? "s" : ""}</span>
            <input class="field" data-sset="rate" data-i="${i}" type="number" inputmode="numeric" min="0" value="${esc(r)}">
            ${i === cfg.rates.length - 1 && i > 0 ? `<button type="button" class="adm-icon danger" data-sact="remove-rate">✕</button>` : ""}</div>`).join("")}
        <button type="button" class="adm-icon" data-sact="add-rate">+ Add charge for ${cfg.rates.length + 1} items</button>
        <p class="muted small">More items than listed: "by weight, confirmed on WhatsApp". Use 0 for free shipping.</p>
      </section>

      <section class="adm-card">
        <h2>Other</h2>
        <label class="field-label">Instagram followers (shown as "26.8K+")</label>
        <input class="field" data-sset="followers" value="${esc(cfg.followers)}" placeholder="26.8K">
        <label class="field-label">Made-to-order message</label>
        <input class="field" data-sset="madeText" value="${esc(cfg.madeText)}">
      </section>

      <div class="adm-save"><button type="button" class="btn btn-block" data-sact="save" id="save-settings">Save settings</button></div>`;
    window.scrollTo(0, y);
  }

  app.addEventListener("input", (e) => {
    if (!cfg) return;
    const t = e.target;
    const banner = t.closest("[data-b]");
    if (banner && t.dataset.bset && t.tagName !== "SELECT" && t.type !== "file") {
      cfg.banners[Number(banner.dataset.b)][t.dataset.bset] = t.value;
      // live preview without redrawing the form
      const b = cfg.banners[Number(banner.dataset.b)];
      banner.querySelectorAll(".adm-prev-text").forEach((el) => (el.innerHTML = bannerText(b)));
      dirty = true;
    }
    const k = t.dataset.sset;
    if (k === "announcement") cfg.announcements[Number(t.dataset.i)] = t.value;
    else if (k === "rate") cfg.rates[Number(t.dataset.i)] = t.value;
    else if (k) cfg[k] = t.value;
    if (k) dirty = true;
  });

  app.addEventListener("change", async (e) => {
    if (!cfg) return;
    const t = e.target;
    const banner = t.closest("[data-b]");
    if (!banner || !t.dataset.bset) return;
    const b = cfg.banners[Number(banner.dataset.b)];
    if (t.tagName === "SELECT") { b[t.dataset.bset] = t.value; dirty = true; return renderSettings(); }
    if (t.dataset.bset === "photo" && t.files.length) {
      b.uploading = true;
      b.preview = URL.createObjectURL(t.files[0]); // show the new photo straight away
      renderSettings();
      try {
        const data = await toJpeg(t.files[0], 1800);
        const j = await call("upload", { name: `banner-${Date.now()}`, data });
        b.image = j.url;
        dirty = true;
      } catch (err) {
        b.preview = "";
        toast(err.message);
      }
      b.uploading = false;
      if (cfg) renderSettings();
    }
  });

  app.addEventListener("click", (e) => {
    if (!cfg) return;
    const t = e.target.closest("[data-bact], [data-mact], [data-sact]");
    if (!t) return;
    const bi = t.closest("[data-b]") ? Number(t.closest("[data-b]").dataset.b) : -1;
    const mi = t.closest("[data-m]") ? Number(t.closest("[data-m]").dataset.m) : -1;
    const act = t.dataset.bact || t.dataset.mact || t.dataset.sact;
    if (act === "save") return saveSettings();
    if (t.dataset.bact === "up") cfg.banners.splice(bi - 1, 0, ...cfg.banners.splice(bi, 1));
    if (t.dataset.bact === "remove" && confirm("Remove this banner?")) cfg.banners.splice(bi, 1);
    if (act === "add-banner") cfg.banners.push({ image: "", smallText: "", heading: "", text: "", button: "Shop now", shows: "new", focus: "middle" });
    if (t.dataset.mact === "up") cfg.menu.splice(mi - 1, 0, ...cfg.menu.splice(mi, 1));
    if (t.dataset.mact === "remove") cfg.menu.splice(mi, 1);
    if (act === "add-cat") {
      const name = $("#new-cat").value.trim();
      if (!name) return;
      if (!cfg.menu.some((c) => c.toLowerCase() === name.toLowerCase())) cfg.menu.push(name);
    }
    if (act === "add-rate") cfg.rates.push(cfg.rates[cfg.rates.length - 1] || "");
    if (act === "remove-rate") cfg.rates.pop();
    dirty = true;
    renderSettings();
  });

  async function saveSettings() {
    const fail = (msg) => { const box = $("#err"); box.textContent = msg; box.hidden = false; box.scrollIntoView({ behavior: "smooth", block: "center" }); };
    if (cfg.banners.some((b) => b.uploading)) return fail("Please wait, a banner photo is still uploading.");
    const noPhoto = cfg.banners.findIndex((b) => !b.image);
    if (noPhoto >= 0) return fail(`Banner ${noPhoto + 1} needs a photo.`);
    const noHeading = cfg.banners.findIndex((b) => !b.heading.trim());
    if (noHeading >= 0) return fail(`Banner ${noHeading + 1} needs a heading.`);
    if (!cfg.menu.length) return fail("Keep at least one menu category.");
    if (cfg.rates.some((r) => r === "" || !(Number(r) >= 0))) return fail("Please fill in every shipping charge (0 for free).");

    const values = {
      "instagram followers": cfg.followers.trim().replace(/\+$/, ""),
      "shipping time": cfg.shippingTime.trim(),
      "made to order text": cfg.madeText.trim(),
      "menu categories": cfg.menu.join(", "),
      "banner count": String(cfg.banners.length)
    };
    cfg.announcements.forEach((a, i) => { values[`announcement ${i + 1}`] = a.trim(); });
    for (let i = 0; i < Math.max(cfg.oldRateCount, cfg.rates.length); i++) {
      values[`shipping ${i + 1} item${i ? "s" : ""}`] = i < cfg.rates.length ? String(Number(cfg.rates[i])) : null;
    }
    cfg.banners.forEach((b, i) => {
      const n = `banner ${i + 1}`;
      values[`${n} image`] = b.image;
      values[`${n} small text`] = b.smallText.trim();
      values[`${n} heading`] = b.heading.trim();
      values[`${n} text`] = b.text.trim();
      values[`${n} button`] = b.button.trim() || "Shop now";
      values[`${n} shows`] = b.shows;
      values[`${n} focus`] = b.focus;
    });

    const btn = $("#save-settings");
    btn.disabled = true;
    btn.textContent = "Saving…";
    try {
      await call("saveSettings", { values });
      dirty = false;
      toast("Settings saved ✓ The website updates within about 5 minutes.");
      if (await refresh()) showSettings();
    } catch (e) {
      btn.disabled = false;
      btn.textContent = "Save settings";
      fail(e.message);
    }
  }

  /* =========================================================
     Orders: kept in a private Google Sheet the script makes
     ("The Women Shop - Orders (private)"), one row per order
     ========================================================= */
  const STEPS = [["new", "Ordered"], ["paid", "Paid"], ["packed", "Packed"], ["shipped", "Shipped"], ["delivered", "Delivered"]];
  const STATUS_LABEL = { new: "Awaiting payment", paid: "Paid", packed: "Packed", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled" };
  const STATUS_CLASS = { new: "some", paid: "paid", packed: "packed", shipped: "shipped", delivered: "ok", cancelled: "hidden" };
  const SOLD = ["paid", "packed", "shipped", "delivered"]; // these count as sales
  const COURIERS = ["DTDC", "Delhivery", "India Post", "Professional Couriers", "ST Courier", "Blue Dart", "Shiprocket", "XpressBees", "Ekart", "Trackon"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  // "Awaiting payment" / "paid" / "Shipped" → new / paid / shipped
  const statusKey = (v) => {
    const k = keyOf(v);
    if (k === "canceled") return "cancelled";
    return Object.keys(STATUS_LABEL).find((s) => s === k || keyOf(STATUS_LABEL[s]) === k) || "new";
  };
  const num = (v) => Number(String(v ?? "").replace(/[^\d.]/g, "")) || 0;
  const pad = (n) => String(n).padStart(2, "0");
  const stampOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const dateOf = (s) => {
    const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
    return m ? new Date(+m[1], m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)) : null;
  };
  const daysSince = (s) => { const d = dateOf(s); return d ? Math.floor((Date.now() - d) / 86400000) : 0; };
  const fmtDay = (s, time = false) => {
    const d = dateOf(s);
    if (!d) return s || "";
    const day = `${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : ""}`;
    return time && /\d{2}:\d{2}/.test(s) ? `${day}, ${d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}` : day;
  };
  const monthOf = (s) => String(s || "").slice(0, 7); // "2026-11"
  const monthName = (m) => `${MONTHS[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}`;
  const shiftMonth = (m, by) => { const d = new Date(Number(m.slice(0, 4)), Number(m.slice(5)) - 1 + by, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };

  // phone numbers: "093989 30741" / "+91 93989 30741" → "919398930741"
  const phoneDigits = (v) => { const d = String(v || "").replace(/\D/g, "").replace(/^0+/, ""); return d.length === 10 ? `91${d}` : d; };
  const phoneOk = (v) => /^91[6-9]\d{9}$/.test(phoneDigits(v));
  const phoneShow = (v) => { const d = phoneDigits(v); return /^91\d{10}$/.test(d) ? `+91 ${d.slice(2, 7)} ${d.slice(7)}` : String(v || ""); };

  const itemDesc = (it) => [it.color, it.size].filter(Boolean).join(", ");
  const itemCount = (o) => o.items.reduce((n, it) => n + (Number(it.qty) || 0), 0);
  const productsTotal = (o) => o.items.reduce((n, it) => n + num(it.price) * (Number(it.qty) || 0), 0);
  const orderTotal = (o) => (o.items.length ? Math.max(0, productsTotal(o) + num(o.shipping) - num(o.discount)) : num(o.total));
  // Sales = what was paid for products, after the discount (shipping isn't counted)
  const salesOf = (o) => (o.items.length ? productsTotal(o) - num(o.discount) : Math.max(0, num(o.total) - num(o.shipping)));
  // Shipping charges from the Settings tab (else the website's), e.g. [80, 140]
  function shippingRates() {
    const keys = Object.keys(settingsMap).map((k) => k.match(/^shipping_(\d+)_items?$/)).filter((m) => m && S(m[0]) !== "").sort((a, b) => a[1] - b[1]);
    return keys.length ? keys.map((m) => num(S(m[0]))) : C.shippingRates.slice();
  }
  // "" when more items than the rates cover (by weight)
  const autoShipping = (count) => { const r = shippingRates(); return count >= 1 && count <= r.length ? String(r[count - 1]) : ""; };

  const payLink = (o) => { const ship = num(o.shipping); return `https://${C.domain}/pay?o=${encodeURIComponent(o.id)}&a=${orderTotal(o)}${ship ? `&s=${ship}` : ""}`; };
  const reviewLink = (o) => `https://${C.domain}/?review=${encodeURIComponent(o.id)}${o.items[0] ? `&p=${encodeURIComponent(o.items[0].id)}` : ""}`;
  const waTo = (o, text) => `https://wa.me/${phoneOk(o.phone) ? phoneDigits(o.phone) : ""}?text=${encodeURIComponent(text)}`;

  function toOrder(keys, row, cells) {
    const o = {};
    keys.forEach((k, i) => { if (k && !(k in o)) o[k] = String(cells[i] ?? "").trim(); });
    let items = [];
    try { items = JSON.parse(o.items_data || "[]"); } catch (e) { items = []; }
    if (!Array.isArray(items)) items = [];
    return {
      row, id: (o.order_id || "").toUpperCase(), date: o.date || "", status: statusKey(o.status),
      name: o.name || "", phone: o.phone || "", city: o.city || "", address: o.address || "", pincode: o.pincode || "",
      items: items.map((it) => ({ id: String(it.id || ""), name: String(it.name || ""), color: String(it.color || ""), size: String(it.size || ""), qty: Math.max(1, Number(it.qty) || 1), price: num(it.price) })),
      itemsText: o.items || "", shipping: o.shipping || "", discount: o.discount || "", total: o.total || "",
      payment_ref: o.payment_ref || "", courier: o.courier || "", tracking: o.tracking || "", tracking_link: o.tracking_link || "",
      notes: o.notes || "", paid_on: o.paid_on || "", packed_on: o.packed_on || "", shipped_on: o.shipped_on || "",
      delivered_on: o.delivered_on || "", cancelled_on: o.cancelled_on || "", stock_done: yes(o.stock_done), updated: o.updated || ""
    };
  }
  const byNewest = (a, b) => String(b.date).localeCompare(String(a.date)) || b.row - a.row;
  function toOrders(r) {
    if (!r || r.error) return { list: [], url: "", error: (r && r.error) || "" };
    const keys = r.headers.map(keyOf);
    return { list: r.rows.map(({ row, cells }) => toOrder(keys, row, cells)).filter((o) => o.id).sort(byNewest), url: r.url || "", error: "" };
  }

  /* ---------- reading the customer's WhatsApp order message (made by the website's "Order on WhatsApp") ---------- */
  function parseOrderMessage(text) {
    let t = String(text || "").replace(/\r/g, "");
    let name = "";
    // copied with the chat header: "[02/11/26, 8:15 pm] Kavya: Hi…" or "02/11/26, 8:15 pm - Kavya: Hi…"
    const head = t.match(/^\s*\[[^\]\n]{4,40}\]\s*([^:\n]{1,40}):\s*/) || t.match(/^\s*\d{1,2}\/\d{1,2}\/\d{2,4},?[^\n-]{3,20}-\s*([^:\n]{1,40}):\s*/);
    if (head) { name = head[1].trim(); t = t.slice(head[0].length); }
    t = t.replace(/\*/g, "");
    const id = ((t.match(/Order ID:\s*([A-Za-z0-9-]{3,30})/i) || [])[1] || "").toUpperCase();
    const items = [];
    const re = /^\s*\d+\.\s*(.+?)\s*\(([A-Za-z0-9_-]+)\)\s*\n\s*Size:\s*([^|\n]*?)\s*(?:\|\s*Colou?r:\s*([^|\n]+?)\s*)?\|\s*Qty:\s*(\d+)\s*\|\s*[^\d\n]*([\d,]+(?:\.\d+)?)/gm;
    let m;
    while ((m = re.exec(t))) {
      const qty = Math.max(1, Number(m[5]) || 1);
      items.push({ id: m[2].toUpperCase(), name: m[1].trim(), size: m[3].trim(), color: (m[4] || "").trim(), qty, price: Math.round(num(m[6]) / qty) });
    }
    const ship = t.match(/Shipping \(estimate\):\s*[^\d\n]*([\d,]+)/i);
    return { id, name, items, shipping: ship ? String(num(ship[1])) : "" };
  }

  function newOrderId() {
    const d = new Date();
    const ymd = `${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    let id;
    do id = `TWS${ymd}-${Math.floor(1000 + Math.random() * 9000)}`; while (orders.list.some((o) => o.id === id));
    return id;
  }
  // "TWS261102-1234" → the day the customer ordered on the website
  function dateFromId(id) {
    const m = String(id).match(/^TWS(\d{2})(\d{2})(\d{2})-/);
    if (!m || m[2] < 1 || m[2] > 12 || m[3] < 1 || m[3] > 31) return "";
    const day = `20${m[1]}-${m[2]}-${m[3]}`;
    const now = stampOf(new Date());
    return now.startsWith(day) ? now : day;
  }
  const blankOrder = () => ({
    row: 0, id: newOrderId(), date: "", status: "new", name: "", phone: "", city: "", address: "", pincode: "", items: [], itemsText: "",
    shipping: "", discount: "", total: "", payment_ref: "", courier: "", tracking: "", tracking_link: "", notes: "", stock_done: false,
    updated: "", shipAuto: true, paidNow: false, pick: {}, paste: "", pasteNote: ""
  });

  /* ---------- the messages you send the customer (WhatsApp opens with the text ready) ---------- */
  const MESSAGES = [["pay", "Payment link"], ["remind", "Payment reminder"], ["paid", "Payment received"],
    ["shipped", "Shipped + tracking"], ["delivered", "Delivered + ask for a review"], ["cancelled", "Order cancelled"]];
  const NEXT_MESSAGE = { new: "pay", paid: "paid", shipped: "shipped", delivered: "delivered", cancelled: "cancelled" };
  function messageFor(kind, o) {
    const first = String(o.name || "").trim().split(/\s+/)[0];
    const hi = `Hi${first ? ` ${first}` : ""}!`;
    const ship = num(o.shipping), disc = num(o.discount), total = orderTotal(o);
    const lines = o.items.map((it) => `• ${it.name}${itemDesc(it) ? ` (${itemDesc(it)})` : ""} × ${it.qty}`).join("\n");
    if (kind === "pay") {
      return `${hi} Your order *${o.id}* is confirmed ✅\n\n${lines ? `${lines}\n\n` : ""}` +
        `${o.items.length ? `Products: ${money(productsTotal(o))}\nShipping: ${ship ? money(ship) : "Free"}\n${disc ? `Discount: −${money(disc)}\n` : ""}` : ""}` +
        `Amount to pay: *${money(total)}*\nPay here (any UPI app): ${payLink(o)}\n\nPlease send the payment screenshot after paying. Thank you for shopping with ${C.name} 💖`;
    }
    if (kind === "remind") return `${hi} Just a reminder about your order *${o.id}* (${money(total)}).\nPay here (any UPI app): ${payLink(o)}\n\nMessage us if you need any help 😊`;
    if (kind === "paid") return `${hi} We've received your payment of *${money(total)}* for order *${o.id}* ✅\nWe'll pack it with care and send you the tracking details once it ships. Delivery usually takes ${val("shipping_time", C.shippingTime)}. 💖`;
    if (kind === "shipped") {
      return `${hi} Your order *${o.id}* is on the way 🚚\n${o.courier ? `Courier: ${o.courier}\n` : ""}${o.tracking ? `Tracking number: ${o.tracking}\n` : ""}${o.tracking_link ? `Track it here: ${o.tracking_link}\n` : ""}` +
        `\nPlease record a video while opening the parcel. We need it to exchange anything damaged in transit. 💖`;
    }
    if (kind === "delivered") {
      return `${hi} Your order *${o.id}* has been delivered 🎉 We hope you love it 💖\n\nCould you rate it? It takes 30 seconds and really helps our small shop: ${reviewLink(o)}\n\nTag us on Instagram @${C.instagramHandle} when you wear it ✨`;
    }
    return `${hi} Sorry, your order *${o.id}* has been cancelled. Please message us if you have any questions.`;
  }

  /* ---------- orders list + sales ---------- */
  let orderFilter = "active", orderQuery = "", ordersView = "list", salesMonth = "";
  const ORDER_FILTERS = [
    ["active", "Active", (o) => o.status !== "delivered" && o.status !== "cancelled"],
    ["new", "Awaiting payment", (o) => o.status === "new"],
    ["ship", "To pack & ship", (o) => o.status === "paid" || o.status === "packed"],
    ["shipped", "Shipped", (o) => o.status === "shipped"],
    ["delivered", "Delivered", (o) => o.status === "delivered"],
    ["cancelled", "Cancelled", (o) => o.status === "cancelled"],
    ["all", "All", () => true]
  ];
  const statusPill = (o) => `<span class="adm-status ${STATUS_CLASS[o.status]}">${STATUS_LABEL[o.status]}</span>`;
  // Shown when an order has waited too long at its step
  function lateNote(o) {
    if (o.status === "new" && daysSince(o.date) >= 2) return `unpaid for ${daysSince(o.date)} days`;
    if ((o.status === "paid" || o.status === "packed") && daysSince(o.paid_on || o.date) >= 2) return `paid ${daysSince(o.paid_on || o.date)} days ago`;
    if (o.status === "shipped" && daysSince(o.shipped_on) >= 10) return `shipped ${daysSince(o.shipped_on)} days ago`;
    return "";
  }
  const colourOf = (d, color) => d.colours.find((c) => c.color.toLowerCase() === String(color || "").toLowerCase()) || (d.colours.length === 1 ? d.colours[0] : null);
  const sizeOf = (d, size) => d.sizes.find((s) => up(s) === up(size || "")) || "";
  function itemImage(it) {
    const d = designs.find((x) => x.id === it.id);
    if (!d) return "";
    const c = (colourOf(d, it.color) || {}).images?.length ? colourOf(d, it.color) : d.colours.find((x) => x.images.length);
    return c ? thumbOf(c.images[0].url) : "";
  }

  function showOrders() {
    setTabs("orders");
    editing = null;
    cfg = null;
    order = null;
    dirty = false;
    app.innerHTML = `
      <div class="adm-head">
        <h1>Orders <small>${orders.list.length}</small></h1>
        <button type="button" class="btn" data-oq="new">+ New order</button>
      </div>
      <div class="adm-seg">
        <button type="button" data-oview="list" class="${ordersView === "list" ? "on" : ""}">Orders</button>
        <button type="button" data-oview="sales" class="${ordersView === "sales" ? "on" : ""}">Sales</button>
      </div>
      ${orders.error ? `<p class="adm-error">The orders sheet couldn't be opened: ${esc(orders.error)}</p>` : ""}
      <div id="ov"></div>`;
    if (ordersView === "sales") return drawSales();
    const n = (f) => orders.list.filter(f).length;
    $("#ov").innerHTML = `
      <input class="field adm-search" id="oq" type="search" placeholder="Search name, phone, order ID or product code" value="${esc(orderQuery)}">
      <div class="adm-chips" id="of">${ORDER_FILTERS.map(([k, l, f]) =>
        `<button type="button" data-of="${k}" class="${k === orderFilter ? "on" : ""}">${l}${k === "all" ? "" : ` (${n(f)})`}</button>`).join("")}</div>
      <div class="adm-list" id="oitems"></div>
      ${orders.url ? `<p class="muted small center adm-sheetlink"><a href="${esc(orders.url)}" target="_blank" rel="noopener">Open the orders sheet ↗</a> Private: only you can see it.</p>` : ""}`;
    drawOrders();
  }

  function drawOrders() {
    const q = orderQuery.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    const f = ORDER_FILTERS.find(([k]) => k === orderFilter)[2];
    const shown = orders.list.filter((o) => f(o) && (!q ||
      [o.id, o.name, o.city, o.itemsText, ...o.items.map((it) => `${it.id} ${it.name}`)].join(" ").toLowerCase().includes(q) ||
      (digits.length >= 4 && phoneDigits(o.phone).includes(digits))));
    $("#oitems").innerHTML = shown.length ? shown.map((o) => {
      const first = o.items[0];
      const img = first ? itemImage(first) : "";
      const late = lateNote(o);
      const what = first ? `${first.name}${itemDesc(first) ? ` (${itemDesc(first)})` : ""}${o.items.length > 1 ? ` + ${o.items.length - 1} more` : ""}` : o.itemsText.split("\n")[0];
      return `
        <button type="button" class="adm-item adm-order" data-order="${esc(o.id)}">
          <span class="adm-thumb">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ""}</span>
          <span class="adm-item-main">
            <strong>${esc(o.name || "(no name)")}${o.city ? ` · ${esc(o.city)}` : ""}</strong>
            <small>${esc(o.id)} · ${esc(fmtDay(o.date))}</small>
            <small class="adm-order-what">${esc(what)}</small>
          </span>
          <span class="adm-order-side">${statusPill(o)}<strong>${money(orderTotal(o))}</strong>${late ? `<em>${esc(late)}</em>` : ""}</span>
        </button>`;
    }).join("") : `<p class="muted center adm-empty">${orders.list.length ? "No orders here."
      : "No orders yet. When a customer sends an order on WhatsApp, copy the message and tap <strong>+ New order</strong>."}</p>`;
  }

  function drawSales() {
    const now = monthOf(stampOf(new Date()));
    if (!salesMonth) salesMonth = now;
    const m = salesMonth;
    const inMonth = orders.list.filter((o) => monthOf(o.date) === m);
    const sold = inMonth.filter((o) => SOLD.includes(o.status));
    const sales = sold.reduce((n, o) => n + salesOf(o), 0);
    const shipping = sold.reduce((n, o) => n + num(o.shipping), 0);
    const pieces = sold.reduce((n, o) => n + itemCount(o), 0);
    const unpaid = inMonth.filter((o) => o.status === "new");
    const cancelled = inMonth.filter((o) => o.status === "cancelled").length;
    const top = {};
    sold.forEach((o) => o.items.forEach((it) => {
      const t = top[it.id] || (top[it.id] = { it, qty: 0, amount: 0 });
      t.qty += it.qty;
      t.amount += num(it.price) * it.qty;
    }));
    const topList = Object.values(top).sort((a, b) => b.qty - a.qty || b.amount - a.amount).slice(0, 5);
    const cities = {};
    sold.forEach((o) => {
      const c = o.city.trim();
      // "ongole" and "Ongole" are the same city
      if (c) (cities[c.toLowerCase()] = cities[c.toLowerCase()] || { name: c.toLowerCase().replace(/(^|\s)\S/g, (x) => x.toUpperCase()), n: 0 }).n++;
    });
    const cityList = Object.values(cities).sort((a, b) => b.n - a.n).slice(0, 5);
    const months = Array.from({ length: 6 }, (_, i) => shiftMonth(m, i - 5)).map((mm) => ({
      mm, v: orders.list.filter((o) => monthOf(o.date) === mm && SOLD.includes(o.status)).reduce((n, o) => n + salesOf(o), 0)
    }));
    const max = Math.max(1, ...months.map((x) => x.v));
    const box = (n, label, kind = "") => `<div class="adm-stat ${kind}"><strong>${n}</strong><span>${label}</span></div>`;
    $("#ov").innerHTML = `
      <div class="adm-month">
        <button type="button" class="adm-icon" data-sm="-1" aria-label="Previous month">‹</button>
        <strong>${monthName(m)}</strong>
        <button type="button" class="adm-icon" data-sm="1" aria-label="Next month" ${m >= now ? "disabled" : ""}>›</button>
      </div>
      <div class="adm-stats">
        ${box(money(sales), "sales", "hot")}
        ${box(sold.length, `paid order${sold.length === 1 ? "" : "s"}`)}
        ${box(pieces, `piece${pieces === 1 ? "" : "s"} sold`)}
        ${box(sold.length ? money(Math.round(sales / sold.length)) : "–", "average order")}
        ${box(unpaid.length, `awaiting payment${unpaid.length ? ` (${money(unpaid.reduce((n, o) => n + orderTotal(o), 0))})` : ""}`, unpaid.length ? "warn" : "")}
        ${box(cancelled, "cancelled")}
      </div>
      <p class="muted small">Sales = what customers paid for products, after discounts, in orders marked Paid or later. Shipping charges (${money(shipping)} this month) aren't included.</p>
      <section class="adm-card">
        <h2>Best sellers</h2>
        ${topList.length ? `<ul class="adm-rank">${topList.map(({ it, qty, amount }) => {
          const img = itemImage(it);
          return `<li><span class="adm-thumb sm">${img ? `<img src="${esc(img)}" alt="">` : ""}</span><span><strong>${esc(it.name)}</strong><small>${esc(it.id)}</small></span><b>${qty} pc · ${money(amount)}</b></li>`;
        }).join("")}</ul>` : `<p class="muted small">No paid orders this month yet.</p>`}
      </section>
      ${cityList.length ? `<section class="adm-card"><h2>Top cities</h2><ul class="adm-rank">${cityList.map((c) =>
        `<li><span><strong>${esc(c.name)}</strong></span><b>${c.n} order${c.n === 1 ? "" : "s"}</b></li>`).join("")}</ul></section>` : ""}
      <section class="adm-card">
        <h2>Last 6 months</h2>
        <div class="adm-bars">${months.map(({ mm, v }) => `
          <div class="${mm === m ? "on" : ""}"><span>${MONTHS[Number(mm.slice(5)) - 1]}</span><i style="width:${Math.round((v / max) * 100)}%"></i><b>${money(v)}</b></div>`).join("")}</div>
      </section>`;
  }

  app.addEventListener("click", (e) => {
    const card = e.target.closest("[data-order]");
    if (card) {
      if (dirty && !confirm("Leave without saving your changes?")) return;
      const o = orders.list.find((x) => x.id === card.dataset.order);
      if (o) { showOrder(o); window.scrollTo(0, 0); }
      return;
    }
    if (e.target.closest('[data-oq="new"]')) { showOrder(null); window.scrollTo(0, 0); return; }
    const v = e.target.closest("[data-oview]");
    if (v) { ordersView = v.dataset.oview; return showOrders(); }
    const f = e.target.closest("[data-of]");
    if (f) {
      orderFilter = f.dataset.of;
      $("#of").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === f));
      return drawOrders();
    }
    const sm = e.target.closest("[data-sm]");
    if (sm) { salesMonth = shiftMonth(salesMonth, Number(sm.dataset.sm)); drawSales(); }
  });
  app.addEventListener("input", (e) => {
    if (e.target.id === "oq") { orderQuery = e.target.value; drawOrders(); }
  });

  /* ---------- one order: add / edit / move it along ---------- */
  function showOrder(o) {
    setTabs(null);
    editing = null;
    cfg = null;
    order = o ? { ...JSON.parse(JSON.stringify(o)), shipAuto: false, paidNow: false, pick: {}, paste: "", pasteNote: "" } : blankOrder();
    dirty = false;
    renderOrder();
  }

  function shipHint(o) {
    const count = itemCount(o), auto = autoShipping(count);
    if (!o.items.length) return "";
    if (auto === "") return `${count} items: shipping is by weight. Type the charge.`;
    if (String(o.shipping) !== auto) return `Usual charge for ${count} item${count === 1 ? "" : "s"}: ${money(auto)} <button type="button" class="adm-linkbtn" data-oact="auto-ship">Use it</button>`;
    return "";
  }

  function progressCard(o) {
    const st = o.status;
    const at = STEPS.findIndex(([k]) => k === st);
    const when = { new: o.date, paid: o.paid_on, packed: o.packed_on, shipped: o.shipped_on, delivered: o.delivered_on };
    const courier = `
      <div class="adm-two">
        <div><label class="field-label">Courier</label><input class="field" data-o="courier" list="dl-courier" value="${esc(o.courier)}" placeholder="DTDC"></div>
        <div><label class="field-label">Tracking number</label><input class="field" data-o="tracking" value="${esc(o.tracking)}"></div>
      </div>
      <label class="field-label">Tracking link <span class="muted small">(optional)</span></label>
      <input class="field" data-o="tracking_link" type="url" value="${esc(o.tracking_link)}" placeholder="https://…">`;
    const payRef = `
      <label class="field-label">Payment reference <span class="muted small">(UPI ref. no. or a note, optional)</span></label>
      <input class="field" data-o="payment_ref" value="${esc(o.payment_ref)}">`;
    const to = (key, label, cls = "btn") => `<button type="button" class="${cls}" data-oact="to" data-to="${key}">${label}</button>`;
    let body = "";
    if (st === "new") body = `${payRef}<div class="adm-next">${to("paid", "✓ Mark as paid")}</div>`;
    if (st === "paid" || st === "packed") {
      body = `${courier}<div class="adm-next">${st === "paid" ? to("packed", "Mark as packed", "btn btn-outline") : ""}${to("shipped", "🚚 Mark as shipped")}</div>${payRef}`;
    }
    if (st === "shipped") body = `${courier}<div class="adm-next">${to("delivered", "🎉 Mark as delivered")}</div>${payRef}`;
    if (st === "delivered") body = `${courier}${payRef}`;
    if (st === "cancelled") {
      body = `<p class="adm-note">Cancelled ${esc(fmtDay(o.cancelled_on))}. If you marked sizes sold out for this order, open the product in Products to put them back.</p>
        <div class="adm-next">${to("new", "Reopen order", "btn btn-outline")}</div>`;
    }
    return `
      <section class="adm-card">
        <ol class="adm-steps ${st === "cancelled" ? "off" : ""}">${STEPS.map(([k, label], i) => `
          <li class="${i < at ? "done" : i === at ? "now" : ""}"><b>${i <= at ? "✓" : i + 1}</b><span>${label}</span><small>${i <= at && when[k] ? esc(fmtDay(when[k])) : ""}</small></li>`).join("")}</ol>
        ${body}
        ${st !== "cancelled" && st !== "delivered" ? `<button type="button" class="adm-link-danger adm-cancel" data-oact="to" data-to="cancelled">Cancel this order</button>` : ""}
      </section>`;
  }

  function messagesCard(o) {
    const next = NEXT_MESSAGE[o.status];
    const first = String(o.name || "").trim().split(/\s+/)[0];
    const link = (kind, label, primary) => `<a class="${primary ? "btn btn-wa btn-block" : "adm-msg"}" href="${esc(waTo(o, messageFor(kind, o)))}" target="_blank" rel="noopener" data-msg="${kind}">${primary ? `Send "${label}" on WhatsApp` : esc(label)}</a>`;
    return `
      <section class="adm-card">
        <h2>Message ${esc(first || "the customer")}</h2>
        ${next ? link(next, MESSAGES.find(([k]) => k === next)[1], true) : `<p class="muted small">Nothing to send right now. Mark it shipped when it goes out.</p>`}
        ${phoneOk(o.phone) ? "" : `<p class="adm-hint">Add the mobile number below so messages open the right chat.</p>`}
        <details class="adm-msgs"><summary>Other messages</summary>${MESSAGES.filter(([k]) => k !== next).map(([k, l]) => link(k, l)).join("")}</details>
        <p class="muted small">WhatsApp opens with the message ready. You can change it before sending.</p>
      </section>`;
  }

  function stockCard(o) {
    const rows = o.items.map((it, k) => {
      const d = designs.find((x) => x.id === it.id);
      if (!d) return "";
      const c = colourOf(d, it.color);
      const size = sizeOf(d, it.size);
      const why = !c ? "colour not found" : !c.in_stock || (size && c.sold_out.includes(size)) ? "already sold out" : d.sizes.length && !size ? "size not found" : "";
      return `<label class="adm-toggle"><input type="checkbox" data-stock="${k}" ${why ? "disabled" : ""}> ${esc(it.name)}${itemDesc(it) ? ` · ${esc(itemDesc(it))}` : ""}${why ? ` <span class="muted small">(${why})</span>` : ""}</label>`;
    }).join("");
    return `
      <section class="adm-card adm-stockcard">
        <h2>Update website stock?</h2>
        <p class="muted small">Was this the last piece? Tick it to show it as sold out on the website.</p>
        ${rows}
        <div class="adm-next"><button type="button" class="btn" data-oact="stock">Update stock</button><button type="button" class="btn btn-outline" data-oact="stock-skip">No change needed</button></div>
      </section>`;
  }

  function renderOrder() {
    const o = order;
    const y = window.scrollY;
    const saved = !!o.row;
    const count = itemCount(o);
    const pd = designs.find((d) => d.id === o.pick.id);
    const pc = pd ? pd.colours.find((c) => c.color === o.pick.color) || pd.colours[0] : null;
    app.innerHTML = `
      <div class="adm-head">
        <button type="button" class="adm-back" data-oact="back">← Orders</button>
        ${saved ? statusPill(o) : ""}
      </div>
      <h1 class="adm-h1">${saved ? `${esc(o.name || "Order")} <small>${esc(o.id)}</small>` : "New order"}</h1>
      ${saved ? `<p class="muted small">Ordered ${esc(fmtDay(o.date, true))}</p>` : ""}
      <p class="adm-error" id="err" hidden></p>

      ${saved ? "" : `
      <section class="adm-card adm-paste">
        <h2>1. Paste the WhatsApp order</h2>
        <p class="muted small">In WhatsApp, press and hold the customer's order message → <strong>Copy</strong>, then paste it here. For orders from Instagram or a call, skip this and add the items below.</p>
        <textarea class="field" id="paste" rows="4" placeholder="Hi ${esc(C.name)}! I'd like to place an order…">${esc(o.paste)}</textarea>
        <button type="button" class="btn btn-outline" data-oact="read">Read message</button>
        ${o.pasteNote ? `<p class="adm-note">${o.pasteNote}</p>` : ""}
      </section>`}

      ${saved ? progressCard(o) + messagesCard(o) : ""}
      ${saved && (o.status === "paid" || o.status === "packed") && !o.stock_done && o.items.some((it) => designs.some((d) => d.id === it.id)) ? stockCard(o) : ""}

      <section class="adm-card">
        <h2>${saved ? "Customer" : "2. Customer"}</h2>
        ${saved ? "" : `<label class="field-label">Order ID</label><input class="field" data-o="id" value="${esc(o.id)}" autocapitalize="characters" spellcheck="false">`}
        <div class="adm-two">
          <div><label class="field-label">Name *</label><input class="field" data-o="name" value="${esc(o.name)}" autocomplete="off"></div>
          <div><label class="field-label">Mobile number *</label><input class="field" data-o="phone" type="tel" inputmode="tel" value="${esc(phoneShow(o.phone))}" placeholder="98765 43210"></div>
          <div><label class="field-label">City</label><input class="field" data-o="city" value="${esc(o.city)}"></div>
          <div><label class="field-label">Pincode</label><input class="field" data-o="pincode" inputmode="numeric" maxlength="6" value="${esc(o.pincode)}"></div>
        </div>
        <label class="field-label">Delivery address</label>
        <textarea class="field" data-o="address" rows="3" placeholder="House no., street, area, landmark">${esc(o.address)}</textarea>
        ${saved && phoneOk(o.phone) ? `<div class="adm-contact"><a class="adm-icon" href="tel:+${phoneDigits(o.phone)}">📞 Call</a><a class="adm-icon" href="https://wa.me/${phoneDigits(o.phone)}" target="_blank" rel="noopener">💬 Open WhatsApp chat</a></div>` : ""}
      </section>

      <section class="adm-card">
        <h2>${saved ? "Items" : "3. Items"} <small>${count}</small></h2>
        ${o.items.length ? o.items.map((it, k) => {
          const img = itemImage(it);
          return `
          <div class="adm-oitem" data-k="${k}">
            <span class="adm-thumb sm">${img ? `<img src="${esc(img)}" alt="">` : ""}</span>
            <div class="adm-oitem-main">
              <strong>${esc(it.name || it.id)}</strong>
              <small>${esc([it.id, it.color, it.size].filter(Boolean).join(" · "))}</small>
              <div class="adm-oitem-row">
                <span class="adm-qty"><button type="button" data-oact="qty" data-by="-1" aria-label="One less">−</button><b>${it.qty}</b><button type="button" data-oact="qty" data-by="1" aria-label="One more">+</button></span>
                <label class="adm-price" title="Price for one">₹<input class="field" data-it="price" type="number" inputmode="numeric" min="0" value="${esc(it.price)}"></label>
                <button type="button" class="adm-icon danger" data-oact="remove-item" aria-label="Remove item">✕</button>
              </div>
            </div>
          </div>`;
        }).join("") : `<p class="muted small">${o.itemsText ? esc(o.itemsText) : "No items yet."}</p>`}
        <div class="adm-additem">
          <select class="field" data-pick="id" aria-label="Add a product"><option value="">+ Add a product…</option>${designs.map((d) =>
            `<option value="${esc(d.id)}" ${d.id === o.pick.id ? "selected" : ""}>${esc(d.id)} · ${esc(d.name)}</option>`).join("")}</select>
          ${pd ? `
            ${pd.colours.length > 1 ? `<select class="field" data-pick="color" aria-label="Colour">${pd.colours.map((c) => `<option value="${esc(c.color)}" ${c === pc ? "selected" : ""}>${esc(c.color || "(no colour)")}</option>`).join("")}</select>` : ""}
            ${pd.sizes.length ? `<select class="field" data-pick="size" aria-label="Size">${pd.sizes.map((s) => `<option value="${esc(s)}" ${s === o.pick.size ? "selected" : ""}>${esc(s)}${!pc.in_stock || pc.sold_out.includes(s) ? " (sold out)" : ""}</option>`).join("")}</select>` : ""}
            <button type="button" class="btn btn-outline" data-oact="add-item">Add</button>` : ""}
        </div>
        <div class="adm-totals">
          <div><span>Products</span><strong id="t-products">${money(productsTotal(o))}</strong></div>
          <div><span>Shipping</span><label class="adm-price">₹<input class="field" data-o="shipping" type="number" inputmode="numeric" min="0" value="${esc(o.shipping)}" placeholder="by weight"></label></div>
          <p class="adm-hint" id="t-hint">${shipHint(o)}</p>
          <div><span>Discount <span class="muted small">(optional)</span></span><label class="adm-price">−₹<input class="field" data-o="discount" type="number" inputmode="numeric" min="0" value="${esc(o.discount)}" placeholder="0"></label></div>
          <div class="adm-total"><span>Total</span><strong id="t-total">${money(orderTotal(o))}</strong></div>
        </div>
      </section>

      ${saved ? `
      <section class="adm-card">
        <h2>Notes</h2>
        <textarea class="field" data-o="notes" rows="2" placeholder="Only you see this">${esc(o.notes)}</textarea>
        <details class="adm-fix"><summary>Change the status by hand</summary>
          <select class="field" data-o="status">${Object.keys(STATUS_LABEL).map((k) => `<option value="${k}" ${k === o.status ? "selected" : ""}>${STATUS_LABEL[k]}</option>`).join("")}</select>
          <p class="muted small">Only to fix a mistake, then tap Save changes.</p>
        </details>
      </section>
      <section class="adm-card adm-danger">
        <h2>Delete order</h2>
        <p class="muted small">Only for mistakes and duplicates. To keep a record, cancel it instead.</p>
        <button type="button" class="btn btn-outline" data-oact="delete">Delete ${esc(o.id)}</button>
      </section>` : `
      <section class="adm-card">
        <h2>4. Payment</h2>
        <label class="adm-toggle"><input type="checkbox" data-o="paidNow" ${o.paidNow ? "checked" : ""}> The customer has already paid</label>
        <label class="field-label">Notes</label>
        <textarea class="field" data-o="notes" rows="2" placeholder="Only you see this">${esc(o.notes)}</textarea>
      </section>`}

      <div class="adm-save"><button type="button" class="btn btn-block" data-oact="save" id="save-order">${saved ? "Save changes" : "Save order"}</button></div>
      <datalist id="dl-courier">${COURIERS.map((c) => `<option value="${c}">`).join("")}</datalist>`;
    window.scrollTo(0, y);
  }

  function readPasted() {
    const p = parseOrderMessage(order.paste);
    if (!p.items.length) {
      order.pasteNote = "Couldn't find any items in this message. Copy the customer's whole order message, or add the items below by hand.";
      return renderOrder();
    }
    const dup = p.id && orders.list.find((x) => x.id === p.id);
    if (dup) {
      order.pasteNote = `Order <strong>${esc(p.id)}</strong> is already saved (${esc(dup.name)}). <button type="button" class="adm-linkbtn" data-order="${esc(p.id)}">Open it</button>`;
      return renderOrder();
    }
    if (p.id) { order.id = p.id; order.date = dateFromId(p.id); }
    order.items = p.items.map((it) => ({ ...it, name: it.name || (designs.find((d) => d.id === it.id) || {}).name || it.id }));
    if (p.name && !order.name) order.name = p.name;
    const auto = autoShipping(itemCount(order));
    order.shipping = auto !== "" ? auto : p.shipping;
    order.shipAuto = true;
    const missing = order.items.filter((it) => !designs.some((d) => d.id === it.id)).length;
    order.pasteNote = `Found ${p.items.length} item${p.items.length === 1 ? "" : "s"}${p.id ? ` in order <strong>${esc(p.id)}</strong>` : ""}. Check them below and add the customer's details.` +
      (missing ? ` ${missing} item${missing === 1 ? " is" : "s are"} no longer in your products; ${missing === 1 ? "it's" : "they're"} kept as written.` : "");
    dirty = true;
    renderOrder();
  }

  // Checks and saves the order; to = the new status (or null to keep it). Returns true when saved.
  async function saveOrder(to, quiet = false) {
    const o = order;
    const fail = (msg) => { const box = $("#err"); box.textContent = msg; box.hidden = false; box.scrollIntoView({ behavior: "smooth", block: "center" }); return false; };
    const status = to || o.status;
    o.id = String(o.id || "").trim().toUpperCase();
    if (!/^[A-Z0-9-]{3,30}$/.test(o.id)) return fail("The Order ID can only have letters, numbers and -.");
    if (!o.row && orders.list.some((x) => x.id === o.id)) return fail(`Order ${o.id} is already saved. Find it in Orders.`);
    if (!o.name.trim()) return fail("Please enter the customer's name.");
    if (!phoneOk(o.phone)) return fail("Please enter the customer's 10-digit mobile number.");
    if (o.pincode.trim() && !/^\d{6}$/.test(o.pincode.trim())) return fail("The pincode should have 6 digits.");
    if (!o.items.length && !o.itemsText) return fail("Please add at least one item.");
    if (String(o.shipping).trim() === "" || !(Number(o.shipping) >= 0)) return fail("Please enter the shipping charge (0 for free).");
    if (o.items.length && num(o.discount) > productsTotal(o)) return fail("The discount is more than the products total.");
    if (status === "shipped" && !o.courier.trim()) return fail("Please enter the courier, then mark it shipped.");
    if (to === "shipped" && !o.tracking.trim() && !confirm("Mark as shipped without a tracking number?")) return false;
    if (to === "cancelled" && !confirm(`Cancel order ${o.id}?`)) return false;

    const payload = {
      order_id: o.id, date: o.date, status: STATUS_LABEL[status],
      name: o.name.trim(), phone: phoneShow(o.phone), city: o.city.trim(), address: o.address.trim(), pincode: o.pincode.trim(),
      items: o.items.length ? o.items.map((it) => `${it.id} ${it.name}${itemDesc(it) ? ` (${itemDesc(it)})` : ""} × ${it.qty} = ${money(num(it.price) * it.qty)}`).join("\n") : o.itemsText,
      item_count: String(itemCount(o)), products_total: String(productsTotal(o)), shipping: String(Number(o.shipping)),
      discount: num(o.discount) ? String(num(o.discount)) : "", total: String(orderTotal(o)),
      payment_ref: o.payment_ref.trim(), courier: o.courier.trim(), tracking: o.tracking.trim(), tracking_link: o.tracking_link.trim(),
      notes: o.notes.trim(), stock_done: o.stock_done ? "yes" : "",
      items_data: o.items.length ? JSON.stringify(o.items.map((it) => ({ id: it.id, name: it.name, color: it.color, size: it.size, qty: it.qty, price: num(it.price) }))) : ""
    };
    const btn = $("#save-order");
    const busy = [btn, ...app.querySelectorAll('[data-oact="to"], [data-oact="stock"], [data-oact="stock-skip"]')];
    const label = btn.textContent;
    busy.forEach((b) => (b.disabled = true));
    btn.textContent = "Saving…";
    try {
      const j = await call("saveOrder", { order: payload, isNew: !o.row, updated: o.row ? o.updated : undefined });
      const s = toOrder(j.order.headers.map(keyOf), j.order.row, j.order.cells);
      orders.list = [s, ...orders.list.filter((x) => x.id !== s.id)].sort(byNewest);
      if (j.url) orders.url = j.url;
      dirty = false;
      order = { ...s, shipAuto: false, paidNow: false, pick: {}, paste: "", pasteNote: "" };
      if (!quiet) {
        toast(!o.row ? (status === "paid" ? "Order saved as paid ✓" : "Order saved ✓ Now send the payment link.")
          : { paid: "Marked as paid ✓ Send the payment received message.", packed: "Marked as packed ✓", shipped: "Marked as shipped ✓ Send the tracking message.",
            delivered: "Marked as delivered 🎉 Ask for a review.", cancelled: "Order cancelled", new: to ? "Order reopened" : "Saved ✓" }[to || "new"] || "Saved ✓");
      }
      renderOrder();
      if (!o.row || to) window.scrollTo(0, 0);
      return true;
    } catch (e) {
      busy.forEach((b) => (b.disabled = false));
      btn.textContent = label;
      fail(e.message);
      if (/reload/i.test(e.message)) $("#err").insertAdjacentHTML("beforeend", ` <button type="button" class="adm-linkbtn" data-oact="reload">Reload this order</button>`);
      return false;
    }
  }

  // Marks the ticked items' sizes sold out on the website (one save per product)
  async function markSoldOut(items) {
    for (const id of [...new Set(items.map((it) => it.id))]) {
      const d = JSON.parse(JSON.stringify(designs.find((x) => x.id === id)));
      items.filter((it) => it.id === id).forEach((it) => {
        const c = colourOf(d, it.color);
        const size = sizeOf(d, it.size);
        if (!c) return;
        if (d.sizes.length && size && !c.sold_out.includes(size)) c.sold_out.push(size);
        if (!d.sizes.length) c.in_stock = false;
      });
      await call("save", { design: designPayload(d) });
    }
  }

  async function updateStock(doIt) {
    const picked = doIt ? [...app.querySelectorAll("[data-stock]:checked")].map((x) => order.items[Number(x.dataset.stock)]) : [];
    if (doIt && !picked.length) return toast("Tick the pieces that are sold out, or tap No change needed.");
    order.stock_done = true;
    if (!(await saveOrder(null, true))) { order.stock_done = false; return; }
    if (!picked.length) return toast("OK, stock unchanged.");
    toast("Updating website stock…");
    const id = order.id;
    try {
      await markSoldOut(picked);
      if (await refresh()) {
        showOrder(orders.list.find((x) => x.id === id));
        toast("Website stock updated ✓ It shows within about 5 minutes.");
      }
    } catch (e) {
      toast(e.message);
    }
  }

  // after "changed on another phone": read the sheets again and show the order as it is now
  async function reloadOrder() {
    const id = order.id;
    dirty = false;
    if (!(await refresh())) return;
    const o = orders.list.find((x) => x.id === id);
    if (o) { showOrder(o); toast("Reloaded. Make your changes again."); } else showOrders();
  }

  async function removeOrder() {
    const o = order;
    if (!confirm(`Delete order ${o.id} (${o.name}) for good?\n\nTo keep a record, cancel it instead.`)) return;
    try {
      await call("deleteOrder", { id: o.id, updated: o.updated });
      orders.list = orders.list.filter((x) => x.id !== o.id);
      dirty = false;
      toast(`Deleted order ${o.id}`);
      showOrders();
    } catch (e) {
      const box = $("#err");
      box.textContent = e.message;
      box.hidden = false;
    }
  }

  app.addEventListener("input", (e) => {
    if (!order) return;
    const t = e.target;
    if (t.id === "paste") { order.paste = t.value; return; }
    const f = t.dataset.o;
    if (f && t.type !== "checkbox" && t.tagName !== "SELECT") {
      order[f] = t.value;
      dirty = true;
      if (f === "shipping") order.shipAuto = false;
    }
    if (t.dataset.it === "price") {
      order.items[Number(t.closest("[data-k]").dataset.k)].price = t.value;
      dirty = true;
    }
    if (f === "shipping" || f === "discount" || t.dataset.it === "price") {
      $("#t-products").textContent = money(productsTotal(order));
      $("#t-total").textContent = money(orderTotal(order));
      $("#t-hint").innerHTML = shipHint(order);
    }
  });

  app.addEventListener("change", (e) => {
    if (!order) return;
    const t = e.target;
    if (t.dataset.o === "paidNow") { order.paidNow = t.checked; dirty = true; return; }
    if (t.dataset.o === "status") { order.status = t.value; dirty = true; return; }
    const k = t.dataset.pick;
    if (!k) return;
    const p = order.pick;
    p[k] = t.value;
    const d = designs.find((x) => x.id === p.id);
    if (k === "id") p.color = d ? d.colours[0].color : "";
    if (d && k !== "size") {
      const c = d.colours.find((x) => x.color === p.color) || d.colours[0];
      p.size = d.sizes.find((s) => c.in_stock && !c.sold_out.includes(s)) || d.sizes[0] || "";
    }
    renderOrder();
  });

  app.addEventListener("click", (e) => {
    if (!order) return;
    const msg = e.target.closest("[data-msg]");
    if (msg) { msg.href = waTo(order, messageFor(msg.dataset.msg, order)); return; } // uses what's typed now
    const b = e.target.closest("[data-oact]");
    if (!b || b.disabled) return;
    const act = b.dataset.oact;
    const row = b.closest("[data-k]");
    const it = row ? order.items[Number(row.dataset.k)] : null;
    if (act === "back") {
      if (dirty && !confirm("Leave without saving your changes?")) return;
      dirty = false;
      return showOrders();
    }
    if (act === "save") return saveOrder(!order.row && order.paidNow ? "paid" : null);
    if (act === "to") return saveOrder(b.dataset.to);
    if (act === "delete") return removeOrder();
    if (act === "stock" || act === "stock-skip") return updateStock(act === "stock");
    if (act === "read") return readPasted();
    if (act === "reload") return reloadOrder();
    if (act === "qty") it.qty = Math.max(1, it.qty + Number(b.dataset.by));
    if (act === "remove-item") order.items.splice(order.items.indexOf(it), 1);
    if (act === "add-item") {
      const d = designs.find((x) => x.id === order.pick.id);
      if (!d) return;
      const c = d.colours.find((x) => x.color === order.pick.color) || d.colours[0];
      const size = order.pick.size || d.sizes[0] || "";
      const same = order.items.find((x) => x.id === d.id && x.size === size && x.color === c.color);
      if (same) same.qty++;
      else order.items.push({ id: d.id, name: d.name, color: c.color, size, qty: 1, price: num(c.price || d.price) });
      order.pick = {};
    }
    if (act === "auto-ship") { order.shipping = autoShipping(itemCount(order)); order.shipAuto = true; }
    if (["qty", "remove-item", "add-item"].includes(act) && order.shipAuto) order.shipping = autoShipping(itemCount(order));
    dirty = true;
    renderOrder();
  });

  if (auth.url && auth.pin) start(); else showLogin();
})();
