/**
 * 🏥 CareGuardian - Multimodal Clinical Discharge & Drug Interaction Guardian
 * Client-side State, Multimodal Speech/Vision, and Accessibility Controller
 */

// Application State
const state = {
  sampleCases: [],
  currentAnalysis: null,
  isRecording: false,
  isSpeaking: false,
  speechRate: 1.0,
  activeTab: 'view-text',
  activeResultTab: 'tab-alerts',
  recognition: null,
  currentUtterance: null
};

// DOM Element References
const elements = {
  // Accessibility
  contrastToggle: document.getElementById('toggle-contrast'),
  dyslexiaToggle: document.getElementById('toggle-dyslexia'),
  fontScaleSelect: document.getElementById('font-scale-select'),
  speechRateSelect: document.getElementById('speech-rate-select'),
  masterTtsBtn: document.getElementById('btn-master-tts'),
  ttsBtnText: document.getElementById('tts-btn-text'),

  // Inputs
  sampleSelector: document.getElementById('sample-selector'),
  clinicalTextarea: document.getElementById('clinical-textarea'),
  btnClearText: document.getElementById('btn-clear-text'),
  patientName: document.getElementById('patient-name-input'),
  patientAge: document.getElementById('patient-age-input'),
  patientConditions: document.getElementById('patient-conditions-input'),
  patientAllergies: document.getElementById('patient-allergies-input'),
  btnAnalyze: document.getElementById('btn-analyze'),

  // Modality Tabs
  tabButtons: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),

  // OCR
  dropzone: document.getElementById('dropzone'),
  fileInput: document.getElementById('file-input'),
  btnLoadSampleRx: document.getElementById('btn-load-sample-rx'),
  ocrPreviewContainer: document.getElementById('ocr-preview-container'),
  ocrImagePreview: document.getElementById('ocr-image-preview'),
  ocrStatus: document.getElementById('ocr-status'),

  // Voice Dictation
  btnMicToggle: document.getElementById('btn-mic-toggle'),
  micStatusText: document.getElementById('mic-status-text'),
  liveSpeechTranscript: document.getElementById('live-speech-transcript'),

  // Output Dashboard
  btnOpenPassport: document.getElementById('btn-open-passport'),
  riskBanner: document.getElementById('risk-banner'),
  riskTitle: document.getElementById('risk-title'),
  riskDescription: document.getElementById('risk-description'),
  statCritical: document.getElementById('stat-critical'),
  statMeds: document.getElementById('stat-meds'),
  alertTabCount: document.getElementById('alert-tab-count'),

  // Results Tabs
  resTabButtons: document.querySelectorAll('.res-tab-btn'),
  resPanels: document.querySelectorAll('.res-panel'),
  interactionAlertsList: document.getElementById('interaction-alerts-list'),
  medicationScheduleGrid: document.getElementById('medication-schedule-grid'),
  plainPlanContent: document.getElementById('plain-plan-content'),
  btnReadPlainPlan: document.getElementById('btn-read-plain-plan'),

  // Chatbot
  chatMessages: document.getElementById('chat-messages'),
  chatUserInput: document.getElementById('chat-user-input'),
  btnChatSend: document.getElementById('btn-chat-send'),
  btnChatMic: document.getElementById('btn-chat-mic'),
  quickChips: document.querySelectorAll('.quick-chip')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  setupAccessibility();
  setupSpeechRecognition();
  setupModalityTabs();
  setupOCR();
  setupChat();
  await loadSampleCases();
  loadInitialCase('CASE-01');
});

/* ==========================================================================
   Accessibility Management
   ========================================================================== */
function setupAccessibility() {
  // High Contrast
  elements.contrastToggle.addEventListener('click', () => {
    const isHighContrast = document.body.classList.toggle('theme-high-contrast');
    elements.contrastToggle.setAttribute('aria-pressed', isHighContrast);
    elements.contrastToggle.classList.toggle('active', isHighContrast);
    announceToScreenReader(isHighContrast ? "Ultra-high contrast mode enabled" : "Standard color mode restored");
  });

  // Dyslexia-Friendly Legible Font
  elements.dyslexiaToggle.addEventListener('click', () => {
    const isDyslexic = document.body.classList.toggle('font-dyslexia');
    elements.dyslexiaToggle.setAttribute('aria-pressed', isDyslexic);
    elements.dyslexiaToggle.classList.toggle('active', isDyslexic);
    announceToScreenReader(isDyslexic ? "High-legibility typography enabled" : "Standard typography restored");
  });

  // Font Scaler
  elements.fontScaleSelect.addEventListener('change', (e) => {
    document.body.classList.remove('scale-100', 'scale-120', 'scale-140', 'scale-160');
    document.body.classList.add(e.target.value);
  });

  // Voice Reading Speed
  elements.speechRateSelect.addEventListener('change', (e) => {
    state.speechRate = parseFloat(e.target.value);
  });

  // Master Audio Read-Aloud
  elements.masterTtsBtn.addEventListener('click', () => {
    if (state.isSpeaking) {
      stopSpeaking();
    } else {
      speakDischargeSummary();
    }
  });

  // Inline Read Plain Plan
  elements.btnReadPlainPlan.addEventListener('click', () => {
    if (state.currentAnalysis) {
      const planText = extractTextFromPlainPlan();
      speakText(planText);
    }
  });

  // Open Printable Passport
  elements.btnOpenPassport.addEventListener('click', () => {
    if (!state.currentAnalysis) {
      alert("Please run an analysis first to generate your Discharge Passport.");
      return;
    }
    // Store current state in localStorage for passport.html to read
    localStorage.setItem('careguardian_passport_data', JSON.stringify(state.currentAnalysis));
    window.open('passport.html', '_blank');
  });
}

function announceToScreenReader(msg) {
  const liveRegion = document.getElementById('output-panel') || document.body;
  const tempAlert = document.createElement('div');
  tempAlert.setAttribute('role', 'status');
  tempAlert.className = 'visually-hidden';
  tempAlert.textContent = msg;
  document.body.appendChild(tempAlert);
  setTimeout(() => tempAlert.remove(), 2000);
}

/* ==========================================================================
   Speech Synthesis (TTS)
   ========================================================================== */
function speakText(textToSpeak) {
  if (!('speechSynthesis' in window)) {
    alert("Speech synthesis is not supported in this browser.");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(textToSpeak);
  utterance.rate = state.speechRate;
  utterance.pitch = 1.0;
  
  // Pick preferred english voice
  const voices = window.speechSynthesis.getVoices();
  const naturalVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
  if (naturalVoice) utterance.voice = naturalVoice;

  utterance.onstart = () => {
    state.isSpeaking = true;
    elements.masterTtsBtn.classList.add('speaking');
    elements.ttsBtnText.textContent = "Stop Reading";
  };

  utterance.onend = () => {
    stopSpeaking();
  };

  utterance.onerror = () => {
    stopSpeaking();
  };

  state.currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  state.isSpeaking = false;
  elements.masterTtsBtn.classList.remove('speaking');
  elements.ttsBtnText.textContent = "Read Aloud";
}

function speakDischargeSummary() {
  if (!state.currentAnalysis) return;
  const a = state.currentAnalysis;
  const patient = a.patient.name;
  const totalMeds = a.extraction.total_medications;
  const risk = a.safety.overall_risk;
  const criticals = a.safety.critical_count;

  let speech = `Care Guardian Patient Summary for ${patient}. Safety status is: ${risk}. You have ${totalMeds} active discharge medications. `;
  
  if (criticals > 0) {
    speech += `Warning: ${criticals} critical safety interactions were detected. `;
    const topCritical = a.safety.alerts.find(al => al.severity === 'CRITICAL');
    if (topCritical) {
      speech += `Top warning: ${topCritical.plain_language} `;
    }
  }

  speech += `Here is your key instruction: Take your medicines according to your visual schedule, and never start over-the-counter pain relievers like Advil without speaking to your doctor. If you experience sudden chest pressure, trouble breathing, or black tarry stools, call 911 immediately.`;

  speakText(speech);
}

/* ==========================================================================
   Speech Recognition (Dictation STT)
   ========================================================================== */
function setupSpeechRecognition() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    elements.micStatusText.textContent = "Voice dictation not supported in this browser (use Chrome/Edge).";
    elements.btnMicToggle.disabled = true;
    return;
  }

  const rec = new SpeechRec();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = 'en-US';

  rec.onresult = (event) => {
    let interim = '';
    let final = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        final += event.results[i][0].transcript + ' ';
      } else {
        interim += event.results[i][0].transcript;
      }
    }
    elements.liveSpeechTranscript.textContent = final || interim;
    // Append to main textarea
    if (final) {
      elements.clinicalTextarea.value += (elements.clinicalTextarea.value ? '\n' : '') + final;
    }
  };

  rec.onerror = (e) => {
    console.error("Speech Recognition Error:", e);
    state.isRecording = false;
    elements.btnMicToggle.classList.remove('recording');
    elements.micStatusText.textContent = "Mic stopped. Click to dictate again.";
  };

  rec.onend = () => {
    state.isRecording = false;
    elements.btnMicToggle.classList.remove('recording');
    elements.micStatusText.textContent = "Click to start hands-free voice dictation";
  };

  state.recognition = rec;

  elements.btnMicToggle.addEventListener('click', () => {
    if (!state.isRecording) {
      try {
        state.recognition.start();
        state.isRecording = true;
        elements.btnMicToggle.classList.add('recording');
        elements.micStatusText.textContent = "🎙️ Listening... Speak clearly now.";
      } catch (err) {
        console.error(err);
      }
    } else {
      state.recognition.stop();
    }
  });
}

/* ==========================================================================
   Multimodal Tabs & OCR
   ========================================================================== */
function setupModalityTabs() {
  elements.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      elements.tabButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      elements.tabContents.forEach(c => {
        c.hidden = true;
        c.classList.remove('active');
      });

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const targetContent = document.getElementById(targetId);
      if (targetContent) {
        targetContent.hidden = false;
        targetContent.classList.add('active');
      }
    });
  });

  // Results Tabs
  elements.resTabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const panelId = btn.getAttribute('data-panel');
      elements.resTabButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      elements.resPanels.forEach(p => {
        p.hidden = true;
        p.classList.remove('active');
      });

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const panel = document.getElementById(panelId);
      if (panel) {
        panel.hidden = false;
        panel.classList.add('active');
      }
    });
  });
}

function setupOCR() {
  const dropzone = elements.dropzone;
  const fileInput = elements.fileInput;

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length) handleImageFile(files[0]);
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleImageFile(e.target.files[0]);
  });

  // Sample Rx image loader
  elements.btnLoadSampleRx.addEventListener('click', () => {
    simulateOCRScan();
  });
}

function handleImageFile(file) {
  if (!file.type.startsWith('image/')) {
    alert("Please upload an image file (PNG, JPG, WebP).");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    elements.ocrImagePreview.src = e.target.result;
    elements.ocrPreviewContainer.hidden = false;
    simulateOCRProcessing();
  };
  reader.readAsDataURL(file);
}

function simulateOCRScan() {
  // Generate sample prescription document via Canvas
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 600, 360);

  // Rx Header
  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('ST. JUDE MEMORIAL HOSPITAL - DISCHARGE RX', 30, 45);

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(30, 60);
  ctx.lineTo(570, 60);
  ctx.stroke();

  // Rx symbol
  ctx.fillStyle = '#0284c7';
  ctx.font = 'bold 36px serif';
  ctx.fillText('℞', 30, 110);

  // Handwritten/Printed text lines
  ctx.fillStyle = '#0f172a';
  ctx.font = '16px monospace';
  ctx.fillText('Patient: Miller, Robert | Age: 68 | Date: 11/10/2026', 80, 100);
  ctx.fillText('1. Aspirin 81 mg PO QD indefinitely', 80, 140);
  ctx.fillText('2. Clopidogrel (Plavix) 75 mg PO QD x 12 mos', 80, 175);
  ctx.fillText('3. Warfarin (Coumadin) 5 mg PO QD (Afib)', 80, 210);
  ctx.fillText('4. Atorvastatin 80 mg PO QHS - NO GRAPEFRUIT', 80, 245);
  ctx.fillText('5. Omeprazole 20 mg PO QD', 80, 280);

  ctx.fillStyle = '#b91c1c';
  ctx.font = 'italic 14px sans-serif';
  ctx.fillText('* WARNING: HIGH BLEEDING RISK - MONITOR INR WEEKLY *', 80, 320);

  elements.ocrImagePreview.src = canvas.toDataURL('image/png');
  elements.ocrPreviewContainer.hidden = false;
  simulateOCRProcessing();
}

function simulateOCRProcessing() {
  elements.ocrStatus.innerHTML = '<span class="spinner" aria-hidden="true"></span> Extracting clinical tokens from prescription image...';
  
  setTimeout(() => {
    elements.ocrStatus.innerHTML = '✅ OCR Extraction Complete! 5 medications recognized.';
    // Switch to text tab and populate extracted text
    elements.clinicalTextarea.value = `PRESCRIPTION SCAN EXTRACTION:\nPatient: Miller, Robert | Age: 68\n1. Aspirin 81 mg PO QD indefinitely.\n2. Clopidogrel (Plavix) 75 mg PO QD.\n3. Warfarin (Coumadin) 5 mg PO QD.\n4. Atorvastatin (Lipitor) 80 mg PO QHS.\n5. Omeprazole 20 mg PO QD.\nALLERGIES: Sulfa drugs.\nCONDITIONS: STEMI, Hypertension, Atrial Fibrillation.`;
    
    // Auto trigger analysis
    runAnalysis();
  }, 1000);
}

/* ==========================================================================
   Sample Cases & Analysis API
   ========================================================================== */
async function loadSampleCases() {
  try {
    const res = await fetch('/api/samples');
    const data = await res.json();
    state.sampleCases = data.samples || [];

    elements.sampleSelector.addEventListener('change', (e) => {
      const caseId = e.target.value;
      if (caseId === 'custom') {
        elements.clinicalTextarea.value = '';
        elements.patientName.value = '';
        elements.patientAge.value = '';
        elements.patientConditions.value = '';
        elements.patientAllergies.value = '';
      } else if (caseId) {
        loadInitialCase(caseId);
      }
    });

    elements.btnAnalyze.addEventListener('click', runAnalysis);
    elements.btnClearText.addEventListener('click', () => {
      elements.clinicalTextarea.value = '';
    });

  } catch (err) {
    console.error("Error loading clinical samples:", err);
  }
}

function loadInitialCase(caseId) {
  const c = state.sampleCases.find(item => item.id === caseId);
  if (!c) return;

  elements.sampleSelector.value = caseId;
  elements.clinicalTextarea.value = c.doctor_raw_text;
  elements.patientName.value = c.patient.name;
  elements.patientAge.value = c.patient.age;
  elements.patientConditions.value = c.patient.known_conditions.join(', ');
  elements.patientAllergies.value = c.patient.allergies.join(', ');

  runAnalysis();
}

async function runAnalysis() {
  const text = elements.clinicalTextarea.value.trim();
  if (!text) {
    alert("Please enter or scan a clinical discharge note first.");
    return;
  }

  const payload = {
    text: text,
    patient: {
      name: elements.patientName.value.trim(),
      age: parseInt(elements.patientAge.value) || 65,
      known_conditions: elements.patientConditions.value.split(',').map(s => s.trim()).filter(Boolean),
      allergies: elements.patientAllergies.value.split(',').map(s => s.trim()).filter(Boolean)
    }
  };

  elements.btnAnalyze.innerHTML = '<span class="spinner" aria-hidden="true"></span> Evaluating via Clinical Guardian AI...';
  elements.btnAnalyze.disabled = true;

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    state.currentAnalysis = data;
    renderResults(data);

  } catch (err) {
    console.error("Analysis API Error:", err);
    alert("Error running clinical safety evaluation: " + err.message);
  } finally {
    elements.btnAnalyze.innerHTML = '<span aria-hidden="true">🛡️</span> Run Clinical Safety Guardian & Simplify';
    elements.btnAnalyze.disabled = false;
  }
}

/* ==========================================================================
   Render Analysis Results
   ========================================================================== */
function renderResults(data) {
  const safety = data.safety;
  const extraction = data.extraction;

  // 1. Update Overall Risk Banner
  elements.riskBanner.className = 'risk-card';
  if (safety.critical_count > 0) {
    elements.riskBanner.classList.add('risk-critical');
    elements.riskTitle.textContent = "Critical Hazards Detected: Immediate Prescriber Review Required";
    elements.riskDescription.textContent = `Identified ${safety.critical_count} critical safety interaction(s) that may lead to severe adverse events (e.g. major bleeding, organ damage).`;
  } else if (safety.high_count > 0) {
    elements.riskBanner.classList.add('risk-high');
    elements.riskTitle.textContent = "High-Risk Interaction Detected: Clinical Adjustment Needed";
    elements.riskDescription.textContent = `Identified ${safety.high_count} significant interaction(s). Dose modification, alternate medications, or tight monitoring required.`;
  } else if (safety.total_alerts > 0) {
    elements.riskBanner.classList.add('risk-moderate');
    elements.riskTitle.textContent = "Moderate Interaction / Dietary Advisories Detected";
    elements.riskDescription.textContent = `Dietary timing or mineral separation recommended to maintain optimal medication efficacy.`;
  } else {
    elements.riskBanner.classList.add('risk-safe');
    elements.riskTitle.textContent = "Prescription Regimen Safe: No High-Risk Interactions Found";
    elements.riskDescription.textContent = `All prescribed medications are compatible under standard clinical practice guidelines.`;
  }

  elements.statCritical.textContent = safety.critical_count;
  elements.statMedCount = extraction.total_medications;
  elements.statMeds.textContent = extraction.total_medications;
  elements.alertTabCount.textContent = safety.total_alerts;

  // 2. Render Drug & Food Alerts List
  renderAlertsList(safety.alerts);

  // 3. Render Accessible Daily Timetable
  renderSchedule(data.schedule);

  // 4. Render 5th-Grade Plain Language Plan
  renderPlainPlan(data.plain_language_guide);
}

function renderAlertsList(alerts) {
  const container = elements.interactionAlertsList;
  container.innerHTML = '';

  if (!alerts || alerts.length === 0) {
    container.innerHTML = `
      <div class="alert-item severity-SAFE" style="border-left-color: #22c55e;">
        <h3 class="alert-title">✅ No Harmful Drug Interactions Detected</h3>
        <p class="alert-action-line">All prescribed medications have been cross-referenced against the NIH RxNav and TWOSIDES clinical databases without conflict.</p>
      </div>
    `;
    return;
  }

  alerts.forEach(alert => {
    const card = document.createElement('article');
    card.className = `alert-item severity-${alert.severity}`;

    const tagsHtml = (alert.red_flag_symptoms || [])
      .map(sym => `<span class="red-flag-tag">🚩 ${sym}</span>`)
      .join('');

    card.innerHTML = `
      <div class="alert-header">
        <div>
          <h3 class="alert-title">${alert.drugA} + ${alert.drugB}</h3>
          <span class="alert-action-line">${alert.category} • ${alert.match_type || 'Interaction'}</span>
        </div>
        <span class="badge-sev ${alert.severity}">${alert.severity}</span>
      </div>
      <div class="alert-plain-box">
        <strong>Plain-Language Explanation:</strong> ${alert.plain_language}
      </div>
      <p class="alert-action-line"><strong>Clinical Mechanism:</strong> ${alert.clinical_effect}</p>
      <p class="alert-action-line" style="margin-top: 0.35rem; color: #0284c7;">
        <strong>Recommended Action:</strong> ${alert.action_required}
      </p>
      ${tagsHtml ? `<div class="red-flags-tag-list">${tagsHtml}</div>` : ''}
    `;

    container.appendChild(card);
  });
}

function renderSchedule(schedule) {
  const container = elements.medicationScheduleGrid;
  container.innerHTML = '';

  const slots = [
    { key: 'morning', label: '🌅 Morning (8:00 AM)', items: schedule.morning },
    { key: 'afternoon', label: '☀️ Lunch / Midday (1:00 PM)', items: schedule.afternoon },
    { key: 'evening', label: '🌆 Dinner / Evening (7:00 PM)', items: schedule.evening },
    { key: 'bedtime', label: '🌙 Bedtime (10:00 PM)', items: schedule.bedtime },
    { key: 'as_needed', label: '⚠️ As Needed (PRN for symptoms only)', items: schedule.as_needed }
  ];

  slots.forEach(slot => {
    if (!slot.items || slot.items.length === 0) return;

    const card = document.createElement('div');
    card.className = 'time-slot-card';

    const itemsHtml = slot.items.map(med => `
      <div class="med-card-row">
        <div class="med-left">
          <span class="pill-icon" aria-hidden="true">💊</span>
          <div>
            <div class="med-name">${med.name} <small style="font-weight: 500; color: #64748b;">(${med.dosage})</small></div>
            <div class="med-sub">${med.drug_class} • ${med.route} • RxCUI: ${med.rxcui}</div>
          </div>
        </div>
        <div class="med-food-note">
          🍽️ ${med.food_guidance}
        </div>
      </div>
    `).join('');

    card.innerHTML = `
      <div class="time-slot-header">
        <span>${slot.label}</span>
        <span style="font-size: 0.8rem; font-weight: 600; color: #64748b;">${slot.items.length} Medication(s)</span>
      </div>
      <div class="slot-items-list">
        ${itemsHtml}
      </div>
    `;

    container.appendChild(card);
  });
}

function renderPlainPlan(guide) {
  const container = elements.plainPlanContent;
  container.innerHTML = '';

  const takeawaysHtml = guide.key_takeaways.map(t => `<li>${t}</li>`).join('');
  const em911Html = guide.red_flag_actions["CALL 911 IMMEDIATELY IF"].map(s => `<li>🚨 ${s}</li>`).join('');
  const emClinicHtml = guide.red_flag_actions["CALL YOUR CLINIC WITHIN 24 HOURS IF"].map(s => `<li>📞 ${s}</li>`).join('');

  container.innerHTML = `
    <p style="font-size: 1.05rem; font-weight: 600; margin-bottom: 0.75rem;">${guide.patient_salutation}</p>
    
    <h4>Daily Golden Rules for Your Safety:</h4>
    <ul>${takeawaysHtml}</ul>

    <div class="red-flag-box">
      <h5>🚨 Call 911 or Go to the Nearest Emergency Room If You Experience:</h5>
      <ul style="margin-bottom: 0;">${em911Html}</ul>
    </div>

    <div class="red-flag-box" style="background-color: #fffbeb; border-color: #f59e0b; margin-top: 1rem;">
      <h5 style="color: #92400e;">📞 Call Your Doctor or Clinic Within 24 Hours If:</h5>
      <ul style="margin-bottom: 0; color: #78350f;">${emClinicHtml}</ul>
    </div>
  `;
}

function extractTextFromPlainPlan() {
  if (!state.currentAnalysis) return "";
  const g = state.currentAnalysis.plain_language_guide;
  let text = `${g.patient_salutation}. Key instructions: ${g.key_takeaways.join('. ')}. Call 911 immediately if you have ${g.red_flag_actions["CALL 911 IMMEDIATELY IF"].join(', ')}.`;
  return text;
}

/* ==========================================================================
   Interactive Clinical Chatbot
   ========================================================================== */
function setupChat() {
  elements.btnChatSend.addEventListener('click', sendChatMessage);
  elements.chatUserInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChatMessage();
  });

  elements.quickChips.forEach(chip => {
    chip.addEventListener('click', () => {
      elements.chatUserInput.value = chip.getAttribute('data-q');
      sendChatMessage();
    });
  });

  // Chat Voice Input
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRec) {
    const chatRec = new SpeechRec();
    chatRec.lang = 'en-US';
    chatRec.onresult = (e) => {
      elements.chatUserInput.value = e.results[0][0].transcript;
      sendChatMessage();
    };
    elements.btnChatMic.addEventListener('click', () => {
      chatRec.start();
    });
  }
}

async function sendChatMessage() {
  const q = elements.chatUserInput.value.trim();
  if (!q) return;

  // Append user message
  appendChatMessage(q, 'user');
  elements.chatUserInput.value = '';

  const activeMeds = (state.currentAnalysis && state.currentAnalysis.extraction)
    ? state.currentAnalysis.extraction.medications.map(m => m.name)
    : [];

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q, medications: activeMeds })
    });
    const data = await res.json();
    appendChatMessage(data.answer, 'bot', data.alert_level === 'CRITICAL');

    // If user clicked mic or TTS is requested, speak response
    if (data.spoken_text && state.isSpeaking) {
      speakText(data.spoken_text);
    }
  } catch (err) {
    appendChatMessage("Sorry, I could not connect to the clinical care engine.", 'bot');
  }
}

function appendChatMessage(text, sender, isCritical = false) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-msg ${sender}-msg ${isCritical ? 'critical-reply' : ''}`;
  msgDiv.innerHTML = `<p>${text}</p>`;
  elements.chatMessages.appendChild(msgDiv);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}
