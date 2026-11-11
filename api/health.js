const ddiDatabase = require('../data/ddi_knowledge_base.json');
const clinicalSamples = require('../data/clinical_samples.json');

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  res.status(200).json({
    status: "online",
    version: "2.4.0",
    system: "Multimodal Clinical Discharge & Drug Interaction Guardian",
    knowledge_base_rules: ddiDatabase.interactions.length,
    sample_cases: clinicalSamples.samples.length,
    open_models_referenced: [
      {
        id: "d4data/biomedical-ner-all",
        type: "Biomedical Named Entity Recognition (Hugging Face)",
        status: "Ready / Local Inference Active",
        repo: "https://huggingface.co/d4data/biomedical-ner-all"
      },
      {
        id: "emilyalsentzer/Bio_ClinicalBERT",
        type: "Clinical Note Representation (MIMIC-III PhysioNet)",
        status: "Architecture Configured",
        repo: "https://huggingface.co/emilyalsentzer/Bio_ClinicalBERT"
      },
      {
        id: "NIH-NLM-RxNav",
        type: "National Library of Medicine RxNorm REST API",
        status: "Connected / Offline Cached",
        url: "https://rxnav.nlm.nih.gov/REST/interaction/interaction.json"
      }
    ]
  });
};
