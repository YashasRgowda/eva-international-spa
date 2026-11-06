/* EVA International Spa — interactions */
(() => {
  const WHATSAPP_NUMBER = "918884666184";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  // Horizontal finger swipes; vertical movement is left to the page scroll.
  const onSwipe = (el, onLeft, onRight) => {
    let x0 = null, y0 = null;
    el.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") { x0 = e.clientX; y0 = e.clientY; } });
    el.addEventListener("pointercancel", () => { x0 = null; });
    el.addEventListener("pointerup", (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0, dy = e.clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) (dx < 0 ? onLeft : onRight)();
    });
  };

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (window.Lenis && !reduceMotion) {
    lenis = new Lenis({ duration: 1.25, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true });
    const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  const scrollToTarget = (target) => {
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.6 });
    else (typeof target === "number" ? window.scrollTo({ top: target, behavior: "smooth" }) : target.scrollIntoView({ behavior: "smooth" }));
  };

  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id === "#") return;
      const el = id === "#top" ? 0 : $(id);
      if (el === null) return;
      e.preventDefault();
      closeMenu();
      scrollToTarget(el);
    });
  });

  /* ---------- Opening curtain + hero intro ---------- */
  const heroImg = $(".hero__media img");
  const intro = $("#intro");
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const heroReady = new Promise((resolve) => {
    if (heroImg.complete && heroImg.naturalWidth) return resolve();
    heroImg.addEventListener("load", resolve, { once: true });
    heroImg.addEventListener("error", resolve, { once: true });
    setTimeout(resolve, 4500);
  });
  const start = () => requestAnimationFrame(() => document.body.classList.add("is-loaded"));

  let introSeen = false;
  try { introSeen = sessionStorage.getItem("eva-intro") === "1"; } catch (e) { /* storage blocked */ }

  if (introSeen || reduceMotion || !intro) {
    intro && intro.remove();
    heroReady.then(start);
  } else {
    document.body.classList.add("is-locked");
    lenis && lenis.stop();
    const tapToSkip = new Promise((r) => intro.addEventListener("click", r, { once: true }));
    Promise.all([heroReady, Promise.race([wait(2000), tapToSkip])]).then(() => {
      intro.classList.add("is-done");
      start();
      document.body.classList.remove("is-locked");
      lenis && lenis.start();
      try { sessionStorage.setItem("eva-intro", "1"); } catch (e) { /* storage blocked */ }
      setTimeout(() => intro.remove(), 1500);
    });
  }

  /* ---------- Hero: depth that follows the cursor ---------- */
  const heroFrame = $(".hero__frame");
  if (!reduceMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    $("#hero").addEventListener("pointermove", (e) => {
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      heroFrame.style.translate = `${x * -22}px ${y * -14}px`;
    });
    $("#hero").addEventListener("pointerleave", () => { heroFrame.style.translate = ""; });
  }

  /* ---------- Hero: the next fortnight as choosable days ---------- */
  const heroDay = $("#heroDay");
  const toISO = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const label = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    const opt = document.createElement("option");
    opt.value = toISO(d);
    opt.textContent = i === 0 ? `Today, ${label}` : i === 1 ? `Tomorrow, ${label}` : label;
    heroDay.appendChild(opt);
  }

  /* ---------- Scroll-driven UI ---------- */
  const header = $("#header");
  const hero = $("#hero");
  const heroMedia = $(".hero__media");
  const heroLayers = $$(".hero__logo, .hero__content, .hero__corner");
  const floatBtn = $("#floatReserve");
  const floatWa = $("#floatWa");
  const dock = $("#dock");
  const toTop = $("#toTop");
  const parallaxEls = $$("[data-parallax]");
  const storyPath = $("#storyLine");
  const stories = $(".stories");

  let pathLength = 0;
  if (storyPath) {
    pathLength = storyPath.getTotalLength();
    storyPath.style.strokeDasharray = pathLength;
    storyPath.style.strokeDashoffset = pathLength;
  }

  const onScroll = () => {
    const y = window.scrollY;
    const vh = window.innerHeight;
    const heroH = hero.offsetHeight;

    header.classList.toggle("is-solid", y > heroH - 90);
    const pastHero = y > heroH * 0.85;
    floatBtn.classList.toggle("is-visible", pastHero && !isNearFooter());
    floatWa.classList.toggle("is-visible", pastHero);
    // The footer has its own booking links, so the dock steps aside there.
    dock.classList.toggle("is-visible", pastHero && !isNearFooter());
    toTop.classList.toggle("is-visible", y > vh * 1.2);

    if (!reduceMotion && y < heroH) {
      const p = y / heroH;
      heroMedia.style.transform = `translate3d(0, ${y * 0.35}px, 0)`;
      // Leave the layers untouched at the very top so the intro fade-in still plays.
      heroLayers.forEach((el) => {
        el.style.opacity = y > 0 ? String(1 - p * 1.6) : "";
        el.style.translate = y > 0 ? `0 ${y * 0.18}px` : "";
      });
    }

    if (!reduceMotion) {
      parallaxEls.forEach((el) => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const speed = parseFloat(el.dataset.parallax) || 0;
        const offset = (r.top + r.height / 2 - vh / 2) * speed;
        el.style.transform = `translate3d(0, ${offset}px, 0)`;
      });
    }

    if (storyPath && stories) {
      const r = stories.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.2)));
      storyPath.style.strokeDashoffset = String(pathLength * (1 - progress));
    }
  };

  const footer = $(".footer");
  const isNearFooter = () => footer.getBoundingClientRect().top < window.innerHeight - 40;

  if (lenis) lenis.on("scroll", onScroll);
  else window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  toTop.addEventListener("click", () => scrollToTarget(0));

  /* ---------- Reveal on scroll ---------- */
  // Stagger siblings that reveal together.
  $$(".world__head, .story__text, .rituals__head, .visit__text, .voices .container-narrow").forEach((group) => {
    $$("[data-reveal]", group).forEach((el, i) => el.style.setProperty("--d", `${i * 0.09}s`));
  });
  $$(".ritual").forEach((el, i) => el.style.setProperty("--d", `${(i % 4) * 0.06}s`));

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.08 });
  $$("[data-reveal]").forEach((el) => io.observe(el));
  window.evaReveal = (els) => els.forEach((el) => io.observe(el));

  /* ---------- Suite showcase ---------- */
  const showImgs = $$(".showcase__img");
  const thumbs = $$(".thumb");
  const caption = $(".showcase__caption");
  let showIndex = 0;
  let showTimer = null;

  const loadShow = (img) => { if (img.dataset.src) { img.src = img.dataset.src; img.removeAttribute("data-src"); } };

  const setShow = (i) => {
    if (i === showIndex) return;
    showIndex = i;
    loadShow(showImgs[i]);
    loadShow(showImgs[(i + 1) % showImgs.length]);
    showImgs.forEach((img, n) => img.classList.toggle("is-active", n === i));
    thumbs.forEach((t, n) => { t.classList.toggle("is-active", n === i); t.setAttribute("aria-selected", String(n === i)); });
    $("#showCount").textContent = String(i + 1).padStart(2, "0");
    caption.classList.add("is-swapping");
    setTimeout(() => {
      $("#showEyebrow").textContent = thumbs[i].dataset.eyebrow;
      $("#showName").textContent = thumbs[i].dataset.name;
      caption.classList.remove("is-swapping");
    }, 350);
  };

  const autoShow = () => {
    clearInterval(showTimer);
    if (!reduceMotion) showTimer = setInterval(() => setShow((showIndex + 1) % showImgs.length), 6000);
  };

  thumbs.forEach((t) => t.addEventListener("click", () => { setShow(Number(t.dataset.index)); autoShow(); }));
  onSwipe($(".showcase__stage"),
    () => { setShow((showIndex + 1) % showImgs.length); autoShow(); },
    () => { setShow((showIndex - 1 + showImgs.length) % showImgs.length); autoShow(); });
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) { loadShow(showImgs[1]); autoShow(); }
    else clearInterval(showTimer);
  }, { threshold: 0.3 }).observe($(".showcase"));

  /* ---------- Ritual hover image ---------- */
  const float = $("#ritualFloat");
  const floatImg = $("img", float);
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (canHover && float) {
    let fx = 0, fy = 0, tx = 0, ty = 0, running = false;
    const follow = () => {
      fx += (tx - fx) * 0.14;
      fy += (ty - fy) * 0.14;
      float.style.transform = `translate3d(${fx}px, ${fy}px, 0) translate(-50%, -50%) rotate(${(tx - fx) * 0.02}deg)`;
      if (running) requestAnimationFrame(follow);
    };
    // Delegated, so rows rebuilt from saved content keep working.
    const list = $(".ritual-list");
    let current = null;
    list.addEventListener("mouseover", (e) => {
      const row = e.target.closest(".ritual");
      if (!row || row === current) return;
      current = row;
      floatImg.src = row.dataset.img;
      if (!float.classList.contains("is-visible")) { tx = fx = e.clientX + 160; ty = fy = e.clientY; }
      float.classList.add("is-visible");
      if (!running) { running = true; requestAnimationFrame(follow); }
    });
    list.addEventListener("mousemove", (e) => { tx = e.clientX + 160; ty = e.clientY; });
    list.addEventListener("mouseleave", () => { current = null; running = false; float.classList.remove("is-visible"); });
    // Warm the cache so the first hover is instant.
    new IntersectionObserver(([entry], obs) => {
      if (!entry.isIntersecting) return;
      $$(".ritual").forEach((row) => { const i = new Image(); i.src = row.dataset.img; });
      obs.disconnect();
    }).observe($(".rituals"));
  }

  /* ---------- Guest voices ---------- */
  // Slides are looked up each time, so reviews saved in the admin panel can replace them.
  const voiceCount = () => $$(".voice").length || 1;
  let voiceIndex = 0;
  let voiceTimer = null;
  const setVoice = (i) => {
    voiceIndex = i;
    $$(".voice").forEach((v, n) => v.classList.toggle("is-active", n === i));
    $$(".voices__dots button").forEach((d, n) => d.classList.toggle("is-active", n === i));
  };
  const autoVoice = () => {
    clearInterval(voiceTimer);
    if (!reduceMotion) voiceTimer = setInterval(() => setVoice((voiceIndex + 1) % voiceCount()), 7000);
  };
  $(".voices__dots").addEventListener("click", (e) => {
    const dot = e.target.closest("button");
    if (!dot) return;
    setVoice($$(".voices__dots button").indexOf(dot));
    autoVoice();
  });
  onSwipe($(".voices__track"),
    () => { setVoice((voiceIndex + 1) % voiceCount()); autoVoice(); },
    () => { setVoice((voiceIndex - 1 + voiceCount()) % voiceCount()); autoVoice(); });
  window.evaResetVoices = () => { setVoice(0); autoVoice(); };
  autoVoice();

  /* ---------- Menu ---------- */
  const menu = $("#menu");
  const menuOpenBtn = $("#menuOpen");
  const menuLinks = $$(".menu__nav a");
  const art = $(".menu__art");
  const scenes = $$(".scene", art);
  let scenesReady = false;

  // Scene photos load the first time the menu opens, not with the page.
  const prepareScenes = () => {
    if (scenesReady) return;
    scenesReady = true;
    scenes.forEach((sc) => {
      // Absolute URL: a relative one inside a CSS variable would resolve from the css/ folder.
      sc.style.setProperty("--img", `url("${new URL(sc.dataset.img, document.baseURI).href}")`);
      sc.style.setProperty("--scene-bg", sc.dataset.color);
    });
  };

  const showScene = (name) => {
    const active = scenes.find((sc) => sc.dataset.scene === name);
    scenes.forEach((sc) => sc.classList.toggle("is-active", sc === active));
    menuLinks.forEach((a) => a.classList.toggle("is-current", a.dataset.scene === name));
    art.classList.toggle("has-scene", Boolean(active));
    if (active) art.style.setProperty("--art-bg", active.dataset.color);
    else art.style.removeProperty("--art-bg");
  };

  function openMenu() {
    prepareScenes();
    menu.classList.add("is-open");
    menu.setAttribute("aria-hidden", "false");
    menuOpenBtn.setAttribute("aria-expanded", "true");
    document.body.classList.add("is-locked");
    lenis && lenis.stop();
  }
  function closeMenu() {
    if (!menu.classList.contains("is-open")) return;
    menu.classList.remove("is-open");
    menu.setAttribute("aria-hidden", "true");
    menuOpenBtn.setAttribute("aria-expanded", "false");
    document.body.classList.remove("is-locked");
    lenis && lenis.start();
    setTimeout(() => showScene(null), 1000);
  }
  menuOpenBtn.addEventListener("click", openMenu);
  $("#menuClose").addEventListener("click", closeMenu);

  menuLinks.forEach((a) => {
    a.addEventListener("mouseenter", () => showScene(a.dataset.scene));
    a.addEventListener("focus", () => showScene(a.dataset.scene));
  });
  $(".menu__nav").addEventListener("mouseleave", () => showScene(null));

  /* ---------- Reservation ---------- */
  const reserve = $("#reserve");
  const reserveForm = $("#reserveForm");
  const today = new Date();
  const iso = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  $$('input[type="date"]').forEach((input) => { input.min = iso; });

  const openReserve = (ritual) => {
    closeMenu();
    if (ritual) reserveForm.ritual.value = ritual;
    reserve.classList.add("is-open");
    reserve.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-locked");
    lenis && lenis.stop();
    if (canHover) setTimeout(() => (reserveForm.ritual.value ? reserveForm.date : reserveForm.ritual).focus({ preventScroll: true }), 500);
  };
  const closeReserve = () => {
    reservePanel.style.transform = "";
    reserve.classList.remove("is-open");
    reserve.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
    lenis && lenis.start();
  };

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-reserve]");
    if (btn) openReserve(btn.dataset.ritual);
  });
  $$("[data-close]", reserve).forEach((el) => el.addEventListener("click", closeReserve));

  // Phones: pull the booking sheet down by its handle to close it.
  const reservePanel = $(".reserve__panel");
  const grab = $(".reserve__grab");
  let dragY = null;
  grab.addEventListener("pointerdown", (e) => {
    dragY = e.clientY;
    try { grab.setPointerCapture(e.pointerId); } catch (err) { /* pointer already released */ }
    reservePanel.classList.add("is-dragging");
  });
  grab.addEventListener("pointermove", (e) => {
    if (dragY === null) return;
    reservePanel.style.transform = `translateY(${Math.max(0, e.clientY - dragY)}px)`;
  });
  const endDrag = (e) => {
    if (dragY === null) return;
    const pulled = e.clientY - dragY;
    dragY = null;
    reservePanel.classList.remove("is-dragging");
    if (pulled > 90) closeReserve();
    else reservePanel.style.transform = "";
  };
  grab.addEventListener("pointerup", endDrag);
  grab.addEventListener("pointercancel", endDrag);
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeReserve();
    closeMenu();
  });

  const formatDate = (value) => {
    if (!value) return "";
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  };

  const sendToWhatsApp = (lines) => {
    const text = encodeURIComponent(lines.filter(Boolean).join("\n"));
    window.open(`https://wa.me/${window.EVA_WHATSAPP || WHATSAPP_NUMBER}?text=${text}`, "_blank", "noopener");
  };

  reserveForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = reserveForm;
    sendToWhatsApp([
      "Hello EVA, I would like to book a massage.",
      "",
      `Massage: ${f.ritual.value}`,
      `Date: ${formatDate(f.date.value)}`,
      `Time: ${f.time.value}`,
      `People: ${f.guests.value}`,
      `Name: ${f.name.value.trim()}`,
    ]);
  });

  // Hero bar hands over to the full panel, carrying what the guest already chose.
  $("#heroBooking").addEventListener("submit", (e) => {
    e.preventDefault();
    const hb = e.currentTarget;
    if (hb.day.value) reserveForm.date.value = hb.day.value;
    openReserve(hb.ritual.value);
  });

  $("#year").textContent = String(new Date().getFullYear());
})();
