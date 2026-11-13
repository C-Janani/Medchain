/* patient-picker.js - fills the patient dropdown and registers new patients.
   Loaded before prescription.js on create-prescription.html.
   Exposes window.PatientPicker so prescription.js can read the selected
   patient (including allergies) and react when the selection changes. */
(function () {
  const sel = document.getElementById("patientId");
  const nameBox = document.getElementById("patientName");
  const msg = document.getElementById("npMsg");

  const esc = RxChain.escapeHtml;
  let patients = [];

  function selected() {
    return patients.find((p) => p.registrationId === sel.value) || null;
  }

  function sync() {
    const opt = sel.options[sel.selectedIndex];
    nameBox.value = opt && opt.dataset.name ? opt.dataset.name : "";
    sel.dispatchEvent(new CustomEvent("patientchange", { detail: selected() }));
  }

  function load(selectId) {
    try {
      patients = RxChain.getPatients();
    } catch (err) {
      sel.innerHTML = '<option value="">Could not load patients</option>';
      msg.textContent = err.message;
      return;
    }
    sel.innerHTML = '<option value="">' + (patients.length ? "Select patient\u2026" : "No patients yet - register one above") + "</option>" +
      patients.map((p) => '<option value="' + esc(p.registrationId) + '" data-name="' + esc(p.name) + '">' +
        esc(p.registrationId) + " \u2014 " + esc(p.name) + "</option>").join("");
    if (selectId) sel.value = selectId;
    sync();
  }

  sel.addEventListener("change", sync);

  document.getElementById("npBtn").addEventListener("click", () => {
    const name = document.getElementById("npName").value.trim();
    const password = document.getElementById("npPass").value;
    const dateOfBirth = document.getElementById("npDob").value;
    const allergies = document.getElementById("npAllergies").value.trim();
    if (!name || password.length < 6) {
      msg.textContent = "Enter the patient's name and a password of at least 6 characters.";
      return;
    }
    try {
      const u = RxChain.createUser({ name, password, dateOfBirth, allergies });
      msg.innerHTML = 'Patient created. <b style="font-size:1.15em;">Patient ID: ' + esc(u.registrationId) +
        '</b> &nbsp; Password: <b>' + esc(password) + '</b><br>Give both to the patient for login. You can find this ID any time under <a href="patient-records.html">Patient records</a>.';
      ["npName", "npPass", "npDob", "npAllergies"].forEach((id) => { document.getElementById(id).value = ""; });
      load(u.registrationId);
    } catch (err) {
      msg.textContent = err.message;
    }
  });

  window.PatientPicker = {
    getSelected: selected,
    // update the cached allergies after the doctor edits them
    setAllergies(registrationId, allergies) {
      const p = patients.find((x) => x.registrationId === registrationId);
      if (p) p.allergies = allergies;
    },
  };

  load(new URLSearchParams(window.location.search).get("patient") || "");
})();
