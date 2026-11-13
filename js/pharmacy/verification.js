/* ==========================================================================
   verification.js — logic for verify-prescription.html
   Depends on blockchain.js being loaded first.
   ========================================================================== */

(function () {
  const session = RxChain.requireRole("pharmacy", "../../login.html");
  document.getElementById("sbUserName").textContent = session.userId;

  document.getElementById("signOutBtn").addEventListener("click", (e) => {
    e.preventDefault();
    RxChain.signOut("../../login.html");
  });

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const token = params.get("token");
  const box = document.getElementById("verifyBox");
  const icon = document.getElementById("vrIcon");
  const title = document.getElementById("vrTitle");
  const detail = document.getElementById("vrDetail");
  const grid = document.getElementById("detailGrid");
  const actionWrap = document.getElementById("actionWrap");

  function setResult(valid, titleText, detailText) {
    box.classList.add("show", valid ? "valid" : "invalid");
    icon.textContent = valid ? "✓" : "✕";
    title.textContent = titleText;
    detail.textContent = detailText;
  }

  let rx = null;
  try {
    rx = id ? RxChain.getById(id) : null;
  } catch (err) {
    document.getElementById("rxSub").textContent = "Server error.";
    setResult(false, "Cannot reach server", err.message);
    return;
  }

  if (!rx) {
    document.getElementById("rxSub").textContent = "No matching record.";
    setResult(false, "Not found on chain", `No prescription matches "${id || ""}". Double-check the ID or rescan the QR code.`);
    return;
  }

  document.getElementById("rxSub").textContent = `${rx.id} - scanned just now`;

  grid.style.display = "grid";
  document.getElementById("dPatient").textContent = rx.patientName;
  document.getElementById("dMed").textContent = rx.medication;
  document.getElementById("dDosage").textContent = rx.dosage;
  document.getElementById("dDoctor").textContent = rx.doctorName;
  document.getElementById("dDate").textContent = RxChain.formatDate(rx.createdAt);
  document.getElementById("dStatus").textContent = rx.status;

  // Server-side check: QR token + block hash chain. (Manual ID entry has no
  // token in the URL, so the pharmacy falls back to the record's own token.)
  const check = RxChain.verify(rx.id, token || rx.qrToken);

  if (!check.verified) {
    setResult(false, "Verification failed", check.message || "Blockchain verification failed.");
  } else if (rx.status === "active") {
    setResult(true, "Valid - verified on chain", `Block #${check.blockchain.blockIndex} (${check.blockchain.blockHash.slice(0, 16)}...) is intact. Safe to dispense.`);
    actionWrap.style.display = "block";
  } else if (rx.status === "dispensed") {
    setResult(false, "Already dispensed", `This prescription was dispensed on ${RxChain.formatDate(rx.dispensedAt)}${rx.dispensedBy ? " by " + rx.dispensedBy : ""}. It cannot be filled again.`);
  } else {
    setResult(false, "Revoked", "This prescription has been revoked and cannot be dispensed.");
  }

  document.getElementById("dispenseBtn").addEventListener("click", () => {
    try {
      RxChain.updateStatus(rx.id, "dispensed");
    } catch (err) {
      setResult(false, "Could not dispense", err.message);
      return;
    }
    setResult(true, "Dispensed", `Marked as dispensed by ${session.name || session.userId}.`);
    actionWrap.style.display = "none";
    document.getElementById("dStatus").textContent = "dispensed";
  });
})();
