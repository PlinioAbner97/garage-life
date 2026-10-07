import Phaser from 'phaser';
import { GarageScene } from './GarageScene';
import { bridge } from './bridge';

export function createGame(parent: HTMLElement) {
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent, transparent: true,
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    scene: [GarageScene], antialias: true, roundPixels: false,
    input: { touch: { capture: true } }, disableContextMenu: true,
    banner: false,
  });
  game.events.on('ready', () => { bridge.scene = game.scene.getScene('garage') as GarageScene; });
  game.scene.getScene('garage');
  const poll = window.setInterval(() => { const s = game.scene.getScene('garage') as GarageScene; if (s && s.scene.isActive()) { bridge.scene = s; window.clearInterval(poll); } }, 200);
  return game;
}
