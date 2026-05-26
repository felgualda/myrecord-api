import express, { type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const createUserSchema = z.object({
    username: z.string().min(4).regex(/^[a-z0-9_]+$/, "Username inválido."),
    nickname: z.string().min(1, "O nome é obrigatório."),
    email: z.string().email("Email inválido."),
    password: z.string().min(8, "A senha precisa ter no mínimo 8 caracteres.")
});

export class AuthController {
    async signup(req: Request, res: Response) {
        try {
            const { username, nickname, email, password } = createUserSchema.parse(req.body);

            const existingUser = await prisma.user.findFirst({
                where: { 
                    OR: [
                        { email: email },
                        { username: username }
                    ]
                }
            });

            if (existingUser) {
                if (existingUser.email === email) {
                    return res.status(409).json({ error: "Este email já está em uso." });
                }
                if (existingUser.username === username) {
                    return res.status(409).json({ error: "Este username já está em uso." });
                }
            }

            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);

            const newUser = await prisma.user.create({
                data: {
                    username,
                    nickname,
                    email,
                    password: hash,
                }
            });

            res.status(201).json({
                message: 'Usuário criado com sucesso',
                user: {
                    id: newUser.id,
                    username: newUser.username,
                    nickname: newUser.nickname,
                    email: newUser.email
                }
            });
        } catch (error: any) {

            if (error instanceof z.ZodError) {
                return res.status(400).json({ errors: error.flatten().fieldErrors })
            }
            console.error(error);
            res.status(500).json({error: 'Erro ao criar usuário.'})
        }
    }

    async login(req: Request, res: Response) {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Formulário não preenchido." });
        }

        try {
            const user = await prisma.user.findUnique({ where: { email } });
            
            if (!user) {
                return res.status(401).json({ error: 'Credenciais inválidas.' });
            }

            const isPasswordValid = await bcrypt.compare(password,user.password);
            if (!isPasswordValid) {
                return res.status(401).json({ error: 'Credenciais inválidas.' });
            }

            const token = jwt.sign(
                {id : user.id, name: user.username },
                process.env['JWT_SECRET'] as string,
                { expiresIn: '7d' }
            );

            res.json({
                message: "Login bem-sucedido!",
                username: user.username,
                token: token
            });
        } catch (error) {
            res.status(500).json({ error: 'Erro ao fazer login.' });
        }
    }
}