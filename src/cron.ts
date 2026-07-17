import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { prisma } from './lib/prisma.js';

async function manageSOTD() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const alreadyHasSOTD = await prisma.songOfTheDay.findUnique({
      where: { date: today },
    });

    if (alreadyHasSOTD) {
      return;
    }

    const totalSongs = await prisma.song.count();
    
    if (totalSongs === 0) {
      return;
    }

    const randomSkip = Math.floor(Math.random() * totalSongs);

    const randomSong = await prisma.song.findFirst({
      skip: randomSkip,
    });

    if (!randomSong) return;

    await prisma.songOfTheDay.create({
      data: {
        date: today,
        songId: randomSong.id,
      },
    });

    console.log(`SOTD: "${randomSong.title}"`);
  } catch (error) {
    console.error('Erro ao tentar definir a música do dia:', error);
  }
}

cron.schedule('0 0 * * *', async () => {
  console.log('Cron acionado: Virada de dia detectada.');
  await manageSOTD();
});

console.log('Servidor inicializado. Verificando status da música do dia...');
manageSOTD();