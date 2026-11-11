/**
 * Comprehensive Automated Clinical Test Suite for CareGuardian
 * Tests entity extraction, DDI rules, multi-drug triple therapy, and 5th-grade translation.
 */

const {
  extractClinicalEntities,
  evaluateInteractions,
  translateToPlainLanguage,
  clinicalSamples,
  ddiDatabase
} = require('../server.js');

console.log("==================================================================");
console.log(" 🏥 CareGuardian Comprehensive Clinical Engine Verification");
console.log("==================================================================");

let total = 0;
let passed = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
  }
}

// 1. Verify Database Load
assert(ddiDatabase.interactions.length >= 25, `DDI Knowledge Base loaded ${ddiDatabase.interactions.length} rules.`);
assert(clinicalSamples.samples.length >= 3, `Clinical Samples loaded ${clinicalSamples.samples.length} case studies.`);

// 2. Test Case 1: Post-STEMI with DES (Triple Bleed Risk & Omeprazole Interaction)
console.log("\n--- Testing Case 1: Post-STEMI with Stent ---");
const case1 = clinicalSamples.samples[0];
const ext1 = extractClinicalEntities(case1.doctor_raw_text);
assert(ext1.total_medications >= 5, `Case 1 extracted ${ext1.total_medications} medications.`);
assert(ext1.medications.some(m => m.name === 'Warfarin'), "Identified Warfarin in discharge orders.");
assert(ext1.medications.some(m => m.name === 'Aspirin'), "Identified Aspirin in discharge orders.");
assert(ext1.medications.some(m => m.name === 'Clopidogrel'), "Identified Clopidogrel in discharge orders.");
assert(ext1.medications.some(m => m.name === 'Omeprazole'), "Identified Omeprazole in discharge orders.");

const eval1 = evaluateInteractions(ext1.medications, ext1.conditions, ext1.allergies);
assert(eval1.critical_count >= 1, `Flagged critical hazard: Found ${eval1.critical_count} critical alerts.`);
assert(eval1.alerts.some(a => a.id === 'DDI-TRIPLE-01'), "Accurately triggered DDI-TRIPLE-01 (Triple Antithrombotic Bleed Hazard).");
assert(eval1.alerts.some(a => a.drugA === 'Clopidogrel' && a.drugB === 'Omeprazole'), "Accurately flagged Clopidogrel + Omeprazole CYP2C19 interaction.");

// 3. Test Plain Language Translation
console.log("\n--- Testing 5th-Grade Plain Language Translation ---");
const trans1 = translateToPlainLanguage(case1.doctor_raw_text, case1.patient);
assert(trans1.key_takeaways.length >= 3, `Generated ${trans1.key_takeaways.length} plain language golden rules.`);
assert(trans1.red_flag_actions["CALL 911 IMMEDIATELY IF"].length >= 3, "Generated emergency 911 red flag triggers.");

// 4. Test Case 2: Geriatric Polypharmacy & Sepsis with CKD
console.log("\n--- Testing Case 2: Geriatric CKD & Polypharmacy ---");
const case2 = clinicalSamples.samples[1];
const ext2 = extractClinicalEntities(case2.doctor_raw_text);
const eval2 = evaluateInteractions(ext2.medications, ext2.conditions, ext2.allergies);
assert(eval2.alerts.some(a => a.id === 'DDI-003'), "Accurately flagged Ciprofloxacin + Warfarin (INR spike).");
assert(eval2.alerts.some(a => a.id === 'DDI-005'), "Accurately flagged Lisinopril + Spironolactone (Hyperkalemia).");
assert(eval2.alerts.some(a => a.id === 'DDI-022'), "Accurately flagged Ibuprofen in Chronic Kidney Disease.");

// 5. Test Case 3: Pulmonology Asthma Exacerbation
console.log("\n--- Testing Case 3: Pulmonology Asthma Contraindication ---");
const case3 = clinicalSamples.samples[2];
const ext3 = extractClinicalEntities(case3.doctor_raw_text);
const eval3 = evaluateInteractions(ext3.medications, ext3.conditions, ext3.allergies);
assert(eval3.alerts.some(a => a.id === 'DDI-021'), "Accurately flagged Propranolol in Asthma (Status Asthmaticus Risk).");
assert(eval3.alerts.some(a => a.id === 'DDI-016'), "Accurately flagged Ciprofloxacin + Prednisone (Tendon Rupture Risk).");

console.log("\n------------------------------------------------------------------");
console.log(`Summary: ${passed}/${total} assertions passed (${Math.round((passed/total)*100)}% Success Rate).`);
console.log("==================================================================");

if (passed === total) {
  process.exit(0);
} else {
  process.exit(1);
}
