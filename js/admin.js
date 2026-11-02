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

    const design = {
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
    };
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
  // Reads products, reviews and settings in one go. Returns false (and shows why) if it failed.
  async function refresh() {
    try {
      const j = await call("load");
      designs = toDesigns(j.products.headers, j.products.rows);
      reviews = toReviews(j.reviews);
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

  async function start() {
    $("#logout").hidden = false;
    setTabs(null);
    app.innerHTML = `<p class="adm-loading">Loading your shop…</p>`;
    if (await refresh()) showDashboard();
  }

  // active: "home" | "products" | "reviews" | "settings", or null to hide the tabs
  function setTabs(active) {
    const tabs = $("#tabs");
    tabs.hidden = !active;
    document.body.classList.toggle("adm-has-tabs", !!active);
    tabs.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("on", b.dataset.tab === active));
    const waiting = reviews.list.filter((r) => !r.show).length;
    $("#tab-badge").textContent = waiting;
    $("#tab-badge").hidden = !waiting;
  }

  $("#tabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (!b) return;
    if (dirty && !confirm("Leave without saving your changes?")) return;
    dirty = false;
    ({ home: showDashboard, products: () => showList(), reviews: showReviews, settings: showSettings })[b.dataset.tab]();
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
    const shown = designs.filter((d) => !d.hidden);
    const colours = shown.flatMap((d) => d.colours.map((c) => ({ d, c })));
    const soldOut = colours.filter(({ d, c }) => !c.in_stock || (d.sizes.length && c.sold_out.length >= d.sizes.length));
    const noPhotos = colours.filter(({ c }) => !c.images.length);
    const waiting = reviews.list.filter((r) => !r.show);

    // things to fix, most important first
    const todo = [];
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
        ${stat(shown.length, "products on the website", "products")}
        ${stat(waiting.length, "reviews waiting", "reviews", waiting.length ? "hot" : "")}
        ${stat(soldOut.length, "colours sold out", "products", soldOut.length ? "warn" : "")}
        ${stat(noPhotos.length, "colours without photos", "products", noPhotos.length ? "warn" : "")}
        ${stat(designs.length - shown.length, "hidden drafts", "products")}
      </div>

      <section class="adm-card">
        <h2>Needs attention ${todo.length ? `<small>${todo.length}</small>` : ""}</h2>
        ${todo.length ? `<ul class="adm-todo">${todo.slice(0, LIMIT).map((t) => `
          <li><button type="button" class="${t.kind}" ${t.id ? `data-open="${esc(t.id)}"` : `data-go="${t.go}"`}>${esc(t.text)} <span>›</span></button></li>`).join("")}</ul>
          ${todo.length > LIMIT ? `<p class="muted small">…and ${todo.length - LIMIT} more. Fix these first.</p>` : ""}`
        : `<p class="adm-allgood">Everything looks good ✨</p>`}
      </section>

      <section class="adm-card">
        <h2>Quick actions</h2>
        <div class="adm-quick">
          <button type="button" class="btn" data-quick="add">+ Add product</button>
          <a class="btn btn-outline" href="paylink" target="_blank" rel="noopener">Payment link</a>
          <a class="btn btn-outline" href="index.html" target="_blank" rel="noopener">View website</a>
          <a class="btn btn-outline" href="https://cloud.umami.is" target="_blank" rel="noopener">Visitor stats</a>
        </div>
        <p class="muted small">Changes show on the website within about 5 minutes of saving.</p>
      </section>`;
  }

  app.addEventListener("click", (e) => {
    const go = e.target.closest("[data-go]");
    const open = e.target.closest("[data-open]");
    const quick = e.target.closest("[data-quick]");
    if (go) ({ products: () => showList(), reviews: showReviews, settings: showSettings })[go.dataset.go]();
    if (open) showEdit(designs.find((d) => d.id === open.dataset.open));
    if (quick && quick.dataset.quick === "add") showEdit(null);
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

  if (auth.url && auth.pin) start(); else showLogin();
})();
