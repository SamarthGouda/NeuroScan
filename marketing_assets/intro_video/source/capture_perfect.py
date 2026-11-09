"""
NeuroScan AI - Precision Screenshot Capture
Navigates real application at 1920x1080, logs in, captures:
1. Dashboard
2. Upload Page (clean)
3. Scan Analysis Overview (Classification, Uncertainty, Risk)
4. Attention U-Net Segmentation & Lesion Mask
5. Explainable AI Suite (Grad-CAM, Grad-CAM++, Integrated Gradients)
6. Quantitative Radiomics & SHAP Feature Importance
7. Multi-Model Ablation & Comparative Statistics
8. Clinical Cases Archive
"""

import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT_DIR = Path(r"c:\Visual Studio\Brain Tumor Advanced\marketing_assets\intro_video\assets\screenshots")
OUT_DIR.mkdir(parents=True, exist_ok=True)
BASE_URL = "http://localhost:8000"
VIEWPORT = {"width": 1920, "height": 1080}
PASSWORD = "Lordsam@123"

# Pick the first valid scan id from neurovision.db
import sqlite3
conn = sqlite3.connect(r"c:\Visual Studio\Brain Tumor Advanced\neurovision.db")
c = conn.cursor()
c.execute("SELECT scan_id FROM analyses WHERE mask_overlay_b64 IS NOT NULL LIMIT 1")
row = c.fetchone()
if row:
    SCAN_ID = row[0]
else:
    c.execute("SELECT scan_id FROM analyses LIMIT 1")
    SCAN_ID = c.fetchone()[0]
conn.close()
print(f"Using verified Scan ID: {SCAN_ID}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport=VIEWPORT)
    page = context.new_page()

    # 1. Login
    print("[1] Logging in...")
    page.goto(f"{BASE_URL}/login", wait_until="networkidle")
    time.sleep(1)
    page.fill('#login-username', 'samarth')
    page.fill('#login-password', PASSWORD)
    page.click('[data-testid="button-submit-login"]')
    page.wait_for_timeout(3000)
    print(f"  Current URL after login: {page.url}")

    # 2. Doctor Dashboard
    print("[2] Doctor Dashboard...")
    page.goto(f"{BASE_URL}/doctor-dashboard", wait_until="networkidle")
    time.sleep(2)
    page.screenshot(path=str(OUT_DIR / "01_dashboard.png"), full_page=False)
    print("  ✓ 01_dashboard.png")

    # 3. Upload Page
    print("[3] Upload Page...")
    page.goto(f"{BASE_URL}/upload", wait_until="networkidle")
    time.sleep(2)
    page.screenshot(path=str(OUT_DIR / "02_upload.png"), full_page=False)
    print("  ✓ 02_upload.png")

    # 4. Scan Analysis Page
    print(f"[4] Scan Analysis ({SCAN_ID})...")
    page.goto(f"{BASE_URL}/scan/{SCAN_ID}", wait_until="networkidle")
    time.sleep(3)
    page.screenshot(path=str(OUT_DIR / "03_classification_overview.png"), full_page=False)
    print("  ✓ 03_classification_overview.png")

    # 5. Segmentation focus (scroll slightly to focus on scan & mask)
    print("[5] Segmentation & Mask Overlay...")
    page.evaluate("window.scrollTo(0, 180)")
    time.sleep(1)
    page.screenshot(path=str(OUT_DIR / "04_segmentation.png"), full_page=False)
    print("  ✓ 04_segmentation.png")

    # 6. Explainable AI Tab
    print("[6] Explainable AI Tab...")
    try:
        page.click('[data-testid="tab-xai"], button:has-text("Explainability"), button:has-text("XAI")', timeout=5000)
        time.sleep(2)
    except Exception as e:
        print(f"  Tab XAI error: {e}")
    page.evaluate("window.scrollTo(0, 480)")
    time.sleep(1.5)
    page.screenshot(path=str(OUT_DIR / "05_gradcam_xai.png"), full_page=False)
    print("  ✓ 05_gradcam_xai.png")

    # 7. Radiomics Tab
    print("[7] Radiomics Tab...")
    try:
        page.click('[data-testid="tab-radiomics"], button:has-text("Radiomics")', timeout=5000)
        time.sleep(2)
    except Exception as e:
        print(f"  Tab Radiomics error: {e}")
    page.screenshot(path=str(OUT_DIR / "06_radiomics.png"), full_page=False)
    print("  ✓ 06_radiomics.png")

    # 8. Statistics / Ablation Page
    print("[8] Model Benchmark & Statistics...")
    page.goto(f"{BASE_URL}/statistics", wait_until="networkidle")
    time.sleep(2)
    page.screenshot(path=str(OUT_DIR / "07_statistics.png"), full_page=False)
    print("  ✓ 07_statistics.png")

    # 9. Cases Directory
    print("[9] Clinical Cases Directory...")
    page.goto(f"{BASE_URL}/cases", wait_until="networkidle")
    time.sleep(2)
    page.screenshot(path=str(OUT_DIR / "08_cases.png"), full_page=False)
    print("  ✓ 08_cases.png")

    browser.close()

print("All screenshots successfully captured!")
