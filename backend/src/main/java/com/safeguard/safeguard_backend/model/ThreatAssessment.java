package com.safeguard.safeguard_backend.model;

import java.util.List;

/**
 * Structured, context-aware result of an AI threat analysis.
 * Returned as JSON by /api/ai/analyze (and used internally by the
 * /api/emergency/respond orchestration endpoint) instead of a single
 * repetitive sentence, so the frontend can render a real assessment:
 * risk level, threat type, confidence, recommended action, the automated
 * steps SafeGuard would take, and why.
 */
public class ThreatAssessment {

    private String riskLevel;      // LOW / MEDIUM / HIGH
    private String threatType;
    private int confidence;        // 0-100
    private String recommendedAction;
    private List<String> automatedResponse;
    private String reason;
    // Which context signals actually contributed to this assessment, e.g.
    // ["user_text", "location", "voice", "camera"]. Only signals that were
    // genuinely supplied and used are listed - never claimed if absent.
    private List<String> contextSignals;

    public ThreatAssessment() {
    }

    public ThreatAssessment(String riskLevel, String threatType, int confidence,
                             String recommendedAction, List<String> automatedResponse,
                             String reason) {
        this(riskLevel, threatType, confidence, recommendedAction, automatedResponse,
                reason, List.of("user_text"));
    }

    public ThreatAssessment(String riskLevel, String threatType, int confidence,
                             String recommendedAction, List<String> automatedResponse,
                             String reason, List<String> contextSignals) {
        this.riskLevel = riskLevel;
        this.threatType = threatType;
        this.confidence = confidence;
        this.recommendedAction = recommendedAction;
        this.automatedResponse = automatedResponse;
        this.reason = reason;
        this.contextSignals = contextSignals;
    }

    public String getRiskLevel() {
        return riskLevel;
    }

    public void setRiskLevel(String riskLevel) {
        this.riskLevel = riskLevel;
    }

    public String getThreatType() {
        return threatType;
    }

    public void setThreatType(String threatType) {
        this.threatType = threatType;
    }

    public int getConfidence() {
        return confidence;
    }

    public void setConfidence(int confidence) {
        this.confidence = confidence;
    }

    public String getRecommendedAction() {
        return recommendedAction;
    }

    public void setRecommendedAction(String recommendedAction) {
        this.recommendedAction = recommendedAction;
    }

    public List<String> getAutomatedResponse() {
        return automatedResponse;
    }

    public void setAutomatedResponse(List<String> automatedResponse) {
        this.automatedResponse = automatedResponse;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public List<String> getContextSignals() {
        return contextSignals;
    }

    public void setContextSignals(List<String> contextSignals) {
        this.contextSignals = contextSignals;
    }
}
