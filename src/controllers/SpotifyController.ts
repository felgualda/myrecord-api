import express, { type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

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
                artist: item?.artists?.[0]?.name,
                albumImage: item?.album?.images?.[0]?.url || null,
                previewUrl: item?.preview_url || null,
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
}