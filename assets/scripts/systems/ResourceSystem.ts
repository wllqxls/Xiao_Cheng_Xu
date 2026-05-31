import type { GameState, RegionConfigFile, UpgradeConfigFile } from '../types/GameTypes';
import { getCombinedUpgradeEffects } from './UpgradeSystem';

export function collectDailyResources(
  state: GameState,
  regionConfig: RegionConfigFile,
  upgradeConfig: UpgradeConfigFile,
): number {
  const effects = getCombinedUpgradeEffects(state, upgradeConfig);
  const baseGain = regionConfig.regions.reduce((total, region) => {
    const runtime = state.regionStates[region.id];

    if (!runtime) {
      return total;
    }

    if (runtime.state === 'unaffected' || runtime.state === 'controlled') {
      return total + region.resourceYield;
    }

    if (runtime.state === 'clearing') {
      return total + Math.floor(region.resourceYield * 0.5);
    }

    return total;
  }, 0);

  const totalGain = Math.max(0, Math.floor(baseGain * (1 + effects.resourceYieldBonus)));
  state.resources += totalGain;

  return totalGain;
}
