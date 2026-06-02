# 本地开发流程

## 当前可运行目标

第一阶段先把 `assets/scenes/main.scene` 跑起来。场景中的 `Canvas` 已挂 `GameBootstrap`，运行时会自动创建占位地图、HUD、底部操作区、事件面板、设置面板和胜负面板。

## 每次改动前

1. 查看状态：

```powershell
git status --short --branch
```

2. 如果工作区有不认识的改动，先读清楚，不要覆盖。

## 常用验证

验证 JSON：

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

验证项目脚本没有 TypeScript 错误：

```powershell
$output = & 'C:\codex33\tools\CocosCreator-3.8.8\resources\resources\3d\engine\node_modules\.bin\tsc.cmd' -p tsconfig.json --noEmit 2>&1
$projectErrors = $output | Select-String -Pattern 'assets/scripts'
if ($projectErrors) { $projectErrors; exit 1 } else { 'OK no project TypeScript errors found in assets/scripts' }
```

说明：Cocos 引擎自带声明文件会有一些环境噪音，所以当前只把 `assets/scripts` 下的错误作为项目错误。

验证 Git 空白问题：

```powershell
git diff --check
```

验证本地玩法闭环：

```powershell
node scripts/verify-simulation.mjs
```

该脚本会临时编译 `assets/scripts/sim/runLocalSimulation.ts` 到 `temp/simulation-check`，然后验证升级、修复、隔离、交通管控、事件选择、推进回合、胜利和失败场景。`temp/` 是忽略目录，脚本输出不需要提交。

验证 Cocos 场景接入：

```powershell
node scripts/verify-scene-wiring.mjs
```

Cocos preview portrait UI scaling check:
```powershell
node scripts/verify-responsive-layout.mjs
```

Map region overlap check:
```powershell
node scripts/verify-map-layout.mjs
```

该脚本会检查 `assets/scenes/main.scene` 是否保留 `1080x1920` 竖屏 Canvas、`Canvas` 是否挂载 `GameBootstrap`，以及 `regionConfigAsset`、`upgradeConfigAsset`、`eventConfigAsset` 是否和对应 `.meta` 的 UUID 一致。

## Cocos 预览

1. 打开 `C:\codex33\tools\CocosCreator-3.8.8\CocosCreator.exe`。
2. 打开项目 `C:\codex33\Wen_Yi`。
3. 打开 `assets/scenes/main.scene`。
4. 点击预览。
5. 检查地图区域、修复、隔离、推进、升级、事件、设置、重开、教程提示和胜负面板。

如果修改了 `GameBootstrap.ts` 后浏览器刷新仍显示旧画面，先等待 Cocos preview target 编译完成：

```powershell
node scripts/wait-cocos-preview-marker.mjs paintTerritoryShape 360000
```

把 `paintTerritoryShape` 换成本次改动中新增或修改后必然会出现在预览 chunk 里的函数名或字符串。脚本返回成功后再刷新 `http://127.0.0.1:7456/`。不要用反复刷新浏览器替代这个等待，因为浏览器使用的是 Cocos 的 `preview` target，而不是先更新的 `editor` target。

## 微信开发者工具

安装路径：

```text
C:\Program Files (x86)\Tencent\微信web开发者工具\微信开发者工具.exe
```

CLI 路径：

```text
C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat
```

注意：上传、发布、提交审核都属于红线，必须先确认。

## 提交流程

1. 跑验证。
2. 查看改动：

```powershell
git diff --stat
```

3. 提交：

```powershell
git add .
git commit -m "简短英文提交信息"
```

4. 推送前必须再次确认：

```powershell
git push
```
