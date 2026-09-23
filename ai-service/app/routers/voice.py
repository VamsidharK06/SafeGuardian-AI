"""Voice-input endpoint - Whisper only."""

import os
import tempfile

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services import whisper_service

router = APIRouter(prefix="/analyze", tags=["voice"])


@router.post("/voice")
async def analyze_voice(file: UploadFile = File(...)):
    suffix = os.path.splitext(file.filename or "")[1] or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        transcript = whisper_service.transcribe_audio(tmp_path)
    except Exception as e:
        # Most commonly: ffmpeg isn't installed/on PATH - Whisper needs it
        # to decode most browser-recorded audio formats (e.g. webm/Opus).
        # See ai-service/README.md.
        raise HTTPException(
            status_code=502,
            detail=f"Voice transcription failed: {e}. "
                   f"Is ffmpeg installed and on PATH? See ai-service/README.md.",
        )
    finally:
        os.remove(tmp_path)

    return {"transcript": transcript}
