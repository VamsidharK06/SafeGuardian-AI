const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../config/db");

const router = express.Router();


// ============================================
// REGISTER
// ============================================

router.post("/register", async (req, res) => {
    try {

        const {
            name,
            email,
            phone,
            password
        } = req.body;


        // Validate input
        if (!name || !email || !phone || !password) {

            return res.status(400).json({
                message:
                    "Name, email, phone and password are required"
            });
        }


        // Password validation
        if (password.length < 6) {

            return res.status(400).json({
                message:
                    "Password must be at least 6 characters long"
            });
        }


        // Check existing user
        const existingUser = await pool.query(
            `SELECT id
             FROM users
             WHERE email = $1 OR phone = $2`,
            [
                email,
                phone
            ]
        );


        if (existingUser.rows.length > 0) {

            return res.status(409).json({
                message:
                    "Email or phone number already registered"
            });
        }


        // Hash password
        const passwordHash =
            await bcrypt.hash(password, 10);


        // Insert user
        const result = await pool.query(
            `INSERT INTO users
                (name, email, phone, password_hash)
             VALUES
                ($1, $2, $3, $4)
             RETURNING
                id,
                name,
                email,
                phone,
                created_at`,
            [
                name,
                email,
                phone,
                passwordHash
            ]
        );


        res.status(201).json({

            message:
                "Registration successful",

            user:
                result.rows[0]
        });


    } catch (error) {

        console.error(
            "Registration error:",
            error
        );


        res.status(500).json({
            message:
                "Internal server error"
        });
    }
});


// ============================================
// LOGIN
// ============================================

router.post("/login", async (req, res) => {
    try {

        const {
            email,
            password
        } = req.body;


        // Validate input
        if (!email || !password) {

            return res.status(400).json({
                message:
                    "Email and password are required"
            });
        }


        // Find user
        const result = await pool.query(
            `SELECT
                id,
                name,
                email,
                phone,
                password_hash
             FROM users
             WHERE email = $1`,
            [
                email
            ]
        );


        if (result.rows.length === 0) {

            return res.status(401).json({
                message:
                    "Invalid email or password"
            });
        }


        const user =
            result.rows[0];


        // Compare password
        const passwordMatches =
            await bcrypt.compare(
                password,
                user.password_hash
            );


        if (!passwordMatches) {

            return res.status(401).json({
                message:
                    "Invalid email or password"
            });
        }


        // Create authenticated session
        req.session.userId =
            user.id;


        // Return user information
        res.json({

            message:
                "Login successful",

            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone
            }
        });


    } catch (error) {

        console.error(
            "Login error:",
            error
        );


        res.status(500).json({
            message:
                "Internal server error"
        });
    }
});


// ============================================
// CURRENT AUTHENTICATED USER
// ============================================

router.get("/me", async (req, res) => {
    try {

        // Check session
        if (!req.session.userId) {

            return res.status(401).json({
                message:
                    "Authentication required"
            });
        }


        // Get user from database
        const result = await pool.query(
            `SELECT
                id,
                name,
                email,
                phone
             FROM users
             WHERE id = $1`,
            [
                req.session.userId
            ]
        );


        if (result.rows.length === 0) {

            return res.status(401).json({
                message:
                    "User not found"
            });
        }


        res.json({
            user:
                result.rows[0]
        });


    } catch (error) {

        console.error(
            "Get current user error:",
            error
        );


        res.status(500).json({
            message:
                "Internal server error"
        });
    }
});


// ============================================
// LOGOUT
// ============================================

router.post("/logout", (req, res) => {

    req.session.destroy((error) => {

        if (error) {

            console.error(
                "Logout error:",
                error
            );


            return res.status(500).json({
                message:
                    "Unable to logout"
            });
        }


        // Remove session cookie
        res.clearCookie(
            "connect.sid"
        );


        res.json({
            message:
                "Logout successful"
        });
    });
});


// ============================================
// EXPORT ROUTER
// ============================================

module.exports = router;