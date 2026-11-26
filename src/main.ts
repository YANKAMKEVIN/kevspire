import '@fontsource/fraunces/700.css';
import '@fontsource/fraunces/900.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import './ui/styles.css';
import './ui/hud.css';
import { App, readLaunchOptions } from './app';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ui = document.getElementById('ui') as HTMLElement;
const app = new App(canvas, ui, readLaunchOptions(location.search));
void app.start();
