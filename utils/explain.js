/* ==========================================================================
   explain.js - turn a prescription into plain language (English or Tamil).

   - Common medicines use the built-in text in medicineInfo.js (works offline).
   - A medicine that is not in the built-in list falls back to generic advice.
     If ANTHROPIC_API_KEY is set in .env, the AI writes a short explanation
     for that medicine instead (marked source "ai"). Any failure silently
     falls back to the generic advice, so this never breaks the page.
   ========================================================================== */

const { INFO, GENERIC, LABELS } = require("./medicineInfo");
const { resolveMedicine } = require("./safety");
const { parseTimesPerDay, parseDurationDays } = require("./parse");

const LANGS = ["en", "ta"];

function describeTaking(med, lang) {
  const labels = LABELS[lang];
  const perDay = parseTimesPerDay(med.frequency);
  const days = parseDurationDays(med.duration);
  const parts = [];

  if (med.dosage) parts.push(med.dosage);

  if (perDay !== null) {
    const n = Math.round(perDay);
    parts.push(
      lang === "ta"
        ? n === 1 ? "ஒரு நாளைக்கு ஒரு முறை" : `ஒரு நாளைக்கு ${n} முறை`
        : n === 1 ? "once a day" : `${n} times a day`
    );
  } else if (med.frequency) {
    parts.push(med.frequency);
  }

  if (days !== null) {
    parts.push(lang === "ta" ? `${days} நாட்களுக்கு` : `for ${days} day${days === 1 ? "" : "s"}`);
  } else if (med.duration) {
    parts.push(med.duration);
  }

  return parts.length ? parts.join(" · ") : labels.asDirected;
}

async function explainWithAI(name, lang) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || typeof fetch !== "function") return null;

  const language = lang === "ta" ? "Tamil (Tamil script)" : "English";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
        max_tokens: 600,
        system:
          `You write short patient information about a medicine in ${language}, in simple words a person with no medical background can follow. ` +
          "Reply with JSON only, no markdown, using exactly these keys: purpose, how, sideEffects, caution. " +
          "Each value is at most two short sentences. Do not give dose amounts, do not diagnose, and do not tell the patient to change or stop their treatment. " +
          'If you do not recognise the medicine name, reply {"unknown": true}.',
        messages: [{ role: "user", content: `Medicine name: ${name}` }],
      }),
    });
    if (!response.ok) return null;

    const data = await response.json();
    const text = (data.content || []).map((b) => b.text || "").join("").replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(text);
    if (parsed.unknown) return null;

    const clean = {};
    for (const k of ["purpose", "how", "sideEffects", "caution"]) {
      if (typeof parsed[k] !== "string" || !parsed[k].trim()) return null;
      clean[k] = parsed[k].trim().slice(0, 400);
    }
    return clean;
  } catch (err) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// rx: plain object with medicines[] and instructions
async function explainPrescription(rx, lang = "en") {
  const language = LANGS.includes(lang) ? lang : "en";
  const medicines = [];
  let usedAI = false;

  for (const med of rx.medicines || []) {
    const generics = resolveMedicine(med.name);
    const known = generics.find((g) => INFO[g]);
    let text;
    let source;

    if (known) {
      text = INFO[known][language];
      source = "builtin";
    } else {
      const ai = await explainWithAI(med.name, language);
      if (ai) {
        text = ai;
        source = "ai";
        usedAI = true;
      } else {
        text = GENERIC[language];
        source = "generic";
      }
    }

    medicines.push({
      name: med.name,
      taking: describeTaking(med, language),
      purpose: text.purpose,
      how: text.how,
      sideEffects: text.sideEffects,
      caution: text.caution,
      source,
    });
  }

  return {
    language,
    medicines,
    doctorNote: rx.instructions || "",
    disclaimer: LABELS[language].disclaimer,
    aiNote: usedAI ? LABELS[language].aiNote : "",
  };
}

module.exports = { explainPrescription, describeTaking, LANGS };
