/* ==========================================================================
   safety.js - rule-based prescription safety screening.
   Pure functions (no database access) so they are easy to test.

   Warning shape (matches Prescription.aiAnalysis.warnings):
     { severity: "high" | "medium" | "low",
       category: "interaction" | "allergy" | "dosage" | "duplicate" | "age",
       medicines: [names...], reason: "plain English" }

   severity "high" is BLOCKING: the doctor must explicitly acknowledge it.
   ========================================================================== */

const {
  DRUGS,
  COMBINATIONS,
  ALLERGY_KEYWORDS,
  CROSS_REACTIVITY,
  INTERACTIONS,
  DUPLICATE_CLASS_SEVERITY,
} = require("./clinicalData");

const { dailyDoseMg, parseDoseMg, parseTimesPerDay } = require("./parse");

const NOISE_WORDS = new Set([
  "tab", "tabs", "tablet", "tablets", "cap", "caps", "capsule", "capsules",
  "syrup", "syp", "inj", "injection", "drops", "cream", "ointment", "gel",
  "sr", "er", "xr", "cr", "forte", "plus", "mg", "ml", "gm",
]);

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s\-+/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a, b) {
  if (a === b) return 0;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
}

// Lookup table: every generic name + alias -> canonical generic.
const LOOKUP = (() => {
  const map = new Map();
  for (const [generic, info] of Object.entries(DRUGS)) {
    map.set(generic, generic);
    for (const alias of info.aliases || []) map.set(normalizeText(alias), generic);
  }
  return map;
})();

// "Paracetamol 500mg tablet" -> ["paracetamol"]; unknown -> []
// Handles brand names, combination brands and small typos.
function resolveMedicine(name) {
  const text = normalizeText(name);
  if (!text) return [];

  if (COMBINATIONS[text]) return [...COMBINATIONS[text]];

  const tokens = text
    .split(" ")
    .filter((t) => t && !/^\d/.test(t) && !NOISE_WORDS.has(t));
  const phrase = tokens.join(" ");

  if (COMBINATIONS[phrase]) return [...COMBINATIONS[phrase]];
  if (LOOKUP.has(phrase)) return [LOOKUP.get(phrase)];

  const found = new Set();
  const candidates = [...tokens];
  for (let i = 0; i < tokens.length - 1; i++) candidates.push(tokens[i] + " " + tokens[i + 1]);

  for (const c of candidates) {
    if (COMBINATIONS[c]) COMBINATIONS[c].forEach((g) => found.add(g));
    else if (LOOKUP.has(c)) found.add(LOOKUP.get(c));
  }
  if (found.size) return [...found];

  // typo tolerance (edit distance 1, only for longer words to avoid false matches)
  for (const t of tokens) {
    if (t.length < 7) continue;
    for (const [key, generic] of LOOKUP.entries()) {
      if (key.length >= 7 && !key.includes(" ") && levenshtein(t, key) <= 1) found.add(generic);
    }
  }
  return [...found];
}

function classesOf(generic) {
  return (DRUGS[generic] && DRUGS[generic].classes) || [];
}

// Does this medicine entry match a rule token (a drug name or a class name)?
function entryMatches(entry, token) {
  return entry.generics.some((g) => g === token || classesOf(g).includes(token));
}

function prepare(medicines) {
  return (medicines || [])
    .map((m) => ({
      name: String(m.name || "").trim(),
      dosage: m.dosage || "",
      frequency: m.frequency || "",
      duration: m.duration || "",
      source: m.source || null,
      generics: resolveMedicine(m.name),
    }))
    .filter((m) => m.name);
}

const SEVERITY_RANK = { high: 3, medium: 2, low: 1 };
const pairKey = (a, b) => [a, b].sort().join("||");

/* ---------------- 1. Interactions + duplicates ---------------- */
function checkInteractions(newMedicines, activeMedicines = []) {
  const warnings = [];
  const reported = new Set();
  const current = prepare(newMedicines);
  const active = prepare(activeMedicines);

  function addPair(a, b, severity, reason, fromActive) {
    const key = pairKey(a.name.toLowerCase(), b.name.toLowerCase());
    if (reported.has(key)) return;
    reported.add(key);
    warnings.push({
      severity,
      category: "interaction",
      medicines: [a.name, b.name],
      reason: fromActive
        ? `${reason} (${b.name} is already on this patient's active prescription${b.source ? " " + b.source : ""}.)`
        : reason,
    });
  }

  function scanPair(a, b, fromActive) {
    if (a === b) return;
    for (const rule of INTERACTIONS) {
      if (
        (entryMatches(a, rule.a) && entryMatches(b, rule.b)) ||
        (entryMatches(a, rule.b) && entryMatches(b, rule.a))
      ) {
        addPair(a, b, rule.severity, rule.reason, fromActive);
      }
    }
  }

  // within the new prescription
  for (let i = 0; i < current.length; i++) {
    for (let j = i + 1; j < current.length; j++) scanPair(current[i], current[j], false);
  }
  // new vs already-active medicines
  for (const a of current) for (const b of active) scanPair(a, b, true);

  // duplicates: same drug twice, or two drugs of a duplicate-sensitive class
  function scanDuplicates(list, listB, fromActive) {
    for (let i = 0; i < list.length; i++) {
      const start = listB ? 0 : i + 1;
      const others = listB || list;
      for (let j = start; j < others.length; j++) {
        const a = list[i];
        const b = others[j];
        if (a === b || !a.generics.length || !b.generics.length) continue;
        const key = pairKey(a.name.toLowerCase(), b.name.toLowerCase());
        if (reported.has(key)) continue;

        const sameDrug = a.generics.find((g) => b.generics.includes(g));
        if (sameDrug) {
          const high = classesOf(sameDrug).some((c) => DUPLICATE_CLASS_SEVERITY[c] === "high");
          reported.add(key);
          warnings.push({
            severity: high ? "high" : "medium",
            category: "duplicate",
            medicines: [a.name, b.name],
            reason: `Both contain ${sameDrug}, so the patient would get a double dose.${fromActive ? " The second one is already on an active prescription." : ""}`,
          });
          continue;
        }
        for (const ga of a.generics) {
          for (const gb of b.generics) {
            const shared = classesOf(ga).find((c) => classesOf(gb).includes(c) && DUPLICATE_CLASS_SEVERITY[c]);
            if (shared && !reported.has(key)) {
              reported.add(key);
              warnings.push({
                severity: DUPLICATE_CLASS_SEVERITY[shared],
                category: "duplicate",
                medicines: [a.name, b.name],
                reason: `${ga} and ${gb} are both ${shared} medicines. Taking two of the same type adds risk without extra benefit.${fromActive ? " One is already on an active prescription." : ""}`,
              });
            }
          }
        }
      }
    }
  }
  scanDuplicates(current, null, false);
  scanDuplicates(current, active, true);

  return warnings;
}

/* ---------------- 2a. Allergies ---------------- */
const NO_ALLERGY = /^(none|nil|no|n\/a|na|nka|nkda|-|no known( drug)? allerg(y|ies)|no allerg(y|ies))$/i;

// Which allergy groups / drug names does a free-text allergy refer to?
function interpretAllergy(text) {
  const t = normalizeText(text);
  const groups = new Set();
  const drugs = new Set();
  if (!t || NO_ALLERGY.test(t)) return { groups, drugs };

  for (const [group, words] of Object.entries(ALLERGY_KEYWORDS)) {
    if (words.some((w) => t.includes(w))) groups.add(group);
  }
  for (const [key, generic] of LOOKUP.entries()) {
    const re = new RegExp("(^|[^a-z])" + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-z]|$)");
    if (re.test(t)) drugs.add(generic);
  }
  return { groups, drugs };
}

function checkAllergies(newMedicines, allergies = []) {
  const warnings = [];
  const current = prepare(newMedicines);
  const interpreted = (allergies || [])
    .map((raw) => ({ raw: String(raw || "").trim(), ...interpretAllergy(raw) }))
    .filter((a) => a.raw && (a.groups.size || a.drugs.size));

  const seen = new Set();
  for (const med of current) {
    for (const generic of med.generics) {
      const info = DRUGS[generic] || {};
      for (const allergy of interpreted) {
        const direct = allergy.drugs.has(generic) || (info.allergy || []).some((g) => allergy.groups.has(g));
        if (direct) {
          const key = med.name + "|" + allergy.raw;
          if (seen.has(key)) continue;
          seen.add(key);
          warnings.push({
            severity: "high",
            category: "allergy",
            medicines: [med.name],
            reason: `Patient has a recorded allergy to "${allergy.raw}". ${med.name} (${generic}) belongs to that group.`,
          });
          continue;
        }
        // cross-reactivity
        for (const g of allergy.groups) {
          for (const cross of CROSS_REACTIVITY[g] || []) {
            if ((info.allergy || []).includes(cross.group)) {
              const key = med.name + "|x|" + allergy.raw;
              if (seen.has(key)) continue;
              seen.add(key);
              warnings.push({
                severity: "medium",
                category: "allergy",
                medicines: [med.name],
                reason: `Patient has a recorded allergy to "${allergy.raw}". ${cross.note}`,
              });
            }
          }
        }
      }
    }
  }
  return warnings;
}

/* ---------------- 2b. Dosage + age ---------------- */
function checkDosage(newMedicines, age = null) {
  const warnings = [];
  const current = prepare(newMedicines);

  for (const med of current) {
    for (const generic of med.generics) {
      const info = DRUGS[generic];
      if (!info) continue;

      const daily = dailyDoseMg(med.dosage, med.frequency);
      const single = parseDoseMg(med.dosage);
      const perDay = parseTimesPerDay(med.frequency);

      if (daily !== null && daily > info.maxDailyMg) {
        warnings.push({
          severity: "high",
          category: "dosage",
          medicines: [med.name],
          reason: `${med.name}: ${med.dosage} x ${perDay}/day = ${trim(daily)} mg/day, above the usual adult maximum of ${trim(info.maxDailyMg)} mg/day.`,
        });
      } else if (daily !== null && daily > info.maxDailyMg * 0.9) {
        warnings.push({
          severity: "low",
          category: "dosage",
          medicines: [med.name],
          reason: `${med.name}: ${trim(daily)} mg/day is close to the usual adult maximum of ${trim(info.maxDailyMg)} mg/day.`,
        });
      } else if (single !== null && single > info.maxDailyMg) {
        warnings.push({
          severity: "high",
          category: "dosage",
          medicines: [med.name],
          reason: `${med.name}: a single dose of ${med.dosage} is above the usual adult daily maximum (${trim(info.maxDailyMg)} mg).`,
        });
      }

      // age-specific rules
      if (age !== null) {
        if (age < 12 && info.paediatric === "weight") {
          const overHalf = daily !== null && daily > info.maxDailyMg * 0.5;
          warnings.push({
            severity: overHalf ? "high" : "medium",
            category: "age",
            medicines: [med.name],
            reason: overHalf
              ? `Patient is ${age} years old. ${med.name} at ${trim(daily)} mg/day is more than half the adult maximum. Child doses are calculated by body weight - please confirm.`
              : `Patient is ${age} years old. ${med.name} must be dosed by body weight - please confirm the dose.`,
          });
        }
        if (generic === "aspirin" && age < 16) {
          warnings.push({ severity: "high", category: "age", medicines: [med.name], reason: `Patient is ${age}. Aspirin is generally avoided under 16 because of the risk of Reye's syndrome.` });
        }
        if (generic === "doxycycline" && age < 8) {
          warnings.push({ severity: "high", category: "age", medicines: [med.name], reason: `Patient is ${age}. Doxycycline can permanently stain developing teeth and is avoided under 8 years.` });
        }
        if (generic === "ciprofloxacin" && age < 18) {
          warnings.push({ severity: "medium", category: "age", medicines: [med.name], reason: `Patient is ${age}. Fluoroquinolones are generally avoided under 18 unless the benefit clearly outweighs the risk.` });
        }
        if (age >= 65 && classesOf(generic).includes("nsaid") && generic !== "aspirin") {
          warnings.push({ severity: "medium", category: "age", medicines: [med.name], reason: `Patient is ${age}. NSAIDs raise the risk of stomach bleeding and kidney problems in older adults.` });
        }
        if (age >= 65 && generic === "metformin" && daily !== null && daily > 2000) {
          warnings.push({ severity: "low", category: "age", medicines: [med.name], reason: `Patient is ${age}. Check kidney function before continuing high-dose metformin.` });
        }
      }
    }
  }
  return warnings;
}

function trim(n) {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

/* ---------------- 3. Combined screening ---------------- */
function sortWarnings(list) {
  return list.slice().sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
}

// risk label used by the existing UI classes: low / moderate / high
function riskFromWarnings(warnings) {
  if (warnings.some((w) => w.severity === "high")) return "high";
  if (warnings.some((w) => w.severity === "medium")) return "moderate";
  return "low";
}

function screenPrescription({ medicines = [], activeMedicines = [], allergies = [], age = null }) {
  const warnings = sortWarnings([
    ...checkAllergies(medicines, allergies),
    ...checkInteractions(medicines, activeMedicines),
    ...checkDosage(medicines, age),
  ]);
  const unrecognised = prepare(medicines)
    .filter((m) => !m.generics.length)
    .map((m) => m.name);

  return {
    warnings,
    risk: riskFromWarnings(warnings),
    blocking: warnings.some((w) => w.severity === "high"),
    unrecognised,
  };
}

// Search medicine names for autocomplete.
function suggestMedicines(query, limit = 8) {
  const q = normalizeText(query);
  if (!q) return [];
  const results = [];
  for (const [generic, info] of Object.entries(DRUGS)) {
    const names = [generic, ...(info.aliases || [])].map(normalizeText);
    if (names.some((n) => n.startsWith(q) || n.includes(q))) {
      results.push({ name: generic.charAt(0).toUpperCase() + generic.slice(1), classes: info.classes });
    }
  }
  return results.slice(0, limit);
}

module.exports = {
  resolveMedicine,
  interpretAllergy,
  checkInteractions,
  checkAllergies,
  checkDosage,
  screenPrescription,
  riskFromWarnings,
  suggestMedicines,
};
