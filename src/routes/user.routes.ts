import { Router } from 'express';
import { UserController } from '../controllers/UserController.js';

const userRoutes = Router();
const userController = new UserController();

userRoutes.get('/:username', userController.getProfile);
userRoutes.get('/:username/records', userController.getUserRecords);

export { userRoutes };