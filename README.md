# EVA International Spa

A luxury website for a spa in Koramangala, Bengaluru, with a simple admin panel the owner uses to change photos and text without a developer.

Built by [svayam.ai](https://wa.me/918095762180).

## Highlights

**Website**
- Editorial design inspired by world-class hotel sites: serif typography, a cinematic hero with an opening lotus animation, film grain and lamp glow
- Two-panel menu where each link reveals its photo inside a different animated shape (stepped bars, arch, interlocking circles, ring)
- Booking flow that ends in a ready-to-send WhatsApp message
- Built for phones first: a bottom action dock, a swipeable photo gallery and reviews, a booking sheet you can drag to close, and safe areas for notched iPhones
- Separate layouts for phones, foldables (Galaxy Fold folded and open), iPads and desktop

**Admin panel (`/admin`)**
- Email and password login, limited to the owner's account
- Pages in the same order as the website: Spa Name, Top Banner, Room Photos, Why EVA Photos, Massages, Reviews, Contact Details
- Add, edit, hide, reorder and delete massages and reviews
- Photos are resized in the browser before upload, with a progress bar
- Written for non-technical users: plain English, large buttons, "Are you sure?" before deleting, warnings for unsaved changes

## How it works

```
Owner ──▶ /admin ──▶ Firebase Auth (login)
                 ──▶ Cloud Firestore (text, links, photo URLs)
                 ──▶ Cloudinary (photo storage)

Visitor ──▶ static site ──▶ reads Firestore over REST ──▶ updates the page
```

- The site ships with its content built into the HTML, so it loads instantly and still works if the database is unreachable. Saved changes are fetched over Firestore's REST API (no SDK on the public site) and cached in `localStorage` for the next visit.
- One saved phone number, WhatsApp number or set of opening hours updates every place it appears on the page.
- Firestore security rules allow anyone to read, but only the owner's account to write.
- Everything runs on free plans with no card on file, and nothing pauses when the site is quiet.

## Tech stack

| Part | Tools |
|---|---|
| Frontend | HTML, CSS, vanilla JavaScript (ES modules), Lenis smooth scroll |
| Database | Cloud Firestore |
| Login | Firebase Authentication |
| Photos | Cloudinary (unsigned uploads, automatic format and size) |
| Hosting | Firebase Hosting, deployed by GitHub Actions |

## Project structure

```
index.html            Website
css/style.css         Website styles
js/main.js            Website interactions
js/content.js         Loads saved content into the website
js/site-defaults.js   Built-in content and image sizing helpers
admin/                Admin panel (login + all pages)
firestore.rules       Database security rules
firebase.json         Hosting setup
```

## Run locally

```bash
npm run dev
```

Then open http://localhost:4000 (website) or http://localhost:4000/admin/ (admin panel).
