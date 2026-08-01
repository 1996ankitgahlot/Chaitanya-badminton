/**
 * =========================================================
 *  CHAITANYA BADMINTON ACADEMY — SITE CONFIGURATION
 * =========================================================
 *  Edit ONLY this file to rebrand, retarget, or reconnect
 *  the site to a new Apps Script backend. Nothing else in
 *  the codebase should need to change.
 * =========================================================
 */

const CONFIG = {
  // ---- Academy identity ----
  academyName: "Chaitanya Badminton Academy",
  academyNameHindi: "चैतन्य बैडमिंटन एकेडमी",
  tagline: "Train. Compete. Win.",
  address: "14/25, 15, Z Block, 21, near Nav Uday Covent School, Kashmiri Colony Gali No-12, Prem Nagar, Najafgarh, Delhi, 110043",
  email: "info@chaitanyabadminton.in",
  website: "https://chaitanyabadminton.in",
  rating: 4.7,
  reviewCount: 459,

  // ---- Contact ----
  whatsappNumber: "919911794080", // country code + number, no + or spaces
  phoneNumber: "09911794080",

  // ---- Google Apps Script Web App URL ----
  // Deploy google-apps-script.js as a Web App (see SETUP-GUIDE.md)
  // and paste the /exec URL below.
  apiUrl: "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec",

  // ---- Google Maps (real pinned coordinates) ----
  mapsEmbedUrl: "https://www.google.com/maps?q=28.598338804948032,76.97617734710417&z=17&output=embed",
  mapsLinkUrl: "https://www.google.com/maps/search/?api=1&query=28.598338804948032,76.97617734710417",

  // ---- Opening hours (same every day per listing) ----
  openingHours: {
    weekdays: "5:00 AM – 10:30 PM",
    weekends: "5:00 AM – 10:30 PM",
  },

  // ---- Admin session ----
  // Real authentication happens server-side in Apps Script (see SETUP-GUIDE.md,
  // "Set the admin password"). This just controls how long a login lasts in the
  // browser before the admin has to re-enter the password.
  adminSessionHours: 8,

  // ---- Courts ----
  courtCount: 6,
  courts: [
    { id: "court-1", name: "Court 1", flooring: "Synthetic Wooden", indoor: true, image: "assets/court-1.jpg" },
    { id: "court-2", name: "Court 2", flooring: "Synthetic Wooden", indoor: true, image: "assets/court-2.jpg" },
    { id: "court-3", name: "Court 3", flooring: "Synthetic Mat", indoor: true, image: "assets/court-3.jpg" },
    { id: "court-4", name: "Court 4", flooring: "Synthetic Mat", indoor: true, image: "assets/court-4.jpg" },
    { id: "court-5", name: "Court 5", flooring: "Synthetic Wooden", indoor: true, image: "assets/court-5.jpg" },
    { id: "court-6", name: "Court 6", flooring: "Synthetic Wooden", indoor: true, image: "assets/court-6.jpg" },
  ],

  // ---- Time slots offered for booking (1-hour blocks) ----
  timeSlots: [
    "6:00 AM – 7:00 AM", "7:00 AM – 8:00 AM", "8:00 AM – 9:00 AM", "9:00 AM – 10:00 AM",
    "10:00 AM – 11:00 AM", "5:00 PM – 6:00 PM", "6:00 PM – 7:00 PM", "7:00 PM – 8:00 PM",
    "8:00 PM – 9:00 PM", "9:00 PM – 10:00 PM", "10:00 PM – 11:00 PM",
  ],

  // ---- Pricing (₹ per hour — every session is a 1-hour slot) ----
  pricing: [
    { plan: "1 Hour Session", price: "₹300 / hour / court", note: "Pay as you play" },
    { plan: "Monthly — Morning", price: "₹2,500 / month", note: "1 hr/day, 6 AM–11 AM" },
    { plan: "Monthly — Evening", price: "₹3,200 / month", note: "1 hr/day, 5 PM–11 PM" },
    { plan: "Coaching Program", price: "₹4,500 / month", note: "Includes coach & drills" },
  ],
};
