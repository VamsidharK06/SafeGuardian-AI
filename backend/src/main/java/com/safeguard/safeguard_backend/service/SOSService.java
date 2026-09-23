package com.safeguard.safeguard_backend.service;

import com.safeguard.safeguard_backend.model.EmergencyContact;
import com.safeguard.safeguard_backend.model.ThreatAssessment;
import com.safeguard.safeguard_backend.repository.EmergencyContactRepository;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Core SOS logic, shared by:
 *  - the direct /api/sos/trigger endpoint (triggerSOS) and
 *    /api/emergency/respond (unchanged - text-only alert), and
 *  - the new multimodal /api/emergency/sos endpoint
 *    (triggerSOSWithEvidence - enriched message plus captured camera/voice
 *    evidence).
 *
 * Both retrieve every saved trusted contact and notify every one of them -
 * not just the first - through the configured WhatsApp Business API
 * (Twilio), while leaving the existing optional SMS channel untouched.
 */
@Service
public class SOSService {

    private final EmergencyContactRepository contactRepository;
    private final TwilioSmsService smsService;
    private final WhatsAppService whatsAppService;

    public SOSService(EmergencyContactRepository contactRepository,
                       TwilioSmsService smsService,
                       WhatsAppService whatsAppService) {
        this.contactRepository = contactRepository;
        this.smsService = smsService;
        this.whatsAppService = whatsAppService;
    }

    /** Original, unchanged text-only SOS flow used by /api/sos/trigger and /api/emergency/respond. */
    public Map<String, Object> triggerSOS(String username, double latitude, double longitude) {

        String locationLink = buildLocationLink(latitude, longitude);
        String alertMessage = "\uD83D\uDEA8 EMERGENCY!\n"
                + "This is " + username + ".\n"
                + "I need immediate help.\n\n"
                + "\uD83D\uDCCD My current location:\n"
                + locationLink + "\n\n"
                + "Please contact me immediately.\n"
                + "Sent via SafeGuardian AI.";

        List<EmergencyContact> contacts = contactRepository.findByUsername(username);

        boolean smsConfigured = smsService.isConfigured();
        boolean anySmsSent = false;

        List<Map<String, Object>> contactResults = new ArrayList<>();
        List<Map<String, Object>> notifications = new ArrayList<>();

        for (EmergencyContact contact : contacts) {

            boolean sent = smsConfigured && smsService.sendSms(contact.getPhone(), alertMessage);
            if (sent) {
                anySmsSent = true;
            }

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", contact.getId());
            item.put("name", contact.getName());
            item.put("phone", contact.getPhone());
            item.put("relation", contact.getRelation());
            item.put("smsSent", sent);
            contactResults.add(item);

            WhatsAppService.WhatsAppResult waResult =
                    whatsAppService.sendWhatsApp(contact.getPhone(), alertMessage);

            notifications.add(notificationEntry(contact, waResult));
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "SOS_TRIGGERED");
        response.put("message", "Emergency SOS received successfully");
        response.put("username", username);
        response.put("latitude", latitude);
        response.put("longitude", longitude);
        response.put("locationLink", locationLink);
        response.put("alertMessage", alertMessage);
        response.put("contactsFound", contacts.size());
        response.put("whatsAppConfigured", whatsAppService.isConfigured());
        response.put("notifications", notifications);
        response.put("autoSmsConfigured", smsConfigured);
        response.put("autoSmsSent", anySmsSent);
        response.put("contacts", contactResults);

        return response;
    }

    /**
     * Multimodal SOS flow used by /api/emergency/sos: builds the enriched
     * emergency message (including risk level / threat type when an AI
     * assessment is available), notifies every saved contact via WhatsApp
     * with that text message, and - only when the corresponding public
     * media URL was actually produced by MediaStorageService (i.e.
     * PUBLIC_BASE_URL is configured and evidence was captured) - sends the
     * camera and/or voice evidence as their own separate WhatsApp media
     * messages per contact, since a single WhatsApp message cannot reliably
     * carry text + multiple media items together.
     *
     * Every notification item reports a genuine SENT / FAILED /
     * NOT_CONFIGURED status - nothing is ever reported as sent unless
     * Twilio actually accepted it.
     */
    public Map<String, Object> triggerSOSWithEvidence(String username, double latitude, double longitude,
                                                        ThreatAssessment assessment,
                                                        String imageMediaUrl, String audioMediaUrl) {

        String locationLink = buildLocationLink(latitude, longitude);
        String alertMessage = buildEnrichedMessage(username, locationLink, assessment,
                imageMediaUrl != null, audioMediaUrl != null);

        List<EmergencyContact> contacts = contactRepository.findByUsername(username);

        List<Map<String, Object>> notifications = new ArrayList<>();

        for (EmergencyContact contact : contacts) {

            Map<String, Object> notification = new LinkedHashMap<>();
            notification.put("contact", contact.getName());
            notification.put("phone", contact.getPhone());

            // 1. Emergency text message (includes the current-location link).
            WhatsAppService.WhatsAppResult textResult =
                    whatsAppService.sendWhatsApp(contact.getPhone(), alertMessage);
            notification.put("status", textResult.status);
            if (textResult.detail != null) {
                notification.put("detail", textResult.detail);
            }

            // 2. Camera evidence - separate message, only if actually captured
            //    and a reachable public URL exists for Twilio to fetch it from.
            if (imageMediaUrl != null) {
                WhatsAppService.WhatsAppResult imageResult =
                        whatsAppService.sendWhatsAppMedia(contact.getPhone(), imageMediaUrl,
                                "\uD83D\uDCF7 Camera evidence - SafeGuardian AI");
                notification.put("cameraEvidenceStatus", imageResult.status);
                if (imageResult.detail != null) {
                    notification.put("cameraEvidenceDetail", imageResult.detail);
                }
            }

            // 3. Voice evidence - separate message, same conditions as above.
            if (audioMediaUrl != null) {
                WhatsAppService.WhatsAppResult audioResult =
                        whatsAppService.sendWhatsAppMedia(contact.getPhone(), audioMediaUrl,
                                "\uD83C\uDFA4 Voice evidence - SafeGuardian AI");
                notification.put("voiceEvidenceStatus", audioResult.status);
                if (audioResult.detail != null) {
                    notification.put("voiceEvidenceDetail", audioResult.detail);
                }
            }

            notifications.add(notification);
        }

        int sentCount = (int) notifications.stream()
                .filter(n -> "SENT".equals(n.get("status")))
                .count();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "SOS_TRIGGERED");
        response.put("message", "Emergency SOS received successfully");
        response.put("username", username);
        response.put("latitude", latitude);
        response.put("longitude", longitude);
        response.put("locationLink", locationLink);
        response.put("alertMessage", alertMessage);
        response.put("contactsFound", contacts.size());
        response.put("contactsProcessed", contacts.size());
        response.put("notificationsSent", sentCount);
        response.put("whatsAppConfigured", whatsAppService.isConfigured());
        response.put("cameraEvidenceIncluded", imageMediaUrl != null);
        response.put("voiceEvidenceIncluded", audioMediaUrl != null);
        response.put("notifications", notifications);

        return response;
    }

    private Map<String, Object> notificationEntry(EmergencyContact contact, WhatsAppService.WhatsAppResult result) {
        Map<String, Object> notification = new LinkedHashMap<>();
        notification.put("contact", contact.getName());
        notification.put("phone", contact.getPhone());
        notification.put("status", result.status);
        if (result.detail != null) {
            notification.put("detail", result.detail);
        }
        return notification;
    }

    private String buildLocationLink(double latitude, double longitude) {
        return "https://www.google.com/maps?q=" + latitude + "," + longitude;
    }

    private String buildEnrichedMessage(String username, String locationLink, ThreatAssessment assessment,
                                         boolean hasImage, boolean hasAudio) {
        StringBuilder sb = new StringBuilder();
        sb.append("\uD83D\uDEA8 SAFEGUARDIAN AI EMERGENCY ALERT\n\n");
        sb.append("User: ").append(username).append("\n");

        if (assessment != null) {
            sb.append("Risk: ").append(nullToDash(assessment.getRiskLevel())).append("\n");
            sb.append("Threat: ").append(nullToDash(assessment.getThreatType())).append("\n");
        }

        sb.append("\nCurrent location:\n").append(locationLink).append("\n");

        if (hasImage || hasAudio) {
            sb.append("\nEmergency evidence:\n");
            if (hasImage) sb.append("Camera evidence attached\n");
            if (hasAudio) sb.append("Voice evidence attached\n");
        }

        sb.append("\nPlease contact immediately.\nSent via SafeGuardian AI.");
        return sb.toString();
    }

    private String nullToDash(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }
}
