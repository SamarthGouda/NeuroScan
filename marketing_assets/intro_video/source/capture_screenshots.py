"""
NeuroScan AI - Cinematic Screenshot Capture
Uses Playwright (system Python) to capture real application footage at 1920x1080.
Run with: python capture_screenshots.py --password YOUR_PASSWORD
"""

import argparse
import os
import sys
import time
import json
from pathlib import Path

# Output directory (relative to this script)
SCRIPT_DIR = Path(__file__).parent
OUT_DIR = SCRIPT_DIR.parent / "assets" / "screenshots"
OUT_DIR.mkdir(parents=True, exist_ok=True)

BASE_URL = "http://localhost:8000"
VIEWPORT = {"width": 1920, "height": 1080}

# MRI test image (de-identified public dataset)
GLIOMA_IMG = Path(r"c:\Visual Studio\Brain Tumor Advanced\dataset\Testing\glioma\Te-gl_0010.jpg")
# Fallback options
GLIOMA_FALLBACKS = [
    Path(r"c:\Visual Studio\Brain Tumor Advanced\dataset\Testing\glioma\Te-gl_10.jpg"),
    Path(r"c:\Visual Studio\Brain Tumor Advanced\dataset\Testing\glioma"),
]

def find_mri_image():
    if GLIOMA_IMG.exists():
        return GLIOMA_IMG
    for fb in GLIOMA_FALLBACKS:
        if fb.is_file():
            return fb
        if fb.is_dir():
            imgs = list(fb.glob("*.jpg")) + list(fb.glob("*.png"))
            if imgs:
                return imgs[0]
    return None

def capture(password: str):
    from playwright.sync_api import sync_playwright

    mri_path = find_mri_image()
    if not mri_path:
        print("ERROR: No MRI test image found in dataset/Testing/glioma/")
        sys.exit(1)
    print(f"Using MRI image: {mri_path}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=300)
        context = browser.new_context(viewport=VIEWPORT)
        page = context.new_page()

        # -----------------------------------------------------------------
        # SCENE 1: Login + Dashboard
        # -----------------------------------------------------------------
        print("[Scene 1] Login and Dashboard...")
        page.goto(f"{BASE_URL}/login", wait_until="networkidle")
        time.sleep(1)

        # Try multiple selector patterns for login form
        try:
            page.fill('input[name="username"], input[placeholder*="username" i], #username, [data-testid*="username"]', 'samarth')
        except Exception:
            page.locator('input').first.fill('samarth')

        try:
            page.fill('input[type="password"]', password)
        except Exception:
            page.locator('input[type="password"]').first.fill(password)

        try:
            page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")')
        except Exception:
            page.locator('button').last.click()

        page.wait_for_timeout(3000)

        # Navigate to doctor dashboard
        page.goto(f"{BASE_URL}/doctor-dashboard", wait_until="networkidle")
        time.sleep(2)
        page.screenshot(path=str(OUT_DIR / "01_dashboard.png"), full_page=False)
        print("  ✓ 01_dashboard.png")

        # -----------------------------------------------------------------
        # SCENE 2: Upload Page (empty state)
        # -----------------------------------------------------------------
        print("[Scene 2] Upload page...")
        page.goto(f"{BASE_URL}/upload", wait_until="networkidle")
        time.sleep(1.5)
        page.screenshot(path=str(OUT_DIR / "02_upload_empty.png"), full_page=False)
        print("  ✓ 02_upload_empty.png")

        # -----------------------------------------------------------------
        # SCENE 3: Upload MRI and wait for results
        # -----------------------------------------------------------------
        print("[Scene 3] Uploading MRI scan (this may take 15-30s)...")
        try:
            file_input = page.locator('input[type="file"]').first
            file_input.set_input_files(str(mri_path))
            time.sleep(1)
            page.screenshot(path=str(OUT_DIR / "03_upload_selected.png"), full_page=False)
            print("  ✓ 03_upload_selected.png")

            # Click Analyze / Submit button
            try:
                page.click('button:has-text("Analyze"), button:has-text("Upload"), button:has-text("Submit"), button:has-text("Run")')
            except Exception:
                # Try any primary button
                page.locator('button[type="submit"]').first.click()

            # Wait for results (ML inference can take up to 30s)
            print("  Waiting for ML inference results...")
            page.wait_for_timeout(5000)

            # Wait for results page or analysis to appear
            for _ in range(12):  # up to 60s total
                current_url = page.url
                content = page.content()
                if "scan-analysis" in current_url or "classification" in content.lower() or "glioma" in content.lower():
                    break
                page.wait_for_timeout(5000)
                print("  Still waiting for results...")

        except Exception as e:
            print(f"  Warning during upload: {e}")

        # -----------------------------------------------------------------
        # SCENE 4: Scan Analysis - Classification Results
        # -----------------------------------------------------------------
        print("[Scene 4] Classification results...")
        time.sleep(2)
        page.screenshot(path=str(OUT_DIR / "04_classification.png"), full_page=False)
        print("  ✓ 04_classification.png")

        # -----------------------------------------------------------------
        # SCENE 5: Segmentation Tab
        # -----------------------------------------------------------------
        print("[Scene 5] Segmentation tab...")
        try:
            page.click('button:has-text("Segmentation"), [role="tab"]:has-text("Segmentation"), a:has-text("Segmentation")')
            page.wait_for_timeout(3000)
        except Exception:
            print("  Warning: Could not click Segmentation tab")
        page.screenshot(path=str(OUT_DIR / "05_segmentation.png"), full_page=False)
        print("  ✓ 05_segmentation.png")

        # -----------------------------------------------------------------
        # SCENE 6: XAI / Grad-CAM Tab
        # -----------------------------------------------------------------
        print("[Scene 6] XAI / Grad-CAM tab...")
        try:
            page.click('button:has-text("XAI"), button:has-text("Explainability"), button:has-text("Grad"), [role="tab"]:has-text("XAI"), [role="tab"]:has-text("Explain")')
            page.wait_for_timeout(3000)
        except Exception:
            print("  Warning: Could not click XAI tab")
        page.screenshot(path=str(OUT_DIR / "06_gradcam.png"), full_page=False)
        print("  ✓ 06_gradcam.png")

        # -----------------------------------------------------------------
        # SCENE 7: Radiomics Tab
        # -----------------------------------------------------------------
        print("[Scene 7] Radiomics tab...")
        try:
            page.click('button:has-text("Radiomics"), [role="tab"]:has-text("Radiomics")')
            page.wait_for_timeout(3000)
        except Exception:
            print("  Warning: Could not click Radiomics tab")
        page.screenshot(path=str(OUT_DIR / "07_radiomics.png"), full_page=False)
        print("  ✓ 07_radiomics.png")

        # -----------------------------------------------------------------
        # SCENE 8: Statistics / Model Comparison
        # -----------------------------------------------------------------
        print("[Scene 8] Statistics page...")
        try:
            page.goto(f"{BASE_URL}/statistics", wait_until="networkidle")
            time.sleep(2)
        except Exception:
            pass
        page.screenshot(path=str(OUT_DIR / "08_statistics.png"), full_page=False)
        print("  ✓ 08_statistics.png")

        # -----------------------------------------------------------------
        # SCENE 9: Cases page
        # -----------------------------------------------------------------
        print("[Scene 9] Cases page...")
        try:
            page.goto(f"{BASE_URL}/cases", wait_until="networkidle")
            time.sleep(2)
        except Exception:
            pass
        page.screenshot(path=str(OUT_DIR / "09_cases.png"), full_page=False)
        print("  ✓ 09_cases.png")

        browser.close()

    # Save manifest
    screenshots = sorted(OUT_DIR.glob("*.png"))
    manifest = [str(s) for s in screenshots]
    with open(OUT_DIR / "manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"\nCapture complete. {len(screenshots)} screenshots saved to:\n  {OUT_DIR}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Capture NeuroScan AI screenshots")
    parser.add_argument("--password", required=True, help="Login password for 'samarth' account")
    args = parser.parse_args()
    capture(args.password)

