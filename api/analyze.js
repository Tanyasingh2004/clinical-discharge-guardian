const {
  extractClinicalEntities,
  evaluateInteractions,
  translateToPlainLanguage
} = require('../lib/clinical-engine.js');

function sendJson(res, statusCode, data) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (typeof res.status === 'function') {
    res.status(statusCode);
  } else {
    res.statusCode = statusCode;
  }

  if (typeof res.json === 'function') {
    res.json(data);
  } else {
    res.end(JSON.stringify(data));
  }
}

async function getBody(req) {
  if (req.body) {
    if (typeof req.body === 'string') {
      try { return JSON.parse(req.body); } catch (e) { return {}; }
    }
    return req.body;
  }
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch (e) { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (typeof res.status === 'function') res.status(200);
    else res.statusCode = 200;
    return res.end();
  }

  try {
    const payload = await getBody(req);
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

    return sendJson(res, 200, {
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
    return sendJson(res, 400, { error: err.message });
  }
};
