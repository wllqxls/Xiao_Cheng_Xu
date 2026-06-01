# Cocos 场景接入说明

## 目标

说明当前 Cocos Creator 3.8.x 竖屏场景的接入方式。第一版只做可操作原型，不追求最终美术。

## 场景结构建议

主场景为 `assets/scenes/main.scene`。当前原型由 `Canvas` 上的 `GameBootstrap` 在运行时创建 UI 节点。

运行时节点层级：

```text
Canvas
  TopBar
    DayLabel
    ResourceLabel
    RiskLabel
    ProgressLabel
  FeedbackLabel
  MapLayer
    OceanBackdrop
      MapTitleLabel
      MapLegendLabel
    RouteLayer
      RouteMarker-*
    Region-ash-harbor
    Region-moss-ring
    Region-north-gate
    Region-glass-yard
    Region-silver-dam
    Region-low-field
    Region-red-rail
    Region-wind-archive
    Region-blue-atolls
    Region-white-spire-campus
  BottomPanel
    SelectedNameLabel
    SelectedDetailLabel
    RestoreButton
    ControlButton
    TrafficControlButton
    AdvanceDayButton
    SettingsButton
    RestartButton
    UpgradeButton1
    UpgradeButton2
    UpgradeButton3
  EventPanel
    EventTitleLabel
    EventChoice1
    EventChoice2
  ResultPanel
    ResultTitleLabel
    ResultDetailLabel
    ResultRestartButton
  SettingsPanel
    SettingsTitleLabel
    MusicVolumeButton
    SfxVolumeButton
    HapticsButton
    CloseSettingsButton
```

## 组件挂载

### GameBootstrap

挂到 `Canvas` 节点。

需要拖入：

- `regionConfigAsset`：`assets/configs/region-config.json`
- `upgradeConfigAsset`：`assets/configs/upgrade-config.json`
- `eventConfigAsset`：`assets/configs/event-config.json`
- `ambienceClip`：主界面循环氛围音，可暂时为空。
- `tapClip`：普通点击音，可暂时为空。
- `upgradeClip`：升级成功音，可暂时为空。
- `eventClip`：事件出现音，可暂时为空。
- `restoreClip`：区域修复音，可暂时为空。
- `riskClip`：风险提示音，可暂时为空。
- `victoryClip`：胜利音，可暂时为空。
- `failureClip`：失败音，可暂时为空。

`GameBootstrap` 会读取配置，创建地图区域、海洋背景、航线层、操作按钮、事件弹窗、设置弹窗和结算弹窗，并在状态变化后写入本地存档。
地图区域会读取 `mapPosition` 和 `size` 做竖屏相对布局，并在详情面板显示区域类型、科技层级、人口和交通枢纽。区域绘制会根据当前状态和 `corruptionProfile` 显示红点、红斑和覆盖强度。
音频属性未绑定时，音频系统会静默跳过播放，不影响预览和基础玩法验证。

### MapRegionView

`MapRegionView` 保留为后续手工搭建地图节点时使用。当前 `GameBootstrap` 已用运行时 `Graphics` 生成海洋背景、陆地区域、航线、飞机/船只标记和红点侵蚀层。

建议节点包含：

- 一个可点击区域底图或按钮背景。
- `nameLabel`
- `statusLabel`
- `statusSprite`
- `selectedFrame`

第一版可以继续使用运行时图形占位。后续再换成正式区域形状图、状态覆盖层、船只/飞机素材和动效。

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

可以先用 Cocos `Graphics` + 纯色：

- 稳定：青绿色。
- 潜伏：黄色。
- 扩散中：橙色。
- 严重：红色。
- 受控：蓝色。
- 清除中：浅青色。

颜色已在 `MapRegionView.ts` 中集中配置。
当前运行时占位界面的颜色、航线、海洋背景和红点侵蚀层在 `GameBootstrap.ts` 中同步配置。

## 当前限制

- 当前 UI 是运行时生成的占位界面，不是最终美术节点树。
- 当前设置面板已保存 BGM 音量、音效音量和触感开关；音频播放入口已接入，正式音频资源尚未入库。
- 当前微信小游戏构建目录尚未生成，需要在 Cocos Creator 构建发布面板中执行构建。

## 下一步

1. 运行 Cocos 预览，检查点击、资源、升级、事件、设置、重开和存档。
2. 调整海陆地图节点的真实观感，包括区域尺寸、层级遮挡、航线密度和红点密度。
3. 将运行时占位 UI 逐步替换为正式 Cocos 节点或 Prefab。
4. 接入 `assets/audio` 中的真实音效和背景音。
5. 构建微信小游戏目录并用微信开发者工具验证。
