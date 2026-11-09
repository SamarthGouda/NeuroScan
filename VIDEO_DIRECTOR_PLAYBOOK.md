# VIDEO DIRECTOR PLAYBOOK
### Professional Product Launch Video — Reusable Production Guide

> Created from the NeuroScan AI production. Reuse for any software product launch.

---

## 1. Pre-Production Checklist

Before writing a single line of code or capturing a frame:

```
[ ] Inspect the entire codebase — understand real vs. documented features
[ ] Run the application and verify every feature works
[ ] Identify the most visually impressive genuine workflows
[ ] Confirm which features NOT to claim (avoid overpromising)
[ ] Choose de-identified / synthetic test data for demos
[ ] Plan scenes: max 7 for a 20s video (avg 3s each)
[ ] Define color palette from the app's existing branding
[ ] Decide audio direction: cinematic pad / upbeat tech / minimal
```

---

## 2. Environment Setup

### Isolated Tool Installation (don't pollute the project venv)

```powershell
# Install Playwright to system Python (not project venv)
pip install playwright
python -m playwright install chromium

# Install FFmpeg via winget (Windows)
winget install Gyan.FFmpeg

# Verify
python -m playwright --version
ffmpeg -version
```

### Output Directory Structure

```
marketing_assets/intro_video/
├── NeuroScan_AI_Intro_20s.mp4    ← Final deliverable
├── storyboard.md
├── production_notes.md
├── captions.srt
├── assets/
│   ├── screenshots/              ← Raw captured PNGs
│   └── frames/                   ← Composited frames
├── audio/                        ← WAV audio track
└── source/                       ← Production scripts
    ├── capture_screenshots.py
    └── compose_video.py
```

> **IMPORTANT:** Never put video files inside the React app's `public/`, `src/`, or `dist/` folders. Never add a video player component to the app.

---

## 3. Screenshot Capture with Playwright

### Key Principles

- Always use `headless=False` for accurate rendering of CSS animations and WebGL
- Set viewport to `1920×1080` to match the target resolution
- Use `wait_until="networkidle"` for pages with async data fetching
- Always wait extra time after ML inference (can take 15-30s)
- Capture at the moment of maximum visual richness (results loaded, charts rendered)

### Template Script

```python
from playwright.sync_api import sync_playwright
import time

VIEWPORT = {"width": 1920, "height": 1080}
BASE_URL = "http://localhost:8000"

def capture(password: str):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=300)
        context = browser.new_context(viewport=VIEWPORT)
        page = context.new_page()

        # Login
        page.goto(f"{BASE_URL}/login", wait_until="networkidle")
        page.fill('input[name="username"]', 'your_user')
        page.fill('input[type="password"]', password)
        page.click('button[type="submit"]')
        page.wait_for_timeout(3000)

        # Capture
        page.goto(f"{BASE_URL}/dashboard", wait_until="networkidle")
        time.sleep(2)
        page.screenshot(path="assets/screenshots/01_dashboard.png")

        # Upload file + wait for async results
        file_input = page.locator('input[type="file"]').first
        file_input.set_input_files("path/to/test_file.jpg")
        page.click('button:has-text("Analyze")')
        page.wait_for_timeout(30000)  # wait for ML
        page.screenshot(path="assets/screenshots/02_results.png")

        browser.close()
```

### Common Selector Fallbacks

```python
# Try multiple selectors for resilience:
try:
    page.click('button:has-text("Analyze"), button[type="submit"]')
except:
    page.locator('button').last.click()
```

---

## 4. Frame Composition (Pillow)

### Ken Burns Effect

```python
from PIL import Image

def ken_burns(img, t, zoom_start=1.0, zoom_end=1.12, pan_x=0, pan_y=0):
    """t in [0,1]. Returns cropped 1920x1080 frame."""
    zoom = zoom_start + (zoom_end - zoom_start) * t
    new_w, new_h = int(1920 * zoom), int(1080 * zoom)
    resized = img.resize((new_w, new_h), Image.LANCZOS)
    off_x = (new_w - 1920) // 2 + int(pan_x * t * 1920 * 0.05)
    off_y = (new_h - 1080) // 2 + int(pan_y * t * 1080 * 0.05)
    return resized.crop((off_x, off_y, off_x + 1920, off_y + 1080))
```

### Vignette

```python
def vignette(img, strength=0.6):
    vig = Image.new("L", img.size, 0)
    draw = ImageDraw.Draw(vig)
    for i in range(min(1920, 1080) // 2, 0, -1):
        a = int(255 * strength * (1 - i / (540)) ** 2)
        draw.ellipse([960-i, 540-i, 960+i, 540+i], fill=255-a)
    dark = Image.new("RGB", img.size, (0, 0, 0))
    return Image.composite(dark, img, Image.eval(vig, lambda x: 255 - x))
```

### Cross-Fade Transition

```python
def cross_fade(img1, img2, t):
    return Image.blend(img1, img2, t)  # t=0→img1, t=1→img2

# Generate 8 transition frames:
for i in range(8):
    t = i / 7
    frame = cross_fade(scene1_last, scene2_first, ease_in_out(t))
```

---

## 5. Audio Generation (Pure Python)

No copyright issues, no external dependencies beyond numpy/scipy.

```python
import numpy as np
import wave

def generate_cinematic_pad(output_path, duration=20.0, sr=44100):
    n = int(sr * duration)
    t = np.linspace(0, duration, n)

    # Cinematic chord: C2 root + G2 fifth + octaves
    audio = (
        0.35 * np.sin(2*np.pi*65.4*t) +   # C2
        0.20 * np.sin(2*np.pi*98.0*t) +   # G2
        0.12 * np.sin(2*np.pi*130.8*t) +  # C3
        0.08 * np.sin(2*np.pi*196.0*t)    # G3
    )

    # Shimmer + fade envelope
    audio *= (1.0 + 0.08 * np.sin(2*np.pi*0.3*t))
    envelope = np.ones(n)
    envelope[:int(2*sr)] = np.linspace(0, 1, int(2*sr)) ** 2
    envelope[-int(1.5*sr):] = np.linspace(1, 0, int(1.5*sr)) ** 2
    audio *= envelope

    # Normalize + write stereo WAV
    audio = audio / np.max(np.abs(audio)) * 0.85
    s16 = (audio * 32767).astype(np.int16)
    stereo = np.column_stack([s16, s16])
    with wave.open(output_path, 'w') as wf:
        wf.setnchannels(2); wf.setsampwidth(2)
        wf.setframerate(sr); wf.writeframes(stereo.tobytes())
```

**Other free audio options:**
- [Pixabay](https://pixabay.com/music/) — free, no attribution required
- [ccMixter](http://ccmixter.org/) — CC licensed
- [Free Music Archive](https://freemusicarchive.org/) — verify license per track

---

## 6. FFmpeg Assembly

```bash
# Full pipeline: frames + audio → MP4
ffmpeg -y \
  -framerate 30 \
  -i frames/frame_%05d.png \
  -i audio/music.wav \
  -c:v libx264 \
  -preset slow \
  -crf 18 \
  -c:a aac \
  -b:a 192k \
  -pix_fmt yuv420p \
  -t 20 \
  -movflags +faststart \
  NeuroScan_AI_Intro_20s.mp4

# Verify output
ffprobe -v quiet -print_format json -show_streams output.mp4
```

**CRF Guide:** `18` = near-lossless. Range: 0 (lossless) → 51 (worst). Use `18-23` for product videos.

---

## 7. Scene Planning Template

For a **20-second** video, budget scenes as:

| Scene # | Duration | Type | Purpose |
|---------|----------|------|---------|
| 1 | 3-4s | Hero shot | Opening dashboard / home screen |
| 2 | 2-3s | Action | Input / upload flow |
| 3 | 3-4s | Results | Primary output / classification |
| 4 | 3s | Detail | Secondary feature |
| 5 | 3s | Detail | Tertiary feature (AI/ML highlight) |
| 6 | 2s | Data | Charts/stats |
| 7 | 2s | Outro | Logo + product name close |

**Rule of thumb:** Never plan more than `floor(duration / 2.5)` scenes.

---

## 8. Typography Guidelines

| Use | Don't Use |
|-----|-----------|
| ALL CAPS for headlines | Mixed case for headlines |
| `·` separator for sub-labels | Long sentences |
| 2-4 words per headline | Marketing buzzwords not shown in app |
| Metric with actual number ("99.9% AUC") | Fabricated numbers |
| Product name on first + last scene | Product name on every scene |

---

## 9. Quality Checklist (Before Delivery)

```
[ ] MP4 plays in VLC / Windows Media Player / browser
[ ] Duration: 15-20s (use ffprobe to verify)
[ ] Resolution: 1920×1080 (use ffprobe to verify)
[ ] Frame rate: 30fps (use ffprobe to verify)
[ ] Video codec: H.264 (not HEVC/H.265)
[ ] Audio present and audible
[ ] No fabricated UI visible
[ ] Only verified features claimed in text overlays
[ ] No credentials, PII, or patient data visible
[ ] No video component added to the application
[ ] All files in marketing_assets/ not in app directories
[ ] marketing_assets/ added to .gitignore (avoid committing large files)
```

---

## 10. What To Do When Automation Fails

| Failure | Action |
|---------|--------|
| Login page changed selectors | Inspect DOM in Playwright devtools (`page.pause()`) |
| ML inference times out | Increase wait to 90s; upload simpler image |
| Screenshot is blank | Use `headless=False`; add `time.sleep(3)` after navigation |
| Tab not clickable | Try `page.locator('[role="tab"]').filter(has_text="...")` |
| FFmpeg not found | Use OpenCV fallback, then merge audio separately |
| Font not found | Pillow default font works; download Segoe UI from MS |

---

## 11. Credits

**Produced for:** NeuroScan AI  
**Production Date:** November 2026  
**Toolchain:** Python 3.13, Playwright 1.64.1, Pillow, NumPy, FFmpeg  
**Audio:** Original synthesis — no copyright  
**Footage:** Real application screenshots — no fabricated UI  

