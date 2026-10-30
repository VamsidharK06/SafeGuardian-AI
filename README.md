# SafeGuardian

## A Web-Based Emergency SOS and Email Notification System

SafeGuardian is a browser-based emergency alert application designed to help authenticated users notify their registered emergency contacts during an emergency. The application allows users to manage emergency contacts, activate an SOS alert, share available location information, track incidents, and resolve incidents after password verification.

The system uses a separate notification worker to process email notifications asynchronously.

---

## Repository

**GitHub repository:** https://github.com/VamsidharK06/SafeGuardian-AI

The project is organized across two branches:

| Branch | Contents |
|---|---|
| `master` | Application source code |
| `main` | Project documentation and academic materials |

- [View source code (`master`)](https://github.com/VamsidharK06/SafeGuardian-AI/tree/master)
- [View documentation (`main`)](https://github.com/VamsidharK06/SafeGuardian-AI/tree/main)

The `main` branch is the repository's documentation starting point. Open the `master` branch to view the application source code.

---

## Project Objectives

- Provide authenticated access to the emergency SOS application.
- Allow users to add and manage registered emergency contacts.
- Obtain the user's location through the browser Geolocation API when permission and device support are available.
- Allow users to activate an SOS incident.
- Send email alerts to registered emergency contacts.
- Store SOS incidents and notification records in PostgreSQL.
- Process email notifications asynchronously using a separate worker.
- Allow users to resolve an active incident after password verification.
- Display previous SOS incidents through the history feature.

---

## Main Features

### 1. User Authentication
- User registration and login.
- Password hashing using `bcrypt`.
- Session-based authentication using Express Session.

### 2. Emergency Contact Management
- Add and manage emergency contacts.
- Use registered contacts as recipients for SOS email notifications.

### 3. SOS Activation
- Activate SOS using a three-second press-and-hold action.
- Request the user's current location through the browser Geolocation API, subject to browser permission and device availability.
- Submit the SOS request to the backend.

### 4. Email Notifications
- Create notification records for registered emergency contacts.
- Send emergency email alerts through Nodemailer and an SMTP service.
- Include available location information and a Google Maps link in the email when coordinates are available.

### 5. Asynchronous Notification Worker
- Run a separate Node.js worker to process pending notification records.
- Update notification records according to the processing result.
- Retry failed notification attempts up to the configured limit.

### 6. Incident Management
- Store SOS incidents in PostgreSQL.
- Maintain incident states such as `ACTIVE` and `RESOLVED`.
- Require password verification before resolving an active incident.
- Display previous incidents in SOS history.

---

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Database connectivity | Node.js `pg` package |
| Authentication | Express Session, bcrypt |
| Email notifications | Nodemailer, SMTP |
| Location | Browser Geolocation API |
| Background processing | Node.js notification worker |
| Version control | Git and GitHub |

---

## System Workflow

1. The user logs in to SafeGuardian.
2. The user manages their registered emergency contacts.
3. During an emergency, the user activates the SOS button by pressing and holding it for three seconds.
4. The browser requests the user's location, if location permission and device support are available.
5. The frontend sends the SOS request to the Express backend.
6. The backend validates the request and checks for an existing active SOS incident.
7. The backend creates the incident and pending notification records in a PostgreSQL transaction.
8. The backend returns a response to the frontend.
9. The separate notification worker retrieves pending notification records.
10. The worker sends email alerts through Nodemailer and SMTP, then updates the notification status.
11. The user can later resolve the incident after password verification and view the incident history.

### Simplified Architecture

```text
                 +----------------------+
                 |       User           |
                 +----------+-----------+
                            |
                            v
                 +----------------------+
                 |   Web Frontend       |
                 |   HTML, CSS, JS      |
                 +----------+-----------+
                            |
                     HTTP Requests
                            |
                            v
                 +----------------------+
                 |   Node.js / Express  |
                 |      Backend         |
                 +----------+-----------+
                            |
                            v
                 +----------------------+
                 |     PostgreSQL       |
                 | Users, Contacts,     |
                 | Incidents, Alerts    |
                 +----------+-----------+
                            |
                  Pending notifications
                            |
                            v
                 +----------------------+
                 | Notification Worker |
                 |      Node.js         |
                 +----------+-----------+
                            |
                            v
                 +----------------------+
                 |   Nodemailer / SMTP  |
                 +----------+-----------+
                            |
                            v
                 +----------------------+
                 | Emergency Contacts   |
                 |   Email Alerts       |
                 +----------------------+
```

---

## Project Organization

The following is a logical overview of the application components. Refer to the `master` branch for the exact current source tree.

```text
SafeGuardian/
|
+-- public/
|   +-- index.html
|   +-- register.html
|   +-- dashboard.html
|   +-- css/
|   |   +-- style.css
|   |   +-- dashboard.css
|   +-- js/
|       +-- login.js
|       +-- register.js
|       +-- dashboard.js
|
+-- config/
|   +-- db.js
|
+-- middleware/
|   +-- authMiddleware.js
|
+-- routes/
|   +-- Authentication and application routes
|
+-- workers/
|   +-- notificationWorker.js
|
+-- services/
|   +-- Notification service
|
+-- database/
|   +-- schema.sql
|
+-- server.js
+-- package.json
+-- .env.example
+-- README.md
```

---

## Requirements

Before running the application, make sure the following are installed:

- Node.js and npm.
- PostgreSQL.
- A modern web browser.
- Git (if cloning the repository).
- An SMTP account and its configuration for sending email notifications.

An internet connection is required for SMTP email delivery and for obtaining browser location where the browser/device requires it.

---

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/VamsidharK06/SafeGuardian-AI.git
cd SafeGuardian-AI
```

The application source code is maintained in the `master` branch. If the clone checks out another default branch, switch to `master`:

```bash
git checkout master
```

### 2. Install dependencies

From the application source directory containing `package.json`, run:

```bash
npm install
```

### 3. Configure PostgreSQL

1. Start PostgreSQL.
2. Create a database for SafeGuardian.
3. Configure the database connection values in the environment file.
4. Apply the database setup script supplied with the project, if applicable.

Use the database name and schema expected by the application's current configuration.

### 4. Configure environment variables

Create a local `.env` file using the project's example configuration as a reference. Set the values required by the application, including database connection details, session configuration, and SMTP credentials.

Example placeholders:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password

SESSION_SECRET=replace_with_a_long_random_secret

SMTP_HOST=your_smtp_host
SMTP_PORT=your_smtp_port
SMTP_USER=your_smtp_username
SMTP_PASSWORD=your_smtp_password
```

**Important:** Environment variable names can differ according to the application's configuration. Check the source code and `.env.example` in the `master` branch and use the exact names expected by the project.

Never commit `.env`, database passwords, session secrets, or SMTP credentials to GitHub.

### 5. Start the backend

From the directory containing the backend `package.json`, run the start command defined in the project. For example:

```bash
npm start
```

If the project uses a development script, it may be started with:

```bash
npm run dev
```

Use the scripts listed in the project's `package.json`.

### 6. Start the notification worker

Open a separate terminal in the backend project directory and run the worker using the script or command defined by the project. For example:

```bash
node workers/notificationWorker.js
```

Keep the worker running while testing email notifications.

### 7. Open the application

Open the frontend using the serving method configured by the project. Sign in with a registered account and test the dashboard and SOS workflow.

---

## Notification and Incident Status

The application uses incident and notification states to track its workflow.

### Incident status

| Status | Meaning |
|---|---|
| `ACTIVE` | The SOS incident is active. |
| `RESOLVED` | The incident has been resolved by the user. |

### Notification status

| Status | Meaning |
|---|---|
| `PENDING` | The notification is waiting to be processed. |
| `SENT` | The email notification was sent successfully. |
| `FAILED` | The notification attempt failed. |

The notification worker processes pending records and applies the retry behavior configured in the application.

---

## Testing

The core application workflow was checked through functional testing in a controlled environment.

The checks included:

1. User login.
2. Dashboard and location display.
3. Emergency contact management.
4. SOS activation.
5. Email notification processing.
6. Rejection of an incorrect password during incident resolution.
7. Successful incident resolution after correct password verification.
8. SOS history retrieval.
9. Checks for an already active incident.

These checks demonstrate the tested application workflow. They should not be interpreted as production-scale load, security, or reliability testing.

---

## Security Considerations

- Passwords are hashed using `bcrypt`.
- Protected application routes use session-based authentication.
- Database access is handled by the backend.
- SMTP credentials and other secrets should be stored in environment variables.
- Incident resolution requires password verification.
- Browser location access depends on user permission and browser/device support.

Do not publish real user credentials, emergency contact details, phone numbers, email addresses, or precise location coordinates in the repository or screenshots.

---

## Current Scope and Limitations

- SafeGuardian is a web-based prototype for emergency SOS and email notification.
- Location sharing depends on browser permission and device availability.
- Email delivery depends on the configured SMTP service and network availability.
- The application does not itself guarantee that a recipient has read or acted on an email.
- The current notification workflow described here is email-based; SMS and WhatsApp delivery are not included as implemented features.
- The project is not an automatic emergency detection system and does not automatically contact police or other emergency services.

---

## Future Enhancements

Possible future improvements include:

- SMS and messaging-platform notifications.
- A dedicated mobile application.
- Trusted-contact acknowledgement of alerts.
- Improved notification delivery monitoring.
- Additional accessibility and responsive design improvements.
- Optional continuous location sharing with user consent.
- Integration with authorized emergency services, subject to applicable permissions and regulations.
- Broader security, performance, and reliability testing.

These are proposed enhancements and are not presented as current implemented features.

---

## Academic Project

**Project title:** SafeGuardian: A Web-Based Emergency SOS and Email Notification System

**Team:** SafeGuardian Team

**Department:** Computer Science and Engineering

**Degree:** Bachelor of Technology

---

## Contributors

- K. Vamsidhar
- K.V.S. Jaswanth
- B. Akhil Varma

---

## License

No open-source license has been specified for this repository. Contact the project contributors before reusing or redistributing the source code.
