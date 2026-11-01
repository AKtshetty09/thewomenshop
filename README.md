# The Women Shop

Website for The Women Shop, Ongole: https://twshop.in
Instagram: [@thewomenshop.in](https://www.instagram.com/thewomenshop.in/)

Products are managed in Google Sheets. Columns:

id · name · category · price · mrp · sizes · sold_out_sizes · colors · image1, image2, … ·
description · fabric · in_stock (yes / no / hide) · tag (new/bestseller) · featured (yes/no)

The Settings tab of the same sheet controls the follower count, shipping time,
top bar messages and home banners (see `settings-template.csv`).
The Reviews tab (name, city, review, photo, show) fills the home page reviews (see `reviews-template.csv`).

Other shop settings (phone, categories): `js/config.js`

When you change a file in css/ or js/, raise the `?v=` number in all HTML files so browsers load the new version.

Publishing: `.github/workflows/deploy.yml` publishes the site to GitHub Pages on every change to `main`
and every hour. Each run makes a page per product (`twshop.in/p/TWS001`) from the sheet, so shared
links show the product photo. GitHub Pages source must be set to **GitHub Actions**.
