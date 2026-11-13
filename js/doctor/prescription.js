/* ==========================================================================
   prescription.js - logic for create-prescription.html
   Depends on blockchain.js and patient-picker.js being loaded first.

   Features: multiple medicines, live safety check (allergies, interactions,
   duplicates, dosage), medicine autocomplete, templates, voice dictation,
   allergy editor, acknowledgement of serious warnings.
   ========================================================================== */

(function () {
  const session = RxChain.requireRole("doctor", "../../login.html");
  document.getElementById("sbUserName").textContent = session.userId;

  document.getElementById("signOutBtn").addEventListener("click", (e) => {
    e.preventDefault();
    RxChain.signOut("../../login.html");
  });

  const esc = RxChain.escapeHtml;
  const $ = (id) => document.getElementById(id);

  const form = $("rxForm");
  const status = $("formStatus");
  const medList = $("medList");
  const safetyBox = $("safetyBox");
  const safetyRisk = $("safetyRisk");
  const ackBox = $("ackBox");
  const ackCheck = $("ackCheck");
  const patientSelect = $("patientId");

  let lastAnalysis = null;
  let checkTimer = null;
  let checkSeq = 0;

  function showStatus(message, type) {
    status.textContent = message;
    status.style.display = "block";
    status.className = "form-status show status-" + type;
    status.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  /* ---------------- Medicine rows ---------------- */
  function addRow(values) {
    const v = values || {};
    const row = document.createElement("div");
    row.className = "med-row";
    row.innerHTML = `
      <div class="field"><label>Medicine</label>
        <input type="text" class="m-name" list="medNames" placeholder="e.g. Amoxicillin" autocomplete="off" required value="${esc(v.name)}"></div>
      <div class="field"><label>Dosage</label>
        <input type="text" class="m-dosage" placeholder="e.g. 500mg" required value="${esc(v.dosage)}"></div>
      <div class="field"><label>Frequency</label>
        <input type="text" class="m-frequency" placeholder="e.g. 3x daily" required value="${esc(v.frequency)}"></div>
      <div class="field"><label>Duration</label>
        <input type="text" class="m-duration" placeholder="e.g. 7 days" required value="${esc(v.duration)}"></div>
      <button type="button" class="icon-btn m-remove" title="Remove medicine" aria-label="Remove medicine">×</button>`;
    medList.appendChild(row);
    updateRemoveButtons();
    return row;
  }

  function updateRemoveButtons() {
    const rows = medList.querySelectorAll(".med-row");
    rows.forEach((r) => {
      r.querySelector(".m-remove").style.visibility = rows.length > 1 ? "visible" : "hidden";
    });
  }

  function readMedicines() {
    return Array.from(medList.querySelectorAll(".med-row")).map((r) => ({
      name: r.querySelector(".m-name").value.trim(),
      dosage: r.querySelector(".m-dosage").value.trim(),
      frequency: r.querySelector(".m-frequency").value.trim(),
      duration: r.querySelector(".m-duration").value.trim(),
    }));
  }

  function setMedicines(list) {
    medList.innerHTML = "";
    (list && list.length ? list : [{}]).forEach(addRow);
    scheduleCheck();
  }

  $("addMedBtn").addEventListener("click", () => {
    addRow().querySelector(".m-name").focus();
  });

  medList.addEventListener("click", (e) => {
    if (e.target.classList.contains("m-remove")) {
      e.target.closest(".med-row").remove();
      updateRemoveButtons();
      scheduleCheck();
    }
  });

  /* ---------------- Autocomplete ---------------- */
  const fetchSuggestions = debounce(async (q) => {
    if (q.length < 2) return;
    try {
      const list = await RxChain.medicineSuggestions(q);
      $("medNames").innerHTML = list.map((m) => `<option value="${esc(m.name)}"></option>`).join("");
    } catch (e) { /* autocomplete is optional */ }
  }, 200);

  medList.addEventListener("input", (e) => {
    if (e.target.classList.contains("m-name")) fetchSuggestions(e.target.value.trim());
    scheduleCheck();
  });

  /* ---------------- Live safety check ---------------- */
  function scheduleCheck() {
    clearTimeout(checkTimer);
    checkTimer = setTimeout(runCheck, 600);
  }

  function renderAnalysis(analysis) {
    lastAnalysis = analysis;
    safetyRisk.style.display = "inline-block";
    safetyRisk.className = "ai-risk " + analysis.risk;
    safetyRisk.textContent = analysis.risk.charAt(0).toUpperCase() + analysis.risk.slice(1) + " risk";

    let html = "";
    if (!analysis.warnings.length) {
      html += '<p class="safety-ok">✓ No allergy, interaction, duplication or dosage concerns found.</p>';
    } else {
      html += '<ul class="safety-list">' + analysis.warnings.map((w) =>
        `<li class="safety-item ${esc(w.severity)}"><span class="sev">${esc(w.severity)} · ${esc(w.category)}</span>${esc(w.reason)}` +
        `<span class="meds">${esc((w.medicines || []).join(" + "))}</span></li>`).join("") + "</ul>";
    }
    if (analysis.unrecognised && analysis.unrecognised.length) {
      html += `<p class="hint">Not in the built-in drug list, so not checked: ${esc(analysis.unrecognised.join(", "))}. Check these manually.</p>`;
    }
    const patient = window.PatientPicker.getSelected();
    if (!patient) html += '<p class="hint">Select a patient to include their allergies, age and active medicines in the check.</p>';
    safetyBox.innerHTML = html;

    ackBox.style.display = analysis.blocking ? "block" : "none";
    if (!analysis.blocking) ackCheck.checked = false;
  }

  async function runCheck() {
    const meds = readMedicines().filter((m) => m.name);
    if (!meds.length) {
      lastAnalysis = null;
      safetyRisk.style.display = "none";
      ackBox.style.display = "none";
      ackCheck.checked = false;
      safetyBox.innerHTML = '<p class="safety-wait">Add a medicine and select a patient to see allergy, interaction and dosage checks.</p>';
      return;
    }
    const seq = ++checkSeq;
    safetyBox.insertAdjacentHTML("afterbegin", '<p class="safety-wait" id="checking">Checking…</p>');
    try {
      const patient = window.PatientPicker.getSelected();
      const analysis = await RxChain.checkPrescription(patient ? patient.registrationId : "", $("diagnosis").value.trim(), meds);
      if (seq === checkSeq) renderAnalysis(analysis);
    } catch (err) {
      if (seq === checkSeq) safetyBox.innerHTML = `<p class="safety-wait">Safety check unavailable: ${esc(err.message)}</p>`;
    }
  }

  patientSelect.addEventListener("patientchange", () => {
    renderAllergies();
    scheduleCheck();
  });

  /* ---------------- Allergies ---------------- */
  function renderAllergies() {
    const patient = window.PatientPicker.getSelected();
    const bar = $("allergyBar");
    if (!patient) { bar.style.display = "none"; return; }
    bar.style.display = "flex";
    const list = patient.allergies || [];
    $("allergyTags").innerHTML = list.length
      ? list.map((a) => `<span class="allergy-tag">${esc(a)}</span>`).join("")
      : '<span class="allergy-none">none recorded</span>';
    $("allergyInput").value = list.join(", ");
  }

  $("allergySave").addEventListener("click", async () => {
    const patient = window.PatientPicker.getSelected();
    if (!patient) return;
    try {
      const updated = await RxChain.setAllergies(patient.registrationId, $("allergyInput").value);
      window.PatientPicker.setAllergies(patient.registrationId, updated.allergies);
      renderAllergies();
      showStatus("Allergies saved for " + patient.name + ".", "success");
      runCheck();
    } catch (err) {
      showStatus(err.message, "error");
    }
  });

  /* ---------------- Templates ---------------- */
  let templateData = { suggested: [], mine: [] };

  function renderTemplates() {
    $("suggestRow").innerHTML = templateData.suggested.map((t) =>
      `<button type="button" class="chip suggested" data-tpl="${esc(t.id)}">Use: ${esc(t.name)}</button>`).join("");
    $("myTemplates").innerHTML = templateData.mine.map((t) =>
      `<span class="chip" data-tpl="${esc(t.id)}" role="button" tabindex="0">My template: ${esc(t.name)}` +
      `<span class="chip-x" data-del="${esc(t.id)}" role="button" aria-label="Delete template ${esc(t.name)}" title="Delete">×</span></span>`).join("");
    $("templateHint").style.display = templateData.suggested.length ? "block" : "none";
  }

  async function loadTemplates() {
    try {
      templateData = await RxChain.listTemplates($("diagnosis").value.trim());
      renderTemplates();
    } catch (e) { /* templates are optional */ }
  }

  function applyTemplate(id) {
    const t = templateData.suggested.concat(templateData.mine).find((x) => x.id === id);
    if (!t) return;
    if (t.diagnosis && !$("diagnosis").value.trim()) $("diagnosis").value = t.diagnosis;
    if (t.instructions) $("notes").value = t.instructions;
    setMedicines(t.medicines);
    showStatus(`Applied "${t.name}". Review the medicines before issuing.`, "success");
  }

  $("suggestRow").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tpl]");
    if (b) applyTemplate(b.dataset.tpl);
  });

  $("myTemplates").addEventListener("click", async (e) => {
    const del = e.target.closest("[data-del]");
    if (del) {
      e.stopPropagation();
      if (!window.confirm("Delete this template?")) return;
      try { await RxChain.deleteTemplate(del.dataset.del); await loadTemplates(); }
      catch (err) { showStatus(err.message, "error"); }
      return;
    }
    const chip = e.target.closest("[data-tpl]");
    if (chip) applyTemplate(chip.dataset.tpl);
  });

  $("myTemplates").addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.dataset && e.target.dataset.tpl) {
      e.preventDefault();
      applyTemplate(e.target.dataset.tpl);
    }
  });

  $("saveTplBtn").addEventListener("click", async () => {
    const name = $("tplName").value.trim();
    const meds = readMedicines().filter((m) => m.name);
    if (!name) { showStatus("Type a name for the template first.", "error"); $("tplName").focus(); return; }
    if (!meds.length) { showStatus("Add at least one medicine before saving a template.", "error"); return; }
    try {
      await RxChain.saveTemplate({ name, diagnosis: $("diagnosis").value.trim(), medicines: meds, instructions: $("notes").value.trim() });
      $("tplName").value = "";
      showStatus(`Template "${name}" saved.`, "success");
      loadTemplates();
    } catch (err) {
      showStatus(err.message, "error");
    }
  });

  const refreshTemplates = debounce(loadTemplates, 400);
  $("diagnosis").addEventListener("input", () => { refreshTemplates(); scheduleCheck(); });

  /* ---------------- Voice dictation ---------------- */
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let activeRec = null;
  let activeBtn = null;

  function stopDictation() {
    if (activeRec) { try { activeRec.stop(); } catch (e) { /* ignore */ } }
  }

  function startDictation(btn) {
    const target = $(btn.dataset.dictate);
    if (activeRec) {
      const same = activeBtn === btn;
      stopDictation();
      if (same) return;
    }
    const rec = new Recognition();
    rec.lang = $("dictLang").value;
    rec.interimResults = false;
    rec.continuous = true;
    rec.onresult = (event) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) text += event.results[i][0].transcript;
      }
      text = text.trim();
      if (!text) return;
      const current = target.value;
      target.value = current && !/\s$/.test(current) ? current + " " + text : current + text;
      target.dispatchEvent(new Event("input", { bubbles: true }));
    };
    rec.onerror = (event) => {
      const msg = event.error === "not-allowed" || event.error === "service-not-allowed"
        ? "Microphone access was blocked. Allow the microphone for this site and try again."
        : event.error === "no-speech" ? "" : "Dictation stopped (" + event.error + ").";
      if (msg) $("dictHint").textContent = msg;
    };
    rec.onend = () => {
      btn.classList.remove("listening");
      btn.setAttribute("aria-pressed", "false");
      if (activeRec === rec) { activeRec = null; activeBtn = null; }
    };
    try {
      rec.start();
      activeRec = rec;
      activeBtn = btn;
      btn.classList.add("listening");
      btn.setAttribute("aria-pressed", "true");
      $("dictHint").textContent = "Listening… click the microphone again to stop.";
    } catch (e) {
      $("dictHint").textContent = "Could not start dictation: " + e.message;
    }
  }

  if (!Recognition) {
    document.querySelectorAll(".mic-btn").forEach((b) => { b.style.display = "none"; });
    $("dictationLang").style.display = "none";
    $("dictHint").textContent = "Voice dictation works in Chrome and Edge.";
  } else {
    document.querySelectorAll(".mic-btn").forEach((b) => b.addEventListener("click", () => startDictation(b)));
  }

  /* ---------------- Submit ---------------- */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    stopDictation();

    const patient = window.PatientPicker.getSelected();
    const meds = readMedicines();

    if (!patient) { showStatus("Select a patient first.", "error"); return; }
    if (meds.some((m) => !m.name || !m.dosage || !m.frequency || !m.duration)) {
      showStatus("Fill in name, dosage, frequency and duration for every medicine, or remove the empty row.", "error");
      return;
    }
    if (lastAnalysis && lastAnalysis.blocking && !ackCheck.checked) {
      showStatus("Serious safety warnings were found. Tick the confirmation box to issue anyway, or change the prescription.", "error");
      ackBox.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    let block;
    try {
      block = RxChain.addPrescription({
        patientId: patient.registrationId,
        diagnosis: $("diagnosis").value.trim(),
        medicines: meds,
        notes: $("notes").value.trim(),
        acknowledgeWarnings: ackCheck.checked,
      });
    } catch (err) {
      if (err.requiresAcknowledgement) {
        renderAnalysis(err.analysis);
        showStatus("The server found serious safety warnings. Review them and tick the confirmation box to issue anyway.", "error");
        ackBox.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        showStatus(err.message, "error");
      }
      return;
    }

    showStatus(`Block ${block.blockIndex} written to chain (hash ${block.hash.slice(0, 18)}…). Redirecting…`, "success");
    $("submitBtn").disabled = true;
    setTimeout(() => {
      window.location.href = `qr-generation.html?id=${block.id}`;
    }, 700);
  });

  /* ---------------- Start ---------------- */
  addRow();
  renderAllergies();
  loadTemplates();
})();
