/* ==========================================================================
   reminders.js - logic for patient reminders.html
   Depends on blockchain.js being loaded first.

   The server builds today's dose schedule and the adherence numbers
   (see rxchain-backend/utils/schedule.js). This page shows them, lets the
   patient mark doses, and raises browser notifications while it is open.
   ========================================================================== */

(function () {
  const session = RxChain.requireRole("patient", "../../login.html");
  document.getElementById("sbUserName").textContent = session.userId;

  document.getElementById("signOutBtn").addEventListener("click", (e) => {
    e.preventDefault();
    RxChain.signOut("../../login.html");
  });

  const esc = RxChain.escapeHtml;
  const $ = (id) => document.getElementById(id);
  const NOTIFIED_KEY = "rxchain_notified_doses";
  const REFRESH_MS = 60 * 1000;

  let summary = null;

  function showMessage(text, type) {
    const box = $("msg");
    box.textContent = text;
    box.className = "form-status show status-" + type;
    box.style.display = text ? "block" : "none";
  }

  function clock(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${suffix}`;
  }

  function prettyDate(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  }

  function adherenceClass(pct) {
    return pct === null ? "" : pct >= 80 ? "" : pct >= 50 ? "mid" : "low";
  }

  /* ---------------- Rendering ---------------- */
  function render() {
    const today = summary.today;
    $("todayLabel").textContent = prettyDate(summary.now.date);

    const adh = summary.last7.adherence;
    $("statAdh").textContent = adh === null ? "—" : adh + "%";
    $("statTaken").textContent = today.filter((d) => d.status === "taken").length;
    $("statDue").textContent = today.filter((d) => d.status === "due").length;
    $("statMissed").textContent = summary.last7.missed;

    $("emptyState").style.display = today.length ? "none" : "block";
    $("doseList").innerHTML = today.map((d) => {
      const resolved = d.status === "taken" || d.status === "skipped";
      const attrs = `data-rx="${esc(d.prescriptionId)}" data-med="${esc(d.medicine)}" data-date="${esc(d.date)}" data-time="${esc(d.time)}"`;
      const actions = resolved
        ? `<button type="button" class="btn btn-ghost btn-sm" data-act="clear" ${attrs}>Undo</button>`
        : `<button type="button" class="btn btn-primary btn-sm" data-act="taken" ${attrs}>Taken</button>` +
          `<button type="button" class="btn btn-ghost btn-sm" data-act="skipped" ${attrs}>Skip</button>`;
      return `<div class="dose-item ${esc(d.status)}">
        <span class="dose-time">${esc(clock(d.time))}</span>
        <div><div class="dose-name">${esc(d.medicine)}</div><div class="dose-sub">${esc(d.dosage || "As prescribed")} · ${esc(d.prescriptionId)}</div></div>
        <span class="status-chip ${esc(d.status)}">${esc(d.status)}</span>
        <span class="dose-actions">${actions}</span>
      </div>`;
    }).join("");

    const per = summary.perMedicine;
    $("noHistory").style.display = per.length ? "none" : "block";
    $("perMedicine").innerHTML = per.map((m) => `
      <div class="med-adherence">
        <div><strong>${esc(m.medicine)}</strong> <span class="dose-sub">${m.taken} of ${m.total} doses taken</span>
          <div class="adherence-bar ${adherenceClass(m.adherence)}"><span style="width:${m.adherence || 0}%"></span></div></div>
        <span class="pct">${m.adherence === null ? "—" : m.adherence + "%"}</span>
      </div>`).join("");
  }

  async function load() {
    try {
      const data = await RxChain.adherenceSummary();
      summary = data.summary;
      render();
      notifyDue();
    } catch (err) {
      showMessage(err.message, "error");
    }
  }

  /* ---------------- Mark doses ---------------- */
  $("doseList").addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    btn.disabled = true;
    showMessage("", "success");
    try {
      await RxChain.logDose(
        { prescriptionId: btn.dataset.rx, medicine: btn.dataset.med, date: btn.dataset.date, time: btn.dataset.time },
        btn.dataset.act
      );
      await load();
    } catch (err) {
      btn.disabled = false;
      showMessage(err.message, "error");
    }
  });

  /* ---------------- Notifications ---------------- */
  const supported = "Notification" in window;

  function updateNotifyBar() {
    if (!supported) {
      $("notifyText").textContent = "This browser does not support notifications. Keep this page open and check the Due now count.";
      $("notifyBtn").style.display = "none";
      return;
    }
    if (Notification.permission === "granted") {
      $("notifyText").textContent = "Reminders are on. You will get a notification when a dose is due while this page is open.";
      $("notifyBtn").style.display = "none";
      $("testBtn").style.display = "inline-flex";
    } else if (Notification.permission === "denied") {
      $("notifyText").textContent = "Notifications are blocked for this site. Allow them in your browser's site settings to get reminders.";
      $("notifyBtn").style.display = "none";
    }
  }

  $("notifyBtn").addEventListener("click", async () => {
    if (!supported) return;
    await Notification.requestPermission();
    updateNotifyBar();
    notifyDue();
  });

  $("testBtn").addEventListener("click", () => {
    new Notification("RxChain reminder", { body: "This is how a dose reminder will look." });
  });

  function notifiedSet() {
    try { return new Set(JSON.parse(sessionStorage.getItem(NOTIFIED_KEY) || "[]")); }
    catch (e) { return new Set(); }
  }

  function notifyDue() {
    if (!supported || Notification.permission !== "granted" || !summary) return;
    const seen = notifiedSet();
    summary.today.filter((d) => d.status === "due" && !seen.has(d.key)).forEach((d) => {
      new Notification("Time for your medicine", { body: `${d.medicine} ${d.dosage || ""} (${clock(d.time)})`.trim(), tag: d.key });
      seen.add(d.key);
    });
    try { sessionStorage.setItem(NOTIFIED_KEY, JSON.stringify([...seen])); } catch (e) { /* ignore */ }
  }

  /* ---------------- Start ---------------- */
  updateNotifyBar();
  load();
  setInterval(load, REFRESH_MS);
})();
