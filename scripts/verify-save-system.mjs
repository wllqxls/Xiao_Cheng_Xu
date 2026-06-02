import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const outDir = join(root, 'temp', 'save-system-check');
const tsc = 'C:\\codex33\\tools\\CocosCreator-3.8.8\\resources\\resources\\3d\\engine\\node_modules\\.bin\\tsc.cmd';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

class MemoryStorage {
  values = new Map();

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, value);
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

function createValidState() {
  return {
    version: 1,
    day: 3,
    resources: 42,
    globalRisk: 0.25,
    globalRestoreProgress: 0.4,
    spreadReductionTurns: 1,
    regionStates: {
      harbor: {
        state: 'spreading',
        restoreProgress: 0.2,
        controlTurns: 0,
        trafficControlTurns: 2,
      },
    },
    upgradeLevels: {
      field: 1,
    },
    completedTutorialSteps: ['select-region'],
    settings: {
      musicVolume: 0.5,
      sfxVolume: 0.4,
      hapticsEnabled: false,
    },
    result: 'playing',
  };
}

async function main() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const compile = spawnSync(
    'cmd.exe',
    [
      '/d',
      '/c',
      tsc,
      '--target',
      'ES2020',
      '--module',
      'CommonJS',
      '--moduleResolution',
      'Node',
      '--skipLibCheck',
      '--esModuleInterop',
      '--outDir',
      outDir,
      'assets/scripts/save/SaveSystem.ts',
    ],
    {
      cwd: root,
      encoding: 'utf8',
    },
  );

  if (compile.status !== 0) {
    throw new Error(`TypeScript compile failed\n${compile.stdout}\n${compile.stderr}`);
  }

  const modulePath = join(outDir, 'save', 'SaveSystem.js');
  assert(existsSync(modulePath), `Compiled save system not found: ${modulePath}`);

  const requireFromOutput = createRequire(pathToFileURL(join(outDir, 'entry.cjs')).href);
  const {
    SAVE_STORAGE_KEY,
    clearSave,
    deserializeSave,
    loadGame,
    saveGame,
    serializeSave,
  } = requireFromOutput(modulePath);

  const validState = createValidState();
  const serialized = serializeSave(validState);
  const roundTripped = deserializeSave(serialized);

  assert(roundTripped?.version === 1, 'Round trip should preserve current version');
  assert(roundTripped?.day === validState.day, 'Round trip should preserve day');
  assert(roundTripped?.settings.hapticsEnabled === false, 'Round trip should preserve haptics setting');

  const oldSave = {
    ...validState,
    settings: {
      musicVolume: 2,
      sfxVolume: -1,
    },
    regionStates: {
      harbor: {
        state: 'spreading',
        restoreProgress: 0.2,
        controlTurns: 0,
      },
    },
  };
  const migrated = deserializeSave(JSON.stringify(oldSave));
  assert(migrated?.settings.musicVolume === 1, 'Migration should clamp high music volume');
  assert(migrated?.settings.sfxVolume === 0, 'Migration should clamp low sfx volume');
  assert(migrated?.settings.hapticsEnabled === true, 'Migration should default missing haptics');
  assert(migrated?.regionStates.harbor.trafficControlTurns === 0, 'Migration should default traffic control turns');

  const missingRequiredField = { ...validState };
  delete missingRequiredField.day;
  assert(deserializeSave(JSON.stringify(missingRequiredField)) === undefined, 'Missing required day must invalidate save');

  const storage = new MemoryStorage();
  saveGame(storage, validState);
  assert(storage.getItem(SAVE_STORAGE_KEY), 'Save should write storage key');
  assert(loadGame(storage)?.resources === validState.resources, 'Load should read stored state');
  clearSave(storage);
  assert(loadGame(storage) === undefined, 'Clear should remove stored state');

  console.log(JSON.stringify({
    roundTrip: true,
    migration: true,
    rejectsMissingRequiredField: true,
    storage: true,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
