# Cocos 场景接入说明

## 目标

把当前纯 TypeScript 玩法系统接到 Cocos Creator 3.8.x 的竖屏场景里。第一版只做可操作原型，不追求最终美术。

## 场景结构建议

在 `assets/scenes` 新建主场景，建议命名为 `main.scene`。

节点层级建议：

```text
Canvas
  GameRoot
  SafeArea
    TopBar
      DayLabel
      ResourceLabel
      RiskLabel
      ProgressLabel
    MapLayer
      RegionAshHarbor
      RegionMossRing
      RegionNorthGate
      RegionGlassYard
      RegionSilverDam
      RegionLowField
      RegionRedRail
      RegionWindArchive
    BottomPanel
      SelectedNameLabel
      SelectedDetailLabel
      RestoreButton
      ControlButton
      AdvanceDayButton
      UpgradeButtonA
      UpgradeButtonB
      UpgradeButtonC
    EventPanel
      EventTitleLabel
      ChoiceButtonA
      ChoiceButtonB
```

## 组件挂载

### GameRoot

挂到 `GameRoot` 节点。

需要拖入：

- `regionConfigAsset`：`assets/configs/region-config.json`
- `upgradeConfigAsset`：`assets/configs/upgrade-config.json`
- `eventConfigAsset`：`assets/configs/event-config.json`
- `hudView`：`BottomPanel` 或独立 HUD 节点上的 `HudView`
- `eventPanelView`：`EventPanel` 上的 `EventPanelView`
- `regionViews`：地图上的 8 个 `MapRegionView`

`regionViews` 的顺序默认对应 `region-config.json` 的区域顺序。也可以手动给每个 `MapRegionView.regionId` 填区域 id。

### MapRegionView

每个地图区域节点挂一个 `MapRegionView`。

建议节点包含：

- 一个可点击区域底图或按钮背景。
- `nameLabel`
- `statusLabel`
- `statusSprite`
- `selectedFrame`

第一版可以用纯色矩形占位。后续再换成区域形状图、状态覆盖层和动效。

### HudView

挂到 `BottomPanel` 或 HUD 根节点。

需要拖入：

- `dayLabel`
- `resourceLabel`
- `riskLabel`
- `progressLabel`
- `selectedNameLabel`
- `selectedDetailLabel`
- `restoreButton`
- `controlButton`
- `advanceDayButton`
- `upgradeButtons`
- `upgradeLabels`

`upgradeButtons` 和 `upgradeLabels` 顺序默认对应 `upgrade-config.json` 的升级顺序。

### EventPanelView

挂到 `EventPanel`。

需要拖入：

- `panelRoot`
- `titleLabel`
- `choiceButtons`
- `choiceLabels`

第一版事件只按二选一设计。后续需要三选一时，给 `choiceButtons` 和 `choiceLabels` 增加第三项即可。

## 竖屏布局

- `Canvas` 设计分辨率优先按竖屏，例如 `1080x1920`。
- `TopBar` 固定在上方，只放轻量数据。
- `MapLayer` 占中上区域，是主视觉。
- `BottomPanel` 固定在下半屏，放高频操作。
- `EventPanel` 居中或偏下弹出，不遮挡所有状态数据。

## 第一版占位美术

可以先用 Cocos 内置 Sprite + 纯色：

- 稳定：青绿色。
- 潜伏：黄色。
- 扩散中：橙色。
- 严重：红色。
- 受控：蓝色。
- 清除中：浅青色。

颜色已在 `MapRegionView.ts` 中集中配置。

## 当前限制

- 当前仓库还不是完整 Cocos Creator 工程，缺少 Cocos 自动生成的项目配置文件。
- 当前脚本已经按 Cocos 组件写好，但需要在 Cocos Creator 3.8.x 中创建场景并挂节点后才能预览。
- 本地没有全局 `tsc`，严格类型检查需要等 Cocos 工程或本地 TypeScript 环境就位后执行。

## 下一步

1. 用 Cocos Creator 3.8.x 创建或打开本目录作为项目。
2. 新建 `main.scene`。
3. 按本文档创建节点和挂组件。
4. 拖入 3 个 JSON 配置资源。
5. 运行 Cocos 预览，检查点击、资源、升级、事件和存档。
