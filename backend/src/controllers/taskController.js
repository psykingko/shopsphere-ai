const taskService = require('../services/taskService');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_STATUSES = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'];
const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

async function listTasks(req, res) {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        
        if (page < 1 || limit < 1) {
            return res.status(400).json({
                error: { code: 'VALIDATION_FAILED', message: 'Page and limit must be positive integers.' },
                correlation_id: req.correlationId
            });
        }

        const filters = {
            status: req.query.status,
            priority: req.query.priority,
            creatorType: req.query.creator_type,
            relatedEntityType: req.query.related_entity_type,
            assignedUserId: req.query.assigned_user_id
        };

        if (filters.status && !VALID_STATUSES.includes(filters.status)) {
            return res.status(400).json({
                error: { code: 'VALIDATION_FAILED', message: 'Invalid status filter.' },
                correlation_id: req.correlationId
            });
        }
        if (filters.priority && !VALID_PRIORITIES.includes(filters.priority)) {
            return res.status(400).json({
                error: { code: 'VALIDATION_FAILED', message: 'Invalid priority filter.' },
                correlation_id: req.correlationId
            });
        }
        if (filters.assignedUserId && !UUID_REGEX.test(filters.assignedUserId)) {
            return res.status(400).json({
                error: { code: 'VALIDATION_FAILED', message: 'Invalid assigned_user_id filter.' },
                correlation_id: req.correlationId
            });
        }

        const result = await taskService.getTasks(req.principal, filters, page, limit);

        res.status(200).json({
            data: result.data,
            total: result.total,
            page: result.page,
            limit: result.limit,
            correlation_id: req.correlationId
        });
    } catch (err) {
        console.error('List Tasks Error:', err);
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'An internal server error occurred.' },
            correlation_id: req.correlationId
        });
    }
}

async function getTask(req, res) {
    try {
        const { id } = req.params;
        if (!UUID_REGEX.test(id)) {
            return res.status(400).json({
                error: { code: 'VALIDATION_FAILED', message: 'Invalid task ID format.' },
                correlation_id: req.correlationId
            });
        }

        const task = await taskService.getTaskById(req.principal, id);

        res.status(200).json({
            data: task,
            correlation_id: req.correlationId
        });
    } catch (err) {
        if (err.code === 'FORBIDDEN') {
            return res.status(403).json({
                error: { code: 'FORBIDDEN', message: err.message },
                correlation_id: req.correlationId
            });
        }
        if (err.code === 'NOT_FOUND') {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: err.message },
                correlation_id: req.correlationId
            });
        }
        console.error('Get Task Error:', err);
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'An internal server error occurred.' },
            correlation_id: req.correlationId
        });
    }
}

module.exports = {
    listTasks,
    getTask
};
