import express, { type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';

async function getSpotifyToken() {
    const clientId = process.env["SPOTIFY_CLIENT_ID"];
    const clientSecret = process.env["SPOTIFY_CLIENT_SECRET"];

    const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${authString}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    });

    const data = await response.json();
    return data.access_token;
}

export class SpotifyController {
    async search(req: Request, res: Response) {
        const query = req.query.q as string;

        if (!query) {
            return res.status(400).json({ error: 'Termo de busca não enviado'});
        }

        try {
            const token = await getSpotifyToken();

            const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            const tracks = data.tracks.items.map((item: any) => ({
                spotifyId: item?.id,
                title: item?.name,
                previewUrl: item?.preview_url || null,

                artists: (item?.artists ?? []).map((a: any) => ({
                    spotifyId: a?.id || null,
                    name: a?.name,
                })),

                album: {
                    spotifyId: item?.album?.id || null,
                    title: item?.album?.name || null,
                    coverImage: item?.album?.images?.[0]?.url || null,
                    releaseDate: item?.album?.release_date || null,
                },
            }));

            res.json({
                message: 'Busca concluída com sucesso',
                results: tracks
            })
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao se comunicar com API do Spotify.' });
        }
    }

    async songOfTheDay (req: Request, res: Response) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const songOfTheDayRelation = await prisma.songOfTheDay.findUnique({
            where: { 
                date: today 
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
                }
            }
            });

            if (!songOfTheDayRelation) {
            return res.status(404).json({ 
                message: 'Nenhuma música do dia encontrada para a data de hoje.' 
            });
            }

            const song = songOfTheDayRelation.song;

            return res.status(200).json({
                spotifyId: song.spotifyId,
                title: song.title,
                previewUrl: song.previewUrl,
                artists: song.artists.map((sa) => ({
                    spotifyId: sa.artist.spotifyId,
                    name: sa.artist.name,
                })),
                album: song.album ? {
                    spotifyId: song.album.spotifyId,
                    title: song.album.title,
                    coverImage: song.album.coverImage,
                    releaseDate: song.album.releaseDate ? song.album.releaseDate.toISOString() : null,
                } : null,
            });

        } catch (error) {
            console.error('Erro ao buscar a música do dia:', error);
            return res.status(500).json({ 
            message: 'Erro interno do servidor ao buscar a música do dia.' 
            });
        }
    }
}