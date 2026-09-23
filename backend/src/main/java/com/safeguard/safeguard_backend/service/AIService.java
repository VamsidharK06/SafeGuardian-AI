package com.safeguard.safeguard_backend.service;

import com.safeguard.safeguard_backend.model.ThreatAssessment;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Rule-based, context-aware threat classifier.
 *
 * This intentionally returns different Risk Level / Threat Type / Recommended
 * Action combinations for different kinds of situations instead of one or two
 * repeated sentences. It is a placeholder for the real ML/NLP model the AI
 * teammate will eventually build (see project notes on the future
 * FastAPI + YOLOv11/Whisper/MediaPipe service) - the shape of the response
 * (ThreatAssessment) is what matters, since that is the contract the
 * frontend and the /api/emergency orchestration endpoints depend on.
 *
 * Context fusion: analyzeThreat(message) keeps its original text-only
 * behavior unchanged for existing callers (/api/ai/analyze). The new
 * analyzeThreat(message, hasLocation, hasImage, hasAudio) overload is used
 * by the multimodal SOS flow (/api/emergency/sos): it runs the same
 * text classification, then records which additional context signals
 * (location, camera evidence, voice evidence) were genuinely supplied for
 * this call and folds that into confidence and the reported
 * contextSignals list - it never claims a signal was used unless it was
 * actually supplied.
 */
@Service
public class AIService {

    public ThreatAssessment analyzeThreat(String message) {
        return analyzeThreat(message, false, false, false);
    }

    /**
     * Context-based assessment. hasLocation/hasImage/hasAudio reflect what
     * was actually captured for this SOS action (current GPS location,
     * captured camera evidence, captured voice evidence) - not continuous
     * streams.
     */
    public ThreatAssessment analyzeThreat(String message, boolean hasLocation,
                                           boolean hasImage, boolean hasAudio) {

        ThreatAssessment base = classifyText(message);

        List<String> signals = new ArrayList<>();
        boolean hasText = message != null && !message.trim().isEmpty();
        if (hasText) signals.add("user_text");
        if (hasLocation) signals.add("location");
        if (hasAudio) signals.add("voice");
        if (hasImage) signals.add("camera");
        base.setContextSignals(signals);

        // Corroborating evidence raises confidence in an already-flagged
        // situation; it never manufactures a threat out of evidence alone
        // when the text itself showed no indicators (LOW/UNKNOWN stay put).
        int extraSignals = (hasImage ? 1 : 0) + (hasAudio ? 1 : 0);
        if (extraSignals > 0 && !"LOW".equals(base.getRiskLevel()) && !"UNKNOWN".equals(base.getRiskLevel())) {
            int boosted = Math.min(99, base.getConfidence() + (extraSignals * 3));
            base.setConfidence(boosted);
            base.setReason(base.getReason() + " Corroborated by captured evidence ("
                    + String.join(", ", signalLabels(hasImage, hasAudio)) + ").");
        }

        return base;
    }

    private List<String> signalLabels(boolean hasImage, boolean hasAudio) {
        List<String> labels = new ArrayList<>();
        if (hasImage) labels.add("camera");
        if (hasAudio) labels.add("voice");
        return labels;
    }

    private ThreatAssessment classifyText(String message) {

        if (message == null || message.trim().isEmpty()) {
            return new ThreatAssessment(
                    "UNKNOWN", "No input provided", 0,
                    "Please describe what is happening.",
                    List.of(),
                    "No message was provided to analyze."
            );
        }

        String text = message.toLowerCase();

        // 1. Medical emergency - highest priority, needs immediate physical help
        if (containsAny(text, "fell", "fallen", "can't move", "cannot move", "unconscious",
                "not breathing", "can't breathe", "cannot breathe", "chest pain",
                "bleeding", "collapsed", "seizure", "injured badly", "heart attack")) {

            return new ThreatAssessment(
                    "HIGH", "Medical emergency", 88,
                    "Trigger SOS immediately and get emergency medical help.",
                    List.of("Get live location", "Retrieve trusted contacts",
                            "Send emergency alert", "Share location"),
                    "The message describes a physical medical emergency requiring immediate assistance."
            );
        }

        // 2. Active violence / attack in progress
        if (containsAny(text, "attack", "attacking", "being attacked", "assault", "assaulted",
                "kidnap", "kidnapping", "weapon", "gun", "knife", "trying to hurt me",
                "trying to grab me")) {

            return new ThreatAssessment(
                    "HIGH", "Active physical threat / assault", 93,
                    "Trigger SOS immediately.",
                    List.of("Get live location", "Retrieve trusted contacts",
                            "Send emergency alert", "Share location"),
                    "The message indicates an active or imminent physical attack."
            );
        }

        // 3. Being followed / stalked - explicit, active threat
        if (containsAny(text, "following me", "stalking", "chasing me", "someone is following")
                && containsAny(text, "alone", "scared", "afraid", "help", "following")) {

            return new ThreatAssessment(
                    "HIGH", "Possible stalking/following", 91,
                    "Trigger SOS immediately.",
                    List.of("Get live location", "Retrieve trusted contacts",
                            "Send emergency alert", "Share location"),
                    "The message indicates a potential immediate personal-safety threat."
            );
        }

        // 4. Milder/ambiguous "being followed" without the strong "alone/scared" signal
        if (containsAny(text, "following", "walking behind", "behind me")) {

            return new ThreatAssessment(
                    "MEDIUM", "Suspicious following", 68,
                    "Move to a safe/public location and monitor the situation.",
                    List.of("Keep live location ready", "Stay in a public, well-lit area",
                            "Be ready to trigger SOS if the situation escalates"),
                    "The message describes a suspicious but not yet confirmed threatening presence."
            );
        }

        // 5. Kidnap/danger/threat/help - generic strong distress words
        if (containsAny(text, "danger", "threat", "threatened", "help me", "in trouble",
                "emergency", "not safe")) {

            return new ThreatAssessment(
                    "HIGH", "General distress / possible threat", 85,
                    "Trigger SOS immediately and share your location with trusted contacts.",
                    List.of("Get live location", "Retrieve trusted contacts",
                            "Send emergency alert", "Share location"),
                    "The message contains strong distress language suggesting the person is in danger."
            );
        }

        // 6. Discomfort / mild unease - not an active threat yet
        if (containsAny(text, "uncomfortable", "suspicious", "scared", "afraid", "unsafe",
                "nervous", "worried", "watched", "creepy")) {

            return new ThreatAssessment(
                    "MEDIUM", "Possible unsafe situation", 60,
                    "Stay alert, move toward a safe/public location, and consider triggering SOS.",
                    List.of("Keep live location ready", "Move to a safe/public location",
                            "Be ready to trigger SOS if the situation escalates"),
                    "The message describes discomfort or unease but no confirmed immediate threat."
            );
        }

        // 7. Default - no indicators found
        return new ThreatAssessment(
                "LOW", "No immediate threat detected", 40,
                "Continue to stay aware of your surroundings.",
                List.of("No automated action needed right now"),
                "The message does not contain language indicating an immediate safety threat."
        );
    }

    private boolean containsAny(String text, String... keywords) {
        for (String keyword : keywords) {
            if (text.contains(keyword)) {
                return true;
            }
        }
        return false;
    }
}
