package com.safeguard.safeguard_backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Optional client for the separate Python FastAPI AI service
 * (ai-service/ - YOLOv11, OpenCV, PyTorch, Whisper, MediaPipe) described in
 * the project's planned architecture:
 *
 *   Frontend -> Spring Boot -> FastAPI AI Service -> YOLOv11/OpenCV/
 *   PyTorch/Whisper/MediaPipe -> Threat assessment -> Spring Boot
 *
 * This is disabled by default and purely additive: the backend's own
 * rule-based AIService keeps powering the existing /api/ai/analyze
 * endpoint exactly as before. This client only powers the new
 * /api/ai/analyze-advanced endpoint, and that endpoint falls back to the
 * existing rule-based assessment (clearly labeled as a fallback) whenever
 * the AI service is disabled or unreachable - it never fakes a fused
 * assessment it didn't actually get.
 */
@Service
public class AIServiceClient {

    @Value("${ai-service.enabled:false}")
    private boolean enabled;

    @Value("${ai-service.base-url:http://localhost:8001}")
    private String baseUrl;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public boolean isConfigured() {
        return enabled;
    }

    /**
     * Calls the FastAPI service's POST /analyze/fused-text endpoint with a
     * plain text description and returns its raw JSON response body
     * (already shaped like ThreatAssessment), or null if the service is
     * disabled, unreachable, or returns an error.
     */
    public String analyzeText(String text) {
        if (!enabled) {
            return null;
        }

        try {
            String safeText = text == null ? "" : text;
            String jsonBody = "{\"text\":\""
                    + safeText.replace("\\", "\\\\")
                              .replace("\"", "\\\"")
                              .replace("\n", "\\n")
                    + "\"}";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/analyze/fused-text"))
                    .timeout(Duration.ofSeconds(20))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return response.body();
            }

            System.err.println("[AIServiceClient] AI service returned HTTP "
                    + response.statusCode() + ": " + response.body());
            return null;

        } catch (Exception e) {
            System.err.println("[AIServiceClient] Failed to reach AI service at "
                    + baseUrl + ": " + e.getMessage());
            return null;
        }
    }
}
