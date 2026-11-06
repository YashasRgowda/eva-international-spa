/* EVA Admin: change the website's photos and words without a developer. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "../js/firebase-config.js";
import { cloudinaryConfig } from "../js/cloudinary-config.js";
import { DEFAULTS, sized } from "../js/site-defaults.js";

// Must match the email in firestore.rules: only this account can save.
const ADMIN_EMAIL = "evaspa.db@gmail.com";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clone = (o) => JSON.parse(JSON.stringify(o));

// Photos stored as site paths (assets/...) sit one folder up from /admin/.
const preview = (url, w, h) => (/^https?:/.test(url || "") ? sized(url, w, h) : `../${url}`);

/* ---------- Icons (simple line icons, same weight as the website) ---------- */
const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON = {
  home: svg('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>'),
  brand: svg('<path d="M4 7V4h16v3"/><path d="M12 4v16"/><path d="M8.5 20h7"/>'),
  banner: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.6"/><path d="m21 16-5-5-9 9"/>'),
  rooms: svg('<path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16"/><path d="M2 21h20"/><circle cx="15" cy="12" r="0.9" fill="currentColor"/>'),
  why: svg('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>'),
  massage: svg('<path d="M12 3c2 2.6 2.4 6.2 0 9.6C9.6 9.2 10 5.6 12 3Z"/><path d="M12 12.6c2.4-2 5-3.2 8-3.6-.4 3.6-3.6 6-8 6.6"/><path d="M12 12.6c-2.4-2-5-3.2-8-3.6.4 3.6 3.6 6 8 6.6"/><path d="M7 19.5c3.2 1 6.8 1 10 0"/>'),
  reviews: svg('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/>'),
  contact: svg('<path d="M12 21s-7-5.4-7-11a7 7 0 0 1 14 0c0 5.6-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/>'),
  site: svg('<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>'),
  logout: svg('<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 16l-4-4 4-4"/><path d="M6 12h10"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  edit: svg('<path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>'),
  trash: svg('<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>'),
  eye: svg('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'),
  eyeOff: svg('<path d="M3 3l18 18"/><path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.6C3.7 8.5 2 12 2 12s3.6 7 10 7a9.9 9.9 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
  up: svg('<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>'),
  down: svg('<path d="M12 5v14"/><path d="m6 13 6 6 6-6"/>'),
  camera: svg('<path d="M4 8h3l2-3h6l2 3h3v11H4Z"/><circle cx="12" cy="13" r="3.5"/>'),
  check: svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  alert: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><circle cx="12" cy="16.3" r="0.8" fill="currentColor"/>'),
};

/* ---------- Pages, in the same order as the website ---------- */
const PAGES = [
  { id: "home", label: "Home", icon: "home" },
  { group: "Your website" },
  { id: "brand", label: "Spa Name", icon: "brand", text: "Change the spa name shown at the top and bottom." },
  { id: "banner", label: "Top Banner", icon: "banner", text: "Change the big first photo and its words." },
  { id: "rooms", label: "Room Photos", icon: "rooms", text: "Change the 4 room photos." },
  { id: "why", label: "Why EVA Photos", icon: "why", text: "Change the 3 photos: Private, Therapists, Couples." },
  { id: "massages", label: "Massages", icon: "massage", text: "Add, change, hide or delete massages." },
  { id: "reviews", label: "Reviews", icon: "reviews", text: "Add, change or delete guest reviews." },
  { id: "contact", label: "Contact Details", icon: "contact", text: "Change phone, WhatsApp, address, timings and map." },
];

const ROOM_NAMES = ["Signature Massage Room", "Private Shower", "Relaxing Bath", "Changing Lounge"];
const WHY_PARTS = [
  { key: "private", name: "100% Private", hint: "Shown next to “Private Rooms, Just for You”" },
  { key: "therapists", name: "Expert Therapists", hint: "Shown next to “Massages from Across Asia”" },
  { key: "couples", name: "For Couples", hint: "Shown next to “Relax Together”" },
];
const DURATIONS = ["30 min", "45 min", "60 min", "75 min", "90 min", "120 min"];

let state = clone(DEFAULTS);
let currentPage = "home";

/* ==========================================================================
   Small helpers: toast, pop-up, save bar
   ========================================================================== */
let toastTimer = null;
function toast(message, isError = false) {
  const el = $("#toast");
  el.innerHTML = `${isError ? ICON.alert : ICON.check}<span>${esc(message)}</span>`;
  el.classList.toggle("is-error", isError);
  el.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-visible"), isError ? 5000 : 2600);
}

function friendlyError(err) {
  const code = (err && err.code) || "";
  if (code.includes("permission-denied")) return "You are not allowed to save this. Please log out and log in again.";
  if (code.includes("unavailable") || !navigator.onLine) return "No internet connection. Please try again.";
  return "Something went wrong. Please try again.";
}

const modal = $("#modal");
const modalPanel = $("#modalPanel");
function openModal(html) {
  modalPanel.innerHTML = html;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("is-locked");
  return modalPanel;
}
function closeModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("is-locked");
}
$$("[data-close-modal]", modal).forEach((el) => el.addEventListener("click", closeModal));
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal(); });

function confirmBox({ title, text, yes = "Yes", no = "No, go back", danger = false }) {
  return new Promise((resolve) => {
    const panel = openModal(`
      <h2 class="modal__title">${esc(title)}</h2>
      <p class="modal__text">${esc(text)}</p>
      <div class="modal__actions">
        <button class="btn btn--light btn--lg" type="button" data-no>${esc(no)}</button>
        <button class="btn ${danger ? "btn--danger" : "btn--primary"} btn--lg" type="button" data-yes>${esc(yes)}</button>
      </div>`);
    const done = (v) => { closeModal(); resolve(v); };
    $("[data-yes]", panel).addEventListener("click", () => done(true));
    $("[data-no]", panel).addEventListener("click", () => done(false));
  });
}

// Pages with typing get one Save button at the bottom.
const savebar = $("#savebar");
const saveBtn = $("#saveBtn");
let dirty = false;
let onSave = null;
function useSaveBar(handler) {
  onSave = handler;
  setDirty(false);
  savebar.classList.add("is-visible");
}
function hideSaveBar() {
  onSave = null;
  dirty = false;
  savebar.classList.remove("is-visible", "is-dirty");
}
function setDirty(value) {
  dirty = value;
  savebar.classList.toggle("is-dirty", value);
  $("#savebarMsg").textContent = value ? "You have changes that are not saved yet." : "Everything is saved.";
  saveBtn.disabled = !value;
}
saveBtn.addEventListener("click", async () => {
  if (!onSave) return;
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";
  const ok = await onSave();
  saveBtn.textContent = "Save changes";
  if (ok) setDirty(false);
  else saveBtn.disabled = false;
});
window.addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

async function saveDoc(key, data) {
  try {
    await setDoc(doc(db, "site", key), data);
    state[key] = clone(data);
    return true;
  } catch (err) {
    console.error(err);
    toast(friendlyError(err), true);
    return false;
  }
}

/* ==========================================================================
   Photos: pick, shrink, upload to Cloudinary
   ========================================================================== */
const filePicker = $("#filePicker");
let pickResolve = null;
filePicker.addEventListener("change", () => {
  const file = filePicker.files[0] || null;
  filePicker.value = "";
  if (pickResolve) pickResolve(file);
  pickResolve = null;
});
function choosePhoto() {
  return new Promise((resolve) => { pickResolve = resolve; filePicker.click(); });
}

// Big phone photos are made smaller first, so uploads are quick and the site stays fast.
async function shrink(file, maxSide) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise((r) => canvas.toBlob((b) => r(b || file), "image/jpeg", 0.88));
  } catch (e) {
    return file; // the browser could not read it; let Cloudinary handle the original
  }
}

function uploadToCloudinary(blob, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", blob, "photo.jpg");
    form.append("upload_preset", cloudinaryConfig.uploadPreset);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`);
    xhr.upload.addEventListener("progress", (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); });
    xhr.addEventListener("load", () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status === 200 && res.secure_url) resolve(res.secure_url);
        else reject(new Error((res.error && res.error.message) || `Upload failed (${xhr.status})`));
      } catch (e) { reject(e); }
    });
    xhr.addEventListener("error", () => reject(new Error("network")));
    xhr.send(form);
  });
}

// Shows progress on top of a photo while it uploads. Returns the new photo link, or null.
async function changePhoto(box, maxSide = 2000) {
  const file = await choosePhoto();
  if (!file) return null;
  if (!file.type.startsWith("image/")) { toast("Please choose a photo.", true); return null; }
  if (file.size > 30 * 1024 * 1024) { toast("This photo is too big. Please choose a smaller one.", true); return null; }

  const overlay = document.createElement("div");
  overlay.className = "uploading";
  overlay.innerHTML = `<span>Uploading… <b>0%</b></span><span class="uploading__bar"><i></i></span>`;
  box.appendChild(overlay);
  const pct = $("b", overlay);
  const bar = $("i", overlay);
  try {
    const blob = await shrink(file, maxSide);
    const url = await uploadToCloudinary(blob, (p) => {
      pct.textContent = `${Math.round(p * 100)}%`;
      bar.style.width = `${p * 100}%`;
    });
    return url;
  } catch (err) {
    console.error(err);
    toast(navigator.onLine ? "The photo could not be uploaded. Please try again." : "No internet connection. Please try again.", true);
    return null;
  } finally {
    overlay.remove();
  }
}

/* ==========================================================================
   Pages
   ========================================================================== */
const page = $("#page");

const head = (eyebrow, title, text, extra = "") => `
  <div class="page-head">
    <p class="eyebrow">${esc(eyebrow)}</p>
    <h1>${esc(title)}</h1>
    <p>${esc(text)}</p>
    ${extra}
  </div>`;

// Marks the page as changed whenever the owner types.
const watch = (form) => form.addEventListener("input", () => setDirty(true));

function fieldError(form, name, message) {
  const field = form.elements[name].closest(".field");
  field.classList.add("has-error");
  if (!$(".field__error", field)) field.insertAdjacentHTML("beforeend", `<span class="field__error">${esc(message)}</span>`);
}
function clearErrors(form) {
  $$(".has-error", form).forEach((f) => f.classList.remove("has-error"));
  $$(".field__error", form).forEach((e) => e.remove());
}

/* ---------- Home ---------- */
function renderHome() {
  hideSaveBar();
  page.innerHTML = head("Welcome", "What would you like to change today?",
    "Pick a part of your website below. Your changes show on the website as soon as you save.") + `
    <div class="tiles">
      ${PAGES.filter((p) => p.text).map((p) => `
        <button class="tile" type="button" data-go="${p.id}">
          <span class="tile__icon">${ICON[p.icon]}</span>
          <span><span class="tile__name" style="display:block">${esc(p.label)}</span><span class="tile__text">${esc(p.text)}</span></span>
        </button>`).join("")}
    </div>`;
  $$("[data-go]", page).forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
}

/* ---------- Spa name ---------- */
function renderBrand() {
  const b = state.brand;
  page.innerHTML = head("Spa Name", "Your spa name", "This name is shown at the top of the website, on the big banner and at the bottom.") + `
    <div class="card">
      <div class="brand-preview" aria-hidden="true">
        <svg><use href="#lotus"/></svg>
        <p class="brand-preview__word" id="pvName">${esc(b.name)}</p>
        <p class="brand-preview__sub" id="pvSub">${esc(b.subtitle)}</p>
      </div>
      <form id="form" novalidate>
        <label class="field">
          <span class="field__label">Spa name</span>
          <span class="field__hint">Keep it short. Example: EVA</span>
          <input name="name" value="${esc(b.name)}" maxlength="20" required>
        </label>
        <label class="field">
          <span class="field__label">Small line under the name</span>
          <span class="field__hint">Example: International Spa</span>
          <input name="subtitle" value="${esc(b.subtitle)}" maxlength="40">
        </label>
      </form>
    </div>`;
  const form = $("#form");
  watch(form);
  form.addEventListener("input", () => {
    $("#pvName").textContent = form.elements.name.value;
    $("#pvSub").textContent = form.elements.subtitle.value;
  });
  useSaveBar(async () => {
    clearErrors(form);
    const name = form.elements.name.value.trim();
    if (!name) { fieldError(form, "name", "Please type the spa name."); return false; }
    const ok = await saveDoc("brand", { name, subtitle: form.elements.subtitle.value.trim() });
    if (ok) toast("Spa name saved");
    return ok;
  });
}

/* ---------- Top banner ---------- */
function renderBanner() {
  const h = state.hero;
  page.innerHTML = head("Top Banner", "The big first photo", "This is the first thing people see when they open your website.") + `
    <div class="card">
      <h2 class="card__title">Photo</h2>
      <p class="card__sub">Best: a wide (sideways) photo of your spa. It is saved as soon as you choose it.</p>
      <div class="photo-card photo-card--wide">
        <div class="photo-card__img" id="heroBox"><img id="heroImg" src="${esc(preview(h.image, 1200))}" alt="Top banner photo"></div>
        <div class="photo-card__body">
          <span class="photo-card__hint">Current photo</span>
          <button class="btn btn--light" type="button" id="heroPhotoBtn">${ICON.camera} Change photo</button>
        </div>
      </div>
    </div>
    <div class="card">
      <h2 class="card__title">Words on the photo</h2>
      <p class="card__sub">Then press “Save changes” at the bottom.</p>
      <form id="form" novalidate>
        <label class="field">
          <span class="field__label">Big headline</span>
          <span class="field__hint">Example: Relax. Unwind. Feel New. The last sentence is shown in gold.</span>
          <input name="title" value="${esc(h.title)}" maxlength="60" required>
        </label>
        <label class="field">
          <span class="field__label">Short line under the headline</span>
          <textarea name="lead" maxlength="140" rows="3">${esc(h.lead)}</textarea>
        </label>
      </form>
    </div>`;

  $("#heroPhotoBtn").addEventListener("click", async () => {
    const url = await changePhoto($("#heroBox"), 2600);
    if (!url) return;
    const ok = await saveDoc("hero", { ...state.hero, image: url });
    if (ok) { $("#heroImg").src = preview(url, 1200); toast("Photo changed on your website"); }
  });

  const form = $("#form");
  watch(form);
  useSaveBar(async () => {
    clearErrors(form);
    // form.elements: a plain form.title would read the form's own tooltip, not the input.
    const title = form.elements.title.value.trim();
    if (!title) { fieldError(form, "title", "Please type a headline."); return false; }
    const ok = await saveDoc("hero", { ...state.hero, title, lead: form.elements.lead.value.trim() });
    if (ok) toast("Banner words saved");
    return ok;
  });
}

/* ---------- Photo grids (rooms, why EVA): photos save as soon as they are chosen ---------- */
function photoGrid(cards) {
  return `<div class="photos">${cards.map((c, i) => `
    <div class="photo-card">
      <div class="photo-card__img" data-box="${i}"><img src="${esc(preview(c.url, 700, 525))}" alt="${esc(c.name)}"></div>
      <div class="photo-card__body">
        <span>
          <span class="photo-card__name" style="display:block">${esc(c.name)}</span>
          ${c.hint ? `<span class="photo-card__hint">${esc(c.hint)}</span>` : ""}
        </span>
        <button class="btn btn--light" type="button" data-change="${i}">${ICON.camera} Change</button>
      </div>
    </div>`).join("")}</div>`;
}

function renderRooms() {
  hideSaveBar();
  const photos = state.rooms.photos;
  page.innerHTML = head("Room Photos", "Photos of your rooms",
    "These 4 photos are shown in the “Take a look inside” part of your website. Tap “Change” to pick a new photo. It is saved straight away.")
    + photoGrid(ROOM_NAMES.map((name, i) => ({ name, url: photos[i] })));

  $$("[data-change]", page).forEach((btn) => btn.addEventListener("click", async () => {
    const i = Number(btn.dataset.change);
    const box = $(`[data-box="${i}"]`, page);
    const url = await changePhoto(box, 2000);
    if (!url) return;
    const next = [...state.rooms.photos];
    next[i] = url;
    if (await saveDoc("rooms", { photos: next })) {
      $("img", box).src = preview(url, 700, 525);
      toast(`${ROOM_NAMES[i]} photo changed`);
    }
  }));
}

function renderWhy() {
  hideSaveBar();
  page.innerHTML = head("Why EVA Photos", "The 3 story photos",
    "These photos sit next to the 3 stories on your website. Tap “Change” to pick a new photo. It is saved straight away.")
    + photoGrid(WHY_PARTS.map((p) => ({ name: p.name, hint: p.hint, url: state.why[p.key] })));

  $$("[data-change]", page).forEach((btn) => btn.addEventListener("click", async () => {
    const part = WHY_PARTS[Number(btn.dataset.change)];
    const box = $(`[data-box="${btn.dataset.change}"]`, page);
    const url = await changePhoto(box, 1800);
    if (!url) return;
    if (await saveDoc("why", { ...state.why, [part.key]: url })) {
      $("img", box).src = preview(url, 700, 525);
      toast(`${part.name} photo changed`);
    }
  }));
}

/* ---------- Massages ---------- */
function renderMassages() {
  hideSaveBar();
  const items = state.services.items;
  page.innerHTML = head("Massages", "Your massages",
    "These are shown in “Massages & Treatments”. Use the buttons to change, hide or delete a massage. Changes are saved straight away.",
    `<button class="btn btn--primary btn--lg" type="button" id="addMassage">${ICON.plus} Add new massage</button>`) + `
    <div class="list">
      ${items.length ? items.map((it, i) => `
        <div class="item${it.hidden ? " is-hidden" : ""}">
          <img class="item__thumb" src="${esc(preview(it.image, 200, 250))}" alt="">
          <div>
            <div class="item__top">
              <h3 class="item__name">${esc(it.name)}</h3>
              ${it.hidden ? '<span class="pill pill--hidden">Hidden from website</span>' : ""}
            </div>
            <p class="item__meta">${esc(it.duration)}${it.bestFor ? ` · Best for: ${esc(it.bestFor)}` : ""}</p>
            <div class="item__actions">
              <button class="act" type="button" data-act="edit" data-i="${i}">${ICON.edit} Change</button>
              <button class="act" type="button" data-act="toggle" data-i="${i}">${it.hidden ? `${ICON.eye} Show` : `${ICON.eyeOff} Hide`}</button>
              <button class="act" type="button" data-act="up" data-i="${i}" ${i === 0 ? "disabled" : ""} aria-label="Move up">${ICON.up} Up</button>
              <button class="act" type="button" data-act="down" data-i="${i}" ${i === items.length - 1 ? "disabled" : ""} aria-label="Move down">${ICON.down} Down</button>
              <button class="act act--danger" type="button" data-act="delete" data-i="${i}">${ICON.trash} Delete</button>
            </div>
          </div>
        </div>`).join("") : '<p class="empty">No massages yet. Tap “Add new massage”.</p>'}
    </div>`;

  $("#addMassage").addEventListener("click", () => massageForm(null));
  $$("[data-act]", page).forEach((btn) => btn.addEventListener("click", () => massageAction(btn.dataset.act, Number(btn.dataset.i))));
}

async function saveMassages(items, message) {
  const ok = await saveDoc("services", { items });
  if (ok) { toast(message); renderMassages(); }
  return ok;
}

async function massageAction(act, i) {
  const items = clone(state.services.items);
  const it = items[i];
  if (act === "edit") return massageForm(i);
  if (act === "toggle") {
    it.hidden = !it.hidden;
    return saveMassages(items, it.hidden ? `${it.name} is now hidden` : `${it.name} is now on the website`);
  }
  if (act === "up" || act === "down") {
    const j = act === "up" ? i - 1 : i + 1;
    [items[i], items[j]] = [items[j], items[i]];
    return saveMassages(items, "Order changed");
  }
  if (act === "delete") {
    const yes = await confirmBox({ title: `Delete “${it.name}”?`, text: "It will be removed from your website. You cannot undo this. Tip: use “Hide” instead if you only want to remove it for a while.", yes: "Yes, delete", danger: true });
    if (!yes) return;
    items.splice(i, 1);
    return saveMassages(items, "Massage deleted");
  }
}

function massageForm(index) {
  const isNew = index === null;
  const it = isNew ? { name: "", bestFor: "", description: "", duration: "60 min", image: "", hidden: false } : clone(state.services.items[index]);
  const durations = DURATIONS.includes(it.duration) || !it.duration ? DURATIONS : [it.duration, ...DURATIONS];
  const panel = openModal(`
    <h2 class="modal__title">${isNew ? "Add a massage" : "Change massage"}</h2>
    <p class="modal__text">Fill in the boxes, then press “Save massage”.</p>
    <form id="mForm" novalidate>
      <div class="modal__photo">
        <div class="modal__photo-img" id="mBox">${it.image ? `<img src="${esc(preview(it.image, 220, 275))}" alt="">` : ""}</div>
        <div>
          <p class="field__label" style="margin-bottom:6px">Photo</p>
          <button class="btn btn--light" type="button" id="mPhoto">${ICON.camera} ${it.image ? "Change photo" : "Add photo"}</button>
          <p class="field__error" id="mPhotoErr" hidden>Please add a photo.</p>
        </div>
      </div>
      <label class="field">
        <span class="field__label">Massage name</span>
        <input name="name" value="${esc(it.name)}" maxlength="40" placeholder="Example: Deep Tissue Massage" required>
      </label>
      <label class="field">
        <span class="field__label">Best for</span>
        <span class="field__hint">Who is it good for? Example: back pain, stiff neck and shoulders</span>
        <input name="bestFor" value="${esc(it.bestFor)}" maxlength="60">
      </label>
      <label class="field">
        <span class="field__label">Short description</span>
        <textarea name="description" maxlength="140" rows="3" placeholder="One or two short lines">${esc(it.description)}</textarea>
      </label>
      <label class="field">
        <span class="field__label">Time</span>
        <select name="duration">${durations.map((d) => `<option${d === it.duration ? " selected" : ""}>${esc(d)}</option>`).join("")}</select>
      </label>
      <div class="modal__actions">
        <button class="btn btn--light btn--lg" type="button" data-cancel>Cancel</button>
        <button class="btn btn--primary btn--lg" type="submit">Save massage</button>
      </div>
    </form>`);

  const form = $("#mForm", panel);
  $("[data-cancel]", panel).addEventListener("click", closeModal);
  $("#mPhoto", panel).addEventListener("click", async () => {
    const url = await changePhoto($("#mBox", panel), 1400);
    if (!url) return;
    it.image = url;
    $("#mBox", panel).innerHTML = `<img src="${esc(preview(url, 220, 275))}" alt="">`;
    $("#mPhoto", panel).innerHTML = `${ICON.camera} Change photo`;
    $("#mPhotoErr", panel).hidden = true;
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors(form);
    const name = form.elements.name.value.trim();
    let bad = false;
    if (!name) { fieldError(form, "name", "Please type the massage name."); bad = true; }
    if (!it.image) { $("#mPhotoErr", panel).hidden = false; bad = true; }
    if (bad) return;

    const f = form.elements;
    const saved = { ...it, name, bestFor: f.bestFor.value.trim(), description: f.description.value.trim(), duration: f.duration.value };
    const items = clone(state.services.items);
    if (isNew) items.push(saved); else items[index] = saved;
    const btn = $('button[type="submit"]', form);
    btn.disabled = true;
    btn.textContent = "Saving…";
    const ok = await saveMassages(items, isNew ? `${name} added to your website` : `${name} saved`);
    if (ok) closeModal();
    else { btn.disabled = false; btn.textContent = "Save massage"; }
  });
}

/* ---------- Reviews ---------- */
function renderReviews() {
  hideSaveBar();
  const items = state.reviews.items;
  page.innerHTML = head("Reviews", "Guest reviews",
    "These are shown in “What Our Guests Say”. Changes are saved straight away.",
    `<button class="btn btn--primary btn--lg" type="button" id="addReview">${ICON.plus} Add new review</button>`) + `
    <div class="list">
      ${items.length ? items.map((it, i) => `
        <div class="item review-item">
          <div>
            <p class="item__text">“${esc(it.text)}”</p>
            <p class="item__meta">${esc(it.name)}${it.massage ? ` · ${esc(it.massage)}` : ""}</p>
            <div class="item__actions">
              <button class="act" type="button" data-act="edit" data-i="${i}">${ICON.edit} Change</button>
              <button class="act act--danger" type="button" data-act="delete" data-i="${i}">${ICON.trash} Delete</button>
            </div>
          </div>
        </div>`).join("") : '<p class="empty">No reviews yet. Tap “Add new review”.</p>'}
    </div>`;

  $("#addReview").addEventListener("click", () => reviewForm(null));
  $$("[data-act]", page).forEach((btn) => btn.addEventListener("click", async () => {
    const i = Number(btn.dataset.i);
    if (btn.dataset.act === "edit") return reviewForm(i);
    const r = state.reviews.items[i];
    const yes = await confirmBox({ title: `Delete ${r.name}’s review?`, text: "It will be removed from your website. You cannot undo this.", yes: "Yes, delete", danger: true });
    if (!yes) return;
    const items = clone(state.reviews.items);
    items.splice(i, 1);
    if (await saveDoc("reviews", { items })) { toast("Review deleted"); renderReviews(); }
  }));
}

function reviewForm(index) {
  const isNew = index === null;
  const r = isNew ? { name: "", text: "", massage: "" } : clone(state.reviews.items[index]);
  const names = state.services.items.map((s) => s.name);
  const options = ["", ...names, ...(r.massage && !names.includes(r.massage) ? [r.massage] : [])];
  const panel = openModal(`
    <h2 class="modal__title">${isNew ? "Add a review" : "Change review"}</h2>
    <p class="modal__text">Copy the guest’s words, then press “Save review”.</p>
    <form id="rForm" novalidate>
      <label class="field">
        <span class="field__label">Guest name</span>
        <span class="field__hint">Example: Priya M. (first name and first letter is enough)</span>
        <input name="name" value="${esc(r.name)}" maxlength="30" required>
      </label>
      <label class="field">
        <span class="field__label">Which massage did they take?</span>
        <select name="massage">${options.map((m) => `<option value="${esc(m)}"${m === r.massage ? " selected" : ""}>${m ? esc(m) : "Don’t show"}</option>`).join("")}</select>
      </label>
      <label class="field">
        <span class="field__label">Review</span>
        <textarea name="text" maxlength="220" rows="4" required>${esc(r.text)}</textarea>
      </label>
      <div class="modal__actions">
        <button class="btn btn--light btn--lg" type="button" data-cancel>Cancel</button>
        <button class="btn btn--primary btn--lg" type="submit">Save review</button>
      </div>
    </form>`);

  const form = $("#rForm", panel);
  $("[data-cancel]", panel).addEventListener("click", closeModal);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors(form);
    const name = form.elements.name.value.trim();
    const text = form.elements.text.value.trim().replace(/^[“"]|[”"]$/g, "");
    let bad = false;
    if (!name) { fieldError(form, "name", "Please type the guest’s name."); bad = true; }
    if (!text) { fieldError(form, "text", "Please type the review."); bad = true; }
    if (bad) return;

    const items = clone(state.reviews.items);
    const saved = { name, text, massage: form.elements.massage.value };
    if (isNew) items.push(saved); else items[index] = saved;
    const btn = $('button[type="submit"]', form);
    btn.disabled = true;
    btn.textContent = "Saving…";
    if (await saveDoc("reviews", { items })) {
      closeModal();
      toast(isNew ? "Review added to your website" : "Review saved");
      renderReviews();
    } else { btn.disabled = false; btn.textContent = "Save review"; }
  });
}

/* ---------- Contact ---------- */
function renderContact() {
  const c = state.contact;
  page.innerHTML = head("Contact Details", "How customers reach you",
    "These details are shown in many places on your website. Change them here once and they change everywhere.") + `
    <div class="card">
      <h2 class="card__title">Phone and email</h2>
      <p class="card__sub">Then press “Save changes” at the bottom.</p>
      <form id="form" novalidate>
        <label class="field">
          <span class="field__label">Phone number</span>
          <span class="field__hint">Customers call this number. Example: +91 88846 66184</span>
          <input name="phone" type="tel" value="${esc(c.phone)}" maxlength="20" required>
        </label>
        <label class="field">
          <span class="field__label">WhatsApp number</span>
          <span class="field__hint">Booking messages from the website come to this WhatsApp.</span>
          <input name="whatsapp" type="tel" value="${esc(c.whatsapp)}" maxlength="20" required>
        </label>
        <label class="field">
          <span class="field__label">Email</span>
          <input name="email" type="email" value="${esc(c.email)}" maxlength="80">
        </label>
        <label class="field">
          <span class="field__label">Opening hours</span>
          <span class="field__hint">Example: 9 AM — 10 PM</span>
          <input name="hours" value="${esc(c.hours)}" maxlength="30" required>
        </label>
        <label class="field">
          <span class="field__label">Full address</span>
          <textarea name="address" rows="3" maxlength="200" required>${esc(c.address)}</textarea>
        </label>
        <label class="field">
          <span class="field__label">Google Maps link</span>
          <span class="field__hint">Used by the “Get directions” buttons.</span>
          <input name="mapsUrl" type="url" value="${esc(c.mapsUrl)}" required>
        </label>
        <div class="help">
          <b>How to get this link</b>
          <ol>
            <li>Open the Google Maps app.</li>
            <li>Search for your spa and open it.</li>
            <li>Tap <b>Share</b>, then <b>Copy link</b>.</li>
            <li>Paste it in the box above.</li>
          </ol>
        </div>
        <p style="margin-top:14px"><a class="link-btn" id="testMap" href="${esc(c.mapsUrl)}" target="_blank" rel="noopener">Open this link to check it</a></p>
      </form>
    </div>
    <div class="card">
      <h2 class="card__title">Photo next to “How to Find Us”</h2>
      <p class="card__sub">It is saved as soon as you choose it.</p>
      <div class="photo-card" style="max-width:420px">
        <div class="photo-card__img" id="cBox"><img id="cImg" src="${esc(preview(c.image, 700, 525))}" alt="Contact photo"></div>
        <div class="photo-card__body">
          <span class="photo-card__hint">Current photo</span>
          <button class="btn btn--light" type="button" id="cPhoto">${ICON.camera} Change photo</button>
        </div>
      </div>
    </div>`;

  const form = $("#form");
  watch(form);
  form.elements.mapsUrl.addEventListener("input", () => { $("#testMap").href = form.elements.mapsUrl.value.trim(); });

  $("#cPhoto").addEventListener("click", async () => {
    const url = await changePhoto($("#cBox"), 1600);
    if (!url) return;
    if (await saveDoc("contact", { ...state.contact, image: url })) {
      $("#cImg").src = preview(url, 700, 525);
      toast("Photo changed on your website");
    }
  });

  useSaveBar(async () => {
    clearErrors(form);
    const v = (n) => form.elements[n].value.trim();
    const digits = (n) => v(n).replace(/\D/g, "").length;
    let bad = false;
    if (digits("phone") < 10) { fieldError(form, "phone", "Please type a full phone number (10 digits)."); bad = true; }
    if (digits("whatsapp") < 10) { fieldError(form, "whatsapp", "Please type a full WhatsApp number (10 digits)."); bad = true; }
    if (v("email") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v("email"))) { fieldError(form, "email", "This email does not look right."); bad = true; }
    if (!v("hours")) { fieldError(form, "hours", "Please type your opening hours."); bad = true; }
    if (!v("address")) { fieldError(form, "address", "Please type your address."); bad = true; }
    if (!/^https?:\/\//.test(v("mapsUrl"))) { fieldError(form, "mapsUrl", "Please paste the full link from Google Maps."); bad = true; }
    if (bad) { toast("Please fix the boxes marked in red.", true); return false; }

    const ok = await saveDoc("contact", {
      ...state.contact,
      phone: v("phone"), whatsapp: v("whatsapp"), email: v("email"),
      hours: v("hours"), address: v("address").replace(/\s*\n\s*/g, ", "), mapsUrl: v("mapsUrl"),
    });
    if (ok) toast("Contact details saved");
    return ok;
  });
}

const RENDER = { home: renderHome, brand: renderBrand, banner: renderBanner, rooms: renderRooms, why: renderWhy, massages: renderMassages, reviews: renderReviews, contact: renderContact };

/* ==========================================================================
   Navigation
   ========================================================================== */
const side = $("#side");
function buildNav() {
  $("#sideNav").innerHTML = PAGES.map((p) => p.group
    ? `<p class="side__group">${esc(p.group)}</p>`
    : `<button class="nav-item" type="button" data-page="${p.id}">${ICON[p.icon]}<span>${esc(p.label)}</span></button>`).join("");
  $$("[data-page]", side).forEach((b) => b.addEventListener("click", () => go(b.dataset.page)));
  $("#viewSite").innerHTML = `${ICON.site}<span>View website</span>`;
  $("#logoutBtn").innerHTML = `${ICON.logout}<span>Log out</span>`;
}

async function go(id, { push = true } = {}) {
  if (!RENDER[id]) id = "home";
  if (dirty && id !== currentPage) {
    const leave = await confirmBox({ title: "Leave without saving?", text: "You changed some words on this page but did not press “Save changes”.", yes: "Leave without saving", no: "Stay here" });
    if (!leave) { if (!push) history.replaceState(null, "", `#${currentPage}`); return; }
  }
  currentPage = id;
  if (push && location.hash !== `#${id}`) history.pushState(null, "", `#${id}`);
  $$("[data-page]", side).forEach((b) => b.classList.toggle("is-active", b.dataset.page === id));
  $("#topTitle").textContent = (PAGES.find((p) => p.id === id) || PAGES[0]).label;
  closeSide();
  RENDER[id]();
  window.scrollTo(0, 0);
}
window.addEventListener("popstate", () => go(location.hash.slice(1) || "home", { push: false }));

const openSide = () => side.classList.add("is-open");
const closeSide = () => side.classList.remove("is-open");
$("#menuBtn").addEventListener("click", openSide);
$("#sideBackdrop").addEventListener("click", closeSide);

$("#logoutBtn").addEventListener("click", async () => {
  if (dirty) {
    const leave = await confirmBox({ title: "Log out without saving?", text: "You have changes that are not saved yet.", yes: "Log out", no: "Stay here" });
    if (!leave) return;
  }
  dirty = false;
  await signOut(auth);
});

/* ==========================================================================
   Login
   ========================================================================== */
const loginForm = $("#loginForm");
const loginMsg = $("#loginMsg");
const showMsg = (text, ok = false) => { loginMsg.textContent = text; loginMsg.classList.toggle("is-ok", ok); };

$("#showPw").addEventListener("click", () => {
  const pw = loginForm.password;
  pw.type = pw.type === "password" ? "text" : "password";
  $("#showPw").textContent = pw.type === "password" ? "Show" : "Hide";
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = loginForm.email.value.trim();
  const password = loginForm.password.value;
  if (!email || !password) return showMsg("Please type your email and password.");
  const btn = $("#loginBtn");
  btn.disabled = true;
  btn.textContent = "Logging in…";
  showMsg("");
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    const code = err.code || "";
    if (code.includes("too-many-requests")) showMsg("Too many tries. Please wait a few minutes and try again.");
    else if (code.includes("network")) showMsg("No internet connection. Please try again.");
    else showMsg("Wrong email or password. Please try again.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Log in";
  }
});

$("#forgotBtn").addEventListener("click", async () => {
  const email = loginForm.email.value.trim();
  if (!email) return showMsg("Type your email above first, then tap “Forgot password?” again.");
  try {
    await sendPasswordResetEmail(auth, email);
    showMsg("We sent a link to reset your password. Please check your email (also the Spam folder).", true);
  } catch (err) {
    showMsg("Could not send the email. Please check the email address.");
  }
});

/* ==========================================================================
   Start
   ========================================================================== */
async function loadContent() {
  state = clone(DEFAULTS);
  const snap = await getDocs(collection(db, "site"));
  snap.forEach((d) => {
    if (DEFAULTS[d.id]) state[d.id] = { ...clone(DEFAULTS[d.id]), ...d.data() };
  });
}

buildNav();
onAuthStateChanged(auth, async (user) => {
  if (user && (user.email || "").toLowerCase() !== ADMIN_EMAIL) {
    await signOut(auth);
    $("#boot").hidden = true;
    $("#login").hidden = false;
    $("#app").hidden = true;
    showMsg("This account cannot change the website.");
    return;
  }
  if (user) {
    try { await loadContent(); } catch (err) { console.error(err); toast("Could not load your saved changes. Showing the website’s current content.", true); }
    $("#login").hidden = true;
    $("#app").hidden = false;
    $("#boot").hidden = true;
    go(location.hash.slice(1) || "home", { push: false });
  } else {
    hideSaveBar();
    $("#app").hidden = true;
    $("#login").hidden = false;
    $("#boot").hidden = true;
    loginForm.password.value = "";
  }
});
