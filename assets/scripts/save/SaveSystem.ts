import type { GameState } from '../types/GameTypes';

export const CURRENT_SAVE_VERSION = 1;
export const SAVE_STORAGE_KEY = 'wen_yi_restore_save_v1';

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
    return save as GameState;
  }

  return undefined;
}
