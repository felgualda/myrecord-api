import { Router } from 'express';
import { SpotifyController } from '../controllers/SpotifyController.js';

const spotifyRoutes = Router();
const spotifyController = new SpotifyController();

spotifyRoutes.get('/search', spotifyController.search);
spotifyRoutes.get('/sotd', spotifyController.songOfTheDay);

export { spotifyRoutes };