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
 * Sends SMS messages automatically using the Twilio REST API.
 *
 * This talks to Twilio directly over HTTPS using the JDK's built-in
 * HttpClient, so no extra Maven dependency is required.
 *
 * If Twilio credentials are not configured, {@link #isConfigured()} returns
 * false and {@link #sendSms(String, String)} is a no-op that returns false.
 * This lets the rest of the application run normally without Twilio, while
 * still enabling fully automatic ("no manual step") SOS delivery once real
 * credentials are supplied via environment variables.
 */
@Service
public class TwilioSmsService {

    @Value("${twilio.enabled:false}")
    private boolean enabled;

    @Value("${twilio.account-sid:}")
    private String accountSid;

    @Value("${twilio.auth-token:}")
    private String authToken;

    @Value("${twilio.from-number:}")
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
     * Sends a single SMS via Twilio. Returns true only if Twilio accepted
     * the message for delivery.
     */
    public boolean sendSms(String toNumber, String body) {

        if (!isConfigured() || toNumber == null || toNumber.isBlank()) {
            return false;
        }

        try {
            String credentials = Base64.getEncoder().encodeToString(
                    (accountSid + ":" + authToken).getBytes(StandardCharsets.UTF_8));

            String form = "To=" + URLEncoder.encode(toNumber, StandardCharsets.UTF_8)
                    + "&From=" + URLEncoder.encode(fromNumber, StandardCharsets.UTF_8)
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

            return response.statusCode() >= 200 && response.statusCode() < 300;

        } catch (Exception e) {
            System.err.println("[TwilioSmsService] Failed to send SMS: " + e.getMessage());
            return false;
        }
    }
}
