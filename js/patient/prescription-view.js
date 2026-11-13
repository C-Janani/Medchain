/* ==========================================================================
   prescription-view.js — logic for view-prescription.html
   Depends on blockchain.js being loaded first.
   ========================================================================== */

(function () {
  const session = RxChain.requireRole("patient", "../../login.html");
  document.getElementById("sbUserName").textContent = session.userId;

  document.getElementById("signOutBtn").addEventListener("click", (e) => {
    e.preventDefault();
    RxChain.signOut("../../login.html");
  });

  const id = new URLSearchParams(window.location.search).get("id");
  const rx = id ? RxChain.getById(id) : null;

  if (!rx) {
    document.getElementById("notFound").style.display = "block";
    return;
  }

  document.getElementById("rxSub").textContent = `${rx.id} — ${rx.medication}`;
  document.getElementById("panelWrap").style.display = "block";

  const badge = document.getElementById("statusBadge");
  badge.textContent = rx.status;
  badge.className = "badge " + RxChain.badgeClass(rx.status);

  document.getElementById("dMed").textContent = rx.medication;
  document.getElementById("dDosage").textContent = rx.dosage;
  document.getElementById("dFreq").textContent = rx.frequency;
  document.getElementById("dDur").textContent = rx.duration;
  document.getElementById("dDoctor").textContent = rx.doctorName;
  document.getElementById("dDate").textContent = RxChain.formatDate(rx.createdAt);
  document.getElementById("dNotes").textContent = rx.notes || "No additional notes.";
  document.getElementById("dHash").textContent = "hash: " + rx.hash;

  document.getElementById("qrLink").href = `qr-code.html?id=${rx.id}`;

  if (rx.aiReport) {
    const aiLink = document.getElementById("aiLink");
    aiLink.style.display = "inline-flex";
    aiLink.href = `view-ai-report.html?id=${rx.id}`;
  }

  /* ---------------- Plain-language explainer (English / Tamil) ---------------- */
  const esc = RxChain.escapeHtml;
  const LABELS = {
    en: { title: "In simple words", purpose: "What it is for", how: "How to take it", side: "Possible side effects", caution: "Be careful", note: "Your doctor's note", loading: "Loading…" },
    ta: { title: "எளிய விளக்கம்", purpose: "எதற்காக", how: "எப்படி எடுப்பது", side: "ஏற்படக்கூடிய பக்கவிளைவுகள்", caution: "கவனம்", note: "மருத்துவரின் குறிப்பு", loading: "ஏற்றுகிறது…" },
  };
  const panel = document.getElementById("explainPanel");
  const body = document.getElementById("explainBody");
  const toggle = panel.querySelector(".lang-toggle");
  let lang = localStorage.getItem("rxchain_lang") === "ta" ? "ta" : "en";

  function renderExplanation(x) {
    const L = LABELS[x.language];
    document.getElementById("explainTitle").textContent = L.title;
    body.setAttribute("lang", x.language);
    body.innerHTML = x.medicines.map((m) => `
      <div class="explain-card">
        <h3>${esc(m.name)}</h3>
        <div class="taking">${esc(m.taking)}</div>
        <dl>
          <div><dt>${esc(L.purpose)}</dt><dd>${esc(m.purpose)}</dd></div>
          <div><dt>${esc(L.how)}</dt><dd>${esc(m.how)}</dd></div>
          <div><dt>${esc(L.side)}</dt><dd>${esc(m.sideEffects)}</dd></div>
          <div><dt>${esc(L.caution)}</dt><dd>${esc(m.caution)}</dd></div>
        </dl>
      </div>`).join("") +
      (x.doctorNote ? `<p class="explain-note"><strong>${esc(L.note)}:</strong> ${esc(x.doctorNote)}</p>` : "") +
      `<p class="explain-note">${esc(x.disclaimer)}${x.aiNote ? " " + esc(x.aiNote) : ""}</p>`;
  }

  async function loadExplanation() {
    toggle.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    body.textContent = LABELS[lang].loading;
    try {
      renderExplanation(await RxChain.explain(rx.id, lang));
    } catch (err) {
      body.textContent = err.message;
    }
  }

  toggle.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-lang]");
    if (!b || b.dataset.lang === lang) return;
    lang = b.dataset.lang;
    localStorage.setItem("rxchain_lang", lang);
    loadExplanation();
  });

  panel.style.display = "block";
  loadExplanation();
})();
