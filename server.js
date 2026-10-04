const express = require("express");
const session = require("express-session");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 3000;


// ============================================
// MIDDLEWARE
// ============================================

app.use(express.json());
app.use(express.static("public"));

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});


// ============================================
// SESSION
// ============================================

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: false,
            maxAge: 1000 * 60 * 60
        }
    })
);


// ============================================
// ROUTES
// ============================================

const authRoutes = require("./routes/authRoutes");
const testRoutes = require("./routes/testRoutes");
const contactRoutes = require("./routes/contactRoutes");
const sosRoutes = require("./routes/sosRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/sos", sosRoutes);


// ============================================
// HOME
// ============================================

app.get("/", (req, res) => {
    res.sendFile(
        require("path").join(__dirname, "public", "index.html")
    );
});

// ============================================
// INFORMATION API
// ============================================

app.get("/api/info", (req, res) => {
    res.json({
        name: "SafeGuardian",
        purpose: "Emergency safety system",
        status: "development"
    });
});


// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log(
        `SafeGuardian running on http://localhost:${PORT}`
    );
});