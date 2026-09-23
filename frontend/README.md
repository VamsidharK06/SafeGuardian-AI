# 🛡️ SafeGuardian AI - Frontend

A focused emergency-safety web app (HTML/CSS/JS frontend + Spring Boot backend). Core principle:
**less manual action, more system automation.** One button to press in a real emergency: SOS.

---

## 📁 Project Structure

```
├── index.html          → Login Page
├── dashboard.html       → Home (SOS-first)
├── contacts.html        → Emergency Contacts (synced with the backend)
├── sos.html              → One-click SOS Emergency Alert
├── ai.html               → AI Safety Assistant
├── style.css             → Common CSS (all pages)
├── app.js                → Common JavaScript (all page logic + backend calls)
├── icon.svg               → App icon (used by the PWA manifest)
├── service-worker.js      → Offline support (PWA)
├── manifest.json          → PWA manifest
└── README.md              → This file
```

The Spring Boot backend lives in a sibling `backend/` folder (see its own README/HELP.md).

Nearby directories, alarm, maps, and notes are intentionally not part of the core app — they
are not mandatory for the emergency workflow. They can return later as optional utilities once
the core SOS + AI workflow is solid.

---

## ✅ Core Features

### 🔐 Login (`index.html`)
Demo login — any username/password works. Session stored in `localStorage`.

### 🏠 Home (`dashboard.html`)
Answers one question: "What should I do if I am in danger?" — press SOS. Shows the SOS button,
your saved contact count, and AI status. Nothing else competes for attention.

### 📋 Emergency Contacts (`contacts.html`)
Add, view, and delete trusted contacts once. Contacts are saved through the backend
(`/api/contacts`) so they're available to SOS. If the backend is unreachable, the page falls
back to a local-only cache and shows a banner saying so.

### 🆘 One-Click SOS (`sos.html`)
Pressing the single SOS button:
1. Grabs your live GPS location.
2. Sends it to the backend in one request — the backend looks up your saved contacts itself.
3. The backend sends the emergency message + live location to **every** saved contact
   automatically through Twilio's WhatsApp Business API — no browser tabs, no manual
   "tap Send" step, and it doesn't stop at the first contact.
4. If WhatsApp isn't configured on the server, or Twilio rejects a specific message, that's
   reported honestly per contact (`NOT_CONFIGURED` / `FAILED`) rather than claimed as sent.
   The (optional, separate) SMS-via-Twilio channel from earlier still works exactly as before
   if you have it configured.

See **"Enabling fully automatic WhatsApp delivery"** below to configure this.

### 🤖 AI Safety Assistant (`ai.html`)
Describe a situation in plain language and get a structured, context-aware assessment
(`/api/ai/analyze`): risk level, threat type, confidence, recommended action, the automated
steps SafeGuardian would take, and why. Different situations get different assessments instead
of a repeated stock response. A HIGH risk result links straight to SOS.

### 🌐 Offline / PWA Support
A service worker caches the app shell so it keeps working (in local-only mode) without a
network connection.

---

## 🚀 How to Run

1. Start the backend first (see `backend/README`/`HELP.md`) — by default it runs on `http://localhost:8080`.
2. Serve the frontend with any static file server, e.g.:
   ```bash
   python -m http.server 5500
   ```
3. Open `http://localhost:5500/index.html`, log in with any username/password, and use the top menu to navigate.

If the backend isn't running, Contacts still works via a local-only fallback, but SOS and the
AI Assistant need the backend to be up.

---

## 📡 Enabling fully automatic WhatsApp delivery

By default, the backend has no WhatsApp provider configured, so SOS will honestly report
`NOT_CONFIGURED` for every contact instead of a false "SENT". To make SOS send a real WhatsApp
message to **every** saved contact automatically, set these environment variables before
starting the backend:

```bash
WHATSAPP_ENABLED=true
WHATSAPP_ACCOUNT_SID=your_twilio_account_sid   # defaults to TWILIO_ACCOUNT_SID if unset
WHATSAPP_AUTH_TOKEN=your_twilio_auth_token     # defaults to TWILIO_AUTH_TOKEN if unset
WHATSAPP_FROM_NUMBER=whatsapp:+14155238886     # Twilio's sandbox number, or your approved sender
```

No extra libraries are required — the backend talks to Twilio's REST API directly, the same
way the (still optional, unrelated) SMS channel does.

For real WhatsApp Business setup steps (sandbox join codes, approved senders, the 24-hour
session window, and template requirements), see the backend README.

---

## 💾 Data Storage

| Data          | Primary storage        | Fallback                     |
|---------------|------------------------|-------------------------------|
| User session  | `localStorage`          | —                              |
| Contacts      | Backend (`/api/contacts`, PostgreSQL) | `localStorage` cache if backend is unreachable |

---

*&copy; 2026 SafeGuardian AI*
