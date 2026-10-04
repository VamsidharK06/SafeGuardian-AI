const pool = require("../config/db");
const nodemailer = require("nodemailer");


// ============================================
// EMAIL TRANSPORTER
// ============================================

const emailTransporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === "true",

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});


// ============================================
// WORKER LOCK
// Prevent overlapping processing cycles
// ============================================

let processing = false;


// ============================================
// VERIFY EMAIL CONFIGURATION
// ============================================

async function verifyEmailConfiguration() {

    try {

        await emailTransporter.verify();

        console.log("Email SMTP connection verified");

    } catch (error) {

        console.error(
            "Email SMTP configuration error:",
            error.message
        );
    }
}


// ============================================
// SEND EMAIL
// ============================================

async function sendEmail(email, message) {

    console.log("");
    console.log("====================================");
    console.log("REAL EMAIL");
    console.log("====================================");

    console.log(`To: ${email}`);

    console.log("Sending email...");


    await emailTransporter.sendMail({

        from: `"SafeGuardian" <${process.env.EMAIL_FROM}>`,

        to: email,

        subject: "SafeGuardian Emergency Alert",

        text: message

    });


    console.log("Email sent successfully");

    console.log("====================================");
}


// ============================================
// PROCESS NOTIFICATIONS
// ============================================

async function processNotifications() {

    // Prevent overlapping cycles
    if (processing) {

        console.log(
            "Previous notification cycle still running. Skipping this cycle."
        );

        return;
    }


    processing = true;


    try {

        const result = await pool.query(

            `SELECT
                n.id,
                n.sos_id,
                n.contact_id,
                n.message,
                n.status,
                n.attempts,
                n.channel,

                c.name AS contact_name,
                c.email AS contact_email

             FROM notifications n

             JOIN emergency_contacts c
               ON c.id = n.contact_id

             WHERE n.status = 'PENDING'
               AND n.channel = 'EMAIL'

             ORDER BY n.id

             LIMIT 10`

        );


        if (result.rows.length === 0) {

            return;
        }


        console.log(
            `Found ${result.rows.length} pending email notification(s)`
        );


        for (const notification of result.rows) {

            console.log("");
            console.log("------------------------------------");

            console.log(
                `Processing notification ${notification.id}`
            );

            console.log(
                `Contact: ${notification.contact_name}`
            );

            console.log(
                `Channel: ${notification.channel}`
            );


            try {

                // ====================================
                // VALIDATE EMAIL
                // ====================================

                if (!notification.contact_email) {

                    throw new Error(
                        "Contact does not have an email address"
                    );
                }


                // ====================================
                // SEND EMAIL
                // ====================================

                await sendEmail(
                    notification.contact_email,
                    notification.message
                );


                // ====================================
                // MARK SENT
                // ====================================

                await pool.query(

                    `UPDATE notifications
                     SET
                        status = 'SENT',
                        attempts = attempts + 1,
                        sent_at = CURRENT_TIMESTAMP
                     WHERE id = $1
                       AND status = 'PENDING'`,

                    [notification.id]

                );


                console.log(
                    `Notification ${notification.id} marked as SENT`
                );


            } catch (error) {

                console.error(
                    `Notification ${notification.id} failed:`,
                    error.message
                );


                // ====================================
                // INCREMENT ATTEMPTS
                // ====================================

                const updateResult = await pool.query(

                    `UPDATE notifications
                     SET attempts = attempts + 1
                     WHERE id = $1
                     RETURNING attempts`,

                    [notification.id]

                );


                const attempts =
                    updateResult.rows[0].attempts;


                // ====================================
                // RETRY LIMIT
                // ====================================

                if (attempts >= 3) {

                    await pool.query(

                        `UPDATE notifications
                         SET status = 'FAILED'
                         WHERE id = $1`,

                        [notification.id]

                    );


                    console.log(
                        `Notification ${notification.id} marked as FAILED`
                    );

                } else {

                    console.log(
                        `Notification ${notification.id} will be retried`
                    );
                }
            }
        }


    } catch (error) {

        console.error(
            "Notification worker error:",
            error
        );

    } finally {

        processing = false;
    }
}


// ============================================
// START WORKER
// ============================================

console.log(
    "SafeGuardian Notification Worker started"
);

console.log(
    "Email-only notification mode"
);

console.log(
    "Checking notifications every 5 seconds"
);


// Verify SMTP
verifyEmailConfiguration();


// Process immediately
processNotifications();


// Process every 5 seconds
setInterval(
    processNotifications,
    5000
);