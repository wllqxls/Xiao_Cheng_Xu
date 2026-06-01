# Wen_Yi

面向手机竖屏的微信小游戏原型，技术栈为 Cocos Creator 3.8.x + TypeScript。当前方向是原创修复策略模拟：玩家在被异象侵蚀后的区域地图上修复、隔离、升级能力、处理事件，并通过本地存档继续一局游戏。

## 当前状态

- Cocos Creator 3.8.8 项目已可被编辑器识别。
- 主场景为 `assets/scenes/main.scene`。
- `Canvas` 挂载 `GameBootstrap`，运行时自动生成占位地图、顶部数据栏、底部操作区、事件面板、设置面板和胜负面板。
- 已接入区域状态、资源、升级、随机事件、胜负判定、本地存档、重开、音量/触感设置和轻教程提示。
- 微信小游戏构建流程仍需在 Cocos Creator 和微信开发者工具中完成实际构建验证。

## 目录

- `assets/scenes`：Cocos 场景。
- `assets/scripts`：TypeScript 游戏逻辑和 Cocos 组件。
- `assets/configs`：玩法配置和存档结构说明。
- `assets/textures`：图片资源。
- `assets/audio`：音效与背景音资源。
- `assets/prefabs`：预制体。
- `docs`：设计、构建、素材、测试和开发流程文档。

## 本地打开

1. 启动 Cocos Creator：

```text
C:\codex33\tools\CocosCreator-3.8.8\CocosCreator.exe
```

2. 打开项目目录：

```text
C:\codex33\Wen_Yi
```

3. 打开主场景：

```text
assets/scenes/main.scene
```

4. 点击预览，检查区域点击、修复、隔离、推进、升级、事件、设置、重开和存档。

## 常用验证

验证 JSON 和场景文件：

```powershell
$files = @(
  'assets/configs/region-config.json',
  'assets/configs/upgrade-config.json',
  'assets/configs/event-config.json',
  'assets/configs/save-schema.json',
  'assets/scenes/main.scene',
  'assets/scenes/main.scene.meta'
)
foreach ($file in $files) {
  Get-Content -Raw -Encoding utf8 $file | ConvertFrom-Json | Out-Null
  Write-Output "OK $file"
}
```

验证项目脚本：

```powershell
$output = & 'C:\codex33\tools\CocosCreator-3.8.8\resources\resources\3d\engine\node_modules\.bin\tsc.cmd' -p tsconfig.json --noEmit 2>&1
$projectErrors = $output | Select-String -Pattern 'assets/scripts'
if ($projectErrors) { $projectErrors; exit 1 } else { 'OK no project TypeScript errors found in assets/scripts' }
```

验证 Git 空白问题：

```powershell
git diff --check
```

## 文档入口

- [项目规则](CLAUDE.md)
- [游戏设计](docs/game-design.md)
- [MVP 范围](docs/mvp-scope.md)
- [配置结构](docs/config-schema.md)
- [Cocos 场景接入](docs/cocos-scene-setup.md)
- [微信小游戏构建](docs/wechat-build.md)
- [测试清单](docs/test-checklist.md)
