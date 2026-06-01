export type RegionState =
  | 'unaffected'
  | 'latent'
  | 'spreading'
  | 'severe'
  | 'controlled'
  | 'clearing';

export type RegionCategory =
  | 'capital'
  | 'portCity'
  | 'forest'
  | 'mountain'
  | 'farmland'
  | 'industrial'
  | 'techCampus'
  | 'airportHub'
  | 'islandChain'
  | 'researchOutpost';

export type RegionTechLevel = 'low' | 'standard' | 'industrial' | 'advanced';

export type TransportHub = 'port' | 'airport' | 'rail' | 'road' | 'seaRoute';

export interface RegionMapPosition {
  x: number;
  y: number;
  size: number;
}

export interface RegionCorruptionProfile {
  dotDensity: number;
  overlayIntensity: number;
}

export interface RegionConfig {
  id: string;
  displayName: string;
  category: RegionCategory;
  techLevel: RegionTechLevel;
  population: number;
  initialState: RegionState;
  resistance: number;
  restoreDifficulty: number;
  resourceYield: number;
  transportHubs: TransportHub[];
  mapPosition: RegionMapPosition;
  corruptionProfile: RegionCorruptionProfile;
  neighbors: string[];
}

export interface RegionConfigFile {
  version: number;
  regions: RegionConfig[];
}

export interface UpgradeConfig {
  id: string;
  displayName: string;
  maxLevel: number;
  baseCost: number;
  costGrowth: number;
  effects: Partial<UpgradeEffects>;
}

export interface UpgradeConfigFile {
  version: number;
  upgrades: UpgradeConfig[];
}

export interface UpgradeEffects {
  restorePowerBonus: number;
  spreadReduction: number;
  resourceYieldBonus: number;
}

export interface EventChoiceConfig {
  id: string;
  label: string;
  cost?: number;
  effects: EventEffects;
}

export interface EventConfig {
  id: string;
  displayName: string;
  weight: number;
  minDay: number;
  choices: EventChoiceConfig[];
}

export interface EventConfigFile {
  version: number;
  events: EventConfig[];
}

export interface EventEffects {
  globalRestoreProgress?: number;
  globalRisk?: number;
  resourceGain?: number;
  spreadReductionTurns?: number;
}

export interface RegionRuntimeState {
  state: RegionState;
  restoreProgress: number;
  controlTurns: number;
  trafficControlTurns: number;
}

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  hapticsEnabled: boolean;
}

export interface GameState {
  version: number;
  day: number;
  resources: number;
  globalRisk: number;
  globalRestoreProgress: number;
  spreadReductionTurns: number;
  regionStates: Record<string, RegionRuntimeState>;
  upgradeLevels: Record<string, number>;
  completedTutorialSteps: string[];
  settings: GameSettings;
  lastEventId?: string;
  result?: GameResult;
}

export type GameResult = 'playing' | 'victory' | 'failure';

export interface GameConfigBundle {
  regions: RegionConfigFile;
  upgrades: UpgradeConfigFile;
  events: EventConfigFile;
}
