#!/usr/bin/env python3
"""
Model Downloader & Verifier for Open-Source Clinical NLP Models
Downloads weights from Hugging Face repositories for offline execution.
"""

import os
import sys

RECOMMENDED_MODELS = [
    {
        "repo_id": "d4data/biomedical-ner-all",
        "description": "Biomedical Named Entity Recognition (Medication, Dosage, Diagnosis)",
        "task": "token-classification"
    },
    {
        "repo_id": "emilyalsentzer/Bio_ClinicalBERT",
        "description": "Clinical Language Model pre-trained on MIMIC-III discharge summaries",
        "task": "fill-mask / feature-extraction"
    },
    {
        "repo_id": "microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract",
        "description": "PubMed Domain-Specific Transformer for Medical Verification",
        "task": "feature-extraction"
    }
]

def check_huggingface_hub():
    try:
        from huggingface_hub import snapshot_download
        return snapshot_download
    except ImportError:
        print("[!] huggingface_hub is not installed in the active Python environment.")
        print("    Install via: pip install huggingface_hub transformers torch")
        return None

def download_models(target_dir="./models"):
    downloader = check_huggingface_hub()
    if not downloader:
        sys.exit(1)

    os.makedirs(target_dir, exist_ok=True)
    print("=" * 65)
    print(" Multimodal Clinical Discharge Guardian: Open Model Downloader")
    print("=" * 65)

    for item in RECOMMENDED_MODELS:
        repo = item["repo_id"]
        desc = item["description"]
        print(f"\n[+] Processing: {repo}")
        print(f"    Description: {desc}")
        try:
            local_path = os.path.join(target_dir, repo.replace("/", "_"))
            print(f"    Downloading to: {local_path} ...")
            path = downloader(repo_id=repo, local_dir=local_path)
            print(f"    [OK] Successfully cached at: {path}")
        except Exception as e:
            print(f"    [!] Error downloading {repo}: {e}")

if __name__ == "__main__":
    download_models()
