import type Phaser from 'phaser';

// Utilidades de efectos (Fase 4): respetan prefers-reduced-motion y se limpian solas.
export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Pulso suave de alpha para dar sensación de "vivo" a luces/letreros, sin coste de redibujado.
export function pulse(scene: Phaser.Scene, target: { alpha: number }, min = 0.82, max = 1, duration = 1600) {
  if (reducedMotion()) return;
  scene.tweens.add({ targets: target, alpha: { from: min, to: max }, duration, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
}

// Destello breve sobre el auto al pintarlo/modificarlo: confirma la acción sin afectar el dibujo base.
export function sparkle(scene: Phaser.Scene, x: number, y: number) {
  if (reducedMotion()) return;
  const g = scene.add.graphics({ x, y }).setDepth(1000);
  g.fillStyle(0xffffff, 0.9);
  g.fillCircle(0, 0, 10);
  g.setScale(0.3);
  scene.tweens.add({
    targets: g, scale: 2.4, alpha: 0, duration: 420, ease: 'Cubic.easeOut',
    onComplete: () => g.destroy(),
  });
}

// Transición suave al entrar a una escena.
export function fadeIn(scene: Phaser.Scene, color = 0x0d0f16, duration = 220) {
  if (reducedMotion()) return;
  scene.cameras.main.fadeIn(duration, (color >> 16) & 255, (color >> 8) & 255, color & 255);
}
