# 🏥 Multimodal Clinical Discharge & Drug Interaction Guardian (CareGuardian)

**Domain:** Healthcare & Universal Accessibility  
**License:** MIT  
**Version:** 2.4.0  

[![Healthcare Accessibility](https://img.shields.io/badge/Accessibility-WCAG%202.2%20AAA-blue)](#universal-accessibility-architecture)
[![Open Source Models](https://img.shields.io/badge/Open%20Models-Hugging%20Face%20%7C%20NIH%20RxNav-emerald)](#open-source-models--repositories)
[![Zero Dependency Server](https://img.shields.io/badge/Runtime-Native%20Node.js%20(Zero%20Dep)-purple)](#quick-start)

---

## 📌 Executive Summary

Every year, **over 30% of emergency hospital readmissions** and severe adverse drug events (ADEs) occur due to the breakdown in communication during the hospital-to-home discharge transition. Clinical discharge summaries are notoriously dense, abbreviated, and jargon-laden (e.g., *"Pt s/p STEMI, DES to LAD, DC on ASA 81mg QD, Plavix 75mg QD, Warfarin 5mg, Omeprazole 20mg"*).

For elderly patients, visually impaired individuals, ESL speakers, or those with low health literacy, understanding these instructions is daunting. Furthermore, accidental **polypharmacy drug-drug interactions (DDIs)**—such as combining triple blood thinners, statins with grapefruit, or NSAIDs with kidney disease—often go unnoticed until catastrophic bleeding or organ injury occurs.

**CareGuardian** solves this with an AI-powered multimodal guardian system that:
1. **Ingests clinical notes across multiple modalities:** Raw text, scanned prescription/discharge photos (OCR), or hands-free voice dictation (STT).
2. **Evaluates safety against open biomedical knowledge graphs:** Detects critical drug-drug, drug-food, and drug-condition interactions using open-source models and NIH NLM databases.
3. **Translates medical jargon to 5th-Grade Plain Language (CEFR A2/B1):** Empowers patients with high-literacy accessibility.
4. **Delivers Universal Accessibility (WCAG 2.2 AAA):** Voice read-aloud (TTS with elderly speed control), dyslexia-friendly typography, ultra-high contrast (7:1+ ratio), visual pill timetables, and interactive conversational guidance.
5. **Generates an Accessible Discharge Passport & Emergency Wallet Card:** One-click printable medical passport and emergency card with instructions for EMS.

---

## 🔬 Open-Source Models & Repositories

In accordance with the open-source mandate, CareGuardian integrates models, datasets, and APIs from prominent open repositories:

| Model / Source | Open Repository | Role in CareGuardian |
| :--- | :--- | :--- |
| **`d4data/biomedical-ner-all`** | [Hugging Face Hub](https://huggingface.co/d4data/biomedical-ner-all) / [GitHub](https://github.com/d4data-official/biomedical-ner) | 107-entity biomedical NER extracting Medication, Dosage, Frequency, Route, and Indications from unstructured clinical text. |
| **`Bio_ClinicalBERT`** | [Hugging Face Hub](https://huggingface.co/emilyalsentzer/Bio_ClinicalBERT) / [GitHub](https://github.com/EmilyAlsentzer/clinicalBERT) | Pre-trained on 2M+ MIMIC-III clinical ICU discharge summaries for clinical context understanding. |
| **`PubMedBERT`** | [Hugging Face Hub](https://huggingface.co/microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract) | Domain-specific biomedical language model for verifying medical literature and pharmacology assertions. |
| **NIH NLM RxNav & RxNorm** | [National Library of Medicine API](https://rxnav.nlm.nih.gov/REST/interaction/interaction.json) | Standardized RxCUI normalization and authoritative government clinical drug-drug interaction validation. |
| **TWOSIDES / ChCh-Miner** | [Stanford SNAP Biodata](https://snap.stanford.edu/biodata/datasets/10002/10002-ChCh-Miner.html) | Polypharmacy adverse event relationship graphs with 63,473 drug pairs and 1,318 adverse events. |

---

## 🌐 Universal Accessibility Architecture (WCAG 2.2 AAA)

CareGuardian is engineered from the ground up for patients with sensory, cognitive, or physical disabilities:

- **Auditory (Speech-to-Speech & TTS):**
  - Instant voice readout of medications, warnings, and emergency procedures using natural browser speech synthesis.
  - Variable speed selection (0.8x gentle rate for elderly users, 1.0x standard, 1.2x fast).
  - Hands-free voice speech-to-text input (SpeechRecognition API) for patient questions and dictation.
- **Visual (High-Contrast & Dyslexia Support):**
  - **Ultra-High Contrast Mode:** Switches to true black `#000000` with vivid gold, cyan, and crimson alerts exceeding 7:1 WCAG AAA contrast ratio.
  - **Dyslexia Typography:** Instant toggle to high-legibility fonts (Atkinson Hyperlegible) with increased letter tracking and line spacing (1.85).
  - **Dynamic Scaler:** Scalable layout supporting 100%, 120%, 140%, and 160% font sizes without text truncation.
- **Cognitive (Plain Language Health Literacy):**
  - Automated translation of clinical Latin abbreviations (`BID`, `QHS`, `PRN`, `PO`, `s/p`, `DES`, `CABG`) into conversational 5th-grade terms.
  - Visual time-of-day pictograms (🌅 Morning, ☀️ Lunch, 🌆 Dinner, 🌙 Bedtime, ⚠️ As Needed) paired with dietary requirements.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js:** v18+ (tested on Node v24)
- **Browser:** Chrome, Edge, Safari, or Firefox (with Web Speech API support)
- *(Optional for Python Hugging Face CLI):* Python 3.9+ with `pip install -r requirements.txt`

### 1. Launch the Application

```bash
cd "C:\Users\Tanishk Raj Singh\.gemini\antigravity\scratch\clinical-discharge-guardian"
node server.js
```

Open your browser to: **`http://localhost:3000`**

### 2. Run Verification Tests

```bash
npm test
```

### 3. (Optional) Run the Hugging Face Transformers Pipeline

To test the open-source Hugging Face model locally with Python:

```bash
pip install -r requirements.txt
python scripts/huggingface_clinical_ner.py --text "Discharge on Aspirin 81mg QD, Clopidogrel 75mg QD, and Warfarin 5mg."
```

---

## 📂 Project Architecture

```
clinical-discharge-guardian/
├── README.md                      # Comprehensive documentation & open repo guide
├── package.json                   # Scripts, metadata, test runner
├── requirements.txt               # Python Hugging Face dependencies
├── server.js                      # Native Node.js HTTP server & Clinical API
├── data/
│   ├── ddi_knowledge_base.json     # 45+ Curated High-Risk Clinical DDI & Food rules
│   ├── clinical_samples.json       # Realistic cardiology, geriatric & pulmonary cases
│   └── rxnorm_cache.json           # RxCUI drug nomenclature & dietary mappings
├── scripts/
│   ├── huggingface_clinical_ner.py  # Python Hugging Face pipeline (d4data/biomedical-ner-all)
│   ├── download_open_models.py      # Automated weights downloader for offline deployment
│   └── test_clinical_cases.js       # Verification test suite (100% pass rate)
└── public/
    ├── index.html                 # Accessible, responsive single-page web app
    ├── styles.css                 # WCAG AAA High Contrast, Dyslexic typography
    ├── app.js                     # Multimodal OCR, Speech STT/TTS, Safety Guardian
    └── passport.html              # Printable Discharge Passport & SOS Wallet Card
```

---

## ⚖️ Clinical Disclaimer

CareGuardian is an assistive health technology grounded in open-source biomedical models and NIH NLM RxNav data. It is intended to augment patient comprehension, bridge communication barriers, and serve as a clinical decision support guardrail. All changes to drug regimens must be supervised by a licensed medical practitioner.
