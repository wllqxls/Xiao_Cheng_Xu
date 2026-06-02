# Placeholder Map Visual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make runtime-generated Cocos map regions look less like UI buttons and more like temporary map territory markers.

**Architecture:** Keep all map rendering in `assets/scripts/cocos/GameBootstrap.ts`. Add a source-level verification script to protect the visual helper structure, then update `paintRegionMarker` with territory shape helpers and keep existing click behavior untouched.

**Tech Stack:** Cocos Creator 3.8.8, TypeScript, Node.js verification scripts.

---

### Task 1: Add Failing Static Visual Verification

**Files:**
- Create: `scripts/verify-region-marker-style.mjs`

- [ ] **Step 1: Create script that checks visual helper names**

```js
import fs from 'node:fs';

const source = fs.readFileSync('assets/scripts/cocos/GameBootstrap.ts', 'utf8');

const requiredMarkers = [
  'paintTerritoryShape',
  'paintTerritoryContour',
  'paintSelectedTerritoryRing',
];

const missing = requiredMarkers.filter((marker) => !source.includes(marker));

if (missing.length > 0) {
  console.error(JSON.stringify({ missing }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ requiredMarkers }, null, 2));
```

- [ ] **Step 2: Run script and verify it fails**

Run: `node scripts/verify-region-marker-style.mjs`

Expected: FAIL with missing helper names.

### Task 2: Add Territory Drawing Helpers

**Files:**
- Modify: `assets/scripts/cocos/GameBootstrap.ts`

- [ ] **Step 1: Update `paintRegionMarker` to call new helpers**

Replace the simple rounded-rectangle fill/stroke with helper calls:

```ts
graphics.clear();
this.paintTerritoryShape(graphics, width, height, color, runtime);

if (selected) {
  this.paintSelectedTerritoryRing(graphics, width, height);
}

this.paintRegionLandmarks(graphics, width, height, region);
this.paintTerritoryContour(graphics, width, height, region);
this.paintTrafficControlBadge(graphics, width, height, runtime);
```

- [ ] **Step 2: Add `paintTerritoryShape`**

Draw a soft polygon-like territory with a muted fill and a lighter border.

- [ ] **Step 3: Add `paintTerritoryContour`**

Draw two subtle internal contour lines based on region id hash.

- [ ] **Step 4: Add `paintSelectedTerritoryRing`**

Draw an outer selection ring around the territory without using a button-like rectangle border.

### Task 3: Verify and Preview

**Files:**
- Modify: `assets/scripts/cocos/GameBootstrap.ts`
- Test: `scripts/verify-region-marker-style.mjs`

- [ ] **Step 1: Run source and simulation verification**

```powershell
node scripts/verify-region-marker-style.mjs
node scripts/verify-responsive-layout.mjs
node scripts/verify-map-layout.mjs
node scripts/verify-simulation.mjs
node scripts/verify-scene-wiring.mjs
```

- [ ] **Step 2: Run TypeScript project check**

```powershell
$output = & 'C:\codex33\tools\CocosCreator-3.8.8\resources\resources\3d\engine\node_modules\.bin\tsc.cmd' -p tsconfig.json --noEmit 2>&1
$projectErrors = $output | Select-String -Pattern 'assets/scripts'
if ($projectErrors) { $projectErrors; exit 1 } else { 'OK no project TypeScript errors found in assets/scripts' }
```

- [ ] **Step 3: Refresh Cocos preview and visually inspect**

Expected: region markers are still readable, but no longer read as ordinary rectangular buttons.

- [ ] **Step 4: Commit**

```powershell
git add docs\superpowers\specs\2026-06-02-placeholder-map-visual-design.md docs\superpowers\plans\2026-06-02-placeholder-map-visual.md scripts\verify-region-marker-style.mjs assets\scripts\cocos\GameBootstrap.ts
git commit -m "Improve placeholder map region visuals"
```
