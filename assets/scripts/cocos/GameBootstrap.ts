import {
  _decorator,
  AudioClip,
  AudioSource,
  Button,
  Color,
  Component,
  Graphics,
  JsonAsset,
  Label,
  Node,
  UITransform,
  Vec3,
  Widget,
  sys,
} from 'cc';
import { createInitialGameState } from '../state/createInitialGameState';
import { clearSave, loadGame, saveGame } from '../save/SaveSystem';
import { advanceDay } from '../systems/GameLoopSystem';
import { applyEventChoice } from '../systems/EventSystem';
import { playAudioCue, syncAmbienceAudio, type AudioCue, type AudioCueMap } from '../systems/AudioSystem';
import {
  controlRegion,
  getControlCost,
  getRestoreCost,
  recalculateGlobalRisk,
  recalculateRestoreProgress,
  restoreRegion,
} from '../systems/RegionSystem';
import { buyUpgrade, getUpgradeCost } from '../systems/UpgradeSystem';
import { updateGameResult } from '../systems/VictorySystem';
import type {
  EventChoiceConfig,
  EventConfigFile,
  GameResult,
  GameState,
  GameSettings,
  RegionConfig,
  RegionConfigFile,
  RegionRuntimeState,
  RegionState,
  UpgradeConfigFile,
} from '../types/GameTypes';

const { ccclass, property } = _decorator;

const STATE_COLORS: Record<RegionState, Color> = {
  unaffected: new Color(77, 184, 142, 255),
  latent: new Color(219, 188, 82, 255),
  spreading: new Color(219, 119, 73, 255),
  severe: new Color(197, 70, 82, 255),
  controlled: new Color(91, 157, 219, 255),
  clearing: new Color(132, 204, 190, 255),
};

const STATE_LABELS: Record<RegionState, string> = {
  unaffected: '稳定',
  latent: '潜伏',
  spreading: '扩散中',
  severe: '严重',
  controlled: '受控',
  clearing: '清除中',
};

const TUTORIAL_HINTS: Array<{ id: string; text: string }> = [
  { id: 'select-region', text: '引导：点击地图区域查看状态' },
  { id: 'first-action', text: '引导：选择修复、隔离或升级能力' },
  { id: 'advance-day', text: '引导：推进一天，观察风险和资源变化' },
  { id: 'resolve-event', text: '引导：突发事件出现时，选择一种处理方案' },
];

interface RegionCard {
  regionId: string;
  node: Node;
  nameLabel: Label;
  statusLabel: Label;
  graphics: Graphics;
}

@ccclass('GameBootstrap')
export class GameBootstrap extends Component {
  @property(JsonAsset)
  public regionConfigAsset: JsonAsset | null = null;

  @property(JsonAsset)
  public upgradeConfigAsset: JsonAsset | null = null;

  @property(JsonAsset)
  public eventConfigAsset: JsonAsset | null = null;

  @property(AudioClip)
  public ambienceClip: AudioClip | null = null;

  @property(AudioClip)
  public tapClip: AudioClip | null = null;

  @property(AudioClip)
  public upgradeClip: AudioClip | null = null;

  @property(AudioClip)
  public eventClip: AudioClip | null = null;

  @property(AudioClip)
  public restoreClip: AudioClip | null = null;

  @property(AudioClip)
  public riskClip: AudioClip | null = null;

  @property(AudioClip)
  public victoryClip: AudioClip | null = null;

  @property(AudioClip)
  public failureClip: AudioClip | null = null;

  private regionConfig!: RegionConfigFile;
  private upgradeConfig!: UpgradeConfigFile;
  private eventConfig!: EventConfigFile;
  private state!: GameState;
  private selectedRegionId = '';
  private regionCards: RegionCard[] = [];
  private dayLabel!: Label;
  private resourceLabel!: Label;
  private riskLabel!: Label;
  private progressLabel!: Label;
  private feedbackLabel!: Label;
  private selectedNameLabel!: Label;
  private selectedDetailLabel!: Label;
  private resultPanel!: Node;
  private resultTitleLabel!: Label;
  private resultDetailLabel!: Label;
  private settingsPanel!: Node;
  private musicSettingLabel!: Label;
  private sfxSettingLabel!: Label;
  private hapticsSettingLabel!: Label;
  private upgradeLabels: Label[] = [];
  private eventPanel!: Node;
  private eventTitleLabel!: Label;
  private eventChoiceLabels: Label[] = [];
  private pendingEventChoices: EventChoiceConfig[] = [];
  private musicSource: AudioSource | null = null;
  private sfxSource: AudioSource | null = null;
  private playedResultCue: GameResult | undefined;

  protected start(): void {
    this.loadConfigs();
    this.state = loadGame(localStorageAdapter) ?? createInitialGameState({
      regions: this.regionConfig,
      upgrades: this.upgradeConfig,
      events: this.eventConfig,
    });
    this.selectedRegionId = this.regionConfig.regions[0]?.id ?? '';

    this.buildUi();
    this.buildAudio();
    this.afterStateChange(false);
    this.showTutorialHintIfNeeded();
  }

  private loadConfigs(): void {
    if (!this.regionConfigAsset || !this.upgradeConfigAsset || !this.eventConfigAsset) {
      throw new Error('GameBootstrap config assets are not assigned.');
    }

    this.regionConfig = this.regionConfigAsset.json as RegionConfigFile;
    this.upgradeConfig = this.upgradeConfigAsset.json as UpgradeConfigFile;
    this.eventConfig = this.eventConfigAsset.json as EventConfigFile;
  }

  private buildUi(): void {
    const root = this.node;
    this.clearGeneratedUi(root);

    const topBar = this.createPanel('TopBar', root, 1040, 120, new Vec3(0, 850, 0), new Color(31, 43, 59, 235));
    this.dayLabel = this.createLabel('DayLabel', topBar, '', 28, new Vec3(-390, 22, 0));
    this.resourceLabel = this.createLabel('ResourceLabel', topBar, '', 28, new Vec3(-130, 22, 0));
    this.riskLabel = this.createLabel('RiskLabel', topBar, '', 28, new Vec3(130, 22, 0));
    this.progressLabel = this.createLabel('ProgressLabel', topBar, '', 28, new Vec3(380, 22, 0));
    this.feedbackLabel = this.createLabel('FeedbackLabel', root, '', 23, new Vec3(0, -260, 0));
    this.feedbackLabel.getComponent(UITransform)?.setContentSize(920, 48);

    const mapLayer = new Node('MapLayer');
    root.addChild(mapLayer);
    mapLayer.setPosition(0, 190, 0);

    this.regionCards = this.regionConfig.regions.map((region, index) =>
      this.createRegionCard(mapLayer, region, index),
    );

    const bottomPanel = this.createPanel(
      'BottomPanel',
      root,
      1040,
      500,
      new Vec3(0, -640, 0),
      new Color(24, 32, 44, 245),
    );
    this.selectedNameLabel = this.createLabel('SelectedNameLabel', bottomPanel, '', 32, new Vec3(-405, 190, 0));
    this.selectedDetailLabel = this.createLabel('SelectedDetailLabel', bottomPanel, '', 23, new Vec3(-80, 140, 0));
    this.selectedDetailLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
    this.selectedDetailLabel.overflow = Label.Overflow.RESIZE_HEIGHT;
    this.selectedDetailLabel.getComponent(UITransform)?.setContentSize(800, 92);

    this.createButton('SettingsButton', bottomPanel, '设置', new Vec3(230, 205, 0), () => this.handleOpenSettings(), 140, 48, 22);
    this.createButton('RestartButton', bottomPanel, '重开', new Vec3(390, 205, 0), () => this.handleRestart(), 140, 48, 22);
    this.createButton('RestoreButton', bottomPanel, '修复', new Vec3(-320, 30, 0), () => this.handleRestore(), 220, 68);
    this.createButton('ControlButton', bottomPanel, '隔离', new Vec3(0, 30, 0), () => this.handleControl(), 220, 68);
    this.createButton('AdvanceDayButton', bottomPanel, '推进', new Vec3(320, 30, 0), () => this.handleAdvanceDay(), 220, 68);

    this.upgradeLabels = this.upgradeConfig.upgrades.map((upgrade, index) => {
      const x = -320 + index * 320;
      const button = this.createButton(
        `UpgradeButton${index + 1}`,
        bottomPanel,
        '',
        new Vec3(x, -120, 0),
        () => this.handleBuyUpgrade(upgrade.id),
        220,
        72,
        21,
      );
      const label = button.getChildByName('Label')?.getComponent(Label);
      if (!label) {
        throw new Error('Upgrade button label missing.');
      }
      label.fontSize = 21;
      return label;
    });

    this.buildEventPanel(root);
    this.buildResultPanel(root);
    this.buildSettingsPanel(root);
  }

  private buildAudio(): void {
    const musicNode = new Node('MusicAudioSource');
    this.node.addChild(musicNode);
    this.musicSource = musicNode.addComponent(AudioSource);

    const sfxNode = new Node('SfxAudioSource');
    this.node.addChild(sfxNode);
    this.sfxSource = sfxNode.addComponent(AudioSource);

    this.syncAudioSettings();
  }

  private createRegionCard(parent: Node, region: RegionConfig, index: number): RegionCard {
    const columns = 2;
    const x = index % columns === 0 ? -245 : 245;
    const y = 300 - Math.floor(index / columns) * 155;
    const node = this.createPanel(`Region-${region.id}`, parent, 430, 118, new Vec3(x, y, 0), STATE_COLORS[region.initialState]);
    const nameLabel = this.createLabel('NameLabel', node, region.displayName, 28, new Vec3(-110, 18, 0));
    const statusLabel = this.createLabel('StatusLabel', node, '', 22, new Vec3(105, -24, 0));
    const graphics = node.getComponent(Graphics);

    if (!graphics) {
      throw new Error('Region card graphics missing.');
    }

    node.on(Node.EventType.TOUCH_END, () => {
      this.selectedRegionId = region.id;
      this.completeTutorialStep('select-region');
      this.refreshViews();
      this.showTutorialHintIfNeeded();
    });

    return {
      regionId: region.id,
      node,
      nameLabel,
      statusLabel,
      graphics,
    };
  }

  private buildEventPanel(root: Node): void {
    this.eventPanel = this.createPanel('EventPanel', root, 820, 420, new Vec3(0, 20, 0), new Color(17, 24, 39, 250));
    this.eventPanel.active = false;
    this.eventTitleLabel = this.createLabel('EventTitleLabel', this.eventPanel, '', 34, new Vec3(0, 125, 0));

    this.eventChoiceLabels = [0, 1].map((index) => {
      const button = this.createButton(
        `EventChoice${index + 1}`,
        this.eventPanel,
        '',
        new Vec3(0, 35 - index * 115, 0),
        () => this.handleEventChoice(index),
        660,
        78,
      );
      const label = button.getChildByName('Label')?.getComponent(Label);
      if (!label) {
        throw new Error('Event choice label missing.');
      }
      return label;
    });
  }

  private buildResultPanel(root: Node): void {
    this.resultPanel = this.createPanel('ResultPanel', root, 820, 360, new Vec3(0, 80, 0), new Color(17, 24, 39, 252));
    this.resultPanel.active = false;
    this.resultTitleLabel = this.createLabel('ResultTitleLabel', this.resultPanel, '', 42, new Vec3(0, 90, 0));
    this.resultDetailLabel = this.createLabel('ResultDetailLabel', this.resultPanel, '', 25, new Vec3(0, 15, 0));
    this.resultDetailLabel.getComponent(UITransform)?.setContentSize(680, 120);
    this.resultDetailLabel.overflow = Label.Overflow.RESIZE_HEIGHT;
    this.createButton('ResultRestartButton', this.resultPanel, '重新开始', new Vec3(0, -115, 0), () => this.handleRestart(), 300, 72);
  }

  private buildSettingsPanel(root: Node): void {
    this.settingsPanel = this.createPanel('SettingsPanel', root, 820, 430, new Vec3(0, 35, 0), new Color(17, 24, 39, 252));
    this.settingsPanel.active = false;
    this.createLabel('SettingsTitleLabel', this.settingsPanel, '设置', 40, new Vec3(0, 145, 0));

    this.musicSettingLabel = this.createSettingButton('MusicVolumeButton', new Vec3(0, 70, 0), () => this.handleCycleMusicVolume());
    this.sfxSettingLabel = this.createSettingButton('SfxVolumeButton', new Vec3(0, -10, 0), () => this.handleCycleSfxVolume());
    this.hapticsSettingLabel = this.createSettingButton('HapticsButton', new Vec3(0, -90, 0), () => this.handleToggleHaptics());
    this.createButton('CloseSettingsButton', this.settingsPanel, '关闭', new Vec3(0, -165, 0), () => this.handleCloseSettings(), 260, 64);
  }

  private handleRestore(): void {
    if (this.isGameFinished()) {
      return;
    }

    const selectedRegion = this.getSelectedRegion();
    const success = restoreRegion(this.state, this.regionConfig, this.upgradeConfig, this.selectedRegionId);
    if (success) {
      this.completeTutorialStep('first-action');
      this.playCue('restore');
    }
    this.feedbackLabel.string = success
      ? `${selectedRegion?.displayName ?? '区域'}修复推进`
      : this.getActionBlockedText('修复', selectedRegion);
    this.appendTutorialHintToFeedback();
    this.afterStateChange();
  }

  private handleControl(): void {
    if (this.isGameFinished()) {
      return;
    }

    const selectedRegion = this.getSelectedRegion();
    const success = controlRegion(this.state, this.regionConfig, this.selectedRegionId);
    if (success) {
      this.completeTutorialStep('first-action');
      this.playCue('risk');
    }
    this.feedbackLabel.string = success
      ? `${selectedRegion?.displayName ?? '区域'}进入受控状态`
      : this.getActionBlockedText('隔离', selectedRegion);
    this.appendTutorialHintToFeedback();
    this.afterStateChange();
  }

  private handleAdvanceDay(): void {
    if (this.isGameFinished()) {
      return;
    }

    const riskBefore = this.state.globalRisk;
    const result = advanceDay(this.state, this.regionConfig, this.upgradeConfig, this.eventConfig);
    this.completeTutorialStep('advance-day');
    this.feedbackLabel.string = result.resourceGain > 0
      ? `今日回收明烬 ${result.resourceGain}`
      : '今日没有稳定收益';
    this.appendTutorialHintToFeedback();
    this.afterStateChange();

    if (!result.eventId || this.isGameFinished()) {
      if (this.state.globalRisk > riskBefore) {
        this.playCue('risk');
      }
      return;
    }

    const eventConfig = this.eventConfig.events.find((event) => event.id === result.eventId);
    if (!eventConfig) {
      return;
    }

    this.pendingEventChoices = eventConfig.choices;
    this.eventPanel.active = true;
    this.playCue('event');
    this.eventTitleLabel.string = eventConfig.displayName;
    this.eventChoiceLabels.forEach((label, index) => {
      const choice = eventConfig.choices[index];
      label.node.parent!.active = Boolean(choice);
      label.string = choice ? (choice.cost ? `${choice.label} -${choice.cost}` : choice.label) : '';
    });
  }

  private handleBuyUpgrade(upgradeId: string): void {
    if (this.isGameFinished()) {
      return;
    }

    const upgrade = this.upgradeConfig.upgrades.find((item) => item.id === upgradeId);
    const success = buyUpgrade(this.state, this.upgradeConfig, upgradeId);
    if (success) {
      this.completeTutorialStep('first-action');
      this.playCue('upgrade');
    }
    this.feedbackLabel.string = success
      ? `${upgrade?.displayName ?? '能力'}已升级`
      : this.getUpgradeBlockedText(upgradeId);
    this.appendTutorialHintToFeedback();
    this.afterStateChange();
  }

  private handleOpenSettings(): void {
    this.settingsPanel.active = true;
    this.refreshSettingsPanel();
  }

  private handleCloseSettings(): void {
    this.settingsPanel.active = false;
    this.refreshViews();
  }

  private handleCycleMusicVolume(): void {
    this.state.settings.musicVolume = this.getNextVolumeStep(this.state.settings.musicVolume);
    this.feedbackLabel.string = `BGM 音量 ${this.formatVolume(this.state.settings.musicVolume)}`;
    this.syncAudioSettings();
    this.afterStateChange();
  }

  private handleCycleSfxVolume(): void {
    this.state.settings.sfxVolume = this.getNextVolumeStep(this.state.settings.sfxVolume);
    this.feedbackLabel.string = `音效音量 ${this.formatVolume(this.state.settings.sfxVolume)}`;
    this.syncAudioSettings();
    this.afterStateChange();
  }

  private handleToggleHaptics(): void {
    this.state.settings.hapticsEnabled = !this.state.settings.hapticsEnabled;
    this.feedbackLabel.string = this.state.settings.hapticsEnabled ? '触感反馈已开启' : '触感反馈已关闭';
    this.afterStateChange();
  }

  private handleRestart(): void {
    clearSave(localStorageAdapter);
    this.state = createInitialGameState({
      regions: this.regionConfig,
      upgrades: this.upgradeConfig,
      events: this.eventConfig,
    });
    this.selectedRegionId = this.regionConfig.regions[0]?.id ?? '';
    this.pendingEventChoices = [];
    this.eventPanel.active = false;
    this.resultPanel.active = false;
    this.playedResultCue = undefined;
    this.feedbackLabel.string = '新一轮修复任务已开始';
    this.afterStateChange();
  }

  private handleEventChoice(index: number): void {
    if (this.isGameFinished()) {
      return;
    }

    const choice = this.pendingEventChoices[index];

    if (!choice) {
      return;
    }

    const success = applyEventChoice(this.state, choice);
    if (success) {
      this.completeTutorialStep('resolve-event');
    }
    this.feedbackLabel.string = success ? `已选择：${choice.label}` : '明烬不足，无法处理该事件';
    this.appendTutorialHintToFeedback();

    if (!success) {
      this.refreshViews();
      return;
    }

    this.pendingEventChoices = [];
    this.eventPanel.active = false;
    this.afterStateChange();
  }

  private afterStateChange(shouldSave = true): void {
    recalculateGlobalRisk(this.state, this.regionConfig);
    recalculateRestoreProgress(this.state, this.regionConfig);
    updateGameResult(this.state, this.regionConfig);

    if (shouldSave) {
      saveGame(localStorageAdapter, this.state);
    }

    this.syncAudioSettings();
    this.refreshViews();
  }

  private refreshViews(): void {
    this.dayLabel.string = `第 ${this.state.day} 天`;
    this.resourceLabel.string = `明烬 ${this.state.resources}`;
    this.riskLabel.string = `风险 ${Math.round(this.state.globalRisk * 100)}%`;
    this.progressLabel.string = `恢复 ${Math.round(this.state.globalRestoreProgress * 100)}%`;

    for (const card of this.regionCards) {
      const runtime = this.state.regionStates[card.regionId];
      if (!runtime) {
        continue;
      }

      this.paintPanel(card.graphics, 430, 118, STATE_COLORS[runtime.state]);
      card.statusLabel.string = STATE_LABELS[runtime.state];
      const scale = card.regionId === this.selectedRegionId ? 1.06 : 1;
      card.node.setScale(new Vec3(scale, scale, 1));
    }

    const selectedRegion = this.regionConfig.regions.find((region) => region.id === this.selectedRegionId);
    const selectedRuntime = selectedRegion ? this.state.regionStates[selectedRegion.id] : undefined;
    this.refreshSelectedRegion(selectedRegion, selectedRuntime);
    this.refreshUpgradeLabels();
    this.refreshSettingsPanel();
    this.refreshResultPanel();
  }

  private refreshSelectedRegion(
    selectedRegion: RegionConfig | undefined,
    selectedRuntime: RegionRuntimeState | undefined,
  ): void {
    this.selectedNameLabel.string = selectedRegion?.displayName ?? '未选择区域';

    if (!selectedRegion || !selectedRuntime) {
      this.selectedDetailLabel.string = '点击地图区域查看详情';
      return;
    }

    this.selectedDetailLabel.string =
      `${STATE_LABELS[selectedRuntime.state]} | 人口 ${selectedRegion.population} | ` +
      `修复 ${Math.round(selectedRuntime.restoreProgress * 100)}% | 产出 ${selectedRegion.resourceYield}\n` +
      `修复成本 ${getRestoreCost(selectedRegion.restoreDifficulty)} | ` +
      `隔离成本 ${getControlCost(selectedRegion.restoreDifficulty)}`;
  }

  private refreshUpgradeLabels(): void {
    this.upgradeLabels.forEach((label, index) => {
      const upgrade = this.upgradeConfig.upgrades[index];
      if (!upgrade) {
        label.string = '';
        return;
      }

      const level = this.state.upgradeLevels[upgrade.id] ?? 0;
      const cost = level >= upgrade.maxLevel
        ? '已满'
        : `${getUpgradeCost(upgrade.baseCost, upgrade.costGrowth, level)} 明烬`;
      label.string = `${upgrade.displayName}\nLv.${level}/${upgrade.maxLevel}  ${cost}`;
      this.fitLabelFont(label, 21, 18, 10);
    });
  }

  private refreshSettingsPanel(): void {
    if (!this.settingsPanel || !this.musicSettingLabel || !this.sfxSettingLabel || !this.hapticsSettingLabel) {
      return;
    }

    const settings = this.state.settings;
    this.musicSettingLabel.string = `BGM 音量  ${this.formatVolume(settings.musicVolume)}`;
    this.sfxSettingLabel.string = `音效音量  ${this.formatVolume(settings.sfxVolume)}`;
    this.hapticsSettingLabel.string = `触感反馈  ${settings.hapticsEnabled ? '开' : '关'}`;
  }

  private refreshResultPanel(): void {
    if (!this.state.result || this.state.result === 'playing') {
      this.resultPanel.active = false;
      return;
    }

    this.resultPanel.active = true;

    if (this.state.result === 'victory') {
      this.playResultCueOnce('victory');
      this.resultTitleLabel.string = '归明完成';
      this.resultDetailLabel.string = `第 ${this.state.day} 天，全部区域恢复到稳定秩序。`;
      return;
    }

    this.playResultCueOnce('failure');
    this.resultTitleLabel.string = '静界失守';
    this.resultDetailLabel.string = `第 ${this.state.day} 天，全局风险达到 ${Math.round(this.state.globalRisk * 100)}%。`;
  }

  private getSelectedRegion(): RegionConfig | undefined {
    return this.regionConfig.regions.find((region) => region.id === this.selectedRegionId);
  }

  private getActionBlockedText(actionName: string, selectedRegion: RegionConfig | undefined): string {
    if (!selectedRegion) {
      return `未选择区域，无法${actionName}`;
    }

    const runtime = this.state.regionStates[selectedRegion.id];
    if (!runtime || runtime.state === 'unaffected') {
      return `${selectedRegion.displayName}已经稳定`;
    }

    const cost = actionName === '修复'
      ? getRestoreCost(selectedRegion.restoreDifficulty)
      : getControlCost(selectedRegion.restoreDifficulty);
    if (this.state.resources < cost) {
      return `明烬不足，需要 ${cost}`;
    }

    return `${actionName}未生效`;
  }

  private getUpgradeBlockedText(upgradeId: string): string {
    const upgrade = this.upgradeConfig.upgrades.find((item) => item.id === upgradeId);
    if (!upgrade) {
      return '能力不存在';
    }

    const level = this.state.upgradeLevels[upgrade.id] ?? 0;
    if (level >= upgrade.maxLevel) {
      return `${upgrade.displayName}已满级`;
    }

    return `明烬不足，需要 ${getUpgradeCost(upgrade.baseCost, upgrade.costGrowth, level)}`;
  }

  private isGameFinished(): boolean {
    const finished = Boolean(this.state.result && this.state.result !== 'playing');

    if (finished) {
      this.feedbackLabel.string = '本局已结束，可点击重开';
    }

    return finished;
  }

  private completeTutorialStep(stepId: string): void {
    if (this.state.completedTutorialSteps.indexOf(stepId) >= 0) {
      return;
    }

    this.state.completedTutorialSteps.push(stepId);
    saveGame(localStorageAdapter, this.state);
  }

  private showTutorialHintIfNeeded(): void {
    const hint = this.getNextTutorialHint();
    if (hint) {
      this.feedbackLabel.string = hint;
    }
  }

  private appendTutorialHintToFeedback(): void {
    const hint = this.getNextTutorialHint();
    if (hint && this.feedbackLabel.string.length < 36) {
      this.feedbackLabel.string = `${this.feedbackLabel.string}；${hint}`;
    }
  }

  private getNextTutorialHint(): string {
    return TUTORIAL_HINTS.find((hint) => this.state.completedTutorialSteps.indexOf(hint.id) < 0)?.text ?? '';
  }

  private getNextVolumeStep(currentVolume: number): number {
    const steps = [0, 0.25, 0.5, 0.75, 1];
    const nearestIndex = steps.reduce((bestIndex, step, index) => {
      const bestDistance = Math.abs(steps[bestIndex] - currentVolume);
      const distance = Math.abs(step - currentVolume);
      return distance < bestDistance ? index : bestIndex;
    }, 0);

    return steps[(nearestIndex + 1) % steps.length];
  }

  private formatVolume(volume: GameSettings['musicVolume']): string {
    return `${Math.round(volume * 100)}%`;
  }

  private syncAudioSettings(): void {
    syncAmbienceAudio(this.musicSource, this.ambienceClip, this.state.settings);
  }

  private playCue(cue: AudioCue): void {
    playAudioCue(this.sfxSource, cue, this.getAudioCueMap(), this.state.settings);
  }

  private playResultCueOnce(result: Exclude<GameResult, 'playing'>): void {
    if (this.playedResultCue === result) {
      return;
    }

    this.playedResultCue = result;
    this.playCue(result);
  }

  private getAudioCueMap(): AudioCueMap {
    return {
      tap: this.tapClip,
      restore: this.restoreClip,
      upgrade: this.upgradeClip,
      event: this.eventClip,
      risk: this.riskClip,
      victory: this.victoryClip,
      failure: this.failureClip,
    };
  }

  private createPanel(name: string, parent: Node, width: number, height: number, position: Vec3, color: Color): Node {
    const node = new Node(name);
    parent.addChild(node);
    node.setPosition(position);

    const transform = node.addComponent(UITransform);
    transform.setContentSize(width, height);

    const graphics = node.addComponent(Graphics);
    this.paintPanel(graphics, width, height, color);

    return node;
  }

  private clearGeneratedUi(root: Node): void {
    for (let index = root.children.length - 1; index >= 0; index -= 1) {
      const child = root.children[index];
      if (child.name !== 'Camera') {
        child.destroy();
      }
    }
  }

  private paintPanel(graphics: Graphics, width: number, height: number, color: Color): void {
    graphics.clear();
    graphics.fillColor = color;
    graphics.roundRect(-width / 2, -height / 2, width, height, 8);
    graphics.fill();
  }

  private createLabel(name: string, parent: Node, text: string, fontSize: number, position: Vec3): Label {
    const node = new Node(name);
    parent.addChild(node);
    node.setPosition(position);

    const transform = node.addComponent(UITransform);
    transform.setContentSize(260, 44);

    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = Math.ceil(fontSize * 1.2);
    label.color = new Color(238, 242, 247, 255);
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;

    return label;
  }

  private createButton(
    name: string,
    parent: Node,
    text: string,
    position: Vec3,
    onClick: () => void,
    width = 250,
    height = 76,
    fontSize = 26,
  ): Node {
    const buttonNode = this.createPanel(name, parent, width, height, position, new Color(59, 130, 180, 255));
    buttonNode.addComponent(Button);
    buttonNode.on(Button.EventType.CLICK, () => {
      this.playCue('tap');
      onClick();
    });
    const label = this.createLabel('Label', buttonNode, text, fontSize, new Vec3(0, 0, 0));
    label.getComponent(UITransform)?.setContentSize(width - 20, height - 8);

    const widget = buttonNode.addComponent(Widget);
    widget.alignMode = Widget.AlignMode.ONCE;

    return buttonNode;
  }

  private createSettingButton(name: string, position: Vec3, onClick: () => void): Label {
    const button = this.createButton(name, this.settingsPanel, '', position, onClick, 620, 64);
    const label = button.getChildByName('Label')?.getComponent(Label);
    if (!label) {
      throw new Error('Setting button label missing.');
    }

    label.fontSize = 24;
    return label;
  }

  private fitLabelFont(label: Label, maxSize: number, minSize: number, maxCharsPerLine: number): void {
    const longestLine = label.string.split('\n').reduce((longest, line) => Math.max(longest, line.length), 0);
    label.fontSize = longestLine > maxCharsPerLine ? minSize : maxSize;
    label.lineHeight = Math.ceil(label.fontSize * 1.2);
  }
}

const localStorageAdapter = {
  getItem: (key: string): string | null => sys.localStorage.getItem(key),
  setItem: (key: string, value: string): void => sys.localStorage.setItem(key, value),
  removeItem: (key: string): void => sys.localStorage.removeItem(key),
};
