"""
Object/person detection via YOLOv11 (ultralytics).

Model download note: YOLO("yolo11n.pt") downloads the small "nano" YOLOv11
checkpoint (~5-6MB) from Ultralytics' servers the first time it runs, and
caches it locally after that. That download needs internet access.

Known limitation: the stock YOLOv11 model is trained on the COCO dataset,
which has a "person" class but NO dedicated "weapon" class - it cannot
reliably detect knives/guns out of the box. Real weapon detection would
need a custom-trained or fine-tuned model; this service currently uses
YOLO for person counting / crowding signals only (e.g. "is someone
unusually close in the frame"), not weapon detection. See README.md.
"""

from ultralytics import YOLO

_model = None


def load_model():
    global _model
    if _model is None:
        _model = YOLO("yolo11n.pt")
    return _model


def detect_objects(image_path: str):
    """Runs YOLOv11 detection on a single image and returns a list of
    {label, confidence} for every detected object."""
    model = load_model()
    results = model(image_path, verbose=False)

    detections = []
    for r in results:
        for box in r.boxes:
            cls_id = int(box.cls[0])
            label = model.names[cls_id]
            confidence = float(box.conf[0])
            detections.append({"label": label, "confidence": round(confidence, 3)})
    return detections


def summarize_detections(detections):
    person_count = sum(1 for d in detections if d["label"] == "person")
    return {"personCount": person_count, "detections": detections}
