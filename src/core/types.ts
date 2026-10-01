export interface CarBuild {
  paint: string; rims: string; suspension: string;
  front: string; skirt: string; spoiler: string; hood: string;
  tint: string; stripe: string; exhaust: string; engine: string;
  facing: 1 | -1;
}
export interface OwnedCar { uid: string; modelId: string; build: CarBuild }

// --- Sistema de clientes y trabajos ---
export type TaskQuality = 'pending' | 'perfect' | 'ok' | 'miss';
export interface JobTask {
  id: string; catalogId: string; done: boolean;
  startAt: number | null; quality: TaskQuality; chosenPartId?: string;
}
export interface JobOffer {
  id: string; archetypeId: string; clientName: string; dialogue: string;
  vehicleModelId: string; carBuild: CarBuild;
  difficulty: number; taskCatalogIds: string[];
  paymentEstimate: number; materialsCost: number; xpEstimate: number; reputationReward: number;
  unlockLevel: number;
}
export interface ActiveJob {
  id: string; archetypeId: string; clientName: string; dialogue: string;
  vehicleModelId: string; carBuild: CarBuild;
  difficulty: number; tasks: JobTask[];
  paymentEstimate: number; materialsCost: number; xpEstimate: number; reputationReward: number;
  unlockLevel: number; acceptedAt: number; status: 'active' | 'ready';
}
export interface CompletedJob {
  id: string; clientName: string; vehicleModelId: string; archetypeId: string;
  payment: number; xp: number; reputation: number; satisfaction: number; completedAt: number;
}
export type CounterType =
  | 'repairs_completed' | 'mods_installed' | 'money_earned' | 'clients_served'
  | 'jobs_completed' | 'special_clients_served' | 'restorations_completed'
  | 'zones_visited' | 'zones_unlocked' | 'vehicles_bought' | 'parts_bought'
  | 'events_attended' | 'race_registrations';

export interface UsedListing { id: string; weekKey: string; modelId: string; condition: string; price: number }
export interface RaceRegistration { id: string; eventId: string; carUid: string; registeredAt: number }

export interface GameState {
  version: number;
  money: number; xp: number; reputation: number;
  cars: OwnedCar[]; selectedUid: string;
  ownedPartIds: string[];
  ownedUpgradeIds: string[];
  offers: JobOffer[]; activeJobs: ActiveJob[]; jobHistory: CompletedJob[];
  dailyKey: string; weeklyKey: string;
  dailyCounters: Record<CounterType, number>;
  weeklyCounters: Record<CounterType, number>;
  dailyClaimed: string[]; weeklyClaimed: string[];
  // --- Ciudad ---
  unlockedZoneIds: string[]; visitedZoneIds: string[];
  usedMarketWeekKey: string; usedMarketListings: UsedListing[]; usedMarketPurchasedIds: string[];
  raceRegistrations: RaceRegistration[];
  meetupLastAttended: Record<string, string>; // eventId -> dailyKey de la última vez que se presentó un auto
}
