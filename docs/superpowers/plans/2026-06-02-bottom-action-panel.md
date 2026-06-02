# Bottom Action Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the Cocos runtime bottom panel so selected-region, global, utility, and upgrade actions read as separate control groups.

**Architecture:** Keep the existing runtime-generated `GameBootstrap` UI. Add small helper methods for section labels and button color variants, then adjust only bottom-panel layout positions, sizes, and labels.

**Tech Stack:** Cocos Creator 3.8.8, TypeScript, project verification scripts under `scripts/`.

---

### Task 1: Add Button Styling Helpers

**Files:**
- Modify: `assets/scripts/cocos/GameBootstrap.ts`

- [ ] **Step 1: Add a small button style type near the top-level UI constants**

```ts
interface ButtonVisualStyle {
  fill: Color;
  label?: Color;
}
```

- [ ] **Step 2: Update `createButton` to accept a style parameter**

```ts
private createButton(
  name: string,
  parent: Node,
  text: string,
  position: Vec3,
  onClick: () => void,
  width = 250,
  height = 76,
  fontSize = 26,
  style: ButtonVisualStyle = { fill: new Color(59, 130, 180, 255) },
): Node {
  const buttonNode = this.createPanel(name, parent, width, height, position, style.fill);
  buttonNode.addComponent(Button);
  buttonNode.on(Button.EventType.CLICK, () => {
    this.playCue('tap');
    onClick();
  });
  const label = this.createLabel('Label', buttonNode, text, fontSize, new Vec3(0, 0, 0));
  label.getComponent(UITransform)?.setContentSize(width - 20, height - 8);
  label.color = style.label ?? new Color(238, 242, 247, 255);

  const widget = buttonNode.addComponent(Widget);
  widget.alignMode = Widget.AlignMode.ONCE;

  return buttonNode;
}
```

- [ ] **Step 3: Run the TypeScript check**

Run:

```powershell
$output = & 'C:\codex33\tools\CocosCreator-3.8.8\resources\resources\3d\engine\node_modules\.bin\tsc.cmd' -p tsconfig.json --noEmit 2>&1
$projectErrors = $output | Select-String -Pattern 'assets/scripts'
if ($projectErrors) { $projectErrors; exit 1 } else { 'OK no project TypeScript errors found in assets/scripts' }
```

Expected: `OK no project TypeScript errors found in assets/scripts`.

### Task 2: Rebuild Bottom Panel Grouping

**Files:**
- Modify: `assets/scripts/cocos/GameBootstrap.ts`

- [ ] **Step 1: Add `createSectionLabel` helper**

```ts
private createSectionLabel(parent: Node, text: string, position: Vec3, width = 220): Label {
  const label = this.createLabel(`${text}SectionLabel`, parent, text, 20, position);
  label.horizontalAlign = Label.HorizontalAlign.LEFT;
  label.color = new Color(156, 199, 214, 255);
  label.getComponent(UITransform)?.setContentSize(width, 30);
  return label;
}
```

- [ ] **Step 2: Add three section labels in `buildUi` below selected detail**

```ts
this.createSectionLabel(bottomPanel, '区域行动', new Vec3(-420, 50, 0));
this.createSectionLabel(bottomPanel, '全局流程', new Vec3(160, 50, 0));
this.createSectionLabel(bottomPanel, '强化', new Vec3(-420, -92, 0));
```

- [ ] **Step 3: Reposition and restyle action buttons**

Use selected-region buttons on the left, global buttons on the right, utility buttons small at the top right, and upgrades along the bottom:

```ts
const regionActionStyle = { fill: new Color(43, 143, 156, 255) };
const primaryActionStyle = { fill: new Color(210, 146, 58, 255) };
const utilityActionStyle = { fill: new Color(70, 82, 98, 255) };
const upgradeActionStyle = { fill: new Color(89, 108, 174, 255) };

this.createButton('SettingsButton', bottomPanel, '设置', new Vec3(230, 205, 0), () => this.handleOpenSettings(), 140, 48, 22, utilityActionStyle);
this.createButton('RestartButton', bottomPanel, '重开', new Vec3(390, 205, 0), () => this.handleRestart(), 140, 48, 22, utilityActionStyle);
this.createButton('RestoreButton', bottomPanel, '修复', new Vec3(-350, -8, 0), () => this.handleRestore(), 170, 62, 24, regionActionStyle);
this.createButton('ControlButton', bottomPanel, '隔离', new Vec3(-160, -8, 0), () => this.handleControl(), 170, 62, 24, regionActionStyle);
this.createButton('TrafficControlButton', bottomPanel, '管控', new Vec3(30, -8, 0), () => this.handleTrafficControl(), 170, 62, 24, regionActionStyle);
this.createButton('AdvanceDayButton', bottomPanel, '推进一天', new Vec3(320, -8, 0), () => this.handleAdvanceDay(), 210, 68, 25, primaryActionStyle);
```

- [ ] **Step 4: Reposition upgrade buttons**

```ts
const x = -300 + index * 300;
// position: new Vec3(x, -150, 0)
// size: 240 x 68
// fontSize: 20
// style: upgradeActionStyle
```

- [ ] **Step 5: Run visual and script verification**

Run:

```powershell
node scripts/verify-responsive-layout.mjs
node scripts/verify-map-layout.mjs
git diff --check
```

Expected: all commands pass.

### Task 3: Preview and Commit

**Files:**
- Modify: `assets/scripts/cocos/GameBootstrap.ts`

- [ ] **Step 1: Refresh Cocos preview**

Open or refresh `http://127.0.0.1:7456/` and capture a screenshot.

- [ ] **Step 2: Check success criteria**

Expected visual result:

- top-right `设置` and `重开` read as utility controls.
- `修复` / `隔离` / `管控` read as selected-region controls.
- `推进一天` is the strongest global action.
- upgrade buttons are grouped under `强化`.

- [ ] **Step 3: Commit implementation**

```powershell
git add assets\scripts\cocos\GameBootstrap.ts
git commit -m "Improve bottom action panel grouping"
```
