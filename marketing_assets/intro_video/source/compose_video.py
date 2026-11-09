"""
NeuroScan AI — Cinematic Video Production Engine
Composes 20 seconds of 1080p 30fps video from real NeuroScan AI footage.
Features:
- Smooth Ken Burns camera zooms & pans into actual clinical UI components
- High-end dark tech color grade with subtle anamorphic vignette
- High-precision typography overlays aligned with verified features
- Cross-fade cinematic transitions
- Custom synthesized ambient cinematic score with synchronized bass pulses
- FFmpeg H.264 / AAC render
"""

import os
import sys
import math
import wave
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np

# ---------------------------------------------------------------------------
# Directories & Constants
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(r"c:\Visual Studio\Brain Tumor Advanced")
INTRO_DIR = PROJECT_ROOT / "marketing_assets" / "intro_video"
SCREENSHOTS_DIR = INTRO_DIR / "assets" / "screenshots"
FRAMES_DIR = INTRO_DIR / "assets" / "frames"
AUDIO_DIR = INTRO_DIR / "audio"
SOURCE_DIR = INTRO_DIR / "source"
OUTPUT_MP4 = INTRO_DIR / "NeuroScan_AI_Intro_20s.mp4"

FRAMES_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

WIDTH, HEIGHT = 1920, 1080
FPS = 30
TOTAL_SECONDS = 20.0
TOTAL_FRAMES = int(FPS * TOTAL_SECONDS)  # 600 frames

# ---------------------------------------------------------------------------
# Styling & Theme
# ---------------------------------------------------------------------------
COLOR_CYAN = (6, 182, 212)       # #06b6d4 - NeuroScan brand cyan
COLOR_TEAL = (20, 184, 166)      # #14b8a6 - Medical teal
COLOR_WHITE = (255, 255, 255)
COLOR_MUTED = (148, 163, 184)    # Slate 400
COLOR_DARK_CARD = (10, 15, 26)

def get_font(size, bold=False):
    font_paths = [
        "C:/Windows/Fonts/seguibl.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            try:
                return ImageFont.truetype(fp, size)
            except Exception:
                pass
    return ImageFont.load_default()

FONT_TITLE = get_font(72, bold=True)
FONT_HEADLINE = get_font(46, bold=True)
FONT_SUB = get_font(22, bold=False)
FONT_TAG = get_font(16, bold=True)
FONT_BRAND = get_font(28, bold=True)

# ---------------------------------------------------------------------------
# Scene Definitions (Total: 20 seconds = 600 frames)
# ---------------------------------------------------------------------------
SCENES = [
    {
        "file": "01_dashboard.png",
        "duration": 3.2,
        "tag": "CLINICAL INTELLIGENCE PLATFORM",
        "headline": "NEUROSCAN AI",
        "sub": "NEXT-GENERATION NEURO-ONCOLOGY DECISION SUPPORT",
        "zoom_start": 1.00,
        "zoom_end": 1.08,
        "pan_x": 0.0,
        "pan_y": -0.02,
    },
    {
        "file": "02_upload.png",
        "duration": 2.3,
        "tag": "IMAGE ACQUISITION & PREPROCESSING",
        "headline": "AUTOMATED MRI INGESTION",
        "sub": "DICOM & AXIAL TENSOR VALIDATION · INSTANT PREPROCESSING",
        "zoom_start": 1.04,
        "zoom_end": 1.12,
        "pan_x": 0.02,
        "pan_y": 0.02,
    },
    {
        "file": "03_classification_overview.png",
        "duration": 3.5,
        "tag": "MULTI-CLASS TUMOR INFERENCE",
        "headline": "HYBRID DEEP LEARNING",
        "sub": "GLIOMA DETECTION · 99.9% AUC · BAYESIAN UNCERTAINTY QUANTIFICATION",
        "zoom_start": 1.06,
        "zoom_end": 1.15,
        "pan_x": -0.04,
        "pan_y": -0.03,
    },
    {
        "file": "04_segmentation.png",
        "duration": 3.0,
        "tag": "SUB-MILLIMETER LESION LOCALIZATION",
        "headline": "ATTENTION U-NET SEGMENTATION",
        "sub": "PIXEL-LEVEL MASK OVERLAYS · ACCURATE LESION AREA VOLUMETRICS",
        "zoom_start": 1.08,
        "zoom_end": 1.16,
        "pan_x": 0.03,
        "pan_y": -0.02,
    },
    {
        "file": "05_gradcam_xai.png",
        "duration": 3.2,
        "tag": "TRANSPARENT CLINICAL REASONING",
        "headline": "EXPLAINABLE AI SUITE",
        "sub": "GRAD-CAM · GRAD-CAM++ · INTEGRATED GRADIENTS ATTRIBUTION",
        "zoom_start": 1.05,
        "zoom_end": 1.14,
        "pan_x": -0.02,
        "pan_y": 0.03,
    },
    {
        "file": "06_radiomics.png",
        "duration": 2.5,
        "tag": "QUANTITATIVE IMAGING BIOMARKERS",
        "headline": "RADIOMICS & SHAP PROFILING",
        "sub": "10 HIGH-ORDER TEXTURE FEATURES · EXPLAINABLE FEATURE IMPORTANCE",
        "zoom_start": 1.02,
        "zoom_end": 1.10,
        "pan_x": 0.01,
        "pan_y": -0.02,
    },
    {
        "file": "07_statistics.png",
        "duration": 2.3,
        "tag": "VALIDATED BENCHMARKS & RESILIENT FAILOVER",
        "headline": "NEUROSCAN AI",
        "sub": "CLINICAL-GRADE ACCURACY · RESILIENT ARCHITECTURAL DESIGN",
        "zoom_start": 1.08,
        "zoom_end": 1.02,
        "pan_x": 0.0,
        "pan_y": 0.0,
    },
]

# ---------------------------------------------------------------------------
# Audio Generator (Pure Python NumPy / Wave)
# ---------------------------------------------------------------------------
def synthesize_soundtrack(output_wav: Path, duration: float = 20.0, sr: int = 44100):
    print(f"Generating cinematic audio track ({duration}s at {sr}Hz)...")
    n = int(sr * duration)
    t = np.linspace(0, duration, n, endpoint=False)

    # 1. Warm Analog Synth Drone (Root: D2 = 73.42 Hz, Fifth: A2 = 110 Hz, Octave: D3 = 146.83 Hz)
    f0 = 73.42
    synth = (
        0.32 * np.sin(2 * np.pi * f0 * t) +
        0.22 * np.sin(2 * np.pi * (f0 * 1.5) * t) +
        0.16 * np.sin(2 * np.pi * (f0 * 2.0) * t) +
        0.08 * np.sin(2 * np.pi * (f0 * 3.0) * t) +
        0.04 * np.sin(2 * np.pi * (f0 * 4.0) * t)
    )

    # Subtle slow chorus / beating
    chorus = 1.0 + 0.07 * np.sin(2 * np.pi * 0.25 * t)
    synth *= chorus

    # 2. Master Amplitude Envelope: 1.5s exponential fade in, 1.8s fade out
    env = np.ones(n)
    fade_in = int(1.5 * sr)
    fade_out = int(1.8 * sr)
    env[:fade_in] = np.sin(np.linspace(0, np.pi / 2, fade_in)) ** 2
    env[-fade_out:] = np.sin(np.linspace(np.pi / 2, 0, fade_out)) ** 2
    synth *= env

    # 3. Synchronized Sub-bass cinematic pulse impacts at scene cuts
    impact_times = [0.05, 3.2, 5.5, 9.0, 12.0, 15.2, 17.7]
    impact_track = np.zeros(n)
    for it in impact_times:
        idx = int(it * sr)
        pulse_len = int(0.75 * sr)
        if idx + pulse_len < n:
            pt = np.linspace(0, 0.75, pulse_len)
            # Pitch drop from 90Hz to 40Hz
            pitch_drop = 90.0 - 50.0 * (pt / 0.75)
            phase = 2 * np.pi * np.cumsum(pitch_drop) / sr
            pulse = 0.35 * np.sin(phase) * np.exp(-4.5 * pt)
            impact_track[idx:idx + pulse_len] += pulse

    # 4. Subtle High-frequency cyber shimmer (filtered white noise + sine harmonics)
    shimmer_env = np.exp(-0.15 * t) * (0.8 + 0.2 * np.sin(2 * np.pi * 1.2 * t))
    shimmer = 0.012 * np.sin(2 * np.pi * 2200.0 * t) * shimmer_env

    # Mix together and normalize
    audio = synth + impact_track + shimmer
    max_val = np.max(np.abs(audio))
    if max_val > 0:
        audio = audio / max_val * 0.88  # Headroom for mastering

    # 16-bit stereo PCM
    audio_int16 = (audio * 32767).astype(np.int16)
    stereo = np.column_stack([audio_int16, audio_int16])

    with wave.open(str(output_wav), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(stereo.tobytes())

    print(f"  ✓ Audio track rendered to {output_wav}")

# ---------------------------------------------------------------------------
# Ken Burns Zoom & Pan Engine
# ---------------------------------------------------------------------------
def apply_ken_burns(img: Image.Image, t: float, z_start: float, z_end: float, pan_x: float, pan_y: float) -> Image.Image:
    # Smooth cubic ease in/out
    t_eased = t * t * (3.0 - 2.0 * t)
    zoom = z_start + (z_end - z_start) * t_eased

    nw = int(WIDTH * zoom)
    nh = int(HEIGHT * zoom)
    resized = img.resize((nw, nh), Image.LANCZOS)

    # Calculate pan offset
    max_ox = nw - WIDTH
    max_oy = nh - HEIGHT
    center_ox = max_ox / 2.0
    center_oy = max_oy / 2.0

    ox = int(center_ox + pan_x * t_eased * max_ox)
    oy = int(center_oy + pan_y * t_eased * max_oy)

    ox = max(0, min(ox, max_ox))
    oy = max(0, min(oy, max_oy))

    return resized.crop((ox, oy, ox + WIDTH, oy + HEIGHT))

# ---------------------------------------------------------------------------
# Cinematic Grading & HUD Overlay
# ---------------------------------------------------------------------------
def apply_cinematic_grade(img: Image.Image) -> Image.Image:
    """Subtle cyan/teal tone lift and edge vignette for high-end tech aesthetic."""
    # Slight contrast and tone curve via PIL
    r, g, b = img.split()
    r = r.point(lambda i: max(0, int(i * 0.94)))
    g = g.point(lambda i: min(255, int(i * 1.01)))
    b = b.point(lambda i: min(255, int(i * 1.05 + 4)))
    graded = Image.merge("RGB", (r, g, b))

    # Anamorphic letterbox vignette overlay
    vig = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(vig)

    # Subtle top & bottom letterbox gradient
    top_h = 100
    for y in range(top_h):
        alpha = int(140 * (1.0 - y / top_h) ** 1.5)
        draw.line([(0, y), (WIDTH, y)], fill=(5, 10, 20, alpha))

    bot_h = 240
    for y in range(HEIGHT - bot_h, HEIGHT):
        prog = (y - (HEIGHT - bot_h)) / bot_h
        alpha = int(220 * prog ** 1.2)
        draw.line([(0, y), (WIDTH, y)], fill=(5, 10, 20, alpha))

    # Left & right edge darkening
    edge_w = 120
    for x in range(edge_w):
        alpha = int(90 * (1.0 - x / edge_w))
        draw.line([(x, 0), (x, HEIGHT)], fill=(0, 0, 0, alpha))
        draw.line([(WIDTH - 1 - x, 0), (WIDTH - 1 - x, HEIGHT)], fill=(0, 0, 0, alpha))

    return Image.alpha_composite(graded.convert("RGBA"), vig).convert("RGB")

def render_hud_overlay(img: Image.Image, tag: str, headline: str, sub: str, alpha: float, is_last: bool = False) -> Image.Image:
    if alpha <= 0.01:
        return img

    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Brand badge at top left
    badge_bg_alpha = int(180 * alpha)
    draw.rounded_rectangle([70, 45, 340, 85], radius=8, fill=(10, 20, 35, badge_bg_alpha), outline=(COLOR_CYAN[0], COLOR_CYAN[1], COLOR_CYAN[2], int(160 * alpha)), width=1)
    
    # Pulse cyan dot
    dot_alpha = int(255 * alpha)
    draw.ellipse([88, 60, 100, 72], fill=(COLOR_CYAN[0], COLOR_CYAN[1], COLOR_CYAN[2], dot_alpha))
    draw.text((112, 53), "NEUROSCAN AI", font=FONT_BRAND, fill=(COLOR_WHITE[0], COLOR_WHITE[1], COLOR_WHITE[2], dot_alpha))

    # Top right live status badge
    draw.rounded_rectangle([WIDTH - 300, 45, WIDTH - 70, 85], radius=8, fill=(10, 20, 35, badge_bg_alpha), outline=(COLOR_TEAL[0], COLOR_TEAL[1], COLOR_TEAL[2], int(140 * alpha)), width=1)
    draw.text((WIDTH - 280, 56), "VERIFIED CLINICAL ENGINE", font=FONT_TAG, fill=(COLOR_TEAL[0], COLOR_TEAL[1], COLOR_TEAL[2], dot_alpha))

    if is_last:
        # Grand closing card
        center_y = HEIGHT // 2 - 30
        box_alpha = int(210 * alpha)
        draw.rounded_rectangle([WIDTH // 2 - 480, center_y - 120, WIDTH // 2 + 480, center_y + 160], radius=16, fill=(8, 14, 25, box_alpha), outline=(COLOR_CYAN[0], COLOR_CYAN[1], COLOR_CYAN[2], int(200 * alpha)), width=2)

        # Tag
        tb = draw.textbbox((0, 0), tag, font=FONT_TAG)
        tw = tb[2] - tb[0]
        draw.text(((WIDTH - tw) // 2, center_y - 85), tag, font=FONT_TAG, fill=(COLOR_CYAN[0], COLOR_CYAN[1], COLOR_CYAN[2], int(240 * alpha)))

        # Big Title
        tb = draw.textbbox((0, 0), headline, font=FONT_TITLE)
        tw = tb[2] - tb[0]
        draw.text(((WIDTH - tw) // 2, center_y - 45), headline, font=FONT_TITLE, fill=(COLOR_WHITE[0], COLOR_WHITE[1], COLOR_WHITE[2], int(255 * alpha)))

        # Cyan divider bar
        bar_w = 400
        draw.line([(WIDTH // 2 - bar_w // 2, center_y + 55), (WIDTH // 2 + bar_w // 2, center_y + 55)], fill=(COLOR_CYAN[0], COLOR_CYAN[1], COLOR_CYAN[2], int(220 * alpha)), width=2)

        # Subtitle
        tb = draw.textbbox((0, 0), sub, font=FONT_SUB)
        tw = tb[2] - tb[0]
        draw.text(((WIDTH - tw) // 2, center_y + 80), sub, font=FONT_SUB, fill=(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2], int(230 * alpha)))

    else:
        # Lower-third information panel
        panel_y = HEIGHT - 180
        panel_h = 130
        panel_w = 1200
        panel_x = 70

        # Card container with glass blur effect
        card_fill = (10, 18, 30, int(215 * alpha))
        card_outline = (COLOR_CYAN[0], COLOR_CYAN[1], COLOR_CYAN[2], int(150 * alpha))
        draw.rounded_rectangle([panel_x, panel_y, panel_x + panel_w, panel_y + panel_h], radius=14, fill=card_fill, outline=card_outline, width=1)

        # Left cyan accent strip
        draw.rounded_rectangle([panel_x, panel_y, panel_x + 6, panel_y + panel_h], radius=3, fill=(COLOR_CYAN[0], COLOR_CYAN[1], COLOR_CYAN[2], int(255 * alpha)))

        # Category tag
        draw.text((panel_x + 30, panel_y + 18), tag, font=FONT_TAG, fill=(COLOR_CYAN[0], COLOR_CYAN[1], COLOR_CYAN[2], int(240 * alpha)))

        # Headline
        draw.text((panel_x + 30, panel_y + 42), headline, font=FONT_HEADLINE, fill=(COLOR_WHITE[0], COLOR_WHITE[1], COLOR_WHITE[2], int(255 * alpha)))

        # Subtitle
        draw.text((panel_x + 30, panel_y + 94), sub, font=FONT_SUB, fill=(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2], int(230 * alpha)))

    return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")

# ---------------------------------------------------------------------------
# Frame Composition Pipeline
# ---------------------------------------------------------------------------
def compose_frames():
    print("Loading screenshots into memory...")
    loaded_images = {}
    for sc in SCENES:
        fname = sc["file"]
        p = SCREENSHOTS_DIR / fname
        if not p.exists():
            print(f"ERROR: Missing screenshot {p}")
            sys.exit(1)
        loaded_images[fname] = Image.open(p).convert("RGB")

    # Calculate frame ranges
    total_scene_dur = sum(s["duration"] for s in SCENES)
    scale = TOTAL_SECONDS / total_scene_dur
    for sc in SCENES:
        sc["frames"] = int(round(sc["duration"] * scale * FPS))

    # Adjust rounding discrepancy to exact 600 frames
    diff = TOTAL_FRAMES - sum(s["frames"] for s in SCENES)
    SCENES[-1]["frames"] += diff

    print(f"Total frame allocation: {[s['frames'] for s in SCENES]} (Sum: {sum(s['frames'] for s in SCENES)})")

    frame_idx = 0
    num_scenes = len(SCENES)

    for s_idx, sc in enumerate(SCENES):
        n_frames = sc["frames"]
        img = loaded_images[sc["file"]]
        is_last = (s_idx == num_scenes - 1)

        print(f"Rendering Scene {s_idx + 1}/{num_scenes}: {sc['headline']} ({n_frames} frames)...")

        for f_in_scene in range(n_frames):
            t = f_in_scene / max(1, n_frames - 1)

            # 1. Ken Burns Pan & Zoom
            frame = apply_ken_burns(img, t, sc["zoom_start"], sc["zoom_end"], sc["pan_x"], sc["pan_y"])

            # 2. Cinematic Color Grade
            frame = apply_cinematic_grade(frame)

            # 3. Typography Animation (fade in quickly, stay, fade out at end)
            fade_in_len = 8
            fade_out_len = 8
            if f_in_scene < fade_in_len:
                txt_alpha = f_in_scene / fade_in_len
            elif f_in_scene > n_frames - fade_out_len and not is_last:
                txt_alpha = (n_frames - f_in_scene) / fade_out_len
            else:
                txt_alpha = 1.0

            frame = render_hud_overlay(frame, sc["tag"], sc["headline"], sc["sub"], txt_alpha, is_last=is_last)

            # 4. Cross-fade between scenes (last 6 frames of each scene blend with next scene first frame)
            if s_idx > 0 and f_in_scene < 6:
                # Scene start fade-in from previous
                blend_factor = f_in_scene / 6.0
                prev_fname = SCENES[s_idx - 1]["file"]
                prev_img = loaded_images[prev_fname]
                prev_frame = apply_ken_burns(prev_img, 1.0, SCENES[s_idx - 1]["zoom_start"], SCENES[s_idx - 1]["zoom_end"], SCENES[s_idx - 1]["pan_x"], SCENES[s_idx - 1]["pan_y"])
                prev_frame = apply_cinematic_grade(prev_frame)
                frame = Image.blend(prev_frame, frame, blend_factor)

            # Save frame
            out_path = FRAMES_DIR / f"frame_{frame_idx:05d}.png"
            frame.save(str(out_path), format="PNG", compress_level=1)
            frame_idx += 1

            if frame_idx % 60 == 0:
                print(f"  Frame {frame_idx}/{TOTAL_FRAMES} ({(frame_idx / TOTAL_FRAMES * 100):.1f}%)")

    print(f"All {frame_idx} frames rendered successfully to {FRAMES_DIR}")
    return frame_idx

# ---------------------------------------------------------------------------
# FFmpeg Encoding
# ---------------------------------------------------------------------------
def render_video(audio_path: Path):
    ffmpeg_bin = r"C:\Users\samar\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"
    if not os.path.exists(ffmpeg_bin):
        # Fallback to PATH
        ffmpeg_bin = "ffmpeg"

    print(f"\nEncoding final master video using FFmpeg ({ffmpeg_bin})...")
    input_frames = str(FRAMES_DIR / "frame_%05d.png")

    cmd = [
        ffmpeg_bin,
        "-y",
        "-framerate", str(FPS),
        "-i", input_frames,
        "-i", str(audio_path),
        "-c:v", "libx264",
        "-preset", "slow",
        "-crf", "17",               # Pristine broadcast quality
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-ar", "44100",
        "-shortest",
        "-movflags", "+faststart",
        str(OUTPUT_MP4),
    ]

    print("Command:", " ".join(cmd))
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print("FFmpeg error:\n", res.stderr)
        sys.exit(1)

    print(f"\n=======================================================")
    print(f"SUCCESS: Video rendered cleanly to:")
    print(f"  {OUTPUT_MP4}")
    print(f"File size: {OUTPUT_MP4.stat().st_size / (1024 * 1024):.2f} MB")
    print(f"=======================================================")

if __name__ == "__main__":
    audio_file = AUDIO_DIR / "neuroscan_cinematic.wav"
    synthesize_soundtrack(audio_file, duration=TOTAL_SECONDS)
    compose_frames()
    render_video(audio_file)
