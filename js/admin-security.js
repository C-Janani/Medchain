/* ==========================================================================
   admin-security.js - ledger integrity + fraud panels on admin-dashboard.html
   Depends on blockchain.js. Runs both checks on page load and on "Verify now".
   ========================================================================== */

(function () {
  const esc = RxChain.escapeHtml;
  const $ = (id) => document.getElementById(id);

  function stamp(iso) {
    return RxChain.formatDate(iso);
  }

  /* ---------------- Integrity ---------------- */
  function renderIntegrity(report) {
    const banner = $("integrityBanner");
    banner.className = "integrity-banner " + report.status;

    const icon = { intact: "✓", warning: "!", compromised: "✕" }[report.status];
    const title = {
      intact: "Ledger intact",
      warning: "Ledger needs attention",
      compromised: "Tampering detected",
    }[report.status];

    $("integrityIcon").textContent = icon;
    $("integrityTitle").textContent = title;
    $("integritySub").textContent = report.status === "intact"
      ? `${report.blocksChecked} blocks and ${report.prescriptionsChecked} prescription records verified. Last check ${stamp(report.checkedAt)}.`
      : `${report.issues.length} problem${report.issues.length === 1 ? "" : "s"} found across ${report.blocksChecked} blocks and ${report.prescriptionsChecked} records. Last check ${stamp(report.checkedAt)}.`;

    const wrap = $("issueWrap");
    wrap.style.display = report.issues.length ? "block" : "none";
    $("issueBody").innerHTML = report.issues.map((i) => `<tr>
      <td><span class="issue-code">${esc(i.code)}</span></td>
      <td class="mono">${i.blockIndex !== undefined ? "Block #" + esc(i.blockIndex) : ""}${i.prescriptionId ? " " + esc(i.prescriptionId) : ""}</td>
      <td>${esc(i.message)}</td></tr>`).join("");
  }

  async function runIntegrity() {
    const banner = $("integrityBanner");
    banner.className = "integrity-banner checking";
    $("integrityIcon").textContent = "…";
    $("integrityTitle").textContent = "Checking the ledger…";
    try {
      renderIntegrity(await RxChain.integrityReport());
    } catch (err) {
      $("integrityTitle").textContent = "Could not run the check";
      $("integritySub").textContent = err.message;
    }
  }

  /* ---------------- Fraud ---------------- */
  function renderFraud(report) {
    const { score, level } = report.overall;
    $("riskNum").textContent = score;
    $("riskLevel").textContent = level + " risk";
    $("riskScore").className = "risk-score " + level;
    $("riskMeter").className = "risk-meter " + level;
    $("riskMeter").firstElementChild.style.width = score + "%";

    $("noFlags").style.display = report.flags.length ? "none" : "block";
    $("flagList").innerHTML = report.flags.map((f) => `
      <li class="flag-item ${esc(f.severity)}">
        <strong>${esc(f.entityName)}</strong> <span class="mono">${esc(f.entityId)}</span> · ${esc(f.message)}
        ${f.evidence && f.evidence.length ? `<div class="flag-meta">${esc(f.evidence.join(", "))}</div>` : ""}
      </li>`).join("");

    $("entityBody").innerHTML = report.entities.length
      ? report.entities.map((e) => `<tr>
          <td class="mono">${esc(e.id)}</td><td>${esc(e.name)}</td><td>${esc(e.role)}</td>
          <td>${e.flags}</td><td><span class="score-pill ${esc(e.level)}">${e.score}</span></td></tr>`).join("")
      : '<tr><td colspan="5" class="empty-state">No activity to score yet.</td></tr>';
  }

  async function runFraud() {
    try {
      renderFraud(await RxChain.fraudReport());
    } catch (err) {
      $("riskLevel").textContent = "unavailable";
      $("riskExplain").textContent = err.message;
    }
  }

  async function runAll() {
    const btn = $("verifyBtn");
    btn.disabled = true;
    await Promise.all([runIntegrity(), runFraud()]);
    btn.disabled = false;
  }

  $("verifyBtn").addEventListener("click", runAll);

  // Demo only: show how tampering is detected. The server alters an in-memory COPY; nothing stored changes.
  if (window.RxDemo && RxDemo.isDemo()) {
    const sim = document.createElement("button");
    sim.type = "button";
    sim.className = "btn btn-ghost";
    sim.style.marginLeft = "8px";
    sim.textContent = "Simulate tampering (demo)";
    $("verifyBtn").insertAdjacentElement("afterend", sim);
    sim.addEventListener("click", async () => {
      try {
        const d = await RxChain.request("GET", "/admin/integrity?tamper=1");
        renderIntegrity(d.report);
        $("integritySub").textContent += " " + (d.report.simulated || "");
      } catch (err) {
        $("integritySub").textContent = err.message;
      }
    });
  }

  runAll();
})();
