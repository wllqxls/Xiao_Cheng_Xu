# Wen_Yi 项目规则

## 项目定位

- 项目类型：微信小游戏，不是普通微信小程序。
- 推荐技术栈：Cocos Creator 3.8.x + TypeScript + 微信小游戏发布流程。
- 目标设备：手机竖屏，优先单手操作。
- 第一阶段目标：单机 MVP，完成地图扩散、资源增长、升级树、随机事件、区域防御、胜负判定、本地存档。

## 题材边界

- 不直接使用现实瘟疫、病毒、传染病、真实国家地图等表达。
- 默认原创方向：被侵蚀后的世界修复模拟，玩家操作净化、隔离、引导、修复系统。
- 可保留双模式设计：
  - `Restore Mode`：世界已被侵蚀，玩家逐步清除并重建秩序。
  - `Spread Mode`：玩家操控虚构能量扩散，但命名、美术、规则必须原创。
- 禁止直接复刻现有同类游戏的命名、数值、地图、技能、事件和美术表现。

## 目录结构

项目根目录：

- `assets/scenes`：Cocos 场景。
- `assets/scripts`：TypeScript 游戏逻辑。
- `assets/configs`：玩法数值配置，优先使用 JSON。
- `assets/textures`：图片资源。
- `assets/audio`：音效与背景音。
- `assets/prefabs`：Cocos 预制体。
- `docs`：规则、设计、素材、测试和发布文档。

文档目录：

- `docs/game-design.md`：核心玩法与世界观。
- `docs/mvp-scope.md`：第一阶段范围。
- `docs/config-schema.md`：配置结构说明。
- `docs/art-pipeline.md`：AI 美术流程、提示词、授权记录。
- `docs/audio-list.md`：音效清单。
- `docs/wechat-build.md`：微信小游戏构建说明。
- `docs/test-checklist.md`：测试清单。
- `docs/cocos-scene-setup.md`：Cocos 场景节点挂载说明。
- `docs/dev-workflow.md`：本地开发、验证、提交流程。

脚本子目录：

- `assets/scripts/types`：共享类型、枚举、配置接口。
- `assets/scripts/state`：局内状态创建、读取、变更。
- `assets/scripts/systems`：核心玩法系统。
- `assets/scripts/save`：本地存档、版本迁移、序列化。
- `assets/scripts/sim`：不依赖 Cocos 的本地模拟与验证入口。
- `assets/scripts/cocos`：后续接入 Cocos Creator 节点、组件、UI 绑定。

## 命名约定

- 代码、变量、函数、文件夹使用英文。
- 文档和沟通使用中文。
- TypeScript 类名使用 `PascalCase`。
- 函数、变量、配置字段使用 `camelCase`。
- 配置文件使用 `kebab-case.json`。
- 资源文件使用 `kebab-case`，并带用途前缀，例如 `map-region-core.png`、`sfx-upgrade.mp3`。

## 代码约定

- 玩法数据必须配置化，避免把数值硬编码进核心逻辑。
- 核心系统优先拆分为：
  - `GameState`：局内状态。
  - `RegionSystem`：区域状态与扩散/清除计算。
  - `ResourceSystem`：资源产出与消耗。
  - `UpgradeSystem`：升级树与效果。
  - `EventSystem`：随机事件。
  - `SaveSystem`：本地存档与版本迁移。
  - `AudioSystem`：音效与音量。
- 存档必须带 `version` 字段，后续更新通过迁移函数兼容旧存档。
- 不为了绕过报错注释逻辑或吞掉异常，必须定位根因。

## 资源约定

- 游戏运行时不实时调用 AI 生成图片或音频。
- AI 只作为素材生产工具；所有素材进入项目之前必须筛选、压缩、统一色调和授权记录。
- 图片优先控制尺寸和数量，避免微信小游戏包体过大。
- 音频需统一音量、格式和循环点。

## UI 与适配

- 竖屏优先，地图占主视觉。
- 重要操作区放在下半屏，适合单手操作。
- 首页直接进入主体验，不做大段说明页。
- 教程使用分步引导，边玩边学。
- UI 风格：清晰策略面板 + 地图动态反馈，避免过重装饰。

## 阶段边界

第一阶段不做：

- 微信登录。
- 云存档。
- 排行榜。
- 分享裂变。
- 广告和充值。
- 多人联网。
- 复杂 AI 角色系统。

这些功能等核心玩法验证后再评估。

## 验证要求

每次完成可运行改动后，至少执行对应验证：

- Cocos Creator 预览：验证场景加载、地图点击、UI 适配、基础循环。
- 微信开发者工具：验证小游戏构建、资源加载、音频播放、存档。
- 真机微信：验证竖屏适配、性能、触控、包体、异常退出恢复。

重点测试项：

- 竖屏适配。
- 地图区域点击。
- 区域状态变化。
- 资源增长与消耗。
- 升级逻辑。
- 事件触发。
- 音效播放。
- 存档恢复。
- 包体大小。
- 低端手机性能。

## 红线

以下操作必须先征得用户确认：

- 删除文件、目录或 git 历史。
- 修改 `.env`、密钥、token、CI/CD 配置。
- 数据库 schema 变更或数据迁移。
- `git push`、`git rebase`、`git reset --hard`、强制推送。
- 安装新的全局依赖或修改系统配置。
- 公开发布、生产部署、npm publish、对外发文。

## 开发流程

1. 新目录先补结构约定。
2. 大改动先给方案，确认后再动手。
3. 文档与规则变化先改文档，再改实践。
4. 实现后主动运行验证。
5. 最终交付必须包含运行方式、构建方式、配置说明、资源压缩说明、AI 素材记录、音效清单和测试清单。
