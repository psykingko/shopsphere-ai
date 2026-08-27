const taskRepository = require('../repositories/taskRepository');
const resourcePolicy = require('../policies/resourcePolicy');

/**
 * Get a list of tasks for a given principal.
 */
async function getTasks(principal, filters = {}, page = 1, limit = 10) {
    // If the principal is a SUPPORT_AGENT, strictly limit their view to tasks assigned to them.
    // OPERATIONS, SUPPORT_MANAGER, and ADMIN can view all tasks (subject to optional filters).
    if (principal.role === 'SUPPORT_AGENT') {
        filters.assignedUserId = principal.principal_id;
    }

    return await taskRepository.getTasks(filters, page, limit);
}

/**
 * Get a specific task by ID, checking authorization.
 */
async function getTaskById(principal, taskId) {
    // Controller already checks RBAC (task.read).
    // Here we enforce resource authorization (e.g., SUPPORT_AGENT can only see their own tasks).
    const isAuthorized = await resourcePolicy.canAccessTask(principal, taskId);
    if (!isAuthorized) {
        throw { code: 'FORBIDDEN', message: 'You do not have permission to access this task.' };
    }

    const task = await taskRepository.getTaskById(taskId);
    if (!task) {
        throw { code: 'NOT_FOUND', message: 'Task not found.' };
    }

    return task;
}

module.exports = {
    getTasks,
    getTaskById
};
