"""Make a page for every product (twshop.in/p/TWS001), one for each of its colours
(twshop.in/p/TWS001-rust-orange), and a sitemap, from the Google Sheet.

Each page is product.html with the product's own title, photo and price in the link-preview
tags, so WhatsApp, Instagram, Facebook and Google show the product (in that colour), not just the logo.

Run by .github/workflows/deploy.yml:  python3 scripts/build_pages.py _site
If the sheet can't be read, the site is still published, just without new product pages.
"""
import csv, html, io, json, os, re, sys, urllib.parse, urllib.request

SITE = sys.argv[1] if len(sys.argv) > 1 else "_site"
config = open(os.path.join(SITE, "js", "config.js"), encoding="utf-8").read()
DOMAIN = re.search(r'domain:\s*"([^"]+)"', config).group(1)
SHOP = re.search(r'name:\s*"([^"]+)"', config).group(1)
SHEET = re.search(r'sheetCsvUrl:\s*"([^"]*)"', config).group(1)
BASE = f"https://{DOMAIN}"


def image_url(v):
    """Same as toImageUrl in js/data.js: Google Drive share link -> direct image."""
    m = re.search(r"(?:drive|docs)\.google\.com/(?:file/d/|open\?id=|uc\?(?:.*&)?id=)([\w-]{20,})", v)
    return f"https://lh3.googleusercontent.com/d/{m.group(1)}=w1200" if m else v


def slug(c):
    """'Rust Orange' -> 'rust-orange' (same as colorSlug in js/data.js)."""
    return re.sub(r"[^a-z0-9]+", "-", re.sub(r"\s+", " ", c.strip().lower())).strip("-")


def money(n):
    """1899 -> ₹1,899 and 123456 -> ₹1,23,456 (Indian grouping), like the website."""
    n = float(n)
    digits = str(int(n))
    head, tail = digits[:-3], digits[-3:]
    groups = []
    while len(head) > 2:
        groups.insert(0, head[-2:])
        head = head[:-2]
    if head:
        groups.insert(0, head)
    whole = ",".join(groups + [tail])
    return "₹" + whole + ("" if n == int(n) else f"{n:.2f}"[-3:])


def load_products():
    """Rows with the same id are one design; each row is a colour (or a list of colours
    sharing the same photos). Mirrors rowsToProducts in js/data.js."""
    with urllib.request.urlopen(SHEET, timeout=30) as r:
        rows = list(csv.reader(io.StringIO(r.read().decode("utf-8"))))
    head = [re.sub(r"\s+", "_", h.strip().lower()) for h in rows[0]]
    designs = {}
    for row in rows[1:]:
        cells = [(head[i] if i < len(head) else "", (v or "").strip()) for i, v in enumerate(row)]
        o = {}
        for h, v in cells:
            if h and not o.get(h):
                o[h] = v
        pid = o.get("id", "")
        if not pid:
            continue
        if not re.fullmatch(r"[A-Za-z0-9_-]+", pid):
            print(f"  skipped {pid!r}: use only letters, numbers, - and _ in product ids")
            continue
        # photos: image1, image2… columns, plus link cells in columns without a heading
        images = [image_url(v) for h, v in cells if v and (h.startswith("image") or (not h and re.match(r"https?://", v)))]
        colour_cell = o.get("colors") or o.get("colours") or o.get("color") or o.get("colour") or ""
        designs.setdefault(pid, []).append({
            "o": o, "images": images,
            "colours": [c.strip() for c in colour_cell.split(",") if c.strip()],
            "hidden": bool(re.fullmatch(r"hide|hidden|draft", o.get("in_stock", "").lower())),
        })

    out = []
    for pid, rows_ in designs.items():
        base = next((r for r in rows_ if r["o"].get("name")), rows_[0])
        b = base["o"]
        price = re.sub(r"[^0-9.]", "", b.get("price", ""))
        if not (b.get("name") and price) or base["hidden"]:
            continue
        variants = {}
        for r in rows_:
            if r["hidden"]:
                continue
            colours = r["colours"] or ([""] if r is base else [])
            specific = len(colours) == 1  # this row is about one colour only
            for c in colours:
                k = re.sub(r"\s+", " ", c.lower())
                if k in variants and variants[k]["specific"] and not specific:
                    continue  # a colour's own row wins over a shared row
                variants[k] = {
                    "colour": c, "specific": specific,
                    "price": re.sub(r"[^0-9.]", "", r["o"].get("price", "")) or price,
                    "image": (r["images"] or base["images"] or [""])[0],
                }
        if variants:
            out.append({"id": pid, "name": b["name"], "category": b.get("category", ""),
                        "description": b.get("description", ""), "variants": list(variants.values())})
    return out


def product_page(template, p, v, colour_page):
    """The design's page (shows its first colour), or a colour's own page."""
    e = lambda x: html.escape(x, quote=True)
    canonical = f"{BASE}/p/{p['id']}"
    url = f"{canonical}-{slug(v['colour'])}" if colour_page else canonical
    title = f"{p['name']} – {v['colour']} | {SHOP}" if colour_page else f"{p['name']} | {SHOP}"
    colours = [x["colour"] for x in p["variants"] if x["colour"]]
    more = f" · {len(colours)} colours" if len(colours) > 1 else ""
    desc = f"{money(v['price'])} · {p['category']}{more} · {p['description']}".strip(" ·")[:200]
    image = v["image"] or f"{BASE}/assets/logo.jpg"
    s = template
    s = s.replace("<head>", '<head>\n  <base href="/">', 1)  # css/js/links work from /p/
    s = re.sub(r"<title>.*?</title>", f"<title>{e(title)}</title>", s, count=1)
    s = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{e(desc)}">', s, count=1)
    s = re.sub(r'<meta property="og:type" content="[^"]*">', '<meta property="og:type" content="product">', s, count=1)
    s = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{e(title)}">', s, count=1)
    s = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{e(desc)}">', s, count=1)
    s = re.sub(r'<meta property="og:image" content="[^"]*">', f'<meta property="og:image" content="{e(image)}">', s, count=1)
    s = re.sub(r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{e(url)}">', s, count=1)
    s = s.replace("</head>", f'  <link rel="canonical" href="{e(canonical)}">\n</head>', 1)
    ids = f"window.PRODUCT_ID = {json.dumps(p['id'])};"
    if colour_page:
        ids += f" window.PRODUCT_COLOR = {json.dumps(v['colour'])};"
    s = s.replace('<script src="js/config.js', f"<script>{ids}</script>\n  <script src=\"js/config.js", 1)
    return s


def write_sitemap(products):
    pages = ["", "shop.html", "shop.html?tag=new", "shop.html?tag=bestseller", "policies.html"]
    cats = re.search(r"categories:\s*\[([^\]]*)\]", config)
    for c in re.findall(r'"([^"]+)"', cats.group(1) if cats else ""):
        pages.append("shop.html?cat=" + urllib.parse.quote(c))
    pages += [f"p/{p['id']}" for p in products]  # colour pages point Google to these
    urls = "\n".join(f"  <url><loc>{html.escape(BASE + '/' + u)}</loc></url>" for u in pages)
    with open(os.path.join(SITE, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}\n</urlset>\n')


def main():
    try:
        products = load_products()
    except Exception as err:  # sheet unreachable: publish the site anyway
        print(f"WARNING: could not read the product sheet ({err}); product pages not updated")
        return
    template = open(os.path.join(SITE, "product.html"), encoding="utf-8").read()
    os.makedirs(os.path.join(SITE, "p"), exist_ok=True)

    def save(name, page):
        with open(os.path.join(SITE, "p", name), "w", encoding="utf-8") as f:
            f.write(page)

    pages = 0
    for p in products:
        save(f"{p['id']}.html", product_page(template, p, p["variants"][0], False))
        pages += 1
        for v in p["variants"]:
            if slug(v["colour"]):
                save(f"{p['id']}-{slug(v['colour'])}.html", product_page(template, p, v, True))
                pages += 1
    write_sitemap(products)
    print(f"Made {pages} pages for {len(products)} products (including one per colour) and the sitemap")


if __name__ == "__main__":
    main()
