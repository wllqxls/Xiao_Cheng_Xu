import type { GameSettings, GameState } from '../types/GameTypes';

export const CURRENT_SAVE_VERSION = 1;
export const SAVE_STORAGE_KEY = 'wen_yi_restore_save_v1';
const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 0.6,
  sfxVolume: 0.8,
  hapticsEnabled: true,
};

export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function serializeSave(state: GameState): string {
  return JSON.stringify({
    ...state,
    version: CURRENT_SAVE_VERSION,
  });
}

export function deserializeSave(rawSave: string): GameState | undefined {
  try {
    const parsed = JSON.parse(rawSave) as Partial<GameState>;

    if (!parsed || typeof parsed.version !== 'number') {
      return undefined;
    }

    return migrateSave(parsed);
  } catch {
    return undefined;
  }
}

export function loadGame(storage: SaveStorage): GameState | undefined {
  const rawSave = storage.getItem(SAVE_STORAGE_KEY);

  return rawSave ? deserializeSave(rawSave) : undefined;
}

export function saveGame(storage: SaveStorage, state: GameState): void {
  storage.setItem(SAVE_STORAGE_KEY, serializeSave(state));
}

export function clearSave(storage: SaveStorage): void {
  storage.removeItem(SAVE_STORAGE_KEY);
}

function migrateSave(save: Partial<GameState>): GameState | undefined {
  if (save.version === 1) {
    return {
      ...save,
      spreadReductionTurns: save.spreadReductionTurns ?? 0,
      completedTutorialSteps: save.completedTutorialSteps ?? [],
      settings: normalizeSettings(save.settings),
      result: save.result ?? 'playing',
    } as GameState;
  }

  return undefined;
}

function normalizeSettings(settings: Partial<GameSettings> | undefined): GameSettings {
  return {
    musicVolume: clampVolume(settings?.musicVolume, DEFAULT_SETTINGS.musicVolume),
    sfxVolume: clampVolume(settings?.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
    hapticsEnabled: typeof settings?.hapticsEnabled === 'boolean'
      ? settings.hapticsEnabled
      : DEFAULT_SETTINGS.hapticsEnabled,
  };
}

function clampVolume(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(1, value));
}
