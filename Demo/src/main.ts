import './styles.css';
import { Game } from './core/Game';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
const uiRoot = document.querySelector<HTMLDivElement>('#ui-root');

if (!canvas || !uiRoot) {
  throw new Error('Missing canvas or UI root.');
}

const game = new Game(canvas, uiRoot);
void game.start();

window.addEventListener('beforeunload', () => {
  game.save();
});
