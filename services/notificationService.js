const pool = require("../config/db");


// ============================================
// MOCK SMS PROVIDER
// ============================================

async function sendSMS(phone, message) {

    console.log("\n====================================");
    console.log("MOCK SMS");
    console.log("====================================");
    console.log("To:", phone);
    console.log("Message:");
    console.log(message);
    console.log("====================================\n");

    // Simulate successful SMS delivery
    return {
        success: true,
        provider: "MOCK_SMS"
    };
}


// ============================================
// PROCESS ONE NOTIFICATION
// ============================================

async function processNotification(notificationId) {

    const client = await pool.connect();

    try {

        // Get notification + contact
        const result = await client.query(
            `SELECT
                n.id,
                n.sos_id,
                n.message,
                n.status,
                n.attempts,
                c.name AS contact_name,
                c.phone
             FROM notifications n
             JOIN emergency_contacts c
               ON n.contact_id = c.id
             WHERE n.id = $1`,
            [notificationId]
        );

        if (result.rows.length === 0) {
            throw new Error("Notification not found");
        }

        const notification = result.rows[0];

        // Don't process already completed notifications
        if (notification.status === "SENT") {

            console.log(
                `Notification ${notificationId} already sent`
            );

            return;
        }

        // Increase attempt count
        await client.query(
            `UPDATE notifications
             SET attempts = attempts + 1
             WHERE id = $1`,
            [notificationId]
        );

        // Send SMS
        const smsResult = await sendSMS(
            notification.phone,
            notification.message
        );

        if (smsResult.success) {

            await client.query(
                `UPDATE notifications
                 SET status = 'SENT',
                     sent_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [notificationId]
            );

            console.log(
                `Notification ${notificationId} marked as SENT`
            );

        } else {

            await client.query(
                `UPDATE notifications
                 SET status = 'FAILED'
                 WHERE id = $1`,
                [notificationId]
            );

            console.log(
                `Notification ${notificationId} marked as FAILED`
            );
        }

    } catch (error) {

        console.error(
            `Notification ${notificationId} processing error:`,
            error
        );

        await client.query(
            `UPDATE notifications
             SET status = 'FAILED'
             WHERE id = $1`,
            [notificationId]
        );

    } finally {

        client.release();

    }
}


// ============================================
// PROCESS ALL PENDING NOTIFICATIONS
// ============================================

async function processPendingNotifications() {

    const result = await pool.query(
        `SELECT id
         FROM notifications
         WHERE status = 'PENDING'
         ORDER BY id`
    );

    console.log(
        `Found ${result.rows.length} pending notifications`
    );

    for (const notification of result.rows) {

        await processNotification(
            notification.id
        );

    }
}


module.exports = {
    processNotification,
    processPendingNotifications
};