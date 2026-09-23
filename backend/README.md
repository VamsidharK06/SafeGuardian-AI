# SafeGuard Backend (Spring Boot)

REST API for the SafeGuard women-safety app: emergency contacts, one-click SOS delivery, and an AI risk assistant.

## Requirements
- Java 21
- Maven (or use the included `mvnw` / `mvnw.cmd` wrapper)
- PostgreSQL (a database named `safeguard` by default)

## Configuration

All configuration is done via environment variables (see `src/main/resources/application.properties`). Nothing sensitive is committed to source control — set these before running:

| Variable | Default | Purpose |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/safeguard` | JDBC connection string |
| `DB_USERNAME` | `postgres` | Database username |
| `DB_PASSWORD` | `postgres` | Database password |
| `TWILIO_ENABLED` | `false` | Set to `true` to enable fully automatic SOS text messages |
| `TWILIO_ACCOUNT_SID` | _(empty)_ | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | _(empty)_ | Twilio Auth Token |
| `TWILIO_FROM_NUMBER` | _(empty)_ | A phone number provisioned in your Twilio account |

Without Twilio configured, the API still works — `/api/sos/trigger` simply reports `autoSmsConfigured: false` and the frontend falls back to opening pre-filled WhatsApp messages for each contact automatically.

## Running

```bash
# create the database once
psql -U postgres -c "CREATE DATABASE safeguard;"

# run (dev)
./mvnw spring-boot:run

# or build a jar
./mvnw clean package
java -jar target/safeguard-backend-0.0.1-SNAPSHOT.jar
```

The API listens on `http://localhost:8080`.

## Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/contacts` | Add an emergency contact `{username, name, phone, relation}` |
| `GET` | `/api/contacts/{username}` | List a user's saved contacts |
| `DELETE` | `/api/contacts/{id}` | Remove a contact |
| `POST` | `/api/sos/trigger` | Trigger SOS `{username, latitude, longitude}` — looks up the user's contacts server-side and attempts automatic SMS delivery |
| `POST` | `/api/ai/analyze` | Analyze a free-text message `{message}` and return a risk assessment |

## Notes for production use
- CORS is currently wide open (`@CrossOrigin(origins = "*")`) for local development convenience — restrict this to your actual frontend origin before deploying.
- The login on the frontend is a demo only (no real authentication/authorization). Add real auth before storing genuine personal data.
