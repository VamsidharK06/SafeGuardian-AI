"""
Pose/gesture analysis via MediaPipe's Tasks API (PoseLandmarker), with
OpenCV used for image loading and BGR->RGB color conversion.

IMPORTANT: MediaPipe 1.0 removed the older "Solutions" API entirely
(mp.solutions.pose, used in most MediaPipe code samples still floating
around online) in favor of the newer Tasks API used here. If you see
`AttributeError: module 'mediapipe' has no attribute 'solutions'`, that
means mediapipe>=1.0 is installed and something is still using the old
API - this file has already been updated to the new one.

Model download note: unlike the old Solutions API, the Tasks API does NOT
bundle its pose model inside the pip package - it needs a separate
`.task` model file. This module downloads the small "lite" pose landmark
model (~5-9MB) from Google's model storage into ai-service/models/ the
first time it runs, and reuses it after that. That download needs
internet access on whatever machine runs this service, at least once.
"""

import os
import urllib.request

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

_MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "models")
_MODEL_PATH = os.path.join(_MODEL_DIR, "pose_landmarker_lite.task")
_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
    "pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"
)

# Standard BlazePose 33-point landmark topology - these indices are
# unchanged between the old Solutions API and the new Tasks API.
_LEFT_SHOULDER_INDEX = 11
_LEFT_HIP_INDEX = 23

_detector = None


def _ensure_model_downloaded():
    os.makedirs(_MODEL_DIR, exist_ok=True)
    if not os.path.exists(_MODEL_PATH):
        urllib.request.urlretrieve(_MODEL_URL, _MODEL_PATH)


def _load_detector():
    global _detector
    if _detector is None:
        _ensure_model_downloaded()
        base_options = mp_python.BaseOptions(model_asset_path=_MODEL_PATH)
        options = mp_vision.PoseLandmarkerOptions(
            base_options=base_options,
            running_mode=mp_vision.RunningMode.IMAGE,
            num_poses=1,
        )
        _detector = mp_vision.PoseLandmarker.create_from_options(options)
    return _detector


def analyze_pose(image_path: str):
    image_bgr = cv2.imread(image_path)
    if image_bgr is None:
        return {"poseDetected": False}

    image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)

    detector = _load_detector()
    result = detector.detect(mp_image)

    if not result.pose_landmarks:
        return {"poseDetected": False}

    # result.pose_landmarks is a list with one entry per detected pose;
    # num_poses=1 above means at most one entry.
    landmarks = result.pose_landmarks[0]
    left_shoulder = landmarks[_LEFT_SHOULDER_INDEX]
    left_hip = landmarks[_LEFT_HIP_INDEX]

    # Crude single-frame heuristic: MediaPipe's y-coordinate grows downward
    # in image space. If the shoulder and hip sit at nearly the same height
    # (small vertical gap), the body is roughly horizontal in-frame, which
    # can indicate someone lying down - a possible fall. This is a starting
    # heuristic, not a validated fall-detection model.
    vertical_gap = abs(left_shoulder.y - left_hip.y)
    possible_fall = vertical_gap < 0.12

    return {
        "poseDetected": True,
        "possibleFall": possible_fall,
    }
