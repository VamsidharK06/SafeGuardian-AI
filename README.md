# SafeGuardian AI
### Agentic Women Safety and Intelligent SOS Response Platform

## Project Overview

SafeGuardian AI is a women-safety platform designed to reduce manual actions during emergencies. The system combines a simple SOS workflow, live location capture, trusted emergency contacts, backend orchestration, and AI-based threat assessment.

## Current Architecture

Frontend  
↓  
Spring Boot REST API  
↓  
PostgreSQL  
↓  
Emergency Contact & SOS Services  
↓  
Notification Service  

AI Layer  
↓  
FastAPI  
↓  
YOLOv11 / OpenCV / Whisper / MediaPipe / PyTorch  
↓  
Threat Assessment

## Current Progress

### Completed ✅

- Clean and simplified web-based user interface
- User login flow
- Emergency contact management
- Add, view and delete emergency contacts
- PostgreSQL database integration
- Spring Boot REST API integration
- Frontend ↔ Backend integration
- Live browser GPS location capture
- One-click SOS request workflow
- Backend SOS orchestration
- Retrieval of all saved emergency contacts
- Structured SOS response
- Basic AI threat-assessment API
- FastAPI AI service setup
- AI service health endpoint
- Initial multimodal AI service integration/scaffolding
- Postman API testing

### In Progress 🚧

- Automatic WhatsApp notification through Twilio/WhatsApp Business API
- Automatic notification to multiple saved emergency contacts
- Proper camera-based and voice-based threat detection

## Core Emergency Workflow

The intended final workflow is:

User presses SOS once  
↓  
Live GPS location captured  
↓  
Spring Boot receives SOS  
↓  
Saved emergency contacts retrieved  
↓  
Notification service processes all contacts  
↓  
Emergency alert with live location is delivered

The goal is to minimize manual actions during an emergency.

## Technology Stack

### Frontend
- HTML5
- CSS3
- JavaScript
- Fetch API
- Browser Geolocation API

### Backend
- Java 21
- Spring Boot
- Spring Web / REST API
- Spring Data JPA
- Hibernate
- Maven
- Apache Tomcat

### Database
- PostgreSQL
- pgAdmin / psql

### AI
- Python
- FastAPI
- YOLOv11
- OpenCV
- Whisper
- MediaPipe
- PyTorch

### Communication
- Twilio / WhatsApp Business API

### Development & Testing
- Visual Studio Code
- Postman
- Git
- GitHub

## Current Notification Status

The SOS backend and notification architecture are implemented, but the external WhatsApp provider is not yet configured in the development environment.

Therefore, the system reports:

`NOT_CONFIGURED`

instead of falsely reporting a successful delivery.

This ensures that notification status reflects the actual provider configuration.

## Current Project Status

**Functional prototype with integrated frontend, backend, database, SOS workflow, and AI-service foundation.**

The remaining work is automatic WhatsApp notification, automatic notification to multiple saved emergency contacts, and proper camera-based and voice-based threat detection.
