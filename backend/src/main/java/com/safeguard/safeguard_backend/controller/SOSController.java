package com.safeguard.safeguard_backend.controller;

import com.safeguard.safeguard_backend.model.SOSRequest;
import com.safeguard.safeguard_backend.service.SOSService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/sos")
@CrossOrigin(origins = "*")
public class SOSController {

    private final SOSService sosService;

    public SOSController(SOSService sosService) {
        this.sosService = sosService;
    }

    /**
     * One-click SOS: given the user's live location, this looks up all of
     * the user's saved emergency contacts and sends every one of them the
     * emergency message with the live location via Twilio's WhatsApp
     * Business API - not just the first saved contact, and with no browser
     * tabs or manual "tap Send" step.
     *
     * The response's "notifications" array reports a genuine SENT / FAILED
     * / NOT_CONFIGURED status per contact - a contact is only ever reported
     * as SENT once Twilio has actually accepted the message for delivery.
     */
    @PostMapping("/trigger")
    public ResponseEntity<Map<String, Object>> triggerSOS(@RequestBody SOSRequest request) {
        Map<String, Object> response = sosService.triggerSOS(
                request.getUsername(), request.getLatitude(), request.getLongitude());
        return ResponseEntity.ok(response);
    }
}
