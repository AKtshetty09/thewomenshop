(function () {
  const { esc, icon, money, Orders, Bag, toast, waLink, PLACEHOLDER } = window.TWS;
  const C = window.SHOP_CONFIG;
  const box = document.getElementById("orders");

  document.getElementById("orders-note").innerHTML =
    `${icon("info")} Orders you place on WhatsApp from this website are saved here, on this phone/browser. ` +
    `Payment and delivery updates come to you on WhatsApp.`;

  const fmtDate = (iso) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

  function render() {
    const orders = Orders.all();
    document.getElementById("count").textContent = orders.length ? `${orders.length} order${orders.length === 1 ? "" : "s"}` : "";

    if (!orders.length) {
      box.innerHTML = `
        <div class="empty">
          ${icon("box", "ico-xl")}
          <h4>No orders yet</h4>
          <p>When you order on WhatsApp from this website, your orders will appear here.</p>
          <a class="btn" href="shop.html">Start shopping</a>
        </div>`;
      return;
    }

    box.innerHTML = orders.map((o) => `
      <article class="order">
        <header class="order-head">
          <div>
            <h3>Order ${esc(o.id)}</h3>
            <p class="muted small">${fmtDate(o.date)}</p>
          </div>
          <span class="status">${icon("whatsapp")} Sent on WhatsApp</span>
        </header>
        <ul class="order-items">
          ${o.items.map((it) => `
            <li>
              <a href="product.html?id=${encodeURIComponent(it.id)}"><img src="${esc(window.toThumbUrl(it.image) || PLACEHOLDER)}" alt="${esc(it.name)}" onerror="this.onerror=null;this.src='${PLACEHOLDER}'"></a>
              <div>
                <a href="product.html?id=${encodeURIComponent(it.id)}"><h4>${esc(it.name)}</h4></a>
                <p class="muted small">Size: ${esc(it.size)}${it.color ? ` · Colour: ${esc(it.color)}` : ""} · Qty: ${it.qty} · Code ${esc(it.id)}</p>
                <p class="price"><strong>${money(it.price * it.qty)}</strong></p>
              </div>
            </li>`).join("")}
        </ul>
        <footer class="order-foot">
          <p class="order-total">Total <strong>${money(o.total)}</strong></p>
          <div class="order-actions">
            <a class="btn btn-wa" target="_blank" rel="noopener" href="${waLink(`Hi ${C.name}! I'd like an update on my order *${o.id}* (${money(o.total)}).`)}">${icon("whatsapp")} Ask about this order</a>
            <button class="btn btn-outline" data-reorder="${esc(o.id)}">${icon("bag")} Order again</button>
            <button class="link-remove" data-remove-order="${esc(o.id)}">Remove</button>
          </div>
        </footer>
      </article>`).join("");
  }

  box.addEventListener("click", async (e) => {
    const re = e.target.closest("[data-reorder]");
    const rm = e.target.closest("[data-remove-order]");
    if (re) {
      const order = Orders.all().find((o) => o.id === re.dataset.reorder);
      const products = await window.loadProducts();
      let added = 0;
      order.items.forEach((it) => {
        const p = products.find((x) => x.id === it.id);
        if (p && p.inStock) { Bag.add(it.id, it.size, it.qty, it.color || ""); added++; }
      });
      if (added) window.TWS.openBag();
      toast(added === order.items.length ? "Added to bag 🛍️" : added ? "Some items are sold out. The rest were added to your bag." : "Sorry, these items are sold out now");
    }
    if (rm && confirm("Remove this order from your list? (This does not cancel it.)")) {
      Orders.remove(rm.dataset.removeOrder);
      render();
    }
  });

  render();
})();
