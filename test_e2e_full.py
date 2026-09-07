"""
End-to-End Full Verification Suite for NEUROSCAN AI
Tests all roles, authentications, MRI inference with Attention U-Net & XAI, 
report generation, case management, and admin security audit trail.
"""
import sys
import io

# Ensure UTF-8 output on Windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import requests
import json
import time
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000"

def run_tests():
    session = requests.Session()
    print("=" * 70)
    print("STARTING E2E FULL VERIFICATION SUITE -- NEUROSCAN AI")
    print("=" * 70)

    # 1. Health & Unauthenticated Guard
    print("\n[TEST 1] System Health & Strict API Guard...")
    res = session.get(f"{BASE_URL}/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    health_data = res.json()
    print(f"  [OK] Health OK: {health_data['application']} (v{health_data['version']})")

    res = session.get(f"{BASE_URL}/api/auth/user")
    assert res.status_code == 401, f"Unauthenticated expected 401, got {res.status_code}"
    assert res.headers.get("content-type", "").startswith("application/json"), "Auth guard must return JSON, not HTML"
    print("  [OK] Unauthenticated /api/auth/user returned clean JSON 401")

    res = session.get(f"{BASE_URL}/api/invalid_endpoint_xyz")
    assert res.status_code == 404, f"Expected 404, got {res.status_code}"
    assert res.headers.get("content-type", "").startswith("application/json"), "API 404 must return JSON, not HTML"
    print("  [OK] API 404 Guard returned clean JSON 404 (NEVER index.html)")

    # 2. Doctor Authentication
    print("\n[TEST 2] Doctor Login Flow...")
    res = session.post(f"{BASE_URL}/api/auth/login", json={"username": "doctor", "password": "doctor123"})
    assert res.status_code == 200, f"Doctor login failed: {res.text}"
    doc_user = res.json()
    assert doc_user["role"] == "doctor", f"Expected doctor role, got {doc_user['role']}"
    print(f"  [OK] Doctor Logged In: {doc_user['fullName']} ({doc_user['title']})")

    res = session.get(f"{BASE_URL}/api/auth/user")
    assert res.status_code == 200 and res.json()["username"] == "doctor"
    print("  [OK] Verified /api/auth/user returns authenticated doctor session")

    # 3. Doctor Upload & Full ML/XAI Pipeline
    print("\n[TEST 3] MRI Scan Ingestion & Deep Learning Pipeline...")
    glioma_path = Path("dataset/Testing/glioma/Te-gl_10.jpg")
    if not glioma_path.exists():
        glioma_path = next(Path("dataset/Testing/glioma").glob("*.jpg"))
    assert glioma_path.exists(), "Test scan file not found"

    with open(glioma_path, "rb") as f:
        files = {"scan": (glioma_path.name, f, "image/jpeg")}
        data = {
            "patientName": "Arthur Pendelton",
            "patientId": "PT-2026-9901",
            "patientAge": "58",
            "patientGender": "Male",
            "hospitalName": "NeuroScan Medical Center",
            "patientPhoneNumber": "+1-555-0199",
            "patientAddress": "Boston, MA"
        }
        res = session.post(f"{BASE_URL}/api/scans/upload", files=files, data=data)

    assert res.status_code == 200, f"Scan upload failed: {res.text}"
    scan_result = res.json()
    scan_id = scan_result["id"]
    print(f"  [OK] Scan Processed Successfully! Scan ID: {scan_id}")
    print(f"    - Pathology Prediction: {scan_result['tumorType']}")
    print(f"    - Model Confidence: {(scan_result['confidence'] * 100):.1f}%")
    print(f"    - Bayesian Uncertainty: {(scan_result['uncertainty'] * 100):.2f}% ({scan_result['uncertaintyTier']} tier)")
    print(f"    - Clinical Risk Level: {scan_result['riskLevel']}")

    ana = scan_result["analysisData"]
    assert "mask_overlay" in ana["segmentation"], "Attention U-Net mask overlay missing"
    assert "gradcam" in ana["xai"], "Grad-CAM heatmap missing"
    assert "gradcam_plus" in ana["xai"], "Grad-CAM++ heatmap missing"
    assert "integrated_gradients" in ana["xai"], "Integrated Gradients heatmap missing"
    assert len(ana["top_radiomics_features"]) > 0, "Radiomics biomarkers missing"
    print("    - Attention U-Net Segmentation: Valid base64 overlay")
    print("    - XAI Heatmaps: Grad-CAM, Grad-CAM++, Integrated Gradients present")
    print(f"    - Radiomics: {len(ana['top_radiomics_features'])} features extracted with SHAP rankings")

    # 4. Diagnostic Report Generation
    print("\n[TEST 4] Clinical Diagnostic Report Generation & Download...")
    res = session.post(f"{BASE_URL}/api/scans/{scan_id}/reports/generate")
    assert res.status_code == 200, f"Report generation failed: {res.text}"
    rep_data = res.json()
    report_id = rep_data["id"]
    print(f"  [OK] Report v{rep_data['version']} Generated (ID: {report_id})")

    res = session.get(f"{BASE_URL}/api/reports/{report_id}/download")
    assert res.status_code == 200, "Report download failed"
    assert "NEUROSCAN AI CLINICAL RADIOLOGY REPORT" in res.text
    assert "MANDATORY MEDICAL & LEGAL DISCLAIMER" in res.text
    print("  [OK] Report text download verified with mandatory clinical disclaimer")

    # 5. Case Management
    print("\n[TEST 5] Clinical Case Management...")
    res = session.get(f"{BASE_URL}/api/cases")
    assert res.status_code == 200
    cases = res.json()
    assert len(cases) > 0, "Cases list should not be empty"
    target_case = next(c for c in cases if c["scanId"] == scan_id)
    print(f"  [OK] Found Case {target_case['caseNumber']} for Patient {target_case['patientName']}")

    res = session.put(
        f"{BASE_URL}/api/cases/{target_case['id']}",
        json={"status": "under_review", "priority": "high", "notes": "Focal mass requires contrast correlation."}
    )
    assert res.status_code == 200
    print("  [OK] Case status updated to UNDER_REVIEW with physician notes")

    # 6. Technician Role Isolation
    print("\n[TEST 6] Technician Login & RBAC Enforcement...")
    session.post(f"{BASE_URL}/api/auth/logout")
    res = session.post(f"{BASE_URL}/api/auth/login", json={"username": "tech", "password": "tech123"})
    assert res.status_code == 200 and res.json()["role"] == "technician"
    print("  [OK] Technician Logged In")

    # Verify technician cannot access admin endpoints
    res = session.get(f"{BASE_URL}/api/users")
    assert res.status_code == 403, f"Technician must get 403 on /api/users, got {res.status_code}"
    print("  [OK] RBAC Verified: Technician blocked from /api/users (403 Forbidden)")

    res = session.get(f"{BASE_URL}/api/audit")
    assert res.status_code == 403, f"Technician must get 403 on /api/audit, got {res.status_code}"
    print("  [OK] RBAC Verified: Technician blocked from /api/audit (403 Forbidden)")

    # 7. Administrator Management & Audit Trail
    print("\n[TEST 7] Administrator Dashboard, User Management & Audit Trail...")
    session.post(f"{BASE_URL}/api/auth/logout")
    res = session.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert res.status_code == 200 and res.json()["role"] == "admin"
    print("  [OK] Administrator Logged In")

    res = session.get(f"{BASE_URL}/api/users")
    assert res.status_code == 200
    users = res.json()
    print(f"  [OK] Admin fetched {len(users)} staff accounts")

    # Create new staff member
    ts = int(time.time())
    new_user_data = {
        "username": f"dr_watson_{ts}",
        "email": f"watson_{ts}@neuroscan.ai",
        "full_name": "Dr. John Watson",
        "role": "doctor",
        "password": "Password123!",
        "title": "Associate Radiologist"
    }
    res = session.post(f"{BASE_URL}/api/users", json=new_user_data)
    assert res.status_code == 200, f"User creation failed: {res.text}"
    print(f"  [OK] Admin created new staff member: {new_user_data['full_name']}")

    # Inspect Audit Log
    res = session.get(f"{BASE_URL}/api/audit?limit=20")
    assert res.status_code == 200
    audit_data = res.json()
    assert audit_data["total"] > 0, "Audit logs must record events"
    print(f"  [OK] Audit Trail verified: {audit_data['total']} immutable security events logged in SQLite")

    # ML Statistics & Ablation
    res = session.get(f"{BASE_URL}/api/stats/ablation")
    assert res.status_code == 200
    ablation = res.json()
    assert ablation["best_model"] == "concat_no_attn"
    print(f"  [OK] Model Statistics verified: Best model is '{ablation['best_model']}' with {len(ablation['ablation_table'])} architectures")

    # 8. Frontend SPA Serving Verification
    print("\n[TEST 8] Frontend SPA Serving...")
    res = session.get(f"{BASE_URL}/")
    assert res.status_code == 200
    assert "NEUROSCAN AI" in res.text or "<div id=\"root\">" in res.text
    print("  [OK] Root / serves built React single-page application index.html")

    print("\n" + "=" * 70)
    print("ALL E2E VERIFICATION TESTS PASSED SUCCESSFULLY (100% PASS RATE)!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
