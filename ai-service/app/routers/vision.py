"""Image-input endpoint - YOLOv11 + OpenCV + MediaPipe."""

import os
import tempfile

from fastapi import APIRouter, File, UploadFile

from app.services import pose_service, yolo_service

router = APIRouter(prefix="/analyze", tags=["vision"])


@router.post("/image")
async def analyze_image(file: UploadFile = File(...)):
    suffix = os.path.splitext(file.filename or "")[1] or ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    detection_summary = {"personCount": 0, "detections": []}
    pose_result = {"poseDetected": False}
    warnings = []

    try:
        detections = yolo_service.detect_objects(tmp_path)
        detection_summary = yolo_service.summarize_detections(detections)
    except Exception as e:
        warnings.append(f"YOLOv11 detection failed: {e}")

    try:
        pose_result = pose_service.analyze_pose(tmp_path)
    except Exception as e:
        warnings.append(f"MediaPipe pose analysis failed: {e}")
    finally:
        os.remove(tmp_path)

    return {"detections": detection_summary, "pose": pose_result, "warnings": warnings}
