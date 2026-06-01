import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const outDir = join(root, 'temp', 'simulation-check');
const tsc = 'C:\\codex33\\tools\\CocosCreator-3.8.8\\resources\\resources\\3d\\engine\\node_modules\\.bin\\tsc.cmd';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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
      'assets/scripts/sim/runLocalSimulation.ts',
    ],
    {
      cwd: root,
      encoding: 'utf8',
    },
  );

  if (compile.status !== 0) {
    throw new Error(`TypeScript compile failed\n${compile.stdout}\n${compile.stderr}`);
  }

  const modulePath = join(outDir, 'sim', 'runLocalSimulation.js');
  assert(existsSync(modulePath), `Compiled simulation not found: ${modulePath}`);

  const requireFromOutput = createRequire(pathToFileURL(join(outDir, 'entry.cjs')).href);
  const [{ runLocalSimulation }, regions, upgrades, events] = await Promise.all([
    Promise.resolve(requireFromOutput(modulePath)),
    readJson('assets/configs/region-config.json'),
    readJson('assets/configs/upgrade-config.json'),
    readJson('assets/configs/event-config.json'),
  ]);

  const summary = runLocalSimulation(regions, upgrades, events);

  assert(summary.day === 6, `Expected day 6, got ${summary.day}`);
  assert(summary.resources >= 0, `Resources should not be negative, got ${summary.resources}`);
  assert(summary.globalRisk >= 0 && summary.globalRisk <= 1, `Risk out of range: ${summary.globalRisk}`);
  assert(summary.globalRestoreProgress >= 0 && summary.globalRestoreProgress <= 1, `Progress out of range: ${summary.globalRestoreProgress}`);
  assert(summary.restoredAshHarbor, 'Ash Harbor restore action did not apply');
  assert(summary.controlApplied, 'Region isolation action did not apply');
  assert(summary.trafficControlApplied, 'Traffic control action did not apply');
  assert(summary.eventApplied, 'Event choice did not apply');
  assert(summary.trafficControlExpired, 'Traffic control should expire after five advances');
  assert(summary.victoryScenario === 'victory', `Victory scenario failed: ${summary.victoryScenario}`);
  assert(summary.failureScenario === 'failure', `Failure scenario failed: ${summary.failureScenario}`);

  console.log(JSON.stringify(summary, null, 2));
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(join(root, relativePath), 'utf8'));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
