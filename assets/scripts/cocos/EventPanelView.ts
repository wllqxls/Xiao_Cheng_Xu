import { _decorator, Button, Component, Label, Node } from 'cc';
import type { EventChoiceConfig, EventConfig } from '../types/GameTypes';

const { ccclass, property } = _decorator;

@ccclass('EventPanelView')
export class EventPanelView extends Component {
  @property(Node)
  public panelRoot: Node | null = null;

  @property(Label)
  public titleLabel: Label | null = null;

  @property([Button])
  public choiceButtons: Button[] = [];

  @property([Label])
  public choiceLabels: Label[] = [];

  private eventConfig?: EventConfig;
  private onChoice?: (choice: EventChoiceConfig) => void;

  protected start(): void {
    this.hide();

    this.choiceButtons.forEach((button, index) => {
      button.node.on(Button.EventType.CLICK, () => this.handleChoice(index), this);
    });
  }

  protected onDestroy(): void {
    this.choiceButtons.forEach((button) => button.node.off(Button.EventType.CLICK));
  }

  public show(eventConfig: EventConfig, onChoice: (choice: EventChoiceConfig) => void): void {
    this.eventConfig = eventConfig;
    this.onChoice = onChoice;

    if (this.panelRoot) {
      this.panelRoot.active = true;
    }

    if (this.titleLabel) {
      this.titleLabel.string = eventConfig.displayName;
    }

    this.choiceButtons.forEach((button, index) => {
      const choice = eventConfig.choices[index];
      button.node.active = Boolean(choice);

      const label = this.choiceLabels[index];
      if (choice && label) {
        label.string = choice.cost ? `${choice.label} -${choice.cost}` : choice.label;
      }
    });
  }

  public hide(): void {
    if (this.panelRoot) {
      this.panelRoot.active = false;
    }
  }

  private handleChoice(index: number): void {
    const choice = this.eventConfig?.choices[index];

    if (!choice) {
      return;
    }

    this.onChoice?.(choice);
    this.hide();
  }
}
