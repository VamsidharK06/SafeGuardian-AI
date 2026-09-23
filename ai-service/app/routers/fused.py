"""
Fused multi-signal assessment - combines whichever of text / audio / image
is provided into one ThreatAssessment, using all five tools together:

  text/audio -> Whisper (if audio)      -> text signal
  image      -> YOLOv11 + OpenCV        -> vision signal
  image      -> MediaPipe               -> pose signal
  all three  -> PyTorch weighted fusion -> final risk level + confidence

Two endpoints are exposed:
  POST /analyze/fused       multipart/form-data - accepts optional text,
                             audio file, and/or image file. Use this from
                             Postman/curl to test any combination directly.
  POST /analyze/fused-text  application/json {"text": "..."} - a
                             text-only convenience endpoint, used by the
                             Spring Boot backend's AIServiceClient so it
                             doesn't need to build multipart requests.
"""

import os
import tempfile
from typing import Optional

from fastapi import APIRouter, File, Form, UploadFile

from app.schemas import TextAnalysisRequest, ThreatAssessment
from app.services import fusion_service, pose_service, whisper_service, yolo_service

router = APIRouter(prefix="/analyze", tags=["fused"])

# Same keyword families as the Java backend's rule-based AIService, so a
# plain-text description gets a comparable signal whether it went through
# Spring Boot's simple classifier or this fused service.
_HIGH_KEYWORDS = [
    "fell", "cannot move", "can't move", "unconscious", "chest pain",
    "bleeding", "attack", "assault", "kidnap", "weapon", "gun", "knife",
    "following me", "stalking", "danger", "threatened", "help me",
    "emergency", "not safe",
]
_MEDIUM_KEYWORDS = [
    "uncomfortable", "suspicious", "scared", "afraid", "unsafe",
    "nervous", "worried", "watched", "walking behind", "behind me",
]


def _text_signal(text: str) -> float:
    if not text:
        return 0.0
    lowered = text.lower()
    if any(keyword in lowered for keyword in _HIGH_KEYWORDS):
        return 0.9
    if any(keyword in lowered for keyword in _MEDIUM_KEYWORDS):
        return 0.5
    return 0.1


def _build_assessment(transcript: str, vision_score: float, pose_flag: bool,
                       has_vision: bool = False, warnings: Optional[list] = None) -> ThreatAssessment:
    pose_score = 0.8 if pose_flag else 0.0
    text_score = _text_signal(transcript)

    # A channel only counts as "active" if it was actually supplied for
    # this call - see fusion_service.fuse_signals for why this matters.
    # Text is active whenever there's any transcript at all; vision and
    # pose are only active when an image was actually provided.
    active = (bool(transcript), has_vision, has_vision)

    risk_level, confidence = fusion_service.fuse_signals(
        text_score, vision_score, pose_score, active=active
    )

    reason_parts = []
    if transcript:
        snippet = transcript[:80]
        reason_parts.append(f"speech/text signal from: \"{snippet}\"")
    if vision_score:
        reason_parts.append("vision signal: multiple people detected in frame")
    if pose_flag:
        reason_parts.append("pose signal: posture suggests a possible fall")
    reason = "; ".join(reason_parts) or "No strong signals detected in the input provided."

    context_signals = []
    if transcript:
        context_signals.append("user_text")
    if has_vision:
        context_signals.append("camera")
        context_signals.append("pose")

    if risk_level == "HIGH":
        recommended_action = "Trigger SOS immediately."
        automated_response = [
            "Get live location", "Retrieve trusted contacts",
            "Send emergency alert", "Share location",
        ]
    elif risk_level == "MEDIUM":
        recommended_action = "Stay alert, move to a safe/public location, and monitor the situation."
        automated_response = ["Keep live location ready", "Be ready to trigger SOS if the situation escalates"]
    else:
        recommended_action = "Continue to stay aware of your surroundings."
        automated_response = []

    return ThreatAssessment(
        riskLevel=risk_level,
        threatType="Fused multi-signal assessment",
        confidence=confidence,
        recommendedAction=recommended_action,
        automatedResponse=automated_response,
        reason=reason,
        warnings=warnings or [],
        contextSignals=context_signals,
    )


@router.post("/fused", response_model=ThreatAssessment)
async def analyze_fused(
    text: Optional[str] = Form(None),
    audio: Optional[UploadFile] = File(None),
    image: Optional[UploadFile] = File(None),
):
    transcript = text or ""
    warnings: list = []

    if audio is not None:
        suffix = os.path.splitext(audio.filename or "")[1] or ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await audio.read())
            tmp_path = tmp.name
        try:
            # Whisper needs the ffmpeg binary on PATH to decode most
            # browser-recorded audio formats (e.g. webm/Opus) - if it's
            # missing, this raises rather than silently producing nothing.
            # Caught here so a missing ffmpeg degrades to "no voice signal"
            # instead of failing the whole request.
            transcribed = whisper_service.transcribe_audio(tmp_path)
            transcript = transcribed or transcript
        except Exception as e:
            warnings.append(f"Voice transcription failed, continuing without it: {e}")
        finally:
            os.remove(tmp_path)

    vision_score = 0.0
    pose_flag = False

    if image is not None:
        suffix = os.path.splitext(image.filename or "")[1] or ".jpg"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await image.read())
            tmp_path = tmp.name
        try:
            detections = yolo_service.detect_objects(tmp_path)
            summary = yolo_service.summarize_detections(detections)
            # crowding/closeness heuristic: more than one person in frame
            # raises the vision signal proportionally, capped at 1.0
            vision_score = min(1.0, max(0, summary["personCount"] - 1) * 0.4)
        except Exception as e:
            warnings.append(f"Vision (YOLOv11) analysis failed, continuing without it: {e}")

        try:
            pose_result = pose_service.analyze_pose(tmp_path)
            pose_flag = bool(pose_result.get("possibleFall", False))
        except Exception as e:
            warnings.append(f"Pose (MediaPipe) analysis failed, continuing without it: {e}")
        finally:
            os.remove(tmp_path)

    return _build_assessment(
        transcript, vision_score, pose_flag,
        has_vision=(image is not None), warnings=warnings,
    )


@router.post("/fused-text", response_model=ThreatAssessment)
async def analyze_fused_text(payload: TextAnalysisRequest):
    return _build_assessment(payload.text, vision_score=0.0, pose_flag=False, has_vision=False)
