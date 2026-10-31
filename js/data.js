/* =========================================================
   PRODUCTS — loaded from your Google Sheet (see config.js).
   The SAMPLE_PRODUCTS below are only used until the sheet is connected.
   ========================================================= */
(function () {
  // Sample photos from Unsplash (free to use). Your real products come from the Google Sheet.
  const img = (id) => `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`;

  const SAMPLE_PRODUCTS = [
    // Anarkali Sets
    { id: "TWS001", name: "Red Georgette Anarkali with Dupatta", category: "Anarkali Sets", price: 1899, mrp: 3299, sizes: ["M", "L", "XL", "XXL"], colors: ["Red"], images: [img("1638457130899-121a2dc59513")], fabric: "Georgette with embroidered border", description: "Floor-length red anarkali with a flared hem, matching pants and a bordered dupatta. A festive favourite.", inStock: true, tag: "bestseller", featured: true },
    { id: "TWS002", name: "Mauve Embroidered Anarkali Gown", category: "Anarkali Sets", price: 2299, mrp: 3999, sizes: ["M", "L", "XL"], colors: ["Mauve", "Gold"], images: [img("1638457130797-ce36c8dbe3dd")], fabric: "Chinon silk with zari embroidery", description: "Rich mauve anarkali with heavy embroidery on the yoke and hem. Perfect for weddings and receptions.", inStock: true, tag: "new", featured: true },
    { id: "TWS003", name: "Bottle Green Silk Anarkali Set", category: "Anarkali Sets", price: 2499, mrp: 4499, sizes: ["S", "M", "L", "XL"], colors: ["Bottle Green", "Gold"], images: [img("1743229995546-2922b49e7d1e")], fabric: "Vichitra silk", description: "Elegant bottle green anarkali with golden detailing and a sheer dupatta.", inStock: true, tag: "new", featured: false },
    { id: "TWS004", name: "Rani Pink Anarkali with Dupatta", category: "Anarkali Sets", price: 1999, mrp: 3499, sizes: ["M", "L", "XL", "XXL"], colors: ["Rani Pink"], images: [img("1744833341427-6f2b4eac91ff")], fabric: "Rayon with foil print", description: "Bright rani pink anarkali with a contrast-border dupatta. Lightweight and twirl-ready.", inStock: true, tag: "bestseller", featured: false },
    { id: "TWS005", name: "Ivory Floral Print Anarkali", category: "Anarkali Sets", price: 1499, mrp: 2599, sizes: ["S", "M", "L", "XL"], colors: ["Ivory", "Pink"], images: [img("1678536517273-f1ec164966ea")], fabric: "Cotton", description: "Soft ivory anarkali with all-over floral print. Easy to wear for day functions.", inStock: true, tag: "", featured: false },
    { id: "TWS006", name: "Maroon Jacket Style Anarkali", category: "Anarkali Sets", price: 2799, mrp: 4999, sizes: ["M", "L", "XL"], colors: ["Maroon", "Gold"], images: [img("1610202305255-746aa5b971c4")], fabric: "Velvet jacket with silk inner", description: "Statement maroon anarkali with an embroidered front-open jacket.", inStock: false, tag: "", featured: false },

    // A-Line Kurtis
    { id: "TWS007", name: "Mustard Yellow A-Line Kurti", category: "A-Line Kurtis", price: 799, mrp: 1399, sizes: ["M", "L", "XL", "XXL"], colors: ["Mustard"], images: [img("1760287363878-1a09af715b80")], fabric: "Rayon", description: "Sunny mustard A-line kurti with embroidered neckline and tiered flare.", inStock: true, tag: "new", featured: false },
    { id: "TWS008", name: "Navy Paisley A-Line Kurti", category: "A-Line Kurtis", price: 849, mrp: 1499, sizes: ["M", "L", "XL", "XXL"], colors: ["Navy", "Pink"], images: [img("1760287364219-160c234ded00")], fabric: "Cotton", description: "Navy kurti with paisley print and button placket. Everyday comfort with style.", inStock: true, tag: "bestseller", featured: false },
    { id: "TWS009", name: "Powder Blue Cotton A-Line Kurti", category: "A-Line Kurtis", price: 899, mrp: 1599, sizes: ["S", "M", "L", "XL"], colors: ["Powder Blue"], images: [img("1616583936499-d4116e7e2e76")], fabric: "Cotton", description: "Breathable powder blue kurti with lace detailing. Perfect for office and college.", inStock: true, tag: "", featured: false },
    { id: "TWS010", name: "Floral Flared A-Line Kurti", category: "A-Line Kurtis", price: 999, mrp: 1799, sizes: ["S", "M", "L", "XL"], colors: ["Grey", "Pink"], images: [img("1631269533195-fb8ff9670f2b")], fabric: "Muslin", description: "Flared kurti with a printed border and pants. Light, flowy and comfortable.", inStock: true, tag: "new", featured: false },

    // Top & Dupatta Sets
    { id: "TWS011", name: "Blush Pink Top & Dupatta Set", category: "Top & Dupatta Sets", price: 1299, mrp: 2299, sizes: ["M", "L", "XL"], colors: ["Blush Pink"], images: [img("1649139798873-683a18de1151")], fabric: "Cotton with mirror work", description: "Pretty blush pink top with printed dupatta and palazzo. Festive yet comfortable.", inStock: true, tag: "bestseller", featured: true },
    { id: "TWS012", name: "Pink Yoke Embroidered Top & Dupatta", category: "Top & Dupatta Sets", price: 1199, mrp: 1999, sizes: ["S", "M", "L", "XL"], colors: ["Pink", "Blue"], images: [img("1649140037416-d2892f343be5")], fabric: "Rayon", description: "Pink printed top with a contrast embroidered yoke and soft dupatta.", inStock: true, tag: "new", featured: false },
    { id: "TWS013", name: "Indigo Block Print Top & Dupatta", category: "Top & Dupatta Sets", price: 1349, mrp: 2399, sizes: ["M", "L", "XL", "XXL"], colors: ["Indigo"], images: [img("1649140338269-adc41f1a1415")], fabric: "Cotton", description: "Classic indigo block print set with a long top, pants and dupatta.", inStock: true, tag: "", featured: false },
    { id: "TWS014", name: "Black & Gold Top & Dupatta Set", category: "Top & Dupatta Sets", price: 1599, mrp: 2799, sizes: ["M", "L", "XL"], colors: ["Black", "Gold"], images: [img("1761571260010-8aa90a08c934")], fabric: "Georgette with zari", description: "Elegant black top with gold embroidery and a golden dupatta. Made for evening functions.", inStock: true, tag: "new", featured: false },

    // Kurta Sets
    { id: "TWS015", name: "Pink Floral Kurta Pant Set", category: "Kurta Sets", price: 1099, mrp: 1899, sizes: ["S", "M", "L", "XL"], colors: ["Pink"], images: [img("1741847639057-b51a25d42892")], fabric: "Cotton", description: "Straight kurta with matching pants in a soft pink floral print.", inStock: true, tag: "new", featured: false },
    { id: "TWS016", name: "White Floral Kurta Pant Set", category: "Kurta Sets", price: 1049, mrp: 1799, sizes: ["S", "M", "L", "XL"], colors: ["White", "Pink"], images: [img("1745313452052-0e4e341f326c")], fabric: "Cotton", description: "Fresh white kurta set with pink floral motifs. A summer essential.", inStock: true, tag: "bestseller", featured: false },
    { id: "TWS017", name: "Wine Chikankari Kurta Set", category: "Kurta Sets", price: 1399, mrp: 2499, sizes: ["M", "L", "XL"], colors: ["Wine"], images: [img("1708534246055-d7b149acb731")], fabric: "Rayon with chikankari", description: "Graceful wine kurta with delicate chikankari embroidery.", inStock: true, tag: "", featured: false },
    { id: "TWS018", name: "Green Printed Sharara Set", category: "Kurta Sets", price: 1599, mrp: 2799, sizes: ["S", "M", "L", "XL"], colors: ["Green", "Pink"], images: [img("1597983073750-16f5ded1321f")], fabric: "Cotton", description: "Printed kurta with a flared green sharara and dupatta.", inStock: true, tag: "", featured: false },

    // Sarees
    { id: "TWS019", name: "Navy Banarasi Silk Saree", category: "Sarees", price: 2499, mrp: 4999, sizes: ["Free Size"], colors: ["Navy", "Gold"], images: [img("1610030469983-98e550d6193c")], fabric: "Art Silk with zari border", description: "A timeless navy saree with a rich golden zari border. Comes with an unstitched blouse piece.", inStock: true, tag: "bestseller", featured: true },
    { id: "TWS020", name: "Rani Pink Kanjivaram Style Saree", category: "Sarees", price: 2899, mrp: 5499, sizes: ["Free Size"], colors: ["Pink", "Orange"], images: [img("1617627143750-d86bc21e42bb")], fabric: "Soft Silk", description: "Vibrant rani pink with a contrast orange pallu. Lightweight soft silk that drapes beautifully.", inStock: true, tag: "new", featured: false },

    // Dresses
    { id: "TWS021", name: "Pink Floral Flared Dress", category: "Dresses", price: 1199, mrp: 2099, sizes: ["S", "M", "L", "XL"], colors: ["Pink"], images: [img("1669195987863-f935f728e41b")], fabric: "Cotton", description: "Full-flare pink floral dress with a mandarin collar. Twirl-worthy and comfy.", inStock: true, tag: "new", featured: true },
    { id: "TWS022", name: "Floral Print Co-ord Set", category: "Dresses", price: 1099, mrp: 1899, sizes: ["S", "M", "L"], colors: ["Teal", "Orange"], images: [img("1765529374927-052599af9c82")], fabric: "Rayon", description: "Relaxed shirt and pants co-ord in a bold floral print.", inStock: true, tag: "", featured: false },
    { id: "TWS023", name: "Pink Printed Shirt Co-ord", category: "Dresses", price: 999, mrp: 1799, sizes: ["S", "M", "L", "XL"], colors: ["Pink"], images: [img("1762777777819-4d9aa5529368")], fabric: "Cotton", description: "Pink printed shirt and straight pants. Easy everyday style.", inStock: true, tag: "", featured: false },
    { id: "TWS024", name: "Red Flared Maxi Gown", category: "Dresses", price: 1899, mrp: 3499, sizes: ["XS", "S", "M", "L"], colors: ["Red"], images: [img("1595777457583-95e059d581b8")], fabric: "Satin", description: "A show-stopping red gown with a full flared skirt. Made for parties and receptions.", inStock: true, tag: "bestseller", featured: false }
  ];

  /* ---------- CSV parsing (handles quotes, commas, new lines) ---------- */
  function parseCSV(text) {
    const rows = [];
    let row = [], field = "", inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') inQuotes = false;
        else field += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); rows.push(row); row = []; field = "";
      } else field += c;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    return rows.filter((r) => r.some((v) => v.trim() !== ""));
  }

  const list = (v) => (v || "").split(",").map((s) => s.trim()).filter(Boolean);
  const yes = (v) => /^(yes|y|true|1)$/i.test((v || "").trim());
  const num = (v) => Number(String(v || "").replace(/[^0-9.]/g, "")) || 0;

  // Google Drive share links (drive.google.com/file/d/ID/view, open?id=ID, uc?id=ID)
  // are web pages, not images, so turn them into a direct image link.
  function imageUrl(v) {
    const m = v.match(/(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:.*&)?id=)([\w-]{20,})/);
    return m ? `https://lh3.googleusercontent.com/d/${m[1]}=w1200` : v;
  }
  window.toImageUrl = imageUrl;

  function rowsToProducts(rows) {
    const headers = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
    return rows.slice(1).map((r, i) => {
      const o = {};
      headers.forEach((h, idx) => (o[h] = (r[idx] || "").trim()));
      const images = headers.filter((h) => h.startsWith("image")).map((h) => o[h]).filter(Boolean).map(imageUrl);
      const price = num(o.price);
      return {
        id: o.id || `P${i + 1}`,
        name: o.name,
        category: o.category || "Others",
        price,
        mrp: num(o.mrp) || price,
        sizes: list(o.sizes),
        colors: list(o.colors),
        images,
        fabric: o.fabric || "",
        description: o.description || "",
        inStock: o.in_stock === "" || o.in_stock === undefined ? true : yes(o.in_stock),
        tag: (o.tag || "").toLowerCase(),
        featured: yes(o.featured)
      };
    }).filter((p) => p.name && p.price);
  }

  /* ---------- Settings tab: rows of "setting, value" ---------- */
  const SETTINGS_KEY = "tws_settings_v1";
  let settingsPromise = null;

  window.loadSettings = function () {
    if (settingsPromise) return settingsPromise;
    const url = window.SHOP_CONFIG.settingsCsvUrl;
    if (!url) return (settingsPromise = Promise.resolve({}));

    try {
      const cached = JSON.parse(sessionStorage.getItem(SETTINGS_KEY) || "null");
      if (cached && Date.now() - cached.time < 2 * 60 * 1000) return (settingsPromise = Promise.resolve(cached.settings));
    } catch (e) { /* ignore broken cache */ }

    settingsPromise = fetch(url)
      .then((r) => { if (!r.ok) throw new Error("Settings not reachable"); return r.text(); })
      .then((text) => {
        const settings = {};
        parseCSV(text).slice(1).forEach(([key, value]) => {
          const k = (key || "").trim().toLowerCase().replace(/\s+/g, "_");
          if (k && (value || "").trim()) settings[k] = value.trim();
        });
        sessionStorage.setItem(SETTINGS_KEY, JSON.stringify({ time: Date.now(), settings }));
        return settings;
      })
      .catch((err) => { console.warn("Could not load settings tab, using config.js values.", err); return {}; });
    return settingsPromise;
  };

  /* ---------- Loader with a short cache so pages open instantly ---------- */
  const CACHE_KEY = "tws_products_v1";
  const CACHE_MS = 2 * 60 * 1000;
  let promise = null;

  window.loadProducts = function () {
    if (promise) return promise;
    const url = window.SHOP_CONFIG.sheetCsvUrl;
    if (!url) return (promise = Promise.resolve(SAMPLE_PRODUCTS));

    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
      if (cached && Date.now() - cached.time < CACHE_MS) return (promise = Promise.resolve(cached.products));
    } catch (e) { /* ignore broken cache */ }

    promise = fetch(url)
      .then((r) => { if (!r.ok) throw new Error("Sheet not reachable"); return r.text(); })
      .then((text) => {
        const products = rowsToProducts(parseCSV(text));
        if (!products.length) throw new Error("Sheet has no products");
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), products }));
        return products;
      })
      .catch((err) => {
        console.warn("Could not load Google Sheet, showing sample products.", err);
        return SAMPLE_PRODUCTS;
      });
    return promise;
  };
})();
