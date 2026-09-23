package com.safeguard.safeguard_backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;

/**
 * Sends real WhatsApp messages using Twilio's WhatsApp Business API.
 *
 * This is a genuine server-side WhatsApp API integration - not the browser
 * "wa.me" link trick. It talks to Twilio's REST API directly over HTTPS
 * using the JDK's built-in HttpClient (same approach as TwilioSmsService,
 * no extra Maven dependency needed) and can message every saved contact
 * from a single SOS trigger, with no browser popups and no manual "tap
 * Send" step.
 *
 * Twilio's WhatsApp channel uses the same /Messages.json endpoint as SMS,
 * distinguished only by prefixing both the "To" and "From" numbers with
 * "whatsapp:". See the project README for full setup steps (sandbox vs.
 * approved WhatsApp Business sender, and the 24-hour session window /
 * template requirement for messaging a number that hasn't messaged you
 * first).
 *
 * If WhatsApp credentials are not configured, {@link #isConfigured()}
 * returns false and {@link #sendWhatsApp(String, String)} returns a
 * {@link WhatsAppResult#notConfigured()} result without attempting any
 * network call - so a message is NEVER reported as sent unless Twilio
 * actually accepted it.
 */
@Service
public class WhatsAppService {

    @Value("${whatsapp.enabled:false}")
    private boolean enabled;

    @Value("${whatsapp.account-sid:}")
    private String accountSid;

    @Value("${whatsapp.auth-token:}")
    private String authToken;

    /** e.g. "whatsapp:+14155238886" (Twilio sandbox) or your approved WhatsApp Business number. */
    @Value("${whatsapp.from-number:}")
    private String fromNumber;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .build();

    public boolean isConfigured() {
        return enabled
                && accountSid != null && !accountSid.isBlank()
                && authToken != null && !authToken.isBlank()
                && fromNumber != null && !fromNumber.isBlank();
    }

    /**
     * Sends a single WhatsApp message via Twilio. Never throws - any
     * network or API failure for one contact is caught and reported as a
     * FAILED result, so the caller can safely keep processing the
     * remaining contacts in the loop.
     */
    public WhatsAppResult sendWhatsApp(String toNumber, String body) {

        if (!isConfigured()) {
            return WhatsAppResult.notConfigured();
        }
        if (toNumber == null || toNumber.isBlank()) {
            return WhatsAppResult.failed("No phone number on file for this contact.");
        }

        try {
            String credentials = Base64.getEncoder().encodeToString(
                    (accountSid + ":" + authToken).getBytes(StandardCharsets.UTF_8));

            String to = toWhatsAppAddress(toNumber);
            String from = toWhatsAppAddress(fromNumber);

            String form = "To=" + URLEncoder.encode(to, StandardCharsets.UTF_8)
                    + "&From=" + URLEncoder.encode(from, StandardCharsets.UTF_8)
                    + "&Body=" + URLEncoder.encode(body, StandardCharsets.UTF_8);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.twilio.com/2010-04-01/Accounts/"
                            + accountSid + "/Messages.json"))
                    .timeout(Duration.ofSeconds(10))
                    .header("Authorization", "Basic " + credentials)
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(form))
                    .build();

            HttpResponse<String> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return WhatsAppResult.sent();
            }

            // Twilio rejected the request (e.g. recipient outside the
            // 24-hour session window without an approved template,
            // unverified sandbox recipient, invalid number, etc.) - this is
            // exactly the kind of failure that must show up as FAILED, not
            // a false "SENT".
            System.err.println("[WhatsAppService] Twilio rejected WhatsApp message ("
                    + response.statusCode() + "): " + response.body());
            return WhatsAppResult.failed("Twilio returned HTTP " + response.statusCode());

        } catch (Exception e) {
            System.err.println("[WhatsAppService] Failed to send WhatsApp message: " + e.getMessage());
            return WhatsAppResult.failed(e.getMessage());
        }
    }

    /**
     * Sends a single WhatsApp media message (image or audio) via Twilio,
     * referencing a publicly-accessible mediaUrl (Twilio fetches the media
     * itself - it is never uploaded inline). Twilio does not allow mixing
     * arbitrary text + multiple media items in one message reliably, so
     * evidence is sent as its own message per item, with an optional short
     * caption. Never throws - failures are reported as a FAILED result so
     * the caller can keep processing the remaining contacts/items.
     */
    public WhatsAppResult sendWhatsAppMedia(String toNumber, String mediaUrl, String caption) {

        if (!isConfigured()) {
            return WhatsAppResult.notConfigured();
        }
        if (toNumber == null || toNumber.isBlank()) {
            return WhatsAppResult.failed("No phone number on file for this contact.");
        }
        if (mediaUrl == null || mediaUrl.isBlank()) {
            return WhatsAppResult.failed("No media URL available to send.");
        }

        try {
            String credentials = Base64.getEncoder().encodeToString(
                    (accountSid + ":" + authToken).getBytes(StandardCharsets.UTF_8));

            String to = toWhatsAppAddress(toNumber);
            String from = toWhatsAppAddress(fromNumber);

            StringBuilder form = new StringBuilder();
            form.append("To=").append(URLEncoder.encode(to, StandardCharsets.UTF_8));
            form.append("&From=").append(URLEncoder.encode(from, StandardCharsets.UTF_8));
            form.append("&MediaUrl=").append(URLEncoder.encode(mediaUrl, StandardCharsets.UTF_8));
            if (caption != null && !caption.isBlank()) {
                form.append("&Body=").append(URLEncoder.encode(caption, StandardCharsets.UTF_8));
            }

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.twilio.com/2010-04-01/Accounts/"
                            + accountSid + "/Messages.json"))
                    .timeout(Duration.ofSeconds(15))
                    .header("Authorization", "Basic " + credentials)
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(form.toString()))
                    .build();

            HttpResponse<String> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return WhatsAppResult.sent();
            }

            System.err.println("[WhatsAppService] Twilio rejected WhatsApp media message ("
                    + response.statusCode() + "): " + response.body());
            return WhatsAppResult.failed("Twilio returned HTTP " + response.statusCode());

        } catch (Exception e) {
            System.err.println("[WhatsAppService] Failed to send WhatsApp media message: " + e.getMessage());
            return WhatsAppResult.failed(e.getMessage());
        }
    }

    private String toWhatsAppAddress(String number) {
        String trimmed = number.trim();
        return trimmed.startsWith("whatsapp:") ? trimmed : "whatsapp:" + trimmed;
    }

    /** Outcome of a single WhatsApp send attempt for one contact. */
    public static class WhatsAppResult {
        public final String status; // "SENT" | "FAILED" | "NOT_CONFIGURED"
        public final String detail; // null when status is SENT

        private WhatsAppResult(String status, String detail) {
            this.status = status;
            this.detail = detail;
        }

        public static WhatsAppResult sent() {
            return new WhatsAppResult("SENT", null);
        }

        public static WhatsAppResult failed(String detail) {
            return new WhatsAppResult("FAILED", detail);
        }

        public static WhatsAppResult notConfigured() {
            return new WhatsAppResult("NOT_CONFIGURED",
                    "WhatsApp API is not configured on the server.");
        }
    }
}
