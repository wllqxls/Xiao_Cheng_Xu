# AI 美术流程

## 结论

AI 只用于离线生产素材，不在游戏运行时调用 AI。所有素材进入项目之前必须统一风格、压缩、命名和授权记录。

## 目标风格

- 竖屏策略地图。
- 原创海陆地图，包含海洋、陆地、岛链和航线。
- 地图主体是“手绘航海图 + 桌游式清晰区域边界”。
- 陆地需要多元化：城市、森林、山地、农田、工业区、科技院、机场、港口、研究站。
- 地图要有生活感和人口感：城市块、小镇、道路、港口、机场、农田、森林纹理。
- 低饱和底色。
- 区域状态用清晰颜色和特效区分。
- UI 清晰克制，地图反馈优先。
- 飞机和船只可以是简化图标，但需要能看出它们可能沿航线带来传播风险。
- 侵蚀从红点、红斑到半透明红色覆盖逐级加深。

## 当前推荐方向

主方向：手绘航海世界地图。

落地规则：美术质感参考手绘航海图，交互和状态表达参考桌游地图。不要做成科技雷达界面。

区域表现建议：

- 城市：建筑密集、人口标记多，侵蚀为密集红点和红色光簇。
- 森林：树冠纹理明显，侵蚀为红色蔓延纹路。
- 工业区：工厂和管线明显，侵蚀为烟尘状红斑。
- 港口：码头、船只、海上航线明显，侵蚀会沿航线出现风险提示。
- 机场：跑道或塔台明显，飞机轨迹带轻微红色风险尾迹。
- 科技区：建筑更规整明亮，但不让整体地图变成科幻监控屏。

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
A vertical mobile strategy game map of an original hand-drawn nautical world, ocean and fictional landmass, populated city districts, forests, farmlands, industrial harbor, airport, research campus, sea routes and air routes, corruption shown as red dots and translucent red stains on land, small ships and planes with subtle red warning trails, readable board-game territory borders, no real-world map, no country borders, no medical symbols, no virus icons
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
