import express, { type Request, type Response } from 'express';
import { prisma } from './lib/prisma.js';

const app = express();
const PORT = 3333;

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

app.use(express.json());

app.get('/api/status', (req: Request, res: Response) => {
    res.json({
        status: 'online',
        message: 'back-end funcionando.'
    });
});

app.get('/api/spotify/search', async (req: Request, res: Response) => {
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
            previewUrl: item?.preview_url || null
        }));

        res.json({
            message: 'Busca concluída com sucesso',
            results: tracks
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao se comunicar com API do Spotify.' });
    }
});

app.post('/api/users', async (req: Request, res: Response) => {
    const {name, email, password } = req.body

    if (!name || !email || !password) {
        return res.status(400).json({error: 'Nome, email e senha obrigatórios'});
    }

    try {
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password,
            }
        });

        res.status(201).json({
            message: 'Usuário criado com sucesso',
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({error: 'Erro ao criar usuário.'})
    }
});

app.post('/api/records', async (req: Request, res: Response) => {
    const { userId, spotifyId, title, artist, albumImage, previewUrl } = req.body;

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
                userId: userId,
                songId: song.id
            },

            include: {
                song: true,
                user: {select: {name: true} }
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
})

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta http://localhost:${PORT}`);
});