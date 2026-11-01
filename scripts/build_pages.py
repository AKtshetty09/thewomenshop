"""Make a page for every product (twshop.in/p/TWS001) and a sitemap, from the Google Sheet.

Each page is product.html with the product's own title, photo and price in the link-preview
tags, so WhatsApp, Instagram, Facebook and Google show the product, not just the logo.

Run by .github/workflows/deploy.yml:  python3 scripts/build_pages.py _site
If the sheet can't be read, the site is still published, just without new product pages.
"""
import csv, html, io, os, re, sys, urllib.parse, urllib.request

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
    with urllib.request.urlopen(SHEET, timeout=30) as r:
        rows = list(csv.reader(io.StringIO(r.read().decode("utf-8"))))
    head = [re.sub(r"\s+", "_", h.strip().lower()) for h in rows[0]]
    out = []
    for row in rows[1:]:
        o = {h: (row[i].strip() if i < len(row) else "") for i, h in enumerate(head)}
        pid, name = o.get("id", ""), o.get("name", "")
        price = re.sub(r"[^0-9.]", "", o.get("price", ""))
        if not (pid and name and price) or re.fullmatch(r"hide|hidden|draft", o.get("in_stock", "").lower()):
            continue
        if not re.fullmatch(r"[A-Za-z0-9_-]+", pid):
            print(f"  skipped {pid!r}: use only letters, numbers, - and _ in product ids")
            continue
        images = [image_url(o[h]) for h in head if h.startswith("image") and o.get(h)]
        out.append({"id": pid, "name": name, "price": price, "category": o.get("category", ""),
                    "description": o.get("description", ""), "image": images[0] if images else ""})
    return out


def product_page(template, p):
    e = lambda v: html.escape(v, quote=True)
    url = f"{BASE}/p/{p['id']}"
    title = f"{p['name']} | {SHOP}"
    desc = f"{money(p['price'])} · {p['category']} · {p['description']}".strip(" ·")[:200]
    image = p["image"] or f"{BASE}/assets/logo.jpg"
    s = template
    s = s.replace("<head>", '<head>\n  <base href="/">', 1)  # css/js/links work from /p/
    s = re.sub(r"<title>.*?</title>", f"<title>{e(title)}</title>", s, count=1)
    s = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{e(desc)}">', s, count=1)
    s = re.sub(r'<meta property="og:type" content="[^"]*">', '<meta property="og:type" content="product">', s, count=1)
    s = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{e(title)}">', s, count=1)
    s = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{e(desc)}">', s, count=1)
    s = re.sub(r'<meta property="og:image" content="[^"]*">', f'<meta property="og:image" content="{e(image)}">', s, count=1)
    s = re.sub(r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{e(url)}">', s, count=1)
    s = s.replace("</head>", f'  <link rel="canonical" href="{e(url)}">\n</head>', 1)
    s = s.replace('<script src="js/config.js', f'<script>window.PRODUCT_ID = "{p["id"]}";</script>\n  <script src="js/config.js', 1)
    return s


def write_sitemap(products):
    pages = ["", "shop.html", "shop.html?tag=new", "shop.html?tag=bestseller", "policies.html"]
    cats = re.search(r"categories:\s*\[([^\]]*)\]", config)
    for c in re.findall(r'"([^"]+)"', cats.group(1) if cats else ""):
        pages.append("shop.html?cat=" + urllib.parse.quote(c))
    pages += [f"p/{p['id']}" for p in products]
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
    for p in products:
        with open(os.path.join(SITE, "p", f"{p['id']}.html"), "w", encoding="utf-8") as f:
            f.write(product_page(template, p))
    write_sitemap(products)
    print(f"Made {len(products)} product pages and the sitemap")


if __name__ == "__main__":
    main()
