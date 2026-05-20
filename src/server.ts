import express, { type Request, type Response } from 'express';
import { prisma } from './lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import cors from 'cors';
import { authenticateToken } from './utils/auth.js'
import type {AuthRequest} from './utils/auth.js'

const app = express();
app.use(cors());
app.use(express.json());

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

app.get('/api/users/:username/records', async (req: Request, res: Response) => {
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
});

const createUserSchema = z.object({
    username: z.string().min(4).regex(/^[a-z0-9_]+$/, "Username inválido."),
    nickname: z.string().min(1, "O nome é obrigatório."),
    email: z.string().email("Email inválido."),
    password: z.string().min(8, "A senha precisa ter no mínimo 8 caracteres.")
});

app.post('/api/users/signup', async (req: Request, res: Response) => {
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
});

app.post('/api/login', async (req: Request, res: Response) => {
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
            token: token
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao fazer login.' });
    }
});

app.get('/api/records', async (req: Request, res: Response) => {
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

        const totalRecords = await prisma.record.count();
        const hasMore = skip + records.length < totalRecords;

        res.status(200).json({ records, hasMore }) 
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar o feed.' });
    }
});

app.post('/api/records', authenticateToken, async (req: AuthRequest, res: Response) => {

    const userId = req.userId;

    const {spotifyId, title, artist, albumImage, previewUrl } = req.body;

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
})

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta http://localhost:${PORT}`);
});