package com.safeguard.safeguard_backend.controller;

import com.safeguard.safeguard_backend.model.EmergencyRequest;
import com.safeguard.safeguard_backend.model.ThreatAssessment;
import com.safeguard.safeguard_backend.service.AIService;
import com.safeguard.safeguard_backend.service.MediaStorageService;
import com.safeguard.safeguard_backend.service.SOSService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Orchestration endpoint that ties the AI threat assessment together with
 * the SOS workflow (live location + saved contacts + notification), as
 * described in the project's future intelligent-emergency-response
 * direction:
 *
 *   AI result -> emergency orchestration -> SOS -> live location
 *   -> saved contacts -> notification
 *
 * Today this only runs the existing AIService and SOSService and combines
 * their results - it does not yet decide on its own whether to trigger SOS
 * automatically for lower risk levels. That policy decision (e.g. only
 * auto-trigger on HIGH risk) is intentionally left for a follow-up change
 * once the AI teammate's real model is in place, so this endpoint's shape
 * can stay stable while the decision logic behind it improves.
 */
@RestController
@RequestMapping("/api/emergency")
@CrossOrigin(origins = "*")
public class EmergencyController {

    private final AIService aiService;
    private final SOSService sosService;
    private final MediaStorageService mediaStorageService;

    public EmergencyController(AIService aiService, SOSService sosService,
                                MediaStorageService mediaStorageService) {
        this.aiService = aiService;
        this.sosService = sosService;
        this.mediaStorageService = mediaStorageService;
    }

    @PostMapping("/respond")
    public ResponseEntity<Map<String, Object>> respond(@RequestBody EmergencyRequest request) {

        ThreatAssessment assessment = aiService.analyzeThreat(request.getMessage());

        Map<String, Object> sosResult = sosService.triggerSOS(
                request.getUsername(), request.getLatitude(), request.getLongitude());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("assessment", assessment);
        response.put("sos", sosResult);

        return ResponseEntity.ok(response);
    }

    /**
     * The single one-click SOS action described in the project spec:
     *
     *   ONE SOS CLICK -> current GPS location -> context-based AI
     *   assessment -> retrieve saved trusted contacts -> automatically
     *   notify all of them -> share emergency evidence (captured camera
     *   image/short video + captured voice clip, when provided).
     *
     * Multipart so the browser can submit the optional captured evidence
     * files alongside the text/location in the same one-click action - the
     * user never opens WhatsApp, picks a contact, or taps Send themselves.
     *
     * image/audio are OPTIONAL: SOS still works with just location + text
     * if the browser couldn't capture camera/microphone evidence, and the
     * response says plainly whether evidence was actually included.
     */
    @PostMapping(value = "/sos", consumes = {"multipart/form-data"})
    public ResponseEntity<Map<String, Object>> multimodalSos(
            @RequestParam String username,
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam(required = false) String message,
            @RequestParam(required = false) MultipartFile image,
            @RequestParam(required = false) MultipartFile audio) {

        boolean hasImage = image != null && !image.isEmpty();
        boolean hasAudio = audio != null && !audio.isEmpty();

        // Context-based AI assessment: text + current location (always
        // present for this endpoint) + whether camera/voice evidence was
        // actually captured for this SOS action.
        ThreatAssessment assessment = aiService.analyzeThreat(message, true, hasImage, hasAudio);

        String imageMediaUrl = null;
        String audioMediaUrl = null;
        boolean mediaStorageError = false;

        try {
            if (hasImage) {
                imageMediaUrl = mediaStorageService.storeAndGetPublicUrl(image, "camera");
            }
            if (hasAudio) {
                audioMediaUrl = mediaStorageService.storeAndGetPublicUrl(audio, "voice");
            }
        } catch (IOException e) {
            // Evidence capture/storage failing must never block the core
            // SOS action (location + contact notification) from proceeding.
            mediaStorageError = true;
        }

        Map<String, Object> sosResult = sosService.triggerSOSWithEvidence(
                username, latitude, longitude, assessment, imageMediaUrl, audioMediaUrl);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("assessment", assessment);
        response.put("sos", sosResult);
        response.put("cameraEvidenceCaptured", hasImage);
        response.put("voiceEvidenceCaptured", hasAudio);
        response.put("cameraEvidenceDelivered", imageMediaUrl != null);
        response.put("voiceEvidenceDelivered", audioMediaUrl != null);
        if ((hasImage || hasAudio) && !mediaStorageService.isPublicUrlConfigured()) {
            response.put("mediaNote", "Evidence was captured but PUBLIC_BASE_URL is not configured on the "
                    + "server, so Twilio cannot fetch it - only the text alert with location was sent. "
                    + "Set PUBLIC_BASE_URL (e.g. a Cloudflare Tunnel URL) to enable evidence delivery.");
        } else if (mediaStorageError) {
            response.put("mediaNote", "Evidence capture could not be stored on the server; "
                    + "the text alert with location was still sent.");
        }

        return ResponseEntity.ok(response);
    }
}
