const {
  extractClinicalEntities,
  evaluateInteractions,
  translateToPlainLanguage
} = require('../server.js');

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let payload = req.body;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (e) {
        payload = {};
      }
    } else if (!payload) {
      payload = {};
    }

    const rawClinicalText = payload.text || '';
    const patientInfo = payload.patient || {};

    const extracted = extractClinicalEntities(rawClinicalText);

    const combinedConditions = Array.from(new Set([
      ...(patientInfo.known_conditions || []),
      ...extracted.conditions
    ]));

    const combinedAllergies = Array.from(new Set([
      ...(patientInfo.allergies || []),
      ...extracted.allergies
    ]));

    const safetyAssessment = evaluateInteractions(
      extracted.medications,
      combinedConditions,
      combinedAllergies
    );

    const plainLanguage = translateToPlainLanguage(rawClinicalText, patientInfo);

    const schedule = {
      morning: extracted.medications.filter(m => m.schedule_times.some(t => t.includes('Morning'))),
      afternoon: extracted.medications.filter(m => m.schedule_times.some(t => t.includes('Lunch') || t.includes('Midday'))),
      evening: extracted.medications.filter(m => m.schedule_times.some(t => t.includes('Evening') || t.includes('Dinner'))),
      bedtime: extracted.medications.filter(m => m.schedule_times.some(t => t.includes('Bedtime'))),
      as_needed: extracted.medications.filter(m => m.schedule_times.some(t => t.includes('Needed')))
    };

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      patient: {
        name: patientInfo.name || "Patient",
        age: patientInfo.age || 65,
        conditions: combinedConditions,
        allergies: combinedAllergies
      },
      extraction: extracted,
      safety: safetyAssessment,
      schedule: schedule,
      plain_language_guide: plainLanguage
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};
