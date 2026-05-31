import type { EventConfigFile, RegionConfigFile, UpgradeConfigFile } from '../types/GameTypes';
import { createInitialGameState } from '../state/createInitialGameState';
import { advanceDay } from '../systems/GameLoopSystem';
import { restoreRegion } from '../systems/RegionSystem';
import { buyUpgrade } from '../systems/UpgradeSystem';

export interface SimulationSummary {
  day: number;
  resources: number;
  globalRisk: number;
  globalRestoreProgress: number;
  result: string | undefined;
  lastEventId: string | undefined;
}

export function runLocalSimulation(
  regions: RegionConfigFile,
  upgrades: UpgradeConfigFile,
  events: EventConfigFile,
): SimulationSummary {
  const state = createInitialGameState({ regions, upgrades, events });

  buyUpgrade(state, upgrades, 'field-logistics');
  restoreRegion(state, regions, upgrades, 'ash-harbor');

  for (let index = 0; index < 5; index += 1) {
    advanceDay(state, regions, upgrades, events);
  }

  return {
    day: state.day,
    resources: state.resources,
    globalRisk: Number(state.globalRisk.toFixed(3)),
    globalRestoreProgress: Number(state.globalRestoreProgress.toFixed(3)),
    result: state.result,
    lastEventId: state.lastEventId,
  };
}
