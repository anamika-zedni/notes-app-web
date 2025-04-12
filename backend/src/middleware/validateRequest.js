const { validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Transform errors to keep only first error per field
        const formattedErrors = errors.array().reduce((acc, error) => {
            if (!acc[error.path]) {
                acc[error.path] = error.msg;
            }
            return acc;
        }, {});

        return res.status(400).json({
            success: false,
            errors: formattedErrors
        });
    }
    next();
};

module.exports = validateRequest;