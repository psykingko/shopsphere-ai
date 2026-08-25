const { pool } = require('../config/database');

async function getUserByEmail(email) {
    const query = `
        SELECT u.id, u.email, u.password_hash, u.active, r.name as role_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.email = $1
    `;
    const res = await pool.query(query, [email]);
    return res.rows[0] || null;
}

module.exports = {
    getUserByEmail
};
