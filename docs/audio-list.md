# 音效清单

## 结论

第一阶段只做必要音效，先保证操作反馈和事件反馈清楚，不堆复杂配乐。

## 音频原则

- 运行时不调用 AI 生成音频。
- 音量统一。
- 循环音需要处理无缝循环点。
- 导入前压缩，控制微信小游戏包体。
- 文件名使用 `kebab-case`。

## MVP 音效

| 文件名 | 用途 | 类型 | 备注 |
| --- | --- | --- | --- |
| `sfx-tap.mp3` | 普通点击 | 短音效 | 轻、短、低干扰 |
| `sfx-upgrade.mp3` | 升级成功 | 短音效 | 有明确正反馈 |
| `sfx-event.mp3` | 事件出现 | 短音效 | 不刺耳 |
| `sfx-restore.mp3` | 区域修复 | 短音效 | 明亮但克制 |
| `sfx-risk.mp3` | 风险上升 | 短音效 | 提醒玩家注意 |
| `sfx-victory.mp3` | 胜利 | 短音效 | 2 到 4 秒 |
| `sfx-failure.mp3` | 失败 | 短音效 | 2 到 4 秒 |
| `ambience-main.mp3` | 主界面氛围 | 循环音 | 可关闭，默认低音量 |

## 当前接入状态

- `assets/scripts/systems/AudioSystem.ts` 已提供 BGM 同步、短音效播放和音量限制。
- `GameBootstrap` 已预留音频属性：`ambienceClip`、`tapClip`、`upgradeClip`、`eventClip`、`restoreClip`、`riskClip`、`victoryClip`、`failureClip`。
- 设置面板里的 BGM 音量和音效音量会实时影响 `AudioSource`。
- 当前仓库还没有正式音频素材；未绑定 `AudioClip` 时系统会静默跳过播放。

## 绑定规则

音频素材入库后，在 Cocos Creator 中打开 `assets/scenes/main.scene`，选中挂有 `GameBootstrap` 的 `Canvas`，按用途拖入对应属性：

- `ambience-main.mp3` -> `ambienceClip`
- `sfx-tap.mp3` -> `tapClip`
- `sfx-upgrade.mp3` -> `upgradeClip`
- `sfx-event.mp3` -> `eventClip`
- `sfx-restore.mp3` -> `restoreClip`
- `sfx-risk.mp3` -> `riskClip`
- `sfx-victory.mp3` -> `victoryClip`
- `sfx-failure.mp3` -> `failureClip`

## 入库记录模板

```text
assetName:
usage:
tool:
promptOrSource:
sourceDate:
license:
editedBy:
volumeNormalized:
loopPoint:
finalPath:
notes:
```

## 验收标准

- 连续点击不会刺耳。
- 手机外放可听清关键提示。
- 事件提示不会和升级音混淆。
- 背景氛围音不遮盖操作音效。
- 静音和音量设置生效。
