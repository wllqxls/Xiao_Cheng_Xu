import type {
  GameState,
  RegionCategory,
  RegionConfig,
  RegionConfigFile,
  RegionState,
  TransportHub,
  UpgradeConfigFile,
} from '../types/GameTypes';
import { getCombinedUpgradeEffects } from './UpgradeSystem';

const STATE_RISK_WEIGHT: Record<RegionState, number> = {
  unaffected: 0,
  latent: 0.15,
  spreading: 0.45,
  severe: 0.8,
  controlled: 0.05,
  clearing: 0.2,
};

const CATEGORY_EXPOSURE: Record<RegionCategory, number> = {
  capital: 1.25,
  portCity: 1.22,
  forest: 0.9,
  mountain: 0.82,
  farmland: 1,
  industrial: 1.12,
  techCampus: 0.95,
  airportHub: 1.28,
  islandChain: 1.05,
  researchOutpost: 0.88,
};

const CATEGORY_PRESSURE: Record<RegionCategory, number> = {
  capital: 1.18,
  portCity: 1.28,
  forest: 0.86,
  mountain: 0.82,
  farmland: 0.95,
  industrial: 1.12,
  techCampus: 0.92,
  airportHub: 1.32,
  islandChain: 1.1,
  researchOutpost: 0.86,
};

const HUB_EXPOSURE: Record<TransportHub, number> = {
  port: 0.1,
  airport: 0.14,
  rail: 0.07,
  road: 0.04,
  seaRoute: 0.09,
};

export function restoreRegion(
  state: GameState,
  regionConfig: RegionConfigFile,
  upgradeConfig: UpgradeConfigFile,
  regionId: string,
): boolean {
  const region = regionConfig.regions.find((item) => item.id === regionId);
  const runtime = state.regionStates[regionId];

  if (!region || !runtime || runtime.state === 'unaffected') {
    return false;
  }

  const effects = getCombinedUpgradeEffects(state, upgradeConfig);
  const cost = getRestoreCost(region.restoreDifficulty);

  if (state.resources < cost) {
    return false;
  }

  state.resources -= cost;
  runtime.state = 'clearing';
  runtime.restoreProgress = Math.min(1, runtime.restoreProgress + 0.35 + effects.restorePowerBonus);

  if (runtime.restoreProgress >= 1) {
    runtime.state = 'unaffected';
    runtime.restoreProgress = 1;
  }

  return true;
}

export function controlRegion(
  state: GameState,
  regionConfig: RegionConfigFile,
  regionId: string,
): boolean {
  const region = regionConfig.regions.find((item) => item.id === regionId);
  const runtime = state.regionStates[regionId];

  if (!region || !runtime || runtime.state === 'unaffected') {
    return false;
  }

  const cost = getControlCost(region.restoreDifficulty);

  if (state.resources < cost) {
    return false;
  }

  state.resources -= cost;
  runtime.state = 'controlled';
  runtime.controlTurns = 2;

  return true;
}

export function controlTrafficHub(
  state: GameState,
  regionConfig: RegionConfigFile,
  regionId: string,
): boolean {
  const region = regionConfig.regions.find((item) => item.id === regionId);
  const runtime = state.regionStates[regionId];

  if (!region || !runtime || !hasTrafficControlTarget(region)) {
    return false;
  }

  const cost = getTrafficControlCost(region);

  if (state.resources < cost) {
    return false;
  }

  state.resources -= cost;
  runtime.trafficControlTurns = 3;

  return true;
}

export function advanceRegionRisks(
  state: GameState,
  regionConfig: RegionConfigFile,
  upgradeConfig: UpgradeConfigFile,
): void {
  const effects = getCombinedUpgradeEffects(state, upgradeConfig);
  const spreadReduction =
    effects.spreadReduction + (state.spreadReductionTurns > 0 ? 0.2 : 0);
  const nextStates = new Map<string, 'latent' | 'spreading' | 'severe'>();

  for (const region of regionConfig.regions) {
    const runtime = state.regionStates[region.id];

    if (!runtime) {
      continue;
    }

    if (runtime.state === 'controlled') {
      runtime.controlTurns -= 1;
      if (runtime.controlTurns <= 0) {
        runtime.state = 'latent';
      }
      continue;
    }

    if (runtime.state === 'clearing') {
      runtime.restoreProgress = Math.min(1, runtime.restoreProgress + 0.1);
      if (runtime.restoreProgress >= 1) {
        runtime.state = 'unaffected';
      }
      continue;
    }

    if (runtime.state === 'spreading' || runtime.state === 'severe') {
      for (const neighborId of region.neighbors) {
        const neighbor = regionConfig.regions.find((item) => item.id === neighborId);
        const neighborRuntime = state.regionStates[neighborId];

        if (!neighbor || !neighborRuntime || neighborRuntime.state !== 'unaffected') {
          continue;
        }

        const pressure = getSpreadPressure(region, runtime.state, runtime.trafficControlTurns > 0);
        const exposure = getRegionExposure(neighbor, neighborRuntime.trafficControlTurns > 0);
        const chance = pressure * exposure * (1 - neighbor.resistance) * (1 - spreadReduction);

        if (chance > 0.08) {
          nextStates.set(neighborId, 'latent');
        }
      }
    }

    if (runtime.state === 'latent' && shouldLatentRegionWorsen(region)) {
      nextStates.set(region.id, 'spreading');
    }

    if (runtime.state === 'spreading' && shouldSpreadingRegionBecomeSevere(region)) {
      nextStates.set(region.id, 'severe');
    }
  }

  for (const [regionId, nextState] of nextStates) {
    const runtime = state.regionStates[regionId];
    if (runtime && runtime.state !== 'controlled' && runtime.state !== 'clearing') {
      runtime.state = nextState;
    }
  }

  for (const regionId of Object.keys(state.regionStates)) {
    const runtime = state.regionStates[regionId];
    if (runtime.trafficControlTurns > 0) {
      runtime.trafficControlTurns -= 1;
    }
  }

  if (state.spreadReductionTurns > 0) {
    state.spreadReductionTurns -= 1;
  }
}

export function recalculateGlobalRisk(state: GameState, regionConfig: RegionConfigFile): number {
  const totalPopulation = regionConfig.regions.reduce((total, region) => total + region.population, 0);

  if (totalPopulation <= 0) {
    state.globalRisk = 0;
    return state.globalRisk;
  }

  const weightedRisk = regionConfig.regions.reduce((total, region) => {
    const runtime = state.regionStates[region.id];
    const stateWeight = runtime ? STATE_RISK_WEIGHT[runtime.state] : 0;

    return total + region.population * stateWeight;
  }, 0);

  state.globalRisk = Math.min(1, Math.max(0, weightedRisk / totalPopulation));
  return state.globalRisk;
}

function getSpreadPressure(region: RegionConfig, state: RegionState, trafficControlled: boolean): number {
  const basePressure = state === 'severe' ? 0.38 : 0.24;
  const pressure = basePressure * CATEGORY_PRESSURE[region.category] * getTransportPressure(region);
  return trafficControlled ? pressure * 0.7 : pressure;
}

function getRegionExposure(region: RegionConfig, trafficControlled = false): number {
  const hubExposure = region.transportHubs.reduce((total, hub) => total + HUB_EXPOSURE[hub], 0);
  const exposure = CATEGORY_EXPOSURE[region.category] + hubExposure;
  return trafficControlled ? exposure * 0.76 : exposure;
}

function getTransportPressure(region: RegionConfig): number {
  const hasAirOrSea = region.transportHubs.indexOf('airport') >= 0
    || region.transportHubs.indexOf('port') >= 0
    || region.transportHubs.indexOf('seaRoute') >= 0;
  const hasGround = region.transportHubs.indexOf('rail') >= 0 || region.transportHubs.indexOf('road') >= 0;

  if (hasAirOrSea) {
    return hasGround ? 1.18 : 1.12;
  }

  return hasGround ? 1.05 : 1;
}

function hasTrafficControlTarget(region: RegionConfig): boolean {
  return region.transportHubs.indexOf('airport') >= 0
    || region.transportHubs.indexOf('port') >= 0
    || region.transportHubs.indexOf('seaRoute') >= 0;
}

function shouldLatentRegionWorsen(region: RegionConfig): boolean {
  const threshold = 0.55 + Math.max(0, getRegionExposure(region) - 1) * 0.08;
  return region.resistance < threshold;
}

function shouldSpreadingRegionBecomeSevere(region: RegionConfig): boolean {
  const threshold = 0.4 + Math.max(0, getRegionExposure(region) - 1) * 0.06;
  return region.resistance < threshold;
}

export function recalculateRestoreProgress(
  state: GameState,
  regionConfig: RegionConfigFile,
): number {
  const restored = regionConfig.regions.filter((region) => {
    const runtime = state.regionStates[region.id];
    return runtime?.state === 'unaffected' || runtime?.state === 'controlled';
  }).length;

  state.globalRestoreProgress = restored / regionConfig.regions.length;
  return state.globalRestoreProgress;
}

export function getRestoreCost(restoreDifficulty: number): number {
  return Math.ceil(12 + restoreDifficulty * 25);
}

export function getControlCost(restoreDifficulty: number): number {
  return Math.ceil(8 + restoreDifficulty * 18);
}

export function getTrafficControlCost(region: RegionConfig): number {
  const hubCount = region.transportHubs.filter((hub) =>
    hub === 'airport' || hub === 'port' || hub === 'seaRoute'
  ).length;
  return Math.ceil(10 + region.restoreDifficulty * 14 + hubCount * 4);
}
