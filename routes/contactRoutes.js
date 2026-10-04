const express = require("express");
const pool = require("../config/db");
const requireAuth = require("../middleware/authMiddleware");

const router = express.Router();


// ============================================
// ADD EMERGENCY CONTACT
// ============================================

router.post("/", requireAuth, async (req, res) => {
    try {

        const {
            name,
            phone,
            relationship,
            email
        } = req.body;


        if (!name || !phone) {

            return res.status(400).json({
                message: "Name and phone number are required"
            });

        }


        const result = await pool.query(
            `INSERT INTO emergency_contacts
                (
                    user_id,
                    name,
                    phone,
                    relationship,
                    email
                )
             VALUES
                ($1, $2, $3, $4, $5)
             RETURNING
                id,
                name,
                phone,
                relationship,
                email,
                created_at`,
            [
                req.userId,
                name,
                phone,
                relationship || null,
                email || null
            ]
        );


        res.status(201).json({

            message: "Emergency contact added",

            contact: result.rows[0]

        });


    } catch (error) {

        console.error(
            "Add contact error:",
            error
        );


        res.status(500).json({
            message: "Internal server error"
        });

    }
});


// ============================================
// GET ALL EMERGENCY CONTACTS
// ============================================

router.get("/", requireAuth, async (req, res) => {

    try {

        const result = await pool.query(
            `SELECT
                id,
                name,
                phone,
                relationship,
                email,
                created_at
             FROM emergency_contacts
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [
                req.userId
            ]
        );


        res.json({

            contacts: result.rows

        });


    } catch (error) {

        console.error(
            "Get contacts error:",
            error
        );


        res.status(500).json({
            message: "Internal server error"
        });

    }

});


// ============================================
// UPDATE EMERGENCY CONTACT
// ============================================

router.put("/:id", requireAuth, async (req, res) => {

    try {

        const contactId =
            req.params.id;


        const {
            name,
            phone,
            relationship,
            email
        } = req.body;


        if (!name || !phone) {

            return res.status(400).json({
                message: "Name and phone number are required"
            });

        }


        const result = await pool.query(
            `UPDATE emergency_contacts
             SET
                name = $1,
                phone = $2,
                relationship = $3,
                email = $4
             WHERE
                id = $5
                AND user_id = $6
             RETURNING
                id,
                name,
                phone,
                relationship,
                email,
                created_at`,
            [
                name,
                phone,
                relationship || null,
                email || null,
                contactId,
                req.userId
            ]
        );


        if (result.rows.length === 0) {

            return res.status(404).json({
                message: "Contact not found"
            });

        }


        res.json({

            message: "Emergency contact updated",

            contact: result.rows[0]

        });


    } catch (error) {

        console.error(
            "Update contact error:",
            error
        );


        res.status(500).json({
            message: "Internal server error"
        });

    }

});


// ============================================
// DELETE EMERGENCY CONTACT
// ============================================

router.delete("/:id", requireAuth, async (req, res) => {

    try {

        const contactId =
            req.params.id;


        const result = await pool.query(
            `DELETE FROM emergency_contacts
             WHERE
                id = $1
                AND user_id = $2
             RETURNING id`,
            [
                contactId,
                req.userId
            ]
        );


        if (result.rows.length === 0) {

            return res.status(404).json({
                message: "Contact not found"
            });

        }


        res.json({

            message: "Emergency contact deleted"

        });


    } catch (error) {

        console.error(
            "Delete contact error:",
            error
        );


        res.status(500).json({
            message: "Internal server error"
        });

    }

});


module.exports = router;