const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');

async function login(req, res, next) {
    try {
        const { email, password } = req.body;

        // 1. Locate the appropriate identity
        const user = await userRepository.getUserByEmail(email);
        
        if (!user) {
            return res.status(401).json({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Invalid credentials',
                    correlationId: req.correlationId
                }
            });
        }

        if (!user.active) {
            return res.status(401).json({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Account is deactivated',
                    correlationId: req.correlationId
                }
            });
        }

        // 2. Verify credentials
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!passwordMatch) {
            return res.status(401).json({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Invalid credentials',
                    correlationId: req.correlationId
                }
            });
        }

        // 3. Establish secure authentication state (JWT)
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error('JWT_SECRET environment variable is missing');
        }

        const payload = {
            principal_type: 'USER',
            principal_id: user.id,
            role: user.role_name
        };

        const token = jwt.sign(payload, jwtSecret, { expiresIn: '12h' });

        // 4. Set HttpOnly Cookie
        const isProd = process.env.NODE_ENV === 'production';
        res.cookie('token', token, {
            httpOnly: true,
            secure: isProd, // Must be true in production, false for local HTTP
            sameSite: 'strict',
            maxAge: 12 * 60 * 60 * 1000, // 12 hours
            path: '/'
        });

        // 5. Return appropriate authenticated response
        res.json({
            message: 'Authentication successful',
            principal: {
                principal_type: 'USER',
                principal_id: user.id,
                role: user.role_name
            },
            correlation_id: req.correlationId
        });

    } catch (error) {
        next(error);
    }
}

async function session(req, res, next) {
    try {
        // req.principal is populated by requireAuthentication middleware
        res.json({
            authenticated: true,
            principal: req.principal,
            correlation_id: req.correlationId
        });
    } catch (error) {
        next(error);
    }
}

async function logout(req, res, next) {
    try {
        const isProd = process.env.NODE_ENV === 'production';
        res.cookie('token', '', {
            httpOnly: true,
            secure: isProd,
            sameSite: 'strict',
            expires: new Date(0), // Expire immediately
            path: '/'
        });

        res.json({
            message: 'Logout successful',
            correlation_id: req.correlationId
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    login,
    session,
    logout
};
