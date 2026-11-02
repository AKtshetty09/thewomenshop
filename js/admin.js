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
  let dirty = false;    // unsaved changes on the edit screen

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
        showList();
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
  async function showList(highlight) {
    $("#logout").hidden = false;
    editing = null;
    dirty = false;
    app.innerHTML = `<p class="adm-loading">Loading products…</p>`;
    try {
      const j = await call("list");
      designs = toDesigns(j.headers, j.rows);
    } catch (e) {
      if (/PIN/i.test(e.message)) return showLogin(e.message);
      app.innerHTML = `<section class="adm-card"><p class="adm-error">${esc(e.message)}</p><button class="btn" id="retry">Try again</button></section>`;
      $("#retry").addEventListener("click", () => showList());
      return;
    }
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
  function toJpeg(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight)); // max 1600px
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
      showList(j.id);
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
      showList();
    } catch (e) {
      fail(e.message);
    }
  }

  window.addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  if (auth.url && auth.pin) showList(); else showLogin();
})();
