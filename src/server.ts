import express, { type Request, type Response } from 'express';

const app = express();
const PORT = 3333;

app.use(express.json());

app.get('/api/status', (req: Request, res: Response) => {
    res.json({
        status: 'online',
        message: 'back-end funcionando.'
    });
});

app.post('/api/songs', (req: Request, res: Response) => {
    const {title, artist} = req.body;

    if (!title || !artist) {
        return res.status(400).json({error: 'Titulo e artista obrigatórios'});
    }

    console.log(`Musica recebida: ${title} de ${artist}`);

    res.status(201).json({
        message: 'Música recebida com sucesso',
        song: {title, artist, registeredAt: new Date() }
    });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta http://localhost:${PORT}`);
});