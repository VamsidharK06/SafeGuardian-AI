"""
SafeGuardian AI Service - FastAPI service implementing the five planned AI
tools (YOLOv11, OpenCV, PyTorch, Whisper, MediaPipe).

Run (from this ai-service/ folder, after `pip install -r requirements.txt`):
    uvicorn main:app --host 0.0.0.0 --port 8001 --reload

This runs on port 8001, separate from the Spring Boot backend (8080), so
both can run at the same time. See README.md for setup, model download
notes, and current limitations.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import fused, health, vision, voice

app = FastAPI(
    title="SafeGuardian AI Service",
    description="YOLOv11 + OpenCV + PyTorch + Whisper + MediaPipe threat analysis service.",
    version="0.1.0",
)

# The frontend (served from a different origin/port, e.g. localhost:5500)
# calls this service directly from the browser for camera/voice capture, so
# it needs CORS enabled. Without this, the browser blocks the request
# before it even reaches this service - it's not a network or auth error,
# it just fails silently in the browser console. Wide open ("*") is fine
# here because this service holds no credentials/secrets of any kind
# (those all stay in the Spring Boot backend) - tighten this to your
# actual frontend origin before deploying anywhere beyond localhost.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(voice.router)
app.include_router(vision.router)
app.include_router(fused.router)
