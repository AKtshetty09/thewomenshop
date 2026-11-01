/* Pay page: pay.html?o=ORDER_ID&a=AMOUNT (links are made at paylink.html) */
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

  // Standard UPI payment link: opens GPay / PhonePe / Paytm with everything filled in
  const note = `Order ${order}`;
  // keep "@" as-is and spaces as %20: some UPI apps don't decode "%40" or "+"
  const enc = (v) => encodeURIComponent(v).replace(/%40/g, "@");
  const upi = `upi://pay?pa=${enc(P.upiId)}&pn=${enc(P.upiName)}&am=${amount.toFixed(2)}&cu=INR&tn=${enc(note)}`;
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const onPhone = isAndroid || isIOS;

  // One button per app, so the phone's default UPI app (e.g. WhatsApp) doesn't take over.
  // Android: open the exact app by its package name (Play Store if it isn't installed).
  // iPhone: each app's own link.
  const query = upi.split("?")[1];
  const APPS = [
    { name: "PhonePe", cls: "app-phonepe", pkg: "com.phonepe.app", ios: `phonepe://pay?${query}` },
    { name: "Google Pay", cls: "app-gpay", pkg: "com.google.android.apps.nbu.paisa.user", ios: `gpay://upi/pay?${query}` },
    { name: "Paytm", cls: "app-paytm", pkg: "net.one97.paytm", ios: `paytmmp://pay?${query}` }
  ];
  const appLink = (a) => (isAndroid ? `intent://pay?${query}#Intent;scheme=upi;package=${a.pkg};end` : a.ios);
  const b = P.bank;

  box.innerHTML = `
    <div class="pay-card">
      <p class="pay-ok">${icon("shield")} Order confirmed</p>
      <h1>Pay for your order</h1>
      <div class="pay-sum">
        <div><small>Order ID</small><strong>${esc(order)}</strong></div>
        <div><small>Amount to pay</small><strong class="pay-amt">${money(amount)}</strong></div>
      </div>

      ${onPhone ? `
      <p class="pay-choose">Pay ${money(amount)} with</p>
      <div class="pay-apps">
        ${APPS.map((a) => `<a class="pay-app ${a.cls}" href="${esc(appLink(a))}">${a.name}</a>`).join("")}
        <a class="pay-app app-other" href="${esc(upi)}">Other UPI app</a>
      </div>
      <p class="muted small center">The amount and order ID are filled in automatically.</p>` : ""}

      <div class="pay-qr">
        <div id="qr" aria-label="UPI QR code"></div>
        <p>${onPhone ? "Or scan this QR from another phone" : "Scan with any UPI app to pay"}<br><small class="muted">Amount and order ID are filled in automatically</small></p>
      </div>

      <div class="pay-rows">
        <div class="pay-row"><span>UPI ID</span><strong>${esc(P.upiId)}</strong><button data-copy="${esc(P.upiId)}">Copy</button></div>
        <div class="pay-row"><span>Name</span><strong>${esc(P.upiName)}</strong></div>
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

  // QR code of the same UPI link
  const qr = qrcode(0, "M");
  qr.addData(upi);
  qr.make();
  document.getElementById("qr").innerHTML = qr.createSvgTag({ cellSize: 5, margin: 2, scalable: true });

  box.addEventListener("click", async (e) => {
    const c = e.target.closest("[data-copy]");
    if (!c) return;
    try { await navigator.clipboard.writeText(c.dataset.copy); toast("Copied"); }
    catch (x) { toast(c.dataset.copy); }
  });
})();
