"""
Speech-to-text via OpenAI Whisper.

Model download note: whisper.load_model("base") downloads ~140MB of model
weights from OpenAI's servers the FIRST time it runs, and caches them
locally after that (~/.cache/whisper by default). That download needs
internet access on whatever machine actually runs this service.
"""

import whisper

_model = None


def load_model():
    global _model
    if _model is None:
        # "base" is a reasonable balance of speed vs accuracy for short
        # emergency phrases. "tiny" is faster/smaller if you need lower
        # latency; "small"/"medium" are more accurate but slower.
        _model = whisper.load_model("base")
    return _model


def transcribe_audio(file_path: str) -> str:
    """Transcribes an audio file (wav/mp3/m4a/etc, anything ffmpeg can read)
    and returns the recognized text, or an empty string if nothing was
    understood."""
    model = load_model()
    result = model.transcribe(file_path)
    return (result.get("text") or "").strip()
