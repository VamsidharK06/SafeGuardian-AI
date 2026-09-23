"""
Combines the independent signals from Whisper (voice/text), YOLOv11+OpenCV
(vision), and MediaPipe (pose) into one risk score, using PyTorch tensors
for the weighted combination.

Honesty note: this is a transparent, hand-set weighted-average function -
NOT a trained model. There is no labeled SafeGuardian incident dataset to
train a real classifier on yet. Implementing the combination step with
torch tensors (rather than plain Python arithmetic) means this same
function is a genuine, ready-to-extend starting point for a real trained
PyTorch model later - swap the fixed _WEIGHTS tensor for a small trained
nn.Module and every router that calls fuse_signals() keeps working
unchanged. Today, treat the output as "how alarming the combined evidence
looks by simple weighted rule", not a calibrated probability.

IMPORTANT: weights are renormalized across only the signals that were
actually supplied (see `active`). Without this, a text-only call could
never score above text_weight (0.45) even for a maximally alarming
message, silently under-reporting risk whenever vision/pose weren't
provided - which, for a phone-first product, is most requests.
"""

import torch

# [voice/text signal, vision signal, pose signal] - tune these weights as
# real usage data comes in. They only apply relative to each other among
# whichever signals are actually active for a given call.
_WEIGHTS = torch.tensor([0.45, 0.30, 0.25])


def fuse_signals(voice_score: float, vision_score: float, pose_score: float,
                  active=(True, True, True)):
    """
    active: which of (voice/text, vision, pose) were actually supplied for
    this call, in that order. Inactive channels are excluded from the
    weighted average entirely, rather than silently diluting the result
    with an implicit zero.
    """
    signals = torch.tensor(
        [voice_score, vision_score, pose_score], dtype=torch.float32
    )
    mask = torch.tensor([1.0 if a else 0.0 for a in active], dtype=torch.float32)
    weights = _WEIGHTS * mask
    weight_total = float(weights.sum())

    if weight_total == 0.0:
        return "LOW", 0

    risk_score = float(torch.clamp((signals * weights).sum() / weight_total, 0.0, 1.0))

    if risk_score >= 0.66:
        risk_level = "HIGH"
    elif risk_score >= 0.33:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    return risk_level, round(risk_score * 100)
