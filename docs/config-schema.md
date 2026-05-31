# 配置结构说明

## 原则

玩法数值优先放在 `assets/configs`。核心代码只读取配置和执行规则，不把平衡数值写死。

## 区域配置

文件：`assets/configs/region-config.json`

关键字段：

- `id`：英文唯一标识。
- `displayName`：中文显示名。
- `population`：区域规模，用于计算风险和收益权重。
- `initialState`：开局状态。
- `resistance`：区域抵抗能力，越高越不容易恶化。
- `restoreDifficulty`：恢复难度，越高越贵或越慢。
- `resourceYield`：基础资源产出。
- `neighbors`：邻接区域 id 列表。

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
- `regionStates`
- `upgradeLevels`
- `completedTutorialSteps`
- `settings`

后续版本需要新增字段时，通过迁移函数补默认值，不允许让旧存档直接崩溃。

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
