"""
Fix capture: re-upload MRI and capture classification results using correct selectors.
The upload page uses a ref-based hidden input inside a dropzone div.
data-testid="dropzone-mri" on the input element itself.
"""

import sys
import time
import json
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
OUT_DIR = SCRIPT_DIR.parent / "assets" / "screenshots"
BASE_URL = "http://localhost:8000"
VIEWPORT = {"width": 1920, "height": 1080}
GLIOMA_IMG = Path(r"c:\Visual Studio\Brain Tumor Advanced\dataset\Testing\glioma\Te-gl_10.jpg")

def capture_upload(password: str):
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=200)
        context = browser.new_context(viewport=VIEWPORT)
        page = context.new_page()

        # Login
        print("[Login]")
        page.goto(f"{BASE_URL}/login", wait_until="networkidle")
        time.sleep(1)
        # Fill username - try multiple selectors
        for sel in ['input[name="username"]', 'input[type="text"]', 'input:first-of-type']:
            try:
                page.fill(sel, 'samarth', timeout=3000)
                break
            except:
                continue
        page.fill('input[type="password"]', password)
        page.click('button[type="submit"]')
        page.wait_for_timeout(3000)

        # Navigate to upload
        print("[Upload Page]")
        page.goto(f"{BASE_URL}/upload", wait_until="networkidle")
        time.sleep(2)

        # The input has data-testid="dropzone-mri" and ref
        # Try to set file on the ref input directly via JS injection
        print("[File Upload] Setting file via JS FileList injection...")

        # Read the image as base64 and inject it
        import base64
        with open(GLIOMA_IMG, "rb") as f:
            img_b64 = base64.b64encode(f.read()).decode()

        js_inject = f"""
        async () => {{
            const b64 = "{img_b64}";
            const byteChars = atob(b64);
            const byteNums = new Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) {{
                byteNums[i] = byteChars.charCodeAt(i);
            }}
            const byteArr = new Uint8Array(byteNums);
            const blob = new Blob([byteArr], {{ type: 'image/jpeg' }});
            const file = new File([blob], 'Te-gl_10.jpg', {{ type: 'image/jpeg' }});
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            
            // Find the input element
            const input = document.querySelector('[data-testid="dropzone-mri"]');
            if (input) {{
                Object.defineProperty(input, 'files', {{
                    value: dataTransfer.files,
                    configurable: true
                }});
                input.dispatchEvent(new Event('change', {{ bubbles: true }}));
                return 'input_found_and_set';
            }}
            
            // Try all file inputs
            const inputs = document.querySelectorAll('input[type="file"]');
            if (inputs.length > 0) {{
                Object.defineProperty(inputs[0], 'files', {{
                    value: dataTransfer.files,
                    configurable: true
                }});
                inputs[0].dispatchEvent(new Event('change', {{ bubbles: true }}));
                return 'fallback_input_set';
            }}
            return 'no_input_found';
        }}
        """

        result = page.evaluate(js_inject)
        print(f"  JS inject result: {result}")
        time.sleep(2)

        # Also try Playwright's native set_input_files on the ref input
        if result == 'no_input_found':
            print("  Trying Playwright native file input...")
            try:
                # Click the dropzone to trigger click -> fileInputRef.current.click()
                page.click('[data-testid="dropzone-mri"]', timeout=5000)
                time.sleep(0.5)
            except Exception as e:
                print(f"  dropzone click: {e}")
            
            try:
                page.set_input_files('input[type="file"]', str(GLIOMA_IMG), timeout=5000)
                time.sleep(1)
            except Exception as e:
                print(f"  set_input_files: {e}")

        # Screenshot with file selected / upload state
        page.screenshot(path=str(OUT_DIR / "02_upload_with_file.png"), full_page=False)
        print("  ✓ 02_upload_with_file.png")

        # Fill patient details if visible
        try:
            page.fill('input[placeholder*="patient" i], input[placeholder*="name" i], input[id*="patient"]', 'Test Patient', timeout=2000)
            page.fill('input[placeholder*="age" i], input[type="number"]', '45', timeout=2000)
        except:
            pass

        # Try submitting - look for the analyze button
        try:
            page.click('button:has-text("Analyze"), button:has-text("Submit"), button:has-text("Run Analysis"), button:has-text("Upload")', timeout=5000)
            print("  Clicked submit button")
        except Exception as e:
            print(f"  Could not find submit button: {e}")
            # Try any button that isn't cancel/back
            try:
                buttons = page.locator('button').all()
                for btn in buttons:
                    txt = btn.text_content() or ""
                    if any(w in txt.lower() for w in ['analyz', 'submit', 'run', 'upload', 'scan']):
                        btn.click()
                        print(f"  Clicked: {txt}")
                        break
            except Exception as e2:
                print(f"  Button search failed: {e2}")

        # Wait for ML inference (up to 60s)
        print("  Waiting for ML inference (up to 60s)...")
        for i in range(12):
            page.wait_for_timeout(5000)
            current_url = page.url
            content = page.content()
            if "scan-analysis" in current_url:
                print(f"  Results page reached after {(i+1)*5}s")
                break
            if "glioma" in content.lower() or "classification" in content.lower() or "prediction" in content.lower():
                print(f"  Results visible after {(i+1)*5}s")
                break
            print(f"  Still waiting... {(i+1)*5}s")

        time.sleep(2)

        # Capture classification results
        page.screenshot(path=str(OUT_DIR / "03_classification_real.png"), full_page=False)
        print("  ✓ 03_classification_real.png")

        # Try tabs
        for tab_name, file_name in [
            ("Segmentation", "04_segmentation_real"),
            ("XAI", "05_gradcam_real"),
            ("Radiomics", "06_radiomics_real"),
        ]:
            try:
                page.click(f'button:has-text("{tab_name}"), [role="tab"]:has-text("{tab_name}")', timeout=5000)
                page.wait_for_timeout(3000)
                page.screenshot(path=str(OUT_DIR / f"{file_name}.png"), full_page=False)
                print(f"  ✓ {file_name}.png")
            except Exception as e:
                print(f"  Could not click {tab_name}: {e}")

        browser.close()
    print("\nFix capture complete.")

if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--password", required=True)
    args = p.parse_args()
    capture_upload(args.password)

