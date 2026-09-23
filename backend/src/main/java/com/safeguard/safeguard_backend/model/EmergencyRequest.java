package com.safeguard.safeguard_backend.model;

/**
 * Request body for the orchestration endpoint POST /api/emergency/respond.
 * riskLevel is optional - if omitted, it is computed by AIService from
 * the message.
 */
public class EmergencyRequest {

    private String username;
    private String message;
    private double latitude;
    private double longitude;
    private String riskLevel;

    public EmergencyRequest() {
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public double getLatitude() {
        return latitude;
    }

    public void setLatitude(double latitude) {
        this.latitude = latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public void setLongitude(double longitude) {
        this.longitude = longitude;
    }

    public String getRiskLevel() {
        return riskLevel;
    }

    public void setRiskLevel(String riskLevel) {
        this.riskLevel = riskLevel;
    }
}
