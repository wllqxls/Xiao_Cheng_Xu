import type { EventConfigFile, RegionConfigFile, UpgradeConfigFile } from '../types/GameTypes';
import { createInitialGameState } from '../state/createInitialGameState';
import { advanceDay } from '../systems/GameLoopSystem';
import {
  controlRegion,
  controlTrafficHub,
  restoreRegion,
} from '../systems/RegionSystem';
import { applyEventChoice } from '../systems/EventSystem';
import { buyUpgrade } from '../systems/UpgradeSystem';

export interface SimulationSummary {
  day: number;
  resources: number;
  globalRisk: number;
  globalRestoreProgress: number;
  result: string | undefined;
  lastEventId: string | undefined;
  restoredAshHarbor: boolean;
  controlApplied: boolean;
  trafficControlApplied: boolean;
  trafficControlExpired: boolean;
  eventApplied: boolean;
  victoryScenario: string | undefined;
  failureScenario: string | undefined;
}

export function runLocalSimulation(
  regions: RegionConfigFile,
  upgrades: UpgradeConfigFile,
  events: EventConfigFile,
): SimulationSummary {
  const state = createInitialGameState({ regions, upgrades, events });
  state.resources = 140;

  buyUpgrade(state, upgrades, 'field-logistics');
  restoreRegion(state, regions, upgrades, 'ash-harbor');
  const controlApplied = controlRegion(state, regions, 'moss-ring');
  const trafficControlApplied = controlTrafficHub(state, regions, 'ash-harbor');

  const firstEventChoice = events.events[0]?.choices[1];
  const eventApplied = firstEventChoice ? applyEventChoice(state, firstEventChoice) : false;

  for (let index = 0; index < 5; index += 1) {
    advanceDay(state, regions, upgrades, events);
  }

  const victoryState = createInitialGameState({ regions, upgrades, events });
  for (const region of regions.regions) {
    victoryState.regionStates[region.id].state = 'unaffected';
    victoryState.regionStates[region.id].restoreProgress = 1;
  }
  victoryState.globalRisk = 0;
  advanceDay(victoryState, regions, upgrades, events);

  const failureState = createInitialGameState({ regions, upgrades, events });
  for (const region of regions.regions) {
    failureState.regionStates[region.id].state = 'severe';
  }
  failureState.globalRisk = 1;
  advanceDay(failureState, regions, upgrades, events);

  return {
    day: state.day,
    resources: state.resources,
    globalRisk: Number(state.globalRisk.toFixed(3)),
    globalRestoreProgress: Number(state.globalRestoreProgress.toFixed(3)),
    result: state.result,
    lastEventId: state.lastEventId,
    restoredAshHarbor: state.regionStates['ash-harbor']?.restoreProgress > 0,
    controlApplied,
    trafficControlApplied,
    trafficControlExpired: state.regionStates['ash-harbor']?.trafficControlTurns === 0,
    eventApplied,
    victoryScenario: victoryState.result,
    failureScenario: failureState.result,
  };
}
