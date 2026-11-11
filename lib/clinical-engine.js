/**
 * CareGuardian - Pure Clinical Decision Support & Interaction Engine
 * Modular, zero-dependency, serverless-ready engine
 */

const path = require('path');
const fs = require('fs');

// Load Data with multiple fallback strategies for serverless environments
let ddiDatabase = { interactions: [] };
let clinicalSamples = { samples: [] };
let rxNormCache = { drugs: {} };

try {
  ddiDatabase = require('../data/ddi_knowledge_base.json');
} catch (e) {
  try {
    const raw = fs.readFileSync(path.join(__dirname, '..', 'data', 'ddi_knowledge_base.json'), 'utf8');
    ddiDatabase = JSON.parse(raw);
  } catch (err) {
    console.error('[Engine] Failed to load ddi_knowledge_base.json', err.message);
  }
}

try {
  clinicalSamples = require('../data/clinical_samples.json');
} catch (e) {
  try {
    const raw = fs.readFileSync(path.join(__dirname, '..', 'data', 'clinical_samples.json'), 'utf8');
    clinicalSamples = JSON.parse(raw);
  } catch (err) {
    console.error('[Engine] Failed to load clinical_samples.json', err.message);
  }
}

try {
  rxNormCache = require('../data/rxnorm_cache.json');
} catch (e) {
  try {
    const raw = fs.readFileSync(path.join(__dirname, '..', 'data', 'rxnorm_cache.json'), 'utf8');
    rxNormCache = JSON.parse(raw);
  } catch (err) {
    console.error('[Engine] Failed to load rxnorm_cache.json', err.message);
  }
}

// Medical Jargon Translation Map (Medical to 5th-Grade Plain Language)
const JARGON_MAP = {
  "s/p": "after having had",
  "stemi": "a severe heart attack (ST-elevation myocardial infarction)",
  "nstemi": "a heart attack",
  "pci": "heart stent placement procedure",
  "des": "drug-coated heart stent",
  "cabg": "heart artery bypass surgery",
  "lad": "main front heart artery",
  "lvef": "heart pumping strength score",
  "qd": "once every day",
  "bid": "two times a day (about every 12 hours)",
  "tid": "three times a day (with meals)",
  "qid": "four times a day",
  "qhs": "at bedtime",
  "po": "by mouth (swallow)",
  "prn": "only when needed",
  "dyspepsia": "heartburn / stomach indigestion",
  "dyspnea": "shortness of breath or trouble breathing",
  "edema": "swelling in your legs, ankles, or feet",
  "angioedema": "dangerous swelling of your lips, tongue, or throat",
  "syncope": "passing out or fainting",
  "hematuria": "blood in your urine",
  "anuria": "not making any urine",
  "hypokalemia": "low blood potassium",
  "hyperkalemia": "dangerously high blood potassium",
  "rhabdomyolysis": "severe muscle tissue breakdown",
  "pancytopenia": "dangerously low blood cells",
  "ambulate": "walk around",
  "npo": "nothing to eat or drink",
  "titrate": "gradually adjust the dose",
  "contraindicated": "strictly forbidden / dangerous to take together",
  "f/u": "follow-up doctor appointment",
  "bmp": "kidney and electrolyte blood test (Basic Metabolic Panel)",
  "cbc": "complete blood count test",
  "inr": "blood thinness test score",
  "egfr": "kidney filtering rate score",
  "diaphoresis": "cold drenching sweats",
  "retrosternal": "behind your breastbone / chest"
};

// Known Food & Condition Warnings
const FOOD_RESTRICTIONS = {
  "atorvastatin": "DO NOT consume grapefruit or grapefruit juice (can cause severe muscle and kidney damage).",
  "simvastatin": "DO NOT consume grapefruit or grapefruit juice.",
  "warfarin": "Keep green leafy vegetables (spinach, kale, broccoli) consistent each day. Avoid large fluctuations.",
  "ciprofloxacin": "Avoid milk, yogurt, and calcium-fortified juices within 2 hours before or after taking.",
  "levothyroxine": "Take on an empty stomach with plain water. Wait at least 4 hours before taking calcium, iron, or multivitamins.",
  "metronidazole": "STRICTLY AVOID ALL ALCOHOL during treatment and for 72 hours after (causes violent vomiting).",
  "lisinopril": "Avoid potassium-based salt substitutes or potassium supplements without doctor approval.",
  "spironolactone": "Avoid potassium-based salt substitutes.",
  "metformin": "Drink plenty of water. Avoid excessive alcohol intake."
};

function canonicalDrugName(name) {
  const map = {
    "coumadin": "Warfarin",
    "plavix": "Clopidogrel",
    "lipitor": "Atorvastatin",
    "zocor": "Simvastatin",
    "prinivil": "Lisinopril",
    "zestril": "Lisinopril",
    "cozaar": "Losartan",
    "lopressor": "Metoprolol",
    "toprol-xl": "Metoprolol",
    "inderal": "Propranolol",
    "aldactone": "Spironolactone",
    "cipro": "Ciprofloxacin",
    "advil": "Ibuprofen",
    "motrin": "Ibuprofen",
    "prilosec": "Omeprazole",
    "synthroid": "Levothyroxine",
    "glucophage": "Metformin",
    "viagra": "Sildenafil",
    "revatio": "Sildenafil",
    "nitrostat": "Nitroglycerin",
    "zoloft": "Sertraline",
    "zofran": "Ondansetron",
    "lasix": "Furosemide"
  };
  const lower = name.toLowerCase();
  if (map[lower]) return map[lower];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function extractClinicalEntities(rawText) {
  const text = rawText || '';
  const lines = text.split('\n');
  const medications = [];
  const recognizedDrugs = new Set();

  const knownDrugs = Object.keys(rxNormCache.drugs || {});
  const allDrugNames = Array.from(new Set([
    ...knownDrugs,
    "warfarin", "coumadin", "aspirin", "clopidogrel", "plavix", "atorvastatin",
    "lipitor", "simvastatin", "lisinopril", "losartan", "metoprolol", "propranolol",
    "spironolactone", "ciprofloxacin", "cipro", "ibuprofen", "advil", "motrin",
    "omeprazole", "prilosec", "levothyroxine", "synthroid", "prednisone", "metformin",
    "sildenafil", "viagra", "nitroglycerin", "amiodarone", "digoxin", "lithium",
    "methotrexate", "amoxicillin", "tramadol", "sertraline", "zoloft", "ondansetron",
    "zofran", "pantoprazole", "furosemide", "lasix", "gabapentin", "doxycycline"
  ]));

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    for (const drugName of allDrugNames) {
      const reg = new RegExp(`\\b${drugName}\\b`, 'i');
      if (reg.test(trimmed)) {
        const canonical = canonicalDrugName(drugName);
        if (!recognizedDrugs.has(canonical.toLowerCase())) {
          recognizedDrugs.add(canonical.toLowerCase());

          const doseMatch = trimmed.match(/(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|units?|puffs?))/i);
          const dosage = doseMatch ? doseMatch[1] : "Standard prescribed dose";

          const routeMatch = trimmed.match(/\b(PO|by mouth|sublingual|SL|topical|inhaled|IV|SC)\b/i);
          const route = routeMatch ? routeMatch[1].toUpperCase() : "PO (By mouth)";

          let frequency = "Once daily";
          let scheduleTime = ["🌅 Morning"];

          if (/\bBID\b|twice\s+a\s+day/i.test(trimmed)) {
            frequency = "Twice a day (every 12 hours)";
            scheduleTime = ["🌅 Morning (8 AM)", "🌆 Evening (8 PM)"];
          } else if (/\bTID\b|three\s+times/i.test(trimmed)) {
            frequency = "Three times a day (with meals)";
            scheduleTime = ["🌅 Morning (8 AM)", "☀️ Lunch (1 PM)", "🌆 Dinner (7 PM)"];
          } else if (/\bQID\b|four\s+times/i.test(trimmed)) {
            frequency = "Four times a day";
            scheduleTime = ["🌅 Morning", "☀️ Midday", "🌆 Evening", "🌙 Bedtime"];
          } else if (/\bQHS\b|bedtime|at\s+night/i.test(trimmed)) {
            frequency = "At bedtime";
            scheduleTime = ["🌙 Bedtime (10 PM)"];
          } else if (/\bPRN\b|as\s+needed/i.test(trimmed)) {
            frequency = "As needed only for symptoms";
            scheduleTime = ["⚠️ As Needed"];
          } else if (/\bQD\b|daily|once\s+daily/i.test(trimmed)) {
            frequency = "Once daily";
            scheduleTime = ["🌅 Morning (8 AM)"];
          }

          if (canonical.toLowerCase() === 'warfarin') {
            scheduleTime = ["🌆 Evening (6 PM - Consistent timing)"];
          } else if (canonical.toLowerCase() === 'atorvastatin' || canonical.toLowerCase() === 'simvastatin') {
            scheduleTime = ["🌙 Bedtime (Statins work best at night)"];
          } else if (canonical.toLowerCase() === 'levothyroxine') {
            scheduleTime = ["🌅 First thing in Morning (Empty stomach, 60 mins before breakfast)"];
          } else if (canonical.toLowerCase() === 'omeprazole') {
            scheduleTime = ["🌅 Morning (30-60 mins before first meal)"];
          }

          const rxInfo = (rxNormCache.drugs && rxNormCache.drugs[canonical.toLowerCase()]) || {};
          const foodAdvice = FOOD_RESTRICTIONS[canonical.toLowerCase()] || rxInfo.take_with || "Take with water as directed.";

          medications.push({
            name: canonical,
            raw_line: trimmed,
            dosage: dosage,
            route: route,
            frequency: frequency,
            schedule_times: scheduleTime,
            rxcui: rxInfo.rxcui || "N/A",
            drug_class: rxInfo.class || "Therapeutic Agent",
            food_guidance: foodAdvice
          });
        }
      }
    }
  }

  const allergies = [];
  const allergyMatch = text.match(/ALLERG(?:IES|Y):\s*([^\n\r]+)/i);
  if (allergyMatch) {
    const rawAllergy = allergyMatch[1];
    rawAllergy.split(/[,;]/).forEach(a => {
      const clean = a.trim();
      if (clean && !clean.toLowerCase().includes('none') && !clean.toLowerCase().includes('nkda')) {
        allergies.push(clean);
      }
    });
  }

  const conditions = [];
  const diagMatch = text.match(/(?:ADMIT DIAGNOSIS|PRIMARY ADMIT|DIAGNOSIS|HISTORY):\s*([^\n\r]+)/i);
  if (diagMatch) {
    conditions.push(diagMatch[1].trim());
  }

  const conditionKeywords = [
    { name: "Asthma", regex: /\basthma\b/i },
    { name: "Chronic Kidney Disease (CKD)", regex: /\b(?:ckd|kidney disease|renal impairment|creatinine)\b/i },
    { name: "Heart Failure", regex: /\b(?:heart failure|chf|lvef < 40)\b/i },
    { name: "Diabetes", regex: /\b(?:diabetes|diabetic|dka)\b/i },
    { name: "Hypertension", regex: /\b(?:hypertension|htn|high blood pressure)\b/i },
    { name: "Peptic Ulcer", regex: /\b(?:ulcer|pud|gastritis)\b/i },
    { name: "Atrial Fibrillation", regex: /\b(?:atrial fibrillation|afib|a-fib)\b/i }
  ];

  for (const cond of conditionKeywords) {
    if (cond.regex.test(text) && !conditions.some(c => c.toLowerCase().includes(cond.name.toLowerCase()))) {
      conditions.push(cond.name);
    }
  }

  return {
    medications,
    allergies,
    conditions,
    total_medications: medications.length
  };
}

function evaluateInteractions(medications, conditions = [], allergies = []) {
  const detectedInteractions = [];
  const medNames = (medications || []).map(m => m.name.toLowerCase());
  const rules = (ddiDatabase && ddiDatabase.interactions) || [];

  for (let i = 0; i < medNames.length; i++) {
    for (let j = i + 1; j < medNames.length; j++) {
      const medA = medNames[i];
      const medB = medNames[j];

      for (const rule of rules) {
        if (rule.category === 'Drug-Drug') {
          const ruleA = rule.drugA.toLowerCase();
          const ruleB = rule.drugB.toLowerCase();

          if ((ruleA === medA && ruleB === medB) || (ruleA === medB && ruleB === medA)) {
            detectedInteractions.push({
              ...rule,
              match_type: "Drug-Drug Pair",
              involved: [medA, medB]
            });
          }
        }
      }
    }
  }

  const hasWarfarin = medNames.includes('warfarin');
  const hasAspirin = medNames.includes('aspirin');
  const hasClopidogrel = medNames.includes('clopidogrel');

  if (hasWarfarin && hasAspirin && hasClopidogrel) {
    detectedInteractions.unshift({
      id: "DDI-TRIPLE-01",
      drugA: "Warfarin + Aspirin + Clopidogrel",
      drugB: "Triple Antithrombotic Therapy",
      severity: "CRITICAL",
      category: "Multi-Drug High Bleed Hazard",
      clinical_effect: "Synergistic suppression of primary hemostasis and secondary coagulation cascade; 300-500% increase in major bleeding episodes.",
      plain_language: "EMERGENCY SAFETY ALERT: You are prescribed THREE strong blood thinners together (Warfarin, Aspirin, and Clopidogrel). This triple combination carries an extreme danger of life-threatening internal stomach bleeding or brain hemorrhage. If this combination was not explicitly reviewed with you today, call your doctor immediately before taking them.",
      action_required: "Verify with cardiologist if 'triple therapy' is strictly required or if aspirin should be dropped (standard modern ESC/ACC guidelines recommend double therapy).",
      red_flag_symptoms: ["Black tar-like bowel movements", "Vomiting blood or dark grains", "Severe sudden headache", "Coughing up blood"],
      match_type: "Triple Therapy Hazard",
      involved: ["Warfarin", "Aspirin", "Clopidogrel"]
    });
  }

  for (const med of medNames) {
    for (const rule of rules) {
      if (rule.category === 'Drug-Food' || rule.category === 'Drug-Food/Mineral') {
        if (rule.drugA.toLowerCase() === med) {
          detectedInteractions.push({
            ...rule,
            match_type: "Drug-Food Advisory",
            involved: [med, rule.drugB]
          });
        }
      }
    }
  }

  const condString = (conditions || []).join(' ').toLowerCase();
  for (const med of medNames) {
    for (const rule of rules) {
      if (rule.category === 'Drug-Condition') {
        if (rule.drugA.toLowerCase() === med) {
          const condKeyword = rule.drugB.toLowerCase().split(' ')[0];
          if (condString.includes(condKeyword)) {
            detectedInteractions.push({
              ...rule,
              match_type: "Drug-Condition Contraindication",
              involved: [med, rule.drugB]
            });
          }
        }
      }
    }
  }

  let overallRisk = "LOW (Safe Standard Care)";
  const criticalCount = detectedInteractions.filter(d => d.severity === 'CRITICAL').length;
  const highCount = detectedInteractions.filter(d => d.severity === 'HIGH').length;

  if (criticalCount > 0) {
    overallRisk = "CRITICAL (Immediate Prescriber Intervention Required)";
  } else if (highCount > 0) {
    overallRisk = "HIGH (Clinical Action & Monitoring Required)";
  } else if (detectedInteractions.length > 0) {
    overallRisk = "MODERATE (Dietary & Timing Adjustments Needed)";
  }

  return {
    overall_risk: overallRisk,
    critical_count: criticalCount,
    high_count: highCount,
    total_alerts: detectedInteractions.length,
    alerts: detectedInteractions
  };
}

function translateToPlainLanguage(doctorText, patientInfo = {}) {
  let plain = doctorText || '';

  for (const [jargon, explanation] of Object.entries(JARGON_MAP)) {
    const reg = new RegExp(`\\b${jargon}\\b`, 'gi');
    plain = plain.replace(reg, explanation);
  }

  const patientName = patientInfo.name || "Patient";

  return {
    patient_salutation: `Hello ${patientName}, here is your easy-to-understand care plan to keep you safe at home.`,
    reading_level: "5th-Grade Reading Level (CEFR A2/B1 - Low Health Literacy Accessible)",
    key_takeaways: [
      "Take your medications at the exact times shown in your visual schedule below.",
      "Never start any over-the-counter pain pills (like Advil or Aleve) without calling your doctor first.",
      "Check your body daily for warning signs like sudden shortness of breath, severe dizziness, or unusual bleeding."
    ],
    red_flag_actions: {
      "CALL 911 IMMEDIATELY IF": [
        "Sudden chest tightness, heavy crushing pressure, or pain spreading to your arm/jaw.",
        "Sudden weakness, face drooping, or trouble speaking.",
        "Throwing up blood or bowel movements that look like black sticky tar.",
        "Swelling in your lips, tongue, or throat making it hard to breathe."
      ],
      "CALL YOUR CLINIC WITHIN 24 HOURS IF": [
        "Unexplained dark brown urine or severe muscle soreness.",
        "Weight gain of more than 3 pounds in 2 days or swelling in your ankles.",
        "Dizziness when you stand up.",
        "A rash, hives, or mild fever."
      ]
    }
  };
}

module.exports = {
  extractClinicalEntities,
  evaluateInteractions,
  translateToPlainLanguage,
  canonicalDrugName,
  JARGON_MAP,
  FOOD_RESTRICTIONS,
  ddiDatabase,
  clinicalSamples,
  rxNormCache
};
