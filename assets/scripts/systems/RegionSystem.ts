import type { GameState, RegionConfigFile, UpgradeConfigFile } from '../types/GameTypes';
import { getCombinedUpgradeEffects } from './UpgradeSystem';

const STATE_RISK_WEIGHT = {
  unaffected: 0,
  latent: 0.15,
  spreading: 0.45,
  severe: 0.8,
  controlled: 0.05,
  clearing: 0.2,
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
  const cost = Math.ceil(12 + region.restoreDifficulty * 25);

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

  const cost = Math.ceil(8 + region.restoreDifficulty * 18);

  if (state.resources < cost) {
    return false;
  }

  state.resources -= cost;
  runtime.state = 'controlled';
  runtime.controlTurns = 2;

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

        const pressure = runtime.state === 'severe' ? 0.38 : 0.24;
        const chance = pressure * (1 - neighbor.resistance) * (1 - spreadReduction);

        if (chance > 0.08) {
          nextStates.set(neighborId, 'latent');
        }
      }
    }

    if (runtime.state === 'latent' && region.resistance < 0.55) {
      nextStates.set(region.id, 'spreading');
    }

    if (runtime.state === 'spreading' && region.resistance < 0.4) {
      nextStates.set(region.id, 'severe');
    }
  }

  for (const [regionId, nextState] of nextStates) {
    const runtime = state.regionStates[regionId];
    if (runtime && runtime.state !== 'controlled' && runtime.state !== 'clearing') {
      runtime.state = nextState;
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
