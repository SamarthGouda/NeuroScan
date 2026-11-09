"""
Final capture: logs in, submits a real scan with all required fields,
captures all scan-analysis tabs using correct data-testid selectors.
"""

import sys
import time
import base64
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
OUT_DIR = SCRIPT_DIR.parent / "assets" / "screenshots"
BASE_URL = "http://localhost:8000"
VIEWPORT = {"width": 1920, "height": 1080}
GLIOMA_IMG = Path(r"c:\Visual Studio\Brain Tumor Advanced\dataset\Testing\glioma\Te-gl_10.jpg")

def run(password: str):
    from playwright.sync_api import sync_playwright

    with open(GLIOMA_IMG, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=150)
        context = browser.new_context(viewport=VIEWPORT)
        page = context.new_page()

        # --- LOGIN ---
        print("[1] Login...")
        page.goto(f"{BASE_URL}/login", wait_until="networkidle")
        time.sleep(1)
        for sel in ['input[name="username"]', 'input[type="text"]']:
            try:
                page.fill(sel, 'samarth', timeout=3000)
                break
            except: continue
        page.fill('input[type="password"]', password)
        page.click('button[type="submit"]')
        page.wait_for_timeout(3000)
        print(f"  Current URL: {page.url}")

        # --- DASHBOARD (re-capture with fresh session) ---
        print("[2] Dashboard...")
        page.goto(f"{BASE_URL}/doctor-dashboard", wait_until="networkidle")
        time.sleep(2)
        page.screenshot(path=str(OUT_DIR / "01_dashboard.png"), full_page=False)
        print("  ✓ 01_dashboard.png")

        # --- CASES: find existing scan or navigate to one ---
        print("[3] Looking for existing cases...")
        page.goto(f"{BASE_URL}/cases", wait_until="networkidle")
        time.sleep(2)
        page.screenshot(path=str(OUT_DIR / "09_cases.png"), full_page=False)
        print("  ✓ 09_cases.png")

        # Try to click first case to open scan analysis
        case_found = False
        try:
            # Look for any link/button that leads to scan-analysis
            page.click('a[href*="scan-analysis"], button:has-text("View"), a:has-text("View"), [data-testid*="case"]', timeout=5000)
            page.wait_for_timeout(3000)
            if "scan-analysis" in page.url:
                print(f"  Navigated to: {page.url}")
                case_found = True
        except Exception as e:
            print(f"  No clickable case found: {e}")

        # --- UPLOAD: submit a new scan with all fields ---
        if not case_found:
            print("[4] Submitting new scan with all required fields...")
            page.goto(f"{BASE_URL}/upload", wait_until="networkidle")
            time.sleep(2)

            # Screenshot empty upload
            page.screenshot(path=str(OUT_DIR / "02_upload_empty.png"), full_page=False)
            print("  ✓ 02_upload_empty.png")

            # Fill patient details first (button enables when file + required fields filled)
            try:
                # Patient ID
                for sel in ['input[placeholder*="ID" i]', 'input[name*="id" i]', 'input:nth-of-type(1)']:
                    try: page.fill(sel, 'PT-2024-001', timeout=2000); break
                    except: continue
                # Patient Name
                for sel in ['input[placeholder*="name" i]', 'input[name*="name" i]']:
                    try: page.fill(sel, 'John Smith', timeout=2000); break
                    except: continue
                # Age
                for sel in ['input[placeholder*="age" i]', 'input[type="number"]']:
                    try: page.fill(sel, '45', timeout=2000); break
                    except: continue
                print("  Filled patient details")
            except Exception as e:
                print(f"  Warning filling fields: {e}")

            # Inject file via JS DataTransfer
            js = f"""
            async () => {{
                const b64 = "{img_b64}";
                const byteChars = atob(b64);
                const byteArr = new Uint8Array(byteChars.length);
                for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
                const file = new File([byteArr], 'Te-gl_10.jpg', {{ type: 'image/jpeg' }});
                const dt = new DataTransfer();
                dt.items.add(file);
                
                // Try testid first
                let input = document.querySelector('[data-testid="dropzone-mri"]');
                if (!input) input = document.querySelector('input[type="file"]');
                if (!input) return 'no_input';
                
                Object.defineProperty(input, 'files', {{ value: dt.files, configurable: true }});
                
                // Fire both change and input events
                input.dispatchEvent(new Event('change', {{ bubbles: true }}));
                input.dispatchEvent(new Event('input', {{ bubbles: true }}));
                
                // Also trigger React's synthetic event
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'files');
                if (nativeInputValueSetter && nativeInputValueSetter.set) {{
                    nativeInputValueSetter.set.call(input, dt.files);
                    input.dispatchEvent(new Event('change', {{ bubbles: true }}));
                }}
                return 'done';
            }}
            """
            result = page.evaluate(js)
            print(f"  File inject: {result}")
            time.sleep(2)

            # Screenshot with file selected
            page.screenshot(path=str(OUT_DIR / "02_upload_with_file.png"), full_page=False)
            print("  ✓ 02_upload_with_file.png")

            # Click the start analysis button directly by testid
            print("  Clicking start analysis button...")
            try:
                # Remove disabled attribute via JS
                page.evaluate("""
                    () => {
                        const btn = document.querySelector('[data-testid="button-start-analysis"]');
                        if (btn) {
                            btn.removeAttribute('disabled');
                            btn.disabled = false;
                        }
                    }
                """)
                time.sleep(0.5)
                page.click('[data-testid="button-start-analysis"]', timeout=5000)
                print("  Clicked analysis button")
            except Exception as e:
                print(f"  Button click failed: {e}")
                # Try submitting via form
                try:
                    page.evaluate("document.querySelector('form')?.submit()")
                except: pass

            # Wait for results
            print("  Waiting for ML inference (up to 90s)...")
            for i in range(18):
                page.wait_for_timeout(5000)
                url = page.url
                content = page.content()
                print(f"  {(i+1)*5}s - URL: {url[:60]}")
                if "scan-analysis" in url:
                    print("  ✓ Reached scan-analysis page!")
                    case_found = True
                    break
                if any(w in content.lower() for w in ['glioma', 'meningioma', 'pituitary', 'tumor', 'classification']):
                    print("  Results content visible")
                    case_found = True
                    break

        # --- CAPTURE SCAN ANALYSIS PAGE ---
        time.sleep(3)
        current_url = page.url
        print(f"\n[5] Capturing scan analysis at: {current_url}")
        
        # Main classification results view
        page.screenshot(path=str(OUT_DIR / "04_classification.png"), full_page=False)
        print("  ✓ 04_classification.png")

        # XAI tab (default tab based on defaultValue="xai")
        print("  Clicking XAI tab...")
        try:
            page.click('[data-testid="tab-xai"]', timeout=5000)
            page.wait_for_timeout(4000)
        except Exception as e:
            print(f"  tab-xai: {e}")
            try: page.click('button:has-text("XAI"), button:has-text("Explainabl")', timeout=3000)
            except: pass
        page.screenshot(path=str(OUT_DIR / "06_gradcam.png"), full_page=False)
        print("  ✓ 06_gradcam.png")

        # Radiomics tab
        print("  Clicking Radiomics tab...")
        try:
            page.click('[data-testid="tab-radiomics"]', timeout=5000)
            page.wait_for_timeout(4000)
        except Exception as e:
            print(f"  tab-radiomics: {e}")
            try: page.click('button:has-text("Radiomics")', timeout=3000)
            except: pass
        page.screenshot(path=str(OUT_DIR / "07_radiomics.png"), full_page=False)
        print("  ✓ 07_radiomics.png")

        # Decision tab
        print("  Clicking Decision tab...")
        try:
            page.click('[data-testid="tab-decision"]', timeout=5000)
            page.wait_for_timeout(3000)
        except Exception as e:
            print(f"  tab-decision: {e}")
        page.screenshot(path=str(OUT_DIR / "10_decision.png"), full_page=False)
        print("  ✓ 10_decision.png")

        # Scroll up to capture segmentation section (above tabs)
        print("  Scrolling to segmentation section...")
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(1)
        page.screenshot(path=str(OUT_DIR / "05_segmentation.png"), full_page=False)
        print("  ✓ 05_segmentation.png (top of scan-analysis = seg + classification)")

        # Statistics
        print("[6] Statistics...")
        page.goto(f"{BASE_URL}/statistics", wait_until="networkidle")
        time.sleep(2)
        page.screenshot(path=str(OUT_DIR / "08_statistics.png"), full_page=False)
        print("  ✓ 08_statistics.png")

        browser.close()

    # List all screenshots
    shots = sorted(OUT_DIR.glob("*.png"))
    print(f"\n=== Capture done: {len(shots)} screenshots ===")
    for s in shots:
        print(f"  {s.name}  ({s.stat().st_size//1024}KB)")

if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--password", required=True)
    args = ap.parse_args()
    run(args.password)

