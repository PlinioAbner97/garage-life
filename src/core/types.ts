export interface OwnedCar { uid: string; modelId: string; paint: number; rims: number }
export interface GameState {
  money: number; xp: number;
  cars: OwnedCar[]; selectedUid: string | null;
  ownedPaints: number[]; ownedRims: number[];
}
