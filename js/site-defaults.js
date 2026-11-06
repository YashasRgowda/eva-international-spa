// The website's built-in content. The admin panel starts from this, and the
// live site keeps showing it until the owner saves something different.
// Each top-level key is one document in Firestore: site/{key}.

const unsplash = (id) => `https://images.unsplash.com/photo-${id}`;

export const DEFAULTS = {
  brand: {
    name: "EVA",
    subtitle: "International Spa",
  },

  hero: {
    image: unsplash("1761470575018-135c213340eb"),
    title: "Relax. Unwind. Feel New.",
    lead: "Professional massages by certified therapists, in private rooms made just for you.",
  },

  // Room names stay fixed; only the photos change.
  rooms: {
    photos: [
      "assets/images/hero.webp",
      unsplash("1749766878223-6ceae855b28b"),
      unsplash("1604478578618-57d582bfb230"),
      unsplash("1765745520336-88acf0b84fe4"),
    ],
  },

  why: {
    private: unsplash("1706795033849-7ca391f007c5"),
    therapists: unsplash("1600334129128-685c5582fd35"),
    couples: unsplash("1720118509152-2df877673bee"),
  },

  services: {
    items: [
      { name: "Deep Tissue Massage", bestFor: "back pain, stiff neck and shoulders", description: "Strong, slow pressure that reaches deep into tight muscles.", duration: "60 min", image: unsplash("1741522509438-a120c0bb5e88"), hidden: false },
      { name: "Swedish Massage", bestFor: "stress, and first-time spa guests", description: "Gentle, flowing strokes that relax your whole body.", duration: "60 min", image: unsplash("1639162906614-0603b0ae95fd"), hidden: false },
      { name: "Thai Massage", bestFor: "a stiff body and low energy", description: "Traditional stretches and pressure points that loosen up the whole body.", duration: "90 min", image: unsplash("1745327883508-b6cd32e5dde5"), hidden: false },
      { name: "Aromatherapy Massage", bestFor: "stress and better sleep", description: "A soft massage with natural essential oils chosen for you.", duration: "60 min", image: unsplash("1515377905703-c4788e51af15"), hidden: false },
      { name: "Balinese Massage", bestFor: "full-body relaxation", description: "A mix of gentle stretches, pressure points and warm oil.", duration: "90 min", image: unsplash("1775133262667-316bd4d9e5b5"), hidden: false },
      { name: "Body Scrub", bestFor: "dull or dry skin", description: "Removes dead skin and leaves your skin soft and glowing.", duration: "45 min", image: unsplash("1760722974657-f64bce2f9cc5"), hidden: false },
      { name: "Couples Spa", bestFor: "dates, anniversaries and birthdays", description: "Two massages, side by side, in a private room for two.", duration: "90 min", image: unsplash("1720118509152-2df877673bee"), hidden: false },
      { name: "Jacuzzi", bestFor: "tired muscles after a long day", description: "Relax in warm, bubbling water, on its own or after your massage.", duration: "60 min", image: unsplash("1604478578618-57d582bfb230"), hidden: false },
    ],
  },

  reviews: {
    items: [
      { name: "Priya M.", text: "Amazing experience. Professional service and a very clean place.", massage: "Thai Massage" },
      { name: "Rahul S.", text: "Best spa in Koramangala. Highly recommend the couples package.", massage: "Couples Spa" },
      { name: "Sneha K.", text: "Great value. The deep tissue massage really helped my back pain.", massage: "Deep Tissue Massage" },
    ],
  },

  contact: {
    phone: "+91 88846 66184",
    whatsapp: "+91 88846 66184",
    email: "info@evainternationalspa.com",
    address: "3rd Floor, 20th Main Road, above Van Heusen, KHB Colony, 7th Block, Koramangala, Bengaluru, Karnataka 560095",
    hours: "9 AM — 10 PM",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Eva+International+Spa+Koramangala+Bengaluru",
    image: unsplash("1648065611455-6774225ef654"),
  },
};

// Sizes any photo for where it is shown: Cloudinary and Unsplash both resize on the fly.
export function sized(url, w, h) {
  if (!url) return url;
  if (url.includes("res.cloudinary.com")) {
    const t = h ? `f_auto,q_auto,c_fill,g_auto,w_${w},h_${h}` : `f_auto,q_auto,c_limit,w_${w}`;
    return url.replace("/upload/", `/upload/${t}/`);
  }
  if (url.includes("images.unsplash.com")) {
    const u = new URL(url);
    u.searchParams.set("auto", "format");
    u.searchParams.set("fit", "crop");
    u.searchParams.set("w", String(w));
    if (h) u.searchParams.set("h", String(h));
    u.searchParams.set("q", "80");
    return u.toString();
  }
  return url;
}

// "+91 88846 66184" or "8884666184" -> "918884666184" for tel: and wa.me links.
export function phoneDigits(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}
