function requireAuth(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({
            message: "Authentication required"
        });
    }

    req.userId = req.session.userId;

    next();
}

module.exports = requireAuth;