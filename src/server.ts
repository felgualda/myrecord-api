import express, { type Request, type Response } from 'express';
import { prisma } from './lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import cors from 'cors';
import { authenticateToken } from './utils/auth.js'
import type {AuthRequest} from './utils/auth.js'
import './cron.js';

import { authRoutes } from './routes/auth.routes.js';
import { userRoutes } from './routes/user.routes.js';
import { spotifyRoutes } from './routes/spotify.routes.js';
import { recordRoutes } from './routes/record.routes.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3333;



app.get('/api/status', (req: Request, res: Response) => {
    res.json({
        status: 'online',
        message: 'back-end funcionando.'
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/spotify', spotifyRoutes);
app.use('/api/records', recordRoutes);

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta http://localhost:${PORT}`);
});