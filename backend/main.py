"""
NEUROSCAN AI — FastAPI Application Entry Point
==============================================
AI-Assisted Brain MRI Analysis & Explainable Brain Tumor Detection Platform
- All API endpoints served under /api/*
- Static uploads served at /uploads/*
- React single page application served at /* (with strict API protection)
"""
import sys
import mimetypes
from pathlib import Path
from contextlib import asynccontextmanager

# Bootstrap Python path so all imports work from backend root
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

# MIME types fix for Windows registry
mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("text/html", ".html")
mimetypes.add_type("application/json", ".json")

from sqlalchemy import text
from database import create_tables, SessionLocal
from config import CORS_ORIGINS, BASE_DIR, ENVIRONMENT, DATABASE_URL

# Routers
from api.routes_auth import router as auth_router
from api.routes_users import router as users_router
from api.routes_patients import router as patients_router
from api.routes_scans import router as scans_router
from api.routes_predict import router as predict_router
from api.routes_cases import router as cases_router
from api.routes_reports import router as reports_router
from api.routes_audit import router as audit_router
from api.routes_stats import router as stats_router
from api.routes_notifications import router as notifications_router


# ─── Lifespan (Startup / Shutdown) ───────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize SQLite database & seed default roles
    create_tables()
    print("[App] NEUROSCAN AI Database initialized & staff roles seeded.")

    # 2. Ensure uploads directory exists
    uploads_dir = BASE_DIR / "uploads"
    uploads_dir.mkdir(exist_ok=True)

    # 3. Load Trained Machine Learning Pipeline
    try:
        from inference.predictor import NeuroVisionPredictor
        app.state.predictor = NeuroVisionPredictor()
        print(f"[App] NeuroVision ML Predictor loaded successfully (Variant: {app.state.predictor.model_variant}).")
    except Exception as e:
        print(f"[App] WARNING: Could not initialize predictor: {e}")
        app.state.predictor = None

    yield

    print("[App] NEUROSCAN AI Server shutting down.")


# ─── FastAPI Application ──────────────────────────────────────────────────────

app = FastAPI(
    title="NEUROSCAN AI API",
    description="Explainable Brain MRI Tumor Detection, Segmentation, Radiomics & Clinical Decision Support",
    version="3.0.4",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Production HTTP Security Headers Middleware ──────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# ─── System Health Endpoints ──────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
async def health_check():
    """
    Comprehensive, unauthenticated health check endpoint for monitoring,
    load balancers, and container orchestration probes.
    """
    db_status = "connected"
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
    except Exception as e:
        db_status = f"unhealthy: {type(e).__name__}"

    ml_ready = bool(getattr(app.state, "predictor", None) is not None)
    ml_variant = getattr(app.state.predictor, "model_variant", "none") if ml_ready else "offline"

    overall_status = "healthy" if (db_status == "connected" and ml_ready) else "degraded"

    return {
        "status": overall_status,
        "application": "NEUROVISION AI",
        "version": "3.0.4",
        "environment": ENVIRONMENT,
        "database": {
            "status": db_status,
            "engine": "sqlite" if DATABASE_URL.startswith("sqlite") else "postgresql",
        },
        "ml_inference": {
            "status": "ready" if ml_ready else "not_loaded",
            "model_variant": ml_variant,
            "architecture": "CNN-ViT Hybrid + Attention U-Net",
            "explainability": "Grad-CAM, Grad-CAM++, Integrated Gradients",
        },
    }

# ─── Mount API Routers ─────────────────────────────────────────────────────────

app.include_router(auth_router,          prefix="/api/auth")
app.include_router(users_router,         prefix="/api")
app.include_router(patients_router,      prefix="/api")
app.include_router(scans_router,         prefix="/api")
app.include_router(predict_router,       prefix="/api")
app.include_router(cases_router,         prefix="/api")
app.include_router(reports_router,       prefix="/api")
app.include_router(audit_router,         prefix="/api")
app.include_router(stats_router,         prefix="/api")
app.include_router(notifications_router, prefix="/api")

# Mount Uploads directory
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


# ─── Static Frontend Serving & SPA Catch-All ─────────────────────────────────

FRONTEND_DIST = BASE_DIR / "frontend" / "dist"

if FRONTEND_DIST.exists() and (FRONTEND_DIST / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")


@app.get("/{full_path:path}")
async def serve_spa_or_api_guard(full_path: str):
    """
    Serves the React Single Page Application index.html while STRICTLY protecting
    API routes from ever returning HTML.
    """
    # Strict API Guard: /api/* routes must NEVER return HTML
    if full_path.startswith("api/") or full_path == "api":
        raise HTTPException(
            status_code=404,
            detail={"error": "API endpoint not found", "path": f"/{full_path}"}
        )

    # Check if a static file in dist was requested directly (e.g., favicon.ico, logo.png)
    if FRONTEND_DIST.exists():
        direct_file = FRONTEND_DIST / full_path
        if direct_file.is_file():
            return FileResponse(str(direct_file))

        index_file = FRONTEND_DIST / "index.html"
        if index_file.exists():
            return FileResponse(
                str(index_file),
                media_type="text/html",
                headers={
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0",
                }
            )

    return JSONResponse(
        content={
            "application": "NEUROSCAN AI",
            "status": "online",
            "message": "Frontend build in progress or not found. Access /docs for API documentation.",
            "docs": "/docs",
        }
    )
