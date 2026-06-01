# 配置结构说明

## 原则

玩法数值优先放在 `assets/configs`。核心代码只读取配置和执行规则，不把平衡数值写死。

## 区域配置

文件：`assets/configs/region-config.json`

关键字段：

- `id`：英文唯一标识。
- `displayName`：中文显示名。
- `category`：区域类型，例如城市、森林、工业、港口、机场、群岛。
- `techLevel`：科技层级，用于表现地区文明差异。
- `population`：区域规模，用于计算风险和收益权重。
- `initialState`：开局状态。
- `resistance`：区域抵抗能力，越高越不容易恶化。
- `restoreDifficulty`：恢复难度，越高越贵或越慢。
- `resourceYield`：基础资源产出。
- `transportHubs`：交通枢纽标签，例如港口、机场、铁路、道路、海上航线。
- `mapPosition`：竖版地图上的相对位置和显示尺寸。
- `corruptionProfile`：侵蚀显示参数，控制红点密度和覆盖强度。
- `neighbors`：邻接区域 id 列表。

这些字段不是纯展示数据。当前 `RegionSystem` 会使用 `category` 和 `transportHubs` 调整传播压力和受影响概率：

- 港口、机场、海上航线会提高传播风险。
- 核心城市、港口城市、机场枢纽流动性更高。
- 森林、山地、研究站相对更稳。
- `resistance` 仍是最终抵抗权重，区域类型只是修正传播环境。

当前区域类型：

- `capital`：核心城市。
- `portCity`：港口城市。
- `forest`：森林区。
- `mountain`：山地区。
- `farmland`：农田带。
- `industrial`：工业区。
- `techCampus`：科技院。
- `airportHub`：空港枢纽。
- `islandChain`：群岛。
- `researchOutpost`：研究站。

当前科技层级：

- `low`
- `standard`
- `industrial`
- `advanced`

当前交通标签：

- `port`
- `airport`
- `rail`
- `road`
- `seaRoute`

## 升级配置

文件：`assets/configs/upgrade-config.json`

关键字段：

- `id`：英文唯一标识。
- `displayName`：中文显示名。
- `maxLevel`：最高等级。
- `baseCost`：一级基础成本。
- `costGrowth`：每级成本倍率。
- `effects`：升级效果集合。

## 事件配置

文件：`assets/configs/event-config.json`

关键字段：

- `id`：英文唯一标识。
- `displayName`：中文显示名。
- `weight`：抽取权重。
- `minDay`：最早出现天数。
- `choices`：玩家选项。
- `effects`：选项效果。

## 存档结构

文件：`assets/configs/save-schema.json`

运行时真实存档必须包含：

- `version`
- `day`
- `resources`
- `globalRisk`
- `globalRestoreProgress`
- `spreadReductionTurns`
- `regionStates`
- `upgradeLevels`
- `completedTutorialSteps`
- `settings`
- `result`

后续版本需要新增字段时，通过迁移函数补默认值，不允许让旧存档直接崩溃。

`settings` 当前字段：

- `musicVolume`：BGM 音量，范围 `0` 到 `1`。
- `sfxVolume`：音效音量，范围 `0` 到 `1`。
- `hapticsEnabled`：触感反馈开关。

`SaveSystem` 会在读取存档时补齐缺失的设置、教程和临时效果字段，并把音量限制在 `0` 到 `1`。

`regionStates` 当前字段：

- `state`：区域状态。
- `restoreProgress`：修复进度。
- `controlTurns`：区域隔离剩余回合。
- `trafficControlTurns`：港口、机场或航线管控剩余回合。

## 区域状态枚举

代码中应统一使用：

- `unaffected`
- `latent`
- `spreading`
- `severe`
- `controlled`
- `clearing`

## 调参规则

- 新字段先更新本文档，再改配置和代码。
- 平衡数值修改需要记录原因。
- 不在 TypeScript 里临时写死成本、概率、产出。
