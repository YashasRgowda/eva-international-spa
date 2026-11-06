// Fills the website with what the owner saved in the admin panel.
// The page already contains the default content, so if the database is slow or
// unreachable nothing looks broken; saved changes simply replace it.
import { firebaseConfig } from "./firebase-config.js";
import { DEFAULTS, sized, phoneDigits } from "./site-defaults.js";

const CACHE_KEY = "eva-content-v1";
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- Reading Firestore over plain REST (no SDK needed on the public site) ---------- */
function decode(v) {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(decode);
  if ("mapValue" in v) return decodeFields(v.mapValue.fields || {});
  return null;
}
function decodeFields(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) out[k] = decode(v);
  return out;
}
async function fetchContent() {
  const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/site?pageSize=50&key=${firebaseConfig.apiKey}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Firestore ${res.status}`);
  const data = await res.json();
  const out = {};
  (data.documents || []).forEach((d) => { out[d.name.split("/").pop()] = decodeFields(d.fields || {}); });
  return out;
}

/* ---------- Text that appears in many places (phone, email, hours, brand) ---------- */
// Remembers what is on the page now, so each value is swapped exactly once.
const shown = {
  brand: `${DEFAULTS.brand.name} ${DEFAULTS.brand.subtitle}`,
  phone: DEFAULTS.contact.phone,
  phoneDigits: phoneDigits(DEFAULTS.contact.phone),
  waDigits: phoneDigits(DEFAULTS.contact.whatsapp),
  email: DEFAULTS.contact.email,
  hours: DEFAULTS.contact.hours,
};

function replaceText(from, to) {
  if (!from || !to || from === to) return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement.closest("script, style") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const hits = [];
  while (walker.nextNode()) if (walker.currentNode.nodeValue.includes(from)) hits.push(walker.currentNode);
  hits.forEach((n) => { n.nodeValue = n.nodeValue.split(from).join(to); });
}

/* ---------- Sections ---------- */
function applyBrand(b) {
  if (!b.name) return;
  const full = [b.name, b.subtitle].filter(Boolean).join(" ");
  $$(".hero__word, .header__word, .footer__word, .intro__word").forEach((el) => { el.textContent = b.name; });
  $$(".hero__sub, .footer__sub, .intro__sub").forEach((el) => { el.textContent = b.subtitle || ""; });
  replaceText(shown.brand, full);
  document.title = document.title.split(shown.brand).join(full);
  shown.brand = full;
}

function applyHero(h) {
  if (h.image) {
    const img = $(".hero__frame img");
    img.srcset = [1200, 1800, 2400].map((w) => `${sized(h.image, w)} ${w}w`).join(", ");
    img.src = sized(h.image, 2400);
  }
  if (h.title) {
    // The last sentence is shown in italic gold, like the original design.
    const parts = h.title.match(/[^.!?]+[.!?]*\s*/g) || [h.title];
    const html = parts.length > 1
      ? `${esc(parts.slice(0, -1).join(""))}<em>${esc(parts[parts.length - 1].trim())}</em>`
      : esc(h.title);
    $(".hero__title .line > span").innerHTML = html;
  }
  if (h.lead) $(".hero__lead").textContent = h.lead;
}

function applyRooms(r) {
  const photos = r.photos || [];
  const stage = $$(".showcase__img");
  const thumbs = $$(".thumb img");
  photos.forEach((url, i) => {
    if (!url || !stage[i]) return;
    const big = sized(url, 1800);
    if (stage[i].hasAttribute("data-src")) stage[i].dataset.src = big;
    else stage[i].src = big;
    if (thumbs[i]) thumbs[i].src = sized(url, 240, 240);
  });
}

function applyWhy(w) {
  const imgs = $$(".story__media img");
  ["private", "therapists", "couples"].forEach((key, i) => {
    if (w[key] && imgs[i]) imgs[i].src = sized(w[key], 1100);
  });
}

function applyServices(s) {
  const visible = (s.items || []).filter((it) => it && it.name && !it.hidden);
  if (!visible.length) return;

  const list = $(".ritual-list");
  list.innerHTML = visible.map((it, i) => `
    <li class="ritual" data-img="${esc(sized(it.image, 700, 875))}" data-reveal style="--d:${(i % 4) * 0.06}s">
      <span class="ritual__num">${String(i + 1).padStart(2, "0")}</span>
      <img class="ritual__thumb" src="${esc(sized(it.image, 360, 450))}" alt="" loading="lazy">
      <div class="ritual__main">
        <h3 class="ritual__name">${esc(it.name)}</h3>
        ${it.bestFor ? `<p class="ritual__for">Best for: ${esc(it.bestFor)}</p>` : ""}
      </div>
      <p class="ritual__desc">${esc(it.description)}</p>
      <span class="ritual__time">${esc(it.duration)}</span>
      <button class="ritual__cta" data-reserve data-ritual="${esc(it.name)}" aria-label="Book ${esc(it.name)}">Book</button>
    </li>`).join("");
  window.evaReveal ? window.evaReveal($$(".ritual", list)) : $$(".ritual", list).forEach((el) => el.classList.add("is-in"));

  // Booking forms list the same massages.
  $$('select[name="ritual"]').forEach((sel) => {
    const keep = sel.value;
    const placeholder = sel.options[0].outerHTML;
    sel.innerHTML = placeholder
      + visible.map((it) => `<option>${esc(it.name)}</option>`).join("")
      + "<option>Not sure, please suggest</option>";
    sel.value = [...sel.options].some((o) => o.value === keep) ? keep : "";
  });

  // Footer shows the first four.
  const col = $$(".footer__col")[0];
  if (col) {
    $$("a", col).forEach((a) => a.remove());
    visible.slice(0, 4).forEach((it) => {
      const a = document.createElement("a");
      a.href = "#rituals";
      a.textContent = it.name.replace(/ Massage$/, "");
      col.appendChild(a);
    });
  }
}

function applyReviews(r) {
  const items = (r.items || []).filter((it) => it && it.text);
  if (!items.length) return;
  $(".voices__track").innerHTML = items.map((it, i) => `
    <blockquote class="voice${i === 0 ? " is-active" : ""}">
      <p>“${esc(it.text)}”</p>
      <cite>${esc(it.name)}${it.massage ? ` <span>· ${esc(it.massage)}</span>` : ""}</cite>
    </blockquote>`).join("");
  $(".voices__dots").innerHTML = items.map((_, i) =>
    `<button${i === 0 ? ' class="is-active"' : ""} aria-label="Review ${i + 1}"></button>`).join("");
  window.evaResetVoices && window.evaResetVoices();
}

function applyContact(c) {
  if (c.phone) {
    const digits = phoneDigits(c.phone);
    $$(`a[href="tel:+${shown.phoneDigits}"]`).forEach((a) => { a.href = `tel:+${digits}`; });
    replaceText(shown.phone, c.phone);
    shown.phone = c.phone;
    shown.phoneDigits = digits;
  }
  if (c.whatsapp) {
    const digits = phoneDigits(c.whatsapp);
    $$(`a[href*="wa.me/${shown.waDigits}"]`).forEach((a) => { a.href = a.href.replace(`wa.me/${shown.waDigits}`, `wa.me/${digits}`); });
    window.EVA_WHATSAPP = digits;
    shown.waDigits = digits;
  }
  if (c.email) {
    $$(`a[href="mailto:${shown.email}"]`).forEach((a) => { a.href = `mailto:${c.email}`; });
    replaceText(shown.email, c.email);
    shown.email = c.email;
  }
  if (c.hours) {
    replaceText(shown.hours, c.hours);
    shown.hours = c.hours;
  }
  if (c.address) {
    const dd = $('[data-bind="address"]');
    if (dd) dd.textContent = c.address;
  }
  if (c.mapsUrl) $$('a[href*="google.com/maps"]').forEach((a) => { a.href = c.mapsUrl; });
  if (c.image) {
    const img = $(".visit__media img");
    if (img) img.src = sized(c.image, 1100);
  }
}

const APPLY = { brand: applyBrand, hero: applyHero, rooms: applyRooms, why: applyWhy, services: applyServices, reviews: applyReviews, contact: applyContact };

function applyAll(content) {
  for (const [key, fn] of Object.entries(APPLY)) {
    if (!content[key]) continue;
    try { fn(content[key]); } catch (err) { console.warn(`EVA content: could not apply ${key}`, err); }
  }
}

/* ---------- Run: last saved copy first (instant), then the fresh one ---------- */
let cached = null;
try { cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); } catch (e) { /* storage blocked */ }
if (cached) applyAll(cached);

fetchContent()
  .then((fresh) => {
    const text = JSON.stringify(fresh);
    if (cached && JSON.stringify(cached) === text) return;
    applyAll(fresh);
    try { localStorage.setItem(CACHE_KEY, text); } catch (e) { /* storage blocked */ }
  })
  .catch((err) => console.warn("EVA content: showing built-in content", err));
