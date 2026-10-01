import Phaser from 'phaser';
import { CityScene } from './CityScene';
import { GarageScene } from './GarageScene';
export function createGame(parent: HTMLElement) {
  return new Phaser.Game({
    type: Phaser.AUTO, parent, backgroundColor: '#11141c',
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth || 800, height: parent.clientHeight || 600 },
    scene: [GarageScene, CityScene], render: { antialias: true, powerPreference: 'high-performance' },
    fps: { target: 60 }, disableContextMenu: true,
  });
}
