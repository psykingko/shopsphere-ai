const { pool } = require('../config/database');

/**
 * Retrieves a list of tasks with optional filtering and pagination.
 */
async function getTasks({ status, priority, creatorType, relatedEntityType, assignedUserId }, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    // We join task_assignments to filter by assigned_user_id if requested
    let query = `
        SELECT t.id, t.business_id, t.title, t.description, t.priority, t.status, 
               t.creator_type, t.related_entity_type, t.related_entity_id
        FROM tasks t
    `;
    
    if (assignedUserId) {
        query += `
            JOIN task_assignments ta ON t.id = ta.task_id AND ta.active_flag = true
        `;
    }

    query += ` WHERE 1=1`;
    const params = [];
    let paramIndex = 1;

    if (status) {
        query += ` AND t.status = $${paramIndex++}`;
        params.push(status);
    }
    if (priority) {
        query += ` AND t.priority = $${paramIndex++}`;
        params.push(priority);
    }
    if (creatorType) {
        query += ` AND t.creator_type = $${paramIndex++}`;
        params.push(creatorType);
    }
    if (relatedEntityType) {
        query += ` AND t.related_entity_type = $${paramIndex++}`;
        params.push(relatedEntityType);
    }
    if (assignedUserId) {
        query += ` AND ta.user_id = $${paramIndex++}`;
        params.push(assignedUserId);
    }

    const countQuery = query.replace(/SELECT .*? FROM/, 'SELECT COUNT(DISTINCT t.id) FROM');
    const totalRes = await pool.query(countQuery, params);
    const total = parseInt(totalRes.rows[0].count, 10);

    query += ` ORDER BY t.id DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const res = await pool.query(query, params);
    
    return {
        data: res.rows,
        total,
        page,
        limit
    };
}

/**
 * Retrieves a task by its ID, along with its active assignment (if any).
 */
async function getTaskById(taskId) {
    const taskRes = await pool.query(`
        SELECT id, business_id, title, description, priority, status, 
               creator_type, related_entity_type, related_entity_id
        FROM tasks 
        WHERE id = $1
    `, [taskId]);
    
    if (taskRes.rowCount === 0) return null;
    const task = taskRes.rows[0];

    // Fetch active assignments (safely omitting sensitive user data, exposing only IDs and timestamps)
    const assignmentRes = await pool.query(
        `SELECT id, user_id, assigned_at FROM task_assignments WHERE task_id = $1 AND active_flag = true`,
        [taskId]
    );
    task.active_assignments = assignmentRes.rows;
    
    return task;
}

module.exports = {
    getTasks,
    getTaskById
};
