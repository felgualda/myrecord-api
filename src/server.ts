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

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta http://localhost:${PORT}`);
});