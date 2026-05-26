import { Router } from 'express';
import { RecordController } from '../controllers/RecordController.js';
import { authenticateToken } from '../utils/auth.js';

const recordRoutes = Router();
const recordController = new RecordController();

recordRoutes.get('/', recordController.getFeed);
recordRoutes.post('/', authenticateToken, recordController.create as any);

export { recordRoutes };