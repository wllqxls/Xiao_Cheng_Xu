import type { GameState, RegionConfigFile } from '../types/GameTypes';

export function updateGameResult(state: GameState, regionConfig: RegionConfigFile): void {
  const totalRegions = regionConfig.regions.length;
  const severeCount = regionConfig.regions.filter(
    (region) => state.regionStates[region.id]?.state === 'severe',
  ).length;
  const restoredCount = regionConfig.regions.filter((region) => {
    const runtime = state.regionStates[region.id];
    return runtime?.state === 'unaffected' || runtime?.state === 'controlled';
  }).length;

  if (state.globalRisk >= 1 || severeCount / totalRegions >= 0.7) {
    state.result = 'failure';
    return;
  }

  if (restoredCount === totalRegions && state.globalRisk <= 0.2) {
    state.result = 'victory';
    return;
  }

  state.result = 'playing';
}
