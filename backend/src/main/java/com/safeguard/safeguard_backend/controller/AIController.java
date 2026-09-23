package com.safeguard.safeguard_backend.controller;

import tools.jackson.databind.json.JsonMapper;
import com.safeguard.safeguard_backend.model.AIRequest;
import com.safeguard.safeguard_backend.model.ThreatAssessment;
import com.safeguard.safeguard_backend.service.AIService;
import com.safeguard.safeguard_backend.service.AIServiceClient;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
public class AIController {

    private final AIService aiService;
    private final AIServiceClient aiServiceClient;
    private final JsonMapper jsonMapper;

    public AIController(AIService aiService, AIServiceClient aiServiceClient, JsonMapper jsonMapper) {
        this.aiService = aiService;
        this.aiServiceClient = aiServiceClient;
        this.jsonMapper = jsonMapper;
    }

    /**
     * Existing endpoint - unchanged. Always uses the backend's own
     * rule-based classifier (AIService). This is what the AI Assistant
     * page has always called.
     */
    @PostMapping("/analyze")
    public ThreatAssessment analyzeThreat(@RequestBody AIRequest request) {
        return aiService.analyzeThreat(request.getMessage());
    }

    /**
     * New, additive endpoint. When the separate FastAPI AI service
     * (ai-service/ - YOLOv11, OpenCV, PyTorch, Whisper, MediaPipe) is
     * configured and reachable, this forwards the text to it and returns
     * its fused assessment. Otherwise it falls back to the same rule-based
     * assessment as /analyze, clearly labeled as a fallback - it never
     * fakes a result from the AI service it didn't actually get.
     */
    @PostMapping(value = "/analyze-advanced", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> analyzeAdvanced(@RequestBody AIRequest request) {

        String aiServiceResponse = aiServiceClient.analyzeText(request.getMessage());

        if (aiServiceResponse != null) {
            Map<String, Object> wrapped = new LinkedHashMap<>();
            wrapped.put("aiServiceConfigured", true);
            wrapped.put("assessment", jsonMapper.readTree(aiServiceResponse));
            return ResponseEntity.ok(jsonMapper.writeValueAsString(wrapped));
        }

        ThreatAssessment fallback = aiService.analyzeThreat(request.getMessage());

        Map<String, Object> wrapped = new LinkedHashMap<>();
        wrapped.put("aiServiceConfigured", false);
        wrapped.put("note", "The FastAPI AI service (YOLOv11/OpenCV/PyTorch/Whisper/MediaPipe) is "
                + "not configured or unreachable. Falling back to the built-in rule-based assessment.");
        wrapped.put("assessment", fallback);

        return ResponseEntity.ok(jsonMapper.writeValueAsString(wrapped));
    }
}
