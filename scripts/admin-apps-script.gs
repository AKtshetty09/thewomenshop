/**
 * The Women Shop – Shop Admin (Google Apps Script)
 *
 * Lets twshop.in/admin read and update the product sheet and save product photos to
 * Google Drive. It runs inside your own Google account; only someone with your PIN can use it.
 *
 * Setup (once):
 *   1. Open the product sheet → Extensions → Apps Script.
 *   2. Delete what's there, paste this whole file, and change ADMIN_PIN below.
 *   3. Save → Deploy → New deployment → type "Web app"
 *      Execute as: Me · Who has access: Anyone → Deploy → allow access.
 *   4. Copy the Web app URL and paste it into twshop.in/admin with your PIN.
 * After changing this file later: Deploy → Manage deployments → ✏ Edit → Version: New version → Deploy.
 */

const ADMIN_PIN = "CHANGE-ME";       // your secret PIN: at least 6 letters/numbers
const PRODUCT_TAB_ID = 0;            // the Product tab (gid=0 in its link)
const PHOTO_FOLDER = "The Women Shop - website photos";
const ID_PREFIX = "TWS";             // new products get TWS004, TWS005…
const SETTINGS_TAB = "Settings";     // tab with "setting | value" rows (banners, top bar, shipping…)
// The customer reviews sheet ("Review The Women Shop") and its responses tab (gid in its link)
const REVIEWS_SHEET_ID = "1HKFfyF-iKtwHdCEFOf0pgAdcpkifh3uJfflbz8UjL0g";
const REVIEWS_TAB_ID = 1123841563;
// Orders live in their own private spreadsheet in your Google Drive (made by this script on the first order)
const ORDERS_FILE = "The Women Shop - Orders (private)";
const ORDER_COLUMNS = ["Order ID", "Date", "Status", "Name", "Phone", "City", "Address", "Pincode", "Items", "Item count",
  "Products total", "Shipping", "Discount", "Total", "Payment ref", "Courier", "Tracking", "Tracking link", "Notes",
  "Paid on", "Packed on", "Shipped on", "Delivered on", "Cancelled on", "Stock done", "Updated", "Items data"];

// Columns the admin fills in (missing ones are added at the end of the sheet)
const COLUMNS = ["id", "name", "category", "price", "mrp", "sizes", "sold_out_sizes", "colors", "color_code",
  "image1", "image2", "image3", "image4", "image5", "description", "fabric", "lining", "length",
  "sleeve_type", "dupatta", "bottom", "other_details", "in_stock", "made_to_order", "tag", "featured"];
// Filled only on a product's first row; its other colour rows leave them empty and inherit them
const DESIGN_FIELDS = ["name", "category", "mrp", "sizes", "description", "fabric", "lining", "length",
  "sleeve_type", "dupatta", "bottom", "other_details", "made_to_order", "tag", "featured"];

function doGet() {
  return reply({ ok: true, app: "The Women Shop admin" });
}

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return reply({ ok: false, error: "Bad request" }); }
  const refused = checkPin(req.pin);
  if (refused) return reply({ ok: false, error: refused });
  try {
    if (req.action === "ping") return reply({ ok: true });
    if (req.action === "upload") return reply({ ok: true, url: savePhoto(req) });
    const lock = LockService.getScriptLock(); // one change to the sheet at a time
    lock.waitLock(30000);
    try {
      if (req.action === "load") {
        return reply({ ok: true, products: readSheet(), reviews: tryRead(readReviews), settings: readSettings(), orders: tryRead(readOrders) });
      }
      if (req.action === "list") return reply(Object.assign({ ok: true }, readSheet()));
      if (req.action === "saveSettings") return reply(Object.assign({ ok: true }, saveSettings(req.values)));
      if (req.action === "review") return reply(Object.assign({ ok: true }, updateReview(req)));
      if (req.action === "save") return reply(Object.assign({ ok: true }, saveDesign(req.design)));
      if (req.action === "saveMany") return reply(Object.assign({ ok: true }, saveMany(req.designs)));
      if (req.action === "setOrder") return reply(Object.assign({ ok: true }, setOrder(req.ids)));
      if (req.action === "delete") return reply(Object.assign({ ok: true }, deleteDesign(req.id)));
      if (req.action === "saveOrder") return reply(Object.assign({ ok: true }, saveOrder(req)));
      if (req.action === "deleteOrder") return reply(Object.assign({ ok: true }, deleteOrder(req)));
      return reply({ ok: false, error: "Unknown action" });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return reply({ ok: false, error: String((err && err.message) || err) });
  }
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Wrong PINs are counted; after 10 in an hour the admin locks for an hour
function checkPin(pin) {
  if (!ADMIN_PIN || ADMIN_PIN === "CHANGE-ME" || String(ADMIN_PIN).length < 6) {
    return "Set your own PIN (6+ characters) at the top of the script, then deploy a new version.";
  }
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get("fails") || 0);
  if (fails >= 10) return "Too many wrong PINs. Please wait an hour and try again.";
  if (String(pin || "") !== String(ADMIN_PIN)) {
    cache.put("fails", String(fails + 1), 3600);
    return "Wrong PIN";
  }
  return "";
}

const keyOf = (h) => String(h || "").trim().toLowerCase().replace(/\s+/g, "_");
const isLink = (v) => /^https?:\/\//i.test(String(v || "").trim());

function productSheet() {
  const sheets = SpreadsheetApp.getActive().getSheets();
  return sheets.filter((s) => s.getSheetId() === PRODUCT_TAB_ID)[0] || sheets[0];
}

function readSheet() {
  const sh = productSheet();
  const rows = sh.getLastRow(), cols = sh.getLastColumn();
  const values = rows && cols ? sh.getRange(1, 1, rows, cols).getDisplayValues() : [[]];
  return { headers: values[0] || [], rows: values.slice(1).map((cells, i) => ({ row: i + 2, cells })) };
}

// Adds missing columns at the end; returns { map: {column name: column number}, width }
function ensureColumns(sh, keys) {
  const cols = sh.getLastColumn();
  const headers = cols ? sh.getRange(1, 1, 1, cols).getValues()[0] : [];
  const map = {};
  headers.forEach((h, i) => { const k = keyOf(h); if (k && !map[k]) map[k] = i + 1; });
  let width = headers.length;
  keys.forEach((k) => {
    if (map[k]) return;
    width++;
    sh.getRange(1, width, 1, 1).setValues([[k]]);
    map[k] = width;
  });
  return { map, width };
}

function nextId(values, idCol) {
  let max = 0;
  values.slice(1).forEach((r) => {
    const m = String(r[idCol - 1]).trim().match(new RegExp("^" + ID_PREFIX + "0*(\\d+)$", "i"));
    if (m) max = Math.max(max, Number(m[1]));
  });
  return ID_PREFIX + String(max + 1).padStart(3, "0");
}

/**
 * Saves one product: one sheet row per colour.
 * design = { id ("" for new), name, category, price, mrp, sizes[], description, fabric, lining, length,
 *            sleeve_type, dupatta, bottom, other_details, tag, featured, made_to_order, hidden,
 *            colours: [{ row (existing row number or null), color, color_code, images[], sold_out[], in_stock, price }] }
 */
function saveDesign(d) {
  if (!d || !String(d.name || "").trim()) throw new Error("Please enter the product name");
  if (!(Number(d.price) > 0)) throw new Error("Please enter the price");
  if (!d.colours || !d.colours.length) throw new Error("Add at least one colour");

  const sh = productSheet();
  const imageCount = Math.max(5, ...d.colours.map((c) => (c.images || []).length));
  const keys = COLUMNS.concat(Array.from({ length: imageCount }, (_, i) => "image" + (i + 1)))
    .filter((k, i, all) => all.indexOf(k) === i);
  const { map, width } = ensureColumns(sh, keys);
  const lastRow = Math.max(sh.getLastRow(), 1);
  const values = sh.getRange(1, 1, lastRow, width).getValues();
  const headers = values[0].map(keyOf);

  const id = String(d.id || "").trim() || nextId(values, map.id);
  const current = [];
  values.forEach((r, i) => { if (i && String(r[map.id - 1]).trim() === id) current.push(i + 1); });
  if (!d.id && current.length) throw new Error("Product code " + id + " is already used");
  d.colours.forEach((c) => {
    if (c.row && current.indexOf(c.row) < 0) {
      throw new Error("The sheet changed while you were editing. Please open the product again and redo your change.");
    }
  });

  // New colours go right after this product's last row (or at the end for a new product)
  const after = current.length ? Math.max.apply(null, current) : lastRow;
  const fresh = d.colours.filter((c) => !c.row);
  if (fresh.length) sh.insertRowsAfter(after, fresh.length);
  fresh.forEach((c, i) => { c.row = after + 1 + i; });

  const imageCols = headers.map((h, i) => (h.startsWith("image") ? i : -1)).filter((i) => i >= 0);
  const blankCols = headers.map((h, i) => (!h ? i : -1)).filter((i) => i >= 0);
  const list = (a) => (a || []).map((x) => String(x).trim()).filter(Boolean).join(", ");
  // the product's place in "Website order" stays on its first row, whichever colour is first
  const position = map.position ? current.map((r) => values[r - 1][map.position - 1]).filter((v) => String(v).trim() !== "")[0] || "" : "";

  d.colours.forEach((c, n) => {
    const first = n === 0;
    const old = c.row <= lastRow && current.indexOf(c.row) >= 0 ? values[c.row - 1].slice() : new Array(width).fill("");
    const row = old.concat(new Array(Math.max(0, width - old.length)).fill("")).slice(0, width);
    const set = (k, v) => { if (map[k]) row[map[k] - 1] = v === undefined || v === null ? "" : v; };

    // photos: clear every photo cell of this row (also links in columns without a heading), then fill in order
    imageCols.forEach((i) => { row[i] = ""; });
    blankCols.forEach((i) => { if (isLink(row[i])) row[i] = ""; });
    (c.images || []).forEach((url, i) => set("image" + (i + 1), url));

    set("id", id);
    set("colors", String(c.color || "").trim());
    set("color_code", c.color_code || "");
    set("sold_out_sizes", list(c.sold_out));
    set("in_stock", first && d.hidden ? "hide" : c.in_stock === false ? "no" : "yes");
    set("price", first ? Number(d.price) : Number(c.price) > 0 ? Number(c.price) : "");
    if (map.position) row[map.position - 1] = first ? position : "";
    if (first) {
      set("sizes", list(d.sizes));
      DESIGN_FIELDS.filter((k) => k !== "sizes").forEach((k) => {
        const v = d[k];
        set(k, typeof v === "boolean" ? (v ? "yes" : "no") : k === "mrp" ? (Number(v) > 0 ? Number(v) : "") : String(v || "").trim());
      });
    } else {
      DESIGN_FIELDS.forEach((k) => set(k, "")); // other colours inherit from the first row
    }
    sh.getRange(c.row, 1, 1, width).setValues([row]);
  });

  // Colours removed in the admin: delete their rows (bottom first, so row numbers stay right)
  const kept = d.colours.map((c) => c.row);
  current.filter((r) => kept.indexOf(r) < 0).sort((a, b) => b - a).forEach((r) => sh.deleteRow(r));
  return { id };
}

function deleteDesign(id) {
  id = String(id || "").trim();
  if (!id) throw new Error("No product code");
  const sh = productSheet();
  const { map } = ensureColumns(sh, ["id"]);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return { deleted: 0 };
  const ids = sh.getRange(2, map.id, lastRow - 1, 1).getValues();
  const rows = [];
  ids.forEach((r, i) => { if (String(r[0]).trim() === id) rows.push(i + 2); });
  rows.sort((a, b) => b - a).forEach((r) => sh.deleteRow(r));
  return { deleted: rows.length };
}

// Saves a photo (sent as base64 JPEG) in the photos folder, viewable by anyone with the link
function savePhoto(req) {
  if (!req.data) throw new Error("No photo received");
  const bytes = Utilities.base64Decode(req.data);
  if (bytes.length > 10 * 1024 * 1024) throw new Error("This photo is too large");
  const name = String(req.name || "photo").replace(/[^\w.-]+/g, "-").slice(0, 80) + ".jpg";
  const it = DriveApp.getFoldersByName(PHOTO_FOLDER);
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder(PHOTO_FOLDER);
  const file = folder.createFile(Utilities.newBlob(bytes, "image/jpeg", name));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return "https://drive.google.com/file/d/" + file.getId() + "/view";
}

/* ---------- Settings tab: "setting | value | what it does" ---------- */
function settingsSheet() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SETTINGS_TAB) || ss.getSheets().filter((x) => keyOf(x.getName()) === "settings")[0];
  if (sh) return sh;
  const made = ss.insertSheet(SETTINGS_TAB);
  made.getRange(1, 1, 1, 3).setValues([["Setting", "Value", "What it does"]]);
  return made;
}

function readSettings() {
  const sh = settingsSheet();
  const rows = sh.getLastRow();
  if (rows < 2) return { rows: [] };
  return { rows: sh.getRange(2, 1, rows - 1, 2).getDisplayValues().map((r, i) => ({ row: i + 2, label: r[0], value: r[1] })).filter((r) => r.label) };
}

// values: { "banner 1 image": "https://…", "announcement 3": "", "shipping 4 items": null, … }
// "" saves an empty value (e.g. a removed top bar message); null empties a setting only if it's already there
function saveSettings(values) {
  if (!values || typeof values !== "object") throw new Error("Nothing to save");
  const sh = settingsSheet();
  const last = Math.max(sh.getLastRow(), 1);
  const labels = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map((r) => keyOf(r[0])) : [];
  let added = 0;
  Object.keys(values).forEach((label) => {
    const skip = values[label] === null || values[label] === undefined;
    const value = skip ? "" : String(values[label]);
    const i = labels.indexOf(keyOf(label));
    if (i >= 0) {
      // plain text, so Sheets doesn't turn something like "10-12 days" into a date
      sh.getRange(i + 2, 2, 1, 1).setNumberFormat("@").setValues([[value]]);
    } else if (!skip) {
      sh.getRange(last + 1 + added, 1, 1, 2).setNumberFormat("@").setValues([[label, value]]);
      labels.push(keyOf(label));
      added++;
    }
  });
  return { saved: Object.keys(values).length };
}

/* ---------- Customer reviews (the form's responses sheet) ---------- */
function reviewsSheet() {
  const ss = SpreadsheetApp.openById(REVIEWS_SHEET_ID);
  const sheets = ss.getSheets();
  return sheets.filter((x) => x.getSheetId() === REVIEWS_TAB_ID)[0] || sheets[0];
}

function readReviews() {
  const sh = reviewsSheet();
  const rows = sh.getLastRow(), cols = sh.getLastColumn();
  const values = rows && cols ? sh.getRange(1, 1, rows, cols).getDisplayValues() : [[]];
  return { headers: values[0] || [], rows: values.slice(1).map((cells, i) => ({ row: i + 2, cells })) };
}

// A problem with the reviews sheet shouldn't stop the rest of the admin from loading
function tryRead(fn) {
  try { return fn(); } catch (err) { return { error: String((err && err.message) || err) }; }
}

/**
 * req = { row, stamp (the review's Timestamp, to be sure it's the same review),
 *         show: "yes" | "no" | "" (optional), photo: url or "" (optional), remove: true (optional) }
 */
function updateReview(req) {
  const sh = reviewsSheet();
  const { map, width } = ensureColumns(sh, ["show", "photo"]);
  const row = Number(req.row);
  if (!(row >= 2) || row > sh.getLastRow()) throw new Error("That review isn't there any more. Please reload.");
  const cells = sh.getRange(row, 1, 1, width).getDisplayValues()[0];
  const stampCol = map.timestamp || 1;
  if (String(cells[stampCol - 1]) !== String(req.stamp || "")) {
    throw new Error("The reviews changed while you were looking. Please reload and try again.");
  }
  if (req.remove) {
    sh.deleteRow(row);
    return { removed: true };
  }
  if (req.show !== undefined) sh.getRange(row, map.show, 1, 1).setValues([[req.show]]);
  if (req.photo !== undefined) sh.getRange(row, map.photo, 1, 1).setValues([[req.photo]]);
  return { updated: true };
}

/* ---------- Orders (a private spreadsheet: one row per order) ---------- */
// Finds the orders spreadsheet (or makes it when create is true). Returns { book, sh } or null.
function ordersSheet(create) {
  const props = PropertiesService.getScriptProperties();
  const saved = props.getProperty("ORDERS_SHEET_ID");
  let book = null;
  if (saved) {
    try { if (!DriveApp.getFileById(saved).isTrashed()) book = SpreadsheetApp.openById(saved); } catch (err) { book = null; }
  }
  if (!book) {
    const files = DriveApp.getFilesByName(ORDERS_FILE);
    while (!book && files.hasNext()) {
      const f = files.next();
      if (!f.isTrashed()) book = SpreadsheetApp.openById(f.getId());
    }
  }
  if (!book && create) {
    book = SpreadsheetApp.create(ORDERS_FILE);
    const first = book.getSheets()[0];
    first.setName("Orders");
    first.getRange(1, 1, 1, ORDER_COLUMNS.length).setValues([ORDER_COLUMNS]);
    first.setFrozenRows(1);
  }
  if (!book) return null;
  if (book.getId() !== saved) props.setProperty("ORDERS_SHEET_ID", book.getId());
  return { book, sh: book.getSheetByName("Orders") || book.getSheets()[0] };
}

function readOrders() {
  const o = ordersSheet(false);
  if (!o) return { headers: ORDER_COLUMNS, rows: [], url: "" };
  const rows = o.sh.getLastRow(), cols = o.sh.getLastColumn();
  const values = rows && cols ? o.sh.getRange(1, 1, rows, cols).getDisplayValues() : [[]];
  return { headers: values[0] || [], rows: values.slice(1).map((cells, i) => ({ row: i + 2, cells })), url: o.book.getUrl() };
}

// Finds an order's row by its Order ID. Returns { sh, map, width, row, cells }.
function findOrder(id, create) {
  const o = ordersSheet(create);
  if (!o) throw new Error("There are no orders yet.");
  const { map, width } = ensureColumns(o.sh, ORDER_COLUMNS.map(keyOf));
  const last = o.sh.getLastRow();
  const ids = last > 1 ? o.sh.getRange(2, map.order_id, last - 1, 1).getDisplayValues().map((r) => String(r[0]).trim().toUpperCase()) : [];
  const at = ids.indexOf(id);
  return { sh: o.sh, url: o.book.getUrl(), map, width, last, row: at >= 0 ? at + 2 : 0, cells: at >= 0 ? o.sh.getRange(at + 2, 1, 1, width).getDisplayValues()[0] : null };
}

// Stops two phones (or the sheet and a phone) from overwriting each other's changes
function checkUpdated(f, updated) {
  if (updated !== undefined && String(f.cells[f.map.updated - 1]) !== String(updated)) {
    throw new Error("This order was changed on another phone or in the sheet. Please reload and try again.");
  }
}

/**
 * req = { order: { order_id, status, name, phone, … }, isNew: true|false, updated: the "Updated" value it was loaded with }
 * The script fills in the "… on" dates when the status changes, and "Updated".
 */
function saveOrder(req) {
  const o = req.order || {};
  const id = String(o.order_id || "").trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,30}$/.test(id)) throw new Error("The Order ID can only have letters, numbers and -");
  const f = findOrder(id, true);
  let row = f.row;
  let values;
  if (req.isNew) {
    if (row) throw new Error("Order " + id + " is already saved. Find it in Orders.");
    row = f.last + 1;
    values = new Array(f.width).fill("");
  } else {
    if (!row) throw new Error("Order " + id + " isn't in the orders sheet any more. Please reload.");
    checkUpdated(f, req.updated);
    values = f.cells.slice();
  }
  const now = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd HH:mm:ss");
  const managed = ["order_id", "paid_on", "packed_on", "shipped_on", "delivered_on", "cancelled_on", "updated"];
  Object.keys(o).forEach((k) => {
    if (f.map[k] && managed.indexOf(k) < 0) values[f.map[k] - 1] = o[k] === null || o[k] === undefined ? "" : String(o[k]);
  });
  values[f.map.order_id - 1] = id;
  const stamp = { paid: "paid_on", packed: "packed_on", shipped: "shipped_on", delivered: "delivered_on", cancelled: "cancelled_on" }[keyOf(o.status)];
  if (stamp && !values[f.map[stamp] - 1]) values[f.map[stamp] - 1] = now.slice(0, 16);
  if (!values[f.map.date - 1]) values[f.map.date - 1] = now.slice(0, 16);
  values[f.map.updated - 1] = now;
  // plain text, so Sheets keeps phone numbers, pincodes and dates exactly as typed
  f.sh.getRange(row, 1, 1, f.width).setNumberFormat("@").setValues([values]);
  return { url: f.url, order: { headers: f.sh.getRange(1, 1, 1, f.width).getDisplayValues()[0], row, cells: values } };
}

function deleteOrder(req) {
  const id = String(req.id || "").trim().toUpperCase();
  const f = findOrder(id, false);
  if (!f.row) throw new Error("Order " + id + " isn't in the orders sheet any more. Please reload.");
  checkUpdated(f, req.updated);
  f.sh.deleteRow(f.row);
  return { deleted: id };
}

/* ---------- several products at once, and the website order ---------- */
// Quick stock and bulk changes. Bottom products first, so rows added or removed for one product
// never move the rows of the next one.
function saveMany(list) {
  if (!Array.isArray(list) || !list.length) throw new Error("Nothing to save");
  const lowest = (d) => Math.max.apply(null, [0].concat((d.colours || []).map((c) => Number(c.row) || 0)));
  return { ids: list.slice().sort((a, b) => lowest(b) - lowest(a)).map((d) => saveDesign(d).id) };
}

// ids = product codes in the order the shop shows them: writes 1, 2, 3… in the "position" column
// (on each product's first row); every other product's position is cleared
function setOrder(ids) {
  if (!Array.isArray(ids)) throw new Error("Nothing to save");
  const sh = productSheet();
  const { map } = ensureColumns(sh, ["id", "name", "position"]);
  const last = sh.getLastRow();
  if (last < 2) return { ordered: 0 };
  const rows = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
  const first = {};
  rows.forEach((r, i) => {
    const id = String(r[map.id - 1]).trim();
    if (!id) return;
    if (first[id] === undefined || (!String(rows[first[id]][map.name - 1]).trim() && String(r[map.name - 1]).trim())) first[id] = i;
  });
  const out = rows.map(() => [""]);
  ids.forEach((id, n) => {
    const i = first[String(id).trim()];
    if (i !== undefined) out[i] = [n + 1];
  });
  sh.getRange(2, map.position, last - 1, 1).setValues(out);
  return { ordered: ids.length };
}
