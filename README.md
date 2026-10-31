# The Women Shop: website

Online store for **The Women Shop** ([@thewomenshop.in](https://www.instagram.com/thewomenshop.in/)).
Customers browse products, add them to their bag and order on **WhatsApp** or by **Instagram DM**.
Products come from a **Google Sheet**, so you never need to edit code to add products.

## Pages

| File | Page |
|---|---|
| `index.html` | Home: banner slider, categories, new arrivals, bestsellers, Instagram |
| `shop.html` | All products, with filters (category, price, size, discount), sorting and search |
| `product.html?id=…` | Product details: photos, sizes, Add to Bag, Buy on WhatsApp |
| `wishlist.html` | Saved products |
| `orders.html` | My Orders: orders placed from this phone, with "Ask about this order" and "Order again" |

## Change shop settings (name, WhatsApp number, …)

Open **`js/config.js`**. Everything is in one place:

- `name`: shop name shown everywhere. You can rename the shop any time.
- `whatsappNumber`: **replace the placeholder with your number** (e.g. `919876543210`)
- `instagramHandle`, `email`
- `categories`: the menu items
- `announcements`: the 3 messages in the top bar
- `promises`: shipping, exchange and other notes shown on the home and product pages

Brand colours are at the top of **`css/style.css`** (`--primary`, `--gold`, …).

## Adding products (Google Sheet)

### One-time setup
1. Go to [sheets.google.com](https://sheets.google.com) and create a new sheet.
2. **File → Import → Upload** `products-template.csv`, then choose **Replace current sheet**.
   This gives you the correct column headings.
3. **File → Share → Publish to web**, choose **Entire document** and **Comma-separated values (.csv)**, then click **Publish**.
4. Copy the link and paste it into `js/config.js`:
   ```js
   sheetCsvUrl: "https://docs.google.com/spreadsheets/d/e/XXXX/pub?output=csv",
   ```
5. Commit and push. That's the only code change you need.

### Every day
Just add or edit rows in the sheet. The website updates within about 5 minutes.

| Column | What to write | Example |
|---|---|---|
| `id` | Unique product code | `TWS018` |
| `name` | Product name | `Pink Floral Kurti` |
| `category` | Must match a category in `config.js` | `Dresses` |
| `price` | Selling price | `899` |
| `mrp` | Original price (shows a strike-through and % OFF) | `1499` |
| `sizes` | Comma-separated | `S, M, L, XL` |
| `colors` | Comma-separated | `Pink, White` |
| `image1`, `image2`, `image3`, … | Photo links (only `image1` is required). Need more photos? Add columns `image4`, `image5`, `image6`, … as many as you like | `https://…` |
| `description` | A short description | |
| `fabric` | Fabric | `Cotton` |
| `in_stock` | `yes` or `no` | `yes` |
| `tag` | `new`, `bestseller` or empty | `new` |
| `featured` | `yes` to show it in the big home-page banners | `no` |

**Photos:** either option works. Paste the link into the `image1` column.

- **Google Drive:** upload the photo, then go to **Share → General access → Anyone with the link** and click **Copy link**.
  Paste that link as it is; the website converts it automatically.
  Tip: make one Drive folder (e.g. "Website photos") and share the *folder* as "Anyone with the link".
  Every photo you put in it is then shared automatically.
- **[ImgBB](https://imgbb.com)** or **[Cloudinary](https://cloudinary.com):** upload the photo and copy the **direct link** (ends in `.jpg`, `.png` or `.webp`).

Google Photos links (`photos.app.goo.gl/...`) do **not** work. Use Drive instead.
Portrait photos (3:4 ratio) look best.

Until the sheet is connected, the site shows sample products from `js/data.js`.

## Preview locally
Double-click `index.html`, or in VS Code use the **Live Server** extension.

## Live website: GitHub Pages + twshop.in
The site is hosted free on **GitHub Pages** at **https://twshop.in** (domain from Namecheap).
Every push to `main` updates the live site automatically (takes 1–2 minutes).

**GitHub:** Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)`.
Custom domain: `twshop.in` (also saved in the `CNAME` file; don't delete it), with **Enforce HTTPS** ticked.

**Namecheap DNS** (Domain List → twshop.in → Manage → Advanced DNS):

| Type | Host | Value |
|---|---|---|
| A Record | `@` | `185.199.108.153` |
| A Record | `@` | `185.199.109.153` |
| A Record | `@` | `185.199.110.153` |
| A Record | `@` | `185.199.111.153` |
| CNAME Record | `www` | `aktshetty09.github.io.` |
