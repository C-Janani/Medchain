/* ==========================================================================
   demo.js - public DEMO MODE (no login). Loaded before api.js / blockchain.js.

   Demo mode talks ONLY to /api/demo/* (read-only, fictional in-memory data).
   It never sends a token and never touches the protected /api/* endpoints,
   so it cannot read or change real records.
   ========================================================================== */

const RxDemo = (function () {
  const FLAG = "rxchain_demo";
  const TOKEN_KEY = "rxchain_token";
  const USER_KEY = "rxchain_user";

  const USERS = {
    doctor:   { id: "demo-doc",  registrationId: "DOC-DEMO", name: "Dr. Asha Venkat (Demo)", role: "doctor", demo: true },
    patient:  { id: "demo-pat",  registrationId: "PAT-DEMO", name: "Priya Sample", role: "patient", demo: true },
    pharmacy: { id: "demo-phr",  registrationId: "PHR-DEMO", name: "Sample Care Pharmacy (Demo)", role: "pharmacy", demo: true },
    admin:    { id: "demo-adm",  registrationId: "ADM-DEMO", name: "Demo Administrator", role: "admin", demo: true },
  };

  const HOME = {
    doctor: "/pages/doctor/doctor-dashboard.html",
    patient: "/pages/patient/patient-dashboard.html",
    pharmacy: "/pages/pharmacy/pharmacy-dashboard.html",
    admin: "/pages/admin/admin-dashboard.html",
  };

  const isDemo = () => localStorage.getItem(FLAG) === "1";

  // One place that decides where the API lives (same origin in production).
  function apiBase() {
    const { protocol, hostname, port } = window.location;
    let root;
    if (protocol === "file:") root = "http://localhost:5000";
    else if (port && port !== "5000" && /^(localhost|127\.0\.0\.1)$/.test(hostname)) root = "http://" + hostname + ":5000"; // static dev server
    else root = ""; // same origin (Render, or localhost:5000)
    return root + (isDemo() ? "/api/demo" : "/api");
  }

  function start(role) {
    const user = USERS[role];
    if (!user) return;
    localStorage.setItem(FLAG, "1");
    localStorage.setItem(TOKEN_KEY, "demo-session"); // marker only, never sent to the server
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    window.location.href = HOME[role];
  }

  function clear() {
    localStorage.removeItem(FLAG);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function exit() {
    clear();
    window.location.href = "/index.html";
  }

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ---------- banner ---------- */
  function banner() {
    if (!isDemo() || document.getElementById("rxDemoBar")) return;
    const style = document.createElement("style");
    style.textContent = `
      #rxDemoBar{position:fixed;top:0;left:0;right:0;z-index:99999;background:#7a4b00;color:#fff;font:500 13px/1.3 "IBM Plex Sans",system-ui,sans-serif;
        display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;justify-content:center;padding:6px 12px;box-shadow:0 1px 4px rgba(0,0,0,.3)}
      #rxDemoBar b{background:#ffd166;color:#3b2500;border-radius:4px;padding:1px 7px;letter-spacing:.06em}
      #rxDemoBar a,#rxDemoBar button{color:#fff;background:rgba(255,255,255,.14);border:0;border-radius:4px;padding:2px 9px;cursor:pointer;font:inherit;text-decoration:none}
      #rxDemoBar a:hover,#rxDemoBar button:hover{background:rgba(255,255,255,.3)}
      #rxDemoBar a.cur{background:#fff;color:#7a4b00}
      body{padding-top:var(--rx-demo-h,56px) !important}
      .dash-sidebar{top:var(--rx-demo-h,56px) !important}
      .rx-demo-note{border:1px dashed #b7791f;background:#fff8e6;color:#5a3b00;border-radius:8px;padding:12px 14px;margin:14px 0;font-size:.88rem}`;
    document.head.appendChild(style);

    const role = (JSON.parse(localStorage.getItem(USER_KEY) || "{}") || {}).role;
    const bar = document.createElement("div");
    bar.id = "rxDemoBar";
    bar.innerHTML = `<b>DEMO MODE</b><span>Fictional data, read-only. Simulated SHA-256 hash chain, not a public blockchain network.</span>` +
      Object.keys(HOME).map((r) => `<a href="${HOME[r]}" data-role="${r}" class="${r === role ? "cur" : ""}">${r[0].toUpperCase() + r.slice(1)}</a>`).join("") +
      `<button type="button" id="rxDemoExit">Exit demo</button>`;
    document.body.prepend(bar);
    bar.querySelectorAll("a[data-role]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); start(a.dataset.role); }));
    document.getElementById("rxDemoExit").addEventListener("click", exit);
    document.documentElement.style.setProperty("--rx-demo-h", bar.offsetHeight + "px");
    window.addEventListener("resize", () => document.documentElement.style.setProperty("--rx-demo-h", bar.offsetHeight + "px"));
  }

  /* ---------- pharmacy: sample QR codes to try ---------- */
  async function samplePanel() {
    if (!isDemo() || !/\/pharmacy\/(scan-qr|pharmacy-dashboard)\.html$/.test(location.pathname)) return;
    const main = document.querySelector(".dash-main");
    if (!main) return;
    try {
      const res = await fetch(apiBase() + "/samples");
      const { samples } = await res.json();
      const wrap = document.createElement("div");
      wrap.className = "panel";
      wrap.innerHTML = `<div class="panel-head"><h2>Demo sample QR codes</h2></div>
        <p class="rx-demo-note" style="margin-top:0">No camera needed. Click a sample to verify it against the demo hash chain. The last one is a <b>forged QR</b> (wrong token) and must be rejected.</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px">` +
        samples.map((s) => `<a href="/pages/pharmacy/verify-prescription.html?id=${encodeURIComponent(s.prescriptionId)}&token=${encodeURIComponent(s.qrToken)}"
           style="display:block;border:1px solid #d9dee7;border-radius:8px;padding:10px;text-align:center;text-decoration:none;color:inherit;background:#fff">
           <img src="${esc(s.qrCode)}" alt="QR" style="width:120px;height:120px">
           <div class="mono" style="font-size:.74rem">${esc(s.prescriptionId)}</div>
           <div style="font-size:.8rem">${esc(s.medicines)}</div>
           <div style="font-size:.74rem;opacity:.75">${esc(s.status)}</div></a>`).join("") + `</div>`;
      main.appendChild(wrap);
    } catch (e) { /* samples are optional */ }
  }

  document.addEventListener("DOMContentLoaded", () => { banner(); samplePanel(); });

  return { isDemo, apiBase, start, exit, clear, USERS, HOME, esc };
})();
