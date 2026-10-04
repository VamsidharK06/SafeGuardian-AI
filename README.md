# SafeGuardian

## Emergency Safety and SOS Management System

SafeGuardian is a web-based emergency safety system that allows authenticated users to trigger an SOS, share their current location with emergency contacts through email, manage emergency contacts, and maintain a history of emergency incidents.

The system is designed around a simple emergency workflow:

```text
Login
  ↓
Dashboard
  ↓
Trigger SOS
  ↓
Create Emergency Incident
  ↓
Notify Emergency Contacts
  ↓
Email Delivery
  ↓
Resolve SOS
  ↓
SOS History
```

---

## Features

### 🔐 User Authentication

- User login
- Session-based authentication
- Protected API endpoints
- Password hashing using bcrypt
- Logout functionality

---

### 🚨 Emergency SOS

Users can trigger an emergency SOS from the dashboard.

When an SOS is triggered, SafeGuardian:

- Captures the user's current latitude and longitude
- Stores the locality
- Creates an emergency incident
- Marks the incident as `ACTIVE`
- Locks the active incident
- Prevents multiple active SOS incidents for the same user
- Creates notification records for emergency contacts

---

### 📍 Location Capture

SafeGuardian uses the browser's geolocation functionality to obtain the user's current location.

The system stores:

```text
Latitude
Longitude
Locality
```

The location is converted into a Google Maps link for emergency notification.

Example:

```text
https://www.google.com/maps?q=17.4963,78.3857
```

---

### 👥 Emergency Contacts

Users can manage their emergency contacts.

Each contact contains:

```text
Name
Phone
Relationship
Email
```

Example:

```text
Mother
9123456789
Mother
mother@example.com
```

Contacts are associated with the authenticated user.

---

### 📧 Email Emergency Notifications

SafeGuardian currently uses **email** for emergency notifications.

When an SOS is triggered, an email notification is created for each emergency contact.

The email contains:

- Emergency alert
- Location
- Google Maps link
- Trigger time
- Locality
- Emergency response message

Example:

```text
SAFEGUARDIAN EMERGENCY ALERT

Emergency alert triggered.

Location:
https://www.google.com/maps?q=17.4963,78.3857

Time:
2026-10-04T09:11:38.782Z

Nearby locality:
Current location

Please respond immediately.
```

---

### ⚙️ Background Notification Worker

Email delivery is handled by a separate background worker.

The application first creates notification records in PostgreSQL:

```text
PENDING
```

The notification worker then processes them and sends the emails.

```text
SOS
 ↓
Notification Record
 ↓
PENDING
 ↓
Notification Worker
 ↓
SMTP
 ↓
SENT
```

If delivery fails:

```text
PENDING
 ↓
FAILED
```

The worker currently checks for pending notifications every **5 seconds**.

---

### 📊 Notification Tracking

Each notification stores its processing information.

Important fields include:

```text
id
sos_id
contact_id
message
status
attempts
sent_at
created_at
channel
```

Possible notification states:

```text
PENDING
SENT
FAILED
```

This allows SafeGuardian to track notification processing.

---

### 🔑 Password-Protected SOS Resolution

An active SOS cannot be resolved without password verification.

The user must provide their account password.

SafeGuardian verifies the password using bcrypt before resolving the emergency.

```text
Active SOS
    ↓
Resolve Emergency
    ↓
Enter Password
    ↓
Password Verification
    ↓
Correct Password
    ↓
RESOLVED
```

After successful resolution:

```text
status = RESOLVED
locked = FALSE
resolved_at = timestamp
```

An incorrect password does not resolve the SOS.

---

### 📜 SOS History

SafeGuardian maintains a history of previous SOS incidents.

The dashboard can display:

- SOS ID
- Status
- Locality
- Latitude
- Longitude
- Triggered time
- Resolved time
- Map location

Resolved incidents remain stored in PostgreSQL.

---

## Technology Stack

### Frontend

- HTML5
- CSS3
- JavaScript
- Browser Geolocation API

### Backend

- Node.js
- Express.js
- REST APIs
- Express Session
- bcrypt

### Database

- PostgreSQL

### Email

- Nodemailer
- SMTP

---

# Project Architecture

```text
                    ┌─────────────────────┐
                    │   SafeGuardian UI   │
                    │    HTML/CSS/JS      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    Express Server   │
                    │       Node.js       │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
       ┌────────────┐   ┌────────────┐   ┌────────────┐
       │    Auth    │   │    SOS     │   │  Contacts  │
       │   Routes   │   │   Routes   │   │   Routes   │
       └────────────┘   └─────┬──────┘   └────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │     PostgreSQL      │
                    │                     │
                    │ users               │
                    │ emergency_contacts  │
                    │ sos_incidents       │
                    │ notifications       │
                    └──────────┬──────────┘
                               │
                               │ PENDING
                               ▼
                    ┌─────────────────────┐
                    │ Notification Worker │
                    │       Node.js       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     SMTP Server     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Emergency Contacts  │
                    │       Email         │
                    └─────────────────────┘
```

---

# Project Structure

```text
safeguardian/
│
├── config/
│   └── db.js
│
├── middleware/
│   └── authMiddleware.js
│
├── routes/
│   ├── auth.js
│   ├── contacts.js
│   ├── sos.js
│   └── ...
│
├── workers/
│   └── notificationWorker.js
│
├── public/
│   ├── login.html
│   ├── dashboard.html
│   │
│   ├── css/
│   │   ├── dashboard.css
│   │   └── ...
│   │
│   └── js/
│       ├── dashboard.js
│       └── ...
│
├── .env
├── .gitignore
├── package.json
├── package-lock.json
└── server.js
```

> The exact structure may vary depending on the current project files.

---

# Database Structure

SafeGuardian uses PostgreSQL.

The main tables are:

```text
users
emergency_contacts
sos_incidents
notifications
```

---

## Users

Stores registered user information.

Typical fields:

```text
id
name
email
phone
password_hash
```

---

## Emergency Contacts

Stores emergency contacts belonging to users.

```text
id
user_id
name
phone
relationship
email
created_at
```

Relationship:

```text
users
   │
   └─── emergency_contacts
```

One user can have multiple emergency contacts.

---

## SOS Incidents

Stores emergency incidents.

```text
id
user_id
latitude
longitude
locality
triggered_at
resolved_at
status
locked
```

Example active incident:

```text
id: 12
user_id: 1
latitude: 17.4963
longitude: 78.3857
locality: Current location
status: ACTIVE
locked: true
```

After resolution:

```text
status: RESOLVED
locked: false
resolved_at: timestamp
```

---

## Notifications

Stores notification jobs created during an SOS.

```text
id
sos_id
contact_id
message
status
attempts
sent_at
created_at
channel
```

Current notification channel:

```text
EMAIL
```

Example:

```text
id: 20
sos_id: 6
contact_id: 5
channel: EMAIL
status: SENT
attempts: 1
sent_at: timestamp
```

---

# Requirements

Install the following before running the project:

- Node.js
- npm
- PostgreSQL
- SMTP-enabled email account

---

# Installation

Clone the project:

```bash
git clone <repository-url>
```

Move into the project:

```bash
cd safeguardian
```

Install dependencies:

```bash
npm install
```

---

# PostgreSQL Setup

Create the database:

```sql
CREATE DATABASE safeguardian;
```

Connect to the database:

```bash
psql -U postgres -d safeguardian
```

Create the required tables using the project's database schema.

Check available tables:

```sql
\dt
```

---

# Environment Variables

Create a `.env` file in the project root.

Example:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=safeguardian
DB_USER=postgres
DB_PASSWORD=your_database_password

SESSION_SECRET=your_session_secret

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_application_password
EMAIL_FROM=your_email@gmail.com
```

### Important

Never commit `.env` to Git.

Add:

```gitignore
.env
node_modules/
cookies.txt
```

to `.gitignore`.

For Gmail SMTP, use an **App Password** when required by the account.

---

# Running SafeGuardian

SafeGuardian has two processes:

```text
Main Server
     +
Notification Worker
```

Both need to be running for complete SOS email functionality.

---

## 1. Start PostgreSQL

Make sure PostgreSQL is running.

---

## 2. Start the Main Server

From the project directory:

```bash
node server.js
```

The application should be available at:

```text
http://localhost:3000
```

Open:

```text
http://localhost:3000/dashboard.html
```

---

## 3. Start the Notification Worker

Open another terminal.

Navigate to the project:

```bash
cd C:\Users\vamsi\safeguardian
```

Run:

```bash
node workers\notificationWorker.js
```

Expected output:

```text
SafeGuardian Notification Worker started
Checking notifications every 5 seconds
Email SMTP connection verified
```

---

# Application Workflow

## Login

The user logs in using their account credentials.

```text
Login
  ↓
Session Created
  ↓
Dashboard
```

---

## Add Emergency Contacts

The user can add contacts from the dashboard.

Each contact can have:

```text
Name
Phone
Relationship
Email
```

---

## Trigger SOS

The user triggers the SOS button.

SafeGuardian:

1. Gets the current location.
2. Checks whether another SOS is already active.
3. Creates the incident.
4. Sets it to `ACTIVE`.
5. Locks the incident.
6. Creates email notification records.

---

## Process Notifications

The worker finds:

```text
status = PENDING
```

and sends the email.

Successful delivery changes the record to:

```text
status = SENT
```

---

## Resolve SOS

The user selects:

```text
Resolve Emergency
```

The system requests the user's password.

After successful verification:

```text
ACTIVE → RESOLVED
```

---

## View History

The resolved incident remains available in:

```text
SOS History
```

---

# API Endpoints

The application provides REST endpoints for authentication, contacts, and SOS management.

## Authentication

```http
POST /api/auth/login
```

Used to authenticate the user.

---

## Contacts

```http
GET /api/contacts
```

Returns the authenticated user's emergency contacts.

```http
POST /api/contacts
```

Creates an emergency contact.

```http
DELETE /api/contacts/:id
```

Deletes an emergency contact.

---

## SOS

```http
POST /api/sos
```

Creates an emergency SOS.

```http
GET /api/sos/active
```

Returns the user's current active SOS, if one exists.

```http
POST /api/sos/:id/resolve
```

Resolves an active SOS after password verification.

```http
GET /api/sos/history
```

Returns the user's previous SOS incidents.

---

# Example SOS Request

```json
{
  "latitude": 17.4963,
  "longitude": 78.3857,
  "locality": "Current location"
}
```

---

# Example SOS Response

```json
{
  "message": "SOS activated successfully",
  "sos": {
    "id": 12,
    "status": "ACTIVE",
    "locked": true,
    "latitude": "17.4963",
    "longitude": "78.3857",
    "locality": "Current location"
  },
  "notificationsCreated": 3
}
```

---

# Example Resolution Request

```json
{
  "password": "your-password"
}
```

Successful response:

```json
{
  "message": "SOS resolved successfully",
  "sos": {
    "id": 12,
    "status": "RESOLVED",
    "locked": false
  }
}
```

---

# Testing

## Authentication

Test:

- Valid login
- Invalid password
- Invalid user
- Accessing protected endpoints without login
- Logout

---

## Emergency Contacts

Test:

- Add contact
- View contacts
- Delete contact
- Contact email
- Multiple contacts

---

## SOS

Test:

- Trigger SOS
- Capture location
- Create active incident
- Prevent duplicate active SOS
- Retrieve active SOS
- Resolve SOS
- View SOS history

---

## Resolution

Test:

```text
Correct password
        ↓
RESOLVED
```

```text
Incorrect password
        ↓
Rejected
```

```text
Missing password
        ↓
Rejected
```

---

## Email Notifications

Test:

```text
SOS Trigger
    ↓
PENDING notification
    ↓
Notification Worker
    ↓
SMTP
    ↓
Email received
    ↓
SENT
```

Verify:

- Recipient email
- Email subject
- Emergency message
- Location link
- Locality
- Timestamp
- Notification status

---

# Database Verification

## Check SOS Incidents

```sql
SELECT
    id,
    status,
    locked,
    triggered_at,
    resolved_at
FROM sos_incidents
ORDER BY id DESC;
```

---

## Check Emergency Contacts

```sql
SELECT
    id,
    name,
    phone,
    relationship,
    email
FROM emergency_contacts
ORDER BY id;
```

---

## Check Notifications

```sql
SELECT
    id,
    sos_id,
    contact_id,
    channel,
    status,
    attempts,
    sent_at
FROM notifications
ORDER BY id DESC;
```

---

# Security

SafeGuardian includes:

- Session-based authentication
- Password hashing
- bcrypt password verification
- Protected API routes
- User-specific SOS access
- User-specific emergency contacts
- Password-protected SOS resolution
- PostgreSQL foreign-key relationships
- Environment variables for sensitive configuration

Sensitive configuration such as database passwords, session secrets, and email credentials should never be committed to the repository.

---

# Current Notification Channel

The current implementation uses:

```text
EMAIL
```

The system does **not** currently depend on WhatsApp or SMS for emergency notification delivery.

This keeps the current implementation focused on reliable email-based emergency communication.

---

# Current Project Status

```text
User Authentication          ✓
Session Management           ✓
Dashboard                    ✓
Emergency Contacts           ✓
Contact Email Support        ✓
Location Capture             ✓
SOS Trigger                  ✓
Active SOS Detection         ✓
Duplicate SOS Prevention     ✓
SOS Locking                  ✓
Password-Protected Resolve   ✓
SOS History                  ✓
Notification Records         ✓
Notification Worker          ✓
SMTP Configuration           ✓
Real Email Delivery          ✓
Notification Status Tracking ✓
Notification Attempt Tracking✓
```

---

# Troubleshooting

## Server does not start

Check:

```bash
node server.js
```

Make sure:

- PostgreSQL is running
- `.env` is configured
- Dependencies are installed

Run:

```bash
npm install
```

---

## Database connection error

Verify:

```env
DB_HOST
DB_PORT
DB_NAME
DB_USER
DB_PASSWORD
```

Then test PostgreSQL separately:

```bash
psql -U postgres -d safeguardian
```

---

## Email is not being sent

Make sure the notification worker is running:

```bash
node workers\notificationWorker.js
```

Check that the worker reports:

```text
Email SMTP connection verified
```

Also verify the SMTP credentials in `.env`.

---

## Notifications remain PENDING

Check whether the worker is running.

Then inspect:

```sql
SELECT
    id,
    status,
    attempts,
    channel
FROM notifications
ORDER BY id DESC;
```

---

## SOS cannot be resolved

Verify:

- The SOS belongs to the logged-in user.
- The SOS status is `ACTIVE`.
- The correct account password is being supplied.

Check:

```sql
SELECT
    id,
    user_id,
    status,
    locked
FROM sos_incidents
ORDER BY id DESC;
```

---

# Typical Complete Run

A complete local run looks like:

```text
PostgreSQL
    ↓
Node.js Server
    ↓
Login
    ↓
Dashboard
    ↓
Add Emergency Contacts
    ↓
Trigger SOS
    ↓
SOS = ACTIVE
    ↓
Notifications = PENDING
    ↓
Notification Worker
    ↓
Email Sent
    ↓
Notifications = SENT
    ↓
Enter Password
    ↓
SOS = RESOLVED
    ↓
SOS appears in History
```

---

# License

This project is developed for educational and software development purposes.

---

# SafeGuardian

**Trigger. Notify. Resolve. Remember.**

A simple emergency workflow designed to keep the complete SOS lifecycle organized:

```text
TRIGGER
   ↓
NOTIFY
   ↓
RESOLVE
   ↓
HISTORY
```
