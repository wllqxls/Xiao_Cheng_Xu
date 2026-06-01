# 微信小游戏构建说明

## 目标环境

- Cocos Creator 3.8.x。
- TypeScript。
- 发布目标：微信小游戏。
- 竖屏手机体验。

## 本地准备

需要手动安装：

- Cocos Creator 3.8.x。
- 微信开发者工具。
- Cocos Developer 账号登录状态。

注意：安装全局依赖或修改系统配置属于红线，执行前需要用户确认。

## 当前机器状态

- Cocos Creator 3.8.8 已解压到 `C:\codex33\tools\CocosCreator-3.8.8\CocosCreator.exe`。
- 微信开发者工具已安装到 `C:\Program Files (x86)\Tencent\微信web开发者工具\微信开发者工具.exe`。
- 微信开发者工具 CLI 路径：`C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat`。
- 当前项目已被 Cocos Creator 3.8.8 识别，并生成了 `library`、`temp` 和资源 `.meta` 文件。
- 当前主场景：`assets/scenes/main.scene`。
- 如果 Cocos Creator 打开后停在 `Cocos Developer Login`，需要先手动登录账号，再执行预览或构建。

## Cocos 项目导入

当前仓库先建立规则、文档、配置和资源目录。正式用 Cocos Creator 创建或打开项目后，需要确认以下目录继续保留：

- `assets/scenes`
- `assets/scripts`
- `assets/configs`
- `assets/textures`
- `assets/audio`
- `assets/prefabs`
- `docs`

## 竖屏设置

在 Cocos Creator 中检查：

- 设计分辨率按竖屏设置。
- Canvas 适配手机竖屏。
- 关键按钮位于下半屏。
- 地图区域点击范围在不同屏幕比例下不偏移。

## 微信小游戏构建流程

1. 在 Cocos Creator 中打开项目。
2. 打开构建发布面板。
3. 平台选择微信小游戏。
4. 填写小游戏 AppID 或使用测试号。
5. 检查资源压缩、首包和远程资源设置。
6. 构建生成微信小游戏目录。
7. 用微信开发者工具打开构建目录。
8. 在开发者工具中预览和真机调试。

当前项目建议先在 Cocos Creator 中执行一次预览：

1. 打开 `C:\codex33\tools\CocosCreator-3.8.8\CocosCreator.exe`。
2. 打开项目 `C:\codex33\Wen_Yi`。
3. 打开场景 `assets/scenes/main.scene`。
4. 确认 `Canvas` 上挂有 `GameBootstrap` 组件。
5. 点击预览。

当前 `GameBootstrap` 会在运行时自动创建占位地图、顶部数据栏、底部操作面板和事件弹窗。三个 JSON 配置已绑定到场景中的 `GameBootstrap`。

## 命令行构建

Cocos Creator 3.8 支持命令行构建，但仍需要可交互的 GUI 环境。Windows 可尝试：

```powershell
$logPath = 'C:\codex33\Wen_Yi\temp\wechat-build-command.log'
& 'C:\codex33\tools\CocosCreator-3.8.8\CocosCreator.exe' --project 'C:\codex33\Wen_Yi' --build "platform=wechatgame;debug=true;logDest=$logPath"
```

官方退出码：

- `32`：构建参数不合法。
- `34`：构建过程出错，查看构建日志。
- `36`：构建成功。

如果命令返回后没有生成 `build/wechatgame`，优先回到 Cocos Creator 的构建发布面板手动构建，并从面板导出构建配置后再改用 `configPath` 自动构建。

当前机器已尝试命令行构建；未生成 `build/wechatgame`。优先处理 Cocos Developer 登录状态，再从构建发布面板手动执行一次微信小游戏构建。

## 包体控制

- 首包只放 MVP 必需资源。
- 大图压缩后再导入。
- 复用图标合并图集。
- 背景音乐压缩，避免过长。
- 后续如资源变多，再考虑远程资源方案。

## 发布前检查

- 没有现实疾病、病毒、医疗恐慌表达。
- 没有真实地图或明显国家边界。
- 没有未经记录授权的素材。
- 没有密钥、token、调试私密信息。
- 存档升级兼容旧版本。
