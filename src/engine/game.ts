import Phaser from 'phaser';
import { GarageScene } from './GarageScene';
import { bridge } from './bridge';

import { dpr } from './dpr';

export function createGame(parent: HTMLElement) {
  const size = () => ({ w: Math.max(1, Math.round(parent.clientWidth * dpr())), h: Math.max(1, Math.round(parent.clientHeight * dpr())) });
  const s0 = size();
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent, transparent: true,
    // Canvas a (css px × dpr) y mostrado a tamaño CSS con zoom = 1/dpr
    scale: { mode: Phaser.Scale.NONE, width: s0.w, height: s0.h, zoom: 1 / dpr() },
    scene: [GarageScene], antialias: true, roundPixels: false,
    input: { touch: { capture: true } }, disableContextMenu: true,
    banner: false,
  });
  const fit = () => {
    const { w, h } = size(); const z = 1 / dpr();
    if (game.scale.zoom !== z) game.scale.setZoom(z);
    if (game.scale.width !== w || game.scale.height !== h) game.scale.resize(w, h);
  };
  window.addEventListener('resize', fit); window.addEventListener('orientationchange', () => setTimeout(fit, 250));
  window.visualViewport?.addEventListener('resize', fit);
  if ('ResizeObserver' in window) new ResizeObserver(fit).observe(parent);
  game.events.on('ready', () => { bridge.scene = game.scene.getScene('garage') as GarageScene; });
  game.scene.getScene('garage');
  const poll = window.setInterval(() => { const s = game.scene.getScene('garage') as GarageScene; if (s && s.scene.isActive()) { bridge.scene = s; window.clearInterval(poll); } }, 200);
  return game;
}
