/* ==========================================================================
   schedule.js - build a patient's dose schedule from their prescriptions and
   work out adherence from the taken/skipped log.
   Pure functions. Time zone is explicit (default Asia/Kolkata) so the result
   is the same on a laptop and on a cloud server running in UTC.
   ========================================================================== */

const { parseTimesPerDay, parseDurationDays } = require("./parse");

const DEFAULT_TZ = process.env.APP_TZ || "Asia/Kolkata";
const GRACE_MINUTES = 120; // a dose is "missed" this long after its time
const DEFAULT_DURATION_DAYS = 7;

/* ---------- time helpers ---------- */
function localParts(date, tz = DEFAULT_TZ) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(date));
  const get = (t) => parts.find((p) => p.type === t).value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

function dayNumber(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

function minuteIndex(dateStr, timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return dayNumber(dateStr) * 1440 + h * 60 + m;
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/* ---------- slot times ---------- */
function slotTimes(frequencyText) {
  const s = String(frequencyText || "").toLowerCase().trim();

  // 1-0-1 style: morning - afternoon - night (3 numbers) or 4 numbers
  const m = s.match(/^(\d)\s*-\s*(\d)\s*-\s*(\d)(?:\s*-\s*(\d))?$/);
  if (m) {
    const names = m[4] !== undefined ? ["08:00", "13:00", "18:00", "22:00"] : ["08:00", "14:00", "20:00"];
    return m.slice(1).filter((x) => x !== undefined).map((v, i) => (Number(v) > 0 ? names[i] : null)).filter(Boolean);
  }

  const perDayRaw = parseTimesPerDay(s);
  if (perDayRaw === null) return []; // as-needed or unknown: no fixed reminders
  const n = Math.max(1, Math.round(perDayRaw));

  if (n === 1) {
    if (/\b(night|bedtime|evening)\b/.test(s)) return ["21:00"];
    return ["08:00"];
  }
  if (n === 2) return ["08:00", "20:00"];
  if (n === 3) return ["08:00", "14:00", "20:00"];
  if (n === 4) return ["08:00", "12:00", "16:00", "20:00"];

  const gap = 24 / n;
  return Array.from({ length: n }, (_, i) => {
    const minutes = Math.round((6 * 60 + i * gap * 60) / 30) * 30;
    const h = Math.floor(minutes / 60) % 24;
    return `${String(h).padStart(2, "0")}:${minutes % 60 === 0 ? "00" : "30"}`;
  });
}

/* ---------- expected doses ---------- */
// prescriptions: plain objects with prescriptionId, createdAt, status, medicines[]
function buildDoses(prescriptions, tz = DEFAULT_TZ) {
  const doses = [];
  for (const rx of prescriptions || []) {
    if (rx.status === "cancelled") continue;
    const start = localParts(rx.createdAt, tz);
    const startIdx = minuteIndex(start.date, start.time);

    for (const med of rx.medicines || []) {
      const times = slotTimes(med.frequency);
      if (!times.length) continue;
      const days = parseDurationDays(med.duration) || DEFAULT_DURATION_DAYS;

      for (let d = 0; d < days; d++) {
        const date = addDays(start.date, d);
        for (const time of times) {
          if (minuteIndex(date, time) < startIdx) continue; // before it was prescribed
          doses.push({
            key: `${rx.prescriptionId}|${med.name}|${date}|${time}`,
            prescriptionId: rx.prescriptionId,
            medicine: med.name,
            dosage: med.dosage || "",
            date,
            time,
          });
        }
      }
    }
  }
  return doses;
}

/* ---------- status + adherence ---------- */
// logs: [{ prescriptionId, medicine, date, slot, status: "taken" | "skipped" }]
function annotate(doses, logs, now = new Date(), tz = DEFAULT_TZ) {
  const logMap = new Map(
    (logs || []).map((l) => [`${l.prescriptionId}|${l.medicine}|${l.date}|${l.slot}`, l.status])
  );
  const local = localParts(now, tz);
  const nowIdx = minuteIndex(local.date, local.time);

  return doses.map((d) => {
    const idx = minuteIndex(d.date, d.time);
    const logged = logMap.get(d.key);
    let status;
    if (logged === "taken") status = "taken";
    else if (logged === "skipped") status = "skipped";
    else if (idx > nowIdx) status = "upcoming";
    else if (nowIdx - idx <= GRACE_MINUTES) status = "due";
    else status = "missed";
    return { ...d, status };
  });
}

function tally(annotated) {
  const taken = annotated.filter((d) => d.status === "taken").length;
  const skipped = annotated.filter((d) => d.status === "skipped").length;
  const missed = annotated.filter((d) => d.status === "missed").length;
  const resolved = taken + skipped + missed;
  return {
    taken, skipped, missed,
    adherence: resolved ? Math.round((taken / resolved) * 100) : null,
  };
}

function summarize(prescriptions, logs, now = new Date(), tz = DEFAULT_TZ) {
  const local = localParts(now, tz);
  const annotated = annotate(buildDoses(prescriptions, tz), logs, now, tz);

  const within = (days) =>
    annotated.filter((d) => {
      const age = dayNumber(local.date) - dayNumber(d.date);
      return age >= 0 && age < days;
    });

  const today = annotated
    .filter((d) => d.date === local.date)
    .sort((a, b) => a.time.localeCompare(b.time) || a.medicine.localeCompare(b.medicine));

  const perMedicine = new Map();
  for (const d of within(30)) {
    if (!["taken", "skipped", "missed"].includes(d.status)) continue;
    const e = perMedicine.get(d.medicine) || { medicine: d.medicine, taken: 0, total: 0 };
    e.total += 1;
    if (d.status === "taken") e.taken += 1;
    perMedicine.set(d.medicine, e);
  }

  return {
    now: local,
    today,
    last7: tally(within(7)),
    last30: tally(within(30)),
    perMedicine: [...perMedicine.values()].map((e) => ({
      ...e,
      adherence: e.total ? Math.round((e.taken / e.total) * 100) : null,
    })),
  };
}

module.exports = {
  DEFAULT_TZ,
  GRACE_MINUTES,
  localParts,
  slotTimes,
  buildDoses,
  annotate,
  summarize,
};
