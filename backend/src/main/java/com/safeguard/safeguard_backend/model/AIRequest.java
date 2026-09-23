package com.safeguard.safeguard_backend.model;

public class AIRequest {

    private String message;

    public AIRequest() {
    }

    public AIRequest(String message) {
        this.message = message;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}