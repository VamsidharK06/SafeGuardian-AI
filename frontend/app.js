/* =====================================================
   SafeGuardian AI - Main JavaScript
   Frontend logic + Spring Boot backend integration
   ===================================================== */

"use strict";

/* =====================================================
   CONFIGURATION
   ===================================================== */

const API_BASE_URL = "http://localhost:8080/api";
const AI_SERVICE_BASE_URL = "http://localhost:8001";

/* =====================================================
   NAVBAR
   ===================================================== */

const NAV_LINKS = [
  { href: "dashboard.html", label: "Home" },
  { href: "contacts.html",  label: "Contacts" },
  { href: "sos.html",       label: "SOS" },
  { href: "ai.html",        label: "AI Assistant" }
];

function buildNavbar() {
  const navEl = document.getElementById("navbar");
  if (!navEl) return;

  const currentFile = location.pathname.split("/").pop() || "index.html";

  navEl.innerHTML = "";

  const brand = document.createElement("a");
  brand.href = "dashboard.html";
  brand.className = "nav-brand";
  brand.innerHTML = `<span class="brand-icon">🛡️</span> SafeGuardian AI`;

  const hamburger = document.createElement("button");
  hamburger.className = "nav-hamburger";
  hamburger.setAttribute("aria-label", "Toggle navigation");
  hamburger.innerHTML = `<span></span><span></span><span></span>`;

  const linksDiv = document.createElement("div");
  linksDiv.className = "nav-links";
  linksDiv.id = "navLinks";

  NAV_LINKS.forEach(({ href, label }) => {
    const a = document.createElement("a");
    a.href = href;
    a.textContent = label;
    if (href === currentFile) a.classList.add("active");
    linksDiv.appendChild(a);
  });

  if (currentFile !== "index.html") {
    const logoutBtn = document.createElement("button");
    logoutBtn.id = "logoutBtn";
    logoutBtn.textContent = "Logout";
    logoutBtn.addEventListener("click", handleLogout);
    linksDiv.appendChild(logoutBtn);
  }

  navEl.appendChild(brand);
  navEl.appendChild(hamburger);
  navEl.appendChild(linksDiv);

  hamburger.addEventListener("click", () => {
    linksDiv.classList.toggle("open");
  });

  linksDiv.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => linksDiv.classList.remove("open"));
  });
}

/* =====================================================
   AUTHENTICATION
   ===================================================== */

function isLoggedIn() {
  return !!localStorage.getItem("ws_user");
}

function requireLogin() {
  const currentFile = location.pathname.split("/").pop() || "index.html";
  if (currentFile === "index.html") return;

  if (!isLoggedIn()) {
    window.location.href = "index.html";
  }
}

function handleLogout() {
  localStorage.removeItem("ws_user");
  window.location.href = "index.html";
}

function getCurrentUsername() {
  return localStorage.getItem("ws_user") || "guest";
}

/* =====================================================
   MESSAGE UTILITY
   ===================================================== */

function showMessage(el, text, type = "info") {
  if (!el) return;
  el.textContent = text;
  el.className = `message show ${type}`;
  setTimeout(() => {
    el.className = "message";
  }, 4000);
}

/* =====================================================
   LOCAL STORAGE (offline fallback cache for contacts)
   ===================================================== */

function getLocalContacts() {
  return JSON.parse(localStorage.getItem("ws_contacts") || "[]");
}

function saveLocalContacts(list) {
  localStorage.setItem("ws_contacts", JSON.stringify(list));
}

/* =====================================================
   CONTACTS API (backend, with local-storage fallback)
   ===================================================== */

/**
 * Fetches contacts for the current user from the backend.
 * Falls back to the local-storage cache if the backend is unreachable,
 * so the app keeps working when Spring Boot / PostgreSQL isn't running.
 */
async function fetchContacts() {
  const username = getCurrentUsername();

  try {
    const response = await fetch(`${API_BASE_URL}/contacts/${encodeURIComponent(username)}`);
    if (!response.ok) throw new Error(`Backend returned ${response.status}`);

    const contacts = await response.json();
    saveLocalContacts(contacts);
    return { contacts, offline: false };

  } catch (error) {
    console.warn("Could not reach backend, using local contacts cache:", error);
    return { contacts: getLocalContacts(), offline: true };
  }
}

async function addContact(name, phone, relation) {
  const username = getCurrentUsername();
  const payload = { username, name, phone, relation };

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    // Network/backend unreachable - fall back to local-only storage.
    console.warn("Could not reach backend, saving contact locally only:", error);
    const saved = { id: Date.now(), ...payload };
    const local = getLocalContacts();
    local.push(saved);
    saveLocalContacts(local);
    return { saved, offline: true };
  }

  if (response.status === 400) {
    // Validation rejection (e.g. the 5-contact limit) - surface the
    // backend's actual message rather than silently saving locally.
    let error = "Could not add contact.";
    try {
      const body = await response.json();
      if (body && body.error) error = body.error;
    } catch (_) { /* ignore parse failure, keep default message */ }
    return { error };
  }

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}`);
  }

  const saved = await response.json();
  return { saved, offline: false };
}

async function deleteContact(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/contacts/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error(`Backend returned ${response.status}`);
    return { offline: false };

  } catch (error) {
    console.warn("Could not reach backend, deleting contact locally only:", error);
    const local = getLocalContacts().filter((c) => c.id !== id);
    saveLocalContacts(local);
    return { offline: true };
  }
}

/* =====================================================
   LOGIN PAGE
   ===================================================== */

function initLoginPage() {
  if (isLoggedIn()) {
    window.location.href = "dashboard.html";
    return;
  }

  const form = document.getElementById("loginForm");
  const msgEl = document.getElementById("loginMessage");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
      showMessage(msgEl, "Please enter both username and password.", "error");
      return;
    }

    // Demo login — replace with real authentication for production use.
    localStorage.setItem("ws_user", username);
    showMessage(msgEl, `Welcome, ${username}! Redirecting...`, "success");

    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 800);
  });
}

/* =====================================================
   HOME
   ===================================================== */

async function initDashboardPage() {
  const welcomeEl = document.getElementById("welcomeUser");
  const user = getCurrentUsername();

  if (welcomeEl) {
    welcomeEl.textContent = `Hi ${user}, you're protected.`;
  }

  const contactsCountEl = document.getElementById("stat-contacts");

  if (contactsCountEl) {
    const { contacts } = await fetchContacts();
    contactsCountEl.textContent = contacts.length;
  }
}

/* =====================================================
   CONTACTS PAGE
   ===================================================== */

const MAX_CONTACTS = 5;

function initContactsPage() {
  const form = document.getElementById("contactForm");
  const listEl = document.getElementById("contactsList");
  const msgEl = document.getElementById("contactMessage");
  const emptyEl = document.getElementById("emptyContactsText");
  const offlineEl = document.getElementById("contactsOfflineNotice");
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

  if (!form) return;

  renderContacts();

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const name = document.getElementById("contactName").value.trim();
    const phone = document.getElementById("contactPhone").value.trim();
    const relation = document.getElementById("contactRelation").value.trim();

    if (!name || !phone || !relation) {
      showMessage(msgEl, "Please fill in all fields.", "error");
      return;
    }

    const { saved, offline, error } = await addContact(name, phone, relation);

    if (error) {
      showMessage(msgEl, error, "error");
      return;
    }

    form.reset();
    showMessage(
      msgEl,
      offline
        ? `Contact "${name}" saved on this device (backend offline).`
        : `Contact "${name}" added successfully!`,
      "success"
    );

    renderContacts();
  });

  async function renderContacts() {
    const { contacts, offline } = await fetchContacts();

    if (offlineEl) {
      offlineEl.style.display = offline ? "block" : "none";
    }

    // Max 5 emergency contacts per user: once reached, disable the form
    // instead of letting the person submit a request the backend will
    // just reject.
    const atLimit = contacts.length >= MAX_CONTACTS;
    if (submitBtn) {
      submitBtn.disabled = atLimit;
      submitBtn.textContent = atLimit ? "Maximum 5 contacts reached" : "Add Contact";
    }
    form.querySelectorAll("input").forEach((input) => { input.disabled = atLimit; });

    if (!listEl) return;

    listEl.innerHTML = "";

    if (emptyEl) {
      emptyEl.style.display = contacts.length === 0 ? "block" : "none";
    }

    contacts.forEach((c) => {
      const li = document.createElement("li");
      li.className = "list-item";
      li.innerHTML = `
        <div class="list-item-info">
          <strong>${escapeHtml(c.name)}</strong>
          <span>${escapeHtml(c.phone)} &nbsp;|&nbsp; ${escapeHtml(c.relation)}</span>
        </div>
        <div class="list-item-actions">
          <a href="tel:${escapeHtml(c.phone)}" class="btn success-btn small-btn">Call</a>
          <button class="btn danger-btn small-btn" data-id="${c.id}">Delete</button>
        </div>
      `;
      listEl.appendChild(li);
    });

    listEl.querySelectorAll("[data-id]").forEach((btn) => {
      btn.addEventListener("click", async function () {
        const id = parseInt(this.dataset.id, 10);
        await deleteContact(id);
        showMessage(msgEl, "Contact deleted.", "info");
        renderContacts();
      });
    });
  }
}

/* =====================================================
   SOS — ONE-CLICK, NO MANUAL STEPS
   ===================================================== */

function initSOSPage() {
  const btn = document.getElementById("sendSOSBtn");
  const statusEl = document.getElementById("sosStatus");
  const listEl = document.getElementById("sosSentList");
  const emptyEl = document.getElementById("sosEmptyText");

  if (!btn) return;

  loadContactsPreview();

  async function loadContactsPreview() {
    const { contacts } = await fetchContacts();

    if (!listEl) return;
    listEl.innerHTML = "";

    if (contacts.length === 0) {
      if (emptyEl) emptyEl.style.display = "block";
      return;
    }

    if (emptyEl) emptyEl.style.display = "none";

    contacts.forEach((c) => {
      const li = document.createElement("li");
      li.className = "list-item";
      li.innerHTML = `
        <div class="list-item-info">
          <strong>${escapeHtml(c.name)}</strong>
          <span>${escapeHtml(c.phone)} &nbsp;|&nbsp; ${escapeHtml(c.relation)}</span>
        </div>
        <span class="badge badge-green">Will be notified</span>
      `;
      listEl.appendChild(li);
    });
  }

  btn.addEventListener("click", async function () {
    const { contacts } = await fetchContacts();

    if (contacts.length === 0) {
      showSOSError(
        `<strong>No contacts saved!</strong><br><br>
         Please add emergency contacts first on the
         <a href="contacts.html">Contacts page</a>.`
      );
      return;
    }

    setButtonBusy();

    if (!navigator.geolocation) {
      showSOSError("Geolocation is not supported by this browser.");
      resetButton();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        sendSOS(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        const messages = {
          1: "Location permission denied. Please allow location access.",
          2: "Location information unavailable.",
          3: "Location request timed out."
        };
        showSOSError(messages[error.code] || "Unable to retrieve your location.");
        resetButton();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });

  /**
   * ONE SOS click does everything: current GPS location (already captured
   * by the caller) + a best-effort captured camera frame + a short
   * best-effort captured voice clip + a context-based AI assessment +
   * automatic notification of every saved contact, all in a single
   * multipart request to the backend. The user never opens WhatsApp,
   * chooses a contact, or taps Send — evidence capture is short and
   * bounded by timeouts so the SOS action itself is never held up by a
   * slow or denied camera/microphone permission.
   */
  async function sendSOS(latitude, longitude) {
    const username = getCurrentUsername();

    setButtonBusy("CAPTURING EVIDENCE...");
    const [photoBlob, audioBlob] = await Promise.all([
      captureShortPhoto(),
      captureShortAudio()
    ]);

    setButtonBusy("SENDING...");

    const formData = new FormData();
    formData.append("username", username);
    formData.append("latitude", String(latitude));
    formData.append("longitude", String(longitude));
    formData.append("message", "SOS triggered by user via SafeGuardian AI.");
    if (photoBlob) formData.append("image", photoBlob, "evidence.jpg");
    if (audioBlob) formData.append("audio", audioBlob, "evidence.webm");

    try {
      const response = await fetch(`${API_BASE_URL}/emergency/sos`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) throw new Error(`Backend returned ${response.status}`);

      const result = await response.json();
      handleSOSResult(result, { photoCaptured: !!photoBlob, audioCaptured: !!audioBlob });

    } catch (error) {
      console.error("SOS backend error:", error);
      showSOSError(
        "Could not connect to the SafeGuardian AI backend. Make sure the Spring Boot server " +
        "is running on port 8080, then press SOS again."
      );
      resetButton();
    }
  }

  /** Captures a single still frame from the camera. Best-effort: returns null on any denial/timeout/error. */
  function captureShortPhoto() {
    return withTimeout(async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      try {
        const video = document.createElement("video");
        video.srcObject = stream;
        video.muted = true;
        await video.play();
        await waitForVideoReady(video);

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

        return await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
      } finally {
        stream.getTracks().forEach((track) => track.stop());
      }
    }, 6000);
  }

  /** Records a short (~3s) voice clip. Best-effort: returns null on any denial/timeout/error. */
  function captureShortAudio() {
    return withTimeout(async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      try {
        return await new Promise((resolve, reject) => {
          const chunks = [];
          const recorder = new MediaRecorder(stream);
          recorder.addEventListener("dataavailable", (e) => {
            if (e.data.size > 0) chunks.push(e.data);
          });
          recorder.addEventListener("stop", () => resolve(new Blob(chunks, { type: "audio/webm" })));
          recorder.addEventListener("error", reject);
          recorder.start();
          setTimeout(() => recorder.stop(), 3000);
        });
      } finally {
        stream.getTracks().forEach((track) => track.stop());
      }
    }, 6000);
  }

  function waitForVideoReady(video) {
    return new Promise((resolve) => {
      if (video.readyState >= 2) return resolve();
      video.addEventListener("loadeddata", () => resolve(), { once: true });
    });
  }

  /** Runs fn() but resolves to null (never rejects) if it errors, is unsupported, or exceeds timeoutMs. */
  async function withTimeout(fn, timeoutMs) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return null;
    try {
      return await Promise.race([
        fn(),
        new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs))
      ]);
    } catch (error) {
      console.warn("Evidence capture skipped:", error);
      return null;
    }
  }

  function handleSOSResult(result, capture) {
    const sos = result.sos || {};
    const assessment = result.assessment || {};
    const locationLink =
      sos.locationLink || `https://www.google.com/maps?q=${sos.latitude},${sos.longitude}`;
    const now = new Date().toLocaleTimeString();

    // The backend sends the emergency WhatsApp message (and any evidence)
    // to every saved contact itself, through Twilio's WhatsApp Business
    // API - there is no browser tab to open and nothing left for the user
    // to manually send. notifications carries a real per-contact,
    // per-channel SENT / FAILED / NOT_CONFIGURED status straight from
    // Twilio's response, so this only ever displays what actually happened.
    const notifications = sos.notifications || [];

    const statusBadge = (status, label) => {
      if (status === "SENT") return `<span class="badge badge-green">${label} sent</span>`;
      if (status === "NOT_CONFIGURED") return `<span class="badge">${label} not configured</span>`;
      if (!status) return "";
      return `<span class="badge badge-red">${label} failed</span>`;
    };

    const sentCount = sos.notificationsSent ?? notifications.filter((n) => n.status === "SENT").length;
    const contactsFound = sos.contactsFound ?? notifications.length;

    statusEl.className = sentCount > 0 ? "status-box success-bg" : "status-box warning-bg";
    statusEl.style.display = "block";

    const contactRows = notifications.map((n) => {
      const badges = [
        statusBadge(n.status, "Message"),
        n.cameraEvidenceStatus ? statusBadge(n.cameraEvidenceStatus, "Photo") : "",
        n.voiceEvidenceStatus ? statusBadge(n.voiceEvidenceStatus, "Voice") : ""
      ].filter(Boolean).join(" ");
      return `<li class="sos-result-row"><span>${escapeHtml(n.contact)} (${escapeHtml(n.phone)})</span>${badges}</li>`;
    }).join("");

    const checklist = `
      <div class="sos-checklist">
        <div>SOS ACTIVATED ✓</div>
        <div>Location captured ✓</div>
        <div>AI assessment completed ✓ (${escapeHtml(assessment.riskLevel || "N/A")} — ${escapeHtml(assessment.threatType || "")})</div>
        <div>Contacts processed: ${contactsFound}</div>
        <div>Notifications: ${sentCount}/${contactsFound}</div>
      </div>
    `;

    const evidenceLine = `
      <strong>Evidence:</strong>
      ${capture.photoCaptured ? "Camera evidence captured" : "No camera evidence captured"}
      ${result.cameraEvidenceDelivered ? "(sent)" : capture.photoCaptured ? "(not sent)" : ""} &nbsp;|&nbsp;
      ${capture.audioCaptured ? "Voice evidence captured" : "No voice evidence captured"}
      ${result.voiceEvidenceDelivered ? "(sent)" : capture.audioCaptured ? "(not sent)" : ""}
      ${result.mediaNote ? `<br><span class="muted-text">${escapeHtml(result.mediaNote)}</span>` : ""}
    `;

    const summaryLine = sos.whatsAppConfigured
      ? `<strong>WhatsApp is configured — your current location was sent to ${sentCount} of ${contactsFound} contact(s) automatically. No further action is needed.</strong>`
      : `<strong>WhatsApp API is not configured on this server yet.</strong> No message was actually sent — set WHATSAPP_ENABLED / WHATSAPP_ACCOUNT_SID / WHATSAPP_AUTH_TOKEN / WHATSAPP_FROM_NUMBER on the backend to enable fully automatic delivery to every contact.`;

    statusEl.innerHTML = `
      <strong>SOS Alert triggered at ${now}</strong><br><br>

      ${checklist}

      ${summaryLine}

      <br><br>
      ${evidenceLine}

      <br><br>
      <strong>Current Location:</strong>
      <a href="${escapeHtml(locationLink)}" target="_blank" class="btn primary-btn small-btn">Open Location</a>

      <br><br>
      <strong>Contacts:</strong>
      <ul class="sos-result-list">${contactRows}</ul>
    `;

    btn.innerHTML = `✅<br><span style="font-size:0.7rem;">SOS TRIGGERED</span>`;
    setTimeout(resetButton, 5000);
  }

  function showSOSError(message) {
    statusEl.className = "status-box danger-bg";
    statusEl.style.display = "block";
    statusEl.innerHTML = `<strong>SOS Error</strong><br><br>${message}`;
  }

  function setButtonBusy(label) {
    btn.disabled = true;
    btn.innerHTML = `📡<br><span style="font-size:0.65rem;">${label || "SENDING..."}</span>`;
  }

  function resetButton() {
    btn.disabled = false;
    btn.innerHTML = `SOS<br><span style="font-size:0.7rem;">SEND ALERT</span>`;
  }
}

/* =====================================================
   AI SAFETY ASSISTANT
   ===================================================== */

function initAIPage() {
  const form = document.getElementById("aiForm");
  const textarea = document.getElementById("aiMessage");
  const button = document.getElementById("analyzeBtn");
  const resultEl = document.getElementById("aiResult");

  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const message = textarea.value.trim();
    if (!message) {
      showMessage(document.getElementById("aiMessageStatus"), "Please describe the situation first.", "error");
      return;
    }

    button.disabled = true;
    button.textContent = "Analyzing...";
    resultEl.style.display = "block";
    resultEl.className = "status-box";
    resultEl.innerHTML = "Analyzing the situation...";

    try {
      const response = await fetch(`${API_BASE_URL}/ai/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });

      if (!response.ok) throw new Error(`Backend returned ${response.status}`);

      const data = await response.json();
      renderAssessment(data, resultEl);

    } catch (error) {
      resultEl.className = "status-box danger-bg";
      resultEl.innerHTML =
        "Unable to connect to the SafeGuardian AI backend. Make sure Spring Boot is running on port 8080.";
      console.error(error);
    }

    button.disabled = false;
    button.textContent = "Analyze";
  });

  initAdvancedAnalysis(textarea);
}

/**
 * Renders a ThreatAssessment-shaped object (riskLevel, threatType,
 * confidence, recommendedAction, automatedResponse, reason, and
 * optionally warnings) into the given target element. Shared by both the
 * simple text-only analyzer (backend rule-based /api/ai/analyze) and the
 * advanced multimodal analyzer (ai-service /analyze/fused), since both
 * return the same shape.
 */
function renderAssessment(data, targetEl) {
  let riskClass = "success-bg";
  if (data.riskLevel === "HIGH") riskClass = "danger-bg";
  else if (data.riskLevel === "MEDIUM") riskClass = "warning-bg";

  const steps = (data.automatedResponse || [])
    .map((step) => `<li>${escapeHtml(step)}</li>`)
    .join("");

  const warnings = (data.warnings || [])
    .map((w) => `<li>${escapeHtml(w)}</li>`)
    .join("");

  targetEl.className = `status-box ${riskClass}`;
  targetEl.innerHTML = `
    <strong>Threat Assessment</strong><br><br>
    <strong>Risk Level:</strong> ${escapeHtml(data.riskLevel || "")}<br>
    <strong>Threat Type:</strong> ${escapeHtml(data.threatType || "")}<br>
    <strong>Confidence:</strong> ${escapeHtml(String(data.confidence ?? ""))}%<br><br>
    <strong>Recommended Action:</strong><br>
    ${escapeHtml(data.recommendedAction || "")}<br><br>
    ${steps ? `<strong>Automated Response:</strong><ul class="sos-result-list">${steps}</ul>` : ""}
    <strong>Reason:</strong><br>
    ${escapeHtml(data.reason || "")}
    ${warnings ? `<br><br><strong>Note:</strong><ul class="sos-result-list">${warnings}</ul>` : ""}
    ${
      data.riskLevel === "HIGH"
        ? `<br><br><a href="sos.html" class="btn danger-btn small-btn">Trigger SOS now</a>`
        : ""
    }
  `;
}

/**
 * Camera photo capture + voice recording + the "Run Advanced Analysis"
 * button, which sends whichever of text/photo/audio are present to the
 * separate ai-service (YOLOv11 + OpenCV + MediaPipe + Whisper + PyTorch),
 * called directly from the browser since the ai-service holds no secrets
 * (all WhatsApp/Twilio credentials stay in the Spring Boot backend only).
 */
function initAdvancedAnalysis(textarea) {
  const offlineNotice = document.getElementById("advancedOfflineNotice");
  const analyzeBtn = document.getElementById("advancedAnalyzeBtn");
  if (!analyzeBtn) return; // page doesn't have the advanced section

  let capturedPhotoBlob = null;
  let recordedAudioBlob = null;
  let cameraStream = null;
  let mediaRecorder = null;
  let recordedChunks = [];

  // --- Health check: let the person know up front if the service is down ---
  (async function checkAiServiceHealth() {
    try {
      const res = await fetch(`${AI_SERVICE_BASE_URL}/health`);
      offlineNotice.style.display = res.ok ? "none" : "block";
    } catch {
      offlineNotice.style.display = "block";
    }
  })();

  // --- Camera capture ---
  const video = document.getElementById("cameraPreview");
  const canvas = document.getElementById("cameraCanvas");
  const photoPreview = document.getElementById("capturedPhotoPreview");
  const startCameraBtn = document.getElementById("startCameraBtn");
  const capturePhotoBtn = document.getElementById("capturePhotoBtn");
  const retakePhotoBtn = document.getElementById("retakePhotoBtn");
  const removePhotoBtn = document.getElementById("removePhotoBtn");
  const cameraStatus = document.getElementById("cameraStatus");

  startCameraBtn.addEventListener("click", async function () {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showMessage(cameraStatus, "This browser doesn't support camera access.", "error");
      return;
    }
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      video.srcObject = cameraStream;
      video.style.display = "block";
      await video.play();
      startCameraBtn.style.display = "none";
      capturePhotoBtn.style.display = "inline-flex";
    } catch (error) {
      showMessage(cameraStatus, "Camera access denied or unavailable.", "error");
      console.error(error);
    }
  });

  capturePhotoBtn.addEventListener("click", function () {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      capturedPhotoBlob = blob;
      photoPreview.src = URL.createObjectURL(blob);
      photoPreview.style.display = "block";
      video.style.display = "none";
      capturePhotoBtn.style.display = "none";
      retakePhotoBtn.style.display = "inline-flex";
      removePhotoBtn.style.display = "inline-flex";
      stopCameraStream();
    }, "image/jpeg", 0.9);
  });

  retakePhotoBtn.addEventListener("click", function () {
    capturedPhotoBlob = null;
    photoPreview.style.display = "none";
    retakePhotoBtn.style.display = "none";
    removePhotoBtn.style.display = "none";
    startCameraBtn.style.display = "inline-flex";
    startCameraBtn.click();
  });

  removePhotoBtn.addEventListener("click", function () {
    capturedPhotoBlob = null;
    photoPreview.style.display = "none";
    retakePhotoBtn.style.display = "none";
    removePhotoBtn.style.display = "none";
    startCameraBtn.style.display = "inline-flex";
  });

  function stopCameraStream() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      cameraStream = null;
    }
  }

  // --- Voice recording ---
  const recordVoiceBtn = document.getElementById("recordVoiceBtn");
  const removeVoiceBtn = document.getElementById("removeVoiceBtn");
  const voicePreview = document.getElementById("voicePreview");
  const voiceStatus = document.getElementById("voiceStatus");

  recordVoiceBtn.addEventListener("click", async function () {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      showMessage(voiceStatus, "This browser doesn't support voice recording.", "error");
      return;
    }

    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordedChunks = [];
      mediaRecorder = new MediaRecorder(micStream);

      mediaRecorder.addEventListener("dataavailable", (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
      });

      mediaRecorder.addEventListener("stop", () => {
        recordedAudioBlob = new Blob(recordedChunks, { type: "audio/webm" });
        voicePreview.src = URL.createObjectURL(recordedAudioBlob);
        voicePreview.style.display = "block";
        removeVoiceBtn.style.display = "inline-flex";
        recordVoiceBtn.textContent = "🎤 Record Voice";
        recordVoiceBtn.classList.remove("recording");
        micStream.getTracks().forEach((track) => track.stop());
      });

      mediaRecorder.start();
      recordVoiceBtn.textContent = "⏹ Stop Recording";
      recordVoiceBtn.classList.add("recording");
    } catch (error) {
      showMessage(voiceStatus, "Microphone access denied or unavailable.", "error");
      console.error(error);
    }
  });

  removeVoiceBtn.addEventListener("click", function () {
    recordedAudioBlob = null;
    voicePreview.style.display = "none";
    voicePreview.removeAttribute("src");
    removeVoiceBtn.style.display = "none";
  });

  // --- Run Advanced Analysis ---
  const advancedResultEl = document.getElementById("advancedResult");

  analyzeBtn.addEventListener("click", async function () {
    const text = textarea.value.trim();

    if (!text && !capturedPhotoBlob && !recordedAudioBlob) {
      showMessage(voiceStatus, "Add text, a photo, or a voice recording first.", "error");
      return;
    }

    analyzeBtn.disabled = true;
    analyzeBtn.textContent = "Analyzing...";
    advancedResultEl.style.display = "block";
    advancedResultEl.className = "status-box";
    advancedResultEl.innerHTML = "Running multimodal analysis (this can take a few seconds)...";

    const formData = new FormData();
    if (text) formData.append("text", text);
    if (capturedPhotoBlob) formData.append("image", capturedPhotoBlob, "capture.jpg");
    if (recordedAudioBlob) formData.append("audio", recordedAudioBlob, "recording.webm");

    try {
      const response = await fetch(`${AI_SERVICE_BASE_URL}/analyze/fused`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) throw new Error(`AI service returned ${response.status}`);

      const data = await response.json();
      renderAssessment(data, advancedResultEl);

    } catch (error) {
      advancedResultEl.className = "status-box danger-bg";
      advancedResultEl.innerHTML =
        `Unable to reach the advanced AI service at ${AI_SERVICE_BASE_URL}. ` +
        `Make sure it's running (see ai-service/README.md).`;
      console.error(error);
    }

    analyzeBtn.disabled = false;
    analyzeBtn.textContent = "Run Advanced Analysis";
  });
}

/* =====================================================
   HTML ESCAPE
   ===================================================== */

function escapeHtml(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}

/* =====================================================
   SERVICE WORKER
   ===================================================== */

function registerSW() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", function () {
    navigator.serviceWorker.register("service-worker.js")
      .then(() => console.log("SafeGuardian AI Service Worker registered"))
      .catch((err) => console.error("Service Worker registration failed:", err));
  });
}

/* =====================================================
   PAGE ROUTER
   ===================================================== */

document.addEventListener("DOMContentLoaded", function () {
  buildNavbar();
  registerSW();

  const page = location.pathname.split("/").pop() || "index.html";

  if (page !== "index.html") {
    requireLogin();
  }

  switch (page) {
    case "index.html":
    case "":
      initLoginPage();
      break;
    case "dashboard.html":
      initDashboardPage();
      break;
    case "contacts.html":
      initContactsPage();
      break;
    case "sos.html":
      initSOSPage();
      break;
    case "ai.html":
      initAIPage();
      break;
    default:
      break;
  }
});
