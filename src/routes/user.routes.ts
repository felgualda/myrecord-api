import { Router } from 'express';
import { UserController } from '../controllers/UserController.js';
import { authenticateToken } from '../utils/auth.js';
import { optionalAuth } from '../utils/optionalAuth.js';

const userRoutes = Router();
const userController = new UserController();

userRoutes.get('/:username', optionalAuth, userController.getProfile);
userRoutes.get('/:username/records', userController.getUserRecords);

userRoutes.post('/:username/follow', authenticateToken, userController.followUser as any);
userRoutes.post('/:username/unfollow', authenticateToken, userController.unfollowUser as any);

userRoutes.patch('/updateProfile', authenticateToken, userController.updateProfile as any);

export { userRoutes };