/* =========================================================
   SHOP SETTINGS — change anything here, no other code needed
   ========================================================= */
window.SHOP_CONFIG = {
  // Brand name (shown in header, footer, page titles)
  name: "The Women Shop",
  domain: "twshop.in",
  tagline: "You'll get exactly what you see",
  logo: "assets/logo.jpg", // set to "" to show the name as text instead

  // Contact
  // WhatsApp format: country code + number, no "+" or spaces
  whatsappNumber: "919398930741",
  phone: "+91 93989 30741",
  instagramHandle: "thewomenshop.in",
  instagramFollowers: "26.8K",
  facebookUrl: "https://www.facebook.com/share/1KQErP9LVb/",
  location: "Ongole, Andhra Pradesh",
  email: "", // add an email later if you want it shown in the footer

  // Shown in the bag and on every product page
  policyNote: "Prepaid orders only (No COD) · No refunds",
  shippingTime: "7–8 working days",

  // Google Sheet published as CSV (see README.md, "Adding products").
  // Leave empty "" to use the sample products in js/data.js.
  sheetCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS23h91-nkQe8pPL3uFhyhQDsuMJKeVojOnhbV2heQzqY0P4twZ2FOs0x5xyPTZZPQlYDEYJ-RxDbmD/pub?gid=0&single=true&output=csv",

  currency: "₹",

  // Menu categories. Names must match the "category" column in your sheet.
  categories: ["Anarkali Sets", "A-Line Kurtis", "Top & Dupatta Sets", "Kurta Sets", "Sarees", "Dresses"],

  // Home page banner slides. To use your own photo: put it in the "assets" folder
  // (e.g. assets/banner1.jpg) and write "assets/banner1.jpg" as the image.
  // Wide photos (landscape) look best. "focus" = which part of the photo to keep visible.
  heroSlides: [
    {
      image: "https://images.unsplash.com/photo-1744833341427-6f2b4eac91ff?w=1800&q=80&auto=format&fit=crop",
      focus: "center 30%",
      eyebrow: "New Collection",
      title: "Anarkalis made for <em>celebrations</em>",
      text: "Flowing silhouettes, rich colours and dupattas you'll love.",
      button: "Shop Anarkali Sets",
      link: "shop.html?cat=Anarkali%20Sets"
    },
    {
      image: "https://images.unsplash.com/photo-1597983073750-16f5ded1321f?w=1800&q=80&auto=format&fit=crop",
      focus: "center 35%",
      eyebrow: "Everyday Elegance",
      title: "Kurtis you'll <em>live in</em>",
      text: "Comfortable A-line kurtis and kurta sets for work, college and festivals.",
      button: "Shop Kurtis",
      link: "shop.html?cat=A-Line%20Kurtis"
    },
    {
      image: "https://images.unsplash.com/photo-1743229995546-2922b49e7d1e?w=1800&q=80&auto=format&fit=crop",
      focus: "center 40%",
      eyebrow: "You'll get exactly what you see",
      title: "Real photos, <em>real quality</em>",
      text: "Every piece is quality checked and shipped from Ongole to all over India.",
      button: "Shop New Arrivals",
      link: "shop.html?tag=new"
    }
  ],

  // Top announcement bar: keep exactly 3 messages.
  // Add link: "..." to make a message clickable ("whatsapp" opens a WhatsApp chat).
  announcements: [
    { text: "✨ You'll get exactly what you see · Quality 💯" },
    { text: "💬 Order on WhatsApp: +91 93989 30741", link: "whatsapp" },
    { text: "📦 Delivered all over India in 7–8 working days", link: "policies.html#shipping" }
  ],

  // Promises shown on the home page and product page. Edit to match your policies.
  promises: [
    { icon: "shield", title: "Exactly what you see", text: "Real photos, no surprises" },
    { icon: "chat", title: "Order on WhatsApp", text: "Quick replies, personal help with sizes" },
    { icon: "truck", title: "Delivery in 7–8 working days", text: "Shipped all over India from Ongole, AP" },
    { icon: "refresh", title: "Exchange for damaged items", text: "Just share your unboxing video" }
  ]
};
