import { Router } from 'express';
import { UserController } from '../controllers/UserController.js';
import { authenticateToken } from '../utils/auth.js';

const userRoutes = Router();
const userController = new UserController();

userRoutes.get('/:username', userController.getProfile);
userRoutes.get('/:username/records', userController.getUserRecords);

userRoutes.post('/:username/follow', authenticateToken, userController.followUser as any);

export { userRoutes };