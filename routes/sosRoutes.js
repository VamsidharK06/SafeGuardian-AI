const express = require("express");
const pool = require("../config/db");
const requireAuth = require("../middleware/authMiddleware");
const bcrypt = require("bcrypt");

const router = express.Router();


// ============================================
// TRIGGER SOS
// ============================================

router.post("/", requireAuth, async (req, res) => {

    const client = await pool.connect();

    try {

        const {
            latitude,
            longitude,
            locality
        } = req.body;


        // ========================================
        // 1. VALIDATE LOCATION
        // ========================================

        if (
            latitude === undefined ||
            longitude === undefined
        ) {

            return res.status(400).json({
                message: "Latitude and longitude are required"
            });

        }


        // ========================================
        // 2. START TRANSACTION
        // ========================================

        await client.query("BEGIN");


        // ========================================
        // 3. CHECK EXISTING ACTIVE SOS
        // ========================================

        const activeSos = await client.query(
            `SELECT
                id,
                status,
                locked
             FROM sos_incidents
             WHERE user_id = $1
               AND status = 'ACTIVE'
             LIMIT 1`,
            [
                req.userId
            ]
        );


        if (activeSos.rows.length > 0) {

            await client.query("ROLLBACK");

            return res.status(409).json({
                message: "An SOS is already active",
                sos: activeSos.rows[0]
            });

        }


        // ========================================
        // 4. CREATE SOS INCIDENT
        // ========================================

        const sosResult = await client.query(
            `INSERT INTO sos_incidents
                (
                    user_id,
                    latitude,
                    longitude,
                    locality,
                    status,
                    locked
                )
             VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    'ACTIVE',
                    TRUE
                )
             RETURNING
                id,
                user_id,
                latitude,
                longitude,
                locality,
                triggered_at,
                status,
                locked`,
            [
                req.userId,
                latitude,
                longitude,
                locality || null
            ]
        );


        const sos = sosResult.rows[0];


        // ========================================
        // 5. GET EMERGENCY CONTACTS
        // ========================================

        const contactsResult = await client.query(
            `SELECT
                id,
                name,
                phone,
                email
             FROM emergency_contacts
             WHERE user_id = $1
             ORDER BY id`,
            [
                req.userId
            ]
        );


        const contacts = contactsResult.rows;


        // ========================================
        // 6. CREATE GOOGLE MAPS LINK
        // ========================================

        const mapsLink =
            `https://www.google.com/maps?q=${latitude},${longitude}`;


        // ========================================
        // 7. CREATE EMAIL NOTIFICATIONS
        // ========================================

        let emailNotificationsCreated = 0;


        for (const contact of contacts) {

            // Only create a notification if
            // the emergency contact has an email.
            if (!contact.email) {
                continue;
            }


            // ====================================
            // EMAIL MESSAGE
            // ====================================

            const emailMessage =
                `SAFEGUARDIAN EMERGENCY ALERT\n\n` +
                `Emergency alert triggered.\n\n` +
                `Location: ${mapsLink}\n` +
                `Time: ${new Date().toISOString()}\n` +
                `Nearby locality: ${locality || "Unavailable"}\n\n` +
                `Please respond immediately.`;


            // ====================================
            // CREATE EMAIL NOTIFICATION
            // ====================================

            await client.query(
                `INSERT INTO notifications
                    (
                        sos_id,
                        contact_id,
                        message,
                        status,
                        attempts,
                        channel
                    )
                 VALUES
                    (
                        $1,
                        $2,
                        $3,
                        'PENDING',
                        0,
                        'EMAIL'
                    )`,
                [
                    sos.id,
                    contact.id,
                    emailMessage
                ]
            );


            emailNotificationsCreated++;

        }


        // ========================================
        // 8. COMMIT TRANSACTION
        // ========================================

        await client.query("COMMIT");


        // ========================================
        // 9. RESPONSE
        // ========================================

        res.status(201).json({

            message: "SOS activated successfully",

            sos: {
                id: sos.id,
                status: sos.status,
                locked: sos.locked,
                latitude: sos.latitude,
                longitude: sos.longitude,
                locality: sos.locality,
                triggeredAt: sos.triggered_at
            },

            notificationsCreated:
                emailNotificationsCreated,

            emailNotifications:
                emailNotificationsCreated

        });


    } catch (error) {


        // ========================================
        // ROLLBACK
        // ========================================

        try {

            await client.query("ROLLBACK");

        } catch (rollbackError) {

            console.error(
                "Rollback error:",
                rollbackError
            );

        }


        console.error(
            "SOS error:",
            error
        );


        res.status(500).json({
            message: "Unable to activate SOS"
        });


    } finally {

        client.release();

    }

});


// ============================================
// GET ACTIVE SOS
// ============================================

router.get("/active", requireAuth, async (req, res) => {

    try {

        const result = await pool.query(
            `SELECT
                id,
                latitude,
                longitude,
                locality,
                triggered_at,
                status,
                locked
             FROM sos_incidents
             WHERE user_id = $1
               AND status = 'ACTIVE'
             ORDER BY triggered_at DESC
             LIMIT 1`,
            [
                req.userId
            ]
        );


        if (result.rows.length === 0) {

            return res.json({
                active: false
            });

        }


        res.json({

            active: true,

            sos: result.rows[0]

        });


    } catch (error) {

        console.error(
            "Get active SOS error:",
            error
        );


        res.status(500).json({
            message: "Internal server error"
        });

    }

});


// ============================================
// RESOLVE SOS
// ============================================

router.post("/:id/resolve", requireAuth, async (req, res) => {

    try {

        const sosId =
            req.params.id;


        const {
            password
        } = req.body;


        // ========================================
        // 1. REQUIRE PASSWORD
        // ========================================

        if (!password) {

            return res.status(400).json({
                message: "Password is required to resolve SOS"
            });

        }


        // ========================================
        // 2. GET USER PASSWORD
        // ========================================

        const userResult = await pool.query(
            `SELECT
                id,
                password_hash
             FROM users
             WHERE id = $1`,
            [
                req.userId
            ]
        );


        if (userResult.rows.length === 0) {

            return res.status(401).json({
                message: "User not found"
            });

        }


        const user =
            userResult.rows[0];


        // ========================================
        // 3. VERIFY PASSWORD
        // ========================================

        const passwordMatches =
            await bcrypt.compare(
                password,
                user.password_hash
            );


        if (!passwordMatches) {

            return res.status(401).json({
                message: "Invalid password"
            });

        }


        // ========================================
        // 4. RESOLVE ACTIVE SOS
        // ========================================

        const result = await pool.query(
            `UPDATE sos_incidents
             SET
                status = 'RESOLVED',
                locked = FALSE,
                resolved_at = CURRENT_TIMESTAMP
             WHERE
                id = $1
                AND user_id = $2
                AND status = 'ACTIVE'
             RETURNING
                id,
                status,
                locked,
                resolved_at`,
            [
                sosId,
                req.userId
            ]
        );


        // ========================================
        // 5. CHECK RESULT
        // ========================================

        if (result.rows.length === 0) {

            return res.status(404).json({
                message: "Active SOS not found"
            });

        }


        // ========================================
        // 6. RESPONSE
        // ========================================

        res.json({

            message:
                "SOS resolved successfully",

            sos:
                result.rows[0]

        });


    } catch (error) {

        console.error(
            "Resolve SOS error:",
            error
        );


        res.status(500).json({
            message: "Unable to resolve SOS"
        });

    }

});


// ============================================
// SOS HISTORY
// ============================================

router.get("/history", requireAuth, async (req, res) => {

    try {

        const result = await pool.query(
            `SELECT
                id,
                latitude,
                longitude,
                locality,
                triggered_at,
                resolved_at,
                status,
                locked
             FROM sos_incidents
             WHERE user_id = $1
             ORDER BY triggered_at DESC`,
            [
                req.userId
            ]
        );


        res.json({

            history:
                result.rows

        });


    } catch (error) {

        console.error(
            "Get SOS history error:",
            error
        );


        res.status(500).json({
            message: "Internal server error"
        });

    }

});


module.exports = router;