/* ==========================================================================
   patient-dashboard.js — logic for patient-dashboard.html
   Depends on blockchain.js being loaded first.
   ========================================================================== */

(function () {
  const session = RxChain.requireRole("patient", "../../login.html");
  document.getElementById("sbUserName").textContent = session.userId;

  document.getElementById("signOutBtn").addEventListener("click", (e) => {
    e.preventDefault();
    RxChain.signOut("../../login.html");
  });

  // In this demo, any patient ID that matches ledger records will show data;
  // otherwise we fall back to the seeded demo patient so the UI isn't empty.
  let mine = RxChain.getByPatient(session.userId);
  if (!mine.length) mine = RxChain.getByPatient("PAT-2048");

  const active = mine.filter((r) => r.status === "active");
  const dispensed = mine.filter((r) => r.status === "dispensed");
  const doctors = new Set(mine.map((r) => r.doctorId)).size;

  document.getElementById("statTotal").textContent = mine.length;
  document.getElementById("statActive").textContent = active.length;
  document.getElementById("statDispensed").textContent = dispensed.length;
  document.getElementById("statDoctors").textContent = doctors;

  const list = document.getElementById("activeList");
  const empty = document.getElementById("emptyState");

  if (!active.length) {
    empty.style.display = "block";
  } else {
    active.forEach((rx) => {
      const div = document.createElement("div");
      div.className = "rx-card";
      div.innerHTML = `
        <div class="rx-main">
          <h3>${rx.medication} · ${rx.dosage}</h3>
          <p>${rx.frequency} · ${rx.duration} · prescribed by ${rx.doctorName}</p>
        </div>
        <a href="view-prescription.html?id=${rx.id}" class="btn btn-outline btn-sm">View details</a>
      `;
      list.appendChild(div);
    });
  }
})();
