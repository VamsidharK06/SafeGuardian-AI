const express = require("express");
const requireAuth = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/protected", requireAuth, (req, res) => {
    res.json({
        message: "You are authenticated",
        userId: req.userId
    });
});

module.exports = router;