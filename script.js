/**
 * =========================================================
 *  CHAITANYA BADMINTON ACADEMY — SHARED APPLICATION LOGIC
 *  Vanilla JS only. Talks to the Google Apps Script Web App
 *  defined in CONFIG.apiUrl. No backend framework required.
 * =========================================================
 */

/* ---------------------------------------------------------
   1. GENERIC HELPERS
--------------------------------------------------------- */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function genBookingId() {
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CBA-${Date.now().toString().slice(-6)}${rnd}`;
}

function formatDateLong(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

/** Wraps all Apps Script calls. GET for reads, POST (text/plain to avoid CORS preflight) for writes. */
async function apiGet(params) {
  const url = new URL(CONFIG.apiUrl);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Network error");
  return res.json();
}

async function apiPost(payload) {
  const res = await fetch(CONFIG.apiUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // avoids CORS preflight on Apps Script
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Network error");
  return res.json();
}

/* ---------------------------------------------------------
   2. NAVBAR — scroll state + mobile toggle
--------------------------------------------------------- */
function initNavbar() {
  const nav = $(".navbar");
  const toggle = $(".nav-toggle");
  const links = $(".nav-links");
  if (!nav) return;

  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 40);
  });

  toggle?.addEventListener("click", () => links.classList.toggle("open"));
  $$(".nav-links a").forEach(a => a.addEventListener("click", () => links.classList.remove("open")));
}

/* ---------------------------------------------------------
   3. SCROLL REVEAL
--------------------------------------------------------- */
function initReveal() {
  const els = $$(".reveal");
  if (!els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.15 });
  els.forEach(el => io.observe(el));
}

/* ---------------------------------------------------------
   4. RENDER COURTS (home + booking page)
--------------------------------------------------------- */
function courtCardHTML(court, opts = {}) {
  const statusClass = opts.busy ? "busy" : "available";
  const statusLabel = opts.busy ? "In Use Now" : "Available";
  return `
  <div class="court-card reveal">
    <div class="court-img">
      <svg viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="4" width="72" height="52" rx="2" stroke="white" stroke-width="1.4"/>
        <line x1="4" y1="30" x2="76" y2="30" stroke="white" stroke-width="1.4"/>
        <line x1="40" y1="4" x2="40" y2="56" stroke="white" stroke-width="1" stroke-dasharray="2 2"/>
        <rect x="12" y="4" width="56" height="52" stroke="white" stroke-width="0.8" opacity="0.6"/>
      </svg>
      <span class="court-status ${statusClass}">${statusLabel}</span>
    </div>
    <div class="court-body">
      <h3>${court.name}</h3>
      <div class="court-meta">
        <span><i class="fa-solid fa-layer-group"></i>${court.flooring}</span>
        <span><i class="fa-solid fa-house"></i>${court.indoor ? "Indoor" : "Outdoor"}</span>
      </div>
      ${opts.withBookBtn !== false ? `<button class="btn btn-primary" style="width:100%" onclick="openBookingModal('${court.id}')">Book Now</button>` : ""}
    </div>
  </div>`;
}

function renderCourts(targetSelector, opts = {}) {
  const target = $(targetSelector);
  if (!target) return;
  target.innerHTML = CONFIG.courts.map(c => courtCardHTML(c, opts)).join("");
  initReveal();
}

/* ---------------------------------------------------------
   5. BOOKING MODAL + FORM SUBMISSION
--------------------------------------------------------- */
function populateFormOptions() {
  const courtSel = $("#bk-court");
  const slotSel = $("#bk-slot");
  if (courtSel) {
    courtSel.innerHTML = `<option value="">Select court</option>` +
      CONFIG.courts.map(c => `<option value="${c.name}">${c.name}</option>`).join("");
  }
  if (slotSel) {
    slotSel.innerHTML = `<option value="">Select time slot</option>` +
      CONFIG.timeSlots.map(s => `<option value="${s}">${s}</option>`).join("");
  }
}

function openBookingModal(courtId) {
  const overlay = $("#booking-modal");

  if (overlay) {
    // Home page (index.html) uses a real modal.
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
    if (courtId) {
      const court = CONFIG.courts.find(c => c.id === courtId);
      if (court && $("#bk-court")) $("#bk-court").value = court.name;
    }
    return;
  }

  const courtSelect = $("#bk-court");
  const formSection = $("#booking-form-section");
  if (courtSelect && formSection) {
    // Already on booking.html — select the court and scroll to the form directly,
    // instead of changing the URL hash (which doesn't trigger a page reload here).
    if (courtId) {
      const court = CONFIG.courts.find(c => c.id === courtId);
      if (court) courtSelect.value = court.name;
    }
    formSection.scrollIntoView({ behavior: "smooth" });
    return;
  }

  // Any other page without a form or modal — navigate to the booking page.
  window.location.href = "booking.html" + (courtId ? `#${courtId}` : "");
}

function closeBookingModal() {
  const overlay = $("#booking-modal");
  overlay?.classList.remove("open");
  document.body.style.overflow = "";
}

/** Checks Apps Script for slot availability before allowing submission. */
async function checkSlotAvailability(court, date, slot) {
  try {
    const data = await apiGet({ action: "checkSlot", court, date, slot });
    return data.available !== false; // default to available if unclear, so bookings aren't blocked by network hiccups
  } catch (err) {
    console.warn("Slot check failed, allowing submission:", err);
    return true;
  }
}

function buildWhatsAppBookingMessage(booking) {
  const msg =
`Hello ${CONFIG.academyName}!

I'd like to book a court:

Name: ${booking.name}
Mobile: ${booking.mobile}
Court: ${booking.court}
Date: ${formatDateLong(booking.date)}
Time: ${booking.slot}
Players: ${booking.players}
Purpose: ${booking.purpose}

Booking ID: ${booking.bookingId}`;
  return `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(msg)}`;
}

async function handleBookingSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = $("button[type=submit]", form);
  const msgBox = $("#booking-msg");
  const originalLabel = submitBtn.innerHTML;

  const booking = {
    bookingId: genBookingId(),
    name: form.name.value.trim(),
    mobile: form.mobile.value.trim(),
    email: form.email.value.trim(),
    court: form.court.value,
    date: form.date.value,
    slot: form.slot.value,
    players: form.players.value,
    purpose: form.purpose.value,
    notes: form.notes.value.trim(),
  };

  if (!booking.name || !booking.mobile || !booking.court || !booking.date || !booking.slot) {
    showFormMessage(msgBox, "Please fill all required fields.", "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="spinner"></span> Checking availability...`;

  const isAvailable = await checkSlotAvailability(booking.court, booking.date, booking.slot);
  if (!isAvailable) {
    showFormMessage(msgBox, "This slot is already booked. Please choose another time or court.", "error");
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalLabel;
    markSlotUnavailableInUI();
    return;
  }

  submitBtn.innerHTML = `<span class="spinner"></span> Submitting...`;

  try {
    const result = await apiPost({ action: "create", ...booking });
    if (result.status !== "success") throw new Error(result.message || "Submission failed");

    showFormMessage(msgBox, "Your booking request has been submitted successfully.", "success");
    renderWhatsAppCTA(booking);
    form.reset();
  } catch (err) {
    console.error(err);
    showFormMessage(msgBox, "Something went wrong reaching the server. Please try again or WhatsApp us directly.", "error");
    renderWhatsAppCTA(booking, true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalLabel;
  }
}

function showFormMessage(box, text, type) {
  if (!box) return;
  box.textContent = text;
  box.className = `form-msg show ${type}`;
}

function renderWhatsAppCTA(booking, fallback = false) {
  const waBox = $("#wa-cta");
  if (!waBox) return;
  const link = buildWhatsAppBookingMessage(booking);
  waBox.innerHTML = `
    <a href="${link}" target="_blank" class="btn" style="background:#25D366;color:#fff;margin-top:14px;width:100%">
      <i class="fa-brands fa-whatsapp"></i> ${fallback ? "Send booking via WhatsApp instead" : "Send confirmation via WhatsApp"}
    </a>`;
}

function markSlotUnavailableInUI() {
  const slotSel = $("#bk-slot");
  if (!slotSel) return;
  const opt = [...slotSel.options].find(o => o.value === slotSel.value);
  if (opt) opt.classList.add("slot-unavailable");
}

/* ---------------------------------------------------------
   6. ADMIN DASHBOARD
--------------------------------------------------------- */
const AdminState = { bookings: [], filtered: [], view: "monthly", overrides: [], token: null };

/* ---------------------------------------------------------
   6a. ADMIN LOGIN
--------------------------------------------------------- */
const ADMIN_TOKEN_KEY = "cba_admin_token";
const ADMIN_TOKEN_EXPIRY_KEY = "cba_admin_token_expiry";

function saveAdminSession(token) {
  const expiry = Date.now() + CONFIG.adminSessionHours * 60 * 60 * 1000;
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  sessionStorage.setItem(ADMIN_TOKEN_EXPIRY_KEY, String(expiry));
  AdminState.token = token;
}

function loadAdminSession() {
  const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  const expiry = Number(sessionStorage.getItem(ADMIN_TOKEN_EXPIRY_KEY) || 0);
  if (token && Date.now() < expiry) {
    AdminState.token = token;
    return true;
  }
  clearAdminSession();
  return false;
}

function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  sessionStorage.removeItem(ADMIN_TOKEN_EXPIRY_KEY);
  AdminState.token = null;
}

function showAdminDashboard() {
  $("#admin-login-screen")?.style && ($("#admin-login-screen").style.display = "none");
  $("#admin-shell")?.style && ($("#admin-shell").style.display = "flex");
  initAdminFilters();
  loadBookings();
}

function showAdminLogin(message) {
  $("#admin-shell")?.style && ($("#admin-shell").style.display = "none");
  $("#admin-login-screen")?.style && ($("#admin-login-screen").style.display = "flex");
  if (message) showFormMessage($("#admin-login-msg"), message, "error");
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const form = e.target;
  const btn = $("button[type=submit]", form);
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Checking...`;

  try {
    const result = await apiPost({ action: "login", password: form.password.value });
    if (result.status === "success" && result.token) {
      saveAdminSession(result.token);
      form.reset();
      showAdminDashboard();
    } else {
      showAdminLogin(result.message || "Incorrect password.");
    }
  } catch (err) {
    showAdminLogin("Could not reach the server. Check your connection and the Apps Script URL in config.js.");
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
}

function handleAdminLogout(e) {
  e?.preventDefault();
  clearAdminSession();
  showAdminLogin();
}

/** Wraps a protected admin call; if the token was rejected server-side, bounce back to login. */
async function apiPostProtected(payload) {
  const result = await apiPost({ ...payload, token: AdminState.token });
  if (result.authError) {
    clearAdminSession();
    showAdminLogin("Your session expired. Please log in again.");
    throw new Error("Not authorized");
  }
  return result;
}

async function loadBookings() {
  const tbody = $("#bookings-tbody");
  if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><span class="spinner dark"></span> Loading bookings...</td></tr>`;
  try {
    const data = await apiGet({ action: "list" });
    AdminState.bookings = data.bookings || [];
    AdminState.overrides = data.overrides || [];
    AdminState.filtered = AdminState.bookings;
    renderStats();
    renderTable();
    renderCalendar();
    renderSlotControl();
  } catch (err) {
    console.error(err);
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i>Could not load bookings. Check the Apps Script URL in config.js.</td></tr>`;
  }
}

function renderStats() {
  const all = AdminState.bookings;
  const today = new Date().toISOString().slice(0, 10);
  const total = all.length;
  const pending = all.filter(b => b.status === "Pending").length;
  const confirmed = all.filter(b => b.status === "Confirmed").length;
  const cancelled = all.filter(b => b.status === "Cancelled").length;
  const todays = all.filter(b => b.date === today).length;

  const set = (id, val) => { const el = $(id); if (el) el.textContent = val; };
  set("#stat-total", total);
  set("#stat-pending", pending);
  set("#stat-confirmed", confirmed);
  set("#stat-cancelled", cancelled);
  set("#stat-today", todays);

  // analytics
  const courtCounts = {};
  const hourCounts = {};
  all.forEach(b => {
    courtCounts[b.court] = (courtCounts[b.court] || 0) + 1;
    hourCounts[b.slot] = (hourCounts[b.slot] || 0) + 1;
  });
  const topCourt = Object.entries(courtCounts).sort((a, b) => b[1] - a[1])[0];
  const topHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
  set("#stat-top-court", topCourt ? topCourt[0] : "—");
  set("#stat-top-hour", topHour ? topHour[0] : "—");
}

function badgeHTML(status) {
  const cls = status.toLowerCase();
  return `<span class="badge ${cls}">${status}</span>`;
}

function renderTable() {
  const tbody = $("#bookings-tbody");
  if (!tbody) return;
  const rows = AdminState.filtered;
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-calendar-xmark"></i>No bookings match these filters.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(b => `
    <tr>
      <td class="mono">${b.bookingId}</td>
      <td>${b.name}<br><span style="color:var(--ink-soft);font-size:0.78rem">${b.mobile}</span></td>
      <td>${b.court}</td>
      <td>${formatDateLong(b.date)}</td>
      <td>${b.slot}</td>
      <td>${badgeHTML(b.status)}</td>
      <td>
        <div class="row-actions">
          <button class="confirm" onclick="updateBookingStatus('${b.bookingId}','Confirmed')" ${b.status === "Confirmed" ? "disabled" : ""}>Confirm</button>
          <button class="reject" onclick="updateBookingStatus('${b.bookingId}','Cancelled')" ${b.status === "Cancelled" ? "disabled" : ""}>Reject</button>
          <a class="wa" href="${buildAdminWhatsAppLink(b)}" target="_blank" rel="noopener" title="Send WhatsApp message"><i class="fa-brands fa-whatsapp"></i></a>
          <button onclick="deleteBooking('${b.bookingId}')">Delete</button>
        </div>
      </td>
    </tr>`).join("");
}

async function updateBookingStatus(bookingId, status) {
  try {
    await apiPostProtected({ action: "updateStatus", bookingId, status });
    const b = AdminState.bookings.find(x => x.bookingId === bookingId);
    if (b) b.status = status;
    applyFilters();
    renderStats();
    renderCalendar();
  } catch (err) {
    if (err.message !== "Not authorized") alert("Could not update status. Please check your connection and try again.");
  }
}

async function deleteBooking(bookingId) {
  if (!confirm(`Delete booking ${bookingId}? This cannot be undone.`)) return;
  try {
    await apiPostProtected({ action: "delete", bookingId });
    AdminState.bookings = AdminState.bookings.filter(b => b.bookingId !== bookingId);
    applyFilters();
    renderStats();
    renderCalendar();
  } catch (err) {
    if (err.message !== "Not authorized") alert("Could not delete booking. Please try again.");
  }
}

/** Builds a wa.me link with a message worded for the booking's current status — used directly as an <a href>, not via window.open(), so popup blockers can't interfere. */
function buildAdminWhatsAppLink(b) {
  let statusLine;
  if (b.status === "Confirmed") {
    statusLine = "Your booking has been confirmed! ✅";
  } else if (b.status === "Cancelled") {
    statusLine = "Unfortunately, we're unable to confirm this booking request. ❌";
  } else {
    statusLine = "We've received your booking request and it's pending confirmation.";
  }

  const arriveLine = b.status === "Confirmed" ? "\n\nPlease arrive 10 minutes before your scheduled slot." : "";

  const msg =
`Hello ${b.name},

${statusLine}

🏸 ${CONFIG.academyName}

Court: ${b.court}
Date: ${formatDateLong(b.date)}
Time: ${b.slot}${arriveLine}

Thank you!`;

  const digits = (b.mobile || "").replace(/\D/g, "").slice(-10);
  return `https://wa.me/91${digits}?text=${encodeURIComponent(msg)}`;
}

function applyFilters() {
  const search = ($("#f-search")?.value || "").toLowerCase();
  const date = $("#f-date")?.value || "";
  const court = $("#f-court")?.value || "";
  const status = $("#f-status")?.value || "";

  AdminState.filtered = AdminState.bookings.filter(b => {
    const matchesSearch = !search || b.name.toLowerCase().includes(search) || b.mobile.includes(search) || b.bookingId.toLowerCase().includes(search);
    const matchesDate = !date || b.date === date;
    const matchesCourt = !court || b.court === court;
    const matchesStatus = !status || b.status === status;
    return matchesSearch && matchesDate && matchesCourt && matchesStatus;
  });
  renderTable();
}

function initAdminFilters() {
  const courtSel = $("#f-court");
  if (courtSel) {
    courtSel.innerHTML = `<option value="">All courts</option>` + CONFIG.courts.map(c => `<option>${c.name}</option>`).join("");
  }
  ["#f-search", "#f-date", "#f-court", "#f-status"].forEach(sel => {
    $(sel)?.addEventListener("input", applyFilters);
    $(sel)?.addEventListener("change", applyFilters);
  });
}

/* ---------- Calendar view ---------- */
function setCalendarView(view) {
  AdminState.view = view;
  $$(".view-tabs button").forEach(b => b.classList.toggle("active", b.dataset.view === view));
  renderCalendar();
}

function statusDots(dateStr) {
  const dayBookings = AdminState.bookings.filter(b => b.date === dateStr);
  const has = s => dayBookings.some(b => b.status === s);
  let dots = "";
  if (has("Confirmed")) dots += `<span class="dot confirmed"></span>`;
  if (has("Pending")) dots += `<span class="dot pending"></span>`;
  if (has("Cancelled")) dots += `<span class="dot cancelled"></span>`;
  return dots;
}

function renderCalendar() {
  const cal = $("#calendar-grid");
  if (!cal) return;
  const today = new Date();
  let days = [];

  if (AdminState.view === "daily") {
    days = [today];
  } else if (AdminState.view === "weekly") {
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    days = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  } else {
    const year = today.getFullYear(), month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    days = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
  }

  cal.style.gridTemplateColumns = AdminState.view === "daily" ? "1fr" : "repeat(7, 1fr)";
  cal.innerHTML = days.map(d => {
    const dateStr = d.toISOString().slice(0, 10);
    return `<div class="cal-cell">
      <div class="date-num">${d.getDate()} ${d.toLocaleDateString("en-IN", { month: "short" })}</div>
      <div class="cal-dot-row">${statusDots(dateStr)}</div>
    </div>`;
  }).join("");
}

/* ---------- Manual Slot Availability Control (admin yes/no override) ---------- */
function initSlotControl() {
  const courtSel = $("#sc-court");
  const dateInp = $("#sc-date");
  if (courtSel) courtSel.innerHTML = CONFIG.courts.map(c => `<option>${c.name}</option>`).join("");
  if (dateInp && !dateInp.value) dateInp.value = new Date().toISOString().slice(0, 10);
  courtSel?.addEventListener("change", renderSlotControl);
  dateInp?.addEventListener("change", renderSlotControl);
}

function overrideFor(court, date, slot) {
  return AdminState.overrides.find(o => o.court === court && o.date === date && o.slot === slot);
}

function isSlotConfirmedBooked(court, date, slot) {
  return AdminState.bookings.some(b => b.court === court && b.date === date && b.slot === slot && b.status === "Confirmed");
}

function renderSlotControl() {
  const grid = $("#slot-control-grid");
  if (!grid) return;
  const court = $("#sc-court")?.value || CONFIG.courts[0].name;
  const date = $("#sc-date")?.value || new Date().toISOString().slice(0, 10);

  grid.innerHTML = CONFIG.timeSlots.map(slot => {
    const override = overrideFor(court, date, slot);
    const blocked = override && override.status === "Blocked";
    const bookedOut = !override && isSlotConfirmedBooked(court, date, slot);
    const isOpen = !blocked && !bookedOut;

    let stateLabel = "Open";
    let stateClass = "confirmed";
    if (blocked) { stateLabel = "Blocked by admin"; stateClass = "cancelled"; }
    else if (bookedOut) { stateLabel = "Booked (confirmed)"; stateClass = "pending"; }

    return `
      <div class="stat-card" style="padding:16px">
        <div style="font-weight:700;font-size:0.88rem;color:var(--court-navy)">${slot}</div>
        <div class="badge ${stateClass}" style="margin:8px 0">${stateLabel}</div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn btn-sm" style="background:${isOpen ? 'var(--status-confirmed)' : 'var(--mist)'};color:${isOpen ? '#fff' : 'var(--ink-soft)'}"
            onclick="toggleSlotOverride('${court}','${date}','${slot}','Available')" ${bookedOut ? "disabled title='Cancel the confirmed booking first'" : ""}>Yes</button>
          <button class="btn btn-sm" style="background:${blocked ? 'var(--status-cancelled)' : 'var(--mist)'};color:${blocked ? '#fff' : 'var(--ink-soft)'}"
            onclick="toggleSlotOverride('${court}','${date}','${slot}','Blocked')">No</button>
        </div>
      </div>`;
  }).join("");
}

async function toggleSlotOverride(court, date, slot, status) {
  try {
    await apiPostProtected({ action: "toggleSlot", court, date, slot, status });
    AdminState.overrides = AdminState.overrides.filter(o => !(o.court === court && o.date === date && o.slot === slot));
    if (status === "Blocked") AdminState.overrides.push({ court, date, slot, status: "Blocked" });
    renderSlotControl();
  } catch (err) {
    if (err.message !== "Not authorized") alert("Could not update this slot. Please try again.");
  }
}

/* ---------- Export CSV ---------- */
function exportBookingsCSV() {
  const rows = AdminState.filtered;
  const headers = ["Booking ID", "Name", "Mobile", "Email", "Court", "Date", "Slot", "Players", "Purpose", "Status"];
  const csv = [headers.join(",")].concat(
    rows.map(b => [b.bookingId, b.name, b.mobile, b.email, b.court, b.date, b.slot, b.players, b.purpose, b.status]
      .map(v => `"${(v || "").toString().replace(/"/g, '""')}"`).join(","))
  ).join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------------------------------------------------------
   7. INIT
--------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  initNavbar();
  initReveal();

  if ($("#courts-grid")) renderCourts("#courts-grid");
  if ($("#courts-grid-full")) renderCourts("#courts-grid-full");
  if ($("#bk-court")) populateFormOptions();
  if ($("#booking-form")) $("#booking-form").addEventListener("submit", handleBookingSubmit);

  if ($("#admin-login-form")) $("#admin-login-form").addEventListener("submit", handleAdminLogin);
  if ($("#admin-logout-btn")) $("#admin-logout-btn").addEventListener("click", handleAdminLogout);

  if ($("#bookings-tbody")) {
    initSlotControl();
    if (loadAdminSession()) {
      showAdminDashboard();
    } else {
      showAdminLogin();
    }
  }

  // Set min date on date pickers to today
  $$('input[type="date"]').forEach(inp => { inp.min = new Date().toISOString().slice(0, 10); });

  // WhatsApp float link
  $$(".wa-float").forEach(el => {
    el.href = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent("Hi! I'd like to know more about " + CONFIG.academyName)}`;
  });
});
