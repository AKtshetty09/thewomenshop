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
  const keyOf = (h) => h.trim().toLowerCase().replace(/\s+/g, "_");

  // Google Drive share links (drive.google.com/file/d/ID/view, open?id=ID, uc?id=ID)
  // are web pages, not images, so turn them into a direct image link.
  function imageUrl(v) {
    const m = v.match(/(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:.*&)?id=)([\w-]{20,})/);
    return m ? `https://lh3.googleusercontent.com/d/${m[1]}=w1200` : v;
  }
  window.toImageUrl = imageUrl;

  // Smaller copy of a photo for product grids (Drive and Unsplash can resize; other hosts stay as they are)
  window.toThumbUrl = (url) => (url || "")
    .replace(/(lh3\.googleusercontent\.com\/d\/[\w-]+)=w\d+/, "$1=w600")
    .replace(/(images\.unsplash\.com\/[^?]+\?(?:.*&)?w=)\d+/, "$1600");

  /* ---------- sizes & colours ---------- */
  const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL", "5XL", "6XL", "FREE SIZE"];
  const sizeRank = (s) => {
    const i = SIZE_ORDER.indexOf(String(s).toUpperCase());
    return i >= 0 ? i : 100 + (parseFloat(s) || 0); // numeric sizes (32, 34…) after letter sizes
  };
  window.sortSizes = (arr) => arr.slice().sort((a, b) => sizeRank(a) - sizeRank(b));
  // "Rust Orange " -> "rust orange" (to compare colours); "rust-orange" for links
  const colorKey = (c) => String(c || "").trim().toLowerCase().replace(/\s+/g, " ");
  window.colorKey = colorKey;
  window.colorSlug = (c) => colorKey(c).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  // The colour variant of a product (falls back to its first colour)
  window.variantOf = (p, color) => p.variants.find((v) => v.key === colorKey(color)) || p.variants[0];

  // Product details shown on the product page, in this order (only filled ones are shown)
  const DETAIL_FIELDS = [["fabric", "Fabric"], ["lining", "Lining"], ["length", "Length"],
    ["sleeve_type", "Sleeve type"], ["sleeve", "Sleeve type"], ["neck", "Neck"], ["work", "Work"],
    ["dupatta", "Dupatta"], ["bottom", "Bottom"], ["occasion", "Occasion"], ["wash_care", "Wash care"]];
  function detailsOf(o) {
    const out = [];
    DETAIL_FIELDS.forEach(([k, label]) => {
      if (o[k] && !out.some((d) => d.label === label)) out.push({ label, value: o[k] });
    });
    // other_details: "Pattern: Embroidered; Closure: Zip" (or one per line)
    String(o.other_details || "").split(/[;\n]/).forEach((part) => {
      const [label, ...rest] = part.split(":");
      if (label.trim() && rest.join(":").trim()) out.push({ label: label.trim(), value: rest.join(":").trim() });
    });
    return out;
  }

  /* ---------- sheet rows -> products ----------
     One design = all rows with the same id. Each row is one colour (or a list of colours that
     share the same photos). Only the first row needs name, price, details…; other rows need just
     the colour, photos and sold-out sizes, and can override price/mrp/sizes for that colour. */
  function rowsToProducts(rows) {
    const headers = rows[0].map(keyOf);
    const isUrl = (v) => /^https?:\/\//i.test(v);
    const designs = new Map();
    rows.slice(1).forEach((r, i) => {
      const o = {};
      headers.forEach((h, idx) => { if (h && !o[h]) o[h] = (r[idx] || "").trim(); });
      // photos: image1, image2… columns, plus link cells in columns without a heading
      const images = r.map((v, idx) => [headers[idx], (v || "").trim()])
        .filter(([h, v]) => v && (h.startsWith("image") || (!h && isUrl(v))))
        .map(([, v]) => imageUrl(v));
      const stock = (o.in_stock || "").toLowerCase();
      const row = {
        o, images, stock,
        colors: list(o.colors || o.colours || o.color || o.colour),
        sizes: list(o.sizes),
        soldOut: list(o.sold_out_sizes),
        hidden: /^(hide|hidden|draft)$/.test(stock)
      };
      const id = o.id || `P${i + 1}`;
      if (!designs.has(id)) designs.set(id, []);
      designs.get(id).push(row);
    });
    return [...designs].map(([id, list]) => buildDesign(id, list)).filter(Boolean);
  }

  function buildDesign(id, rows) {
    const base = rows.find((r) => r.o.name) || rows[0];
    const b = base.o;
    const basePrice = num(b.price);
    if (!b.name || !basePrice || base.hidden) return null;

    // every size the design is made in (sizes from all its rows), in S-M-L order
    const sizeNames = new Map();
    rows.forEach((r) => r.sizes.forEach((s) => { if (!sizeNames.has(s.toUpperCase())) sizeNames.set(s.toUpperCase(), s); }));
    const sizes = window.sortSizes([...sizeNames.values()]);

    const variants = new Map();
    rows.forEach((r) => {
      if (r.hidden) return;
      const own = (r.sizes.length ? r.sizes : base.sizes.length ? base.sizes : sizes).map((s) => s.toUpperCase());
      const soldOut = r.soldOut.map((s) => s.toUpperCase());
      const available = sizes.filter((s) => own.includes(s.toUpperCase()) && !soldOut.includes(s.toUpperCase()));
      const price = num(r.o.price) || basePrice;
      const mrp = Math.max(num(r.o.mrp) || num(b.mrp) || price, price);
      const flag = r.stock || base.stock; // a colour's own yes/no, else the design's
      const inStock = (flag === "" || yes(flag)) && (!sizes.length || available.length > 0);
      const colors = r.colors.length ? r.colors : r === base ? [""] : [];
      const specific = colors.length === 1; // this row is about one colour only
      colors.forEach((c) => {
        const key = colorKey(c);
        const prev = variants.get(key);
        if (prev && prev.specific && !specific) return; // a colour's own row wins over a shared row
        variants.set(key, {
          color: c.trim(), key,
          images: r.images.length ? r.images : base.images,
          price, mrp, available, inStock, specific,
          madeToOrder: r.o.made_to_order ? yes(r.o.made_to_order) : yes(b.made_to_order),
          code: r.o.color_code || ""
        });
      });
    });
    const vars = [...variants.values()];
    if (!vars.length) return null;
    const def = vars.find((v) => v.inStock) || vars[0]; // colour shown first

    return {
      id,
      name: b.name,
      category: b.category || "Others",
      price: def.price,
      mrp: def.mrp,
      sizes,
      soldOutSizes: sizes.filter((s) => !def.available.includes(s)),
      colors: vars.map((v) => v.color).filter(Boolean),
      variants: vars,
      images: def.images,
      description: b.description || "",
      details: detailsOf(b),
      fabric: b.fabric || "",
      sleeve: b.sleeve_type || b.sleeve || "",
      dupatta: b.dupatta || "",
      inStock: vars.some((v) => v.inStock),
      tag: (b.tag || "").toLowerCase(),
      featured: yes(b.featured),
      madeToOrder: def.madeToOrder
    };
  }

  // Rows of "setting, value" (Settings tab)
  function rowsToSettings(rows) {
    const settings = {};
    rows.slice(1).forEach(([key, value]) => {
      const k = keyOf(key || "");
      if (k && (value || "").trim()) settings[k] = value.trim();
    });
    return settings;
  }

  // Review responses: timestamp, name, city, rating, review, order id, product, (photo), show.
  // Only rows you approved with show = yes are returned, newest first.
  function rowsToReviews(rows) {
    const headers = rows[0].map(keyOf);
    return rows.slice(1).map((r) => {
      const o = {};
      headers.forEach((h, idx) => (o[h] = (r[idx] || "").trim()));
      return {
        name: o.name,
        city: o.city || "",
        rating: Math.min(5, Math.max(0, Math.round(num(o.rating)))),
        text: o.review || o.reiew || "",
        product: o.product || "",
        photo: o.photo ? imageUrl(o.photo) : "",
        show: o.show
      };
    }).filter((x) => x.name && x.text && yes(x.show)).reverse();
  }

  /* ---------- Loader with a short cache so pages open instantly ---------- */
  const CACHE_MS = 2 * 60 * 1000;
  const loaders = {};

  // url → parsed data; cached for 2 minutes per browser tab
  function loadCsv(name, url, parse, fallback) {
    if (loaders[name]) return loaders[name];
    if (!url) return (loaders[name] = Promise.resolve(fallback));
    const key = `tws_${name}_v3`;
    try {
      const cached = JSON.parse(sessionStorage.getItem(key) || "null");
      if (cached && Date.now() - cached.time < CACHE_MS) return (loaders[name] = Promise.resolve(cached.data));
    } catch (e) { /* ignore broken cache */ }

    loaders[name] = fetch(url)
      .then((r) => { if (!r.ok) throw new Error(`${name} not reachable`); return r.text(); })
      .then((text) => {
        const data = parse(parseCSV(text));
        sessionStorage.setItem(key, JSON.stringify({ time: Date.now(), data }));
        return data;
      });
    return loaders[name];
  }

  const C = window.SHOP_CONFIG;

  // Products: samples only when no sheet is set. If the sheet fails, show nothing rather than
  // fake products (pages show a "please refresh" message for an empty list).
  // Sample products in the same shape as sheet products (one shared photo set for their colours)
  const samples = () => SAMPLE_PRODUCTS.map((p) => {
    const variants = (p.colors.length ? p.colors : [""]).map((c) => ({
      color: c, key: colorKey(c), images: p.images, price: p.price, mrp: p.mrp,
      available: p.sizes.slice(), inStock: p.inStock, specific: false, madeToOrder: false, code: ""
    }));
    return { ...p, sizes: window.sortSizes(p.sizes), soldOutSizes: [], variants,
      details: p.fabric ? [{ label: "Fabric", value: p.fabric }] : [], sleeve: "", dupatta: "", madeToOrder: false };
  });

  window.loadProducts = () => loadCsv("products", C.sheetCsvUrl, rowsToProducts, samples())
    .catch((err) => { console.warn("Could not load the product sheet.", err); window.productsFailed = true; return []; });

  window.loadSettings = () => loadCsv("settings", C.settingsCsvUrl, rowsToSettings, {})
    .catch((err) => { console.warn("Could not load the Settings tab, using config.js values.", err); return {}; });

  window.loadReviews = () => loadCsv("reviews", C.reviewsCsvUrl, rowsToReviews, [])
    .catch((err) => { console.warn("Could not load the Reviews tab.", err); return []; });
})();
