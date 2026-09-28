export interface CarBuild {
  paint: string; rims: string; suspension: string;
  front: string; skirt: string; spoiler: string; hood: string;
  tint: string; stripe: string; exhaust: string; engine: string;
  facing: 1 | -1;
}
export interface OwnedCar { uid: string; modelId: string; build: CarBuild }
export interface GameState {
  version: number;
  money: number; xp: number;
  cars: OwnedCar[]; selectedUid: string;
  ownedPartIds: string[];
  ownedUpgradeIds: string[];
}
