/* ==========================================================================
   blockchain.js - RxChain data layer (now backed by the Node/MongoDB API).
   Same RxChain.* interface the pages already use, so no page needs a rewrite.
   Reads/writes go to the backend using the JWT saved at login.
   NOTE: uses synchronous XHR so the existing synchronous page code keeps
   working. Fine for a college project; convert pages to async/await later.
   ========================================================================== */

const RxChain = (function () {
  const TOKEN_KEY = "rxchain_token";
  const USER_KEY = "rxchain_user";
  const AI_PREFIX = "rxchain_ai_";
  const base = () => RxDemo.apiBase();

  let cache = null;

  /* ---------------- HTTP ---------------- */
  function http(method, path, body) {
    const xhr = new XMLHttpRequest();
    xhr.open(method, base() + path, false);
    xhr.setRequestHeader("Content-Type", "application/json");
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && !RxDemo.isDemo()) xhr.setRequestHeader("Authorization", "Bearer " + token);
    try {
      xhr.send(body ? JSON.stringify(body) : null);
    } catch (e) {
      throw new Error("Cannot reach the server. Check your connection and try again.");
    }
    let data = {};
    try { data = JSON.parse(xhr.responseText || "{}"); } catch (e) { /* ignore */ }
    if (xhr.status < 200 || xhr.status >= 300) {
      const err = new Error(data.message || "Request failed (" + xhr.status + ")");
      err.status = xhr.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  // Async version (does not freeze the page). Used by the live safety check,
  // autocomplete, explainer, reminders and the admin security panels.
  async function request(method, path, body) {
    const headers = { "Content-Type": "application/json" };
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && !RxDemo.isDemo()) headers.Authorization = "Bearer " + token;
    let response;
    try {
      response = await fetch(base() + path, {
        method,
        headers,
        body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw new Error("Cannot reach the server. Check your connection and try again.");
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(data.message || "Request failed (" + response.status + ")");
      err.status = response.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  /* ---------------- Session ---------------- */
  function getSession() {
    const raw = localStorage.getItem(USER_KEY);
    const token = localStorage.getItem(TOKEN_KEY);
    if (!raw || !token) return null;
    try {
      const u = JSON.parse(raw);
      return { userId: u.registrationId, name: u.name, role: u.role, id: u.id };
    } catch (e) {
      return null;
    }
  }

  function requireRole(role, loginPath) {
    const session = getSession();
    if (!session || session.role !== role) {
      window.location.href = RxDemo.isDemo() ? RxDemo.HOME[(session && session.role) || role] || "/index.html" : loginPath || "login.html";
      return { userId: "", name: "", role: "" };
    }
    return session;
  }

  function signOut(loginPath) {
    if (RxDemo.isDemo()) { RxDemo.exit(); return; }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = loginPath || "login.html";
  }

  /* ---------------- Mapping backend -> page shape ---------------- */
  function ledgerMap() {
    try {
      const map = {};
      http("GET", "/prescriptions/ledger").blocks.forEach((b) => { map[b.index] = b; });
      return map;
    } catch (e) {
      return {};
    }
  }

  function deriveAi(p) {
    const stored = localStorage.getItem(AI_PREFIX + p.prescriptionId);
    if (stored) { try { return JSON.parse(stored); } catch (e) { /* fall through */ } }
    const a = p.aiAnalysis;
    if (!a || !a.summary) return null;
    const warnings = a.warnings || [];
    const sev = warnings.map((w) => String(w.severity || "").toLowerCase());
    const risk = sev.some((s) => ["high", "severe", "critical"].includes(s)) ? "high"
      : sev.some((s) => ["medium", "moderate", "warning"].includes(s)) ? "moderate" : "low";
    return {
      risk,
      summary: a.summary,
      findings: warnings.length ? warnings.map((w) => w.reason) : ["No interaction or duplication concerns flagged."],
      generatedAt: p.createdAt,
    };
  }

  function normalize(p, ledger, qrCode) {
    const me = getSession() || {};
    const meds = p.medicines || [];
    const join = (k) => meds.map((m) => m[k]).filter(Boolean).join(", ");
    const patient = p.patient && typeof p.patient === "object" ? p.patient : null;
    const doctor = p.doctor && typeof p.doctor === "object" ? p.doctor : null;
    const disp = p.dispensedBy && typeof p.dispensedBy === "object" ? p.dispensedBy : null;
    const blockIndex = p.blockchain ? p.blockchain.blockIndex : undefined;
    const block = ledger && blockIndex !== undefined ? ledger[blockIndex] : null;
    return {
      id: p.prescriptionId,
      prescriptionId: p.prescriptionId,
      patientId: patient ? patient.registrationId : (me.role === "patient" ? me.userId : ""),
      patientName: patient ? patient.name : (me.role === "patient" ? me.name : ""),
      doctorId: doctor ? doctor.registrationId : (me.role === "doctor" ? me.userId : ""),
      doctorName: doctor ? doctor.name : (me.role === "doctor" ? me.name : ""),
      medication: join("name"),
      dosage: join("dosage"),
      frequency: join("frequency"),
      duration: join("duration"),
      medicines: meds,
      diagnosis: p.diagnosis || "",
      notes: p.instructions || "",
      status: p.status,
      createdAt: p.createdAt,
      dispensedAt: p.dispensedAt || null,
      dispensedBy: disp ? (disp.name || disp.registrationId) : "",
      hash: p.blockchain ? p.blockchain.blockHash : "",
      prevHash: block ? block.previousHash : "",
      blockIndex,
      qrToken: p.qrToken,
      qrCode: qrCode || p.qrCode || null,
      warningsAcknowledged: !!p.warningsAcknowledged,
      aiReport: deriveAi(p),
    };
  }

  /* ---------------- Reads ---------------- */
  function getAll() {
    if (cache) return cache;
    const s = getSession();
    if (!s) return [];
    const path = { doctor: "/prescriptions/doctor", patient: "/prescriptions/mine" }[s.role] || "/prescriptions/all";
    const ledger = ledgerMap();
    cache = http("GET", path).prescriptions.map((p) => normalize(p, ledger));
    return cache;
  }

  function getById(id) {
    try {
      const data = http("GET", "/prescriptions/" + encodeURIComponent(id));
      return normalize(data.prescription, ledgerMap(), data.qrCode);
    } catch (e) {
      if (e.status === 404 || e.status === 403) return null;
      throw e;
    }
  }

  function getByPatient(patientId) {
    return getAll().filter((r) => r.patientId === patientId);
  }

  function getByDoctor(doctorId) {
    return getAll().filter((r) => r.doctorId === doctorId);
  }

  /* ---------------- Writes ---------------- */
  // data.medicines = [{name, dosage, frequency, duration}, ...]
  // (the old single-medicine fields medication/dosage/frequency/duration still work)
  // Throws an error with err.requiresAcknowledgement = true (and err.analysis)
  // when serious safety warnings need the doctor's confirmation.
  function addPrescription(data) {
    const medicines = Array.isArray(data.medicines) && data.medicines.length
      ? data.medicines
      : [{ name: data.medication, dosage: data.dosage, frequency: data.frequency || "", duration: data.duration }];
    let res;
    try {
      res = http("POST", "/prescriptions", {
        patientId: data.patientId,
        diagnosis: data.diagnosis || "",
        instructions: data.notes || "",
        acknowledgeWarnings: !!data.acknowledgeWarnings,
        medicines,
      });
    } catch (e) {
      if (e.status === 409 && e.data && e.data.requiresAcknowledgement) {
        e.requiresAcknowledgement = true;
        e.analysis = e.data.aiAnalysis;
      }
      throw e;
    }
    cache = null;
    return normalize(res.prescription, null, res.qrCode);
  }

  function updateStatus(id, status) {
    if (status !== "dispensed") throw new Error("Only 'dispensed' is supported");
    const res = http("PATCH", "/prescriptions/" + encodeURIComponent(id) + "/dispense");
    cache = null;
    return res;
  }

  // Real verification: server checks the QR token and re-validates the block hash chain.
  function verify(id, qrToken) {
    try {
      return http("POST", "/prescriptions/verify", { prescriptionId: id, qrToken });
    } catch (e) {
      return { verified: false, message: e.message };
    }
  }

  function attachAiReport(id, report) {
    localStorage.setItem(AI_PREFIX + id, JSON.stringify(report));
    cache = null;
  }

  /* ---------------- Users ---------------- */
  function getPatients(search) {
    const q = search ? "?search=" + encodeURIComponent(search) : "";
    return http("GET", "/users/patients" + q).patients;
  }

  function createUser(data) {
    return http("POST", "/users", data).user;
  }

  /* ---------------- Safety, templates, explainer ---------------- */
  const checkPrescription = (patientId, diagnosis, medicines) =>
    request("POST", "/prescriptions/check", { patientId, diagnosis, medicines }).then((d) => d.analysis);

  const setAllergies = (registrationId, allergies) =>
    request("PUT", "/users/patients/" + encodeURIComponent(registrationId) + "/allergies", { allergies })
      .then((d) => d.patient);

  const medicineSuggestions = (q) =>
    request("GET", "/clinical/medicines?q=" + encodeURIComponent(q)).then((d) => d.medicines);

  const listTemplates = (diagnosis) =>
    request("GET", "/clinical/templates?diagnosis=" + encodeURIComponent(diagnosis || ""));

  const saveTemplate = (template) => request("POST", "/clinical/templates", template);

  const deleteTemplate = (id) => request("DELETE", "/clinical/templates/" + encodeURIComponent(id));

  const explain = (id, lang) =>
    request("GET", "/prescriptions/" + encodeURIComponent(id) + "/explain?lang=" + (lang === "ta" ? "ta" : "en"))
      .then((d) => d.explanation);

  const analyse = (id) =>
    request("GET", "/prescriptions/" + encodeURIComponent(id) + "/analysis").then((d) => d.report);

  /* ---------------- Reminders / adherence ---------------- */
  const adherenceSummary = () => request("GET", "/adherence/summary");

  const logDose = (dose, status) =>
    request("POST", "/adherence/log", {
      prescriptionId: dose.prescriptionId,
      medicine: dose.medicine,
      date: dose.date,
      slot: dose.time,
      status,
    });

  /* ---------------- Admin security ---------------- */
  const integrityReport = () => request("GET", "/admin/integrity").then((d) => d.report);
  const fraudReport = () => request("GET", "/admin/fraud").then((d) => d.report);

  /* ---------------- Helpers ---------------- */
  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function formatDate(iso) {
    if (!iso) return "\u2014";
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
      " \u00b7 " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }

  function badgeClass(status) {
    return { active: "badge-active", dispensed: "badge-dispensed", revoked: "badge-revoked", cancelled: "badge-revoked" }[status] || "badge-pending";
  }

  return {
    getAll, getById, getByPatient, getByDoctor,
    addPrescription, updateStatus, attachAiReport, verify, getPatients, createUser,
    getSession, requireRole, signOut, formatDate, badgeClass, escapeHtml,
    request, checkPrescription, setAllergies, medicineSuggestions,
    listTemplates, saveTemplate, deleteTemplate, explain, analyse,
    adherenceSummary, logDose, integrityReport, fraudReport,
  };
})();
