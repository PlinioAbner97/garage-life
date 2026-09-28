import Phaser from 'phaser';
// Canal React -> Phaser (zoom, recentrar). El estado de juego va por el store.
export const bus = new Phaser.Events.EventEmitter();
