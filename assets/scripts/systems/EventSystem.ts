import type { EventChoiceConfig, EventConfig, EventConfigFile, GameState } from '../types/GameTypes';

export function pickAvailableEvent(
  state: GameState,
  eventConfig: EventConfigFile,
  randomValue: number = Math.random(),
): EventConfig | undefined {
  const available = eventConfig.events.filter((event) => event.minDay <= state.day);
  const totalWeight = available.reduce((total, event) => total + event.weight, 0);

  if (totalWeight <= 0) {
    return undefined;
  }

  let cursor = randomValue * totalWeight;

  for (const event of available) {
    cursor -= event.weight;
    if (cursor <= 0) {
      return event;
    }
  }

  return available[available.length - 1];
}

export function applyEventChoice(state: GameState, choice: EventChoiceConfig): boolean {
  if (choice.cost && state.resources < choice.cost) {
    return false;
  }

  if (choice.cost) {
    state.resources -= choice.cost;
  }

  state.globalRestoreProgress = Math.min(
    1,
    state.globalRestoreProgress + (choice.effects.globalRestoreProgress ?? 0),
  );
  state.globalRisk = Math.min(1, Math.max(0, state.globalRisk + (choice.effects.globalRisk ?? 0)));
  state.resources += choice.effects.resourceGain ?? 0;
  state.spreadReductionTurns += choice.effects.spreadReductionTurns ?? 0;

  return true;
}
