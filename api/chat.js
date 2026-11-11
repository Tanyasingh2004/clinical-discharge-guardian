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
    const question = (payload.question || '').toLowerCase();
    const activeMeds = (payload.medications || []).map(m => (typeof m === 'string' ? m : m.name).toLowerCase());

    let answer = "";
    let alertLevel = "SAFE";

    if (question.includes('advil') || question.includes('ibuprofen') || question.includes('aleve') || question.includes('pain')) {
      if (activeMeds.includes('warfarin') || activeMeds.includes('aspirin') || activeMeds.includes('clopidogrel')) {
        alertLevel = "CRITICAL";
        answer = "DANGER: You are taking strong blood thinners (like Warfarin, Aspirin, or Plavix). You MUST NOT take Advil, Ibuprofen, Aleve, or Motrin. Combining them can cause severe bleeding in your stomach. Acetaminophen (Tylenol) is much safer for mild pain, but check with your doctor before taking more than 1,000 mg in a day.";
      } else if (activeMeds.includes('lisinopril') || activeMeds.includes('losartan')) {
        alertLevel = "HIGH";
        answer = "CAUTION: Taking Ibuprofen (Advil) with blood pressure medications like Lisinopril can reduce how well your blood pressure medicine works and can harm your kidneys. Ask your pharmacist or doctor if Acetaminophen (Tylenol) is appropriate.";
      } else {
        answer = "Always take pain relievers with food or a glass of water. If you need pain relief for more than 48 hours, contact your physician.";
      }
    } else if (question.includes('grapefruit') || question.includes('juice')) {
      if (activeMeds.includes('atorvastatin') || activeMeds.includes('simvastatin')) {
        alertLevel = "CRITICAL";
        answer = "STRICTLY FORBIDDEN: Do not drink grapefruit juice or eat grapefruit. Grapefruit stops your body from clearing statin cholesterol medicine (Lipitor/Zocor), causing toxic buildup that can destroy muscle tissue and damage your kidneys.";
      } else {
        answer = "Grapefruit can interact with many cardiac medications. Check with your pharmacist before consuming grapefruit.";
      }
    } else if (question.includes('alcohol') || question.includes('beer') || question.includes('wine')) {
      if (activeMeds.includes('metronidazole')) {
        alertLevel = "CRITICAL";
        answer = "DANGER: Absolutely no alcohol. Even a small sip while on Metronidazole (Flagyl) causes severe projectile vomiting, pounding chest, and throbbing headaches.";
      } else if (activeMeds.includes('warfarin')) {
        alertLevel = "HIGH";
        answer = "Alcohol directly affects your liver and can make Warfarin much stronger, leading to sudden bleeding. Limit alcohol strictly and speak to your doctor.";
      } else {
        answer = "Alcohol can interfere with blood pressure medications and make you very dizzy. It is safest to avoid alcohol during your recovery.";
      }
    } else if (question.includes('miss') || question.includes('forgot') || question.includes('late')) {
      answer = "If you forget a dose, take it as soon as you remember that same day. If it is already close to your next scheduled dose, SKIP the missed dose and get back on schedule. NEVER take two doses at the same time to make up for a missed pill.";
    } else if (question.includes('shower') || question.includes('bath') || question.includes('wound')) {
      answer = "Keep surgical incisions clean and dry. Typically you may take quick, gentle showers after 48 hours, but do not scrub the wound and do not soak in a tub or pool until your doctor gives full clearance.";
    } else {
      answer = `Your clinical guardian is monitoring ${activeMeds.length} active medications. Always adhere to your prescribed timetable. If you feel sudden chest pain, unusual bleeding, severe shortness of breath, or leg swelling, seek immediate medical attention.`;
    }

    return sendJson(res, 200, {
      answer,
      alert_level: alertLevel,
      spoken_text: answer
    });
  } catch (err) {
    return sendJson(res, 400, { error: err.message });
  }
};
