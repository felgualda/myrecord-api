import express, { type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import type { AuthRequest } from '../utils/auth.js';

const createRecordSchema = z.object({
    spotifyId: z.string().min(1, "O ID da música é obrigatório."),
    title: z.string().min(1, "O título da música é obrigatório."),
    artist: z.string().min(1, "O nome do artista da música é obrigatório."),
    comment: z.string().max(150, "O comentário não pode exceder 150 caracteres."),
    albumImage: z.string().nullable(),
    previewUrl: z.string().nullable()
});

export class RecordController {
    async getFeed(req: Request, res: Response) {
        const page = parseInt(req.query.page as string) || 1;
        const limit = 10;
        const skip = (page - 1) * limit

        try {
            const records = await prisma.record.findMany({
                take: limit,
                skip: skip,
                orderBy: {
                    registeredAt: 'desc'
                },
                include: {
                    song: true,
                    user: {
                        select: {
                            username: true,
                            nickname: true
                        }
                    }
                }
            });

            const formattedRecords = records.map((record) => {
                return {
                    id: record.id, 
                    comment: record.comment,
                    
                    user: {
                        username: record.user.username,
                        nickname: record.user.nickname,
                    },

                    song: {
                        spotifyId: record.song.spotifyId,
                        title: record.song.title,
                        artist: record.song.artist,
                        albumImage: record.song.albumImage,
                        previewUrl: record.song.previewUrl
                    }
                }
            });

            const totalRecords = await prisma.record.count();
            const hasMore = skip + records.length < totalRecords;

            return res.status(200).json({
                records: formattedRecords,
                hasMore: hasMore
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao buscar o feed.' });
        }
    }

    async create(req: AuthRequest, res: Response) {
        const userId = req.userId;

        const {spotifyId, title, artist, comment, albumImage, previewUrl } = createRecordSchema.parse(req.body);

        if (!userId || !spotifyId || !title || !artist ) {
            return res.status(400).json({ error: 'Faltam dados obrigatórios' });
        }

        try {
            const song = await prisma.song.upsert({
                where: {
                    spotifyId: spotifyId
                },
                update: {},
                create: {
                    title,
                    artist,
                    spotifyId,
                    albumImage: albumImage || null,
                    previewUrl: previewUrl || null
                }
            });

            const record = await prisma.record.create({
                data: {
                    comment: comment,
                    userId: userId,
                    songId: song.id
                },

                include: {
                    song: true,
                    user: {select: {username: true} }
                }
            });

            res.status(201).json({
                message: 'Música adicionada ao perfil com sucesso',
                record
            });
        } catch (error: any) {
            res.status(500).json({ error: 'Erro interno ao registrar a música.' });
            console.error(error);
        }
    }
}
