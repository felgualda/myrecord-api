import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';

const authRoutes = Router();
const authController = new AuthController();

authRoutes.post('/signup', authController.signup);
authRoutes.post('/login', authController.login);

export { authRoutes };