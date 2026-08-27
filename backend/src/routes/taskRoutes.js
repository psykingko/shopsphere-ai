const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { requireAuthentication } = require('../middleware/authentication');
const { requirePermission } = require('../middleware/authorization');

router.use(requireAuthentication);

router.get('/', requirePermission('task.read'), taskController.listTasks);
router.get('/:id', requirePermission('task.read'), taskController.getTask);

module.exports = router;
