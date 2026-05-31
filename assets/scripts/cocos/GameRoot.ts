import { _decorator, Component, JsonAsset, sys } from 'cc';
import type {
  EventChoiceConfig,
  EventConfigFile,
  GameState,
  RegionConfigFile,
  UpgradeConfigFile,
} from '../types/GameTypes';
import { createInitialGameState } from '../state/createInitialGameState';
import { advanceDay } from '../systems/GameLoopSystem';
import { applyEventChoice } from '../systems/EventSystem';
import {
  controlRegion,
  recalculateGlobalRisk,
  recalculateRestoreProgress,
  restoreRegion,
} from '../systems/RegionSystem';
import { buyUpgrade } from '../systems/UpgradeSystem';
import { loadGame, saveGame, type SaveStorage } from '../save/SaveSystem';
import { EventPanelView } from './EventPanelView';
import { HudView } from './HudView';
import { MapRegionView } from './MapRegionView';

const { ccclass, property } = _decorator;

@ccclass('GameRoot')
export class GameRoot extends Component {
  @property(JsonAsset)
  public regionConfigAsset: JsonAsset | null = null;

  @property(JsonAsset)
  public upgradeConfigAsset: JsonAsset | null = null;

  @property(JsonAsset)
  public eventConfigAsset: JsonAsset | null = null;

  @property(HudView)
  public hudView: HudView | null = null;

  @property(EventPanelView)
  public eventPanelView: EventPanelView | null = null;

  @property([MapRegionView])
  public regionViews: MapRegionView[] = [];

  private regionConfig!: RegionConfigFile;
  private upgradeConfig!: UpgradeConfigFile;
  private eventConfig!: EventConfigFile;
  private state!: GameState;
  private selectedRegionId = '';

  protected start(): void {
    this.loadConfigs();
    this.state = loadGame(createCocosStorage()) ?? createInitialGameState({
      regions: this.regionConfig,
      upgrades: this.upgradeConfig,
      events: this.eventConfig,
    });
    this.selectedRegionId = this.regionConfig.regions[0]?.id ?? '';

    this.assignRegionIdsByOrder();
    this.regionViews.forEach((regionView) => regionView.initialize((regionId) => {
      this.selectedRegionId = regionId;
      this.refreshViews();
    }));

    this.hudView?.initialize({
      onRestore: () => this.handleRestoreRegion(),
      onControl: () => this.handleControlRegion(),
      onAdvanceDay: () => this.handleAdvanceDay(),
      onBuyUpgrade: (upgradeId) => this.handleBuyUpgrade(upgradeId),
    });

    this.recalculateGlobalState();
    this.refreshViews();
  }

  private loadConfigs(): void {
    if (!this.regionConfigAsset || !this.upgradeConfigAsset || !this.eventConfigAsset) {
      throw new Error('GameRoot config assets are not assigned.');
    }

    this.regionConfig = this.regionConfigAsset.json as RegionConfigFile;
    this.upgradeConfig = this.upgradeConfigAsset.json as UpgradeConfigFile;
    this.eventConfig = this.eventConfigAsset.json as EventConfigFile;
  }

  private assignRegionIdsByOrder(): void {
    this.regionViews.forEach((regionView, index) => {
      if (!regionView.regionId) {
        regionView.regionId = this.regionConfig.regions[index]?.id ?? '';
      }
    });
  }

  private handleRestoreRegion(): void {
    if (!this.selectedRegionId) {
      return;
    }

    restoreRegion(this.state, this.regionConfig, this.upgradeConfig, this.selectedRegionId);
    this.afterStateChange();
  }

  private handleControlRegion(): void {
    if (!this.selectedRegionId) {
      return;
    }

    controlRegion(this.state, this.regionConfig, this.selectedRegionId);
    this.afterStateChange();
  }

  private handleAdvanceDay(): void {
    const result = advanceDay(this.state, this.regionConfig, this.upgradeConfig, this.eventConfig);

    if (result.eventId) {
      const eventConfig = this.eventConfig.events.find((event) => event.id === result.eventId);
      if (eventConfig) {
        this.eventPanelView?.show(eventConfig, (choice) => this.handleEventChoice(choice));
      }
    }

    this.afterStateChange();
  }

  private handleBuyUpgrade(upgradeId: string): void {
    buyUpgrade(this.state, this.upgradeConfig, upgradeId);
    this.afterStateChange();
  }

  private handleEventChoice(choice: EventChoiceConfig): void {
    applyEventChoice(this.state, choice);
    this.afterStateChange();
  }

  private afterStateChange(): void {
    this.recalculateGlobalState();
    saveGame(createCocosStorage(), this.state);
    this.refreshViews();
  }

  private recalculateGlobalState(): void {
    recalculateGlobalRisk(this.state, this.regionConfig);
    recalculateRestoreProgress(this.state, this.regionConfig);
  }

  private refreshViews(): void {
    for (const regionView of this.regionViews) {
      const region = this.regionConfig.regions.find((item) => item.id === regionView.regionId);

      if (!region) {
        continue;
      }

      const runtime = this.state.regionStates[region.id];

      if (runtime) {
        regionView.bind(region, runtime, region.id === this.selectedRegionId);
      }
    }

    const selectedRegion = this.regionConfig.regions.find((item) => item.id === this.selectedRegionId);
    const selectedRuntime = selectedRegion ? this.state.regionStates[selectedRegion.id] : undefined;

    this.hudView?.bind(
      this.state,
      selectedRegion,
      selectedRuntime,
      this.upgradeConfig.upgrades,
    );
  }
}

function createCocosStorage(): SaveStorage {
  return {
    getItem: (key) => sys.localStorage.getItem(key),
    setItem: (key, value) => sys.localStorage.setItem(key, value),
    removeItem: (key) => sys.localStorage.removeItem(key),
  };
}
