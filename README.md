# The Women Shop

Website for The Women Shop, Ongole: https://twshop.in
Instagram: [@thewomenshop.in](https://www.instagram.com/thewomenshop.in/)

Products are managed in Google Sheets (see `products-template.csv`). **One row per colour**:
rows with the same `id` are one design. Fill everything in the design's first row; other colour rows
need only `colors` (one colour), photos and `sold_out_sizes`, and may override `price`, `mrp`, `sizes`,
`in_stock` or `made_to_order` for that colour.

Columns: id · name · category · price · mrp · sizes (every size the design is made in) ·
sold_out_sizes (shown crossed out) · colors · color_code (optional dot colour, e.g. #16807f) ·
image1, image2, … · description · fabric · lining · length · sleeve_type · dupatta · bottom ·
other_details ("Work: Handwork; Occasion: Festive") · in_stock (yes / no / hide) · made_to_order ·
tag (new/bestseller) · featured (yes/no)

The Settings tab of the same sheet controls the follower count, shipping time,
top bar messages and home banners (see `settings-template.csv`).
The Reviews tab (name, city, review, photo, show) fills the home page reviews (see `reviews-template.csv`).

Other shop settings (phone, categories): `js/config.js`

When you change a file in css/ or js/, raise the `?v=` number in all HTML files so browsers load the new version.

Publishing: `.github/workflows/deploy.yml` publishes the site to GitHub Pages on every change to `main`
and every hour. Each run makes a page per product (`twshop.in/p/TWS001`) from the sheet, so shared
links show the product photo. GitHub Pages source must be set to **GitHub Actions**.

Shop Admin: twshop.in/admin lets the owner add/edit products, colours, photos and stock from a phone,
approve customer reviews, and change the Settings tab (home banners, top bar, menu, shipping).
It calls a Google Apps Script attached to the product sheet: `scripts/admin-apps-script.gs`
(deployed as a Web app; protected by the PIN set at the top of that script). Photos go to the
Google Drive folder "The Women Shop - website photos". After editing the script: Deploy → Manage
deployments → Edit → New version.
