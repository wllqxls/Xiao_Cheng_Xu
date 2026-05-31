import type { EventConfigFile, GameState, RegionConfigFile, UpgradeConfigFile } from '../types/GameTypes';
import { collectDailyResources } from './ResourceSystem';
import {
  advanceRegionRisks,
  recalculateGlobalRisk,
  recalculateRestoreProgress,
} from './RegionSystem';
import { pickAvailableEvent } from './EventSystem';
import { updateGameResult } from './VictorySystem';

export interface AdvanceDayResult {
  resourceGain: number;
  eventId?: string;
}

export function advanceDay(
  state: GameState,
  regionConfig: RegionConfigFile,
  upgradeConfig: UpgradeConfigFile,
  eventConfig: EventConfigFile,
): AdvanceDayResult {
  if (state.result && state.result !== 'playing') {
    return { resourceGain: 0 };
  }

  state.day += 1;
  const resourceGain = collectDailyResources(state, regionConfig, upgradeConfig);
  advanceRegionRisks(state, regionConfig, upgradeConfig);
  recalculateGlobalRisk(state, regionConfig);
  recalculateRestoreProgress(state, regionConfig);

  const event = state.day % 3 === 0 ? pickAvailableEvent(state, eventConfig) : undefined;
  state.lastEventId = event?.id;
  updateGameResult(state, regionConfig);

  return {
    resourceGain,
    eventId: event?.id,
  };
}
