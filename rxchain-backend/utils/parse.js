/* ==========================================================================
   parse.js - turn free-text prescription fields into numbers.
   Used by the dosage validator and the reminder scheduler.
   ========================================================================== */

const UNIT_TO_MG = { g: 1000, mg: 1, mcg: 0.001, "µg": 0.001, ug: 0.001 };

// "500mg" -> 500, "1 g" -> 1000, "2 x 250mg" -> 500, "250-500mg" -> 500 (upper bound)
// Returns null when no strength can be read.
function parseDoseMg(text) {
  const s = String(text || "").toLowerCase().replace(/,/g, "");

  let m = s.match(/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*(mg|g|mcg|µg|ug)\b/);
  if (m) return Number(m[1]) * Number(m[2]) * UNIT_TO_MG[m[3]];

  m = s.match(/(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*(mg|g|mcg|µg|ug)\b/);
  if (m) return Math.max(Number(m[1]), Number(m[2])) * UNIT_TO_MG[m[3]];

  m = s.match(/(\d+(?:\.\d+)?)\s*(mg|g|mcg|µg|ug)\b/);
  if (m) return Number(m[1]) * UNIT_TO_MG[m[2]];

  return null;
}

// How many doses per day. Returns a positive number, or null if unknown / as-needed.
function parseTimesPerDay(text) {
  const s = String(text || "").toLowerCase().trim();
  if (!s) return null;
  if (/\b(sos|prn|as needed|when needed|if needed|stat)\b/.test(s)) return null;

  // 1-0-1, 1-1-1, 0-0-1, 1-0-1-1
  let m = s.match(/^(\d)\s*-\s*(\d)\s*-\s*(\d)(?:\s*-\s*(\d))?$/);
  if (m) {
    const total = m.slice(1).filter((x) => x !== undefined).reduce((a, b) => a + Number(b), 0);
    return total > 0 ? total : null;
  }

  m = s.match(/every\s*(\d+)\s*(?:h|hr|hrs|hour|hours)\b/) || s.match(/\bq(\d+)h\b/);
  if (m && Number(m[1]) > 0) return 24 / Number(m[1]);

  m = s.match(/(\d+)\s*(?:x|×|times?)\b/) || s.match(/\b(\d+)\s*(?:per|a)\s*day\b/);
  if (m && Number(m[1]) > 0) return Number(m[1]);

  if (/\bmorning\b/.test(s) && /\b(night|evening)\b/.test(s)) return 2;
  if (/\b(four times|qid|qds)\b/.test(s)) return 4;
  if (/\b(thrice|three times|tds|tid)\b/.test(s)) return 3;
  if (/\b(twice|two times|bd|bid)\b/.test(s)) return 2;
  if (/\b(once|od|qd|daily|every day|nightly|at night|morning)\b/.test(s)) return 1;
  return null;
}

// "7 days" -> 7, "2 weeks" -> 14, "1 month" -> 30, "10d" -> 10. Returns null if unknown.
function parseDurationDays(text) {
  const s = String(text || "").toLowerCase();
  const m = s.match(/(\d+(?:\.\d+)?)\s*(d|day|days|w|wk|wks|week|weeks|m|mo|month|months)\b/);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2];
  if (unit[0] === "w") return Math.round(n * 7);
  if (unit === "m" || unit.startsWith("mo")) return Math.round(n * 30);
  return Math.round(n);
}

// Daily total in mg, or null if it cannot be worked out.
function dailyDoseMg(dosage, frequency) {
  const single = parseDoseMg(dosage);
  const perDay = parseTimesPerDay(frequency);
  if (single === null || perDay === null) return null;
  return single * perDay;
}

// Age in whole years from "YYYY-MM-DD". Returns null if invalid.
function ageFromDob(dob, now = new Date()) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  let age = now.getFullYear() - d.getFullYear();
  const beforeBirthday =
    now.getMonth() < d.getMonth() ||
    (now.getMonth() === d.getMonth() && now.getDate() < d.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

module.exports = {
  parseDoseMg,
  parseTimesPerDay,
  parseDurationDays,
  dailyDoseMg,
  ageFromDob,
};
