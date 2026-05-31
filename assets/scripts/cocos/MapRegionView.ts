import { _decorator, Color, Component, Label, Node, Sprite } from 'cc';
import type { RegionConfig, RegionRuntimeState, RegionState } from '../types/GameTypes';

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

@ccclass('MapRegionView')
export class MapRegionView extends Component {
  @property
  public regionId = '';

  @property(Label)
  public nameLabel: Label | null = null;

  @property(Label)
  public statusLabel: Label | null = null;

  @property(Sprite)
  public statusSprite: Sprite | null = null;

  @property(Node)
  public selectedFrame: Node | null = null;

  private onSelected?: (regionId: string) => void;

  public initialize(onSelected: (regionId: string) => void): void {
    this.onSelected = onSelected;
    this.node.on(Node.EventType.TOUCH_END, this.handleTouchEnd, this);
  }

  protected onDestroy(): void {
    this.node.off(Node.EventType.TOUCH_END, this.handleTouchEnd, this);
  }

  public bind(region: RegionConfig, runtime: RegionRuntimeState, selected: boolean): void {
    this.regionId = region.id;

    if (this.nameLabel) {
      this.nameLabel.string = region.displayName;
    }

    if (this.statusLabel) {
      this.statusLabel.string = STATE_LABELS[runtime.state];
    }

    if (this.statusSprite) {
      this.statusSprite.color = STATE_COLORS[runtime.state];
    }

    if (this.selectedFrame) {
      this.selectedFrame.active = selected;
    }
  }

  private handleTouchEnd(): void {
    if (!this.regionId) {
      return;
    }

    this.onSelected?.(this.regionId);
  }
}
