import type { GameConfigBundle, GameState, RegionRuntimeState } from '../types/GameTypes';

export function createInitialGameState(config: GameConfigBundle): GameState {
  const regionStates = config.regions.regions.reduce<Record<string, RegionRuntimeState>>(
    (states, region) => {
      states[region.id] = {
        state: region.initialState,
        restoreProgress: region.initialState === 'unaffected' ? 1 : 0,
        controlTurns: 0,
      };
      return states;
    },
    {},
  );

  const upgradeLevels = config.upgrades.upgrades.reduce<Record<string, number>>((levels, upgrade) => {
    levels[upgrade.id] = 0;
    return levels;
  }, {});

  return {
    version: 1,
    day: 1,
    resources: 30,
    globalRisk: 0.35,
    globalRestoreProgress: 0,
    spreadReductionTurns: 0,
    regionStates,
    upgradeLevels,
    completedTutorialSteps: [],
    settings: {
      musicVolume: 0.6,
      sfxVolume: 0.8,
      hapticsEnabled: true,
    },
    result: 'playing',
  };
}
