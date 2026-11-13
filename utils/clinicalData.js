/* ==========================================================================
   clinicalData.js - small built-in drug knowledge base used by the
   safety checks, templates and autocomplete.

   IMPORTANT: this is a rule-based SCREENING aid for a college project.
   It is deliberately conservative, covers only common medicines, and is
   NOT a substitute for a clinician's judgement or a licensed drug database.
   ========================================================================== */

// canonical generic name -> properties
//   classes      : therapeutic groups (used for duplicate + interaction rules)
//   allergy      : allergy groups a patient may be allergic to
//   maxDailyMg   : conservative adult maximum per day (mg)
//   aliases      : brand names / spellings commonly used in India
//   paediatric   : 'weight' = dose must be calculated by body weight
const DRUGS = {
  paracetamol: { classes: ["analgesic-antipyretic"], allergy: ["paracetamol"], maxDailyMg: 4000, paediatric: "weight", aliases: ["acetaminophen", "crocin", "dolo", "calpol", "pcm", "paracip"] },
  ibuprofen: { classes: ["nsaid"], allergy: ["nsaid"], maxDailyMg: 3200, paediatric: "weight", aliases: ["brufen", "ibugesic"] },
  diclofenac: { classes: ["nsaid"], allergy: ["nsaid"], maxDailyMg: 150, aliases: ["voveran", "voltaren", "dynapar"] },
  aspirin: { classes: ["nsaid", "antiplatelet"], allergy: ["nsaid", "aspirin"], maxDailyMg: 4000, aliases: ["ecosprin", "disprin", "acetylsalicylic acid", "asa"] },
  amoxicillin: { classes: ["penicillin", "antibiotic"], allergy: ["penicillin", "beta-lactam"], maxDailyMg: 6000, paediatric: "weight", aliases: ["amoxil", "novamox", "mox", "augmentin", "amoxyclav", "amoxicillin clavulanate", "co-amoxiclav"] },
  azithromycin: { classes: ["macrolide", "antibiotic"], allergy: ["macrolide"], maxDailyMg: 1000, paediatric: "weight", aliases: ["azithral", "azee", "zithromax"] },
  clarithromycin: { classes: ["macrolide", "antibiotic"], allergy: ["macrolide"], maxDailyMg: 1000, aliases: ["klacid", "claribid"] },
  ciprofloxacin: { classes: ["fluoroquinolone", "antibiotic"], allergy: ["fluoroquinolone"], maxDailyMg: 1500, aliases: ["cipro", "ciplox", "cifran"] },
  doxycycline: { classes: ["tetracycline", "antibiotic"], allergy: ["tetracycline"], maxDailyMg: 200, aliases: ["doxy", "doxt"] },
  metronidazole: { classes: ["nitroimidazole", "antibiotic"], allergy: ["nitroimidazole"], maxDailyMg: 4000, paediatric: "weight", aliases: ["flagyl", "metrogyl"] },
  cefixime: { classes: ["cephalosporin", "antibiotic"], allergy: ["cephalosporin", "beta-lactam"], maxDailyMg: 400, paediatric: "weight", aliases: ["taxim-o", "zifi", "suprax"] },
  metformin: { classes: ["antidiabetic"], allergy: ["metformin"], maxDailyMg: 3000, aliases: ["glycomet", "glucophage", "obimet"] },
  glimepiride: { classes: ["antidiabetic", "sulfonylurea"], allergy: ["sulfa"], maxDailyMg: 8, aliases: ["amaryl", "glimy"] },
  atorvastatin: { classes: ["statin"], allergy: ["statin"], maxDailyMg: 80, aliases: ["lipitor", "atorva", "storvas"] },
  amlodipine: { classes: ["calcium-channel-blocker"], allergy: [], maxDailyMg: 10, aliases: ["amlong", "norvasc", "amlokind"] },
  losartan: { classes: ["arb"], allergy: [], maxDailyMg: 100, aliases: ["losar", "cozaar", "repace"] },
  telmisartan: { classes: ["arb"], allergy: [], maxDailyMg: 80, aliases: ["telma", "micardis"] },
  atenolol: { classes: ["beta-blocker"], allergy: [], maxDailyMg: 100, aliases: ["aten", "tenormin"] },
  metoprolol: { classes: ["beta-blocker"], allergy: [], maxDailyMg: 400, aliases: ["metolar", "betaloc"] },
  warfarin: { classes: ["anticoagulant"], allergy: [], maxDailyMg: 10, aliases: ["warf", "coumadin"] },
  clopidogrel: { classes: ["antiplatelet"], allergy: [], maxDailyMg: 300, aliases: ["clopitab", "plavix", "deplatt"] },
  omeprazole: { classes: ["ppi"], allergy: [], maxDailyMg: 80, aliases: ["omez", "prilosec"] },
  pantoprazole: { classes: ["ppi"], allergy: [], maxDailyMg: 80, aliases: ["pan", "pan 40", "pantocid", "pantop"] },
  cetirizine: { classes: ["antihistamine"], allergy: [], maxDailyMg: 20, aliases: ["cetzine", "zyrtec", "okacet", "alerid", "levocetirizine"] },
  salbutamol: { classes: ["bronchodilator"], allergy: [], maxDailyMg: 32, aliases: ["albuterol", "asthalin", "ventolin"] },
  prednisolone: { classes: ["corticosteroid"], allergy: ["corticosteroid"], maxDailyMg: 80, paediatric: "weight", aliases: ["wysolone", "omnacortil", "deltacortril"] },
};

// Brand names that contain more than one active ingredient.
const COMBINATIONS = {
  combiflam: ["ibuprofen", "paracetamol"],
  "ibuprofen paracetamol": ["ibuprofen", "paracetamol"],
  "paracetamol ibuprofen": ["ibuprofen", "paracetamol"],
};

// Words a patient may type for an allergy -> allergy group.
const ALLERGY_KEYWORDS = {
  penicillin: ["penicillin", "penicillins"],
  "beta-lactam": ["beta lactam", "beta-lactam", "betalactam"],
  cephalosporin: ["cephalosporin", "cephalosporins"],
  nsaid: ["nsaid", "nsaids", "anti-inflammatory", "anti inflammatory", "painkiller"],
  aspirin: ["aspirin", "salicylate", "salicylates"],
  sulfa: ["sulfa", "sulpha", "sulfonamide", "co-trimoxazole", "cotrimoxazole", "septran", "bactrim"],
  macrolide: ["macrolide", "macrolides"],
  fluoroquinolone: ["quinolone", "fluoroquinolone", "quinolones"],
  tetracycline: ["tetracycline", "tetracyclines"],
  nitroimidazole: ["nitroimidazole"],
  paracetamol: ["paracetamol", "acetaminophen"],
  statin: ["statin", "statins"],
  corticosteroid: ["steroid", "steroids", "corticosteroid"],
};

// Cross-reactivity between allergy groups (a patient allergic to the key
// may react to the listed group). Reported as MEDIUM, not blocking.
const CROSS_REACTIVITY = {
  penicillin: [{ group: "cephalosporin", note: "Cross-reactivity between penicillins and cephalosporins is uncommon (about 1-2%) but possible." }],
  cephalosporin: [{ group: "penicillin", note: "Cross-reactivity between cephalosporins and penicillins is uncommon but possible." }],
};

// Pair rules. `a` / `b` can be a drug name OR a class name.
// Specific rules come first - a pair is only reported once (highest first).
const INTERACTIONS = [
  { a: "warfarin", b: "antiplatelet", severity: "high", reason: "Anticoagulant plus antiplatelet greatly increases the risk of serious bleeding." },
  { a: "warfarin", b: "nsaid", severity: "high", reason: "NSAIDs increase bleeding risk (especially stomach bleeding) and can strengthen warfarin's effect." },
  { a: "warfarin", b: "metronidazole", severity: "high", reason: "Metronidazole markedly raises warfarin's effect (higher INR) and bleeding risk." },
  { a: "warfarin", b: "clarithromycin", severity: "high", reason: "Clarithromycin can raise warfarin levels and bleeding risk." },
  { a: "warfarin", b: "ciprofloxacin", severity: "medium", reason: "Ciprofloxacin can increase warfarin's effect. INR monitoring is advised." },
  { a: "warfarin", b: "azithromycin", severity: "medium", reason: "Azithromycin may increase warfarin's effect. INR monitoring is advised." },
  { a: "warfarin", b: "doxycycline", severity: "medium", reason: "Doxycycline may increase warfarin's effect. INR monitoring is advised." },
  { a: "aspirin", b: "ibuprofen", severity: "medium", reason: "Ibuprofen can block aspirin's heart-protective effect, and both raise the risk of stomach bleeding." },
  { a: "aspirin", b: "clopidogrel", severity: "medium", reason: "Dual antiplatelet therapy raises bleeding risk. It is appropriate only when intended." },
  { a: "clopidogrel", b: "omeprazole", severity: "medium", reason: "Omeprazole can reduce clopidogrel's activation. Pantoprazole is usually preferred." },
  { a: "statin", b: "clarithromycin", severity: "high", reason: "Clarithromycin raises statin levels and the risk of serious muscle damage (rhabdomyolysis)." },
  { a: "salbutamol", b: "beta-blocker", severity: "high", reason: "Beta-blockers can block salbutamol and trigger bronchospasm, especially in asthma." },
  { a: "nsaid", b: "arb", severity: "medium", reason: "NSAIDs can weaken the blood-pressure effect of ARBs and put extra strain on the kidneys." },
  { a: "nsaid", b: "corticosteroid", severity: "medium", reason: "NSAIDs with steroids increase the risk of stomach ulcers and bleeding." },
  { a: "corticosteroid", b: "antidiabetic", severity: "medium", reason: "Steroids raise blood sugar and can weaken diabetes control." },
  { a: "fluoroquinolone", b: "corticosteroid", severity: "medium", reason: "Fluoroquinolones with steroids increase the risk of tendon injury." },
  { a: "fluoroquinolone", b: "antidiabetic", severity: "medium", reason: "Fluoroquinolones can cause low or high blood sugar in people taking diabetes medicines." },
  { a: "macrolide", b: "fluoroquinolone", severity: "medium", reason: "Both can prolong the QT interval of the heart. Use together with caution." },
];

// Classes where two different medicines of the same class is a duplication.
const DUPLICATE_CLASS_SEVERITY = {
  nsaid: "high",
  "analgesic-antipyretic": "high",
  ppi: "medium",
  statin: "medium",
  antihistamine: "medium",
  penicillin: "medium",
  cephalosporin: "medium",
  macrolide: "medium",
  "beta-blocker": "medium",
  arb: "medium",
  "calcium-channel-blocker": "medium",
  corticosteroid: "medium",
  anticoagulant: "high",
};

// Monitored for fraud/abuse (not clinical checks).
const CONTROLLED_SUBSTANCES = [
  "tramadol", "codeine", "morphine", "fentanyl", "oxycodone", "pethidine",
  "alprazolam", "diazepam", "lorazepam", "clonazepam", "zolpidem", "nitrazepam",
  "pregabalin", "methadone", "buprenorphine",
];

// Starting-point templates. Always reviewed by the doctor before issuing.
const TEMPLATES = [
  { key: "fever", label: "Fever", keywords: ["fever", "pyrexia", "viral fever"], diagnosis: "Fever", medicines: [{ name: "Paracetamol", dosage: "500mg", frequency: "3x daily", duration: "3 days" }], note: "Take after food. Drink plenty of fluids and rest." },
  { key: "cold", label: "Common cold / allergic rhinitis", keywords: ["cold", "rhinitis", "sneezing", "runny nose", "allergic rhinitis"], diagnosis: "Common cold", medicines: [{ name: "Cetirizine", dosage: "10mg", frequency: "1x daily", duration: "5 days" }, { name: "Paracetamol", dosage: "500mg", frequency: "3x daily", duration: "3 days" }], note: "Cetirizine may cause drowsiness - take at night." },
  { key: "throat", label: "Bacterial throat infection", keywords: ["tonsillitis", "pharyngitis", "throat infection", "sore throat"], diagnosis: "Bacterial pharyngitis", medicines: [{ name: "Amoxicillin", dosage: "500mg", frequency: "3x daily", duration: "5 days" }, { name: "Paracetamol", dosage: "500mg", frequency: "3x daily", duration: "3 days" }], note: "Complete the full antibiotic course." },
  { key: "gastritis", label: "Acidity / gastritis", keywords: ["gastritis", "acidity", "gerd", "reflux", "dyspepsia"], diagnosis: "Gastritis", medicines: [{ name: "Pantoprazole", dosage: "40mg", frequency: "1x daily", duration: "14 days" }], note: "Take 30 minutes before breakfast." },
  { key: "htn", label: "Hypertension", keywords: ["hypertension", "high blood pressure", "htn", "bp"], diagnosis: "Hypertension", medicines: [{ name: "Amlodipine", dosage: "5mg", frequency: "1x daily", duration: "30 days" }], note: "Reduce salt. Review blood pressure in 2 weeks." },
  { key: "t2dm", label: "Type 2 diabetes", keywords: ["diabetes", "type 2 diabetes", "t2dm", "dm2", "high sugar"], diagnosis: "Type 2 diabetes mellitus", medicines: [{ name: "Metformin", dosage: "500mg", frequency: "2x daily", duration: "30 days" }], note: "Take with meals. Follow the diet plan." },
  { key: "asthma", label: "Asthma / wheeze", keywords: ["asthma", "wheeze", "wheezing", "bronchospasm"], diagnosis: "Bronchial asthma", medicines: [{ name: "Salbutamol", dosage: "2mg", frequency: "3x daily", duration: "5 days" }], note: "Seek urgent care if breathing worsens." },
  { key: "pain", label: "Body pain / inflammation", keywords: ["pain", "arthritis", "body ache", "myalgia", "back pain", "joint pain"], diagnosis: "Musculoskeletal pain", medicines: [{ name: "Ibuprofen", dosage: "400mg", frequency: "3x daily", duration: "5 days" }, { name: "Pantoprazole", dosage: "40mg", frequency: "1x daily", duration: "5 days" }], note: "Take ibuprofen after food." },
  { key: "lipids", label: "High cholesterol", keywords: ["cholesterol", "dyslipidemia", "dyslipidaemia", "hyperlipidemia"], diagnosis: "Dyslipidaemia", medicines: [{ name: "Atorvastatin", dosage: "10mg", frequency: "1x daily", duration: "30 days" }], note: "Take at night. Review lipid profile in 6-8 weeks." },
];

module.exports = {
  DRUGS,
  COMBINATIONS,
  ALLERGY_KEYWORDS,
  CROSS_REACTIVITY,
  INTERACTIONS,
  DUPLICATE_CLASS_SEVERITY,
  CONTROLLED_SUBSTANCES,
  TEMPLATES,
};
