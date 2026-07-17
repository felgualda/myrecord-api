// RecordController atualizado: música com lista de artistas (many-to-many)
import express, { type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import type { AuthRequest } from '../utils/auth.js';
import { enrichSongData } from '../services/musicEnrichment.js';

const artistSchema = z.object({
    spotifyId: z.string().min(1, "O ID do artista é obrigatório."),
    name: z.string().min(1, "O nome do artista é obrigatório."),
});

const createRecordSchema = z.object({
    spotifyId: z.string().min(1, "O ID da música é obrigatório."),
    title: z.string().min(1, "O título da música é obrigatório."),
    comment: z.string().max(150, "O comentário não pode exceder 150 caracteres."),
    previewUrl: z.string().nullable(),

    artists: z.array(artistSchema).min(1, "A música precisa de pelo menos um artista."),

    album: z.object({
        spotifyId: z.string().min(1),
        title: z.string().min(1),
        coverImage: z.string().nullable(),
        releaseDate: z.string().nullable(),
    }).nullable(),
});

export class RecordController {
    async create(req: AuthRequest, res: Response) {
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Usuário não autenticado.' });
        }

        const { spotifyId, title, comment, previewUrl, artists, album } =
            createRecordSchema.parse(req.body);

        try {
            const artistRecords = await Promise.all(
                artists.map((artist) =>
                    prisma.artist.upsert({
                        where: { spotifyId: artist.spotifyId },
                        update: {},
                        create: {
                            name: artist.name,
                            spotifyId: artist.spotifyId,
                        }
                    })
                )
            );

            const mainArtist = artistRecords[0];

            let albumRecord = null;
            if (album) {
                albumRecord = await prisma.album.upsert({
                    where: { spotifyId: album.spotifyId },
                    update: {},
                    create: {
                        title: album.title,
                        spotifyId: album.spotifyId,
                        coverImage: album.coverImage,
                        releaseDate: album.releaseDate ? new Date(album.releaseDate) : null,
                        artistId: mainArtist.id,
                    }
                });
            }

            let song = await prisma.song.findUnique({
                where: { spotifyId }
            });

            if (!song) {
                const enrichment = await enrichSongData(title, mainArtist.name);

                song = await prisma.song.create({
                    data: {
                        title,
                        spotifyId,
                        previewUrl: previewUrl || enrichment.previewUrl,
                        rank: enrichment.rank,
                        albumId: albumRecord?.id ?? null,

                        artists: {
                            create: artistRecords.map((artist, index) => ({
                                artistId: artist.id,
                                position: index,
                            }))
                        }
                    }
                });
            }

            const record = await prisma.record.create({
                data: {
                    comment: comment,
                    userId: userId,
                    songId: song.id
                },
                include: {
                    song: {
                        include: {
                            artists: {
                                orderBy: { position: 'asc' },
                                include: { artist: true }
                            },
                            album: true,
                        }
                    },
                    user: { select: { username: true } }
                }
            });

            res.status(201).json({
                message: 'Música adicionada ao perfil com sucesso',
                record
            });
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ error: 'Erro interno ao registrar a música.' });
        }
    }

    async getFeed(req: Request, res: Response) {
        const page = parseInt(req.query.page as string) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        try {
            const records = await prisma.record.findMany({
                take: limit,
                skip: skip,
                orderBy: {
                    registeredAt: 'desc'
                },
                include: {
                    song: {
                        include: {
                            artists: {
                                orderBy: { position: 'asc' },
                                include: { artist: true }
                            },
                            album: true,
                        }
                    },
                    user: {
                        select: {
                            username: true,
                            nickname: true,
                            picture: true,
                        }
                    }
                }
            });

            const formattedRecords = records.map((record) => ({
                id: record.id,
                comment: record.comment,

                user: {
                    username: record.user.username,
                    nickname: record.user.nickname,
                    picture: record.user.picture,
                },

                song: {
                    spotifyId: record.song.spotifyId,
                    title: record.song.title,
                    // Lista de artistas na ordem correta
                    artists: record.song.artists.map((sa) => ({
                        name: sa.artist.name,
                        spotifyId: sa.artist.spotifyId,
                    })),
                    // String pronta pra exibição: "Artista A, Artista B"
                    artistNames: record.song.artists.map((sa) => sa.artist.name).join(', '),
                    albumImage: record.song.album?.coverImage ?? null,
                    previewUrl: record.song.previewUrl
                }
            }));

            const totalRecords = await prisma.record.count();
            const hasMore = skip + records.length < totalRecords;

            return res.status(200).json({
                records: formattedRecords,
                hasMore: hasMore
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao buscar o feed.' });
        }
    }
}