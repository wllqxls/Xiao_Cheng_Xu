import { _decorator, Button, Component, Label, Node } from 'cc';
import type { GameState, RegionConfig, RegionRuntimeState, UpgradeConfig } from '../types/GameTypes';

const { ccclass, property } = _decorator;

const STATE_LABELS: Record<string, string> = {
  unaffected: '稳定',
  latent: '潜伏',
  spreading: '扩散中',
  severe: '严重',
  controlled: '受控',
  clearing: '清除中',
};

@ccclass('HudView')
export class HudView extends Component {
  @property(Label)
  public dayLabel: Label | null = null;

  @property(Label)
  public resourceLabel: Label | null = null;

  @property(Label)
  public riskLabel: Label | null = null;

  @property(Label)
  public progressLabel: Label | null = null;

  @property(Label)
  public selectedNameLabel: Label | null = null;

  @property(Label)
  public selectedDetailLabel: Label | null = null;

  @property(Button)
  public restoreButton: Button | null = null;

  @property(Button)
  public controlButton: Button | null = null;

  @property(Button)
  public advanceDayButton: Button | null = null;

  @property([Button])
  public upgradeButtons: Button[] = [];

  @property([Label])
  public upgradeLabels: Label[] = [];

  private restoreCallback?: () => void;
  private controlCallback?: () => void;
  private advanceDayCallback?: () => void;
  private buyUpgradeCallback?: (upgradeId: string) => void;
  private upgradeIds: string[] = [];

  public initialize(callbacks: {
    onRestore: () => void;
    onControl: () => void;
    onAdvanceDay: () => void;
    onBuyUpgrade: (upgradeId: string) => void;
  }): void {
    this.restoreCallback = callbacks.onRestore;
    this.controlCallback = callbacks.onControl;
    this.advanceDayCallback = callbacks.onAdvanceDay;
    this.buyUpgradeCallback = callbacks.onBuyUpgrade;

    this.restoreButton?.node.on(Button.EventType.CLICK, this.handleRestore, this);
    this.controlButton?.node.on(Button.EventType.CLICK, this.handleControl, this);
    this.advanceDayButton?.node.on(Button.EventType.CLICK, this.handleAdvanceDay, this);

    this.upgradeButtons.forEach((button, index) => {
      button.node.on(Button.EventType.CLICK, () => this.handleBuyUpgrade(index), this);
    });
  }

  protected onDestroy(): void {
    this.restoreButton?.node.off(Button.EventType.CLICK, this.handleRestore, this);
    this.controlButton?.node.off(Button.EventType.CLICK, this.handleControl, this);
    this.advanceDayButton?.node.off(Button.EventType.CLICK, this.handleAdvanceDay, this);
    this.upgradeButtons.forEach((button) => button.node.off(Button.EventType.CLICK));
  }

  public bind(
    state: GameState,
    selectedRegion: RegionConfig | undefined,
    selectedRuntime: RegionRuntimeState | undefined,
    upgrades: UpgradeConfig[],
  ): void {
    if (this.dayLabel) {
      this.dayLabel.string = `第 ${state.day} 天`;
    }

    if (this.resourceLabel) {
      this.resourceLabel.string = `明烬 ${state.resources}`;
    }

    if (this.riskLabel) {
      this.riskLabel.string = `风险 ${Math.round(state.globalRisk * 100)}%`;
    }

    if (this.progressLabel) {
      this.progressLabel.string = `恢复 ${Math.round(state.globalRestoreProgress * 100)}%`;
    }

    this.bindSelectedRegion(selectedRegion, selectedRuntime);
    this.bindUpgrades(state, upgrades);
  }

  private bindSelectedRegion(
    selectedRegion: RegionConfig | undefined,
    selectedRuntime: RegionRuntimeState | undefined,
  ): void {
    if (this.selectedNameLabel) {
      this.selectedNameLabel.string = selectedRegion?.displayName ?? '未选择区域';
    }

    if (this.selectedDetailLabel) {
      if (!selectedRegion || !selectedRuntime) {
        this.selectedDetailLabel.string = '点击地图区域查看详情';
      } else {
        const progress = Math.round(selectedRuntime.restoreProgress * 100);
        this.selectedDetailLabel.string =
          `${STATE_LABELS[selectedRuntime.state]}  人口 ${selectedRegion.population}` +
          `  修复 ${progress}%  产出 ${selectedRegion.resourceYield}`;
      }
    }
  }

  private bindUpgrades(state: GameState, upgrades: UpgradeConfig[]): void {
    this.upgradeIds = upgrades.map((upgrade) => upgrade.id);

    this.upgradeLabels.forEach((label, index) => {
      const upgrade = upgrades[index];

      if (!upgrade) {
        label.string = '';
        return;
      }

      const level = state.upgradeLevels[upgrade.id] ?? 0;
      label.string = `${upgrade.displayName} Lv.${level}/${upgrade.maxLevel}`;
    });
  }

  private handleRestore(): void {
    this.restoreCallback?.();
  }

  private handleControl(): void {
    this.controlCallback?.();
  }

  private handleAdvanceDay(): void {
    this.advanceDayCallback?.();
  }

  private handleBuyUpgrade(index: number): void {
    const upgradeId = this.upgradeIds[index];

    if (upgradeId) {
      this.buyUpgradeCallback?.(upgradeId);
    }
  }
}
