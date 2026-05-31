# AI 美术流程

## 结论

AI 只用于离线生产素材，不在游戏运行时调用 AI。所有素材进入项目之前必须统一风格、压缩、命名和授权记录。

## 目标风格

- 竖屏策略地图。
- 原创大陆、城市群或区域网格。
- 低饱和底色。
- 区域状态用清晰颜色和特效区分。
- UI 清晰克制，地图反馈优先。

## 禁用方向

- 真实世界地图。
- 真实国家边界。
- 现实医疗符号。
- 病毒、血液、针管等现实疾病联想图形。
- 直接模仿已有游戏界面。

## 素材分类

- 地图底图。
- 区域边界。
- 区域状态覆盖层。
- 区域图标。
- UI 背景和按钮。
- 事件插图。
- 升级图标。
- 胜利和失败画面。

## 建议规格

- 地图底图：竖版，建议先做 `1080x1920` 原图，再按实际包体压缩。
- 区域图标：`256x256` 原图，导入后按用途压缩。
- 升级图标：`256x256` 原图。
- 事件插图：可先使用 `1024x768`，再裁切为竖屏弹窗比例。

## 提示词记录模板

每个素材需要记录：

```text
assetName:
usage:
tool:
prompt:
negativePrompt:
sourceDate:
license:
editedBy:
finalPath:
notes:
```

## 示例提示词

```text
A vertical mobile strategy game map of an original fog-covered archipelago city, clean readable region shapes, soft grey-blue atmosphere, luminous repair beacons, stylized 2D game concept art, no real-world map, no country borders, no medical symbols
```

## 入库流程

1. 生成多张候选图。
2. 选择和项目风格一致的版本。
3. 手动修正明显瑕疵。
4. 统一色调和对比度。
5. 压缩体积。
6. 按命名规则放入 `assets/textures`。
7. 在素材记录中写明提示词、工具、授权和最终路径。

## 压缩要求

- 优先使用 Cocos 的纹理压缩与图集管理。
- 避免大量透明大图。
- 地图类资源需要检查真机内存占用。
- 反复使用的小图标应合并图集。
