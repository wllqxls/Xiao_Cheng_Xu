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
  view,
} from 'cc';
import { createInitialGameState } from '../state/createInitialGameState';
import { clearSave, loadGame, saveGame } from '../save/SaveSystem';
import { advanceDay } from '../systems/GameLoopSystem';
import { applyEventChoice } from '../systems/EventSystem';
import { playAudioCue, syncAmbienceAudio, type AudioCue, type AudioCueMap } from '../systems/AudioSystem';
import {
  controlRegion,
  controlTrafficHub,
  getControlCost,
  getRestoreCost,
  getTrafficControlCost,
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
  RegionCategory,
  RegionConfig,
  RegionConfigFile,
  RegionRuntimeState,
  RegionState,
  RegionTechLevel,
  TransportHub,
  UpgradeConfigFile,
} from '../types/GameTypes';

const { ccclass, property } = _decorator;

const PORTRAIT_DESIGN_WIDTH = 1080;
const PORTRAIT_DESIGN_HEIGHT = 1920;
const REGION_CARD_BASE_WIDTH = 258;
const REGION_CARD_BASE_HEIGHT = 82;

interface ButtonVisualStyle {
  fill: Color;
  label?: Color;
}

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

const CATEGORY_LABELS: Record<RegionCategory, string> = {
  capital: '核心城',
  portCity: '港口城',
  forest: '森林区',
  mountain: '山地区',
  farmland: '农田带',
  industrial: '工业区',
  techCampus: '科技院',
  airportHub: '空港枢纽',
  islandChain: '群岛',
  researchOutpost: '研究站',
};

const TECH_LEVEL_LABELS: Record<RegionTechLevel, string> = {
  low: '低技术',
  standard: '常规',
  industrial: '工业化',
  advanced: '先进',
};

const TRANSPORT_LABELS: Record<TransportHub, string> = {
  port: '港口',
  airport: '机场',
  rail: '铁路',
  road: '道路',
  seaRoute: '航线',
};

const CATEGORY_MARKS: Record<RegionCategory, string> = {
  capital: '城',
  portCity: '港',
  forest: '森',
  mountain: '山',
  farmland: '田',
  industrial: '工',
  techCampus: '科',
  airportHub: '机',
  islandChain: '岛',
  researchOutpost: '研',
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
  categoryLabel: Label;
  nameLabel: Label;
  statusLabel: Label;
  graphics: Graphics;
  width: number;
  height: number;
}

interface MapPoint {
  x: number;
  y: number;
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
    const designRoot = this.createDesignRoot(root);

    const topBar = this.createPanel('TopBar', designRoot, 1040, 120, new Vec3(0, 850, 0), new Color(31, 43, 59, 235));
    this.dayLabel = this.createLabel('DayLabel', topBar, '', 28, new Vec3(-390, 22, 0));
    this.resourceLabel = this.createLabel('ResourceLabel', topBar, '', 28, new Vec3(-130, 22, 0));
    this.riskLabel = this.createLabel('RiskLabel', topBar, '', 28, new Vec3(130, 22, 0));
    this.progressLabel = this.createLabel('ProgressLabel', topBar, '', 28, new Vec3(380, 22, 0));
    this.feedbackLabel = this.createLabel('FeedbackLabel', designRoot, '', 23, new Vec3(0, -260, 0));
    this.feedbackLabel.getComponent(UITransform)?.setContentSize(920, 48);

    const mapLayer = new Node('MapLayer');
    designRoot.addChild(mapLayer);
    mapLayer.setPosition(0, 190, 0);

    this.buildMapBackdrop(mapLayer);
    this.buildRouteLayer(mapLayer);
    this.regionCards = this.regionConfig.regions.map((region, index) =>
      this.createRegionCard(mapLayer, region, index),
    );

    const bottomPanel = this.createPanel(
      'BottomPanel',
      designRoot,
      1040,
      500,
      new Vec3(0, -640, 0),
      new Color(24, 32, 44, 245),
    );
    this.selectedNameLabel = this.createLabel('SelectedNameLabel', bottomPanel, '', 34, new Vec3(-405, 190, 0));
    this.selectedNameLabel.getComponent(UITransform)?.setContentSize(260, 52);
    this.addReadableLabelOutline(this.selectedNameLabel);

    this.selectedDetailLabel = this.createLabel('SelectedDetailLabel', bottomPanel, '', 22, new Vec3(-70, 128, 0));
    this.selectedDetailLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
    this.selectedDetailLabel.overflow = Label.Overflow.RESIZE_HEIGHT;
    this.selectedDetailLabel.lineHeight = 29;
    this.selectedDetailLabel.getComponent(UITransform)?.setContentSize(820, 156);

    const regionActionStyle = { fill: new Color(43, 143, 156, 255) };
    const primaryActionStyle = { fill: new Color(210, 146, 58, 255) };
    const utilityActionStyle = { fill: new Color(70, 82, 98, 255) };
    const upgradeActionStyle = { fill: new Color(89, 108, 174, 255) };

    this.createButton(
      'SettingsButton',
      bottomPanel,
      '设置',
      new Vec3(230, 205, 0),
      () => this.handleOpenSettings(),
      140,
      48,
      22,
      utilityActionStyle,
    );
    this.createButton(
      'RestartButton',
      bottomPanel,
      '重开',
      new Vec3(390, 205, 0),
      () => this.handleRestart(),
      140,
      48,
      22,
      utilityActionStyle,
    );

    this.createSectionLabel(bottomPanel, '区域行动', new Vec3(-420, 54, 0));
    this.createSectionLabel(bottomPanel, '全局流程', new Vec3(190, 54, 0));
    this.createSectionLabel(bottomPanel, '强化', new Vec3(-420, -92, 0));

    this.createButton(
      'RestoreButton',
      bottomPanel,
      '修复',
      new Vec3(-350, -8, 0),
      () => this.handleRestore(),
      170,
      62,
      24,
      regionActionStyle,
    );
    this.createButton(
      'ControlButton',
      bottomPanel,
      '隔离',
      new Vec3(-160, -8, 0),
      () => this.handleControl(),
      170,
      62,
      24,
      regionActionStyle,
    );
    this.createButton(
      'TrafficControlButton',
      bottomPanel,
      '管控',
      new Vec3(30, -8, 0),
      () => this.handleTrafficControl(),
      170,
      62,
      24,
      regionActionStyle,
    );
    this.createButton(
      'AdvanceDayButton',
      bottomPanel,
      '推进一天',
      new Vec3(320, -8, 0),
      () => this.handleAdvanceDay(),
      210,
      68,
      25,
      primaryActionStyle,
    );

    this.upgradeLabels = this.upgradeConfig.upgrades.map((upgrade, index) => {
      const x = -300 + index * 300;
      const button = this.createButton(
        `UpgradeButton${index + 1}`,
        bottomPanel,
        '',
        new Vec3(x, -150, 0),
        () => this.handleBuyUpgrade(upgrade.id),
        240,
        68,
        20,
        upgradeActionStyle,
      );
      const label = button.getChildByName('Label')?.getComponent(Label);
      if (!label) {
        throw new Error('Upgrade button label missing.');
      }
      label.fontSize = 20;
      return label;
    });

    this.buildEventPanel(designRoot);
    this.buildResultPanel(designRoot);
    this.buildSettingsPanel(designRoot);
  }

  private createDesignRoot(root: Node): Node {
    const designRoot = new Node('GeneratedUiRoot');
    root.addChild(designRoot);

    const transform = designRoot.addComponent(UITransform);
    transform.setContentSize(PORTRAIT_DESIGN_WIDTH, PORTRAIT_DESIGN_HEIGHT);

    const frameSize = view.getFrameSize();
    const scale = this.calculatePortraitViewportScale(frameSize.width, frameSize.height);
    designRoot.setScale(new Vec3(scale, scale, 1));

    return designRoot;
  }

  private calculatePortraitViewportScale(visibleWidth: number, visibleHeight: number): number {
    if (visibleWidth <= 0 || visibleHeight <= 0) {
      return 1;
    }

    const designAspect = PORTRAIT_DESIGN_WIDTH / PORTRAIT_DESIGN_HEIGHT;
    const visibleAspect = visibleWidth / visibleHeight;

    if (visibleWidth < PORTRAIT_DESIGN_WIDTH || visibleAspect <= designAspect) {
      return 1;
    }

    return Math.min(1, visibleHeight / PORTRAIT_DESIGN_HEIGHT);
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

  private buildMapBackdrop(parent: Node): void {
    const ocean = this.createPanel('OceanBackdrop', parent, 930, 760, new Vec3(0, 12, 0), new Color(30, 86, 118, 255));
    const graphics = ocean.getComponent(Graphics);
    if (!graphics) {
      return;
    }

    this.paintOceanBackdrop(graphics, 930, 760);
    this.createLabel('MapTitleLabel', ocean, '归明海图', 24, new Vec3(-360, 332, 0));
    this.createLabel('MapLegendLabel', ocean, '青 稳定  黄 潜伏  红 侵蚀  蓝 受控', 20, new Vec3(170, 332, 0))
      .getComponent(UITransform)?.setContentSize(540, 36);
  }

  private buildRouteLayer(parent: Node): void {
    const routeNode = new Node('RouteLayer');
    parent.addChild(routeNode);
    const transform = routeNode.addComponent(UITransform);
    transform.setContentSize(930, 760);
    const graphics = routeNode.addComponent(Graphics);

    const drawnRoutes = new Set<string>();
    for (const region of this.regionConfig.regions) {
      const from = this.getMapPoint(region);
      for (const neighborId of region.neighbors) {
        const neighbor = this.regionConfig.regions.find((item) => item.id === neighborId);
        if (!neighbor) {
          continue;
        }

        const routeKey = [region.id, neighbor.id].sort().join(':');
        if (drawnRoutes.has(routeKey)) {
          continue;
        }

        drawnRoutes.add(routeKey);
        const to = this.getMapPoint(neighbor);
        const isAirRoute = region.transportHubs.indexOf('airport') >= 0 || neighbor.transportHubs.indexOf('airport') >= 0;
        const isSeaRoute = region.transportHubs.indexOf('port') >= 0
          || region.transportHubs.indexOf('seaRoute') >= 0
          || neighbor.transportHubs.indexOf('port') >= 0
          || neighbor.transportHubs.indexOf('seaRoute') >= 0;
        this.drawRoute(graphics, from, to, isAirRoute, isSeaRoute);

        if (isAirRoute || isSeaRoute) {
          this.createRouteMarker(routeNode, from, to, isAirRoute ? '机' : '船');
        }
      }
    }
  }

  private createRegionCard(parent: Node, region: RegionConfig, index: number): RegionCard {
    const mapPoint = this.getMapPoint(region, index);
    const mapPosition = region.mapPosition ?? { x: 0.5, y: 0.5, size: 1 };
    const width = Math.round(REGION_CARD_BASE_WIDTH * mapPosition.size);
    const height = Math.round(REGION_CARD_BASE_HEIGHT * mapPosition.size);
    const node = this.createPanel(
      `Region-${region.id}`,
      parent,
      width,
      height,
      new Vec3(mapPoint.x, mapPoint.y, 0),
      STATE_COLORS[region.initialState],
    );
    const categoryLabel = this.createLabel(
      'CategoryLabel',
      node,
      CATEGORY_MARKS[region.category],
      18,
      new Vec3(-width / 2 + 25, 12, 0),
    );
    categoryLabel.getComponent(UITransform)?.setContentSize(36, 30);
    this.addReadableLabelOutline(categoryLabel);

    const nameLabel = this.createLabel('NameLabel', node, region.displayName, 21, new Vec3(18, 13, 0));
    nameLabel.getComponent(UITransform)?.setContentSize(width - 66, 32);
    this.addReadableLabelOutline(nameLabel);

    const statusLabel = this.createLabel(
      'StatusLabel',
      node,
      '',
      17,
      new Vec3(18, -17, 0),
    );
    statusLabel.getComponent(UITransform)?.setContentSize(width - 66, 28);
    this.addReadableLabelOutline(statusLabel);
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
      categoryLabel,
      nameLabel,
      statusLabel,
      graphics,
      width,
      height,
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

  private handleTrafficControl(): void {
    if (this.isGameFinished()) {
      return;
    }

    const selectedRegion = this.getSelectedRegion();
    const success = controlTrafficHub(this.state, this.regionConfig, this.selectedRegionId);
    if (success) {
      this.completeTutorialStep('first-action');
      this.playCue('risk');
    }
    this.feedbackLabel.string = success
      ? `${selectedRegion?.displayName ?? '区域'}交通管控 3 天`
      : this.getTrafficControlBlockedText(selectedRegion);
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

      const region = this.regionConfig.regions.find((item) => item.id === card.regionId);
      if (region) {
        this.paintRegionMarker(
          card.graphics,
          card.width,
          card.height,
          STATE_COLORS[runtime.state],
          region,
          runtime,
          card.regionId === this.selectedRegionId,
        );
      } else {
        this.paintPanel(card.graphics, card.width, card.height, STATE_COLORS[runtime.state]);
      }
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
      `状态 ${STATE_LABELS[selectedRuntime.state]} · ${this.getRegionCategoryLabel(selectedRegion)} · ${this.getTechLevelLabel(selectedRegion)}\n` +
      `人口 ${this.formatPopulation(selectedRegion.population)} · 产出 ${selectedRegion.resourceYield} · 修复 ${Math.round(selectedRuntime.restoreProgress * 100)}%\n` +
      `成本 修复 ${getRestoreCost(selectedRegion.restoreDifficulty)} · 隔离 ${getControlCost(selectedRegion.restoreDifficulty)} · 管控 ${this.formatTrafficControlCost(selectedRegion)}\n` +
      `交通 ${this.formatTransportHubs(selectedRegion)} · 管控剩余 ${selectedRuntime.trafficControlTurns} 天`;
  }

  private getRegionCategoryLabel(region: RegionConfig): string {
    return CATEGORY_LABELS[region.category] ?? '区域';
  }

  private getTechLevelLabel(region: RegionConfig): string {
    return TECH_LEVEL_LABELS[region.techLevel] ?? '常规';
  }

  private formatTransportHubs(region: RegionConfig): string {
    if (!region.transportHubs.length) {
      return '无';
    }

    return region.transportHubs.map((hub) => TRANSPORT_LABELS[hub] ?? hub).join('/');
  }

  private formatTrafficControlCost(region: RegionConfig): string {
    return this.hasTrafficControlTarget(region) ? `${getTrafficControlCost(region)}` : '不可用';
  }

  private hasTrafficControlTarget(region: RegionConfig): boolean {
    return region.transportHubs.indexOf('airport') >= 0
      || region.transportHubs.indexOf('port') >= 0
      || region.transportHubs.indexOf('seaRoute') >= 0;
  }

  private formatPopulation(population: number): string {
    if (population >= 10000) {
      return `${Math.round(population / 10000)}万`;
    }

    return `${population}`;
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

  private getTrafficControlBlockedText(selectedRegion: RegionConfig | undefined): string {
    if (!selectedRegion) {
      return '未选择区域，无法管控交通';
    }

    if (!this.hasTrafficControlTarget(selectedRegion)) {
      return `${selectedRegion.displayName}没有港口、机场或航线`;
    }

    const runtime = this.state.regionStates[selectedRegion.id];
    if (runtime?.trafficControlTurns && runtime.trafficControlTurns > 0) {
      return `${selectedRegion.displayName}已在交通管控中`;
    }

    const cost = getTrafficControlCost(selectedRegion);
    if (this.state.resources < cost) {
      return `明烬不足，需要 ${cost}`;
    }

    return '交通管控未生效';
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

  private paintOceanBackdrop(graphics: Graphics, width: number, height: number): void {
    graphics.clear();
    graphics.fillColor = new Color(27, 82, 115, 255);
    graphics.roundRect(-width / 2, -height / 2, width, height, 18);
    graphics.fill();

    graphics.fillColor = new Color(68, 126, 120, 185);
    graphics.ellipse(-90, 30, 250, 330);
    graphics.fill();
    graphics.ellipse(165, -115, 210, 250);
    graphics.fill();
    graphics.ellipse(250, 145, 140, 155);
    graphics.fill();
    graphics.ellipse(-255, -175, 105, 120);
    graphics.fill();

    graphics.strokeColor = new Color(151, 203, 205, 115);
    graphics.lineWidth = 2;
    for (let index = 0; index < 9; index += 1) {
      const y = -310 + index * 76;
      graphics.moveTo(-420, y);
      graphics.bezierCurveTo(-230, y + 32, -80, y - 28, 110, y + 8);
      graphics.bezierCurveTo(230, y + 34, 320, y - 18, 420, y + 18);
      graphics.stroke();
    }
  }

  private paintRegionMarker(
    graphics: Graphics,
    width: number,
    height: number,
    color: Color,
    region: RegionConfig,
    runtime: RegionRuntimeState,
    selected: boolean,
  ): void {
    graphics.clear();
    graphics.fillColor = new Color(color.r, color.g, color.b, 228);
    graphics.roundRect(-width / 2, -height / 2, width, height, 18);
    graphics.fill();

    graphics.strokeColor = new Color(235, 244, 245, 210);
    graphics.lineWidth = runtime.state === 'severe' ? 4 : 2;
    graphics.roundRect(-width / 2, -height / 2, width, height, 18);
    graphics.stroke();

    if (selected) {
      graphics.strokeColor = new Color(255, 239, 164, 245);
      graphics.lineWidth = 5;
      graphics.roundRect(-width / 2 - 4, -height / 2 - 4, width + 8, height + 8, 20);
      graphics.stroke();
    }

    this.paintRegionLandmarks(graphics, width, height, region);
    this.paintTrafficControlBadge(graphics, width, height, runtime);

    const severity = this.getVisualCorruptionSeverity(region, runtime);
    if (severity <= 0) {
      return;
    }

    graphics.fillColor = new Color(177, 38, 45, Math.round(60 + severity * 105));
    graphics.roundRect(-width / 2 + 8, -height / 2 + 8, width - 16, height - 16, 14);
    graphics.fill();

    const dotCount = Math.max(2, Math.round(4 + region.corruptionProfile.dotDensity * 12 + severity * 10));
    graphics.fillColor = new Color(255, 83, 69, 215);
    for (let index = 0; index < dotCount; index += 1) {
      const point = this.getCorruptionDotPoint(region.id, index, width, height);
      const radius = 2 + ((index + region.id.length) % 4) + severity * 2;
      graphics.circle(point.x, point.y, radius);
      graphics.fill();
    }
  }

  private paintTrafficControlBadge(graphics: Graphics, width: number, height: number, runtime: RegionRuntimeState): void {
    if (runtime.trafficControlTurns <= 0) {
      return;
    }

    graphics.fillColor = new Color(70, 210, 220, 210);
    graphics.roundRect(width / 2 - 48, height / 2 - 26, 38, 18, 8);
    graphics.fill();
    graphics.strokeColor = new Color(227, 252, 252, 230);
    graphics.lineWidth = 2;
    graphics.moveTo(width / 2 - 40, height / 2 - 17);
    graphics.lineTo(width / 2 - 20, height / 2 - 17);
    graphics.stroke();
  }

  private paintRegionLandmarks(graphics: Graphics, width: number, height: number, region: RegionConfig): void {
    switch (region.category) {
      case 'capital':
      case 'portCity':
        this.paintCityLandmarks(graphics, width, height, region.category === 'portCity');
        break;
      case 'forest':
        this.paintForestLandmarks(graphics, width, height);
        break;
      case 'mountain':
        this.paintMountainLandmarks(graphics, width, height);
        break;
      case 'farmland':
        this.paintFarmlandLandmarks(graphics, width, height);
        break;
      case 'industrial':
        this.paintIndustrialLandmarks(graphics, width, height);
        break;
      case 'techCampus':
      case 'researchOutpost':
        this.paintResearchLandmarks(graphics, width, height);
        break;
      case 'airportHub':
        this.paintAirportLandmarks(graphics, width, height);
        break;
      case 'islandChain':
        this.paintIslandLandmarks(graphics, width, height);
        break;
      default:
        break;
    }
  }

  private paintCityLandmarks(graphics: Graphics, width: number, height: number, hasPort: boolean): void {
    graphics.fillColor = new Color(238, 232, 194, 190);
    for (let index = 0; index < 5; index += 1) {
      const x = -width * 0.23 + index * width * 0.1;
      const buildingHeight = 10 + (index % 3) * 7;
      graphics.rect(x, -height * 0.22, width * 0.055, buildingHeight);
      graphics.fill();
    }

    if (!hasPort) {
      return;
    }

    graphics.strokeColor = new Color(213, 235, 231, 180);
    graphics.lineWidth = 2;
    graphics.moveTo(width * 0.22, -height * 0.24);
    graphics.lineTo(width * 0.38, -height * 0.24);
    graphics.moveTo(width * 0.28, -height * 0.34);
    graphics.lineTo(width * 0.28, -height * 0.14);
    graphics.stroke();
  }

  private paintForestLandmarks(graphics: Graphics, width: number, height: number): void {
    graphics.fillColor = new Color(34, 102, 75, 180);
    for (let index = 0; index < 7; index += 1) {
      const x = -width * 0.3 + index * width * 0.1;
      const y = -height * 0.17 + (index % 2) * height * 0.16;
      graphics.circle(x, y, 9);
      graphics.fill();
    }
  }

  private paintMountainLandmarks(graphics: Graphics, width: number, height: number): void {
    graphics.strokeColor = new Color(239, 230, 199, 180);
    graphics.lineWidth = 3;
    for (let index = 0; index < 3; index += 1) {
      const x = -width * 0.26 + index * width * 0.2;
      graphics.moveTo(x - 16, -height * 0.18);
      graphics.lineTo(x, height * 0.12);
      graphics.lineTo(x + 18, -height * 0.18);
      graphics.stroke();
    }
  }

  private paintFarmlandLandmarks(graphics: Graphics, width: number, height: number): void {
    graphics.strokeColor = new Color(235, 222, 137, 170);
    graphics.lineWidth = 2;
    for (let index = 0; index < 5; index += 1) {
      const y = -height * 0.22 + index * height * 0.1;
      graphics.moveTo(-width * 0.32, y);
      graphics.lineTo(width * 0.34, y + 8);
      graphics.stroke();
    }
  }

  private paintIndustrialLandmarks(graphics: Graphics, width: number, height: number): void {
    graphics.fillColor = new Color(88, 95, 100, 185);
    graphics.rect(-width * 0.26, -height * 0.23, width * 0.28, height * 0.22);
    graphics.fill();
    graphics.rect(width * 0.08, -height * 0.22, width * 0.07, height * 0.38);
    graphics.fill();
    graphics.strokeColor = new Color(235, 204, 171, 135);
    graphics.lineWidth = 2;
    graphics.moveTo(width * 0.16, height * 0.16);
    graphics.bezierCurveTo(width * 0.22, height * 0.28, width * 0.3, height * 0.12, width * 0.36, height * 0.22);
    graphics.stroke();
  }

  private paintResearchLandmarks(graphics: Graphics, width: number, height: number): void {
    graphics.strokeColor = new Color(226, 245, 250, 180);
    graphics.lineWidth = 2;
    graphics.circle(-width * 0.16, -height * 0.05, 13);
    graphics.stroke();
    graphics.circle(width * 0.08, height * 0.02, 18);
    graphics.stroke();
    graphics.moveTo(-width * 0.03, -height * 0.05);
    graphics.lineTo(width * 0.24, -height * 0.18);
    graphics.stroke();
  }

  private paintAirportLandmarks(graphics: Graphics, width: number, height: number): void {
    graphics.strokeColor = new Color(244, 238, 205, 185);
    graphics.lineWidth = 5;
    graphics.moveTo(-width * 0.27, -height * 0.2);
    graphics.lineTo(width * 0.32, height * 0.17);
    graphics.stroke();
    graphics.lineWidth = 2;
    graphics.moveTo(-width * 0.05, -height * 0.02);
    graphics.lineTo(width * 0.08, -height * 0.18);
    graphics.moveTo(width * 0.07, height * 0.06);
    graphics.lineTo(width * 0.22, height * 0.02);
    graphics.stroke();
  }

  private paintIslandLandmarks(graphics: Graphics, width: number, height: number): void {
    graphics.fillColor = new Color(120, 178, 139, 185);
    graphics.ellipse(-width * 0.24, -height * 0.08, 26, 15);
    graphics.fill();
    graphics.ellipse(-width * 0.02, height * 0.1, 32, 18);
    graphics.fill();
    graphics.ellipse(width * 0.25, -height * 0.14, 24, 14);
    graphics.fill();
  }

  private drawRoute(graphics: Graphics, from: MapPoint, to: MapPoint, isAirRoute: boolean, isSeaRoute: boolean): void {
    graphics.strokeColor = isAirRoute
      ? new Color(255, 166, 93, 175)
      : isSeaRoute
        ? new Color(120, 214, 232, 150)
        : new Color(186, 201, 179, 110);
    graphics.lineWidth = isAirRoute || isSeaRoute ? 3 : 2;
    graphics.moveTo(from.x, from.y);
    const lift = isAirRoute ? 55 : 28;
    graphics.quadraticCurveTo((from.x + to.x) / 2, (from.y + to.y) / 2 + lift, to.x, to.y);
    graphics.stroke();

    if (isAirRoute || isSeaRoute) {
      graphics.strokeColor = new Color(224, 63, 57, 100);
      graphics.lineWidth = 1.5;
      graphics.moveTo(from.x, from.y);
      graphics.quadraticCurveTo((from.x + to.x) / 2, (from.y + to.y) / 2 + lift + 10, to.x, to.y);
      graphics.stroke();
    }
  }

  private createRouteMarker(parent: Node, from: MapPoint, to: MapPoint, text: string): void {
    const x = (from.x + to.x) / 2;
    const y = (from.y + to.y) / 2 + (text === '机' ? 42 : 20);
    const label = this.createLabel(`RouteMarker-${text}-${Math.round(x)}-${Math.round(y)}`, parent, text, 18, new Vec3(x, y, 0));
    label.getComponent(UITransform)?.setContentSize(34, 28);
    label.color = new Color(255, 216, 161, 235);
  }

  private getMapPoint(region: RegionConfig, index = 0): MapPoint {
    const columns = 2;
    const fallbackX = index % columns === 0 ? 0.28 : 0.72;
    const fallbackY = 0.78 - Math.floor(index / columns) * 0.16;
    const mapPosition = region.mapPosition ?? { x: fallbackX, y: fallbackY, size: 1 };
    return {
      x: (mapPosition.x - 0.5) * 780,
      y: (mapPosition.y - 0.5) * 650,
    };
  }

  private getVisualCorruptionSeverity(region: RegionConfig, runtime: RegionRuntimeState): number {
    const stateSeverity: Record<RegionState, number> = {
      unaffected: 0,
      latent: 0.25,
      spreading: 0.58,
      severe: 1,
      controlled: 0.16,
      clearing: 0.36,
    };
    return Math.min(1, stateSeverity[runtime.state] * region.corruptionProfile.overlayIntensity);
  }

  private getCorruptionDotPoint(regionId: string, index: number, width: number, height: number): MapPoint {
    const seed = this.hashString(`${regionId}:${index}`);
    const xRatio = ((seed * 37) % 100) / 100;
    const yRatio = ((seed * 71) % 100) / 100;
    return {
      x: -width * 0.38 + xRatio * width * 0.76,
      y: -height * 0.28 + yRatio * height * 0.56,
    };
  }

  private hashString(value: string): number {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash * 31 + value.charCodeAt(index)) % 9973;
    }
    return hash;
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

  private addReadableLabelOutline(label: Label): void {
    label.outlineColor = new Color(18, 27, 38, 220);
    label.outlineWidth = 2;
  }

  private createSectionLabel(parent: Node, text: string, position: Vec3, width = 220): Label {
    const label = this.createLabel(`${text}SectionLabel`, parent, text, 20, position);
    label.horizontalAlign = Label.HorizontalAlign.LEFT;
    label.color = new Color(156, 199, 214, 255);
    label.getComponent(UITransform)?.setContentSize(width, 30);
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
    style: ButtonVisualStyle = { fill: new Color(59, 130, 180, 255) },
  ): Node {
    const buttonNode = this.createPanel(name, parent, width, height, position, style.fill);
    buttonNode.addComponent(Button);
    buttonNode.on(Button.EventType.CLICK, () => {
      this.playCue('tap');
      onClick();
    });
    const label = this.createLabel('Label', buttonNode, text, fontSize, new Vec3(0, 0, 0));
    label.getComponent(UITransform)?.setContentSize(width - 20, height - 8);
    label.color = style.label ?? new Color(238, 242, 247, 255);

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
