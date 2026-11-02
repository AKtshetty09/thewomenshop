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
      if (req.action === "list") return reply(Object.assign({ ok: true }, readSheet()));
      if (req.action === "save") return reply(Object.assign({ ok: true }, saveDesign(req.design)));
      if (req.action === "delete") return reply(Object.assign({ ok: true }, deleteDesign(req.id)));
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
