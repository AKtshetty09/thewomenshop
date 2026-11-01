/* Pay page: pay?o=ORDER_ID&a=AMOUNT (links are made at paylink) */
(function () {
  const { esc, icon, money, waLink, toast } = window.TWS;
  const C = window.SHOP_CONFIG;
  const P = C.payment;
  const params = new URLSearchParams(location.search);
  const order = (params.get("o") || "").trim();
  const amount = Number(params.get("a"));
  const box = document.getElementById("pay");

  const valid = /^[A-Za-z0-9-]{3,30}$/.test(order) && amount > 0 && amount <= 100000;
  if (!valid) {
    box.innerHTML = `
      <div class="empty">
        ${icon("info", "ico-xl")}
        <h4>This payment link isn't complete</h4>
        <p>Please ask us on WhatsApp for a new payment link.</p>
        <a class="btn btn-wa" href="${waLink(`Hi ${C.name}! My payment link isn't working. Can you send it again?`)}" target="_blank" rel="noopener">${icon("whatsapp")} Message us</a>
      </div>`;
    return;
  }

  // Standard UPI payment link (used in the QR, and in the app buttons for business accounts)
  const note = `Order ${order}`;
  // keep "@" as-is and spaces as %20: some UPI apps don't decode "%40" or "+"
  const enc = (v) => encodeURIComponent(v).replace(/%40/g, "@");
  const upi = `upi://pay?pa=${enc(P.upiId)}&pn=${enc(P.upiName)}&am=${amount.toFixed(2)}&cu=INR&tn=${enc(note)}`;
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const onPhone = isAndroid || isIOS;

  // One-tap app buttons. UPI apps decline these for personal UPI IDs ("declined for security
  // reasons"), so they only show when config.payment.appButtons is true (business/merchant UPI ID).
  const query = upi.split("?")[1];
  const APPS = [
    { name: "PhonePe", cls: "app-phonepe", pkg: "com.phonepe.app", ios: `phonepe://pay?${query}` },
    { name: "Google Pay", cls: "app-gpay", pkg: "com.google.android.apps.nbu.paisa.user", ios: `gpay://upi/pay?${query}` },
    { name: "Paytm", cls: "app-paytm", pkg: "net.one97.paytm", ios: `paytmmp://pay?${query}` }
  ];
  const appLink = (a) => (isAndroid ? `intent://pay?${query}#Intent;scheme=upi;package=${a.pkg};end` : a.ios);
  const appButtons = P.appButtons && onPhone ? `
      <p class="pay-choose">Pay ${money(amount)} with</p>
      <div class="pay-apps">
        ${APPS.map((a) => `<a class="pay-app ${a.cls}" href="${esc(appLink(a))}">${a.name}</a>`).join("")}
        <a class="pay-app app-other" href="${esc(upi)}">Other UPI app</a>
      </div>` : "";
  const b = P.bank;
  const amt = amount % 1 ? amount.toFixed(2) : String(amount);

  box.innerHTML = `
    <div class="pay-card">
      <p class="pay-ok">${icon("shield")} Order confirmed</p>
      <h1>Pay for your order</h1>
      <div class="pay-sum">
        <div><small>Order ID</small><strong>${esc(order)}</strong></div>
        <div><small>Amount to pay</small><strong class="pay-amt">${money(amount)}</strong></div>
      </div>
      ${appButtons}

      <h4 class="pay-h">Pay with any UPI app</h4>
      <ol class="pay-steps">
        <li>
          <span>Copy our UPI ID</span>
          <div class="pay-copy"><strong>${esc(P.upiId)}</strong><button class="btn" data-copy="${esc(P.upiId)}">Copy</button></div>
          <small class="muted">Name: ${esc(P.upiName)}</small>
        </li>
        <li><span>Open Google Pay, PhonePe, Paytm or your bank app → <strong>Pay to UPI ID</strong> → paste it</span></li>
        <li>
          <span>Enter the amount and add the order ID in the note</span>
          <div class="pay-copy"><strong>${money(amount)}</strong><button class="btn btn-outline" data-copy="${esc(amt)}">Copy amount</button></div>
          <div class="pay-copy"><strong>${esc(order)}</strong><button class="btn btn-outline" data-copy="${esc(note)}">Copy note</button></div>
        </li>
      </ol>

      <div class="pay-qr">
        <img id="qr" alt="UPI QR code to pay ${esc(money(amount))}">
        <div>
          <p>${onPhone ? "Or pay with this QR code" : "Scan with any UPI app to pay"}</p>
          <small class="muted">${onPhone
            ? "Save it, then in your UPI app tap <strong>Scan</strong> → <strong>gallery / photo</strong> and pick it. Or scan it from another phone."
            : "The amount and order ID are filled in automatically."}</small>
          ${onPhone ? `<a class="btn btn-outline pay-save" id="qr-save" download="TheWomenShop-${esc(order)}.png">Save QR to gallery</a>` : ""}
        </div>
      </div>

      ${b && b.account ? `
      <details class="pay-bank">
        <summary>Pay by bank transfer (NEFT / IMPS) instead</summary>
        <div class="pay-rows">
          <div class="pay-row"><span>Account name</span><strong>${esc(b.holder)}</strong></div>
          <div class="pay-row"><span>Account no.</span><strong>${esc(b.account)}</strong><button data-copy="${esc(b.account)}">Copy</button></div>
          <div class="pay-row"><span>IFSC</span><strong>${esc(b.ifsc)}</strong><button data-copy="${esc(b.ifsc)}">Copy</button></div>
          <div class="pay-row"><span>Bank</span><strong>${esc(b.name)}</strong></div>
        </div>
        <p class="muted small">Please write <strong>${esc(order)}</strong> in the transfer remarks.</p>
      </details>` : ""}

      <div class="pay-after">
        <h4>After paying</h4>
        <p>Send us the payment screenshot on WhatsApp. We'll confirm and share your dispatch details.</p>
        <a class="btn btn-wa btn-block" href="${waLink(`Hi ${C.name}! I've paid ${money(amount)} for order *${order}*. Sharing the screenshot.`)}" target="_blank" rel="noopener">${icon("whatsapp")} I've paid: send screenshot</a>
      </div>
      <p class="policy-note">${icon("info")} <span>${esc(C.policyNote)} · <a href="policies.html">Details</a></span></p>
    </div>`;

  // QR as a PNG picture (so it can be saved to the gallery), with the amount and order printed below
  const qr = qrcode(0, "M");
  qr.addData(upi);
  qr.make();
  const n = qr.getModuleCount(), cell = 8, pad = 4 * cell, size = n * cell + pad * 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size + 70;
  const g = canvas.getContext("2d");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = "#000";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) g.fillRect(pad + c * cell, pad + r * cell, cell, cell);
  g.textAlign = "center";
  g.font = "bold 26px sans-serif";
  g.fillText(`${money(amount)} · ${C.name}`, size / 2, size + 22);
  g.font = "20px sans-serif";
  g.fillText(`Order ${order}`, size / 2, size + 52);
  const png = canvas.toDataURL("image/png");
  document.getElementById("qr").src = png;
  const save = document.getElementById("qr-save");
  if (save) save.href = png;

  box.addEventListener("click", async (e) => {
    const c = e.target.closest("[data-copy]");
    if (!c) return;
    window.TWS.track("pay-copy", { what: c.dataset.copy === P.upiId ? "upi-id" : c.dataset.copy.startsWith("Order") ? "note" : /^\d+(\.\d+)?$/.test(c.dataset.copy) ? "amount" : "bank" });
    try { await navigator.clipboard.writeText(c.dataset.copy); toast(`Copied: ${c.dataset.copy}`); }
    catch (x) { toast(c.dataset.copy); }
  });
})();
