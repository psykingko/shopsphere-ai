function validateLoginRequest(req, res, next) {
    const { email, password } = req.body;
    
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({
            error: {
                code: 'VALIDATION_FAILED',
                message: 'A valid email is required.',
                correlationId: req.correlationId
            }
        });
    }

    if (!password || typeof password !== 'string') {
        return res.status(400).json({
            error: {
                code: 'VALIDATION_FAILED',
                message: 'Password is required.',
                correlationId: req.correlationId
            }
        });
    }

    next();
}

module.exports = {
    validateLoginRequest
};
