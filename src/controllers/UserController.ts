import express, { type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';

export class UserController {

    async getProfile(req: Request, res: Response) {
        const { username } = req.params;

        try{
            const userProfile = await prisma.user.findUnique({
                where: { username },
                select: {
                    id: true,
                    nickname: true,
                    picture: true,
                    createdAt: true
                }
            });

            if (!userProfile) {
                return res.status(404).json({ error: 'Usuário não encontrado.' });
            }

            res.json( userProfile );

        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar o perfil.' });
        }
    }

    async getUserRecords(req: Request, res: Response) {
        const { username } = req.params;

        try {
            const userProfile = await prisma.user.findUnique({
                where: { username },
                select: {
                    id: true,
                    nickname: true,

                    records: {
                        include: {
                            song: true
                        },
                        orderBy: {
                            registeredAt: 'desc'
                        }
                    }
                }
            });

            if (!userProfile) {
                return res.status(404).json({ error: 'Usuário não encontrado.'});
            }

            res.json(userProfile)
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar o perfil.' });
        }
    }

}
