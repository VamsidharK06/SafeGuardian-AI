# SafeGuardian AI Service (FastAPI)

A separate Python service implementing the five planned AI tools from the
project's tech stack:

| Tool      | Used for                                   | Where              |
|-----------|---------------------------------------------|--------------------|
| Whisper   | Speech-to-text for a spoken emergency phrase | `app/services/whisper_service.py` |
| YOLOv11   | Person/object detection in a photo frame     | `app/services/yolo_service.py` |
| OpenCV    | Image loading + color-space conversion       | used inside `yolo_service.py` and `pose_service.py` |
| MediaPipe | Pose analysis (crude fall heuristic)         | `app/services/pose_service.py` |
| PyTorch   | Weighted fusion of the three signals above   | `app/services/fusion_service.py` |

This has now been confirmed running end-to-end (`pip install` succeeded,
`uvicorn` starts cleanly, `/analyze/fused-text` returns real results) — see
the "Fixes applied after real-world testing" section below for the two
genuine bugs that surfaced once it actually ran on a real machine, and how
they were fixed.

## Architecture

```
Browser (camera + microphone capture)
   │
   ├──────────────────────────────────────┐
   ↓                                       ↓
Spring Boot (text only, via                FastAPI AI Service (this folder,
AIServiceClient → /analyze/fused-text)     port 8001) — called directly for
   │                                       photo/voice, since it holds no
   ↓                                       secrets (all WhatsApp/Twilio
/api/ai/analyze-advanced                   credentials stay in Spring Boot)
                                            │
                                            ↓
                              Whisper / YOLOv11 / OpenCV / MediaPipe / PyTorch
                                            │
                                            ↓
                              ThreatAssessment JSON (same shape either way)
```

**Why the frontend calls this service directly for photo/voice, instead of
routing everything through Spring Boot:** proxying binary file uploads
(multipart audio/image) through Java would need a hand-built multipart
relay in `AIServiceClient` — meaningfully more code, on a part of the
project I can't compile-test in this sandbox. Since this service carries
no credentials of any kind (WhatsApp/Twilio secrets live only in Spring
Boot's environment variables, never here), calling it directly from the
browser doesn't create a security gap — CORS is enabled specifically so
this works. Routing photo/voice through Spring Boot too is a reasonable
next step if you want every request to technically pass through the
"official" architecture diagram, just not implemented yet.

The Spring Boot backend's **existing** `/api/ai/analyze` endpoint (what the
original AI Assistant text box always called) is untouched. This service
powers two **additive** things instead:
- `/api/ai/analyze-advanced` on the Spring Boot backend (text only, optional, off by default)
- The new "Advanced Analysis (camera + voice)" section on the AI Assistant
  page, which calls this service directly

## Setup

```bash
cd ai-service
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

This will take a while and needs internet access — `ultralytics`, `torch`,
`torchvision`, `opencv-python`, and `mediapipe` are all sizeable packages.

### ffmpeg — required for voice, install separately (NOT a pip package)

Whisper needs the **ffmpeg** command-line tool to decode audio — this is a
real external program, not something `pip install` provides, and without
it every voice/audio request will fail with a clear error rather than a
mysterious one (see the resilience fix below). Browsers record voice as
`audio/webm` (Opus codec) via `MediaRecorder`, which absolutely needs
ffmpeg to decode.

- **Windows**: download from https://www.gyan.dev/ffmpeg/builds/ (the
  "essentials" build is enough), unzip it, and add its `bin` folder to
  your PATH environment variable. Confirm with `ffmpeg -version` in a new
  terminal.
- **Mac**: `brew install ffmpeg`
- **Linux**: `sudo apt install ffmpeg` (or your distro's equivalent)

Text-only and photo-only requests do **not** need ffmpeg — only voice
recording does.

### Model downloads (first run only, needs internet)

- **Whisper**: `whisper.load_model("base")` downloads ~140MB of weights
  from OpenAI on first use, cached afterward under `~/.cache/whisper`.
- **YOLOv11**: `YOLO("yolo11n.pt")` downloads the ~5-6MB "nano" checkpoint
  from Ultralytics on first use, cached in the working directory.
- **MediaPipe**: `pose_landmarker_lite.task` (~5-9MB) downloads automatically
  into `ai-service/models/` on first use. (MediaPipe 1.0 removed the older
  "Solutions" API that used to ship its model bundled in the pip package —
  this uses the current Tasks API instead, which needs this separate
  model file.)

## Running it

```bash
cd ai-service
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

Check `http://localhost:8001/health` once it's up.

## Using it from the app's UI

Open the **AI Assistant** page in the frontend — below the original text
box is a new **"Advanced Analysis (camera + voice)"** card:
- **Start Camera** → live preview → **Capture Photo** (snapshots one frame;
  the camera stream stops right after capture, it's not continuously
  streamed anywhere)
- **Record Voice** → records from your microphone → **Stop Recording**
  when done, with playback to review before analyzing
- Fill in any combination of the text box above, a photo, and/or a voice
  recording, then click **Run Advanced Analysis**

If this service isn't running, that card shows a clear "not reachable"
notice instead of failing silently.

## Endpoints

| Method | Path                  | Body                                   | Uses |
|--------|------------------------|------------------------------------------|------|
| GET    | `/health`              | —                                          | — |
| POST   | `/analyze/voice`       | multipart file: `file` (audio)             | Whisper |
| POST   | `/analyze/image`       | multipart file: `file` (image)             | YOLOv11, OpenCV, MediaPipe |
| POST   | `/analyze/fused`       | multipart, all optional: `text`, `audio`, `image` | all five, combined — this is what the browser UI calls |
| POST   | `/analyze/fused-text`  | JSON `{"text": "..."}`                     | text-only fused path (what Spring Boot calls) |

Example (text only):
```bash
curl -X POST http://localhost:8001/analyze/fused-text \
  -H "Content-Type: application/json" \
  -d '{"text":"Someone is following me and I am alone"}'
```

Example (image, to test YOLOv11 + MediaPipe directly):
```bash
curl -X POST http://localhost:8001/analyze/image \
  -F "file=@/path/to/a/photo.jpg"
```

## Fixes applied after real-world testing

Two real bugs surfaced once this actually ran (not typos — genuine
version-drift/logic issues), fixed as follows:

1. **MediaPipe 1.0 removed the old `mp.solutions.pose` API entirely.**
   `pose_service.py` now uses the current Tasks API (`PoseLandmarker`),
   which needs the separate `.task` model file mentioned above.
2. **The original fusion formula under-reported risk for text-only
   requests.** A fixed weighted average (`text×0.45 + vision×0.30 +
   pose×0.25`) meant a text-only call could never score above 0.45,
   capping it at MEDIUM even for an unambiguous HIGH-risk message.
   `fusion_service.fuse_signals()` now renormalizes weights across only
   the signals actually supplied for a given call, so a strong text-only
   signal can correctly reach HIGH on its own.

Additionally, each modality in `/analyze/fused` and `/analyze/image` is now
wrapped in its own try/except: if Whisper fails (e.g. missing ffmpeg) or
YOLO/MediaPipe fail on a given image, that specific signal is dropped and
reported in a `warnings` field rather than failing the entire request.

## Known limitations — read before demoing this

1. **No weapon detection.** Stock YOLOv11 is trained on COCO, which has a
   `person` class but no weapon classes. It contributes a "how many people
   are in frame" signal only.
2. **Pose analysis is single-frame, not real-time.** One photo, one
   heuristic guess at "possible fall" — not tracking movement over time.
3. **The fusion "model" is a hand-set weighted average, not a trained
   model.** There's no labeled incident dataset to train a real PyTorch
   classifier on yet — the code says so in its own comments.
4. **Camera/voice capture is single-shot, not continuous streaming.** One
   photo per capture, one recording per take — not a live monitoring feed.
5. **This service is unauthenticated and CORS is wide open (`*`).** Fine
   for local development; if you ever deploy this beyond localhost,
   restrict `allow_origins` in `main.py` to your actual frontend's origin.
