import {
  _decorator,
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
import { loadGame, saveGame } from '../save/SaveSystem';
import { advanceDay } from '../systems/GameLoopSystem';
import { applyEventChoice } from '../systems/EventSystem';
import {
  controlRegion,
  recalculateGlobalRisk,
  recalculateRestoreProgress,
  restoreRegion,
} from '../systems/RegionSystem';
import { buyUpgrade } from '../systems/UpgradeSystem';
import type {
  EventChoiceConfig,
  EventConfigFile,
  GameState,
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
  private selectedNameLabel!: Label;
  private selectedDetailLabel!: Label;
  private upgradeLabels: Label[] = [];
  private eventPanel!: Node;
  private eventTitleLabel!: Label;
  private eventChoiceLabels: Label[] = [];
  private pendingEventChoices: EventChoiceConfig[] = [];

  protected start(): void {
    this.loadConfigs();
    this.state = loadGame(localStorageAdapter) ?? createInitialGameState({
      regions: this.regionConfig,
      upgrades: this.upgradeConfig,
      events: this.eventConfig,
    });
    this.selectedRegionId = this.regionConfig.regions[0]?.id ?? '';

    this.buildUi();
    this.afterStateChange(false);
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
    root.removeAllChildren();

    const topBar = this.createPanel('TopBar', root, 1040, 120, new Vec3(0, 850, 0), new Color(31, 43, 59, 235));
    this.dayLabel = this.createLabel('DayLabel', topBar, '', 28, new Vec3(-390, 22, 0));
    this.resourceLabel = this.createLabel('ResourceLabel', topBar, '', 28, new Vec3(-130, 22, 0));
    this.riskLabel = this.createLabel('RiskLabel', topBar, '', 28, new Vec3(130, 22, 0));
    this.progressLabel = this.createLabel('ProgressLabel', topBar, '', 28, new Vec3(380, 22, 0));

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
      520,
      new Vec3(0, -620, 0),
      new Color(24, 32, 44, 245),
    );
    this.selectedNameLabel = this.createLabel('SelectedNameLabel', bottomPanel, '', 34, new Vec3(-420, 190, 0));
    this.selectedDetailLabel = this.createLabel('SelectedDetailLabel', bottomPanel, '', 24, new Vec3(-65, 140, 0));
    this.selectedDetailLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
    this.selectedDetailLabel.overflow = Label.Overflow.RESIZE_HEIGHT;
    this.selectedDetailLabel.getComponent(UITransform)?.setContentSize(860, 90);

    this.createButton('RestoreButton', bottomPanel, '修复', new Vec3(-320, 40, 0), () => this.handleRestore());
    this.createButton('ControlButton', bottomPanel, '隔离', new Vec3(0, 40, 0), () => this.handleControl());
    this.createButton('AdvanceDayButton', bottomPanel, '推进', new Vec3(320, 40, 0), () => this.handleAdvanceDay());

    this.upgradeLabels = this.upgradeConfig.upgrades.map((upgrade, index) => {
      const x = -320 + index * 320;
      const button = this.createButton(
        `UpgradeButton${index + 1}`,
        bottomPanel,
        '',
        new Vec3(x, -105, 0),
        () => this.handleBuyUpgrade(upgrade.id),
      );
      const label = button.getChildByName('Label')?.getComponent(Label);
      if (!label) {
        throw new Error('Upgrade button label missing.');
      }
      label.fontSize = 21;
      return label;
    });

    this.buildEventPanel(root);
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
      this.refreshViews();
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

  private handleRestore(): void {
    restoreRegion(this.state, this.regionConfig, this.upgradeConfig, this.selectedRegionId);
    this.afterStateChange();
  }

  private handleControl(): void {
    controlRegion(this.state, this.regionConfig, this.selectedRegionId);
    this.afterStateChange();
  }

  private handleAdvanceDay(): void {
    const result = advanceDay(this.state, this.regionConfig, this.upgradeConfig, this.eventConfig);
    this.afterStateChange();

    if (!result.eventId) {
      return;
    }

    const eventConfig = this.eventConfig.events.find((event) => event.id === result.eventId);
    if (!eventConfig) {
      return;
    }

    this.pendingEventChoices = eventConfig.choices;
    this.eventPanel.active = true;
    this.eventTitleLabel.string = eventConfig.displayName;
    this.eventChoiceLabels.forEach((label, index) => {
      const choice = eventConfig.choices[index];
      label.node.parent!.active = Boolean(choice);
      label.string = choice ? (choice.cost ? `${choice.label} -${choice.cost}` : choice.label) : '';
    });
  }

  private handleBuyUpgrade(upgradeId: string): void {
    buyUpgrade(this.state, this.upgradeConfig, upgradeId);
    this.afterStateChange();
  }

  private handleEventChoice(index: number): void {
    const choice = this.pendingEventChoices[index];

    if (!choice) {
      return;
    }

    applyEventChoice(this.state, choice);
    this.pendingEventChoices = [];
    this.eventPanel.active = false;
    this.afterStateChange();
  }

  private afterStateChange(shouldSave = true): void {
    recalculateGlobalRisk(this.state, this.regionConfig);
    recalculateRestoreProgress(this.state, this.regionConfig);

    if (shouldSave) {
      saveGame(localStorageAdapter, this.state);
    }

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
      `修复 ${Math.round(selectedRuntime.restoreProgress * 100)}% | 产出 ${selectedRegion.resourceYield}`;
  }

  private refreshUpgradeLabels(): void {
    this.upgradeLabels.forEach((label, index) => {
      const upgrade = this.upgradeConfig.upgrades[index];
      if (!upgrade) {
        label.string = '';
        return;
      }

      const level = this.state.upgradeLevels[upgrade.id] ?? 0;
      label.string = `${upgrade.displayName}\nLv.${level}/${upgrade.maxLevel}`;
    });
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
  ): Node {
    const buttonNode = this.createPanel(name, parent, width, height, position, new Color(59, 130, 180, 255));
    buttonNode.addComponent(Button);
    buttonNode.on(Button.EventType.CLICK, onClick);
    this.createLabel('Label', buttonNode, text, 26, new Vec3(0, 0, 0));

    const widget = buttonNode.addComponent(Widget);
    widget.alignMode = Widget.AlignMode.ONCE;

    return buttonNode;
  }
}

const localStorageAdapter = {
  getItem: (key: string): string | null => sys.localStorage.getItem(key),
  setItem: (key: string, value: string): void => sys.localStorage.setItem(key, value),
  removeItem: (key: string): void => sys.localStorage.removeItem(key),
};
