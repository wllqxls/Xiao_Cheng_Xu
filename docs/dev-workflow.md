# 本地开发流程

## 当前可运行目标

第一阶段先把 `assets/scenes/main.scene` 跑起来。场景中的 `Canvas` 已挂 `GameBootstrap`，运行时会自动创建占位地图、HUD、底部操作区、事件面板和胜负面板。

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

## Cocos 预览

1. 打开 `C:\codex33\tools\CocosCreator-3.8.8\CocosCreator.exe`。
2. 打开项目 `C:\codex33\Wen_Yi`。
3. 打开 `assets/scenes/main.scene`。
4. 点击预览。
5. 检查地图区域、修复、隔离、推进、升级、事件和胜负面板。

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
