const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
    try {
        // Get token from cookie or header
        const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                errors: {
                    auth: 'Authentication required'
                }
            });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            next();
        } catch (err) {
            return res.status(401).json({
                success: false,
                errors: {
                    auth: 'Invalid token'
                }
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            errors: {
                server: 'Authentication error'
            }
        });
    }
};

module.exports = auth;