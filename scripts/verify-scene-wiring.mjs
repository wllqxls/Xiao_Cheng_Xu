import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

const requiredAssets = {
  regionConfigAsset: 'assets/configs/region-config.json.meta',
  upgradeConfigAsset: 'assets/configs/upgrade-config.json.meta',
  eventConfigAsset: 'assets/configs/event-config.json.meta',
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const scene = await readJson('assets/scenes/main.scene');
  assert(Array.isArray(scene), 'main.scene should be a Cocos object array');

  const canvasNode = scene.find((item) => item?.__type__ === 'cc.Node' && item._name === 'Canvas');
  assert(canvasNode, 'Canvas node not found in main.scene');

  const uiTransform = findComponentOnNode(scene, canvasNode, 'cc.UITransform');
  assert(uiTransform, 'Canvas is missing UITransform');
  assert(uiTransform._contentSize?.width === 1080, `Canvas width should be 1080, got ${uiTransform._contentSize?.width}`);
  assert(uiTransform._contentSize?.height === 1920, `Canvas height should be 1920, got ${uiTransform._contentSize?.height}`);

  const canvas = findComponentOnNode(scene, canvasNode, 'cc.Canvas');
  assert(canvas, 'Canvas node is missing cc.Canvas');

  const bootstrap = scene.find((item) =>
    item
    && typeof item.__type__ === 'string'
    && !item.__type__.startsWith('cc.')
    && item.node?.__id__ === scene.indexOf(canvasNode)
    && item.regionConfigAsset
    && item.upgradeConfigAsset
    && item.eventConfigAsset
  );
  assert(bootstrap, 'GameBootstrap component with config assets not found on Canvas');

  const resolved = {};
  for (const [property, metaPath] of Object.entries(requiredAssets)) {
    const meta = await readJson(metaPath);
    const assignedUuid = bootstrap[property]?.__uuid__;
    assert(assignedUuid, `${property} is not assigned`);
    assert(
      assignedUuid === meta.uuid,
      `${property} uuid mismatch: scene has ${assignedUuid}, ${metaPath} has ${meta.uuid}`,
    );
    resolved[property] = assignedUuid;
  }

  console.log(JSON.stringify({
    scene: 'assets/scenes/main.scene',
    canvas: '1080x1920',
    bootstrapComponent: bootstrap.__type__,
    assets: resolved,
  }, null, 2));
}

function findComponentOnNode(scene, node, type) {
  const componentIds = node._components?.map((entry) => entry.__id__) ?? [];
  return componentIds.map((id) => scene[id]).find((component) => component?.__type__ === type);
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(join(root, relativePath), 'utf8'));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
