"""
Pydantic models shared across routers. ThreatAssessment intentionally
mirrors the shape of the Java backend's ThreatAssessment model
(backend/.../model/ThreatAssessment.java) so the two are interchangeable
from the frontend's point of view.
"""

from typing import List
from pydantic import BaseModel


class ThreatAssessment(BaseModel):
    riskLevel: str
    threatType: str
    confidence: int
    recommendedAction: str
    automatedResponse: List[str]
    reason: str
    warnings: List[str] = []  # non-fatal processing issues (e.g. a modality that failed)
    contextSignals: List[str] = []  # which signals actually contributed, e.g. ["user_text","voice","camera"]


class TextAnalysisRequest(BaseModel):
    text: str
