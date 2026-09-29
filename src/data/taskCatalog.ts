import type { PartCategory } from './parts';
export type TaskKind = 'repair' | 'mod';
export interface TaskDef {
  id: string; kind: TaskKind; name: string; description: string;
  basePay: number; materialsCost: number; baseXp: number; duration: number; // segundos
  partCategory?: PartCategory; options?: string[];
  bonusFields?: Partial<Record<PartCategory, string>>;
}
export const TASKS: TaskDef[] = [
  { id: 'fix-tires', kind: 'repair', name: 'Cambiar las gomas', description: 'Sustituir neumáticos desgastados.', basePay: 90, materialsCost: 40, baseXp: 12, duration: 12 },
  { id: 'fix-suspension', kind: 'repair', name: 'Reparar la suspensión', description: 'Ajustar y reparar componentes de suspensión.', basePay: 140, materialsCost: 70, baseXp: 18, duration: 18 },
  { id: 'fix-exhaust', kind: 'repair', name: 'Cambiar el sistema de escape', description: 'Reemplazar el escape dañado.', basePay: 110, materialsCost: 55, baseXp: 15, duration: 15 },
  { id: 'fix-engine', kind: 'repair', name: 'Reparar el motor', description: 'Diagnóstico y reparación del motor.', basePay: 220, materialsCost: 120, baseXp: 30, duration: 28 },
  { id: 'fix-brakes', kind: 'repair', name: 'Sustituir los frenos', description: 'Cambiar pastillas y discos de freno.', basePay: 130, materialsCost: 60, baseXp: 16, duration: 16 },
  { id: 'fix-maintenance', kind: 'repair', name: 'Mantenimiento general', description: 'Revisión completa del vehículo.', basePay: 80, materialsCost: 30, baseXp: 10, duration: 10 },
  { id: 'mod-turbo', kind: 'mod', name: 'Instalar un turbo', description: 'Mejorar el motor para más potencia.', basePay: 260, materialsCost: 140, baseXp: 32, duration: 30, partCategory: 'engine', options: ['engine-stage1', 'engine-stage2', 'engine-stage3'] },
  { id: 'mod-rims', kind: 'mod', name: 'Cambiar los aros', description: 'Instalar aros nuevos a elección del cliente.', basePay: 130, materialsCost: 70, baseXp: 16, duration: 18, partCategory: 'rims', options: ['rims-red-sport', 'rims-blue-sport', 'rims-gold-wide'] },
  { id: 'mod-spoiler', kind: 'mod', name: 'Instalar un spoiler', description: 'Añadir un alerón trasero.', basePay: 150, materialsCost: 80, baseXp: 18, duration: 20, partCategory: 'spoiler', options: ['spoiler-wing'] },
  { id: 'mod-suspension', kind: 'mod', name: 'Modificar la suspensión', description: 'Bajar el auto y mejorar el manejo.', basePay: 170, materialsCost: 90, baseXp: 20, duration: 22, partCategory: 'suspension', options: ['susp-sport', 'susp-race'] },
  { id: 'mod-paint', kind: 'mod', name: 'Cambiar la pintura', description: 'Repintar el vehículo a elección del cliente.', basePay: 180, materialsCost: 95, baseXp: 20, duration: 24, partCategory: 'paint', options: ['paint-blue', 'paint-green', 'paint-yellow', 'paint-orange', 'paint-purple', 'paint-black'] },
  { id: 'mod-bodykit', kind: 'mod', name: 'Instalar body kit', description: 'Faldones, lip delantero y capó ventilado.', basePay: 260, materialsCost: 150, baseXp: 34, duration: 32, partCategory: 'front', options: ['front-lip'], bonusFields: { skirt: 'skirt-side', hood: 'hood-vent' } },
  { id: 'restore-parts', kind: 'repair', name: 'Reparar varias piezas', description: 'Restaurar componentes mecánicos desgastados.', basePay: 200, materialsCost: 110, baseXp: 26, duration: 26 },
  { id: 'restore-accessories', kind: 'mod', name: 'Instalar accesorios especiales', description: 'Vinilos y detalles de colección.', basePay: 190, materialsCost: 100, baseXp: 24, duration: 24, partCategory: 'stripe', options: ['stripe-white', 'stripe-black'] },
  { id: 'restore-visual', kind: 'mod', name: 'Completar restauración visual', description: 'Devolver el vehículo a un estado impecable.', basePay: 240, materialsCost: 130, baseXp: 30, duration: 30, partCategory: 'tint', options: ['tint-dark'] },
];
export const taskById = (id: string) => TASKS.find((t) => t.id === id);
