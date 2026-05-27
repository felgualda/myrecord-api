import express, { type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../utils/auth.js';
import type { OptionalAuthRequest } from '../utils/optionalAuth.js';

export class UserController {

    async getProfile(req: OptionalAuthRequest, res: Response) {
        const { username } = req.params;
        const currentUserId = req.userId;
        //console.log(currentUserId)

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

            let isFollowing = false;

            if (currentUserId && currentUserId !== userProfile.id) {
                const followRecord = await prisma.follow.findUnique({
                    where: {
                        followerId_followingId: {
                            followerId: currentUserId,
                            followingId: userProfile.id
                        }
                    }
                });

                isFollowing = !!followRecord;
            }

            res.json({
                ...userProfile,
                isFollowing
            });

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

    async getFollowers(req: Request, res: Response) {

    }

    async followUser(req: AuthRequest, res: Response) {
        const followerId = req.userId;
        const targetUsername = req.params.username;

        if (!followerId) return res.status(401).json({error: 'Não autorizado.' });

        try {
            const targetUser = await prisma.user.findUnique({
                where: { username: targetUsername }
            });

            if (!targetUser) {
                return res.status(404).json({error: 'Usuário não encontrado.' });
            }

            if(followerId === targetUser.id) {
                return res.status(400).json({error: 'Você não pode seguir seu próprio perfil.' });
            }

            const alreadyFollows = await prisma.follow.findUnique({
                where: {
                    followerId_followingId: {
                        followerId: followerId,
                        followingId: targetUser.id
                    }
                }
            });

            if (alreadyFollows) {
                return res.status(400).json({error: 'Você já segue este usuário.' });
            }

            await prisma.follow.create({
                data: {
                    followerId: followerId,
                    followingId: targetUser.id
                }
            });

            return res.status(200).json({message: `Você agora está seguindo ${targetUsername}`})
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro interno ao seguir o usuário.' });
        }
    }

    async unfollowUser(req: AuthRequest, res: Response) {
        const followerId = req.userId;
        const targetUsername = req.params.username;

        if (!followerId) return res.status(401).json({error: 'Não autorizado.' });

        try {
            const targetUser = await prisma.user.findUnique({
                where: { username: targetUsername }
            });

            if (!targetUser) {
                return res.status(404).json({error: 'Usuário não encontrado.' });
            }

            if(followerId === targetUser.id) {
                return res.status(400).json({error: 'Você não pode deixar seguir seu próprio perfil.' });
            }

            const followRecord = await prisma.follow.findUnique({
                where: {
                    followerId_followingId: {
                        followerId: followerId,
                        followingId: targetUser.id
                    }
                }
            });

            if (!followRecord) {
                return res.status(400).json({error: 'Você não segue este usuário.' });
            }

            await prisma.follow.delete({
                where: {
                    followerId_followingId: {
                        followerId: followerId,
                        followingId: targetUser.id
                    }
                }
            });

            return res.status(200).json({message: `Você deixou de seguir ${targetUsername}`})
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro interno ao deixar de seguir o usuário.' });
        }
    }

}
